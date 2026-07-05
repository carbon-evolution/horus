import "server-only";
import { Pool } from "pg";
import Redis from "ioredis";

// Singletons survive Next dev HMR by hanging off globalThis.
const g = globalThis as unknown as { _pgPool?: Pool; _redis?: Redis };

export const pool =
  g._pgPool ?? (g._pgPool = new Pool({ connectionString: process.env.DATABASE_URL }));

export const redis =
  g._redis ?? (g._redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6380"));

const CACHE_TTL = Number(process.env.CACHE_TTL ?? "86400");

/**
 * Read one dataset payload as its parsed JSON. Redis read-through: hit Redis
 * first (key `scr:{industry}:{dataset}`), fall back to Postgres and re-warm.
 * Returns `fallback` when the row is absent.
 */
export async function readDataset<T>(industry: string, dataset: string, fallback: T): Promise<T> {
  const key = `scr:${industry}:${dataset}`;
  const cached = await redis.get(key);
  if (cached !== null) return JSON.parse(cached) as T;

  const res = await pool.query<{ payload: T }>(
    "select payload from industry_dataset where industry=$1 and dataset=$2",
    [industry, dataset],
  );
  if (res.rowCount === 0) return fallback;

  const payload = res.rows[0].payload;
  await redis.set(key, JSON.stringify(payload), "EX", CACHE_TTL);
  return payload;
}
