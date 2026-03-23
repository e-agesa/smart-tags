import rateLimit from "express-rate-limit";

export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  keyGenerator: (req) => `auth:${req.ip}`,
  message: { error: "Too many login attempts. Please try again in 15 minutes." },
});

export const scanPageLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => `scan:${req.params.tagCode}:${req.ip}`,
  message: { error: "Too many scan requests for this tag" },
});

export const scanCallLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  keyGenerator: (req) => `call:${req.params.tagCode}`,
  message: { error: "Call limit reached. Please try again later." },
});

export const scanSmsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => `sms:${req.params.tagCode}`,
  message: { error: "SMS limit reached. Please try again later." },
});

export const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  keyGenerator: (req) => `otp:${req.body?.phone || req.ip}`,
  message: { error: "Too many OTP requests. Please try again later." },
});

export const paymentLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => `pay:${req.ip}`,
  message: { error: "Too many payment attempts. Please try again later." },
});
