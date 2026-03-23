import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(16),
  JWT_ADMIN_SECRET: z.string().min(16),
  BASE_URL: z.string().url(),

  // Africa's Talking
  AT_API_KEY: z.string(),
  AT_USERNAME: z.string(),
  AT_SENDER_ID: z.string().default("CParkTag"),
  AT_PHONE_NUMBER: z.string(),
  AT_ENVIRONMENT: z.enum(["sandbox", "production"]).default("sandbox"),

  // M-Pesa Daraja
  MPESA_CONSUMER_KEY: z.string(),
  MPESA_CONSUMER_SECRET: z.string(),
  MPESA_SHORTCODE: z.string(),
  MPESA_PASSKEY: z.string(),
  MPESA_CALLBACK_URL: z.string().url(),
  MPESA_ENVIRONMENT: z.enum(["sandbox", "production"]).default("sandbox"),

  // WhatsApp
  WHATSAPP_BUSINESS_PHONE: z.string().default(""),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
