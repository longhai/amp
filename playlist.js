"use strict";
function playlistListRect(pl){
  const r = pl.listRect;
  if (r && r.w > 20 && r.h > 20 && !(r.x <= 0 && r.y <= 0 && r.w >= pl.w && r.h >= pl.h)) return r;
  const bottomBtns = (pl.buttons || []).filter(b => b.y > pl.h * 0.6);
  const bottomY = bottomBtns.length ? Math.min(...bottomBtns.map(b => b.y)) : pl.h;
  const top = 24;
  return { x: 6, y: top, w: pl.w - 12, h: Math.max(40, bottomY - 6 - top) };
}
/* cửa sổ Playlist + tay kéo đổi cỡ */
async function buildPlaylistWindow(skin, res){
  const win = document.createElement("div");
  win.className = "win"; win.id = "plwin";
  const pl = skin.playlist;
  if (pl) {
    const sz = getWinSize("pl", pl.w, pl.h);
    win.dataset.w = sz.w; win.dataset.h = sz.h;
    win.style.width = sz.w + "px"; win.style.height = sz.h + "px";
    win.style.backgroundColor = "#a8adb5";
    if (pl.backgroundFile) {
      const bg = await resolveImg(res, pl.background, pl.backgroundFile);
      if (bg) {
        win.style.backgroundImage = "url(" + JSON.stringify(bg) + ")";
        win.style.backgroundSize = sz.w + "px " + sz.h + "px";
        win._bgImg = true;
      }
    } else if (pl.backgrounds && pl.backgrounds[0] && pl.backgrounds[0].imageFile) {
      const bg = await resolveImg(res, pl.backgrounds[0].image, pl.backgrounds[0].imageFile);
      if (bg) win.style.backgroundImage = "url(" + JSON.stringify(bg) + ")";
    }
    for (const bg of (pl.backgrounds || [])) {
      if (!bg.imageFile) continue;
      const src = await resolveImg(res, bg.image, bg.imageFile);
      if (src) win.appendChild(imgElSrc(src, bg.x, bg.y, bg.w, bg.h));
    }
    const ptitle = document.createElement("div");
    ptitle.className = "wtext";
    ptitle.style.left = "8px"; ptitle.style.top = "3px";
    ptitle.style.width = "120px"; ptitle.style.height = "14px";
    ptitle.style.color = "#fff"; ptitle.style.textShadow = "0 1px 2px rgba(0,0,0,.8)";
    ptitle.style.fontSize = "12px"; ptitle.style.lineHeight = "14px";
    ptitle.textContent = "Playlist";
    win.appendChild(ptitle);
    for (const lay of pl.layers) {
      if (!lay.imageFile) continue;
      const src = await resolveImg(res, lay.image, lay.imageFile);
      if (src) win.appendChild(imgElSrc(src, lay.x, lay.y, lay.w, lay.h));
    }
    const rect = playlistListRect({ ...pl, w: sz.w, h: sz.h });
    const list = document.createElement("div");
    list.className = "eqlist";
    list.style.left = rect.x + "px"; list.style.top = rect.y + "px";
    list.style.width = rect.w + "px"; list.style.height = rect.h + "px";
    win.appendChild(list);
    plListEl = list;
    win._plList = list; win._plRect = rect;
    win._plInsetR = sz.w - (rect.x + rect.w); win._plInsetB = sz.h - (rect.y + rect.h);
    for (const t of pl.texts) {
      if (!t.default && t.display !== "PE_Info") continue;
      const el = document.createElement("div");
      el.className = "wtext";
      el.style.left = t.x + "px"; el.style.top = t.y + "px";
      el.style.width = (t.w || 55) + "px"; el.style.height = (t.h || 8) + "px";
      el.style.fontSize = "8px"; el.style.lineHeight = (t.h || 8) + "px";
      el.dataset.display = t.display || "";
      win.appendChild(el);
    }
    for (const b of pl.buttons) await buildButton(b, win, res, onPLButton);
  } else {
    const sz = getWinSize("pl", 320, 300);
    win.dataset.w = sz.w; win.dataset.h = sz.h;
    win.classList.add("plfallback");
    win.style.width = sz.w + "px"; win.style.height = sz.h + "px";
    const title = document.createElement("div");
    title.className = "title"; title.textContent = "Playlist";
    win.appendChild(title);
    const x = document.createElement("button");
    x.className = "x"; x.textContent = "✕";
    x.addEventListener("click", () => toggleWindow("pl"));
    win.appendChild(x);
    const list = document.createElement("div");
    list.className = "eqlist";
    list.style.left = "6px"; list.style.top = "24px";
    list.style.width = (sz.w - 12) + "px"; list.style.height = (sz.h - 30) + "px";
    win.appendChild(list);
    plListEl = list;
    win._plList = list; win._plRect = { x: 6, y: 24, w: sz.w - 12, h: sz.h - 30 };
    win._plInsetR = 6; win._plInsetB = 6;
  }
  addResizeHandle(win, "pl");
  return win;
}
function onPLButton(b){
  const a = b.action;
  if (a === "PE_ADD") { $("#filepick").click(); }
  else if (a === "PE_REM") {
    const cur = plItems.find(isCurrentPlItem);
    if (cur && cur.kind === "file") {
      localFiles = localFiles.filter(f => f.blobURL !== cur.blobURL);
      rebuildPlItems(); renderPlaylist(true);
      setStatus("Đã bỏ file khỏi playlist: " + cur.name);
    } else setStatus("PE_REM: chỉ bỏ được file local đang phát (kênh radio nằm trong radio.m3u)");
  }
  else if (a === "PE_SEL") setStatus("PE_SEL: menu chọn chưa làm trong bản này");
  else if (a === "PE_MISC") setStatus("PE_MISC: menu phụ chưa làm trong bản này");
  else if (a === "PE_LIST") { const s = $("#chan"); s.focus(); s.size = s.size ? 0 : 8; }
  else if (a === "CLOSE") toggleWindow("pl");
  else if (a === "SWITCH") setStatus("Nút winshade chưa làm trong bản này");
  else setStatus("Nút playlist này chưa có tác dụng trong bản này");
}

