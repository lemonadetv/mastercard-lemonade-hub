import { DynamicFlipReader } from "@/components/flipmag/dynamic-flip-reader";
import { Flipbook } from "@/components/flipbook/flipbook";

export default async function PublicFlipPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug === "bi-journal-2026") return <Flipbook />;
  return <DynamicFlipReader slug={slug} />;
}
