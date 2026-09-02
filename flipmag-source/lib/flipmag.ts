export type FlipProject = {
  id: string;
  ownerEmail: string;
  title: string;
  slug: string;
  description: string;
  status: "draft" | "published";
  sourcePdfKey: string | null;
  publishedVersionId: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

export type FlipPage = {
  id: string;
  projectId: string;
  pageNumber: number;
  title: string;
  imageKey: string;
  width: number;
  height: number;
  layout: "cover" | "spread" | "single";
};

export type FlipHotspot = {
  id: string;
  projectId: string;
  pageNumber: number;
  kind: "link" | "audio" | "video";
  label: string;
  href: string;
  x: number;
  y: number;
  width: number;
  height: number;
  animation: "none" | "pulse" | "glow" | "float";
  target: "_blank" | "_self";
};

export function assetUrl(key: string) {
  return key.startsWith("static:")
    ? key.slice(7)
    : `/api/flipmag/assets?key=${encodeURIComponent(key)}`;
}

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64) || `flip-${Date.now()}`;
}
