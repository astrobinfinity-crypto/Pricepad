import { requireUser } from "../../../../../core/services/requireUser";
import { publishInput, publishList, unpublishList } from "../../../../../core/services/publish";
import { errorResponse, getContainer } from "../../../../../lib/server";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const c = getContainer();
    const user = await requireUser(req, c);
    const body = await req.json().catch(() => null);
    const parsed = publishInput.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Enter a valid WhatsApp number" }, { status: 400 });
    }
    await publishList(c, user.userId, id, parsed.data.whatsapp);
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const c = getContainer();
    const user = await requireUser(req, c);
    await unpublishList(c, user.userId, id);
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}