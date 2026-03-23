import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
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

const app = express();

// View engine for scan pages
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Global middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(generalLimiter);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/tags", tagRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/s", scanRoutes);
app.use("/webhooks", webhookRoutes);

// Error handler
app.use(errorHandler);

export { app };
