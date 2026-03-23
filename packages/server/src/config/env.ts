import { z } from "zod";
import dotenv from "dotenv";
import path from "path";
// Support both CJS (__dirname) and ESM, plus fallback to cwd
const envPaths = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "../../.env"),
];

for (const p of envPaths) {
  const result = dotenv.config({ path: p });
  if (!result.error) break;
}

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string().min(16),
  JWT_ADMIN_SECRET: z.string().min(16),
  BASE_URL: z.string().url(),

  // Africa's Talking
  AT_API_KEY: z.string().default("sandbox-api-key"),
  AT_USERNAME: z.string().default("sandbox"),
  AT_SENDER_ID: z.string().default("CParkTag"),
  AT_PHONE_NUMBER: z.string().default("+254700000000"),
  AT_ENVIRONMENT: z.enum(["sandbox", "production"]).default("sandbox"),

  // M-Pesa Daraja
  MPESA_CONSUMER_KEY: z.string().default("sandbox-key"),
  MPESA_CONSUMER_SECRET: z.string().default("sandbox-secret"),
  MPESA_SHORTCODE: z.string().default("174379"),
  MPESA_PASSKEY: z.string().default("sandbox-passkey"),
  MPESA_CALLBACK_URL: z.string().default("http://localhost:3000/webhooks/mpesa/callback"),
  MPESA_ENVIRONMENT: z.enum(["sandbox", "production"]).default("sandbox"),

  // WhatsApp
  WHATSAPP_BUSINESS_PHONE: z.string().default(""),

  // Email (SendGrid)
  SENDGRID_API_KEY: z.string().default(""),
  FROM_EMAIL: z.string().default("noreply@smarttags.co.ke"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
