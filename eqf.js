/* Amp v10 — eqf.js: đọc/ghi preset EQ .eqf/.q1.
   Chuyển tay từ winamp-eqf của Webamp fork (captbaritone/webamp v2.3.1,
   packages/winamp-eqf/src/{parser,creator,constants,types}.ts — thuần TS,
   không dependency) sang JS thuần, không build step. Chạy được cả trình
   duyệt (window.AmpEqf) lẫn Node (module.exports, dùng với jsdom).

   ---------------------------------------------------------------------------
   ĐỊNH DẠNG FILE (đã kiểm bằng file mẫu thật trong fork):
   - 27 byte header ASCII: "Winamp EQ library file v1.1"
   - 4 byte: 0x1A + "!--"  (tổng tiền tố 31 byte)
   - Mỗi preset 268 byte: 257 byte tên (Latin-1, kết thúc NUL, đệm 0) +
     11 byte giá trị, mỗi byte = 64 − giá trị.
   - Thứ tự 11 giá trị: hz60, hz170, hz310, hz600, hz1000, hz3000, hz6000,
     hz12000, hz14000, hz16000, preamp. Thang 1..64, 33 = phẳng (0 dB),
     64 = +12 dB, 1 = −12 dB. File .q1 (vd winamp.q1) cùng định dạng này.
     (winamp.q1 thật: 4587 byte = 31 + 17×268; max/min/midline.EQF đã
     kiểm bằng Python 03/11.)
   ---------------------------------------------------------------------------
   CÁCH MAP SANG AMP (ghi rõ để preset mang qua lại được với Winamp PC):
   - Map THEO THỨ TỰ tần số tăng dần (không theo nhãn Hz tuyệt đối):
     hz60→eq1, hz170→eq2, hz310→eq3, hz600→eq4, hz1000→eq5, hz3000→eq6,
     hz6000→eq7, hz12000→eq8, hz14000→eq9, hz16000→eq10, preamp→preamp.
     Lý do: dải EQ của Amp là 31.5/63/125/250/500/1K/2K/4K/8K/16K Hz
     (audio.js EQ_FREQS) — khác tâm tần Winamp nhưng cùng 10 dải +
     preamp, cùng thứ tự. Map theo vị trí giữ đúng hình dáng đường cong
     EQ; map theo nhãn Hz gần nhất sẽ lệch vị trí dải.
   - Thang giá trị: KHÔNG dùng map tuyến tính 1..64 → 0..100 của Webamp
     (normalizeEqBand: phẳng 33 → 50.8, lệch 0 dB). Amp dùng map dB-CHÍNH
     XÁC: 33 = 0 dB đúng, 64 = +12 dB, 1 = −12 dB; dB = (v−33)×12/31 khi
     v≥33, (v−33)×12/32 khi v≤33 (bù cho thang không đối xứng 32 dưới /
     31 trên); frac Amp = (dB+12)/24, 0.5 = 0 dB đúng. Round-trip
     frac→eqf→frac sai số ≤ nửa bước (≈0.2 dB), chấp nhận được.
   - Tên preset: Latin-1 (1 byte/ký tự). Khi ghi, ký tự >U+00FF thành "?";
     tên dài hơn 257 ký tự thì cắt. Khi đọc, byte nào cũng giữ nguyên
     (Latin-1 → JS string qua fromCharCode).
   ---------------------------------------------------------------------------
   API: parseEqf(buf) / createEqf(data) / eqfValueToDb / dbToEqfValue /
   eqfValueToFrac / fracToEqfValue / eqfPresetToAmpFracs /
   ampFracsToEqfPreset / EQF_PRESET_KEYS. Lỗi đọc: throw Error.
*/
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory();
  else root.AmpEqf = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var EQF_VERSION = "10.33";
  var EXPECTED_EQF_VERSION = "10.33";
  if (EQF_VERSION !== EXPECTED_EQF_VERSION) {
    throw new Error("eqf.js: EQF_VERSION (" + EQF_VERSION + ") khac EXPECTED_EQF_VERSION (" + EXPECTED_EQF_VERSION + ") — ban mix, dung lai");
  }
  /* Kiểm manifest như các file kia (index.html đặt window.AMP_VERSION
     trước khi nạp file này). Không có manifest (chạy test trực tiếp bằng
     require) thì không kiểm. */
  var MANIFEST_VERSION = (function () {
    try {
      if (typeof globalThis !== "undefined" && globalThis.AMP_VERSION) return globalThis.AMP_VERSION;
      if (typeof window !== "undefined" && window.AMP_VERSION) return window.AMP_VERSION;
    } catch (e) { /* bỏ qua */ }
    return null;
  })();
  var MANIFEST_MISMATCH = MANIFEST_VERSION !== null && MANIFEST_VERSION !== EQF_VERSION;

  var HEADER = "Winamp EQ library file v1.1";
  var HEADER_LEN = 27;
  var PREFIX_LEN = 31; /* header 27 + 0x1A + "!--" */
  var NAME_LEN = 257;
  var PRESET_LEN = 268; /* 257 tên + 11 giá trị */
  var VALUE_COUNT = 11;

  /* Thứ tự 11 giá trị trong file (theo winamp-eqf constants.ts). */
  var EQF_PRESET_KEYS = ["hz60", "hz170", "hz310", "hz600", "hz1000", "hz3000", "hz6000", "hz12000", "hz14000", "hz16000", "preamp"];
  /* Map vị trí: 10 dải đầu → eq1..eq10 của Amp, cuối → preamp. */
  var AMP_BAND_KEYS = ["eq1", "eq2", "eq3", "eq4", "eq5", "eq6", "eq7", "eq8", "eq9", "eq10"];

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  function toBytes(buf) {
    if (buf instanceof Uint8Array) return buf;
    if (typeof ArrayBuffer !== "undefined" && buf instanceof ArrayBuffer) return new Uint8Array(buf);
    if (buf && typeof buf.byteLength === "number" && buf.buffer instanceof ArrayBuffer) return new Uint8Array(buf.buffer, buf.byteOffset || 0, buf.byteLength);
    throw new Error("parseEqf: can ArrayBuffer hoac Uint8Array");
  }

  /* Đọc 1 file .eqf/.q1 → {type, presets:[{name, hz60..hz16000, preamp}]}.
     Throw khi: không đủ 31 byte tiền tố, sai header, preset cuối bị cắt
     (phần còn lại sau tiền tố không chia hết cho 268). Giá trị byte
     ngoài 0..63 thì kẹp về 1..64 (file lạ vẫn đọc được, không throw). */
  function parseEqf(buf) {
    var arr = toBytes(buf);
    if (arr.length < PREFIX_LEN) throw new Error("Invalid .eqf file.");
    var head = "";
    for (var h = 0; h < HEADER_LEN; h++) head += String.fromCharCode(arr[h]);
    if (head !== HEADER) throw new Error("Invalid .eqf file.");
    if (arr[27] !== 26 || arr[28] !== 33 || arr[29] !== 45 || arr[30] !== 45) throw new Error("Invalid .eqf file.");
    var rest = arr.length - PREFIX_LEN;
    if (rest % PRESET_LEN !== 0) throw new Error("Invalid .eqf file.");
    var presets = [];
    var i = PREFIX_LEN;
    while (i < arr.length) {
      var nameStart = i, nameEnd = i + NAME_LEN;
      var j = nameStart;
      while (j < nameEnd && arr[j] !== 0) j++;
      var name = "";
      for (var k = nameStart; k < j; k++) name += String.fromCharCode(arr[k]);
      var preset = { name: name };
      var vi = nameEnd;
      for (var p = 0; p < VALUE_COUNT; p++) {
        preset[EQF_PRESET_KEYS[p]] = clamp(64 - arr[vi++], 1, 64);
      }
      presets.push(preset);
      i += PRESET_LEN;
    }
    return { type: HEADER, presets: presets };
  }

  /* Ghi {presets:[...]} → ArrayBuffer đúng spec (đọc lại được bằng
     Winamp PC và bằng parseEqf). Tên >255 ký tự thì cắt, ký tự >U+00FF
     thành "?". Giá trị ngoài 1..64 thì kẹp. */
  function createEqf(data) {
    if (!data || !data.presets) throw new Error("Eqf data is missing presets");
    var out = [];
    for (var h = 0; h < HEADER.length; h++) out.push(HEADER.charCodeAt(h));
    out.push(26);
    out.push(33); out.push(45); out.push(45); /* "!--" */
    for (var pi = 0; pi < data.presets.length; pi++) {
      var preset = data.presets[pi];
      var name = String(preset.name == null ? "" : preset.name);
      var k = 0;
      for (; k < name.length && k < NAME_LEN; k++) {
        var c = name.charCodeAt(k);
        out.push(c > 255 ? 63 : c); /* "?" */
      }
      for (; k < NAME_LEN; k++) out.push(0);
      for (var p = 0; p < VALUE_COUNT; p++) {
        var v = clamp(Math.round(Number(preset[EQF_PRESET_KEYS[p]]) || 33), 1, 64);
        out.push(64 - v);
      }
    }
    return new Uint8Array(out).buffer;
  }

  /* Giá trị .eqf 1..64 → dB (33 = 0 dB đúng, 64 = +12, 1 = −12). */
  function eqfValueToDb(v) {
    v = clamp(Math.round(v), 1, 64);
    if (v >= 33) return (v - 33) * 12 / 31;
    return (v - 33) * 12 / 32;
  }
  /* dB (−12..+12) → giá trị .eqf 1..64 (ngược của eqfValueToDb). */
  function dbToEqfValue(db) {
    db = clamp(Number(db) || 0, -12, 12);
    if (db >= 0) return clamp(Math.round(33 + db * 31 / 12), 1, 64);
    return clamp(Math.round(33 + db * 32 / 12), 1, 64);
  }
  /* Giá trị .eqf → frac Amp 0..1 (0.5 = 0 dB đúng). */
  function eqfValueToFrac(v) { return (eqfValueToDb(v) + 12) / 24; }
  /* frac Amp 0..1 → giá trị .eqf 1..64. */
  function fracToEqfValue(frac) {
    frac = clamp(Number(frac) || 0, 0, 1);
    return dbToEqfValue(frac * 24 - 12);
  }

  /* Preset .eqf → fracs Amp {preamp, eq1..eq10} (0..1, 0.5 = phẳng). */
  function eqfPresetToAmpFracs(preset) {
    var fracs = { preamp: eqfValueToFrac(preset.preamp) };
    for (var i = 0; i < AMP_BAND_KEYS.length; i++) {
      fracs[AMP_BAND_KEYS[i]] = eqfValueToFrac(preset[EQF_PRESET_KEYS[i]]);
    }
    return fracs;
  }
  /* Fracs Amp {preamp, eq1..eq10} → preset .eqf (đặt tên khi lưu). */
  function ampFracsToEqfPreset(fracs, name) {
    var preset = { name: name == null ? "" : String(name) };
    preset.preamp = fracToEqfValue(fracs.preamp == null ? 0.5 : fracs.preamp);
    for (var i = 0; i < AMP_BAND_KEYS.length; i++) {
      preset[EQF_PRESET_KEYS[i]] = fracToEqfValue(fracs[AMP_BAND_KEYS[i]] == null ? 0.5 : fracs[AMP_BAND_KEYS[i]]);
    }
    return preset;
  }

  return {
    EQF_VERSION: EQF_VERSION,
    EXPECTED_EQF_VERSION: EXPECTED_EQF_VERSION,
    MANIFEST_MISMATCH: MANIFEST_MISMATCH,
    HEADER: HEADER,
    PREFIX_LEN: PREFIX_LEN,
    NAME_LEN: NAME_LEN,
    PRESET_LEN: PRESET_LEN,
    EQF_PRESET_KEYS: EQF_PRESET_KEYS,
    AMP_BAND_KEYS: AMP_BAND_KEYS,
    parseEqf: parseEqf,
    createEqf: createEqf,
    eqfValueToDb: eqfValueToDb,
    dbToEqfValue: dbToEqfValue,
    eqfValueToFrac: eqfValueToFrac,
    fracToEqfValue: fracToEqfValue,
    eqfPresetToAmpFracs: eqfPresetToAmpFracs,
    ampFracsToEqfPreset: ampFracsToEqfPreset
  };
});
