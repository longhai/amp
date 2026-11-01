/* skin-loader.js — load a Winamp Modern skin (.wal / .zip) DIRECTLY in the
   browser. No Python at runtime.
   - Unzips with JSZip loaded from CDN (cdnjs 3.10.1). There is NO vendored
     jszip.min.js in the v4 package: if the CDN cannot be reached the loader
     throws a clear "không tải được thư viện JSZip từ mạng (CDN)" error and
     the page shows it in the status line below the player.
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

  /* Loader version — the page reads this (SkinLoader.VERSION) and shows
     it in the <h1> and the status line, so a screenshot proves which
     loader is actually running. Bump together with the ?v= query in
     index.html whenever this file changes. */
  const LOADER_VERSION = "5";

  /* ---------- JSZip: CDN only (v4 has no vendored copy) ---------- */
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
    // Closing tags: just strip the prefix. Opening tags: strip the
    // prefix but keep the FULL tag name in data-xuitag — the XUI tag
    // (e.g. Wasabi:MainFrame:NoStatus) is how a frame/title-bar element
    // finds its groupdef, and the cleaned tag alone ("NoStatus") is
    // shared by MainFrame/PlaylistFrame/MediaLibraryFrame/VISFrame.
    // (v5 bug: the old strip made every frame element "NoStatus", so
    // isFrameEl never matched, the content was walked one level deeper
    // than planned and the nested display/playbuttons groups hit the
    // depth limit — WinampModern566 lost its Play button and its frame.)
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

  /* ---------- zip helpers ---------- */
  function buildPathMap(zip, prefix) {
    const map = new Map(); // lower-case path -> real path
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
    // Some skins ship everything under one subfolder instead of the zip
    // root (Winamp 5.66 base skin: "Winamp Modern/skin.xml"). Find skin.xml
    // (root first, else the shallowest match) and treat its folder as the
    // skin root: pathMap keys are stored with that prefix stripped, so every
    // include/bitmap lookup below works unchanged.
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

    // --- skin.xml ---
    const skinXmlText = await readText(zip, pathMap, "skin.xml");
    if (!skinXmlText) throw new Error("không thấy skin.xml trong file");
    const skinDoc = parseXmlText(skinXmlText, "skin.xml");
    const info = {};
    const si = skinDoc.getElementsByTagName("skininfo")[0];
    if (si) for (const c of elChildren(si)) info[c.tagName] = (c.textContent || "").trim();
    info.abstraction_layer_version = skinDoc.documentElement.getAttribute("version") || "";

    // --- follow <include> recursively ---
    // Each doc records its include edges: a <container>'s <layout> usually
    // lives in a separate included file (pledit-normal.xml), not in the
    // container's own file, so EQ/Playlist must search the container's
    // reachable docs, not just its own element subtree.
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
          continue; // @COLORTHEMESPATH@ etc. live outside the skin
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
    // All <layout> elements in a doc and everything it includes
    // (transitively). A container's layout is found this way.
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
    // Find a <container> by id (case-insensitive) and return it with the
    // path of the doc that declares it, so its layouts can be found.
    function findContainer(idTest) {
      for (const { path, doc } of docs) {
        for (const c of elList(doc, "container")) {
          if (idTest((c.getAttribute("id") || "").toLowerCase()))
            return { container: c, docPath: path };
        }
      }
      return null;
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
          // A bitmapfont's `file` is a BITMAP id (e.g. "bitmapfont.player.
          // BIGNUM"), not a zip path — the renderer resolves it through
          // `bitmaps` to get the glyph sheet. hspacing/vspacing set the
          // advance between glyph cells (BIGNUM: charwidth 13, hspacing
          // -1 → cells are 12px apart, digits in cols 0-9, ":" in col 13).
          if (id && !fonts[id]) fonts[id] = { tag, file: b.getAttribute("file") || "",
            charwidth: intAttr(b, "charwidth", 0), charheight: intAttr(b, "charheight", 0),
            hspacing: intAttr(b, "hspacing", 0), vspacing: intAttr(b, "vspacing", 0) };
        }
      }
    }

    // Debug handle (harmless in production): which files were actually read.
    window.__loaderDebug = { docs: docs.map(d => d.path) };

    // --- groupdefs ---
    const groupdefs = {};
    const groupdefEls = {};
    // xuitag -> groupdef id: a <Wasabi:MainFrame:NoStatus> element is
    // implemented by the groupdef whose xuitag matches its tag name
    // (e.g. "wasabi.mainframe.nostatusbar" implements the main window's
    // frame chrome: title bar + menu bar). Used by the frame walker.
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
    // Wasabi relative coordinates: relatx/relaty="1" means the value is
    // measured from the parent's right/bottom edge (x = parentW + x),
    // relatw/relath="1" the same for sizes. The Winamp 5 base skin uses
    // them everywhere (window buttons at x="-41" relatx="1", the drawer
    // group at y="-263" relaty="1", stretched background slices with
    // w="-270" relatw="1"). Sizes resolve against the ENCLOSING group's
    // own size (groupSize), falling back to the parent's size.
    function relPos(el, attr, parent) {
      const v = intAttr(el, attr, 0);
      return el.getAttribute("relat" + attr) === "1" ? parent + v : v;
    }
    function relSize(el, attr, parent) {
      const v = intAttr(el, attr, 0);
      return el.getAttribute("relat" + attr) === "1" ? parent + v : v;
    }
    function groupSize(gid, parentW, parentH, instEl) {
      // A <group> instance's own w/h (when present) set the group's size:
      // the titlebar streak groups are instantiated with w=95 / w=-155,
      // and their children (the decorative lines) resolve against THAT,
      // not against the whole titlebar. Without this the streak's centre
      // line paints across the "WINAMP" title text. The groupdef's w/h
      // are only the default, used when the instance sets none.
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
    // Sizes: a negative or zero w/h is NOT a size (Wasabi uses w="-47"
    // with relath to mean "parent height minus 47", and the AVS window's
    // middle layer ends up with h=-47). v4 kept -47, and the renderer
    // set style.height="-47px" — invalid, ignored — so the 10x10 black
    // square image rendered at 346x346 (width only, aspect kept) and
    // covered the whole display. Treat <=0 as "unknown" so the bitmap
    // size fills it in, and the renderer never emits a negative size.
    function posSize(v) { return (typeof v === "number" && v > 0) ? v : null; }
    // A group is hidden when the INSTANCE says visible="0", or when the
    // groupdef itself does and the instance does not override it with
    // visible="1". v4 only checked the instance, so the AVS/video window
    // (groupdef visible="0", instance with no visible attr) was rendered
    // anyway — its black background covered the display. (v5)
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
    // One walk output per window: the main window uses `mainOut` (whose
    // arrays are also the bare `buttons`/`layers`/... names the rest of
    // this function already uses); the EQ and Playlist windows get their
    // own outputs from the same walker (see extractEQ/extractPlaylist).
    function newOut() {
      return { buttons: [], layers: [], texts: [], sliders: [],
        vis: [], listRects: [], backgrounds: [], unresolved: [], frame: null };
    }
    const mainOut = newOut();
    const buttons = mainOut.buttons, layers = mainOut.layers,
          texts = mainOut.texts, sliders = mainOut.sliders,
          unresolved = mainOut.unresolved;
    // Attribute lookup that tolerates the skins' casing habits: WM566's
    // config drawer writes Image="..." (capital I), BLAKK's EQ preset
    // button writes downimage="..." (all lower). XML attribute names are
    // case-sensitive, so the exact name misses half the skins.
    function attrCI(el, ...names) {
      for (const n of names) {
        const v = el.getAttribute(n);
        if (v !== null && v !== undefined) return v;
      }
      return null;
    }
    // Wasabi <button>/<layer> elements sometimes carry their own w/h
    // (Copperdeck: a 13x39 layer that uses the 289x135 winbck.main sprite
    // as its image). The explicit size wins — the bitmap size is only a
    // fallback. The old code always overwrote with the bitmap size, so that
    // 13x39 layer painted a 289x135 grey rectangle over the skin.
    function addButton(out, el, x, y, kind, pw, ph) {
      const image = attrCI(el, "image", "Image");
      const hover = attrCI(el, "hoverImage", "hoverimage", "HoverImage");
      const down = attrCI(el, "downImage", "downimage", "DownImage");
      const active = attrCI(el, "activeImage", "activeimage", "ActiveImage");
      // Wasabi actions are case-insensitive in Winamp (Nebular writes
      // action="Play", "next", "Pause"); canonicalise to upper case so
      // validation and the renderer can compare with "PLAY"/"NEXT"/...
      const act = el.getAttribute("action");
      out.buttons.push({
        id: el.getAttribute("id"), kind, action: act ? act.toUpperCase() : null,
        param: el.getAttribute("param"),
        x, y, w: posSize(relSize(el, "w", pw)), h: posSize(relSize(el, "h", ph)),
        image, imageFile: resolveImageRef(image),
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
      // Ticker/timer often live inside a groupdef (Nebular: Songticker
      // and timer are in boombox-lcd-group), not as direct layout kids.
      // Copperdeck writes the song ticker as <SongTicker> (capital S),
      // not <text>: treat it as the songname ticker.
      const isSongTicker = el.tagName.toLowerCase() === "songticker";
      const id = el.getAttribute("id");
      // <sendparams target="window.titlebar.title" default="WINAMP"/>
      // overrides the element's own default (":componentname").
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
        // Orientation: an explicit orientation attr wins; otherwise a
        // slider wider than tall is horizontal (Volume/Seeker) and a
        // taller one is vertical (EQ bands). The old default "vertical"
        // made the 254x13 seekbar render as a vertical strip.
        // "v"/"h" are the short forms some skins use (Copperdeck).
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
    // Positions inside a groupdef are relative to the group origin;
    // relatx/relaty resolve against the ENCLOSING group's size (parentW/H).
    // Offsets are added by walkGroupChildren, not here.
    function resolveGroup(gid, parentW, parentH) {
      const out = [];
      const kids = groupdefs[gid] || [];
      for (const el of kids) {
        out.push({ el, x: relPos(el, "x", parentW), y: relPos(el, "y", parentH) });
      }
      return out;
    }
    // Elements with visible="0" are hidden in Winamp (alternate vis modes,
    // inactive states). The old code rendered them anyway.
    function isVisible(el) { return el.getAttribute("visible") !== "0"; }
    // Fill w/h of buttons/layers from PNG bytes (or sprite crop) — but
    // only where the element did not already carry its own w/h. Shared by
    // the main window, the frame, and the EQ/Playlist windows.
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
    // One element, however it is reached (layout child or group child).
    // `sendParams` is the layout-level <sendparams> map (target id ->
    // {default, ...}); it flows down through nested groups so the title
    // bar text picks up default="WINAMP".
    function dispatchEl(el, ax, ay, depth, parentW, parentH, out, sendParams) {
      if (!isVisible(el)) return;
      // Tag names are case-sensitive in the XML DOM, but skins mix cases
      // (NStatesButton, ProgressGrid): match on the lower-cased tag.
      const tag = (el.tagName || "").toLowerCase();
      const content = el.getAttribute("content");
      if (content && groupdefs[content]) {
        // MainFrame content="..." (Winamp 5 base skin): the layout's real
        // content lives in that groupdef, not in the layout itself.
        if (!groupVisible(content, el)) return;
        if (depth < 5) {
          const [gw, gh] = groupSize(content, parentW, parentH, el);
          walkGroupChildren(resolveGroup(content, gw, gh), ax, ay, depth + 1, gw, gh, out, sendParams);
        } else out.unresolved.push("nested group quá sâu: " + content);
        return;
      }
      // XUI component (Wasabi:TitleBar, ...): implemented by the groupdef
      // whose xuitag matches the element's full tag (data-xuitag — the
      // cleaned tagName alone, e.g. "NoStatus", is ambiguous).
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
        // The playlist list area (BLAKK: windowholder; WM566/DDTank/
        // Copperdeck: component). The renderer puts the HTML list here.
        out.listRects.push({ id: el.getAttribute("id"), x: ax, y: ay,
          w: posSize(relSize(el, "w", parentW)), h: posSize(relSize(el, "h", parentH)) });
      }
      else if (tag === "group") {
        const gid = el.getAttribute("id");
        if (el.getAttribute("move") === "1") {
          // Slide-out panel (config drawer): hidden until a MAKI script
          // moves it — rendering it at its rest position would paint it
          // over the player. Same rule as Copperdeck's drawer.
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
        // Not visual: sendparams are applied through the map, scripts and
        // mousetraps need MAKI. Not unresolved noise.
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
    // <sendparams target="a;b" default="..." visible="..."/> at layout
    // level, keyed by target id.
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
    // Walk a MainFrame/PlaylistFrame's chrome (title bar + menu bar) into
    // out.frame, and return how far down the frame's content must shift
    // (the title bar height: the menubar's y). The layout's own window
    // buttons (Minimize/Winshade/Close at y=4) are NOT shifted — they sit
    // in the title bar itself.
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
      if (!offsetY) offsetY = 18; // title bar height, no menubar in frame
      fOut.menubarY = offsetY;
      walkGroupChildren(resolveGroup(frameGid, layoutW, layoutH), 0, 0, 0, layoutW, layoutH, fOut, sendParams);
      // The layout hides the frame's own Close buttons (hideobject) and
      // provides its own at the same spot — drop the frame's copies.
      fOut.buttons = fOut.buttons.filter(b => b.id !== "Close" && b.id !== "Close.inactive");
      return offsetY;
    }
    // The menu bar's labels (File/Play/Options/View/Help) are laid out by
    // a MAKI script (menualign): the walker stacks all five at (0,0).
    // Spread them left-to-right in the menu.group's own order. Runs AFTER
    // fillSizes, because it needs the label widths.
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
      let cursor = 1; // menu.group x=1 inside the menubar
      for (const img of order) {
        const lay = fOut.layers.find(l => l.image === img);
        if (!lay) continue;
        lay.x = cursor; lay.y = fOut.menubarY;
        cursor += (lay.w || 0) + 8;
      }
    }
    // Walk one <layout> element's children into `out`. opts.handleFrame
    // (default true): render the MainFrame chrome and shift its content
    // below the title bar. Sub-windows (EQ/Playlist) pass false: their
    // layout coordinates already place the content below the title area,
    // and their frame chrome is not rendered in v5.
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

    let eq = null, playlist = null;
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
      // Walk the layout (frame chrome + content) into mainOut.
      walkLayoutChildren(layoutEl, layout.w, layout.h, mainOut, { handleFrame: true });
      // Fill w/h of buttons/layers from PNG bytes (or sprite crop) — but
      // only where the element did not already carry its own w/h (see above).
      await fillSizes(mainOut);
      if (mainOut.frame) {
        await fillSizes(mainOut.frame);
        // The menu bar labels need their widths before they can be
        // spread left-to-right (see layoutMenuLabels).
        layoutMenuLabels(mainOut.frame);
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
      // --- trim empty space below the content ---
      // Some skins (Winamp 5.66 base skin) declare a tall layout (354x280)
      // whose lower part is only the hidden config-drawer area: nothing is
      // painted there, so the window would show a big empty black strip
      // below the player (the real skin's window is ~150 tall). When the
      // layout has NO background image to preserve, crop the height to the
      // lowest painted element — but only when the content clearly ends
      // well above the layout bottom, so skins with full-height content
      // are untouched. Skins WITH a background image are never cropped
      // here (Copperdeck's case is handled by the alpha crop below).
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
      // --- visible-window crop from the background image alpha ---
      // Some skins (Copperdeck II) declare a 645px layout but the background
      // PNG is only opaque in the middle 289px (178..467): the rest is the
      // drawer area, hidden in Winamp until the MAKI drawer slides out.
      // Rendering the full 645px makes the player look small and cut off on
      // a phone, and layers that reuse the background as a sprite
      // (winbck.main) paint a big grey rectangle outside the window. Crop
      // the layout to the opaque bounding box of the background image when
      // it is clearly smaller than the layout (40%..95% of the size) and
      // shift every element by the same offset. BLAKK/DDTank (fully opaque)
      // and Nebular (98.9% opaque) are unaffected.
      //
      // This block runs INSIDE loadSkinFile() and is awaited before the skin
      // object is returned, so buildSkin() can never render the uncropped
      // layout first. A measurement failure is recorded in report.crop /
      // report.cropError and the page shows it in the status line — it is
      // never swallowed into an invisible note (v4 did exactly that: a
      // failed alpha scan left a 645px layout with no visible reason).
      //
      // Measure the opaque bounding box of a PNG blob. Tries
      // createImageBitmap first, then an <img> + canvas (some mobile
      // browsers fail the first path). Throws with the reason on failure.
      async function alphaBBox(blob) {
        let w, h, data;
        try {
          const bmp = await createImageBitmap(blob);
          const cv = document.createElement("canvas");
          cv.width = bmp.width; cv.height = bmp.height;
          const cx = cv.getContext("2d", { willReadFrequently: true });
          cx.drawImage(bmp, 0, 0);
          // NOTE: read width/height BEFORE bmp.close() — after close()
          // an ImageBitmap reports 0x0, which made this whole scan a
          // no-op (bbox stayed empty) in the first v4 build.
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
      // --- EQ + Playlist windows (v5) ---
      // The equalizer is found either as a container (BLAKK/Nebular/
      // DDTank/Copperdeck: <container id="eq"> with a "normal" layout)
      // or as a groupdef that holds EQ_BAND sliders (WM566: the EQ lives
      // in the config drawer's player.normal.drawer.eq.content groupdef,
      // 318x89). The config drawer itself is a move=1 group the main
      // walk skips, so the EQ is pulled out directly instead of through
      // the drawer. A skin with neither gets a plain fallback window
      // from the renderer (eq/playlist stay null here).
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
          // Some skins put two slider elements on one band (Copperdeck:
          // eq1.fnt + eq1.act at the same spot) — keep the first of each.
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
      // Bitmapfont glyph row: the glyph sheet's ink lives in one row band
      // (BIGNUM numfont.png: 3 bands of 20px, ink only in band 1). Detect
      // it so the timer renderer crops the right digit cells.
      async function detectFontRow(font) {
        if (!font || font.tag !== "bitmapfont") return;
        const entry = bitmaps[font.file];
        if (!entry) return;
        try {
          const imgUrl = await fileURL(entry.file);
          if (!imgUrl) return;
          const dims = await new Promise(resolve => {
            const im = new Image();
            im.onload = () => resolve({ w: im.naturalWidth, h: im.naturalHeight, im });
            im.onerror = () => resolve(null);
            im.src = imgUrl;
          });
          if (!dims) return;
          font.imageURL = imgUrl;
          font.imageW = dims.w; font.imageH = dims.h;
          const ch = font.charheight || 0;
          if (!ch || dims.h < ch) { font.glyphRow = 0; return; }
          const cv = document.createElement("canvas");
          cv.width = dims.w; cv.height = dims.h;
          const cx = cv.getContext("2d", { willReadFrequently: true });
          cx.drawImage(dims.im, 0, 0);
          const data = cx.getImageData(0, 0, dims.w, dims.h).data;
          let bestRow = 0, bestInk = -1;
          for (let r = 0; r * ch < dims.h; r++) {
            let ink = 0;
            for (let y = r * ch; y < Math.min((r + 1) * ch, dims.h); y++)
              for (let x = 0; x < dims.w; x++)
                if (data[(y * dims.w + x) * 4 + 3] > 30) ink++;
            if (ink > bestInk) { bestInk = ink; bestRow = r; }
          }
          font.glyphRow = bestRow;
        } catch (e) { font.glyphRow = 0; }
      }
      eq = await extractEQ();
      playlist = await extractPlaylist();
      for (const f of Object.values(fonts)) {
        if (f.tag === "bitmapfont") { try { await detectFontRow(f); } catch (e) { /* fallback: monospace timer */ } }
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
      frame: mainOut.frame, vis: mainOut.vis, eq, playlist,
      unresolved: unresolved.concat(report.missing, report.notes)
    };
    // Strip internal helpers before returning.
    function stripOut(out) {
      if (!out) return;
      for (const b of out.buttons) { delete b._imageId; delete b._hoverId; delete b._downId; delete b._activeId; }
      for (const l of out.layers) { delete l._imageId; }
    }
    stripOut(mainOut);
    stripOut(mainOut.frame);
    stripOut(eq);
    stripOut(playlist);
    return { skin, resolve, report: { ...report, unresolved: skin.unresolved } };
  }

  return { loadSkinFile, ensureJSZip, VERSION: LOADER_VERSION };
})();
