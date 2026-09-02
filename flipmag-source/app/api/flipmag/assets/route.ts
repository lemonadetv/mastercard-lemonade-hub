import { requestEmail } from "@/lib/flipmag-server";
import { getBucket } from "@/db";

export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("key");
  if (!key) return new Response("Missing key", { status: 400 });
  const object = await getBucket()?.get(key);
  if (!object) return new Response("Not found", { status: 404 });
  return new Response(object.body, { headers: { "content-type": object.httpMetadata?.contentType || "application/octet-stream", "cache-control": "public, max-age=31536000, immutable" } });
}

export async function POST(request: Request) {
  const email = await requestEmail(request);
  if (!email) return Response.json({ error: "Sign in required" }, { status: 401 });
  const storage = getBucket();
  if (!storage) return Response.json({ error: "Media storage is unavailable" }, { status: 503 });
  const form = await request.formData();
  const file = form.get("file");
  const projectId = String(form.get("projectId") || "");
  const kind = String(form.get("kind") || "asset").replace(/[^a-z0-9-]/gi, "");
  if (!(file instanceof File) || !projectId) return Response.json({ error: "File and project are required" }, { status: 400 });
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const key = `flipmag/${projectId}/${kind}/${crypto.randomUUID()}-${safeName}`;
  await storage.put(key, file.stream(), { httpMetadata: { contentType: file.type || "application/octet-stream" } });
  return Response.json({ key, url: `/api/flipmag/assets?key=${encodeURIComponent(key)}` }, { status: 201 });
}
