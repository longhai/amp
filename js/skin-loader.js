/* =====================================================================
   Amp v9 — skin-loader.js: loader skin Winamp Modern (.wal/.zip) theo
   SPEC-skin-sim §1. Chỉ giữ các công thức đã chứng minh đúng — NGOẠI TRỪ
   contentH (xem ghi chú ở frameOffsetFor): công thức cũ
   contentH = layoutH - frameOffsetY SAI (đo lại từ Winamp thật:
   display/seek/playbuttons đều thấp hơn Amp đúng 18px; main phải ở
   y=35, đáy 161, cửa sổ đóng cao 164 — không phải y=17/143/156).
   Version: LOADER_VERSION = "1". MỖI LẦN ĐỔI LOADER PHẢI BUMP VERSION,
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

  var LOADER_VERSION = "1";
  var EXPECTED_LOADER_VERSION = "1";
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
     cache thì dùng đúng khóa này, không tự bịa khóa mới thiếu 1 version.
     AUDIT N11: export này CỐ Ý GIỮ (khóa cache IndexedDB tương lai) —
     không phải dead code cần xóa. */
  function skinCacheKey(name) { return name + "|loader" + LOADER_VERSION + "|render" + (MANIFEST_VERSION || LOADER_VERSION); }

  /* ---------------- helpers ---------------- */
  function cleanXml(text) {
    var t = String(text);
    t = t.replace(/<\?xml[^?]*\?>/gi, "").replace(/<!DOCTYPE[^>]*>/gi, "");
    t = t.replace(/\s+xmlns(?::[A-Za-z_][\w.-]*)?="[^"]*"/g, "");
    /* AUDIT R7-1 (vừa): regex XUI phải chạy TRƯỚC regex lột namespace
       (v10.12/P1 D) — trước đây lột namespace chạy trước nên lúc regex XUI
       chạy thì không còn tag nào có ":" nữa, data-xui không bao giờ được
       ghi; <Wasabi:StandardFrame:Status> thành <status> trần (mất khung
       cửa sổ playlist/video) và <ColorThemes:List> thành <list> trần
       (vẽ nhầm playlist trống đè khung). Regex XUI đã tự trả về tag trần
       + data-xui nên bước lột sau đó thành no-op với các tag này. */
    t = t.replace(/<(\/?)((?:[A-Za-z_][\w.-]*:)+)([A-Za-z_][\w.-]*)/g, function (m, slash, prefixes, name) {
      if (slash) return "</" + name;
      return "<" + name + ' data-xui="' + (prefixes + name).toLowerCase() + '"';
    });
    t = t.replace(/<(\/?)(?:[A-Za-z_][\w.-]*:)+([A-Za-z_][\w.-]*)/g, "<$1$2");
    t = t.replace(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)/g, "&amp;");
    /* Winamp không phân biệt hoa/thường ở tên thuộc tính, DOMParser thì có:
       vài nút ghi Image="..." nên getAttribute("image") không thấy. */
    /* AUDIT R7-13 (nhẹ): hạ tên thuộc tính CHỈ khi đang ở vị trí tên thuộc
       tính — áp regex từng tag, và trong mỗi tag chỉ áp cho đoạn ngoài
       dấu nháy (giá trị thuộc tính giữ nguyên chữ hoa/thường: trước đây
       regex toàn chuỗi viết lại cả `ID=` trong `text="hello ID=42"`).
       R7-1: data-xui đã ghi ở trên nằm trong dấu nháy nên được giữ nguyên.
       AUDIT R6-9: Winamp không phân biệt hoa/thường ở tên tag/thuộc tính,
       DOMParser thì có — skin viết <Bitmap File="..."/> / <Layout> trước
       đây bị elList/getAttribute bỏ sót trong im lặng. Hạ toàn bộ tên tag
       về chữ thường + hạ tên thuộc tính mà loader đọc (danh sách dưới)
       về chữ thường; giá trị thuộc tính giữ nguyên. KHÔNG hạ các thuộc
       tính camelCase mà renderer đọc theo đúng case đó
       (downImage/hoverImage/activeImage/downThumb...) nên chúng không có
       trong danh sách này. */
    /* AUDIT R8-2 (nhẹ, sửa R7-13 chưa trọn): tách tag bằng regex <[^>]*>
       dừng ở dấu > ĐẦU TIÊN kể cả khi nó nằm trong giá trị thuộc tính
       ("A > B") nên phần còn lại của tag không bao giờ được hạ chữ.
       Nay quét ký tự, chỉ coi > là cuối tag khi đang ngoài dấu nháy;
       mỗi tag tách được mới qua bước hạ tên tag/thuộc tính như cũ. */
    var _lowerTagAttrs = function (tag) {
      tag = tag.replace(/^<(\/?)([A-Za-z_][\w.:-]*)/, function (m, slash, name) { return "<" + slash + name.toLowerCase(); });
      /* Hạ tên thuộc tính ngoài dấu nháy: cắt tag thành các đoạn ngoài/
         trong nháy — đoạn ngoài nháy mới áp regex, đoạn trong nháy
         (giá trị thuộc tính) nối nguyên xi, không qua regex. */
      var out = "", cur = "", quote = null;
      function flushPlain() {
        if (!cur) return;
        out += cur
          .replace(/(\s)(?:[A-Za-z_][\w.-]*:)+([A-Za-z_][\w.-]*)=/g, "$1$2=")
          .replace(/(\s)Image=/g, "$1image=")
          .replace(/(\s)(file|id|x|y|w|h|relatx|relaty|relatw|relath|gammagroup|version|name|value|charwidth|charheight|hspacing|vspacing|default_x|default_y|default_w|default_h|default_visible|minimum_w|minimum_h|maximum_w|maximum_h|snapadjustbottom|background|alphabackground|xuitag|image)=/gi, function (m, sp, attr) { return sp + attr.toLowerCase() + "="; });
        cur = "";
      }
      for (var i = 0; i < tag.length; i++) {
        var ch = tag[i];
        if (quote) {
          cur += ch;
          if (ch === quote) { out += cur; cur = ""; quote = null; }
        }
        else if (ch === '"' || ch === "'") { flushPlain(); quote = ch; cur = ch; }
        else cur += ch;
      }
      flushPlain();
      return out;
    };
    var _ct = "", _ci = 0;
    while (_ci < t.length) {
      var _lt = t.indexOf("<", _ci);
      if (_lt < 0) { _ct += t.slice(_ci); break; }
      _ct += t.slice(_ci, _lt);
      var _cj = _lt + 1, _cq = null;
      while (_cj < t.length) {
        var _cch = t[_cj];
        if (_cq) { if (_cch === _cq) _cq = null; }
        else if (_cch === '"' || _cch === "'") _cq = _cch;
        else if (_cch === ">") break;
        _cj++;
      }
      if (_cj >= t.length) { _ct += t.slice(_lt); break; } /* tag không đóng — giữ nguyên phần còn lại */
      _ct += _lowerTagAttrs(t.slice(_lt, _cj + 1));
      _ci = _cj + 1;
    }
    t = _ct;
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
    /* AUDIT R6-9 (sửa vòng 6, đợt 2): trước đây parse TRẦN trước, chỉ
       cleanXml khi parse trần lỗi — XML viết hoa mà vẫn well-formed thì
       parse trần thành công nên cleanXml không bao giờ chạy, <Layout> /
       <Bitmap File=> vẫn bị bỏ sót trong im lặng. Nay parse bản đã
       clean TRƯỚC (cleanXml giữ nguyên giá trị thuộc tính, chỉ hạ tên
       tag + tên thuộc tính loader đọc), parse trần chỉ còn là fallback. */
    var doc = tryParse(cleanXml(text));
    if (doc) return doc;
    doc = tryParse(text);
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
  /* AUDIT N18: include "../" chỉ đi trong cùng file zip — normPath gộp
     ".." bằng pop() trên mảng rỗng là no-op nên không thoát được gốc zip,
     chỉ đọc (không ghi đĩa, không eval) nên không phải zip-slip hệ thống.
     CỐ Ý GIỮ hành vi này (skin trong thư mục con include file ở gốc zip
     là hợp lệ), chỉ ghi chú để khỏi nhầm. */
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
    /* AUDIT R6-1: giới hạn kích thước — skin độc (1 entry BMP 1–2 GB nén
       tốt nên file zip chỉ vài MB, hoặc skin.xml hàng trăm MB) làm OOM
       tab trước khi có lỗi. Skin thật lớn nhất ~1 MB nên ngưỡng rất rẻ:
       file >64 MB, entry >32 MB, skin.xml >8 MB thì từ chối rõ ràng
       TRƯỚC khi đọc (dùng file.size / uncompressedSize trong central
       directory, không đọc hết rồi mới đo). */
    var MAX_SKIN_FILE_BYTES = 64 * 1024 * 1024;
    var MAX_ZIP_ENTRY_BYTES = 32 * 1024 * 1024;
    var MAX_SKIN_XML_BYTES = 8 * 1024 * 1024;
    var _fileSize = null;
    if (file) {
      if (typeof file.size === "number") _fileSize = file.size;
      else if (typeof file.byteLength === "number") _fileSize = file.byteLength;
      else if (typeof file.length === "number") _fileSize = file.length;
    }
    if (_fileSize != null && _fileSize > MAX_SKIN_FILE_BYTES) {
      throw new Error("file skin quá lớn (" + Math.round(_fileSize / 1048576) + " MB) — tối đa 64 MB, không nạp");
    }
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
    /* AUDIT R7-2 (vừa): kích thước thật của entry nằm ở
       `zip.files[n]._data.uncompressedSize` — JSZip 3.10.x KHÔNG đặt
       `uncompressedSize` trực tiếp trên JSZipObject nên đọc
       `_f.uncompressedSize` luôn ra undefined và không entry nào bao giờ
       bị chặn. Đọc `_data` trước, fallback thuộc tính trực tiếp cho
       JSZip giả/stub trong test. */
    function zipEntrySize(f) {
      if (!f) return -1;
      var d = f._data;
      if (d && typeof d.uncompressedSize === "number") return d.uncompressedSize;
      if (typeof f.uncompressedSize === "number") return f.uncompressedSize;
      return -1;
    }
    /* AUDIT R7-15 (nhẹ): chặn zip có quá nhiều entry — zip 64 MB chứa
       ~500k entry tí hon vẫn bắt loadAsync + pathMap + vòng chặn quét
       hết, chậm rõ trên điện thoại; skin thật không quá vài trăm entry. */
    var MAX_ZIP_ENTRIES = 5000;
    if (Object.keys(zip.files).length > MAX_ZIP_ENTRIES) {
      throw new Error("file skin có quá nhiều mục (" + Object.keys(zip.files).length + ") — tối đa " + MAX_ZIP_ENTRIES + ", không nạp");
    }
    /* AUDIT R6-1 (tiếp): chặn entry quá lớn theo uncompressedSize trong
       central directory — TRƯỚC mọi async() (đọc entry). */
    (function () {
      var _names = Object.keys(zip.files);
      for (var _i = 0; _i < _names.length; _i++) {
        var _f = zip.files[_names[_i]];
        if (!_f || _f.dir) continue;
        var _sz = zipEntrySize(_f);
        if (_sz < 0) continue;
        if (_names[_i].toLowerCase() === "skin.xml" || /\/skin\.xml$/i.test(_names[_i])) {
          if (_sz > MAX_SKIN_XML_BYTES) throw new Error("skin.xml quá lớn (" + Math.round(_sz / 1048576) + " MB) — tối đa 8 MB, không nạp");
        } else if (_sz > MAX_ZIP_ENTRY_BYTES) {
          throw new Error("file \"" + _names[_i] + "\" trong skin quá lớn (" + Math.round(_sz / 1048576) + " MB) — tối đa 32 MB cho mỗi file, không nạp");
        }
      }
    })();

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
         trong khi tên file trong zip dùng / — chuẩn hóa \ thành / trước khi tra.
         AUDIT N2: chấp nhận cả đường dẫn tuyệt đối trong zip (vd classic.js
         truyền tên file thật từ findFile) — bóc rootPrefix khỏi đầu chuỗi
         tra cứu nếu có, vì pathMap lưu khóa tương đối sau rootPrefix. */
      var q = String(p).replace(/\\/g, "/");
      if (rootPrefix && q.toLowerCase().indexOf(rootPrefix.toLowerCase()) === 0) q = q.slice(rootPrefix.length);
      return pathMap.get(q.toLowerCase()) || null;
    }
    async function readText(p) {
      var real = findPath(p);
      if (!real) return null;
      /* AUDIT V5: entry zip hỏng (CRC) làm async() reject — trước đây văng
         thẳng khỏi loadSkinFile, giết cả lần nạp skin. Nay trả null + ghi
         chú, đúng triết lý "include thiếu thì ghi chú, nạp tiếp". */
      try { return await zip.file(real).async("string"); }
      catch (e) { report.notes.push("không đọc được " + p + ": " + (e && e.message ? e.message : e)); return null; }
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
      /* AUDIT V5: như readText — entry hỏng thì trả null thay vì reject. */
      try { return await zip.file(real).async("arraybuffer"); }
      catch (e) { report.notes.push("không đọc được " + zipPath + ": " + (e && e.message ? e.message : e)); return null; }
    }
    /* AUDIT V1: thu hồi toàn bộ blob URL của lần nạp này (urlCache) —
       đổi skin thì Map cũ bị bỏ nhưng URL vẫn sống, giữ ArrayBuffer ảnh
       tới khi đóng tab. Chỉ gọi khi skin này KHÔNG còn vẽ nữa (skin mới
       đã vẽ xong, hoặc lần nạp này lỗi ngay từ loader — xem bootSkin). */
    function revokeSkinUrls() {
      if (typeof URL !== "undefined" && URL.revokeObjectURL) {
        urlCache.forEach(function (u) {
          if (u && u.indexOf("blob:") === 0) { try { URL.revokeObjectURL(u); } catch (e) { /* bỏ qua */ } }
        });
      }
      urlCache.clear();
    }
    async function fileURL(zipPath, abOpt) {
      if (!zipPath) return null;
      /* AUDIT N2: key cache theo đường dẫn THẬT đã findPath (lowercase) —
         trước đây fileURL("Player/Bg.png") và fileURL("player/bg.png")
         tạo 2 URL trùng nội dung. */
      var real = findPath(zipPath);
      if (!real) { urlCache.set(String(zipPath).toLowerCase(), null); return null; }
      var cacheKey = real.toLowerCase();
      if (urlCache.has(cacheKey)) return urlCache.get(cacheKey);
      /* AUDIT N1: nhận ArrayBuffer đã đọc sẵn (classic.js đọc 1 lần rồi
         truyền vào) thay vì đọc lại entry lần nữa qua blobFor. */
      var ab = (abOpt !== undefined && abOpt !== null) ? abOpt : await blobFor(real);
      if (!ab) { urlCache.set(cacheKey, null); return null; }
      var url = null;
      try {
        if (typeof Blob !== "undefined" && typeof URL !== "undefined" && URL.createObjectURL) {
          url = URL.createObjectURL(makeBlob(ab, real));
        }
      } catch (e) { url = null; }
      if (!url) url = "amp9://" + real; /* fallback cho môi trường test */
      urlCache.set(cacheKey, url);
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
            /* AUDIT V1: URL tạm này chỉ để đo kích thước — thu hồi ngay khi
               Image đã giải mã xong (onload/onerror/timeout), không giữ
               tham chiếu như trước đây. */
            var finish = function (v) {
              if (!done) {
                done = true; clearTimeout(timer);
                try { URL.revokeObjectURL(blobUrl); } catch (e) { /* bỏ qua */ }
                resolve(v);
              }
            };
            var timer = setTimeout(function () { finish(null); }, 1500);
            im.onload = function () { finish({ w: im.naturalWidth, h: im.naturalHeight }); };
            im.onerror = function () { finish(null); };
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
      /* AUDIT R7-4 (vừa): readText trả null cả khi file KHÔNG CÓ lẫn khi
         file CÓ nhưng đọc lỗi (CRC) — nhánh Classic chỉ được chạy khi
         skin.xml vắng mặt (.wsz thật). File có mà đọc lỗi thì throw rõ
         để bootSkin giữ skin cũ, thay vì thay skin tốt bằng render
         Classic rỗng/vỡ không banner lỗi. skin.xml rỗng (0 byte, chuỗi
         "" falsy) cũng rơi vào đây vì findPath thấy file. */
      if (findPath("skin.xml")) {
        var _badXmlErr = new Error("không đọc được skin.xml (file có trong skin nhưng đọc lỗi) — skin này không dùng được, vẫn giữ skin cũ");
        report.notes.push("không đọc được skin.xml — file có trong skin nhưng đọc lỗi, không rơi sang nhánh Classic");
        revokeSkinUrls();
        throw _badXmlErr;
      }
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
          var _ms = zipEntrySize(zip.files[n]);
          return { path: p, size: _ms < 0 ? 0 : _ms };
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
          /* AUDIT V4: lỗi parse Classic trước đây chỉ ghi note rồi trả
             resolve "classic" thành công với classicData = null — bootSkin
             coi là thành công và thay skin đang chạy tốt bằng resolve hỏng.
             Nay throw để bootSkin khôi phục skin cũ + báo lỗi rõ. Đường
             thiếu classic.js (classicLib null) thì giữ nguyên: classic=null,
             renderer về đường cửa sổ rời (xem classic-test.js mục E). */
          var classicErrMsg = "không đọc được skin Classic: " + (e && e.message ? e.message : e);
          report.notes.push(classicErrMsg);
          revokeSkinUrls();
          throw new Error(classicErrMsg + " — skin này không dùng được, vẫn giữ skin cũ");
        }
      } else {
        report.notes.push("classic.js chưa nạp — cửa sổ chính Classic chưa vẽ được (chỉ cửa sổ rời)");
      }
      /* AUDIT R7-5 (nhẹ): nhánh Classic không có kiểm tra nội dung —
         zip rỗng/không BMP vẫn "nạp thành công" (bất đối xứng với N17 ở
         nhánh Modern). Không có sheet BMP nào thì throw SKIN_UNSUPPORTED
         như N17, để bootSkin giữ skin cũ. Chỉ kiểm khi classic.js đã
         parse thật (classicData non-null); thiếu classic.js thì giữ
         đường cũ classic=null (xem classic-test.js mục E).
         AUDIT R8-3 (nhẹ, sửa R7-5 chưa trọn): kiểm cũ chỉ đếm key —
         sheet BMP hỏng header vẫn có key (size: null, url là blob rác)
         nên "nạp thành công" mà cửa sổ chính trống/đen. Nay đếm sheet
         DÙNG ĐƯỢC (size + url đều non-null); sheet hỏng ghi vào
         report.notes như bitmap thiếu. */
      var _usableSheets = 0, _brokenSheets = [];
      if (classicData && classicData.sheets) {
        Object.keys(classicData.sheets).forEach(function (_sk) {
          var _sh = classicData.sheets[_sk];
          if (_sh && _sh.size && _sh.url) _usableSheets++;
          else _brokenSheets.push(_sk);
        });
      }
      if (_brokenSheets.length) report.notes.push("Classic: sheet BMP hỏng/không đọc được: " + _brokenSheets.join(", "));
      if (classicData && _usableSheets === 0) {
        var _emptyClassicErr = new Error("skin Classic không có sheet BMP nào dùng được — skin này không dùng được, vẫn giữ skin cũ");
        _emptyClassicErr.code = "SKIN_UNSUPPORTED";
        report.notes.push("skin Classic không có sheet BMP nào dùng được");
        revokeSkinUrls();
        throw _emptyClassicErr;
      }
      var classicResolve = {
        version: LOADER_VERSION, fromCache: false, kind: "classic",
        bitmaps: {}, fonts: {}, colors: {},
        groupdefs: {}, groupdefEls: {}, xuiMap: {},
        /* AUDIT R8-5: Classic không có groupdef — tra cứu luôn trả rỗng
           để renderer dùng chung API với resolve Modern. */
        groupdefById: function () { return null; },
        groupdefElById: function () { return null; },
        hasGroupdef: function () { return false; },
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
          /* AUDIT V5: entry hỏng thì imgSize/blobFor trả null (đã bọc),
             không để rejection văng ra renderer. */
          var s = null;
          try { s = await imgSize(real); } catch (e) { s = null; }
          return { file: real, crop: null, w: s ? s.w : 0, h: s ? s.h : 0 };
        },
        revokeSkinUrls: revokeSkinUrls, /* AUDIT V1 */
        report: report, zip: zip, findPath: findPath,
        screenshotFile: null
      };
      return { skin: { name: opts.name || "", version: "" }, layouts: {}, resolve: classicResolve, report: report, version: LOADER_VERSION, fromCache: false, revokeSkinUrls: revokeSkinUrls };
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
    /* AUDIT V4: skin ClassicPro — giao diện nằm trong engine ClassicPro
       ngoài .wal, Amp không vẽ được. Trước đây chỉ ghi note, cờ classicPro
       không được kiểm tra trước khi render (renderer mới ném SKIN_UNSUPPORTED
       ở renderLayout, nhưng loader trả "thành công" làm bootSkin thay
       renderer/model trước khi lỗi lộ ra). Nay throw ngay từ loader, cùng
       mã SKIN_UNSUPPORTED, để bootSkin khôi phục skin cũ + báo lỗi rõ. */
    if (classicPro) {
      var cproErr = new Error("skin ClassicPro, cần engine ClassicPro — giao diện nằm trong engine ClassicPro (Plugins/classicPro/engine) ngoài file .wal, Amp không vẽ được");
      cproErr.code = "SKIN_UNSUPPORTED";
      report.notes.push("skin ClassicPro: giao diện nằm trong engine ClassicPro (Plugins/classicPro/engine) ngoài file .wal — Amp không vẽ được, cần engine ClassicPro");
      revokeSkinUrls();
      throw cproErr;
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
    /* AUDIT R7-9 (nhẹ): Winamp không phân biệt hoa/thường ở id groupdef —
       R6-9 chỉ sửa tên tag/tên thuộc tính, chưa sửa GIÁ TRỊ id. Skin viết
       `AVSGroup` thành `avsgroup` (hoặc `Pledit.Content.Group`) thì các
       tra cứu id cứng mất im lặng (ngăn kéo / vùng AVS nhúng / playlist
       tổng hợp). Chỉ mục tra cứu không phân biệt hoa/thường (first-wins,
       như `containers` đã dùng `lowerId`) cho mọi tra cứu id cứng dưới
       đây và cho `scanGroupRefs`. */
    var groupdefsByLower = {}, groupdefElsByLower = {};
    (function buildGroupdefIndex() {
      var _ks = Object.keys(groupdefs);
      for (var _i = 0; _i < _ks.length; _i++) {
        var _lk = lowerId(_ks[_i]);
        if (!(_lk in groupdefsByLower)) {
          groupdefsByLower[_lk] = groupdefs[_ks[_i]];
          groupdefElsByLower[_lk] = groupdefEls[_ks[_i]];
        }
      }
    })();
    function groupdefById(id) {
      var g = groupdefsByLower[lowerId(id)];
      return (g === undefined) ? null : g;
    }
    function groupdefElById(id) {
      var g = groupdefElsByLower[lowerId(id)];
      return (g === undefined) ? null : g;
    }
    function hasGroupdef(id) { return lowerId(id) in groupdefsByLower; }
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
      /* AUDIT V7: chỉ "1" (tương đối theo cha) và "2" (phần trăm) mới là
         tương đối — "0" là tuyệt đối tường minh. Trước đây chuỗi "0" là
         truthy nên phần tử relatx="0" bị loại khỏi bao nội dung, đo sai
         cỡ layout (giống resolveRelPos đã làm đúng). */
      function isRel(e, attr) { var v = e.getAttribute(attr); return v === "1" || v === "2"; }
      var all = layEl.getElementsByTagName("*");
      for (var i = 0; i < all.length; i++) {
        var e = all[i];
        var xs = e.getAttribute("x"), ys = e.getAttribute("y");
        if (xs === null || ys === null) continue;
        if (isRel(e, "relatx") || isRel(e, "relaty")) continue;
        var xi = parseInt(xs, 10), yi = parseInt(ys, 10);
        if (isNaN(xi) || isNaN(yi)) continue;
        var wi = 0, hi = 0;
        if (e.getAttribute("w") !== null && e.getAttribute("h") !== null
          && !isRel(e, "relatw") && !isRel(e, "relath")) {
          wi = parseInt(e.getAttribute("w"), 10); hi = parseInt(e.getAttribute("h"), 10);
        } else if (lowerTag(e) === "group") {
          var gd = groupdefElById(e.getAttribute("id") || "");
          if (gd && !isRel(e, "relatw") && !isRel(e, "relath")) {
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
    /* v10.21 (2) — skin không có layout Pledit nào (vd WMP12: playlist
       là PlaylistPro XUI trong main, không có container Pledit) thì
       dựng cửa sổ playlist mặc định 436×164 với 1 <list> (đường generic
       renderList vẽ hàng playlist của Amp) để vẫn có cửa sổ playlist +
       tay nắm kéo như mọi skin; không có minimum trong XML nên kẹp cỡ
       theo mặc định (min 200×100). CHỈ dựng khi skin CÓ nội dung
       playlist (groupdef chứa "playlist", vd PlaylistPro.xui của
       WMP12): skin tối thiểu không có gì về playlist (vd s1-size500.wal
       — test S1 chốt "thiếu Pledit thì bỏ qua playlist") thì KHÔNG
       dựng, giữ hành vi cũ. */
    var hasPlaylistContent21 = false;
    try {
      var gdKeys21 = Object.keys(groupdefs || {});
      for (var gi21 = 0; gi21 < gdKeys21.length; gi21++) {
        if (/playlist/i.test(gdKeys21[gi21])) { hasPlaylistContent21 = true; break; }
      }
    } catch (e21) { hasPlaylistContent21 = false; }
    /* v10.23 (2) — Skin trình phát đầy đủ (có container main + ít nhất
       1 container khác ngoài main: eq/notifier/thinger...) nhưng KHÔNG
       có layout Pledit nào và không có nội dung playlist nào (Braun:
       file xml/pledit*.xml mồ côi, skin.xml không include pledit.xml nên
       pledit.content.group không được nạp; DreddfulAmp: không có pledit
       gì cả). Vẫn dựng playlist mặc định để đổi sang skin nào playlist
       cũng có tay nắm kéo. Skin tối thiểu chỉ có mỗi main (vd
       s1-size500.wal — test S1 chốt "thiếu Pledit thì bỏ qua playlist")
       thì KHÔNG dựng, giữ hành vi cũ. */
    var hasMain22 = false, hasOtherContainer22 = false;
    try {
      var cKeys22 = Object.keys(containers || {});
      for (var ci22 = 0; ci22 < cKeys22.length; ci22++) {
        if (String(cKeys22[ci22]).toLowerCase() === "main") hasMain22 = true;
        else hasOtherContainer22 = true;
      }
    } catch (e22c) { hasMain22 = false; hasOtherContainer22 = false; }
    if (!layouts["pledit|normal"]) {
      if (groupdefById("pledit.content.group")) {
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
      } else if (hasPlaylistContent21) {
      try {
        var plDoc2 = parseXmlText('<layout id="normal"><list x="6" y="6" w="424" h="152"/></layout>', "pledit-synthesized-bare", DOMParserImpl);
        var plEntry2 = {
          el: plDoc2.documentElement, container: "Pledit", layoutId: "normal",
          key: "pledit|normal", order: layoutOrder++,
          w: 436, h: 164, background: null, alphabackground: null,
          wFallback: false, hFallback: false,
          minW: null, minH: null, maxW: null, maxH: null,
          snapadjustbottom: 0, frameOffsetY: 0, contentH: 164, drawerRestY: 0,
          synthesizedPledit: true
        };
        layouts["pledit|normal"] = plEntry2;
        layouts["Pledit|normal"] = plEntry2;
        layoutList.push(plEntry2);
        report.notes.push("không có layout Pledit — dựng cửa sổ playlist mặc định 436×164 với <list> (ruột playlist của Amp)");
      } catch (e2) { /* không dựng được thì giữ hành vi cũ: bỏ qua playlist */ }
      } else if (hasMain22 && hasOtherContainer22) {
      /* v10.23 (2): xem ghi chú ở hasMain22/hasOtherContainer22. */
      try {
        var plDoc3 = parseXmlText('<layout id="normal"><list x="6" y="6" w="424" h="152"/></layout>', "pledit-synthesized-bare22", DOMParserImpl);
        var plEntry3 = {
          el: plDoc3.documentElement, container: "Pledit", layoutId: "normal",
          key: "pledit|normal", order: layoutOrder++,
          w: 436, h: 164, background: null, alphabackground: null,
          wFallback: false, hFallback: false,
          minW: null, minH: null, maxW: null, maxH: null,
          snapadjustbottom: 0, frameOffsetY: 0, contentH: 164, drawerRestY: 0,
          synthesizedPledit: true
        };
        layouts["pledit|normal"] = plEntry3;
        layouts["Pledit|normal"] = plEntry3;
        layoutList.push(plEntry3);
        report.notes.push("không có layout Pledit và không có nội dung playlist — skin trình phát đầy đủ nên dựng cửa sổ playlist mặc định 436×164 với <list> (ruột playlist của Amp)");
      } catch (e3) { /* không dựng được thì giữ hành vi cũ: bỏ qua playlist */ }
      }
    }
    /* AUDIT N17: model 0 layout thì lỗi chỉ lộ ở renderer sau đó (đã thay
       skin xong). Ném ngay từ loader để bootSkin giữ skin cũ + báo lỗi
       rõ, cùng mã SKIN_UNSUPPORTED như renderer. */
    if (!layoutList.length) {
      var _emptyErr = new Error("skin không có layout nào dùng được (không có <layout> trong skin.xml) — skin này không dùng được, vẫn giữ skin cũ");
      _emptyErr.code = "SKIN_UNSUPPORTED";
      throw _emptyErr;
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
            if (gid && !hasGroupdef(gid) && !xuiMap[gid.toLowerCase()] && !missingGdSeen[gid.toLowerCase()]) {
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
          groupdefsByLower[mg.toLowerCase()] = [];
          groupdefElsByLower[mg.toLowerCase()] = null;
          report.notes.push("tự cấp groupdef rỗng (chuẩn Winamp, skin không định nghĩa): " + mg);
        } else {
          pushMissing("groupdef: " + mg);
          report.notes.push("groupdef thiếu trong skin — bỏ qua (không vẽ): " + mg);
        }
      }
    })();
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
          if (lowerId(kids[j].getAttribute("id")) !== "player.normal.drawer") continue;
          var mainLay = findMainLayout();
          var cH = mainLay ? mainLay.contentH : 280;
          var y = intAttr(kids[j], "y", 0);
          var relat = kids[j].getAttribute("relaty");
          var restY = relat === "1" ? cH + y : y;
          /* restY tính trong hệ nội dung frame; cộng frameOffsetY ra hệ layout */
          restY = restY + (mainLay ? mainLay.frameOffsetY : 18);
          var drawerGd = groupdefElById("player.normal.drawer");
          var contentGd = groupdefElById("player.normal.drawer.content");
          var fullH = drawerGd ? intAttr(drawerGd, "h", 129) : 129;
          var contentW = contentGd ? intAttr(contentGd, "w", 326) : 326;
          /* Ngăn kéo w="0" relatw="1" → rộng bằng layout, không phải 0.
             AUDIT V8: bề rộng gốc là mainLay.w (skin 566: 354), không
             hardcode 354 — skin main rộng khác (vd 433) thì ngăn kéo
             lệch ngang (contentX sai). Fallback 354 chỉ khi không có
             mainLay. */
          var drawerW = mainLay ? mainLay.w : 354;
          if (drawerGd && drawerGd.getAttribute("w") !== null) {
            drawerW = drawerGd.getAttribute("relatw") === "1" ? (mainLay ? mainLay.w : 354) + intAttr(drawerGd, "w", 0) : intAttr(drawerGd, "w", 354);
          }
          /* AUDIT B2-V10: kep >= 0 — contentW (vd 326) ma vuot drawerW
             (main hep, vd 300) thi contentX am lam cum tab tran mep trai. */
          var contentX = Math.max(0, Math.round((drawerW - contentW) / 2)); /* 14 với skin 566 */
          var tabsPos = null;
          if (contentGd) {
            var ckids = elChildren(contentGd);
            for (var k = 0; k < ckids.length; k++) {
              if (lowerTag(ckids[k]) === "group" && lowerId(ckids[k].getAttribute("id")) === "config.tabs") {
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
        var _ms2 = zipEntrySize(zip.files[n]);
        return { path: p, size: _ms2 < 0 ? 0 : _ms2 };
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
        /* AUDIT V5: entry hỏng thì imgSize trả null (đã bọc), không để
           rejection văng ra renderer. */
        var s = null;
        try { s = await imgSize(entry.file); } catch (e) { s = null; }
        return { file: entry.file, crop: null, w: s ? s.w : 0, h: s ? s.h : 0 };
      }
      if (id && findPath(id)) {
        var s2 = null;
        try { s2 = await imgSize(id); } catch (e) { s2 = null; }
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
      var gd = groupdefElById("AVSGroup");
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
          if (lowerTag(kids[j]) === "group" && lowerId(kids[j].getAttribute("id")) === "avsgroup") { inst = kids[j]; break outer; }
        }
      }
      if (!inst) return null;
      var h = (mainLay && mainLay.snapadjustbottom > 0) ? mainLay.snapadjustbottom : 116;
      var avsX = resolveRelPos(inst, "x", layW);
      var avsY = resolveRelPos(inst, "y", contentH) + frameOff;
      var vg = null;
      var avsKids = groupdefById("AVSGroup") || [];
      for (var k = 0; k < avsKids.length; k++) {
        if (lowerTag(avsKids[k]) === "group" && lowerId(avsKids[k].getAttribute("id")) === "video.group") { vg = avsKids[k]; break; }
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
      /* AUDIT R8-5 (nhẹ, sửa R7-9 chưa trọn): groupdefs/groupdefEls xuất
         ra vẫn khóa theo đúng chữ gốc trong XML, renderer đọc bằng id
         cứng chữ thường (vd "wasabi.standard.layout") nên skin viết id
         khác chữ vẫn mất frame/AVS/drawer. Xuất thêm tra cứu không phân
         biệt hoa/thường (dùng groupdefsByLower nội bộ đã có từ R7-9) để
         renderer dùng thay cho đọc key trực tiếp. KHÔNG chuẩn hoá key
         xuất ra về chữ thường: renderer còn đọc RES.groupdefs[gid] bằng
         id gốc trong XML (vd renderGroupInstance gid="AVSGroup") nên
         đổi key sẽ phá skin viết đúng chữ đó. */
      groupdefById: groupdefById, groupdefElById: groupdefElById, hasGroupdef: hasGroupdef,
      layouts: layouts, layoutList: layoutList, containers: containers,
      findLayout: findLayout, firstLayoutInContainer: firstLayoutInContainer,
      xmlFiles: xmlFiles, makiFiles: makiFiles,
      gammasets: gammasets, gammas: gammasets.length ? gammasets[0].groups : [],
      drawer: drawerInfo,
      embeddedAvs: embeddedAvs,
      fileURL: fileURL, imgSize: imgSize, resolveImageRef: resolveImageRef,
      bitmapInfo: bitmapInfo, report: report, zip: zip, findPath: findPath,
      revokeSkinUrls: revokeSkinUrls, /* AUDIT V1: bootSkin gọi khi thay skin */
      screenshotFile: findPath("screenshot.png")
    };
    return { skin: info, layouts: layouts, resolve: resolve, report: report, version: LOADER_VERSION, fromCache: false, revokeSkinUrls: revokeSkinUrls };
  }

  /* v1 (137): danh sach skin co san trong thu muc skins/ + nap skin
     bang URL (Hai 14:03–14:04). Thu muc skins/ cua Amp chi chua file
     skin (.wal/.wsz) + skins.json (danh sach). Web app KHONG doc duoc
     thu muc tren host (khong co API liet ke thu muc) nen danh sach lay
     tu 2 nguon, gop lai (xem index.html loadBundledSkins):
     (1) skins/skins.json — kem theo zip, luon dong bo voi skin da giao;
     (2) GitHub API contents/skins — doc thang thu muc skins/ tren kho,
         de skin Hai up them sau (vd .wsz) tu hien ra ma khong can sua
         skins.json. Khong phai kho skin duyet danh sach tren mang (da
         bo 03/11, khong khoi phuc) — chi file trong skins/ cua Amp. */
  function skinKindFromName(name) {
    var s = String(name || "");
    var ext = s.slice(s.lastIndexOf(".") + 1).toLowerCase();
    if (ext === "wal") return "modern";
    if (ext === "wsz") return "classic";
    return null; /* .zip: loader soi noi dung (co skin.xml -> Modern, khong -> Classic); chua biet loai khi chua nap */
  }
  function skinKindLabel(kind) {
    if (kind === "classic") return "Classic";
    if (kind === "modern") return "Modern";
    return "";
  }
  /* Nhan hien trong danh sach: "Ten (Modern)" / "Ten (Classic)" — phan
     biet ro 2 loai de Hai khoi nham (14:04). */
  function skinDisplayName(entry) {
    if (!entry) return "";
    var base = entry.name || entry.file || "";
    var kind = entry.kind || skinKindFromName(entry.file);
    var lab = skinKindLabel(kind);
    return lab ? base + " (" + lab + ")" : base;
  }
  /* Parse skins/skins.json -> [{name, file, kind}] da kiem chung:
     chi nhan file .wal/.wsz (khong phan biet hoa/thuong); name mac
     dinh la ten file; bo muc thieu file / sai dinh dang; trung file
     (khong phan biet hoa/thuong) thi giu muc dau tien. */
  function parseSkinsManifest(text) {
    var out = [], seen = {};
    var d = null;
    try { d = JSON.parse(String(text || "")); } catch (e) { return out; }
    var list = (d && d.skins) || (Array.isArray(d) ? d : []);
    if (!Array.isArray(list)) return out;
    for (var i = 0; i < list.length; i++) {
      var e = list[i] || {};
      var file = String(e.file || "").trim();
      if (!file) continue;
      /* AUDIT R6-10: đuôi file xác định được loại thì ưu tiên đuôi —
         manifest ghi nhầm kind chỉ sai nhãn menu, nhưng nhãn sai vẫn gây
         nhầm; chỉ dùng e.kind khi đuôi là .zip (chưa biết loại khi chưa
         nạp) và kind đó hợp lệ. */
      var kind = skinKindFromName(file);
      if (!kind) kind = (e.kind === "modern" || e.kind === "classic") ? e.kind : null;
      if (!kind) continue;
      var key = file.toLowerCase();
      if (seen[key]) continue;
      seen[key] = true;
      out.push({ name: String(e.name || file).trim() || file, file: file, kind: kind });
    }
    return out;
  }
  /* Gop 2 danh sach skin (manifest + GitHub API): muc trong base thang
     khi trung file (khong phan biet hoa/thuong) vi base co ten than
     thien; muc chi co o extra thi them vao cuoi, giu thu tu. */
  function mergeSkinsLists(base, extra) {
    var out = (base || []).slice(), seen = {};
    out.forEach(function (e) { if (e && e.file) seen[String(e.file).toLowerCase()] = true; });
    (extra || []).forEach(function (e) {
      if (!e || !e.file) return;
      var file = String(e.file).trim();
      if (!file) return;
      var key = file.toLowerCase();
      if (seen[key]) return;
      /* AUDIT R6-10: như parseSkinsManifest — ưu tiên đuôi file, chỉ dùng
         e.kind khi đuôi là .zip và kind hợp lệ. */
      var kind = skinKindFromName(file) || ((e.kind === "modern" || e.kind === "classic") ? e.kind : null);
      if (!kind) return;
      seen[key] = true;
      out.push({ name: String(e.name || file).trim() || file, file: file, kind: kind });
    });
    return out;
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
    loadSkinFile: loadSkinFile,
    skinKindFromName: skinKindFromName, skinKindLabel: skinKindLabel, /* v1 (137): loai skin + nhan hien */
    skinDisplayName: skinDisplayName, parseSkinsManifest: parseSkinsManifest, mergeSkinsLists: mergeSkinsLists /* v1 (137): danh sach skins/ */
  };
});
