"use strict";

const SkinLoader = (() => {

  const LOADER_VERSION = "5.1";

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
    try {
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js");
    } catch (e) {
      throw new Error("không tải được thư viện JSZip từ mạng (CDN) — kiểm tra mạng rồi tải lại trang");
    }
    if (!window.JSZip) throw new Error("không tải được thư viện JSZip từ mạng (CDN) — kiểm tra mạng rồi tải lại trang");
    return window.JSZip;
  }

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

  function cleanXml(text) {
    let t = text.replace(/<\?xml[^?]*\?>/gi, "").replace(/<!DOCTYPE[^>]*>/gi, "");
    t = t.replace(/\s+xmlns(?::[A-Za-z_][\w.-]*)?="[^"]*"/g, "");
    t = t.replace(/<\/((?:[A-Za-z_][\w.-]*:)+)([A-Za-z_][\w.-]*)/g, "</$2");
    t = t.replace(/<((?:[A-Za-z_][\w.-]*:)+)([A-Za-z_][\w.-]*)/g,
      (m, prefixes, last) => "<" + last + ' data-xuitag="' + prefixes + last + '"');
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

  function buildPathMap(zip, prefix) {
    const map = new Map();
    const pl = (prefix || "").toLowerCase();
    for (const name of Object.keys(zip.files)) {
      const key = (pl && name.toLowerCase().startsWith(pl)) ? name.slice(prefix.length) : name;
      map.set(key.toLowerCase(), name);
    }
    return map;
  }
  function findPath(pathMap, path) {
    const hit = pathMap.get(path.toLowerCase());
    return hit === undefined ? null : hit;
  }
  function normPath(dir, ref) {
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

  const KNOWN_FONT_CHARSETS = { "player.songinfo.font": "0123456789._:  -'! +/\\     ,=  " };

  function makeResolver(bitmaps, blobFor) {
    const urlCache = new Map();
    const cropCache = new Map();
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
    return {
      hasCrop: id => !!(bitmaps[id] && bitmaps[id].crop),
      bitmapURL, fileURL,
      bitmapFile: id => bitmaps[id] ? bitmaps[id].file : null
    };
  }

  async function loadSkinFromCache(cached) {
    const bitmaps = cached.bitmaps || {};
    const fileMap = cached.files || {};
    const pathMap = new Map(Object.keys(fileMap).map(k => [k, k]));
    const blobFor = async p => fileMap[(p || "").toLowerCase()] || null;
    const resolve = makeResolver(bitmaps, blobFor);
    const skin = cached.skin;
    for (const f of Object.values(skin.fonts || {})) {
      if (f.tag === "bitmapfont") { try { await detectFontRow(f, bitmaps, resolve.fileURL, findPath, pathMap); } catch (e) { } }
    }
    return { skin, resolve, report: { missing: [], found: [], notes: ["nạp từ bộ nhớ đệm"], crop: { attempted: true, applied: !!(skin.layout && skin.layout.bgCrop) }, unresolved: skin.unresolved || [] } };
  }

  /* đo hàng glyph + cột ":" từ ảnh font */
  async function detectFontRow(font, bitmaps, fileURL, findPath, pathMap) {
    if (!font || font.tag !== "bitmapfont") return;
    const entry = bitmaps[font.file];
    const file = entry ? entry.file : (findPath(pathMap, font.file) ? font.file : null);
    if (!file) return;
    try {
      const imgUrl = await fileURL(file);
      if (!imgUrl) return;
      const dims = await new Promise(resolve => {
        const im = new Image();
        im.onload = () => resolve({ w: im.naturalWidth, h: im.naturalHeight, im });
        im.onerror = () => resolve(null);
        im.src = imgUrl;
      });
      if (!dims) return;
      const ch = font.charheight || 0;
      const cw = font.charwidth || 0;
      if (!ch || !cw || dims.h < ch) return;
      const cv = document.createElement("canvas");
      cv.width = dims.w; cv.height = dims.h;
      const cx = cv.getContext("2d", { willReadFrequently: true });
      cx.drawImage(dims.im, 0, 0);
      const data = cx.getImageData(0, 0, dims.w, dims.h).data;
      const detectInverse = () => {
        const bands = Math.ceil(dims.h / ch);
        let invRow = -1, invRuns = 0;
        for (let r = 0; r < bands; r++) {
          const by0 = r * ch + 1, by1 = Math.min((r + 1) * ch - 1, dims.h);
          if (by1 <= by0) continue;
          let opaque = 0, total = 0;
          for (let y = by0; y < by1; y++) for (let x = 0; x < dims.w; x++) {
            total++;
            if (data[(y * dims.w + x) * 4 + 3] > 30) opaque++;
          }
          if (opaque / total < 0.5) continue;
          let hruns = 0, inHole = false;
          for (let x = 0; x < dims.w; x++) {
            let hole = false;
            for (let y = by0; y < by1; y++) {
              if (data[(y * dims.w + x) * 4 + 3] <= 30) { hole = true; break; }
            }
            if (hole && !inHole) { hruns++; inHole = true; }
            else if (!hole) inHole = false;
          }
          if (hruns > invRuns) { invRuns = hruns; invRow = r; }
        }
        if (invRow < 0 || invRuns < 10) return false;
        font.imageURL = imgUrl;
        font.imageW = dims.w; font.imageH = dims.h;
        font.glyphRow = invRow;
        font.inverse = true;
        return true;
      };
      let bestRow = 0, bestInk = -1;
      for (let r = 0; r * ch < dims.h; r++) {
        let ink = 0;
        for (let y = r * ch; y < Math.min((r + 1) * ch, dims.h); y++)
          for (let x = 0; x < dims.w; x++)
            if (data[(y * dims.w + x) * 4 + 3] > 30) ink++;
        if (ink > bestInk) { bestInk = ink; bestRow = r; }
      }
      if (bestInk <= 0) return;
      const y0 = bestRow * ch, y1 = Math.min((bestRow + 1) * ch, dims.h);
      const runs = [];
      let start = -1;
      for (let x = 0; x < dims.w; x++) {
        let colInk = false;
        for (let y = y0; y < y1; y++) {
          if (data[(y * dims.w + x) * 4 + 3] > 30) { colInk = true; break; }
        }
        if (colInk && start < 0) start = x;
        else if (!colInk && start >= 0) { runs.push([start, x - 1]); start = -1; }
      }
      if (start >= 0) runs.push([start, dims.w - 1]);
      if (runs.length < 10) { detectInverse(); return; }
      const widths = runs.slice(0, 10).map(r => r[1] - r[0] + 1).sort((a, b) => a - b);
      const medW = widths[Math.floor(widths.length / 2)];
      let colonCol = null;
      for (let i = 10; i < runs.length; i++) {
        if (runs[i][1] - runs[i][0] + 1 <= medW / 2) {
          colonCol = Math.round(runs[i][0] / cw);
          break;
        }
      }
      if (colonCol === null) { detectInverse(); return; }
      font.imageURL = imgUrl;
      font.imageW = dims.w; font.imageH = dims.h;
      font.glyphRow = bestRow;
      font.colonCol = colonCol;
    } catch (e) {  }
  }

  async function loadSkinFile(file) {
    const JSZip = await ensureJSZip();
    const report = { missing: [], found: [], notes: [] };
    let zip;
    try {
      zip = await JSZip.loadAsync(file);
    } catch (e) {
      throw new Error("không mở được file zip (" + (e.message || e) + ")");
    }
    let rootPrefix = "";
    {
      const names = Object.keys(zip.files);
      if (!names.some(n => n.toLowerCase() === "skin.xml")) {
        const hits = names.filter(n => /\/skin\.xml$/i.test(n));
        hits.sort((a, b) => a.split("/").length - b.split("/").length || a.localeCompare(b));
        if (hits.length) rootPrefix = hits[0].slice(0, hits[0].lastIndexOf("/") + 1);
      }
    }
    const pathMap = buildPathMap(zip, rootPrefix);
    if (rootPrefix) report.notes.push("skin nằm trong thư mục con '" + rootPrefix + "' — đã dùng làm gốc");
    sizeCache.clear();

    const skinXmlText = await readText(zip, pathMap, "skin.xml");
    if (!skinXmlText) throw new Error("không thấy skin.xml trong file");
    const skinDoc = parseXmlText(skinXmlText, "skin.xml");
    const info = {};
    const si = skinDoc.getElementsByTagName("skininfo")[0];
    if (si) for (const c of elChildren(si)) info[c.tagName] = (c.textContent || "").trim();
    info.abstraction_layer_version = skinDoc.documentElement.getAttribute("version") || "";

    const docs = [{ path: "skin.xml", doc: skinDoc, includes: [] }];
    const docByPath = new Map([["skin.xml", docs[0]]]);
    const seen = new Set(["skin.xml"]);
    const queue = [docs[0]];
    while (queue.length) {
      const cur = queue.shift();
      for (const inc of elList(cur.doc, "include")) {
        const ref = inc.getAttribute("file");
        if (!ref || ref.indexOf("@") >= 0) {
          if (ref) report.notes.push("bỏ qua include có placeholder: " + ref);
          continue;
        }
        const p = normPath(dirOf(cur.path), ref);
        if (!cur.includes.includes(p)) cur.includes.push(p);
        if (seen.has(p.toLowerCase())) continue;
        seen.add(p.toLowerCase());
        const text = await readText(zip, pathMap, p);
        if (text === null) { report.notes.push("include không có trong file: " + p); continue; }
        try {
          const d = parseXmlText(text, p);
          const entry = { path: p, doc: d, includes: [] };
          docs.push(entry);
          queue.push(entry);
          docByPath.set(p.toLowerCase(), entry);
        } catch (e) {
          report.notes.push("không đọc được XML " + p + ": " + e.message);
        }
      }
    }
    function layoutsForDoc(docPath) {
      const out = [];
      const seenPaths = new Set();
      const q = [docPath];
      while (q.length) {
        const p = q.shift();
        const key = p.toLowerCase();
        if (seenPaths.has(key)) continue;
        seenPaths.add(key);
        const entry = docByPath.get(key);
        if (!entry) continue;
        for (const l of elList(entry.doc, "layout")) out.push(l);
        for (const inc of entry.includes) q.push(inc);
      }
      return out;
    }
    function findContainer(idTest) {
      for (const { path, doc } of docs) {
        for (const c of elList(doc, "container")) {
          if (idTest((c.getAttribute("id") || "").toLowerCase()))
            return { container: c, docPath: path };
        }
      }
      return null;
    }

    const bitmaps = {};
    const fonts = {};
    for (const { path, doc } of docs) {
      for (const b of elList(doc, "bitmap")) {
        const id = b.getAttribute("id");
        const f = b.getAttribute("file");
        if (!id || !f) continue;
        if (bitmaps[id]) continue;
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
          if (id && !fonts[id]) fonts[id] = { tag, file: b.getAttribute("file") || "",
            charwidth: intAttr(b, "charwidth", 0), charheight: intAttr(b, "charheight", 0),
            hspacing: intAttr(b, "hspacing", 0), vspacing: intAttr(b, "vspacing", 0),
            charset: KNOWN_FONT_CHARSETS[id] || null };
        }
      }
    }

    window.__loaderDebug = { docs: docs.map(d => d.path) };

    const groupdefs = {};
    const groupdefEls = {};
    const xuitagMap = {};
    for (const { doc } of docs) {
      for (const gd of elList(doc, "groupdef")) {
        const id = gd.getAttribute("id");
        if (id && !groupdefs[id]) {
          groupdefs[id] = elChildren(gd); groupdefEls[id] = gd;
          const xu = gd.getAttribute("xuitag");
          if (xu && !xuitagMap[xu]) xuitagMap[xu] = id;
        }
      }
    }
    function relPos(el, attr, parent) {
      const v = intAttr(el, attr, 0);
      return el.getAttribute("relat" + attr) === "1" ? parent + v : v;
    }
    function relSize(el, attr, parent) {
      const v = intAttr(el, attr, 0);
      return el.getAttribute("relat" + attr) === "1" ? parent + v : v;
    }
    function groupSize(gid, parentW, parentH, instEl) {
      if (instEl && instEl.getAttribute("w") !== null) {
        const w = relSize(instEl, "w", parentW);
        const h = instEl.getAttribute("h") !== null ? relSize(instEl, "h", parentH)
          : (groupdefEls[gid] && groupdefEls[gid].getAttribute("h") !== null
            ? relSize(groupdefEls[gid], "h", parentH) : parentH);
        return [w, h];
      }
      const gd = groupdefEls[gid];
      if (!gd) return [parentW, parentH];
      const w = gd.getAttribute("w") !== null ? relSize(gd, "w", parentW) : parentW;
      const h = gd.getAttribute("h") !== null ? relSize(gd, "h", parentH) : parentH;
      return [w, h];
    }
    function posSize(v) { return (typeof v === "number" && v > 0) ? v : null; }
    function groupVisible(gid, instEl) {
      if (instEl) {
        const v = instEl.getAttribute("visible");
        if (v === "1") return true;
        if (v === "0") return false;
      }
      const gd = groupdefEls[gid];
      if (gd && gd.getAttribute("visible") === "0") return false;
      return true;
    }


    async function blobFor(zipPath) {
      const real = findPath(pathMap, zipPath);
      if (!real) return null;
      return await zip.file(real).async("blob");
    }
    const resolve = makeResolver(bitmaps, blobFor);

    async function bitmapSize(id) {
      const entry = bitmaps[id];
      if (entry) {
        if (entry.crop) return [entry.crop.w, entry.crop.h];
        const s = await pngSize(zip, pathMap, entry.file);
        return s ? [s.w, s.h] : [null, null];
      }
      if (id && findPath(pathMap, id)) {
        const s = await pngSize(zip, pathMap, id);
        return s ? [s.w, s.h] : [null, null];
      }
      return [null, null];
    }
    const imgFile = id => bitmaps[id] ? bitmaps[id].file : null;
    function resolveImageRef(ref) {
      if (!ref) return null;
      if (bitmaps[ref]) return bitmaps[ref].file;
      return findPath(pathMap, ref) ? ref : null;
    }

    function newOut() {
      return { buttons: [], layers: [], texts: [], sliders: [],
        vis: [], listRects: [], backgrounds: [], unresolved: [], frame: null };
    }
    const mainOut = newOut();
    const buttons = mainOut.buttons, layers = mainOut.layers,
          texts = mainOut.texts, sliders = mainOut.sliders,
          unresolved = mainOut.unresolved;
    function attrCI(el, ...names) {
      for (const n of names) {
        const v = el.getAttribute(n);
        if (v !== null && v !== undefined) return v;
      }
      return null;
    }
    function addButton(out, el, x, y, kind, pw, ph) {
      let image = attrCI(el, "image", "Image");
      const hover = attrCI(el, "hoverImage", "hoverimage", "HoverImage");
      const down = attrCI(el, "downImage", "downimage", "DownImage");
      const active = attrCI(el, "activeImage", "activeimage", "ActiveImage");
      const act = el.getAttribute("action");
      let imageFile = resolveImageRef(image);
      if (!imageFile && el.tagName.toLowerCase() === "nstatesbutton" && image) {
        const f0 = resolveImageRef(image + "0");
        if (f0) { image = image + "0"; imageFile = f0; }
      }
      out.buttons.push({
        id: el.getAttribute("id"), kind, action: act ? act.toUpperCase() : null,
        param: el.getAttribute("param"),
        x, y, w: posSize(relSize(el, "w", pw)), h: posSize(relSize(el, "h", ph)),
        image, imageFile,
        hoverImage: hover, hoverFile: hover ? resolveImageRef(hover) : null,
        downImage: down, downFile: down ? resolveImageRef(down) : null,
        activeImage: active, activeFile: active ? resolveImageRef(active) : null,
        tooltip: el.getAttribute("tooltip") || el.getAttribute("Tooltip") || null,
        _imageId: image, _hoverId: hover, _downId: down, _activeId: active
      });
    }
    function addLayer(out, el, x, y, pw, ph) {
      const image = attrCI(el, "image", "Image");
      out.layers.push({
        id: el.getAttribute("id"), image, imageFile: resolveImageRef(image),
        x, y, w: posSize(relSize(el, "w", pw)), h: posSize(relSize(el, "h", ph)),
        alpha: el.getAttribute("alpha"), ghost: el.getAttribute("ghost"),
        _imageId: image
      });
    }
    function addText(out, el, x, y, pw, ph, sendParams) {
      const isSongTicker = el.tagName.toLowerCase() === "songticker";
      const id = el.getAttribute("id");
      let def = el.getAttribute("default");
      if (sendParams && id && sendParams[id] && sendParams[id].default !== undefined)
        def = sendParams[id].default;
      out.texts.push({
        id, display: el.getAttribute("display") || (isSongTicker ? "songname" : null),
        x, y, w: posSize(relSize(el, "w", pw)), h: posSize(relSize(el, "h", ph)),
        font: el.getAttribute("font"), color: el.getAttribute("color"),
        fontsize: el.getAttribute("fontsize"), align: el.getAttribute("align"),
        ticker: el.getAttribute("ticker") || (isSongTicker ? "1" : null),
        showlen: el.getAttribute("showlen"), default: def
      });
    }
    function addSlider(out, el, x, y, pw, ph) {
      const thumb = attrCI(el, "thumb", "Thumb");
      const hoverThumb = attrCI(el, "hoverthumb", "hoverThumb", "HoverThumb");
      const downThumb = attrCI(el, "downthumb", "downThumb", "DownThumb");
      const act = el.getAttribute("action");
      out.sliders.push({
        id: el.getAttribute("id"), action: act ? act.toUpperCase() : null,
        param: el.getAttribute("param"),
        x, y, w: posSize(relSize(el, "w", pw)), h: posSize(relSize(el, "h", ph)),
        orientation: (() => { const o = (el.getAttribute("orientation") || "").toLowerCase();
          if (o === "v" || o === "vertical") return "vertical";
          if (o === "h" || o === "horizontal") return "horizontal";
          const w = posSize(relSize(el, "w", pw)), h = posSize(relSize(el, "h", ph));
          return (w && h) ? (w >= h ? "horizontal" : "vertical") : "vertical"; })(),
        orientationExplicit: !!el.getAttribute("orientation"),
        thumb, thumbFile: thumb ? resolveImageRef(thumb) : null,
        hoverThumb, hoverThumbFile: hoverThumb ? resolveImageRef(hoverThumb) : null,
        downThumb, downThumbFile: downThumb ? resolveImageRef(downThumb) : null,
        tooltip: el.getAttribute("tooltip") || el.getAttribute("Tooltip") || null,
        thumbW: null, thumbH: null
      });
    }
    function resolveGroup(gid, parentW, parentH) {
      const out = [];
      const kids = groupdefs[gid] || [];
      for (const el of kids) {
        out.push({ el, x: relPos(el, "x", parentW), y: relPos(el, "y", parentH) });
      }
      return out;
    }
    function isVisible(el) { return el.getAttribute("visible") !== "0"; }
    async function fillSizes(out) {
      for (const b of out.buttons) {
        if (b.w && b.h) continue;
        const [w, h] = await bitmapSize(b._imageId);
        if (!b.w) b.w = w; if (!b.h) b.h = h;
      }
      for (const l of out.layers) {
        if (l.w && l.h) continue;
        const [w, h] = await bitmapSize(l._imageId);
        if (!l.w) l.w = w; if (!l.h) l.h = h;
      }
      for (const s of out.sliders) {
        if (s.thumb && !s.thumbW) {
          const [w, h] = await bitmapSize(s.thumb);
          s.thumbW = w; s.thumbH = h;
        }
        if (!s.orientationExplicit && s.w && s.h)
          s.orientation = s.w >= s.h ? "horizontal" : "vertical";
      }
    }
    function dispatchEl(el, ax, ay, depth, parentW, parentH, out, sendParams) {
      if (!isVisible(el)) return;
      const tag = (el.tagName || "").toLowerCase();
      const content = el.getAttribute("content");
      if (content && groupdefs[content]) {
        if (!groupVisible(content, el)) return;
        if (depth < 5) {
          const [gw, gh] = groupSize(content, parentW, parentH, el);
          walkGroupChildren(resolveGroup(content, gw, gh), ax, ay, depth + 1, gw, gh, out, sendParams);
        } else out.unresolved.push("nested group quá sâu: " + content);
        return;
      }
      const xuTag = el.getAttribute("data-xuitag");
      if (xuTag && xuitagMap[xuTag]) {
        const gid = xuitagMap[xuTag];
        if (!groupVisible(gid, el)) return;
        if (depth < 5) {
          const [gw, gh] = groupSize(gid, parentW, parentH, el);
          walkGroupChildren(resolveGroup(gid, gw, gh), ax, ay, depth + 1, gw, gh, out, sendParams);
        } else out.unresolved.push("nested XUI quá sâu: " + tag);
        return;
      }
      if (tag === "button") addButton(out, el, ax, ay, "button", parentW, parentH);
      else if (tag === "togglebutton") addButton(out, el, ax, ay, "togglebutton", parentW, parentH);
      else if (tag === "nstatesbutton") addButton(out, el, ax, ay, "nstatesbutton", parentW, parentH);
      else if (tag === "layer") addLayer(out, el, ax, ay, parentW, parentH);
      else if (tag === "text" || tag === "songticker")
        addText(out, el, ax, ay, parentW, parentH, sendParams);
      else if (tag === "slider") addSlider(out, el, ax, ay, parentW, parentH);
      else if (tag === "vis") {
        out.vis.push({ id: el.getAttribute("id"), x: ax, y: ay,
          w: posSize(relSize(el, "w", parentW)), h: posSize(relSize(el, "h", parentH)) });
      }
      else if (tag === "windowholder" || tag === "component") {
        out.listRects.push({ id: el.getAttribute("id"), x: ax, y: ay,
          w: posSize(relSize(el, "w", parentW)), h: posSize(relSize(el, "h", parentH)) });
      }
      else if (tag === "group") {
        const gid = el.getAttribute("id");
        if (el.getAttribute("move") === "1") {
          out.unresolved.push("bỏ qua nhóm trượt (move=1): " + gid + " — cần MAKI để mở");
          return;
        }
        if (!groupVisible(gid, el)) return;
        const gd = groupdefEls[gid];
        if (gd && gd.getAttribute("background")) {
          const [gw0, gh0] = groupSize(gid, parentW, parentH, el);
          out.backgrounds.push({ image: gd.getAttribute("background"),
            imageFile: resolveImageRef(gd.getAttribute("background")),
            x: ax, y: ay, w: gw0, h: gh0 });
        }
        if (depth < 5) {
          const [gw, gh] = groupSize(gid, parentW, parentH, el);
          walkGroupChildren(resolveGroup(gid, gw, gh), ax, ay, depth + 1, gw, gh, out, sendParams);
        } else out.unresolved.push("nested group quá sâu: " + gid);
      }
      else if (tag === "sendparams" || tag === "script" ||
               tag === "hideobject" || tag === "mousetrap") {
        return;
      }
      else {
        out.unresolved.push(el.tagName + " id=" + el.getAttribute("id") + " chưa xử lý");
      }
    }
    function walkGroupChildren(items, ox, oy, depth, parentW, parentH, out, sendParams) {
      for (const { el, x, y } of items) {
        dispatchEl(el, x + ox, y + oy, depth, parentW, parentH, out, sendParams || {});
      }
    }
    function collectSendParams(layEl) {
      const map = {};
      for (const el of elChildren(layEl)) {
        if ((el.tagName || "").toLowerCase() !== "sendparams") continue;
        const def = el.getAttribute("default");
        const vis = el.getAttribute("visible");
        for (const t of (el.getAttribute("target") || "").split(";")) {
          const id = t.trim(); if (!id) continue;
          map[id] = map[id] || {};
          if (def !== null) map[id].default = def;
          if (vis !== null) map[id].visible = vis;
        }
      }
      return map;
    }
    function isFrameEl(el) {
      const xu = el.getAttribute("data-xuitag") || el.tagName;
      return /Frame/.test(xu) && !!el.getAttribute("content") && !!xuitagMap[xu];
    }
    function walkFrame(frameEl, layoutW, layoutH, out, sendParams) {
      const frameGid = xuitagMap[frameEl.getAttribute("data-xuitag") || frameEl.tagName];
      if (!frameGid || !groupdefs[frameGid]) return 0;
      const fOut = newOut();
      out.frame = fOut;
      let offsetY = 0;
      for (const el of groupdefs[frameGid]) {
        if ((el.tagName || "").toLowerCase() === "group" && /menubar/i.test(el.getAttribute("id") || "")) {
          offsetY = relPos(el, "y", layoutH); break;
        }
      }
      if (!offsetY) offsetY = 18;
      fOut.menubarY = offsetY;
      walkGroupChildren(resolveGroup(frameGid, layoutW, layoutH), 0, 0, 0, layoutW, layoutH, fOut, sendParams);
      fOut.buttons = fOut.buttons.filter(b => b.id !== "Close" && b.id !== "Close.inactive");
      return offsetY;
    }
    function layoutMenuLabels(fOut) {
      if (!fOut || fOut.menubarY === undefined) return;
      const order = [];
      for (const gid of ["menugroup.file", "menugroup.play", "menugroup.options", "menugroup.view", "menugroup.help"]) {
        for (const el of groupdefs[gid] || []) {
          if ((el.tagName || "").toLowerCase() === "layer") {
            const img = attrCI(el, "image", "Image");
            if (img) order.push(img);
          }
        }
      }
      if (!order.length) return;
      let cursor = 1;
      for (const img of order) {
        const lay = fOut.layers.find(l => l.image === img);
        if (!lay) continue;
        lay.x = cursor; lay.y = fOut.menubarY;
        cursor += (lay.w || 0) + 8;
      }
    }
    function walkLayoutChildren(layEl, layoutW, layoutH, out, opts) {
      opts = opts || {};
      const sendParams = collectSendParams(layEl);
      let frameOffsetY = 0;
      let frameEl = null;
      if (opts.handleFrame !== false) {
        for (const child of elChildren(layEl)) {
          if (isFrameEl(child)) { frameEl = child; break; }
        }
        if (frameEl) frameOffsetY = walkFrame(frameEl, layoutW, layoutH, out, sendParams);
      }
      for (const child of elChildren(layEl)) {
        if (!isVisible(child)) continue;
        if (child === frameEl) {
          const content = child.getAttribute("content");
          if (content && groupdefs[content] && groupVisible(content, child)) {
            const [gw, gh] = groupSize(content, layoutW, layoutH, child);
            walkGroupChildren(resolveGroup(content, gw, gh),
              relPos(child, "x", layoutW), relPos(child, "y", layoutH) + frameOffsetY,
              0, gw, gh, out, sendParams);
          }
          continue;
        }
        dispatchEl(child, relPos(child, "x", layoutW), relPos(child, "y", layoutH),
          0, layoutW, layoutH, out, sendParams);
      }
      return frameOffsetY;
    }

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
    function layoutHasPlay(lay) {
      const seen = new Set();
      const checkEls = (els) => {
        for (const el of els) {
          if (((el.tagName || "").toLowerCase() === "button" || (el.tagName || "").toLowerCase() === "togglebutton") &&
              (el.getAttribute("action") || "").toUpperCase() === "PLAY" &&
              resolveImageRef(el.getAttribute("image"))) return true;
          const content = el.getAttribute("content");
          if (content && !seen.has(content)) {
            seen.add(content);
            if (checkEls(groupdefs[content] || [])) return true;
          }
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

    let eq = null, playlist = null;
    if (layoutEl) {
      let bg = layoutEl.getAttribute("background");
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
      walkLayoutChildren(layoutEl, layout.w, layout.h, mainOut, { handleFrame: true });
      await fillSizes(mainOut);
      if (mainOut.frame) {
        await fillSizes(mainOut.frame);
        layoutMenuLabels(mainOut.frame);
      }
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
      if (!layout.backgroundFile) {
        let maxBottom = 0;
        for (const b of buttons) if (b.imageFile) maxBottom = Math.max(maxBottom, (b.y || 0) + (b.h || 0));
        for (const l of layers) if (l.imageFile) maxBottom = Math.max(maxBottom, (l.y || 0) + (l.h || 0));
        for (const t of texts) maxBottom = Math.max(maxBottom, (t.y || 0) + (t.h || 14));
        if (maxBottom > 0 && maxBottom < layout.h * 0.8) {
          report.notes.push("cắt chiều cao cửa sổ theo nội dung: " + layout.w + "x" + layout.h + " -> " + layout.w + "x" + maxBottom + " (không có ảnh nền, phần dưới là vùng drawer ẩn)");
          layout.h = maxBottom;
        }
      }
      async function alphaBBox(blob) {
        let w, h, data;
        try {
          const bmp = await createImageBitmap(blob);
          const cv = document.createElement("canvas");
          cv.width = bmp.width; cv.height = bmp.height;
          const cx = cv.getContext("2d", { willReadFrequently: true });
          cx.drawImage(bmp, 0, 0);
          w = bmp.width; h = bmp.height;
          data = cx.getImageData(0, 0, w, h).data;
          bmp.close();
        } catch (e1) {
          const d = await new Promise(resolve => {
            const url = URL.createObjectURL(blob);
            const im = new Image();
            im.onload = () => {
              try {
                const cv = document.createElement("canvas");
                cv.width = im.naturalWidth; cv.height = im.naturalHeight;
                const cx = cv.getContext("2d", { willReadFrequently: true });
                cx.drawImage(im, 0, 0);
                resolve({ w: cv.width, h: cv.height,
                  data: cx.getImageData(0, 0, cv.width, cv.height).data });
              } catch (e2) { resolve({ error: e2.message || String(e2) }); }
              URL.revokeObjectURL(url);
            };
            im.onerror = () => { URL.revokeObjectURL(url); resolve({ error: "không tải được ảnh nền" }); };
            im.src = url;
          });
          if (d.error) throw new Error("createImageBitmap lỗi (" + (e1.message || e1) + "), đo bằng <img> cũng lỗi (" + d.error + ")");
          w = d.w; h = d.h; data = d.data;
        }
        let minX = w, minY = h, maxX = -1, maxY = -1;
        for (let yy = 0; yy < h; yy++) {
          for (let xx = 0; xx < w; xx++) {
            if (data[(yy * w + xx) * 4 + 3] > 10) {
              if (xx < minX) minX = xx; if (xx > maxX) maxX = xx;
              if (yy < minY) minY = yy; if (yy > maxY) maxY = yy;
            }
          }
        }
        return { minX, minY, maxX, maxY, w, h };
      }
      report.crop = { attempted: false, applied: false };
      try {
        if (layout.backgroundFile) {
          const blob = await blobFor(layout.backgroundFile);
          if (blob) {
            report.crop.attempted = true;
            const bb = await alphaBBox(blob);
            if (bb.maxX < 0) {
              report.crop.error = "ảnh nền hoàn toàn trong suốt";
              report.cropError = report.crop.error;
              report.notes.push("ảnh nền hoàn toàn trong suốt — không cắt cửa sổ");
            } else {
              const bw = bb.maxX + 1 - bb.minX, bh = bb.maxY + 1 - bb.minY;
              report.crop.bbox = { x: bb.minX, y: bb.minY, w: bw, h: bh };
              if ((bw < layout.w * 0.95 || bh < layout.h * 0.95) && bw >= layout.w * 0.4 && bh >= layout.h * 0.4) {
                const ox = bb.minX, oy = bb.minY;
                for (const b of buttons) { b.x -= ox; b.y -= oy; }
                for (const l of layers) { l.x -= ox; l.y -= oy; }
                for (const t of texts) { t.x -= ox; t.y -= oy; }
                for (const s of sliders) { if (typeof s.x === "number") s.x -= ox; if (typeof s.y === "number") s.y -= oy; }
                if (mainOut.frame) {
                  for (const b of mainOut.frame.buttons) { b.x -= ox; b.y -= oy; }
                  for (const l of mainOut.frame.layers) { l.x -= ox; l.y -= oy; }
                  for (const t of mainOut.frame.texts) { t.x -= ox; t.y -= oy; }
                }
                layout.bgCrop = { x: ox, y: oy, fullW: layout.w, fullH: layout.h };
                layout.w = bw; layout.h = bh;
                report.crop.applied = true;
                report.crop.from = layout.bgCrop.fullW + "x" + layout.bgCrop.fullH;
                report.crop.to = bw + "x" + bh;
                report.notes.push("cắt cửa sổ theo vùng mờ của ảnh nền: " + layout.bgCrop.fullW + "x" + layout.bgCrop.fullH + " -> " + bw + "x" + bh + " (dịch -" + ox + ",-" + oy + ")");
              } else {
                report.crop.note = "vùng mờ gần bằng layout (" + bw + "x" + bh + " / " + layout.w + "x" + layout.h + ") — không cần cắt";
              }
            }
          }
        }
      } catch (e) {
        report.crop.error = e.message || String(e);
        report.cropError = report.crop.error;
        report.notes.push("không tính được vùng mờ của ảnh nền: " + report.crop.error);
      }
      async function extractEQ() {
        let layEl = null, defaultVisible = false, containerId = null;
        const found = findContainer(id => id === "eq" || id === "equalizer");
        if (found) {
          containerId = found.container.getAttribute("id");
          defaultVisible = found.container.getAttribute("default_visible") === "1";
          const lays = layoutsForDoc(found.docPath);
          layEl = lays.find(l => (l.getAttribute("id") || "") === "normal") || lays[0] || null;
        }
        const out = newOut();
        let w = 0, h = 0, bg = null, bgFile = null, source = null;
        if (layEl) {
          const sz = await layoutSize(layEl);
          w = sz.w; h = sz.h;
          bg = layEl.getAttribute("background") || layEl.getAttribute("alphabackground");
          if (bg && !resolveImageRef(bg)) bg = null;
          bgFile = bg ? resolveImageRef(bg) : null;
          walkLayoutChildren(layEl, w, h, out, { handleFrame: false });
          source = "container:" + containerId;
        } else {
          let gid = null;
          for (const id of Object.keys(groupdefs)) {
            const hasEq = groupdefs[id].some(el =>
              (el.tagName || "").toLowerCase() === "slider" &&
              ((el.getAttribute("action") || "").toUpperCase() === "EQ_BAND" ||
               (el.getAttribute("action") || "").toUpperCase() === "EQ_PREAMP"));
            if (hasEq) { gid = id; break; }
          }
          if (!gid) return null;
          const [gw, gh] = groupSize(gid, 0, 0);
          w = gw > 0 ? gw : intAttr(groupdefEls[gid], "w", 0);
          h = gh > 0 ? gh : intAttr(groupdefEls[gid], "h", 0);
          if (!w || !h) return null;
          walkGroupChildren(resolveGroup(gid, w, h), 0, 0, 0, w, h, out, {});
          source = "groupdef:" + gid;
        }
        await fillSizes(out);
        const eqSliders = out.sliders.filter(s => s.action === "EQ_BAND" || s.action === "EQ_PREAMP");
        const preamp = eqSliders.find(s => s.action === "EQ_PREAMP" || s.param === "preamp") || null;
        const bands = eqSliders
          .filter(s => s.action === "EQ_BAND" && /^\d+$/.test(s.param || ""))
          .sort((a, b) => parseInt(a.param, 10) - parseInt(b.param, 10))
          .filter((s, i, arr) => arr.findIndex(t => t.param === s.param) === i);
        if (!bands.length && !preamp) return null;
        report.notes.push("EQ: " + source + " " + w + "x" + h + " — " + bands.length + " dải + preamp");
        return { w, h, background: bg, backgroundFile: bgFile, defaultVisible,
          layers: out.layers, buttons: out.buttons, sliders: out.sliders,
          texts: out.texts, vis: out.vis, backgrounds: out.backgrounds,
          preamp, bands, native: true, source };
      }
      async function extractPlaylist() {
        let layEl = null, defaultVisible = true, containerId = null;
        const found = findContainer(id => id === "pledit" || id === "playlist" || id === "playlisteditor");
        if (found) {
          containerId = found.container.getAttribute("id");
          defaultVisible = found.container.getAttribute("default_visible") !== "0";
          const lays = layoutsForDoc(found.docPath);
          layEl = lays.find(l => (l.getAttribute("id") || "") === "normal") || lays[0] || null;
        }
        if (!layEl) return null;
        const sz = await layoutSize(layEl);
        const out = newOut();
        let bg = layEl.getAttribute("background") || layEl.getAttribute("alphabackground");
        if (bg && !resolveImageRef(bg)) bg = null;
        walkLayoutChildren(layEl, sz.w, sz.h, out, { handleFrame: false });
        await fillSizes(out);
        const listRect = out.listRects[0] || null;
        report.notes.push("Playlist: container:" + containerId + " " + sz.w + "x" + sz.h +
          (listRect ? (" — list " + listRect.w + "x" + listRect.h + " tại (" + listRect.x + "," + listRect.y + ")")
                    : " — KHÔNG thấy vùng list, dùng fallback"));
        return { w: sz.w, h: sz.h, background: bg, backgroundFile: bg ? resolveImageRef(bg) : null,
          defaultVisible, layers: out.layers, buttons: out.buttons, sliders: out.sliders,
          texts: out.texts, vis: out.vis, backgrounds: out.backgrounds,
          listRect, native: true, source: "container:" + containerId };
      }
      eq = await extractEQ();
      playlist = await extractPlaylist();
      for (const f of Object.values(fonts)) {
        if (f.tag === "bitmapfont") { try { await detectFontRow(f, bitmaps, resolve.fileURL, findPath, pathMap); } catch (e) {  } }
      }
    } else {
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
      const resolveXY = (x, y) => ({
        x: x < 0 ? layout.w + x : x,
        y: y < 0 ? layout.h + y : y
      });
      const closeIds = ["close.1", "close.2", "close.3"];
      const elemAction = {
        "player.button.close": "CLOSE",
        "player.button.minimize": "MINIMIZE",
        "player.button.switch": null,
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
            const ov = bitmaps["vis.overlay1"];
            if (ov && ov.crop) {
              const p = resolveXY(kv.x === undefined ? ov.crop.x : kv.x, kv.y === undefined ? 0 : kv.y);
              layers.push({ id: elem, image: "vis.overlay1", imageFile: ov.file,
                x: p.x, y: p.y, w: ov.crop.w, h: ov.crop.h, alpha: null, ghost: "1", _imageId: "vis.overlay1" });
            }
            continue;
          }
          if (!(elem in elemAction)) continue;
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

    if (!layout || !layout.w || !layout.h) throw new Error("không tìm được kích thước cửa sổ chính trong XML");
    const hasPlay = buttons.some(b => b.action === "PLAY" && b.x !== null && b.y !== null && b.w && b.imageFile);
    if (!hasPlay) {
      const why = report.missing.find(m => /\bPlay\b/i.test(m))
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
      frame: mainOut.frame, vis: mainOut.vis, eq, playlist,
      unresolved: unresolved.concat(report.missing, report.notes)
    };
    function stripOut(out) {
      if (!out) return;
      for (const b of out.buttons) { delete b._imageId; delete b._hoverId; delete b._downId; delete b._activeId; }
      for (const l of out.layers) { delete l._imageId; }
    }
    stripOut(mainOut);
    stripOut(mainOut.frame);
    stripOut(eq);
    stripOut(playlist);
    const files = {};
    for (const [key, real] of pathMap) {
      if (real.endsWith("/")) continue;
      try { files[key] = await zip.file(real).async("blob"); } catch (e) { }
    }
    return { skin, resolve, report: { ...report, unresolved: skin.unresolved }, bitmaps, files };
  }

  return { loadSkinFile, loadSkinFromCache, ensureJSZip, VERSION: LOADER_VERSION };
})();
