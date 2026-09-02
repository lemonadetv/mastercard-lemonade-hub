import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const dashboard = await readFile(new URL("../app/flipmag/flipmag-dashboard.tsx", import.meta.url), "utf8");
const editor = await readFile(new URL("../app/flipmag/projects/[id]/project-editor.tsx", import.meta.url), "utf8");
const auth = await readFile(new URL("../lib/flipmag-auth.ts", import.meta.url), "utf8");

test("uses the mastercard.lemonade-us.com pageflip route as canonical output", () => {
  assert.match(editor, /https:\/\/mastercard\.lemonade-us\.com\/pageflip\/\$\{bundle\.project\.slug\}/);
  assert.match(dashboard, /router\.push\(`\/pageflip\/projects\/\$\{projectId\}`\)/);
  assert.match(auth, /redirect\(`\/pageflip\/login/);
});
