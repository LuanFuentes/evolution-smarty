export const JID_REGEX = /^[0-9]+@s\.whatsapp\.net$/;

export const CATALOG_LIMIT_MIN = 1;
export const CATALOG_LIMIT_MAX = 500;
export const CATALOG_LIMIT_DEFAULT = 100;

export const COLLECTIONS_LIMIT_MIN = 1;
export const COLLECTIONS_LIMIT_MAX = 20;
export const COLLECTIONS_LIMIT_DEFAULT = 10;

export function parseAndValidateLimit(raw: unknown, bounds: { min: number; max: number; def: number }): number {
  if (raw === undefined || raw === null || raw === '') return bounds.def;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed)) {
    throw new Error(`"limit" must be an integer (got "${raw}")`);
  }
  if (parsed < bounds.min || parsed > bounds.max) {
    throw new Error(`"limit" must be between ${bounds.min} and ${bounds.max} (got ${parsed})`);
  }
  return parsed;
}

export function validateJid(raw: unknown): string {
  if (typeof raw !== 'string' || raw.length === 0) {
    throw new Error('"jid" query parameter is required');
  }
  if (!JID_REGEX.test(raw)) {
    throw new Error(`"jid" must match /^[0-9]+@s\\.whatsapp\\.net$/ (got "${raw}")`);
  }
  return raw;
}
