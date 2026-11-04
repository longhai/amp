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
   V10.5 — NGOẠI LỆ: graph (AudioContext + analyser) nay TẠO SẴN lúc
   tạo engine (cuối createAudioEngine), theo đúng Webamp (Media
   constructor tạo ngay `new AudioContext()` + analyser, không đợi lần
   phát đầu). Lý do: Milkdrop cần ctx ngay lúc BẬT (trước khi phát) để
   tạo visualizer + preset; graph lazy làm mọi lần bật-trước-phát đều
   rơi vào lỗi "chưa có AudioContext" rồi kẹt banner đó cả khi nhạc đã
   phát. ctx tạo trước gesture sẽ ở trạng thái "suspended" tới khi
   người dùng chạm/bấm phát (playItem/resume + wireResumeHandlers
   resume như cũ) — Webamp làm y vậy. MediaElementSource vẫn tạo MUỘN
   như cũ (chỉ khi EQ bật + nạp thành công với CORS) để đài không CORS
   không bị câm; chỉ ctx/analyser là tạo sẵn.
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
   Lỗi nạp -> thử lại TỐI ĐA 2 lần, mỗi lần cách 3s (chống báo oan —
   TV360 bấm load lại 1–2 lần là xem được); hết 2 lần thử lại (+ fallback
   CORS native nếu EQ bật) mới báo kênh lỗi qua onError, ở yên kênh
   (không tự nhảy kênh dưới).
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

  var AUDIO_VERSION = "10.7";
  var EXPECTED_AUDIO_VERSION = "10.7";
  /* Version manifest duy nhất (như skin-loader.js): index.html đặt
     window.AMP_VERSION TRƯỚC khi nạp file này; khác manifest thì
     MANIFEST_MISMATCH = true để trang báo "bản mix". Không có manifest
     (test trực tiếp bằng require) thì không kiểm. */
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
  var ERROR_RECHECK_MS = 3000;    /* lỗi nạp: thử lại sau 3s chống báo oan */
  var MAX_LOAD_RETRIES = 2;       /* thử lại tối đa 2 lần (tổng 3 lần nạp) trước khi báo lỗi */
  var CROSSFADE_DEFAULT_MS = 2000; /* crossfade mặc định 2s (0 = tắt) */
  var CROSSFADE_STEP_MS = 100; /* bước ramp gain 100ms */
  var ANALYSER_FFT_SIZE = 1024; /* như Webamp (fftSize 1024): sóng lấy
     1024 mẫu time-domain, BAR có 512 bin tần số để map log. */
  /* Limiter chống clip (lựa chọn của Amp, KHÔNG phải từ Webamp — Webamp
     không có limiter): chỉ bóp các đỉnh vượt ngưỡng, mức thường gần như
     không chạm tới. */
  var LIMITER_THRESHOLD_DB = -3, LIMITER_KNEE_DB = 3, LIMITER_RATIO = 20;
  var LIMITER_ATTACK = 0.002, LIMITER_RELEASE = 0.1;

  function clamp01(v) { v = +v; if (isNaN(v)) return 0.5; return v < 0 ? 0 : v > 1 ? 1 : v; }
  function fracToDb(frac) { return clamp01(frac) * 24 - 12; }
  /* Gain preamp đúng dB, như Webamp (js/media/index.ts setPreamp:
     gain = 10^(dB/20)): frac 0.5 (0 dB) -> gain 1.0, frac 1.0 (+12 dB)
     -> 3.98, frac 0 (-12 dB) -> 0.25. (Trước đây Amp gán gain = frac
     nên 0 dB chỉ còn 0.5 = -6 dB: EQ phẳng đã nhỏ hơn Webamp 6 dB.) */
  function preampGain(frac) { return Math.pow(10, fracToDb(frac) / 20); }
  /* URL HLS không nhất thiết có đuôi .m3u8 — proxy TV vmttv
     (https://vmttv.dpdns.org/tv360/?id=N) redirect 302 tới master HLS
     tv360.vn nhưng URL gốc không có .m3u8. Chỉ thêm host nào đã đo thật
     là proxy HLS (vmttv); đừng đoán thêm. */
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
    var onEqFallback = opts.onEqFallback || null;     /* ({item, reason:"cors"}): bật EQ mà đài không có CORS -> engine tự rơi về phát native, renderer báo rõ + đồng bộ nút EQ về off */
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
    /* PAN (cân bằng trái/phải, slider Balance trong ngăn kéo EQ):
       StereoPannerNode đặt SAU master, TRƯỚC analyser (preamp -> 10
       biquad -> master -> panner -> analyser -> destination). Pan chỉ có
       tác dụng khi tiếng đi QUA CHUỖI EQ (EQ bật): EQ tắt thì source nối
       thẳng destination, panner không nằm trên đường tiếng nên Pan không
       đổi được gì — cùng giới hạn như vis. Không có createStereoPanner
       thì panner = null, setPan chỉ lưu giá trị, không ném lỗi. */
    var panner = null, panValue = 0.5;
    /* v10.5 — BO DO KENH BANG TIN HIEU (xem ghi chu o routeSource):
       cach Webamp (fork): KHONG do L/R bang ChannelSplitter — so kenh
       la thuoc tinh cua TRACK (track.channels = numberOfChannels tu
       metadata), chi bao chi doc thuoc tinh do. Do tin hieu khong phan
       biet duoc "dai stereo dang phat doan noi dung gan mono (giong noi
       o giua)" voi "dai mono that", nen Da Nang stereo that van bi chot
       MONO (anh that 04/11 03:11). Tu v10.5, engine khong do kenh nua;
       so kenh do renderer giu tren item (xem renderer.js
       updateChannelsIndicator + applyWebampChannels). */
    /* --- media --- */
    var audioEl = null, audioSrc = null, audioSrcEl = null;
    /* CROSSFADE (engine 2 thẻ): thẻ audio thứ hai để bài mới phát chồng
       lên bài cũ trong thời gian crossfade. Webamp fork KHÔNG có tính
       năng này nên làm mới hoàn toàn. Chỉ audio -> audio; video chuyển
       kênh vẫn cắt cứng như cũ. */
    var audioElB = null, audioSrcB = null, audioSrcElB = null;
    var crossfadeMs = CROSSFADE_DEFAULT_MS; /* mặc định 2s; 0 = tắt */
    var pendingXfade = null; /* {fromEl, toEl, oldItem, newItem, seq} — chờ thẻ mới phát */
    var activeXfade = null; /* như trên — đang ramp */
    var crossfadeActive = false, xfadeTimer = null;
    var XFADE_STEP_MS = CROSSFADE_STEP_MS;
    var videoSrc = null, videoSrcEl = null, lastVideoEl = null;
    var hls = null, hlsLoading = null;
    /* --- trạng thái phát --- */
    var currentItem = null, currentEl = null, currentKind = null; /* "audio" | "video" */
    var currentCrossOrigin = null; /* "anonymous" | null — chế độ CORS của lần nạp hiện tại */
    var playing = false, volume = 1, eqOn = false;
    /* Thẻ nào đang phát THẬT (theo sự kiện playing/pause/ended của từng
       thẻ) — cờ `playing` toàn cục không đủ cho crossfade: lúc chờ thẻ
       mới phát thì thẻ cũ vẫn phát; retry sau lỗi phải biết thẻ nào đang
       phát để không nạp đè lên thẻ cũ. */
    var playingEls = (typeof Set !== "undefined") ? new Set() : null;
    function markElPlaying(el) { if (playingEls && el) { try { playingEls.add(el); } catch (e) { /* bỏ qua */ } } }
    function markElPaused(el) { if (playingEls && el) { try { playingEls.delete(el); } catch (e) { /* bỏ qua */ } } }
    function isElPlaying(el) { if (!el) return false; if (playingEls) { try { return playingEls.has(el); } catch (e) { return false; } } return playing; }
    var loadState = "idle"; /* idle | loading | playing | error */
    var loadSeq = 0, nativeTimer = null, recheckTimer = null;
    var retryCount = 0, hlsTried = false, pendingSeek = null;
    var eqValues = { preamp: 0.5, bands: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5] };
    var destroyed = false;
    var limiter = null; /* DynamicsCompressor chống clip (xem hằng LIMITER_*). */
    /* Fallback CORS khi bật EQ: đài không trả Access-Control-Allow-Origin
       thì nạp với crossOrigin=anonymous lỗi ngay (không metadata, không
       tạo được source) — tự rơi về phát native (tắt EQ) + báo rõ lý do
       qua onEqFallback. */
    var eqFallbackTried = false;
    /* Watchdog radio lặng (xem watchdogTick): kiểm tra mỗi 5s khi đang
       phát; currentTime đứng yên quá 10s thì nối lại src, tối đa 3 lần
       rồi báo lỗi hẳn. */
    var watchdogTimer = null, wdLastTime = -1, wdStallSince = 0, wdRecoveries = 0;
    var WD_TICK_MS = 5000, WD_STALL_MS = 10000, WD_MAX_RECOVERIES = 3;
    var resumeHandlersWired = false; /* handler resume khi chạm/phím (như Webamp) */

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
        preamp.gain.value = preampGain(eqValues.preamp);
        bandNodes = [];
        for (var i = 0; i < EQ_FREQS.length; i++) {
          var b = ctx.createBiquadFilter();
          /* Như Webamp (js/media/index.ts): dải đầu lowshelf, dải cuối
             highshelf, 8 dải giữa peaking. */
          b.type = (i === 0) ? "lowshelf" : (i === EQ_FREQS.length - 1) ? "highshelf" : "peaking";
          b.frequency.value = EQ_FREQS[i];
          b.Q.value = EQ_Q;
          b.gain.value = fracToDb(eqValues.bands[i]);
          bandNodes.push(b);
        }
        master = ctx.createGain();
        master.gain.value = volume;
        /* Limiter chống clip (lựa chọn của Amp, KHÔNG phải từ Webamp):
           DynamicsCompressor sau master, trước panner/analyser. Ngưỡng
           -3 dB, tỉ lệ 20:1 nên mức thường gần như không chạm tới; chỉ
           bóp các đỉnh vượt 0 dBFS khi preset boost + đài to. */
        try {
          if (ctx.createDynamicsCompressor) {
            limiter = ctx.createDynamicsCompressor();
            limiter.threshold.value = LIMITER_THRESHOLD_DB;
            limiter.knee.value = LIMITER_KNEE_DB;
            limiter.ratio.value = LIMITER_RATIO;
            limiter.attack.value = LIMITER_ATTACK;
            limiter.release.value = LIMITER_RELEASE;
          }
        } catch (e) { limiter = null; }
        analyser = ctx.createAnalyser();
        analyser.fftSize = ANALYSER_FFT_SIZE;
        try { analyser.smoothingTimeConstant = 0.0; } catch (e) { /* stub */ }
        /* StereoPannerNode cho PAN (xem ghi chú ở đầu graph): có thì chèn
           giữa master và analyser, không có thì nối thẳng như cũ. */
        try {
          if (ctx.createStereoPanner) {
            panner = ctx.createStereoPanner();
            panner.pan.value = (panValue - 0.5) * 2;
          }
        } catch (e) { panner = null; }
        /* Nối chuỗi (chưa có nguồn vào): preamp -> 10 biquad -> master
           -> [limiter] -> [panner] -> analyser -> destination. */
        var head = preamp;
        for (var j = 0; j < bandNodes.length; j++) { head.connect(bandNodes[j]); head = bandNodes[j]; }
        head.connect(master);
        if (limiter) { master.connect(limiter); head = limiter; } else head = master;
        if (panner) { head.connect(panner); panner.connect(analyser); }
        else head.connect(analyser);
        analyser.connect(ctx.destination);
      } catch (e) { graphUnavailable = true; return false; }
      graphBuilt = true;
      /* ctx bị treo giữa chừng (vd. Android treo khi khóa màn hình / tab
         nền): tự resume ngay khi state đổi, không đợi người dùng bấm phát. */
      try {
        if (ctx) ctx.onstatechange = function () {
          try { if (ctx.state === "suspended" && playing && ctx.resume) ctx.resume(); } catch (e) { /* bỏ qua */ }
        };
      } catch (e) { /* stub */ }
      /* Đăng ký analyser với renderer ngay: chưa có nguồn thì vis đọc 0
         (đứng yên) — đúng hành vi "EQ tắt -> vis đứng yên". */
      if (onAnalyser) { try { onAnalyser(analyser); } catch (e) { /* bỏ qua */ } }
      return true;
    }
    function sourceExistsFor(kind) {
      if (kind === "video") return !!videoSrc && videoSrcEl === lastVideoEl;
      return !!audioSrc && audioSrcEl === audioEl;
    }
    /* Source đã có cho 1 thẻ cụ thể (kể cả thẻ B của crossfade). */
    function sourceExistsForEl(el) {
      if (!el) return false;
      if (el === lastVideoEl) return !!videoSrc && videoSrcEl === el;
      if (el === audioEl) return !!audioSrc && audioSrcEl === audioEl;
      if (el === audioElB) return !!audioSrcB && audioSrcElB === audioElB;
      return false;
    }
    /* Âm lượng đích của 1 thẻ: qua chuỗi EQ thì el.volume=1 (master giữ
       volume), native/bypass thì el.volume=volume. Ramp crossfade dùng
       hàm này cho cả 2 thẻ. */
    function elTargetVolume(el) {
      var through = !!(graphBuilt && eqOn && el && sourceExistsForEl(el));
      return through ? 1 : volume;
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
    /* Source cho 1 thẻ cụ thể — thẻ B của crossfade có source riêng,
       cũng nối vào preamp (2 source cùng vào preamp được). */
    function ensureSourceForEl(el) {
      if (!graphBuilt || !ctx || !el) return null;
      if (el === audioElB) {
        if (audioSrcB && audioSrcElB === audioElB) return audioSrcB;
        try { audioSrcB = ctx.createMediaElementSource(audioElB); }
        catch (e) { return null; }
        audioSrcElB = audioElB;
        routeSource(audioSrcB);
        applyVolume();
        return audioSrcB;
      }
      if (el === lastVideoEl) return ensureSource("video");
      if (el === audioEl) return ensureSource("audio");
      return null;
    }
    function routeSource(src) {
      if (!src || !ctx) return;
      try { src.disconnect(); } catch (e) { /* chưa nối gì */ }
      try { src.connect(eqOn ? preamp : ctx.destination); } catch (e) { /* stub */ }
    }
    /* Nối/ngắt toàn bộ source theo EQ hiện tại (chuyển on/off không nạp lại). */
    function applyRouting() {
      if (!graphBuilt || !ctx) return;
      if (audioSrc) routeSource(audioSrc);
      if (audioSrcB) routeSource(audioSrcB); /* source thẻ B */
      if (videoSrc) routeSource(videoSrc);
      applyVolume();
    }
    function applyEqValues(st) {
      if (st) {
        eqValues.preamp = clamp01(st.preamp !== undefined ? st.preamp : 0.5);
        var b = st.bands || [];
        /* Chuẩn hóa độ dài bands: getEqState() của renderer trả 11 phần tử
           [preamp, eq1..eq10] (bands[0] = preamp), còn resume()/eqf trả 10
           phần tử [eq1..eq10]. 11 phần tử thì bỏ phần tử đầu, 10 thì dùng
           thẳng — đọc thẳng b[i] sẽ lệch hẳn 1 dải. */
        var off = (b.length === 11) ? 1 : 0;
        for (var i = 0; i < 10; i++) eqValues.bands[i] = clamp01(b[i + off] !== undefined ? b[i + off] : 0.5);
      }
      if (!graphBuilt) return;
      try {
        if (preamp) preamp.gain.value = preampGain(eqValues.preamp);
        for (var j = 0; j < bandNodes.length; j++) bandNodes[j].gain.value = fracToDb(eqValues.bands[j]);
      } catch (e) { /* stub */ }
    }
    /* Âm lượng: qua chuỗi EQ thì el.volume=1 + master gain = volume;
       native hoặc bypass (source -> destination, master không nằm trên
       đường tiếng) thì el.volume = volume.
       Đang crossfade (ramp giữ volume từng thẻ / chờ thẻ mới phát) thì
       KHÔNG chạm volume thẻ — chỉ đặt master gain. */
    function applyVolume() {
      if (crossfadeActive || (pendingXfade && currentEl === pendingXfade.toEl)) {
        if (graphBuilt && master) {
          try { master.gain.value = volume; } catch (e) { /* stub */ }
        }
        /* Crossfade đang CHỜ (thẻ mới chưa phát, ramp chưa chạy): thẻ CŨ
           vẫn đang hát ở volume cũ, còn slider đã đổi — cập nhật luôn
           thẻ cũ để kéo volume có tác dụng ngay. Lúc ramp ĐANG chạy thì
           không chạm (ramp giữ volume từng thẻ; finishXfade áp lại volume
           mới). Thẻ mới lấy toTarget lúc bắt đầu ramp nên đã đúng volume
           hiện tại, không cần sửa. */
        if (!crossfadeActive && pendingXfade && pendingXfade.fromEl) {
          try { pendingXfade.fromEl.volume = elTargetVolume(pendingXfade.fromEl); } catch (e) { /* stub */ }
        }
        return;
      }
      var throughChain = graphBuilt && eqOn && currentEl && sourceExistsForEl(currentEl);
      if (currentEl) {
        try { currentEl.volume = throughChain ? 1 : volume; } catch (e) { /* stub */ }
      }
      if (graphBuilt && master) {
        try { master.gain.value = volume; } catch (e) { /* stub */ }
      }
    }

    /* PAN: đặt lại giá trị pan trên node (gọi khi kéo slider Balance
       trong renderer, và khi graph mới tạo). Trả {pan, applied,
       audible}: applied = đã đặt được lên node; audible = Pan NGHE được
       (cần EQ bật để tiếng đi qua chuỗi có panner — EQ tắt thì source đi
       thẳng loa, xem ghi chú ở đầu graph). */
    function applyPan() {
      if (!panner) return false;
      try { panner.pan.value = (panValue - 0.5) * 2; } catch (e) { return false; }
      return true;
    }
    function setPan(v) {
      panValue = clamp01(typeof v === "number" && isFinite(v) ? v : 0.5);
      var applied = applyPan();
      return { pan: panValue, applied: applied, audible: applied && eqOn };
    }
    function getPan() { return panValue; }

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
        /* Watchdog: hết buffer giữa chừng (stalled/waiting) thì ghi dấu;
           không có sự kiện này thì thẻ chết im cũng không ai biết. */
        el.addEventListener("stalled", onStalledEv);
        el.addEventListener("waiting", onStalledEv);
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
    /* Thẻ audio thứ hai cho crossfade (tạo lười, nối listener như thẻ
       chính — sự kiện từ thẻ nào không phải currentEl thì engine bỏ qua
       qua currentEventEl). */
    function getAudioB() {
      if (!audioElB) {
        if (!doc) return null;
        audioElB = wireMediaEl(doc.createElement("audio"));
        try { audioElB.preload = "auto"; } catch (e) { /* stub */ }
      }
      return audioElB;
    }
    /* ---------- crossfade ---------- */
    function setCrossfade(ms) {
      ms = +ms;
      if (!isFinite(ms) || ms < 0) ms = 0;
      if (ms > 10000) ms = 10000;
      crossfadeMs = Math.round(ms);
      return crossfadeMs;
    }
    function getCrossfade() { return crossfadeMs; }
    function stopXfadeTimer() {
      if (xfadeTimer) { clearTimeout(xfadeTimer); xfadeTimer = null; }
    }
    /* Hủy crossfade đang chờ/đang ramp. pauseFrom=true: dừng luôn thẻ cũ
       (dùng khi chuyển bài mới / dừng / tạm dừng / đổi EQ). */
    function cancelXfade(pauseFrom) {
      stopXfadeTimer();
      var had = pendingXfade || activeXfade;
      pendingXfade = null;
      if (activeXfade) {
        var ax = activeXfade;
        activeXfade = null;
        crossfadeActive = false;
        if (pauseFrom) { pauseEl(ax.fromEl); }
        try { ax.fromEl.volume = elTargetVolume(ax.fromEl); } catch (e) { /* bỏ qua */ }
        try { ax.toEl.volume = elTargetVolume(ax.toEl); } catch (e) { /* bỏ qua */ }
      } else if (had && had.toEl) {
        /* v10.7 fix Stop tu phat lai (04/11): fade dang CHO (bai moi chua
           phat, bai cu van hat) ma chi reset volume thi bai cu hat tiep
           mai sau Stop/Pause — pauseFrom=true thi dung CA 2 the. Dung
           pauseEl (thay cho .pause() tran) de ghi so the dung ngay
           (su kien 'pause' cua the khong phai currentEl bi bo qua nen
           khong tu cap nhat duoc). */
        if (pauseFrom) { pauseEl(had.fromEl); pauseEl(had.toEl); }
        try { had.toEl.volume = elTargetVolume(had.toEl); } catch (e) { /* bỏ qua */ }
      }
      return !!had;
    }
    /* Thẻ mới nạp lỗi trong lúc chờ/chờ ramp: bỏ lần chuyển này, trả thẻ
       cũ (vẫn đang phát) làm current — không thử lại, không báo lỗi (người
       nghe không bị ngắt; bấm next lại để thử bài mới). */
    function cancelXfadeRestoreOld() {
      stopXfadeTimer();
      var px = activeXfade || pendingXfade;
      pendingXfade = null; activeXfade = null; crossfadeActive = false;
      if (!px) return false;
      try { px.toEl.pause(); } catch (e) { /* bỏ qua */ }
      try { px.toEl.volume = elTargetVolume(px.toEl); } catch (e) { /* bỏ qua */ }
      try { px.fromEl.volume = elTargetVolume(px.fromEl); } catch (e) { /* bỏ qua */ }
      currentEl = px.fromEl; currentItem = px.oldItem; currentKind = "audio";
      playing = true; loadState = "playing";
      applyVolume();
      if (onPlayingChange) { try { onPlayingChange(true); } catch (e) { /* bỏ qua */ } }
      return true;
    }
    function startXfadeRamp() {
      var px = pendingXfade;
      pendingXfade = null;
      if (!px) return false;
      activeXfade = px;
      crossfadeActive = true;
      var fromEl = px.fromEl, toEl = px.toEl;
      var dur = crossfadeMs;
      var fromStart = 1, toTarget = 1;
      try { fromStart = fromEl.volume; } catch (e) { fromStart = 1; }
      toTarget = elTargetVolume(toEl);
      try { toEl.volume = 0; } catch (e) { /* bỏ qua */ }
      var t0 = Date.now();
      var step = function () {
        if (!crossfadeActive || !activeXfade) return;
        var f = dur <= 0 ? 1 : Math.min(1, (Date.now() - t0) / dur);
        try { fromEl.volume = fromStart * (1 - f); } catch (e) { /* bỏ qua */ }
        try { toEl.volume = toTarget * f; } catch (e) { /* bỏ qua */ }
        if (f >= 1) { finishXfade(); return; }
        xfadeTimer = setTimeout(step, XFADE_STEP_MS);
      };
      xfadeTimer = setTimeout(step, XFADE_STEP_MS);
      return true;
    }
    function finishXfade() {
      stopXfadeTimer();
      var ax = activeXfade;
      activeXfade = null;
      crossfadeActive = false;
      if (ax) {
        try { ax.fromEl.pause(); } catch (e) { /* bỏ qua */ }
        try { ax.fromEl.volume = elTargetVolume(ax.fromEl); } catch (e) { /* bỏ qua */ }
      }
      applyVolume();
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
      markElPaused(el); /* thẻ này không còn phát nữa */
      try { el.pause(); } catch (e) { /* stub */ }
    }
    function clearSrc(el) {
      if (!el) return;
      try { el.removeAttribute("src"); } catch (e) { /* stub */ }
      try { el.load(); } catch (e) { /* stub */ }
    }
    /* Thay thẻ media bằng thẻ mới (không source, không crossOrigin) khi
       thẻ cũ đã bị "bắt" bởi graph (EQ đã từng bật + URL cross-origin):
       thẻ mới chưa có source nên phát native lại được, tiếng không câm.
       elToReplace: thay đúng thẻ đang phát (có thể là audioElB sau
       crossfade), không chỉ thẻ chính audioEl; gọi không kèm tham số thì
       giữ hành vi cũ (thay audioEl). */
    function freshElement(kind, elToReplace) {
      detachHls();
      if (kind === "video") {
        var oldV = lastVideoEl;
        if (oldV) { pauseEl(oldV); clearSrc(oldV); }
        if (resetVideoEl) { try { resetVideoEl(); } catch (e) { /* bỏ qua */ } }
        lastVideoEl = null; videoSrc = null; videoSrcEl = null;
        return getVideo();
      }
      var oldA = elToReplace || audioEl;
      if (oldA === audioElB) {
        if (oldA) { pauseEl(oldA); clearSrc(oldA); }
        audioElB = null; audioSrcB = null; audioSrcElB = null;
        return getAudioB();
      }
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
      /* v10.7 fix Stop tu phat lai (04/11): da dung/tam dung thi khong
         roi ve HLS roi phat lai (MANIFEST_PARSED goi play()). Chi roi HLS
         khi dang phat that hoac dang nap lan dau. */
      if (!playing && loadState !== "loading") return;
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
              if (!data || !data.fatal) return;
              /* Như Webamp fork (elementSource.ts): lỗi mạng nghiêm trọng
                 giữa chừng thì thử tải lại (startLoad), lỗi media thì
                 recoverMediaError — chỉ khi không hồi được mới báo lỗi hẳn. */
              try {
                var ET = Hls.ErrorTypes || {};
                if (data.type === ET.NETWORK_ERROR && hls.startLoad) { hls.startLoad(); return; }
                if (data.type === ET.MEDIA_ERROR && hls.recoverMediaError) { hls.recoverMediaError(); return; }
              } catch (e) { /* rơi xuống báo lỗi */ }
              handleLoadFailure("hls");
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
        /* v10.7 fix Stop tu phat lai (04/11): chi roi HLS / bao loi khi
           dang nap lan dau (loadState "loading"). Da dung han (Stop, doi
           EQ luc dung) thi timer nay (neu con) khong duoc phat lai. */
        if (playing || loadState !== "loading") return;
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
      /* Hủy crossfade cũ trước (dừng thẻ cũ của lần fade trước). */
      cancelXfade(true);
      /* Dừng thẻ đang phát — TRỪ khi crossfade: thẻ cũ phải phát tiếp
         trong lúc bài mới tăng dần (đổi audio <-> video thì thẻ kia vẫn
         phải im như cũ). */
      var prevEl = currentEl;
      var prevItem = currentItem;
      /* Chỉ crossfade khi thẻ cũ phát THẬT (không phải cờ toàn cục — lúc
         chờ thẻ mới thì cờ vẫn true nhưng thẻ mới chưa phát), và chỉ khi
         chuyển sang mục KHÁC (bấm lại đúng kênh đang phát thì nạp lại
         cứng như cũ — giữ nguyên đường thử lại/báo lỗi). */
      var prevWasPlaying = isElPlaying(prevEl);
      var video = isVideoItem(item);
      var xfadeEl = null;
      if (!video && crossfadeMs > 0 && prevWasPlaying && prevItem && item.url !== prevItem.url && (prevEl === audioEl || prevEl === audioElB)) {
        /* Bài mới vào thẻ CÒN LẠI để 2 thẻ phát chồng nhau. */
        xfadeEl = (prevEl === audioEl) ? getAudioB() : getAudio();
        /* Không lấy được thẻ khác (stub/test trả cùng 1 thẻ, hoặc
           document không tạo được thẻ mới) -> cắt cứng như cũ. */
        if (!xfadeEl || xfadeEl === prevEl) xfadeEl = null;
      }
      if (!xfadeEl && prevEl) pauseEl(prevEl);
      pendingSeek = null;
      currentItem = item;
      currentKind = video ? "video" : "audio";
      var el = video ? getVideo() : (xfadeEl || getAudio());
      if (!el) { handleLoadFailure("no-element"); return { ok: false, reason: "no-element" }; }
      /* EQ tắt + thẻ đã có source + URL cross-origin -> thẻ mới (xem đầu file).
         Đường này không crossfade được (thẻ mới thay luôn thẻ đang dùng). */
      if (!eqOn && sourceExistsForEl(el) && isCrossOrigin(item.url)) {
        el = freshElement(currentKind, el); /* thay đúng thẻ el (có thể là B) */
        if (!el) { handleLoadFailure("no-element"); return { ok: false, reason: "no-element" }; }
        xfadeEl = null;
        /* Thẻ mới thay luôn thẻ đang dùng: dừng thẻ cũ (trước đó chưa
           pause vì tưởng sẽ crossfade). */
        if (prevEl && prevEl !== el) pauseEl(prevEl);
      }
      currentEl = el;
      if (xfadeEl) {
        /* Bài mới bắt đầu ở âm lượng 0; ramp bắt đầu khi nó phát thật
           (onPlayingEv/onTimeEv gọi startXfadeRamp). */
        pendingXfade = { fromEl: prevEl, toEl: el, oldItem: prevItem, newItem: item, seq: seq };
        try { el.volume = 0; } catch (e) { /* bỏ qua */ }
      }
      /* ĐỔI KÊNH XÓA KHUNG HÌNH CŨ NGAY: chọn kênh TV khác mà hình vẫn là
         đài cũ — chỉ gán src mới thôi chưa đủ, trình duyệt có thể giữ
         frame cuối của luồng cũ tới khi có frame mới.
         - Thẻ video cũ không còn dùng (video -> audio): xóa src + load()
           để về trạng thái rỗng, khỏi dính frame đài cũ khi sau này mở
           lại AVS ở chế độ video.
         - Thẻ video dùng tiếp (video -> video, audio -> video): xóa src
           cũ TRƯỚC khi gán src mới — khung cũ biến mất ngay (vùng video
           đen/trống trong lúc nạp), hình mới chỉ hiện khi kênh mới có
           loadeddata/videoWidth > 0 (lưới an toàn renderer.setVideoInfo). */
      if (prevEl && prevEl !== el && prevEl === lastVideoEl) clearSrc(prevEl);
      if (el === lastVideoEl) clearSrc(el);
      /* Bài/kênh mới -> số kênh là thuộc tính của MỤC MỚI (item.channels,
         renderer giữ), không phải của thẻ audio dùng lại — engine không
         giữ kết quả đo kênh nào nữa (v10.5, theo Webamp). */
      /* Thử lại (sau lỗi 3s) phải GIỮ retryCount để lỗi sau 2 lần thử
         lại là lỗi cuối (không thử lại vô hạn). Chỉ lần nạp do người
         dùng bấm mới reset retryCount. */
      if (!opts2.keepRetried) { retryCount = 0; eqFallbackTried = false; /* lần bấm mới được thử fallback CORS lại */ }
      hlsTried = false;
      loadState = "loading";
      setCrossOrigin(el, eqOn);
      setSrcAndPlay(el, item.url, seq);
      applyVolume();
      return { ok: true };
    }
    /* Lỗi nạp: thử lại TỐI ĐA 2 lần, mỗi lần cách 3s (chống báo oan —
       TV360 lần đầu lỗi nhưng load lại 1–2 lần là xem được); hết 2 lần
       mới xét fallback CORS rồi báo kênh lỗi qua onError. Ở yên kênh —
       không tự nhảy kênh dưới.
       Bài mới lỗi TRONG LÚC crossfade (đang chờ / đang ramp) thì bỏ lần
       chuyển, trả bài cũ đang phát — không thử lại, không báo lỗi. */
    function handleLoadFailure(reason) {
      clearTimers();
      if (!currentItem) return;
      /* v10.7 fix Stop tu phat lai (04/11): da dung han (Stop, loadState
         "idle") hoac dang tam dung (Pause) thi loi den sau (vd mang chop
         cua radio) KHONG duoc thu lai / bao loi — nguoi dung khong nghe
         nua, thu lai la tu phat lai. Chi thu lai khi dang phat that
         (playing) hoac dang nap lan dau (loadState "loading"). */
      if (!playing && loadState !== "loading") return;
      if ((pendingXfade && currentItem === pendingXfade.newItem) ||
          (activeXfade && currentItem === activeXfade.newItem)) {
        cancelXfadeRestoreOld();
        return;
      }
      if (retryCount < MAX_LOAD_RETRIES) {
        retryCount++;
        if (recheckTimer) clearTimeout(recheckTimer);
        recheckTimer = setTimeout(function () {
          recheckTimer = null;
          if (destroyed || !currentItem) return;
          /* Thử lại từ native (không giữ HLS cũ), giữ retryCount. */
          hlsTried = false;
          loadAndPlay(currentItem, { userInitiated: false, keepRetried: true });
        }, errorRecheckMs);
        return;
      }
      /* FALLBACK CORS: bật EQ mà đài không có CORS thì lần nạp với
         crossOrigin=anonymous lỗi ngay, thử lại sau 3s cũng lỗi. Đài vẫn
         phát tốt ở chế độ native (EQ off) nên KHÔNG được báo kênh lỗi +
         lặng luôn — tự tắt EQ, nạp lại native (không crossOrigin) + báo
         rõ qua onEqFallback để renderer hiện lý do và đồng bộ nút EQ về
         off. Chỉ thử fallback 1 lần / lần bấm (eqFallbackTried); native
         mà cũng lỗi thì rơi xuống đường lỗi thường bên dưới. Đặt SAU lần
         thử lại để lỗi mạng thoáng qua vẫn có cơ hội hồi bằng EQ (chống
         báo oan). Áp dụng cả khi phát lần đầu với EQ bật lẫn khi bật EQ
         giữa chừng (setEqOn), và cả kênh video (TV360 qua vmttv cũng chỉ
         xem được khi EQ tắt — HLS.js đã thử trước rồi mới tới đây). */
      if (currentCrossOrigin === "anonymous" && !eqFallbackTried) {
        eqFallbackTried = true;
        eqOn = false;
        if (onEqFallback) { try { onEqFallback({ item: currentItem, reason: "cors" }); } catch (e) { /* bỏ qua */ } }
        loadAndPlay(currentItem, { userInitiated: false, keepRetried: true });
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
    /* Watchdog: thẻ báo stalled/waiting (hết buffer giữa chừng) thì ghi
       dấu thời gian; watchdog nối lại nếu kẹt quá lâu. */
    function onStalledEv(ev) {
      var el = currentEventEl(ev);
      if (!el) return;
      if (playing && !wdStallSince) wdStallSince = Date.now();
    }
    function onPlayingEv(ev) {
      var el = currentEventEl(ev);
      if (!el) return;
      clearTimers();
      wdStallSince = 0; wdRecoveries = 0; /* phát lại được thì hết kẹt */
      playing = true;
      markElPlaying(el);
      loadState = "playing";
      /* Thẻ mới bắt đầu phát -> ramp crossfade. */
      if (pendingXfade && el === pendingXfade.toEl) startXfadeRamp();
      if (onPlayingChange) { try { onPlayingChange(true); } catch (e) { /* bỏ qua */ } }
    }
    function onTimeEv(ev) {
      var el = currentEventEl(ev);
      if (!el) return;
      /* v10.7 fix Stop tu phat lai (04/11): timeupdate khi the dang PAUSE
         KHONG phai dang phat — trinh duyet ban timeupdate sau seek ke ca
         luc pause (vd Stop tua ve 0). Truoc day onTimeEv bat lai
         playing=true tu su kien nay, roi watchdog (van chay sau Stop) goi
         play() trong vong 5s. Bo qua han: khong bat playing, khong ramp
         crossfade, khong danh dau the dang phat. */
      var pausedNow = false;
      try { pausedNow = !!el.paused; } catch (e) { pausedNow = false; }
      if (pausedNow) return;
      clearTimers(); /* có timeupdate = đang phát thật */
      wdStallSince = 0; /* thời gian chạy = không kẹt */
      markElPlaying(el);
      if (!playing) {
        playing = true;
        loadState = "playing";
        if (onPlayingChange) { try { onPlayingChange(true); } catch (e) { /* bỏ qua */ } }
      }
      /* timeupdate cũng là dấu hiệu thẻ mới đã phát (dự phòng khi sự kiện
         'playing' không tới). */
      if (pendingXfade && el === pendingXfade.toEl) startXfadeRamp();
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
      markElPaused(el);
      if (onPlayingChange) { try { onPlayingChange(false); } catch (e) { /* bỏ qua */ } }
      if (onEnded) { try { onEnded(); } catch (e) { /* bỏ qua */ } }
    }
    function onPauseEv(ev) {
      var el = currentEventEl(ev);
      if (!el) return;
      playing = false;
      markElPaused(el);
      if (onPlayingChange) { try { onPlayingChange(false); } catch (e) { /* bỏ qua */ } }
    }
    function onMetaEv(ev) {
      var el = currentEventEl(ev);
      if (!el) return;
      /* Media nạp thành công với crossOrigin=anonymous (EQ bật) -> giờ
         mới tạo MediaElementSource (1 lần duy nhất) + nối qua chuỗi EQ.
         EQ tắt thì KHÔNG tạo source: media cứ phát native. Tạo source
         cho đúng thẻ đang phát (kể cả thẻ B). */
      if (eqOn) ensureSourceForEl(el);
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

    /* ---------- watchdog radio lặng ----------
       Triệu chứng: nghe radio 1 hồi thì lặng hẳn; tắt EQ cũng không cứu;
       load lại trang thì có tiếng rồi lại lặng; Webamp không bị.
       Watchdog kiểm tra cả 3 nguyên nhân mỗi 5s khi đang phát:
       (1) AudioContext bị treo (suspended) giữa chừng — vd. Android treo
           khi khóa màn hình / tab nền; EQ-off cũng không cứu vì source
           đã tạo thì bypass vẫn đi qua ctx (routeSource nối thẳng
           destination của ctx đang treo). -> resume().
       (2) Thẻ media bị tạm dừng (mất audio focus...) mà cờ playing vẫn
           true. -> play() lại.
       (3) Stream đứt giữa chừng: thẻ không pause nhưng currentTime đứng
           yên quá 10s (hết buffer, Icecast reset kết nối) — không có sự
           kiện error nào. -> nạp lại src, tối đa 3 lần rồi báo lỗi hẳn
           để người dùng bấm phát lại. Ở yên kênh, không tự nhảy kênh dưới.
       Webamp không bị vì: direct mode dùng thẻ mới KHÔNG qua
       MediaElementSource (miễn nhiễm ctx treo), và constructor đăng ký
       handler resume khi chạm/click/phím.
       Watchdog chỉ chạy khi đang phát; tiến triển (currentTime chạy)
       thì reset bộ đếm. */
    function watchdogTick() {
      if (destroyed || !playing || !currentEl || !currentItem) return;
      try {
        if (ctx && ctx.state === "suspended" && ctx.resume) ctx.resume();
      } catch (e) { /* bỏ qua */ }
      var paused = false;
      try { paused = !!currentEl.paused; } catch (e) { paused = false; }
      if (paused) {
        try {
          var pp = currentEl.play();
          if (pp && pp.catch) pp.catch(function () { /* autoplay chặn */ });
        } catch (e) { /* bỏ qua */ }
        return;
      }
      var t = 0;
      try { t = currentEl.currentTime || 0; } catch (e) { t = 0; }
      if (wdLastTime < 0) { wdLastTime = t; wdStallSince = 0; return; }
      if (Math.abs(t - wdLastTime) < 0.01) {
        if (!wdStallSince) wdStallSince = Date.now();
        if (Date.now() - wdStallSince >= WD_STALL_MS) {
          wdStallSince = 0;
          wdRecoveries++;
          if (wdRecoveries > WD_MAX_RECOVERIES) {
            wdLastTime = -1;
            loadState = "error"; playing = false;
            if (onPlayingChange) { try { onPlayingChange(false); } catch (e) { /* bỏ qua */ } }
            if (onError) { try { onError({ item: currentItem, reason: "watchdog-stall" }); } catch (e) { /* bỏ qua */ } }
            return;
          }
          /* Nối lại src (giữ retryCount: đã thử lại thì lỗi nữa là lỗi cuối). */
          loadAndPlay(currentItem, { userInitiated: false, keepRetried: true });
          wdLastTime = -1;
        }
      } else {
        wdLastTime = t; wdStallSince = 0; wdRecoveries = 0;
      }
    }
    function startWatchdog() {
      if (watchdogTimer) return;
      try {
        watchdogTimer = setInterval(watchdogTick, WD_TICK_MS);
        /* Node/jsdom: unref để test không bị kẹt event loop. */
        if (watchdogTimer && typeof watchdogTimer.unref === "function") watchdogTimer.unref();
      } catch (e) { watchdogTimer = null; }
    }
    function stopWatchdog() {
      if (watchdogTimer) { try { clearInterval(watchdogTimer); } catch (e) { /* bỏ qua */ } watchdogTimer = null; }
      wdLastTime = -1; wdStallSince = 0;
    }
    /* Như Webamp (media/index.ts constructor): bất kỳ lần chạm/click/bấm
       phím nào cũng thử resume ctx đang treo (người dùng chạm vào điện
       thoại là tiếng về, không cần bấm phát lại). Gắn 1 lần cho cả
       engine; visibilitychange: quay lại trang thì resume + phát tiếp
       nếu đang phát mà thẻ dừng. */
    function wireResumeHandlers() {
      if (resumeHandlersWired || !doc || !doc.addEventListener) return;
      resumeHandlersWired = true;
      var tryResume = function () {
        try {
          if (ctx && ctx.state === "suspended" && playing && ctx.resume) ctx.resume();
        } catch (e) { /* bỏ qua */ }
      };
      try {
        doc.addEventListener("touchend", tryResume, false);
        doc.addEventListener("click", tryResume, false);
        doc.addEventListener("keydown", tryResume, false);
        doc.addEventListener("visibilitychange", function () {
          try {
            if (doc.hidden) return;
            tryResume();
            if (playing && currentEl && currentEl.paused) {
              var p2 = currentEl.play();
              if (p2 && p2.catch) p2.catch(function () { /* autoplay chặn */ });
            }
          } catch (e) { /* bỏ qua */ }
        }, false);
      } catch (e) { /* môi trường test thiếu addEventListener */ }
    }

    /* ---------- API công khai ---------- */
    function playItem(item, eqState) {
      if (!item || !item.url) return { ok: false, reason: "no-url" }; /* muc khong co link nhac */
      if (destroyed) return { ok: false, reason: "destroyed" }; /* engine đã hủy (đổi skin) thì không phát lại */
      if (eqState) { eqOn = !!eqState.on; applyEqValues(eqState); }
      ensureGraph();
      wireResumeHandlers(); /* chạm/phím nào cũng resume ctx treo */
      startWatchdog(); /* theo dõi lặng tiếng khi đang phát */
      if (ctx && ctx.state === "suspended" && ctx.resume) {
        try { ctx.resume(); } catch (e) { /* bỏ qua */ }
      }
      return loadAndPlay(item, { userInitiated: true });
    }
    function pause() {
      /* Tạm dừng thì hủy crossfade (dừng cả thẻ cũ đang fade). */
      cancelXfade(true);
      if (!currentEl) return false;
      pauseEl(currentEl);
      return true;
    }
    function resume() {
      if (!currentEl) return { ok: false, reason: "nothing" };
      if (loadState === "error" && currentItem) return playItem(currentItem, { on: eqOn, preamp: eqValues.preamp, bands: eqValues.bands.slice() });
      ensureGraph();
      wireResumeHandlers();
      startWatchdog();
      if (ctx && ctx.state === "suspended" && ctx.resume) {
        try { ctx.resume(); } catch (e) { /* bỏ qua */ }
      }
      /* v10.7 fix Stop tu phat lai (04/11): resume la y dinh phat that —
         dat "loading" de loi sau day duoc thu lai / bao loi (setEqOn luc
         dung de "idle", khong co dong nay thi Play sau Stop + doi EQ se
         mat han xu ly loi). */
      loadState = "loading";
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
      /* v10.7 fix Stop tu phat lai (04/11): Stop phai DUNG HAN, khong chi
         pause + tua ve 0.
         - Dung watchdog: no chi co nghia khi dang phat; de chay tiep thi
           chi can 1 su kien lac (vd timeupdate do tua) bat lai playing la
           no goi play() trong vong 5s. playItem/resume khoi dong lai.
         - Tang loadSeq: vo hieu hoa moi async dang bay (nap HLS.js qua
           CDN, MANIFEST_PARSED, native timer) — chung chi kiem seq nay.
         - loadState = "idle": danh dau da dung han; loi den sau (mang
           chop) khong duoc thu lai / bao loi (xem handleLoadFailure). */
      stopWatchdog();
      loadSeq++;
      loadState = "idle";
      cancelXfade(true); /* dừng thì dừng cả 2 thẻ crossfade */
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
    /* Hủy engine cũ hẳn khi đổi skin (bootSkin tạo engine mới mỗi lần đổi
       skin): thẻ audio cũ (không nằm trong DOM) vẫn phát tiếp → chồng
       tiếng với engine mới, watchdog/HLS/timer cũ chạy mãi, AudioContext
       cũ không đóng → đổi skin nhiều lần chạm giới hạn số ctx của Chrome.
       Dừng watchdog, dừng phát (cả 2 thẻ A/B + video), xóa src, hủy HLS,
       đánh dấu destroyed để callback async cũ bỏ qua, đóng ctx (nếu có). */
    function destroy() {
      destroyed = true;
      stopWatchdog();
      try { stop(); } catch (e) { /* bỏ qua */ }
      try { if (audioEl) { pauseEl(audioEl); clearSrc(audioEl); } } catch (e) { /* bỏ qua */ }
      try { if (audioElB) { pauseEl(audioElB); clearSrc(audioElB); } } catch (e) { /* bỏ qua */ }
      try { var v = lastVideoEl; if (v) { pauseEl(v); clearSrc(v); } } catch (e) { /* bỏ qua */ }
      try { detachHls(); } catch (e) { /* bỏ qua */ }
      try { if (ctx && typeof ctx.close === "function") ctx.close(); } catch (e) { /* bỏ qua */ }
      playing = false;
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
        try { preamp.gain.value = preampGain(eqValues.preamp); } catch (e) { /* stub */ }
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
      /* Đổi EQ giữa lúc crossfade thì hủy fade (thẻ cũ dừng ngay; thẻ mới
         nạp lại theo đường EQ mới như cũ). */
      cancelXfade(true);
      if (!graphBuilt) ensureGraph();
      if (!currentEl || !currentItem) { applyRouting(); return { changed: true, reloaded: false }; }
      if (!on) {
        if (sourceExistsForEl(currentEl)) {
          /* NHẢ HẲN về phát trực tiếp: chỉ applyRouting() (source ->
             destination) thì thẻ vẫn bị AudioContext bắt nên tiếng đi qua
             ctx, nhỏ hơn phát native thật. Đổi sang THẺ MỚI (freshElement:
             không source, không crossOrigin) để phát native y như off lúc
             đầu; vị trí file giữ qua pendingSeek như đường reload off→on.
             Các source còn lại (thẻ kia/video) cũng nối về destination
             qua applyRouting() để lần crossfade sau không lôi chuỗi EQ
             trở lại. Đổi lấy 1 lần nạp lại ngắn (radio live về lại đầu
             live, file tua về đúng vị trí cũ) — đúng như Webamp direct
             mode. */
          var pos = getCurrentTime();
          var wasPlaying = playing;
          var seq = ++loadSeq;
          clearTimers(); detachHls();
          cancelXfade(true);
          retryCount = 0; hlsTried = false;
          /* v10.7 fix Stop tu phat lai (04/11): nap lai luc DUNG (Stop /
             Pause, khong nap do) thi loadState "idle" de native timer /
             loi sau do khong tu phat lai; dang phat hoac dang nap do thi
             giu "loading" (van can HLS fallback / thu lai). */
          loadState = (wasPlaying || loadState === "loading") ? "loading" : "idle";
          pendingSeek = pos > 0 ? pos : null; /* khôi phục ở loadedmetadata */
          currentEl = freshElement(currentKind, currentEl);
          if (!currentEl) { handleLoadFailure("no-element"); return { changed: true, reloaded: true }; }
          setCrossOrigin(currentEl, false); /* thẻ mới native: không crossOrigin */
          applyRouting(); /* source còn lại (thẻ kia/video) về destination */
          setSrcAndPlay(currentEl, currentItem.url, seq);
          if (!wasPlaying) { pauseEl(currentEl); }
          else {
            /* Tải lại là tiếp nối phát (không phải tạm dừng): pauseEl thẻ
               cũ trong freshElement bắn sự kiện 'pause' làm cờ playing về
               false — khôi lại cờ ngay để renderer/watchdog không tưởng
               là đã dừng; thẻ mới bắn 'playing'/'timeupdate' sẽ xác nhận
               lại. */
            playing = true; loadState = "playing";
            if (onPlayingChange) { try { onPlayingChange(true); } catch (e) { /* bỏ qua */ } }
          }
          applyVolume();
          return { changed: true, reloaded: true };
        }
        if (currentCrossOrigin === "anonymous") {
          var pos = getCurrentTime();
          var wasPlaying = playing;
          var seq = ++loadSeq;
          clearTimers(); detachHls();
          retryCount = 0; hlsTried = false;
          /* v10.7 (xem nhan tren): nap lai luc dung thi "idle". */
          loadState = (wasPlaying || loadState === "loading") ? "loading" : "idle";
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
      if (sourceExistsForEl(currentEl)) { applyRouting(); return { changed: true, reloaded: false }; }
      var pos2 = getCurrentTime();
      var wasPlaying2 = playing;
      var seq2 = ++loadSeq;
      clearTimers(); detachHls();
      retryCount = 0; hlsTried = false; eqFallbackTried = false; /* lần bật EQ mới được thử fallback CORS lại */
      /* v10.7 (xem nhan tren): nap lai luc dung thi "idle". */
      loadState = (wasPlaying2 || loadState === "loading") ? "loading" : "idle";
      pendingSeek = pos2 > 0 ? pos2 : null; /* khôi phục ở loadedmetadata */
      setCrossOrigin(currentEl, true);
      setSrcAndPlay(currentEl, currentItem.url, seq2);
      if (!wasPlaying2) { pauseEl(currentEl); }
      return { changed: true, reloaded: true };
    }
    /* KHZ đo thật: sample rate của AudioContext (thiết bị phát, vd 48000
       -> KHZ hiện "48"). Chỉ có khi graph đã được tạo (lần phát đầu với
       EQ bật); chưa có graph thì null -> renderer hiện "44" demo (ghi rõ
       demo, không bịa thành số đo). Tắt EQ KHÔNG hủy graph nên sampleRate
       vẫn đọc được sau khi tắt — đúng vì đó là sample rate của thiết bị,
       không đổi khi bypass. Lưu ý: đây là rate của THIẾT BỊ, không phải
       của file (trình duyệt không cho đọc sample rate file qua thẻ
       media). */
    function getSampleRate() {
      return ctx ? ctx.sampleRate : null;
    }
    function analyserHasSignal() {
      /* Tín hiệu vis: chuỗi EQ đang nối (EQ bật + source của thẻ đang
         phát đã nối vào preamp). EQ tắt hoặc chưa có source -> không tín hiệu. */
      return !!(graphBuilt && eqOn && currentEl && sourceExistsForEl(currentEl) && playing);
    }
    function getState() {
      var routing = "native";
      if (currentEl && sourceExistsForEl(currentEl)) routing = eqOn ? "eq" : "bypass";
      return {
        version: AUDIO_VERSION, graphBuilt: graphBuilt, graphUnavailable: graphUnavailable,
        ctxState: ctx ? ctx.state : null,
        eqOn: eqOn, routing: routing,
        audioSourced: !!audioSrc, videoSourced: !!videoSrc,
        currentKind: currentKind, currentName: currentItem ? currentItem.name : "",
        playing: playing, loadState: loadState, volume: volume,
        hlsActive: !!hls, hlsTried: hlsTried, retried: retryCount > 0, retryCount: retryCount, maxLoadRetries: MAX_LOAD_RETRIES,
        analyserConnected: !!analyser, analyserSignal: analyserHasSignal(),
        sampleRate: ctx ? ctx.sampleRate : null, /* KHZ đo thật */
        pan: panValue, panSupported: !!panner, panApplied: !!(panner && eqOn), /* PAN */
        eqValues: { preamp: eqValues.preamp, bands: eqValues.bands.slice() },
        crossfadeMs: crossfadeMs, crossfading: crossfadeActive || !!pendingXfade, /* crossfade */
        audioElB: !!audioElB, audioSrcB: !!audioSrcB
      };
    }
    /* Thẻ audio ĐANG DÙNG (A hoặc B của crossfade) — test + debug cần đúng
       thẻ đang phát, không phải lúc nào cũng thẻ A. */
    function getAudioEl() { return (currentEl && currentKind === "audio") ? currentEl : getAudio(); }
    function getVideoElement() { return getVideo(); }

    /* v10.5 — GRAPH TẠO SẴN LÚC KHỞI TẠO (theo Webamp: Media
       constructor tạo ngay AudioContext + analyser, không đợi lần phát
       đầu — xem ghi chú đầu file). Milkdrop lấy ctx/analyser được ngay
       cả trước khi phát nhạc; "chưa có AudioContext" không còn xảy ra
       sau khi engine tạo xong. Tạo thất bại (trình duyệt không có
       AudioContext) thì giữ đường lazy cũ: playItem/setEqOn gọi lại
       ensureGraph. */
    try { ensureGraph(); } catch (e) { /* giữ lazy fallback */ }
    wireResumeHandlers();

    return {
      AUDIO_VERSION: AUDIO_VERSION,
      playItem: playItem, pause: pause, resume: resume, togglePlay: togglePlay,
      stop: stop, destroy: destroy, /* hủy engine cũ khi đổi skin */ seekTo: seekTo, seekToFraction: seekToFraction,
      getDuration: getDuration, getCurrentTime: getCurrentTime,
      setVolume: setVolume, setPreamp: setPreamp, setEqBand: setEqBand,
      setEqOn: setEqOn, getState: getState, getSampleRate: getSampleRate,
      setPan: setPan, getPan: getPan, /* PAN */
      setCrossfade: setCrossfade, getCrossfade: getCrossfade, /* crossfade trộn bài */
      getAudioEl: getAudioEl, getVideoElement: getVideoElement,
      ensureGraph: ensureGraph,
      /* test/debug: trạng thái graph (stub ghi lại connect/disconnect) */
      _graph: function () {
        return { ctx: ctx, preamp: preamp, bands: bandNodes, master: master, limiter: limiter, analyser: analyser, panner: panner, audioSrc: audioSrc, videoSrc: videoSrc, audioElB: audioElB, audioSrcB: audioSrcB };
      },
      /* test/debug: trạng thái crossfade */
      _crossfade: function () {
        return { crossfadeMs: crossfadeMs, pending: !!pendingXfade, active: crossfadeActive, pendingTo: pendingXfade ? pendingXfade.toEl : null, activeFrom: activeXfade ? activeXfade.fromEl : null, activeTo: activeXfade ? activeXfade.toEl : null };
      },
      /* test/debug: watchdog radio lặng */
      _watchdog: function () {
        return { tick: watchdogTick, running: !!watchdogTimer, lastTime: wdLastTime, stallSince: wdStallSince, recoveries: wdRecoveries, eqFallbackTried: eqFallbackTried };
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
    MAX_LOAD_RETRIES: MAX_LOAD_RETRIES, /* thử lại tối đa 2 lần trước khi báo lỗi */
    CROSSFADE_DEFAULT_MS: CROSSFADE_DEFAULT_MS, /* crossfade mặc định 2s */
    CROSSFADE_STEP_MS: CROSSFADE_STEP_MS,
    createAudioEngine: createAudioEngine
  };
});
