"use client";

import { forwardRef, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import HTMLFlipBook from "react-pageflip";
import { ChevronLeft, ChevronRight, ExternalLink, Film, Fullscreen, Grid2X2, Pause, Play, Volume2, VolumeX, X, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { assetUrl, FlipHotspot, FlipPage, FlipProject } from "@/lib/flipmag";

type Bundle = { project: FlipProject; pages: FlipPage[]; hotspots: FlipHotspot[] };
type Physical = { key: string; source: number; side: "single" | "left" | "right" };
type Controller = { flip: (page: number, corner?: "top" | "bottom") => void; flipNext: (corner?: "top" | "bottom") => void; flipPrev: (corner?: "top" | "bottom") => void; turnToPage: (page: number) => void; getPage: (index: number) => { setDensity: (value: "soft" | "hard") => void; setDrawingDensity: (value: "soft" | "hard") => void } };
type FlipRef = { pageFlip: () => Controller };

export function DynamicFlipReader({ slug }: { slug: string }) {
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [sourcePage, setSourcePage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [grid, setGrid] = useState(false);
  const [media, setMedia] = useState<FlipHotspot | null>(null);
  const [playing, setPlaying] = useState(false);
  const [panning, setPanning] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipTarget, setFlipTarget] = useState<number | null>(null);
  const [turnSound, setTurnSound] = useState(true);
  const flipRef = useRef<FlipRef | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const zoomRef = useRef(100);
  const pan = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const anchor = useRef<{ rx: number; ry: number; x: number; y: number } | null>(null);
  const soundPlayed = useRef(false);

  const playTurnSound = useCallback(() => {
    if (!turnSound || typeof AudioContext === "undefined") return;
    const context = new AudioContext();
    const duration = .48;
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < channel.length; index += 1) {
      const progress = index / channel.length;
      const envelope = Math.sin(Math.PI * progress) * (1 - progress * .45);
      channel[index] = (Math.random() * 2 - 1) * envelope * .34;
    }
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1150, context.currentTime);
    filter.frequency.exponentialRampToValueAtTime(420, context.currentTime + duration);
    filter.Q.value = .72;
    gain.gain.setValueAtTime(.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(.22, context.currentTime + .035);
    gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + duration);
    source.buffer = buffer;
    source.connect(filter).connect(gain).connect(context.destination);
    source.start();
    source.addEventListener("ended", () => void context.close(), { once: true });
  }, [turnSound]);

  useEffect(() => { fetch(`/api/flipmag/public/${encodeURIComponent(slug)}`).then(async (response) => { if (!response.ok) throw new Error(); return response.json(); }).then(setBundle).catch(() => setBundle(null)); }, [slug]);
  const physical = useMemo<Physical[]>(() => bundle ? bundle.pages.flatMap((page) => page.layout === "spread" ? [{ key: `${page.id}-l`, source: page.pageNumber, side: "left" as const }, { key: `${page.id}-r`, source: page.pageNumber, side: "right" as const }] : [{ key: page.id, source: page.pageNumber, side: "single" as const }]) : [], [bundle]);
  const indexForSource = useCallback((page: number) => Math.max(0, physical.findIndex((item) => item.source === page)), [physical]);
  const page = bundle?.pages.find((item) => item.pageNumber === sourcePage) ?? bundle?.pages[0];

  const go = useCallback((next: number) => {
    if (!bundle || next < 1 || next > bundle.pages.length || next === sourcePage || isFlipping) return;
    setMedia(null);
    setFlipTarget(next);
    if (Math.abs(next - sourcePage) === 1) {
      const controller = flipRef.current?.pageFlip();
      const first = bundle.pages[0]?.pageNumber;
      const second = bundle.pages[1]?.pageNumber;
      if (sourcePage === first && next === second) controller?.flipNext("top");
      else if (sourcePage === second && next === first) controller?.flipPrev("top");
      else controller?.flip(indexForSource(next), "top");
    } else { flipRef.current?.pageFlip().turnToPage(indexForSource(next)); setSourcePage(next); setFlipTarget(null); }
  }, [bundle, sourcePage, indexForSource, isFlipping]);

  const anchoredZoom = useCallback((value: number, cx?: number, cy?: number) => {
    const scroll = scrollRef.current;
    if (scroll) { const rect = scroll.getBoundingClientRect(); const x = cx === undefined ? scroll.clientWidth / 2 : cx - rect.left; const y = cy === undefined ? scroll.clientHeight / 2 : cy - rect.top; anchor.current = { rx: (scroll.scrollLeft + x) / Math.max(scroll.scrollWidth, 1), ry: (scroll.scrollTop + y) / Math.max(scroll.scrollHeight, 1), x, y }; }
    const next = Math.max(70, Math.min(220, Math.round(value))); zoomRef.current = next; setZoom(next);
  }, []);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { const node = scrollRef.current; if (!node) return; const wheel = (event: WheelEvent) => { event.preventDefault(); anchoredZoom(zoomRef.current + (event.deltaY > 0 ? -10 : 10), event.clientX, event.clientY); }; node.addEventListener("wheel", wheel, { passive: false }); return () => node.removeEventListener("wheel", wheel); }, [anchoredZoom]);
  useLayoutEffect(() => { const node = scrollRef.current; const point = anchor.current; if (!node || !point) return; const id = requestAnimationFrame(() => { node.scrollLeft = point.rx * node.scrollWidth - point.x; node.scrollTop = point.ry * node.scrollHeight - point.y; anchor.current = null; }); return () => cancelAnimationFrame(id); }, [zoom]);
  useEffect(() => { const key = (event: KeyboardEvent) => { if (event.key === "ArrowLeft") go(sourcePage - 1); if (event.key === "ArrowRight") go(sourcePage + 1); if (event.key === "+" || event.key === "=") anchoredZoom(zoomRef.current + 10); if (event.key === "-") anchoredZoom(zoomRef.current - 10); }; window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key); }, [go, sourcePage, anchoredZoom]);

  if (!bundle) return <main className="public-reader-loading"><img src="/assets/mastercard-symbol.png" alt="Mastercard" /><p>Loading flip magazine…</p></main>;
  const activePage = page?.pageNumber || 1;
  const visualPage = isFlipping && flipTarget ? flipTarget : activePage;
  const firstPage = bundle.pages[0]?.pageNumber;
  const lastPage = bundle.pages.at(-1)?.pageNumber;
  return (
    <main className="dynamic-reader">
      <header className="dynamic-header"><div className="dynamic-brand"><img src="/assets/mastercard-symbol.png" alt="Mastercard" /><div><b>{bundle.project.title}</b><small>{page?.title || bundle.project.title}</small></div></div><div className="dynamic-status"><span>{activePage} / {bundle.pages.length}</span><i><b style={{ width: `${activePage / bundle.pages.length * 100}%` }} /></i></div><nav><Button variant="ghost" size="icon" onClick={() => setTurnSound((enabled) => !enabled)} aria-label={turnSound ? "Turn page sound off" : "Turn page sound on"} title={turnSound ? "Page sound on" : "Page sound off"}>{turnSound ? <Volume2 /> : <VolumeX />}</Button><Button variant="ghost" size="icon" onClick={() => setGrid(!grid)} aria-label="All pages"><Grid2X2 /></Button><Button variant="ghost" size="icon" onClick={() => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()} aria-label="Fullscreen"><Fullscreen /></Button></nav></header>
      {grid && <aside className="dynamic-grid"><div><strong>All pages</strong><Button variant="ghost" size="icon" onClick={() => setGrid(false)}><X /></Button></div><section>{bundle.pages.map((item) => <button key={item.id} className={item.pageNumber === sourcePage ? "active" : ""} onClick={() => { go(item.pageNumber); setGrid(false); }}><img src={assetUrl(item.imageKey)} alt="" /><span>{item.pageNumber}. {item.title}</span></button>)}</section></aside>}
      <section className="dynamic-stage"><button className="reader-arrow left" disabled={activePage === firstPage || isFlipping} onClick={() => go(activePage - 1)}><ChevronLeft /></button>
        <div ref={scrollRef} className={`dynamic-scroll ${zoom > 100 ? "pannable" : ""} ${panning ? "panning" : ""}`} onPointerDownCapture={(event) => { if (zoom <= 100 || (event.target as HTMLElement).closest(".dynamic-hotspot")) return; const node = scrollRef.current; if (!node) return; pan.current = { x: event.clientX, y: event.clientY, left: node.scrollLeft, top: node.scrollTop }; setPanning(true); event.currentTarget.setPointerCapture(event.pointerId); event.stopPropagation(); }} onPointerMove={(event) => { const start = pan.current; const node = scrollRef.current; if (!start || !node) return; node.scrollLeft = start.left - (event.clientX - start.x); node.scrollTop = start.top - (event.clientY - start.y); }} onPointerUp={(event) => { pan.current = null; setPanning(false); if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}>
          <div className="dynamic-zoom" style={{ transform: `scale(${zoom / 100})` }}><HTMLFlipBook ref={flipRef} className={`dynamic-book ${visualPage === firstPage ? "is-front-cover" : ""} ${visualPage === lastPage ? "is-back-cover" : ""}`} style={{}} width={720} height={960} size="stretch" minWidth={260} maxWidth={720} minHeight={347} maxHeight={960} startPage={indexForSource(sourcePage)} drawShadow flippingTime={1100} usePortrait startZIndex={1} autoSize maxShadowOpacity={.78} showCover mobileScrollSupport={false} clickEventForward useMouseEvents swipeDistance={18} showPageCorners disableFlipByClick={zoom > 100} onInit={(event: { object: Controller }) => { if (physical.length) { [0, physical.length - 1].forEach((index) => { const sheet = event.object.getPage(index); sheet.setDensity("soft"); sheet.setDrawingDensity("soft"); }); } }} onFlip={(event: { data: number }) => setSourcePage(physical[event.data]?.source || firstPage || 1)} onChangeState={(event: { data: string }) => { const flipping = event.data === "flipping" || event.data === "user_fold"; if (event.data === "flipping" && !soundPlayed.current) { soundPlayed.current = true; playTurnSound(); } if (event.data === "read") { soundPlayed.current = false; setFlipTarget(null); } setIsFlipping(flipping); }}>
            {physical.map((item) => { const source = bundle.pages.find((candidate) => candidate.pageNumber === item.source)!; return <DynamicPage key={item.key} ref={undefined} item={item} page={source} hotspots={bundle.hotspots.filter((spot) => spot.pageNumber === item.source)} onMedia={(spot) => { setMedia(spot); setPlaying(spot.kind === "audio"); }} />; })}
          </HTMLFlipBook></div>
        </div><button className="reader-arrow right" disabled={activePage === lastPage || isFlipping} onClick={() => go(activePage + 1)}><ChevronRight /></button>
      </section>
      <footer className="dynamic-footer"><Button variant="ghost" size="icon" onClick={() => anchoredZoom(zoom - 10)} disabled={zoom <= 70}><ZoomOut /></Button><Slider value={[zoom]} min={70} max={220} step={5} onValueChange={(value) => anchoredZoom(value[0])} /><span>{zoom}%</span><Button variant="ghost" size="icon" onClick={() => anchoredZoom(zoom + 10)} disabled={zoom >= 220}><ZoomIn /></Button></footer>
      {media && <aside className={`media-modal media-${media.kind}`}><div><Button variant="ghost" size="icon" onClick={() => setMedia(null)}><X /></Button>{media.kind === "video" ? <video src={media.href} controls autoPlay playsInline /> : <><Button className="audio-play" size="icon" onClick={() => setPlaying(!playing)}>{playing ? <Pause /> : <Play />}</Button><Volume2 /><strong>{media.label}</strong><audio src={media.href} autoPlay={playing} controls onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} /></>}</div></aside>}
    </main>
  );
}

const DynamicPage = forwardRef<HTMLDivElement, { item: Physical; page: FlipPage; hotspots: FlipHotspot[]; onMedia: (spot: FlipHotspot) => void }>(function DynamicPage({ item, page, hotspots, onMedia }, ref) {
  return <div ref={ref} className={`dynamic-page side-${item.side}`}><img src={assetUrl(page.imageKey)} alt={page.title} draggable={false} />{hotspots.map((spot) => <DynamicHotspot key={`${item.key}-${spot.id}`} spot={spot} side={item.side} onMedia={onMedia} />)}{item.side !== "single" && <i className="page-spine" />}</div>;
});

function DynamicHotspot({ spot, side, onMedia }: { spot: FlipHotspot; side: Physical["side"]; onMedia: (spot: FlipHotspot) => void }) {
  const halfStart = side === "right" ? .5 : 0, halfEnd = side === "left" ? .5 : 1;
  const start = Math.max(spot.x, halfStart), end = Math.min(spot.x + spot.width, halfEnd); if (end <= start) return null;
  const scale = side === "single" ? 1 : 2; const style = { left: `${(start - halfStart) * scale * 100}%`, top: `${spot.y * 100}%`, width: `${(end - start) * scale * 100}%`, height: `${spot.height * 100}%` };
  const className = `dynamic-hotspot animation-${spot.animation}`;
  if (spot.kind !== "link") return <button style={style} className={className} title={spot.label} onClick={(event) => { event.stopPropagation(); onMedia(spot); }}>{spot.kind === "audio" ? <Volume2 /> : <Film />}</button>;
  return <a style={style} className={className} href={spot.href} target={spot.target} rel="noreferrer" title={spot.label} onClick={(event) => event.stopPropagation()}><ExternalLink /></a>;
}
