"use strict";
let drawerTab = "eq", drawerThemeFilter = null;
window.drawerEqToggleBtns = [];
function onDrawerButton(b){
  const a = b.action;
  if (a === "CLOSE") toggleDrawer();
  else if (a === "MINIMIZE") toggleDrawer();
  else if (/drawer\.button/i.test(b.id || "")) toggleDrawer();
  else onMainButton(b);
}
function drawerThemeKey(){ return "amp-theme-v6:" + skinKey(); }
function applyColorTheme(id){
  const presets = (SKIN && SKIN.colorPresets) || [];
  const p = presets.find(x => x.id === id) || presets[0];
  if (!p) return false;
  try { localStorage.setItem(drawerThemeKey(), p.id); } catch (e) {}
  if (!drawerThemeFilter) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "0"); svg.setAttribute("height", "0");
    svg.style.position = "absolute";
    svg.innerHTML = "<filter id='amp-theme-filter'><feColorMatrix type='matrix' values='1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0'/></filter>";
    document.body.appendChild(svg);
    drawerThemeFilter = svg.querySelector("feColorMatrix");
  }
  const sums = [0, 0, 0]; let n = 0;
  for (const g of Object.values(p.groups || {})) {
    if (!Array.isArray(g) || g.length < 3) continue;
    sums[0] += g[0]; sums[1] += g[1]; sums[2] += g[2]; n++;
  }
  const avg = n ? sums.map(v => v / n) : [0, 0, 0];
  const sc = avg.map(v => Math.min(1.6, Math.max(0.4, 1 + v / 4096)));
  drawerThemeFilter.setAttribute("values",
    sc[0] + " 0 0 0 0  0 " + sc[1] + " 0 0 0  0 0 " + sc[2] + " 0 0  0 0 0 1 0");
  const stage = document.getElementById("stage");
  if (stage) stage.style.filter = (p.id === "Default" || (sc[0] === 1 && sc[1] === 1 && sc[2] === 1)) ? "" : "url(#amp-theme-filter)";
  return true;
}
window.applyColorTheme = applyColorTheme;
function applySavedColorTheme(){
  if (!SKIN || !(SKIN.colorPresets || []).length) return;
  let saved = null;
  try { saved = localStorage.getItem(drawerThemeKey()); } catch (e) {}
  if (saved) applyColorTheme(saved);
}
window.applySavedColorTheme = applySavedColorTheme;
function skinColorToCss(id, fallback){
  const colors = (SKIN && SKIN.colors) || {};
  const v = colors[id];
  if (!v) return fallback;
  const m = String(v).split(",").map(s => parseInt(s.trim(), 10));
  if (m.length >= 3 && m.every(n => isFinite(n))) return "rgb(" + m[0] + "," + m[1] + "," + m[2] + ")";
  return v;
}
function skinTabLabelInfo(t, st){
  const label = (st && st.label) || t.label;
  const font = SKIN.fonts && SKIN.fonts[(st && st.font) || "player.smallfont"];
  if (font && font.tag === "bitmapfont" && font.charwidth) return { label, width: label.length * font.charwidth, font, bitmap: true };
  const cv = document.createElement("canvas");
  const cx = cv.getContext("2d");
  cx.font = "12px sans-serif";
  return { label, width: Math.ceil(cx.measureText(label).width), font: null, bitmap: false };
}
async function buildSkinTab(t, res){
  const on = t.on, off = t.off;
  if (!on || !off || !on.left || !on.middle || !on.right || !off.left || !off.middle || !off.right) return null;
  const urls = {};
  for (const st of ["on", "off"]) for (const part of ["left", "middle", "right"]) {
    const u = await resolveImg(res, t[st][part], null);
    if (!u) return null;
    urls[st + "." + part] = u;
  }
  const info = skinTabLabelInfo(t, on);
  const tabW = 11 + info.width + 2 + 15;
  const el = document.createElement("div");
  el.style.cssText = "position:relative;width:" + tabW + "px;height:19px;cursor:pointer;flex:0 0 auto;";
  el._skinTab = t; el._tabUrls = urls;
  const mkSlice = (part, pos, size) => {
    const d = document.createElement("div");
    d.dataset.part = part;
    d.style.cssText = "position:absolute;top:0;height:19px;background-repeat:" + (part === "middle" ? "repeat-x" : "no-repeat") + ";background-size:" + size + ";" + pos;
    return d;
  };
  el.appendChild(mkSlice("left", "left:0;width:15px;", "15px 19px"));
  el.appendChild(mkSlice("middle", "left:15px;right:15px;", "10px 19px"));
  el.appendChild(mkSlice("right", "right:0;width:15px;", "15px 19px"));
  let painted = false;
  if (info.bitmap && typeof bitmapFontImage === "function" && typeof paintBitmapText === "function") {
    const img = await bitmapFontImage(info.font);
    if (img) {
      const cv = document.createElement("canvas");
      cv.style.cssText = "position:absolute;left:11px;top:5px;z-index:2;pointer-events:none;image-rendering:pixelated;";
      paintBitmapText(cv, img, info.font, info.label);
      el.appendChild(cv);
      painted = true;
    }
  }
  if (!painted) {
    const s = document.createElement("span");
    s.textContent = info.label;
    s.style.cssText = "position:absolute;left:11px;top:3px;z-index:2;pointer-events:none;font-size:12px;line-height:12px;white-space:nowrap;color:" + skinColorToCss((on && on.color) || "drawer.color.text.dark", "#333") + ";";
    el.appendChild(s);
  }
  return el;
}
function paintSkinTab(el, isOn){
  const st = isOn ? "on" : "off";
  for (const d of el.querySelectorAll("[data-part]")) {
    const u = el._tabUrls && el._tabUrls[st + "." + d.dataset.part];
    if (u) d.style.backgroundImage = "url(" + JSON.stringify(u) + ")";
  }
}
async function renderDrawerTab(win){
  const d = SKIN.drawer;
  const content = win._drawerContent;
  if (!content) return;
  content.innerHTML = "";
  if (win._drawerEqPanel) { win._drawerEqPanel.remove(); win._drawerEqPanel = null; }
  const tab = d.tabs.find(t => t.name === drawerTab) || d.tabs[0];
  for (const t of d.tabs) {
    const el = win._drawerTabs[t.name];
    if (!el) continue;
    const on = t === tab;
    if (el._skinTab) paintSkinTab(el, on);
    else { el.style.opacity = on ? "1" : "0.55"; el.style.fontWeight = on ? "bold" : "normal"; }
  }
  if (drawerTab === "eq") {
    content.style.display = "none";
    await renderDrawerEQTab(win);
  } else if (drawerTab === "options") {
    content.style.display = "";
    const rows = [
      ["Repeat", () => ["Tắt", "Lặp playlist", "Lặp 1 bài"][repeatMode], () => {
        repeatMode = (repeatMode + 1) % 3;
        setStatus("Repeat: " + ["Tắt", "Lặp playlist", "Lặp 1 bài"][repeatMode]);
      }],
      ["Playlist", () => (winVisible("pl") ? "Hiện" : "Ẩn"), () => toggleWindow("pl")],
      ["EQ", () => (winVisible("eq") ? "Hiện" : "Ẩn"), () => toggleWindow("eq")],
      ["Thư viện (ML)", () => (winVisible("ml") ? "Hiện" : "Ẩn"), () => toggleWindow("ml")],
      ["Video", () => (winVisible("video") ? "Hiện" : "Ẩn"), () => toggleWindow("video")],
      ["Hiệu ứng (Vis)", () => (winVisible("avs") ? "Hiện" : "Ẩn"), () => toggleWindow("avs")],
      ["Ảnh bìa", () => (winVisible("albumart") ? "Hiện" : "Ẩn"), () => toggleWindow("albumart")]
    ];
    rows.forEach(([label, get, fn], i) => {
      const r = document.createElement("div");
      r.className = "optrow";
      r.style.top = (i * 22) + "px";
      r.innerHTML = escapeHtml(label) + " <span class='st'>" + escapeHtml(get()) + "</span>";
      r.addEventListener("click", async () => { await fn(); renderDrawerTab(win); applyWindowVisibility(); });
      content.appendChild(r);
    });
  } else if (drawerTab === "colorthemes") {
    content.style.display = "";
    const presets = (SKIN.colorPresets || []);
    const list = document.createElement("div");
    list.className = "themelist";
    list.style.left = "0px"; list.style.top = "0px";
    list.style.width = "100%"; list.style.height = "100%";
    let saved = null;
    try { saved = localStorage.getItem(drawerThemeKey()); } catch (e) {}
    for (const p of presets) {
      const r = document.createElement("div");
      r.className = "trow" + ((saved || "Default") === p.id ? " cur" : "");
      r.textContent = p.id;
      r.addEventListener("click", () => {
        applyColorTheme(p.id);
        renderDrawerTab(win);
        setStatus("Màu skin: " + p.id + " (xấp xỉ bằng bộ lọc màu — Winamp gốc đổi màu theo từng nhóm, Amp đổi theo trung bình kênh)");
      });
      list.appendChild(r);
    }
    if (!presets.length) list.textContent = "Skin này không có bảng màu (color presets).";
    content.appendChild(list);
  }
}
async function renderDrawerEQTab(win){
  const d = SKIN.drawer, eq = d.contents && d.contents.eq;
  const bands = eq ? (eq.sliders || []).filter(s => s.action === "EQ_BAND") : [];
  if (!eq || !bands.length) {
    const st = document.createElement("div");
    st.className = "optrow";
    st.style.top = "0px"; st.style.zIndex = "5"; st.style.background = "rgba(0,0,0,.55)";
    st.textContent = "Skin này không có EQ trong ngăn kéo";
    win._drawerContent.style.display = "";
    win._drawerContent.appendChild(st);
    return;
  }
  try { await ensureEqJs(); } catch (e) {
    const st = document.createElement("div");
    st.className = "optrow";
    st.style.top = "0px"; st.style.zIndex = "5"; st.style.background = "rgba(0,0,0,.55)";
    st.textContent = "Không tải được EQ: " + e.message;
    win._drawerContent.style.display = "";
    win._drawerContent.appendChild(st);
    return;
  }
  const panel = document.createElement("div");
  panel.style.cssText = "position:absolute;left:" + (eq.x || 0) + "px;top:" + (eq.y || 0) + "px;width:" + eq.w + "px;height:" + eq.h + "px;z-index:2;";
  win._inner.appendChild(panel);
  win._drawerEqPanel = panel;
  drawerEqSliderEls.length = 0;
  window.drawerEqToggleBtns.length = 0;
  for (const lay of eq.layers) {
    const img = lay.image || "";
    if (!(img.endsWith("eq.bg") || img.endsWith("eq.txtoverlay.dark") || img.endsWith("eq.txtoverlay.bright") || lay.id === "equalizer.band.label")) continue;
    if (!lay.imageFile) continue;
    const src = await resolveImg(curRes, lay.image, lay.imageFile);
    if (src) panel.appendChild(imgElSrc(src, lay.x, lay.y, lay.w, lay.h));
  }
  bands.sort((a, b) => (a.param === "preamp" ? -1 : b.param === "preamp" ? 1 : (+a.param || 0) - (+b.param || 0)));
  for (const s of bands) {
    const bi = s.param === "preamp" ? -1 : parseInt(s.param, 10) - 1;
    if (bi < -1 || bi > 9) continue;
    await buildEQSlider(s, bi, panel, curRes, eq, true);
  }
  for (const b of eq.buttons) {
    if (b.action !== "EQ_TOGGLE" && b.action !== "EQ_AUTO" && !(b.action === "MENU" && b.param === "presets")) continue;
    if (!b.imageFile && !b.hoverFile && !b.downFile) continue;
    const built = await buildButton(b, panel, curRes, onEQButton);
    if (built && b.action === "EQ_TOGGLE") {
      b._stateBase = () => eqState.on ? (b._activeSrc || b._downSrc || b._src) : b._src;
      window.drawerEqToggleBtns.push(b);
      if (b._img) b._img.src = b._base();
    }
  }
}
function syncDrawerButtons(win, isOpen){
  if (!win) return;
  const open = (typeof isOpen === "boolean") ? isOpen : ((typeof drawerOpen !== "undefined") && drawerOpen);
  if (win._drawerOpenBtn) win._drawerOpenBtn.style.display = open ? "none" : "";
  if (win._drawerCloseBtn) win._drawerCloseBtn.style.display = open ? "" : "none";
  if (win._drawerCloseBg) win._drawerCloseBg.style.display = open ? "" : "none";
}
async function buildDrawerWindow(skin, res){
  const d = skin.drawer;
  if (!d) return null;
  const wrap = document.createElement("div");
  wrap.className = "win drawerwrap"; wrap.id = "drawerwin";
  const sz = getWinSize("drawer", d.w, d.h);
  wrap.dataset.w = sz.w; wrap.dataset.h = sz.h;
  wrap.style.width = sz.w + "px"; wrap.style.height = sz.h + "px";
  wrap.style.backgroundColor = "#222";
  const inner = document.createElement("div");
  inner.className = "drawerinner";
  inner.style.width = sz.w + "px"; inner.style.height = sz.h + "px";
  inner.style.transform = "translateY(" + drawerInnerY(false, skin, sz.h) + "px)";
  inner.style.position = "relative";
  wrap.appendChild(inner);
  wrap._inner = inner;
  if (d.backgroundFile) {
    const bg = await resolveImg(res, d.background, d.backgroundFile);
    if (bg) { inner.style.backgroundImage = "url(" + JSON.stringify(bg) + ")"; inner.style.backgroundSize = sz.w + "px " + sz.h + "px"; }
  }
  for (const lay of d.layers) {
    if (!lay.imageFile) continue;
    const src = await resolveImg(res, lay.image, lay.imageFile);
    if (src) {
      const im = imgElSrc(src, lay.x, lay.y, lay.w, lay.h);
      if (lay.id === "drawer.button.close.bg") wrap._drawerCloseBg = im;
      inner.appendChild(im);
    }
  }
  for (const t of d.texts) {
    if (!t.default) continue;
    const el = document.createElement("div");
    el.className = "wtext";
    el.style.left = t.x + "px"; el.style.top = t.y + "px";
    el.style.width = (t.w || 50) + "px"; el.style.height = (t.h || 14) + "px";
    el.style.fontSize = "8px"; el.style.lineHeight = (t.h || 14) + "px";
    el.textContent = compName(t.default, (skin.skin && skin.skin.name) || "WINAMP");
    inner.appendChild(el);
  }
  for (const b of d.buttons) await buildButton(b, inner, res, onDrawerButton);
  wrap._drawerOpenBtn = ((d.buttons || []).find(b => /drawer\.button\.open/i.test(b.id || "")) || {})._el || null;
  wrap._drawerCloseBtn = ((d.buttons || []).find(b => /drawer\.button\.close/i.test(b.id || "")) || {})._el || null;
  syncDrawerButtons(wrap);
  const tabsEl = document.createElement("div");
  tabsEl.style.cssText = "position:absolute;left:10px;bottom:5px;display:flex;gap:2px;align-items:flex-end;z-index:3;";
  inner.appendChild(tabsEl);
  wrap._drawerTabs = {};
  for (const t of d.tabs) {
    let el = await buildSkinTab(t, res);
    if (!el) {
      el = document.createElement("div");
      el.textContent = t.label;
      el.style.cssText = "color:#ddd;font-size:12px;padding:2px 8px;cursor:pointer;background:rgba(0,0,0,.4);border:1px solid #666;border-radius:3px;";
    }
    el.addEventListener("click", () => {
      drawerTab = t.name;
      if (typeof drawerTabSync === "function") drawerTabSync();
      renderDrawerTab(wrap).catch(e => setStatus("không mở được tab: " + e.message, true));
    });
    tabsEl.appendChild(el);
    wrap._drawerTabs[t.name] = el;
  }
  const content = document.createElement("div");
  content.style.cssText = "position:absolute;left:8px;right:8px;top:13px;bottom:28px;overflow-y:auto;";
  inner.appendChild(content);
  wrap._drawerContent = content;
  await renderDrawerTab(wrap);
  applySavedColorTheme();
  return wrap;
}
