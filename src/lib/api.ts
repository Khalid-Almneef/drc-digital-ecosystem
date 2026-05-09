import { NextResponse } from "next/server";
import { ZodError, ZodSchema } from "zod";
import { HttpError } from "./auth";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

export function err(status: number, message: string, code?: string) {
  return NextResponse.json({ error: { message, code: code ?? "error" } }, { status });
}

export async function parseBody<T>(req: Request, schema: ZodSchema<T>): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new HttpError(400, "Invalid JSON");
  }
  const r = schema.safeParse(body);
  if (!r.success) throw new HttpError(400, flattenZod(r.error));
  return r.data;
}

export function parseQuery<T>(url: URL, schema: ZodSchema<T>): T {
  const raw = Object.fromEntries(url.searchParams.entries());
  const r = schema.safeParse(raw);
  if (!r.success) throw new HttpError(400, flattenZod(r.error));
  return r.data;
}

function flattenZod(e: ZodError): string {
  return e.issues.map((i) => `${i.path.join(".") || "_"}: ${i.message}`).join("; ");
}

export function handle(fn: (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>) {
  return async (req: Request, ctx: { params: Promise<Record<string, string>> }) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof HttpError) return err(e.status, e.message, e.code);
      console.error("API error:", e);
      return err(500, "Internal server error", "internal");
    }
  };
}
