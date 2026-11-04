/* Amp v10 — milkdrop.js: Milkdrop / butterchurn (đợt 4, 03/11).
   Quy ước từ Webamp fork (captbaritone/webamp v2.3.1), KHÔNG bê code:
   3 dạng preset (normalizePresetTypes): object sẵn / hàm trả object /
   URL fetch JSON trực tiếp; createVisualizer(ctx, canvas, {meshWidth 32,
   meshHeight 24, pixelRatio, onlyUseWASM:true}), connectAudio(analyser),
   loadPreset(preset, transitionTime), render() mỗi frame rAF.
   Amp gọn hơn Webamp: KHÔNG preset cycling/random/overlay/drop .milk —
   chỉ 1 preset mặc định + chuyển preset bằng 3 dạng trên.
   GIỚI HẠN (v10.5, theo Webamp): Milkdrop chỉ "nghe" được nhạc THẬT
   khi EQ BẬT + đài có CORS (analyser chỉ có tín hiệu khi tiếng qua
   chuỗi EQ — cùng giới hạn như vis; Webamp fork cũng vậy: direct mode
   / EQ tắt thì analyser không có dữ liệu, "Vis chính + Milkdrop đứng
   yên", và fork đã TRẢ LẠI bypass thật sau khi thử nối analyser vào
   direct mode vì làm tiếng nhỏ hơn phát native — xem media/index.ts
   của fork). Amp giữ EQ-tắt = phát native TO nên KHÔNG đánh đổi tiếng
   lấy hình: khi không có tín hiệu thật (EQ tắt / EQ tự tắt vì đài
   không CORS / chưa có source) thì butterchurn nối vào ANALYSER MẪU
   (tín hiệu sine/phổ giả lập, ghi rõ là mẫu trang trí, không phải
   nhạc thật) để hình vẫn chạy thay vì AVS đen. Mẫu CHỈ chạy khi nhạc
   ĐANG PHÁT (v10.5, đợt "bỏ hiệu ứng mặc định khi không có nhạc"):
   dừng/tạm dừng/chưa phát thì canvas ẩn, vùng AVS đen/trống — xem
   applyCanvasDisplay/setPlaying. Vòng render chỉ chạy khi đủ cả 4
   (bật + đang phát + cửa sổ đang hiện + đã có visualizer — xem
   startLoop/setVisible), nên MẶC ĐỊNH BẬT từ v10.8 (theo yêu cầu của
   Hải 04/11): chưa mở cửa sổ xem thì loop không chạy, không tốn
   CPU/GPU; RAM chỉ giữ 2 thư viện đã nạp lazy (~850KB: butterchurn
   192KB + presets 653KB), visualizer chỉ tạo khi canvas đã có kích
   thước (cửa sổ chưa mở thì canvas 0×0 nên ensureVisualizer() không
   tạo, không giữ WebGL context). Tắt được từ menu View / Vis / Video
   (lưu localStorage "amp9-milkdrop-v1" = "0"). butterchurn không có
   hàm hủy visualizer: tắt chỉ dừng vòng render + ẩn canvas, không
   giải phóng WebGL.
   Chạy được cả trình duyệt (window.AmpMilkdrop) lẫn Node (module.exports).
   API: createMilkdrop(opts) -> { enable, disable, isEnabled, setPlaying,
   setVisible, setSize, syncSizeFromWrap, attachTo, detach, ensureReady,
   loadPreset, loadDefaultPreset, resolvePreset, getState, getVisualizer }.
*/
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory();
  else root.AmpMilkdrop = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var MILKDROP_VERSION = "10.13";
  var EXPECTED_MILKDROP_VERSION = "10.13";
  if (MILKDROP_VERSION !== EXPECTED_MILKDROP_VERSION) {
    throw new Error("milkdrop.js: MILKDROP_VERSION (" + MILKDROP_VERSION + ") khac EXPECTED_MILKDROP_VERSION (" + EXPECTED_MILKDROP_VERSION + ") — ban mix, dung lai");
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
  var MANIFEST_MISMATCH = MANIFEST_VERSION !== null && MANIFEST_VERSION !== MILKDROP_VERSION;

  /* ===== LINK THƯ VIỆN MILKDROP — BUNDLE LOCAL TRƯỚC, CDN DỰ PHÒNG (v10.6) =====
     Thư viện ĐÓNG GÓI VÀO ZIP, cùng thư mục với index.html (không có thẻ
     <script src> trong index.html: loader tạo thẻ script động khi bật
     Milkdrop lần đầu — lazy, xem ensureLibs):
       butterchurn.min.js         192.520 byte (butterchurn@2.6.7, UMD)
       butterchurnPresets.min.js  653.572 byte (butterchurn-presets@2.4.7, UMD, 100 preset)
     Tổng +846.092 byte (gzip ~163 KB); zip v10.5 938.139 byte -> ước
     ~1,1–1,8 MB (tùy nén), dưới ngưỡng ~3 MB nên đóng gói CẢ HAI file
     nguyên vẹn (không cần bản presets gọn). Tải + kiểm sống 04/11
     (jsDelivr 200, đủ byte).
     Thứ tự nạp mỗi lib: LOCAL -> jsDelivr -> unpkg (cả 2 CDN đã curl
     kiểm sống 04/11, cùng kích thước file local). cdnjs KHÔNG có trong
     chuỗi: https://cdnjs.cloudflare.com/ajax/libs/butterchurn/2.6.7/
     butterchurn.min.js trả 404 (kiểm 04/11). statically.io cũng KHÔNG
     dùng (stall 30s). Mỗi lần thử có TIMEOUT 15s
     (LOAD_SCRIPT_TIMEOUT_MS): script treo không onload/onerror thì coi
     như lỗi, thử nguồn tiếp theo; lỗi cuối cùng liệt kê đủ các nguồn
     đã thử thay vì 1 câu chung chung.
     BẪY UMD (phát hiện 04/11, kiểm bằng vm trên đúng file sẽ giao):
     nạp <script> thường thì window.butterchurn = {default: Butterchurn}
     — createVisualizer là static method của CLASS trong .default, còn
     window.butterchurn.createVisualizer thì undefined. Bundler (Webamp)
     tự unwrap .default qua interop nên gọi thẳng được, còn nạp script
     thường thì KHÔNG — phải unwrap tay (xem resolveButterchurn). Đây
     mới là nguyên nhân thật của lỗi "chua nap duoc thu vien butterchurn
     (CDN)" trên máy thật: lib có thể đã nạp xong nhưng ensureVisualizer
     kiểm bc.createVisualizer nên vẫn báo thiếu lib.
     window.butterchurnPresets thì KHÔNG bị bẫy này (nó là function
     có sẵn .getPresets).
     Preset mặc định: tra KHO PRESET ĐÃ NẠP (local) trước, lỗi thì fetch
     DEFAULT_PRESET_URL (CDN), lỗi nữa thì preset nhúng sẵn FALLBACK_PRESET
     (đúng file JSON ở URL dưới, 3824 byte minified). */
  var BUTTERCHURN_LOCAL = "butterchurn.min.js";
  var PRESETS_LOCAL = "butterchurnPresets.min.js";
  var BUTTERCHURN_CDN = "https://cdn.jsdelivr.net/npm/butterchurn@2.6.7/lib/butterchurn.min.js";
  var PRESETS_CDN = "https://cdn.jsdelivr.net/npm/butterchurn-presets@2.4.7/lib/butterchurnPresets.min.js";
  var BUTTERCHURN_UNPKG = "https://unpkg.com/butterchurn@2.6.7/lib/butterchurn.min.js";
  var PRESETS_UNPKG = "https://unpkg.com/butterchurn-presets@2.4.7/lib/butterchurnPresets.min.js";
  var BUTTERCHURN_SOURCES = [BUTTERCHURN_LOCAL, BUTTERCHURN_CDN, BUTTERCHURN_UNPKG];
  var PRESETS_SOURCES = [PRESETS_LOCAL, PRESETS_CDN, PRESETS_UNPKG];
  var LOAD_SCRIPT_TIMEOUT_MS = 15000;
  var DEFAULT_PRESET_NAME = "Zylot - Star Ornament";
  var DEFAULT_PRESET_URL = "https://cdn.jsdelivr.net/npm/butterchurn-presets@2.4.7/presets/converted/Zylot%20-%20Star%20Ornament.json";
  /* Preset mặc định nhúng sẵn (đúng file JSON ở URL trên). Dùng khi fetch
     URL lỗi và tra kho preset cũng lỗi. */
  var FALLBACK_PRESET = {"baseVals":{"rating":0,"gammaadj":1,"decay":0.997,"echo_zoom":0.996629,"echo_orient":1,"wave_thick":1,"wave_brighten":0,"darken":1,"wave_a":0.001185,"wave_scale":0.01,"wave_smoothing":0.27,"wave_mystery":-0.38,"modwavealphastart":0.71,"modwavealphaend":1.3,"warpscale":1.331,"zoom":0.999514,"warp":0.01,"ob_size":0,"ob_r":0.01,"ob_a":1,"ib_size":0,"ib_r":1,"ib_g":1,"ib_b":1,"ib_a":1,"mv_x":64,"mv_y":48,"mv_l":0.85,"mv_r":0.4999,"mv_g":0.4999,"mv_b":0.4999,"mv_a":0},"shapes":[{"baseVals":{"enabled":1,"sides":3,"rad":0.34,"ang":0.53,"r":0.56,"g":0.36,"r2":0.9,"a2":0.5,"border_a":0},"init_eqs_str":"a.angle=0;a.bassspin=0;a.q1=0;a.q2=0;a.bassspin=0;a.angle=0;","frame_eqs_str":"a.ang=a.angle;a.bassspin=.00001<Math.abs(above(.05*a.bass,a.bassspin))?a.bassspin+.001:a.bassspin-.001;a.bassspin*=above(a.bassspin,0);a.angle+=a.bassspin;a.r=.3*a.bass;a.g=.3*a.treb;a.b=.3*a.mid;a.r2=.8+.2*Math.sin(1.2*a.time);a.g2=.8+.2*Math.sin(.9777*a.time);a.b2=.8+.2*Math.sin(.7005*a.time);a.border_a=1*above(a.bass+a.treb+a.mid,5);a.x=.5+a.q1;a.y=.5+a.q2;"},{"baseVals":{"enabled":1,"sides":100,"additive":1,"textured":1,"rad":0.108073,"g":1,"b":1,"r2":1,"b2":1,"a2":1,"border_a":0},"init_eqs_str":"a.bassspin=0;a.xpos=0;a.ypos=0;a.q1=0;a.q2=0;a.bassspin=0;a.xpos=.25;a.ypos=.25;","frame_eqs_str":"a.bassspin=.00001<Math.abs(above(.05*a.bass,a.bassspin))?a.bassspin+.001:a.bassspin-.001;a.bassspin*=above(a.bassspin,0);a.xpos+=a.bassspin;a.ypos+=a.bassspin;a.x=.5+a.q1+.13*Math.sin(a.xpos);a.y=.5+a.q2+.18*Math.cos(a.ypos);"},{"baseVals":{"enabled":1,"sides":29,"additive":1,"textured":1,"rad":0.105693,"g":1,"b":1,"r2":1,"b2":1,"a2":1,"border_a":0},"init_eqs_str":"a.bassspin=0;a.xpos=0;a.ypos=0;a.q1=0;a.q2=0;a.bassspin=0;a.xpos=2.3;a.ypos=2.3;","frame_eqs_str":"a.bassspin=.00001<Math.abs(above(.05*a.bass,a.bassspin))?a.bassspin+.001:a.bassspin-.001;a.bassspin*=above(a.bassspin,0);a.xpos+=a.bassspin;a.ypos+=a.bassspin;a.x=.5+a.q1+.13*Math.sin(a.xpos);a.y=.5+a.q2+.18*Math.cos(a.ypos);"},{"baseVals":{"enabled":1,"sides":100,"additive":1,"textured":1,"rad":0.091434,"g":1,"b":1,"r2":1,"b2":1,"a2":1,"border_a":0},"init_eqs_str":"a.bassspin=0;a.xpos=0;a.ypos=0;a.q1=0;a.q2=0;a.bassspin=0;a.xpos=4.5;a.ypos=4.5;","frame_eqs_str":"a.bassspin=.00001<Math.abs(above(.05*a.bass,a.bassspin))?a.bassspin+.001:a.bassspin-.001;a.bassspin*=above(a.bassspin,0);a.xpos+=a.bassspin;a.ypos+=a.bassspin;a.x=.5+a.q1+.13*Math.sin(a.xpos);a.y=.5+a.q2+.18*Math.cos(a.ypos);"}],"waves":[{"baseVals":{"enabled":0}},{"baseVals":{"enabled":0}},{"baseVals":{"enabled":0}},{"baseVals":{"enabled":0}}],"init_eqs_str":"a.xpos=0;a.yamptarg=0;a.ydir=0;a.q1=0;a.yaccel=0;a.xamptarg=0;a.xamp=0;a.xspeed=0;a.ypos=0;a.xaccel=0;a.att=0;a.vol=0;a.q2=0;a.yamp=0;a.xdir=0;a.yspeed=0;","frame_eqs_str":"a.warp=0;a.decay=.92;a.vol=div(a.bass+a.mid+a.att,6);a.xamptarg=.00001<Math.abs(equal(mod(a.frame,15),0))?Math.min(.5*a.vol*a.bass_att,.5):a.xamptarg;a.xamp+=.5*(a.xamptarg-a.xamp);a.xdir=.00001<Math.abs(above(Math.abs(a.xpos),a.xamp))?-sign(a.xpos):.00001<Math.abs(below(Math.abs(a.xspeed),.1))?2*above(a.xpos,0)-1:a.xdir;a.xaccel=a.xdir*a.xamp-a.xpos-.055*a.xspeed*below(Math.abs(a.xpos),a.xamp);a.xspeed=a.xspeed+a.xdir*a.xamp-a.xpos-.055*a.xspeed*below(Math.abs(a.xpos),a.xamp);\na.xpos+=.001*a.xspeed;a.yamptarg=.00001<Math.abs(equal(mod(a.frame,15),0))?Math.min(.3*a.vol*a.treb_att,.5):a.yamptarg;a.yamp+=.5*(a.yamptarg-a.yamp);a.ydir=.00001<Math.abs(above(Math.abs(a.ypos),a.yamp))?-sign(a.ypos):.00001<Math.abs(below(Math.abs(a.yspeed),.1))?2*above(a.ypos,0)-1:a.ydir;a.yaccel=a.ydir*a.yamp-a.ypos-.055*a.yspeed*below(Math.abs(a.ypos),a.yamp);a.yspeed=a.yspeed+a.ydir*a.yamp-a.ypos-.055*a.yspeed*below(Math.abs(a.ypos),a.yamp);a.ypos+=.001*a.yspeed;a.q1=a.ypos;a.q2=a.xpos;","pixel_eqs_str":"a.zoom+=a.q1*a.q2*2;a.rot=10+a.rad*a.treb*.1;","warp":"","comp":""};

  function createMilkdrop(opts) {
    opts = opts || {};
    var doc = opts.document || (typeof document !== "undefined" ? document : null);
    var win = opts.window || (typeof window !== "undefined" ? window : null);
    var fetchImpl = opts.fetchImpl || (typeof fetch !== "undefined" ? fetch : null);
    var loadScriptImpl = opts.loadScriptImpl || null; /* test inject: (src) => Promise */
    var getAudioContext = opts.getAudioContext || function () { return null; };
    var getAnalyser = opts.getAnalyser || function () { return null; };
    /* v10.5 — co tin hieu THAT khong (index.html: engine.getState().
       analyserSignal — EQ bat + co MediaElementSource + dang phat).
       Khong co ham nay (test cu) thi mac dinh "co analyser la co tin
       hieu that" nhu cu; co thi moi phan biet that/mau. */
    var hasRealSignal = opts.hasRealSignal || function () { try { return !!getAnalyser(); } catch (e) { return false; } };
    var onStatus = opts.onStatus || null;
    function status(msg) { if (typeof onStatus === "function") { try { onStatus(msg); } catch (e) { /* bỏ qua */ } } }

    var state = {
      enabled: false, playing: false, visible: false,
      libsLoaded: false, libsFailed: false, visualizerReady: false,
      presetName: "", presetSource: "", error: "",
      audioMode: "none" /* "none" | "real" | "sample" — nguon tin hieu dang noi vao butterchurn */
    };
    var libPromise = null, canvas = null, wrapEl = null, visualizer = null;
    var rafId = 0, presetLoaded = false, renderErrCount = 0;
    var sampleAnalyser = null, connectedAnalyser = null;

    function requestAnim(fn) {
      try {
        if (win && win.requestAnimationFrame) return win.requestAnimationFrame(fn);
      } catch (e) { /* bỏ qua */ }
      if (typeof requestAnimationFrame === "function") return requestAnimationFrame(fn);
      return setTimeout(fn, 50);
    }
    function cancelAnim(id) {
      if (!id) return;
      try {
        if (win && win.cancelAnimationFrame) { win.cancelAnimationFrame(id); return; }
      } catch (e) { /* bỏ qua */ }
      if (typeof cancelAnimationFrame === "function") { try { cancelAnimationFrame(id); return; } catch (e) { /* bỏ qua */ } }
      try { clearTimeout(id); } catch (e) { /* bỏ qua */ }
    }
    function defaultLoadScript(src) {
      return new Promise(function (resolve, reject) {
        if (!doc || !doc.createElement) { reject(new Error("milkdrop: khong co document de nap script")); return; }
        var s = doc.createElement("script");
        var done = false, timer = null;
        function cleanup() { if (timer) { try { clearTimeout(timer); } catch (e) { /* bỏ qua */ } timer = null; } }
        function fail(err) {
          if (done) return; done = true; cleanup();
          try { if (s.parentNode) s.parentNode.removeChild(s); } catch (e) { /* bỏ qua */ }
          reject(err);
        }
        s.src = src;
        s.onload = function () { if (done) return; done = true; cleanup(); resolve(); };
        s.onerror = function () { fail(new Error("milkdrop: khong tai duoc " + src + " (can mang)")); };
        /* v10.6 — TIMEOUT: script treo (khong onload/onerror) thi coi nhu
           loi sau 15s, go the de the tai sau (nguon fallback) khong bi
           the cu chan; loadWithTimeout cung race them 1 lop nua cho
           loadScriptImpl test inject. */
        timer = setTimeout(function () { fail(new Error("milkdrop: het thoi gian " + (LOAD_SCRIPT_TIMEOUT_MS / 1000) + "s khi tai " + src + " (treo, khong onload/onerror)")); }, LOAD_SCRIPT_TIMEOUT_MS);
        var parent = null;
        try { parent = doc.head || (doc.getElementsByTagName && doc.getElementsByTagName("head")[0]) || doc.documentElement; } catch (e) { parent = null; }
        if (!parent || !parent.appendChild) { fail(new Error("milkdrop: khong co head de gan script")); return; }
        parent.appendChild(s);
      });
    }
    /* v10.5 — ANALYSER MẪU (đường dự phòng khi không có tín hiệu thật):
       Webamp fork KHÔNG giải quyết được đài không CORS: direct mode
       (EQ tắt) thì analyser không có dữ liệu, EQ bật thì thẻ mang
       crossOrigin=anonymous nên đài không CORS nạp lỗi luôn — fork chỉ
       dùng được với các kênh đã rà có CORS. Amp giữ EQ-tắt = phát
       native TO nên không đánh đổi tiếng lấy hình: khi không có tín
       hiệu thật thì nối butterchurn vào analyser mẫu này thay vì để
       AVS đen. Tín hiệu là sóng sine biến thiên + phổ giả lập (bass
       mạnh, cao dần yếu đi, nhịp đập chậm) — HÌNH TRANG TRÍ, KHÔNG
       PHẢI nhạc thật (ghi rõ ở đây + README). butterchurn mỗi frame
       chỉ gọi getByteTimeDomainData/getByteFrequencyData (+ đọc
       fftSize/frequencyBinCount) nên object thuần này đủ dùng, không
       cần AudioContext thật. */
    function createSampleAnalyser() {
      if (sampleAnalyser) return sampleAnalyser;
      var FFT = 1024, t0 = Date.now();
      var sa = {
        fftSize: FFT, frequencyBinCount: FFT / 2, smoothingTimeConstant: 0,
        isSample: true, /* dấu hiệu cho test/debug: đây là tín hiệu mẫu */
        getByteTimeDomainData: function (arr) {
          var t = (Date.now() - t0) / 1000;
          for (var i = 0; i < arr.length; i++) {
            var ph = (i / arr.length) * Math.PI * 2;
            var v = 128
              + 42 * Math.sin(ph * 2 + t * 2.1)
              + 26 * Math.sin(ph * 5 - t * 3.7)
              + 12 * Math.sin(ph * 11 + t * 5.3);
            arr[i] = Math.max(0, Math.min(255, Math.round(v)));
          }
        },
        getByteFrequencyData: function (arr) {
          var t = (Date.now() - t0) / 1000;
          var pulse = 0.75 + 0.25 * Math.sin(t * 1.7);
          for (var j = 0; j < arr.length; j++) {
            var f = j / arr.length;
            var v = (150 * Math.exp(-f * 5) + 70 * Math.exp(-Math.pow((f - 0.25) * 6, 2)) + 28 * (1 - f)) * pulse;
            arr[j] = Math.max(0, Math.min(255, Math.round(v)));
          }
        },
        getFloatTimeDomainData: function (arr) {
          var tmp = new Uint8Array(arr.length);
          this.getByteTimeDomainData(tmp);
          for (var i = 0; i < arr.length; i++) arr[i] = (tmp[i] - 128) / 128;
        },
        getFloatFrequencyData: function (arr) {
          var tmp = new Uint8Array(arr.length);
          this.getByteFrequencyData(tmp);
          for (var j = 0; j < arr.length; j++) arr[j] = tmp[j] / 255;
        }
      };
      sampleAnalyser = sa;
      return sa;
    }
    /* v10.6 — BÓC .default CỦA UMD butterchurn (xem ghi chú LINK ở đầu
       file): nạp <script> thường thì window.butterchurn = {default: class},
       còn bundler thì bóc sẵn. Helper này chấp nhận cả 2 dạng: có
       .default.createVisualizer thì trả .default, không thì trả global
       như cũ (mock test / lib doi dang van chay). */
    function resolveButterchurn() {
      var bc = win && win.butterchurn;
      if (bc && bc.default && typeof bc.default.createVisualizer === "function") return bc.default;
      return bc || null;
    }
    /* Lib đã sẵn sàng THẬT chưa (không chỉ global truthy): butterchurn
       phải có createVisualizer (sau khi bóc .default), presets phải có
       getPresets. Kiểm này bắt được cả trường hợp script nạp xong nhưng
       global rỗng/sai dạng — lỗi cũ chỉ kiểm truthy nên lọt. */
    function libReady(which) {
      if (which === "butterchurn") {
        var bc = resolveButterchurn();
        return !!(bc && bc.createVisualizer);
      }
      var ps = win && win.butterchurnPresets;
      return !!(ps && ps.getPresets);
    }
    /* Nạp 1 script với TIMEOUT: treo không onload/onerror thì coi như lỗi
       (áp cho cả defaultLoadScript lẫn loadScriptImpl test inject). */
    function loadWithTimeout(src) {
      var loader = loadScriptImpl || defaultLoadScript;
      var p = null;
      try { p = loader(src); } catch (e) { return Promise.reject(e); }
      if (!p || typeof p.then !== "function") p = Promise.resolve(p);
      return Promise.race([p, new Promise(function (_, reject) {
        setTimeout(function () { reject(new Error("milkdrop: het thoi gian " + (LOAD_SCRIPT_TIMEOUT_MS / 1000) + "s khi tai " + src)); }, LOAD_SCRIPT_TIMEOUT_MS);
      })]);
    }
    /* Thử lần lượt từng nguồn trong danh sách cho tới khi lib sẵn sàng
       thật (nạp xong + đúng API). Hết danh sách thì lỗi liệt kê đủ các
       nguồn đã thử. Dùng .then(ok, err) 2 đối số — KHÔNG dùng
       .then().catch(): catch sẽ bắt cả lỗi reject từ attempt(i+1) đệ
       quy rồi chạy lại attempt(i+1) lần nữa, thành thử trùng nguồn
       (vd .default rỗng: unpkg bị thử 4 lần, lỗi liệt kê trùng). */
    function loadFirstAvailable(sources, label, which) {
      var tried = [];
      function attempt(i) {
        if (i >= sources.length) {
          return Promise.reject(new Error("milkdrop: khong nap duoc " + label + " — da thu " + tried.join(" + ") + ", deu loi (kiem tra mang / file local)"));
        }
        var src = sources[i];
        tried.push(src);
        return loadWithTimeout(src).then(function () {
          if (libReady(which)) return src;
          return attempt(i + 1);
        }, function () { return attempt(i + 1); });
      }
      return attempt(0);
    }
    /* Nạp 2 lib UMD qua thẻ <script> lúc chạy (lazy — chỉ khi bật).
       v10.6: LOCAL trước (bundle trong zip, không cần mạng), lỗi thì
       fallback CDN jsDelivr -> unpkg (xem BUTTERCHURN_SOURCES /
       PRESETS_SOURCES). */
    function ensureLibs() {
      if (state.libsLoaded) return Promise.resolve(true);
      if (libPromise) return libPromise;
      if (libReady("butterchurn") && libReady("presets")) {
        state.libsLoaded = true;
        return Promise.resolve(true);
      }
      libPromise = loadFirstAvailable(BUTTERCHURN_SOURCES, "butterchurn", "butterchurn").then(function () {
        return loadFirstAvailable(PRESETS_SOURCES, "butterchurnPresets", "presets");
      }).then(function () {
        if (libReady("butterchurn") && libReady("presets")) {
          state.libsLoaded = true;
          return true;
        }
        throw new Error("milkdrop: nap xong nhung khong co window.butterchurn/window.butterchurnPresets (dung API)");
      }).catch(function (e) {
        state.libsFailed = true;
        state.error = e && e.message ? e.message : String(e);
        libPromise = null;
        throw e;
      });
      return libPromise;
    }
    function ensureVisualizer() {
      if (visualizer) return visualizer;
      if (!canvas) {
        state.error = "milkdrop: chua gan canvas vao vung AVS (attachTo chua chay — mo cua so AVS/Video roi bat lai Milkdrop)";
        return null;
      }
      /* v10.8 (sua hoi quy L7): kiem AudioContext TRUOC canvas 0x0 —
         thieu ctx la loi THAT (engine chua khoi tao — phai hien banner
         de nguoi dung biet, xem test L7) trong khi canvas 0x0 khi AVS
         dong chi la trang thai cho binh thuong (loi "co 0" duoc an khoi
         banner khi AVS dong). Truoc day thu tu nguoc lai: v10.8 attachTo
         zero canvas khi hop chua co co nen loi "co 0" chay truoc va bi
         an, lam mat loi ctx that. */
      var ctx = null;
      try { ctx = getAudioContext(); } catch (e) { ctx = null; }
      if (!ctx) {
        /* v10.5 — MOI nguyen nhan 1 loi RIENG (truoc day ca 3 truong
           hop thieu ctx / thieu lib / thieu canvas deu roi ve chung
           1 cau chung chung noi "chua co AudioContext" kem loi hua
           tu chay sau: cau do SAI khi nhac dang phat ma van den, va
           SAI ca khi nguyen nhan that la thieu lib/canvas. Tu v10.5
           audio.js tao ctx SAN luc tao engine (theo Webamp) nen loi
           nay hau nhu khong xay ra nua; xay ra thi la loi that, khong
           phai "cho phat nhac". */
        state.error = "milkdrop: chua co AudioContext (engine chua khoi tao xong — thu tat roi bat lai Milkdrop)";
        return null;
      }
      /* v10.4 — canvas 0x0 (vung AVS chua co kich thuoc) thi dung lai
         va bao ro thay vi tao visualizer hong roi de canvas den im lang.
         v10.8: canvas ve 0x0 nho attachTo (canvas moi mac dinh 300x150
         nen phai zero tay khi hop chua co co — xem attachTo). */
      if (!canvas.width || !canvas.height) {
        state.error = "milkdrop: canvas Milkdrop co 0 — chua co kich thuoc vung AVS (mo AVS roi bat lai Milkdrop)";
        return null;
      }
      var bc = resolveButterchurn(); /* v10.6: boc .default (xem LINK o dau file) */
      if (!bc || !bc.createVisualizer) {
        state.error = "milkdrop: chua nap duoc thu vien butterchurn (da thu local + jsDelivr + unpkg) — kiem tra mang roi tat/bat lai Milkdrop";
        return null;
      }
      var w = canvas.width || 342, h = canvas.height || 150;
      var viz = null;
      try {
        viz = bc.createVisualizer(ctx, canvas, {
          width: w, height: h, meshWidth: 32, meshHeight: 24,
          pixelRatio: (win && win.devicePixelRatio) || 1,
          onlyUseWASM: true /* như Webamp: không eval JS trong preset cũ */
        });
      } catch (e) { state.error = "milkdrop: khong tao duoc visualizer: " + (e && e.message ? e.message : e); return null; }
      if (!viz) { state.error = "milkdrop: khong tao duoc visualizer (butterchurn tra null)"; return null; }
      visualizer = viz;
      state.visualizerReady = true;
      connectAudioSource();
      return visualizer;
    }
    /* v10.5 — CHON NGUON TIN HIEU cho butterchurn (theo Webamp
       Visualizer.tsx: visualizer tao 1 lan, connectAudio(analyser)
       ngay luc tao; doi analyser thi goi lai connectAudio — butterchurn
       noi lai, khong can tao lai visualizer). Co tin hieu that (EQ bat
       + CORS ok + dang phat) thi noi analyser that; khong co thi noi
       analyser MAU (xem createSampleAnalyser) de hinh van chay thay vi
       den. Chi goi connectAudio khi doi doi tuong nguon (tranh noi lai
       vo ich); goi lai o moi lan ensureReady/setPlaying de khong ket
       o che do cu khi EQ/CORS vua doi. */
    function connectAudioSource() {
      if (!visualizer || !visualizer.connectAudio) return false;
      var real = null;
      try { real = getAnalyser(); } catch (e) { real = null; }
      var useReal = false;
      try { useReal = !!real && !!hasRealSignal(); } catch (e) { useReal = false; }
      var target = useReal ? real : createSampleAnalyser();
      if (connectedAnalyser === target) return true;
      try { visualizer.connectAudio(target); } catch (e) { return false; }
      connectedAnalyser = target;
      state.audioMode = useReal ? "real" : "sample";
      return true;
    }
    /* 3 dạng preset của Webamp (normalizePresetTypes trong milkdrop.ts):
       object sẵn / hàm trả object / URL fetch JSON. Thêm dạng {name}:
       tra trong kho butterchurnPresets.getPresets(). */
    function resolvePreset(spec) {
      if (!spec) return Promise.reject(new Error("milkdrop: preset khong hop le"));
      if (spec.butterchurnPresetObject) return Promise.resolve(spec.butterchurnPresetObject);
      if (spec.getButterchrunPresetObject) {
        try { return Promise.resolve(spec.getButterchrunPresetObject()); }
        catch (e) { return Promise.reject(e); }
      }
      if (spec.butterchurnPresetUrl) {
        if (!fetchImpl) return Promise.reject(new Error("milkdrop: khong co fetch (can mang)"));
        return fetchImpl(spec.butterchurnPresetUrl).then(function (r) {
          if (!r || !r.ok) throw new Error("milkdrop: preset URL HTTP " + (r ? r.status : "?"));
          return r.json();
        });
      }
      if (spec.name) {
        var lib = win && win.butterchurnPresets;
        if (lib && lib.getPresets) {
          var map = null;
          try { map = lib.getPresets(); } catch (e) { map = null; }
          if (map && map[spec.name]) return Promise.resolve(map[spec.name]);
        }
        return Promise.reject(new Error("milkdrop: khong tim thay preset '" + spec.name + "' trong kho"));
      }
      return Promise.reject(new Error("milkdrop: preset khong hop le"));
    }
    /* Preset mặc định (v10.6 — đổi thứ tự so với trước): tra KHO PRESET
       ĐÃ NẠP (local, 100 preset trong butterchurnPresets.min.js — không
       cần mạng) trước, lỗi thì fetch URL, lỗi nữa thì preset nhúng sẵn. */
    function loadDefaultPreset() {
      return resolvePreset({ name: DEFAULT_PRESET_NAME }).then(function (p) {
        state.presetSource = "library"; state.presetName = DEFAULT_PRESET_NAME; return p;
      }).catch(function () {
        return resolvePreset({ butterchurnPresetUrl: DEFAULT_PRESET_URL }).then(function (p) {
          state.presetSource = "url"; state.presetName = DEFAULT_PRESET_NAME; return p;
        });
      }).catch(function () {
        state.presetSource = "fallback"; state.presetName = DEFAULT_PRESET_NAME + " (fallback nhung san)";
        return FALLBACK_PRESET;
      });
    }
    function applyPreset(preset, transitionTime) {
      var v = ensureVisualizer();
      if (!v) return false;
      try {
        v.loadPreset(preset, transitionTime || 0);
        presetLoaded = true;
        state.error = ""; /* v10.4: nap duoc thi xoa loi cu (vd "chua co AudioContext") de khoi bao loi cu tren banner */
        return true;
      } catch (e) { state.error = "milkdrop: loadPreset loi: " + (e && e.message ? e.message : e); return false; }
    }
    function loadPreset(spec, transitionTime) {
      return resolvePreset(spec).then(function (p) {
        if (spec && spec.name) { state.presetName = spec.name; state.presetSource = spec.butterchurnPresetUrl ? "url" : (spec.butterchurnPresetObject ? "object" : (spec.getButterchrunPresetObject ? "function" : "library")); }
        return applyPreset(p, transitionTime);
      });
    }
    function loop() {
      rafId = 0;
      if (!state.enabled || !state.playing || !state.visible || !visualizer) return;
      try {
        visualizer.render();
        /* v10.5 — ve duoc 1 frame voi preset da nap thi moi loi cu
           truoc do deu het dung (vd "chua co AudioContext" o lan bat
           truoc): xoa de banner do (index.html doc state.error) tu
           tat thay vi dinh vinh vien. Chua nap preset thi giu loi. */
        if (presetLoaded && state.error) state.error = "";
        renderErrCount = 0;
      } catch (e) {
        /* v10.4 — render loi lien tiep thi bao ro (console + state.error
           de index.html dua len banner) thay vi nuot im lang roi de
           canvas den; loi don le thi bo qua (co the chi mat frame). */
        renderErrCount++;
        if (renderErrCount === 3) {
          state.error = "milkdrop: render loi " + renderErrCount + " lan lien tiep: " + (e && e.message ? e.message : e);
          status(state.error + " — hinh co the den.");
        }
      }
      rafId = requestAnim(loop);
    }
    function startLoop() {
      if (rafId) return;
      if (!state.enabled || !state.playing || !state.visible || !visualizer) return;
      rafId = requestAnim(loop);
    }
    function stopLoop() {
      if (rafId) { cancelAnim(rafId); rafId = 0; }
    }
    /* v10.5 (bo hieu ung mac dinh khi khong co nhac) — canvas Milkdrop
       chi hien khi du ca 3: bat + dang hien theo renderer + DANG PHAT.
       Tam dung/dung/chua phat thi an canvas ngay: chi dung loop thi
       khung cuoi cung da ve van dong bang tren canvas WebGL (butterchurn
       khong co ham xoa), phai an di thi vung AVS/Video moi ve den/trong
       (ten kenh hien tren nen den nhu truong hop chi co tieng). renderer
       cung chan o applyMilkdropVisibility (keo khong render sau se hien
       lai anh dong); day la lop chan thu 2, chay ngay khi doi phat/dung. */
    function applyCanvasDisplay() {
      if (canvas) { try { canvas.style.display = (state.enabled && state.visible && state.playing) ? "" : "none"; } catch (e) { /* bỏ qua */ } }
    }
    /* Bật Milkdrop: nạp lib (lazy) -> tạo visualizer -> nạp preset mặc
       định. v10.5: audio.js tạo AudioContext SẴN lúc tạo engine (theo
       Webamp) nên lúc bật thường đã có ctx; nếu visualizer vẫn chưa
       tạo được (vd AVS chưa mở nên canvas 0×0) thì vẫn giữ cờ bật +
       lỗi cụ thể, index.html gọi ensureReady() sau mỗi lần phát/mở
       AVS để tạo nốt — không bao giờ nói "sẽ tự chạy khi phát nhạc"
       trong khi nhạc đang phát. */
    function enable() {
      state.enabled = true;
      state.error = "";
      return ensureLibs().then(function () {
        var v = ensureVisualizer();
        if (!v) {
          /* v10.5 — lỗi cụ thể do ensureVisualizer đặt (thiếu canvas /
             ctx / lib / WebGL); KHÔNG ghi đè bằng câu chung "chưa có
             AudioContext — sẽ tự chạy khi phát nhạc" nữa (câu đó sai
             khi nhạc đang phát mà vẫn đen, và sai cả khi nguyên nhân
             thật là thiếu lib/canvas). */
          status(state.error);
          return getState();
        }
        return loadDefaultPreset().then(function (preset) {
          var ok = applyPreset(preset, 0);
          if (!ok) {
            /* v10.4 — preset nap khong duoc thi bao ro (truoc day chi
               status() khi thanh cong, that bai thi im lang de canvas den). */
            status("Milkdrop: khong nap duoc preset '" + state.presetName + "'" + (state.error ? " (" + state.error + ")" : "") + " — hinh co the den.");
          } else {
            status("Milkdrop: preset '" + state.presetName + "' (" + state.presetSource + ")" + (state.presetSource === "fallback" ? " — link preset tren mang loi, dung preset nhung san" : ""));
          }
          startLoop();
          return getState();
        });
      }).catch(function (e) {
        state.enabled = false;
        state.error = e && e.message ? e.message : String(e);
        status("Milkdrop khong bat duoc: " + state.error + " — vis AVS thuong o lai.");
        throw e;
      });
    }
    function disable() {
      state.enabled = false;
      state.audioMode = "none";
      connectedAnalyser = null;
      stopLoop();
      applyCanvasDisplay(); /* enabled=false -> an (xem applyCanvasDisplay) */
      return getState();
    }
    /* AUDIT (đổi skin): bỏ visualizer đã cache (nó giữ ctx +
       analyser của engine cũ; engine mới có ctx/analyser mới nên
       visualizer cũ sẽ không theo nhạc nữa). Gọi khi đổi skin, trước khi
       bật lại Milkdrop để ensureVisualizer tạo mới. */
    function reset() {
      stopLoop();
      visualizer = null;
      connectedAnalyser = null;
      state.visualizerReady = false;
      state.audioMode = "none";
      presetLoaded = false;
      return getState();
    }
    /* Thử tạo visualizer + nạp preset khi đã bật mà trước đó chưa có
       AudioContext (vd bật Milkdrop trước khi phát nhạc lần đầu). */
    function ensureReady() {
      if (!state.enabled || !state.libsLoaded) return Promise.resolve(getState());
      /* v10.5 — canvas có thể vừa có kích thước (mở AVS / tách cửa sổ
         Video / đổi skin) sau lần thử trước bị 0×0: đồng bộ lại cỡ
         trước khi tạo visualizer; tạo xong thì chọn lại nguồn tín
         hiệu (thật/mẫu) vì trạng thái EQ/CORS có thể vừa đổi. */
      syncSizeFromWrap();
      var v = ensureVisualizer();
      if (!v) return Promise.resolve(getState());
      connectAudioSource();
      if (presetLoaded) { startLoop(); return Promise.resolve(getState()); }
      return loadDefaultPreset().then(function (preset) {
        applyPreset(preset, 0);
        connectAudioSource();
        startLoop();
        return getState();
      });
    }
    function setPlaying(p) {
      state.playing = !!p;
      /* v10.5 — bo hieu ung khi khong co nhac: dung/tam dung thi an
         canvas ngay (xem applyCanvasDisplay), khong de khung cuoi dong
         bang; phat lai thi hien lai + danh gia lai nguon tin hieu
         (that/mau — Webamp: loop chay theo playing). */
      applyCanvasDisplay();
      if (state.playing) { connectAudioSource(); startLoop(); } else stopLoop();
      return state.playing;
    }
    function setVisible(v) {
      state.visible = !!v;
      applyCanvasDisplay(); /* an neu chua phat (du visible=true) — xem applyCanvasDisplay */
      if (state.visible) { syncSizeFromWrap(); startLoop(); } else stopLoop();
      return state.visible;
    }
    function setSize(w, h) {
      w = Math.max(40, w | 0); h = Math.max(20, h | 0);
      if (canvas) {
        try {
          canvas.width = w; canvas.height = h;
          canvas.style.width = w + "px"; canvas.style.height = h + "px";
        } catch (e) { /* bỏ qua */ }
      }
      if (visualizer && visualizer.setRendererSize) {
        try { visualizer.setRendererSize(w, h); } catch (e) { /* bỏ qua */ }
      }
      return { w: w, h: h };
    }
    function syncSizeFromWrap() {
      if (!wrapEl) return null;
      var w = 0, h = 0;
      try { w = wrapEl.clientWidth || 0; h = wrapEl.clientHeight || 0; } catch (e) { w = 0; h = 0; }
      if (!w || !h) {
        try {
          w = parseInt((wrapEl.style && wrapEl.style.width) || "0", 10) || 0;
          h = parseInt((wrapEl.style && wrapEl.style.height) || "0", 10) || 0;
        } catch (e) { w = 0; h = 0; }
      }
      if (!w || !h) return null;
      return setSize(w, h);
    }
    /* Gắn canvas Milkdrop vào hộp AVS (wrap của renderer.getAvsMedia):
       canvas nằm trên cùng hộp, renderer.setMilkdropActive điều khiển
       ẩn/hiện canvas vis thường đối ứng. */
    function attachTo(wrap) {
      if (!wrap) return null;
      wrapEl = wrap;
      if (!canvas) {
        if (!doc || !doc.createElement) return null;
        canvas = doc.createElement("canvas");
        try { canvas.dataset.milkdropCanvas = "1"; } catch (e) { /* bỏ qua */ }
        try {
          canvas.style.position = "absolute"; canvas.style.left = "0px"; canvas.style.top = "0px";
          canvas.style.display = "none";
        } catch (e) { /* bỏ qua */ }
      }
      try {
        if (canvas.parentElement !== wrap) wrap.appendChild(canvas);
      } catch (e) { return null; }
      /* v10.8 (Milkdrop mac dinh BAT — khong giu WebGL khi cua so chua
         mo): canvas moi tao mac dinh 300x150 nen neu de nguyen thi
         ensureVisualizer() tuong canvas "da co kich thuoc" va tao
         visualizer + giu WebGL context ngay tu luc bat (boot), du cua
         so AVS/Video dang dong. Nay: chua co visualizer ma hop chua co
         kich thuoc (cua so dong / wrap dang park) thi dua canvas ve
         0x0 de co che 0x0 cua ensureVisualizer() chay dung; hop co co
         thi syncSizeFromWrap() dat co that. Da co visualizer thi KHONG
         zero nua (doi canvas.width se reset WebGL context dang dung —
         luc do loop da dung vi cua so dong, context cu giu nguyen cho
         toi khi mo lai). */
      if (!visualizer) {
        if (!syncSizeFromWrap()) { try { canvas.width = 0; canvas.height = 0; } catch (e) { /* bỏ qua */ } }
      } else {
        syncSizeFromWrap();
      }
      return canvas;
    }
    function detach() {
      stopLoop();
      if (canvas && canvas.parentElement) {
        try { canvas.parentElement.removeChild(canvas); } catch (e) { /* bỏ qua */ }
      }
      wrapEl = null;
      return true;
    }
    function getState() {
      return {
        enabled: state.enabled, playing: state.playing, visible: state.visible,
        libsLoaded: state.libsLoaded, libsFailed: state.libsFailed,
        visualizerReady: state.visualizerReady, presetName: state.presetName,
        presetSource: state.presetSource, error: state.error,
        audioMode: state.audioMode, sampleActive: state.audioMode === "sample",
        hasCanvas: !!canvas, hasVisualizer: !!visualizer, presetLoaded: presetLoaded,
        version: MILKDROP_VERSION
      };
    }
    function getVisualizer() { return visualizer; }
    function getCanvas() { return canvas; }

    return {
      enable: enable, disable: disable,
      isEnabled: function () { return state.enabled; },
      setPlaying: setPlaying, setVisible: setVisible,
      setSize: setSize, syncSizeFromWrap: syncSizeFromWrap,
      attachTo: attachTo, detach: detach, reset: reset, /* AUDIT: bỏ visualizer cũ khi đổi skin */ ensureReady: ensureReady,
      loadPreset: loadPreset, loadDefaultPreset: loadDefaultPreset,
      resolvePreset: resolvePreset, getState: getState,
      getVisualizer: getVisualizer, getCanvas: getCanvas
    };
  }

  return {
    MILKDROP_VERSION: MILKDROP_VERSION,
    EXPECTED_MILKDROP_VERSION: EXPECTED_MILKDROP_VERSION,
    MANIFEST_MISMATCH: MANIFEST_MISMATCH,
    BUTTERCHURN_LOCAL: BUTTERCHURN_LOCAL,
    PRESETS_LOCAL: PRESETS_LOCAL,
    BUTTERCHURN_CDN: BUTTERCHURN_CDN,
    PRESETS_CDN: PRESETS_CDN,
    BUTTERCHURN_UNPKG: BUTTERCHURN_UNPKG,
    PRESETS_UNPKG: PRESETS_UNPKG,
    BUTTERCHURN_SOURCES: BUTTERCHURN_SOURCES,
    PRESETS_SOURCES: PRESETS_SOURCES,
    LOAD_SCRIPT_TIMEOUT_MS: LOAD_SCRIPT_TIMEOUT_MS,
    DEFAULT_PRESET_NAME: DEFAULT_PRESET_NAME,
    DEFAULT_PRESET_URL: DEFAULT_PRESET_URL,
    FALLBACK_PRESET: FALLBACK_PRESET,
    createMilkdrop: createMilkdrop
  };
});
