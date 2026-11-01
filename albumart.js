"use strict";
let aaImg = null, aaName = null, aaCurKey = null, aaDefaultURL = null, aaObjectURL = null;
function onAAButton(b){
  const a = b.action;
  if (a === "CLOSE") toggleWindow("albumart");
  else if (a === "MINIMIZE") toggleWindow("albumart");
  else onMainButton(b);
}
function id3CoverURL(buf){
  try {
    const d = new Uint8Array(buf);
    if (d.length < 10 || d[0] !== 0x49 || d[1] !== 0x44 || d[2] !== 0x33) return null;
    const size = ((d[6] & 0x7f) << 21) | ((d[7] & 0x7f) << 14) | ((d[8] & 0x7f) << 7) | (d[9] & 0x7f);
    const ver = d[3] || 0;
    const end = Math.min(d.length, 10 + size);
    let p = 10;
    while (p + 10 <= end) {
      const id = String.fromCharCode(d[p], d[p + 1], d[p + 2], d[p + 3]);
      const sz = ver >= 4 ? ((d[p + 4] & 0x7f) << 21) | ((d[p + 5] & 0x7f) << 14) | ((d[p + 6] & 0x7f) << 7) | (d[p + 7] & 0x7f)
        : (d[p + 4] << 24) | (d[p + 5] << 16) | (d[p + 6] << 8) | d[p + 7];
      if (sz <= 0 || p + 10 + sz > end) break;
      if (id === "APIC") {
        let q = p + 10;
        const enc = d[q]; q++;
        let mimeEnd = q; while (mimeEnd < p + 10 + sz && d[mimeEnd] !== 0) mimeEnd++;
        const mime = String.fromCharCode.apply(null, d.subarray(q, mimeEnd)) || "image/jpeg";
        q = mimeEnd + 1;
        q++;
        if (enc === 1) { while (q + 1 < p + 10 + sz && !(d[q] === 0 && d[q + 1] === 0)) q += 2; q += 2; }
        else { while (q < p + 10 + sz && d[q] !== 0) q++; q++; }
        const img = d.subarray(q, p + 10 + sz);
        if (img.length > 100) return URL.createObjectURL(new Blob([img], { type: mime }));
        return null;
      }
      p += 10 + sz;
    }
  } catch (e) {}
  return null;
}
function flacCoverURL(buf){
  try {
    const d = new Uint8Array(buf);
    if (d.length < 8 || d[0] !== 0x66 || d[1] !== 0x4c || d[2] !== 0x61 || d[3] !== 0x43) return null;
    const be32 = o => ((d[o] << 24) | (d[o+1] << 16) | (d[o+2] << 8) | d[o+3]) >>> 0;
    let p = 4, first = null;
    while (p + 4 <= d.length) {
      const last = d[p] & 0x80, type = d[p] & 0x7f;
      const len = (d[p+1] << 16) | (d[p+2] << 8) | d[p+3];
      const end = p + 4 + len;
      if (len < 0 || end > d.length) break;
      if (type === 6) {
        let q = p + 4;
        const picType = be32(q); q += 4;
        const mimeLen = be32(q); q += 4;
        let mime = "image/jpeg";
        if (mimeLen > 0 && mimeLen < 64 && q + mimeLen <= end) { try { mime = String.fromCharCode.apply(null, d.subarray(q, q + mimeLen)); } catch (e) {} }
        q += mimeLen;
        const descLen = be32(q); q += 4 + descLen;
        q += 16;
        const dataLen = be32(q); q += 4;
        if (dataLen > 100 && q + dataLen <= end) {
          const url = URL.createObjectURL(new Blob([d.subarray(q, q + dataLen)], { type: mime }));
          if (picType === 3) return url;
          if (!first) first = url;
        }
      }
      if (last) break;
      p = end;
    }
    return first;
  } catch (e) {}
  return null;
}
async function updateAlbumArt(){
  if (!aaImg) return;
  const key = mode === "file" ? (fileBlobURL || "") : (channels[idx] ? channels[idx].url : "");
  const label = mode === "file" ? (fileName || "File local") : (channels[idx] ? channels[idx].name : "");
  if (aaName) aaName.textContent = label;
  if (key === aaCurKey) return;
  aaCurKey = key;
  if (aaObjectURL) { try { URL.revokeObjectURL(aaObjectURL); } catch (e) {} aaObjectURL = null; }
  let url = null;
  if (mode === "file" && fileBlobURL) {
    try {
      let buf = null;
      if (typeof fileBlob !== "undefined" && fileBlob) buf = await fileBlob.slice(0, 1048576).arrayBuffer();
      else { const r = await fetch(fileBlobURL); buf = (await r.arrayBuffer()).slice(0, 1048576); }
      if (buf) url = flacCoverURL(buf) || id3CoverURL(buf.slice(0, 262144));
      if (url) aaObjectURL = url;
    } catch (e) {}
  }
  aaImg.src = url || aaDefaultURL || "";
  aaImg.style.display = (url || aaDefaultURL) ? "" : "none";
}
window.updateAlbumArt = updateAlbumArt;
async function buildAlbumArtWindow(skin, res){
  const win = document.createElement("div");
  win.className = "win"; win.id = "aawin";
  const aa = skin.albumart;
  const mkArt = (rect) => {
    const img = document.createElement("img");
    img.className = "aaimg";
    img.style.left = rect.x + "px"; img.style.top = rect.y + "px";
    img.style.width = rect.w + "px"; img.style.height = rect.h + "px";
    win.appendChild(img);
    aaImg = img;
    const nm = document.createElement("div");
    nm.className = "aaname";
    nm.style.top = (rect.y + rect.h - 18) + "px";
    win.appendChild(nm);
    aaName = nm;
    win._flexBox = img; win._flexRect = { x: rect.x, y: rect.y, w: rect.w, h: rect.h };
    return img;
  };
  if (aa) {
    const sz = getWinSize("albumart", aa.w, aa.h);
    win.dataset.w = sz.w; win.dataset.h = sz.h;
    win.style.width = sz.w + "px"; win.style.height = sz.h + "px";
    win.style.backgroundColor = "#000";
    if (aa.backgroundFile) {
      const bg = await resolveImg(res, aa.background, aa.backgroundFile);
      if (bg) { win.style.backgroundImage = "url(" + JSON.stringify(bg) + ")"; win.style.backgroundSize = sz.w + "px " + sz.h + "px"; win._bgImg = true; }
    }
    await renderFrameInto(win, aa.frame, res);
    for (const b of (aa.frame && aa.frame.buttons || [])) b._winKind = "albumart";
    for (const bg of (aa.backgrounds || [])) {
      if (!bg.imageFile) continue;
      const src = await resolveImg(res, bg.image, bg.imageFile);
      if (src) win.appendChild(imgElSrc(src, bg.x, bg.y, bg.w, bg.h));
    }
    for (const lay of aa.layers) {
      if (!lay.imageFile) continue;
      const src = await resolveImg(res, lay.image, lay.imageFile);
      if (src) win.appendChild(imgElSrc(src, lay.x, lay.y, lay.w, lay.h));
    }
    const r = (aa.listRect && aa.listRect.w > 20 && aa.listRect.h > 20) ? aa.listRect
      : { x: 4, y: 4, w: sz.w - 8, h: sz.h - 8 };
    mkArt(r);
    win._flexInsetR = sz.w - (r.x + r.w); win._flexInsetB = sz.h - (r.y + r.h);
    const bg0 = (aa.backgrounds && aa.backgrounds[0]) || aa.layers[0];
    if (bg0 && bg0.imageFile) aaDefaultURL = await resolveImg(res, bg0.image, bg0.imageFile);
    if (!aaDefaultURL && aa.backgroundFile) aaDefaultURL = await resolveImg(res, aa.background, aa.backgroundFile);
    for (const b of aa.buttons) await buildButton(b, win, res, onAAButton);
    if (aa.listRect && aa.listRect.w > 20 && aa.listRect.h > 20) {
      win._pin = buildPinRecord(win, aa.w, aa.h, r);
      if (aaName) win._pin.els.push({ el: aaName, mode: "follow", off: 18 });
      if (sz.h < win._pin.minH) { sz.h = win._pin.minH; win.dataset.h = sz.h; win.style.height = sz.h + "px"; }
      applyWinLayout(win, sz.w, sz.h);
    }
  } else {
    const sz = getWinSize("albumart", 200, 220);
    win.dataset.w = sz.w; win.dataset.h = sz.h;
    win.classList.add("plfallback");
    win.style.width = sz.w + "px"; win.style.height = sz.h + "px";
    const title = document.createElement("div");
    title.className = "title"; title.textContent = "Ảnh bìa";
    win.appendChild(title);
    const x = document.createElement("button");
    x.className = "x"; x.textContent = "✕";
    x.addEventListener("click", () => toggleWindow("albumart"));
    win.appendChild(x);
    mkArt({ x: 6, y: 24, w: sz.w - 12, h: sz.h - 30 });
    win._flexInsetR = 6; win._flexInsetB = 6;
  }
  addResizeHandle(win, "albumart");
  aaCurKey = null;
  await updateAlbumArt();
  return win;
}
