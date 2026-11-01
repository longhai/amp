/* skin-loader.js — load a Winamp Modern skin (.wal / .zip) DIRECTLY in the
   browser. No Python at runtime.
   - Unzips with JSZip (CDN first, local jszip.min.js fallback).
   - Reads skin.xml with DOMParser, follows <include file="..."/> recursively
     (skips @...@ placeholders such as @COLORTHEMESPATH@).
   - Builds the bitmap id -> file map (<bitmap id file x y w h>), resolves
     <groupdef> offsets, and walks the main <layout> like tools/parse_blakk.py
     did offline (that script wraps multi-top-level files in a dummy root,
     resolves <group> offsets, and sizes bitmaps from the actual PNG bytes —
     this file does the same in JS, with createImageBitmap for PNG sizes).
   - ClassicPro skins (AyonPlayer): no <layout> exists in the skin itself —
     the engine places the transport buttons, so their positions are NOT in
     the XML. This loader reads what IS there (mainframe background,
     sendparams repositioning, sprite crops, ClassicPro TextSettings) and
     reports the missing transport positions instead of inventing them.
   Returns { skin, resolve, report } where skin has the blakk.json shape and
   resolve is { hasCrop(id), bitmapURL(id), fileURL(path) } (all async). */
"use strict";

const SkinLoader = (() => {

  /* ---------- JSZip (CDN first, local fallback) ---------- */
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("không tải được " + src));
      document.head.appendChild(s);
    });
  }
  async function ensureJSZip() {
    if (window.JSZip) return window.JSZip;
    try { await loadScript("jszip.min.js"); } catch (e) { /* try CDN below */ }
    if (window.JSZip) return window.JSZip;
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js");
    if (!window.JSZip) throw new Error("không tải được JSZip (cả CDN lẫn file local đều lỗi)");
    return window.JSZip;
  }

  /* ---------- XML parsing ---------- */
  // Real Wasabi skins are often NOT well-formed XML: several top-level
  // elements with no single root, unbound namespace prefixes
  // (wasabi:, xui:, Wasabi:StandardFrame:Static, colorthemes:list),
  // bare & in values. DOMParser is strict, so try in order:
  // raw -> cleaned -> cleaned wrapped in a dummy root
  // (the wrap is exactly like tools/parse_blakk.py). Throws if all fail.
  function parseXmlText(text, label) {
    const parser = new DOMParser();
    const tryParse = (t) => {
      const doc = parser.parseFromString(t, "text/xml");
      return doc.getElementsByTagName("parsererror").length ? null : doc;
    };
    let doc = tryParse(text);
    if (doc) return doc;
    const cleaned = cleanXml(text);
    doc = tryParse(cleaned);
    if (doc) return doc;
    doc = tryParse("<root>" + cleaned + "</root>");
    if (doc) return doc;
    throw new Error("không đọc được XML " + label);
  }

  // Make sloppy Wasabi XML parseable without changing the attribute values
  // we read (x/y/w/h/id/file/action/image...). Steps:
  //  - drop XML declaration / DOCTYPE
  //  - drop xmlns declarations (a default xmlns would hide tags from
  //    getElementsByTagName; prefixed ones are unbound anyway)
  //  - strip namespace prefixes from tag names AND attribute names
  //    (Wasabi:StandardFrame:Static -> Static, wasabi:button -> button)
  //  - escape bare & that is not a valid entity reference
  function cleanXml(text) {
    let t = text.replace(/<\?xml[^?]*\?>/gi, "").replace(/<!DOCTYPE[^>]*>/gi, "");
    t = t.replace(/\s+xmlns(?::[A-Za-z_][\w.-]*)?="[^"]*"/g, "");
    t = t.replace(/<(\/?)(?:[A-Za-z_][\w.-]*:)+([A-Za-z_][\w.-]*)/g, "<$1$2");
    t = t.replace(/(\s)(?:[A-Za-z_][\w.-]*:)+([A-Za-z_][\w.-]*)=/g, "$1$2=");
    t = t.replace(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)/g, "&amp;");
    return t;
  }
  function elChildren(el) {
    return Array.from(el.childNodes).filter(n => n.nodeType === 1);
  }
  function elList(doc, tag) { return Array.from(doc.getElementsByTagName(tag)); }
  function intAttr(el, name, def) {
    const v = el.getAttribute(name);
    if (v === null || v === undefined || v === "") return def;
    const n = parseInt(v, 10);
    return isNaN(n) ? def : n;
  }

  /* ---------- zip helpers ---------- */
  function buildPathMap(zip) {
    const map = new Map(); // lower-case path -> real path
    for (const name of Object.keys(zip.files)) map.set(name.toLowerCase(), name);
    return map;
  }
  function findPath(pathMap, path) {
    const hit = pathMap.get(path.toLowerCase());
    return hit === undefined ? null : hit;
  }
  function normPath(dir, ref) {
    // Resolve ref relative to dir, collapsing "." and "..".
    const parts = (dir ? dir + "/" : "") + ref;
    const out = [];
    for (const p of parts.split("/")) {
      if (p === "" || p === ".") continue;
      if (p === "..") { out.pop(); continue; }
      out.push(p);
    }
    return out.join("/");
  }
  function dirOf(path) {
    const i = path.lastIndexOf("/");
    return i < 0 ? "" : path.slice(0, i);
  }
  async function readText(zip, pathMap, path) {
    const real = findPath(pathMap, path);
    if (!real) return null;
    const f = zip.file(real);
    if (!f) return null;
    return await f.async("string");
  }

  /* ---------- image sizes / blobs ---------- */
  const sizeCache = new Map();
  async function pngSize(zip, pathMap, path) {
    if (sizeCache.has(path)) return sizeCache.get(path);
    const real = findPath(pathMap, path);
    if (!real) { sizeCache.set(path, null); return null; }
    const blob = await zip.file(real).async("blob");
    let size = null;
    try {
      const bmp = await createImageBitmap(blob);
      size = { w: bmp.width, h: bmp.height };
      bmp.close();
    } catch (e) {
      size = await new Promise(resolve => {
        const url = URL.createObjectURL(blob);
        const im = new Image();
        im.onload = () => { URL.revokeObjectURL(url); resolve({ w: im.naturalWidth, h: im.naturalHeight }); };
        im.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
        im.src = url;
      });
    }
    sizeCache.set(path, size);
    return size;
  }

  /* ---------- main loader ---------- */
  async function loadSkinFile(file) {
    const JSZip = await ensureJSZip();
    const report = { missing: [], found: [], notes: [] };
    let zip;
    try {
      zip = await JSZip.loadAsync(file);
    } catch (e) {
      throw new Error("không mở được file zip (" + (e.message || e) + ")");
    }
    const pathMap = buildPathMap(zip);
    sizeCache.clear();

    // --- skin.xml ---
    const skinXmlText = await readText(zip, pathMap, "skin.xml");
    if (!skinXmlText) throw new Error("không thấy skin.xml trong file");
    const skinDoc = parseXmlText(skinXmlText, "skin.xml");
    const info = {};
    const si = skinDoc.getElementsByTagName("skininfo")[0];
    if (si) for (const c of elChildren(si)) info[c.tagName] = (c.textContent || "").trim();
    info.abstraction_layer_version = skinDoc.documentElement.getAttribute("version") || "";

    // --- follow <include> recursively ---
    const docs = [{ path: "skin.xml", doc: skinDoc }];
    const seen = new Set(["skin.xml"]);
    const queue = [{ path: "skin.xml", doc: skinDoc }];
    while (queue.length) {
      const cur = queue.shift();
      for (const inc of elList(cur.doc, "include")) {
        const ref = inc.getAttribute("file");
        if (!ref || ref.indexOf("@") >= 0) {
          if (ref) report.notes.push("bỏ qua include có placeholder: " + ref);
          continue; // @COLORTHEMESPATH@ etc. live outside the skin
        }
        const p = normPath(dirOf(cur.path), ref);
        if (seen.has(p.toLowerCase())) continue;
        seen.add(p.toLowerCase());
        const text = await readText(zip, pathMap, p);
        if (text === null) { report.notes.push("include không có trong file: " + p); continue; }
        try {
          const d = parseXmlText(text, p);
          docs.push({ path: p, doc: d });
          queue.push({ path: p, doc: d });
        } catch (e) {
          report.notes.push("không đọc được XML " + p + ": " + e.message);
        }
      }
    }

    // --- bitmap id -> file (+ optional sprite crop) ---
    // Wasabi bitmap `file` paths are relative to the SKIN ROOT (where
    // skin.xml lives), NOT to the XML file that declares them — e.g.
    // xml/player-elements.xml declares file="player/bb-base.png" and the
    // file really is at player/bb-base.png in the zip. (parse_blakk.py
    // used the file attribute as-is for the same reason.) Fall back to
    // the declaring file's folder only if the root-relative path is absent.
    const bitmaps = {}; // id -> {file, crop}
    const fonts = {};
    for (const { path, doc } of docs) {
      for (const b of elList(doc, "bitmap")) {
        const id = b.getAttribute("id");
        const f = b.getAttribute("file");
        if (!id || !f) continue;
        if (bitmaps[id]) continue; // first definition wins
        const rootRel = normPath("", f);
        const entry = { file: findPath(pathMap, rootRel)
          ? rootRel
          : (findPath(pathMap, normPath(dirOf(path), f)) || rootRel) };
        if (b.getAttribute("x") !== null) {
          entry.crop = {
            x: intAttr(b, "x", 0), y: intAttr(b, "y", 0),
            w: intAttr(b, "w", 0), h: intAttr(b, "h", 0)
          };
        }
        bitmaps[id] = entry;
      }
      for (const tag of ["bitmapfont", "truetypefont"]) {
        for (const b of elList(doc, tag)) {
          const id = b.getAttribute("id");
          if (id && !fonts[id]) fonts[id] = { tag, file: b.getAttribute("file") || "", charwidth: b.getAttribute("charwidth") || "", charheight: b.getAttribute("charheight") || "" };
        }
      }
    }

    // Debug handle (harmless in production): which files were actually read.
    window.__loaderDebug = { docs: docs.map(d => d.path) };

    // --- groupdefs ---
    const groupdefs = {};
    for (const { doc } of docs) {
      for (const gd of elList(doc, "groupdef")) {
        const id = gd.getAttribute("id");
        if (id && !groupdefs[id]) groupdefs[id] = elChildren(gd);
      }
    }

    // --- asset resolver (blob URLs; canvas crop for sprite sheets) ---
    const urlCache = new Map();
    const cropCache = new Map();
    async function blobFor(zipPath) {
      const real = findPath(pathMap, zipPath);
      if (!real) return null;
      return await zip.file(real).async("blob");
    }
    async function fileURL(zipPath) {
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
    const resolve = {
      hasCrop: id => !!(bitmaps[id] && bitmaps[id].crop),
      bitmapURL, fileURL,
      bitmapFile: id => bitmaps[id] ? bitmaps[id].file : null
    };

    async function bitmapSize(id) {
      const entry = bitmaps[id];
      if (entry) {
        if (entry.crop) return [entry.crop.w, entry.crop.h];
        const s = await pngSize(zip, pathMap, entry.file);
        return s ? [s.w, s.h] : [null, null];
      }
      // Not a bitmap id — it may be a direct zip path (DDTank writes
      // image="buttons/play.png" instead of a bitmap id). Size that file.
      if (id && findPath(pathMap, id)) {
        const s = await pngSize(zip, pathMap, id);
        return s ? [s.w, s.h] : [null, null];
      }
      return [null, null];
    }
    const imgFile = id => bitmaps[id] ? bitmaps[id].file : null;
    // Resolve an image reference the way Wasabi skins actually use it:
    // either a <bitmap> id (BLAKK/Nebular) or a direct zip path
    // (DDTank: image="buttons/play.png", background="images/mainbg.png").
    function resolveImageRef(ref) {
      if (!ref) return null;
      if (bitmaps[ref]) return bitmaps[ref].file;
      return findPath(pathMap, ref) ? ref : null;
    }

    // --- walk a layout (BLAKK style) ---
    const buttons = [], layers = [], texts = [], sliders = [];
    const unresolved = [];
    function addButton(el, x, y, kind) {
      const image = el.getAttribute("image");
      const hover = el.getAttribute("hoverImage");
      const down = el.getAttribute("downImage");
      const active = el.getAttribute("activeImage");
      // Wasabi actions are case-insensitive in Winamp (Nebular writes
      // action="Play", "next", "Pause"); canonicalise to upper case so
      // validation and the renderer can compare with "PLAY"/"NEXT"/...
      const act = el.getAttribute("action");
      buttons.push({
        id: el.getAttribute("id"), kind, action: act ? act.toUpperCase() : null,
        param: el.getAttribute("param"),
        x, y, w: null, h: null,
        image, imageFile: resolveImageRef(image),
        hoverImage: hover, hoverFile: hover ? resolveImageRef(hover) : null,
        downImage: down, downFile: down ? resolveImageRef(down) : null,
        activeImage: active, activeFile: active ? resolveImageRef(active) : null,
        tooltip: el.getAttribute("tooltip") || el.getAttribute("Tooltip") || null,
        _imageId: image, _hoverId: hover, _downId: down, _activeId: active
      });
    }
    function addLayer(el, x, y) {
      const image = el.getAttribute("image");
      layers.push({
        id: el.getAttribute("id"), image, imageFile: resolveImageRef(image),
        x, y, w: null, h: null,
        alpha: el.getAttribute("alpha"), ghost: el.getAttribute("ghost"),
        _imageId: image
      });
    }
    function resolveGroup(gid, ox, oy, depth) {
      const out = [];
      const kids = groupdefs[gid] || [];
      for (const el of kids) {
        out.push({ el, x: intAttr(el, "x", 0) + ox, y: intAttr(el, "y", 0) + oy });
      }
      return out;
    }
    function walkGroupChildren(items, depth) {
      for (const { el, x, y } of items) {
        if (el.tagName === "button") addButton(el, x, y, "button");
        else if (el.tagName === "togglebutton") addButton(el, x, y, "togglebutton");
        else if (el.tagName === "layer") addLayer(el, x, y);
        else if (el.tagName === "text") {
          // Ticker/timer often live inside a groupdef (Nebular: Songticker
          // and timer are in boombox-lcd-group), not as direct layout kids.
          texts.push({
            id: el.getAttribute("id"), display: el.getAttribute("display"),
            x, y, w: intAttr(el, "w", 0), h: intAttr(el, "h", 0),
            font: el.getAttribute("font"), color: el.getAttribute("color"),
            fontsize: el.getAttribute("fontsize"), align: el.getAttribute("align"),
            ticker: el.getAttribute("ticker"), showlen: el.getAttribute("showlen")
          });
        }
        else if (el.tagName === "slider") {
          sliders.push({ id: el.getAttribute("id"), action: el.getAttribute("action"),
            x, y, w: el.getAttribute("w"), h: el.getAttribute("h"), group: "(group)", note: "slider inside groupdef" });
        } else if (el.tagName === "group") {
          if (depth < 3) walkGroupChildren(resolveGroup(el.getAttribute("id"), x, y, depth + 1), depth + 1);
          else unresolved.push("nested group quá sâu: " + el.getAttribute("id"));
        } else {
          unresolved.push(el.tagName + " id=" + el.getAttribute("id") + " trong group chưa xử lý");
        }
      }
    }

    // Layout size: some skins (Nebular) give no w/h at all — only
    // minimum_w/minimum_h (== maximum_*) or default_w/default_h.
    // Others (DDTank "normal") give no size at all — the background
    // image IS the size (mainbg.png 360x320).
    const layoutSizeAttrs = (lay) => ({
      w: intAttr(lay, "w", 0) || intAttr(lay, "minimum_w", 0) || intAttr(lay, "maximum_w", 0) || intAttr(lay, "default_w", 0),
      h: intAttr(lay, "h", 0) || intAttr(lay, "minimum_h", 0) || intAttr(lay, "maximum_h", 0) || intAttr(lay, "default_h", 0)
    });
    async function layoutSize(lay) {
      const a = layoutSizeAttrs(lay);
      if (a.w > 0 && a.h > 0) return a;
      const bgFile = resolveImageRef(lay.getAttribute("background") || lay.getAttribute("alphabackground"));
      if (bgFile) {
        const s = await pngSize(zip, pathMap, bgFile);
        if (s) return { w: s.w, h: s.h };
      }
      return a;
    }
    // Does this layout contain a PLAY button (direct child or inside a
    // referenced groupdef, nested groups included)? Used to pick the real
    // main window when a skin ships several layouts (DDTank ships a
    // "modal" frame layout 360x150 with no buttons at all).
    function layoutHasPlay(lay) {
      const seen = new Set();
      const checkEls = (els) => {
        for (const el of els) {
          if ((el.tagName === "button" || el.tagName === "togglebutton") &&
              (el.getAttribute("action") || "").toUpperCase() === "PLAY" &&
              resolveImageRef(el.getAttribute("image"))) return true;
          if (el.tagName === "group") {
            const gid = el.getAttribute("id");
            if (gid && !seen.has(gid)) {
              seen.add(gid);
              if (checkEls(groupdefs[gid] || [])) return true;
            }
          }
        }
        return false;
      };
      return checkEls(elChildren(lay));
    }
    function containerIdOf(el) {
      let p = el.parentElement;
      while (p) {
        if (p.tagName === "container") return p.getAttribute("id") || "";
        p = p.parentElement;
      }
      return "";
    }

    // Pick the main layout by score, not by "first sized one": the old
    // code took DDTank's "modal" frame layout (360x150, no buttons)
    // because the real "normal" layout has no w/h attributes at all.
    let layout = null;
    let layoutEl = null;
    let bestScore = -1;
    for (const { doc } of docs) {
      for (const lay of elList(doc, "layout")) {
        const { w, h } = await layoutSize(lay);
        if (w <= 0 || h <= 0) continue;
        const id = lay.getAttribute("id") || "";
        let score = 0;
        if (/boombox/i.test(id)) score += 5;
        if (/^main$/i.test(id)) score += 5;
        if (id === "normal") score += 3;
        if (/^main$/i.test(containerIdOf(lay))) score += 10;
        if (layoutHasPlay(lay)) score += 20;
        if (score > bestScore) { bestScore = score; layoutEl = lay; }
      }
    }

    if (layoutEl) {
      let bg = layoutEl.getAttribute("background");
      // If the plain background bitmap is missing from the zip, fall back
      // to alphabackground (Nebular-style skins ship the alpha image).
      if (bg && !resolveImageRef(bg)) {
        const ab = layoutEl.getAttribute("alphabackground");
        if (ab && resolveImageRef(ab)) bg = ab;
      }
      const { w: lw, h: lh } = await layoutSize(layoutEl);
      layout = {
        id: layoutEl.getAttribute("id"), w: lw, h: lh,
        background: bg, backgroundFile: bg ? resolveImageRef(bg) : null,
        backgroundSize: null, note: "Layout lấy từ <layout> trong XML."
      };
      if (bg) {
        const s = await pngSize(zip, pathMap, resolveImageRef(bg));
        if (s) layout.backgroundSize = s;
      }
      for (const child of elChildren(layoutEl)) {
        if (child.tagName === "group") {
          walkGroupChildren(resolveGroup(child.getAttribute("id"),
            intAttr(child, "x", 0), intAttr(child, "y", 0), 0), 0);
        } else if (child.tagName === "button" || child.tagName === "togglebutton") {
          addButton(child, intAttr(child, "x", 0), intAttr(child, "y", 0), child.tagName);
        } else if (child.tagName === "layer") {
          addLayer(child, intAttr(child, "x", 0), intAttr(child, "y", 0));
        } else if (child.tagName === "text") {
          texts.push({
            id: child.getAttribute("id"), display: child.getAttribute("display"),
            x: intAttr(child, "x", 0), y: intAttr(child, "y", 0),
            w: intAttr(child, "w", 0), h: intAttr(child, "h", 0),
            font: child.getAttribute("font"), color: child.getAttribute("color"),
            fontsize: child.getAttribute("fontsize"), align: child.getAttribute("align"),
            ticker: child.getAttribute("ticker"), showlen: child.getAttribute("showlen")
          });
        } else if (child.tagName === "slider") {
          sliders.push({ id: child.getAttribute("id"), action: child.getAttribute("action"),
            x: intAttr(child, "x", 0), y: intAttr(child, "y", 0),
            w: child.getAttribute("w"), h: child.getAttribute("h") });
        } else {
          unresolved.push("layout child <" + child.tagName + "> id=" + child.getAttribute("id") + " chưa xử lý");
        }
      }
      // Fill w/h of buttons/layers from PNG bytes (or sprite crop).
      for (const b of buttons) {
        const [w, h] = await bitmapSize(b._imageId);
        b.w = w; b.h = h;
      }
      for (const l of layers) {
        const [w, h] = await bitmapSize(l._imageId);
        l.w = w; l.h = h;
      }
      // Play/Pause sharing one spot (DDTank: both at 156,217, a MAKI
      // script swaps them in Winamp). Rendered as two stacked divs the
      // Pause one would cover Play and make it unclickable — merge them
      // into one toggle button; the renderer swaps the icon while playing.
      const playBtn = buttons.find(b => b.action === "PLAY");
      const pauseIdx = buttons.findIndex(b => b.action === "PAUSE" && playBtn &&
        b.x === playBtn.x && b.y === playBtn.y);
      if (pauseIdx >= 0) {
        const pauseBtn = buttons[pauseIdx];
        playBtn.pauseImage = pauseBtn.image;
        playBtn.pauseFile = pauseBtn.imageFile;
        playBtn.mergedPause = true;
        buttons.splice(pauseIdx, 1);
        report.notes.push("gộp nút Play/Pause cùng vị trí (" + playBtn.x + "," + playBtn.y + ") thành 1 nút chuyển đổi");
      }
    } else {
      // --- ClassicPro fallback (AyonPlayer): no <layout> in the skin ---
      report.notes.push("không thấy <layout> trong XML — thử kiểu ClassicPro (mainframe + sendparams).");
      const bgEntry = Object.entries(bitmaps).find(([id, e]) =>
        /mainframe/i.test(id) || /(^|\/)mainframe\.png$/i.test(e.file));
      let bgFile = bgEntry ? bgEntry[1].file : null;
      let bgId = bgEntry ? bgEntry[0] : null;
      if (!bgFile) {
        const cand = await readText(zip, pathMap, "mainframe.png");
        bgFile = cand === null ? null : "mainframe.png";
      }
      if (!bgFile) throw new Error("không tìm được nền chính (mainframe) trong skin");
      const bgSize = await pngSize(zip, pathMap, bgFile);
      if (!bgSize) throw new Error("không đọc được kích thước ảnh nền chính");
      layout = { id: "main", w: bgSize.w, h: bgSize.h, background: bgId || "mainframe",
        backgroundFile: bgFile, backgroundSize: bgSize,
        note: "ClassicPro: nền lấy từ mainframe.png (không có <layout> trong XML)." };
      // sendparams: <script file="scripts/sendparams.maki" param="main,normal,<elem>,x=..,y=.."/>
      // Negative x = offset from the right edge, negative y = from the bottom.
      const resolveXY = (x, y) => ({
        x: x < 0 ? layout.w + x : x,
        y: y < 0 ? layout.h + y : y
      });
      const closeIds = ["close.1", "close.2", "close.3"];
      const elemAction = {
        "player.button.close": "CLOSE",
        "player.button.minimize": "MINIMIZE",
        "player.button.switch": null, // mode switch, no action in v2
        "player.sysmenu": "SYSMENU",
        "player.mainmenu": "MENU"
      };
      for (const { doc } of docs) {
        for (const sc of elList(doc, "script")) {
          const param = sc.getAttribute("param") || "";
          const parts = param.split(",");
          if (parts.length < 3 || parts[0] !== "main" || parts[1] !== "normal") continue;
          const elem = parts[2];
          const kv = {};
          for (const p of parts.slice(3)) {
            const m = p.match(/^([a-z]+)=(-?\d+)$/);
            if (m) kv[m[1]] = parseInt(m[2], 10);
          }
          if (kv.x === undefined && kv.y === undefined) continue;
          if (elem === "main.vis" || elem === "vis.overlay" || elem === "vis.overlay.2") {
            // vis area: use the overlay sprite rect (108x16 from mainframe.png)
            const ov = bitmaps["vis.overlay1"];
            if (ov && ov.crop) {
              const p = resolveXY(kv.x === undefined ? ov.crop.x : kv.x, kv.y === undefined ? 0 : kv.y);
              layers.push({ id: elem, image: "vis.overlay1", imageFile: ov.file,
                x: p.x, y: p.y, w: ov.crop.w, h: ov.crop.h, alpha: null, ghost: "1", _imageId: "vis.overlay1" });
            }
            continue;
          }
          if (!(elem in elemAction)) continue; // status, mute, volume, play.track: noted below
          const action = elemAction[elem];
          let imageId = null, hoverId = null, downId = null;
          if (elem === "player.button.close") { imageId = "close.1"; hoverId = "close.2"; downId = "close.3"; }
          const p = resolveXY(kv.x === undefined ? 0 : kv.x, kv.y === undefined ? 0 : kv.y);
          const b = { id: elem, kind: "button", action, param: null,
            x: p.x, y: p.y, w: null, h: null,
            image: imageId, imageFile: imageId ? imgFile(imageId) : null,
            hoverImage: hoverId, hoverFile: hoverId ? imgFile(hoverId) : null,
            downImage: downId, downFile: downId ? imgFile(downId) : null,
            activeImage: null, activeFile: null,
            tooltip: elem, _imageId: imageId, _hoverId: hoverId, _downId: downId, _activeId: null };
          if (imageId) {
            const [w, h] = await bitmapSize(imageId);
            b.w = w; b.h = h;
          } else {
            report.missing.push(elem + ": có vị trí (" + p.x + "," + p.y + ") nhưng không có ảnh nút trong skin (engine tự vẽ)");
          }
          buttons.push(b);
        }
      }
      // ClassicPro TextSettings (ClassicPro.xml): songticker / tracktime.
      for (const { doc } of docs) {
        for (const st of elList(doc, "Style")) {
          if (st.getAttribute("id") === "normal.songticker") {
            texts.push({ id: "Songticker", display: "songname",
              x: intAttr(st, "x", 0), y: intAttr(st, "y", 0),
              w: layout.w - intAttr(st, "x", 0) - 10, h: 15,
              font: null, color: null, fontsize: null, align: null, ticker: "1", showlen: "1" });
          }
          if (st.getAttribute("id") === "normal.tracktime") {
            texts.push({ id: "timer", display: "time",
              x: intAttr(st, "x", 112), y: intAttr(st, "y", 0),
              w: 60, h: 12, font: null, color: null, fontsize: null,
              align: null, ticker: null, showlen: null });
          }
        }
      }
      report.missing.push("vị trí nút Play/Pause/Stop/Next/Prev/Eject: KHÔNG có trong XML — ClassicPro engine tự đặt nút, skin chỉ đổi ảnh (player.play.1/2/3 là sprite 35x35 trong buttons.png, không có tọa độ)");
      report.missing.push("vị trí thanh volume/seek: sendparams chỉ cho volume x=-109 y=72 và mute x=-160 y=66, không có kích thước thanh — không dựng được thanh trượt");
      report.missing.push("mainframe_overlay.png được XML nhắc tới nhưng không có trong file .wal");
      report.notes.push("ClassicPro engine (Plugins/classicPro/engine/load.xml) nằm ngoài skin, không có trong file — layout mặc định của engine không đọc được.");
    }

    // --- derived rects (same heuristics as parse_blakk.py) ---
    function layerByImage(imageId) {
      return layers.find(l => l.image === imageId) || null;
    }
    function rectFrom(prefixes, emptyId, fullId) {
      const l = layers.find(x => prefixes.some(p => (x.image || "").indexOf(p) >= 0));
      if (!l) return null;
      return { x: l.x, y: l.y, w: l.w, h: l.h,
        emptyImage: emptyId, emptyFile: imgFile(emptyId),
        fullImage: fullId, fullFile: fullId ? imgFile(fullId) : null };
    }
    const seekEmpty = layerByImage("player.bb-seek-empty");
    const seek = seekEmpty ? {
      x: seekEmpty.x, y: seekEmpty.y, w: seekEmpty.w, h: seekEmpty.h,
      emptyImage: "player.bb-seek-empty", emptyFile: imgFile("player.bb-seek-empty"),
      fullImage: "player.bb-seek-full", fullFile: imgFile("player.bb-seek-full") } : null;
    const volMin = layerByImage("player.bb-volume-min");
    const volume = volMin ? {
      x: volMin.x, y: volMin.y, w: volMin.w, h: volMin.h,
      emptyImage: "player.bb-volume-min", emptyFile: imgFile("player.bb-volume-min"),
      fullImage: "player.bb-volume-max", fullFile: imgFile("player.bb-volume-max") } : null;
    const specOff = layerByImage("player.bb-spectrum-off");
    const spectrum = specOff ? {
      x: specOff.x, y: specOff.y, w: specOff.w, h: specOff.h,
      offFile: imgFile("player.bb-spectrum-off"), onFile: imgFile("player.bb-spectrum-on"),
      left: layerByImage("player.bb-spectrum-left"),
      right: layerByImage("player.bb-spectrum-right") } : null;
    const disp = layerByImage("player.bb-display-base");
    const display = disp ? { x: disp.x, y: disp.y, w: disp.w, h: disp.h,
      image: "player.bb-display-base", file: imgFile("player.bb-display-base") } : null;

    // --- validation: a player needs a background + a PLAY button ---
    if (!layout || !layout.w || !layout.h) throw new Error("không tìm được kích thước cửa sổ chính trong XML");
    const hasPlay = buttons.some(b => b.action === "PLAY" && b.x !== null && b.y !== null && b.w && b.imageFile);
    if (!hasPlay) {
      // Lead with the Play-position problem if it is listed — that is the
      // real blocker for the user, not the first missing item (which may
      // be an engine-drawn window button like sysmenu).
      const why = report.missing.find(m => /\bPlay\b/i.test(m)) // \b: "player.sysmenu" must NOT match
        || report.missing[0]
        || "không tìm được nút Play có vị trí trong XML";
      const err = new Error(why);
      err.report = { ...report, unresolved: unresolved.concat(report.missing, report.notes) };
      err.partial = { layout, buttons, layers, texts };
      throw err;
    }
    const skin = {
      skin: { ...info, source_files: docs.map(d => d.path), source_zip: file.name || "" },
      layout, buttons, layers, texts, sliders,
      display, seek, volume, spectrum, fonts,
      unresolved: unresolved.concat(report.missing, report.notes)
    };
    // Strip internal helpers before returning.
    for (const b of buttons) { delete b._imageId; delete b._hoverId; delete b._downId; delete b._activeId; }
    for (const l of layers) { delete l._imageId; }
    return { skin, resolve, report: { ...report, unresolved: skin.unresolved } };
  }

  return { loadSkinFile, ensureJSZip };
})();
