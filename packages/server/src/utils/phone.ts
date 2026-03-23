/**
 * Normalize a Kenyan phone number to E.164 format (+254XXXXXXXXX).
 * Accepts: 0712345678, 254712345678, +254712345678, 712345678
 */
export function normalizeKenyanPhone(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");

  if (digits.startsWith("254") && digits.length === 12) {
    return `+${digits}`;
  }
  if (digits.startsWith("0") && digits.length === 10) {
    return `+254${digits.slice(1)}`;
  }
  if (digits.length === 9 && (digits.startsWith("7") || digits.startsWith("1"))) {
    return `+254${digits}`;
  }
  throw new Error(`Invalid Kenyan phone number: ${phone}`);
}

/**
 * Validate that a string is a valid Kenyan phone number.
 */
export function isValidKenyanPhone(phone: string): boolean {
  try {
    normalizeKenyanPhone(phone);
    return true;
  } catch {
    return false;
  }
}
