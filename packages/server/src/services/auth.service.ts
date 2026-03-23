import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { query, queryOne } from "../config/database";
import { env } from "../config/env";
import { User, OtpCode, UserJwtPayload } from "../types";
import { normalizeKenyanPhone } from "../utils/phone";
import { generateOtp } from "../utils/otp";

const SALT_ROUNDS = 12;
const JWT_EXPIRY = "24h";
const OTP_EXPIRY_MINUTES = 10;

export async function registerUser(
  fullName: string,
  phone: string,
  password: string,
  email?: string
): Promise<User> {
  const normalizedPhone = normalizeKenyanPhone(phone);
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const rows = await query<User>(
    `INSERT INTO users (full_name, phone, password_hash, email)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [fullName, normalizedPhone, passwordHash, email || null]
  );
  return rows[0];
}

export async function findOrCreateOAuthUser(
  provider: string,
  oauthId: string,
  email: string,
  fullName: string,
  avatarUrl?: string
): Promise<User> {
  // Check if user exists with this OAuth ID
  let user = await queryOne<User>(
    `SELECT * FROM users WHERE oauth_provider = $1 AND oauth_id = $2`,
    [provider, oauthId]
  );
  if (user) return user;

  // Check if user exists with this email — link accounts
  user = await queryOne<User>(
    `SELECT * FROM users WHERE email = $1`,
    [email]
  );
  if (user) {
    const rows = await query<User>(
      `UPDATE users SET oauth_provider = $1, oauth_id = $2, avatar_url = COALESCE(avatar_url, $3)
       WHERE id = $4 RETURNING *`,
      [provider, oauthId, avatarUrl || null, user.id]
    );
    return rows[0];
  }

  // Create new user (no phone yet — they'll add it later)
  const rows = await query<User>(
    `INSERT INTO users (full_name, email, oauth_provider, oauth_id, avatar_url, phone, phone_verified)
     VALUES ($1, $2, $3, $4, $5, '', FALSE)
     RETURNING *`,
    [fullName, email, provider, oauthId, avatarUrl || null]
  );
  return rows[0];
}

export async function generateUserToken(user: User): Promise<string> {
  const payload: UserJwtPayload = { userId: user.id, phone: user.phone || "" };
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export async function requestOtp(
  phone: string,
  purpose: "registration" | "login"
): Promise<string> {
  const normalizedPhone = normalizeKenyanPhone(phone);
  const code = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  // Invalidate previous unused OTPs for this phone/purpose
  await query(
    `UPDATE otp_codes SET used = TRUE WHERE phone = $1 AND purpose = $2 AND used = FALSE`,
    [normalizedPhone, purpose]
  );

  await query(
    `INSERT INTO otp_codes (phone, code, purpose, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [normalizedPhone, code, purpose, expiresAt]
  );

  // In development, log the OTP instead of sending SMS
  if (env.NODE_ENV === "development") {
    console.log(`[DEV] OTP for ${normalizedPhone}: ${code}`);
  }
  // TODO: Send via Africa's Talking SMS in production

  return code;
}

export async function verifyOtp(
  phone: string,
  code: string,
  purpose: "registration" | "login"
): Promise<boolean> {
  const normalizedPhone = normalizeKenyanPhone(phone);

  const otp = await queryOne<OtpCode>(
    `SELECT * FROM otp_codes
     WHERE phone = $1 AND code = $2 AND purpose = $3
       AND used = FALSE AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [normalizedPhone, code, purpose]
  );

  if (!otp) return false;

  await query(`UPDATE otp_codes SET used = TRUE WHERE id = $1`, [otp.id]);

  if (purpose === "registration") {
    await query(`UPDATE users SET phone_verified = TRUE WHERE phone = $1`, [
      normalizedPhone,
    ]);
  }

  return true;
}

export async function loginUser(
  phone: string,
  password: string
): Promise<{ user: User; token: string } | null> {
  const normalizedPhone = normalizeKenyanPhone(phone);

  const user = await queryOne<User>(
    `SELECT * FROM users WHERE phone = $1`,
    [normalizedPhone]
  );

  if (!user || !user.password_hash) return null;
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return null;

  const payload: UserJwtPayload = { userId: user.id, phone: user.phone };
  const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: JWT_EXPIRY });

  return { user, token };
}

export async function getUserById(id: string): Promise<User | null> {
  return queryOne<User>(`SELECT * FROM users WHERE id = $1`, [id]);
}

export async function updateUser(
  id: string,
  updates: {
    full_name?: string;
    emergency_phone?: string;
    emergency_name?: string;
    lang_pref?: string;
  }
): Promise<User | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      const dbKey = key === "emergency_phone"
        ? "emergency_phone"
        : key;
      fields.push(`${dbKey} = $${idx}`);
      values.push(
        key === "emergency_phone" && value
          ? normalizeKenyanPhone(value as string)
          : value
      );
      idx++;
    }
  }

  if (fields.length === 0) return getUserById(id);

  fields.push(`updated_at = NOW()`);
  values.push(id);

  return queryOne<User>(
    `UPDATE users SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
    values
  );
}
