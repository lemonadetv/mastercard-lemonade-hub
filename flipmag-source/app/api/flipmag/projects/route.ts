import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { flipPages, flipProjects, flipVersions } from "@/db/schema";
import { ensureBiJournal, requestEmail } from "@/lib/flipmag-server";
import { slugify } from "@/lib/flipmag";

export async function GET(request: Request) {
  const email = await requestEmail(request);
  if (!email) return Response.json({ error: "Sign in required" }, { status: 401 });
  await ensureBiJournal(email);
  const db = getDb();
  const projects = await db.select().from(flipProjects).where(eq(flipProjects.ownerEmail, email)).orderBy(desc(flipProjects.updatedAt));
  const enriched = await Promise.all(projects.map(async (project) => {
    const pages = await db.select({ id: flipPages.id }).from(flipPages).where(eq(flipPages.projectId, project.id));
    const versions = await db.select({ id: flipVersions.id }).from(flipVersions).where(eq(flipVersions.projectId, project.id));
    return { ...project, pageCount: pages.length, versionCount: versions.length };
  }));
  return Response.json({ projects: enriched });
}

export async function POST(request: Request) {
  const email = await requestEmail(request);
  if (!email) return Response.json({ error: "Sign in required" }, { status: 401 });
  const payload = await request.json() as { title?: string; slug?: string; description?: string };
  const title = payload.title?.trim() || "Untitled flipbook";
  let slug = slugify(payload.slug || title);
  const db = getDb();
  const [collision] = await db.select({ id: flipProjects.id }).from(flipProjects).where(eq(flipProjects.slug, slug)).limit(1);
  if (collision) slug = `${slug}-${Date.now().toString(36)}`;
  const now = new Date().toISOString();
  const project = { id: crypto.randomUUID(), ownerEmail: email, title, slug, description: payload.description?.trim() || "", status: "draft" as const, sourcePdfKey: null, publishedVersionId: null, createdAt: now, updatedAt: now, publishedAt: null };
  await db.insert(flipProjects).values(project);
  return Response.json({ project }, { status: 201 });
}
