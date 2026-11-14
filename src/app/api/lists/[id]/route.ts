import { requireUser } from "../../../../core/services/requireUser";
import { getListWithItems, saveListForUser, saveListInput } from "../../../../core/services/items";
import { errorResponse, getContainer } from "../../../../lib/server";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const c = getContainer();
    const user = await requireUser(req, c);
    return Response.json(await getListWithItems(c.db, user.userId, id));
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PUT(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const c = getContainer();
    const user = await requireUser(req, c);
    const body = await req.json().catch(() => null);
    const parsed = saveListInput.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }
    await saveListForUser(c.db, user.userId, id, parsed.data);
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}