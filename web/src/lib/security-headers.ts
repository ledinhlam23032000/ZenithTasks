import { randomBytes } from "node:crypto";

/** Generate a fresh nonce for every HTML response that runs application scripts. */
export function createCspNonce(): string {
  return randomBytes(16).toString("base64url");
}

/**
 * Keep the CSP in one place so the proxy and tests cannot silently drift.
 * Inline styles remain allowed for the current UI stack; executable inline
 * scripts must carry the response nonce.
 */
export function buildContentSecurityPolicy(nonce: string): string {
  const safeNonce = nonce.replace(/[^A-Za-z0-9_-]/g, "");
  if (!safeNonce) throw new Error("CSP nonce is required");

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${safeNonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
  ].join("; ");
}
