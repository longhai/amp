/* =====================================================================
   Amp v9 — renderer.js (VIẾT MỚI TỪ ĐẦU, đợt A; đợt B thêm ngăn kéo)
   Renderer cửa sổ chính theo SPEC-skin-sim §3. Không copy code v7.4/v8;
   chỉ giữ các công thức đã chứng minh đúng (V8-BUGS.md) — NGOẠI TRỪ
   contentH và drawerInnerY (sửa đợt 9.4, xem ghi chú ở hai hàm đó):
   đo lại từ Winamp thật 3/11/2026 (GIF + WACUP PNG) cho thấy main phải
   ở y=35 (đáy 161), cửa sổ đóng cao 164, mở cao 280 — công thức cũ
   (contentH = layoutH - 18, dải ngăn kéo 13px) lệch đúng 18px.
     - panel EQ (17,15), tabs (24,108) — lấy từ model, không hardcode.
   QUY TẮC BẤT BIẾN: slider EQ KHÔNG BAO GIỜ có fill. Không có khối tạo
   fillEl, không có màu fill xanh — grep toàn dự án phải ra 0.
   Trim chiều cao: đo bằng hình học từ DOM đã vẽ (_absY + style.height),
   KHÔNG dùng getBoundingClientRect (chạy được cả jsdom trong test).
   Chạy được cả trình duyệt (window) lẫn Node (module.exports).
   ĐỢT B (9.1): ngăn kéo mở/đóng một bước, tab vẽ nền Grid, tab EQ
   (slider kéo được, EQ ON/OFF + LED, AUTO, PRESETS, Balance, Crossfade),
   tab Options (dữ liệu skin thật), tab Color Themes (44 preset, filter
   SVG feColorMatrix theo từng gammagroup), self-check lúc chạy.
   ĐỢT C (9.1 — KHÔNG đổi loader nên KHÔNG bump version): cửa sổ Playlist
   Editor 436×164 (frame playlistframe.nostatusbar, menubar File/Playlist/
   Sort/Help đo từ PNG lúc chạy), danh sách thật từ radio.m3u (41 kênh),
   chọn 1 click / phát 2 click, ô tìm trong khung list, hàng
   nút Add/Rem/Sel/Misc/List mở menu, PLTime = tổng thời gian các mục có
   thời lượng. Nút PL (TOGGLE guid:pl) + menu View mở/đóng playlist.
   ĐỢT D (9.2 — renderer đổi: máy trạng thái AVS/Video + cửa sổ rời):
   skin Modern (RES.embeddedAvs từ loader) dùng vùng AVS nhúng 354×116
   tại (0,35) trong cửa sổ chính (video.group 346×69, main lùi 116);
   skin Classic (embeddedAvs=null) CHỈ dùng cửa sổ Video/Hiệu ứng RỜI
   (xếp sau playlist). Detach tách vùng nhúng thành cửa sổ rời (cùng
   thẻ <video>/canvas di chuyển theo, không tạo lại); Reattach đưa về.
   Đóng AVS không dừng tiếng (chỉ ẩn hình). PHÁT THẬT (native/HLS/
   crossOrigin/EQ) là đợt E — đợt D chỉ tạo + đặt đúng vị trí + đổi hộp.
   ĐỢT G (9.3): chế độ shade (layout main|shade 354×25 từ model, nút
   transport + volume/mute/EJECT/PL/ML/winshade nối qua onShadeToggle);
   nút mute shade (SHADE_MUTE); dblClickAction SWITCH;normal/shade trên
   layer; tab ngăn kéo ẨN khi đóng (không thò ra bị cắt); ngăn kéo trượt
   bằng CSS transition trên transform (mở trượt xuống, đóng trượt lên,
   ~250ms, có fallback ép về vị trí cuối — KHÔNG dùng rAF hai bước kiểu
   v8); renderStacked hỗ trợ shadeMode (shade 25px + playlist).
   ===================================================================== */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory();
  else root.AmpRenderer = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var RENDERER_VERSION = "9.9";
  var EXPECTED_RENDERER_VERSION = "9.9";
  /* ĐỢT F — version manifest duy nhất (như skin-loader.js): index.html
     đặt window.AMP_VERSION = "9.9" TRƯỚC khi nạp file này; khác manifest
     thì MANIFEST_MISMATCH = true để trang báo "bản mix". Không có
     manifest (test trực tiếp bằng require) thì không kiểm. */
  var MANIFEST_VERSION = (function () {
    try {
      if (typeof globalThis !== "undefined" && globalThis.AMP_VERSION) return globalThis.AMP_VERSION;
      if (typeof window !== "undefined" && window.AMP_VERSION) return window.AMP_VERSION;
    } catch (e) { /* bỏ qua */ }
    return null;
  })();
  var MANIFEST_MISMATCH = MANIFEST_VERSION !== null && MANIFEST_VERSION !== RENDERER_VERSION;

  /* ---------- hằng số giữ nguyên (SPEC §6.1) ---------- */
  var MAX_DEPTH = 12;
  var FRAME_OFFSET_Y = 18;      /* nội dung frame lùi 18px dưới titlebar */
  var VIDEO_SHIFT = 116;        /* video/AVS mở: main lùi 116px */
  /* Vị trí tuyệt đối đã khóa từ .wal thật (VERIFIED-NUMBERS.md §2) —
     renderer KHÔNG hardcode các số này, chúng đều tính ra từ XML lúc chạy
     (main y=35 + offset nhóm + offset phần tử); ghi lại đây để đợt sau
     khỏi nhầm khi đọc SPEC §4.2. Đo lại từ Winamp thật (GIF + WACUP PNG,
     3/11/2026): main y=35 (đáy 161); menubar y=18 (cao 17); display GỐC
     NHÓM y=38 (35+3), khung display 38–105 (nền xanh thấy 43–100);
     đỉnh chữ TIMER ở display y=16 → layout y=54 (số 36 trong SPEC cũ
     là main 17 + 3 + 16, đã sai 18px theo main cũ, đừng dùng). Cụ thể,
     theo main y=35:
     - ticker (Songticker) y=81 (35+3+43) — SPEC ghi 60 là cộng thiếu y=3
       của nhóm display VÀ main cũ sai 18px. Renderer lấy từ XML nên đúng.
     - seek y=110 (35+75); playbuttons y=128 (35+93).
     - volume: SPEC ghi "y=117" là ĐỈNH NỀN volume (layer player.volume.bg
       y=100 trong main); SLIDER Volume thật ở y=145 (35+110), fill
       volumebar ở y=150 (35+115). Đừng dùng 117 làm vị trí slider.
     - ngăn kéo nghỉ y=35 (đáy 164 = cửa sổ đóng); mở y=151 (đáy 280);
       nút mở ngăn kéo y=153 (35+118) lộ qua lỗ trong main.png/main2.png. */
  var TRIM_CUT_BELOW = 0.8;     /* maxB < LH*0.8 thì cắt */
  var TRIM_IGNORE_ABOVE = 1.5;  /* bỏ qua đáy > LH*1.5 */
  var VOLUMEBAR_MAXW = 86, VOLUMEBAR_SHADE_MAXW = 56;
  var VIS_BANDS = 16, VIS_BG = "#0a1420", VIS_COL = "#7fff2a";
  /* Đợt D — cửa sổ Video/Hiệu ứng RỜI (Modern: khung từ model video.frame.
     layout/vis.frame.layout; Classic: khung HTML dự phòng — xem
     buildDetachedWindowModel/Fallback). Kích thước 354×200 là QUYẾT ĐỊNH
     CỦA V9 (không có trong XML): titlebar 18 + khung 182; hộp media
     (6,23,342×150) theo đúng vị trí <component> trong layout Video/Vis
     (x=6, y=5 trong content, content bắt đầu dưới titlebar 18); thanh
     nút 21px ở đáy (nhóm nút trong frame.layout ở y=-22 relatY=1).
     Layout Video/Vis gốc cao 280 là chiều cao dummy đầy đủ, không phải
     cỡ cửa sổ rời mặc định — đừng dùng 280 làm cao cửa sổ rời. */
  var DETACHED_WIN_W = 354, DETACHED_WIN_H = 200;
  var DETACHED_MEDIA_RECT = { x: 6, y: 23, w: 342, h: 150 };
  /* Kiểu hiệu ứng (VIS_Prev/Next đổi): 3 màu cột — 0 là #7fff2a của đợt A.
     Chỉ đổi màu vẽ mẫu ở đợt D; đợt E nối analyser thì vẫn dùng 3 kiểu này. */
  var VIS_VARIANTS = [{ col: "#7fff2a" }, { col: "#33c3ff" }, { col: "#ffb02a" }];
  /* Đợt K (9.7, điểm 7b2): màu cột vis theo XML <vis> ColorBand1..16
     (skin 566: toàn trắng — vẽ cột trắng như WACUP thay vì xanh lá gán cứng).
     visVariant === 0 (mặc định) dùng màu này; bấm VIS_Prev/Next đổi sang
     VIS_VARIANTS[1..2]. AVS canvas dùng chung mảng này (không có <vis> riêng). */
  var visXmlBands = new Array(VIS_BANDS).fill("#ffffff");
  /* Nhóm nút trong AVSGroup theo chế độ (v8 syncEmbAvsMode): chế độ video
     hiện buttons.video + buttons.video.switchto ("Switch to Visualizer") +
     buttons.video.detach; chế độ vis hiện bộ .vis tương ứng. */
  var AVS_MODE_GROUPS = {
    "buttons.video": "video", "buttons.vis": "vis",
    "buttons.video.detach": "video", "buttons.vis.detach": "vis",
    "buttons.video.switchto": "video", "buttons.vis.switchto": "vis"
  };

  /* FONT_ROWS — bảng ký tự đo từ PNG font của skin.
     NGUỒN KHÓA: VERIFIED-NUMBERS.md §8 (đo trực tiếp từng ô glyph).
     - songticker/smallfont/shade + BIGNUM (":" cột 12): SPEC §3.10 ĐÚNG, giữ nguyên.
     - pe.time.font + songinfo.font: SPEC §3.10 SAI. Hàng 1 thật là
       "0123456789._:  -'! +\\/  ^&?,=$#" (31 ký tự): ":" cột 12 (không phải
       13), "-" cột 15, KHÔNG có "%", CÓ "?" cột 26. Giữ bảng cũ thì PLTime
       "3:45" mất dấu ":" (hiện "3 45"), "-" hiện thành ":", "+"/"^"/"&" mất hẳn.
     Hai font này giống hệt nhau về bảng ký tự.
     Đợt K (9.7, điểm 7b1): songinfofont là font "khuôn" (stencil) — nền ô
     đục trắng, glyph là lỗ trong suốt — NHƯNG VẼ NGUYÊN BẢN, KHÔNG ĐẢO ALPHA.
     Winamp vẽ glyph nguyên bản: nền ô đục nối thành viên trắng, lỗ hiện nền
     display tối → chữ tối trên viên trắng (KBPS "56" mean ~194 ở WACUP).
     Cơ chế đảo alpha cũ (v9, theo §8.1) SAI: nó biến glyph thành nét trắng
     trên nền trong suốt (mất viên trắng) và lật hàng phân cách trong suốt
     (y=15) thành vạch trắng đặc → vệt gạch dưới chân số ở ảnh Amp. Đã bỏ
     hẳn cơ chế đảo (loadFont không còn đếm opaque/inverted; glyphURL
     không còn lật alpha). Xem VERIFIED-NUMBERS.md §8.1 (đã sửa kết luận). */
  var FONT_ROWS = {
    "player.songticker.font": ["ABCDEFGHIJKLMNOPQRSTUVWXYZ\"@", "0123456789_.:()-'!_+\\/[]^&%,=$#", "ÀÖÄ?×"],
    "player.smallfont":       ["ABCDEFGHIJKLMNOPQRSTUVWXYZ\"@", "0123456789_.:()-'!_+\\/[]^&%,=$#", "ÀÖÄ?×"],
    "shade.songticker.font":  ["ABCDEFGHIJKLMNOPQRSTUVWXYZ\"@", "0123456789_.:()-'!_+\\/[]^&%,=$#", "ÀÖÄ?×"],
    "player.BIGNUM":          ["", "0123456789  :  -"],
    "player.songinfo.font":   ["", "0123456789._:  -'! +\\/  ^&?,=$#"],
    "player.pe.time.font":    ["", "0123456789._:  -'! +\\/  ^&?,=$#"]
  };
  var COLON_COL_BIGNUM = 12; /* ":" trong "0123456789  :  -" ở cột 12 */

  var SKIP_TAGS = {
    "script": 1, "sendparams": 1, "hideobject": 1, "include": 1,
    "accelerators": 1, "element": 1, "elementalias": 1,
    "layoutstatus": 1, "menu": 1, "componentbucket": 1,
    "groupxfade": 1, "windowholder": 1, "colorthemes": 1
  };

  /* Đợt 9.5: KHÔNG còn bài Demo — người dùng chốt bỏ hết bài hát demo,
     chỉ giữ nguồn radio.m3u của mình. DEMO_TRACKS giữ lại dạng rỗng để
     các hàm/export cũ không vỡ (demoPlaylistItems() trả [], ticker không
     còn hiện tên bài demo). Trước đây: 3 bài Llama Whippin' / Demo Song /
     Base Skin Theme (225s/187s/243s). */
  var DEMO_TRACKS = [];

  /* ---------- helpers thuần ---------- */
  function intAttr(el, name, def) {
    var v = el.getAttribute(name);
    if (v === null || v === undefined || v === "") return def;
    var n = parseInt(v, 10);
    return isNaN(n) ? def : n;
  }
  function elChildren(el) {
    var out = [], i, n;
    for (i = 0; i < el.childNodes.length; i++) {
      n = el.childNodes[i];
      if (n.nodeType === 1) out.push(n);
    }
    return out;
  }
  function lowerTag(el) { return (el.tagName || "").toLowerCase(); }
  /* Tọa độ tương đối: relat=1 → parent+v (bám mép phải/dưới);
     relat=2 → parent*v/100 (phần trăm); không có → v. */
  function relPos(el, attr, parent) {
    var v = intAttr(el, attr, 0);
    var r = el.getAttribute("relat" + attr);
    if (r === "1") return parent + v;
    if (r === "2") return Math.round(parent * v / 100);
    return v;
  }
  function relSize(el, attr, parent) { return relPos(el, attr, parent); }
  function fmtTime(t) {
    t = Math.max(0, Math.floor(t));
    return Math.floor(t / 60) + ":" + String(t % 60).padStart(2, "0");
  }
  /* Bỏ dấu tiếng Việt cho dòng chữ chạy (marquee): font bitmap của skin
     chỉ có ASCII (SPEC §3.10) — "Đà Nẵng" -> "Da Nang". Danh sách
     playlist giữ nguyên dấu, chỉ ticker bỏ dấu. Dùng NFD + gộp dấu, riêng
     đ/Đ không tách được bằng NFD nên thay tay. */
  function stripDiacritics(s) {
    var t = String(s || "");
    try { t = t.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
    catch (e) { /* môi trường không có normalize */ }
    return t.replace(/đ/g, "d").replace(/Đ/g, "D");
  }
  /* ---------- .m3u (đợt C, thuần — dùng được cả trong test) ----------
     parseM3U(text, baseUrl) -> [{name, url, len|null, group, kind}]:
     - Dòng #EXTINF:<giây>,<tên>: tên = sau dấu phẩy ĐẦU TIÊN; link = dòng
       sau (không #). group-title="..." nếu có trong đầu #EXTINF.
     - len: giây khi > 0; -1/không có -> null (kênh trực tiếp, kind "radio").
       KHÔNG bịa thời lượng cho radio.
     - Link tương đối -> tuyệt đối theo URL gốc (baseUrl). */
  function resolveM3UUrl(url, baseUrl) {
    url = String(url || "").trim();
    if (!url) return "";
    if (/^[a-z][a-z0-9+.-]*:/i.test(url) || url.indexOf("//") === 0) return url;
    if (!baseUrl) return url;
    try {
      if (typeof URL !== "undefined") return new URL(url, baseUrl).href;
    } catch (e) { /* rơi về nối chuỗi dưới */ }
    var base = String(baseUrl).split("?")[0].split("#")[0];
    var slash = base.lastIndexOf("/");
    var dir = slash >= 0 ? base.slice(0, slash + 1) : base + "/";
    if (url.charAt(0) === "/") {
      var m = /^([a-z][a-z0-9+.-]*:\/\/[^\/]+)/i.exec(dir);
      return (m ? m[1] : "") + url;
    }
    return dir + url;
  }
  function parseM3U(text, baseUrl) {
    var items = [], pending = null;
    var lines = String(text || "").split(/\r\n|\r|\n/);
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) continue;
      if (line.indexOf("#EXTINF") === 0) {
        var comma = line.indexOf(",");
        var head = comma >= 0 ? line.slice(0, comma) : line;
        var name = comma >= 0 ? line.slice(comma + 1).trim() : "";
        var dur = -1;
        var dm = /#EXTINF:\s*(-?\d+)/.exec(head);
        if (dm) dur = parseInt(dm[1], 10);
        var gm = /group-title="([^"]*)"/.exec(head);
        pending = { dur: dur, name: name, group: gm ? gm[1] : "" };
        continue;
      }
      if (line.charAt(0) === "#") continue; /* #EXTM3U, #PLAYLIST...: bỏ qua */
      var url = resolveM3UUrl(line, baseUrl);
      if (pending) {
        items.push({ name: pending.name || url, url: url, len: pending.dur > 0 ? pending.dur : null, group: pending.group, kind: pending.dur > 0 ? "track" : "radio" });
        pending = null;
      } else {
        /* Dòng link không có #EXTINF trước nó: lấy tên từ chính URL. */
        items.push({ name: url, url: url, len: null, group: "", kind: "radio" });
      }
    }
    return items;
  }
  function rgbVal(v) {
    if (!v) return "#fff";
    if (v === "white") return "#fff";
    if (v === "black") return "#000";
    var p = String(v).split(",").map(function (x) { return parseInt(x, 10); });
    if (p.length === 3 && p.every(function (n) { return !isNaN(n); })) return "rgb(" + p[0] + "," + p[1] + "," + p[2] + ")";
    return v;
  }
  function fontCharPos(fontId, ch) {
    var rows = FONT_ROWS[fontId];
    if (!rows) return null;
    var up = ch.toUpperCase();
    for (var r = 0; r < rows.length; r++) {
      var c = rows[r].indexOf(up);
      if (c >= 0) return { row: r, col: c };
      if (rows[r].indexOf(ch) >= 0) return { row: r, col: rows[r].indexOf(ch) };
    }
    return null;
  }
  /* Chỉ loại activeAlpha="0". Không đọc inactiveAlpha: phần tử có
     inactiveAlpha="0" là bản khi cửa sổ đang active → vẫn vẽ. */
  function isActiveVersion(el) {
    return el.getAttribute("activeAlpha") !== "0";
  }
  /* alpha XML 0–255 → opacity 0–1. alpha=13 ≈ 5% — không bao giờ vẽ 100%. */
  function alphaOf(el) {
    var a = el.getAttribute("alpha");
    if (a === null || a === "") return null;
    var n = parseInt(a, 10);
    return isNaN(n) ? null : n / 255;
  }

  /* ---------- gamma (đợt B, tab Color Themes) ----------
     Winamp gammagroup value="r,g,b" (mỗi kênh -4096..4096). Tỉ lệ áp cho
     kênh = 1 + v/4096, kẹp [0.4, 1.6] — áp RIÊNG từng gammagroup bằng
     1 filter SVG feColorMatrix, KHÔNG trung bình kênh, KHÔNG filter
     chung toàn stage. `gray`/`boost` trong XML chưa áp (chưa có công
     thức chốt cho 2 thuộc tính này — ghi nhận, không bịa). */
  function gammaScale(v) {
    var s = 1 + v / 4096;
    if (s < 0.4) return 0.4;
    if (s > 1.6) return 1.6;
    return Math.round(s * 10000) / 10000;
  }
  function gammaMatrixValues(valueStr) {
    var p = String(valueStr || "0,0,0").split(",").map(function (x) { return parseInt(x, 10) || 0; });
    var sr = gammaScale(p[0] || 0), sg = gammaScale(p[1] || 0), sb = gammaScale(p[2] || 0);
    return { r: sr, g: sg, b: sb, identity: sr === 1 && sg === 1 && sb === 1,
      matrix: sr + " 0 0 0 0  0 " + sg + " 0 0 0  0 0 " + sb + " 0 0  0 0 0 1 0" };
  }

  /* ---------- toán ngăn kéo ---------- */
  function drawerSnap(layout, fullH) {
    if (layout && typeof layout.snapadjustbottom === "number" && layout.snapadjustbottom > 0) return layout.snapadjustbottom;
    return fullH || 129;
  }
  /* Vị trí ngăn kéo theo đáy main (mainH) và chiều cao main (mainHeight,
     đọc từ div main lúc chạy — groupdef player.main h=126 với skin 566):
     - Đóng: đỉnh ngăn kéo = đỉnh main (ngăn kéo và main cùng neo nghỉ
       y=-263 relaty=1 nên cùng đỉnh restY; ngăn kéo chỉ thò
       (full - mainHeight) px dưới đáy main — 3px với skin 566; nút mở lộ
       qua lỗ trong suốt trong main.png/main2.png, khớp Winamp thật).
       innerY = mainH - mainHeight - restY (= 0 khi video đóng).
     - Mở: trượt đúng snapadjustbottom từ vị trí nghỉ:
       innerY = mainH - mainHeight - restY + snap (đỉnh mở = restY+snap,
       đáy mở = restY+snap+full = chiều cao layout khi video đóng).
     Công thức cũ (slot mở=snap, đóng=full*0.1≈13) đặt ngăn kéo theo đáy
     main trừ full, cho dải lộ 13px dưới main và chìm 13px khi mở — SAI:
     đo Winamp thật (GIF + WACUP PNG): cửa sổ đóng cao 164, mở cao 280
     (= layout h); dải lộ 3px, chìm 10px (= mainHeight - snap).
     mainHeight thiếu (gọi cũ) thì dùng full để khỏi NaN — các điểm gọi
     trong renderer đều truyền đủ. */
  function drawerInnerY(open, mainH, snap, full, restY, mainHeight) {
    var mh = (typeof mainHeight === "number" && mainHeight > 0) ? mainHeight : full;
    var base = mainH - mh - restY;
    return open ? base + snap : base;
  }
  /* Self-check hình học: đỉnh ngăn kéo khi đóng phải bằng đỉnh main
     (mainH - mainHeight), khi mở phải bằng đỉnh main + snap. */
  function drawerSelfCheck(p) {
    var errs = [];
    var mainTop = p.mainH - (p.mainHeight || 0);
    /* innerY (thuc te, do tu DOM): dinh ngan keo phai o 1 trong 2 vi tri
       hop le — dong (= dinh main) hoac mo (= dinh main + snap). Dung cho
       runDrawerSelfCheck, vi trang thai mo/dong trong DOM khong nhat
       thiet dong bo voi drawerState.open (renderLayout goi truc tiep
       voi opts.drawerOpen khong cap nhat drawerState). */
    if (p.innerY !== undefined) {
      var actualTop = p.restY + p.innerY;
      if (actualTop !== mainTop && actualTop !== mainTop + p.snap) {
        errs.push("dinh ngan keo khong o vi tri dong (" + mainTop + ") cung khong o vi tri mo (" + (mainTop + p.snap) + "): dang o " + actualTop + " (restY " + p.restY + " + innerY " + p.innerY + ")");
      }
    }
    if (p.innerYOpen !== undefined && p.restY + p.innerYOpen !== mainTop + p.snap) {
      errs.push("dinh ngan keo mo khong bang dinh main + snap: restY(" + p.restY + ")+innerY(" + p.innerYOpen + ")=" + (p.restY + p.innerYOpen) + " != mainH(" + p.mainH + ")-mainHeight(" + (p.mainHeight || 0) + ")+snap(" + p.snap + ")=" + (mainTop + p.snap));
    }
    if (p.innerYClosed !== undefined && p.restY + p.innerYClosed !== mainTop) {
      errs.push("dinh ngan keo dong khong bang dinh main: restY(" + p.restY + ")+innerYClosed(" + p.innerYClosed + ")=" + (p.restY + p.innerYClosed) + " != mainTop(" + mainTop + ")");
    }
    if (p.tabsBottom !== null && p.full - p.tabsBottom > 4) {
      errs.push("tab khong nam trong 4px cuoi ngan keo: day tab " + p.tabsBottom + " / cao ngan keo " + p.full);
    }
    if (p.fillCount !== 0) errs.push("co " + p.fillCount + " phan tu .fill trong panel EQ (Winamp goc khong co fill)");
    return errs;
  }

  /* ---------- renderer ---------- */
  function createRenderer(RES, document, opts) {
    opts = opts || {};
    var demo = {
      playing: false, track: 0, t: 0, volume: 1,
      seekFrac: 0, shuffle: false, repeat: 0, eq: true, dur: undefined
    };
    /* Đợt A (9.9, việc 4) — chế độ đồng hồ chính: "elapsed" = đếm lên
       từ 0:00 (mặc định, như Winamp lúc mở), "remaining" = đếm ngược
       "-M:SS" (bấm vào đồng hồ để đổi, như Winamp thật). demo.dur =
       thời lượng bài đang phát do engine/timeupdate báo MỚI NHẤT:
       undefined = chưa có báo cáo nào (chưa phát), null = engine báo
       không có thời lượng (đài live), số = thời lượng thật. */
    var timerMode = "elapsed";
    var drawerTab = opts.drawerTab || "eq";
    var onTabChange = opts.onTabChange || null;
    var onRerender = opts.onRerender || null;
    var onDrawerToggle = opts.onDrawerToggle || null;
    var onShadeToggle = opts.onShadeToggle || null; /* đợt G: normal<->shade (nút winshade / dblclick nền shade) */
    var onPlaylistToggle = opts.onPlaylistToggle || null; /* đợt C: mở/đóng playlist */
    var onMlToggle = opts.onMlToggle || null; /* Đợt A (9.9, việc 1): mở/đóng Media Library (nút ML, action TOGGLE guid:ml) */
    var isMlOpen = opts.isMlOpen || null; /* Đợt A (9.9, việc 1): tick menu View — ML đang mở hay không */
    var onWinSizeChange = opts.onWinSizeChange || null; /* Đợt A (9.9, việc 6): kéo đổi kích thước cửa sổ xong → index.html lưu localStorage */
    var onPlayerClose = opts.onPlayerClose || null; /* v9.6 (Điểm 2): nút X cửa sổ chính — web không "thoát app" như Winamp thật nên index.html ẩn giao diện + hiện nút mở lại */
    var onMinimize = opts.onMinimize || null; /* Đợt D (9.9): nút MINIMIZE (chính + shade) — web không có cửa sổ hệ thống/taskbar nên index.html ẩn giao diện + hiện nút mở lại, giữ nguyên tiếng đang phát (chung đường với onPlayerClose) */
    var onOpenSkinPicker = opts.onOpenSkinPicker || null; /* Đợt D: menu File → "Nạp skin .wal/.zip…" / Preferences — mở hộp chọn file của trang */
    var onZoom = opts.onZoom || null; /* Đợt D: Preferences → Zoom 1x / Vừa màn hình */
    var isShadeMode = opts.isShadeMode || null; /* Đợt D: nút shade (shadeeq/shadect) cần biết đang ở shade để về normal trước khi mở ngăn kéo */
    var skinInfo = opts.skinInfo || null; /* Đợt D: bảng About — tên/tác giả/version skin (index.html đưa SKIN từ loader) */
    var onReloadRadio = opts.onReloadRadio || null;       /* đợt C: nạp lại radio.m3u */
    var isPlaylistOpen = opts.isPlaylistOpen || null;     /* đợt C: tick menu View */
    var fetchFn = opts.fetchFn || null; /* Đợt L (9.8): fetch tiêm vào cho addUrl (.m3u) — test đưa mock, chạy thật dùng fetch global. */
    /* State ngăn kéo đợt B (sống trong closure, KHÔNG reset khi re-render):
       - open: ngăn kéo mở hay đóng (mặc định đóng = chỉ lộ 13px + nút mở).
       - eqBands: frac 0..1 từng dải (0.5 = 0 dB); balance 0..1 (0.5 = giữa).
       - crossfadeSecs 0..20 (high="20" trong XML), crossfadeOn.
       - optionsPage: trang config đang hiện trong target (100,12,200×74);
         bucketScroll: độ cuộn của bucket 81×55 (0..43, bước 14).
       - colorThemeIdx: preset đang chọn trong RES.gammasets (0 = Default).
       Tiếng thật (AudioContext/EQ) chưa nối ở đợt B — state chỉ lưu giá
       trị giao diện; đợt tiếng sẽ đọc state này. */
    var drawerState = {
      open: !!opts.drawerOpen,
      eqBands: {}, balance: 0.5, eqOn: true, eqAuto: false,
      crossfadeOn: false, crossfadeSecs: 0,
      optionsPage: "optionsgroup.drawers", bucketScroll: 0,
      colorThemeIdx: 0, cfgSliders: {}
    };
    function requestRerender() { if (onRerender) onRerender(); }
    /* Đợt A (9.9, việc 2) — GIỮ VỊ TRÍ CUỘN (nguyên nhân + sửa):
       - Nhấp 1 lần: selectPlaylistItem → refreshPlaylistRows → build
         rows XÓA HẾT hàng rồi vẽ lại. Lúc danh sách trống tức thì,
         scrollHeight co lại → trình duyệt kẹp scrollTop về 0; vẽ lại
         hàng xong scrollTop vẫn ở 0 → danh sách nhảy về đầu.
       - Nhấp đúp / bấm nút menu (sắp xếp, xóa...): requestRerender →
         renderLayout/renderStacked xóa innerHTML của stage → chiều cao
         trang co lại → window.scrollY cũng bị kẹp về 0, đồng thời
         plListDiv mới tạo lại có scrollTop = 0.
       Sửa: chụp lại (window.scrollY + scrollTop của list playlist/ML)
       TRƯỚC khi phá DOM, trả lại SAU khi vẽ xong — ở cả 2 đường:
       refreshPlaylistRows (vẽ tại chỗ) và swapIn của renderLayout /
       renderStacked (vẽ lại toàn bộ). */
    function rendererWindow() {
      try { if (document && document.defaultView) return document.defaultView; } catch (e) { /* bỏ qua */ }
      if (typeof window !== "undefined") return window;
      return null;
    }
    function captureScrollState() {
      var st = { winY: 0, plTop: 0, mlTop: 0 };
      try {
        var w = rendererWindow();
        if (w) st.winY = w.scrollY || w.pageYOffset || 0;
        if (!st.winY && document && document.documentElement) st.winY = document.documentElement.scrollTop || 0;
      } catch (e) { /* bỏ qua */ }
      try { if (plListDiv) st.plTop = plListDiv.scrollTop || 0; } catch (e) { /* bỏ qua */ }
      try { if (mlListDiv) st.mlTop = mlListDiv.scrollTop || 0; } catch (e) { /* bỏ qua */ }
      return st;
    }
    function restoreScrollState(st) {
      if (!st) return;
      try { if (plListDiv) plListDiv.scrollTop = st.plTop; } catch (e) { /* bỏ qua */ }
      try { if (mlListDiv) mlListDiv.scrollTop = st.mlTop; } catch (e) { /* bỏ qua */ }
      try {
        var w = rendererWindow();
        if (w && w.scrollTo) w.scrollTo(0, st.winY);
        else if (document && document.documentElement) document.documentElement.scrollTop = st.winY;
      } catch (e) { /* jsdom: scrollTo chưa hỗ trợ */ }
    }
    /* ĐợT C (9.9) — TÌM LAYOUT (quy tắc fallback, xem README §Đợt C):
       Tra không phân biệt hoa/thường (id Winamp không phân biệt chữ hoa).
       - layoutEntry(container, layoutId): đúng (container, layoutId), không
         fallback — dùng cho cửa sổ phụ (Pledit/MLibrary/Video/AVS) và cho
         min/max/resize (lấy nhầm layout lạ là vẽ sai cỡ, probe S8).
       - resolveLayout(container, layoutId): dùng khi vẽ cửa sổ CHÍNH:
         (1) đúng (container, layoutId);
         (2) layout khác trong CÙNG container (vd main chỉ có 'shade' thì
             vẽ 'shade' thay 'normal' — layout đầu tiên theo thứ tự XML);
         (3) chỉ khi container là 'main': layout cùng id ở container khác
             mà KHÔNG phải cửa sổ phụ đã biết (Pledit/MLibrary/Video/AVS/
             notifier/albumart) — vd container chính tên 'player';
         (4) không có → null (skin không hỗ trợ, KHÔNG vẽ layout lạ).
       KHÔNG BAO GIỜ fallback trần layouts[layoutId] (alias đó đã bỏ ở
       loader): nó từng làm renderLayout("main","normal") vẽ nhầm layout
       Pledit 436×164 khi main thiếu layout (triệu chứng 3: vẽ nhỏ/sai),
       và làm renderStacked vẽ main 2 lần khi thiếu Pledit (triệu chứng
       2+4: cửa sổ nhân đôi theo chiều dọc, probe stacked S1/S6).
       Trả {entry, container, layoutId, fallback} hoặc null. */
    function lowerStr(s) { return String(s == null ? "" : s).toLowerCase(); }
    var NON_MAIN_CONTAINERS = { "pledit": 1, "mlibrary": 1, "video": 1, "avs": 1, "notifier": 1, "winamp.albumart": 1, "albumart": 1 };
    function layoutEntry(container, layoutId) {
      if (!RES || !RES.layouts) return null;
      if (RES.findLayout) { try { return RES.findLayout(container, layoutId) || null; } catch (e) { /* rơi về tra tay */ } }
      return RES.layouts[lowerStr(container) + "|" + lowerStr(layoutId)]
        || RES.layouts[container + "|" + layoutId] || null;
    }
    function firstLayoutInContainer(container) {
      if (!RES) return null;
      if (RES.firstLayoutInContainer) { try { return RES.firstLayoutInContainer(container) || null; } catch (e) { /* rơi về quét tay */ } }
      var list = RES.layoutList || [], lc = lowerStr(container), best = null;
      for (var i = 0; i < list.length; i++) {
        if (lowerStr(list[i].container) === lc) { best = list[i]; break; }
      }
      return best;
    }
    function resolveLayout(container, layoutId) {
      var exact = layoutEntry(container, layoutId);
      if (exact) return { entry: exact, container: exact.container, layoutId: exact.layoutId, fallback: "exact" };
      var same = firstLayoutInContainer(container);
      if (same) return { entry: same, container: same.container, layoutId: same.layoutId, fallback: "same-container" };
      if (lowerStr(container) === "main") {
        var list = (RES && RES.layoutList) || [];
        for (var i = 0; i < list.length; i++) {
          var e = list[i];
          if (lowerStr(e.layoutId) === lowerStr(layoutId) && !NON_MAIN_CONTAINERS[lowerStr(e.container)]) {
            return { entry: e, container: e.container, layoutId: e.layoutId, fallback: "cross-container" };
          }
        }
      }
      return null;
    }
    /* Đợt A (9.9, việc 6) — resize cửa sổ:
       - Kéo được ⟺ layout trong XML khai minimum NHỎ HƠN w/h ở ít nhất
         1 chiều (còn chỗ co giãn do skin định nghĩa): Pledit min 354×164
         (w 436 → kéo rộng, cao ≥164), MLibrary min 354×164 (790×349 →
         kéo cả 2 chiều), Video/Vis min 354×164 (354×280 → kéo cao).
         main|normal min 354×280 = đúng w/h → CỐ ĐỊNH (Winamp thật cũng
         không kéo được cửa sổ chính — khung chính vẽ cố định theo XML).
       - Giới hạn: min = minimum_w/h trong XML (thiếu thì = w/h mặc
         định); max = maximum_w/h trong XML nếu có, không thì kẹp chung
         WIN_MAX_W/WIN_MAX_H (giới hạn của Amp, không phải số skin 566).
       - Chỉ kéo mép PHẢI / ĐÁY / GÓC dưới-phải: các cửa sổ trong Amp
         xếp chồng/dính nhau (playlist/ML nằm dưới main) nên mép trái/
         trên không kéo được (Winamp desktop cho kéo vì cửa sổ nổi tự do
         — Amp chưa có cửa sổ nổi). */
    function layoutMinMax(container, layoutId) {
      /* Đợt C: tra đúng (container, layoutId), không phân biệt hoa/thường.
         KHÔNG fallback sang RES.layouts[layoutId]: model từng có layout
         trần id="normal" (không thuộc container nào) — fallback lấy nhầm
         min/max của layout lạ cho container không tồn tại. */
      var lay = layoutEntry(container, layoutId);
      if (!lay) return null;
      return {
        w: lay.w, h: lay.h,
        minW: (lay.minW != null && lay.minW > 0) ? lay.minW : lay.w,
        minH: (lay.minH != null && lay.minH > 0) ? lay.minH : lay.h,
        maxW: (lay.maxW != null && lay.maxW > 0) ? lay.maxW : WIN_MAX_W,
        maxH: (lay.maxH != null && lay.maxH > 0) ? lay.maxH : WIN_MAX_H
      };
    }
    function isLayoutResizable(container, layoutId) {
      var mm = layoutMinMax(container, layoutId);
      if (!mm) return false;
      return mm.minW < mm.w || mm.minH < mm.h;
    }
    function clampWinSize(container, layoutId, w, h) {
      var mm = layoutMinMax(container, layoutId);
      if (!mm) return null;
      return {
        w: Math.max(mm.minW, Math.min(mm.maxW, Math.round(w))),
        h: Math.max(mm.minH, Math.min(mm.maxH, Math.round(h)))
      };
    }
    /* Đợt C — khóa winSizes: đúng chữ trong XML của layout entry (vd
       "Pledit|normal"), KHÔNG theo chữ của nơi gọi (nơi gọi có thể viết
       "pledit|normal"). Như vậy size đã kéo không bị mất khi tra khác
       chữ, mà hợp đồng cũ (getWinSizes()/localStorage dùng đúng chữ XML)
       vẫn giữ nguyên. */
    function winSizeKey(container, layoutId) {
      var e = layoutEntry(container, layoutId);
      if (e) return e.container + "|" + e.layoutId;
      return container + "|" + layoutId;
    }
    function getWinSizes() {
      var out = {};
      var keys = Object.keys(winSizes);
      for (var i = 0; i < keys.length; i++) out[keys[i]] = { w: winSizes[keys[i]].w, h: winSizes[keys[i]].h };
      return out;
    }
    function restoreWinSizes(saved) {
      if (!saved || typeof saved !== "object") return false;
      var changed = false;
      var keys = Object.keys(saved);
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i], v = saved[k];
        if (!v || typeof v.w !== "number" || typeof v.h !== "number") continue;
        var parts = String(k).split("|");
        var c = clampWinSize(parts[0], parts[1] || "normal", v.w, v.h);
        if (c) { winSizes[winSizeKey(parts[0], parts[1] || "normal")] = c; changed = true; }
      }
      return changed;
    }
    function setWinSize(container, layoutId, w, h, silent) {
      var c = clampWinSize(container, layoutId, w, h);
      if (!c) return null;
      winSizes[winSizeKey(container, layoutId)] = c;
      if (!silent && onWinSizeChange) { try { onWinSizeChange(getWinSizes()); } catch (e) { /* bỏ qua */ } }
      return c;
    }
    /* Kích thước layout sau khi áp size đã kéo (để tính chiều rộng stage
       trong renderStacked): có size kéo thì dùng nó (đã kẹp), không thì
       w/h trong XML. */
    function effectiveLayoutWH(container, layoutId) {
      /* Đợt C: như layoutMinMax — tra đúng, không fallback layout trần. */
      var lay = layoutEntry(container, layoutId);
      if (!lay) return null;
      var ov = winSizes[winSizeKey(container, layoutId)];
      if (ov) { var c = clampWinSize(container, layoutId, ov.w, ov.h); if (c) return c; }
      return { w: lay.w, h: lay.h };
    }
    /* Kéo mép đổi kích thước (việc 6): 3 tay nắm trên cửa sổ kéo được —
       mép phải (rộng), mép đáy (cao), góc dưới-phải (cả 2). Dùng
       mousedown/touchstart như slider (kéo bằng chạm trên điện thoại).
       - Lúc kéo: đổi kích thước hộp cửa sổ + stage/wrap theo (xem trước
         trực tiếp, chia theo tỉ lệ zoom của stage — kéo 100px màn hình
         khi stage đang fit 0.8x = 125px CSS); nội dung vẽ lại 1 lần lúc
         THẢ (re-render theo kích thước mới), không vẽ lại liên tục lúc
         kéo (render bất đồng bộ, kéo liên tục sẽ kẹt/chậm).
       - Lúc thả: setWinSize (kẹp min/max + lưu localStorage qua
         onWinSizeChange) rồi requestRerender.
       - Listener document (mousemove/mouseup/touchmove/touchend) chỉ gắn
         1 lần cho cả renderer (không gắn lại mỗi lần render như slider). */
    var resizeSession = null, resizeDocWired = false;
    function resizeClientPos(e) {
      try {
        if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        if (e.changedTouches && e.changedTouches[0]) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
        return { x: e.clientX || 0, y: e.clientY || 0 };
      } catch (err) { return { x: 0, y: 0 }; }
    }
    function resizeMove(e) {
      var s = resizeSession;
      if (!s) return;
      var p = resizeClientPos(e);
      var dx = (p.x - s.startX) / (s.scaleX || 1), dy = (p.y - s.startY) / (s.scaleY || 1);
      var w = s.startW, h = s.startH;
      if (s.edge === "right" || s.edge === "corner") w = s.startW + dx;
      if (s.edge === "bottom" || s.edge === "corner") h = s.startH + dy;
      var c = clampWinSize(s.container, s.layoutId, w, h);
      if (!c) return;
      s.w = c.w; s.h = c.h;
      try {
        s.live.style.width = c.w + "px";
        s.live.style.height = c.h + "px";
        /* Xem trước: nới stage + wrap theo (kẻo hộp to ra mà bị stage
           overflow:hidden / wrap overflow-y:hidden cắt mất lúc kéo).
           Chỉ nới, không thu (thu lại do re-render lúc thả lo). */
        var stageEl = s.live;
        if (stageEl && stageEl.id !== "stage") stageEl = stageEl.parentElement;
        if (stageEl) {
          var curW = parseInt(stageEl.style.width || "0", 10) || 0;
          if (s.live !== stageEl && c.w > curW) stageEl.style.width = c.w + "px";
          var dh = c.h - s.startH;
          if (dh > 0) {
            var curH = parseInt(stageEl.style.height || "0", 10) || 0;
            if (curH) stageEl.style.height = (curH + dh) + "px";
            var wrap = stageEl.parentElement;
            if (wrap && wrap.id === "stage-wrap") {
              var wh = parseInt(wrap.style.height || "0", 10) || 0;
              if (wh) wrap.style.height = (wh + dh) + "px";
            }
          }
        }
      } catch (err) { /* bỏ qua */ }
      if (e.preventDefault) { try { e.preventDefault(); } catch (err) { /* bỏ qua */ } }
    }
    function resizeEnd() {
      var s = resizeSession;
      resizeSession = null;
      if (!s) return;
      if (s.w !== s.startW || s.h !== s.startH) {
        setWinSize(s.container, s.layoutId, s.w, s.h);
        requestRerender();
      }
    }
    function wireResizeDocOnce() {
      if (resizeDocWired) return;
      resizeDocWired = true;
      try {
        document.addEventListener("mousemove", resizeMove);
        document.addEventListener("mouseup", resizeEnd);
        document.addEventListener("touchmove", resizeMove, { passive: false });
        document.addEventListener("touchend", resizeEnd);
      } catch (err) { /* môi trường test không có document đầy đủ */ }
    }
    function attachResizeHandles(live, container, layoutId) {
      if (!live || !isLayoutResizable(container, layoutId)) return;
      wireResizeDocOnce();
      var edges = [
        { edge: "right", cursor: "ew-resize", css: { right: "0px", top: "0px", width: "10px", height: "100%" } },
        { edge: "bottom", cursor: "ns-resize", css: { left: "0px", bottom: "0px", width: "100%", height: "10px" } },
        { edge: "corner", cursor: "nwse-resize", css: { right: "0px", bottom: "0px", width: "16px", height: "16px" } }
      ];
      for (var i = 0; i < edges.length; i++) {
        (function (spec) {
          var hd = document.createElement("div");
          hd.dataset.resizeEdge = spec.edge;
          hd.dataset.resizeWindow = container + "|" + layoutId;
          hd.title = spec.edge === "corner" ? "Kéo để co giãn cửa sổ" : spec.edge === "right" ? "Kéo để đổi chiều rộng" : "Kéo để đổi chiều cao";
          hd.style.position = "absolute";
          hd.style.left = spec.css.left || "";
          hd.style.right = spec.css.right || "";
          hd.style.top = spec.css.top || "";
          hd.style.bottom = spec.css.bottom || "";
          hd.style.width = spec.css.width;
          hd.style.height = spec.css.height;
          hd.style.cursor = spec.cursor;
          hd.style.zIndex = "30";
          hd.style.pointerEvents = "auto";
          hd.style.background = "transparent";
          hd.style.touchAction = "none";
          function start(e) {
            var p = resizeClientPos(e);
            var startW = parseInt(live.style.width || "0", 10) || 0;
            var startH = parseInt(live.style.height || "0", 10) || 0;
            var scaleX = 1, scaleY = 1;
            try {
              var r = live.getBoundingClientRect ? live.getBoundingClientRect() : null;
              if (r && r.width > 0 && startW > 0) scaleX = r.width / startW;
              if (r && r.height > 0 && startH > 0) scaleY = r.height / startH;
            } catch (err) { /* jsdom: rect 0 → tỉ lệ 1 */ }
            resizeSession = {
              live: live, container: container, layoutId: layoutId, edge: spec.edge,
              startX: p.x, startY: p.y, startW: startW, startH: startH,
              scaleX: scaleX || 1, scaleY: scaleY || 1, w: startW, h: startH
            };
            if (e.preventDefault) { try { e.preventDefault(); } catch (err) { /* bỏ qua */ } }
            if (e.stopPropagation) { try { e.stopPropagation(); } catch (err) { /* bỏ qua */ } }
          }
          hd.addEventListener("mousedown", start);
          hd.addEventListener("touchstart", start, { passive: false });
          live.appendChild(hd);
        })(edges[i]);
      }
    }
    function setDrawerOpen(open) {
      drawerState.open = !!open;
      requestRerender();
    }
    function getDrawerState() { return drawerState; }

    /* ---------- trượt ngăn kéo đợt G (CSS transition trên transform) ----------
       Mở trượt xuống, đóng trượt lên, ~250ms. NGUYÊN TẮC AN TOÀN (rút từ
       lỗi kẹt rAF hai bước của v8): vị trí CUỐI luôn do renderLayout đặt
       thẳng bằng `top` (không qua rAF); transition chỉ làm MƯỢT đường đi
       từ vị trí hiện tại tới vị trí cuối (transform translateY). Nếu
       transition bị gián đoạn (bấm liên tục) thì CSS tự nội suy từ vị trí
       hiện tại; cuối mỗi lần trượt có timeout ép transform về đúng giá trị
       cuối (0 khi mở xong, -dy khi đóng xong) + re-render chốt trạng thái.
       - drawerAnimStartDy: độ dời transform ban đầu cho lần render mở sắp
         tới (âm = ngăn kéo đang ở vị trí đóng). renderLayout đọc + xóa cờ.
       - drawerAnimTimer/token: hủy lần trượt cũ khi bấm liên tục. */
    var DRAWER_ANIM_MS = 250;
    var drawerAnimTimer = 0, drawerAnimToken = 0;
    /* pendingDrawerStartDy: {dy, token} — độ dời transform ban đầu cho lần
       render mở sắp tới. Gắn token của lần gọi toggleDrawerAnimated để
       lần render bay dở của lần gọi CŨ không áp transform cũ lên DOM mới
       khi đã có lần gọi mới hơn chen vào (bấm liên tục: render của lần
       mở cũ đáp xuống sau lần đóng/mở sau → bỏ transform, drawer ở đúng
       vị trí cuối thay vì kẹt ở -103px). */
    var pendingDrawerStartDy = null;
    function drawerAnimDyNow() {
      var T = lastStage;
      if (!T) return null;
      var d = null;
      try { d = T.querySelector('[data-gid="player.normal.drawer"]'); } catch (e) { d = null; }
      if (!d || !d.style.transform) return 0;
      var m = /translateY\(\s*(-?\d+(?:\.\d+)?)px\s*\)/.exec(d.style.transform);
      return m ? parseFloat(m[1]) : 0;
    }
    function setDrawerTransform(d, dy, animate) {
      if (!d) return;
      if (animate) d.style.transition = "transform " + DRAWER_ANIM_MS + "ms ease";
      else d.style.transition = "none";
      d.style.transform = "translateY(" + dy + "px)";
    }
    function clearDrawerTransform(d) {
      if (!d) return;
      d.style.transition = "";
      d.style.transform = "";
    }
    /* Đợt 9.5 (lỗi 6): đặt chiều cao stage/wrap theo độ dời ngăn kéo để
       đáy stage bám đáy ngăn kéo lúc trượt — không lộ nền đen #000 bên
       dưới ngăn kéo. dy âm = đóng (thu lại): chiều cao đóng = chiều cao
       hiện tại + dy (dy = targetDy = top đóng - top mở = -snap, vd -116).
       Wrap co theo tỉ lệ (giữ nguyên zoom scale). Lúc MỞ không cần gọi:
       renderLayout (swapIn) đã đặt chiều cao cuối, transition height ở
       CSS chạy cùng lúc với transform trượt (cùng 250ms ease). Không có
       stage/wrap (test jsdom) thì bỏ qua. */
    function setDrawerStageHeight(dy) {
      if (!dy) return;
      var T = lastStage;
      if (!T) return;
      var curH = parseInt((T.style && T.style.height) || "0", 10);
      if (!curH) { try { curH = Math.round(T.getBoundingClientRect().height); } catch (e) { curH = 0; } }
      if (!curH) return;
      var newH = curH + dy;
      if (newH < 0) newH = 0;
      T.style.height = newH + "px";
      var wrap = null;
      try { wrap = document.getElementById("stage-wrap") || document.querySelector("#stage-wrap"); } catch (e) { wrap = null; }
      if (wrap) {
        var curW = parseInt((wrap.style && wrap.style.height) || "0", 10);
        if (curW) wrap.style.height = Math.round(curW * newH / curH) + "px";
      }
    }
    /* Đọc vị trí transform hiện tại của ngăn kéo + bóng (dùng khi đảo chiều
       giữa chừng: bắt đầu lần trượt mới từ đúng chỗ đang dừng). */
    function drawerAnimEls() {
      var T = lastStage, out = { d: null, sh: null };
      if (!T) return out;
      try { out.d = T.querySelector('[data-gid="player.normal.drawer"]'); } catch (e) { out.d = null; }
      try { out.sh = T.querySelector('[data-gid="player.normal.drawer.shadow"]'); } catch (e) { out.sh = null; }
      return out;
    }
    /* Trượt ngăn kéo có animation. Trả về Promise hoàn thành khi về đúng
       vị trí cuối (để index.html chạy self-check sau đó). Bấm liên tục:
       lần gọi sau hủy timer lần trước (token) và bắt đầu từ transform
       hiện tại nên không bao giờ kẹt giữa chừng. */
    function toggleDrawerAnimated(open) {
      open = !!open;
      /* Đợt B (9.9) — "Animate Config Drawer" tắt thì mở/đóng ngăn kéo TỨC THÌ
         (không trượt 250ms): vẽ thẳng trạng thái cuối như setDrawerOpen. */
      if (!drawerAnimEnabled()) { setDrawerOpen(open); return Promise.resolve(true); }
      var myToken = ++drawerAnimToken;
      if (drawerAnimTimer) { clearTimeout(drawerAnimTimer); drawerAnimTimer = 0; }
      /* Chưa vẽ lần nào / không có ngăn kéo trong DOM: vẽ thẳng, không animation. */
      var els = drawerAnimEls();
      if (!els.d) { setDrawerOpen(open); return Promise.resolve(false); }
      if (open === drawerState.open) {
        /* Đã đúng trạng thái: nếu đang dở animation (transform != 0) thì
           trượt MƯỢT về 0 thay vì nhảy thẳng (bấm đảo chiều giữa chừng). */
        var cur = drawerAnimDyNow() || 0;
        if (cur !== 0) {
          setDrawerTransform(els.d, 0, true);
          setDrawerTransform(els.sh, 0, true);
          drawerAnimTimer = setTimeout(function () {
            if (myToken !== drawerAnimToken) return;
            var e3 = drawerAnimEls();
            clearDrawerTransform(e3.d); clearDrawerTransform(e3.sh);
            drawerAnimTimer = 0;
          }, DRAWER_ANIM_MS + 80);
          return new Promise(function (resolve) { setTimeout(function () { resolve(myToken === drawerAnimToken); }, DRAWER_ANIM_MS + 120); });
        }
        clearDrawerTransform(els.d); clearDrawerTransform(els.sh);
        return Promise.resolve(true);
      }
      if (open) {
        /* MỞ: render trạng thái mở (top cuối = 130) với transform ban đầu
           = vị trí đóng hiện tại (âm), rồi trượt về 0. */
        var startDy = drawerAnimDyNow();
        if (!startDy) {
          /* Đang ở vị trí đóng (transform 0, top 27): độ dời = top đóng - top mở. */
          var tops = lastDrawerTops();
          startDy = (tops.closed !== null && tops.open !== null) ? (tops.closed - tops.open) : -103;
        }
        if (startDy >= 0) startDy = -103; /* phòng thủ: mở luôn đi xuống */
        pendingDrawerStartDy = { dy: startDy, token: myToken };
        drawerState.open = true;
        var p = null;
        try { p = onRerender ? onRerender() : null; } catch (e) { p = null; }
        var done = false;
        var finish = function () {
          if (done || myToken !== drawerAnimToken) return;
          done = true;
          var e2 = drawerAnimEls();
          /* Ép reflow để transition đăng ký trước khi đổi transform
             (không thì lần trượt đầu có thể nhảy thẳng thay vì trượt). */
          if (e2.d) { try { void e2.d.offsetHeight; } catch (e) { /* jsdom */ } }
          setDrawerTransform(e2.d, 0, true);
          setDrawerTransform(e2.sh, 0, true);
          drawerAnimTimer = setTimeout(function () {
            if (myToken !== drawerAnimToken) return;
            var e3 = drawerAnimEls();
            clearDrawerTransform(e3.d); clearDrawerTransform(e3.sh);
            drawerAnimTimer = 0;
          }, DRAWER_ANIM_MS + 80);
        };
        if (p && typeof p.then === "function") p.then(function () { finish(); }, function () { finish(); });
        else setTimeout(finish, 30);
        /* Fallback cứng: render treo thì vẫn ép về vị trí cuối sau 600ms. */
        setTimeout(function () { if (!done) finish(); }, 600);
        return new Promise(function (resolve) { setTimeout(function () { resolve(myToken === drawerAnimToken); }, DRAWER_ANIM_MS + 120); });
      }
      /* ĐÓNG: trượt ngăn kéo đang mở lên vị trí đóng, rồi re-render chốt. */
      var tops2 = lastDrawerTops();
      var targetDy = (tops2.closed !== null && tops2.open !== null) ? (tops2.closed - tops2.open) : -103;
      if (targetDy >= 0) targetDy = -103;
      /* Lỗi 2 (9.4): ẩn các tab ([data-tab]) NGAY khi bắt đầu đóng, trước
         khi trượt. Không thì dải tab (nền sáng + chữ EQUALIZER / OPTIONS /
         COLOR THEMES ở đáy ngăn kéo) trượt lên qua mép cửa sổ chính trong
         250ms và hiện thành lằn ngang thoáng qua — vì ngăn kéo vẽ ĐÈ lên
         cửa sổ chính (không bị cửa sổ chính che như Winamp thật, nơi ngăn
         kéo trượt chìm xuống sau cửa sổ chính). Re-render sau khi đóng vẽ
         lại ngăn kéo không có tab (v9.3), nên việc ẩn ở đây chỉ tạm thời
         trong lúc trượt; mở lại giữa chừng thì re-render vẽ lại tab.
         XML không quy định hành vi lúc trượt — đã chọn ẩn tab lúc đóng
         để mép cửa sổ chính sạch trong suốt quá trình trượt. */
      try {
        var tabElsClose = els.d.querySelectorAll("[data-tab]");
        for (var tci = 0; tci < tabElsClose.length; tci++) tabElsClose[tci].style.display = "none";
      } catch (e) { /* bỏ qua */ }
      setDrawerTransform(els.d, targetDy, true);
      setDrawerTransform(els.sh, targetDy, true);
      /* Đợt 9.5 (lỗi 6): thu chiều cao stage/wrap về giá trị đóng NGAY lúc
         bắt đầu trượt (cùng 250ms ease với transform) để đáy stage bám đáy
         ngăn kéo đang trượt lên — không còn nền đen #000 lộ ra dưới ngăn
         kéo. (Trước đây chiều cao chỉ thu lại SAU khi trượt xong, lúc
         re-render, nên suốt 250ms trượt đóng vẫn lộ nền đen dưới ngăn kéo.)
         Re-render sau đó đặt lại đúng giá trị đóng, không đổi gì thêm. */
      setDrawerStageHeight(targetDy);
      drawerAnimTimer = setTimeout(function () {
        if (myToken !== drawerAnimToken) return;
        drawerAnimTimer = 0;
        drawerState.open = false;
        if (onRerender) { try { onRerender(); } catch (e) { /* bỏ qua */ } }
      }, DRAWER_ANIM_MS + 30);
      return new Promise(function (resolve) { setTimeout(function () { resolve(myToken === drawerAnimToken); }, DRAWER_ANIM_MS + 120); });
    }
    /* Vị trí top của ngăn kéo khi đóng/mở theo lần render gần nhất
       (dùng để tính độ dời animation; null khi chưa render). */
    var lastDrawerTopCache = { open: null, closed: null };
    function lastDrawerTops() { return lastDrawerTopCache; }

    /* ---------- mute shade (đợt G) ----------
       shademute là togglebutton không có cfgattrib/action trong XML nên
       dùng khóa cfg tổng hợp "SHADE_MUTE" (ảnh activeImage =
       shade.button.mute.on khi bật). Mute chỉ tắt tiếng ở engine
       (setVolume 0), GIỮ NGUYÊN demo.volume + volumebar (Winamp gốc
       cũng không hạ thanh volume khi mute). Kéo slider volume lúc đang
       mute thì đổi demo.volume nhưng engine vẫn 0 cho tới khi bỏ mute. */
    function isShadeMuted() { return cfgState.get("SHADE_MUTE") === "on"; }
    function applyEngineVolume() {
      if (!audioEngine) return;
      try { audioEngine.setVolume(isShadeMuted() ? 0 : demo.volume); } catch (e) { /* bỏ qua */ }
    }
    function toggleShadeMute() {
      var on = !isShadeMuted();
      cfgState.set("SHADE_MUTE", on ? "on" : "off");
      applyEngineVolume();
      refreshCfgGroup("SHADE_MUTE");
    }

    /* ---------- state AVS/Video (đợt D) ----------
       - open: vùng AVS/cửa sổ rời đang mở hay đóng.
       - detached: true = đang ở cửa sổ RỜI; false = đang ở vùng NHÚNG
         (chỉ có nghĩa khi skin có embeddedAvs; Classic luôn detached).
       - mode: "video" | "vis" — chế độ đang hiện trong vùng/cửa sổ.
       - videoScale: 1 = vừa khung video.group, 2 = phóng 2× (scale CSS,
         căn giữa, phần thừa cắt bởi overflow:hidden của hộp).
       - visVariant: kiểu hiệu ứng 0..2 (đổi màu cột, VIS_Prev/Next).
       - visRandom: nút Random + LED (cfgattrib ...;Random trong skin).
       - videoInfo: "WxH" khi có metadata video (hiện ở VID_Info).
       Đóng AVS KHÔNG dừng tiếng: closeAvs chỉ đổi state/cửa sổ, không
       đụng playlistState.playing (đợt D chưa có tiếng thật; đợt E nối
       tiếng vào đây — tiếng vẫn phát khi ẩn hình). */
    var onAvsChange = opts.onAvsChange || null; /* đợt D: index.html lưu state để restore lúc nạp trang (đường d) */
    var avsState = {
      open: false, detached: false, mode: "video",
      videoScale: 1, visVariant: 0, visRandom: false, videoInfo: "",
      /* Đợt D (9.9): videoMaximized = cửa sổ Video/Vis rời đang phóng to
         (khôi phục = về cỡ mặc định); keepAspect = "Giữ tỉ lệ khung hình"
         trong menu Video (mặc định bật như Winamp). */
      videoMaximized: false, keepAspect: true
    };
    /* Đợt D (9.9) — Beat Visualization: nhóm player.normal.display.beatvisualization
       (2 cột beat trái/phải, filmstrip 15 khung) có visible="0" trong XML,
       MAKI gốc ẩn/hiện theo tùy chọn "Enable Beat Visualization". Amp giữ
       1 cờ duy nhất theo tùy chọn đó (mặc định theo CFG_DEFAULTS: bật);
       xem setBeatVisOn / renderLayoutInner (override hiện nhóm). */
    var beatVisOn = false;
    var avsMedia = null; /* {wrap, video, canvas} — tạo 1 lần, DI CHUYỂN giữa hộp nhúng/rời (không tạo lại để khỏi mất trạng thái phát) */
    var avsAnalyser = null; /* ĐIỂM NỐI ĐỢT E: AnalyserNode của chuỗi EQ (audio.js
       đăng ký qua setAvsAnalyser ngay khi tạo graph). Đợt B (9.9): drawVisStatic
       vẽ theo tần số thật KHI EQ BẬT + analyser có tín hiệu; EQ tắt (tiếng đi
       thẳng loa, analyser đọc 0) thì giữ vạch mẫu sine; EQ bật mà analyser im
       (đài không CORS nên câm, hoặc đang tạm dừng) thì vis PHẲNG (im) — không
       vẽ vạch mẫu giả vờ có nhạc. Xem drawVisStatic. */
    var avsPhase = 0, avsRafId = 0, avsFullscreenAttempted = false;
    var lastVisFrame = { mode: "sample", maxBin: 0, heights: [] }; /* Đợt B (9.9): khung vis vẽ gần nhất (cho test + debug) */
    var avsPhase = 0, avsRafId = 0, avsFullscreenAttempted = false;
    function persistAvs() {
      if (onAvsChange) { try { onAvsChange(getAvsState()); } catch (e) { /* lưu state thất bại thì thôi */ } }
    }
    function notifyAvsChange() { persistAvs(); requestRerender(); }
    function getAvsState() {
      return {
        open: avsState.open, detached: avsState.detached, mode: avsState.mode,
        videoScale: avsState.videoScale, visVariant: avsState.visVariant,
        visRandom: avsState.visRandom, videoInfo: avsState.videoInfo,
        videoMaximized: avsState.videoMaximized, keepAspect: avsState.keepAspect,
        hasEmbedded: !!RES.embeddedAvs, fullscreenAttempted: avsFullscreenAttempted
      };
    }
    /* Kênh nào là video (đường (a) loadChannel autoplay, theo heuristic
       v8 channelIsVideo — GIỮ NGUYÊN, không mở rộng bừa):
       - item.video === true/false: cờ tường minh thắng hết.
       - nhóm chứa "hình"/"video".
       - link .mp4/.m4v/.mov/.webm.
       - link qua 2 host TV đã xác nhận (mediatech.vn, truyenhinhnghean.vn).
       .m3u8 CHUNG CHUNG không tính là video (radio HLS cũng .m3u8).
       Đợt L (9.8) — LỖI TV360 3/11: mọi kênh TV360 qua vmttv
       (https://vmttv.dpdns.org/tv360/?id=N) đều nghe được tiếng mà
       KHÔNG thấy hình, kể cả id=4 (VTV3) vốn xem được cả hình lẫn
       tiếng trên IPTV Viewer/Radio TV. Nguyên nhân: URL vmttv không
       khớp luật nào ở trên (không .mp4, không host cũ, group "TV360"
       không chứa "hình"/"video") nên isVideoItem trả false → audio.js
       dùng thẻ <audio> phát (nghe được tiếng), thẻ <video> trong vùng
       AVS không bao giờ được gán src (đen trống). Sửa: thêm nhận diện
       nguồn TV vào 3 hằng TV_* dưới đây (host proxy TV / đường dẫn
       / group-title). Mọi kênh TV360 đều qua chung 1 host vmttv
       (redirect 302 tới HLS tv360.vn, có token) nên luật host bao
       hết mọi id, không riêng id=2 hay id=4.
       - Host: vmttv.dpdns.org — proxy TV duy nhất đã xác nhận bằng
         curl 3/11 (id=2 → fo-hlc.tv360.vn, id=4 → rr1-ateme.tv360.vn,
         cả hai đều là master HLS có video avc1). Chỉ thêm host nào
         đã đo thật; đừng đoán thêm.
       - Đường dẫn: /tv360/ và /VTVGo/ (vd vmttv .../VTVGo/?sctv1).
       - Group-title: "TV360" (khớp đúng tên), nhóm chứa "TV" hoặc
         "Truyền hình". Chỉ xét it.group (không xét it.name) để đài
         radio có chữ "TV" trong tên không bị nhận nhầm. */
    var TV_PROXY_HOSTS = ["vmttv.dpdns.org"];
    var TV_PATH_RE = /\/(tv360|vtvgo)\//i;
    /* Nhóm chứa "TV" (vd "TV360", "SCTV", "VTV", "HTV", "VTVcab",
       "Kênh TV", "LƯƠNG SƠN TV") hoặc "Truyền hình". CHỈ xét it.group,
       KHÔNG xét it.name — đài radio có chữ "TV" trong TÊN bài/kênh
       không bị nhận nhầm. Đã đối chiếu với file kênh thật của người
       dùng (channels-clean.m3u, 3/11): không có group radio nào chứa
       "TV" ("Radio", "UK Radio", "Địa phương", "Quốc Tế"...); mọi
       group chứa "TV" đều là kênh hình. */
    var TV_GROUP_RE = /TV|truyền hình/i;
    function isVideoItem(it) {
      if (!it) return false;
      if (it.video === true) return true;
      if (it.video === false) return false;
      if (/hình|video/i.test(it.group || "")) return true;
      if (TV_GROUP_RE.test(it.group || "")) return true;
      var url = it.url || "";
      if (/\.(mp4|m4v|mov|webm)($|\?)/i.test(url)) return true;
      if (/mediatech\.vn|truyenhinhnghean\.vn/i.test(url)) return true;
      for (var hi = 0; hi < TV_PROXY_HOSTS.length; hi++) {
        if (url.toLowerCase().indexOf(TV_PROXY_HOSTS[hi]) >= 0) return true;
      }
      if (TV_PATH_RE.test(url)) return true;
      return false;
    }
    /* Đợt B (9.9) — vòng vis chạy khi AVS mở HOẶC đang phát (trước đây chỉ khi
       AVS mở nên vis cửa sổ chính đứng yên 1 khung tĩnh sau mỗi lần render).
       Dừng khi cả 2 đều không còn (đóng AVS + dừng phát) thì vẽ 1 khung cuối
       cho vis về trạng thái đúng (phẳng khi EQ bật im tiếng, mẫu khi EQ tắt). */
    function syncAvsAnim() { if (avsState.open || demo.playing) startAvsAnim(); else stopAvsAnim(); }
    /* Mở video/vis — ĐƯỜNG RẼ TRUNG TÂM (DESIGN-CONSTRAINTS.md §1):
       skin CÓ embeddedAvs → vùng nhúng; KHÔNG có → cửa sổ rời. Khi đang
       mở rồi thì chỉ đổi mode, giữ nguyên detached (đừng kéo cửa sổ rời
       về nhúng chỉ vì bấm lại menu View). */
    function openAvs(mode) {
      if (mode === "vis" || mode === "video") avsState.mode = mode;
      /* Đợt B (9.9): mở lần đầu thì tách rời luôn nếu tùy chọn "Detach Vis/Video
         Window" đang bật ở chế độ đó; skin Classic không có nhúng nên vẫn rời. */
      if (!avsState.open) avsState.detached = !RES.embeddedAvs || detachOptionOn(avsState.mode);
      avsState.open = true;
      syncAvsAnim();
      notifyAvsChange();
      return getAvsState();
    }
    function closeAvs() {
      avsState.open = false;
      avsState.detached = false;
      syncAvsAnim();
      notifyAvsChange();
      return getAvsState();
    }
    function setAvsMode(mode) {
      if (mode !== "vis" && mode !== "video") return getAvsState();
      if (avsState.mode === mode) return getAvsState();
      avsState.mode = mode;
      if (avsState.open) notifyAvsChange(); else persistAvs();
      return getAvsState();
    }
    function toggleAvsMode() { return setAvsMode(avsState.mode === "vis" ? "video" : "vis"); }
    /* Đợt D (9.9) — VID_TV / menu View → Video: mở/đóng cửa sổ Video (bật/tắt,
       như nút TV trong Winamp). Đang mở ở chế độ video thì đóng; chưa mở
       hoặc đang ở vis thì mở video. */
    function toggleVideoWindow() {
      if (avsState.open && avsState.mode === "video") return closeAvs();
      return openAvs("video");
    }
    /* Đợt D (9.9) — VID_MAX / Restore (phóng to / khôi phục cửa sổ Video/Vis
       RỜI): chỉ có nghĩa với cửa sổ rời — video nhúng trong main không thể
       to hơn main nên phóng to = tách rời trước rồi mới phóng (Winamp thật
       cũng phóng to CỬA SỔ video, không phóng vùng nhúng). Khôi phục chỉ thu
       nhỏ về cỡ mặc định, VẪN tách rời (không tự gắn lại — muốn gắn lại bấm
       Reattach). Cỡ phóng to 960×540 là QUYẾT ĐỊNH CỦA AMP (XML không quy
       định cỡ maximize; Winamp desktop phóng đầy màn hình — web không có
       màn hình riêng của cửa sổ nên chọn 960×540, zoom fit của trang sẽ thu
       lại cho vừa điện thoại). */
    var VIDEO_MAXIMIZED_W = 960, VIDEO_MAXIMIZED_H = 540;
    function setVideoMaximized(on) {
      on = !!on;
      if (on) {
        if (!avsState.open) openAvs(avsState.mode);
        if (RES.embeddedAvs && !avsState.detached) avsState.detached = true;
        avsState.videoMaximized = true;
      } else {
        avsState.videoMaximized = false;
      }
      syncAvsAnim();
      notifyAvsChange();
      return getAvsState();
    }
    /* Detach: chỉ có nghĩa khi đang mở NHÚNG (Modern). Skin Classic đã
       rời sẵn nên không làm gì. Chưa mở thì không làm gì (nút Detach chỉ
       hiện khi đang mở — xem AVS_MODE_GROUPS + overrides ở renderLayout). */
    function detachAvs() {
      if (!RES.embeddedAvs || !avsState.open || avsState.detached) return getAvsState();
      avsState.detached = true;
      notifyAvsChange();
      return getAvsState();
    }
    /* Reattach: chỉ có nghĩa khi đang ở cửa sổ rời CỦA SKIN CÓ nhúng.
       Classic không có vùng nhúng để về nên không làm gì. */
    function reattachAvs() {
      if (!RES.embeddedAvs || !avsState.detached) return getAvsState();
      avsState.detached = false;
      notifyAvsChange();
      return getAvsState();
    }
    function applyVideoScaleToEl() {
      if (!avsMedia) return;
      var v = avsMedia.video;
      /* Đợt D (9.9): "Giữ tỉ lệ khung hình" (menu Video) — bật: contain
         (khung đen 2 bên khi tỉ lệ lệch, như Winamp); tắt: fill (kéo giãn
         đầy khung). Mặc định bật. */
      v.style.objectFit = avsState.keepAspect ? "contain" : "fill";
      v.style.transform = avsState.videoScale === 2 ? "scale(2)" : "";
      v.style.transformOrigin = "center center";
    }
    function setKeepAspect(on) {
      avsState.keepAspect = !!on;
      applyVideoScaleToEl();
      persistAvs();
      return avsState.keepAspect;
    }
    /* Đợt D (9.9) — Beat Visualization (bật/tắt hiệu ứng beat):
       - on: hiện nhóm player.normal.display.beatvisualization trong display
         (nhóm có visible="0" trong XML — xem override ở renderLayoutInner)
         + ghi đè tùy chọn Options "Enable Beat Visualization" cho khớp
         (checkbox trong ngăn kéo Options và nút beat trong display là 1
         trạng thái, như Winamp thật).
       - off: ẩn nhóm + tắt tùy chọn.
       Nhóm đặt tràn mép phải cửa sổ theo đúng XML (xem comment ở override)
       nên luôn render thẳng, KHÔNG trigger vẽ lại khi đổi trạng thái phát
       (đã thử trigger ở updateStatusEls: gọi requestRerender giữa lúc
       render đang chạy → re-entrancy → shade-test/vis-test crash/treo).
       Khung beat (filmstrip 15 khung) đổi theo nhạc thật qua analyser
       (xem updateBeatFrames trong drawVisStatic); không có tín hiệu thì
       đứng ở khung 0 — KHÔNG vẽ mẫu giả vờ có nhạc.
       Trả trạng thái mới. */
    function setBeatVisOn(on) {
      beatVisOn = !!on;
      var at = null;
      try { at = cfgAttribBySuffix("Enable Beat Visualization"); } catch (e) { at = null; }
      if (at) { cfgState.set(at, beatVisOn ? "on" : "off"); refreshCfgGroup(at); persistCfg(); }
      requestRerender();
      return beatVisOn;
    }
    function getBeatVisState() {
      var frames = 0;
      for (var i = 0; i < animLayerRecs.length; i++) if (animLayerRecs[i].beat && animLayerRecs[i].frames > frames) frames = animLayerRecs[i].frames;
      return { on: beatVisOn, frames: frames, animated: frames > 1 && !!avsAnalyser };
    }
    function setVideoScale(n) {
      avsState.videoScale = (n === 2) ? 2 : 1;
      applyVideoScaleToEl();
      persistAvs(); /* chỉ lưu state, không re-render (style đã áp trực tiếp) */
      return avsState.videoScale;
    }
    /* Fullscreen: video → requestFullscreen trên thẻ <video>; vis → trên
       canvas hiệu ứng. Đang fullscreen thì thoát. jsdom không có
       requestFullscreen → trả false, chỉ ghi nhận đã thử (test kiểm
       state, không kiểm fullscreen thật). */
    function requestVideoFullscreen() {
      avsFullscreenAttempted = true;
      try {
        if (typeof document !== "undefined" && document.fullscreenElement) {
          if (document.exitFullscreen) {
            var p0 = document.exitFullscreen();
            if (p0 && p0.catch) p0.catch(function () {});
          }
          return true;
        }
      } catch (e) { /* jsdom */ }
      var target = null;
      if (avsMedia) target = avsState.mode === "video" ? avsMedia.video : avsMedia.canvas;
      if (!target) return false;
      try {
        if (target.requestFullscreen) {
          var p = target.requestFullscreen();
          if (p && p.catch) p.catch(function () {});
          return true;
        }
        if (target.webkitEnterFullscreen) { target.webkitEnterFullscreen(); return true; }
      } catch (e) { return false; }
      return false;
    }
    function cycleVisVariant(d) {
      var n = VIS_VARIANTS.length;
      avsState.visVariant = (((avsState.visVariant + (d || 1)) % n) + n) % n;
      drawVisStatic();
      persistAvs();
      return avsState.visVariant;
    }
    function setAvsAnalyser(node) { avsAnalyser = node || null; return !!avsAnalyser; }
    function getAvsAnalyser() { return avsAnalyser; }
    /* Khôi phục trạng thái đã lưu (đường (d) — index.html lưu qua
       onAvsChange vào localStorage "amp9-avs-v9" rồi gọi hàm này lúc nạp
       trang, TRƯỚC lần render đầu). Skin Classic thì open=true luôn đi
       cửa sổ rời (không có nhúng để về). Không tự re-render — caller vẽ
       sau khi restore. */
    function restoreAvsState(saved) {
      if (!saved) return getAvsState();
      if (saved.mode === "vis" || saved.mode === "video") avsState.mode = saved.mode;
      avsState.videoScale = saved.videoScale === 2 ? 2 : 1;
      if (typeof saved.visVariant === "number") {
        var n = VIS_VARIANTS.length;
        avsState.visVariant = (((saved.visVariant % n) + n) % n);
      }
      avsState.visRandom = !!saved.visRandom;
      if (saved.videoInfo) avsState.videoInfo = String(saved.videoInfo);
      /* Đợt D (9.9): khôi phục phóng to + giữ tỉ lệ. Phóng to chỉ có nghĩa
         khi cửa sổ đang mở và tách rời (nhúng trong main không phóng được
         — xem setVideoMaximized). */
      if (typeof saved.keepAspect === "boolean") avsState.keepAspect = saved.keepAspect;
      avsState.videoMaximized = false;
      if (saved.open) {
        avsState.open = true;
        avsState.detached = RES.embeddedAvs ? !!saved.detached : true;
        if (saved.videoMaximized && avsState.detached) avsState.videoMaximized = true;
      } else {
        avsState.open = false;
        avsState.detached = false;
      }
      syncAvsAnim();
      return getAvsState();
    }
    function getAvsMedia() {
      var m = ensureAvsMedia();
      return { wrap: m.wrap, video: m.video, canvas: m.canvas };
    }
    /* Thẻ <video> MỚI (đợt E — fresh element): engine nhờ reset khi EQ tắt
       mà thẻ cũ đã có MediaElementSource + URL cross-origin (thẻ cũ nạp
       không-CORS sẽ câm qua graph). Dừng + xóa src thẻ cũ, lần
       ensureAvsMedia sau tạo thẻ mới (kèm listener loadedmetadata/
       dblclick như cũ). Trả false khi chưa có media nào. */
    function resetAvsMedia() {
      if (!avsMedia) return false;
      try { avsMedia.video.pause(); } catch (e) { /* bỏ qua */ }
      try { avsMedia.video.removeAttribute("src"); avsMedia.video.load(); } catch (e) { /* bỏ qua */ }
      avsMedia = null;
      return true;
    }

    /* ---------- phát tiếng (đợt E) — nối renderer với audio.js ----------
       audioEngine do index.html tạo (AmpAudio.createAudioEngine) rồi gắn
       qua setAudioEngine (tránh vòng tròn: engine cần getVideoEl/
       isVideoItem của renderer). Không có engine (test đợt A–D) thì mọi
       đường gọi đều có guard — state phát vẫn chạy như cũ (chưa có tiếng).
       - tickerError: chữ đỏ không dấu trên dòng chữ chạy (kênh lỗi / mục
         chưa có link nhạc). setTickerText ưu tiên hiện nó, màu đỏ.
       - onPlaybackChange: index.html lưu state phát vào localStorage. */
    var audioEngine = opts.audioEngine || null;
    var onPlaybackChange = opts.onPlaybackChange || null;
    var tickerError = "";
    function setAudioEngine(engine) { audioEngine = engine || null; }
    function getAudioEngine() { return audioEngine; }
    function getEqState() {
      var bands = [];
      for (var i = 0; i < EQ_BAND_IDS.length; i++) {
        var v = drawerState.eqBands[EQ_BAND_IDS[i]];
        bands.push(v !== undefined ? v : 0.5);
      }
      return { on: !!drawerState.eqOn, preamp: bands[0], bands: bands };
    }
    function persistPlayback() {
      if (onPlaybackChange) { try { onPlaybackChange(getPlaybackState()); } catch (e) { /* lưu thất bại thì thôi */ } }
    }
    function getPlaybackState() {
      return {
        playing: playlistState.playing, currentIndex: playlistState.current,
        repeat: demo.repeat, shuffle: demo.shuffle, volume: demo.volume,
        eqOn: drawerState.eqOn, eqBands: Object.assign({}, drawerState.eqBands),
        balance: drawerState.balance /* Đợt D (9.9): PAN — khôi phục vị trí Balance */
      };
    }
    /* Khôi phục state phát đã lưu (index.html gọi sau khi nạp radio.m3u,
       TRƯỚC khi người dùng bấm phát). Không tự phát lại (playing=false
       lúc nạp trang); mục local (file đã chọn tay) không khôi phục được
       vì trình duyệt không nhớ file local. */
    function restorePlaybackState(saved) {
      if (!saved) return false;
      if (typeof saved.volume === "number") {
        demo.volume = Math.max(0, Math.min(1, saved.volume));
        updateVolumebar();
        /* Đợt G — đang mute shade thì engine vẫn 0, không đẩy volume vào. */
        applyEngineVolume();
      }
      if (saved.repeat === 0 || saved.repeat === 1 || saved.repeat === -1) demo.repeat = saved.repeat;
      if (typeof saved.shuffle === "boolean") demo.shuffle = saved.shuffle;
      if (typeof saved.eqOn === "boolean") {
        drawerState.eqOn = saved.eqOn; demo.eq = saved.eqOn;
        cfgState.set("EQ_TOGGLE", saved.eqOn ? "on" : "off");
        refreshCfgGroup("EQ_TOGGLE");
      }
      if (saved.eqBands) {
        for (var i = 0; i < EQ_BAND_IDS.length; i++) {
          var id = EQ_BAND_IDS[i];
          if (typeof saved.eqBands[id] === "number") drawerState.eqBands[id] = Math.max(0, Math.min(1, saved.eqBands[id]));
        }
        for (var j = 0; j < sliderRecords.length; j++) {
          var rec = sliderRecords[j];
          if (rec.action === "EQ_BAND" && drawerState.eqBands[rec.sliderId] !== undefined) rec.setFrac(drawerState.eqBands[rec.sliderId], true);
          if (rec.action === "VOLUME") rec.setFrac(demo.volume, true);
        }
        if (audioEngine) {
          var st = getEqState();
          audioEngine.setPreamp(st.preamp);
          for (var k = 1; k <= 10; k++) audioEngine.setEqBand(k, st.bands[k]);
        }
      }
      /* Đồng bộ LED Shuffle/Repeat (cfgattrib dạng "{GUID};Shuffle" /
         "{GUID};Repeat" trong skin — tìm theo hậu tố, không hardcode GUID). */
      var keys = Object.keys(cfgGroups);
      for (var m = 0; m < keys.length; m++) {
        if (/;Shuffle$/.test(keys[m])) { cfgState.set(keys[m], demo.shuffle ? "on" : "off"); refreshCfgGroup(keys[m]); }
        if (/;Repeat$/.test(keys[m])) { cfgState.set(keys[m], String(demo.repeat)); refreshCfgGroup(keys[m]); }
      }
      /* Đợt D (9.9): khôi phục vị trí Balance (PAN) đã lưu — đẩy xuống engine
         (StereoPannerNode) + slider PAN đang hiển thị (nếu có). */
      if (typeof saved.balance === "number") {
        drawerState.balance = Math.max(0, Math.min(1, saved.balance));
        if (audioEngine && audioEngine.setPan) { try { audioEngine.setPan(drawerState.balance); } catch (e) { /* bỏ qua */ } }
        for (var bi2 = 0; bi2 < sliderRecords.length; bi2++) {
          var rec2 = sliderRecords[bi2];
          if (rec2 && rec2.action === "PAN" && typeof rec2.setFrac === "function") {
            try { rec2.setFrac(drawerState.balance, true); } catch (e) { /* bỏ qua */ }
          }
        }
      }
      if (typeof saved.currentIndex === "number" && playlistState.items.length) {
        var idx = clampPlaylistIdx(saved.currentIndex);
        var it = playlistState.items[idx];
        if (it && !it.local) {
          playlistState.current = idx; playlistState.selected = idx;
          if (it.kind === "track") {
            for (var di = 0; di < DEMO_TRACKS.length; di++) {
              if (DEMO_TRACKS[di].name === it.name) { demo.track = di; break; }
            }
          }
          refreshPlaylistRows();
          for (var n = 0; n < tickerEls.length; n++) setTickerText(tickerEls[n]);
        }
      }
      return true;
    }
    function showTickerError(msg) {
      tickerError = String(msg || "");
      for (var i = 0; i < tickerEls.length; i++) setTickerText(tickerEls[i]);
    }
    function clearTickerError() {
      if (!tickerError) return;
      tickerError = "";
      for (var i = 0; i < tickerEls.length; i++) setTickerText(tickerEls[i]);
    }
    function getTickerError() { return tickerError; }
    /* Phát mục hiện tại qua engine. Mục không có URL (không có file
       nhạc thật) -> chỉ hiện trạng thái, không crash, không bịa tiếng. */
    function startPlaybackForCurrent() {
      var it = playlistState.items[playlistState.current];
      if (!it) return { ok: false, reason: "empty" };
      if (!it.url) {
        showTickerError("muc nay chua co link nhac");
        return { ok: false, reason: "no-url" };
      }
      clearTickerError();
      if (!audioEngine) return { ok: false, reason: "no-engine" };
      return audioEngine.playItem(it, getEqState());
    }
    function playCurrentItem() {
      if (!playlistState.items.length) return false;
      return playPlaylistItem(playlistState.current);
    }
    function nextTrack(wrap) {
      if (!playlistState.items.length) return false;
      var n = playlistState.items.length, idx = playlistState.current;
      if (demo.shuffle && n > 1) {
        var r = idx;
        while (r === idx) r = Math.floor(Math.random() * n);
        idx = r;
      } else {
        idx = idx + 1;
        if (idx >= n) {
          if (wrap) idx = 0;
          else return false;
        }
      }
      return playPlaylistItem(idx);
    }
    function prevTrack() {
      if (!playlistState.items.length) return false;
      var idx = playlistState.current - 1;
      if (idx < 0) idx = demo.repeat === 1 ? playlistState.items.length - 1 : 0;
      return playPlaylistItem(idx);
    }
    /* Nút Play/Pause trên skin + phím Space: đang phát thì tạm dừng,
       đang dừng thì phát tiếp; chưa có media nào thì phát mục hiện tại. */
    function togglePlay() {
      if (audioEngine) {
        var r = audioEngine.togglePlay();
        if (r && r.ok) return true;
        if (r && r.reason === "nothing") return playCurrentItem();
        return true;
      }
      return playCurrentItem();
    }
    function stopPlayback() {
      if (audioEngine) audioEngine.stop();
      playlistState.playing = false; demo.playing = false;
      demo.t = 0; demo.seekFrac = 0; demo.dur = undefined; /* Đợt A (9.9, việc 4): dừng thì quên thời lượng bài cũ */
      updateStatusEls(); updateTimerEls(); updateProgress(); refreshPlaylistRows();
      persistPlayback();
      return true;
    }
    /* --- callback từ engine (audio.js) --- */
    function onAudioTimeUpdate(t, dur, seekable) {
      demo.t = t || 0;
      /* Đợt A (9.9, việc 4): giữ thời lượng bài đang phát để đồng hồ
         đếm ngược ("-M:SS") tính được thời gian còn lại. Đài live có
         dur null/Infinity → demo.dur = null (không đếm ngược được). */
      demo.dur = (dur && isFinite(dur) && dur > 0) ? dur : null;
      demo.seekFrac = (dur && dur > 0) ? Math.max(0, Math.min(1, demo.t / dur)) : 0;
      /* Đợt L (9.8): file nhạc (kind track) chưa có len thì lấy duration
         thật từ engine khi metadata đã về — nhãn góc phải đổi "…" ->
         "M:SS". Chỉ ghi 1 lần (len != null thì thôi) để khỏi vẽ lại
         hàng mỗi lần timeupdate. Đài live (kind radio) không ghi —
         duration live là null/Infinity. */
      var curDur = playlistState.items[playlistState.current];
      if (curDur && curDur.kind === "track" && curDur.len == null && dur && isFinite(dur) && dur > 0) {
        curDur.len = Math.round(dur);
        refreshPlaylistRows(); updateInfoEls();
      }
      /* Lặp 1 bài: tua về đầu khi gần hết (còn < 0.5s), chỉ bài có thời
         lượng — đài live không bị tua (dur null). */
      if (demo.repeat === -1 && dur && dur > 0 && demo.t >= dur - 0.5 && audioEngine) {
        if (audioEngine.seekTo(0)) { demo.t = 0; demo.seekFrac = 0; }
      }
      updateTimerEls(); updateProgress();
    }
    function onAudioEnded() {
      var cur = playlistState.items[playlistState.current];
      /* Bài có thời lượng = có len trong playlist HOẶC engine đo được
         duration thật (file local không có len vì đợt E chưa parse
         metadata). Đài live (len null + duration null) không lặp 1. */
      var engDur = audioEngine ? audioEngine.getDuration() : null;
      var hasDur = (cur && cur.len != null) || (engDur != null);
      if (demo.repeat === -1 && hasDur) {
        /* Lặp 1 bài: tua về đầu, phát lại (đài live không tua — hasDur false thì rơi xuống dưới). */
        if (audioEngine) { audioEngine.seekTo(0); audioEngine.resume(); }
        demo.t = 0; demo.seekFrac = 0; updateTimerEls(); updateProgress();
        return;
      }
      if (demo.repeat === 1 || demo.shuffle) { nextTrack(true); return; }
      /* Repeat tắt: tới bài tiếp, hết danh sách thì dừng. */
      if (playlistState.current < playlistState.items.length - 1) nextTrack(false);
      else {
        playlistState.playing = false; demo.playing = false;
        updateStatusEls(); refreshPlaylistRows(); persistPlayback();
      }
    }
    function onAudioError(info) {
      var it = (info && info.item) || playlistState.items[playlistState.current];
      var name = it ? it.name : "";
      /* Kênh lỗi hẳn (đã thử lại sau 3s trong engine): báo chữ đỏ không
         dấu trên dòng chữ chạy, Ở YÊN kênh — không tự nhảy kênh dưới. */
      showTickerError("Khong phat duoc kenh " + stripDiacritics(name));
      demo.playing = false; playlistState.playing = false;
      /* Đợt L (9.8): kênh VIDEO lỗi hẳn thì không có loadedmetadata —
         nhãn WxH cũ (của kênh trước, vd 1920x1080 của Nghệ An) sẽ dính
         lại và vùng video đen. setVideoInfo(0,0) xóa nhãn + lưới an
         toàn trong đó tự về vis cho khỏi màn hình đen; kênh video sau
         phát được thì loadedmetadata lại tự về video. Kênh audio thì
         không động tới AVS. */
      if (it && isVideoItem(it)) setVideoInfo(0, 0);
      updateStatusEls(); refreshPlaylistRows(); persistPlayback();
    }
    function onAudioPlayingChange(playing) {
      demo.playing = !!playing;
      playlistState.playing = !!playing;
      /* Đang phát thật thì lỗi cũ (nếu có) không còn đúng nữa. */
      if (playing) clearTickerError();
      /* Đợt A (9.9, việc 4): vừa bắt đầu phát thì đồng bộ đồng hồ với
         currentTime thật của engine ngay (không chờ timeupdate đầu
         tiên ~250ms sau) — đề phòng đồng hồ đứng yên ở giá trị cũ. Chỉ
         đồng bộ khi engine báo vị trí > 0 (0 = mới phát từ đầu, demo.t
         đã là 0 sau playPlaylistItem). */
      if (playing && audioEngine) {
        try {
          var ct = audioEngine.getCurrentTime ? audioEngine.getCurrentTime() : 0;
          if (ct > 0) { demo.t = ct; updateTimerEls(); updateProgress(); }
        } catch (e) { /* bỏ qua */ }
      }
      updateStatusEls();
      refreshPlaylistRows();
      updateChannelsIndicator();
      /* Đợt B (9.9): phát/dừng thì đồng bộ vòng cuộn ticker (chữ dài cuộn
         khi phát, về đầu khi dừng). Vòng vis đồng bộ qua updateStatusEls. */
      syncTickerAnim();
    }
    /* Đợt K (9.7, điểm 7a) — chỉ báo kênh mono/stereo/surround.
       XML: layer "channels" (songinfo (0,10), ảnh mặc định player.songinfo.none
       — trong suốt) + 4 bitmap trạng thái player.songinfo.<none|stereo|mono|
       surround>; MAKI songinfo.maki đổi image theo trạng thái phát. Amp không
       chạy MAKI nên tự đổi ảnh bằng setChannelsState.
       - Đổi ảnh bằng cách thay hậu tố sau dấu "." cuối của baseImage (lấy từ
         XML, không gán cứng); bitmap không có trong model (skin khác thiếu
         trạng thái) thì giữ nguyên, không ném lỗi.
       - "none" khi dừng (đúng mặc định XML). Khi phát: dùng số kênh đo được
         (audioEngine.getMeasuredChannels) nếu có; chưa đo được thì hiện
         "stereo" TẠM — xem ghi chú trong updateChannelsIndicator (lệch khỏi
         suy đoán gốc, ghi rõ). */
    async function setChannelsState(state) {
      /* Snapshot record NGAY ĐẦU: hàm bất đồng bộ, render lại giữa chừng
         (renderLayout reset channelsRec) thì record cũ mất — dùng record
         đã snapshot, và bỏ qua nếu sau await record đã bị thay (lượt render
         mới sẽ tự áp lại trạng thái qua updateChannelsIndicator). */
      var rec = channelsRec;
      if (!rec) return false;
      var base = rec.baseImage || "";
      var idx = base.lastIndexOf(".");
      var bid = idx >= 0 ? base.slice(0, idx + 1) + state : base;
      var info = null;
      try { info = await bitmapInfoCached(bid); } catch (e) { info = null; }
      if (!info || !info.file) return false;
      var spr = null;
      try { spr = await spriteDiv(bid, rec.w, rec.h, { opacity: rec.opacity }); } catch (e) { spr = null; }
      if (!spr) return false;
      if (channelsRec !== rec) return false;
      spr.style.left = rec.x + "px"; spr.style.top = rec.y + "px";
      setAbs(spr, rec.parent, rec.x, rec.y);
      /* Đợt D (9.9): sprite channels bị thay mới ở đây nên phải gắn lại
         dblclick WA5:Prefs (mở Preferences) + pointer-events — không thì
         nhấp đúp chỉ chạy tới lần refresh đầu tiên rồi mất (test giu-cu
         bắt được: innerHTML đổi sau ~800ms vì sprite mới thiếu style). */
      if (rec.dblclick && rec.dblclick.toUpperCase().indexOf("WA5:PREFS") === 0) {
        spr.style.pointerEvents = "auto";
        spr.ondblclick = function () { openPreferences(spr); };
      }
      var parent = rec.parent;
      if (parent) {
        var next = rec.div.nextSibling;
        try { parent.removeChild(rec.div); } catch (e) { /* đã mất */ }
        try { parent.insertBefore(spr, next); } catch (e) { parent.appendChild(spr); }
      }
      rec.div = spr;
      rec.state = state;
      return true;
    }
    function updateChannelsIndicator() {
      if (!demo.playing) { setChannelsState("none"); return; }
      var m = null;
      try { m = audioEngine && audioEngine.getMeasuredChannels ? audioEngine.getMeasuredChannels() : null; } catch (e) { m = null; }
      if (m) { setChannelsState(m); return; }
      /* Chưa đo được: hiện "stereo" tạm rồi đo thật để sửa lại. Lý do (ghi rõ,
         lệch khỏi suy đoán gốc "không mặc định stereo nếu chưa đo"): trình duyệt
         KHÔNG cho đọc số kênh của thẻ đang phát khi chưa có MediaElementSource
         — đã thử nghiệm thật trên Chrome headless 3/11: MediaElementSource.
         channelCount luôn = 2 (thuộc tính của node, mode "max", không phản ánh
         file — file mono 1 kênh cũng đọc 2); captureStream().getAudioTracks()
         .getSettings()/getCapabilities() đều không có channelCount. Tạo source
         cho thẻ đang phát chỉ để đo thì câm tiếng với đài không CORS (bài học
         đợt E), nên không làm. Nhạc/radio gần như luôn stereo nên "stereo" tạm
         đúng ~99%; đo thật (ChannelSplitter, xem audio.js) sẽ sửa thành "mono"
         nếu L/R giống hệt nhau. Dừng phát → "none" (đúng mặc định XML). */
      setChannelsState("stereo");
      try {
        if (audioEngine && audioEngine.measureChannels) {
          audioEngine.measureChannels(function (state) {
            if (state && demo.playing) setChannelsState(state);
          });
        }
      } catch (e) { /* bỏ qua */ }
    }
    /* Nút Shuffle/Repeat trên skin (cfgattrib "{GUID};Shuffle" /
       "{GUID};Repeat"): Shuffle đảo on/off; Repeat xoay 0 -> 1 -> -1 -> 0
       (Tắt -> Lặp toàn bộ -> Lặp 1 bài -> Tắt, theo cfgvals "0;1;-1").
       toggleCfg chung chỉ đảo 2 trạng thái nên 2 nút này chặn riêng ở
       đây, trước khi rơi xuống toggleCfg. */
    function handleShuffleRepeat(cfgKey, rec) {
      if (/;Shuffle$/.test(cfgKey || "")) {
        var on = !cfgOn(cfgKey);
        cfgState.set(cfgKey, on ? "on" : "off");
        demo.shuffle = on;
        refreshCfgGroup(cfgKey);
        persistPlayback();
        return true;
      }
      if (/;Repeat$/.test(cfgKey || "")) {
        demo.repeat = demo.repeat === 0 ? 1 : demo.repeat === 1 ? -1 : 0;
        cfgState.set(cfgKey, String(demo.repeat));
        refreshCfgGroup(cfgKey);
        persistPlayback();
        return true;
      }
      return false;
    }
    /* Nhạc local: chọn thư mục (file picker webkitdirectory) — trình
       duyệt không nhớ file local nên mỗi lần chọn lại thư mục (quy ước
       đã chốt). Chỉ nhận file audio, không parse metadata ở đợt E. */
    /* Đợt L (9.8) — đọc thời lượng file local khi thêm (không phát):
       thẻ <audio preload="metadata"> tạm, chỉ đọc header rồi bỏ; khi
       loadedmetadata có duration thật thì ghi vào item.len + vẽ lại
       hàng (nhãn góc phải đổi "…" -> "M:SS"). Không đọc kiểu phát thử
       từng file. Đài live (kind radio) không probe — duration của live
       là Infinity/NaN, không có nghĩa. */
    function probeLocalDuration(item) {
      if (!item || item.kind !== "track" || item.len != null) return;
      if (!document || !document.createElement) return;
      var tmp = null;
      try { tmp = document.createElement("audio"); } catch (e) { return; }
      if (!tmp) return;
      var done = false;
      function finish() {
        if (done) return; done = true;
        var d = NaN;
        try { d = tmp.duration; } catch (e) { d = NaN; }
        try { tmp.removeAttribute("src"); tmp.load(); } catch (e) { /* bỏ qua */ }
        if (d && isFinite(d) && d > 0) {
          item.len = Math.round(d);
          refreshPlaylistRows(); updateInfoEls();
        }
      }
      try {
        tmp.addEventListener("loadedmetadata", finish);
        tmp.addEventListener("error", finish);
        try { tmp.preload = "metadata"; } catch (e) { /* bỏ qua */ }
        tmp.src = item.url;
      } catch (e) { finish(); }
    }
    function addLocalFiles(files) {
      var added = 0;
      var list = files || [];
      for (var i = 0; i < list.length; i++) {
        var f = list[i];
        if (!f || !/\.(mp3|wav|ogg|oga|m4a|flac|aac|opus)$/i.test(f.name || "")) continue;
        var url = "";
        try {
          if (typeof URL !== "undefined" && URL.createObjectURL) url = URL.createObjectURL(f);
        } catch (e) { url = ""; }
        if (!url) continue;
        playlistState.items.push({
          name: String(f.name).replace(/\.[^.]+$/, ""),
          url: url, len: null, group: "Local", kind: "track", local: true,
          /* Đợt B (9.9): giữ kích thước file để tính KBPS trung bình thật
             (fileSize*8/len/1000) khi có thời lượng — xem songInfoValues. */
          fileSize: (f && f.size) || null
        });
        probeLocalDuration(playlistState.items[playlistState.items.length - 1]);
        added++;
      }
      if (added) {
        playlistState.original = playlistState.items.slice();
        updateInfoEls();
        requestRerender();
      }
      return added;
    }
    function openLocalFolderPicker() {
      if (!document || !document.createElement) return false;
      var inp = document.createElement("input");
      inp.type = "file";
      try { inp.setAttribute("webkitdirectory", ""); } catch (e) { /* bỏ qua */ }
      try { inp.multiple = true; } catch (e) { /* bỏ qua */ }
      inp.style.display = "none";
      inp.addEventListener("change", function () {
        addLocalFiles(inp.files || []);
        try { if (inp.parentElement) inp.parentElement.removeChild(inp); } catch (e) { /* bỏ qua */ }
      });
      var host = (document.body || lastStage || document.documentElement);
      if (host) host.appendChild(inp);
      if (inp.click) inp.click();
      return true;
    }

    /* ---------- state playlist (đợt C, dùng chung cho đợt E phát tiếng) ----------
       items: [{name, url, len|null, group, kind:"radio"|"track"}]
       - selected: chỉ số hàng đang CHỌN (full list, không đổi khi lọc).
       - current: hàng đang HÁT; playing=true sau khi NHẤP ĐÚP (đợt C chỉ
         đặt state, chưa phát ra tiếng).
       - filter: chuỗi tìm, lọc tức thì theo tên, KHÔNG đổi thứ tự gốc.
       - original: thứ tự lúc nạp (để Misc "Khôi phục thứ tự gốc").
       Mặc định (đợt 9.5): playlist RỖNG cho tới khi index.html nạp
       radio.m3u xong gọi setPlaylistData để chèn 41 kênh (không còn
       bài Demo — người dùng chốt bỏ hết, chỉ giữ nguồn của mình).
       radio.m3u thật KHÔNG có group-title nào (41 kênh đều không thẻ) nên
       nhóm mặc định của chúng là "Radio" (tên nguồn), ghi rõ ở đây — không
       phải "Không rõ" như quy ước gom nhóm của Webamp fork. */
    function demoPlaylistItems() {
      return DEMO_TRACKS.map(function (t) { return { name: t.name, url: "", len: t.len, group: "Demo", kind: "track" }; });
    }
    var playlistState = {
      items: demoPlaylistItems(), original: null,
      selected: 0, current: 0, playing: false, filter: "",
      source: ""
    };
    playlistState.original = playlistState.items.slice();
    var plListDiv = null, plSearchInput = null, lastExportedM3U = "";
    function playlistTotalTime() {
      var s = 0;
      for (var i = 0; i < playlistState.items.length; i++) if (playlistState.items[i].len != null) s += playlistState.items[i].len;
      return s;
    }
    /* Đợt A (9.9, việc 3) — đồng hồ playlist (PLTime, display PE_Info):
       Winamp thật (changelog 5.531: "Fixed: Total time display of
       selected tracks in Classic playlist") dùng 1 ô hiển thị duy nhất,
       đổi nội dung theo lựa chọn:
       - Không chọn gì / chọn hết → TỔNG thời gian mọi mục có len.
       - Chọn 1 mục (Amp hiện chỉ chọn đơn) → thời gian MỤC ĐÃ CHỌN.
         (Nhiều mục khi nào có chọn nhiều thì cộng các mục đã chọn.)
       - Mục đã chọn là đài live (len null) → không có số để hiện → về
         tổng (live vốn không cộng vào tổng). Playlist toàn live thì
         tổng = 0:00 như trước (không bịa số).
       Bài ĐANG PHÁT không có số riêng trong cửa sổ playlist của Winamp
       — thời gian bài đang phát ở đồng hồ cửa sổ chính (việc 4) + nhãn
       phải của hàng đang hát; không bịa thêm ô thứ 3 trong playlist. */
    function playlistSelectedIndices() {
      if (playlistState.selected >= 0 && playlistState.selected < playlistState.items.length) return [playlistState.selected];
      return [];
    }
    function playlistSelectedTime() {
      var idxs = playlistSelectedIndices(), s = 0, any = false;
      for (var i = 0; i < idxs.length; i++) {
        var it = playlistState.items[idxs[i]];
        if (it && it.len != null) { s += it.len; any = true; }
      }
      return any ? s : null;
    }
    function playlistClockText() {
      var sel = playlistSelectedTime();
      var idxs = playlistSelectedIndices();
      var allSel = playlistState.items.length > 0 && idxs.length === playlistState.items.length;
      if (sel != null && !allSel) return fmtTime(sel);
      return fmtTime(playlistTotalTime());
    }
    function playlistGroups() {
      var g = {};
      for (var i = 0; i < playlistState.items.length; i++) {
        var k = playlistState.items[i].group || "Khong ro";
        g[k] = (g[k] || 0) + 1;
      }
      return g;
    }
    function playlistFiltered() {
      var out = [];
      var f = (playlistState.filter || "").toLowerCase();
      for (var i = 0; i < playlistState.items.length; i++) {
        if (!f || playlistState.items[i].name.toLowerCase().indexOf(f) >= 0) out.push({ item: playlistState.items[i], idx: i });
      }
      return out;
    }
    function getPlaylistState() {
      return {
        items: playlistState.items.slice(), selected: playlistState.selected,
        current: playlistState.current, playing: playlistState.playing,
        filter: playlistState.filter, source: playlistState.source,
        count: playlistState.items.length, total: playlistTotalTime(),
        selectedTotal: playlistSelectedTime(), clockText: playlistClockText(),
        groups: playlistGroups()
      };
    }
    /* Nạp nguồn .m3u làm dữ liệu chính: chỉ kênh radio (giữ tên +
       thứ tự gốc). Đợt 9.5: không còn nối bài Demo vào cuối. Trả về
       tổng số mục. */
    function setPlaylistData(m3uText, baseUrl, sourceName) {
      var radio = parseM3U(m3uText, baseUrl);
      for (var i = 0; i < radio.length; i++) if (!radio[i].group) radio[i].group = "Radio";
      var items = radio;
      playlistState.items = items;
      playlistState.original = items.slice();
      playlistState.selected = clampPlaylistIdx(0); playlistState.current = clampPlaylistIdx(0);
      playlistState.playing = false; playlistState.filter = "";
      playlistState.source = sourceName || "radio.m3u";
      requestRerender();
      return items.length;
    }
    function setPlaylistItems(items, sourceName) {
      playlistState.items = items.slice();
      playlistState.original = items.slice();
      playlistState.selected = clampPlaylistIdx(0); playlistState.current = clampPlaylistIdx(0);
      playlistState.playing = false; playlistState.filter = "";
      playlistState.source = sourceName || "";
      requestRerender();
      return playlistState.items.length;
    }
    /* Đợt L (9.8): danh sách rỗng thì trả -1 (không chọn gì) thay vì 0 —
       0 trỏ vào hàng không tồn tại, kẹt lại sau khi xóa hết rồi thêm
       mục mới (removePlaylistItem đã clamp nên xóa mục cuối cũng về -1).
       Mọi chỗ đọc items[current]/items[selected] đều guard `if (it…)`
       nên -1 an toàn; select/play/next/prev đều guard rỗng trước. */
    function clampPlaylistIdx(i) {
      if (!playlistState.items.length) return -1;
      return Math.max(0, Math.min(playlistState.items.length - 1, i | 0));
    }
    /* Click 1 lần = chỉ CHỌN hàng (không phát — quy ước đã chốt ở Webamp
       fork: PHẢI nhấp đúp mới phát, tránh chạm nhầm). Vẽ lại hàng tại chỗ,
       không re-render toàn cửa sổ (giữ vị trí cuộn). */
    function selectPlaylistItem(idx) {
      if (!playlistState.items.length) return false;
      playlistState.selected = clampPlaylistIdx(idx);
      refreshPlaylistRows();
      /* Đợt A (9.9, việc 3): đổi lựa chọn thì PLTime đổi theo (tổng →
         thời gian đã chọn); vẽ tại chỗ, không re-render. */
      updateInfoEls();
      return true;
    }
    /* Đợt A (9.9, việc 3): bỏ chọn (bấm nền trống của danh sách) — PLTime
       về tổng thời gian (như Winamp: bấm vùng trống thì hết chọn). */
    function clearPlaylistSelection() {
      if (playlistState.selected === -1) return false;
      playlistState.selected = -1;
      refreshPlaylistRows();
      updateInfoEls();
      return true;
    }
    /* Nhấp đúp = phát: đặt current + playing (state cho đợt E dùng tiếp).
       Đồng hồ/chữ chạy cửa sổ chính hiện tên mục đang phát. */
    function playPlaylistItem(idx) {
      if (!playlistState.items.length) return false;
      idx = clampPlaylistIdx(idx);
      playlistState.current = idx;
      playlistState.selected = idx;
      playlistState.playing = true;
      demo.t = 0; demo.seekFrac = 0; demo.dur = undefined; demo.playing = true;
      /* Đợt A (9.9, việc 4): đổi bài thì quên thời lượng bài cũ — đếm
         ngược dùng len của bài MỚI cho tới khi engine báo thời lượng
         thật qua timeupdate đầu tiên. */
      var it = playlistState.items[idx];
      if (it && it.kind === "track") {
        for (var di = 0; di < DEMO_TRACKS.length; di++) {
          if (DEMO_TRACKS[di].name === it.name) { demo.track = di; break; }
        }
      }
      refreshPlaylistRows();
      updateStatusEls(); updateTimerEls(); updateInfoEls(); /* việc 3: phát mục khác = chọn mục khác → PLTime đổi theo */
      for (var i = 0; i < tickerEls.length; i++) setTickerText(tickerEls[i]);
      updateInfoEls();
      /* Đợt D — đường (a) loadChannel autoplay (v8): kênh video thì tự mở
         video (nhúng nếu có, rời nếu Classic); kênh audio trong khi vùng
         nhúng đang ở chế độ video thì về vis cho khỏi màn hình đen. */
      var playedItem = playlistState.items[idx];
      if (isVideoItem(playedItem)) openAvs("video");
      else if (avsState.open && !avsState.detached && avsState.mode === "video" && RES.embeddedAvs) setAvsMode("vis");
      /* Đợt E — phát thật qua audio engine (mục không có link nhạc
         thì chỉ hiện trạng thái, xem startPlaybackForCurrent). */
      startPlaybackForCurrent();
      persistPlayback();
      return true;
    }
    function removePlaylistItem(idx) {
      if (!playlistState.items.length) return false;
      idx = clampPlaylistIdx(idx);
      var removedCurrent = idx === playlistState.current;
      playlistState.items.splice(idx, 1);
      if (removedCurrent) {
        playlistState.playing = false; demo.playing = false;
        if (audioEngine) audioEngine.stop();
      }
      playlistState.selected = clampPlaylistIdx(playlistState.selected);
      playlistState.current = clampPlaylistIdx(playlistState.current);
      updateInfoEls();
      requestRerender();
      return true;
    }
    function addPlaylistItem(item) {
      playlistState.items.push(item);
      updateInfoEls();
      requestRerender();
      return playlistState.items.length - 1;
    }
    function sortPlaylistByName() {
      playlistState.items.sort(function (a, b) {
        try { return a.name.localeCompare(b.name, "vi", { sensitivity: "base" }); }
        catch (e) { return a.name < b.name ? -1 : a.name > b.name ? 1 : 0; }
      });
      requestRerender();
    }
    /* Khôi phục thứ tự lúc nạp (theo object identity với original; mục
       thêm tay sau khi nạp — không có trong original — dồn về cuối). */
    function restorePlaylistOrder() {
      var orig = playlistState.original || [];
      playlistState.items.sort(function (a, b) {
        var ia = orig.indexOf(a), ib = orig.indexOf(b);
        if (ia < 0 && ib < 0) return 0;
        if (ia < 0) return 1;
        if (ib < 0) return -1;
        return ia - ib;
      });
      requestRerender();
    }
    /* Đợt 9.5: xóa hết playlist (không còn "chỉ còn Demo" — đã bỏ hết
       bài Demo theo yêu cầu người dùng).
       Đợt L (9.8): selected/current về -1 (không chọn gì) khi rỗng —
       giữ 0 sẽ trỏ vào hàng không tồn tại; vẽ lại hàng ngay tại chỗ
       (refreshPlaylistRows) để hàng cũ biến mất tức thì, khỏi chờ
       re-render async. */
    function clearPlaylist() {
      playlistState.items = [];
      playlistState.original = playlistState.items.slice();
      playlistState.selected = -1; playlistState.current = -1; playlistState.playing = false;
      demo.playing = false;
      if (audioEngine) audioEngine.stop();
      updateInfoEls();
      refreshPlaylistRows();
      requestRerender();
    }
    function exportPlaylistM3U() {
      var lines = ["#EXTM3U"];
      playlistState.items.forEach(function (it) {
        var dur = it.len != null ? it.len : -1;
        var gt = it.group ? ' group-title="' + it.group + '"' : "";
        lines.push("#EXTINF:" + dur + gt + "," + it.name);
        lines.push(it.url || "");
      });
      var text = lines.join("\n") + "\n";
      lastExportedM3U = text;
      /* Trình duyệt thật: tải file về. Môi trường test (jsdom): try/catch
         nuốt lỗi, chỉ giữ lastExportedM3U để assert. */
      try {
        if (typeof Blob !== "undefined" && typeof URL !== "undefined" && URL.createObjectURL && document && document.createElement) {
          var blob = new Blob([text], { type: "audio/x-mpegurl" });
          var a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = "playlist.m3u";
          if (a.click) a.click();
        }
      } catch (e) { /* chỉ giữ lastExportedM3U */ }
      return text;
    }
    function scrollPlaylistTo(idx) {
      if (!plListDiv) return;
      try { plListDiv.scrollTop = Math.max(0, idx * 13 - 26); } catch (e) { /* jsdom */ }
    }

    /* Bật/tắt một cfgattrib (nút checkbox/radio trong tab Options, LED EQ,
       Crossfade...). Radio (ảnh chứa "radio") thì độc quyền trong cùng
       GUID: bấm radio này thì các radio khác cùng GUID tắt; bấm radio
       đang bật thì giữ nguyên (không tắt). Checkbox thì đảo trạng thái.
       Đổi xong refresh các nút cùng attrib ngay tại chỗ + re-render. */
    function isRadioRec(rec) {
      return ((rec.image || "") + "|" + (rec.activeImage || "")).indexOf("radio") >= 0;
    }
    function cfgGuid(attrib) {
      var i = String(attrib || "").indexOf(";");
      return i >= 0 ? String(attrib).slice(0, i) : String(attrib || "");
    }
    async function refreshCfgGroup(attrib) {
      var recs = cfgGroups[attrib] || [];
      for (var i = 0; i < recs.length; i++) { try { await recs[i].refresh(); } catch (e) { /* giữ nút cũ */ } }
    }
    async function toggleCfg(attrib, rec) {
      if (!attrib) return;
      var radio = rec ? isRadioRec(rec) : false;
      var on = cfgOn(attrib);
      if (radio) {
        if (on) return; /* radio đang bật: bấm nữa không làm gì */
        /* Tắt các radio khác cùng GUID (chỉ radio, checkbox cùng GUID giữ nguyên). */
        var guid = cfgGuid(attrib);
        var keys = Object.keys(cfgGroups);
        for (var k = 0; k < keys.length; k++) {
          if (keys[k] === attrib || cfgGuid(keys[k]) !== guid) continue;
          var recs = cfgGroups[keys[k]] || [];
          var anyRadio = false;
          for (var r = 0; r < recs.length; r++) if (isRadioRec(recs[r])) { anyRadio = true; break; }
          if (anyRadio && cfgOn(keys[k])) { cfgState.set(keys[k], "off"); await refreshCfgGroup(keys[k]); }
        }
        cfgState.set(attrib, "on");
      } else {
        cfgState.set(attrib, on ? "off" : "on");
      }
      /* Đồng bộ state EQ/Crossfade (LED + nút cùng attrib). */
      if (attrib === "EQ_TOGGLE") {
        drawerState.eqOn = cfgOn(attrib); demo.eq = drawerState.eqOn;
        /* Đợt E — bật/tắt EQ thật: engine nối/ngắt chuỗi (on->off không
           nạp lại; off->on nạp lại với crossOrigin=anonymous khi chưa có
           source — xem audio.js setEqOn). */
        if (audioEngine) {
          try { audioEngine.setEqOn(drawerState.eqOn, { item: playlistState.items[playlistState.current] }); } catch (e) { /* bỏ qua */ }
        }
        persistPlayback();
        /* Đợt B (9.9): bật EQ thì graph được tạo (setEqOn -> ensureGraph)
           nên KHZ có số đo thật; vẽ lại ô Frequency ngay. Tắt EQ không hủy
           graph nên KHZ vẫn số thật (xem songInfoValues). */
        updateInfoEls();
      }
      if (attrib === "EQ_AUTO") drawerState.eqAuto = cfgOn(attrib);
      if (attrib && attrib.indexOf("Enable crossfading") >= 0) drawerState.crossfadeOn = cfgOn(attrib);
      /* Đợt D (9.9): "Enable Beat Visualization" — bật/tắt nhóm beat trong
         display (xem setBeatVisOn; toggleCfg đã requestRerender ở cuối nên
         nhóm hiện/ẩn theo ngay). */
      if (suf === "Enable Beat Visualization") beatVisOn = cfgOn(attrib);
      /* Đợt B (9.9): "Detach Vis/Video Window" (optionsgroup.misc) — bật thì
         tách rời ngay nếu AVS đang mở ở chế độ đó; tắt thì gắn lại. */
      var suf = attribSuffix(attrib);
      if (suf === "Detach Vis Window") applyDetachOption("vis");
      if (suf === "Detach Video Window") applyDetachOption("video");
      /* Đợt B (9.9): đổi chế độ cuộn ticker thì đồng bộ vòng ticker. */
      if (suf === "Disable Songticker scrolling" || suf === "Modern Songticker scrolling" || suf === "Classic Songticker scrolling") syncTickerAnim();
      await refreshCfgGroup(attrib);
      persistCfg();
      requestRerender();
    }

    /* Cuộn bucket Options (81×55, 7 mục × 14px): bước 14, kẹp [0, 43]. */
    function scrollBucket(delta) {
      var max = Math.max(0, bucketEntryCount() * 14 - 55);
      drawerState.bucketScroll = Math.max(0, Math.min(max, drawerState.bucketScroll + delta * 14));
      requestRerender();
    }
    function bucketEntryCount() {
      var n = 0;
      var keys = Object.keys(RES.groupdefs || {});
      for (var i = 0; i < keys.length; i++) if (/^bucket\.entry\.\d+$/.test(keys[i])) n++;
      return n || 7;
    }
    function bucketEntries() {
      var out = [];
      var keys = Object.keys(RES.groupdefs || {});
      for (var i = 0; i < keys.length; i++) {
        var m = /^bucket\.entry\.(\d+)$/.exec(keys[i]);
        if (m) out.push({ gid: keys[i], n: parseInt(m[1], 10) });
      }
      out.sort(function (a, b) { return a.n - b.n; });
      return out;
    }
    function bucketEntryTarget(gid) {
      var kids = RES.groupdefs[gid] || [];
      for (var i = 0; i < kids.length; i++) {
        var a = kids[i].getAttribute("action") || "";
        if (a.indexOf("switchto;") === 0) return a.split(";")[1] || "";
      }
      return "";
    }

    /* Preset EQ — KHÔNG có trong skin (Winamp gốc đọc preset từ file ngoài),
       nên đây là đường cong đơn giản tự định nghĩa, ghi rõ dB trong code;
       chỉ "Flat" là chuẩn (tất cả 0 dB). frac = (dB + 12) / 24. */
    var EQ_PRESETS = {
      "Flat":        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      "Bass Boost":  [0, 6, 5, 3, 0, 0, 0, 0, 0, 0, 0],
      "Treble Boost":[0, 0, 0, 0, 0, 0, 0, 3, 5, 6, 6],
      "Loudness":    [0, 5, 4, 2, 0, -1, -1, 0, 2, 4, 5],
      "Vocal":       [0, -3, -2, 0, 2, 4, 4, 2, 0, -1, -2]
    };
    var EQ_BAND_IDS = ["preamp", "eq1", "eq2", "eq3", "eq4", "eq5", "eq6", "eq7", "eq8", "eq9", "eq10"];
    function applyEqPreset(name) {
      var vals = EQ_PRESETS[name];
      if (!vals) return false;
      for (var i = 0; i < EQ_BAND_IDS.length; i++) {
        drawerState.eqBands[EQ_BAND_IDS[i]] = Math.max(0, Math.min(1, (vals[i] + 12) / 24));
      }
      /* Đẩy giá trị xuống các slider đang hiển thị (không re-render). */
      for (var j = 0; j < sliderRecords.length; j++) {
        var rec = sliderRecords[j];
        if (rec.action === "EQ_BAND" && drawerState.eqBands[rec.sliderId] !== undefined) rec.setFrac(drawerState.eqBands[rec.sliderId], true);
      }
      return true;
    }
    function setAllEqBands(db) {
      var frac = Math.max(0, Math.min(1, (db + 12) / 24));
      for (var i = 0; i < EQ_BAND_IDS.length; i++) drawerState.eqBands[EQ_BAND_IDS[i]] = frac;
      for (var j = 0; j < sliderRecords.length; j++) {
        var rec = sliderRecords[j];
        if (rec.action === "EQ_BAND") rec.setFrac(frac, true);
      }
    }

    /* ---------- Color Themes (đợt B) ---------- */
    function gammaFilterId(groupId) {
      return "amp9-gamma-" + String(groupId).replace(/[^A-Za-z0-9_]/g, "_");
    }
    function getGammasets() { return (RES && RES.gammasets) || []; }
    /* Áp preset màu lên stage: MỖI gammagroup 1 filter feColorMatrix riêng
       (tỉ lệ 1+v/4096 kẹp [0.4,1.6]); sprite nào thuộc nhóm nào thì nhận
       đúng filter của nhóm đó (tra bitmap.gammagroup). Preset Default
       (mọi value 0,0,0) → gỡ hết filter. Gọi lại sau mỗi lần re-render
       vì renderLayout xóa innerHTML (kèm cả <svg> defs). */
    function applyColorTheme(stage) {
      var T = stage || lastStage;
      if (!T) return false;
      var sets = getGammasets();
      var preset = sets[drawerState.colorThemeIdx] || null;
      var old = null;
      try { old = T.querySelector("#amp9-gamma-defs"); } catch (e) { old = null; }
      if (old && old.parentElement) old.parentElement.removeChild(old);
      var groupScale = {};
      /* Preset "Default" = gỡ hết filter (theo yêu cầu đợt B), DÙ trong
         color-presets.xml nó vẫn có 6 nhóm khác 0 (TitlebarHover,
         ButtonsHover, ButtonsHover2, Scrollbar Hover = 333,333,333;
         Text = -3897,-3774,-2394; Text Inverse = 4095,4095,4095) — đó là
         các tweak hover/text của skin gốc, không phải "không đổi màu". */
      if (preset && preset.id !== "Default") {
        for (var i = 0; i < preset.groups.length; i++) {
          var g = preset.groups[i];
          var gm = gammaMatrixValues(g.value || "0,0,0");
          if (!gm.identity) groupScale[g.id] = gm;
        }
      }
      var svg = null;
      var keys = Object.keys(groupScale);
      if (keys.length) {
        if (typeof document.createElementNS === "function") {
          svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        } else {
          svg = document.createElement("svg");
        }
        svg.setAttribute("id", "amp9-gamma-defs");
        svg.setAttribute("width", "0"); svg.setAttribute("height", "0");
        svg.setAttribute("aria-hidden", "true");
        svg.style.position = "absolute"; svg.style.width = "0px"; svg.style.height = "0px";
        svg.style.overflow = "hidden"; svg.style.pointerEvents = "none";
        for (var k = 0; k < keys.length; k++) {
          var f = document.createElementNS ? document.createElementNS("http://www.w3.org/2000/svg", "filter") : document.createElement("filter");
          f.setAttribute("id", gammaFilterId(keys[k]));
          var fe = document.createElementNS ? document.createElementNS("http://www.w3.org/2000/svg", "feColorMatrix") : document.createElement("feColorMatrix");
          fe.setAttribute("type", "matrix");
          fe.setAttribute("values", groupScale[keys[k]].matrix);
          f.appendChild(fe);
          svg.appendChild(f);
        }
        T.appendChild(svg);
      }
      var sprs = T.querySelectorAll ? T.querySelectorAll(".spr") : [];
      for (var s = 0; s < sprs.length; s++) {
        var el = sprs[s];
        var bid = (el.dataset && el.dataset.bitmap) || "";
        var gg = bid && RES.bitmaps[bid] ? RES.bitmaps[bid].gammagroup : "";
        if (gg && groupScale[gg]) el.style.filter = "url(#" + gammaFilterId(gg) + ")";
        else el.style.filter = "";
      }
      return true;
    }
    function selectColorTheme(idx, stage) {
      var sets = getGammasets();
      if (!sets.length) return false;
      idx = ((idx % sets.length) + sets.length) % sets.length;
      drawerState.colorThemeIdx = idx;
      applyColorTheme(stage || lastStage);
      /* Tô lại hàng đang chọn trong list (không re-render để giữ vị trí cuộn). */
      var T = stage || lastStage;
      if (T && T.querySelectorAll) {
        var rows = T.querySelectorAll("[data-preset-idx]");
        for (var i = 0; i < rows.length; i++) {
          var on = parseInt(rows[i].getAttribute("data-preset-idx"), 10) === idx;
          rows[i].style.background = on ? "rgb(103, 136, 201)" : "";
          rows[i].style.color = on ? "rgb(214, 228, 255)" : "";
          if (on && rows[i].scrollIntoView) { try { rows[i].scrollIntoView({ block: "nearest" }); } catch (e) { /* jsdom */ } }
        }
      }
      return true;
    }

    /* Màn hình CFDisplay: số giây crossfade (pe.time font). */
    var cfDisplayEls = [];
    /* Màn hình VID_Info (đợt D): "WxH" khi có metadata video — text
       display="VID_Info" trong buttons.video / video.buttons.group. */
    var vidInfoEls = [];
    async function updateCFDisplay() {
      for (var i = 0; i < cfDisplayEls.length; i++) {
        var rec = cfDisplayEls[i];
        var tdiv = await makeBitmapText(rec.fontId, String(drawerState.crossfadeSecs), rec.boxW, rec.align, rec.color);
        rec.div.innerHTML = "";
        rec.div.appendChild(tdiv);
        inheritAbs(rec.div);
      }
    }

    /* Đợt D — VID_Info: hiện "WxH" khi có metadata video (loadedmetadata
       trên thẻ <video> gọi setVideoInfo; test gọi trực tiếp vì jsdom
       không phát media thật). Chuỗi rỗng khi chưa có metadata. */
    function setVideoInfo(w, h) {
      var s = (w > 0 && h > 0) ? (w + "x" + h) : "";
      /* Đợt L (9.8) — LƯỚI AN TOÀN RUNTIME (phát hiện từ luồng thật):
         loadedmetadata trên thẻ <video> là bằng chứng trực tiếp có/không
         có hình — đáng tin hơn mọi heuristic URL/group ở isVideoItem.
         Chạy TRƯỚC early-return bên dưới (videoInfo "" đã bằng s "" khi
         w=0 nên return sớm sẽ nuốt mất lưới). Chỉ đổi mode khi AVS đang
         MỞ (đóng thì không tự mở, không đổi mode lén).
         - videoWidth > 0: chắc chắn có hình — AVS đang ở "vis" thì về
           "video", đừng để video đang chạy mà hiện vis.
         - videoWidth == 0: luồng này không có video track (vd HLS chỉ
           có tiếng) — kênh đã phân loại video mà AVS đang ở "video"
           thì về "vis" cho khỏi màn hình đen. Giữ nguyên logic ở
           playPlaylistItem (kênh audio mà AVS đang video thì về vis). */
      if (avsState.open) {
        if (w > 0 && avsState.mode === "vis") {
          setAvsMode("video");
        } else if (w === 0 && avsState.mode === "video") {
          var cur = playlistState.items && playlistState.items[playlistState.current];
          if (cur && isVideoItem(cur)) setAvsMode("vis");
        }
      }
      if (avsState.videoInfo === s) return s;
      avsState.videoInfo = s;
      updateVidInfo();
      return s;
    }
    async function updateVidInfo() {
      for (var i = 0; i < vidInfoEls.length; i++) {
        var rec = vidInfoEls[i];
        var tdiv = await makeBitmapText(rec.fontId, avsState.videoInfo || "", rec.boxW, rec.align, rec.color, rec.valign, rec.boxH);
        rec.div.innerHTML = "";
        rec.div.appendChild(tdiv);
        inheritAbs(rec.div);
      }
      /* Cửa sổ rời Classic (khung HTML dự phòng) dùng span [data-vid-info]. */
      try {
        var T = lastStage;
        if (T && T.querySelectorAll) {
          var spans = T.querySelectorAll("[data-vid-info]");
          for (var j = 0; j < spans.length; j++) spans[j].textContent = avsState.videoInfo || "";
        }
      } catch (e) { /* jsdom */ }
    }

    /* Self-check hình học sau khi mở ngăn kéo — đo từ DOM thật, sai thì
       trả lỗi để trang hiện cảnh báo đỏ (không vẽ sai trong im lặng). */
    function runDrawerSelfCheck(stage) {
      var T = stage || lastStage;
      if (!T) return ["chua co stage de kiem tra"];
      var mainDiv = null, drawerDiv = null;
      try {
        mainDiv = T.querySelector('[data-gid="player.main"]');
        drawerDiv = T.querySelector('[data-gid="player.normal.drawer"]');
      } catch (e) { /* jsdom cu: bo qua */ }
      if (!drawerDiv) return ["khong thay ngan keo trong DOM (chua mo ngan keo?)"];
      var restY = (RES.drawer && RES.drawer.restY) || 17;
      var mainHeight = mainDiv ? (parseInt(mainDiv.style.height || "0", 10) || 0) : 0;
      var mainH = mainDiv ? (mainDiv._absY || 0) + mainHeight : (restY + mainHeight);
      var full = parseInt(drawerDiv.style.height || "0", 10) || ((RES.drawer && RES.drawer.fullH) || 129);
      var mainLaySnap = layoutEntry("main", "normal");
      var snap = (mainLaySnap && mainLaySnap.snapadjustbottom) || full;
      var innerY = (drawerDiv._absY || 0) - restY;
      var tabsBottom = null;
      try {
        var tabs = T.querySelectorAll("[data-tab]");
        for (var i = 0; i < tabs.length; i++) {
          var b = (tabs[i]._absY || 0) - (drawerDiv._absY || 0) + (parseInt(tabs[i].style.height || "0", 10) || 0);
          if (tabsBottom === null || b > tabsBottom) tabsBottom = b;
        }
      } catch (e) { tabsBottom = null; }
      var fillCount = 0;
      try { fillCount = T.querySelectorAll(".fill").length; } catch (e) { fillCount = 0; }
      var scParams = { restY: restY, mainH: mainH, mainHeight: mainHeight, full: full, snap: snap, tabsBottom: tabsBottom, fillCount: fillCount, innerY: innerY };
      var errs = drawerSelfCheck(scParams);
      if (drawerState.open && Math.abs((drawerDiv._absY || 0) - (restY + drawerInnerY(true, mainH, snap, full, restY, mainHeight))) > 0.5) {
        errs.push("ngan keo dang mo nhung dinh o " + drawerDiv._absY + ", dung ra " + (restY + drawerInnerY(true, mainH, snap, full, restY, mainHeight)));
      }
      return errs;
    }

    /* Self-check hình học AVS/Video (ĐỢT F — chạy thật lúc nạp/mở qua
       checkDrawer ở index.html, chung 1 lần chạy console với self-check
       ngăn kéo; đợt 9.5 đã gỡ banner, chỉ ghi console). Đo từ DOM thật,
       hình học của nó phải đúng; chỉ kiểm "mở mà thiếu" khi stage hiện tại
       là cửa sổ chính (player.main có mặt, hoặc skin Classic không có main).
       Vẽ playlist riêng (Pledit) thì bỏ qua kiểm "thiếu" vì stage đó vốn
       không chứa AVS. Không báo oan với đường videoOpen:true của test
       (AVSGroup vẽ ra thì kiểm hình học, không kiểm state mở/đóng). */
    function runAvsSelfCheck(stage) {
      var T = stage || lastStage;
      if (!T) return ["chua co stage de kiem tra (AVS)"];
      var errs = [];
      var ea = RES.embeddedAvs;
      var mainDiv = null, avsDiv = null, vgDiv = null, detWin = null;
      try {
        mainDiv = T.querySelector('[data-gid="player.main"]');
        avsDiv = T.querySelector('[data-gid="AVSGroup"]');
        vgDiv = T.querySelector('[data-gid="video.group"]');
        detWin = T.querySelector("[data-avs-detached]");
      } catch (e) { /* jsdom cu: bo qua */ }
      var isMainStage = !!mainDiv || RES.kind === "classic";
      if (avsDiv) {
        if (!ea) errs.push("AVSGroup hien nhung skin khong co embeddedAvs");
        else {
          if ((avsDiv._absY || 0) !== ea.y) errs.push("AVSGroup _absY " + (avsDiv._absY || 0) + ", dung ra " + ea.y);
          var aw = parseInt(avsDiv.style.width || "0", 10) || 0, ah = parseInt(avsDiv.style.height || "0", 10) || 0;
          if (aw !== ea.w || ah !== ea.h) errs.push("AVSGroup " + aw + "x" + ah + ", dung ra " + ea.w + "x" + ea.h);
          if (mainDiv && (mainDiv._absY || 0) !== 35 + VIDEO_SHIFT) errs.push("mo AVS nhung ma main _absY " + (mainDiv._absY || 0) + ", dung ra " + (35 + VIDEO_SHIFT) + " (35+116)");
          if (!vgDiv) errs.push("AVS mo nhung nhung khong thay video.group");
          else {
            var vx = vgDiv._absX || 0, vy = vgDiv._absY || 0;
            var vw = parseInt(vgDiv.style.width || "0", 10) || 0, vh = parseInt(vgDiv.style.height || "0", 10) || 0;
            if (vx !== ea.videoRect.x || vy !== ea.y + ea.videoRect.y || vw !== ea.videoRect.w || vh !== ea.videoRect.h) {
              errs.push("video.group (" + vx + "," + vy + "," + vw + "x" + vh + "), dung ra (" + ea.videoRect.x + "," + (ea.y + ea.videoRect.y) + "," + ea.videoRect.w + "x" + ea.videoRect.h + ")");
            }
          }
        }
      }
      if (detWin) {
        var dw = parseInt(detWin.style.width || "0", 10) || 0, dh = parseInt(detWin.style.height || "0", 10) || 0;
        /* Đợt A (9.9, việc 6): cửa sổ rời kéo được → so với size đã kéo
           (detachedWinSize), không phải hằng 354×200 nữa. */
        var dsz = detachedWinSize(avsState.mode);
        if (dw !== dsz.w || dh !== dsz.h) errs.push("cua so roi " + dw + "x" + dh + ", dung ra " + dsz.w + "x" + dsz.h);
      }
      if (isMainStage) {
        if (avsState.open && !avsState.detached && ea && !avsDiv) errs.push("AVS mo nhung nhung khong thay AVSGroup trong DOM");
        if (avsState.open && avsState.detached && !detWin) errs.push("AVS dang tach roi nhung khong thay cua so roi [data-avs-detached]");
        if (avsState.open && avsState.detached && ea && avsDiv) errs.push("AVS da tach roi nhung vung nhung AVSGroup van hien");
      }
      return errs;
    }

    /* Self-check tiếng (ĐỢT F — chạy thật qua checkDrawer ở index.html,
       chung 1 lần chạy console với các self-check khác; đợt 9.5 đã gỡ
       banner, chỉ ghi console). Bảo đảm MediaElementSource chỉ tạo
       1 lần/thẻ nằm ở ensureSource (audio.js: cờ + so khớp element);
       kiểm lúc chạy chỉ bắt TRIỆU CHỨNG: EQ bật + đang phát + graph đã
       dựng mà thẻ đang phát chưa có source nào → tiếng đang bypass,
       không qua EQ (đúng ra ensureSource phải nối ở loadedmetadata).
       Không báo khi chưa phát / EQ tắt / graph chưa dựng / chưa có engine. */
    function runAudioSelfCheck() {
      if (!audioEngine || !audioEngine.getState) return [];
      var st;
      try { st = audioEngine.getState(); } catch (e) { return []; }
      if (!st) return [];
      var errs = [];
      if (st.playing && st.eqOn && st.graphBuilt && st.currentKind) {
        var hasCurrent = st.currentKind === "video" ? st.videoSourced : st.audioSourced;
        if (!hasCurrent) errs.push("EQ bat nhung the " + st.currentKind + " dang phat chua co MediaElementSource — tieng dang bypass, khong qua EQ");
      }
      return errs;
    }

    var bitmapInfoCache = new Map();
    var fontCache = {}, glyphCache = new Map();
    var visCanvases = [], statusEls = [], tickerEls = [], timerEls = [],
        progressEls = [], volumebarEls = [], infoEls = [], sliderRecords = [];
    /* Đợt D (9.9) — AnimatedLayer filmstrip (vd beat_left.png 76×750 = 15 khung):
       mỗi rec {div, frames, frameH, frame, beat}: div là sprite đã sửa nền
       để chỉ hiện 1 khung; beat=true thì khung đổi theo analyser (nhạc). */
    var animLayerRecs = [];
    /* Đợt A (9.9, việc 1 — Media Library): nội dung mô phỏng trong khung
       XML của MLibrary (xem renderMlContent). mlFilter: nút cây đang
       chọn ("all"|"audio"|"video"|"radio"|"current"). */
    var mlListDiv = null, mlTreeDiv = null, mlFilter = "all", mlSelected = -1;
    /* Đợt A (9.9, việc 6 — resize): kích thước cửa sổ đã kéo (theo
       container: "Pledit"|"MLibrary"|"Video"|"Vis"), ghi đè w/h của
       layout lúc render. Trống = dùng đúng w/h trong XML. Lưu qua
       onWinSizeChange → localStorage (index.html), khôi bằng
       restoreWinSizes(). Cửa sổ chính KHÔNG có trong map này (cố định
       theo XML — minimum == w/h, như Winamp thật). */
    var winSizes = {};
    /* Đợt A (9.9, việc 6): kẹp kích thước chung khi XML không khai
       maximum_w/maximum_h (skin 566 không khai maximum nào). Đây là
       giới hạn chung của Amp, không phải số của skin 566. */
    var WIN_MAX_W = 1600, WIN_MAX_H = 1200;
    /* Đợt K (9.7, điểm 7a): registry cho lớp chỉ báo kênh (layer "channels"
       trong player.normal.songinfo) — để đổi bitmap none/stereo/mono/surround
       theo trạng thái phát mà không vẽ lại cả cửa sổ. */
    var channelsRec = null;
    var cfgGroups = {};
    var cfgState = new Map([["SHUFFLE", "off"], ["REPEAT", "0"], ["EQ_TOGGLE", "on"]]);
    /* Đợt B (9.9) — Options nối hành vi thật (đọc từ model, không hardcode GUID):
       cfgattrib trong XML có dạng "{GUID};Tên mục" (vd "{12ED320E-...};Show Menus
       in Main Window"). Mọi chỗ nối hành vi đều tra cứu theo PHẦN TÊN sau ";"
       (cfgAttribBySuffix quét RES.groupdefs lúc chạy, cache lại) nên skin khác
       dùng cùng tên mục vẫn nối được; GUID chỉ là khóa lưu trữ trong cfgState.
       - CFG_DEFAULTS: giá trị mặc định khi skin không quy định (MAKI gốc đặt
         mặc định lúc chạy, Amp không chạy được MAKI nên chọn theo hành vi
         mặc định của Winamp 5.66 Modern: menubar hiện, ngăn kéo trượt mượt,
         AVS mở phía trên main (main lùi 116 — đúng hành vi hiện tại của Amp),
         ticker cuộn kiểu Modern, cửa sổ Video/Vis nhúng (không tách rời),
         notifier hiện luôn, crossfade tắt. Ghi rõ trong README đợt B.
       - cfgSuffixOn(suffix, fallback): trạng thái hiện tại của mục (đọc
         cfgState); skin không có mục đó thì về fallback (để menubar... vẫn
         hiện khi skin lạ không khai tùy chọn).
       - applyCfgDefaults(): quét model 1 lần lúc tạo renderer, đặt mặc định
         cho mọi cfgattrib tìm thấy mà cfgState chưa có (khôi phục từ
         localStorage qua restoreCfgState sẽ ghi đè sau, xem index.html). */
    var CFG_DEFAULTS = {
      "Show Menus in Main Window": "on",
      "Show Menus in Playlist Editor": "on",
      "Show Menus in Media Library": "on",
      "Animate Video/Vis Drawer (disabled if opacity = 100%)": "on",
      "Animate Config Drawer": "on",
      "Open Video/Vis from the top": "on",
      "Open Video/Vis from the bottom": "off",
      "Bypass setting to keep in screen": "off",
      "Link Position and Width": "on",
      "Link Position, Unlink Width": "off",
      "Unlink Position and Width": "off",
      "Open Context Menu": "off",
      "Open Configuration": "off",
      "Show always": "on",
      "Show with windowshade and when minimized": "off",
      "Show only when minimized": "off",
      "Never show": "off",
      "Disable in fullscreen": "off",
      "Disable Songticker scrolling": "off",
      "Modern Songticker scrolling": "on",
      "Classic Songticker scrolling": "off",
      "Detach Vis Window": "off",
      "Detach Video Window": "off",
      "Enable Beat Visualization": "on",
      "Enable crossfading": "off"
    };
    var cfgAttribCache = {};
    function cfgAttribBySuffix(suffix) {
      if (cfgAttribCache[suffix] !== undefined) return cfgAttribCache[suffix];
      var found = null;
      var seen = new Set();
      var walk = function (kids, depth) {
        if (!kids || depth > 4) return;
        for (var i = 0; i < kids.length; i++) {
          var el = kids[i];
          if (!el || seen.has(el)) continue;
          seen.add(el);
          var at = null;
          try { at = el.getAttribute ? el.getAttribute("cfgattrib") : null; } catch (e) { at = null; }
          /* Khớp HẬU TỐ sau ";" (vd "{GUID};Show Menus in Main Window").
             Dùng endsWith, KHÔNG dùng indexOf === at.length - suffix.length - 1:
             indexOf trả -1 khi không khớp mà at.length === suffix.length thì
             vế phải cũng = -1 -> khớp oan (lỗi đợt B: default "Animate
             Video/Vis Drawer..." gán nhầm cho slider "Crossfade time" vì 2
             chuỗi cùng dài 53 ký tự). */
          if (at && at.slice(-(suffix.length + 1)) === ";" + suffix) { found = at; return; }
          var tag = "";
          try { tag = lowerTag(el); } catch (e) { tag = ""; }
          if (tag === "group" || tag === "groupdef") {
            var gid = "";
            try { gid = el.getAttribute("id") || ""; } catch (e) { gid = ""; }
            if (gid && RES.groupdefs[gid]) walk(RES.groupdefs[gid], depth + 1);
          }
          var kids2 = null;
          try { kids2 = elChildren(el); } catch (e) { kids2 = null; }
          if (kids2 && kids2.length) walk(kids2, depth + 1);
          if (found) return;
        }
      };
      var gkeys = Object.keys(RES.groupdefs || {});
      for (var g = 0; g < gkeys.length && !found; g++) walk(RES.groupdefs[gkeys[g]], 0);
      cfgAttribCache[suffix] = found;
      return found;
    }
    function cfgSuffixOn(suffix, fallback) {
      var at = cfgAttribBySuffix(suffix);
      if (!at) return !!fallback;
      return cfgOn(at);
    }
    function attribSuffix(attrib) {
      var s = String(attrib || "");
      var i = s.indexOf(";");
      return i >= 0 ? s.slice(i + 1) : s;
    }
    function applyCfgDefaults() {
      var names = Object.keys(CFG_DEFAULTS);
      for (var i = 0; i < names.length; i++) {
        var at = cfgAttribBySuffix(names[i]);
        if (at && !cfgState.has(at)) cfgState.set(at, CFG_DEFAULTS[names[i]]);
      }
    }
    applyCfgDefaults();
    /* Đợt D (9.9) — Beat Visualization mặc định theo tùy chọn Winamp
       ("Enable Beat Visualization": bật trong CFG_DEFAULTS — khớp Winamp
       5.66 Modern). Khôi phục từ localStorage (restoreCfgState) sẽ đồng
       bộ lại cờ này (xem cuối restoreCfgState). */
    beatVisOn = cfgSuffixOn("Enable Beat Visualization", true);
    /* Đợt B (9.9) — lưu/khôi cfg Options (localStorage "amp9-cfg-v9" qua
       onCfgChange ở index.html). Chỉ lưu các mục Options (cfgattrib dạng
       "{GUID};..."); KHÔNG lưu SHUFFLE/REPEAT/EQ_TOGGLE/SHADE_MUTE và các
       khóa ";Shuffle"/";Repeat" vì chúng đã có trong state phát
       (amp9-play-v9, restorePlaybackState đồng bộ). */
    var onCfgChange = opts.onCfgChange || null;
    var CFG_PERSIST_SKIP = { "SHUFFLE": 1, "REPEAT": 1, "EQ_TOGGLE": 1, "SHADE_MUTE": 1 };
    function getCfgState() {
      var out = {};
      cfgState.forEach(function (v, k) {
        if (CFG_PERSIST_SKIP[k]) return;
        if (/;Shuffle$/.test(k) || /;Repeat$/.test(k)) return;
        out[k] = v;
      });
      return out;
    }
    function restoreCfgState(saved) {
      if (!saved || typeof saved !== "object") return false;
      var keys = Object.keys(saved);
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        if (CFG_PERSIST_SKIP[k]) continue;
        if (/;Shuffle$/.test(k) || /;Repeat$/.test(k)) continue;
        cfgState.set(k, String(saved[k]));
      }
      /* Đồng bộ state dẫn xuất duy nhất còn giữ riêng: crossfadeOn (các
         trạng thái Options khác đọc cfgState trực tiếp lúc dùng). */
      var cfKey = cfgAttribBySuffix("Enable crossfading");
      if (cfKey) drawerState.crossfadeOn = cfgOn(cfKey);
      /* Đợt D (9.9): Beat Visualization cũng giữ cờ riêng (beatVisOn) để
         renderLayoutInner biết có hiện nhóm beat không — đồng bộ lại sau
         khi khôi phục cfg đã lưu (người dùng từng tắt thì vẫn tắt). */
      beatVisOn = cfgSuffixOn("Enable Beat Visualization", true);
      return true;
    }
    function persistCfg() {
      if (onCfgChange) { try { onCfgChange(getCfgState()); } catch (e) { /* lưu thất bại thì thôi */ } }
    }
    /* Đợt B (9.9) — menubar có hiện không, theo tùy chọn "Show Menus ..."
       (optionsgroup.menus). Gid -> tên mục trong XML; skin không có mục
       này thì hiện (fallback true). */
    function menuGroupVisible(gid) {
      var suffix = gid === "menu.group" ? "Show Menus in Main Window"
        : gid === "menu.group.pl" ? "Show Menus in Playlist Editor"
        : gid === "menu.group.ml" ? "Show Menus in Media Library" : "";
      if (!suffix) return true;
      return cfgSuffixOn(suffix, true);
    }
    /* Đợt B (9.9) — ngăn kéo / AVS có trượt mượt không, theo tùy chọn
       "Animate Config Drawer" / "Animate Video/Vis Drawer" (optionsgroup.drawers). */
    function drawerAnimEnabled() { return cfgSuffixOn("Animate Config Drawer", true); }
    function isAvsAnimEnabled() { return cfgSuffixOn("Animate Video/Vis Drawer (disabled if opacity = 100%)", true); }
    /* Đợt B (9.9) — "Detach Vis/Video Window" (optionsgroup.misc): tách rời
       cửa sổ Video/Vis khi mở ở chế độ tương ứng. */
    function detachOptionOn(mode) {
      if (mode === "vis") return cfgSuffixOn("Detach Vis Window", false);
      if (mode === "video") return cfgSuffixOn("Detach Video Window", false);
      return false;
    }
    function applyDetachOption(mode) {
      if (!RES.embeddedAvs || !avsState.open || avsState.mode !== mode) return;
      if (detachOptionOn(mode)) { if (!avsState.detached) detachAvs(); }
      else { if (avsState.detached) reattachAvs(); }
    }
    /* Đợt B (9.9) — nút Video/Vis trên cửa sổ chính làm gì, theo tùy chọn
       visbutton (optionsgroup.visbutton): "Open Context Menu" -> mở menu
       Video/Vis; "Open Configuration" -> mở ngăn kéo ở tab Options/trang
       visbutton; không chọn gì -> mở/đóng vùng AVS như trước (mặc định). */
    function visButtonAction() {
      if (cfgSuffixOn("Open Context Menu", false)) return "menu";
      if (cfgSuffixOn("Open Configuration", false)) return "config";
      return "toggle";
    }
    function visContextMenuItems() {
      return [
        { label: "Video", action: function () { openAvs("video"); } },
        { label: "Hiệu ứng (Vis)", action: function () { openAvs("vis"); } },
        { label: "Tách rời", action: function () { if (!avsState.open) openAvs(avsState.mode); detachAvs(); } },
        { label: "Đóng", action: function () { closeAvs(); } }
      ];
    }
    var lastStage = null, lastLayout = null, lastTitle = "";

    function colorOf(id) {
      if (!id) return "#fff";
      if (RES.colors[id]) return rgbVal(RES.colors[id]);
      return rgbVal(id);
    }
    async function bitmapInfoCached(id) {
      if (bitmapInfoCache.has(id)) return bitmapInfoCache.get(id);
      var info = await RES.bitmapInfo(id);
      bitmapInfoCache.set(id, info);
      return info;
    }
    function groupSize(gid, parentW, parentH) {
      var gd = RES.groupdefEls[gid];
      if (!gd) return [parentW, parentH];
      var w = gd.getAttribute("w") !== null ? relSize(gd, "w", parentW) : parentW;
      var h = gd.getAttribute("h") !== null ? relSize(gd, "h", parentH) : parentH;
      return [w, h];
    }
    function loadImage(url) {
      return new Promise(function (resolve, reject) {
        if (typeof Image === "undefined") { reject(new Error("không có Image")); return; }
        var im = new Image();
        var done = false;
        var timer = setTimeout(function () { if (!done) { done = true; reject(new Error("het gio tai anh")); } }, 2000);
        im.onload = function () { if (!done) { done = true; clearTimeout(timer); resolve(im); } };
        im.onerror = function () { if (!done) { done = true; clearTimeout(timer); reject(new Error("không tải được ảnh")); } };
        im.src = url;
      });
    }

    /* Tile đúng: cắt riêng vùng crop thành ảnh tile (cache dataURL) rồi
       lặp lại — thay vì dùng cả ảnh nguồn làm nền repeat (khi phần tử hẹp
       hơn ảnh nguồn thì repeat không lặp mà hiện một lát cắt liên tục, lôi
       cả dải trong suốt ngăn cách các crop trong ảnh nguồn vào → lằn đen).
       Lỗi 1 (display 2 lằn đen): display.png có dải trong suốt dọc tại
       x=142-144 và x=219-223; lát cắt x=60-245 hiện chúng lên. Crop lấy từ
       model (info.crop) nên đúng với mọi skin, không hardcode số 566.
       Trả null khi không cắt được (jsdom/không canvas) → gọi dùng cách cũ. */
    var tileCache = new Map();
    async function tileURL(bitmapId, info, url) {
      if (tileCache.has(bitmapId)) return tileCache.get(bitmapId);
      var out = null;
      try {
        if (info && info.crop && typeof document !== "undefined" && typeof Image !== "undefined") {
          var im = await loadImage(url);
          var c = document.createElement("canvas");
          var cx = null;
          try { cx = c.getContext("2d"); } catch (e) { cx = null; }
          if (cx && im.naturalWidth && im.naturalHeight) {
            c.width = info.crop.w; c.height = info.crop.h;
            cx.drawImage(im, info.crop.x, info.crop.y, info.crop.w, info.crop.h, 0, 0, info.crop.w, info.crop.h);
            out = c.toDataURL("image/png");
          }
        }
      } catch (e) { out = null; }
      tileCache.set(bitmapId, out);
      return out;
    }

    /* Vẽ 1 sprite: crop/tile/alpha theo SPEC §3.4. */
    async function spriteDiv(bitmapId, elW, elH, o) {
      o = o || {};
      var info = await bitmapInfoCached(bitmapId);
      if (!info || !info.file) return null;
      var url = await RES.fileURL(info.file);
      if (!url) return null;
      var w = elW || info.w, h = elH || info.h;
      if (!w || !h) return null;
      var div = document.createElement("div");
      div.className = "spr";
      div.dataset.bitmap = bitmapId;
      if (o.tile) div.dataset.tile = "1";
      div.style.width = w + "px"; div.style.height = h + "px";
      div.style.backgroundImage = 'url("' + url + '")';
      if (info.crop) {
        var src = await RES.imgSize(info.file);
        var sw = src ? src.w : info.w, sh = src ? src.h : info.h;
        if (o.tile) {
          var turl = await tileURL(bitmapId, info, url);
          if (turl) {
            div.style.backgroundImage = 'url("' + turl + '")';
            div.style.backgroundSize = info.crop.w + "px " + info.crop.h + "px";
            div.style.backgroundPosition = "0 0";
            div.style.backgroundRepeat = "repeat";
          } else {
            div.style.backgroundSize = sw + "px " + sh + "px";
            div.style.backgroundPosition = (-info.crop.x) + "px " + (-info.crop.y) + "px";
            div.style.backgroundRepeat = "repeat";
          }
        } else {
          var sx = w / info.crop.w, sy = h / info.crop.h;
          div.style.backgroundSize = Math.round(sw * sx) + "px " + Math.round(sh * sy) + "px";
          div.style.backgroundPosition = Math.round(-info.crop.x * sx) + "px " + Math.round(-info.crop.y * sy) + "px";
        }
      } else {
        div.style.backgroundSize = w + "px " + h + "px";
        div.style.backgroundPosition = "0 0";
        if (o.tile) div.style.backgroundRepeat = "repeat";
      }
      if (o.opacity != null) div.style.opacity = o.opacity;
      return div;
    }

    /* ---------- font bitmap ---------- */
    async function loadFont(fontId) {
      if (fontCache[fontId]) return fontCache[fontId];
      var f = RES.fonts[fontId];
      if (!f) { fontCache[fontId] = null; return null; }
      var bmp = RES.bitmaps[f.file];
      if (!bmp) { fontCache[fontId] = null; return null; }
      var url = await RES.fileURL(bmp.file);
      if (!url) { fontCache[fontId] = null; return null; }
      var img;
      try { img = await loadImage(url); } catch (e) { fontCache[fontId] = null; return null; }
      var canvas = document.createElement("canvas");
      var ctx = null;
      try { ctx = canvas.getContext("2d"); } catch (e) { ctx = null; }
      if (!ctx) { fontCache[fontId] = { img: img, canvas: canvas, ctx: null, baseX: 0, baseY: 0, charwidth: f.charwidth, charheight: f.charheight, hspacing: f.hspacing, vspacing: f.vspacing }; return fontCache[fontId]; }
      canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
      var cw = f.charwidth, chh = f.charheight;
      var baseX = bmp.crop ? bmp.crop.x : 0, baseY = bmp.crop ? bmp.crop.y : 0;
      /* Đợt K (9.7): KHÔNG đảo alpha. Font "khuôn" (songinfofont) vẽ nguyên
         bản — nền ô đục + glyph lỗ trong suốt là đúng như Winamp vẽ
         (xem ghi chú FONT_ROWS trên). Cơ chế đếm opaque/inverted cũ đã bỏ. */
      var rec = { img: img, canvas: canvas, ctx: ctx, baseX: baseX, baseY: baseY, charwidth: f.charwidth, charheight: f.charheight, hspacing: f.hspacing, vspacing: f.vspacing };
      fontCache[fontId] = rec;
      return rec;
    }
    async function glyphURL(fontId, ch, color) {
      var key = fontId + "|" + ch + "|" + (color || "");
      if (glyphCache.has(key)) return glyphCache.get(key);
      var font = await loadFont(fontId);
      var pos = fontCharPos(fontId, ch);
      if (!font || !font.ctx || !pos) { glyphCache.set(key, null); return null; }
      var cw = font.charwidth, chh = font.charheight;
      var sx = font.baseX + pos.col * cw, sy = font.baseY + pos.row * chh;
      var c = document.createElement("canvas");
      c.width = cw; c.height = chh;
      var cx = c.getContext("2d");
      if (!cx) { glyphCache.set(key, null); return null; }
      cx.drawImage(font.img, sx, sy, cw, chh, 0, 0, cw, chh);
      /* Đợt K (9.7): không lật alpha nữa (xem loadFont) — glyph vẽ nguyên bản. */
      var col = colorOf(color);
      if (col !== "#fff" && col !== "rgb(255,255,255)") {
        cx.globalCompositeOperation = "source-in";
        cx.fillStyle = col;
        cx.fillRect(0, 0, cw, chh);
      }
      var url = "";
      try { url = c.toDataURL("image/png"); } catch (e) { url = ""; }
      glyphCache.set(key, url || null);
      return url || null;
    }
    /* valign: Winamp căn chữ GIỮA dọc trong hộp text theo mặc định; chỉ
       khi valign="top" mới dồn lên trên. Bằng chứng: tab text có hộp
       y=-5 cao 27px (relath=1, h=8) cho chữ smallfont cao 8px — chỉ căn
       giữa mới đặt chữ đúng giữa tab 19px; CFDisplay ghi rõ valign="top"
       (tức mặc định không phải top). Không căn giữa thì chữ tab lòi 5px
       lên trên tab. skin-sim không xử lý valign nên vẽ sai chỗ này. */
    async function makeBitmapText(fontId, text, boxW, align, color, valign, boxH) {
      var div = document.createElement("div");
      div.className = "txt";
      var font = RES.fonts[fontId];
      if (!font || font.tag === "truetypefont") {
        div.textContent = text;
        div.style.font = "bold 11px Arial";
        div.style.color = colorOf(color);
        return div;
      }
      var advance = font.charwidth + font.hspacing;
      var holder = document.createElement("span");
      var totalW = 0;
      for (var i = 0; i < text.length; i++) {
        var ch = text[i];
        if (ch === " ") {
          totalW += advance;
          var sp0 = document.createElement("span");
          sp0.className = "glyph"; sp0.style.width = advance + "px"; sp0.style.height = font.charheight + "px";
          holder.appendChild(sp0); continue;
        }
        var url = await glyphURL(fontId, ch, color);
        var sp = document.createElement("span");
        sp.className = "glyph";
        sp.style.width = font.charwidth + "px"; sp.style.height = font.charheight + "px";
        if (url) sp.style.backgroundImage = 'url("' + url + '")';
        else sp.textContent = ch; /* fallback khi không vẽ được glyph (vd jsdom): giữ chữ đọc được */
        holder.appendChild(sp);
        totalW += advance;
      }
      if (align === "center" && boxW && totalW < boxW) holder.style.marginLeft = Math.floor((boxW - totalW) / 2) + "px";
      if (align === "right" && boxW && totalW < boxW) holder.style.marginLeft = Math.floor(boxW - totalW) + "px";
      if (valign !== "top" && boxH && boxH > font.charheight) {
        /* Lỗi 4 (chữ tab lòi lên trên): holder là <span> inline nên
           margin-top bị trình duyệt bỏ qua, chữ dính lên đầu hộp.
           Đặt inline-block để margin căn giữa có tác dụng. Chỉ ảnh
           hưởng các text cần căn giữa (boxH > charheight); timer BIGNUM
           boxH=20=charheight nên không đổi. */
        holder.style.display = "inline-block";
        holder.style.marginTop = Math.round((boxH - font.charheight) / 2) + "px";
      }
      div.appendChild(holder);
      div._textW = totalW;
      return div;
    }

    /* ---------- walker ---------- */
    function frameGroupFor(contentId) {
      return {
        "player.content.group": "wasabi.mainframe.nostatusbar",
        "pledit.content.group": "wasabi.playlistframe.nostatusbar",
        "mledit.content.group": "wasabi.medialibraryframe.nostatusbar",
        "video.content.group": "wasabi.visframe.nostatusbar",
        "vis.content.group": "wasabi.visframe.nostatusbar"
      }[contentId] || null;
    }
    function xuiGroupFor(tag, el) {
      var t = tag.toLowerCase();
      if (t === "titlebar") return "wasabi.titlebar";
      if (t === "button_normal") return "menu.button.normal";
      if (t === "button_hover") return "menu.button.hover";
      if (t === "button_pressed") return "menu.button.pressed";
      if (t === "nostatus") {
        var content = el.getAttribute("content");
        if (content) return frameGroupFor(content);
        return null;
      }
      return null;
    }
    function setAbs(el, parentEl, x, y) {
      el._absX = (parentEl._absX || 0) + x;
      el._absY = (parentEl._absY || 0) + y;
    }
    function shiftSubtree(el, dy) {
      el._absY = (el._absY || 0) + dy;
      var kids = el.children || [];
      for (var i = 0; i < kids.length; i++) shiftSubtree(kids[i], dy);
    }

    async function renderChildren(children, parentEl, parentW, parentH, ctx, depth, skipLocalHide) {
      if (depth > MAX_DEPTH) return;
      var localHidden = new Set();
      /* v9.6 (Điểm 2): hideobject CHỈ áp trong subtree của groupdef chứa
         nó, KHÔNG áp lên con trực tiếp của <layout>. Trước đây lời gọi cấp
         layout cũng gom hideobject (player-normal.xml:26
         target="close;close.inactive") rồi ẩn luôn 2 nút Close của chính
         layout (x=-17) — chỉ còn trơ viên pill nền, không có icon X.
         hideobject đó chỉ nhằm nút Close NỘI BỘ của MainFrame (đã ẩn đúng
         qua ctx.frameHidden -> frameCtx.hiddenIds). Lời gọi cấp layout
         truyền skipLocalHide=true (xem renderLayout); mọi lời gọi khác
         giữ nguyên. */
      if (!skipLocalHide) {
        for (var i = 0; i < children.length; i++) {
          if (lowerTag(children[i]) === "hideobject") {
            var parts = (children[i].getAttribute("target") || "").split(";");
            for (var j = 0; j < parts.length; j++) if (parts[j]) localHidden.add(parts[j].toLowerCase());
          }
        }
      }
      for (var k = 0; k < children.length; k++) {
        var el = children[k], tag = lowerTag(el);
        if (SKIP_TAGS[tag] || tag.indexOf("colorthemes:") === 0) continue;
        if (!isActiveVersion(el)) continue;
        var id = el.getAttribute("id") || "";
        if (localHidden.has(id.toLowerCase())) continue;
        /* Đợt C — nhánh frame XUI đã vẽ nhóm content qua cdiv: bỏ instance
           cùng nhóm content trong groupdef của frame (không thì nhóm vẽ
           2 lần — probe S9: g.main ×2 ở cùng y=18). */
        if (tag === "group" && ctx._skipGroupId && String(id).toLowerCase() === ctx._skipGroupId) continue;
        if (el.getAttribute("visible") === "0" && !ctx.overrides.get(id)) continue;
        if (ctx.overrides.get(id) === false) continue;
        if (ctx.hiddenIds && ctx.hiddenIds.has(id.toLowerCase())) continue;
        /* Đợt D — nhóm nút AVS theo chế độ (v8 syncEmbAvsMode): chỉ vẽ
           nhóm của chế độ đang hiện (buttons.video khi mode=video...).
           ctx.avsMode chỉ đặt khi vẽ cửa sổ chính; context khác không
           có thì không lọc. */
        if (tag === "group") {
          var avsRule = AVS_MODE_GROUPS[id];
          if (avsRule && ctx.avsMode && avsRule !== ctx.avsMode) continue;
        }
        var x = relPos(el, "x", parentW), y = relPos(el, "y", parentH);
        await renderNode(el, tag, parentEl, parentW, parentH, x, y, ctx, depth);
      }
    }

    /* Rộng tab (D7 — QUYẾT THEO XML, không theo công thức v8):
       groupdef tab có autowidthsource trỏ tới <text> (x=11, w=-24 relatw=1,
       font smallfont): rộng vừa khít = textW + 24 (lề trái 11 + lề phải 13).
       -> Equalizer 78 / Options 66 / Color Themes 96.
       v8 vẽ 82/70/100 theo công thức 11+text+2+15 (+4px/tab, không có căn
       cứ trong XML) nên KHÔNG dùng. Đo lúc chạy từ font metrics trong model. */
    async function measureTabWidth(subGid) {
      var gdEl = RES.groupdefEls[subGid];
      var kids = RES.groupdefs[subGid] || [];
      var textEl = null;
      var autoSrc = gdEl ? gdEl.getAttribute("autowidthsource") : "";
      for (var i = 0; i < kids.length; i++) {
        if (lowerTag(kids[i]) !== "text") continue;
        if (autoSrc && kids[i].getAttribute("id") === autoSrc) { textEl = kids[i]; break; }
        if (!textEl) textEl = kids[i];
      }
      if (textEl) {
        var font = RES.fonts[textEl.getAttribute("font") || ""];
        var adv = font ? (font.charwidth + font.hspacing) : 6;
        var textW = (textEl.getAttribute("default") || "").length * adv;
        var wAttr = intAttr(textEl, "w", 0);
        if (textEl.getAttribute("relatw") === "1" && wAttr < 0) return textW - wAttr;
        return textW + intAttr(textEl, "x", 0) + 13;
      }
      /* Fallback (không có text): rộng bằng layer rộng nhất (cách skin-sim). */
      var tw = 0;
      for (var j = 0; j < kids.length; j++) {
        if (lowerTag(kids[j]) === "layer") {
          var info = await bitmapInfoCached(kids[j].getAttribute("image"));
          if (info && info.w > tw) tw = info.w;
        }
      }
      return tw;
    }

    /* Tab Options — phần thêm vẽ tay (GroupXFade + componentbucket nằm
       trong SKIP_TAGS nên renderChildren bỏ qua):
       - Bucket (17,20,81×55): 7 mục bucket.entry.N (đọc từ model, sắp theo
         số), mỗi mục là ảnh nút + bóng; bấm để đổi trang config.
       - Target (100,12,200×74): vẽ groupdef optionsgroup.* đang chọn
         (checkbox/radio cfgattrib thật trong skin, không bịa HTML).
       - Nút cuộn lên/xuống (cb_prevpage/cb_nextpage) do renderButton lo. */
    async function renderOptionsExtras(div, gw, gh, ctx, depth) {
      var entries = bucketEntries();
      var bucket = document.createElement("div");
      bucket.style.position = "absolute"; bucket.style.left = "17px"; bucket.style.top = "20px";
      bucket.style.width = "81px"; bucket.style.height = "55px";
      bucket.style.overflow = "hidden"; bucket.style.pointerEvents = "auto";
      setAbs(bucket, div, 17, 20);
      bucket.dataset.optionsBucket = "1";
      div.appendChild(bucket);
      var inner = document.createElement("div");
      inner.style.position = "absolute"; inner.style.left = "0px";
      inner.style.top = (-drawerState.bucketScroll) + "px";
      inner.style.width = "81px"; inner.style.height = (entries.length * 14) + "px";
      setAbs(inner, bucket, 0, -drawerState.bucketScroll);
      bucket.appendChild(inner);
      for (var i = 0; i < entries.length; i++) {
        var target = bucketEntryTarget(entries[i].gid);
        var active = target !== "" && target === drawerState.optionsPage;
        var ediv = document.createElement("div");
        ediv.style.position = "absolute"; ediv.style.left = "0px"; ediv.style.top = (i * 14) + "px";
        ediv.style.width = "81px"; ediv.style.height = "14px";
        ediv.style.cursor = "pointer"; ediv.style.pointerEvents = "auto";
        setAbs(ediv, inner, 0, i * 14);
        ediv.dataset.bucketEntry = entries[i].gid;
        ediv.dataset.optionsPage = target;
        ediv.title = target;
        (function (t) {
          ediv.onclick = function () {
            if (t) { drawerState.optionsPage = t; requestRerender(); }
          };
        })(target);
        inner.appendChild(ediv);
        var kids = RES.groupdefs[entries[i].gid] || [];
        for (var k = 0; k < kids.length; k++) {
          var ktag = lowerTag(kids[k]);
          if (ktag === "layer") {
            var limg = kids[k].getAttribute("image");
            if (!limg) continue;
            var lspr = await spriteDiv(limg, null, null, { opacity: alphaOf(kids[k]) });
            if (lspr) {
              lspr.style.left = relPos(kids[k], "x", 81) + "px"; lspr.style.top = relPos(kids[k], "y", 14) + "px";
              setAbs(lspr, ediv, relPos(kids[k], "x", 81), relPos(kids[k], "y", 14));
              ediv.appendChild(lspr);
            }
          } else if (ktag === "togglebutton" || ktag === "button") {
            var bimg = active && kids[k].getAttribute("activeImage")
              ? kids[k].getAttribute("activeImage") : kids[k].getAttribute("image");
            if (!bimg) continue;
            var bspr = await spriteDiv(bimg, null, null, {});
            if (bspr) {
              bspr.style.left = relPos(kids[k], "x", 81) + "px"; bspr.style.top = relPos(kids[k], "y", 14) + "px";
              setAbs(bspr, ediv, relPos(kids[k], "x", 81), relPos(kids[k], "y", 14));
              ediv.appendChild(bspr);
            }
          }
        }
      }
      var targetDiv = document.createElement("div");
      targetDiv.style.position = "absolute"; targetDiv.style.left = "100px"; targetDiv.style.top = "12px";
      targetDiv.style.width = "200px"; targetDiv.style.height = "74px";
      targetDiv.style.pointerEvents = "auto";
      setAbs(targetDiv, div, 100, 12);
      targetDiv.dataset.optionsTarget = "1";
      div.appendChild(targetDiv);
      var pageKids = RES.groupdefs[drawerState.optionsPage] || [];
      if (pageKids.length) await renderChildren(pageKids, targetDiv, 200, 74, ctx, depth + 1);
    }

    /* Tab Color Themes — danh sách 44 preset vẽ tay (<ColorThemes:List> bị
       SKIP_TAGS bỏ qua). Hàng 13px, font Arial 11px; hàng chọn nền
       103,136,201 chữ 214,228,255 (màu chọn thật của skin, như playlist).
       Bấm hàng = chọn + áp màu ngay; nút Prev/Next/Set do renderButton lo.
       Thanh cuộn: ảnh nền + nút trượt trang trí đã vẽ sẵn; nút trượt di
       chuyển theo scrollTop (đỉnh track y=5, cao thumb 31, hành trình 48). */
    async function renderColorThemesExtras(div, gw, gh, ctx) {
      var sets = getGammasets();
      var list = document.createElement("div");
      list.style.position = "absolute"; list.style.left = "6px"; list.style.top = "5px";
      list.style.width = "204px"; list.style.height = "80px";
      list.style.overflowY = "auto"; list.style.overflowX = "hidden";
      list.style.pointerEvents = "auto";
      list.style.fontFamily = "Arial, sans-serif"; list.style.fontSize = "11px";
      list.style.color = "#fff";
      try { list.style.scrollbarWidth = "none"; } catch (e) { /* jsdom */ }
      setAbs(list, div, 6, 5);
      list.dataset.colorthemesList = "1";
      div.appendChild(list);
      for (var i = 0; i < sets.length; i++) {
        var row = document.createElement("div");
        row.style.width = "204px"; row.style.height = "13px";
        row.style.lineHeight = "13px"; row.style.padding = "0 3px";
        row.style.whiteSpace = "nowrap"; row.style.overflow = "hidden";
        row.style.cursor = "default"; row.style.pointerEvents = "auto";
        row.textContent = sets[i].id;
        row.dataset.presetIdx = String(i);
        row.dataset.presetId = sets[i].id;
        if (i === drawerState.colorThemeIdx) {
          row.style.background = "rgb(103, 136, 201)";
          row.style.color = "rgb(214, 228, 255)";
        }
        (function (idx) {
          row.onclick = function () { selectColorTheme(idx); };
        })(i);
        list.appendChild(row);
      }
      /* Nút trượt thanh cuộn: ảnh tĩnh trong XML ở y=22, dời theo scroll. */
      var thumb = null;
      try { thumb = div.querySelector('[data-bitmap="wasabi.scrollbar.vertical.button"]'); } catch (e) { thumb = null; }
      function placeThumb() {
        if (!thumb) return;
        var maxScroll = Math.max(0, sets.length * 13 - 80);
        var frac = maxScroll > 0 ? (list.scrollTop || 0) / maxScroll : 0;
        var top = Math.round(5 + frac * 48);
        thumb.style.top = top + "px";
        thumb._absY = (div._absY || 0) + top;
      }
      placeThumb();
      list.onscroll = placeThumb;
    }

    async function renderGroupInstance(el, parentEl, parentW, parentH, x, y, ctx, depth) {
      var gid = el.getAttribute("id");
      if (!gid || !RES.groupdefs[gid]) return;
      /* groupdef visible="0" thì mọi instance mặc định ẩn (vd AVSGroup). */
      var gdEl = RES.groupdefEls[gid];
      if (gdEl && gdEl.getAttribute("visible") === "0"
        && el.getAttribute("visible") !== "1" && !ctx.overrides.get(gid)) return;
      if (el.getAttribute("move") === "1" && !ctx.overrides.get(gid)) return;
      var gw, gh;
      if (el.getAttribute("w") !== null || el.getAttribute("h") !== null) {
        var gs = groupSize(gid, parentW, parentH);
        gw = el.getAttribute("w") !== null ? relSize(el, "w", parentW) : gs[0];
        gh = el.getAttribute("h") !== null ? relSize(el, "h", parentH) : gs[1];
      } else {
        var gs2 = groupSize(gid, parentW, parentH);
        gw = gs2[0]; gh = gs2[1];
      }
      if (gw <= 0) gw = parentW;
      /* AVSGroup — CAO 116 LÀ GIÁ TRỊ SUY RA, không phải thuộc tính XML trực
         tiếp (VERIFIED-NUMBERS.md §3c): trong toàn bộ XML, số 116 chỉ xuất
         hiện 1 lần, ở snapadjustbottom (thuộc về ngăn kéo). Công thức XML
         của AVSGroup (relath=1, h=-280) tính theo content 262 cho ra -18
         (vô nghĩa), nên loader v8 đặt h = snapadjustbottom; v9 giữ quy tắc
         đó. Nhất quán với mọi hình học nội bộ: dải trên 21 + video 69 +
         dải dưới 26 = 116; video.group h = 116-47 = 69; nút video/vis
         y=-21 cao 21 → vừa khít 95..116; main lùi 116 → đáy 259. */
      if (gid === "AVSGroup" && gh <= 0) gh = (ctx && ctx.avsH) || 116;
      if (gh <= 0) gh = parentH;
      /* Căn giữa nội dung ngăn kéo: 326 trong 354 → thụt 14px. Chỉ áp khi
         vẽ trong ngăn kéo thật (cha là drawer). */
      if (gid === "player.normal.drawer.content" && parentEl.dataset && parentEl.dataset.gid === "player.normal.drawer") {
        x = Math.round((parentW - gw) / 2);
      }
      /* v9.6 (Điểm 1): 2 streak của titlebar dời theo chữ đã căn giữa
         (titlebar.maki dời streak theo chữ; XML tĩnh để streak trái 0–95
         và phải 155–325, chữ cũ ở 100–150 dính vào streak trái).
         Mức 1: streak trái giữ x=0, ngắn lại tới cách chữ 8px; streak
         phải bắt đầu cách chữ 8px, kéo tới hết group. 8px = khe đo từ
         ảnh WACUP thật; vị trí chữ lấy từ ctx.titleCenter (nhánh XUI).
         Phân biệt 2 instance bằng x trong XML (trái x=0, phải x≠0) vì
         renderer không đọc instanceid. Các lớp con trong streak (center
         relatw=1) tự giãn theo rộng group mới. */
      if (gid === "wasabi.titlebar.streak" && ctx.titleCenter) {
        var tc = ctx.titleCenter;
        var gAbsX = parentEl._absX || 0;
        if (x === 0) {
          gw = Math.max(0, Math.round((tc.textLeftAbs - 8) - gAbsX));
        } else {
          x = Math.round((tc.textRightAbs + 8) - gAbsX);
          gw = Math.max(0, Math.round((gAbsX + parentW) - (tc.textRightAbs + 8)));
        }
      }
      /* Đợt C — chống vẽ trùng 1 instance: cùng 1 group đã vẽ ở cùng vị
         trí tuyệt đối + cùng cỡ trong lần render này thì bỏ (XML liệt kê
         lặp instance, include lặp, hoặc groupdef trùng — probe S4: instance
         thứ 3 trùng hệt instance đầu ở y=0; probe S9: content vẽ 2 lần
         qua cdiv + frame). Chỉ áp cho <group> (nút Minimize/Close của 566
         liệt kê 2 lần là <button> inactive/active, không thuộc diện này).
         Ghi nhận TRƯỚC khi vẽ để bản sau (menu/tabs/drawer) cũng chỉ vẽ 1 lần. */
      if (ctx && ctx._seenGroups) {
        var _absGX = (parentEl._absX || 0) + x, _absGY = (parentEl._absY || 0) + y;
        var _gkey = lowerStr(gid) + "|" + _absGX + "|" + _absGY + "|" + gw + "|" + gh;
        if (ctx._seenGroups.has(_gkey)) return;
        ctx._seenGroups.add(_gkey);
      }
      var div = document.createElement("div");
      div.style.position = "absolute";
      div.style.left = x + "px"; div.style.top = y + "px";
      div.style.width = gw + "px"; div.style.height = gh + "px";
      setAbs(div, parentEl, x, y);
      div.dataset.gid = gid;
      /* Lỗi 8 (9.4, sửa lại 9.6 — Điểm 3): ngăn kéo phải là stacking
         context riêng (isolation) để z-index:2 của config.tabs không thoát
         ra ngoài ngăn kéo. 9.4 từng để shadow (anh em sau của ngăn kéo)
         đè lên TOÀN BỘ ngăn kéo — sai: shadow là dải 15px cuối ngăn kéo,
         chồng 13px dưới của tab + chữ đen, làm tab tối còn ~61–102 thay
         vì ~205 (ảnh điện thoại 3/11 09:10). 9.6 đảo thứ tự DOM (xem
         renderLayout): shadow đứng TRƯỚC drawer nên vẽ DƯỚI ngăn kéo;
         tab vẫn giữ z:2 để đè nền panel ColorThemes BÊN TRONG ngăn kéo
         (D10). Không có ảnh Winamp thật nào chứng minh shadow phải đè
         lên tab. */
      if (gid === "player.normal.drawer") div.style.isolation = "isolate";
      div.style.pointerEvents = "none";
      parentEl.appendChild(div);
      /* Menu ngang: mỗi mục rộng bằng ảnh layer rộng nhất trong groupdef con. */
      if (gid === "menu.group" || gid === "menu.group.pl" || gid === "menu.group.ml") {
        /* Đợt B (9.9) — "Show Menus ..." (optionsgroup.menus): tắt thì KHÔNG
           vẽ menubar (gỡ hộp khỏi DOM như nhánh config.tabs khi đóng). Các mục
           còn lại không dời (vị trí tuyệt đối theo XML); ẩn menubar chỉ để
           lại nền skin ở dải y=18 như Winamp thật khi tắt menu. Skin không có
           mục tùy chọn này thì luôn hiện (fallback true). */
        if (!menuGroupVisible(gid)) {
          if (div.parentElement) div.parentElement.removeChild(div);
          return;
        }
        var cx = 0;
        var mchildren = RES.groupdefs[gid];
        for (var mi = 0; mi < mchildren.length; mi++) {
          if (lowerTag(mchildren[mi]) !== "group") continue;
          var cgid = mchildren[mi].getAttribute("id");
          var cw = 0;
          var gc = RES.groupdefs[cgid] || [];
          for (var gi = 0; gi < gc.length; gi++) {
            if (lowerTag(gc[gi]) === "layer") {
              var info = await bitmapInfoCached(gc[gi].getAttribute("image"));
              if (info && info.w > cw) cw = info.w;
            }
          }
          var sub = document.createElement("div");
          sub.style.position = "absolute"; sub.style.left = cx + "px"; sub.style.top = "0px";
          var menuSubH = groupSize(cgid, cw, gh)[1] || gh;
          sub.style.width = cw + "px"; sub.style.height = menuSubH + "px";
          setAbs(sub, div, cx, 0);
          sub.dataset.menuItem = cgid || "";
          /* Đợt C — mục menu bấm được (nhóm cha pointer-events:none nên
             phải bật auto ở đây; sprite con đã pointer-events:none nên
             click rơi đúng vào sub div):
             - Menubar chính: View -> menu con (Playlist Editor, Ngăn kéo).
               File/Play/Options/Help chưa có menu thật ở đợt C (maki).
             - Menubar playlist: File -> menu thêm, Playlist -> menu quản
               lý, Sort -> menu sắp xếp, Help -> ghi chú. */
          sub.style.pointerEvents = "auto";
          sub.style.cursor = "pointer";
          (function (parentGid, itemGid, anchor) {
            anchor.onclick = function () {
              /* Đợt D (9.9) — menubar chính nay đủ 5 mục con (File/Play/
                 Options/View/Help); menubar playlist giữ nguyên 4 mục. */
              if (parentGid === "menu.group" && itemGid === "menugroup.file") { showPlaylistMenu(anchor, fileMenuItems(anchor)); return; }
              if (parentGid === "menu.group" && itemGid === "menugroup.play") { showPlaylistMenu(anchor, playMenuItems()); return; }
              if (parentGid === "menu.group" && itemGid === "menugroup.options") { showPlaylistMenu(anchor, optionsMenuItems(anchor)); return; }
              if (parentGid === "menu.group" && itemGid === "menugroup.view") { showPlaylistMenu(anchor, viewMenuItems()); return; }
              if (parentGid === "menu.group" && itemGid === "menugroup.help") { showPlaylistMenu(anchor, helpMenuItems(anchor)); return; }
              if (parentGid === "menu.group.pl" && itemGid === "menugroup.pe_file") { showPlaylistMenu(anchor, addMenuItems(anchor)); return; }
              if (parentGid === "menu.group.pl" && itemGid === "menugroup.pe_playlist") { showPlaylistMenu(anchor, manageMenuItems(anchor)); return; }
              if (parentGid === "menu.group.pl" && itemGid === "menugroup.pe_sort") { showPlaylistMenu(anchor, miscMenuItems()); return; }
              if (parentGid === "menu.group.pl" && itemGid === "menugroup.pe_help") { showHelpNote(anchor); return; }
            };
          })(gid, cgid, sub);
          div.appendChild(sub);
          await renderChildren(RES.groupdefs[cgid] || [], sub, cw, gh, ctx, depth + 1);
          cx += cw;
        }
        return;
      }
      /* config.tabs: chỉ tab chọn ở trạng thái ".on", còn lại ".off".
         Đợt G — khi ngăn kéo ĐÓNG thì KHÔNG vẽ tab: tab ở đáy ngăn kéo
         (drawer y=108, cao 19, đáy 127) trong khi dải nghỉ khi đóng chỉ
         lộ 13px (drawer y=116..129) nên 9px dưới của tab lọt ra ngoài
         cửa sổ chính, bị cắt ngang nửa chữ (ảnh điện thoại thật 2/11).
         Ẩn tab khi đóng → dải nghỉ chỉ còn vỏ ngăn kéo + nút mở (nút
         mở ở drawer y=118, trong dải nghỉ nên vẫn hiện). Khi mở, tab ở
         đáy ngăn kéo là đúng XML nên vẽ đủ 3 tab như cũ. */
      if (gid === "config.tabs") {
        if (!ctx.drawerOpen) {
          /* Đợt G — gỡ luôn hộp rỗng khỏi DOM (hộp đã append ở đầu hàm):
             chỉ return thì hộp rỗng 127px vẫn nằm trong DOM (không chữ
             nhưng test/DOM vẫn thấy config.tabs); gỡ hẳn cho sạch. */
          if (div.parentElement) div.parentElement.removeChild(div);
          return;
        }
        div.style.zIndex = "2";
        var tabs = [["config.tab.eq", "eq"], ["config.tab.options", "options"], ["config.tab.colorthemes", "colorthemes"]];
        var tx = 0;
        for (var ti = 0; ti < tabs.length; ti++) {
          var tabGid = tabs[ti][0], tkey = tabs[ti][1];
          var on = ctx.drawerTab === tkey;
          var subId = tabGid + (on ? ".on" : ".off");
          var subGid = RES.groupdefs[subId] ? subId : tabGid;
          var tw = await measureTabWidth(subGid);
          var tsub = document.createElement("div");
          tsub.style.position = "absolute"; tsub.style.left = tx + "px"; tsub.style.top = "0px";
          var tabSubH = groupSize(subGid, tw, gh)[1] || gh;
          tsub.style.width = tw + "px"; tsub.style.height = tabSubH + "px";
          tsub.style.cursor = "pointer";
          tsub.style.pointerEvents = "auto";
          tsub.title = tkey;
          setAbs(tsub, div, tx, 0);
          tsub.dataset.tab = tkey;
          (function (key, elx) {
            elx.onclick = function () {
              drawerTab = key;
              if (onTabChange) onTabChange(key);
              else if (onRerender) onRerender();
            };
          })(tkey, tsub);
          div.appendChild(tsub);
          /* parentH = tabSubH (19), KHÔNG phải gh (127): text trong tab có
             h=8 relath=1 — với parentH 127 thì hộp text cao 135px, chữ
             căn giữa lệch 64px; với 19 thì hộp 27px, chữ đúng giữa tab. */
          await renderChildren(RES.groupdefs[subGid] || [], tsub, tw, tabSubH, ctx, depth + 1);
          tx += tw;
        }
        return;
      }
      /* Ngăn kéo: chỉ vẽ nội dung của tab đang chọn; ép override vì cả 3
         nhóm tab đều visible="0" trong XML. */
      if (gid === "player.normal.drawer.content") {
        var dchildren = RES.groupdefs[gid];
        for (var dci = 0; dci < dchildren.length; dci++) {
          var child = dchildren[dci], ctag = lowerTag(child);
          if (ctag !== "group") { await renderChildren([child], div, gw, gh, ctx, depth + 1); continue; }
          var cgid2 = child.getAttribute("id");
          if (cgid2 === "player.normal.drawer.eq" && ctx.drawerTab !== "eq") continue;
          if (cgid2 === "player.normal.drawer.options" && ctx.drawerTab !== "options") continue;
          if (cgid2 === "player.normal.drawer.colorthemes" && ctx.drawerTab !== "colorthemes") continue;
          ctx.overrides.set(cgid2, true);
          await renderChildren([child], div, gw, gh, ctx, depth + 1);
        }
        return;
      }
      /* Tab Options / Color Themes: vẽ thêm phần bị SKIP_TAGS bỏ qua. */
      if (gid === "player.normal.drawer.options") {
        await renderChildren(RES.groupdefs[gid], div, gw, gh, ctx, depth + 1);
        await renderOptionsExtras(div, gw, gh, ctx, depth);
        return;
      }
      if (gid === "player.normal.drawer.colorthemes") {
        /* D10: bbox panel (310×98) chồng đỉnh tab 4px — tab có z-index 2
           (xem nhánh config.tabs) nên đè lên nền panel; panel giữ bbox. */
        div.style.zIndex = "1";
        await renderChildren(RES.groupdefs[gid], div, gw, gh, ctx, depth + 1);
        await renderColorThemesExtras(div, gw, gh, ctx);
        return;
      }
      await renderChildren(RES.groupdefs[gid], div, gw, gh, ctx, depth + 1);
    }

    /* <Grid left middle right>: nền tab (và các khung 3 mảnh khác).
       left/right vẽ đúng cỡ thật, middle kéo giãn lấp phần giữa.
       (Grid là phần còn thiếu khiến tab đợt A chỉ có chữ, chồng nhau.) */
    async function renderGrid(el, parentEl, parentW, parentH, x, y, ctx) {
      var w = el.getAttribute("w") !== null ? relSize(el, "w", parentW) : parentW;
      var h = el.getAttribute("h") !== null ? relSize(el, "h", parentH) : parentH;
      if (w <= 0 || h <= 0) return;
      var div = document.createElement("div");
      div.style.position = "absolute"; div.style.left = x + "px"; div.style.top = y + "px";
      div.style.width = w + "px"; div.style.height = h + "px";
      div.style.pointerEvents = "none";
      setAbs(div, parentEl, x, y);
      div.dataset.grid = "1";
      parentEl.appendChild(div);
      var leftId = el.getAttribute("left"), midId = el.getAttribute("middle"), rightId = el.getAttribute("right");
      var leftW = 0, rightW = 0;
      if (leftId) { var li = await bitmapInfoCached(leftId); if (li) leftW = li.w; }
      if (rightId) { var ri = await bitmapInfoCached(rightId); if (ri) rightW = ri.w; }
      var midW = Math.max(0, w - leftW - rightW);
      if (leftId) { var ls = await spriteDiv(leftId, leftW, h, {}); if (ls) { ls.style.left = "0px"; ls.style.top = "0px"; setAbs(ls, div, 0, 0); div.appendChild(ls); } }
      if (midId && midW > 0) { var ms = await spriteDiv(midId, midW, h, {}); if (ms) { ms.style.left = leftW + "px"; ms.style.top = "0px"; setAbs(ms, div, leftW, 0); div.appendChild(ms); } }
      if (rightId) { var rs = await spriteDiv(rightId, rightW, h, {}); if (rs) { rs.style.left = (leftW + midW) + "px"; rs.style.top = "0px"; setAbs(rs, div, leftW + midW, 0); div.appendChild(rs); } }
    }

    async function renderNode(el, tag, parentEl, parentW, parentH, x, y, ctx, depth) {
      var id = el.getAttribute("id") || "";
      if (tag === "group") { await renderGroupInstance(el, parentEl, parentW, parentH, x, y, ctx, depth); return; }
      if (tag === "grid") { await renderGrid(el, parentEl, parentW, parentH, x, y, ctx); return; }
      var xui = xuiGroupFor(tag, el);
      if (xui && RES.groupdefs[xui]) {
        var gs = groupSize(xui, parentW, parentH);
        var w = el.getAttribute("w") !== null ? relSize(el, "w", parentW) : gs[0];
        var h = el.getAttribute("h") !== null ? relSize(el, "h", parentH) : gs[1];
        var div = document.createElement("div");
        div.style.position = "absolute"; div.style.left = x + "px"; div.style.top = y + "px";
        div.style.width = (w || parentW) + "px"; div.style.height = (h || parentH) + "px";
        setAbs(div, parentEl, x, y);
        div.dataset.frame = "1";
        div.style.pointerEvents = "none";
        parentEl.appendChild(div);
        var content = el.getAttribute("content");
        var frameCtx = { overrides: ctx.overrides, hiddenIds: ctx.frameHidden || new Set(), drawerTab: ctx.drawerTab, titleText: ctx.titleText, frameHidden: ctx.frameHidden, windowKind: ctx.windowKind,
          /* Đợt C: frame vẽ SAU content nhưng cùng 1 lần render — chia sẻ
             _seenGroups để instance trùng không vẽ 2 lần; _skipGroupId =
             nhóm content (đã vẽ qua cdiv) để bỏ instance trùng của nó
             trong groupdef của frame (probe S9). */
          _seenGroups: ctx._seenGroups, _skipGroupId: content ? String(content).toLowerCase() : null };
        /* v9.6 (Điểm 1): căn giữa chữ titlebar như titlebar.maki làm.
           Winamp thật căn giữa chữ (tâm = giữa layout 354/2 = 177) rồi
           dời 2 streak theo; renderer trước đây vẽ chữ ở vị trí tĩnh
           x=100 trong group titlebar nên lệch trái ~45px (tâm ~132).
           Đo rộng chữ bằng canvas với font đang render ("bold 11px
           Arial" — fontsize="14" trong XML nhưng cap-height thật 8px =
           Arial Bold 11px, đừng đổi). Không có canvas (jsdom) thì ước
           theo 7.6px/ký tự. titleCenter chảy xuống frameCtx cho cả chữ,
           2 streak và overlay trong group titlebar. */
        (function () {
          /* Chỉ áp cho TitleBar: div này CHÍNH LÀ group titlebar (xui =
             "wasabi.titlebar", div._absX = vị trí group trong layout).
             Không tìm group lồng "wasabi.titlebar" trong groupdefs của
             chính nó (không có — trước đây IIFE trả về rỗng nên chữ ở
             yên x=100). Tâm = giữa nhóm CHA (layout chứa titlebar,
             parentW = rộng layout: main 354 → 177, playlist 436 → 218),
             không phải giữa group titlebar (w=325 → tâm sai 172,5). */
          if (xui !== "wasabi.titlebar") return;
          var groupAbsX = div._absX || 0;
          var txt = (ctx.titleText || "WINAMP").toUpperCase();
          var textW = 0;
          try {
            if (typeof document !== "undefined") {
              var mc = document.createElement("canvas");
              var mx = null;
              try { mx = mc.getContext("2d"); } catch (e) { mx = null; }
              if (mx) { mx.font = "bold 11px Arial, sans-serif"; textW = mx.measureText(txt).width; }
            }
          } catch (e) { textW = 0; }
          if (!textW) textW = txt.length * 7.6;
          var centerAbs = (parentEl._absX || 0) + parentW / 2;
          frameCtx.titleCenter = {
            textW: Math.round(textW),
            left: Math.round(centerAbs - textW / 2 - groupAbsX),
            textLeftAbs: centerAbs - textW / 2,
            textRightAbs: centerAbs + textW / 2,
            groupAbsX: groupAbsX
          };
        })();
        if (content && RES.groupdefs[content]) {
          /* Nội dung frame nằm dưới titlebar 18px: vẽ trước, frame đè sau.
             Chiều cao nội dung lấy theo groupSize của nhóm content (nhóm
             không có h thì bằng chiều cao frame) — KHÔNG trừ 18: 18px chỉ
             là độ lùi vị trí (top), không phải chiều cao bị mất. Trừ 18
             làm dummy group cao 262 thay vì 280, main/ngăn kéo (neo đáy
             y=-263 relaty=1) lệch lên 18px so với Winamp thật (đo 3/11/2026:
             display đáy 101, seek 114, nút prev 141 — đều thấp hơn Amp
             đúng 18px; main phải ở y=35, display 38, seek 110). */
          var cgs = groupSize(content, w || parentW, h || parentH);
          var cW = cgs[0], cH = cgs[1];
          var cdiv = document.createElement("div");
          cdiv.style.position = "absolute"; cdiv.style.left = "0px"; cdiv.style.top = FRAME_OFFSET_Y + "px";
          cdiv.style.width = cW + "px"; cdiv.style.height = Math.max(0, cH) + "px";
          setAbs(cdiv, div, 0, FRAME_OFFSET_Y);
          cdiv.style.pointerEvents = "none";
          div.appendChild(cdiv);
          await renderChildren(RES.groupdefs[content], cdiv, cW, Math.max(0, cH), ctx, depth + 1);
        }
        await renderChildren(RES.groupdefs[xui], div, w || parentW, h || parentH, frameCtx, depth + 1);
        return;
      }
      if (tag === "layer" || tag === "animatedlayer") {
        var image = el.getAttribute("image");
        var lw = el.getAttribute("w") !== null ? relSize(el, "w", parentW) : null;
        var lh = el.getAttribute("h") !== null ? relSize(el, "h", parentH) : null;
        if (!image) return;
        /* Lỗi 7 (9.4): lớp openclosehider (viên thuốc xám đục 40x17) vẽ
           SAU nút videoavs.open/close trong dummy group nên đè lên nút
           (cùng vị trí, nút ở (-37,19), hider ở (-44,16)). Trong Winamp
           thật, lớp này do MAKI videoavs.maki ẩn/hiện theo trạng thái
           (Amp không chạy MAKI nên XML không cho biết khi nào hiện —
           XML cũng không có visible trên lớp này). Ảnh gốc WACUP cho thấy
           nút ▼ hiện rõ khi AVS đóng → hider phải ẩn khi đóng; khi AVS
           mở, nút ▲ phải hiện để đóng được → hider cũng phải ẩn khi mở.
           Vì vậy ẩn hider trong cả 2 trạng thái để nút videoavs luôn bấm
           được. Đây là lựa chọn do XML không quy định (MAKI điều khiển);
           nếu MAKI gốc hiện hider trong trạng thái nào đó (vd video tách
           rời), Amp chưa tái hiện được — cần đọc videoavs.maki để biết. */
        if (id === "openclosehider") return;
        /* v9.6 (Điểm 1): overlay của chữ title (w=1, x=100 trong XML)
           dời theo mép trái chữ đã căn giữa. */
        if (id === "window.titlebar.title.overlay" && ctx.titleCenter) x = ctx.titleCenter.left;
        var spr = await spriteDiv(image, lw, lh, { tile: el.getAttribute("tile") === "1", opacity: alphaOf(el) });
        if (!spr) return;
        spr.style.left = x + "px"; spr.style.top = y + "px";
        if (el.getAttribute("ghost") === "1") spr.style.pointerEvents = "none";
        if (el.getAttribute("relatw") === "1") spr.dataset.stretch = "1";
        setAbs(spr, parentEl, x, y);
        parentEl.appendChild(spr);
        /* Đợt D (9.9) — AnimatedLayer filmstrip (vd beat_left.png 76×750 =
           15 khung 76×50): spriteDiv không có crop nên vẽ nguyên ảnh bóp
           vào khung (15 khung chồng bẹp thành 1 vệt). Sửa: nền giữ đúng
           tỉ lệ ảnh gốc, chỉ hiện khung 0 lúc đầu; khung beat đổi theo
           analyser (updateBeatFrames), các layer khác đứng yên khung 0. */
        if (tag === "animatedlayer" && lw && lh) {
          try {
            var _bi = await bitmapInfoCached(image);
            var _src = (_bi && _bi.file) ? await RES.imgSize(_bi.file) : null;
            if (_src && _src.h > lh && _src.h % lh === 0) {
              var _frames = _src.h / lh;
              spr.style.backgroundSize = lw + "px " + Math.round(_src.h * (lw / _src.w)) + "px";
              spr.style.backgroundPosition = "0px 0px";
              animLayerRecs.push({ div: spr, frames: _frames, frameH: lh, frame: 0, beat: (id === "beatleft" || id === "beatright") });
            }
          } catch (e) { /* giữ hình bóp như cũ */ }
        }
        /* Đợt K (9.7, điểm 7a): đăng ký lớp chỉ báo kênh (layer "channels",
           songinfo (0,10) → layout (101,65), 74×9, ảnh mặc định
           player.songinfo.none — trong suốt, tức chưa phát). Bitmap chứa
           cả 2 chữ (chữ đang sáng + chữ kia mờ alpha 34); đổi trạng thái
           bằng cách thay ảnh, không vẽ thêm chữ. baseImage lấy từ XML,
           không gán cứng tên file. */
        if (id === "channels") {
          channelsRec = { div: spr, parent: parentEl, x: x, y: y, w: lw, h: lh, opacity: alphaOf(el), baseImage: image, state: "none",
            /* Đợt D (9.9): giữ lại dblclickaction của lớp (WA5:Prefs) để
               setChannelsState gắn lại handler khi thay sprite mới — không
               thì nhấp đúp chỉ chạy tới lần refresh đầu tiên rồi mất. */
            dblclick: el.getAttribute("dblClickAction") || el.getAttribute("dblclickaction") || "" };
        }
        /* Đợt G — dblClickAction SWITCH;normal/shade trên layer (nền shade
           bấm đúp để về normal; nền normal bấm đúp để sang shade). Chỉ
           gắn khi có onShadeToggle; các layer khác không có thuộc tính
           này nên không đổi gì. */
        var dca = el.getAttribute("dblClickAction") || el.getAttribute("dblclickaction") || "";
        if (dca && onShadeToggle) {
          var dparts = String(dca).split(";");
          if (dparts.length >= 2 && dparts[0].toUpperCase() === "SWITCH") {
            var dtgt = dparts[1].toLowerCase();
            if (dtgt === "normal" || dtgt === "shade") {
              spr.style.pointerEvents = "auto";
              (function (toShade) {
                spr.ondblclick = function () { onShadeToggle(toShade); };
              })(dtgt === "shade");
            }
          }
        }
        /* Đợt D (9.9) — dblclickaction="WA5:Prefs" (lớp "channels" trong
           songinfo, player-normal-group.xml:169): nhấp đúp vào chỉ báo
           kênh → mở cửa sổ Preferences (param 42 = trang Playback của
           Winamp — Amp mở bảng Preferences chung, xem openPreferences). */
        if (dca && dca.toUpperCase().indexOf("WA5:PREFS") === 0) {
          spr.style.pointerEvents = "auto";
          spr.ondblclick = function () { openPreferences(spr); };
        }
        if (id === "volumebar" || id === "volumebarShade") {
          volumebarEls.push({ div: spr, maxW: id === "volumebar" ? VOLUMEBAR_MAXW : VOLUMEBAR_SHADE_MAXW, baseW: lw || 10 });
          updateVolumebar();
        }
        return;
      }
      if (tag === "rect") {
        var rw = relSize(el, "w", parentW), rh = relSize(el, "h", parentH);
        var rdiv = document.createElement("div");
        rdiv.className = "rect";
        rdiv.style.left = x + "px"; rdiv.style.top = y + "px";
        rdiv.style.width = rw + "px"; rdiv.style.height = rh + "px";
        rdiv.style.background = el.getAttribute("filled") === "1" ? rgbVal(el.getAttribute("color")) : "transparent";
        if (el.getAttribute("relatw") === "1") rdiv.dataset.stretch = "1";
        setAbs(rdiv, parentEl, x, y);
        parentEl.appendChild(rdiv);
        return;
      }
      if (tag === "status") {
        var sdiv = document.createElement("div");
        sdiv.style.position = "absolute"; sdiv.style.left = x + "px"; sdiv.style.top = y + "px";
        sdiv.style.pointerEvents = "none";
        setAbs(sdiv, parentEl, x, y);
        parentEl.appendChild(sdiv);
        var rec = { div: sdiv, stop: null, play: null, pause: null };
        statusEls.push(rec);
        var pairs = [["stop", "stopBitmap"], ["play", "playBitmap"], ["pause", "pauseBitmap"]];
        for (var si = 0; si < pairs.length; si++) {
          var bid = el.getAttribute(pairs[si][1]);
          if (!bid) continue;
          var sspr = await spriteDiv(bid, el.getAttribute("w") ? relSize(el, "w", parentW) : null, el.getAttribute("h") ? relSize(el, "h", parentH) : null, {});
          if (sspr) { sspr.style.display = "none"; setAbs(sspr, sdiv, 0, 0); sdiv.appendChild(sspr); rec[pairs[si][0]] = sspr; }
        }
        updateStatusEls();
        return;
      }
      if (tag === "vis") {
        var vw = relSize(el, "w", parentW), vh = relSize(el, "h", parentH);
        var cv = document.createElement("canvas");
        cv.className = "vis";
        cv.width = vw; cv.height = vh;
        cv.style.left = x + "px"; cv.style.top = y + "px";
        cv.style.width = vw + "px"; cv.style.height = vh + "px";
        setAbs(cv, parentEl, x, y);
        parentEl.appendChild(cv);
        /* Đợt K (9.7, điểm 7b2): đọc màu cột từ XML ColorBand1..16 (skin 566:
           toàn "255,255,255" → cột trắng như WACUP; skin khác dùng màu riêng
           của nó). Thiếu thuộc tính → trắng. Mảng dùng chung cho cả canvas
           AVS (không có <vis> riêng). fillBg: false = canvas trong display
           để trong suốt (chỉ clearRect) để nền display + lớp dots + overlay
           phía dưới hiện qua, như WACUP (nền vis ≈ nền display, mean ~90). */
        var xmlBands = [];
        for (var bk = 0; bk < VIS_BANDS; bk++) {
          var bcol = el.getAttribute("ColorBand" + (bk + 1)) || el.getAttribute("colorband" + (bk + 1)) || "255,255,255";
          xmlBands.push(rgbVal(bcol));
        }
        visXmlBands = xmlBands;
        visCanvases.push({ cv: cv, bands: xmlBands, fillBg: false });
        return;
      }
      if (tag === "progressgrid") {
        var pw = relSize(el, "w", parentW), ph = relSize(el, "h", parentH);
        var mid = el.getAttribute("middle");
        var pdiv = document.createElement("div");
        pdiv.style.position = "absolute"; pdiv.style.left = x + "px"; pdiv.style.top = y + "px";
        pdiv.style.width = "0px"; pdiv.style.height = ph + "px"; pdiv.style.overflow = "hidden";
        setAbs(pdiv, parentEl, x, y);
        parentEl.appendChild(pdiv);
        if (mid) {
          var mspr = await spriteDiv(mid, pw, ph, { tile: true });
          if (mspr) { mspr.style.left = "0px"; mspr.style.top = "0px"; setAbs(mspr, pdiv, 0, 0); pdiv.appendChild(mspr); }
        }
        progressEls.push({ div: pdiv, fullW: pw });
        updateProgress();
        return;
      }
      if (tag === "slider") { await renderSlider(el, parentEl, parentW, parentH, x, y, ctx); return; }
      if (tag === "button" || tag === "togglebutton" || tag === "nstatesbutton") {
        await renderButton(el, tag, parentEl, parentW, parentH, x, y, ctx);
        return;
      }
      if (tag === "text" || tag === "songticker") {
        await renderText(el, tag, parentEl, parentW, parentH, x, y, ctx);
        return;
      }
      if (tag === "component") {
        /* Đợt A (9.9, việc 1): <component> trong cửa sổ MLibrary là ruột
           Media Library (mô phỏng — xem renderMlContent); mọi <component>
           khác là danh sách playlist như cũ (Pledit). */
        if (ctx.windowKind === "medialibrary") renderMlContent(el, parentEl, parentW, parentH, x, y);
        else renderPlaylistList(el, parentEl, parentW, parentH, x, y);
        return;
      }
    }

    /* Màu chọn trong playlist — TÊN ID THẬT trong system-colors.xml
       (VERIFIED-NUMBERS.md §7/D5): SPEC viết tắt sai thành
       "wasabi.list.selected.background/text" (2 id này KHÔNG tồn tại);
       tên thật là "wasabi.list.text.selected.background" (103,136,201)
       và "wasabi.list.text.selected" (214,228,255); chữ đang hát là
       "wasabi.list.text.current" (187,210,255). Fallback thử cả tên SPEC
       cũ rồi mới về giá trị hardcode (khớp cả 3 giá trị thật). */
    function playlistSelColors() {
      var c = RES.colors || {};
      return {
        bg: c["wasabi.list.text.selected.background"] || c["wasabi.list.selected.background"] || "103,136,201",
        text: c["wasabi.list.text.selected"] || c["wasabi.list.selected.text"] || "214,228,255",
        cur: c["wasabi.list.text.current"] || "187,210,255"
      };
    }
    /* Hàng playlist (Đợt L 9.8): tên bài ở TRÁI, nhãn thời lượng ở GÓC
       PHẢI (như Winamp thật) — không còn "— Trực tiếp" dính sau tên.
       Nhãn (playlistRowLabel): "M:SS" khi biết thời lượng (len != null);
       "Trực tiếp" khi là đài live (kind radio, len null); "…" khi là
       file nhạc (kind track) chưa đọc được thời lượng (đang chờ
       metadata — probe lúc thêm file hoặc lúc phát, xem probeLocalDuration
       + onAudioTimeUpdate). Hàng dùng flex: tên flex:1 (ellipsis khi
       dài), nhãn flex:none nên luôn sát mép phải.
       Số thứ tự N = vị trí trong FULL list (không đổi khi lọc) để số hàng
       ổn định khi tìm kiếm. */
    function playlistRowText(it, n) {
      return n + ". " + it.name;
    }
    function playlistRowLabel(it) {
      if (it.len != null) return fmtTime(it.len);
      if (it.kind === "track") return "…";
      return "Trực tiếp";
    }
    /* Vẽ lại các hàng trong listDiv (giữ nguyên ô tìm ở đầu): dùng cho cả
       render lần đầu lẫn chọn/lọc/phát tại chỗ (không re-render toàn cửa
       sổ nên không mất vị trí cuộn, không mất focus ô tìm).
       Màu (tên id THẬT, xem playlistSelColors): hàng chọn nền 103,136,201
       chữ 214,228,255; hàng đang hát chữ 187,210,255 + bold. Hàng VỪA chọn
       VỪA đang hát: nền chọn + chữ CHỌN (214,228,255) + bold — khóa theo
       main-window-test.js (row sel mặc định cũng là row đang hát và test
       khóa chữ 214,228,255), khác cascade CSS .row.cur đè sau trong skin-sim. */
    function buildPlaylistRows(listDiv) {
      var olds = listDiv.querySelectorAll(".row");
      for (var o = 0; o < olds.length; o++) if (olds[o].parentElement) olds[o].parentElement.removeChild(olds[o]);
      var sel = playlistSelColors();
      var rows = playlistFiltered();
      for (var r = 0; r < rows.length; r++) {
        (function (rec) {
          var row = document.createElement("div");
          row.className = "row" + (rec.idx === playlistState.selected ? " sel" : "") + (rec.idx === playlistState.current ? " cur" : "");
          if (rec.idx === playlistState.selected) {
            row.style.background = rgbVal(sel.bg);
            row.style.color = rgbVal(sel.text);
          }
          if (rec.idx === playlistState.current) {
            if (rec.idx !== playlistState.selected) row.style.color = rgbVal(sel.cur);
            row.style.fontWeight = "bold";
          }
          row.style.display = "flex";
          var nameSpan = document.createElement("span");
          nameSpan.className = "pl-name";
          nameSpan.style.flex = "1 1 auto";
          nameSpan.style.minWidth = "0";
          nameSpan.style.overflow = "hidden";
          nameSpan.style.textOverflow = "ellipsis";
          nameSpan.style.whiteSpace = "nowrap";
          nameSpan.textContent = playlistRowText(rec.item, rec.idx + 1);
          row.appendChild(nameSpan);
          var lenSpan = document.createElement("span");
          lenSpan.className = "pl-len";
          lenSpan.style.flex = "0 0 auto";
          lenSpan.style.marginLeft = "6px";
          lenSpan.textContent = playlistRowLabel(rec.item);
          row.appendChild(lenSpan);
          row.dataset.idx = String(rec.idx);
          /* Click 1 lần = chỉ chọn (không phát); click đúp = phát. */
          row.onclick = function () { selectPlaylistItem(rec.idx); };
          row.ondblclick = function () { playPlaylistItem(rec.idx); };
          /* Đợt D (9.9) — chuột phải hàng playlist → menu bài (trackmenu
             trong XML pledit: rightclickaction="trackmenu"). Vị trí menu
             lấy theo điểm bấm (clientX/Y trừ gốc stage); không có tọa độ
             sự kiện (vd test) thì neo vào hàng (góc trên-trái stage). */
          row.oncontextmenu = function (ev) {
            if (ev && ev.preventDefault) ev.preventDefault();
            selectPlaylistItem(rec.idx);
            var anchor = row;
            if (ev && typeof ev.clientX === "number" && lastStage) {
              try {
                var r = lastStage.getBoundingClientRect();
                anchor = { _absX: Math.max(0, ev.clientX - (r.left || 0)), _absY: Math.max(0, ev.clientY - (r.top || 0)), style: { height: "12px" } };
              } catch (e) { anchor = row; }
            }
            showPlaylistMenu(anchor, trackMenuItems(anchor, rec.idx));
            return false;
          };
          listDiv.appendChild(row);
        })(rows[r]);
      }
    }
    function refreshPlaylistRows() {
      if (!plListDiv) return;
      /* Đợt A (9.9, việc 2): giữ vị trí cuộn — buildPlaylistRows xóa
         hết hàng rồi vẽ lại, lúc trống tức thì scrollTop bị kẹp về 0
         (xem captureScrollState). Chụp trước, trả lại sau. */
      var st = captureScrollState();
      buildPlaylistRows(plListDiv);
      if (plSearchInput) {
        plSearchInput.placeholder = "Tìm trong " + playlistState.items.length + " mục…";
        if (plSearchInput.value !== playlistState.filter) plSearchInput.value = playlistState.filter;
      }
      restoreScrollState(st);
      /* ML dùng cùng dữ liệu playlist → vẽ lại danh sách ML tại chỗ
         (nó tự giữ scrollTop của nó trong refreshMlRows). */
      refreshMlRows();
    }
    function renderPlaylistList(el, parentEl, parentW, parentH, x, y) {
      var w = relSize(el, "w", parentW), h = relSize(el, "h", parentH);
      var div = document.createElement("div");
      div.className = "pl-list";
      div.dataset.plList = "1";
      div.style.left = x + "px"; div.style.top = y + "px";
      div.style.width = w + "px"; div.style.height = h + "px";
      div.style.background = colorOf("wasabi.list.background");
      div.style.color = colorOf("wasabi.list.text");
      div.style.fontSize = "11px";
      /* Cuộn bằng chuột/chạm: overflow-y auto. overflow-x hidden để tên dài
         không làm lệch ngang (row đã ellipsis bằng CSS). */
      div.style.overflowY = "auto"; div.style.overflowX = "hidden";
      setAbs(div, parentEl, x, y);
      /* Đợt A (9.9, việc 3): bấm nền trống của danh sách (target chính là
         div list — không phải hàng hay ô tìm, 2 thứ đó đều là con nên
         target khác div) thì bỏ chọn → PLTime về tổng thời gian. */
      div.addEventListener("click", function (ev) {
        if (ev && ev.target === div) clearPlaylistSelection();
      });
      /* Ô tìm: model skin KHÔNG có ô tìm trong playlist (XML pledit không
         có text tìm kiếm) nên đặt ô HTML gọn trong khung list, sticky ở đầu
         (cuộn cùng danh sách, luôn thấy). Lọc tức thì theo tên, không đổi
         thứ tự gốc. */
      var inp = document.createElement("input");
      inp.className = "pl-search";
      inp.type = "text";
      inp.value = playlistState.filter;
      inp.placeholder = "Tìm trong " + playlistState.items.length + " mục…";
      inp.style.position = "sticky"; inp.style.top = "0px";
      inp.style.display = "block"; inp.style.width = "100%"; inp.style.height = "16px";
      inp.style.boxSizing = "border-box"; inp.style.margin = "0"; inp.style.padding = "0 3px";
      inp.style.background = "#12294f"; inp.style.border = "0";
      inp.style.borderBottom = "1px solid #6788c9";
      inp.style.color = "#fff"; inp.style.font = "11px Arial, sans-serif";
      inp.style.outline = "none"; inp.style.pointerEvents = "auto";
      inp.addEventListener("input", function () {
        playlistState.filter = inp.value;
        refreshPlaylistRows();
      });
      inp.addEventListener("click", function (ev) { if (ev && ev.stopPropagation) ev.stopPropagation(); });
      div.appendChild(inp);
      plListDiv = div; plSearchInput = inp;
      buildPlaylistRows(div);
      parentEl.appendChild(div);
    }

    /* Đợt A (9.9, việc 1) — NỘI DUNG Media Library (mô phỏng theo Winamp thật).
       Khung cửa sổ ML LẤY TỪ XML: container MLibrary (layout normal,
       790×349 với skin 566 — đọc từ model lúc chạy), frame
       wasabi.medialibraryframe.nostatusbar + viền 9 mảnh ml.frame.layout
       + menubar File/View/Help (menu.group.ml). NHƯNG phần ruột thư viện
       trong XML chỉ là 1 <component param="guid:{6B0EDF80-...}"> — đó là
       component native của Winamp (không có trong XML, không vẽ được từ
       model) nên Amp MÔ PHỎNG ruột: cây thư viện bên trái + danh sách
       nhạc bên phải, dùng dữ liệu file nhạc local đã nạp vào playlist
       (tên bài + thời lượng; nghệ sĩ/album KHÔNG có vì model mục của Amp
       — parseM3U + file local — không đọc metadata nghệ sĩ/album, chỉ
       đọc được thời lượng; không bịa cột giả).
       Cây thư viện (như Winamp thật): Local Media → Audio / Video /
       Radio & TV / Tất cả; Playlists → Danh sách hiện tại. Bấm nút cây
       thì lọc danh sách phải; nhấp đúp hàng thì phát (như playlist).
       Đóng bằng nút X trên titlebar của khung ML (action CLOSE). */
    function mlTreeNodes() {
      var items = playlistState.items;
      function count(fn) { var n = 0; for (var i = 0; i < items.length; i++) if (fn(items[i])) n++; return n; }
      var nAudio = count(function (it) { return it.kind === "track"; });
      var nVideo = count(function (it) { return isVideoItem(it); });
      var nRadio = count(function (it) { return it.kind === "radio"; });
      return [
        { header: true, label: "Local Media" },
        { key: "audio", label: "Audio (" + nAudio + ")", match: function (it) { return it.kind === "track"; } },
        { key: "video", label: "Video (" + nVideo + ")", match: function (it) { return isVideoItem(it); } },
        { key: "radio", label: "Radio & TV (" + nRadio + ")", match: function (it) { return it.kind === "radio"; } },
        { key: "all", label: "Tất cả (" + items.length + ")", match: function () { return true; } },
        { header: true, label: "Playlists" },
        { key: "current", label: "Danh sách hiện tại (" + items.length + ")", match: function () { return true; } }
      ];
    }
    function mlFilteredItems() {
      var nodes = mlTreeNodes(), node = null;
      for (var i = 0; i < nodes.length; i++) if (!nodes[i].header && nodes[i].key === mlFilter) { node = nodes[i]; break; }
      if (!node) node = nodes[3]; /* "all" — nút mặc định */
      var out = [];
      for (var j = 0; j < playlistState.items.length; j++) {
        if (node.match(playlistState.items[j])) out.push({ item: playlistState.items[j], idx: j });
      }
      return out;
    }
    function buildMlRows(listDiv) {
      var olds = listDiv.querySelectorAll(".row");
      for (var o = 0; o < olds.length; o++) if (olds[o].parentElement) olds[o].parentElement.removeChild(olds[o]);
      var sel = playlistSelColors();
      var rows = mlFilteredItems();
      for (var r = 0; r < rows.length; r++) {
        (function (rec) {
          var row = document.createElement("div");
          row.className = "row" + (rec.idx === mlSelected ? " sel" : "") + (rec.idx === playlistState.current ? " cur" : "");
          if (rec.idx === mlSelected) {
            row.style.background = rgbVal(sel.bg);
            row.style.color = rgbVal(sel.text);
          }
          if (rec.idx === playlistState.current) {
            if (rec.idx !== mlSelected) row.style.color = rgbVal(sel.cur);
            row.style.fontWeight = "bold";
          }
          row.style.display = "flex";
          var nameSpan = document.createElement("span");
          nameSpan.className = "pl-name";
          nameSpan.style.flex = "1 1 auto";
          nameSpan.style.minWidth = "0";
          nameSpan.style.overflow = "hidden";
          nameSpan.style.textOverflow = "ellipsis";
          nameSpan.style.whiteSpace = "nowrap";
          nameSpan.textContent = playlistRowText(rec.item, rec.idx + 1);
          row.appendChild(nameSpan);
          var lenSpan = document.createElement("span");
          lenSpan.className = "pl-len";
          lenSpan.style.flex = "0 0 auto";
          lenSpan.style.marginLeft = "6px";
          lenSpan.textContent = playlistRowLabel(rec.item);
          row.appendChild(lenSpan);
          row.dataset.idx = String(rec.idx);
          row.onclick = function () { mlSelected = rec.idx; refreshMlRows(); };
          row.ondblclick = function () { playPlaylistItem(rec.idx); };
          listDiv.appendChild(row);
        })(rows[r]);
      }
    }
    function refreshMlRows() {
      if (!mlListDiv) return;
      /* Giữ vị trí cuộn của danh sách ML như playlist (việc 2). */
      var top = 0;
      try { top = mlListDiv.scrollTop || 0; } catch (e) { top = 0; }
      buildMlRows(mlListDiv);
      try { mlListDiv.scrollTop = top; } catch (e) { /* bỏ qua */ }
      /* Vẽ lại cây (số lượng mỗi nút đổi khi thêm/xóa mục). */
      if (mlTreeDiv) buildMlTree(mlTreeDiv);
    }
    function buildMlTree(treeDiv) {
      treeDiv.innerHTML = "";
      var sel = playlistSelColors();
      var nodes = mlTreeNodes();
      for (var i = 0; i < nodes.length; i++) {
        (function (node) {
          var row = document.createElement("div");
          row.style.padding = "0 3px";
          row.style.lineHeight = "13px";
          row.style.whiteSpace = "nowrap";
          row.style.overflow = "hidden";
          row.style.textOverflow = "ellipsis";
          row.style.cursor = "default";
          if (node.header) {
            row.style.fontWeight = "bold";
            row.style.paddingTop = "4px";
            row.textContent = node.label;
          } else {
            row.textContent = node.label;
            row.dataset.mlNode = node.key;
            if (node.key === mlFilter) {
              row.style.background = rgbVal(sel.bg);
              row.style.color = rgbVal(sel.text);
            }
            row.onclick = function () {
              mlFilter = node.key;
              refreshMlRows();
            };
          }
          treeDiv.appendChild(row);
        })(nodes[i]);
      }
    }
    function setMlFilter(key) {
      var keys = ["all", "audio", "video", "radio", "current"];
      mlFilter = keys.indexOf(key) >= 0 ? key : "all";
      refreshMlRows();
      return mlFilter;
    }
    function getMlState() {
      return {
        filter: mlFilter, selected: mlSelected,
        hasWindow: !!mlListDiv, count: mlFilteredItems().length,
        total: playlistState.items.length
      };
    }
    function hasMediaLibrary() {
      return !!layoutEntry("MLibrary", "normal");
    }
    /* Vẽ ruột ML vào đúng hộp <component> trong dummy group (x=6,y=5,
       w=-12 relatw=1, h=-50 relath=1 theo XML — 778×299 với skin 566,
       tính từ model lúc chạy, không gán cứng): cây trái 170px + danh
       sách phải co giãn. */
    function renderMlContent(el, parentEl, parentW, parentH, x, y) {
      var w = relSize(el, "w", parentW), h = relSize(el, "h", parentH);
      var div = document.createElement("div");
      div.className = "ml-content";
      div.dataset.mlContent = "1";
      div.style.left = x + "px"; div.style.top = y + "px";
      div.style.width = w + "px"; div.style.height = h + "px";
      div.style.display = "flex";
      div.style.background = colorOf("wasabi.list.background");
      div.style.color = colorOf("wasabi.list.text");
      div.style.fontSize = "11px";
      div.style.pointerEvents = "auto";
      setAbs(div, parentEl, x, y);
      var treeW = Math.min(170, Math.max(120, Math.floor(w * 0.22)));
      var tree = document.createElement("div");
      tree.className = "ml-tree";
      tree.style.flex = "0 0 " + treeW + "px";
      tree.style.height = "100%";
      tree.style.overflowY = "auto";
      tree.style.overflowX = "hidden";
      tree.style.borderRight = "1px solid #6788c9";
      tree.style.boxSizing = "border-box";
      div.appendChild(tree);
      var list = document.createElement("div");
      list.className = "ml-list";
      list.dataset.mlList = "1";
      list.style.flex = "1 1 auto";
      list.style.minWidth = "0";
      list.style.height = "100%";
      list.style.overflowY = "auto";
      list.style.overflowX = "hidden";
      div.appendChild(list);
      mlTreeDiv = tree; mlListDiv = list;
      buildMlTree(tree);
      buildMlRows(list);
      parentEl.appendChild(div);
    }

    /* Slider đợt B: CHỈ track + thumb (không fill — Winamp gốc không có
       fill; không có khối tạo fillEl ở đây, và không có ở bất cứ đâu
       trong file). Thumb kéo được bằng chuột/chạm; giá trị lưu state:
       - EQ_BAND (preamp/eq1..eq10): drawerState.eqBands[id], 0.5 = 0 dB.
       - PAN (Balance): drawerState.balance, 0.5 = giữa.
       - cfgattrib (sCrossfade, notifier...): drawerState.cfgSliders[attrib].
       Slider ẩn 2×2 kiểu sCrossfade (không thumb) vẫn tạo div như skin,
       nhưng không kéo được và không tính vào số slider EQ. */
    async function renderSlider(el, parentEl, parentW, parentH, x, y, ctx) {
      var w = relSize(el, "w", parentW), h = relSize(el, "h", parentH);
      var action = (el.getAttribute("action") || "").toUpperCase();
      var cfgattrib = el.getAttribute("cfgattrib") || "";
      var sliderId = el.getAttribute("id") || "";
      var param = el.getAttribute("param") || "";
      var key = action || cfgattrib || sliderId;
      var vertical = (el.getAttribute("orientation") || "horizontal").toLowerCase() === "vertical";
      var div = document.createElement("div");
      div.style.position = "absolute"; div.style.left = x + "px"; div.style.top = y + "px";
      div.style.width = w + "px"; div.style.height = h + "px"; div.style.cursor = "default";
      div.style.pointerEvents = "auto";
      setAbs(div, parentEl, x, y);
      div.dataset.slider = key;
      div.dataset.sliderId = sliderId;
      div.dataset.action = action;
      if (el.getAttribute("tooltip")) div.title = el.getAttribute("tooltip");
      parentEl.appendChild(div);
      var thumbId = el.getAttribute("thumb");
      var thumb = null, tw = 10, th = 10;
      if (thumbId) {
        var info = await bitmapInfoCached(thumbId);
        if (info) {
          tw = info.w; th = info.h;
          thumb = await spriteDiv(thumbId, tw, th, {});
          if (thumb) { thumb.style.position = "absolute"; thumb.style.left = "0px"; thumb.style.top = "0px"; setAbs(thumb, div, 0, 0); div.appendChild(thumb); }
        }
      }
      var rec = { div: div, thumb: thumb, w: w, h: h, tw: tw, th: th, vertical: vertical, action: action, cfgattrib: cfgattrib, key: key, sliderId: sliderId, param: param, frac: 0.5 };
      if (action === "VOLUME") rec.frac = demo.volume;
      else if (action === "SEEK") rec.frac = demo.seekFrac;
      else if (action === "EQ_BAND") rec.frac = drawerState.eqBands[sliderId] !== undefined ? drawerState.eqBands[sliderId] : 0.5;
      else if (action === "PAN") rec.frac = drawerState.balance;
      else if (cfgattrib && drawerState.cfgSliders[cfgattrib] !== undefined) rec.frac = drawerState.cfgSliders[cfgattrib];
      function place() {
        if (!thumb) return;
        if (vertical) thumb.style.top = Math.round((1 - rec.frac) * (h - th)) + "px";
        else thumb.style.left = Math.round(rec.frac * (w - tw)) + "px";
      }
      /* silent=true: chỉ đặt thumb + state, không kéo theo side-effect
         (dùng khi preset EQ đẩy giá trị xuống slider đang hiển thị). */
      rec.setFrac = function (f, silent) {
        rec.frac = Math.max(0, Math.min(1, f));
        place();
        if (action === "VOLUME") {
          demo.volume = rec.frac; updateVolumebar();
          /* Đợt E — âm lượng thật: master gain khi qua chuỗi EQ, el.volume
             khi phát native/bypass (engine tự chọn đường).
             Đợt G — đang mute shade thì engine vẫn 0 (applyEngineVolume),
             chỉ đổi demo.volume (volumebar theo demo.volume). */
          applyEngineVolume();
          persistPlayback();
        }
        else if (action === "SEEK") {
          if (!silent) {
            /* Đợt E — tua thật khi media có thời lượng + seek được; đài
               live không tua; mục track chưa có URL thì tua đồng hồ mẫu. */
            var sought = false;
            if (audioEngine) sought = audioEngine.seekToFraction(rec.frac);
            if (!sought) {
              var curSeek = playlistState.items[playlistState.current];
              if (curSeek && curSeek.kind === "track" && !curSeek.url) {
                demo.seekFrac = rec.frac;
                demo.t = rec.frac * (curSeek.len || (DEMO_TRACKS[demo.track] || {}).len || 0);
                updateTimerEls(); updateProgress();
              } else if (audioEngine && curSeek && curSeek.url) {
                /* Đợt A (9.9, việc 5) — tua THẤT BẠI mà vẫn giữ thumb ở
                   chỗ thả thì thanh hỏng: thumb kẹt ở vị trí không phải
                   vị trí phát thật, lần kéo sau tính từ đó. Đài live
                   (không seek được) + file chưa có vùng seek đều rơi
                   vào đây → trả thumb về đúng demo.seekFrac (vị trí
                   thật), không tua, không làm hỏng thanh. Lúc đang kéo
                   thì thumb cũng không chạy theo tay (đúng như Winamp
                   với đài không tua được); lần timeupdate sau đồng bộ
                   lại qua updateProgress. */
                rec.frac = demo.seekFrac;
                place();
              }
            }
          }
        }
        else if (action === "EQ_BAND") {
          drawerState.eqBands[sliderId] = rec.frac;
          /* Đợt E — kéo dải EQ đổi gain/filter theo thời gian thực
             (preamp = index 0, eq1..eq10 = 1..10). */
          if (audioEngine) {
            var bi = EQ_BAND_IDS.indexOf(sliderId);
            if (bi >= 0) audioEngine.setEqBand(bi, rec.frac);
          }
          persistPlayback();
        }
        else if (action === "PAN") applyBalance(rec.frac); /* Đợt D (9.9): kéo Balance đổi StereoPannerNode thật khi EQ bật (xem applyBalance) */
        else if (cfgattrib) drawerState.cfgSliders[cfgattrib] = rec.frac;
      };
      /* Kéo chuột/chạm: bấm vào track thì thumb nhảy tới đó rồi kéo theo.
         Đợt A (9.9, việc 5): trạng thái kéo để ở rec.dragging (thay vì
         biến closure) để updateProgress biết mà không giằng thumb lúc
         người dùng đang kéo. */
      if (thumb) {
        rec.dragging = false;
        var fracFromEvent = function (e) {
          var rect = null;
          try { rect = div.getBoundingClientRect(); } catch (err) { rect = null; }
          if (!rect || (rect.width === 0 && rect.height === 0)) return null;
          var cx = (e.touches && e.touches[0]) ? e.touches[0].clientX : e.clientX;
          var cy = (e.touches && e.touches[0]) ? e.touches[0].clientY : e.clientY;
          if (vertical) return 1 - (cy - rect.top - th / 2) / Math.max(1, h - th);
          return (cx - rect.left - tw / 2) / Math.max(1, w - tw);
        };
        var onDown = function (e) {
          var f = fracFromEvent(e);
          if (f === null) return;
          rec.dragging = true;
          rec.setFrac(f);
          if (e.preventDefault) e.preventDefault();
        };
        var onMove = function (e) {
          if (!rec.dragging) return;
          var f = fracFromEvent(e);
          if (f === null) return;
          rec.setFrac(f);
          if (e.preventDefault) e.preventDefault();
        };
        var onUp = function () {
          rec.dragging = false;
          /* Đợt A (9.9, việc 5): thả tay thì KHÔNG ép thumb về
             demo.seekFrac — vị trí thả đã đúng rồi (tua thành công thì
             thumb ở chỗ thả; tua thất bại thì setFrac đã trả thumb về
             trong lúc kéo). Ép về demo.seekFrac ở đây sẽ làm thumb giật
             ngược về vị trí cũ rồi mới nhảy tới sau timeupdate (~250ms).
             Các lần timeupdate sau đồng bộ tiếp qua updateProgress. */
        };
        div.addEventListener("mousedown", onDown);
        div.addEventListener("touchstart", onDown);
        try {
          document.addEventListener("mousemove", onMove);
          document.addEventListener("mouseup", onUp);
          document.addEventListener("touchmove", onMove);
          document.addEventListener("touchend", onUp);
        } catch (err) { /* môi trường test không có document đầy đủ */ }
      }
      /* Khởi tạo chỉ đặt thumb (place), KHÔNG gọi setFrac: setFrac của SEEK
         sẽ tua demo.t về 0 (đồng hồ 0:00 thay vì 0:02 mẫu). */
      place();
      sliderRecords.push(rec);
    }

    function cfgOn(attrib) {
      var v = cfgState.get(attrib);
      return v === "on" || v === "1" || v === "-1";
    }
    async function renderButton(el, tag, parentEl, parentW, parentH, x, y, ctx) {
      var id = el.getAttribute("id") || "";
      var action = (el.getAttribute("action") || "").toUpperCase();
      var param = el.getAttribute("param") || "";
      var image = el.getAttribute("image");
      var activeImage = el.getAttribute("activeImage");
      /* LED EQ (eqonoff_led) không có cfgattrib mà dùng action làm khóa
         trạng thái (EQ_TOGGLE / EQ_AUTO); các nút khác dùng cfgattrib. */
      var cfgattrib = el.getAttribute("cfgattrib") || "";
      var cfgKey = cfgattrib || ((action === "EQ_TOGGLE" || action === "EQ_AUTO") ? action : "");
      /* Đợt G — nút mute shade (togglebutton, không có cfgattrib/action
         trong XML): dùng khóa cfg tổng hợp "SHADE_MUTE" để ảnh đổi theo
         trạng thái (activeImage = shade.button.mute.on). */
      if (id === "shademute") cfgKey = "SHADE_MUTE";
      /* Nút mở/đóng ngăn kéo: chỉ hiện nút phù hợp trạng thái (cả 2 cùng
         ở (-72,118) trong groupdef ngăn kéo, Winamp thật cũng chỉ hiện 1). */
      if (id === "drawer.button.open" && ctx.drawerOpen) return;
      if (id === "drawer.button.close" && !ctx.drawerOpen) return;
      /* Đợt D — nút videoavs.open/close cũng chỉ hiện 1 cái: đang đóng thì
         chỉ hiện nút mở (videoavs.open), đang mở thì chỉ hiện nút đóng.
         Cả 2 cùng ở (317,37) trong dummy group, ĐỨNG YÊN khi main lùi
         (không nằm trong div player.main nên shiftSubtree không dời). */
      if (id === "videoavs.open" && ctx.avsOpen) return;
      if (id === "videoavs.close" && !ctx.avsOpen) return;
      /* Đợt D (9.9) — nút Maximize/Restore cũng chỉ hiện 1 cái (cùng vị trí
         (73,2) trong buttons.video; XML để restore visible="0" mặc định). */
      if (id === "button.vid.max" && avsState.videoMaximized) return;
      if (id === "button.vid.restore" && !avsState.videoMaximized) return;
      var w = el.getAttribute("w") !== null ? relSize(el, "w", parentW) : null;
      var h = el.getAttribute("h") !== null ? relSize(el, "h", parentH) : null;
      var div = document.createElement("div");
      div.className = "btn";
      div.dataset.buttonId = id;
      div.dataset.action = action;
      div.dataset.cfgattrib = cfgKey || ""; /* Đợt B (9.9): test tìm nút Options theo cfgattrib */
      div.style.left = x + "px"; div.style.top = y + "px";
      setAbs(div, parentEl, x, y);
      if (el.getAttribute("tooltip")) div.title = el.getAttribute("tooltip");
      parentEl.appendChild(div);
      var inner = document.createElement("div");
      div.appendChild(inner);
      var rec = { el: el, div: div, inner: inner, image: image, activeImage: activeImage, cfgattrib: cfgKey, tag: tag, id: id, action: action };
      rec.setImg = async function (bid) {
        inner.innerHTML = "";
        if (!bid) return;
        var spr = await spriteDiv(bid, w, h, {});
        if (spr) {
          spr.style.left = "0px"; spr.style.top = "0px";
          setAbs(spr, div, 0, 0);
          inner.appendChild(spr);
          div.style.width = spr.style.width; div.style.height = spr.style.height;
        }
      };
      rec.refresh = async function () {
        /* v9.6 (Điểm 4): NStatesButton (vd RepeatDisplay): ảnh theo state =
           image + chỉ số state, chỉ số = vị trí của giá trị cfg hiện tại
           trong cfgvals (vd "0;1;-1" -> 0/1/2 -> repeat0/repeat1/repeat2;
           player-elements.xml chỉ có repeat0/1/2, không có tên trần
           "player.songinfo.repeat" nên đường cũ vẽ trống — div rỗng, nút
           lặp trong display không thấy). Chỉ áp khi cả 3 bitmap hậu tố
           tồn tại trong model; không có thì rơi về đường image/activeImage
           cũ (LED: image="player.led.off" không có "player.led.off0" nên
           vẫn dùng led.off/led.on). */
        if (tag === "nstatesbutton") {
          var nstates = parseInt(el.getAttribute("nstates") || "0", 10) || 0;
          var cfgvals = (el.getAttribute("cfgvals") || "").split(";").filter(function (s) { return !!s; });
          if (nstates > 1 && cfgvals.length === nstates) {
            var cur = cfgState.get(cfgKey);
            var idx = cfgvals.indexOf(cur === undefined || cur === null ? "" : String(cur));
            if (idx < 0) idx = 0;
            var stateBid = image + idx;
            var info = await bitmapInfoCached(stateBid);
            if (info && info.file) { await rec.setImg(stateBid); return; }
          }
        }
        if (cfgKey && cfgOn(cfgKey) && activeImage) await rec.setImg(activeImage);
        else await rec.setImg(image);
      };
      await rec.refresh();
      if (cfgKey) {
        if (!cfgGroups[cfgKey]) cfgGroups[cfgKey] = [];
        cfgGroups[cfgKey].push(rec);
      }
      /* --- tương tác đợt B (bấm nút) --- */
      div.onclick = function () {
        /* Đợt E — hàng nút phát (player-normal-group.xml: PLAY/PAUSE/STOP/
           PREV/NEXT/EJECT): Play = phát tiếp/phát mục hiện tại, Pause =
           tạm dừng, Stop = dừng + về đầu (đài live không tua), Prev/Next
           = bài trước/sau (Next tôn trọng Shuffle), Eject = chọn thư mục
           nhạc local. Không có engine (test đợt A–D) thì các nút vẫn đổi
           state playlist như cũ, chỉ chưa có tiếng. */
        if (action === "PLAY") { togglePlay(); return; }
        if (action === "PAUSE") { if (audioEngine) audioEngine.pause(); else { demo.playing = false; playlistState.playing = false; updateStatusEls(); } return; }
        if (action === "STOP") { stopPlayback(); return; }
        if (action === "PREV") { prevTrack(); return; }
        if (action === "NEXT") { nextTrack(demo.repeat === 1 || demo.shuffle); return; }
        if (action === "EJECT") { openLocalFolderPicker(); return; }
        /* Đợt G — chuyển normal<->shade (nút winshade trên cửa sổ chính:
           action SWITCH param=shade; nút shadeWinshade trên shade:
           action SWITCH param=normal). Qua onShadeToggle để index.html
           đổi chế độ + lưu localStorage; renderer không tự đổi layout. */
        if (action === "SWITCH") {
          var tgt = (param || "").toLowerCase();
          if (onShadeToggle) {
            if (tgt === "shade") { onShadeToggle(true); return; }
            if (tgt === "normal") { onShadeToggle(false); return; }
          }
          return;
        }
        /* Đợt D (9.9) — MINIMIZE (nút thu nhỏ cửa sổ chính + shadeMinimize):
           web không có cửa sổ hệ thống/taskbar như Winamp desktop nên
           "thu nhỏ" = ẩn giao diện, giữ nguyên tiếng đang phát, hiện nút
           "Mở lại Amp" để mở lại (index.html — chung đường với nút X;
           không dừng tiếng, không tải lại trang). */
        if (action === "MINIMIZE") { if (onMinimize) onMinimize(); else if (onPlayerClose) onPlayerClose(); return; }
        /* Đợt G — nút mute trên shade: đảo SHADE_MUTE (tắt tiếng ở engine,
           giữ nguyên demo.volume + volumebar). */
        if (id === "shademute") { toggleShadeMute(); return; }
        /* Đợt C — nút PL trên cửa sổ chính (XML: id="pl", action="TOGGLE"
           param="guid:pl", player-normal-group.xml:1163): mở/đóng playlist.
           Đợt A (9.9, việc 1) — nút ML (id="ml", action="TOGGLE"
           param="guid:ml", player-normal-group.xml:1174): mở/đóng cửa sổ
           Media Library (khung từ XML MLibrary, ruột mô phỏng). */
        if (action === "TOGGLE" && (param || "").toLowerCase().indexOf("guid:pl") === 0) {
          if (onPlaylistToggle) onPlaylistToggle();
          return;
        }
        if (action === "TOGGLE" && (param || "").toLowerCase().indexOf("guid:ml") === 0) {
          if (onMlToggle) onMlToggle();
          return;
        }
        /* Đợt D (9.9) — nút About (bolt, action TOGGLE param
           guid:{D6201408-476A-4308-BF1B-7BACA1124B12} trong
           player-normal-group.xml): mở bảng giới thiệu Amp/skin. */
        if (action === "TOGGLE" && (param || "").toLowerCase().indexOf("guid:{d6201408-476a-4308-bf1b-7baca1124b12}") === 0) {
          openAbout(div);
          return;
        }
        /* Đợt C — nút đóng (X) của cửa sổ Playlist (id="Close",
           action="CLOSE", standardframe.xml): đóng playlist.
           v9.6 (Điểm 2): nút X của cửa sổ CHÍNH HIỆN (layout
           player-normal.xml: nút Close x=-17) — <hideobject
           target="close;close.inactive"/> ở player-normal.xml:26 chỉ ẩn
           nút Close NỘI BỘ của MainFrame, không ẩn nút X của layout
           (comment cũ nói "skin Modern ẩn nút X của main" là sai —
           WACUP cho thấy nút X vẫn hiện). Trên web không có "thoát app"
           như Winamp thật nên X gọi onPlayerClose (index.html: ẩn giao
           diện + hiện nút "Mở lại Amp"). */
        if (action === "CLOSE" && ctx.windowKind === "playlist") {
          if (onPlaylistToggle) onPlaylistToggle(false);
          return;
        }
        /* Đợt A (9.9, việc 1): nút X trên titlebar cửa sổ ML (khung
           wasabi.standard.layout, action CLOSE) → đóng ML. */
        if (action === "CLOSE" && ctx.windowKind === "medialibrary") {
          if (onMlToggle) onMlToggle(false);
          return;
        }
        if (action === "CLOSE" && ctx.windowKind === "player") {
          if (onPlayerClose) onPlayerClose();
          return;
        }
        /* Đợt D — nút đóng (X) trên titlebar cửa sổ Video/Vis rời:
           đóng vùng AVS (không dừng tiếng — xem closeAvs). */
        if (action === "CLOSE" && (ctx.windowKind === "video" || ctx.windowKind === "vis")) {
          closeAvs();
          return;
        }
        /* Đợt D (9.9) — nút AVS/Video (dùng chung cho vùng nhúng lẫn cửa sổ
           rời, vì id/action trong XML giống nhau ở cả 2 chỗ):
           VID_1X/VID_2X đổi scale; VID_FS/VIS_FS fullscreen;
           VIS_Prev/Next đổi kiểu hiệu ứng; switchto đổi Video↔Vis;
           detach tách thành cửa sổ rời; reattach đưa về vùng nhúng;
           videoavs.open/close mở/đóng vùng AVS.
           VID_TV (nút TV — trong skin 566 nút này BỊ COMMENT trong XML nên
           không vẽ ra; nối sẵn cho skin nào có nút): bật/tắt cửa sổ Video.
           VID_Misc/Vis_Menu: mở menu Video/Vis thật (giữ tỉ lệ, 1x/2x,
           fullscreen, phóng to, tách rời, đóng).
           VID_MAX/Restore: phóng to/khôi phục cửa sổ Video/Vis rời. */
        if (action === "VID_TV") { toggleVideoWindow(); return; }
        if (action === "VID_1X") { setVideoScale(1); return; }
        if (action === "VID_2X") { setVideoScale(2); return; }
        if (action === "VID_FS" || action === "VIS_FS") { requestVideoFullscreen(); return; }
        if (action === "VIS_PREV") { cycleVisVariant(-1); return; }
        if (action === "VIS_NEXT") { cycleVisVariant(1); return; }
        if (action === "VID_MISC") { showPlaylistMenu(div, videoMenuItems()); return; }
        if (action === "VIS_MENU") { showPlaylistMenu(div, visMenuItems()); return; }
        if (id === "button.vid.max") { setVideoMaximized(true); return; }
        if (id === "button.vid.restore") { setVideoMaximized(false); return; }
        if (id === "button.vid.detach" || id === "button.vis.detach") { detachAvs(); return; }
        if (id === "button.video.reattach" || id === "button.vis.reattach") { reattachAvs(); return; }
        if (id === "button.vid.switchto" || id === "button.vis.switchto") { toggleAvsMode(); return; }
        if (id === "videoavs.open") {
          /* Đợt B (9.9) — nút Video/Vis theo tùy chọn visbutton
             (optionsgroup.visbutton): "Open Context Menu" -> mở menu
             Video/Vis; "Open Configuration" -> mở ngăn kéo ở tab Options,
             trang visbutton; không chọn gì -> mở/đóng vùng AVS như trước. */
          var vb = visButtonAction();
          if (vb === "menu") { showPlaylistMenu(div, visContextMenuItems()); return; }
          if (vb === "config") {
            drawerState.optionsPage = "optionsgroup.visbutton";
            drawerTab = "options";
            if (!drawerState.open) {
              if (onDrawerToggle) onDrawerToggle(true); else setDrawerOpen(true);
            } else {
              requestRerender();
            }
            return;
          }
          openAvs(avsState.mode); return;
        }
        if (id === "videoavs.close") { closeAvs(); return; }
        /* Đợt D (9.9) — nút trên cửa sổ shade (nhóm shadeX2/shadeX3/
           shadetimer, mặc định visible="0" trong XML nên chỉ hiện khi skin
           bật các nhóm đó; nối sẵn để skin nào hiện thì bấm được):
           - shadeeq: mở ngăn kéo ở tab Equalizer; shadect: tab Color Themes
             (đang ở shade thì về normal trước — xem openDrawerTab).
           - nowplaying: thông tin bài đang phát (Winamp thật mở thông tin
             nghệ sĩ online — Amp không có nguồn đó nên mở bảng thông tin bài).
           - plshadeMLList (PE_ListOfLists, "Library's Playlists"): mở ML.
           - shadepl/shademl đã chạy qua TOGGLE guid:pl/ml ở trên.
           Nút beat trong display: bật/tắt hiệu ứng beat (xem setBeatVisOn). */
        if (id === "shadeeq") { openDrawerTab("eq"); return; }
        if (id === "shadect") { openDrawerTab("colorthemes"); return; }
        if (id === "nowplaying") { showTrackInfo(div); return; }
        if (id === "plshadeMLList") { if (onMlToggle) onMlToggle(); return; }
        if (id === "beatvisualization" || id === "beatvisualization2") { setBeatVisOn(!beatVisOn); return; }
        /* Đợt C — hàng nút dưới playlist (pledit-normal.xml):
           Add mở menu thêm, Rem xóa hàng chọn (không menu), Sel mở menu
           chọn, Misc mở menu phụ, List (Manage Playlist) mở menu quản lý. */
        if (action === "PE_ADD") { showPlaylistMenu(div, addMenuItems(div)); return; }
        if (action === "PE_REM") { removePlaylistItem(playlistState.selected); return; }
        if (action === "PE_SEL") { showPlaylistMenu(div, selectMenuItems()); return; }
        if (action === "PE_MISC") { showPlaylistMenu(div, miscMenuItems()); return; }
        if (action === "PE_LIST") { showPlaylistMenu(div, manageMenuItems(div)); return; }
        if (id === "drawer.button.open") { if (onDrawerToggle) onDrawerToggle(true); else setDrawerOpen(true); return; }
        if (id === "drawer.button.close") { if (onDrawerToggle) onDrawerToggle(false); else setDrawerOpen(false); return; }
        if (action === "CB_PREVPAGE") { scrollBucket(-1); return; }
        if (action === "CB_NEXTPAGE") { scrollBucket(1); return; }
        if (action === "COLORTHEMES_PREVIOUS") { selectColorTheme(drawerState.colorThemeIdx - 1); return; }
        if (action === "COLORTHEMES_NEXT") { selectColorTheme(drawerState.colorThemeIdx + 1); return; }
        if (action === "COLORTHEMES_SWITCH") { applyColorTheme(lastStage); return; }
        if (action.indexOf("SWITCHTO;") === 0) {
          var tgt = action.split(";")[1] || "";
          if (tgt) { drawerState.optionsPage = tgt.toLowerCase(); requestRerender(); }
          return;
        }
        if (id === "EQ_p12") { setAllEqBands(12); requestRerender(); return; }
        if (id === "EQ_0") { setAllEqBands(0); requestRerender(); return; }
        if (id === "EQ_m12") { setAllEqBands(-12); requestRerender(); return; }
        if (id === "eqpresets") { showEqPresetsMenu(div); return; }
        if (id === "CrossfadeIncrease") {
          drawerState.crossfadeSecs = Math.min(20, drawerState.crossfadeSecs + 1);
          updateCFDisplay();
          return;
        }
        if (id === "CrossfadeDecrease") {
          drawerState.crossfadeSecs = Math.max(0, drawerState.crossfadeSecs - 1);
          updateCFDisplay();
          return;
        }
        /* Đợt E — Shuffle/Repeat xoay 3 trạng thái (xem handleShuffleRepeat);
           phải chặn trước toggleCfg chung (chỉ đảo 2 trạng thái). */
        if (cfgKey && handleShuffleRepeat(cfgKey, rec)) return;
        if (cfgKey) { toggleCfg(cfgKey, rec); return; }
      };
    }

    /* v9.6 (Điểm 5): đặt menu/hộp trong stage, mở hướng lên khi không đủ
       chỗ dưới anchor (vd menu preset EQ: anchor y=241, menu ~107px,
       stage 280px -> mở xuống chỉ thấy 27px = 1 hàng "Flat"). Đo chiều
       cao thật sau khi append (offsetHeight); jsdom không layout được
       (offsetHeight=0) thì ước theo số hàng x 21px + viền 2px. Không
       hardcode chiều cao stage. */
    function placePopupInStage(box, anchorDiv, rowCount) {
      var T = lastStage;
      if (!T || !box) return;
      var menuH = 0;
      try { menuH = box.offsetHeight || 0; } catch (e) { menuH = 0; }
      if (!menuH) menuH = (rowCount || 1) * 21 + 2;
      var stageH = parseInt(T.style.height || "0", 10) || 0;
      if (!stageH) { try { stageH = Math.round(T.getBoundingClientRect().height); } catch (e) { stageH = 0; } }
      if (!stageH) return;
      var top = parseInt(box.style.top || "0", 10) || 0;
      if (top + menuH > stageH) top = Math.max(0, (anchorDiv._absY || 0) - menuH);
      box.style.top = top + "px";
      if (top + menuH > stageH) {
        box.style.maxHeight = Math.max(40, stageH - 8) + "px";
        box.style.overflowY = "auto";
      }
    }

    /* Menu preset EQ (nút PRESETS): đường cong tự định nghĩa, xem EQ_PRESETS. */
    function showEqPresetsMenu(anchorDiv) {
      var T = lastStage;
      if (!T) return;
      var old = null;
      try { old = T.querySelector("[data-eq-presets-menu]"); } catch (e) { old = null; }
      if (old && old.parentElement) old.parentElement.removeChild(old);
      var menu = document.createElement("div");
      menu.dataset.eqPresetsMenu = "1";
      menu.style.position = "absolute";
      menu.style.left = ((anchorDiv._absX || 0)) + "px";
      menu.style.top = ((anchorDiv._absY || 0) + 12) + "px";
      /* v9.6 (Điểm 5): nền SÁNG kiểu menu Winamp thật trên Windows
         (#ECE9D8, chữ đen, viền #ACA899, hover #316AC5 chữ trắng) thay
         cho nền tối #1c1c1c cũ — nền tối trên nền trang #141414 chỉ đạt
         tương phản 1,08:1 nên hộp chìm hẳn, không thấy viền. Đây là
         "chọn theo Winamp thật" (menu Winamp là menu hệ điều hành),
         KHÔNG phải đọc từ XML (skin không định nghĩa màu menu). */
      menu.style.background = "#ECE9D8"; menu.style.border = "1px solid #ACA899";
      menu.style.zIndex = "10"; menu.style.pointerEvents = "auto";
      menu.style.font = "11px Arial, sans-serif"; menu.style.color = "#000";
      var names = Object.keys(EQ_PRESETS);
      for (var i = 0; i < names.length; i++) {
        (function (name) {
          var row = document.createElement("div");
          row.textContent = name;
          row.style.padding = "4px 10px"; row.style.cursor = "pointer"; row.style.whiteSpace = "nowrap";
          row.dataset.presetName = name;
          row.onmouseover = function () { row.style.background = "#316AC5"; row.style.color = "#fff"; };
          row.onmouseout = function () { row.style.background = ""; row.style.color = ""; };
          row.onclick = function (ev) {
            if (ev && ev.stopPropagation) ev.stopPropagation();
            applyEqPreset(name);
            if (menu.parentElement) menu.parentElement.removeChild(menu);
            requestRerender();
          };
          menu.appendChild(row);
        })(names[i]);
      }
      T.appendChild(menu);
      placePopupInStage(menu, anchorDiv, names.length); /* v9.6 (Điểm 5): mở hướng lên khi không đủ chỗ dưới */
      var close = function () {
        if (menu.parentElement) menu.parentElement.removeChild(menu);
        try { document.removeEventListener("click", close); } catch (e) { /* jsdom */ }
      };
      try { setTimeout(function () { document.addEventListener("click", close); }, 0); } catch (e) { /* jsdom */ }
    }

    /* ---------- menu playlist (đợt C) ----------
       Menu HTML gọn theo phong cách menu Winamp thật trên Windows (nền
       sáng #ECE9D8, viền #ACA899, Arial 11px — v9.6 Điểm 5, bỏ nền tối
       #1c1c1c cũ vì chìm vào nền trang #141414) vì .maki chạy menu thật
       không chạy được trên trình duyệt.
       Cùng 1 helper cho cả nút Add/Sel/Misc/List dưới playlist, mục
       File/Playlist/Sort/Help trên menubar playlist và mục View trên
       menubar chính. Menu đóng khi bấm mục khác hoặc bấm ra ngoài. */
    /* Đợt L (9.8) — closer của menu playlist (bấm ra ngoài thì đóng menu).
       LỖI GỐC (người dùng báo 3/11: sau "Xóa hết" thì không chọn được
       nữa): closer gắn bằng setTimeout(0) sau khi mở menu, nhưng khi
       chọn 1 mục trong menu thì row.onclick stopPropagation nên closer
       KHÔNG bao giờ được tiêu thụ — nó còn armed mãi. Cú bấm MỞ MENU
       KẾ TIẾP bubble lên document thì closer cũ chạy, đóng ngay menu
       vừa mở (bấm Manage Playlist mà menu không hiện — sau "Xóa hết"
       thì playlist trống, không còn đường nạp lại kênh nên tưởng như
       không chọn được nữa; bấm hụt cứ lặp lại vì mỗi lần mở hụt lại
       gắn thêm 1 closer mới). Sửa: giữ tham chiếu closer (plMenuCloser),
       gỡ nó mỗi khi đóng menu và mỗi khi mở menu mới; chỉ gắn closer
       khi menu vẫn còn mở lúc timeout chạy (người dùng có thể đã chọn
       mục và đóng menu trước khi timeout chạy — gắn lúc đó là thừa). */
    var plMenuCloser = null;
    function disarmPlMenuCloser() {
      if (plMenuCloser) {
        try { document.removeEventListener("click", plMenuCloser); } catch (e) { /* jsdom */ }
        plMenuCloser = null;
      }
    }
    function closePlaylistMenus() {
      disarmPlMenuCloser();
      var T = lastStage;
      if (!T) return;
      var olds = null;
      try { olds = T.querySelectorAll("[data-pl-menu]"); } catch (e) { olds = []; }
      for (var i = 0; i < olds.length; i++) if (olds[i].parentElement) olds[i].parentElement.removeChild(olds[i]);
    }
    /* Đợt D (9.9) — closer dùng chung cho mọi bảng nổi có [data-pl-menu]
       (menu playlist, bảng thông tin bài, Preferences, About): bấm ra ngoài
       thì đóng. Logic y hệt khối setTimeout cũ trong showPlaylistMenu
       (chỉ gắn khi bảng vẫn còn mở lúc timeout chạy — xem ghi chú ở
       disarmPlMenuCloser về closer thừa ăn mất lần mở kế tiếp). */
    function armPanelCloser() {
      try {
        setTimeout(function () {
          if (!lastStage || !lastStage.querySelector("[data-pl-menu]")) return;
          disarmPlMenuCloser();
          plMenuCloser = function h() {
            closePlaylistMenus();
            disarmPlMenuCloser();
          };
          document.addEventListener("click", plMenuCloser);
        }, 0);
      } catch (e) { /* jsdom */ }
    }
    function showPlaylistMenu(anchorDiv, items) {
      var T = lastStage;
      if (!T) return;
      closePlaylistMenus();
      var menu = document.createElement("div");
      menu.dataset.plMenu = "1";
      menu.style.position = "absolute";
      menu.style.left = ((anchorDiv._absX || 0)) + "px";
      menu.style.top = ((anchorDiv._absY || 0) + (parseInt(anchorDiv.style.height || "0", 10) || 12)) + "px";
      menu.style.background = "#ECE9D8"; menu.style.border = "1px solid #ACA899"; /* v9.6 (Điểm 5): nền sáng như menu Winamp thật */
      menu.style.zIndex = "10"; menu.style.pointerEvents = "auto";
      menu.style.font = "11px Arial, sans-serif"; menu.style.color = "#000";
      for (var i = 0; i < items.length; i++) {
        (function (it) {
          var row = document.createElement("div");
          row.textContent = it.label;
          row.style.padding = "4px 10px"; row.style.cursor = "pointer"; row.style.whiteSpace = "nowrap";
          row.dataset.menuItem = it.label;
          row.onmouseover = function () { row.style.background = "#316AC5"; row.style.color = "#fff"; };
          row.onmouseout = function () { row.style.background = ""; row.style.color = ""; };
          row.onclick = function (ev) {
            if (ev && ev.stopPropagation) ev.stopPropagation();
            closePlaylistMenus();
            it.action();
          };
          menu.appendChild(row);
        })(items[i]);
      }
      T.appendChild(menu);
      placePopupInStage(menu, anchorDiv, items.length); /* v9.6 (Điểm 5): mở hướng lên khi không đủ chỗ dưới */
      armPanelCloser(); /* Đợt D (9.9): dùng chung helper (logic cũ giữ nguyên) */
    }
    function deriveNameFromUrl(url) {
      try {
        var u = new URL(url);
        var parts = u.pathname.split("/").filter(function (s) { return !!s; });
        var last = parts.length ? parts[parts.length - 1] : u.hostname;
        var name = decodeURIComponent(last).replace(/\.(m3u8|mp3|m3u)$/i, "");
        return name || u.hostname;
      } catch (e) { return url; }
    }
    /* Đợt L (9.8) — nhập URL danh sách .m3u (người dùng báo 3/11: nhập
       URL .m3u thì không dùng được, chỉ nhập được URL đơn kênh).
       Trước đây showAddUrlForm thêm MỌI URL như 1 mục đơn nên URL .m3u
       thành mục chết (trình phát không đọc được file text .m3u).
       - URL .m3u (đuôi .m3u trước ?/#; .m3u8 KHÔNG tính): fetch file
         về, tách kênh bằng parseM3U(text, url) — link tương đối đổi
         tuyệt đối theo URL gốc (resolveM3UUrl, như Webamp fork) —
         rồi thêm TỪNG kênh vào playlist, giữ tên + thứ tự gốc +
         group-title nếu có.
       - URL khác (.m3u8/.mp3/...): giữ nguyên hành vi cũ — thêm như
         1 mục đơn (group "Thêm tay").
       Trả Promise<{ok, added, reason}>; lỗi fetch / không tách được
       kênh nào thì báo đỏ trên dòng chữ chạy (showTickerError, không
       dấu như mọi lỗi kênh khác) và KHÔNG thêm mục rác. */
    function isM3UListUrl(url) {
      return /\.m3u([?#]|$)/i.test(String(url || ""));
    }
    function addUrl(url) {
      url = String(url || "").trim();
      if (!url) return Promise.resolve({ ok: false, added: 0, reason: "empty" });
      if (!isM3UListUrl(url)) {
        addPlaylistItem({ name: deriveNameFromUrl(url), url: url, len: null, group: "Thêm tay", kind: "radio" });
        return Promise.resolve({ ok: true, added: 1, reason: "" });
      }
      var f = fetchFn || (typeof fetch !== "undefined" ? fetch : null);
      if (!f) {
        showTickerError("khong tai duoc danh sach .m3u (thieu fetch)");
        return Promise.resolve({ ok: false, added: 0, reason: "no-fetch" });
      }
      return f(url).then(function (res) {
        if (!res || !res.ok) throw new Error("HTTP " + (res ? res.status : "?"));
        return res.text();
      }).then(function (text) {
        var items = parseM3U(text, url).filter(function (it) {
          return it.url && !/[<>\s]/.test(it.url);
        });
        if (!items.length) throw new Error("empty");
        for (var i = 0; i < items.length; i++) addPlaylistItem(items[i]);
        return { ok: true, added: items.length, reason: "" };
      }).catch(function (e) {
        showTickerError("khong nap duoc danh sach .m3u");
        return { ok: false, added: 0, reason: (e && e.message) || "fetch-error" };
      });
    }
    /* Form thêm URL (mục "Thêm URL…" trong menu Add/File): ô nhập + nút
       Thêm/Hủy. Tên kênh lấy từ cuối đường dẫn URL (vd .../kenh.m3u8 ->
       "kenh"); người dùng sửa tên sau bằng cách xóa rồi thêm lại.
       Đợt L (9.8): nút Thêm gọi addUrl — URL .m3u thì nạp cả danh sách,
       URL đơn kênh thì thêm 1 mục như cũ. */
    function showAddUrlForm(anchorDiv) {
      var T = lastStage;
      if (!T) return;
      closePlaylistMenus();
      var box = document.createElement("div");
      box.dataset.plMenu = "1";
      box.dataset.plAddForm = "1";
      box.style.position = "absolute";
      box.style.left = ((anchorDiv._absX || 0)) + "px";
      box.style.top = ((anchorDiv._absY || 0) + (parseInt(anchorDiv.style.height || "0", 10) || 12)) + "px";
      box.style.background = "#ECE9D8"; box.style.border = "1px solid #ACA899"; /* v9.6 (Điểm 5): nền sáng như menu Winamp thật */
      box.style.padding = "6px"; box.style.zIndex = "10"; box.style.pointerEvents = "auto";
      box.style.font = "11px Arial, sans-serif"; box.style.color = "#000";
      var inp = document.createElement("input");
      inp.type = "text";
      inp.placeholder = "https://…/kenh.m3u8, .mp3 hoặc danh sách .m3u";
      inp.style.width = "220px"; inp.style.font = "11px Arial, sans-serif";
      inp.style.background = "#fff"; inp.style.color = "#000";
      inp.style.border = "1px solid #7F9DB9"; inp.style.padding = "3px";
      box.appendChild(inp);
      var ok = document.createElement("button");
      ok.textContent = "Thêm";
      ok.style.marginLeft = "4px"; ok.style.font = "11px Arial, sans-serif";
      ok.onclick = function () {
        var url = (inp.value || "").trim();
        if (!url) return;
        addUrl(url); /* Đợt L (9.8): .m3u -> nạp cả danh sách; URL đơn -> 1 mục */
        closePlaylistMenus();
      };
      box.appendChild(ok);
      var cancel = document.createElement("button");
      cancel.textContent = "Hủy";
      cancel.style.marginLeft = "4px"; cancel.style.font = "11px Arial, sans-serif";
      cancel.onclick = function () { closePlaylistMenus(); };
      box.appendChild(cancel);
      T.appendChild(box);
      placePopupInStage(box, anchorDiv, 3); /* v9.6 (Điểm 5): mở hướng lên khi không đủ chỗ dưới */
      if (inp.focus) { try { inp.focus(); } catch (e) { /* jsdom */ } }
    }
    function showHelpNote(anchorDiv) {
      var T = lastStage;
      if (!T) return;
      closePlaylistMenus();
      var box = document.createElement("div");
      box.dataset.plMenu = "1";
      box.style.position = "absolute";
      box.style.left = ((anchorDiv._absX || 0)) + "px";
      box.style.top = ((anchorDiv._absY || 0) + (parseInt(anchorDiv.style.height || "0", 10) || 12)) + "px";
      box.style.background = "#ECE9D8"; box.style.border = "1px solid #ACA899"; /* v9.6 (Điểm 5): nền sáng như menu Winamp thật */
      box.style.padding = "6px 8px"; box.style.zIndex = "10"; box.style.pointerEvents = "auto";
      box.style.font = "11px Arial, sans-serif"; box.style.color = "#000";
      box.style.maxWidth = "260px"; box.style.whiteSpace = "normal"; box.style.lineHeight = "1.5";
      box.textContent = "Amp v9 · Playlist Editor (đợt C): 41 kênh radio.m3u. Nhấp 1 lần để chọn, nhấp đúp để phát (đợt E mới có tiếng). Bấm vào đây để đóng.";
      box.onclick = function () { closePlaylistMenus(); };
      T.appendChild(box);
      placePopupInStage(box, anchorDiv, 3); /* v9.6 (Điểm 5): mở hướng lên khi không đủ chỗ dưới */
    }
    function addMenuItems(anchorDiv) {
      return [
        { label: "Nạp lại radio.m3u (41 kênh)", action: function () { if (onReloadRadio) onReloadRadio(); } },
        { label: "Thêm nhạc local…", action: function () { openLocalFolderPicker(); } },
        { label: "Thêm URL…", action: function () { showAddUrlForm(anchorDiv); } }
      ];
    }
    function selectMenuItems() {
      return [
        { label: "Tới bài đang hát", action: function () { playlistState.selected = playlistState.current; refreshPlaylistRows(); scrollPlaylistTo(playlistState.current); } },
        { label: "Chọn bài đầu", action: function () { selectPlaylistItem(0); scrollPlaylistTo(0); } },
        { label: "Chọn bài cuối", action: function () { selectPlaylistItem(playlistState.items.length - 1); scrollPlaylistTo(playlistState.items.length - 1); } }
      ];
    }
    function miscMenuItems() {
      return [
        { label: "Sắp xếp theo tên (A–Z)", action: function () { sortPlaylistByName(); } },
        { label: "Khôi phục thứ tự gốc", action: function () { restorePlaylistOrder(); } }
      ];
    }
    function manageMenuItems(anchorDiv) {
      return [
        { label: "Lưu playlist (.m3u)", action: function () { exportPlaylistM3U(); } },
        { label: "Nạp lại radio.m3u", action: function () { if (onReloadRadio) onReloadRadio(); } },
        { label: "Xóa hết", action: function () { clearPlaylist(); } }
      ];
    }
    function viewMenuItems() {
      var plTick = "";
      try { plTick = (isPlaylistOpen && isPlaylistOpen()) ? "✓ " : ""; } catch (e) { plTick = ""; }
      var mlTick = "";
      try { mlTick = (isMlOpen && isMlOpen()) ? "✓ " : ""; } catch (e) { mlTick = ""; }
      var shadeTick = "";
      try { shadeTick = (isShadeMode && isShadeMode()) ? "✓ " : ""; } catch (e) { shadeTick = ""; }
      return [
        { label: plTick + "Playlist Editor", action: function () { if (onPlaylistToggle) onPlaylistToggle(); } },
        /* Đợt A (9.9, việc 1): Media Library trong menu View (như Winamp
           thật) — mở/đóng cửa sổ ML. Skin không có ML (Classic) thì mục
           này bấm không có gì (index.html báo rõ khi bấm nút ML). */
        { label: mlTick + "Media Library", action: function () { if (onMlToggle) onMlToggle(); } },
        { label: (drawerState.open ? "✓ " : "") + "Ngăn kéo (Drawer)", action: function () { if (onDrawerToggle) onDrawerToggle(!drawerState.open); else setDrawerOpen(!drawerState.open); } },
        /* Đợt D (9.9) — Video/Vis nay là BẬT/TẮT (như nút VID_TV): đang mở
           ở đúng chế độ thì đóng, chưa mở thì mở. Skin Modern → vùng
           nhúng; skin Classic → cửa sổ rời (rẽ nhánh trong openAvs). */
        { label: (avsState.open && avsState.mode === "video" ? "✓ " : "") + "Video", action: function () { toggleVideoWindow(); } },
        { label: (avsState.open && avsState.mode === "vis" ? "✓ " : "") + "Hiệu ứng (Vis)", action: function () { if (avsState.open && avsState.mode === "vis") closeAvs(); else openAvs("vis"); } },
        { label: shadeTick + "Thu gọn (Shade)", action: function () { if (onShadeToggle) onShadeToggle(!(isShadeMode && isShadeMode())); } }
      ];
    }

    /* ---------- đợt D (9.9): menu chính File/Play/Options/Help ----------
       Menubar chính trước đây chỉ có View mở được menu thật (File/Play/
       Options/Help bấm không làm gì — MAKI mainmenu.maki không chạy được
       trên web). Nay mỗi mục có menu con với các mục Winamp thật; mục nào
       nối được thì nối thật (dùng lại hàm đã có), mục nào chưa thì KHÔNG
       đưa vào menu (không đưa mục giả — xem README đợt D). */
    function fileMenuItems(anchorDiv) {
      return [
        { label: "Phát file nhạc…", action: function () { openLocalFolderPicker(); } },
        { label: "Phát URL…", action: function () { showAddUrlForm(anchorDiv); } },
        { label: "Nạp skin .wal/.zip…", action: function () { if (onOpenSkinPicker) onOpenSkinPicker(); } },
        { label: "Đóng Amp", action: function () { if (onPlayerClose) onPlayerClose(); } }
      ];
    }
    /* Lặp lại xoay 3 trạng thái như nút Repeat trong display (xem
       handleShuffleRepeat): 0 Tắt → 1 Lặp tất cả → -1 Lặp 1 bài → 0. */
    function cycleRepeat() {
      demo.repeat = demo.repeat === 0 ? 1 : demo.repeat === 1 ? -1 : 0;
      var keys = Object.keys(cfgGroups);
      for (var i = 0; i < keys.length; i++) {
        if (/;Repeat$/.test(keys[i])) { cfgState.set(keys[i], String(demo.repeat)); refreshCfgGroup(keys[i]); }
      }
      persistPlayback();
      return demo.repeat;
    }
    function repeatLabel() { return demo.repeat === 1 ? "Lặp tất cả" : demo.repeat === -1 ? "Lặp 1 bài" : "Tắt"; }
    function playMenuItems() {
      return [
        { label: (demo.playing ? "Tạm dừng" : "Phát"), action: function () { togglePlay(); } },
        { label: "Dừng", action: function () { stopPlayback(); } },
        { label: "Bài trước", action: function () { prevTrack(); } },
        { label: "Bài sau", action: function () { nextTrack(demo.repeat === 1 || demo.shuffle); } },
        { label: "Lặp lại: " + repeatLabel(), action: function () { cycleRepeat(); } },
        { label: (demo.shuffle ? "✓ " : "") + "Phát ngẫu nhiên (Shuffle)", action: function () {
          demo.shuffle = !demo.shuffle;
          var keys = Object.keys(cfgGroups);
          for (var i = 0; i < keys.length; i++) {
            if (/;Shuffle$/.test(keys[i])) { cfgState.set(keys[i], demo.shuffle ? "on" : "off"); refreshCfgGroup(keys[i]); }
          }
          persistPlayback();
        } }
      ];
    }
    function optionsMenuItems(anchorDiv) {
      var shadeTick = "";
      try { shadeTick = (isShadeMode && isShadeMode()) ? "✓ " : ""; } catch (e) { shadeTick = ""; }
      return [
        { label: "Preferences…", action: function () { openPreferences(anchorDiv); } },
        { label: "Ngăn kéo: Equalizer", action: function () { openDrawerTab("eq"); } },
        { label: "Ngăn kéo: Options", action: function () { openDrawerTab("options"); } },
        { label: "Ngăn kéo: Color Themes", action: function () { openDrawerTab("colorthemes"); } },
        { label: shadeTick + "Thu gọn (Shade)", action: function () { if (onShadeToggle) onShadeToggle(!(isShadeMode && isShadeMode())); } }
      ];
    }
    function helpMenuItems(anchorDiv) {
      return [
        { label: "Giới thiệu về Amp…", action: function () { openAbout(anchorDiv); } },
        { label: "Hướng dẫn nhanh", action: function () { showHelpNote(anchorDiv); } }
      ];
    }

    /* ---------- đợt D (9.9): mở ngăn kéo ở 1 tab ----------
       Dùng cho nút shade (shadeeq/shadect), menu Options, Preferences.
       Đang ở shade thì ngăn kéo không có trong DOM: về normal trước rồi
       mới mở (onShadeToggle render lại; onDrawerToggle mở ngăn kéo —
       toggleDrawerAnimated tự vẽ thẳng khi chưa có ngăn kéo trong DOM). */
    function openDrawerTab(tab) {
      if (tab) drawerTab = tab;
      if (isShadeMode && isShadeMode() && onShadeToggle) onShadeToggle(false);
      if (onDrawerToggle) onDrawerToggle(true);
      else setDrawerOpen(true);
      return drawerTab;
    }

    /* ---------- đợt D (9.9): PAN (Balance) — đặt giá trị + trạng thái ----------
       Slider PAN trong ngăn kéo EQ gọi applyBalance (xem renderSlider);
       Preferences gọi setBalance để đưa Pan về giữa. Trả getPanState():
       balance 0..1 (0.5 = giữa), supported = engine có StereoPannerNode,
       audible = Pan NGHE được (cần EQ bật — EQ tắt thì tiếng đi thẳng
       loa, panner không nằm trên đường tiếng). */
    function applyBalance(v) {
      drawerState.balance = Math.max(0, Math.min(1, v));
      if (audioEngine && audioEngine.setPan) {
        try { audioEngine.setPan(drawerState.balance); } catch (e) { /* bỏ qua */ }
      }
      persistPlayback();
      return getPanState();
    }
    function setBalance(v) {
      var st = applyBalance(v);
      for (var i = 0; i < sliderRecords.length; i++) {
        var rec = sliderRecords[i];
        if (rec && rec.action === "PAN" && typeof rec.setFrac === "function") {
          try { rec.setFrac(drawerState.balance, true); } catch (e) { /* bỏ qua */ }
        }
      }
      return st;
    }
    function getPanState() {
      var eng = null;
      try { eng = audioEngine && audioEngine.getState ? audioEngine.getState() : null; } catch (e) { eng = null; }
      var supported = !!(eng && eng.panSupported);
      var eqOn = !!(eng ? eng.eqOn : drawerState.eqOn);
      return { balance: drawerState.balance, supported: supported, eqOn: eqOn, audible: supported && eqOn };
    }

    /* ---------- đợt D (9.9): menu Video / Vis (VID_Misc / Vis_Menu) ----------
       Winamp thật mở menu Options của cửa sổ Video/Vis. Mục nào làm được
       thì nối thật; mục Winamp có mà Amp chưa làm (vd "Video Capture…")
       thì KHÔNG đưa vào — không đưa mục giả. */
    function videoMenuItems() {
      var items = [
        { label: (avsState.keepAspect ? "✓ " : "") + "Giữ tỉ lệ khung hình", action: function () { setKeepAspect(!avsState.keepAspect); } },
        { label: "Cỡ thường (1x)", action: function () { setVideoScale(1); } },
        { label: "Cỡ gấp đôi (2x)", action: function () { setVideoScale(2); } },
        { label: "Toàn màn hình", action: function () { requestVideoFullscreen(); } },
        { label: avsState.videoMaximized ? "Khôi phục cửa sổ" : "Phóng to cửa sổ", action: function () { setVideoMaximized(!avsState.videoMaximized); } },
        { label: avsState.detached ? "Gắn lại (Reattach)" : "Tách rời (Detach)", action: function () { if (avsState.detached) reattachAvs(); else { if (!avsState.open) openAvs("video"); detachAvs(); } } },
        { label: "Đóng Video", action: function () { closeAvs(); } }
      ];
      return items;
    }
    function visMenuItems() {
      return [
        { label: "Hiệu ứng trước", action: function () { cycleVisVariant(-1); } },
        { label: "Hiệu ứng sau", action: function () { cycleVisVariant(1); } },
        { label: (avsState.visRandom ? "✓ " : "") + "Hiệu ứng ngẫu nhiên", action: function () { avsState.visRandom = !avsState.visRandom; persistAvs(); } },
        { label: "Toàn màn hình", action: function () { requestVideoFullscreen(); } },
        { label: avsState.detached ? "Gắn lại (Reattach)" : "Tách rời (Detach)", action: function () { if (avsState.detached) reattachAvs(); else { if (!avsState.open) openAvs("vis"); detachAvs(); } } },
        { label: "Đóng Hiệu ứng", action: function () { closeAvs(); } }
      ];
    }

    /* ---------- đợt D (9.9): thông tin bài / menu bài (trackinfo/trackmenu) ----------
       Winamp: nhấp đúp vào tên bài (Songticker) → bảng File Info; chuột phải
       → menu bài (Play, Enqueue, Remove, File Info…). Amp nối:
       - Bảng thông tin: tên/nhóm/link/thời lượng/trạng thái/KBPS/KHZ (mở rộng
         từ nút info MISC đã có — cùng dữ liệu, thêm KHZ/KBPS đo thật đợt B).
       - Menu bài: Phát / Chọn / Thông tin / Xóa khỏi playlist / Sao chép link.
         KHÔNG có "Enqueue" (hàng đợi): Amp không có hàng đợi phát, không đưa
         mục giả — xem README đợt D.
       - Nhấp đúp ticker (cả normal + shade) → bảng thông tin; chuột phải
         ticker/hàng playlist → menu bài. */
    function getTrackInfoState(idx) {
      var items = playlistState.items;
      var i = (typeof idx === "number" && items[idx]) ? idx : playlistState.current;
      if (i < 0 || !items[i]) i = playlistState.selected >= 0 ? playlistState.selected : 0;
      var it = items[i] || null;
      if (!it) return { index: -1, name: "", group: "", url: "", len: null, live: false, local: false, kbps: null, khz: null, playing: false, kind: "" };
      var live = it.len == null;
      var kbps = null;
      if (it.local && it.fileSize && it.len && it.len > 0) kbps = String(Math.round(it.fileSize * 8 / it.len / 1000));
      var khz = null;
      try { var sr = audioEngine && audioEngine.getSampleRate ? audioEngine.getSampleRate() : null; if (sr && sr > 0) khz = String(Math.round(sr / 1000)); } catch (e) { khz = null; }
      return {
        index: i, name: it.name || "", group: it.group || "", url: it.url || "",
        len: it.len != null ? it.len : null, lenText: live ? "Trực tiếp" : fmtTime(it.len),
        live: live, local: !!it.local, fileSize: it.fileSize || null,
        kbps: kbps, khz: khz, playing: playlistState.playing && playlistState.current === i,
        kind: it.kind || ""
      };
    }
    function showTrackInfo(anchorDiv, idx) {
      var T = lastStage;
      if (!T) return null;
      var st = getTrackInfoState(idx);
      if (st.index < 0) return null;
      closePlaylistMenus();
      var box = document.createElement("div");
      box.dataset.plMenu = "1";
      box.dataset.trackInfo = "1";
      box.style.position = "absolute";
      box.style.left = ((anchorDiv && anchorDiv._absX) || 10) + "px";
      box.style.top = (((anchorDiv && anchorDiv._absY) || 10) + 12) + "px";
      box.style.background = "#ECE9D8"; box.style.border = "1px solid #ACA899";
      box.style.padding = "6px 8px"; box.style.zIndex = "10"; box.style.pointerEvents = "auto";
      box.style.font = "11px Arial, sans-serif"; box.style.color = "#000";
      box.style.maxWidth = "300px"; box.style.whiteSpace = "normal"; box.style.lineHeight = "1.6";
      box.style.wordBreak = "break-word";
      var title = document.createElement("div");
      title.style.fontWeight = "bold";
      title.textContent = st.name;
      box.appendChild(title);
      var rows = [
        "Nhóm: " + (st.group || "(không rõ)"),
        "Link: " + (st.url || "(file local)"),
        "Thời lượng: " + st.lenText,
        "Trạng thái: " + (st.playing ? "Đang phát" : "Đã chọn") + " · Số thứ tự: " + (st.index + 1),
        "KBPS: " + (st.kbps !== null ? st.kbps : "—") + " · KHZ: " + (st.khz !== null ? st.khz : "—")
      ];
      for (var r = 0; r < rows.length; r++) {
        var row = document.createElement("div");
        row.textContent = rows[r];
        box.appendChild(row);
      }
      var hint = document.createElement("div");
      hint.style.color = "#555";
      hint.textContent = "Bấm vào đây để đóng.";
      box.appendChild(hint);
      box.onclick = function () { closePlaylistMenus(); };
      T.appendChild(box);
      placePopupInStage(box, anchorDiv || { _absY: 10, style: { height: "12px" } }, rows.length + 2);
      armPanelCloser();
      return st;
    }
    function trackMenuItems(anchorDiv, idx) {
      var st = getTrackInfoState(idx);
      var i = st.index;
      if (i < 0) return [];
      var items = [
        { label: "Phát bài này", action: function () { playPlaylistItem(i); } },
        { label: "Chọn bài này", action: function () { selectPlaylistItem(i); } },
        { label: "Thông tin bài…", action: function () { showTrackInfo(anchorDiv, i); } },
        { label: "Xóa khỏi playlist", action: function () { removePlaylistItem(i); } }
      ];
      var it = playlistState.items[i];
      if (it && it.url) {
        items.push({ label: "Sao chép link", action: function () {
          var done = false;
          try {
            var nav = (typeof navigator !== "undefined") ? navigator : null;
            if (nav && nav.clipboard && nav.clipboard.writeText) {
              var p = nav.clipboard.writeText(it.url);
              if (p && p.catch) p.catch(function () { /* clipboard bị chặn thì mở bảng thông tin để copy tay */ showTrackInfo(anchorDiv, i); });
              done = true;
            }
          } catch (e) { done = false; }
          if (!done) showTrackInfo(anchorDiv, i);
        } });
      }
      return items;
    }

    /* ---------- đợt D (9.9): Preferences + About ----------
       WA5:Prefs (cửa sổ Preferences của Winamp): Amp mở 1 bảng cài đặt mô
       phỏng theo nhóm của Winamp thật (General / Playback / Video / Skins /
       Giao diện). Mục nào nối được hành vi thật thì nối (dùng lại hàm đã
       có); mục nào chưa thì ghi rõ "chưa nối" trong bảng, không đưa mục
       giả bấm không làm gì — xem README đợt D. Bảng đóng khi bấm "Đóng"
       hoặc bấm ra ngoài (armPanelCloser). */
    function prefsRows(box) {
      var rows = [];
      function toggleRow(key, labelFn, isOnFn, actionFn) {
        return { key: key, labelFn: labelFn, isOnFn: isOnFn, actionFn: actionFn };
      }
      rows.push({ section: "Phát lại" });
      rows.push(toggleRow("eq", function () { return (drawerState.eqOn ? "✓ " : "") + "Bật Equalizer (EQ)"; }, null, function () { toggleCfg("EQ_TOGGLE", null); }));
      rows.push(toggleRow("pan", function () { return "Pan về giữa (cân bằng trái/phải)"; }, null, function () { setBalance(0.5); }));
      rows.push(toggleRow("repeat", function () { return "Lặp lại: " + repeatLabel(); }, null, function () { cycleRepeat(); }));
      rows.push({ section: "Video / Hiệu ứng" });
      rows.push(toggleRow("video", function () { return (avsState.open && avsState.mode === "video" ? "✓ " : "") + "Mở Video"; }, null, function () { toggleVideoWindow(); }));
      rows.push(toggleRow("vis", function () { return (avsState.open && avsState.mode === "vis" ? "✓ " : "") + "Mở Hiệu ứng (Vis)"; }, null, function () { if (avsState.open && avsState.mode === "vis") closeAvs(); else openAvs("vis"); }));
      rows.push(toggleRow("aspect", function () { return (avsState.keepAspect ? "✓ " : "") + "Giữ tỉ lệ khung hình (Video)"; }, null, function () { setKeepAspect(!avsState.keepAspect); }));
      rows.push(toggleRow("beat", function () { return (beatVisOn ? "✓ " : "") + "Hiệu ứng Beat Visualization"; }, null, function () { setBeatVisOn(!beatVisOn); }));
      rows.push({ section: "Giao diện" });
      rows.push(toggleRow("drawer-eq", function () { return "Ngăn kéo: Equalizer"; }, null, function () { openDrawerTab("eq"); }));
      rows.push(toggleRow("drawer-options", function () { return "Ngăn kéo: Options"; }, null, function () { openDrawerTab("options"); }));
      rows.push(toggleRow("drawer-ct", function () { return "Ngăn kéo: Color Themes"; }, null, function () { openDrawerTab("colorthemes"); }));
      rows.push(toggleRow("shade", function () { var on = false; try { on = !!(isShadeMode && isShadeMode()); } catch (e) { on = false; } return (on ? "✓ " : "") + "Thu gọn (Shade)"; }, null, function () { if (onShadeToggle) onShadeToggle(!(isShadeMode && isShadeMode())); }));
      rows.push(toggleRow("zoom1", function () { return "Zoom: Cỡ gốc 1x"; }, null, function () { if (onZoom) onZoom("1"); }));
      rows.push(toggleRow("zoomfit", function () { return "Zoom: Vừa màn hình"; }, null, function () { if (onZoom) onZoom("fit"); }));
      rows.push({ section: "Skin" });
      rows.push(toggleRow("skin", function () { return "Nạp skin .wal/.zip…"; }, null, function () { if (onOpenSkinPicker) onOpenSkinPicker(); }));
      rows.push({ section: "Chưa nối (cần MAKI hoặc tính năng native)" });
      rows.push({ note: "Kiểu file / CD rip — ngoài phạm vi web" });
      rows.push({ note: "Crossfade thật — cần engine 2 thẻ audio (xem README đợt B)" });
      rows.push({ note: "Notifier popup — chưa vẽ (xem README đợt B)" });
      rows.push({ note: "Tìm kiếm toàn thư viện — chưa có" });
      return rows;
    }
    function refreshPrefsTicks(box) {
      if (!box) return;
      var rows = box.querySelectorAll("[data-pref-key]");
      var defs = prefsRows(box);
      var map = {};
      for (var i = 0; i < defs.length; i++) if (defs[i].key) map[defs[i].key] = defs[i];
      for (var j = 0; j < rows.length; j++) {
        var d = map[rows[j].getAttribute("data-pref-key")];
        if (d) rows[j].textContent = d.labelFn();
      }
    }
    function openPreferences(anchorDiv) {
      var T = lastStage;
      if (!T) return false;
      closePlaylistMenus();
      var box = document.createElement("div");
      box.dataset.plMenu = "1";
      box.dataset.prefs = "1";
      box.style.position = "absolute";
      box.style.left = ((anchorDiv && anchorDiv._absX) || 10) + "px";
      box.style.top = (((anchorDiv && anchorDiv._absY) || 10) + 12) + "px";
      box.style.background = "#ECE9D8"; box.style.border = "1px solid #ACA899";
      box.style.padding = "6px 8px"; box.style.zIndex = "10"; box.style.pointerEvents = "auto";
      box.style.font = "11px Arial, sans-serif"; box.style.color = "#000";
      box.style.maxWidth = "300px"; box.style.whiteSpace = "normal"; box.style.lineHeight = "1.6";
      var title = document.createElement("div");
      title.style.fontWeight = "bold"; title.style.fontSize = "12px";
      title.textContent = "Preferences — Amp v9";
      box.appendChild(title);
      var defs = prefsRows(box);
      for (var i = 0; i < defs.length; i++) {
        (function (d) {
          if (d.section) {
            var sec = document.createElement("div");
            sec.style.fontWeight = "bold"; sec.style.marginTop = "6px";
            sec.textContent = d.section;
            box.appendChild(sec);
            return;
          }
          if (d.note) {
            var note = document.createElement("div");
            note.style.color = "#777";
            note.textContent = "· " + d.note;
            box.appendChild(note);
            return;
          }
          var row = document.createElement("div");
          row.dataset.prefKey = d.key;
          row.textContent = d.labelFn();
          row.style.padding = "2px 4px"; row.style.cursor = "pointer"; row.style.whiteSpace = "nowrap";
          row.onmouseover = function () { row.style.background = "#316AC5"; row.style.color = "#fff"; };
          row.onmouseout = function () { row.style.background = ""; row.style.color = ""; };
          row.onclick = function (ev) {
            if (ev && ev.stopPropagation) ev.stopPropagation();
            d.actionFn();
            refreshPrefsTicks(box);
          };
          box.appendChild(row);
        })(defs[i]);
      }
      var closeRow = document.createElement("div");
      closeRow.textContent = "Đóng";
      closeRow.style.padding = "4px 4px"; closeRow.style.cursor = "pointer"; closeRow.style.fontWeight = "bold";
      closeRow.onclick = function (ev) { if (ev && ev.stopPropagation) ev.stopPropagation(); closePlaylistMenus(); };
      box.appendChild(closeRow);
      T.appendChild(box);
      placePopupInStage(box, anchorDiv || { _absY: 10, style: { height: "12px" } }, defs.length + 2);
      armPanelCloser();
      return true;
    }
    function openAbout(anchorDiv) {
      var T = lastStage;
      if (!T) return false;
      closePlaylistMenus();
      var box = document.createElement("div");
      box.dataset.plMenu = "1";
      box.dataset.about = "1";
      box.style.position = "absolute";
      box.style.left = ((anchorDiv && anchorDiv._absX) || 10) + "px";
      box.style.top = (((anchorDiv && anchorDiv._absY) || 10) + 12) + "px";
      box.style.background = "#ECE9D8"; box.style.border = "1px solid #ACA899";
      box.style.padding = "6px 8px"; box.style.zIndex = "10"; box.style.pointerEvents = "auto";
      box.style.font = "11px Arial, sans-serif"; box.style.color = "#000";
      box.style.maxWidth = "300px"; box.style.whiteSpace = "normal"; box.style.lineHeight = "1.6";
      var si = skinInfo || {};
      var lines = [
        "Amp v9 — Winamp Modern",
        "Phiên bản Amp: 9.9 (renderer v" + RENDERER_VERSION + ")",
        "Skin: " + (si.name || "Winamp Modern") + (si.version ? " v" + si.version : ""),
        "Tác giả skin: " + (si.author || "(không rõ)"),
        "Mô phỏng Winamp 5.66 Modern trên web — dựng từ XML của skin đang nạp."
      ];
      for (var i = 0; i < lines.length; i++) {
        var row = document.createElement("div");
        if (i === 0) row.style.fontWeight = "bold";
        row.textContent = lines[i];
        box.appendChild(row);
      }
      var hint = document.createElement("div");
      hint.style.color = "#555";
      hint.textContent = "Bấm vào đây để đóng.";
      box.appendChild(hint);
      box.onclick = function () { closePlaylistMenus(); };
      T.appendChild(box);
      placePopupInStage(box, anchorDiv || { _absY: 10, style: { height: "12px" } }, lines.length + 1);
      armPanelCloser();
      return true;
    }

    /* Chữ bitmap: các span glyph bên trong không có _absY riêng — cho chúng
       kế thừa vị trí của div ngoài, để đo hình học và shiftSubtree đúng. */
    function inheritAbs(root) {
      var all = root.querySelectorAll("*");
      for (var i = 0; i < all.length; i++) {
        if (all[i]._absY === undefined) { all[i]._absX = root._absX || 0; all[i]._absY = root._absY || 0; }
      }
    }
    async function renderText(el, tag, parentEl, parentW, parentH, x, y, ctx) {
      var w = relSize(el, "w", parentW), h = relSize(el, "h", parentH);
      var fontId = el.getAttribute("font") || "";
      var display = el.getAttribute("display") || "";
      var def = el.getAttribute("default") || "";
      var color = el.getAttribute("color") || "255,255,255";
      var align = el.getAttribute("align") || "left";
      var div = document.createElement("div");
      div.style.position = "absolute"; div.style.left = x + "px"; div.style.top = y + "px";
      div.style.width = w + "px"; div.style.height = h + "px";
      setAbs(div, parentEl, x, y);
      parentEl.appendChild(div);
      var id = el.getAttribute("id") || "";
      if (id === "window.titlebar.title") {
        div.textContent = (ctx.titleText || "WINAMP").toUpperCase();
        div.style.font = "bold 11px Arial, sans-serif";
        div.style.color = colorOf(color);
        /* v9.6 (Điểm 1): chữ căn giữa cửa sổ (tâm 177) theo
           ctx.titleCenter tính ở nhánh XUI; lineHeight h+2 để glyph
           xuống ~1px cho khớp Winamp thật (đỉnh glyph thật y=5, Amp cũ
           y≈3,5). Không đổi font-size 11px, không thêm shadow (XML
           không có shadow="1" — chỉ có shadowcolor/shadowx/shadowy). */
        if (ctx.titleCenter) {
          div.style.left = ctx.titleCenter.left + "px";
          div.style.width = ctx.titleCenter.textW + "px";
          setAbs(div, parentEl, ctx.titleCenter.left, y);
        }
        div.style.lineHeight = (h + 2) + "px";
        if (el.getAttribute("shadow") === "1") div.style.textShadow = "1px 1px #000";
        return;
      }
      /* Đợt D — VID_Info: KHÔNG được rơi xuống nhánh Arial chung (ở đó
         txt = display = "VID_Info" sẽ hiện nguyên chữ "VID_Info" lên
         thanh nút). Hiện avsState.videoInfo ("WxH" hoặc rỗng). */
      if (display === "VID_Info") {
        var vdiv = await makeBitmapText(fontId, avsState.videoInfo || "", w, align, color, valign, h);
        div.appendChild(vdiv);
        vidInfoEls.push({ div: div, fontId: fontId, boxW: w, align: align, color: color, valign: valign, boxH: h });
        inheritAbs(div);
        return;
      }
      var font = RES.fonts[fontId];
      if (font && font.tag === "bitmapfont") {
        var valign = el.getAttribute("valign") || "";
        if (display === "time" || id === "timer") {
          var tdiv = await makeBitmapText(fontId, timerDisplayText(), w, align, color, valign, h);
          div.appendChild(tdiv);
          timerEls.push({ div: div, fontId: fontId, boxW: w, align: align, color: color });
          /* Đợt A (9.9, việc 4): bấm vào đồng hồ đổi đếm lên ↔ đếm ngược
             (như Winamp thật). Div .txt mặc định pointer-events:none
             nên phải bật lại + con trỏ tay; nút Play/Pause... không nằm
             trên vùng này nên không tranh bấm. */
          div.style.pointerEvents = "auto";
          div.style.cursor = "pointer";
          div.title = "Bấm để đổi đếm lên / đếm ngược";
          div.onclick = function () { toggleTimerMode(); };
          inheritAbs(div);
          return;
        }
        if (display === "songname" || tag === "songticker") {
          var holder = document.createElement("div");
          holder.className = "ticker-inner";
          div.appendChild(holder);
          var rec = { div: div, holder: holder, fontId: fontId, boxW: w, color: color, showlen: el.getAttribute("showlen") === "1", offset: 0, textW: 0 };
          tickerEls.push(rec);
          await setTickerText(rec);
          /* Đợt D (9.9) — trackinfo/trackmenu theo XML (Songticker có
             dblclickaction="trackinfo" + rightclickaction="trackmenu",
             cả normal lẫn shade): nhấp đúp → bảng thông tin bài; chuột
             phải → menu bài (Phát / Thông tin / Xóa…). */
          var dca2 = el.getAttribute("dblclickaction") || el.getAttribute("dblClickAction") || "";
          var rca2 = el.getAttribute("rightclickaction") || el.getAttribute("rightClickAction") || "";
          if (dca2.toLowerCase() === "trackinfo" || rca2.toLowerCase() === "trackmenu") {
            div.style.pointerEvents = "auto";
            div.style.cursor = "pointer";
            if (dca2.toLowerCase() === "trackinfo") div.ondblclick = function () { showTrackInfo(div); };
            if (rca2.toLowerCase() === "trackmenu") {
              div.oncontextmenu = function (ev) {
                if (ev && ev.preventDefault) ev.preventDefault();
                showPlaylistMenu(div, trackMenuItems(div, playlistState.current));
                return false;
              };
            }
          }
          inheritAbs(div);
          return;
        }
        if (display === "PE_Info" || id === "PLTime") {
          /* PLTime = TỔNG thời gian các mục có thời lượng (việc 3 đợt A:
             chuyển sang thời gian ĐÃ CHỌN khi có lựa chọn — xem
             playlistClockText); kênh radio không có thời lượng nên không
             tính vào tổng, không bịa số (chỉ có radio thì tổng hiện 0:00). */
          var pdiv = await makeBitmapText(fontId, playlistClockText(), w, align, color, valign, h);
          div.appendChild(pdiv);
          infoEls.push({ div: div, fontId: fontId, boxW: w, align: align, color: color, valign: valign, boxH: h, kind: "pltime" });
          inheritAbs(div);
          return;
        }
        /* CFDisplay (đợt B): màn hình số giây crossfade, font pe.time. */
        if (id === "CFDisplay") {
          var cfdiv = await makeBitmapText(fontId, String(drawerState.crossfadeSecs), w, align, color, valign, h);
          div.appendChild(cfdiv);
          cfDisplayEls.push({ div: div, fontId: fontId, boxW: w, align: align, color: color });
          inheritAbs(div);
          return;
        }
        /* Đợt B (9.9): Bitrate/Frequency — số đo thật khi có (songInfoText),
           không thì số demo "128"/"44" (ghi rõ demo trong README +
           getSongInfoState). Đăng ký vào infoEls để updateInfoEls vẽ lại
           khi có số mới (đổi bài, metadata về, EQ bật). */
        var songText = (id === "Bitrate" || id === "Frequency") ? songInfoText(id) : undefined;
        var tdiv2 = await makeBitmapText(fontId, songText !== undefined ? songText : def, w, align, color, valign, h);
        div.appendChild(tdiv2);
        if (id === "Bitrate" || id === "Frequency") {
          infoEls.push({ div: div, fontId: fontId, boxW: w, align: align, color: color, valign: valign, boxH: h, kind: id.toLowerCase() });
        }
        inheritAbs(div);
        return;
      }
      var txt = display || def;
      if (txt === ":componentname") txt = ctx.titleText || "";
      div.textContent = txt;
      div.style.font = "bold 11px Arial, sans-serif";
      div.style.color = colorOf(color);
      if (el.getAttribute("shadow") === "1") div.style.textShadow = "1px 1px #000";
    }
    async function setTickerText(rec) {
      /* Đợt E — ticker hiện mục ĐANG HÁT (tên kênh/bài, BỎ DẤU vì font
         marquee chỉ có ASCII), kèm "(M:SS)" khi mục có thời lượng.
         Chưa phát gì thì giữ bài Demo như đợt A. Lỗi phát (kênh lỗi /
         bài Demo chưa có file) thì hiện chữ đỏ không dấu. */
      var text, color = rec.color;
      if (tickerError) {
        text = tickerError;
        color = "#ff4444";
      } else if (playlistState.playing && playlistState.items[playlistState.current]) {
        var cur = playlistState.items[playlistState.current];
        text = stripDiacritics(cur.name);
        if (rec.showlen && cur.len != null) text += " (" + fmtTime(cur.len) + ")";
      } else {
        /* Đợt 9.5: không còn bài Demo — chưa phát thì ticker hiện tên mục
           đang chọn (thường là kênh radio đầu), trống nếu playlist rỗng. */
        var cur0 = playlistState.items[playlistState.current];
        text = cur0 ? stripDiacritics(cur0.name) : "";
        if (rec.showlen && cur0 && cur0.len != null) text += " (" + fmtTime(cur0.len) + ")";
      }
      var tdiv = await makeBitmapText(rec.fontId, text, rec.boxW, "left", color);
      rec.holder.innerHTML = "";
      rec.holder.appendChild(tdiv);
      rec.textW = tdiv._textW || 0;
      rec.offset = 0;
      /* Đợt B (9.9): đổi chữ thì cuộn lại từ đầu + đồng bộ vòng ticker
         (chữ mới có thể dài hơn hộp thì bắt đầu cuộn khi đang phát). */
      rec._tickPause = 0;
      try { rec.holder.style.transform = ""; } catch (e) { /* bỏ qua */ }
      inheritAbs(rec.div);
      syncTickerAnim();
    }
    /* Đợt A (9.9, việc 4) — đồng hồ chính: đếm lên / đếm ngược (như Winamp thật).
       - timerMode "elapsed" (mặc định): vị trí đang phát, đếm lên từ 0:00
         theo currentTime của engine (demo.t, cập nhật mỗi lần timeupdate).
       - timerMode "remaining": thời gian còn lại "-M:SS" (vd "-2:15").
         Bấm vào đồng hồ để đổi chế độ, bấm nữa thì về đếm lên.
       - Đài live (không có thời lượng) thì không đếm ngược được → luôn
         hiện đếm lên. Bài đang phát chưa biết thời lượng (len null +
         engine chưa báo duration) thì cũng hiện đếm lên.
       - Lỗi 3/11 (ảnh người dùng: đồng hồ 5:00 trong khi nhạc mới ở
         ~85% bài): timer đứng yên ở vị trí kéo seek vì updateTimerEls
         vẽ lại TOÀN BỘ rec trong 1 vòng await — 1 rec hỏng (vd div đã
         tách khỏi DOM sau re-render) ném lỗi là cả vòng dừng, các rec
         sau (kể cả đồng hồ đang hiện) không được vẽ nữa, trong khi
         updateProgress vẫn chạy nên vạch tiến độ vẫn lên. Sửa: vẽ từng
         rec trong try/catch riêng — 1 rec hỏng không chặn các rec khác. */
    function currentTrackDuration() {
      if (audioEngine) {
        try { var d = audioEngine.getDuration(); if (d && isFinite(d) && d > 0) return d; } catch (e) { /* bỏ qua */ }
      }
      /* Đợt A (9.9, việc 4) — demo.dur (engine/timeupdate báo mới nhất
         cho bài ĐANG PHÁT) thắng len metadata của mục current: mục
         current có thể khác bài đang phát, hoặc len đã cũ. Chỉ khi chưa
         có báo cáo nào (demo.dur === undefined, chưa phát) mới dùng len
         của mục current làm dự phòng. demo.dur === null = engine báo
         không có thời lượng (đài live) → trả null, đồng hồ không đếm
         ngược dù mục có len. */
      if (demo.dur !== undefined) return demo.dur;
      var cur = playlistState.items[playlistState.current];
      if (cur && cur.len != null) return cur.len;
      return null;
    }
    function timerDisplayText() {
      if (timerMode === "remaining") {
        var d = currentTrackDuration();
        if (d && d > 0) return "-" + fmtTime(Math.max(0, d - demo.t));
      }
      return fmtTime(demo.t);
    }
    function getTimerMode() { return timerMode; }
    function setTimerMode(m) {
      timerMode = (m === "remaining") ? "remaining" : "elapsed";
      updateTimerEls();
      return timerMode;
    }
    function toggleTimerMode() { return setTimerMode(timerMode === "remaining" ? "elapsed" : "remaining"); }
    async function updateTimerEls() {
      for (var i = 0; i < timerEls.length; i++) {
        var rec = timerEls[i];
        try {
          var tdiv = await makeBitmapText(rec.fontId, timerDisplayText(), rec.boxW, rec.align, rec.color);
          rec.div.innerHTML = "";
          rec.div.appendChild(tdiv);
          inheritAbs(rec.div);
        } catch (e) { /* 1 rec hỏng không được chặn các rec còn lại (xem ghi chú việc 4) */ }
      }
    }
    /* Đợt B (9.9) — KBPS/KHZ: số đo thật khi có, số demo khi không có
       (KHÔNG bịa số đo — xem README đợt B):
       - KHZ = sample rate của AudioContext (audio.js getSampleRate), vd 48000
         -> "48", 44100 -> "44". Chỉ có khi graph EQ đã được tạo (lần phát đầu
         với EQ bật); trước đó null -> hiện "44" demo. Tắt EQ không hủy graph
         nên KHZ vẫn hiện số thật — đó là sample rate của THIẾT BỊ (không đổi
         khi bypass), không phải của file: trình duyệt không cho đọc sample
         rate của file qua thẻ media (muốn đúng file thì parse header, đợt sau).
       - KBPS file local = trung bình thật từ kích thước file + thời lượng
         (fileSize*8/len/1000, vd 800000 byte / 200s -> 32 kbps). Cần mục local
         có fileSize (addLocalFiles ghi lại) + len (probe/metadata/engine).
         Đài live / file chưa biết len -> null -> hiện "128" demo: luồng
         HLS/MP3 không báo bitrate nên không đo được (không bịa).
       demo.dur chỉ dùng khi đang phát (là thời lượng bài đang phát do engine
       báo); không phát thì demo.dur có thể là của bài cũ nên không dùng. */
    function songInfoValues() {
      var sr = null;
      try { sr = audioEngine && audioEngine.getSampleRate ? audioEngine.getSampleRate() : null; } catch (e) { sr = null; }
      var khz = null;
      if (sr && sr > 0) khz = String(Math.round(sr / 1000));
      var cur = playlistState.items[playlistState.current];
      var len = null;
      if (cur && cur.len != null) len = cur.len;
      else if (playlistState.playing && demo.dur != null && demo.dur > 0) len = demo.dur;
      var kbps = null;
      if (cur && cur.local && cur.fileSize && len && len > 0) kbps = String(Math.round(cur.fileSize * 8 / len / 1000));
      return { khz: khz, khzDemo: khz === null, kbps: kbps, kbpsDemo: kbps === null };
    }
    function songInfoText(id) {
      var v = songInfoValues();
      if (id === "Frequency") return v.khz !== null ? v.khz : "44";
      if (id === "Bitrate") return v.kbps !== null ? v.kbps : "128";
      return "";
    }
    function getSongInfoState() {
      var v = songInfoValues();
      return { khz: v.khz !== null ? v.khz : "44", khzDemo: v.khzDemo, kbps: v.kbps !== null ? v.kbps : "128", kbpsDemo: v.kbpsDemo };
    }
    /* Vẽ lại PLTime (đồng hồ playlist, việc 3 đợt A) tại chỗ sau khi
       thêm/xóa/sắp xếp/chọn mục — không cần re-render toàn cửa sổ. */
    async function updateInfoEls() {
      for (var i = 0; i < infoEls.length; i++) {
        var rec = infoEls[i];
        if (rec.kind !== "pltime" && rec.kind !== "bitrate" && rec.kind !== "frequency") continue;
        try {
          /* Đợt B (9.9): bitrate/frequency vẽ lại khi có số mới (đổi bài,
             metadata về, EQ bật làm graph xuất hiện). */
          var txt = rec.kind === "pltime" ? playlistClockText()
            : songInfoText(rec.kind === "bitrate" ? "Bitrate" : "Frequency");
          var tdiv = await makeBitmapText(rec.fontId, txt, rec.boxW, rec.align, rec.color, rec.valign, rec.boxH);
          rec.div.innerHTML = "";
          rec.div.appendChild(tdiv);
          inheritAbs(rec.div);
        } catch (e) { /* 1 rec hỏng không chặn các rec còn lại */ }
      }
    }
    function updateStatusEls() {
      var state = demo.playing ? "play" : (demo.t > 0 ? "pause" : "stop");
      for (var i = 0; i < statusEls.length; i++) {
        var rec = statusEls[i];
        var keys = ["stop", "play", "pause"];
        for (var j = 0; j < keys.length; j++) {
          if (rec[keys[j]]) rec[keys[j]].style.display = keys[j] === state ? "" : "none";
        }
      }
      /* Đợt B (9.9): mọi đường đổi trạng thái phát (engine callback, nút
         Play/Pause/Stop, hết bài, lỗi) đều đi qua đây nên đây là điểm
         choke để đồng bộ vòng vis: đang phát thì vòng chạy (vis cửa sổ
         chính theo nhạc), dừng thì vòng dừng (vis về khung cuối). */
      syncAvsAnim();
    }
    function updateProgress() {
      for (var i = 0; i < progressEls.length; i++) {
        progressEls[i].div.style.width = Math.round(demo.seekFrac * progressEls[i].fullW) + "px";
      }
      /* Đợt A (9.9, việc 5) — ĐỒNG BỘ THUMB SEEK THEO NHẠC (lỗi 3/11):
         trước đây chỉ vạch fill (progressEls) chạy theo demo.seekFrac,
         còn thumb của slider SEEK chỉ đặt lúc vẽ (rec.frac = demo.seekFrac
         lúc render) và lúc người dùng kéo — giữa 2 lần vẽ, nhạc chạy mà
         thumb đứng yên; kéo xong thumb kẹt ở chỗ thả. Ảnh người dùng
         3/11: 2 thumb Seeker/SeekerGhost lệch nhau (1 ở ~100% vừa kéo,
         1 ở ~14% chưa chạm) trong khi vạch fill ở ~86%.
         Nay mỗi lần tiến độ đổi (timeupdate) thì đẩy cả 2 thumb SEEK về
         đúng demo.seekFrac (silent: không tua lại). Đang kéo thì bỏ qua
         (rec.dragging) để khỏi giằng tay người dùng. */
      for (var j = 0; j < sliderRecords.length; j++) {
        var rec = sliderRecords[j];
        if (rec && rec.action === "SEEK" && !rec.dragging && typeof rec.setFrac === "function") {
          try { rec.setFrac(demo.seekFrac, true); } catch (e) { /* bỏ qua */ }
        }
      }
    }
    function updateVolumebar() {
      for (var i = 0; i < volumebarEls.length; i++) {
        volumebarEls[i].div.style.width = Math.max(2, Math.round(demo.volume * volumebarEls[i].maxW)) + "px";
      }
    }
    /* Vẽ vis — đợt D: mẫu sóng sin như đợt A khi chưa có tiếng; CÓ analyser
       (điểm nối đợt E, setAvsAnalyser) thì vẽ theo tần số thật.
       Kiểu hiệu ứng (VIS_Prev/Next) đổi màu cột trong VIS_VARIANTS.
       Gọi 1 lần sau mỗi render (tĩnh) và mỗi frame rAF khi AVS đang mở
       hoặc đang phát (đợt B: avsPhase tăng dần, sóng trượt / cột theo nhạc). */
    /* Đợt B (9.9) — vis theo nhạc thật, 3 chế độ (không bịa tín hiệu):
       - "real": EQ BẬT + analyser có tín hiệu (maxBin >= 4) → 16 cột theo
         getByteFrequencyData, cập nhật mỗi frame rAF khi đang phát. Đài live
         qua EQ bật + CORS OK cũng theo nhạc thật.
       - "flat": EQ BẬT + analyser im (maxBin < 4) → cột phẳng 2px ở đáy (vis
         IM, đúng trạng thái: đài không CORS nên câm tiếng, hoặc đang tạm dừng).
         Trước đây (đợt K 9.7) trường hợp này vẽ vạch mẫu sine — sai vì vạch mẫu
         nhảy múa trong khi không có tiếng, giả vờ có nhạc.
       - "sample": EQ TẮT (tiếng đi thẳng loa, analyser không có tín hiệu để
         đọc — xem audio.js: analyser nằm sau master, EQ tắt thì source nối
         thẳng destination) hoặc chưa có analyser/graph → vạch mẫu sine như
         WACUP hiện khi dừng. Đây là MẪU TRANG TRÍ, ghi rõ trong README, không
         phải hiệu ứng theo nhạc.
       Màu cột: visVariant === 0 lấy từ XML <vis> ColorBand1..16 (đợt K 9.7,
       kiểm lại đợt B: vẫn đúng — visXmlBands đọc từ <vis> lúc render, canvas
       AVS dùng chung mảng này); VIS_Prev/Next đổi sang VIS_VARIANTS[1..2].
       Canvas trong display để trong suốt (fillBg false) để nền display hiện
       qua; canvas AVS giữ nền tối. lastVisFrame ghi lại khung vẽ gần nhất
       (mode/maxBin/heights) cho test + debug. */
    function drawVisStatic() {
      var freq = null, maxBin = 0;
      var hasAnalyser = !!(avsAnalyser && typeof avsAnalyser.getByteFrequencyData === "function" && avsAnalyser.frequencyBinCount);
      if (hasAnalyser) {
        try {
          freq = new Uint8Array(avsAnalyser.frequencyBinCount);
          avsAnalyser.getByteFrequencyData(freq);
          for (var fi = 0; fi < freq.length; fi++) if (freq[fi] > maxBin) maxBin = freq[fi];
        } catch (e) { freq = null; maxBin = 0; }
      }
      /* Đợt B (9.9): chế độ vẽ theo EQ + tín hiệu (xem ghi chú trên). */
      var visMode = (!hasAnalyser || !drawerState.eqOn) ? "sample" : (maxBin >= 4 ? "real" : "flat");
      var useXmlCol = avsState.visVariant === 0;
      var col = (VIS_VARIANTS[avsState.visVariant] || VIS_VARIANTS[0]).col;
      var heights = [];
      for (var i = 0; i < visCanvases.length; i++) {
        var v = visCanvases[i];
        var ctx2 = null;
        try { ctx2 = v.cv.getContext("2d"); } catch (e) { ctx2 = null; }
        if (!ctx2) { /* jsdom không có canvas 2d: vẫn tính heights cho test */
          if (i === 0) {
            var H0 = v.cv.height || 0;
            for (var k0 = 0; k0 < VIS_BANDS; k0++) heights.push(visBarHeight(k0, visMode, freq, H0));
          }
          continue;
        }
        var W = v.cv.width, H = v.cv.height;
        ctx2.clearRect(0, 0, W, H);
        if (v.fillBg !== false) {
          ctx2.fillStyle = VIS_BG;
          ctx2.fillRect(0, 0, W, H);
        }
        var n = VIS_BANDS, bw = W / n;
        for (var k = 0; k < n; k++) {
          var hh = visBarHeight(k, visMode, freq, H);
          if (i === 0) heights.push(hh);
          ctx2.fillStyle = useXmlCol ? (v.bands[k] || "#fff") : col;
          ctx2.fillRect(k * bw + 1, H - hh, bw - 2, hh);
        }
      }
      lastVisFrame = { mode: visMode, maxBin: maxBin, heights: heights };
      /* Đợt D (9.9): khung beat theo bass thật (chỉ mode real mới có tín
         hiệu — flat/sample thì về khung 0, không giả vờ có nhạc). */
      var bass = 0;
      if (visMode === "real" && freq) {
        var bs = 0, bn = Math.min(4, freq.length);
        for (var bi = 0; bi < bn; bi++) bs += freq[bi];
        bass = bn ? (bs / bn) / 255 : 0;
      }
      updateBeatFrames(bass);
    }
    /* Đợt D (9.9) — khung beat theo nhạc thật: năng lượng bass (trung bình
       4 bin thấp của analyser, 0..1) -> khung filmstrip (0..frames-1).
       Không có tín hiệu (EQ tắt / dừng / analyser im) thì về khung 0.
       Chỉ đổi backgroundPosition (không vẽ lại sprite) nên rẻ. */
    function updateBeatFrames(bass01) {
      for (var i = 0; i < animLayerRecs.length; i++) {
        var rec = animLayerRecs[i];
        if (!rec.beat || rec.frames <= 1) continue;
        var f = 0;
        if (beatVisOn && bass01 > 0) f = Math.max(0, Math.min(rec.frames - 1, Math.round(bass01 * (rec.frames - 1))));
        if (f !== rec.frame) {
          rec.frame = f;
          try { rec.div.style.backgroundPosition = "0px " + (-f * rec.frameH) + "px"; } catch (e) { /* bỏ qua */ }
        }
      }
    }
    function getBeatFrame() {
      for (var i = 0; i < animLayerRecs.length; i++) if (animLayerRecs[i].beat) return animLayerRecs[i].frame;
      return 0;
    }
    /* Chiều cao 1 cột vis (đợt B — tách riêng để test không cần canvas):
       real = theo bin tần số; flat = 2px (im); sample = sine theo phase. */
    function visBarHeight(k, mode, freq, H) {
      if (mode === "flat") return 2;
      if (mode === "real" && freq) {
        var bin = freq[Math.floor(k * freq.length / VIS_BANDS)] || 0;
        return 2 + (bin / 255) * (H - 6);
      }
      return 2 + Math.abs(Math.sin(k * 0.9 + avsPhase)) * (H - 6);
    }
    function getVisFrame() { return { mode: lastVisFrame.mode, maxBin: lastVisFrame.maxBin, heights: lastVisFrame.heights.slice() }; }
    /* Vòng động cho vis: mỗi frame tăng phase rồi vẽ lại.
       Đợt B (9.9): vòng chạy khi AVS mở HOẶC đang phát (trước đây chỉ khi
       AVS mở nên vis cửa sổ chính đứng yên khi AVS đóng). Không có
       requestAnimationFrame (jsdom) thì không chạy vòng — test gọi
       drawVisStatic trực tiếp hoặc chọc rAF giả. Dừng (đóng AVS + dừng
       phát) thì vẽ 1 khung cuối cho vis về trạng thái đúng rồi thôi. */
    function startAvsAnim() {
      if (typeof requestAnimationFrame !== "function") return false;
      if (avsRafId) return true;
      var frame = function () {
        avsRafId = 0;
        if (!avsState.open && !demo.playing) { drawVisStatic(); return; }
        avsPhase += 0.15;
        drawVisStatic();
        avsRafId = requestAnimationFrame(frame);
      };
      avsRafId = requestAnimationFrame(frame);
      return true;
    }
    function stopAvsAnim() {
      if (avsRafId && typeof cancelAnimationFrame === "function") {
        try { cancelAnimationFrame(avsRafId); } catch (e) { /* bỏ qua */ }
      }
      avsRafId = 0;
    }

    /* ---------- chữ chạy (songticker) — đợt B (9.9) ----------
       3 chế độ theo tùy chọn optionsgroup.songticker (radio, đọc từ model):
       - "disabled" ("Disable Songticker scrolling"): không cuộn, hiện đầu chữ.
       - "modern" ("Modern Songticker scrolling", mặc định): cuộn mượt 30px/s,
         tới cuối thì DỪNG 1s rồi mới về đầu (pause ở cuối).
       - "classic" ("Classic Songticker scrolling"): cuộn đều 30px/s, hết chữ
         thì NHẢY NGAY về đầu (không dừng) — kiểu Winamp 2.x.
       Chỉ cuộn khi ĐANG PHÁT và chữ dài hơn hộp (textW > boxW); dừng/tạm dừng
       thì về đầu chữ. stepTicker(dtMs) là bước thuần (test gọi trực tiếp);
       vòng rAF chỉ chạy khi cần (đang phát + có chữ dài + không disabled).
       Không có requestAnimationFrame (jsdom) thì không chạy vòng. */
    var TICKER_SPEED = 30; /* px/s */
    var TICKER_END_PAUSE_MS = 1000;
    var tickerRafId = 0, tickerLastT = 0;
    function tickerMode() {
      if (cfgSuffixOn("Disable Songticker scrolling", false)) return "disabled";
      if (cfgSuffixOn("Classic Songticker scrolling", false)) return "classic";
      return "modern";
    }
    function tickerNeedsScroll(rec) { return !!(rec && rec.holder && rec.textW > rec.boxW); }
    function stepTicker(dtMs) {
      var mode = tickerMode();
      for (var i = 0; i < tickerEls.length; i++) {
        var rec = tickerEls[i];
        if (!rec || !rec.holder) continue;
        if (!demo.playing || mode === "disabled" || !tickerNeedsScroll(rec)) {
          if (rec.offset) { rec.offset = 0; rec._tickPause = 0; }
          if (rec.holder.style.transform) rec.holder.style.transform = "";
          continue;
        }
        if (mode === "modern") {
          var maxOff = Math.max(0, rec.textW - rec.boxW + 16);
          if (rec._tickPause > 0) {
            rec._tickPause -= dtMs;
            if (rec._tickPause <= 0) { rec._tickPause = 0; rec.offset = 0; }
          } else {
            rec.offset = (rec.offset || 0) + TICKER_SPEED * dtMs / 1000;
            if (rec.offset >= maxOff) { rec.offset = maxOff; rec._tickPause = TICKER_END_PAUSE_MS; }
          }
        } else { /* classic: cuộn đều, nhảy ngay về đầu khi hết chữ */
          rec.offset = (rec.offset || 0) + TICKER_SPEED * dtMs / 1000;
          if (rec.offset > rec.textW) rec.offset = 0;
        }
        rec.holder.style.transform = rec.offset > 0 ? "translateX(" + (-Math.round(rec.offset)) + "px)" : "";
      }
    }
    function getTickerState() {
      var out = [];
      for (var i = 0; i < tickerEls.length; i++) {
        var rec = tickerEls[i];
        out.push({ offset: rec.offset || 0, textW: rec.textW || 0, boxW: rec.boxW || 0, mode: tickerMode() });
      }
      return out;
    }
    function startTickerAnim() {
      if (typeof requestAnimationFrame !== "function") return false;
      if (tickerRafId) return true;
      var nowFn = function () {
        try { if (typeof performance !== "undefined" && performance.now) return performance.now(); } catch (e) { /* bỏ qua */ }
        return Date.now();
      };
      tickerLastT = nowFn();
      var frame = function () {
        tickerRafId = 0;
        var anyScroll = false;
        for (var i = 0; i < tickerEls.length; i++) if (tickerNeedsScroll(tickerEls[i])) { anyScroll = true; break; }
        if (!demo.playing || tickerMode() === "disabled" || !anyScroll) { stepTicker(0); return; }
        var now = nowFn();
        var dt = Math.max(0, Math.min(100, now - tickerLastT));
        tickerLastT = now;
        stepTicker(dt);
        tickerRafId = requestAnimationFrame(frame);
      };
      tickerRafId = requestAnimationFrame(frame);
      return true;
    }
    function stopTickerAnim() {
      if (tickerRafId && typeof cancelAnimationFrame === "function") {
        try { cancelAnimationFrame(tickerRafId); } catch (e) { /* bỏ qua */ }
      }
      tickerRafId = 0;
    }
    function syncTickerAnim() {
      var anyScroll = false;
      for (var i = 0; i < tickerEls.length; i++) if (tickerNeedsScroll(tickerEls[i])) { anyScroll = true; break; }
      if (demo.playing && tickerMode() !== "disabled" && anyScroll) startTickerAnim();
      else stopTickerAnim();
    }

    /* Đo đáy lớn nhất của phần tử lá bằng hình học đã vẽ (_absY + height).
       Chỉ tính lá (không con, hoặc .spr/.btn/.txt/.pl-list); bỏ qua lớp
       stretch (relatw=1) và đáy > LH*1.5. Đáy lá được kẹp theo hộp nhóm
       [data-gid] gần nhất: artwork tràn hộp (vd vỏ ngăn kéo cao 133 trong
       hộp 129) bị cửa sổ cắt như Winamp thật, không kéo dài cửa sổ. */
    function measureMaxBottom(rootEl, LH) {
      var maxB = 0;
      /* Đáy tính TƯƠNG ĐỐI theo hộp gốc (trừ rootEl._absY): renderStacked
         truyền plDiv đã đặt _absY = playerH, không trừ thì đáy playlist
         (vd 156+145=301) vượt ngưỡng LH*1.5 và trim tính sai. */
      var baseY = rootEl._absY || 0;
      var all = rootEl.querySelectorAll("*");
      for (var i = 0; i < all.length; i++) {
        var el = all[i];
        var isLeaf = el.children.length === 0
          || (el.classList && (el.classList.contains("spr") || el.classList.contains("btn") || el.classList.contains("txt") || el.classList.contains("pl-list")));
        if (!isLeaf) continue;
        if (el.dataset && el.dataset.stretch === "1") continue;
        var h = parseInt(el.style.height || "0", 10) || 0;
        var b = (el._absY || 0) + h - baseY;
        var anc = el.parentElement;
        while (anc && anc !== rootEl) {
          if (anc.dataset && anc.dataset.gid) {
            var cap = (anc._absY || 0) + (parseInt(anc.style.height || "0", 10) || 0) - baseY;
            if (cap > 0 && b > cap) b = cap;
            break;
          }
          anc = anc.parentElement;
        }
        if (b > maxB && b <= LH * TRIM_IGNORE_ABOVE) maxB = b;
      }
      return maxB;
    }

    /* ---------- media AVS/Video dùng chung (đợt D) ----------
       Thẻ <video> + canvas vis TẠO 1 LẦN rồi DI CHUYỂN giữa hộp nhúng
       (video.group trong AVSGroup) và hộp rời (cửa sổ Video/Vis) — không
       tạo lại khi Detach/Reattach hay re-render (renderLayout xóa
       innerHTML nhưng node JS còn tham chiếu nên chỉ bị gỡ khỏi DOM rồi
       gắn lại, không mất trạng thái). PHÁT THẬT là đợt E: đợt D chỉ tạo
       + đặt đúng vị trí + đổi hộp; chưa gán src, chưa phát. */
    function ensureAvsMedia() {
      if (avsMedia) return avsMedia;
      var wrap = document.createElement("div");
      wrap.dataset.avsMedia = "1";
      wrap.style.position = "absolute";
      wrap.style.overflow = "hidden";
      wrap.style.background = "#000";
      var v = document.createElement("video");
      v.setAttribute("playsinline", "");
      v.preload = "metadata"; /* cần metadata để hiện WxH ở VID_Info */
      v.style.position = "absolute"; v.style.left = "0px"; v.style.top = "0px";
      v.style.objectFit = "contain";
      try {
        /* RAN GIỚI ĐỢT D/ĐỢT E: loadedmetadata chỉ cập nhật chuỗi WxH;
           việc gán src + phát (native/HLS/crossOrigin/EQ) là đợt E. */
        v.addEventListener("loadedmetadata", function () { setVideoInfo(v.videoWidth || 0, v.videoHeight || 0); });
        v.addEventListener("dblclick", function () { requestVideoFullscreen(); });
      } catch (e) { /* jsdom */ }
      var cv = document.createElement("canvas");
      cv.className = "vis";
      cv.dataset.avsCanvas = "1";
      cv.style.position = "absolute"; cv.style.left = "0px"; cv.style.top = "0px";
      wrap.appendChild(v);
      wrap.appendChild(cv);
      avsMedia = { wrap: wrap, video: v, canvas: cv };
      return avsMedia;
    }
    /* Gắn hộp media vào một hộp cha (nhúng hoặc rời) tại rect cho trước;
       hiện video hay canvas theo mode; đăng ký canvas để drawVisStatic vẽ. */
    function attachAvsMedia(parentEl, rect) {
      var m = ensureAvsMedia();
      m.wrap.style.left = rect.x + "px"; m.wrap.style.top = rect.y + "px";
      m.wrap.style.width = rect.w + "px"; m.wrap.style.height = rect.h + "px";
      setAbs(m.wrap, parentEl, rect.x, rect.y);
      m.video.style.width = rect.w + "px"; m.video.style.height = rect.h + "px";
      m.video.style.display = avsState.mode === "video" ? "" : "none";
      m.canvas.width = Math.max(40, rect.w); m.canvas.height = Math.max(20, rect.h);
      m.canvas.style.width = rect.w + "px"; m.canvas.style.height = rect.h + "px";
      m.canvas.style.display = avsState.mode === "vis" ? "" : "none";
      setAbs(m.video, m.wrap, 0, 0);
      setAbs(m.canvas, m.wrap, 0, 0);
      applyVideoScaleToEl();
      parentEl.appendChild(m.wrap);
      /* Đợt K (9.7): canvas AVS giữ nền tối (fillBg: true) như trước; màu cột
         dùng chung visXmlBands (màu XML của <vis> chính). */
      visCanvases.push({ cv: m.canvas, bands: visXmlBands, fillBg: true });
      return m;
    }
    function attachEmbeddedAvsMedia(T) {
      var vg = null;
      try { vg = T.querySelector('[data-gid="video.group"]'); } catch (e) { vg = null; }
      if (!vg) return false;
      var w = parseInt(vg.style.width || "0", 10) || (RES.embeddedAvs && RES.embeddedAvs.videoRect.w) || 346;
      var h = parseInt(vg.style.height || "0", 10) || (RES.embeddedAvs && RES.embeddedAvs.videoRect.h) || 69;
      attachAvsMedia(vg, { x: 0, y: 0, w: w, h: h });
      return true;
    }

    /* ---------- cửa sổ Video/Hiệu ứng RỜI (đợt D) ---------- */
    /* Modern (có model): viền trên + titlebar + nút đóng theo skin
       (wasabi.standard.layout — gồm Wasabi:TitleBar XUI, nút sysmenu và
       nút Close action=CLOSE), rồi khung video.frame.layout /
       vis.frame.layout (lớp viền pl.* + nhóm nút ở đáy y=-22), rồi hộp
       media (6,23,342×150). Nút Close trên titlebar đóng AVS qua
       ctx.windowKind="video"/"vis" (xem renderButton). */
    /* Đợt A (9.9, việc 6) — kích thước cửa sổ Video/Vis rời: mặc định
       DETACHED_WIN_W×DETACHED_WIN_H (354×200 — cửa sổ rời tự vẽ theo
       model, KHÔNG phải layout Video 354×280); kéo đổi thì lưu vào
       winSizes["Video|normal"] / ["AVS|normal"], kẹp theo minimum của
       layout Video/AVS trong XML (min 354×164 với skin 566). Hộp media
       giãn theo: giữ nguyên lề trái/trên/phải/dưới của hình chữ nhật
       mặc định (6/23/6/27), chỉ đổi w/h. */
    function detachedWinSize(kind) {
      /* Đợt D (9.9): đang phóng to thì về cỡ phóng to (960×540), bỏ qua
         size đã kéo tay (khôi phục sẽ về lại size đó). */
      if (avsState.videoMaximized) return { w: VIDEO_MAXIMIZED_W, h: VIDEO_MAXIMIZED_H };
      var key = winSizeKey(kind === "video" ? "Video" : "AVS", "normal"); /* Đợt C: khóa theo đúng chữ XML của entry */
      var layKey = kind === "video" ? "Video" : "AVS";
      var def = { w: DETACHED_WIN_W, h: DETACHED_WIN_H };
      var ov = winSizes[key];
      if (!ov) return def;
      var c = clampWinSize(layKey, "normal", ov.w, ov.h);
      return c || def;
    }
    function detachedMediaRect(sz) {
      var m0 = DETACHED_MEDIA_RECT;
      var insetR = DETACHED_WIN_W - m0.x - m0.w, insetB = DETACHED_WIN_H - m0.y - m0.h;
      return { x: m0.x, y: m0.y, w: Math.max(10, sz.w - m0.x - insetR), h: Math.max(10, sz.h - m0.y - insetB) };
    }
    async function buildDetachedWindowModel(win, kind, sz) {
      sz = sz || { w: DETACHED_WIN_W, h: DETACHED_WIN_H };
      var winCtx = {
        overrides: new Map(), hiddenIds: new Set(), drawerTab: drawerTab,
        titleText: kind === "video" ? "VIDEO" : "VISUALIZATION",
        frameHidden: new Set(), avsOpen: true, avsMode: kind, windowKind: kind
      };
      var frameDiv = document.createElement("div");
      frameDiv.style.position = "absolute"; frameDiv.style.left = "0px"; frameDiv.style.top = "0px";
      frameDiv.style.width = sz.w + "px"; frameDiv.style.height = sz.h + "px";
      frameDiv.style.pointerEvents = "none";
      setAbs(frameDiv, win, 0, 0);
      win.appendChild(frameDiv);
      if (RES.groupdefs["wasabi.standard.layout"]) {
        await renderChildren(RES.groupdefs["wasabi.standard.layout"], frameDiv, sz.w, sz.h, winCtx, 0);
      }
      var innerDiv = document.createElement("div");
      innerDiv.style.position = "absolute"; innerDiv.style.left = "0px"; innerDiv.style.top = "18px";
      innerDiv.style.width = sz.w + "px"; innerDiv.style.height = (sz.h - 18) + "px";
      innerDiv.style.pointerEvents = "none";
      setAbs(innerDiv, win, 0, 18);
      win.appendChild(innerDiv);
      var frameGid = kind === "video" ? "video.frame.layout" : "vis.frame.layout";
      if (RES.groupdefs[frameGid]) {
        await renderChildren(RES.groupdefs[frameGid], innerDiv, sz.w, sz.h - 18, winCtx, 0);
      }
      attachAvsMedia(win, detachedMediaRect(sz));
    }
    /* Classic (không có model): khung HTML dự phòng — titlebar tối +
       nút ✕, hộp media đen, thanh nút HTML (Video: 1x/2x/Fullscreen/
       Reattach + VID_Info; Vis: Prev/Next/Random/Reattach). Nút Reattach
       ở đây không làm gì được (không có vùng nhúng để về) — bấm vẫn gọi
       reattachAvs nhưng nó trả state không đổi, ghi rõ trong code. */
    function buildDetachedWindowFallback(win, kind, sz) {
      sz = sz || { w: DETACHED_WIN_W, h: DETACHED_WIN_H };
      var titleBar = document.createElement("div");
      titleBar.style.position = "absolute"; titleBar.style.left = "0px"; titleBar.style.top = "0px";
      titleBar.style.width = sz.w + "px"; titleBar.style.height = "18px";
      titleBar.style.background = "#1c3d7d"; titleBar.style.color = "#fff";
      titleBar.style.font = "bold 11px Arial, sans-serif"; titleBar.style.lineHeight = "18px";
      titleBar.style.padding = "0 4px"; titleBar.style.boxSizing = "border-box";
      titleBar.style.pointerEvents = "auto";
      titleBar.textContent = kind === "video" ? "VIDEO" : "VISUALIZATION";
      setAbs(titleBar, win, 0, 0);
      win.appendChild(titleBar);
      var x = document.createElement("button");
      x.textContent = "✕";
      x.dataset.avsAction = "close";
      x.title = "Đóng";
      x.style.position = "absolute"; x.style.right = "2px"; x.style.top = "2px";
      x.style.width = "14px"; x.style.height = "14px"; x.style.padding = "0";
      x.style.font = "bold 11px Arial, sans-serif"; x.style.cursor = "pointer";
      x.onclick = function () { closeAvs(); };
      titleBar.appendChild(x);
      attachAvsMedia(win, detachedMediaRect(sz));
      var bar = document.createElement("div");
      bar.style.position = "absolute"; bar.style.left = "5px"; bar.style.top = (sz.h - 22) + "px";
      bar.style.width = (sz.w - 10) + "px"; bar.style.height = "21px";
      bar.style.pointerEvents = "auto";
      setAbs(bar, win, 5, 178);
      win.appendChild(bar);
      function mkBtn(label, action) {
        var b = document.createElement("button");
        b.textContent = label;
        b.dataset.avsAction = action;
        b.style.font = "11px Arial, sans-serif";
        b.style.marginRight = "4px"; b.style.cursor = "pointer";
        b.onclick = function () {
          if (action === "scale1") setVideoScale(1);
          else if (action === "scale2") setVideoScale(2);
          else if (action === "fullscreen") requestVideoFullscreen();
          else if (action === "max") setVideoMaximized(!avsState.videoMaximized); /* Đợt D (9.9): phóng to/khôi phục cửa sổ rời */
          else if (action === "reattach") reattachAvs();
          else if (action === "visprev") cycleVisVariant(-1);
          else if (action === "visnext") cycleVisVariant(1);
          else if (action === "visrandom") {
            avsState.visRandom = !avsState.visRandom;
            b.style.background = avsState.visRandom ? "#2c4a1e" : "";
            b.style.color = avsState.visRandom ? "#fff" : "";
            persistAvs();
          }
        };
        if (action === "visrandom" && avsState.visRandom) { b.style.background = "#2c4a1e"; b.style.color = "#fff"; }
        bar.appendChild(b);
        return b;
      }
      if (kind === "video") {
        mkBtn("1x", "scale1"); mkBtn("2x", "scale2"); mkBtn("Fullscreen", "fullscreen"); mkBtn(avsState.videoMaximized ? "Restore" : "Max", "max"); mkBtn("Reattach", "reattach");
        var info = document.createElement("span");
        info.dataset.vidInfo = "1";
        info.style.font = "11px Arial, sans-serif"; info.style.color = "#ddd";
        info.style.marginLeft = "8px";
        info.textContent = avsState.videoInfo || "";
        bar.appendChild(info);
      } else {
        mkBtn("Prev", "visprev"); mkBtn("Next", "visnext"); mkBtn("Random", "visrandom"); mkBtn(avsState.videoMaximized ? "Restore" : "Max", "max"); mkBtn("Reattach", "reattach");
      }
    }
    /* Gắn 1 cửa sổ rời vào stage tại topY cho trước; trả về chiều cao
       cửa sổ (mặc định 200, đã kéo thì theo size đã kéo). Chỉ có 1 cửa
       sổ rời tại 1 thời điểm — loại theo mode đang hiện (video → cửa sổ
       Video, vis → cửa sổ Vis). */
    async function appendDetachedWindow(T, topY) {
      var kind = avsState.mode;
      var sz = detachedWinSize(kind);
      var win = document.createElement("div");
      win.style.position = "absolute"; win.style.left = "0px"; win.style.top = topY + "px";
      win.style.width = sz.w + "px"; win.style.height = sz.h + "px";
      win.style.pointerEvents = "none";
      win.dataset.avsDetached = "1"; win.dataset.window = kind;
      win._absX = T._absX || 0; win._absY = (T._absY || 0) + topY;
      T.appendChild(win);
      var hasModel = !!(RES.groupdefs && (RES.groupdefs["wasabi.standard.layout"] || RES.groupdefs["video.frame.layout"]));
      if (hasModel) await buildDetachedWindowModel(win, kind, sz);
      else buildDetachedWindowFallback(win, kind, sz);
      /* Đợt A (9.9, việc 6): tay nắm kéo co giãn cửa sổ rời (mép phải /
         đáy / góc). Khóa size theo layout Video/AVS trong XML. */
      attachResizeHandles(win, kind === "video" ? "Video" : "AVS", "normal");
      return sz.h;
    }
    /* Skin Classic: stage chỉ chứa cửa sổ rời (nếu đang mở), không thì
       trống — không có layout main để vẽ. Trả về chiều cao stage. */
    async function renderClassicStage(T) {
      var sz = (avsState.open && avsState.detached) ? detachedWinSize(avsState.mode) : { w: DETACHED_WIN_W, h: 0 };
      T.style.width = sz.w + "px";
      var h = 0;
      if (avsState.open && avsState.detached) h = await appendDetachedWindow(T, 0);
      T.style.height = h + "px";
      drawVisStatic();
      syncAvsAnim(); /* Đợt B (9.9): vòng vis chạy khi AVS mở HOẶC đang phát */
      return h;
    }

    /* Vẽ 1 layout. Trả về chiều cao cuối sau trim (và sau shift nếu có). */
    async function renderLayoutInner(container, layoutId, titleText, opts, stage) {
      opts = opts || {};
      var T = stage || lastStage;
      if (!T) throw new Error("renderLayout: chưa có stage");
      if (!RES) throw new Error("Chưa nạp skin nào.");
      /* Lỗi 6 — render nguyên tử: vẽ vào div tách rời (build) rồi hoán đổi
         vào stage thật khi xong, để stage thật không bao giờ hiện trạng
         thái trung gian (trống / ngăn kéo ở sai vị trí) trong lúc vẽ lại
         bất đồng bộ. Trước đây T.innerHTML="" xóa cửa sổ chính ngay, rồi
         ngăn kéo hiện ở đầu stage (nền + nút trượt đè lên chỗ đồng hồ)
         cho tới khi vẽ xong — trên điện thoại chậm lần mở đầu mất ~1s.
         Không tái hiện trên desktop (200-300ms, quá nhanh để thấy).
         swapIn chuyển con của build sang live (giữ nguyên element nên
         registry timer/ticker/slider vẫn đúng); kích thước copy theo. */
      var live = T;
      var build = document.createElement("div");
      build.style.position = "absolute"; build.style.left = "0px"; build.style.top = "0px";
      build._absX = (T._absX || 0); build._absY = (T._absY || 0);
      T = build;
      lastStage = T;
      /* Đợt A (9.9, việc 2): chụp vị trí cuộn TRƯỚC khi phá DOM (xem
         captureScrollState) — swapIn trả lại sau khi hoán đổi. */
      var prevScroll = captureScrollState();
      function swapIn() {
        live.innerHTML = "";
        live.style.width = build.style.width;
        live.style.height = build.style.height;
        while (build.firstChild) live.appendChild(build.firstChild);
        lastStage = live;
        restoreScrollState(prevScroll);
      }
      visCanvases = []; statusEls = []; tickerEls = []; timerEls = [];
      progressEls = []; volumebarEls = []; infoEls = []; sliderRecords = [];
      animLayerRecs = []; /* Đợt D (9.9): filmstrip AnimatedLayer vẽ lại mỗi lần render */
      channelsRec = null;
      cfgGroups = {}; cfDisplayEls = []; vidInfoEls = [];
      plListDiv = null; plSearchInput = null;
      mlListDiv = null; mlTreeDiv = null; /* Đợt A (9.9, việc 1): ruột ML vẽ lại mỗi lần render */
      T.innerHTML = "";
      /* Đợt C — tìm layout theo resolveLayout (không phân biệt hoa/thường,
         fallback cùng container rồi mới container khác cho main; KHÔNG vẽ
         layout lạ). Không tìm được → skin không hỗ trợ: ném lỗi có mã
         SKIN_UNSUPPORTED để index.html giữ nguyên skin cũ (không phá
         giao diện, không vẽ ngăn kéo trơ trọi trên nền đen như ảnh 13:47).
         Render nguyên tử nên stage thật chưa hề bị chạm tới lúc này. */
      var resolved = resolveLayout(container, layoutId);
      if (!resolved) {
        /* Đợt D — skin Classic không có layout nào: cửa sổ chính không vẽ
           được từ model; stage chỉ chứa cửa sổ rời (nếu đang mở). */
        if (RES.kind === "classic" && lowerStr(container) === "main") {
          lastLayout = null; lastTitle = titleText || "";
          var ch = await renderClassicStage(T);
          swapIn();
          return ch;
        }
        lastStage = live;
        var unsup = new Error("Không tìm được layout '" + layoutId + "' của '" + container + "'. Skin này không có cửa sổ chính dùng được — đã thử layout khác trong cùng container và container khác (không vẽ layout lạ).");
        unsup.code = "SKIN_UNSUPPORTED";
        throw unsup;
      }
      var lay = resolved.entry;
      container = resolved.container; layoutId = resolved.layoutId;
      if (resolved.fallback !== "exact") { try { if (typeof console !== "undefined" && console.info) console.info("[Amp] layout fallback: '" + container + "|" + layoutId + "' (" + resolved.fallback + ") thay cho yêu cầu ban đầu"); } catch (e) { /* bỏ qua */ } }
      var layEl = lay.el;
      /* Đợt C — w/h lấy từ entry của loader (đã gồm default_w/default_h
         của container khi layout thiếu w/h), KHÔNG đọc lại intAttr(w,354)
         từ XML: đọc lại từng làm skin 500×200 vẽ thành 354 (probe S7). */
      var LW = lay.w, LH = lay.h;
      /* Đợt A (9.9, việc 6): kích thước đã kéo (winSizes) ghi đè w/h của
         layout — nội dung co giãn theo vì mọi con dùng relSize/relPos
         theo parentW/parentH. Không có size đã kéo thì đúng w/h XML. */
      var sizeOv = winSizes[lay.container + "|" + lay.layoutId];
      if (sizeOv) {
        var cOv = clampWinSize(container, layoutId, sizeOv.w, sizeOv.h);
        if (cOv) { LW = cOv.w; LH = cOv.h; }
      }
      T.style.width = LW + "px"; T.style.height = LH + "px";
      /* renderStacked truyền playerDiv/plDiv đã đặt _absY (plDiv = playerH):
         GIỮ NGUYÊN offset đó, chỉ mặc định 0 khi vẽ trực tiếp lên stage.
         (Gán 0 ở đây từng xóa offset plDiv khiến mọi _absY của playlist
         trong stacked sai — list y=41 thay vì 197.) */
      if (typeof T._absX !== "number") T._absX = 0;
      if (typeof T._absY !== "number") T._absY = 0;
      lastLayout = lay; lastTitle = titleText || "";
      var ctx = { overrides: new Map(), hiddenIds: new Set(), drawerTab: drawerTab, titleText: titleText || "", frameHidden: new Set(), avsH: lay.snapadjustbottom || VIDEO_SHIFT, windowKind: container === "Pledit" ? "playlist" : container === "MLibrary" ? "medialibrary" : "player",
        /* Đợt C — chống vẽ trùng: _seenGroups ghi (gid, vị trí tuyệt đối,
           cỡ) của mọi <group> đã vẽ trong lần render này (chia sẻ qua
           renderStacked cho cả player/playlist/ML); _skipGroupId để nhánh
           frame XUI bỏ instance nhóm content đã vẽ qua cdiv. */
        _seenGroups: (opts && opts._seenGroups) || new Set(), _skipGroupId: null };
      var kids = elChildren(layEl);
      for (var i = 0; i < kids.length; i++) {
        if (lowerTag(kids[i]) === "hideobject") {
          var parts = (kids[i].getAttribute("target") || "").split(";");
          for (var j = 0; j < parts.length; j++) if (parts[j]) ctx.frameHidden.add(parts[j].toLowerCase());
        }
      }
      /* Đợt B: opts.drawerOpen !== undefined → ngăn kéo LUÔN vẽ (mở hoặc
         đóng); opts.drawer (đợt A, tương thích ngược) = drawerOpen true.
         ctx.drawerOpen để nút mở/đóng trong ngăn kéo chỉ hiện 1 cái. */
      var drawerOpenOpt = opts.drawerOpen;
      if (drawerOpenOpt === undefined && opts.drawer) drawerOpenOpt = true;
      if (drawerOpenOpt !== undefined) ctx.overrides.set("player.normal.drawer", true);
      if (drawerOpenOpt) ctx.overrides.set("player.normal.drawer.shadow", true);
      /* Đợt D — vùng AVS nhúng mở khi (a) opts.videoOpen ép mở 1 lần
         (tương thích đợt A–C, KHÔNG ghi vào avsState — test cũ vẫn dùng
         cờ này), hoặc (b) avsState đang mở và chưa tách rời. Skin không
         có embeddedAvs thì không bao giờ mở nhúng (đi cửa sổ rời).
         ctx.avsMode để renderChildren chỉ vẽ nhóm nút của chế độ hiện;
         override detach/switchto vì 2 nhóm này visible="0" trong XML. */
      ctx.drawerOpen = !!drawerOpenOpt;
      var avsOpenNow = !!RES.embeddedAvs && ((opts.videoOpen === true) || (avsState.open && !avsState.detached));
      ctx.avsOpen = avsOpenNow;
      ctx.avsMode = avsState.mode;
      if (avsOpenNow) {
        ctx.overrides.set("AVSGroup", true);
        if (avsState.mode === "video") {
          ctx.overrides.set("buttons.video.detach", true);
          ctx.overrides.set("buttons.video.switchto", true);
        } else {
          ctx.overrides.set("buttons.vis.detach", true);
          ctx.overrides.set("buttons.vis.switchto", true);
        }
      }
      /* Đợt D (9.9) — Beat Visualization: nhóm beat có visible="0" trong XML
         (MAKI gốc ẩn/hiện theo tùy chọn); Amp hiện nhóm khi tùy chọn
         "Enable Beat Visualization" đang bật (xem setBeatVisOn). NHÓM
         ĐẶT TRÀN: XML đặt nhóm ở display (200,11) với ảnh 167px rộng →
         mép phải 372, tràn 18px khỏi cửa sổ 354 — skin gốc ship như vậy
         nên Winamp thật cũng cắt phần tràn ở mép cửa sổ; stage của Amp
         có overflow:hidden nên cắt y hệt (test drawer-test cho phép
         tràn phải tới 372 của riêng 4 ảnh beat). */
      if (beatVisOn) ctx.overrides.set("player.normal.display.beatvisualization", true);
      await renderChildren(kids, T, LW, LH, ctx, 0, true); /* v9.6 (Điểm 2): cấp layout không gom hideobject — xem renderChildren */
      /* Ngăn kéo + video (đợt B, sửa 9.4):
         - MỞ MỘT BƯỚC: đặt thẳng top cuối = restY + drawerInnerY(open)
           (không rAF hai bước như v8 — kiểu đó kẹt ở vị trí đóng khi frame
           rAF không chạy, xem V8-BUGS Lỗi 2). Đóng = vị trí nghỉ (đỉnh
           ngăn kéo = đỉnh main, chỉ thò 3px dưới đáy main; nút mở lộ qua
           lỗ trong main.png/main2.png). Vị trí đặt thẳng trong lúc vẽ nên
           không có trạng thái trung gian để kẹt.
         - Video mở + ngăn kéo cùng lúc: main lùi 116 trước, rồi tính
           drawerInnerY theo mainH mới (277) — ngăn kéo lùi theo main,
           vẫn chìm 10px (= mainHeight - snap) dưới đáy main.
         - D9: lớp vỏ phải drawer.main.right crop x=50 w=90 nhưng ảnh chỉ
           rộng 70px — spriteDiv chỉ vẽ 20px thật, phần còn lại trong suốt;
           hộp div 90px không vẽ rác nên giữ nguyên, không kẹp/cắt thêm.
           (measureMaxBottom kẹp lá theo hộp [data-gid] nên 4px viền dưới
           của vỏ 133 trong hộp 129 bị cắt như cửa sổ thật.) */
      var shift = 0;
      var mainDiv = null;
      try { mainDiv = T.querySelector('[data-gid="player.main"]'); } catch (e) { mainDiv = null; }
      var videoShifted = false;
      if (avsOpenNow && mainDiv) {
        /* Video/AVS: AVS giữ nguyên vị trí, chỉ đẩy main xuống 116. */
        mainDiv.style.top = (parseInt(mainDiv.style.top || "0", 10) + VIDEO_SHIFT) + "px";
        shiftSubtree(mainDiv, VIDEO_SHIFT);
        videoShifted = true;
      }
      if (drawerOpenOpt !== undefined && mainDiv) {
        var d = null;
        try { d = T.querySelector('[data-gid="player.normal.drawer"]'); } catch (e) { d = null; }
        if (d) {
          var dTop = d._absY || 0;
          var mainB = (mainDiv._absY || 0) + (parseInt(mainDiv.style.height || "0", 10) || 0);
          var mainHeight = parseInt(mainDiv.style.height || "0", 10) || 0;
          var dH = parseInt(d.style.height || "0", 10) || 0;
          var snap = lay.snapadjustbottom || dH;
          var restY = (RES.drawer && RES.drawer.restY) || lay.drawerRestY || 17;
          /* mainB == mainH (đáy main tính từ đỉnh stage 0): 161 khi đóng
             video, 277 khi mở video — dùng luôn làm mainH cho drawerInnerY
             (cùng mainHeight = chiều cao main, 126 với skin 566). */
          var innerY = drawerInnerY(!!drawerOpenOpt, mainB, snap, dH, restY, mainHeight);
          var dy = (restY + innerY) - dTop;
          d.style.top = (parseInt(d.style.top || "0", 10) + dy) + "px";
          shiftSubtree(d, dy);
          var sh = null;
          try { sh = T.querySelector('[data-gid="player.normal.drawer.shadow"]'); } catch (e) { sh = null; }
          if (sh) {
            sh.style.top = (parseInt(sh.style.top || "0", 10) + dy) + "px";
            shiftSubtree(sh, dy);
          }
          /* v9.6 (Điểm 3): shadow (player.normal.drawer.shadow) phải vẽ
             DƯỚI ngăn kéo, không đè lên tab. Sửa v9.4 (isolation để shadow
             đè lên toàn bộ ngăn kéo) đi sai hướng: shadow là dải 15px cuối
             ngăn kéo, tab ở y 108–127 trong ngăn kéo 129px nên shadow
             (y 114–129) chồng 13px dưới của tab + chữ đen trên nền tab
             sáng — ảnh điện thoại 3/11 09:10: tab tối còn ~61–102 thay
             vì ~205, chữ chìm. Không có ảnh Winamp thật nào chứng minh
             shadow phải đè lên tab; configtabs.maki chỉ chứng minh shadow
             hiện cùng ngăn kéo. Đảo thứ tự DOM: shadow trước drawer.
             isolation của drawer vẫn giữ (tab z:2 không thoát ra ngoài,
             vẫn đè nền panel ColorThemes bên trong). */
          if (d && sh && sh.parentElement === d.parentElement) d.parentElement.insertBefore(sh, d);
          /* Đợt G — ghi lại top đóng/mở để tính độ dời animation, và áp
             transform ban đầu của lần trượt mở (pendingDrawerStartDy):
             render đặt thẳng top cuối, transform chỉ làm mượt đường đi. */
          lastDrawerTopCache.open = restY + drawerInnerY(true, mainB, snap, dH, restY, mainHeight);
          lastDrawerTopCache.closed = restY + drawerInnerY(false, mainB, snap, dH, restY, mainHeight);
          if (pendingDrawerStartDy !== null) {
            var pds = pendingDrawerStartDy;
            pendingDrawerStartDy = null;
            /* Chỉ áp transform khi token còn là lần gọi mới nhất: render
               của lần mở cũ đáp xuống sau lần gọi mới hơn thì bỏ transform
               (drawer ở đúng vị trí cuối, không kẹt ở -103px). */
            if (pds.token === drawerAnimToken) {
              setDrawerTransform(d, pds.dy, false);
              setDrawerTransform(sh, pds.dy, false);
            }
          }
          shift = dH || 129;
        }
      } else if (videoShifted) {
        shift = VIDEO_SHIFT;
      }
      var maxB = measureMaxBottom(T, LH);
      var finalH = LH;
      if (shift) finalH = Math.ceil(maxB);
      else if (maxB > 0 && maxB < LH * TRIM_CUT_BELOW) finalH = Math.ceil(maxB);
      T.style.height = finalH + "px";
      /* Đợt D — gắn media AVS vào hộp video.group (nhúng) TRƯỚC khi vẽ vis
         để canvas kịp đăng ký; cửa sổ rời (nếu đang tách) gắn sau main,
         xếp dưới cùng của stage. Cả 2 đều trước drawVisStatic. */
      if (avsOpenNow) attachEmbeddedAvsMedia(T);
      updateStatusEls(); await updateTimerEls(); updateProgress(); updateVolumebar();
      updateChannelsIndicator();
      var totalH = finalH;
      if (avsState.open && avsState.detached && lowerStr(container) === "main" && opts.noDetached !== true) {
        totalH = finalH + await appendDetachedWindow(T, finalH);
        T.style.height = totalH + "px";
      }
      drawVisStatic();
      /* Áp lại preset màu đang chọn (renderLayout xóa innerHTML nên <svg>
         defs + filter trên sprite mất theo; Default thì gỡ hết filter). */
      if (opts.applyTheme !== false) applyColorTheme(T);
      syncAvsAnim(); /* Đợt B (9.9): vòng vis chạy khi AVS mở HOẶC đang phát */
      swapIn();
      /* Đợt A (9.9, việc 6): tay nắm kéo co giãn — gắn SAU swapIn (trên
         div live thật, không phải div build sẽ bị bỏ). Chỉ gắn khi
         layout kéo được (main cố định → không có tay nắm). */
      attachResizeHandles(live, container, layoutId);
      return totalH;
    }

    /* Xếp chồng (viewer): player (+ ngăn kéo) rồi playlist xếp dưới.
       opts.drawerOpen: true = ngăn kéo mở (259), false = đóng (156).
       Đợt D: cửa sổ rời (nếu đang tách) xếp SAU playlist.
       Đợt G — opts.shadeMode: vẽ layout shade 354×25 thay cho main
       (không ngăn kéo, không AVS nhúng); playlist xếp dưới shade như
       xếp dưới main (stage = 25 + 145). */
    async function renderStackedInner(stage, opts) {
      opts = opts || {};
      var T = stage || lastStage;
      if (!T) throw new Error("renderStacked: chưa có stage");
      /* Lỗi 6 — render nguyên tử như renderLayout: vẽ vào div tách rời
         rồi hoán đổi vào stage thật khi xong (xem ghi chú ở renderLayout). */
      var live = T;
      var build = document.createElement("div");
      build.style.position = "absolute"; build.style.left = "0px"; build.style.top = "0px";
      build._absX = (T._absX || 0); build._absY = (T._absY || 0);
      T = build;
      lastStage = T;
      /* Đợt A (9.9, việc 2): giữ vị trí cuộn qua lần vẽ lại toàn bộ
         (xem captureScrollState). */
      var prevScrollStacked = captureScrollState();
      function swapIn() {
        live.innerHTML = "";
        live.style.width = build.style.width;
        live.style.height = build.style.height;
        while (build.firstChild) live.appendChild(build.firstChild);
        lastStage = live;
        restoreScrollState(prevScrollStacked);
      }
      /* Skin Classic không có playlist để xếp: chỉ vẽ cửa sổ rời. */
      if (RES.kind === "classic") {
        T.innerHTML = "";
        T._absX = 0; T._absY = 0;
        var ch2 = await renderClassicStage(T);
        swapIn();
        return ch2;
      }
      /* Đợt A (9.9, việc 1+6): xếp chồng có thể gồm ML (opts.mlOpen) và
         playlist có thể tắt (opts.playlistOpen — mặc định true để các
         lời gọi cũ không đổi). Rộng stage = rộng nhất trong các cửa sổ
         (main theo XML của skin đang nạp — KHÔNG gán cứng 354 của 566 —
         playlist/ML theo XML + size đã kéo).
         Đợt C: cửa sổ phụ THIẾU layout thì BỎ QUA cửa sổ đó (ghi console),
         không vẽ main thay vào (trước đây fallback trần làm main vẽ 2 lần
         theo chiều dọc — triệu chứng 2+4, probe stacked S1/S6), không ném
         lỗi làm mất cả cửa sổ chính. */
      var mainResolvedStacked = resolveLayout("main", opts.shadeMode ? "shade" : "normal");
      var mainWHStacked = mainResolvedStacked ? effectiveLayoutWH(mainResolvedStacked.container, mainResolvedStacked.layoutId) : null;
      var showPl = opts.playlistOpen !== false && !!layoutEntry("Pledit", "normal");
      var showMl = !!opts.mlOpen && hasMediaLibrary();
      if (opts.playlistOpen !== false && !layoutEntry("Pledit", "normal")) {
        try { if (typeof console !== "undefined" && console.info) console.info("[Amp] skin không có layout Pledit|normal — bỏ qua cửa sổ playlist khi xếp chồng."); } catch (e) { /* bỏ qua */ }
      }
      if (opts.mlOpen && !hasMediaLibrary()) {
        try { if (typeof console !== "undefined" && console.info) console.info("[Amp] skin không có layout MLibrary|normal — bỏ qua cửa sổ Media Library khi xếp chồng."); } catch (e) { /* bỏ qua */ }
      }
      var stackedSeen = new Set(); /* Đợt C: chống vẽ trùng xuyên các lượt player/playlist/ML */
      var plWH = showPl ? effectiveLayoutWH("Pledit", "normal") : null;
      var mlWH = showMl ? effectiveLayoutWH("MLibrary", "normal") : null;
      var stageW = mainWHStacked ? mainWHStacked.w : 354;
      if (plWH) stageW = Math.max(stageW, plWH.w);
      if (mlWH) stageW = Math.max(stageW, mlWH.w);
      T.innerHTML = "";
      T.style.width = stageW + "px";
      T._absX = 0; T._absY = 0;
      var playerDiv = document.createElement("div");
      playerDiv.style.position = "absolute"; playerDiv.style.left = "0px"; playerDiv.style.top = "0px";
      playerDiv._absX = 0; playerDiv._absY = 0;
      T.appendChild(playerDiv);
      var shadeMode = !!opts.shadeMode;
      var playerH = await renderLayoutInner("main", shadeMode ? "shade" : "normal", "WINAMP", shadeMode ? { applyTheme: false, noDetached: true, _seenGroups: stackedSeen } : { drawerOpen: opts.drawerOpen !== undefined ? opts.drawerOpen : true, videoOpen: !!opts.videoOpen, applyTheme: false, noDetached: true, _seenGroups: stackedSeen }, playerDiv);
      /* Đợt E — renderLayout reset registry mỗi lần vẽ nên lượt Pledit sẽ
         xóa registry của cửa sổ chính (ticker/timer/status/thanh trượt/
         EQ...). Giữ lại registry của player rồi GỘP với registry của
         playlist để đồng hồ/chữ chạy/thanh trượt vẫn cập nhật khi xếp
         chồng (chế độ phát thường dùng). Không gộp thì timer/ticker đứng
         yên mỗi khi playlist mở. */
      var savedRegs = {
        vis: visCanvases, status: statusEls, ticker: tickerEls, timer: timerEls,
        progress: progressEls, volume: volumebarEls, info: infoEls,
        sliders: sliderRecords, cfg: cfgGroups, cf: cfDisplayEls, vid: vidInfoEls,
        channels: channelsRec, anim: animLayerRecs
      };
      var plH = 0;
      if (showPl) {
        var plDiv = document.createElement("div");
        plDiv.style.position = "absolute"; plDiv.style.left = "0px"; plDiv.style.top = playerH + "px";
        plDiv._absX = 0; plDiv._absY = playerH;
        T.appendChild(plDiv);
        plH = await renderLayoutInner("Pledit", "normal", "PLAYLIST EDITOR", { applyTheme: false, noDetached: true, _seenGroups: stackedSeen }, plDiv);
      }
      /* Chỉ gộp khi CÓ lượt Pledit thật (showPl): lượt đó reset registry
         nên phải cộng dồn. Khi showPl=false thì registry hiện tại VẪN
         là của lượt main (savedRegs trỏ cùng mảng) — gộp sẽ nhân đôi
         mọi registry (timer/ticker/slider chạy 2 lần). */
      if (showPl) {
        visCanvases = savedRegs.vis.concat(visCanvases);
        statusEls = savedRegs.status.concat(statusEls);
        tickerEls = savedRegs.ticker.concat(tickerEls);
        timerEls = savedRegs.timer.concat(timerEls);
        progressEls = savedRegs.progress.concat(progressEls);
        volumebarEls = savedRegs.volume.concat(volumebarEls);
        infoEls = savedRegs.info.concat(infoEls);
        sliderRecords = savedRegs.sliders.concat(sliderRecords);
        var mergedCfg = savedRegs.cfg;
        Object.keys(cfgGroups).forEach(function (k) {
          mergedCfg[k] = (mergedCfg[k] || []).concat(cfgGroups[k]);
        });
        cfgGroups = mergedCfg;
        cfDisplayEls = savedRegs.cf.concat(cfDisplayEls);
        vidInfoEls = savedRegs.vid.concat(vidInfoEls);
        animLayerRecs = savedRegs.anim.concat(animLayerRecs); /* Đợt D (9.9): filmstrip */
        /* Đợt K (9.7): Pledit không có lớp channels nên lượt Pledit đặt
           channelsRec = null; khôi lại của cửa sổ chính (trạng thái đã áp
           trong lượt render main, không cần vẽ lại). */
        if (savedRegs.channels) channelsRec = savedRegs.channels;
      }
      var totalH = playerH + plH;
      /* Đợt A (9.9, việc 1): cửa sổ Media Library xếp dưới playlist (hoặc
         dưới main khi playlist đóng) — vẽ bằng renderLayout("MLibrary")
         để khung + menubar + titlebar lấy đúng từ XML; ruột mô phỏng
         (renderMlContent). Lượt ML reset registry + plListDiv như mọi
         lượt renderLayout nên phải giữ lại trước rồi gộp/khôi sau (cùng
         mẫu với lượt Pledit ở trên) — không thì chọn/phát trong playlist
         hỏng sau khi mở ML. */
      var mlH = 0;
      if (showMl) {
        var savedRegs2 = {
          vis: visCanvases, status: statusEls, ticker: tickerEls, timer: timerEls,
          progress: progressEls, volume: volumebarEls, info: infoEls,
          sliders: sliderRecords, cfg: cfgGroups, cf: cfDisplayEls, vid: vidInfoEls,
          channels: channelsRec, plList: plListDiv, plSearch: plSearchInput, anim: animLayerRecs
        };
        var mlDiv = document.createElement("div");
        mlDiv.style.position = "absolute"; mlDiv.style.left = "0px"; mlDiv.style.top = totalH + "px";
        mlDiv._absX = 0; mlDiv._absY = totalH;
        T.appendChild(mlDiv);
        mlH = await renderLayoutInner("MLibrary", "normal", "MEDIA LIBRARY", { applyTheme: false, noDetached: true, _seenGroups: stackedSeen }, mlDiv);
        visCanvases = savedRegs2.vis.concat(visCanvases);
        statusEls = savedRegs2.status.concat(statusEls);
        tickerEls = savedRegs2.ticker.concat(tickerEls);
        timerEls = savedRegs2.timer.concat(timerEls);
        progressEls = savedRegs2.progress.concat(progressEls);
        volumebarEls = savedRegs2.volume.concat(volumebarEls);
        infoEls = savedRegs2.info.concat(infoEls);
        sliderRecords = savedRegs2.sliders.concat(sliderRecords);
        var mergedCfg2 = savedRegs2.cfg;
        Object.keys(cfgGroups).forEach(function (k) {
          mergedCfg2[k] = (mergedCfg2[k] || []).concat(cfgGroups[k]);
        });
        cfgGroups = mergedCfg2;
        cfDisplayEls = savedRegs2.cf.concat(cfDisplayEls);
        vidInfoEls = savedRegs2.vid.concat(vidInfoEls);
        animLayerRecs = savedRegs2.anim.concat(animLayerRecs); /* Đợt D (9.9): filmstrip */
        if (savedRegs2.channels) channelsRec = savedRegs2.channels;
        if (savedRegs2.plList) { plListDiv = savedRegs2.plList; plSearchInput = savedRegs2.plSearch; }
        totalH += mlH;
      }
      if (avsState.open && avsState.detached) {
        totalH += await appendDetachedWindow(T, totalH);
      }
      T.style.height = totalH + "px";
      lastStage = T;
      drawVisStatic();
      /* Điểm 6 (v9.6): nền stage — lót texture nền của skin đang nạp
         (wasabi.frame.basetexture) sau mọi cửa sổ, để dải trống bên phải
         cửa sổ chính (stage rộng hơn main: playlist 436, main 354) hiện
         nền của skin thay vì đen #000. Lấy từ model (không gán cứng
         màu/số của skin 566); skin nào không có basetexture thì thôi
         (giữ #000 như cũ). Div .spr nên applyColorTheme tô đúng nhóm
         gamma "Backgrounds" theo Color Theme đang chọn; phải chèn
         TRƯỚC applyColorTheme(T). */
      try {
        var bgInfo = await bitmapInfoCached("wasabi.frame.basetexture");
        var bgUrl = bgInfo && bgInfo.file ? await RES.fileURL(bgInfo.file) : null;
        if (bgUrl) {
          var bgDiv = document.createElement("div");
          bgDiv.className = "spr";
          bgDiv.dataset.bitmap = "wasabi.frame.basetexture";
          bgDiv.style.position = "absolute";
          bgDiv.style.left = "0px"; bgDiv.style.top = "0px";
          bgDiv.style.width = T.style.width; bgDiv.style.height = T.style.height;
          bgDiv.style.backgroundImage = 'url("' + bgUrl + '")';
          bgDiv.style.backgroundRepeat = "repeat";
          if (bgInfo.w && bgInfo.h) bgDiv.style.backgroundSize = bgInfo.w + "px " + bgInfo.h + "px";
          T.insertBefore(bgDiv, T.firstChild);
        }
      } catch (e) { /* không có basetexture: giữ nền #000 như cũ */ }
      applyColorTheme(T);
      swapIn();
      return totalH;
    }

    /* Đợt A (9.9, việc 2) — XẾP HÀNG render (chống nhân đôi registry):
       renderStacked/renderLayout là async nhiều lượt, dùng chung registry
       (timer/ticker/slider/progress). Hai lần render chạy ĐỒNG THỜI (vd
       setPlaylistData/setPlaylistItems gọi requestRerender trong lúc
       renderCurrent đang chạy) thì lượt merge của lần cũ gộp nhầm
       registry của lần mới (lượt main của lần mới chạy xen giữa reset và
       merge của lần cũ) → timerEls/SEEK nhân đôi, timer cập nhật 2 lần.
       Xếp hàng: lần render sau chờ lần trước xong mới chạy; lúc chạy thì
       đọc state mới nhất nên luôn vẽ đúng trạng thái hiện tại. Chỉ hàm
       public (export) xếp hàng — các lượt con trong renderStackedInner
       gọi thẳng *Inner để không tự chờ chính mình (deadlock). */
    var renderChain = Promise.resolve();
    function queueTopRender(fn) {
      var p = renderChain.then(fn, fn);
      renderChain = p.catch(function () { /* lần lỗi không chặn hàng sau */ });
      return p;
    }
    async function renderLayout() {
      var args = arguments;
      return queueTopRender(function () { return renderLayoutInner.apply(null, args); });
    }
    async function renderStacked() {
      var args = arguments;
      return queueTopRender(function () { return renderStackedInner.apply(null, args); });
    }

    /* Liệt kê hình học lá đã vẽ (cho composite.py đối chiếu bằng mắt):
       mỗi sprite: vị trí tuyệt đối, kích thước, file ảnh, crop, opacity. */
    async function dumpGeometry(stage) {
      var T = stage || lastStage;
      var out = [];
      if (!T) return out;
      var all = T.querySelectorAll(".spr");
      for (var i = 0; i < all.length; i++) {
        var el = all[i];
        var bg = el.style.backgroundImage || "";
        var m = /url\("?(.*?)"?\)/.exec(bg);
        var bid = (el.dataset && el.dataset.bitmap) || "";
        var info = bid && RES.bitmaps[bid] ? RES.bitmaps[bid] : null;
        out.push({
          bitmap: bid,
          file: info ? info.file : "",
          crop: info && info.crop ? info.crop : null,
          x: el._absX || 0, y: el._absY || 0,
          w: parseInt(el.style.width || "0", 10) || 0,
          h: parseInt(el.style.height || "0", 10) || 0,
          url: m ? m[1] : "",
          bgSize: el.style.backgroundSize || "",
          bgPos: el.style.backgroundPosition || "",
          bgRepeat: el.style.backgroundRepeat || "",
          tile: (el.dataset && el.dataset.tile) === "1",
          opacity: el.style.opacity || ""
        });
      }
      return out;
    }

    function getDrawerTab() { return drawerTab; }
    function setDrawerTab(t) { drawerTab = t; }

    return {
      RENDERER_VERSION: RENDERER_VERSION,
      FONT_ROWS: FONT_ROWS, COLON_COL_BIGNUM: COLON_COL_BIGNUM,
      DEMO_TRACKS: DEMO_TRACKS, demo: demo,
      relPos: relPos, relSize: relSize, intAttr: intAttr,
      isActiveVersion: isActiveVersion, alphaOf: alphaOf,
      fmtTime: fmtTime, rgbVal: rgbVal, fontCharPos: fontCharPos,
      drawerSnap: drawerSnap, drawerInnerY: drawerInnerY,
      drawerSelfCheck: drawerSelfCheck,
      renderLayout: renderLayout, renderStacked: renderStacked,
      resolveLayout: resolveLayout, layoutEntry: layoutEntry,
      renderChildren: renderChildren, renderGroupInstance: renderGroupInstance,
      renderNode: renderNode, spriteDiv: spriteDiv,
      makeBitmapText: makeBitmapText, loadFont: loadFont, glyphURL: glyphURL,
      measureMaxBottom: measureMaxBottom, dumpGeometry: dumpGeometry,
      drawVisStatic: drawVisStatic,
      getDrawerTab: getDrawerTab, setDrawerTab: setDrawerTab,
      getDrawerState: getDrawerState, setDrawerOpen: setDrawerOpen,
      updateInfoEls: updateInfoEls, updateStatusEls: updateStatusEls,
      toggleDrawerAnimated: toggleDrawerAnimated, DRAWER_ANIM_MS: DRAWER_ANIM_MS,
      isShadeMuted: isShadeMuted, toggleShadeMute: toggleShadeMute,
      runDrawerSelfCheck: runDrawerSelfCheck, cfgOn: cfgOn,
      getCfgState: getCfgState, restoreCfgState: restoreCfgState,
      isAvsAnimEnabled: isAvsAnimEnabled, drawerAnimEnabled: drawerAnimEnabled,
      menuGroupVisible: menuGroupVisible, visButtonAction: visButtonAction,
      detachOptionOn: detachOptionOn,
      getVisFrame: getVisFrame, getTickerMode: tickerMode, getTickerState: getTickerState,
      stepTicker: stepTicker, syncTickerAnim: syncTickerAnim,
      getSongInfoState: getSongInfoState, songInfoText: songInfoText,
      runAvsSelfCheck: runAvsSelfCheck, runAudioSelfCheck: runAudioSelfCheck,
      applyColorTheme: applyColorTheme, selectColorTheme: selectColorTheme,
      gammaScale: gammaScale, gammaMatrixValues: gammaMatrixValues,
      applyEqPreset: applyEqPreset, setAllEqBands: setAllEqBands,
      EQ_PRESETS: EQ_PRESETS, EQ_BAND_IDS: EQ_BAND_IDS,
      measureTabWidth: measureTabWidth,
      getAvsState: getAvsState, openAvs: openAvs, closeAvs: closeAvs,
      setAvsMode: setAvsMode, toggleAvsMode: toggleAvsMode,
      detachAvs: detachAvs, reattachAvs: reattachAvs,
      setVideoScale: setVideoScale, requestVideoFullscreen: requestVideoFullscreen,
      /* Đợt D (9.9): VID_TV / VID_MAX / menu Video-Vis / trackinfo-trackmenu /
         Preferences / About / nút shade / beat / PAN / menubar File-Play-Options-Help. */
      toggleVideoWindow: toggleVideoWindow,
      setVideoMaximized: setVideoMaximized, setKeepAspect: setKeepAspect,
      VIDEO_MAXIMIZED_W: VIDEO_MAXIMIZED_W, VIDEO_MAXIMIZED_H: VIDEO_MAXIMIZED_H,
      videoMenuItems: videoMenuItems, visMenuItems: visMenuItems,
      viewMenuItems: viewMenuItems, fileMenuItems: fileMenuItems,
      playMenuItems: playMenuItems, optionsMenuItems: optionsMenuItems,
      helpMenuItems: helpMenuItems, cycleRepeat: cycleRepeat,
      getTrackInfoState: getTrackInfoState, showTrackInfo: showTrackInfo,
      trackMenuItems: trackMenuItems,
      openPreferences: openPreferences, openAbout: openAbout,
      openDrawerTab: openDrawerTab,
      setBeatVisOn: setBeatVisOn, getBeatVisState: getBeatVisState, getBeatFrame: getBeatFrame,
      setBalance: setBalance, getPanState: getPanState,
      setVideoInfo: setVideoInfo, cycleVisVariant: cycleVisVariant,
      setAvsAnalyser: setAvsAnalyser, getAvsAnalyser: getAvsAnalyser,
      getVisXmlBands: function () { return visXmlBands.slice(); },
      restoreAvsState: restoreAvsState, isVideoItem: isVideoItem,
      getAvsMedia: getAvsMedia, resetAvsMedia: resetAvsMedia,
      /* Đợt E — phát tiếng: nối audio.js + điều khiển phát + lưu state. */
      setAudioEngine: setAudioEngine, getAudioEngine: getAudioEngine,
      getEqState: getEqState, getPlaybackState: getPlaybackState,
      restorePlaybackState: restorePlaybackState,
      playCurrentItem: playCurrentItem, nextTrack: nextTrack, prevTrack: prevTrack,
      togglePlay: togglePlay, stopPlayback: stopPlayback,
      onAudioTimeUpdate: onAudioTimeUpdate, onAudioEnded: onAudioEnded,
      onAudioError: onAudioError, onAudioPlayingChange: onAudioPlayingChange,
      setChannelsState: setChannelsState, updateChannelsIndicator: updateChannelsIndicator,
      showTickerError: showTickerError, clearTickerError: clearTickerError,
      getTickerError: getTickerError,
      addLocalFiles: addLocalFiles, openLocalFolderPicker: openLocalFolderPicker,
      DETACHED_WIN_W: DETACHED_WIN_W, DETACHED_WIN_H: DETACHED_WIN_H,
      DETACHED_MEDIA_RECT: DETACHED_MEDIA_RECT, VIS_VARIANTS: VIS_VARIANTS,
      getPlaylistState: getPlaylistState, setPlaylistData: setPlaylistData,
      setPlaylistItems: setPlaylistItems, selectPlaylistItem: selectPlaylistItem,
      playPlaylistItem: playPlaylistItem, removePlaylistItem: removePlaylistItem,
      addPlaylistItem: addPlaylistItem, addUrl: addUrl, isM3UListUrl: isM3UListUrl, sortPlaylistByName: sortPlaylistByName,
      restorePlaylistOrder: restorePlaylistOrder, exportPlaylistM3U: exportPlaylistM3U,
      playlistTotalTime: playlistTotalTime, parseM3U: parseM3U,
      /* Đợt A (9.9): đồng hồ playlist (việc 3), đồng hồ chính (việc 4),
         Media Library (việc 1), resize cửa sổ (việc 6). */
      playlistSelectedTime: playlistSelectedTime, playlistClockText: playlistClockText,
      clearPlaylistSelection: clearPlaylistSelection,
      getTimerMode: getTimerMode, setTimerMode: setTimerMode, toggleTimerMode: toggleTimerMode,
      timerDisplayText: timerDisplayText, currentTrackDuration: currentTrackDuration,
      hasMediaLibrary: hasMediaLibrary, setMlFilter: setMlFilter, getMlState: getMlState,
      refreshMlRows: refreshMlRows,
      getWinSizes: getWinSizes, restoreWinSizes: restoreWinSizes, setWinSize: setWinSize,
      clampWinSize: clampWinSize, isLayoutResizable: isLayoutResizable, layoutMinMax: layoutMinMax,
      effectiveLayoutWH: effectiveLayoutWH, detachedWinSize: detachedWinSize,
      getLastExportedM3U: function () { return lastExportedM3U; },
      get registries() {
        return { visCanvases: visCanvases, statusEls: statusEls, tickerEls: tickerEls, timerEls: timerEls, progressEls: progressEls, volumebarEls: volumebarEls, infoEls: infoEls, sliderRecords: sliderRecords, cfDisplayEls: cfDisplayEls };
      }
    };
  }

  return {
    RENDERER_VERSION: RENDERER_VERSION,
    EXPECTED_RENDERER_VERSION: EXPECTED_RENDERER_VERSION,
    MANIFEST_VERSION: MANIFEST_VERSION,
    MANIFEST_MISMATCH: MANIFEST_MISMATCH,
    FONT_ROWS: FONT_ROWS, COLON_COL_BIGNUM: COLON_COL_BIGNUM,
    MAX_DEPTH: MAX_DEPTH, FRAME_OFFSET_Y: FRAME_OFFSET_Y,
    VIDEO_SHIFT: VIDEO_SHIFT,
    DEMO_TRACKS: DEMO_TRACKS,
    relPos: relPos, relSize: relSize, intAttr: intAttr,
    isActiveVersion: isActiveVersion, alphaOf: alphaOf,
    fmtTime: fmtTime, rgbVal: rgbVal, fontCharPos: fontCharPos,
    stripDiacritics: stripDiacritics,
    drawerSnap: drawerSnap, drawerInnerY: drawerInnerY,
    drawerSelfCheck: drawerSelfCheck,
    gammaScale: gammaScale, gammaMatrixValues: gammaMatrixValues,
    parseM3U: parseM3U, resolveM3UUrl: resolveM3UUrl,
    DETACHED_WIN_W: DETACHED_WIN_W, DETACHED_WIN_H: DETACHED_WIN_H,
    DETACHED_MEDIA_RECT: DETACHED_MEDIA_RECT, VIS_VARIANTS: VIS_VARIANTS,
    createRenderer: createRenderer
  };
});
