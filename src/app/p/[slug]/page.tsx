import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getContainer } from "../../../lib/server";
import { getPublicEntry, viewOf } from "../../../core/services/publish";
import { accessCookieName, getPrivateSnapshot } from "../../../core/services/access";
import PublicList from "./PublicList";
import PinGate from "./PinGate";

export const dynamic = "force-dynamic";

export default async function PublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = getContainer();

  const entry = await getPublicEntry(c.cache, slug);
  if (!entry) notFound();
  if (!("locked" in entry)) return <PublicList list={viewOf(entry)} />;

  // PIN-protected: show items only if the visitor holds a valid access cookie.
  const token = (await cookies()).get(accessCookieName(slug))?.value;
  const secret = c.config.ACCESS_SECRET;
  const snapshot = token && secret ? await getPrivateSnapshot(c.cache, secret, slug, token) : null;
  if (snapshot) return <PublicList list={viewOf(snapshot)} />;

  return <PinGate slug={slug} title={entry.title} />;
}