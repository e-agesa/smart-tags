import { Router, Request, Response } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate.middleware";
import { requireAuth } from "../middleware/auth.middleware";
import * as subService from "../services/subscription.service";
import * as stickerService from "../services/sticker.service";
import { isValidKenyanPhone } from "../utils/phone";

const router = Router();

// GET /api/plans — list all active plans (public, supports ?currency=USD)
router.get("/plans", async (req: Request, res: Response): Promise<void> => {
  const plans = await subService.getActivePlans();
  const currency = ((req.query.currency as string) || "KES").toUpperCase();

  // Convert prices based on currency
  const rates: Record<string, number> = {
    KES: 1, USD: 0.0077, GBP: 0.0061, EUR: 0.0071, NGN: 11.5, UGX: 28.5, TZS: 19.5,
  };
  const rate = rates[currency] || 1;
  const minPrice = currency === "KES" ? 0 : 0.099;

  const converted = plans.map((p) => ({
    ...p,
    display_price: p.price_kes === 0 ? 0 : Math.max(minPrice, parseFloat((p.price_kes * rate).toFixed(2))),
    display_currency: currency,
  }));
  res.json(converted);
});

// GET /api/offers — active offers (public)
router.get("/offers", async (_req: Request, res: Response): Promise<void> => {
  const { getActiveOffers } = await import("../services/promo.service");
  res.json(await getActiveOffers());
});

// POST /api/promo/validate — validate a promo code (public)
router.post("/promo/validate", async (req: Request, res: Response): Promise<void> => {
  const { validatePromoCode } = await import("../services/promo.service");
  const { code, order_type, amount } = req.body;
  if (!code) { res.status(400).json({ error: "code is required" }); return; }
  const result = await validatePromoCode(code, order_type || "all", amount || 0);
  res.json(result);
});

// GET /api/stickers/designs — list sticker designs (public)
router.get("/stickers/designs", (_req: Request, res: Response): void => {
  res.json(stickerService.getStickerDesigns());
});

// Routes below require auth
router.use(requireAuth);

// GET /api/subscription — current user subscription
router.get(
  "/subscription",
  async (req: Request, res: Response): Promise<void> => {
    const sub = await subService.getUserSubscription(req.user!.userId);
    res.json(sub || { plan_slug: "free", plan_name: "Free", max_tags: 1, features: ["1 QR tag", "Basic scan notifications"] });
  }
);

// POST /api/subscription — subscribe to a plan
const subscribeSchema = z.object({
  plan_slug: z.string(),
  payment_ref: z.string().optional(),
});

router.post(
  "/subscription",
  validate(subscribeSchema),
  async (req: Request, res: Response): Promise<void> => {
    const plan = await subService.getPlanBySlug(req.body.plan_slug);
    if (!plan) {
      res.status(404).json({ error: "Plan not found" });
      return;
    }

    const sub = await subService.createSubscription(
      req.user!.userId,
      plan.id,
      req.body.payment_ref
    );
    res.status(201).json(sub);
  }
);

// POST /api/stickers/order — place a sticker order
const orderSchema = z.object({
  qty: z.number().int().min(1).max(100),
  design: z.enum(["standard", "premium", "reflective"]),
  shipping_name: z.string().min(2),
  shipping_phone: z.string().refine(isValidKenyanPhone, "Invalid phone"),
  shipping_address: z.string().min(5),
  shipping_city: z.string().min(2),
});

router.post(
  "/stickers/order",
  validate(orderSchema),
  async (req: Request, res: Response): Promise<void> => {
    const order = await stickerService.createOrder(
      req.user!.userId,
      req.body.qty,
      req.body.design,
      {
        name: req.body.shipping_name,
        phone: req.body.shipping_phone,
        address: req.body.shipping_address,
        city: req.body.shipping_city,
      }
    );
    res.status(201).json(order);
  }
);

// GET /api/stickers/orders — my orders
router.get(
  "/stickers/orders",
  async (req: Request, res: Response): Promise<void> => {
    const orders = await stickerService.getUserOrders(req.user!.userId);
    res.json(orders);
  }
);

export { router as subscriptionRoutes };
