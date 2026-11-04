/* =====================================================================
   Amp v10.1 — classic.js: parser skin Classic (.wsz, Winamp 2).
   Chuyển parser của Webamp fork (captbaritone/webamp v2.3.1) sang JS
   thuần cho Amp, KHÔNG bê Redux/React — chỉ lấy dữ liệu định dạng +
   hàm thuần, rồi vẽ bằng renderer của Amp (div + background-image).

   Nguồn fork (xem ghi chú từng mục):
   - skinParser.js — giải .wsz: viscolor.txt, pledit.txt, genex (đọc
     pixel genex.bmp), region.txt, cắt sprite từ BMP, con trỏ .cur.
   - skinParserUtils.ts — getFileFromZip (không phân biệt hoa/thường,
     file trùng tên thì file SAU thắng), getPlaylistStyle, getGenExColors
     (22 màu hàng y=0 của genex.bmp, x=48,50,...,90), getSpriteUrisFromImg.
   - skinSprites.ts — BẢNG TỌA ĐỘ sprite của định dạng Winamp 2 (mọi skin
     Classic dùng chung bảng này; skin chỉ đổi ẢNH trong BMP).
     CLASSIC_SPRITES là bản sao y hệt (trừ khối GENEX fork đã comment).
   - regionParser.ts — region.txt (INI) -> đa giác [Normal]/[WindowShade]/[Equalizer].
   - components/MainWindow/*.tsx + css/main-window.css — HÌNH HỌC cửa sổ
     chính 275×116 + công thức nền volume/balance + chữ marquee 5×6 + vis 76×16.
   - utils.ts — parseIni, parseViscolors. baseSkin.json — 24 màu vis +
     playlistStyle mặc định (dùng khi skin thiếu viscolor.txt/pledit.txt).
   - skinSelectors.ts — digits lấy từ NUMS_EX khi có, không thì NUMBERS.

   KHÔNG lấy từ fork: vis FFTNullsoft, Options, KBPS/KHZ đo, media engine,
   playlist/m3u, React/Redux, SkinEngine_WAL, server skin-database.
   Con trỏ .cur: fork đọc nhưng Amp không dùng con trỏ riêng của skin
   (giữ con trỏ mặc định của trình duyệt) — chỉ liệt kê file .cur có mặt.

   Chạy được cả trình duyệt (window) lẫn Node (module.exports, dùng với
   jsdom trong test). Ảnh BMP đọc bằng header (bmpSizeFromBytes) để kiểm
   tra, KHÔNG giải mã pixel trong file này: trình duyệt hiển thị BMP
   trực tiếp qua blob: URL (Chrome/Firefox hỗ trợ BMP), renderer cắt
   sprite bằng background-position như Modern (spriteDiv).
   ===================================================================== */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory();
  else root.AmpClassic = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var CLASSIC_VERSION = "10.7";
  var EXPECTED_CLASSIC_VERSION = "10.7";
  /* Manifest duy nhất window.AMP_VERSION (đặt ở index.html TRƯỚC khi nạp
     file này) — lệch thì MANIFEST_MISMATCH = true để trang báo "bản mix".
     Không có manifest (chạy test trực tiếp bằng require) thì không kiểm. */
  var MANIFEST_VERSION = (function () {
    try {
      if (typeof globalThis !== "undefined" && globalThis.AMP_VERSION) return globalThis.AMP_VERSION;
      if (typeof window !== "undefined" && window.AMP_VERSION) return window.AMP_VERSION;
    } catch (e) { /* bỏ qua */ }
    return null;
  })();
  var MANIFEST_MISMATCH = MANIFEST_VERSION !== null && MANIFEST_VERSION !== CLASSIC_VERSION;
  if (CLASSIC_VERSION !== EXPECTED_CLASSIC_VERSION) {
    throw new Error("classic.js: CLASSIC_VERSION (" + CLASSIC_VERSION + ") khac EXPECTED_CLASSIC_VERSION (" + EXPECTED_CLASSIC_VERSION + ") — ban mix, dung lai");
  }

  /* ---------------- bảng sprite định dạng Winamp 2 ----------------
     Sao y skinSprites.ts của fork (tên sheet = tên file BMP không đuôi,
     tên sprite = khóa dùng trong skinSelectors.ts). TEXT là font 5×6
     sinh từ FONT_LOOKUP (giống fork: characterSprites). */
  var FONT_LOOKUP = {
    a: [0, 0], b: [0, 1], c: [0, 2], d: [0, 3], e: [0, 4], f: [0, 5],
    g: [0, 6], h: [0, 7], i: [0, 8], j: [0, 9], k: [0, 10], l: [0, 11],
    m: [0, 12], n: [0, 13], o: [0, 14], p: [0, 15], q: [0, 16],
    r: [0, 17], s: [0, 18], t: [0, 19], u: [0, 20], v: [0, 21],
    w: [0, 22], x: [0, 23], y: [0, 24], z: [0, 25],
    '"': [0, 26], "@": [0, 27], " ": [0, 30],
    "0": [1, 0], "1": [1, 1], "2": [1, 2], "3": [1, 3], "4": [1, 4],
    "5": [1, 5], "6": [1, 6], "7": [1, 7], "8": [1, 8], "9": [1, 9],
    "…": [1, 10], ".": [1, 11], ":": [1, 12], "(": [1, 13], ")": [1, 14],
    "-": [1, 15], "'": [1, 16], "!": [1, 17], _: [1, 18], "+": [1, 19],
    "\\": [1, 20], "/": [1, 21], "[": [1, 22], "]": [1, 23], "^": [1, 24],
    "&": [1, 25], "%": [1, 26], ",": [1, 27], "=": [1, 28], $: [1, 29],
    "#": [1, 30],
    "Å": [2, 0], "Ö": [2, 1], "Ä": [2, 2], "?": [2, 3], "*": [2, 4],
    "<": [1, 22], ">": [1, 23], "{": [1, 22], "}": [1, 23]
  };
  var CHAR_X = 5, CHAR_Y = 6;
  function imageConstFromChar(ch) { return "CHARACTER_" + ch.charCodeAt(0); }
  var characterSprites = [];
  (function () {
    var key;
    for (key in FONT_LOOKUP) {
      if (!Object.prototype.hasOwnProperty.call(FONT_LOOKUP, key)) continue;
      var pos = FONT_LOOKUP[key];
      characterSprites.push({
        name: imageConstFromChar(key),
        y: pos[0] * CHAR_Y, x: pos[1] * CHAR_X,
        width: CHAR_X, height: CHAR_Y
      });
    }
  })();

  var CLASSIC_SPRITES = {
    BALANCE: [
      { name: "MAIN_BALANCE_BACKGROUND", x: 9, y: 0, width: 38, height: 420 },
      { name: "MAIN_BALANCE_THUMB", x: 15, y: 422, width: 14, height: 11 },
      { name: "MAIN_BALANCE_THUMB_ACTIVE", x: 0, y: 422, width: 14, height: 11 }
    ],
    CBUTTONS: [
      { name: "MAIN_PREVIOUS_BUTTON", x: 0, y: 0, width: 23, height: 18 },
      { name: "MAIN_PREVIOUS_BUTTON_ACTIVE", x: 0, y: 18, width: 23, height: 18 },
      { name: "MAIN_PLAY_BUTTON", x: 23, y: 0, width: 23, height: 18 },
      { name: "MAIN_PLAY_BUTTON_ACTIVE", x: 23, y: 18, width: 23, height: 18 },
      { name: "MAIN_PAUSE_BUTTON", x: 46, y: 0, width: 23, height: 18 },
      { name: "MAIN_PAUSE_BUTTON_ACTIVE", x: 46, y: 18, width: 23, height: 18 },
      { name: "MAIN_STOP_BUTTON", x: 69, y: 0, width: 23, height: 18 },
      { name: "MAIN_STOP_BUTTON_ACTIVE", x: 69, y: 18, width: 23, height: 18 },
      { name: "MAIN_NEXT_BUTTON", x: 92, y: 0, width: 23, height: 18 },
      { name: "MAIN_NEXT_BUTTON_ACTIVE", x: 92, y: 18, width: 22, height: 18 },
      { name: "MAIN_EJECT_BUTTON", x: 114, y: 0, width: 22, height: 16 },
      { name: "MAIN_EJECT_BUTTON_ACTIVE", x: 114, y: 16, width: 22, height: 16 }
    ],
    MAIN: [
      { name: "MAIN_WINDOW_BACKGROUND", x: 0, y: 0, width: 275, height: 116 }
    ],
    MONOSTER: [
      { name: "MAIN_STEREO", x: 0, y: 12, width: 29, height: 12 },
      { name: "MAIN_STEREO_SELECTED", x: 0, y: 0, width: 29, height: 12 },
      { name: "MAIN_MONO", x: 29, y: 12, width: 27, height: 12 },
      { name: "MAIN_MONO_SELECTED", x: 29, y: 0, width: 27, height: 12 }
    ],
    NUMBERS: [
      { name: "NO_MINUS_SIGN", x: 9, y: 6, width: 5, height: 1 },
      { name: "MINUS_SIGN", x: 20, y: 6, width: 5, height: 1 },
      { name: "DIGIT_0", x: 0, y: 0, width: 9, height: 13 },
      { name: "DIGIT_1", x: 9, y: 0, width: 9, height: 13 },
      { name: "DIGIT_2", x: 18, y: 0, width: 9, height: 13 },
      { name: "DIGIT_3", x: 27, y: 0, width: 9, height: 13 },
      { name: "DIGIT_4", x: 36, y: 0, width: 9, height: 13 },
      { name: "DIGIT_5", x: 45, y: 0, width: 9, height: 13 },
      { name: "DIGIT_6", x: 54, y: 0, width: 9, height: 13 },
      { name: "DIGIT_7", x: 63, y: 0, width: 9, height: 13 },
      { name: "DIGIT_8", x: 72, y: 0, width: 9, height: 13 },
      { name: "DIGIT_9", x: 81, y: 0, width: 9, height: 13 }
    ],
    NUMS_EX: [
      { name: "NO_MINUS_SIGN_EX", x: 90, y: 0, width: 9, height: 13 },
      { name: "MINUS_SIGN_EX", x: 99, y: 0, width: 9, height: 13 },
      { name: "DIGIT_0_EX", x: 0, y: 0, width: 9, height: 13 },
      { name: "DIGIT_1_EX", x: 9, y: 0, width: 9, height: 13 },
      { name: "DIGIT_2_EX", x: 18, y: 0, width: 9, height: 13 },
      { name: "DIGIT_3_EX", x: 27, y: 0, width: 9, height: 13 },
      { name: "DIGIT_4_EX", x: 36, y: 0, width: 9, height: 13 },
      { name: "DIGIT_5_EX", x: 45, y: 0, width: 9, height: 13 },
      { name: "DIGIT_6_EX", x: 54, y: 0, width: 9, height: 13 },
      { name: "DIGIT_7_EX", x: 63, y: 0, width: 9, height: 13 },
      { name: "DIGIT_8_EX", x: 72, y: 0, width: 9, height: 13 },
      { name: "DIGIT_9_EX", x: 81, y: 0, width: 9, height: 13 }
    ],
    PLAYPAUS: [
      { name: "MAIN_PLAYING_INDICATOR", x: 0, y: 0, width: 9, height: 9 },
      { name: "MAIN_PAUSED_INDICATOR", x: 9, y: 0, width: 9, height: 9 },
      { name: "MAIN_STOPPED_INDICATOR", x: 18, y: 0, width: 9, height: 9 },
      { name: "MAIN_NOT_WORKING_INDICATOR", x: 36, y: 0, width: 9, height: 9 },
      { name: "MAIN_WORKING_INDICATOR", x: 39, y: 0, width: 9, height: 9 }
    ],
    PLEDIT: [
      { name: "PLAYLIST_TOP_TILE", x: 127, y: 21, width: 25, height: 20 },
      { name: "PLAYLIST_TOP_LEFT_CORNER", x: 0, y: 21, width: 25, height: 20 },
      { name: "PLAYLIST_TITLE_BAR", x: 26, y: 21, width: 100, height: 20 },
      { name: "PLAYLIST_TOP_RIGHT_CORNER", x: 153, y: 21, width: 25, height: 20 },
      { name: "PLAYLIST_TOP_TILE_SELECTED", x: 127, y: 0, width: 25, height: 20 },
      { name: "PLAYLIST_TOP_LEFT_SELECTED", x: 0, y: 0, width: 25, height: 20 },
      { name: "PLAYLIST_TITLE_BAR_SELECTED", x: 26, y: 0, width: 100, height: 20 },
      { name: "PLAYLIST_TOP_RIGHT_CORNER_SELECTED", x: 153, y: 0, width: 25, height: 20 },
      { name: "PLAYLIST_LEFT_TILE", x: 0, y: 42, width: 12, height: 29 },
      { name: "PLAYLIST_RIGHT_TILE", x: 31, y: 42, width: 20, height: 29 },
      { name: "PLAYLIST_BOTTOM_TILE", x: 179, y: 0, width: 25, height: 38 },
      { name: "PLAYLIST_BOTTOM_LEFT_CORNER", x: 0, y: 72, width: 125, height: 38 },
      { name: "PLAYLIST_BOTTOM_RIGHT_CORNER", x: 126, y: 72, width: 150, height: 38 },
      { name: "PLAYLIST_VISUALIZER_BACKGROUND", x: 205, y: 0, width: 75, height: 38 },
      { name: "PLAYLIST_SHADE_BACKGROUND", x: 72, y: 57, width: 25, height: 14 },
      { name: "PLAYLIST_SHADE_BACKGROUND_LEFT", x: 72, y: 42, width: 25, height: 14 },
      { name: "PLAYLIST_SHADE_BACKGROUND_RIGHT", x: 99, y: 57, width: 50, height: 14 },
      { name: "PLAYLIST_SHADE_BACKGROUND_RIGHT_SELECTED", x: 99, y: 42, width: 50, height: 14 },
      { name: "PLAYLIST_SCROLL_HANDLE_SELECTED", x: 61, y: 53, width: 8, height: 18 },
      { name: "PLAYLIST_SCROLL_HANDLE", x: 52, y: 53, width: 8, height: 18 },
      { name: "PLAYLIST_ADD_URL", x: 0, y: 111, width: 22, height: 18 },
      { name: "PLAYLIST_ADD_URL_SELECTED", x: 23, y: 111, width: 22, height: 18 },
      { name: "PLAYLIST_ADD_DIR", x: 0, y: 130, width: 22, height: 18 },
      { name: "PLAYLIST_ADD_DIR_SELECTED", x: 23, y: 130, width: 22, height: 18 },
      { name: "PLAYLIST_ADD_FILE", x: 0, y: 149, width: 22, height: 18 },
      { name: "PLAYLIST_ADD_FILE_SELECTED", x: 23, y: 149, width: 22, height: 18 },
      { name: "PLAYLIST_REMOVE_ALL", x: 54, y: 111, width: 22, height: 18 },
      { name: "PLAYLIST_REMOVE_ALL_SELECTED", x: 77, y: 111, width: 22, height: 18 },
      { name: "PLAYLIST_CROP", x: 54, y: 130, width: 22, height: 18 },
      { name: "PLAYLIST_CROP_SELECTED", x: 77, y: 130, width: 22, height: 18 },
      { name: "PLAYLIST_REMOVE_SELECTED", x: 54, y: 149, width: 22, height: 18 },
      { name: "PLAYLIST_REMOVE_SELECTED_SELECTED", x: 77, y: 149, width: 22, height: 18 },
      { name: "PLAYLIST_REMOVE_MISC", x: 54, y: 168, width: 22, height: 18 },
      { name: "PLAYLIST_REMOVE_MISC_SELECTED", x: 77, y: 168, width: 22, height: 18 },
      { name: "PLAYLIST_INVERT_SELECTION", x: 104, y: 111, width: 22, height: 18 },
      { name: "PLAYLIST_INVERT_SELECTION_SELECTED", x: 127, y: 111, width: 22, height: 18 },
      { name: "PLAYLIST_SELECT_ZERO", x: 104, y: 130, width: 22, height: 18 },
      { name: "PLAYLIST_SELECT_ZERO_SELECTED", x: 127, y: 130, width: 22, height: 18 },
      { name: "PLAYLIST_SELECT_ALL", x: 104, y: 149, width: 22, height: 18 },
      { name: "PLAYLIST_SELECT_ALL_SELECTED", x: 127, y: 149, width: 22, height: 18 },
      { name: "PLAYLIST_SORT_LIST", x: 154, y: 111, width: 22, height: 18 },
      { name: "PLAYLIST_SORT_LIST_SELECTED", x: 177, y: 111, width: 22, height: 18 },
      { name: "PLAYLIST_FILE_INFO", x: 154, y: 130, width: 22, height: 18 },
      { name: "PLAYLIST_FILE_INFO_SELECTED", x: 177, y: 130, width: 22, height: 18 },
      { name: "PLAYLIST_MISC_OPTIONS", x: 154, y: 149, width: 22, height: 18 },
      { name: "PLAYLIST_MISC_OPTIONS_SELECTED", x: 177, y: 149, width: 22, height: 18 },
      { name: "PLAYLIST_NEW_LIST", x: 204, y: 111, width: 22, height: 18 },
      { name: "PLAYLIST_NEW_LIST_SELECTED", x: 227, y: 111, width: 22, height: 18 },
      { name: "PLAYLIST_SAVE_LIST", x: 204, y: 130, width: 22, height: 18 },
      { name: "PLAYLIST_SAVE_LIST_SELECTED", x: 227, y: 130, width: 22, height: 18 },
      { name: "PLAYLIST_LOAD_LIST", x: 204, y: 149, width: 22, height: 18 },
      { name: "PLAYLIST_LOAD_LIST_SELECTED", x: 227, y: 149, width: 22, height: 18 },
      { name: "PLAYLIST_ADD_MENU_BAR", x: 48, y: 111, width: 3, height: 54 },
      { name: "PLAYLIST_REMOVE_MENU_BAR", x: 100, y: 111, width: 3, height: 72 },
      { name: "PLAYLIST_SELECT_MENU_BAR", x: 150, y: 111, width: 3, height: 54 },
      { name: "PLAYLIST_MISC_MENU_BAR", x: 200, y: 111, width: 3, height: 54 },
      { name: "PLAYLIST_LIST_BAR", x: 250, y: 111, width: 3, height: 54 },
      { name: "PLAYLIST_CLOSE_SELECTED", x: 52, y: 42, width: 9, height: 9 },
      { name: "PLAYLIST_COLLAPSE_SELECTED", x: 62, y: 42, width: 9, height: 9 },
      { name: "PLAYLIST_EXPAND_SELECTED", x: 150, y: 42, width: 9, height: 9 }
    ],
    EQ_EX: [
      { name: "EQ_SHADE_BACKGROUND_SELECTED", x: 0, y: 0, width: 275, height: 14 },
      { name: "EQ_SHADE_BACKGROUND", x: 0, y: 15, width: 275, height: 14 },
      { name: "EQ_SHADE_VOLUME_SLIDER_LEFT", x: 1, y: 30, width: 3, height: 7 },
      { name: "EQ_SHADE_VOLUME_SLIDER_CENTER", x: 4, y: 30, width: 3, height: 7 },
      { name: "EQ_SHADE_VOLUME_SLIDER_RIGHT", x: 7, y: 30, width: 3, height: 7 },
      { name: "EQ_SHADE_BALANCE_SLIDER_LEFT", x: 11, y: 30, width: 3, height: 7 },
      { name: "EQ_SHADE_BALANCE_SLIDER_CENTER", x: 14, y: 30, width: 3, height: 7 },
      { name: "EQ_SHADE_BALANCE_SLIDER_RIGHT", x: 17, y: 30, width: 3, height: 7 },
      { name: "EQ_MAXIMIZE_BUTTON_ACTIVE", x: 1, y: 38, width: 9, height: 9 },
      { name: "EQ_MINIMIZE_BUTTON_ACTIVE", x: 1, y: 47, width: 9, height: 9 },
      { name: "EQ_SHADE_CLOSE_BUTTON", x: 11, y: 38, width: 9, height: 9 },
      { name: "EQ_SHADE_CLOSE_BUTTON_ACTIVE", x: 11, y: 47, width: 9, height: 9 }
    ],
    EQMAIN: [
      { name: "EQ_WINDOW_BACKGROUND", x: 0, y: 0, width: 275, height: 116 },
      { name: "EQ_TITLE_BAR", x: 0, y: 149, width: 275, height: 14 },
      { name: "EQ_TITLE_BAR_SELECTED", x: 0, y: 134, width: 275, height: 14 },
      { name: "EQ_SLIDER_BACKGROUND", x: 13, y: 164, width: 209, height: 129 },
      { name: "EQ_SLIDER_THUMB", x: 0, y: 164, width: 11, height: 11 },
      { name: "EQ_SLIDER_THUMB_SELECTED", x: 0, y: 176, width: 11, height: 11 },
      { name: "EQ_CLOSE_BUTTON", x: 0, y: 116, width: 9, height: 9 },
      { name: "EQ_CLOSE_BUTTON_ACTIVE", x: 0, y: 125, width: 9, height: 9 },
      { name: "EQ_MAXIMIZE_BUTTON_ACTIVE_FALLBACK", x: 254, y: 152, width: 9, height: 9 },
      { name: "EQ_ON_BUTTON", x: 10, y: 119, width: 26, height: 12 },
      { name: "EQ_ON_BUTTON_DEPRESSED", x: 128, y: 119, width: 26, height: 12 },
      { name: "EQ_ON_BUTTON_SELECTED", x: 69, y: 119, width: 26, height: 12 },
      { name: "EQ_ON_BUTTON_SELECTED_DEPRESSED", x: 187, y: 119, width: 26, height: 12 },
      { name: "EQ_AUTO_BUTTON", x: 36, y: 119, width: 32, height: 12 },
      { name: "EQ_AUTO_BUTTON_DEPRESSED", x: 154, y: 119, width: 32, height: 12 },
      { name: "EQ_AUTO_BUTTON_SELECTED", x: 95, y: 119, width: 32, height: 12 },
      { name: "EQ_AUTO_BUTTON_SELECTED_DEPRESSED", x: 213, y: 119, width: 32, height: 12 },
      { name: "EQ_GRAPH_BACKGROUND", x: 0, y: 294, width: 113, height: 19 },
      { name: "EQ_GRAPH_LINE_COLORS", x: 115, y: 294, width: 1, height: 19 },
      { name: "EQ_PRESETS_BUTTON", x: 224, y: 164, width: 44, height: 12 },
      { name: "EQ_PRESETS_BUTTON_SELECTED", x: 224, y: 176, width: 44, height: 12 },
      { name: "EQ_PREAMP_LINE", x: 0, y: 314, width: 113, height: 1 }
    ],
    POSBAR: [
      { name: "MAIN_POSITION_SLIDER_BACKGROUND", x: 0, y: 0, width: 248, height: 10 },
      { name: "MAIN_POSITION_SLIDER_THUMB", x: 248, y: 0, width: 29, height: 10 },
      { name: "MAIN_POSITION_SLIDER_THUMB_SELECTED", x: 278, y: 0, width: 29, height: 10 }
    ],
    SHUFREP: [
      { name: "MAIN_SHUFFLE_BUTTON", x: 28, y: 0, width: 47, height: 15 },
      { name: "MAIN_SHUFFLE_BUTTON_DEPRESSED", x: 28, y: 15, width: 47, height: 15 },
      { name: "MAIN_SHUFFLE_BUTTON_SELECTED", x: 28, y: 30, width: 47, height: 15 },
      { name: "MAIN_SHUFFLE_BUTTON_SELECTED_DEPRESSED", x: 28, y: 45, width: 47, height: 15 },
      { name: "MAIN_REPEAT_BUTTON", x: 0, y: 0, width: 28, height: 15 },
      { name: "MAIN_REPEAT_BUTTON_DEPRESSED", x: 0, y: 15, width: 28, height: 15 },
      { name: "MAIN_REPEAT_BUTTON_SELECTED", x: 0, y: 30, width: 28, height: 15 },
      { name: "MAIN_REPEAT_BUTTON_SELECTED_DEPRESSED", x: 0, y: 45, width: 28, height: 15 },
      { name: "MAIN_EQ_BUTTON", x: 0, y: 61, width: 23, height: 12 },
      { name: "MAIN_EQ_BUTTON_SELECTED", x: 0, y: 73, width: 23, height: 12 },
      { name: "MAIN_EQ_BUTTON_DEPRESSED", x: 46, y: 61, width: 23, height: 12 },
      { name: "MAIN_EQ_BUTTON_DEPRESSED_SELECTED", x: 46, y: 73, width: 23, height: 12 },
      { name: "MAIN_PLAYLIST_BUTTON", x: 23, y: 61, width: 23, height: 12 },
      { name: "MAIN_PLAYLIST_BUTTON_SELECTED", x: 23, y: 73, width: 23, height: 12 },
      { name: "MAIN_PLAYLIST_BUTTON_DEPRESSED", x: 69, y: 61, width: 23, height: 12 },
      { name: "MAIN_PLAYLIST_BUTTON_DEPRESSED_SELECTED", x: 69, y: 73, width: 23, height: 12 }
    ],
    TEXT: characterSprites,
    TITLEBAR: [
      { name: "MAIN_TITLE_BAR", x: 27, y: 15, width: 275, height: 14 },
      { name: "MAIN_TITLE_BAR_SELECTED", x: 27, y: 0, width: 275, height: 14 },
      { name: "MAIN_EASTER_EGG_TITLE_BAR", x: 27, y: 72, width: 275, height: 14 },
      { name: "MAIN_EASTER_EGG_TITLE_BAR_SELECTED", x: 27, y: 57, width: 275, height: 14 },
      { name: "MAIN_OPTIONS_BUTTON", x: 0, y: 0, width: 9, height: 9 },
      { name: "MAIN_OPTIONS_BUTTON_DEPRESSED", x: 0, y: 9, width: 9, height: 9 },
      { name: "MAIN_MINIMIZE_BUTTON", x: 9, y: 0, width: 9, height: 9 },
      { name: "MAIN_MINIMIZE_BUTTON_DEPRESSED", x: 9, y: 9, width: 9, height: 9 },
      { name: "MAIN_SHADE_BUTTON", x: 0, y: 18, width: 9, height: 9 },
      { name: "MAIN_SHADE_BUTTON_DEPRESSED", x: 9, y: 18, width: 9, height: 9 },
      { name: "MAIN_CLOSE_BUTTON", x: 18, y: 0, width: 9, height: 9 },
      { name: "MAIN_CLOSE_BUTTON_DEPRESSED", x: 18, y: 9, width: 9, height: 9 },
      { name: "MAIN_CLUTTER_BAR_BACKGROUND", x: 304, y: 0, width: 8, height: 43 },
      { name: "MAIN_CLUTTER_BAR_BACKGROUND_DISABLED", x: 312, y: 0, width: 8, height: 43 },
      { name: "MAIN_CLUTTER_BAR_BUTTON_O_SELECTED", x: 304, y: 47, width: 8, height: 8 },
      { name: "MAIN_CLUTTER_BAR_BUTTON_A_SELECTED", x: 312, y: 55, width: 8, height: 7 },
      { name: "MAIN_CLUTTER_BAR_BUTTON_I_SELECTED", x: 320, y: 62, width: 8, height: 7 },
      { name: "MAIN_CLUTTER_BAR_BUTTON_D_SELECTED", x: 328, y: 69, width: 8, height: 8 },
      { name: "MAIN_CLUTTER_BAR_BUTTON_V_SELECTED", x: 336, y: 77, width: 8, height: 7 },
      { name: "MAIN_SHADE_BACKGROUND", x: 27, y: 42, width: 275, height: 14 },
      { name: "MAIN_SHADE_BACKGROUND_SELECTED", x: 27, y: 29, width: 275, height: 14 },
      { name: "MAIN_SHADE_BUTTON_SELECTED", x: 0, y: 27, width: 9, height: 9 },
      { name: "MAIN_SHADE_BUTTON_SELECTED_DEPRESSED", x: 9, y: 27, width: 9, height: 9 },
      { name: "MAIN_SHADE_POSITION_BACKGROUND", x: 0, y: 36, width: 17, height: 7 },
      { name: "MAIN_SHADE_POSITION_THUMB", x: 20, y: 36, width: 3, height: 7 },
      { name: "MAIN_SHADE_POSITION_THUMB_LEFT", x: 17, y: 36, width: 3, height: 7 },
      { name: "MAIN_SHADE_POSITION_THUMB_RIGHT", x: 23, y: 36, width: 3, height: 7 }
    ],
    VOLUME: [
      { name: "MAIN_VOLUME_BACKGROUND", x: 0, y: 0, width: 68, height: 420 },
      { name: "MAIN_VOLUME_THUMB", x: 15, y: 422, width: 14, height: 11 },
      { name: "MAIN_VOLUME_THUMB_SELECTED", x: 0, y: 422, width: 14, height: 11 }
    ],
    GEN: [
      { name: "GEN_TOP_LEFT_SELECTED", x: 0, y: 0, width: 25, height: 20 },
      { name: "GEN_TOP_LEFT_END_SELECTED", x: 26, y: 0, width: 25, height: 20 },
      { name: "GEN_TOP_CENTER_FILL_SELECTED", x: 52, y: 0, width: 25, height: 20 },
      { name: "GEN_TOP_RIGHT_END_SELECTED", x: 78, y: 0, width: 25, height: 20 },
      { name: "GEN_TOP_LEFT_RIGHT_FILL_SELECTED", x: 104, y: 0, width: 25, height: 20 },
      { name: "GEN_TOP_RIGHT_SELECTED", x: 130, y: 0, width: 25, height: 20 },
      { name: "GEN_TOP_LEFT", x: 0, y: 21, width: 25, height: 20 },
      { name: "GEN_TOP_LEFT_END", x: 26, y: 21, width: 25, height: 20 },
      { name: "GEN_TOP_CENTER_FILL", x: 52, y: 21, width: 25, height: 20 },
      { name: "GEN_TOP_RIGHT_END", x: 78, y: 21, width: 25, height: 20 },
      { name: "GEN_TOP_LEFT_RIGHT_FILL", x: 104, y: 21, width: 25, height: 20 },
      { name: "GEN_TOP_RIGHT", x: 130, y: 21, width: 25, height: 20 },
      { name: "GEN_BOTTOM_LEFT", x: 0, y: 42, width: 125, height: 14 },
      { name: "GEN_BOTTOM_RIGHT", x: 0, y: 57, width: 125, height: 14 },
      { name: "GEN_BOTTOM_FILL", x: 127, y: 72, width: 25, height: 14 },
      { name: "GEN_MIDDLE_LEFT", x: 127, y: 42, width: 11, height: 29 },
      { name: "GEN_MIDDLE_LEFT_BOTTOM", x: 158, y: 42, width: 11, height: 24 },
      { name: "GEN_MIDDLE_RIGHT", x: 139, y: 42, width: 8, height: 29 },
      { name: "GEN_MIDDLE_RIGHT_BOTTOM", x: 170, y: 42, width: 8, height: 24 },
      { name: "GEN_CLOSE_SELECTED", x: 148, y: 42, width: 9, height: 9 }
    ]
  };

  function spriteRect(sheet, name) {
    var list = CLASSIC_SPRITES[sheet];
    if (!list) return null;
    for (var i = 0; i < list.length; i++) {
      if (list[i].name === name) return list[i];
    }
    return null;
  }
  /* Chuẩn hoá 1 ký tự về khoá tra FONT_LOOKUP, y hệt Character.tsx của
     fork (lodash deburr + toLowerCase): bỏ dấu Latin (Đ->D, À->A, Ẵ->A)
     rồi hạ về chữ thường, vì bảng chỉ có khoá thường a-z (glyph trong
     TEXT.bmp là hình HOA — 'd' tra ra glyph D). Không chuẩn hoá thì chữ
     HOA ASCII rơi về trắng: "Da Nang" -> " A  ANG" (lỗi ticker v10.5:
     D và N hoa thành trắng). deburr ra 2 ký tự (vd 'ß'->'ss') thì lấy
     ký tự đầu như charCodeAt(0) của fork; không có thì về trắng. */
  function charKey(ch) {
    var c = String(ch == null ? "" : ch);
    try { c = c.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); } catch (e) { /* không có normalize */ }
    c = c.replace(/đ/g, "d").replace(/Đ/g, "D");
    /* Các chữ Latin không tách được bằng NFD (lodash deburr xử lý):
       ß->ss, Æ->Ae, Ø->O, Ð->D, Þ->Th, Ł->L, Œ->Oe... */
    c = c.replace(/[ßÆæØøÐðÞþŁłŒœĲĳŊŋ]/g, function (m) {
      return { "ß": "ss", "Æ": "Ae", "æ": "ae", "Ø": "O", "ø": "o", "Ð": "D", "ð": "d", "Þ": "Th", "þ": "th", "Ł": "L", "ł": "l", "Œ": "Oe", "œ": "oe", "Ĳ": "IJ", "ĳ": "ij", "Ŋ": "N", "ŋ": "n" }[m] || m;
    });
    c = c.toLowerCase();
    return c.charAt(0) || " ";
  }
  /* Sprite của 1 ký tự trong TEXT.bmp (font 5×6): ký tự không có trong
     bảng thì về ký tự trắng. */
  function charSprite(ch) {
    var pos = FONT_LOOKUP[charKey(ch)];
    if (!pos) pos = FONT_LOOKUP[" "];
    return { x: pos[1] * CHAR_X, y: pos[0] * CHAR_Y, width: CHAR_X, height: CHAR_Y };
  }

  /* ---------------- mặc định (baseSkin.json của fork) ---------------- */
  var DEFAULT_VISCOLORS = [
    "rgb(0,0,0)", "rgb(24,33,41)", "rgb(239,49,16)", "rgb(206,41,16)",
    "rgb(214,90,0)", "rgb(214,102,0)", "rgb(214,115,0)", "rgb(198,123,8)",
    "rgb(222,165,24)", "rgb(214,181,33)", "rgb(189,222,41)", "rgb(148,222,33)",
    "rgb(41,206,16)", "rgb(50,190,16)", "rgb(57,181,16)", "rgb(49,156,8)",
    "rgb(41,148,0)", "rgb(24,132,8)", "rgb(255,255,255)", "rgb(214,214,222)",
    "rgb(181,189,189)", "rgb(160,170,175)", "rgb(148,156,165)", "rgb(150,150,150)"
  ];
  var DEFAULT_PLAYLIST_STYLE = {
    normal: "#00FF00", current: "#FFFFFF", normalbg: "#000000",
    selectedbg: "#0000FF", font: "Arial"
  };

  /* ---------------- parseIni — sao y utils.ts của fork ---------------- */
  var SECTION_REGEX = /^\s*\[(.+?)\]\s*$/;
  var PROPERTY_REGEX = /^\s*([^;][^=]*)\s*=\s*(.*)\s*$/;
  function parseIni(text) {
    var section, match;
    var lines = String(text).split(/[\r\n]+/g);
    var data = {};
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if ((match = line.match(PROPERTY_REGEX)) && section != null) {
        var key = match[1].trim().toLowerCase();
        var value = match[2]
          .replace(/\=.*$/g, "")
          .trim()
          .replace(/(^")|("$)|(^')|('$)/g, "");
        data[section][key] = value;
      } else if ((match = line.match(SECTION_REGEX))) {
        section = match[1].trim().toLowerCase();
        data[section] = {};
      }
    }
    return data;
  }

  /* ---------------- parseViscolors — sao y utils.ts của fork ----------------
     Mỗi dòng "r,g,b" (kèm comment sau số) ghi đè 1 màu theo THỨ TỰ dòng
     khớp, bắt đầu từ màu 0; dòng không khớp thì bỏ (không chiếm chỗ). */
  function parseViscolors(text) {
    var entries = String(text).split("\n");
    var regex = /^\s*(\d+)\s*,?\s*(\d+)\s*,?\s*(\d+)/;
    var colors = DEFAULT_VISCOLORS.slice();
    var matched = [];
    for (var i = 0; i < entries.length; i++) {
      var m = regex.exec(entries[i]);
      if (m) matched.push(m.slice(1, 4).join(","));
    }
    for (var j = 0; j < matched.length; j++) colors[j] = "rgb(" + matched[j] + ")";
    return colors;
  }

  /* ---------------- parsePlaylistStyle — sao y getPlaylistStyle ---------------- */
  function parsePlaylistStyle(text) {
    if (text == null) return Object.assign({}, DEFAULT_PLAYLIST_STYLE);
    var data = parseIni(text).text;
    if (!data) return Object.assign({}, DEFAULT_PLAYLIST_STYLE);
    var keys = ["normal", "current", "normalbg", "selectedbg", "mbFG", "mbBG"];
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i], color = data[k];
      if (!color) continue;
      if (color[0] !== "#") color = "#" + color;
      data[k] = color.slice(0, 7);
    }
    var out = Object.assign({}, DEFAULT_PLAYLIST_STYLE);
    var kk;
    for (kk in data) {
      if (Object.prototype.hasOwnProperty.call(data, kk)) out[kk] = data[kk];
    }
    return out;
  }

  /* ---------------- parseRegion — sao y regionParser.ts của fork ---------------- */
  function pointPairs(arr) {
    var pairedValues = [];
    for (var i = 0; i < arr.length; i += 2) pairedValues.push(arr[i] + "," + arr[i + 1]);
    return pairedValues;
  }
  function parseRegion(regionStr) {
    var iniData = parseIni(regionStr);
    var data = {};
    var sections = Object.keys(iniData);
    for (var s = 0; s < sections.length; s++) {
      var section = sections[s];
      var sec = iniData[section] || {};
      var numpoints = sec.numpoints, pointlist = sec.pointlist;
      if (!numpoints || !pointlist) continue;
      var pointCounts = numpoints.split(/\s*,\s*/).filter(function (v) { return v !== ""; });
      var points = pointPairs(pointlist.split(/\s*[, ]\s*/).filter(function (v) { return v !== ""; }));
      var pointIndex = 0;
      var polygons = pointCounts.map(function (numStr) {
        var num = Number(numStr);
        if (num < 3) { pointIndex += num; return null; }
        var polygon = points.slice(pointIndex, pointIndex + num).join(" ");
        if (!polygon.length) return null;
        pointIndex += num;
        return polygon;
      });
      var valid = polygons.filter(function (p) { return p != null; });
      if (valid.length) data[section] = valid;
    }
    return data;
  }

  /* ---------------- genex — sao y getGenExColors của fork ----------------
     22 màu ở hàng y=0 của genex.bmp, x=48,50,...,90 (bước 2). Hàm thuần
     nhận getColorAt(x) -> "rgb(r,g,b)"; việc đọc pixel thật (canvas)
     do readGenExColorsFromImage lo, chỉ chạy khi có trình duyệt. */
  var GENEX_COLOR_X = [
    ["itemBackground", 48], ["itemForeground", 50], ["windowBackground", 52],
    ["buttonText", 54], ["windowText", 56], ["divider", 58],
    ["playlistSelection", 60], ["listHeaderBackground", 62],
    ["listHeaderText", 64], ["listHeaderFrameTopAndLeft", 66],
    ["listHeaderFrameBottomAndRight", 68], ["listHeaderFramePressed", 70],
    ["listHeaderDeadArea", 72], ["scrollbarOne", 74], ["scrollbarTwo", 76],
    ["pressedScrollbarOne", 78], ["pressedScrollbarTwo", 80],
    ["scrollbarDeadArea", 82], ["listTextHighlighted", 84],
    ["listTextHighlightedBackground", 86], ["listTextSelected", 88],
    ["listTextSelectedBackground", 90]
  ];
  function genExColorsFromPixels(getColorAt) {
    var out = {};
    for (var i = 0; i < GENEX_COLOR_X.length; i++) {
      out[GENEX_COLOR_X[i][0]] = getColorAt(GENEX_COLOR_X[i][1]);
    }
    return out;
  }
  /* Đọc pixel hàng y=0 của genex.bmp qua canvas (trình duyệt thật).
     Trả null khi không có canvas/Image (jsdom/test) hoặc lỗi — genex
     chỉ tô màu hộp thoại ML, cửa sổ chính Classic không cần. */
  function readGenExColorsFromImage(img, doc) {
    try {
      var d = doc || (typeof document !== "undefined" ? document : null);
      if (!d || !img) return null;
      var canvas = d.createElement("canvas");
      var ctx = canvas.getContext && canvas.getContext("2d");
      if (!ctx) return null;
      canvas.width = img.width || img.naturalWidth || 0;
      canvas.height = img.height || img.naturalHeight || 0;
      if (!canvas.width || !canvas.height) return null;
      ctx.drawImage(img, 0, 0);
      return genExColorsFromPixels(function (x) {
        var px = ctx.getImageData(x, 0, 1, 1).data;
        return "rgb(" + px[0] + "," + px[1] + "," + px[2] + ")";
      });
    } catch (e) { return null; }
  }

  /* ---------------- đo kích thước ảnh từ header (không cần Image) ---------------- */
  function pngSizeFromBytes(buf) {
    var b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    if (b.length < 24) return null;
    if (b[0] !== 0x89 || b[1] !== 0x50 || b[2] !== 0x4E || b[3] !== 0x47) return null;
    var w = (b[16] << 24) | (b[17] << 16) | (b[18] << 8) | b[19];
    var h = (b[20] << 24) | (b[21] << 16) | (b[22] << 8) | b[23];
    if (!w || !h) return null;
    return { w: w, h: h };
  }
  function bmpSizeFromBytes(buf) {
    var b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    if (b.length < 26) return null;
    if (b[0] !== 0x42 || b[1] !== 0x4D) return null; /* "BM" */
    function u16(o) { return b[o] | (b[o + 1] << 8); }
    function i32(o) {
      var v = b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24);
      return v;
    }
    var headerSize = i32(14);
    if (headerSize === 12) { /* BITMAPCOREHEADER */
      return { w: u16(18), h: u16(20), bpp: u16(24) };
    }
    if (headerSize >= 40) { /* BITMAPINFOHEADER trở lên */
      var w = i32(18), h = i32(22);
      if (!w) return null;
      return { w: w, h: h < 0 ? -h : h, bpp: u16(28) };
    }
    return null;
  }

  /* ---------------- hình học cửa sổ chính 275×116 ----------------
     Sao y css/main-window.css của fork (vị trí tuyệt đối trong cửa sổ
     275×116) + tên sprite trong skinSprites.ts / skinSelectors.ts.
     Đây là HÌNH HỌC CỦA ĐỊNH DẠNG Winamp 2, không phải số của skin 566. */
  var CLASSIC_MAIN = {
    w: 275, h: 116,
    titlebar: { x: 0, y: 0, w: 275, h: 14, sheet: "TITLEBAR", sprite: "MAIN_TITLE_BAR", selectedSprite: "MAIN_TITLE_BAR_SELECTED" },
    option: { x: 6, y: 3, w: 9, h: 9, sheet: "TITLEBAR", sprite: "MAIN_OPTIONS_BUTTON", activeSprite: "MAIN_OPTIONS_BUTTON_DEPRESSED" },
    minimize: { x: 244, y: 3, w: 9, h: 9, sheet: "TITLEBAR", sprite: "MAIN_MINIMIZE_BUTTON", activeSprite: "MAIN_MINIMIZE_BUTTON_DEPRESSED" },
    shadeBtn: { x: 254, y: 3, w: 9, h: 9, sheet: "TITLEBAR", sprite: "MAIN_SHADE_BUTTON", activeSprite: "MAIN_SHADE_BUTTON_DEPRESSED" },
    close: { x: 264, y: 3, w: 9, h: 9, sheet: "TITLEBAR", sprite: "MAIN_CLOSE_BUTTON", activeSprite: "MAIN_CLOSE_BUTTON_DEPRESSED" },
    clutter: {
      x: 10, y: 22, w: 8, h: 43, sheet: "TITLEBAR", sprite: "MAIN_CLUTTER_BAR_BACKGROUND",
      disabledSprite: "MAIN_CLUTTER_BAR_BACKGROUND_DISABLED",
      /* ClutterBar.tsx của fork: chỉ nút D có hành vi (đổi doublesize),
         O mở menu Options, A/I/V để trống. Amp nối: O = menu chính (qua
         renderer), D = đổi zoom 1x/fit, I = thông tin bài, V = đổi kiểu
         vis, A = chưa có tương đương web (chỉ hiện chữ). Sprite *_SELECTED
         chỉ hiện khi trạng thái tương ứng đang bật. */
      buttons: [
        { id: "o", y: 3, h: 8, selectedSprite: "MAIN_CLUTTER_BAR_BUTTON_O_SELECTED" },
        { id: "a", y: 11, h: 7, selectedSprite: "MAIN_CLUTTER_BAR_BUTTON_A_SELECTED" },
        { id: "i", y: 18, h: 7, selectedSprite: "MAIN_CLUTTER_BAR_BUTTON_I_SELECTED" },
        { id: "d", y: 25, h: 8, selectedSprite: "MAIN_CLUTTER_BAR_BUTTON_D_SELECTED" },
        { id: "v", y: 33, h: 7, selectedSprite: "MAIN_CLUTTER_BAR_BUTTON_V_SELECTED" }
      ]
    },
    playPause: { x: 26, y: 28, w: 9, h: 9, sheet: "PLAYPAUS", sprites: { play: "MAIN_PLAYING_INDICATOR", pause: "MAIN_PAUSED_INDICATOR", stop: "MAIN_STOPPED_INDICATOR" } },
    workIndicator: { x: 24, y: 28, w: 3, h: 9, sheet: "PLAYPAUS", sprite: "MAIN_WORKING_INDICATOR" },
    time: { x: 39, y: 26, w: 59, h: 13, digitXs: [9, 21, 39, 51], minus: { x: -1, y: 6, w: 5, h: 1 } },
    vis: { x: 24, y: 43, w: 76, h: 16 },
    marquee: { x: 111, y: 24, w: 154, h: 6 },
    kbps: { x: 111, y: 43, w: 15, h: 6 },
    khz: { x: 156, y: 43, w: 10, h: 6 },
    monoStereo: {
      x: 212, y: 41, w: 57, h: 12, sheet: "MONOSTER",
      mono: { x: 0, w: 27, sprite: "MAIN_MONO", selectedSprite: "MAIN_MONO_SELECTED" },
      stereo: { x: 27, w: 29, sprite: "MAIN_STEREO", selectedSprite: "MAIN_STEREO_SELECTED" }
    },
    volume: { x: 107, y: 57, w: 68, h: 13, sheet: "VOLUME", thumbW: 14, thumbH: 11, thumbY: 1, thumbSprite: "MAIN_VOLUME_THUMB", thumbActiveSprite: "MAIN_VOLUME_THUMB_SELECTED" },
    balance: { x: 177, y: 57, w: 38, h: 13, sheet: "BALANCE", thumbW: 14, thumbH: 11, thumbY: 1, thumbSprite: "MAIN_BALANCE_THUMB", thumbActiveSprite: "MAIN_BALANCE_THUMB_ACTIVE" },
    eqButton: { x: 219, y: 58, w: 23, h: 12, sheet: "SHUFREP", sprite: "MAIN_EQ_BUTTON", selectedSprite: "MAIN_EQ_BUTTON_SELECTED", activeSprite: "MAIN_EQ_BUTTON_DEPRESSED", activeSelectedSprite: "MAIN_EQ_BUTTON_DEPRESSED_SELECTED" },
    playlistButton: { x: 242, y: 58, w: 23, h: 12, sheet: "SHUFREP", sprite: "MAIN_PLAYLIST_BUTTON", selectedSprite: "MAIN_PLAYLIST_BUTTON_SELECTED", activeSprite: "MAIN_PLAYLIST_BUTTON_DEPRESSED", activeSelectedSprite: "MAIN_PLAYLIST_BUTTON_DEPRESSED_SELECTED" },
    position: { x: 16, y: 72, w: 248, h: 10, sheet: "POSBAR", thumbW: 29, thumbH: 10, thumbSprite: "MAIN_POSITION_SLIDER_THUMB", thumbActiveSprite: "MAIN_POSITION_SLIDER_THUMB_SELECTED" },
    prev: { x: 16, y: 88, w: 23, h: 18, sheet: "CBUTTONS", sprite: "MAIN_PREVIOUS_BUTTON", activeSprite: "MAIN_PREVIOUS_BUTTON_ACTIVE" },
    play: { x: 39, y: 88, w: 23, h: 18, sheet: "CBUTTONS", sprite: "MAIN_PLAY_BUTTON", activeSprite: "MAIN_PLAY_BUTTON_ACTIVE" },
    pause: { x: 62, y: 88, w: 23, h: 18, sheet: "CBUTTONS", sprite: "MAIN_PAUSE_BUTTON", activeSprite: "MAIN_PAUSE_BUTTON_ACTIVE" },
    stop: { x: 85, y: 88, w: 23, h: 18, sheet: "CBUTTONS", sprite: "MAIN_STOP_BUTTON", activeSprite: "MAIN_STOP_BUTTON_ACTIVE" },
    next: { x: 108, y: 88, w: 22, h: 18, sheet: "CBUTTONS", sprite: "MAIN_NEXT_BUTTON", activeSprite: "MAIN_NEXT_BUTTON_ACTIVE" },
    eject: { x: 136, y: 89, w: 22, h: 16, sheet: "CBUTTONS", sprite: "MAIN_EJECT_BUTTON", activeSprite: "MAIN_EJECT_BUTTON_ACTIVE" },
    shuffle: { x: 164, y: 89, w: 47, h: 15, sheet: "SHUFREP", sprite: "MAIN_SHUFFLE_BUTTON", selectedSprite: "MAIN_SHUFFLE_BUTTON_SELECTED", activeSprite: "MAIN_SHUFFLE_BUTTON_DEPRESSED", activeSelectedSprite: "MAIN_SHUFFLE_BUTTON_SELECTED_DEPRESSED" },
    repeat: { x: 210, y: 89, w: 28, h: 15, sheet: "SHUFREP", sprite: "MAIN_REPEAT_BUTTON", selectedSprite: "MAIN_REPEAT_BUTTON_SELECTED", activeSprite: "MAIN_REPEAT_BUTTON_DEPRESSED", activeSelectedSprite: "MAIN_REPEAT_BUTTON_SELECTED_DEPRESSED" },
    about: { x: 253, y: 91, w: 13, h: 15 }
  };
  /* Shade 275×14 — sao y css/main-window.css (.shade): nền shade +
     transport thu nhỏ (icon đã vẽ sẵn trong nền, chỉ còn vùng bấm) +
     seek mini 17×7 + đồng hồ mini + vis mini 38×5. */
  var CLASSIC_SHADE = {
    w: 275, h: 14,
    background: { x: 0, y: 0, w: 275, h: 14, sheet: "TITLEBAR", sprite: "MAIN_SHADE_BACKGROUND", selectedSprite: "MAIN_SHADE_BACKGROUND_SELECTED" },
    prev: { x: 169, y: 2, w: 7, h: 10 },
    play: { x: 176, y: 2, w: 10, h: 10 },
    pause: { x: 186, y: 2, w: 9, h: 10 },
    stop: { x: 195, y: 2, w: 9, h: 10 },
    next: { x: 204, y: 2, w: 10, h: 10 },
    eject: { x: 215, y: 2, w: 10, h: 10 },
    position: { x: 226, y: 4, w: 17, h: 7, sheet: "TITLEBAR", bgSprite: "MAIN_SHADE_POSITION_BACKGROUND", thumbSprite: "MAIN_SHADE_POSITION_THUMB", thumbLeftSprite: "MAIN_SHADE_POSITION_THUMB_LEFT", thumbRightSprite: "MAIN_SHADE_POSITION_THUMB_RIGHT" },
    vis: { x: 79, y: 5, w: 38, h: 5 },
    time: { x: 127, y: 4, w: 35, h: 6 }
  };

  /* ---------------- công thức nền volume/balance (fork) ----------------
     MainVolume.tsx: sprite = round(vol * 28); offset = (sprite - 1) * 15.
     MainBalance.tsx (offsetFromBalance): sprite = floor(|bal| / 100 * 27);
     offset = sprite * 15. bal ở đây là -100..100; Amp giữ balance dạng
     frac 0..1 (0.5 = giữa) nên đổi: |bal|/100 = |frac - 0.5| * 2. */
  function volumeTrackOffset(vol01) {
    var v = Math.max(0, Math.min(1, vol01 == null ? 1 : vol01));
    var sprite = Math.round(v * 28);
    return (sprite - 1) * 15;
  }
  function balanceTrackOffset(frac01) {
    var f = Math.max(0, Math.min(1, frac01 == null ? 0.5 : frac01));
    var sprite = Math.floor(Math.abs(f - 0.5) * 2 * 27);
    return sprite * 15;
  }

  /* Số đồng hồ lấy từ NUMS_EX khi skin có (fork: numExIsUsed = có
     DIGIT_0_EX), không thì NUMBERS (skinSelectors.ts). Dấu trừ countdown:
     NUMBERS dùng MINUS_SIGN 5×1 ở (-1,6) trong hộp #time; NUMS_EX dùng
     MINUS_SIGN_EX 9×13 (ô số đầy đủ — Winamp thật vẽ dấu trừ to bằng
     1 chữ số, fork chỉ đổi ảnh giữ hộp 5×1 nên dấu bị cắt, Amp vẽ đủ ô). */
  function digitSheetName(classic) {
    if (classic && classic.sheets && classic.sheets.NUMS_EX) return "NUMS_EX";
    return "NUMBERS";
  }
  function digitSpriteName(d, classic) {
    return digitSheetName(classic) === "NUMS_EX" ? "DIGIT_" + d + "_EX" : "DIGIT_" + d;
  }
  function minusSprite(classic) {
    if (digitSheetName(classic) === "NUMS_EX") {
      return { sheet: "NUMS_EX", name: "MINUS_SIGN_EX", x: -1, y: 0, w: 9, h: 13 };
    }
    return { sheet: "NUMBERS", name: "MINUS_SIGN", x: -1, y: 6, w: 5, h: 1 };
  }

  /* ---------------- parseClassicSkin — thay skinParser.js của fork ----------------
     Nhận zip JSZip ĐÃ mở (loader mở bằng JSZip.loadAsync) + opts:
       findPath(p) — tra file không phân biệt hoa/thường (loader có sẵn);
       fileURL(p) — URL xem được của file trong zip (loader có sẵn);
       document/Image — chỉ dùng để đọc genex (trình duyệt thật).
     Không có opts.findPath thì tự tra từ zip.files (regex như fork,
     file trùng tên thì file SAU thắng — hành vi Winamp trên đĩa).
     Trả {kind, viscolors, playlistStyle, region, genExColors, sheets,
     hasNumsEx, files, cursors} — KHÔNG trả cấu trúc Redux, renderer Amp
     vẽ trực tiếp từ sheets + CLASSIC_SPRITES + CLASSIC_MAIN. */
  function filenameRegex(base, ext) {
    return new RegExp("^(.*[/\\\\])?" + base + ".(" + ext + ")$", "i");
  }
  async function parseClassicSkin(zip, opts) {
    opts = opts || {};
    var names = Object.keys(zip.files || {});
    var lowerMap = {};
    names.forEach(function (n) { lowerMap[n.toLowerCase()] = n; });
    function findFile(base, ext) {
      var re = filenameRegex(base, ext);
      var hits = names.filter(function (n) { return re.test(n); });
      if (hits.length) return hits[hits.length - 1]; /* file sau thắng */
      return null;
    }
    function findPath(p) {
      if (opts.findPath) return opts.findPath(p);
      return lowerMap[String(p).toLowerCase()] || null;
    }
    /* File .txt trong THƯ MỤC CON (skin 3DNow để hết trong
       "3DNow/viscolor.txt", "3DNow/PLEDIT.TXT"...): findPath của loader
       chỉ tra đúng đường dẫn nên trả null, parser rơi về màu/pledit
       MẶC ĐỊNH dù skin có file thật. Tra cứu theo basename (file sau
       thắng, giống sheet): chỉ dùng khi findPath không thấy — tránh đụng
       2 file cùng tên ở 2 thư mục khác nhau của skin Modern (ở đây chỉ
       dùng cho .wsz, nơi mỗi tên txt chỉ có 1 bản). */
    function findByBasename(p) {
      var base = String(p).toLowerCase().split("/").pop();
      var hits = names.filter(function (n) {
        return n.toLowerCase().split("/").pop() === base;
      });
      return hits.length ? hits[hits.length - 1] : null;
    }
    var textFiles = {};
    async function readText(p) {
      var real = findPath(p) || findByBasename(p);
      textFiles[String(p).toLowerCase()] = real;
      if (!real) return null;
      try { return await zip.file(real).async("string"); }
      catch (e) { return null; }
    }
    async function readBytes(p) {
      var real = findPath(p) || findByBasename(p);
      if (!real) return null;
      try { return await zip.file(real).async("arraybuffer"); }
      catch (e) { return null; }
    }

    /* .txt — tra theo tên gốc không phân biệt hoa/thường (VISCOLOR.TXT,
       PLEDIT.TXT, REGION.TXT trong base-2.91.wsz đều viết hoa). */
    var visText = await readText("viscolor.txt");
    var viscolors = visText ? parseViscolors(visText) : DEFAULT_VISCOLORS.slice();
    var pleditText = await readText("pledit.txt");
    var playlistStyle = parsePlaylistStyle(pleditText);
    var regionText = await readText("region.txt");
    var region = regionText ? parseRegion(regionText) : {};

    /* BMP/PNG theo bảng sprite: tên sheet = tên file (MAIN.bmp...).
       WACUP cho phép .png thay .bmp (fork cũng theo) nên thử cả 2,
       .bmp trước. Ghi lại file thật + kích thước header (đo, không đoán). */
    var sheets = {};
    var sheetNames = Object.keys(CLASSIC_SPRITES);
    for (var s = 0; s < sheetNames.length; s++) {
      var sheet = sheetNames[s];
      var real = findFile(sheet, "(png|bmp)");
      if (!real) continue;
      var ext = (/\.png$/i.test(real)) ? "png" : "bmp";
      var url = null;
      if (opts.fileURL) {
        try { url = await opts.fileURL(real); } catch (e) { url = null; }
      }
      var size = null;
      var bytes = await readBytes(real);
      if (bytes) size = ext === "png" ? pngSizeFromBytes(bytes) : bmpSizeFromBytes(bytes);
      sheets[sheet] = { file: real, ext: ext, url: url, size: size };
    }
    /* genex.bmp: 22 màu hàng y=0 — KHÔNG nằm trong bảng sprite (fork
       comment khối GENEX vì không hỗ trợ ML) nên tìm riêng file. Chỉ
       đọc được khi có Image + canvas (trình duyệt thật); jsdom/test
       không có canvas 2d -> null (chỉ tô hộp thoại ML, cửa sổ chính
       không cần màu này). */
    var genExColors = null;
    var genexFile = findFile("GENEX", "(png|bmp)");
    var genexUrl = null;
    if (genexFile && opts.fileURL) {
      try { genexUrl = await opts.fileURL(genexFile); } catch (e) { genexUrl = null; }
    }
    if (genexFile && genexUrl && typeof Image !== "undefined" &&
        typeof document !== "undefined" && document.createElement) {
      try {
        var img = await new Promise(function (resolve) {
          var im = new Image();
          var done = false;
          var timer = setTimeout(function () { if (!done) { done = true; resolve(null); } }, 1500);
          im.onload = function () { if (!done) { done = true; clearTimeout(timer); resolve(im); } };
          im.onerror = function () { if (!done) { done = true; clearTimeout(timer); resolve(null); } };
          im.src = genexUrl;
        });
        if (img) genExColors = readGenExColorsFromImage(img, document);
      } catch (e) { genExColors = null; }
    }
    /* Con trỏ .cur: chỉ liệt kê (Amp giữ con trỏ trình duyệt). */
    var cursors = names.filter(function (n) { return /\.cur$/i.test(n); });
    return {
      kind: "classic",
      viscolors: viscolors,
      playlistStyle: playlistStyle,
      region: region,
      genExColors: genExColors,
      sheets: sheets,
      hasNumsEx: !!sheets.NUMS_EX,
      genexFile: genexFile,
      /* Đường dẫn .txt thật đã đọc (để test/debug biết file có nằm trong
         thư mục con không — vd "3DNow/viscolor.txt"). */
      textFiles: textFiles,
      files: names.slice().sort(),
      cursors: cursors
    };
  }

  return {
    CLASSIC_VERSION: CLASSIC_VERSION,
    EXPECTED_CLASSIC_VERSION: EXPECTED_CLASSIC_VERSION,
    MANIFEST_VERSION: MANIFEST_VERSION,
    MANIFEST_MISMATCH: MANIFEST_MISMATCH,
    CLASSIC_SPRITES: CLASSIC_SPRITES,
    FONT_LOOKUP: FONT_LOOKUP,
    CHAR_X: CHAR_X, CHAR_Y: CHAR_Y,
    DEFAULT_VISCOLORS: DEFAULT_VISCOLORS,
    DEFAULT_PLAYLIST_STYLE: DEFAULT_PLAYLIST_STYLE,
    GENEX_COLOR_X: GENEX_COLOR_X,
    CLASSIC_MAIN: CLASSIC_MAIN,
    CLASSIC_SHADE: CLASSIC_SHADE,
    spriteRect: spriteRect,
    charKey: charKey,
    charSprite: charSprite,
    parseIni: parseIni,
    parseViscolors: parseViscolors,
    parsePlaylistStyle: parsePlaylistStyle,
    pointPairs: pointPairs,
    parseRegion: parseRegion,
    genExColorsFromPixels: genExColorsFromPixels,
    readGenExColorsFromImage: readGenExColorsFromImage,
    pngSizeFromBytes: pngSizeFromBytes,
    bmpSizeFromBytes: bmpSizeFromBytes,
    volumeTrackOffset: volumeTrackOffset,
    balanceTrackOffset: balanceTrackOffset,
    digitSheetName: digitSheetName,
    digitSpriteName: digitSpriteName,
    minusSprite: minusSprite,
    parseClassicSkin: parseClassicSkin
  };
});
