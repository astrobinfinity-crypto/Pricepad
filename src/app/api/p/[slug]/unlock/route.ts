import { AppError } from "../../../../../core/errors";
import { pinInput } from "../../../../../core/services/publish";
import { ACCESS_TTL_SECONDS, accessCookieName, unlockList } from "../../../../../core/services/access";
import { errorResponse, getContainer } from "../../../../../lib/server";

type Ctx = { params: Promise<{ slug: string }> };

export async function POST(req: Request, { params }: Ctx) {
  try {
    const { slug } = await params;
    const c = getContainer();
    const secret = c.config.ACCESS_SECRET;
    if (!secret) throw new AppError(500, "PIN lists are not set up on this server");

    const parsed = pinInput.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: "Wrong PIN" }, { status: 401 });

    const ip = req.headers.get("cf-connecting-ip") ?? "unknown";
    const token = await unlockList(c.cache, secret, slug, parsed.data.pin, ip);

    const secure = new URL(req.url).protocol === "https:";
    const cookie = [
      `${accessCookieName(slug)}=${token}`,
      `Path=/p/${slug}`,
      `Max-Age=${ACCESS_TTL_SECONDS}`,
      "HttpOnly",
      "SameSite=Lax",
      secure ? "Secure" : "",
    ]
      .filter(Boolean)
      .join("; ");

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json", "set-cookie": cookie },
    });
  } catch (e) {
    return errorResponse(e);
  }
}