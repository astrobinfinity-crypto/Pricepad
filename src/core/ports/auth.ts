export type AuthUser = { uid: string; email?: string };

export interface AuthPort {
  /** Check a login token from the browser. Throws if invalid. */
  verifyToken(token: string): Promise<AuthUser>;
}