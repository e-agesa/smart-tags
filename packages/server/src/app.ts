import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import hpp from "hpp";
import path from "path";
import { generalLimiter } from "./middleware/rate-limit.middleware";
import { errorHandler } from "./middleware/error-handler.middleware";
import { authRoutes } from "./routes/auth.routes";
import { vehicleRoutes } from "./routes/vehicle.routes";
import { tagRoutes } from "./routes/tag.routes";
import { scanRoutes } from "./routes/scan.routes";
import { paymentRoutes } from "./routes/payment.routes";
import { webhookRoutes } from "./routes/webhook.routes";
import { adminRoutes } from "./routes/admin.routes";
import { chatRoutes } from "./routes/chat.routes";
import { subscriptionRoutes } from "./routes/subscription.routes";

const app = express();

// View engine for scan pages
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ---- Security middleware ----
// Helmet: sets secure HTTP headers (XSS protection, no-sniff, HSTS, etc.)
app.use(
  helmet({
    contentSecurityPolicy: false, // disabled for EJS pages with inline scripts
    crossOriginEmbedderPolicy: false,
  })
);

// Prevent HTTP parameter pollution
app.use(hpp());

// CORS: restrict origins in production
app.use(
  cors({
    origin: process.env.NODE_ENV === "production"
      ? [process.env.FRONTEND_URL || "https://smarttags.co.ke"]
      : true,
    credentials: true,
  })
);

// Body parsing with size limits
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));
app.use(cookieParser());

// Global rate limiter
app.use(generalLimiter);

// Disable X-Powered-By
app.disable("x-powered-by");

// ---- Routes ----

// API info (only in dev — production serves React at /)
if (process.env.NODE_ENV !== "production") {
  app.get("/", (_req, res) => {
    res.json({
      name: "Smart Tags API",
      version: "1.0.0",
      status: "running",
      docs: {
        health: "/health",
        auth: "/api/auth",
        vehicles: "/api/vehicles",
        tags: "/api/tags",
        payments: "/api/payments",
        admin: "/api/admin",
        scan: "/s/:tagCode",
      },
    });
  });
}

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/tags", tagRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api", subscriptionRoutes);
app.use("/s", scanRoutes);
app.use("/webhooks", webhookRoutes);

// Serve React frontend in production
if (process.env.NODE_ENV === "production") {
  const webDist = path.join(__dirname, "../../web/dist");
  app.use(express.static(webDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(webDist, "index.html"));
  });
}

// Error handler
app.use(errorHandler);

export { app };
