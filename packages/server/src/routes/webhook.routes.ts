import { Router, Request, Response } from "express";
import { parseCallback } from "../integrations/daraja";
import { generateDialXml, generateSayXml } from "../integrations/africastalking";
import * as mpesaService from "../services/mpesa.service";
import * as tagService from "../services/tag.service";
import * as scanService from "../services/scan.service";
import { normalizeKenyanPhone } from "../utils/phone";

const router = Router();

// POST /webhooks/mpesa/callback — M-Pesa payment result
router.post(
  "/mpesa/callback",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = parseCallback(req.body);
      console.log("M-Pesa callback:", JSON.stringify(result));

      await mpesaService.handlePaymentCallback(
        result.checkoutRequestId,
        result.resultCode,
        result.mpesaReceiptNumber
      );

      // M-Pesa expects a simple acknowledgment
      res.json({ ResultCode: 0, ResultDesc: "Accepted" });
    } catch (err) {
      console.error("M-Pesa callback error:", err);
      res.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }
  }
);

// POST /webhooks/at/voice — Africa's Talking voice callback
// When the scanner picks up, AT fires this webhook.
// We respond with XML to dial the car owner.
router.post(
  "/at/voice",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId, isActive, direction } = req.body;
      const tagCode = req.query.tagCode as string;

      if (!tagCode) {
        res.set("Content-Type", "application/xml");
        res.send(
          generateSayXml("Sorry, we could not connect your call. Please try again.")
        );
        return;
      }

      // Look up the tag to get the owner's phone
      const tag = await tagService.getTagByCode(tagCode);
      if (!tag) {
        res.set("Content-Type", "application/xml");
        res.send(generateSayXml("This tag is no longer active."));
        return;
      }

      if (isActive === "1" || isActive === 1) {
        // Call is active — dial the car owner
        res.set("Content-Type", "application/xml");
        res.send(generateDialXml(tag.owner_phone));
      } else {
        // Call ended — update communication log
        const { durationInSeconds, amount } = req.body;
        await scanService.updateCommunicationStatus(
          sessionId,
          "completed",
          parseInt(durationInSeconds) || 0,
          parseFloat(amount) || 0
        );
        res.set("Content-Type", "application/xml");
        res.send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
      }
    } catch (err) {
      console.error("AT voice webhook error:", err);
      res.set("Content-Type", "application/xml");
      res.send(
        generateSayXml("An error occurred. Please try again later.")
      );
    }
  }
);

// POST /webhooks/at/sms — Inbound SMS (SMS fallback flow)
// When someone texts their tag code to the AT shortcode
router.post(
  "/at/sms",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { from, text } = req.body;

      // Parse tag code from SMS body
      const tagCodeMatch = text?.trim().match(/CPK-[A-Z0-9]{6}/i);
      if (!tagCodeMatch) {
        // Unknown format — ignore or send help text
        res.json({ status: "ok" });
        return;
      }

      const tagCode = tagCodeMatch[0].toUpperCase();
      const tag = await tagService.getTagByCode(tagCode);

      if (!tag || tag.status !== "active") {
        res.json({ status: "ok" });
        return;
      }

      // Create scan session and log
      const senderPhone = normalizeKenyanPhone(from);
      const session = await scanService.createScanSession(
        tag.id,
        null,
        senderPhone,
        "sms"
      );
      await scanService.logCommunication(session.id, "sms", "owner");

      // Forward message to car owner via AT SMS
      const { sendSms } = await import("../integrations/africastalking");
      const forwardMessage = `[Car Park Tag] Someone texted about your ${tag.vehicle_color || ""} ${tag.vehicle_make || "car"}: "${text}"`;
      await sendSms(tag.owner_phone, forwardMessage);

      res.json({ status: "ok" });
    } catch (err) {
      console.error("AT SMS webhook error:", err);
      res.json({ status: "ok" });
    }
  }
);

// POST /webhooks/at/delivery — SMS delivery reports
router.post("/at/delivery", (_req: Request, res: Response): void => {
  // Log delivery reports if needed
  res.json({ status: "ok" });
});

// POST /webhooks/whatsapp — WhatsApp Business API inbound messages
router.post(
  "/whatsapp",
  async (req: Request, res: Response): Promise<void> => {
    // Placeholder for WhatsApp Business API integration
    // For MVP, we use click-to-chat URLs and handle messages manually
    console.log("WhatsApp webhook:", JSON.stringify(req.body));
    res.json({ status: "ok" });
  }
);

export { router as webhookRoutes };
