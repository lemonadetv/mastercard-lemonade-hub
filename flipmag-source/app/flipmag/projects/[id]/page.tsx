import { requireFlipmagAdmin } from "@/lib/flipmag-auth";
import { FlipProjectEditor } from "./project-editor";

export default async function ProjectEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireFlipmagAdmin(`/pageflip/projects/${id}`);
  return <FlipProjectEditor projectId={id} />;
}
