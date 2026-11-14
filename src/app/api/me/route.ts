import { getCloudflareContext } from "@opennextjs/cloudflare";
import { buildContainer } from "../../../container";
import { requireUser, UnauthorizedError } from "../../../core/services/requireUser";

export async function GET(req: Request) {
  const { env } = getCloudflareContext();
  const c = buildContainer(env as unknown as Record<string, unknown>);
  try {
    const user = await requireUser(req, c);
    return Response.json({ userId: user.userId, email: user.email });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }
}