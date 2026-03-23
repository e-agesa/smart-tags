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

export { router as adminRoutes };
