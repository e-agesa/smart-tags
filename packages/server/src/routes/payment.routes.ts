import { Router, Request, Response } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate.middleware";
import { requireAuth } from "../middleware/auth.middleware";
import { isValidKenyanPhone } from "../utils/phone";
import { normalizeKenyanPhone } from "../utils/phone";
import * as mpesaService from "../services/mpesa.service";

const router = Router();

const TAG_PRICE_KES = 500;

const initiateSchema = z.object({
  tag_id: z.string().uuid(),
  phone: z.string().refine(isValidKenyanPhone, "Invalid Kenyan phone number"),
});

router.use(requireAuth);

// POST /api/payments/initiate — trigger M-Pesa STK Push
router.post(
  "/initiate",
  validate(initiateSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const payment = await mpesaService.createPayment(
        req.user!.userId,
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
