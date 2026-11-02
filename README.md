# Amp v9 — Winamp Modern (đợt G: shade mode + sửa lằn đen menubar + tab ngăn kéo + trượt + zoom 1x/fit + màn hình chỉ hiện skin)

Bản phát hành duy nhất: **version 9.3** (đợt G bump từ 9.2: shade mode,
sửa lằn đen menubar, tab ngăn kéo ẩn khi đóng, ngăn kéo trượt, bỏ nút
zoom 2x/3x, màn hình chỉ hiện giao diện skin). Viết lại từ đầu theo đặc
tả skin-sim, không copy code v7.4/v8. Phát tiếng thật: nhạc + radio/TV,
tiếng video đi qua chuỗi EQ/AudioContext như nhạc; EQ tắt = bypass
tuyệt đối.

## Có gì trong gói

| File | Version | Nội dung |
|---|---|---|
| `index.html` | 9.3 (`window.AMP_VERSION`) | Vỏ trang + toolbar + kiểm version + self-check lúc chạy |
| `skin-loader.js` | LOADER_VERSION 9.3 | Mở `.wal`/`.zip`, đọc XML, gom model (bitmap/font/màu/groupdef/layout), suy `embeddedAvs`, `drawerRestY`, `snapadjustbottom` |
| `renderer.js` | RENDERER_VERSION 9.3 | Vẽ cửa sổ chính + shade + ngăn kéo + playlist + AVS/Video (nhúng + cửa sổ rời), EQ/Options/Color Themes, playlist `.m3u` |
| `audio.js` | AUDIO_VERSION 9.3 | Phát tiếng thật: native trước, HLS sau 6s/lỗi; chuỗi EQ (preamp + 10 biquad + master + analyser); MediaElementSource mỗi thẻ 1 lần |
| `winampmodern566.wal` | — | Skin Winamp Modern 566 (mặc định, tự nạp lúc mở trang) |
| `base-2.91.wsz` | — | Skin Classic mẫu (không có vùng AVS nhúng → chỉ dùng cửa sổ Video/Hiệu ứng rời) |
| `radio.m3u` | — | Playlist mặc định: 41 kênh radio/TV + 3 bài Demo (giữ tên + thứ tự gốc) |

Kiểm chứng đợt A–G: 7 bộ test jsdom trong `~/workspace/amp-v9-verify/` —
main-window 105 + drawer 241 + playlist 141 + avs 187 + audio 221 =
**895 PASS** (cũ, không hồi quy) + shade-test mới **172 PASS** + page-test
mới **70 PASS** = **1137 PASS, 0 FAIL**; `harness.js` LOAD OK; kiểm bằng
Chrome headless thật (CDP): **44 PASS, 0 FAIL** (skin-only, shade, ngăn
kéo trượt qua nút skin, Video qua menu View, menu ⋯, zoom, force-dark).

## Đợt G — Shade mode (mới)

- **Nút thu gọn (winshade)** trên cửa sổ chính (góc trên phải, x=325,y=4)
  bấm → chuyển sang **shade: thanh transport 354×25** (đúng XML
  `layout main|shade` + group `shademain`); bấm nút winshade trên shade
  (hoặc bấm đúp nền shade) → về normal. Lưu `localStorage amp9-shade-v9`
  nên tải lại trang giữ nguyên chế độ.
- **Số đo thật — CHỌN THEO XML, không theo ảnh tham chiếu:** layout shade
  trong skin là **354×25**; ảnh người dùng gửi (`1793658683888_1_t3xg.png`,
  354×164) KHÔNG phải shade của skin 566 mà là Winamp 5.7 (ticker
  "WINAMP 5.7 BUILD 3367 BETA", menu tiếng Thổ, có nút VİDEO) — làm shade
  cao 164px thì cao hơn cả cửa sổ chính 143px, không còn là "thu gọn".
  Shade vẽ gọn khít đúng 354×25, không padding/margin thừa.
- Shade có đủ 13 nút đúng vị trí XML: sysmenu (6,4), prev (29,6), play
  (49,4), pause (71,4), stop (93,4), next (116,6), mute (148,8), eject
  (229,10), PL (249,10), ML (267,10), minimize (313,4), winshade (325,4),
  close (337,4); volume slider (164,12,w=56). Các group
  shadedisplay/shadeticker/shadevis/shadetimer/shadeX1-4 mặc định
  `visible="0"` nên KHÔNG vẽ (đúng Winamp thật — shade mặc định chỉ có
  thanh transport, không đồng hồ/chữ chạy). Playlist rời vẫn mở được từ
  nút PL (shade 25 + playlist 164 = 189).
- Mute trên shade (nút mute, khóa `SHADE_MUTE`): tắt tiếng ở engine
  (setVolume 0) nhưng GIỮ NGUYÊN volume + volumebar; kéo volume lúc mute
  chỉ đổi volume đã lưu, bỏ mute thì tiếng về đúng mức đó.
- Sang shade thì ẩn ngăn kéo + vùng AVS nhúng (chỉ còn thanh bar); về
  normal thì AVS hiện lại như cũ (state AVS được giữ nguyên).

## Đợt G — Sửa lằn đen ở thanh menu (đã tìm đúng nguyên nhân)

- Triệu chứng (ảnh điện thoại thật 2/11): menubar File/Play/Options/View/
  Help nền TỐI (RGB ~107) chữ SÁNG, trong khi skin `menubar.png` SÁNG
  (RGB ~236) chữ ĐEN; composite PIL của v9 vẽ menubar SÁNG — tức MODEL
  ĐÚNG, lỗi ở khâu vẽ trên trình duyệt.
- **Nguyên nhân thật: Chrome trên điện thoại bật dark mode / force-dark
  ("Darken websites")** — Chrome tự đảo ngược ảnh sáng của trang không
  khai báo color-scheme. Đã tái hiện đúng bằng headless Chrome +
  `--force-dark-mode` (menubar về ~102, khớp ảnh điện thoại ~107).
- **Sửa:** thêm `<meta name="color-scheme" content="dark">` vào
  `index.html` (trang vốn đã tối, chỉ vẽ skin sáng) → Chrome coi trang
  đã tự hỗ trợ dark, KHÔNG force-dark nữa. Kiểm chứng bằng headless
  Chrome + force-dark: menubar sáng (209,210,214) y hệt bản thường,
  screenshot 2 chế độ giống hệt nhau.
- Đã loại trừ các đầu mối khác: không có sprite `menu:button_hover/
  pressed` nào trong DOM; `menubar.png` resolve đúng (hoa/thường);
  crop center 5px kéo 304px đúng (`background-size 12160px 17px`,
  `background-position -304px 0px`); preset Default không còn filter;
  renderer không vẽ nền groupdef.

## Đợt G — Ngăn kéo: tab không thò ra + trượt mượt

- **Tab thò ra (đã sửa):** khi đóng, tab EQUALIZER/OPTIONS/COLOR THEMES
  (ở drawer y=108, đáy 127) lọt 9px vào dải nghỉ 13px nên bị cắt ngang
  nửa chữ. Nay khi đóng thì KHÔNG vẽ tab (gỡ hẳn hộp `config.tabs` khỏi
  DOM) → dải nghỉ chỉ còn vỏ ngăn kéo + nút mở. Khi mở, tab vẫn ở đáy
  ngăn kéo đúng XML (đáy 257, cách đáy ngăn kéo 2px).
- **Trượt mượt (mới):** mở trượt xuống, đóng trượt lên bằng CSS
  transition trên `transform` (GPU), 250ms. Vị trí CUỐI luôn do
  renderLayout đặt thẳng bằng `top` (không rAF hai bước kiểu v8) nên
  bấm liên tục không kẹt giữa chừng: lần trượt sau hủy timer lần trước,
  nội suy từ vị trí hiện tại, có timeout ép về vị trí cuối + token chống
  render cũ đáp xuống sau. Đã kiểm bằng test bấm liên tục (mở-đóng-mở,
  đóng-mở-đóng, 6 lần xen kẽ): vị trí cuối luôn đúng (mở 130/259,
  đóng 27/156), transform dọn sạch.

## Đợt G — Zoom chỉ còn 1x + Vừa màn hình

- Chỉ còn 2 chế độ zoom: **Cỡ gốc 1x** và **Vừa màn hình** (fit).
  **Nút 2x/3x đã bỏ** (người dùng chốt 3/11: web chỉ cần 1x + fit);
  toàn bộ thanh công cụ cũng đã bỏ (xem mục màn hình chỉ hiện skin
  dưới đây) nên 2 chế độ zoom nằm trong **menu ⋯ góc dưới-phải**
  (không còn nút zoom riêng trên màn hình). Zoom không lưu
  localStorage nên không có giá trị cũ nào cần migrate — mọi mode
  khác `"fit"` đều về 1x.
- Fit giữ như cũ: chỉ phóng to, không thu nhỏ dưới 1x, tối đa 2.5x.
  Zoom giữ mượt (`image-rendering:auto`, KHÔNG pixelated).
- Lưu ý: nút 1x/2x trên **cửa sổ Video** (`videoScale`, đổi scale video)
  là tính năng khác, vẫn giữ nguyên — không liên quan zoom toolbar.

## Đợt G — Màn hình chỉ hiện giao diện (skin)

- **Đã bỏ hết chrome HTML quanh skin:** tiêu đề "Amp v9 — Winamp
  Modern…", đoạn mô tả nền tảng/đợt E, dòng version thường trực, toàn bộ
  hàng nút HTML (zoom 1x/2x/3x/fit, Xếp chồng, Mở ngăn kéo, Video, Hiệu
  ứng, Thêm nhạc local, Nạp skin), chữ hướng dẫn/kéo-thả, khung báo cáo
  `#report`. Mở trang lên chỉ thấy các cửa sổ skin (chính, ngăn kéo,
  playlist, AVS/Video) như Winamp thật; stage nằm sát đầu trang.
- **Chức năng vẫn dùng được qua chính skin** (không phụ thuộc nút HTML
  đã bỏ): nút PL mở playlist; nút mở/đóng ngăn kéo nằm trong dải 13px
  dưới main; menu View (File/Play/Options/View/Help) có Playlist Editor,
  Ngăn kéo (Drawer), Video, Hiệu ứng (Vis); nút winshade thu gọn/mở;
  nút Eject mở chọn nhạc local; nhấp đúp kênh để phát; Space =
  Play/Pause; kéo-thả file .wal/.zip vào trang vẫn giữ.
- **Điểm chạm tối thiểu duy nhất ngoài skin: nút ⋯** (36×36, mờ, góc
  dưới-phải trang) mở menu nhỏ 4 mục: "Nạp skin .wal/.zip…", "Thêm nhạc
  local…", "Zoom: Cỡ gốc 1x", "Zoom: Vừa màn hình" (dấu ✓ ở chế độ đang
  chọn; bấm ra ngoài thì menu đóng). Đây là những thứ skin không làm
  được (chọn file, đổi zoom trang) — không đưa vào menu skin để khỏi
  xáo trộn renderer, và vẫn bấm được ở cả chế độ shade (menu View của
  skin không có ở shade).
- **Version/check chống mix giữ nguyên cơ chế, nhưng im lặng khi đúng:**
  không còn dòng version thường trực trên màn hình — version chỉ ghi
  vào console (`[Amp] Amp v9 · loader v9.3 · audio v9.3 · renderer v9.3
  · model fromCache: false · skin: …`) và tiêu đề tab trình duyệt
  ("Amp v9.3 — Winamp Modern"). Chỉ khi lệch version mới hiện **banner
  đỏ** `#status` ("BẢN MIX — version lệch, dừng lại: …") và dừng boot.
  Banner lỗi `#status` và banner self-check `#drawer-check` đều ẩn mặc
  định, chỉ hiện khi có lỗi.

## Cách up lên host — ĐỌC KỸ, đây là bài học đắt nhất của v8

**Up ĐÈ TOÀN BỘ file trong thư mục này lên CÙNG MỘT thư mục trên host.
Không up lẻ từng file, không đổi tên file.**

Vì sao: v8 đã sửa đủ 3 lỗi ngăn kéo trong code, nhưng điện thoại test vẫn
chạy bản mix v7.4 (loader cũ + model cache `|7.4` + `eq.js` cũ vẽ fill
xanh) chỉ vì up tay từng file và sót 1 file. `?v=` trên URL script chỉ
chống cache trình duyệt, không cứu được file cũ còn nằm trên host.

## Cách kiểm version (không hiện trên màn hình)

Màn hình chỉ hiện giao diện skin — version KHÔNG có dòng chữ thường
trực. Kiểm bằng 1 trong 2 cách:

- **Console trình duyệt** (F12 → Console): dòng
  ```
  [Amp] Amp v9 · loader v9.3 · audio v9.3 · renderer v9.3 · model fromCache: false · skin: Winamp Modern
  ```
- **Tiêu đề tab trình duyệt:** "Amp v9.3 — Winamp Modern".

- Cả 3 số phải là **9.3** và `fromCache: false`. Lệch 1 số → trang DỪNG và
  hiện **banner đỏ** ("BẢN MIX — version lệch, dừng lại: …") ngay dưới
  cửa sổ skin (không vẽ giao diện sai trong im lặng). Chụp màn hình
  banner này (hoặc dòng console) là biết đang chạy bản nào.
- Nguồn sự thật duy nhất: `window.AMP_VERSION = "9.3"` đặt trong
  `index.html` trước 3 thẻ script. Mỗi file JS tự đối chiếu với manifest
  lúc nạp (`MANIFEST_MISMATCH`); file cũ trên host/cache tự tố mình dù
  trang đã mới. `skin-loader.js` kiểm `EXPECTED_LOADER_VERSION` ngay khi
  nạp, trước mọi đọc cache.
- Khóa cache model (định nghĩa sẵn trong `skinCacheKey`, để dùng khi nào
  thêm cache): `tên.wal|loader9.3|render9.3` — chứa cả version loader VÀ
  version code vẽ. **v9 chưa cache model vào IndexedDB** (mỗi lần nạp đều
  đọc mới từ file `.wal`) nên không có rủi ro model cũ.

## Self-check lúc chạy (banner đỏ `#drawer-check`, chung 1 banner)

Sau mỗi lần vẽ/mở/khi phát/dừng, trang tự kiểm và hiện cảnh báo đỏ nếu sai:

- **Ngăn kéo:** đỉnh ngăn kéo chìm đúng 13px dưới đáy main
  (`restY + drawerInnerY(true) === mainH − 13`); tab nằm trong 4px cuối
  ngăn kéo; 0 phần tử `.fill` trong panel EQ.
- **AVS/Video:** vùng nhúng 354×116 tại (0,35), `video.group` 346×69 tại
  (4,56), main lùi 116 (17+116=133); cửa sổ rời 354×200.
- **Tiếng:** EQ bật + đang phát + graph đã dựng mà thẻ đang phát chưa có
  MediaElementSource → báo "tiếng đang bypass, không qua EQ".
  (Bảo đảm "mỗi thẻ 1 lần" nằm ở `ensureSource` trong `audio.js`: cờ +
  so khớp element, không tạo lại.)

## Cách test nhanh trên điện thoại (theo thứ tự ưu tiên)

1. **Version:** mở trang, màn hình chỉ thấy skin (không tiêu đề/nút/
   chữ hướng dẫn); kiểm console phải là `loader v9.3 · audio v9.3 ·
   renderer v9.3 · model fromCache: false`; không có banner đỏ.
2. **Cửa sổ chính:** 354×143, đồng hồ 0:02, chữ chạy tên bài, nút/thanh
   trượt đúng vị trí như Winamp gốc. **Menubar phải SÁNG chữ ĐEN**
   (đã sửa force-dark — nếu điện thoại bật dark mode mà menubar vẫn tối
   thì báo lại, kèm ảnh).
3. **Shade:** bấm nút thu gọn góc trên phải cửa sổ chính → chỉ còn thanh
   bar **354×25** (13 nút + volume, gọn khít, không ngăn kéo/AVS);
   bấm nút winshade trên shade hoặc bấm đúp nền → về normal; tải lại
   trang vẫn giữ chế độ đã chọn.
4. **Ngăn kéo:** bấm nút mở ngăn kéo **trong skin** (dải 13px dưới main)
   hoặc menu View → "Ngăn kéo (Drawer)" — ngăn kéo **trượt mượt
   xuống** DƯỚI main, chìm 13px (không có dải đen giữa main và ngăn
   kéo); tab EQUALIZER/OPTIONS/COLOR THEMES ở ĐÁY ngăn kéo, không bị
   cắt; **khi đóng, dải 13px phải SẠCH (không còn chữ tab nào thò ra bị
   cắt)**; panel EQ (17,15) 318×89, slider EQ chỉ có track + thumb,
   KHÔNG có vệt xanh lá. Bấm mở/đóng liên tục cũng không kẹt giữa chừng.
5. **Menu ⋯ (góc dưới-phải):** bấm ⋯ → menu nhỏ 4 mục (Nạp skin,
   Thêm nhạc local, Zoom 1x, Zoom fit); chọn Zoom fit thì phóng to
   mượt, chọn 1x thì về cỡ gốc; bấm ra ngoài thì menu đóng. Toolbar
   cũ đã bỏ — không còn nút 2x/3x.
6. **EQ:** kéo slider EQ, bấm EQ ON/OFF + LED, AUTO, PRESETS, Balance,
   Crossfade; đổi tab Options/Color Themes (44 preset đổi màu theo từng
   nhóm, không đổi chung toàn stage).
7. **Playlist:** bấm nút PL (hoặc menu View / "Xếp chồng") — playlist
   436×164 xếp dưới main (ngăn kéo đóng: tổng cao 320; mở: 423); 41 kênh
   radio.m3u + 3 bài Demo; click 1 lần = chọn, **nhấp đúp mới phát**; ô
   tìm trong khung list; hàng nút Add/Rem/Sel/Misc/List mở menu.
8. **AVS/Video:** menu View → "Video"/"Hiệu ứng (Vis)" — vùng nhúng mở,
   main lùi 116 (cao 143→259, cộng dải ngăn kéo 13px thành 272); Detach
   tách thành cửa sổ rời 354×200, Reattach đưa về; **đóng AVS không
   dừng tiếng** (ẩn hình, tiếng vẫn phát); VID_1X/VID_2X đổi scale,
   fullscreen, VIS Prev/Next đổi kiểu hiệu ứng.
9. **Radio:** nhấp đúp kênh radio trong playlist → phát tiếng; Space =
   Play/Pause.
10. **TV360 + EQ:** kênh TV360 qua vmttv (vd VTV3) chỉ xem được khi **EQ
    TẮT** (EQ bật đặt crossOrigin=anonymous, server không có CORS nên
    không nạp được — như Webamp fork). Tắt EQ lại thì xem được ngay.
11. **EQ on/off đổi tiếng video:** đang xem video, bật EQ → tiếng phải
    đổi (đi qua chuỗi EQ); tắt EQ → tiếng về bypass (to, trực tiếp ra loa).
    Đây là lý do hủy Amp 2/11 — kiểm kỹ nhất.
12. **Bài Demo không file:** nhấp đúp 1 trong 3 bài Demo → báo trạng thái
    đỏ trên dòng chữ chạy ("bai demo chua co file nhac"), không treo/không
    tự nhảy bài khác.

## Hành vi đã khóa (không đổi)

- Ngăn kéo đóng lộ 13px; player cao 156 khi đóng, 259 khi mở; xếp chồng
  đóng 156+164=320, mở 259+164=423.
- Ngăn kéo mở/đóng **trượt mượt 250ms** bằng CSS transition trên
  `transform`; vị trí cuối do renderLayout đặt thẳng bằng `top` (không
  rAF hai bước như v8 — kiểu đó kẹt ở vị trí đóng khi frame rAF không
  chạy). Bấm liên tục vẫn về đúng vị trí cuối.
- **Shade:** 354×25 đúng XML (không phải 164 của ảnh Winamp 5.7); nút
  winshade / bấm đúp nền để chuyển; lưu `localStorage amp9-shade-v9`.
- **Màn hình chỉ hiện skin:** không tiêu đề/dòng version/hàng nút/chữ
  hướng dẫn; chỉ 1 nút ⋯ góc dưới-phải (nạp skin / thêm nhạc / zoom
  1x+fit); banner đỏ chỉ hiện khi lỗi (version lệch, không nạp được
  skin, self-check); version xem ở console + tiêu đề tab.
- Đóng AVS không dừng tiếng. EQ tắt = bypass tuyệt đối (source → loa
  thẳng, vis đứng yên). Nhấp đúp mới phát. Kênh lỗi: thử lại 1 lần sau 3s
  chống báo oan, lỗi lần 2 mới báo đỏ và ở yên kênh (không tự nhảy kênh
  dưới); Stop tua về 0 chỉ khi 0 nằm trong vùng seek được (đài live
  không tua).
- Skin Classic (`.wsz`, không có `embeddedAvs`): chỉ dùng cửa sổ
  Video/Hiệu ứng rời; cửa sổ chính Classic chưa vẽ được ở v9.
- Giữ nguyên tên file khi giao (up đè host là dùng được ngay).

## Giới hạn đã biết

- **Composite PIL lệch sáng ~52** là lệch đo sáng khi đối chiếu ảnh, không
  phải lỗi hình học — hình học đã khớp (main 143, ngăn kéo chìm 13px,
  tabs (24,108), AVS (0,35) 354×116).
- **jsdom stub không chứng minh tiếng thật:** test chỉ kiểm logic (graph,
  routing, CORS, HLS fallback) bằng AudioContext/HLS giả; EQ on/off đổi
  tiếng thật trên video và TV360 qua vmttv (EQ tắt) CHỈ kiểm được trên
  điện thoại thật (mục 10–11 ở trên).
- **`gray`/`boost` trong gamma XML chưa áp:** tab Color Themes chỉ áp
  `value` theo công thức tỉ lệ `1+v/4096` kẹp [0.4, 1.6] từng gammagroup
  (filter SVG feColorMatrix riêng); `gray`/`boost` chỉ ghi nhận, chưa có
  công thức chốt nên không bịa.
- **Menu `VID_Misc`/`Vis_Menu` và `VID_MAX`/`Restore` là no-op:** bấm
  không làm gì (ghi rõ trong code để đợt sau không tưởng đã có).
- **Trình duyệt không nhớ file nhạc local:** mỗi lần chọn lại thư mục
  (nút "Thêm nhạc local…" / Eject).
- Skin Classic: cửa sổ chính chưa vẽ được (chỉ cửa sổ Video/Hiệu ứng
  rời + phát tiếng qua chuỗi EQ).

## Đổi version (cho đợt sau)

Đổi ở 5 chỗ, cùng 1 số (vd 9.3 → 9.4), không sót chỗ nào:

1. `index.html`: `window.AMP_VERSION` + `var VERSION` + `?v=` trên 3 thẻ
   script.
2. `skin-loader.js`: `LOADER_VERSION` + `EXPECTED_LOADER_VERSION`.
3. `renderer.js`: `RENDERER_VERSION` + `EXPECTED_RENDERER_VERSION`.
4. `audio.js`: `AUDIO_VERSION` (+ `EXPECTED_AUDIO_VERSION`).
5. Chạy lại `harness.js` + cả 7 test trong `~/workspace/amp-v9-verify/`
   (phải giữ 1137 PASS, 0 FAIL) rồi đóng zip lại.
