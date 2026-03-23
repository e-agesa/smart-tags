import { env } from "../config/env";

const SANDBOX_URL = "https://sandbox.safaricom.co.ke";
const PRODUCTION_URL = "https://api.safaricom.co.ke";

function getBaseUrl(): string {
  return env.MPESA_ENVIRONMENT === "production" ? PRODUCTION_URL : SANDBOX_URL;
}

// Token cache
let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Get OAuth access token from Daraja API (with caching).
 */
export async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const credentials = Buffer.from(
    `${env.MPESA_CONSUMER_KEY}:${env.MPESA_CONSUMER_SECRET}`
  ).toString("base64");

  const response = await fetch(
    `${getBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`,
    {
      method: "GET",
      headers: { Authorization: `Basic ${credentials}` },
    }
  );

  if (!response.ok) {
    throw new Error(`Daraja OAuth failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: string;
  };
  const expiresIn = parseInt(data.expires_in, 10);

  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (expiresIn - 60) * 1000, // Refresh 60s early
  };

  return cachedToken.token;
}

/**
 * Generate the password for STK Push (base64 of shortcode + passkey + timestamp).
 */
function generatePassword(timestamp: string): string {
  return Buffer.from(
    `${env.MPESA_SHORTCODE}${env.MPESA_PASSKEY}${timestamp}`
  ).toString("base64");
}

/**
 * Get timestamp in the format YYYYMMDDHHmmss.
 */
function getTimestamp(): string {
  const now = new Date();
  return now
    .toISOString()
    .replace(/[-T:.Z]/g, "")
    .slice(0, 14);
}

export interface StkPushRequest {
  phone: string; // E.164 format: +254...
  amount: number;
  accountReference: string; // Tag code
  description: string;
}

export interface StkPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

/**
 * Initiate an M-Pesa STK Push (Lipa Na M-Pesa Online).
 */
export async function initiateSTKPush(
  request: StkPushRequest
): Promise<StkPushResponse> {
  const token = await getAccessToken();
  const timestamp = getTimestamp();
  const password = generatePassword(timestamp);

  // Remove the + prefix for M-Pesa (expects 254XXXXXXXXX)
  const phoneNumber = request.phone.replace("+", "");

  const body = {
    BusinessShortCode: env.MPESA_SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: request.amount,
    PartyA: phoneNumber,
    PartyB: env.MPESA_SHORTCODE,
    PhoneNumber: phoneNumber,
    CallBackURL: env.MPESA_CALLBACK_URL,
    AccountReference: request.accountReference,
    TransactionDesc: request.description,
  };

  const response = await fetch(
    `${getBaseUrl()}/mpesa/stkpush/v1/processrequest`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`STK Push failed: ${response.status} - ${text}`);
  }

  return (await response.json()) as StkPushResponse;
}

/**
 * Parse M-Pesa callback body to extract result.
 */
export interface MpesaCallbackResult {
  resultCode: number;
  resultDesc: string;
  merchantRequestId: string;
  checkoutRequestId: string;
  mpesaReceiptNumber?: string;
  amount?: number;
  transactionDate?: string;
  phoneNumber?: string;
}

export function parseCallback(body: Record<string, unknown>): MpesaCallbackResult {
  const stkCallback = (body.Body as Record<string, unknown>)?.stkCallback as Record<string, unknown>;

  const result: MpesaCallbackResult = {
    resultCode: stkCallback.ResultCode as number,
    resultDesc: stkCallback.ResultDesc as string,
    merchantRequestId: stkCallback.MerchantRequestID as string,
    checkoutRequestId: stkCallback.CheckoutRequestID as string,
  };

  // Extract metadata items on success
  if (result.resultCode === 0) {
    const metadata = stkCallback.CallbackMetadata as Record<string, unknown>;
    const items = (metadata?.Item as Array<{ Name: string; Value: unknown }>) || [];
    for (const item of items) {
      switch (item.Name) {
        case "MpesaReceiptNumber":
          result.mpesaReceiptNumber = item.Value as string;
          break;
        case "Amount":
          result.amount = item.Value as number;
          break;
        case "TransactionDate":
          result.transactionDate = String(item.Value);
          break;
        case "PhoneNumber":
          result.phoneNumber = String(item.Value);
          break;
      }
    }
  }

  return result;
}
