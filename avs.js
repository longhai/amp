"use strict";
let avsCanvas = null, avsCtx = null, avsRaf = null, avsMode = 0, avsState = { disp: null, peak: null, peakFall: null };
const AVS_COLORS = [["#4c4", "#ec3", "#e33"], ["#6cf", "#36c", "#c6f"], ["#f80", "#fc0", "#f40"]];
function onAVSButton(b){
  const a = b.action;
  if (a === "CLOSE") toggleWindow("avs");
  else if (a === "MINIMIZE") toggleWindow("avs");
  else if (a === "VIS_Next" || a === "VIS_Prev") { avsMode = (avsMode + 1) % AVS_COLORS.length; setStatus("Kiểu hiệu ứng: " + (avsMode + 1) + "/" + AVS_COLORS.length); }
  else onMainButton(b);
}
function drawAVS(){
  avsRaf = requestAnimationFrame(drawAVS);
  if (!avsCanvas || !avsCtx) return;
  const an = (typeof getAnalyser === "function") ? getAnalyser() : null;
  const w = avsCanvas.width, h = avsCanvas.height;
  avsCtx.clearRect(0, 0, w, h);
  if (!an) {
    avsCtx.strokeStyle = "#335"; avsCtx.beginPath();
    avsCtx.moveTo(0, h - 1); avsCtx.lineTo(w, h - 1); avsCtx.stroke();
    return;
  }
  const data = new Uint8Array(an.frequencyBinCount);
  an.getByteFrequencyData(data);
  const bars = 32;
  let ramp, peakColor;
  if (avsMode === 0) { const r = visRamp(); ramp = r.ramp; peakColor = r.peak; }
  else { const c = AVS_COLORS[avsMode]; ramp = [[0, c[2]], [0.5, c[1]], [1, c[0]]]; peakColor = "#ffffff"; }
  paintVisBars(avsCtx, data, w, h, avsState, bars, ramp, peakColor);
}
async function openAVSMonitor(quiet){
  visMonitor = true;
  try { await ensureEqJs(); } catch (e) {}
  if (typeof refreshMonitor === "function") await refreshMonitor();
  if (!quiet && !eqState.on) setStatus("Hiệu ứng đang mở: tiếng đi qua bộ phân tích (nhẹ như khi EQ bật) — đóng hiệu ứng để về bypass thẳng ra loa");
  if (!avsRaf) drawAVS();
}
window.__avsOpened = openAVSMonitor;
window.__avsClosed = async (quiet) => {
  visMonitor = false;
  if (avsRaf) { cancelAnimationFrame(avsRaf); avsRaf = null; }
  if (typeof refreshMonitor === "function") { try { await refreshMonitor(); } catch (e) {} }
  if (!quiet) setStatus("Đã đóng Hiệu ứng — tiếng về bypass thẳng ra loa");
};
/* Gắn canvas hiệu ứng vào một container cho trước (vùng AVS nhúng trong
   cửa sổ chính). Dùng chung vòng vẽ drawAVS với cửa sổ Hiệu ứng rời. */
function attachAvsCanvas(parent, rect){
  const cv = document.createElement("canvas");
  cv.className = "avscv";
  cv.style.position = "absolute";
  cv.style.left = rect.x + "px"; cv.style.top = rect.y + "px";
  cv.style.width = rect.w + "px"; cv.style.height = rect.h + "px";
  cv.width = Math.max(40, rect.w); cv.height = Math.max(20, rect.h);
  parent.appendChild(cv);
  avsCanvas = cv; avsCtx = cv.getContext("2d");
  return cv;
}
window.__attachAvsCanvas = attachAvsCanvas;
window.__getAvsCanvas = () => avsCanvas;
async function buildAVSWindow(skin, res){
  const win = document.createElement("div");
  win.className = "win"; win.id = "avswin";
  const av = skin.avs;
  const mkCanvas = (rect) => {
    const cv = document.createElement("canvas");
    cv.className = "avscv";
    cv.style.left = rect.x + "px"; cv.style.top = rect.y + "px";
    cv.style.width = rect.w + "px"; cv.style.height = rect.h + "px";
    cv.width = Math.max(40, rect.w); cv.height = Math.max(20, rect.h);
    win.appendChild(cv);
    avsCanvas = cv; avsCtx = cv.getContext("2d");
    win._flexBox = cv; win._flexRect = { x: rect.x, y: rect.y, w: rect.w, h: rect.h };
    return cv;
  };
  if (av) {
    const sz = getWinSize("avs", av.w, av.h);
    win.dataset.w = sz.w; win.dataset.h = sz.h;
    win.style.width = sz.w + "px"; win.style.height = sz.h + "px";
    win.style.backgroundColor = "#000";
    if (av.backgroundFile) {
      const bg = await resolveImg(res, av.background, av.backgroundFile);
      if (bg) { win.style.backgroundImage = "url(" + JSON.stringify(bg) + ")"; win.style.backgroundSize = sz.w + "px " + sz.h + "px"; win._bgImg = true; }
    }
    await renderFrameInto(win, av.frame, res);
    for (const b of (av.frame && av.frame.buttons || [])) b._winKind = "avs";
    for (const bg of (av.backgrounds || [])) {
      if (!bg.imageFile) continue;
      const src = await resolveImg(res, bg.image, bg.imageFile);
      if (src) win.appendChild(imgElSrc(src, bg.x, bg.y, bg.w, bg.h));
    }
    for (const lay of av.layers) {
      if (!lay.imageFile) continue;
      const src = await resolveImg(res, lay.image, lay.imageFile);
      if (src) win.appendChild(imgElSrc(src, lay.x, lay.y, lay.w, lay.h));
    }
    let r = null;
    let rNative = false;
    if (av.listRect && av.listRect.w > 20 && av.listRect.h > 20) { r = av.listRect; rNative = true; }
    else if (av.vis && av.vis[0]) { r = { x: av.vis[0].x, y: av.vis[0].y, w: av.vis[0].w || 72, h: av.vis[0].h || 25 }; rNative = true; }
    else r = { x: 6, y: 24, w: sz.w - 12, h: sz.h - 30 };
    mkCanvas(r);
    win._flexInsetR = sz.w - (r.x + r.w); win._flexInsetB = sz.h - (r.y + r.h);
    for (const b of av.buttons) await buildButton(b, win, res, onAVSButton);
    if (rNative) {
      win._pin = buildPinRecord(win, av.w, av.h, r);
      if (sz.h < win._pin.minH) { sz.h = win._pin.minH; win.dataset.h = sz.h; win.style.height = sz.h + "px"; }
      applyWinLayout(win, sz.w, sz.h);
    }
  } else {
    const sz = getWinSize("avs", 354, 200);
    win.dataset.w = sz.w; win.dataset.h = sz.h;
    win.classList.add("plfallback");
    win.style.width = sz.w + "px"; win.style.height = sz.h + "px";
    const title = document.createElement("div");
    title.className = "title"; title.textContent = "Hiệu ứng (Vis)";
    win.appendChild(title);
    const x = document.createElement("button");
    x.className = "x"; x.textContent = "✕";
    x.addEventListener("click", () => toggleWindow("avs"));
    win.appendChild(x);
    mkCanvas({ x: 6, y: 24, w: sz.w - 12, h: sz.h - 30 });
    win._flexInsetR = 6; win._flexInsetB = 6;
  }
  addResizeHandle(win, "avs");
  await openAVSMonitor();
  return win;
}
