import { requireUser } from "../../../core/services/requireUser";
import { getPlanFor } from "../../../core/policy";
import { errorResponse, getContainer } from "../../../lib/server";

export async function GET(req: Request) {
  try {
    const c = getContainer();
    const user = await requireUser(req, c);
    const plan = await getPlanFor(c.db, user.userId);
    return Response.json({
      userId: user.userId,
      email: user.email,
      plan: plan.name,
      planUntil: plan.name === "free" ? null : plan.until,
    });
  } catch (e) {
    return errorResponse(e);
  }
}