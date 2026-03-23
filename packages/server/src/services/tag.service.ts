import { query, queryOne } from "../config/database";
import { Tag } from "../types";
import { generateTagCode } from "../utils/id-generator";
import { generateQrDataUrl } from "./qr.service";

export async function createTag(vehicleId: string): Promise<Tag> {
  // Generate a unique tag code (retry on collision)
  let tagCode: string;
  let attempts = 0;
  do {
    tagCode = generateTagCode();
    const existing = await queryOne<Tag>(
      `SELECT id FROM tags WHERE tag_code = $1`,
      [tagCode]
    );
    if (!existing) break;
    attempts++;
  } while (attempts < 10);

  if (attempts >= 10) {
    throw new Error("Failed to generate unique tag code");
  }

  const qrDataUrl = await generateQrDataUrl(tagCode);

  const rows = await query<Tag>(
    `INSERT INTO tags (vehicle_id, tag_code, qr_data_url, status)
     VALUES ($1, $2, $3, 'pending')
     RETURNING *`,
    [vehicleId, tagCode, qrDataUrl]
  );
  return rows[0];
}

export async function getTagByCode(tagCode: string): Promise<
  | (Tag & {
      vehicle_make: string | null;
      vehicle_color: string | null;
      item_type: string;
      owner_phone: string;
      owner_name: string;
      owner_email: string | null;
      emergency_phone: string | null;
      emergency_name: string | null;
    })
  | null
> {
  return queryOne(
    `SELECT t.*, v.make as vehicle_make, v.color as vehicle_color, v.item_type,
            u.phone as owner_phone, u.full_name as owner_name, u.email as owner_email,
            u.emergency_phone, u.emergency_name
     FROM tags t
     JOIN vehicles v ON v.id = t.vehicle_id
     JOIN users u ON u.id = v.user_id
     WHERE t.tag_code = $1`,
    [tagCode]
  );
}

export async function getTagById(id: string): Promise<Tag | null> {
  return queryOne<Tag>(`SELECT * FROM tags WHERE id = $1`, [id]);
}

export async function getTagByVehicleId(
  vehicleId: string
): Promise<Tag | null> {
  return queryOne<Tag>(`SELECT * FROM tags WHERE vehicle_id = $1`, [vehicleId]);
}

export async function activateTag(tagId: string): Promise<Tag | null> {
  return queryOne<Tag>(
    `UPDATE tags
     SET status = 'active', activated_at = NOW(), expires_at = NOW() + INTERVAL '1 year'
     WHERE id = $1
     RETURNING *`,
    [tagId]
  );
}

export async function updateTagStatus(
  tagId: string,
  status: string
): Promise<Tag | null> {
  return queryOne<Tag>(
    `UPDATE tags SET status = $1 WHERE id = $2 RETURNING *`,
    [status, tagId]
  );
}

export async function toggleTagPause(
  tagId: string,
  isPaused: boolean
): Promise<Tag | null> {
  return queryOne<Tag>(
    `UPDATE tags SET is_paused = $1 WHERE id = $2 RETURNING *`,
    [isPaused, tagId]
  );
}

export async function updateCustomMessage(
  tagId: string,
  message: string | null
): Promise<Tag | null> {
  return queryOne<Tag>(
    `UPDATE tags SET custom_message = $1 WHERE id = $2 RETURNING *`,
    [message, tagId]
  );
}
