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
  await db.delete(flipPages).where(eq(flipPages.projectId, id));
  const values = body.pages.map((page) => ({ id: crypto.randomUUID(), projectId: id, ...page }));
  // D1 limits the number of bound parameters in one statement. A magazine can
  // easily cross that limit even with only 16 pages, so keep each insert small.
  for (let offset = 0; offset < values.length; offset += 4) {
    await db.insert(flipPages).values(values.slice(offset, offset + 4));
  }
  return Response.json({ ok: true, count: body.pages.length }, { status: 201 });
}
