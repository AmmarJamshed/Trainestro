import { cookies } from "next/headers";
import { createHash, timingSafeEqual } from "crypto";

const COOKIE = "trainestro_admin";

function hashPassword(password: string) {
  return createHash("sha256").update(`trainestro:${password}`).digest("hex");
}

export function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || "trainestro-admin";
}

export function createAdminToken(password: string) {
  return hashPassword(password);
}

export async function isAdminAuthenticated() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return false;
  const expected = Buffer.from(createAdminToken(getAdminPassword()));
  const actual = Buffer.from(token);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

export { COOKIE as ADMIN_COOKIE };
