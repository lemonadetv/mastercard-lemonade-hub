import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const dashboard = await readFile(new URL("../app/flipmag/flipmag-dashboard.tsx", import.meta.url), "utf8");
const pagesRoute = await readFile(new URL("../app/api/flipmag/projects/[id]/pages/route.ts", import.meta.url), "utf8");

test("saves imported PDF pages in D1-safe batches", () => {
  assert.match(pagesRoute, /offset \+= 4/);
  assert.match(pagesRoute, /values\.slice\(offset, offset \+ 4\)/);
  assert.doesNotMatch(pagesRoute, /insert\(flipPages\)\.values\(body\.pages\.map/);
});

test("surfaces the server error when imported pages cannot be saved", () => {
  assert.match(dashboard, /const savedPages = await responseData\(savePages\)/);
  assert.match(dashboard, /savedPages\.error \|\| "Could not save rendered pages"/);
});
