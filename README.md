# Amp v9 — Winamp Modern (đợt L: TV360 qua vmttv hiện hình + lưới an toàn videoWidth + nhập URL .m3u nạp cả danh sách + thời lượng file local góc phải + "Xóa hết" vẫn chọn được)

Bản phát hành duy nhất: **version 9.8** (đợt L bump từ 9.7: TV360 qua vmttv nghe tiếng không thấy hình — isVideoItem nhận diện nguồn TV qua host vmttv.dpdns.org + đường dẫn /tv360/ /VTVGo/ + group chứa "TV"/"Truyền hình" (chỉ xét group, không xét tên bài); lưới an toàn runtime: loadedmetadata mà videoWidth > 0 thì AVS về mode video, videoWidth == 0 thì về vis khỏi màn hình đen; đổi kênh xóa khung hình cũ ngay (video.removeAttribute('src') + load() trước khi gán src mới; video→audio thì xóa hẳn src); kênh video lỗi hẳn thì onAudioError xóa nhãn WxH cũ + về vis; nhập URL .m3u trong form "Thêm URL…" thì fetch về tách kênh bằng parseM3U (link tương đối đổi tuyệt đối theo URL gốc), URL .m3u8/mp3 vẫn thêm 1 mục đơn như cũ; file nhạc local hiện thời lượng thật (m:ss) ở góc phải hàng playlist, chỉ đài live mới hiện "Trực tiếp" (đọc metadata bằng thẻ audio tạm preload="metadata", không phát thử; lúc phát thì lấy duration từ engine); Manage Playlist → "Xóa hết": sửa lỗi closer menu còn armed ăn mất lần mở menu kế tiếp (không nạp lại được kênh) + selected/current về -1 khi danh sách rỗng. Đợt K bump từ 9.6: chỉ báo kênh stereo/mono sáng khi phát; số KBPS/KHZ vẽ nguyên bản không đảo alpha — chữ tối trên viên trắng, hết vệt gạch dưới chân; vis vẽ lại vạch mẫu khi analyser im + cột trắng theo XML; VIDEO/VIS KHÔNG thêm — XML 566 không có chữ đó; sửa self-check AVS 17→35. Đợt J bump từ 9.5: bỏ banner
self-check khỏi màn hình (chỉ ghi console); bỏ hết 3 bài Demo, playlist
chỉ còn 41 kênh radio.m3u, đồng hồ bắt đầu 0:00, ticker hiện tên kênh;
sửa lệch phải (body padding 0, fit thu nhỏ được, mặc định fit, margin 0
khi stage scale gần lấp đầy wrap) và lằn ngang ở đáy ngăn kéo lúc trượt
xuống (thanh cuộn ngang của #stage-wrap — đã ẩn, vẫn vuốt ngang được);
bỏ khoản nền tối bên dưới ngăn kéo lúc trượt ra/vào (nền stage #000 lộ
ra vì stage đã cao 280px nhưng ngăn kéo chưa trượt xuống hết — nay chiều
cao stage/wrap chạy đồng bộ 250ms với trượt, đáy stage bám đáy ngăn kéo;
shadow 15px cuối ngăn kéo là của skin nên GIỮ NGUYÊN). Viết lại từ đầu theo đặc
tả skin-sim, không copy code v7.4/v8. Phát tiếng thật: nhạc + radio/TV,
tiếng video đi qua chuỗi EQ/AudioContext như nhạc; EQ tắt = bypass
tuyệt đối.

## Có gì trong gói

| File | Version | Nội dung |
|---|---|---|
| `index.html` | 9.8 (`window.AMP_VERSION`) | Vỏ trang + toolbar + kiểm version + self-check lúc chạy |
| `skin-loader.js` | LOADER_VERSION 9.8 | Mở `.wal`/`.zip`, đọc XML, gom model (bitmap/font/màu/groupdef/layout), suy `embeddedAvs`, `drawerRestY`, `snapadjustbottom` |
| `renderer.js` | RENDERER_VERSION 9.8 | Vẽ cửa sổ chính + shade + ngăn kéo + playlist + AVS/Video (nhúng + cửa sổ rời), EQ/Options/Color Themes, playlist `.m3u` |
| `audio.js` | AUDIO_VERSION 9.8 | Phát tiếng thật: native trước, HLS sau 6s/lỗi; chuỗi EQ (preamp + 10 biquad + master + analyser); MediaElementSource mỗi thẻ 1 lần |
| `winampmodern566.wal` | — | Skin Winamp Modern 566 (mặc định, tự nạp lúc mở trang) |
| `base-2.91.wsz` | — | Skin Classic mẫu (không có vùng AVS nhúng → chỉ dùng cửa sổ Video/Hiệu ứng rời) |
| `radio.m3u` | — | Playlist mặc định: 41 kênh radio/TV (không còn bài Demo) (giữ tên + thứ tự gốc) |

Kiểm chứng đợt A–G: 7 bộ test jsdom trong `~/workspace/amp-v9-verify/` —
main-window 191 + drawer 266 + playlist 204 + avs 215 + audio 263 +
shade 176 + page 80 = **1395 PASS, 0 FAIL** (đợt L: playlist 158→204,
avs 209→215, audio 250→263); `harness.js` LOAD OK; kiểm bằng
Chrome headless thật (CDP): Nghệ An hiện hình 1920x1080 (đo pixel vùng
video: 71,4% đen, 9371 màu riêng); TV360 id=2/id=4 qua vmttv đã xếp đúng
video + thử hls.js nhưng **không đo được hình trong môi trường headless**
(xem ghi chú TV360 ở checklist item 15 — cần test trên điện thoại thật).

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
  vào console (`[Amp] Amp v9 · loader v9.8 · audio v9.8 · renderer v9.8
  · model fromCache: false · skin: …`) và tiêu đề tab trình duyệt
  ("Amp v9.8 — Winamp Modern"). Chỉ khi lệch version mới hiện **banner
  đỏ** `#status` ("BẢN MIX — version lệch, dừng lại: …") và dừng boot.
  Banner lỗi `#status` ẩn mặc định, chỉ hiện khi có lỗi (banner self-check
  `#drawer-check` đã bỏ ở 9.5 — self-check chỉ ghi console).

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
  [Amp] Amp v9 · loader v9.8 · audio v9.8 · renderer v9.8 · model fromCache: false · skin: Winamp Modern
  ```
- **Tiêu đề tab trình duyệt:** "Amp v9.8 — Winamp Modern".

- Cả 3 số phải là **9.8** và `fromCache: false`. Lệch 1 số → trang DỪNG và
  hiện **banner đỏ** ("BẢN MIX — version lệch, dừng lại: …") ngay dưới
  cửa sổ skin (không vẽ giao diện sai trong im lặng). Chụp màn hình
  banner này (hoặc dòng console) là biết đang chạy bản nào.
- Nguồn sự thật duy nhất: `window.AMP_VERSION = "9.8"` đặt trong
  `index.html` trước 3 thẻ script. Mỗi file JS tự đối chiếu với manifest
  lúc nạp (`MANIFEST_MISMATCH`); file cũ trên host/cache tự tố mình dù
  trang đã mới. `skin-loader.js` kiểm `EXPECTED_LOADER_VERSION` ngay khi
  nạp, trước mọi đọc cache.
- Khóa cache model (định nghĩa sẵn trong `skinCacheKey`, để dùng khi nào
  thêm cache): `tên.wal|loader9.5|render9.5` — chứa cả version loader VÀ
  version code vẽ. **v9 chưa cache model vào IndexedDB** (mỗi lần nạp đều
  đọc mới từ file `.wal`) nên không có rủi ro model cũ.

## Self-check lúc chạy (banner đỏ `#drawer-check`, chung 1 banner)

Sau mỗi lần vẽ/mở/khi phát/dừng, trang tự kiểm và hiện cảnh báo đỏ nếu sai:

- **Ngăn kéo:** đỉnh ngăn kéo mở = đỉnh main + snap (116), đóng = đỉnh
  main (`restY + drawerInnerY === mainTop` khi đóng, `mainTop + snap`
  khi mở); tab nằm trong 4px cuối ngăn kéo; 0 phần tử `.fill` trong
  panel EQ; ngăn kéo có `isolation: isolate` (shadow đè đều đáy).
- **AVS/Video:** vùng nhúng 354×116 tại (0,35), `video.group` 346×69 tại
  (4,56), main lùi 116 (35+116=151); cửa sổ rời 354×200; lớp
  `openclosehider` không vẽ (để nút videoavs ▼/▲ hiện).
- **Tiếng:** EQ bật + đang phát + graph đã dựng mà thẻ đang phát chưa có
  MediaElementSource → báo "tiếng đang bypass, không qua EQ".
  (Bảo đảm "mỗi thẻ 1 lần" nằm ở `ensureSource` trong `audio.js`: cờ +
  so khớp element, không tạo lại.)

## Cách test nhanh trên điện thoại (theo thứ tự ưu tiên)

1. **Version:** mở trang, màn hình chỉ thấy skin (không tiêu đề/nút/
   chữ hướng dẫn); kiểm console phải là `loader v9.8 · audio v9.8 ·
   renderer v9.8 · model fromCache: false`; không có banner đỏ.
2. **Cửa sổ chính:** 354×164 (đóng) / 280 (mở ngăn kéo), main y=35,
   display (5,38) 305×67 liền mạch không lằn đen, đồng hồ 0:00, chữ chạy
   tên kênh đang chọn, nút/thanh trượt đúng vị trí như Winamp gốc (khung display
   đáy y=101, rãnh seek y=114, nút prev y=141 — đo từ Winamp thật). **Menubar phải SÁNG chữ ĐEN**
   (đã sửa force-dark — nếu điện thoại bật dark mode mà menubar vẫn tối
   thì báo lại, kèm ảnh). **(9.6) Chữ "WINAMP" trên titlebar phải CĂN GIỮA
   cửa sổ (tâm 177), 2 dải bạc 2 bên cách chữ 8px; nút X góc trên-phải phải
   HIỆN (không bị cắt) — bấm X thì giao diện ẩn, hiện nút "Mở lại Amp" giữa
   màn hình, bấm nút đó thì giao diện hiện lại. Nút lặp (Repeat) trong display
   (bên trái vạch vis, dưới KHZ) phải THẤY: mặc định là vòng lặp mờ, bấm 1 lần
   → vòng lặp sáng, bấm nữa → vòng lặp sáng có số 1.**
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
   **Lúc trượt ra/vào, dưới ngăn kéo KHÔNG còn khoản nền tối** (chiều cao
   stage chạy đồng bộ với trượt; shadow 15px cuối ngăn kéo vẫn còn vì
   đó là của skin). **(9.6) Hàng tab EQUALIZER/OPTIONS/COLOR THEMES phải
   SÁNG như ảnh gốc (không bị tối/xám chìm, góc dưới-phải ngăn kéo cùng
   màu nền — shadow vẽ DƯỚI ngăn kéo, không đè lên tab nữa).**
5. **Menu ⋯ (góc dưới-phải):** bấm ⋯ → menu nhỏ 4 mục (Nạp skin,
   Thêm nhạc local, Zoom 1x, Zoom fit); chọn Zoom fit thì phóng to
   mượt, chọn 1x thì về cỡ gốc; bấm ra ngoài thì menu đóng. Toolbar
   cũ đã bỏ — không còn nút 2x/3x.
6. **EQ:** kéo slider EQ, bấm EQ ON/OFF + LED, AUTO, PRESETS, Balance,
   Crossfade; đổi tab Options/Color Themes (44 preset đổi màu theo từng
   nhóm, không đổi chung toàn stage). **(9.6) Menu PRESETS (bấm nút
   PRESETS) phải có NỀN SÁNG chữ đen (như menu Winamp thật), mở hướng
   LÊN trên khi không đủ chỗ dưới, hiện đủ cả 5 hàng (Flat, Bass Boost,
   Treble Boost, Loudness, Vocal) — không bị cắt, không chìm vào nền
   trang tối. Các menu/tooltip khác (playlist, Add URL, Help, menu ⋯)
   cũng nền sáng.**
7. **Playlist:** bấm nút PL (hoặc menu View / "Xếp chồng") — playlist
   436×164 xếp dưới main (ngăn kéo đóng: tổng cao 328; mở: 444); **41 kênh
   radio.m3u, KHÔNG còn bài Demo**; click 1 lần = chọn, **nhấp đúp mới phát**; ô
   tìm trong khung list; hàng nút Add/Rem/Sel/Misc/List mở menu. **(9.6) Dải
   trống bên phải cửa sổ chính (playlist rộng 436, main rộng 354) phải hiện
   NỀN CỦA SKIN (texture xanh nhạt, đổi màu theo Color Theme) thay vì mảng
   đen — dải vẫn còn về hình học (playlist vốn rộng hơn main), chỉ không
   còn đen nữa.**
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
12. **(9.5) Bài Demo đã bỏ:** playlist chỉ còn 41 kênh radio.m3u, không
    còn bài Demo nào (mục cũ "nhấp đúp bài Demo báo đỏ" không còn áp dụng).
13. **(9.7) Chỉ báo stereo/mono + số KBPS/KHZ + vis:** đang phát nhạc/radio
    stereo thì chữ **"CD STEREO" phải SÁNG** (viên trắng, chữ tối) ở dưới
    dòng KHZ; dừng phát thì chỗ đó tối lại (không chữ). Số **KBPS/KHZ phải
    là chữ tối trên viên trắng** (như ảnh WACUP), **không còn vệt gạch dưới
    chân số**. Vạch vis trong display phải THẤY (cột trắng) cả khi đang phát
    radio (EQ tắt hoặc đài không CORS) — không còn đen trống; khi EQ bật và
    phát nhạc local thì vạch theo nhạc thật (đổi theo tần số).
14. **(9.7) VIDEO/VIS KHÔNG có là ĐÚNG:** góc trên-phải cửa sổ chính (trong
    thanh menu, phải chữ Help) KHÔNG có chữ "VIDEO/VIS" — vì bitmap gốc
    của skin 566 (`player/menubar.png`, vùng textoverlay) trong suốt, không
    có chữ; ảnh WACUP có chữ là do WACUP/skin mod/phiên bản khác, không
    phải chuẩn XML 566 trong gói. Chữ CONFIG ở dưới-phải cửa sổ chính vẫn
    có như trước.
15. **(9.8) TV360 qua vmttv phải HIỆN HÌNH (EQ TẮT):** nhập URL
    `https://vmttv.dpdns.org/tv360/?id=2` (hoặc id=4 VTV3, mọi id khác)
    vào playlist rồi nhấp đúp — phải NGHE TIẾNG **và THẤY HÌNH** trong
    vùng video nhúng (AVS tự mở chế độ video, không còn đen trống).
    Trước 9.8 các kênh này chỉ nghe tiếng vì `isVideoItem` xếp nhầm
    thành audio (thẻ `<audio>` phát, thẻ `<video>` không được gán src).
    Kênh Nghệ An (`truyenhinhnghean.vn`, radio.m3u) vẫn hiện hình như
    trước — đối chiếu: nếu Nghệ An có hình mà TV360 không thì lỗi ở
    nguồn TV360, nếu cả hai cùng không hình thì lỗi chung phần hiển thị
    video. Nhập URL danh sách `.m3u` (menu Add → "Thêm URL…") phải nạp
    cả danh sách thành nhiều kênh (giữ tên + thứ tự + group-title, link
    tương đối đổi tuyệt đối theo URL gốc); nhập URL `.m3u8`/mp3 vẫn
    thêm 1 mục đơn như cũ. **Đổi kênh phải xóa khung cũ ngay:** đang xem
    Nghệ An chuyển sang TV360 thì ảnh Nghệ An biến mất tức thì (vùng
    video đen/trống trong lúc nạp), không dính ảnh tĩnh kênh trước; đổi
    sang kênh audio thì thẻ video bị xóa src hẳn. **File nhạc local:**
    playlist hiện thời lượng thật (vd 3:45) ở **góc phải** hàng, chỉ đài
    live mới hiện "Trực tiếp" ở góc phải (bỏ hậu tố "— Trực tiếp" dính
    sau tên bài). **Manage Playlist → "Xóa hết":** xong vẫn mở lại được
    menu để nạp lại kênh, vẫn bấm chọn/nhấp đúp được bình thường.
    **Kênh video lỗi hẳn:** về hiệu ứng (vis), nhãn WxH cũ bị xóa,
    báo đỏ "Khong phat duoc kenh …" trên dòng chữ chạy.
    **GHI CHÚ ĐO HEADLESS 3/11 (quan trọng):** trên điện thoại thật
    (native HLS) TV360 phải hiện hình sau sửa này — nhưng trong môi
    trường headless Linux (Chrome không có HLS native, phải qua hls.js)
    thì **chưa đo được hình TV360**: hls.js đã được thử (hlsActive=true)
    nhưng fetch tới `vmttv.dpdns.org` từ Chrome bị chặn ở tầng egress
    proxy của môi trường (Chrome fetch fail 5/5 + 3/3 trên Chrome mới,
    trong khi curl cùng URL được 200 và Chrome fetch thẳng master
    `rr1-ateme/pop12-ec2-ateme.tv360.vn` được 200) — đây là giới hạn
    của môi trường kiểm chứng, KHÔNG phải lỗi Amp (Nghệ An qua cùng
    hls.js vẫn hiện hình 1920x1080; ffprobe đo id=2/id=4 đều có video
    track h264 thật). Khi TV360 lỗi hẳn ở headless thì Amp về vis +
    xóa nhãn (đo pixel vùng AVS: 39,5% đen, màu xám của vạch vis —
    không còn màn đen). **Nhờ test trên điện thoại thật:** TV360 id=2
    và id=4 hiện hình khi EQ tắt + đổi kênh không dính ảnh cũ.

## Còn thiếu so với Winamp thật (để đợt sau — ưu tiên giao diện trước)

Khảo sát từ XML của skin 566 (62 action khác nhau, 71 id nút) đối chiếu
code hiện tại; chỉ liệt kê những gì đã xác nhận, không đoán:

- **Nút trong skin có mà chưa nối hành vi:** `VID_TV` (nút TV trong cửa
  sổ Video); `MINIMIZE` (thu nhỏ — web không có cửa sổ hệ thống nên chưa
  làm); `ML` (nút Media Library, action TOGGLE guid:ml — chưa có thư viện
  nhạc); `VID_MAX`/`Restore` (phóng to cửa sổ video rời — bấm không làm
  gì); `VID_Misc`/`Vis_Menu` (menu Video/Hiệu ứng — bấm không làm gì);
  `trackinfo`/`trackmenu` (bấm vào tên bài / menu bài hát — chưa làm);
  `WA5:Prefs` (cửa sổ Preferences của Winamp — chưa làm); các nút shade
  (`shadeeq`/`shademl`/`shadect`, `plshadeMLList`…); `about`,
  `nowplaying`, `beatvisualization`.
- **Menubar trong skin:** playlist đã có File/Playlist/Sort/Help; cửa sổ
  chính dùng nút ⋯ ngoài trang (nạp skin / thêm nhạc / zoom) thay cho
  menubar File/Play/Options/View/Help của Winamp — các mục con kiểu
  File → Play file/Play URL, Options → Preferences… chưa đủ.
- **Ngăn kéo Options:** các trang `optionsgroup.*` (drawers/menus/misc/
  notifications/songticker/visbutton/winshade) đã vẽ + chuyển trang được,
  nhưng phần lớn ô tick/chọn trong đó chỉ đổi `cfgState` (lưu trạng thái
  hiển thị) chứ chưa nối hành vi thật — ngoại lệ đã nối thật: Shuffle /
  Repeat / EQ (bật-tắt + LED), Color Themes (đổi theme), Crossfade +/-
  (mới chỉ đổi số giây hiển thị, chưa có crossfade thật khi chuyển bài).
- **Media Library:** chưa có — Winamp thật quản lý nhạc local theo
  Nghệ sĩ/Album; Amp chỉ có playlist + thêm file local, và trình duyệt
  không nhớ file local (đã chốt chọn lại thư mục mỗi lần).
- **Chức năng phát khác:** `PAN` (cân bằng trái/phải — slider có trong
  XML, chưa nối hành vi thật); chưa có CD rip/burn, playlist thông minh,
  tìm kiếm toàn thư viện (ngoài phạm vi web).

### Để sau (đã chốt, không làm khi người dùng chưa đổi ý)

- Hiệu ứng hình theo nhạc thật (vis hiện vẽ vạch mẫu sine khi analyser
  im; cần nối analyser thật của audio engine).
- Options nối hành vi thật (xem mục trên).
- KBPS/KHZ đo thật (hiện gán cứng 128/44 demo trong `renderer.js`).

## Hành vi đã khóa (không đổi)

- Ngăn kéo đóng lộ 13px; player cao 164 khi đóng, 280 khi mở; xếp chồng
  đóng 164+164=328, mở 280+164=444.
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
- **(9.7) Chỉ báo kênh:** dừng = `none` (trong suốt); đang phát stereo =
  "CD STEREO" sáng, mono = "MONO" sáng. Đo thật bằng ChannelSplitter khi
  có MediaElementSource (EQ bật + có CORS); chưa đo được (EQ tắt / đài
  không CORS) thì hiện "stereo" TẠM — nhạc/radio gần như luôn stereo, đo
  thật sẽ sửa lại thành "mono" nếu đúng mono. Đây là giới hạn của trình
  duyệt (không đọc được số kênh của thẻ đang phát nếu chưa có source),
  đã ghi rõ trong code, không phải lỗi.
- **(9.7) VIDEO/VIS:** không vẽ chữ "VIDEO/VIS" (XML 566 không có chữ đó —
  bitmap textoverlay trong suốt). Muốn có chữ thì phải đổi skin khác có
  bitmap chữ thật, hoặc quyết định thêm nhãn ngoài XML (chưa làm).
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

Đổi ở 5 chỗ, cùng 1 số (vd 9.5 → 9.6), không sót chỗ nào:

1. `index.html`: `window.AMP_VERSION` + `var VERSION` + `?v=` trên 3 thẻ
   script.
2. `skin-loader.js`: `LOADER_VERSION` + `EXPECTED_LOADER_VERSION`.
3. `renderer.js`: `RENDERER_VERSION` + `EXPECTED_RENDERER_VERSION`.
4. `audio.js`: `AUDIO_VERSION` (+ `EXPECTED_AUDIO_VERSION`).
5. Chạy lại `harness.js` + cả 7 test trong `~/workspace/amp-v9-verify/`
   (phải giữ 1395 PASS, 0 FAIL) rồi đóng zip lại.
