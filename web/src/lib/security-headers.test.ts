import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy, createCspNonce } from "./security-headers";

describe("content security policy", () => {
  it("uses a per-response script nonce without unsafe-inline", () => {
    const nonce = createCspNonce();
    const csp = buildContentSecurityPolicy(nonce);

    expect(nonce).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(csp).toContain(`script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`);
    expect(csp).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'self'");
  });
});
