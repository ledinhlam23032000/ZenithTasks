import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createOAuthAttemptValues,
  decryptChannelSecret,
  encryptChannelSecret,
} from "../crypto";

const TEST_KEY = Buffer.from(Array.from({ length: 32 }, (_, i) => i + 1)).toString("base64");
const OTHER_KEY = Buffer.from(Array.from({ length: 32 }, (_, i) => 255 - i)).toString("base64");
let previousKey: string | undefined;

beforeEach(() => {
  previousKey = process.env.CHANNEL_TOKEN_ENC_KEY;
  process.env.CHANNEL_TOKEN_ENC_KEY = TEST_KEY;
});

afterEach(() => {
  if (previousKey === undefined) delete process.env.CHANNEL_TOKEN_ENC_KEY;
  else process.env.CHANNEL_TOKEN_ENC_KEY = previousKey;
});

describe("channel secret encryption", () => {
  it("round-trips in a versioned envelope without plaintext", () => {
    const encrypted = encryptChannelSecret("access-token-123");

    expect(encrypted).toMatch(/^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    expect(encrypted).not.toContain("access-token-123");
    expect(decryptChannelSecret(encrypted)).toBe("access-token-123");
  });

  it("fails closed for the wrong key and tampered ciphertext", () => {
    const encrypted = encryptChannelSecret("refresh-token-456");
    const parts = encrypted.split(".");
    const ciphertext = Buffer.from(parts[3], "base64url");
    ciphertext[0] ^= 1;
    const tampered = [...parts.slice(0, 3), ciphertext.toString("base64url")].join(".");

    expect(() => decryptChannelSecret(tampered)).toThrow();
    process.env.CHANNEL_TOKEN_ENC_KEY = OTHER_KEY;
    expect(() => decryptChannelSecret(encrypted)).toThrow();
  });

  it("rejects a missing or non-256-bit encryption key", () => {
    delete process.env.CHANNEL_TOKEN_ENC_KEY;
    expect(() => encryptChannelSecret("secret")).toThrow(/CHANNEL_TOKEN_ENC_KEY/);

    process.env.CHANNEL_TOKEN_ENC_KEY = Buffer.alloc(16).toString("base64");
    expect(() => encryptChannelSecret("secret")).toThrow(/32 byte/);
  });
});

describe("OAuth attempt values", () => {
  it("creates matching state hash, PKCE challenge and encrypted verifier", () => {
    const values = createOAuthAttemptValues();

    expect(values.stateHash).toBe(createHash("sha256").update(values.state).digest("hex"));
    expect(values.challenge).toBe(createHash("sha256").update(values.verifier).digest("base64url"));
    expect(decryptChannelSecret(values.verifierEnc)).toBe(values.verifier);
    expect(values.state).not.toBe(values.verifier);
  });
});
