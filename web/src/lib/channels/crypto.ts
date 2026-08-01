import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const ENVELOPE_VERSION = "v1";
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;

function channelEncryptionKey(): Buffer {
  const encoded = process.env.CHANNEL_TOKEN_ENC_KEY;
  if (!encoded) {
    throw new Error("Thiếu biến môi trường CHANNEL_TOKEN_ENC_KEY.");
  }

  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) {
    throw new Error("CHANNEL_TOKEN_ENC_KEY phải là khóa 32 byte mã hóa base64.");
  }
  return key;
}

function decodeEnvelopePart(value: string, label: string): Buffer {
  if (!value || !/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error(`Bản mã token không hợp lệ (${label}).`);
  }
  return Buffer.from(value, "base64url");
}

export function encryptChannelSecret(plain: string): string {
  if (!plain) throw new Error("Không thể mã hóa token rỗng.");

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", channelEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    ENVELOPE_VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptChannelSecret(value: string): string {
  const parts = value.split(".");
  if (parts.length !== 4 || parts[0] !== ENVELOPE_VERSION) {
    throw new Error("Phiên bản bản mã token không hợp lệ.");
  }

  const iv = decodeEnvelopePart(parts[1], "iv");
  const tag = decodeEnvelopePart(parts[2], "tag");
  const ciphertext = decodeEnvelopePart(parts[3], "ciphertext");
  if (iv.length !== IV_BYTES || tag.length !== AUTH_TAG_BYTES) {
    throw new Error("Cấu trúc bản mã token không hợp lệ.");
  }

  const decipher = createDecipheriv("aes-256-gcm", channelEncryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

export function createOAuthAttemptValues(): {
  state: string;
  stateHash: string;
  verifier: string;
  verifierEnc: string;
  challenge: string;
} {
  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");

  return {
    state,
    stateHash: createHash("sha256").update(state).digest("hex"),
    verifier,
    verifierEnc: encryptChannelSecret(verifier),
    challenge: createHash("sha256").update(verifier).digest("base64url"),
  };
}
