/* =====================================================================
   Amp v9 — renderer.js (VIẾT MỚI TỪ ĐẦU, đợt A; đợt B thêm ngăn kéo)
   Renderer cửa sổ chính theo SPEC-skin-sim §3. Không copy code v7.4/v8;
   chỉ giữ các công thức đã chứng minh đúng (V8-BUGS.md):
     - contentH = layoutH - frameOffsetY (loader lo, renderer dùng contentH
       khi vẽ nội dung frame).
     - drawerInnerY = mainH + slot - full - restY, slot(mở)=snap,
       slot(đóng)=max(8, round(full*0.1)); đỉnh ngăn kéo chìm 13px.
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
   Sort/Help đo từ PNG lúc chạy), danh sách thật từ radio.m3u (41 kênh) +
   3 bài Demo, chọn 1 click / phát 2 click, ô tìm trong khung list, hàng
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

  var RENDERER_VERSION = "9.3";
  var EXPECTED_RENDERER_VERSION = "9.3";
  /* ĐỢT F — version manifest duy nhất (như skin-loader.js): index.html
     đặt window.AMP_VERSION = "9.3" TRƯỚC khi nạp file này; khác manifest
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
     (main y=17 + offset nhóm + offset phần tử); ghi lại đây để đợt sau
     khỏi nhầm khi đọc SPEC §4.2:
     - main y=17 (đáy 143); menubar y=18 (cao 17); display GỐC NHÓM y=20
       (17+3), nhưng SPEC ghi "display y=36" là ĐỈNH CHỮ TIMER (20+16).
     - ticker (Songticker) y=63 (17+3+43) — SPEC ghi 60 là cộng thiếu y=3
       của nhóm display. Renderer lấy từ XML nên đã đúng 63.
     - seek y=92 (17+75); playbuttons y=110 (17+93).
     - volume: SPEC ghi "y=117" là ĐỈNH NỀN volume (layer player.volume.bg
       y=100 trong main); SLIDER Volume thật ở y=127 (17+110), fill
       volumebar ở y=132 (17+115). Đừng dùng 117 làm vị trí slider. */
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
     Hai font này giống hệt nhau về bảng ký tự, chỉ khác đảo alpha
     (songinfofont đảo, pe.time không đảo — xem §8.1). */
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

  var DEMO_TRACKS = [
    { name: "Winamp - Llama Whippin'", len: 225 },
    { name: "Nullsoft - Winamp Demo Song", len: 187 },
    { name: "Sven Kistner - Base Skin Theme", len: 243 }
  ];

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

  /* ---------- toán ngăn kéo (giữ công thức v8 đã đo đúng) ---------- */
  function drawerSnap(layout, fullH) {
    if (layout && typeof layout.snapadjustbottom === "number" && layout.snapadjustbottom > 0) return layout.snapadjustbottom;
    return fullH || 129;
  }
  function drawerInnerY(open, mainH, snap, full, restY) {
    var slot = open ? snap : Math.max(8, Math.round(full * 0.1));
    return mainH + slot - full - restY;
  }
  /* Self-check hình học (V8-BUGS checklist): đỉnh ngăn kéo phải chìm đúng
     full-snap (13px với skin 566) dưới đáy main khi mở. */
  function drawerSelfCheck(p) {
    var errs = [];
    if (p.restY + p.innerYOpen !== p.mainH - (p.full - p.snap)) {
      errs.push("dinh ngan keo khong chim dung " + (p.full - p.snap) + "px: restY(" + p.restY + ")+innerY(" + p.innerYOpen + ")=" + (p.restY + p.innerYOpen) + " != mainH(" + p.mainH + ")-" + (p.full - p.snap));
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
      playing: false, track: 0, t: 2, volume: 1,
      seekFrac: 0, shuffle: false, repeat: 0, eq: true
    };
    var drawerTab = opts.drawerTab || "eq";
    var onTabChange = opts.onTabChange || null;
    var onRerender = opts.onRerender || null;
    var onDrawerToggle = opts.onDrawerToggle || null;
    var onShadeToggle = opts.onShadeToggle || null; /* đợt G: normal<->shade (nút winshade / dblclick nền shade) */
    var onPlaylistToggle = opts.onPlaylistToggle || null; /* đợt C: mở/đóng playlist */
    var onReloadRadio = opts.onReloadRadio || null;       /* đợt C: nạp lại radio.m3u */
    var isPlaylistOpen = opts.isPlaylistOpen || null;     /* đợt C: tick menu View */
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
      setDrawerTransform(els.d, targetDy, true);
      setDrawerTransform(els.sh, targetDy, true);
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
      videoScale: 1, visVariant: 0, visRandom: false, videoInfo: ""
    };
    var avsMedia = null; /* {wrap, video, canvas} — tạo 1 lần, DI CHUYỂN giữa hộp nhúng/rời (không tạo lại để khỏi mất trạng thái phát) */
    var avsAnalyser = null; /* ĐIỂM NỐI ĐỢT E: AnalyserNode của chuỗi EQ. Có thì drawVisStatic vẽ theo tần số thật; chưa có thì sóng sin mẫu. Chưa nối tiếng ở đợt D. */
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
        hasEmbedded: !!RES.embeddedAvs, fullscreenAttempted: avsFullscreenAttempted
      };
    }
    /* Kênh nào là video (đường (a) loadChannel autoplay, theo heuristic
       v8 channelIsVideo — GIỮ NGUYÊN, không mở rộng bừa):
       - item.video === true/false: cờ tường minh thắng hết.
       - nhóm chứa "hình"/"video".
       - link .mp4/.m4v/.mov/.webm.
       - link qua 2 host TV đã xác nhận (mediatech.vn, truyenhinhnghean.vn).
       .m3u8 CHUNG CHUNG không tính là video (radio HLS cũng .m3u8). */
    function isVideoItem(it) {
      if (!it) return false;
      if (it.video === true) return true;
      if (it.video === false) return false;
      if (/hình|video/i.test(it.group || "")) return true;
      var url = it.url || "";
      if (/\.(mp4|m4v|mov|webm)($|\?)/i.test(url)) return true;
      if (/mediatech\.vn|truyenhinhnghean\.vn/i.test(url)) return true;
      return false;
    }
    function syncAvsAnim() { if (avsState.open) startAvsAnim(); else stopAvsAnim(); }
    /* Mở video/vis — ĐƯỜNG RẼ TRUNG TÂM (DESIGN-CONSTRAINTS.md §1):
       skin CÓ embeddedAvs → vùng nhúng; KHÔNG có → cửa sổ rời. Khi đang
       mở rồi thì chỉ đổi mode, giữ nguyên detached (đừng kéo cửa sổ rời
       về nhúng chỉ vì bấm lại menu View). */
    function openAvs(mode) {
      if (mode === "vis" || mode === "video") avsState.mode = mode;
      if (!avsState.open) avsState.detached = !RES.embeddedAvs;
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
      v.style.objectFit = "contain";
      v.style.transform = avsState.videoScale === 2 ? "scale(2)" : "";
      v.style.transformOrigin = "center center";
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
      if (saved.open) {
        avsState.open = true;
        avsState.detached = RES.embeddedAvs ? !!saved.detached : true;
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
       - tickerError: chữ đỏ không dấu trên dòng chữ chạy (kênh lỗi / bài
         Demo chưa có file nhạc). setTickerText ưu tiên hiện nó, màu đỏ.
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
        eqOn: drawerState.eqOn, eqBands: Object.assign({}, drawerState.eqBands)
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
    /* Phát mục hiện tại qua engine. Bài Demo (url rỗng) không có file
       nhạc thật -> chỉ hiện trạng thái, không crash, không bịa tiếng
       (state playing vẫn giữ như đợt C để test cũ không đổi). */
    function startPlaybackForCurrent() {
      var it = playlistState.items[playlistState.current];
      if (!it) return { ok: false, reason: "empty" };
      if (!it.url) {
        showTickerError("bai demo chua co file nhac");
        return { ok: false, reason: "demo" };
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
      demo.t = 0; demo.seekFrac = 0;
      updateStatusEls(); updateTimerEls(); updateProgress(); refreshPlaylistRows();
      persistPlayback();
      return true;
    }
    /* --- callback từ engine (audio.js) --- */
    function onAudioTimeUpdate(t, dur, seekable) {
      demo.t = t || 0;
      demo.seekFrac = (dur && dur > 0) ? Math.max(0, Math.min(1, demo.t / dur)) : 0;
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
      updateStatusEls(); refreshPlaylistRows(); persistPlayback();
    }
    function onAudioPlayingChange(playing) {
      demo.playing = !!playing;
      playlistState.playing = !!playing;
      /* Đang phát thật thì lỗi cũ (nếu có) không còn đúng nữa. */
      if (playing) clearTickerError();
      updateStatusEls();
      refreshPlaylistRows();
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
          url: url, len: null, group: "Local", kind: "track", local: true
        });
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
       Mặc định: 3 bài Demo của đợt A (nhóm "Demo"). index.html nạp
       radio.m3u xong gọi setPlaylistData để chèn 41 kênh lên đầu, Demo ở cuối.
       radio.m3u thật KHÔNG có group-title nào (41 kênh đều không thẻ) nên
       nhóm mặc định của chúng là "Radio" (tên nguồn), ghi rõ ở đây — không
       phải "Không rõ" như quy ước gom nhóm của Webamp fork. */
    function demoPlaylistItems() {
      return DEMO_TRACKS.map(function (t) { return { name: t.name, url: "", len: t.len, group: "Demo", kind: "track" }; });
    }
    var playlistState = {
      items: demoPlaylistItems(), original: null,
      selected: 0, current: 0, playing: false, filter: "",
      source: "Demo (3 bai mau)"
    };
    playlistState.original = playlistState.items.slice();
    var plListDiv = null, plSearchInput = null, lastExportedM3U = "";
    function playlistTotalTime() {
      var s = 0;
      for (var i = 0; i < playlistState.items.length; i++) if (playlistState.items[i].len != null) s += playlistState.items[i].len;
      return s;
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
        groups: playlistGroups()
      };
    }
    /* Nạp nguồn .m3u làm dữ liệu chính: kênh radio lên đầu (giữ tên +
       thứ tự gốc), 3 bài Demo ở cuối. Trả về tổng số mục. */
    function setPlaylistData(m3uText, baseUrl, sourceName) {
      var radio = parseM3U(m3uText, baseUrl);
      for (var i = 0; i < radio.length; i++) if (!radio[i].group) radio[i].group = "Radio";
      var items = radio.concat(demoPlaylistItems());
      playlistState.items = items;
      playlistState.original = items.slice();
      playlistState.selected = 0; playlistState.current = 0;
      playlistState.playing = false; playlistState.filter = "";
      playlistState.source = sourceName || "radio.m3u";
      requestRerender();
      return items.length;
    }
    function setPlaylistItems(items, sourceName) {
      playlistState.items = items.slice();
      playlistState.original = items.slice();
      playlistState.selected = 0; playlistState.current = 0;
      playlistState.playing = false; playlistState.filter = "";
      playlistState.source = sourceName || "";
      requestRerender();
      return playlistState.items.length;
    }
    function clampPlaylistIdx(i) {
      if (!playlistState.items.length) return 0;
      return Math.max(0, Math.min(playlistState.items.length - 1, i | 0));
    }
    /* Click 1 lần = chỉ CHỌN hàng (không phát — quy ước đã chốt ở Webamp
       fork: PHẢI nhấp đúp mới phát, tránh chạm nhầm). Vẽ lại hàng tại chỗ,
       không re-render toàn cửa sổ (giữ vị trí cuộn). */
    function selectPlaylistItem(idx) {
      if (!playlistState.items.length) return false;
      playlistState.selected = clampPlaylistIdx(idx);
      refreshPlaylistRows();
      return true;
    }
    /* Nhấp đúp = phát: đặt current + playing (state cho đợt E dùng tiếp;
       đợt C chưa phát ra tiếng). Bài Demo thì đồng bộ demo.track để đồng hồ/
       chữ chạy cửa sổ chính hiện đúng bài; kênh radio thì ticker giữ bài
       Demo trước đó (đợt E sẽ thống nhất). */
    function playPlaylistItem(idx) {
      if (!playlistState.items.length) return false;
      idx = clampPlaylistIdx(idx);
      playlistState.current = idx;
      playlistState.selected = idx;
      playlistState.playing = true;
      demo.t = 0; demo.seekFrac = 0; demo.playing = true;
      var it = playlistState.items[idx];
      if (it && it.kind === "track") {
        for (var di = 0; di < DEMO_TRACKS.length; di++) {
          if (DEMO_TRACKS[di].name === it.name) { demo.track = di; break; }
        }
      }
      refreshPlaylistRows();
      updateStatusEls(); updateTimerEls();
      for (var i = 0; i < tickerEls.length; i++) setTickerText(tickerEls[i]);
      updateInfoEls();
      /* Đợt D — đường (a) loadChannel autoplay (v8): kênh video thì tự mở
         video (nhúng nếu có, rời nếu Classic); kênh audio trong khi vùng
         nhúng đang ở chế độ video thì về vis cho khỏi màn hình đen. */
      var playedItem = playlistState.items[idx];
      if (isVideoItem(playedItem)) openAvs("video");
      else if (avsState.open && !avsState.detached && avsState.mode === "video" && RES.embeddedAvs) setAvsMode("vis");
      /* Đợt E — phát thật qua audio engine (bài Demo không có file nhạc
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
    function clearPlaylistToDemo() {
      playlistState.items = demoPlaylistItems();
      playlistState.original = playlistState.items.slice();
      playlistState.selected = 0; playlistState.current = 0; playlistState.playing = false;
      demo.playing = false;
      if (audioEngine) audioEngine.stop();
      updateInfoEls();
      requestRerender();
    }
    function readdDemoTracks() {
      var have = {};
      playlistState.items.forEach(function (it) { if (it.group === "Demo") have[it.name] = true; });
      demoPlaylistItems().forEach(function (d) { if (!have[d.name]) playlistState.items.push(d); });
      updateInfoEls();
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
      }
      if (attrib === "EQ_AUTO") drawerState.eqAuto = cfgOn(attrib);
      if (attrib && attrib.indexOf("Enable crossfading") >= 0) drawerState.crossfadeOn = cfgOn(attrib);
      await refreshCfgGroup(attrib);
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
      var mainH = mainDiv ? (mainDiv._absY || 0) + (parseInt(mainDiv.style.height || "0", 10) || 0) : 143;
      var restY = (RES.drawer && RES.drawer.restY) || 17;
      var full = parseInt(drawerDiv.style.height || "0", 10) || ((RES.drawer && RES.drawer.fullH) || 129);
      var snap = (RES.layouts && RES.layouts["main|normal"] && RES.layouts["main|normal"].snapadjustbottom) || full;
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
      var errs = drawerSelfCheck({ restY: restY, innerYOpen: innerY, mainH: mainH, full: full, snap: snap, tabsBottom: tabsBottom, fillCount: fillCount });
      if (drawerState.open && Math.abs((drawerDiv._absY || 0) - (restY + drawerInnerY(true, mainH, snap, full, restY))) > 0.5) {
        errs.push("ngan keo dang mo nhung dinh o " + drawerDiv._absY + ", dung ra " + (restY + drawerInnerY(true, mainH, snap, full, restY)));
      }
      return errs;
    }

    /* Self-check hình học AVS/Video (ĐỢT F — chạy thật lúc nạp/mở qua
       checkDrawer ở index.html, chung 1 banner #drawer-check với self-check
       ngăn kéo). Đo từ DOM thật, KHÔNG theo state: phần tử nào có mặt thì
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
          if (mainDiv && (mainDiv._absY || 0) !== 17 + VIDEO_SHIFT) errs.push("mo AVS nhung ma main _absY " + (mainDiv._absY || 0) + ", dung ra " + (17 + VIDEO_SHIFT) + " (17+116)");
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
        if (dw !== DETACHED_WIN_W || dh !== DETACHED_WIN_H) errs.push("cua so roi " + dw + "x" + dh + ", dung ra " + DETACHED_WIN_W + "x" + DETACHED_WIN_H);
      }
      if (isMainStage) {
        if (avsState.open && !avsState.detached && ea && !avsDiv) errs.push("AVS mo nhung nhung khong thay AVSGroup trong DOM");
        if (avsState.open && avsState.detached && !detWin) errs.push("AVS dang tach roi nhung khong thay cua so roi [data-avs-detached]");
        if (avsState.open && avsState.detached && ea && avsDiv) errs.push("AVS da tach roi nhung vung nhung AVSGroup van hien");
      }
      return errs;
    }

    /* Self-check tiếng (ĐỢT F — chạy thật qua checkDrawer ở index.html,
       chung 1 banner #drawer-check). Bảo đảm MediaElementSource chỉ tạo
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
    var cfgGroups = {};
    var cfgState = new Map([["SHUFFLE", "off"], ["REPEAT", "0"], ["EQ_TOGGLE", "on"]]);
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
          div.style.backgroundSize = sw + "px " + sh + "px";
          div.style.backgroundPosition = (-info.crop.x) + "px " + (-info.crop.y) + "px";
          div.style.backgroundRepeat = "repeat";
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
      if (!ctx) { fontCache[fontId] = { img: img, canvas: canvas, ctx: null, inverted: false, baseX: 0, baseY: 0, charwidth: f.charwidth, charheight: f.charheight, hspacing: f.hspacing, vspacing: f.vspacing }; return fontCache[fontId]; }
      canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
      var cw = f.charwidth, chh = f.charheight;
      var baseX = bmp.crop ? bmp.crop.x : 0, baseY = bmp.crop ? bmp.crop.y : 0;
      /* Phát hiện font "khuôn" (đảo alpha): lấy mẫu pixel góc trên-trái
         từng ô glyph; nền đục quá nửa thì đảo. Ngưỡng opaque/total > 0.5,
         alpha mẫu > 128. */
      var opaque = 0, total = 0;
      var rows = FONT_ROWS[fontId] || [];
      rows.forEach(function (rowStr, r) {
        for (var c = 0; c < rowStr.length; c++) {
          var x = baseX + c * cw, y = baseY + r * chh;
          if (x < canvas.width && y < canvas.height) {
            var d = ctx.getImageData(x, y, 1, 1).data;
            total++; if (d[3] > 128) opaque++;
          }
        }
      });
      var rec = { img: img, canvas: canvas, ctx: ctx, inverted: total > 0 && opaque / total > 0.5, baseX: baseX, baseY: baseY, charwidth: f.charwidth, charheight: f.charheight, hspacing: f.hspacing, vspacing: f.vspacing };
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
      var d = cx.getImageData(0, 0, cw, chh);
      if (font.inverted) {
        for (var i = 0; i < d.data.length; i += 4) {
          d.data[i + 3] = d.data[i + 3] < 128 ? 255 : 0;
          d.data[i] = d.data[i + 1] = d.data[i + 2] = 255;
        }
        cx.putImageData(d, 0, 0);
      }
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

    async function renderChildren(children, parentEl, parentW, parentH, ctx, depth) {
      if (depth > MAX_DEPTH) return;
      var localHidden = new Set();
      for (var i = 0; i < children.length; i++) {
        if (lowerTag(children[i]) === "hideobject") {
          var parts = (children[i].getAttribute("target") || "").split(";");
          for (var j = 0; j < parts.length; j++) if (parts[j]) localHidden.add(parts[j].toLowerCase());
        }
      }
      for (var k = 0; k < children.length; k++) {
        var el = children[k], tag = lowerTag(el);
        if (SKIP_TAGS[tag] || tag.indexOf("colorthemes:") === 0) continue;
        if (!isActiveVersion(el)) continue;
        var id = el.getAttribute("id") || "";
        if (localHidden.has(id.toLowerCase())) continue;
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
      var div = document.createElement("div");
      div.style.position = "absolute";
      div.style.left = x + "px"; div.style.top = y + "px";
      div.style.width = gw + "px"; div.style.height = gh + "px";
      setAbs(div, parentEl, x, y);
      div.dataset.gid = gid;
      div.style.pointerEvents = "none";
      parentEl.appendChild(div);
      /* Menu ngang: mỗi mục rộng bằng ảnh layer rộng nhất trong groupdef con. */
      if (gid === "menu.group" || gid === "menu.group.pl" || gid === "menu.group.ml") {
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
              if (parentGid === "menu.group" && itemGid === "menugroup.view") { showPlaylistMenu(anchor, viewMenuItems()); return; }
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
        var frameCtx = { overrides: ctx.overrides, hiddenIds: ctx.frameHidden || new Set(), drawerTab: ctx.drawerTab, titleText: ctx.titleText, frameHidden: ctx.frameHidden, windowKind: ctx.windowKind };
        if (content && RES.groupdefs[content]) {
          /* Nội dung frame nằm dưới titlebar 18px: vẽ trước, frame đè sau. */
          var cdiv = document.createElement("div");
          cdiv.style.position = "absolute"; cdiv.style.left = "0px"; cdiv.style.top = FRAME_OFFSET_Y + "px";
          cdiv.style.width = (w || parentW) + "px"; cdiv.style.height = Math.max(0, (h || parentH) - FRAME_OFFSET_Y) + "px";
          setAbs(cdiv, div, 0, FRAME_OFFSET_Y);
          cdiv.style.pointerEvents = "none";
          div.appendChild(cdiv);
          await renderChildren(RES.groupdefs[content], cdiv, w || parentW, Math.max(0, (h || parentH) - FRAME_OFFSET_Y), ctx, depth + 1);
        }
        await renderChildren(RES.groupdefs[xui], div, w || parentW, h || parentH, frameCtx, depth + 1);
        return;
      }
      if (tag === "layer" || tag === "animatedlayer") {
        var image = el.getAttribute("image");
        var lw = el.getAttribute("w") !== null ? relSize(el, "w", parentW) : null;
        var lh = el.getAttribute("h") !== null ? relSize(el, "h", parentH) : null;
        if (!image) return;
        var spr = await spriteDiv(image, lw, lh, { tile: el.getAttribute("tile") === "1", opacity: alphaOf(el) });
        if (!spr) return;
        spr.style.left = x + "px"; spr.style.top = y + "px";
        if (el.getAttribute("ghost") === "1") spr.style.pointerEvents = "none";
        if (el.getAttribute("relatw") === "1") spr.dataset.stretch = "1";
        setAbs(spr, parentEl, x, y);
        parentEl.appendChild(spr);
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
        visCanvases.push({ cv: cv, bands: new Array(VIS_BANDS).fill(2) });
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
      if (tag === "component") { renderPlaylistList(el, parentEl, parentW, parentH, x, y); return; }
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
    /* Hàng playlist: bài có thời lượng -> "N. Tên (M:SS)"; kênh radio
       (len null) -> "N. Tên kênh — Trực tiếp" (không bịa số).
       Số thứ tự N = vị trí trong FULL list (không đổi khi lọc) để số hàng
       ổn định khi tìm kiếm. */
    function playlistRowText(it, n) {
      if (it.kind === "track" && it.len != null) return n + ". " + it.name + " (" + fmtTime(it.len) + ")";
      return n + ". " + it.name + " — Trực tiếp";
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
          row.textContent = playlistRowText(rec.item, rec.idx + 1);
          row.dataset.idx = String(rec.idx);
          /* Click 1 lần = chỉ chọn (không phát); click đúp = phát. */
          row.onclick = function () { selectPlaylistItem(rec.idx); };
          row.ondblclick = function () { playPlaylistItem(rec.idx); };
          listDiv.appendChild(row);
        })(rows[r]);
      }
    }
    function refreshPlaylistRows() {
      if (!plListDiv) return;
      buildPlaylistRows(plListDiv);
      if (plSearchInput) {
        plSearchInput.placeholder = "Tìm trong " + playlistState.items.length + " mục…";
        if (plSearchInput.value !== playlistState.filter) plSearchInput.value = playlistState.filter;
      }
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
               live không tua; bài Demo (chưa có tiếng) thì tua đồng hồ
               mẫu như đợt A–D. */
            var sought = false;
            if (audioEngine) sought = audioEngine.seekToFraction(rec.frac);
            if (!sought) {
              var curSeek = playlistState.items[playlistState.current];
              if (curSeek && curSeek.kind === "track" && !curSeek.url) {
                demo.seekFrac = rec.frac;
                demo.t = rec.frac * (curSeek.len || DEMO_TRACKS[demo.track].len);
                updateTimerEls(); updateProgress();
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
        else if (action === "PAN") drawerState.balance = rec.frac;
        else if (cfgattrib) drawerState.cfgSliders[cfgattrib] = rec.frac;
      };
      /* Kéo chuột/chạm: bấm vào track thì thumb nhảy tới đó rồi kéo theo. */
      if (thumb) {
        var dragging = false;
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
          dragging = true;
          rec.setFrac(f);
          if (e.preventDefault) e.preventDefault();
        };
        var onMove = function (e) {
          if (!dragging) return;
          var f = fracFromEvent(e);
          if (f === null) return;
          rec.setFrac(f);
          if (e.preventDefault) e.preventDefault();
        };
        var onUp = function () { dragging = false; };
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
      var w = el.getAttribute("w") !== null ? relSize(el, "w", parentW) : null;
      var h = el.getAttribute("h") !== null ? relSize(el, "h", parentH) : null;
      var div = document.createElement("div");
      div.className = "btn";
      div.dataset.buttonId = id;
      div.dataset.action = action;
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
        /* Đợt G — nút mute trên shade: đảo SHADE_MUTE (tắt tiếng ở engine,
           giữ nguyên demo.volume + volumebar). */
        if (id === "shademute") { toggleShadeMute(); return; }
        /* Đợt C — nút PL trên cửa sổ chính (XML: id="pl", action="TOGGLE"
           param="guid:pl", player-normal-group.xml:1163): mở/đóng playlist.
           Các nút TOGGLE khác (ML, Video...) chưa làm ở đợt C. */
        if (action === "TOGGLE" && (param || "").toLowerCase().indexOf("guid:pl") === 0) {
          if (onPlaylistToggle) onPlaylistToggle();
          return;
        }
        /* Đợt C — nút đóng (X) của cửa sổ Playlist (id="Close",
           action="CLOSE", standardframe.xml): đóng playlist. Cửa sổ CHÍNH
           không có nút Close nào để bấm: player-normal.xml:26
           <hideobject target="close;close.inactive"/> — skin Modern ẩn
           nút X của main theo thiết kế (thoát bằng menu). */
        if (action === "CLOSE" && ctx.windowKind === "playlist") {
          if (onPlaylistToggle) onPlaylistToggle(false);
          return;
        }
        /* Đợt D — nút đóng (X) trên titlebar cửa sổ Video/Vis rời:
           đóng vùng AVS (không dừng tiếng — xem closeAvs). */
        if (action === "CLOSE" && (ctx.windowKind === "video" || ctx.windowKind === "vis")) {
          closeAvs();
          return;
        }
        /* Đợt D — nút AVS/Video (dùng chung cho vùng nhúng lẫn cửa sổ
           rời, vì id/action trong XML giống nhau ở cả 2 chỗ):
           VID_1X/VID_2X đổi scale; VID_FS/VIS_FS fullscreen;
           VIS_Prev/Next đổi kiểu hiệu ứng; switchto đổi Video↔Vis;
           detach tách thành cửa sổ rời; reattach đưa về vùng nhúng;
           videoavs.open/close mở/đóng vùng AVS.
           VID_Misc/Vis_Menu (menu Video/Vis) và VID_MAX/Restore (phóng
           to/thu nhỏ cửa sổ Video) CHƯA làm ở đợt D — bấm không làm gì,
           ghi rõ để đợt sau không tưởng đã có. */
        if (action === "VID_1X") { setVideoScale(1); return; }
        if (action === "VID_2X") { setVideoScale(2); return; }
        if (action === "VID_FS" || action === "VIS_FS") { requestVideoFullscreen(); return; }
        if (action === "VIS_PREV") { cycleVisVariant(-1); return; }
        if (action === "VIS_NEXT") { cycleVisVariant(1); return; }
        if (action === "VID_MISC" || action === "VIS_MENU") { return; }
        if (id === "button.vid.detach" || id === "button.vis.detach") { detachAvs(); return; }
        if (id === "button.video.reattach" || id === "button.vis.reattach") { reattachAvs(); return; }
        if (id === "button.vid.switchto" || id === "button.vis.switchto") { toggleAvsMode(); return; }
        if (id === "videoavs.open") { openAvs(avsState.mode); return; }
        if (id === "videoavs.close") { closeAvs(); return; }
        if (id === "button.vid.max" || id === "button.vid.restore") { return; }
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
      menu.style.background = "#1c1c1c"; menu.style.border = "1px solid #555";
      menu.style.zIndex = "10"; menu.style.pointerEvents = "auto";
      menu.style.font = "11px Arial, sans-serif"; menu.style.color = "#ddd";
      var names = Object.keys(EQ_PRESETS);
      for (var i = 0; i < names.length; i++) {
        (function (name) {
          var row = document.createElement("div");
          row.textContent = name;
          row.style.padding = "4px 10px"; row.style.cursor = "pointer"; row.style.whiteSpace = "nowrap";
          row.dataset.presetName = name;
          row.onmouseover = function () { row.style.background = "#33507e"; };
          row.onmouseout = function () { row.style.background = ""; };
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
      var close = function () {
        if (menu.parentElement) menu.parentElement.removeChild(menu);
        try { document.removeEventListener("click", close); } catch (e) { /* jsdom */ }
      };
      try { setTimeout(function () { document.addEventListener("click", close); }, 0); } catch (e) { /* jsdom */ }
    }

    /* ---------- menu playlist (đợt C) ----------
       Menu HTML gọn theo phong cách skin (nền #1c1c1c, viền #555, Arial
       11px) vì .maki chạy menu thật không chạy được trên trình duyệt.
       Cùng 1 helper cho cả nút Add/Sel/Misc/List dưới playlist, mục
       File/Playlist/Sort/Help trên menubar playlist và mục View trên
       menubar chính. Menu đóng khi bấm mục khác hoặc bấm ra ngoài. */
    function closePlaylistMenus() {
      var T = lastStage;
      if (!T) return;
      var olds = null;
      try { olds = T.querySelectorAll("[data-pl-menu]"); } catch (e) { olds = []; }
      for (var i = 0; i < olds.length; i++) if (olds[i].parentElement) olds[i].parentElement.removeChild(olds[i]);
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
      menu.style.background = "#1c1c1c"; menu.style.border = "1px solid #555";
      menu.style.zIndex = "10"; menu.style.pointerEvents = "auto";
      menu.style.font = "11px Arial, sans-serif"; menu.style.color = "#ddd";
      for (var i = 0; i < items.length; i++) {
        (function (it) {
          var row = document.createElement("div");
          row.textContent = it.label;
          row.style.padding = "4px 10px"; row.style.cursor = "pointer"; row.style.whiteSpace = "nowrap";
          row.dataset.menuItem = it.label;
          row.onmouseover = function () { row.style.background = "#33507e"; };
          row.onmouseout = function () { row.style.background = ""; };
          row.onclick = function (ev) {
            if (ev && ev.stopPropagation) ev.stopPropagation();
            closePlaylistMenus();
            it.action();
          };
          menu.appendChild(row);
        })(items[i]);
      }
      T.appendChild(menu);
      try {
        setTimeout(function () {
          document.addEventListener("click", function h() {
            closePlaylistMenus();
            try { document.removeEventListener("click", h); } catch (e) { /* jsdom */ }
          });
        }, 0);
      } catch (e) { /* jsdom */ }
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
    /* Form thêm URL (mục "Thêm URL…" trong menu Add/File): ô nhập + nút
       Thêm/Hủy. Tên kênh lấy từ cuối đường dẫn URL (vd .../kenh.m3u8 ->
       "kenh"); người dùng sửa tên sau bằng cách xóa rồi thêm lại. */
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
      box.style.background = "#1c1c1c"; box.style.border = "1px solid #555";
      box.style.padding = "6px"; box.style.zIndex = "10"; box.style.pointerEvents = "auto";
      box.style.font = "11px Arial, sans-serif"; box.style.color = "#ddd";
      var inp = document.createElement("input");
      inp.type = "text";
      inp.placeholder = "https://…/kenh.m3u8 (hoặc .mp3)";
      inp.style.width = "220px"; inp.style.font = "11px Arial, sans-serif";
      inp.style.background = "#111"; inp.style.color = "#fff";
      inp.style.border = "1px solid #555"; inp.style.padding = "3px";
      box.appendChild(inp);
      var ok = document.createElement("button");
      ok.textContent = "Thêm";
      ok.style.marginLeft = "4px"; ok.style.font = "11px Arial, sans-serif";
      ok.onclick = function () {
        var url = (inp.value || "").trim();
        if (!url) return;
        addPlaylistItem({ name: deriveNameFromUrl(url), url: url, len: null, group: "Thêm tay", kind: "radio" });
        closePlaylistMenus();
      };
      box.appendChild(ok);
      var cancel = document.createElement("button");
      cancel.textContent = "Hủy";
      cancel.style.marginLeft = "4px"; cancel.style.font = "11px Arial, sans-serif";
      cancel.onclick = function () { closePlaylistMenus(); };
      box.appendChild(cancel);
      T.appendChild(box);
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
      box.style.background = "#1c1c1c"; box.style.border = "1px solid #555";
      box.style.padding = "6px 8px"; box.style.zIndex = "10"; box.style.pointerEvents = "auto";
      box.style.font = "11px Arial, sans-serif"; box.style.color = "#ddd";
      box.style.maxWidth = "260px"; box.style.whiteSpace = "normal"; box.style.lineHeight = "1.5";
      box.textContent = "Amp v9 · Playlist Editor (đợt C): 41 kênh radio.m3u + 3 bài Demo. Nhấp 1 lần để chọn, nhấp đúp để phát (đợt E mới có tiếng). Bấm vào đây để đóng.";
      box.onclick = function () { closePlaylistMenus(); };
      T.appendChild(box);
    }
    function addMenuItems(anchorDiv) {
      return [
        { label: "Nạp lại radio.m3u (41 kênh)", action: function () { if (onReloadRadio) onReloadRadio(); } },
        { label: "Thêm URL…", action: function () { showAddUrlForm(anchorDiv); } },
        { label: "Thêm lại 3 bài Demo", action: function () { readdDemoTracks(); } }
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
        { label: "Xóa hết (chỉ còn Demo)", action: function () { clearPlaylistToDemo(); } }
      ];
    }
    function viewMenuItems() {
      var plTick = "";
      try { plTick = (isPlaylistOpen && isPlaylistOpen()) ? "✓ " : ""; } catch (e) { plTick = ""; }
      return [
        { label: plTick + "Playlist Editor", action: function () { if (onPlaylistToggle) onPlaylistToggle(); } },
        { label: (drawerState.open ? "✓ " : "") + "Ngăn kéo (Drawer)", action: function () { if (onDrawerToggle) onDrawerToggle(!drawerState.open); else setDrawerOpen(!drawerState.open); } },
        /* Đợt D — đường (b) menu View: mở Video/Vis. Skin Modern → vùng
           nhúng; skin Classic → cửa sổ rời (rẽ nhánh trong openAvs). */
        { label: (avsState.open && avsState.mode === "video" ? "✓ " : "") + "Video", action: function () { openAvs("video"); } },
        { label: (avsState.open && avsState.mode === "vis" ? "✓ " : "") + "Hiệu ứng (Vis)", action: function () { openAvs("vis"); } }
      ];
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
        div.style.lineHeight = h + "px";
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
          var tdiv = await makeBitmapText(fontId, fmtTime(demo.t), w, align, color, valign, h);
          div.appendChild(tdiv);
          timerEls.push({ div: div, fontId: fontId, boxW: w, align: align, color: color });
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
          inheritAbs(div);
          return;
        }
        if (display === "PE_Info" || id === "PLTime") {
          /* PLTime = TỔNG thời gian các mục có thời lượng (demo 3 bài =
             225+187+243 = 655s = 10:55); kênh radio không có thời lượng nên
             không tính vào tổng, không bịa số. */
          var pdiv = await makeBitmapText(fontId, fmtTime(playlistTotalTime()), w, align, color, valign, h);
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
        var demoText = { "Bitrate": "128", "Frequency": "44" }[id];
        var tdiv2 = await makeBitmapText(fontId, demoText !== undefined ? demoText : def, w, align, color, valign, h);
        div.appendChild(tdiv2);
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
        var t = DEMO_TRACKS[demo.track];
        text = t.name;
        if (rec.showlen) text += " (" + fmtTime(t.len) + ")";
      }
      var tdiv = await makeBitmapText(rec.fontId, text, rec.boxW, "left", color);
      rec.holder.innerHTML = "";
      rec.holder.appendChild(tdiv);
      rec.textW = tdiv._textW || 0;
      rec.offset = 0;
      inheritAbs(rec.div);
    }
    async function updateTimerEls() {
      for (var i = 0; i < timerEls.length; i++) {
        var rec = timerEls[i];
        var tdiv = await makeBitmapText(rec.fontId, fmtTime(demo.t), rec.boxW, rec.align, rec.color);
        rec.div.innerHTML = "";
        rec.div.appendChild(tdiv);
        inheritAbs(rec.div);
      }
    }
    /* Vẽ lại PLTime (tổng thời gian playlist) tại chỗ sau khi thêm/xóa/
       sắp xếp mục — không cần re-render toàn cửa sổ. */
    async function updateInfoEls() {
      for (var i = 0; i < infoEls.length; i++) {
        var rec = infoEls[i];
        if (rec.kind !== "pltime") continue;
        var tdiv = await makeBitmapText(rec.fontId, fmtTime(playlistTotalTime()), rec.boxW, rec.align, rec.color, rec.valign, rec.boxH);
        rec.div.innerHTML = "";
        rec.div.appendChild(tdiv);
        inheritAbs(rec.div);
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
    }
    function updateProgress() {
      for (var i = 0; i < progressEls.length; i++) {
        progressEls[i].div.style.width = Math.round(demo.seekFrac * progressEls[i].fullW) + "px";
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
       (động nhẹ: avsPhase tăng dần, sóng trượt). */
    function drawVisStatic() {
      var freq = null;
      if (avsAnalyser && typeof avsAnalyser.getByteFrequencyData === "function" && avsAnalyser.frequencyBinCount) {
        try {
          freq = new Uint8Array(avsAnalyser.frequencyBinCount);
          avsAnalyser.getByteFrequencyData(freq);
        } catch (e) { freq = null; }
      }
      var col = (VIS_VARIANTS[avsState.visVariant] || VIS_VARIANTS[0]).col;
      for (var i = 0; i < visCanvases.length; i++) {
        var v = visCanvases[i];
        var ctx2 = null;
        try { ctx2 = v.cv.getContext("2d"); } catch (e) { ctx2 = null; }
        if (!ctx2) continue;
        var W = v.cv.width, H = v.cv.height;
        ctx2.clearRect(0, 0, W, H);
        ctx2.fillStyle = VIS_BG;
        ctx2.fillRect(0, 0, W, H);
        var n = VIS_BANDS, bw = W / n;
        ctx2.fillStyle = col;
        for (var k = 0; k < n; k++) {
          var hh;
          if (freq) {
            var bin = freq[Math.floor(k * freq.length / n)] || 0;
            hh = 2 + (bin / 255) * (H - 6);
          } else {
            hh = 2 + Math.abs(Math.sin(k * 0.9 + avsPhase)) * (H - 6);
          }
          ctx2.fillRect(k * bw + 1, H - hh, bw - 2, hh);
        }
      }
    }
    /* Vòng động nhẹ cho AVS đang mở: mỗi frame tăng phase rồi vẽ lại.
       Không có requestAnimationFrame (jsdom) thì không chạy vòng — test
       gọi drawVisStatic trực tiếp. Dừng ngay khi đóng AVS. */
    function startAvsAnim() {
      if (typeof requestAnimationFrame !== "function") return false;
      if (avsRafId) return true;
      var frame = function () {
        avsRafId = 0;
        if (!avsState.open) return;
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
      visCanvases.push({ cv: m.canvas, bands: new Array(VIS_BANDS).fill(2) });
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
    async function buildDetachedWindowModel(win, kind) {
      var winCtx = {
        overrides: new Map(), hiddenIds: new Set(), drawerTab: drawerTab,
        titleText: kind === "video" ? "VIDEO" : "VISUALIZATION",
        frameHidden: new Set(), avsOpen: true, avsMode: kind, windowKind: kind
      };
      var frameDiv = document.createElement("div");
      frameDiv.style.position = "absolute"; frameDiv.style.left = "0px"; frameDiv.style.top = "0px";
      frameDiv.style.width = DETACHED_WIN_W + "px"; frameDiv.style.height = DETACHED_WIN_H + "px";
      frameDiv.style.pointerEvents = "none";
      setAbs(frameDiv, win, 0, 0);
      win.appendChild(frameDiv);
      if (RES.groupdefs["wasabi.standard.layout"]) {
        await renderChildren(RES.groupdefs["wasabi.standard.layout"], frameDiv, DETACHED_WIN_W, DETACHED_WIN_H, winCtx, 0);
      }
      var innerDiv = document.createElement("div");
      innerDiv.style.position = "absolute"; innerDiv.style.left = "0px"; innerDiv.style.top = "18px";
      innerDiv.style.width = DETACHED_WIN_W + "px"; innerDiv.style.height = (DETACHED_WIN_H - 18) + "px";
      innerDiv.style.pointerEvents = "none";
      setAbs(innerDiv, win, 0, 18);
      win.appendChild(innerDiv);
      var frameGid = kind === "video" ? "video.frame.layout" : "vis.frame.layout";
      if (RES.groupdefs[frameGid]) {
        await renderChildren(RES.groupdefs[frameGid], innerDiv, DETACHED_WIN_W, DETACHED_WIN_H - 18, winCtx, 0);
      }
      attachAvsMedia(win, DETACHED_MEDIA_RECT);
    }
    /* Classic (không có model): khung HTML dự phòng — titlebar tối +
       nút ✕, hộp media đen, thanh nút HTML (Video: 1x/2x/Fullscreen/
       Reattach + VID_Info; Vis: Prev/Next/Random/Reattach). Nút Reattach
       ở đây không làm gì được (không có vùng nhúng để về) — bấm vẫn gọi
       reattachAvs nhưng nó trả state không đổi, ghi rõ trong code. */
    function buildDetachedWindowFallback(win, kind) {
      var titleBar = document.createElement("div");
      titleBar.style.position = "absolute"; titleBar.style.left = "0px"; titleBar.style.top = "0px";
      titleBar.style.width = DETACHED_WIN_W + "px"; titleBar.style.height = "18px";
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
      attachAvsMedia(win, DETACHED_MEDIA_RECT);
      var bar = document.createElement("div");
      bar.style.position = "absolute"; bar.style.left = "5px"; bar.style.top = "178px";
      bar.style.width = "344px"; bar.style.height = "21px";
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
        mkBtn("1x", "scale1"); mkBtn("2x", "scale2"); mkBtn("Fullscreen", "fullscreen"); mkBtn("Reattach", "reattach");
        var info = document.createElement("span");
        info.dataset.vidInfo = "1";
        info.style.font = "11px Arial, sans-serif"; info.style.color = "#ddd";
        info.style.marginLeft = "8px";
        info.textContent = avsState.videoInfo || "";
        bar.appendChild(info);
      } else {
        mkBtn("Prev", "visprev"); mkBtn("Next", "visnext"); mkBtn("Random", "visrandom"); mkBtn("Reattach", "reattach");
      }
    }
    /* Gắn 1 cửa sổ rời vào stage tại topY cho trước; trả về chiều cao
       cửa sổ (200). Chỉ có 1 cửa sổ rời tại 1 thời điểm — loại theo
       mode đang hiện (video → cửa sổ Video, vis → cửa sổ Vis). */
    async function appendDetachedWindow(T, topY) {
      var kind = avsState.mode;
      var win = document.createElement("div");
      win.style.position = "absolute"; win.style.left = "0px"; win.style.top = topY + "px";
      win.style.width = DETACHED_WIN_W + "px"; win.style.height = DETACHED_WIN_H + "px";
      win.style.pointerEvents = "none";
      win.dataset.avsDetached = "1"; win.dataset.window = kind;
      win._absX = T._absX || 0; win._absY = (T._absY || 0) + topY;
      T.appendChild(win);
      var hasModel = !!(RES.groupdefs && (RES.groupdefs["wasabi.standard.layout"] || RES.groupdefs["video.frame.layout"]));
      if (hasModel) await buildDetachedWindowModel(win, kind);
      else buildDetachedWindowFallback(win, kind);
      return DETACHED_WIN_H;
    }
    /* Skin Classic: stage chỉ chứa cửa sổ rời (nếu đang mở), không thì
       trống — không có layout main để vẽ. Trả về chiều cao stage. */
    async function renderClassicStage(T) {
      T.style.width = DETACHED_WIN_W + "px";
      var h = 0;
      if (avsState.open && avsState.detached) h = await appendDetachedWindow(T, 0);
      T.style.height = h + "px";
      drawVisStatic();
      if (avsState.open) startAvsAnim(); else stopAvsAnim();
      return h;
    }

    /* Vẽ 1 layout. Trả về chiều cao cuối sau trim (và sau shift nếu có). */
    async function renderLayout(container, layoutId, titleText, opts, stage) {
      opts = opts || {};
      var T = stage || lastStage;
      if (!T) throw new Error("renderLayout: chưa có stage");
      if (!RES) throw new Error("Chưa nạp skin nào.");
      lastStage = T;
      visCanvases = []; statusEls = []; tickerEls = []; timerEls = [];
      progressEls = []; volumebarEls = []; infoEls = []; sliderRecords = [];
      cfgGroups = {}; cfDisplayEls = []; vidInfoEls = [];
      plListDiv = null; plSearchInput = null;
      T.innerHTML = "";
      var lay = RES.layouts[container + "|" + layoutId] || RES.layouts[layoutId];
      if (!lay) {
        /* Đợt D — skin Classic không có layout nào: cửa sổ chính không vẽ
           được từ model; stage chỉ chứa cửa sổ rời (nếu đang mở). */
        if (RES.kind === "classic" && container === "main") {
          lastLayout = null; lastTitle = titleText || "";
          return await renderClassicStage(T);
        }
        throw new Error("Không tìm được layout '" + layoutId + "' của '" + container + "'.");
      }
      var layEl = lay.el;
      var LW = intAttr(layEl, "w", 354), LH = intAttr(layEl, "h", 280);
      T.style.width = LW + "px"; T.style.height = LH + "px";
      /* renderStacked truyền playerDiv/plDiv đã đặt _absY (plDiv = playerH):
         GIỮ NGUYÊN offset đó, chỉ mặc định 0 khi vẽ trực tiếp lên stage.
         (Gán 0 ở đây từng xóa offset plDiv khiến mọi _absY của playlist
         trong stacked sai — list y=41 thay vì 197.) */
      if (typeof T._absX !== "number") T._absX = 0;
      if (typeof T._absY !== "number") T._absY = 0;
      lastLayout = lay; lastTitle = titleText || "";
      var ctx = { overrides: new Map(), hiddenIds: new Set(), drawerTab: drawerTab, titleText: titleText || "", frameHidden: new Set(), avsH: lay.snapadjustbottom || VIDEO_SHIFT, windowKind: container === "Pledit" ? "playlist" : "player" };
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
      await renderChildren(kids, T, LW, LH, ctx, 0);
      /* Ngăn kéo + video (đợt B):
         - MỞ MỘT BƯỚC: đặt thẳng top cuối = restY + drawerInnerY(open)
           (không rAF hai bước như v8 — kiểu đó kẹt ở vị trí đóng khi frame
           rAF không chạy, xem V8-BUGS Lỗi 2). Đóng = vị trí nghỉ, chỉ lộ
           13px + nút mở dưới đáy main. Vị trí đặt thẳng trong lúc vẽ nên
           không có trạng thái trung gian để kẹt.
         - Video mở + ngăn kéo cùng lúc: main lùi 116 trước, rồi tính
           drawerInnerY theo mainH mới (259) — vẫn chìm đúng 13px.
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
          var dH = parseInt(d.style.height || "0", 10) || 0;
          var snap = lay.snapadjustbottom || dH;
          var restY = (RES.drawer && RES.drawer.restY) || lay.drawerRestY || 17;
          /* mainB == mainH (đáy main tính từ đỉnh stage 0): 143 khi đóng
             video, 259 khi mở video — dùng luôn làm mainH cho drawerInnerY. */
          var innerY = drawerInnerY(!!drawerOpenOpt, mainB, snap, dH, restY);
          var dy = (restY + innerY) - dTop;
          d.style.top = (parseInt(d.style.top || "0", 10) + dy) + "px";
          shiftSubtree(d, dy);
          var sh = null;
          try { sh = T.querySelector('[data-gid="player.normal.drawer.shadow"]'); } catch (e) { sh = null; }
          if (sh) {
            sh.style.top = (parseInt(sh.style.top || "0", 10) + dy) + "px";
            shiftSubtree(sh, dy);
          }
          /* Đợt G — ghi lại top đóng/mở để tính độ dời animation, và áp
             transform ban đầu của lần trượt mở (pendingDrawerStartDy):
             render đặt thẳng top cuối, transform chỉ làm mượt đường đi. */
          lastDrawerTopCache.open = restY + drawerInnerY(true, mainB, snap, dH, restY);
          lastDrawerTopCache.closed = restY + drawerInnerY(false, mainB, snap, dH, restY);
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
      var totalH = finalH;
      if (avsState.open && avsState.detached && container === "main" && opts.noDetached !== true) {
        totalH = finalH + await appendDetachedWindow(T, finalH);
        T.style.height = totalH + "px";
      }
      drawVisStatic();
      /* Áp lại preset màu đang chọn (renderLayout xóa innerHTML nên <svg>
         defs + filter trên sprite mất theo; Default thì gỡ hết filter). */
      if (opts.applyTheme !== false) applyColorTheme(T);
      if (avsState.open) startAvsAnim(); else stopAvsAnim();
      return totalH;
    }

    /* Xếp chồng (viewer): player (+ ngăn kéo) rồi playlist xếp dưới.
       opts.drawerOpen: true = ngăn kéo mở (259), false = đóng (156).
       Đợt D: cửa sổ rời (nếu đang tách) xếp SAU playlist.
       Đợt G — opts.shadeMode: vẽ layout shade 354×25 thay cho main
       (không ngăn kéo, không AVS nhúng); playlist xếp dưới shade như
       xếp dưới main (stage = 25 + 145). */
    async function renderStacked(stage, opts) {
      opts = opts || {};
      var T = stage || lastStage;
      if (!T) throw new Error("renderStacked: chưa có stage");
      /* Skin Classic không có playlist để xếp: chỉ vẽ cửa sổ rời. */
      if (RES.kind === "classic") {
        T.innerHTML = "";
        T._absX = 0; T._absY = 0;
        return await renderClassicStage(T);
      }
      T.innerHTML = "";
      T.style.width = "436px";
      T._absX = 0; T._absY = 0;
      var playerDiv = document.createElement("div");
      playerDiv.style.position = "absolute"; playerDiv.style.left = "0px"; playerDiv.style.top = "0px";
      playerDiv._absX = 0; playerDiv._absY = 0;
      T.appendChild(playerDiv);
      var shadeMode = !!opts.shadeMode;
      var playerH = await renderLayout("main", shadeMode ? "shade" : "normal", "WINAMP", shadeMode ? { applyTheme: false, noDetached: true } : { drawerOpen: opts.drawerOpen !== undefined ? opts.drawerOpen : true, videoOpen: !!opts.videoOpen, applyTheme: false, noDetached: true }, playerDiv);
      /* Đợt E — renderLayout reset registry mỗi lần vẽ nên lượt Pledit sẽ
         xóa registry của cửa sổ chính (ticker/timer/status/thanh trượt/
         EQ...). Giữ lại registry của player rồi GỘP với registry của
         playlist để đồng hồ/chữ chạy/thanh trượt vẫn cập nhật khi xếp
         chồng (chế độ phát thường dùng). Không gộp thì timer/ticker đứng
         yên mỗi khi playlist mở. */
      var savedRegs = {
        vis: visCanvases, status: statusEls, ticker: tickerEls, timer: timerEls,
        progress: progressEls, volume: volumebarEls, info: infoEls,
        sliders: sliderRecords, cfg: cfgGroups, cf: cfDisplayEls, vid: vidInfoEls
      };
      var plDiv = document.createElement("div");
      plDiv.style.position = "absolute"; plDiv.style.left = "0px"; plDiv.style.top = playerH + "px";
      plDiv._absX = 0; plDiv._absY = playerH;
      T.appendChild(plDiv);
      var plH = await renderLayout("Pledit", "normal", "PLAYLIST EDITOR", { applyTheme: false, noDetached: true }, plDiv);
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
      var totalH = playerH + plH;
      if (avsState.open && avsState.detached) {
        totalH += await appendDetachedWindow(T, totalH);
      }
      T.style.height = totalH + "px";
      lastStage = T;
      drawVisStatic();
      applyColorTheme(T);
      return totalH;
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
      renderChildren: renderChildren, renderGroupInstance: renderGroupInstance,
      renderNode: renderNode, spriteDiv: spriteDiv,
      makeBitmapText: makeBitmapText, loadFont: loadFont, glyphURL: glyphURL,
      measureMaxBottom: measureMaxBottom, dumpGeometry: dumpGeometry,
      drawVisStatic: drawVisStatic,
      getDrawerTab: getDrawerTab, setDrawerTab: setDrawerTab,
      getDrawerState: getDrawerState, setDrawerOpen: setDrawerOpen,
      toggleDrawerAnimated: toggleDrawerAnimated, DRAWER_ANIM_MS: DRAWER_ANIM_MS,
      isShadeMuted: isShadeMuted, toggleShadeMute: toggleShadeMute,
      runDrawerSelfCheck: runDrawerSelfCheck, cfgOn: cfgOn,
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
      setVideoInfo: setVideoInfo, cycleVisVariant: cycleVisVariant,
      setAvsAnalyser: setAvsAnalyser, getAvsAnalyser: getAvsAnalyser,
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
      showTickerError: showTickerError, clearTickerError: clearTickerError,
      getTickerError: getTickerError,
      addLocalFiles: addLocalFiles, openLocalFolderPicker: openLocalFolderPicker,
      DETACHED_WIN_W: DETACHED_WIN_W, DETACHED_WIN_H: DETACHED_WIN_H,
      DETACHED_MEDIA_RECT: DETACHED_MEDIA_RECT, VIS_VARIANTS: VIS_VARIANTS,
      getPlaylistState: getPlaylistState, setPlaylistData: setPlaylistData,
      setPlaylistItems: setPlaylistItems, selectPlaylistItem: selectPlaylistItem,
      playPlaylistItem: playPlaylistItem, removePlaylistItem: removePlaylistItem,
      addPlaylistItem: addPlaylistItem, sortPlaylistByName: sortPlaylistByName,
      restorePlaylistOrder: restorePlaylistOrder, exportPlaylistM3U: exportPlaylistM3U,
      playlistTotalTime: playlistTotalTime, parseM3U: parseM3U,
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
