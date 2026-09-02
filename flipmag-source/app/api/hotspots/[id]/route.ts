import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { hotspots } from "@/db/schema";

function canEdit(request: Request) {
  const email = request.headers.get("oai-authenticated-user-email")?.toLowerCase();
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  return Boolean(email && adminEmail && email === adminEmail);
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!canEdit(request)) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }
  const { id } = await context.params;
  await getDb().delete(hotspots).where(eq(hotspots.id, id));
  return Response.json({ deleted: true });
}
