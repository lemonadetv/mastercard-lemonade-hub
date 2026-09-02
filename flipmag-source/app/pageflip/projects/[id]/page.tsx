import { requireFlipmagAdmin } from "@/lib/flipmag-auth";
import { FlipProjectEditor } from "../../../flipmag/projects/[id]/project-editor";

export default async function PageFlipProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireFlipmagAdmin(`/pageflip/projects/${id}`);
  return <FlipProjectEditor projectId={id} />;
}
