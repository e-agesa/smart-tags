import { getGatewayBySlug } from "./gateway.service";
import { env } from "../config/env";

interface PaymentRequest {
  amount: number;
  currency: string;
  phone?: string;
  email?: string;
  reference: string;
  description: string;
  callbackUrl: string;
}

interface PaymentResult {
  success: boolean;
  gateway: string;
  checkout_id?: string;
  checkout_url?: string;
  error?: string;
}

// ---- M-Pesa STK Push ----
async function processMpesa(req: PaymentRequest, config: Record<string, string>): Promise<PaymentResult> {
  const { consumer_key, consumer_secret, shortcode, passkey, environment } = config;
  const baseUrl = environment === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

  // Get OAuth token
  const authRes = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${Buffer.from(`${consumer_key}:${consumer_secret}`).toString("base64")}` },
  });
  const { access_token } = await authRes.json() as { access_token: string };

  const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, "").slice(0, 14);
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");

  const stkRes = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.round(req.amount),
      PartyA: req.phone,
      PartyB: shortcode,
      PhoneNumber: req.phone,
      CallBackURL: req.callbackUrl,
      AccountReference: req.reference,
      TransactionDesc: req.description,
    }),
  });
  const result = await stkRes.json() as Record<string, string>;

  return {
    success: result.ResponseCode === "0",
    gateway: "mpesa",
    checkout_id: result.CheckoutRequestID,
    error: result.ResponseCode !== "0" ? result.ResponseDescription : undefined,
  };
}

// ---- Paystack ----
async function processPaystack(req: PaymentRequest, config: Record<string, string>): Promise<PaymentResult> {
  const { secret_key } = config;
  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret_key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: Math.round(req.amount * 100), // Paystack uses kobo/cents
      currency: req.currency,
      email: req.email || "customer@smarttags.co.ke",
      reference: req.reference,
      callback_url: req.callbackUrl,
      metadata: { description: req.description },
    }),
  });
  const data = await res.json() as { status: boolean; data?: { authorization_url: string; reference: string } };

  return {
    success: data.status,
    gateway: "paystack",
    checkout_url: data.data?.authorization_url,
    checkout_id: data.data?.reference,
    error: !data.status ? "Paystack initialization failed" : undefined,
  };
}

// ---- Pesapal ----
async function processPesapal(req: PaymentRequest, config: Record<string, string>): Promise<PaymentResult> {
  const { consumer_key, consumer_secret, environment } = config;
  const baseUrl = environment === "production"
    ? "https://pay.pesapal.com/v3"
    : "https://cybqa.pesapal.com/pesapalv3";

  // Auth
  const authRes = await fetch(`${baseUrl}/api/Auth/RequestToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ consumer_key, consumer_secret }),
  });
  const { token } = await authRes.json() as { token: string };

  // Submit order
  const orderRes = await fetch(`${baseUrl}/api/Transactions/SubmitOrderRequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: req.reference,
      currency: req.currency,
      amount: req.amount,
      description: req.description,
      callback_url: req.callbackUrl,
      billing_address: { phone_number: req.phone, email_address: req.email },
    }),
  });
  const data = await orderRes.json() as { redirect_url?: string; order_tracking_id?: string; error?: { message: string } };

  return {
    success: !!data.redirect_url,
    gateway: "pesapal",
    checkout_url: data.redirect_url,
    checkout_id: data.order_tracking_id,
    error: data.error?.message,
  };
}

// ---- PayPal ----
async function processPaypal(req: PaymentRequest, config: Record<string, string>): Promise<PaymentResult> {
  const { client_id, client_secret, environment } = config;
  const baseUrl = environment === "production"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

  // Auth
  const authRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${client_id}:${client_secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const { access_token } = await authRes.json() as { access_token: string };

  // Create order
  const orderRes = await fetch(`${baseUrl}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [{
        reference_id: req.reference,
        description: req.description,
        amount: { currency_code: req.currency, value: req.amount.toFixed(2) },
      }],
      application_context: {
        return_url: req.callbackUrl,
        cancel_url: `${env.BASE_URL}/payment/cancelled`,
      },
    }),
  });
  const data = await orderRes.json() as { id?: string; links?: Array<{ rel: string; href: string }> };
  const approveLink = data.links?.find((l) => l.rel === "approve");

  return {
    success: !!approveLink,
    gateway: "paypal",
    checkout_url: approveLink?.href,
    checkout_id: data.id,
  };
}

// ---- Stripe ----
async function processStripe(req: PaymentRequest, config: Record<string, string>): Promise<PaymentResult> {
  const { secret_key } = config;

  const params = new URLSearchParams({
    "payment_method_types[]": "card",
    "line_items[0][price_data][currency]": req.currency.toLowerCase(),
    "line_items[0][price_data][unit_amount]": String(Math.round(req.amount * 100)),
    "line_items[0][price_data][product_data][name]": req.description,
    "line_items[0][quantity]": "1",
    mode: "payment",
    success_url: `${req.callbackUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.BASE_URL}/payment/cancelled`,
    client_reference_id: req.reference,
  });

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret_key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  const data = await res.json() as { id?: string; url?: string; error?: { message: string } };

  return {
    success: !!data.url,
    gateway: "stripe",
    checkout_url: data.url,
    checkout_id: data.id,
    error: data.error?.message,
  };
}

// ---- Main router ----
export async function processPayment(
  gateway: string,
  request: PaymentRequest
): Promise<PaymentResult> {
  const gw = await getGatewayBySlug(gateway);
  if (!gw || !gw.is_enabled) {
    return { success: false, gateway, error: `Gateway "${gateway}" is not enabled` };
  }

  try {
    switch (gateway) {
      case "mpesa":
        return await processMpesa(request, gw.config);
      case "paystack":
        return await processPaystack(request, gw.config);
      case "pesapal":
        return await processPesapal(request, gw.config);
      case "paypal":
        return await processPaypal(request, gw.config);
      case "stripe":
        return await processStripe(request, gw.config);
      default:
        return { success: false, gateway, error: `Unsupported gateway: ${gateway}` };
    }
  } catch (err) {
    console.error(`Payment gateway error (${gateway}):`, err);
    return { success: false, gateway, error: "Payment processing failed" };
  }
}

// Get available gateways for a currency
export async function getGatewaysForCurrency(currency: string): Promise<Array<{ slug: string; name: string }>> {
  const { query } = await import("../config/database");
  return query(
    `SELECT slug, name FROM payment_gateways
     WHERE is_enabled = TRUE AND $1 = ANY(supported_currencies)
     ORDER BY name`,
    [currency.toUpperCase()]
  );
}
