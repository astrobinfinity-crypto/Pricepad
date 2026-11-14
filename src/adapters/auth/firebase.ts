import { createRemoteJWKSet, jwtVerify } from "jose";
import type { AuthPort } from "../../core/ports/auth";

const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
);

export function firebaseAuth(projectId: string): AuthPort {
  return {
    async verifyToken(token) {
      const { payload } = await jwtVerify(token, JWKS, {
        issuer: `https://securetoken.google.com/${projectId}`,
        audience: projectId,
        algorithms: ["RS256"],
      });
      if (!payload.sub) throw new Error("Invalid token");
      return {
        uid: payload.sub,
        email: typeof payload.email === "string" ? payload.email : undefined,
      };
    },
  };
}