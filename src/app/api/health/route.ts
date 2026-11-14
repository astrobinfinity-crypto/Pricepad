import { getCloudflareContext } from "@opennextjs/cloudflare";
import { buildContainer } from "../../../container";

export async function GET() {
  const { env } = getCloudflareContext();
  const c = buildContainer(env as unknown as Record<string, unknown>);
  return Response.json({
    ok: true,
    aiProvider: c.config.AI_PROVIDER,
    aiModel: c.config.AI_MODEL,
  });
}