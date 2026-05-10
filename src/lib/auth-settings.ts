import { queryOne } from "./db";
import { isMockMode, siteContentValue } from "./mock-store";

const REQUIRE_DEVICE_CONFIRM_KEY = "auth.requireDeviceConfirm";

export async function getRequireDeviceConfirm(): Promise<boolean> {
  if (isMockMode()) {
    const raw = siteContentValue(REQUIRE_DEVICE_CONFIRM_KEY)?.json;
    return readEnabled(raw);
  }
  const row = await queryOne<{ json: unknown }>(
    `SELECT value_json AS "json" FROM site_content WHERE content_key = $1`,
    [REQUIRE_DEVICE_CONFIRM_KEY],
  );
  return readEnabled(row?.json);
}

function readEnabled(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const value = (raw as { enabled?: unknown }).enabled;
  return value === true;
}
