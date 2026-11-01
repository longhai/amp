"use strict";
let mlState = { level: "artists", artist: null, album: null };
function mlTree(){
  const artists = {};
  const add = (artist, album, item) => {
    artists[artist] = artists[artist] || {};
    artists[artist][album] = artists[artist][album] || [];
    artists[artist][album].push(item);
  };
  for (const c of channels) add(c.group || "Radio", c.group || "Kênh radio", { kind: "radio", ch: channels.indexOf(c), name: c.name });
  for (const f of localFiles) add(f.artist || "Không rõ", f.album || "File local", { kind: "file", name: f.name, blobURL: f.blobURL });
  return artists;
}
function mlCount(tree){
  let n = 0;
  for (const a of Object.values(tree)) for (const s of Object.values(a)) n += s.length;
  return n;
}
function renderML(winArg){
  const win = winArg || mlWin; if (!win || !win._mlList) return;
  const list = win._mlList, nav = win._mlNav, crumb = win._mlCrumb;
  const tree = mlTree();
  list.innerHTML = "";
  const row = (label, sub, fn) => {
    const r = document.createElement("div");
    r.className = "row";
    r.innerHTML = escapeHtml(label) + (sub ? " <span class='num'>" + escapeHtml(sub) + "</span>" : "");
    r.addEventListener("click", fn);
    list.appendChild(r);
  };
  const songRow = (it, i) => {
    const cur = it.kind === "radio" ? (mode === "radio" && idx === it.ch)
      : (mode === "file" && fileBlobURL === it.blobURL);
    const r = document.createElement("div");
    r.className = "row" + (cur ? " cur" : "");
    r.innerHTML = "<span class='num'>" + (i + 1) + ".</span>" + escapeHtml(it.name);
    r.addEventListener("click", () => {
      if (it.kind === "radio") loadChannel(it.ch, true);
      else playLocalFile(it.blobURL, it.name);
    });
    list.appendChild(r);
  };
  if (mlState.level === "artists") {
    nav.style.display = "none";
    const names = Object.keys(tree).sort();
    row("Tất cả bài hát", mlCount(tree) + " bài", () => {
      mlState = { level: "songs", artist: null, album: null };
      renderML();
    });
    if (names.length === 1) {
      let songs = [];
      for (const s of Object.values(tree[names[0]])) songs = songs.concat(s);
      songs.forEach((it, i) => songRow(it, i));
    } else {
      for (const a of names) {
        let n = 0; for (const s of Object.values(tree[a])) n += s.length;
        row(a, n + " bài", () => { mlState = { level: "albums", artist: a, album: null }; renderML(); });
      }
    }
  } else if (mlState.level === "albums") {
    nav.style.display = "";
    crumb.textContent = mlState.artist;
    const albums = tree[mlState.artist] || {};
    for (const al of Object.keys(albums).sort()) {
      row(al, albums[al].length + " bài", () => { mlState = { level: "songs", artist: mlState.artist, album: al }; renderML(); });
    }
  } else {
    nav.style.display = "";
    crumb.textContent = (mlState.artist || "Tất cả") + (mlState.album ? " › " + mlState.album : "");
    let songs = [];
    if (mlState.artist) {
      if (mlState.album) songs = (tree[mlState.artist] || {})[mlState.album] || [];
      else for (const s of Object.values(tree[mlState.artist] || {})) songs = songs.concat(s);
    } else {
      for (const a of Object.values(tree)) for (const s of Object.values(a)) songs = songs.concat(s);
    }
    songs.forEach((it, i) => songRow(it, i));
  }
}
window.refreshML = renderML;
function onMLButton(b){
  const a = b.action;
  if (a === "CLOSE") toggleWindow("ml");
  else if (a === "MINIMIZE") toggleWindow("ml");
  else onMainButton(b);
}
async function buildMLWindow(skin, res){
  const win = document.createElement("div");
  win.className = "win"; win.id = "mlwin";
  const ml = skin.ml;
  if (ml) {
    const sz = getWinSize("ml", ml.w, ml.h);
    win.dataset.w = sz.w; win.dataset.h = sz.h;
    win.style.width = sz.w + "px"; win.style.height = sz.h + "px";
    win.style.backgroundColor = "#a8adb5";
    if (ml.backgroundFile) {
      const bg = await resolveImg(res, ml.background, ml.backgroundFile);
      if (bg) { win.style.backgroundImage = "url(" + JSON.stringify(bg) + ")"; win.style.backgroundSize = sz.w + "px " + sz.h + "px"; win._bgImg = true; }
    }
    await renderFrameInto(win, ml.frame, res);
    for (const b of (ml.frame && ml.frame.buttons || [])) b._winKind = "ml";
    for (const bg of (ml.backgrounds || [])) {
      if (!bg.imageFile) continue;
      const src = await resolveImg(res, bg.image, bg.imageFile);
      if (src) win.appendChild(imgElSrc(src, bg.x, bg.y, bg.w, bg.h));
    }
    for (const lay of ml.layers) {
      if (!lay.imageFile) continue;
      const src = await resolveImg(res, lay.image, lay.imageFile);
      if (src) win.appendChild(imgElSrc(src, lay.x, lay.y, lay.w, lay.h));
    }
    const r = (ml.listRect && ml.listRect.w > 20 && ml.listRect.h > 20) ? ml.listRect
      : { x: 6, y: 24, w: sz.w - 12, h: sz.h - 30 };
    const nav = document.createElement("div");
    nav.className = "mlnav";
    nav.style.left = r.x + "px"; nav.style.top = r.y + "px"; nav.style.width = r.w + "px";
    const back = document.createElement("button");
    back.textContent = "‹ Quay lại";
    back.addEventListener("click", () => {
      if (mlState.level === "songs") mlState = mlState.album ? { level: "albums", artist: mlState.artist, album: null } : { level: "artists", artist: null, album: null };
      else if (mlState.level === "albums") mlState = { level: "artists", artist: null, album: null };
      renderML();
    });
    const crumb = document.createElement("span");
    crumb.className = "crumb";
    nav.appendChild(back); nav.appendChild(crumb);
    win.appendChild(nav);
    win._mlNav = nav; win._mlCrumb = crumb;
    const list = document.createElement("div");
    list.className = "eqlist";
    list.style.left = r.x + "px"; list.style.top = (r.y + 22) + "px";
    list.style.width = r.w + "px"; list.style.height = Math.max(40, r.h - 22) + "px";
    win.appendChild(list);
    win._mlList = list;
    win._flexBox = list; win._flexRect = { x: r.x, y: r.y + 22, w: r.w, h: Math.max(40, r.h - 22) };
    win._flexInsetR = sz.w - (r.x + r.w); win._flexInsetB = sz.h - (r.y + r.h);
    for (const t of ml.texts) {
      if (!t.default) continue;
      const el = document.createElement("div");
      el.className = "wtext";
      el.style.left = t.x + "px"; el.style.top = t.y + "px";
      el.style.width = (t.w || 50) + "px"; el.style.height = (t.h || 14) + "px";
      el.style.fontSize = "8px"; el.style.lineHeight = (t.h || 14) + "px";
      el.textContent = compName(t.default, (skin.skin && skin.skin.name) || "WINAMP");
      win.appendChild(el);
    }
    for (const b of ml.buttons) await buildButton(b, win, res, onMLButton);
    if (ml.listRect && ml.listRect.w > 20 && ml.listRect.h > 20) {
      win._pin = buildPinRecord(win, ml.w, ml.h, r);
      if (sz.h < win._pin.minH) { sz.h = win._pin.minH; win.dataset.h = sz.h; win.style.height = sz.h + "px"; }
      applyWinLayout(win, sz.w, sz.h);
    }
  } else {
    const sz = getWinSize("ml", 320, 300);
    win.dataset.w = sz.w; win.dataset.h = sz.h;
    win.classList.add("plfallback");
    win.style.width = sz.w + "px"; win.style.height = sz.h + "px";
    const title = document.createElement("div");
    title.className = "title"; title.textContent = "Thư viện";
    win.appendChild(title);
    const x = document.createElement("button");
    x.className = "x"; x.textContent = "✕";
    x.addEventListener("click", () => toggleWindow("ml"));
    win.appendChild(x);
    const nav = document.createElement("div");
    nav.className = "mlnav";
    nav.style.left = "6px"; nav.style.top = "24px"; nav.style.width = (sz.w - 12) + "px";
    const back = document.createElement("button");
    back.textContent = "‹ Quay lại";
    back.addEventListener("click", () => {
      if (mlState.level === "songs") mlState = mlState.album ? { level: "albums", artist: mlState.artist, album: null } : { level: "artists", artist: null, album: null };
      else if (mlState.level === "albums") mlState = { level: "artists", artist: null, album: null };
      renderML();
    });
    const crumb = document.createElement("span");
    crumb.className = "crumb";
    nav.appendChild(back); nav.appendChild(crumb);
    win.appendChild(nav);
    win._mlNav = nav; win._mlCrumb = crumb;
    const list = document.createElement("div");
    list.className = "eqlist";
    list.style.left = "6px"; list.style.top = "46px";
    list.style.width = (sz.w - 12) + "px"; list.style.height = (sz.h - 52) + "px";
    win.appendChild(list);
    win._mlList = list;
    win._flexBox = list; win._flexRect = { x: 6, y: 46, w: sz.w - 12, h: sz.h - 52 };
    win._flexInsetR = 6; win._flexInsetB = 6;
  }
  mlState = { level: "artists", artist: null, album: null };
  renderML(win);
  addResizeHandle(win, "ml");
  return win;
}
