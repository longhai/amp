"use strict";
function onAboutButton(b){
  const a = b.action;
  if (a === "CLOSE") toggleWindow("about");
  else if (a === "MINIMIZE") toggleWindow("about");
  else onMainButton(b);
}
function aboutFill(t){
  const info = SKIN && SKIN.skin ? SKIN.skin : {};
  const id = (t.id || "").toLowerCase();
  if (/text1/.test(id)) return info.name || "";
  if (/text2/.test(id)) return (info.author || "") + (info.version ? " · v" + info.version : "");
  if (/text3/.test(id)) return info.comment || "";
  return t.default || "";
}
async function buildAboutWindow(skin, res){
  const win = document.createElement("div");
  win.className = "win"; win.id = "aboutwin";
  const ab = skin.about;
  if (ab) {
    const sz = getWinSize("about", ab.w, ab.h);
    win.dataset.w = sz.w; win.dataset.h = sz.h;
    win.style.width = sz.w + "px"; win.style.height = sz.h + "px";
    win.style.backgroundColor = "#6e7786";
    if (ab.backgroundFile) {
      const bg = await resolveImg(res, ab.background, ab.backgroundFile);
      if (bg) { win.style.backgroundImage = "url(" + JSON.stringify(bg) + ")"; win.style.backgroundSize = sz.w + "px " + sz.h + "px"; win._bgImg = true; }
    }
    await renderFrameInto(win, ab.frame, res);
    for (const b of (ab.frame && ab.frame.buttons || [])) b._winKind = "about";
    for (const bg of (ab.backgrounds || [])) {
      if (!bg.imageFile) continue;
      const src = await resolveImg(res, bg.image, bg.imageFile);
      if (src) win.appendChild(imgElSrc(src, bg.x, bg.y, bg.w, bg.h));
    }
    for (const lay of ab.layers) {
      if (!lay.imageFile) continue;
      const src = await resolveImg(res, lay.image, lay.imageFile);
      if (src) win.appendChild(imgElSrc(src, lay.x, lay.y, lay.w, lay.h));
    }
    for (const t of ab.texts) {
      const txt = aboutFill(t);
      if (!txt) continue;
      const el = document.createElement("div");
      el.className = "wtext";
      el.style.left = t.x + "px"; el.style.top = t.y + "px";
      el.style.width = (t.w || 200) + "px"; el.style.height = (t.h || 14) + "px";
      el.style.fontSize = (t.fontsize ? Math.min(17, +t.fontsize) : 12) + "px";
      el.style.lineHeight = (t.h || 14) + "px";
      el.style.textAlign = t.align || "center";
      el.style.color = "#fff"; el.style.textShadow = "0 1px 2px rgba(0,0,0,.7)";
      el.textContent = compName(txt, (skin.skin && skin.skin.name) || "WINAMP");
      win.appendChild(el);
    }
    for (const b of ab.buttons) await buildButton(b, win, res, onAboutButton);
  } else {
    const sz = getWinSize("about", 320, 200);
    win.dataset.w = sz.w; win.dataset.h = sz.h;
    win.classList.add("plfallback");
    win.style.width = sz.w + "px"; win.style.height = sz.h + "px";
    const title = document.createElement("div");
    title.className = "title"; title.textContent = "Giới thiệu";
    win.appendChild(title);
    const x = document.createElement("button");
    x.className = "x"; x.textContent = "✕";
    x.addEventListener("click", () => toggleWindow("about"));
    win.appendChild(x);
    const info = (SKIN && SKIN.skin) || {};
    const body = document.createElement("div");
    body.style.cssText = "position:absolute;left:10px;right:10px;top:30px;bottom:10px;color:#ddd;font-size:13px;line-height:20px;text-align:left;overflow:auto;";
    body.innerHTML = "<b>" + escapeHtml(info.name || "Skin") + "</b><br>Tác giả: " + escapeHtml(info.author || "?")
      + "<br>Phiên bản: " + escapeHtml(info.version || "?")
      + (info.comment ? "<br>" + escapeHtml(info.comment) : "")
      + "<br><br>Amp v8 · loader v8.1 · chạy skin Winamp Modern (.wal) trên web";
    win.appendChild(body);
  }
  addResizeHandle(win, "about");
  return win;
}
