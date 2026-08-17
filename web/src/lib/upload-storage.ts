import path from "node:path";

export type UploadStorageEnv = {
  VERCEL?: string;
  UPLOAD_DIR?: string;
  NODE_ENV?: string;
  [key: string]: string | undefined;
};

const runtimeEnv: UploadStorageEnv = {
  VERCEL: process.env.VERCEL,
  UPLOAD_DIR: process.env.UPLOAD_DIR,
  NODE_ENV: process.env.NODE_ENV,
};

export const CLINICAL_UPLOAD_STORAGE_UNAVAILABLE_MESSAGE =
  "Không thể tải tệp lâm sàng trên Vercel/serverless vì filesystem tại đây là tạm thời. Hãy dùng Docker với volume bền vững hoặc cấu hình object storage trước khi bật upload.";

export class UploadStorageUnavailableError extends Error {
  readonly code = "UPLOAD_STORAGE_UNAVAILABLE";

  constructor() {
    super(CLINICAL_UPLOAD_STORAGE_UNAVAILABLE_MESSAGE);
    this.name = "UploadStorageUnavailableError";
  }
}

export function isVercelRuntime(env: UploadStorageEnv = runtimeEnv): boolean {
  return env.VERCEL === "1";
}

export function assertUploadStorageAvailable(env: UploadStorageEnv = runtimeEnv): void {
  if (isVercelRuntime(env)) throw new UploadStorageUnavailableError();
}

export function getUploadStorageError(env: UploadStorageEnv = runtimeEnv): string | null {
  try {
    assertUploadStorageAvailable(env);
    return null;
  } catch (error) {
    if (error instanceof UploadStorageUnavailableError) return error.message;
    throw error;
  }
}

/**
 * Clinical files must live outside Next's public web root. Docker mounts the
 * named upload volume here; local development can override UPLOAD_DIR.
 */
export function getUploadDir(env: UploadStorageEnv = runtimeEnv): string {
  const configured = env.UPLOAD_DIR?.trim();
  return configured ? path.resolve(configured) : path.join(process.cwd(), "private", "uploads");
}
