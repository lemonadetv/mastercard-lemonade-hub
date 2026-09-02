export type HotspotKind = "link" | "audio";
export type HotspotAnimation = "none" | "pulse" | "glow" | "float";

export type Hotspot = {
  id: string;
  page: number;
  x: number;
  y: number;
  w: number;
  h: number;
  href: string;
  label: string;
  kind: HotspotKind;
  animation: HotspotAnimation;
  target: "_blank" | "_self";
  source: "pdf" | "custom";
};

export const PAGE_COUNT = 16;

export const pageImage = (page: number) =>
  `/pages/page-${String(page).padStart(2, "0")}.webp`;

export const isSinglePage = (page: number) => page === 1 || page === PAGE_COUNT;
