import { query, queryOne } from "../config/database";
import { ScanSession, Communication } from "../types";

export async function createScanSession(
  tagId: string,
  scannerIp: string | null,
  scannerPhone: string | null,
  source: "qr" | "sms" | "whatsapp",
  location?: { latitude?: number; longitude?: number },
  userAgent?: string | null
): Promise<ScanSession> {
  const rows = await query<ScanSession>(
    `INSERT INTO scan_sessions (tag_id, scanner_ip, scanner_phone, source, latitude, longitude, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      tagId,
      scannerIp,
      scannerPhone,
      source,
      location?.latitude || null,
      location?.longitude || null,
      userAgent || null,
    ]
  );
  return rows[0];
}

export async function logCommunication(
  scanSessionId: string,
  type: "call" | "sms" | "whatsapp",
  target: "owner" | "emergency",
  atSessionId?: string
): Promise<Communication> {
  const rows = await query<Communication>(
    `INSERT INTO communications (scan_session_id, type, target, at_session_id, status)
     VALUES ($1, $2, $3, $4, 'initiated')
     RETURNING *`,
    [scanSessionId, type, target, atSessionId || null]
  );
  return rows[0];
}

export async function updateCommunicationStatus(
  atSessionId: string,
  status: string,
  durationSecs?: number,
  costKes?: number
): Promise<void> {
  await query(
    `UPDATE communications
     SET status = $1, duration_secs = $2, cost_kes = $3
     WHERE at_session_id = $4`,
    [status, durationSecs || null, costKes || null, atSessionId]
  );
}

export async function getRecentScansForTag(
  tagId: string,
  minutes: number = 15
): Promise<ScanSession[]> {
  return query<ScanSession>(
    `SELECT * FROM scan_sessions
     WHERE tag_id = $1 AND created_at > NOW() - INTERVAL '${minutes} minutes'
     ORDER BY created_at DESC`,
    [tagId]
  );
}
