import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { flipProjects, flipVersions } from "@/db/schema";
import { ensureBiJournal, projectBundle } from "@/lib/flipmag-server";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  if (slug === "bi-journal-2026") {
    await ensureBiJournal(process.env.ADMIN_EMAIL ?? "rhhellbrugge@gmail.com");
  }
  const db = getDb();
  const [project] = await db.select().from(flipProjects).where(eq(flipProjects.slug, slug)).limit(1);
  if (!project || project.status !== "published") return Response.json({ error: "Not found" }, { status: 404 });
  if (project.publishedVersionId) {
    const [version] = await db.select().from(flipVersions).where(eq(flipVersions.id, project.publishedVersionId)).limit(1);
    if (version) return Response.json(JSON.parse(version.snapshotJson));
  }
  return Response.json(await projectBundle(project.id));
}
