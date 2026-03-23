import { Router, Request, Response } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate.middleware";
import { requireAuth, optionalAuth } from "../middleware/auth.middleware";
import { isValidKenyanPhone } from "../utils/phone";
import { normalizeKenyanPhone } from "../utils/phone";
import * as mpesaService from "../services/mpesa.service";
import { queryOne } from "../config/database";
import { getGatewaysForCurrency, processPayment } from "../services/payment-gateway.service";

const router = Router();

const TAG_PRICE_KES = 500;

// GET /api/payments/methods?currency=KES — available payment methods
router.get(
  "/methods",
  async (req: Request, res: Response): Promise<void> => {
    const currency = (req.query.currency as string) || "KES";
    const gateways = await getGatewaysForCurrency(currency);
    res.json(gateways);
  }
);

const initiateSchema = z.object({
  tag_id: z.string().uuid(),
  phone: z.string().refine(isValidKenyanPhone, "Invalid Kenyan phone number"),
});

// POST /api/payments/initiate — trigger M-Pesa STK Push
// This route works WITHOUT auth so the owner can pay from the QR scan page
router.post(
  "/initiate",
  optionalAuth,
  validate(initiateSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Look up the tag owner from the tag_id
      const tagOwner = await queryOne<{ user_id: string }>(
        `SELECT v.user_id FROM tags t
         JOIN vehicles v ON v.id = t.vehicle_id
         WHERE t.id = $1`,
        [req.body.tag_id]
      );

      if (!tagOwner) {
        res.status(404).json({ error: "Tag not found" });
        return;
      }

      // If user is logged in, use their ID; otherwise use tag owner
      const userId = req.user?.userId || tagOwner.user_id;

      const payment = await mpesaService.createPayment(
        userId,
        req.body.tag_id,
        normalizeKenyanPhone(req.body.phone),
        TAG_PRICE_KES
      );
      res.status(201).json({
        message: "M-Pesa payment initiated. Check your phone for the STK push prompt.",
        paymentId: payment.id,
        checkoutRequestId: payment.checkoutRequestId,
      });
    } catch (err) {
      console.error("Payment initiation failed:", err);
      res.status(500).json({ error: "Failed to initiate payment. Please try again." });
    }
  }
);

// Routes below require auth
router.use(requireAuth);

// GET /api/payments — list my payments
router.get("/", async (req: Request, res: Response): Promise<void> => {
  const payments = await mpesaService.getUserPayments(req.user!.userId);
  res.json(payments);
});

// GET /api/payments/:id — payment status
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  const payment = await mpesaService.getPaymentById(req.params.id as string);
  if (!payment) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }
  res.json(payment);
});

export { router as paymentRoutes };
