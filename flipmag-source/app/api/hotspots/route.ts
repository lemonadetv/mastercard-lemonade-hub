import { asc } from "drizzle-orm";
import { getDb } from "@/db";
import { hotspots } from "@/db/schema";

function canEdit(request: Request) {
  const email = request.headers.get("oai-authenticated-user-email")?.toLowerCase();
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  return Boolean(email && adminEmail && email === adminEmail);
}

export async function GET() {
  try {
    const rows = await getDb().select().from(hotspots).orderBy(asc(hotspots.page));
    return Response.json({
      hotspots: rows.map((row) => ({
        id: row.id,
        page: row.page,
        x: row.x,
        y: row.y,
        w: row.width,
        h: row.height,
        href: row.href,
        label: row.label,
        kind: row.kind,
        animation: row.animation,
        target: row.target,
        source: "custom" as const,
      })),
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to load links" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!canEdit(request)) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  const payload = (await request.json()) as Record<string, unknown>;
  const id = typeof payload.id === "string" ? payload.id : crypto.randomUUID();
  const page = Number(payload.page);
  const href = typeof payload.href === "string" ? payload.href.trim() : "";

  if (!Number.isInteger(page) || page < 1 || page > 16 || !href) {
    return Response.json({ error: "Page and URL are required" }, { status: 400 });
  }

  const email = request.headers.get("oai-authenticated-user-email") ?? "";
  const values = {
    id,
    page,
    x: Number(payload.x),
    y: Number(payload.y),
    width: Number(payload.w),
    height: Number(payload.h),
    href,
    label:
      typeof payload.label === "string" && payload.label.trim()
        ? payload.label.trim()
        : "Open link",
    kind: payload.kind === "audio" ? ("audio" as const) : ("link" as const),
    animation:
      payload.animation === "pulse" ||
      payload.animation === "glow" ||
      payload.animation === "float"
        ? payload.animation
        : ("none" as const),
    target: payload.target === "_self" ? ("_self" as const) : ("_blank" as const),
    createdBy: email,
  };

  const [saved] = await getDb()
    .insert(hotspots)
    .values(values)
    .onConflictDoUpdate({
      target: hotspots.id,
      set: values,
    })
    .returning();

  return Response.json({ hotspot: saved }, { status: 201 });
}
