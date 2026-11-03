/* Amp v10 — skin-browser.js (đợt v10.0, việc 2: chọn skin qua skin-database).
   Chỉ lấy QUY ƯỚC của gói skin-database trong Webamp fork
   (captbaritone/webamp v2.3.1, packages/skin-database), KHÔNG lấy server
   (Next.js + GraphQL + SQLite + Algolia + S3 không lấy được):
   - md5 là id của skin; CDN https://r2.webampskins.org
     (packages/skin-database/data/skins.ts: CDN_URL + getSkinUrl /
     getModernSkinUrl / getScreenshotUrl).
   - Classic .wsz:  ${CDN}/skins/<md5>.wsz
     Modern  .wal:  ${CDN}/skins/<md5>.wal
     Ảnh thu nhỏ:   ${CDN}/screenshots/<md5>.png
   - GraphQL public https://skins.webamp.org/graphql (POST JSON).
     Skin KHÔNG có field "name" — chỉ có "filename" (tên file gốc) làm
     tên hiển thị; KHÔNG có field tác giả. Các field dùng được: md5,
     filename, download_url, screenshot_url.
     Query đã kiểm sống 03/11 (POST 200, CORS cho phép origin bất kỳ):
       skins(first, offset)        -> { nodes { md5 filename download_url screenshot_url } }  (Classic)
       modern_skins(first, offset) -> { nodes { ... } }                                       (Modern)
       search_skins(first, query)  -> [ { md5 filename download_url screenshot_url } ]        (chỉ Classic)
       fetch_skin_by_md5(md5)      -> { md5 filename download_url screenshot_url }
     Lưu ý: search_skins chỉ tìm Classic; tìm Modern thì lọc cục bộ trên
     danh sách đã nạp (xem searchSkins).
   - CORS: preflight GraphQL trả access-control-allow-origin phản chiếu
     origin (GET/POST/OPTIONS, header content-type); GET file trên r2
     trả Access-Control-Allow-Origin: * nên fetch() lấy ArrayBuffer
     được thẳng từ trình duyệt. Ảnh <img> không cần CORS.
   - Mạng lỗi / GraphQL chết: fallback về danh sách mẫu nhúng sẵn
     FALLBACK_SKINS (2 skin có sẵn trong gói + 6 md5 đã kiểm 200 trên
     r2) + chọn file tay như cũ. Danh sách đã fetch được cache vào
     localStorage 24h (CACHE_KEY) để mở lại xem ngay cả khi mất mạng.
   Chạy được cả trình duyệt (window.AmpSkinBrowser) lẫn Node
   (module.exports, dùng với jsdom). Không dependency, không build step.
   API: getSkinUrl / getScreenshotUrl / kindOfSkin / normalizeSkin /
   graphqlQuery / fetchClassicSkins / fetchModernSkins / searchSkins /
   fetchSkinByMd5 / fetchSkinFile / loadCachedList / saveCachedList /
   loadSkinList / filterSkins / FALLBACK_SKINS / wireSkinPanel.
   Lỗi mạng: throw Error (bên gọi bắt + fallback), không crash.
*/
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory();
  else root.AmpSkinBrowser = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var BROWSER_VERSION = "10.0";
  var EXPECTED_BROWSER_VERSION = "10.0";
  if (BROWSER_VERSION !== EXPECTED_BROWSER_VERSION) {
    throw new Error("skin-browser.js: BROWSER_VERSION (" + BROWSER_VERSION + ") khac EXPECTED_BROWSER_VERSION (" + EXPECTED_BROWSER_VERSION + ") — ban mix, dung lai");
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
  var MANIFEST_MISMATCH = MANIFEST_VERSION !== null && MANIFEST_VERSION !== BROWSER_VERSION;

  var GRAPHQL_URL = "https://skins.webamp.org/graphql";
  var CDN_URL = "https://r2.webampskins.org";
  var CACHE_KEY = "amp10-skinlist-v1";
  var CACHE_TTL_MS = 24 * 3600 * 1000; /* cache danh sách 24h */
  var LIST_FIRST = 24; /* mỗi loại lấy 24 skin đầu (mặc định sort của kho) */
  var SEARCH_FIRST = 30;

  function getSkinUrl(md5, modern) {
    return CDN_URL + "/skins/" + md5 + (modern ? ".wal" : ".wsz");
  }
  function getScreenshotUrl(md5) {
    return CDN_URL + "/screenshots/" + md5 + ".png";
  }
  /* Loại skin theo đuôi download_url (chính xác hơn filename, vì có
     file tên ".zip" nhưng link tải là .wsz — vd "3DNow_skin.zip"). */
  function kindOfSkin(skin) {
    var u = (skin && (skin.download_url || skin.downloadUrl)) || "";
    if (/\.wal$/i.test(u)) return "modern";
    if (/\.wsz$/i.test(u)) return "classic";
    var f = (skin && skin.filename) || "";
    if (/\.wal$/i.test(f)) return "modern";
    return "classic";
  }
  function normalizeSkin(node) {
    if (!node || !node.md5) return null;
    var modern = kindOfSkin(node);
    return {
      md5: String(node.md5),
      filename: node.filename ? String(node.filename) : node.md5,
      download_url: node.download_url || getSkinUrl(node.md5, modern === "modern"),
      screenshot_url: (node.screenshot_url === undefined || node.screenshot_url === null)
        ? null : String(node.screenshot_url),
      modern: modern === "modern"
    };
  }

  function getFetch(fetchImpl) {
    if (fetchImpl) return fetchImpl;
    if (typeof fetch !== "undefined") return fetch;
    throw new Error("skin-browser: khong co fetch (can mang)");
  }
  function getStorage(storage) {
    if (storage) return storage;
    try {
      if (typeof localStorage !== "undefined") return localStorage;
    } catch (e) { /* bỏ qua */ }
    return null;
  }

  /* POST GraphQL, trả data; lỗi HTTP / lỗi GraphQL / data rỗng đều throw. */
  async function graphqlQuery(query, fetchImpl) {
    var f = getFetch(fetchImpl);
    var res = await f(GRAPHQL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: query })
    });
    if (!res || !res.ok) {
      throw new Error("skin-browser: GraphQL HTTP " + (res ? res.status : "?"));
    }
    var json = await res.json();
    if (!json || !json.data) {
      throw new Error("skin-browser: GraphQL tra ve rong" + (json && json.errors ? ": " + json.errors.map(function (e) { return e.message; }).join("; ") : ""));
    }
    if (json.errors && json.errors.length) {
      throw new Error("skin-browser: GraphQL loi: " + json.errors.map(function (e) { return e.message; }).join("; "));
    }
    return json.data;
  }

  var SKIN_FIELDS = "md5 filename download_url screenshot_url";
  async function fetchClassicSkins(first, offset, fetchImpl) {
    var data = await graphqlQuery("{ skins(first: " + (first || LIST_FIRST) + ", offset: " + (offset || 0) + ") { nodes { " + SKIN_FIELDS + " } } }", fetchImpl);
    var nodes = (data.skins && data.skins.nodes) || [];
    return nodes.map(normalizeSkin).filter(function (s) { return !!s; });
  }
  async function fetchModernSkins(first, offset, fetchImpl) {
    var data = await graphqlQuery("{ modern_skins(first: " + (first || LIST_FIRST) + ", offset: " + (offset || 0) + ") { nodes { " + SKIN_FIELDS + " } } }", fetchImpl);
    var nodes = (data.modern_skins && data.modern_skins.nodes) || [];
    return nodes.map(normalizeSkin).filter(function (s) { return !!s; });
  }
  /* search_skins của kho chỉ tìm Classic (không có search_modern_skins);
     tìm Modern thì lọc cục bộ trên danh sách đã nạp (xem filterSkins).
     Query nhúng bằng JSON.stringify để khỏi lo escape/kiểu biến. */
  async function searchSkins(query, first, fetchImpl) {
    var q = String(query == null ? "" : query);
    if (!q.trim()) return [];
    var data = await graphqlQuery("{ search_skins(first: " + (first || SEARCH_FIRST) + ", query: " + JSON.stringify(q) + ") { " + SKIN_FIELDS + " } }", fetchImpl);
    var list = data.search_skins || [];
    return list.map(normalizeSkin).filter(function (s) { return !!s; });
  }
  async function fetchSkinByMd5(md5, fetchImpl) {
    var data = await graphqlQuery("{ fetch_skin_by_md5(md5: " + JSON.stringify(String(md5)) + ") { " + SKIN_FIELDS + " } }", fetchImpl);
    return normalizeSkin(data.fetch_skin_by_md5);
  }

  /* Tải file skin (.wal/.wsz) về ArrayBuffer để nạp qua bootSkin.
     Skin "local" (có sẵn trong gói) thì fetch đường dẫn tương đối. */
  async function fetchSkinFile(skin, fetchImpl) {
    var f = getFetch(fetchImpl);
    var url = (skin && skin.local) ? skin.local : (skin && skin.download_url);
    if (!url) throw new Error("skin-browser: skin khong co link tai");
    var res = await f(url);
    if (!res || !res.ok) {
      throw new Error("skin-browser: khong tai duoc " + (skin.filename || url) + " (HTTP " + (res ? res.status : "?") + ")");
    }
    return await res.arrayBuffer();
  }

  /* ---- Danh sách mẫu nhúng sẵn (fallback khi mạng/GraphQL lỗi) ----
     md5 + filename đã kiểm thật 03/11: 566 + base-2.91 có sẵn trong gói
     (md5 tính từ file trong gói, fetch_skin_by_md5 trả đúng tên);
     6 md5 còn lại lấy từ query skins/modern_skins thật, GET r2 200 OK.
     Ảnh 566: kho trả screenshot_url null (không có ảnh) → UI hiện ô trống. */
  var FALLBACK_SKINS = [
    { md5: "b3fa3160814d1689a3f2bacda72b2926", filename: "WinampModern566.wal", download_url: "https://r2.webampskins.org/skins/b3fa3160814d1689a3f2bacda72b2926.wal", screenshot_url: null, modern: true, local: "winampmodern566.wal" },
    { md5: "2f245e741b6bd4e1a122a28489f0c7b7", filename: "base-2.91.wsz", download_url: "https://r2.webampskins.org/skins/2f245e741b6bd4e1a122a28489f0c7b7.wsz", screenshot_url: "https://r2.webampskins.org/screenshots/2f245e741b6bd4e1a122a28489f0c7b7.png", modern: false, local: "base-2.91.wsz" },
    { md5: "8a2cfd657fa97b1a511b372f5249d63a", filename: "3DNow_skin.zip", download_url: "https://r2.webampskins.org/skins/8a2cfd657fa97b1a511b372f5249d63a.wsz", screenshot_url: "https://r2.webampskins.org/screenshots/8a2cfd657fa97b1a511b372f5249d63a.png", modern: false },
    { md5: "9355a7476613879cfd6cd7f711494108", filename: "109babe[1].wsz", download_url: "https://r2.webampskins.org/skins/9355a7476613879cfd6cd7f711494108.wsz", screenshot_url: "https://r2.webampskins.org/screenshots/9355a7476613879cfd6cd7f711494108.png", modern: false },
    { md5: "aa0b1aae867bc4bac437b60c9d78c200", filename: "0psis01[1].wsz", download_url: "https://r2.webampskins.org/skins/aa0b1aae867bc4bac437b60c9d78c200.wsz", screenshot_url: "https://r2.webampskins.org/screenshots/aa0b1aae867bc4bac437b60c9d78c200.png", modern: false },
    { md5: "c2273648295a986350f0e2007b705e85", filename: "12.wal", download_url: "https://r2.webampskins.org/skins/c2273648295a986350f0e2007b705e85.wal", screenshot_url: "https://zip-worker.jordan1320.workers.dev/zip/c2273648295a986350f0e2007b705e85.wal/skinshot.png", modern: true },
    { md5: "608740c643b6a197bdbcb90cf0df7b4d", filename: "cPro__Aperture.wal", download_url: "https://r2.webampskins.org/skins/608740c643b6a197bdbcb90cf0df7b4d.wal", screenshot_url: null, modern: true },
    { md5: "6c52e7420e4de11b76333d573395a111", filename: "Pro_Stak_1A.wal", download_url: "https://r2.webampskins.org/skins/6c52e7420e4de11b76333d573395a111.wal", screenshot_url: "https://zip-worker.jordan1320.workers.dev/zip/6c52e7420e4de11b76333d573395a111.wal/screenshot.png", modern: true }
  ];

  function loadCachedList(storage) {
    var st = getStorage(storage);
    if (!st) return null;
    try {
      var raw = st.getItem(CACHE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.skins)) return null;
      if (Date.now() - (parsed.savedAt || 0) > CACHE_TTL_MS) return null; /* hết hạn 24h */
      return parsed.skins.map(normalizeSkin).filter(function (s) { return !!s; });
    } catch (e) { return null; }
  }
  function saveCachedList(skins, storage) {
    var st = getStorage(storage);
    if (!st) return false;
    try {
      st.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), skins: skins }));
      return true;
    } catch (e) { return false; }
  }

  /* Nạp danh sách để hiển thị: mạng trước (Modern + Classic song song),
     lỗi thì cache 24h, hết cache thì danh sách mẫu nhúng sẵn.
     Trả { skins, source: "network"|"cache"|"fallback" }. */
  async function loadSkinList(opts) {
    opts = opts || {};
    var fetchImpl = opts.fetchImpl;
    var storage = opts.storage;
    var first = opts.first || LIST_FIRST;
    try {
      var results = await Promise.all([
        fetchModernSkins(first, 0, fetchImpl),
        fetchClassicSkins(first, 0, fetchImpl)
      ]);
      var skins = results[0].concat(results[1]);
      if (!skins.length) throw new Error("skin-browser: kho tra ve danh sach rong");
      saveCachedList(skins, storage);
      return { skins: skins, source: "network" };
    } catch (e) {
      var cached = loadCachedList(storage);
      if (cached && cached.length) return { skins: cached, source: "cache" };
      return { skins: FALLBACK_SKINS.slice(), source: "fallback" };
    }
  }

  /* Tìm theo tên (filename) trên danh sách đã có — không gọi mạng,
     dùng cho ô tìm kiếm + lọc Modern từ kết quả search Classic. */
  function filterSkins(skins, query) {
    var q = String(query == null ? "" : query).trim().toLowerCase();
    if (!q) return (skins || []).slice();
    return (skins || []).filter(function (s) {
      return (s.filename || "").toLowerCase().indexOf(q) >= 0;
    });
  }
  function filterByKind(skins, kind) {
    if (kind === "modern") return (skins || []).filter(function (s) { return !!s.modern; });
    if (kind === "classic") return (skins || []).filter(function (s) { return !s.modern; });
    return (skins || []).slice();
  }

  /* ---- UI: cửa sổ chọn skin (#skin-panel, HTML tĩnh trong index.html) ----
     wireSkinPanel(doc, opts) gắn sự kiện 1 lần, trả controller:
       { open(), close(), isOpen(), renderList(), getState() }
     opts: { fetchImpl, storage,
             onSelectSkin(skin) -> Promise (bên gọi tải + bootSkin; resolve thì đóng panel, reject thì báo lỗi trong panel),
             onPickFile() (mở hộp chọn file tay), onError(msg) (báo banner đỏ) }
     Mở panel lần đầu thì nạp danh sách (mạng → cache → mẫu); lần sau
     dùng lại danh sách đã nạp. Tìm kiếm: lọc cục bộ + gọi search_skins
     của kho (chỉ Classic) rồi gộp Modern lọc cục bộ vào.
     Chịu được document giả (harness stub): phần tử nào thiếu thì bỏ
     qua phần đó, không throw lúc gắn. */
  function wireSkinPanel(doc, opts) {
    opts = opts || {};
    var panel = doc.querySelector ? doc.querySelector("#skin-panel") : null;
    if (!panel) return null;
    function q(sel) { try { return panel.querySelector(sel); } catch (e) { return null; } }
    var listEl = q("#sb-list"), statusEl = q("#sb-status"), searchEl = q("#sb-search"),
        closeBtn = q("#sb-close"), fileBtn = q("#sb-file");
    var kindBtns = [];
    try { kindBtns = panel.querySelectorAll("[data-kind]") || []; } catch (e) { kindBtns = []; }
    kindBtns = Array.prototype.slice.call(kindBtns);

    var state = { loaded: false, loading: false, skins: [], kind: "all", query: "", source: "" };
    var searchTimer = 0;

    function setStatus(text) { if (statusEl) statusEl.textContent = text || ""; }
    function showSourceNote() {
      if (state.source === "fallback") setStatus("Không tới được kho skin — đang hiện danh sách mẫu (" + state.skins.length + " skin). Bấm “Chọn file tay…” để nạp file trên máy.");
      else if (state.source === "cache") setStatus("Không tới được kho skin — đang hiện danh sách đã lưu (" + state.skins.length + " skin).");
      else if (state.source === "network") setStatus(state.skins.length + " skin từ kho Webamp — bấm 1 skin để tải về và nạp.");
      else setStatus("");
    }
    function renderList(items) {
      if (!listEl) return;
      /* Xóa con cũ (innerHTML = "" đủ cho panel này — không có handler
         gắn trên con, handler gắn ở listEl bằng delegate). */
      try { listEl.innerHTML = ""; } catch (e) { /* bỏ qua */ }
      var shown = filterByKind(filterSkins(items || state.skins, state.query), state.kind);
      /* Giữ lại danh sách ĐANG HIỂN THỊ: kết quả search của kho có skin
         chưa nằm trong state.skins — bấm vào vẫn phải tìm được. */
      state.shown = shown;
      if (!shown.length) {
        var empty = doc.createElement("div");
        empty.className = "sb-empty";
        empty.textContent = state.query ? "Không tìm thấy skin nào tên “" + state.query + "”." : "Chưa có skin nào.";
        try { listEl.appendChild(empty); } catch (e) { /* bỏ qua */ }
        return;
      }
      shown.forEach(function (skin) {
        var item = doc.createElement("button");
        item.type = "button";
        item.className = "sb-item";
        try { item.setAttribute("data-md5", skin.md5); } catch (e) { /* bỏ qua */ }
        var thumb = doc.createElement("span");
        thumb.className = "sb-thumb";
        if (skin.screenshot_url) {
          var img = doc.createElement("img");
          img.src = skin.screenshot_url;
          img.alt = "";
          img.loading = "lazy";
          img.onerror = function () { try { img.style.display = "none"; thumb.textContent = "Không có ảnh"; } catch (e) { /* bỏ qua */ } };
          try { thumb.appendChild(img); } catch (e) { /* bỏ qua */ }
        } else {
          thumb.textContent = "Không có ảnh";
        }
        var name = doc.createElement("span");
        name.className = "sb-name";
        name.textContent = skin.filename;
        var kind = doc.createElement("span");
        kind.className = "sb-kind";
        kind.textContent = (skin.modern ? ".wal Modern" : ".wsz Classic") + (skin.local ? " · có sẵn" : "");
        try { item.appendChild(thumb); item.appendChild(name); item.appendChild(kind); } catch (e) { /* bỏ qua */ }
        /* Gắn md5 lên node để delegate ở listEl tìm lại skin. */
        item._skinMd5 = skin.md5;
        try { listEl.appendChild(item); } catch (e) { /* bỏ qua */ }
      });
    }
    function markKindButtons() {
      kindBtns.forEach(function (b) {
        try { if (b.classList) b.classList.toggle("on", b.getAttribute("data-kind") === state.kind); } catch (e) { /* bỏ qua */ }
      });
    }
    async function loadList() {
      if (state.loaded || state.loading) return;
      state.loading = true;
      setStatus("Đang tải danh sách skin từ kho Webamp…");
      try {
        var r = await loadSkinList({ fetchImpl: opts.fetchImpl, storage: opts.storage });
        state.skins = r.skins; state.source = r.source; state.loaded = true;
        showSourceNote();
        renderList();
      } catch (e) {
        state.skins = FALLBACK_SKINS.slice(); state.source = "fallback"; state.loaded = true;
        showSourceNote();
        renderList();
      } finally {
        state.loading = false;
      }
    }
    async function runSearch() {
      var query = state.query;
      if (!query) { renderList(); return; }
      /* Gộp: kết quả search Classic của kho + Modern lọc cục bộ. */
      var merged = filterSkins(state.skins, query);
      try {
        var found = await searchSkins(query, SEARCH_FIRST, opts.fetchImpl);
        found.forEach(function (s) {
          if (!merged.some(function (m) { return m.md5 === s.md5; })) merged.push(s);
        });
      } catch (e) { /* mạng lỗi khi tìm thì giữ kết quả lọc cục bộ */ }
      /* Tìm xong mà ô tìm đã đổi thì không vẽ đè kết quả mới. */
      if (state.query !== query) return;
      renderList(merged);
    }
    function open() {
      try { panel.hidden = false; } catch (e) { /* bỏ qua */ }
      loadList();
      if (searchEl && searchEl.focus) { try { searchEl.focus(); } catch (e) { /* bỏ qua */ } }
    }
    function close() { try { panel.hidden = true; } catch (e) { /* bỏ qua */ } }
    function isOpen() { return !panel.hidden; }

    if (closeBtn && closeBtn.addEventListener) closeBtn.addEventListener("click", close);
    if (fileBtn && fileBtn.addEventListener) fileBtn.addEventListener("click", function () {
      close();
      if (typeof opts.onPickFile === "function") opts.onPickFile();
    });
    if (searchEl && searchEl.addEventListener) searchEl.addEventListener("input", function () {
      state.query = searchEl.value || "";
      if (searchTimer) clearTimeout(searchTimer);
      /* Gõ thì lọc cục bộ ngay (không chờ mạng); sau 400ms mới gọi
         search của kho để gộp thêm Classic chưa có trong danh sách. */
      renderList();
      searchTimer = setTimeout(runSearch, 400);
    });
    kindBtns.forEach(function (b) {
      if (b.addEventListener) b.addEventListener("click", function () {
        state.kind = b.getAttribute("data-kind") || "all";
        markKindButtons();
        renderList();
      });
    });
    if (listEl && listEl.addEventListener) listEl.addEventListener("click", function (e) {
      var t = e.target && e.target.closest ? e.target.closest(".sb-item") : null;
      if (!t) return;
      var md5 = t._skinMd5 || (t.getAttribute ? t.getAttribute("data-md5") : null);
      var skin = null;
      (state.shown || state.skins).forEach(function (s) { if (s.md5 === md5) skin = s; });
      if (!skin) state.skins.forEach(function (s) { if (s.md5 === md5) skin = s; });
      if (!skin) return;
      setStatus("Đang tải " + skin.filename + "…");
      var done = null;
      try { done = opts.onSelectSkin ? opts.onSelectSkin(skin) : null; } catch (err) { done = null; }
      if (done && typeof done.then === "function") {
        done.then(function () { close(); }, function (err) {
          setStatus("Không tải được " + skin.filename + ": " + (err && err.message ? err.message : err));
          if (typeof opts.onError === "function") opts.onError("Không tải được skin " + skin.filename + ": " + (err && err.message ? err.message : err));
        });
      } else {
        close();
      }
    });

    markKindButtons();
    return {
      open: open, close: close, isOpen: isOpen,
      renderList: renderList, loadList: loadList,
      getState: function () { return state; },
      /* Cho test: đặt trực tiếp danh sách (không qua mạng). */
      setSkinsForTest: function (skins, source) {
        state.skins = skins; state.source = source || "network"; state.loaded = true;
        showSourceNote(); renderList();
      }
    };
  }

  return {
    BROWSER_VERSION: BROWSER_VERSION,
    EXPECTED_BROWSER_VERSION: EXPECTED_BROWSER_VERSION,
    MANIFEST_MISMATCH: MANIFEST_MISMATCH,
    GRAPHQL_URL: GRAPHQL_URL,
    CDN_URL: CDN_URL,
    CACHE_KEY: CACHE_KEY,
    CACHE_TTL_MS: CACHE_TTL_MS,
    LIST_FIRST: LIST_FIRST,
    SEARCH_FIRST: SEARCH_FIRST,
    FALLBACK_SKINS: FALLBACK_SKINS,
    getSkinUrl: getSkinUrl,
    getScreenshotUrl: getScreenshotUrl,
    kindOfSkin: kindOfSkin,
    normalizeSkin: normalizeSkin,
    graphqlQuery: graphqlQuery,
    fetchClassicSkins: fetchClassicSkins,
    fetchModernSkins: fetchModernSkins,
    searchSkins: searchSkins,
    fetchSkinByMd5: fetchSkinByMd5,
    fetchSkinFile: fetchSkinFile,
    loadCachedList: loadCachedList,
    saveCachedList: saveCachedList,
    loadSkinList: loadSkinList,
    filterSkins: filterSkins,
    filterByKind: filterByKind,
    wireSkinPanel: wireSkinPanel
  };
});
