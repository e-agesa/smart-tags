import { Pool } from "pg";
import { env } from "./env";

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

pool.on("error", (err) => {
  console.error("Unexpected database pool error:", err);
  process.exit(1);
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function query<T = any>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows as T[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function queryOne<T = any>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
