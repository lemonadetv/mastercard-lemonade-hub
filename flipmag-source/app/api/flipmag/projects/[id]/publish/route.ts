import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { flipProjects, flipVersions } from "@/db/schema";
import { ownedProject, projectBundle, requestEmail } from "@/lib/flipmag-server";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const email = await requestEmail(request);
  const { id } = await context.params;
  if (!email || !(await ownedProject(id, email))) return Response.json({ error: "Not found" }, { status: 404 });
  const bundle = await projectBundle(id);
  if (!bundle || !bundle.pages.length) return Response.json({ error: "Import at least one page before publishing" }, { status: 400 });
  const db = getDb();
  const [latest] = await db.select().from(flipVersions).where(eq(flipVersions.projectId, id)).orderBy(desc(flipVersions.versionNumber)).limit(1);
  const versionNumber = (latest?.versionNumber || 0) + 1;
  const versionId = crypto.randomUUID();
  const label = `Version ${versionNumber}`;
  const snapshot = JSON.stringify({ project: bundle.project, pages: bundle.pages, hotspots: bundle.hotspots });
  const now = new Date().toISOString();
  await db.insert(flipVersions).values({ id: versionId, projectId: id, versionNumber, label, snapshotJson: snapshot, createdBy: email, createdAt: now });
  await db.update(flipProjects).set({ status: "published", publishedVersionId: versionId, publishedAt: now, updatedAt: now }).where(eq(flipProjects.id, id));
  return Response.json({ ok: true, versionNumber, url: `/flipmag/view/${bundle.project.slug}` });
}
