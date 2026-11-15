import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number
) => Promise<Buffer>;

const KEY_LENGTH = 64;
const PREFIX = "scrypt";

/** Hash a plaintext password with a per-user random salt. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, KEY_LENGTH);
  return `${PREFIX}$${salt}$${derived.toString("hex")}`;
}

/** Constant-time verification of a plaintext password against a stored hash. */
export async function verifyPassword(password: string, storedHash: string | null | undefined): Promise<boolean> {
  if (!storedHash) return false;

  const [prefix, salt, expected] = storedHash.split("$");
  if (prefix !== PREFIX || !salt || !expected) return false;

  try {
    const expectedBuffer = Buffer.from(expected, "hex");
    const derived = await scrypt(password, salt, expectedBuffer.length);
    return derived.length === expectedBuffer.length && timingSafeEqual(derived, expectedBuffer);
  } catch {
    return false;
  }
}
