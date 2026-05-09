import "@/lib/env";
import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";

declare global {
  var __pgPool: Pool | undefined;
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local.");
  }
  const ssl =
    process.env.PGSSL === "true" || /sslmode=require/.test(connectionString)
      ? { rejectUnauthorized: false }
      : undefined;
  return new Pool({ connectionString, ssl, max: 10, idleTimeoutMillis: 30_000 });
}

function getPool(): Pool {
  if (global.__pgPool) return global.__pgPool;

  const pool = createPool();
  if (process.env.NODE_ENV !== "production") global.__pgPool = pool;
  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  return getPool().query<T>(text, params as never[]);
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T | null> {
  const { rows } = await query<T>(text, params);
  return rows[0] ?? null;
}

export async function withTx<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const out = await fn(client);
    await client.query("COMMIT");
    return out;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
