import { query, queryOne } from "../config/database";

export interface PaymentGateway {
  id: string;
  name: string;
  slug: string;
  is_enabled: boolean;
  config: Record<string, string>;
  supported_currencies: string[];
  created_at: Date;
  updated_at: Date;
}

export async function getAllGateways(): Promise<PaymentGateway[]> {
  return query<PaymentGateway>(
    `SELECT * FROM payment_gateways ORDER BY name ASC`
  );
}

export async function getEnabledGateways(): Promise<PaymentGateway[]> {
  return query<PaymentGateway>(
    `SELECT id, name, slug, is_enabled, supported_currencies, created_at
     FROM payment_gateways WHERE is_enabled = TRUE ORDER BY name ASC`
  );
}

export async function getGatewayBySlug(slug: string): Promise<PaymentGateway | null> {
  return queryOne<PaymentGateway>(
    `SELECT * FROM payment_gateways WHERE slug = $1`,
    [slug]
  );
}

export async function updateGatewayConfig(
  slug: string,
  config: Record<string, string>,
  isEnabled: boolean
): Promise<PaymentGateway | null> {
  return queryOne<PaymentGateway>(
    `UPDATE payment_gateways SET config = $1, is_enabled = $2, updated_at = NOW()
     WHERE slug = $3 RETURNING *`,
    [JSON.stringify(config), isEnabled, slug]
  );
}
