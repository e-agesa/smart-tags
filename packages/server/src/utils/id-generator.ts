import crypto from "crypto";

/**
 * Generate a tag code like "CPK-A3F7X2" — short, human-readable, SMS-friendly.
 */
export function generateTagCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No I, O, 0, 1 to avoid confusion
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[crypto.randomInt(chars.length)];
  }
  return `CPK-${code}`;
}
