import { requireUser } from "../../../core/services/requireUser";
import { createListForUser, createListInput } from "../../../core/services/lists";
import { errorResponse, getContainer } from "../../../lib/server";

export async function GET(req: Request) {
  try {
    const c = getContainer();
    const user = await requireUser(req, c);
    return Response.json(await c.db.listListsByOwner(user.userId));
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const c = getContainer();
    const user = await requireUser(req, c);
    const body = await req.json().catch(() => null);
    const parsed = createListInput.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }
    const list = await createListForUser(c.db, user.userId, parsed.data);
    return Response.json(list, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}