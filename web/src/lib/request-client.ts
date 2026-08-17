import { isIP } from "node:net";

type HeaderReader = { get(name: string): string | null };

/**
 * Only trust forwarding headers when the operator explicitly declares a
 * trusted reverse proxy. Otherwise a caller can spoof X-Forwarded-For and
 * bypass an IP-based limiter.
 */
export function clientIpFromHeaders(headers: HeaderReader): string {
  if (process.env.TRUSTED_PROXY !== "true") return "direct";
  const candidates = [
    headers.get("cf-connecting-ip"),
    headers.get("x-real-ip"),
    headers.get("x-forwarded-for")?.split(",")[0],
  ];
  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (value && isIP(value)) return value;
  }
  return "proxy-unknown";
}
