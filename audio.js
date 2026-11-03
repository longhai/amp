/* Amp v9 — audio.js (ĐỢT E, version 9.2): phát tiếng thật — nhạc + radio/TV,
   tiếng video ĐI QUA chuỗi EQ/AudioContext như nhạc (lý do hủy Amp 2/11).

   ---------------------------------------------------------------------------
   VÌ SAO KHÔNG LÀM THEO ĐÚNG CHỮ "TẠO CẢ 2 SOURCE LÚC BẤM PHÁT LẦN ĐẦU"
   ---------------------------------------------------------------------------
   createMediaElementSource(el) chỉ gọi được 1 lần/el, và KHI ĐÃ GỌI thì
   tiếng của el bị "bắt" vĩnh viễn qua graph. Trình duyệt IM LẶNG khi media
   cross-origin KHÔNG có CORS đi qua MediaElementSource: play() vẫn chạy,
   timeline vẫn chạy, nhưng graph chỉ ra số 0 (không lỗi nào được ném).
   Đã kiểm chứng bằng tra cứu (MDN / Firefox bug 1111382 / tài liệu Web
   Audio): "When connecting an HTML5 <audio> via createMediaElementSource
   to Web Audio API, browsers silence output without [CORS] credentials".
   Hệ quả trực tiếp: nếu tạo source cho thẻ <video> ngay lần phát đầu
   (khi EQ đang TẮT, crossOrigin chưa gắn), kênh TV360 qua vmttv (redirect
   302 thiếu Access-Control-Allow-Origin) sẽ CÂM ngay cả khi EQ tắt — đúng
   cái cần tránh. Cách Webamp fork làm (và cách file này làm) là:

   - Graph (AudioContext + preamp + 10 biquad + master + analyser) tạo
     khi người dùng bấm phát lần đầu; analyser đăng ký với renderer ngay
     (setAvsAnalyser) để vis đọc 0 (đứng yên) khi chưa có tín hiệu.
   - MediaElementSource tạo MUỘN (lazy), MỖI THẺ 1 LẦN DUY NHẤT, chỉ khi
     EQ đang BẬT và media đã nạp THÀNH CÔNG với crossOrigin="anonymous"
     (tức server có CORS). Trước lúc đó media phát NATIVE (tiếng trực tiếp
     ra loa, to như Webamp fork).
   - EQ tắt -> mở: bắt buộc đổi crossOrigin (anonymous) + NẠP LẠI src
     (khôi phục vị trí với bài có thời lượng); media nhiễm CORS (tainted)
     mà đưa qua source thì câm, nên không có cách nào khác. Đổi xong mà
     server không có CORS (vd vmttv) thì kênh lỗi như fork ("bật eq lên là
     không xem được thiệt"); tắt EQ lại thì nạp lại native là xem được.
   - EQ mở -> tắt: CHỈ nối/ngắt node (source -> destination, ngắt chuỗi
     EQ), KHÔNG nạp lại, KHÔNG tạo lại source (đúng ràng buộc "không ngắt
     quãng quá 100ms"). Media đang nạp bằng anonymous + có CORS thì tiếng
     vẫn qua source -> destination bình thường.
   - EQ tắt + source ĐÃ TỒN TẠI (đã từng bật EQ) + URL cross-origin: thẻ
     cũ đã bị "bắt" nên nạp không-CORS sẽ câm -> DÙNG THẺ MỚI (fresh
     element: <audio> tạo lại trong engine; <video> nhờ renderer
     resetAvsMedia) để phát native lại được. URL cùng origin / blob:
     (nhạc local) không nhiễm nên không cần thẻ mới.
   ---------------------------------------------------------------------------
   Chuỗi EQ (1 chuỗi chung, 2 nguồn vào):
     audioSrc ─┐
               ├─> preamp (Gain, 0..1) -> 10 Biquad peaking
     videoSrc ─┘    (31.5/63/125/250/500/1K/2K/4K/8K/16K Hz, Q~1,
                    gain = frac*24-12 dB) -> master (Gain = volume)
                    -> analyser (fftSize 64) -> destination.
   Chỉ nguồn đang phát mới có tín hiệu nên không chồng tiếng; nguồn tạm
   dừng ra số 0. EQ tắt: ngắt chuỗi, source -> destination thẳng (bypass
   tuyệt đối); analyser nằm sau master nên không còn tín hiệu -> vis đứng
   yên. Khi chưa có source nào (EQ chưa từng bật), media phát native và
   analyser cũng đọc 0 -> vis đứng yên.
   ---------------------------------------------------------------------------
   Native trước, HLS sau (như IPTV Viewer v10): gán thẳng el.src (không
   fetch, không HLS.js trước) để redirect 302 thiếu CORS vẫn xem được.
   Chỉ khi native báo lỗi HOẶC 6s chưa phát (không 'playing'/'timeupdate')
   mới rơi về HLS.js (chỉ với URL .m3u8 — HLS.js không phát được mp3).
   HLS.js nạp ĐỘNG từ CDN cdnjs 1.5.13 (không đóng gói file), chỉ khi cần.
   Lỗi lần đầu -> thử lại 1 lần sau 3s (chống báo oan); lỗi lần 2 mới báo
   kênh lỗi qua onError, ở yên kênh (không tự nhảy kênh dưới).
   ---------------------------------------------------------------------------
   File này KHÔNG biết gì về skin/playlist (renderer gọi qua API, nhận
   callback). Test được bằng jsdom + stub AudioContext/HLS (audio-test.js).
   jsdom stub KHÔNG chứng minh được tiếng thật — EQ on/off đổi tiếng thật
   trên video và TV360 qua vmttv (EQ tắt) CHỈ kiểm được trên điện thoại thật.
*/
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory();
  else root.AmpAudio = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var AUDIO_VERSION = "9.8";
  var EXPECTED_AUDIO_VERSION = "9.8";
  /* ĐỢT F — version manifest duy nhất (như skin-loader.js): index.html
     đặt window.AMP_VERSION = "9.8" TRƯỚC khi nạp file này; khác manifest
     thì MANIFEST_MISMATCH = true để trang báo "bản mix". Không có
     manifest (test trực tiếp bằng require) thì không kiểm. */
  var MANIFEST_VERSION = (function () {
    try {
      if (typeof globalThis !== "undefined" && globalThis.AMP_VERSION) return globalThis.AMP_VERSION;
      if (typeof window !== "undefined" && window.AMP_VERSION) return window.AMP_VERSION;
    } catch (e) { /* bỏ qua */ }
    return null;
  })();
  var MANIFEST_MISMATCH = MANIFEST_VERSION !== null && MANIFEST_VERSION !== AUDIO_VERSION;
  var EQ_FREQS = [31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
  var EQ_Q = 1;
  var HLS_CDN_URL = "https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.5.13/hls.min.js";
  var NATIVE_TIMEOUT_MS = 6000;   /* native 6s chưa phát -> rơi về HLS */
  var ERROR_RECHECK_MS = 3000;    /* lỗi lần đầu: thử lại sau 3s chống báo oan */
  var ANALYSER_FFT_SIZE = 64;

  function clamp01(v) { v = +v; if (isNaN(v)) return 0.5; return v < 0 ? 0 : v > 1 ? 1 : v; }
  function fracToDb(frac) { return clamp01(frac) * 24 - 12; }
  /* Đợt L (9.8): URL HLS không nhất thiết có đuôi .m3u8 — proxy TV vmttv
     (https://vmttv.dpdns.org/tv360/?id=N) redirect 302 tới master HLS
     tv360.vn nhưng URL gốc không có .m3u8. Trước đây isHlsUrl trả false
     nên trên trình duyệt KHÔNG có HLS native (Chrome Linux/desktop)
     engine không bao giờ thử hls.js: đo headless 3/11 — native lỗi 4
     (MEDIA_ERR_SRC_NOT_SUPPORTED), hlsTried=false, videoWidth=0 mãi.
     Trên điện thoại (native HLS) không ảnh hưởng — native vẫn thử
     trước, hls.js chỉ là fallback khi native lỗi/timeout. Chỉ thêm host
     nào đã đo thật là proxy HLS (vmttv); đừng đoán thêm. */
  var HLS_PROXY_HOSTS = ["vmttv.dpdns.org"];
  function isHlsUrl(url) {
    var u = String(url || "");
    if (/\.m3u8($|\?)/i.test(u)) return true;
    var low = u.toLowerCase();
    for (var i = 0; i < HLS_PROXY_HOSTS.length; i++) {
      if (low.indexOf(HLS_PROXY_HOSTS[i]) >= 0) return true;
    }
    return false;
  }
  function originOf(u) {
    var m = /^[a-z][a-z0-9+.-]*:\/\/[^\/]+/i.exec(String(u || ""));
    return m ? m[0].toLowerCase() : "";
  }

  function createAudioEngine(opts) {
    opts = opts || {};
    var doc = opts.document || (typeof document !== "undefined" ? document : null);
    var win = opts.window || (typeof window !== "undefined" ? window : null);
    var AudioCtxCtor = opts.AudioContext || (win && (win.AudioContext || win.webkitAudioContext))
      || (typeof AudioContext !== "undefined" ? AudioContext : null)
      || (typeof webkitAudioContext !== "undefined" ? webkitAudioContext : null);

    /* --- callback ra renderer (đều optional, có guard) --- */
    var onTimeUpdate = opts.onTimeUpdate || null;     /* (t, duration|null, seekable|null) */
    var onEnded = opts.onEnded || null;               /* () */
    var onError = opts.onError || null;               /* ({item, reason}) */
    var onPlayingChange = opts.onPlayingChange || null; /* (playing) */
    var onAnalyser = opts.onAnalyser || null;         /* (analyser) — renderer.setAvsAnalyser */
    var getVideoEl = opts.getVideoEl || null;         /* () -> <video> của renderer */
    var resetVideoEl = opts.resetVideoEl || null;     /* () -> renderer.resetAvsMedia() */
    var isVideoItem = opts.isVideoItem || function () { return false; };
    var HlsCtor = opts.Hls || null;                   /* test inject; không có thì nạp động CDN */
    var hlsUrl = opts.hlsUrl || HLS_CDN_URL;
    var nativeTimeoutMs = opts.nativeTimeoutMs !== undefined ? opts.nativeTimeoutMs : NATIVE_TIMEOUT_MS;
    var errorRecheckMs = opts.errorRecheckMs !== undefined ? opts.errorRecheckMs : ERROR_RECHECK_MS;

    /* --- graph --- */
    var ctx = null, preamp = null, bandNodes = [], master = null, analyser = null;
    var graphBuilt = false, graphUnavailable = false;
    /* Đợt K (9.7, điểm 7a) — đo kênh thật (stereo/mono) khi có source:
       ChannelSplitter(2) tách L/R từ source + 2 analyser nhỏ đo biên độ
       từng kênh. Chỉ đo được khi MediaElementSource đã tồn tại (EQ bật +
       đài có CORS); không có source thì không đo được (xem ghi chú trong
       renderer.updateChannelsIndicator). */
    var chSplitter = null, chAnL = null, chAnR = null, chProbeFor = null;
    var measuredChannels = null, measuredForEl = null;
    /* --- media --- */
    var audioEl = null, audioSrc = null, audioSrcEl = null;
    var videoSrc = null, videoSrcEl = null, lastVideoEl = null;
    var hls = null, hlsLoading = null;
    /* --- trạng thái phát --- */
    var currentItem = null, currentEl = null, currentKind = null; /* "audio" | "video" */
    var currentCrossOrigin = null; /* "anonymous" | null — chế độ CORS của lần nạp hiện tại */
    var playing = false, volume = 1, eqOn = false;
    var loadState = "idle"; /* idle | loading | playing | error */
    var loadSeq = 0, nativeTimer = null, recheckTimer = null;
    var retried = false, hlsTried = false, pendingSeek = null;
    var eqValues = { preamp: 0.5, bands: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5] };
    var destroyed = false;

    /* ---------- CORS ---------- */
    function pageOrigin() {
      try {
        var h = (win && win.location && win.location.href) || "";
        return originOf(h);
      } catch (e) { return ""; }
    }
    function isCrossOrigin(url) {
      var u = String(url || "");
      if (/^(blob|data):/i.test(u)) return false; /* blob: cùng origin trang; data: không qua mạng */
      var ou = originOf(u);
      if (!ou) return false; /* link tương đối -> cùng origin */
      var op = pageOrigin();
      if (!op) return true; /* không biết origin trang -> coi là khác (an toàn) */
      return ou !== op;
    }
    function setCrossOrigin(el, on) {
      if (!el) return;
      try {
        if (on) {
          el.setAttribute("crossorigin", "anonymous");
          try { el.crossOrigin = "anonymous"; } catch (e) { /* jsdom cũ */ }
        } else {
          el.removeAttribute("crossorigin");
          try { el.crossOrigin = null; } catch (e) { /* jsdom cũ */ }
        }
      } catch (e) { /* phần tử stub */ }
      currentCrossOrigin = on ? "anonymous" : null;
    }

    /* ---------- graph ---------- */
    function ensureGraph() {
      if (graphBuilt) return true;
      if (graphUnavailable || !AudioCtxCtor) { graphUnavailable = true; return false; }
      try {
        ctx = new AudioCtxCtor();
      } catch (e) { graphUnavailable = true; return false; }
      try {
        preamp = ctx.createGain();
        preamp.gain.value = clamp01(eqValues.preamp);
        bandNodes = [];
        for (var i = 0; i < EQ_FREQS.length; i++) {
          var b = ctx.createBiquadFilter();
          b.type = "peaking";
          b.frequency.value = EQ_FREQS[i];
          b.Q.value = EQ_Q;
          b.gain.value = fracToDb(eqValues.bands[i]);
          bandNodes.push(b);
        }
        master = ctx.createGain();
        master.gain.value = volume;
        analyser = ctx.createAnalyser();
        analyser.fftSize = ANALYSER_FFT_SIZE;
        try { analyser.smoothingTimeConstant = 0.8; } catch (e) { /* stub */ }
        /* Nối chuỗi (chưa có nguồn vào): preamp -> 10 biquad -> master -> analyser -> destination. */
        var head = preamp;
        for (var j = 0; j < bandNodes.length; j++) { head.connect(bandNodes[j]); head = bandNodes[j]; }
        head.connect(master);
        master.connect(analyser);
        analyser.connect(ctx.destination);
      } catch (e) { graphUnavailable = true; return false; }
      graphBuilt = true;
      /* Đăng ký analyser với renderer ngay: chưa có nguồn thì vis đọc 0
         (đứng yên) — đúng hành vi "EQ tắt -> vis đứng yên". */
      if (onAnalyser) { try { onAnalyser(analyser); } catch (e) { /* bỏ qua */ } }
      return true;
    }
    function sourceExistsFor(kind) {
      if (kind === "video") return !!videoSrc && videoSrcEl === lastVideoEl;
      return !!audioSrc && audioSrcEl === audioEl;
    }
    /* Tạo MediaElementSource — MỖI THẺ 1 LẦN DUY NHẤT trong đời trang
       (gọi lần 2 trình duyệt ném lỗi; engine giữ cờ để không gọi lại).
       Chỉ gọi khi EQ đang BẬT và media đã nạp thành công (loadedmetadata)
       với crossOrigin=anonymous — xem ghi chú đầu file. */
    function ensureSource(kind) {
      if (!graphBuilt || !ctx) return null;
      if (kind === "audio") {
        if (audioSrc && audioSrcEl === audioEl) return audioSrc;
        if (!audioEl) return null;
        try { audioSrc = ctx.createMediaElementSource(audioEl); }
        catch (e) { return null; }
        audioSrcEl = audioEl;
        routeSource(audioSrc);
        applyVolume();
        return audioSrc;
      }
      var v = getVideo();
      if (!v) return null;
      if (videoSrc && videoSrcEl === v) return videoSrc;
      try { videoSrc = ctx.createMediaElementSource(v); }
      catch (e) { return null; }
      videoSrcEl = v;
      routeSource(videoSrc);
      applyVolume();
      return videoSrc;
    }
    function routeSource(src) {
      if (!src || !ctx) return;
      try { src.disconnect(); } catch (e) { /* chưa nối gì */ }
      /* disconnect() cắt CẢ đường tới splitter đo kênh → nối lại sau. */
      chProbeFor = null;
      try { src.connect(eqOn ? preamp : ctx.destination); } catch (e) { /* stub */ }
      hookChannelProbe(src);
    }
    /* Đợt K (9.7) — móc source vào splitter đo kênh (lười tạo, dùng chung
       1 bộ cho cả 2 source; đổi source thì ngắt source cũ khỏi splitter).
       Stub jsdom (không có createChannelSplitter) thì im lặng bỏ qua. */
    function hookChannelProbe(src) {
      if (!ctx || !src || chProbeFor === src) return;
      try {
        if (!chSplitter) {
          chSplitter = ctx.createChannelSplitter(2);
          chAnL = ctx.createAnalyser(); chAnR = ctx.createAnalyser();
          chAnL.fftSize = 256; chAnR.fftSize = 256;
        }
        if (chProbeFor && chProbeFor !== src) { try { chProbeFor.disconnect(chSplitter); } catch (e) { /* bỏ qua */ } }
        src.connect(chSplitter);
        try { chSplitter.connect(chAnL, 0); } catch (e) { /* bỏ qua */ }
        try { chSplitter.connect(chAnR, 1); } catch (e) { /* bỏ qua */ }
        chProbeFor = src;
      } catch (e) { chProbeFor = null; }
    }
    /* Đợt K (9.7) — đo kênh thật của thẻ đang phát: lấy mẫu L/R 5 lần trong
       ~500ms, theo dõi mức từng kênh (maxL/maxR) và chênh lệch L-R (maxDiff).
       - Cả 2 kênh im (mức < 8) -> null (không kết luận), giữ "stereo" tạm.
       - Chỉ 1 kênh có tín hiệu (kênh kia im) -> "mono" (file mono qua
         splitter: kênh thừa im lặng, không phải L==R).
       - Cả 2 kênh có tín hiệu và khác nhau (diff > 8) -> "stereo".
       - Cả 2 kênh có tín hiệu và giống hệt (diff ~ 0) -> "mono" (dual mono /
         file mono đã upmix L==R ở source).
       Không có source sau 2s chờ (EQ tắt / không CORS) thì trả null.
       cb(state) với state ∈ {"stereo","mono",null}. */
    function getMeasuredChannels() {
      if (!currentEl || measuredForEl !== currentEl) return null;
      return measuredChannels;
    }
    function measureChannels(cb) {
      var el0 = currentEl;
      if (!el0 || !playing) { if (cb) cb(null); return; }
      var waited = 0;
      var tick = function () {
        if (!playing || currentEl !== el0) { if (cb) cb(null); return; }
        if (chProbeFor && chAnL && chAnR) { sample(); return; }
        waited += 100;
        if (waited >= 2000) { if (cb) cb(null); return; }
        setTimeout(tick, 100);
      };
      var sample = function () {
        var n = 0, maxL = 0, maxR = 0, maxDiff = 0;
        var bufL = new Uint8Array(256), bufR = new Uint8Array(256);
        var step = function () {
          if (!playing || currentEl !== el0) { if (cb) cb(null); return; }
          try { chAnL.getByteTimeDomainData(bufL); chAnR.getByteTimeDomainData(bufR); }
          catch (e) { if (cb) cb(null); return; }
          for (var i = 0; i < 256; i++) {
            var l = Math.abs(bufL[i] - 128), r = Math.abs(bufR[i] - 128);
            if (l > maxL) maxL = l;
            if (r > maxR) maxR = r;
            var d = Math.abs(bufL[i] - bufR[i]);
            if (d > maxDiff) maxDiff = d;
          }
          n++;
          if (n < 5) { setTimeout(step, 100); return; }
          var res = null;
          if (Math.max(maxL, maxR) >= 8) {
            if (Math.min(maxL, maxR) < 8) res = "mono";
            else res = (maxDiff > 8) ? "stereo" : "mono";
          }
          if (res && currentEl === el0) { measuredChannels = res; measuredForEl = el0; }
          if (cb) cb(res);
        };
        step();
      };
      tick();
    }
    /* Nối/ngắt toàn bộ source theo EQ hiện tại (chuyển on/off không nạp lại). */
    function applyRouting() {
      if (!graphBuilt || !ctx) return;
      if (audioSrc) routeSource(audioSrc);
      if (videoSrc) routeSource(videoSrc);
      applyVolume();
    }
    function applyEqValues(st) {
      if (st) {
        eqValues.preamp = clamp01(st.preamp !== undefined ? st.preamp : 0.5);
        var b = st.bands || [];
        for (var i = 0; i < 10; i++) eqValues.bands[i] = clamp01(b[i] !== undefined ? b[i] : 0.5);
      }
      if (!graphBuilt) return;
      try {
        if (preamp) preamp.gain.value = clamp01(eqValues.preamp);
        for (var j = 0; j < bandNodes.length; j++) bandNodes[j].gain.value = fracToDb(eqValues.bands[j]);
      } catch (e) { /* stub */ }
    }
    /* Âm lượng: qua chuỗi EQ thì el.volume=1 + master gain = volume;
       native hoặc bypass (source -> destination, master không nằm trên
       đường tiếng) thì el.volume = volume. */
    function applyVolume() {
      var throughChain = graphBuilt && eqOn && currentEl && sourceExistsFor(currentKind);
      if (currentEl) {
        try { currentEl.volume = throughChain ? 1 : volume; } catch (e) { /* stub */ }
      }
      if (graphBuilt && master) {
        try { master.gain.value = volume; } catch (e) { /* stub */ }
      }
    }

    /* ---------- media elements ---------- */
    function wireMediaEl(el) {
      if (!el || el._ampWired) return el;
      try {
        el.addEventListener("playing", onPlayingEv);
        el.addEventListener("timeupdate", onTimeEv);
        el.addEventListener("ended", onEndedEv);
        el.addEventListener("error", onMediaErrorEv);
        el.addEventListener("loadedmetadata", onMetaEv);
        el.addEventListener("pause", onPauseEv);
        el._ampWired = true;
      } catch (e) { /* phần tử stub */ }
      return el;
    }
    function getAudio() {
      if (!audioEl) {
        if (!doc) return null;
        audioEl = wireMediaEl(doc.createElement("audio"));
        try { audioEl.preload = "auto"; } catch (e) { /* stub */ }
      }
      return audioEl;
    }
    function getVideo() {
      if (!getVideoEl) return null;
      var v = null;
      try { v = getVideoEl(); } catch (e) { v = null; }
      if (!v) return null;
      if (v !== lastVideoEl) {
        /* Thẻ <video> đã đổi (fresh element sau resetAvsMedia): source cũ
           gắn với thẻ cũ, phải bỏ để thẻ mới được tạo source riêng. */
        videoSrc = null; videoSrcEl = null;
        lastVideoEl = v;
        wireMediaEl(v);
      }
      return v;
    }
    function pauseEl(el) {
      if (!el) return;
      try { el.pause(); } catch (e) { /* stub */ }
    }
    function clearSrc(el) {
      if (!el) return;
      try { el.removeAttribute("src"); } catch (e) { /* stub */ }
      try { el.load(); } catch (e) { /* stub */ }
    }
    /* Thẻ mới cho chế độ native khi thẻ cũ đã bị "bắt" bởi graph
       (EQ đã từng bật + URL cross-origin): thẻ mới chưa có source nên
       phát native lại được, tiếng không câm. */
    function freshElement(kind) {
      detachHls();
      if (kind === "video") {
        var oldV = lastVideoEl;
        if (oldV) { pauseEl(oldV); clearSrc(oldV); }
        if (resetVideoEl) { try { resetVideoEl(); } catch (e) { /* bỏ qua */ } }
        lastVideoEl = null; videoSrc = null; videoSrcEl = null;
        return getVideo();
      }
      var oldA = audioEl;
      if (oldA) { pauseEl(oldA); clearSrc(oldA); }
      audioEl = null; audioSrc = null; audioSrcEl = null;
      return getAudio();
    }
    function readDuration(el) {
      try {
        var d = el.duration;
        if (typeof d === "number" && isFinite(d) && d > 0) return d;
      } catch (e) { /* stub */ }
      return null;
    }
    function readSeekable(el) {
      try {
        var s = el.seekable;
        if (s && s.length) return s;
      } catch (e) { /* stub */ }
      return null;
    }
    function canSeekTo(el, t) {
      var s = readSeekable(el);
      if (!s || !s.length) return false;
      try {
        return t >= s.start(0) && t <= s.end(s.length - 1);
      } catch (e) { return false; }
    }

    /* ---------- HLS ---------- */
    function detachHls() {
      if (hls) {
        try { hls.destroy(); } catch (e) { /* bỏ qua */ }
        hls = null;
      }
    }
    function loadHlsCtor() {
      if (HlsCtor) return Promise.resolve(HlsCtor);
      if (win && win.Hls) return Promise.resolve(win.Hls);
      if (hlsLoading) return hlsLoading;
      hlsLoading = new Promise(function (resolve, reject) {
        if (!doc || !doc.createElement) { reject(new Error("khong co document de nap HLS.js")); return; }
        var s = doc.createElement("script");
        s.src = hlsUrl;
        s.onload = function () {
          hlsLoading = null;
          if (win && win.Hls) resolve(win.Hls);
          else reject(new Error("nap HLS.js xong nhung khong co window.Hls"));
        };
        s.onerror = function () { hlsLoading = null; reject(new Error("khong tai duoc HLS.js (can mang)")); };
        (doc.head || doc.getElementsByTagName("head")[0] || doc.documentElement).appendChild(s);
      });
      return hlsLoading;
    }
    function tryHls(seq) {
      if (!currentItem || !currentEl) return;
      hlsTried = true;
      loadHlsCtor().then(function (Hls) {
        if (destroyed || seq !== loadSeq || !currentEl) return;
        try {
          if (Hls.isSupported && !Hls.isSupported()) { handleLoadFailure("hls-unsupported"); return; }
        } catch (e) { /* stub không có isSupported -> cứ thử */ }
        detachHls();
        try {
          hls = new Hls({ maxBufferLength: 30 });
          hls.loadSource(currentItem.url);
          hls.attachMedia(currentEl);
          if (Hls.Events) {
            if (Hls.Events.MANIFEST_PARSED) hls.on(Hls.Events.MANIFEST_PARSED, function () {
              if (seq === loadSeq && currentEl) { try { currentEl.play(); } catch (e) { /* bỏ qua */ } }
            });
            if (Hls.Events.ERROR) hls.on(Hls.Events.ERROR, function (ev, data) {
              if (data && data.fatal) handleLoadFailure("hls");
            });
          }
          /* HLS cũng có thể treo (không manifest): hẹn giờ như native. */
          armNativeTimer(seq);
        } catch (e) { handleLoadFailure("hls"); }
      }).catch(function () { handleLoadFailure("hls-cdn"); });
    }

    /* ---------- nạp + phát ---------- */
    function clearTimers() {
      if (nativeTimer) { clearTimeout(nativeTimer); nativeTimer = null; }
    }
    function armNativeTimer(seq) {
      clearTimers();
      nativeTimer = setTimeout(function () {
        nativeTimer = null;
        if (destroyed || seq !== loadSeq || !currentItem || !currentEl) return;
        if (playing) return; /* đã phát rồi thì thôi */
        if (isHlsUrl(currentItem.url) && !hlsTried) tryHls(seq);
        else handleLoadFailure("timeout");
      }, nativeTimeoutMs);
    }
    function setSrcAndPlay(el, url, seq) {
      try { el.src = url; } catch (e) { /* stub */ }
      try { el.load(); } catch (e) { /* stub: jsdom load() là no-op */ }
      armNativeTimer(seq);
      try {
        var p = el.play();
        if (p && p.catch) p.catch(function () { /* autoplay chặn -> chờ event; lỗi thật sẽ tới qua 'error' */ });
      } catch (e) { /* play() đồng bộ ném lỗi (stub) -> chờ 'error' */ }
    }
    /* Nạp 1 mục (nội bộ). opts.userInitiated=true khi người dùng bấm
       (phát mới / next / prev): hủy lịch thử lại 3s của mục cũ. */
    function loadAndPlay(item, opts2) {
      opts2 = opts2 || {};
      var seq = ++loadSeq;
      if (opts2.userInitiated && recheckTimer) { clearTimeout(recheckTimer); recheckTimer = null; }
      clearTimers();
      detachHls();
      /* Dừng thẻ đang phát (đổi audio <-> video thì thẻ kia phải im). */
      var prevEl = currentEl;
      if (prevEl) pauseEl(prevEl);
      pendingSeek = null;
      currentItem = item;
      var video = isVideoItem(item);
      currentKind = video ? "video" : "audio";
      var el = video ? getVideo() : getAudio();
      if (!el) { handleLoadFailure("no-element"); return { ok: false, reason: "no-element" }; }
      /* EQ tắt + thẻ đã có source + URL cross-origin -> thẻ mới (xem đầu file). */
      if (!eqOn && sourceExistsFor(currentKind) && isCrossOrigin(item.url)) {
        el = freshElement(currentKind);
        if (!el) { handleLoadFailure("no-element"); return { ok: false, reason: "no-element" }; }
      }
      currentEl = el;
      /* Đợt L (9.8) — ĐỔI KÊNH XÓA KHUNG HÌNH CŨ NGAY (người dùng báo
         3/11: chọn kênh TV360 khác mà hình vẫn là Đà Nẵng — kênh TV360
         bị xếp nhầm audio nên thẻ video không được gán src mới, giữ
         nguyên src + frame cuối của đài trước):
         - Thẻ video cũ không còn dùng (video -> audio): xóa src + load()
           để về trạng thái rỗng, khỏi dính frame đài cũ khi sau này mở
           lại AVS ở chế độ video.
         - Thẻ video dùng tiếp (video -> video, audio -> video): xóa src
           cũ TRƯỚC khi gán src mới — khung cũ biến mất ngay (vùng video
           đen/trống trong lúc nạp), hình mới chỉ hiện khi kênh mới có
           loadeddata/videoWidth > 0 (lưới an toàn renderer.setVideoInfo).
           Chỉ gán src mới thôi chưa đủ: trình duyệt có thể giữ frame
           cuối của luồng cũ tới khi có frame mới. */
      if (prevEl && prevEl !== el && prevEl === lastVideoEl) clearSrc(prevEl);
      if (el === lastVideoEl) clearSrc(el);
      /* Đợt K (9.7): bài/kênh mới -> kết quả đo kênh cũ hết hiệu lực (thẻ
         audio dùng lại cho bài mới nên không thể dựa vào measuredForEl). */
      measuredChannels = null; measuredForEl = null;
      /* Thử lại (sau lỗi 3s) phải GIỮ retried=true để lỗi lần 2 là lỗi
         cuối (không thử lại vô hạn). Chỉ lần nạp do người dùng bấm mới
         reset retried. */
      if (!opts2.keepRetried) retried = false;
      hlsTried = false;
      loadState = "loading";
      setCrossOrigin(el, eqOn);
      setSrcAndPlay(el, item.url, seq);
      applyVolume();
      return { ok: true };
    }
    /* Lỗi nạp: lần đầu thì thử lại 1 lần sau 3s (chống báo oan); lần 2
       mới báo kênh lỗi qua onError. Ở yên kênh — không tự nhảy kênh dưới. */
    function handleLoadFailure(reason) {
      clearTimers();
      if (!currentItem) return;
      if (!retried) {
        retried = true;
        if (recheckTimer) clearTimeout(recheckTimer);
        recheckTimer = setTimeout(function () {
          recheckTimer = null;
          if (destroyed || !currentItem) return;
          /* Thử lại từ native (không giữ HLS cũ), giữ retried=true. */
          hlsTried = false;
          loadAndPlay(currentItem, { userInitiated: false, keepRetried: true });
        }, errorRecheckMs);
        return;
      }
      loadState = "error";
      playing = false;
      if (onPlayingChange) { try { onPlayingChange(false); } catch (e) { /* bỏ qua */ } }
      if (onError) { try { onError({ item: currentItem, reason: reason }); } catch (e) { /* bỏ qua */ } }
    }

    /* ---------- events từ thẻ media ---------- */
    function currentEventEl(ev) {
      var el = (ev && (ev.target || ev.currentTarget)) || currentEl;
      return el === currentEl ? el : null;
    }
    function onPlayingEv(ev) {
      var el = currentEventEl(ev);
      if (!el) return;
      clearTimers();
      playing = true;
      loadState = "playing";
      if (onPlayingChange) { try { onPlayingChange(true); } catch (e) { /* bỏ qua */ } }
    }
    function onTimeEv(ev) {
      var el = currentEventEl(ev);
      if (!el) return;
      clearTimers(); /* có timeupdate = đang phát thật */
      if (!playing) {
        playing = true;
        loadState = "playing";
        if (onPlayingChange) { try { onPlayingChange(true); } catch (e) { /* bỏ qua */ } }
      }
      if (onTimeUpdate) {
        var t = 0;
        try { t = el.currentTime || 0; } catch (e) { t = 0; }
        try { onTimeUpdate(t, readDuration(el), readSeekable(el)); } catch (e) { /* bỏ qua */ }
      }
    }
    function onEndedEv(ev) {
      var el = currentEventEl(ev);
      if (!el) return;
      playing = false;
      if (onPlayingChange) { try { onPlayingChange(false); } catch (e) { /* bỏ qua */ } }
      if (onEnded) { try { onEnded(); } catch (e) { /* bỏ qua */ } }
    }
    function onPauseEv(ev) {
      var el = currentEventEl(ev);
      if (!el) return;
      playing = false;
      if (onPlayingChange) { try { onPlayingChange(false); } catch (e) { /* bỏ qua */ } }
    }
    function onMetaEv(ev) {
      var el = currentEventEl(ev);
      if (!el) return;
      /* Media nạp thành công với crossOrigin=anonymous (EQ bật) -> giờ
         mới tạo MediaElementSource (1 lần duy nhất) + nối qua chuỗi EQ.
         EQ tắt thì KHÔNG tạo source: media cứ phát native. */
      if (eqOn) ensureSource(currentKind);
      /* Khôi phục vị trí sau khi nạp lại do đổi EQ (chỉ tua được khi
         vùng seek chứa vị trí cũ; đài live tự chặn). */
      if (pendingSeek !== null && pendingSeek > 0) {
        var ps = pendingSeek;
        pendingSeek = null;
        try { if (canSeekTo(el, ps)) el.currentTime = ps; } catch (e) { /* bỏ qua */ }
      }
    }
    function onMediaErrorEv(ev) {
      var el = currentEventEl(ev);
      if (!el) return;
      clearTimers();
      if (isHlsUrl(currentItem ? currentItem.url : "") && !hlsTried) { tryHls(loadSeq); return; }
      handleLoadFailure("native-error");
    }

    /* ---------- API công khai ---------- */
    function playItem(item, eqState) {
      if (!item || !item.url) return { ok: false, reason: "no-url" }; /* muc khong co link nhac */
      if (eqState) { eqOn = !!eqState.on; applyEqValues(eqState); }
      ensureGraph();
      if (ctx && ctx.state === "suspended" && ctx.resume) {
        try { ctx.resume(); } catch (e) { /* bỏ qua */ }
      }
      return loadAndPlay(item, { userInitiated: true });
    }
    function pause() {
      if (!currentEl) return false;
      pauseEl(currentEl);
      return true;
    }
    function resume() {
      if (!currentEl) return { ok: false, reason: "nothing" };
      if (loadState === "error" && currentItem) return playItem(currentItem, { on: eqOn, preamp: eqValues.preamp, bands: eqValues.bands.slice() });
      ensureGraph();
      if (ctx && ctx.state === "suspended" && ctx.resume) {
        try { ctx.resume(); } catch (e) { /* bỏ qua */ }
      }
      try {
        var p = currentEl.play();
        if (p && p.catch) p.catch(function () { /* autoplay chặn */ });
      } catch (e) { /* bỏ qua */ }
      return { ok: true };
    }
    function togglePlay() {
      if (!currentEl) return { ok: false, reason: "nothing" };
      if (playing) { pause(); return { ok: true, paused: true }; }
      return resume();
    }
    function stop() {
      if (recheckTimer) { clearTimeout(recheckTimer); recheckTimer = null; }
      clearTimers();
      detachHls();
      if (currentEl) {
        pauseEl(currentEl);
        /* Tua về 0 CHỈ khi 0 nằm trong vùng seek được (đài live không tua). */
        try { if (canSeekTo(currentEl, 0)) currentEl.currentTime = 0; } catch (e) { /* bỏ qua */ }
      }
      playing = false;
      if (onPlayingChange) { try { onPlayingChange(false); } catch (e) { /* bỏ qua */ } }
      if (onTimeUpdate) {
        try { onTimeUpdate(0, currentEl ? readDuration(currentEl) : null, currentEl ? readSeekable(currentEl) : null); } catch (e) { /* bỏ qua */ }
      }
      return true;
    }
    function seekTo(t) {
      if (!currentEl) return false;
      if (!canSeekTo(currentEl, t)) return false;
      try { currentEl.currentTime = t; } catch (e) { return false; }
      return true;
    }
    function seekToFraction(frac) {
      if (!currentEl) return false;
      var d = readDuration(currentEl);
      if (!d) return false;
      return seekTo(clamp01(frac) * d);
    }
    function getDuration() { return currentEl ? readDuration(currentEl) : null; }
    function getCurrentTime() {
      if (!currentEl) return 0;
      try { return currentEl.currentTime || 0; } catch (e) { return 0; }
    }
    function setVolume(v) {
      volume = clamp01(v);
      applyVolume();
      return volume;
    }
    function setPreamp(frac) {
      eqValues.preamp = clamp01(frac);
      if (graphBuilt && preamp) {
        try { preamp.gain.value = clamp01(eqValues.preamp); } catch (e) { /* stub */ }
      }
      return eqValues.preamp;
    }
    /* dải 0 = preamp, 1..10 = eq1..eq10 (frac 0..1 -> -12..+12 dB). */
    function setEqBand(idx, frac) {
      idx = idx | 0;
      if (idx === 0) return setPreamp(frac);
      if (idx < 1 || idx > 10) return null;
      eqValues.bands[idx - 1] = clamp01(frac);
      if (graphBuilt && bandNodes[idx - 1]) {
        try { bandNodes[idx - 1].gain.value = fracToDb(eqValues.bands[idx - 1]); } catch (e) { /* stub */ }
      }
      return eqValues.bands[idx - 1];
    }
    /* Bật/tắt EQ (renderer gọi từ toggleCfg EQ_TOGGLE).
       - on -> off, source đã có: chỉ nối/ngắt node, KHÔNG nạp lại.
       - on -> off, chưa có source mà lần nạp hiện tại dùng anonymous
         (vd vừa lỗi CORS): nạp lại native để xem/nghe được.
       - off -> on, source đã có: chỉ nối lại chuỗi, KHÔNG nạp lại.
       - off -> on, chưa có source: đổi crossOrigin + NẠP LẠI src (bắt
         buộc — xem ghi chú đầu file), source tạo khi nạp thành công.
       Trả {changed, reloaded}. */
    function setEqOn(on, opts2) {
      on = !!on;
      if (on === eqOn) return { changed: false, reloaded: false };
      eqOn = on;
      if (!graphBuilt) ensureGraph();
      if (!currentEl || !currentItem) { applyRouting(); return { changed: true, reloaded: false }; }
      if (!on) {
        if (sourceExistsFor(currentKind)) { applyRouting(); return { changed: true, reloaded: false }; }
        if (currentCrossOrigin === "anonymous") {
          var pos = getCurrentTime();
          var wasPlaying = playing;
          var seq = ++loadSeq;
          clearTimers(); detachHls();
          retried = false; hlsTried = false; loadState = "loading";
          pendingSeek = pos > 0 ? pos : null; /* khôi phục ở loadedmetadata */
          setCrossOrigin(currentEl, false);
          setSrcAndPlay(currentEl, currentItem.url, seq);
          if (!wasPlaying) { pauseEl(currentEl); }
          return { changed: true, reloaded: true };
        }
        applyRouting();
        return { changed: true, reloaded: false };
      }
      /* off -> on */
      if (sourceExistsFor(currentKind)) { applyRouting(); return { changed: true, reloaded: false }; }
      var pos2 = getCurrentTime();
      var wasPlaying2 = playing;
      var seq2 = ++loadSeq;
      clearTimers(); detachHls();
      retried = false; hlsTried = false; loadState = "loading";
      pendingSeek = pos2 > 0 ? pos2 : null; /* khôi phục ở loadedmetadata */
      setCrossOrigin(currentEl, true);
      setSrcAndPlay(currentEl, currentItem.url, seq2);
      if (!wasPlaying2) { pauseEl(currentEl); }
      return { changed: true, reloaded: true };
    }
    function analyserHasSignal() {
      /* Tín hiệu vis: chuỗi EQ đang nối (EQ bật + source của thẻ đang
         phát đã nối vào preamp). EQ tắt hoặc chưa có source -> không tín hiệu. */
      return !!(graphBuilt && eqOn && currentEl && sourceExistsFor(currentKind) && playing);
    }
    function getState() {
      var routing = "native";
      if (currentEl && sourceExistsFor(currentKind)) routing = eqOn ? "eq" : "bypass";
      return {
        version: AUDIO_VERSION, graphBuilt: graphBuilt, graphUnavailable: graphUnavailable,
        ctxState: ctx ? ctx.state : null,
        eqOn: eqOn, routing: routing,
        audioSourced: !!audioSrc, videoSourced: !!videoSrc,
        currentKind: currentKind, currentName: currentItem ? currentItem.name : "",
        playing: playing, loadState: loadState, volume: volume,
        hlsActive: !!hls, hlsTried: hlsTried, retried: retried,
        analyserConnected: !!analyser, analyserSignal: analyserHasSignal(),
        measuredChannels: getMeasuredChannels(),
        eqValues: { preamp: eqValues.preamp, bands: eqValues.bands.slice() }
      };
    }
    function getAudioEl() { return getAudio(); }
    function getVideoElement() { return getVideo(); }

    return {
      AUDIO_VERSION: AUDIO_VERSION,
      playItem: playItem, pause: pause, resume: resume, togglePlay: togglePlay,
      stop: stop, seekTo: seekTo, seekToFraction: seekToFraction,
      getDuration: getDuration, getCurrentTime: getCurrentTime,
      setVolume: setVolume, setPreamp: setPreamp, setEqBand: setEqBand,
      setEqOn: setEqOn, getState: getState,
      getAudioEl: getAudioEl, getVideoElement: getVideoElement,
      ensureGraph: ensureGraph,
      measureChannels: measureChannels, getMeasuredChannels: getMeasuredChannels,
      /* test/debug: trạng thái graph (stub ghi lại connect/disconnect) */
      _graph: function () {
        return { ctx: ctx, preamp: preamp, bands: bandNodes, master: master, analyser: analyser, audioSrc: audioSrc, videoSrc: videoSrc, chSplitter: chSplitter, chAnL: chAnL, chAnR: chAnR, chProbeFor: chProbeFor };
      }
    };
  }

  return {
    AUDIO_VERSION: AUDIO_VERSION,
    EXPECTED_AUDIO_VERSION: AUDIO_VERSION,
    MANIFEST_VERSION: MANIFEST_VERSION,
    MANIFEST_MISMATCH: MANIFEST_MISMATCH,
    EQ_FREQS: EQ_FREQS, EQ_Q: EQ_Q,
    HLS_CDN_URL: HLS_CDN_URL,
    NATIVE_TIMEOUT_MS: NATIVE_TIMEOUT_MS,
    ERROR_RECHECK_MS: ERROR_RECHECK_MS,
    createAudioEngine: createAudioEngine
  };
});
