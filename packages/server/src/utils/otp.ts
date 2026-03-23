import crypto from "crypto";

/**
 * Generate a 6-digit OTP code.
 */
export function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}
