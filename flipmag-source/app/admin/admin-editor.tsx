"use client";

import { PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  ExternalLink,
  Link2,
  MousePointer2,
  Plus,
  Trash2,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { downloadFlipbookZip } from "@/lib/export-flipbook";
import {
  Hotspot,
  HotspotAnimation,
  HotspotKind,
  PAGE_COUNT,
  isSinglePage,
  pageImage,
} from "@/lib/flipbook-types";

const emptyDraft = (page: number): Hotspot => ({
  id: crypto.randomUUID(),
  page,
  x: 0.25,
  y: 0.25,
  w: 0.18,
  h: 0.08,
  href: "",
  label: "",
  kind: "link",
  animation: "none",
  target: "_blank",
  source: "custom",
});

export function AdminEditor({ userName }: { userName: string }) {
  const [page, setPage] = useState(1);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [draft, setDraft] = useState<Hotspot | null>(null);
  const [drawMode, setDrawMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const drawStart = useRef<{ x: number; y: number } | null>(null);

  const loadHotspots = async () => {
    const [defaults, custom] = await Promise.all([
      fetch("/default-hotspots.json").then((response) => response.json()),
      fetch("/api/hotspots").then((response) =>
        response.ok ? response.json() : { hotspots: [] },
      ),
    ]);
    setHotspots([...defaults, ...(custom.hotspots ?? [])]);
  };

  useEffect(() => {
    // The initial fetch resolves asynchronously before it updates editor state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadHotspots();
  }, []);

  const pageHotspots = useMemo(
    () => hotspots.filter((hotspot) => hotspot.page === page),
    [hotspots, page],
  );

  const pointFromEvent = (event: PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
    };
  };

  const beginDraw = (event: PointerEvent) => {
    if (!drawMode) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointFromEvent(event);
    drawStart.current = point;
    setDraft({ ...emptyDraft(page), x: point.x, y: point.y, w: 0, h: 0 });
  };

  const continueDraw = (event: PointerEvent) => {
    if (!drawMode || !drawStart.current) return;
    const point = pointFromEvent(event);
    const start = drawStart.current;
    setDraft((current) =>
      current
        ? {
            ...current,
            x: Math.min(start.x, point.x),
            y: Math.min(start.y, point.y),
            w: Math.abs(point.x - start.x),
            h: Math.abs(point.y - start.y),
          }
        : current,
    );
  };

  const finishDraw = () => {
    if (!drawStart.current) return;
    drawStart.current = null;
    setDrawMode(false);
    setDraft((current) =>
      current && current.w > 0.01 && current.h > 0.01 ? current : null,
    );
  };

  const saveDraft = async () => {
    if (!draft?.href.trim()) {
      toast.error("Add a destination URL or audio URL.");
      return;
    }
    setSaving(true);
    const response = await fetch("/api/hotspots", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(draft),
    });
    setSaving(false);
    if (!response.ok) {
      toast.error("The link could not be saved.");
      return;
    }
    await loadHotspots();
    setDraft(null);
    toast.success("Interactive area saved.");
  };

  const deleteHotspot = async (hotspot: Hotspot) => {
    const response = await fetch(`/api/hotspots/${encodeURIComponent(hotspot.id)}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      toast.error("The link could not be deleted.");
      return;
    }
    await loadHotspots();
    if (draft?.id === hotspot.id) setDraft(null);
    toast.success("Interactive area removed.");
  };

  const iframeCode = `<iframe src="${typeof window === "undefined" ? "https://your-flipbook-url" : window.location.origin}" title="Business Intelligence Journal" width="100%" height="780" style="border:0" loading="lazy" allow="autoplay; fullscreen" allowfullscreen></iframe>`;

  return (
    <main className="admin-shell">
      <Toaster position="top-center" richColors />
      <header className="admin-header">
        <div>
          <Button asChild variant="ghost" size="icon"><Link href="/" aria-label="Back to magazine"><ArrowLeft /></Link></Button>
          <img className="admin-mark" src="/assets/mastercard-symbol.png" alt="Mastercard" />
          <div><strong>MBI Flipbook Admin</strong><span>Interactive content editor</span></div>
        </div>
        <p>Signed in as <strong>{userName}</strong></p>
      </header>

      <div className="admin-workspace">
        <aside className="admin-pages">
          <h2>Pages</h2>
          <div>
            {Array.from({ length: PAGE_COUNT }, (_, index) => index + 1).map((item) => (
              <button key={item} className={item === page ? "is-active" : ""} onClick={() => { setPage(item); setDraft(null); setDrawMode(false); }}>
                <img src={pageImage(item)} alt="" />
                <span>{item}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="admin-canvas-area">
          <div className="canvas-toolbar">
            <div><strong>{page === 1 ? "Cover" : page === PAGE_COUNT ? "Back cover" : `Spread ${page}`}</strong><span>{pageHotspots.length} active areas</span></div>
            <Button className={drawMode ? "is-drawing" : ""} onClick={() => { setDrawMode(!drawMode); setDraft(null); }}>
              {drawMode ? <MousePointer2 /> : <Plus />}{drawMode ? "Drag on the page" : "Add interactive area"}
            </Button>
          </div>
          <div className="admin-canvas-scroll">
            <div ref={canvasRef} className={`admin-page-canvas ${isSinglePage(page) ? "single-page" : "spread-page"}`}>
              <img src={pageImage(page)} alt={`Magazine page ${page}`} draggable={false} />
              {pageHotspots.map((hotspot) => (
                <button
                  key={hotspot.id}
                  className={`admin-hotspot ${hotspot.source}`}
                  style={{ left: `${hotspot.x * 100}%`, top: `${hotspot.y * 100}%`, width: `${hotspot.w * 100}%`, height: `${hotspot.h * 100}%` }}
                  onClick={() => hotspot.source === "custom" && setDraft(hotspot)}
                  title={hotspot.label}
                >
                  {hotspot.kind === "audio" ? <Volume2 /> : <Link2 />}
                </button>
              ))}
              {draft && draft.page === page && !pageHotspots.some((hotspot) => hotspot.id === draft.id) && (
                <span className="admin-hotspot draft" style={{ left: `${draft.x * 100}%`, top: `${draft.y * 100}%`, width: `${draft.w * 100}%`, height: `${draft.h * 100}%` }} />
              )}
              {drawMode && <div className="draw-surface" onPointerDown={beginDraw} onPointerMove={continueDraw} onPointerUp={finishDraw} />}
              {!isSinglePage(page) && <span className="admin-gutter" />}
            </div>
          </div>
        </section>

        <aside className="admin-properties">
          <section>
            <div className="properties-heading"><div><span>PROPERTIES</span><h2>{draft ? "Interactive area" : "Select or add an area"}</h2></div>{draft && <Check />}</div>
            {draft ? (
              <div className="properties-form">
                <div><Label htmlFor="label">Label</Label><Input id="label" value={draft.label} placeholder="Example: Read the full article" onChange={(event) => setDraft({ ...draft, label: event.target.value })} /></div>
                <div><Label htmlFor="url">Destination</Label><Input id="url" value={draft.href} placeholder={draft.kind === "audio" ? "https://.../audio.mp3" : "https://..."} onChange={(event) => setDraft({ ...draft, href: event.target.value })} /></div>
                <div className="field-grid">
                  <div><Label>Type</Label><Select value={draft.kind} onValueChange={(value: HotspotKind) => setDraft({ ...draft, kind: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="link">Web link</SelectItem><SelectItem value="audio">Audio</SelectItem></SelectContent></Select></div>
                  <div><Label>Animation</Label><Select value={draft.animation} onValueChange={(value: HotspotAnimation) => setDraft({ ...draft, animation: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem><SelectItem value="pulse">Pulse</SelectItem><SelectItem value="glow">Glow</SelectItem><SelectItem value="float">Float</SelectItem></SelectContent></Select></div>
                </div>
                <div><Label>Open link</Label><Select value={draft.target} onValueChange={(value: "_blank" | "_self") => setDraft({ ...draft, target: value })}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="_blank">New tab</SelectItem><SelectItem value="_self">Same window</SelectItem></SelectContent></Select></div>
                <Button onClick={saveDraft} disabled={saving} className="save-hotspot">{saving ? "Saving..." : "Save interactive area"}</Button>
                {pageHotspots.some((hotspot) => hotspot.id === draft.id) && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="ghost" className="delete-hotspot"><Trash2 />Delete area</Button></AlertDialogTrigger>
                    <AlertDialogContent size="sm">
                      <AlertDialogHeader><AlertDialogTitle>Delete this area?</AlertDialogTitle><AlertDialogDescription>This removes the custom link from the live flipbook.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={() => void deleteHotspot(draft)}>Delete</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            ) : (
              <div className="properties-empty"><MousePointer2 /><p>Choose an orange custom area on the page, or add a new one by drawing its clickable region.</p></div>
            )}
          </section>

          <section className="output-card">
            <span>CLIENT OUTPUT</span><h2>Embed or export</h2><p>Use the iframe on any page, or download a self-contained HTML package.</p>
            <Label htmlFor="iframe">Iframe code</Label><Textarea id="iframe" readOnly value={iframeCode} />
            <Button variant="outline" onClick={() => { void navigator.clipboard.writeText(iframeCode); toast.success("Iframe code copied."); }}><Copy />Copy iframe</Button>
            <Button disabled={exporting} onClick={async () => { try { setExporting(true); await downloadFlipbookZip(hotspots); toast.success("Export package ready."); } catch { toast.error("The export could not be created."); } finally { setExporting(false); } }}><Download />{exporting ? "Building ZIP..." : "Download HTML ZIP"}</Button>
            <a href="/" target="_blank"><ExternalLink />Open live flipbook</a>
          </section>
        </aside>
      </div>
    </main>
  );
}
