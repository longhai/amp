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
async function buildClassicPlFrame(win, res){
  const piece = async (id, css, repeat) => {
    const src = await resolveImg(res, id, id);
    if (!src) return;
    const d = document.createElement("div");
    d.dataset.nopin = "1";
    d.style.position = "absolute";
    d.style.backgroundImage = "url(" + JSON.stringify(src) + ")";
    d.style.backgroundRepeat = repeat || "no-repeat";
    d.style.imageRendering = "pixelated";
    for (const k of ["left", "right", "top", "bottom", "width", "height"]) if (css[k] != null) d.style[k] = css[k];
    win.appendChild(d);
  };
  await piece("PLEDIT.topLeft", { left: "0px", top: "0px", width: "25px", height: "20px" });
  await piece("PLEDIT.topTitle", { left: "25px", top: "0px", width: "100px", height: "20px" });
  await piece("PLEDIT.topTile", { left: "125px", right: "25px", top: "0px", height: "20px" }, "repeat-x");
  await piece("PLEDIT.topRight", { right: "0px", top: "0px", width: "25px", height: "20px" });
  await piece("PLEDIT.leftTile", { left: "0px", top: "20px", bottom: "38px", width: "12px" }, "repeat-y");
  await piece("PLEDIT.rightTile", { right: "0px", top: "20px", bottom: "38px", width: "20px" }, "repeat-y");
  await piece("PLEDIT.bottomLeft", { left: "0px", bottom: "0px", width: "125px", height: "38px" });
  await piece("PLEDIT.bottomTile", { left: "125px", right: "150px", bottom: "0px", height: "38px" }, "repeat-x");
  await piece("PLEDIT.bottomRight", { right: "0px", bottom: "0px", width: "150px", height: "38px" });
}
async function buildPlaylistWindow(skin, res){
  const win = document.createElement("div");
  win.className = "win"; win.id = "plwin";
  const pl = skin.playlist;
  if (pl) {
    const sz = getWinSize("pl", pl.w, pl.h);
    win.dataset.w = sz.w; win.dataset.h = sz.h;
    win.style.width = sz.w + "px"; win.style.height = sz.h + "px";
    win.style.backgroundColor = "#a8adb5";
    if (pl.frame === "classic") {
      win.classList.add("plclassic");
      win.style.backgroundColor = (pl.colors && pl.colors.bg) || "#000";
      await buildClassicPlFrame(win, res);
    } else if (pl.backgroundFile) {
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
    if (pl.frame && pl.frame !== "classic") {
      /* Khung thật từ skin (loader trích qua frame): titlebar "PLAYLIST
         EDITOR" + menubar menu.group.pl (File/Playlist/Sort/Help) thay cho
         tiêu đề "Playlist" hardcode trước đây. Nút Close của khung đóng
         cửa sổ playlist (đánh dấu _winKind để onFrameButton nhận ra). */
      await renderFrameInto(win, pl.frame, res);
      for (const b of (pl.frame.buttons || [])) b._winKind = "pl";
    }
    for (const lay of pl.layers) {
      if (!lay.imageFile) continue;
      const src = await resolveImg(res, lay.image, lay.imageFile);
      if (src) win.appendChild(imgElSrc(src, lay.x, lay.y, lay.w, lay.h));
    }
    const rect = playlistListRect(pl);
    const list = document.createElement("div");
    list.className = "eqlist";
    list.style.left = rect.x + "px"; list.style.top = rect.y + "px";
    list.style.width = rect.w + "px"; list.style.height = rect.h + "px";
    if (pl.colors) { list.style.background = pl.colors.bg; list.style.color = pl.colors.normal; }
    else if (pl.frame === "classic") { list.style.background = "#000"; }
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
    if (pl.frame === "classic") {
      for (const b of pl.buttons) {
        const d = document.createElement("div");
        d.className = "btn"; d.title = b.tooltip || b.id || b.action || "";
        d.style.left = b.x + "px"; d.style.top = b.y + "px";
        d.style.width = (b.w || 10) + "px"; d.style.height = (b.h || 10) + "px";
        d.addEventListener("click", () => onPLButton(b));
        win.appendChild(d); b._el = d;
      }
    } else {
      for (const b of pl.buttons) await buildButton(b, win, res, onPLButton);
    }
    win._pin = buildPinRecord(win, pl.w, pl.h, rect);
    if (sz.h < win._pin.minH) { sz.h = win._pin.minH; win.dataset.h = sz.h; win.style.height = sz.h + "px"; }
    applyWinLayout(win, sz.w, sz.h);
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
  else if (a === "PE_LIST") setStatus("PE_LIST: menu danh sách chưa làm trong bản này");
  else if (a === "CLOSE") toggleWindow("pl");
  else if (a === "SWITCH") setStatus("Nút winshade chưa làm trong bản này");
  else setStatus("Nút playlist này chưa có tác dụng trong bản này");
}

