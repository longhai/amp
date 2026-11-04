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
   Sort/Help đo từ PNG lúc chạy), danh sách thật từ iptv.m3u (218 mục, 13 nhóm),
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

  var RENDERER_VERSION = "10.24";
  var EXPECTED_RENDERER_VERSION = "10.24";
  /* ĐỢT F — version manifest duy nhất (như skin-loader.js): index.html
     đặt window.AMP_VERSION = "10.0" TRƯỚC khi nạp file này; khác manifest
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
  /* Đợt v10.2 — màu peak từ <vis> colorbandpeak (skin 566: trắng);
     Classic dùng viscolors[23] (xám 150). Trước đây Amp dùng nhầm
     visXmlBands[15] (màu đáy, xanh lá) làm màu peak. */
  var visXmlPeak = "#ffffff";
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
     chỉ giữ nguồn iptv.m3u của mình. DEMO_TRACKS giữ lại dạng rỗng để
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
     parseM3U(text, baseUrl) -> [{name, url, len|null, group, kind, channels}]:
     - Dòng #EXTINF:<giây>,<tên>: tên = sau dấu phẩy ĐẦU TIÊN; link = dòng
       sau (không #). group-title="..." nếu có trong đầu #EXTINF.
     - len: giây khi > 0; -1/không có -> null (kênh trực tiếp, kind "radio").
       KHÔNG bịa thời lượng cho radio.
     - Link tương đối -> tuyệt đối theo URL gốc (baseUrl).
     - v10.5 (theo Webamp): MỌI mục .m3u đều có channels: 2 — y hệt
       Webamp fork (parseM3U luôn gắn metaData cho track, loadMediaFile
       thấy metaData thì SET_MEDIA_TAGS với numberOfChannels: 2 "lie"
       cứng). Đài/bài trong .m3u là URL, không probe được số kênh thật
       bằng music-metadata (fetchFromUrl/parseWebStream không đọc được
       playlist HLS .m3u8), nên Webamp mặc định stereo cho cả danh sách
       và KHÔNG BAO GIỜ sửa lại bằng đo tín hiệu — Đà Nẵng hiện STEREO
       ổn định chính nhờ vậy. Mục local (File/blob) KHÔNG qua đây:
       probeFile đọc tag thật rồi applyMetadataToItem ghi đè channels
       (1 = mono thật). */
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
        items.push({ name: pending.name || url, url: url, len: pending.dur > 0 ? pending.dur : null, group: pending.group, kind: pending.dur > 0 ? "track" : "radio", channels: 2 });
        pending = null;
      } else {
        /* Dòng link không có #EXTINF trước nó: lấy tên từ chính URL. */
        items.push({ name: url, url: url, len: null, group: "", kind: "radio", channels: 2 });
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
      seekFrac: 0, shuffle: false, repeat: 0, eq: true, dur: undefined,
      muted: false /* Đợt 6 (03/11): tắt tiếng bằng phím M — giữ demo.volume + volumebar, engine về 0 (như mute shade) */
    };
    /* v10.7 — chốt Stop (người dùng báo 04/11: bấm ■ thì dừng xong tự
       hát lại): onAudioEnded (hết bài -> tự chuyển bài / lặp 1) chạy
       mỗi khi engine báo "ended", KỂ CẢ khi sự kiện tới muộn sau khi
       người dùng đã bấm Stop (bài hết đúng lúc bấm Stop, hoặc engine
       báo trễ). Cờ này do stopPlayback đặt; chỉ phát tường minh mới
       gỡ (playPlaylistItem / togglePlay). Ended tới sau Stop thì bỏ
       qua, không tự phát bài tiếp. */
    var userStopped = false;
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
    var onOpenSkinPicker = opts.onOpenSkinPicker || null; /* Đợt D: menu File → "Nạp skin .wal/.wsz/.zip…" / Preferences — mở hộp chọn file của trang */
    var onZoom = opts.onZoom || null; /* Đợt D: Preferences → Zoom 1x / Vừa màn hình */
    var isZoomFit = opts.isZoomFit || null; /* Đợt v10.1: nút D clutter Classic cần biết zoom hiện tại */
    var isShadeMode = opts.isShadeMode || null; /* Đợt D: nút shade (shadeeq/shadect) cần biết đang ở shade để về normal trước khi mở ngăn kéo */
    var onMilkdropToggle = opts.onMilkdropToggle || null; /* v10.4: menu Vis/Video → bật/tắt Milkdrop (index.html toggleMilkdrop — cùng đường với mục Milkdrop trong menu View) */
    var isMilkdropOn = opts.isMilkdropOn || null; /* v10.4: tick ✓ mục Milkdrop trong menu Vis/Video */
    /* 04/11 — bỏ nút menu góc dưới-phải: 2 mục còn lại của nó chưa có
       đường vào renderer (Crossfade của index.html, bảng MAKI của
       index.html) nay nối qua opts để menu Options/Help gọi đúng
       handler cũ; không nối thì KHÔNG đưa mục vào (không đưa mục giả). */
    var onCycleCrossfade = opts.onCycleCrossfade || null; /* menu Options → xoay Crossfade 0/1s/2s/4s (index.html cycleCrossfade) */
    var getCrossfadeLabel = opts.getCrossfadeLabel || null; /* nhãn động "Crossfade: 2s" (index.html xfadeLabel) */
    var isCrossfadeOn = opts.isCrossfadeOn || null; /* tick ✓ mục Crossfade */
    var onOpenMakiPanel = opts.onOpenMakiPanel || null; /* menu Help → "Xem script MAKI…" (index.html openMakiPanel) */
    var onMilkdropShownChange = opts.onMilkdropShownChange || null; /* v10.5: canvas Milkdrop đổi hiện/ẩn giữa chừng (video xuất hiện/biến mất) → index.html syncMilkdrop() để đồng bộ lại loop + banner ngay, không đợi lần render sau */
    var skinInfo = opts.skinInfo || null; /* Đợt D: bảng About — tên/tác giả/version skin (index.html đưa SKIN từ loader) */
    var onReloadRadio = opts.onReloadRadio || null;       /* đợt C: nạp lại iptv.m3u */
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
    /* v10.23 (2) — requestRerender(hint): gợi ý cho lần vẽ lại (vd
       resizeEnd thả tay sau khi kéo đổi cỡ -> {animateZoom:true} để
       tỉ lệ Fit trượt mượt về thay vì nhảy tức thì; các lời gọi khác
       không truyền hint -> vẽ như cũ, không đổi hành vi. */
    function requestRerender(hint) { if (onRerender) onRerender(hint); }
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
      var st = { winY: 0, plTop: 0, mlTop: 0, classicTop: 0 };
      try {
        var w = rendererWindow();
        if (w) st.winY = w.scrollY || w.pageYOffset || 0;
        if (!st.winY && document && document.documentElement) st.winY = document.documentElement.scrollTop || 0;
      } catch (e) { /* bỏ qua */ }
      try { if (plListDiv) st.plTop = plListDiv.scrollTop || 0; } catch (e) { /* bỏ qua */ }
      try { if (mlListDiv) st.mlTop = mlListDiv.scrollTop || 0; } catch (e) { /* bỏ qua */ }
      /* v10.19 (1) — Classic: danh sách playlist Classic (classicPlListDiv)
         trước đây KHÔNG được chụp/khôi (chỉ có plListDiv/mlListDiv) nên
         mỗi lần chọn/phát kênh, buildClassicPlRows xóa hết hàng rồi vẽ
         lại làm scrollTop bị kẹp về 0 — danh sách Classic nhảy về đầu. */
      try { if (classicPlListDiv) st.classicTop = classicPlListDiv.scrollTop || 0; } catch (e) { /* bỏ qua */ }
      return st;
    }
    /* v10.19 (1) — LƯỚI AN TOÀN khôi vị trí cuộn sau khi vẽ lại:
       Trên trình duyệt thật, gán scrollTop cho phần tử CHƯA gắn vào
       document (div mới trong build tách rời lúc swapIn) hoặc chưa kịp
       layout sẽ bị kẹp về 0 và mất luôn — đó là đường mà lần khôi đồng
       bộ ở restoreScrollState không bắt được (jsdom không kẹp nên test
       cũ vẫn pass trong khi máy thật nhảy về đầu). Sửa: sau khi gán,
       ĐỌC LẠI ngay — chỗ nào muốn >0 mà vẫn đọc về 0 thì đặt lịch khôi
       lại muộn (pendingScrollRestore) sau 1 frame + tối đa 3 lần thử
       cách 50ms, chỉ khi phần tử đã gắn vào document và vị trí hiện tại
       vẫn là 0 (không đè lần cuộn có chủ đích của người dùng sau đó).
       Nơi cuộn có chủ đích (scrollPlaylistTo, nút cuộn Classic) thì
       hủy pending này. */
    var pendingScrollRestore = null;
    function scheduleScrollRestore(st) {
      if (!st) return;
      pendingScrollRestore = { winY: st.winY || 0, plTop: st.plTop || 0, mlTop: st.mlTop || 0, classicTop: st.classicTop || 0, tries: 0 };
      var apply = function () {
        var want = pendingScrollRestore;
        if (!want) return;
        pendingScrollRestore = null;
        var needRetry = false;
        try {
          if (plListDiv && document && document.contains && !document.contains(plListDiv)) needRetry = true;
          else if (plListDiv && want.plTop > 0 && (plListDiv.scrollTop || 0) === 0) plListDiv.scrollTop = want.plTop;
        } catch (e) { /* bỏ qua */ }
        try {
          if (classicPlListDiv && document && document.contains && !document.contains(classicPlListDiv)) needRetry = true;
          else if (classicPlListDiv && want.classicTop > 0 && (classicPlListDiv.scrollTop || 0) === 0) classicPlListDiv.scrollTop = want.classicTop;
        } catch (e) { /* bỏ qua */ }
        try {
          if (mlListDiv && document && document.contains && !document.contains(mlListDiv)) needRetry = true;
          else if (mlListDiv && want.mlTop > 0 && (mlListDiv.scrollTop || 0) === 0) mlListDiv.scrollTop = want.mlTop;
        } catch (e) { /* bỏ qua */ }
        if (needRetry && want.tries < 3) {
          want.tries++;
          pendingScrollRestore = want;
          try { setTimeout(apply, 50); } catch (e) { /* bỏ qua */ }
        }
      };
      try {
        var w = rendererWindow();
        if (w && w.requestAnimationFrame) w.requestAnimationFrame(function () { try { setTimeout(apply, 0); } catch (e) { /* bỏ qua */ } });
        else setTimeout(apply, 0);
      } catch (e) { try { setTimeout(apply, 0); } catch (e2) { /* bỏ qua */ } }
    }
    function restoreScrollState(st) {
      if (!st) return;
      var lost = false;
      try { if (plListDiv) { plListDiv.scrollTop = st.plTop; if (st.plTop > 0 && (plListDiv.scrollTop || 0) === 0) lost = true; } } catch (e) { /* bỏ qua */ }
      try { if (mlListDiv) { mlListDiv.scrollTop = st.mlTop; if (st.mlTop > 0 && (mlListDiv.scrollTop || 0) === 0) lost = true; } } catch (e) { /* bỏ qua */ }
      try { if (classicPlListDiv) { classicPlListDiv.scrollTop = st.classicTop || 0; if ((st.classicTop || 0) > 0 && (classicPlListDiv.scrollTop || 0) === 0) lost = true; } } catch (e) { /* bỏ qua */ }
      try {
        var w = rendererWindow();
        if (w && w.scrollTo) w.scrollTo(0, st.winY);
        else if (document && document.documentElement) document.documentElement.scrollTop = st.winY;
      } catch (e) { /* jsdom: scrollTo chưa hỗ trợ */ }
      /* Chỉ đặt lịch khôi muộn khi lần khôi đồng bộ vừa mất (đọc lại 0)
         — jsdom gán là dính nên không bao giờ đặt lịch, test cũ không
         bị ảnh hưởng; máy thật mất thì lưới này vớt lại. */
      if (lost) scheduleScrollRestore(st);
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
      /* v10.21 (2) — XML không khai minimum_w/minimum_h thì min mặc định
         = min(cỡ hiện tại, 200×100) thay vì = cỡ hiện tại: min chỉ để
         KẸP cỡ khi kéo (vẫn cho thu nhỏ), không dùng làm cổng tắt tay
         nắm như trước (min=w/h → isLayoutResizable false → skin không
         khai minimum thì mất hẳn chức năng kéo). XML có khai thì dùng
         đúng số XML. */
      return {
        w: lay.w, h: lay.h,
        minW: (lay.minW != null && lay.minW > 0) ? lay.minW : Math.min((lay.w != null && lay.w > 0) ? lay.w : 354, 200),
        minH: (lay.minH != null && lay.minH > 0) ? lay.minH : Math.min((lay.h != null && lay.h > 0) ? lay.h : 280, 100),
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
      /* v10.23 — Playlist Classic: lượng tử hoá theo ĐOẠN của Webamp gốc
         (ResizeTarget.tsx + constants: WINDOW_RESIZE_SEGMENT_WIDTH=25,
         HEIGHT=29; chỉ playlist kéo được, main 275×116 + EQ cố định):
         rộng 275+25*wSeg, cao 116+29*hSeg; min [0,0] = 275×116, không
         max (Webamp gốc chỉ kẹp dưới bằng Math.max(0,...)). */
      if (lowerStr(container) === "classic" && lowerStr(layoutId) === "playlist") {
        var wSeg = Math.max(0, Math.round((w - 275) / 25));
        var hSeg = Math.max(0, Math.round((h - 116) / 29));
        return { w: 275 + wSeg * 25, h: 116 + hSeg * 29 };
      }
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
    /* Kéo mép đổi kích thước (việc 6, đợt v10.0 sửa 15:22 + 15:28;
       v10.20: góc 64x64 + gờ chéo NHÌN THẤY RÕ, mép 32px — xem
       attachResizeHandles):
       3 tay nắm trên cửa sổ kéo được — mép phải, mép đáy, góc dưới-phải.
       - Tay nắm THẤY ĐƯỢC: góc có gờ chéo trắng 0.55 + vạch tối 0.35
         (kiểu grip cổ điển, như grip của chính skin 566), mép trong
         suốt; không còn nền transparent tàng hình (ở fit 0.45x, góc 16px
         cũ chỉ còn ~7px màn hình, ngón tay không chạm trúng — ML/video
         rời tưởng như không kéo được). Cửa sổ chính KHÔNG có tay nắm
         (Winamp thật cố định 354×280).
       - Pointer events khi có (pointerdown/move/up/cancel +
         setPointerCapture trên tay nắm — ngón trượt khỏi tay nắm vẫn
         kéo tiếp); không có thì mousedown/touchstart như cũ (jsdom).
         touch-action:none để trình duyệt không cuộn trang khi kéo.
       - Lúc kéo: cập nhật LIÊN TỤC theo từng pointermove (không
         throttle/debounce), đổi kích thước hộp cửa sổ + xem trước nhẹ
         (phần tử data-stretch + .pl-list/.ml-content/video/canvas co
         giãn theo tỉ lệ) — nội dung vẽ lại đầy đủ 1 lần lúc THẢ.
         Chiều cao stage/wrap tính TUYỆT ĐỐI từ kích thước lúc bắt đầu
         kéo (baseStageH + dh) — bản cũ cộng dồn (curH + dh mỗi lần
         move) nên stage phồng lên rồi nhảy lại lúc thả. v10.20: stage
         bám theo cả 2 chiều (cửa sổ rộng nhất/ở đáy chồng thì stage
         rộng/cao theo cả khi thu nhỏ, không chỉ khi nới).
       - Lúc thả: setWinSize (kẹp min/max + lưu localStorage qua
         onWinSizeChange) rồi requestRerender.
       - Listener document chỉ gắn 1 lần cho cả renderer. */
    var resizeSession = null, resizeDocWired = false;
    function resizeClientPos(e) {
      try {
        if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        if (e.changedTouches && e.changedTouches[0]) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
        return { x: e.clientX || 0, y: e.clientY || 0 };
      } catch (err) { return { x: 0, y: 0 }; }
    }
    /* Co giãn cặp "NNpx MMpx" (backgroundSize/Position) theo tỉ lệ. */
    function scalePxPair(str, fx, fy) {
      var m = /^(-?[\d.]+)px\s+(-?[\d.]+)px$/.exec(String(str || "").trim());
      if (!m) return null;
      return (Math.round(parseFloat(m[1]) * fx * 10) / 10) + "px " + (Math.round(parseFloat(m[2]) * fy * 10) / 10) + "px";
    }
    /* v10.24 — Gop move theo khung hinh (rAF coalescing): khi vuot nhanh,
       pointermove toi 120Hz (2-3 event/khung hinh); xu ly dong bo tung
       event thi main thread phai lam lai toan bo cong viec (doi co khung +
       preview + stage + ve lai live Classic) cho ca nhung vi tri trung
       gian se khong bao gio duoc ve — hang doi event doi dai, khung hien
       vi tri cu, ngon tay di truoc (Hai 05/11: "vuot nhanh no khong theo
       kip"). Nay: moi khung hinh chi ap dung VI TRI MOI NHAT 1 lan.
       - Khong co requestAnimationFrame (jsdom/test — Node khong co rAF
         tran nhu AVS/ticker): dong bo nhu cu, test assert ngay sau
         dispatchEvent van dung.
       - Co rAF (trinh duyet that): luu vi tri moi nhat; neu da co rAF
         cho thi chi cap nhat vi tri (bo event cu); neu chua thi dat rAF
         ap dung vi tri moi nhat 1 lan. resizeEnd xa (flush) vi tri cho
         truoc khi chot co, nen tap/keo ngan van dung. */
    function resizeMove(e) {
      var s = resizeSession;
      if (!s) return;
      /* Chan cuon trang tren touch ngay lap tuc (khong cho rAF). */
      if (e.preventDefault) { try { e.preventDefault(); } catch (err) { /* bỏ qua */ } }
      if (typeof requestAnimationFrame !== "function") {
        applyResizeMove(s, resizeClientPos(e));
        return;
      }
      var p = resizeClientPos(e);
      s.px = p.x; s.py = p.y;
      if (s.rafPending) return;
      s.rafPending = true;
      requestAnimationFrame(function () {
        s.rafPending = false;
        if (resizeSession !== s) return; /* da tha tay/huy: resizeEnd da xa (flush) */
        applyResizeMove(s, { x: s.px, y: s.py });
      });
    }
    /* Than xu ly cua resizeMove: ap dung VI TRI p (da tinh san) vao khung
       + xem truoc + stage + moc ve lai live (Classic). Goi dong bo (khi
       khong co rAF) hoac 1 lan/khung hinh qua rAF voi vi tri moi nhat.
       skipLive=true: bo qua moc ve lai live (chi dung cho flush luc tha
       tay — requestRerender ngay sau do se ve lai day du, tranh 2 lan
       rebuild Classic chong nhau lam do main thread sau khi tha). */
    function applyResizeMove(s, p, skipLive) {
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
        /* Xem trước nhẹ: phần tử co giãn GIỮ NGUYÊN KHOẢNG CÁCH với mép
           cửa sổ (đợt v10.2) — list = kích thước khung mới − offset cố
           định, KHÔNG scale theo tỉ lệ như trước (scale tỉ lệ làm list
           thiếu dần khi kéo dài: kéo ML 349→600 thì list chỉ 299×1.72 =
           514 thay vì 550, để khoảng xanh trống dưới list; kéo nhiều lần
           liên tiếp còn lệch dần). Nền data-stretch vẫn scale tỉ lệ như cũ. */
        var fx = c.w / (s.startW || 1), fy = c.h / (s.startH || 1);
        for (var pi = 0; pi < (s.preview || []).length; pi++) {
          var pv = s.preview[pi];
          /* v10.23 (1) — Chỉ đổi cỡ chiều nào relat chiều đó (stretchW/
             stretchH): phần tử chỉ neo giữ nguyên cỡ, chỉ dời vị trí;
             nhóm nút đáy playlist chỉ giãn rộng, cao giữ 21px. Nền
             backgroundSize/Position co giãn theo đúng chiều giãn. */
          if (pv.stretchW && pv.w) pv.el.style.width = Math.max(0, Math.round(c.w - (pv.offW || 0))) + "px";
          if (pv.stretchH && pv.h) pv.el.style.height = Math.max(0, Math.round(c.h - (pv.offH || 0))) + "px";
          if (pv.stretchW || pv.stretchH) {
            var bfx = pv.stretchW ? fx : 1, bfy = pv.stretchH ? fy : 1;
            var bs = scalePxPair(pv.bgSize, bfx, bfy);
            if (bs) pv.el.style.backgroundSize = bs;
            var bp = scalePxPair(pv.bgPos, bfx, bfy);
            if (bp) pv.el.style.backgroundPosition = bp;
          }
          /* v10.23 (1) — Phần tử neo mép phải/đáy: dời left/top để giữ
             nguyên khoảng cách tới mép phải/dưới của nhóm cha. Rộng/cao
             cha lấy từ style hiện tại (cha co giãn đã cập nhật trước vì
             duyệt theo thứ tự tài liệu; cha không đổi thì giữ nguyên vị
             trí). Nhờ vậy hàng nút đáy playlist + nút titlebar + khung
             frame đi theo khung mới, không ở lại vị trí cũ gây vệt. */
          if (pv.anchorR !== null || pv.anchorB !== null) {
            var _par = pv.el.parentElement;
            var _pW = c.w, _pH = c.h;
            if (_par) {
              var _pw = parseInt(_par.style.width || "", 10);
              if (!isNaN(_pw)) _pW = _pw; else if (pv.pW0) _pW = pv.pW0;
              var _ph = parseInt(_par.style.height || "", 10);
              if (!isNaN(_ph)) _pH = _ph; else if (pv.pH0) _pH = pv.pH0;
            }
            if (pv.anchorR !== null) pv.el.style.left = Math.round(_pW - pv.anchorR) + "px";
            if (pv.anchorB !== null) pv.el.style.top = Math.round(_pH - pv.anchorB) + "px";
          }
        }
        /* v10.20 (1) — stage bám theo CẢ 2 CHIỀU (trước đây chỉ nới khi
           to ra: kéo thu nhỏ thì cửa sổ thu nhưng stage giữ cỡ cũ, thả
           ra mới nhảy lại — trên điện thoại trông như kéo không ăn):
           cửa sổ đang kéo mà rộng nhất thì stage rộng theo nó, mà ở đáy
           chồng thì stage cao theo nó (cả to lẫn nhỏ); cửa sổ không rộng
           nhất mà kéo vượt stage thì vẫn nới stage như cũ. */
        var stageEl = s.live;
        if (stageEl && stageEl.id !== "stage") stageEl = stageEl.parentElement;
        if (stageEl && stageEl !== s.live) {
          var curW = parseInt(stageEl.style.width || "0", 10) || 0;
          if (s.trackW) stageEl.style.width = Math.max(1, c.w) + "px";
          else if (c.w > curW) stageEl.style.width = c.w + "px";
          var dh = c.h - s.startH;
          if (s.trackH) {
            var newStageH = (s.baseStageH || 0) + dh;
            if (newStageH > 0) {
              stageEl.style.height = newStageH + "px";
              var wrap = stageEl.parentElement;
              if (wrap && wrap.id === "stage-wrap" && s.baseWrapH) wrap.style.height = Math.max(1, (s.baseWrapH || 0) + dh) + "px";
            }
          } else if (dh > 0) {
            if (s.baseStageH) stageEl.style.height = (s.baseStageH + dh) + "px";
            var wrap2 = stageEl.parentElement;
            if (wrap2 && wrap2.id === "stage-wrap" && s.baseWrapH) wrap2.style.height = (s.baseWrapH + dh) + "px";
          }
          /* v10.23 (1) — nền texture của stage (wasabi.frame.basetexture,
             lót sau mọi cửa sổ) giãn theo stage để dải trống bên phải
             cửa sổ chính không hiện đen khi kéo rộng stage. */
          try {
            var _bgKids = stageEl.children || [];
            for (var _bi = 0; _bi < _bgKids.length; _bi++) {
              if (_bgKids[_bi].dataset && _bgKids[_bi].dataset.bitmap === "wasabi.frame.basetexture") {
                if (stageEl.style.width) _bgKids[_bi].style.width = stageEl.style.width;
                if (stageEl.style.height) _bgKids[_bi].style.height = stageEl.style.height;
                break;
              }
            }
          } catch (e22c) { /* bỏ qua */ }
        }
      } catch (err) { /* bỏ qua */ }
      /* v10.23 — Móc vẽ lại live cho cửa sổ có nội dung rời rạc theo đoạn
         (playlist Classic: nền lát tile theo đoạn 25×29, xem trước nhẹ
         bằng stretch/anchor không đủ — tile phải thêm/bớt ô, nút phải
         dời theo cỡ mới). Callback tự bỏ qua khi cỡ lượng tử hoá không
         đổi, nên chỉ chạy mỗi lần qua mốc đoạn. */
      if (!skipLive && s.onLiveSize) { try { s.onLiveSize(s.w, s.h); } catch (eL) { /* bỏ qua */ } }
      /* preventDefault da lam o resizeMove (dong bo, khong cho rAF). */
    }
    /* v10.19 (2), v10.20 (1) — CHẠM XUYÊN TAY NẮM (tap-through): tay nắm
       nay to hơn (v10.20: 32px mép / 64px góc) nên đè lên hàng nút ở đáy
       cửa sổ (Add/Rem/Sel/Misc/List) và mép phải của hàng kênh. Bấm (thả
       chuyển < 6px màn hình) thì KHÔNG phải kéo: hoàn lại kích thước xem
       trước về như cũ, không lưu, và "chạm xuyên" — gửi 1 sự kiện click
       tổng hợp tới phần tử đang nằm dưới ngón tay (ẩn tay nắm rồi dùng
       elementFromPoint), để nút/hàng kênh dưới tay nắm vẫn bấm được như
       thường. Kéo thật (>= 6px) thì lưu size + vẽ lại như cũ. */
    function resizeTapThrough(s, x, y) {
      if (!s || !s.hd) return;
      var el = null;
      try {
        var prevVis = s.hd.style.visibility;
        s.hd.style.visibility = "hidden";
        if (document && document.elementFromPoint) el = document.elementFromPoint(x, y);
        s.hd.style.visibility = prevVis;
      } catch (e) { /* bỏ qua */ }
      if (!el || el === s.hd) return;
      try {
        var ev = null;
        if (document && document.createEvent) {
          ev = document.createEvent("MouseEvents");
          if (ev.initMouseEvent) ev.initMouseEvent("click", true, true, rendererWindow(), 1, x, y, x, y, false, false, false, false, 0, null);
          else if (ev.initEvent) ev.initEvent("click", true, true);
        }
        if (ev && el.dispatchEvent) el.dispatchEvent(ev);
      } catch (e) { /* bỏ qua */ }
    }
    function resizeEnd(e) {
      var s = resizeSession;
      if (s && s.rafPending && s.px !== undefined && s.py !== undefined) {
        /* v10.24 — tha tay truoc khi rAF kip chay: ap dung ngay vi tri
           moi nhat da luu (khong de co chot bi cu); rAF da dat se tu bo
           qua vi resizeSession da null o duoi. Chi cap nhat co (skipLive)
           — requestRerender ngay sau do se ve lai day du, tranh 2 lan
           rebuild Classic chong nhau. */
        s.rafPending = false;
        try { applyResizeMove(s, { x: s.px, y: s.py }, true); } catch (err) { /* bỏ qua */ }
      }
      resizeSession = null;
      if (!s) return;
      var cancelled = !!(e && e.type === "pointercancel");
      var p = null, moved = 0;
      try { if (e) p = resizeClientPos(e); } catch (err) { p = null; }
      if (p) moved = Math.abs(p.x - s.startX) + Math.abs(p.y - s.startY);
      if (!cancelled && p && moved < 6) {
        /* Bấm, không phải kéo: hoàn lại xem trước (live + phần tử co
           giãn + chiều cao stage/wrap đã nới) rồi chạm xuyên xuống nút
           /hàng kênh bên dưới. Không lưu size, không vẽ lại. */
        try {
          s.live.style.width = s.startW + "px";
          s.live.style.height = s.startH + "px";
          for (var pi = 0; pi < (s.preview || []).length; pi++) {
            var pv = s.preview[pi];
            if (pv.stretchW && pv.w) pv.el.style.width = Math.max(0, Math.round(s.startW - (pv.offW || 0))) + "px";
            if (pv.stretchH && pv.h) pv.el.style.height = Math.max(0, Math.round(s.startH - (pv.offH || 0))) + "px";
            if (pv.stretchW || pv.stretchH) { pv.el.style.backgroundSize = pv.bgSize || ""; pv.el.style.backgroundPosition = pv.bgPos || ""; }
            /* v10.23 (1): hoàn cả vị trí neo mép phải/đáy về như cũ. */
            if (pv.anchorR !== null) pv.el.style.left = (pv.left0 || 0) + "px";
            if (pv.anchorB !== null) pv.el.style.top = (pv.top0 || 0) + "px";
          }
          var stageEl = s.live;
          if (stageEl && stageEl.id !== "stage") stageEl = stageEl.parentElement;
          if (stageEl) {
            if (s.baseStageH) stageEl.style.height = s.baseStageH + "px";
            /* v10.20 (1): bấm (không kéo) thì hoàn cả rộng stage khi
               lần kéo đã nới/thu stage theo (trackW) — không thì stage
               ở lại cỡ xem trước. */
            if (stageEl !== s.live && s.trackW && s.stageW0) stageEl.style.width = s.stageW0 + "px";
            var wrap = stageEl.parentElement;
            if (wrap && wrap.id === "stage-wrap" && s.baseWrapH) wrap.style.height = s.baseWrapH + "px";
          }
        } catch (err) { /* bỏ qua */ }
        resizeTapThrough(s, p.x, p.y);
        return;
      }
      if (s.w !== s.startW || s.h !== s.startH) {
        setWinSize(s.container, s.layoutId, s.w, s.h);
        /* v10.23 (2) — Thả tay sau khi kéo: vẽ lại + tỉ lệ Fit trượt
           mượt về (animateZoom) thay vì nhảy tức thì như v10.21 — lúc
           kéo tỉ lệ Fit bị đóng băng (khung theo đúng ngón tay), thả ra
           tính lại Fit theo cỡ mới nên tỉ lệ đổi; trượt 150ms ease-out
           cho cảm giác như Winamp thật, không nhảy. */
        requestRerender({ animateZoom: true });
      }
    }
    function wireResizeDocOnce() {
      if (resizeDocWired) return;
      resizeDocWired = true;
      try {
        if (typeof window !== "undefined" && window.PointerEvent) {
          document.addEventListener("pointermove", resizeMove);
          document.addEventListener("pointerup", resizeEnd);
          document.addEventListener("pointercancel", resizeEnd);
        } else {
          document.addEventListener("mousemove", resizeMove);
          document.addEventListener("mouseup", resizeEnd);
          document.addEventListener("touchmove", resizeMove, { passive: false });
          document.addEventListener("touchend", resizeEnd);
        }
      } catch (err) { /* môi trường test không có document đầy đủ */ }
    }
    function attachResizeHandles(live, container, layoutId, opts) {
      if (!live) return;
      opts = opts || {};
      /* v10.21 (2) — Tay nắm gắn cho MỌI cửa sổ co giãn được (Pledit/
         MLibrary/Video/AVS), kể cả skin không khai minimum trong XML.
         Bỏ cổng isLayoutResizable (minW<w) làm điều kiện gắn: min/max
         XML (nếu có) chỉ kẹp cỡ khi kéo (layoutMinMax mặc định 200×100
         khi XML không khai). Riêng cửa sổ chính KHÔNG có tay nắm (cố
         định theo XML, như Winamp thật). */
      if (lowerStr(container) === "main") return;
      wireResizeDocOnce();
      var edges = [
        /* v10.21 (1+2) — Tay nắm XML-DRIVEN (Hải 19:59-20:05, test v10.20):
           (a) 566 vốn đã kéo được, nhưng gờ v10.20 (64×64, vạch 0.55)
           TO ĐÙNG + TRÀN KHUNG, che nút Manage Playlist → nay gờ góc
           lấy theo XML của skin: skin có <layer resize="bottomright"
           image="player.pl.resizer"> (566: resizer.png 17×17) thì ảnh
           đó đã vẽ sẵn trong cửa sổ, tay nắm trong suốt, không vẽ thêm;
           skin không có ảnh gờ thì chỉ vẽ miếng nhỏ 24×24 ở góc.
           Vùng chạm góc 48×48 (trong suốt) cho ngón tay, mép 32px.
           (b) Đổi skin khác (.wal) thì MẤT tay nắm vì cổng
           isLayoutResizable chặn khi XML không khai minimum → nay bỏ
           cổng (chỉ cửa sổ chính vẫn không tay nắm, cố định theo XML);
           min/max XML chỉ kẹp cỡ khi kéo (layoutMinMax mặc định
           200×100 khi không khai). Bấm (<6px) vẫn xuyên qua tay nắm
           nhờ resizeTapThrough ở resizeEnd. */
        { edge: "right", cursor: "ew-resize", css: { right: "0px", top: "0px", width: "32px", height: "100%" } },
        { edge: "bottom", cursor: "ns-resize", css: { left: "0px", bottom: "0px", width: "100%", height: "32px" } },
        { edge: "corner", cursor: "nwse-resize", css: { right: "0px", bottom: "0px", width: "48px", height: "48px" } }
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
          hd.style.background = "transparent"; /* v10.8 (108): vô hình như Webamp — xem ghi chú ở bảng edges trên */
          hd.style.boxShadow = "none"; /* v10.8 (108): bỏ viền inset 1px (cùng vạch trắng, tay kéo hiện rõ trên mép) */
          hd.style.touchAction = "none";
          /* v10.21 (1) — GỜ GÓC XML-DRIVEN (Hải 20:04 "Nút kéo có trong
             xml không" — CÓ: 566 khai <layer resize="bottomright"
             image="player.pl.resizer" .../> + ảnh resizer.png 17×17):
             skin có ảnh gờ riêng đã vẽ sẵn trong cửa sổ (sprite
             data-bitmap chứa "resizer") thì tay nắm TRONG SUỐT hẳn —
             ảnh của chính skin là gờ, không vẽ thêm gì (không tràn
             khung, không che nút). Skin không có ảnh gờ thì vẽ 1 miếng
             NHỎ 24×24 ở góc (vạch chéo 0.45 + 0.30, gọn trong khung);
             vùng chạm vẫn 48×48 (trong suốt) để ngón tay nắm được.
             v10.23 — opts.transparentCorner: skin Classic luôn có gờ
             chéo của chính skin ở góc đáy-phải pledit.bmp (đã kiểm bằng
             mắt: cả base-2.91 lẫn Winamp5 Classified đều vẽ sẵn vạch
             chéo ở góc đó) nên tay nắm trong suốt hẳn, không vẽ thêm. */
          if (spec.edge === "corner") {
            var hasSkinGrip = !!opts.transparentCorner;
            try {
              var sprs = live.querySelectorAll("[data-bitmap]");
              for (var si = 0; si < sprs.length; si++) {
                if (/resizer/i.test(sprs[si].getAttribute("data-bitmap") || "")) { hasSkinGrip = true; break; }
              }
            } catch (e2) { hasSkinGrip = false; }
            if (hasSkinGrip) {
              hd.style.backgroundImage = "";
              hd.style.backgroundSize = "";
              hd.style.backgroundPosition = "";
              hd.style.backgroundRepeat = "";
            } else {
              hd.style.backgroundImage = "repeating-linear-gradient(135deg, rgba(255,255,255,0.45) 0px, rgba(255,255,255,0.45) 1px, rgba(0,0,0,0.30) 1px, rgba(0,0,0,0.30) 2px, transparent 2px, transparent 6px)";
              hd.style.backgroundSize = "24px 24px";
              hd.style.backgroundPosition = "right bottom";
              hd.style.backgroundRepeat = "no-repeat";
            }
          }
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
            /* Đợt v10.0 (15:22): kích thước stage/wrap lúc bắt đầu kéo
               (để resizeMove tính tuyệt đối, không cộng dồn) + snapshot
               phần tử xem trước nhẹ. */
            var stageEl0 = live;
            if (stageEl0 && stageEl0.id !== "stage") stageEl0 = stageEl0.parentElement;
            var baseStageH = stageEl0 ? (parseInt(stageEl0.style.height || "0", 10) || 0) : 0;
            var wrap0 = stageEl0 ? stageEl0.parentElement : null;
            var baseWrapH = (wrap0 && wrap0.id === "stage-wrap") ? (parseInt(wrap0.style.height || "0", 10) || 0) : 0;
            /* v10.20 (1) — cửa sổ đang kéo có phải cửa sổ RỘNG NHẤT /
               Ở ĐÁY chồng không (để resizeMove cho stage bám theo cả
               2 chiều, kéo thu nhỏ stage cũng thu theo, không kẹt cỡ
               cũ): rộng nhất = rộng bằng stage lúc bắt đầu kéo; ở đáy
               = đáy cửa sổ chạm đáy stage. Cửa sổ đơn (live là stage)
               thì không cần bám (chính nó là stage). */
            var stageW0 = stageEl0 ? (parseInt(stageEl0.style.width || "0", 10) || 0) : 0;
            var liveTop0 = parseInt(live.style.top || "0", 10) || 0;
            var trackW = !!stageEl0 && stageEl0 !== live && stageW0 > 0 && startW >= stageW0;
            var trackH = !!stageEl0 && stageEl0 !== live && baseStageH > 0 && (liveTop0 + startH) >= (baseStageH - 1);
            var preview = [];
            try {
              var nodes = live.querySelectorAll('[data-stretch="1"], [data-anchor-r], [data-anchor-b], .pl-list, .ml-content, .ml-list, .ml-tree, video, canvas');
              for (var ni = 0; ni < nodes.length; ni++) {
                var nd = nodes[ni];
                var w0 = parseInt(nd.style.width || "0", 10) || 0, h0 = parseInt(nd.style.height || "0", 10) || 0;
                /* Đợt v10.2 — lưu KHOẢNG CÁCH tới mép cửa sổ (offset) thay
                   vì chỉ lưu kích thước: lúc kéo, list = kích thước khung
                   mới − offset cố định (playlist −65, ML −50 theo XML),
                   không scale theo tỉ lệ. .ml-list/.ml-tree cũng snapshot
                   riêng để có chiều cao px tường minh trong lúc kéo. */
                /* v10.23 (1) — phần tử neo mép phải/đáy (data-anchor-r/b,
                   ghi lúc vẽ = khoảng cách từ mép trái/trên tới mép
                   phải/dưới của nhóm cha): lưu left/top gốc để hoàn lại
                   khi bấm (không kéo), và offset neo để resizeMove dời
                   theo rộng/cao mới của nhóm cha (cha đã cập nhật trước
                   vì querySelectorAll trả theo thứ tự tài liệu). */
                var _aR = null, _aB = null;
                try {
                  if (nd.dataset) {
                    if (nd.dataset.anchorR !== undefined && nd.dataset.anchorR !== "") _aR = parseInt(nd.dataset.anchorR, 10);
                    if (nd.dataset.anchorB !== undefined && nd.dataset.anchorB !== "") _aB = parseInt(nd.dataset.anchorB, 10);
                  }
                } catch (e22a) { _aR = null; _aB = null; }
                /* Rộng/cao nhóm cha lúc bắt đầu kéo (dự phòng khi cha
                   không có style.width/height tường minh: lúc đó neo
                   giữ nguyên vị trí, không dời theo cửa sổ). */
                var _pW0 = startW, _pH0 = startH;
                try {
                  var _par0 = nd.parentElement;
                  if (_par0) {
                    var _pw0 = parseInt(_par0.style.width || "", 10);
                    if (!isNaN(_pw0)) _pW0 = _pw0;
                    var _ph0 = parseInt(_par0.style.height || "", 10);
                    if (!isNaN(_ph0)) _pH0 = _ph0;
                  }
                } catch (e22b) { /* giữ mặc định */ }
                /* v10.23 (1) — Co giãn THEO CHIỀU: phần tử chỉ giãn
                   chiều nào relat chiều đó (data-stretch-w/h ghi lúc
                   vẽ). List/media (.pl-list, video, canvas) giãn cả 2
                   chiều như cũ. Tương thích ngược: data-stretch cũ (chỉ
                   layer/rect relatw) thì hiểu là giãn rộng. Nhờ vậy
                   phần tử chỉ neo (vd nút Manage Playlist) giữ nguyên
                   cỡ, chỉ dời vị trí; nhóm nút đáy playlist chỉ giãn
                   rộng, không bị kéo cao theo cửa sổ. */
                var _sw22 = false, _sh22 = false;
                try {
                  if (nd.dataset) {
                    if (nd.dataset.stretchW === "1") _sw22 = true;
                    if (nd.dataset.stretchH === "1") _sh22 = true;
                    if (!_sw22 && !_sh22 && nd.dataset.stretch === "1") _sw22 = true;
                  }
                } catch (e22d) { /* giữ false */ }
                var _tag22 = (nd.tagName || "").toUpperCase();
                var _isLM22 = _tag22 === "VIDEO" || _tag22 === "CANVAS" || (nd.classList && (nd.classList.contains("pl-list") || nd.classList.contains("ml-content") || nd.classList.contains("ml-list") || nd.classList.contains("ml-tree")));
                if (_isLM22) { _sw22 = true; _sh22 = true; }
                preview.push({ el: nd, w: w0, h: h0, offW: startW - w0, offH: startH - h0, bgSize: nd.style.backgroundSize || "", bgPos: nd.style.backgroundPosition || "", stretch: (_sw22 || _sh22), stretchW: _sw22, stretchH: _sh22, anchorR: (_aR === null || isNaN(_aR)) ? null : _aR, anchorB: (_aB === null || isNaN(_aB)) ? null : _aB, left0: parseInt(nd.style.left || "0", 10) || 0, top0: parseInt(nd.style.top || "0", 10) || 0, pW0: _pW0, pH0: _pH0 });
              }
            } catch (err2) { preview = []; }
            resizeSession = {
              live: live, container: container, layoutId: layoutId, edge: spec.edge,
              hd: hd, /* v10.19 (2): giữ tay nắm để tap-through ẩn nó lúc elementFromPoint */
              startX: p.x, startY: p.y, startW: startW, startH: startH,
              px: p.x, py: p.y, rafPending: false, /* v10.24: vi tri moi nhat + co rAF cho (gop move) */
              scaleX: scaleX || 1, scaleY: scaleY || 1, w: startW, h: startH,
              baseStageH: baseStageH, baseWrapH: baseWrapH, preview: preview,
              stageW0: stageW0, trackW: trackW, trackH: trackH, /* v10.20 (1): stage bám 2 chiều */
              onLiveSize: opts.onLiveSize || null /* v10.23: móc vẽ lại live (playlist Classic) */
            };
            if (e.preventDefault) { try { e.preventDefault(); } catch (err) { /* bỏ qua */ } }
            if (e.stopPropagation) { try { e.stopPropagation(); } catch (err) { /* bỏ qua */ } }
            /* Đợt v10.0 (15:22): giữ con trỏ trên tay nắm suốt lần kéo. */
            if (e.pointerId !== undefined && hd.setPointerCapture) {
              try { hd.setPointerCapture(e.pointerId); } catch (err) { /* bỏ qua */ }
            }
          }
          if (typeof window !== "undefined" && window.PointerEvent) {
            hd.addEventListener("pointerdown", start);
          } else {
            hd.addEventListener("mousedown", start);
            hd.addEventListener("touchstart", start, { passive: false });
          }
          live.appendChild(hd);
        })(edges[i]);
      }
    }
    function setDrawerOpen(open) {
      drawerState.open = !!open;
      requestRerender();
    }
    function getDrawerState() { return drawerState; }

    /* v10.5 — CHẠM XUYÊN NGĂN KÉO (người dùng báo 03/11 03:40 trên điện
       thoại thật: ngăn kéo EQ đang ẩn dưới cửa sổ chính mà vuốt trên mặt
       cửa sổ chính lại chỉnh EQ bên dưới):
       NGUYÊN NHÂN GỐC: khi đóng, đỉnh ngăn kéo = đỉnh cửa sổ chính
       (drawerInnerY đóng = vị trí nghỉ) nên 11 thanh trượt EQ + Balance
       + các nút EQ nằm gọn TRONG vùng mặt cửa sổ chính (vd slider eq5 ở
       x≈223–236, y≈51–131 trong khi main 35–161); mà mặt cửa sổ chính
       LÀ LỖ chạm: mọi div group đều inline pointer-events:none (dòng
       ~4136), ảnh .spr / chữ .txt / ticker / vis đều pointer-events:none
       theo CSS index.html, chỉ .btn là auto — nên chạm trên mặt main
       (chỗ không có nút) rơi xuyên xuống slider EQ (inline
       pointer-events:auto, dòng ~5140) đang nằm dưới, rồi listener
       touchmove/mousemove ở cấp document kéo EQ theo. Ngăn kéo đóng
       nhưng KHÔNG hề bị tắt chạm hay ẩn khỏi hit-test.
       SỬA: setDrawerInteractive(d, enabled) — tắt/bật chạm của MỌI
       control trong ngăn kéo theo trạng thái mở/đóng (gọi ở
       renderLayoutInner sau khi đặt vị trí ngăn kéo + ở
       toggleDrawerAnimated lúc bắt đầu trượt đóng / trượt mở xong).
       Ngoại lệ duy nhất khi đóng: nút drawer.button.open (lộ qua lỗ
       trong main.png + dải nghỉ 3px dưới đáy main) vẫn phải bấm được.
       Đặt pointer-events:none trên chính từng control (không đặt trên
       div ngăn kéo): pointer-events:none của tổ tiên KHÔNG chặn được
       con đã tự đặt auto — đó đúng là lỗ hổng cũ. */
    var DRAWER_HIT_SELECTOR = "[data-slider], .btn, [data-tab], [data-options-bucket], [data-bucket-entry], [data-options-target], [data-colorthemes-list], [data-preset-idx]";
    function setDrawerInteractive(d, enabled) {
      if (!d) return;
      var els = null;
      try { els = d.querySelectorAll(DRAWER_HIT_SELECTOR); } catch (e) { els = null; }
      if (!els) return;
      for (var i = 0; i < els.length; i++) {
        var el = els[i];
        if (!enabled && el.dataset && el.dataset.buttonId === "drawer.button.open") continue;
        el.style.pointerEvents = enabled ? "auto" : "none";
      }
    }

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
        /* v10.5 — đồng bộ lại chạm ngăn kéo theo trạng thái (phòng
           trường hợp transform dở dang làm lệch). */
        setDrawerInteractive(els.d, drawerState.open);
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
            /* v10.5 — trượt mở xong mới bật chạm: lúc render mở, ngăn
               kéo vẫn chìm sau cửa sổ chính nên renderLayoutInner đã
               giữ tắt (openingAnim); tới đây ngăn kéo đã lộ hẳn. */
            setDrawerInteractive(e3.d, true);
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
      /* v10.5 — chạm xuyên ngăn kéo: tắt chạm mọi control trong ngăn kéo
         NGAY khi bắt đầu trượt đóng (như đã ẩn tab ở trên) — trong 250ms
         trượt lên, slider EQ vẫn còn nằm dưới mặt cửa sổ chính; re-render
         sau khi đóng xong tắt lại lần nữa qua renderLayoutInner. */
      setDrawerInteractive(els.d, false);
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
      /* Đợt 6: M (demo.muted) cũng tắt tiếng ở engine như mute shade —
         2 công tắc độc lập, bật cái nào thì engine cũng 0, tắt cả 2 mới
         nghe lại (kéo slider volume lúc đang mute chỉ đổi demo.volume). */
      try { audioEngine.setVolume((isShadeMuted() || demo.muted) ? 0 : demo.volume); } catch (e) { /* bỏ qua */ }
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
       MAKI gốc chỉ hiện khi cửa sổ kéo đủ rộng (easter egg: "stretch the
       main window until the Beat Analyzer appears"). Amp giữ 1 cờ duy nhất
       theo tùy chọn "Enable Beat Visualization" (mặc định theo CFG_DEFAULTS:
       bật); xem setBeatVisOn / renderLayoutInner (override hiện nhóm).
       Đợt v10.0 (việc 2): override chỉ có tác dụng khi nhóm VỪA TRỌN trong
       layout (kiểm vừa trong renderGroupInstance) — cửa sổ mặc định 354
       thì nhóm (mép phải 372) không hiện, không còn dải sọc tràn đè nút
       Repeat; kéo rộng cửa sổ thì nhóm hiện theo đúng XML. */
    var beatVisOn = false;
    var avsMedia = null; /* {wrap, video, canvas} — tạo 1 lần, DI CHUYỂN giữa hộp nhúng/rời (không tạo lại để khỏi mất trạng thái phát) */
    /* Đợt v10.2 — fallback vis ở chế độ video: thẻ <video> đã biết chắc có
       hình chưa? null = chưa biết (đang nạp / chưa có metadata), true =
       videoWidth > 0, false = đã có metadata mà videoWidth == 0 (luồng
       chỉ có tiếng / kênh chết hình). Dùng cho applyAvsMediaVisibility. */
    var avsVideoHasPic = null;
    var avsVideoEverHadPic = false; /* v10.3 — luồng đã từng báo videoWidth > 0 (có hình thật); loadstart về "chưa biết" nhưng vẫn coi là có hình, khỏi nhá tên lúc video đang nạp lại */
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
        hasEmbedded: !!RES.embeddedAvs, fullscreenAttempted: avsFullscreenAttempted,
        visTypeDisplay: visTypeDisplay, visTypeAvs: visTypeAvs /* Đợt 4: kiểu vis (bar/osc/none) */
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
    /* v10.5 — bật/tắt "Màu hiệu ứng ngẫu nhiên" (trước đây chỉ menu Vis
       gán thẳng avsState.visRandom; nay menu View của skin cũng cần nên
       tách thành hàm + export, để 2 menu cùng 1 đường). */
    function setVisRandom(on) {
      avsState.visRandom = !!on;
      persistAvs();
      return avsState.visRandom;
    }
    /* Đợt 4 (03/11) — KIỂU VIS (khác "variant" đổi màu ở trên):
       Webamp có 3 kiểu vis xoay bằng cách bấm vào vis: BAR (cột spectrum)
       → OSCILLOSCOPE (sóng) → NONE (tắt) → BAR… Amp v10.0 mới chỉ vẽ cột
       nên thiếu sóng. Mỗi vùng bấm đổi kiểu RIÊNG như Webamp: vis trong
       display (16 cột) dùng visTypeDisplay, vis trong vùng AVS (75 cột)
       dùng visTypeAvs. Vạch vis giống Webamp giữ nguyên; chỉ thêm sóng +
       đổi kiểu. Lưu cùng state AVS (localStorage "amp9-avs-v9") để lần
       nạp trang sau giữ kiểu đã chọn. */
    var VIS_TYPES = ["bar", "osc", "none"];
    var visTypeDisplay = "bar", visTypeAvs = "bar";
    function validVisType(t) { return VIS_TYPES.indexOf(t) >= 0 ? t : "bar"; }
    function cycleVisType(which) {
      if (which === "avs") visTypeAvs = VIS_TYPES[(VIS_TYPES.indexOf(visTypeAvs) + 1) % VIS_TYPES.length];
      else visTypeDisplay = VIS_TYPES[(VIS_TYPES.indexOf(visTypeDisplay) + 1) % VIS_TYPES.length];
      drawVisStatic();
      persistAvs();
      return getVisTypes();
    }
    function setVisType(which, type) {
      type = validVisType(type);
      if (which === "avs") visTypeAvs = type; else visTypeDisplay = type;
      drawVisStatic();
      persistAvs();
      return getVisTypes();
    }
    function getVisTypes() { return { display: visTypeDisplay, avs: visTypeAvs }; }
    function setAvsAnalyser(node) { avsAnalyser = node || null; resetAvsVisState(); return !!avsAnalyser; } /* Đợt v10.0 (việc AVS-vis): đổi analyser thì reset state falloff/peak AVS */
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
      /* Đợt 4: khôi phục kiểu vis (bar/osc/none) từng vùng. */
      if (typeof saved.visTypeDisplay === "string") visTypeDisplay = validVisType(saved.visTypeDisplay);
      if (typeof saved.visTypeAvs === "string") visTypeAvs = validVisType(saved.visTypeAvs);
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
      return { wrap: m.wrap, video: m.video, canvas: m.canvas, nameEl: m.nameEl };
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
      avsVideoHasPic = null; /* Đợt v10.2 — the moi thi chua biet co hinh khong */
      avsVideoEverHadPic = false; /* v10.3 — thẻ mới thì quên luôn "đã từng có hình" */
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
        muted: !!demo.muted, /* Đợt 6: M — khôi phục trạng thái tắt tiếng */
        eqOn: drawerState.eqOn, eqBands: Object.assign({}, drawerState.eqBands),
        balance: drawerState.balance /* Đợt D (9.9): PAN — khôi phục vị trí Balance */
      };
    }
    /* Khôi phục state phát đã lưu (index.html gọi sau khi nạp iptv.m3u,
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
      /* Đợt 6: khôi phục trạng thái tắt tiếng (M) đã lưu. */
      if (typeof saved.muted === "boolean") {
        demo.muted = saved.muted;
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
      if (!it.url) ensureLocalUrl(it); /* v10.3: muc local mat url -> tao lai tu File goc */
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
      userStopped = false; /* bam Play/Pause/Space/X = y muon phat/tam dung tuong minh -> go chot Stop */
      if (audioEngine) {
        var r = audioEngine.togglePlay();
        /* v10.3 (H2): resume() cua engine chi doi trang thai phat, khong
           dong bo ticker — goi lai setTickerText ngay sau khi resume. */
        if (r && r.ok) { for (var ti4 = 0; ti4 < tickerEls.length; ti4++) setTickerText(tickerEls[ti4]); return true; }
        if (r && r.reason === "nothing") return playCurrentItem();
        return true;
      }
      return playCurrentItem();
    }
    function stopPlayback() {
      if (audioEngine) audioEngine.stop();
      playlistState.playing = false; demo.playing = false;
      userStopped = true; /* v10.7: chot Stop — ended toi muon cung khong duoc tu phat lai (xem onAudioEnded) */
      demo.t = 0; demo.seekFrac = 0; demo.dur = undefined; /* Đợt A (9.9, việc 4): dừng thì quên thời lượng bài cũ */
      updateStatusEls(); updateTimerEls(); updateProgress(); refreshPlaylistRows();
      updateInfoEls(); /* v10.7 (107): dừng thì PLTime Modern cũng về 0:00 (đang ở chế độ elapsed mà không vẽ lại thì kẹt số cũ); Classic đã về qua refreshPlaylistRows */
      persistPlayback();
      updateMediaSession(); /* Đợt 6: dừng thì màn hình khóa về "paused", giữ metadata bài */
      return true;
    }

    /* ================= ĐỢT 6 (03/11) — Media Session API + hotkeys =========
       Lấy từ Webamp fork (packages/webamp/js/mediaSession.ts + hotkeys.ts),
       GỠ KHỎI Redux middleware của fork rồi nối vào renderer Amp (không bê
       nguyên middleware): fork dispatch action qua Redux, Amp gọi thẳng
       togglePlay/nextTrack/prevTrack/seekBy đã có. Không có build step,
       chỉ dùng API chuẩn trình duyệt (navigator.mediaSession).
       - Media Session: metadata bài đang phát (nối metadata đợt 5 khi có
         tag, không có thì tên file/nhóm như cũ) + handlers play/pause/
         previoustrack/nexttrack/seekbackward/seekforward. Trên điện thoại:
         nút tai nghe + màn hình khóa/thanh thông báo điều khiển được —
         jsdom KHÔNG đo được phần này, chờ test máy thật.
       - Hotkeys: mở rộng ngoài Space (xem HOTKEYS dưới). Bỏ qua khi focus
         trong ô nhập (INPUT/TEXTAREA/SELECT/contentEditable) và khi bấm
         kèm Ctrl/Alt/Meta (không đụng phím tắt trình duyệt).
       - Không có navigator.mediaSession (jsdom/trình duyệt cũ) thì mọi
         hàm media session trả false, không ném lỗi, không ảnh hưởng phát.
       - Amp KHÔNG có ảnh bìa (metadata.js không đọc picture — xem ghi chú
         metadata.js:187) nên artwork luôn [] như fork khi không có
         albumArtUrl; không bịa URL bìa. */
    var mediaSessionBound = false; /* đã đăng ký action handlers 1 lần chưa */
    var lastMediaMeta = null; /* {title, artist, album} đã đẩy lên mediaSession gần nhất (test/debug) */
    function getMediaSession() {
      /* Test tiêm qua opts.mediaSession (kể cả null = ép "không hỗ trợ");
         chạy thật đọc navigator.mediaSession của trình duyệt. */
      if (opts.mediaSession !== undefined) return opts.mediaSession;
      try {
        var nav = null;
        if (typeof window !== "undefined" && window.navigator) nav = window.navigator;
        else if (typeof navigator !== "undefined") nav = navigator;
        else if (typeof globalThis !== "undefined" && globalThis.navigator) nav = globalThis.navigator;
        if (nav && nav.mediaSession) return nav.mediaSession;
      } catch (e) { /* bỏ qua */ }
      return null;
    }
    function getMediaMetadataCtor() {
      if (opts.MediaMetadata) return opts.MediaMetadata;
      try { if (typeof MediaMetadata !== "undefined" && MediaMetadata) return MediaMetadata; } catch (e) { /* bỏ qua */ }
      try { if (typeof window !== "undefined" && window.MediaMetadata) return window.MediaMetadata; } catch (e) { /* bỏ qua */ }
      try { if (typeof globalThis !== "undefined" && globalThis.MediaMetadata) return globalThis.MediaMetadata; } catch (e) { /* bỏ qua */ }
      return null;
    }
    /* Metadata bài đang phát cho màn hình khóa: title = tag title (đợt 5)
       else tên file; track: artist/album từ tag (trống thì "" — KHÔNG gửi
       "Không rõ" lên màn hình khóa); đài: artist = tên nhóm (vd "Radio"),
       album = "". Không có mục nào thì null. */
    function currentMediaMeta() {
      var it = playlistState.items[playlistState.current];
      if (!it) return null;
      var title = metadataDisplayName(it) || it.name || "";
      var artist = "", album = "";
      if (it.kind === "track") {
        artist = (it.artist || "").replace(/^\s+|\s+$/g, "");
        album = (it.album || "").replace(/^\s+|\s+$/g, "");
      } else {
        artist = (it.group || "").replace(/^\s+|\s+$/g, "");
      }
      return { title: title, artist: artist, album: album };
    }
    function updateMediaSession() {
      var ms = getMediaSession();
      if (!ms) return false;
      var meta = currentMediaMeta();
      try {
        if (meta) {
          var Ctor = getMediaMetadataCtor();
          var data = {
            title: meta.title || undefined,
            artist: meta.artist || undefined,
            album: meta.album || undefined,
            artwork: [] /* Amp chưa có ảnh bìa — xem ghi chú đầu mục */
          };
          ms.metadata = Ctor ? new Ctor(data) : data;
          lastMediaMeta = { title: meta.title, artist: meta.artist, album: meta.album };
        }
        /* playbackState: trình duyệt dùng để vẽ nút play/pause trên màn
           hình khóa/thanh thông báo. */
        try { ms.playbackState = demo.playing ? "playing" : "paused"; } catch (e) { /* trình duyệt cũ */ }
      } catch (e) { return false; }
      if (!mediaSessionBound) {
        mediaSessionBound = true;
        /* Tua Media Session ±10s như fork (seekBackward/seekForward 10);
           phím mũi tên trong Amp là ±5s (xem handleHotkey). */
        var handlers = {
          play: function () { if (!demo.playing) togglePlay(); },
          pause: function () { if (demo.playing) togglePlay(); },
          previoustrack: function () { prevTrack(); },
          nexttrack: function () { nextTrack(demo.repeat === 1 || demo.shuffle); },
          seekbackward: function () { seekBy(-10); },
          seekforward: function () { seekBy(10); }
        };
        var actions = ["play", "pause", "previoustrack", "nexttrack", "seekbackward", "seekforward"];
        for (var i = 0; i < actions.length; i++) {
          (function (action) {
            try { ms.setActionHandler(action, handlers[action]); } catch (e) { /* trình duyệt không hỗ trợ action này */ }
          })(actions[i]);
        }
      }
      return true;
    }
    function getMediaSessionState() {
      var ms = getMediaSession();
      return {
        supported: !!ms, bound: mediaSessionBound,
        metadata: lastMediaMeta ? { title: lastMediaMeta.title, artist: lastMediaMeta.artist, album: lastMediaMeta.album } : null,
        playbackState: (ms && ms.playbackState) || null
      };
    }
    /* Tua ±giây (hotkeys ±5, Media Session ±10): đài live không tua được
       (engine.seekTo kiểm seekable, trả false) thì im lặng, không báo lỗi. */
    function seekBy(sec) {
      if (!audioEngine) return false;
      var t = 0;
      try { t = audioEngine.getCurrentTime ? audioEngine.getCurrentTime() : 0; } catch (e) { return false; }
      t = t + sec;
      if (t < 0) t = 0;
      try { return !!audioEngine.seekTo(t); } catch (e) { return false; }
    }
    /* Âm lượng ±bước (phím ↑/↓, bước 0.05 như fork adjustVolume(1/-1)
       trên thang 0..1): đổi demo.volume + volumebar + slider VOLUME đang
       hiển thị; đang mute (M hoặc shade) thì engine vẫn 0 như kéo slider
       lúc mute (xem applyEngineVolume). Trả volume mới. */
    function adjustVolume(delta) {
      /* Làm tròn 2 chữ số: 0.95-0.05 ra 0.8999999999999999 nếu không làm tròn. */
      demo.volume = Math.round(Math.max(0, Math.min(1, demo.volume + delta)) * 100) / 100;
      updateVolumebar();
      for (var i = 0; i < sliderRecords.length; i++) {
        var rec = sliderRecords[i];
        if (rec && rec.action === "VOLUME" && typeof rec.setFrac === "function") {
          try { rec.setFrac(demo.volume, true); } catch (e) { /* bỏ qua */ }
        }
      }
      applyEngineVolume();
      persistPlayback();
      return demo.volume;
    }
    function setMuted(on) {
      demo.muted = !!on;
      applyEngineVolume();
      persistPlayback();
      return demo.muted;
    }
    function isMuted() { return !!demo.muted; }
    function toggleMute() { return setMuted(!demo.muted); }
    /* Đợt 6: tách từ code inline trong playMenuItems (đợt D) để phím S
       dùng chung — đảo shuffle + đồng bộ LED ";Shuffle" trong skin + lưu. */
    function toggleShuffle() {
      demo.shuffle = !demo.shuffle;
      var keys = Object.keys(cfgGroups);
      for (var i = 0; i < keys.length; i++) {
        if (/;Shuffle$/.test(keys[i])) { cfgState.set(keys[i], demo.shuffle ? "on" : "off"); refreshCfgGroup(keys[i]); }
      }
      persistPlayback();
      return demo.shuffle;
    }
    /* Bảng phím tắt đợt 6 (đối chiếu hotkeys.ts của fork, chỉ lấy phím hợp
       Amp — xem README đợt 6):
       Space phát/tạm dừng (giữ từ đợt E) · ←/→ tua ±5s · ↑/↓ âm lượng
       · N / ] bài sau · P / [ bài trước · M tắt tiếng · L lặp lại
       · S ngẫu nhiên · X phát · C tạm dừng · V dừng.
       Fork còn có: B bài sau / Z bài trước (giữ tương thích), Ctrl+D
       double-size / Ctrl+R đảo playlist / Alt+W/E/G đổi cửa sổ — KHÔNG
       lấy (Ctrl/Alt là phím tắt trình duyệt, Amp không có double-size).
       Trả true = đã xử lý (index.html không cần preventDefault thêm —
       hàm tự gọi khi có), false = không phải phím Amp (để trình duyệt xử lý). */
    var HOTKEY_KEYCODES = { 32: " ", 37: "ArrowLeft", 38: "ArrowUp", 39: "ArrowRight", 40: "ArrowDown", 78: "n", 80: "p", 77: "m", 76: "l", 83: "s", 88: "x", 67: "c", 86: "v", 66: "b", 90: "z", 219: "[", 221: "]" };
    function handleHotkey(e) {
      if (!e) return false;
      if (e.ctrlKey || e.metaKey || e.altKey) return false; /* không đụng phím tắt trình duyệt */
      var t = e.target;
      var tag = (t && t.tagName) ? String(t.tagName).toUpperCase() : "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return false; /* không chặn gõ chữ */
      if (t && t.isContentEditable) return false;
      var key = (typeof e.key === "string" && e.key) ? e.key : null;
      if (!key && typeof e.code === "string" && e.code) key = e.code;
      if (!key && typeof e.keyCode === "number") key = HOTKEY_KEYCODES[e.keyCode] || null;
      if (!key) return false;
      var wrapNext = (demo.repeat === 1 || demo.shuffle);
      var handled = true;
      if (key === " " || key === "Space" || key === "Spacebar") togglePlay();
      else if (key === "ArrowLeft") seekBy(-5);
      else if (key === "ArrowRight") seekBy(5);
      else if (key === "ArrowUp") adjustVolume(0.05);
      else if (key === "ArrowDown") adjustVolume(-0.05);
      else if (key === "n" || key === "N" || key === "]" || key === "b" || key === "B") nextTrack(wrapNext);
      else if (key === "p" || key === "P" || key === "[" || key === "z" || key === "Z") prevTrack();
      else if (key === "m" || key === "M") toggleMute();
      else if (key === "l" || key === "L") cycleRepeat();
      else if (key === "s" || key === "S") toggleShuffle();
      else if (key === "x" || key === "X") { if (!demo.playing) togglePlay(); }
      else if (key === "c" || key === "C") { if (demo.playing) togglePlay(); }
      else if (key === "v" || key === "V") stopPlayback();
      else handled = false;
      if (handled && e.preventDefault) {
        try { e.preventDefault(); } catch (err) { /* bỏ qua */ }
      }
      return handled;
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
      refreshPlaylistClockTick(); /* v10.7 (107): playlist toàn live thì đồng hồ đếm theo nhạc */
    }
    function onAudioEnded() {
      /* v10.7: người dùng đã bấm Stop thì "ended" tới muộn (bài hết
         đúng lúc bấm Stop / engine báo trễ) KHÔNG được tự phát bài
         tiếp hay lặp 1 — Stop phải dính. Chỉ phát tường minh
         (playPlaylistItem / togglePlay) mới gỡ chốt này. */
      if (userStopped) return;
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
    /* Đợt v10.2 — fallback CORS khi bật EQ (audio.js onEqFallback):
       đài không có CORS nên nạp qua AudioContext lỗi; engine đã tự tắt
       EQ + nạp lại native, tiếng vẫn phát — chỉ báo rõ lý do trên dòng
       chữ chạy và đồng bộ nút EQ về off (đừng để LED EQ vẫn sáng trong
       khi engine đang phát native). Không báo "kênh lỗi" vì kênh vẫn phát. */
    function onAudioEqFallback(info) {
      drawerState.eqOn = false; demo.eq = false;
      try { cfgState.set("EQ_TOGGLE", "off"); refreshCfgGroup("EQ_TOGGLE"); } catch (e) { /* bỏ qua */ }
      showTickerError("Kenh nay khong qua EQ duoc (CORS) - dang phat truc tiep");
      persistPlayback();
      updateInfoEls();
      updateChannelsIndicator(); /* native: không đo được -> stereo tạm */
      requestRerender();
    }
    function onAudioError(info) {
      var it = (info && info.item) || playlistState.items[playlistState.current];
      var name = it ? it.name : "";
      /* Kênh lỗi hẳn (đã thử lại 2 lần sau 3s trong engine, v10.3): báo chữ đỏ không
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
      updateMediaSession(); /* Đợt 6: phát/dừng thì màn hình khóa đổi nút play/pause */
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
      /* v10.3 (H2): duong resume / doi trang thai phat khong bao gio dong
         bo lai ticker (truoc day chi clearTickerError + syncTickerAnim)
         -> goi lai setTickerText cho dung muc dang phat. */
      for (var ti3 = 0; ti3 < tickerEls.length; ti3++) setTickerText(tickerEls[ti3]);
      syncAvsName();
    }
    /* Đợt K (9.7, điểm 7a) — chỉ báo kênh mono/stereo/surround.
       XML: layer "channels" (songinfo (0,10), ảnh mặc định player.songinfo.none
       — trong suốt) + 4 bitmap trạng thái player.songinfo.<none|stereo|mono|
       surround>; MAKI songinfo.maki đổi image theo trạng thái phát. Amp không
       chạy MAKI nên tự đổi ảnh bằng setChannelsState.
       - Đổi ảnh bằng cách thay hậu tố sau dấu "." cuối của baseImage (lấy từ
         XML, không gán cứng); bitmap không có trong model (skin khác thiếu
         trạng thái) thì giữ nguyên, không ném lỗi.
       - "none" khi dừng (đúng mặc định XML). Khi phát: dùng số kênh của
         MỤC ĐANG PHÁT (itemChannels — numberOfChannels/channels); chưa
         biết thì hiện "stereo" TẠM — xem updateChannelsIndicator. */
    async function setChannelsState(state) {
      /* Đợt v10.2 (18:30) — KHÔNG bao giờ hiện "none" (trống) khi đang
         phát: "none" chỉ đúng khi dừng. Trước đây chỉ báo có thể về trống
         giữa chừng (render lại / chưa biết số kênh) trong khi tiếng vẫn hát
         — người dùng tưởng mất cả stereo lẫn mono. Đang phát mà chưa biết
         số kênh thì giữ "stereo" tạm theo quy ước v9.7. */
      if (state === "none" && demo.playing) state = "stereo";
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
      if (!demo.playing) { setChannelsState("none"); refreshClassicMain(); return; }
      /* v10.5 — THEO WEBAMP, KHONG DO TIN HIEU (xem applyWebampChannels):
         Webamp fork KHONG co ChannelSplitter/analyser do kenh — chi bao
         chi doc track.channels (selectors.ts getChannels -> MonoStereo
         hien stereo khi channels === 2, mono khi === 1). So kenh nay
         den tu metadata cua track: file local = numberOfChannels that
         tu music-metadata (probeFile -> item.channels); muc .m3u / URL
         = 2 mac dinh (Webamp "lie" cung trong loadMediaFile khi track
         co metaData — parseM3U cua fork luon gan metaData). Vi vay chi
         bao la thuoc tinh cua DINH DANG LUONG, khong phu thuoc noi dung
         dang phat: dai stereo dang phat doan giong noi o giua (L≈R) van
         hien STEREO — dung nhu Webamp, dung nhu ffprobe.
         - 1 kenh = mono (file local mono that, tag 1 kenh).
         - >= 2 kenh = stereo. - Chua biet (vd file local blob: chua
         probe xong) = "stereo" TAM theo quy uoc v9.7, KHONG BAO GIO
         hien mono khi chua biet so kenh; probe ve sau thi
         applyMetadataToItem goi lai ham nay de doi ve mono that neu co.
         - Doi bai/doi dai: so kenh doc tu MUC MOI nen khong giu mono
         cua dai truoc; re-render (renderLayoutInner) goi lai ham nay
         nen trang thai dung giu qua mo/dong PL/ML/ngan keo.
         Chuan kiem: Da Nang = STEREO on dinh; VOV1 = STEREO (HE-AAC v2
         parametric stereo — giai ma ra stereo; ca 2 ben deu hien vay). */
      var cur = playlistState.items[playlistState.current];
      var known = itemChannels(cur);
      if (known === 1) { setChannelsState("mono"); refreshClassicMain(); return; }
      if (known >= 2) { setChannelsState("stereo"); refreshClassicMain(); return; }
      /* Chưa biết số kênh: hiện "stereo" tạm (quy ước v9.7 — nhạc/radio
         gần như luôn stereo; Webamp cũng hiện stereo cho mọi kênh .m3u
         vì mặc định 2). Không đo tín hiệu để sửa lại nữa: đo L/R không
         phân biệt được "stereo đang phát đoạn gần mono" với "mono thật"
         — đó chính là lỗi MONO sai ở v10.4 (ảnh thật 04/11 03:11). */
      setChannelsState("stereo");
      refreshClassicMain(); /* Đợt v10.1: Classic — mono/stereo */
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
    /* v10.3 — NAP NHAC LOCAL LUOI (hieu nang; "cho load ma may lag luon"):
       NGUYEN NHAN CU: addLocalFiles goi probeLocalDuration + probeFile
       NGAY cho moi file, dong loat 105 file: 105 the <audio> preload cung
       luc + 105 lan parseBlob doc TOAN BO file (metadata.js) + moi tag ve
       la refreshPlaylistRows/refreshMlRows ve lai TOAN BO list (146 hang
       x 105 lan) — tat ca tren luong UI, khong nhuong luong lan nao nen
       may giat/do trong luc cho load, cot Nghe si lau moi hien.
       SUALAI:
       - List hien NGAY: addLocalFiles chi them muc (ten file + "Khong
         ro" tam) + requestRerender 1 lan, roi tra ngay; tag/duration
         chay SAU, theo hang doi.
       - Hang doi: toi da 2 file cung luc (LOCAL_PROBE_CONCURRENCY), moi
         file xong thi NHUONG LUONG bang setTimeout(0) truoc khi lam file
         tiep — tuyet doi khong co vong dong bo dai doc 105 file mot mach;
         1 luot worker chi lam toi da 1 file roi nhuong, UI (cuon ML, bam
         nut, ticker) luon chen vao duoc giua cac dot.
       - Duration: the <audio> tam chi tao (khong gan src); src chi gan
         khi worker toi luot (toi da 2 the cung luc), co timeout
         (LOCAL_PROBE_TIMEOUT_MS) — khong mo 105 the cung luc nua.
       - Gom ve lai list: tag/duration ve chi dat lich ve lai (120ms,
         scheduleListRefresh), khong ve lai ngay tung file.
       - Cache: ket qua tag/duration cua 1 file (khoa ten|size|duong dan)
         luu trong phien — nap lai cung thu muc / mo lai ML thi dung cache,
         khong doc lai file; mo ML khong kich probe moi (chi ve lai tu
         model da co). */
    var LOCAL_PROBE_CONCURRENCY = (opts.localProbeConcurrency !== undefined) ? opts.localProbeConcurrency : 2;
    var LOCAL_PROBE_TIMEOUT_MS = (opts.localProbeTimeoutMs !== undefined) ? opts.localProbeTimeoutMs : 4000;
    var LOCAL_LIST_REFRESH_MS = 120;
    var localLoadQueue = [];
    var localLoadRunning = false;
    var localLoadWaiters = [];
    var localLoadState = { total: 0, done: 0, failed: 0, skipped: 0 };
    var localMetaCache = new Map();
    var onLocalLoadProgress = opts.onLocalLoadProgress || null;
    function localMetaCacheKey(f) {
      return String((f && f.name) || "") + "|" + String((f && f.size) || "") + "|" + String((f && f.webkitRelativePath) || "");
    }
    function snapshotLocalMeta(item) {
      return { tagTitle: item.tagTitle || null, artist: item.artist || null, album: item.album || null, len: (item.len === null || item.len === undefined) ? null : item.len, metaSource: item.metaSource || null, metaStatus: item.metaStatus || null };
    }
    function applyCachedLocalMeta(item, c) {
      if (!item || !c) return false;
      var changed = false;
      if (c.tagTitle && item.tagTitle !== c.tagTitle) { item.tagTitle = c.tagTitle; changed = true; }
      if (c.artist && item.artist !== c.artist) { item.artist = c.artist; changed = true; }
      if (c.album && item.album !== c.album) { item.album = c.album; changed = true; }
      if (c.len !== null && c.len !== undefined && (item.len === null || item.len === undefined)) { item.len = c.len; changed = true; }
      if (c.metaSource && item.metaSource !== c.metaSource) { item.metaSource = c.metaSource; changed = true; }
      if (c.metaStatus && item.metaStatus !== c.metaStatus) { item.metaStatus = c.metaStatus; changed = true; }
      return changed;
    }
    function getLocalLoadState() {
      return { total: localLoadState.total, done: localLoadState.done, pending: localLoadQueue.length, failed: localLoadState.failed, running: localLoadRunning, skipped: localLoadState.skipped };
    }
    function notifyLocalLoadProgress() {
      if (!onLocalLoadProgress) return;
      try { onLocalLoadProgress(getLocalLoadState()); } catch (e) { /* bo qua */ }
    }
    function waitLocalLoadIdle() {
      if (!localLoadRunning && !localLoadQueue.length) return Promise.resolve(getLocalLoadState());
      return new Promise(function (res) { localLoadWaiters.push(function () { res(getLocalLoadState()); }); });
    }
    /* Gom ve lai list: tag/duration ve dot chi hen ve lai 1 lan moi
       120ms (thay vi ve lai toan bo list ngay tung file). */
    var listRefreshTimer = null;
    function scheduleListRefresh() {
      if (listRefreshTimer) return;
      listRefreshTimer = setTimeout(function () {
        listRefreshTimer = null;
        refreshPlaylistRows();
      }, LOCAL_LIST_REFRESH_MS);
    }
    function flushListRefresh() {
      if (listRefreshTimer) { try { clearTimeout(listRefreshTimer); } catch (e) { /* bo qua */ } listRefreshTimer = null; }
      refreshPlaylistRows();
    }
    function localLoadQueueKick() {
      if (localLoadRunning) return;
      if (!localLoadQueue.length) return;
      localLoadRunning = true;
      notifyLocalLoadProgress();
      var workers = [];
      for (var w = 0; w < LOCAL_PROBE_CONCURRENCY; w++) workers.push(localLoadWorker());
      Promise.all(workers).then(function () {
        localLoadRunning = false;
        flushListRefresh();
        notifyLocalLoadProgress();
        var ws = localLoadWaiters; localLoadWaiters = [];
        for (var i = 0; i < ws.length; i++) { try { ws[i](); } catch (e) { /* bo qua */ } }
      });
    }
    async function localLoadWorker() {
      for (;;) {
        var entry = localLoadQueue.shift();
        if (!entry) return;
        await localLoadOne(entry);
        /* NHUONG LUONG: moi file xong la setTimeout(0) — UI chen vao
           giua cac dot, khong bao gio doc lien 105 file tren 1 tick. */
        await new Promise(function (res) { setTimeout(res, 0); });
      }
    }
    async function localLoadOne(entry) {
      var item = entry.item, file = entry.file;
      try {
        var key = localMetaCacheKey(file);
        var cached = localMetaCache.get(key);
        if (cached) {
          if (applyCachedLocalMeta(item, cached)) scheduleListRefresh();
        } else {
          try { await probeLocalMetadata(item, file); } catch (e) { /* probe loi -> muc van o lai, van phat duoc */ }
          localMetaCache.set(key, snapshotLocalMeta(item));
        }
        if ((item.len === null || item.len === undefined) && entry.durRec) {
          try { await startDurationProbe(entry.durRec); } catch (e) { /* bo qua */ }
          localMetaCache.set(key, snapshotLocalMeta(item));
        }
      } catch (e) { localLoadState.failed++; }
      localLoadState.done++;
      scheduleListRefresh();
      notifyLocalLoadProgress();
    }
    /* v10.3 — tao lai blob URL cho muc local neu url da mat (du phong:
       hien tai khong cho nao thu hoi URL — grep khong thay
       revokeObjectURL — nhung neu tuong lai co cho thu hoi som hoac
       url rong thi phat van duoc nho File goc giu o item._file). */
    function ensureLocalUrl(item) {
      if (!item || !item.local || item.url) return !!item.url;
      var f = null;
      try { f = item._file || null; } catch (e) { f = null; }
      if (!f) return false;
      try {
        if (typeof URL !== "undefined" && URL.createObjectURL) {
          item.url = URL.createObjectURL(f);
          return !!item.url;
        }
      } catch (e) { /* bo qua */ }
      return false;
    }
    /* Đợt L (9.8) — đọc thời lượng file local khi thêm (không phát):
       thẻ <audio preload="metadata"> tạm, chỉ đọc header rồi bỏ; khi
       loadedmetadata có duration thật thì ghi vào item.len + vẽ lại
       hàng (nhãn góc phải đổi "…" -> "M:SS"). Không đọc kiểu phát thử
       từng file. Đài live (kind radio) không probe — duration của live
       là Infinity/NaN, không có nghĩa. */
    function probeLocalDuration(item) {
      /* v10.3: chi TAO the tam + gan listener, KHONG gan src o day (src
         chi gan khi worker toi luot qua startDurationProbe) — de khong
         mo 105 the <audio> cung luc. Tra ve rec {el, promise, finish}
         de worker dieu khien; goi truc tiep (khong qua worker) thi the
         khong bao gio nap — do la chu y, khong phai loi: addLocalFiles
         luon dua rec vao hang doi. */
      if (!item || item.kind !== "track" || item.len != null) return null;
      if (!document || !document.createElement) return null;
      var tmp = null;
      try { tmp = document.createElement("audio"); } catch (e) { return null; }
      if (!tmp) return null;
      var rec = { item: item, el: tmp, done: false, promise: null, finish: null, armTimeout: null };
      var timer = null;
      function finish() {
        if (rec.done) return; rec.done = true;
        if (timer) { try { clearTimeout(timer); } catch (e) { /* bo qua */ } timer = null; }
        var d = NaN;
        try { d = tmp.duration; } catch (e) { d = NaN; }
        try { tmp.removeAttribute("src"); tmp.load(); } catch (e) { /* bỏ qua */ }
        if (d && isFinite(d) && d > 0) {
          item.len = Math.round(d);
          scheduleListRefresh(); updateInfoEls();
        }
      }
      rec.finish = finish;
      rec.armTimeout = function () {
        if (rec.done || timer) return;
        timer = setTimeout(function () { finish(); }, LOCAL_PROBE_TIMEOUT_MS);
      };
      rec.promise = new Promise(function (resolve) {
        var done0 = finish;
        finish = function () { done0(); resolve(rec.item.len != null); };
        rec.finish = finish;
        try {
          tmp.addEventListener("loadedmetadata", finish);
          tmp.addEventListener("error", finish);
          try { tmp.preload = "metadata"; } catch (e) { /* bỏ qua */ }
        } catch (e) { finish(); }
      });
      return rec;
    }
    function startDurationProbe(rec) {
      if (!rec || rec.done) return rec ? rec.promise : Promise.resolve(false);
      try { rec.el.src = rec.item.url; } catch (e) { rec.finish(); return rec.promise; }
      try { rec.armTimeout(); } catch (e) { /* bo qua */ }
      return rec.promise;
    }
    /* Đợt 5 (03/11: metadata nhạc) — đọc tag file local lúc nạp, đúng
       thứ tự của fork (fileUtils.ts genMediaTags + actionCreators/
       files.ts fetchMediaTags): lib music-metadata qua CDN trước
       (metadata.js probeFile), parser ID3/FLAC nội bộ lấp chỗ lib
       thiếu hoặc khi CDN chết; file không tag thì KHÔNG đổi gì —
       giữ tên file + thời lượng đã probe bằng thẻ audio tạm ở trên,
       nghệ sĩ/album giữ suy từ thư mục (localPathParts). Trả Promise
       (resolve null khi không có module/không có tag/không đọc được
       file) — không bao giờ throw, không chặn addLocalFiles. */
    function applyMetadataToItem(item, meta) {
      if (!item || !meta) return false;
      var lib = getMetaLib();
      var changed = false;
      if (lib && lib.applyMetadataToItem) {
        try { changed = !!lib.applyMetadataToItem(item, meta); } catch (e) { changed = false; }
      } else {
        /* Không có metadata.js: áp tối thiểu, cùng quy tắc (title →
           tagTitle, artist/album tag thắng thư mục, duration chỉ khi
           len còn null). */
        if (meta.title && item.tagTitle !== meta.title) { item.tagTitle = meta.title; changed = true; }
        if (meta.artist && item.artist !== meta.artist) { item.artist = meta.artist; changed = true; }
        if (meta.album && item.album !== meta.album) { item.album = meta.album; changed = true; }
        if (meta.duration && (item.len === null || item.len === undefined)) { item.len = Math.round(meta.duration); changed = true; }
        /* v10.4 — so kenh cua nguon (nhu metadata.js): 1 = mono, >=2 = stereo. */
        if (meta.channels && item.channels !== meta.channels) { item.channels = meta.channels; changed = true; }
        if (meta.source) item.metaSource = meta.source;
        if (meta.status) item.metaStatus = meta.status;
      }
      if (changed) { scheduleListRefresh(); /* v10.3: gom ve lai list (xem tren) */ updateInfoEls(); }
      /* Đợt 6: tag về muộn (probe async sau khi đã phát) mà là bài đang
         phát thì màn hình khóa đổi theo tên/nghệ sĩ thật. */
      if (changed && playlistState.items[playlistState.current] === item) { updateMediaSession(); updateChannelsIndicator(); /* v10.5: probe ve muon moi biet so kenh that (vd file mono 1 kenh) — doi chi bao ngay, nhu Webamp SET_MEDIA_TAGS -> MonoStereo ve lai */ }
      return changed;
    }
    function probeLocalMetadata(item, file, probeOpts) {
      if (!item || !file) return Promise.resolve(null);
      var lib = getMetaLib();
      if (!lib || !lib.probeFile) return Promise.resolve(null);
      var p = null;
      try { p = lib.probeFile(file, probeOpts || {}); } catch (e) { return Promise.resolve(null); }
      return Promise.resolve(p).then(function (meta) {
        if (meta) applyMetadataToItem(item, meta);
        return meta || null;
      }).catch(function () { return null; });
    }
    /* Tên hiển thị: tag title (nếu có) else tên file — dùng ở ML và
       bảng trackinfo. Playlist + ticker GIỮ item.name (tên file) như
       cũ, không đổi (quyết đợt 5). */
    function metadataDisplayName(item) {
      if (!item) return "";
      var lib = getMetaLib();
      if (lib && lib.displayTitle) { try { return lib.displayTitle(item); } catch (e) { /* bỏ qua */ } }
      return item.tagTitle || item.name || "";
    }
    function metadataDisplayArtist(item) {
      var lib = getMetaLib();
      if (lib && lib.displayArtist) { try { return lib.displayArtist(item); } catch (e) { /* bỏ qua */ } }
      var a = item && (item.artist || "").replace(/^\s+|\s+$/g, "");
      return a ? a : "Không rõ";
    }
    function metadataDisplayAlbum(item) {
      var lib = getMetaLib();
      if (lib && lib.displayAlbum) { try { return lib.displayAlbum(item); } catch (e) { /* bỏ qua */ } }
      var a = item && (item.album || "").replace(/^\s+|\s+$/g, "");
      return a ? a : "Không rõ";
    }
    /* Đợt v10.0 (việc 5: thêm nhạc local): tách đường dẫn tương đối của
       file trong thư mục đã chọn (webkitRelativePath) thành nhóm/album/
       nghệ sĩ — cầu nối cho metadata (tag ID3 đọc sau): nhóm = thư mục
       cha trực tiếp, album = thư mục cha trực tiếp, nghệ sĩ = thư mục
       ông (dưới thư mục gốc đã chọn) nếu có; file ngay dưới thư mục
       gốc thì nhóm/album = tên thư mục gốc; file đơn (không có đường
       dẫn tương đối) thì nhóm "Local". */
    function localPathParts(f) {
      var rel = (f && f.webkitRelativePath) ? String(f.webkitRelativePath) : "";
      var parts = rel ? rel.split("/") : [];
      if (parts.length >= 2) {
        var root = parts[0] || "Local";
        var parent = parts[parts.length - 2] || root;
        var artist = parts.length >= 4 ? (parts[parts.length - 3] || "") : "";
        return { relPath: rel, root: root, group: parent, album: parent, artist: artist };
      }
      return { relPath: "", root: "", group: "Local", album: "", artist: "" };
    }
    function addLocalFiles(files) {
      var added = 0;
      var list = files || [];
      /* Đợt v10.0 (việc 5): xếp theo đường dẫn tương đối để file cùng
         thư mục kề nhau, đúng thứ tự duyệt thư mục. */
      var sorted = [];
      for (var si = 0; si < list.length; si++) sorted.push(list[si]);
      sorted.sort(function (a, b) {
        var pa = (a && a.webkitRelativePath) || (a && a.name) || "";
        var pb = (b && b.webkitRelativePath) || (b && b.name) || "";
        return pa < pb ? -1 : (pa > pb ? 1 : 0);
      });
      var skipped = 0;
      for (var i = 0; i < sorted.length; i++) {
        var f = sorted[i];
        if (!f || !/\.(mp3|wav|ogg|oga|m4a|flac|aac|opus)$/i.test(f.name || "")) { skipped++; continue; }
        var url = "";
        try {
          if (typeof URL !== "undefined" && URL.createObjectURL) url = URL.createObjectURL(f);
        } catch (e) { url = ""; }
        if (!url) { skipped++; continue; }
        var pp = localPathParts(f);
        var item = {
          name: String(f.name).replace(/\.[^.]+$/, ""),
          url: url, len: null, group: pp.group, kind: "track", local: true,
          /* Đợt B (9.9): giữ kích thước file để tính KBPS trung bình thật
             (fileSize*8/len/1000) khi có thời lượng — xem songInfoValues. */
          fileSize: (f && f.size) || null,
          /* Đợt v10.0 (việc 5): đường dẫn tương đối + nghệ sĩ/album suy
             từ cấu trúc thư mục (chờ tag ID3 ở đợt metadata). */
          relPath: pp.relPath, album: pp.album, artist: pp.artist
        };
        /* v10.3: giu File goc (khong enumerable — khong lot vao
           JSON/stringify) de tao lai blob URL khi can (ensureLocalUrl)
           va de worker doc tag theo dung file nay. */
        try { Object.defineProperty(item, "_file", { value: f, enumerable: false, writable: true, configurable: true }); } catch (e) { item._file = f; }
        playlistState.items.push(item);
        /* v10.3: LIST HIEN NGAY — chi tao the probe tam (chua gan src)
           + dua vao hang doi; tag/duration dien DAN theo worker, khong
           probe dong loat o day nua (xem localLoadOne). */
        var durRec = probeLocalDuration(item);
        localLoadQueue.push({ item: item, file: f, durRec: durRec });
        localLoadState.total++;
        added++;
      }
      localLoadState.skipped += skipped;
      if (added) {
        playlistState.original = playlistState.items.slice();
        updateInfoEls();
        requestRerender();
        localLoadQueueKick();
        notifyLocalLoadProgress();
      }
      return added;
    }
    var LOCAL_AUDIO_ACCEPT = "audio/*,.mp3,.wav,.ogg,.oga,.m4a,.flac,.aac,.opus";
    /* Đợt v10.0 (việc 5): chọn 1 bài nhạc (1 file, không webkitdirectory,
       không multiple) — khác với chọn thư mục bên dưới. */
    function openLocalFilePicker() {
      if (!document || !document.createElement) return false;
      var inp = document.createElement("input");
      inp.type = "file";
      try { inp.setAttribute("accept", LOCAL_AUDIO_ACCEPT); } catch (e) { /* bỏ qua */ }
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
    function openLocalFolderPicker() {
      if (!document || !document.createElement) return false;
      var inp = document.createElement("input");
      inp.type = "file";
      try { inp.setAttribute("webkitdirectory", ""); } catch (e) { /* bỏ qua */ }
      try { inp.setAttribute("accept", LOCAL_AUDIO_ACCEPT); } catch (e) { /* bỏ qua */ }
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
    /* Đợt v10.0 (việc 5): popup 2 lựa chọn cho nút Eject (kiểu menu
       PRESETS: nền #ECE9D8, mở hướng lên khi không đủ chỗ dưới). */
    function showLocalAddMenu(anchorDiv) {
      var T = lastStage;
      if (!T) return false;
      /* v10.8: dùng closer CHUNG (closePlaylistMenus/armPanelCloser) thay
         cho closer riêng cũ — menu này cũng mang [data-pl-menu] (giữ
         nguyên [data-local-add-menu] để test/truy vấn cũ vẫn thấy). */
      closePlaylistMenus();
      var menu = document.createElement("div");
      menu.dataset.localAddMenu = "1";
      menu.dataset.plMenu = "1";
      menu.style.position = "absolute";
      menu.style.left = ((anchorDiv && anchorDiv._absX) || 0) + "px";
      menu.style.top = (((anchorDiv && anchorDiv._absY) || 0) + 12) + "px";
      menu.style.background = "#ECE9D8"; menu.style.border = "1px solid #ACA899";
      menu.style.zIndex = "10"; menu.style.pointerEvents = "auto";
      menu.style.font = "11px Arial, sans-serif"; menu.style.color = "#000";
      var choices = [
        { label: "1 bài nhạc…", key: "localfile", fn: openLocalFilePicker },
        { label: "Cả thư mục…", key: "localdir", fn: openLocalFolderPicker }
      ];
      for (var i = 0; i < choices.length; i++) {
        (function (ch) {
          var row = document.createElement("div");
          row.textContent = ch.label;
          row.style.padding = "4px 10px"; row.style.cursor = "pointer"; row.style.whiteSpace = "nowrap";
          row.dataset.localAdd = ch.key;
          row.onmouseover = function () { row.style.background = "#316AC5"; row.style.color = "#fff"; };
          row.onmouseout = function () { row.style.background = ""; row.style.color = ""; };
          row.onclick = function (ev) {
            if (ev && ev.stopPropagation) ev.stopPropagation();
            closePlaylistMenus();
            ch.fn();
          };
          menu.appendChild(row);
        })(choices[i]);
      }
      T.appendChild(menu);
      placePopupInStage(menu, anchorDiv, choices.length);
      armPanelCloser(anchorDiv); /* v10.9: neo anchor (xem armPanelCloser) */
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
       iptv.m3u xong gọi setPlaylistData để chèn 218 mục (không còn
       bài Demo — người dùng chốt bỏ hết, chỉ giữ nguồn của mình).
       v10.17: group của mục lấy đúng group-title trong file (iptv.m3u
       có 13 nhóm); mục nào không có group-title thì group để trống —
       lúc vẽ playlist mới gom vào nhóm "Khác", còn file nào KHÔNG có
       group-title nào thì hiện phẳng như cũ (không tiêu đề nhóm). */
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
      var total = playlistTotalTime();
      if (total > 0) return fmtTime(total);
      /* v10.7 (107) — playlist toàn live (tổng = 0, vd 41 đài radio):
         không còn số tĩnh nào để hiện; hiện THỜI GIAN ĐÃ PHÁT của mục
         đang phát (demo.t — số đo thật của engine, đồng hồ chính cũng
         hiện số này; ảnh 04/11 07:19: main 1:00 mà playlist 0:00).
         Chưa phát / dừng (demo.t = 0) thì vẫn 0:00. Fork hiện
         "0:00/0:00" (sel/total) ở trường hợp này — Amp chọn hiện thời
         gian đã phát vì đó là số duy nhất có thật, hộp 0:00 trong khi
         nhạc đang phát là điều người dùng báo "chưa đầy đủ". */
      if (playlistState.current >= 0 && playlistState.current < playlistState.items.length && demo.t > 0) return fmtTime(demo.t);
      return fmtTime(0);
    }
    /* v10.7 (107) — đồng hồ có đang ở chế độ "thời gian đã phát" (phụ
       thuộc demo.t, phải vẽ lại theo từng tick) hay số tĩnh (tổng/đã
       chọn — chỉ vẽ lại khi đổi lựa chọn/nạp playlist)? */
    var lastPlClockDrawn = null; /* text PLTime đã vẽ lần cuối (cả 2 skin) */
    function playlistClockUsesElapsed() {
      if (playlistSelectedTime() != null) return false;
      if (playlistTotalTime() > 0) return false;
      return playlistState.current >= 0 && playlistState.current < playlistState.items.length && demo.t > 0;
    }
    /* Vẽ lại PLTime theo tick nhạc — chỉ khi đang ở chế độ elapsed và
       text đổi giây (tránh vẽ lại bitmap 4 lần/giây khi không đổi). */
    function refreshPlaylistClockTick() {
      if (!playlistClockUsesElapsed()) return;
      var txt = playlistClockText();
      if (txt === lastPlClockDrawn) return;
      lastPlClockDrawn = txt;
      updateInfoEls(); /* Modern PLTime (async, có seq-guard) */
      refreshClassicPlTime(); /* Classic playlist (đồng bộ) */
    }
    function playlistGroups() {
      var g = {};
      for (var i = 0; i < playlistState.items.length; i++) {
        var k = playlistState.items[i].group || "Khác";
        g[k] = (g[k] || 0) + 1;
      }
      return g;
    }
    /* v10.4 — TIM THEO NGHE SI/ALBUM (nguoi dung: tim nghe si khong
       thay): o tim playlist truoc day chi khop item.name. Nay khop ca
       ten + nghe si + album (qua metadataDisplayArtist/Album — tag ID3
       hoac suy tu thu muc), khong phan biet hoa/thuong + khong phan
       biet dau (bo dau ca tu khoa lan du lieu bang stripDiacritics,
       vd go "hoang oanh" ra "Hoàng Oanh"). "Không rõ" (khong co tag)
       khong dua vao chuoi khop de go "khong ro" khoi ra tat ca. Dung
       chung cho o tim playlist (playlistFiltered) + o tim ML
       (mlFilteredItems). */
    function itemSearchHaystack(it) {
      var a = metadataDisplayArtist(it); if (a === "Không rõ") a = "";
      var al = metadataDisplayAlbum(it); if (al === "Không rõ") al = "";
      return stripDiacritics(((it && it.name) || "") + " " + a + " " + al).toLowerCase();
    }
    function itemMatchesSearch(it, fNorm) {
      if (!fNorm) return true;
      return itemSearchHaystack(it).indexOf(fNorm) >= 0;
    }
    function playlistFiltered() {
      var out = [];
      var f = stripDiacritics((playlistState.filter || "").toLowerCase());
      for (var i = 0; i < playlistState.items.length; i++) {
        if (itemMatchesSearch(playlistState.items[i], f)) out.push({ item: playlistState.items[i], idx: i });
      }
      return out;
    }
    /* v10.17 — PLAYLIST THEO CHUYEN MUC (kieu IPTV Viewer v10):
       playlistGroupedRows() tra ve danh sach HIEN THI gom 2 loai phan tu:
       - { header: "Ten nhom", count: N } — tieu de nhom, dung truoc muc
         dau tien cua nhom do;
       - { item, idx } — muc kenh/bai nhu playlistFiltered() tra ve.
       Thu tu nhom = lan xuat hien dau tien trong danh sach (sau loc);
       cac muc cung nhom gom lien nhau duoi 1 tieu de, giu nguyen thu tu
       goc trong nhom. Muc khong co group ("") gom vao nhom "Khác" (quy
       uoc giong IPTV Viewer v10). Neu KHONG muc nao co group (vd file
       .m3u khong co group-title nao) thi tra ve danh sach phang nhu cu
       (khong tieu de). Tieu de chi de hien thi: khong co idx, khong nam
       trong items, khong tinh vao so muc / thoi luong / so thu tu, khong
       match khi tim kiem (no chi xuat hien khi nhom cua no co muc khop
       loc); buildPlaylistRows/buildClassicPlRows ve no thanh hang rieng
       khong bam/phat/chon duoc. */
    function playlistGroupName(it) {
      var g = (it && it.group) || "";
      return g ? g : "Khác";
    }
    /* v10.18 — NHOM PLAYLIST THU GON/MO RA (mau app cu cua Hai, anh
       1000094759/1000094760: tieu de nhom co icon THU MUC VANG — 📁 khi
       thu gon, 📂 khi mo; kenh trong nhom mo DANH SO LAI TU 1 theo nhom,
       vd "1. VTV1".."5. VIETNAM TODAY HD"; MAC DINH TAT CA cac nhom deu
       THU GON). Trang thai thu gon luu trong phien (map ten nhom ->
       true = dang thu gon), KHONG luu localStorage. Nap lai playlist /
       doi skin thi reset ve mac dinh (tat ca dong). Tim kiem khong sua
       map: luc loc thi cac nhom co ket qua mo hieu luc; xoa tim kiem
       thi reset ve mac dinh. */
    var plGroupCollapsed = null; /* null = chua khoi tao cho playlist hien tai */
    var plSearchActive = false; /* dang loc tim kiem? */
    function plGroupOrderFull() {
      var order = [], seen = {};
      for (var i = 0; i < playlistState.items.length; i++) {
        var g = playlistGroupName(playlistState.items[i]);
        if (!seen[g]) { seen[g] = true; order.push(g); }
      }
      return order;
    }
    function plGroupEnsureInit() {
      if (plGroupCollapsed) return;
      plGroupCollapsed = {};
      var order = plGroupOrderFull();
      for (var j = 0; j < order.length; j++) plGroupCollapsed[order[j]] = true; /* mac dinh: tat ca thu gon */
    }
    function plGroupReset() {
      plGroupCollapsed = null; plSearchActive = false;
    }
    function plGroupIsCollapsed(g) {
      plGroupEnsureInit();
      if (plGroupCollapsed[g] === undefined) return true; /* nhom la chua thay -> thu gon */
      return plGroupCollapsed[g];
    }
    function plGroupSetOpen(g, open) {
      plGroupEnsureInit();
      plGroupCollapsed[g] = !open;
    }
    function plGroupToggle(g) {
      plGroupSetOpen(g, plGroupIsCollapsed(g));
      refreshPlaylistRows();
    }
    /* Mo nhom chua muc idx (de thay bai dang hat/dang chon); tra ve
       true neu vua mo (nguoi goi ve lai hang). */
    function plGroupEnsureOpenForIdx(idx) {
      if (idx == null || idx < 0 || idx >= playlistState.items.length) return false;
      var g = playlistGroupName(playlistState.items[idx]);
      if (plGroupIsCollapsed(g)) { plGroupSetOpen(g, true); return true; }
      return false;
    }
    /* Nhom co mo HIEU LUC khong: luc tim kiem thi moi nhom co ket qua
       deu mo; khong tim kiem thi theo map thu gon. */
    function plGroupEffectiveOpen(g) {
      if (playlistState.filter) return true;
      return !plGroupIsCollapsed(g);
    }
    /* Tieu de nhom: icon thu muc vang + "Ten nhom (N)"; bam thi thu
       gon/mo ra (khong phat/khong chon, nhu v10.17). Dung chung Modern /
       Classic / <list> (moi noi tu ap style rieng). afterToggle (neu
       co) chay them sau khi doi trang thai — dung cho <list> de ve lai
       khung list cuc bo. */
    function plGroupHeaderEl(rec, afterToggle) {
      var h = document.createElement("div");
      h.className = "group-header";
      h.dataset.groupHeader = "1";
      var f = document.createElement("span");
      f.className = "folder";
      f.textContent = rec.open ? "📂" : "📁";
      h.appendChild(f);
      var lb = document.createElement("span");
      lb.textContent = " " + rec.header + " (" + rec.count + ")";
      h.appendChild(lb);
      h.setAttribute("aria-expanded", String(!!rec.open));
      h.style.cursor = "pointer";
      h.onclick = function () { plGroupToggle(rec.header); if (afterToggle) afterToggle(); };
      return h;
    }
    function playlistGroupedRows() {
      var rows = playlistFiltered();
      var order = [], byGroup = {};
      for (var i = 0; i < rows.length; i++) {
        var g = playlistGroupName(rows[i].item);
        if (!byGroup[g]) { byGroup[g] = []; order.push(g); }
        byGroup[g].push(rows[i]);
      }
      if (order.length === 1 && order[0] === "Khác") return rows; /* phang nhu cu */
      var out = [];
      for (var j = 0; j < order.length; j++) {
        var g2 = order[j], open = plGroupEffectiveOpen(g2);
        out.push({ header: g2, count: byGroup[g2].length, open: open });
        if (!open) continue;
        for (var k = 0; k < byGroup[g2].length; k++) {
          var rec = byGroup[g2][k];
          rec.pos = k + 1; /* v10.18 — so thu tu TRONG NHOM (tu 1), chi khi nhom mo */
          out.push(rec);
        }
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
    /* v10.5 — SO KENH THEO WEBAMP (khong do tin hieu):
       - itemChannels(item): so kenh da biet cua muc (numberOfChannels
         uu tien, roi channels — nhu updateChannelsIndicator v10.4),
         null neu chua biet. Dung chung cho chi bao Modern + Classic.
       - applyWebampChannels(item): muc URL (http/https) chua biet so
         kenh thi gan channels = 2 — y het Webamp fork (loadMediaFile
         thay metaData thi SET_MEDIA_TAGS numberOfChannels: 2; muc .m3u
         da co channels: 2 tu parseM3U). File local (blob:/File) KHONG
         gan o day — probeFile doc tag that roi ghi de (1 = mono that).
         Goi o moi duong nap muc (setPlaylistData/setPlaylistItems/
         addPlaylistItem(s)) de doi bai/doi dai khong giu so kenh cua
         muc truoc. */
    function itemChannels(item) {
      if (!item) return null;
      var n = (item.numberOfChannels != null) ? item.numberOfChannels : item.channels;
      n = (n != null && isFinite(Number(n))) ? Number(n) : null;
      return n;
    }
    function applyWebampChannels(item) {
      if (!item || itemChannels(item) != null) return item;
      if (/^https?:\/\//i.test(String(item.url || ""))) item.channels = 2;
      return item;
    }
    /* Nạp nguồn .m3u làm dữ liệu chính (giữ tên + thứ tự gốc).
       Đợt 9.5: không còn nối bài Demo vào cuối. v10.17: KHÔNG còn
       gán group mặc định "Radio" cho mục không có group-title (như
       trước) — group để trống, lúc vẽ playlist mới gom vào "Khác";
       nhờ vậy file không có group-title nào vẫn hiện phẳng như cũ.
       Trả về tổng số mục. */
    function setPlaylistData(m3uText, baseUrl, sourceName) {
      var radio = parseM3U(m3uText, baseUrl);
      for (var i = 0; i < radio.length; i++) { applyWebampChannels(radio[i]); }
      var items = radio;
      playlistState.items = items;
      playlistState.original = items.slice();
      playlistState.selected = clampPlaylistIdx(0); playlistState.current = clampPlaylistIdx(0);
      playlistState.playing = false; playlistState.filter = "";
      plGroupReset(); /* v10.18 — nap lai playlist thi ve mac dinh: tat ca nhom thu gon */
      demo.t = 0; demo.seekFrac = 0; demo.dur = undefined; /* v10.7 (107): playlist mới = chưa phát gì — quên vị trí bài cũ kẻo đồng hồ (chính + playlist) hiện số cũ của playlist trước (vd nạp lại radio khi đang ở 0:09 thì đồng hồ toàn-live hiện 0:09 dù chưa phát) */
      avsVideoEverHadPic = false; /* v10.3 — playlist moi: muc hien tai la luong moi, chua tung co hinh */
      playlistState.source = sourceName || "iptv.m3u";
      requestRerender();
      /* v10.3 (H2): goi thang setTickerText — truoc day chi requestRerender
         nen ticker khong duoc dong bo khi du lieu ve (render lai bat ky
         luc nao cung reset tickerEls). */
      for (var ti = 0; ti < tickerEls.length; ti++) setTickerText(tickerEls[ti]);
      syncAvsName();
      return items.length;
    }
    function setPlaylistItems(items, sourceName) {
      playlistState.items = items.slice();
      for (var ai = 0; ai < playlistState.items.length; ai++) applyWebampChannels(playlistState.items[ai]);
      playlistState.original = items.slice();
      playlistState.selected = clampPlaylistIdx(0); playlistState.current = clampPlaylistIdx(0);
      playlistState.playing = false; playlistState.filter = "";
      plGroupReset(); /* v10.18 — nap lai playlist thi ve mac dinh: tat ca nhom thu gon */
      demo.t = 0; demo.seekFrac = 0; demo.dur = undefined; /* v10.7 (107): như setPlaylistData — playlist mới = chưa phát gì */
      avsVideoEverHadPic = false; /* v10.3 — nhu setPlaylistData */
      playlistState.source = sourceName || "";
      requestRerender();
      for (var ti2 = 0; ti2 < tickerEls.length; ti2++) setTickerText(tickerEls[ti2]);
      syncAvsName();
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
      plGroupEnsureOpenForIdx(playlistState.selected); /* v10.18 — tu mo nhom chua muc dang chon de thay muc dang chon */
      refreshPlaylistRows();
      /* Đợt A (9.9, việc 3): đổi lựa chọn thì PLTime đổi theo (tổng →
         thời gian đã chọn); vẽ tại chỗ, không re-render. */
      updateInfoEls();
      refreshClassicMain(); /* Đợt v10.1: Classic — đổi lựa chọn thì chữ chạy đổi theo */
      return true;
    }
    /* Đợt A (9.9, việc 3): bỏ chọn (bấm nền trống của danh sách) — PLTime
       về tổng thời gian (như Winamp: bấm vùng trống thì hết chọn). */
    function clearPlaylistSelection() {
      if (playlistState.selected === -1) return false;
      playlistState.selected = -1;
      refreshPlaylistRows();
      updateInfoEls();
      refreshClassicMain(); /* Đợt v10.1: Classic — bỏ chọn thì chữ chạy đổi theo */
      return true;
    }
    /* Nhấp đúp = phát: đặt current + playing (state cho đợt E dùng tiếp).
       Đồng hồ/chữ chạy cửa sổ chính hiện tên mục đang phát. */
    function playPlaylistItem(idx) {
      if (!playlistState.items.length) return false;
      userStopped = false; /* phat tuong minh (nhap dup / next / prev / play) -> go chot Stop */
      idx = clampPlaylistIdx(idx);
      playlistState.current = idx;
      playlistState.selected = idx;
      playlistState.playing = true;
      plGroupEnsureOpenForIdx(idx); /* v10.18 — tu mo nhom chua bai dang hat */
      avsVideoEverHadPic = false; /* v10.3 — bai moi: luong moi, chua tung co hinh */
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
      syncAvsName(); /* v10.3: doi bai thi ten tren nen den AVS doi theo */
      for (var i = 0; i < tickerEls.length; i++) setTickerText(tickerEls[i]);
      updateInfoEls();
      /* Đợt D — đường (a) loadChannel autoplay (v8): kênh video thì tự mở
         video (nhúng nếu có, rời nếu Classic); kênh audio trong khi vùng
         nhúng đang ở chế độ video thì về vis cho khỏi màn hình đen.
         v10.13 — chỉ tự mở khi tick Options "Tự mở cửa sổ video khi phát
         video" đang BẬT (mặc định bật, xem autoOpenVideoEnabled); tắt thì
         phát TV chỉ nghe tiếng, cửa sổ video giữ nguyên trạng thái đóng —
         mở tay bằng nút video / menu View (các đường mở tay KHÔNG qua đây
         nên không bị chặn). */
      var playedItem = playlistState.items[idx];
      if (isVideoItem(playedItem)) { if (autoOpenVideoEnabled()) openAvs("video"); }
      else if (avsState.open && !avsState.detached && avsState.mode === "video" && RES.embeddedAvs) setAvsMode("vis");
      /* Đợt E — phát thật qua audio engine (mục không có link nhạc
         thì chỉ hiện trạng thái, xem startPlaybackForCurrent). */
      startPlaybackForCurrent();
      updateMediaSession(); /* Đợt 6: đổi bài thì màn hình khóa đổi theo */
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
      applyWebampChannels(item);
      playlistState.items.push(item);
      updateInfoEls();
      requestRerender();
      return playlistState.items.length - 1;
    }
    /* v10.3 — THÊM HÀNG LOẠT (sửa chậm khi load .m3u): addPlaylistItem
       gọi requestRerender() MỖI LẦN — nạp danh sách .m3u 41 kênh qua
       addUrl() cũ thì vẽ lại TOÀN BỘ giao diện 41 lần nối tiếp (mỗi lần
       vẽ lại cả cửa sổ chính + playlist + ML), trên điện thoại chậm hơn
       hẳn Webamp (fork chỉ set state 1 lần sau khi parse xong).
       addPlaylistItems: đẩy hết mục vào rồi CHỈ vẽ lại 1 lần; list
       hiện ngay sau parse, không đợi xử lý phụ (radio không probe
       duration/metadata — len=null hiện "Trực tiếp" ngay). */
    function addPlaylistItems(items) {
      if (!items || !items.length) return 0;
      for (var i = 0; i < items.length; i++) { applyWebampChannels(items[i]); playlistState.items.push(items[i]); }
      updateInfoEls();
      requestRerender();
      return items.length;
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
      plGroupReset(); /* v10.18 */
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
      /* v10.3: skin Classic cuộn list playlist Classic. */
      var target = plListDiv || classicPlListDiv;
      if (!target) return;
      /* v10.19 (1): cuộn có chủ đích (menu "Tới bài đang hát" / đầu / cuối)
         thì hủy lưới khôi muộn đang chờ — không để nó kéo danh sách về
         vị trí cũ sau khi người dùng đã bảo cuộn tới chỗ khác. */
      pendingScrollRestore = null;
      try { target.scrollTop = Math.max(0, idx * 13 - 26); } catch (e) { /* jsdom */ }
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
      /* v10.8 — SUA LOI: `var suf` truoc day khai bao SAU cho nay (hoisting
         -> suf === undefined o dong check Beat) nen bam checkbox "Enable
         Beat Visualization" trong ngan keo Options chi doi cfgState ma
         KHONG doi beatVisOn -> nhom beat khong hien/an theo. Chuyen
         khai bao suf len truoc moi cho dung (Detach/ticker ben duoi van
         dung chung bien nay). */
      var suf = attribSuffix(attrib);
      /* Đợt D (9.9): "Enable Beat Visualization" — bật/tắt nhóm beat trong
         display (xem setBeatVisOn; toggleCfg đã requestRerender ở cuối nên
         nhóm hiện/ẩn theo ngay). */
      if (suf === "Enable Beat Visualization") beatVisOn = cfgOn(attrib);
      /* Đợt B (9.9): "Detach Vis/Video Window" (optionsgroup.misc) — bật thì
         tách rời ngay nếu AVS đang mở ở chế độ đó; tắt thì gắn lại. */
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

    /* Preset EQ — KHÔNG có trong skin (Winamp gốc đọc preset từ file ngoài).
       17 preset chuẩn Winamp (đợt v10.2, 18:13): dữ liệu dB lấy từ
       builtin.json của Webamp — đã kiểm chứng khớp tuyệt đối với file
       winamp.q1 thật (17 preset, 0 giá trị khác); đổi từ thang .eqf
       1..64 bằng eqfValueToDb của Amp (33 = 0 dB), làm tròn 1 số lẻ.
       [preamp, eq1..eq10] theo dB; frac = (dB + 12) / 24.
       5 preset tự định nghĩa cũ giữ lại phía dưới, cộng "Default"
       (v10.8) đứng đầu — tổng 23 preset. */
    var EQ_PRESETS = {
      /* v10.8 (108, 04/11 — chốt của Hải 08:20 "giống như cổ điển hay
         dance đó"): "Default" là 1 preset BÌNH THƯỜNG, liệt kê cùng
         các preset khác (đầu menu, như Classical/Dance/Rock), KHÔNG phải
         nút riêng hay mục đặc biệt. Đường cong phẳng như "Flat"; khác
         Flat ở chỗ chọn nó còn đưa balance về giữa (xem applyEqPreset
         -> resetEqToDefault), và khi EQ phẳng + balance giữa thì
         matchEqPresetName suy ra "Default" thay vì "Flat".
         v10.8 (09:08 — "các hiệu ứng bên trong eq để tiếng anh"): tên
         preset để TIẾNG ANH gốc của Winamp (Classical, Full Bass,
         Large Hall...) thay vì tiếng Việt; "Mặc định" đổi thành
         "Default". Chỉ đổi phần hiệu ứng trong EQ — menu chung
         (File/Play/Options/View/Help) vẫn tiếng Việt. */
      "Default":              [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      "Classical":            [0, 0, 0, 0, 0, 0, 0, -4.9, -4.9, -4.9, -6.4],
      "Club":                 [0, 0, 0, 1.9, 3.5, 3.5, 3.5, 1.9, 0, 0, 0],
      "Dance":                [0, 5.8, 4.3, 1.2, -0.4, -0.4, -4.1, -4.9, -4.9, -0.4, -0.4],
      "Laptop Speakers/Headphone": [0, 2.7, 6.6, 3.1, -2.6, -1.9, 0.8, 2.7, 5.8, 7.7, 8.9],
      "Large Hall":           [0, 6.2, 6.2, 3.5, 3.5, 0, -3.4, -3.4, -3.4, 0, 0],
      "Party":                [0, 4.3, 4.3, 0, 0, 0, 0, 0, 0, 4.3, 4.3],
      "Pop":                  [0, -1.5, 2.7, 4.3, 4.6, 3.1, -1.1, -1.9, -1.9, -1.5, -1.5],
      "Reggae":               [0, 0, 0, -0.8, -4.1, 0, 3.9, 3.9, 0, 0, 0],
      "Rock":                 [0, 4.6, 2.7, -3.8, -5.2, -2.6, 2.3, 5.4, 6.6, 6.6, 6.6],
      "Soft":                 [0, 2.7, 0.8, -1.1, -1.9, -1.1, 2.3, 5, 5.8, 6.6, 7.4],
      "Ska":                  [0, -1.9, -3.4, -3, -0.8, 2.3, 3.5, 5.4, 5.8, 6.6, 5.8],
      "Full Bass":            [0, 5.8, 5.8, 5.8, 3.5, 0.8, -3, -5.6, -6.8, -7.1, -7.1],
      "Soft Rock":            [0, 2.3, 2.3, 1.2, -0.8, -3, -3.8, -2.6, -0.8, 1.5, 5.4],
      "Full Treble":          [0, -6.4, -6.4, -6.4, -3, 1.5, 6.6, 9.7, 9.7, 9.7, 10.5],
      "Full Bass & Treble":   [0, 4.3, 3.5, 0, -4.9, -3.4, 0.8, 5, 6.6, 7.4, 7.4],
      "Live":                 [0, -3.4, 0, 2.3, 3.1, 3.5, 3.5, 2.3, 1.5, 1.5, 1.2],
      "Techno":               [0, 4.6, 3.5, 0, -3.8, -3.4, 0, 4.6, 5.8, 5.8, 5.4],
      "Flat":                 [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      "Bass Boost":           [0, 6, 5, 3, 0, 0, 0, 0, 0, 0, 0],
      "Treble Boost":         [0, 0, 0, 0, 0, 0, 0, 3, 5, 6, 6],
      "Loudness":             [0, 5, 4, 2, 0, -1, -1, 0, 2, 4, 5],
      "Vocal":                [0, -3, -2, 0, 2, 4, 4, 2, 0, -1, -2]
    };
    var EQ_BAND_IDS = ["preamp", "eq1", "eq2", "eq3", "eq4", "eq5", "eq6", "eq7", "eq8", "eq9", "eq10"];
    function applyEqPreset(name) {
      var vals = EQ_PRESETS[name];
      if (!vals) return false;
      /* v10.8 (108): "Default" là preset bình thường nhưng khác Flat ở
         balance — chọn nó thì EQ phẳng + balance về giữa
         (resetEqToDefault; hàm khai báo phía dưới nhưng là function
         declaration trong cùng scope nên gọi được nhờ hoisting). */
      if (name === "Default") return resetEqToDefault();
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

    /* v10.8 (108, 04/11 — gỡ thanh extras theo chốt của Hải 08:19
       "trở về như trước cái mặc định nằm trong menu bên trong mà"):
       thanh preset + "Mặc định" NGOÀI XML (v10.7) đã
       GỠ HẲN — nhãn bị cắt ("Preset: Fl...") và thanh lòi ra ngoài tab,
       chồng lên dải tab EQUALIZER/OPTIONS (ảnh điện thoại thật 08:19).
       "Default" (09:08 đổi tên từ "Mặc định" — hiệu ứng trong EQ để
       tiếng Anh) nay là 1 preset BÌNH THƯỜNG đầu EQ_PRESETS (xem trên),
       chọn trong đúng menu PRESETS của skin như Classical/Dance/Rock.
       Chỉ giữ lại dữ liệu/hàm có sẵn (EQ_PRESETS, setAllEqBands,
       setBalance, showEqPresetsMenu); không tạo hệ preset thứ hai.
       - matchEqPresetName(): tên preset đang chọn, suy từ 11 dải hiện
         tại + balance (khớp tuyệt đối 1 preset trong EQ_PRESETS thì trả
         tên đó, không thì null). "Default" và "Flat" trùng đường cong
         phẳng nên xét balance trước: phẳng + balance giữa 0.5 thì là
         "Default", phẳng nhưng balance lệch thì là "Flat". Không lưu
         riêng — dải/balance đã lưu trong playback state nên nạp lại vẫn
         suy đúng; kéo tay 1 dải là lệch khỏi preset ngay. Sau "Default"
         thì khớp "Default". Dùng để in đậm hàng đang chọn trong menu
         PRESETS (xem showEqPresetsMenu). */
    function matchEqPresetName() {
      var allFlat = true;
      for (var i = 0; i < EQ_BAND_IDS.length; i++) {
        var got = drawerState.eqBands[EQ_BAND_IDS[i]];
        if (got == null) got = 0.5;
        if (Math.abs(got - 0.5) > 0.001) { allFlat = false; break; }
      }
      if (allFlat) {
        var bal = (drawerState.balance == null) ? 0.5 : drawerState.balance;
        return (Math.abs(bal - 0.5) < 0.001) ? "Default" : "Flat";
      }
      for (var name in EQ_PRESETS) {
        if (name === "Default" || name === "Flat") continue;
        var vals = EQ_PRESETS[name], ok = true;
        for (var j = 0; j < EQ_BAND_IDS.length; j++) {
          var want = Math.max(0, Math.min(1, (vals[j] + 12) / 24));
          var got2 = drawerState.eqBands[EQ_BAND_IDS[j]];
          if (got2 == null) got2 = 0.5;
          if (Math.abs(got2 - want) > 0.001) { ok = false; break; }
        }
        if (ok) return name;
      }
      return null;
    }
    /* "Default": 1 bấm về EQ phẳng (preamp 0 dB + 10 dải 0 dB — khớp
       đường cong preset "Flat") + balance về giữa 0.5; thumb các slider
       + engine + state lưu đều cập nhật (setAllEqBands đẩy xuống
       sliderRecords kể cả dải Classic + engine qua setFrac; setBalance
       đồng bộ thumb PAN + StereoPannerNode). */
    function resetEqToDefault() {
      setAllEqBands(0);
      setBalance(0.5);
      persistPlayback();
      try { drawClassicEqGraph(); } catch (e) { /* Classic không mở */ }
      return true;
    }
    /* v10.8 (108): thanh extras ĐÃ GỠ (132x14 + nhãn "Preset: ..."
       + nút "Mặc định" trong tab EQ) — xem ghi chú v10.8 ở matchEqPresetName
       phía trên. Nút PRESETS của skin mở lại đúng menu showEqPresetsMenu;
       "Default" là hàng preset thường đầu menu đó. */
    /* Đợt v10.0 (việc 1: winamp-eqf) — module .eqf/.q1 (eqf.js):
       index.html truyền qua opts.eqf (window.AmpEqf, nạp trước
       renderer.js); test tiêm qua opts hoặc global.AmpEqf. Không có
       module thì các hàm eqf trả false / báo lỗi trên ticker, các
       preset có sẵn vẫn chạy bình thường. */
    var EQF = opts.eqf || null;
    if (!EQF && typeof AmpEqf !== "undefined" && AmpEqf) EQF = AmpEqf;
    if (!EQF && typeof window !== "undefined" && window.AmpEqf) EQF = window.AmpEqf;
    /* Đợt 5 (03/11: metadata nhạc) — module tag (metadata.js):
       index.html truyền qua opts.metadata (window.AmpMetadata, nạp
       trước renderer.js); test tiêm qua opts hoặc global.AmpMetadata.
       Không có module thì file local chỉ probe duration bằng thẻ audio
       tạm như cũ (đợt L 9.8), nghệ sĩ/album giữ suy từ thư mục. */
    var META = opts.metadata || null;
    function getMetaLib() {
      if (META) return META;
      try { if (typeof AmpMetadata !== "undefined" && AmpMetadata) { META = AmpMetadata; return META; } } catch (e) { /* bỏ qua */ }
      try { if (typeof window !== "undefined" && window.AmpMetadata) { META = window.AmpMetadata; return META; } } catch (e) { /* bỏ qua */ }
      try { if (typeof globalThis !== "undefined" && globalThis.AmpMetadata) { META = globalThis.AmpMetadata; return META; } } catch (e) { /* bỏ qua */ }
      return null;
    }
    /* Áp 1 bộ frac EQ {preamp, eq1..eq10} (0..1, 0.5 = 0 dB) vào
       drawerState + slider đang hiển thị + lưu state phát. Dùng chung
       cho preset có sẵn và preset .eqf/.q1. Engine chỉ nhận khi slider
       đang hiển thị (đường setFrac EQ_BAND); ngăn kéo đóng thì chỉ đổi
       state, mở lại mới đẩy — như applyEqPreset. */
    function applyEqFracs(fracs) {
      if (!fracs) return false;
      for (var i = 0; i < EQ_BAND_IDS.length; i++) {
        var v = fracs[EQ_BAND_IDS[i]];
        if (typeof v === "number" && isFinite(v)) drawerState.eqBands[EQ_BAND_IDS[i]] = Math.max(0, Math.min(1, v));
      }
      for (var j = 0; j < sliderRecords.length; j++) {
        var rec = sliderRecords[j];
        if (rec.action === "EQ_BAND" && drawerState.eqBands[rec.sliderId] !== undefined) rec.setFrac(drawerState.eqBands[rec.sliderId], true);
      }
      persistPlayback();
      return true;
    }
    /* Áp 1 preset .eqf/.q1 đã parse ({name, hz60..hz16000, preamp}).
       Map vị trí theo eqf.js (hz60→eq1 … hz16000→eq10, preamp→preamp),
       map dB-chính-xác (33 = 0 dB). Không tự bật EQ — nút ON/OFF riêng. */
    function applyEqfPreset(preset) {
      if (!EQF || !preset) return false;
      var fracs = null;
      try { fracs = EQF.eqfPresetToAmpFracs(preset); } catch (e) { return false; }
      return applyEqFracs(fracs);
    }
    var lastLoadedEqf = null; /* {type, presets} của file .eqf/.q1 vừa nạp */
    var lastExportedEqf = null; /* ArrayBuffer .eqf vừa lưu (cho test) */
    function getLastLoadedEqf() { return lastLoadedEqf; }
    function getLastExportedEqf() { return lastExportedEqf; }
    var lastEqPresetsAnchor = null; /* nút PRESETS lần mở menu gần nhất */
    /* Nạp 1 ArrayBuffer .eqf/.q1 đã đọc: parse → lưu → 1 preset thì áp
       ngay, nhiều preset thì mở menu chọn (kiểu menu PRESETS). Trả số
       preset trong file, -1 khi lỗi (đã báo trên ticker). */
    function loadEqfArrayBuffer(ab) {
      if (!EQF) { showTickerError("thieu thu vien eqf"); return -1; }
      var data = null;
      try { data = EQF.parseEqf(ab); } catch (e) { showTickerError("file eqf khong dung dinh dang"); return -1; }
      if (!data || !data.presets || !data.presets.length) { showTickerError("file eqf khong co preset"); return -1; }
      lastLoadedEqf = data;
      if (data.presets.length === 1) {
        applyEqfPreset(data.presets[0]);
        return 1;
      }
      showEqfChooserMenu(data.presets);
      return data.presets.length;
    }
    /* Menu chọn preset trong file .eqf vừa nạp — tái dùng kiểu menu
       PRESETS (nền sáng #ECE9D8, hover #316AC5 — xem showEqPresetsMenu).
       Neo ở nút PRESETS lần mở gần nhất, không có thì góc trái-trên. */
    function showEqfChooserMenu(presets) {
      var T = lastStage;
      if (!T || !presets || !presets.length) return;
      /* v10.8: dùng closer CHUNG (closePlaylistMenus/armPanelCloser) thay
         cho closer riêng cũ — menu này cũng mang [data-pl-menu] (giữ
         nguyên [data-eqf-chooser-menu] để test/truy vấn cũ vẫn thấy). */
      closePlaylistMenus();
      var anchor = lastEqPresetsAnchor || { _absX: 8, _absY: 8 };
      var menu = document.createElement("div");
      menu.dataset.eqfChooserMenu = "1";
      menu.dataset.plMenu = "1";
      menu.style.position = "absolute";
      menu.style.left = (anchor._absX || 0) + "px";
      menu.style.top = ((anchor._absY || 0) + 12) + "px";
      menu.style.background = "#ECE9D8"; menu.style.border = "1px solid #ACA899";
      menu.style.zIndex = "10"; menu.style.pointerEvents = "auto";
      menu.style.font = "11px Arial, sans-serif"; menu.style.color = "#000";
      for (var i = 0; i < presets.length; i++) {
        (function (preset) {
          var row = document.createElement("div");
          row.textContent = preset.name || "(khong ten)";
          row.style.padding = "4px 10px"; row.style.cursor = "pointer"; row.style.whiteSpace = "nowrap";
          row.dataset.eqfPresetName = preset.name || "";
          row.onmouseover = function () { row.style.background = "#316AC5"; row.style.color = "#fff"; };
          row.onmouseout = function () { row.style.background = ""; row.style.color = ""; };
          row.onclick = function (ev) {
            if (ev && ev.stopPropagation) ev.stopPropagation();
            closePlaylistMenus();
            applyEqfPreset(preset);
            requestRerender();
          };
          menu.appendChild(row);
        })(presets[i]);
      }
      T.appendChild(menu);
      placePopupInStage(menu, anchor, presets.length);
      armPanelCloser(anchor); /* v10.9: neo anchor (xem armPanelCloser) */
    }
    /* Mở hộp chọn file .eqf/.q1 (accept .eqf,.q1), đọc bằng arrayBuffer
       (FileReader làm fallback), rồi loadEqfArrayBuffer. */
    function openEqfPicker() {
      if (!document || !document.createElement) return false;
      var inp = document.createElement("input");
      inp.type = "file";
      try { inp.setAttribute("accept", ".eqf,.q1"); } catch (e) { /* bỏ qua */ }
      inp.style.display = "none";
      inp.addEventListener("change", function () {
        var f = (inp.files && inp.files[0]) || null;
        try { if (inp.parentElement) inp.parentElement.removeChild(inp); } catch (e) { /* bỏ qua */ }
        if (!f) return;
        if (f.arrayBuffer) {
          f.arrayBuffer().then(function (ab) { loadEqfArrayBuffer(ab); }).catch(function () { showTickerError("khong doc duoc file eqf"); });
        } else if (typeof FileReader !== "undefined") {
          var rd = new FileReader();
          rd.onload = function () { loadEqfArrayBuffer(rd.result); };
          rd.onerror = function () { showTickerError("khong doc duoc file eqf"); };
          try { rd.readAsArrayBuffer(f); } catch (e) { showTickerError("khong doc duoc file eqf"); }
        } else { showTickerError("khong doc duoc file eqf"); }
      });
      var host = (document.body || lastStage || document.documentElement);
      if (host) host.appendChild(inp);
      if (inp.click) inp.click();
      return true;
    }
    /* Lưu EQ hiện tại ra file .eqf 1 preset tên "Entry1" (tên mặc định
       của Winamp khi lưu preset lẻ), tải về amp-eq.eqf. Trả ArrayBuffer
       (null khi thiếu thư viện). Mở lại được bằng Winamp PC. */
    function exportCurrentEqf() {
      if (!EQF) { showTickerError("thieu thu vien eqf"); return null; }
      var fracs = {};
      for (var i = 0; i < EQ_BAND_IDS.length; i++) {
        var v = drawerState.eqBands[EQ_BAND_IDS[i]];
        fracs[EQ_BAND_IDS[i]] = (typeof v === "number" && isFinite(v)) ? v : 0.5;
      }
      var ab = null;
      try {
        var preset = EQF.ampFracsToEqfPreset(fracs, "Entry1");
        ab = EQF.createEqf({ presets: [preset] });
      } catch (e) { return null; }
      lastExportedEqf = ab;
      try {
        if (typeof Blob !== "undefined" && typeof URL !== "undefined" && URL.createObjectURL && document && document.createElement) {
          var blob = new Blob([ab], { type: "application/octet-stream" });
          var a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = "amp-eq.eqf";
          if (a.click) a.click();
        }
      } catch (e) { /* chỉ giữ lastExportedEqf */ }
      return ab;
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
      /* v10.8 (c): from-bottom + AVS mo thi ngan keo xep duoi AVS — day
         tham chieu la day AVS (= day main + 116), khong phai day main
         (xem mainB trong renderLayoutInner). */
      if (avsState.open && !avsState.detached && RES.embeddedAvs && avsFromBottom()) mainH += VIDEO_SHIFT;
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
      /* v10.8 (c): from-bottom thì AVS ở DƯỚI main — kỳ vọng đổi: AVSGroup
         _absY = ea.y + mainH (đỉnh AVS chạm đáy main), main ở yên y=35,
         video.group cũng lùi xuống mainH theo nhóm AVS. */
      var fromBottomChk = avsFromBottom();
      var mainHChk = mainDiv ? (parseInt(mainDiv.style.height || "0", 10) || 0) : 0;
      if (avsDiv) {
        if (!ea) errs.push("AVSGroup hien nhung skin khong co embeddedAvs");
        else {
          var expAvsY = fromBottomChk ? ea.y + mainHChk : ea.y;
          if ((avsDiv._absY || 0) !== expAvsY) errs.push("AVSGroup _absY " + (avsDiv._absY || 0) + ", dung ra " + expAvsY + (fromBottomChk ? " (from-bottom: ea.y + mainH)" : ""));
          var aw = parseInt(avsDiv.style.width || "0", 10) || 0, ah = parseInt(avsDiv.style.height || "0", 10) || 0;
          if (aw !== ea.w || ah !== ea.h) errs.push("AVSGroup " + aw + "x" + ah + ", dung ra " + ea.w + "x" + ea.h);
          var expMainY = fromBottomChk ? 35 : 35 + VIDEO_SHIFT;
          if (mainDiv && (mainDiv._absY || 0) !== expMainY) errs.push("mo AVS nhung ma main _absY " + (mainDiv._absY || 0) + ", dung ra " + expMainY + (fromBottomChk ? " (from-bottom: main o yen)" : " (35+116)"));
          if (!vgDiv) errs.push("AVS mo nhung nhung khong thay video.group");
          else {
            var vx = vgDiv._absX || 0, vy = vgDiv._absY || 0;
            var vw = parseInt(vgDiv.style.width || "0", 10) || 0, vh = parseInt(vgDiv.style.height || "0", 10) || 0;
            var expVy = ea.y + (fromBottomChk ? mainHChk : 0) + ea.videoRect.y;
            if (vx !== ea.videoRect.x || vy !== expVy || vw !== ea.videoRect.w || vh !== ea.videoRect.h) {
              errs.push("video.group (" + vx + "," + vy + "," + vw + "x" + vh + "), dung ra (" + ea.videoRect.x + "," + expVy + "," + ea.videoRect.w + "x" + ea.videoRect.h + ")");
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
    var mlListDiv = null, mlTreeDiv = null, mlSearchInput = null, mlFilter = "all", mlFilterText = "", mlSelected = -1;
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
      /* v10.13 — "Tự mở cửa sổ video khi phát video": mặc định BẬT (xem
         AUTO_OPEN_VIDEO_KEY dưới đây — tùy chọn riêng của Amp, không có
         trong XML skin nào). */
      "Auto-open Video Window when playing video": "on",
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
    /* v10.13 — khóa tổng hợp cho tick Options "Tự mở cửa sổ video khi phát
       video" (chốt của Hải 04/11 14:46): Winamp thật không có tùy chọn này
       nên không skin nào có cfgattrib cho nó; dùng khóa "amp;..." trong
       cfgState để lưu/khôi qua cùng đường localStorage (amp9-cfg-v9) như
       các tick Options khác — getCfgState/restoreCfgState không lọc khóa
       này nên nó tự đi theo. Tiền tố "amp;" để không đụng GUID cfgattrib
       của skin. Mặc định BẬT (CFG_DEFAULTS): phát kênh video thì tự mở
       cửa sổ video như từ v8 tới nay; tắt thì phát TV chỉ nghe tiếng,
       cửa sổ video không tự mở — mở tay bằng nút video / menu View. */
    var AUTO_OPEN_VIDEO_SUFFIX = "Auto-open Video Window when playing video";
    var AUTO_OPEN_VIDEO_KEY = "amp;" + AUTO_OPEN_VIDEO_SUFFIX;
    function applyCfgDefaults() {
      var names = Object.keys(CFG_DEFAULTS);
      for (var i = 0; i < names.length; i++) {
        var at = cfgAttribBySuffix(names[i]);
        if (at && !cfgState.has(at)) cfgState.set(at, CFG_DEFAULTS[names[i]]);
      }
      if (!cfgState.has(AUTO_OPEN_VIDEO_KEY)) cfgState.set(AUTO_OPEN_VIDEO_KEY, CFG_DEFAULTS[AUTO_OPEN_VIDEO_SUFFIX]);
    }
    applyCfgDefaults();
    function autoOpenVideoEnabled() { return cfgOn(AUTO_OPEN_VIDEO_KEY); }
    function toggleAutoOpenVideo() {
      var on = !autoOpenVideoEnabled();
      cfgState.set(AUTO_OPEN_VIDEO_KEY, on ? "on" : "off");
      persistCfg();
      return on;
    }
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
    /* v10.8 — "Open Video/Vis from the bottom" (optionsgroup.misc):
       AVS nhúng mở DƯỚI main thay vì trên (mặc định from-the-top: AVS
       trên, main lùi 116). Hai radio cùng GUID nên độc quyền nhau (xem
       toggleCfg); mặc định top=on/bottom=off (CFG_DEFAULTS). Chỉ tác
       dụng với AVS nhúng (Modern); Classic không có AVS nhúng nên
       không đổi gì. Xem renderLayoutInner (đẩy nhóm AVS xuống đáy main
       thay vì đẩy main xuống) + runAvsSelfCheck. */
    function avsFromBottom() {
      return cfgSuffixOn("Open Video/Vis from the bottom", false);
    }
    /* Đợt B (9.9) — nút Video/Vis trên cửa sổ chính làm gì, theo tùy chọn
       visbutton (optionsgroup.visbutton): "Open Configuration" -> mở ngăn
       kéo ở tab Options/trang visbutton; "Open Context Menu" -> mở menu
       ngữ cảnh Video/Vis (visContextMenuItems); không chọn gì -> mở/đóng
       AVS (mặc định, như Winamp thật).
       v10.8: menu ngữ cảnh ĐÃ KHÔI PHỤC (từng gỡ ở v10.5) và NỐI ĐÚNG
       TICK "Open Context Menu" — tick bật thì nút mở menu (đính chính
       của Hải 08:48: nút oval ▼ ảnh 13 chính là videoavs.open, trước
       đây bấm nó mở menu điều khiển bên trong); tick tắt (mặc định)
       thì nút mở AVS như v10.5. */
    function visButtonAction() {
      if (cfgSuffixOn("Open Context Menu", false)) return "menu";
      if (cfgSuffixOn("Open Configuration", false)) return "config";
      return "toggle";
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

    /* v10.10 — ĐO MÉP PHẢI NHÌN THẤY CỦA NÚT (thumb) từ bitmap thật của
       skin đang nạp (không hardcode số 566 — skin khác có nút khác):
       NGUYÊN NHÂN LỖI MAX (Hải 04/11 10:21, ảnh trên điện thoại thật):
       công thức v10.9 cho fill kết thúc đúng MÉP PHẢI CỦA DIV NÚT
       (thumb 21px: fill 185..269 = thumb 248..269, đo DOM headless
       Chrome 360px + fit zoom: fillRight == thumbRight, sai số 0) —
       nhưng bitmap nút có ~2,5px trong suốt ở mép phải (button_volume.png:
       cột x=17 alpha 240, x=18 alpha 93, x=19 alpha 26, x=20 alpha 3;
       nút trắng nhìn thấy chỉ tới ~x=18,5) nên mắt người vẫn thấy ~2,5px
       vạch xanh thừa ra phải nút trắng. Tương tự seek (36px: hết alpha
       >128 ở x=33 → 34), shade volume (16px → 14), shade seek (24px → 22).
       Đo: cắt đúng vùng crop của bitmap nút, quét từ phải sang tìm cột
       cuối có alpha > 128 (nét rõ, kể cả viền tối của nút) → visibleRight
       = cột đó + 1 (px trong ô nút). Trả null khi không đo được (jsdom /
       không canvas / ảnh lỗi) → gọi dùng tw (hành vi cũ). Cache theo id
       bitmap trong lần nạp skin này (renderer mới mỗi skin nên không
       lẫn skin khác). */
    var thumbVisibleRightCache = new Map();
    async function measureThumbVisibleRight(bitmapId) {
      if (!bitmapId) return null;
      if (thumbVisibleRightCache.has(bitmapId)) return thumbVisibleRightCache.get(bitmapId);
      var v = null;
      try {
        var info = await bitmapInfoCached(bitmapId);
        if (info && info.file) {
          var url = await RES.fileURL(info.file);
          var im = await loadImage(url);
          if (im && im.naturalWidth > 0 && typeof document !== "undefined" && document.createElement) {
            var cw = info.crop ? info.crop.w : info.w, ch = info.crop ? info.crop.h : info.h;
            var cx0 = info.crop ? info.crop.x : 0, cy0 = info.crop ? info.crop.y : 0;
            var cv = document.createElement("canvas");
            var cx = cv.getContext ? cv.getContext("2d") : null;
            if (cx && cw > 0 && ch > 0) {
              cv.width = cw; cv.height = ch;
              cx.drawImage(im, cx0, cy0, cw, ch, 0, 0, cw, ch);
              var d = cx.getImageData(0, 0, cw, ch).data;
              for (var x = cw - 1; x >= 0 && v === null; x--) {
                for (var y = 0; y < ch; y++) {
                  if (d[(y * cw + x) * 4 + 3] > 128) { v = x + 1; break; }
                }
              }
            }
          }
        }
      } catch (e) { v = null; }
      thumbVisibleRightCache.set(bitmapId, v);
      return v;
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
    /* Đợt v10.0 (việc 6: viên KBPS/KHZ): bảng font "khuôn" (stencil) đo
       sẵn — chỉ dùng khi không đo được từ bitmap (jsdom không có canvas
       2d; trình duyệt thật đo trực tiếp trong loadFont, bảng này không
       thắng phép đo). Giá trị đo từ songinfofont.png của skin 566:
       58/62 góc ô đục (pe.time.font: 0/62, không phải khuôn). */
    var STENCIL_FONT_IDS = { "player.songinfo.font": true };
    async function loadFont(fontId) {
      /* Đợt v10.0 (việc 6, sửa hồi quy batch-d): cache CẢ lần tải lỗi
         (fontCache[fontId] = null) — dùng hasOwnProperty thay cho kiểm
         truthy, vì null là falsy nên bản cũ thử lại ảnh font ở MỖI glyph
         (mỗi lần 1 macrotask qua loadImage) khiến mỗi lần render tốn
         hàng chục macrotask, hàng render dồn lại chưa xử lý hết thì
         lastStage còn trỏ div build → popup (bảng thông tin bài) mở ra
         rơi vào div build rồi mất. Font lỗi trong skin đã nạp là lỗi
         xác định (không phải mạng chập chờn) nên cache lỗi là đúng. */
      if (Object.prototype.hasOwnProperty.call(fontCache, fontId)) return fontCache[fontId];
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
      /* Đợt v10.0 (việc 6): phát hiện font "khuôn" (stencil) — các ô
         glyph đục với lỗ chữ trong suốt: góc các ô phần lớn đục. Đo
         trực tiếp từ bitmap (màu ô ghi vào stencilColor để dải đệm
         cùng màu); đo lỗi (canvas tainted) thì giữ false. */
      var stencil = false, stencilColor = "#fff";
      try {
        var regionW = bmp.crop ? bmp.crop.w : img.naturalWidth;
        var regionH = bmp.crop ? bmp.crop.h : img.naturalHeight;
        var cols = Math.max(1, Math.floor(regionW / cw)), rows = Math.max(1, Math.floor(regionH / chh));
        var imgData = ctx.getImageData(baseX, baseY, cols * cw, rows * chh).data;
        var opaque = 0, total = 0, firstRgb = null;
        for (var r0 = 0; r0 < rows; r0++) {
          for (var c0 = 0; c0 < cols; c0++) {
            var corners = [[0, 0], [cw - 1, 0], [0, chh - 1], [cw - 1, chh - 1]];
            for (var k = 0; k < 4; k++) {
              var px = (r0 * chh + corners[k][1]) * cols * cw * 4 + (c0 * cw + corners[k][0]) * 4;
              var a = imgData[px + 3];
              total++;
              if (a > 128) {
                opaque++;
                if (!firstRgb) firstRgb = "rgb(" + imgData[px] + "," + imgData[px + 1] + "," + imgData[px + 2] + ")";
              }
            }
          }
        }
        if (total && opaque / total > 0.5) { stencil = true; if (firstRgb) stencilColor = firstRgb; }
      } catch (e) { /* không đo được: giữ false */ }
      var rec = { img: img, canvas: canvas, ctx: ctx, baseX: baseX, baseY: baseY, charwidth: f.charwidth, charheight: f.charheight, hspacing: f.hspacing, vspacing: f.vspacing, stencil: stencil, stencilColor: stencilColor };
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
      /* v10.3 (H1 ticker trang): Winamp/WACUP ve bitmapfont bang cach dung
         anh glyph lam mat na roi TO DAC bang mau font — ke ca mau trang.
         Truoc day cho nay bo qua buoc to khi col la trang nen glyph chi
         con alpha goc cua anh (~10% — do tren Songtickerfont.png: mean
         alpha 26,1/255) -> chu ticker trang gan nhu trong suot. Nay LUON
         to dac voi colorOf(color) cho moi mau. Cac cho khac dung bitmap
         font (dong ho, KBPS/KHZ) di chung qua glyphURL nen duoc sua luon;
         khong co cho nao khac loai tru trang (da soat: chi co cho nay). */
      var col = colorOf(color);
      cx.globalCompositeOperation = "source-in";
      cx.fillStyle = col;
      cx.fillRect(0, 0, cw, chh);
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
      var holderLeft = 0, holderTop = 0;
      if (align === "center" && boxW && totalW < boxW) holderLeft = Math.floor((boxW - totalW) / 2);
      if (align === "right" && boxW && totalW < boxW) holderLeft = Math.floor(boxW - totalW);
      if (holderLeft) holder.style.marginLeft = holderLeft + "px";
      if (valign !== "top" && boxH && boxH > font.charheight) {
        /* Lỗi 4 (chữ tab lòi lên trên): holder là <span> inline nên
           margin-top bị trình duyệt bỏ qua, chữ dính lên đầu hộp.
           Đặt inline-block để margin căn giữa có tác dụng. Chỉ ảnh
           hưởng các text cần căn giữa (boxH > charheight); timer BIGNUM
           boxH=20=charheight nên không đổi. */
        holderTop = Math.round((boxH - font.charheight) / 2);
        holder.style.display = "inline-block";
        holder.style.marginTop = holderTop + "px";
      }
      /* Đợt v10.0 (việc 6: viên KBPS/KHZ): font khuôn thì thêm đệm trắng
         quanh holder — chữ số chạm mép viên vì bearings của songinfofont
         là 0px trái / 1px phải / 1px trên / 1px dưới (+1 hàng tách trong
         suốt ở đáy ô). Đệm = 4 dải trắng RỜI đặt ngoài vùng glyph (không
         phải nền sau holder — nền trắng sau holder sẽ lấp lỗ chữ trong
         suốt, chữ biến mất). div có padding = pad nên hộp clip
         (overflow:hidden cắt ở mép padding-box) vẫn chứa đủ 4 dải; vị
         trí glyph không đổi (content box giữ nguyên). Chỉ font khuôn
         mới có đệm; pe.time.font/BIGNUM/smallfont không phải khuôn nên
         giữ nguyên. */
      var frec = null;
      try { frec = await loadFont(fontId); } catch (e) { frec = null; }
      /* Phép đo trong loadFont thắng khi có (trình duyệt thật); khi
         frec null (tải lỗi) hoặc frec.stencil undefined (jsdom không có
         canvas 2d) thì dùng bảng đo sẵn. */
      var isStencil = (frec && frec.stencil !== undefined) ? !!frec.stencil : (STENCIL_FONT_IDS[fontId] === true);
      var pad = (isStencil && totalW > 0) ? 2 : 0;
      div._stencilPad = pad;
      if (pad > 0) {
        div.style.padding = pad + "px";
        var padCol = (frec && frec.stencilColor) || "#fff";
        var strips = [
          [holderLeft, pad + holderTop, pad, font.charheight],
          [pad + holderLeft + totalW, pad + holderTop, pad, font.charheight],
          [holderLeft, holderTop, totalW + 2 * pad, pad],
          [holderLeft, pad + holderTop + font.charheight, totalW + 2 * pad, pad]
        ];
        for (var pi = 0; pi < strips.length; pi++) {
          var st = strips[pi];
          var s = document.createElement("span");
          s.className = "stencil-pad";
          s.style.position = "absolute";
          s.style.left = st[0] + "px"; s.style.top = st[1] + "px";
          s.style.width = st[2] + "px"; s.style.height = st[3] + "px";
          s.style.background = padCol;
          div.appendChild(s);
        }
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
    /* v10.12 (P1 D) — tra XUI theo tên đầy đủ: phần tử <Wasabi:...> trong
       XML mang data-xui (loader ghi khi lột namespace) hoặc giữ nguyên tên
       có ":" khi XML đọc thẳng không qua cleanXml. Tra xuiMap (groupdef
       xuitag) — vd wasabi:standardframe:nostatus -> wasabi.standardframe.
       nostatusbar (Copperdeck ML/Video), wasabi:mainframe:nostatus ->
       wasabi.mainframe.nostatusbar (566, trùng kết quả frameGroupFor cũ).
       Chỉ nhận khi groupdef đích tồn tại. */
    function xuiMapForEl(el, fullTag) {
      if (!RES || !RES.xuiMap) return null;
      var key = null;
      try { key = el.getAttribute("data-xui") || null; } catch (e) { key = null; }
      if (!key && fullTag && fullTag.indexOf(":") >= 0) key = fullTag;
      if (!key) return null;
      var gid = RES.xuiMap[String(key).toLowerCase()] || null;
      if (gid && RES.groupdefs[gid]) return gid;
      return null;
    }
    /* v10.12 (P1 D) — tra xuiMap theo tên tag trần (cho tag lạ không có
       namespace, vd copcheckbox/copradiobut/editbox2/ratings). Chỉ gọi ở
       cuối renderNode, sau mọi nhánh đã biết, để không cướp tag quen. */
    function xuiMapForTag(tag) {
      if (!RES || !RES.xuiMap) return null;
      var t = String(tag || "").toLowerCase();
      var gid = RES.xuiMap[t] || RES.xuiMap["wasabi:" + t] || null;
      if (gid && RES.groupdefs[gid]) return gid;
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
        /* v10.12 (P1 D): thẻ <ColorThemes:...> trong XML gốc — qua cleanXml
           thì tag lột thành trần (vd "list") + data-xui="colorthemes:list",
           nên phải kiểm tra cả data-xui, nếu không nhánh <list> sẽ vẽ nhầm
           một danh sách trống lên trên khung. */
        var _xuiAttr = "";
        try { _xuiAttr = el.getAttribute("data-xui") || ""; } catch (e) { _xuiAttr = ""; }
        if (SKIP_TAGS[tag] || tag.indexOf("colorthemes:") === 0 || _xuiAttr.toLowerCase().indexOf("colorthemes:") === 0) continue;
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
        var _childBefore = parentEl.children ? parentEl.children.length : 0;
        await renderNode(el, tag, parentEl, parentW, parentH, x, y, ctx, depth);
        /* v10.23 (1) — Đánh dấu phần tử neo mép phải/đáy + co giãn để xem
           trước khi kéo (resizeMove) dời đúng theo khung mới. Trước đây
           chỉ layer/rect relatw được data-stretch, còn phần tử relatx/
           relaty (hàng nút đáy playlist y=-23 relaty=1, nút Manage
           Playlist/time/resizer x<0 relatx=1, nút titlebar, khung frame)
           KHÔNG được đánh dấu nên lúc kéo chúng ở yên vị trí cũ, list
           giãn đè lên → vệt đen/bóng ma + hàng nút biến mất khỏi đáy
           (Hải 04/11 21:03, video f018). Ghi ở div cấp cao nhất mà
           renderNode vừa gắn vào parentEl (con mới đầu tiên); nhóm
           relatw/relath cũng được data-stretch để giãn theo khung. */
        try {
          var _rx22 = el.getAttribute("relatx"), _ry22 = el.getAttribute("relaty");
          var _rw22 = el.getAttribute("relatw"), _rh22 = el.getAttribute("relath");
          /* Nhóm <group>: cỡ relatw/relath thường nằm ở GROUPDEF chứ
             không ở instance (vd pledit.buttons.group relatw=1 w=0,
             pl.frame.layout relath=1 h=-35 — instance chỉ có x/y/relaty).
             Lấy theo đúng luật renderGroupInstance/groupSize: instance
             có w/h thì dùng relat của instance, không thì của groupdef. */
          if (tag === "group") {
            var _gd22 = null;
            try { _gd22 = RES.groupdefEls ? (RES.groupdefEls[el.getAttribute("id") || ""] || null) : null; } catch (e22g) { _gd22 = null; }
            if (_gd22) {
              if (el.getAttribute("w") === null && !_rw22) _rw22 = _gd22.getAttribute("relatw");
              if (el.getAttribute("h") === null && !_rh22) _rh22 = _gd22.getAttribute("relath");
            }
          }
          if ((_rx22 === "1" || _ry22 === "1" || _rw22 === "1" || _rh22 === "1") && parentEl.children && parentEl.children.length > _childBefore) {
            var _top22 = parentEl.children[_childBefore];
            /* Khoảng cách từ mép trái/trên của div tới mép phải/dưới của
               nhóm cha (tính từ left/top THẬT của div, vì vài nhánh dời x
               trước khi vẽ — vd overlay titlebar). Lúc kéo, left mới =
               rộng cha mới − khoảng cách này (neo đúng mép phải/đáy). */
            if (_rx22 === "1") _top22.dataset.anchorR = String(parentW - (parseInt(_top22.style.left || "0", 10) || 0));
            if (_ry22 === "1") _top22.dataset.anchorB = String(parentH - (parseInt(_top22.style.top || "0", 10) || 0));
            /* Co giãn THEO CHIỀU (v10.23): chỉ chiều nào relat mới giãn
               chiều đó. Trước đây data-stretch chung làm preview đổi cả
               rộng lẫn cao cho mọi phần tử (nhóm nút đáy playlist cao
               21px bị kéo cao theo cửa sổ -> nút kẹt giữa list). */
            if (_rw22 === "1") _top22.dataset.stretchW = "1";
            if (_rh22 === "1") _top22.dataset.stretchH = "1";
            if ((_rw22 === "1" || _rh22 === "1") && !_top22.dataset.stretch) _top22.dataset.stretch = "1";
          }
        } catch (e22) { /* bỏ qua */ }
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
      /* Đợt v10.0 (việc 2: display/vis/beat — quy tắc XML, ghi đè đợt D):
         nhóm beat KHÔNG kiểm fit ở đây: groupSize() trả parentW (305)
         khi groupdef không có w — không phải độ rộng nội dung thật
         (167). Fit đo SAU khi vẽ xong, theo mép phải thật của các lớp
         con đã vẽ (xem pruneBeatGroupIfOverflows trong renderLayoutInner):
         ở 354 thì nội dung 200..372 tràn → gỡ cả nhóm, không còn dải
         sọc đè nút Repeat tới chữ "R"; kéo rộng ≥372 thì giữ. Vạch vis
         (<vis>) nằm ngoài nhóm này nên vẫn hiện. */
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
      /* Tab Options / Color Themes: vẽ thêm phần bị SKIP_TAGS bỏ qua.
         v10.8 (108): tab Equalizer KHÔNG vẽ thêm gì — thanh extras đã gỡ
         hẳn (xem ghi chú v10.8 ở matchEqPresetName); nhánh này rơi xuống
         renderChildren chung ở cuối hàm như mọi group khác. */
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

    /* v10.12 (P1 D) — phần tử <group> tổng hợp để vẽ lại 1 groupdef qua
       renderGroupInstance (dùng cho TitleBox/XUI: groupdef đích không có
       phần tử <group> thật trong XML). Sao chép w/h/relat từ phần tử gốc
       khi có; không có thì lấy cỡ từ groupdef. */
    function synthGroupEl(gid, srcEl) {
      var g = document.createElement("group");
      g.setAttribute("id", gid);
      if (srcEl) {
        var w0 = srcEl.getAttribute("w"), h0 = srcEl.getAttribute("h");
        if (w0 !== null) g.setAttribute("w", w0);
        if (h0 !== null) g.setAttribute("h", h0);
        var rw = srcEl.getAttribute("relatw"), rh = srcEl.getAttribute("relath");
        if (rw !== null) g.setAttribute("relatw", rw);
        if (rh !== null) g.setAttribute("relath", rh);
      }
      return g;
    }
    /* Rộng nội dung thật của 1 groupdef: mép phải lớn nhất của các <layer>
       con (x + rộng bitmap). Dùng khi groupdef có w="0" (vd nhóm trái của
       TitleBox) mà vẫn cần biết nó rộng bao nhiêu để đặt nhóm giữa. */
    async function groupContentWidth(gid) {
      var kids = RES.groupdefs[gid] || [], mw = 0;
      for (var i = 0; i < kids.length; i++) {
        if (lowerTag(kids[i]) !== "layer") continue;
        var info = await bitmapInfoCached(kids[i].getAttribute("image"));
        if (!info) continue;
        var lx = intAttr(kids[i], "x", 0);
        var lw = kids[i].getAttribute("w") !== null ? intAttr(kids[i], "w", 0) : (info.w || 0);
        if (lx + lw > mw) mw = lx + lw;
      }
      return mw;
    }
    /* v10.12 (P1 D) — <Wasabi:TitleBox>: khung tiêu đề 3 mảnh
       (wasabi.titlebox.left/center/right.group) + chữ tiêu đề
       (:componentname = thuộc tính title của phần tử) + nhóm nội dung
       (content) bên dưới. Dải tiêu đề cao bằng nhóm center (XML); nhóm
       left rộng theo nội dung thật, center rộng theo chữ tiêu đề,
       right giãn hết phần còn lại. Nội dung: có wasabi.titlebox.main.group
       thì vẽ khung hộp của nó + đặt nhóm nội dung đúng vị trí CustomObject
       titlebox.content; không có thì vẽ thẳng nhóm nội dung dưới dải tiêu đề. */
    async function renderTitleBox(el, parentEl, parentW, parentH, x, y, ctx, depth) {
      var w = el.getAttribute("w") !== null ? relSize(el, "w", parentW) : parentW;
      var h = el.getAttribute("h") !== null ? relSize(el, "h", parentH) : parentH;
      if (w <= 0 || h <= 0) return;
      var title = el.getAttribute("title") || "";
      var contentId = el.getAttribute("content") || "";
      var div = document.createElement("div");
      div.style.position = "absolute"; div.style.left = x + "px"; div.style.top = y + "px";
      div.style.width = w + "px"; div.style.height = h + "px";
      div.style.pointerEvents = "none";
      setAbs(div, parentEl, x, y);
      div.dataset.titlebox = "1";
      parentEl.appendChild(div);
      var tctx = {};
      for (var k in ctx) tctx[k] = ctx[k];
      tctx.titleText = title || ctx.titleText || "";
      /* Dải tiêu đề vẽ bằng stripCtx: 7 text titlebox.text (6 bóng + 1
         chính) không có display/default — chữ của chúng là title của
         TitleBox, script titlebox.maki điền lúc chạy (xem xuiLabelText). */
      var stripCtx = {};
      for (var k2 in tctx) stripCtx[k2] = tctx[k2];
      stripCtx.xuiLabelText = title;
      var stripH = 13;
      var centerGd = RES.groupdefEls["wasabi.titlebox.center.group"];
      if (centerGd) stripH = intAttr(centerGd, "h", 0) || stripH;
      var leftW = 0;
      var leftGd = RES.groupdefEls["wasabi.titlebox.left.group"];
      if (leftGd) leftW = intAttr(leftGd, "w", 0) || 0;
      if (!leftW && RES.groupdefs["wasabi.titlebox.left.group"]) leftW = await groupContentWidth("wasabi.titlebox.left.group");
      var centerW = 0;
      var ck = RES.groupdefs["wasabi.titlebox.center.group"] || [];
      for (var cki = 0; cki < ck.length; cki++) {
        if (lowerTag(ck[cki]) !== "text") continue;
        var cfont = RES.fonts[ck[cki].getAttribute("font") || ""];
        var adv = (cfont && (cfont.charwidth + cfont.hspacing) > 0) ? (cfont.charwidth + cfont.hspacing) : 7;
        centerW = Math.max(centerW, title.length * adv + 16);
      }
      if (!centerW || centerW <= 0) centerW = Math.max(20, title.length * 7 + 16);
      var rightW = Math.max(0, w - leftW - centerW);
      if (RES.groupdefs["wasabi.titlebox.left.group"]) {
        await renderGroupInstance(synthGroupEl("wasabi.titlebox.left.group", null), div, w, stripH, 0, 0, stripCtx, depth + 1);
      }
      if (RES.groupdefs["wasabi.titlebox.center.group"]) {
        await renderGroupInstance(synthGroupEl("wasabi.titlebox.center.group", null), div, w, stripH, leftW, 0, stripCtx, depth + 1);
      }
      if (RES.groupdefs["wasabi.titlebox.right.group"]) {
        await renderGroupInstance(synthGroupEl("wasabi.titlebox.right.group", null), div, w, stripH, leftW + centerW, 0, stripCtx, depth + 1);
      }
      if (!contentId || !RES.groupdefs[contentId]) return;
      var bodyH = Math.max(0, h - stripH);
      if (bodyH <= 0) return;
      var mainGd = RES.groupdefs["wasabi.titlebox.main.group"];
      if (mainGd) {
        var frameKids = RES.groupdefs["wasabi.titlebox"] || [];
        if (frameKids.length) await renderChildren(frameKids, div, w, h, tctx, depth + 1);
        var co = null;
        for (var ci = 0; ci < mainGd.length; ci++) {
          if (lowerTag(mainGd[ci]) === "customobject" && (mainGd[ci].getAttribute("id") || "") === "titlebox.content") { co = mainGd[ci]; break; }
        }
        if (co) {
          var cx = relPos(co, "x", w), cy = relPos(co, "y", h);
          await renderGroupInstance(synthGroupEl(contentId, null), div, w, h, cx, cy, tctx, depth + 1);
        } else {
          await renderGroupInstance(synthGroupEl(contentId, null), div, w, h, 0, stripH, tctx, depth + 1);
        }
        var rest = mainGd.filter(function (e) { return lowerTag(e) !== "customobject"; });
        if (rest.length) await renderChildren(rest, div, w, h, tctx, depth + 1);
      } else {
        await renderGroupInstance(synthGroupEl(contentId, null), div, w, bodyH, 0, stripH, tctx, depth + 1);
      }
    }
    /* v10.12 (P1 D) — <list>: danh sách cơ bản. Trong cửa sổ playlist thì
       hiện các mục playlist hiện tại (số + tên); nơi khác thì khung trống
       có ghi chú (dữ liệu của list do MAKI/script của skin quyết định,
       Amp không bịa). */
    function renderList(el, parentEl, parentW, parentH, x, y, ctx) {
      var w = el.getAttribute("w") !== null ? relSize(el, "w", parentW) : parentW;
      var h = el.getAttribute("h") !== null ? relSize(el, "h", parentH) : parentH;
      if (w <= 0 || h <= 0) return;
      var div = document.createElement("div");
      div.style.position = "absolute"; div.style.left = x + "px"; div.style.top = y + "px";
      div.style.width = w + "px"; div.style.height = h + "px";
      div.style.overflowY = "auto"; div.style.overflowX = "hidden";
      div.style.background = colorOf("wasabi.list.background");
      div.style.color = colorOf("wasabi.list.text");
      div.style.font = "11px Arial, sans-serif";
      div.style.pointerEvents = "auto";
      setAbs(div, parentEl, x, y);
      div.dataset.list = "1";
      parentEl.appendChild(div);
      if (ctx && ctx.windowKind === "playlist") {
        /* v10.18 — tieu de nhom thu gon/mo ra: ve lai khung list cuc bo
           khi bam tieu de (refreshPlaylistRows chi ve lai Pledit +
           Classic, khong cham toi <list> nay). */
        var fillListRows = function () {
          var olds = div.querySelectorAll(".group-header, .pl-row");
          for (var o = 0; o < olds.length; o++) if (olds[o].parentElement) olds[o].parentElement.removeChild(olds[o]);
          var rows = [];
          try { rows = playlistGroupedRows(); } catch (e) { rows = []; }
          for (var i = 0; i < rows.length; i++) {
            if (rows[i].header) { /* v10.18 — tieu de nhom: icon thu muc + bam thu gon/mo ra */
              var gh = plGroupHeaderEl(rows[i], fillListRows);
              gh.style.whiteSpace = "nowrap"; gh.style.overflow = "hidden";
              gh.style.textOverflow = "ellipsis"; gh.style.lineHeight = "13px";
              gh.style.padding = "0 3px"; gh.style.fontWeight = "bold";
              /* v10.20 (2) — tiêu đề nhóm KHÔNG CÒN NỀN MÀU (Hải 19:07
                 "Màu chuyên mục cũng còn": nền pha 35% v10.19 vẫn là
                 dải xanh rõ trên máy thật): nền trong suốt = đúng nền
                 bình thường của danh sách, chỉ giữ chữ đậm + icon thư
                 mục + màu chữ bình thường. Hàng kênh đang chọn/đang hát
                 giữ nguyên nền chọn. */
              gh.style.background = "transparent";
              try { gh.style.color = colorOf("wasabi.list.text"); } catch (e) { /* giữ màu kế thừa */ }
              div.appendChild(gh);
              continue;
            }
            var row = document.createElement("div");
            row.className = "pl-row";
            row.style.whiteSpace = "nowrap"; row.style.overflow = "hidden";
            row.style.textOverflow = "ellipsis"; row.style.lineHeight = "13px";
            row.style.padding = "0 3px";
            row.textContent = ((rows[i].pos != null ? rows[i].pos : rows[i].idx + 1)) + ". " + (rows[i].item ? rows[i].item.name : "");
            div.appendChild(row);
          }
          if (!rows.length) {
            var em = document.createElement("div");
            em.className = "pl-row";
            em.style.padding = "3px"; em.textContent = "(danh sách trống)";
            div.appendChild(em);
          }
        };
        fillListRows();
      } else {
        var note = document.createElement("div");
        note.style.padding = "3px"; note.style.color = "#999";
        note.textContent = "List — nội dung do MAKI/script của skin quyết định, Amp chưa vẽ được.";
        div.appendChild(note);
      }
    }
    /* v10.12 (P1 D): XUI mà ruột do MAKI/plugin quyết định (NowPlaying,
       PlaylistPro, MyCheckbox, Browser) — vẽ khung trống có ghi chú, không
       bịa nội dung. */
    function renderXuiPlaceholder(el, tag, parentEl, parentW, parentH, x, y, ctx) {
      var w = el.getAttribute("w") !== null ? relSize(el, "w", parentW) : parentW;
      var h = el.getAttribute("h") !== null ? relSize(el, "h", parentH) : parentH;
      if (w <= 0 || h <= 0) return;
      var div = document.createElement("div");
      div.style.position = "absolute"; div.style.left = x + "px"; div.style.top = y + "px";
      div.style.width = w + "px"; div.style.height = h + "px";
      div.style.border = "1px dashed #888";
      div.style.background = "rgba(255,255,255,0.04)";
      div.style.color = "#bbb";
      div.style.font = "10px Arial, sans-serif";
      div.style.padding = "4px";
      div.style.overflow = "hidden";
      div.style.pointerEvents = "none";
      setAbs(div, parentEl, x, y);
      div.dataset.xuiPlaceholder = tag;
      div.textContent = tag + " — nội dung do MAKI/plugin quyết định, Amp chưa vẽ được.";
      parentEl.appendChild(div);
    }
    /* v10.12 (P1 D): <Wasabi:TitleBar> mà skin không định nghĩa groupdef
       wasabi.titlebar — vẽ chữ tiêu đề tối thiểu đúng vị trí/kích thước
       XML (nút min/max/close nằm ở nhóm button.bar riêng của skin, không
       vẽ ở đây). */
    function renderBuiltInTitlebar(el, parentEl, parentW, parentH, x, y, ctx) {
      var w = el.getAttribute("w") !== null ? relSize(el, "w", parentW) : parentW;
      var h = el.getAttribute("h") !== null ? relSize(el, "h", parentH) : parentH;
      if (w <= 0 || h <= 0) return;
      var div = document.createElement("div");
      div.style.position = "absolute"; div.style.left = x + "px"; div.style.top = y + "px";
      div.style.width = w + "px"; div.style.height = h + "px";
      div.style.overflow = "hidden";
      div.style.pointerEvents = "none";
      setAbs(div, parentEl, x, y);
      div.dataset.titlebarFallback = "1";
      div.textContent = (ctx.titleText || "WINAMP").toUpperCase();
      div.style.font = "bold 11px Arial, sans-serif";
      div.style.color = (RES.colors && RES.colors["titlebar.text.color"]) ? colorOf("titlebar.text.color") : "#fff";
      div.style.lineHeight = (h + 2) + "px";
      parentEl.appendChild(div);
    }
    /* v10.12 (P1 D): <SysCmds> — nút min/close của khung cửa sổ, lấy bitmap
       wasabi.button.* của skin đang nạp (không bịa nút khi skin không có
       bitmap). Nối qua renderButton nên MINIMIZE/CLOSE chạy đúng đường
       nút thường; MAXIMIZE trên web không có cửa sổ hệ thống nên không vẽ. */
    async function renderSysCmds(el, parentEl, parentW, parentH, x, y, ctx) {
      var defs = [
        { bid: "wasabi.button.minimize", action: "MINIMIZE", id: "syscmd.minimize" },
        { bid: "wasabi.button.exit", action: "CLOSE", id: "syscmd.close" }
      ];
      var btns = [];
      for (var i = 0; i < defs.length; i++) {
        var info = await bitmapInfoCached(defs[i].bid);
        if (info && info.file && info.w > 0) btns.push({ def: defs[i], w: info.w });
      }
      if (!btns.length) return;
      var totalW = 0;
      for (var j = 0; j < btns.length; j++) totalW += btns[j].w;
      var cx = Math.max(0, parentW - totalW);
      for (var k = 0; k < btns.length; k++) {
        var b = document.createElement("button");
        b.setAttribute("id", btns[k].def.id);
        b.setAttribute("action", btns[k].def.action);
        b.setAttribute("image", btns[k].def.bid);
        await renderButton(b, "button", parentEl, parentW, parentH, cx, 0, ctx);
        cx += btns[k].w;
      }
    }

    async function renderNode(el, tag, parentEl, parentW, parentH, x, y, ctx, depth) {
      /* v10.12 (P1 D): thẻ XUI giữ nguyên tên có ":" khi XML đọc thẳng
         (vd wasabi:standardframe:status) — tách phần cuối làm tên nhánh,
         giữ tên đầy đủ để tra xuiMap. */
      var fullTag = tag;
      if (tag.indexOf(":") >= 0) tag = tag.slice(tag.lastIndexOf(":") + 1);
      var id = el.getAttribute("id") || "";
      if (tag === "group") { await renderGroupInstance(el, parentEl, parentW, parentH, x, y, ctx, depth); return; }
      if (tag === "grid") { await renderGrid(el, parentEl, parentW, parentH, x, y, ctx); return; }
      var xui = xuiGroupFor(tag, el);
      if (!xui) xui = xuiMapForEl(el, fullTag);
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
      /* v10.12 (P1 D): các XUI chuyên biệt — chỉ tới đây khi nhánh frame
         trên không bắt được (groupdef đích thiếu hoặc tag không phải frame). */
      if (tag === "titlebar") { renderBuiltInTitlebar(el, parentEl, parentW, parentH, x, y, ctx); return; }
      if (tag === "titlebox") { await renderTitleBox(el, parentEl, parentW, parentH, x, y, ctx, depth); return; }
      if (tag === "list") { renderList(el, parentEl, parentW, parentH, x, y, ctx); return; }
      if (tag === "syscmds") { await renderSysCmds(el, parentEl, parentW, parentH, x, y, ctx); return; }
      if (tag === "nowplaying" || tag === "playlistpro" || tag === "mycheckbox" || tag === "browser") {
        renderXuiPlaceholder(el, tag, parentEl, parentW, parentH, x, y, ctx);
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
        /* Đợt 4: bấm vào vis để đổi kiểu (BAR → sóng → tắt), như Webamp.
           CSS .stage .vis để pointer-events:none nên bật lại inline. */
        cv.style.pointerEvents = "auto"; cv.style.cursor = "pointer";
        cv.title = "Bấm để đổi kiểu vis";
        cv.onclick = function () { cycleVisType("display"); };
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
        /* Đợt v10.2 — đọc màu peak từ <vis> colorbandpeak (skin 566:
           "255,255,255" -> trắng). */
        var peakCol = el.getAttribute("colorbandpeak") || el.getAttribute("ColorBandPeak") || el.getAttribute("colorbandPeak") || "255,255,255";
        visXmlPeak = rgbVal(peakCol);
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
      /* v10.12 (P1 D): tag lạ còn lại mà xuiMap biết (vd copcheckbox,
         copradiobut, copdropdownlist, editbox2, ratings) thì vẽ groupdef
         tương ứng; không biết thì bỏ qua im lặng như trước (tag quen đã
         return ở các nhánh trên, nên chỗ này không cướp được tag nào). */
      var gx = xuiMapForTag(tag);
      if (gx) {
        /* Nhãn của phần tử XUI (labeltext/text/title) chép vào ctx để các
           text do script điền trong groupdef hiện đúng nhãn — vd
           <copcheckbox labeltext="Always On Top"> thay cho default
           "ERROR" của script checkbox.maki. */
        var xctx = {};
        for (var xk in ctx) xctx[xk] = ctx[xk];
        var xlab = el.getAttribute("labeltext") || el.getAttribute("text") || el.getAttribute("title") || "";
        if (xlab) xctx.xuiLabelText = xlab;
        await renderGroupInstance(synthGroupEl(gx, el), parentEl, parentW, parentH, x, y, xctx, depth);
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
    /* v10.3 — LECH COT ML (anh 8:07): header va hang du lieu dung 2
       dinh nghia cot khac nhau nen khong thang hang:
       (a) nhan thoi luong o header la "Thoi luong" (rong ~70px) con o
           hang chi la "5:06" (~30px) — cot len de flex "0 0 auto" (rong
           theo noi dung) nen cot ten (flex 1 1 auto) o header hep hon o
           hang ~40px, keo cot Nghe si/Album cua header lech trai so voi
           du lieu.
       (b) so thu tu "N. " nam TRONG o ten nen chu ten bat dau lech phai
           theo do rong cua so (1. hep hon 20.) — ten cac hang khong
           thang nhau, ten cung khong thang voi header "Ten bai".
       SUALAI: 1 dinh nghia cot DUY NHAT (ML_COL_DEFS / PL_COL_DEFS) dung
       chung cho header ML, hang ML va hang playlist, qua helper
       listColSpan — cot so rieng co dinh 30px can phai, cot thoi luong
       co dinh 48px can phai (du cho "1:23:45"), cac cot con lai giu
       nguyen do rong cu. Header co o so trong (cung rong 30px) de cac
       cot sau thang nhau. */
    var ML_COL_DEFS = [
      { key: "num", cls: "pl-num", label: "", flex: "0 0 30px", align: "right" },
      { key: "name", cls: "pl-name", label: "Tên bài", flex: "1 1 auto", align: "" },
      { key: "artist", cls: "ml-artist", label: "Nghệ sĩ", flex: "0 0 110px", align: "" },
      { key: "album", cls: "ml-album", label: "Album", flex: "0 0 120px", align: "" },
      { key: "len", cls: "pl-len", label: "Thời lượng", flex: "0 0 48px", align: "right" }
    ];
    var PL_COL_DEFS = [
      { key: "num", cls: "pl-num", label: "", flex: "0 0 30px", align: "right" },
      { key: "name", cls: "pl-name", label: "", flex: "1 1 auto", align: "" },
      { key: "len", cls: "pl-len", label: "", flex: "0 0 48px", align: "right" }
    ];
    /* v10.3 — ML GỌN TRÊN ĐIỆN THOẠI: khung ML theo XML rộng 790px; trên
       điện thoại 360px, thu nhỏ nguyên khung thì các cột/mục bị khuất
       (ảnh 20:12: list cuộn ngang, mất cột Tên bài, cây trái bị cắt).
       Khi viewport hẹp (< 560px): cửa sổ ML kẹp về bằng màn hình, ruột
       xếp dọc (cây thành dải ngang trên đầu, cuộn riêng), chỉ hiện cột
       Số + Tên bài + Thời lượng (Nghệ sĩ/Album vẫn trong model, xem được
       qua trackinfo khi phát). Đây là LỰA CHỌN layout cho điện thoại —
       XML 790px là cho desktop (ghi README). viewportWidth ưu tiên
       opts.viewportWidth (cho test jsdom — jsdom mặc định innerWidth
       1024), rồi mới đọc live innerWidth. */
    function viewportWidth() {
      if (opts && opts.viewportWidth) return opts.viewportWidth;
      try {
        if (typeof window !== "undefined" && window.innerWidth) return window.innerWidth;
        if (typeof document !== "undefined" && document.documentElement && document.documentElement.clientWidth) return document.documentElement.clientWidth;
      } catch (e) { /* bỏ qua */ }
      return 1024;
    }
    /* v10.4 — ML TRO LAI DUNG THIET KE WINAMP (nguoi dung 22:05): HUY
       che do gon <560px cua v10.3 (chi So/Ten/Thoi luong, cay thanh dai
       ngang 18px, cua so kep 360px). ML LUON ve du cay trai + 4 cot
       Ten/Nghe si/Album/Thoi luong o moi co man hinh; tren dien thoai
       thi BANG cuon ngang (hang min-width ML_MIN_TABLE_W, list
       overflow-x auto) thay vi giau cot. */
    var ML_MIN_TABLE_W = 480; /* 30 (So) + ~150 (Ten) + 110 (Nghe si) + 120 (Album) + 48 (Thoi luong) + khe 6px */
    function mlColDefs() { return ML_COL_DEFS; }
    function listColSpan(def, text, isFirst) {
      var sp = document.createElement("span");
      sp.className = def.cls;
      sp.style.flex = def.flex;
      sp.style.minWidth = "0";
      sp.style.overflow = "hidden";
      sp.style.textOverflow = "ellipsis";
      sp.style.whiteSpace = "nowrap";
      if (!isFirst) sp.style.marginLeft = "6px";
      if (def.align) sp.style.textAlign = def.align;
      sp.textContent = text;
      return sp;
    }
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
      var olds = listDiv.querySelectorAll(".row, .group-header");
      for (var o = 0; o < olds.length; o++) if (olds[o].parentElement) olds[o].parentElement.removeChild(olds[o]);
      var sel = playlistSelColors();
      var rows = playlistGroupedRows();
      for (var r = 0; r < rows.length; r++) {
        (function (rec) {
          /* v10.18 — tieu de nhom: icon thu muc vang (📁 dong / 📂 mo),
             bam thi thu gon/mo ra nhom do (khong phat/khong chon, nhu
             v10.17 — khong dataset.idx, khong dblclick/contextmenu). */
          if (rec.header) {
            var h = plGroupHeaderEl(rec);
            h.style.display = "block";
            h.style.fontWeight = "bold";
            /* v10.20 (2) — tiêu đề nhóm KHÔNG CÒN NỀN MÀU (Hải 19:07
               "Màu chuyên mục cũng còn"): nền trong suốt = đúng nền
               bình thường của danh sách; chữ = màu chữ bình thường của
               danh sách (trắng, đậm) + icon thư mục. Hàng kênh đang
               chọn/đang hát giữ nguyên nền chọn. */
            h.style.background = "transparent";
            h.style.color = colorOf("wasabi.list.text");
            h.style.lineHeight = "13px";
            h.style.padding = "0 3px";
            h.style.whiteSpace = "nowrap";
            h.style.overflow = "hidden";
            h.style.textOverflow = "ellipsis";
            listDiv.appendChild(h);
            return;
          }
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
          /* v10.3: so thu tu o rieng (co dinh 30px, can phai) — ten bat
             dau cung 1 vi tri o moi hang; nhan thoi luong co dinh 48px
             can phai de cot ten khong doi rong khi nhan ve ("…" -> "3:07").
             v10.18: so la so thu tu TRONG NHOM khi co nhom (tu 1); phang
             thi so toan playlist (idx+1) nhu cu. */
          row.appendChild(listColSpan(PL_COL_DEFS[0], (rec.pos != null ? rec.pos : rec.idx + 1) + ".", true));
          row.appendChild(listColSpan(PL_COL_DEFS[1], rec.item.name, false));
          row.appendChild(listColSpan(PL_COL_DEFS[2], playlistRowLabel(rec.item), false));
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
      /* v10.18 — xoa tim kiem thi ve trang thai mac dinh (tat ca nhom
         thu gon); luc dang loc thi cac nhom co ket qua mo hieu luc. */
      var nowSearching = !!playlistState.filter;
      if (plSearchActive && !nowSearching) plGroupReset();
      plSearchActive = nowSearching;
      /* v10.3 — skin Classic không có plListDiv Modern nên đường cũ return
         ngay; vẫn phải vẽ lại hàng playlist Classic tại chỗ (chọn/phát/
         xóa mục đều gọi hàm này). */
      refreshClassicPlRows();
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
       (tên bài + nghệ sĩ/album từ tag ID3 — đợt 5 — + thời lượng;
       file không có tag thì nghệ sĩ/album hiện "Không rõ", album/
       nghệ sĩ suy từ thư mục nếu có).
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
      /* v10.4 — o tim ML: loc them theo ten/nghe si/album (khong dau),
         nhu o tim playlist; ket hop voi nut cay (Audio/Video/Radio...). */
      var f = stripDiacritics((mlFilterText || "").toLowerCase());
      var out = [];
      for (var j = 0; j < playlistState.items.length; j++) {
        if (node.match(playlistState.items[j]) && itemMatchesSearch(playlistState.items[j], f)) out.push({ item: playlistState.items[j], idx: j });
      }
      return out;
    }
    /* Đợt 5 (03/11: metadata nhạc) — tiêu đề cột ML: Tên bài / Nghệ sĩ /
       Album / Thời lượng. Hàng tiêu đề KHÔNG có class "row" nên
       buildMlRows (chỉ xóa .row) không xóa nó; tạo 1 lần, giữ lại khi
       vẽ lại danh sách. */
    var ML_COLUMNS = ["name", "artist", "album", "len"];
    function ensureMlHeader(listDiv) {
      if (!listDiv || !document || !document.createElement) return null;
      var old = null;
      try { old = listDiv.querySelector(".ml-header"); } catch (e) { old = null; }
      if (old) return old;
      var head = document.createElement("div");
      head.className = "ml-header";
      head.style.display = "flex";
      head.style.minWidth = ML_MIN_TABLE_W + "px"; /* v10.4: header rong bang hang de cuon ngang cung bang */
      head.style.fontWeight = "bold";
      head.style.borderBottom = "1px solid #6788c9";
      head.style.padding = "2px 0";
      /* v10.4: header dung CHUNG mlColDefs() voi hang du lieu — du 4 cot
         + so dau tien, header va hang thang cot nhau. */
      var defs = mlColDefs();
      for (var i = 0; i < defs.length; i++) {
        head.appendChild(listColSpan(defs[i], defs[i].label, i === 0));
      }
      /* Chèn lên đầu danh sách (trước các hàng .row). */
      if (listDiv.firstChild) listDiv.insertBefore(head, listDiv.firstChild);
      else listDiv.appendChild(head);
      return head;
    }
    /* v10.3 — ML VE TUNG DOT (khong lag khi mo ML 105-146 muc):
       Cu: buildMlRows ve 1 mach TOAN BO hang (146 hang x 5 phan tu) tren
       luong UI, lai goi lai moi lan tag ve (105 lan) — mo ML dung luc
       probe dang chay thi may giat/do. Nay: ve ngay dot dau (60 hang —
       du phu man hinh dien thoai) de list HIEN NGAY, cac dot sau (60
       hang/dot) noi them bang setTimeout(0) khi trinh duyet ranh; cuon
       xuong gan het dot da ve thi ve them ngay (onscroll o renderMlContent).
       Moi lan ve lai (doi filter/tag ve) thi huy lich dot cu (mlRenderGen)
       roi ve lai tu dot dau. flushMlRows() ve not dong bo — test + luc
       queue doc tag xong goi de dam bao du hang. */
    var ML_CHUNK_ROWS = 60;
    var ML_ROW_H_PX = 13;
    var mlRenderGen = 0;
    var mlRowsCache = [];
    var mlRowsRendered = 0;
    var mlChunkTimer = null;
    function mlAppendChunk(listDiv, sel, gen) {
      if (gen !== mlRenderGen) return 0;
      var rows = mlRowsCache;
      var start = mlRowsRendered;
      var end = Math.min(rows.length, start + ML_CHUNK_ROWS);
      for (var r = start; r < end; r++) {
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
          row.style.minWidth = ML_MIN_TABLE_W + "px"; /* v10.4: hang rong toi thieu de bang cuon ngang tren dien thoai thay vi giau cot */
          /* v10.4: hang ML LUON du 4 cot (dung CHUNG mlColDefs() voi
             header) — So, Ten tu tag title (playlist + ticker van dung
             ten file), Nghe si/Album tu tag (khong tag thi "Khong ro"
             theo quy uoc fork), thoi luong co dinh 48px can phai. */
          var defs = mlColDefs();
          row.appendChild(listColSpan(defs[0], (rec.idx + 1) + ".", true));
          row.appendChild(listColSpan(defs[1], metadataDisplayName(rec.item), false));
          row.appendChild(listColSpan(defs[2], metadataDisplayArtist(rec.item), false));
          row.appendChild(listColSpan(defs[3], metadataDisplayAlbum(rec.item), false));
          row.appendChild(listColSpan(defs[4], playlistRowLabel(rec.item), false));
          row.dataset.idx = String(rec.idx);
          row.onclick = function () { mlSelected = rec.idx; refreshMlRows(); };
          row.ondblclick = function () { playPlaylistItem(rec.idx); };
          listDiv.appendChild(row);
        })(rows[r]);
      }
      mlRowsRendered = end;
      return end - start;
    }
    function mlScheduleChunk(listDiv, sel, gen) {
      if (mlRowsRendered >= mlRowsCache.length) return;
      if (mlChunkTimer) return;
      mlChunkTimer = setTimeout(function () {
        mlChunkTimer = null;
        if (gen !== mlRenderGen) return;
        mlAppendChunk(listDiv, sel, gen);
        mlScheduleChunk(listDiv, sel, gen);
      }, 0);
    }
    function buildMlRows(listDiv) {
      var olds = listDiv.querySelectorAll(".row");
      for (var o = 0; o < olds.length; o++) if (olds[o].parentElement) olds[o].parentElement.removeChild(olds[o]);
      ensureMlHeader(listDiv);
      var sel = playlistSelColors();
      mlRowsCache = mlFilteredItems();
      mlRowsRendered = 0;
      var gen = ++mlRenderGen;
      if (mlChunkTimer) { try { clearTimeout(mlChunkTimer); } catch (e) { /* bo qua */ } mlChunkTimer = null; }
      mlAppendChunk(listDiv, sel, gen);
      mlScheduleChunk(listDiv, sel, gen);
    }
    /* Ve not so hang ML con lai ngay lap tuc (khong cho setTimeout) —
       dung khi queue doc tag xong, hoac test can dem du hang. */
    function flushMlRows() {
      if (!mlListDiv) return false;
      if (mlChunkTimer) { try { clearTimeout(mlChunkTimer); } catch (e) { /* bo qua */ } mlChunkTimer = null; }
      var sel = playlistSelColors();
      var gen = mlRenderGen;
      while (mlRowsRendered < mlRowsCache.length) {
        if (mlAppendChunk(mlListDiv, sel, gen) <= 0) break;
      }
      return true;
    }
    function getMlRenderState() {
      return { rendered: mlRowsRendered, total: mlRowsCache.length, chunk: ML_CHUNK_ROWS };
    }
    /* Cuon toi gan het dot da ve thi ve them dot tiep ngay (khong cho
       lich setTimeout) — nguoi dung cuon nhanh van thay hang lien tuc. */
    function mlEnsureRowsForScroll() {
      if (!mlListDiv || mlRowsRendered >= mlRowsCache.length) return false;
      var top = 0, vh = 0;
      try { top = mlListDiv.scrollTop || 0; vh = mlListDiv.clientHeight || 0; } catch (e) { return false; }
      if (top + vh < mlRowsRendered * ML_ROW_H_PX - 26) return false;
      if (mlChunkTimer) { try { clearTimeout(mlChunkTimer); } catch (e) { /* bo qua */ } mlChunkTimer = null; }
      var sel = playlistSelColors();
      var n = mlAppendChunk(mlListDiv, sel, mlRenderGen);
      mlScheduleChunk(mlListDiv, sel, mlRenderGen);
      return n > 0;
    }
    function refreshMlRows() {
      if (!mlListDiv) return;
      /* Giữ vị trí cuộn của danh sách ML như playlist (việc 2). */
      var top = 0;
      try { top = mlListDiv.scrollTop || 0; } catch (e) { top = 0; }
      buildMlRows(mlListDiv);
      try { mlListDiv.scrollTop = top; } catch (e) { /* bỏ qua */ }
      /* v10.4: giu o tim ML dong bo voi tu khoa hien tai (nhu o tim
         playlist trong refreshPlaylistRows). */
      if (mlSearchInput && mlSearchInput.value !== mlFilterText) mlSearchInput.value = mlFilterText;
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
    /* v10.4 — o tim ML: dat tu khoa tim (ten/nghe si/album, khong dau)
       roi loc lai danh sach; dung cho test + co the noi nut sau. */
    function setMlSearch(text) {
      mlFilterText = String(text == null ? "" : text);
      if (mlSearchInput) mlSearchInput.value = mlFilterText;
      refreshMlRows();
      return mlFilterText;
    }
    function getMlState() {
      return {
        filter: mlFilter, search: mlFilterText, selected: mlSelected,
        hasWindow: !!mlListDiv, count: mlFilteredItems().length,
        total: playlistState.items.length,
        columns: ML_COLUMNS.slice(),
        compact: false, /* v10.4: khong con che do gon — ML luon du thiet ke Winamp */
        visibleColumns: mlColDefs().map(function (d) { return d.key; })
      };
    }
    function hasMediaLibrary() {
      return !!layoutEntry("MLibrary", "normal");
    }
    /* Vẽ ruột ML vào đúng hộp <component> trong dummy group (x=6,y=5,
       w=-12 relatw=1, h=-50 relath=1 theo XML — 778×299 với skin 566,
       tính từ model lúc chạy, không gán cứng): cây trái 170px + danh
       sách phải co giãn. v10.4 — DUNG THIET KE WINAMP: cay LUON ben
       trai, bang LUON du 4 cot; o tim o dau bang (tim ten/nghe si/
       album, khong dau); bang cuon ngang (overflow-x auto + hang
       min-width) tren dien thoai thay vi giau cot nhu v10.3. */
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
      /* Cot phai: o tim tren dau + bang ben duoi (bang cuon doc +
         cuon ngang rieng, cay trai khong bi cuon theo). */
      var listWrap = document.createElement("div");
      listWrap.className = "ml-listwrap";
      listWrap.style.flex = "1 1 auto";
      listWrap.style.minWidth = "0";
      listWrap.style.height = "100%";
      listWrap.style.display = "flex";
      listWrap.style.flexDirection = "column";
      var search = document.createElement("input");
      search.type = "text";
      search.className = "ml-search";
      search.placeholder = "Tìm tên/nghệ sĩ/album…";
      search.value = mlFilterText;
      search.style.flex = "0 0 auto";
      search.style.margin = "2px";
      search.style.font = "11px Arial, sans-serif";
      search.addEventListener("input", function () { mlFilterText = search.value || ""; refreshMlRows(); });
      listWrap.appendChild(search);
      var list = document.createElement("div");
      list.className = "ml-list";
      list.dataset.mlList = "1";
      list.style.flex = "1 1 auto";
      list.style.minWidth = "0";
      list.style.minHeight = "0";
      list.style.overflowY = "auto";
      list.style.overflowX = "auto"; /* v10.4: bang cuon ngang tren dien thoai */
      /* v10.3: cuon gan het dot hang da ve thi ve them dot tiep ngay. */
      try {
        list.addEventListener("scroll", function () { mlEnsureRowsForScroll(); });
      } catch (e) { /* jsdom cu */ }
      listWrap.appendChild(list);
      div.appendChild(listWrap);
      mlTreeDiv = tree; mlListDiv = list; mlSearchInput = search;
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
      var rec = { div: div, thumb: thumb, w: w, h: h, tw: tw, th: th, vertical: vertical, action: action, cfgattrib: cfgattrib, key: key, sliderId: sliderId, param: param, frac: 0.5, visibleRight: tw };
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
          /* v10.8 (108): kéo tay 1 dải là lệch khỏi preset — không còn
             nhãn ngoài để cập nhật; matchEqPresetName() suy lại tên ở
             lần mở menu PRESETS sau (không hàng nào in đậm = lệch). */
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
          /* Đợt v10.2 — stage zoom Fit scale bằng CSS transform nên rect
             là px MÀN HÌNH, còn w/h/tw/th là px skin: đổi tọa độ chạm về
             px skin (chia cho tỉ lệ rect/w) rồi mới tính frac. Trước đây
             kéo hết cỡ ở Fit ~0.45x cũng chỉ được frac ~0.45 — volume /
             EQ / seek / balance không bao giờ lên max được bằng cách kéo
             (người dùng báo 18:38-18:43: thanh volume "100%" là mặc định
             1.0, còn kéo tay thì không lên nổi max; EQ đẩy hết cỡ cũng
             chỉ tới ~nửa dải nên vẫn nhỏ hơn Webamp mặc định). */
          var sc = 1;
          try {
            if (vertical) { if (rect.height > 0 && h > 0) sc = rect.height / h; }
            else if (rect.width > 0 && w > 0) sc = rect.width / w;
            if (!isFinite(sc) || sc <= 0) sc = 1;
          } catch (err) { sc = 1; }
          if (vertical) return 1 - ((cy - rect.top) / sc - th / 2) / Math.max(1, h - th);
          return ((cx - rect.left) / sc - tw / 2) / Math.max(1, w - tw);
        };
        var onDown = function (e) {
          /* v10.5 — chạm xuyên ngăn kéo: slider trong ngăn kéo ĐÓNG đã
             bị tắt pointer-events nên chạm mới không tới được đây qua
             hit-test; nhưng lần kéo đang dở (bắt đầu lúc mở, đóng giữa
             chừng — listener mousemove/touchmove ở cấp document) vẫn
             chạy tiếp nếu không chặn. Cờ tắt chạm trên chính div này là
             nguồn đúng duy nhất (kể cả 250ms đang trượt đóng). Slider
             ngoài ngăn kéo (volume/seek) luôn auto nên không ảnh hưởng. */
          if (div.style.pointerEvents === "none") return;
          var f = fracFromEvent(e);
          if (f === null) return;
          rec.dragging = true;
          rec.setFrac(f);
          if (e.preventDefault) e.preventDefault();
        };
        var onMove = function (e) {
          if (!rec.dragging) return;
          if (div.style.pointerEvents === "none") { rec.dragging = false; return; }
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
      /* v10.10: đo mép phải nhìn thấy của nút để fill dừng đúng đó
         (xem measureThumbVisibleRight). Không chặn render: trước khi đo
         xong visibleRight = tw (hành vi v10.9), đo xong thì vẽ lại fill.
         Chỉ VOLUME/SEEK có fill; đo lỗi (null) thì giữ nguyên tw. */
      if (thumb && thumbId && (action === "VOLUME" || action === "SEEK")) {
        measureThumbVisibleRight(thumbId).then(function (v) {
          if (v !== null && v > 0 && v <= tw) {
            rec.visibleRight = v;
            if (action === "VOLUME") updateVolumebar();
            else updateProgress();
          }
        });
      }
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
           = bài trước/sau (Next tôn trọng Shuffle), Eject = popup chọn
           1 bài hoặc cả thư mục nhạc local (đợt v10.0, việc 5). Không có engine (test đợt A–D) thì các nút vẫn đổi
           state playlist như cũ, chỉ chưa có tiếng. */
        if (action === "PLAY") { togglePlay(); return; }
        if (action === "PAUSE") { if (audioEngine) audioEngine.pause(); else { demo.playing = false; playlistState.playing = false; updateStatusEls(); } return; }
        if (action === "STOP") { stopPlayback(); return; }
        if (action === "PREV") { prevTrack(); return; }
        if (action === "NEXT") { nextTrack(demo.repeat === 1 || demo.shuffle); return; }
        if (action === "EJECT") { showLocalAddMenu(div); return; }
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
           VID_Misc/Vis_Menu:
           - VID_Misc (v10.5 — Hải 04/11: nút Video CHỈ mở video): chỉ
             mở video (đang mở rồi thì ở yên), KHÔNG mở menu — giữ nguyên
             v10.5 (quyết này về nút VID_Misc, không phải videoavs.open).
           - VIS_MENU (v10.8 — Hải 04/11, ảnh 12): mở menu HIỆU ỨNG
             (visMenuItems — chỉ mục hiệu ứng: Màu hiệu ứng ×3 + Milkdrop;
             menu đóng bằng closer chung: click ngoài/chạm/Esc/chọn mục;
             bấm lần 2 thì đóng — togglePopupMenu kind "vis"). AVS chưa
             mở thì bấm lần đầu mở vis trước (nút này chỉ có khi AVS đã
             mở nên trường hợp này chỉ là phòng thủ).
           VID_MAX/Restore: phóng to/khôi phục cửa sổ Video/Vis rời. */
        if (action === "VID_TV") { toggleVideoWindow(); return; }
        if (action === "VID_1X") { setVideoScale(1); return; }
        if (action === "VID_2X") { setVideoScale(2); return; }
        if (action === "VID_FS" || action === "VIS_FS") { requestVideoFullscreen(); return; }
        if (action === "VIS_PREV") { cycleVisVariant(-1); return; }
        if (action === "VIS_NEXT") { cycleVisVariant(1); return; }
        if (action === "VID_MISC") { openAvs("video"); return; }
        if (action === "VIS_MENU") {
          if (!avsState.open) { openAvs("vis"); return; }
          togglePopupMenu(div, visMenuItems(), "vis");
          return;
        }
        if (id === "button.vid.max") { setVideoMaximized(true); return; }
        if (id === "button.vid.restore") { setVideoMaximized(false); return; }
        if (id === "button.vid.detach" || id === "button.vis.detach") { detachAvs(); return; }
        if (id === "button.video.reattach" || id === "button.vis.reattach") { reattachAvs(); return; }
        if (id === "button.vid.switchto" || id === "button.vis.switchto") { toggleAvsMode(); return; }
        if (id === "videoavs.open") {
          /* Đợt B (9.9) — nút Video/Vis theo tùy chọn visbutton
             (optionsgroup.visbutton): "Open Configuration" -> mở ngăn kéo
             ở tab Options, trang visbutton; "Open Context Menu" -> mở
             menu ngữ cảnh Video/Vis (visContextMenuItems); còn lại
             (mặc định, không chọn gì) -> mở/đóng AVS như Winamp thật.
             v10.8: menu ngữ cảnh ĐÃ KHÔI PHỤC (từng gỡ ở v10.5) và NỐI
             ĐÚNG TICK "Open Context Menu" — tick bật thì nút mở menu
             điều khiển bên trong (đính chính của Hải 08:48, ảnh 13:
             nút oval ▼ góc phải trên chính là videoavs.open); tick tắt
             thì nút mở AVS. Menu đóng bằng closer chung: click ngoài/
             chạm/Esc/chọn mục; bấm lần 2 thì đóng — togglePopupMenu
             kind "videoavs". */
          var vb = visButtonAction();
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
          if (vb === "menu") {
            togglePopupMenu(div, visContextMenuItems(), "videoavs");
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
           Add mở menu thêm, Rem mở menu xóa (v10.15 — Hải 15:52: bấm
           -rem phải hiện menu "Xoá 1 bài" + "Xoá tất cả" thay vì xóa
           thẳng bài đang chọn), Sel mở menu chọn, Misc mở menu phụ,
           List (Manage Playlist) mở menu quản lý. */
        if (action === "PE_ADD") { showPlaylistMenu(div, addMenuItems(div)); return; }
        if (action === "PE_REM") { showPlaylistMenu(div, removeMenuItems()); return; }
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
      /* v10.4 — TRAN NGANG (nguoi dung 22:09: menu Video/Vis mo gan mep
         phai thi tran ra ngoai stage, chi thay mep trai cac muc): truoc
         day chi xu ly tran DOC. Nay kep them trai: menu mo sang TRAI
         khi khong du cho ben phai (left = min(anchorLeft, stageW -
         menuW), kep >= 0). Dung cho MOI popup qua day (menu Video/Vis,
         File/Play/Options/View/Help, chuot phai playlist/trackmenu,
         Add/Manage/Misc, trackinfo, preferences). */
      var stageW = parseInt(T.style.width || "0", 10) || 0;
      if (!stageW) { try { stageW = Math.round(T.getBoundingClientRect().width); } catch (e) { stageW = 0; } }
      if (stageW > 0) {
        var menuW = 0;
        try { menuW = box.offsetWidth || 0; } catch (e) { menuW = 0; }
        if (!menuW) {
          /* jsdom khong do duoc offsetWidth: uoc theo dong dai nhat
             (11px Arial ~7px/ky tu + padding 20px + vien 2px). */
          var maxLen = 0;
          try {
            var pRows = box.querySelectorAll ? box.querySelectorAll("div") : [];
            for (var ri = 0; ri < pRows.length; ri++) {
              var L = (pRows[ri].textContent || "").length;
              if (L > maxLen) maxLen = L;
            }
          } catch (e) { maxLen = 0; }
          menuW = maxLen > 0 ? maxLen * 7 + 22 : 120;
        }
        var left = parseInt(box.style.left || "0", 10) || 0;
        if (left + menuW > stageW) left = Math.max(0, stageW - menuW);
        if (left < 0) left = 0;
        box.style.left = left + "px";
      }
    }

    /* Menu preset EQ (nút PRESETS): đường cong tự định nghĩa, xem EQ_PRESETS. */
    function showEqPresetsMenu(anchorDiv) {
      var T = lastStage;
      if (!T) return;
      lastEqPresetsAnchor = anchorDiv || null;
      /* v10.8: dùng closer CHUNG (closePlaylistMenus/armPanelCloser) thay
         cho closer riêng cũ — menu này cũng mang [data-pl-menu] (giữ
         nguyên [data-eq-presets-menu] để test/truy vấn cũ vẫn thấy). */
      closePlaylistMenus();
      var menu = document.createElement("div");
      menu.dataset.eqPresetsMenu = "1";
      menu.dataset.plMenu = "1";
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
          /* v10.7 (107): preset đang chọn in đậm (suy từ dải hiện tại). */
          if (name === matchEqPresetName()) row.style.fontWeight = "bold";
          row.onmouseover = function () { row.style.background = "#316AC5"; row.style.color = "#fff"; };
          row.onmouseout = function () { row.style.background = ""; row.style.color = ""; };
          row.onclick = function (ev) {
            if (ev && ev.stopPropagation) ev.stopPropagation();
            closePlaylistMenus();
            applyEqPreset(name);
            requestRerender();
          };
          menu.appendChild(row);
        })(names[i]);
      }
      /* Đợt v10.0 (việc 1: winamp-eqf) — nạp/lưu preset .eqf/.q1
         (mang qua lại được với Winamp PC). */
      var sep = document.createElement("div");
      sep.style.borderTop = "1px solid #ACA899"; sep.style.margin = "2px 0";
      menu.appendChild(sep);
      var eqfLoadRow = document.createElement("div");
      eqfLoadRow.textContent = "Nạp preset .eqf…";
      eqfLoadRow.style.padding = "4px 10px"; eqfLoadRow.style.cursor = "pointer"; eqfLoadRow.style.whiteSpace = "nowrap";
      eqfLoadRow.dataset.eqfLoad = "1";
      eqfLoadRow.onmouseover = function () { eqfLoadRow.style.background = "#316AC5"; eqfLoadRow.style.color = "#fff"; };
      eqfLoadRow.onmouseout = function () { eqfLoadRow.style.background = ""; eqfLoadRow.style.color = ""; };
      eqfLoadRow.onclick = function (ev) {
        if (ev && ev.stopPropagation) ev.stopPropagation();
        closePlaylistMenus();
        openEqfPicker();
      };
      menu.appendChild(eqfLoadRow);
      var eqfSaveRow = document.createElement("div");
      eqfSaveRow.textContent = "Lưu preset .eqf…";
      eqfSaveRow.style.padding = "4px 10px"; eqfSaveRow.style.cursor = "pointer"; eqfSaveRow.style.whiteSpace = "nowrap";
      eqfSaveRow.dataset.eqfSave = "1";
      eqfSaveRow.onmouseover = function () { eqfSaveRow.style.background = "#316AC5"; eqfSaveRow.style.color = "#fff"; };
      eqfSaveRow.onmouseout = function () { eqfSaveRow.style.background = ""; eqfSaveRow.style.color = ""; };
      eqfSaveRow.onclick = function (ev) {
        if (ev && ev.stopPropagation) ev.stopPropagation();
        exportCurrentEqf();
        closePlaylistMenus();
      };
      menu.appendChild(eqfSaveRow);
      T.appendChild(menu);
      placePopupInStage(menu, anchorDiv, names.length + 3); /* v9.6 (Điểm 5): mở hướng lên khi không đủ chỗ dưới */
      armPanelCloser(anchorDiv); /* v10.9: neo anchor (xem armPanelCloser) */
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
       nữa — v10.15: "Xóa hết" dời từ menu List sang menu -rem):
       closer gắn bằng setTimeout(0) sau khi mở menu, nhưng khi
       chọn 1 mục trong menu thì row.onclick stopPropagation nên closer
       KHÔNG bao giờ được tiêu thụ — nó còn armed mãi. Cú bấm MỞ MENU
       KẾ TIẾP bubble lên document thì closer cũ chạy, đóng ngay menu
       vừa mở (bấm Manage Playlist mà menu không hiện — sau "Xóa hết"
       thì playlist trống, không còn đường nạp lại kênh nên tưởng như
       không chọn được nữa; v10.15: nạp lại kênh qua menu Add
       "Nguồn mặc định"; bấm hụt cứ lặp lại vì mỗi lần mở hụt lại
       gắn thêm 1 closer mới). Sửa: giữ tham chiếu closer (plMenuCloser),
       gỡ nó mỗi khi đóng menu và mỗi khi mở menu mới; chỉ gắn closer
       khi menu vẫn còn mở lúc timeout chạy (người dùng có thể đã chọn
       mục và đóng menu trước khi timeout chạy — gắn lúc đó là thừa). */
    var plMenuCloser = null, plMenuTouchCloser = null, plMenuEscCloser = null, plMenuAnchor = null, plMenuOpenedAt = 0;
    function disarmPlMenuCloser() {
      if (plMenuCloser) {
        try { document.removeEventListener("click", plMenuCloser); } catch (e) { /* jsdom */ }
        plMenuCloser = null;
      }
      if (plMenuTouchCloser) {
        try { document.removeEventListener("touchend", plMenuTouchCloser); } catch (e) { /* jsdom */ }
        plMenuTouchCloser = null;
      }
      if (plMenuEscCloser) {
        try { document.removeEventListener("keydown", plMenuEscCloser); } catch (e) { /* jsdom */ }
        plMenuEscCloser = null;
      }
      plMenuAnchor = null;
    }
    /* v10.9 — mọi bảng nổi [data-pl-menu] đang mở: hỏi DOCUMENT (menu nổi
       là popup cấp document), KHÔNG hỏi lastStage đổi được (render nguyên
       tử đặt lastStage = build tách rời lúc vẽ). Thêm cả menu đang nằm
       trong build tách rời (chưa swapIn) để dọn luôn trước khi nó hiện ra. */
    function allOpenMenus() {
      var out = [];
      try {
        var ds = document.querySelectorAll("[data-pl-menu]");
        for (var i = 0; i < ds.length; i++) out.push(ds[i]);
      } catch (e) { /* jsdom */ }
      try {
        if (lastStage && lastStage.querySelectorAll && document.contains && !document.contains(lastStage)) {
          var bs = lastStage.querySelectorAll("[data-pl-menu]");
          for (var j = 0; j < bs.length; j++) if (out.indexOf(bs[j]) < 0) out.push(bs[j]);
        }
      } catch (e) { /* jsdom */ }
      return out;
    }
    function closePlaylistMenus() {
      disarmPlMenuCloser();
      var olds = allOpenMenus();
      for (var i = 0; i < olds.length; i++) if (olds[i].parentElement) olds[i].parentElement.removeChild(olds[i]);
    }
    /* Đợt D (9.9) — closer dùng chung cho mọi bảng nổi có [data-pl-menu]
       (menu playlist, bảng thông tin bài, Preferences, About): bấm ra ngoài
       thì đóng. Logic y hệt khối setTimeout cũ trong showPlaylistMenu
       (chỉ gắn khi bảng vẫn còn mở lúc timeout chạy — xem ghi chú ở
       disarmPlMenuCloser về closer thừa ăn mất lần mở kế tiếp).
       v10.8 (menu Vis / videoavs.open bị DÍNH — bấm ra ngoài không đóng):
       MỘT closer chung cho MỌI menu nổi (menubar, playlist, EQ presets,
       LocalAdd, EQF chooser, Vis, videoavs.open) — không làm riêng lẻ
       từng menu nữa (các closer riêng cũ rò rỉ listener khi chọn mục
       xong vì row.onclick gỡ menu mà không gỡ listener). Closer chung
       nghe cả 3: click chuột + touchend (chạm) + phím Esc; bấm/chạm
       TRONG menu thì không đóng (kiểm tra target có nằm trong menu
       không — hàng trong menu đã stopPropagation với click, nhưng
       touchend thì không nên phải kiểm tra).
       v10.9 (Hải 09:40, ảnh image-19 — menu videoavs.open DÍNH trên
       trình duyệt thật dù test jsdom 36 PASS): armPanelCloser cũ chỉ gắn
       listener qua setTimeout(0) và CHỈ khi lastStage còn thấy menu lúc
       timeout chạy. lastStage là biến đổi được: render nguyên tử đặt
       lastStage = build (div tách rời) lúc bắt đầu vẽ, chỉ trả về live
       ở swapIn() lúc xong — nếu 1 lần vẽ lại bắt đầu (vd: video vừa load
       xong metadata → setVideoInfo → requestRerender; hoặc bấm nút đúng
       lúc render đang chạy với ảnh load chậm trên trình duyệt thật)
       trong khoảng giữa lúc mở menu và lúc timeout chạy, kiểm tra thất
       bại → closer KHÔNG BAO GIỜ được gắn → menu dính vĩnh viễn, bấm
       nút lần 2 cũng không đóng (isPopupMenuOpen cũ cũng hỏi lastStage
       nên không thấy menu). Sửa: (1) gắn listener ĐỒNG BỘ ngay lúc mở
       menu (không setTimeout); cú click MỞ menu nổi bọt lên document
       sau đó được chặn bằng 2 lớp: target nằm trong anchor (nút vừa mở
       menu) HOẶC trong 25ms đầu sau khi gắn (cú mở chạy cùng task với
       target-phase, tới document sau vài micro-giây; bấm ngoài thật của
       người >100ms nên không bị chặn); bấm nút lần 2 (toggle) vẫn qua
       div.onclick trước (target phase) nên vẫn đóng đúng. (2) insideMenu
       / closePlaylistMenus / isPopupMenuOpen hỏi DOCUMENT thay vì
       lastStage (xem allOpenMenus). */
    function armPanelCloser(anchorDiv) {
      try {
        disarmPlMenuCloser();
        plMenuAnchor = anchorDiv || null;
        plMenuOpenedAt = Date.now();
        var insideAnchor = function (ev) {
          var t = ev && ev.target;
          if (!t || !plMenuAnchor) return false;
          if (plMenuAnchor === t) return true;
          try { return !!(plMenuAnchor.contains && plMenuAnchor.contains(t)); } catch (e) { return false; }
        };
        var insideMenu = function (ev) {
          var t = ev && ev.target;
          if (!t) return false;
          var menus = allOpenMenus();
          for (var i = 0; i < menus.length; i++) {
            var m = menus[i];
            if (m === t || (m.contains && m.contains(t))) return true;
          }
          return false;
        };
        var tooSoon = function () { return (Date.now() - plMenuOpenedAt) < 25; };
        plMenuCloser = function (ev) {
          if (tooSoon() || insideAnchor(ev) || insideMenu(ev)) return;
          closePlaylistMenus(); disarmPlMenuCloser();
        };
        plMenuTouchCloser = function (ev) {
          if (tooSoon() || insideAnchor(ev) || insideMenu(ev)) return;
          closePlaylistMenus(); disarmPlMenuCloser();
        };
        plMenuEscCloser = function (ev) {
          if (ev && (ev.key === "Escape" || ev.key === "Esc" || ev.keyCode === 27)) {
            closePlaylistMenus(); disarmPlMenuCloser();
          }
        };
        document.addEventListener("click", plMenuCloser);
        document.addEventListener("touchend", plMenuTouchCloser);
        document.addEventListener("keydown", plMenuEscCloser);
      } catch (e) { /* jsdom */ }
    }
    /* v10.8 — menu nào đang mở (theo kind), để nút mở menu bấm lần 2 thì
       ĐÓNG thay vì mở lại (toggle). kind: "vis" (nút Vis Menu), "videoavs"
       (nút videoavs.open); menubar/playlist không truyền kind nên không
       toggle (bấm lại thì mở lại như cũ).
       v10.9: hỏi DOCUMENT (allOpenMenus) thay vì lastStage — xem ghi chú
       ở armPanelCloser về lastStage = build lúc render. */
    function isPopupMenuOpen(kind) {
      if (!kind) return false;
      try {
        var menus = allOpenMenus();
        for (var i = 0; i < menus.length; i++) {
          if (menus[i].dataset && menus[i].dataset.menuKind === kind) return true;
        }
      } catch (e) { return false; }
      return false;
    }
    function togglePopupMenu(anchorDiv, items, kind) {
      if (kind && isPopupMenuOpen(kind)) { closePlaylistMenus(); return false; }
      showPlaylistMenu(anchorDiv, items, kind);
      return true;
    }
    function showPlaylistMenu(anchorDiv, items, kind) {
      var T = lastStage;
      if (!T) return;
      closePlaylistMenus();
      var menu = document.createElement("div");
      menu.dataset.plMenu = "1";
      if (kind) menu.dataset.menuKind = kind;
      menu.style.position = "absolute";
      menu.style.left = ((anchorDiv._absX || 0)) + "px";
      menu.style.top = ((anchorDiv._absY || 0) + (parseInt(anchorDiv.style.height || "0", 10) || 12)) + "px";
      menu.style.background = "#ECE9D8"; menu.style.border = "1px solid #ACA899"; /* v9.6 (Điểm 5): nền sáng như menu Winamp thật */
      menu.style.zIndex = "10"; menu.style.pointerEvents = "auto";
      menu.style.font = "11px Arial, sans-serif"; menu.style.color = "#000";
      for (var i = 0; i < items.length; i++) {
        (function (it) {
          /* v10.9 (Hải 09:47, ảnh image-22 — menu View hơi rối, chưa tách
             từng loại): mục {sep:true} vẽ ĐƯỜNG KẺ phân cách nhóm (kiểu
             Winamp thật: vạch #ACA899, margin 2px 0 — cùng kiểu với vạch
             phân cách trong menu preset EQ), KHÔNG phải hàng bấm được
             (không data-menu-item, không hover, không onclick) nên không
             ảnh hưởng đếm mục trong test cũ. label:"" để code cũ gọi
             it.label.indexOf(...) không crash ("" → -1, tự bỏ qua). */
          if (it && it.sep) {
            var dv = document.createElement("div");
            dv.dataset.menuSep = "1";
            dv.style.borderTop = "1px solid #ACA899"; dv.style.margin = "2px 0";
            menu.appendChild(dv);
            return;
          }
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
      armPanelCloser(anchorDiv); /* v10.9: neo anchor (xem armPanelCloser) */
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
        /* v10.3: thêm CẢ danh sách 1 lần (addPlaylistItems) thay vì
           addPlaylistItem từng kênh (mỗi kênh 1 lần vẽ lại toàn bộ) —
           list hiện ngay sau parse. */
        addPlaylistItems(items);
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
      box.textContent = "Amp v" + RENDERER_VERSION + " — Phím tắt: Space phát/tạm dừng · ← → tua ±5 giây · ↑ ↓ âm lượng · N hoặc ] bài sau · P hoặc [ bài trước · M tắt/bật tiếng · L lặp lại · S phát ngẫu nhiên · X phát · C tạm dừng · V dừng. Nút tai nghe / màn hình khóa điều khiển qua Media Session. Nhấp đúp kênh để phát. Bấm vào đây để đóng.";
      box.onclick = function () { closePlaylistMenus(); };
      T.appendChild(box);
      placePopupInStage(box, anchorDiv, 3); /* v9.6 (Điểm 5): mở hướng lên khi không đủ chỗ dưới */
    }
    function addMenuItems(anchorDiv) {
      return [
        { label: "Nguồn mặc định", action: function () { if (onReloadRadio) onReloadRadio(); } },
        { label: "Thêm nhạc local…", action: function () { openLocalFolderPicker(); } },
        { label: "Thêm URL…", action: function () { showAddUrlForm(anchorDiv); } }
      ];
    }
    /* Đợt v10.15 (04/11 — Hải 15:52: nút -rem bấm vào phải hiện menu
       "Xoá 1 bài" + "Xoá tất cả"; 16:00: "Nạp lại radio" đổi tên thành
       "Nguồn mặc định" — chỉ đổi nhãn, hành động vẫn nạp lại file mặc
       định (radio.m3u lúc đó, iptv.m3u từ v10.17); số "(41 kênh)" bỏ
       luôn vì là số cứng ghi chết trong nhãn, đổi nội dung file mặc
       định thì số sẽ lệch). Dùng chung cho Modern (PE_REM)
       lẫn Classic (pl-remove). */
    function removeMenuItems() {
      return [
        { label: "Xoá 1 bài", action: function () { removePlaylistItem(playlistState.selected); } },
        { label: "Xoá tất cả", action: function () { clearPlaylist(); } }
      ];
    }
    function selectMenuItems() {
      return [
        { label: "Tới bài đang hát", action: function () { playlistState.selected = playlistState.current; plGroupEnsureOpenForIdx(playlistState.current); /* v10.18 — tu mo nhom chua bai dang hat */ refreshPlaylistRows(); scrollPlaylistTo(playlistState.current); } },
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
    /* Đợt v10.15: gộp trùng (Hải 15:56) — "Nạp lại radio" chỉ còn
       trong menu Add ("Nguồn mặc định"), "Xóa hết" chỉ còn trong menu
       -rem; menu List chỉ còn "Lưu playlist (.m3u)". */
    function manageMenuItems(anchorDiv) {
      return [
        { label: "Lưu playlist (.m3u)", action: function () { exportPlaylistM3U(); } }
      ];
    }
    function viewMenuItems() {
      var plTick = "";
      try { plTick = (isPlaylistOpen && isPlaylistOpen()) ? "✓ " : ""; } catch (e) { plTick = ""; }
      var mlTick = "";
      try { mlTick = (isMlOpen && isMlOpen()) ? "✓ " : ""; } catch (e) { mlTick = ""; }
      var shadeTick = "";
      try { shadeTick = (isShadeMode && isShadeMode()) ? "✓ " : ""; } catch (e) { shadeTick = ""; }
      var fitTick = "";
      try { fitTick = (isZoomFit && isZoomFit()) ? "✓ " : ""; } catch (e) { fitTick = ""; }
      var items = [
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
        { label: shadeTick + "Thu gọn (Shade)", action: function () { if (onShadeToggle) onShadeToggle(!(isShadeMode && isShadeMode())); } },
        /* v10.9 (Hải 09:47, ảnh image-22 — menu View hơi rối, chưa tách
           từng loại): tách 3 nhóm bằng đường kẻ: (1) Cửa sổ: Playlist
           Editor / Media Library / Ngăn kéo / Video / Hiệu ứng / Thu gọn;
           (2) Zoom: Cỡ gốc 1x / Vừa màn hình; (3) Video: Giữ tỉ lệ / Cỡ
           thường / Cỡ gấp đôi / Toàn màn hình / Phóng to / Tách rời /
           Đóng. Chỉ tách nhóm, không đổi mục hay hành vi nào. */
        { sep: true, label: "" },
        /* 04/11 — bỏ nút menu góc dưới-phải: Zoom chuyển vào đây (cùng
           đường onZoom của index.html; ✓ đọc từ isZoomFit, nhãn dựng mới
           mỗi lần mở menu nên luôn đúng — thay cho khối cập nhật nhãn
           zoom trong setZoom cũ). */
        { label: (fitTick ? "" : "✓ ") + "Zoom: Cỡ gốc 1x", action: function () { if (onZoom) onZoom("1"); } },
        { label: fitTick + "Zoom: Vừa màn hình", action: function () { if (onZoom) onZoom("fit"); } },
        { sep: true, label: "" },
        /* 04/11 — cài đặt Video/Vis chuyển từ menu cũ vào đây (hợp của
           videoMenuItems + visMenuItems, gộp trùng: Toàn màn hình, Tách
           rời/Gắn lại, Đóng chỉ 1 mục chung cho cả 2 chế độ — đúng như
           menu cũ). Tách rời giữ chế độ đang mở (như handler cũ), không
           ép về "video".
           v10.8: các mục HIỆU ỨNG (Màu hiệu ứng ×3 + Milkdrop) RỜI khỏi
           View — hiệu ứng chỉ còn trong menu Vis của nút Vis_Menu trong
           cửa sổ AVS (xem visMenuItems) để không trùng 2 chỗ; View chỉ
           giữ các mục video chung (Giữ tỉ lệ, 1x/2x, Toàn màn hình,
           Phóng to, Tách rời, Đóng). */
        { label: (avsState.keepAspect ? "✓ " : "") + "Giữ tỉ lệ khung hình", action: function () { setKeepAspect(!avsState.keepAspect); } },
        { label: "Cỡ thường (1x)", action: function () { setVideoScale(1); } },
        { label: "Cỡ gấp đôi (2x)", action: function () { setVideoScale(2); } },
        { label: "Toàn màn hình", action: function () { requestVideoFullscreen(); } },
        { label: avsState.videoMaximized ? "Khôi phục cửa sổ" : "Phóng to cửa sổ", action: function () { setVideoMaximized(!avsState.videoMaximized); } },
        { label: avsState.detached ? "Gắn lại (Reattach)" : "Tách rời (Detach)", action: function () { if (avsState.detached) reattachAvs(); else { if (!avsState.open) openAvs(avsState.mode || "video"); detachAvs(); } } },
        { label: "Đóng Video/Hiệu ứng", action: function () { closeAvs(); } }
      ];
      return items;
    }

    /* ---------- đợt D (9.9): menu chính File/Play/Options/Help ----------
       Menubar chính trước đây chỉ có View mở được menu thật (File/Play/
       Options/Help bấm không làm gì — MAKI mainmenu.maki không chạy được
       trên web). Nay mỗi mục có menu con với các mục Winamp thật; mục nào
       nối được thì nối thật (dùng lại hàm đã có), mục nào chưa thì KHÔNG
       đưa vào menu (không đưa mục giả — xem README đợt D). */
    function fileMenuItems(anchorDiv) {
      return [
        { label: "Phát file nhạc…", action: function () { openLocalFilePicker(); } },
        /* 04/11 — 2 mục thêm nhạc chuyển từ nút menu góc dưới-phải vào
           đây (cùng handler cũ: openLocalFilePicker/openLocalFolderPicker).
           "Phát file nhạc…" ở trên vốn đã gọi openLocalFilePicker nên 2
           mục này trùng đường — giữ cả 2 nhãn để không mất mục nào của
           menu cũ; dọn trùng (nếu có) để đợt sau quyết. */
        { label: "Thêm 1 bài nhạc…", action: function () { openLocalFilePicker(); } },
        { label: "Thêm thư mục nhạc…", action: function () { openLocalFolderPicker(); } },
        { label: "Phát URL…", action: function () { showAddUrlForm(anchorDiv); } },
        { label: "Nạp skin .wal/.wsz/.zip…", action: function () { if (onOpenSkinPicker) onOpenSkinPicker(); } },
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
        { label: (demo.shuffle ? "✓ " : "") + "Phát ngẫu nhiên (Shuffle)", action: function () { toggleShuffle(); } }
      ];
    }
    function optionsMenuItems(anchorDiv) {
      var shadeTick = "";
      try { shadeTick = (isShadeMode && isShadeMode()) ? "✓ " : ""; } catch (e) { shadeTick = ""; }
      var items = [
        { label: "Preferences…", action: function () { openPreferences(anchorDiv); } },
        { label: "Ngăn kéo: Equalizer", action: function () { openDrawerTab("eq"); } },
        { label: "Ngăn kéo: Options", action: function () { openDrawerTab("options"); } },
        { label: "Ngăn kéo: Color Themes", action: function () { openDrawerTab("colorthemes"); } },
        { label: shadeTick + "Thu gọn (Shade)", action: function () { if (onShadeToggle) onShadeToggle(!(isShadeMode && isShadeMode())); } }
      ];
      /* 04/11 — Crossfade chuyển từ nút menu góc dưới-phải vào đây (cùng
         đường onCycleCrossfade của index.html; nhãn động + ✓ đọc từ
         crossfadeMs, menu dựng mới mỗi lần mở nên luôn đúng). Không nối
         callback thì không đưa mục vào (không đưa mục giả). */
      if (onCycleCrossfade) {
        var xfLabel = "Crossfade: 2s";
        try { xfLabel = getCrossfadeLabel ? getCrossfadeLabel() : xfLabel; } catch (e) { /* giữ nhãn mặc định */ }
        var xfTick = "";
        try { xfTick = (isCrossfadeOn && isCrossfadeOn()) ? "✓ " : ""; } catch (e) { xfTick = ""; }
        items.push({ label: xfTick + xfLabel, action: function () { onCycleCrossfade(); } });
      }
      /* v10.13 — "Tự mở cửa sổ video khi phát video" (chốt của Hải 04/11
         14:46): tick riêng của Amp, mặc định BẬT, đặt trong menu Options
         cạnh nhóm mở Video/Vis (Crossfade ở trên). Tắt thì phát TV chỉ
         nghe tiếng, cửa sổ video không tự mở — mở tay bằng nút video /
         menu View. Menu dựng mới mỗi lần mở nên ✓ luôn đúng; trạng thái
         lưu cùng đường localStorage như các tick Options khác. */
      items.push({ label: (autoOpenVideoEnabled() ? "✓ " : "") + "Tự mở cửa sổ video khi phát video", action: function () { toggleAutoOpenVideo(); } });
      return items;
    }
    function helpMenuItems(anchorDiv) {
      var items = [
        { label: "Giới thiệu về Amp…", action: function () { openAbout(anchorDiv); } },
        { label: "Hướng dẫn nhanh", action: function () { showHelpNote(anchorDiv); } }
      ];
      /* 04/11 — "Xem script MAKI…" chuyển từ nút menu góc dưới-phải vào
         đây (cùng đường onOpenMakiPanel của index.html). Không nối
         callback thì không đưa mục vào (không đưa mục giả). */
      if (onOpenMakiPanel) {
        items.push({ label: "Xem script MAKI…", action: function () { onOpenMakiPanel(); } });
      }
      return items;
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
       thì KHÔNG đưa vào — không đưa mục giả.
       v10.8 (Hải 04/11): Vis_Menu mở lại menu Vis — nhưng CHỈ mục hiệu
       ứng (visMenuItems, 4 mục); các mục video chung ở lại menu View của
       skin. VID_Misc vẫn chỉ mở video (v10.5, không đổi). videoMenuItems/
       visMenuItems vẫn giữ làm API (export, test dùng để đối chiếu đủ
       mục); visContextMenuItems là menu của nút videoavs.open (khôi phục
       ở v10.8 — xem hàm đó). */
    /* v10.4 — mục Milkdrop dùng chung cho menu Vis + Video: chỉ đưa vào
       khi index.html nối callback (không đưa mục giả); nhãn có trạng thái
       Bật/Tắt + ✓ khi bật, như mục "Milkdrop" trong menu View của skin.
       Người dùng tìm hiệu ứng ở menu Vis theo bản năng nên phải thấy ngay ở đây. */
    function milkdropMenuItem() {
      if (!onMilkdropToggle) return null;
      var on = false;
      try { on = !!(isMilkdropOn && isMilkdropOn()); } catch (e) { on = false; }
      return { label: (on ? "✓ " : "") + "Milkdrop: " + (on ? "Bật" : "Tắt"), action: function () { onMilkdropToggle(); } };
    }
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
      var md = milkdropMenuItem();
      if (md) items.splice(1, 0, md); /* ngay sau "Giữ tỉ lệ khung hình" */
      return items;
    }
    function visMenuItems() {
      /* v10.8 (menu Vis của nút Vis_Menu, ảnh 12): menu này CHỈ còn mục
         HIỆU ỨNG (Màu hiệu ứng + Milkdrop) — các mục video chung (Giữ
         tỉ lệ, 1x/2x, Toàn màn hình, Phóng to, Tách rời, Đóng) ở lại
         menu View của skin để khỏi trùng 2 chỗ (xem viewMenuItems).
         "Hiệu ứng trước/sau" trên thanh công cụ (nút Prev/Next/Random)
         và "Màu hiệu ứng ..." trong menu là CÙNG 1 hành động
         (cycleVisVariant — Amp chỉ có 3 màu hiệu ứng, không có bộ đổi
         preset Milkdrop riêng; xem ghi chú v10.4) nên menu chỉ giữ 1
         nhóm nhãn "Màu hiệu ứng", không đưa 2 hàng trùng làm 1 việc. */
      var items = [
        { label: "Màu hiệu ứng trước", action: function () { cycleVisVariant(-1); } },
        { label: "Màu hiệu ứng sau", action: function () { cycleVisVariant(1); } },
        { label: (avsState.visRandom ? "✓ " : "") + "Màu hiệu ứng ngẫu nhiên", action: function () { setVisRandom(!avsState.visRandom); } }
      ];
      var md = milkdropMenuItem();
      if (md) items.push(md);
      return items;
    }
    /* v10.8 — KHÔI PHỤC menu ngữ cảnh của nút videoavs.open (đã gỡ ở
       v10.5, khi đó hàm này bị xóa hẳn): menu điều khiển Video/Vis như
       trước kia — mở Video/Hiệu ứng, cài đặt video chung, màu hiệu ứng,
       Milkdrop, đóng. Đảo ngược chốt v10.5 "chỉ mở video" theo đính
       chính của Hải 08:48 (ảnh 13: nút oval ▼ góc phải trên cửa sổ
       chính chính là videoavs.open — đã xác định bằng XML 566 + đo
       vị trí thật: cụm nền 43×18 tại (309,35) + mũi tên 27×9 tại
       (317,37), khớp khung đỏ trong ảnh). */
    function visContextMenuItems() {
      /* v10.9 (Hải 09:47 — tách nhóm như menu View): 4 nhóm bằng đường
         kẻ: (1) Mở: Mở Video / Mở Hiệu ứng; (2) Cỡ video: Giữ tỉ lệ /
         Cỡ thường / Cỡ gấp đôi / Toàn màn hình / Phóng to / Tách rời;
         (3) Hiệu ứng: Màu ×3 + Milkdrop; (4) Đóng Video/Hiệu ứng. */
      var items = [
        { label: (avsState.open && avsState.mode === "video" ? "✓ " : "") + "Mở Video", action: function () { openAvs("video"); } },
        { label: (avsState.open && avsState.mode === "vis" ? "✓ " : "") + "Mở Hiệu ứng", action: function () { openAvs("vis"); } },
        { sep: true, label: "" },
        { label: (avsState.keepAspect ? "✓ " : "") + "Giữ tỉ lệ khung hình", action: function () { setKeepAspect(!avsState.keepAspect); } },
        { label: "Cỡ thường (1x)", action: function () { setVideoScale(1); } },
        { label: "Cỡ gấp đôi (2x)", action: function () { setVideoScale(2); } },
        { label: "Toàn màn hình", action: function () { requestVideoFullscreen(); } },
        { label: avsState.videoMaximized ? "Khôi phục cửa sổ" : "Phóng to cửa sổ", action: function () { setVideoMaximized(!avsState.videoMaximized); } },
        { label: avsState.detached ? "Gắn lại (Reattach)" : "Tách rời (Detach)", action: function () { if (avsState.detached) reattachAvs(); else { if (!avsState.open) openAvs(avsState.mode || "video"); detachAvs(); } } },
        { sep: true, label: "" },
        { label: "Màu hiệu ứng trước", action: function () { cycleVisVariant(-1); } },
        { label: "Màu hiệu ứng sau", action: function () { cycleVisVariant(1); } },
        { label: (avsState.visRandom ? "✓ " : "") + "Màu hiệu ứng ngẫu nhiên", action: function () { setVisRandom(!avsState.visRandom); } }
      ];
      var md = milkdropMenuItem();
      if (md) items.push(md);
      items.push({ sep: true, label: "" });
      items.push({ label: "Đóng Video/Hiệu ứng", action: function () { closeAvs(); } });
      return items;
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
      if (!it) return { index: -1, name: "", title: "", artist: "Không rõ", album: "Không rõ", group: "", url: "", len: null, lenText: "Trực tiếp", live: false, local: false, fileSize: null, fileSizeText: null, metaStatus: "none", metaSource: "", kbps: null, khz: null, playing: false, kind: "" };
      var live = it.len == null;
      var kbps = null;
      if (it.local && it.fileSize && it.len && it.len > 0) kbps = String(Math.round(it.fileSize * 8 / it.len / 1000));
      var khz = null;
      try { var sr = audioEngine && audioEngine.getSampleRate ? audioEngine.getSampleRate() : null; if (sr && sr > 0) khz = String(Math.round(sr / 1000)); } catch (e) { khz = null; }
      /* Đợt 5: nghệ sĩ/album/thời lượng/kích thước từ metadata tag.
         KBPS/KHZ vẫn tính như cũ (không lấy từ tag — đã chốt không
         làm); fileSizeText dùng format của metadata.js nếu có. */
      var lib5 = getMetaLib();
      var fileSizeText = null;
      if (lib5 && lib5.formatFileSize) { try { fileSizeText = lib5.formatFileSize(it.fileSize || null); } catch (e) { fileSizeText = null; } }
      if (fileSizeText === null && it.fileSize) fileSizeText = Math.round(it.fileSize / 1024) + " KB";
      return {
        index: i, name: it.name || "", title: metadataDisplayName(it),
        artist: metadataDisplayArtist(it), album: metadataDisplayAlbum(it),
        /* v10.17: nhom HIEN THI (playlistGroupName — muc khong co
           group-title thi "Khác"), khong phai group tho trong file —
           de bang thong tin hien dung nhom nhu tieu de nhom trong
           playlist (truoc day radio.m3u duoc fill "Radio" nen group
           luon co; bo fill roi thi group tho la "" — hien "(không rõ)"
           cho moi kenh radio la lui buoc). */
        group: playlistGroupName(it), url: it.url || "",
        len: it.len != null ? it.len : null, lenText: live ? "Trực tiếp" : fmtTime(it.len),
        live: live, local: !!it.local, fileSize: it.fileSize || null, fileSizeText: fileSizeText,
        metaStatus: it.metaStatus || "none", metaSource: it.metaSource || "",
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
      title.textContent = st.title || st.name;
      box.appendChild(title);
      var rows = [
        "Nhóm: " + (st.group || "(không rõ)"),
        "Nghệ sĩ: " + st.artist,
        "Album: " + st.album,
        "Link: " + (st.url || "(file local)"),
        "Thời lượng: " + st.lenText,
        "Kích thước: " + (st.fileSizeText || "—"),
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
      armPanelCloser(anchorDiv); /* v10.9: neo anchor */
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
      rows.push(toggleRow("skin", function () { return "Nạp skin .wal/.wsz/.zip…"; }, null, function () { if (onOpenSkinPicker) onOpenSkinPicker(); }));
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
      armPanelCloser(anchorDiv); /* v10.9: neo anchor */
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
        "Amp v" + RENDERER_VERSION + " — Winamp Modern",
        "Phiên bản Amp: " + RENDERER_VERSION + " (renderer v" + RENDERER_VERSION + ")",
        "Skin: " + (si.name || "Winamp Modern") + (si.version ? " v" + si.version : ""),
        "Tác giả skin: " + (si.author || "(không rõ)"),
        "Mô phỏng Winamp 5.66 Modern trên web — dựng từ XML của skin đang nạp."
      ];
      /* v10.12 (P1 F): liệt kê file thiếu trong .wal (tối đa 8) — để người
         dùng biết lỗi hiển thị (thiếu ảnh/nút) là do file .wal thiếu, không
         phải lỗi Amp. */
      var missing = (RES.report && RES.report.missing) || [];
      if (missing.length) {
        lines.push("File thiếu trong .wal (" + missing.length + "):");
        for (var mi = 0; mi < Math.min(8, missing.length); mi++) lines.push("  - " + missing[mi]);
        if (missing.length > 8) lines.push("  … và " + (missing.length - 8) + " file nữa.");
      }
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
      armPanelCloser(anchorDiv); /* v10.9: neo anchor */
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
      /* v10.12 (P0 C): display/id so không phân biệt hoa/thường (Winamp
         không phân biệt — CROSSNET viết TIME/SONGNAME, Act3 SONGNAME,
         EMP SONGINFO). ":componentname" = tên cửa sổ/thành phần đang vẽ
         (tiêu đề TitleBox, tên cửa sổ chính) — đổi ngay từ đầu để cả 2
         đường font (bitmap/Arial) đều nhận đúng chữ. */
      var disp = (display || "").toLowerCase();
      var lowId = (el.getAttribute("id") || "").toLowerCase();
      var valign = el.getAttribute("valign") || "";
      if (def === ":componentname") def = ctx.titleText || "";
      var color = el.getAttribute("color") || "255,255,255";
      var align = el.getAttribute("align") || "left";
      var div = document.createElement("div");
      div.style.position = "absolute"; div.style.left = x + "px"; div.style.top = y + "px";
      div.style.width = w + "px"; div.style.height = h + "px";
      /* Đợt v10.2 — chữ tràn màn hình (người dùng 18:56: tên bài chạy ra
         khỏi màn hình): hộp chữ PHẢI cắt ở mép hộp như Winamp thật.
         Trước đây div ngoài không có overflow (CSS .stage .ticker cũng
         không khớp class thật) nên chữ dài hơn hộp cứ vẽ tràn ra ngoài
         hộp display, qua mép cửa sổ, ra khỏi màn hình ở chế độ Fit. */
      div.style.overflow = "hidden";
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
      if (disp === "vid_info") {
        var vdiv = await makeBitmapText(fontId, avsState.videoInfo || "", w, align, color, valign, h);
        div.appendChild(vdiv);
        vidInfoEls.push({ div: div, fontId: fontId, boxW: w, align: align, color: color, valign: valign, boxH: h });
        inheritAbs(div);
        return;
      }
      var font = RES.fonts[fontId];
      /* v10.12 (P0 C): các nhánh hiển thị động chạy cho MỌI loại font —
         trước đây cả khối chỉ chạy khi font là bitmapfont nên skin dùng
         truetypefont (CROSSNET TIME/SONGNAME, WMP12 songtitle, DreddfulAmp
         songbitrate...) hiện nguyên chữ display lên màn hình. makeBitmapText
         tự về chữ Arial khi font không phải bitmapfont nên dùng chung được. */
      {
        if (disp === "time" || lowId === "timer") {
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
        if (disp === "songname" || tag === "songticker") {
          /* v10.4 — BO WRAPPER .inner (nguyen nhan goc ticker trang):
             .txt nam trong <div class="inner"> (inline-block rong) thi
             tren trinh duyet that vi tri tinh cua .txt (absolute khong
             top/left) roi xuong ~1 baseline (~13-16px) so voi dinh hop
             .ticker cao 23px, glyph 22px bi overflow:hidden cat gan het
             — dung anh nguoi dung (ticker trong, chi vet mo o day).
             Nay .txt la con TRUC TIEP cua hop .ticker da position nhu
             moi chu bitmap khac (dong ho/KBPS/PLTime) nen vi tri tinh
             = (0,0); rec.holder tro toi chinh .txt (setTickerText thay
             the .txt cu bang .txt moi) de stepTicker/syncTickerAnim/
             getTickerState khong doi. CSS .stage .ticker .inner bo theo. */
          div.className = "ticker";
          var rec = { div: div, holder: null, fontId: fontId, boxW: w, color: color, showlen: el.getAttribute("showlen") === "1", offset: 0, textW: 0 };
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
        if (disp === "pe_info" || lowId === "pltime") {
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
        if (lowId === "cfdisplay") {
          var cfdiv = await makeBitmapText(fontId, String(drawerState.crossfadeSecs), w, align, color, valign, h);
          div.appendChild(cfdiv);
          cfDisplayEls.push({ div: div, fontId: fontId, boxW: w, align: align, color: color });
          inheritAbs(div);
          return;
        }
        /* v10.12 (P0 C): hiển thị thông tin bài (songtitle/artist/album/
           length/bitrate/samplerate/info/systemclock) — map trong
           trackDisplayText, id Bitrate/Frequency so không phân biệt
           hoa/thường (DreddfulAmp viết thường bitrate/sample). Đăng ký
           vào infoEls để updateInfoEls vẽ lại khi đổi bài/metadata về. */
        var mapped = trackDisplayText(disp, lowId);
        if (mapped) {
          var tdiv2 = await makeBitmapText(fontId, mapped.text, w, align, color, valign, h);
          div.appendChild(tdiv2);
          infoEls.push({ div: div, fontId: fontId, boxW: w, align: align, color: color, valign: valign, boxH: h, kind: mapped.kind });
          inheritAbs(div);
          return;
        }
        /* Nhãn tĩnh: chữ default (":componentname" đã đổi thành tên cửa sổ
           ở đầu hàm). Text do script điền (không display, default rỗng
           hoặc "ERROR" — chỗ giữ của script) thì lấy nhãn của phần tử XUI
           chứa nó (ctx.xuiLabelText: labeltext/title của <copcheckbox> /
           <Wasabi:TitleBox> — đúng việc script .maki của skin làm lúc
           chạy). Display lạ (componentbucket...) thì KHÔNG hiện tên
           display — chỉ hiện default, trống nếu không có default. */
        var labelText = def;
        if (!disp && (!labelText || labelText === "ERROR") && ctx.xuiLabelText) labelText = ctx.xuiLabelText;
        var tdiv3 = await makeBitmapText(fontId, labelText, w, align, color, valign, h);
        div.appendChild(tdiv3);
        if (el.getAttribute("shadow") === "1") div.style.textShadow = "1px 1px #000";
        inheritAbs(div);
        return;
      }
    }
    async function setTickerText(rec) {
      /* Đợt v10.1 (Classic): rec Classic không có fontId/holder — chữ
         chạy của nó do refreshClassicMain() vẽ bằng sprite TEXT.bmp.
         Gọi vào đây (playPlaylistItem/showTickerError/clearTickerError)
         thì chỉ refresh, KHÔNG ghi đè holder bằng chữ Arial. */
      if (rec && rec.classic) { refreshClassicMain(); return; }
      /* v10.3 (H2 ticker trang): seq-guard THEO REC (giong timerElsSeq /
         infoElsSeq nhung theo tung rec vi setTickerText goi rieng cho
         tung rec: main + shade co 2 rec khac nhau, dung 1 seq chung se
         huy lan nhau). Lan goi cu resolve muon (sau await makeBitmapText)
         thay seq da doi thi bo, khong ghi de chu moi. */
      var myTickerSeq = (rec._tickerSeq || 0) + 1; rec._tickerSeq = myTickerSeq;
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
      if (rec._tickerSeq !== myTickerSeq) return; /* lan goi moi hon da thang */
      /* v10.4 — rec.holder LA .txt (con truc tiep cua hop .ticker): thay
         the .txt cu bang .txt moi thay vi append long nhau; lan dau
         holder null thi append thang vao hop. */
      if (rec.holder && rec.holder.parentElement === rec.div) rec.div.replaceChild(tdiv, rec.holder);
      else rec.div.appendChild(tdiv);
      rec.holder = tdiv;
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
    /* Đợt v10.0 (sửa hồi quy do cache loadFont): vẽ lại đồng hồ là async
       (await makeBitmapText) — 2 lần gọi chồng nhau (bấm đổi chế độ +
       timeupdate) thì lần gọi SAU phải thắng; lần cũ resolve muộn hơn
       không được ghi đè. Số thứ tự: lần cũ thấy seq đã đổi thì bỏ. */
    var timerElsSeq = 0;
    async function updateTimerEls() {
      var mySeq = ++timerElsSeq;
      refreshClassicMain(); /* Đợt v10.1: Classic — đồng hồ số + đồng hồ mini (đồng bộ, rẻ) */
      for (var i = 0; i < timerEls.length; i++) {
        var rec = timerEls[i];
        try {
          var tdiv = await makeBitmapText(rec.fontId, timerDisplayText(), rec.boxW, rec.align, rec.color);
          if (mySeq !== timerElsSeq) return;
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
    /* v10.12 (P0 C): thông tin mục đang chọn cho map display. Tên bài lấy
       theo metadataDisplayName (tag title nếu có, không thì tên file/kênh);
       nghệ sĩ/album lấy thô từ mục (trống khi chưa biết — Winamp cũng để
       trống, không bịa "Không rõ" ở đây); thời lượng "" khi là đài live. */
    function currentTrackItem() { return playlistState.items[playlistState.current] || null; }
    function currentTrackName() { var it = currentTrackItem(); return it ? metadataDisplayName(it) : ""; }
    function currentTrackArtist() { var it = currentTrackItem(); return it ? ((it.artist || "").replace(/^\s+|\s+$/g, "")) : ""; }
    function currentTrackAlbum() { var it = currentTrackItem(); return it ? ((it.album || "").replace(/^\s+|\s+$/g, "")) : ""; }
    function currentTrackLengthText() { var it = currentTrackItem(); return (it && it.len != null) ? fmtTime(it.len) : ""; }
    function songInfoLineText() {
      var v = songInfoValues();
      return (v.kbps !== null ? v.kbps : "128") + " kbps " + (v.khz !== null ? v.khz : "44") + " kHz";
    }
    function systemClockText() {
      var d = new Date();
      return d.getHours() + ":" + String(d.getMinutes()).padStart(2, "0");
    }
    /* v10.12 (P0 C): map display -> {text, kind} cho các hiển thị thông
       tin bài hát của Winamp. kind để updateInfoEls vẽ lại khi đổi bài /
       metadata về. Trả null khi display không thuộc map (vd ERROR,
       componentbucket — rơi về chữ default). */
    function trackDisplayText(disp, lowId) {
      if (disp === "songbitrate" || lowId === "bitrate") return { text: songInfoText("Bitrate"), kind: "bitrate" };
      if (disp === "songsamplerate" || lowId === "frequency") return { text: songInfoText("Frequency"), kind: "frequency" };
      if (disp === "songinfo") return { text: songInfoLineText(), kind: "songinfo" };
      if (disp === "songtitle") return { text: currentTrackName(), kind: "songtitle" };
      if (disp === "songartist") return { text: currentTrackArtist(), kind: "songartist" };
      if (disp === "songalbum") return { text: currentTrackAlbum(), kind: "songalbum" };
      if (disp === "songlength") return { text: currentTrackLengthText(), kind: "songlength" };
      if (disp === "systemclock") return { text: systemClockText(), kind: "systemclock" };
      return null;
    }
    function getSongInfoState() {
      var v = songInfoValues();
      return { khz: v.khz !== null ? v.khz : "44", khzDemo: v.khzDemo, kbps: v.kbps !== null ? v.kbps : "128", kbpsDemo: v.kbpsDemo };
    }
    /* Vẽ lại PLTime (đồng hồ playlist, việc 3 đợt A) tại chỗ sau khi
       thêm/xóa/sắp xếp/chọn mục — không cần re-render toàn cửa sổ. */
    /* Đợt v10.0: cùng số thứ tự như updateTimerEls — tránh lần vẽ cũ
       (đổi bài/metadata về) ghi đè lần vẽ mới của KBPS/KHZ/PLTime. */
    var infoElsSeq = 0;
    async function updateInfoEls() {
      var mySeq = ++infoElsSeq;
      for (var i = 0; i < infoEls.length; i++) {
        var rec = infoEls[i];
        /* v10.12 (P0 C): thêm các kind của map display (songtitle/artist/
           album/length/info/systemclock) — vẽ lại cùng đường với
           pltime/bitrate/frequency khi đổi bài/metadata về. */
        if (["pltime", "bitrate", "frequency", "songinfo", "songtitle", "songartist", "songalbum", "songlength", "systemclock"].indexOf(rec.kind) < 0) continue;
        try {
          /* Đợt B (9.9): bitrate/frequency vẽ lại khi có số mới (đổi bài,
             metadata về, EQ bật làm graph xuất hiện). */
          var txt = rec.kind === "pltime" ? playlistClockText()
            : rec.kind === "bitrate" ? songInfoText("Bitrate")
            : rec.kind === "frequency" ? songInfoText("Frequency")
            : rec.kind === "songinfo" ? songInfoLineText()
            : rec.kind === "songtitle" ? currentTrackName()
            : rec.kind === "songartist" ? currentTrackArtist()
            : rec.kind === "songalbum" ? currentTrackAlbum()
            : rec.kind === "songlength" ? currentTrackLengthText()
            : systemClockText();
          var tdiv = await makeBitmapText(rec.fontId, txt, rec.boxW, rec.align, rec.color, rec.valign, rec.boxH);
          if (mySeq !== infoElsSeq) return;
          rec.div.innerHTML = "";
          rec.div.appendChild(tdiv);
          if (rec.kind === "pltime") lastPlClockDrawn = txt; /* v10.7 (107): ghi text PLTime đã vẽ để tick chỉ vẽ lại khi đổi giây */
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
      /* v10.5 (bo hieu ung mac dinh khi khong co nhac): cung la diem
         choke de danh gia lai hien/an cua canvas Milkdrop NGAY khi
         phat/dung/tam dung (xem applyMilkdropVisibility) — khong doi
         lan render sau. Quan trong khi bat Milkdrop luc DUNG roi moi
         bam Play: luc bat thi shown=false (chua phat); neu khong danh
         gia lai o day thi shown mai false, index.html syncMilkdrop
         doc shown cu -> setVisible(false) -> loop khong bao gio chay.
         Chi khi shown doi thi callback onMilkdropShownChange moi chay
         nen goi o day re (khong render lai). */
      applyMilkdropVisibility();
      refreshClassicMain(); /* Đợt v10.1: Classic — đèn play/pause, đồng hồ, chữ chạy, mono/stereo */
    }
    /* v10.8 (108, 04/11 — Hải 08:27 "thanh volum kéo max nó ra hơn cả nút"):
       bề rộng fill dừng ĐÚNG tại MÉP PHẢI thumb, không tràn ra ngoài.
       Fill cũ = frac × toàn track (volume: volume×86; seek: frac×244)
       trong khi thumb đặt ở frac×(track−thumbW): ở max, fill dài hơn
       nút — Modern: fill 185..271 trong khi thumb 248..269 (tràn 2px);
       shade: fill 168..224 vs thumb 204..220 (tràn 4px).
       v10.9 (04/11 — Hải 09:43 "kéo xuống hết vẫn dư", ảnh image-21):
       công thức v10.8 (tới MÉP PHẢI thumb) SAI ở đầu 0: ở frac=0, fill
       vẫn rộng bằng tw (bề rộng nút: volume 19px = 204−185) — đoạn dư
       đó chính là bề rộng nút. Công thức đúng: fill kết thúc tại điểm
       trên nút chạy tuyến tính từ MÉP TRÁI nút (frac=0) tới MÉP PHẢI
       nút (frac=1), tức fillW = (sliderAbsX − fillAbsX) + frac×trackW:
       volume 566 (slider 183/w86, fill 185): 0→0, 0.5→41 (đúng tâm nút),
       1→84 (đúng mép phải nút); seek (slider 6/w254, fill 10): 0→0,
       0.5→123, 1→250; shade (slider 164/w56, fill 168): 0→0, 0.5→24,
       1→52. Tìm slider cùng action, ưu tiên cùng cha (main vs shade có
       2 slider VOLUME riêng, cùng action); không thấy slider thì trả
       null để gọi lại dùng công thức cũ. Balance/preamp/EQ không có fill
       nên không đổi gì; Classic không có fill dạng width (chỉ thumb +
       đổi nền track).
       v10.10 (04/11 — Hải 10:21 \"lên max còn\" trên điện thoại thật,
       ảnh 1000094747_1_t1pd.jpg): công thức v10.9 đúng với DIV nút
       (đo DOM headless 360px + fit: fillRight == thumbRight) nhưng SAI
       với MẮT NGƯỜI — bitmap nút có ~2,5px trong suốt ở mép phải nên
       vạch xanh vẫn thừa ra phải nút trắng nhìn thấy. Nay điểm đích là
       MÉP PHẢI NHÌN THẤY của nút (rec.visibleRight, đo từ alpha bitmap
       thật của skin — xem measureThumbVisibleRight; chưa đo được thì
       = tw, hành vi v10.9): volume 566: 0→0, 0.5→40, 1→81; seek:
       0→0, 0.5→122, 1→248; shade volume: 0→0, 0.5→23, 1→50. */
    function fillWidthToThumbRight(fillDiv, action, frac) {
      var best = null;
      for (var i = 0; i < sliderRecords.length; i++) {
        var rec = sliderRecords[i];
        if (!rec || rec.action !== action || !rec.div || !rec.thumb) continue;
        if (rec.div.parentElement === fillDiv.parentElement) { best = rec; break; }
        if (!best) best = rec;
      }
      if (!best) return null;
      var f = Math.max(0, Math.min(1, frac));
      var vr = (best.visibleRight != null && best.visibleRight > 0) ? best.visibleRight : best.tw;
      var w = (best.div._absX || 0) + f * (best.w - best.tw + vr) - (fillDiv._absX || 0);
      if (!isFinite(w)) return null;
      return Math.max(0, Math.round(w));
    }
    function updateProgress() {
      for (var i = 0; i < progressEls.length; i++) {
        var elP = progressEls[i];
        var wP = fillWidthToThumbRight(elP.div, "SEEK", demo.seekFrac);
        if (wP === null) wP = Math.round(demo.seekFrac * elP.fullW);
        elP.div.style.width = wP + "px";
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
      refreshClassicMain(); /* Đợt v10.1: Classic — thumb seek/volume/balance + kbps/khz */
    }
    function updateVolumebar() {
      for (var i = 0; i < volumebarEls.length; i++) {
        var elV = volumebarEls[i];
        var wV = fillWidthToThumbRight(elV.div, "VOLUME", demo.volume);
        if (wV === null) wV = Math.round(demo.volume * elV.maxW); /* v10.9: không min 2px — ở 0 fill phải về 0, không để vệt */
        elV.div.style.width = wV + "px";
      }
      refreshClassicMain(); /* Đợt v10.1: Classic — thumb volume */
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
    /* Đợt v10.0 (việc AVS-vis, 15:15) — vạch spectrum trong vùng AVS/Video
       vẽ KIỂU WEBAMP, chỉ áp cho canvas AVS (fillBg=true); canvas display
       giữ nguyên 16 cột trực tiếp (người dùng xác nhận 15:14 đã giống
       Webamp, không đụng tới). Lấy HÀNH VI từ BarPaintHandler của Webamp
       (packages/webamp/js/components/VisPainter.ts — KHÔNG bê code, viết
       lại theo Amp, không dùng FFTNullsoft):
       - 75 cột mỏng (AVS_BARS=75), nhóm 4 cột lấy trung bình rồi bỏ 1 cột
         làm khe (bandwidth "wide": 3 cột + 1 khe) — như Webamp.
       - Ánh xạ tần số log: scale 0.91 (0 = tuyến tính, 1 = log hẳn),
         nội suy giữa 2 bin kề — như Webamp (maxFreqIndex = số bin của
         analyser Amp, fftSize 1024 → 512 bin).
       - Falloff: lên tức thì, xuống 0.75 hàng/khung (falloff 12
         "moderate" /16 của Webamp); đỉnh (peak) 1 vạch, vận tốc rơi
         khởi đầu 3/256 hàng/khung rồi nhân 1.1 mỗi khung ("slow").
       - Màu: gradient theo HÀNG (hàng r → ColorBand r+1 của <vis>; band 1
         = hàng đáy); variant 1-2 (VIS_Prev/Next) thì 1 màu đặc như cũ.
         Vạch peak lấy màu hàng trên cùng (variant 0) hoặc màu variant.
       - Chế độ flat/sample: vẽ trực tiếp (phẳng 2px / sine), không
         falloff/peak — giống display. State falloff/peak reset khi rời
         mode real hoặc đổi analyser (setAvsAnalyser). */
    var AVS_BARS = 75, AVS_ROWS = 16, AVS_MAX_ROWS = 15;
    var AVS_FALLOFF = 12 / 16; /* 0.75 hàng/khung — "moderate" của Webamp */
    var AVS_PEAK_VEL0 = 3 / 256, AVS_PEAK_FALLOFF = 1.1; /* "slow" */
    var AVS_PUSHDOWN = 2; /* Đợt v10.2 — Webamp (VisPainter.ts): cột/peak/
       sóng đều đẩy xuống 2 hàng (2 hàng trống trên cùng); barHeight =
       round(falloff) − 2 (tối đa 13 hàng), peakHeight = peakRows − 1. */
    var avsShownRows = [], avsPeakRows = [], avsPeakVel = [];
    var lastAvsFrame = { mode: "sample", maxBin: 0, heights: [], peaks: [] };
    var avsGradCanvas = null, avsGradKey = "";
    /* Đợt v10.11 — peak tracker cho chuẩn hoá vis display (xem visBarHeight):
       đỉnh khung hiện tại, rớt 0.995/khung; reset khi đổi analyser hoặc
       rời mode "real" (trong resetAvsVisState + drawVisStatic). */
    var visNormPeak = 0;
    function resetAvsVisState() {
      avsShownRows = []; avsPeakRows = []; avsPeakVel = [];
      visNormPeak = 0;
      for (var k = 0; k < AVS_BARS; k++) { avsShownRows.push(0); avsPeakRows.push(0); avsPeakVel.push(0); }
      lastAvsFrame = { mode: lastAvsFrame.mode || "sample", maxBin: 0, heights: [], peaks: [] };
    }
    resetAvsVisState();
    function getAvsFrame() { return { mode: lastAvsFrame.mode, maxBin: lastAvsFrame.maxBin, heights: lastAvsFrame.heights.slice(), peaks: lastAvsFrame.peaks.slice(), visType: lastAvsFrame.visType || "bar" }; }
    /* Giá trị mục tiêu (hàng 0..15) của cột k: ánh xạ log như Webamp trên
       các bin getByteFrequencyData của Amp (0..255 → 0..15 hàng). */
    function avsLogTarget(k, freq) {
      if (!freq || !freq.length) return 0;
      var nb = AVS_BARS, maxFreqIndex = freq.length;
      var logMax = Math.log10(maxFreqIndex);
      var linearIndex = (k / (nb - 1)) * (maxFreqIndex - 1);
      var logIndex = Math.pow(10, (logMax * k) / (nb - 1));
      var scaled = 0.09 * linearIndex + 0.91 * logIndex;
      var i1 = Math.floor(scaled), i2 = Math.ceil(scaled);
      if (i1 >= maxFreqIndex) i1 = maxFreqIndex - 1;
      if (i2 >= maxFreqIndex) i2 = maxFreqIndex - 1;
      var v = (i1 === i2) ? freq[i1] : (1 - (scaled - i1)) * freq[i1] + (scaled - i1) * freq[i2];
      return Math.min(AVS_MAX_ROWS, (v / 255) * AVS_MAX_ROWS);
    }
    /* Canvas gradient 1×16 cho cột AVS. Đợt v10.2 — sửa theo Webamp
       (VisPainter.ts prepare): hàng y (từ trên) = colors[y] = bands[y−2]
       (pushDown=2); hàng 0–1 là nền (không bao giờ vẽ — cột tối đa 13
       hàng). Trước đây Amp tô bands[15−y] (LỘN: cột ngắn cũng hiện đủ
       xanh→đỏ, đỉnh xanh lá) + vẽ kéo giãn toàn bộ gradient vào mọi cột
       (cột ngắn cũng đủ màu). Giờ cột chỉ hiện các hàng DƯỚI của gradient
       (neo đáy, xem drawAvsVis): cột ngắn chỉ xanh, cột cao mới tới đỏ. */
    function avsBarGradient(useXmlCol, col) {
      var key = (useXmlCol ? "xml:" + visXmlBands.join(",") : "var:" + col);
      if (avsGradCanvas && avsGradKey === key) return avsGradCanvas;
      avsGradKey = key; avsGradCanvas = null;
      if (!document || !document.createElement) return null;
      var cv = null;
      try { cv = document.createElement("canvas"); } catch (e) { return null; }
      if (!cv) return null;
      cv.width = 1; cv.height = AVS_ROWS;
      var g = null;
      try { g = cv.getContext("2d"); } catch (e) { g = null; }
      if (!g) return null;
      for (var y = 0; y < AVS_ROWS; y++) {
        g.fillStyle = useXmlCol ? ((y < AVS_PUSHDOWN) ? VIS_BG : (visXmlBands[y - AVS_PUSHDOWN] || "#fff")) : col;
        g.fillRect(0, y, 1, 1);
      }
      avsGradCanvas = cv;
      return cv;
    }
    /* Đợt 4 (03/11) — giá trị sóng tại vị trí p (0..1 ngang canvas), -1..1:
       - real + có time-domain: mẫu thật từ getByteTimeDomainData.
       - real + không có time-domain (stub/jsdom): biên độ theo bin tần số,
         dấu theo sine (đủ để vẽ sóng, không bịa thành tín hiệu im).
       - flat: 0 (đường thẳng giữa — vis im).
       - sample: sine trang trí như cột mẫu. */
    function visWaveValue(p, visMode, freq, td) {
      if (visMode === "flat") return 0;
      if (visMode === "real" && td && td.length) {
        var v = td[Math.min(td.length - 1, Math.floor(p * td.length))] || 128;
        return (v - 128) / 128;
      }
      if (visMode === "real" && freq && freq.length) {
        var bin = freq[Math.min(freq.length - 1, Math.floor(p * freq.length))] || 0;
        return Math.sin(p * Math.PI * 8 + avsPhase) * (bin / 255);
      }
      return Math.sin(p * Math.PI * 8 + avsPhase);
    }
    /* Đợt v10.2 — sóng kiểu Webamp (WavePaintHandler): analyser fftSize
       1024 -> 1024 mẫu time-domain, lấy 576 mẫu đầu, sliceWidth 7 ->
       76 điểm j=0..75, y = kẹp(round(amp/8) − 9, 0, 15) (amp = byte
       0..255; im lặng 128 -> hàng 7, giữa canvas). Trước đây Amp chỉ có
       64 mẫu (fftSize 64) nên sóng là lát cắt 1,45 ms, gần như đường
       thẳng — "ít nhảy". */
    var WAVE_POINTS = 76, WAVE_SLICE = 7;
    function waveRowsFromTd(td) {
      if (!td || !td.length) return null;
      var rows = [];
      for (var j = 0; j < WAVE_POINTS; j++) {
        var amp = td[Math.min(td.length - 1, j * WAVE_SLICE)] || 128;
        var r = Math.round(amp / 8) - 9;
        if (r < 0) r = 0; if (r > 15) r = 15;
        rows.push(r);
      }
      return rows;
    }
    /* Biên độ sóng (0..1) của cột k trong n cột — ghi vào heights cho test. */
    function visWaveAmp(k, n, visMode, freq, td) {
      if (visMode === "real" && td && td.length) {
        var rows = waveRowsFromTd(td);
        if (rows) {
          var row = rows[Math.min(rows.length - 1, Math.floor((k + 0.5) / n * rows.length))];
          if (row === undefined) row = 7;
          return Math.abs(row - 7.5) / 7.5;
        }
      }
      return Math.abs(visWaveValue((k + 0.5) / n, visMode, freq, td));
    }
    /* Vẽ 1 đường sóng ngang canvas (ctx2 null trong jsdom thì thôi).
       real + có td: đoạn dọc nối 76 điểm kiểu Webamp ("lines": đi xuống
       thì top++ như Winamp/WACUP), đẩy xuống 2 hàng; màu 1 màu (peak
       color — skin Modern không có palette osc riêng colors[18..22] như
       Classic nên dùng 1 màu, ghi rõ trong README). Không có td thật
       (flat/sample/stub) thì giữ đường sine cũ. */
    function drawVisWave(ctx2, W, H, visMode, freq, td, col) {
      if (!ctx2 || !W || !H) return;
      try {
        var rows = (visMode === "real") ? waveRowsFromTd(td) : null;
        if (rows && typeof ctx2.fillRect === "function") {
          var rowH = H / AVS_ROWS;
          ctx2.fillStyle = col;
          var lastY = (rows[0] + AVS_PUSHDOWN) * rowH;
          for (var j = 0; j < rows.length; j++) {
            var y = (rows[j] + AVS_PUSHDOWN) * rowH;
            if (y < 0) y = 0; if (y > H - rowH) y = H - rowH;
            var x = Math.round(j * W / rows.length);
            var top = y, bottom = lastY;
            if (bottom < top) { var tmp = top; top = bottom; bottom = tmp; top += 1; /* đi xuống thì top++ */ }
            ctx2.fillRect(x, top, 1, Math.max(1, bottom - top + 1));
            lastY = y;
          }
          return;
        }
        if (typeof ctx2.beginPath !== "function") return;
        ctx2.beginPath();
        for (var x2 = 0; x2 <= W; x2 += 2) {
          var y2 = H / 2 - visWaveValue(x2 / W, visMode, freq, td) * (H / 2 - 2);
          if (x2 === 0) ctx2.moveTo(x2, y2); else ctx2.lineTo(x2, y2);
        }
        ctx2.strokeStyle = col;
        ctx2.lineWidth = 1;
        if (typeof ctx2.stroke === "function") ctx2.stroke();
      } catch (e) { /* stub canvas thiếu method -> thôi */ }
    }
    /* Vẽ 1 khung vis AVS (ctx2 null trong jsdom thì chỉ tính heights/peaks
       cho test). H: chiều cao canvas; rowH = H/16.
       Đợt 4: thêm visType ("bar"|"osc"|"none") + td (time-domain):
       osc = đường sóng (không falloff/peak), none = xóa trắng. */
    function drawAvsVis(ctx2, W, H, visMode, freq, maxBin, useXmlCol, col, visType, td) {
      visType = visType || "bar";
      var rowH = H / AVS_ROWS;
      var heights = [], peaks = [];
      var grad = null;
      if (ctx2) {
        ctx2.clearRect(0, 0, W, H);
        ctx2.fillStyle = VIS_BG;
        ctx2.fillRect(0, 0, W, H);
        grad = avsBarGradient(useXmlCol, col);
      }
      if (visType === "none") {
        /* Tắt vis: canvas chỉ còn nền, không falloff/peak. */
        resetAvsVisState();
        for (var kn = 0; kn < AVS_BARS; kn++) { heights.push(0); peaks.push(0); }
        lastAvsFrame = { mode: visMode, maxBin: maxBin, heights: heights, peaks: peaks, visType: visType };
        return;
      }
      if (visType === "osc") {
        /* Sóng: vẽ đường + heights = biên độ từng cột, không falloff/peak. */
        resetAvsVisState();
        var waveCol = useXmlCol ? (visXmlPeak || "#fff") : col;
        if (ctx2) drawVisWave(ctx2, W, H, visMode, freq, td, waveCol);
        for (var ko = 0; ko < AVS_BARS; ko++) {
          heights.push(Math.round(visWaveAmp(ko, AVS_BARS, visMode, freq, td) * (H - 4)) + 2);
          peaks.push(0);
        }
        lastAvsFrame = { mode: visMode, maxBin: maxBin, heights: heights, peaks: peaks, visType: visType };
        return;
      }
      if (visMode !== "real") {
        /* flat/sample: vẽ trực tiếp, reset state falloff/peak. */
        resetAvsVisState();
        var bw = W / AVS_BARS;
        for (var k = 0; k < AVS_BARS; k++) {
          var hh = 0;
          if (visMode === "flat") hh = 2;
          else hh = 2 + Math.abs(Math.sin(k * 0.9 + avsPhase)) * (H - 6);
          heights.push(hh); peaks.push(0);
          if (ctx2 && k % 4 !== 3 && hh > 0) {
            ctx2.fillStyle = useXmlCol ? (visXmlBands[0] || "#fff") : col;
            ctx2.fillRect(k * bw + 1, H - hh, Math.max(1, bw - 2), hh);
          }
        }
        lastAvsFrame = { mode: visMode, maxBin: maxBin, heights: heights, peaks: peaks, visType: visType };
        return;
      }
      /* real: mẫu log theo nhóm 4 (wide bandwidth) + falloff + peak.
         Đợt v10.2 — hình học đúng Webamp (VisPainter.ts): barHeight =
         round(falloff) − pushDown (tối đa 13 hàng, 2 hàng trống trên
         cùng); gradient vẽ neo đáy (chỉ các hàng DƯỚI của gradient,
         cột ngắn chỉ xanh); peak 1 hàng (rowH), ở trên đỉnh cột
         (peakY = H − (peakRows−1)·rowH), ẩn khi peakRows < 1; màu peak
         từ colorbandpeak (trước đây nhầm màu đáy + cao 2px + không có
         pushDown). heights/peaks ghi theo px để test đo được. */
      var sample = [];
      for (var s = 0; s < AVS_BARS; s++) sample.push(avsLogTarget(s, freq));
      var bw2 = W / AVS_BARS;
      var peakCol = useXmlCol ? (visXmlPeak || "#fff") : col;
      for (var k2 = 0; k2 < AVS_BARS; k2++) {
        var chunk = k2 & 0xfffffffc;
        var target = ((sample[chunk] || 0) + (sample[chunk + 1] || 0) + (sample[chunk + 2] || 0) + (sample[chunk + 3] || 0)) / 4;
        avsShownRows[k2] -= AVS_FALLOFF;
        if (avsShownRows[k2] <= target) avsShownRows[k2] = target;
        if (avsPeakRows[k2] <= avsShownRows[k2]) { avsPeakRows[k2] = avsShownRows[k2]; avsPeakVel[k2] = AVS_PEAK_VEL0; }
        var peakRows = avsPeakRows[k2];
        avsPeakRows[k2] -= avsPeakVel[k2];
        avsPeakVel[k2] *= AVS_PEAK_FALLOFF;
        if (avsPeakRows[k2] <= 0) avsPeakRows[k2] = 0;
        var barRows = Math.max(0, Math.round(avsShownRows[k2]) - AVS_PUSHDOWN);
        var barPx = barRows * rowH;
        var peakPx = (peakRows < 1) ? 0 : peakRows * rowH;
        heights.push(k2 % 4 === 3 ? 0 : barPx);
        peaks.push(k2 % 4 === 3 ? 0 : peakPx);
        if (!ctx2 || k2 % 4 === 3) continue;
        var bx = k2 * bw2 + 1, bwid = Math.max(1, bw2 - 2);
        if (barPx > 0) {
          if (grad && typeof ctx2.drawImage === "function") ctx2.drawImage(grad, 0, AVS_ROWS - barRows, 1, barRows, bx, H - barPx, bwid, barPx);
          else { ctx2.fillStyle = useXmlCol ? (visXmlBands[0] || "#fff") : col; ctx2.fillRect(bx, H - barPx, bwid, barPx); }
        }
        if (peakPx > 0) {
          ctx2.fillStyle = peakCol;
          ctx2.fillRect(bx, H - (peakRows - 1) * rowH, bwid, rowH);
        }
      }
      lastAvsFrame = { mode: visMode, maxBin: maxBin, heights: heights, peaks: peaks, visType: visType };
    }
    function drawVisStatic() {
      var freq = null, maxBin = 0, td = null;
      var hasAnalyser = !!(avsAnalyser && typeof avsAnalyser.getByteFrequencyData === "function" && avsAnalyser.frequencyBinCount);
      if (hasAnalyser) {
        try {
          freq = new Uint8Array(avsAnalyser.frequencyBinCount);
          avsAnalyser.getByteFrequencyData(freq);
          for (var fi = 0; fi < freq.length; fi++) if (freq[fi] > maxBin) maxBin = freq[fi];
        } catch (e) { freq = null; maxBin = 0; }
        /* Đợt 4: time-domain cho dạng sóng (oscilloscope). Không có hàm
           (stub/jsdom) thì td = null — visWaveValue tự suy từ freq/sine. */
        if (typeof avsAnalyser.getByteTimeDomainData === "function") {
          try {
            td = new Uint8Array(avsAnalyser.fftSize || avsAnalyser.frequencyBinCount * 2);
            avsAnalyser.getByteTimeDomainData(td);
          } catch (e) { td = null; }
        }
      }
      /* Đợt B (9.9): chế độ vẽ theo EQ + tín hiệu (xem ghi chú trên). */
      var visMode = (!hasAnalyser || !drawerState.eqOn) ? "sample" : (maxBin >= 4 ? "real" : "flat");
      /* Đợt v10.11 — biên độ display đã equalize + chuẩn hoá (tính 1 lần/khung,
         chỉ mode "real"): byte freq -> dB (min/maxDecibels của analyser, mặc
         định -100/-30 như Web Audio) -> tuyến tính 10^(dB/20) -> nhân bảng
         equalize Nullsoft -> chuẩn hoá theo peak (rớt 0.995/khung). Chỉ lấy
         NỬA ĐẦU bin của analyser: FFT Nullsoft của Webamp chỉ bao 0..Fs/4
         (~11kHz ở 44,1kHz) nên cột cao nhất của Webamp đọc ~11kHz (stream
         radio vẫn còn năng lượng); analyser của Amp bao 0..Fs/2 (~22kHz) nên
         lấy hết thì cột cao đọc 18–22kHz — vùng stream 128kbps đã lowpass
         hết, cột chết (đúng lỗi Hải báo 04/11). Mảng `freq` thô GIỮ NGUYÊN
         cho beat (bass dùng bin thô) và OSC (time-domain) bên dưới. */
      var visNorm = null;
      if (visMode === "real" && freq) {
        var visMinDb = (avsAnalyser && typeof avsAnalyser.minDecibels === "number") ? avsAnalyser.minDecibels : -100;
        var visMaxDb = (avsAnalyser && typeof avsAnalyser.maxDecibels === "number") ? avsAnalyser.maxDecibels : -30;
        var visNBins = Math.max(1, Math.floor(freq.length / 2));
        var visEq = getVisEqualizeTable(visNBins);
        visNorm = new Array(visNBins);
        var visFramePeak = 0;
        for (var vei = 0; vei < visNBins; vei++) {
          var vdb = visMinDb + (freq[vei] / 255) * (visMaxDb - visMinDb);
          var vemag = Math.pow(10, vdb / 20) * visEq[vei];
          visNorm[vei] = vemag;
          if (vemag > visFramePeak) visFramePeak = vemag;
        }
        visNormPeak = Math.max(visNormPeak * 0.995, visFramePeak);
        if (visNormPeak > 0) {
          for (var vni = 0; vni < visNBins; vni++) visNorm[vni] = visNorm[vni] / visNormPeak;
        }
      } else {
        visNormPeak = 0; /* rời mode "real": bỏ neo peak cũ */
      }
      /* visBarHeight nhánh "real" đọc mảng norm đã equalize; flat/sample
         không dùng mảng nên truyền freq thô cũng được — giữ 1 biến chung. */
      var barVals = (visMode === "real") ? visNorm : freq;
      var useXmlCol = avsState.visVariant === 0;
      var col = (VIS_VARIANTS[avsState.visVariant] || VIS_VARIANTS[0]).col;
      var heights = [];
      var firstVisType = visCanvases.length ? ((visCanvases[0].fillBg === true) ? visTypeAvs : visTypeDisplay) : visTypeDisplay;
      for (var i = 0; i < visCanvases.length; i++) {
        var v = visCanvases[i];
        var ctx2 = null;
        try { ctx2 = v.cv.getContext("2d"); } catch (e) { ctx2 = null; }
        /* Đợt v10.0 (việc AVS-vis, 15:15): canvas AVS (fillBg=true) vẽ
           kiểu Webamp qua drawAvsVis (75 cột mỏng, falloff, peak,
           gradient hàng); canvas display giữ nguyên 16 cột trực tiếp
           bên dưới (người dùng xác nhận 15:14 đã giống Webamp). */
        if (v.fillBg === true) {
          /* v10.3 — VUNG AVS/VIDEO KHONG VE SPECTRUM NUA. Webamp/Winamp
             that: cua so Video thuc chat la cua so Milkdrop (co hinh thi
             hien <video>, chi co tieng thi ve Milkdrop); cot spectrum 75
             cot CHI thuoc display cua so chinh (76x16 px) — Amp cu ve
             spectrum vao AVS la SAI VI TRI (mau trang thi dung theo XML
             566 vi ColorBand1..16 deu trang). Nay:
             - Milkdrop BAT + DANG PHAT: canvas Milkdrop de len, khoi ve
               gi vao canvas spectrum (continue) — drawAvsVis GIU LAI de
               doi chieu, khong con goi tu day.
             - Milkdrop TAT, hoac DANG DUNG/TAM DUNG/CHUA PHAT (v10.5,
               bo hieu ung mac dinh khi khong co nhac): to den canvas
               (#000, trung nen wrap) — vung AVS den/trong, khong cot
               nao. Spectrum + song OSC chi con o display cua so chinh
               (nhanh ben duoi) va day playlist khi main dong. */
          if (milkdropActive && demo.playing) {
            lastAvsFrame = { mode: "milkdrop", maxBin: maxBin, heights: [], peaks: [], visType: visTypeAvs };
            continue;
          }
          if (ctx2) {
            try {
              ctx2.clearRect(0, 0, v.cv.width || 0, v.cv.height || 0);
              ctx2.fillStyle = "#000";
              ctx2.fillRect(0, 0, v.cv.width || 0, v.cv.height || 0);
            } catch (e) { /* stub canvas */ }
          }
          lastAvsFrame = { mode: "black", maxBin: maxBin, heights: [], peaks: [], visType: visTypeAvs };
          continue;
        }
        /* Đợt 4 — kiểu vis của vùng display (bar/osc/none), áp cho cả
           canvas display Modern lẫn vis Classic (classic:true). */
        var vtype = visTypeDisplay;
        if (vtype === "none") {
          if (ctx2) { try { ctx2.clearRect(0, 0, v.cv.width || 0, v.cv.height || 0); } catch (e) { /* bỏ qua */ } }
          if (i === 0) for (var kn = 0; kn < VIS_BANDS; kn++) heights.push(0);
          continue;
        }
        if (vtype === "osc") {
          var Wo = v.cv.width || 0, Ho = v.cv.height || 0;
          if (ctx2) {
            try { ctx2.clearRect(0, 0, Wo, Ho); } catch (e) { /* bỏ qua */ }
            drawVisWave(ctx2, Wo, Ho, visMode, freq, td, useXmlCol ? (v.bands[0] || "#fff") : col);
          }
          if (i === 0) for (var ko = 0; ko < VIS_BANDS; ko++) heights.push(Math.round(visWaveAmp(ko, VIS_BANDS, visMode, freq, td) * (Ho - 4)) + 2);
          continue;
        }
        if (!ctx2) { /* jsdom không có canvas 2d: vẫn tính heights cho test */
          if (i === 0) {
            var H0 = v.cv.height || 0;
            for (var k0 = 0; k0 < VIS_BANDS; k0++) heights.push(visBarHeight(k0, visMode, barVals, H0));
          }
          continue;
        }
        /* Đợt v10.1 (Classic): vis Classic vẽ gradient theo HÀNG (màu
           viscolor.txt 2..17, đỉnh->đáy) như BarPaintHandler của Webamp:
           mỗi cột chia 16 hàng, hàng nào sáng thì tô màu của hàng đó
           (hàng đáy = bands[15]). Canvas display của Modern vẫn vẽ 16
           cột 1 màu/cột như cũ (người dùng xác nhận 15:14 đã giống
           Webamp, không đụng tới). */
        if (v.classic === true) {
          var Wc = v.cv.width, Hc = v.cv.height;
          ctx2.clearRect(0, 0, Wc, Hc);
          var nc = VIS_BANDS, bwc = Wc / nc, rh = Hc / 16;
          for (var kc = 0; kc < nc; kc++) {
            var hhc = visBarHeight(kc, visMode, barVals, Hc);
            if (i === 0) heights.push(hhc);
            var litRows = Math.round(hhc / rh);
            /* v10.7 — chieu cao 1 hang toi thieu 1px: canvas Classic cao
               16px -> rh=1 -> rh-1=0 nen fillRect cao 0 khong ve gi (cot
               BAR "mat" tren may that, chi con song OSC ve bang doan
               1px/stroke); shade 38x5 thi rh<1 -> cao am, cung khong ve. */
            var rowH = Math.max(1, rh - 1);
            for (var rr = 0; rr < litRows; rr++) {
              ctx2.fillStyle = (v.bands && v.bands[15 - rr]) || "#fff";
              ctx2.fillRect(kc * bwc + 1, Hc - (rr + 1) * rh, bwc - 2, rowH);
            }
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
          var hh = visBarHeight(k, visMode, barVals, H);
          if (i === 0) heights.push(hh);
          ctx2.fillStyle = useXmlCol ? (v.bands[k] || "#fff") : col;
          ctx2.fillRect(k * bw + 1, H - hh, bw - 2, hh);
        }
      }
      lastVisFrame = { mode: visMode, maxBin: maxBin, heights: heights, visType: firstVisType };
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
    /* Đợt v10.11 — bảng equalize Nullsoft (Webamp FFTNullsoft.ts
       initEqualizeTable, port y nguyên, tham số hoá theo N bin):
       eq[i] = log10(1 + bias + (i+1)*(9-bias)/N), bias khởi đầu 0.04 và
       bias /= 1.0025 sau mỗi bin. Với N=512: eq[0]≈0.024 → eq[511]≈1.0,
       tức dải cao được BOOST ~40x (≈+32dB) so với dải thấp — đây là lý do
       cột cao của Webamp vẫn nhảy dù năng lượng nhạc giảm dần theo tần số.
       Cache theo N (test dùng analyser giả 32 bin, thật dùng 512 bin).
       N=1: eq[0] = log10(10) = 1. */
    var visEqCache = {};
    function getVisEqualizeTable(n) {
      if (!n || n < 1) n = 1;
      var t = visEqCache[n];
      if (t) return t;
      t = new Array(n);
      var bias = 0.04;
      for (var i = 0; i < n; i++) {
        var invHalf = (9.0 - bias) / n;
        t[i] = Math.log10(1.0 + bias + (i + 1) * invHalf);
        bias /= 1.0025;
      }
      visEqCache[n] = t;
      return t;
    }
    /* Ánh xạ log kiểu Webamp (scale 0.91, nội suy 2 bin kề) của cột k trong
       nb cột trên mảng giá trị 0..1 — cùng toán như avsLogTarget (đường AVS
       75 cột) nhưng trả về giá trị 0..1 thay vì hàng 0..15. */
    function visLogValue(k, nb, arr) {
      if (!arr || !arr.length) return 0;
      var maxFreqIndex = arr.length;
      var logMax = Math.log10(maxFreqIndex);
      var linearIndex = (k / (nb - 1)) * (maxFreqIndex - 1);
      var logIndex = Math.pow(10, (logMax * k) / (nb - 1));
      var scaled = 0.09 * linearIndex + 0.91 * logIndex;
      var i1 = Math.floor(scaled), i2 = Math.ceil(scaled);
      if (i1 >= maxFreqIndex) i1 = maxFreqIndex - 1;
      if (i2 >= maxFreqIndex) i2 = maxFreqIndex - 1;
      return (i1 === i2) ? arr[i1] : (1 - (scaled - i1)) * arr[i1] + (scaled - i1) * arr[i2];
    }
    /* Chiều cao 1 cột vis (đợt B — tách riêng để test không cần canvas):
       real = theo bin tần số; flat = 2px (im); sample = sine theo phase.
       Đợt v10.11 — nhánh "real": `freq` ở đây là mảng norm đã equalize +
       chuẩn hoá theo peak (drawVisStatic tính, chỉ lấy nửa đầu bin =
       0..Fs/4 như FFT của Webamp), ánh xạ log 16 cột kiểu Webamp rồi
       chiều cao = 2 + norm*(H-6) (giữ thang cũ để cột bass/mid không đổi
       tầm). Trước đây nhánh này đọc 1 bin TUYẾN TÍNH trên toàn bộ 512 bin
       analyser (0..Fs/2): cột 12–15 đọc 18–22,5kHz — vùng stream radio
       128kbps gần như không còn năng lượng — nên cột cao đứng yên.
       Nhánh "flat"/"sample" GIỮ NGUYÊN y hệt. */
    function visBarHeight(k, mode, freq, H) {
      if (mode === "flat") return 2;
      if (mode === "real" && freq) {
        var v = visLogValue(k, VIS_BANDS, freq);
        if (v < 0) v = 0; if (v > 1) v = 1;
        return 2 + v * (H - 6);
      }
      return 2 + Math.abs(Math.sin(k * 0.9 + avsPhase)) * (H - 6);
    }
    function getVisFrame() { return { mode: lastVisFrame.mode, maxBin: lastVisFrame.maxBin, heights: lastVisFrame.heights.slice(), visType: lastVisFrame.visType || "bar" }; }
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
    /* Đợt 4 (03/11) — BUG "đóng cửa sổ video thì bị tạm ngừng":
       GỐC: renderLayoutInner vẽ vào div build tách rời rồi swapIn() làm
       live.innerHTML = "" — gỡ cả thẻ <video> đang phát khỏi document,
       và khi AVS đóng thì wrap không được gắn lại đâu cả (thẻ video nằm
       ngoài document cho tới khi mở lại cửa sổ). Trên trình duyệt điện
       thoại, thẻ video rời khỏi document thì bị tạm ngừng (pause) — đúng
       như Hải báo 16:42. closeAvs() tự nó không pause gì (chỉ đổi state).
       SỬA (lấy cách của Webamp fork — media/currentVideo.ts
       getVideoHolder: "chỗ chứa tạm thẻ video khi cửa sổ đóng, thẻ vẫn
       phát nền"): giữ thẻ video LUÔN trong document bằng 1 holder ẩn
       cố định 2×2, opacity:0 (KHÔNG display:none), gắn vào document.body.
       - ensureAvsMedia tạo wrap xong thì park ngay (thẻ video có trong
         document từ lúc sinh ra, kể cả khi AVS chưa từng mở).
       - swapIn park wrap TRƯỚC khi live.innerHTML = "" (khỏi bị gỡ).
       - attachAvsMedia (mở cửa sổ) dời wrap từ holder vào cửa sổ như cũ.
       Đóng cửa sổ giờ chỉ ẩn hình, tiếng vẫn phát, đồng hồ vẫn chạy;
       mở lại thì hình hiện lại, tiếng không ngắt. */
    var avsParkEl = null;
    function getAvsPark() {
      if (avsParkEl) return avsParkEl;
      if (!document || !document.createElement) return null;
      var h = null;
      try { h = document.createElement("div"); } catch (e) { return null; }
      if (!h) return null;
      h.id = "amp-avs-park";
      try { h.setAttribute("aria-hidden", "true"); } catch (e) { /* bỏ qua */ }
      /* Như fork: fixed 2×2, opacity 0 — KHÔNG display:none. */
      try {
        h.style.position = "fixed"; h.style.left = "0px"; h.style.top = "0px";
        h.style.width = "2px"; h.style.height = "2px"; h.style.overflow = "hidden";
        h.style.opacity = "0"; h.style.pointerEvents = "none";
      } catch (e) { /* bỏ qua */ }
      var parent = null;
      try { parent = document.body || document.documentElement; } catch (e) { parent = null; }
      if (!parent || !parent.appendChild) return null;
      try { parent.appendChild(h); } catch (e) { return null; }
      avsParkEl = h;
      return h;
    }
    function parkAvsMedia() {
      if (!avsMedia) return false;
      var holder = getAvsPark();
      if (!holder) return false;
      try {
        if (avsMedia.wrap.parentElement !== holder) holder.appendChild(avsMedia.wrap);
        return true;
      } catch (e) { return false; }
    }
    function getAvsParkState() {
      var video = avsMedia ? avsMedia.video : null;
      var connected = false;
      try { connected = !!(video && video.isConnected); } catch (e) { connected = false; }
      var parked = false;
      try { parked = !!(avsMedia && avsParkEl && avsMedia.wrap.parentElement === avsParkEl); } catch (e) { parked = false; }
      return { hasMedia: !!avsMedia, parked: parked, videoConnected: connected, video: video, wrap: avsMedia ? avsMedia.wrap : null };
    }
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
        v.addEventListener("loadedmetadata", function () {
          avsVideoHasPic = (v.videoWidth || 0) > 0; /* Đợt v10.2 — fallback vis */
          if (avsVideoHasPic) avsVideoEverHadPic = true; /* v10.3 — đã từng có hình thật */
          setVideoInfo(v.videoWidth || 0, v.videoHeight || 0);
          applyAvsMediaVisibility();
        });
        /* Đợt v10.2 — bắt đầu nạp luồng mới: chưa biết có hình không. */
        v.addEventListener("loadstart", function () { avsVideoHasPic = null; applyAvsMediaVisibility(); });
        v.addEventListener("dblclick", function () { requestVideoFullscreen(); });
      } catch (e) { /* jsdom */ }
      var cv = document.createElement("canvas");
      cv.className = "vis";
      cv.dataset.avsCanvas = "1";
      /* v10.3: canvas spectrum AVS luon an (khong ve spectrum vao day
         nua) — giu lai trong DOM de drawVisStatic to den + giu tuong
         thich (test cu truy cap m.canvas). Handler cu giu nguyen, khong
         con bam duoc vi canvas an. */
      cv.style.pointerEvents = "auto"; cv.style.cursor = "pointer";
      cv.title = "Bấm để đổi kiểu vis";
      cv.onclick = function () { cycleVisType("avs"); };
      cv.style.position = "absolute"; cv.style.left = "0px"; cv.style.top = "0px";
      /* v10.3: nhan ten kenh/bai tren nen den khi chi co tieng. */
      var nameEl = document.createElement("div");
      nameEl.dataset.avsName = "1";
      nameEl.style.position = "absolute"; nameEl.style.left = "0px"; nameEl.style.top = "50%";
      nameEl.style.width = "100%"; nameEl.style.textAlign = "center";
      nameEl.style.transform = "translateY(-50%)";
      nameEl.style.color = "#fff"; nameEl.style.font = "11px Arial, sans-serif";
      nameEl.style.whiteSpace = "nowrap"; nameEl.style.overflow = "hidden";
      nameEl.style.textOverflow = "ellipsis"; nameEl.style.pointerEvents = "none";
      nameEl.style.display = "none";
      wrap.appendChild(v);
      wrap.appendChild(cv);
      wrap.appendChild(nameEl);
      avsMedia = { wrap: wrap, video: v, canvas: cv, nameEl: nameEl };
      parkAvsMedia(); /* Đợt 4: thẻ video có trong document từ lúc tạo */
      return avsMedia;
    }
    /* Gắn hộp media vào một hộp cha (nhúng hoặc rời) tại rect cho trước;
       hiện video hay canvas theo mode; đăng ký canvas để drawVisStatic vẽ. */
    /* Đợt v10.2 — fallback vis ở chế độ video: kênh đang ở mode "video"
       mà đã biết chắc KHÔNG có hình (avsVideoHasPic === false: luồng chỉ
       có tiếng / kênh chết hình) thì hiện canvas vis thay vì thẻ video
       đen; chỉ khi đã biết chắc để không nhá vis lúc kênh video đang nạp
       (null = chưa biết). setVideoInfo đã có lưới an toàn chuyển mode
       sang "vis" khi videoWidth == 0 với item phân loại video + AVS đang
       mở — fallback này bao thêm trường hợp mode vẫn "video" (vd kênh
       radio mở ở cửa sổ video). Milkdrop bật thì vis thường ẩn như cũ. */
    /* v10.3 — ten kenh/bai hien tren nen den cua vung AVS khi chi co
       tieng (khong co hinh + Milkdrop tat), nhu fork Webamp lam o cua so
       Video roi. An khi video dang hien hoac Milkdrop dang chay. */
    function syncAvsName() {
      if (!avsMedia || !avsMedia.nameEl) return false;
      var cur = playlistState.items[playlistState.current];
      var name = cur ? stripDiacritics(cur.name || "") : "";
      try { avsMedia.nameEl.textContent = name; } catch (e) { /* bo qua */ }
      var videoShown = false;
      try { videoShown = avsVideoActuallyShowing(); } catch (e) { videoShown = false; }
      var mdShown = false;
      try { mdShown = !!(milkdropActive && milkdropCanvas && milkdropCanvas.style.display !== "none"); } catch (e) { mdShown = false; }
      var show = !!(avsState.open && !videoShown && !mdShown && name);
      try { avsMedia.nameEl.style.display = show ? "" : "none"; } catch (e) { /* bo qua */ }
      return show;
    }
    /* v10.3 — CO HINH THAT dang hien (hoac sap hien lai): mode video +
       (da biet co hinh || da tung co hinh — loadstart ve "chua biet"
       nhung luong nay da tung bao videoWidth > 0 nen hinh sap ve, ten /
       Milkdrop phai an). Khac voi the <video> co display hay khong: the
       video van hien khi chua biet (den, trong) nhung ten/Milkdrop nam
       TREN no trong DOM (nameEl, canvas Milkdrop append sau) nen nguoi
       dung van thay ten/Milkdrop; chi khi co hinh that thi ten/Milkdrop
       moi phai an. Kênh audio (vd Đà Nẵng qua medatech) chua tung co hinh
       → khong co hinh that → ten/Milkdrop hien. */
    function avsVideoActuallyShowing() {
      if (avsState.mode !== "video") return false;
      return avsVideoHasPic === true || avsVideoEverHadPic;
    }
    function applyAvsMediaVisibility() {
      if (!avsMedia) return false;
      /* v10.3: the <video> hien khi mode video + chua biet chac la khong
         co hinh (chua biet thi hien — den, trong; ten/Milkdrop nam tren
         nen van thay; chi khi biet chac khong co hinh moi an). Canvas
         spectrum LUON an. Ten kenh do syncAvsName quyet (an chi khi co
         hinh that). */
      var hasPic = avsState.mode === "video" && avsVideoHasPic !== false;
      avsMedia.video.style.display = hasPic ? "" : "none";
      avsMedia.canvas.style.display = "none";
      /* v10.4 — video xuat hien/bien mat giua chung (loadedmetadata/
         loadstart) thi canvas Milkdrop phai an/hien theo ngay, khong
         doi lan render sau (keo khong thi canvas Milkdrop den van che
         mat video that vua ve). applyMilkdropVisibility tu goi
         syncAvsName() o cuoi. */
      applyMilkdropVisibility();
      return false;
    }
    function attachAvsMedia(parentEl, rect) {
      var m = ensureAvsMedia();
      m.wrap.style.left = rect.x + "px"; m.wrap.style.top = rect.y + "px";
      m.wrap.style.width = rect.w + "px"; m.wrap.style.height = rect.h + "px";
      setAbs(m.wrap, parentEl, rect.x, rect.y);
      m.video.style.width = rect.w + "px"; m.video.style.height = rect.h + "px";
      applyAvsMediaVisibility(); /* Đợt v10.2 — thay 2 dòng gán display trực tiếp */
      m.canvas.width = Math.max(40, rect.w); m.canvas.height = Math.max(20, rect.h);
      m.canvas.style.width = rect.w + "px"; m.canvas.style.height = rect.h + "px";
      /* Đợt 4 (Milkdrop): Milkdrop bật thì canvas vis thường ẩn, canvas
         Milkdrop hiện thay (xem applyMilkdropVisibility — nó tính lại
         display của canvas vis, giữ nguyên quyết định fallback video-mode). */
      setAbs(m.video, m.wrap, 0, 0);
      setAbs(m.canvas, m.wrap, 0, 0);
      applyVideoScaleToEl();
      parentEl.appendChild(m.wrap);
      applyMilkdropVisibility();
      /* Đợt K (9.7): canvas AVS giữ nền tối (fillBg: true) như trước; màu cột
         dùng chung visXmlBands (màu XML của <vis> chính). */
      visCanvases.push({ cv: m.canvas, bands: visXmlBands, fillBg: true });
      return m;
    }
    /* Đợt 4 (Milkdrop) — canvas Milkdrop (milkdrop.js gắn vào wrap) hiện
       thay canvas vis thường khi Milkdrop bật + AVS đang ở chế độ vis;
       các trường hợp còn lại thì canvas Milkdrop ẩn, vis thường theo mode
       như cũ. Gọi sau mỗi lần gắn wrap + khi bật/tắt Milkdrop. */
    var milkdropActive = false, milkdropCanvas = null, milkdropShown = false;
    function applyMilkdropVisibility() {
      /* v10.3: Milkdrop hien khi bat + co canvas + AVS mo + KHONG co video
         that dang hien (ke ca che do video: kenh audio chua tung co hinh
         thi video an nen Milkdrop duoc hien, nhu Winamp/Webamp; kenh co
         hinh that thi video giu man hinh).
         v10.5 (bo hieu ung mac dinh khi khong co nhac): them DIEU KIEN
         DANG PHAT — dung/tam dung/chua phat thi canvas an (khung cuoi
         dong bang neu de hien), vung AVS ve den/trong, ten kenh hien
         tren nen den. demo.playing do engine bao qua onAudioPlayingChange;
         doi phat/dung thi updateStatusEls goi lai ham nay ngay nen khong
         doi lan render sau. milkdrop.js cung chan o applyCanvasDisplay. */
      var showMd = !!(milkdropActive && milkdropCanvas && avsState.open && demo.playing && !avsVideoActuallyShowing());
      var prevShown = milkdropShown;
      milkdropShown = showMd; /* v10.4: index.html syncMilkdrop chay vong render theo co nay (xem getMilkdropState) */
      try {
        if (milkdropCanvas) milkdropCanvas.style.display = showMd ? "" : "none";
        /* Đợt v10.2 — canvas vis hiện khi mode "vis" HOẶC fallback video-mode
           (mode "video" + đã biết chắc không có hình), trừ khi Milkdrop hiện. */
        if (avsMedia) avsMedia.canvas.style.display = "none"; /* v10.3: canvas spectrum AVS luon an (chi Milkdrop / video / den) */
        syncAvsName();
      } catch (e) { /* bỏ qua */ }
      /* v10.5 — hien/an doi giua chung (video xuat hien/bien mat khi
         dang phat) thi bao trang de dong bo lai loop + banner ngay
         (index.html syncMilkdrop): khong doi lan render sau — anh
         03:23: video DNRT chay co hinh ma banner loi cu van dinh vi
         khong ai danh gia lai. */
      if (showMd !== prevShown && onMilkdropShownChange) {
        try { onMilkdropShownChange(showMd); } catch (e) { /* bỏ qua */ }
      }
      return showMd;
    }
    function setMilkdropCanvas(canvas) {
      milkdropCanvas = canvas || null;
      applyMilkdropVisibility();
      return !!milkdropCanvas;
    }
    function setMilkdropActive(on) {
      milkdropActive = !!on;
      var shown = applyMilkdropVisibility();
      if (milkdropActive) drawVisStatic(); /* vẽ lại khung vis thường lần cuối cho khỏi dính hình cũ khi tắt */
      return { active: milkdropActive, shown: shown };
    }
    function getMilkdropState() { return { active: milkdropActive, hasCanvas: !!milkdropCanvas, shown: milkdropShown }; }
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
       detachedDefaultWidth()×DETACHED_WIN_H (bề rộng cửa sổ chính của
       skin đang nạp — 566: 354, Classic: 275, skin rộng hơn: theo XML;
       cửa sổ rời tự vẽ theo model, KHÔNG phải layout Video 354×280);
       kéo đổi thì lưu vào winSizes["Video|normal"] / ["AVS|normal"],
       kẹp theo minimum của layout Video/AVS trong XML (min 354×164
       với skin 566). Hộp media giãn theo: giữ nguyên lề trái/trên/
       phải/dưới của hình chữ nhật mặc định (6/23/6/27), chỉ đổi w/h.
       v10.8 (khung Video rời to hơn cửa sổ chính, ảnh PC 04/11 08:35):
       trước đây mặc định cứng DETACHED_WIN_W 354 cho mọi skin; size đã
       kéo tay lưu từ trước (vd 460) vẫn được dùng lại nên Video lòi ra
       phải so với main (stage rộng theo Video từ v10.7). Nay mặc định =
       rộng main, và ở chế độ Fit thì size đã kéo cũng không rộng hơn
       main (Fit tính tỉ lệ theo stage: Video rộng hơn main làm stage
       rộng theo, main nằm lệch trái, Video lòi phải). Ở 1x, size đã
       kéo tay vẫn được giữ nguyên (người dùng kéo rộng được nếu muốn);
       phóng to Max (960×540) là chế độ riêng, không kẹp. */
    function detachedDefaultWidth() {
      if (RES && RES.kind === "classic") {
        var lib = classicLib();
        if (lib && lib.CLASSIC_MAIN && lib.CLASSIC_MAIN.w > 0) return lib.CLASSIC_MAIN.w;
        return 275; /* Winamp 2 Classic: cửa sổ chính cố định 275×116 */
      }
      var m = effectiveLayoutWH("main", "normal");
      if (m && m.w > 0) return m.w;
      return DETACHED_WIN_W;
    }
    function detachedWinSize(kind) {
      /* Đợt D (9.9): đang phóng to thì về cỡ phóng to (960×540), bỏ qua
         size đã kéo tay (khôi phục sẽ về lại size đó). */
      if (avsState.videoMaximized) return { w: VIDEO_MAXIMIZED_W, h: VIDEO_MAXIMIZED_H };
      var key = winSizeKey(kind === "video" ? "Video" : "AVS", "normal"); /* Đợt C: khóa theo đúng chữ XML của entry */
      var layKey = kind === "video" ? "Video" : "AVS";
      var def = { w: detachedDefaultWidth(), h: DETACHED_WIN_H };
      var ov = winSizes[key];
      if (!ov) return def;
      var c = clampWinSize(layKey, "normal", ov.w, ov.h);
      if (!c) return def;
      /* v10.8: ở chế độ Fit, cửa sổ rời không rộng hơn cửa sổ chính —
         chỉ kẹp bề rộng, giữ nguyên chiều cao đã kéo. Nếu minimum của
         layout Video/AVS trong XML lớn hơn rộng main thì lấy minimum
         đó (skin không cho hẹp hơn). */
      if (isZoomFit) {
        var fit = false;
        try { fit = !!isZoomFit(); } catch (e) { fit = false; }
        if (fit) {
          var mw = detachedDefaultWidth();
          if (mw > 0 && c.w > mw) {
            var mm = layoutMinMax(layKey, "normal");
            c.w = Math.max(mw, mm ? mm.minW : 0);
          }
        }
      }
      return c;
    }
    function detachedMediaRect(sz) {
      var m0 = DETACHED_MEDIA_RECT;
      var insetR = DETACHED_WIN_W - m0.x - m0.w, insetB = DETACHED_WIN_H - m0.y - m0.h;
      return { x: m0.x, y: m0.y, w: Math.max(10, sz.w - m0.x - insetR), h: Math.max(10, sz.h - m0.y - insetB) };
    }
    async function buildDetachedWindowModel(win, kind, sz) {
      sz = sz || { w: detachedDefaultWidth(), h: DETACHED_WIN_H };
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
      sz = sz || { w: detachedDefaultWidth(), h: DETACHED_WIN_H };
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
      /* v10.7 (hang nut Classic bi cat mep phai, anh 04/11 07:19 —
         "1920x1080" loi nua ra ngoai): hang nut la flex 1 hang, khong
         xuong dong, khong tran khoi bar; nut khong co lai, nhan WxH
         tu co bang ellipsis. */
      bar.style.display = "flex"; bar.style.alignItems = "center";
      bar.style.whiteSpace = "nowrap"; bar.style.overflow = "hidden";
      setAbs(bar, win, 5, 178);
      win.appendChild(bar);
      function mkBtn(label, action) {
        var b = document.createElement("button");
        b.textContent = label;
        b.dataset.avsAction = action;
        b.style.font = "11px Arial, sans-serif";
        b.style.marginRight = "4px"; b.style.cursor = "pointer";
        b.style.flexShrink = "0";
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
        /* v10.7: nhan WxH co lai trong hang nut (ellipsis) thay vi
           loi ra ngoai cua so. */
        info.style.flex = "1 1 auto"; info.style.minWidth = "0";
        info.style.overflow = "hidden"; info.style.textOverflow = "ellipsis";
        info.style.whiteSpace = "nowrap";
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
      /* v10.7 (cua so Video roi bi cat mep phai): cat cung noi dung
         ben trong vao khung cua so — video scale 2x / hang nut / nhan
         WxH khong bao gio ve ra ngoai mep phai cua so. Tay nam keo
         nam gon trong khung (right/bottom 0) nen khong bi cat. */
      win.style.overflow = "hidden";
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
    /* ---------- Đợt v10.1 (việc 3: Classic) — cửa sổ chính Classic ----------
       Vẽ cửa sổ chính 275×116 (+ shade 275×14) của skin Classic (.wsz)
       từ BMP theo bảng tọa độ + hình học của định dạng Winamp 2 (xem
       classic.js: chuyển từ skinParser.js/skinParserUtils.ts/
       skinSprites.ts/regionParser.ts + MainWindow/*.tsx + main-window.css
       của Webamp fork — KHÔNG bê Redux/React, chỉ lấy dữ liệu + hàm thuần).
       Kỹ thuật vẽ: div + background-image = blob: URL của sheet BMP,
       background-size = cỡ thật của sheet (đo từ header BMP),
       background-position = -x,-y (giống spriteDiv của Modern).
       Nút bấm nối vào đúng hàm đã có của Amp: togglePlay/pause/
       stopPlayback/prevTrack/nextTrack (hàng transport), seek/volume/
       balance (thanh trượt kéo bằng pointer, đăng ký sliderRecords để
       updateProgress/setBalance đồng bộ thumb), EQ mở/đóng ngăn kéo
       (onDrawerToggle/setDrawerOpen), PL mở/đóng playlist
       (onPlaylistToggle), shade/minimize/close qua onShadeToggle/
       onMinimize/onPlayerClose, Eject mở menu thêm nhạc local, About
       mở bảng giới thiệu, O (clutter) mở menu chính, D đổi zoom 1x/fit,
       I mở thông tin bài, V đổi kiểu vis. Đồng hồ bấm đổi đếm lên/ngược
       (toggleTimerMode, như Modern); chữ chạy dùng font TEXT.bmp 5×6 +
       vòng cuộn ticker đã có (tickerEls/stepTicker); vis 76×16 (shade
       38×5) vẽ qua drawVisStatic với gradient theo HÀNG từ viscolor.txt
       (màu 2..17, đỉnh->đáy) — xem nhánh `classic` trong drawVisStatic.
       CHƯA CÓ (ghi rõ, đợt sau): cửa sổ Playlist Classic (nút PL chỉ
       đổi trạng thái + sáng đèn, chưa vẽ cửa sổ playlist — xem ghi chú
       ở nút PL; playlist/m3u đã chốt không lấy ở đợt này), cửa sổ EQ
       Classic (nút EQ chỉ mở/đóng ngăn kéo Modern), cửa sổ ML Classic,
       vùng click region.txt (chưa áp mask đa giác — cửa sổ vẫn chữ nhật),
       con trỏ .cur riêng của skin, work-indicator (Amp không có trạng
       thái "đang tải" riêng nên luôn ẩn).
       renderClassicStage là ĐIỂM VÀO DUY NHẤT (cả renderLayoutInner lẫn
       renderStackedInner đều qua đây): vẽ main/shade + cửa sổ AVS rời
       (nếu đang tách), đặt cỡ stage, trả tổng chiều cao. */
    var ClassicLib = opts.Classic || null;
    if (!ClassicLib) {
      try { ClassicLib = (typeof globalThis !== "undefined" && globalThis.AmpClassic) || null; } catch (e) { ClassicLib = null; }
    }
    var classicMainRec = null; /* rec cửa sổ chính Classic đang vẽ (null khi skin Modern) */
    var classicShadeRec = null; /* rec shade Classic đang vẽ */
    function classicLib() { return (RES && RES.kind === "classic" && ClassicLib) ? ClassicLib : null; }
    function classicData() { return (RES && RES.kind === "classic" && RES.classic) ? RES.classic : null; }
    function classicSheetUrl(sheet) {
      var c = classicData();
      if (!c || !c.sheets || !c.sheets[sheet]) return null;
      return c.sheets[sheet].url || null;
    }
    function classicSheetSize(sheet) {
      var c = classicData();
      if (!c || !c.sheets || !c.sheets[sheet]) return null;
      return c.sheets[sheet].size || null;
    }
    /* 1 sprite cắt từ sheet: div 1 ô, background = sheet, background-size
       = cỡ thật của sheet, background-position = -x,-y. */
    function classicSpriteDiv(sheet, spriteName) {
      var lib = classicLib();
      if (!lib) return null;
      var rect = lib.spriteRect(sheet, spriteName);
      var url = classicSheetUrl(sheet);
      if (!rect || !url) return null;
      var div = document.createElement("div");
      div.className = "spr";
      div.dataset.classicSprite = spriteName;
      div.style.position = "absolute";
      div.style.width = rect.width + "px"; div.style.height = rect.height + "px";
      div.style.backgroundImage = 'url("' + url + '")';
      var sz = classicSheetSize(sheet);
      if (sz) div.style.backgroundSize = sz.w + "px " + sz.h + "px";
      div.style.backgroundPosition = (-rect.x) + "px " + (-rect.y) + "px";
      div.style.backgroundRepeat = "no-repeat";
      div.style.imageRendering = "pixelated";
      return div;
    }
    /* Đổi ảnh của 1 div sprite đã có (đổi trạng thái nút/chữ số). */
    function classicSetSprite(div, sheet, spriteName) {
      var lib = classicLib();
      if (!lib || !div) return false;
      var rect = lib.spriteRect(sheet, spriteName);
      var url = classicSheetUrl(sheet);
      if (!rect || !url) return false;
      div.style.backgroundImage = 'url("' + url + '")';
      var sz = classicSheetSize(sheet);
      if (sz) div.style.backgroundSize = sz.w + "px " + sz.h + "px";
      div.style.backgroundPosition = (-rect.x) + "px " + (-rect.y) + "px";
      div.style.width = rect.width + "px"; div.style.height = rect.height + "px";
      div.dataset.classicSprite = spriteName;
      return true;
    }
    /* 1 ký tự font TEXT.bmp 5×6 (ký tự lạ -> trắng). */
    function classicCharDiv(ch) {
      var lib = classicLib();
      var div = document.createElement("div");
      div.style.display = "inline-block";
      div.style.width = "5px"; div.style.height = "6px";
      div.style.verticalAlign = "top";
      if (!lib) { div.textContent = ch; return div; }
      classicSetChar(div, ch);
      return div;
    }
    function classicSetChar(div, ch) {
      var lib = classicLib();
      var url = classicSheetUrl("TEXT");
      if (!lib || !url || !div) return false;
      var r = lib.charSprite(ch);
      div.style.backgroundImage = 'url("' + url + '")';
      var sz = classicSheetSize("TEXT");
      if (sz) div.style.backgroundSize = sz.w + "px " + sz.h + "px";
      div.style.backgroundPosition = (-r.x) + "px " + (-r.y) + "px";
      div.style.backgroundRepeat = "no-repeat";
      div.style.imageRendering = "pixelated";
      div.textContent = "";
      return true;
    }
    function classicTextRow(text) {
      var row = document.createElement("div");
      row.style.whiteSpace = "nowrap";
      row.style.lineHeight = "6px";
      row.style.fontSize = "0px";
      var s = String(text == null ? "" : text);
      for (var i = 0; i < s.length; i++) row.appendChild(classicCharDiv(s[i]));
      return row;
    }
    /* Nút Classic: div ở geo với sprite thường; giữ chuột thì đổi sang
       activeSprite, thả thì về (hoặc selectedSprite khi trạng thái bật).
       refresh() do rec giữ để refreshClassicMain đổi ảnh theo state. */
    function classicButton(parent, geo, sheet, o) {
      var div = document.createElement("div");
      div.className = "btn";
      if (o.id) div.dataset.classicBtn = o.id;
      div.style.position = "absolute";
      div.style.left = geo.x + "px"; div.style.top = geo.y + "px";
      div.style.width = geo.w + "px"; div.style.height = geo.h + "px";
      div.style.cursor = "pointer";
      div.style.pointerEvents = "auto";
      /* v10.3: touch-action manipulation — tắt double-tap zoom trên nút
         để tap phản hồi ngay (không chờ 300ms). */
      div.style.touchAction = "manipulation";
      if (o.title) div.title = o.title;
      setAbs(div, parent, geo.x, geo.y);
      parent.appendChild(div);
      var inner = null;
      if (o.sprite) {
        inner = classicSpriteDiv(sheet, o.sprite);
        if (inner) {
          inner.style.left = "0px"; inner.style.top = "0px";
          setAbs(inner, div, 0, 0);
          div.appendChild(inner);
        }
      }
      var rec = { div: div, inner: inner, geo: geo, sheet: sheet, o: o, pressed: false };
      /* v10.3 — huy hiệu nhỏ trên nút (fork: #repeat.repeat-one::after
         hiện số "1" ở góc trên-phải để phân biệt lặp 1 bài với lặp tất
         cả). o.badge() trả chuỗi cần hiện hoặc null. */
      var badgeEl = null;
      if (o.badge) {
        badgeEl = document.createElement("span");
        badgeEl.style.position = "absolute";
        badgeEl.style.top = "0px"; badgeEl.style.right = "1px";
        badgeEl.style.font = "bold 8px Arial, sans-serif";
        badgeEl.style.lineHeight = "8px";
        badgeEl.style.color = "#fff"; badgeEl.style.background = "#000";
        badgeEl.style.padding = "0 1px";
        badgeEl.style.pointerEvents = "none";
        badgeEl.style.display = "none";
        div.appendChild(badgeEl);
      }
      rec.refresh = function () {
        if (inner) {
          var sel = false;
          try { sel = !!(o.isSelected && o.isSelected()); } catch (e) { sel = false; }
          var name = o.sprite;
          if (rec.pressed) name = (sel && o.activeSelectedSprite) ? o.activeSelectedSprite : (o.activeSprite || o.sprite);
          else if (sel && o.selectedSprite) name = o.selectedSprite;
          classicSetSprite(inner, sheet, name);
        }
        if (badgeEl) {
          var bt = null;
          try { bt = o.badge ? o.badge() : null; } catch (e) { bt = null; }
          badgeEl.textContent = bt || "";
          badgeEl.style.display = bt ? "" : "none";
        }
      };
      /* v10.3 — SỬA GỐC "bấm chỉ thấy nút lên/xuống mà không làm gì":
         trước đây pressOn gọi preventDefault() cho MỌI sự kiện, kể cả
         touchstart. Trên điện thoại, preventDefault ở touchstart làm
         trình duyệt KHÔNG sinh các sự kiện chuột tương thích (mousedown/
         mouseup/click) — nên chỉ có touchstart/touchend chạy (đổi sprite
         pressed → thấy nút lên/xuống) còn div.onclick (hành động thật:
         play/EQ/PL/...) KHÔNG BAO GIỜ CHẠY. jsdom không tái hiện được
         vì test dispatch click trực tiếp, bỏ qua đường touch.
         Sửa: touchstart CHỈ đổi sprite, KHÔNG preventDefault (để click
         tương thích vẫn sinh ra sau touchend); mousedown vẫn
         preventDefault như cũ (chống bôi đen/kéo ảnh, không chặn click).
         Thêm touchcancel → nhả nút khi hệ thống hủy chạm (cuộc gọi đến,
         trượt khỏi nút). */
      var pressOn = function (e) {
        rec.pressed = true; rec.refresh();
        if (e && e.type !== "touchstart" && e.preventDefault) e.preventDefault();
      };
      var pressOff = function () { if (!rec.pressed) return; rec.pressed = false; rec.refresh(); };
      div.addEventListener("mousedown", pressOn);
      div.addEventListener("touchstart", pressOn);
      div.addEventListener("mouseup", pressOff);
      div.addEventListener("mouseleave", pressOff);
      div.addEventListener("touchend", pressOff);
      div.addEventListener("touchcancel", pressOff);
      div.onclick = function () { if (o.onClick) o.onClick(div); };
      return rec;
    }
    /* Thanh trượt Classic (seek/volume/balance): nền là dải ảnh dài của
       sheet (VOLUME/BALANCE: background-position-y = -offset theo công
       thức fork), thumb là sprite riêng. Kéo bằng pointer (giống
       renderSlider: fracFromEvent dùng getBoundingClientRect, trả null
       khi rect 0 — test stub rect để kéo được trong jsdom). Đăng ký vào
       sliderRecords để updateProgress (SEEK) / setBalance (PAN) đồng bộ
       thumb. thumbSprite có thể là hàm (frac) -> tên sprite (shade seek
       đổi thumb trái/phải theo vị trí). */
    function classicSlider(parent, geo, sheet, cfg) {
      var div = document.createElement("div");
      div.className = "slider";
      if (cfg.id) div.dataset.classicSlider = cfg.id;
      div.style.position = "absolute";
      div.style.left = geo.x + "px"; div.style.top = geo.y + "px";
      div.style.width = geo.w + "px"; div.style.height = geo.h + "px";
      div.style.cursor = "pointer";
      div.style.pointerEvents = "auto";
      if (cfg.title) div.title = cfg.title;
      setAbs(div, parent, geo.x, geo.y);
      parent.appendChild(div);
      var track = document.createElement("div");
      track.style.position = "absolute";
      track.style.left = "0px"; track.style.top = "0px";
      track.style.width = geo.w + "px"; track.style.height = geo.h + "px";
      var sheetUrl = classicSheetUrl(sheet);
      /* v10.3 — noTrackBg: rãnh đã vẽ sẵn trong nền (shade EQ: rãnh
         volume/balance nằm trong EQ_SHADE_BACKGROUND) thì track trong
         suốt, không đè cả sheet lên. */
      if (!cfg.noTrackBg && sheetUrl) track.style.backgroundImage = 'url("' + sheetUrl + '")';
      var sz = classicSheetSize(sheet);
      if (sz) track.style.backgroundSize = sz.w + "px " + sz.h + "px";
      track.style.backgroundRepeat = "no-repeat";
      track.style.imageRendering = "pixelated";
      /* v10.5 — rãnh phải cắt đúng sprite nền trong sheet (fork
         getSpriteUrisFromImg cắt sprite theo rect x/y/w/h của bảng
         sprite, vd MAIN_BALANCE_BACKGROUND x=9 nên rãnh balance là cột
         9..47 của BALANCE.BMP, KHÔNG phải 0..38). Trước đây track luôn
         lấy từ (0,0) nên 9 cột đệm bên trái lọt vào: skin Webamp Classic
         hiện khối xanh (đệm cyan (0,198,255)) ở đầu rãnh balance, rãnh
         lệch trái 9px + cụt 9px bên phải (ảnh thật 04/11 03:15 dừng +
         03:23 đang phát Đà Nẵng 00:09 — khối xanh y hệt cả 2 trạng
         thái). Volume/position có sprite (0,0) nên không đổi. Seek shade
         cũng sai vùng: sprite nền ở (0,36) mà track lấy (0,0) (nút
         option/minimize). backgroundSprite lấy từ cfg (nơi tạo slider);
         trackOffset chỉ cộng thêm bước frame theo y (công thức fork). */
      var trackBgX = 0, trackBgY = 0;
      if (cfg.backgroundSprite) {
        var libBg = classicLib();
        if (libBg) {
          var bgRect = libBg.spriteRect(sheet, cfg.backgroundSprite);
          if (bgRect) { trackBgX = bgRect.x || 0; trackBgY = bgRect.y || 0; }
        }
      }
      setAbs(track, div, 0, 0);
      div.appendChild(track);
      var thumbName0 = (typeof cfg.thumbSprite === "function") ? cfg.thumbSprite(cfg.frac0 || 0) : cfg.thumbSprite;
      var thumb = classicSpriteDiv(sheet, thumbName0);
      if (thumb) {
        thumb.style.left = "0px"; thumb.style.top = (cfg.thumbY || 0) + "px";
        setAbs(thumb, div, 0, cfg.thumbY || 0);
        div.appendChild(thumb);
      }
      var rec = {
        div: div, track: track, thumb: thumb, w: geo.w, h: geo.h,
        tw: cfg.thumbW, th: cfg.thumbH, action: cfg.action, frac: cfg.frac0 || 0,
        trackBgX: trackBgX, trackBgY: trackBgY, /* v10.5: gốc sprite nền (để test/debug) */
        sliderId: cfg.id, /* v10.3: applyEqPreset tìm slider EQ qua rec.sliderId — phải là id dải ("preamp","eq1",...) */
        dragging: false, cfg: cfg
      };
      /* v10.3 — travelW: quãng trượt của thumb. Mặc định = geo.w - thumbW
         (hết dải). Fork: input volume rộng 65px (kém nền 68px 3px, xem
         main-window.css "#volume input { width: 65px }" + ghi chú tweet)
         nên thumb volume chỉ trượt 65-14 = 51px — đặt travelW: 51 ở chỗ
         tạo slider volume để khớp fork (nền fill cũng chỉ tới 65px).
         Balance: fork không đặt rộng input nên giữ hết dải (24px).
         vertical: true = trượt dọc (dải EQ Classic: thumb đi từ dưới
         lên, frac 1 = trên cùng = +12dB). */
      var travelW = (cfg.travelW != null) ? cfg.travelW : (geo.w - cfg.thumbW);
      var travelH = (cfg.travelH != null) ? cfg.travelH : (geo.h - cfg.thumbH);
      var vertical = !!cfg.vertical;
      rec.place = function () {
        if (thumb) {
          if (vertical) thumb.style.top = Math.round((1 - rec.frac) * travelH) + "px";
          else thumb.style.left = Math.round(rec.frac * travelW) + "px";
        }
        var off = cfg.trackOffset ? cfg.trackOffset(rec.frac) : 0;
        if (cfg.trackPosition) track.style.backgroundPosition = cfg.trackPosition(rec.frac);
        else track.style.backgroundPosition = (-trackBgX) + "px " + (-(trackBgY + off)) + "px"; /* v10.5: gốc sprite nền, không phải (0,0) */
        if (thumb && typeof cfg.thumbSprite === "function") {
          classicSetSprite(thumb, sheet, cfg.thumbSprite(rec.frac));
        }
      };
      rec.setFrac = function (f, silent) {
        rec.frac = Math.max(0, Math.min(1, f));
        rec.place();
        if (cfg.onSet) cfg.onSet(rec.frac, !!silent, rec);
      };
      var fracFromEvent = function (e) {
        var rect = null;
        try { rect = div.getBoundingClientRect(); } catch (err) { rect = null; }
        if (!rect || (rect.width === 0 && rect.height === 0)) return null;
        var cx = (e.touches && e.touches[0]) ? e.touches[0].clientX : e.clientX;
        var cy = (e.touches && e.touches[0]) ? e.touches[0].clientY : e.clientY;
        /* Đợt v10.2 — như slider Modern: rect là px màn hình (stage
           scale bằng transform), geo.w là px skin — đổi về px skin rồi
           mới tính frac, không thì kéo hết cỡ ở Fit cũng chỉ ~0.45.
           v10.3: dùng travelW/travelH (volume fork chỉ 51) + chiều dọc
           cho dải EQ Classic. */
        var sc = 1;
        try {
          if (vertical) { if (rect.height > 0 && geo.h > 0) sc = rect.height / geo.h; }
          else if (rect.width > 0 && geo.w > 0) sc = rect.width / geo.w;
          if (!isFinite(sc) || sc <= 0) sc = 1;
        } catch (err) { sc = 1; }
        if (vertical) return 1 - (((cy - rect.top) / sc - cfg.thumbH / 2) / Math.max(1, travelH));
        return ((cx - rect.left) / sc - cfg.thumbW / 2) / Math.max(1, travelW);
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
      var onUp = function () { rec.dragging = false; };
      div.addEventListener("mousedown", onDown);
      div.addEventListener("touchstart", onDown);
      try {
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
        document.addEventListener("touchmove", onMove);
        document.addEventListener("touchend", onUp);
      } catch (err) { /* môi trường test không có document đầy đủ */ }
      rec.place();
      sliderRecords.push(rec);
      return rec;
    }
    /* Chữ của dòng chạy Classic: giống setTickerText nhưng KHÔNG kèm
       "(M:SS)" (marquee Winamp 2 chỉ hiện tên). */
    function classicMarqueeText() {
      if (tickerError) return tickerError;
      if (playlistState.playing && playlistState.items[playlistState.current]) {
        return stripDiacritics(playlistState.items[playlistState.current].name);
      }
      var cur0 = playlistState.items[playlistState.current];
      return cur0 ? stripDiacritics(cur0.name) : "";
    }
    /* 4 chữ số đồng hồ từ timerDisplayText ("M:SS" / "-M:SS"). Đồng hồ
       Classic chỉ có 2 ô phút: phút >= 100 thì chỉ hiện 2 số cuối. */
    function classicTimeParts() {
      var txt = timerDisplayText();
      var minus = txt.charAt(0) === "-";
      if (minus) txt = txt.slice(1);
      var parts = txt.split(":");
      var m = parts[0] || "0", s = parts[1] || "00";
      if (m.length > 2) m = m.slice(-2);
      if (m.length < 2) m = "0" + m;
      s = (s + "00").slice(0, 2);
      return { minus: minus, digits: [m.charAt(0), m.charAt(1), s.charAt(0), s.charAt(1)] };
    }
    /* Đồng bộ mọi phần động của cửa sổ chính/shade Classic từ state hiện
       tại. Gọi từ updateStatusEls/updateTimerEls/updateProgress/
       updateVolumebar/updateChannelsIndicator (điểm choke đã có) +
       selectPlaylistItem/clearPlaylistSelection (đổi lựa chọn thì chữ
       chạy đổi theo). Rẻ + có guard nên gọi thừa cũng không sao. */
    function refreshClassicMain() {
      var rec = classicMainRec || classicShadeRec;
      if (!rec) return;
      var lib = classicLib(), C = classicData();
      if (!lib || !C) return;
      var state = demo.playing ? "play" : (demo.t > 0 ? "pause" : "stop");
      if (rec.playPauseDiv) {
        var indName = state === "play" ? "MAIN_PLAYING_INDICATOR"
          : state === "pause" ? "MAIN_PAUSED_INDICATOR" : "MAIN_STOPPED_INDICATOR";
        classicSetSprite(rec.playPauseDiv, "PLAYPAUS", indName);
      }
      if (rec.timeDiv) {
        /* Fork ẩn hẳn đồng hồ khi dừng (.stop #time { display:none });
           tạm dừng thì vẫn hiện + NHÁY (fork: animation blink 2s
           step-start 1s infinite — keyframes blink trong index.html). */
        rec.timeDiv.style.display = state === "stop" ? "none" : "";
        rec.timeDiv.style.animation = state === "pause" ? "blink 2s step-start 1s infinite" : "";
        var tp = classicTimeParts();
        var sheet = lib.digitSheetName(C);
        for (var d = 0; d < 4; d++) {
          classicSetSprite(rec.digitDivs[d], sheet, lib.digitSpriteName(tp.digits[d], C));
        }
        var ms = lib.minusSprite(C);
        classicSetSprite(rec.minusDiv, ms.sheet, tp.minus ? ms.name
          : (ms.name === "MINUS_SIGN_EX" ? "NO_MINUS_SIGN_EX" : "NO_MINUS_SIGN"));
      }
      if (rec.miniTimeChars) {
        var tp2 = classicTimeParts();
        var chars = state === "stop" ? [" ", " ", " ", " ", " "]
          : [(tp2.minus ? "-" : " "), tp2.digits[0], tp2.digits[1], tp2.digits[2], tp2.digits[3]];
        for (var mc = 0; mc < 5; mc++) classicSetChar(rec.miniTimeChars[mc], chars[mc]);
      }
      if (rec.marqueeHolder && rec.tickerRec) {
        var text = classicMarqueeText();
        if (text !== rec.marqueeText) {
          rec.marqueeText = text;
          rec.marqueeHolder.innerHTML = "";
          rec.marqueeHolder.appendChild(classicTextRow(text));
          rec.tickerRec.textW = text.length * 5;
          rec.tickerRec.offset = 0;
          rec.tickerRec._tickPause = 0;
          try { rec.marqueeHolder.style.transform = ""; } catch (e) { /* bỏ qua */ }
          syncTickerAnim();
        }
        if (rec.marqueeDiv) rec.marqueeDiv.style.filter = tickerError ? "hue-rotate(-120deg)" : "";
      }
      if (rec.kbpsDiv) {
        var info = getSongInfoState();
        if (state === "stop") {
          rec.kbpsDiv.style.display = "none";
          if (rec.khzDiv) rec.khzDiv.style.display = "none";
        } else {
          rec.kbpsDiv.style.display = "";
          if (rec.khzDiv) rec.khzDiv.style.display = "";
          if (info.kbps !== rec.kbpsText) {
            rec.kbpsText = info.kbps;
            rec.kbpsDiv.innerHTML = "";
            rec.kbpsDiv.appendChild(classicTextRow(info.kbps));
          }
          if (rec.khzDiv && info.khz !== rec.khzText) {
            rec.khzText = info.khz;
            rec.khzDiv.innerHTML = "";
            rec.khzDiv.appendChild(classicTextRow(info.khz));
          }
        }
      }
      if (rec.monoDiv && rec.stereoDiv) {
        /* v10.5 — nhu chi bao Modern: doc so kenh cua MUC DANG PHAT
           (itemChannels), khong do tin hieu (Webamp: MonoStereo chi doc
           track.channels). Chua biet -> stereo (tam), dung -> none. */
        var ch = (!demo.playing) ? "none" : (itemChannels(playlistState.items[playlistState.current]) === 1 ? "mono" : "stereo");
        classicSetSprite(rec.monoDiv, "MONOSTER", ch === "mono" ? "MAIN_MONO_SELECTED" : "MAIN_MONO");
        classicSetSprite(rec.stereoDiv, "MONOSTER", ch === "stereo" ? "MAIN_STEREO_SELECTED" : "MAIN_STEREO");
      }
      if (rec.volumeRec) { rec.volumeRec.frac = demo.volume; rec.volumeRec.place(); }
      if (rec.balanceRec) { rec.balanceRec.frac = drawerState.balance; rec.balanceRec.place(); }
      /* Fork: .stop #position thumb { visibility:hidden } — dừng thì ẩn
         thumb thanh tua (cả main lẫn shade); phát/tạm dừng thì hiện. */
      if (rec.seekRec && rec.seekRec.thumb) {
        rec.seekRec.thumb.style.visibility = state === "stop" ? "hidden" : "";
      }
      if (rec.buttons) {
        var keys = Object.keys(rec.buttons);
        for (var bi = 0; bi < keys.length; bi++) {
          try { rec.buttons[keys[bi]].refresh(); } catch (e) { /* bỏ qua */ }
        }
      }
      /* v10.3 — đồng bộ cửa sổ EQ Classic (nút ON + thumb 11 dải + đồ thị)
         theo state hiện tại; chạy theo từng timeupdate nên đồ thị có
         guard sig, thumb chỉ đặt lại khi giá trị đổi. */
      if (classicEqRec) {
        if (classicEqRec.buttons) {
          var ek = Object.keys(classicEqRec.buttons);
          for (var ei = 0; ei < ek.length; ei++) {
            try { classicEqRec.buttons[ek[ei]].refresh(); } catch (e) { /* bỏ qua */ }
          }
        }
        if (classicEqRec.bandRecs) {
          for (var bq = 0; bq < classicEqRec.bandRecs.length; bq++) {
            var brq = classicEqRec.bandRecs[bq];
            if (brq && brq.cfg) {
              var bv = drawerState.eqBands[brq.cfg.id];
              if (bv == null) bv = 0.5;
              if (brq.frac !== bv) { brq.frac = bv; brq.place(); }
            }
          }
        }
        drawClassicEqGraph();
      }
    }
    function getClassicMainState() {
      var rec = classicMainRec || classicShadeRec;
      if (!rec) return null;
      return {
        shade: !!rec.shade, w: rec.w, h: rec.h,
        marqueeText: rec.marqueeText || "",
        timeText: timerDisplayText(),
        playing: !!demo.playing,
        volume: demo.volume, balance: drawerState.balance,
        seekFrac: demo.seekFrac,
        shuffle: !!demo.shuffle, repeat: demo.repeat,
        drawerOpen: !!drawerState.open,
        /* v10.3: trạng thái cửa sổ PL/EQ Classic (nút EQ chính đọc
           classicEqOpen thay cho drawerOpen từ v10.3). */
        eqOpen: classicEqOpen, eqShade: classicEqShade, plShade: classicPlShade,
        playlistOpen: (function () { try { return !!(isPlaylistOpen && isPlaylistOpen()); } catch (e) { return false; } })(),
        sheets: classicData() ? Object.keys(classicData().sheets) : []
      };
    }
    /* Nút EQ Classic: mở/đóng CỬA SỔ EQ Classic (v10.3 — trước đây mở
       ngăn kéo Modern, không có ý nghĩa trên skin Classic vì ngăn kéo
       không vẽ). */
    function classicToggleEq() {
      setClassicEqOpen(!classicEqOpen);
    }
    /* Nút PL Classic: đổi trạng thái playlist (như Modern). Cửa sổ
       Playlist Classic vẽ ở renderClassicStage khi playlistOpen (v10.3 —
       trước đây nút chỉ đổi trạng thái + sáng đèn, không có cửa sổ nào
       để mở nên bấm mà không thấy gì). */
    function classicTogglePlaylist() {
      if (onPlaylistToggle) onPlaylistToggle();
    }
    /* Menu chính từ nút O trên titlebar: gộp các mục File/Play/Options/
       View/Help đã có của Amp (showPlaylistMenu). */
    function classicOpenMainMenu(anchorDiv) {
      var items = [];
      try { items = items.concat(fileMenuItems(anchorDiv)); } catch (e) { /* bỏ qua */ }
      try { items = items.concat(playMenuItems()); } catch (e) { /* bỏ qua */ }
      try { items = items.concat(optionsMenuItems(anchorDiv)); } catch (e) { /* bỏ qua */ }
      try { items = items.concat(viewMenuItems()); } catch (e) { /* bỏ qua */ }
      /* v10.8: Classic KHONG co nut Vis Menu (khong co button.vis.misc
         trong .wsz) nen menu chinh la cho duy nhat de bat/tat Milkdrop
         — them muc Milkdrop rieng o day, sau nhom View. (Modern thi
         Milkdrop o menu Vis, khong o View; Classic dung menu chinh
         thay cho menu Vis.) */
      try { var mdC = milkdropMenuItem(); if (mdC) items.push(mdC); } catch (e) { /* bỏ qua */ }
      try { items = items.concat(helpMenuItems(anchorDiv)); } catch (e) { /* bỏ qua */ }
      if (items.length) showPlaylistMenu(anchorDiv, items);
    }
    /* Vẽ cửa sổ chính Classic (275×116) vào T (div build). Trả rec. */
    async function renderClassicMainWindow(T) {
      var lib = classicLib(), C = classicData();
      var G = lib.CLASSIC_MAIN;
      var win = document.createElement("div");
      win.style.position = "absolute";
      win.style.left = "0px"; win.style.top = "0px";
      win.style.width = G.w + "px"; win.style.height = G.h + "px";
      win.dataset.classicWindow = "main";
      win._absX = T._absX || 0; win._absY = T._absY || 0;
      T.appendChild(win);
      var rec = { shade: false, w: G.w, h: G.h, win: win, buttons: {}, marqueeText: null, kbpsText: null, khzText: null };
      /* Nền cửa sổ = MAIN.bmp nguyên tấm. */
      var bg = classicSpriteDiv("MAIN", "MAIN_WINDOW_BACKGROUND");
      if (bg) { bg.style.left = "0px"; bg.style.top = "0px"; setAbs(bg, win, 0, 0); win.appendChild(bg); }
      /* Titlebar + 4 nút góc (luôn dạng selected = đang focus, như
         Webamp mặc định; bấm đúp nền titlebar thì thu gọn). */
      var tb = classicSpriteDiv("TITLEBAR", "MAIN_TITLE_BAR_SELECTED");
      if (tb) { tb.style.left = G.titlebar.x + "px"; tb.style.top = G.titlebar.y + "px"; setAbs(tb, win, G.titlebar.x, G.titlebar.y); win.appendChild(tb); }
      var titleZone = document.createElement("div");
      titleZone.dataset.classicTitle = "1"; /* vùng dblclick về normal (test + debug) */
      titleZone.style.position = "absolute";
      titleZone.style.left = "0px"; titleZone.style.top = "0px";
      titleZone.style.width = "275px"; titleZone.style.height = "14px";
      titleZone.style.cursor = "default";
      setAbs(titleZone, win, 0, 0);
      win.appendChild(titleZone);
      titleZone.ondblclick = function () { if (onShadeToggle) onShadeToggle(true); };
      rec.buttons.option = classicButton(win, G.option, "TITLEBAR", {
        id: "option", sprite: "MAIN_OPTIONS_BUTTON", activeSprite: "MAIN_OPTIONS_BUTTON_DEPRESSED",
        title: "Menu Winamp", onClick: function (div) { classicOpenMainMenu(div); }
      });
      rec.buttons.minimize = classicButton(win, G.minimize, "TITLEBAR", {
        id: "minimize", sprite: "MAIN_MINIMIZE_BUTTON", activeSprite: "MAIN_MINIMIZE_BUTTON_DEPRESSED",
        title: "Thu nhỏ", onClick: function () { if (onMinimize) onMinimize(); else if (onPlayerClose) onPlayerClose(); }
      });
      rec.buttons.shade = classicButton(win, G.shadeBtn, "TITLEBAR", {
        id: "shade", sprite: "MAIN_SHADE_BUTTON", activeSprite: "MAIN_SHADE_BUTTON_DEPRESSED",
        title: "Bật/tắt chế độ thu gọn", onClick: function () { if (onShadeToggle) onShadeToggle(true); }
      });
      rec.buttons.close = classicButton(win, G.close, "TITLEBAR", {
        id: "close", sprite: "MAIN_CLOSE_BUTTON", activeSprite: "MAIN_CLOSE_BUTTON_DEPRESSED",
        title: "Đóng", onClick: function () { if (onPlayerClose) onPlayerClose(); }
      });
      /* Clutter bar: nền + 5 nút nhỏ. Fork chỉ nối D (doublesize) + O
         mở menu Options; Amp nối thêm I (thông tin bài) + V (đổi kiểu
         vis); A chưa có tương đương web nên chỉ hiện chữ. */
      var cl = classicSpriteDiv("TITLEBAR", "MAIN_CLUTTER_BAR_BACKGROUND");
      if (cl) { cl.style.left = G.clutter.x + "px"; cl.style.top = G.clutter.y + "px"; setAbs(cl, win, G.clutter.x, G.clutter.y); win.appendChild(cl); }
      var clutterBtns = G.clutter.buttons;
      for (var ci = 0; ci < clutterBtns.length; ci++) {
        (function (cb) {
          var geo = { x: G.clutter.x, y: G.clutter.y + cb.y, w: 8, h: cb.h };
          var btn = classicButton(win, geo, "TITLEBAR", {
            id: "clutter-" + cb.id, sprite: null, title:
              cb.id === "o" ? "Menu Options" :
              cb.id === "a" ? "Luôn ở trên cùng (chưa có trên web)" :
              cb.id === "i" ? "Thông tin bài" :
              cb.id === "d" ? "Đổi cỡ 1x / Vừa màn hình" : "Đổi kiểu hiệu ứng",
            isSelected: function () {
              if (cb.id === "d") { try { return !!(isZoomFit && isZoomFit()); } catch (e) { return false; } }
              return false;
            },
            onClick: function (div) {
              if (cb.id === "o") classicOpenMainMenu(div);
              else if (cb.id === "i") showTrackInfo(div);
              else if (cb.id === "d") {
                if (onZoom) {
                  var fit = false;
                  try { fit = !!(isZoomFit && isZoomFit()); } catch (e) { fit = false; }
                  onZoom(fit ? "1" : "fit");
                }
              }
              else if (cb.id === "v") cycleVisVariant(1);
            }
          });
          /* Nút clutter không có sprite thường (trong suốt trên nền);
             chỉ hiện sprite *_SELECTED khi trạng thái bật (D = zoom fit). */
          btn.refresh = function () {
            var sel = false;
            try { sel = !!(btn.o.isSelected && btn.o.isSelected()); } catch (e) { sel = false; }
            if (btn.inner) {
              if (sel) { if (!btn.inner.parentElement) btn.div.appendChild(btn.inner); classicSetSprite(btn.inner, "TITLEBAR", cb.selectedSprite); }
              else if (btn.inner.parentElement) btn.inner.parentElement.removeChild(btn.inner);
            } else if (sel) {
              var spr = classicSpriteDiv("TITLEBAR", cb.selectedSprite);
              if (spr) { spr.style.left = "0px"; spr.style.top = "0px"; btn.div.appendChild(spr); btn.inner = spr; }
            }
          };
          rec.buttons["clutter-" + cb.id] = btn;
        })(clutterBtns[ci]);
      }
      /* Đèn trạng thái phát + work-indicator (luôn ẩn — Amp không có
         trạng thái "đang tải" riêng; giữ div để đủ hình học). */
      rec.playPauseDiv = classicSpriteDiv("PLAYPAUS", "MAIN_STOPPED_INDICATOR");
      if (rec.playPauseDiv) {
        rec.playPauseDiv.style.left = G.playPause.x + "px"; rec.playPauseDiv.style.top = G.playPause.y + "px";
        setAbs(rec.playPauseDiv, win, G.playPause.x, G.playPause.y);
        win.appendChild(rec.playPauseDiv);
      }
      var workDiv = classicSpriteDiv("PLAYPAUS", "MAIN_WORKING_INDICATOR");
      if (workDiv) {
        workDiv.style.left = G.workIndicator.x + "px"; workDiv.style.top = G.workIndicator.y + "px";
        workDiv.style.display = "none";
        setAbs(workDiv, win, G.workIndicator.x, G.workIndicator.y);
        win.appendChild(workDiv);
      }
      /* Đồng hồ: 4 chữ số + dấu trừ; bấm đổi đếm lên/ngược. */
      var timeDiv = document.createElement("div");
      timeDiv.dataset.classicTime = "1";
      timeDiv.style.position = "absolute";
      timeDiv.style.left = G.time.x + "px"; timeDiv.style.top = G.time.y + "px";
      timeDiv.style.width = G.time.w + "px"; timeDiv.style.height = G.time.h + "px";
      timeDiv.style.cursor = "pointer";
      timeDiv.title = "Bấm để đổi đếm lên / đếm ngược";
      setAbs(timeDiv, win, G.time.x, G.time.y);
      win.appendChild(timeDiv);
      timeDiv.onclick = function () { toggleTimerMode(); refreshClassicMain(); };
      rec.timeDiv = timeDiv;
      rec.digitDivs = [];
      var sheet0 = lib.digitSheetName(C);
      for (var di = 0; di < 4; di++) {
        var dg = classicSpriteDiv(sheet0, lib.digitSpriteName("0", C));
        if (dg) {
          dg.style.left = G.time.digitXs[di] + "px"; dg.style.top = "0px";
          setAbs(dg, timeDiv, G.time.digitXs[di], 0);
          timeDiv.appendChild(dg);
        }
        rec.digitDivs.push(dg);
      }
      var ms0 = lib.minusSprite(C);
      rec.minusDiv = classicSpriteDiv(ms0.sheet, ms0.name === "MINUS_SIGN_EX" ? "NO_MINUS_SIGN_EX" : "NO_MINUS_SIGN");
      if (rec.minusDiv) {
        rec.minusDiv.style.left = ms0.x + "px"; rec.minusDiv.style.top = ms0.y + "px";
        setAbs(rec.minusDiv, timeDiv, ms0.x, ms0.y);
        timeDiv.appendChild(rec.minusDiv);
      }
      /* Vis 76×16: canvas trong suốt trên nền display của MAIN.bmp,
         đăng ký visCanvases để drawVisStatic vẽ (classic:true = gradient
         theo hàng từ viscolor.txt). */
      var visCv = document.createElement("canvas");
      visCv.width = G.vis.w; visCv.height = G.vis.h;
      visCv.dataset.classicVis = "1";
      visCv.style.position = "absolute";
      visCv.style.left = G.vis.x + "px"; visCv.style.top = G.vis.y + "px";
      visCv.style.width = G.vis.w + "px"; visCv.style.height = G.vis.h + "px";
      visCv.style.imageRendering = "pixelated";
      /* Đợt 4: bấm vào vis Classic để đổi kiểu (BAR → sóng → tắt). */
      visCv.style.pointerEvents = "auto"; visCv.style.cursor = "pointer";
      visCv.title = "Bấm để đổi kiểu vis";
      visCv.onclick = function () { cycleVisType("display"); };
      setAbs(visCv, win, G.vis.x, G.vis.y);
      win.appendChild(visCv);
      var visBands = (C.viscolors || []).slice(2, 18);
      visCanvases.push({ cv: visCv, bands: visBands, fillBg: false, classic: true });
      rec.visCanvas = visCv;
      /* Chữ chạy (marquee) 154×6 + kbps/khz 5×6. */
      var mq = document.createElement("div");
      mq.dataset.classicMarquee = "1";
      mq.style.position = "absolute";
      mq.style.left = G.marquee.x + "px"; mq.style.top = G.marquee.y + "px";
      mq.style.width = G.marquee.w + "px"; mq.style.height = "12px";
      mq.style.paddingTop = "3px";
      mq.style.overflow = "hidden";
      mq.title = "Tên bài";
      setAbs(mq, win, G.marquee.x, G.marquee.y);
      win.appendChild(mq);
      var holder = document.createElement("div");
      holder.style.whiteSpace = "nowrap";
      holder.style.willChange = "transform";
      mq.appendChild(holder);
      rec.marqueeDiv = mq;
      rec.marqueeHolder = holder;
      rec.tickerRec = { holder: holder, textW: 0, boxW: G.marquee.w, offset: 0, _tickPause: 0, classic: true };
      tickerEls.push(rec.tickerRec);
      rec.kbpsDiv = document.createElement("div");
      rec.kbpsDiv.dataset.classicKbps = "1";
      rec.kbpsDiv.style.position = "absolute";
      rec.kbpsDiv.style.left = G.kbps.x + "px"; rec.kbpsDiv.style.top = G.kbps.y + "px";
      rec.kbpsDiv.style.width = G.kbps.w + "px"; rec.kbpsDiv.style.height = G.kbps.h + "px";
      rec.kbpsDiv.style.overflow = "hidden";
      setAbs(rec.kbpsDiv, win, G.kbps.x, G.kbps.y);
      win.appendChild(rec.kbpsDiv);
      rec.khzDiv = document.createElement("div");
      rec.khzDiv.dataset.classicKhz = "1";
      rec.khzDiv.style.position = "absolute";
      rec.khzDiv.style.left = G.khz.x + "px"; rec.khzDiv.style.top = G.khz.y + "px";
      rec.khzDiv.style.width = G.khz.w + "px"; rec.khzDiv.style.height = G.khz.h + "px";
      rec.khzDiv.style.overflow = "hidden";
      setAbs(rec.khzDiv, win, G.khz.x, G.khz.y);
      win.appendChild(rec.khzDiv);
      /* Mono/stereo. */
      rec.monoDiv = classicSpriteDiv("MONOSTER", "MAIN_MONO");
      if (rec.monoDiv) {
        rec.monoDiv.style.left = (G.monoStereo.x + G.monoStereo.mono.x) + "px";
        rec.monoDiv.style.top = G.monoStereo.y + "px";
        setAbs(rec.monoDiv, win, G.monoStereo.x + G.monoStereo.mono.x, G.monoStereo.y);
        win.appendChild(rec.monoDiv);
      }
      rec.stereoDiv = classicSpriteDiv("MONOSTER", "MAIN_STEREO");
      if (rec.stereoDiv) {
        rec.stereoDiv.style.left = (G.monoStereo.x + G.monoStereo.stereo.x) + "px";
        rec.stereoDiv.style.top = G.monoStereo.y + "px";
        setAbs(rec.stereoDiv, win, G.monoStereo.x + G.monoStereo.stereo.x, G.monoStereo.y);
        win.appendChild(rec.stereoDiv);
      }
      /* Volume / balance: nền dải + thumb kéo. */
      rec.volumeRec = classicSlider(win, { x: G.volume.x, y: G.volume.y, w: G.volume.w, h: G.volume.h },
        "VOLUME", {
          id: "volume", action: "VOLUME", title: "Thanh âm lượng",
          thumbSprite: "MAIN_VOLUME_THUMB", thumbActiveSprite: "MAIN_VOLUME_THUMB_SELECTED",
          thumbW: G.volume.thumbW, thumbH: G.volume.thumbH, thumbY: G.volume.thumbY,
          backgroundSprite: "MAIN_VOLUME_BACKGROUND", /* v10.5: rãnh cắt từ sprite nền (x=0) */
          frac0: demo.volume,
          /* v10.3 — fork: input volume rộng 65px (kém nền 68px 3px) nên
             thumb chỉ trượt 65-14 = 51px, khớp nền fill tới 65px. */
          travelW: 51,
          trackOffset: function (frac) { return lib.volumeTrackOffset(frac); }, /* v10.5: dùng frac vừa kéo, không đọc demo.volume (place() chạy TRƯỚC onSet nên đọc state cũ thì rãnh chậm 1 nhịp) */
          onSet: function (frac) {
            demo.volume = frac; updateVolumebar();
            applyEngineVolume();
            persistPlayback();
          }
        });
      rec.balanceRec = classicSlider(win, { x: G.balance.x, y: G.balance.y, w: G.balance.w, h: G.balance.h },
        "BALANCE", {
          id: "balance", action: "PAN", title: "Cân bằng trái/phải",
          thumbSprite: "MAIN_BALANCE_THUMB", thumbActiveSprite: "MAIN_BALANCE_THUMB_ACTIVE",
          thumbW: G.balance.thumbW, thumbH: G.balance.thumbH, thumbY: G.balance.thumbY,
          backgroundSprite: "MAIN_BALANCE_BACKGROUND", /* v10.5: rãnh cắt từ x=9 (không lấy 9 cột đệm) */
          frac0: drawerState.balance,
          trackOffset: function (frac) { return lib.balanceTrackOffset(frac); }, /* v10.5: dùng frac vừa kéo (như volume — đọc drawerState.balance ở đây thì rãnh chậm 1 nhịp vì place() chạy trước onSet/applyBalance) */
          onSet: function (frac) { applyBalance(frac); }
        });
      /* EQ / PL. */
      rec.buttons.eq = classicButton(win, G.eqButton, "SHUFREP", {
        id: "equalizer-button", sprite: "MAIN_EQ_BUTTON", selectedSprite: "MAIN_EQ_BUTTON_SELECTED",
        activeSprite: "MAIN_EQ_BUTTON_DEPRESSED", activeSelectedSprite: "MAIN_EQ_BUTTON_DEPRESSED_SELECTED",
        title: "Bật/tắt Bộ chỉnh âm (cửa sổ EQ Classic)",
        isSelected: function () { return !!classicEqOpen; },
        onClick: function () { classicToggleEq(); refreshClassicMain(); }
      });
      rec.buttons.playlist = classicButton(win, G.playlistButton, "SHUFREP", {
        id: "playlist-button", sprite: "MAIN_PLAYLIST_BUTTON", selectedSprite: "MAIN_PLAYLIST_BUTTON_SELECTED",
        activeSprite: "MAIN_PLAYLIST_BUTTON_DEPRESSED", activeSelectedSprite: "MAIN_PLAYLIST_BUTTON_DEPRESSED_SELECTED",
        title: "Bật/tắt Soạn Playlist",
        isSelected: function () { try { return !!(isPlaylistOpen && isPlaylistOpen()); } catch (e) { return false; } },
        onClick: function () { classicTogglePlaylist(); refreshClassicMain(); }
      });
      /* Thanh tua (seek). */
      rec.seekRec = classicSlider(win, { x: G.position.x, y: G.position.y, w: G.position.w, h: G.position.h },
        "POSBAR", {
          id: "position", action: "SEEK", title: "Thanh tua",
          thumbSprite: "MAIN_POSITION_SLIDER_THUMB", thumbActiveSprite: "MAIN_POSITION_SLIDER_THUMB_SELECTED",
          thumbW: G.position.thumbW, thumbH: G.position.thumbH, thumbY: 0,
          backgroundSprite: "MAIN_POSITION_SLIDER_BACKGROUND", /* v10.5: rãnh cắt từ sprite nền (x=0) */
          frac0: demo.seekFrac, trackOffset: null,
          onSet: function (frac, silent, r) {
            if (silent) return;
            var sought = false;
            if (audioEngine) sought = audioEngine.seekToFraction(frac);
            if (!sought) {
              var curSeek = playlistState.items[playlistState.current];
              if (curSeek && curSeek.kind === "track" && !curSeek.url) {
                demo.seekFrac = frac;
                demo.t = frac * (curSeek.len || 0);
                updateTimerEls(); updateProgress();
              } else if (audioEngine && curSeek && curSeek.url) {
                r.frac = demo.seekFrac;
                r.place();
              }
            }
          }
        });
      /* Hàng nút transport + eject + shuffle/repeat + about. */
      rec.buttons.prev = classicButton(win, G.prev, "CBUTTONS", {
        id: "previous", sprite: "MAIN_PREVIOUS_BUTTON", activeSprite: "MAIN_PREVIOUS_BUTTON_ACTIVE",
        title: "Bài trước", onClick: function () { prevTrack(); }
      });
      rec.buttons.play = classicButton(win, G.play, "CBUTTONS", {
        id: "play", sprite: "MAIN_PLAY_BUTTON", activeSprite: "MAIN_PLAY_BUTTON_ACTIVE",
        title: "Phát", onClick: function () { togglePlay(); }
      });
      rec.buttons.pause = classicButton(win, G.pause, "CBUTTONS", {
        id: "pause", sprite: "MAIN_PAUSE_BUTTON", activeSprite: "MAIN_PAUSE_BUTTON_ACTIVE",
        title: "Tạm dừng", onClick: function () {
          if (audioEngine) audioEngine.pause();
          else { demo.playing = false; playlistState.playing = false; updateStatusEls(); }
        }
      });
      rec.buttons.stop = classicButton(win, G.stop, "CBUTTONS", {
        id: "stop", sprite: "MAIN_STOP_BUTTON", activeSprite: "MAIN_STOP_BUTTON_ACTIVE",
        title: "Dừng", onClick: function () { stopPlayback(); }
      });
      rec.buttons.next = classicButton(win, G.next, "CBUTTONS", {
        id: "next", sprite: "MAIN_NEXT_BUTTON", activeSprite: "MAIN_NEXT_BUTTON_ACTIVE",
        title: "Bài tiếp", onClick: function () { nextTrack(demo.repeat === 1 || demo.shuffle); }
      });
      rec.buttons.eject = classicButton(win, G.eject, "CBUTTONS", {
        id: "eject", sprite: "MAIN_EJECT_BUTTON", activeSprite: "MAIN_EJECT_BUTTON_ACTIVE",
        title: "Mở tập tin", onClick: function (div) { showLocalAddMenu(div); }
      });
      rec.buttons.shuffle = classicButton(win, G.shuffle, "SHUFREP", {
        id: "shuffle", sprite: "MAIN_SHUFFLE_BUTTON", selectedSprite: "MAIN_SHUFFLE_BUTTON_SELECTED",
        activeSprite: "MAIN_SHUFFLE_BUTTON_DEPRESSED", activeSelectedSprite: "MAIN_SHUFFLE_BUTTON_SELECTED_DEPRESSED",
        title: "Bật/tắt ngẫu nhiên",
        isSelected: function () { return !!demo.shuffle; },
        onClick: function () {
          demo.shuffle = !demo.shuffle;
          persistPlayback();
          refreshClassicMain();
        }
      });
      rec.buttons.repeat = classicButton(win, G.repeat, "SHUFREP", {
        id: "repeat", sprite: "MAIN_REPEAT_BUTTON", selectedSprite: "MAIN_REPEAT_BUTTON_SELECTED",
        activeSprite: "MAIN_REPEAT_BUTTON_DEPRESSED", activeSelectedSprite: "MAIN_REPEAT_BUTTON_SELECTED_DEPRESSED",
        title: "Lặp lại: bấm để xoay Tắt → Lặp tất cả → Lặp 1 bài",
        isSelected: function () { return demo.repeat !== 0; },
        badge: function () { return demo.repeat === -1 ? "1" : null; },
        onClick: function () {
          cycleRepeat();
          refreshClassicMain();
        }
      });
      var aboutZone = document.createElement("div");
      aboutZone.dataset.classicAbout = "1";
      aboutZone.style.position = "absolute";
      aboutZone.style.left = G.about.x + "px"; aboutZone.style.top = G.about.y + "px";
      aboutZone.style.width = G.about.w + "px"; aboutZone.style.height = G.about.h + "px";
      aboutZone.style.cursor = "pointer";
      aboutZone.title = "Giới thiệu về Amp";
      setAbs(aboutZone, win, G.about.x, G.about.y);
      win.appendChild(aboutZone);
      aboutZone.onclick = function () { openAbout(aboutZone); };
      rec.aboutZone = aboutZone;
      classicMainRec = rec;
      return rec;
    }
    /* Vẽ shade Classic (275×14) vào T. Trả rec. Nền shade + transport thu
       nhỏ (icon đã vẽ sẵn trong nền, chỉ còn vùng bấm trong suốt) + seek
       mini + đồng hồ mini (ký tự 5×6) + vis mini 38×5. */
    async function renderClassicShadeWindow(T) {
      var lib = classicLib(), C = classicData();
      var G = lib.CLASSIC_SHADE;
      var win = document.createElement("div");
      win.style.position = "absolute";
      win.style.left = "0px"; win.style.top = "0px";
      win.style.width = G.w + "px"; win.style.height = G.h + "px";
      win.dataset.classicWindow = "shade";
      win._absX = T._absX || 0; win._absY = T._absY || 0;
      T.appendChild(win);
      var rec = { shade: true, w: G.w, h: G.h, win: win, buttons: {}, marqueeText: null, kbpsText: null, khzText: null };
      var bg = classicSpriteDiv("TITLEBAR", "MAIN_SHADE_BACKGROUND_SELECTED");
      if (bg) { bg.style.left = "0px"; bg.style.top = "0px"; setAbs(bg, win, 0, 0); win.appendChild(bg); }
      var titleZone = document.createElement("div");
      titleZone.dataset.classicTitle = "1"; /* vùng dblclick về normal (test + debug) */
      titleZone.style.position = "absolute";
      titleZone.style.left = "0px"; titleZone.style.top = "0px";
      titleZone.style.width = "275px"; titleZone.style.height = "14px";
      setAbs(titleZone, win, 0, 0);
      win.appendChild(titleZone);
      titleZone.ondblclick = function () { if (onShadeToggle) onShadeToggle(false); };
      rec.buttons.option = classicButton(win, { x: 6, y: 3, w: 9, h: 9 }, "TITLEBAR", {
        id: "option", sprite: "MAIN_OPTIONS_BUTTON", activeSprite: "MAIN_OPTIONS_BUTTON_DEPRESSED",
        title: "Menu Winamp", onClick: function (div) { classicOpenMainMenu(div); }
      });
      rec.buttons.minimize = classicButton(win, { x: 244, y: 3, w: 9, h: 9 }, "TITLEBAR", {
        id: "minimize", sprite: "MAIN_MINIMIZE_BUTTON", activeSprite: "MAIN_MINIMIZE_BUTTON_DEPRESSED",
        title: "Thu nhỏ", onClick: function () { if (onMinimize) onMinimize(); else if (onPlayerClose) onPlayerClose(); }
      });
      rec.buttons.shade = classicButton(win, { x: 254, y: 3, w: 9, h: 9 }, "TITLEBAR", {
        id: "shade", sprite: "MAIN_SHADE_BUTTON_SELECTED", activeSprite: "MAIN_SHADE_BUTTON_SELECTED_DEPRESSED",
        title: "Về chế độ đầy đủ", onClick: function () { if (onShadeToggle) onShadeToggle(false); }
      });
      rec.buttons.close = classicButton(win, { x: 264, y: 3, w: 9, h: 9 }, "TITLEBAR", {
        id: "close", sprite: "MAIN_CLOSE_BUTTON", activeSprite: "MAIN_CLOSE_BUTTON_DEPRESSED",
        title: "Đóng", onClick: function () { if (onPlayerClose) onPlayerClose(); }
      });
      /* Transport thu nhỏ: vùng bấm trong suốt (icon nằm trong nền). */
      function shadeTransport(geo, id, title, fn) {
        var z = document.createElement("div");
        z.dataset.classicBtn = id;
        z.style.position = "absolute";
        z.style.left = geo.x + "px"; z.style.top = geo.y + "px";
        z.style.width = geo.w + "px"; z.style.height = geo.h + "px";
        z.style.cursor = "pointer";
        z.title = title;
        setAbs(z, win, geo.x, geo.y);
        win.appendChild(z);
        z.onclick = fn;
        rec.buttons[id] = { div: z, refresh: function () { /* không có sprite để đổi */ } };
        return z;
      }
      shadeTransport(G.prev, "previous", "Bài trước", function () { prevTrack(); });
      shadeTransport(G.play, "play", "Phát", function () { togglePlay(); });
      shadeTransport(G.pause, "pause", "Tạm dừng", function () {
        if (audioEngine) audioEngine.pause();
        else { demo.playing = false; playlistState.playing = false; updateStatusEls(); }
      });
      shadeTransport(G.stop, "stop", "Dừng", function () { stopPlayback(); });
      shadeTransport(G.next, "next", "Bài tiếp", function () { nextTrack(demo.repeat === 1 || demo.shuffle); });
      shadeTransport(G.eject, "eject", "Mở tập tin", function (div) { showLocalAddMenu(div); });
      /* Vis mini 38×5 + seek mini 17×7 + đồng hồ mini. */
      var visCv = document.createElement("canvas");
      visCv.width = G.vis.w; visCv.height = G.vis.h;
      visCv.dataset.classicVis = "1";
      visCv.style.position = "absolute";
      visCv.style.left = G.vis.x + "px"; visCv.style.top = G.vis.y + "px";
      visCv.style.width = G.vis.w + "px"; visCv.style.height = G.vis.h + "px";
      visCv.style.imageRendering = "pixelated";
      /* Đợt 4: bấm vào vis Classic để đổi kiểu (BAR → sóng → tắt). */
      visCv.style.pointerEvents = "auto"; visCv.style.cursor = "pointer";
      visCv.title = "Bấm để đổi kiểu vis";
      visCv.onclick = function () { cycleVisType("display"); };
      setAbs(visCv, win, G.vis.x, G.vis.y);
      win.appendChild(visCv);
      var visBands = (C.viscolors || []).slice(2, 18);
      visCanvases.push({ cv: visCv, bands: visBands, fillBg: false, classic: true });
      rec.visCanvas = visCv;
      rec.seekRec = classicSlider(win, { x: G.position.x, y: G.position.y, w: G.position.w, h: G.position.h },
        "TITLEBAR", {
          id: "position", action: "SEEK", title: "Thanh tua",
          thumbSprite: function (frac) {
            if (frac <= 0.33) return "MAIN_SHADE_POSITION_THUMB_LEFT";
            if (frac >= 0.66) return "MAIN_SHADE_POSITION_THUMB_RIGHT";
            return "MAIN_SHADE_POSITION_THUMB";
          },
          thumbW: 3, thumbH: 7, thumbY: 0,
          backgroundSprite: "MAIN_SHADE_POSITION_BACKGROUND", /* v10.5: rãnh shade cắt từ (0,36), không lấy (0,0) */
          frac0: demo.seekFrac, trackOffset: null,
          onSet: function (frac, silent, r) {
            if (silent) return;
            var sought = false;
            if (audioEngine) sought = audioEngine.seekToFraction(frac);
            if (!sought) {
              var curSeek = playlistState.items[playlistState.current];
              if (curSeek && curSeek.kind === "track" && !curSeek.url) {
                demo.seekFrac = frac;
                demo.t = frac * (curSeek.len || 0);
                updateTimerEls(); updateProgress();
              } else if (audioEngine && curSeek && curSeek.url) {
                r.frac = demo.seekFrac;
                r.place();
              }
            }
          }
        });
      /* Nền seek mini là sprite riêng (không phải dải dài): vẽ đè lên
         track của classicSlider (track mặc định dùng cả sheet TITLEBAR). */
      var posBg = classicSpriteDiv("TITLEBAR", "MAIN_SHADE_POSITION_BACKGROUND");
      if (posBg && rec.seekRec) {
        posBg.style.left = "0px"; posBg.style.top = "0px";
        rec.seekRec.track.innerHTML = "";
        rec.seekRec.track.appendChild(posBg);
        rec.seekRec.track.style.backgroundImage = "";
      }
      /* Đồng hồ mini: 5 ký tự 5×6 ở offset 1,7,12,20,25 (MiniTime.tsx
         của fork); bấm đổi đếm lên/ngược. Dừng thì hiện toàn trắng. */
      var timeDiv = document.createElement("div");
      timeDiv.dataset.classicMiniTime = "1";
      timeDiv.style.position = "absolute";
      timeDiv.style.left = G.time.x + "px"; timeDiv.style.top = G.time.y + "px";
      timeDiv.style.width = G.time.w + "px"; timeDiv.style.height = G.time.h + "px";
      timeDiv.style.cursor = "pointer";
      timeDiv.title = "Bấm để đổi đếm lên / đếm ngược";
      setAbs(timeDiv, win, G.time.x, G.time.y);
      win.appendChild(timeDiv);
      timeDiv.onclick = function () { toggleTimerMode(); refreshClassicMain(); };
      rec.timeDiv = null; /* shade không dùng đồng hồ số 9×13 */
      rec.miniTimeChars = [];
      var charXs = [1, 7, 12, 20, 25];
      for (var ci = 0; ci < 5; ci++) {
        var chDiv = classicCharDiv(" ");
        chDiv.style.position = "absolute";
        chDiv.style.left = charXs[ci] + "px"; chDiv.style.top = "0px";
        setAbs(chDiv, timeDiv, charXs[ci], 0);
        timeDiv.appendChild(chDiv);
        rec.miniTimeChars.push(chDiv);
      }
      rec.playPauseDiv = null; /* shade không có đèn play/pause riêng */
      classicShadeRec = rec;
      return rec;
    }
    /* ---------- Đợt v10.3 (việc Classic PL/EQ) — cửa sổ Playlist + EQ Classic ----------
       Trước v10.3, nút PL/EQ trên skin Classic bấm mà không có gì xảy ra
       (chỉ đổi trạng thái, không có cửa sổ nào để mở) — người dùng báo
       20:21 "nút PL không hoạt động", rồi "tất cả nút không tác dụng"
       (tin 20:23 làm rõ: nút chỉ lên/xuống, xem sửa pressOn ở
       classicButton). Nay vẽ thật 2 cửa sổ theo fork Webamp (chỉ lấy dữ
       liệu định dạng + hình học, KHÔNG bê Redux/React):
       - Playlist: khung PLEDIT.bmp (top 20 + list + bottom 38, mặc định
         275×116 như fork: BASE_WINDOW_HEIGHT 58 + top 20 + bottom 38;
         kéo đổi cỡ theo segment 25×29 CHƯA làm — ghi README), hàng 13px
         màu từ pledit.txt, nút ADD/REM/SEL/MISC/LIST mở đúng menu đã có
         của Amp, nút chạy lên/xuống cuộn 4 bài, giờ chạy tổng ở đáy
         (chữ TEXT.bmp 5×6), shade 275×14 (tên bài + giờ + nút mở lại).
       - EQ: khung EQMAIN.bmp 275×116, ON/AUTO/PRESETS, đồ thị 113×19,
         11 dải dọc (preamp + 10 dải, nền cell EQ_SLIDER_BACKGROUND theo
         công thức spriteNumber của fork Band.tsx: cell 15×65, số
         round(frac*27)), vùng +12dB/0dB/-12dB, shade EQ_EX 275×14
         (volume/balance mini 3×7, đổi sprite trái/giữa/phải theo vị trí
         như fork EqualizerShade segment()).
       Trạng thái mở do renderer giữ (classicEqOpen/classicEqShade/
       classicPlShade); nút EQ trên cửa sổ chính + mục "Ngăn kéo" trong
       menu (qua toggleDrawer ở index.html) đều mở cửa sổ EQ Classic
       khi đang dùng skin Classic, không mở ngăn kéo Modern.
       v10.5 (ảnh 03:23): sửa 3 lỗi vẽ playlist — (1) fill top + tile
       trái/phải lát bằng tileSprite (nhiều div cắt đúng sprite) thay
       cho repeat-x/repeat-y trên cả sheet (lôi góc phải vào 2 lần,
       trông như 2 bộ nút); (2) góc phải dùng đúng tên sprite
       PLAYLIST_TOP_RIGHT_CORNER_SELECTED (trước đây sai tên nên mất
       nền); (3) giờ chạy dời sang (132,88) — trong bottom-right như
       fork, không đè nút ADD/REM/SEL nữa. Ticker Classic sửa ở
       classic.js charSprite (deburr + lowercase như Character.tsx
       của fork): "Da Nang" không còn thành "A ANG". */
    var CLASSIC_PL_W = 275, CLASSIC_PL_H = 116;
    var CLASSIC_EQ_W = 275, CLASSIC_EQ_H = 116;
    var classicEqOpen = false, classicEqShade = false, classicPlShade = false;
    var classicPlListDiv = null, classicPlTimeDiv = null;
    var classicPlRec = null, classicEqRec = null;
    var classicEqGraphCv = null, classicEqGraphSig = "";
    function classicPlStyle() {
      var lib = classicLib();
      var c = classicData();
      if (c && c.playlistStyle) return c.playlistStyle;
      return lib ? lib.DEFAULT_PLAYLIST_STYLE : { normal: "#00FF00", current: "#FFFFFF", normalbg: "#000000", selectedbg: "#0000FF", font: "Arial" };
    }
    function classicPlTimeText() {
      /* v10.7 (107): dùng chung playlistClockText() với Modern
         (tổng/đã chọn/toàn-live → thời gian đã phát) thay vì tính
         riêng — trước đây bản Classic tính riêng (sel>0 ? sel : total)
         nên sửa 1 chỗ lệch 1 chỗ; 2 skin nay luôn hiện cùng 1 số. */
      try { return playlistClockText(); } catch (e) { return fmtTime(0); }
    }
    function refreshClassicPlTime() {
      if (!classicPlTimeDiv) return;
      var txt = classicPlTimeText();
      lastPlClockDrawn = txt; /* v10.7 (107): ghi text đã vẽ để tick chỉ vẽ lại khi đổi giây */
      while (txt.length < 18) txt += " ";
      classicPlTimeDiv.innerHTML = "";
      classicPlTimeDiv.appendChild(classicTextRow(txt));
    }
    function buildClassicPlRows(listDiv) {
      if (!listDiv) return;
      var olds = listDiv.querySelectorAll(".row, .group-header");
      for (var o = 0; o < olds.length; o++) if (olds[o].parentElement) olds[o].parentElement.removeChild(olds[o]);
      var st = classicPlStyle();
      var rows = playlistGroupedRows();
      for (var r = 0; r < rows.length; r++) {
        (function (rec) {
          /* v10.18 — tieu de nhom: icon thu muc vang (📁 dong / 📂 mo),
             bam thi thu gon/mo ra (nhu buildPlaylistRows Modern). */
          if (rec.header) {
            var h = plGroupHeaderEl(rec);
            h.style.display = "block";
            h.style.height = "13px"; h.style.lineHeight = "13px";
            h.style.fontSize = "9px"; h.style.letterSpacing = "0.5px";
            h.style.fontFamily = (st.font || "Arial") + ", Arial, sans-serif";
            h.style.fontWeight = "bold";
            /* v10.20 (2) — như Modern: tiêu đề nhóm KHÔNG CÒN NỀN MÀU
               (Hải 19:07 "Màu chuyên mục cũng còn"): nền trong suốt =
               đúng nền bình thường của danh sách (đen, như hàng kênh
               thường — hàng kênh Classic tự ghi normalbg); chữ GIỮ màu
               current (trắng, như app cũ của Hải: tiêu đề trắng đậm,
               kênh xanh lá) + thư mục. */
            h.style.background = "transparent"; h.style.color = st.current;
            h.style.overflow = "hidden"; h.style.textOverflow = "ellipsis"; h.style.whiteSpace = "nowrap";
            h.style.padding = "0 3px";
            listDiv.appendChild(h);
            return;
          }
          var row = document.createElement("div");
          row.className = "row" + (rec.idx === playlistState.selected ? " sel" : "") + (rec.idx === playlistState.current ? " cur" : "");
          row.style.display = "flex";
          row.style.height = "13px"; row.style.lineHeight = "13px";
          row.style.fontSize = "9px"; row.style.letterSpacing = "0.5px";
          row.style.fontFamily = (st.font || "Arial") + ", Arial, sans-serif";
          row.style.color = st.normal; row.style.background = st.normalbg;
          if (rec.idx === playlistState.selected) row.style.background = st.selectedbg;
          if (rec.idx === playlistState.current) { row.style.color = st.current; row.style.fontWeight = "bold"; }
          var nm = document.createElement("span");
          nm.style.flex = "1 1 auto"; nm.style.minWidth = "0";
          nm.style.overflow = "hidden"; nm.style.textOverflow = "ellipsis"; nm.style.whiteSpace = "nowrap";
          nm.textContent = (rec.pos != null ? rec.pos + ". " : "") + rec.item.name; /* v10.18 — so thu tu TRONG NHOM khi co nhom (mau app cu: "1. VTV1"); phang thi ten tran nhu cu */
          row.appendChild(nm);
          var ln = document.createElement("span");
          ln.style.flex = "0 0 auto"; ln.style.paddingRight = "3px"; ln.style.textAlign = "right";
          ln.textContent = playlistRowLabel(rec.item);
          row.appendChild(ln);
          row.dataset.idx = String(rec.idx);
          row.onclick = function () { selectPlaylistItem(rec.idx); };
          row.ondblclick = function () { playPlaylistItem(rec.idx); };
          listDiv.appendChild(row);
        })(rows[r]);
      }
    }
    function refreshClassicPlRows() {
      if (!classicPlListDiv) return;
      buildClassicPlRows(classicPlListDiv);
      refreshClassicPlTime();
    }
    /* Vùng bấm trong suốt trên nền đã vẽ sẵn icon (vd nút thu gọn EQ
       trong titlebar, nút menu ADD/REM... trong đáy playlist): chỉ vùng
       bấm + title, không vẽ thêm sprite. */
    function classicHotZone(parent, geo, id, title, fn) {
      var z = document.createElement("div");
      if (id) z.dataset.classicBtn = id;
      z.style.position = "absolute";
      z.style.left = geo.x + "px"; z.style.top = geo.y + "px";
      z.style.width = geo.w + "px"; z.style.height = geo.h + "px";
      z.style.cursor = "pointer";
      if (title) z.title = title;
      setAbs(z, parent, geo.x, geo.y);
      parent.appendChild(z);
      z.onclick = fn;
      return z;
    }
    /* v10.23 — Cỡ playlist Classic theo ĐOẠN của Webamp gốc (xem
       clampWinSize: rộng 275+25*wSeg, cao 116+29*hSeg); lưu trong
       winSizes khóa "classic|playlist" (cùng kho localStorage
       amp9-winsize-v9 với Modern, khôi phục qua restoreWinSizes). */
    function classicPlSize() {
      var ov = winSizes[winSizeKey("classic", "playlist")];
      if (ov) { var c = clampWinSize("classic", "playlist", ov.w, ov.h); if (c) return c; }
      return { w: CLASSIC_PL_W, h: CLASSIC_PL_H };
    }
    /* Cỡ đã vẽ live trong lần kéo hiện tại (để classicPlLiveResize bỏ
       qua khi cỡ lượng tử hoá không đổi — chỉ vẽ lại mỗi lần qua mốc
       đoạn 25×29, như Winamp thật nhảy theo đoạn). */
    var classicPlLiveSize = null;
    /* Vẽ lại nội dung playlist Classic ở cỡ mới TRONG LÚC KÉO (gọi từ
       resizeMove qua onLiveSize): gỡ hết con của win TRỪ tay nắm đang
       kéo (tay nắm là con trực tiếp của win, không nằm trong nội dung),
       vẽ lại nội dung ở cỡ mới, giữ vị trí cuộn của danh sách. Không
       chạm tới stage hay cửa sổ khác (EQ dưới playlist chỉ dời lúc thả
       tay qua requestRerender, như bên Modern). */
    function rebuildClassicPlaylistContent(w, h) {
      var rec = classicPlRec;
      if (!rec || !rec.win) return;
      var win = rec.win;
      var st = 0;
      try { st = classicPlListDiv ? (classicPlListDiv.scrollTop || 0) : 0; } catch (e) { st = 0; }
      var kids = win.children ? Array.prototype.slice.call(win.children) : [];
      for (var i = 0; i < kids.length; i++) {
        if (kids[i].dataset && kids[i].dataset.resizeEdge) continue;
        if (kids[i].parentElement === win) win.removeChild(kids[i]);
      }
      buildClassicPlaylistContent(win, w, h);
      try { if (classicPlListDiv) classicPlListDiv.scrollTop = st; } catch (e) { /* bỏ qua */ }
    }
    function classicPlLiveResize(w, h) {
      if (classicPlLiveSize && classicPlLiveSize[0] === w && classicPlLiveSize[1] === h) return;
      classicPlLiveSize = [w, h];
      rebuildClassicPlaylistContent(w, h);
    }
    /* Nội dung cửa sổ Playlist Classic ở cỡ W×H (top bar 20 + giữa
       H-58 + đáy 38; danh sách 12..W-20 × 20..H-38). Tách riêng để vẽ
       lại live trong lúc kéo (rebuildClassicPlaylistContent) lẫn vẽ
       mới (renderClassicPlaylistWindow). */
    function buildClassicPlaylistContent(win, W, H) {
      var rec = { win: win, w: W, h: H, buttons: {} };
      var st = classicPlStyle();
      /* --- top bar 20px: góc trái + 2 dải tile + title 100px + góc phải
         (fork: spacer chỉ khi rộng chẵn; 275 lẻ nên không có spacer). --- */
      var fillW = Math.floor((W - 25 - 100 - 25) / 2); /* 62 */
      function topPart(name, x, w) {
        var d = classicSpriteDiv("PLEDIT", name);
        if (!d) return null;
        d.style.left = x + "px"; d.style.top = "0px";
        d.style.width = w + "px";
        setAbs(d, win, x, 0);
        win.appendChild(d);
        return d;
      }
      /* v10.5 — lát tile ĐÚNG: mỗi ô là 1 div cắt đúng sprite tile
         (không repeat-x/repeat-y trên cả sheet). Trước đây fill dùng
         backgroundRepeat trên ảnh sheet nguyên (280×186) nên 1 ô 62px
         hiện cả TOP_TILE (127..152) + TOP_RIGHT_CORNER (153..178) +
         12px nền vis — góc phải (2 icon nhỏ như nút thu/đóng) lọt vào
         2 lần, trông như title bar có 2 bộ nút thừa (ảnh 03:23).
         Fork không mắc vì mỗi sprite là 1 ảnh cắt riêng, repeat chỉ
         lặp đúng tile. Ô cuối cắt ngắn theo phần còn lại của vùng. */
      function tileSprite(name, x, y, w, h) {
        var lib0 = classicLib();
        var rect = lib0 ? lib0.spriteRect("PLEDIT", name) : null;
        if (!rect) return;
        for (var ty = y; ty < y + h; ty += rect.height) {
          for (var tx = x; tx < x + w; tx += rect.width) {
            var d = classicSpriteDiv("PLEDIT", name);
            if (!d) return;
            d.style.left = tx + "px"; d.style.top = ty + "px";
            d.style.width = Math.min(rect.width, x + w - tx) + "px";
            d.style.height = Math.min(rect.height, y + h - ty) + "px";
            setAbs(d, win, tx, ty);
            win.appendChild(d);
          }
        }
      }
      topPart("PLAYLIST_TOP_LEFT_SELECTED", 0, 25);
      tileSprite("PLAYLIST_TOP_TILE_SELECTED", 25, 0, fillW, 20);
      topPart("PLAYLIST_TITLE_BAR_SELECTED", 25 + fillW, 100);
      tileSprite("PLAYLIST_TOP_TILE_SELECTED", 25 + fillW + 100, 0, W - 25 - fillW - 100 - 25, 20);
      /* v10.5 — tên sprite đúng: trước đây "PLAYLIST_TOP_RIGHT_SELECTED"
         không có trong bảng (spriteRect -> null) nên góc phải 25px
         không có nền, 2 nút shade/close nổi trên nền đen. */
      topPart("PLAYLIST_TOP_RIGHT_CORNER_SELECTED", W - 25, 25);
      var titleZone = document.createElement("div");
      titleZone.dataset.classicTitle = "1";
      titleZone.style.position = "absolute";
      titleZone.style.left = "0px"; titleZone.style.top = "0px";
      titleZone.style.width = W + "px"; titleZone.style.height = "20px";
      setAbs(titleZone, win, 0, 0);
      win.appendChild(titleZone);
      titleZone.ondblclick = function () { classicPlShade = true; if (requestRerender) requestRerender(); };
      rec.buttons.collapse = classicButton(win, { x: W - 21, y: 3, w: 9, h: 9 }, "PLEDIT", {
        id: "playlist-shade", sprite: "PLAYLIST_COLLAPSE_SELECTED",
        title: "Thu gọn playlist", onClick: function () { classicPlShade = true; if (requestRerender) requestRerender(); }
      });
      rec.buttons.close = classicButton(win, { x: W - 11, y: 3, w: 9, h: 9 }, "PLEDIT", {
        id: "playlist-close", sprite: "PLAYLIST_CLOSE_SELECTED",
        title: "Đóng playlist", onClick: function () { classicTogglePlaylist(); }
      });
      /* --- giữa (y=20, cao H-58): tile trái/phải + danh sách ---
         v10.5: lát tile bằng tileSprite (như fill trên) — trước đây
         repeat-y trên cả sheet nên nửa dưới mỗi tile lôi theo mẩu
         góc đáy (PLAYLIST_BOTTOM_LEFT_CORNER) vào mép danh sách.
         v10.23: cao giữa = H-58 (luôn bội số 29 theo đoạn) nên tile
         29px lát vừa khít, không cắt lẻ. */
      tileSprite("PLAYLIST_LEFT_TILE", 0, 20, 12, H - 58);
      tileSprite("PLAYLIST_RIGHT_TILE", W - 20, 20, 20, H - 58);
      var list = document.createElement("div");
      list.className = "pl-list";
      list.dataset.classicPlList = "1";
      list.style.position = "absolute";
      list.style.left = "12px"; list.style.top = "20px";
      list.style.width = (W - 32) + "px"; list.style.height = (H - 58) + "px";
      list.style.overflowY = "auto"; list.style.overflowX = "hidden";
      list.style.background = st.normalbg; list.style.color = st.normal;
      list.style.fontSize = "9px";
      list.style.fontFamily = (st.font || "Arial") + ", Arial, sans-serif";
      setAbs(list, win, 12, 20);
      win.appendChild(list);
      classicPlListDiv = list;
      buildClassicPlRows(list);
      /* --- đáy 38px (y=H-38): góc trái/phải + giờ chạy + 5 nút menu ---
         v10.23: góc trái 125 + góc phải 150 = 275 (đúng cỡ mặc định);
         cửa sổ rộng hơn thì khoảng giữa (125..W-150) lát thêm
         PLAYLIST_BOTTOM_TILE (nền của cả đáy playlist theo fork:
         skinSelectors PLAYLIST_BOTTOM_TILE -> ".playlist-bottom"). */
      tileSprite("PLAYLIST_BOTTOM_TILE", 125, H - 38, W - 275, 38);
      var bl = classicSpriteDiv("PLEDIT", "PLAYLIST_BOTTOM_LEFT_CORNER");
      if (bl) { bl.style.left = "0px"; bl.style.top = (H - 38) + "px"; setAbs(bl, win, 0, H - 38); win.appendChild(bl); }
      var br = classicSpriteDiv("PLEDIT", "PLAYLIST_BOTTOM_RIGHT_CORNER");
      if (br) { br.style.left = (W - 150) + "px"; br.style.top = (H - 38) + "px"; setAbs(br, win, W - 150, H - 38); win.appendChild(br); }
      var timeDiv = document.createElement("div");
      timeDiv.dataset.classicPlTime = "1";
      timeDiv.style.position = "absolute";
      /* v10.5 — giờ chạy ở đáy-PHẢI, không phải đáy-trái: fork đặt
         .playlist-running-time-display (top:10, left:7) BÊN TRONG
         .playlist-bottom-right (x=125..275) -> cửa sổ (132,88), trên
         nền hộp vis đen. Trước đây đặt (7,88) nên chữ "0:00" + dải 18
         ô nền font đè lên nút ADD/REM/SEL (ảnh 03:23: chữ nhòe, nút
         bị cắt). Giữ đệm 18 ký tự như fork (rightPad 18). */
      timeDiv.style.left = "132px"; timeDiv.style.top = (H - 28) + "px";
      timeDiv.style.width = "90px"; timeDiv.style.height = "10px";
      timeDiv.style.overflow = "hidden";
      setAbs(timeDiv, win, 132, H - 28);
      win.appendChild(timeDiv);
      classicPlTimeDiv = timeDiv;
      refreshClassicPlTime();
      /* Nút menu đáy: icon đã vẽ sẵn trong ảnh góc đáy, chỉ cần vùng
         bấm trong suốt (vị trí theo fork css: bottom:12 → top=H-38+8).
         v10.23: y theo H (H-30); x không đổi (nút nằm trong góc trái
         125px, trừ nút List ở góc phải). */
      classicHotZone(win, { x: 14, y: H - 30, w: 22, h: 18 }, "pl-add", "Thêm (nguồn mặc định / nhạc local / URL)", function (ev) { showPlaylistMenu(this, addMenuItems(this)); });
      classicHotZone(win, { x: 43, y: H - 30, w: 22, h: 18 }, "pl-remove", "Xóa mục", function () {
        showPlaylistMenu(this, removeMenuItems());
      });
      classicHotZone(win, { x: 72, y: H - 30, w: 22, h: 18 }, "pl-select", "Chọn", function () { showPlaylistMenu(this, selectMenuItems()); });
      classicHotZone(win, { x: 101, y: H - 30, w: 22, h: 18 }, "pl-misc", "Tùy chọn", function () { showPlaylistMenu(this, miscMenuItems()); });
      classicHotZone(win, { x: 231, y: H - 30, w: 22, h: 18 }, "pl-list", "Danh sách (lưu playlist)", function () { showPlaylistMenu(this, manageMenuItems(this)); });
      /* Nút cuộn lên/xuống (fork: right:7, top:2/8 trong đáy-phải):
         mũi tên đã vẽ sẵn trong ảnh góc đáy-phải, chỉ cần vùng bấm.
         v10.23: x = W-15 (cách mép phải 7px + rộng 8px), y theo H. */
      classicHotZone(win, { x: W - 15, y: H - 36, w: 8, h: 5 }, "pl-scroll-up", "Cuộn lên 4 bài", function () { pendingScrollRestore = null; /* v10.19 (1): cuộn tay thì hủy lưới khôi muộn */ if (classicPlListDiv) { try { classicPlListDiv.scrollTop = Math.max(0, (classicPlListDiv.scrollTop || 0) - 52); } catch (e) { /* bỏ qua */ } } });
      classicHotZone(win, { x: W - 15, y: H - 30, w: 8, h: 5 }, "pl-scroll-down", "Cuộn xuống 4 bài", function () { pendingScrollRestore = null; /* v10.19 (1): cuộn tay thì hủy lưới khôi muộn */ if (classicPlListDiv) { try { classicPlListDiv.scrollTop = (classicPlListDiv.scrollTop || 0) + 52; } catch (e) { /* bỏ qua */ } } });
      classicPlRec = rec;
      classicPlLiveSize = [W, H];
    }
    /* Vẽ cửa sổ Playlist Classic (275×116 mặc định, kéo được theo đoạn
       25×29 như Webamp gốc) tại topY trong T. Trả chiều cao H. */
    async function renderClassicPlaylistWindow(T, topY) {
      var sz = classicPlSize();
      var W = sz.w, H = sz.h;
      var win = document.createElement("div");
      win.style.position = "absolute";
      win.style.left = "0px"; win.style.top = topY + "px";
      win.style.width = W + "px"; win.style.height = H + "px";
      win.dataset.classicWindow = "playlist";
      win._absX = T._absX || 0; win._absY = (T._absY || 0) + topY;
      T.appendChild(win);
      buildClassicPlaylistContent(win, W, H);
      /* v10.23 — 3 tay nắm (mép phải / mép đáy / góc dưới-phải) như
         Modern; gờ góc trong suốt (ảnh chéo của chính skin ở góc đáy-
         phải pledit.bmp, đã kiểm bằng mắt ở cả 2 skin); kéo thì khung
         đổi cỡ live theo đoạn + vẽ lại nội dung mỗi lần qua mốc đoạn. */
      attachResizeHandles(win, "classic", "playlist", {
        transparentCorner: true,
        onLiveSize: function (w, h) { classicPlLiveResize(w, h); }
      });
      return H;
    }
    /* Playlist shade 275×14: tên bài + giờ (chữ TEXT.bmp) + nút mở lại.
       (Rộng shade giữ 275 — Webamp gốc có kéo rộng shade (widthOnly)
       nhưng nền shade của Amp lát bằng 2 sprite co giãn theo W, chưa
       kiểm chứng ở W khác 275 nên v10.23 không đổi; playlist thu gọn
       về 275 là hành vi chấp nhận được, ghi nợ cho bản sau.) */
    async function renderClassicPlaylistShadeWindow(T, topY) {
      var W = 275, H = 14;
      var win = document.createElement("div");
      win.style.position = "absolute";
      win.style.left = "0px"; win.style.top = topY + "px";
      win.style.width = W + "px"; win.style.height = H + "px";
      win.dataset.classicWindow = "playlist-shade";
      win._absX = T._absX || 0; win._absY = (T._absY || 0) + topY;
      T.appendChild(win);
      var left = classicSpriteDiv("PLEDIT", "PLAYLIST_SHADE_BACKGROUND_LEFT");
      if (left) { left.style.left = "0px"; left.style.top = "0px"; left.style.width = W + "px"; setAbs(left, win, 0, 0); win.appendChild(left); }
      var right = classicSpriteDiv("PLEDIT", "PLAYLIST_SHADE_BACKGROUND_RIGHT_SELECTED");
      if (right) { right.style.left = "0px"; right.style.top = "0px"; right.style.width = W + "px"; right.style.backgroundPosition = "right 0px"; setAbs(right, win, 0, 0); win.appendChild(right); }
      var title = document.createElement("div");
      title.style.position = "absolute";
      title.style.left = "5px"; title.style.top = "4px";
      title.style.height = "6px"; title.style.overflow = "hidden";
      setAbs(title, win, 5, 4);
      win.appendChild(title);
      var cur = playlistState.items[playlistState.current];
      var name = cur ? stripDiacritics(cur.name || "") : "[No file]";
      if (name.length > 41) name = name.slice(0, 40) + "…";
      title.appendChild(classicTextRow(name));
      var time = document.createElement("div");
      time.style.position = "absolute";
      time.style.right = "30px"; time.style.top = "4px";
      time.style.height = "6px"; time.style.overflow = "hidden";
      setAbs(time, win, W - 30 - 40, 4);
      win.appendChild(time);
      time.appendChild(classicTextRow(classicPlTimeText()));
      var titleZone = document.createElement("div");
      titleZone.dataset.classicTitle = "1";
      titleZone.style.position = "absolute";
      titleZone.style.left = "0px"; titleZone.style.top = "0px";
      titleZone.style.width = W + "px"; titleZone.style.height = H + "px";
      setAbs(titleZone, win, 0, 0);
      win.appendChild(titleZone);
      titleZone.ondblclick = function () { classicPlShade = false; if (requestRerender) requestRerender(); };
      classicButton(win, { x: 254, y: 3, w: 9, h: 9 }, "PLEDIT", {
        id: "playlist-expand", sprite: "PLAYLIST_EXPAND_SELECTED",
        title: "Mở lại playlist đầy đủ", onClick: function () { classicPlShade = false; if (requestRerender) requestRerender(); }
      });
      return H;
    }
    /* Đồ thị EQ Classic (canvas 113×19 trên nền EQ_GRAPH_BACKGROUND):
       đường cong qua 11 điểm (preamp + 10 dải), y = (1-frac)*18. Fork vẽ
       bằng màu từng hàng của EQ_GRAPH_LINE_COLORS; Amp vẽ 1 nét trắng
       (đơn giản, đọc được — ghi README). Có guard sig để không vẽ lại
       mỗi lần refreshClassicMain (nó chạy theo từng timeupdate). */
    function drawClassicEqGraph() {
      if (!classicEqGraphCv) return;
      var sig = EQ_BAND_IDS.map(function (id) {
        var v = drawerState.eqBands[id];
        return (v == null ? 0.5 : v).toFixed(3);
      }).join(",");
      if (sig === classicEqGraphSig) return;
      classicEqGraphSig = sig;
      var cv = classicEqGraphCv, ctx = null;
      try { ctx = cv.getContext("2d"); } catch (e) { ctx = null; }
      if (!ctx) return;
      try {
        ctx.clearRect(0, 0, cv.width, cv.height);
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 1; ctx.beginPath();
        for (var i = 0; i < EQ_BAND_IDS.length; i++) {
          var f = drawerState.eqBands[EQ_BAND_IDS[i]];
          if (f == null) f = 0.5;
          var x = 4 + i * 10.5, y = (1 - f) * 18;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      } catch (e) { /* canvas test không vẽ được */ }
    }
    function setAllClassicEqBands(frac) {
      /* Ủy thác cho setAllEqBands đã có (đặt drawerState + sliderRecords;
         onSet của dải Classic tự nối engine + vẽ lại đồ thị). */
      setAllEqBands(frac * 24 - 12);
      drawClassicEqGraph();
    }
    /* Vẽ cửa sổ EQ Classic (275×116) tại topY trong T. Trả 116. */
    async function renderClassicEqWindow(T, topY) {
      var W = CLASSIC_EQ_W, H = CLASSIC_EQ_H;
      var win = document.createElement("div");
      win.style.position = "absolute";
      win.style.left = "0px"; win.style.top = topY + "px";
      win.style.width = W + "px"; win.style.height = H + "px";
      win.dataset.classicWindow = "equalizer";
      win._absX = T._absX || 0; win._absY = (T._absY || 0) + topY;
      T.appendChild(win);
      var rec = { win: win, w: W, h: H, buttons: {}, bandRecs: [] };
      var bg = classicSpriteDiv("EQMAIN", "EQ_WINDOW_BACKGROUND");
      if (bg) { bg.style.left = "0px"; bg.style.top = "0px"; setAbs(bg, win, 0, 0); win.appendChild(bg); }
      var tb = classicSpriteDiv("EQMAIN", "EQ_TITLE_BAR_SELECTED");
      if (tb) { tb.style.left = "0px"; tb.style.top = "0px"; setAbs(tb, win, 0, 0); win.appendChild(tb); }
      var titleZone = document.createElement("div");
      titleZone.dataset.classicTitle = "1";
      titleZone.style.position = "absolute";
      titleZone.style.left = "0px"; titleZone.style.top = "0px";
      titleZone.style.width = W + "px"; titleZone.style.height = "14px";
      setAbs(titleZone, win, 0, 0);
      win.appendChild(titleZone);
      titleZone.ondblclick = function () { classicEqShade = true; if (requestRerender) requestRerender(); };
      /* Nút thu gọn: icon đã vẽ sẵn trong titlebar (fork không có sprite
         riêng cho trạng thái nghỉ — chỉ có sprite lúc bấm), nên chỉ cần
         vùng bấm trong suốt ở (254,3). */
      classicHotZone(win, { x: 254, y: 3, w: 9, h: 9 }, "eq-shade", "Thu gọn EQ", function () { classicEqShade = true; if (requestRerender) requestRerender(); });
      rec.buttons.close = classicButton(win, { x: 264, y: 3, w: 9, h: 9 }, "EQMAIN", {
        id: "eq-close", sprite: "EQ_CLOSE_BUTTON", activeSprite: "EQ_CLOSE_BUTTON_ACTIVE",
        title: "Đóng EQ", onClick: function () { setClassicEqOpen(false); }
      });
      rec.buttons.on = classicButton(win, { x: 14, y: 18, w: 26, h: 12 }, "EQMAIN", {
        id: "eq-on", sprite: "EQ_ON_BUTTON", selectedSprite: "EQ_ON_BUTTON_SELECTED",
        activeSprite: "EQ_ON_BUTTON_DEPRESSED", activeSelectedSprite: "EQ_ON_BUTTON_SELECTED_DEPRESSED",
        title: "Bật/tắt Equalizer",
        isSelected: function () { return !!drawerState.eqOn; },
        onClick: function () { toggleCfg("EQ_TOGGLE"); refreshClassicMain(); }
      });
      rec.buttons.auto = classicButton(win, { x: 40, y: 18, w: 32, h: 12 }, "EQMAIN", {
        id: "eq-auto", sprite: "EQ_AUTO_BUTTON", selectedSprite: "EQ_AUTO_BUTTON_SELECTED",
        activeSprite: "EQ_AUTO_BUTTON_DEPRESSED", activeSelectedSprite: "EQ_AUTO_BUTTON_SELECTED_DEPRESSED",
        title: "Tự động (không hoạt động — đã chốt không làm)",
        isSelected: function () { return !!drawerState.eqAuto; },
        onClick: function () { /* Auto không hoạt động theo chốt của Hải — chỉ đổi sprite lúc bấm */ }
      });
      rec.buttons.presets = classicButton(win, { x: 217, y: 18, w: 44, h: 12 }, "EQMAIN", {
        id: "eq-presets", sprite: "EQ_PRESETS_BUTTON", selectedSprite: "EQ_PRESETS_BUTTON_SELECTED",
        title: "Preset EQ (17 preset chuẩn Winamp)",
        onClick: function (div) { showEqPresetsMenu(div); }
      });
      /* Đồ thị EQ: nền sprite + canvas vẽ đường cong. */
      var graphBg = classicSpriteDiv("EQMAIN", "EQ_GRAPH_BACKGROUND");
      if (graphBg) { graphBg.style.left = "86px"; graphBg.style.top = "17px"; setAbs(graphBg, win, 86, 17); win.appendChild(graphBg); }
      var graphCv = document.createElement("canvas");
      graphCv.width = 113; graphCv.height = 19;
      graphCv.style.position = "absolute";
      graphCv.style.left = "86px"; graphCv.style.top = "17px";
      graphCv.style.width = "113px"; graphCv.style.height = "19px";
      setAbs(graphCv, win, 86, 17);
      win.appendChild(graphCv);
      classicEqGraphCv = graphCv;
      classicEqGraphSig = "";
      /* 11 dải dọc: preamp x=21, 10 dải x=78..240 (bước 18), y=38, cao 63.
         Nền mỗi dải = 1 cell 15×65 của EQ_SLIDER_BACKGROUND (fork Band.tsx:
         spriteNumber = round(frac*27); x = (n%14)*15; y = floor(n/14)*65). */
      var bandXs = [21, 78, 96, 114, 132, 150, 168, 186, 204, 222, 240];
      for (var bi = 0; bi < EQ_BAND_IDS.length; bi++) {
        (function (idx) {
          var id = EQ_BAND_IDS[idx];
          var label = id === "preamp" ? "Preamp" : ("Dải " + id);
          var bandRec = classicSlider(win, { x: bandXs[idx], y: 38, w: 14, h: 63 }, "EQMAIN", {
            id: id, action: "EQ_BAND", title: label,
            thumbSprite: "EQ_SLIDER_THUMB", thumbActiveSprite: "EQ_SLIDER_THUMB_SELECTED",
            thumbW: 11, thumbH: 11, thumbY: 0,
            vertical: true, travelH: 51,
            frac0: (drawerState.eqBands[id] == null ? 0.5 : drawerState.eqBands[id]),
            trackPosition: function (frac) {
              var n = Math.round(Math.max(0, Math.min(1, frac)) * 27);
              var cx = n % 14, cy = Math.floor(n / 14);
              return (-(13 + cx * 15)) + "px " + (-(164 + cy * 65)) + "px";
            },
            onSet: function (frac) {
              drawerState.eqBands[id] = frac;
              if (audioEngine) { try { audioEngine.setEqBand(idx, frac); } catch (e) { /* bỏ qua */ } }
              persistPlayback();
              drawClassicEqGraph();
            }
          });
          rec.bandRecs.push(bandRec);
        })(bi);
      }
      drawClassicEqGraph();
      /* Vùng +12dB / 0dB / -12dB: bấm đặt TẤT CẢ dải về max/giữa/min. */
      classicHotZone(win, { x: 45, y: 36, w: 22, h: 8 }, "eq-max", "Tất cả +12dB", function () { setAllClassicEqBands(1); });
      classicHotZone(win, { x: 45, y: 64, w: 22, h: 8 }, "eq-mid", "Tất cả 0dB", function () { setAllClassicEqBands(0.5); });
      classicHotZone(win, { x: 45, y: 95, w: 22, h: 8 }, "eq-min", "Tất cả -12dB", function () { setAllClassicEqBands(0); });
      classicEqRec = rec;
      return H;
    }
    /* EQ shade 275×14 (EQ_EX): nền + volume/balance mini + nút mở lại/đóng. */
    async function renderClassicEqShadeWindow(T, topY) {
      var W = 275, H = 14;
      var win = document.createElement("div");
      win.style.position = "absolute";
      win.style.left = "0px"; win.style.top = topY + "px";
      win.style.width = W + "px"; win.style.height = H + "px";
      win.dataset.classicWindow = "equalizer-shade";
      win._absX = T._absX || 0; win._absY = (T._absY || 0) + topY;
      T.appendChild(win);
      var bg = classicSpriteDiv("EQ_EX", "EQ_SHADE_BACKGROUND_SELECTED");
      if (bg) { bg.style.left = "0px"; bg.style.top = "0px"; setAbs(bg, win, 0, 0); win.appendChild(bg); }
      var titleZone = document.createElement("div");
      titleZone.dataset.classicTitle = "1";
      titleZone.style.position = "absolute";
      titleZone.style.left = "0px"; titleZone.style.top = "0px";
      titleZone.style.width = W + "px"; titleZone.style.height = H + "px";
      setAbs(titleZone, win, 0, 0);
      win.appendChild(titleZone);
      titleZone.ondblclick = function () { classicEqShade = false; if (requestRerender) requestRerender(); };
      /* Volume/balance mini: rãnh đã vẽ sẵn trong nền shade nên track
         trong suốt (noTrackBg); thumb 3×7 đổi sprite trái/giữa/phải theo
         vị trí như fork EqualizerShade segment(). */
      classicSlider(win, { x: 61, y: 4, w: 97, h: 6 }, "EQ_EX", {
        id: "eqshade-volume", action: "VOLUME", title: "Âm lượng",
        thumbSprite: function (frac) {
          if (frac <= 1 / 3) return "EQ_SHADE_VOLUME_SLIDER_LEFT";
          if (frac >= 2 / 3) return "EQ_SHADE_VOLUME_SLIDER_RIGHT";
          return "EQ_SHADE_VOLUME_SLIDER_CENTER";
        },
        thumbW: 3, thumbH: 7, thumbY: 0, frac0: demo.volume, travelW: 94,
        noTrackBg: true,
        onSet: function (frac) { demo.volume = frac; updateVolumebar(); applyEngineVolume(); persistPlayback(); }
      });
      classicSlider(win, { x: 164, y: 4, w: 43, h: 6 }, "EQ_EX", {
        id: "eqshade-balance", action: "PAN", title: "Cân bằng trái/phải",
        thumbSprite: function (frac) {
          if (frac <= 1 / 3) return "EQ_SHADE_BALANCE_SLIDER_LEFT";
          if (frac >= 2 / 3) return "EQ_SHADE_BALANCE_SLIDER_RIGHT";
          return "EQ_SHADE_BALANCE_SLIDER_CENTER";
        },
        thumbW: 3, thumbH: 7, thumbY: 0, frac0: drawerState.balance, travelW: 40,
        noTrackBg: true,
        onSet: function (frac) { applyBalance(frac); }
      });
      classicButton(win, { x: 254, y: 3, w: 9, h: 9 }, "EQ_EX", {
        id: "eq-expand", sprite: "EQ_MAXIMIZE_BUTTON_ACTIVE",
        title: "Mở lại EQ đầy đủ", onClick: function () { classicEqShade = false; if (requestRerender) requestRerender(); }
      });
      classicButton(win, { x: 264, y: 3, w: 9, h: 9 }, "EQ_EX", {
        id: "eq-close", sprite: "EQ_SHADE_CLOSE_BUTTON", activeSprite: "EQ_SHADE_CLOSE_BUTTON_ACTIVE",
        title: "Đóng EQ", onClick: function () { setClassicEqOpen(false); }
      });
      return H;
    }
    function setClassicEqOpen(open) {
      classicEqOpen = !!open;
      if (!classicEqOpen) classicEqShade = false;
      if (requestRerender) requestRerender();
      return classicEqOpen;
    }
    function isClassicEqOpen() { return classicEqOpen; }
    function isClassicEqShade() { return classicEqShade; }
    function isClassicPlShade() { return classicPlShade; }

    /* Skin Classic: vẽ cửa sổ chính (hoặc shade) + cửa sổ AVS rời (nếu
       đang tách). Trả về chiều cao stage. Điểm vào duy nhất cho cả
       renderLayoutInner lẫn renderStackedInner. Không có classic.js /
       classic data thì về đường cũ (chỉ cửa sổ rời). */
    async function renderClassicStage(T, shade, opts) {
      opts = opts || {};
      /* Lượt render mới: reset registry như renderLayoutInner (lượt
         stacked không reset sẵn — không reset thì vis/ticker/slider cũ
         dồn lại). */
      visCanvases = []; statusEls = []; tickerEls = []; timerEls = [];
      progressEls = []; volumebarEls = []; infoEls = []; sliderRecords = [];
      animLayerRecs = [];
      channelsRec = null;
      classicMainRec = null; classicShadeRec = null;
      classicPlRec = null; classicEqRec = null;
      classicPlListDiv = null; classicPlTimeDiv = null; classicEqGraphCv = null;
      T.innerHTML = "";
      var lib = classicLib(), C = classicData();
      var totalH = 0;
      if (lib && C) {
        if (shade) await renderClassicShadeWindow(T);
        else await renderClassicMainWindow(T);
        totalH = shade ? lib.CLASSIC_SHADE.h : lib.CLASSIC_MAIN.h;
        T.style.width = (shade ? lib.CLASSIC_SHADE.w : lib.CLASSIC_MAIN.w) + "px";
        /* v10.3 — xếp cửa sổ Playlist + EQ Classic dưới cửa sổ chính
           (playlistOpen lấy từ opts của renderStacked, hoặc isPlaylistOpen
           khi đi đường renderLayout đơn). */
        var plOpen = (opts && opts.playlistOpen !== undefined) ? !!opts.playlistOpen
          : (function () { try { return !!(isPlaylistOpen && isPlaylistOpen()); } catch (e) { return false; } })();
        if (plOpen) {
          totalH += classicPlShade ? await renderClassicPlaylistShadeWindow(T, totalH)
            : await renderClassicPlaylistWindow(T, totalH);
          /* v10.23 — playlist Classic (khong shade) keo rong hon main
             (275): mo rong stage theo be rong that cua playlist, nhu cua
             so roi (v10.7). Khong thi renderCurrent dat lai stage = 275,
             Fit tinh theo 275 (1.31x tren man 360), playlist tran khoi
             viewport, tay nam goc ra ngoai man hinh nen khong keo thu
             nho lai duoc. Chi khi khong shade (cua so shade co dinh
             275, khong keo duoc). */
          if (!classicPlShade) {
            var plW23 = classicPlSize().w;
            var curW23 = parseInt(T.style.width || "0", 10) || 0;
            if (plW23 > curW23) T.style.width = plW23 + "px";
          }
        }
        if (classicEqOpen) {
          totalH += classicEqShade ? await renderClassicEqShadeWindow(T, totalH)
            : await renderClassicEqWindow(T, totalH);
        }
      } else {
        var sz0 = (avsState.open && avsState.detached) ? detachedWinSize(avsState.mode) : { w: detachedDefaultWidth(), h: 0 };
        T.style.width = sz0.w + "px";
      }
      if (!opts.noDetached && avsState.open && avsState.detached) {
        totalH += await appendDetachedWindow(T, totalH);
        /* v10.7 (cua so Video roi bi cat mep phai tren dien thoai that,
           anh 04/11 07:19): cua so roi rong 354 trong khi stage Classic
           chi rong 275 (main) — stage khong rong theo thi zoom-fit tinh
           theo 275, phong to 1.31x, cua so video tran khoi viewport
           (hien 463px CSS tren man 360). Mo rong stage theo be rong
           that cua cua so roi (v10.8: mac dinh = rong main, keo tay /
           phong to thi theo size do). */
        var detWC = detachedWinSize(avsState.mode).w;
        var curWC = parseInt(T.style.width || "0", 10) || 0;
        if (detWC > curWC) T.style.width = detWC + "px";
      }
      T.style.height = totalH + "px";
      refreshClassicMain();
      drawVisStatic();
      syncAvsAnim(); /* Đợt B (9.9): vòng vis chạy khi AVS mở HOẶC đang phát */
      return totalH;
    }

    /* Vẽ 1 layout. Trả về chiều cao cuối sau trim (và sau shift nếu có). */
    /* Đợt v10.0 (việc 2: display/vis/beat — quy tắc XML, ghi đè đợt D):
       Gỡ nhóm beat khi nội dung của nó tràn khỏi layout đang vẽ. Nhóm
       có visible="0" trong XML; MAKI gốc chỉ hiện nó khi cửa sổ kéo đủ
       rộng ("stretch the main window until the Beat Analyzer appears").
       Độ rộng nội dung KHÔNG lấy từ groupSize() (trả parentW khi
       groupdef không có w) mà đo mép phải thật của các lớp con đã vẽ
       (_absX + style.width, cùng cách dumpGeometry đo): ở 354 thì
       beatright + 2 overlay tới 372 > 354 → gỡ cả nhóm (hết dải sọc đè
       nút Repeat tới chữ "R"); kéo rộng ≥372 thì giữ nguyên. Không gán
       cứng 372/354; nhóm khác không bị ảnh hưởng; vạch vis (<vis>) nằm
       ngoài nhóm này nên vẫn hiện. animLayerRecs của beat vẫn giữ (chỉ
       là trạng thái khung filmstrip), chỉ div bị gỡ khỏi DOM. */
    function pruneBeatGroupIfOverflows(T, layoutW) {
      if (!T || typeof layoutW !== "number" || !T.querySelector) return;
      var g = null;
      try { g = T.querySelector('[data-gid="player.normal.display.beatvisualization"]'); } catch (e) { g = null; }
      if (!g) return;
      var baseX = (typeof T._absX === "number") ? T._absX : 0;
      var maxR = 0;
      /* Chỉ đo các phần tử CON: hộp div của chính nhóm rộng bằng parentW
         (groupSize trả parentW khi groupdef không có w) — không phải
         nội dung thật, phải loại khỏi phép đo. */
      var stack = [];
      var gkids = g.children || [];
      for (var k0 = 0; k0 < gkids.length; k0++) stack.push(gkids[k0]);
      while (stack.length) {
        var el = stack.pop();
        var w = parseInt((el.style && el.style.width) || "0", 10) || 0;
        var ax = (typeof el._absX === "number") ? el._absX : 0;
        if (ax + w > maxR) maxR = ax + w;
        var kids = el.children || [];
        for (var i = 0; i < kids.length; i++) stack.push(kids[i]);
      }
      if (maxR - baseX > layoutW) {
        if (g.parentElement) g.parentElement.removeChild(g);
      }
    }

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
        /* Đợt 4: park thẻ video TRƯỚC khi xóa live — không thì
           live.innerHTML = "" gỡ thẻ đang phát khỏi document. */
        try {
          if (avsMedia && live.contains && live.contains(avsMedia.wrap)) parkAvsMedia();
        } catch (e) { /* bỏ qua */ }
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
        /* Đợt v10.1 — skin Classic không có layout nào: vẽ cửa sổ chính
           Classic từ BMP (renderClassicStage) thay vì chỉ cửa sổ rời. */
        if (RES.kind === "classic" && lowerStr(container) === "main") {
          lastLayout = null; lastTitle = titleText || "";
          var ch = await renderClassicStage(T, layoutId === "shade", opts);
          swapIn();
          return ch;
        }
        lastStage = live;
        /* v10.12 (P2 G): skin ClassicPro (cPro) — giao diện nằm trong engine
           ClassicPro ngoài file .wal nên không có layout nào trong skin;
           ghi rõ lý do vào lỗi (index.html giữ skin cũ như trước). */
        var unsupMsg = (RES.report && RES.report.classicPro)
          ? "Skin này dùng ClassicPro — giao diện nằm trong engine ClassicPro (Plugins/classicPro/engine) ngoài file .wal, Amp không vẽ được (cần engine ClassicPro)."
          : "Không tìm được layout '" + layoutId + "' của '" + container + "'. Skin này không có cửa sổ chính dùng được — đã thử layout khác trong cùng container và container khác (không vẽ layout lạ).";
        var unsup = new Error(unsupMsg);
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
      /* sizeOverride: co che chung de ep kich thuoc cua so khi can
         (hien ML khong dung nua — v10.4 tra ML ve kich thuoc rieng). */
      if (opts && opts.sizeOverride) {
        var cOv2 = clampWinSize(container, layoutId, opts.sizeOverride.w, opts.sizeOverride.h);
        if (cOv2) { LW = cOv2.w; LH = cOv2.h; }
      }
      T.style.width = LW + "px"; T.style.height = LH + "px";
      /* renderStacked truyền playerDiv/plDiv đã đặt _absY (plDiv = playerH):
         GIỮ NGUYÊN offset đó, chỉ mặc định 0 khi vẽ trực tiếp lên stage.
         (Gán 0 ở đây từng xóa offset plDiv khiến mọi _absY của playlist
         trong stacked sai — list y=41 thay vì 197.) */
      if (typeof T._absX !== "number") T._absX = 0;
      if (typeof T._absY !== "number") T._absY = 0;
      lastLayout = lay; lastTitle = titleText || "";
      /* v10.12 (P0 A) — nền của layout: thuộc tính background (ưu tiên) /
         alphabackground của <layout>, là id bitmap hoặc đường dẫn file
         trực tiếp (WMP12 player/background.png, CROSSNET player.noalpha,
         EMP main.bg.shadow). Vẽ làm lớp ĐÁY của stage, đúng cỡ ảnh thật
         (khi ảnh nhỏ hơn layout thì neo góc trái-trên như Winamp, không
         kéo giãn); skin 566 không dùng thuộc tính này nên không đổi gì.
         Phải vẽ TRƯỚC renderChildren để mọi phần tử đè lên trên. */
      var layBgRef = lay.background || lay.alphabackground || null;
      if (layBgRef) {
        try {
          var layBgInfo = await bitmapInfoCached(layBgRef);
          if (layBgInfo && layBgInfo.file) {
            /* Cỡ thật của ảnh (khi đo được); không đo được thì bằng layout. */
            var layBgW = (layBgInfo.w > 0 ? layBgInfo.w : LW);
            var layBgH = (layBgInfo.h > 0 ? layBgInfo.h : LH);
            var layBgSpr = await spriteDiv(layBgRef, layBgW, layBgH, {});
            if (layBgSpr) {
              layBgSpr.style.left = "0px"; layBgSpr.style.top = "0px";
              layBgSpr.setAttribute("data-layout-bg", "1");
              /* Nền layout là 1 ảnh duy nhất, không lặp (lặp là việc của
                 <layer tile="1">). Ảnh lớn hơn layout (vd nền shade 566 là
                 texture 222×333 trong cửa sổ 354×25) thì cắt ở mép layout
                 như Winamp — neo góc trái-trên, phần thừa ẩn, không kéo
                 giãn (kéo giãn thì texture shade bị bẹp). */
              layBgSpr.style.backgroundRepeat = "no-repeat";
              if (layBgW > LW || layBgH > LH) {
                layBgSpr.style.width = LW + "px";
                layBgSpr.style.height = LH + "px";
                layBgSpr.style.overflow = "hidden";
              }
              setAbs(layBgSpr, T, 0, 0);
              T.appendChild(layBgSpr);
            }
          }
        } catch (e) { /* nền lỗi thì vẽ tiếp không có nền */ }
      }
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
      /* v10.12 (P1 D): opts.showGroups — ép hiện các nhóm mà XML để
         visible="0" vì MAKI của skin sẽ hiện khi người dùng chọn tab (vd
         các nhóm config.group.N của Copperdeck trong ConfigMain: tab
         "General Settings" chỉ hiện khi chọn, Winamp thật cũng vậy).
         Cơ chế chung như ngăn kéo (dòng drawer.content): không hardcode
         tên nhóm nào — gọi bên ngoài quyết định nhóm nào đang chọn. */
      if (opts && Array.isArray(opts.showGroups)) {
        for (var sgi = 0; sgi < opts.showGroups.length; sgi++) {
          if (opts.showGroups[sgi]) ctx.overrides.set(opts.showGroups[sgi], true);
        }
      }
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
         (MAKI gốc chỉ hiện khi cửa sổ kéo đủ rộng). Amp hiện nhóm khi tùy
         chọn "Enable Beat Visualization" đang bật (xem setBeatVisOn).
         Đợt v10.0 (việc 2 — quy tắc XML, ghi đè đợt D): override chỉ mở
         khóa nhóm; nhóm chỉ VẼ khi vừa trọn trong layout (kiểm vừa trong
         renderGroupInstance). Cửa sổ mặc định 354 → nhóm (mép phải 372)
         không hiện: không còn dải sọc tràn đè nút Repeat tới chữ "R";
         kéo rộng cửa sổ thì nhóm hiện theo đúng XML. Vạch vis (<vis>)
         nằm ngoài nhóm này nên vẫn hiện bình thường (giống Webamp). */
      if (beatVisOn) ctx.overrides.set("player.normal.display.beatvisualization", true);
      await renderChildren(kids, T, LW, LH, ctx, 0, true); /* v9.6 (Điểm 2): cấp layout không gom hideobject — xem renderChildren */
      /* Đợt v10.0 (việc 2): gỡ nhóm beat khi nội dung tràn layout — đo
         mép phải thật của các lớp con đã vẽ (xem pruneBeatGroupIfOverflows
         bên dưới; chạy trước khi main lùi 116 vì shift chỉ đổi _absY). */
      pruneBeatGroupIfOverflows(T, LW);
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
      var fromBottom = avsOpenNow && avsFromBottom();
      if (avsOpenNow && mainDiv) {
        if (fromBottom) {
          /* v10.8 (c) — AVS dưới main: main Ở YÊN (không lùi 116), đẩy
             NHÓM AVS xuống sao cho đỉnh nó chạm đáy main (đẩy đúng
             khoảng = đáy main − đỉnh AVS hiện tại, tính từ hình học thật
             chứ không gán cứng 126 — skin khác main cao khác nhau).
             Ngăn kéo tính theo đáy AVS (xem mainB bên dưới) nên xếp
             main → AVS → ngăn kéo. */
          var avsDiv = null;
          try { avsDiv = T.querySelector('[data-gid="AVSGroup"]'); } catch (e) { avsDiv = null; }
          if (avsDiv) {
            var mainH0 = parseInt(mainDiv.style.height || "0", 10) || 0;
            var avsShift = ((mainDiv._absY || 0) + mainH0) - (avsDiv._absY || 0);
            if (avsShift) {
              avsDiv.style.top = (parseInt(avsDiv.style.top || "0", 10) + avsShift) + "px";
              shiftSubtree(avsDiv, avsShift);
            }
          }
          videoShifted = true;
        } else {
          /* Video/AVS: AVS giữ nguyên vị trí, chỉ đẩy main xuống 116. */
          mainDiv.style.top = (parseInt(mainDiv.style.top || "0", 10) + VIDEO_SHIFT) + "px";
          shiftSubtree(mainDiv, VIDEO_SHIFT);
          videoShifted = true;
        }
      }
      if (drawerOpenOpt !== undefined && mainDiv) {
        var d = null;
        try { d = T.querySelector('[data-gid="player.normal.drawer"]'); } catch (e) { d = null; }
        if (d) {
          var dTop = d._absY || 0;
          var mainB = (mainDiv._absY || 0) + (parseInt(mainDiv.style.height || "0", 10) || 0);
          /* v10.8 (c): from-bottom thì ngăn kéo xếp dưới AVS — đáy tham
             chiếu là đáy AVS (= đáy main + 116), không phải đáy main. */
          if (fromBottom) mainB += VIDEO_SHIFT;
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
          var openingAnim = false;
          if (pendingDrawerStartDy !== null) {
            var pds = pendingDrawerStartDy;
            pendingDrawerStartDy = null;
            /* Chỉ áp transform khi token còn là lần gọi mới nhất: render
               của lần mở cũ đáp xuống sau lần gọi mới hơn thì bỏ transform
               (drawer ở đúng vị trí cuối, không kẹt ở -103px). */
            if (pds.token === drawerAnimToken) {
              setDrawerTransform(d, pds.dy, false);
              setDrawerTransform(sh, pds.dy, false);
              openingAnim = true;
            }
          }
          /* v10.5 — chạm xuyên ngăn kéo: đóng thì tắt chạm mọi control
             trong ngăn kéo (chỉ chừa nút mở); mở thì bật lại. Đang trượt
             MỞ (pendingDrawerStartDy vừa áp) thì giữ tắt cho tới khi
             trượt xong (toggleDrawerAnimated bật lại ở finish) — lúc đó
             ngăn kéo vẫn còn chìm sau cửa sổ chính. */
          setDrawerInteractive(d, !!drawerOpenOpt && !openingAnim);
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
        /* v10.7 (cua so Video roi bi cat mep phai): duong render layout
           don cung mo rong stage theo cua so roi nhu renderStacked/
           renderClassicStage (skin co main hep hon 354, hoac cua so
           roi phong to/keo rong hon main). */
        var detWL = detachedWinSize(avsState.mode).w;
        var curWL = parseInt(T.style.width || "0", 10) || 0;
        if (detWL > curWL) T.style.width = detWL + "px";
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
        /* Đợt 4: park thẻ video TRƯỚC khi xóa live (như renderLayout). */
        try {
          if (avsMedia && live.contains && live.contains(avsMedia.wrap)) parkAvsMedia();
        } catch (e) { /* bỏ qua */ }
        live.innerHTML = "";
        live.style.width = build.style.width;
        live.style.height = build.style.height;
        while (build.firstChild) live.appendChild(build.firstChild);
        lastStage = live;
        restoreScrollState(prevScrollStacked);
      }
      /* Skin Classic không có playlist để xếp: vẽ cửa sổ chính Classic
         (+ cửa sổ rời nếu đang tách), không vẽ cửa sổ playlist. */
      if (RES.kind === "classic") {
        T.innerHTML = "";
        T._absX = 0; T._absY = 0;
        var ch2 = await renderClassicStage(T, !!opts.shadeMode, opts);
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
      /* v10.4 (sua lai) — ML dung thiet ke Winamp: cua so ML GIU kich
         thuoc rieng (mac dinh 790px XML, keo duoc nhu moi cua so) va
         stage mo rong theo ML nhu moi cua so khac; KHONG kep ML ve
         bang stage (viec ep o ban nhap v10.4 lam hong keo resize ML:
         keo rong hon stage thi bi ep ve, onWinSizeChange luu sai).
         Tren dien thoai bang ML cuon ngang ben trong (minWidth 480px)
         khi cua so hep hon bang; cot khong bi giau. */
      var stageW = mainWHStacked ? mainWHStacked.w : 354;
      if (plWH) stageW = Math.max(stageW, plWH.w);
      if (mlWH) stageW = Math.max(stageW, mlWH.w);
      /* v10.7 (cua so Video roi bi cat mep phai): rong stage phai tinh
         ca cua so roi dang mo — mac dinh 354 (bang main 566 nen truoc
         day khong lo), nhung phong to 960 hoac keo tay rong hon main
         thi tran khoi viewport khi zoom-fit (nhu Classic 275 < 354). */
      if (avsState.open && avsState.detached) stageW = Math.max(stageW, detachedWinSize(avsState.mode).w);
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
           channelsRec = null; khôi lại BẢN GHI của cửa sổ chính (chỉ giữ
           lại record/div để các lần áp sau có đích — KHÔNG đồng nghĩa
           trạng thái đã áp: lệnh áp "stereo" ở cuối lượt main là async
           nên thường bị hủy khi lượt Pledit reset rec giữa chừng, xem
           ghi chú cuối renderStackedInner đợt v10.2). */
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
      /* Đợt v10.2 (18:34) — GIẢ THUYẾT PL/ML ĐÚNG: bật/tắt PL hay ML đều
         xếp chồng vẽ lại cửa sổ chính, layer channels về ảnh mặc định
         "none" (trong suốt). Lệnh áp "stereo" ở cuối lượt render main
         là async (setChannelsState chờ bitmap) nên bị hủy khi lượt
         Pledit/ML reset channelsRec = null giữa chừng (kiểm tra
         channelsRec !== rec) — chỉ báo tắt luôn tới lần đổi trạng thái
         phát sau. Áp lại ở đây, sau mọi lượt + khôi registry, để trạng
         thái stereo/mono hiện tại luôn sáng sau mỗi lần bật/tắt cửa sổ
         (PL, ML, ngăn kéo, video đều qua renderStackedInner). */
      updateChannelsIndicator();
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
      autoOpenVideoEnabled: autoOpenVideoEnabled, toggleAutoOpenVideo: toggleAutoOpenVideo, /* v10.13: tick "Tự mở cửa sổ video khi phát video" */
      AUTO_OPEN_VIDEO_KEY: AUTO_OPEN_VIDEO_KEY, AUTO_OPEN_VIDEO_SUFFIX: AUTO_OPEN_VIDEO_SUFFIX,
      isAvsAnimEnabled: isAvsAnimEnabled, drawerAnimEnabled: drawerAnimEnabled,
      menuGroupVisible: menuGroupVisible, visButtonAction: visButtonAction,
      detachOptionOn: detachOptionOn, avsFromBottom: avsFromBottom,
      getVisFrame: getVisFrame, getTickerMode: tickerMode, getTickerState: getTickerState,
      /* Đợt v10.1 (việc 3: Classic) — cửa sổ chính Classic (.wsz). */
      getClassicMainState: getClassicMainState, refreshClassicMain: refreshClassicMain,
      /* Đợt v10.3 — cửa sổ Playlist + EQ Classic (.wsz). */
      isClassicSkin: function () { return !!(RES && RES.kind === "classic"); },
      setClassicEqOpen: setClassicEqOpen, isClassicEqOpen: isClassicEqOpen,
      isClassicEqShade: isClassicEqShade, isClassicPlShade: isClassicPlShade,
      refreshClassicPlRows: refreshClassicPlRows, drawClassicEqGraph: drawClassicEqGraph,
      /* Đợt v10.0 (việc AVS-vis): khung vis AVS kiểu Webamp. */
      getAvsFrame: getAvsFrame, AVS_BARS: AVS_BARS, AVS_ROWS: AVS_ROWS,
      getVisEqualizeTable: getVisEqualizeTable, visLogValue: visLogValue, /* v10.11: bảng equalize Nullsoft + ánh xạ log cho vis display */
      stepTicker: stepTicker, syncTickerAnim: syncTickerAnim,
      getSongInfoState: getSongInfoState, songInfoText: songInfoText,
      runAvsSelfCheck: runAvsSelfCheck, runAudioSelfCheck: runAudioSelfCheck,
      applyColorTheme: applyColorTheme, selectColorTheme: selectColorTheme,
      gammaScale: gammaScale, gammaMatrixValues: gammaMatrixValues,
      applyEqPreset: applyEqPreset, setAllEqBands: setAllEqBands,
      matchEqPresetName: matchEqPresetName, resetEqToDefault: resetEqToDefault, /* v10.7 (107): preset + "Default" (09:08 doi ten tu "Mac dinh") */
      /* Đợt v10.0 (việc 1: winamp-eqf). */
      applyEqFracs: applyEqFracs, applyEqfPreset: applyEqfPreset,
      loadEqfArrayBuffer: loadEqfArrayBuffer, openEqfPicker: openEqfPicker,
      exportCurrentEqf: exportCurrentEqf, showEqfChooserMenu: showEqfChooserMenu,
      getLastLoadedEqf: getLastLoadedEqf, getLastExportedEqf: getLastExportedEqf,
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
      visContextMenuItems: visContextMenuItems, togglePopupMenu: togglePopupMenu,
      isPopupMenuOpen: isPopupMenuOpen,
      viewMenuItems: viewMenuItems, fileMenuItems: fileMenuItems,
      playMenuItems: playMenuItems, optionsMenuItems: optionsMenuItems,
      helpMenuItems: helpMenuItems, cycleRepeat: cycleRepeat,
      getTrackInfoState: getTrackInfoState, showTrackInfo: showTrackInfo,
      trackMenuItems: trackMenuItems,
      openPreferences: openPreferences, openAbout: openAbout,
      openDrawerTab: openDrawerTab,
      setBeatVisOn: setBeatVisOn, getBeatVisState: getBeatVisState, getBeatFrame: getBeatFrame,
      setBalance: setBalance, getPanState: getPanState,
      setVisRandom: setVisRandom, /* v10.5: menu View "Màu hiệu ứng ngẫu nhiên" */
      setVideoInfo: setVideoInfo, cycleVisVariant: cycleVisVariant,
      cycleVisType: cycleVisType, setVisType: setVisType, getVisTypes: getVisTypes, VIS_TYPES: VIS_TYPES, /* Đợt 4: kiểu vis bar/osc/none */
      setAvsAnalyser: setAvsAnalyser, getAvsAnalyser: getAvsAnalyser,
      getVisXmlBands: function () { return visXmlBands.slice(); },
      getVisXmlPeak: function () { return visXmlPeak; }, /* Đợt v10.2 */
      restoreAvsState: restoreAvsState, isVideoItem: isVideoItem,
      getAvsMedia: getAvsMedia, resetAvsMedia: resetAvsMedia,
      getAvsParkState: getAvsParkState, parkAvsMedia: parkAvsMedia, /* Đợt 4: holder giữ thẻ video khi đóng cửa sổ */
      setMilkdropCanvas: setMilkdropCanvas, setMilkdropActive: setMilkdropActive, getMilkdropState: getMilkdropState, /* Đợt 4: Milkdrop */
      /* Đợt 6 (03/11: Media Session API + hotkeys — lấy từ fork, gỡ khỏi Redux). */
      updateMediaSession: updateMediaSession, getMediaSessionState: getMediaSessionState,
      currentMediaMeta: currentMediaMeta,
      seekBy: seekBy, adjustVolume: adjustVolume,
      toggleMute: toggleMute, setMuted: setMuted, isMuted: isMuted,
      toggleShuffle: toggleShuffle, handleHotkey: handleHotkey,
      /* Đợt E — phát tiếng: nối audio.js + điều khiển phát + lưu state. */
      setAudioEngine: setAudioEngine, getAudioEngine: getAudioEngine,
      getEqState: getEqState, getPlaybackState: getPlaybackState,
      restorePlaybackState: restorePlaybackState,
      playCurrentItem: playCurrentItem, nextTrack: nextTrack, prevTrack: prevTrack,
      togglePlay: togglePlay, stopPlayback: stopPlayback,
      onAudioTimeUpdate: onAudioTimeUpdate, onAudioEnded: onAudioEnded,
      onAudioError: onAudioError, onAudioEqFallback: onAudioEqFallback, onAudioPlayingChange: onAudioPlayingChange,
      setChannelsState: setChannelsState, updateChannelsIndicator: updateChannelsIndicator,
      showTickerError: showTickerError, clearTickerError: clearTickerError,
      getTickerError: getTickerError,
      addLocalFiles: addLocalFiles, openLocalFolderPicker: openLocalFolderPicker,
      /* Đợt 5 (03/11: metadata nhạc — đọc tag file local). */
      probeLocalMetadata: probeLocalMetadata, applyMetadataToItem: applyMetadataToItem,
      metadataDisplayName: metadataDisplayName, metadataDisplayArtist: metadataDisplayArtist,
      metadataDisplayAlbum: metadataDisplayAlbum, getMetaLib: getMetaLib,
      /* Đợt v10.0 (việc 5: thêm nhạc local — 1 bài hoặc cả thư mục). */
      openLocalFilePicker: openLocalFilePicker, localPathParts: localPathParts,
      showLocalAddMenu: showLocalAddMenu,
      DETACHED_WIN_W: DETACHED_WIN_W, DETACHED_WIN_H: DETACHED_WIN_H,
      DETACHED_MEDIA_RECT: DETACHED_MEDIA_RECT, VIS_VARIANTS: VIS_VARIANTS,
      getLocalLoadState: getLocalLoadState, waitLocalLoadIdle: waitLocalLoadIdle,
      flushMlRows: flushMlRows, getMlRenderState: getMlRenderState, ensureLocalUrl: ensureLocalUrl,
      scheduleListRefresh: scheduleListRefresh, flushListRefresh: flushListRefresh,
      getPlaylistState: getPlaylistState, setPlaylistData: setPlaylistData,
      setPlaylistItems: setPlaylistItems, selectPlaylistItem: selectPlaylistItem,
      playPlaylistItem: playPlaylistItem, removePlaylistItem: removePlaylistItem,
      addPlaylistItem: addPlaylistItem, addPlaylistItems: addPlaylistItems, addUrl: addUrl, isM3UListUrl: isM3UListUrl, sortPlaylistByName: sortPlaylistByName,
      restorePlaylistOrder: restorePlaylistOrder, exportPlaylistM3U: exportPlaylistM3U,
      playlistTotalTime: playlistTotalTime, parseM3U: parseM3U,
      /* Đợt A (9.9): đồng hồ playlist (việc 3), đồng hồ chính (việc 4),
         Media Library (việc 1), resize cửa sổ (việc 6). */
      playlistSelectedTime: playlistSelectedTime, playlistClockText: playlistClockText,
      playlistClockUsesElapsed: playlistClockUsesElapsed, /* v10.7 (107): test đồng hồ toàn-live */
      clearPlaylistSelection: clearPlaylistSelection,
      getTimerMode: getTimerMode, setTimerMode: setTimerMode, toggleTimerMode: toggleTimerMode,
      timerDisplayText: timerDisplayText, currentTrackDuration: currentTrackDuration,
      hasMediaLibrary: hasMediaLibrary, setMlFilter: setMlFilter, setMlSearch: setMlSearch, getMlState: getMlState,
      refreshMlRows: refreshMlRows,
      /* Đợt v10.4 — ML luon du thiet ke Winamp (khong con che do gon). */
      viewportWidth: viewportWidth, mlColDefs: mlColDefs,
      getWinSizes: getWinSizes, restoreWinSizes: restoreWinSizes, setWinSize: setWinSize,
      clampWinSize: clampWinSize, isLayoutResizable: isLayoutResizable, layoutMinMax: layoutMinMax,
      effectiveLayoutWH: effectiveLayoutWH, detachedWinSize: detachedWinSize, detachedDefaultWidth: detachedDefaultWidth,
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
