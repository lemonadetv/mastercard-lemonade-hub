import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { flipHotspots, flipPages, flipProjects, flipVersions } from "@/db/schema";
import defaultHotspots from "@/public/default-hotspots.json";
import { isFlipmagAdminRequest } from "@/lib/flipmag-auth";

export async function requestEmail(request: Request) {
  if (!(await isFlipmagAdminRequest(request))) return null;
  return (process.env.ADMIN_EMAIL ?? "rhhellbrugge@gmail.com").toLowerCase();
}

export async function ownedProject(id: string, email: string) {
  const [project] = await getDb().select().from(flipProjects).where(and(eq(flipProjects.id, id), eq(flipProjects.ownerEmail, email))).limit(1);
  return project ?? null;
}

export async function projectBundle(id: string) {
  const db = getDb();
  const [project] = await db.select().from(flipProjects).where(eq(flipProjects.id, id)).limit(1);
  if (!project) return null;
  const [pages, hotspots, versions] = await Promise.all([
    db.select().from(flipPages).where(eq(flipPages.projectId, id)).orderBy(asc(flipPages.pageNumber)),
    db.select().from(flipHotspots).where(eq(flipHotspots.projectId, id)).orderBy(asc(flipHotspots.pageNumber)),
    db.select().from(flipVersions).where(eq(flipVersions.projectId, id)).orderBy(desc(flipVersions.versionNumber)),
  ]);
  return { project, pages, hotspots, versions };
}

export async function ensureBiJournal(email: string) {
  const db = getDb();
  const [existing] = await db.select().from(flipProjects).where(eq(flipProjects.slug, "bi-journal-2026")).limit(1);
  const id = existing?.id ?? crypto.randomUUID();
  const now = new Date().toISOString();
  const project = {
    id,
    ownerEmail: email,
    title: "Business Intelligence Journal / Agentic AI",
    slug: "bi-journal-2026",
    description: "Master template for every Page Flip Builder project.",
    status: "published" as const,
    sourcePdfKey: null,
    publishedVersionId: null,
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
  };
  if (!existing) await db.insert(flipProjects).values(project);
  const titles = [
    "How Business Intelligence Is Shaping Agentic AI", "Inside the AI Edition", "The AI Revolution in Business Intelligence",
    "Ask Mastercard Intelligence", "Turning Data into Dialogue", "Driving Impact at Every Level", "Navigating the Agentic Era",
    "Strategic AI Use Cases", "Agentic AI: Redefining Banking & Commerce", "Consumers vs. Merchants", "The Future of Issuing",
    "The Innovation Frontier", "Dissecting AI's Brain", "Digital Safari TV", "Continue the Conversation", "Back Cover",
  ];
  const [firstPage] = await db.select({ id: flipPages.id }).from(flipPages).where(eq(flipPages.projectId, id)).limit(1);
  if (!firstPage) {
    const pageValues = titles.map((title, index) => ({
      id: crypto.randomUUID(), projectId: id, pageNumber: index + 1, title,
      imageKey: `static:/pages/page-${String(index + 1).padStart(2, "0")}.webp`,
      width: index === 0 || index === titles.length - 1 ? 1200 : 2400,
      height: 1600,
      layout: index === 0 || index === titles.length - 1 ? "cover" as const : "spread" as const,
    }));
    for (let offset = 0; offset < pageValues.length; offset += 4) {
      await db.insert(flipPages).values(pageValues.slice(offset, offset + 4));
    }
  }
  const [firstHotspot] = await db.select({ id: flipHotspots.id }).from(flipHotspots).where(eq(flipHotspots.projectId, id)).limit(1);
  if (!firstHotspot) {
    const hotspotValues = defaultHotspots.map((spot) => ({
      id: `bi-${spot.id}`, projectId: id, pageNumber: spot.page, kind: "link" as const,
      label: spot.label, href: spot.href, x: spot.x, y: spot.y, width: spot.w, height: spot.h,
      animation: spot.animation as "none" | "pulse" | "glow" | "float", target: spot.target as "_blank" | "_self",
    }));
    for (let offset = 0; offset < hotspotValues.length; offset += 3) {
      await db.insert(flipHotspots).values(hotspotValues.slice(offset, offset + 3));
    }
  }
  return existing ?? project;
}
