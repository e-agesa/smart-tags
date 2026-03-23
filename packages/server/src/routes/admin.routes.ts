import { Router, Request, Response } from "express";
import { z } from "zod";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { validate } from "../middleware/validate.middleware";
import { requireAdmin } from "../middleware/auth.middleware";
import { query, queryOne } from "../config/database";
import { env } from "../config/env";
import { AdminUser, AdminJwtPayload } from "../types";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// POST /api/admin/login
router.post(
  "/login",
  validate(loginSchema),
  async (req: Request, res: Response): Promise<void> => {
    const admin = await queryOne<AdminUser>(
      `SELECT * FROM admin_users WHERE email = $1`,
      [req.body.email]
    );
    if (!admin) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const valid = await bcrypt.compare(req.body.password, admin.password_hash);
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const payload: AdminJwtPayload = {
      adminId: admin.id,
      email: admin.email,
      role: admin.role,
    };
    const token = jwt.sign(payload, env.JWT_ADMIN_SECRET, {
      expiresIn: "8h",
    });

    res.cookie("admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 8 * 60 * 60 * 1000,
    });
    res.json({ message: "Admin login successful", role: admin.role });
  }
);

// All routes below require admin auth
router.use(requireAdmin);

// GET /api/admin/stats
router.get(
  "/stats",
  async (_req: Request, res: Response): Promise<void> => {
    const [users, tags, scansToday, revenue] = await Promise.all([
      queryOne<{ count: string }>(`SELECT COUNT(*) FROM users`),
      queryOne<{ count: string }>(
        `SELECT COUNT(*) FROM tags WHERE status = 'active'`
      ),
      queryOne<{ count: string }>(
        `SELECT COUNT(*) FROM scan_sessions WHERE created_at > CURRENT_DATE`
      ),
      queryOne<{ total: string }>(
        `SELECT COALESCE(SUM(amount_kes), 0) as total FROM payments WHERE status = 'completed'`
      ),
    ]);

    res.json({
      totalUsers: parseInt(users?.count || "0"),
      activeTags: parseInt(tags?.count || "0"),
      scansToday: parseInt(scansToday?.count || "0"),
      totalRevenue: parseFloat(revenue?.total || "0"),
    });
  }
);

// GET /api/admin/registrations
router.get(
  "/registrations",
  async (req: Request, res: Response): Promise<void> => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const offset = (page - 1) * limit;

    let whereClause = "";
    const params: unknown[] = [];

    if (search) {
      whereClause = `WHERE u.full_name ILIKE $1 OR u.phone ILIKE $1`;
      params.push(`%${search}%`);
    }

    const users = await query(
      `SELECT u.id, u.full_name, u.phone, u.phone_verified, u.created_at,
              COUNT(v.id) as vehicle_count
       FROM users u
       LEFT JOIN vehicles v ON v.user_id = u.id
       ${whereClause}
       GROUP BY u.id
       ORDER BY u.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    const total = await queryOne<{ count: string }>(
      `SELECT COUNT(*) FROM users u ${whereClause}`,
      params
    );

    res.json({
      data: users,
      total: parseInt(total?.count || "0"),
      page,
      limit,
    });
  }
);

// GET /api/admin/scans
router.get(
  "/scans",
  async (req: Request, res: Response): Promise<void> => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const scans = await query(
      `SELECT s.id, s.source, s.created_at, t.tag_code,
              v.license_plate, v.make, v.color,
              c.type as comm_type, c.status as comm_status
       FROM scan_sessions s
       JOIN tags t ON t.id = s.tag_id
       JOIN vehicles v ON v.id = t.vehicle_id
       LEFT JOIN communications c ON c.scan_session_id = s.id
       ORDER BY s.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({ data: scans, page, limit });
  }
);

// GET /api/admin/payments
router.get(
  "/payments",
  async (req: Request, res: Response): Promise<void> => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const payments = await query(
      `SELECT p.*, u.full_name, t.tag_code
       FROM payments p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN tags t ON t.id = p.tag_id
       ORDER BY p.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({ data: payments, page, limit });
  }
);

// PUT /api/admin/tags/:id/status
router.put(
  "/tags/:id/status",
  async (req: Request, res: Response): Promise<void> => {
    const { status } = req.body;
    if (!["active", "suspended", "expired"].includes(status)) {
      res.status(400).json({ error: "Invalid status" });
      return;
    }

    const { updateTagStatus } = await import("../services/tag.service");
    const tag = await updateTagStatus(req.params.id as string, status);
    if (!tag) {
      res.status(404).json({ error: "Tag not found" });
      return;
    }
    res.json(tag);
  }
);

// POST /api/admin/qr/batch — Generate batch QR codes
router.post(
  "/qr/batch",
  async (req: Request, res: Response): Promise<void> => {
    const qty = parseInt(req.body.qty) || 10;
    if (qty < 1 || qty > 500) {
      res.status(400).json({ error: "Quantity must be 1-500" });
      return;
    }

    const { generateTagCode } = await import("../utils/id-generator");
    const { generateQrSvg } = await import("../services/qr.service");

    const codes: Array<{ tag_code: string; svg: string }> = [];
    for (let i = 0; i < qty; i++) {
      const code = generateTagCode();
      const svg = await generateQrSvg(code);
      codes.push({ tag_code: code, svg });
    }

    // Log batch
    await query(
      `INSERT INTO qr_batches (admin_id, qty, format, status) VALUES ($1, $2, 'svg', 'completed')`,
      [req.admin!.adminId, qty]
    );

    res.json({ count: codes.length, codes });
  }
);

// GET /api/admin/orders — sticker orders
router.get(
  "/orders",
  async (_req: Request, res: Response): Promise<void> => {
    const orders = await query(
      `SELECT o.*, u.full_name, u.phone
       FROM sticker_orders o
       JOIN users u ON u.id = o.user_id
       ORDER BY o.created_at DESC LIMIT 100`
    );
    res.json({ data: orders });
  }
);

// ---- Payment Gateway Management ----

// GET /api/admin/gateways — list all payment gateways with config
router.get(
  "/gateways",
  async (_req: Request, res: Response): Promise<void> => {
    const { getAllGateways } = await import("../services/gateway.service");
    const gateways = await getAllGateways();
    res.json({ data: gateways });
  }
);

// PUT /api/admin/gateways/:slug — update gateway config
router.put(
  "/gateways/:slug",
  async (req: Request, res: Response): Promise<void> => {
    const { config, is_enabled } = req.body;
    if (!config || typeof config !== "object") {
      res.status(400).json({ error: "config object is required" });
      return;
    }

    const { updateGatewayConfig } = await import("../services/gateway.service");
    const gateway = await updateGatewayConfig(
      req.params.slug as string,
      config,
      is_enabled ?? false
    );
    if (!gateway) {
      res.status(404).json({ error: "Gateway not found" });
      return;
    }
    res.json(gateway);
  }
);

// GET /api/admin/reports/revenue — revenue over time
router.get(
  "/reports/revenue",
  async (req: Request, res: Response): Promise<void> => {
    const days = parseInt(req.query.days as string) || 30;
    const revenue = await query(
      `SELECT DATE(created_at) as date,
              COUNT(*) as transactions,
              SUM(CASE WHEN status = 'completed' THEN amount_kes ELSE 0 END) as revenue,
              COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
              COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
       FROM payments
       WHERE created_at > NOW() - INTERVAL '1 day' * $1
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [days]
    );
    res.json(revenue);
  }
);

// GET /api/admin/reports/scans — scan analytics
router.get(
  "/reports/scans",
  async (req: Request, res: Response): Promise<void> => {
    const days = parseInt(req.query.days as string) || 30;
    const [daily, bySource, topTags] = await Promise.all([
      query(
        `SELECT DATE(created_at) as date, COUNT(*) as scans
         FROM scan_sessions
         WHERE created_at > NOW() - INTERVAL '1 day' * $1
         GROUP BY DATE(created_at)
         ORDER BY date ASC`,
        [days]
      ),
      query(
        `SELECT source, COUNT(*) as count
         FROM scan_sessions
         WHERE created_at > NOW() - INTERVAL '1 day' * $1
         GROUP BY source ORDER BY count DESC`,
        [days]
      ),
      query(
        `SELECT t.tag_code, v.license_plate, COUNT(s.id) as scan_count
         FROM scan_sessions s
         JOIN tags t ON t.id = s.tag_id
         JOIN vehicles v ON v.id = t.vehicle_id
         WHERE s.created_at > NOW() - INTERVAL '1 day' * $1
         GROUP BY t.tag_code, v.license_plate
         ORDER BY scan_count DESC LIMIT 10`,
        [days]
      ),
    ]);
    res.json({ daily, bySource, topTags });
  }
);

// GET /api/admin/reports/users — user growth
router.get(
  "/reports/users",
  async (req: Request, res: Response): Promise<void> => {
    const days = parseInt(req.query.days as string) || 30;
    const [growth, planDistribution] = await Promise.all([
      query(
        `SELECT DATE(created_at) as date, COUNT(*) as new_users
         FROM users
         WHERE created_at > NOW() - INTERVAL '1 day' * $1
         GROUP BY DATE(created_at)
         ORDER BY date ASC`,
        [days]
      ),
      query(
        `SELECT COALESCE(p.name, 'Free') as plan, COUNT(DISTINCT u.id) as users
         FROM users u
         LEFT JOIN user_subscriptions s ON s.user_id = u.id AND s.status = 'active' AND s.expires_at > NOW()
         LEFT JOIN subscription_plans p ON p.id = s.plan_id
         GROUP BY p.name
         ORDER BY users DESC`
      ),
    ]);
    res.json({ growth, planDistribution });
  }
);

// GET /api/admin/reports/summary — extended stats
router.get(
  "/reports/summary",
  async (_req: Request, res: Response): Promise<void> => {
    const [totals] = await Promise.all([
      Promise.all([
        queryOne<{ count: string }>(`SELECT COUNT(*) FROM users`),
        queryOne<{ count: string }>(`SELECT COUNT(*) FROM tags WHERE status = 'active'`),
        queryOne<{ count: string }>(`SELECT COUNT(*) FROM scan_sessions`),
        queryOne<{ count: string }>(`SELECT COUNT(*) FROM scan_sessions WHERE created_at > CURRENT_DATE`),
        queryOne<{ total: string }>(`SELECT COALESCE(SUM(amount_kes), 0) as total FROM payments WHERE status = 'completed'`),
        queryOne<{ count: string }>(`SELECT COUNT(*) FROM payments WHERE status = 'completed'`),
        queryOne<{ count: string }>(`SELECT COUNT(*) FROM sticker_orders`),
        queryOne<{ count: string }>(`SELECT COUNT(*) FROM chat_rooms WHERE is_active = TRUE`),
        queryOne<{ count: string }>(`SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '7 days'`),
        queryOne<{ count: string }>(`SELECT COUNT(*) FROM scan_sessions WHERE created_at > NOW() - INTERVAL '7 days'`),
      ]),
    ]);
    res.json({
      totalUsers: parseInt(totals[0]?.count || "0"),
      activeTags: parseInt(totals[1]?.count || "0"),
      totalScans: parseInt(totals[2]?.count || "0"),
      scansToday: parseInt(totals[3]?.count || "0"),
      totalRevenue: parseFloat(totals[4]?.total || "0"),
      completedPayments: parseInt(totals[5]?.count || "0"),
      stickerOrders: parseInt(totals[6]?.count || "0"),
      activeChats: parseInt(totals[7]?.count || "0"),
      newUsersWeek: parseInt(totals[8]?.count || "0"),
      scansWeek: parseInt(totals[9]?.count || "0"),
    });
  }
);

// ---- Promo Codes ----
router.get("/promos", async (_req: Request, res: Response): Promise<void> => {
  const { getAllPromoCodes } = await import("../services/promo.service");
  res.json({ data: await getAllPromoCodes() });
});

router.post("/promos", async (req: Request, res: Response): Promise<void> => {
  const { createPromoCode } = await import("../services/promo.service");
  const promo = await createPromoCode(req.body);
  res.status(201).json(promo);
});

router.put("/promos/:id/toggle", async (req: Request, res: Response): Promise<void> => {
  const { togglePromoCode } = await import("../services/promo.service");
  await togglePromoCode(req.params.id as string, req.body.is_active ?? false);
  res.json({ message: "Updated" });
});

// ---- Offers ----
router.get("/offers", async (_req: Request, res: Response): Promise<void> => {
  const { getAllOffers } = await import("../services/promo.service");
  res.json({ data: await getAllOffers() });
});

router.post("/offers", async (req: Request, res: Response): Promise<void> => {
  const { createOffer } = await import("../services/promo.service");
  const offer = await createOffer(req.body);
  res.status(201).json(offer);
});

router.put("/offers/:id/toggle", async (req: Request, res: Response): Promise<void> => {
  const { toggleOffer } = await import("../services/promo.service");
  await toggleOffer(req.params.id as string, req.body.is_active ?? false);
  res.json({ message: "Updated" });
});

export { router as adminRoutes };
