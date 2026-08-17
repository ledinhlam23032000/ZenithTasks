import { describe, expect, it } from "vitest";
import path from "node:path";
import { assertUploadStorageAvailable, getUploadDir, getUploadStorageError, isVercelRuntime } from "../upload-storage";

describe("upload storage runtime guard", () => {
  it("recognizes a Vercel runtime", () => {
    expect(isVercelRuntime({ NODE_ENV: "test", VERCEL: "1" })).toBe(true);
  });

  it("does not classify Docker/local storage as ephemeral", () => {
    const env = { NODE_ENV: "test", UPLOAD_DIR: "/app/private/uploads" };
    expect(isVercelRuntime(env)).toBe(false);
    expect(() => assertUploadStorageAvailable(env)).not.toThrow();
    expect(getUploadDir(env)).toBe(path.resolve("/app/private/uploads"));
  });

  it("rejects clinical filesystem writes on Vercel with a clear error", () => {
    const env = { NODE_ENV: "test", VERCEL: "1", UPLOAD_DIR: "/tmp/uploads" };
    expect(() => assertUploadStorageAvailable(env)).toThrowError(
      /tệp lâm sàng.*Vercel\/serverless.*tạm thời/i,
    );
    expect(getUploadStorageError(env)).toMatch(/tệp lâm sàng.*Vercel\/serverless.*tạm thời/i);
  });
});
