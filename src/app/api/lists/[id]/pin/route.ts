import { requireUser } from "../../../../../core/services/requireUser";
import { pinInput, setListPin } from "../../../../../core/services/publish";
import { errorResponse, getContainer } from "../../../../../lib/server";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const c = getContainer();
    const user = await requireUser(req, c);
    const parsed = pinInput.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return Response.json({ error: "PIN must be 6 to 12 digits" }, { status: 400 });
    }
    await setListPin(c, user.userId, id, parsed.data.pin);
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
    await setListPin(c, user.userId, id, null);
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}