import path from "node:path";

/**
 * Clinical files must live outside Next's public web root. Docker mounts the
 * named upload volume here; local development can override UPLOAD_DIR.
 */
export function getUploadDir(): string {
  const configured = process.env.UPLOAD_DIR?.trim();
  return configured ? path.resolve(configured) : path.join(process.cwd(), "private", "uploads");
}
