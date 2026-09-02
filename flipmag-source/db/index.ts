import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getDb() {
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }

  return drizzle(env.DB, { schema });
}

type Bucket = {
  put: (key: string, value: ReadableStream | ArrayBuffer | Blob, options?: unknown) => Promise<unknown>;
  get: (key: string) => Promise<{ body: ReadableStream; httpMetadata?: { contentType?: string } } | null>;
  createMultipartUpload: (key: string, options?: unknown) => Promise<MultipartUpload>;
  resumeMultipartUpload: (key: string, uploadId: string) => MultipartUpload;
};

export type UploadedPart = { partNumber: number; etag: string };

type MultipartUpload = {
  key: string;
  uploadId: string;
  uploadPart: (partNumber: number, value: ReadableStream | ArrayBuffer | Blob) => Promise<UploadedPart>;
  complete: (parts: UploadedPart[]) => Promise<unknown>;
  abort: () => Promise<void>;
};

export function getBucket() {
  return (env as unknown as { BUCKET?: Bucket }).BUCKET;
}
