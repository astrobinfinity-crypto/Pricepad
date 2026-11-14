import { notFound } from "next/navigation";
import { getContainer } from "../../../lib/server";
import { getPublishedList } from "../../../core/services/publish";
import PublicList from "./PublicList";

export const dynamic = "force-dynamic";

export default async function PublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const list = await getPublishedList(getContainer().cache, slug);
  if (!list) notFound();
  return <PublicList list={list} />;
}