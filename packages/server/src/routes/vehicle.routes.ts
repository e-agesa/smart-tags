import { Router, Request, Response } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate.middleware";
import { requireAuth } from "../middleware/auth.middleware";
import * as vehicleService from "../services/vehicle.service";

const router = Router();

const createVehicleSchema = z.object({
  license_plate: z
    .string()
    .min(1)
    .max(20),
  make: z.string().max(50).optional(),
  color: z.string().max(30).optional(),
  item_type: z.enum(["car", "bike", "luggage", "keys", "pet", "other"]).default("car"),
});

// All vehicle routes require auth
router.use(requireAuth);

// POST /api/vehicles
router.post(
  "/",
  validate(createVehicleSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const vehicle = await vehicleService.createVehicle(
        req.user!.userId,
        req.body.license_plate,
        req.body.make,
        req.body.color,
        req.body.item_type
      );
      res.status(201).json(vehicle);
    } catch (err: unknown) {
      const pgErr = err as { code?: string };
      if (pgErr.code === "23505") {
        res.status(409).json({ error: "Vehicle with this license plate already registered" });
        return;
      }
      throw err;
    }
  }
);

// GET /api/vehicles
router.get("/", async (req: Request, res: Response): Promise<void> => {
  const vehicles = await vehicleService.getUserVehicles(req.user!.userId);
  res.json(vehicles);
});

// DELETE /api/vehicles/:id
router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  const deleted = await vehicleService.deleteVehicle(
    req.params.id as string,
    req.user!.userId
  );
  if (!deleted) {
    res.status(404).json({ error: "Vehicle not found" });
    return;
  }
  res.json({ message: "Vehicle removed" });
});

export { router as vehicleRoutes };
