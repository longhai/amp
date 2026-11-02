"use strict";
const EQ_FREQS = [60,170,310,600,1000,3000,6000,12000,14000,16000];
const EQ_PRESETS = {
  "Flat":        { preamp: 0, bands: [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  "Rock":        { preamp: 0, bands: [ 4, 3,-1,-2,-1, 1, 3, 4, 5, 5] },
  "Pop":         { preamp: 0, bands: [ 2, 3, 3, 2,-1,-1, 1, 2, 3, 4] },
  "Classical":   { preamp: 0, bands: [ 3, 2, 0,-1,-1, 0, 2, 3, 4, 5] },
  "Full Bass":   { preamp: 0, bands: [ 6, 5, 4, 2, 0,-1,-2,-3,-3,-4] },
  "Full Treble": { preamp: 0, bands: [-4,-3,-2,-1, 0, 2, 4, 5, 6, 6] }
};

/* preamp dB -> tuyến tính (GainNode) */
function applyEQGains(){
  if (!eqNodes) return;
  eqNodes.preamp.gain.value = Math.pow(10, eqState.preamp / 20);
  eqNodes.filters.forEach((f, i) => { f.gain.value = eqState.bands[i]; });
}
function ensureAudioGraph(){
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const preamp = audioCtx.createGain();
  const filters = EQ_FREQS.map(f => {
    const b = audioCtx.createBiquadFilter();
    b.type = "peaking"; b.frequency.value = f; b.Q.value = 1.0; b.gain.value = 0;
    return b;
  });
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256; analyser.smoothingTimeConstant = 0.7;
  let node = preamp;
  for (const f of filters) { node.connect(f); node = f; }
  node.connect(analyser); analyser.connect(audioCtx.destination);
  eqNodes = { el: null, src: null, preamp, filters, analyser };
  applyEQGains();
}
async function resumeAudioCtx(){
  if (audioCtx && audioCtx.state === "suspended") {
    try { await Promise.race([audioCtx.resume(), new Promise(r => setTimeout(r, 1500))]); } catch (e) {}
  }
}
function auResumeState(){
  const videoActive = !!(typeof videoEl !== "undefined" && videoEl && typeof videoChan !== "undefined" && videoChan && !videoEl.paused);
  return { wasPlaying: !au.paused && !videoActive, wasTime: au.currentTime || 0 };
}
function makeAudioElement(withCors){
  const wasVol = au.volume;
  const el = document.createElement("audio");
  el.id = "au"; el.preload = "none"; el.volume = wasVol;
  if (withCors) el.crossOrigin = "anonymous";
  au.replaceWith(el);
  au = el;
  bindAudio(au);
  return el;
}
function currentSourceURL(){
  if (mode === "file" && fileBlobURL) return fileBlobURL;
  if (mode === "radio" && channels[idx]) return channels[idx].url;
  return null;
}
async function attachCurrentSource(oldHls){
  const url = currentSourceURL();
  if (!url) { if (oldHls) { try { oldHls.destroy(); } catch (e) {} } hls = null; return; }
  if (/\.m3u8($|\?)/i.test(url) && window.Hls && Hls.isSupported()) {
    const newHls = new Hls({ maxBufferLength: 30 });
    newHls.loadSource(url); newHls.attachMedia(au);
    newHls.on(Hls.Events.ERROR, (ev, data) => {
      if (!data || !data.fatal) return;
      if (data.type === Hls.ErrorTypes.NETWORK_ERROR) { try { newHls.startLoad(); } catch (e) {} return; }
      if (data.type === Hls.ErrorTypes.MEDIA_ERROR) { try { newHls.recoverMediaError(); } catch (e) {} return; }
      handleFail("HLS " + (data.type || "") + " " + (data.details || ""));
    });
    await new Promise(resolve => {
      const timer = setTimeout(() => { newHls.off(Hls.Events.MANIFEST_PARSED, onParsed); resolve(); }, 8000);
      const onParsed = () => { clearTimeout(timer); newHls.off(Hls.Events.MANIFEST_PARSED, onParsed); resolve(); };
      newHls.on(Hls.Events.MANIFEST_PARSED, onParsed);
    });
    if (oldHls) { try { oldHls.destroy(); } catch (e) {} }
    hls = newHls;
  } else {
    if (oldHls) { try { oldHls.destroy(); } catch (e) {} }
    hls = null;
    au.src = url;
  }
}
async function cutover(oldEl, oldSrc, wasPlaying, wasTime){
  if (wasPlaying) {
    if (mode === "file" && isFinite(au.duration) && au.duration > 0 && wasTime > 0 && wasTime < au.duration) { try { au.currentTime = wasTime; } catch (e) {} }
    try { await au.play(); } catch (e) {}
  }
  if (oldSrc) { try { oldSrc.disconnect(); } catch (e) {} }
  if (oldEl && oldEl !== au) { try { oldEl.pause(); } catch (e) {} }
}
async function enableEQ(){
  ensureAudioGraph();
  await resumeAudioCtx();
  if (eqNodes && eqNodes.src && eqNodes.el === au) { applyEQGains(); eqStateHook(); return; }
  const { wasPlaying, wasTime } = auResumeState();
  const oldEl = au, oldSrc = eqNodes ? eqNodes.src : null, oldHls = hls;
  makeAudioElement(true);
  await attachCurrentSource(oldHls);
  const src = audioCtx.createMediaElementSource(au);
  src.connect(eqNodes.preamp);
  eqNodes.el = au; eqNodes.src = src;
  monitorNodes = null;
  applyEQGains();
  eqStateHook();
  await cutover(oldEl, oldSrc, wasPlaying, wasTime);
  await refreshMonitor();
}
async function disableEQ(){
  const { wasPlaying, wasTime } = auResumeState();
  const oldEl = au, oldSrc = eqNodes ? eqNodes.src : null, oldHls = hls;
  if (eqNodes) { eqNodes.src = null; eqNodes.el = null; }
  monitorNodes = null;
  makeAudioElement(false);
  await attachCurrentSource(oldHls);
  eqStateHook();
  await cutover(oldEl, oldSrc, wasPlaying, wasTime);
  await refreshMonitor();
}
let monitorNodes = null;
function getAnalyser(){
  if (!eqNodes || !eqNodes.analyser) return null;
  if (eqState.on) return eqNodes.analyser;
  if (typeof visMonitor !== "undefined" && visMonitor && monitorNodes) return eqNodes.analyser;
  return null;
}
async function refreshMonitor(){
  if (eqState.on) {
    if (monitorNodes) { try { monitorNodes.src.disconnect(); } catch (e) {} monitorNodes = null; }
    return;
  }
  if (typeof visMonitor === "undefined" || !visMonitor) {
    if (monitorNodes) {
      try { monitorNodes.src.disconnect(); } catch (e) {}
      monitorNodes = null;
      const { wasPlaying, wasTime } = auResumeState();
      const oldEl = au, oldHls = hls;
      makeAudioElement(false);
      await attachCurrentSource(oldHls);
      await cutover(oldEl, null, wasPlaying, wasTime);
    }
    return;
  }
  if (monitorNodes && monitorNodes.el === au) return;
  ensureAudioGraph();
  await resumeAudioCtx();
  if (monitorNodes) { try { monitorNodes.src.disconnect(); } catch (e) {} }
  const src = audioCtx.createMediaElementSource(au);
  src.connect(eqNodes.analyser);
  monitorNodes = { el: au, src };
}
/* bật/tắt nối tiếp nhau, không chạy chồng */
let eqBusy = Promise.resolve();
function setEQOn(on){
  const run = eqBusy.then(async () => {
    on = !!on;
    if (on === eqState.on && (on ? !!(eqNodes && eqNodes.src) : !(eqNodes && eqNodes.src))) { eqStateHook(); return; }
    eqState.on = on; saveEQState();
    updateEQToggleVisual();
    setStatus(on ? "EQ: BẬT (qua AudioContext — tiếng nhỏ hơn bypass)" : "EQ: TẮT (bypass thẳng ra loa)");
    if (on) await enableEQ(); else await disableEQ();
    updateEQToggleVisual();
    eqStateHook();
  });
  eqBusy = run.catch(() => {});
  return run;
}

let eqToggleBtns = [], eqSliderEls = [], drawerEqSliderEls = [];
function refreshEQSliders(){
  for (const sl of eqSliderEls) sl.place();
  for (const sl of drawerEqSliderEls) sl.place();
}
function isEqFillLayer(lay){
  const img = (lay.image || "").toLowerCase();
  return img.includes("full");
}
async function buildEQSlider(s, bandIndex, win, res, eq, isDrawer){
  const track = document.createElement("div");
  track.className = "eqsl";
  track.style.left = s.x + "px"; track.style.top = s.y + "px";
  track.style.width = s.w + "px"; track.style.height = s.h + "px";
  const horiz = s.orientation === "horizontal";
  let fillEl = null, stripUrl = null;
  if (s.strip && s.strip.image) {
    stripUrl = await resolveImg(res, s.strip.image, s.strip.imageFile);
    if (stripUrl) track.style.backgroundImage = "url(" + JSON.stringify(stripUrl) + ")";
  }
  if (!stripUrl) {
    const fillLay = (eq.layers || []).find(l => isEqFillLayer(l) && Math.abs((l.x || 0) - s.x) < 6 && Math.abs((l.y || 0) - s.y) < 6);
    let fillImg = null;
    if (fillLay && fillLay.imageFile) fillImg = await resolveImg(res, fillLay.image, fillLay.imageFile);
    fillEl = document.createElement("div");
    fillEl.className = "fill";
    fillEl.style.width = "100%"; fillEl.style.height = "0px";
    if (fillImg) {
      const im = document.createElement("img");
      im.src = fillImg; im.draggable = false; im.alt = "";
      im.style.width = s.w + "px"; im.style.height = s.h + "px";
      fillEl.appendChild(im);
    } else {
      fillEl.style.background = "rgba(120,180,90,.55)";
    }
    track.appendChild(fillEl);
  }
  const thumbSrc = s.thumb ? await resolveImg(res, s.thumb, s.thumbFile) : null;
  const tw = s.thumbW || 13, th = s.thumbH || 23;
  const thumb = document.createElement("div");
  thumb.className = "thumb";
  thumb.style.width = tw + "px"; thumb.style.height = th + "px";
  if (thumbSrc) {
    const im = document.createElement("img");
    im.src = thumbSrc; im.draggable = false; im.alt = "";
    thumb.appendChild(im);
  } else {
    track.style.background = "#222"; track.style.border = "1px solid #444";
    thumb.style.background = "#888"; thumb.style.border = "1px solid #bbb";
  }
  thumb.style.left = Math.round((s.w - tw) / 2) + "px";
  track.appendChild(thumb);
  const getVal = () => bandIndex < 0 ? eqState.preamp : eqState.bands[bandIndex];
  const place = () => {
    const v = getVal();
    const frac = (v + 12) / 24;
    if (horiz) {
      thumb.style.left = Math.round(frac * (s.w - tw)) + "px";
      if (fillEl) fillEl.style.width = Math.round(frac * s.w) + "px";
    } else {
      thumb.style.top = Math.round((1 - frac) * (s.h - th)) + "px";
      if (fillEl) fillEl.style.height = Math.round(frac * s.h) + "px";
    }
    if (stripUrl && s.strip) {
      const st = s.strip, cols = st.cols || 1;
      const idx = Math.round(frac * (st.n - 1));
      track.style.backgroundPosition = (-((idx % cols) * st.fw)) + "px " + (-(Math.floor(idx / cols) * st.fh)) + "px";
    }
  };
  const setVal = v => {
    v = Math.max(-12, Math.min(12, Math.round(v * 10) / 10));
    if (bandIndex < 0) eqState.preamp = v; else eqState.bands[bandIndex] = v;
    saveEQState();
    if (eqState.on) applyEQGains();
    refreshEQSliders();
    eqStateHook();
  };
  track.addEventListener("pointerdown", e => {
    try { track.setPointerCapture(e.pointerId); } catch (err) {  }
    const valFromEvent = ev => {
      const r = track.getBoundingClientRect();
      const f = horiz ? (ev.clientX - r.left) / r.width : 1 - (ev.clientY - r.top) / r.height;
      return -12 + Math.min(1, Math.max(0, f)) * 24;
    };
    setVal(valFromEvent(e));
    const mv = ev => setVal(valFromEvent(ev));
    const up = () => { track.removeEventListener("pointermove", mv); track.removeEventListener("pointerup", up); track.removeEventListener("pointercancel", up); };
    track.addEventListener("pointermove", mv);
    track.addEventListener("pointerup", up);
    track.addEventListener("pointercancel", up);
    e.preventDefault();
  });
  win.appendChild(track);
  place();
  (isDrawer ? drawerEqSliderEls : eqSliderEls).push({ bandIndex, place, setVal });
}
function applyEQPreset(name){
  const p = EQ_PRESETS[name]; if (!p) return;
  eqState.preamp = p.preamp;
  eqState.bands = p.bands.slice();
  saveEQState();
  if (eqState.on) applyEQGains();
  refreshEQSliders();
  eqStateHook();
  setStatus("EQ preset: " + name);
}
function showPresetMenu(anchorBtn){
  const old = document.querySelector(".preset-menu");
  if (old) { old.remove(); return; }
  const menu = document.createElement("div");
  menu.className = "preset-menu";
  for (const name of Object.keys(EQ_PRESETS)) {
    const b = document.createElement("button");
    b.textContent = name;
    b.addEventListener("click", () => { applyEQPreset(name); menu.remove(); });
    menu.appendChild(b);
  }
  const r = anchorBtn && anchorBtn._el ? anchorBtn._el.getBoundingClientRect() : null;
  menu.style.position = "fixed";
  menu.style.left = (r ? r.left : 8) + "px";
  menu.style.top = (r ? r.bottom + 4 : 8) + "px";
  document.body.appendChild(menu);
  const close = e => { if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener("pointerdown", close); } };
  setTimeout(() => document.addEventListener("pointerdown", close), 0);
}
async function buildEQWindow(skin, res){
  const win = document.createElement("div");
  win.className = "win"; win.id = "eqwin";
  eqToggleBtns = []; eqSliderEls = [];
  const eq = skin.eq;
  if (eq) {
    const sz = getWinSize("eq", eq.w, eq.h);
    win.dataset.w = sz.w; win.dataset.h = sz.h;
    win.style.width = sz.w + "px"; win.style.height = sz.h + "px";
    if (eq.backgroundFile) {
      const bg = await resolveImg(res, eq.background, eq.backgroundFile);
      if (bg) {
        win.style.backgroundImage = "url(" + JSON.stringify(bg) + ")";
        win.style.backgroundSize = sz.w + "px " + sz.h + "px";
        win._bgImg = true;
      }
    }
    for (const lay of eq.layers) {
      if (isEqFillLayer(lay)) continue;
      if (eq.background && lay.image === eq.background) continue;
      if (!lay.imageFile) continue;
      const src = await resolveImg(res, lay.image, lay.imageFile);
      if (src) {
        const im = imgElSrc(src, lay.x, lay.y, lay.w, lay.h);
        if (/label/i.test((lay.image || "") + " " + (lay.imageFile || ""))) { im.style.zIndex = "6"; im.style.pointerEvents = "none"; }
        win.appendChild(im);
      }
    }
    if (eq.preamp) await buildEQSlider(eq.preamp, -1, win, res, eq);
    for (let i = 0; i < eq.bands.length; i++) await buildEQSlider(eq.bands[i], i, win, res, eq);
    for (const b of eq.buttons) {
      if (!b.imageFile && !b.hoverFile && !b.downFile) continue;
      const d = await buildButton(b, win, res, onEQButton);
      if (d && b.action === "EQ_TOGGLE") {
        eqToggleBtns.push(b);
        b._stateBase = () => eqState.on ? (b._activeSrc || b._downSrc || b._src) : b._src;
      }
    }
    for (const t of eq.texts) {
      if (!t.default) continue;
      const el = document.createElement("div");
      el.className = "wtext";
      el.style.left = t.x + "px"; el.style.top = t.y + "px";
      el.style.width = (t.w || 12) + "px"; el.style.height = (t.h || 8) + "px";
      el.style.fontSize = "8px"; el.style.lineHeight = (t.h || 8) + "px";
      el.textContent = compName(t.default, "Equalizer");
      win.appendChild(el);
    }
  } else {
    const sz = getWinSize("eq", 300, 220);
    win.dataset.w = sz.w; win.dataset.h = sz.h;
    win.classList.add("plfallback");
    win.style.width = sz.w + "px"; win.style.height = sz.h + "px";
    const title = document.createElement("div");
    title.className = "title"; title.textContent = "Equalizer";
    win.appendChild(title);
    const x = document.createElement("button");
    x.className = "x"; x.textContent = "✕";
    x.addEventListener("click", () => toggleWindow("eq"));
    win.appendChild(x);
    const fakeEq = { layers: [] };
    const mk = (x0, bandIndex) => ({ x: x0, y: 40, w: 16, h: 120, orientation: "vertical", thumb: null, thumbW: 16, thumbH: 14 });
    await buildEQSlider(mk(12, -1), -1, win, res, fakeEq);
    for (let i = 0; i < 10; i++) await buildEQSlider(mk(44 + i * 24, i), i, win, res, fakeEq);
    const onBtn = document.createElement("button");
    onBtn.textContent = "EQ: TẮT"; onBtn.style.cssText = "position:absolute;left:12px;top:180px;padding:5px 10px;background:#1a1a1a;color:#ddd;border:1px solid #444;cursor:pointer;";
    onBtn.addEventListener("click", async () => { await setEQOn(!eqState.on); onBtn.textContent = eqState.on ? "EQ: BẬT" : "EQ: TẮT"; });
    win.appendChild(onBtn);
    const preBtn = document.createElement("button");
    preBtn.textContent = "Preset"; preBtn.style.cssText = "position:absolute;left:110px;top:180px;padding:5px 10px;background:#1a1a1a;color:#ddd;border:1px solid #444;cursor:pointer;";
    preBtn.addEventListener("click", () => showPresetMenu(null));
    win.appendChild(preBtn);
    win._fallbackOnBtn = onBtn;
  }
  addResizeHandle(win, "eq");
  return win;
}
function updateEQToggleVisual(){
  const all = eqToggleBtns.concat((SKIN && SKIN.buttons || []).filter(b => b.action === "EQ_TOGGLE" && b._img && eqToggleBtns.indexOf(b) < 0)).concat(window.drawerEqToggleBtns || []);
  for (const b of all) {
    if (!b._img) continue;
    b._img.src = b._base ? b._base() : b._src;
  }
  const be = $("#btn-eq");
  if (be) be.classList.toggle("on", eqState.on);
  if (eqWin && eqWin._fallbackOnBtn) eqWin._fallbackOnBtn.textContent = eqState.on ? "EQ: BẬT" : "EQ: TẮT";
}
async function onEQButton(b){
  const a = b.action, p = b.param;
  if (a === "EQ_TOGGLE") { await setEQOn(!eqState.on); setStatus(eqState.on ? "EQ: BẬT (qua AudioContext — tiếng nhỏ hơn bypass)" : "EQ: TẮT (bypass thẳng ra loa)"); }
  else if (a === "EQ_AUTO") setStatus("EQ Auto chưa làm trong bản này (giống nút Auto của Webamp fork)");
  else if (a === "MENU" && p === "presets") showPresetMenu(b);
  else if (a === "CLOSE") toggleWindow("eq");
  else if (a === "MINIMIZE") toggleWindow("eq");
}

let visState = { disp: null, peak: null, peakFall: null };
function drawVis(){
  requestAnimationFrame(drawVis);
  if (!visCanvas || !visCtx) return;
  const an = getAnalyser();
  if (!an) {
    if (visCanvas._hadVis) { visCtx.clearRect(0, 0, visCanvas.width, visCanvas.height); visCanvas._hadVis = false; }
    return;
  }
  const data = new Uint8Array(an.frequencyBinCount);
  an.getByteFrequencyData(data);
  const w = visCanvas.width, h = visCanvas.height;
  visCtx.clearRect(0, 0, w, h);
  const r = visRamp();
  paintVisBars(visCtx, data, w, h, visState, 24, r.ramp, r.peak);
  visCanvas._hadVis = true;
}
requestAnimationFrame(drawVis);
