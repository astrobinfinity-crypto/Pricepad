// PIN hashing and signed access tokens, using the Web Crypto API built into Workers.
const enc = new TextEncoder();

// Workers allows at most 100,000 PBKDF2 iterations. The count is stored inside each hash,
// so we can change it later without breaking existing PINs.
const ITERATIONS = 100_000;

function toB64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64Url(s: string): Uint8Array {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

function safeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function derive(pin: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", enc.encode(pin) as BufferSource, "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    key,
    256
  );
  return new Uint8Array(bits);
}

/** Returns "pbkdf2$iterations$salt$hash". The PIN itself is never stored. */
export async function hashPin(pin: string): Promise<string> {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const hash = await derive(pin, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${toB64Url(salt)}$${toB64Url(hash)}`;
}

export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  const [scheme, iter, salt, hash] = stored.split("$");
  const iterations = Number(iter);
  if (scheme !== "pbkdf2" || !salt || !hash) return false;
  if (!Number.isInteger(iterations) || iterations < 1 || iterations > 100_000) return false;
  const actual = await derive(pin, fromB64Url(salt), iterations);
  return safeEqual(actual, fromB64Url(hash));
}

/** The random salt changes whenever the PIN changes, so we use it to cancel old access cookies. */
export const pinStamp = (stored: string) => stored.split("$")[2] ?? "";

async function hmacKey(secret: string) {
  return crypto.subtle.importKey("raw", enc.encode(secret) as BufferSource, { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

export async function signAccess(secret: string, slug: string, stamp: string, ttlSeconds: number): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const body = enc.encode(`${slug}|${stamp}|${exp}`);
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret), body as BufferSource);
  return `${toB64Url(body)}.${toB64Url(new Uint8Array(sig))}`;
}

export async function verifyAccess(secret: string, token: string, slug: string, stamp: string): Promise<boolean> {
  const [bodyB64, sigB64] = token.split(".");
  if (!bodyB64 || !sigB64) return false;
  try {
    const body = fromB64Url(bodyB64);
    const valid = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(secret),
      fromB64Url(sigB64) as BufferSource,
      body as BufferSource
    );
    if (!valid) return false;
    const [s, st, exp] = new TextDecoder().decode(body).split("|");
    return s === slug && st === stamp && Number(exp) > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}