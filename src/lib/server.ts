import { getCloudflareContext } from "@opennextjs/cloudflare";
import { buildContainer } from "../container";
import { AppError } from "../core/errors";
import { UnauthorizedError } from "../core/services/requireUser";

export function getContainer() {
  const { env } = getCloudflareContext();
  return buildContainer(env as unknown as Record<string, unknown>);
}

// One place that turns errors into safe responses.
export function errorResponse(e: unknown) {
  if (e instanceof UnauthorizedError) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (e instanceof AppError) {
    return Response.json({ error: e.message }, { status: e.status });
  }
  console.error(e); // full details stay in the server logs, not sent to the user
  return Response.json({ error: "Something went wrong" }, { status: 500 });
}