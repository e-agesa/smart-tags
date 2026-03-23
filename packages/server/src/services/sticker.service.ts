import { query, queryOne } from "../config/database";

export interface StickerOrder {
  id: string;
  user_id: string;
  qty: number;
  design: string;
  unit_price_kes: number;
  total_kes: number;
  shipping_name: string | null;
  shipping_phone: string | null;
  shipping_address: string | null;
  shipping_city: string | null;
  status: string;
  tracking_no: string | null;
  mpesa_receipt: string | null;
  created_at: Date;
}

const STICKER_PRICES: Record<string, number> = {
  standard: 150,
  premium: 300,
  reflective: 500,
};

export function getStickerPrice(design: string): number {
  return STICKER_PRICES[design] || STICKER_PRICES.standard;
}

export function getStickerDesigns() {
  return [
    { slug: "standard", name: "Standard QR Sticker", price_kes: 150, description: "Durable vinyl, weather-resistant" },
    { slug: "premium", name: "Premium Metal Tag", price_kes: 300, description: "Brushed aluminum, laser-engraved QR" },
    { slug: "reflective", name: "Reflective Sticker", price_kes: 500, description: "High-visibility reflective vinyl, night-visible" },
  ];
}

export async function createOrder(
  userId: string,
  qty: number,
  design: string,
  shipping: { name: string; phone: string; address: string; city: string }
): Promise<StickerOrder> {
  const unitPrice = getStickerPrice(design);
  const total = unitPrice * qty;

  const rows = await query<StickerOrder>(
    `INSERT INTO sticker_orders (user_id, qty, design, unit_price_kes, total_kes, shipping_name, shipping_phone, shipping_address, shipping_city)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [userId, qty, design, unitPrice, total, shipping.name, shipping.phone, shipping.address, shipping.city]
  );
  return rows[0];
}

export async function getUserOrders(userId: string): Promise<StickerOrder[]> {
  return query<StickerOrder>(
    `SELECT * FROM sticker_orders WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
}

export async function getAllOrders(): Promise<StickerOrder[]> {
  return query<StickerOrder>(
    `SELECT o.*, u.full_name, u.phone
     FROM sticker_orders o
     JOIN users u ON u.id = o.user_id
     ORDER BY o.created_at DESC LIMIT 100`
  );
}

export async function updateOrderStatus(
  orderId: string,
  status: string,
  trackingNo?: string
): Promise<StickerOrder | null> {
  return queryOne<StickerOrder>(
    `UPDATE sticker_orders SET status = $1, tracking_no = COALESCE($2, tracking_no)
     WHERE id = $3 RETURNING *`,
    [status, trackingNo || null, orderId]
  );
}
