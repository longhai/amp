/* =====================================================================
   Amp v9 — skin-loader.js: loader skin Winamp Modern (.wal/.zip) theo
   SPEC-skin-sim §1. Chỉ giữ các công thức đã chứng minh đúng — NGOẠI TRỪ
   contentH (xem ghi chú ở frameOffsetFor): công thức cũ
   contentH = layoutH - frameOffsetY SAI (đo lại từ Winamp thật:
   display/seek/playbuttons đều thấp hơn Amp đúng 18px; main phải ở
   y=35, đáy 161, cửa sổ đóng cao 164 — không phải y=17/143/156).
   Version: LOADER_VERSION = "10.19". MỖI LẦN ĐỔI LOADER PHẢI BUMP VERSION,
   không thì trình duyệt/model cache cũ làm mọi sửa loader vô hiệu.
   Đợt v10.12: layout thiếu w/h đo từ ảnh nền (background) rồi mới tới
   bao nội dung rồi 354×280; lưu background/alphabackground của layout;
   groupdef chuẩn Winamp thiếu thì tự cấp rỗng (wasabi.window.embedded...);
   ghi file thiếu vào report.missing; phát hiện skin ClassicPro; dựng
   layout Pledit mặc định khi chỉ có pledit.content.group; cleanXml giữ
   tên XUI đầy đủ vào data-xui; trim tên file bitmap; crop 0×0 coi như
   không crop; findPath chấp nhận dấu \ kiểu Windows.
   Chạy được cả trình duyệt (window) lẫn Node (module.exports, dùng với
   jsdom trong test). Không dùng Blob khi đọc file trong zip (tránh lỗi
   khác realm Blob giữa Node JSZip và jsdom); ảnh đo bằng header PNG.
   ===================================================================== */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory();
  else root.AmpSkinLoader = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var LOADER_VERSION = "10.19";
  var EXPECTED_LOADER_VERSION = "10.19";
  /* Nhánh Classic (.wsz, không có skin.xml) parse thật bằng AmpClassic
     (classic.js: viscolor/pledit/region/genex + bảng sprite + hình học
     cửa sổ chính 275×116); asset resolver (fileURL/imgSize) dời lên
     trước nhánh Classic để resolve Classic cũng dùng được URL thật. */
  /* Version manifest duy nhất: index.html đặt window.AMP_VERSION TRƯỚC
     khi nạp file này. File đọc manifest để tự kiểm: nếu manifest có mà
     khác version của file thì MANIFEST_MISMATCH = true để trang báo
     "bản mix" thay vì vẽ sai trong im lặng (bài học v7.4/v8). Không có
     manifest (chạy test trực tiếp bằng require) thì không kiểm. */
  var MANIFEST_VERSION = (function () {
    try {
      if (typeof globalThis !== "undefined" && globalThis.AMP_VERSION) return globalThis.AMP_VERSION;
      if (typeof window !== "undefined" && window.AMP_VERSION) return window.AMP_VERSION;
    } catch (e) { /* bỏ qua */ }
    return null;
  })();
  var MANIFEST_MISMATCH = MANIFEST_VERSION !== null && MANIFEST_VERSION !== LOADER_VERSION;
  /* Khóa cache model: tên skin + version loader VÀ version code vẽ
     (manifest window.AMP_VERSION — bằng version renderer khi nạp qua
     index.html; không có manifest thì rơi về LOADER_VERSION). V9 CHƯA
     cache model vào IndexedDB — loadSkinFile luôn đọc mới (fromCache=false)
     nên không có rủi ro model cũ; khóa này định nghĩa sẵn để đợt nào thêm
     cache thì dùng đúng khóa này, không tự bịa khóa mới thiếu 1 version. */
  function skinCacheKey(name) { return name + "|loader" + LOADER_VERSION + "|render" + (MANIFEST_VERSION || LOADER_VERSION); }

  /* ---------------- helpers ---------------- */
  function cleanXml(text) {
    var t = String(text);
    t = t.replace(/<\?xml[^?]*\?>/gi, "").replace(/<!DOCTYPE[^>]*>/gi, "");
    t = t.replace(/\s+xmlns(?::[A-Za-z_][\w.-]*)?="[^"]*"/g, "");
    t = t.replace(/<(\/?)(?:[A-Za-z_][\w.-]*:)+([A-Za-z_][\w.-]*)/g, "<$1$2");
    t = t.replace(/(\s)(?:[A-Za-z_][\w.-]*:)+([A-Za-z_][\w.-]*)=/g, "$1$2=");
    t = t.replace(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)/g, "&amp;");
    /* Winamp không phân biệt hoa/thường ở tên thuộc tính, DOMParser thì có:
       vài nút ghi Image="..." nên getAttribute("image") không thấy. */
    t = t.replace(/(\s)Image=/g, "$1image=");
    /* v10.12 (P1 D) — giữ tên XUI đầy đủ: <Wasabi:StandardFrame:Status>
       lột namespace thành <status> thì renderer nhầm thành chỉ báo
       trạng thái phát (nhánh <status>) và mất cả khung cửa sổ. Ghi tên
       đầy đủ (chữ thường) vào thuộc tính data-xui để renderer tra
       xuiMap; thẻ đóng thì chỉ lột tên. Thẻ không có namespace giữ nguyên. */
    t = t.replace(/<(\/?)((?:[A-Za-z_][\w.-]*:)+)([A-Za-z_][\w.-]*)/g, function (m, slash, prefixes, name) {
      if (slash) return "</" + name;
      return "<" + name + ' data-xui="' + (prefixes + name).toLowerCase() + '"';
    });
    return t;
  }
  function parseXmlText(text, label, DOMParserImpl) {
    var DP = DOMParserImpl || (typeof DOMParser !== "undefined" ? DOMParser : null);
    if (!DP) throw new Error("không có DOMParser để đọc XML " + label);
    var parser = new DP();
    function tryParse(t) {
      try {
        var doc = parser.parseFromString(t, "text/xml");
        if (!doc) return null;
        var errs = doc.getElementsByTagName("parsererror");
        return errs && errs.length ? null : doc;
      } catch (e) { return null; /* jsdom throw thay vì trả parsererror */ }
    }
    var doc = tryParse(text);
    if (doc) return doc;
    doc = tryParse(cleanXml(text));
    if (doc) return doc;
    doc = tryParse("<root>" + cleanXml(text) + "</root>");
    if (doc) return doc;
    throw new Error("không đọc được XML " + label);
  }
  function elChildren(el) {
    var out = [], i, n;
    for (i = 0; i < el.childNodes.length; i++) {
      n = el.childNodes[i];
      if (n.nodeType === 1) out.push(n);
    }
    return out;
  }
  function elList(doc, tag) {
    var list = doc.getElementsByTagName(tag), out = [], i;
    for (i = 0; i < list.length; i++) out.push(list[i]);
    return out;
  }
  function intAttr(el, name, def) {
    var v = el.getAttribute(name);
    if (v === null || v === undefined || v === "") return def;
    var n = parseInt(v, 10);
    return isNaN(n) ? def : n;
  }
  function normPath(dir, ref) {
    var parts = (dir ? dir + "/" : "") + ref, out = [], i, p;
    var segs = parts.split("/");
    for (i = 0; i < segs.length; i++) {
      p = segs[i];
      if (p === "" || p === ".") continue;
      if (p === "..") { out.pop(); continue; }
      out.push(p);
    }
    return out.join("/");
  }
  function dirOf(path) {
    var i = path.lastIndexOf("/");
    return i < 0 ? "" : path.slice(0, i);
  }
  function lowerTag(el) { return (el.tagName || "").toLowerCase(); }
  function lowerId(s) { return String(s == null ? "" : s).toLowerCase(); }

  /* Đo kích thước PNG từ header IHDR (không cần Image, chạy được cả jsdom):
     signature 8 byte, width ở byte 16-19, height ở byte 20-23 (big-endian). */
  function pngSizeFromBytes(buf) {
    var b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    if (b.length < 24) return null;
    if (b[0] !== 0x89 || b[1] !== 0x50 || b[2] !== 0x4E || b[3] !== 0x47) return null;
    var w = (b[16] << 24) | (b[17] << 16) | (b[18] << 8) | b[19];
    var h = (b[20] << 24) | (b[21] << 16) | (b[22] << 8) | b[23];
    if (!w || !h) return null;
    return { w: w, h: h };
  }

  /* ---------------- loader chính ---------------- */
  async function loadSkinFile(file, opts) {
    /* Kiểm EXPECTED_LOADER_VERSION ngay khi nạp, TRƯỚC mọi đọc cache
       (hiện chưa có cache, nhưng kiểm trước để đợt sau thêm cache không
       quên — loader cũ không được đọc model của nó như thể đúng). */
    if (LOADER_VERSION !== EXPECTED_LOADER_VERSION) {
      throw new Error("skin-loader.js: LOADER_VERSION (" + LOADER_VERSION + ") khac EXPECTED_LOADER_VERSION (" + EXPECTED_LOADER_VERSION + ") — ban mix, dung lai");
    }
    opts = opts || {};
    var JSZipImpl = opts.JSZip || (typeof JSZip !== "undefined" ? JSZip : null);
    if (!JSZipImpl) throw new Error("không có JSZip (cần thư viện giải nén)");
    var DOMParserImpl = opts.DOMParser || null;
    var report = { missing: [], notes: [], classicPro: false };
    var missingSeen = {};
    function pushMissing(s) {
      if (!s || missingSeen[s]) return;
      missingSeen[s] = true;
      report.missing.push(s);
    }
    var classicPro = false; /* v10.12 (P2 G): skin ClassicPro — giao diện nằm trong engine ClassicPro ngoài .wal */
    var zip;
    try { zip = await JSZipImpl.loadAsync(file); }
    catch (e) { throw new Error("không mở được file zip (" + (e && e.message ? e.message : e) + ")"); }

    /* Tìm skin.xml ở mọi độ sâu; thư mục chứa nó thành rootPrefix. */
    var rootPrefix = "";
    var names = Object.keys(zip.files);
    var hasRootSkin = names.some(function (n) { return n.toLowerCase() === "skin.xml"; });
    if (!hasRootSkin) {
      var hits = names.filter(function (n) { return /\/skin\.xml$/i.test(n); });
      hits.sort(function (a, b) {
        return a.split("/").length - b.split("/").length || (a < b ? -1 : a > b ? 1 : 0);
      });
      if (hits.length) rootPrefix = hits[0].slice(0, hits[0].lastIndexOf("/") + 1);
    }
    /* Tra file không phân biệt hoa/thường (file .PNG hoa/thường lẫn lộn). */
    var pathMap = new Map();
    names.forEach(function (name) {
      var key = (rootPrefix && name.toLowerCase().indexOf(rootPrefix.toLowerCase()) === 0)
        ? name.slice(rootPrefix.length) : name;
      pathMap.set(key.toLowerCase(), name);
    });
    function findPath(p) {
      /* v10.12: skin viết đường dẫn kiểu Windows (player\ratings-nostar.png)
         trong khi tên file trong zip dùng / — chuẩn hóa \ thành / trước khi tra. */
      return pathMap.get(String(p).replace(/\\/g, "/").toLowerCase()) || null;
    }
    async function readText(p) {
      var real = findPath(p);
      if (!real) return null;
      return await zip.file(real).async("string");
    }
    /* Asset resolver — đặt ở ĐÂY (trước nhánh Classic) để cả 2 nhánh
       (Modern + Classic) dùng chung: nhánh Classic cũng cần URL thật
       của BMP. imgSize đo bằng header PNG trước (chạy cả jsdom), chỉ
       dùng Image cho ảnh không phải PNG và khi có trình duyệt thật. */
    var urlCache = new Map(), sizeCache = new Map();
    /* MIME cho Blob của file trong zip: `new Blob([ab])` không có type —
       blob: URL không có content-type thì trình duyệt (đặc biệt Chrome
       trên điện thoại) chỉ còn đoán theo nội dung, có lúc không nhận ra
       ảnh BMP của skin Classic (ảnh không hiện, cửa sổ trắng trơn dù
       sprite đã vẽ). Gán type theo đuôi file (.bmp/.png/.jpg/.gif/.cur)
       để ảnh chắc chắn giải mã được; đuôi lạ thì để trống như cũ. */
    var MIME_BY_EXT = {
      bmp: "image/bmp", png: "image/png", jpg: "image/jpeg",
      jpeg: "image/jpeg", gif: "image/gif", cur: "image/x-icon",
      ico: "image/x-icon", webp: "image/webp"
    };
    function blobMime(zipPath) {
      var m = /\.([A-Za-z0-9]+)$/.exec(String(zipPath || ""));
      return (m && MIME_BY_EXT[m[1].toLowerCase()]) || "";
    }
    function makeBlob(ab, zipPath) {
      var type = blobMime(zipPath);
      try {
        return type ? new Blob([ab], { type: type }) : new Blob([ab]);
      } catch (e) { return new Blob([ab]); }
    }
    async function blobFor(zipPath) {
      var real = findPath(zipPath);
      if (!real) return null;
      return await zip.file(real).async("arraybuffer");
    }
    async function fileURL(zipPath) {
      if (!zipPath) return null;
      if (urlCache.has(zipPath)) return urlCache.get(zipPath);
      var ab = await blobFor(zipPath);
      if (!ab) { urlCache.set(zipPath, null); return null; }
      var url = null;
      try {
        if (typeof Blob !== "undefined" && typeof URL !== "undefined" && URL.createObjectURL) {
          url = URL.createObjectURL(makeBlob(ab, zipPath));
        }
      } catch (e) { url = null; }
      if (!url) url = "amp9://" + zipPath; /* fallback cho môi trường test */
      urlCache.set(zipPath, url);
      return url;
    }
    async function imgSize(zipPath) {
      if (!zipPath) return null;
      if (sizeCache.has(zipPath)) return sizeCache.get(zipPath);
      var ab = await blobFor(zipPath);
      var size = null;
      if (ab) size = pngSizeFromBytes(ab);
      if (!size && ab && typeof Image !== "undefined" && typeof URL !== "undefined" && URL.createObjectURL) {
        try {
          var blobUrl = URL.createObjectURL(makeBlob(ab, zipPath));
          size = await new Promise(function (resolve) {
            var im = new Image();
            var done = false;
            var timer = setTimeout(function () { if (!done) { done = true; resolve(null); } }, 1500);
            im.onload = function () { if (!done) { done = true; clearTimeout(timer); resolve({ w: im.naturalWidth, h: im.naturalHeight }); } };
            im.onerror = function () { if (!done) { done = true; clearTimeout(timer); resolve(null); } };
            im.src = blobUrl;
          });
        } catch (e) { size = null; }
      }
      sizeCache.set(zipPath, size);
      return size;
    }
    if (rootPrefix) report.notes.push("skin nằm trong thư mục con '" + rootPrefix + "' — đã dùng làm gốc");

    var skinXmlText = await readText("skin.xml");
    if (!skinXmlText) {
      /* Skin Classic (.wsz, vd base-2.91.wsz): không có skin.xml (chỉ có
         BMP/CUR/TXT của Winamp 2) nên không có model Modern nào (không
         groupdef/layout/bitmap XML). KHÔNG throw: parse thật bằng
         AmpClassic (classic.js: viscolor.txt, pledit.txt, region.txt,
         genex.bmp, bảng tọa độ sprite, hình học cửa sổ chính 275×116)
         rồi trả resolve kind:"classic" với `classic` đính kèm để
         renderer vẽ cửa sổ chính Classic từ BMP. Không có classic.js
         (vd test cũ chỉ nạp skin-loader.js) thì classic=null và renderer
         về đường cũ: chỉ cửa sổ Video/Hiệu ứng rời, không vẽ cửa sổ
         chính. */
      report.notes.push("skin Classic (.wsz): không có skin.xml — vẽ cửa sổ chính từ BMP (classic.js) + cửa sổ Video/Hiệu ứng rời (không có vùng AVS nhúng)");
      var classicMaki = names.filter(function (n) { return n.toLowerCase().endsWith(".maki"); })
        .map(function (n) {
          var p = (rootPrefix && n.toLowerCase().indexOf(rootPrefix.toLowerCase()) === 0) ? n.slice(rootPrefix.length) : n;
          return { path: p, size: (zip.files[n] && zip.files[n].uncompressedSize) || 0 };
        })
        .sort(function (a, b) { return a.path < b.path ? -1 : a.path > b.path ? 1 : 0; });
      var classicLib = opts.Classic || null;
      if (!classicLib) {
        try {
          if (typeof globalThis !== "undefined" && globalThis.AmpClassic) classicLib = globalThis.AmpClassic;
          else if (typeof window !== "undefined" && window.AmpClassic) classicLib = window.AmpClassic;
        } catch (e) { classicLib = null; }
      }
      var classicData = null;
      if (classicLib && classicLib.parseClassicSkin) {
        try {
          classicData = await classicLib.parseClassicSkin(zip, { findPath: findPath, fileURL: fileURL });
          report.notes.push("Classic: " + Object.keys(classicData.sheets).length + " sheet BMP"
            + (classicData.hasNumsEx ? " (có nums_ex.bmp)" : " (không có nums_ex.bmp, dùng numbers.bmp)")
            + ", viscolor " + classicData.viscolors.length + " màu, region " + Object.keys(classicData.region).length + " section");
        } catch (e) {
          report.notes.push("không đọc được skin Classic: " + (e && e.message ? e.message : e));
          classicData = null;
        }
      } else {
        report.notes.push("classic.js chưa nạp — cửa sổ chính Classic chưa vẽ được (chỉ cửa sổ rời)");
      }
      var classicResolve = {
        version: LOADER_VERSION, fromCache: false, kind: "classic",
        bitmaps: {}, fonts: {}, colors: {},
        groupdefs: {}, groupdefEls: {}, xuiMap: {},
        layouts: {}, layoutList: [], containers: {},
        findLayout: function () { return null; },
        firstLayoutInContainer: function () { return null; },
        xmlFiles: [], makiFiles: classicMaki,
        gammasets: [], gammas: [],
        drawer: null, embeddedAvs: null,
        classic: classicData,
        fileURL: fileURL, imgSize: imgSize,
        resolveImageRef: function (ref) { return findPath(ref) ? ref : null; },
        bitmapInfo: async function (id) {
          if (!id) return null;
          var real = findPath(id);
          if (!real) return null;
          var s = await imgSize(real);
          return { file: real, crop: null, w: s ? s.w : 0, h: s ? s.h : 0 };
        },
        report: report, zip: zip, findPath: findPath,
        screenshotFile: null
      };
      return { skin: { name: opts.name || "", version: "" }, layouts: {}, resolve: classicResolve, report: report, version: LOADER_VERSION, fromCache: false };
    }
    var skinDoc = parseXmlText(skinXmlText, "skin.xml", DOMParserImpl);
    var info = {};
    var si = skinDoc.getElementsByTagName("skininfo")[0];
    if (si) {
      var kids = elChildren(si);
      for (var i = 0; i < kids.length; i++) info[kids[i].tagName] = (kids[i].textContent || "").trim();
    }
    info.version = (skinDoc.documentElement && skinDoc.documentElement.getAttribute("version")) || "";

    /* Đồ thị include: BFS, resolve tương đối theo thư mục file đang include. */
    var docs = [{ path: "skin.xml", doc: skinDoc }];
    var seen = {};
    seen["skin.xml"] = true;
    var queue = [{ path: "skin.xml", doc: skinDoc }];
    var includesByFile = {}, containerDirect = {};
    while (queue.length) {
      var cur = queue.shift();
      var curLow = cur.path.toLowerCase();
      if (!includesByFile[curLow]) includesByFile[curLow] = [];
      var conts = elList(cur.doc, "container"), ci, cj;
      for (ci = 0; ci < conts.length; ci++) {
        var cid = conts[ci].getAttribute("id") || "";
        if (!cid) continue;
        if (!containerDirect[cid]) containerDirect[cid] = [];
        var incs2 = conts[ci].getElementsByTagName("include");
        for (cj = 0; cj < incs2.length; cj++) {
          var ref2 = incs2[cj].getAttribute("file");
          if (!ref2 || ref2.indexOf("@") >= 0) continue;
          containerDirect[cid].push(normPath(dirOf(cur.path), ref2));
        }
      }
      var incs = elList(cur.doc, "include");
      for (var k = 0; k < incs.length; k++) {
        var ref = incs[k].getAttribute("file");
        if (!ref) continue;
        /* v10.12 (P2 G): skin ClassicPro (cPro) nạp giao diện từ engine
           ClassicPro ngoài .wal (Plugins/classicPro/engine/load.xml) —
           ghi nhận để renderer báo rõ thay vì lỗi chung chung. Chỉ nhận
           diện theo đường dẫn include, không theo tên file skin. */
        if (/classicpro/i.test(ref)) { classicPro = true; report.classicPro = true; }
        if (ref.indexOf("@") >= 0) { report.notes.push("bỏ qua include có placeholder: " + ref); continue; }
        var p = normPath(dirOf(cur.path), ref);
        includesByFile[curLow].push(p);
        if (seen[p.toLowerCase()]) continue;
        seen[p.toLowerCase()] = true;
        var text = await readText(p);
        if (text === null) { report.notes.push("include không có trong file: " + p); pushMissing("xml: " + p); continue; }
        try {
          var d = parseXmlText(text, p, DOMParserImpl);
          docs.push({ path: p, doc: d });
          queue.push({ path: p, doc: d });
        } catch (e) { report.notes.push("không đọc được XML " + p + ": " + e.message); }
      }
    }

    /* Gom model — first-wins ở khắp nơi (file include trước thắng). */
    var bitmaps = {}, fonts = {}, colors = {};
    var di, b, tag;
    for (di = 0; di < docs.length; di++) {
      var doc = docs[di].doc, path = docs[di].path;
      var blist = elList(doc, "bitmap");
      for (b = 0; b < blist.length; b++) {
        var bid = blist[b].getAttribute("id"), bf = (blist[b].getAttribute("file") || "").replace(/^\s+|\s+$/g, "");
        if (!bid || !bf || bitmaps[bid]) continue;
        var rootRel = normPath("", bf);
        var entry = { file: findPath(rootRel) ? rootRel : (findPath(normPath(dirOf(path), bf)) || rootRel) };
        /* gammagroup của bitmap (vd "Backgrounds") — tab Color Themes
           áp filter theo từng nhóm, không áp chung toàn stage. */
        var gg = blist[b].getAttribute("gammagroup");
        if (gg) entry.gammagroup = gg;
        if (blist[b].getAttribute("x") !== null) {
          /* v10.12: crop 0×0 (vd CROSSNET equalizer.background chỉ có x/y,
             không có w/h) là crop vô nghĩa — coi như không crop để
             spriteDiv không chia cho 0 và imgSize đo được cỡ thật. */
          var cw0 = intAttr(blist[b], "w", 0), ch0 = intAttr(blist[b], "h", 0);
          if (cw0 > 0 && ch0 > 0) {
            entry.crop = { x: intAttr(blist[b], "x", 0), y: intAttr(blist[b], "y", 0), w: cw0, h: ch0 };
          }
        }
        bitmaps[bid] = entry;
      }
      var fontTags = ["bitmapfont", "truetypefont"];
      for (var ft = 0; ft < fontTags.length; ft++) {
        tag = fontTags[ft];
        var flist = elList(doc, tag);
        for (var f = 0; f < flist.length; f++) {
          var fid = flist[f].getAttribute("id");
          if (fid && !fonts[fid]) fonts[fid] = {
            tag: tag, file: flist[f].getAttribute("file") || "",
            charwidth: intAttr(flist[f], "charwidth", 0), charheight: intAttr(flist[f], "charheight", 0),
            hspacing: intAttr(flist[f], "hspacing", 0), vspacing: intAttr(flist[f], "vspacing", 0)
          };
        }
      }
      var clist = elList(doc, "color");
      for (var c = 0; c < clist.length; c++) {
        var colId = clist[c].getAttribute("id"), colV = clist[c].getAttribute("value");
        if (colId && colV && !colors[colId]) colors[colId] = colV;
      }
    }
    /* v10.12 (P1 F): kiểm kê ảnh bitmap thiếu trong .wal (không phải lỗi
       Amp — file .wal thiếu). "$solid" là màu đặc, không phải file nên
       bỏ qua; nhiều bitmap cùng 1 file thì ghi 1 lần. */
    (function () {
      var seenFile = {};
      var bids = Object.keys(bitmaps);
      for (var i = 0; i < bids.length; i++) {
        var bf2 = bitmaps[bids[i]].file;
        if (!bf2 || bf2.charAt(0) === "$" || seenFile[bf2]) continue;
        seenFile[bf2] = true;
        if (!findPath(bf2)) pushMissing("ảnh: " + bf2 + " (bitmap " + bids[i] + ")");
      }
    })();
    var groupdefs = {}, groupdefEls = {}, xuiMap = {};
    for (di = 0; di < docs.length; di++) {
      var glist = elList(docs[di].doc, "groupdef");
      for (var g = 0; g < glist.length; g++) {
        var gid = glist[g].getAttribute("id");
        if (gid && !groupdefs[gid]) {
          groupdefs[gid] = elChildren(glist[g]);
          groupdefEls[gid] = glist[g];
          var xu = glist[g].getAttribute("xuitag");
          if (xu) xuiMap[xu.toLowerCase()] = gid;
        }
      }
    }
    /* ĐỢT C (9.9) — containers: gom mọi <container> trong model (khóa
       không phân biệt hoa/thường, first-wins). default_x/default_y là vị
       trí mặc định trên desktop Winamp; Amp xếp chồng dọc trên điện thoại
       360px (quyết 3/11) nên KHÔNG áp chúng làm vị trí tuyệt đối — chỉ
       ghi lại vào RES.containers để dùng sau (chế độ cửa sổ rời) và để
       layout thiếu w/h thì lấy default_w/default_h của container.
       default_h của main 566 là 164 = chiều cao cửa sổ ĐÓNG, không phải
       cao layout (280) — chỉ dùng khi layout không có w/h. */
    var containers = {};
    for (di = 0; di < docs.length; di++) {
      var cnlist = elList(docs[di].doc, "container");
      for (var cn = 0; cn < cnlist.length; cn++) {
        var cid0 = cnlist[cn].getAttribute("id") || "";
        if (!cid0) continue;
        var ckey = lowerId(cid0);
        if (containers[ckey]) continue;
        containers[ckey] = {
          id: cid0,
          name: cnlist[cn].getAttribute("name") || "",
          default_x: intAttr(cnlist[cn], "default_x", 0),
          default_y: intAttr(cnlist[cn], "default_y", 0),
          default_w: cnlist[cn].getAttribute("default_w") !== null ? intAttr(cnlist[cn], "default_w", 0) : null,
          default_h: cnlist[cn].getAttribute("default_h") !== null ? intAttr(cnlist[cn], "default_h", 0) : null,
          default_visible: cnlist[cn].getAttribute("default_visible")
        };
      }
    }
    /* Layout khóa theo (container, id); container suy từ đồ thị include. */
    function containerForFile(path) {
      var target = path.toLowerCase();
      var cids = Object.keys(containerDirect);
      for (var i = 0; i < cids.length; i++) {
        var seen2 = {}, q = containerDirect[cids[i]].slice();
        while (q.length) {
          var cur2 = q.shift(), low = cur2.toLowerCase();
          if (low === target) return cids[i];
          if (seen2[low]) continue;
          seen2[low] = true;
          var nxts = includesByFile[low] || [];
          for (var j = 0; j < nxts.length; j++) q.push(nxts[j]);
        }
      }
      return "";
    }
    /* Layout nằm TRỰC TIẾP trong <container> thì container là tổ tiên
       gần nhất (nhiều skin gom nhiều container vào 1 file, hoặc
       <container><layout> inline). Trước đây chỉ có đồ thị include +
       fallback dc[0] (container ĐẦU TIÊN trong file) nên mọi layout
       trong file nhiều container đều bị gán nhầm về container đầu, layout
       sau trùng khóa thì mất hẳn. */
    function containerAncestor(layEl) {
      var p = layEl ? layEl.parentNode : null;
      while (p) {
        if (p.nodeType === 1 && lowerTag(p) === "container") return p.getAttribute("id") || "";
        p = p.parentNode;
      }
      return "";
    }
    /* frameOffsetY: chiều cao titlebar của frame (18px với skin Modern).
       frameOffsetY CHỈ là độ lùi vị trí (nội dung bắt đầu ở y=18, dưới
       titlebar), KHÔNG phải chiều cao bị trừ khỏi nội dung:
       contentH = layoutH (đầy đủ). Công thức cũ contentH = layoutH - 18
       SAI — đo từ Winamp thật (GIF + WACUP PNG, 3/11/2026): main phải ở
       y=35 (display đáy 101, seek 114, nút prev 141 — đều thấp hơn Amp
       đúng 18px). Nhóm content (player.content.group) không có thuộc tính
       h nên cao bằng frame (280); nhóm dummy (relath=1, h=0) cao 280, và
       main/ngăn kéo neo đáy y=-263 relaty=1 mới rơi đúng y=17 trong
       content (17+18=35 trong layout). Trừ 18 làm dummy cao 262, main
       lệch lên y=17, display đè lên menubar 15px, nút Repeat bị cụm video
       che, nút ngăn kéo lệch khỏi lỗ trong main.png/main2.png.
       Dùng 18 khi layout chứa phần tử frame XUI
       (MainFrame/NoStatus/TitleBar), không thì 0. */
    function frameOffsetFor(layEl) {
      var all = layEl.getElementsByTagName("*");
      for (var i = 0; i < all.length; i++) {
        var t = (all[i].tagName || "").toLowerCase();
        if (t.indexOf("mainframe") >= 0 || t === "nostatus" || t === "titlebar") return 18;
      }
      return 0;
    }
    /* v10.12 (P0 B): bao nội dung của layout — mép phải/dưới lớn nhất của
       các phần tử con có tọa độ + cỡ tuyệt đối (không relat), kể cả
       <group> (lấy w/h từ groupdef của nó). Chỉ dùng khi layout thiếu
       cả w/h XML, default container lẫn ảnh nền — bước cuối trước 354×280. */
    function contentBoxSize(layEl) {
      var maxR = 0, maxB = 0;
      var all = layEl.getElementsByTagName("*");
      for (var i = 0; i < all.length; i++) {
        var e = all[i];
        var xs = e.getAttribute("x"), ys = e.getAttribute("y");
        if (xs === null || ys === null) continue;
        if (e.getAttribute("relatx") || e.getAttribute("relaty")) continue;
        var xi = parseInt(xs, 10), yi = parseInt(ys, 10);
        if (isNaN(xi) || isNaN(yi)) continue;
        var wi = 0, hi = 0;
        if (e.getAttribute("w") !== null && e.getAttribute("h") !== null
          && !e.getAttribute("relatw") && !e.getAttribute("relath")) {
          wi = parseInt(e.getAttribute("w"), 10); hi = parseInt(e.getAttribute("h"), 10);
        } else if (lowerTag(e) === "group") {
          var gd = groupdefEls[e.getAttribute("id") || ""];
          if (gd && !e.getAttribute("relatw") && !e.getAttribute("relath")) {
            wi = intAttr(gd, "w", 0); hi = intAttr(gd, "h", 0);
          }
        }
        if (isNaN(wi) || isNaN(hi) || wi <= 0 || hi <= 0) continue;
        if (xi + wi > maxR) maxR = xi + wi;
        if (yi + hi > maxB) maxB = yi + hi;
      }
      return (maxR > 0 && maxB > 0) ? { w: maxR, h: maxB } : null;
    }
    var layouts = {}, layoutList = [], layoutOrder = 0;
    /* Tra layout không phân biệt hoa/thường (Winamp không phân biệt
       hoa/thường ở id; skin ghi Main/Normal thì tra main/normal vẫn
       thấy). Trả entry hoặc null; KHÔNG fallback trần sang container
       khác (xem renderer.resolveLayout). */
    function findLayout(container, layoutId) {
      var k = lowerId(container) + "|" + lowerId(layoutId);
      return layouts[k] || null;
    }
    for (di = 0; di < docs.length; di++) {
      var llist = elList(docs[di].doc, "layout");
      for (var l = 0; l < llist.length; l++) {
        var lid = llist[l].getAttribute("id") || "";
        if (!lid) continue;
        /* Thứ tự xác định container: (1) tổ tiên <container> trong cùng
           file; (2) đồ thị include; (3) file chỉ có ĐÚNG 1 container.
           KHÔNG đoán dc[0] khi file có nhiều container (lỗi S6). */
        var container = containerAncestor(llist[l]) || containerForFile(docs[di].path);
        if (!container) {
          var dc = elList(docs[di].doc, "container");
          if (dc.length === 1) container = dc[0].getAttribute("id") || "";
        }
        var key = lowerId(container) + "|" + lowerId(lid);
        var origKey = container + "|" + lid;
        if (!layouts[key]) {
          /* w/h: thuộc tính layout trước; thiếu thì default_w/default_h
             của container; thiếu nữa thì ĐO TỪ ẢNH NỀN (background — v10.12,
             P0 B) rồi mới tới bao nội dung, cuối cùng mới 354×280. Trước
             đây thiếu w/h là về thẳng 354×280 nên skin 433×225 (D-Reliction)
             hay 173×123 (Act3) đều vẽ sai cỡ (probe 11:35). */
          var contInfo = container ? containers[lowerId(container)] : null;
          var hasW = llist[l].getAttribute("w") !== null;
          var hasH = llist[l].getAttribute("h") !== null;
          var LW = hasW ? intAttr(llist[l], "w", 354)
            : (contInfo && contInfo.default_w ? contInfo.default_w : 354);
          var LH = hasH ? intAttr(llist[l], "h", 280)
            : (contInfo && contInfo.default_h ? contInfo.default_h : 280);
          var wFallback = !hasW && !(contInfo && contInfo.default_w);
          var hFallback = !hasH && !(contInfo && contInfo.default_h);
          var foY = frameOffsetFor(llist[l]);
          var entry = {
            el: llist[l], container: container, layoutId: lid,
            key: key, order: layoutOrder++,
            w: LW, h: LH,
            /* v10.12 (P0 A): nền của layout — thuộc tính background (dùng
               khi không có alpha desktop) + alphabackground (khi có alpha).
               Loader trước đây bỏ qua nên 4 skin (WMP12, EMP, CROSSNET,
               DreddfulAmp) vẽ cửa sổ đen. Giá trị là id bitmap hoặc đường
               dẫn file trực tiếp (vd "player/background.png"). */
            background: llist[l].getAttribute("background") || null,
            alphabackground: llist[l].getAttribute("alphabackground") || null,
            wFallback: wFallback, hFallback: hFallback,
            /* Giới hạn co giãn của layout, đọc từ XML (không gán cứng số
               của skin 566). Skin 566: main|normal min 354×280 (= đúng
               w/h → cố định, như Winamp thật: cửa sổ chính không kéo
               được); Pledit min 354×164 (w 436 → kéo rộng được, cao
               ≥164); MLibrary min 354×164 (790×349 → kéo được cả 2
               chiều); Video min 354×164 (354×280 → kéo cao được). Không
               có maximum_* trong XML 566 → null (renderer tự kẹp theo
               giới hạn chung). */
            minW: intAttr(llist[l], "minimum_w", 0) || null,
            minH: intAttr(llist[l], "minimum_h", 0) || null,
            maxW: intAttr(llist[l], "maximum_w", 0) || null,
            maxH: intAttr(llist[l], "maximum_h", 0) || null,
            snapadjustbottom: intAttr(llist[l], "snapadjustbottom", 0),
            frameOffsetY: foY,
            /* contentH = layoutH (đầy đủ — xem ghi chú frameOffsetFor):
               nhóm content không có h nên cao bằng frame; 18px chỉ lùi
               vị trí top, không trừ chiều cao. */
            contentH: LH,
            drawerRestY: 0 /* điền ở dưới, từ instance ngăn kéo trong model */
          };
          /* Ghi 2 khóa cùng trỏ 1 entry: khóa thường (không phân biệt
             hoa/thường) + khóa đúng chữ trong XML (tương thích code/test
             cũ tra "MLibrary|normal"). KHÔNG còn alias trần layouts[lid]:
             alias đó từng làm renderLayout("main","normal") vẽ nhầm layout
             của container khác (vd Pledit 436×164) khi main thiếu layout,
             và làm renderStacked vẽ main 2 lần. */
          layouts[key] = entry;
          if (origKey !== key) layouts[origKey] = entry;
          layoutList.push(entry);
          /* v10.12 (P0 B): layout thiếu w/h thì đo từ ảnh nền rồi bao nội
             dung. Thứ tự: XML → default container → ảnh nền → bao nội
             dung → 354×280. Đo bằng imgSize (header PNG, chạy cả jsdom). */
          if (entry.wFallback || entry.hFallback) {
            var bgSize = null;
            var bgRef0 = entry.background || entry.alphabackground;
            if (bgRef0) {
              var bgFile0 = bitmaps[bgRef0] ? bitmaps[bgRef0].file : (findPath(bgRef0) ? bgRef0 : null);
              if (bgFile0 && bgFile0.charAt(0) !== "$") {
                try { bgSize = await imgSize(bgFile0); } catch (e) { bgSize = null; }
              }
            }
            if (entry.wFallback && bgSize && bgSize.w > 0) { entry.w = bgSize.w; entry.wFallback = false; }
            if (entry.hFallback && bgSize && bgSize.h > 0) { entry.h = bgSize.h; entry.hFallback = false; }
            if (entry.wFallback || entry.hFallback) {
              var cbox = contentBoxSize(llist[l]);
              if (cbox) {
                if (entry.wFallback && cbox.w > 0) { entry.w = cbox.w; entry.wFallback = false; }
                if (entry.hFallback && cbox.h > 0) { entry.h = cbox.h; entry.hFallback = false; }
              }
            }
            entry.contentH = entry.h;
          }
        }
      }
    }
    /* v10.12 (P1 H): container Pledit không có layout nhưng có groupdef
       pledit.content.group chứa <component> playlist (Act3) — dựng cửa sổ
       playlist mặc định 436×164 (cỡ pledit của skin 566) với ruột playlist
       của Amp, thay vì bỏ qua playlist khi xếp chồng. Khung + ruột vẽ
       theo đúng model: layout tổng hợp chỉ trỏ tới groupdef có sẵn. */
    if (!layouts["pledit|normal"] && groupdefs["pledit.content.group"]) {
      try {
        var plDoc = parseXmlText('<layout id="normal"><group id="pledit.content.group" x="0" y="0" w="436" h="164"/></layout>', "pledit-synthesized", DOMParserImpl);
        var plEntry = {
          el: plDoc.documentElement, container: "Pledit", layoutId: "normal",
          key: "pledit|normal", order: layoutOrder++,
          w: 436, h: 164, background: null, alphabackground: null,
          wFallback: false, hFallback: false,
          minW: null, minH: null, maxW: null, maxH: null,
          snapadjustbottom: 0, frameOffsetY: 0, contentH: 164, drawerRestY: 0,
          synthesizedPledit: true
        };
        layouts["pledit|normal"] = plEntry;
        layouts["Pledit|normal"] = plEntry;
        layoutList.push(plEntry);
        report.notes.push("không có layout Pledit — dựng cửa sổ playlist mặc định 436×164 từ pledit.content.group (khung chuẩn + ruột playlist của Amp)");
      } catch (e) { /* không dựng được thì giữ hành vi cũ: bỏ qua playlist */ }
    }
    /* v10.12 (P1 E): groupdef bị tham chiếu mà thiếu trong skin — groupdef
       chuẩn của Winamp (wasabi.*) thì tự cấp rỗng (Winamp gốc cũng có sẵn
       chúng, skin không cần định nghĩa); groupdef lạ thì ghi vào
       report.missing/notes thay vì vẽ trống im lặng. */
    (function () {
      var STD_WASABI_EMPTY = { "wasabi.window.embedded": 1, "wasabi.panel": 1, "wasabi.objectframe.group": 1, "wasabi.titlebar": 1 };
      var missingGd = [];
      var missingGdSeen = {};
      function scanGroupRefs(els) {
        for (var i = 0; i < (els || []).length; i++) {
          var el = els[i];
          if (lowerTag(el) === "group") {
            var gid = el.getAttribute("id") || "";
            if (gid && !groupdefs[gid] && !xuiMap[gid.toLowerCase()] && !missingGdSeen[gid.toLowerCase()]) {
              missingGdSeen[gid.toLowerCase()] = true;
              missingGd.push(gid);
            }
          }
          scanGroupRefs(elChildren(el));
        }
      }
      var gdKeys = Object.keys(groupdefs);
      for (var gi = 0; gi < gdKeys.length; gi++) scanGroupRefs(groupdefs[gdKeys[gi]]);
      for (var li2 = 0; li2 < layoutList.length; li2++) scanGroupRefs([layoutList[li2].el]);
      for (var mi = 0; mi < missingGd.length; mi++) {
        var mg = missingGd[mi];
        if (STD_WASABI_EMPTY[mg.toLowerCase()]) {
          groupdefs[mg] = [];
          groupdefEls[mg] = null;
          report.notes.push("tự cấp groupdef rỗng (chuẩn Winamp, skin không định nghĩa): " + mg);
        } else {
          pushMissing("groupdef: " + mg);
          report.notes.push("groupdef thiếu trong skin — bỏ qua (không vẽ): " + mg);
        }
      }
    })();
    if (classicPro) {
      report.notes.push("skin ClassicPro: giao diện nằm trong engine ClassicPro (Plugins/classicPro/engine) ngoài file .wal — Amp không vẽ được, cần engine ClassicPro");
    }
    /* Layout đầu tiên (theo thứ tự XML) trong 1 container, dùng cho
       fallback cùng container (ngăn kéo/AVS nhúng suy từ layout main
       khi main chỉ có layout khác 'normal', vd chỉ có 'shade'). */
    function firstLayoutInContainer(container) {
      var lc = lowerId(container), best = null;
      for (var fi = 0; fi < layoutList.length; fi++) {
        if (lowerId(layoutList[fi].container) === lc) { best = layoutList[fi]; break; }
      }
      return best;
    }
    function findMainLayout() {
      return findLayout("main", "normal") || firstLayoutInContainer("main");
    }
    /* drawerRestY: vị trí nghỉ của ngăn kéo trong hệ layout.
       Instance <group id="player.normal.drawer" y="-263" relaty="1"> nằm
       trong player.content.dummy.group (nội dung frame, cao contentH=280):
       restY = contentH + y = 280 - 263 = 17 trong hệ content; cộng
       frameOffsetY (18) ra hệ layout: 17 + 18 = 35. Ngăn kéo nghỉ ở y=35,
       cùng đỉnh với main (cũng neo -263), đáy 164 = chiều cao cửa sổ đóng
       (container default_h=164) — khớp Winamp thật. */
    var drawerInfo = null;
    (function computeDrawer() {
      var gids = Object.keys(groupdefs);
      for (var i = 0; i < gids.length; i++) {
        var kids = groupdefs[gids[i]];
        for (var j = 0; j < kids.length; j++) {
          if (lowerTag(kids[j]) !== "group") continue;
          if (kids[j].getAttribute("id") !== "player.normal.drawer") continue;
          var mainLay = findMainLayout();
          var cH = mainLay ? mainLay.contentH : 280;
          var y = intAttr(kids[j], "y", 0);
          var relat = kids[j].getAttribute("relaty");
          var restY = relat === "1" ? cH + y : y;
          /* restY tính trong hệ nội dung frame; cộng frameOffsetY ra hệ layout */
          restY = restY + (mainLay ? mainLay.frameOffsetY : 18);
          var drawerGd = groupdefEls["player.normal.drawer"];
          var contentGd = groupdefEls["player.normal.drawer.content"];
          var fullH = drawerGd ? intAttr(drawerGd, "h", 129) : 129;
          var contentW = contentGd ? intAttr(contentGd, "w", 326) : 326;
          /* Ngăn kéo w="0" relatw="1" → rộng bằng layout (354), không phải 0. */
          var drawerW = 354;
          if (drawerGd && drawerGd.getAttribute("w") !== null) {
            drawerW = drawerGd.getAttribute("relatw") === "1" ? 354 + intAttr(drawerGd, "w", 0) : intAttr(drawerGd, "w", 354);
          }
          var contentX = Math.round((drawerW - contentW) / 2); /* 14 với skin 566 */
          var tabsPos = null;
          if (contentGd) {
            var ckids = elChildren(contentGd);
            for (var k = 0; k < ckids.length; k++) {
              if (lowerTag(ckids[k]) === "group" && ckids[k].getAttribute("id") === "config.tabs") {
                tabsPos = { x: contentX + intAttr(ckids[k], "x", 0), y: intAttr(ckids[k], "y", 0) };
              }
            }
          }
          drawerInfo = {
            restY: restY, fullH: fullH, contentW: contentW, contentX: contentX,
            tabsPos: tabsPos,
            snapadjustbottom: mainLay ? mainLay.snapadjustbottom : 0
          };
          if (mainLay) mainLay.drawerRestY = restY;
          return;
        }
      }
    })();

    /* Kiểm kê XML + .maki (chỉ để xem/bảng kê, không dùng khi render). */
    var xmlFiles = [];
    for (di = 0; di < docs.length; di++) {
      var e = { path: docs[di].path, layouts: [], groupdefs: [], bitmaps: [], fonts: [], colors: [], gammas: [], gammasets: [], containers: [], includes: 0, scripts: [] };
      var ll2 = elList(docs[di].doc, "layout");
      for (var a = 0; a < ll2.length; a++) {
        var id2 = ll2[a].getAttribute("id") || "";
        if (id2) e.layouts.push({ id: id2, container: containerForFile(docs[di].path) });
      }
      var gd2 = elList(docs[di].doc, "groupdef");
      for (var b2 = 0; b2 < gd2.length; b2++) { var gid2 = gd2[b2].getAttribute("id"); if (gid2) e.groupdefs.push(gid2); }
      var bm2 = elList(docs[di].doc, "bitmap");
      for (var c2 = 0; c2 < bm2.length; c2++) { var bid2 = bm2[c2].getAttribute("id"); if (bid2) e.bitmaps.push(bid2); }
      var bf2 = elList(docs[di].doc, "bitmapfont");
      for (var d2 = 0; d2 < bf2.length; d2++) { var fid2 = bf2[d2].getAttribute("id"); if (fid2) e.fonts.push(fid2); }
      var cc2 = elList(docs[di].doc, "color");
      for (var e2 = 0; e2 < cc2.length; e2++) { var cid2 = cc2[e2].getAttribute("id"); if (cid2) e.colors.push(cid2); }
      var gs2 = elList(docs[di].doc, "gammaset");
      for (var f2 = 0; f2 < gs2.length; f2++) {
        var groups = [];
        var gkids = elChildren(gs2[f2]);
        for (var h2 = 0; h2 < gkids.length; h2++) {
          if (lowerTag(gkids[h2]) !== "gammagroup") continue;
          groups.push({ id: gkids[h2].getAttribute("id") || "", value: gkids[h2].getAttribute("value") || "", gray: gkids[h2].getAttribute("gray") || "", boost: gkids[h2].getAttribute("boost") || "" });
        }
        e.gammasets.push({ id: gs2[f2].getAttribute("id") || "", groups: groups });
      }
      e.gammas = e.gammasets.length ? e.gammasets[0].groups : [];
      var ct2 = elList(docs[di].doc, "container");
      for (var i2 = 0; i2 < ct2.length; i2++) { var coid = ct2[i2].getAttribute("id"); if (coid) e.containers.push(coid); }
      e.includes = elList(docs[di].doc, "include").length;
      var sc2 = elList(docs[di].doc, "script");
      for (var j2 = 0; j2 < sc2.length; j2++) { var sf = sc2[j2].getAttribute("file"); if (sf) e.scripts.push(sf); }
      if (e.layouts.length) e.kind = "layout";
      else if (e.groupdefs.length) e.kind = "groupdef";
      else if (e.bitmaps.length || e.fonts.length) e.kind = "elements";
      else if (e.colors.length) e.kind = "colors";
      else if (e.gammas.length) e.kind = "gamma";
      else e.kind = "container";
      xmlFiles.push(e);
    }
    var makiFiles = names.filter(function (n) { return n.toLowerCase().endsWith(".maki"); })
      .map(function (n) {
        var p = (rootPrefix && n.toLowerCase().indexOf(rootPrefix.toLowerCase()) === 0) ? n.slice(rootPrefix.length) : n;
        return { path: p, size: (zip.files[n] && zip.files[n].uncompressedSize) || 0 };
      })
      .sort(function (a, b) { return a.path < b.path ? -1 : a.path > b.path ? 1 : 0; });

    function resolveImageRef(ref) {
      if (!ref) return null;
      if (bitmaps[ref]) return bitmaps[ref].file;
      return findPath(ref) ? ref : null;
    }
    async function bitmapInfo(id) {
      var entry = bitmaps[id];
      if (entry) {
        if (entry.crop) return { file: entry.file, crop: entry.crop, w: entry.crop.w, h: entry.crop.h };
        var s = await imgSize(entry.file);
        return { file: entry.file, crop: null, w: s ? s.w : 0, h: s ? s.h : 0 };
      }
      if (id && findPath(id)) {
        var s2 = await imgSize(id);
        return { file: id, crop: null, w: s2 ? s2.w : 0, h: s2 ? s2.h : 0 };
      }
      return null;
    }

    /* Gom gammasets ra top-level (tab Color Themes cần danh sách 44
       preset + từng gammagroup {id, value, gray, boost}). Nguồn duy nhất
       là color-presets.xml; first-wins theo id nếu nhiều file có
       gammaset trùng id. `gray`/`boost` chỉ ghi nhận, chưa áp (xem
       renderer.applyColorTheme: chỉ áp `value` theo công thức
       1+v/4096 kẹp [0.4,1.6]). */
    var gammasets = [], gammasetSeen = {};
    for (var xf = 0; xf < xmlFiles.length; xf++) {
      for (var xg = 0; xg < xmlFiles[xf].gammasets.length; xg++) {
        var gs = xmlFiles[xf].gammasets[xg];
        if (gs.id && !gammasetSeen[gs.id]) { gammasetSeen[gs.id] = true; gammasets.push(gs); }
      }
    }

    /* Suy embeddedAvs từ model lúc nạp (SPEC §2.2: model KHÔNG có cờ
       embeddedAvs, v9 tự suy). Skin Modern có vùng nhúng khi và chỉ khi:
       (a) có groupdef "AVSGroup", (b) tìm được instance của nó trong một
       groupdef khác (vị trí tuyệt đối = vị trí instance trong content +
       frameOffsetY), (c) bên trong AVSGroup có instance "video.group"
       (vùng vẽ thật). Cao AVS = snapadjustbottom (116 với skin 566) —
       KHÔNG có thuộc tính XML nào ghi trực tiếp 116 (số 116 duy nhất
       trong XML là snapadjustbottom của ngăn kéo; nhất quán với dải trên
       21 + video 69 + dải dưới 26 = 116). Skin không thỏa (vd Classic
       .wsz) → null, renderer đi cửa sổ rời. Kết quả với
       winampmodern566.wal: {x:0, y:35, w:354, h:116,
       videoRect:{x:4, y:21, w:346, h:69}}. */
    function resolveRelPos(el, attr, parent) {
      var v = intAttr(el, attr, 0);
      var r = el.getAttribute("relat" + attr);
      if (r === "1") return parent + v;
      if (r === "2") return Math.round(parent * v / 100);
      return v;
    }
    function extractEmbeddedAvs() {
      var gd = groupdefEls["AVSGroup"];
      if (!gd) return null;
      var mainLay = findMainLayout();
      var layW = mainLay ? mainLay.w : 354;
      var contentH = mainLay ? mainLay.contentH : 280;
      var frameOff = mainLay ? mainLay.frameOffsetY : 18;
      var inst = null;
      var gids = Object.keys(groupdefs);
      outer: for (var i = 0; i < gids.length; i++) {
        var kids = groupdefs[gids[i]];
        for (var j = 0; j < kids.length; j++) {
          if (lowerTag(kids[j]) === "group" && kids[j].getAttribute("id") === "AVSGroup") { inst = kids[j]; break outer; }
        }
      }
      if (!inst) return null;
      var h = (mainLay && mainLay.snapadjustbottom > 0) ? mainLay.snapadjustbottom : 116;
      var avsX = resolveRelPos(inst, "x", layW);
      var avsY = resolveRelPos(inst, "y", contentH) + frameOff;
      var vg = null;
      var avsKids = groupdefs["AVSGroup"] || [];
      for (var k = 0; k < avsKids.length; k++) {
        if (lowerTag(avsKids[k]) === "group" && avsKids[k].getAttribute("id") === "video.group") { vg = avsKids[k]; break; }
      }
      if (!vg) return null;
      var vr = {
        x: resolveRelPos(vg, "x", layW),
        y: resolveRelPos(vg, "y", h),
        w: resolveRelPos(vg, "w", layW),
        h: resolveRelPos(vg, "h", h)
      };
      if (!(layW > 0 && h > 0 && vr.w > 0 && vr.h > 0)) return null;
      return { x: avsX, y: avsY, w: layW, h: h, videoRect: vr, background: gd.getAttribute("background") || null };
    }
    var embeddedAvs = extractEmbeddedAvs();

    var resolve = {
      version: LOADER_VERSION, fromCache: false, kind: "modern",
      bitmaps: bitmaps, fonts: fonts, colors: colors,
      groupdefs: groupdefs, groupdefEls: groupdefEls, xuiMap: xuiMap,
      layouts: layouts, layoutList: layoutList, containers: containers,
      findLayout: findLayout, firstLayoutInContainer: firstLayoutInContainer,
      xmlFiles: xmlFiles, makiFiles: makiFiles,
      gammasets: gammasets, gammas: gammasets.length ? gammasets[0].groups : [],
      drawer: drawerInfo,
      embeddedAvs: embeddedAvs,
      classicPro: classicPro, /* v10.12 (P2 G): true khi giao diện nằm trong engine ClassicPro ngoài .wal */
      fileURL: fileURL, imgSize: imgSize, resolveImageRef: resolveImageRef,
      bitmapInfo: bitmapInfo, report: report, zip: zip, findPath: findPath,
      screenshotFile: findPath("screenshot.png")
    };
    return { skin: info, layouts: layouts, resolve: resolve, report: report, version: LOADER_VERSION, fromCache: false };
  }

  return {
    LOADER_VERSION: LOADER_VERSION,
    EXPECTED_LOADER_VERSION: EXPECTED_LOADER_VERSION,
    MANIFEST_VERSION: MANIFEST_VERSION,
    MANIFEST_MISMATCH: MANIFEST_MISMATCH,
    skinCacheKey: skinCacheKey,
    cleanXml: cleanXml, parseXmlText: parseXmlText,
    elChildren: elChildren, elList: elList, intAttr: intAttr,
    normPath: normPath, dirOf: dirOf, pngSizeFromBytes: pngSizeFromBytes,
    loadSkinFile: loadSkinFile
  };
});
