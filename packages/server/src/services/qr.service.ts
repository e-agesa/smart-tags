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

/**
 * Generate a QR code as SVG string (for high-res printing).
 */
export async function generateQrSvg(tagCode: string): Promise<string> {
  const scanUrl = `${env.BASE_URL}/s/${tagCode}`;
  return QRCode.toString(scanUrl, {
    type: "svg",
    width: 400,
    margin: 2,
    errorCorrectionLevel: "H",
  });
}

/**
 * Generate a batch of QR codes as SVG strings.
 */
export async function generateBatchQrSvg(
  tagCodes: string[]
): Promise<Array<{ tag_code: string; svg: string }>> {
  const results = [];
  for (const code of tagCodes) {
    const svg = await generateQrSvg(code);
    results.push({ tag_code: code, svg });
  }
  return results;
}
