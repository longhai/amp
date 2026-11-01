"use strict";
function onStandaloneButton(b){
  const a = b.action;
  if (a === "CLOSE") {
    const kind = b._winKind;
    if (kind) setWinVisible(kind, false);
    applyWindowVisibility();
    return;
  }
  if (a === "MINIMIZE") { const kind = b._winKind; if (kind) { setWinVisible(kind, false); applyWindowVisibility(); } return; }
  onMainButton(b);
}
async function buildStandaloneWindow(skin, res, kind){
  const w = skin[kind];
  if (!w) return null;
  const win = document.createElement("div");
  win.className = "win"; win.id = kind + "win";
  const sz = getWinSize(kind, w.w, w.h);
  win.dataset.w = sz.w; win.dataset.h = sz.h;
  win.style.width = sz.w + "px"; win.style.height = sz.h + "px";
  win.style.backgroundColor = "#111";
  if (w.backgroundFile) {
    const bg = await resolveImg(res, w.background, w.backgroundFile);
    if (bg) { win.style.backgroundImage = "url(" + JSON.stringify(bg) + ")"; win.style.backgroundSize = sz.w + "px " + sz.h + "px"; win._bgImg = true; }
  }
  await renderFrameInto(win, w.frame, res);
  for (const b of (w.frame && w.frame.buttons || [])) b._winKind = kind;
  for (const bg of (w.backgrounds || [])) {
    if (!bg.imageFile) continue;
    const src = await resolveImg(res, bg.image, bg.imageFile);
    if (src) win.appendChild(imgElSrc(src, bg.x, bg.y, bg.w, bg.h));
  }
  for (const lay of w.layers) {
    if (!lay.imageFile) continue;
    const src = await resolveImg(res, lay.image, lay.imageFile);
    if (src) win.appendChild(imgElSrc(src, lay.x, lay.y, lay.w, lay.h));
  }
  const tick = w.texts.find(t => t.id && t.id.toLowerCase() === "songticker")
    || w.texts.find(t => t.display === "songname")
    || w.texts.find(t => t.ticker === "1");
  if (tick) {
    const tickEl = document.createElement("div");
    tickEl.id = "ticker-" + kind;
    tickEl.style.cssText = "position:absolute;overflow:hidden;white-space:nowrap;color:#ddd;font-size:11px;line-height:14px;";
    tickEl.style.left = tick.x + "px"; tickEl.style.top = tick.y + "px";
    tickEl.style.width = tick.w + "px"; tickEl.style.height = (tick.h || 14) + "px";
    tickEl.textContent = tickerText;
    win.appendChild(tickEl);
    extraTickers.push(tickEl);
  }
  const tim = w.texts.find(t => t.id === "timer") || w.texts.find(t => t.display === "time");
  if (tim) {
    const timEl = document.createElement("div");
    timEl.style.cssText = "position:absolute;overflow:hidden;color:#ddd;font-size:11px;line-height:14px;text-align:center;";
    timEl.style.left = tim.x + "px"; timEl.style.top = tim.y + "px";
    timEl.style.width = tim.w + "px"; timEl.style.height = (tim.h || 14) + "px";
    timEl.textContent = fmt(elapsedSecs());
    win.appendChild(timEl);
    extraTimers.push(timEl);
  }
  for (const t of w.texts) {
    if (t === tick || t === tim) continue;
    if (!t.default && !t.display) continue;
    const el = document.createElement("div");
    el.className = "wtext";
    el.style.left = t.x + "px"; el.style.top = t.y + "px";
    el.style.width = (t.w || 50) + "px"; el.style.height = (t.h || 14) + "px";
    el.style.fontSize = "8px"; el.style.lineHeight = (t.h || 14) + "px";
    el.textContent = compName(t.default || "", (skin.skin && skin.skin.name) || "WINAMP");
    win.appendChild(el);
  }
  for (const b of w.buttons) {
    b._winKind = kind;
    await buildButton(b, win, res, onStandaloneButton);
  }
  for (const s of w.sliders) {
    if (s.action === "VOLUME" || s.action === "SEEK") await buildMainSlider(s, win, res);
  }
  addResizeHandle(win, kind);
  return win;
}
