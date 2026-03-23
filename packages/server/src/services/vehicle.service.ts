import { query, queryOne } from "../config/database";
import { Vehicle } from "../types";

export async function createVehicle(
  userId: string,
  licensePlate: string,
  make?: string,
  color?: string,
  itemType?: string
): Promise<Vehicle> {
  const rows = await query<Vehicle>(
    `INSERT INTO vehicles (user_id, license_plate, make, color, item_type)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, licensePlate.toUpperCase().trim(), make || null, color || null, itemType || "car"]
  );
  return rows[0];
}

export async function getUserVehicles(userId: string): Promise<Vehicle[]> {
  return query<Vehicle>(
    `SELECT v.*, t.id as tag_id, t.tag_code, t.status as tag_status,
            t.is_paused as tag_paused, t.custom_message as tag_message
     FROM vehicles v
     LEFT JOIN tags t ON t.vehicle_id = v.id
     WHERE v.user_id = $1
     ORDER BY v.created_at DESC`,
    [userId]
  );
}

export async function getVehicleById(
  id: string,
  userId: string
): Promise<Vehicle | null> {
  return queryOne<Vehicle>(
    `SELECT * FROM vehicles WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
}

export async function deleteVehicle(
  id: string,
  userId: string
): Promise<boolean> {
  const rows = await query(
    `DELETE FROM vehicles WHERE id = $1 AND user_id = $2 RETURNING id`,
    [id, userId]
  );
  return rows.length > 0;
}
