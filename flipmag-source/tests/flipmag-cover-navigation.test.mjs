import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const reader = await readFile(new URL("../components/flipmag/dynamic-flip-reader.tsx", import.meta.url), "utf8");
const exporter = await readFile(new URL("../lib/export-flip-project.ts", import.meta.url), "utf8");
const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

test("navigates every adjacent page through its physical spread index", () => {
  assert.match(reader, /controller\?\.flip\(indexForSource\(next\), "top"\)/);
  assert.doesNotMatch(reader, /sourcePage === first && next === second/);
  assert.doesNotMatch(reader, /sourcePage === second && next === first/);
  assert.match(exporter, /flip\.flip\(physicalIndex\(next\.pageNumber\),'top'\)/);
});

test("centers front and back covers during both transition directions", () => {
  assert.match(reader, /activePage === firstPage \? "is-front-cover"/);
  assert.match(reader, /activePage === lastPage \? "is-back-cover"/);
  assert.match(css, /\.dynamic-book\.is-front-cover\{transform:translateX\(-25%\)\}/);
  assert.match(css, /\.dynamic-book\.is-back-cover\{transform:translateX\(25%\)\}/);
  assert.match(exporter, /book\.classList\.toggle\('is-front-cover',i===0\)/);
  assert.match(exporter, /book\.classList\.toggle\('is-back-cover',i===PAGES\.length-1\)/);
});
