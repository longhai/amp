/* Amp v10 — milkdrop.js (đợt 4, 03/11: Milkdrop / butterchurn).
   Lấy QUY ƯỚC từ Webamp fork (captbaritone/webamp v2.3.1), KHÔNG bê code:
   - packages/webamp/js/actionCreators/milkdrop.ts — normalizePresetTypes:
     3 dạng preset: butterchurnPresetObject (object sẵn) /
     getButterchrunPresetObject (hàm trả object) / butterchurnPresetUrl
     (fetch JSON trực tiếp từ URL, không tải file về).
   - packages/webamp/js/components/MilkdropWindow/Visualizer.tsx —
     butterchurn.createVisualizer(audioCtx, canvas, {meshWidth 32,
     meshHeight 24, pixelRatio, onlyUseWASM:true}), connectAudio(analyser),
     loadPreset(preset, transitionTime), render() mỗi frame rAF.
   - packages/webamp-demo/js/butterchurnOptions.ts — preset JSON lẻ host
     ở unpkg.com/butterchurn-presets/*.json (cho dạng URL).
   Amp làm gọn hơn Webamp: KHÔNG có preset cycling/random/overlay/drop file
   .milk — chỉ 1 preset mặc định + chuyển preset bằng 3 dạng trên.
   NGUỒN PRESET (KHÔNG đóng gói vào zip — lấy từ mạng lúc chạy):
   - Lib: https://cdn.jsdelivr.net/npm/butterchurn@2.6.7/lib/butterchurn.min.js
          https://cdn.jsdelivr.net/npm/butterchurn-presets@2.4.7/lib/butterchurnPresets.min.js
     (đã kiểm sống 03/11, UMD thật: window.butterchurn /
     window.butterchurnPresets, xem batch7-milkdrop-note.md).
   - Preset mặc định dạng URL (đã kiểm sống 03/11, HTTP 200, JSON hợp lệ,
     3824 byte): .../butterchurn-presets@2.4.7/presets/converted/
     Zylot%20-%20Star%20Ornament.json
   - Fallback: preset "Zylot - Star Ornament" NHÚNG SẴN trong code
     (FALLBACK_PRESET — đúng file JSON trên, minified) — dùng khi fetch URL
     lỗi VÀ tra kho preset cũng lỗi. CHỈ fallback preset, KHÔNG fallback
     lib: CDN lib chết thì Milkdrop không chạy được, vis AVS thường ở lại.
   GIỚI HẠN (ghi rõ, không giấu):
   - Milkdrop chỉ "nghe" được nhạc khi EQ BẬT (analyser của Amp chỉ có tín
     hiệu khi tiếng đi qua chuỗi EQ — cùng giới hạn như vis, xem README
     đợt B). EQ tắt thì preset vẫn chạy hình nhưng không theo nhạc.
   - Tốn GPU/pin trên điện thoại nên MẶC ĐỊNH TẮT — bật từ menu ⋯.
   - butterchurn không có hàm hủy visualizer: tắt chỉ dừng vòng render +
     ẩn canvas, không giải phóng WebGL (bật lại dùng tiếp visualizer cũ).
   Chạy được cả trình duyệt (window.AmpMilkdrop) lẫn Node (module.exports,
   dùng với jsdom). Không dependency, không build step.
   API: createMilkdrop(opts) -> { enable, disable, isEnabled, setPlaying,
   setVisible, setSize, syncSizeFromWrap, attachTo, detach, ensureReady,
   loadPreset, loadDefaultPreset, resolvePreset, getState, getVisualizer }.
*/
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory();
  else root.AmpMilkdrop = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var MILKDROP_VERSION = "10.3";
  var EXPECTED_MILKDROP_VERSION = "10.3";
  if (MILKDROP_VERSION !== EXPECTED_MILKDROP_VERSION) {
    throw new Error("milkdrop.js: MILKDROP_VERSION (" + MILKDROP_VERSION + ") khac EXPECTED_MILKDROP_VERSION (" + EXPECTED_MILKDROP_VERSION + ") — ban mix, dung lai");
  }
  /* Đợt v10.0: kiểm manifest như các file kia (index.html đặt
     window.AMP_VERSION trước khi nạp file này). Không có manifest
     (chạy test trực tiếp bằng require) thì không kiểm. */
  var MANIFEST_VERSION = (function () {
    try {
      if (typeof globalThis !== "undefined" && globalThis.AMP_VERSION) return globalThis.AMP_VERSION;
      if (typeof window !== "undefined" && window.AMP_VERSION) return window.AMP_VERSION;
    } catch (e) { /* bỏ qua */ }
    return null;
  })();
  var MANIFEST_MISMATCH = MANIFEST_VERSION !== null && MANIFEST_VERSION !== MILKDROP_VERSION;

  var BUTTERCHURN_CDN = "https://cdn.jsdelivr.net/npm/butterchurn@2.6.7/lib/butterchurn.min.js";
  var PRESETS_CDN = "https://cdn.jsdelivr.net/npm/butterchurn-presets@2.4.7/lib/butterchurnPresets.min.js";
  var DEFAULT_PRESET_NAME = "Zylot - Star Ornament";
  var DEFAULT_PRESET_URL = "https://cdn.jsdelivr.net/npm/butterchurn-presets@2.4.7/presets/converted/Zylot%20-%20Star%20Ornament.json";
  /* Fallback: preset mặc định nhúng sẵn (đúng file JSON ở URL trên,
     đã kiểm 03/11 — 3824 byte minified). Dùng khi fetch URL lỗi và tra
     kho preset cũng lỗi. */
  var FALLBACK_PRESET = {"baseVals":{"rating":0,"gammaadj":1,"decay":0.997,"echo_zoom":0.996629,"echo_orient":1,"wave_thick":1,"wave_brighten":0,"darken":1,"wave_a":0.001185,"wave_scale":0.01,"wave_smoothing":0.27,"wave_mystery":-0.38,"modwavealphastart":0.71,"modwavealphaend":1.3,"warpscale":1.331,"zoom":0.999514,"warp":0.01,"ob_size":0,"ob_r":0.01,"ob_a":1,"ib_size":0,"ib_r":1,"ib_g":1,"ib_b":1,"ib_a":1,"mv_x":64,"mv_y":48,"mv_l":0.85,"mv_r":0.4999,"mv_g":0.4999,"mv_b":0.4999,"mv_a":0},"shapes":[{"baseVals":{"enabled":1,"sides":3,"rad":0.34,"ang":0.53,"r":0.56,"g":0.36,"r2":0.9,"a2":0.5,"border_a":0},"init_eqs_str":"a.angle=0;a.bassspin=0;a.q1=0;a.q2=0;a.bassspin=0;a.angle=0;","frame_eqs_str":"a.ang=a.angle;a.bassspin=.00001<Math.abs(above(.05*a.bass,a.bassspin))?a.bassspin+.001:a.bassspin-.001;a.bassspin*=above(a.bassspin,0);a.angle+=a.bassspin;a.r=.3*a.bass;a.g=.3*a.treb;a.b=.3*a.mid;a.r2=.8+.2*Math.sin(1.2*a.time);a.g2=.8+.2*Math.sin(.9777*a.time);a.b2=.8+.2*Math.sin(.7005*a.time);a.border_a=1*above(a.bass+a.treb+a.mid,5);a.x=.5+a.q1;a.y=.5+a.q2;"},{"baseVals":{"enabled":1,"sides":100,"additive":1,"textured":1,"rad":0.108073,"g":1,"b":1,"r2":1,"b2":1,"a2":1,"border_a":0},"init_eqs_str":"a.bassspin=0;a.xpos=0;a.ypos=0;a.q1=0;a.q2=0;a.bassspin=0;a.xpos=.25;a.ypos=.25;","frame_eqs_str":"a.bassspin=.00001<Math.abs(above(.05*a.bass,a.bassspin))?a.bassspin+.001:a.bassspin-.001;a.bassspin*=above(a.bassspin,0);a.xpos+=a.bassspin;a.ypos+=a.bassspin;a.x=.5+a.q1+.13*Math.sin(a.xpos);a.y=.5+a.q2+.18*Math.cos(a.ypos);"},{"baseVals":{"enabled":1,"sides":29,"additive":1,"textured":1,"rad":0.105693,"g":1,"b":1,"r2":1,"b2":1,"a2":1,"border_a":0},"init_eqs_str":"a.bassspin=0;a.xpos=0;a.ypos=0;a.q1=0;a.q2=0;a.bassspin=0;a.xpos=2.3;a.ypos=2.3;","frame_eqs_str":"a.bassspin=.00001<Math.abs(above(.05*a.bass,a.bassspin))?a.bassspin+.001:a.bassspin-.001;a.bassspin*=above(a.bassspin,0);a.xpos+=a.bassspin;a.ypos+=a.bassspin;a.x=.5+a.q1+.13*Math.sin(a.xpos);a.y=.5+a.q2+.18*Math.cos(a.ypos);"},{"baseVals":{"enabled":1,"sides":100,"additive":1,"textured":1,"rad":0.091434,"g":1,"b":1,"r2":1,"b2":1,"a2":1,"border_a":0},"init_eqs_str":"a.bassspin=0;a.xpos=0;a.ypos=0;a.q1=0;a.q2=0;a.bassspin=0;a.xpos=4.5;a.ypos=4.5;","frame_eqs_str":"a.bassspin=.00001<Math.abs(above(.05*a.bass,a.bassspin))?a.bassspin+.001:a.bassspin-.001;a.bassspin*=above(a.bassspin,0);a.xpos+=a.bassspin;a.ypos+=a.bassspin;a.x=.5+a.q1+.13*Math.sin(a.xpos);a.y=.5+a.q2+.18*Math.cos(a.ypos);"}],"waves":[{"baseVals":{"enabled":0}},{"baseVals":{"enabled":0}},{"baseVals":{"enabled":0}},{"baseVals":{"enabled":0}}],"init_eqs_str":"a.xpos=0;a.yamptarg=0;a.ydir=0;a.q1=0;a.yaccel=0;a.xamptarg=0;a.xamp=0;a.xspeed=0;a.ypos=0;a.xaccel=0;a.att=0;a.vol=0;a.q2=0;a.yamp=0;a.xdir=0;a.yspeed=0;","frame_eqs_str":"a.warp=0;a.decay=.92;a.vol=div(a.bass+a.mid+a.att,6);a.xamptarg=.00001<Math.abs(equal(mod(a.frame,15),0))?Math.min(.5*a.vol*a.bass_att,.5):a.xamptarg;a.xamp+=.5*(a.xamptarg-a.xamp);a.xdir=.00001<Math.abs(above(Math.abs(a.xpos),a.xamp))?-sign(a.xpos):.00001<Math.abs(below(Math.abs(a.xspeed),.1))?2*above(a.xpos,0)-1:a.xdir;a.xaccel=a.xdir*a.xamp-a.xpos-.055*a.xspeed*below(Math.abs(a.xpos),a.xamp);a.xspeed=a.xspeed+a.xdir*a.xamp-a.xpos-.055*a.xspeed*below(Math.abs(a.xpos),a.xamp);\na.xpos+=.001*a.xspeed;a.yamptarg=.00001<Math.abs(equal(mod(a.frame,15),0))?Math.min(.3*a.vol*a.treb_att,.5):a.yamptarg;a.yamp+=.5*(a.yamptarg-a.yamp);a.ydir=.00001<Math.abs(above(Math.abs(a.ypos),a.yamp))?-sign(a.ypos):.00001<Math.abs(below(Math.abs(a.yspeed),.1))?2*above(a.ypos,0)-1:a.ydir;a.yaccel=a.ydir*a.yamp-a.ypos-.055*a.yspeed*below(Math.abs(a.ypos),a.yamp);a.yspeed=a.yspeed+a.ydir*a.yamp-a.ypos-.055*a.yspeed*below(Math.abs(a.ypos),a.yamp);a.ypos+=.001*a.yspeed;a.q1=a.ypos;a.q2=a.xpos;","pixel_eqs_str":"a.zoom+=a.q1*a.q2*2;a.rot=10+a.rad*a.treb*.1;","warp":"","comp":""};

  function createMilkdrop(opts) {
    opts = opts || {};
    var doc = opts.document || (typeof document !== "undefined" ? document : null);
    var win = opts.window || (typeof window !== "undefined" ? window : null);
    var fetchImpl = opts.fetchImpl || (typeof fetch !== "undefined" ? fetch : null);
    var loadScriptImpl = opts.loadScriptImpl || null; /* test inject: (src) => Promise */
    var getAudioContext = opts.getAudioContext || function () { return null; };
    var getAnalyser = opts.getAnalyser || function () { return null; };
    var onStatus = opts.onStatus || null;
    function status(msg) { if (typeof onStatus === "function") { try { onStatus(msg); } catch (e) { /* bỏ qua */ } } }

    var state = {
      enabled: false, playing: false, visible: false,
      libsLoaded: false, libsFailed: false, visualizerReady: false,
      presetName: "", presetSource: "", error: ""
    };
    var libPromise = null, canvas = null, wrapEl = null, visualizer = null;
    var rafId = 0, presetLoaded = false;

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
        s.src = src;
        s.onload = function () { resolve(); };
        s.onerror = function () { reject(new Error("milkdrop: khong tai duoc " + src + " (can mang)")); };
        var parent = null;
        try { parent = doc.head || (doc.getElementsByTagName && doc.getElementsByTagName("head")[0]) || doc.documentElement; } catch (e) { parent = null; }
        if (!parent || !parent.appendChild) { reject(new Error("milkdrop: khong co head de gan script")); return; }
        parent.appendChild(s);
      });
    }
    /* Nạp 2 lib UMD qua thẻ <script> lúc chạy (lazy — chỉ khi bật).
       KHÔNG tải file về đóng gói vào zip. */
    function ensureLibs() {
      if (state.libsLoaded) return Promise.resolve(true);
      if (libPromise) return libPromise;
      if (win && win.butterchurn && win.butterchurnPresets) {
        state.libsLoaded = true;
        return Promise.resolve(true);
      }
      var load = loadScriptImpl || defaultLoadScript;
      libPromise = load(BUTTERCHURN_CDN).then(function () {
        return load(PRESETS_CDN);
      }).then(function () {
        if (win && win.butterchurn && win.butterchurnPresets) {
          state.libsLoaded = true;
          return true;
        }
        throw new Error("milkdrop: nap xong nhung khong co window.butterchurn");
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
      if (!canvas) return null;
      var ctx = null;
      try { ctx = getAudioContext(); } catch (e) { ctx = null; }
      if (!ctx) return null;
      var bc = win && win.butterchurn;
      if (!bc || !bc.createVisualizer) return null;
      var w = canvas.width || 342, h = canvas.height || 150;
      var viz = null;
      try {
        viz = bc.createVisualizer(ctx, canvas, {
          width: w, height: h, meshWidth: 32, meshHeight: 24,
          pixelRatio: (win && win.devicePixelRatio) || 1,
          onlyUseWASM: true /* như Webamp: không eval JS trong preset cũ */
        });
      } catch (e) { state.error = "milkdrop: khong tao duoc visualizer: " + (e && e.message ? e.message : e); return null; }
      if (!viz) return null;
      visualizer = viz;
      var an = null;
      try { an = getAnalyser(); } catch (e) { an = null; }
      if (an && visualizer.connectAudio) {
        try { visualizer.connectAudio(an); } catch (e) { /* EQ tắt / analyser chưa có -> preset vẫn chạy, không theo nhạc */ }
      }
      state.visualizerReady = true;
      return visualizer;
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
    /* Preset mặc định: URL trước (link trực tiếp trên mạng), lỗi thì tra
       kho preset đã nạp, lỗi nữa thì preset object nhúng sẵn. */
    function loadDefaultPreset() {
      return resolvePreset({ butterchurnPresetUrl: DEFAULT_PRESET_URL }).then(function (p) {
        state.presetSource = "url"; state.presetName = DEFAULT_PRESET_NAME; return p;
      }).catch(function () {
        return resolvePreset({ name: DEFAULT_PRESET_NAME }).then(function (p) {
          state.presetSource = "library"; state.presetName = DEFAULT_PRESET_NAME; return p;
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
      try { visualizer.render(); } catch (e) { /* bỏ qua */ }
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
    /* Bật Milkdrop: nạp lib (lazy) -> tạo visualizer -> nạp preset mặc
       định. Chưa có AudioContext (chưa phát nhạc lần nào) thì vẫn bật cờ
       nhưng chưa có visualizer — index.html gọi ensureReady() sau khi
       phát nhạc để tạo nốt (xem ensureReady). */
    function enable() {
      state.enabled = true;
      state.error = "";
      return ensureLibs().then(function () {
        var v = ensureVisualizer();
        if (!v) {
          state.error = "milkdrop: chua co AudioContext — bat nhac truoc roi bat lai Milkdrop (hoac doi 1 khung nhac)";
          status(state.error);
          return getState();
        }
        return loadDefaultPreset().then(function (preset) {
          applyPreset(preset, 0);
          status("Milkdrop: preset '" + state.presetName + "' (" + state.presetSource + ")" + (state.presetSource === "fallback" ? " — link preset tren mang loi, dung preset nhung san" : ""));
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
      stopLoop();
      if (canvas) { try { canvas.style.display = "none"; } catch (e) { /* bỏ qua */ } }
      return getState();
    }
    /* Đợt v10.2 — AUDIT (đổi skin): bỏ visualizer đã cache (nó giữ ctx +
       analyser của engine cũ — engine mới có ctx/analyser mới nên
       visualizer cũ sẽ không theo nhạc nữa). Gọi khi đổi skin, trước khi
       bật lại Milkdrop để ensureVisualizer tạo mới với ctx/analyser mới. */
    function reset() {
      stopLoop();
      visualizer = null;
      state.visualizerReady = false;
      presetLoaded = false;
      return getState();
    }
    /* Thử tạo visualizer + nạp preset khi đã bật mà trước đó chưa có
       AudioContext (vd bật Milkdrop trước khi phát nhạc lần đầu). */
    function ensureReady() {
      if (!state.enabled || !state.libsLoaded) return Promise.resolve(getState());
      var v = ensureVisualizer();
      if (!v) return Promise.resolve(getState());
      if (presetLoaded) { startLoop(); return Promise.resolve(getState()); }
      return loadDefaultPreset().then(function (preset) {
        applyPreset(preset, 0);
        startLoop();
        return getState();
      });
    }
    function setPlaying(p) {
      state.playing = !!p;
      if (state.playing) startLoop(); else stopLoop();
      return state.playing;
    }
    function setVisible(v) {
      state.visible = !!v;
      if (canvas) { try { canvas.style.display = state.enabled && state.visible ? "" : "none"; } catch (e) { /* bỏ qua */ } }
      if (state.visible) startLoop(); else stopLoop();
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
      syncSizeFromWrap();
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
      attachTo: attachTo, detach: detach, reset: reset, /* Đợt v10.2 — AUDIT: bỏ visualizer cũ khi đổi skin */ ensureReady: ensureReady,
      loadPreset: loadPreset, loadDefaultPreset: loadDefaultPreset,
      resolvePreset: resolvePreset, getState: getState,
      getVisualizer: getVisualizer, getCanvas: getCanvas
    };
  }

  return {
    MILKDROP_VERSION: MILKDROP_VERSION,
    EXPECTED_MILKDROP_VERSION: EXPECTED_MILKDROP_VERSION,
    MANIFEST_MISMATCH: MANIFEST_MISMATCH,
    BUTTERCHURN_CDN: BUTTERCHURN_CDN,
    PRESETS_CDN: PRESETS_CDN,
    DEFAULT_PRESET_NAME: DEFAULT_PRESET_NAME,
    DEFAULT_PRESET_URL: DEFAULT_PRESET_URL,
    FALLBACK_PRESET: FALLBACK_PRESET,
    createMilkdrop: createMilkdrop
  };
});
