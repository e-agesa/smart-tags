import { Router, Request, Response } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate.middleware";
import { requireAuth } from "../middleware/auth.middleware";
import { otpLimiter } from "../middleware/rate-limit.middleware";
import * as authService from "../services/auth.service";
import { isValidKenyanPhone } from "../utils/phone";

const router = Router();

const registerSchema = z.object({
  full_name: z.string().min(2).max(150),
  phone: z.string().refine(isValidKenyanPhone, "Invalid Kenyan phone number"),
  password: z.string().min(6).max(100),
  email: z.string().email().optional(),
});

const otpSchema = z.object({
  phone: z.string().refine(isValidKenyanPhone, "Invalid Kenyan phone number"),
  purpose: z.enum(["registration", "login"]),
});

const verifyOtpSchema = z.object({
  phone: z.string().refine(isValidKenyanPhone, "Invalid Kenyan phone number"),
  code: z.string().length(6),
  purpose: z.enum(["registration", "login"]),
});

const loginSchema = z.object({
  phone: z.string().refine(isValidKenyanPhone, "Invalid Kenyan phone number"),
  password: z.string(),
});

const updateProfileSchema = z.object({
  full_name: z.string().min(2).max(150).optional(),
  email: z.string().email().optional(),
  emergency_phone: z
    .string()
    .refine(isValidKenyanPhone, "Invalid Kenyan phone number")
    .optional(),
  emergency_name: z.string().max(150).optional(),
  lang_pref: z.enum(["en", "sw"]).optional(),
});

// POST /api/auth/register
router.post(
  "/register",
  validate(registerSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = await authService.registerUser(
        req.body.full_name,
        req.body.phone,
        req.body.password,
        req.body.email
      );
      // Auto-send OTP for registration
      await authService.requestOtp(req.body.phone, "registration");

      // Grant 1-month free trial
      const { grantFreeTrial } = await import("../services/promo.service");
      await grantFreeTrial(user.id).catch(() => {});

      res.status(201).json({
        message: "Account created with 1-month free trial! Please verify your phone number.",
        userId: user.id,
        trial: true,
      });
    } catch (err: unknown) {
      const pgErr = err as { code?: string };
      if (pgErr.code === "23505") {
        res
          .status(409)
          .json({ error: "Phone number already registered" });
        return;
      }
      throw err;
    }
  }
);

// POST /api/auth/request-otp
router.post(
  "/request-otp",
  otpLimiter,
  validate(otpSchema),
  async (req: Request, res: Response): Promise<void> => {
    await authService.requestOtp(req.body.phone, req.body.purpose);
    res.json({ message: "OTP sent" });
  }
);

// POST /api/auth/verify-otp
router.post(
  "/verify-otp",
  validate(verifyOtpSchema),
  async (req: Request, res: Response): Promise<void> => {
    const valid = await authService.verifyOtp(
      req.body.phone,
      req.body.code,
      req.body.purpose
    );
    if (!valid) {
      res.status(400).json({ error: "Invalid or expired OTP" });
      return;
    }
    res.json({ message: "Phone verified successfully" });
  }
);

// POST /api/auth/login
router.post(
  "/login",
  validate(loginSchema),
  async (req: Request, res: Response): Promise<void> => {
    const result = await authService.loginUser(
      req.body.phone,
      req.body.password
    );
    if (!result) {
      res.status(401).json({ error: "Invalid phone or password" });
      return;
    }
    res.cookie("token", result.token, {
      httpOnly: true,
      secure: process.env.BASE_URL?.startsWith("https"),
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
    res.json({
      message: "Login successful",
      user: {
        id: result.user.id,
        full_name: result.user.full_name,
        phone: result.user.phone,
        email: result.user.email,
        phone_verified: result.user.phone_verified,
        lang_pref: result.user.lang_pref,
      },
    });
  }
);

// POST /api/auth/logout
router.post("/logout", (_req: Request, res: Response): void => {
  res.clearCookie("token");
  res.json({ message: "Logged out" });
});

// GET /api/me
router.get(
  "/me",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const user = await authService.getUserById(req.user!.userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({
      id: user.id,
      full_name: user.full_name,
      phone: user.phone,
      email: user.email,
      phone_verified: user.phone_verified,
      emergency_phone: user.emergency_phone,
      emergency_name: user.emergency_name,
      lang_pref: user.lang_pref,
    });
  }
);

// PUT /api/me
router.put(
  "/me",
  requireAuth,
  validate(updateProfileSchema),
  async (req: Request, res: Response): Promise<void> => {
    const user = await authService.updateUser(req.user!.userId, req.body);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({
      id: user.id,
      full_name: user.full_name,
      phone: user.phone,
      email: user.email,
      emergency_phone: user.emergency_phone,
      emergency_name: user.emergency_name,
      lang_pref: user.lang_pref,
    });
  }
);

// POST /api/auth/google — Google OAuth token exchange
const googleSchema = z.object({
  credential: z.string(),
});

router.post(
  "/google",
  validate(googleSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Decode Google JWT (ID token) — in production, verify with Google's public keys
      const parts = req.body.credential.split(".");
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());

      const { sub: googleId, email, name, picture } = payload;
      if (!email || !googleId) {
        res.status(400).json({ error: "Invalid Google token" });
        return;
      }

      const user = await authService.findOrCreateOAuthUser(
        "google",
        googleId,
        email,
        name || email.split("@")[0],
        picture
      );

      const token = await authService.generateUserToken(user);

      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.BASE_URL?.startsWith("https"),
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000,
      });

      res.json({
        message: "Login successful",
        user: {
          id: user.id,
          full_name: user.full_name,
          phone: user.phone,
          email: user.email,
          phone_verified: user.phone_verified,
          lang_pref: user.lang_pref,
          avatar_url: user.avatar_url,
          needs_phone: !user.phone,
        },
      });
    } catch (err) {
      console.error("Google OAuth error:", err);
      res.status(500).json({ error: "Google authentication failed" });
    }
  }
);

export { router as authRoutes };
