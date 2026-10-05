// Development-only LAN backend configuration for self-hosted setups.
//
// Production and Replit builds keep HTTPS-only behaviour:
// - EXPO_PUBLIC_DOMAIN is always used as `https://<domain>` (see _layout.tsx
//   and dictionary.ts) and is never downgraded to HTTP.
// - EXPO_PUBLIC_DEV_BACKEND_URL is the only way to point a development build
//   at an HTTP backend (e.g. `http://192.168.1.85:8787`). It is meant to be
//   supplied on the Metro command line for local development; committed
//   builds leave it unset, so the production HTTPS protections, same-origin
//   pack check and dictionary checksum validation all stay intact.
//
// Never put model credentials in EXPO_PUBLIC_* variables — this value is a
// plain backend URL and nothing else.
const DEV_BACKEND_URL_ENV = 'EXPO_PUBLIC_DEV_BACKEND_URL';

export type DevBackend = {
  url: string;
  manifestUrl: string;
  isDevelopment: boolean;
};

export function getDevBackend(): DevBackend | null {
  const raw = process.env[DEV_BACKEND_URL_ENV]?.trim();
  if (!raw) return null;
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`${DEV_BACKEND_URL_ENV} must be a full URL (http:// or https://).`);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`${DEV_BACKEND_URL_ENV} must use http:// or https://.`);
  }
  const base = raw.replace(/\/+$/, '');
  return {
    url: base,
    manifestUrl: `${base}/api/dictionary/manifest`,
    isDevelopment: parsed.protocol === 'http:',
  };
}
