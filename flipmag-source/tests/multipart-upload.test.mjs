import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const dashboard = await readFile(new URL("../app/flipmag/flipmag-dashboard.tsx", import.meta.url), "utf8");
const route = await readFile(new URL("../app/api/flipmag/assets/multipart/route.ts", import.meta.url), "utf8");

test("uploads source PDFs in request-safe R2 multipart chunks", () => {
  assert.match(dashboard, /const partSize = 5 \* 1024 \* 1024/);
  assert.match(dashboard, /file\.slice\(/);
  assert.match(dashboard, /action=create/);
  assert.match(dashboard, /action=upload/);
  assert.match(dashboard, /action=complete/);
  assert.match(dashboard, /action=abort/);
  assert.match(route, /createMultipartUpload/);
  assert.match(route, /uploadPart\(partNumber, request\.body\)/);
  assert.match(route, /\.complete\(parts\)/);
  assert.match(route, /\.abort\(\)/);
});

test("reports non-JSON upload errors without throwing a JSON parser message", () => {
  assert.match(dashboard, /const text = await response\.text\(\)/);
  assert.match(dashboard, /const data = await responseData\(response\)/);
  assert.doesNotMatch(dashboard, /Unexpected token/);
});
