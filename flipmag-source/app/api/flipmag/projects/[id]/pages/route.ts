import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { flipPages } from "@/db/schema";
import { ownedProject, requestEmail } from "@/lib/flipmag-server";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const email = await requestEmail(request);
  const { id } = await context.params;
  if (!email || !(await ownedProject(id, email))) return Response.json({ error: "Not found" }, { status: 404 });
  const body = await request.json() as { pages?: Array<{ pageNumber: number; title: string; imageKey: string; width: number; height: number; layout: "cover" | "spread" | "single" }> };
  if (!body.pages?.length) return Response.json({ error: "Pages are required" }, { status: 400 });
  const db = getDb();
  const values = body.pages.map((page) => ({ id: crypto.randomUUID(), projectId: id, ...page }));
  // D1 limits bound parameters, so each page is its own statement. `batch`
  // commits the delete and every insert atomically: a failed import can no
  // longer leave the project with zero pages.
  await db.batch([
    db.delete(flipPages).where(eq(flipPages.projectId, id)),
    ...values.map((value) => db.insert(flipPages).values(value)),
  ]);
  return Response.json({ ok: true, count: body.pages.length }, { status: 201 });
}
