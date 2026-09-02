import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const reader = await readFile(new URL("../components/flipmag/dynamic-flip-reader.tsx", import.meta.url), "utf8");
const journal = await readFile(new URL("../components/flipbook/flipbook.tsx", import.meta.url), "utf8");
const exporter = await readFile(new URL("../lib/export-flip-project.ts", import.meta.url), "utf8");
const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

test("keeps online controls clickable at wide viewport sizes", () => {
  assert.match(css, /\.reader-side-nav\{position:fixed;inset:72px 0;z-index:2147483000;pointer-events:none\}/);
  assert.match(css, /\.reader-side-button\{[^}]*pointer-events:auto;[^}]*touch-action:manipulation/s);
  assert.match(css, /\.reader-side-button\.is-previous\{left:16px\}/);
  assert.match(css, /\.reader-side-button\.is-next\{right:16px\}/);
  assert.match(reader, /className="reader-side-nav dynamic-side-nav"/);
  assert.match(journal, /className="reader-side-nav journal-side-nav"/);
  assert.match(reader, /className="reader-side-button is-next"/);
  assert.match(journal, /className="reader-side-button is-next"/);
  assert.match(css, /\.dynamic-header\{position:relative;z-index:40/);
  assert.match(css, /\.dynamic-footer\{position:relative;z-index:40\}/);
  assert.match(css, /\.dynamic-scroll,\.dynamic-zoom\{position:relative;z-index:1;min-width:0\}/);
  assert.match(css, /\.reader-actions\{position:relative;z-index:50\}/);
  assert.match(reader, /showPageCorners=\{false\}/);
  assert.match(journal, /showPageCorners=\{false\}/);
  assert.match(exporter, /showPageCorners:false/);
  assert.match(reader, /disabled=\{!isFlipReady \|\| activePage === lastPage \|\| isFlipping\}/);
  assert.match(journal, /disabled=\{!isFlipReady \|\| page === PAGE_COUNT \|\| isFlipping\}/);
});

test("keeps button and drag navigation in one ordered flip state", () => {
  assert.match(reader, /navigationLocked\.current/);
  assert.match(journal, /navigationLockedRef\.current/);
  assert.match(reader, /renderOnlyPageLengthChange/);
  assert.match(journal, /renderOnlyPageLengthChange/);
  assert.match(reader, /event\.data === "flipping" \|\| event\.data === "user_fold"/);
  assert.match(journal, /event\.data === "flipping" \|\| event\.data === "user_fold"/);
  assert.match(exporter, /navLocked=e\.data!==\'read\'/);
  assert.doesNotMatch(exporter, /navigationFallback/);
});

test("shows magazine name and active title beside Mastercard", () => {
  assert.match(reader, /className="dynamic-brand"/);
  assert.match(reader, /<b>\{bundle\.project\.title\}<\/b>/);
  assert.match(reader, /<small>\{page\?\.title/);
  assert.match(exporter, /<div><b>\$\{title\}<\/b><small id="pageTitle">/);
  assert.match(journal, /Business Intelligence Journal \/ Agentic AI/);
  assert.match(journal, /<small>\{PAGE_TITLES\[page\]\}<\/small>/);
});

test("export has the same reader controls", () => {
  for (const control of ["pagesButton", "pagesPanel", "pageGrid", "zoomOut", "zoomIn", "full", "sound"]) {
    assert.match(exporter, new RegExp(`id=["']${control}["']`));
  }
  assert.match(exporter, /PAGES\.forEach\(\(p,index\)=>/);
  assert.match(exporter, /flip\.turnToPage\(physicalIndex\(p\.pageNumber\)\)/);
  assert.match(exporter, /<nav class="side-controls"/);
  assert.match(exporter, /\.side-controls\{position:fixed;[^}]*z-index:2147483000;[^}]*pointer-events:none/s);
  assert.match(exporter, /\.arrow\{[^}]*pointer-events:auto/s);
});

test("page-turn sound is available and can be disabled online and in exports", () => {
  assert.match(reader, /const \[turnSound, setTurnSound\] = useState\(true\)/);
  assert.match(reader, /playTurnSound\(\)/);
  assert.match(reader, /Turn page sound off/);
  assert.match(exporter, /function playTurnSound\(\)/);
  assert.match(exporter, /turnSound=!turnSound/);
  assert.match(exporter, /profiles=\[\{d:\.42/);
  assert.match(exporter, /soundVariant=\(soundVariant\+1\)%3/);
  assert.match(journal, /const \[turnSound, setTurnSound\] = useState\(true\)/);
  assert.match(journal, /soundPlayedRef\.current = true/);
  assert.match(journal, /soundVariantRef\.current = \(soundVariantRef\.current \+ 1\) % 3/);
});
