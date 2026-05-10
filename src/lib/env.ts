// Runtime env validation. Imported once from src/lib/db at boot so missing
// production secrets surface as a hard failure rather than silent 500s.
//
// Required only in production. In dev / mock mode, missing values fall back to
// sane defaults (or mock-mode behavior, in the case of DATABASE_URL).

import { z } from "zod";

// Treat empty strings as undefined — process.env values are always strings
// and "" should mean "not set" rather than "set to empty".
const optionalString = z.preprocess(
  (v) => (typeof v === "string" && v.length === 0 ? undefined : v),
  z.string().optional(),
);
const optionalUrl = z.preprocess(
  (v) => (typeof v === "string" && v.length === 0 ? undefined : v),
  z.string().url().optional(),
);

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: optionalString,
  JWT_SECRET: optionalString,
  BLOB_READ_WRITE_TOKEN: optionalString,
  RESEND_API_KEY: optionalString,
  NEXT_PUBLIC_SITE_URL: optionalUrl,
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.warn("[env] Some env vars failed validation:", parsed.error.flatten().fieldErrors);
}

const env = parsed.success ? parsed.data : ({} as z.infer<typeof schema>);

// Soft warnings only — never throw at module load. The build phase
// (`next build`) evaluates module code without runtime env, so throwing here
// breaks deploys. Runtime guards in db.ts / auth.ts handle the must-have vars.
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
if (env.NODE_ENV === "production" && !isBuildPhase) {
  const missing: string[] = [];
  if (!env.DATABASE_URL) missing.push("DATABASE_URL");
  if (!env.JWT_SECRET) missing.push("JWT_SECRET");
  if (!env.BLOB_READ_WRITE_TOKEN) missing.push("BLOB_READ_WRITE_TOKEN");
  if (!env.NEXT_PUBLIC_SITE_URL) missing.push("NEXT_PUBLIC_SITE_URL");
  // JWT_SECRET is non-negotiable in production: forging sessions becomes
  // trivial without a strong signing key. Fail fast at module load.
  if (!env.JWT_SECRET || env.JWT_SECRET === "dev-only-change-me" || env.JWT_SECRET.length < 32) {
    throw new Error(
      "[env] JWT_SECRET must be set to a strong random value (>=32 chars) in production",
    );
  }
  if (missing.length > 0) {
    console.warn("[env] Missing in production:", missing.join(", "));
  }
}

export { env };
