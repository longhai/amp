"use strict";
let notEl = null, notHideTimer = null, notTexts = [], notScrollTimer = null;
function startNotifierScroll(){
  stopNotifierScroll();
  const scrollables = notTexts.filter(t => /title|artist/.test((t.id || "").toLowerCase()));
  if (!scrollables.length) return;
  notScrollTimer = setInterval(() => {
    for (const t of scrollables) {
      const el = t.el;
      if (el.scrollWidth <= el.clientWidth + 2) { el.scrollLeft = 0; continue; }
      el.scrollLeft += 1;
      if (el.scrollLeft >= el.scrollWidth - el.clientWidth) el.scrollLeft = 0;
    }
  }, 45);
}
function stopNotifierScroll(){
  if (notScrollTimer) { clearInterval(notScrollTimer); notScrollTimer = null; }
  for (const t of notTexts) t.el.scrollLeft = 0;
}
function onNotifierButton(b){
  if (b.action === "CLOSE") hideNotifier();
  else onMainButton(b);
}
function hideNotifier(){
  stopNotifierScroll();
  if (notEl) notEl.style.display = "none";
  if (notHideTimer) { clearTimeout(notHideTimer); notHideTimer = null; }
}
function resetNotifier(){
  stopNotifierScroll();
  if (notHideTimer) { clearTimeout(notHideTimer); notHideTimer = null; }
  if (notEl) { notEl.remove(); notEl = null; }
  notTexts = [];
}
window.resetNotifier = resetNotifier;
function showNotifier(title, artist){
  if (!SKIN) return;
  ensureNotifierJs().then(async () => {
    if (!notEl) await buildNotifierWindow(SKIN, curRes);
    if (!notEl) return;
    for (const t of notTexts) {
      const id = (t.id || "").toLowerCase();
      if (/title/.test(id)) { t.el.textContent = title; t.el.style.textOverflow = "clip"; }
      else if (/artist/.test(id)) { t.el.textContent = artist; t.el.style.textOverflow = "clip"; }
      else if (/album/.test(id)) t.el.textContent = "";
      else if (/plentry/.test(id)) t.el.textContent = (mode === "radio" && channels.length) ? ((idx + 1) + "/" + channels.length) : "";
      else if (/nexttrack/.test(id)) t.el.textContent = "";
    }
    startNotifierScroll();
    if (!notTexts.length && notEl._plainTitle) {
      notEl._plainTitle.textContent = title;
      notEl._plainArtist.textContent = artist;
    }
    notEl.style.display = "block";
    if (notHideTimer) clearTimeout(notHideTimer);
    notHideTimer = setTimeout(hideNotifier, 4000);
  }).catch(() => {});
}
window.showNotifier = showNotifier;
window.hideNotifier = hideNotifier;
async function buildNotifierWindow(skin, res){
  const win = document.createElement("div");
  win.id = "notifier";
  const nt = skin.notifier;
  if (nt) {
    win.style.width = nt.w + "px"; win.style.height = nt.h + "px";
    if (nt.backgroundFile) {
      const bg = await resolveImg(res, nt.background, nt.backgroundFile);
      if (bg) win.style.backgroundImage = "url(" + JSON.stringify(bg) + ")";
    }
    if (nt.grid) {
      const imgs = {};
      for (const key of ["left", "middle", "right"]) {
        const id = nt.grid[key];
        if (!id) continue;
        try { imgs[key] = await res.bitmapURL(id); } catch (e) {}
      }
      const measure = (u) => new Promise(r => {
        const im = new Image();
        im.onload = () => r({ w: im.naturalWidth, h: im.naturalHeight });
        im.onerror = () => r(null);
        im.src = u;
      });
      const lw = imgs.left ? await measure(imgs.left) : null;
      const rw = imgs.right ? await measure(imgs.right) : null;
      const leftW = (lw && lw.w) || 0, rightW = (rw && rw.w) || 0;
      const mk = (u, x, w) => {
        const im = document.createElement("img");
        im.src = u; im.alt = ""; im.draggable = false;
        im.style.cssText = "position:absolute;top:0;height:" + nt.h + "px;left:" + x + "px;width:" + w + "px;";
        win.appendChild(im);
      };
      if (imgs.left) mk(imgs.left, 0, leftW);
      if (imgs.middle) mk(imgs.middle, leftW, Math.max(1, nt.w - leftW - rightW));
      if (imgs.right) mk(imgs.right, nt.w - rightW, rightW);
    }
    for (const bg of (nt.backgrounds || [])) {
      if (!bg.imageFile) continue;
      const src = await resolveImg(res, bg.image, bg.imageFile);
      if (src) win.appendChild(imgElSrc(src, bg.x, bg.y, bg.w, bg.h));
    }
    for (const lay of nt.layers) {
      if (!lay.imageFile) continue;
      const src = await resolveImg(res, lay.image, lay.imageFile);
      if (src) win.appendChild(imgElSrc(src, lay.x, lay.y, lay.w, lay.h));
    }
    notTexts = [];
    const wide = !nt.listRect;
    for (const t of nt.texts) {
      const el = document.createElement("div");
      el.className = "nt";
      if (wide) { el.style.left = "8px"; el.style.width = (nt.w - 16) + "px"; }
      else { el.style.left = t.x + "px"; el.style.width = (t.w || 60) + "px"; }
      el.style.top = t.y + "px"; el.style.height = (t.h || 12) + "px";
      el.style.fontSize = (t.fontsize ? Math.min(13, +t.fontsize) : 11) + "px";
      el.style.lineHeight = (t.h || 12) + "px";
      el.textContent = compName(t.default || "", (skin.skin && skin.skin.name) || "");
      win.appendChild(el);
      notTexts.push({ id: t.id || "", el });
    }
    for (const b of nt.buttons) await buildButton(b, win, res, onNotifierButton);
  } else {
    win.style.width = "260px"; win.style.height = "64px";
    win.style.boxSizing = "border-box";
    win.style.background = "#1c2733"; win.style.border = "1px solid #557";
    win.style.borderRadius = "6px"; win.style.padding = "8px 10px";
    const t1 = document.createElement("div");
    t1.style.cssText = "color:#fff;font-size:14px;font-weight:bold;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;";
    const t2 = document.createElement("div");
    t2.style.cssText = "color:#9db8d2;font-size:12px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;";
    win.appendChild(t1); win.appendChild(t2);
    win._plainTitle = t1; win._plainArtist = t2;
  }
  win.addEventListener("click", hideNotifier);
  document.body.appendChild(win);
  notEl = win;
  return win;
}
