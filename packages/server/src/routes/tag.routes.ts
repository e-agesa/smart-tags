import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import * as tagService from "../services/tag.service";
import * as vehicleService from "../services/vehicle.service";
import { generateQrBuffer } from "../services/qr.service";

const router = Router();

router.use(requireAuth);

// POST /api/vehicles/:vehicleId/tag — mounted in app.ts under /api/tags but we handle vehicle context
// We'll use this as POST /api/tags with vehicleId in body
router.post(
  "/",
  async (req: Request, res: Response): Promise<void> => {
    const { vehicle_id } = req.body;
    if (!vehicle_id) {
      res.status(400).json({ error: "vehicle_id is required" });
      return;
    }

    // Verify ownership
    const vehicle = await vehicleService.getVehicleById(
      vehicle_id,
      req.user!.userId
    );
    if (!vehicle) {
      res.status(404).json({ error: "Vehicle not found" });
      return;
    }

    // Check if tag already exists
    const existing = await tagService.getTagByVehicleId(vehicle_id);
    if (existing) {
      res.status(409).json({
        error: "Tag already exists for this vehicle",
        tag: existing,
      });
      return;
    }

    const tag = await tagService.createTag(vehicle_id);
    res.status(201).json(tag);
  }
);

// GET /api/tags/:id/qr — download QR code as PNG
router.get(
  "/:id/qr",
  async (req: Request, res: Response): Promise<void> => {
    const tag = await tagService.getTagById(req.params.id as string);
    if (!tag) {
      res.status(404).json({ error: "Tag not found" });
      return;
    }

    const buffer = await generateQrBuffer(tag.tag_code);
    res.set({
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="carpark-tag-${tag.tag_code}.png"`,
    });
    res.send(buffer);
  }
);

// GET /api/tags/scans — Get scan history for the authenticated user's tags
router.get(
  "/scans",
  async (req: Request, res: Response): Promise<void> => {
    const { query: dbQuery } = await import("../config/database");
    const scans = await dbQuery(
      `SELECT s.id, s.source, s.latitude, s.longitude, s.created_at,
              t.tag_code, v.license_plate
       FROM scan_sessions s
       JOIN tags t ON t.id = s.tag_id
       JOIN vehicles v ON v.id = t.vehicle_id
       WHERE v.user_id = $1
       ORDER BY s.created_at DESC
       LIMIT 100`,
      [req.user!.userId]
    );
    res.json(scans);
  }
);

// PUT /api/tags/:id/pause — Toggle tag pause state
router.put(
  "/:id/pause",
  async (req: Request, res: Response): Promise<void> => {
    const tag = await tagService.getTagById(req.params.id as string);
    if (!tag) {
      res.status(404).json({ error: "Tag not found" });
      return;
    }

    // Verify ownership through vehicle
    const vehicle = await vehicleService.getVehicleById(tag.vehicle_id, req.user!.userId);
    if (!vehicle) {
      res.status(403).json({ error: "Not authorized" });
      return;
    }

    const updated = await tagService.toggleTagPause(tag.id, !tag.is_paused);
    res.json(updated);
  }
);

// PUT /api/tags/:id/message — Update custom message
router.put(
  "/:id/message",
  async (req: Request, res: Response): Promise<void> => {
    const { message } = req.body;
    if (message !== undefined && typeof message !== "string") {
      res.status(400).json({ error: "message must be a string" });
      return;
    }

    const tag = await tagService.getTagById(req.params.id as string);
    if (!tag) {
      res.status(404).json({ error: "Tag not found" });
      return;
    }

    const vehicle = await vehicleService.getVehicleById(tag.vehicle_id, req.user!.userId);
    if (!vehicle) {
      res.status(403).json({ error: "Not authorized" });
      return;
    }

    const updated = await tagService.updateCustomMessage(tag.id, message || null);
    res.json(updated);
  }
);

export { router as tagRoutes };
