import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const hotspots = sqliteTable(
  "hotspots",
  {
    id: text("id").primaryKey(),
    page: integer("page").notNull(),
    x: real("x").notNull(),
    y: real("y").notNull(),
    width: real("width").notNull(),
    height: real("height").notNull(),
    href: text("href").notNull(),
    label: text("label").notNull().default("Open link"),
    kind: text("kind", { enum: ["link", "audio"] }).notNull().default("link"),
    animation: text("animation", {
      enum: ["none", "pulse", "glow", "float"],
    })
      .notNull()
      .default("none"),
    target: text("target", { enum: ["_blank", "_self"] })
      .notNull()
      .default("_blank"),
    createdBy: text("created_by").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("idx_hotspots_page").on(table.page)],
);

export const flipProjects = sqliteTable(
  "flip_projects",
  {
    id: text("id").primaryKey(),
    ownerEmail: text("owner_email").notNull(),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description").notNull().default(""),
    status: text("status", { enum: ["draft", "published"] }).notNull().default("draft"),
    sourcePdfKey: text("source_pdf_key"),
    publishedVersionId: text("published_version_id"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    publishedAt: text("published_at"),
  },
  (table) => [index("idx_flip_projects_owner").on(table.ownerEmail)],
);

export const flipPages = sqliteTable(
  "flip_pages",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull().references(() => flipProjects.id, { onDelete: "cascade" }),
    pageNumber: integer("page_number").notNull(),
    title: text("title").notNull().default("Untitled page"),
    imageKey: text("image_key").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    layout: text("layout", { enum: ["cover", "spread", "single"] }).notNull().default("single"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_flip_pages_project").on(table.projectId),
    index("idx_flip_pages_number").on(table.projectId, table.pageNumber),
  ],
);

export const flipHotspots = sqliteTable(
  "flip_hotspots",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull().references(() => flipProjects.id, { onDelete: "cascade" }),
    pageNumber: integer("page_number").notNull(),
    kind: text("kind", { enum: ["link", "audio", "video"] }).notNull().default("link"),
    label: text("label").notNull().default("Open"),
    href: text("href").notNull(),
    x: real("x").notNull(),
    y: real("y").notNull(),
    width: real("width").notNull(),
    height: real("height").notNull(),
    animation: text("animation", { enum: ["none", "pulse", "glow", "float"] }).notNull().default("glow"),
    target: text("target", { enum: ["_blank", "_self"] }).notNull().default("_blank"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("idx_flip_hotspots_project_page").on(table.projectId, table.pageNumber)],
);

export const flipVersions = sqliteTable(
  "flip_versions",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull().references(() => flipProjects.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    label: text("label").notNull(),
    snapshotJson: text("snapshot_json").notNull(),
    createdBy: text("created_by").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("idx_flip_versions_project").on(table.projectId, table.versionNumber)],
);
