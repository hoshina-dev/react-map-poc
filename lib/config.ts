/**
 * Application-level configuration helpers.
 * Centralizes access to NEXT_PUBLIC_* env vars used by client code.
 */

export function getBasePath(): string {
  return process.env.NEXT_PUBLIC_BASE_PATH || "";
}

export const ASSET_PREFIX = getBasePath();
