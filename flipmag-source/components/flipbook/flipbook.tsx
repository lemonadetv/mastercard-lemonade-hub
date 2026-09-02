"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import HTMLFlipBook from "react-pageflip";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Fullscreen,
  Grid2X2,
  Pause,
  Play,
  Volume2,
  VolumeX,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Hotspot, PAGE_COUNT, pageImage } from "@/lib/flipbook-types";

type PanState = {
  x: number;
  y: number;
  scrollLeft: number;
  scrollTop: number;
};

type PhysicalPage = {
  key: string;
  sourcePage: number;
  side: "single" | "left" | "right";
};

type FlipController = {
  flip: (page: number, corner?: "top" | "bottom") => void;
  flipNext: (corner?: "top" | "bottom") => void;
  flipPrev: (corner?: "top" | "bottom") => void;
  turnToPage: (page: number) => void;
  getPage: (index: number) => {
    setDensity: (density: "soft" | "hard") => void;
    setDrawingDensity: (density: "soft" | "hard") => void;
  };
};

type FlipbookRef = { pageFlip: () => FlipController };

const PHYSICAL_PAGES: PhysicalPage[] = [
  { key: "cover", sourcePage: 1, side: "single" },
  ...Array.from({ length: 14 }, (_, index) => index + 2).flatMap(
    (sourcePage) => [
      { key: `${sourcePage}-left`, sourcePage, side: "left" as const },
      { key: `${sourcePage}-right`, sourcePage, side: "right" as const },
    ],
  ),
  { key: "back", sourcePage: 16, side: "single" },
];

function physicalIndexForSource(sourcePage: number) {
  if (sourcePage === 1) return 0;
  if (sourcePage === PAGE_COUNT) return PHYSICAL_PAGES.length - 1;
  return 1 + (sourcePage - 2) * 2;
}

function sourceForPhysicalIndex(index: number) {
  if (index <= 0) return 1;
  if (index >= PHYSICAL_PAGES.length - 1) return PAGE_COUNT;
  return Math.floor((index - 1) / 2) + 2;
}

const PAGE_TITLES: Record<number, string> = {
  1: "How Business Intelligence Is Shaping Agentic AI",
  2: "Inside the AI Edition",
  3: "The AI Revolution in Business Intelligence",
  4: "Ask Mastercard Intelligence: Fabiana Piscitelli",
  5: "Turning Data into Dialogue",
  6: "Driving Impact at Every Level",
  7: "Navigating the Agentic Era",
  8: "Strategic AI Use Cases",
  9: "Agentic AI: Redefining Banking & Commerce",
  10: "Consumers vs. Merchants: Trust and Adoption",
  11: "The Future of Issuing",
  12: "The Innovation Frontier",
  13: "Dissecting AI's Brain",
  14: "Digital Safari TV",
  15: "Continue the Conversation",
  16: "Back Cover",
};

export function Flipbook() {
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipTarget, setFlipTarget] = useState<number | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [thumbnailsOpen, setThumbnailsOpen] = useState(false);
  const [bookInstance, setBookInstance] = useState(0);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [activeAudio, setActiveAudio] = useState<Hotspot | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [turnSound, setTurnSound] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const panState = useRef<PanState | null>(null);
  const bookScrollRef = useRef<HTMLDivElement | null>(null);
  const flipbookRef = useRef<FlipbookRef | null>(null);
  const soundPlayedRef = useRef(false);
  const zoomRef = useRef(100);
  const zoomAnchorRef = useRef<{
    ratioX: number;
    ratioY: number;
    viewportX: number;
    viewportY: number;
  } | null>(null);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    let live = true;
    Promise.all([
      fetch("/default-hotspots.json").then((response) => response.json()),
      fetch("/api/hotspots")
        .then((response) => (response.ok ? response.json() : { hotspots: [] }))
        .catch(() => ({ hotspots: [] })),
    ]).then(([defaults, custom]) => {
      if (live) setHotspots([...defaults, ...(custom.hotspots ?? [])]);
    });
    return () => {
      live = false;
    };
  }, []);

  const turnTo = useCallback(
    (nextPage: number) => {
      if (nextPage < 1 || nextPage > PAGE_COUNT || nextPage === page || isFlipping) return;
      setActiveAudio(null);
      setAudioPlaying(false);
      const controller = flipbookRef.current?.pageFlip();
      if (Math.abs(nextPage - page) > 1) {
        setPage(nextPage);
        setBookInstance((instance) => instance + 1);
        setFlipTarget(null);
        return;
      }
      setFlipTarget(nextPage);
      if (page === 1 && nextPage === 2) controller?.flipNext("top");
      else if (page === 2 && nextPage === 1) controller?.flipPrev("top");
      else controller?.flip(physicalIndexForSource(nextPage), "top");
    },
    [isFlipping, page],
  );

  const previous = useCallback(() => turnTo(page - 1), [page, turnTo]);
  const next = useCallback(() => turnTo(page + 1), [page, turnTo]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement | null)?.closest("input, button, a, [role='slider']")) return;
      if (event.key === "ArrowLeft") previous();
      if (event.key === "ArrowRight") next();
      if (event.key === "+" || event.key === "=")
        setZoom((value) => Math.min(200, value + 10));
      if (event.key === "-") setZoom((value) => Math.max(80, value - 10));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, previous]);

  useEffect(() => {
    [page - 1, page + 1]
      .filter((value) => value >= 1 && value <= PAGE_COUNT)
      .forEach((value) => {
        const image = new Image();
        image.src = pageImage(value);
      });
  }, [page]);

  useEffect(() => {
    if (bookInstance === 0) return;
    const timer = window.setTimeout(() => {
      flipbookRef.current?.pageFlip()?.turnToPage(physicalIndexForSource(page));
    }, 120);
    return () => window.clearTimeout(timer);
  }, [bookInstance, page]);

  const playAudio = (hotspot: Hotspot) => {
    if (activeAudio?.id === hotspot.id && audioRef.current) {
      if (audioPlaying) audioRef.current.pause();
      else void audioRef.current.play();
      setAudioPlaying(!audioPlaying);
      return;
    }
    setActiveAudio(hotspot);
    setAudioPlaying(true);
    window.setTimeout(() => void audioRef.current?.play(), 0);
  };

  const playTurnSound = useCallback(() => {
    if (!turnSound || typeof AudioContext === "undefined") return;
    const context = new AudioContext();
    const duration = 0.48;
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < channel.length; index += 1) {
      const progress = index / channel.length;
      channel[index] = (Math.random() * 2 - 1) * Math.sin(Math.PI * progress) * (1 - progress * 0.45) * 0.34;
    }
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1150, context.currentTime);
    filter.frequency.exponentialRampToValueAtTime(420, context.currentTime + duration);
    filter.Q.value = 0.72;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.22, context.currentTime + 0.035);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    source.buffer = buffer;
    source.connect(filter).connect(gain).connect(context.destination);
    source.start();
    source.addEventListener("ended", () => void context.close(), { once: true });
  }, [turnSound]);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen();
  };

  const setAnchoredZoom = useCallback((nextZoom: number, clientX?: number, clientY?: number) => {
    const scroll = bookScrollRef.current;
    if (scroll) {
      const rect = scroll.getBoundingClientRect();
      const viewportX = clientX === undefined ? scroll.clientWidth / 2 : clientX - rect.left;
      const viewportY = clientY === undefined ? scroll.clientHeight / 2 : clientY - rect.top;
      zoomAnchorRef.current = {
        ratioX: (scroll.scrollLeft + viewportX) / Math.max(scroll.scrollWidth, 1),
        ratioY: (scroll.scrollTop + viewportY) / Math.max(scroll.scrollHeight, 1),
        viewportX,
        viewportY,
      };
    }
    const boundedZoom = Math.max(80, Math.min(200, Math.round(nextZoom)));
    zoomRef.current = boundedZoom;
    setZoom(boundedZoom);
  }, []);

  useEffect(() => {
    const scroll = bookScrollRef.current;
    if (!scroll) return;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const delta = event.deltaY || event.deltaX;
      if (Math.abs(delta) < 0.5) return;
      const magnitude = Math.max(5, Math.min(20, Math.ceil(Math.abs(delta) / 40) * 5));
      setAnchoredZoom(
        zoomRef.current + (delta > 0 ? -magnitude : magnitude),
        event.clientX,
        event.clientY,
      );
    };
    scroll.addEventListener("wheel", handleWheel, { passive: false });
    return () => scroll.removeEventListener("wheel", handleWheel);
  }, [setAnchoredZoom]);

  useLayoutEffect(() => {
    const scroll = bookScrollRef.current;
    const anchor = zoomAnchorRef.current;
    if (!scroll || !anchor) return;
    const frame = requestAnimationFrame(() => {
      scroll.scrollLeft = anchor.ratioX * scroll.scrollWidth - anchor.viewportX;
      scroll.scrollTop = anchor.ratioY * scroll.scrollHeight - anchor.viewportY;
      zoomAnchorRef.current = null;
    });
    return () => cancelAnimationFrame(frame);
  }, [zoom]);

  const endPointerInteraction = (event: React.PointerEvent<HTMLDivElement>) => {
    if (panState.current) {
      panState.current = null;
      setIsPanning(false);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    }
  };

  const visualPage = isFlipping && flipTarget ? flipTarget : page;

  return (
    <main className="reader-shell">
      <header className="reader-header">
        <div className="reader-brand">
          <span className="reader-brand-symbol">
            <img src="/assets/mastercard-symbol.png" alt="Mastercard" />
          </span>
          <div className="reader-brand-copy"><strong>Business Intelligence Journal / Agentic AI</strong><small>{PAGE_TITLES[page]}</small></div>
        </div>

        <div className="reader-status" aria-live="polite">
          <div className="reader-progress" aria-hidden="true">
            <i style={{ width: `${(page / PAGE_COUNT) * 100}%` }} />
          </div>
          <span>{page} / {PAGE_COUNT}</span>
        </div>

        <nav className="reader-actions" aria-label="Magazine tools">
          <Button variant="ghost" size="icon" onClick={() => setTurnSound((enabled) => !enabled)} aria-label={turnSound ? "Turn page sound off" : "Turn page sound on"} title={turnSound ? "Page sound on" : "Page sound off"}>{turnSound ? <Volume2 /> : <VolumeX />}</Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={thumbnailsOpen ? "Close page thumbnails" : "Open page thumbnails"}
            aria-expanded={thumbnailsOpen}
            onClick={() => setThumbnailsOpen((open) => !open)}
          >
            <Grid2X2 />
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleFullscreen} aria-label="Fullscreen">
            <Fullscreen />
          </Button>
        </nav>
      </header>

      {thumbnailsOpen && (
        <aside className="thumbnail-panel" role="dialog" aria-modal="true" aria-label="All pages">
          <div className="thumbnail-panel-header">
            <div>
              <strong>All pages</strong>
              <span>Choose a page to open it directly.</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setThumbnailsOpen(false)} aria-label="Close page thumbnails">
              <X />
            </Button>
          </div>
          <div className="thumbnail-grid">
            {Array.from({ length: PAGE_COUNT }, (_, index) => index + 1).map((item) => (
              <button
                key={item}
                className={item === page ? "is-active" : ""}
                onClick={() => {
                  setThumbnailsOpen(false);
                  turnTo(item);
                }}
                aria-label={`Open page ${item}: ${PAGE_TITLES[item]}`}
              >
                <img src={pageImage(item)} alt="" />
                <span>{item}. {PAGE_TITLES[item]}</span>
              </button>
            ))}
          </div>
        </aside>
      )}

      <section className="book-viewport">
        <button className="page-turn-zone page-turn-left" onClick={previous} disabled={page === 1 || isFlipping} aria-label="Previous page">
          <ChevronLeft />
        </button>

        <div
          ref={bookScrollRef}
          className={`book-scroll ${zoom > 100 ? "is-pannable" : ""} ${isPanning ? "is-panning" : ""}`}
          onClick={(event) => {
            if (
              zoom > 100 ||
              isFlipping ||
              (event.target as HTMLElement).closest(".page-hotspot")
            ) return;

            const book = event.currentTarget.querySelector(".flipbook-zoom");
            const rect = book?.getBoundingClientRect();
            if (!rect) return;
            if (event.clientX < rect.left + rect.width / 2) previous();
            else next();
          }}
          onPointerDown={(event) => {
            if ((event.target as HTMLElement).closest(".page-hotspot") || isFlipping) return;
            if (zoom > 100) {
              const scroll = bookScrollRef.current;
              if (!scroll) return;
              panState.current = {
                x: event.clientX,
                y: event.clientY,
                scrollLeft: scroll.scrollLeft,
                scrollTop: scroll.scrollTop,
              };
              setIsPanning(true);
              event.currentTarget.setPointerCapture(event.pointerId);
              event.stopPropagation();
            } else {
              const book = event.currentTarget.querySelector(".flipbook-zoom");
              const rect = book?.getBoundingClientRect();
              if (rect) {
                setFlipTarget(event.clientX < rect.left + rect.width / 2
                  ? Math.max(1, page - 1)
                  : Math.min(PAGE_COUNT, page + 1));
              }
            }
          }}
          onPointerMove={(event) => {
            const pan = panState.current;
            const scroll = bookScrollRef.current;
            if (!pan || !scroll) return;
            scroll.scrollLeft = pan.scrollLeft - (event.clientX - pan.x);
            scroll.scrollTop = pan.scrollTop - (event.clientY - pan.y);
          }}
          onPointerUp={endPointerInteraction}
          onPointerCancel={endPointerInteraction}
        >
          <div
            className="flipbook-zoom"
            style={{
              width: `${zoom}%`,
              maxWidth: zoom <= 100
                ? `min(${1480 * (zoom / 100)}px, calc((100svh - 200px) * ${1.5 * (zoom / 100)}))`
                : `${1480 * (zoom / 100)}px`,
            }}
          >
            <div
              className="flipbook-scale"
              style={{
                width: `${10000 / zoom}%`,
                height: `${10000 / zoom}%`,
                transform: `scale(${zoom / 100})`,
              }}
            >
            <HTMLFlipBook
              key={bookInstance}
              ref={flipbookRef}
              className={`magazine-book ${visualPage === 1 ? "is-front-cover" : ""} ${visualPage === PAGE_COUNT ? "is-back-cover" : ""}`}
              style={{}}
              renderOnlyPageLengthChange
              width={720}
              height={960}
              size="stretch"
              minWidth={260}
              maxWidth={720}
              minHeight={347}
              maxHeight={960}
              startPage={physicalIndexForSource(page)}
              drawShadow
              flippingTime={1050}
              usePortrait
              startZIndex={1}
              autoSize
              maxShadowOpacity={0.72}
              showCover
              mobileScrollSupport={false}
              clickEventForward
              useMouseEvents
              swipeDistance={18}
              showPageCorners
              disableFlipByClick
              onInit={(event: { object: FlipController }) => {
                [0, PHYSICAL_PAGES.length - 1].forEach((index) => {
                  const cover = event.object.getPage(index);
                  cover.setDensity("soft");
                  cover.setDrawingDensity("soft");
                });
                event.object.turnToPage(physicalIndexForSource(page));
              }}
              onFlip={(event: { data: number }) => setPage(sourceForPhysicalIndex(event.data))}
              onChangeState={(event: { data: string }) => {
                const flipping = event.data === "flipping" || event.data === "user_fold";
                if (event.data === "flipping" && !soundPlayedRef.current) {
                  soundPlayedRef.current = true;
                  playTurnSound();
                }
                setIsFlipping(flipping);
                if (event.data === "read") {
                  soundPlayedRef.current = false;
                  setFlipTarget(null);
                }
              }}
            >
              {PHYSICAL_PAGES.map((physicalPage) => (
                <MagazinePhysicalPage
                  key={physicalPage.key}
                  physicalPage={physicalPage}
                />
              ))}
            </HTMLFlipBook>
            {page > 1 && page < PAGE_COUNT && (
              <div className="active-page-hotspots" aria-label="Interactive links on this page">
                {hotspots
                  .filter((hotspot) => hotspot.page === page)
                  .map((hotspot) => (
                    <PhysicalHotspot
                      key={`active-${hotspot.id}`}
                      hotspot={hotspot}
                      side="single"
                      onPlayAudio={playAudio}
                    />
                  ))}
              </div>
            )}
            </div>
          </div>
        </div>

        <button className="page-turn-zone page-turn-right" onClick={next} disabled={page === PAGE_COUNT || isFlipping} aria-label="Next page">
          <ChevronRight />
        </button>
      </section>

      <footer className="reader-footer">
        <div className="zoom-control">
          <Button variant="ghost" size="icon" onClick={() => setAnchoredZoom(zoom - 10)} disabled={zoom <= 80} aria-label="Zoom out"><ZoomOut /></Button>
          <Slider value={[zoom]} min={80} max={200} step={5} onValueChange={(value) => setAnchoredZoom(value[0])} aria-label="Zoom level" />
          <Button variant="ghost" size="icon" onClick={() => setAnchoredZoom(zoom + 10)} disabled={zoom >= 200} aria-label="Zoom in"><ZoomIn /></Button>
          <span>{zoom}%</span>
        </div>
        <div className="footer-nav">
          <Button variant="outline" size="icon" onClick={previous} disabled={page === 1} aria-label="Previous page"><ChevronLeft /></Button>
          <Button variant="outline" size="icon" onClick={next} disabled={page === PAGE_COUNT} aria-label="Next page"><ChevronRight /></Button>
        </div>
      </footer>

      {activeAudio && (
        <aside className="audio-dock" aria-label="Audio player">
          <Button variant="ghost" size="icon" onClick={() => playAudio(activeAudio)} aria-label={audioPlaying ? "Pause audio" : "Play audio"}>
            {audioPlaying ? <Pause /> : <Play />}
          </Button>
          <div>
            <span>Now playing</span>
            <strong>{activeAudio.label}</strong>
          </div>
          <audio ref={audioRef} src={activeAudio.href} onEnded={() => setAudioPlaying(false)} onPause={() => setAudioPlaying(false)} onPlay={() => setAudioPlaying(true)} />
          <Button variant="ghost" size="icon" onClick={() => { audioRef.current?.pause(); setActiveAudio(null); }} aria-label="Close audio"><X /></Button>
        </aside>
      )}
    </main>
  );
}

const MagazinePhysicalPage = forwardRef<
  HTMLDivElement,
  {
    physicalPage: PhysicalPage;
  }
>(function MagazinePhysicalPage({ physicalPage }, ref) {
  const { sourcePage, side } = physicalPage;
  return (
    <div ref={ref} className={`physical-page physical-${side}`} data-density="soft">
      <img className="physical-page-image" src={pageImage(sourcePage)} alt={`Business Intelligence Journal page ${sourcePage}`} draggable={false} />
      {sourcePage === 1 && <CoverLightAnimation />}
      {side !== "single" && <span className="physical-page-edge" aria-hidden="true" />}
    </div>
  );
});

function PhysicalHotspot({ hotspot, side, onPlayAudio }: { hotspot: Hotspot; side: PhysicalPage["side"]; onPlayAudio: (hotspot: Hotspot) => void }) {
  const halfStart = side === "right" ? 0.5 : 0;
  const halfEnd = side === "left" ? 0.5 : 1;
  const start = Math.max(hotspot.x, halfStart);
  const end = Math.min(hotspot.x + hotspot.w, halfEnd);
  if (end <= start) return null;
  const scale = side === "single" ? 1 : 2;
  const style = {
    left: `${(start - halfStart) * scale * 100}%`,
    top: `${hotspot.y * 100}%`,
    width: `${(end - start) * scale * 100}%`,
    height: `${hotspot.h * 100}%`,
  };
  const className = `page-hotspot hotspot-${hotspot.source} animation-${hotspot.animation}`;
  const protectHotspot = (event: React.SyntheticEvent) => event.stopPropagation();
  const openHotspotLink = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.stopPropagation();
  };
  if (hotspot.kind === "audio") {
    return (
      <button
        type="button"
        style={style}
        className={className}
        onMouseDown={protectHotspot}
        onTouchStart={protectHotspot}
        onPointerDown={protectHotspot}
        onClick={(event) => { event.stopPropagation(); onPlayAudio(hotspot); }}
        title={hotspot.label}
      >
        <Volume2 />
        <span className="sr-only">{hotspot.label}</span>
      </button>
    );
  }
  return (
    <a
      style={style}
      className={className}
      href={hotspot.href}
      target={hotspot.target}
      rel="noreferrer"
      title={hotspot.label}
      onMouseDown={protectHotspot}
      onTouchStart={protectHotspot}
      onPointerDown={protectHotspot}
      onClick={openHotspotLink}
    >
      {hotspot.source === "custom" && <ExternalLink />}
      <span className="sr-only">{hotspot.label}</span>
    </a>
  );
}

function CoverLightAnimation() {
  const nodes = [
    [59.1, 16.7, 0.2], [49.1, 51.8, 0.9], [44.8, 55.2, 1.6],
    [54.1, 60.7, 2.3], [69.1, 50.2, 3], [77.0, 54.9, 3.7],
    [75.6, 61.9, 4.4], [69.8, 70.4, 5.1], [75.4, 73.8, 5.8],
    [57.7, 75.4, 0.6], [59.2, 80.4, 1.3], [47.7, 86.8, 2],
    [59.9, 88.4, 2.7], [65.5, 94.6, 3.4], [51.5, 95.1, 4.1],
    [25.6, 68.2, 4.8], [28.9, 78.3, 5.5], [40.4, 83.1, 0.4],
    [6.8, 91.9, 1.1],
  ];
  return (
    <svg
      className="cover-light-overlay"
      viewBox="0 0 100 133.26"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <filter id="coverGlow" x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="0.46" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="coverSparkGlow" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="0.82" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <linearGradient id="coverTrail" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.46" stopColor="#fff5d8" stopOpacity="0.92" />
          <stop offset="0.58" stopColor="#ff9f1c" stopOpacity="0.95" />
          <stop offset="1" stopColor="#ff5f00" stopOpacity="0" />
        </linearGradient>
        <path id="brainWireTop" d="M60 10 C56 15 51 20 50 27 C49 34 54 39 52 45 C51 49 48 50 49 52" />
        <path id="brainUpper" d="M25 67 C29 58 34 52 44 51 C53 49 58 53 63 51 C68 48 72 49 77 53 C82 57 84 64 81 70 C78 75 73 78 68 75" />
        <path id="brainLoopLeft" d="M26 68 C22 72 19 77 20 83 C21 88 27 92 34 91 C40 90 45 85 41 80 C37 75 31 78 29 82 C27 86 31 90 37 89" />
        <path id="brainCenter" d="M45 55 C49 51 55 52 57 56 C59 61 53 63 54 68 C55 73 61 75 63 70 C65 65 60 61 63 58 C66 55 71 57 71 61 C71 66 67 69 69 73 C72 78 78 75 77 70" />
        <path id="brainCross" d="M31 59 C36 54 42 56 43 60 C44 65 39 68 42 72 C46 77 52 73 50 68 C48 63 41 62 36 61 C31 60 27 63 26 67" />
        <path id="brainLower" d="M29 78 C34 82 39 84 45 84 C52 84 56 88 54 92 C52 96 45 98 38 96 C31 94 25 89 22 85" />
        <path id="brainLowerRight" d="M48 77 C52 80 56 82 61 81 C66 80 72 83 73 88 C74 92 69 95 65 95 C59 96 56 92 57 88 C58 84 62 83 67 84" />
        <path id="brainWireSides" d="M7 92 C13 92 18 91 21 87 M78 83 C84 87 91 86 100 77" />
        <path id="brainWireBottom" d="M51 95 C48 102 43 108 40 114 C37 120 38 127 39 133" />
      </defs>

      <g className="cover-trails" fill="none" stroke="url(#coverTrail)" strokeLinecap="round" filter="url(#coverGlow)">
        <use href="#brainWireTop" pathLength="100" />
        <use href="#brainUpper" pathLength="100" />
        <use href="#brainLoopLeft" pathLength="100" />
        <use href="#brainCenter" pathLength="100" />
        <use href="#brainCross" pathLength="100" />
        <use href="#brainLower" pathLength="100" />
        <use href="#brainLowerRight" pathLength="100" />
        <use href="#brainWireSides" pathLength="100" />
        <use href="#brainWireBottom" pathLength="100" />
      </g>

      <g className="cover-nodes" filter="url(#coverSparkGlow)">
        {nodes.map(([cx, cy, delay], index) => (
          <g key={index} style={{ animationDelay: `${delay}s` }}>
            <circle className="node-halo" cx={cx} cy={cy} r="0.92" />
            <circle className="node-core" cx={cx} cy={cy} r="0.25" />
          </g>
        ))}
      </g>

      <g className="cover-moving-sparks" fill="#fff8dc" filter="url(#coverSparkGlow)">
        <circle r="0.31"><animateMotion dur="5.9s" repeatCount="indefinite"><mpath href="#brainWireTop" /></animateMotion></circle>
        <circle r="0.34"><animateMotion dur="5.2s" begin="-1.8s" repeatCount="indefinite"><mpath href="#brainUpper" /></animateMotion></circle>
        <circle r="0.3"><animateMotion dur="4.7s" begin="-2.9s" repeatCount="indefinite"><mpath href="#brainLoopLeft" /></animateMotion></circle>
        <circle r="0.34"><animateMotion dur="4.4s" begin="-1.2s" repeatCount="indefinite"><mpath href="#brainCenter" /></animateMotion></circle>
        <circle r="0.29"><animateMotion dur="4.9s" begin="-3.4s" repeatCount="indefinite"><mpath href="#brainCross" /></animateMotion></circle>
        <circle r="0.32"><animateMotion dur="5.6s" begin="-2.2s" repeatCount="indefinite"><mpath href="#brainLower" /></animateMotion></circle>
        <circle r="0.34"><animateMotion dur="5s" begin="-3.1s" repeatCount="indefinite"><mpath href="#brainLowerRight" /></animateMotion></circle>
        <circle r="0.3"><animateMotion dur="6.1s" begin="-4.3s" repeatCount="indefinite"><mpath href="#brainWireSides" /></animateMotion></circle>
      </g>
    </svg>
  );
}
