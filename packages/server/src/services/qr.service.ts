import QRCode from "qrcode";
import { env } from "../config/env";

/**
 * Generate a QR code as a data URL (base64 PNG) for a given tag code.
 */
export async function generateQrDataUrl(tagCode: string): Promise<string> {
  const scanUrl = `${env.BASE_URL}/s/${tagCode}`;
  return QRCode.toDataURL(scanUrl, {
    width: 400,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
    errorCorrectionLevel: "H", // High — allows ~30% damage tolerance
  });
}

/**
 * Generate a QR code as a PNG buffer for download.
 */
export async function generateQrBuffer(tagCode: string): Promise<Buffer> {
  const scanUrl = `${env.BASE_URL}/s/${tagCode}`;
  return QRCode.toBuffer(scanUrl, {
    width: 800,
    margin: 3,
    errorCorrectionLevel: "H",
  });
}
