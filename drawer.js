"use strict";
let drawerTab = "eq";
let drawerOptionsScroll = 0;
let drawerWinEl = null;
window.drawerEqToggleBtns = [];
/* Crossfade trong ngăn kéo: trạng thái hiển thị (thời gian 0–20s theo
   high="20" của sCrossfade). Amp chưa có engine trộn chéo tiếng nên nút
   chỉ đổi số/giá trị hiển thị + đèn LED, không đổi tiếng. */
let drawerCrossfade = { on: false, secs: 0 };
let drawerCFDisplayEl = null, drawerCrossfadeLedBtn = null;
function syncDrawerCrossfade(){
  if (drawerCFDisplayEl) drawerCFDisplayEl.textContent = String(drawerCrossfade.secs);
  if (drawerCrossfadeLedBtn && drawerCrossfadeLedBtn._img)
    drawerCrossfadeLedBtn._img.src = drawerCrossfadeLedBtn._base ? drawerCrossfadeLedBtn._base() : drawerCrossfadeLedBtn._src;
}
function onDrawerCrossfadeButton(b){
  if (b.id === "Crossfade" || b.id === "CrossfadeLED") {
    drawerCrossfade.on = !drawerCrossfade.on;
    setStatus(drawerCrossfade.on ? "Crossfade: BẬT (" + drawerCrossfade.secs + "s — chỉ hiển thị, Amp chưa trộn chéo tiếng)" : "Crossfade: TẮT");
  } else if (b.id === "CrossfadeDecrease") {
    drawerCrossfade.secs = Math.max(0, drawerCrossfade.secs - 1);
    setStatus("Crossfade: " + drawerCrossfade.secs + "s (chỉ hiển thị)");
  } else if (b.id === "CrossfadeIncrease") {
    drawerCrossfade.secs = Math.min(20, drawerCrossfade.secs + 1);
    setStatus("Crossfade: " + drawerCrossfade.secs + "s (chỉ hiển thị)");
  }
  syncDrawerCrossfade();
}
/* Slider Balance ngang (PAN, 0 = giữa): chỉ kéo thumb + hiện trạng thái,
   Amp chưa có nút cân bằng tiếng (pan node) nên không đổi tiếng. Vị trí/
   kích thước/thumb lấy đúng từ model. */
let drawerBalance = 0; /* -1 trái .. 0 giữa .. 1 phải */
async function buildDrawerBalanceSlider(s, panel, res){
  const track = document.createElement("div");
  track.className = "eqsl";
  track.style.left = s.x + "px"; track.style.top = s.y + "px";
  track.style.width = s.w + "px"; track.style.height = s.h + "px";
  const thumbSrc = s.thumb ? await resolveImg(res, s.thumb, s.thumbFile) : null;
  const tw = s.thumbW || 23, th = s.thumbH || 13;
  const thumb = document.createElement("div");
  thumb.className = "thumb";
  thumb.style.width = tw + "px"; thumb.style.height = th + "px";
  if (thumbSrc) {
    const im = document.createElement("img");
    im.src = thumbSrc; im.draggable = false; im.alt = "";
    thumb.appendChild(im);
  } else thumb.style.background = "#888";
  track.appendChild(thumb);
  const place = () => {
    thumb.style.left = Math.round(((drawerBalance + 1) / 2) * (s.w - tw)) + "px";
    thumb.style.top = Math.round((s.h - th) / 2) + "px";
  };
  const setBal = f => {
    drawerBalance = Math.max(-1, Math.min(1, f * 2 - 1));
    place();
  };
  track.addEventListener("pointerdown", e => {
    try { track.setPointerCapture(e.pointerId); } catch (err) {  }
    const valFromEvent = ev => {
      const r = track.getBoundingClientRect();
      return Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width));
    };
    setBal(valFromEvent(e));
    const mv = ev => setBal(valFromEvent(ev));
    const up = () => {
      track.removeEventListener("pointermove", mv);
      track.removeEventListener("pointerup", up);
      track.removeEventListener("pointercancel", up);
      setStatus("Balance: " + (drawerBalance === 0 ? "giữa" : drawerBalance < 0 ? "trái " + Math.round(-drawerBalance * 100) + "%" : "phải " + Math.round(drawerBalance * 100) + "%") + " (chỉ hiển thị — Amp chưa có nút cân bằng tiếng)");
    };
    track.addEventListener("pointermove", mv);
    track.addEventListener("pointerup", up);
    track.addEventListener("pointercancel", up);
    e.preventDefault();
  });
  panel.appendChild(track);
  place();
}
function onDrawerButton(b){
  const a = b.action;
  if (a === "CLOSE") toggleDrawer();
  else if (a === "MINIMIZE") toggleDrawer();
  else if (/drawer\.button/i.test(b.id || "")) toggleDrawer();
  else onMainButton(b);
}
function drawerThemeKey(){ return "amp-theme-v6:" + skinKey(); }
/* Đợt 5 — đổi màu theo từng gammagroup, không dùng trung bình kênh nữa.
   Mỗi gammagroup trong preset có 1 bộ lọc SVG feColorMatrix riêng (tỉ lệ
   kênh = 1 + v/4096, kẹp [0.4, 1.6] như cách tính cũ — chỉ khác là tính
   riêng từng nhóm thay vì gộp chung); phần tử nào mang data-gammagroup
   nào thì nhận đúng bộ lọc của nhóm đó (gắn ở layerEl/buildButton/
   imgElSrc và các chỗ vẽ chữ trong index.html). Preset "Default" gỡ
   hết lọc, về màu gốc của skin. */
let drawerThemeId = null, drawerThemeSel = null;
let drawerThemeSvg = null, drawerThemeMatrices = {};
function themeScale(v){ return Math.min(1.6, Math.max(0.4, 1 + v / 4096)); }
function themeMatrixValues(g){
  if (!Array.isArray(g) || g.length < 3) return null;
  const sc = g.map(themeScale);
  return sc[0] + " 0 0 0 0  0 " + sc[1] + " 0 0 0  0 0 " + sc[2] + " 0 0  0 0 0 1 0";
}
function ensureThemeFilters(preset){
  if (!drawerThemeSvg) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "0"); svg.setAttribute("height", "0");
    svg.style.position = "absolute";
    document.body.appendChild(svg);
    drawerThemeSvg = svg;
  }
  const groups = Object.keys(preset.groups || {});
  groups.forEach((g, i) => {
    const fid = "amp-theme-g" + i;
    let m = drawerThemeMatrices[g];
    if (!m) {
      const f = document.createElementNS("http://www.w3.org/2000/svg", "filter");
      f.setAttribute("id", fid);
      const fe = document.createElementNS("http://www.w3.org/2000/svg", "feColorMatrix");
      fe.setAttribute("type", "matrix");
      f.appendChild(fe);
      drawerThemeSvg.appendChild(f);
      drawerThemeMatrices[g] = { fid, el: fe };
      m = drawerThemeMatrices[g];
    }
    const vals = themeMatrixValues(preset.groups[g]);
    m.el.setAttribute("values", vals || "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0");
  });
}
function clearThemeFilters(){
  const stage = document.getElementById("stage");
  if (stage) stage.style.filter = "";
  const els = document.querySelectorAll("[data-gammagroup]");
  for (const el of els) el.style.filter = "";
}
function applyThemeFilters(preset){
  if (!preset || preset.id === "Default") { clearThemeFilters(); return; }
  ensureThemeFilters(preset);
  const stage = document.getElementById("stage");
  if (stage) stage.style.filter = "";
  const els = document.querySelectorAll("[data-gammagroup]");
  for (const el of els) {
    const g = el.dataset.gammagroup;
    const m = g && drawerThemeMatrices[g];
    const vals = g && preset.groups ? preset.groups[g] : null;
    const isZero = !vals || (vals[0] === 0 && vals[1] === 0 && vals[2] === 0);
    el.style.filter = (m && !isZero) ? "url(#" + m.fid + ")" : "";
  }
}
/* Áp lại bộ lọc của preset đang chọn cho mọi phần tử đã gắn
   data-gammagroup — gọi sau mỗi lần vẽ lại panel ngăn kéo (nút/tab mới
   tạo ra sau lần áp trước cũng nhận đúng lọc của nhóm mình). */
function reapplyColorTheme(){
  if (!drawerThemeId) return;
  const presets = (SKIN && SKIN.colorPresets) || [];
  const p = presets.find(x => x.id === drawerThemeId);
  if (p) applyThemeFilters(p);
}
window.reapplyColorTheme = reapplyColorTheme;
function drawerThemeSavedId(){
  try { return localStorage.getItem(drawerThemeKey()); } catch (e) { return null; }
}
function applyColorTheme(id){
  const presets = (SKIN && SKIN.colorPresets) || [];
  const p = presets.find(x => x.id === id) || presets[0];
  if (!p) return false;
  try { localStorage.setItem(drawerThemeKey(), p.id); } catch (e) {}
  drawerThemeId = p.id;
  drawerThemeSel = p.id;
  applyThemeFilters(p);
  return true;
}
window.applyColorTheme = applyColorTheme;
function applySavedColorTheme(){
  if (!SKIN || !(SKIN.colorPresets || []).length) return;
  const saved = drawerThemeSavedId();
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
  drawerWinEl = win;
  content.innerHTML = "";
  if (win._drawerEqPanel) { win._drawerEqPanel.remove(); win._drawerEqPanel = null; }
  if (win._drawerTabPanel) { win._drawerTabPanel.remove(); win._drawerTabPanel = null; }
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
    content.style.display = "none";
    await renderDrawerOptionsTab(win);
  } else if (drawerTab === "colorthemes") {
    content.style.display = "none";
    await renderDrawerColorThemesTab(win);
  }
  /* Panel mới vẽ lại sau lần áp theme trước: gắn lại lọc theo nhóm. */
  reapplyColorTheme();
}
/* Nút cuộn của tab Options (CB_PREVPAGE/CB_NEXTPAGE trong model): cuộn
   danh sách tùy chọn trong vùng bucket, mỗi lần 1 hàng 14px. */
function onDrawerOptionsScroll(b){
  const opt = SKIN.drawer && SKIN.drawer.contents && SKIN.drawer.contents.options;
  const bucket = (opt && opt.rects || []).find(r => r.kind === "componentbucket") || { h: 55 };
  const visible = Math.max(1, Math.floor((bucket.h || 55) / 14));
  const maxScroll = Math.max(0, 7 - visible);
  if (b.action === "CB_PREVPAGE") drawerOptionsScroll = Math.max(0, drawerOptionsScroll - 1);
  else if (b.action === "CB_NEXTPAGE") drawerOptionsScroll = Math.min(maxScroll, drawerOptionsScroll + 1);
  else return;
  if (drawerWinEl) renderDrawerTab(drawerWinEl).catch(e => setStatus("không mở được tab: " + e.message, true));
}
/* Tab Options vẽ bằng dữ liệu skin thật: nền drawer.options.bg(.display/
   .bg2) + 2 nút cuộn đúng vị trí/ảnh; các tùy chọn thật Amp hỗ trợ nằm
   gọn trong vùng bucket của skin (17,20,81x55), mỗi hàng cao 14px như
   bucket.entry của skin, cuộn bằng 2 nút trên. Vùng GroupXFade
   (100,12,200x74) để trống nền bg2: trang config chi tiết của nó
   (optionsgroup.*) do MAKI configtarget.maki điều khiển, Amp chưa mô
   phỏng được. */
async function renderDrawerOptionsTab(win){
  const d = SKIN.drawer, opt = d.contents && d.contents.options;
  const content = win._drawerContent;
  if (!opt) {
    const st = document.createElement("div");
    st.className = "optrow";
    st.style.top = "0px"; st.style.zIndex = "5"; st.style.background = "rgba(0,0,0,.55)";
    st.textContent = "Skin này không có tab Options trong ngăn kéo";
    content.style.display = "";
    content.appendChild(st);
    return;
  }
  content.style.display = "none";
  const panel = document.createElement("div");
  panel.style.cssText = "position:absolute;left:" + (opt.x || 0) + "px;top:" + (opt.y || 0) + "px;width:" + opt.w + "px;height:" + opt.h + "px;z-index:2;";
  win._inner.appendChild(panel);
  win._drawerTabPanel = panel;
  for (const lay of opt.layers) {
    if (!lay.imageFile) continue;
    const src = await resolveImg(curRes, lay.image, lay.imageFile);
    if (src) panel.appendChild(layerEl(src, lay));
  }
  for (const b of opt.buttons) {
    if (!b.imageFile && !b.hoverFile && !b.downFile) continue;
    await buildButton(b, panel, curRes, onDrawerOptionsScroll);
  }
  const bucket = (opt.rects || []).find(r => r.kind === "componentbucket") || { x: 17, y: 20, w: 81, h: 55 };
  const rows = [
    ["Repeat", () => ["Tắt", "Lặp", "×1"][repeatMode], () => {
      repeatMode = (repeatMode + 1) % 3;
      setStatus("Repeat: " + ["Tắt", "Lặp playlist", "Lặp 1 bài"][repeatMode]);
    }],
    ["Playlist", () => (winVisible("pl") ? "Bật" : "Tắt"), () => toggleWindow("pl")],
    ["EQ", () => (winVisible("eq") ? "Bật" : "Tắt"), () => toggleWindow("eq")],
    ["Thư viện", () => (winVisible("ml") ? "Bật" : "Tắt"), () => toggleWindow("ml")],
    ["Video", () => (winVisible("video") ? "Bật" : "Tắt"), () => toggleWindow("video")],
    ["Hiệu ứng", () => (winVisible("avs") ? "Bật" : "Tắt"), () => toggleWindow("avs")],
    ["Ảnh bìa", () => (winVisible("albumart") ? "Bật" : "Tắt"), () => toggleWindow("albumart")]
  ];
  const ROW_H = 14;
  const visible = Math.max(1, Math.floor((bucket.h || 55) / ROW_H));
  const maxScroll = Math.max(0, rows.length - visible);
  drawerOptionsScroll = Math.max(0, Math.min(maxScroll, drawerOptionsScroll));
  const list = document.createElement("div");
  list.className = "bucketlist";
  list.style.left = bucket.x + "px"; list.style.top = bucket.y + "px";
  list.style.width = bucket.w + "px"; list.style.height = bucket.h + "px";
  const inner = document.createElement("div");
  inner.className = "brows";
  inner.style.top = (-drawerOptionsScroll * ROW_H) + "px";
  const rowColor = skinColorToCss("drawer.color.text.dark", "#000");
  rows.forEach(([label, get, fn]) => {
    const r = document.createElement("div");
    r.className = "brow";
    r.style.color = rowColor;
    const lb = document.createElement("span");
    lb.className = "bl"; lb.textContent = label;
    const st = document.createElement("span");
    st.className = "bs"; st.textContent = get();
    r.appendChild(lb); r.appendChild(st);
    r.addEventListener("click", async () => { await fn(); renderDrawerTab(win); applyWindowVisibility(); });
    inner.appendChild(r);
  });
  list.appendChild(inner);
  panel.appendChild(list);
}
function buildThemeList(listRect){
  const presets = (SKIN.colorPresets || []);
  const list = document.createElement("div");
  list.className = "ctlist";
  list.style.left = listRect.x + "px"; list.style.top = listRect.y + "px";
  /* Chừa 13px phải cho thanh cuộn của skin (x=197, rộng 13): chữ chỉ tới 194. */
  list.style.width = Math.max(50, (listRect.w || 204) - 13) + "px";
  list.style.height = (listRect.h || 80) + "px";
  const textColor = skinColorToCss("wasabi.list.text", "#fff");
  const selBg = skinColorToCss("wasabi.list.text.selected.background", "#6788c9");
  const selColor = skinColorToCss("wasabi.list.text.selected", "#d6e4ff");
  for (const p of presets) {
    const r = document.createElement("div");
    r.className = "ctrow" + (p.id === drawerThemeSel ? " sel" : "");
    r.textContent = p.id;
    r.style.color = p.id === drawerThemeSel ? selColor : textColor;
    if (p.id === drawerThemeSel) r.style.background = selBg;
    if (p.id === drawerThemeId) r.style.fontWeight = "bold";
    r.addEventListener("click", () => {
      drawerThemeSel = p.id;
      if (drawerWinEl) renderDrawerTab(drawerWinEl).catch(e => setStatus("không mở được tab: " + e.message, true));
    });
    list.appendChild(r);
  }
  if (!presets.length) {
    list.textContent = "Skin này không có bảng màu (color presets).";
    list.style.color = textColor;
  }
  return list;
}
function syncThemeThumb(listEl, thumbEl){
  if (!thumbEl) return;
  const max = listEl ? Math.max(0, (listEl.scrollHeight - listEl.clientHeight)) : 0;
  const frac = max > 0 ? (listEl.scrollTop / max) : 0;
  /* Rãnh cuộn y=5..84 (nền cao 79), nút cao 31 -> top chạy 5..53. */
  thumbEl.style.top = Math.round(5 + frac * (84 - 5 - 31)) + "px";
}
function onDrawerColorThemeButton(b){
  const presets = (SKIN.colorPresets || []);
  if (!presets.length) return;
  let idx = presets.findIndex(p => p.id === drawerThemeSel);
  if (idx < 0) idx = 0;
  const rerender = () => {
    if (drawerWinEl) renderDrawerTab(drawerWinEl).catch(e => setStatus("không mở được tab: " + e.message, true));
  };
  if (b.action === "COLORTHEMES_PREVIOUS") {
    idx = (idx - 1 + presets.length) % presets.length;
    drawerThemeSel = presets[idx].id;
    rerender();
  } else if (b.action === "COLORTHEMES_NEXT") {
    idx = (idx + 1) % presets.length;
    drawerThemeSel = presets[idx].id;
    rerender();
  } else if (b.action === "COLORTHEMES_SWITCH") {
    if (applyColorTheme(drawerThemeSel)) {
      setStatus("Màu skin: " + drawerThemeSel + " (đổi theo từng gammagroup)");
      rerender();
    }
  }
}
/* Tab Color Themes vẽ bằng dữ liệu skin thật: nền drawer.colorthemes.bg +
   txtoverlay + nền danh sách wasabi.list.background (tile) + thanh cuộn
   dọc của skin (nền + 2 đầu + nút, nút chạy theo vị trí cuộn thật);
   danh sách là các preset thật từ SKIN.colorPresets trong đúng vùng
   ColorThemes:List (6,5,204x80), nền 28,61,125 (wasabi.list.background),
   dòng chọn nền 103,136,201 + chữ 214,228,255 (màu system-colors.xml);
   3 nút Set/Prev/Next đúng vị trí/ảnh. Bấm tên chỉ chọn (đổi highlight),
   Prev/Next đổi dòng chọn, Set mới áp preset. */
async function renderDrawerColorThemesTab(win){
  const d = SKIN.drawer, ct = d.contents && d.contents.colorthemes;
  const content = win._drawerContent;
  const presets = (SKIN.colorPresets || []);
  if (!ct) {
    const st = document.createElement("div");
    st.className = "optrow";
    st.style.top = "0px"; st.style.zIndex = "5"; st.style.background = "rgba(0,0,0,.55)";
    st.textContent = "Skin này không có tab Color Themes trong ngăn kéo";
    content.style.display = "";
    content.appendChild(st);
    return;
  }
  content.style.display = "none";
  if (drawerThemeSel === null || !presets.some(p => p.id === drawerThemeSel)) {
    drawerThemeSel = drawerThemeSavedId() || (presets[0] && presets[0].id) || "Default";
  }
  const panel = document.createElement("div");
  panel.style.cssText = "position:absolute;left:" + (ct.x || 0) + "px;top:" + (ct.y || 0) + "px;width:" + ct.w + "px;height:" + ct.h + "px;z-index:2;";
  win._inner.appendChild(panel);
  win._drawerTabPanel = panel;
  const listRect = (ct.rects || []).find(r => r.kind === "list") || { x: 6, y: 5, w: 204, h: 80 };
  let listEl = null, thumbEl = null;
  for (const lay of ct.layers) {
    if (!lay.imageFile) continue;
    const src = await resolveImg(curRes, lay.image, lay.imageFile);
    if (!src) continue;
    const el = layerEl(src, lay);
    panel.appendChild(el);
    if (lay.image === "wasabi.scrollbar.vertical.button") thumbEl = el;
    if (lay.image === "wasabi.list.background" && !listEl) {
      listEl = buildThemeList(listRect);
      panel.appendChild(listEl);
    }
  }
  if (!listEl) {
    listEl = buildThemeList(listRect);
    panel.appendChild(listEl);
  }
  for (const b of ct.buttons) {
    if (!b.imageFile && !b.hoverFile && !b.downFile) continue;
    await buildButton(b, panel, curRes, onDrawerColorThemeButton);
  }
  if (listEl && thumbEl) listEl.addEventListener("scroll", () => syncThemeThumb(listEl, thumbEl));
  const idx = presets.findIndex(p => p.id === drawerThemeSel);
  if (idx >= 0 && listEl) {
    const rowH = 13, top = idx * rowH, bottom = top + rowH;
    if (top < listEl.scrollTop) listEl.scrollTop = top;
    else if (bottom > listEl.scrollTop + listEl.clientHeight) listEl.scrollTop = bottom - listEl.clientHeight;
  }
  syncThemeThumb(listEl, thumbEl);
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
  drawerCFDisplayEl = null; drawerCrossfadeLedBtn = null;
  /* Nền + chữ phủ + nhãn dải tần + nền Balance + màn hình Crossfade (kể cả
     lớp phủ alpha=150): vẽ qua layerEl để tôn trọng alpha như Đợt 2. */
  for (const lay of eq.layers) {
    const img = lay.image || "";
    if (!(img.endsWith("eq.bg") || img.endsWith("eq.txtoverlay.dark") || img.endsWith("eq.txtoverlay.bright") || lay.id === "equalizer.band.label" || img.endsWith("eq.balance.bg") || img.endsWith("eq.balance.txtoverlay.bright") || img.endsWith("eq.crossfade.display"))) continue;
    if (!lay.imageFile) continue;
    const src = await resolveImg(curRes, lay.image, lay.imageFile);
    if (src) panel.appendChild(layerEl(src, lay));
  }
  bands.sort((a, b) => (a.param === "preamp" ? -1 : b.param === "preamp" ? 1 : (+a.param || 0) - (+b.param || 0)));
  for (const s of bands) {
    const bi = s.param === "preamp" ? -1 : parseInt(s.param, 10) - 1;
    if (bi < -1 || bi > 9) continue;
    await buildEQSlider(s, bi, panel, curRes, eq, true);
  }
  const bal = (eq.sliders || []).find(s => s.action === "PAN" || s.id === "Balance");
  if (bal) await buildDrawerBalanceSlider(bal, panel, curRes);
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
  /* Crossfade: nút bật/tắt + đèn LED + nút giảm/tăng thời gian (sCrossfade
     trong XML chỉ là slider ẩn 2×2 giữ giá trị cfgattrib nên không vẽ
     thành track; giá trị hiện trên CFDisplay). */
  for (const b of eq.buttons) {
    if (b.id !== "Crossfade" && b.id !== "CrossfadeLED" && b.id !== "CrossfadeDecrease" && b.id !== "CrossfadeIncrease") continue;
    if (!b.imageFile && !b.hoverFile && !b.downFile) continue;
    const built = await buildButton(b, panel, curRes, onDrawerCrossfadeButton);
    if (built && b.id === "CrossfadeLED") {
      b._stateBase = () => drawerCrossfade.on ? (b._activeSrc || b._downSrc || b._src) : b._src;
      drawerCrossfadeLedBtn = b;
      if (b._img) b._img.src = b._base();
    }
  }
  const cfText = (eq.texts || []).find(t => t.id === "CFDisplay");
  if (cfText) {
    const el = document.createElement("div");
    el.className = "wtext";
    el.style.left = cfText.x + "px"; el.style.top = cfText.y + "px";
    el.style.width = (cfText.w || 12) + "px"; el.style.height = (cfText.h || 8) + "px";
    el.style.fontSize = "8px"; el.style.lineHeight = (cfText.h || 8) + "px";
    el.style.textAlign = "center";
    if (cfText.color) el.style.color = skinColor(cfText.color);
    if (cfText.gammagroup) el.dataset.gammagroup = cfText.gammagroup;
    el.textContent = String(drawerCrossfade.secs);
    panel.appendChild(el);
    drawerCFDisplayEl = el;
  }
}
function syncDrawerButtons(win, isOpen){
  if (!win) return;
  const open = (typeof isOpen === "boolean") ? isOpen : ((typeof drawerOpen !== "undefined") && drawerOpen);
  if (win._drawerOpenBtn) win._drawerOpenBtn.style.display = open ? "none" : "";
  if (win._drawerCloseBtn) win._drawerCloseBtn.style.display = open ? "" : "none";
  if (win._drawerCloseBg) win._drawerCloseBg.style.display = open ? "" : "none";
  if (win._drawerShadow) win._drawerShadow.style.display = open ? "" : "none";
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
      const im = imgElSrc(src, lay.x, lay.y, lay.w, lay.h, lay.gammagroup);
      if (lay.id === "drawer.button.close.bg") wrap._drawerCloseBg = im;
      inner.appendChild(im);
    }
  }
  /* Bóng ngăn kéo: con của inner nên đi theo cùng độ dời với ngăn kéo, luôn
     ở mép dưới ngăn kéo (top = cao ngăn kéo − cao bóng). Ẩn khi đóng (theo
     visible="0" của groupdef) — syncDrawerButtons() bật/tắt theo trạng thái. */
  if (d.shadow && d.shadow.layers && d.shadow.layers.length) {
    const sh = document.createElement("div");
    sh.style.cssText = "position:absolute;left:0px;top:" + (sz.h - d.shadow.h) + "px;width:" + d.shadow.w + "px;height:" + d.shadow.h + "px;z-index:1;pointer-events:none;";
    for (const lay of d.shadow.layers) {
      if (!lay.imageFile) continue;
      const src = await resolveImg(res, lay.image, lay.imageFile);
      if (src) sh.appendChild(layerEl(src, lay));
    }
    inner.appendChild(sh);
    wrap._drawerShadow = sh;
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
  /* Tabs EQ/Options/Color Themes: ở đáy ngăn kéo, vị trí lấy từ model
     (config.tabs ở (10,108) trong content 326×127, đã cộng căn giữa 14px
     -> (24,108) trong hệ ngăn kéo 354). Dùng top tuyệt đối thay vì bottom
     để khớp đúng y của skin. */
  const tabsEl = document.createElement("div");
  const tabsX = (d.tabsPos && typeof d.tabsPos.x === "number") ? d.tabsPos.x : 24;
  const tabsY = (d.tabsPos && typeof d.tabsPos.y === "number") ? d.tabsPos.y : 108;
  tabsEl.style.cssText = "position:absolute;left:" + tabsX + "px;top:" + tabsY + "px;display:flex;gap:2px;align-items:flex-end;z-index:3;";
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
  /* Vùng HTML của tab Options/Color Themes: dời theo căn giữa nội dung
     (+14px): trái 22 (= options x 5+14, colorthemes x 8+14 ~ 22), phải 14
     (= mép phải content 14+326=340), trên 13 (= y của options). */
  content.style.cssText = "position:absolute;left:22px;right:14px;top:13px;bottom:28px;overflow-y:auto;";
  inner.appendChild(content);
  wrap._drawerContent = content;
  await renderDrawerTab(wrap);
  applySavedColorTheme();
  return wrap;
}
