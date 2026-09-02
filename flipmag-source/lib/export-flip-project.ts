"use client";

import JSZip from "jszip";
import { assetUrl, FlipHotspot, FlipPage, FlipProject } from "@/lib/flipmag";

type ExportPage = Pick<FlipPage, "pageNumber" | "title" | "layout" | "width" | "height"> & { file: string };
type ExportHotspot = Omit<FlipHotspot, "projectId">;

const extensionFor = (contentType: string, fallback: string) => {
  const type = contentType.split(";")[0].trim().toLowerCase();
  return ({
    "image/webp": "webp", "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif",
    "audio/mpeg": "mp3", "audio/wav": "wav", "audio/ogg": "ogg", "audio/mp4": "m4a",
    "video/mp4": "mp4", "video/webm": "webm", "video/ogg": "ogv",
  } as Record<string, string>)[type] || fallback;
};

const safeJson = (value: unknown) => JSON.stringify(value).replaceAll("<", "\\u003c");

function buildStandaloneHtml(project: FlipProject, pages: ExportPage[], hotspots: ExportHotspot[]) {
  const title = project.title.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>
@font-face{font-family:Mark;src:url('assets/fonts/MarkForMC-Book.ttf')}@font-face{font-family:Mark;src:url('assets/fonts/MarkForMC-Bold.ttf');font-weight:700}
:root{color-scheme:dark;font-family:Mark,Arial,sans-serif}*{box-sizing:border-box}html,body{width:100%;height:100%;margin:0;background:#090909;color:#fff;overflow:hidden}button{font:inherit}.top{height:64px;display:grid;grid-template-columns:minmax(220px,1fr) auto minmax(220px,1fr);align-items:center;padding:0 20px;border-bottom:1px solid #ffffff1c;background:#121212;position:relative;z-index:20}.brand{display:flex;align-items:center;gap:13px;min-width:0}.brand img{width:46px;height:28px;object-fit:contain}.brand b{font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.status{text-align:center;min-width:180px}.status strong{display:block;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.status span{color:#999;font-size:11px}.tools{display:flex;justify-content:flex-end}.icon,.arrow{border:1px solid #ffffff25;background:#1b1b1b;color:#fff;cursor:pointer;display:grid;place-items:center}.icon{width:40px;height:40px;border-radius:50%;font-size:19px}.icon:hover,.arrow:hover{border-color:#ff5f00}.stage{height:calc(100vh - 124px);display:grid;grid-template-columns:58px minmax(0,1fr) 58px;align-items:center;padding:14px;perspective:2200px}.arrow{width:44px;height:72px;border-radius:12px;font-size:34px;z-index:12}.arrow:disabled{opacity:.22;cursor:default}.viewport{width:100%;height:100%;overflow:auto;display:grid;place-items:safe center;position:relative}.viewport.pannable{cursor:grab;touch-action:none}.viewport.panning{cursor:grabbing;user-select:none}.zoom{width:min(1180px,calc(100vw - 160px));height:min(78vh,850px);transform-origin:center center;transition:transform .16s ease;display:grid;place-items:center}.book{margin:auto}.sheet{position:relative;background:#111;overflow:hidden;box-shadow:0 24px 70px #000b}.sheet>img{position:absolute;inset:0;width:100%;height:100%;object-fit:fill;pointer-events:none;user-select:none}.sheet.side-left>img,.sheet.side-right>img{width:200%;max-width:none}.sheet.side-left>img{left:0}.sheet.side-right>img{left:-100%}.sheet.side-left:after,.sheet.side-right:after{content:"";position:absolute;top:0;bottom:0;width:14px;pointer-events:none;z-index:4}.sheet.side-left:after{right:0;background:linear-gradient(90deg,transparent,#0008)}.sheet.side-right:after{left:0;background:linear-gradient(90deg,#0008,transparent)}.hotspot{position:absolute;z-index:10;border:1px solid transparent;border-radius:4px;background:transparent;color:#fff;display:grid;place-items:center;cursor:pointer;text-decoration:none;pointer-events:auto}.hotspot:hover,.hotspot:focus-visible{background:#ff5f0027;border-color:#ff5f00;outline:none}.animation-glow{animation:glow 1.8s ease-in-out infinite alternate}.animation-pulse{animation:pulse 1.8s ease-out infinite}.animation-float{animation:float 2s ease-in-out infinite}@keyframes glow{to{box-shadow:0 0 20px #ff5f00}}@keyframes pulse{50%{box-shadow:0 0 0 9px #ff5f0000;border-color:#ff5f00}}@keyframes float{50%{transform:translateY(-5px)}}.footer{height:60px;border-top:1px solid #ffffff1c;background:#121212;display:flex;align-items:center;justify-content:center;gap:12px}.footer input{width:min(330px,45vw);accent-color:#ff5f00}.footer output{font-size:12px;color:#bbb;width:44px}.media{display:none;position:fixed;inset:0;z-index:50;background:#000b;place-items:center;padding:22px}.media.open{display:grid}.media-card{width:min(720px,92vw);background:#191919;border:1px solid #ffffff25;border-radius:18px;padding:18px;box-shadow:0 28px 90px #000;position:relative}.media-card strong{display:block;margin:0 48px 15px 0}.media-card audio,.media-card video{display:block;width:100%;max-height:70vh}.media-close{position:absolute;right:12px;top:12px}
@media(max-width:720px){.top{grid-template-columns:1fr auto;height:58px;padding:0 12px}.brand b{font-size:11px}.status{display:none}.stage{height:calc(100vh - 112px);grid-template-columns:38px minmax(0,1fr) 38px;padding:7px}.arrow{width:34px;height:60px}.zoom{width:calc(100vw - 92px);height:76vh}.footer{height:54px}}
.book{transition:transform 1100ms cubic-bezier(.2,.62,.22,1);will-change:transform}.book.is-front-cover{transform:translateX(-25%)}.book.is-back-cover{transform:translateX(25%)}
</style></head><body>
<header class="top"><div class="brand"><img src="assets/mastercard-symbol.png" alt="Mastercard"><b>${title}</b></div><div class="status"><strong id="pageTitle"></strong><span><b id="pageNo">1</b> / ${pages.length}</span></div><div class="tools"><button class="icon" id="full" aria-label="Fullscreen">⛶</button></div></header>
<main class="stage"><button class="arrow" id="prev" aria-label="Previous page">‹</button><div class="viewport" id="viewport"><div class="zoom" id="zoomWrap"><div class="book" id="book"></div></div></div><button class="arrow" id="next" aria-label="Next page">›</button></main>
<footer class="footer"><span>−</span><input id="zoom" type="range" min="70" max="220" step="5" value="100"><span>+</span><output id="zoomValue">100%</output></footer>
<aside class="media" id="media"><div class="media-card"><button class="icon media-close" id="mediaClose">×</button><strong id="mediaTitle"></strong><div id="mediaBody"></div></div></aside>
<script src="vendor/page-flip.browser.js"></script><script>
const PROJECT=${safeJson({ title: project.title, slug: project.slug })};
const PAGES=${safeJson(pages)};const HOTSPOTS=${safeJson(hotspots)};
const physical=PAGES.flatMap(p=>p.layout==='spread'?[{source:p.pageNumber,side:'left'},{source:p.pageNumber,side:'right'}]:[{source:p.pageNumber,side:'single'}]);
const byNumber=n=>PAGES.find(p=>p.pageNumber===n)||PAGES[0];const pageIndex=n=>Math.max(0,PAGES.findIndex(p=>p.pageNumber===n));const physicalIndex=n=>Math.max(0,physical.findIndex(p=>p.source===n));
const book=document.getElementById('book'),viewport=document.getElementById('viewport'),zoom=document.getElementById('zoom'),zoomWrap=document.getElementById('zoomWrap');let current=PAGES[0]?.pageNumber||1,pan=null;
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function addHotspot(sheet,spot,side){const halfStart=side==='right'?.5:0,halfEnd=side==='left'?.5:1,start=Math.max(spot.x,halfStart),end=Math.min(spot.x+spot.width,halfEnd);if(end<=start)return;const scale=side==='single'?1:2;const el=document.createElement(spot.kind==='link'?'a':'button');el.className='hotspot animation-'+spot.animation;el.style.left=((start-halfStart)*scale*100)+'%';el.style.top=(spot.y*100)+'%';el.style.width=((end-start)*scale*100)+'%';el.style.height=(spot.height*100)+'%';el.title=spot.label||spot.kind;if(spot.kind==='link'){el.href=spot.href;el.target=spot.target||'_blank';el.rel='noreferrer';el.setAttribute('aria-label',spot.label||'Open link')}else{el.type='button';el.textContent=spot.kind==='audio'?'♪':'▶';el.onclick=e=>{e.stopPropagation();openMedia(spot)}}el.addEventListener('pointerdown',e=>e.stopPropagation());el.addEventListener('click',e=>e.stopPropagation());sheet.appendChild(el)}
physical.forEach(item=>{const p=byNumber(item.source),sheet=document.createElement('div');sheet.className='sheet side-'+item.side;const img=document.createElement('img');img.src=p.file;img.alt=p.title;img.draggable=false;sheet.appendChild(img);HOTSPOTS.filter(h=>h.pageNumber===item.source).forEach(h=>addHotspot(sheet,h,item.side));book.appendChild(sheet)});
const flip=new St.PageFlip(book,{width:720,height:960,size:'stretch',minWidth:260,maxWidth:720,minHeight:347,maxHeight:960,showCover:true,usePortrait:true,drawShadow:true,maxShadowOpacity:.78,flippingTime:1100,mobileScrollSupport:false,clickEventForward:true,useMouseEvents:true,swipeDistance:18,showPageCorners:true,autoSize:true});flip.loadFromHTML(document.querySelectorAll('.sheet'));
function sync(){const p=byNumber(current),i=pageIndex(current);document.getElementById('pageTitle').textContent=p?.title||PROJECT.title;document.getElementById('pageNo').textContent=String(i+1);document.getElementById('prev').disabled=i<=0;document.getElementById('next').disabled=i>=PAGES.length-1;book.classList.toggle('is-front-cover',i===0);book.classList.toggle('is-back-cover',i===PAGES.length-1)}flip.on('flip',e=>{current=physical[e.data]?.source||current;sync()});
function go(delta){const i=pageIndex(current),next=PAGES[Math.max(0,Math.min(PAGES.length-1,i+delta))];if(!next||next.pageNumber===current)return;if(i===0&&delta>0)flip.flipNext('top');else if(i===1&&delta<0)flip.flipPrev('top');else flip.flip(physicalIndex(next.pageNumber),'top')}
function applyZoom(){const value=Number(zoom.value);zoomWrap.style.transform='scale('+(value/100)+')';viewport.classList.toggle('pannable',value>100);document.getElementById('zoomValue').textContent=value+'%'}
function openMedia(spot){document.getElementById('mediaTitle').textContent=spot.label||spot.kind;document.getElementById('mediaBody').innerHTML=spot.kind==='video'?'<video src="'+esc(spot.href)+'" controls autoplay playsinline></video>':'<audio src="'+esc(spot.href)+'" controls autoplay></audio>';document.getElementById('media').classList.add('open')}
viewport.addEventListener('pointerdown',e=>{if(Number(zoom.value)<=100||e.target.closest('.hotspot'))return;pan={x:e.clientX,y:e.clientY,left:viewport.scrollLeft,top:viewport.scrollTop};viewport.classList.add('panning');viewport.setPointerCapture(e.pointerId)});viewport.addEventListener('pointermove',e=>{if(!pan)return;viewport.scrollLeft=pan.left-(e.clientX-pan.x);viewport.scrollTop=pan.top-(e.clientY-pan.y)});function endPan(e){pan=null;viewport.classList.remove('panning');if(viewport.hasPointerCapture(e.pointerId))viewport.releasePointerCapture(e.pointerId)}viewport.addEventListener('pointerup',endPan);viewport.addEventListener('pointercancel',endPan);viewport.addEventListener('wheel',e=>{e.preventDefault();zoom.value=String(Math.max(70,Math.min(220,Number(zoom.value)+(e.deltaY>0?-10:10))));applyZoom()},{passive:false});
document.getElementById('prev').onclick=()=>go(-1);document.getElementById('next').onclick=()=>go(1);zoom.oninput=applyZoom;document.getElementById('full').onclick=()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();document.getElementById('mediaClose').onclick=()=>{document.getElementById('media').classList.remove('open');document.getElementById('mediaBody').innerHTML=''};addEventListener('keydown',e=>{if(e.key==='ArrowLeft')go(-1);if(e.key==='ArrowRight')go(1)});sync();
</script></body></html>`;
}

async function fetchBlob(url: string, label: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not package ${label}`);
  return { blob: await response.blob(), contentType: response.headers.get("content-type") || "" };
}

export async function downloadFlipProjectZip(project: FlipProject, pages: FlipPage[], hotspots: FlipHotspot[]) {
  const zip = new JSZip();
  const assets = zip.folder("assets");
  const exportPages: ExportPage[] = [];
  for (const page of pages) {
    const result = await fetchBlob(assetUrl(page.imageKey), `page ${page.pageNumber}`);
    const filename = `pages/page-${String(page.pageNumber).padStart(3, "0")}.${extensionFor(result.contentType, "webp")}`;
    assets?.file(filename, result.blob);
    exportPages.push({ pageNumber: page.pageNumber, title: page.title, layout: page.layout, width: page.width, height: page.height, file: `assets/${filename}` });
  }
  const exportHotspots: ExportHotspot[] = [];
  for (const hotspot of hotspots) {
    let href = hotspot.href;
    if (hotspot.kind !== "link" && href.startsWith("/")) {
      const result = await fetchBlob(href, hotspot.label || hotspot.kind);
      const filename = `media/${hotspot.id}.${extensionFor(result.contentType, hotspot.kind === "audio" ? "mp3" : "mp4")}`;
      assets?.file(filename, result.blob);
      href = `assets/${filename}`;
    }
    const { projectId: _projectId, ...portable } = hotspot;
    void _projectId;
    exportHotspots.push({ ...portable, href });
  }
  const [logo, pageFlip, ...fonts] = await Promise.all([
    fetchBlob("/assets/mastercard-symbol.png", "Mastercard logo"),
    fetchBlob("/vendor/page-flip.browser.js", "page flip engine"),
    ...["MarkForMC-Book.ttf", "MarkForMC-Bold.ttf"].map((font) => fetchBlob(`/fonts/${font}`, font)),
  ]);
  assets?.file("mastercard-symbol.png", logo.blob);
  zip.folder("vendor")?.file("page-flip.browser.js", pageFlip.blob);
  ["MarkForMC-Book.ttf", "MarkForMC-Bold.ttf"].forEach((font, index) => assets?.folder("fonts")?.file(font, fonts[index].blob));
  zip.file("index.html", buildStandaloneHtml(project, exportPages, exportHotspots));
  zip.file("hotspots.json", JSON.stringify(exportHotspots, null, 2));
  zip.file("README.txt", `${project.title}\n\nUpload index.html, assets and vendor to the same directory on any web server. Open index.html through that server. Links and packaged audio/video are included.`);
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${project.slug || "flipbook"}-html.zip`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
