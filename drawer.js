"use strict";
let drawerTab = "eq", drawerThemeFilter = null;
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
function renderDrawerTab(win){
  const d = SKIN.drawer;
  const content = win._drawerContent;
  if (!content) return;
  content.innerHTML = "";
  const tab = d.tabs.find(t => t.name === drawerTab) || d.tabs[0];
  for (const t of d.tabs) {
    const el = win._drawerTabs[t.name];
    if (!el) continue;
    const on = t === tab;
    el.style.opacity = on ? "1" : "0.55";
    el.style.fontWeight = on ? "bold" : "normal";
  }
  if (drawerTab === "eq") {
    const c = d.contents.eq;
    if (c) {
      for (const lay of c.layers) {
        if (!lay.imageFile) continue;
        resolveImg(curRes, lay.image, lay.imageFile).then(src => {
          if (src && drawerTab === "eq" && content.isConnected) content.appendChild(imgElSrc(src, lay.x, lay.y, lay.w, lay.h));
        });
      }
    }
    const btn = document.createElement("div");
    btn.className = "optrow";
    btn.style.top = "0px"; btn.style.zIndex = "5"; btn.style.background = "rgba(0,0,0,.55)";
    btn.innerHTML = "Mở cửa sổ EQ đầy đủ <span class='st'>›</span>";
    btn.addEventListener("click", async () => { await toggleWindow("eq"); });
    content.appendChild(btn);
    const st = document.createElement("div");
    st.className = "optrow";
    st.style.top = "24px"; st.style.zIndex = "5"; st.style.background = "rgba(0,0,0,.55)";
    st.innerHTML = "EQ: <span class='st'>" + (eqState.on ? "BẬT" : "TẮT") + "</span>";
    st.addEventListener("click", async () => { await setEQOn(!eqState.on); renderDrawerTab(win); });
    content.appendChild(st);
  } else if (drawerTab === "options") {
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
  inner.style.transform = "translateY(100%)";
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
    if (src) inner.appendChild(imgElSrc(src, lay.x, lay.y, lay.w, lay.h));
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
  const tabsEl = document.createElement("div");
  tabsEl.style.cssText = "position:absolute;left:8px;top:4px;display:flex;gap:6px;z-index:3;";
  inner.appendChild(tabsEl);
  wrap._drawerTabs = {};
  for (const t of d.tabs) {
    const el = document.createElement("div");
    el.textContent = t.label;
    el.style.cssText = "color:#ddd;font-size:12px;padding:2px 8px;cursor:pointer;background:rgba(0,0,0,.4);border:1px solid #666;border-radius:3px;";
    el.addEventListener("click", () => { drawerTab = t.name; renderDrawerTab(wrap); });
    tabsEl.appendChild(el);
    wrap._drawerTabs[t.name] = el;
  }
  const content = document.createElement("div");
  content.style.cssText = "position:absolute;left:8px;right:8px;top:26px;bottom:8px;";
  inner.appendChild(content);
  wrap._drawerContent = content;
  renderDrawerTab(wrap);
  applySavedColorTheme();
  return wrap;
}
