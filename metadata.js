/* Amp v10 — metadata.js (đợt 5, 03/11: Metadata nhạc — đọc tag nhạc local).
   Lấy QUY ƯỚC từ Webamp fork (captbaritone/webamp v2.3.1), KHÔNG bê code:
   - fileUtils.ts — genMediaTags(file, musicMetadata): parseBlob(file,
     {duration:true, skipPostHeaders:true}); genMediaDuration(url): thẻ
     <audio> tạm, đọc duration ở durationchange (Amp đã có sẵn đường này:
     probeLocalDuration ở renderer.js — giữ nguyên, không làm lại).
   - actionCreators/files.ts — fetchMediaTags: lấy metadata.common
     {artist, title, album, picture} + format {numberOfChannels, bitrate,
     sampleRate}; file không có tag album thì dùng tên thư mục chứa file
     làm album (fallbackAlbum); đọc tag lỗi mà có fallbackAlbum thì vẫn
     giữ album thư mục.
   - types.ts — IMetadataApi: parseBlob(blob, options) / fetchFromUrl(url,
     options) (music-metadata-browser) hoặc parseWebStream (Node). Fork
     nạp lib bằng bundler; Amp không có build step nên nạp lib qua CDN
     bằng dynamic import() (xem dưới).
   - reducers/tracks.ts — SET_MEDIA_TAGS: ghi title/artist/album (+ kbps/
     khz từ bitrate/sampleRate) vào track. Amp KHÔNG lấy KBPS/KHZ từ tag
     (đã chốt): bitrate/sampleRate của tag chỉ lưu vào model
     (tagBitrate/tagSampleRate) mà KHÔNG đưa lên viên KBPS/KHZ.

   ---------------------------------------------------------------------------
   CDN — ĐÃ KIỂM SỐNG 03/11 (curl, HTTP 200):
   - ĐƯỜNG CHÍNH (ESM): https://cdn.jsdelivr.net/npm/music-metadata-browser@2.5.11/+esm
     (jsDelivr bundle ESM thật, exports parseBlob / fetchFromUrl /
     parseBuffer; kéo theo music-metadata@7.14.0 core — đủ parseBlob cho
     MP3/FLAC/OGG/M4A/WAV. Nạp bằng dynamic import(), KHÔNG nạp bằng thẻ
     <script src> thường.)
   - DỰ PHÒNG (ESM): https://esm.sh/music-metadata-browser@2.5.11
     (HTTP 200, re-export parseBlob; dùng khi jsDelivr lỗi.)
   - KHÔNG DÙNG: .../music-metadata-browser@2.5.11/lib/index.js (HTTP 200
     nhưng là CommonJS — `require("music-metadata/lib/core")`, nạp bằng
     <script> thường sẽ lỗi `require is not defined`; chỉ dùng được qua
     bundler hoặc qua bản +esm ở trên). Bản 0.6.1 (fork đang dùng) đã 404
     trên cả 2 CDN. music-metadata@11.6.0/+esm cũng sống (200) nhưng là
     bản core Node (parseBuffer/parseStream, không có parseBlob) nên không
     phải đường chính.
   ---------------------------------------------------------------------------
   FALLBACK KHÔNG CẦN MẠNG (parser ID3/FLAC nhúng sẵn trong file này):
   - Lib CDN chết / offline / file là MP3 có tag ID3: parser nội bộ đọc
     trực tiếp ArrayBuffer của file — ID3v2.3/v2.4 (khung TIT2/TPE1/
     TALB, mã hóa Latin-1/UTF-16/UTF-8) + ID3v1 (128 byte cuối, TAG) +
     FLAC Vorbis comment (TITLE/ARTIST/ALBUM). ID3 không chứa thời
     lượng nên duration vẫn do thẻ <audio> probe (probeLocalDuration)
     hoặc duration của lib (nếu lib đọc được) — không bịa duration.
   - File không có tag nào: giữ nguyên tên file + thời lượng đã probe
     bằng thẻ audio tạm; nghệ sĩ/album hiển thị "Không rõ" (quy ước gom
     nhóm của Webamp fork cho radio/.wav không thẻ).
   ---------------------------------------------------------------------------
   API: probeFile(file, opts) / normalizeMetadata(raw) /
   parseId3Buffer(buf) / parseFlacBuffer(buf) / applyMetadataToItem(item,
   meta) / displayTitle(item) / displayArtist(item) / displayAlbum(item) /
   formatFileSize(bytes) / UNKNOWN ("Không rõ").
   Chạy được cả trình duyệt (window.AmpMetadata) lẫn Node
   (module.exports, dùng với jsdom). Không dependency, không build step.
*/
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory();
  else root.AmpMetadata = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var METADATA_VERSION = "10.9";
  var EXPECTED_METADATA_VERSION = "10.9";
  if (METADATA_VERSION !== EXPECTED_METADATA_VERSION) {
    throw new Error("metadata.js: METADATA_VERSION (" + METADATA_VERSION + ") khac EXPECTED_METADATA_VERSION (" + EXPECTED_METADATA_VERSION + ") — ban mix, dung lai");
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
  var MANIFEST_MISMATCH = MANIFEST_VERSION !== null && MANIFEST_VERSION !== METADATA_VERSION;

  var UNKNOWN = "Không rõ";
  /* CDN đã kiểm sống 03/11 (xem đầu file): bản +esm là ESM thật, nạp
     bằng dynamic import(). KHÔNG dùng lib/index.js (CommonJS). */
  var MUSIC_METADATA_ESM_URL = "https://cdn.jsdelivr.net/npm/music-metadata-browser@2.5.11/+esm";
  var MUSIC_METADATA_ESM_FALLBACK_URL = "https://esm.sh/music-metadata-browser@2.5.11";

  function cleanStr(v) {
    if (v === null || v === undefined) return null;
    var s = String(v).replace(/^\s+|\s+$/g, "");
    /* music-metadata đôi khi trả mảng (vd artist nhiều người): lấy
       phần tử đầu có chữ, còn lại nối bằng ", " ở normalize. */
    return s ? s : null;
  }
  function cleanStrList(v) {
    if (v === null || v === undefined) return null;
    if (Array.isArray(v)) {
      var parts = [];
      for (var i = 0; i < v.length; i++) { var c = cleanStr(v[i]); if (c) parts.push(c); }
      return parts.length ? parts.join(", ") : null;
    }
    return cleanStr(v);
  }
  function cleanDuration(v) {
    var d = Number(v);
    if (!isFinite(d) || d <= 0) return null;
    return d;
  }

  /* Chuẩn hóa kết quả của music-metadata (IAudioMetadata) về dạng Amp
     dùng — cũng nhận dạng phẳng {title,artist,album,duration} để test
     và để parser nội bộ dùng chung. Trường nào trống thì null (không
     bịa "Không rõ" vào model — "Không rõ" chỉ là chữ hiển thị). */
  function normalizeMetadata(raw, fallback) {
    fallback = fallback || {};
    var common = (raw && raw.common) || {};
    var format = (raw && raw.format) || {};
    var flat = raw || {};
    var title = cleanStr(common.title !== undefined ? common.title : flat.title);
    var artist = cleanStrList(common.artist !== undefined ? common.artist : flat.artist);
    if (!artist) artist = cleanStrList(common.artists);
    if (!artist && common.albumartist) artist = cleanStr(common.albumartist);
    var album = cleanStr(common.album !== undefined ? common.album : flat.album);
    if (!album) album = cleanStr(fallback.album);
    if (!artist) artist = cleanStr(fallback.artist);
    var duration = cleanDuration(format.duration !== undefined ? format.duration : flat.duration);
    var bitrate = format.bitrate != null && isFinite(Number(format.bitrate)) && Number(format.bitrate) > 0 ? Number(format.bitrate) : null;
    var sampleRate = format.sampleRate != null && isFinite(Number(format.sampleRate)) && Number(format.sampleRate) > 0 ? Number(format.sampleRate) : null;
    var channels = format.numberOfChannels != null && isFinite(Number(format.numberOfChannels)) ? Number(format.numberOfChannels) : null;
    var codec = cleanStr(format.codec) || cleanStr(format.container) || null;
    var hasTags = !!(title || artist || album);
    return {
      title: title, artist: artist, album: album,
      duration: duration, bitrate: bitrate, sampleRate: sampleRate,
      channels: channels, codec: codec, hasTags: hasTags
    };
  }

  /* ---------- parser nội bộ (không cần mạng) ---------- */
  function latin1(bytes, start, end) {
    var s = "";
    for (var i = start; i < end; i++) {
      var b = bytes[i];
      if (b === 0) break;
      s += String.fromCharCode(b);
    }
    return s.replace(/^\s+|\s+$/g, "");
  }
  function decodeTextFrame(bytes, start, end) {
    if (end <= start) return "";
    var enc = bytes[start];
    var body = bytes.subarray ? bytes.subarray(start + 1, end) : bytes.slice(start + 1, end);
    var s = "";
    try {
      if (enc === 3) { /* UTF-8 */
        if (typeof TextDecoder !== "undefined") s = new TextDecoder("utf-8").decode(body);
        else s = latin1(bytes, start + 1, end);
      } else if (enc === 1) { /* UTF-16 có BOM */
        var le = true;
        var off = 0;
        if (body.length >= 2 && body[0] === 0xFF && body[1] === 0xFE) { le = true; off = 2; }
        else if (body.length >= 2 && body[0] === 0xFE && body[1] === 0xFF) { le = false; off = 2; }
        if (typeof TextDecoder !== "undefined") s = new TextDecoder(le ? "utf-16le" : "utf-16be").decode(body.subarray ? body.subarray(off) : body.slice(off));
        else { for (var i = off; i + 1 < body.length; i += 2) { var cp = le ? (body[i] | (body[i + 1] << 8)) : ((body[i] << 8) | body[i + 1]); if (cp === 0) break; s += String.fromCharCode(cp); } }
      } else if (enc === 2) { /* UTF-16BE không BOM */
        if (typeof TextDecoder !== "undefined") s = new TextDecoder("utf-16be").decode(body);
        else { for (var j = 0; j + 1 < body.length; j += 2) { var cp2 = (body[j] << 8) | body[j + 1]; if (cp2 === 0) break; s += String.fromCharCode(cp2); } }
      } else { /* 0 = Latin-1 (ISO-8859-1) */
        s = latin1(bytes, start + 1, end);
      }
    } catch (e) { s = latin1(bytes, start + 1, end); }
    return s.replace(/\0/g, "").replace(/^\s+|\s+$/g, "");
  }
  function synchsafe(bytes, off) {
    return ((bytes[off] & 0x7F) << 21) | ((bytes[off + 1] & 0x7F) << 14) |
      ((bytes[off + 2] & 0x7F) << 7) | (bytes[off + 3] & 0x7F);
  }
  function frameId(bytes, off) {
    return String.fromCharCode(bytes[off], bytes[off + 1], bytes[off + 2], bytes[off + 3]);
  }

  /* ID3v2.3/v2.4: chỉ đọc TIT2 (title), TPE1 (artist), TALB (album),
     TPE2 (album artist — chỉ dùng khi TPE1 trống). Trả {title, artist,
     album, source:"id3v2"} với null cho trường không có. Không đọc
     ảnh bìa (picture) — Amp chưa có chỗ hiện bìa. */
  function parseId3v2(bytes) {
    var out = { title: null, artist: null, album: null, source: "id3v2" };
    if (!bytes || bytes.length < 10) return out;
    if (bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) return out; /* "ID3" */
    var major = bytes[3];
    if (major !== 3 && major !== 4) return out;
    var flags = bytes[5];
    var tagSize = synchsafe(bytes, 6);
    var end = Math.min(bytes.length, 10 + tagSize);
    var pos = 10;
    if (flags & 0x40) { /* extended header: 4 byte size (v2.3: BE, v2.4: synchsafe) */
      if (pos + 4 > end) return out;
      var extSize = major === 4 ? synchsafe(bytes, pos) : ((bytes[pos] << 24) | (bytes[pos + 1] << 16) | (bytes[pos + 2] << 8) | bytes[pos + 3]);
      pos += 4 + extSize;
    }
    var albumArtist = null;
    while (pos + 10 <= end) {
      var id = frameId(bytes, pos);
      if (id.charCodeAt(0) === 0) break; /* padding */
      var size = major === 4
        ? synchsafe(bytes, pos + 4)
        : ((bytes[pos + 4] << 24) | (bytes[pos + 5] << 16) | (bytes[pos + 6] << 8) | bytes[pos + 7]);
      var dataStart = pos + 10;
      var dataEnd = Math.min(end, dataStart + size);
      if (size <= 0 || dataEnd <= dataStart) { pos = dataStart + Math.max(size, 0); continue; }
      var text = decodeTextFrame(bytes, dataStart, dataEnd);
      if (id === "TIT2" && !out.title) out.title = text || null;
      else if (id === "TPE1" && !out.artist) out.artist = text || null;
      else if (id === "TALB" && !out.album) out.album = text || null;
      else if (id === "TPE2" && !albumArtist) albumArtist = text || null;
      pos = dataStart + size;
    }
    if (!out.artist && albumArtist) out.artist = albumArtist;
    return out;
  }
  /* ID3v1: 128 byte cuối, "TAG" + title 30 + artist 30 + album 30
     (Latin-1, kết thúc NUL). Chỉ điền trường còn trống. */
  function parseId3v1(bytes) {
    var out = { title: null, artist: null, album: null, source: "id3v1" };
    if (!bytes || bytes.length < 128) return out;
    var base = bytes.length - 128;
    if (bytes[base] !== 0x54 || bytes[base + 1] !== 0x41 || bytes[base + 2] !== 0x47) return out; /* "TAG" */
    out.title = latin1(bytes, base + 3, base + 33) || null;
    out.artist = latin1(bytes, base + 33, base + 63) || null;
    out.album = latin1(bytes, base + 63, base + 93) || null;
    return out;
  }
  /* FLAC: "fLaC" + các metadata block; block type 4 = VORBIS_COMMENT
     (vendor length LE + vendor + số comment LE + từng comment
     "KEY=value" UTF-8). Chỉ đọc TITLE/ARTIST/ALBUM. */
  function parseFlacBuffer(buf) {
    var out = { title: null, artist: null, album: null, source: "flac" };
    var bytes = toUint8(buf);
    if (!bytes || bytes.length < 8) return out;
    if (bytes[0] !== 0x66 || bytes[1] !== 0x4C || bytes[2] !== 0x61 || bytes[3] !== 0x43) return out; /* "fLaC" */
    var pos = 4;
    while (pos + 4 <= bytes.length) {
      var type = bytes[pos] & 0x7F;
      var last = !!(bytes[pos] & 0x80);
      var len = (bytes[pos + 1] << 16) | (bytes[pos + 2] << 8) | bytes[pos + 3];
      var start = pos + 4, end = Math.min(bytes.length, start + len);
      if (type === 4) {
        var p = start;
        function le32(at) { return (bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16) | (bytes[at + 3] << 24)) >>> 0; }
        if (p + 4 > end) break;
        p += 4 + le32(p); /* vendor */
        if (p + 4 > end) break;
        var count = le32(p); p += 4;
        for (var i = 0; i < count && p + 4 <= end; i++) {
          var clen = le32(p); p += 4;
          var cend = Math.min(end, p + clen);
          var comment = "";
          try {
            if (typeof TextDecoder !== "undefined") comment = new TextDecoder("utf-8").decode(bytes.subarray ? bytes.subarray(p, cend) : bytes.slice(p, cend));
            else comment = latin1(bytes, p, cend);
          } catch (e) { comment = latin1(bytes, p, cend); }
          var eq = comment.indexOf("=");
          if (eq > 0) {
            var key = comment.slice(0, eq).toUpperCase();
            var val = comment.slice(eq + 1).replace(/^\s+|\s+$/g, "");
            if (val) {
              if (key === "TITLE" && !out.title) out.title = val;
              else if (key === "ARTIST" && !out.artist) out.artist = val;
              else if (key === "ALBUM" && !out.album) out.album = val;
            }
          }
          p = cend;
        }
        break;
      }
      pos = end;
      if (last) break;
    }
    return out;
  }
  function toUint8(buf) {
    if (!buf) return null;
    if (buf instanceof Uint8Array) return buf;
    if (typeof ArrayBuffer !== "undefined" && buf instanceof ArrayBuffer) return new Uint8Array(buf);
    if (buf.buffer && buf.buffer instanceof ArrayBuffer) return new Uint8Array(buf.buffer, buf.byteOffset || 0, buf.byteLength);
    return null;
  }
  /* Gộp ID3v2 + ID3v1 (+ FLAC): v2 thắng, v1 chỉ lấp chỗ trống. */
  function parseId3Buffer(buf) {
    var bytes = toUint8(buf);
    if (!bytes) return { title: null, artist: null, album: null, source: "none" };
    var isFlac = bytes.length >= 4 && bytes[0] === 0x66 && bytes[1] === 0x4C && bytes[2] === 0x61 && bytes[3] === 0x43;
    if (isFlac) return parseFlacBuffer(bytes);
    var v2 = parseId3v2(bytes);
    var v1 = parseId3v1(bytes);
    var out = {
      title: v2.title || v1.title || null,
      artist: v2.artist || v1.artist || null,
      album: v2.album || v1.album || null,
      source: (v2.title || v2.artist || v2.album) ? "id3v2" : ((v1.title || v1.artist || v1.album) ? "id3v1" : "none")
    };
    return out;
  }

  /* ---------- nạp lib music-metadata qua CDN (dynamic import) ---------- */
  var libPromise = null, libFailed = false;
  function dynamicImport(url) {
    /* Dynamic import() chạy được trong classic script ở trình duyệt
       hiện đại lẫn Node; bọc trong Function để file UMD này không
       thành module ESM. Lỗi mạng → reject, caller tự fallback. */
    var fn = new Function("u", "return import(u)");
    return fn(url);
  }
  function loadLib(opts) {
    opts = opts || {};
    if (opts.lib) return Promise.resolve(opts.lib);
    try {
      var g = typeof globalThis !== "undefined" ? globalThis : null;
      if (g && g.musicMetadata && typeof g.musicMetadata.parseBlob === "function") return Promise.resolve(g.musicMetadata);
      if (typeof window !== "undefined" && window.musicMetadata && typeof window.musicMetadata.parseBlob === "function") return Promise.resolve(window.musicMetadata);
    } catch (e) { /* bỏ qua */ }
    if (libPromise) return libPromise;
    var importFn = opts.importFn || dynamicImport;
    libPromise = importFn(MUSIC_METADATA_ESM_URL).then(function (mod) {
      var lib = (mod && mod.default) || mod;
      if (!lib || typeof lib.parseBlob !== "function") throw new Error("music-metadata: module nap duoc nhung khong co parseBlob");
      return lib;
    }).catch(function () {
      return importFn(MUSIC_METADATA_ESM_FALLBACK_URL).then(function (mod2) {
        var lib2 = (mod2 && mod2.default) || mod2;
        if (!lib2 || typeof lib2.parseBlob !== "function") throw new Error("music-metadata: module du phong khong co parseBlob");
        return lib2;
      });
    }).catch(function (e) {
      libFailed = true;
      libPromise = null; /* lần sau thử lại (mạng có thể đã về) */
      throw e;
    });
    return libPromise;
  }
  function readBlobAsArrayBuffer(file, opts) {
    opts = opts || {};
    if (file && typeof file.arrayBuffer === "function") {
      try {
        var p = file.arrayBuffer();
        if (p && typeof p.then === "function") return p;
        return Promise.resolve(p);
      } catch (e) { /* rơi xuống FileReader */ }
    }
    var FR = opts.FileReaderCtor || (typeof FileReader !== "undefined" ? FileReader : null);
    if (FR && file) {
      return new Promise(function (resolve, reject) {
        var rd = new FR();
        rd.onload = function () { resolve(rd.result); };
        rd.onerror = function () { reject(new Error("khong doc duoc file")); };
        try { rd.readAsArrayBuffer(file); } catch (e) { reject(e); }
      });
    }
    return Promise.reject(new Error("khong co cach doc file thanh ArrayBuffer"));
  }

  /* Đọc tag 1 file local — đúng thứ tự của fork (genMediaTags):
     1) lib music-metadata qua CDN (parseBlob, duration:true) — đọc
        được MP3/FLAC/OGG/M4A/WAV…; 2) parser ID3/FLAC nội bộ lấp chỗ
     lib thiếu hoặc khi lib không nạp được; 3) không tag nào thì trả
     hasTags=false, caller giữ tên file + duration đã probe bằng thẻ
     audio. KHÔNG throw — lỗi nào cũng trả meta rỗng source "none". */
  /* ĐỌC TAG NHANH (chỉ hiệu năng, KHÔNG đổi parser ID3/FLAC): chạy SONG
     SONG — parser nội bộ chỉ đọc lát cắt đầu file (256KB, đủ cho
     ID3v2/FLAC) + 128 byte cuối (ID3v1); lib CDN chỉ để lấp chỗ thiếu
     (M4A/OGG/WMA mà parser nội bộ không hỗ trợ) + lấy duration; lib quá
     hạn (opts.libTimeoutMs, mặc định 10s) thì trả ngay kết quả nội bộ,
     không chờ import. Kết quả gộp như cũ (lib thắng, nội bộ lấp chỗ
     trống). (Trước đây: chờ lib xong mới chạy parser nội bộ, lại đọc
     TOÀN BỘ file — mạng chậm thì tag về muộn, 105 file x vài MB thì
     máy lag khi nạp thư mục.) */
  var TAG_HEAD_BYTES = 262144;
  var LIB_TIMEOUT_MS_DEFAULT = 10000;
  function readLocalTags(file, opts) {
    opts = opts || {};
    function parseHeadTail(headAb, tailAb) {
      var out = { title: null, artist: null, album: null, source: "none" };
      if (headAb) {
        var h = parseId3Buffer(headAb);
        if (h.title) out.title = h.title;
        if (h.artist) out.artist = h.artist;
        if (h.album) out.album = h.album;
        if (h.source && h.source !== "none") out.source = h.source;
      }
      if (tailAb) {
        var t = parseId3v1(toUint8(tailAb));
        if (!out.title && t.title) out.title = t.title;
        if (!out.artist && t.artist) out.artist = t.artist;
        if (!out.album && t.album) out.album = t.album;
        if (out.source === "none" && t.source && t.source !== "none") out.source = t.source;
      }
      return out;
    }
    if (file && typeof file.slice === "function") {
      var size = file.size || 0;
      var headP = null;
      try {
        var headBlob = file.slice(0, TAG_HEAD_BYTES);
        headP = (headBlob && typeof headBlob.arrayBuffer === "function")
          ? headBlob.arrayBuffer() : readBlobAsArrayBuffer(headBlob, opts);
      } catch (e) { headP = Promise.reject(e); }
      var tailP = Promise.resolve(null);
      if (size > TAG_HEAD_BYTES + 128) {
        try {
          var tailBlob = file.slice(size - 128, size);
          tailP = (tailBlob && typeof tailBlob.arrayBuffer === "function")
            ? tailBlob.arrayBuffer() : readBlobAsArrayBuffer(tailBlob, opts);
        } catch (e) { tailP = Promise.resolve(null); }
      }
      return Promise.all([
        Promise.resolve(headP).catch(function () { return null; }),
        Promise.resolve(tailP).catch(function () { return null; })
      ]).then(function (parts) { return parseHeadTail(parts[0], parts[1]); });
    }
    /* File gia / khong co slice (test): doc day du nhu cu. */
    return readBlobAsArrayBuffer(file, opts).then(function (ab) {
      return parseId3Buffer(ab);
    }).catch(function () { return null; });
  }
  function probeFile(file, opts) {
    opts = opts || {};
    if (!file) {
      var empty = normalizeMetadata(null, opts.fallback);
      empty.source = "none"; empty.libUsed = false; empty.status = "none";
      return Promise.resolve(empty);
    }
    var fallback = opts.fallback || {};
    var libTimeoutMs = (opts.libTimeoutMs !== undefined) ? opts.libTimeoutMs : LIB_TIMEOUT_MS_DEFAULT;
    /* Parser noi bo chay ngay tren lat cat (khong cho lib). */
    var localP = readLocalTags(file, opts).catch(function () { return null; });
    /* Lib CDN chay song song, co han gio — qua han thi bo, dung noi bo. */
    var libP;
    try { libP = loadLib(opts); } catch (e) { libP = Promise.reject(e); }
    var libTimedP = Promise.race([
      Promise.resolve(libP).then(function (lib) { return lib; }).catch(function () { return null; }),
      new Promise(function (res) { setTimeout(function () { res(null); }, libTimeoutMs); })
    ]);
    var libMetaP = libTimedP.then(function (lib) {
      if (!lib) return null;
      return Promise.resolve(lib.parseBlob(file, { duration: true, skipPostHeaders: true })).then(function (raw) {
        return raw ? normalizeMetadata(raw, fallback) : null;
      }).catch(function () { return null; });
    });
    return Promise.all([localP, libMetaP]).then(function (parts) {
      var local = parts[0], libMeta = parts[1];
      var meta;
      if (libMeta) {
        meta = libMeta;
        if (local) {
          if (!meta.title && local.title) meta.title = local.title;
          if (!meta.artist && local.artist) meta.artist = local.artist;
          if (!meta.album && local.album) meta.album = local.album;
        }
        meta.hasTags = !!(meta.title || meta.artist || meta.album);
        meta.source = "lib";
        meta.libUsed = true;
      } else if (local && (local.title || local.artist || local.album)) {
        meta = normalizeMetadata({ title: local.title, artist: local.artist, album: local.album }, fallback);
        meta.source = local.source || "id3";
        meta.libUsed = false;
      } else {
        meta = normalizeMetadata(null, fallback);
        meta.source = "none";
        meta.libUsed = false;
      }
      meta.status = meta.hasTags || meta.duration ? "ok" : "none";
      return meta;
    });
  }

  /* Ghi tag vào model mục playlist (KHÔNG phá model cũ — giống fork
     SET_MEDIA_TAGS nhưng giữ tên file làm tên hiển thị chính):
     - title (tag) → item.tagTitle (tên file ở item.name giữ nguyên).
     - artist/album (tag) thắng nghệ sĩ/album suy từ thư mục.
     - duration (tag/lib) chỉ ghi khi item.len còn null (thời lượng
       probe bằng thẻ audio — nếu đã có — giữ nguyên).
     - bitrate/sampleRate chỉ lưu model, KHÔNG dùng cho viên KBPS/KHZ.
     Trả true nếu có trường nào đổi. */
  function applyMetadataToItem(item, meta, fallback) {
    if (!item || !meta) return false;
    var changed = false;
    function set(key, val) { if (val !== null && val !== undefined && item[key] !== val) { item[key] = val; changed = true; } }
    if (meta.title) set("tagTitle", meta.title);
    if (meta.artist) set("artist", meta.artist);
    if (meta.album) set("album", meta.album);
    if (meta.duration && (item.len === null || item.len === undefined)) {
      item.len = Math.round(meta.duration); changed = true;
    }
    if (meta.bitrate) set("tagBitrate", meta.bitrate);
    if (meta.sampleRate) set("tagSampleRate", meta.sampleRate);
    /* v10.4 — SO KENH CUA NGUON (Webamp: numberOfChannels): luu vao item
       de chi bao stereo/mono dung so kenh that thay vi chi do tin hieu
       (xem updateChannelsIndicator). 1 kenh = mono, >=2 = stereo. */
    if (meta.channels) set("channels", meta.channels);
    if (meta.source) set("metaSource", meta.source);
    if (meta.status) set("metaStatus", meta.status);
    else if (meta.hasTags) set("metaStatus", "ok");
    if (fallback) {
      if (!item.album && fallback.album) set("album", fallback.album);
      if (!item.artist && fallback.artist) set("artist", fallback.artist);
    }
    return changed;
  }

  /* Hiển thị: tên bài = tag title (nếu có) else tên file; nghệ sĩ/
     album trống → "Không rõ" (quy ước fork cho mục không thẻ). */
  function displayTitle(item) {
    if (!item) return "";
    return item.tagTitle || item.name || "";
  }
  function displayArtist(item) {
    if (!item) return UNKNOWN;
    var a = (item.artist || "").replace(/^\s+|\s+$/g, "");
    return a ? a : UNKNOWN;
  }
  function displayAlbum(item) {
    if (!item) return UNKNOWN;
    var a = (item.album || "").replace(/^\s+|\s+$/g, "");
    return a ? a : UNKNOWN;
  }
  function formatFileSize(bytes) {
    if (bytes === null || bytes === undefined) return null;
    var b = Number(bytes);
    if (!isFinite(b) || b < 0) return null;
    if (b < 1024) return b + " B";
    if (b < 1048576) return Math.round(b / 1024) + " KB";
    return (b / 1048576).toFixed(1).replace(".", ",") + " MB";
  }

  return {
    METADATA_VERSION: METADATA_VERSION,
    EXPECTED_METADATA_VERSION: EXPECTED_METADATA_VERSION,
    MANIFEST_VERSION: MANIFEST_VERSION,
    MANIFEST_MISMATCH: MANIFEST_MISMATCH,
    UNKNOWN: UNKNOWN,
    MUSIC_METADATA_ESM_URL: MUSIC_METADATA_ESM_URL,
    MUSIC_METADATA_ESM_FALLBACK_URL: MUSIC_METADATA_ESM_FALLBACK_URL,
    normalizeMetadata: normalizeMetadata,
    readLocalTags: readLocalTags, TAG_HEAD_BYTES: TAG_HEAD_BYTES,
    parseId3Buffer: parseId3Buffer,
    parseId3v2: parseId3v2,
    parseId3v1: parseId3v1,
    parseFlacBuffer: parseFlacBuffer,
    probeFile: probeFile,
    loadLib: loadLib,
    readBlobAsArrayBuffer: readBlobAsArrayBuffer,
    applyMetadataToItem: applyMetadataToItem,
    displayTitle: displayTitle,
    displayArtist: displayArtist,
    displayAlbum: displayAlbum,
    formatFileSize: formatFileSize,
    isLibFailed: function () { return libFailed; }
  };
});
