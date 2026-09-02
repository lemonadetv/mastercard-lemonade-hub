import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { flipHotspots, flipPages, flipProjects, flipVersions } from "@/db/schema";
import { ownedProject, projectBundle, requestEmail } from "@/lib/flipmag-server";
import { slugify } from "@/lib/flipmag";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const email = await requestEmail(request);
  const { id } = await context.params;
  if (!email || !(await ownedProject(id, email))) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(await projectBundle(id));
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const email = await requestEmail(request);
  const { id } = await context.params;
  if (!email || !(await ownedProject(id, email))) return Response.json({ error: "Not found" }, { status: 404 });
  const body = await request.json() as { title?: string; slug?: string; description?: string; sourcePdfKey?: string };
  const update = {
    ...(body.title ? { title: body.title.trim() } : {}),
    ...(body.slug ? { slug: slugify(body.slug) } : {}),
    ...(body.description !== undefined ? { description: body.description.trim() } : {}),
    ...(body.sourcePdfKey ? { sourcePdfKey: body.sourcePdfKey } : {}),
    updatedAt: new Date().toISOString(),
  };
  try {
    const [project] = await getDb().update(flipProjects).set(update).where(eq(flipProjects.id, id)).returning();
    return Response.json({ project });
  } catch {
    return Response.json({ error: "This URL slug is already in use." }, { status: 409 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const email = await requestEmail(request);
  const { id } = await context.params;
  if (!email || !(await ownedProject(id, email))) return Response.json({ error: "Not found" }, { status: 404 });
  const db = getDb();
  await db.delete(flipHotspots).where(eq(flipHotspots.projectId, id));
  await db.delete(flipPages).where(eq(flipPages.projectId, id));
  await db.delete(flipVersions).where(eq(flipVersions.projectId, id));
  await db.delete(flipProjects).where(eq(flipProjects.id, id));
  return Response.json({ ok: true });
}
