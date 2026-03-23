import { Router, Request, Response } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate.middleware";
import {
  scanPageLimiter,
  scanCallLimiter,
  scanSmsLimiter,
} from "../middleware/rate-limit.middleware";
import * as tagService from "../services/tag.service";
import * as scanService from "../services/scan.service";
import { sendSms, makeCall } from "../integrations/africastalking";
import { normalizeKenyanPhone, isValidKenyanPhone } from "../utils/phone";
import { env } from "../config/env";
import { sendScanNotificationEmail } from "../services/email.service";

const router = Router();

const callSchema = z.object({
  scanner_phone: z
    .string()
    .refine(isValidKenyanPhone, "Invalid Kenyan phone number"),
});

const smsSchema = z.object({
  scanner_phone: z
    .string()
    .refine(isValidKenyanPhone, "Invalid Kenyan phone number")
    .optional(),
  message: z.string().max(160).default("Your car is blocking someone. Please move it."),
});

// GET /s/:tagCode — Scan landing page (server-rendered)
router.get(
  "/:tagCode",
  scanPageLimiter,
  async (req: Request, res: Response): Promise<void> => {
    const tagCode = req.params.tagCode as string;
    const tag = await tagService.getTagByCode(tagCode);

    if (!tag) {
      res.render("scan-error", { message: "Tag not found.", tagCode });
      return;
    }

    if (tag.is_paused) {
      res.render("scan-error", {
        message: "This tag has been temporarily paused by the owner.",
        tagCode,
      });
      return;
    }

    // Pending tag → show payment/activation page to the owner
    if (tag.status === "pending") {
      res.render("scan-activate", {
        tagCode: tag.tag_code,
        tagId: tag.id,
        vehicleMake: tag.vehicle_make,
        vehicleColor: tag.vehicle_color,
        itemType: tag.item_type || "car",
        ownerPhone: tag.owner_phone,
        baseUrl: env.BASE_URL,
      });
      return;
    }

    if (tag.status !== "active") {
      res.render("scan-error", {
        message: "This tag is not currently active.",
        tagCode,
      });
      return;
    }

    // Log scan session
    const session = await scanService.createScanSession(
      tag.id,
      req.ip || null,
      null,
      "qr",
      undefined,
      req.headers["user-agent"] || null
    );

    // Notify owner that their tag was scanned (email in dev, SMS in prod)
    const ownerUser = await import("../services/auth.service").then(m => m.getUserById(tag.owner_phone ? tag.id : ""));
    // Always try email notification
    sendScanNotificationEmail(tag, session).catch((err) =>
      console.error("Failed to send scan email:", err)
    );

    if (env.NODE_ENV === "production") {
      sendSms(
        tag.owner_phone,
        `Someone scanned your Car Park Tag (${tag.vehicle_color || ""} ${tag.vehicle_make || "car"}). They may try to contact you.`
      ).catch((err) => console.error("Failed to notify owner:", err));
    } else {
      console.log(`[DEV] Tag ${tag.tag_code} scanned. Owner: ${tag.owner_phone}`);
    }

    res.render("scan-landing", {
      tagCode: tag.tag_code,
      vehicleMake: tag.vehicle_make,
      vehicleColor: tag.vehicle_color,
      itemType: tag.item_type || "car",
      customMessage: tag.custom_message || "",
      hasEmergencyContact: !!tag.emergency_phone,
      whatsappPhone: env.WHATSAPP_BUSINESS_PHONE,
      baseUrl: env.BASE_URL,
    });
  }
);

// POST /api/scan/:tagCode/call — Initiate masked call
router.post(
  "/:tagCode/call",
  scanCallLimiter,
  validate(callSchema),
  async (req: Request, res: Response): Promise<void> => {
    const tag = await tagService.getTagByCode(req.params.tagCode as string);
    if (!tag || tag.status !== "active") {
      res.status(404).json({ error: "Tag not found or inactive" });
      return;
    }

    const scannerPhone = normalizeKenyanPhone(req.body.scanner_phone);

    // Create scan session
    const session = await scanService.createScanSession(
      tag.id,
      req.ip || null,
      scannerPhone,
      "qr"
    );

    try {
      // Initiate call via Africa's Talking
      const callbackUrl = `${env.BASE_URL}/webhooks/at/voice?tagCode=${tag.tag_code}`;
      const { sessionId } = await makeCall(scannerPhone, callbackUrl);

      // Log communication
      await scanService.logCommunication(
        session.id,
        "call",
        "owner",
        sessionId
      );

      res.json({
        message: "Call initiated. Your phone will ring shortly.",
        sessionId,
      });
    } catch (err) {
      console.error("Failed to initiate call:", err);
      res.status(500).json({ error: "Failed to initiate call. Please try SMS instead." });
    }
  }
);

// POST /api/scan/:tagCode/sms — Send masked SMS
router.post(
  "/:tagCode/sms",
  scanSmsLimiter,
  validate(smsSchema),
  async (req: Request, res: Response): Promise<void> => {
    const tag = await tagService.getTagByCode(req.params.tagCode as string);
    if (!tag || tag.status !== "active") {
      res.status(404).json({ error: "Tag not found or inactive" });
      return;
    }

    const session = await scanService.createScanSession(
      tag.id,
      req.ip || null,
      req.body.scanner_phone
        ? normalizeKenyanPhone(req.body.scanner_phone)
        : null,
      "qr"
    );

    try {
      const smsMessage = `[Car Park Tag] Message about your ${tag.vehicle_color || ""} ${tag.vehicle_make || "car"}: ${req.body.message}`;
      const { messageId } = await sendSms(tag.owner_phone, smsMessage);

      await scanService.logCommunication(
        session.id,
        "sms",
        "owner",
        messageId
      );

      res.json({ message: "SMS sent to the car owner." });
    } catch (err) {
      console.error("Failed to send SMS:", err);
      res.status(500).json({ error: "Failed to send SMS. Please try again." });
    }
  }
);

// POST /api/scan/:tagCode/emergency — Contact emergency person
router.post(
  "/:tagCode/emergency",
  scanSmsLimiter,
  async (req: Request, res: Response): Promise<void> => {
    const tag = await tagService.getTagByCode(req.params.tagCode as string);
    if (!tag || tag.status !== "active") {
      res.status(404).json({ error: "Tag not found or inactive" });
      return;
    }

    if (!tag.emergency_phone) {
      res
        .status(404)
        .json({ error: "No emergency contact registered for this vehicle" });
      return;
    }

    const session = await scanService.createScanSession(
      tag.id,
      req.ip || null,
      null,
      "qr"
    );

    try {
      const message = `[URGENT - Car Park Tag] Someone is trying to reach ${tag.owner_name} about their vehicle. Tag: ${tag.tag_code}. Please check on them.`;
      const { messageId } = await sendSms(tag.emergency_phone, message);

      await scanService.logCommunication(
        session.id,
        "sms",
        "emergency",
        messageId
      );

      res.json({ message: "Emergency contact has been notified." });
    } catch (err) {
      console.error("Failed to contact emergency:", err);
      res.status(500).json({ error: "Failed to reach emergency contact." });
    }
  }
);

// POST /s/:tagCode/location — Receive GPS location from finder's browser
const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  scan_session_id: z.string().uuid().optional(),
});

router.post(
  "/:tagCode/location",
  validate(locationSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { latitude, longitude } = req.body;
    const tagCode = req.params.tagCode as string;

    const tag = await tagService.getTagByCode(tagCode);
    if (!tag) {
      res.status(404).json({ error: "Tag not found" });
      return;
    }

    // Update the most recent scan session for this tag with the location
    await import("../config/database").then(({ query }) =>
      query(
        `UPDATE scan_sessions SET latitude = $1, longitude = $2
         WHERE tag_id = $3 AND created_at > NOW() - INTERVAL '5 minutes'
         AND latitude IS NULL
         ORDER BY created_at DESC LIMIT 1`,
        [latitude, longitude, tag.id]
      )
    );

    res.json({ message: "Location received" });
  }
);

export { router as scanRoutes };
