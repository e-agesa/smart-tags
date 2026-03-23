import { query, queryOne } from "../config/database";

export interface PromoCode {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percent" | "fixed";
  discount_value: number;
  max_uses: number | null;
  used_count: number;
  min_amount_kes: number;
  applies_to: string;
  valid_from: Date;
  valid_until: Date | null;
  is_active: boolean;
}

export interface Offer {
  id: string;
  title: string;
  description: string | null;
  banner_url: string | null;
  offer_type: string;
  discount_percent: number;
  applies_to: string;
  valid_from: Date;
  valid_until: Date | null;
  is_active: boolean;
}

// ---- Promo Codes ----

export async function validatePromoCode(code: string, orderType: string, amount: number): Promise<{
  valid: boolean;
  promo?: PromoCode;
  discount: number;
  error?: string;
}> {
  const promo = await queryOne<PromoCode>(
    `SELECT * FROM promo_codes WHERE code = $1 AND is_active = TRUE`,
    [code.toUpperCase().trim()]
  );

  if (!promo) return { valid: false, discount: 0, error: "Invalid promo code" };
  if (promo.valid_until && new Date(promo.valid_until) < new Date()) return { valid: false, discount: 0, error: "Promo code has expired" };
  if (promo.max_uses && promo.used_count >= promo.max_uses) return { valid: false, discount: 0, error: "Promo code usage limit reached" };
  if (promo.applies_to !== "all" && promo.applies_to !== orderType) return { valid: false, discount: 0, error: `This code applies to ${promo.applies_to} only` };
  if (amount < promo.min_amount_kes) return { valid: false, discount: 0, error: `Minimum order amount is KES ${promo.min_amount_kes}` };

  let discount = 0;
  if (promo.discount_type === "percent") {
    discount = Math.round(amount * (promo.discount_value / 100));
  } else {
    discount = Math.min(promo.discount_value, amount);
  }

  return { valid: true, promo, discount };
}

export async function usePromoCode(promoId: string, userId: string, orderType: string, orderId: string, discountKes: number): Promise<void> {
  await query(
    `INSERT INTO promo_usage (promo_id, user_id, order_type, order_id, discount_kes) VALUES ($1, $2, $3, $4, $5)`,
    [promoId, userId, orderType, orderId, discountKes]
  );
  await query(`UPDATE promo_codes SET used_count = used_count + 1 WHERE id = $1`, [promoId]);
}

export async function getAllPromoCodes(): Promise<PromoCode[]> {
  return query<PromoCode>(`SELECT * FROM promo_codes ORDER BY created_at DESC`);
}

export async function createPromoCode(data: {
  code: string; description?: string; discount_type: string;
  discount_value: number; max_uses?: number; applies_to?: string;
  valid_until?: string;
}): Promise<PromoCode> {
  const rows = await query<PromoCode>(
    `INSERT INTO promo_codes (code, description, discount_type, discount_value, max_uses, applies_to, valid_until)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [data.code.toUpperCase(), data.description || null, data.discount_type, data.discount_value,
     data.max_uses || null, data.applies_to || "all", data.valid_until || null]
  );
  return rows[0];
}

export async function togglePromoCode(id: string, isActive: boolean): Promise<void> {
  await query(`UPDATE promo_codes SET is_active = $1 WHERE id = $2`, [isActive, id]);
}

// ---- Offers ----

export async function getActiveOffers(): Promise<Offer[]> {
  return query<Offer>(
    `SELECT * FROM offers WHERE is_active = TRUE AND (valid_until IS NULL OR valid_until > NOW()) ORDER BY created_at DESC`
  );
}

export async function getAllOffers(): Promise<Offer[]> {
  return query<Offer>(`SELECT * FROM offers ORDER BY created_at DESC`);
}

export async function createOffer(data: {
  title: string; description?: string; offer_type?: string;
  discount_percent?: number; applies_to?: string; valid_until?: string;
}): Promise<Offer> {
  const rows = await query<Offer>(
    `INSERT INTO offers (title, description, offer_type, discount_percent, applies_to, valid_until)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [data.title, data.description || null, data.offer_type || "discount",
     data.discount_percent || 0, data.applies_to || "all", data.valid_until || null]
  );
  return rows[0];
}

export async function toggleOffer(id: string, isActive: boolean): Promise<void> {
  await query(`UPDATE offers SET is_active = $1 WHERE id = $2`, [isActive, id]);
}

// ---- Free Trial ----

export async function grantFreeTrial(userId: string): Promise<void> {
  const { queryOne: qo } = await import("../config/database");

  // Check if user already had a trial
  const existing = await qo(
    `SELECT id FROM user_subscriptions WHERE user_id = $1 AND payment_ref = 'FREE_TRIAL'`,
    [userId]
  );
  if (existing) return; // Already had trial

  // Get basic plan
  const plan = await qo<{ id: string }>(
    `SELECT id FROM subscription_plans WHERE slug = 'basic'`
  );
  if (!plan) return;

  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 1); // 1 month free

  await query(
    `INSERT INTO user_subscriptions (user_id, plan_id, status, expires_at, payment_ref)
     VALUES ($1, $2, 'active', $3, 'FREE_TRIAL')`,
    [userId, plan.id, expiresAt]
  );
}
