import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
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

test("loads PDF.js decoders needed to preserve complete page artwork", async () => {
  assert.match(dashboard, /wasmUrl: "\/pdfjs\/wasm\/"/);
  assert.match(dashboard, /iccUrl: "\/pdfjs\/iccs\/"/);
  assert.match(dashboard, /cMapUrl: "\/pdfjs\/cmaps\/"/);
  assert.match(dashboard, /standardFontDataUrl: "\/pdfjs\/standard_fonts\/"/);
  assert.match(dashboard, /isImageDecoderSupported: false/);
  assert.match(dashboard, /isOffscreenCanvasSupported: false/);
  assert.match(dashboard, /canvas\.width = 1/);
  assert.match(dashboard, /await pdf\.cleanup\(\)/);
  await access(new URL("../public/pdfjs/wasm/openjpeg.wasm", import.meta.url));
  await access(new URL("../public/pdfjs/wasm/qcms_bg.wasm", import.meta.url));
  await access(new URL("../public/pdfjs/iccs/CGATS001Compat-v2-micro.icc", import.meta.url));
});
