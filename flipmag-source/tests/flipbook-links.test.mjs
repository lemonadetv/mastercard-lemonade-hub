import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const reader = await readFile(new URL("../components/flipbook/flipbook.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
const hotspots = JSON.parse(await readFile(new URL("../public/default-hotspots.json", import.meta.url), "utf8"));

test("keeps every PDF link in the published reader", () => {
  assert.equal(hotspots.length, 59);
  assert.ok(hotspots.every((hotspot) => hotspot.href && hotspot.kind === "link"));
  assert.ok(hotspots.some((hotspot) => hotspot.x + hotspot.w > 0.95));
});

test("protects hotspot clicks from the page-turn gesture", () => {
  assert.match(reader, /className="active-page-hotspots"/);
  assert.match(reader, /hotspot\.page === page/);
  assert.match(reader, /side="single"/);
  assert.doesNotMatch(reader, /hotspots=\{hotspots\.filter/);
  assert.match(reader, /showPageCorners\s/);
  assert.match(reader, /disableFlipByClick\s/);
  assert.match(reader, /closest\("\.page-hotspot"\)/);
  assert.match(reader, /onPointerDownCapture=\{protectHotspot\}/);
  assert.match(reader, /onMouseDownCapture=\{protectHotspot\}/);
  assert.match(reader, /onTouchStartCapture=\{protectHotspot\}/);
  assert.match(reader, /onClick=\{openHotspotLink\}/);
  assert.doesNotMatch(reader, /window\.open\(hotspot\.href/);
  assert.match(css, /\.page-hotspot > \*\s*\{\s*pointer-events: none;/);
  assert.match(css, /\.active-page-hotspots\s*\{[^}]*z-index: 1000;/s);
});

test("keeps click-to-turn on free page areas", () => {
  assert.match(reader, /event\.clientX < rect\.left \+ rect\.width \/ 2\) previous\(\)/);
  assert.match(reader, /else next\(\)/);
});
