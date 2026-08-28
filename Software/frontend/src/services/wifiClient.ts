import { parseBlePayload, type ParsedBleReading } from "./bleParser";

/** ESP32 SoftAP default gateway. Phone must join SSID PPH-MAT-04 first. */
export const WIFI_DEFAULT_HOST = "192.168.4.1";
export const WIFI_SSID = "PPH-MAT-04";
export const WIFI_PASSWORD = "pphmat04";

export function normalizeHost(host: string): string {
  return host
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "");
}

export function readingUrl(host: string): string {
  return `http://${normalizeHost(host)}/reading`;
}

export async function fetchMatReading(
  host: string,
  timeoutMs = 2500,
): Promise<ParsedBleReading | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(readingUrl(host), { signal: ctrl.signal });
    if (!res.ok) {
      return null;
    }
    const text = await res.text();
    return parseBlePayload(text);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
