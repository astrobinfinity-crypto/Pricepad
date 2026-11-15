import { requireUser } from "../../../../../core/services/requireUser";
import { mapInput, suggestMapping } from "../../../../../core/services/importer";
import { errorResponse, getContainer } from "../../../../../lib/server";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const c = getContainer();
    const user = await requireUser(req, c);
    const body = await req.json().catch(() => null);
    const parsed = mapInput.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }
    return Response.json(await suggestMapping(c, user.userId, id, parsed.data));
  } catch (e) {
    return errorResponse(e);
  }
}