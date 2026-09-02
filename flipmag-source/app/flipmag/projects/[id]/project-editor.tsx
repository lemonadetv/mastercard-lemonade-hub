"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ExternalLink, Film, Link2, Music2, Plus, Save, Send, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { assetUrl, FlipHotspot, FlipPage, FlipProject } from "@/lib/flipmag";

type Bundle = { project: FlipProject; pages: FlipPage[]; hotspots: FlipHotspot[]; versions: Array<{ id: string; versionNumber: number; label: string; createdAt: string }> };
const blank = (projectId: string, pageNumber: number, x: number, y: number): FlipHotspot => ({ id: crypto.randomUUID(), projectId, pageNumber, kind: "link", label: "Open link", href: "", x, y, width: .18, height: .08, animation: "glow", target: "_blank" });

export function FlipProjectEditor({ projectId }: { projectId: string }) {
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [selected, setSelected] = useState<FlipHotspot | null>(null);
  const [busy, setBusy] = useState("");
  const mediaRef = useRef<HTMLInputElement | null>(null);
  const load = async () => { const response = await fetch(`/api/flipmag/projects/${projectId}`); if (response.ok) setBundle(await response.json()); };
  useEffect(() => {
    let active = true;
    void fetch(`/api/flipmag/projects/${projectId}`).then(async (response) => response.ok ? response.json() : null).then((data) => { if (active && data) setBundle(data); });
    return () => { active = false; };
  }, [projectId]);
  const page = bundle?.pages.find((item) => item.pageNumber === pageNumber) ?? bundle?.pages[0];
  const pageHotspots = useMemo(() => bundle?.hotspots.filter((item) => item.pageNumber === pageNumber) ?? [], [bundle, pageNumber]);

  const patchProject = async () => {
    if (!bundle) return; setBusy("Saving project…");
    const response = await fetch(`/api/flipmag/projects/${projectId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: bundle.project.title, slug: bundle.project.slug, description: bundle.project.description }) });
    const data = await response.json(); setBusy(""); if (!response.ok) return alert(data.error); setBundle({ ...bundle, project: data.project });
  };
  const saveHotspot = async () => {
    if (!bundle || !selected) return; setBusy("Saving interaction…");
    const response = await fetch(`/api/flipmag/projects/${projectId}/hotspots`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(selected) });
    const data = await response.json(); setBusy(""); if (!response.ok) return alert(data.error);
    const others = bundle.hotspots.filter((item) => item.id !== selected.id); setBundle({ ...bundle, hotspots: [...others, data.hotspot] }); setSelected(data.hotspot);
  };
  const deleteHotspot = async () => {
    if (!bundle || !selected) return;
    await fetch(`/api/flipmag/projects/${projectId}/hotspots?hotspotId=${selected.id}`, { method: "DELETE" });
    setBundle({ ...bundle, hotspots: bundle.hotspots.filter((item) => item.id !== selected.id) }); setSelected(null);
  };
  const uploadMedia = async (file: File) => {
    if (!selected) return; setBusy(`Uploading ${selected.kind}…`);
    const form = new FormData(); form.append("projectId", projectId); form.append("kind", selected.kind); form.append("file", file);
    const response = await fetch("/api/flipmag/assets", { method: "POST", body: form }); const data = await response.json(); setBusy("");
    if (!response.ok) return alert(data.error); setSelected({ ...selected, href: data.url });
  };
  const publish = async () => {
    setBusy("Publishing version…"); const response = await fetch(`/api/flipmag/projects/${projectId}/publish`, { method: "POST" }); const data = await response.json(); setBusy("");
    if (!response.ok) return alert(data.error); await load(); window.open(data.url, "_blank", "noopener,noreferrer");
  };

  if (!bundle) return <main className="editor-loading">Loading Page Flip Builder…</main>;
  return (
    <main className="editor-shell">
      <header className="editor-topbar">
        <a href="/flipmag/admin" className="editor-back"><ArrowLeft /> Projects</a>
        <div className="editor-title"><Input value={bundle.project.title} onChange={(e) => setBundle({ ...bundle, project: { ...bundle.project, title: e.target.value } })} /><span>{busy || `${bundle.pages.length} pages · ${bundle.project.status}`}</span></div>
        <div className="editor-actions"><Button variant="outline" onClick={() => void patchProject()}><Save /> Save</Button><Button onClick={() => void publish()}><Send /> Publish version</Button></div>
      </header>
      <div className="editor-workspace">
        <aside className="page-rail"><strong>Pages</strong>{bundle.pages.map((item) => <button key={item.id} className={item.pageNumber === pageNumber ? "active" : ""} onClick={() => { setPageNumber(item.pageNumber); setSelected(null); }}><img src={assetUrl(item.imageKey)} alt="" /><span>{item.pageNumber}. {item.title}</span></button>)}</aside>
        <section className="editor-canvas-panel">
          <div className="editor-canvas-heading"><div><strong>{page?.title}</strong><span>Click anywhere on the page to add an interaction</span></div><Button variant="outline" size="sm" onClick={() => setSelected(blank(projectId, pageNumber, .41, .46))}><Plus /> Add interaction</Button></div>
          {page && <div className={`editor-page editor-page-${page.layout}`} onClick={(event) => { if ((event.target as HTMLElement).closest(".editor-hotspot")) return; const rect = event.currentTarget.getBoundingClientRect(); setSelected(blank(projectId, pageNumber, Math.max(0, Math.min(.82, (event.clientX - rect.left) / rect.width - .09)), Math.max(0, Math.min(.92, (event.clientY - rect.top) / rect.height - .04)))); }}>
            <img src={assetUrl(page.imageKey)} alt={page.title} />
            {[...pageHotspots, ...(selected && !pageHotspots.some((item) => item.id === selected.id) ? [selected] : [])].map((item) => <button key={item.id} className={`editor-hotspot animation-${item.animation} ${selected?.id === item.id ? "selected" : ""}`} style={{ left: `${item.x * 100}%`, top: `${item.y * 100}%`, width: `${item.width * 100}%`, height: `${item.height * 100}%` }} onClick={(e) => { e.stopPropagation(); setSelected(item); }}>{item.kind === "audio" ? <Music2 /> : item.kind === "video" ? <Film /> : <Link2 />}<span>{item.label}</span></button>)}
          </div>}
        </section>
        <aside className="property-panel">
          <div className="property-heading"><strong>Project settings</strong></div>
          <label>Public URL slug<Input value={bundle.project.slug} onChange={(e) => setBundle({ ...bundle, project: { ...bundle.project, slug: e.target.value } })} /></label>
          <label>Description<Textarea value={bundle.project.description} onChange={(e) => setBundle({ ...bundle, project: { ...bundle.project, description: e.target.value } })} /></label>
          <Button variant="outline" onClick={() => void patchProject()}><Save /> Save settings</Button>
          <div className="property-divider" />
          {selected ? <>
            <div className="property-heading"><strong>Interaction</strong><button onClick={() => setSelected(null)}><X /></button></div>
            <label>Type<Select value={selected.kind} onValueChange={(kind: "link" | "audio" | "video") => setSelected({ ...selected, kind, href: "" })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="link">Link</SelectItem><SelectItem value="audio">Audio</SelectItem><SelectItem value="video">Video</SelectItem></SelectContent></Select></label>
            <label>Label<Input value={selected.label} onChange={(e) => setSelected({ ...selected, label: e.target.value })} /></label>
            <label>{selected.kind === "link" ? "URL" : "Media URL"}<Input value={selected.href} placeholder={selected.kind === "link" ? "https://…" : "Upload or paste a URL"} onChange={(e) => setSelected({ ...selected, href: e.target.value })} /></label>
            {selected.kind !== "link" && <><Button variant="outline" onClick={() => mediaRef.current?.click()}><Upload /> Upload {selected.kind}</Button><input ref={mediaRef} hidden type="file" accept={selected.kind === "audio" ? "audio/*" : "video/*"} onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadMedia(file); e.currentTarget.value = ""; }} /></>}
            <label>Animation<Select value={selected.animation} onValueChange={(animation: FlipHotspot["animation"]) => setSelected({ ...selected, animation })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="glow">Glow</SelectItem><SelectItem value="pulse">Pulse</SelectItem><SelectItem value="float">Float</SelectItem><SelectItem value="none">None</SelectItem></SelectContent></Select></label>
            <div className="property-row"><label>Width<Input type="number" min="2" max="100" value={Math.round(selected.width * 100)} onChange={(e) => setSelected({ ...selected, width: Number(e.target.value) / 100 })} /></label><label>Height<Input type="number" min="2" max="100" value={Math.round(selected.height * 100)} onChange={(e) => setSelected({ ...selected, height: Number(e.target.value) / 100 })} /></label></div>
            <Button onClick={() => void saveHotspot()}><Save /> Save interaction</Button>{pageHotspots.some((item) => item.id === selected.id) && <Button variant="destructive" onClick={() => void deleteHotspot()}><Trash2 /> Delete</Button>}
          </> : <div className="property-empty"><Link2 /><p>Select an interaction or click the page to add one.</p></div>}
          <div className="property-divider" /><div className="property-heading"><strong>Versions</strong></div>
          <div className="version-list">{bundle.versions.length ? bundle.versions.map((version) => <div key={version.id}><span>v{version.versionNumber}</span><p>{version.label}<small>{new Date(version.createdAt).toLocaleString()}</small></p></div>) : <p>No published versions yet.</p>}</div>
          {bundle.project.status === "published" && <a className="public-link" href={`/flipmag/view/${bundle.project.slug}`} target="_blank" rel="noreferrer"><ExternalLink /> Open published flip</a>}
        </aside>
      </div>
    </main>
  );
}
