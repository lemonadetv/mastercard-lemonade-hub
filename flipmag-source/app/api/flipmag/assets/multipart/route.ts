import { getBucket, type UploadedPart } from "@/db";
import { requestEmail } from "@/lib/flipmag-server";

type CreatePayload = {
  projectId?: string;
  kind?: string;
  name?: string;
  contentType?: string;
};

type CompletePayload = {
  key?: string;
  uploadId?: string;
  parts?: UploadedPart[];
};

const safeKey = (key: string) => key.startsWith("flipmag/") && !key.includes("../");

export async function POST(request: Request) {
  const email = await requestEmail(request);
  if (!email) return Response.json({ error: "Sign in required" }, { status: 401 });
  const storage = getBucket();
  if (!storage) return Response.json({ error: "Media storage is unavailable" }, { status: 503 });

  const action = new URL(request.url).searchParams.get("action");
  if (action === "create") {
    const payload = await request.json() as CreatePayload;
    const projectId = String(payload.projectId || "").replace(/[^a-zA-Z0-9-]/g, "");
    const kind = String(payload.kind || "asset").replace(/[^a-z0-9-]/gi, "");
    const safeName = String(payload.name || "upload.bin").replace(/[^a-zA-Z0-9._-]/g, "-");
    if (!projectId) return Response.json({ error: "Project is required" }, { status: 400 });

    const key = `flipmag/${projectId}/${kind}/${crypto.randomUUID()}-${safeName}`;
    const upload = await storage.createMultipartUpload(key, {
      httpMetadata: { contentType: payload.contentType || "application/octet-stream" },
    });
    return Response.json({
      key: upload.key,
      uploadId: upload.uploadId,
      url: `/api/flipmag/assets?key=${encodeURIComponent(upload.key)}`,
    }, { status: 201 });
  }

  if (action === "complete") {
    const payload = await request.json() as CompletePayload;
    const key = String(payload.key || "");
    const uploadId = String(payload.uploadId || "");
    const parts = Array.isArray(payload.parts) ? payload.parts : [];
    if (!safeKey(key) || !uploadId || parts.length === 0) {
      return Response.json({ error: "Incomplete multipart upload" }, { status: 400 });
    }
    await storage.resumeMultipartUpload(key, uploadId).complete(parts);
    return Response.json({ key, url: `/api/flipmag/assets?key=${encodeURIComponent(key)}` });
  }

  return Response.json({ error: "Unknown multipart action" }, { status: 400 });
}

export async function PUT(request: Request) {
  const email = await requestEmail(request);
  if (!email) return Response.json({ error: "Sign in required" }, { status: 401 });
  const storage = getBucket();
  if (!storage) return Response.json({ error: "Media storage is unavailable" }, { status: 503 });

  const url = new URL(request.url);
  const key = url.searchParams.get("key") || "";
  const uploadId = url.searchParams.get("uploadId") || "";
  const partNumber = Number(url.searchParams.get("partNumber"));
  if (!safeKey(key) || !uploadId || !Number.isInteger(partNumber) || partNumber < 1 || !request.body) {
    return Response.json({ error: "Invalid upload part" }, { status: 400 });
  }

  const part = await storage.resumeMultipartUpload(key, uploadId).uploadPart(partNumber, request.body);
  return Response.json(part);
}

export async function DELETE(request: Request) {
  const email = await requestEmail(request);
  if (!email) return Response.json({ error: "Sign in required" }, { status: 401 });
  const storage = getBucket();
  if (!storage) return Response.json({ error: "Media storage is unavailable" }, { status: 503 });

  const url = new URL(request.url);
  const key = url.searchParams.get("key") || "";
  const uploadId = url.searchParams.get("uploadId") || "";
  if (!safeKey(key) || !uploadId) return Response.json({ error: "Invalid multipart upload" }, { status: 400 });
  await storage.resumeMultipartUpload(key, uploadId).abort();
  return new Response(null, { status: 204 });
}
