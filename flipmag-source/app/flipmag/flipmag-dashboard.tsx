"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, FileUp, LogOut, Plus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { slugify } from "@/lib/flipmag";

type ProjectCard = { id: string; title: string; slug: string; description: string; status: "draft" | "published"; pageCount: number; versionCount: number; updatedAt: string };
type AssetResult = { key: string; url: string };
type MultipartStart = AssetResult & { uploadId: string };
type UploadedPart = { partNumber: number; etag: string };

async function responseData(response: Response) {
  const text = await response.text();
  if (!text) return {} as Record<string, unknown>;
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(response.ok ? "The server returned an invalid response." : text);
  }
}

export function FlipmagDashboard({ user }: { user: { name: string; email: string } }) {
  const [projects, setProjects] = useState<ProjectCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<number | null>(null);
  const [progressText, setProgressText] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();

  const load = async () => {
    const response = await fetch("/api/flipmag/projects");
    const data = await response.json();
    setProjects(data.projects || []);
    setLoading(false);
  };
  useEffect(() => {
    let active = true;
    void fetch("/api/flipmag/projects").then((response) => response.json()).then((data) => {
      if (!active) return;
      setProjects(data.projects || []);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const uploadAsset = async (projectId: string, file: File, kind: string) => {
    const form = new FormData(); form.append("projectId", projectId); form.append("kind", kind); form.append("file", file);
    const response = await fetch("/api/flipmag/assets", { method: "POST", body: form });
    const data = await responseData(response);
    if (!response.ok) throw new Error(String(data.error || "Upload failed"));
    return data as AssetResult;
  };

  const uploadSourcePdf = async (projectId: string, file: File) => {
    const startResponse = await fetch("/api/flipmag/assets/multipart?action=create", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectId, kind: "source", name: file.name, contentType: file.type || "application/pdf" }),
    });
    const started = await responseData(startResponse) as MultipartStart & { error?: string };
    if (!startResponse.ok) throw new Error(started.error || "Could not start PDF upload");

    const query = new URLSearchParams({ key: started.key, uploadId: started.uploadId });
    const partSize = 5 * 1024 * 1024;
    const partCount = Math.ceil(file.size / partSize);
    const parts: UploadedPart[] = [];
    try {
      for (let index = 0; index < partCount; index += 1) {
        const partNumber = index + 1;
        setProgress(7 + Math.round((partNumber / partCount) * 4));
        setProgressText(`Saving original PDF — part ${partNumber} of ${partCount}…`);
        const response = await fetch(`/api/flipmag/assets/multipart?action=upload&${query}&partNumber=${partNumber}`, {
          method: "PUT",
          headers: { "content-type": "application/octet-stream" },
          body: file.slice(index * partSize, Math.min(file.size, (index + 1) * partSize)),
        });
        const part = await responseData(response) as UploadedPart & { error?: string };
        if (!response.ok) throw new Error(part.error || `Could not upload PDF part ${partNumber}`);
        parts.push({ partNumber: part.partNumber, etag: part.etag });
      }

      const completeResponse = await fetch("/api/flipmag/assets/multipart?action=complete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key: started.key, uploadId: started.uploadId, parts }),
      });
      const completed = await responseData(completeResponse) as AssetResult & { error?: string };
      if (!completeResponse.ok) throw new Error(completed.error || "Could not finish PDF upload");
      return completed;
    } catch (error) {
      await fetch(`/api/flipmag/assets/multipart?action=abort&${query}`, { method: "DELETE" }).catch(() => undefined);
      throw error;
    }
  };

  const importPdf = async (file: File) => {
    setProgress(2); setProgressText("Creating project…");
    try {
      const title = file.name.replace(/\.pdf$/i, "").replace(/[-_]+/g, " ");
      const create = await fetch("/api/flipmag/projects", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title, slug: slugify(title), description: "Imported with the BI Journal presentation model." }) });
      const created = await create.json();
      if (!create.ok) throw new Error(created.error || "Could not create project");
      const projectId = created.project.id as string;
      setProgress(7); setProgressText("Saving original PDF…");
      const pdfAsset = await uploadSourcePdf(projectId, file);
      await fetch(`/api/flipmag/projects/${projectId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ sourcePdfKey: pdfAsset.key }) });

      setProgress(12); setProgressText("Reading pages and headings…");
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
      const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
      const pages = [];
      const pdfHotspots: Array<Record<string, unknown>> = [];
      for (let index = 1; index <= pdf.numPages; index += 1) {
        setProgress(12 + Math.round((index / pdf.numPages) * 82));
        setProgressText(`Rendering page ${index} of ${pdf.numPages}…`);
        const page = await pdf.getPage(index);
        const base = page.getViewport({ scale: 1 });
        const scale = Math.min(2.2, 1900 / Math.max(base.width, base.height));
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(viewport.width); canvas.height = Math.round(viewport.height);
        const context = canvas.getContext("2d", { alpha: false });
        if (!context) throw new Error("Canvas is unavailable");
        await page.render({ canvas, canvasContext: context, viewport }).promise;
        const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Page conversion failed")), "image/webp", 0.91));
        const imageFile = new File([blob], `page-${String(index).padStart(3, "0")}.webp`, { type: "image/webp" });
        const asset = await uploadAsset(projectId, imageFile, "pages");
        const text = await page.getTextContent();
        const heading = text.items.map((item) => "str" in item ? item.str.trim() : "").filter((value) => value.length >= 4).slice(0, 4).join(" ").slice(0, 90);
        const ratio = base.width / base.height;
        const cover = index === 1 || index === pdf.numPages;
        pages.push({ pageNumber: index, title: cover && index === 1 ? title : cover ? "Back Cover" : heading || `Page ${index}`, imageKey: asset.key, width: canvas.width, height: canvas.height, layout: cover ? "cover" : ratio > 1.12 ? "spread" : "single" });
        const annotations = await page.getAnnotations();
        for (const annotation of annotations) {
          if (!("url" in annotation) || typeof annotation.url !== "string" || !annotation.url || !("rect" in annotation) || !Array.isArray(annotation.rect)) continue;
          const rect = base.convertToViewportRectangle(annotation.rect as [number, number, number, number]);
          const left = Math.min(rect[0], rect[2]) / base.width;
          const top = Math.min(rect[1], rect[3]) / base.height;
          const width = Math.abs(rect[2] - rect[0]) / base.width;
          const height = Math.abs(rect[3] - rect[1]) / base.height;
          pdfHotspots.push({ pageNumber: index, kind: "link", label: `Open ${new URL(annotation.url).hostname || "link"}`, href: annotation.url, x: left, y: top, width, height, animation: "none", target: "_blank" });
        }
        page.cleanup();
      }
      const savePages = await fetch(`/api/flipmag/projects/${projectId}/pages`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pages }) });
      const savedPages = await responseData(savePages) as { error?: string };
      if (!savePages.ok) throw new Error(savedPages.error || "Could not save rendered pages");
      for (const hotspot of pdfHotspots) {
        const response = await fetch(`/api/flipmag/projects/${projectId}/hotspots`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(hotspot) });
        if (!response.ok) throw new Error("A PDF link could not be preserved");
      }
      setProgress(100); setProgressText("Import complete — opening editor…");
      router.push(`/flipmag/projects/${projectId}`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Import failed");
      setProgress(null); setProgressText("");
      void load();
    }
  };

  const remove = async (project: ProjectCard) => {
    if (project.slug === "bi-journal-2026") return alert("The BI Journal master template cannot be deleted.");
    if (!confirm(`Delete “${project.title}”? This removes the project and its versions.`)) return;
    await fetch(`/api/flipmag/projects/${project.id}`, { method: "DELETE" });
    setProjects((items) => items.filter((item) => item.id !== project.id));
  };

  return (
    <main className="builder-shell">
      <header className="builder-topbar">
        <a className="builder-brand" href="/flipmag/admin"><img src="/assets/mastercard-symbol.png" alt="Mastercard" /><span>Page Flip Builder</span></a>
        <div className="builder-user"><span>{user.name}</span><button type="button" aria-label="Sign out" onClick={async () => { await fetch("/api/flipmag/auth", { method: "DELETE" }); window.location.assign("/flipmag/login"); }}><LogOut /></button></div>
      </header>
      <section className="builder-hero">
        <div><span className="eyebrow"><Sparkles /> Publishing workspace</span><h1>Your flip magazines</h1><p>Import, enrich, version and publish interactive magazines from one workspace.</p></div>
        <Button size="lg" onClick={() => inputRef.current?.click()} disabled={progress !== null}><Plus /> New flip from PDF</Button>
        <input ref={inputRef} hidden type="file" accept="application/pdf" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importPdf(file); event.currentTarget.value = ""; }} />
      </section>
      {progress !== null && <section className="import-progress"><div><FileUp /><span><strong>{progressText}</strong><small>Pages are optimized automatically for fast, high-quality page turns.</small></span><b>{progress}%</b></div><Progress value={progress} /></section>}
      <section className="project-section">
        <div className="section-heading"><h2>Projects</h2><span>{projects.length} magazines</span></div>
        {loading ? <div className="empty-projects">Loading workspace…</div> : projects.length === 0 ? <div className="empty-projects"><BookOpen /><h3>Create your first flip</h3><p>Upload a PDF to begin.</p></div> : (
          <div className="project-grid">{projects.map((project) => (
            <article className="project-card" key={project.id}>
              <button className="project-open" onClick={() => router.push(`/flipmag/projects/${project.id}`)}>
                <div className="project-cover"><img src={project.slug === "bi-journal-2026" ? "/pages/page-01.webp" : "/file.svg"} alt="" /><span className={`status-pill status-${project.status}`}>{project.status}</span></div>
                <div className="project-copy"><h3>{project.title}</h3><p>/{project.slug}</p><div><span>{project.pageCount} pages</span><span>{project.versionCount} versions</span></div></div>
              </button>
              <button className="project-delete" onClick={() => void remove(project)} aria-label={`Delete ${project.title}`}><Trash2 /></button>
            </article>
          ))}</div>
        )}
      </section>
    </main>
  );
}
