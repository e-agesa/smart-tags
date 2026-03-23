import { query, queryOne } from "../config/database";

export interface Plan {
  id: string;
  name: string;
  slug: string;
  price_kes: number;
  price_usd: number;
  interval_months: number;
  max_tags: number;
  features: string[];
  is_active: boolean;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  started_at: Date;
  expires_at: Date;
  payment_ref: string | null;
  auto_renew: boolean;
}

export async function getActivePlans(): Promise<Plan[]> {
  return query<Plan>(
    `SELECT * FROM subscription_plans WHERE is_active = TRUE ORDER BY price_kes ASC`
  );
}

export async function getPlanBySlug(slug: string): Promise<Plan | null> {
  return queryOne<Plan>(
    `SELECT * FROM subscription_plans WHERE slug = $1 AND is_active = TRUE`,
    [slug]
  );
}

export async function getUserSubscription(userId: string): Promise<(Subscription & { plan_name: string; plan_slug: string; max_tags: number; features: string[] }) | null> {
  return queryOne(
    `SELECT s.*, p.name as plan_name, p.slug as plan_slug, p.max_tags, p.features
     FROM user_subscriptions s
     JOIN subscription_plans p ON p.id = s.plan_id
     WHERE s.user_id = $1 AND s.status = 'active' AND s.expires_at > NOW()
     ORDER BY s.created_at DESC LIMIT 1`,
    [userId]
  );
}

export async function createSubscription(
  userId: string,
  planId: string,
  paymentRef?: string
): Promise<Subscription> {
  const plan = await queryOne<Plan>(
    `SELECT * FROM subscription_plans WHERE id = $1`,
    [planId]
  );
  if (!plan) throw new Error("Plan not found");

  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + plan.interval_months);

  // Deactivate existing subscriptions
  await query(
    `UPDATE user_subscriptions SET status = 'replaced' WHERE user_id = $1 AND status = 'active'`,
    [userId]
  );

  const rows = await query<Subscription>(
    `INSERT INTO user_subscriptions (user_id, plan_id, expires_at, payment_ref)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [userId, planId, expiresAt, paymentRef || null]
  );
  return rows[0];
}
