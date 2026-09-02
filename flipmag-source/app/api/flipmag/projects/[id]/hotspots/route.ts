import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { flipHotspots } from "@/db/schema";
import { ownedProject, requestEmail } from "@/lib/flipmag-server";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const email = await requestEmail(request);
  const { id: projectId } = await context.params;
  if (!email || !(await ownedProject(projectId, email))) return Response.json({ error: "Not found" }, { status: 404 });
  const body = await request.json() as Record<string, unknown>;
  const href = String(body.href || "").trim();
  if (!href) return Response.json({ error: "A URL or uploaded media file is required" }, { status: 400 });
  const id = typeof body.id === "string" ? body.id : crypto.randomUUID();
  const now = new Date().toISOString();
  const values = {
    id, projectId, pageNumber: Number(body.pageNumber),
    kind: body.kind === "audio" || body.kind === "video" ? body.kind : "link" as const,
    label: String(body.label || "Open"), href,
    x: Number(body.x), y: Number(body.y), width: Number(body.width), height: Number(body.height),
    animation: body.animation === "none" || body.animation === "pulse" || body.animation === "float" ? body.animation : "glow" as const,
    target: body.target === "_self" ? "_self" as const : "_blank" as const,
    createdAt: now, updatedAt: now,
  };
  const [hotspot] = await getDb().insert(flipHotspots).values(values).onConflictDoUpdate({ target: flipHotspots.id, set: { ...values, createdAt: undefined } }).returning();
  return Response.json({ hotspot }, { status: 201 });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const email = await requestEmail(request);
  const { id: projectId } = await context.params;
  if (!email || !(await ownedProject(projectId, email))) return Response.json({ error: "Not found" }, { status: 404 });
  const id = new URL(request.url).searchParams.get("hotspotId");
  if (!id) return Response.json({ error: "Missing hotspot id" }, { status: 400 });
  await getDb().delete(flipHotspots).where(and(eq(flipHotspots.id, id), eq(flipHotspots.projectId, projectId)));
  return Response.json({ ok: true });
}
