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
  assert.match(reader, /onPointerDown=\{protectHotspot\}/);
  assert.match(reader, /onMouseDown=\{protectHotspot\}/);
  assert.match(reader, /onTouchStart=\{protectHotspot\}/);
  assert.doesNotMatch(reader, /onPointerDownCapture=\{protectHotspot\}/);
  assert.match(reader, /className=\{`book-scroll/);
  assert.match(reader, /onPointerDown=\{\(event\) => \{/);
  assert.match(reader, /onClick=\{openHotspotLink\}/);
  assert.doesNotMatch(reader, /window\.open\(hotspot\.href/);
  assert.match(css, /\.page-hotspot > \*\s*\{\s*pointer-events: none;/);
  assert.match(css, /\.active-page-hotspots\s*\{[^}]*z-index: 1000;/s);
  assert.match(css, /\.book-scroll\.is-pannable \.page-hotspot\s*\{[^}]*cursor: pointer !important;/s);
});

test("keeps click-to-turn on free page areas", () => {
  assert.match(reader, /event\.clientX < rect\.left \+ rect\.width \/ 2\) previous\(\)/);
  assert.match(reader, /else next\(\)/);
});

test("moves arrows to the next complete editorial spread", () => {
  assert.match(reader, /page === 1 && nextPage === 2\) controller\?\.flipNext/);
  assert.match(reader, /page === 2 && nextPage === 1\) controller\?\.flipPrev/);
  assert.match(reader, /controller\?\.flip\(physicalIndexForSource\(nextPage\), "top"\)/);
});
