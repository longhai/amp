/* classic-skin.js — Amp v7: doc .wsz (Winamp 2 classic) bang bang co dinh
   cua Webamp (src/packages/webamp/js/skinSprites.ts) + vi tri cua so tu
   css/main-window.css, equalizer-window.css, playlist-window.css. */
(function () {
  "use strict";
  const VERSION = "7";
  const SHEETS = ["main", "cbuttons", "titlebar", "posbar", "volume", "balance",
    "shufrep", "eqmain", "pledit", "text", "numbers", "playpaus", "monoster",
    "gen", "genex", "video", "mb", "eq_ex"];
  const SPRITES = {
    "MAIN.bg": ["main", 0, 0, 275, 116],
    "MAIN.clutter.o": ["main", 10, 25, 8, 8],
    "MAIN.clutter.a": ["main", 10, 33, 8, 7],
    "MAIN.clutter.i": ["main", 10, 40, 8, 7],
    "MAIN.clutter.d": ["main", 10, 47, 8, 8],
    "MAIN.clutter.v": ["main", 10, 55, 8, 7],
    "MAIN.about": ["main", 253, 91, 13, 15],
    "CBUTTONS.prev": ["cbuttons", 0, 0, 23, 18],
    "CBUTTONS.prev.down": ["cbuttons", 0, 18, 23, 18],
    "CBUTTONS.play": ["cbuttons", 23, 0, 23, 18],
    "CBUTTONS.play.down": ["cbuttons", 23, 18, 23, 18],
    "CBUTTONS.pause": ["cbuttons", 46, 0, 23, 18],
    "CBUTTONS.pause.down": ["cbuttons", 46, 18, 23, 18],
    "CBUTTONS.stop": ["cbuttons", 69, 0, 23, 18],
    "CBUTTONS.stop.down": ["cbuttons", 69, 18, 23, 18],
    "CBUTTONS.next": ["cbuttons", 92, 0, 22, 18],
    "CBUTTONS.next.down": ["cbuttons", 92, 18, 22, 18],
    "CBUTTONS.eject": ["cbuttons", 114, 0, 22, 16],
    "CBUTTONS.eject.down": ["cbuttons", 114, 16, 22, 16],
    "TITLEBAR.options": ["titlebar", 0, 0, 9, 9],
    "TITLEBAR.options.down": ["titlebar", 0, 9, 9, 9],
    "TITLEBAR.minimize": ["titlebar", 9, 0, 9, 9],
    "TITLEBAR.minimize.down": ["titlebar", 9, 9, 9, 9],
    "TITLEBAR.shade": ["titlebar", 0, 18, 9, 9],
    "TITLEBAR.shade.down": ["titlebar", 9, 18, 9, 9],
    "TITLEBAR.close": ["titlebar", 18, 0, 9, 9],
    "TITLEBAR.close.down": ["titlebar", 18, 9, 9, 9],
    "TITLEBAR.clutter.o.on": ["titlebar", 304, 47, 8, 8],
    "TITLEBAR.clutter.a.on": ["titlebar", 312, 55, 8, 7],
    "TITLEBAR.clutter.i.on": ["titlebar", 320, 62, 8, 7],
    "TITLEBAR.clutter.d.on": ["titlebar", 328, 69, 8, 8],
    "TITLEBAR.clutter.v.on": ["titlebar", 336, 77, 8, 7],
    "POSBAR.bg": ["posbar", 0, 0, 248, 10],
    "POSBAR.thumb": ["posbar", 248, 0, 29, 10],
    "POSBAR.thumb.down": ["posbar", 278, 0, 29, 10],
    "VOLUME.strip": ["volume", 0, 0, 68, 420],
    "VOLUME.thumb": ["volume", 15, 422, 14, 11],
    "VOLUME.thumb.down": ["volume", 0, 422, 14, 11],
    "SHUFREP.shuffle": ["shufrep", 28, 0, 47, 15],
    "SHUFREP.shuffle.down": ["shufrep", 28, 15, 47, 15],
    "SHUFREP.shuffle.on": ["shufrep", 28, 30, 47, 15],
    "SHUFREP.shuffle.on.down": ["shufrep", 28, 45, 47, 15],
    "SHUFREP.repeat": ["shufrep", 0, 0, 28, 15],
    "SHUFREP.repeat.down": ["shufrep", 0, 15, 28, 15],
    "SHUFREP.repeat.on": ["shufrep", 0, 30, 28, 15],
    "SHUFREP.repeat.on.down": ["shufrep", 0, 45, 28, 15],
    "SHUFREP.eq": ["shufrep", 0, 61, 23, 12],
    "SHUFREP.eq.down": ["shufrep", 46, 61, 23, 12],
    "SHUFREP.eq.on": ["shufrep", 0, 73, 23, 12],
    "SHUFREP.eq.on.down": ["shufrep", 46, 73, 23, 12],
    "SHUFREP.playlist": ["shufrep", 23, 61, 23, 12],
    "SHUFREP.playlist.down": ["shufrep", 69, 61, 23, 12],
    "SHUFREP.playlist.on": ["shufrep", 23, 73, 23, 12],
    "SHUFREP.playlist.on.down": ["shufrep", 69, 73, 23, 12],
    "MONOSTER.mono": ["monoster", 29, 12, 27, 12],
    "MONOSTER.mono.on": ["monoster", 29, 0, 27, 12],
    "MONOSTER.stereo": ["monoster", 0, 12, 29, 12],
    "MONOSTER.stereo.on": ["monoster", 0, 0, 29, 12],
    "PLAYPAUS.playing": ["playpaus", 0, 0, 9, 9],
    "PLAYPAUS.paused": ["playpaus", 9, 0, 9, 9],
    "PLAYPAUS.stopped": ["playpaus", 18, 0, 9, 9],
    "NUMBERS.d0": ["numbers", 0, 0, 9, 13],
    "NUMBERS.d1": ["numbers", 9, 0, 9, 13],
    "NUMBERS.d2": ["numbers", 18, 0, 9, 13],
    "NUMBERS.d3": ["numbers", 27, 0, 9, 13],
    "NUMBERS.d4": ["numbers", 36, 0, 9, 13],
    "NUMBERS.d5": ["numbers", 45, 0, 9, 13],
    "NUMBERS.d6": ["numbers", 54, 0, 9, 13],
    "NUMBERS.d7": ["numbers", 63, 0, 9, 13],
    "NUMBERS.d8": ["numbers", 72, 0, 9, 13],
    "NUMBERS.d9": ["numbers", 81, 0, 9, 13],
    "NUMBERS.minus": ["numbers", 20, 6, 5, 1],
    "EQMAIN.bg": ["eqmain", 0, 0, 275, 116],
    "EQMAIN.titlebar": ["eqmain", 0, 149, 275, 14],
    "EQMAIN.sliderbg": ["eqmain", 13, 164, 209, 129],
    "EQMAIN.thumb": ["eqmain", 0, 164, 11, 11],
    "EQMAIN.thumb.down": ["eqmain", 0, 176, 11, 11],
    "EQMAIN.close": ["eqmain", 0, 116, 9, 9],
    "EQMAIN.close.down": ["eqmain", 0, 125, 9, 9],
    "EQMAIN.on": ["eqmain", 10, 119, 26, 12],
    "EQMAIN.on.down": ["eqmain", 128, 119, 26, 12],
    "EQMAIN.on.selected": ["eqmain", 69, 119, 26, 12],
    "EQMAIN.on.selected.down": ["eqmain", 187, 119, 26, 12],
    "EQMAIN.auto": ["eqmain", 36, 119, 32, 12],
    "EQMAIN.auto.down": ["eqmain", 154, 119, 32, 12],
    "EQMAIN.auto.selected": ["eqmain", 95, 119, 32, 12],
    "EQMAIN.auto.selected.down": ["eqmain", 213, 119, 32, 12],
    "EQMAIN.graphbg": ["eqmain", 0, 294, 113, 19],
    "EQMAIN.presets": ["eqmain", 224, 164, 44, 12],
    "EQMAIN.presets.down": ["eqmain", 224, 176, 44, 12],
    "PLEDIT.bg": ["pledit", 0, 0, 280, 186],
    "PLEDIT.add": ["pledit", 0, 111, 22, 18],
    "PLEDIT.add.down": ["pledit", 23, 111, 22, 18],
    "PLEDIT.rem": ["pledit", 54, 111, 22, 18],
    "PLEDIT.rem.down": ["pledit", 77, 111, 22, 18],
    "PLEDIT.sel": ["pledit", 104, 111, 22, 18],
    "PLEDIT.sel.down": ["pledit", 127, 111, 22, 18],
    "PLEDIT.misc": ["pledit", 154, 111, 22, 18],
    "PLEDIT.misc.down": ["pledit", 177, 111, 22, 18],
    "PLEDIT.list": ["pledit", 204, 111, 22, 18],
    "PLEDIT.list.down": ["pledit", 227, 111, 22, 18]
  };
  const CLASSIC_TEXT_CHARSET =
    "abcdefghijklmnopqrstuvwxyz\"@   " +
    "0123456789….:()-'!_+\\/[]^&%,=$#" +
    "ÅÖÄ?*                           ";
  function parseTxt(text) {
    const out = {};
    let section = "";
    for (const raw of (text || "").split(/\r?\n/)) {
      const line = raw.trim();
      if (!line) continue;
      const m = line.match(/^\[(.+)\]$/);
      if (m) { section = m[1]; out[section] = out[section] || {}; continue; }
      const eq = line.indexOf("=");
      if (eq > 0) {
        const k = line.slice(0, eq).trim(), v = line.slice(eq + 1).trim();
        if (section) out[section][k] = v; else out[k] = v;
      } else if (!section) {
        const parts = line.split(/[,\s]+/).filter(Boolean);
        if (parts.length >= 3) (out._rows = out._rows || []).push(parts.slice(0, 3).join(","));
      }
    }
    return out;
  }
  function makeResolver(bitmaps, blobFor) {
    const urlCache = new Map(), cropCache = new Map();
    async function fileURL(zipPath) {
      if (!zipPath) return null;
      if (urlCache.has(zipPath)) return urlCache.get(zipPath);
      const blob = await blobFor(zipPath);
      if (!blob) return null;
      const url = URL.createObjectURL(blob);
      urlCache.set(zipPath, url);
      return url;
    }
    async function bitmapURL(id) {
      const entry = bitmaps[id];
      if (!entry) return null;
      if (!entry.crop) return await fileURL(entry.file);
      if (cropCache.has(id)) return cropCache.get(id);
      const blob = await blobFor(entry.file);
      if (!blob) return null;
      const url = await new Promise(resolve => {
        const src = URL.createObjectURL(blob);
        const im = new Image();
        im.onload = () => {
          const c = document.createElement("canvas");
          c.width = entry.crop.w; c.height = entry.crop.h;
          c.getContext("2d").drawImage(im, -entry.crop.x, -entry.crop.y);
          URL.revokeObjectURL(src);
          resolve(c.toDataURL("image/png"));
        };
        im.onerror = () => { URL.revokeObjectURL(src); resolve(null); };
        im.src = src;
      });
      if (url) cropCache.set(id, url);
      return url;
    }
    return {
      hasCrop: id => !!(bitmaps[id] && bitmaps[id].crop),
      bitmapURL, fileURL,
      bitmapFile: id => bitmaps[id] ? bitmaps[id].file : null
    };
  }
  function buildSkin(bitmaps, files, report) {
    const has = id => !!bitmaps[id];
    const B = (id, sprite, action, param, x, y, w, h) => ({
      id, kind: "button", action: action || null, param: param || null,
      x, y, w, h,
      image: sprite, imageFile: sprite,
      hoverImage: null, hoverFile: null,
      downImage: null, downFile: null,
      activeImage: null, activeFile: null,
      tooltip: id, _imageId: sprite, _hoverId: null, _downId: null, _activeId: null
    });
    const withDown = (b, downId) => {
      if (has(downId)) { b.downImage = downId; b.downFile = downId; b._downId = downId; }
      return b;
    };
    const withActive = (b, onId) => {
      if (has(onId)) { b.activeImage = onId; b.activeFile = onId; b._activeId = onId; }
      return b;
    };
    const buttons = [];
    const push = b => { if (has(b.image)) buttons.push(b); else report.missing.push(b.id + ": thieu sprite " + b.image); };
    push(withDown(B("Prev", "CBUTTONS.prev", "PREV", null, 16, 88, 23, 18), "CBUTTONS.prev.down"));
    const play = withDown(B("Play", "CBUTTONS.play", "PLAY", null, 39, 88, 23, 18), "CBUTTONS.play.down");
    if (has("CBUTTONS.pause")) {
      play.pauseImage = "CBUTTONS.pause"; play.pauseFile = "CBUTTONS.pause";
      play.mergedPause = true;
    }
    push(play);
    push(withDown(B("Stop", "CBUTTONS.stop", "STOP", null, 85, 88, 23, 18), "CBUTTONS.stop.down"));
    push(withDown(B("Next", "CBUTTONS.next", "NEXT", null, 108, 88, 22, 18), "CBUTTONS.next.down"));
    push(withDown(B("Eject", "CBUTTONS.eject", "EJECT", null, 136, 89, 22, 16), "CBUTTONS.eject.down"));
    push(withActive(withDown(B("Shuffle", "SHUFREP.shuffle", null, null, 164, 89, 47, 15), "SHUFREP.shuffle.down"), "SHUFREP.shuffle.on"));
    push(withActive(withDown(B("Repeat", "SHUFREP.repeat", null, null, 210, 89, 28, 15), "SHUFREP.repeat.down"), "SHUFREP.repeat.on"));
    push(withActive(withDown(B("EqToggle", "SHUFREP.eq", "EQ_TOGGLE", null, 219, 58, 23, 12), "SHUFREP.eq.down"), "SHUFREP.eq.on"));
    const plBtn = withActive(withDown(B("PlaylistToggle", "SHUFREP.playlist", "TOGGLE", "pl", 242, 58, 23, 12), "SHUFREP.playlist.down"), "SHUFREP.playlist.on");
    push(plBtn);
    push(withDown(B("SysMenu", "TITLEBAR.options", "SYSMENU", null, 6, 3, 9, 9), "TITLEBAR.options.down"));
    push(withDown(B("Minimize", "TITLEBAR.minimize", "MINIMIZE", null, 244, 3, 9, 9), "TITLEBAR.minimize.down"));
    push(withDown(B("Shade", "TITLEBAR.shade", null, null, 254, 3, 9, 9), "TITLEBAR.shade.down"));
    push(withDown(B("Close", "TITLEBAR.close", "CLOSE", null, 264, 3, 9, 9), "TITLEBAR.close.down"));
    push(B("About", "MAIN.about", "ABOUT", null, 253, 91, 13, 15));
    const clutter = [
      ["ClutterO", "SYSMENU", null, 10, 25, 8, 8, "TITLEBAR.clutter.o.on"],
      ["ClutterA", null, null, 10, 33, 8, 7, "TITLEBAR.clutter.a.on"],
      ["ClutterI", null, null, 10, 40, 8, 7, "TITLEBAR.clutter.i.on"],
      ["ClutterD", "DOUBLESIZE", null, 10, 47, 8, 8, "TITLEBAR.clutter.d.on"],
      ["ClutterV", "VIS", null, 10, 55, 8, 7, "TITLEBAR.clutter.v.on"]
    ];
    for (const [id, action, param, x, y, w, h, onId] of clutter) {
      const b = B(id, "MAIN.clutter." + id.slice(7).toLowerCase(), action, param, x, y, w, h);
      if (has(b.image)) withActive(b, onId);
      push(b);
    }
    const layers = [
      { id: "playIndicator", image: "PLAYPAUS.stopped", imageFile: "PLAYPAUS.stopped", x: 26, y: 28, w: 9, h: 9, alpha: null, ghost: null, _imageId: "PLAYPAUS.stopped" },
      { id: "monostereo-mono", image: "MONOSTER.mono", imageFile: "MONOSTER.mono", x: 212, y: 41, w: 27, h: 12, alpha: null, ghost: null, _imageId: "MONOSTER.mono" },
      { id: "monostereo-stereo", image: "MONOSTER.stereo.on", imageFile: "MONOSTER.stereo.on", x: 239, y: 41, w: 29, h: 12, alpha: null, ghost: null, _imageId: "MONOSTER.stereo.on" },
      { id: "posbar-bg", image: "POSBAR.bg", imageFile: "POSBAR.bg", x: 16, y: 72, w: 248, h: 10, alpha: null, ghost: null, _imageId: "POSBAR.bg" }
    ].filter(l => has(l.image));
    const texts = [
      { id: "songticker", display: "songname", x: 111, y: 24, w: 154, h: 12, font: "classic.text.font", color: null, fontsize: null, align: "left", ticker: "1", showlen: "1", default: null },
      { id: "timer", display: "time", x: 39, y: 26, w: 59, h: 13, font: "classic.numbers.font", color: null, fontsize: null, align: "left", ticker: null, showlen: null, default: null }
    ];
    const sliders = [
      { id: "seek", action: "SEEK", param: null, x: 16, y: 72, w: 248, h: 10, orientation: "horizontal", orientationExplicit: true, thumb: "POSBAR.thumb", thumbFile: "POSBAR.thumb", hoverThumb: null, hoverThumbFile: null, downThumb: "POSBAR.thumb.down", downThumbFile: "POSBAR.thumb.down", tooltip: null, thumbW: 29, thumbH: 10 },
      { id: "volume", action: "VOLUME", param: null, x: 107, y: 57, w: 68, h: 13, orientation: "horizontal", orientationExplicit: true, thumb: "VOLUME.thumb", thumbFile: "VOLUME.thumb", hoverThumb: null, hoverThumbFile: null, downThumb: "VOLUME.thumb.down", downThumbFile: "VOLUME.thumb.down", tooltip: null, thumbW: 14, thumbH: 11,
        strip: { image: "VOLUME.strip", imageFile: "VOLUME.strip", fw: 68, fh: 15, cols: 1, n: 28, zeroEmpty: true } }
    ].filter(s => has(s.thumb));
    const eqStrip = { image: "EQMAIN.sliderbg", imageFile: "EQMAIN.sliderbg", fw: 15, fh: 65, cols: 14, n: 28, zeroEmpty: false };
    const eqSlider = (x, band) => ({ x, y: 38, w: 14, h: 63, orientation: "vertical", thumb: "EQMAIN.thumb", thumbFile: "EQMAIN.thumb", thumbW: 11, thumbH: 11, strip: eqStrip });
    const eqBands = [78, 96, 114, 132, 150, 168, 186, 204, 222, 240].map(x => eqSlider(x));
    const eq = has("EQMAIN.bg") ? {
      w: 275, h: 116, native: true,
      layers: [
        { id: "eq-bg", image: "EQMAIN.bg", imageFile: "EQMAIN.bg", x: 0, y: 0, w: 275, h: 116, alpha: null, ghost: null, _imageId: "EQMAIN.bg" },
        { id: "eq-titlebar", image: "EQMAIN.titlebar", imageFile: "EQMAIN.titlebar", x: 0, y: 0, w: 275, h: 14, alpha: null, ghost: null, _imageId: "EQMAIN.titlebar" },
        { id: "eq-graphbg", image: "EQMAIN.graphbg", imageFile: "EQMAIN.graphbg", x: 86, y: 17, w: 113, h: 19, alpha: null, ghost: null, _imageId: "EQMAIN.graphbg" }
      ].filter(l => has(l.image)),
      preamp: eqSlider(21), bands: eqBands,
      buttons: [
        withActive(withDown(B("EqOn", "EQMAIN.on", "EQ_TOGGLE", null, 14, 18, 26, 12), "EQMAIN.on.down"), "EQMAIN.on.selected"),
        withDown(B("EqAuto", "EQMAIN.auto", "EQ_AUTO", null, 40, 18, 32, 12), "EQMAIN.auto.down"),
        withDown(B("EqPresets", "EQMAIN.presets", "MENU", "presets", 217, 18, 44, 12), "EQMAIN.presets.down"),
        withDown(B("EqClose", "EQMAIN.close", "CLOSE", null, 264, 3, 9, 9), "EQMAIN.close.down")
      ].filter(b => has(b.image)),
      texts: []
    } : null;
    const playlist = has("PLEDIT.bg") ? {
      w: 280, h: 186, native: true,
      background: "PLEDIT.bg", backgroundFile: "PLEDIT.bg",
      backgrounds: [], layers: [],
      listRect: { x: 12, y: 20, w: 248, h: 128 },
      buttons: [
        withDown(B("PlAdd", "PLEDIT.add", "PE_ADD", null, 14, 156, 22, 18), "PLEDIT.add.down"),
        withDown(B("PlRem", "PLEDIT.rem", "PE_REM", null, 43, 156, 22, 18), "PLEDIT.rem.down"),
        withDown(B("PlSel", "PLEDIT.sel", "PE_SEL", null, 72, 156, 22, 18), "PLEDIT.sel.down"),
        withDown(B("PlMisc", "PLEDIT.misc", "PE_MISC", null, 101, 156, 22, 18), "PLEDIT.misc.down"),
        withDown(B("PlList", "PLEDIT.list", "PE_LIST", null, 236, 156, 22, 18), "PLEDIT.list.down")
      ].filter(b => has(b.image)),
      texts: []
    } : null;
    return {
      kind: "classic",
      skin: { name: report.name || "Classic Skin", author: report.author || "" },
      layout: { id: "main", w: 275, h: 116, background: "MAIN.bg", backgroundFile: "MAIN.bg", backgroundSize: { w: 275, h: 116 }, bgCrop: null },
      buttons, layers, texts, sliders,
      seek: null, volume: null, spectrum: null,
      fonts: report.fonts,
      vis: [{ x: 24, y: 43, w: 76, h: 16 }],
      visColors: report.visColors || null,
      eq, playlist,
      ml: null, video: null, avs: null, albumart: null, notifier: null,
      about: null, drawer: null, remote: null, stick: null,
      frame: null, colorPresets: [],
      unresolved: report.missing
    };
  }
  async function loadClassicFile(file, preloadedZip) {
    const report = { missing: [], found: [], notes: ["skin classic .wsz — cat anh theo bang co dinh cua Webamp (skinSprites.ts)"] };
    let zip = preloadedZip || null;
    if (!zip) {
      const JSZip = (typeof SkinLoader !== "undefined") ? await SkinLoader.ensureJSZip() : null;
      if (!JSZip) throw new Error("không tải được thư viện JSZip từ mạng (CDN)");
      try { zip = await JSZip.loadAsync(file); }
      catch (e) { throw new Error("không mở được file zip (" + (e.message || e) + ")"); }
    }
    const pathMap = new Map();
    for (const n of Object.keys(zip.files)) pathMap.set(n.toLowerCase(), n);
    const findSheet = base => {
      for (const ext of ["bmp", "png"]) {
        const hit = pathMap.get(base + "." + ext);
        if (hit) return hit;
      }
      for (const ext of ["bmp", "png"]) {
        const suffix = "/" + base + "." + ext;
        for (const key of pathMap.keys()) if (key.endsWith(suffix)) return pathMap.get(key);
      }
      return null;
    };
    const readText = async base => {
      for (const ext of ["txt"]) {
        const hit = pathMap.get(base + "." + ext);
        if (hit) return await zip.file(hit).async("string");
      }
      return null;
    };
    const mainPath = findSheet("main");
    if (!mainPath) throw new Error("không thấy main.bmp/main.png trong file — không phải skin classic .wsz");
    const bitmaps = {}, files = {};
    for (const [id, spec] of Object.entries(SPRITES)) {
      const sheet = spec[0];
      const sheetPath = findSheet(sheet);
      if (!sheetPath) continue;
      bitmaps[id] = { file: sheetPath, crop: { x: spec[1], y: spec[2], w: spec[3], h: spec[4] } };
      if (!files[sheetPath.toLowerCase()]) {
        try { files[sheetPath.toLowerCase()] = await zip.file(sheetPath).async("blob"); } catch (e) { }
      }
    }
    if (!bitmaps["MAIN.bg"] || !bitmaps["CBUTTONS.play"])
      throw new Error("thiếu ảnh nền hoặc nút Play trong file .wsz");
    const blobFor = async p => files[(p || "").toLowerCase()] || null;
    const resolve = makeResolver(bitmaps, blobFor);
    const visTxt = await readText("viscolor");
    let visColors = null;
    if (visTxt) {
      const parsed = parseTxt(visTxt);
      if (parsed._rows && parsed._rows.length) {
        visColors = parsed._rows.map(r => "rgb(" + r + ")");
        report.found.push("viscolor.txt: " + visColors.length + " mau");
      }
    }
    const plTxt = await readText("pledit");
    let plColors = null;
    if (plTxt) {
      const parsed = parseTxt(plTxt);
      const t = parsed.Text || parsed.text || {};
      const norm = s => (s || "").trim();
      if (norm(t.Normal) || norm(t.Current)) {
        plColors = { normal: norm(t.Normal) || "#00ff00", current: norm(t.Current) || "#ffffff",
          bg: norm(t.NormalBG) || "#000000", selectedBg: norm(t.SelectedBG) || "#0000c6",
          font: norm(t.Font) || "Arial" };
        report.found.push("pledit.txt: mau chu " + plColors.normal + " / " + plColors.current);
      }
    }
    const regionTxt = await readText("region");
    if (regionTxt) report.notes.push("region.txt có trong skin nhưng Amp chưa dùng (cửa sổ vẫn hình chữ nhật)");
    const textPath = findSheet("text"), numPath = findSheet("numbers");
    const fonts = {};
    if (textPath) fonts["classic.text.font"] = { tag: "bitmapfont", file: textPath,
      charwidth: 5, charheight: 6, hspacing: 0, vspacing: 0,
      charset: CLASSIC_TEXT_CHARSET, glyphRow: 0,
      imageURL: await resolve.fileURL(textPath) };
    if (numPath) fonts["classic.numbers.font"] = { tag: "bitmapfont", file: numPath,
      charwidth: 9, charheight: 13, hspacing: 0, vspacing: 0,
      charset: "0123456789", glyphRow: 0, classicSlots: true,
      minus: { sx: 20, sy: 6, sw: 5, sh: 1 },
      imageURL: await resolve.fileURL(numPath) };
    report.fonts = fonts;
    report.visColors = visColors;
    report.name = (file.name || "").replace(/\.(wsz|zip)$/i, "");
    const skin = buildSkin(bitmaps, files, report);
    if (plColors && skin.playlist) skin.playlist.colors = plColors;
    return { skin, resolve, report, bitmaps, files, kind: "classic" };
  }
  async function loadClassicFromCache(cached) {
    const bitmaps = cached.bitmaps || {}, files = cached.files || {};
    const blobFor = async p => files[(p || "").toLowerCase()] || null;
    const resolve = makeResolver(bitmaps, blobFor);
    const skin = cached.skin;
    for (const f of Object.values(skin.fonts || {})) {
      if (f.tag === "bitmapfont" && f.file) {
        try { f.imageURL = await resolve.fileURL(f.file); } catch (e) { }
      }
    }
    return { skin, resolve, report: { missing: [], found: [], notes: ["nạp từ bộ nhớ đệm"], crop: { attempted: false, applied: false }, unresolved: skin.unresolved || [] } };
  }
  window.ClassicSkin = { loadClassicFile, loadClassicFromCache, VERSION };
})();
