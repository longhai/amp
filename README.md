# Amp v9 — Winamp Modern (đợt F: dọn dẹp + đóng gói cuối)

Bản phát hành duy nhất: **version 9.2** (giữ từ đợt E, đợt F không đổi
loader nên không bump). Viết lại từ đầu theo đặc tả skin-sim, không copy
code v7.4/v8. Phát tiếng thật: nhạc + radio/TV, tiếng video đi qua chuỗi
EQ/AudioContext như nhạc; EQ tắt = bypass tuyệt đối.

## Có gì trong gói

| File | Version | Nội dung |
|---|---|---|
| `index.html` | 9.2 (`window.AMP_VERSION`) | Vỏ trang + toolbar + kiểm version + self-check lúc chạy |
| `skin-loader.js` | LOADER_VERSION 9.2 | Mở `.wal`/`.zip`, đọc XML, gom model (bitmap/font/màu/groupdef/layout), suy `embeddedAvs`, `drawerRestY`, `snapadjustbottom` |
| `renderer.js` | RENDERER_VERSION 9.2 | Vẽ cửa sổ chính + ngăn kéo + playlist + AVS/Video (nhúng + cửa sổ rời), EQ/Options/Color Themes, playlist `.m3u` |
| `audio.js` | AUDIO_VERSION 9.2 | Phát tiếng thật: native trước, HLS sau 6s/lỗi; chuỗi EQ (preamp + 10 biquad + master + analyser); MediaElementSource mỗi thẻ 1 lần |
| `winampmodern566.wal` | — | Skin Winamp Modern 566 (mặc định, tự nạp lúc mở trang) |
| `base-2.91.wsz` | — | Skin Classic mẫu (không có vùng AVS nhúng → chỉ dùng cửa sổ Video/Hiệu ứng rời) |
| `radio.m3u` | — | Playlist mặc định: 41 kênh radio/TV + 3 bài Demo (giữ tên + thứ tự gốc) |

Kiểm chứng đợt A–E (giữ nguyên ở đợt F): 5 bộ test trong
`~/workspace/amp-v9-verify/` — main-window 105 + drawer 241 + playlist 141
+ avs 187 + audio 221 = **895 PASS, 0 FAIL**; `harness.js` LOAD OK.

## Cách up lên host — ĐỌC KỸ, đây là bài học đắt nhất của v8

**Up ĐÈ TOÀN BỘ file trong thư mục này lên CÙNG MỘT thư mục trên host.
Không up lẻ từng file, không đổi tên file.**

Vì sao: v8 đã sửa đủ 3 lỗi ngăn kéo trong code, nhưng điện thoại test vẫn
chạy bản mix v7.4 (loader cũ + model cache `|7.4` + `eq.js` cũ vẽ fill
xanh) chỉ vì up tay từng file và sót 1 file. `?v=` trên URL script chỉ
chống cache trình duyệt, không cứu được file cũ còn nằm trên host.

## Cách kiểm version trên màn hình

Dòng ngay dưới tiêu đề trang hiện:

```
Amp v9 · loader v9.2 · audio v9.2 · renderer v9.2 · model fromCache: false · skin: Winamp Modern
```

- Cả 3 số phải là **9.2** và `fromCache: false`. Lệch 1 số → trang DỪNG và
  hiện dòng đỏ **"BẢN MIX — version lệch, dừng lại: …"** (không vẽ giao
  diện sai trong im lặng). Chụp màn hình dòng này là biết đang chạy bản nào.
- Nguồn sự thật duy nhất: `window.AMP_VERSION = "9.2"` đặt trong
  `index.html` trước 3 thẻ script. Mỗi file JS tự đối chiếu với manifest
  lúc nạp (`MANIFEST_MISMATCH`); file cũ trên host/cache tự tố mình dù
  trang đã mới. `skin-loader.js` kiểm `EXPECTED_LOADER_VERSION` ngay khi
  nạp, trước mọi đọc cache.
- Khóa cache model (định nghĩa sẵn trong `skinCacheKey`, để dùng khi nào
  thêm cache): `tên.wal|loader9.2|render9.2` — chứa cả version loader VÀ
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

1. **Version:** mở trang, dòng version phải là `loader v9.2 · audio v9.2 ·
   renderer v9.2 · model fromCache: false`; không có banner đỏ.
2. **Cửa sổ chính:** 354×143, đồng hồ 0:02, chữ chạy tên bài, nút/thanh
   trượt đúng vị trí như Winamp gốc.
3. **Ngăn kéo:** bấm "Mở ngăn kéo" — ngăn kéo trượt xuống DƯỚI main, chìm
   13px (không có dải đen giữa main và ngăn kéo); tab EQUALIZER/OPTIONS/
   COLOR THEMES ở ĐÁY ngăn kéo, không bị cắt; panel EQ (17,15) 318×89,
   slider EQ chỉ có track + thumb, KHÔNG có vệt xanh lá.
4. **EQ:** kéo slider EQ, bấm EQ ON/OFF + LED, AUTO, PRESETS, Balance,
   Crossfade; đổi tab Options/Color Themes (44 preset đổi màu theo từng
   nhóm, không đổi chung toàn stage).
5. **Playlist:** bấm nút PL (hoặc menu View / "Xếp chồng") — playlist
   436×164 xếp dưới main (ngăn kéo đóng: tổng cao 320; mở: 423); 41 kênh
   radio.m3u + 3 bài Demo; click 1 lần = chọn, **nhấp đúp mới phát**; ô
   tìm trong khung list; hàng nút Add/Rem/Sel/Misc/List mở menu.
6. **AVS/Video:** bấm "Video"/"Hiệu ứng (Vis)" — vùng nhúng mở, main lùi
   116 (cao 143→259); Detach tách thành cửa sổ rời 354×200, Reattach đưa
   về; **đóng AVS không dừng tiếng** (ẩn hình, tiếng vẫn phát); VID_1X/
   VID_2X đổi scale, fullscreen, VIS Prev/Next đổi kiểu hiệu ứng.
7. **Radio:** nhấp đúp kênh radio trong playlist → phát tiếng; Space =
   Play/Pause.
8. **TV360 + EQ:** kênh TV360 qua vmttv (vd VTV3) chỉ xem được khi **EQ
   TẮT** (EQ bật đặt crossOrigin=anonymous, server không có CORS nên
   không nạp được — như Webamp fork). Tắt EQ lại thì xem được ngay.
9. **EQ on/off đổi tiếng video:** đang xem video, bật EQ → tiếng phải
   đổi (đi qua chuỗi EQ); tắt EQ → tiếng về bypass (to, trực tiếp ra loa).
   Đây là lý do hủy Amp 2/11 — kiểm kỹ nhất.
10. **Bài Demo không file:** nhấp đúp 1 trong 3 bài Demo → báo trạng thái
    đỏ trên dòng chữ chạy ("bai demo chua co file nhac"), không treo/không
    tự nhảy bài khác.

## Hành vi đã khóa (không đổi)

- Ngăn kéo đóng lộ 13px; player cao 156 khi đóng, 259 khi mở; xếp chồng
  đóng 156+164=320, mở 259+164=423.
- Ngăn kéo mở **1 bước** (đặt thẳng vị trí cuối trong lúc vẽ, không rAF
  hai bước như v8 — kiểu đó kẹt ở vị trí đóng khi frame rAF không chạy).
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
- **Ngăn kéo không có animation trượt:** mở/đóng 1 bước, đặt thẳng vị trí
  cuối. Đây là giới hạn đã biết, cố ý giữ (tránh lỗi kẹt rAF của v8) —
  không thêm animation ở đợt F.
- **jsdom stub không chứng minh tiếng thật:** test chỉ kiểm logic (graph,
  routing, CORS, HLS fallback) bằng AudioContext/HLS giả; EQ on/off đổi
  tiếng thật trên video và TV360 qua vmttv (EQ tắt) CHỈ kiểm được trên
  điện thoại thật (mục 8–9 ở trên).
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

Đổi ở 5 chỗ, cùng 1 số (vd 9.2 → 9.3), không sót chỗ nào:

1. `index.html`: `window.AMP_VERSION` + `var VERSION` + `?v=` trên 3 thẻ
   script.
2. `skin-loader.js`: `LOADER_VERSION` + `EXPECTED_LOADER_VERSION`.
3. `renderer.js`: `RENDERER_VERSION` + `EXPECTED_RENDERER_VERSION`.
4. `audio.js`: `AUDIO_VERSION` (+ `EXPECTED_AUDIO_VERSION`).
5. Chạy lại `harness.js` + cả 5 test trong `~/workspace/amp-v9-verify/`
   (phải giữ 895 PASS, 0 FAIL) rồi đóng zip lại.
