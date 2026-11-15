import { createHmac, timingSafeEqual } from "node:crypto";

export interface JwtPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
}

const HEADER = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");

function base64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function signature(data: string, secret: string): string {
  return createHmac("sha256", secret).update(data).digest("base64url");
}

/** Sign a compact HS256 JWT for the given subject. */
export function signJwt(input: { sub: string; email: string }, secret: string, ttlSeconds: number): string {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload: JwtPayload = {
    sub: input.sub,
    email: input.email,
    iat: issuedAt,
    exp: issuedAt + ttlSeconds
  };

  const body = `${HEADER}.${base64Url(JSON.stringify(payload))}`;
  return `${body}.${signature(body, secret)}`;
}

/** Verify signature and expiry. Returns null for any invalid token. */
export function verifyJwt(token: string, secret: string): JwtPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [header, payload, providedSignature] = parts;
  const expectedSignature = signature(`${header}.${payload}`, secret);
  const providedBuffer = Buffer.from(providedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (providedBuffer.length !== expectedBuffer.length || !timingSafeEqual(providedBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<JwtPayload>;

    if (typeof decoded.sub !== "string" || typeof decoded.exp !== "number") return null;
    if (decoded.exp * 1000 <= Date.now()) return null;

    return {
      sub: decoded.sub,
      email: typeof decoded.email === "string" ? decoded.email : "",
      iat: typeof decoded.iat === "number" ? decoded.iat : 0,
      exp: decoded.exp
    };
  } catch {
    return null;
  }
}
