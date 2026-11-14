import type { AuthPort } from "../ports/auth";
import type { DbPort } from "../ports/db";

export class UnauthorizedError extends Error {}

export async function requireUser(req: Request, c: { auth: AuthPort; db: DbPort }) {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw new UnauthorizedError();

  let user;
  try {
    user = await c.auth.verifyToken(token);
  } catch {
    throw new UnauthorizedError();
  }

  const userId = await c.db.upsertUser(user.uid, user.email);
  return { userId, uid: user.uid, email: user.email };
}