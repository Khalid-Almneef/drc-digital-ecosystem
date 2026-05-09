const LEGACY_SITE_CONTENT_KEYS: Record<string, string[]> = {
  "home.stats": ["homepage.stats"],
};

const LEGACY_TO_CANONICAL_SITE_CONTENT_KEY = Object.entries(LEGACY_SITE_CONTENT_KEYS).reduce<Record<string, string>>(
  (acc, [canonicalKey, legacyKeys]) => {
    for (const legacyKey of legacyKeys) acc[legacyKey] = canonicalKey;
    return acc;
  },
  {},
);

export function normalizeSiteContentKey(key: string) {
  return LEGACY_TO_CANONICAL_SITE_CONTENT_KEY[key] ?? key;
}

export function getSiteContentKeyCandidates(key: string) {
  const canonicalKey = normalizeSiteContentKey(key);
  return [canonicalKey, ...(LEGACY_SITE_CONTENT_KEYS[canonicalKey] ?? [])];
}

