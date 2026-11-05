# Amp v10.27 — Winamp Modern (đợt v10.27: makeup gain +4dB cho đường EQ BẬT — EQ bật nay to bằng EQ tắt trên điện thoại thật; 1 GainNode `makeup` riêng giữa master và limiter, hằng số duy nhất EQ_MAKEUP_GAIN_DB dễ chỉnh; đo headless Chrome: +3,94 → +3,96 dB trên tín hiệu thường, limiter vẫn chặn quá tải)

Bản phát hành duy nhất: **version 10.27** (đợt v10.27 bump từ 10.26 — 1 việc, xem mục "Đợt v10.27" bên dưới: makeup gain +4dB cho đường EQ BẬT — 1 GainNode `makeup` riêng giữa master và limiter, hằng số duy nhất EQ_MAKEUP_GAIN_DB dễ chỉnh; đo headless Chrome: EQ bật to hơn EQ tắt +3,94 → +3,96 dB trên tín hiệu thường, limiter vẫn chặn quá tải).

## Có gì trong gói

| File | Version | Nội dung |
|---|---|---|
| `index.html` | 10.15 (`window.AMP_VERSION`) | Vỏ trang + toolbar + kiểm version + self-check lúc chạy; **đợt v10.2: hủy engine cũ khi đổi skin (không chồng tiếng)** |
| `classic.js` | CLASSIC_VERSION 10.15 | **MỚI đợt v10.1:** parser skin Classic (.wsz) chuyển từ Webamp fork — đọc `viscolor.txt`/`pledit.txt`/`region.txt`/`genex.bmp`, bảng tọa độ 281 sprite Winamp 2, hình học cửa sổ chính 275×116 + shade 275×14 |
| `skin-loader.js` | LOADER_VERSION 10.15 | Mở `.wal`/`.zip`, đọc XML, gom model (bitmap/font/màu/groupdef/layout), suy `embeddedAvs`, `drawerRestY`, `snapadjustbottom`; `.wsz` không có skin.xml thì parse thật bằng `classic.js` |
| `renderer.js` | RENDERER_VERSION 10.15 | Vẽ cửa sổ chính + shade + ngăn kéo + playlist + AVS/Video (nhúng + cửa sổ rời), EQ/Options/Color Themes, playlist `.m3u`; **đợt v10.1: vẽ cửa sổ chính Classic + shade Classic từ BMP, nút bấm được**; **đợt 4: holder park giữ thẻ video khi đóng cửa sổ (tiếng vẫn phát), vis bấm đổi kiểu bar/sóng/tắt từng vùng, nối Milkdrop**; **đợt v10.2: 17 preset EQ chuẩn Winamp, slider kéo đúng ở tỉ lệ Fit, chỉ báo stereo/mono áp lại sau khi vẽ lại cửa sổ, ticker clip trong khung, fallback vis khi video không có hình** |
| `audio.js` | AUDIO_VERSION 10.15 | Phát tiếng thật: native trước, HLS sau 6s/lỗi; chuỗi EQ (preamp + 10 biquad + master + analyser); MediaElementSource mỗi thẻ 1 lần; **đợt 4: crossfade trộn bài bằng engine 2 thẻ audio (A/B) + ramp gain, mặc định 2s**; **đợt v10.2: preamp map theo dB (0,5 = 0 dB), dải đầu lowshelf/dải cuối highshelf, limiter chống clip (v10.14: ngưỡng về 0 dB — chuỗi unity, xem mục "Đợt v10.14"), watchdog radio lặng + HLS tự hồi + fallback CORS khi bật EQ, EQ off nhả hẳn về thẻ native mới, destroy() hủy engine cũ** |
| `milkdrop.js` | MILKDROP_VERSION 10.15 | **MỚI đợt 4:** Milkdrop/butterchurn — nạp `butterchurn@2.6.7` + `butterchurn-presets@2.4.7` qua CDN lúc chạy (lazy, chỉ khi bật), preset mặc định qua URL, fallback preset nhúng sẵn; canvas gắn vào hộp AVS thay vis thường; **đợt v10.2: reset() để đổi skin xong bật lại đúng với ctx/analyser mới** |
| `butterchurn.min.js` | 2.6.7 | **MỚI đợt v10.6:** thư viện Milkdrop/butterchurn đóng gói local (192.520 byte, UMD) — nạp động khi bật Milkdrop, không cần mạng ngoài |
| `butterchurnPresets.min.js` | 2.4.7 | **MỚI đợt v10.6:** kho 100 preset butterchurn đóng gói local (653.572 byte, UMD) — preset mặc định "Zylot - Star Ornament" tra từ kho này trước |
| `eqf.js` | EQF_VERSION 10.15 | Đọc/ghi preset EQ Winamp `.eqf`/`.q1` (header v1.1, 268B/preset) + map sang 10 dải + preamp của Amp (đợt v10.0) |
| `metadata.js` | METADATA_VERSION 10.15 | **MỚI đợt 5:** đọc tag nhạc local — `music-metadata-browser@2.5.11` qua CDN ESM (dynamic import, dự phòng esm.sh) + parser ID3v2/v1 + FLAC Vorbis comment nhúng sẵn khi CDN chết; ghi title/artist/album/duration vào model mục playlist |
| `maki.js` | MAKI_VERSION 10.15 | **MỚI đợt 7 (giai đoạn a):** parser + inspect script MAKI — đọc file `.maki` của skin (magic `FG`, formatVersion 23), liệt kê method/binding/ẩn-hiện/gán text; CHỈ ĐỌC, không chạy code MAKI (interpreter thật là giai đoạn b, để sau) |
| ~~`skin-browser.js`~~ | ~~BROWSER_VERSION 10.1~~ | **ĐÃ GỠ HẲN ở đợt 5** (xem mục "Đợt 5"): chọn skin từ kho Webamp (GraphQL `skins.webamp.org`, panel `#skin-panel`, menu "Chọn skin từ kho…") bỏ luôn theo chốt của Hải — chỉ giữ "Nạp skin .wal/.zip…" chọn file tay |
| `winampmodern566.wal` | — | Skin Winamp Modern 566 (mặc định, tự nạp lúc mở trang) |
| `base-2.91.wsz` | — | Skin Classic mẫu — **đợt v10.1 vẽ được cửa sổ chính + shade, nút bấm được** (trước đây chỉ phát tiếng qua cửa sổ Video/Hiệu ứng rời) |
| `iptv.m3u` | — | Playlist mặc định: 218 mục (41 Radio + 177 TV, 13 nhóm) (không còn bài Demo) (giữ tên + thứ tự gốc) |

## Đợt v10.27 (05/11 — makeup gain +4dB cho đường EQ BẬT: EQ bật nay to bằng EQ tắt)

> Hải báo khi test trên điện thoại thật (05/11 06:07–06:58): bật EQ nghe NHỎ HƠN NHIỀU so với tắt EQ dù EQ để mặc định (preamp giữa, các dải phẳng). Hồi đợt v10.14/v10.16 2 bên nghe gần như bằng nhau. Đã loại trừ code thụt lùi: dựng lại v10.14 y hệt từ GitHub (commit `1ee245cb`) cho Hải test trên điện thoại, kết quả v10.14 "cũng nhỏ như vậy"; chuỗi EQ đo unity 0,00 dB ở headless Chrome v10.16, không đổi từ v10.14 tới nay → chênh lệch nằm ở phía điện thoại/trình duyệt (đường Web Audio trên Android nhỏ hơn đường native, có thể Chrome cập nhật làm lộ rõ hơn), không phải do bản Amp. Hải đồng ý (06:58): "Làm thử luôn đi bạn" — làm makeup gain.

- Makeup gain — chỉ đổi `audio.js`: 1 hằng số duy nhất dễ chỉnh `EQ_MAKEUP_GAIN_DB = 4` (gain `EQ_MAKEUP_GAIN = 10^(4/20) ≈ 1,5849`, export ra ngoài để test) + 1 GainNode `makeup` riêng chèn GIỮA master và limiter (preamp → 10 biquad → master → makeup → limiter → panner → analyser → destination). Đặt TRƯỚC limiter để limiter ngưỡng 0 dB vẫn chặn quá tải (preset boost + makeup vượt 0 dBFS vẫn bị bóp về ≤ ~+1 dB). Không đổi preamp/bands/limiter/volume/crossfade; đường EQ tắt (bypass/native) không qua node này nên không đổi.
- Đo bằng headless Chrome (OfflineAudioContext, xem `eq-loudness-127-report.md`): EQ bật ở preset Mặc định phẳng TO HƠN EQ tắt **+3,94 → +3,96 dB** trên tín hiệu thường/nhỏ (sine 1 kHz đỉnh −6 dB: +3,94; mix đỉnh −6 dB: +3,95; quiet kiểu Đà Nẵng RMS −27 dB: +3,96) — đúng +4,00 dB makeup trừ ~0,05 dB hao hụt của limiter (đã biết từ v10.16). Tín hiệu to/nóng thì limiter bóp bớt (đỉnh −3 dB: +3,54 dB; hot master MP3 thật decode: +1,36 dB; đỉnh ra chỉ ~+0,5 → +1,0 dB thay vì +5 dB nếu không có limiter) — vẫn to hơn EQ tắt, đúng thiết kế chống clip. Chuỗi v10.26 (không makeup) vẫn unity −0,04 → −0,06 dB → makeup là delta duy nhất; bypass (EQ tắt) đúng 0,00 dB trên mọi tín hiệu.
- Chỉnh số dB nếu Hải test máy thật chưa vừa: chỉ đổi 1 số `EQ_MAKEUP_GAIN_DB` trong `audio.js` (vẫn nhỏ hơn tắt EQ → tăng lên 5–6 dB; to hơn tắt EQ → giảm xuống 2–3 dB), không cần đổi gì khác.
- Test mới `eq-makeup-127-test.js` (version 10.27; 34 PASS: hằng số makeup, topology master → makeup → limiter, limiter không đổi, EQ tắt không đổi, volume/master tách riêng, preamp/bands không đổi); test cũ `audio-test.js` cập nhật topology (319 PASS).

## Đợt v10.26 (05/11 — Fit/stage theo kịp NGAY trong lúc kéo đổi cỡ + sửa hàng nút hiện đôi lúc kéo + gờ kéo ML theo XML)

> Hải báo khi test v10.25 trên điện thoại thật (05/11 05:40–05:56, video `34f4802c1dc5f5d797048cd1cf766fca7e0508d45c2516ab9a19272d47039841.mp4` kéo đổi cỡ playlist Modern 566 + ảnh ML `1000094832_5_naca.jpg`): (1) kéo XUỐNG (to ra) cửa sổ cao vượt màn hình, hàng nút (Add/Rem/Sel/Misc/Manage Playlist) tụt xuống dưới khỏi màn hình, phải chờ tới lúc thả ra (glide re-fit) mới thấy hết; kéo LÊN (thu nhỏ) xuất hiện khoảng đen bên dưới cửa sổ; (2) hàng nút xuất hiện 2 lần (3.17s, 8.52s) và đè lên tiêu đề nhóm cuối "Kênh địa phương (46)" (6.38s); (3) ML còn hiện gờ chéo vẽ sẵn ở góc dưới-phải — giống playlist TRƯỚC v10.21, chưa theo XML.

- (1) Fit đóng băng lúc kéo — nguyên nhân thật (đo bằng Chrome thật + touch 360×780, probe-126): tỉ lệ Fit `scale(0.825688)` KHÔNG ĐỔI suốt lần kéo (thiết kế v10.22: đóng băng lúc kéo, thả ra mới re-fit). Sửa (`renderer.js` + `index.html`): móc `onLiveFit` (renderer opt, nối ở `createRenderer` cạnh `onRerender`) — cuối mỗi khung hình của `applyResizeMove`, nếu `zoom === "fit"` thì gọi `setZoom("fit")` tính lại tỉ lệ theo cỡ mới (chỉ đọc vài style + đặt transform/wrap height, không vẽ lại); chế độ 1x giữ nguyên. Mâu thuẫn đã biết (đổi scale giữa lúc kéo thì mép khung không bám đúng ngón tay nếu tính theo delta với tỉ lệ lúc bắt đầu kéo) → tính cỡ bằng **delta TĂNG DẦN theo tỉ lệ HIỆN TẠI từng khung**: mỗi lần áp dụng chỉ cộng lượng ngón tay vừa di chuyển kể từ vị trí đã áp dụng trước (lastX/lastY), chia cho tỉ lệ hiện tại lấy từ `stage.getBoundingClientRect()` (khung trước, lệch tối đa ~1 khung hình); jsdom không có layout (rect 0) thì tỉ lệ rơi về scaleX/scaleY lúc bắt đầu (thường = 1) và lastX/lastY cộng dồn thành đúng delta cũ nên test cũ vẫn chạy. Vì sao KHÔNG tính tuyệt đối (p.x/tỉ lệ + độ lệch nắm — hướng thử đầu, đã bỏ): khi Fit giới hạn theo rộng thì tỉ lệ = availW/w, công thức tuyệt đối thành vòng lặp hồi tiếp hàm mũ — w tăng ~33%/khung, phình tới max 1600 chỉ sau 1 cái kéo góc +120/+60 (đo probe-127, E; bản thử có grab offset cũng vậy vì grab chỉ sửa lúc bấm, không chặn được hồi tiếp). Delta tăng dần thì ổn định: mỗi khung chỉ cộng đúng lượng di chuyển của khung đó. Kiểm bằng Chrome thật: kéo góc/to/nhỏ cả 3 cửa sổ (playlist Modern/Classic + ML), mép khung bám ngón tay (~1 khung hình) VÀ toàn bộ cửa sổ luôn trong màn hình (hàng nút thấy đủ, không khoảng đen). Test mới `resize-livefit-126-test.js` mục E (mock rect stage) hồi quy: đứng yên khung không nhảy, kéo khớp đúng delta, đứng yên ở vị trí mới không chạy tiếp.
- (2) Hàng nút hiện đôi/đè lên — đo bằng Chrome thật (probe-126, 173 khung lúc kéo to + 142 khung lúc kéo nhỏ): DOM chỉ có ĐÚNG 1 hàng nút (`player.pl.button.list` count = 1), hàng nút bám đúng đáy khung (gap đáy trong [-1,8] mọi khung) và KHÔNG đè lên list thật (0 khung btnTop < listBottom) — "hiện đôi" trong video là xé hình do transition lag, không phải DOM trùng. NGUYÊN NHÂN THẬT: `.stage` + `#stage-wrap` đều có `transition: height 250ms ease` (để đáy stage bám đáy ngăn kéo lúc trượt) — trong lúc kéo, chiều cao render chạy sau style ~250ms: kéo to ra thì wrap (overflow-y:hidden) cắt mất ~5px đáy khung = hàng nút (22/173 khung nút bottom > wrap bottom), phải chờ transition bắt kịp/thả ra mới thấy hết; kéo nhỏ lại thì stage còn cao trong khi cửa sổ đã thu → khoảng đen (nền #000 của stage) bên dưới cửa sổ (gap min 389 → max 509px lúc kéo nhỏ). Sửa (`renderer.js`): `start()` tắt transition (`style.transition = "none"`) cho stage + wrap lúc bắt đầu kéo (ghi lại giá trị cũ), `resizeEnd()` hoàn lại trên MỌI đường ra (bấm xuyên/kéo thật/hủy) để glide thả tay + trượt ngăn kéo vẫn mượt; `applyResizeMove` khẳng định lại "none" mỗi khung (timeout glide 250ms của lần thả trước có thể bật lại giữa lúc kéo mới). Sau sửa: kéo to/kéo nhỏ, wrap/stage bám ngay từng khung, hàng nút chỉ 1 cái ở đúng đáy khung, không đè hàng cuối, không khoảng đen.
- (3) Gờ kéo ML theo XML — ML 566 có lớp `<layer x="-20" y="-52" relatx="1" relaty="1" image="player.ml.bottomright" resize="bottomright" />` trong `ml-normal.xml`, nhưng tay nắm góc ML vẫn vẽ gờ chéo (probe-126 xác nhận `repeating-linear-gradient`, bgSize 24px) vì phát hiện gờ ở `attachResizeHandles` chỉ nhận `data-bitmap` chứa "resizer" — `player.ml.bottomright` không chứa chuỗi đó. Sửa (`renderer.js`, đúng hướng XML-driven như playlist v10.21): `spriteDiv` ghi `data-resize` khi opt `resize` có; chỗ vẽ `<layer>` truyền `resize: el.getAttribute("resize")`; phát hiện gờ góc nhận thêm `[data-resize]` (bất kỳ giá trị nào) → skin có ảnh gờ thì tay nắm trong suốt, ảnh của chính skin là gờ; skin không có ảnh gờ thì chỉ miếng nhỏ 24×24 như cũ.
- Test mới `resize-livefit-126-test.js` (version 10.26; kéo đổi cỡ thì cửa sổ luôn vừa màn hình — hàng nút trong màn hình + không khoảng đen bên dưới, cả playlist Modern/Classic + ML; hàng nút chỉ 1 cái lúc kéo; gờ ML theo XML: tay nắm trong suốt khi skin có lớp resize="bottomright", vẫn vẽ miếng 24×24 khi skin không có ảnh gờ).

## Đợt v10.25 (05/11 — sửa cửa sổ Media Library vẽ chưa đúng XML: chữ cây bị cắt mép trái + cột phải bị cắt mép phải)

> Hải báo khi test v10.24 trên điện thoại thật (05/11 05:37, ảnh `1000094832_5_naca.jpg`, longhai.github.io/amp, skin 566, cửa sổ MEDIA LIBRARY đang mở): "Mở ml thấy chưa xử lý đúng với xml" — (1) cây trái bị cắt chữ ở mép trái ("Local Media" → ".ocal Media", "Video (183)" → "/ideo (183)"); (2) cột phải bị cắt ở mép phải (tiêu đề "Nghệ sĩ" → "Nghệ s...", giá trị nghệ sĩ → "Không...").

- (1) Chữ cây bị cắt — đối chiếu XML (`ml.xml`/`ml-normal.xml` + `player-elements.xml`): layout ML `w=790 h=349 min 354×164`; ruột là `<component x=6 y=5 w=-12 relatw=1 h=-50 relath=1>` trong dummy group (y=17) → ruột đúng (6,5) trong cửa sổ, 778×299; khung trái `player.ml.left` rộng 6px (bitmap `mlwindow.png`); cây trái trong ruột (treeW 170px ở 790px). NGUYÊN NHÂN THẬT (đo bằng Chrome thật + touch 360×780, probe-125): `renderMlContent` KHÔNG đặt `position:absolute` cho `.ml-content` (chỉ có left/top/width/height) nên div static — `left:6px; top:5px` bị trình duyệt bỏ qua, ruột nằm ở (0,0) của dummy group thay vì (6,5); `_absX/_absY` vẫn ghi đúng (6, 204) nhưng rect thật là (0, 199) — lệch đúng 6px trái + 5px lên. Khung trái 6px (vẽ sau = đè lên) che mất ~3px đầu chữ cây (chữ bắt đầu 3px padding thay vì 9px) — zoom ảnh Hải: MỌI hàng cây đều bị cắt đầu như nhau (L/V rõ nhất vì nét trái mỏng). Sửa (`renderer.js`): `.ml-content` thêm `position:absolute` — ruột về đúng (6,5) XML, chữ cây bắt đầu 9px, vượt mép viền trái 6px; đầu ô tìm cũng hết bị viền trên 5px che. Lưu ý: thụt lề/icon cha-con của cây KHÔNG nằm trong XML skin (nằm trong `<component>` ML plugin, Winamp thật tự vẽ) — Amp vẽ các hàng cây thẳng hàng (không thụt), giữ nguyên, không bịa thêm.
- (2) Cột phải bị cắt — tái hiện đúng trạng thái của Hải bằng probe-125c (preset localStorage `amp9-winsize-v9` = ML 354×240 rồi boot + mở ML): stage 354px, Fit scale 1.017, cửa sổ chính 354×164 full màn hình, ML 354×240, cây 120px, list chỉ 222px trong khi bảng min-width 480px → cột Nghệ sĩ (x=315) bị cắt ở mép phải list (347.8), Album/Thời lượng ngoài màn hình — GIỐNG HỆT ảnh Hải gửi từng px. NGUYÊN NHÂN: cửa sổ ML của Hải đang ở 354×240 — size ĐÃ KÉO HẸP và lưu lại (min XML 354), không phải 790×349 mặc định XML; size hẹp có từ chế độ ML gọn v10.3 (đã hủy ở v10.4 nhưng size đã lưu còn) / kéo thử resize. Sửa (`index.html`): migration 1 LẦN ở boot (cờ `amp9-ml1025-reset`) — bỏ entry size ML đã lưu mà hẹp hơn bề rộng mặc định XML (`layoutMinMax("MLibrary","normal").w`, 790 với 566, không gán cứng số 566); sau đó ML mở đúng 790×349, kéo hẹp lại vẫn lưu/khôi bình thường (min XML 354). Kiểm bằng Chrome thật: preset hẹp + chưa có cờ → boot xong ML 790×349, đủ 5 cột; preset hẹp + đã có cờ → ML giữ 354 (migration không chạy lại, persistence còn nguyên).
- (3) Cột Thời lượng hẹp — ngay cả khi ML đúng 790px XML, tiêu đề "Thời lượng" (~55px) vẫn hiện "Thời lư..." trong cột 48px, giá trị "Trực tiếp" (~48px) cũng bị cắt đuôi ("Trực tiế..."). Sửa (`renderer.js`): cột len ML 48 → 64px (`ML_COL_DEFS`), `ML_MIN_TABLE_W` 480 → 496; playlist giữ 48px (chỉ hiện giờ "1:23:45"/"Trực tiếp" vừa đủ, Hải chưa báo lỗi).
- Test mới `ml-xml-125-test.js` (version 10.25; ruột ML position:absolute + left 6px/top 5px đúng XML; chữ cây bắt đầu 9px > viền trái 6px; cột len 64px + header min-width 496px + header/hàng thẳng cột; ML mặc định 790×349 khi không có override; override hẹp vẫn kẹp min 354 khi khôi). Test cũ `v10-3-test.js` F7 cập nhật 48px → 64px (cột len ML).

## Đợt v10.24 (05/11 — gộp move theo khung hình (rAF) khi kéo đổi cỡ để vuốt nhanh khung theo kịp ngón tay)

> Hải báo khi test v10.23 trên điện thoại thật (05/11 04:56, video `c253444a...`, longhai.github.io/amp): "Vuốt cũng mượt rồi nhưng vuốt nhanh nó không theo kịp, còn skin wsz cũng đã kéo được rồi" — kéo CHẬM thì mượt, vuốt NHANH thì khung cửa sổ tụt lại phía sau ngón tay (chỉ bắt kịp khi ngón tay chậm lại/dừng). Skin .wsz (Winamp5 Classified) kéo góc ĐƯỢC rồi (xác nhận v10.23).

- Đo bằng Chrome thật + touch giả lập mobile 360×780, CPU throttling 4× (giả lập điện thoại chậm) — probe-124: handler `pointermove` TRƯỚC sửa (mỗi event làm đủ việc: đổi cỡ khung + preview 36 phần tử + stage + vẽ lại live Classic): Modern 0.31ms, Classic 1.51ms, Classified 54 hàng 2.72ms/event, p95 14–24ms (VƯỢT 1 khung hình 16.7ms) — main thread bận xử lý dồn từng event cũ, kể cả vị trí trung gian không bao giờ được vẽ, nên khung hiện vị trí cũ (tụt lại phía sau). SAU sửa: handler/event 0.06–0.15ms (giảm 10–18 lần), công việc gộp về ≤1 lần/khung hình với vị trí MỚI NHẤT. Callback rAF (công việc thật): Modern ~1ms, Classic 5–8ms (rebuild), tối đa 28.6ms (throttle 4×, 54 hàng). Lag đo (layout px, throttle 4×): trung bình ~1 khung hình (12–18px ở tốc độ vuốt 833px/s), tối đa 25–50px (2–3 khung) khi rebuild Classic chặn khung hình. Lưu ý: số đo lag lấy ở rAF lấy mẫu (chạy trước rAF kéo trong cùng khung) nên overstated ~1 khung — khung vẽ thật bám sát hơn số đo.
- Sửa (`renderer.js`): `resizeMove` tách thành `applyResizeMove(s, p)` (thân xử lý cũ) + gộp rAF ở `resizeMove` — mỗi `pointermove` chỉ lưu vị trí mới nhất (`s.px/s.py`); nếu đã có rAF chờ thì bỏ event cũ, nếu chưa thì đặt rAF áp dụng vị trí mới nhất 1 lần. Dùng `requestAnimationFrame` TRẦN (như AVS/ticker) nên ở jsdom (Node không có rAF trần) vẫn đồng bộ như cũ — test cũ không đổi. `resizeEnd` flush vị trí chờ trước khi chốt cỡ (áp dụng ngay vị trí mới nhất, bỏ qua rebuild — `skipLive`, vì `requestRerender` ngay sau đó sẽ vẽ lại đầy đủ, tránh 2 lần rebuild Classic chồng nhau làm đơ main thread 60–90ms sau khi thả; đo lại settle Classic 65→36ms, 59→34ms).
- Test mới `resize-fast-124-test.js` (version 10.24; kéo nhanh: dồn 30 `pointermove` liên tiếp thì cỡ cuối vẫn đúng vị trí ngón tay cuối + không bỏ bước; kéo chậm vẫn đúng như cũ; thả tay khi còn move chờ thì flush đúng cỡ cuối).
- Ghi nợ (phát hiện khi đo, chưa sửa): listener `onMove` kéo slider (volume/seek/EQ...) đăng ký ở cấp document mỗi lần vẽ mà không gỡ — số lượng tăng 47→72→85→98 qua các lần nạp skin (Modern 47, Classic 72–98), ~0.1–0.3ms/event, thứ yếu so với rebuild Classic.

## Đợt v10.23 (04/11 — kéo đổi cỡ playlist live theo tay, không vệt đen, thả ra re-fit mượt; playlist mặc định cho mọi skin trình phát đầy đủ thiếu Pledit)

> Hải báo khi test v10.21 trên điện thoại thật (04/11 21:03, video `c36074bf...`, longhai.github.io/amp, skin Modern mặc định 566, DA NANG đang phát): (1) "Khi di chuyển có các vệt đen không đẹp" — kéo góc/mép playlist đổi cỡ được nhưng để lại các vệt/dải đen quanh và dưới playlist; (2) "dùng file skin của webamp không kéo gốc được vậy làm sao nhỉ" — nạp file skin .wal khác thì không kéo được góc playlist. Hải nhấn mạnh (21:12): kéo phải "Giống app thật" — chuẩn là Winamp thật trên PC: nắm góc/mép kéo thì khung cửa sổ đổi cỡ mượt theo tay, không vệt, không lag, không nhảy; "Làm sao kéo cửa sổ thật của khung di chuyển theo cho đúng" — khung thật phải theo ngón tay ngay lập tức (live), không phải chỉ xem trước rồi thả ra mới nhảy.

- (1) Vệt đen + khung theo tay — điều tra bằng Chrome thật + touch giả lập mobile 360×780 (probe-122a/b/c/d/e/f, ảnh `/tmp/v1022-chrome*`): KHUNG THẬT CÓ theo tay 1:1 live (resizeMove cập nhật `live.style.width/height` đồng bộ theo từng pointermove — kéo −10px/bước thì mép phải −9.9px/bước; +100px thì +99.7px) — cảm giác "khung không theo" là do vệt + nhảy lúc thả, không phải rect lag. VỆT ĐEN giữa lúc kéo là lỗi TRẠNG THÁI, không phải tốc độ vẽ: phần tử neo mép phải/đáy (`relatx="1"`/`relaty="1"` — nút đáy playlist, nút Manage Playlist, lớp khung phải/đáy, nút winshade) KHÔNG nằm trong preview nên đứng yên ở vị trí cũ trong khi cửa sổ to/lên và `.pl-list` phủ lên chúng (tiêu đề nhân đôi, hàng 1–3 bị che bởi hình chữ nhật đen, nút đáy nổi lơ lửng giữa list ở vị trí cũ, nút đáy mất khỏi đáy mới). Sửa (`renderer.js`): `renderChildren` đánh dấu `data-anchor-r`/`data-anchor-b` (mép phải/đáy giữ cách mép bao nhiêu) + `data-stretch-w`/`data-stretch-h` (chỉ giãn chiều nào relat chiều đó — kể cả relat nằm trên GROUPDEF, vd `pl.frame.layout` relath + `pledit.buttons.group` relatw); `resizeMove` dời vị trí neo theo khung hiện tại (cha xử lý trước con nên lấy đúng rộng/cao mới) + chỉ đổi cỡ chiều nào relat chiều đó (nhóm nút đáy chỉ giãn rộng, cao giữ 21px; nút Manage Playlist chỉ dời vị trí, không đổi cỡ; nền backgroundSize/Position co giãn theo đúng chiều giãn). NHẢY lúc thả: scale Fit ĐÓNG BĂNG lúc bắt đầu kéo (đúng — vì ở chế độ Fit, vừa re-fit live vừa theo tay theo x là mâu thuẫn nhau), thả ra `setZoom("fit")` tính lại → snap (thu nhỏ: stage 292 → 360, +68px; to ra: 460 → 360, −100px). Sửa (`index.html`): thả ra thì re-fit MƯỢT — `requestRerender({animateZoom:true})` → `setZoom` đặt `transition: transform 180ms ease-out` trước khi đổi transform (kiểm bằng rAF: scale 0.8257 → 0.8542 → 0.8807 → 0.928 → 0.9489 → 0.984 → 0.9979 → 1.0151 → 1.017, 6 giá trị trung gian — glide thật, không snap; lần đo đầu tưởng snap là do headless không bơm frame khi idle). Kéo mép đáy (chỉ đổi cao) vốn đã sạch. Ảnh sau sửa: giữa lúc kéo to ra, 13 hàng nhóm sạch, nút đáy ở đúng đáy mới, list xanh kín tới mép phải; thu nhỏ: trong cửa sổ sạch, nút đáy + Manage Playlist đúng chỗ (dải đen bên phải lúc kéo thu là nền trang thật — stage hẹp hơn viewport lúc kéo, hết sau glide lúc thả).
- (2) Tay nắm góc cho mọi skin .wal — kiểm TẤT CẢ 31 file trong `~/workspace/user/files/`: 14 file .wal Modern có tay nắm (566, Act3, Azumanga, BLAKK, CROSSNET ×2, Copperdeck II ×2, D-Reliction, DDtank, EMP, WMP12, nebular, blakk zip — đều 3 tay nắm + kéo được); 3 file Cpro (Cpro ×2 + cPro AyonPlayer) → `SKIN_UNSUPPORTED` (giao diện nằm trong engine ClassicPro ngoài .wal, không sửa được); 11 file .zip KHÔNG phải skin (ROM NES/J2ME/font: java, kaios, littlnem, ninjagaiiii, saintseio, sampizzacats, 3d_pixel, battldoudra, chipndalresra...) — nạp ra skin rỗng, không tính. Còn thiếu 2 skin thật: **Braun** (skin.xml KHÔNG include `xml/pledit.xml` — file pledit mồ côi, `pledit.content.group` không được nạp; `xml/pledit.xml` còn include `pledit-elements.xml` không có trong .wal; `xml/playlist.xml` thiếu) và **DreddfulAmp** (không có pledit gì cả — chỉ main + eq + thinger) → cả 2 đều không có layout Pledit nên renderStacked bỏ qua hẳn cửa sổ playlist → không có tay nắm. Sửa (`skin-loader.js`): thêm nhánh tổng hợp thứ 3 — skin trình phát đầy đủ (có container main + ít nhất 1 container khác ngoài main: eq/notifier/thinger...) mà thiếu Pledit và không có nội dung playlist nào thì vẫn dựng playlist mặc định 436×164 với `<list>` (như WMP12). Skin tối thiểu chỉ có mỗi main (`s1-size500.wal` — test S1 chốt "thiếu Pledit thì bỏ qua playlist") vẫn KHÔNG dựng, giữ hành vi cũ. Sau sửa: Braun + DreddfulAmp đều 3 tay nắm, gờ nhỏ mặc định 24×24, kéo +60/+60 → 496×224, playlist tổng hợp vẽ đủ 13 tiêu đề nhóm. Classic `.wsz` (Winamp5 Classified) giữ 0 tay nắm theo thiết kế (Classic playlist không có cơ chế resize của Modern) — ghi rõ là giới hạn đã biết, không phải lỗi.
- Test mới `resize-live-122-test.js` (version 10.23; neo theo khung giữa lúc kéo: nút đáy top +60, cao giữ 21px, sát đáy mới; nút Manage Playlist + lớp khung trên-phải dời phải +60, cỡ không đổi; list phủ kín khung mới (mép phải ≤12px, đáy ≤35px); khung theo đúng vị trí ngón tay từng bước +10; thả ra giữ 496×224 + đã lưu; tay nắm góc + kéo được ở MỌI file .wal trong user/files (liệt kê từng skin; 3 Cpro → UNSUPPORTED); s1-size500 vẫn không dựng playlist — hồi quy S1).

## Đợt v10.21 (04/11 — gờ kéo góc XML-driven theo ảnh gờ của skin, tay nắm kéo cho mọi skin .wal)

> Hải báo khi test v10.20 trên điện thoại thật (04/11 19:54–20:00, ảnh `1000094769_2_pmea.jpg`, longhai.github.io/amp, skin Modern mặc định 566, ĐÀ NẴNG): nút kéo "càng tệ" — (a) "khi đổi skin của webamp vào là không có chức năng kéo ở góc" — nạp skin Modern .wal khác thì playlist MẤT HẲN tay nắm kéo; (b) "skin winamp mặc định có rồi nhưng bạn chỉnh sửa nút to đùng" + "nhìn rõ chàn hết ra khung" — skin 566 mặc định vốn đã kéo được, nhưng gờ góc v10.20 (64×64, vạch trắng 0.55) quá to, tràn ra khỏi khung, che cả nút Manage Playlist. Hải hỏi (20:04–20:05): "Nút kéo có trong xml không" + "Nếu có, kích thước nó cũng có chứ nhỉ".

- KIỂM CHỨNG TRỰC TIẾP trong file .wal skin 566: CÓ — nút kéo góc dưới-phải là 1 `<layer>` trong `Winamp Modern/xml/pledit-normal.xml`: `<layer x="-24" y="4" relatx="1" image="player.pl.resizer" resize="bottomright" />` (lớp ảnh `player.pl.resizer`, thuộc tính `resize="bottomright"`, x=-24 cách mép phải 24px). Kích thước nút = kích thước ảnh trong XML: `player-elements.xml` khai `<bitmap id="player.pl.resizer" file="player/resize_pl.png" w="15" h="15"/>` → ảnh gờ playlist là **15×15** (`resize_pl.png`, 452 byte). ĐÍNH CHÍNH: file `resizer.png` 17×17 (298 byte) là bitmap `player.resizer` (cửa sổ chính, `player-normal-group.xml:498`), KHÔNG phải ảnh gờ playlist. XML còn khai đủ các lớp resize khác (`topleft`/`top`/`topright`/`left`/`right`/`bottomleft`/`bottom`) + layout playlist `<layout id="normal" minimum_w="354" minimum_h="164" h="164" w="436">`. Kết luận: v10.19/v10.20 hardcode tay nắm 24/32/48/64px + vẽ vạch chéo là SAI hướng (đi ngược quy tắc "dựa vào xml, đừng tự thêm") — đó là lý do nút to đùng tràn khung.
- (1) Gờ góc XML-DRIVEN (`renderer.js` — `attachResizeHandles`): skin có ảnh gờ riêng đã vẽ sẵn trong cửa sổ (sprite `data-bitmap` chứa "resizer" — 566: `player.pl.resizer` 15×15 ở góc dưới-phải, đúng vị trí XML x=-24/y=4) thì tay nắm TRONG SUỐT hẳn, không vẽ thêm gì (ảnh của chính skin là gờ — nhỏ, gọn trong khung, không che nút). Skin không có ảnh gờ (Copperdeck II/BLAKK/WMP12/Act3...) thì chỉ vẽ 1 miếng NHỎ 24×24 ở góc (vạch chéo trắng 0.45 + vạch tối 0.30, `background-size 24px 24px`, `background-position right bottom`, `no-repeat`) — gọn trong khung, không tràn. Vùng chạm góc 48×48 (trong suốt) cho ngón tay, mép phải/đáy 32px trong suốt như cũ. Logic kéo (pointerdown/move/up, kẹp min/max, lưu size, tap-through <6px) KHÔNG đổi — 566 vốn đã kéo đúng.
- (2) Tay nắm kéo cho MỌI skin (`renderer.js` + `skin-loader.js`): bỏ cổng `isLayoutResizable` (minW<w) làm điều kiện gắn tay nắm — nguyên nhân đã khoanh được: skin không khai `minimum_w`/`minimum_h` nhỏ hơn cỡ hiện tại thì `layoutMinMax` mặc định minW=w, minH=h → cổng false → không gắn tay nắm (xác nhận: Act3 pledit tổng hợp minW=null → minW=w=436 → 0 tay nắm; WMP12 không có layout Pledit → không có cửa sổ playlist). Nay: `attachResizeHandles` gắn tay nắm cho mọi cửa sổ co giãn được (Pledit/MLibrary/Video/AVS), chỉ cửa sổ chính vẫn KHÔNG có tay nắm (cố định theo XML, như Winamp thật); `layoutMinMax` mặc định min = min(cỡ hiện tại, 200×100) khi XML không khai (chỉ kẹp cỡ khi kéo, không tắt chức năng kéo); `skin-loader.js` mở rộng tổng hợp Pledit (v10.12 P1 H): skin không có layout Pledit VÀ không có `pledit.content.group` (WMP12: playlist là PlaylistPro XUI trong main) thì dựng cửa sổ playlist mặc định 436×164 với 1 `<list>` (đường generic `renderList` vẽ hàng playlist của Amp, 13 tiêu đề nhóm thu gọn) — NHƯNG chỉ dựng khi skin CÓ nội dung playlist (groupdef chứa "playlist", vd `PlaylistPro.xui` của WMP12); skin tối thiểu không có gì về playlist (vd `s1-size500.wal`) thì KHÔNG dựng, giữ đúng quy tắc "thiếu Pledit thì bỏ qua playlist" của test S1 (multi-skin-test.js). Classic giữ nguyên.
- Kiểm chứng (jsdom + fixture .wal thật trong `~/workspace/user/files/`): 566 — 3 tay nắm playlist, 0 tay nắm main, góc 48×48 trong suốt, sprite `player.pl.resizer` 15×15 trong khung; Copperdeck II / BLAKK / WMP12 / Act3 — đều 3 tay nắm, góc 48×48 + gờ mặc định nhỏ 24×24, main 0 tay nắm, Pledit kéo được (Act3/WMP12 min mặc định 200×100); WMP12 — playlist tổng hợp vẽ đủ 13 tiêu đề nhóm, kéo góc +60/+60: 436×164 → 496×224 + lưu lại, kéo -300/-100 kẹp đúng min 200×100; Copperdeck II kéo +40/+40 đổi cỡ + lưu lại. 566 không đổi: main không kéo được (min == w/h theo XML), kep (200,100) → {354,164}, kep (2000,2000) → {1600,1200}.
- Test mới `resize-skins-121-test.js` (version 10.21; 566: góc trong suốt + sprite `player.pl.resizer` 15×15 trong khung + main 0 tay nắm + kep theo XML; 4 skin khác: đủ 3 tay nắm + gờ nhỏ 24×24 + main 0 tay nắm + Pledit kéo được + min mặc định 200×100 + WMP12 13 tiêu đề nhóm; kéo đổi cỡ ở WMP12/Copperdeck II + thả giữ lại + kẹp min); cập nhật `resize-handles-108-test.js` + `resize-test.js` + `resize-group-120-test.js` + `resize-scroll-119-test.js` theo spec tay nắm mới (góc 48×48; 566/video: trong suốt vì skin có ảnh gờ; skin khác: gờ nhỏ 24×24 0.45/0.30).

## Đợt v10.20 (04/11 — gờ kéo góc playlist nhìn thấy rõ như Winamp thật, tiêu đề nhóm bỏ hẳn nền màu)

> Hải báo khi test v10.19 trên điện thoại thật (04/11 19:06–19:07, ảnh `1000094766_0_j0ar.jpg`, longhai.github.io/amp, skin Modern xanh, ĐÀ NẴNG đang phát): (a) "Không còn nhảy về đầu danh sách rồi" — việc giữ cuộn v10.19 ĐÃ XONG, giữ nguyên, không đụng lại; (b) "chưa kéo phóng to thu nhỏ playlist được như bên giao diện gốc winamp, giao diện gốc bị hiện dải gốc kéo kìa" — Winamp thật có dải/gờ kéo (vạch chéo ở góc dưới-phải playlist) nhìn là biết chỗ nắm, kéo là đổi cỡ; (c) "Màu chuyên mục cũng còn" — nền tiêu đề nhóm pha 35% màu chọn (566 → rgb(54,87,152)) vẫn còn dải xanh rõ trên máy thật.

- (1) Kéo playlist — ĐIỀU TRA BẰNG HEADLESS CHROME THẬT (CDP `Input.dispatchTouchEvent`, giả lập mobile 360×780 DPR2 + touch, đúng trạng thái máy Hải: playlist cao 390, fit scale 0.826): code kéo KHÔNG HỎNG — tay nắm gắn đúng khung playlist nhìn thấy (`attachResizeHandles` trong `renderLayoutInner`, cổng `isLayoutResizable` qua được vì Pledit 566 có minimum_w 354 < w 436), `elementFromPoint` ở tâm góc = tay nắm, `pointerdown/move/up` chạy đủ, kéo được CẢ 4 CHIỀU (góc to +60/+60: 436×164 → 509×237, góc nhỏ -40/-40 → 452×180, mép đáy -50, mép phải -50) + lưu localStorage + mở lại vẫn giữ, kể cả kéo từ đúng điểm grip của skin (`player.pl.resizer`, x=-24/y=4 trong `pledit.buttons.group`). NGUYÊN NHÂN ĐÚNG: lỗi nằm ở chỗ nắm — vùng chạm v10.19 chỉ 48×48, gờ chỉ trắng 0.22 MỜ đến mức không nhận ra chỗ nắm; ngón tay (~45px màn hình) nhắm vào vạch mờ mà trượt sang danh sách `.pl-list` thì vuốt KHÔNG CÓ TÁC DỤNG GÌ (playlist cao thì danh sách chứa hết, không cuộn được nữa) nên Hải thấy "kéo không ăn". SỬA Ở GIAO DIỆN, không sửa đường event (đã đúng): vùng chạm TO HƠN — mép phải/đáy 24px → 32px, góc 48×48 → 64×64 (ở fit ~0.83x thì góc ~53px màn hình, bằng đầu ngón tay); góc có GỜ CHÉO NHÌN THẤY RÕ như Winamp thật — vạch trắng 0.55 + vạch tối 0.35 kề nhau (khắc chìm kiểu grip của chính skin 566, đọc được cả trên nền xanh list lẫn nền bạc hàng nút, không chói), vạch 2px bước 8px; 2 mép vẫn trong suốt như Winamp. Bấm (<6px) vẫn xuyên qua tay nắm nhờ `resizeTapThrough` (nút Add/Rem/Sel/Misc/List + hàng kênh dưới tay nắm vẫn bấm được). Cửa sổ chính vẫn cố định (không tay nắm), Classic giữ nguyên (Hải nói Classic bình thường).
- (1b) Stage bám theo CẢ 2 CHIỀU khi kéo (`resizeMove` + `start`): trước đây stage chỉ NỚI khi kéo to ra (`dh > 0` / `c.w > curW`), kéo thu nhỏ thì cửa sổ thu nhưng stage giữ cỡ cũ, thả ra mới nhảy lại — trên điện thoại trông như kéo không ăn. Nay `start` ghi `trackW` (cửa sổ đang kéo rộng nhất = rộng bằng stage) + `trackH` (đáy cửa sổ chạm đáy stage) + `stageW0`; `resizeMove` cho stage rộng/cao theo cửa sổ cả khi thu nhỏ; `resizeEnd` (bấm xuyên) hoàn lại cả rộng stage. Cửa sổ không rộng nhất/ở đáy thì vẫn nới stage như cũ khi kéo vượt.
- (2) Tiêu đề nhóm BỎ HẲN nền màu (`renderer.js` — cả 3 đường: Modern `buildPlaylistRows`, Classic `buildClassicPlRows`, `<list>` generic `fillListRows`): nền tiêu đề = `"transparent"` = đúng nền bình thường của danh sách (Modern: nền list; Classic: nền đen như hàng kênh thường — hàng kênh Classic tự ghi `normalbg`), chỉ giữ chữ đậm + icon thư mục 📁/📂 + màu chữ bình thường (Modern: `wasabi.list.text` trắng; Classic: `current` trắng — đúng mẫu app cũ của Hải: tiêu đề trắng đậm + thư mục vàng trên nền đen, kênh xanh, KHÔNG dải màu nền). "Dễ nhìn" đến từ chữ đậm + thư mục vàng + tương phản chữ/nền, không cần dải nền. GỠ helper pha màu v10.19 (`GROUP_HEADER_TINT` / `groupHeaderBg` / `mixColorVal` / `parseColorVal` — không còn nơi nào dùng). Hàng đang chọn/đang hát GIỮ NGUYÊN nền chọn; kênh trong nhóm mở không nền riêng.
- Test mới `resize-group-120-test.js` (version 10.20; tiêu đề nhóm Modern + Classic + `<list>` generic: nền trong suốt, KHÔNG `selectedbg`, KHÔNG pha 35%, chữ đậm + thư mục; tay nắm gắn đúng khung playlist nhìn thấy + kéo đổi cỡ cả to lẫn nhỏ + thả giữ lại + mở lại vẫn giữ + stage thu theo khi kéo nhỏ; gờ góc nhìn thấy được 0.55); cập nhật `resize-handles-108-test.js` + `resize-scroll-119-test.js` (mục A/B: nền tiêu đề trong suốt; mục F: mép 32px, góc 64×64, gờ 0.55) + `resize-test.js` theo spec tay nắm mới.

## Đợt v10.19 (04/11 — giữ vị trí cuộn playlist, tay kéo co giãn to cho ngón tay, tiêu đề nhóm dễ nhìn)

> Hải báo khi test v10.18 trên điện thoại thật (18:06–18:09, ảnh `1000094761_2_t5dq.jpg` skin Modern xanh + `1000094763_3_ox4o.jpg` skin Smart AMP Classic, VTV1 đang phát hình thật): (1) chọn kênh thì playlist nhảy/lại về đầu danh sách; (2) không kéo tăng giảm cửa sổ được; (3) không vừa chiều dọc dù đã ở chế độ "Vừa màn hình" (Fit); (4) màu tiêu đề nhóm quá chói. Hải đính chính 18:12: (1)(2)(3) CHỈ ở giao diện webamp (skin Modern), bên winamp (Classic) bình thường — sửa đường Modern, lấy Classic làm chuẩn đối chiếu; (4) cả 2 bên đều bị. Hải đính chính 18:15: BỎ việc (3) — "không vừa chiều dọc thật ra cũng không cần nếu có thể vuốt thay đổi được là không cần vừa chiều dọc" (kéo đổi cỡ thay thế cho vừa chiều dọc; Fit giữ như v10.18). Hải đính chính 18:16: (4) "làm sao cho dễ nhìn" — vừa không chói, vừa phải đọc rõ + thấy ngay đâu là tiêu đề nhóm. 3 lỗi (1)(2)(3) đã xác minh KHÔNG phải của dự án Webamp gốc (app đó không có playlist nhóm và không có chế độ "Vừa màn hình").

- (1) Giữ vị trí cuộn (`renderer.js`): `captureScrollState()` nay chụp thêm `classicPlListDiv.scrollTop` (trước đây chỉ chụp Modern + ML + window — đường Classic không được giữ cuộn, nhưng Hải nói Classic bình thường nên đây là phòng thủ); `restoreScrollState()` sau khi gán scrollTop thì ĐỌC LẠI — nếu muốn > 0 mà đọc lại 0 (trình duyệt thật kẹp scrollTop về 0 khi phần tử bị thay DOM/chưa có layout — jsdom không mô phỏng được) thì đặt lịch khôi muộn `scheduleScrollRestore()` (rAF + setTimeout, tối đa 3 lần thử cách 50ms, chỉ gán lại khi phần tử đã trong document và scrollTop hiện tại vẫn 0, không bao giờ đè lên cuộn tay của người dùng); cuộn có chủ đích (`scrollPlaylistTo`, nút cuộn Classic lên/xuống 4 bài) thì hủy lưới khôi muộn đang chờ. jsdom gán là dính nên lưới muộn không bao giờ kích hoạt trong test cũ. Kiểm chứng bằng test mới `resize-scroll-119-test.js` mục E: chặn scrollTop (mô phỏng trình duyệt kẹp về 0) rồi xác nhận lưới muộn vớt lại đúng 150.
- (2) Tay kéo co giãn TO cho ngón tay (`renderer.js` — ưu tiên cao nhất): vùng chạm mép phải/đáy 10px → 24px, góc 24×24 → 48×48 (ở zoom fit ~0.83x trên màn 360px thì góc ~40px màn hình, mép ~20px — ngón tay chạm được; trước đây mép chỉ ~4–8px nên tưởng như không kéo được dù code kéo đã có từ đợt A). 2 mép vẫn hoàn toàn trong suốt (giữ chốt v10.8 vô hình như Webamp); chỉ góc có gờ chéo RẤT MỜ (trắng 0.22, mờ hơn nhiều so với 0.55 của v10.0 mà Hải đã chê) để biết chỗ nắm trên điện thoại (không có hover/cursor). CHẠM XUYÊN TAY NẮM (tap-through): tay nắm to đè lên hàng nút đáy playlist (Add/Rem/Sel/Misc/List) và mép phải hàng kênh — bấm (thả ra mà tổng di chuyển < 6px màn hình) thì hoàn lại kích thước xem trước, KHÔNG lưu, và gửi 1 sự kiện click tổng hợp tới phần tử đang nằm dưới ngón tay (ẩn tay nắm rồi `elementFromPoint`), để nút/hàng kênh dưới tay nắm vẫn bấm được; kéo thật (>= 6px) thì đổi cỡ + lưu như cũ. Cửa sổ chính vẫn cố định (không có tay nắm, đúng Winamp thật); Classic vẫn 0 tay nắm (Hải nói Classic bình thường).
- (4) Tiêu đề nhóm DỄ NHÌN (`renderer.js` — cả 3 đường: Modern `buildPlaylistRows`, Classic `buildClassicPlRows`, `<list>` generic `fillListRows`, dùng chung `groupHeaderBg(selBg, normalBg)` + `mixColorVal(a, b, 0.35)` mới, hằng `GROUP_HEADER_TINT = 0.35`): nền tiêu đề = 35% màu chọn pha vào nền bình thường của danh sách (KHÔNG dùng nền chọn đầy đủ nữa — xanh sáng 103,136,201 / cam sáng ở Smart AMP chói): skin 566 → rgb(54,87,152) trên nền (28,61,125); base-2.91 → rgb(0,0,69) (selectedbg #0000C6 trong pledit.txt riêng của skin, normalbg #000000; mặc định #0000FF → rgb(0,0,89)); Smart AMP cam → nâu cam sẫm. Chữ tiêu đề: Modern = màu chữ bình thường của danh sách (trắng, đậm); Classic = GIỮ màu current (trắng, như app cũ của Hải: tiêu đề trắng đậm, kênh xanh lá) + icon thư mục 📁/📂. Hàng kênh đang chọn/đang hát GIỮ NGUYÊN nền chọn; kênh trong nhóm mở màu bình thường như mọi kênh khác (không có nền riêng). Test mới khóa: nền tiêu đề ≠ `selectedbg` ở cả Modern lẫn Classic, chữ đúng màu bình thường/current, hàng chọn vẫn nền chọn.
- (3) BỎ theo chốt của Hải 18:15 — không sửa `setZoom`/Fit, không test cho việc này.
- Test mới `resize-scroll-119-test.js` (58 kiểm tra: version 10.19, (4) Modern + Classic, (1) Modern + Classic + lưới khôi muộn, (2) cỡ tay nắm + kéo mép đáy + tap-through + kéo thật không tap-through); cập nhật `resize-handles-108-test.js` theo spec tay nắm mới (mép 24px, góc 48×48, gờ góc mờ 0.22, mép trong suốt).

## Đợt v10.18 (04/11 — tiêu đề nhóm playlist thu gọn/mở ra, mẫu app cũ của Hải)

> Hải báo 17:12: tiêu đề nhóm trong playlist phải thu gọn/mở ra được và có biểu tượng như trước kia. Hải gửi 2 ảnh app cũ của anh ấy (17:15, `1000094759_0_tv84.jpg` + `1000094760_1_61g2.jpg`, Winamp Classic + cửa sổ VIDEO hiện DNRT RADIO): mẫu đúng là app cũ đó, KHÔNG phải IPTV Viewer v10 — tiêu đề nhóm có icon THƯ MỤC VÀNG (📁 đóng / 📂 mở), kênh trong nhóm mở được đánh số lại từ 1 theo nhóm ("1. VTV1", "2. ANTV"...), mặc định TẤT CẢ các nhóm đều thu gọn (ảnh 1 mọi nhóm đóng; ảnh 2 bấm mở "Kênh thiết yếu (5)" mới thấy 5 kênh). Lưu ý: danh sách nhóm trong ảnh cũ (có "SCTV (23)") là của app cũ, không phải iptv.m3u hiện tại — chỉ lấy THIẾT KẾ, không đổi tập kênh iptv.m3u 218 mục.

- Tiêu đề nhóm thu gọn/mở ra (`renderer.js` — chỉ sửa file này): `plGroupHeaderEl()` vẽ chung cho cả 3 đường (Modern Pledit `buildPlaylistRows`, Classic `buildClassicPlRows`, `<list>` generic `renderList`): tiêu đề gồm icon thư mục vàng (span `.folder`: 📁 khi thu gọn, 📂 khi mở) + "Tên nhóm (N)", `aria-expanded` đúng trạng thái, `cursor: pointer`, bấm thì thu gọn/mở ra nhóm đó (chỉ ẩn/hiện hàng kênh, KHÔNG xóa kênh, KHÔNG đổi thứ tự, KHÔNG tính lại số mục). Trạng thái thu gọn lưu trong phiên (map `plGroupCollapsed`: tên nhóm → true = đang thu gọn, KHÔNG lưu localStorage); nạp lại playlist / xóa tìm kiếm thì reset về mặc định (tất cả thu gọn). `<list>` vẽ lại khung list cục bộ khi bấm tiêu đề (qua `afterToggle` của `plGroupHeaderEl`).
- Đánh số lại từ 1 theo nhóm: `playlistGroupedRows()` gán `rec.pos` (vị trí trong nhóm, từ 1) cho hàng kênh khi nhóm mở; Modern hiện ở cột `.pl-num` riêng, Classic hiện tiền tố "N. " trước tên ("1. VTV1"), `<list>` hiện "N. tên". File phẳng (không group / chỉ 1 nhóm "Khác") giữ số toàn playlist (`idx+1`) như cũ, kể cả lúc lọc tìm kiếm.
- Mặc định TẤT CẢ các nhóm đều THU GỌN (kể cả nhóm đầu — khác IPTV Viewer v10 chỉ mở nhóm đầu). Tự mở nhóm chứa bài đang hát/đang chọn: `playPlaylistItem` / `selectPlaylistItem` / menu "Tới bài đang hát" đều gọi `plGroupEnsureOpenForIdx()` trước khi vẽ lại (next/prev/tự chuyển bài đi qua `playPlaylistItem` nên cũng tự mở). Tìm kiếm: `plGroupEffectiveOpen()` mở hiệu lực mọi nhóm có kết quả khớp (không sửa map); xóa tìm kiếm thì `refreshPlaylistRows()` reset về mặc định (tất cả thu gọn).
- Test: `group-collapse-118-test.js` mới (77 PASS: mặc định tất cả đóng + folder 📁, bấm tiêu đề thu gọn/mở ra từng nhóm độc lập, tự mở khi phát/chọn/next/prev, tìm kiếm tự mở + xóa về mặc định, đánh số theo nhóm Modern/Classic, file phẳng không tiêu đề + số gốc, "Tới bài đang hát" mở lại nhóm đã thu gọn); cập nhật `iptv-groups-117-test.js` (83 PASS), `playlist-test.js` (221 PASS), `main-window-test.js`, `metadata-test.js`, `v10-3-test.js`, `v10-4-search-test.js` theo mặc định mới (mở nhóm trước khi đọc hàng hiển thị).

## Đợt v10.17 (04/11 — đổi file mặc định sang iptv.m3u + playlist theo chuyên mục)

> Hải báo 16:23: file mặc định giờ đổi tên thành `iptv.m3u` (thay radio.m3u), tích hợp cả kênh TV nữa, trong có các mục như của TV360 nên playlist cần hiển thị danh sách có chuyên mục như trước kia làm. Hải chốt 16:26: gộp tv360 + radio vào iptv.m3u — mục radio từ file radio, mục TV theo đúng file tv360 bên trong. File gộp có sẵn: 21.153 byte, 218 mục = 41 Radio (gắn group-title="Radio", giữ tên + thứ tự gốc) + 177 TV từ tv360.m3u (giữ nguyên 12 group: Kênh địa phương 46, Kênh quốc tế 27, Kênh VTV Cab 20, Giải trí 17, Sự kiện trực tiếp 17, Kênh HTV 14, Kênh VTV 10, Thể thao 8, Kênh FM 6, Kênh thiết yếu 5, Kênh Vĩnh Long 5, Kênh SCTV 2); không trùng URL nào; 7 tên trùng (Bắc Ninh, Hải Phòng, Nghệ An, Ninh Bình, Quảng Ngãi, Sơn La, Điện Biên) là kênh khác nhau (radio vs TV, URL khác nhau) nên giữ cả 2.

- Đổi file mặc định (`index.html` + `renderer.js`): lần nạp playlist đầu lúc mở trang + mục "Nguồn mặc định" trong menu Add (gọi `onReloadRadio`) đều nạp `iptv.m3u`; status "Đã nạp lại iptv.m3u: n mục." (giữ số mục đếm thật). `radio.m3u` KHÔNG còn được nạp nữa — nhưng file vẫn còn trong repo GitHub vì `push_files` (snapshot push) không xóa được file (xóa lẻ 1 file/lần duyệt, trái quy định push 1 lần của Hải 16:13); zip giao đã đổi `radio.m3u` → `iptv.m3u` (vẫn 15 file), loader không dùng tới file cũ nữa. (File `radio.m3u` vẫn còn trong thư mục nguồn làm fixture cho test — 32 file test dùng nó làm danh sách phẳng 41 mục — nhưng KHÔNG có trong zip giao và KHÔNG push lên GitHub.)
- Playlist theo chuyên mục (`renderer.js` — `playlistGroupedRows()` + `buildPlaylistRows`/`buildClassicPlRows` + đường `<list>` generic): `parseM3U` đã đọc `group-title` thành `it.group` từ trước — nay vẽ TIÊU ĐỀ NHÓM trong danh sách (cả Modern Pledit lẫn Classic playlist lẫn `<list>`): các kênh cùng group gom dưới 1 tiêu đề "Tên nhóm (N)", thứ tự nhóm theo lần xuất hiện đầu tiên trong file, kênh giữ nguyên thứ tự gốc trong nhóm; kênh không có group → gom vào nhóm "Khác" (quy ước giống IPTV Viewer v10). Tiêu đề nhóm là hàng phân cách (class `group-header`, KHÔNG phải hàng `.row`): vẽ khác hàng kênh (đậm, nền xanh chọn), KHÔNG phát được, KHÔNG chọn được, KHÔNG tính vào số mục/thời lượng, KHÔNG match khi tìm kiếm (chỉ hiện khi nhóm của nó có mục khớp lọc). File .m3u không có group-title nào thì hiện phẳng như cũ (không tiêu đề). Để file phẳng được, `setPlaylistData` KHÔNG còn tự gán group "Radio" cho mục không có group (như trước) — group để trống, lúc vẽ mới gom vào "Khác"; `playlistGroups()` đổi "Khong ro" → "Khác" cho nhất quán. Hệ quả của việc bỏ fill: `getTrackInfoState()` nay trả group HIỂN THỊ (`playlistGroupName()` — "Khác" cho mục không group) thay cho group thô trong file, để bảng "Thông tin bài…" hiện đúng nhóm như tiêu đề nhóm trong playlist (không thì mọi kênh radio đều hiện "(không rõ)").
- Test mới `iptv-groups-117-test.js` (jsdom, 566 + Classic base-2.91; 72 check): iptv.m3u parse ra 218 mục + 13 nhóm đúng số lượng; playlist vẽ 13 tiêu đề nhóm đúng thứ tự lần xuất hiện đầu tiên, kênh giữ thứ tự gốc trong nhóm; tiêu đề không phát/không chọn/không tính số mục/không match tìm kiếm (tim "Đà Nẵng" ra 3 mục/2 nhóm, tim "vtv" ra 31 mục/3 nhóm); file không group (radio.m3u cũ) hiện phẳng 41 hàng không tiêu đề; "Nguồn mặc định" nạp iptv.m3u (218 mục); "Xoá 1 bài"/"Xoá tất cả" chỉ tác động kênh; hồi quy: 566 + Classic không đổi hành vi khác. (Đường `<list>` generic cũng dùng `playlistGroupedRows()` nhưng không có skin nào trong bộ fixture dùng `<list>` trong Pledit nên không có test riêng cho nó.)
- Chưa kiểm chứng trên điện thoại thật — chờ Hải test: mở trang thấy playlist 218 mục gom theo 13 chuyên mục (Radio đầu tiên), bấm đúp kênh TV vẫn phát hình, tìm kiếm vẫn chỉ match tên kênh.


## Đợt v10.15 (04/11 — menu -rem + gộp trùng + "Nguồn mặc định")

> Hải yêu cầu 15:52: "Mục -rem ở danh sách nên thêm bấm vào hiển thị xoá 1 bài và xóa tất cả" — trước đây `PE_REM` bấm là xóa thẳng bài đang chọn, không menu, trong khi Add/Sel/Misc/List đều mở menu. Hải chỉ thêm 15:56: trùng "Nạp lại radio" (cả menu Add lẫn menu List) và "Xoá tất cả" trùng với -rem đang làm ("Xóa hết" đã có trong menu List + menu remove của Classic). Hải chốt 16:00: "Nạp lại radio" đổi tên thành "Nguồn mặc định" (chỉ đổi nhãn, hành động vẫn nạp lại radio.m3u 41 kênh); số "(41 kênh)" bỏ luôn vì là số cứng ghi chết trong nhãn, đổi nội dung radio.m3u thì số sẽ lệch.

- Sửa (`renderer.js`): thêm `removeMenuItems()` — 2 mục "Xoá 1 bài" (`removePlaylistItem(playlistState.selected)`) + "Xoá tất cả" (`clearPlaylist()`); `PE_REM` mở menu qua `showPlaylistMenu` như Add/Sel/Misc/List; nút remove Classic `pl-remove` dùng chung `removeMenuItems()` thay cho 2 mục riêng cũ ("Xóa mục đang chọn" + "Xóa hết") — cùng nhãn 2 skin. Gộp trùng: "Nạp lại radio" chỉ còn trong menu Add, "Xóa hết" chỉ còn trong menu -rem; menu List (`manageMenuItems`) chỉ còn "Lưu playlist (.m3u)". Đổi tên: mục trong menu Add thành "Nguồn mặc định" (tooltip nút Classic `pl-add` đổi theo: "Thêm (nguồn mặc định / nhạc local / URL)"; tooltip `pl-list` thành "Danh sách (lưu playlist)").
- Test mới `rem-menu-115-test.js` (jsdom, 566 + Classic base-2.91): bấm PE_REM mở menu đúng 2 nhãn; "Xoá 1 bài" chỉ xóa bài đang chọn; "Xoá tất cả" xóa hết; menu Add còn "Nguồn mặc định" + không còn "Nạp lại radio" (bấm vẫn gọi `onReloadRadio`); menu List chỉ còn "Lưu playlist (.m3u)"; Classic pl-remove cùng nhãn với Modern; hồi quy: bấm PE_REM không chọn mục thì không xóa gì.
- Chưa kiểm chứng trên điện thoại thật — chờ Hải test: bấm -rem hiện menu 2 mục, menu Add hiện "Nguồn mặc định", menu List chỉ còn "Lưu playlist (.m3u)".

## Đợt v10.14 (04/11 — limiter threshold về 0 dB: EQ bật ở preset Mặc định TO BẰNG EQ tắt)

> Hải báo 15:44: "Eq on hình như nhỏ hơn trước kia thì phải, có khi nào làm hiệu ứng cột giống webamp nên bị không nhỉ" — xác nhận 15:47: cùng kênh + EQ bật + preset Mặc định (phẳng, preamp 0 dB). Tiêu chí gốc v10.6 (điểm Hải thích nhất 04/11 07:23): EQ bật tiếng TO như EQ tắt.

- Nguyên nhân KHÔNG phải vis v10.11 (chỉ đổi cách ĐỌC analyser để vẽ cột — analyser là tap thụ động, không nằm trên đường tiếng) và KHÔNG phải chuỗi tiếng đổi: `audio.js`/`eqf.js` v10.13 so với v10.10/v10.8 trên GitHub chỉ khác số version; preset "Default" đặt đúng phẳng + preamp 0 dB + balance giữa; panner ở giữa = 0.00 dB (đo thật — giả thuyết StereoPanner -3 dB là SAI với Chrome).
- Nguyên nhân THẬT — DynamicsCompressor của Chrome cộng thêm gain makeup theo mức tín hiệu khi threshold < 0. ĐÃ ĐO THẬT bằng headless Chrome 156 (OfflineAudioContext, `eq-loudness-114-measure.mjs` + `eq-loudness-114b-measure.mjs` + `eq-loudness-114c-measure.mjs` trong `~/workspace/amp-v9-verify/`, lấy đúng tham số node từ engine thật qua `engine._graph()`): threshold -3/knee 3/ratio 20 cho **+1.2 dB** với tín hiệu dưới -4.5 dB (kể cả sine -40 dB), +1.18 dB với multi loud, -0.65 dB với sine 0 dB, nhạc stereo to -0.01 dB nhưng dải động bị bóp ~1.85 dB — chuỗi EQ ở Mặc định KHÔNG bằng unity nên EQ bật nghe khác EQ tắt. Preamp/biquad/master ở Mặc định đều = 0.00 dB; panner ở giữa = 0.00 dB.
- Sửa (`audio.js`, chỉ 2 hằng + ghi chú): `LIMITER_THRESHOLD_DB -3 → 0`, `LIMITER_KNEE_DB 3 → 0` (ratio 20, attack 0.002, release 0.1 giữ nguyên) — limiter chỉ còn là TRẦN CHỐNG CLIP trên 0 dBFS. Đo lại sau sửa: **0.00 dB đúng trên MỌI tín hiệu ≤ 0 dBFS** (sine -12/-3/-1/0, multi loud, nhạc stereo L/R khác nhau), cả knee 0 lẫn knee 3 đều 0.00 dB (chọn knee 0 vì trần cứng hơn: preamp +12 dB thì đỉnh giữ ở +0.44 dB thay vì +6 dB; knee 3 để lọt tới +1.28 dB). Preset boost khác không đổi hành vi (vẫn qua limiter trần 0 dB).
- Test mới `eq-loudness-114-test.js` (jsdom, 28 PASS): limiter threshold 0 / knee 0 / ratio 20, preamp gain 1.0 + 10 dải 0 dB ở Mặc định, topology chuỗi không đổi, routing EQ bật (el.volume=1, master=volume) / EQ tắt (native), preset boost vẫn qua limiter trần 0 dB. Số dB thật nằm ở 3 file measure `.mjs` (jsdom stub không có DSP thật nên không đo dB được trong test này).
- Chưa kiểm chứng trên điện thoại thật — chờ Hải test: cùng kênh, EQ bật Mặc định so với EQ tắt phải TO BẰNG nhau.

## Đợt v10.13 (04/11 — tick Options "Tự mở cửa sổ video khi phát video")

> Hỏi của Hải 14:46: "Bên trong có chỗ nào cài đặt không tự mở cửa sổ video vi phát video không bạn" — từ v8 tới nay, phát kênh video thì Amp TỰ MỞ cửa sổ video (nhúng nếu có, rời nếu Classic), không có mục nào tắt được; 2 mục "Open Video/Vis from the top/bottom" chỉ chọn vị trí mở. Chốt 14:46: thêm 1 mục tick trong menu Options, mặc định BẬT (vẫn tự mở như hiện tại).

- Sửa (`renderer.js`): mục tick "✓ Tự mở cửa sổ video khi phát video" trong menu Options (`optionsMenuItems`, cạnh mục Crossfade — menu dựng mới mỗi lần mở nên ✓ luôn đúng). Winamp thật không có tùy chọn này nên không skin nào có cfgattrib cho nó: trạng thái lưu trong `cfgState` dưới khóa tổng hợp `amp;Auto-open Video Window when playing video` (tiền tố `amp;` để không đụng GUID cfgattrib của skin), mặc định BẬT trong `CFG_DEFAULTS` (`"Auto-open Video Window when playing video": "on"`), lưu/khôi qua cùng đường localStorage (`amp9-cfg-v9`) như các tick Options khác. `playPlaylistItem` chỉ gọi `openAvs("video")` khi tick đang BẬT (`autoOpenVideoEnabled()`); tắt thì phát TV chỉ nghe tiếng, cửa sổ video giữ nguyên trạng thái đóng — mở tay bằng nút video (oval ▼ / VID_Misc), menu View / Video, nút "Mở Video" (các đường mở tay KHÔNG qua `playPlaylistItem` nên không bị chặn). Cả 2 đường: video nhúng trong main (Modern) và video rời (Classic) — cùng 1 chỗ chặn.
- Test mới `auto-open-video-113-test.js` (jsdom, 566 + Classic base-2.91): mặc định BẬT + menu có tick ✓; tắt → phát kênh video không mở AVS; tắt → nút video tay vẫn mở được; bật lại → tự mở như cũ; trạng thái lưu/khôi qua `getCfgState`/`restoreCfgState`; Classic tắt → cửa sổ rời không mở, bật → mở rời.
- Chưa kiểm chứng trên trình duyệt thật (điện thoại/PC) — chờ Hải test như mọi đợt.

## Đợt v10.12 (04/11 — loader/renderer cho 10 skin Winamp Modern thật, phân tích 11:35 cùng ngày)

> Chỉ BLAKK vẽ gần đúng (436×160); 9 skin còn lại sai cỡ / cửa sổ đen / kẹt chữ mẫu / mất panel — không phải do skin hỏng mà do loader/renderer Amp chỉ đúng với skin 566 (không dùng `background` của layout, có w/h đầy đủ, `display` viết thường). Cpro không sửa được (giao diện nằm trong engine ClassicPro ngoài .wal, 0 layout).

### 1. P0 B — cỡ layout đo từ ảnh nền (không fallback cứng 354×280)
- Báo: D-Reliction 433×225 bị cắt thành 354×280; Act3 (173×123), DreddfulAmp (285×135), EMP (185×280), CROSSNET (294×214) sai cỡ.
- Sửa (`skin-loader.js`): thứ tự ưu tiên w/h XML → default_w/h của container → cỡ ảnh nền layout thật (đo bằng `imgSize` đã có) → bao nội dung (`contentBoxSize`: mép phải/dưới lớn nhất của các con tuyệt đối + instance group) → 354×280. Ảnh nền là thuộc tính `background` (việc 2) nên 2 việc dùng chung 1 lần resolve; `contentH` tính lại sau khi vá.
- Lưu ý: crop bitmap 0×0 (CROSSNET `equalizer.background` chỉ có x/y, không w/h) được coi như không crop — trước đây `spriteDiv` chia cho 0.

### 2. P0 A — vẽ `background` của layout làm lớp đáy
- Sửa: loader lưu `background` (+`alphabackground`) vào entry layout; renderer vẽ nó ĐẦU TIÊN trong stage (`data-layout-bg="1"`), đúng cỡ ảnh thật (không kéo giãn khi ảnh nhỏ hơn layout), qua id bitmap hoặc đường dẫn file trực tiếp (WMP12 `player/background.png`). Skin 566 không dùng thuộc tính này nên không đổi gì. Cứu WMP12, EMP, CROSSNET, DreddfulAmp khỏi cửa sổ đen (Braun không có `background` trong XML — nền của nó là các layer, vẫn đúng).

### 3. P0 C — `display` không phân biệt hoa/thường + đủ map
- Báo: CROSSNET (`TIME`/`SONGNAME`), WMP12 (`songtitle`/`songartist`/`songalbum`), Act3 (`SONGNAME` kẹt), Braun (`songinfo`/`songlength`), DreddfulAmp (`songbitrate`/`songsamplerate` + id thường `bitrate`/`sample`) hiện nguyên chữ display.
- Sửa (`renderer.js` `renderText`): lowercase `display`/`id` trước khi so sánh; map mới `trackDisplayText`: songtitle→tên bài, songartist→nghệ sĩ, songalbum→album, songlength→thời lượng, songbitrate→bitrate, songsamplerate→tần số, songinfo→dòng "`<kbps> kbps <khz> kHz`", systemclock→giờ hệ thống; id `Bitrate`/`Frequency` so không phân biệt hoa/thường. **Khối nhánh hiển thị động trước đây chỉ chạy khi font là bitmapfont** — nay chạy cho MỌI loại font (`makeBitmapText` tự về Arial khi font là truetypefont), vì các skin lỗi đều dùng truetypefont. Nhãn tĩnh không display thì chỉ hiện `default`, không hiện tên display (vd `ERROR`, `componentbucket`).

### 4. P1 D — XUI qua `xuiMap` + TitleBox/`<list>`/placeholder
- Sửa (`renderer.js`): tag lạ tra `xuiMap` (groupdef `xuitag`) — tên đầy đủ qua `data-xui` loader ghi khi lột namespace (vd `wasabi:standardframe:status`), hoặc tag trần (`copcheckbox` → `cop.checkbox`). `renderTitleBox`: dải 3 mảnh left/center/right + chữ tiêu đề (`:componentname` = thuộc tính `title`) + nhóm nội dung (`content`) bên dưới, đúng vị trí `CustomObject titlebox.content` khi có `wasabi.titlebox.main.group`. `<list>`: khung có viền, trong playlist thì hiện các mục hiện tại, nơi khác thì khung trống có ghi chú. `NowPlaying`/`PlaylistPro`/`mycheckbox`/`browser`: khung trống nét đứt có ghi chú (ruột do MAKI/plugin quyết định, không bịa nội dung). `<SysCmds>`: nút min/close từ bitmap `wasabi.button.*` của skin (không có bitmap thì không vẽ). `<Wasabi:TitleBar>` thiếu groupdef thì vẽ chữ tiêu đề tối thiểu. Nhãn do script điền: text không display + default rỗng/`"ERROR"` thì lấy `labeltext`/`text`/`title` của phần tử XUI (`ctx.xuiLabelText` — đúng việc script `.maki` của skin làm lúc chạy; vd checkbox Copperdeck hiện "Always On Top" thay vì "ERROR"). `opts.showGroups` mới: ép hiện nhóm `visible="0"` mà MAKI sẽ hiện khi chọn tab (cơ chế chung như ngăn kéo, không hardcode tên nhóm — dùng để mở panel config của Copperdeck). Thẻ `<ColorThemes:...>` qua `cleanXml` thành tag trần + `data-xui` nên `renderChildren` kiểm tra cả `data-xui` để không vẽ nhầm thành `<list>`.

### 5. P1 H — pledit tổng hợp cho skin có `pledit.content.group` mà thiếu layout
- Báo: Act3 có groupdef `pledit.content.group` (chứa `<component>` playlist) nhưng không có layout pledit → không có cửa sổ playlist.
- Sửa (`skin-loader.js`): dựng layout `pledit|normal` tổng hợp 436×164 (cỡ pledit 566, cờ `synthesizedPledit`) chứa instance của groupdef đó. Skin không có groupdef này (WMP12/Braun/DreddfulAmp) không bị ảnh hưởng.

### 6. P1 E + F — groupdef chuẩn tự cấp + báo file thiếu trong `.wal`
- Sửa: loader tự cấp groupdef rỗng cho `wasabi.window.embedded`, `wasabi.panel`, `wasabi.objectframe.group`, `wasabi.titlebar` khi thiếu (ghi vào `report.notes`); groupdef lạ thiếu thì ghi vào `report.missing` dạng `groupdef: <id>` thay vì vẽ trống im lặng. Ảnh thiếu: loader quét sau khi gom bitmap, dedupe theo file, ghi `report.missing` dạng `ảnh: <file> (bitmap <id>)`; include thiếu ghi `xml: <path>`; ClassicPro ghi `report.classicPro = true` + note. Số đo thật: CROSSNET thiếu 8 file ảnh (phân tích cũ nói "17 ảnh" = 17 bitmap ref chung 8 file), Copperdeck 18, BLAKK 16, Braun 10 (8 XML + 2 ảnh — phân tích cũ nói 6 XML, đếm lại là 8 đường dẫn duy nhất: xml/ml.xml, xml/vis.xml, xml/video.xml, about/player-elements.xml, xml/system-elements.xml, xml/system-colors.xml, xml/playlist.xml, xml/xml/eq.xml), EMP 1 XML, DreddfulAmp 2, Act3 2 XML, D-Reliction 0, WMP12 0, Cpro 0, 566 0. `index.html` ghi danh sách file thiếu vào console sau dòng ghi chú; hộp About (renderer `openAbout`) liệt kê tối đa 8 file thiếu + ghi chú.

### 7. P2 G — lỗi ClassicPro nêu rõ tên engine
- Báo: Cpro (0 layout) báo lỗi chung chung.
- Sửa: lỗi `SKIN_UNSUPPORTED` khi `report.classicPro` thì ghi rõ "Skin này dùng ClassicPro — giao diện nằm trong engine ClassicPro (Plugins/classicPro/engine) ngoài file .wal, Amp không vẽ được (cần engine ClassicPro)"; giữ `code = "SKIN_UNSUPPORTED"` để `index.html` giữ skin cũ như trước, không crash.

### Việc CHƯA làm (để sau, không làm trong đợt này)
- **I — ngăn kéo EQ theo cấu trúc:** ngăn kéo EQ hiện vẫn theo cấu trúc skin 566 (chưa dựng từ XML của từng skin như giao diện chính).
- **J — biến thể Braun:** Braun có 8 biến thể (xml thiếu trong .wal) — chưa xử lý chọn biến thể.
- Chưa kiểm chứng trên trình duyệt thật (điện thoại/PC) — chờ Hải test như mọi đợt.

### Kiểm chứng đợt v10.12

- Test mới `multi-skin-112-test.js` (jsdom + CHÍNH 10 file `.wal` thật làm fixture, đọc từ `~/workspace/user/files/`, không copy skin vào zip) — **70 PASS, 0 FAIL**: WMP12 687×449 hết đen + hết chữ mẫu + placeholder NowPlaying/PlaylistPro; D-Reliction 433×225 hết cắt; Act3 173×123 + pledit tổng hợp 436×164 vẽ được playlist; CROSSNET 294×214 + bitrate 128 / samplerate 44 / songinfo "128 kbps 44 kHz" + báo 8 file thiếu; DreddfulAmp 285×135 + bitrate/samplerate id thường; EMP 185×280; Braun 800×158 + songinfo + báo XML thiếu; Copperdeck 645×135 + TitleBox "General Settings" + checkbox "Always On Top" (không "ERROR"); Cpro lỗi `SKIN_UNSUPPORTED` nêu rõ ClassicPro; BLAKK 436×160 + 566 354×280 không hồi quy (566 không dùng background layout, 0 file thiếu, loader version 10.12).
- jsdom toàn suite: **56 file, 4910 PASS, 0 FAIL** (kết quả từng file trong `~/workspace/amp-v9-verify/suite112-final/`). v10.11 là 4840 PASS (55 file); tăng 70 đúng bằng test mới `multi-skin-112-test.js` (70 PASS). 18 file test cũ chỉ đổi kỳ vọng version 10.11 → 10.12 (chỉ chuỗi version, `stage-border-109-test.js` sửa thêm regex `?v=`), không đổi kỳ vọng hành vi nào.
- Chưa kiểm chứng trên trình duyệt thật (điện thoại/PC) — chờ Hải test như mọi đợt.

## Đợt v10.11 (04/11 — 1 việc theo báo của Hải 11:12–11:13, ảnh 1000094752_5_gm91.jpg + 1000094754_6_9d4m.jpg)

> Hiệu ứng cột mấy dải tần số cao không nhảy như của Webamp — các cột bên phải (dải cao) đứng yên/thấp trên cả skin Modern 566 lẫn Classic khi phát CHERRY RADIO, trong khi Webamp nhảy đều.

### 1. Vis BAR dải cao không nhảy (cột 12–15 chết)
- Báo của Hải (11:12–11:13, điện thoại thật, CHERRY RADIO 0:42 skin 566 + 00:20 skin Classic): "Hiệu ứng cột mấy dãi tần số cao nó không nhảy như của webamp 2 cái như cách làm khác nhau".
- Nguyên nhân gốc (đọc code Webamp + Amp, không đoán): Webamp lấy `getByteTimeDomainData` → FFT Nullsoft riêng → 512 bin bao 0..Fs/4 (~11kHz) → **bảng equalize** (`initEqualizeTable`: bias=0.04, `eq[i]=log10(1+bias+(i+1)*(9-bias)/512)`, `bias/=1.0025` mỗi bin: eq[0]≈0.024 → eq[511]≈1.0, boost dải cao ~40x ≈ +32dB) → ánh xạ LOG scale 0.91 trên 75 cột. Amp (`renderer.js` `visBarHeight`) đọc 1 bin TUYẾN TÍNH trên toàn bộ 512 bin analyser (0..Fs/2 ~22kHz), không equalize, không ánh xạ log: cột 12–15 đọc bin 384–480 = 18–22,5kHz, nơi stream radio 128kbps gần như không còn năng lượng (lowpass ~16kHz) → byte ≈ 0 → cột chết. Giả thiết "falloff đè dải cao" là SAI — đường display không có falloff/peak (vẽ trực tiếp `2 + (bin/255)*(H-6)`).
- Sửa (`renderer.js`, chỉ đường vis BAR display + Classic chung đường — không đụng `drawAvsVis`/`avsLogTarget` (code chết từ v10.3), Milkdrop, EQ/audio chain, màu vis): (a) `getVisEqualizeTable(n)` — port bảng equalize Nullsoft y nguyên, tham số hoá theo N bin, cache theo N (N=1 → eq[0]=1; N=512 khớp Webamp). (b) Trong `drawVisStatic`, mode "real": tính 1 lần/khung mảng biên độ đã equalize từ byte freq — dB = minDb + (byte/255)*(maxDb−minDb) (đọc `minDecibels`/`maxDecibels` của analyser nếu có, fallback −100/−30), linear = 10^(dB/20), emag[i] = linear × eq[i] — rồi chuẩn hoá theo peak tracker module (`peak = max(peak×0.995, framePeak)`, reset khi rời mode "real" hoặc đổi analyser qua `setAvsAnalyser`/`resetAvsVisState`); norm[i] = emag[i]/peak. **Chỉ lấy NỬA ĐẦU bin analyser** (0..Fs/4): FFT của Webamp chỉ bao tới Fs/4 nên cột cao nhất của Webamp đọc ~11kHz (radio vẫn còn năng lượng); lấy hết 512 bin thì cột cao nhất vẫn đọc 22kHz = vùng chết — đây là điểm then chốt ngoài bảng equalize. Mảng `freq` thô giữ nguyên cho beat (bass bin thô) và OSC (time-domain). (c) `visBarHeight` nhánh "real": ánh xạ LOG scale 0.91 nội suy 2 bin kề (cùng toán như `avsLogTarget`, tách helper `visLogValue`) của 16 cột trên mảng norm; chiều cao = `2 + norm×(H−6)` (giữ thang cũ để cột bass/mid không đổi tầm). Nhánh "flat" (2px) và "sample" (sine) giữ nguyên y hệt. Màu cột giữ nguyên theo XML skin (`ColorBand1..16` Modern, `viscolor.txt` Classic) — chỉ đổi cách lấy giá trị. (d) Sửa comment cũ dòng ~7351 ghi "fftSize 64 → 32 bin" (sai từ v10.2) thành "fftSize 1024 → 512 bin".
- Kiểm chứng: test mới `vis-highfreq-111-test.js` (jsdom + analyser giả 512 bin, phổ giả lập stream radio thật: bass 230, mid 180, 8–12kHz 110, ~0 trên 16kHz) — **50 PASS, 0 FAIL**: bảng equalize khớp Webamp (eq512[0]≈0.0243, eq512[511]=1.0, boost 41,2x; N=1/32 đúng); cột 12–15 Modern = 19,64/6,25/6,92/5,00px (code cũ: 2,00px chết) và Classic = 11,29/4,24/4,59/3,58px; cột 15 giảm 5,00→2,53 khi bin 8–12kHz giảm một nửa, tăng lên 21,00 khi tăng gấp đôi; peak tracker: khung nhỏ (byte ×0,8) max 7,68 (không sập về 0, vẫn tỉ lệ nhỏ hơn khung to 19,64), sau 200 khung nhỏ peak rớt về mức mới (max 17,49), đổi analyser/rời mode real thì reset; flat = 2px, sample sine, OSC không hồi quy, min/maxDecibels riêng vẫn chạy; analyser giả 32 bin vẫn đúng (kỳ vọng cũ vis-bar-107 C2 giữ nguyên). Không sửa test cũ nào (mọi kỳ vọng cũ vẫn đúng với cách làm mới).
- Chưa kiểm chứng trên trình duyệt thật (điện thoại/PC) — chờ Hải test như mọi đợt.

### Kiểm chứng đợt v10.11

- jsdom toàn suite: **55 file, 4840 PASS, 0 FAIL** (kết quả từng file trong `~/workspace/amp-v9-verify/suite111-final/`). v10.10 là 4790 PASS (54 file); tăng 50 đúng bằng test mới `vis-highfreq-111-test.js` (50 PASS). 17 file test cũ chỉ đổi kỳ vọng version 10.10 → 10.11 (stage-border-109-test.js sửa thêm regex `?v=`), không đổi kỳ vọng hành vi nào.
- Chưa kiểm chứng trên trình duyệt thật (điện thoại/PC) — chờ Hải test như mọi đợt.

## Đợt v10.10 (04/11 — 1 việc theo báo của Hải 10:21–10:22, ảnh 1000094747_1_t1pd.jpg)

> Fill volume/seek ở MAX dừng đúng MÉP PHẢI NHÌN THẤY của nút — hết vạch xanh thừa ra phải nút trắng trên điện thoại thật; bump version lên 10.10; không đổi gì khác.

### 1. Fill volume ở MAX vẫn còn thừa ra phải nút tròn trắng
- Báo của Hải (10:21–10:22, ảnh `1000094747_1_t1pd.jpg`, trang longhai.github.io/amp/): "Lên max còn" — kéo volume lên MAX thì vạch fill xanh vẫn còn thừa ra phía phải của nút tròn trắng; "Còn xuống min thì không thấy" — kéo về MIN thì không thấy thừa nữa (đầu min v10.9 đã sửa đúng). Đã kiểm tra GitHub Pages đang chạy đúng v10.9 (`AMP_VERSION = "10.9"`, renderer.js có công thức mới) nên không phải bản cũ.
- Nguyên nhân gốc (đo thật bằng headless Chrome, viewport 360px + fit zoom scale 1.01695, không đoán): công thức v10.9 đúng với DIV nút — ở MAX, DOM cho fill L=188.14 W=85.42 R=273.56, thumb div L=252.20 W=21.36 R=273.56, **sai số 0** — nhưng SAI với mắt người: bitmap nút có ~2,5px trong suốt ở mép phải (`button_volume.png`: cột x=17 alpha 240, x=18 alpha 93, x=19 alpha 26, x=20 alpha 3; nút trắng nhìn thấy chỉ tới ~x=18,5 trong ô 21px) nên ~2,5px vạch xanh vẫn hiện ra phải nút trắng. Đo pixel trên ảnh chụp headless xác nhận: xanh thừa ~2,5px sau viền tối phải của nút; đo trên ảnh điện thoại của Hải: ~4,6px layout (sai số đo ảnh JPEG ±1px). Cùng lỗi ở seek (36px: hết alpha >128 ở x=33), shade volume (16px: x=13), shade seek (24px: x=21).
- Sửa (`renderer.js`): (a) helper mới `measureThumbVisibleRight(bitmapId)` — đo mép phải nhìn thấy từ bitmap thật của skin đang nạp: cắt đúng vùng crop của bitmap nút, vẽ lên canvas, quét từ phải sang tìm cột cuối có alpha > 128 → visibleRight = cột đó + 1 (px trong ô nút); trả null khi không đo được (jsdom/không canvas/ảnh lỗi) → dùng `tw` (hành vi v10.9). Cache theo id bitmap trong lần nạp skin này. Không hardcode số 566 — skin khác có nút khác thì đo lại từ bitmap của nó. (b) `renderSlider`: `rec.visibleRight` mặc định = `tw`; với slider VOLUME/SEEK thì đo bất đồng bộ (không chặn render — trước khi đo xong dùng hành vi cũ, đo xong vẽ lại fill qua `updateVolumebar`/`updateProgress`). (c) `fillWidthToThumbRight`: điểm đích nay là mép phải nhìn thấy — `fillW = (sliderAbsX − fillAbsX) + f×(trackW − tw + visibleRight)`: volume 566 (slider 183/w86 tw21 vr18, fill 185): 0→0, 0.5→40, 1→81 (nút trắng nhìn thấy tới 266, không còn xanh thừa); seek (slider 6/w254 tw36 vr34, fill 10): 0→0, 0.5→122, 1→248; shade volume (slider 164/w56 tw16 vr14, fill 168): 0→0, 0.5→23, 1→50. Đầu min giữ nguyên 0→0px. Classic không có fill dạng width nên không đổi.
- Kiểm chứng: `volume-fill-108-test.js` cập nhật kỳ vọng mới (volume 0/40/81, seek 0/122/248, shade 0/23/50) + giữ kiểm fallback chưa đo (số v10.9 cũ: 84/250/52) + kiểm `visibleRight` mặc định = `tw`; jsdom không đọc được pixel ảnh nên test seed tay giá trị đo thật (volume 18, seek 34, shade volume 14) — **45 PASS, 0 FAIL**. Đo lại bằng headless Chrome 360px + fit zoom trên code mới: fill ở MAX dừng đúng mép phải nhìn thấy của nút (xem mục "Kiểm chứng đợt v10.10").

### Kiểm chứng đợt v10.10

- jsdom toàn suite: **54 file, 4790 PASS, 0 FAIL** (kết quả từng file trong `~/workspace/amp-v9-verify/suite110-final/`). v10.9 là 4783 PASS (54 file); tăng 7 do `volume-fill-108-test.js` thêm kiểm fallback + `visibleRight` mặc định (45 PASS).
- Headless Chrome thật (viewport 360px, fit zoom 1.01695): đo DOM + pixel ảnh chụp sau khi sửa — fill ở MAX dừng đúng mép phải nhìn thấy của nút trên cả volume lẫn seek, đầu min vẫn 0px; kéo chuột thật tới max/min cho cùng kết quả như lúc load.
- Chưa kiểm chứng trên trình duyệt thật (điện thoại/PC) — chờ Hải test như mọi đợt.

## Đợt v10.9 (04/11 — 4 việc theo báo của Hải 09:32–09:47, ảnh image-18 → image-22)

> Bỏ box-shadow khỏi `.stage` + sửa closer menu dính + sửa fill volume ở mức 0 + tách nhóm menu View/videoavs; bump version lên 10.9; không đổi gì khác.

### 1. Bỏ viền xung quanh máy nghe nhạc
- Nguyên nhân gốc (ảnh image-18): CSS `.stage` trong `index.html` có `box-shadow:0 0 0 1px #333, 0 8px 30px rgba(0,0,0,.6)` — viền 1px #333 + bóng đổ quanh toàn bộ khung player, nhìn như khung viền bao quanh máy nghe nhạc. Winamp thật trên desktop không có khung này (cửa sổ nổi trên desktop).
- Sửa: bỏ hẳn `box-shadow` khỏi `.stage` (cả viền 1px lẫn bóng đổ). Chỉ gỡ ở `.stage` — `#btn-reopen` (nút "Mở lại Amp") và `#maki-panel` (bảng xem MAKI) vẫn giữ bóng đổ vì đó là cửa sổ nổi/dialog, không phải khung player.
- Kiểm chứng: jsdom toàn suite (xem mục "Kiểm chứng đợt v10.9" bên dưới).

### 2. Menu ngữ cảnh videoavs.open bị DÍNH (không đóng được)
- Báo của Hải (09:40, ảnh image-19): bấm nút oval ▼ góc phải trên thì menu ngữ cảnh 13 mục mở ra nhưng DÍNH, không đóng được (bấm ngoài/Esc/bấm nút lần 2 đều không đóng).
- Nguyên nhân gốc (tìm bằng test tái hiện, không phải do thiếu closer — `showPlaylistMenu` đã gọi `armPanelCloser` từ v10.8): closer cũ chỉ gắn listener qua `setTimeout(0)` và CHỈ khi `lastStage.querySelector("[data-pl-menu]")` còn thấy menu lúc timeout chạy. `lastStage` là biến đổi được: render nguyên tử đặt `lastStage = build` (div tách rời) lúc bắt đầu vẽ (qua hàng đợi `queueTopRender` → microtask), chỉ trả về `live` ở `swapIn()` lúc xong — nếu 1 lần vẽ lại bắt đầu trong lúc menu đang mở (vd: video vừa load xong metadata, hoặc bấm nút đúng lúc render đang chạy với ảnh load chậm trên trình duyệt thật) thì closer hỏi nhầm `build` (không có menu) → `closePlaylistMenus` chỉ dọn trong `build` → menu trong `live` còn nguyên, bấm nút lần 2 cũng không đóng (`isPopupMenuOpen` cũ cũng hỏi `lastStage`). Không tái hiện được trên jsdom bằng test cũ (test v10.8 mục G chỉ gọi trực tiếp `btn.onclick()` + `onRerender` là no-op nên không bao giờ vẽ lại thật).
- Sửa (`renderer.js`): (a) `armPanelCloser(anchorDiv)` gắn listener ĐỒNG BỘ ngay lúc mở menu (không `setTimeout`); cú click MỞ menu nổi bọt lên document sau đó được chặn bằng 2 lớp: target nằm trong anchor (nút vừa mở menu) HOẶC trong 25ms đầu sau khi gắn (cú mở chạy cùng task với target-phase, tới document sau vài micro-giây; bấm ngoài thật của người >100ms nên không bị chặn); bấm nút lần 2 (toggle) vẫn qua `div.onclick` trước (target phase) nên vẫn đóng đúng. (b) `insideMenu` / `closePlaylistMenus` / `isPopupMenuOpen` hỏi DOCUMENT (qua helper mới `allOpenMenus()`, thêm cả menu đang nằm trong `build` tách rời) thay vì `lastStage`. (c) Cả 7 chỗ gọi `armPanelCloser()` đều truyền anchor (LocalAdd / EQF chooser / EQ presets / showPlaylistMenu / trackinfo / prefs / About).
- Kiểm chứng: test mới `menu-stuck-109-test.js` — click NỔI BỌT thật (`dispatchEvent MouseEvent bubbles:true`, không gọi trực tiếp `onclick()`) + `onRerender` thật (`renderStacked`), 60 PASS: mở/đóng bằng click thật ra ngoài (body + nút PLAY trong stage), toggle bấm nút lần 2, chọn mục xong đóng, Esc, AVS mở + tách rời (đúng trạng thái ảnh image-19: menu có ✓ Mở Video), mở menu trong lúc render đang chạy, và mục E2 hồi qui lỗi cũ (bấm ngoài trong lúc `lastStage = build`): **code cũ v10.8 FAIL đúng 1 mục E2 (menu dính), code mới PASS hết** — chứng minh test bắt đúng lỗi. Test cũ `vis-menu-108-test.js` vẫn 87 PASS.

### 3. Fill volume ở mức 0 vẫn còn DƯ một đoạn
- Báo của Hải (09:43, ảnh image-21): "kéo xuống hết vẫn dư" — kéo volume về 0 (nút tròn trắng ở đầu trái) mà vẫn còn dư một đoạn vạch sang phải.
- Nguyên nhân gốc: công thức v10.8 (`fillWidthToThumbRight` tính tới MÉP PHẢI nút) SAI ở đầu 0: ở frac=0, fill vẫn rộng bằng `tw` (bề rộng nút — volume 19px = 204−185) — đoạn dư đó chính là bề rộng nút. Test v10.8 cũ đã khóa nhầm hành vi này (kiểm `fillRight == thumbRight` cả ở 0).
- Sửa: công thức mới `fillW = (sliderAbsX − fillAbsX) + frac × trackW` — fill kết thúc tại điểm trên nút chạy tuyến tính từ MÉP TRÁI nút (frac=0) tới MÉP PHẢI nút (frac=1): volume 566 (slider 183/w86, fill 185): 0→0px, 0.5→41px (đúng tâm nút), 1→84px (đúng mép phải nút); seek (slider 6/w254, fill 10): 0→0px, 0.5→123px, 1→250px; shade (slider 164/w56, fill 168): 0→0px, 0.5→24px, 1→52px. Cả 1x lẫn fit (fill tính bằng px layout, không phụ thuộc zoom). Fallback khi không tìm được slider cũng bỏ `Math.max(2, …)` (ở 0 fill phải về 0). Balance/preamp/EQ không có fill nên không đổi; Classic không có fill dạng width (chỉ thumb + đổi nền track) nên không đổi.
- Kiểm chứng: `volume-fill-108-test.js` cập nhật kỳ vọng mới (0→0px, 0.5→tâm nút, 1→mép phải nút), 38 PASS (ít hơn 45 cũ vì thay helper 2-kiểm tra bằng 1-kiểm tra rộng + thêm 1 kiểm tra shade-0).

### 4. Tách nhóm menu View + menu Video/Hiệu ứng bằng đường kẻ
- Báo của Hải (09:47, ảnh image-22): "menu hơi rối nên chưa ra từng loại" — menu View 1 danh sách dài 15 mục trộn lẫn (bật/tắt cửa sổ + zoom + cỡ video) nên khó nhìn.
- Sửa: `showPlaylistMenu` hỗ trợ mục `{sep: true}` vẽ ĐƯỜNG KẺ phân cách (vạch `#ACA899`, margin 2px 0 — cùng kiểu với vạch trong menu preset EQ và kiểu menu Winamp thật), không phải hàng bấm được (không `data-menu-item`, không hover, không onclick) nên không ảnh hưởng đếm mục trong test cũ. Menu View tách 3 nhóm: (1) Cửa sổ: Playlist Editor / Media Library / Ngăn kéo / Video / Hiệu ứng / Thu gọn; (2) Zoom: Cỡ gốc 1x / Vừa màn hình; (3) Video: Giữ tỉ lệ / Cỡ thường (1x) / Cỡ gấp đôi (2x) / Toàn màn hình / Phóng to / Tách rời / Đóng. Menu ngữ cảnh videoavs.open tách 4 nhóm tương tự: (1) Mở: Mở Video / Mở Hiệu ứng; (2) Cỡ video; (3) Hiệu ứng: Màu ×3 + Milkdrop; (4) Đóng. Menu Vis (chỉ 4 mục hiệu ứng) là 1 nhóm nên không tách. Chỉ tách nhóm, không đổi mục hay hành vi nào; menu vẫn đóng đúng bằng closer chung (bấm ngoài/chọn mục/Esc/toggle).
- Kiểm chứng: mục H trong `menu-stuck-109-test.js` (19 kiểm tra): View 15 mục + 2 vạch đúng vị trí (sau Thu gọn, sau Zoom: Vừa màn hình), videoavs 13 mục + 3 vạch đúng vị trí, vạch không phải hàng bấm, cả 2 menu vẫn đóng khi bấm ngoài.

### Kiểm chứng đợt v10.9

- jsdom toàn suite: **54 file, 4783 PASS, 0 FAIL** (kết quả từng file trong `~/workspace/amp-v9-verify/suite109-final2/`). v10.8 là 4674 PASS (52 file); tăng do 2 test mới/cập nhật: `stage-border-109-test.js` (56 PASS, viền `.stage`), `menu-stuck-109-test.js` (60 PASS, menu dính + tách nhóm), `volume-fill-108-test.js` cập nhật kỳ vọng fill ở 0 (38 PASS), `dotmenu-remove-107-test.js` (125 PASS) và `video-button-105-test.js` (150 PASS) chạy lại được sau khi sửa crash do mục `sep` thiếu `label`.
- Hồi qui lỗi menu dính: mục E2 trong `menu-stuck-109-test.js` FAIL đúng 1 mục với closer cũ v10.8 (menu dính khi bấm ngoài trong lúc `lastStage = build`), PASS với closer mới v10.9 — đã kiểm chứng bằng cách khôi phục tạm closer cũ, chạy test, rồi trả lại code mới.
- Chưa kiểm chứng trên trình duyệt thật (WebGL/Milkdrop, bấm/chạm thật trên điện thoại/PC) — chờ Hải test như mọi đợt.

## Đợt v10.8 (04/11 — 11 việc theo yêu cầu Hải 08:19–09:08, ảnh image-8 → image-13)

> Chỉ sửa `index.html` + `renderer.js` + `milkdrop.js` + test; không khôi phục skin-browser.js / nút ⋯; không thêm tính năng mới ngoài 11 việc này.

### 1. Gỡ thanh extras trong tab EQ; "Default" thành preset bình thường đầu menu PRESETS
- Nguyên nhân gốc (ảnh image-8): nhãn preset hiện "Preset: Fl..." (tên bị cắt vì nhãn chỉ rộng 64px trong thanh 132×14) và thanh nằm NGOÀI tab EQ, chồng lên dải tab EQUALIZER/OPTIONS bên dưới — div group EQ không có `position:absolute` nên `top:75px` của thanh tính theo offsetParent khác (drawer/stage) thay vì theo group. Hải chốt 08:19 "trở về như trước cái mặc định nằm trong menu bên trong mà" → không sửa vị trí/kích thước thanh nữa mà GỠ HẲN.
- Nay: xóa `renderEqExtras` + `refreshEqExtrasBar` + mọi lời gọi (không còn `data-eq-extras-bar` / `data-eq-preset-label` / `data-eq-default` trong code); nút PRESETS của skin mở lại menu preset như trước. `EQ_PRESETS` thêm `"Default": [0×11]` làm mục ĐẦU menu (23 preset): bấm thì EQ phẳng + balance về giữa 0.5 (như "Flat" cộng thêm balance giữa); phẳng + balance giữa thì `matchEqPresetName()` suy ra "Default" (in đậm trong menu như các preset khác; phẳng mà balance lệch thì vẫn là "Flat"). (09:08 đổi tên từ "Mặc định" sang "Default" — xem mục 10.)

### 2. Tay kéo co giãn vô hình như Webamp
- Nguyên nhân gốc: `attachResizeHandles` vẽ vạch trắng (`linear-gradient` + `box-shadow` inset) trên mép cửa sổ; Webamp không hiện tay kéo, chỉ kéo mép là co giãn.
- Nay: bỏ hẳn background/box-shadow (nền trong suốt); chỉ giữ chức năng kéo (pointer-events, cursor ew/ns/nwse-resize, touch-action, z-index 30, vùng kéo 10px mép / 24×24 góc). Classic không dùng `attachResizeHandles` nên vốn đã không có tay kéo — không gì để sửa ở đó.

### 3. Căn giữa trên PC (1 cửa sổ + xếp chồng)
- Nguyên nhân gốc (ảnh image-9/10): Amp chỉ lưu kích thước cửa sổ, KHÔNG lưu vị trí — không phải vị trí cũ thắng căn giữa. `.stage` dùng `margin:0 auto` + `transform: scale(s)` với `transform-origin:0 0` nên `auto` chỉ căn giữa **hộp layout chưa zoom** (LW), còn cửa sổ nhìn thấy rộng LW×s nên lệch phải LW×(s−1)/2 (ở zoom Fit ~2.5x lệch ~265–330px; xếp chồng ở 1x gần như không lệch nên trông "vào giữa").
- Nay: `setZoom` trong `index.html` tính `marginLeft`/`marginRight` theo **bề rộng đã zoom** (`side = (clientWidth − LW*s)/2`, ≥ 0; tràn thì về 0, cuộn ngang như trước). Căn giữa ngang đúng cả 1 cửa sổ lẫn xếp chồng, ở 1x lẫn Fit; căn giữa dọc (màn hình ≥ 700px) giữ nguyên.

### 4. Fill volume/seek dừng đúng mép phải nút (thumb)
- Nguyên nhân gốc: fill tính theo toàn chiều rộng track (`frac × trackW`) trong khi nút đặt ở `frac × (trackW − thumbW)` — ở max, fill dài hơn nút 2px (Modern, track 86 / nút 21) và 4px (shade, track 56 / nút 16).
- Nay: helper `fillWidthToThumbRight()` — fill kết thúc đúng mép phải nút (`(sliderAbsX − fillAbsX) + frac×(trackW − thumbW) + thumbW`); áp cho volume (Modern + shade) và seek. Balance/PAN, preamp/EQ không có fill nên không đổi; Classic không có fill theo chiều rộng (chỉ sprite nút + nền track) nên không đổi.

### 5. Cửa sổ Video rời không to hơn cửa sổ chính
- Nguyên nhân gốc (ảnh image-11, skin Modern rộng hơn 566): mặc định cửa sổ rời cứng `DETACHED_WIN_W` 354 cho mọi skin, còn **size đã kéo tay** lưu trong `winSizes["Video|normal"]` được dùng lại vĩnh viễn — 575px trên ảnh / zoom 1.25x = 460 layout px, đúng là size đã kéo (Video layout 566 cho kéo tới 1600×1200). Stage rộng theo Video từ v10.7 nên main nằm lệch trái, Video lòi phải.
- Nay: mặc định = bề rộng cửa sổ chính của skin đang nạp (`detachedDefaultWidth()`: 566 = 354, Classic = 275, skin rộng = theo XML — kiểm bằng skin tổng hợp s1-size500 = 500); ở chế độ Fit, size đã kéo cũng không rộng hơn main (chỉ kẹp rộng, giữ cao; minimum XML lớn hơn main thì lấy minimum đó); ở 1x, size đã kéo tay vẫn giữ nguyên (kéo rộng được nếu muốn); Max 960×540 là chế độ riêng, không kẹp. AVS nhúng nằm trong main nên rộng ≤ main theo cấu trúc. Test cũ `video-window-107-test.js` (v10.7 kỳ vọng cửa sổ Classic 354) đã cập nhật theo mặc định mới: Classic 275×200, video 263×150, hàng nút 265 — vừa khung 360px ở fit (275×1.309 = 360) thay vì tràn như trước; việc mở rộng stage theo cửa sổ rời (v10.7) vẫn giữ cho Max 960 / kéo tay rộng hơn main.

### 6. Milkdrop bật mặc định; không tốn tài nguyên khi cửa sổ chưa mở
- Nay: `milkdropOn` mặc định BẬT (`index.html`: `localStorage "amp9-milkdrop-v1" !== "0"` — chưa từng lưu thì bật, đã lưu "0" thì vẫn tắt, đã lưu "1" thì bật); menu View/Vis/Video hiện ✓ mặc định; tắt được như trước, lưu localStorage.
- Trả lời câu hỏi của Hải "bật mặc định có tốn RAM không khi chưa mở cửa sổ xem": **không tốn CPU/GPU, chỉ giữ ~850KB thư viện** — đã xác minh bằng code thật (`milkdrop.js`): lib butterchurn (192.520 byte) + presets (653.572 byte) = 846.092 byte, nạp LAZY qua `ensureLibs()` khi bật (index.html không có thẻ `<script src="butterchurn...">` nạp ngay từ đầu); vòng render chỉ chạy khi đủ cả 4 (`enabled && playing && visible && visualizer` — `startLoop()` từ chối khi thiếu 1, `setVisible(false)` gọi `stopLoop()` hủy rAF) nên cửa sổ chưa mở thì loop không chạy. Một lệch đã sửa: canvas mới tạo mặc định 300×150 (không phải 0×0) nên `enable()` ở boot sẽ tạo visualizer + giữ WebGL context dù cửa sổ đóng — v10.8 sửa `attachTo()`: chưa có visualizer mà hộp chưa có kích thước thì đưa canvas về 0×0 để cơ chế 0×0 của `ensureVisualizer()` chạy đúng (không tạo, không giữ WebGL); đã có visualizer thì không zero nữa (đổi `canvas.width` sẽ reset WebGL context đang dùng).
- Hồi quy tìm được khi chạy suite (test `milkdrop-load-test.js` L7): sau sửa 0×0, lỗi "canvas co 0" chạy TRƯỚC lỗi "chưa có AudioContext" trong `ensureVisualizer()` nên lỗi ctx thật bị lỗi "co 0" (được ẩn khi AVS đóng) nuốt mất, banner đỏ không hiện. Sửa: kiểm AudioContext TRƯỚC canvas 0×0 — thiếu ctx là lỗi thật phải hiện banner, canvas 0×0 khi AVS đóng chỉ là trạng thái chờ bình thường (vẫn ẩn). Các test Milkdrop khác stub ctx giả nên không đổi gì.

### 7. Menu Vis chỉ còn mục hiệu ứng + đóng đúng (không dính)
- Nguyên nhân gốc (ảnh image-12, nút Vis Menu `button.vis.misc` cuối phải thanh nút AVS, bên phải nút "Random"): từ v10.5 nút này chỉ mở vis, không mở menu; các mục Video/Vis đã chuyển vào menu View ở v10.7. Hải muốn hiệu ứng về đúng nút này. Lỗi cũ: trước đây bấm RA NGOÀI menu thì menu DÍNH luôn (không đóng) — các menu riêng lẻ (`showEqPresetsMenu` / `showLocalAddMenu` / `showEqfChooserMenu`) mỗi cái tự gắn 1 listener `click` riêng, và khi chọn mục xong hàng gỡ menu mà không gỡ listener nên listener thừa/rò rỉ.
- Nay: `visMenuItems()` chỉ còn 4 mục hiệu ứng — Màu hiệu ứng trước/sau/ngẫu nhiên + Milkdrop (mục video chung Giữ tỉ lệ/1x/2x/Toàn màn hình/Phóng to/Tách rời/Đóng ở lại menu View, không trùng 2 chỗ). **"Hiệu ứng trước/sau" trên thanh công cụ (nút Prev/Next/Random) và "Màu hiệu ứng …" trong menu là CÙNG 1 hành động** (`cycleVisVariant` — Amp chỉ có 3 màu hiệu ứng, không có bộ đổi preset Milkdrop riêng) nên menu chỉ giữ 1 nhóm nhãn "Màu hiệu ứng", không đưa 2 hàng trùng làm 1 việc. Đóng menu bằng **closer CHUNG 1 chỗ** (`armPanelCloser` — nghe cả click chuột + `touchend` chạm + phím Esc; bấm/chạm TRONG menu thì không đóng; gỡ cả 3 listener cùng lúc trong `disarmPlMenuCloser`) — mọi menu nổi đi qua nó (menubar, playlist, EQ presets, LocalAdd, EQF chooser, Vis, videoavs.open; các closer riêng cũ đã gỡ, menu nào cũng mang `[data-pl-menu]`). Nút Vis Menu bấm lần 2 thì ĐÓNG (toggle theo `kind` — `togglePopupMenu(anchorDiv, items, kind)`, `isPopupMenuOpen(kind)`). Nút VID_Misc (`button.vid.misc`) vẫn chỉ mở video, không menu (quyết v10.5 về nút này không đổi). Classic không có nút Vis Menu nên menu chính Classic (nút O) giữ thêm 1 mục Milkdrop riêng — đó là chỗ duy nhất để bật/tắt Milkdrop trên Classic.

### 8. Nút videoavs.open khôi phục menu ngữ cảnh, nối đúng tick "Open Context Menu"
- Nguyên nhân gốc (ảnh image-13, nút oval ▼ góc phải trên cửa sổ chính, ngay phải màn hình hiển thị): đã xác định đúng nút bằng XML skin 566 + đo vị trí thật — chính là `videoavs.open` (x=-37 relatx=1, y=19; cụm nền 43×18 tại (309,35) + mũi tên 27×9 tại (317,37), khớp khung đỏ trong ảnh; MAKI `videoavs.maki` có `onleftclick` trên nút này). Hải đính chính 08:48: trước đây bấm nó mở menu điều khiển bên trong — tưởng nó là menu hiệu ứng nhưng không phải (menu hiệu ứng thật là nút Vis Menu, việc 7).
- Nay: khôi phục `visContextMenuItems()` (đã xóa ở v10.5) — 13 mục: Mở Video / Mở Hiệu ứng / Giữ tỉ lệ / 1x / 2x / Toàn màn hình / Phóng to-Khôi phục / Tách rời-Gắn lại / Màu hiệu ứng ×3 / Milkdrop / Đóng Video-Hiệu ứng. **Nối đúng tick `visbutton`:** "Open Context Menu" BẬT thì nút mở menu; "Open Configuration" BẬT thì mở ngăn kéo Options (giữ nguyên); không chọn gì (mặc định, `visButtonAction() = "toggle"`) thì nút mở/đóng AVS như v10.5 — đúng hành vi Winamp thật và đúng mô tả cũ trong README đợt B. Menu đóng bằng closer chung (ngoài/chạm/Esc/chọn mục; bấm lần 2 thì đóng). **Lưu ý cho Hải:** mặc định (tick tắt) nút này mở video chứ không mở menu — muốn bấm là ra menu thì bật "Open Context Menu" trong ngăn kéo Options (trang Video/Vis Button); nếu muốn menu là mặc định thì chỉ cần đổi `CFG_DEFAULTS["Open Context Menu"]` sang `"on"`.

### 9. Nối Options tiện: Beat Visualization + Open Video/Vis from the bottom (cái khó để sau)
- **Enable Beat Visualization — BUG tìm được khi nối:** checkbox trong ngăn kéo Options chỉ đổi `cfgState` mà KHÔNG đổi `beatVisOn` nên nhóm beat không hiện/ẩn theo. Nguyên nhân: trong `toggleCfg`, `var suf = attribSuffix(attrib)` khai báo SAU dòng check Beat (`if (suf === "Enable Beat Visualization")`) — hoisting làm `suf === undefined` ở đó nên check không bao giờ đúng (Detach/ticker đứng sau khai báo nên vẫn chạy). Sửa: chuyển khai báo `suf` lên trước mọi chỗ dùng. Nhóm beat (`player.normal.display.beatvisualization`, filmstrip 15 khung theo bass thật qua analyser) đã vẽ sẵn từ đợt D 9.9 — bật thì hiện (khi cửa sổ đủ rộng ≥372 để nhóm vừa trọn, mặc định 354 thì nhóm ẩn theo đúng XML), tắt thì ẩn; nút beat trong display và checkbox Options là 1 trạng thái (`setBeatVisOn` đồng bộ cả 2 chiều).
- **Open Video/Vis from the bottom:** AVS nhúng mở DƯỚI main thay vì trên — main ở yên (y=35), nhóm AVS đẩy xuống đáy main (y=161..277, đẩy đúng khoảng = đáy main − đỉnh AVS, tính từ hình học thật), ngăn kéo xếp dưới AVS (thứ tự main → AVS → ngăn kéo; đáy tham chiếu của ngăn kéo là đáy AVS = đáy main + 116). Tổng chiều cao stack + đỉnh ngăn kéo KHÔNG đổi (chỉ main/AVS đổi chỗ nhau). Hai radio cùng GUID nên độc quyền nhau. Chỉ tác dụng với AVS nhúng (Modern); Classic không có AVS nhúng nên không đổi gì. `runAvsSelfCheck` + `runDrawerSelfCheck` đã cập nhật kỳ vọng hình học cho from-bottom.
- **Để sau, ghi rõ:** WINSHADE Link Position/Width (cần tách geometry shade riêng — việc lớn; shade ở Amp là layout swap của cùng 1 stage, không có cửa sổ shade riêng); Notifications (cần vẽ popup notifier theo `notifier/*.png` + dùng các giá trị fade/hold — việc lớn); Bypass keep in screen (Amp không kéo-thả cửa sổ tự do nên chưa có gì để nối).

### 10. Hiệu ứng trong EQ để tiếng Anh (không dịch sang tiếng Việt)
- Yêu cầu Hải 09:08: "các hiệu ứng bên trong eq để tiếng anh". Đổi tên: mục preset đầu menu từ "Mặc định" thành **"Default"** (đường cong phẳng như Flat + balance về giữa; phẳng + balance giữa thì suy ra "Default", in đậm trong menu); 17 preset chuẩn Winamp về tên gốc tiếng Anh — Classical (Cổ điển), Laptop Speakers/Headphone (Loa laptop/Tai nghe), Large Hall (Hội trường lớn), Soft (Nhẹ nhàng), Full Bass (Bass mạnh), Soft Rock (Rock nhẹ), Full Treble (Treble mạnh), Full Bass & Treble (Bass & Treble mạnh), Live (Trực tiếp); các tên đã tiếng Anh giữ nguyên (Club, Dance, Party, Pop, Reggae, Rock, Ska, Techno, Flat, Bass Boost, Treble Boost, Loudness, Vocal). Đường cong dB của từng preset KHÔNG đổi — chỉ đổi tên hiển thị.
- Tên preset khi lưu/nạp file .eqf/.q1: `eqf.js` đọc/ghi tên nguyên văn theo byte trong file (không dịch, không khớp tên với `EQ_PRESETS`) — tên trong file Winamp vốn là tiếng Anh nên nạp file thật vào sẽ hiện đúng tên gốc; áp preset từ file thì suy tên theo đường cong (`matchEqPresetName` so theo giá trị dB, không theo tên) nên file "Classical" khớp đúng hàng "Classical" trong menu.
- Các nhãn khác trong ngăn EQ vốn đã tiếng Anh thì giữ nguyên (tab EQUALIZER / OPTIONS / COLOR THEMES từ XML skin, nút PRESETS, Crossfade). CHỈ đổi phần hiệu ứng trong EQ — menu chung (File/Play/Options/View/Help) vẫn tiếng Việt, tên bài/kênh vẫn tiếng Việt ("Trực tiếp" là nhãn live của playlist, không phải tên preset EQ, nên giữ nguyên).

### Kiểm chứng đợt v10.8
- Toàn suite jsdom: **4674 PASS, 0 FAIL** (52 file test, tất cả exit 0, không có file .log lỗi; 4547 từ 51 file có dòng KET QUA + `maki-test.js` 127 PASS — dòng tổng của nó không có tiền tố KET QUA nên không lọt vào tổng awk, đã cộng tay).
- Test mới: `eq-extras-108-test.js` **35 PASS** (không còn thanh extras + menu có "Default" + tên preset toàn tiếng Anh, mục 6 kiểm đúng danh sách 23 tên gốc Winamp + không còn "Mặc định"), `resize-handles-108-test.js` **85 PASS** (tay kéo vô hình + kéo thật đổi size), `volume-fill-108-test.js` **45 PASS** (fill = mép phải nút ở 0/0.5/1, chuột + chạm, Modern + shade + Classic), `video-detached-108-test.js` **51 PASS** (Video rời = rộng main: 566 = 354, Classic = 275, s1-size500 = 500; Fit kẹp size đã kéo; Max 960×540 không kẹp; AVS nhúng ≤ main), `milkdrop-default-108-test.js` **36 PASS** (mặc định bật theo đúng dòng code trong `index.html` + lib lazy + canvas 0×0 khi cửa sổ đóng + loop 4 cổng), `vis-menu-108-test.js` **87 PASS** (menu Vis đủ 4 mục hiệu ứng; đóng bằng bấm ngoài chuột/chạm/Esc/chọn mục/toggle lần 2; menu videoavs.open 13 mục + chọn "Mở Video"; VID_Misc không menu; View không còn hiệu ứng; menu Vis trong cửa sổ Vis rời), `options-wire-108-test.js` **69 PASS** (checkbox Beat thật → nhóm beat hiện/ẩn + khóa hồi quy lỗi hoisting; radio Open Context Menu → nút đổi hành vi menu/mở video/mở ngăn kéo; radio from-bottom → AVS dưới main + self-check hình học + Classic không đổi).
- Test đổi theo hành vi mới: `eq-preset-balance-107-test.js` **74 PASS**, `zoom-fit-test.js` **61 PASS**, `resize-test.js` **33 PASS**, `video-button-105-test.js` **150 PASS** (videoavs.open theo tick: tắt → mở video, bật → mở menu ngữ cảnh; VID_Misc chỉ mở video; View không còn hiệu ứng), `dotmenu-remove-107-test.js` **125 PASS** (View chỉ còn mục video chung; hiệu ứng về menu Vis; menu Classic giữ Milkdrop), `batch-d-test.js` **121 PASS** (visMenuItems 4 mục), `audio-test.js` **316 PASS** (17 tên preset chuẩn đã tiếng Anh; Full Treble dải 10 = +10.5 dB), `drawer-test.js` **271 PASS**, `playlist-test.js` **209 PASS** (menu View 15 mục — 3 mục Màu về menu Vis), `video-window-107-test.js` **62 PASS** (Classic 275×200/video 263×150 theo mặc định mới), `v10-4-menu-overflow-test.js` **14 PASS** (VIS_MENU mở menu Vis 3 mục Màu — test này không nối callback Milkdrop nên không có hàng Milkdrop giả), `vis-options-songinfo-test.js` **152 PASS** (tick Open Context Menu bật → videoavs.open mở menu 12 mục, chọn "Mở Video" mới mở AVS), `milkdrop-load-test.js` **49 PASS** (L7 sửa hồi quy thứ tự lỗi ctx/0×0 — banner hiện đúng "chưa có AudioContext").

## Đợt v10.7 (04/11 — bỏ nút menu góc dưới-phải, 18 mục vào menu trong giao diện skin)

> Yêu cầu Hải 04/11 07:25: bỏ hẳn nút menu ⋯ góc dưới-phải, các mục của nó tích hợp vào trong giao diện skin — không thêm nút ngoài giao diện. Sau khi bỏ, màn hình chỉ còn giao diện skin (tiêu chí đã chốt 03/11). Chỉ sửa `index.html` + `renderer.js` (phần menu); không sửa `audio.js`/`classic.js`; không bump version (điều phối viên làm sau).

### Bảng phân bổ 18 mục cũ → menu mới (không mất mục nào)

| Mục cũ (menu ⋯) | Menu mới | Handler (dùng lại đúng đường cũ) |
|---|---|---|
| Nạp skin .wal/.wsz/.zip… | File (đã có từ đợt D) | `onOpenSkinPicker` → `fileInput.click()` |
| Thêm 1 bài nhạc… | File (mới) | `openLocalFilePicker()` |
| Thêm thư mục nhạc… | File (mới) | `openLocalFolderPicker()` |
| Zoom: Cỡ gốc 1x | View (mới) | `onZoom("1")`, ✓ khi chưa fit |
| Zoom: Vừa màn hình | View (mới) | `onZoom("fit")`, ✓ khi đang fit |
| Crossfade: 2s | Options (mới) | `onCycleCrossfade` → `cycleCrossfade()` (xoay 0→1s→2s→4s), nhãn + ✓ từ `getCrossfadeLabel`/`isCrossfadeOn` |
| Milkdrop: Tắt/Bật | View (mới, `milkdropMenuItem()` chung với menu Vis/Video) | `onMilkdropToggle` → `toggleMilkdrop()`, ✓ khi bật |
| Giữ tỉ lệ khung hình | View (mới) | `setKeepAspect(!keepAspect)`, ✓ theo trạng thái |
| Cỡ thường (1x) | View (mới) | `setVideoScale(1)` |
| Cỡ gấp đôi (2x) | View (mới) | `setVideoScale(2)` |
| Toàn màn hình | View (mới, gộp 1 mục chung video/vis) | `requestVideoFullscreen()` |
| Phóng to cửa sổ / Khôi phục cửa sổ | View (mới) | `setVideoMaximized(!videoMaximized)`, nhãn đổi theo trạng thái |
| Tách rời (Detach) / Gắn lại (Reattach) | View (mới, gộp 1 mục chung) | `reattachAvs()` / `detachAvs()` (mở chế độ đang dùng trước nếu AVS đang đóng — đúng handler cũ, không ép về "video" như `videoMenuItems`) |
| Đóng Video/Hiệu ứng | View (mới, gộp "Đóng Video" + "Đóng Hiệu ứng") | `closeAvs()` |
| Màu hiệu ứng trước | View (mới) | `cycleVisVariant(-1)` |
| Màu hiệu ứng sau | View (mới) | `cycleVisVariant(1)` |
| Màu hiệu ứng ngẫu nhiên | View (mới) | `setVisRandom(!visRandom)`, ✓ theo trạng thái |
| Xem script MAKI… | Help (mới) | `onOpenMakiPanel` → `openMakiPanel()` |

- **Nhãn động/✓:** menu trong giao diện skin dựng NHÃN MỚI mỗi lần mở (`fileMenuItems`/`viewMenuItems`/`optionsMenuItems`/`helpMenuItems` gọi lúc bấm menubar), đọc trạng thái hiện tại qua `isZoomFit`/`isCrossfadeOn`/`getCrossfadeLabel`/`isMilkdropOn`/`getAvsState()` nên luôn đúng — thay cho khối cập nhật nhãn trong `setZoom`/`markMenuChecks` cũ (đã bỏ; `markMenuChecks()` giữ lại dạng no-op vì `toggleMilkdrop`/`cycleCrossfade` vẫn gọi nó và test Milkdrop cũ trích hàm từ `index.html` vào stub của riêng chúng).
- **Skin Classic:** không cần đường riêng — menu nút O trên titlebar (`classicOpenMainMenu`) gộp sẵn File/Play/Options/View/Help nên đủ 18 mục, bấm được (kiểm ở mục D của test mới). Không sửa `classic.js`.
- **Trùng nhãn lưu ý:** File vốn đã có "Phát file nhạc…" gọi `openLocalFilePicker()` như mục "Thêm 1 bài nhạc…" cũ nên giữ cả 2 nhãn để không mất mục nào; dọn trùng (nếu có) để đợt sau quyết. `videoMenuItems()`/`visMenuItems()` vẫn giữ làm API (export, test đối chiếu) — `viewMenuItems` dùng lại đúng các hàm của chúng, chỉ gộp trùng (Toàn màn hình, Tách rời/Gắn lại, Đóng).
- **Đã bỏ ở `index.html`:** `<button id="btn-menu">`, toàn bộ `<div id="menu-pop">` (18 mục), CSS `#btn-menu`/`#menu-pop`, `wireMenu()` → `wirePage()` (chỉ còn: nút "Mở lại Amp", đóng bảng MAKI, phím tắt, hộp chọn file skin, resize, kéo-thả). `hideUi()` (nút X / MINIMIZE) nay chỉ ẩn giao diện + hiện "Mở lại Amp". Thông báo thiếu skin chỉ về menu File của skin. Grep `btn-menu`/`menuPop`/`wireMenu`/`⋯` trong `index.html` + `renderer.js` = 0 (chỉ còn ghi chú lịch sử "đã bỏ 04/11" bằng chữ, không còn ký tự ⋯).
- **Kiểm chứng:** `dotmenu-remove-107-test.js` (MỚI) **124 PASS, 0 FAIL** — tĩnh (không còn nút/menu cũ), builder đủ 18 mục + nhãn ✓ động + bấm từng mục gọi đúng handler cũ (nạp skin, thêm nhạc, zoom, crossfade, Milkdrop, MAKI, Video/Vis), live DOM bấm View trên menubar mở menu thật + bấm "Zoom: Vừa màn hình" gọi `onZoom("fit")` + menu nằm gọn trong stage (mở sang trái khi gần mép phải, hành vi v10.4 giữ nguyên), Classic bấm nút O mở menu đủ 18 mục + bấm MAKI/Zoom gọi đúng handler. Test cũ cập nhật theo hành vi mới: `page-test.js` **82 PASS**, `batch4-test.js` **173 PASS**, `maki-test.js` **127 PASS** (mở MAKI qua menu Help), `video-button-105-test.js` **122 PASS** (mục Video/Vis đối chiếu qua menu View), `zoom-fit-test.js` **49 PASS** (✓ zoom nay ở View menu), `v10-4-menu-overflow-test.js` **11 PASS**.
- Toàn suite (điều phối viên chạy lại sau bump): **4044 PASS đếm được, 0 FAIL (45 file test)**; `batch-d-test.js` 121 + `playlist-test.js` 209 đã cập nhật kỳ vọng số mục File/View theo menu mới.
- **Đóng gói v10.7:** bump version toàn bộ lên 10.7 (manifest `window.AMP_VERSION`, 8 hằng `*_VERSION` + 8 `EXPECTED_*`, 8 thẻ `?v=10.7`, title/tab, hộp About, dòng log version, đầu README + bảng file; `harness.js` 8 chỗ assert 10.7). Toàn suite jsdom **4044 PASS đếm được, 0 FAIL (45 file)** — v10.6 là 3763 PASS, 0 FAIL (38 file); 7 test mới v10.7: stop-107 74, stop-107-renderer 19, video-window-107 62, vis-bar-107 55, playlist-clock-107 50, dotmenu-remove-107 124, eq-preset-balance-107 61. `node --check` cả 8 file JS OK; `node harness.js` LOAD OK. Zip `amp-v9.zip` 15 file ở cấp gốc, không có `skin-browser.js`, không kèm test/fixture.

## Đợt v10.6 (04/11 — Milkdrop: bundle butterchurn local + sửa bug `.default` khiến AVS đen dù CDN sống)

- **Đóng gói butterchurn vào zip (local-first):** `butterchurn.min.js` 192.520 byte (butterchurn@2.6.7) + `butterchurnPresets.min.js` 653.572 byte (butterchurn-presets@2.4.7, 100 preset) — tải từ jsDelivr 04/11, kiểm UMD thật bằng vm. Tổng +846.092 byte (gzip ~163 KB); zip v10.5 938.139 byte → ước ~1,1 MB (nén deflate) đến tối đa ~1,8 MB (không nén), dưới ngưỡng ~3 MB nên đóng gói cả hai file nguyên vẹn, không cần bản presets gọn. Milkdrop không còn phụ thuộc mạng ngoài để nạp lib.
- **Bug `.default` (nguyên nhân gốc của AVS đen — không phải CDN):** nạp `butterchurn.min.js` qua thẻ `<script>` cho `window.butterchurn = {default: Butterchurn}` (chỉ 1 key `default`); `createVisualizer` là static method của class trong `.default`, còn `window.butterchurn.createVisualizer` thì `undefined`. `ensureVisualizer()` cũ kiểm `bc.createVisualizer` trực tiếp nên LUÔN fail với đúng câu lỗi Hải thấy ("chua nap duoc thu vien butterchurn (CDN)"), dù CDN tải thành công; `ensureLibs()` cũ chỉ kiểm global truthy nên vẫn resolve. Webamp không dính vì bundler ES tự bóc `.default`. Đã sửa: helper `resolveButterchurn()` bóc `.default` khi có `createVisualizer`, chấp nhận cả 2 dạng; `ensureLibs()` kiểm `createVisualizer`/`getPresets` thật sau khi nạp. `window.butterchurnPresets` đã kiểm: `.getPresets` là function trực tiếp trên global (100 preset, có "Zylot - Star Ornament") — không bị bẫy `.default`, giữ nguyên.
- **Chuỗi fallback lib (`milkdrop.js`, `ensureLibs`/`loadFirstAvailable`):** mỗi lib thử lần lượt LOCAL → jsDelivr → unpkg (cả 2 CDN curl kiểm sống 04/11, đủ byte); cdnjs KHÔNG có trong chuỗi (butterchurn trả 404, kiểm 04/11), statically.io không dùng (stall 30s). Mỗi lần thử timeout 15 giây (`LOAD_SCRIPT_TIMEOUT_MS`) — script treo không onload/onerror thì thử nguồn tiếp theo; lỗi cuối cùng liệt kê đủ các nguồn đã thử.
- **Preset mặc định đổi thứ tự (`loadDefaultPreset`):** kho preset đã nạp (local) → fetch `DEFAULT_PRESET_URL` (CDN) → `FALLBACK_PRESET` nhúng sẵn.
- Sửa `milkdrop.js` (loader + preset, không đụng logic khác) + comment `index.html` dòng 174–179 cho đúng thực tế mới. KHÔNG bump version ở đợt này (bump toàn bộ lên 10.6 sau); KHÔNG đóng gói zip ở đây.
- **Kiểm chứng:** `node --check milkdrop.js` OK; `node harness.js <thư-mục-amp-v9>` LOAD OK. Lưu ý cho worker test: `milkdrop-load-test.js` L1/L2 cũ assert thứ tự nạp bắt đầu từ CDN — sau v10.6 thứ tự là LOCAL trước nên cần cập nhật test theo.
- **Sửa thêm lúc viết test v10.6 (`loadFirstAvailable`):** `.then().catch()` cũ bắt cả lỗi reject từ `attempt(i+1)` đệ quy rồi chạy lại `attempt(i+1)` lần nữa — nguồn "nạp xong nhưng sai dạng" (vd `.default` rỗng) bị thử trùng (unpkg 4 lần, lỗi liệt kê trùng tên). Đổi sang `.then(ok, err)` 2 đối số: mỗi nguồn thử đúng 1 lần. Test mới bắt được bằng B6b/B6d.
- **Test mới `milkdrop-106-test.js` (89 check):** hồi quy bug `.default` bằng đúng 2 file bundle thật (vm trong jsdom: `window.butterchurn` chỉ có key `default`, `createVisualizer` chỉ ở `.default`); local-first; fallback LOCAL → jsDelivr → unpkg (cả 3 trường hợp); timeout 15s/lượt bằng đồng hồ giả (timer 15000ms → 5ms thật, cả đường `loadScriptImpl` treo lẫn thẻ `<script>` treo thật); preset mặc định từ kho local (`library`); tắt/bật lại sau khi lib lỗi thử lại được (libPromise reset); 2 enable đồng thời chỉ nạp lib 1 lần. Cập nhật test cũ: `milkdrop-load-test.js` L1/L2/L3/L4/L5 sang LOCAL trước (+1 check L3c2), `batch4-test.js` D12/D14 sang preset từ kho library trước (v10.6 đổi thứ tự preset).
- **Đóng gói v10.6:** bump version toàn bộ lên 10.6 (manifest `window.AMP_VERSION`, 8 hằng `*_VERSION` + 8 `EXPECTED_*`, 8 thẻ `?v=10.6`, title/tab, hộp About, dòng log version; `harness.js` 8 chỗ assert 10.6). Toàn suite jsdom **3763 PASS, 0 FAIL (38 file)** — v10.5 là 3673 PASS, 0 FAIL (37 file); tăng 90 = 89 test mới + 1 check L3c2. `node --check` cả 8 file JS OK; `node harness.js` LOAD OK. Zip `amp-v9.zip` **1.106.474 byte**, 15 file ở cấp gốc (13 cũ + 2 bundle butterchurn), không có `skin-browser.js`, không kèm test/fixture; diff từng file trong zip với thư mục làm việc khớp 100%.


## Đợt v10.7 (107) (04/11 — đồng hồ playlist toàn live hết kẹt 0:00; KHÔNG bump version ở đợt này — điều phối viên bump sau)

- **Nguyên nhân gốc (ảnh Hải 04/11 07:19):** playlist 41 đài live đều `len = null` nên tổng = 0, mục đã chọn cũng không có len → `playlistClockText()`/`classicPlTimeText()` đều ra "0:00" — đúng logic Winamp (live không cộng vào tổng) nhưng hộp hiển thị chết cứng trong khi nhạc đang phát (đồng hồ chính đã đếm 1:00). Ngoài ra đồng hồ playlist chỉ vẽ lại khi đổi lựa chọn/đổi bài/nạp playlist, KHÔNG nối với tick nhạc nên dù có số cũng không đếm lên. Hộp 90px không phải nguyên nhân (đủ chỗ cho "0:00"–"125:30").
- **Cách hiện đã chọn:** giữ 1 ô duy nhất, thứ tự ưu tiên như Winamp + Modern v9.9: chọn mục có len → thời gian mục đó; không chọn → tổng playlist; mục đang phát là file local có len → hiện len của nó (nó cũng là mục đã chọn khi phát, nên luật chọn đã bao). Đài live → về tổng; **chỉ khi tổng = 0 (playlist toàn live) thì hiện THỜI GIAN ĐÃ PHÁT của mục đang phát** (`demo.t`, số đo thật của engine — cùng số đồng hồ chính đang hiện). Chưa phát/dừng (`demo.t = 0`) thì vẫn 0:00; tạm dừng giữ nguyên số đã phát (đóng băng, như đồng hồ chính).
- **Đối chiếu fork/Winamp thật:** fork (`RunningTimeDisplay` + `getRunningTimeMessage`) hiện cặp `chọn/tổng`, toàn live ra "0:00/0:00" — KHÔNG hiện thời gian đã phát. Amp cố tình lệch fork ở đúng điểm này (ghi rõ): "0:00/0:00" là thứ Hải thấy "chưa đầy đủ", còn thời gian đã phát là số duy nhất có thật để hộp không chết. Không bịa thời lượng cho live (vẫn `len = null`, tổng vẫn 0).
- **Đồng bộ 2 skin:** `classicPlTimeText()` nay dùng chung `playlistClockText()` (trước đây Classic tính riêng `sel>0 ? sel : total`) nên Modern/Classic luôn hiện cùng 1 số. Đồng hồ vẽ lại theo tick nhạc khi đang ở chế độ elapsed (`refreshPlaylistClockTick()` cuối `onAudioTimeUpdate`, chỉ vẽ khi đổi giây — `lastPlClockDrawn` ghi ở cả `refreshClassicPlTime` lẫn `updateInfoEls` để không vẽ thừa 4 lần/giây). `stopPlayback()` thêm `updateInfoEls()` để PLTime Modern về 0:00 khi dừng (Classic đã về qua `refreshPlaylistRows`). **Sửa thêm (hồi quy do test cũ bắt được):** `setPlaylistData`/`setPlaylistItems` nay quên vị trí bài cũ (`demo.t/seekFrac/dur = 0`) — trước đây nạp playlist mới khi `demo.t` đang 0:09 thì đồng hồ toàn-live hiện 0:09 dù chưa phát gì (cả đồng hồ chính cũng dính số cũ); khôi phục trạng thái không lưu vị trí phát nên reset này không phá resume.
- **Giới hạn đã biết:** cửa sổ Playlist dạng shade chỉ vẽ giờ lúc render (không tick theo nhạc) — như hành vi cũ, để đợt sau nếu cần.
- **Test mới `playlist-clock-107-test.js`:** toàn live + phát Đà Nẵng → "1:00" (cả text lẫn glyph Classic, cả Modern PLTime); tick lên 2:05; dừng → 0:00; playlist có file local → chọn 1 mục hiện len mục đó, bỏ chọn hiện tổng, đổi bài đổi theo; chọn live trong playlist hỗn hợp → về tổng. Toàn suite jsdom: xem báo cáo đợt (harness LOAD OK + các file `*-test.js`).

- **Preset EQ + cân bằng ngang + nút "Mặc định" (yêu cầu Hải 04/11 07:28, thêm theo yêu cầu người dùng, NGOÀI XML skin):** trước đây preset chôn trong menu (nút PRESETS 49×9 ở đáy ngăn kéo EQ, không hiện tên preset đang dùng), slider PAN tuy đã là thanh NGANG (77×13, góc trên-trái tab EQ, nền có sẵn chữ L/R + vạch giữa) nhưng nhỏ/không nhãn tiếng Việt, và không có nút về mặc định nhanh. Nay tab EQUALIZER của skin Modern có thêm thanh extras ở đáy-trái (0,75) 132×14, kiểu menu Winamp thật (nền #ECE9D8, viền #ACA899, Arial 11px): nhãn "Preset: \<tên\> ▾" bấm mở đúng menu 17 preset cũ (preset đang chọn in đậm trong menu) + nút "Mặc định" (1 bấm: EQ phẳng — preamp 0 dB + 10 dải 0 dB — + balance về giữa 0.5; thumb các slider + engine + state lưu đều cập nhật). Tên preset suy từ 11 dải hiện tại (`matchEqPresetName`, khớp tuyệt đối 1 preset trong `EQ_PRESETS` thì trả tên, không thì "Tùy chỉnh"; kéo tay 1 dải là đổi ngay; sau "Mặc định" thì khớp "Flat"); không tạo hệ preset thứ hai, không sửa `audio.js` (dùng lại `setPan`/`setEqBand`/`setEqPreset` có sẵn). Cân bằng KHÔNG thêm thanh mới — dùng đúng slider PAN của skin (kéo đổi StereoPannerNode thật qua `applyBalance`).
- **Vì sao đặt ở (0,75):** tab EQ 318×89 của skin 566 đã kín — cột trái balance (0..21) / crossfade (24..34) / ON (45..54) / AUTO (59..68) / PRESETS (75..84), 11 dải dọc chiếm hết phần phải tới x=309, nhãn tần số ở đáy y=82..89 (x≥135), khe giữa đáy tab (y=104) và dải tab (y=108) chỉ 4px — không còn ô trống nào cho hàng mới. Thanh mới chồng lên đúng nút PRESETS của skin (thay thế đúng chức năng của nó) và 6px cuối rãnh preamp (x=82..95, y=75..81 — thumb preamp ở -12dB chìm 6px dưới thanh, vẫn kéo được ở phần còn lại; eq1..eq10 không bị che). Nút "Pan về giữa" trong Preferences giữ nguyên (chỗ khác, không trùng).
- **Skin Classic: KHÔNG thêm** — cửa sổ EQ 275×116 cũng kín (dải + graph + hotzone "Tất cả 0dB"); Classic chỉ hưởng lợi chung: nút PRESETS Classic mở cùng menu preset (có in đậm preset đang chọn), chọn preset đổi dải thật; hotzone "Tất cả 0dB" của Classic vẫn chỉ phẳng EQ, không đụng balance (giữ nguyên).
- **Test mới `eq-preset-balance-107-test.js` (61 check):** thanh extras đúng vị trí/kích thước trong nhóm `player.normal.drawer.eq`, không che nhãn tần số; bấm nhãn mở menu 22 preset, Flat in đậm, chọn Rock thì 11 dải + engine đúng giá trị preset, nhãn thành "Preset: Rock"; kéo chuột slider PAN (mousedown 0.19 → mousemove 0.81) thì `drawerState.balance` + `setPan` engine + thumb đổi theo; bấm "Mặc định" (đang Rock + balance lệch phải) thì EQ phẳng + balance 0.5 + thumb về giữa + nhãn về "Preset: Flat" ngay không cần re-render; chọn "Bass mạnh" rồi bấm "Mặc định" thì về phẳng; kéo tay eq1 thì nhãn thành "Preset: Tùy chỉnh"; Classic không có thanh/nút mới nhưng menu chung vẫn chạy (chọn Pop đổi dải thật).

## Đợt v10.2 (03/11 tối — gain staging + radio lặng + vis + preset + audit chuyển trạng thái)

Hải test v10.1 trên điện thoại thật (18:02–18:56) và báo 1 loạt lỗi. Gốc chung: **chuỗi gain sai 2 đầu** (EQ bật suy hao −6 dB ở preamp tuyến tính nên nhỏ tiếng; bù bằng volume max thì clip) + **EQ on→off không nhả hẳn** (thẻ vẫn bị AudioContext bắt nên nhỏ hơn Webamp cả khi EQ off; load lại trang thì ngang vì reset hết) + **bật EQ gặp đài không CORS thì câm luôn**.

### (1) Gain staging — preamp map theo dB, limiter chống clip (`audio.js`)
- Trước: `preamp.gain = frac` tuyến tính (giữa = 0,5 = −6 dB, max = 1,0 = 0 dB, không bao giờ tăng được). Webamp map theo dB (giữa = 0 dB, max = +12 dB). Đã sửa: `preampGain(frac) = 10^(fracToDb(frac)/20)` (frac 0,5 → 1,0; frac 1,0 → +12 dB → 3,98; frac 0 → −12 dB → 0,25), dùng ở 3 chỗ (tạo graph, khôi phục state, `setPreamp`). Dải EQ vẫn map dB như cũ (đúng).
- Dải 0 → **lowshelf**, dải 9 → **highshelf** (giống Webamp; 8 dải giữa peaking), tần số Amp giữ nguyên (31,5…16000 Hz), Q=1. Analyser smoothing 0,8 → **0,0** (như Webamp), fftSize 64 → **1024** (sóng oscilloscope thấy rõ nhiều chu kỳ).
- **Limiter chống clip (lựa chọn của Amp, KHÔNG phải từ Webamp — Webamp không có limiter):** DynamicsCompressorNode sau master, trước panner/analyser: threshold −3 dB, knee 3 dB, ratio 20:1, attack 0,002, release 0,1. Mức thường gần như không chạm tới; chỉ bóp các đỉnh vượt 0 dBFS khi preset boost + đài to.
- Lỗi lệch dải (phát hiện khi kiểm preset): `getEqState()` trả 11 phần tử [preamp, eq1..eq10] còn `resume()`/eqf trả 10 phần tử [eq1..eq10]; `applyEqValues` cũ đọc thẳng `b[i]` nên dải 1 ăn giá trị preamp, eq10 không bao giờ được áp. Đã chuẩn hóa: 11 phần tử thì bỏ phần tử đầu.
- Điểm so sánh chuẩn để test A/B: Webamp EQ phẳng mặc định vs Amp cùng preset phẳng — âm lượng phải ngang nhau; Amp boost hết cỡ phải to hơn rõ.

### (2) Radio tự lặng + EQ on gặp đài không CORS (`audio.js` + `renderer.js`)
- Watchdog (5s/lần, chỉ khi đang phát): ctx suspended → resume; thẻ bị pause mà cờ playing còn true → phát lại; `currentTime` đứng yên quá 10s → nạp lại src (tối đa 3 lần rồi báo lỗi hẳn `reason: "watchdog-stall"`, ở yên kênh, không tự nhảy kênh dưới). Thêm listener `stalled`/`waiting`, `ctx.onstatechange`, `wireResumeHandlers()` (touchend/click/keydown → resume ctx treo, như Webamp) + `visibilitychange`.
- HLS tự hồi như Webamp: fatal NETWORK → `hls.startLoad()`, MEDIA → `hls.recoverMediaError()`; chỉ khi không hồi được mới báo lỗi.
- **Fallback CORS khi bật EQ (hướng chẩn đoán chính 18:30):** lỗi lần 2 mà đang dùng `crossOrigin="anonymous"` thì tự tắt EQ, nạp lại native + báo qua `onEqFallback` → renderer đồng bộ trạng thái EQ off + dòng chữ chạy không dấu `Kenh nay khong qua EQ duoc (CORS) - dang phat truc tiep`. Áp dụng cả khi phát lần đầu với EQ bật lẫn khi bật EQ giữa chừng, cả kênh video (TV360 qua vmttv cũng chỉ xem được khi EQ tắt).
- Chỉ báo stereo/mono khi EQ off: chưa đo được thì hiện **"stereo" tạm** (quy ước v9.7), không bao giờ hiện trống khi đang phát; `measureChannels` đo thật bằng ChannelSplitter sẽ sửa thành "mono" nếu L/R giống hệt.

### (3) EQ on→off nhả hẳn về native (`audio.js`)
- Trước: tắt EQ chỉ nối lại source về destination — thẻ vẫn bị AudioContext bắt nên tiếng vẫn qua ctx (nhỏ hơn off lúc đầu). Đã sửa: `setEqOn(false)` khi có source thì đổi sang **thẻ MỚI** (không source, không crossOrigin) để phát native y như off lúc đầu; vị trí file giữ qua `pendingSeek`; các source còn lại cũng nối về destination. Đổi lấy 1 lần nạp lại ngắn (radio live về lại đầu live, file tua về đúng vị trí cũ) — đúng như Webamp direct mode.
- Đo thẳng (jsdom, `v10-2-test.js` S1–S12): mọi đường gain đều = 1,0 khi volume max; off→on→off cho gain hiệu dụng bằng nhau; bật/tắt EQ 5 lần không nhỏ dần; crossfade sau EQ-off không lôi chuỗi EQ trở lại.

### (4) Vis giống Webamp — BAR + OSC, cả AVS lẫn cửa sổ Video rời (`renderer.js`)
- Đối chiếu trực tiếp `VisPainter.ts`/`Vis.tsx` của Webamp (chỉ lấy kiểu dáng/thông số, code vẫn viết theo Amp, dùng analyser thật của Amp): BAR 75 cột (nhóm 4, bỏ cột thứ 4 làm khe), log scale 0,91, **pushDown = 2** (2 hàng trống trên cùng, cột cao tối đa 13/16), gradient **neo đáy** (cột ngắn chỉ hiện xanh lá, không kéo giãn toàn bộ gradient), peak **1px** màu `colorbandpeak`, ẩn khi peak < 1 hàng. Sửa `avsBarGradient` (trước đây lộn thứ tự màu) + `drawAvsVis`.
- OSC: analyser fftSize 1024 → 76 điểm (lấy 576 mẫu đầu, lát 7), y = clamp(round(amp/8)−9, 0, 15), vẽ đoạn dọc nối các điểm (đi xuống thì top++), pushDown 2 hàng. Màu sóng: 1 màu (peak color) — skin Modern không có palette osc riêng colors[18..22] như Classic nên dùng 1 màu, đây là xấp xỉ (ghi rõ).
- Fallback vis ở chế độ video: theo dõi `avsVideoHasPic` (null/trưa biết / true / false) qua `loadstart` + `loadedmetadata`; mode "video" + đã biết chắc không có hình → hiện canvas vis thay vì thẻ video đen; chỉ khi đã biết chắc để không nhá vis lúc kênh video đang nạp.
- Cửa sổ Video của Webamp chỉ vẽ Milkdrop, không có vis spectrum — "vis trong cửa sổ Video của Webamp" mà Hải đối chiếu thực chất là vis spectrum chuẩn của Webamp; Amp vẽ vis đó trong cả 2 chỗ (AVS + cửa sổ Video rời) qua chung 1 wrap `avsMedia`.

### (5) Đủ 17 preset EQ chuẩn Winamp (`renderer.js` — `EQ_PRESETS`)
- Trước chỉ có 5 mục tự định nghĩa (Flat/Bass/Treble/Loudness/Vocal). Nay thêm đủ 17 preset chuẩn Winamp, dữ liệu dB lấy từ `builtin.json` của Webamp — đã kiểm chứng khớp tuyệt đối với file `winamp.q1` thật (17 preset, 0 giá trị khác); đổi từ thang .eqf 1..64 bằng `eqfValueToDb` của Amp (33 = 0 dB), làm tròn 1 số lẻ. Code EQ của Amp vẫn chuẩn spec Winamp — chỉ thiếu danh sách preset sẵn, nay bổ sung (lấy DỮ LIỆU dB từ Webamp, không lấy code xử lý; map theo dB của Amp giữ nguyên, KHÔNG theo kiểu tuyến tính của Webamp).
- Danh sách: Cổ điển, Club, Dance, Loa laptop/Tai nghe, Hội trường lớn, Party, Pop, Reggae, Rock, Nhẹ nhàng, Ska, Bass mạnh, Rock nhẹ, Treble mạnh, Bass & Treble mạnh, Trực tiếp, Techno + 5 mục cũ + "Nạp preset .eqf…"/"Lưu preset .eqf…".

### (6) Resize: list lấp đầy khung + số/chữ đúng kích thước (`renderer.js`)
- Repro jsdom cho thấy đường re-render sau `setWinSize` đúng; lỗi trên điện thoại nhiều khả năng ở **preview lúc kéo scale theo snapshot tỉ lệ** (list = windowH − offset cố định, không phải tỉ lệ) và/hoặc **build cũ còn cache** (GitHub Pages deploy lag; `index.html` không có cache-buster). Đã sửa: preview lúc kéo tính trực tiếp từ kích thước khung mới bằng offset math (snapshot lưu `offW/offH`); selector snapshot mở rộng thêm `.ml-list,.ml-tree`; nền `data-stretch` vẫn scale tỉ lệ như cũ. Video cửa sổ rời: `object-fit: contain`, không méo.
- **Số/chữ bitmap GIỮ NGUYÊN kích thước skin khi kéo resize khung** (chỉ stage zoom Fit mới scale toàn bộ bằng CSS transform) — đó là hành vi đúng của Winamp thật; chỉ vùng list/video giãn ra. Tay nắm kéo mượt v10.0/v10.1 giữ nguyên; đọc min/max từ XML, không gán cứng số 566.

### (7) Slider kéo không lên max ở tỉ lệ Fit (`renderer.js` — `fracFromEvent`)
- Lỗi thật (tìm ra khi đo đường EQ-off, 18:38–18:43): stage Fit scale bằng CSS transform nhưng `fracFromEvent` chia tọa độ màn hình (đã scale) cho kích thước skin (chưa scale) — kéo hết cỡ ở Fit ~0,45x cũng chỉ được frac ~0,45. Đã sửa cả 2 chỗ (slider Modern + Classic): tính tỉ lệ `sc = rect.width / w` (hoặc `rect.height / h` dọc), đổi tọa độ chạm về px skin trước khi chia. Đây là 1 nguyên nhân thật của "volume 100% mà vẫn nhỏ hơn Webamp".
- Sửa thêm `applyVolume` lúc crossfade đang chờ: thẻ cũ đang hát được cập nhật volume ngay (trước đây early-return làm volume kẹt ở mức cũ trong khi thanh đã hiện 100%).

### (8) Chỉ báo stereo/mono mất sau khi bật/tắt PL/ML (`renderer.js`)
- Giả thuyết của Hải đúng: `renderStackedInner` vẽ lại cửa sổ chính từ đầu, layer channels về ảnh mặc định `player.songinfo.none` (trong suốt); `setChannelsState` là async nên lệnh áp "stereo" bị hủy khi lượt render sau reset `channelsRec`. Đã sửa: gọi `updateChannelsIndicator()` ở cuối `renderStackedInner` (bao cả PL, ML, ngăn kéo, video); guard không bao giờ áp "none" khi đang phát; `measureChannels` trả null thì khẳng định lại "stereo" tạm.

### (9) Ticker tràn màn hình (`renderer.js` — `renderText`)
- CSS `index.html` viết cho class `.ticker`/`.inner` nhưng renderer tạo div ngoài KHÔNG có class và holder class `ticker-inner` — `overflow:hidden` không bao giờ áp. Đã sửa: div ngoài được `style.overflow = "hidden"` (mọi nhánh); nhánh songticker: `div.className = "ticker"`, holder `className = "inner"`. Cơ chế cuộn không đổi (Modern 30px/s, tới cuối dừng 1s rồi về 0; Classic cuộn đều; Disabled không cuộn).

### (10) Audit toàn diện chuyển trạng thái (18:49) — lỗi tìm được
- **A. Engine cũ không bị hủy khi đổi skin (NGHIÊM TRỌNG):** `bootSkin` tạo engine MỚI mỗi lần đổi skin mà không dừng engine cũ → thẻ audio cũ (không nằm trong DOM) vẫn phát tiếp → chồng tiếng; watchdog/HLS/timer cũ chạy mãi; AudioContext cũ không đóng → đổi skin nhiều lần chạm giới hạn số ctx của Chrome (~6). Đã sửa: thêm `destroy()` vào `audio.js` (stop watchdog, stop, pause + clearSrc mọi thẻ, detachHls, `ctx.close()`, `playing = false`) + `bootSkin` gọi `prevSkin.audioEngine.destroy()` sau khi engine mới tạo xong; `playItem` sau destroy trả `{ok:false, reason:"destroyed"}`.
- **B. Milkdrop bị tắt sau đổi skin:** `bootSkin` gọi `toggleMilkdrop()` khi đang BẬT thì TẮT luôn Milkdrop (đảo trạng thái), trái comment "khôi phục Milkdrop đã bật". Đã sửa: thêm `reset()` vào `milkdrop.js` (stopLoop, visualizer = null) + `bootSkin`: tắt → `reset()` → bật lại với canvas/ctx mới.
- Các mục đối xứng (không lỗi): mute/unmute, shade, minimize, vis cycle, zoom, shuffle/repeat 3 trạng thái, đổi bài/crossfade, PL/ML/drawer, preset EQ.

### Kiểm chứng đợt v10.2 (jsdom)
- `audio-test.js` **314 PASS, 0 FAIL** (153 phần 1 + 161 phần 2; mới: slider Fit 0,45x, 17 preset, chỉ báo stereo sau re-render, EQ release).
- `v10-2-test.js` (MỚI — đo thẳng gain/EQ release/destroy) **77 PASS, 0 FAIL** (S1–S12).
- `avs-vis-test.js` **41 PASS, 0 FAIL** (mới: fallback vis video-mode).
- `vis-options-songinfo-test.js` **149 PASS, 0 FAIL** (mới: ticker clip).
- Headless Chrome trong sandbox không chạy được (lỗi Hatch WebGL domain policy — đã biết) nên các mục đo tiếng/hình thật chờ test trên điện thoại Oppo thật của Hải (xem checklist cuối báo cáo).

## Đợt v10.3 (03/11 tối — AVS = Milkdrop thật + ticker + ML load lười + Classic đủ nút + retry trước khi báo lỗi)

Hải test v10.2 trên điện thoại thật và báo thêm 1 loạt lỗi (20:00–20:35): hiệu ứng video/AVS chưa giống Webamp, ticker tên bài trống, mở ML với ~105–146 bài thì máy lag/đứng, cột ML lệch header, ML không hợp điện thoại, skin .wsz chỉ hiện cửa sổ chính + mọi nút bấm chỉ lên/xuống mà không làm gì, load .m3u chậm hơn Webamp, kênh TV360 báo lỗi oan (bấm load lại 1–2 lần thì xem được).

### (1) Hiệu ứng thật ở chỗ video: cửa sổ Video của Webamp = cửa sổ Milkdrop (`renderer.js`)
- Đối chiếu Webamp fork (`Vis.tsx`/`VideoWindow`): phát nhạc không có hình thì cửa sổ Video vẽ **Milkdrop** (preset butterchurn), có hình thì hiện thẻ `<video>`; cột spectrum 75 cột **CHỈ** thuộc display cửa sổ chính (76×16 px). Webamp không có AVS thật — object AVS trong skin Modern cũng vẽ bằng Milkdrop. Vậy Amp cũ vẽ 75 cột spectrum vào vùng AVS là **SAI VỊ TRÍ** (màu trắng thì đúng theo XML 566 vì ColorBand1..16 đều 255,255,255).
- Nay: vùng AVS nhúng + cửa sổ Video rời — Milkdrop **BẬT** (menu ⋯, mặc định TẮT) thì vẽ Milkdrop; Milkdrop **TẮT** thì nền đen `#000` + tên kênh/bài (như fork Webamp); **KHÔNG vẽ spectrum vào AVS/Video nữa**. Spectrum 75 cột + sóng OSC chỉ còn ở display cửa sổ chính (và đáy playlist khi main đóng). `drawAvsVis` giữ lại để đối chiếu, không còn được gọi. Giữ 2 trạng thái riêng (kiểu vis của display vs bật/tắt Milkdrop ở AVS/Video), đừng dùng 1 cờ chung làm display chính bị ép trắng như Webamp gốc.
- **Chi tiết lớp hiển thị (tìm ra khi sửa, 03/11 tối):** trong hộp AVS, thứ tự DOM là video (dưới) → canvas spectrum (luôn ẩn) → tên kênh → canvas Milkdrop (trên cùng). Nên thẻ `<video>` vẫn hiện khi "chưa biết" có hình (đen, trống) mà tên/Milkdrop nằm TRÊN nó nên người dùng vẫn thấy. Chỉ khi **có hình thật** (hoặc **đã từng có hình** — `avsVideoEverHadPic`, để `loadstart` nạp lại không nhá tên) thì tên/Milkdrop mới ẩn. Kênh audio chưa từng có hình (vd Đà Nẵng qua medatech — host xếp video nhưng luồng chỉ có tiếng) thì tên/Milkdrop hiện. `avsVideoEverHadPic` reset khi đổi bài/nạp playlist mới/thay thẻ.
- **Sửa test đi kèm (không phải sửa code chạy):** `avs-test.js` nạp radio.m3u ở setup (trước đây playlist rỗng nên không có tên để hiện); `audio-test.js` gọi `engine.destroy()` cuối mỗi section (timer retry/native của engine cũ còn sót tạo thêm instance HLS làm lệch đếm toàn cục — lỗi test, không phải lỗi chạy thật: trên máy thật chỉ có 1 engine).

### (2) Ticker tên bài trống — 2 nguyên nhân cùng tồn tại (`renderer.js`)
- **(H1) `glyphURL` bỏ tô màu khi trắng:** chỉ làm `source-in` khi `col !== "#fff"`, mà màu ticker đúng là trắng nên glyph chỉ còn alpha ~10% (đo trên Songtickerfont.png: mean alpha 26,1/255, chỉ 12px ở alpha 255). Winamp/WACUP vẽ bitmapfont bằng cách dùng ảnh làm mặt nạ rồi tô màu font ĐẶC. Đã sửa: **LUÔN** tô đặc glyph bằng màu font (`source-in` với `colorOf(color)`) cho mọi màu kể cả trắng. Số đồng hồ, KBPS/KHZ dùng font khác — đã kiểm, không cùng lỗi nên không sửa.
- **(H2) `setTickerText` async không seq-guard:** 2 lần đổi bài liên tiếp, lần cũ về sau có thể ghi đè lần mới; `setPlaylistData` chỉ `requestRerender()` chứ không gọi `setTickerText` trực tiếp; đường resume (nút Play → `togglePlay` → `resume()`) không bao giờ đồng bộ lại ticker; `onAudioPlayingChange` chỉ `clearTickerError` + `syncTickerAnim`. Đã sửa: thêm seq-guard cho `setTickerText` (giống `timerElsSeq`/`infoElsSeq`); `setPlaylistData`/`setPlaylistItems`/`onAudioPlayingChange`/`togglePlay` gọi lại `setTickerText` để đồng bộ với mục đang phát.
- **Kiểm chứng:** jsdom KHÔNG tái hiện được lỗi này (không có canvas 2d nên `glyphURL` trả null → fallback chữ Arial) — test mới `v10-3-test.js` dùng stub canvas ghi lại `fillRect` để chứng minh `source-in` + fill trắng + seq-guard. **Kiểm bằng headless Chrome thật CHƯA làm được trong sandbox** (Chrome cần WebGL policy của browser-daemon; script `headless-ticker-check.mjs` đã viết sẵn — CDP 127.0.0.1:9222 + server 127.0.0.1:8123, đo pixel glyph trắng đặc trong trang + chụp clip vùng ticker) — chờ kiểm trên điện thoại thật: mở Amp, phát "Đà Nẵng", tên bài phải hiện chữ trắng rõ trên display, đổi bài 2 lần liên tiếp thì ticker hiện đúng bài mới.

### (3) ML load lười — mở ML hiện list ngay, tag điền dần (`metadata.js` + `renderer.js`)
- **Đính chính quan trọng (Hải làm rõ 20:05): tag ĐỌC ĐƯỢC** (ảnh 20:09: mục 1–26 đã hiện "Hoang Oanh") — chỉ là **load quá lâu** nên cột Nghệ sĩ chưa kịp hiện ("Không rõ") và máy lag luôn trong lúc chờ. Đây là vấn đề **hiệu năng load, KHÔNG phải lỗi đọc tag** — parser ID3/FLAC không sửa gì.
- Nguyên nhân lag: nạp ~105 file thì đọc tag + probe duration **đồng loạt, chặn UI** (105 thẻ audio cùng lúc + vẽ lại toàn bộ list sau mỗi file).
- Đã sửa: `addLocalFiles` chỉ thêm mục + 1 lần vẽ lại rồi trả ngay (đo jsdom: thêm 105 file đồng bộ hết **6ms**); worker đọc tag concurrency **2**, mỗi file xong `setTimeout(0)` nhường luồng; `probeLocalDuration` chỉ tạo thẻ tạm, `startDurationProbe` mới gán src, timeout 4000ms; `applyMetadataToItem` gom refresh 120ms (`scheduleListRefresh`); cache `localMetaCache` (khóa tên|size|webkitRelativePath) — mở ML lần 2 không đọc lại; `item._file` giữ File gốc nên mục local không mất URL phát được.
- ML vẽ **từng đợt 60 hàng** (`buildMlRows` + `flushMlRows()`, cuộn vẽ thêm) thay vì vẽ 1 lần 146 hàng.

### (4) Header ML lệch cột + ML gọn trên điện thoại (`renderer.js`)
- **Lệch cột (ảnh 20:09):** header và hàng dữ liệu dùng 2 layout khác nhau (header không có cột số thứ tự). Đã sửa: 1 định nghĩa duy nhất `ML_COL_DEFS` (số 30px căn phải, tên flex auto, nghệ sĩ 110px, album 120px, thời lượng 48px căn phải) + `PL_COL_DEFS`, helper `listColSpan` dùng chung cho header ML, hàng ML, hàng playlist; số thứ tự tách ô riêng `.pl-num`.
- **ML không hợp điện thoại (ảnh 20:12):** khung ML theo XML rộng **790px**, thu nhỏ về 360px thì cột bị đẩy ra ngoài (chỉ còn Nghệ sĩ + Album, cột Tên bài mất, cây trái bị cắt). **Lựa chọn layout cho điện thoại (XML quy định 790px cho desktop, điện thoại phải gọn lại — ghi rõ):** viewport < 560px thì ML chuyển chế độ compact — chỉ hiện cột Số/Tên/Thời lượng, cây thư mục thành dải ngang 18px cuộn riêng, ruột xếp dọc, cửa sổ ML kẹp về đúng viewport (360px). `isMlCompact()` (ưu tiên `opts.viewportWidth` cho test), `mlColDefs()`, header vẽ lại khi đổi chế độ, `renderLayoutInner` nhận `sizeOverride`.

### (5) Skin Classic .wsz: nút chết + Playlist/EQ Classic (`classic.js` + `renderer.js` + `skin-loader.js` + `index.html`)
- **Chẩn đoán chính xác (Hải làm rõ 20:23): nút Classic CÓ phản hồi hình ảnh (lên/xuống, sprite đổi trạng thái — vùng bấm đúng tọa độ) nhưng CHƯA NỐI HÀNH ĐỘNG.** Không cần sửa vùng bấm/tọa độ.
- **Nguyên nhân nút chết thật:** `pressOn` gọi `preventDefault()` cả ở `touchstart` → trình duyệt không sinh click tương thích trên điện thoại thật (jsdom bấm được nên không phát hiện). Đã sửa: `classicButton` chỉ `preventDefault` khi không phải `touchstart` + `touchcancel` + `touchAction manipulation` + badge `o.badge()`.
- **Nối hành động thật cho từng nút** (dùng chung hàm điều khiển của Amp): play/pause/stop/next/prev/eject/EQ/PL/shuffle/repeat/volume/balance/seek/clutter — bấm từng nút đều có tác dụng thật trên điện thoại thật (test jsdom mô phỏng đúng đường chạm: pointerdown/touch tại tọa độ màn hình đã scale).
- **Playlist Classic mới** (275×116, theo fork: top 20 + list 58 + bottom 38; hàng 13px màu pledit.txt; nút ADD/REM/SEL/MISC/LIST 22×18, cuộn ±4 bài, giờ chạy chữ TEXT.bmp, shade 275×14) — nút PL mở được playlist Classic; **EQ Classic mới** (275×116, ON/AUTO/PRESETS, đồ thị 113×19, 11 dải dọc cell 15×65 theo công thức fork, vùng +12/0/−12dB, shade EQ_EX 275×14 volume/balance mini 3×7 đổi sprite trái/giữa/phải) — nút EQ mở EQ Classic (không mở ngăn kéo Modern nữa; `toggleDrawer` rẽ sang EQ Classic khi skin Classic).
- **Đường nạp .wsz rà lại toàn bộ:** hộp chọn file nhận `.wal,.zip,.wsz` (trước đây thiếu `.wsz`); `findByBasename` tìm txt trong thư mục con (vd 3DNow); `MIME_BY_EXT`/`makeBlob` (bmp→`image/bmp`...); `refreshClassicMain` đồng hồ nháy khi pause + thumb seek ẩn khi dừng; volume Classic travel **51** (input fork rộng 65px, thumb 14px → 65−14; click giữa travel thật ở x=32.5 mới là 0.5 — test cũ click x=34 cho 0.529 là ĐÚNG theo fork, đã sửa test); balance giữ hết dải (fork không đặt rộng input).
- **Các lệch nhỏ theo fork (ghi rõ, không giấu):** repeat-one hiện "1" (fork dùng sprite repeat-one riêng); seek thumb ẩn khi dừng; đồng hồ nháy khi pause; EQ Auto là no-op theo chốt của Hải (không làm).

### (6) Load .m3u nhanh + retry 2 lần trước khi báo lỗi (`renderer.js` + `audio.js`)
- **Load .m3u chậm hơn Webamp:** Amp gọi `addPlaylistItem` từng kênh — mỗi kênh 1 lần vẽ lại toàn bộ (41 kênh = 41 lần). Đã sửa: `addPlaylistItems()` đẩy hết rồi vẽ lại **1 lần** (`addUrl` 41 kênh chỉ gọi `onRerender` 1 lần); metadata/duration điền dần sau như hướng load lười.
- **TV360 báo lỗi oan (Hải 20:35):** Webamp báo lỗi nhưng bấm load lại 1–2 lần thì xem được. Đã sửa: lần load đầu thất bại thì **tự thử lại tối đa 2 lần** (tổng 3 lần nạp, mỗi lần cách 3s — `MAX_LOAD_RETRIES = 2`, `retryCount` thay boolean `retried` cũ), rồi mới xét fallback CORS rồi báo lỗi. Báo lỗi chỉ sau khi đã thử lại mà vẫn thất bại. V10.2 đã có watchdog tự nối lại khi lặng; đợt này thêm retry lúc load đầu.

### Kiểm chứng đợt v10.3 (jsdom)
- `v10-3-test.js` (MỚI) **53 PASS, 0 FAIL**: glyph trắng tô đặc (source-in + fill trắng), seq-guard ticker (đổi bài 2 lần liên tiếp hiện đúng bài mới), AVS không vẽ spectrum (đen khi Milkdrop tắt / Milkdrop khi bật / cửa sổ rời không spectrum), nạp 105 file lười (list hiện ngay 6ms, tag điền dần, đủ 105 không rớt, phát được đầu/giữa/cuối, cache mở lại không đọc lại), ML từng đợt 60 hàng + header/hàng thẳng cột, ML compact 360px đủ mục, .m3u 41 kênh 1 lần vẽ lại.
- Toàn suite: **2971 PASS, 0 FAIL** (giữ 2851 PASS cũ + 53 test mới v10-3 + 67 PASS tăng thêm ở các test cũ đã sửa/cập nhật theo hành vi mới). `node --check` mọi JS + script inline OK, harness nạp OK.
- Headless Chrome thật: **chưa kiểm được** (xem mục (2) — script đã viết sẵn `headless-ticker-check.mjs`).

### Giới hạn còn lại (ghi rõ thay vì để sai lặng)
- Region mask chưa áp (cửa sổ Classic vẫn hình chữ nhật, chưa cắt theo `region.txt`); cursor `.cur` chưa map (dùng cursor mặc định); `GEN_TEXT` chưa có; ML Classic/minibrowser chưa có; playlist Classic chưa resize được; EQ Auto no-op theo chốt.
- Cần thêm thông tin từ Hải để kiểm tiếp skin .wsz (xem báo cáo giao): tên skin .wsz đã thử + sai chỗ nào trên màn hình (vẽ sai vị trí/kích thước, nút nào, shade/vis/đồng hồ ra sao).

> **Tổng kết v10.5 (đóng gói 04/11):** toàn suite jsdom **3673 PASS, 0 FAIL** (37 file test + harness LOAD OK, `AMP_VERSION` 10.5 ở mọi file; 7 test mới v10.5: milkdrop-105 71, channels-105 49, classic-volume-105 72, classic-ticker-playlist-105 85, no-effect-when-stopped-105 97, video-button-105 124, drawer-hit-test-105 61).

## Đợt v10.5 (04/11 rạng sáng — rãnh volume/balance Classic hết khối xanh)

### (1) Khối xanh ở rãnh balance (`renderer.js`)
- **Bằng chứng ảnh thật:** 03:15 dừng 00:00 + 03:23 đang phát Đà Nẵng 00:09 — khối xanh dương rõ ở đầu rãnh trượt ngay sau núm volume, trước nút EQ/PL, **có cả lúc dừng lẫn lúc đang phát**. Đo pixel ảnh 1: khối nằm ở x ảnh 463..483, y 330..360 → quy về skin x≈177..185, y≈57..70 = đúng **9px đầu của rãnh balance** (balance ở (177,57) 38×13), cao đủ 13px.
- **Nguyên nhân gốc:** `classicSlider()` vẽ track bằng TOÀN sheet (`background-position-x` luôn 0), trong khi fork **cắt sprite nền theo rect** (`skinParserUtils.ts` `getSpriteUrisFromImg`: `drawImage(img, -sprite.x, -sprite.y)` vào canvas đúng w×h sprite). `MAIN_BALANCE_BACKGROUND` có **x=9** (`skinSprites.ts:112`; `classic.js:96`) nên 9 cột đệm bên trái sheet lọt vào đầu rãnh: màu đệm là cyan (0,198,255) ở skin trong ảnh → khối xanh; rãnh thật đồng thời **lệch trái 9px + cụt 9px bên phải**. Đối chứng bằng pixel thật: crop kiểu Amp (x=0..38) của `balance.bmp` 3DNow hiện khối magenta (255,0,255) 9px ở đầu, crop kiểu fork (x=9..47) thì rãnh sạch. Volume (sprite x=0) và position (x=0) không sai vùng — rãnh volume trong ảnh (vạch fill xanh trước núm) là đúng.
- **Cách sửa:** `classicSlider` nhận thêm `cfg.backgroundSprite`, lấy rect (x,y) qua `lib.spriteRect` rồi đặt `backgroundPosition = (-x)px (-(y+off))px` (`trackOffset` chỉ cộng thêm bước frame theo y như công thức fork); 4 nơi tạo slider truyền `backgroundSprite`: volume `MAIN_VOLUME_BACKGROUND`, balance `MAIN_BALANCE_BACKGROUND`, position chính `MAIN_POSITION_SLIDER_BACKGROUND`, position shade `MAIN_SHADE_POSITION_BACKGROUND`. Dải EQ Classic dùng `trackPosition` riêng và EQ shade dùng `noTrackBg` nên không đụng.
- **Lỗi cùng loại tìm thêm khi sửa:** seek mini ở shade cũng sai vùng — sprite nền ở **(0,36)** mà track lấy **(0,0)** (vùng nút option/minimize của `TITLEBAR.BMP`, 29 màu) — sửa cùng bằng `backgroundSprite` (nay `0px -36px`).
- **"Kế bên" volume là gì:** khối xanh nằm ở **đầu rãnh balance** (kế bên phải volume) — chính nó là lỗi; nút **EQ/PL kế bên vẫn đúng** (23×12 ở (219,58)/(242,58), sprite `MAIN_EQ_BUTTON`/`MAIN_PLAYLIST_BUTTON`); **MONO/STEREO mờ khi dừng là ĐÚNG** (Winamp thật cũng mờ khi dừng, code `refreshClassicMain`: dừng → `"none"`). Ảnh 03:23 hiện MONO khi đang phát Đà Nẵng là lỗi đo kênh đã biết từ trước, **đã sửa riêng trong cây v10.5** bằng đường Webamp (`itemChannels`, không đo tín hiệu — đài radio `.m3u` có `channels: 2` → STEREO); bản deploy trên ảnh còn là bản cũ nên vẫn MONO, không thuộc sửa này.

### (2) Rãnh balance chậm 1 nhịp khi kéo (`renderer.js`)
- **Nguyên nhân gốc (lộ ra khi test kéo):** `trackOffset` của volume/balance đọc `demo.volume`/`drawerState.balance` TRỰC TIẾP, nhưng `rec.setFrac` gọi `place()` **trước** `onSet` (nơi `applyBalance` mới cập nhật state) nên frame rãnh tính từ giá trị CŨ — kéo balance sang trái hết rồi track vẫn hiện frame cũ, phải kéo lần nữa mới đổi. Volume bịt được nhờ `updateVolumebar()` → `refreshClassicMain()` vẽ lại ngay sau `onSet`, balance thì không có đường vẽ lại đó.
- **Cách sửa:** `trackOffset` nhận `frac` mà `place()` đã truyền sẵn (`cfg.trackOffset(rec.frac)`) và dùng nó: `lib.volumeTrackOffset(frac)` / `lib.balanceTrackOffset(frac)` — khỏi đọc state ngoài. `refreshClassicMain` vẫn đồng bộ `rec.frac` từ state trước khi `place()` nên không lệch.
- Kiểm chứng: `classic-volume-105-test.js` (MỚI) **72 PASS, 0 FAIL** (bảng sprite x=9/x=0, offset frame, base-2.91 dừng + đang phát Đà Nẵng 00:09, kéo volume/balance/seek đổi núm + frame rãnh, fixture 3DNow trong thư mục con, seek shade (0,36), EQ/PL + MONO/STEREO dừng đúng); `classic-test.js` **163 PASS, 0 FAIL** (không hồi quy); harness nạp OK.
- Chưa kiểm chứng bằng jsdom (cần test máy thật sau khi up bản 10.5): khối xanh hết hẳn trên đúng skin trong ảnh (skin đó chưa rõ tên file — fixture 3DNow chỉ là chuẩn Webamp Classic, đệm magenta thay vì cyan); rãnh balance nhìn thẳng hàng với núm khi kéo; Đà Nẵng hiện STEREO ổn định ở Classic (đường `itemChannels` đã có trong cây nhưng chưa lên deploy).
- Lưu ý: `base-2.91.wsz` có frame nền balance **bản thân đã toàn cyan** (chỉ có vạch rãnh 2px) — sau sửa, Amp vẽ đúng vùng x=9..47 như fork (Webamp cũng vẽ y vậy); nếu thấy rãnh balance base-2.91 vẫn xanh thì đó là bitmap của skin, không phải renderer. Version bump lên 10.5 do bước đóng gói làm (chưa bump ở đây).

## Đợt v10.5 (04/11 — nút Video chỉ mở video, cài đặt Video/Vis chuyển sang menu ⋯)

Yêu cầu của Hải: "Nút video bên gốc phải ở trên chỉ mở video còn các cài đặt đã có nên trong nút kia rồi" — nút Video ở góc phải phía trên CHỈ mở video, các cài đặt Video/Vis đã có trong nút ⋯ (góc dưới-phải) rồi thì không cần trùng.

### (1) Nút đó là nút nào (xác định từ XML skin 566 + `renderer.js`)
- `button.vid.misc` (id trong XML, action `VID_Misc`, tooltip "Options"): nút ở đầu phải thanh nút của vùng AVS nhúng (`buttons.video` trong `player-normal-group.xml`, x=-40 relatx=1) và của cửa sổ Video rời (`video.buttons.group` trong `video-normal.xml`, x=-158 relatx=1). Trước đây bấm mở `videoMenuItems()` (8 mục kể cả Milkdrop v10.4). Nay chỉ mở video: `openAvs("video")` — đang mở rồi thì ở yên, không mở menu.
- `button.vis.misc` (action `Vis_Menu`): nút tương ứng ở chế độ Vis (`buttons.vis` / `vis.buttons.group`), trước đây mở `visMenuItems()` (7 mục). Nay chỉ mở hiệu ứng: `openAvs("vis")`.
- `videoavs.open` (id trong XML `player.content.dummy.group`, x=-37 y=19 relatx=1 — đúng nghĩa "góc phải ở trên" của cửa sổ chính): nút mở AVS; khi tùy chọn ngăn kéo "Open Context Menu" bật thì trước đây mở `visContextMenuItems()` (Video/Hiệu ứng/Tách rời/Đóng). Nay nhánh menu đã bỏ — bấm cũng chỉ mở video (`openAvs(mode)`), kể cả khi tùy chọn đó đang bật. Nhánh "Open Configuration" (mở ngăn kéo ở tab Options, trang visbutton) GIỮ NGUYÊN vì đó không phải menu cài đặt mà là tùy chọn Winamp người dùng tự bật. Hàm `visContextMenuItems()` đã gỡ hẳn.
- Classic (`.wsz`): KHÔNG có nút nào trong 3 nút trên — cửa sổ Video/Vis rời vẽ bằng `buildDetachedWindowFallback` (nút HTML 1x/2x/Fullscreen/Reattach, Prev/Next/Random bấm thẳng, không menu) nên không đổi gì ở Classic; cài đặt Video/Vis trên Classic dùng chung menu ⋯ (nút ⋯ ở ngoài skin, không phụ thuộc skin).
- Chuột phải vùng video: trước đây đã KHÔNG mở menu Video/Vis (chỉ có `oncontextmenu` ở hàng playlist + ticker) — giữ nguyên, không đổi.

### (2) Menu ⋯ trước/sau — mục nào phải chuyển sang
- Trước: menu ⋯ chỉ có 8 mục (Nạp skin / Thêm 1 bài / Thêm thư mục / Zoom 1x / Zoom Vừa màn hình / Crossfade / **Milkdrop** / Xem MAKI) — trong các mục Video/Vis, chỉ có **Milkdrop** là đã có sẵn. Mọi mục còn lại chỉ có trong menu Video/Vis, nên CHUYỂN HẾT sang ⋯ trước khi bỏ menu khỏi nút Video (không mất cài đặt nào).
- Sau: menu ⋯ có **18 mục** — 8 cũ + 10 mới (hợp của `videoMenuItems()` + `visMenuItems()` trừ Milkdrop, gộp trùng): Giữ tỉ lệ khung hình (✓), Cỡ thường (1x), Cỡ gấp đôi (2x), Toàn màn hình, Phóng to/Khôi phục cửa sổ, Tách rời (Detach)/Gắn lại (Reattach), Đóng Video/Hiệu ứng (gộp "Đóng Video" + "Đóng Hiệu ứng" — cùng gọi `closeAvs()`), Màu hiệu ứng trước, Màu hiệu ứng sau, Màu hiệu ứng ngẫu nhiên (✓). Nhãn động cập nhật mỗi lần mở menu (`markMenuChecks` đọc `renderer.getAvsState()`). Mở Video/Mở Hiệu ứng KHÔNG chuyển sang ⋯ vì đã có trong menu View (menubar Modern + menu clutter "O" của Classic).
- `videoMenuItems()`/`visMenuItems()` vẫn giữ nguyên hàm + export làm API (test đối chiếu đủ mục) nhưng không nút nào gọi nữa. Thêm export mới `setVisRandom(on)` để menu ⋯ bật/tắt "Màu hiệu ứng ngẫu nhiên" cùng 1 đường với menu Vis cũ (trước đây menu Vis gán thẳng `avsState.visRandom`).

### (3) Thay đổi đã làm (`renderer.js` + `index.html`, không bump version, không thêm file vào amp-v9)
- `renderer.js`: `VID_MISC` → `openAvs("video")`, `VIS_MENU` → `openAvs("vis")`; `videoavs.open` bỏ nhánh `vb === "menu"` (giữ nhánh `config`); gỡ `visContextMenuItems()`; thêm + export `setVisRandom()`; menu Vis dùng `setVisRandom()` thay cho gán trực tiếp.
- `index.html`: `#menu-pop` thêm 10 nút `data-act` (`vid-aspect/vid-1x/vid-2x/vid-fs/vid-max/vid-detach/vid-close/vis-prev/vis-next/vis-random`); `markMenuChecks()` cập nhật nhãn 4 mục có trạng thái; `wireMenu` thêm nhánh xử lý gọi đúng hàm renderer như menu cũ; cập nhật comment + `title` nút ⋯.
- Test cũ cập nhật theo hành vi mới: `page-test.js` (menu ⋯ 8 → 18 mục), `vis-options-songinfo-test.js` §2 (bật "Open Context Menu" rồi bấm `videoavs.open` nay mở thẳng video, không menu).

### Kiểm chứng (jsdom)
- Test mới `video-button-105-test.js` (MỚI) **124 PASS, 0 FAIL** (nút trong XML 566; bấm VID_Misc/VIS_MENU khi đang mở + khi tách rời → vẫn mở, không menu; `videoavs.open` khi "Open Context Menu" bật → mở video, không menu; nhánh "Open Configuration" giữ nguyên; menu ⋯ đủ 18 mục + đối chiếu từng mục của 2 menu cũ + nối dây từng `data-act`; hành vi 10 mục ⋯ qua hàm renderer; Classic không có nút misc/videoavs.open, fallback giữ nút bấm thẳng; không còn chỗ nào gọi `showPlaylistMenu(div, videoMenuItems()/visMenuItems()/visContextMenuItems())`; chuột phải vùng video không có menu).
- Các test cũ liên quan giữ nguyên, không hồi quy: `page-test.js` **88 PASS** + `avs-test.js` **216 PASS** + `vis-options-songinfo-test.js` **147 PASS** (tất cả 0 FAIL). Lưu ý: `avs-vis-test.js` chạy 1 lần trong đợt này ra 3 FAIL Milkdrop (`mode milkdrop` → `black`) rồi chạy lại **45 PASS, 0 FAIL** 3 lần liên tiếp với cùng code — flake do timer trong test (đã gặp dạng này ở `milkdrop-load-test.js`), không liên quan sửa này.
- Đăng ký test mới vào suite: chạy `node video-button-105-test.js` như các file `v10-4-*-test.js` khác (KHÔNG sửa `harness.js` — harness chỉ kiểm nạp file amp-v9).
- **Chưa kiểm chứng được bằng jsdom — cần test máy thật:** bấm nút Video (misc) trên điện thoại thật ở cả vùng nhúng lẫn cửa sổ rời → video mở/hiện ngay, không menu nào hiện; mở menu ⋯ kiểm tra đủ 10 mục Video/Vis mới + nhãn ✓/Phóng to/Tách rời đổi đúng theo trạng thái; bật "Open Context Menu" trong ngăn kéo Options rồi bấm nút Video góc phải trên của cửa sổ chính → vẫn chỉ mở video.
- **Lưu ý còn mở (không tự ý sửa thêm):** tùy chọn "Open Context Menu" trong ngăn kéo Options nay tạm không còn tác dụng (radio vẫn hiện vì ngăn kéo dựng từ XML — ẩn nó cần sửa riêng đường render ngăn kéo, để Hải quyết); nút VID_Misc/Vis_Menu chỉ hiện khi đúng chế độ của nó đã mở nên bấm vào lúc đó là no-op (đã mở rồi thì ở yên) — đúng yêu cầu "chỉ mở video", nhưng nếu Hải muốn nút đó làm việc khác khi video đang mở (vd đóng video) thì nói thêm.

## Đợt v10.4 (03/11 tối — ticker hiện đúng + Milkdrop hiện hình + tìm nghệ sĩ + ML đúng thiết kế Winamp + menu mở sang trái + stereo/mono ổn định)

### (1) Ticker hiện đúng tên bài (`renderer.js` + `index.html`)
- **Nguyên nhân gốc** (đã điều tra, ảnh thật 19:46–20:35): div `.txt` của ticker nằm trong wrapper `<div class="inner">` (`display:inline-block`, rỗng, chỉ chứa mỗi `.txt` absolute không có `top`/`left`). Trên trình duyệt thật, vị trí tĩnh của nó tính theo baseline của wrapper rỗng nên rơi xuống ~13–16px so với đỉnh hộp `.ticker` cao 23px; glyph cao 22px bị `overflow:hidden` cắt gần hết — khớp ảnh (ticker trống, chỉ vệt chấm mờ ở đáy display). Đồng hồ/KBPS/STEREO hiện vì `.txt` của chúng là con trực tiếp của hộp đã position. **Sửa H1 (glyph trắng tô đặc) + seq-guard ở v10.3 đều đúng nhưng không phải nguyên nhân gốc** — nên ticker vẫn trống.
- **Cách sửa:** bỏ wrapper `.inner` khỏi nhánh ticker của `renderText` — `.txt` thành con trực tiếp của hộp `.ticker` đã position như mọi chữ bitmap khác; `rec.holder` trỏ tới chính `.txt` (khởi tạo `null`, `setTickerText` thay `.txt` cũ bằng `.txt` mới qua `replaceChild`/`appendChild`); CSS bỏ `.stage.ticker.inner`, thay bằng `.stage.ticker.txt{will-change:transform}`. Không đụng `glyphURL`/`loadFont`/seq-guard.
- Kiểm chứng: `v10-4-ticker-test.js` (MỚI) **21 PASS, 0 FAIL** (cấu trúc `.ticker > .txt`, đổi bài 2 lần liên tiếp, cuộn, setTickerText/stepTicker/syncTickerAnim/getTickerState vẫn đúng).

### (2) Milkdrop đen trên trình duyệt thật — nguyên nhân gốc + hiện hình (`renderer.js` + `milkdrop.js` + `index.html`)
- **Bằng chứng ảnh thật 22:05:** menu ⋯ hiện "✓ Milkdrop: Bật", nhạc đang phát (0:12, KBPS 128, KHZ 48, EQ bật, MONO, cột vis vàng nhảy) mà vùng AVS ĐEN HOÀN TOÀN, sau 2+ phút vẫn đen, không báo lỗi.
- **Nguyên nhân gốc (khớp 100% ảnh thật):** `applyMilkdropVisibility` HIỆN canvas Milkdrop khi AVS mở + không có hình thật — KỂ CẢ chế độ `"video"` (mặc định) — nhưng `syncMilkdrop` cũ chỉ chạy vòng render rAF khi `mode === "vis"`. Canvas hiện mà loop không chạy; thêm `setVisible(false)` ẩn canvas đi sau khi renderer vừa hiện, trong khi `syncAvsName` tưởng canvas đang hiện nên tên kênh cũng ẩn theo → vùng AVS đen hoàn toàn, không một lỗi nào. Sửa bật-khi-đang-phát ở đợt trước chưa đủ vì không phải chỗ gãy này.
- **Cách sửa:** `applyMilkdropVisibility` lưu kết quả vào `milkdropShown`, `getMilkdropState()` trả `{active, hasCanvas, shown}`; `syncMilkdrop` mới lấy `setVisible` theo `shown` (fallback về điều kiện cũ `mode==="vis"` khi thiếu); `applyAvsMediaVisibility()` cuối gọi thêm `applyMilkdropVisibility()` để video thật xuất hiện/biến mất giữa chừng thì canvas Milkdrop ẩn/hiện theo ngay. `milkdrop.js`: chặn canvas 0×0 (báo rõ), đếm lỗi render liên tiếp (lỗi lần 3 thì đặt `state.error`), `applyPreset` thành công xóa lỗi cũ, `enable()` khi `applyPreset` thất bại thì báo "không nạp được preset" thay vì im lặng; `enable()` giữ lỗi cụ thể của `ensureVisualizer` thay vì ghi đè bằng "chưa có AudioContext". Link CDN đã đưa lên đầu `milkdrop.js` (dòng 51–54, 3 hằng `BUTTERCHURN_CDN`/`PRESETS_CDN`/`DEFAULT_PRESET_*` giữ nguyên) + mục Milkdrop trong menu Vis/Video + sửa bật khi đang phát; dọn 137 dòng comment thừa (trừ `renderer.js`).
- **Báo lỗi rõ trên màn hình thay vì đen im lặng:** `reportMilkdropError()` đưa lỗi Milkdrop tồn tại lên banner đỏ `#status` (CDN chết / WebGL không chạy được / không tải được preset / canvas 0×0), mỗi lỗi chỉ báo 1 lần, hết lỗi thì reset.
- **Tham chiếu hình:** ảnh đối chứng VOV1 22:23 cho thấy cửa sổ VIDEO của fork Webamp vẽ Milkdrop xanh lá — đó là hình mẫu Milkdrop khi bật phải thấy.
- Kiểm chứng: `v10-4-milkdrop-black-test.js` (MỚI) **20 PASS, 0 FAIL** (bật khi đang phát ở mode video → render chạy; WebGL lỗi → banner; preset lỗi → báo rõ; canvas 0×0 → báo rõ); `milkdrop-load-test.js` **48 PASS, 0 FAIL**.

### (3) Tìm nghệ sĩ — ô tìm khớp tên + nghệ sĩ + album, không dấu (`renderer.js`)
- Trước: `playlistFiltered()` chỉ khớp `item.name`; ML chỉ lọc theo nút cây, không có ô tìm — gõ "Hoang Oanh" không ra gì dù tag nghệ sĩ đã đọc được (v10.3: mục 1–26 hiện "Hoang Oanh").
- Nay: matcher chung `itemSearchHaystack()`/`itemMatchesSearch()` khớp tên + nghệ sĩ + album qua `metadataDisplayArtist`/`metadataDisplayAlbum`, bỏ dấu cả từ khóa lẫn dữ liệu bằng `stripDiacritics` + `toLowerCase` (gõ "hoang oanh" ra "Hoàng Oanh"); loại "Không rõ" khỏi chuỗi khớp để gõ "khong ro" không ra tất cả. ML thêm ô tìm `.ml-search` (placeholder "Tìm tên/nghệ sĩ/album…") + export `setMlSearch(text)`.
- Kiểm chứng: `v10-4-search-test.js` (MỚI) **27 PASS, 0 FAIL** ("hoang oanh"/"Hoang Oanh"/"Hoàng Oanh"/"oanh" → 2 mục; "khanh ly" → 1; "nhac vang" theo album → 1; "khong ro" → 0; tìm tên bài vẫn như cũ).

### (4) ML trở lại đúng thiết kế Winamp (`renderer.js`)
- **Hủy layout gọn v10.3** (khung <560px chỉ hiện Số/Tên/Thời lượng, cây thành dải ngang 18px, cửa sổ kẹp 360px) theo yêu cầu của Hải ("Ml trở lại đúng thiết kế"). ML luôn vẽ đủ **cây thư mục bên trái + đủ 5 cột Số/Tên/Nghệ sĩ/Album/Thời lượng** ở mọi kích thước màn hình; cửa sổ ML **giữ kích thước riêng như Winamp thật** (mặc định 790px theo XML, kéo resize được, stage mở rộng theo) — KHÔNG kẹp về bằng stage (bản nháp v10.4 từng ép ML = stageW, đã sửa lại vì làm hỏng kéo resize ML: kéo rộng hơn stage thì bị ép về, `onWinSizeChange` lưu sai). Bảng **cuộn ngang** (`minWidth: 480px`, `.ml-list` có `overflowX:auto`) khi cửa sổ hẹp hơn bảng, thay vì giấu cột. Bỏ hẳn `isMlCompact()`; header/hàng dùng chung 1 định nghĩa cột (`ML_COL_DEFS`) nên không lệch cột nữa.
- Kiểm chứng: mục C trong `v10-4-search-test.js` (ML 360px: không compact, đủ 5 cột, cây trái, bảng cuộn ngang, header/hàng 5 ô, hàng `minWidth 480px`, có ô tìm).

### (5) Menu mở sang trái khi gần mép phải (`renderer.js`)
- Trước: `placePopupInStage` CHỈ xử lý tràn DỌC (mở hướng lên), KHÔNG xử lý tràn NGANG — menu mở gần mép phải thì tràn ra ngoài stage, bị cắt/che (ảnh 21:50: menu Vis chỉ hiện mép trái "Hiệu…", "Toà…", "Tác…", "Đón…").
- Nay: kẹp thêm NGANG — `left = min(anchorLeft, stageW - menuW)`, kẹp >= 0 (menuW từ `offsetWidth`, jsdom ước theo dòng dài nhất `len*7+22`). Áp cho MỌI menu qua `showPlaylistMenu`/`placePopupInStage` (Video/Vis, File/Play/Options/View/Help, chuột phải playlist/trackmenu, Add/Manage/Misc, trackinfo, preferences). Menu ngoài skin cũ (`#menu-pop` neo `right:10px`) đã BỎ 04/11 (các mục vào menu trong giao diện skin — xem mục mới ở trên); `#maki-panel` (căn giữa, `width:min(340px,100vw-24px)`) không tràn phải — đã kiểm.
- Kiểm chứng: `v10-4-menu-overflow-test.js` (MỚI) **11 PASS, 0 FAIL** (anchor gần mép phải → menu không tràn khỏi stage; anchor giữa → vẫn mở sang phải bình thường).

### (6) Chỉ báo stereo/mono ổn định (`audio.js` + `metadata.js` + `renderer.js`)
- **Bằng chứng ảnh thật 22:18:** đang phát "1. Đà Nẵng", chỉ báo **MONO** sáng — mà ffprobe đo Đà Nẵng là **STEREO thật (AAC 48kHz, 2 kênh)**. Webamp hiện stereo = ĐÚNG, Amp hiện mono = SAI. Cách đo cũ (ChannelSplitter L/R, 1 cửa sổ 500ms rồi chốt vĩnh viễn) KHÔNG ỔN ĐỊNH: đài stereo vẫn có đoạn nội dung gần như mono (giọng nói ở giữa) làm L≈R → chốt nhầm "mono" cả buổi, lúc đúng lúc sai tùy nội dung nhạc tại thời điểm đo.
- **Cách sửa:** (a) **Ưu tiên số kênh của nguồn như Webamp** (`numberOfChannels`): file local có tag `channels` (`metadata.js` `normalizeMetadata`/`applyMetadataToItem` lưu `item.channels`, trước đây bị bỏ rơi) thì 1 = mono, >=2 = stereo, khỏi đo tín hiệu. Radio không có metadata kênh nên đi đường đo. (b) **Đo tín hiệu nhiều cửa sổ + đo lại, không chốt vĩnh viễn:** "stereo" kết luận NGAY ở cửa sổ đầu tiên lệch L/R; "mono" cần 3 cửa sổ 500ms LIÊN TIẾP đều mono mới kết luận (tạm) rồi **đo lại sau 5s** — lật về stereo nếu cửa sổ sau lệch (báo lại renderer qua cb đã lưu); im lặng tối đa 6 cửa sổ rồi trả null.
- **Chuẩn kiểm cuối (22:23, sửa lại): Đà Nẵng phải hiện STEREO ổn định** (không lúc mono lúc stereo). **VOV1 KHÔNG phải chuẩn mono:** ảnh đối chứng 22:23 cho thấy VOV1 hiện **STEREO ở cả 2 bên** (Webamp fork 0:34, 192 KBPS 44 KHZ, STEREO; Amp 0:37, KBPS 128, KHZ 48, EQ, STEREO) — ffprobe báo 1 kênh có thể là HE-AAC v2 parametric stereo (header ghi mono nhưng giải mã ra stereo) nên cả 2 bên hiện stereo cho VOV1 đều ĐÚNG. Hủy chuẩn "VOV1 phải ra mono" ở các đợt trước.
- Kiểm chứng: `v10-4-channels-test.js` (MỚI) **10 PASS, 0 FAIL** (file 1 kênh → mono; file 2 kênh → stereo; Đà Nẵng qua đường đo → stereo; VOV1 stereo là đúng; chưa đo được → stereo tạm); `audio-test.js` Đợt K mở rộng **328 PASS, 0 FAIL** (1 cửa sổ L≈R chưa chốt mono; đổi dữ liệu sang stereo giữa chừng → stereo; kết luận mono tạm + đo lại sau 5s lật về stereo).

### Kiểm chứng đợt v10.4 (jsdom)
- Test mới: `v10-4-ticker-test.js` **21 PASS** + `v10-4-search-test.js` **27 PASS** + `v10-4-milkdrop-black-test.js` **20 PASS** + `v10-4-menu-overflow-test.js` **11 PASS** + `v10-4-channels-test.js` **10 PASS** (tất cả 0 FAIL).
- Toàn suite: **2924 PASS, 0 FAIL** (baseline v10.3 là 3030 PASS — số giảm do đã gộp/bỏ một số check trùng và cập nhật kỳ vọng theo hành vi mới v10.4: ML không compact, ticker không `.inner`, version 10.4; không còn FAIL nào).
- `node --check` mọi JS + script inline OK, harness nạp OK.

## Đợt v10.5 (04/11 rạng sáng — chỉ báo stereo/mono theo Webamp: bỏ đo tín hiệu, lấy số kênh từ metadata track)

> **Đã bump version lên 10.5 ở bước đóng gói** (trước đó vẫn 10.4 ở mọi file). Chỉ sửa `audio.js`/`renderer.js` + test + README; không thêm file vào gói zip, không khôi phục `skin-browser.js`.

### (1) Bằng chứng ảnh thật — cùng đài Đà Nẵng, cả 2 skin đều sai
- **03:11, skin Modern** (`1000094492_0_mzix.jpg`): đang phát Đà Nẵng 0:20, KBPS 128, KHZ 48, EQ bật, ticker ĐÃ ĐÚNG ("DA NANG") — nhưng chỉ báo hiện **MONO**, dù Đà Nẵng là STEREO thật (ffprobe AAC 48kHz, 2 kênh). Webamp hiện STEREO cho cùng đài này (đúng), Amp hiện MONO (sai).
- **03:23, skin Classic** (`1000094494_2_il1p.jpg`, "Còn nhiều cơ lỗi"): nạp skin Webamp Classic, đang phát Đà Nẵng 00:09, video DNRT Radio đang chạy trong cửa sổ VIDEO, KBPS 128 / KHZ 48 hiện đúng — chỉ báo trên display Classic: **MONO sáng rõ, STEREO mờ**. Cùng 1 lỗi gốc, 2 skin cùng sai — sửa phải đúng cả Modern (layer `channels`) lẫn Classic (sprite MONO/STEREO).

### (2) Nguyên nhân gốc — đo tín hiệu không phân biệt được "stereo đang phát đoạn gần mono" với "mono thật"
- `audio.js:444` `measureChannels` (v9.7/v10.4): ChannelSplitter(2) tách L/R + 2 analyser đo biên độ từng kênh; 1 cửa sổ 500ms L≈R (v9.7) rồi 3 cửa sổ liên tiếp L≈R (v10.4) là chốt "mono". Nhưng đài stereo thật vẫn có đoạn nội dung gần như mono — giọng nói ở giữa, quảng cáo mono (đêm 03:11 Đà Nẵng đang phát đoạn như vậy) — làm 3 cửa sổ liên tiếp đều đọc L≈R → chốt MONO cho cả đài stereo. Đây là lỗi của **phương pháp**, không phải của ngưỡng/timer: không có cách chỉnh ngưỡng nào phân biệt được "luồng stereo đang phát nội dung đặt giữa" với "luồng mono thật" chỉ bằng L/R tức thời.
- Tính mong manh thứ hai (chứng cứ trong code, chưa chứng minh là trigger trên máy thật): kết luận mono chỉ là tạm, hẹn đo lại sau 5s (`audio.js` `scheduleReverify`, `measureTimer`) — nhưng **mọi** lần `updateChannelsIndicator()` chạy (cuối mỗi `renderLayoutInner`, `renderer.js:9432` — mở/đóng PL/ML/ngăn kéo đều vẽ lại) lại gọi `measureChannels` mới, mà `measureChannels` mở đầu bằng `clearMeasureTimer()` (`audio.js:446`) → hủy hẹn đo lại cũ và đo lại từ đầu; nội dung lúc đó vẫn gần mono thì lại chốt mono. Vòng lặp này làm MONO sai "dính" lâu hơn 5s rất nhiều.
- `renderer.js:1933` `updateChannelsIndicator` là nơi duy nhất đưa kết quả đo sai đó lên màn hình (cả Modern qua `setChannelsState` lẫn Classic qua `refreshClassicMain` đọc `audioEngine.getMeasuredChannels()`, `renderer.js:8092`).

### (3) Cách Webamp — KHÔNG đo tín hiệu, số kênh là thuộc tính của track (hướng chính, theo quyết 03:14 "lấy code của webamp qua")
Đã đọc code fork trong `~/workspace/webamp-fork/src/` (không copy React/Redux — chỉ lấy luận chạy):
- `packages/webamp/js/actionCreators/files.ts` `parseM3U()` (dòng 101–141): **luôn** gắn `metaData: {artist: "", title}` cho mọi track .m3u; `loadMediaFile()` (dòng 357–369) thấy `metaData` thì `SET_MEDIA_TAGS` với `numberOfChannels: 2` — comment gốc: *"For now, we lie about these next three things"* — **mọi kênh radio .m3u đều có channels = 2 ngay từ lúc nạp**, không bao giờ đo lại.
- `fetchMediaTags()` / `genMediaTags()` (`files.ts:398`, `fileUtils.ts:8`): `music-metadata` `parseWebStream`/`fetchFromUrl`/`parseBlob` lấy `format.numberOfChannels` **thật** cho file local (blob) — file mono 1 kênh → channels = 1.
- `reducers/tracks.ts` `SET_MEDIA_TAGS`: `channels = numberOfChannels ?? channels` cũ; `selectors.ts:721` `getChannels` trả `track.channels || null`; `components/MainWindow/MonoStereo.tsx:10–11`: stereo sáng khi `channels === 2`, mono sáng khi `channels === 1` — **chỉ đọc thuộc tính track, không có ChannelSplitter/analyser đo kênh nào trong toàn bộ src** (grep `mono|stereo|numberOfChannels|channelCount` trừ `built/` chỉ ra các file trên).
- Hệ quả: STEREO của Webamp cho Đà Nẵng là tính chất của **định dạng luồng** (mặc định 2 kênh cho track .m3u), không phụ thuộc nội dung đang phát — giọng nói ở giữa vẫn là luồng stereo. Đó chính là hành vi cần đạt.

### (4) Port sang Amp (`audio.js` + `renderer.js`)
- **`audio.js` — XÓA HẲN đường đo tín hiệu:** bỏ `chSplitter`/`chAnL`/`chAnR`/`chProbeFor`, `hookChannelProbe`, `measureChannels`/`getMeasuredChannels`, `resetMeasuredChannels`, `MEASURE_*`, trường `measuredChannels` trong `getState()` và trong `_graph()`; `routeSource` chỉ nối source về preamp/destination như cũ. Engine không còn khái niệm "đo kênh" — không còn đường nào đưa MONO sai lên màn hình.
- **`renderer.js` `parseM3U()` — mọi mục .m3u có `channels: 2`** (y hệt Webamp: `.m3u` → `metaData` → `numberOfChannels: 2`): iptv.m3u 218 mục đều channels = 2, kể cả mục không có `#EXTINF`.
- **`renderer.js` `applyWebampChannels(item)` + `itemChannels(item)` (mới):** mục URL http(s) chưa biết số kênh → `channels = 2`, áp ở mọi đường nạp mục (`setPlaylistData`/`setPlaylistItems`/`addPlaylistItem(s)` — đổi bài/đổi đài đọc số kênh của **mục mới**, không giữ mono của đài trước). Mục local `blob:` KHÔNG gán mặc định — `probeFile` đọc tag thật rồi ghi đè (1 = mono thật).
- **`renderer.js` `updateChannelsIndicator()` (viết lại):** chỉ đọc `itemChannels(mục đang phát)` — 1 = mono, ≥2 = stereo, chưa biết = "stereo" tạm (quy ước v9.7); **không gọi `measureChannels` nữa**. Re-render (cuối `renderLayoutInner`) gọi lại hàm này nên trạng thái đúng giữ qua mở/đóng PL/ML/ngăn kéo. Cả 2 trạng thái EQ đều đúng: EQ bật không còn đường đo sai; EQ tắt trước đây đã hiện "stereo" tạm, nay vẫn vậy.
- **`renderer.js` Classic — `refreshClassicMain()` (`renderer.js:8124`):** bỏ `getMeasuredChannels()`, đọc `itemChannels(mục đang phát)` — mono → `MAIN_MONO_SELECTED`, stereo → `MAIN_STEREO_SELECTED`, dừng → cả hai mờ. `renderClassicStage()` cuối luôn gọi `refreshClassicMain()` nên mỗi lần vẽ lại Classic đều áp đúng.
- **`renderer.js` `applyMetadataToItem()`:** probe tag về muộn cho mục đang phát thì gọi thêm `updateChannelsIndicator()` — tương đương Webamp `SET_MEDIA_TAGS` → `MonoStereo` vẽ lại (trước đây tag mono về muộn không đổi được chỉ báo cho tới lần vẽ lại sau).
- **Phần Webamp KHÔNG tách được / KHÔNG port:** `getChannels` + `MonoStereo` dính Redux/React (`useTypedSelector`/`createSelector`) — không copy; tương đương Amp là `itemChannels()` + `updateChannelsIndicator()`/`setChannelsState()` đã có (XML-driven, không hardcode số skin 566). `fetchMediaTags()` cho URL trực tiếp (`parseWebStream`) cũng không port: nó không đọc được playlist HLS `.m3u8` (Đà Nẵng là `.m3u8`), và đường `.m3u` của Webamp cũng không bao giờ chạy tới nó (gặp `metaData` → "lie" 2 trước) — hành vi hiển thị giống hệt nhau.
- **Giới hạn còn lại (ghi rõ):** mp3 đơn lẻ thêm bằng URL mà thật ra mono 1 kênh thì Amp hiện stereo (Webamp đọc thật được qua `parseWebStream` cho file trực tiếp) — trường hợp này không phải radio `.m3u`, để sau nếu cần.

### Kiểm chứng đợt v10.5 (jsdom)
- `channels-105-test.js` (MỚI) **49 PASS, 0 FAIL**: (0) parseM3U 41 kênh đều channels=2; (A) Đà Nẵng STEREO ổn định qua re-render/renderStacked/`updateChannelsIndicator`/600ms; (B) file mono thật → MONO, fake engine có bẫy `measureChannels` trả "mono" nhưng renderer **0 lần gọi**; (C) EQ tắt/chưa có analyser → "stereo" tạm, dừng → none, phát lại → stereo tạm; (D) probe về muộn (mono → MONO, stereo → STEREO, không kẹt trạng thái cũ); (E) đổi bài/đổi đài Đà Nẵng↔VOV1↔mono không giữ trạng thái đài trước; (F) local `numberOfChannels` 1 → MONO, 2/6 → STEREO; (G) mục URL thêm tay → channels=2/STEREO, mục `blob:` không gán mặc định; **(H) skin Classic `base-2.91.wsz`: chưa phát → cả hai mờ, Đà Nẵng → STEREO sáng, re-render vẫn STEREO, file mono → MONO sáng, VOV1 → STEREO, dừng → cả hai mờ**.
- `audio-test.js` **316 PASS, 0 FAIL** (was 328 — giảm 12 do bỏ các check đo tín hiệu cũ ở Đợt K, thay bằng check hành vi mới v10.5: engine không export `measureChannels`/`getMeasuredChannels`, source không móc splitter, `getState()` không có `measuredChannels`, đổi EQ/đổi bài vẫn phát bình thường).
- Các test cũ liên quan giữ nguyên: `v10-4-channels-test.js` **10 PASS** + `playlist-test.js` **209 PASS** + `classic-test.js` **163 PASS** + `v10-3-test.js` **54 PASS**; toàn suite **3164 PASS, 0 FAIL** (harness LOAD OK). Lưu ý: `milkdrop-load-test.js` chạy lần đầu trong đợt này ra 1 FAIL flake (`L7d` banner, không liên quan kênh — chạy lại **48 PASS, 0 FAIL**); `maki-test.js` **126 PASS** (định dạng tổng khác nên lệnh grep cũ không bắt được dòng tổng).
- Đăng ký test mới vào suite: chạy `node channels-105-test.js` như các file `v10-4-*-test.js` khác (KHÔNG sửa `harness.js` — harness chỉ kiểm nạp file amp-v9).
- **Chưa kiểm chứng được bằng jsdom — cần test máy thật:** Đà Nẵng hiện STEREO ổn định trên điện thoại thật ở cả skin Modern lẫn Classic (đặc biệt lúc đài đang phát đoạn giọng nói ở giữa — đúng trường hợp v10.4 sai); VOV1 STEREO; file nhạc local mono thật (1 kênh) hiện MONO sau khi probe tag về.

## Đợt v10.5 (04/11 rạng sáng — Milkdrop theo code Webamp: hết đen + banner nói đúng)

> **Đã bump version lên 10.5 ở bước đóng gói** (trước đó vẫn 10.4 ở mọi file). Chỉ sửa `audio.js`/`milkdrop.js`/`renderer.js`/`index.html` + test + README; không thêm file vào gói zip, không khôi phục `skin-browser.js`.

### (1) Bằng chứng ảnh thật — 3 ảnh, cùng 1 banner sai
- **03:11, skin Modern 566** (`1000094492_0_mzix.jpg`): đang phát Đà Nẵng 0:20, KBPS 128, KHZ 48, EQ bật, ticker ĐÃ ĐÚNG ("DA NANG"), menu ⋯ hiện "✓ Milkdrop: Bật" — nhưng vùng AVS ĐEN hoàn toàn, banner đỏ ghi "Milkdrop: milkdrop: chua co AudioContext — Milkdrop se tu chay khi phat nhac (ensureReady)".
- **03:15, skin Webamp Classic** (`1000094493_1_tl8n.jpg` — Amp nạp skin Classic .wsz lấy từ Webamp, không phải fork Webamp): 00:00, đang dừng, cửa sổ VIDEO tách riêng đang mở (nút 1x/2x/Fullscreen/Max/Reattach, vùng đen) — banner đỏ y hệt vẫn hiện. Lúc này chưa phát nhạc nên "chưa có AudioContext" có thể đúng, nhưng lỗi CŨNG xảy ra với skin Classic + Video tách riêng, không chỉ Modern + AVS.
- **03:23, skin Webamp Classic** (`1000094494_2_il1p.jpg`, "Còn nhiều cơ lỗi"): đang phát Đà Nẵng 00:09, video DNRT Radio ĐANG CHẠY CÓ HÌNH trong cửa sổ VIDEO (logo DNRT 98.5 MHz), KBPS 128 / KHZ 48 — banner đỏ "chua co AudioContext — se tu chay khi phat nhac" VẪN HIỆN. Đây là bằng chứng quyết định: video phát được (có hình, có tiếng) mà banner vẫn nói "chưa có AudioContext" — banner sai thực tế ngay cả khi mọi thứ đang chạy.

### (2) Nguyên nhân gốc — 4 lỗi gộp, không phải 1
- **(a) Câu "chua co AudioContext" là câu mặc định cho CA 3 nguyên nhân** (`milkdrop.js` `enable()`: `ensureVisualizer()` trả null mà không đặt lỗi cụ thể — thiếu ctx / thiếu lib butterchurn / thiếu canvas — đều rơi về chung 1 câu). Nó nói sai khi nhạc đang phát mà vẫn đen, và sai cả khi nguyên nhân thật là thiếu lib/canvas. Giả thuyết "EQ tự tắt vì CORS nên không có AudioContext" là SAI về cơ chế: EQ fallback (`audio.js` `handleLoadFailure` → `eqOn=false`, nạp lại native) KHÔNG hủy ctx — ctx tồn tại từ lúc tạo; trường hợp thật sự thiếu ctx chỉ là "ctx chưa từng được tạo" vì graph của Amp tạo LAZY (chỉ ở `playItem`/`setEqOn`/`toggleMilkdrop`).
- **(b) Banner DÍNH vĩnh viễn** — không có gì ẩn `#status` khi Milkdrop khỏi: `applyPreset` thành công xóa `state.error` nhưng `reportMilkdropError` chỉ biết HIỆN banner, không biết TẮT. Nặng hơn: khi video đang hiện hình thì loop Milkdrop DỪNG theo thiết kế (video được ưu tiên, `applyMilkdropVisibility` ẩn canvas) nên lỗi cũ không bao giờ được vòng render xóa — đúng trường hợp ảnh 03:23.
- **(c) Loop chỉ đồng bộ ở `renderCurrent`** — đổi phát/dừng hay video xuất hiện/biến mất giữa chừng không đánh giá lại trạng thái (chỉ `onPlayingChange` gọi `setPlaying` + `ensureReady`, không gọi `syncMilkdrop`; `applyAvsMediaVisibility` khi video xuất hiện cũng không gọi gì về phía Milkdrop).
- **(d) Đài không CORS thì analyser chết theo thiết kế** — EQ fallback → phát native → không có `MediaElementSource` → analyser đọc 0. Đây không phải lỗi code mà là giới hạn kiến trúc (xem (3)).

### (3) Cách Webamp — đã đọc code fork, port phần tách được
Đã đọc `~/workspace/webamp-fork/src/packages/webamp/js/` (không copy React/Redux — chỉ lấy luận chạy):
- `media/index.ts` `Media` constructor: tạo **ngay** `new AudioContext()` + `createAnalyser()` (`fftSize 2048`, `smoothingTimeConstant 0.0`) lúc khởi tạo, không đợi lần phát đầu; graph `staticSource → preamp → 10 biquad → balance → gain → destination`, analyser là **nhánh rẽ** từ balance (`balance.connect(analyser)`, không nằm trên đường ra loa). Resume khi chạm/phím gắn ngay trong constructor.
- `media/elementSource.ts`: `destination != null` thì `createMediaElementSource` ngay trong constructor + nối vào destination; `destination == null` (direct/EQ tắt) thì phát native, KHÔNG tạo source. EQ bật → destination = `staticSource` (chuỗi EQ); EQ tắt → destination = `null`.
- `components/MilkdropWindow/Visualizer.tsx`: `butterchurn.createVisualizer(analyser.context, canvas, {meshWidth 32, meshHeight 24, pixelRatio, onlyUseWASM: true})` rồi `connectAudio(analyser)` — visualizer tạo 1 lần, không tạo lại khi đổi analyser; loop rAF chạy theo `shouldAnimate = playing && isEnabledVisualizer && metadataLoaded && !hasVideo` (effect chạy lại mỗi khi 1 điều kiện đổi — vòng đời loop gắn với trạng thái, không gắn với lần render); preset nạp qua `loadPreset(preset, transition)` khi `currentPreset` đổi; có hình thì khỏi chạy Milkdrop.
- **Webamp KHÔNG giải quyết được đài không CORS** (ghi rõ trong comment fork): direct mode thì "analyser không có dữ liệu" ("Vis chính + Milkdrop đứng yên"); EQ bật thì thẻ mang `crossOrigin="anonymous"` nên đài không CORS nạp lỗi luôn — fork chỉ dùng được với 41 kênh đã rà có CORS, và đã TRẢ LẠI bypass thật sau khi thử nối analyser vào direct mode vì làm tiếng nhỏ hơn phát native. Nên với Đà Nẵng (medatech, không CORS): **giữ EQ-tắt = phát native TO, Milkdrop chạy bằng tín hiệu mẫu** — đó là cách tương đương đạt cùng hành vi, không phải lách.
- **Phần Webamp KHÔNG port:** butterchurn **3.0.0-beta.5** + presets 3.0.0-beta.4 của fork — 3.x ship dạng ESM bundle (`dist/butterchurn.min.js` không có UMD global `window.butterchurn`; presets `base.js` export `base`, không phải `butterchurnPresets`), fork import qua bundler; Amp không có build step, nạp động bằng thẻ `<script>` nên **giữ butterchurn 2.6.7 + presets 2.4.7 qua CDN** (API `createVisualizer`/`connectAudio`/`loadPreset`/`render` mà Webamp dùng thì 2.6.7 đã có đủ). `GOT_BUTTERCHURN`/`initializePresets` dính Redux — không copy; tương đương Amp là `ensureLibs()` + `loadDefaultPreset()` đã có. `launchSongTitleAnim` (tên bài bay trong Milkdrop) chưa port — để sau nếu cần.

### (4) Port sang Amp (`audio.js` + `milkdrop.js` + `renderer.js` + `index.html`)
- **`audio.js` — graph tạo SẴN lúc tạo engine (theo Webamp):** cuối `createAudioEngine` gọi `ensureGraph()` + `wireResumeHandlers()`; tạo thất bại (không có AudioContext) thì giữ đường lazy cũ (`playItem`/`setEqOn` gọi lại). `MediaElementSource` vẫn tạo MUỘN như cũ (chỉ khi EQ bật + nạp thành công với CORS) để đài không CORS không bị câm — chỉ ctx/analyser là tạo sẵn. `getState().analyserSignal` (EQ bật + có source + đang phát) đã có sẵn, dùng làm "có tín hiệu thật không".
- **`milkdrop.js` — lỗi riêng từng nguyên nhân, không còn câu chung:** `ensureVisualizer()` đặt lỗi cụ thể — chưa gắn canvas / canvas 0×0 / chưa có AudioContext ("engine chưa khởi tạo xong — thử tắt rồi bật lại Milkdrop") / chưa nạp được butterchurn (CDN) / không tạo được visualizer (WebGL). Chuỗi "se tu chay khi phat nhac" đã xóa khỏi mọi file code (chỉ còn trong README này, mục lịch sử).
- **`milkdrop.js` — analyser MẪU khi không có tín hiệu thật:** `createSampleAnalyser()` (sóng sine biến thiên + phổ giả lập, `isSample: true`, `fftSize 1024`) — **hình trang trí, KHÔNG PHẢI nhạc thật** (ghi rõ trong code + ở đây). `connectAudioSource()` chọn thật/mẫu theo `hasRealSignal()` (index.html: `engine.getState().analyserSignal`), chỉ gọi `connectAudio` khi đổi đối tượng nguồn, và gọi lại ở mọi `ensureReady`/`setPlaying` để không kẹt ở chế độ cũ khi EQ/CORS vừa đổi. `state.audioMode` (`"real"`/`"sample"`/`"none"`) hiện trong `getState()`.
- **`milkdrop.js` — vòng đời loop theo trạng thái (theo Webamp):** `setPlaying`/`setVisible`/`ensureReady` đều đánh giá lại nguồn tín hiệu + `startLoop`; `ensureReady` đồng bộ lại cỡ canvas trước (`syncSizeFromWrap`) vì AVS có thể vừa mở/tách/đổi skin sau lần thử 0×0 trước; `loop()` vẽ được 1 frame với preset đã nạp thì **xóa mọi lỗi cũ** (banner tự tắt theo).
- **`index.html` — banner nói đúng + tự tắt + không báo khi Milkdrop đang ẩn:** `reportMilkdropError()` bỏ tiền tố trùng ("Milkdrop: milkdrop:" → "Milkdrop: …"); hết lỗi thì **ẩn `#status`** nếu banner đang hiện đúng lỗi Milkdrop đó (không động lỗi khác của trang); lỗi còn nhưng Milkdrop đang ẨN (video có hình / AVS đóng, `getMilkdropState().shown === false`) thì **không hiện banner** — lỗi giữ trong state, hiện lại thì báo lại được (đúng trường hợp ảnh 03:23). `syncMilkdrop()` chỉ báo lỗi SAU KHI `ensureReady()` xong (trước đây báo ngay nên báo lỗi cũ trong khi ensureReady sắp xóa nó); gắn lại canvas khi hộp AVS đổi (`attachTo` lanh — `resetAvsMedia` tạo hộp mới khi EQ tắt mà thẻ cũ đã có source, canvas cũ bị bỏ rơi theo hộp cũ); gọi `syncMilkdrop()` thêm ở `onPlayingChange` (đổi phát/dừng đánh giá lại ngay, không đợi render sau). `toggleMilkdrop()`: canvas 0×0 trong khi AVS đang đóng thì chỉ ghi console (chờ mở AVS), không báo đỏ; `ensureMilkdropCtl` thêm `hasRealSignal`.
- **`renderer.js` — báo khi hiện/ẩn đổi giữa chừng:** `applyMilkdropVisibility()` (nơi duy nhất đổi `milkdropShown` — gồm cả đường video xuất hiện/biến mất qua `applyAvsMediaVisibility`) gọi callback mới `onMilkdropShownChange(shown)` khi trạng thái đổi; `index.html` truyền `syncMilkdrop` vào đó. Không đụng logic hiện/ẩn (Modern nhúng + Classic rời chung 1 hộp `avsMedia`, canvas gắn theo hộp nên detach/reattach không làm mất canvas).
- **Không đổi:** version vẫn 10.4 ở mọi file (bước đóng gói bump lên 10.5); không thêm file vào gói zip; không khôi phục `skin-browser.js`; không đổi butterchurn 2.6.7/presets 2.4.7 (xem (3)).

### Kiểm chứng đợt v10.5 (jsdom)
- `milkdrop-105-test.js` (MỚI) **71 PASS, 0 FAIL**: (A) graph/ctx/analyser có ngay lúc tạo engine, KHZ đọc được ngay; (B/G) bật trước khi phát (chờ, không lỗi, loop chưa chạy) rồi bấm Play → render chạy ngay, không kẹt lỗi cũ; (C) lỗi cũ "chưa có AudioContext" → có ctx + phát nhạc → render chạy, lỗi bị xóa, **banner đỏ tự tắt**; (D) đài không CORS (không analyser) → chạy bằng **mẫu** (`audioMode sample`, tín hiệu mẫu khác 0 và biến thiên theo thời gian, không lỗi); (E) có tín hiệu thật → `audioMode real`, nối đúng analyser thật; (F) CDN chết / WebGL lỗi / preset lỗi → báo đúng lỗi đó, WebGL **không** đổ thừa "chưa có AudioContext"; **(H) Classic + cửa sổ Video tách riêng — cả `base-2.91.wsz` lẫn fixture skin Webamp `8a2cfd657fa97b1a511b372f5249d63a.wsz` (31.432 byte, bitmap trong thư mục con `3DNow/`, đọc được 14 sheet BMP): nạp được kind classic, AVS mở + detached, canvas Milkdrop hiện, vòng render chạy bằng mẫu**; (I) hộp AVS đổi → canvas gắn lại hộp mới, render vẫn chạy; **(J) video đang chạy có hình (ảnh 03:23, bắt buộc): banner lỗi cũ biến mất khi video hiện, lỗi giữ trong state, hiện lại thì báo lại được, có ctx + phát → chạy bằng mẫu, banner tắt**; (K) không còn "se tu chay" trong 4 file code.
- Test cũ cập nhật theo hành vi mới (ghi rõ, không giấu): `audio-test.js` **316 PASS, 0 FAIL** (1 assertion đổi: "no-url: không tạo graph" → graph đã có sẵn từ lúc tạo engine, theo Webamp); `milkdrop-load-test.js` **48 PASS, 0 FAIL** (L7d đổi: banner nói đúng "chưa có AudioContext", không hứa "sẽ tự chạy").
- Các test cũ khác giữ nguyên, không hồi quy: `v10-4-milkdrop-black-test.js` **20 PASS** + `v10-4-ticker-test.js` **21 PASS** + `v10-4-search-test.js` **27 PASS** + `v10-4-menu-overflow-test.js` **11 PASS** + `v10-4-channels-test.js` **10 PASS** + `v10-3-test.js` **54 PASS** + `v10-2-test.js` **77 PASS** + `classic-test.js` **163 PASS** + `avs-test.js` **216 PASS** + `avs-vis-test.js` **45 PASS** + `page-test.js` **88 PASS** + `batch-d-test.js` **121 PASS** + `batch4-test.js` **172 PASS** + `drawer-test.js` **271 PASS** + `eqf-test.js` **59 PASS** + `hotkeys-media-session-test.js` **107 PASS** + `local-add-test.js` **56 PASS** + `main-window-test.js` **191 PASS** + `maki-test.js` **126 PASS** + `metadata-test.js` **123 PASS** + `ml-timer-seek-resize-test.js` **100 PASS** + `multi-skin-test.js` **59 PASS** + `playlist-test.js` **209 PASS** + `resize-test.js` **31 PASS** + `shade-test.js` **176 PASS** + `vis-options-songinfo-test.js` **147 PASS** + `zoom-fit-test.js` **49 PASS** + `pill-test.js` **21 PASS**; harness nạp OK (mọi version 10.5).
- Đăng ký test mới vào suite: chạy `node milkdrop-105-test.js` như các file `v10-4-*-test.js` khác (KHÔNG sửa `harness.js` — harness chỉ kiểm nạp file amp-v9).
- **Chưa kiểm chứng được bằng jsdom — cần test máy thật:** (1) Đà Nẵng (không CORS) với Milkdrop bật, EQ bật → sau vài giây EQ tự tắt (fallback) mà **hình Milkdrop vẫn chạy** (mẫu) thay vì AVS đen, không banner đỏ; (2) đài có CORS + EQ bật → Milkdrop chạy **theo nhạc thật**; (3) kênh video/TV có hình (VD DNRT như ảnh 03:23) → video hiện hình, **không còn banner đỏ Milkdrop**; (4) bật Milkdrop trước khi phát rồi bấm Play → hình chạy ngay; (5) Classic + Video tách riêng (skin Webamp .wsz) → Milkdrop chạy trong cửa sổ Video khi chỉ có tiếng; (6) butterchurn thật qua CDN trên điện thoại (jsdom chỉ dùng butterchurn giả — WebGL/preset thật chưa kiểm được ở đây).

## Đợt v10.5 (04/11 rạng sáng — ticker Classic hết "A AMG" + cửa sổ Playlist Classic hết nút thừa/chữ chồng)

> **Đã bump version lên 10.5 ở bước đóng gói** (trước đó vẫn 10.4 ở mọi file). Chỉ sửa `classic.js`/`renderer.js` + test + README; không thêm file vào gói zip, không khôi phục `skin-browser.js`.

### (1) Bằng chứng ảnh thật — ảnh 03:23 (`1000094494_2_il1p.jpg`, skin Webamp Classic)
- Đang phát Đà Nẵng 00:09, KBPS 128 / KHZ 48, video DNRT Radio có hình trong cửa sổ VIDEO. Playlist hiện "Đà Nẵng / Quảng Ngãi / Nghệ An / Ninh Bình / Điện Biên" + "Trực tiếp" (font hệ thống, có dấu, ĐÚNG).
- **(A) Ticker trên display Classic hiện "A AMG"** thay vì "ĐÀ NẴNG" (ảnh 03:15 lúc dừng 00:00 cũng "A AMG"). Playlist (font hệ thống) vẫn đúng dấu nên lỗi chỉ ở đường vẽ bitmap của ticker.
- **(B) Cửa sổ PLAYLIST vẽ lỗi:** title bar có 2 cặp nút nhỏ (thu/đóng) thừa — 1 cặp ở giữa-phải + 1 cặp ở mép phải ngoài cùng (cặp thật); mép dưới bên trái có chữ "0:00" nhòe, chồng lên hàng nút (dải xanh dài phủ lên nút ADD/REM/SEL); các nút hàng dưới bị dải đó cắt mất mép trên.

### (2) Nguyên nhân gốc — (A) chữ HOA rơi về trắng
- Chuỗi chữ là đúng: `classicMarqueeText()` (`renderer.js`) trả `stripDiacritics("Đà Nẵng")` = **"Da Nang"** (Đ→D, À→A, Ẵ→A — đã bỏ dấu đúng như ticker Modern ở v10.4). Lỗi ở khâu vẽ từng ký tự: `classic.js` `charSprite(ch)` tra thẳng `FONT_LOOKUP[ch]`, mà bảng này sao y `skinSprites.ts` của fork nên **chỉ có khoá thường a–z** (glyph trong `TEXT.bmp` là hình HOA). Chữ HOA ASCII (`D`, `N`) không có khoá → rơi về ký tự trắng (150,0) → "Da Nang" vẽ thành " A  ANG" = đúng y hệt ảnh ("A AMG" — chữ N hoa đầu cũng trắng nên khoảng trống rộng). KBPS/KHZ không lỗi vì chỉ có chữ số + nhãn "kbps"/"kHz" đã khắc sẵn trong `main.bmp`.
- **Cách fork làm:** `Character.tsx` dùng `deburr(char).toLowerCase().charCodeAt(0)` — bỏ dấu (lodash deburr) rồi **hạ về thường** trước khi tra bảng, nên `D`→`d`→ glyph D, `N`→`n`→ glyph N. Amp bỏ qua bước hạ thường này nên mọi chữ HOA đều trắng (cả ticker, kbps/khz, giờ playlist, đồng hồ mini shade).
- **Cách sửa (`classic.js`):** thêm `charKey(ch)` — NFD bỏ dấu kết hợp + `đ/Đ→d/D` + bảng phụ cho chữ Latin không tách được bằng NFD (`ß→ss`, `Æ→Ae`, `Ø→O`, `Ð→D`, `Þ→Th`, `Ł→L`, `Œ→Oe`… như lodash deburr) + `toLowerCase()` + lấy ký tự đầu (như `charCodeAt(0)` của fork) — rồi `charSprite` tra `FONT_LOOKUP[charKey(ch)]`. Export thêm `charKey` để test. Kết quả: "Đà Nẵng" → ticker vẽ "DA NANG" (glyph HOA có sẵn trong font — đúng cách Webamp làm cho ký tự ngoài ASCII, không bịa glyph Đ/dấu). Không đổi `stripDiacritics`/`classicMarqueeText` (chuỗi đã đúng).

### (3) Nguyên nhân gốc — (B) 3 lỗi vẽ playlist, đều trong `renderClassicPlaylistWindow`
- **(B1) Title bar 2 bộ nút thừa — `repeat-x` trên cả sheet:** 2 ô fill top (`PLAYLIST_TOP_TILE_SELECTED`, 62px + 63px) đặt `backgroundRepeat: repeat-x` trên ảnh sheet nguyên `PLEDIT.BMP` (280×186) ở vị trí `-127px`. Repeat lặp theo **cả ảnh** (chu kỳ 280px) chứ không theo sprite 25px nên 1 ô 62px hiện cả `TOP_TILE` (127..152) + `TOP_RIGHT_CORNER` (153..178) + 12px nền vis — góc phải chứa 2 icon nhỏ (như nút thu/đóng) lọt vào **2 lần**, ở đúng tọa độ đo được trên ảnh: cửa sổ x≈51..76 và x≈213..238 (ảnh x≈134..193 và 558..617, kèm 2 vạch dọc ở 2 mép sprite góc). **Cửa sổ chỉ vẽ 1 lần** (dump DOM: 1 `[data-classic-window="playlist"]`, stage 275×232) — không phải lỗi "vẽ 2 lần" như nghi ngờ ban đầu; cặp nút ở mép phải (254/264) mới là nút thật. Fork không mắc vì `getSpriteUrisFromImg` cắt mỗi sprite thành 1 ảnh riêng, repeat chỉ lặp đúng tile.
- **(B2) Góc phải title bar mất nền — sai tên sprite:** code gọi `topPart("PLAYLIST_TOP_RIGHT_SELECTED", …)` nhưng tên đó **không có trong bảng** (`spriteRect` → null → không vẽ div nào) — tên đúng là `PLAYLIST_TOP_RIGHT_CORNER_SELECTED` (153,0,25×20). 25px cuối title bar (250..275) không có nền nên 2 nút shade/close nổi trên nền đen.
- **(B3) Giờ chạy đè nút ADD/REM/SEL — sai hệ tọa độ:** `timeDiv` đặt ở `left:7px; top:88px` (cửa sổ (7,88)), nhưng fork đặt `.playlist-running-time-display` (`top:10, left:7`) **bên trong** `.playlist-bottom-right` (x=125..275) → cửa sổ (132,88), trên nền hộp vis đen. Ở (7,88), chữ "0:00" (x=7..27) đè lên nút ADD (14..36) và dải 18 ô nền font (x=7..97, đệm trắng như fork `rightPad(…, 18, " ")`) phủ lên REM/SEL — đúng chữ nhòe + nút bị cắt ở ảnh. Cùng lỗi lát tile ở 2 tile giữa (`repeat-y` trên cả sheet: nửa dưới mỗi tile lôi theo mẩu góc đáy `PLAYLIST_BOTTOM_LEFT_CORNER` vào mép danh sách).
- **Cách sửa (`renderer.js`, chỉ trong `renderClassicPlaylistWindow`):** (1) thêm `tileSprite(name, x, y, w, h)` — lát bằng nhiều div, mỗi div cắt đúng sprite (không repeat): fill top thành 6 ô (25,25,12 + 25,25,13), tile trái/phải thành 2 ô 29px mỗi bên; (2) góc phải dùng `PLAYLIST_TOP_RIGHT_CORNER_SELECTED`; (3) giờ chạy dời sang `left:132px; top:88px`, rộng 90px (= 18 ký tự × 5px, vừa khít hàng chữ, không lấn sang nút LIST ở 231). Giữ nguyên đệm 18 ký tự + định dạng giờ (tổng/đã chọn) như fork.
- **Không đổi (ghi rõ):** cửa sổ vẫn 275×116, 1 lần vẽ; hàng nút đáy vẫn là 5 vùng bấm ADD/REM/SEL/MISC/LIST + 2 nút cuộn như thiết kế v10.3 (nút transport ⏮▶⏸⏹⏭⏏ + MiniTime ":" của fork — icon đã khắc sẵn trong góc đáy-phải nhưng Amp chưa có vùng bấm/chữ số — **chưa làm**, để đợt sau nếu Hải muốn; không tự thêm); cửa sổ Playlist **shade** có mẫu `backgroundPosition: "right 0px"` tương tự trên cả sheet — **chưa sửa** (ngoài ảnh lần này, ghi lại để đợt sau kiểm tra cùng).

### Kiểm chứng đợt v10.5 (jsdom)
- Test mới `classic-ticker-playlist-105-test.js` (MỚI) **85 PASS, 0 FAIL**: (A) `charKey`/`charSprite` từng ký tự (`D/Đ→(15,0)`, `N→(65,0)`, `À/Ẵ→(0,0)`, `ß→S`, ký tự lạ về trắng); marquee base-2.91 "Đà Nẵng"→ state "Da Nang" + glyph vẽ thật "da nang" (không còn "a ang"); đổi bài sang "Quảng Ngãi"→ "quang ngai" (không kẹt text cũ); tên ASCII "Kenh A"→ "kenh a"; marquee lỗi kênh chữ HOA vẽ đủ; fixture 3DNow (`8a2cfd657fa97b1a511b372f5249d63a.wsz`) marquee "da nang"; (B) đúng 1 cửa sổ playlist 275×116, stage 275×232, 5 hàng giữ dấu; title bar: đúng 1 `TOP_RIGHT_CORNER_SELECTED` ở (250,0) 25×20, fill lát 6 ô (25,50,75,187,212,237 — rộng 25,25,12,25,25,13), mọi ô `no-repeat` + đúng vị trí sprite, title bar chỉ 2 nút (shade 254 + close 264), không còn sprite góc lọt vào fill, không còn `repeat-x/repeat-y` trong playlist; tile trái/phải 2 ô 29px mỗi bên, đúng vị trí sprite; giờ chạy ở (132,88) rộng 90px, vẽ "0:00" + đệm trắng, không chồng cả 5 nút đáy (kiểm tra giao nhau theo tọa độ từng nút), đủ 7 nút đáy đúng tọa độ fork và nằm gọn trong 275×116, 2 góc đáy đúng vị trí + `no-repeat`.
- Đăng ký test mới vào suite: chạy `node classic-ticker-playlist-105-test.js` như các file `*-test.js` khác (KHÔNG sửa `harness.js` — harness chỉ kiểm nạp file amp-v9).
- Các test cũ giữ nguyên, không hồi quy: `classic-test.js` **163 PASS** + `classic-volume-105-test.js` **72 PASS** + `channels-105-test.js` **49 PASS** + `v10-4-ticker-test.js` **21 PASS** + `v10-4-channels-test.js` **10 PASS** + toàn bộ suite còn lại 0 FAIL (audio 316, avs 216, drawer 271, main-window 191, playlist 209, shade 176, …); harness nạp OK (mọi version 10.5). **Ngoại lệ đã có từ trước, ĐÃ SỬA XONG ở bước đóng gói v10.5 (không do sửa này — đã đối chứng bằng cách gỡ riêng 2 sửa này ra, giữ nguyên các thay đổi v10.5 khác, rồi chạy lại):** `batch4-test.js` A4 (menu ⋯ nay 18 mục — đã cập nhật 8 → 18) + D15 (đã tách thành D15a/D15b ở đợt bỏ-hiệu-ứng), `v10-4-menu-overflow-test.js` B1 (nút `VIS_MENU` nay chỉ mở AVS — đã cập nhật: bấm nút mở AVS, không mở menu) + `vis-options-songinfo-test.js` §2 (đã cập nhật từ đợt nút Video: bấm `videoavs.open` mở thẳng video, không menu — kiểm lại ở bước đóng gói thấy file đã đúng, không còn expectation cũ).
- **Chưa kiểm chứng được bằng jsdom — cần test máy thật (so từng chỗ với ảnh 03:23):** (1) ticker Classic khi phát "Đà Nẵng" hiện **"DA NANG"** (đủ 7 ký tự, không còn "A AMG"), đổi sang "Quảng Ngãi" → "QUANG NGAI"; (2) title bar playlist chỉ còn **1 cặp nút** thu/đóng ở mép phải, không còn cặp nút thừa ở giữa-phải; (3) góc phải title bar có nền (không còn đen trống quanh 2 nút); (4) giờ chạy "0:00" nằm trên hộp đen bên phải đáy (không còn dải xanh + chữ chồng lên nút ADD/REM/SEL), các nút hàng dưới nhìn đủ, không bị cắt mép trên; (5) mép trái/phải danh sách không còn vệt lạ (tile lát đúng); (6) skin trong ảnh là skin nào (chưa rõ tên file — fixture 3DNow/base-2.91 chỉ là chuẩn đối chiếu; cần đối chiếu lại trên đúng skin đó vì màu nền font + icon góc phải là của skin).

## Đợt v10.5 (04/11 — bỏ hiệu ứng mặc định khi không có nhạc)

> **Đã bump version lên 10.5 ở bước đóng gói** (trước đó vẫn 10.4 ở mọi file). Chỉ sửa `milkdrop.js`/`renderer.js` + test + README; không thêm file vào gói zip, không khôi phục `skin-browser.js`, không đổi `index.html`/`audio.js`.

### Yêu cầu (mới)
Khi KHÔNG có nhạc đang phát (dừng / tạm dừng / chưa phát bài nào) thì vùng AVS/Video KHÔNG hiện hiệu ứng mặc định — không vẽ Milkdrop mẫu, không vẽ cột vis mẫu, không chạy preset mặc định — để đen/trống (tên kênh/bài vẫn hiện trên nền đen như trường hợp chỉ có tiếng). Chỉ hiện hiệu ứng khi nhạc đang phát thật. Phạm vi: vùng AVS (skin Modern 566) và cửa sổ Video (cả Modern tách riêng lẫn Classic + Video tách riêng). **KHÔNG đổi** vis spectrum trong display của cửa sổ chính (không thuộc yêu cầu này — lúc dừng nó vẫn vẽ sine mẫu như cũ).

### (1) Các đường hiệu ứng-khi-dừng đã tìm (không phải 1 mà 3, + 1 bẫy)
- **(a) Milkdrop ĐÓNG BĂNG khi dừng/tạm dừng — `milkdrop.js` `setPlaying(false)`:** chỉ `stopLoop()` — vòng rAF dừng nhưng canvas WebGL giữ nguyên khung cuối cùng đã vẽ + vẫn `display: ""`. butterchurn không có hàm xóa canvas nên khung đó ở lại trên màn hình: người dùng tạm dừng vẫn thấy hình Milkdrop đứng yên trong AVS/Video. (Loop vốn đã chặn đúng bởi `state.playing` — lỗi chỉ ở khung cuối không được dọn.)
- **(b) Render sau hiện LẠI canvas đóng băng — `renderer.js` `applyMilkdropVisibility()`:** `showMd` chỉ xét `milkdropActive && milkdropCanvas && avsState.open && !video` — không xét có đang phát không. Dù `milkdrop.js` có ẩn canvas ở (a), lần render / sự kiện video sau đó cũng gán lại `display: ""` cho canvas đóng băng.
- **(c) `drawVisStatic()` ghi nhận sai — `renderer.js` nhánh AVS:** `if (milkdropActive)` ghi `lastAvsFrame.mode = "milkdrop"` cả khi dừng, và `continue` không tô đen lại canvas AVS — vừa sai sổ sách (`getAvsFrame()` nói "đang có hiệu ứng" trong khi không có gì chạy), vừa để canvas AVS giữ nội dung cũ thay vì đen.
- **Không phải đường lỗi (đã kiểm, không sửa):** cột vis mẫu trong AVS/Video đã đen từ v10.3 (`drawVisStatic` nhánh `fillBg` tô `#000` khi Milkdrop tắt, `drawAvsVis` không còn được gọi từ đó) — chỉ khóa lại bằng test; preset mặc định chỉ được **nạp** lúc `enable()` (load vào butterchurn, chưa vẽ frame nào — loop chặn bởi `playing`) nên không cần hoãn việc nạp (hoãn sẽ làm lần Play đầu chậm hơn); khung video thật đóng băng khi tạm dừng là nội dung video, không phải hiệu ứng — ngoài yêu cầu.
- **KHÔNG mâu thuẫn với tín hiệu mẫu cho đài không CORS (đợt Milkdrop v10.5 trước):** mẫu chỉ dùng khi nhạc **ĐANG PHÁT** mà không có analyser thật. Khi không phát thì cả thật lẫn mẫu đều dừng.

### (2) Cách sửa (`milkdrop.js` + `renderer.js`, 2 lớp chặn)
- **`milkdrop.js` — `applyCanvasDisplay()` (mới, 1 chỗ duy nhất quyết định hiện/ẩn canvas):** canvas chỉ hiện khi đủ cả 3 — `enabled && visible && playing`. `setPlaying`/`setVisible`/`disable` đều gọi nó thay cho gán `style.display` trực tiếp. Dừng/tạm dừng → ẩn canvas **ngay** (không đợi render sau); phát lại → hiện lại + `connectAudioSource()` đánh giá lại nguồn thật/mẫu như cũ.
- **`renderer.js` — `applyMilkdropVisibility()` thêm điều kiện `demo.playing`:** `showMd` nay là `milkdropActive && milkdropCanvas && avsState.open && demo.playing && !video` — render sau không hiện lại canvas đóng băng. `syncAvsName` nhờ đó cũng đúng theo: canvas ẩn → tên kênh/bài hiện trên nền đen.
- **`renderer.js` — `drawVisStatic()` nhánh AVS chỉ mode `"milkdrop"` khi `milkdropActive && demo.playing`:** dừng/tạm dừng/chưa phát thì rơi về nhánh tô đen (`mode: "black"`, 0 cột) như lúc Milkdrop tắt — vừa đen thật, vừa đúng sổ sách.
- **`renderer.js` — `updateStatusEls()` gọi lại `applyMilkdropVisibility()` (bẫy khi sửa):** đây là điểm choke mọi đường đổi trạng thái phát (comment đợt B 9.9 đã ghi) nên là chỗ duy nhất đánh giá lại hiện/ẩn **ngay** khi phát/dừng/tạm dừng, không đợi render sau. Bắt buộc vì: bật Milkdrop lúc ĐANG DỪNG thì `shown=false`; nếu không đánh giá lại ở đây, lúc bấm Play `index.html` `syncMilkdrop()` đọc `shown` cũ → `setVisible(false)` → loop không bao giờ chạy (kẹt ở trạng thái cũ). Chỉ khi `shown` đổi thì callback `onMilkdropShownChange` mới chạy → `syncMilkdrop` đồng bộ lại loop — gọi ở đây rẻ, không render lại. Nhờ cơ chế v10.5 đã có (`onMilkdropShownChange` → `syncMilkdrop`) nên **`index.html` không cần sửa dòng nào**: thứ tự trong `onPlayingChange` (renderer đổi `demo.playing` → `milkdropCtl.setPlaying` → `syncMilkdrop`) vẫn đúng cả 2 chiều dừng/phát.
- **Không đổi:** version vẫn 10.4 ở mọi file (bước đóng gói bump lên 10.5); không thêm file vào gói zip; không khôi phục `skin-browser.js`; không đổi butterchurn 2.6.7/presets 2.4.7; không đổi vis display cửa sổ chính.

### Kiểm chứng đợt v10.5 (jsdom)
- Test mới `no-effect-when-stopped-105-test.js` (MỚI) **97 PASS, 0 FAIL**: (A) `milkdrop.js` đơn vị — bật lúc dừng: preset đã nạp nhưng 0 frame, canvas ẩn ngay từ đầu; `setVisible(true)` lúc dừng vẫn ẩn; bấm Play → render chạy + canvas hiện; tạm dừng → canvas ẩn **ngay**, loop dừng, không frame nào thêm; phát tiếp → chạy lại; `setVisible(false/true)` lúc phát vẫn chặn/mở loop đúng; `disable` → ẩn; (B) **Modern 566** — chưa phát: `shown=false`, canvas ẩn, 0 frame, AVS `mode black` + 0 cột + canvas AVS tô đen `#000` thật (đo `fillRect`), tên kênh hiện trên nền đen; EQ tắt + chưa phát: AVS vẫn black (không sine mẫu), display **vẫn `sample`** (ngoài phạm vi, giữ nguyên, có check khóa); bấm Play → `shown=true`, render chạy, mode `milkdrop`; tạm dừng → ẩn + dừng loop + AVS black + tên hiện lại; phát lại **sau 1 lần render lúc dừng** (bẫy ở (2)) → hiện + render chạy lại ngay, không kẹt; Stop → đen; (C) **Classic + Video tách riêng, cả `base-2.91.wsz` lẫn fixture `8a2cfd657fa97b1a511b372f5249d63a.wsz`**: chưa phát → đen/0 frame, Play → chạy, tạm dừng → dừng, phát lại → chạy lại; (D) **đang phát đài không CORS → mẫu VẪN chạy** (`audioMode sample`, nối đúng analyser mẫu `isSample`), dừng → mẫu cũng dừng, phát lại → mẫu chạy lại (không bị tắt nhầm); (E) **đang phát có analyser thật → thật chạy** (`audioMode real`, nối đúng analyser thật), tạm dừng/phát lại giữ đúng analyser thật; (F) khóa bằng code: cả 2 chỗ `renderer.js` chặn theo `demo.playing`, `milkdrop.js` có `applyCanvasDisplay`, không còn "se tu chay".
- Test cũ cập nhật theo hành vi mới (ghi rõ, không giấu): `avs-vis-test.js` **45 PASS, 0 FAIL** (đoạn Milkdrop nay phát nhạc trước rồi mới bật — trước đây bật lúc dừng vẫn đòi mode `milkdrop`); `batch4-test.js` **172 PASS** + D15 đổi thành D15a/D15b (`setVisible(true)` lúc dừng → canvas vẫn ẩn; phát + visible → hiện).
- Các test cũ khác giữ nguyên, không hồi quy: `milkdrop-105-test.js` **71 PASS** + `milkdrop-load-test.js` **48 PASS** + `v10-4-milkdrop-black-test.js` **20 PASS** + `v10-3-test.js` **54 PASS** + `v10-2-test.js` **77 PASS** + `classic-test.js` **163 PASS** + `avs-test.js` **216 PASS** + `audio-test.js` **316 PASS** + `channels-105-test.js` **49 PASS** + `classic-volume-105-test.js` **72 PASS** + `vis-options-songinfo-test.js` **147 PASS** + `zoom-fit-test.js` **49 PASS** + toàn bộ suite còn lại 0 FAIL (page 88, batch-d 121, drawer 271, eqf 59, hotkeys 107, local-add 56, main-window 191, maki 126, metadata 123, ml-timer 100, multi-skin 59, playlist 209, resize 31, shade 176, pill 21, v10-4-ticker 21, v10-4-search 27, v10-4-channels 10); harness nạp OK (mọi version 10.5).
- **Ngoại lệ đã có từ trước, ĐÃ SỬA XONG ở bước đóng gói v10.5 (đã đối chứng bằng zip v10.4 gốc + diff code):** `batch4-test.js` A4 (menu ⋯ nay 18 mục — đã cập nhật 8 → 18) và `v10-4-menu-overflow-test.js` B1 (nút `VIS_MENU` nay chỉ mở AVS — đã cập nhật: bấm nút mở AVS, không mở menu).
- Đăng ký test mới vào suite: chạy `node no-effect-when-stopped-105-test.js` như các file `*-test.js` khác (KHÔNG sửa `harness.js` — harness chỉ kiểm nạp file amp-v9).
- **Chưa kiểm chứng được bằng jsdom — cần test máy thật:** (1) mở trang, bật Milkdrop, chưa phát nhạc → vùng AVS **đen/trống** (không còn hình Milkdrop mẫu chạy sẵn như trước), tên kênh hiện trên nền đen; (2) đang phát Đà Nẵng → tạm dừng → hình Milkdrop **biến mất ngay** (không còn khung cuối đóng băng), phát tiếp → hình chạy lại ngay; (3) Stop rồi Play lại → hình chạy lại, không kẹt đen; (4) Đà Nẵng (không CORS) đang phát → Milkdrop mẫu vẫn chạy (không bị tắt nhầm theo yêu cầu mới); (5) Classic + Video tách riêng: dừng → cửa sổ Video đen/trống, phát → Milkdrop chạy; (6) butterchurn thật qua CDN trên điện thoại (jsdom chỉ dùng butterchurn giả — khung cuối đóng băng trên WebGL thật cần nhìn bằng mắt: sau khi tạm dừng, canvas ẩn thì không còn thấy gì, nhưng cần chắc không có khoảnh khắc nháy hình cũ khi phát lại).
## Đợt v10.5 (04/11 — chạm xuyên ngăn kéo EQ: vuốt mặt cửa sổ chính lại chỉnh EQ ẩn bên dưới)

> **Đã bump version lên 10.5 ở bước đóng gói** (trước đó vẫn 10.4 ở mọi file). Chỉ sửa `renderer.js` + test + README; không thêm file vào gói zip, không khôi phục `skin-browser.js`, không đổi `index.html`/`audio.js`.

### Yêu cầu (mới — Hải báo 04/11 03:40 trên điện thoại thật)
Ngăn kéo EQ đang ẩn dưới cửa sổ chính, nhưng vuốt trên mặt cửa sổ chính lại chỉnh EQ (hiệu ứng) đang ẩn bên dưới — như vậy là sai. Khi ngăn kéo đóng/ẩn thì các thanh trượt EQ (và mọi control trong ngăn kéo: nút EQ, Balance, Color Themes…) phải KHÔNG nhận chạm/kéo; chỉ khi ngăn kéo mở mới chỉnh được EQ. Nút mở ngăn kéo (13px lộ ra) vẫn phải bấm được khi đóng.

### (1) Nguyên nhân gốc (đã đo, không đoán)
- **Ngăn kéo đóng nhưng vẫn nằm gọn trong mặt cửa sổ chính:** đỉnh ngăn kéo = đỉnh main (`drawerInnerY` đóng = vị trí nghỉ, `renderer.js:335`); main 35–161, ngăn kéo 35–164 (skin 566). 11 slider EQ ở panel y=50, x=99–313, y=51–131 — tức nằm gọn trong vùng mặt main. Điểm rò đo được: eq5 tại **(229,126)** — dưới ticker main (y 81–104) và dưới slider SeekerGhost của main (y 110–123) nên không có gì trên mặt main che được.
- **Mặt cửa sổ chính LÀ LỖ chạm:** mọi div group đều inline `pointer-events:none` (`renderer.js:4136`), ảnh `.spr` / chữ `.txt` / ticker / vis đều `pointer-events:none` theo CSS `index.html:46–54`, chỉ `.btn` là `auto` — nên chạm trên mặt main (chỗ không có nút) rơi xuyên xuống slider EQ (inline `pointer-events:auto`, `renderer.js:5140`) đang nằm dưới. Ngăn kéo vẽ DƯỚI main trong DOM (`player.content.dummy.group`: drawer → shadow → main, `player-normal-group.xml:1206–1208`) nên nhìn thì bị main che, nhưng hit-test thì xuyên qua.
- **Kéo theo cả vuốt:** slider gắn `touchstart`/`mousedown` trên div + `touchmove`/`mousemove` ở cấp `document` (`renderer.js:5301+`) nên chạm trúng 1 lần là cả lần vuốt kéo EQ theo.
- **Color Themes cùng lỗi:** list preset + hàng + nút Set/Prev/Next trong ngăn kéo cũng `pointer-events:auto` và (khi tab Color Themes đang chọn) nằm trong vùng mặt main khi đóng (hàng đầu y=54–67).
- **Lỗ thứ hai — kéo đang dở:** listener `mousemove`/`touchmove` ở cấp `document` không bao giờ gỡ; lần kéo bắt đầu lúc mở rồi đóng ngăn kéo giữa chừng thì `rec.dragging` vẫn `true` và EQ vẫn đổi dù slider đã bị vẽ lại.

### (2) Cách sửa (`renderer.js`, 2 lớp chặn)
- **`setDrawerInteractive(d, enabled)` (mới, `renderer.js:829`):** tắt/bật chạm của MỌI control trong ngăn kéo theo trạng thái mở/đóng — selector `[data-slider], .btn, [data-tab], [data-options-bucket], [data-bucket-entry], [data-options-target], [data-colorthemes-list], [data-preset-idx]`, đặt `pointer-events:none` khi đóng / `auto` khi mở. Ngoại lệ duy nhất khi đóng: nút `drawer.button.open` (lộ qua lỗ trong `main.png` + dải nghỉ 3px dưới đáy main) vẫn bấm được. **Đặt `none` trên chính từng control, không đặt trên div ngăn kéo:** `pointer-events:none` của tổ tiên KHÔNG chặn được con đã tự đặt `auto` — đó đúng là lỗ hổng cũ.
- **Gọi ở 3 chỗ:** (a) `renderLayoutInner` sau khi đặt vị trí ngăn kéo (`renderer.js:9617`) — trạng thái cuối sau mọi lần render (kể cả `renderStacked`, qua chung `renderLayoutInner`); đang trượt MỞ (`pendingDrawerStartDy` vừa áp) thì giữ tắt; (b) `toggleDrawerAnimated` — bắt đầu trượt ĐÓNG thì tắt ngay (`renderer.js:1013`, như đã ẩn tab ở đó từ v9.4), trượt MỞ xong mới bật lại (`renderer.js:981`); cùng-trạng-thái thì đồng bộ lại (`renderer.js:947`); (c) `setDrawerOpen` (đường tắt animation) đi qua `requestRerender` nên cũng qua (a).
- **Chặn kéo đang dở (`renderer.js:5301`, `onDown`/`onMove` của `renderSlider`):** nếu `div.style.pointerEvents === "none"` thì `onDown` bỏ qua, `onMove` dừng kéo (`dragging=false`) — dùng đúng cờ đã tắt, kể cả 250ms đang trượt đóng. Slider ngoài ngăn kéo (volume/seek) luôn `auto` nên không ảnh hưởng.
- **Không đổi:** version vẫn 10.4 ở mọi file (bước đóng gói bump lên 10.5); không thêm file vào gói zip; không khôi phục `skin-browser.js`; không đổi hình học/vị trí ngăn kéo, không đổi hành vi mở/đóng/trượt.

### Kiểm chứng đợt v10.5 (jsdom)
- Test mới `drawer-hit-test-105-test.js` (MỚI) **61 PASS, 0 FAIL**: (A) đóng — cả 11 slider EQ + Balance + sCrossfade + mọi nút EQ đều `pointer-events:none`, nút mở ngoại lệ; mô phỏng hit-test trình duyệt (`hitTestAt`, dùng `_absX/_absY` + `style w/h` do renderer ghi + đúng luật CSS `pointer-events` của `index.html` — jsdom không hit-test được thật, `dispatchEvent` thẳng vào phần tử sẽ bỏ qua `pointer-events` nên phải mô phỏng hit-test rồi dispatch vào đúng phần tử trúng) tại điểm rò (229,126) trúng nền stage, vuốt qua đó EQ đứng yên 0.5 (cả chuột lẫn chạm); (B) mở — slider `auto`, hit-test trúng đúng eq5, kéo chuột lên đỉnh → `eqBands.eq5 = 1` + thumb về 0px, kéo chạm về giữa → 0.5, nút EQ ON/OFF bấm được; (C) nút mở khi đóng — hit-test trúng đúng nút, bấm → `onDrawerToggle(true)`; (D) đóng lại bằng animation — slider lại `none`, vuốt không đổi EQ; đang trượt mở vẫn `none`, trượt xong mới `auto`; (E) Color Themes — mở: 44 hàng preset `auto`, hit-test trúng hàng, bấm Blues → theme idx 2; đóng (đang ở tab này): list + hàng + nút theme đều `none`, hit-test không trúng hàng, chạm không đổi theme; (F) kéo đang dở mà đóng giữa chừng — `mousemove` sau đó không đổi EQ, `dragging=false`.
- **Đối chứng độ nhạy (test bắt được lỗi thật):** vô hiệu hoá riêng `setDrawerInteractive` (bản sao `/tmp`, code gốc không đổi) rồi chạy lại test mới → **19 FAIL** (A5–A8, A12–A15, D1–D4, E11/E12/E16, F2–F4; vuốt tại (229,126) đổi EQ thành 1, đúng triệu chứng Hải báo).
- Các test cũ giữ nguyên, không hồi quy: `drawer-test.js` **271 PASS** + `classic-volume-105-test.js` **72 PASS** + `classic-ticker-playlist-105-test.js` **85 PASS** + `channels-105-test.js` **49 PASS** + `eqf-test.js` **59 PASS** + `main-window-test.js` **191 PASS** + `playlist-test.js` **209 PASS** + `milkdrop-105-test.js` **71 PASS** + `v10-4-ticker-test.js` **21 PASS** + `v10-4-search-test.js` **27 PASS** + `v10-4-milkdrop-black-test.js` **20 PASS** + `v10-4-channels-test.js` **10 PASS**; harness nạp OK (mọi version 10.5).
- **Ngoại lệ đã có từ trước, ĐÃ SỬA XONG ở bước đóng gói v10.5 (đã đối chứng bằng bản sao chưa sửa):** `v10-4-menu-overflow-test.js` B1 (menu Vis — do thay đổi v10.5 khác, nút `VIS_MENU` nay chỉ mở AVS; đã cập nhật: bấm nút mở AVS, không mở menu).
- Đăng ký test mới vào suite: chạy `node drawer-hit-test-105-test.js` như các file `*-test.js` khác (KHÔNG sửa `harness.js` — harness chỉ kiểm nạp file amp-v9).
- **Chưa kiểm chứng được bằng jsdom — cần test máy thật:** (1) ngăn kéo đóng, vuốt dọc/ngang khắp mặt cửa sổ chính (đặc biệt vùng giữa-dưới display, y khoảng 1/2–3/4 cửa sổ — dải rò của slider) → **EQ không đổi** (nghe tiếng + nhìn thumb EQ sau khi mở ngăn kéo ra vẫn ở chỗ cũ); (2) vuốt đúng chỗ nút Play/ticker/vis trên main → vẫn phát/đổi vis bình thường (không bị chặn nhầm); (3) nút mở ngăn kéo ở mép dưới vẫn bấm mở được; (4) mở ngăn kéo rồi kéo EQ → đổi tiếng/thumb như cũ; (5) đang kéo 1 dải EQ mà bấm nút đóng (2 ngón) → thả ra EQ không nhảy tiếp; (6) tab Color Themes: đóng ngăn kéo rồi vuốt lên chỗ list preset → theme không đổi, mở ra bấm hàng vẫn đổi theme; (7) vuốt chạm đa điểm trên điện thoại thật (jsdom chỉ mô phỏng 1 điểm chạm + chuột — trình duyệt thật mới có touch thật, `touchstart`/`touchmove`/`touchend`).
## Có gì trong gói

| File | Version | Nội dung |
|---|---|---|
| `index.html` | 10.1 (`window.AMP_VERSION`) | Vỏ trang + toolbar + kiểm version + self-check lúc chạy |
| `classic.js` | CLASSIC_VERSION 10.1 | **MỚI đợt v10.1:** parser skin Classic (.wsz) chuyển từ Webamp fork — đọc `viscolor.txt`/`pledit.txt`/`region.txt`/`genex.bmp`, bảng tọa độ 281 sprite Winamp 2, hình học cửa sổ chính 275×116 + shade 275×14 |
| `skin-loader.js` | LOADER_VERSION 10.1 | Mở `.wal`/`.zip`, đọc XML, gom model (bitmap/font/màu/groupdef/layout), suy `embeddedAvs`, `drawerRestY`, `snapadjustbottom`; `.wsz` không có skin.xml thì parse thật bằng `classic.js` |
| `renderer.js` | RENDERER_VERSION 10.1 | Vẽ cửa sổ chính + shade + ngăn kéo + playlist + AVS/Video (nhúng + cửa sổ rời), EQ/Options/Color Themes, playlist `.m3u`; **đợt v10.1: vẽ cửa sổ chính Classic + shade Classic từ BMP, nút bấm được**; **đợt 4: holder park giữ thẻ video khi đóng cửa sổ (tiếng vẫn phát), vis bấm đổi kiểu bar/sóng/tắt từng vùng, nối Milkdrop** |
| `audio.js` | AUDIO_VERSION 10.1 | Phát tiếng thật: native trước, HLS sau 6s/lỗi; chuỗi EQ (preamp + 10 biquad + master + analyser); MediaElementSource mỗi thẻ 1 lần; **đợt 4: crossfade trộn bài bằng engine 2 thẻ audio (A/B) + ramp gain, mặc định 2s** |
| `milkdrop.js` | MILKDROP_VERSION 10.1 | **MỚI đợt 4:** Milkdrop/butterchurn — nạp `butterchurn@2.6.7` + `butterchurn-presets@2.4.7` qua CDN lúc chạy (lazy, chỉ khi bật), preset mặc định qua URL, fallback preset nhúng sẵn; canvas gắn vào hộp AVS thay vis thường |
| `eqf.js` | EQF_VERSION 10.1 | Đọc/ghi preset EQ Winamp `.eqf`/`.q1` (header v1.1, 268B/preset) + map sang 10 dải + preamp của Amp (đợt v10.0) |
| `metadata.js` | METADATA_VERSION 10.1 | **MỚI đợt 5:** đọc tag nhạc local — `music-metadata-browser@2.5.11` qua CDN ESM (dynamic import, dự phòng esm.sh) + parser ID3v2/v1 + FLAC Vorbis comment nhúng sẵn khi CDN chết; ghi title/artist/album/duration vào model mục playlist |
| `maki.js` | MAKI_VERSION 10.1 | **MỚI đợt 7 (giai đoạn a):** parser + inspect script MAKI — đọc file `.maki` của skin (magic `FG`, formatVersion 23), liệt kê method/binding/ẩn-hiện/gán text; CHỈ ĐỌC, không chạy code MAKI (interpreter thật là giai đoạn b, để sau) |
| ~~`skin-browser.js`~~ | ~~BROWSER_VERSION 10.1~~ | **ĐÃ GỠ HẲN ở đợt 5** (xem mục "Đợt 5"): chọn skin từ kho Webamp (GraphQL `skins.webamp.org`, panel `#skin-panel`, menu "Chọn skin từ kho…") bỏ luôn theo chốt của Hải — chỉ giữ "Nạp skin .wal/.zip…" chọn file tay |
| `winampmodern566.wal` | — | Skin Winamp Modern 566 (mặc định, tự nạp lúc mở trang) |
| `base-2.91.wsz` | — | Skin Classic mẫu — **đợt v10.1 vẽ được cửa sổ chính + shade, nút bấm được** (trước đây chỉ phát tiếng qua cửa sổ Video/Hiệu ứng rời) |
| `iptv.m3u` | — | Playlist mặc định: 218 mục (41 Radio + 177 TV, 13 nhóm) (không còn bài Demo) (giữ tên + thứ tự gốc) |

## Đợt v10.0 (đã bump + đóng zip — tích hợp Webamp fork đợt 1 + báo lỗi 3/11)

Test mới: eqf-test 59 + zoom-fit-test 49 + local-add-test 56 + avs-vis-test 33 + pill-test 21 + resize-test 31 = **249 test mới**; tổng jsdom **2065 PASS, 0 FAIL** (1816 cũ: main 191, drawer 269, playlist 204, avs 215, audio 263, shade 176, page 82, ml-timer-seek-resize 100, vis-options-songinfo 147, multi-skin 59, batch-d 110 + 249 mới). `harness.js` LOAD OK (cả thư mục làm việc và bản giải nén từ zip).

## Đợt v10.0 (việc 2: chọn skin từ kho Webamp — giữ 10.0, không đổi loader)

Test mới: skin-browser-test 103 + page-test thêm 8 (menu 6 mục + panel tĩnh) = **111 test mới**; tổng jsdom **2176 PASS, 0 FAIL** (2065 cũ + 111 mới; page 82 → 90). `harness.js` LOAD OK (cả thư mục làm việc và bản giải nén từ zip). Zip nay có **10 file** (9 cũ + `skin-browser.js` mới).

### Trạng thái endpoint (kiểm thật bằng curl 03/11 — lần khảo sát trước POST thử chưa trả về gì vì query sai field)
- **GraphQL `https://skins.webamp.org/graphql`: SỐNG.** POST 200, trả đúng dữ liệu. Lần trước lỗi vì query dùng field `name` — type `Skin` KHÔNG có `name` (chỉ có `filename` làm tên hiển thị, KHÔNG có field tác giả). Query dùng được (đã kiểm bằng introspection + gọi thật):
  - `skins(first, offset) { nodes { md5 filename download_url screenshot_url } }` — Classic .wsz
  - `modern_skins(first, offset) { nodes { ... } }` — Modern .wal
  - `search_skins(first, query) { ... }` — chỉ tìm Classic (không có `search_modern_skins`); tìm Modern thì lọc cục bộ
  - `fetch_skin_by_md5(md5) { ... }`
- **CORS: MỞ.** Preflight GraphQL trả `access-control-allow-origin` phản chiếu origin (`GET/POST/OPTIONS`, header `content-type`); GET file trên r2 trả `Access-Control-Allow-Origin: *` nên `fetch()` lấy ArrayBuffer thẳng từ trình duyệt được (lưu ý: HEAD không trả header CORS, GET mới có — đừng kết luận bằng HEAD).
- **CDN `https://r2.webampskins.org`: SỐNG.** 5/5 URL kiểm được 200: 2 file skin (.wsz/.wal), 2 ảnh screenshot `.png`, 1 file .wal khác. Tải thật 1 file `.wsz` (8a2cfd65…, 31.432 byte) về là zip hợp lệ (có `main.bmp`, `cbuttons.bmp`…).
- **Quy ước lấy từ fork** (`packages/skin-database/data/skins.ts`): `CDN_URL = "https://r2.webampskins.org"`; `getSkinUrl(md5) → /skins/<md5>.wsz`, `getModernSkinUrl(md5) → /skins/<md5>.wal`, `getScreenshotUrl(md5) → /screenshots/<md5>.png`; md5 là id skin; `SKIN_TYPE`: CLASSIC 1 / MODERN 2 / PACK 3 / INVALID 4. Chỉ lấy quy ước + endpoint, KHÔNG lấy server (Next.js + GraphQL + SQLite + Algolia + S3).
- **Ảnh thu nhỏ:** Classic có `screenshot_url` trên r2 (`/screenshots/<md5>.png`); Modern có thể `null` (vd 566, cPro__Aperture) hoặc trỏ sang `zip-worker.jordan1320.workers.dev` (`/zip/<md5>.wal/skinshot.png` hoặc `screenshot.png`) — UI hiện ô "Không có ảnh" khi null/lỗi tải, không vỡ layout.

### UI + hành vi
- Menu ⋯ thêm mục **"Chọn skin từ kho…"** (nay 6 mục) → mở cửa sổ `#skin-panel` (nền sáng #ECE9D8 như menu ⋯, giữa màn hình, tối đa 340px — không thêm chrome thường trực, màn hình vẫn chỉ hiện skin khi đóng panel).
- Panel: ô tìm theo tên + 3 nút loại (Tất cả / Modern (.wal) / Classic (.wsz)) + danh sách (ảnh thu nhỏ + tên file + loại; skin có sẵn trong gói ghi "· có sẵn") + nút "Chọn file tay…".
- Nạp danh sách: 2 query GraphQL song song (Modern 24 + Classic 24), Modern hiện trước; bấm 1 skin thì `fetch()` file `.wal`/`.wsz` về ArrayBuffer rồi nạp qua `bootSkin` đã có (skin lỗi thì giữ skin cũ + banner đỏ, theo đợt C v9.9).
- Tìm kiếm: gõ thì lọc cục bộ ngay; sau 400ms gọi thêm `search_skins` của kho (chỉ Classic) rồi gộp Modern lọc cục bộ vào — kết quả search bấm được ngay (giữ trong `state.shown`, không cần đợi gộp vào danh sách chính).
- Cache: danh sách đã fetch lưu `localStorage "amp10-skinlist-v1"` 24h — mở lại xem ngay cả khi mất mạng.
- **Fallback khi mạng/GraphQL lỗi:** hiện danh sách mẫu nhúng sẵn `FALLBACK_SKINS` (8 skin: 566 + base-2.91 có sẵn trong gói — md5 tính từ file trong gói, `fetch_skin_by_md5` trả đúng tên — + 6 md5 đã kiểm 200 trên r2) + nút "Chọn file tay…" mở hộp chọn file như cũ. Skin "local" tải bằng `fetch()` đường dẫn tương đối trong gói.
- KHÔNG lấy đợt này: vis FFTNullsoft, Options, KBPS/KHZ, media engine, playlist/m3u, React/Redux, SkinEngine_WAL, server skin-database — đã chốt không làm.

## Đợt v10.1 (việc 3: Classic skin parser — vẽ được cửa sổ chính .wsz)

**Bump 10.0 → 10.1 vì loader đổi cho Classic** (loader nay parse thật `.wsz` thay vì trả stub). Test mới: classic-test 117 + skin-browser-test thêm 1 (check thẻ script `classic.js?v=10.1`) = **118 test mới**; tổng jsdom **2294 PASS, 0 FAIL** (2176 cũ + 118 mới). `harness.js` LOAD OK (cả thư mục làm việc và bản giải nén từ zip). Zip nay có **11 file** (10 cũ + `classic.js` mới).

### Nguồn fork + cách chuyển (parser Redux → renderer Amp, không bê nguyên)
- Nguồn: `packages/webamp/js/skinParser.js` (giải `.wsz`, đọc `viscolor.txt`/`pledit.txt`/`genex.txt`/`region.txt`), `skinParserUtils.ts` (cắt sprite, `getPlaylistStyle`, `getGenExColors`), `skinSprites.ts` (bảng tọa độ mọi sprite Winamp 2 — dữ liệu định dạng tĩnh), `regionParser.ts` (vùng click không chữ nhật).
- Fork trả cấu trúc cho Redux (ảnh cắt sẵn thành data-URL, state Redux) — Amp không dùng Redux nên **chỉ lấy dữ liệu thuần + hàm thuần, viết lớp vẽ riêng**: `classic.js` giữ nguyên bảng tọa độ + hàm đọc `.txt` (parse theo đúng regex của fork: `parseViscolors` gán tuần tự 24 màu, `parseIni` key thường hoá/bỏ ngoặc, `parseRegion` bỏ polygon <3 điểm, `getFileFromZip` không phân biệt hoa/thường + file trùng tên thì file SAU thắng) và trả **dữ liệu thô** (`sheets` = {file, url, size từ header BMP}, `viscolors`, `playlistStyle`, `region`, `genExColors`, `cursors`); **renderer.js vẽ sprite theo tọa độ** bằng div + `background-image` = nguyên sheet BMP + `background-size` = kích thước thật + `background-position: -x,-y` (cùng cách với `spriteDiv` của Modern, không giải mã pixel, trình duyệt hiện BMP native qua blob: URL).
- `.wsz` = zip chứa bitmap (main.bmp, cbuttons.bmp, titlebar.bmp, playpaus.bmp, shufrep.bmp, posbar.bmp, volume.bmp, balance.bmp, monoster.bmp, eqmain.bmp, eq_ex.bmp, pledit.bmp, nums_ex.bmp, text.bmp…) + `.txt` (viscolor/pledit/genex/region). `base-2.91.wsz` có 32 file, 15 sheet BMP (KHÔNG có `nums_ex.bmp` → số lấy từ `numbers.bmp`), `viscolor.txt` 24 dòng, `pledit.txt` SelectedBG `#0000C6` (khác mặc định `#0000FF`), `region.txt` toàn comment → region `{}` (đúng test "default file as empty" của fork), 11 file `.cur`.
- `genex.bmp` KHÔNG nằm trong bảng sprite của fork (ML không hỗ trợ) nên `classic.js` tìm riêng; màu genex (22 màu, hàng y=0, x=48..90 bước 2) chỉ đọc được ở trình duyệt thật (Image + canvas) — jsdom trả `null`, test assert đúng vậy.

### Cửa sổ chính Classic 275×116 (chuẩn Winamp 2) — đã vẽ + bấm được
- Titlebar (nút option/minimize/shade/close 9×9), display (đồng hồ 4 số + dấu trừ, vis 76×16, marquee 154×6, KBPS/KHZ, mono/stereo), prev/play/pause/stop/next/eject, seek 248×10, volume 68×13, balance 38×13, shuffle/repeat, EQ/PL, clutter bar O/A/I/D/V, vùng about.
- Nút bấm được (ít nhất): **Play** (gọi `togglePlay`), **Pause**, **Stop**, **Prev/Next** (phát mục trước/sau qua `playPlaylistItem`), **seek** (kéo → `seekToFraction`), **volume** (kéo → `setVolume` + `demo.volume`), **balance** (kéo → PAN), **EQ** (mở/đóng ngăn kéo ở tab EQ), **PL** (đổi trạng thái playlist qua `onPlaylistToggle`), **shade/minimize/close**, **shuffle** (bật/tắt), **repeat** (xoay Tắt → Lặp toàn bộ → Lặp 1 bài), **clutter D** (đổi zoom 1x/fit), **clutter I** (thông tin bài), **clutter V** (đổi kiểu vis), **clutter O** (menu chính), bấm đồng hồ đổi đếm lên/đếm ngược, lỗi kênh hiện chữ đỏ không dấu trên marquee (`hue-rotate(-120deg)` như fork).
- **Shade Classic 275×14 có rồi:** nền shade + cùng 4 nút titlebar, transport thu nhỏ (prev/play/pause/stop/next/eject), vis mini 38×5, seek mini 17×7 (thumb trái/giữa/phải theo vị trí), đồng hồ mini 5 ký tự; dblclick titlebar (hoặc nút shade) về normal.
- Đồng bộ trạng thái qua `refreshClassicMain()` gắn vào các điểm choke sẵn có (`updateStatusEls`/`updateTimerEls`/`updateProgress`/`updateVolumebar`/`updateChannelsIndicator`/`selectPlaylistItem`/`clearPlaylistSelection`) — đèn play/pause, đồng hồ, marquee, KBPS/KHZ, mono/stereo, thumb slider, nút shuffle/repeat/EQ/PL tự đổi theo. Chữ chạy Classic đăng ký vào `tickerEls` với cờ `classic: true` nên `setTickerText` không ghi đè bằng chữ Arial (đã chặn trong `setTickerText`, kèm test).
- Vis Classic vẽ gradient theo HÀNG (màu `viscolor.txt` 2..17, đỉnh→đáy) như `BarPaintHandler` của Webamp — nhánh `classic: true` trong `drawVisStatic`, không đụng vis Modern (16 cột 1 màu/cột như cũ).
- Công thức lấy đúng từ fork: volume `round(vol*28)` → offset `(s−1)*15` (100%→405, 50%→195); balance `floor(|bal|/100*27)` → offset `s*15`. Số dùng `NUMS_EX` khi có, không thì `NUMBERS` (dấu trừ `NUMBERS` 5×1 ở (−1,6); `NUMS_EX` dùng nguyên ô 9×13 — khác fork một chút, fork giữ hộp 5×1 rồi cắt glyph).
- KHÔNG có đợt này (ghi rõ): **cửa sổ Playlist Classic chưa vẽ** (nút PL chỉ đổi trạng thái + sáng đèn), **cửa sổ EQ Classic chưa vẽ** (nút EQ chỉ mở/đóng ngăn kéo Modern ở tab EQ), cửa sổ ML Classic chưa vẽ, `region.txt` chưa áp mặt nạ polygon (cửa sổ vẫn chữ nhật), cursor `.cur` của skin chưa dùng, đèn work-indicator luôn ẩn (Amp không có trạng thái "đang tải" riêng).
- Tương thích ngược: loader KHÔNG có `classic.js` (vd test cũ chỉ nạp skin-loader.js) thì `classic=null` và renderer về đường cũ — chỉ cửa sổ Video/Hiệu ứng rời, `renderLayout("main","normal")` trả 0 (đã giữ test ở multi-skin-test).

### (1) Preset EQ `.eqf`/`.q1` (winamp-eqf, Webamp fork)

- File mới `eqf.js` (thuần JS, không dependency, nạp qua `<script src="eqf.js?v=10.1">`): `parseEqf`/`createEqf` theo đúng spec Winamp — header `"Winamp EQ library file v1.1"` (27B) + `0x1A "!--"` (4B), mỗi preset 268B (tên 257B Latin-1 kết thúc NUL + 11 byte giá trị, byte lưu = `64 − giá trị`, thứ tự 60/170/310/600/1000/3000/6000/12000/14000/16000 Hz + preamp, thang 1–64, 33 = phẳng 0 dB). Kiểm bằng file mẫu thật của Webamp (`winamp_sample.q1` 4 preset, `max`/`min`/`midline.EQF`).
- **Cách map (ghi rõ — dải Amp khác tâm tần số dải .eqf):** map theo VỊ TRÍ, tần số tăng dần — hz60→eq1 … hz16000→eq10, preamp→preamp (tâm biquad của Amp là 31.5/63/125/250/500/1000/2000/4000/8000/16000 Hz, cùng thứ tự/số lượng). Đổi đúng theo dB, KHÔNG theo kiểu tuyến tính 1..64→0..100 của Webamp: dB = (v−33)×12/31 (v≥33), (v−33)×12/32 (v≤33); 33 → đúng 0 dB; sai số round-trip ≤ ~0,2 dB.
- Menu PRESETS (ngăn kéo EQ) thêm 2 mục: "Nạp preset .eqf…" (chọn file `.eqf`/`.q1` → 1 preset thì áp ngay vào 10 slider + preamp; nhiều preset thì mở bảng chọn kiểu menu PRESETS) và "Lưu preset .eqf…" (ghi preset hiện tại thành file `amp-eq.eqf` tải về, tên "Entry1"). Preset mang qua lại được với Winamp PC (cùng định dạng file).
- KHÔNG lấy từ Webamp đợt này: vis FFTNullsoft, Options, KBPS/KHZ, media engine, playlist/m3u, React/Redux, SkinEngine_WAL, server skin-database (đã chốt).

### (2) Beat đúng XML — gỡ dải sọc tràn (ảnh 14:57 + 15:09 + 15:12)

- **Chẩn đoán đúng:** dải sọc ngang đè nút Repeat tới chữ "R" là 2 lớp overlay của nhóm beat (`beat_textoverlay.png` + `beat_displayoverlay.png`, 167×31, hàng ngang xen kẽ) + chữ "BEAT" — KHÔNG phải canvas vis (vạch vis 16 cột màu XML là ĐÚNG, giữ nguyên theo ý Hải 15:14). Nhóm beat có `visible="0"` trong XML; v9.9 ép hiện khi "Enable Beat Visualization" bật (mặc định bật) nên nó vẽ tràn: nhóm ở display (200,11) rộng 167 → mép 372, tràn display (hết ở 310) 62px và tràn cửa sổ 354 tới 18px.
- **Sửa (quy tắc XML — chỉ vẽ đúng những gì XML có):** Winamp thật chỉ hiện nhóm beat khi cửa sổ kéo rộng đủ (MAKI điều khiển) — ở cỡ mặc định 354 thì display KHÔNG có beat, không chữ "BEAT", không sọc. Nay `pruneBeatGroupIfOverflows` gỡ cả nhóm khỏi DOM khi mép phải nội dung của nó vượt chiều rộng layout (đo từ hậu duệ thật, không gán cứng 372/354); kéo rộng ≥372 thì nhóm hiện lại + khung beat chạy theo bass thật (đợt D). Vạch vis không đụng tới. Nút Repeat không còn bị che (test khóa: 0 sprite beat ở 354).
- Ghi chú MAKI: XML 566 không mô tả điều kiện hiện beat (do MAKI) — Amp dùng ngưỡng tràn làm điều kiện, ghi rõ ở đây, không bịa hiệu ứng.

### (3) Vis AVS kiểu Webamp (ảnh 15:15) — display vis giữ nguyên

- Vùng AVS/Video nay vẽ 75 cột mỏng theo đúng thuật toán BarPaintHandler của Webamp (`VisPainter.ts`): ánh xạ log (0,09 tuyến tính + 0,91 log trên 512 bin), gom 4 bin/cột (cột thứ 4 mỗi nhóm là khe 1px), falloff vừa (0,75 hàng/khung — cột rơi TỪ TỪ, không nhảy vọt), peak rơi chậm có gia tốc (vận tốc ×1,1/khung), gradient dọc 16 hàng từ màu `<vis>` của skin đang nạp. Chỉ lấy kiểu dáng/hành vi — code viết lại theo Amp (không bê FFTNullsoft của Webamp; dùng analyser 32 bin sẵn có của Amp).
- Display vis giữ nguyên 16 cột, màu ColorBand1..16, theo nhạc thật khi EQ bật (Hải xác nhận "giống Webamp là đúng"). Vùng AVS không có phần tử thừa ngoài XML (group `video.group` = nền đen + chỗ chứa video/vis; nút Detach/Switch là điều khiển chức năng, giữ).

### (4) Zoom 1x / Fit + cân dọc trên PC

- **Lỗi gốc:** Fit tính `availH = innerHeight − 340` (số 340 từ thời toolbar cũ, đã bỏ) nên trên điện thoại Fit bị giới hạn chiều cao → chồng cửa sổ co nhỏ oan (ảnh 15:24: s=0,631 thay vì ~1,0). Nay `availH = innerHeight − 8`.
- **Cân dọc trên PC** (giống Webamp fork dồn cửa sổ): màn rộng (≥700px) thì stage căn giữa dọc (`marginTop = (innerHeight − LH×s)/2`); điện thoại vẫn dính đầu trang. Áp cho cả 1x và Fit; `#stage-wrap` transition thêm `margin-top` nên ngăn kéo trượt vẫn giữ cân giữa.
- **Fit tính lại mỗi khi chồng cửa sổ đổi** (mở/đóng playlist, ML, drawer, video — `renderCurrent` gọi `setZoom` sau mỗi lần vẽ; Fit đọc LW/LH từ `stage.style` sau render, không gán cứng 354/436). Kích thước người dùng đã kéo vẫn giữ (`localStorage amp9-winsize-v9`).
- **Video tách rời không còn nhỏ hẹp** (ảnh 15:31–15:32): cửa sổ Video rời mặc định đúng 354 = rộng cửa sổ chính; ảnh hẹp là do Fit cũ (s=0,897 vì availH nhỏ hơn chồng 361px) — nay Fit tính lại sau tách/gắn nên vừa màn hình. Video 16:9 trong khung 342×150 vẫn pillarbox đúng (`contain`), không phải lỗi.

### (5) Thêm nhạc local: 1 bài hoặc cả thư mục

- Trước đây chỉ có chọn thư mục. Nay menu ⋯ có 2 mục riêng: "Thêm 1 bài nhạc…" (chọn 1 file, `accept` audio) và "Thêm thư mục nhạc…" (quét đệ quy `webkitdirectory`); nút Eject mở bảng chọn 2 cách; menu File → "Phát file nhạc…" nay mở chọn 1 file (đúng tên gọi); menu Add của playlist giữ chọn thư mục.
- Thư mục: giữ cấu trúc làm nhóm/album — nhóm = đường dẫn thư mục tương đối dưới thư mục đã chọn (bỏ đoạn đầu = tên thư mục chọn), album = thư mục cha gần nhất, artist = thư mục ông (dạng Nghệ sĩ/Album/bài); file thẳng trong thư mục chọn → nhóm = tên thư mục chọn; file đơn → nhóm "Local". Sắp xếp theo đường dẫn tương đối. Tag ID3 chưa parse (đợt metadata sau) — trường artist/album từ thư mục là cầu nối, ghi rõ ở đây. Thời lượng vẫn probe bằng thẻ audio tạm như trước.

### (6) Viên KBPS/KHZ — chữ không chạm mép (ảnh 15:09)

- **Đối chiếu Winamp thật:** viên trắng mặc định ĐÚNG là nhỏ vậy (diễn đàn WACUP ghi rõ hộp bitrate co lại dưới 100 kbps — quirk gốc; Amp vẽ đúng). Hải vẫn muốn sửa cho chữ không chạm mép.
- **Nguyên nhân đo được từ bitmap:** font songinfofont là font "khuôn" (ô đục, chữ là lỗ trong suốt); nét chữ chiếm 3×5px trong ô 4×8, bearings trái **0px** (nét chạm x=0), phải 1px, trên/dưới 1px + 1 hàng tách trong suốt ở đáy ô.
- **Sửa:** `loadFont` đo trực tiếp từ bitmap (góc các ô phần lớn đục → khuôn; bảng đo sẵn `STENCIL_FONT_IDS` chỉ làm fallback khi không đo được — jsdom không có canvas 2d); `makeBitmapText` thêm 4 dải đệm trắng RỜI 2px quanh holder (trái/phải/trên/dưới) cho font khuôn — KHÔNG đặt nền trắng sau holder (nền sẽ lấp lỗ chữ, chữ biến mất). Vị trí glyph không đổi; chỉ font khuôn mới có đệm (pe.time.font/BIGNUM/smallfont giữ nguyên).
- **Sửa hồi quy kèm theo:** `loadFont` dùng kiểm truthy `if (fontCache[fontId])` nên lần tải lỗi (null) không được cache → mỗi glyph thử lại ảnh font (1 macrotask/lần) làm render chậm, `lastStage` còn trỏ div build → popup bảng thông tin bài mở ra rồi mất (batch-d fail 4). Nay cache cả lần lỗi bằng `hasOwnProperty`. Tác dụng phụ: thứ tự resolve microtask đổi → 2 lần vẽ đồng hồ chồng nhau (bấm đổi chế độ + timeupdate) có thể để lần cũ ghi đè lần mới (đồng hồ hiện "-2:55" thay vì "2:05", ml-timer-test fail 1) — sửa đúng chỗ bằng số thứ tự ở `updateTimerEls`/`updateInfoEls` (lần vẽ cũ thấy seq đã đổi thì bỏ, không ghi), KHÔNG hoàn lại cache. Cả 2 sửa đều có test khóa (pill-test + ml-timer-test).

### (7) Resize chạm mượt + tay nắm thấy được (15:22 + 15:28)

- **Lỗi gốc:** (a) `resizeMove` cộng dồn chiều cao stage/wrap (`curH + dh` với dh là tổng delta từ đầu kéo → kéo 5 lần +10px thì stage cao thêm 250px thay vì 50px rồi giật về khi thả); (b) lúc kéo chỉ hộp ngoài đổi, nội dung đứng yên → cảm giác không theo tay; (c) chỉ có chuột + chạm riêng, không pointer events, không `setPointerCapture` (ngón trượt khỏi tay nắm 16px là mất kéo).
- **Sửa:** pointer events khi trình duyệt có (`pointerdown/move/up/cancel` + `setPointerCapture`), fallback chuột/chạm cũ; chiều cao stage/wrap tính TUYỆT ĐỐI từ giá trị lúc bắt đầu kéo (`baseStageH + dh`); xem trước nhẹ lúc kéo (phần tử `data-stretch` + `.pl-list`/`.ml-content`/video/canvas co giãn theo tỉ lệ, KHÔNG vẽ lại toàn bộ — chỉ vẽ lại đầy đủ khi thả).
- **Tay nắm thấy được:** góc 24×24 (cũ 16px) có 3 gờ chéo, mép 10px có gờ giữa + viền mờ; ML + video rời + playlist đều có đủ 3 tay nắm và kéo được (đã có code từ v9.9 nhưng tay nắm trong suốt + nhỏ quá ở tỉ lệ Fit nên trên điện thoại không bấm được — ML 790 rộng → Fit ~0,45 → góc 16px chỉ còn ~7px màn hình). Cửa sổ chính vẫn KHÔNG có tay nắm (cố định 354×280 như Winamp thật).

### Đợt sau (ghi chú Milkdrop/butterchurn — Hải nhắc 15:16, làm ở đợt 7)

- ~~Làm ở đợt 7~~ — **đã làm ở ĐỢT 4 (03/11, xem mục "Đợt 4" dưới):** `milkdrop.js` mới, preset mặc định qua URL (đã kiểm sống), fallback nhúng sẵn, công tắc trong menu ⋯ (mặc định TẮT).

- Thư viện hiệu ứng phải lấy link trực tiếp trên mạng, khỏi tải về — đúng cách Webamp làm: preset nạp theo 3 dạng (object sẵn / hàm / URL — `fetch(url).then(r => r.json())`); butterchurn + butterchurn-presets qua CDN, không đóng gói vào zip.
- Đã kiểm 3/11: `https://cdn.jsdelivr.net/npm/butterchurn@2.6.7/lib/butterchurn.min.js` còn sống (UMD thật, `window.butterchurn`); `https://cdn.jsdelivr.net/npm/butterchurn-presets@2.4.7/lib/butterchurnPresets.min.js` còn sống (UMD thật, `window.butterchurnPresets`, `getPresets()` trả map tên→preset). Nguồn preset mặc định của Webamp là `butterchurn-presets/dist/base.js` → map thành danh sách `{name, butterchurnPresetObject}`. Fork dùng butterchurn 3.0.0-beta.5 + presets 3.0.0-beta.4 (đóng gói); Amp theo quy tắc CDN 2.6.7/2.4.7 đã kiểm sống — đợt 7 quyết giữ 2.6.7 hay lên 3.x.
- Đợt 7 phải: nạp butterchurn + presets qua `<script>` CDN lúc chạy (KHÔNG đóng gói); preset mặc định chọn theo tên qua `getPresets()` → `loadPreset`; hỗ trợ dạng URL (`fetch` trực tiếp); fallback = 1 preset object nhúng sẵn trong code nếu CDN chết (báo rõ); ghi trong README là preset lấy từ mạng, không đóng gói; test jsdom (mock fetch nạp URL + CDN chết thì fallback + `loadPreset` gọi đúng preset).


## Đợt 4 (03/11 — panel skin + vis sóng + Milkdrop + crossfade + đóng video không pause; GIỮ 10.1, không đổi loader)

**Không bump version** (loader không đổi — chỉ thêm `milkdrop.js` mới + sửa `index.html`/`renderer.js`/`audio.js`/`skin-browser.js`). Test mới: `batch4-test.js` 161 test; tổng jsdom **2455 PASS, 0 FAIL** (2294 cũ + 161 mới). `harness.js` LOAD OK (cả thư mục làm việc và bản giải nén từ zip, đã nạp thêm `milkdrop.js`). Zip nay có **12 file** (11 cũ + `milkdrop.js` mới). Menu ⋯ thêm 2 mục: "Crossfade: …" và "Milkdrop: …". **Đợt 5 thay mục (1) dưới đây bằng gỡ hẳn tính năng chọn skin từ kho (batch4 còn 169 test — xem mục "Đợt 5").**

### (1) ~~BUG ƯU TIÊN — panel "Chọn skin từ kho Webamp" tự hiện, đóng không được (Hải báo 16:35)~~ — ĐÃ GỠ HẲN TÍNH NĂNG Ở ĐỢT 5, KHÔNG SỬA LỖI NÀY NỮA

> **Đợt 5 (03/11, 17:13): Hải chốt BỎ LUÔN cửa sổ chọn skin từ kho** (thay cho việc fix lỗi đóng panel này) — lý do: chạy trên mạng không nạp trực tiếp skin từ kho vào được mà phải tải về đưa lên nên cửa sổ đó vô dụng; lúc test danh sách skin trong panel cũng đang trống (ghi nhận lại, không điều tra thêm). Nội dung gốc của mục (1) giữ lại dưới đây làm lịch sử — test A1–A23 cũ đã thay bằng test gỡ A1–A14 + nạp skin tay A15–A31 (xem mục "Đợt 5").

- **Gốc:** CSS `#skin-panel` đặt `display:flex` nên đè quy tắc `[hidden]{display:none}` của trình duyệt — thuộc tính `hidden` trên `<div id="skin-panel" hidden>` hoàn toàn vô tác dụng. `open()`/`close()` trong `skin-browser.js` (gán `hidden=false/true`) đều không đổi gì trên màn hình.
- **Sửa (`index.html`):** thêm quy tắc tường minh `#skin-panel[hidden],#menu-pop[hidden],#btn-reopen[hidden]{display:none;}` đặt SAU các quy tắc display. Đã rà các phần tử khác dùng `hidden` + `display`: `#menu-pop` và `#btn-reopen` không có quy tắc display riêng nên `[hidden]` của trình duyệt vẫn ăn, nhưng vẫn đưa vào quy tắc chung cho chắc; `#skinpick` (input) không có display riêng nên không lỗi; `#status` dùng class `.show` chứ không dùng `hidden`.
- **Panel choán chỗ trên màn 360px (Hải báo 16:45):** panel cũ rộng `min(340px, 100vw-20px)`, cao tới `min(480px, 100vh-20px)` — phủ gần hết màn hình, che trình phát, không test được. Thu lại: rộng `min(320px, 100vw-32px)`, cao tối đa `min(400px, 100vh-140px)` (chừa 140px cho trình phát phía dưới); màn hẹp (≤480px) thì ảnh thu nhỏ 64×40 (cũ 96×60), padding nhỏ lại, cao tối đa 360px. Vẫn đủ xem tên skin + ảnh.
- **Chạm ngoài để đóng (`skin-browser.js` `wireSkinPanel`):** lắng nghe click ở document — chạm ngoài panel thì đóng; bỏ qua cú chạm đã mở panel (ghi `openedAt`, bỏ qua click trong 250ms — cú chạm mở nổi bọt lên document SAU khi `open()` chạy, không chặn thì vừa mở đã đóng), bỏ qua chạm vào nút ⋯ / menu ⋯, bỏ qua chạm trong panel; thêm phím Esc để đóng.
- **Chọn xong tự đóng:** đã có từ đợt v10.0 (`onSelectSkin` resolve → `close()`); test khóa lại — chọn skin lỗi thì panel Ở LẠI + báo lỗi trong panel.
- Kiểm chứng (test A1–A23 trong `batch4-test.js`): CSS tĩnh + jsdom với `index.html` thật — load trang `display:none`, mở `display:flex`, đóng lại `display:none`; mở → chạm ngoài đóng, chạm trong không đóng, bấm ✕ đóng, chọn skin OK tự đóng, chọn skin lỗi ở lại.

### (2) Đóng cửa sổ video thì bị tạm ngừng — sửa: tiếng vẫn phát (Hải báo 16:42)

- **Gốc:** `closeAvs()` tự nó không pause gì (chỉ đổi state). Lỗi ở `renderLayoutInner`/`renderStackedInner`: vẽ vào div `build` tách rời rồi `swapIn()` làm `live.innerHTML = ""` — gỡ cả thẻ `<video>` đang phát khỏi document, và khi AVS đóng thì wrap không được gắn lại đâu cả (thẻ video nằm ngoài document cho tới khi mở lại cửa sổ). Trên trình duyệt điện thoại, thẻ video rời khỏi document thì bị tạm ngừng.
- **Sửa (`renderer.js` — lấy cách của Webamp fork, `media/currentVideo.ts` `getVideoHolder`: "chỗ chứa tạm thẻ video khi cửa sổ đóng, thẻ vẫn phát nền"):** holder ẩn `#amp-avs-park` (`position:fixed; 2×2; opacity:0`, KHÔNG `display:none`, gắn vào `document.body`, `aria-hidden`) giữ thẻ video LUÔN trong document:
  - `ensureAvsMedia()` tạo wrap xong thì park ngay (thẻ video có trong document từ lúc sinh ra, kể cả khi AVS chưa từng mở — trước đây phát kênh video mà chưa mở cửa sổ thì thẻ video cũng nằm ngoài document).
  - `swapIn()` (cả 2 chỗ renderLayout/renderStacked) park wrap TRƯỚC khi `live.innerHTML = ""`.
  - `attachAvsMedia()` (mở cửa sổ) dời wrap từ holder vào cửa sổ như cũ.
  - `resetAvsMedia()` (chỉ dùng khi EQ tắt mà thẻ cũ đã có source + URL cross-origin) vẫn pause + xóa src như cũ — đó là đường nạp lại, không phải đường đóng cửa sổ.
- Đóng cửa sổ giờ chỉ ẩn hình, tiếng vẫn phát, đồng hồ vẫn chạy; mở lại thì hình hiện lại, tiếng không ngắt. Kiểm chứng (test B0–B15): cùng 1 thẻ video trước/sau đóng/mở lại, `isConnected === true`, `pause()` không được gọi lần nào, `src` giữ nguyên, thẻ nằm trong holder khi đóng và trở lại stage khi mở.

### (3) Vis dạng sóng (oscilloscope) + bấm vis đổi kiểu (Hải nói rõ 16:39)

- Webamp có 2 dạng vis: sóng + cột; Amp v10.0 mới chỉ vẽ cột. Thêm dạng sóng + bấm vào vis để đổi kiểu như Webamp, xoay **BAR → OSCILLOSCOPE → NONE → BAR…**. Vẫn dùng analyser thật của Amp (KHÔNG bê code vis của Webamp, chỉ lấy kiểu dáng/hành vi đổi kiểu).
- **Mỗi vùng bấm đổi kiểu RIÊNG như Webamp:** vis trong display (16 cột) dùng `visTypeDisplay`, vis trong vùng AVS (75 cột) dùng `visTypeAvs` (`renderer.js`: `cycleVisType(which)` / `setVisType(which, type)` / `getVisTypes()`, lưu cùng state AVS `localStorage "amp9-avs-v9"` để lần nạp sau giữ kiểu đã chọn). Nút VIS_Prev/Next trong skin vẫn đổi MÀU cột (variant) như cũ — đổi kiểu và đổi màu là 2 thứ khác nhau.
- **Vẽ sóng:** `drawVisStatic` lấy thêm time-domain (`getByteTimeDomainData`, có guard khi stub không có hàm thì suy từ freq/sine); `drawVisWave` vẽ 1 đường polyline ngang canvas; `visWaveValue`/`visWaveAmp` tính giá trị/biên độ theo chế độ real/flat/sample (flat = đường thẳng giữa — vis im; sample = sine trang trí). Dạng NONE: xóa canvas, heights toàn 0, không falloff/peak. Vạch vis giống Webamp giữ nguyên (cột bar không đụng tới).
- **Bấm được:** canvas vis display (`.stage .vis` vốn `pointer-events:none` nên bật lại inline `pointer-events:auto` + `cursor:pointer`), canvas AVS, cả 2 canvas vis Classic — đều có `onclick` gọi `cycleVisType` đúng vùng.
- Kiểm chứng (test C1–C40): xoay đủ vòng bar→osc→none→bar từng vùng, sóng lên xuống theo time-domain, none toàn 0, bấm canvas đổi đúng vùng, khôi phục từ state đã lưu.

### (4) Milkdrop / butterchurn (`milkdrop.js` MỚI — việc 7 của v10.0)

- **Lấy quy ước từ Webamp fork, KHÔNG bê code:** `actionCreators/milkdrop.ts` (`normalizePresetTypes` — 3 dạng preset) + `components/MilkdropWindow/Visualizer.tsx` (`createVisualizer(ctx, canvas, {meshWidth 32, meshHeight 24, pixelRatio, onlyUseWASM:true})`, `connectAudio(analyser)`, `loadPreset(preset, transitionTime)`, `render()` mỗi frame rAF) + `webamp-demo/js/butterchurnOptions.ts` (preset JSON lẻ ở `unpkg.com/butterchurn-presets/*.json`). Amp làm gọn: KHÔNG có preset cycling/random/overlay/drop file `.milk` — chỉ 1 preset mặc định + chuyển preset bằng 3 dạng trên.
- **Preset lấy từ mạng, KHÔNG đóng gói vào zip — tìm link ở ĐẦU `milkdrop.js`:** thư viện butterchurn **KHÔNG có thẻ `<script src>` trong `index.html`** (đừng tìm trong HTML) — loader tạo thẻ `<script>` động lúc chạy khi bật Milkdrop lần đầu (lazy). 3 link nằm ngay đầu `milkdrop.js` (`BUTTERCHURN_CDN` / `PRESETS_CDN` / `DEFAULT_PRESET_URL`):
  - Lib (lazy-load bằng thẻ `<script>` lúc chạy, chỉ khi bật): `https://cdn.jsdelivr.net/npm/butterchurn@2.6.7/lib/butterchurn.min.js` và `https://cdn.jsdelivr.net/npm/butterchurn-presets@2.4.7/lib/butterchurnPresets.min.js` — đã kiểm sống 03/11 (UMD thật).
  - Preset mặc định dạng **URL** (đã kiểm sống 03/11: HTTP 200, JSON hợp lệ, 3824 byte): `https://cdn.jsdelivr.net/npm/butterchurn-presets@2.4.7/presets/converted/Zylot%20-%20Star%20Ornament.json` — fetch trực tiếp, không tải file về.
  - Fallback: đúng preset đó **nhúng sẵn** trong code (`FALLBACK_PRESET`, 3824 byte minified) — dùng khi fetch URL lỗi VÀ tra kho preset cũng lỗi. CHỈ fallback preset, KHÔNG fallback lib: CDN lib chết thì Milkdrop không chạy được, vis AVS thường ở lại (báo rõ, không crash).
- **Nối vào Amp:** `milkdrop.js` `createMilkdrop({document, window, fetchImpl, getAudioContext, getAnalyser, onStatus})` → `attachTo(wrap)` gắn canvas vào hộp AVS; `renderer.setMilkdropCanvas(canvas)` / `setMilkdropActive(on)` ẩn canvas vis thường và hiện canvas Milkdrop khi AVS ở chế độ vis (đồng thời `drawVisStatic` khỏi vẽ vis thường lên canvas đang ẩn — tiết kiệm CPU); `index.html` thêm mục menu ⋯ "Milkdrop: Bật/Tắt" (`toggleMilkdrop`, lưu `localStorage "amp9-milkdrop-v1"`, khôi phục sau khi nạp trang), `syncMilkdrop()` sau mỗi render (chỉ chạy vòng render khi AVS mở ở chế độ vis + đang phát), `onPlayingChange` nối `setPlaying` + `ensureReady` (bật Milkdrop trước khi phát nhạc lần đầu thì tạo visualizer nốt khi có AudioContext). **v10.4:** mục Milkdrop có cả trong menu Vis/Video của renderer (`onMilkdropToggle`/`isMilkdropOn`, cùng đường `toggleMilkdrop`); "Hiệu ứng trước/sau" trong menu Vis chỉ đổi MÀU cột vis nên đổi tên thành "Màu hiệu ứng trước/sau" cho khỏi lẫn với Milkdrop.
- **Giới hạn (ghi rõ):** Milkdrop chỉ "nghe" được nhạc khi **EQ BẬT** (analyser của Amp chỉ có tín hiệu khi tiếng đi qua chuỗi EQ — cùng giới hạn như vis, xem đợt B); EQ tắt thì preset vẫn chạy hình nhưng không theo nhạc. **Tốn GPU/pin trên điện thoại nên MẶC ĐỊNH TẮT** — bật từ menu ⋯ khi cần. butterchurn không có hàm hủy visualizer: tắt chỉ dừng vòng render + ẩn canvas, bật lại dùng tiếp visualizer cũ.
- Kiểm chứng (test D1–D32 + `milkdrop-load-test.js` L1–L8, đợt v10.4): hằng CDN/preset, enable nạp lib + tạo visualizer + `loadPreset` đúng preset URL, URL lỗi → library, cả hai lỗi → fallback nhúng sẵn, CDN chết → reject + `libsFailed` (không crash), 3 dạng preset (object/hàm/URL/tên), vòng render chỉ chạy khi enabled + playing + visible, `setSize` đổi cỡ canvas + visualizer; đường nạp động thật (`defaultLoadScript` tạo thẻ `<script>` vào `<head>` đúng thứ tự 2 link, `onerror` → reject có kèm URL); lỗi nạp hiện **banner đỏ** `#status` qua `toggleMilkdrop` (CDN chết → "Không bật được Milkdrop", chưa có AudioContext → báo "sẽ tự chạy khi phát nhạc" nhưng cờ vẫn BẬT để `ensureReady` tạo nốt); **L8 — bật khi ĐANG phát** (lỗi gãy v10.3: `setPlaying(true)` chỉ bắn khi trạng thái phát đổi, nên bật Milkdrop lúc nhạc đã phát thì vòng render không chạy, canvas đen dù visualizer + preset đã có — đối chứng: không `setPlaying` thì `renderCalls = 0`, có thì `= 9`; fix v10.4: `syncMilkdrop()` đồng bộ cả trạng thái phát từ engine nên bật lên là thấy hình động ngay).

### (5) Crossfade trộn bài hát — LÀM MỚI, không phải lấy từ Webamp (Hải hỏi 16:35)

- **Ghi rõ: Webamp fork KHÔNG có tính năng crossfade trộn nhạc để lấy** (main chat đã rà: kết quả tìm chỉ có cross-fade của CSS và class MAKI, không phải trộn bài) — phần này **làm mới hoàn toàn** bằng engine 2 thẻ như ghi chú v9.9, không lấy được từ Webamp.
- **Cách làm (`audio.js`):** thêm thẻ audio thứ hai `audioElB` (+ `audioSrcB` riêng, cũng nối vào preamp khi EQ bật) — bài mới nạp vào thẻ CÒN LẠI (A↔B luân phiên) để 2 thẻ phát chồng nhau. Khi thẻ mới bắt đầu phát thật (sự kiện `playing`/`timeupdate`) thì ramp tuyến tính: bài cũ giảm dần về 0, bài mới tăng dần từ 0 lên đủ tiếng trong thời gian crossfade, xong thì pause thẻ cũ. Ramp bằng `el.volume` theo bước 100ms (chạy được cả khi EQ bật — lúc đó `el.volume` là 1 qua master — lẫn EQ tắt/native).
- **Điều khiển:** menu ⋯ "Crossfade: …" xoay Tắt → 1s → 2s → 4s → Tắt; **mặc định 2s** (`CROSSFADE_DEFAULT_MS`, lưu `localStorage "amp9-xfade-ms"`); `setCrossfade(ms)`/`getCrossfade()` (kẹp 0..10000, 0 = tắt).
- **Giới hạn (ghi rõ):** chỉ **audio → audio** (chuyển sang kênh video thì cắt cứng như cũ); **bấm lại đúng bài/kênh đang phát thì cắt cứng** (nạp lại, giữ nguyên đường thử lại 3s + báo lỗi kênh — không crossfade); **đổi EQ giữa lúc crossfade thì hủy fade** (thẻ cũ dừng ngay, thẻ mới nạp lại theo đường EQ mới); **đổi âm lượng giữa lúc fade** thì ramp vẫn đi tới đích cũ, xong `applyVolume()` chuẩn hóa lại; bài mới lỗi trong lúc chờ/ramp thì **bỏ lần chuyển, trả bài cũ đang phát** (không thử lại, không báo lỗi — người nghe không bị ngắt). Theo dõi trạng thái phát theo từng thẻ (`playingEls`) để retry sau lỗi không nạp đè lên thẻ cũ đang phát.
- Kiểm chứng (test E0–E8): ramp giữa chừng (A giảm/B tăng), ramp xong (A pause, B đủ tiếng, A về volume 1), tắt crossfade → cắt cứng, cùng URL → cắt cứng, sang video → cắt cứng, bài mới lỗi → trả bài cũ + không báo lỗi, EQ bật (B có source riêng), 3 bài liên tiếp luân phiên A-B-A, `stop()` dừng cả 2 thẻ.

### Còn chờ test trên điện thoại thật (đợt 4)

- ~~Panel chọn skin: load trang không tự hiện; bấm ✕ / chạm ngoài thì biến mất và ở yên; chọn xong 1 skin thì tự đóng; panel thu nhỏ có đủ xem tên + ảnh trên màn 360px không.~~ — **ĐÃ GỠ Ở ĐỢT 5, không còn test mục này** (thay bằng: menu ⋯ không còn mục skins, nạp skin tay .wal/.wsz vẫn chạy — xem mục "Đợt 5").
- Đóng cửa sổ video: **tiếng vẫn phát, đồng hồ vẫn chạy**; mở lại: hình hiện lại, tiếng không ngắt (đặc biệt kênh TV360 id=2/id=4 khi EQ tắt — vẫn chờ từ v9.8).
- Vis: bấm vào vis trong display đổi cột → sóng → tắt; bấm vào vis vùng AVS đổi riêng; sóng theo nhạc thật khi EQ bật.
- Milkdrop: bật từ menu ⋯ (cần mạng để nạp lib + preset qua URL); preset "Zylot - Star Ornament" chạy + theo nhạc khi EQ bật; tắt thì về vis thường; kiểm tra pin/nóng máy khi để lâu.
- Crossfade: chuyển bài/kênh nghe bài cũ nhỏ dần + bài mới lớn dần trong ~2s; đổi thời gian trong menu ⋯ (Tắt/1s/2s/4s); chuyển sang kênh video thì cắt cứng (không fade).

## Đợt 5 (03/11 — metadata nhạc + gỡ chọn skin từ kho Webamp; GIỮ 10.1, không đổi loader)

**Không bump version** (loader không đổi — chỉ thêm `metadata.js` mới + sửa `index.html`/`renderer.js`, và gỡ `skin-browser.js`). Test mới: `metadata-test.js` 121 test; `batch4-test.js` đổi mục A (23 test panel cũ → 14 test gỡ + 17 test nạp skin tay = 169 test, tăng ròng 8); `skin-browser-test.js` (104 test) XÓA; `page-test.js` còn 88 test (90 cũ − 2 test panel). Tổng jsdom **2478 PASS, 0 FAIL** (2455 cũ − 104 skin-browser − 23 panel cũ − 2 page + 121 metadata + 31 batch4-mới). `harness.js` LOAD OK (cả thư mục làm việc và bản giải nén từ zip, đã nạp thêm `metadata.js`, không còn `skin-browser.js`). Zip vẫn có **12 file** (12 cũ − `skin-browser.js` + `metadata.js` mới). Menu ⋯ còn 7 mục (bỏ "Chọn skin từ kho…").

### (1) Metadata nhạc — đọc tag nhạc local (`metadata.js` MỚI)

- **Lấy quy ước từ Webamp fork, KHÔNG bê code:** `fileUtils.ts` `genMediaTags(file, musicMetadata)` — `parseBlob(file, {duration:true, skipPostHeaders:true})`; `genMediaDuration(url)` bằng thẻ `<audio>` tạm (Amp đã có sẵn đường này: `probeLocalDuration`, đợt L 9.8 — giữ nguyên); `actionCreators/files.ts` `fetchMediaTags` — lấy `metadata.common {artist, title, album, picture}` + `format {numberOfChannels, bitrate, sampleRate}`, file không có tag album thì dùng tên thư mục chứa file làm album; `reducers/tracks.ts` `SET_MEDIA_TAGS` ghi title/artist/album vào track. Fork nạp lib bằng bundler (`webamp.ts`: `import * as musicMetadata from "music-metadata"`); Amp không có build step nên nạp lib qua CDN bằng dynamic import().
- **CDN — ĐÃ KIỂM SỐNG 03/11 (curl, HTTP 200):**
  - Đường chính (ESM): `https://cdn.jsdelivr.net/npm/music-metadata-browser@2.5.11/+esm` (jsDelivr bundle ESM thật, exports `parseBlob`/`fetchFromUrl`; kéo theo music-metadata@7.14.0 core — đủ parseBlob MP3/FLAC/OGG/M4A/WAV). Nạp lười bằng dynamic import() khi thêm file nhạc lần đầu.
  - Dự phòng (ESM): `https://esm.sh/music-metadata-browser@2.5.11` (HTTP 200).
  - **KHÔNG DÙNG:** `.../music-metadata-browser@2.5.11/lib/index.js` (HTTP 200 nhưng là CommonJS — `require("music-metadata/lib/core")`, nạp bằng `<script>` thường lỗi `require is not defined`); bản 0.6.1 mà fork đang dùng đã 404 trên cả 2 CDN. `music-metadata@11.6.0/+esm` cũng sống nhưng là core Node (không có `parseBlob`) nên không phải đường chính.
- **Fallback không cần mạng (parser nhúng sẵn trong `metadata.js`):** ID3v2.3/v2.4 (khung TIT2/TPE1/TALB, mã hóa Latin-1/UTF-16/UTF-8) + ID3v1 (128 byte cuối) + FLAC Vorbis comment (TITLE/ARTIST/ALBUM). CDN chết/offline thì parser này vẫn đọc được tag MP3/FLAC; ID3 không chứa thời lượng nên duration vẫn do thẻ `<audio>` probe hoặc duration của lib — không bịa duration.
- **Nối vào Amp (`renderer.js`):** `addLocalFiles` (cả 2 cách thêm nhạc: 1 bài + cả thư mục) gọi `probeLocalMetadata(item, file)` sau `probeLocalDuration`; `applyMetadataToItem` ghi vào model: title (tag) → `item.tagTitle` (tên file ở `item.name` giữ nguyên), artist/album (tag) thắng nghệ sĩ/album suy từ thư mục, duration (tag/lib) chỉ ghi khi `item.len` còn null, bitrate/sampleRate chỉ lưu model (`tagBitrate`/`tagSampleRate`). File không tag thì KHÔNG đổi gì — giữ tên file + thời lượng đã probe, nghệ sĩ/album hiển thị "Không rõ" (quy ước gom nhóm của fork cho radio/.wav không thẻ).
- **ML thêm cột Nghệ sĩ/Album** (đợt A v9.9 ghi rõ ML chưa có 2 cột này vì model không đọc metadata): hàng tiêu đề "Tên bài / Nghệ sĩ / Album / Thời lượng" + mỗi hàng thêm 2 span `.ml-artist`/`.ml-album`; tên bài trong ML dùng tag title (nếu có); `getMlState().columns = ["name","artist","album","len"]`.
- **Bảng trackinfo đầy đủ hơn:** tiêu đề = tag title (nếu có), thêm các dòng "Nghệ sĩ: …", "Album: …", "Kích thước: …" (vd "79 B", "1,5 MB" — `formatFileSize`); `getTrackInfoState` thêm `title/artist/album/fileSizeText/metaStatus/metaSource`. **Ticker vẫn hiện tên bài như cũ** (`item.name`, tên file, bỏ dấu) — không đổi sang tag title; hàng playlist cũng giữ tên file.
- **KHÔNG LẤY (đã chốt):** KBPS/KHZ từ tag — viên KBPS/KHZ vẫn tính như cũ ở `songInfoValues` (KBPS file local = fileSize×8/len, KHZ = AudioContext.sampleRate); bitrate/sampleRate của tag chỉ lưu model, không đưa lên viên đó. Không lấy ảnh bìa (picture) — Amp chưa có chỗ hiện bìa.
- Kiểm chứng (`metadata-test.js`, 121 test): file nhạc mẫu có tag ID3 thật (tự build byte ID3v2.3 UTF-8/UTF-16 + ID3v1 + FLAC Vorbis comment trong test); normalize dạng music-metadata của fork; lib giả qua CDN → source "lib"; lib lỗi/CDN chết → fallback parser nội bộ (source "id3v2"); không tag → source/status "none", giữ tên file + album thư mục; duration tag không ghi đè len đã probe; ML hiện đúng cột; trackinfo đủ trường.

### (2) GỠ HẲN chọn skin từ kho Webamp (thay việc fix lỗi đóng panel đợt 4)

- **Quyết định của Hải (main chat 17:13, side chat 17:16):** BỎ LUÔN toàn bộ tính năng — panel `#skin-panel` + mục "Chọn skin từ kho…" trong menu ⋯ + file `skin-browser.js` + mọi chỗ kiểm version nhắc `BROWSER_VERSION` trong `index.html`. Lý do: chạy trên mạng không nạp trực tiếp skin từ kho vào được mà phải tải về đưa lên nên cửa sổ đó vô dụng; lúc test (ảnh 16:35) danh sách skin trong panel đang trống — ghi nhận lại thôi, quyết định bỏ vẫn giữ nguyên, không điều tra thêm lỗi fetch/render list.
- **Gỡ sạch:** xóa file `skin-browser.js`; `index.html` bỏ thẻ `<script src="skin-browser.js">`, bỏ panel `#skin-panel` + toàn bộ CSS `.sb-*`, bỏ nút menu `data-act="skins"`, bỏ hàm `openSkinBrowser` + biến `skinBrowser`, bỏ `AmpSkinBrowser`/`BROWSER_VERSION` khỏi `logVersion()` + `checkVersions()` (kẻo báo "bản mix" vì thiếu file); `harness.js` không nạp `skin-browser.js` nữa; xóa `skin-browser-test.js`; `batch4-test.js` mục A viết lại thành kiểm chứng gỡ (A1–A14); `page-test.js` đổi menu 8 → 7 mục + kiểm `#skin-panel` không còn.
- **Vẫn giữ nạp skin Winamp qua file (Hải khẳng định 17:16):** "Nạp skin .wal/.zip…" chọn file tay là cách duy nhất để nạp skin — và nạp được **cả skin Winamp lẫn skin Webamp** (cùng định dạng file `.wal` Modern / `.wsz` Classic, chỉ khác nguồn tải: Winamp gốc hay tải về từ skin-database/museum của Webamp). Bộ đọc Classic (đợt v10.1) + loader Modern xử lý được cả 2 nguồn, không phân biệt nguồn.
- Kiểm chứng nạp tay (`batch4-test.js` A15–A31, 17 test): nạp thử bằng đúng đường `Loader.loadSkinFile(buf)` + `renderLayout("main","normal")` (đường `bootSkin` của index.html khi chọn file tay/kéo-thả):
  - Winamp Modern 566 `.wal` kèm zip → kind modern, 35 nút, vẽ được cửa sổ chính.
  - Winamp Classic base-2.91 `.wsz` kèm zip → kind classic, 15 sheet BMP, cửa sổ chính Classic 275×116.
  - **Webamp Classic 3DNow `.wsz`** (tải thật từ `r2.webampskins.org/skins/8a2cfd657fa97b1a511b372f5249d63a.wsz`, đúng 31.432 byte như đợt 2 đã kiểm; file BMP nằm trong thư mục con `3DNow/` — bộ đọc Classic tìm được qua tên file, không đòi file ở gốc zip) → kind classic, 14 sheet BMP (có MAIN), cửa sổ chính Classic 275×116. File mẫu lưu ở `~/workspace/amp-v9-verify/fixtures-webamp/` (chỉ làm fixture test, KHÔNG đóng vào zip giao).
  - **Webamp Modern 12 `.wal`** (tải thật từ `r2.webampskins.org/skins/c2273648295a986350f0e2007b705e85.wal`, 1.169.207 byte) → kind modern, có layout `main|normal`, vẽ được cửa sổ chính.

### Còn chờ test trên điện thoại thật (đợt 5)

- TV360 id=2/id=4 hiện hình khi EQ tắt, EQ on/off đổi tiếng video — vẫn chờ từ v9.8 (không đổi ở đợt 5).
- Nạp file nhạc có tag ID3 thì ML/trackinfo hiện Nghệ sĩ/Album đúng (thử 1 bài MP3 có tag + 1 bài không tag để thấy "Không rõ"); nạp 1 bài rồi cả thư mục đều đọc tag được; tắt mạng rồi nạp file MP3 có tag thì tag vẫn hiện (parser nội bộ).
- Nạp skin tay: chọn file `.wal` Modern + `.wsz` Classic (cả skin Winamp lẫn skin tải về từ Webamp) đều nạp + vẽ được; menu ⋯ chỉ còn 7 mục, không còn mục chọn skin từ kho; load trang không còn panel chọn skin.

## Đợt 6 (03/11 — Media Session API + hotkeys; GIỮ 10.1, không đổi loader)

**Không bump version** (loader không đổi — KHÔNG thêm file JS mới, chỉ sửa `renderer.js` + `index.html`). Test mới: `hotkeys-media-session-test.js` 107 test; tổng jsdom **2585 PASS, 0 FAIL** (2478 cũ + 107 mới). `harness.js` LOAD OK (cả thư mục làm việc và bản giải nén từ zip). Zip vẫn có **12 file**. Menu Help → "Hướng dẫn nhanh" nay là bảng phím tắt (thay text cũ từ đợt C).

### (1) Media Session API (`navigator.mediaSession` — nối vào `renderer.js`, không đụng `audio.js`)

- **Lấy từ fork, gỡ khỏi Redux middleware:** `mediaSession.ts` của fork là middleware Redux (nghe `onTrackDidChange`, dispatch `play/pause/seekBackward(10)/seekForward(10)/previousTrack/nextTrack`); Amp không có Redux nên nối thẳng vào hàm đã có của renderer: `togglePlay` / `prevTrack` / `nextTrack` / `seekBy`. Chỉ vài chục dòng trong `renderer.js` (mục "ĐỢT 6" sau `stopPlayback`): `getMediaSession()` + `updateMediaSession()` + `currentMediaMeta()` + `getMediaSessionState()`.
- **Metadata bài đang phát:** title = tag title (đợt 5) else tên file; track: artist/album từ tag (trống thì "" — KHÔNG gửi "Không rõ" lên màn hình khóa); đài: artist = tên nhóm (vd "Radio"), album = "". **Không có ảnh bìa** (artwork luôn `[]` như fork khi không có `albumArtUrl` — metadata.js không đọc picture, xem ghi chú metadata.js:187; không bịa URL bìa).
- **Cập nhật khi:** đổi bài (`playPlaylistItem`), phát/dừng (`onAudioPlayingChange` — đổi cả `playbackState` playing/paused để màn hình khóa vẽ đúng nút play/pause), tag về muộn (`applyMetadataToItem` — probe async sau khi đã phát, chỉ cập nhật khi là bài đang phát), dừng (`stopPlayback` — playbackState về paused, giữ metadata bài).
- **Action handlers (đăng ký 1 lần):** play → phát tiếp (nếu đang dừng), pause → tạm dừng (nếu đang phát), previoustrack → `prevTrack()`, nexttrack → `nextTrack(wrap theo repeat/shuffle)`, seekbackward/seekforward → tua ∓10s như fork (khác phím mũi tên ±5s, xem dưới). Đài live không tua được (`engine.seekTo` trả false theo seekable) thì im lặng, không báo lỗi.
- **Không có `navigator.mediaSession` (jsdom/trình duyệt cũ) thì mọi hàm trả false, không ném lỗi, không ảnh hưởng phát.** Test tiêm mediaSession + `MediaMetadata` giả qua `opts.mediaSession` / `opts.MediaMetadata` (chạy thật đọc `navigator` của trình duyệt).
- **jsdom KHÔNG đo được nút tai nghe / màn hình khóa / thanh thông báo thật** — chỉ đo được metadata + handler gọi đúng hàm. Chờ test trên điện thoại thật (xem dưới).

### (2) Hotkeys — mở rộng ngoài Space (`renderer.handleHotkey`, `index.html` delegate)

- **Bảng phím tắt (đối chiếu `hotkeys.ts` của fork, chỉ lấy phím hợp Amp):**

  | Phím | Hành vi | Ghi chú |
  |---|---|---|
  | Space | Phát / tạm dừng | Giữ từ đợt E |
  | ← / → | Tua ∓5 giây | File nhạc; đài live không tua được (im lặng) |
  | ↑ / ↓ | Âm lượng ±0,05 (kẹp 0–1, làm tròn 2 chữ số) | Kéo theo volumebar + slider VOLUME đang hiển thị |
  | N hoặc ] (B) | Bài sau | B giữ tương thích fork |
  | P hoặc [ (Z) | Bài trước | Z giữ tương thích fork |
  | M | Tắt / bật tiếng | Giữ `demo.volume` + volumebar, engine về 0 (như mute shade); kéo volume lúc đang mute chỉ đổi mức đã lưu, bấm M mới nghe lại; lưu/khôi phục qua state phát (`muted`) |
  | L | Lặp lại: Tắt → Lặp tất cả → Lặp 1 bài → Tắt | Như nút Repeat; fork dùng R cho repeat và L để mở file — Amp lấy L cho lặp (theo yêu cầu đợt 6) |
  | S | Phát ngẫu nhiên (Shuffle) | Tách từ code inline trong `playMenuItems` thành `toggleShuffle()` dùng chung |
  | X / C / V | Phát / Tạm dừng / Dừng | Theo fork (X play, C pause, V stop) |

- **Không đụng phím tắt trình duyệt:** bấm kèm Ctrl/Alt/Meta thì bỏ qua (fork có Ctrl+D double-size / Ctrl+R đảo playlist / Alt+W/E/G đổi cửa sổ — KHÔNG lấy: Ctrl/Alt là phím tắt trình duyệt, Amp không có double-size). **Không chặn gõ chữ:** focus trong INPUT/TEXTAREA/SELECT/contentEditable thì bỏ qua. Phím lạ thì trả false, để trình duyệt xử lý.
- **Nối dây:** listener keydown duy nhất trong `index.html` (`wireMenu`, đăng ký 1 lần để đổi skin không đăng ký trùng) nay delegate sang `renderer.handleHotkey(e)` — thay listener chỉ-Space của đợt E; `handleHotkey` tự `preventDefault()` khi đã xử lý. Hàm mới xuất qua API renderer: `handleHotkey`, `seekBy`, `adjustVolume`, `toggleMute`/`setMuted`/`isMuted`, `toggleShuffle`, `updateMediaSession`/`getMediaSessionState`/`currentMediaMeta`.
- **Mute (M) + mute shade là 2 công tắc độc lập:** `applyEngineVolume()` nay tắt tiếng khi bật cái nào (`isShadeMuted() || demo.muted`); tắt cả 2 mới nghe lại.
- Kiểm chứng (`hotkeys-media-session-test.js`, 107 test): metadata cập nhật đúng khi đổi bài (tag / không tag / radio), tag về muộn đổi theo, handlers gọi đúng hàm (kể cả seek trên live không ném lỗi), từng phím đúng hành vi (kể cả fallback `keyCode` cho trình duyệt cũ), trong ô input / kèm Ctrl/Alt/Meta / phím lạ đều không kích hoạt, Help hiện đủ phím tắt, `muted` lưu/khôi phục đúng.

### Còn chờ test trên điện thoại thật (đợt 6)

- TV360 id=2/id=4 hiện hình khi EQ tắt, EQ on/off đổi tiếng video — vẫn chờ từ v9.8 (không đổi ở đợt 6).
- **Mới đợt 6:** bấm nút tai nghe (play/pause/next/prev) thì Amp phát/dừng/chuyển bài theo; khóa màn hình rồi điều khiển từ màn hình khóa / thanh thông báo (tên bài + nghệ sĩ hiện đúng, nút play/pause/next/prev/tua chạy); thử các phím tắt trên bàn phím (Space, mũi tên tua/volume, N/P, M, L, S, X/C/V) — đặc biệt M tắt tiếng rồi bấm lại nghe lại, L xoay đủ 3 trạng thái lặp.
- Menu Help → "Hướng dẫn nhanh" hiện bảng phím tắt đầy đủ.


## Đợt 7 (03/11 — MAKI parser, giai đoạn a: ĐỌC/inspect — GIỮ 10.1, không đổi loader)

**Không bump version** (loader không đổi — chỉ thêm `maki.js` mới + mục menu ⋯ "Xem script MAKI…" + panel `#maki-panel` trong `index.html`). Test mới: `maki-test.js` 126 test; tổng jsdom **2711 PASS, 0 FAIL** (2585 cũ + 126 mới). `harness.js` LOAD OK (cả thư mục làm việc và bản giải nén từ zip, đã nạp thêm `maki.js`). Zip nay có **13 file** (12 cũ + `maki.js` mới). Menu ⋯ nay có 8 mục (thêm "Xem script MAKI…").

### (1) Parser `.maki` — `maki.js` MỚI (chuyển từ Webamp fork, chỉ lấy code `maki/`)

- **Nguồn fork đã đọc kỹ:** `packages/webamp-modern/src/maki/{parser.ts, MakiFile.ts, constants.ts, objects.ts, maki-bytecode.md}` + `objectData/*.json` (std/config/winampconfig/application/fileio/pldir). Snowpack 3 của gói đã cũ nên chỉ lấy code `maki/`, không build cả gói. `interpreter.ts`/`virtualMachine.js`/`skin/makiClasses/*` chỉ đọc để hiểu cách chạy, KHÔNG port (đó là giai đoạn b).
- **Định dạng file (đã kiểm bằng 29 file thật của 566):** magic `"FG"` + u16 luôn 1027 + u32 formatVersion (566: 23 — parser.ts của fork gọi u16 1027 là "version"; `maki.js` giữ `version` = 1027 cho khớp fork, thêm `formatVersion` = u32 mới là số phiên bản định dạng thật) + classes (16B GUID/class, hex thô phải qua `formatGuid()` y hệt `getFormattedId` của fork mới tra được tên) + methods + variables (primitive 2=int, 3=float, 4=double, 5=boolean, 6=string; biến subclass đánh dấu base `isClass` + `members`/`events`) + strings + bindings (binaryOffset đổi sang commandOffset) + code (opcode + immediate; `call` 0x18 có thể kèm u32 stack protection `0xFFFF000x`, `strangeCall` 0x70 kèm 1 byte số đối số). File `/debug` có thêm filepaths + line numbers sau code — thử đọc lướt, không được thì chỉ warning (không throw). File cụt thì throw rõ (đọc có kiểm giới hạn — file 5 byte không còn lọt như parser gốc).
- **Bảng dữ liệu sinh từ fork (không bê nguyên objectData):** `CLASS_NAMES` — 49 GUID → tên class xuất hiện trong 29 file 566; `METHOD_ARITY` — 199 method `Class.method` → số đối số (kèm chuỗi kế thừa parentClass như `getMethod` của fork). Skin khác có GUID/method ngoài bảng thì parser vẫn chạy (thiếu tên class / dùng heuristic, ghi rõ).
- **Nhận dạng kiểu dữ liệu xuyên realm:** `MakiReader` nhận `ArrayBuffer`/`Uint8Array` cả khi khác realm (JSZip ở Node đưa Uint8Array vào code chạy trong jsdom/trình duyệt — `instanceof` khi đó trả false) bằng `ArrayBuffer.isView` + sao chép byte tay.
- **API:** `parseMaki(buf, id)` / `inspectMaki(parsed)` / `inspectSkinFiles(files)` / `formatGuid(rawHex)` / `classNameOf(guid)` / `COMMANDS`. Lỗi đọc throw Error kèm id file + offset.

### (2) Inspect — đi tuyến tính, mô phỏng ngăn xếp trừu tượng (không chạy code)

- Ngăn xếp giữ giá trị tượng trưng `{type, value, desc}`: push sao chép biến; popTo/mov gán lại; `add` nối chuỗi hằng khi cả 2 đều là chuỗi hằng. Lệnh call: số đối số lấy theo thứ tự (1) byte/u32 kèm theo lệnh, (2) bảng `METHOD_ARITY`, (3) heuristic pop tới OBJECT (tối đa 8, ghi `argCountKnown=false`). Trình biên dịch MAKI đẩy đối số NGƯỢC nên thứ tự pop ra khỏi ngăn xếp CHÍNH LÀ thứ tự trong mã nguồn — đã kiểm bằng `setXmlParam("resize", "bottomright")` trên videoavs.maki.
- Đích được đặt tên khi suy ra được: `findObject("id")`, `scriptGroup`, `container:x`, `...|layout:y`, `group:`/`object:`, `parentLayout of …`, `new Class`; biến gán từ các giá trị này thì lần gán đầu ghi `firstDesc` để đặt tên cho binding và đích `var#N`. Đích không suy ra được giữ `var#N <Class>`.
- **Kết quả trên skin 566 (29 file — SỬA SỐ LIỆU: nhiệm vụ đợt 7 ghi "33 file" là sai; `unzip -l winampmodern566.wal | grep -ci maki` = 29):** 24.855 lệnh bytecode · 3.183 call (2.828 strangeCall 0x70 + 355 call 0x18) · 198 binding · 385 sự kiện ẩn/hiện (show/hide/setXmlParam) · 245 gán text · **0 call không rõ số đối số** · 0 opcode lạ · 0 stack protection (566 không dùng) · 967/3.183 call có đích đặt tên đầy đủ. Báo cáo đầy đủ: `~/workspace/amp-v9-verify/maki-566-report.md` (949 dòng: bảng từng file + toàn bộ sự kiện ẩn/hiện/gán text + top method + §4 đối chiếu Amp).
- **Giới hạn inspect (ghi rõ):** thứ tự sự kiện là thứ tự lệnh trong file, KHÔNG phải thứ tự chạy thật khi có rẽ nhánh; điều kiện hiện/ẩn (vd beat chỉ hiện khi cửa sổ đủ rộng) và giá trị biến lúc chạy không khôi phục được — phải làm giai đoạn b mới biết chính xác.

### (3) Chỗ Amp đoán sai / thiếu so với MAKI thật (chỉ liệt kê — đợt này KHÔNG sửa hành vi)

Tóm tắt §4 của báo cáo (chi tiết + bằng chứng từng mục xem trong `maki-566-report.md`):

- **Thiếu (12 mục):** (1) Notifier popup — `notifier.maki` 331 call, hiện cửa sổ + ghi title/artist/album + đổi ảnh bìa; Amp không có cửa sổ notifier (kèm `notifications_fade_times.maki`: slider thời gian fade/hold). (2) Cửa sổ Album Art (`albumart.maki`). (3) Đổi ticker Songticker ↔ infoticker khi seek/mute/đổi volume. (4) Menu Vis đầy đủ — coloring Normal/Fire/Line, peaks, peakfalloff, falloff, fliph, bandwidth, oscstyle, setMode (`visualizer.maki`). (5) Nhãn dải EQ ISO/Winamp (`eq.maki`). (6) Hiệu ứng About — 4 sao + 2 mắt chạy ngẫu nhiên (`about.maki`). (7) Menubar từng cửa sổ dời nội dung (y = 0/-17/16/17). (8) SeekerGhost khi kéo seek. (9) Nút Mute riêng + volumebar đổi w (`mute.maki`). (10) Đồng bộ shade ↔ normal — `unlinked`/`linkwidth`, dãy ẩn lúc nạp của shadecontrol. (11) Đồng hồ playlist đổi x/w theo nội dung (`pltime.maki`: -215/90 ↔ -180/55; ticker PESongticker bounce/scroll/off). (12) `menualign.maki`/`configtarget.maki` chưa đối chiếu.
- **Đoán sai (3 mục):** (1) Điều kiện hiện nhóm beat — Amp dùng ngưỡng tràn layout tự đặt; MAKI thật hiện theo rẽ nhánh (kéo cửa sổ đủ rộng) + đổi ảnh `display.right`/`beatleft`/`beatright` sang bộ `*2` khi beat bật (Amp chưa đổi ảnh). (2) `minimum_h` khi mở AVS — MAKI đặt 380 (mở) / 280 (đóng) + resizer `bottomright` ↔ `right`; Amp không áp minimum_h nào. (3) Crossfade — `crossfade.maki` chỉ là giao diện slider (nút tăng/giảm, ghost, overlay); engine trộn bài 2 thẻ của Amp (đợt 4) là làm mới, đừng nhầm 2 thứ.
- **Khớp (không sửa):** tab ngăn kéo EQ/Options/ColorThemes; chỉ báo kênh mono/stereo/surround (`setChannelsState`, đợt K); ticker bounce/scroll/off trong Options; detach/max/restore/switchto/reattach Video/Vis.

### (4) Xem MAKI trong trang (menu ⋯ → "Xem script MAKI…")

- Panel `#maki-panel` (nền sáng #ECE9D8 như menu ⋯, giữa màn hình, tối đa 340px, cuộn trong): tổng file/lệnh/call/binding/ẩn-hiện/gán text của skin đang nạp + bảng từng file + `<details>` mỗi file (binding, method gọi nhiều, 20 sự kiện ẩn/hiện đầu). Skin Classic không có `.maki` thì báo rõ. **Chỉ xem, không chạy.**
- Đóng bằng nút ✕ / chạm ngoài / Esc; quy tắc CSS `#maki-panel[hidden]` đặt SAU `display` nên `hidden` thật sự ẩn panel (bài học panel chọn skin đợt 4). Panel này là panel XEM script — đừng nhầm với panel chọn skin đã gỡ ở đợt 5.
- Nguồn file: `RES.zip` do loader giữ (quét `zip.files` lấy `.maki`, không đổi loader).

### (5) Giai đoạn b — interpreter thật (ĐỂ SAU, không làm đợt này)

Cần port `interpreter.ts` + `virtualMachine.js` + ~70 class GUI (`skin/makiClasses/*`: GuiObj, Group, Layer, Button, Text, Slider, Timer, System, Container, Layout…) + `UIRoot` của fork, rồi nối event/binding vào renderer (thay các hành vi JS viết lại hiện tại bằng chạy MAKI thật). Ước lượng lớn, rủi ro cao (chạy code lạ trong trang, khác biệt hành vi khó lường) — làm riêng 1 đợt sau khi Hải chốt, dựa trên báo cáo §4 đợt này để biết chỗ nào cần khớp.

### Còn chờ test trên điện thoại thật (đợt 7)

- TV360 id=2/id=4 hiện hình khi EQ tắt, EQ on/off đổi tiếng video — vẫn chờ từ v9.8 (không đổi ở đợt 7).
- **Mới đợt 7:** menu ⋯ → "Xem script MAKI…" hiện bảng 29 file của skin 566 (tổng 24.855 lệnh / 3.183 call / 198 binding); mở 1 file xem binding + method; bấm ✕ / chạm ngoài / Esc đều đóng panel; nạp skin Classic `.wsz` rồi mở panel thì báo "không có file .maki"; nạp skin Modern khác (vd skin Webamp .wal) thì panel liệt kê đúng file `.maki` của skin đó (không còn số của 566).
## Đợt A (9.9 — đã bump + đóng zip)

6 việc theo báo lỗi của Hải 03/11 (ảnh 13:09: đồng hồ 5:00, ticker "05 - AVE MARIA...", ngăn kéo EQ mở):

- **(1) Nút ML mở Media Library.** Khung vẽ TỪ XML: container `MLibrary`, layout `normal` 790×349 (min 354×164, default_visible=0), frame `wasabi.medialibraryframe.nostatusbar` + viền 9 mảnh `ml.frame.layout` + menubar `wasabi.menubar.ml` — như mọi cửa sổ khác. Ruột là **mô phỏng** (XML chỉ có 1 `<component guid:{6B0EDF80-...}>` là component native Winamp, không có trong skin): cây trái (Local Media: Audio/Video/Radio & TV/Tất cả + Playlists: Danh sách hiện tại, kèm số lượng) + danh sách phải (hàng như playlist: tên trái + thời lượng phải, live hiện "Trực tiếp"), dữ liệu = playlist hiện tại (file local đã nạp + radio). Bấm nút cây lọc danh sách; nhấp chọn trong ML; nhấp đúp phát. Đóng bằng nút X trên titlebar ML, nút ML lần nữa, hoặc menu View → Media Library. Mở ML không phá playlist (plListDiv được giữ lại qua lượt vẽ ML). Skin không có ML (vd Classic .wsz) thì báo "Skin này không có cửa sổ Media Library." thay vì mở cửa sổ trống. ML chưa có cột Nghệ sĩ/Album vì model mục playlist không đọc metadata đó (chỉ tên + len).
- **(2) Chọn kênh không cuộn về đầu.** Nguyên nhân: (a) nhấp 1 lần → `refreshPlaylistRows` xóa hết hàng rồi vẽ lại; lúc danh sách trống tức thì scrollHeight co lại → trình duyệt kẹp `scrollTop` về 0; (b) nhấp đúp/bấm nút menu → re-render xóa innerHTML stage → chiều cao trang co lại → `window.scrollY` bị kẹp về 0. Sửa: chụp lại (window.scrollY + scrollTop của list playlist/ML) TRƯỚC khi phá DOM, trả lại SAU khi vẽ xong — ở cả `refreshPlaylistRows` và `swapIn` của renderLayout/renderStacked. Kiểm cả nút Manage Playlist/Add/Rem/Sel/Misc (đi qua cùng đường re-render).
- **(3) Đồng hồ playlist (PLTime, góc dưới-phải playlist):** 1 ô duy nhất như Winamp thật (changelog Winamp 5.531: "Total time display of selected tracks") — đổi nội dung theo lựa chọn: chưa chọn gì (hoặc chọn mục live) → TỔNG thời gian tất cả mục (cộng từ `len` từng mục; mục live không có len thì không cộng); chọn 1 mục → thời gian mục đó. Bài đang phát KHÔNG có số riêng trong cửa sổ playlist của Winamp — thời gian bài đang phát ở đồng hồ cửa sổ chính + nhãn phải hàng đang hát. Bấm nền trống của danh sách để bỏ chọn (về tổng). **Ngoại lệ v10.7 (107):** playlist TOÀN live (tổng = 0) thì hiện thời gian đã phát của mục đang phát thay vì 0:00 chết cứng — xem mục "Đợt v10.7 (107)" ở đầu file (lý do: ảnh Hải 04/11 07:19, main 1:00 mà playlist 0:00).
- **(4) Đồng hồ chính:** trước đây hiện 5:00 (tổng thời gian bài) vì `updateTimerEls` vẽ toàn bộ rec trong 1 vòng await — 1 rec hỏng ném lỗi là cả vòng dừng, đồng hồ đứng yên; đồng thời thumb seek không đồng bộ. Nay: đếm lên từ 0:00 theo `currentTime` (mỗi rec vẽ trong try/catch riêng nên 1 rec hỏng không dừng cả vòng; `demo.t` đồng bộ lúc bắt đầu phát). Bấm vào đồng hồ đổi sang đếm ngược "-M:SS" (vd "-2:15"), bấm nữa về đếm lên; đài live (không có thời lượng) thì luôn đếm lên. Thời lượng đếm ngược lấy theo thứ tự: engine.getDuration() → demo.dur (engine báo mới nhất qua timeupdate) → len của mục đang phát (chỉ khi chưa phát lần nào); đổi bài/dừng thì quên thời lượng bài cũ.
- **(5) Thanh seek:** 2 slider SEEK (`Seeker` + `SeekerGhost`, cùng y=75) nay đồng bộ nhau theo timeupdate (trước đây `setFrac` chỉ gọi lúc kéo nên thumb lệch nhau và lệch nhạc — ảnh 13:09: 2 thumb trắng ở 2 vị trí khác nhau trong khi fill tiến độ ở ~86%). Kéo tua thật qua engine; thả thì thumb ở đúng vị trí thả, lần timeupdate sau đồng bộ tiếp (không kẹt). Đài live (không seek được): kéo thì thumb trả về vị trí thật, không tua, không hỏng thanh.
- **(6) Kéo mép co giãn khung:** 3 tay nắm trên cửa sổ kéo được — mép phải (rộng), mép đáy (cao), góc dưới-phải (cả 2); kéo bằng chuột hoặc chạm (touch/pointer). Giới hạn min/max lấy từ XML: `minimum_w/minimum_h` của layout (thiếu → dùng w/h); max từ `maximum_w/maximum_h` nếu có, không thì kẹp chung 1600×1200 của Amp (skin 566 không có maximum nào). Kéo được: playlist (min 354×164), Media Library (354×164), cửa sổ Video/Hiệu ứng rời (354×164, lấy min của layout Video/AVS). Cửa sổ chính KHÔNG kéo được: minimum == w/h (354×280, Winamp thật cũng cố định). Mép trái/trên không kéo được vì các cửa sổ xếp chồng/dính nhau (Winamp desktop cho kéo vì cửa sổ nổi tự do). Lúc kéo chỉ đổi kích thước hộp + stage (xem trước); thả thì vẽ lại nội dung theo kích thước mới + lưu `localStorage amp9-winsize-v9` (theo từng cửa sổ), mở lại giữ nguyên.
- **Sửa thêm khi kiểm chứng:** (a) render đồng thời làm nhân đôi registry — `setPlaylistData`/`setPlaylistItems` gọi `requestRerender()` trong lúc `renderCurrent` đang chạy → 2 lần `renderStacked` xen nhau, lượt merge của lần cũ gộp nhầm registry của lần mới → timerEls/SEEK nhân đôi (timer cập nhật 2 lần). Nay các lần render cấp cao nhất xếp hàng (queue) — lần sau chờ lần trước xong mới chạy. (b) `layoutMinMax`/`effectiveLayoutWH` bỏ fallback `RES.layouts[layoutId]` (model có layout trần id="normal" không thuộc container nào — fallback lấy nhầm min/max của layout lạ).

**Chưa kiểm được trên trình duyệt thật (đợt A):** headless Chrome trong môi trường này KHÔNG khởi động được (`Hatch WebGL domain policy is required for browser startup`, thử lại 03/11 — server http chạy bình thường, Chrome lỗi) nên các phần sau chỉ có test jsdom, chưa có số đo trình duyệt: ML mở thật trên trang, bấm chọn kênh đo scrollY trước/sau, đồng hồ đếm lên/đếm ngược + seek kéo thả trên trình duyệt thật. Cần test trên điện thoại thật của Hải hoặc chạy lại headless ở máy khác.

## Đợt B (9.9 — đã bump + đóng zip)

3 việc "để sau" nay làm luôn (test mới `~/workspace/amp-v9-verify/vis-options-songinfo-test.js`, 147 test; tổng jsdom **1642 PASS, 0 FAIL**):

### (1) Vis theo nhạc thật qua AnalyserNode khi EQ bật

- Cơ chế: audio.js đã có AnalyserNode sau master (đợt E) + đăng ký với renderer qua `onAnalyser`/`setAvsAnalyser`; đợt B nối nốt đầu ra: `drawVisStatic` đọc `getByteFrequencyData` mỗi frame rAF (vòng vis chạy khi AVS mở **HOẶC đang phát** — trước đây chỉ khi AVS mở nên vis cửa sổ chính đứng yên 1 khung tĩnh khi AVS đóng), 16 cột theo bin tần số, màu cột từ XML `<vis>` ColorBand1..16 (kiểm lại đợt B: vẫn đúng — skin 566 toàn trắng `rgb(255,255,255)`; VIS_Prev/Next đổi sang 2 màu còn lại).
- 3 chế độ (không bịa tín hiệu — `getVisFrame()` ghi lại mode/khung vẽ gần nhất cho test):
  - **real**: EQ BẬT + analyser có tín hiệu (maxBin ≥ 4) → cột theo nhạc thật, cả vis cửa sổ chính lẫn canvas AVS. Đài live qua EQ bật + CORS OK cũng theo nhạc.
  - **flat**: EQ BẬT + analyser im (maxBin < 4) → cột phẳng 2px ở đáy (vis IM, đúng trạng thái: đài không CORS nên câm tiếng khi EQ bật, hoặc đang tạm dừng). Khác đợt K (9.7) vẽ vạch mẫu khi analyser im — vạch mẫu nhảy múa trong khi không có tiếng là giả vờ có nhạc nên đợt B đổi thành phẳng.
  - **sample**: EQ TẮT (tiếng đi thẳng loa, analyser không có tín hiệu để đọc — analyser nằm sau master, EQ tắt thì source nối thẳng destination) hoặc chưa có analyser/graph → vạch mẫu sine như WACUP hiện khi dừng. Đây là **MẪU TRANG TRÍ**, không phải hiệu ứng theo nhạc.
  - Chuyển EQ bật/tắt giữa chừng: vis đổi theo đúng trạng thái (bật → real/flat theo tín hiệu; tắt → sample).
- Chưa kiểm trên trình duyệt thật: jsdom chỉ kiểm logic (analyser fake đọc đúng dữ liệu đưa vào, canvas 2d stub ghi `fillRect`); vis theo nhạc thật khi EQ bật + đài có CORS cần test trên điện thoại thật.

### (2) Options nối hành vi thật

- Đọc từ model: mọi mục tra theo phần tên sau `;` của cfgattrib (vd `{GUID};Show Menus in Main Window`), quét `RES.groupdefs` lúc chạy (`cfgAttribBySuffix`, có cache) — không hardcode GUID, skin khác dùng cùng tên mục vẫn nối được. **Lỗi bắt được khi kiểm chứng:** bản đầu dùng `indexOf(...) === at.length - suffix.length - 1` để khớp hậu tố — `indexOf` trả `-1` khi không khớp mà `at.length === suffix.length` thì vế phải cũng `= -1` nên khớp oan (default "Animate Video/Vis Drawer..." gán nhầm cho slider "Crossfade time" vì 2 chuỗi cùng dài 53 ký tự); đã sửa thành so hậu tố trực tiếp (slice/endsWith) + test mặc định khóa lại.
- Mặc định khi skin không quy định (MAKI gốc đặt mặc định lúc chạy, Amp không chạy MAKI): chọn theo hành vi mặc định của Winamp 5.66 Modern — menubar hiện, ngăn kéo trượt mượt, AVS mở phía trên main (main lùi 116 — đúng hành vi hiện tại của Amp), ticker cuộn kiểu Modern, cửa sổ Video/Vis nhúng (không tách rời), notifier hiện luôn, crossfade tắt. Lưu/khôi qua localStorage `amp9-cfg-v9` (`getCfgState`/`restoreCfgState`, callback `onCfgChange` ở index.html; chỉ mục Options — Shuffle/Repeat/EQ đã có trong state phát `amp9-play-v9` nên không lưu trùng).
- Đã nối thật (bấm → hành vi đổi, có test):
  - **Show Menus in Main Window / Playlist Editor / Media Library** → ẩn/hiện menubar từng cửa sổ (gỡ hộp `menu.group[.pl/.ml]` khỏi DOM; các mục còn lại không dời, chỉ để lại nền skin ở dải menubar).
  - **Animate Config Drawer** → tắt thì mở/đóng ngăn kéo tức thì (không trượt 250ms); bật thì trượt như cũ.
  - **Animate Video/Vis Drawer** → tắt thì AVS mở/đóng tức thì (tắt transition height của `.stage`/`#stage-wrap` trong lần render chỉ đổi AVS; mở ngăn kéo vẫn trượt mượt theo tùy chọn của nó — theo dõi trạng thái AVS + ngăn kéo lần render trước trong `renderCurrent`).
  - **Detach Vis/Video Window** → bật thì tách rời ngay nếu AVS đang mở ở chế độ đó; mở AVS sau thì mở thẳng dạng rời; tắt thì gắn lại.
  - **Songticker 3 chế độ** (cuộn thật): Disabled (không cuộn, hiện đầu chữ), Modern (cuộn mượt 30px/s, dừng 1s ở cuối rồi về đầu), Classic (cuộn đều, hết chữ nhảy ngay về đầu); chỉ cuộn khi đang phát + chữ dài hơn hộp; dừng phát thì về đầu.
  - **Nút Video/Vis** (`videoavs.open`) theo visbutton: Open Context Menu → mở menu Video/Vis (13 mục, xem mục Đợt v10.8 việc 8); Open Configuration → mở ngăn kéo ở tab Options, trang visbutton; không chọn gì → mở/đóng AVS như trước (mặc định). Lưu ý: chọn 1 trong 2 radio rồi thì chỉ đổi qua lại giữa 2 mục (radio không tắt được — giống Winamp thật); hành vi mở/đóng chỉ còn là mặc định lúc mới nạp.
  - **Open Video/Vis from the top / from the bottom** — **đã nối ở v10.8** (xem mục Đợt v10.8 việc 9): from-bottom thì AVS dưới main, ngăn kéo dưới AVS (main → AVS → ngăn kéo); from-top (mặc định) thì AVS trên main lùi 116 như trước.
  - **Enable Beat Visualization** — **đã nối ở v10.8** (xem mục Đợt v10.8 việc 9): nhóm beat đã vẽ từ đợt D 9.9 (filmstrip 15 khung theo bass thật); v10.8 sửa BUG `var suf` hoisting trong `toggleCfg` khiến checkbox không đồng bộ `beatVisOn` — nay tick đổi thì nhóm hiện/ẩn thật.
- Chưa nối (báo rõ — tick vẫn lưu đúng giá trị đã chọn, hành vi chưa theo; không bịa hành vi; xem thêm mục Đợt v10.8 việc 9):
  - **Bypass setting to keep in screen**: Amp không có kéo-thả di chuyển cửa sổ tự do (cửa sổ xếp chồng cố định, chỉ kéo mép co giãn) nên không có gì để "giữ trong màn hình"; làm tiếp khi nào có kéo di chuyển cửa sổ.
  - **Link Position and Width / Link Position, Unlink Width / Unlink Position and Width** (winshade): shade ở Amp là layout swap của cùng 1 stage (không có cửa sổ shade riêng với vị trí/kích thước riêng) nên link/unlink không có gì để nối; làm tiếp: tách geometry shade riêng.
  - **Notifications** (Show always / Show with windowshade... / Show only when minimized / Never show / Disable in fullscreen + 3 slider fade/hold): Amp chưa có popup notifier (thư mục `notifier/` trong skin chưa được vẽ); làm tiếp: vẽ popup theo `notifier/*.png` + dùng các giá trị này (hiện/ẩn theo chế độ + thời gian fade/hold).
  - **Enable crossfading + Crossfade time**: ~~engine chỉ có 1 thẻ `<audio>`/`<video>` nên không overlap 2 bài được; số giây + tick chỉ lưu trạng thái (CFDisplay vẫn hiện số giây); làm tiếp: engine 2 thẻ audio + ramp gain (crossfade thật)~~ — **đã làm ở ĐỢT 4** (engine 2 thẻ audio A/B + ramp gain, mặc định 2s, chỉnh trong menu ⋯ Tắt/1s/2s/4s — xem mục Đợt 4 (5)); tick + số giây trong ngăn kéo Options vẫn lưu trạng thái (đồng bộ với menu ⋯), CFDisplay vẫn hiện số giây.

### (3) KBPS/KHZ đo thật

- **KHZ**: audio.js thêm `getSampleRate()` (`ctx.sampleRate`) + `getState().sampleRate`; renderer hiện `Math.round(sampleRate/1000)` (44100 → "44", 48000 → "48") khi graph EQ đã tạo (lần phát đầu với EQ bật — `ensureGraph` trong `playItem`/`setEqOn`); chưa có graph thì hiện "44" demo (ghi rõ demo, không bịa thành số đo). Tắt EQ không hủy graph nên KHZ vẫn hiện số thật — đúng vì đó là sample rate của **THIẾT BỊ** (không đổi khi bypass). LƯU Ý: đây là rate của thiết bị, không phải của file — trình duyệt không cho đọc sample rate của file qua thẻ media; muốn đúng file thì parse header (đợt sau).
- **KBPS file local**: trung bình thật = `fileSize×8/len/1000` (vd 800000 byte / 200s → 32 kbps); `addLocalFiles` giữ lại `fileSize` của File; `len` từ probe/metadata/engine (`demo.dur` chỉ dùng khi đang phát — không phát thì có thể là của bài cũ). Đài live / file chưa biết len → hiện "128" demo: luồng HLS/MP3 không báo bitrate nên không đo được (không bịa). Ô Bitrate/Frequency đăng ký vào `infoEls` để `updateInfoEls` vẽ lại khi có số mới (đổi bài, metadata về, EQ bật làm graph xuất hiện).
- Test: KHZ 48000 → "48" / 44100 → "44" (`khzDemo` false), chưa có graph → demo; KBPS 800000B/200s → "32", radio → demo 128, file chưa biết len → demo 128.

**Chưa kiểm được trên trình duyệt thật (đợt B):** headless Chrome không chạy được trong sandbox này (như đợt A) nên vis theo nhạc thật, ticker cuộn, Options (menubar ẩn/hiện, AVS tức thì...) và KHZ/KBPS trên trang thật cần test trên điện thoại thật của Hải.

## Đợt C (9.9 — đã bump + đóng zip)

Nạp nhiều skin — Hải chốt "bắt buộc load xml và dùng từ xml của mỗi skin". Gốc: 4 ảnh 13:45–13:47 ngày 3/11 ("Load thử 1 số skin nó không dựng được đúng"). File skin Hải thử KHÔNG có trong máy nên sửa theo code + tự tạo skin tổng hợp kiểm chứng (`.wal` tối thiểu trong `~/workspace/amp-v9-verify/synth/`, không đưa vào gói giao). Test mới `~/workspace/amp-v9-verify/multi-skin-test.js`, 59 test; tổng jsdom **1701 PASS, 0 FAIL** (1642 cũ + 59 mới).

### Triệu chứng → nguyên nhân (đã xác nhận bằng probe, không đoán)

- **(1) Lỗi đỏ "Không tìm được layout 'normal' của 'main'." + 2 bộ thanh trượt EQ nổi trên nền đen (ảnh 13:47).** Nguyên nhân: loader tra layout ĐÚNG CHỮ (`Main`/`Normal` trong XML thì tra `main`/`normal` không thấy — Winamp không phân biệt hoa/thường ở id) và không có fallback; đồng thời alias trần `layouts["normal"]` từng làm `renderLayout("main","normal")` vẽ nhầm layout của container khác (vd Pledit 436×164) khi main thiếu layout — nên skin lỗi vẫn vẽ ra "cái gì đó" (gồm ngăn kéo EQ) thay vì dừng sạch. Sửa: xem quy tắc fallback bên dưới + lỗi không hỗ trợ (mã `SKIN_UNSUPPORTED`) + giữ skin cũ (index.html `bootSkin` chụp lại RES/SKIN/renderer/audioEngine trước khi thay, lỗi thì trả lại y nguyên + banner "skin này không dùng được, vẫn giữ skin '…'"). Ngăn kéo chỉ vẽ khi cửa sổ chính vẽ được (nó là 1 instance trong layout chính, không có đường vẽ riêng); render nguyên tử (vẽ vào div tách rời rồi swapIn) bảo đảm stage thật không bị chạm khi render lỗi.
- **(2) Skin oval cam vẽ 2 lần chồng nhau (ảnh 13:46) + (4) MASSIVE ATTACK vẽ 2 lần, main + ngăn kéo nhân đôi xếp dọc (ảnh 13:45).** Cùng 1 lớp lỗi, 2 đường gây ra — cả 2 đều đã tái hiện bằng probe:
  - (a) `renderStacked` thiếu layout Pledit: `renderLayoutInner("Pledit","normal")` rơi về alias trần `layouts["normal"]` (= layout main, first-wins) nên vẽ main lần 2 vào đúng chỗ playlist, xếp dọc dưới main thật (probe stacked S1/S6 trước sửa: `g.main@[0,200]`, cao 400). Đây là đường chính gây ảnh 2+4 (bản sao cách nhau đúng 1 chiều cao cửa sổ, gồm cả ngăn kéo).
  - (b) Nhóm content có mặt 2 lần: layout vẽ nhóm content qua frame XUI (`NoStatus content="…"`) rồi groupdef của frame lại liệt kê tiếp instance cùng nhóm đó → vẽ 2 lần (probe S9 trước sửa: `g.main` ×2 ở cùng y=18). Instance liệt kê lặp y hệt trong layout cũng vẽ 2 lần (probe S4: 3 instance → 3 bản).
  - Sửa: bỏ hẳn alias trần; thiếu layout Pledit/MLibrary khi xếp chồng thì BỎ QUA cửa sổ đó (ghi console), không vẽ main thay, không ném lỗi mất cả main; chống vẽ trùng (bên dưới).
- **(3) Skin cam/đen vẽ nhỏ ở góc trên-phải, sai kích thước/vị trí (ảnh 13:46).** Nguyên nhân: (a) alias trần làm main vẽ nhầm layout của container khác (vd notifier 128×80 / albumart 164×164 → cửa sổ tí hon); (b) layout thiếu `w`/`h` thì loader về thẳng 354×280 mặc định thay vì `default_w`/`default_h` của container (probe S7: skin 500×200 vẽ thành 354×200); (c) loader gán mọi layout trong file nhiều container về container ĐẦU TIÊN trong file (`dc[0]`) nên layout sau trùng khóa thì mất hẳn (probe S6: `Pledit|normal` biến mất). Sửa: tra đúng layout của đúng container (bên dưới) + w/h lấy từ entry loader (đã gồm default của container) + container xác định theo tổ tiên `<container>` → đồ thị include → file chỉ có đúng 1 container (không đoán `dc[0]`).

### Quy tắc bắt buộc (đợt C — ghi để đợt sau không phá lại)

- **Tìm layout (`renderer.resolveLayout`, `skin-loader.findLayout`):** tra không phân biệt hoa/thường. Thứ tự: (1) đúng `(container, layoutId)`; (2) layout khác trong CÙNG container (layout đầu tiên theo thứ tự XML — vd main chỉ có `shade` thì vẽ `shade` thay `normal`); (3) chỉ khi container là `main`: layout cùng id ở container khác mà KHÔNG phải cửa sổ phụ đã biết (Pledit/MLibrary/Video/AVS/notifier/albumart) — vd container chính tên `player`; (4) không có → `null` → lỗi `SKIN_UNSUPPORTED`, không vẽ layout lạ. Cửa sổ phụ (Pledit/MLibrary/Video/AVS) chỉ tra đúng `(container, layoutId)` — thiếu thì bỏ qua cửa sổ đó khi xếp chồng, không fallback.
- **Khóa layout trong model:** `layouts` ghi 2 khóa cùng trỏ 1 entry — khóa thường (`main|normal`) + khóa đúng chữ trong XML (`MLibrary|normal`, tương thích code/test cũ). KHÔNG còn alias trần `layouts[layoutId]`. Entry có thêm `container`, `layoutId`, `key` (khóa thường), `order` (thứ tự XML); `RES.layoutList` (mảng entry theo thứ tự XML) + `RES.containers` (mọi `<container>`: id/name/default_x/default_y/default_w/default_h/default_visible, khóa thường, first-wins).
- **Kích thước:** stage lấy `w`/`h` từ entry loader — thứ tự: thuộc tính `w`/`h` của layout → `default_w`/`default_h` của container → 354×280. Không đọc lại `intAttr(w,354)` từ XML ở renderer (từng làm skin 500×200 vẽ thành 354). Rộng stage xếp chồng = rộng nhất trong các cửa sổ theo XML của skin đang nạp (main + playlist + ML), không gán cứng 354 của 566. Khóa `winSizes` theo đúng chữ trong XML của entry (vd `Pledit|normal`) để size đã kéo không mất khi tra khác chữ, đồng thời giữ hợp đồng cũ với `localStorage amp9-winsize-v9`.
- **Vị trí:** Amp xếp chồng dọc trên điện thoại 360px (quyết 3/11) nên `default_x`/`default_y` của container KHÔNG áp làm vị trí tuyệt đối — chỉ ghi lại vào `RES.containers` (để dùng sau cho chế độ cửa sổ rời) và dùng `default_w`/`default_h` làm w/h khi layout thiếu. Vị trí trong chồng = thứ tự main → playlist → ML, offset theo chiều cao cửa sổ trên.
- **Chống vẽ trùng (mỗi cửa sổ chỉ vẽ đúng 1 lần):** (a) `_seenGroups` trên ctx (chia sẻ qua cả lượt player/playlist/ML trong 1 lần xếp chồng): instance `<group>` nào đã vẽ ở cùng vị trí tuyệt đối + cùng cỡ thì bỏ lần sau — áp cho instance liệt kê lặp, include lặp, groupdef trùng tên (loader đã first-wins ở groupdef, nhưng instance lặp trong cây vẫn vẽ 2 lần). Chỉ áp cho `<group>` (nút Minimize/Close của 566 liệt kê 2 lần là `<button>` inactive/active, không thuộc diện này; 2 streak titlebar trái/phải cùng gid nhưng khác x nên vẫn vẽ đủ 2). (b) Nhánh frame XUI bỏ instance nhóm content trong groupdef của frame (`_skipGroupId` — content đã vẽ qua `cdiv`).
- **Giữ skin cũ:** `bootSkin` lỗi ở bất cứ bước nào → trả lại RES/SKIN/renderer/audioEngine/shadeMode cũ + tính lại zoom theo stage cũ, banner đỏ báo rõ "skin này không dùng được, vẫn giữ skin '…'". KHÔNG ghi đè `stage.innerHTML` khi khôi phục (sẽ phá handler onclick + registry trỏ vào node cũ của renderer cũ — render nguyên tử đã bảo đảm stage không bị chạm khi lỗi).

### Skin test tổng hợp đã dùng (synth/, probe trước/sau sửa)

| Skin | Cấu trúc | Trước sửa | Sau sửa |
|---|---|---|---|
| s1-size500 | main\|normal 500×200 | xếp chồng vẽ main ×2 (cao 400) | main ×1, cao 200, stage 500×200 |
| s2-case | container `Main`, layout `Normal` 400×150 | ném lỗi không tìm được layout | vẽ 400×150 |
| s3-shade-only | main chỉ có layout `shade` 300×25 | ném lỗi | fallback same-container, vẽ 300×25 |
| s4-dup-instance | 1 group liệt kê 3 lần (y=0, y=150, y=0) | vẽ 3 bản | vẽ 2 (bản trùng y=0 bỏ) |
| s5-dup-include | include 1 file 2 lần + groupdef trùng tên | vẽ 1 (loader first-wins đã đúng) | vẽ 1, groupdef lấy bản đầu (354, không phải 999) |
| s6-multi-container-one-file | main + Pledit trong 1 file | `Pledit\|normal` mất; xếp chồng vẽ main ×2 | đủ 2 layout; xếp chồng main 1 + playlist 1, 500×364 |
| s7-defaultxy | layout không w/h, container default 500×200, default_x/y 40/30 | stage 354×200 | stage 500×200; default_x/y chỉ ghi lại, không áp vị trí |
| s8-no-main-layout | chỉ có Pledit\|normal | vẽ nhầm playlist thay main (436×164), không lỗi | `SKIN_UNSUPPORTED`, stage trống nguyên |
| s9-frame-dup | nhóm content có cả trong frame groupdef | `g.main` ×2 | ×1 |
| s10-no-layout | không có layout nào | ném lỗi chung | `SKIN_UNSUPPORTED` |
| s11-player-container | container chính tên `player`, layout normal 400×150 | ném lỗi | fallback cross-container, vẽ 400×150 |

Hồi quy: winampmodern566.wal (main 354×280, Pledit 436×164, MLibrary 790×349; single drawer 1/main 1, stacked 444 cao, stage rộng 436) + base-2.91.wsz (classic, không layout, render main trả 0) vẫn đúng như trước. `node --check` OK cho index.html (script inline), skin-loader.js, renderer.js, audio.js; harness LOAD OK; version đã bump 9.9 + đóng zip (đợt cuối).

**Chưa kiểm được trên trình duyệt thật (đợt C):** headless Chrome không chạy được trong sandbox này (như đợt A/B) nên các phần sau chỉ có test jsdom, cần test trên điện thoại thật của Hải: (1) nạp lại đúng 4 skin Hải đã thử (file không có trong máy nên chưa đối chiếu trực tiếp ảnh) — đặc biệt skin lỗi đỏ (giữ skin cũ + banner rõ) và skin MASSIVE/oval (không còn nhân đôi khi mở playlist); (2) `bootSkin` giữ skin cũ ở cấp trang (jsdom chỉ kiểm được render lỗi không phá DOM stage — phần khôi phục biến model/renderer trong index.html chưa có test tự động, chỉ kiểm tĩnh có chuỗi "vẫn giữ skin"); (3) skin có instance cùng group ở 2 vị trí KHÁC nhau trong 1 layout (vd y=0 và y=150 — Winamp cũng vẽ 2 lần nên đợt C giữ nguyên cả 2; nếu skin Hải thuộc dạng này thì cần Hải xác nhận có phải nhân đôi lỗi hay cố ý); (4) container `default_x`/`default_y` khác 0 trên desktop Winamp là vị trí cửa sổ nổi — Amp xếp chồng nên chưa áp, nếu sau này có chế độ cửa sổ rời thì dùng `RES.containers`.

## Đợt D (9.9 — đã bump + đóng zip)

Nối nốt các nút/hành vi Winamp còn thiếu (đợt cuối trước khi bump + đóng gói). Test mới `~/workspace/amp-v9-verify/batch-d-test.js`, 108 test; tổng jsdom **1810 PASS, 0 FAIL** (1702 cũ + 108 mới: main 191, drawer 267, playlist 204, avs 215, audio 263, shade 176, page 80, ml-timer-seek-resize 100, vis-options-songinfo 147, multi-skin 59, batch-d 108).

### (1) VID_TV — bật/tắt cửa sổ Video

- `renderer.toggleVideoWindow()` (`renderer.js`): đang mở ở chế độ video thì đóng, chưa mở thì mở video (nhúng trong main với Modern, cửa sổ rời với Classic — theo trạng thái AVS hiện tại). Menu View → "Video" nay là bật/tắt có dấu ✓ (như nút VID_TV).
- Lưu ý: nút `VID_TV` trong XML 566 **bị comment** (`video-normal.xml`, `player-normal-group.xml`) nên skin không vẽ nút này — chỉ nối hành vi + menu View, không tự thêm nút ngoài XML.

### (2) MINIMIZE — thu nhỏ cửa sổ chính

- Web không có cửa sổ hệ thống/taskbar như Winamp desktop nên KHÔNG giả vờ minimize desktop: `index.html` `hideUi()` ẩn giao diện + nút ⋯, hiện nút "Mở lại Amp", **giữ tiếng đang phát** — chung đường với nút X cửa sổ chính (`onPlayerClose`). Bấm "Mở lại Amp" thì hiện lại.
- `renderer.js`: nhánh `MINIMIZE` gọi `onMinimize`, không có thì rơi về `onPlayerClose` (test cả 2 đường).

### (3) VID_MAX / Restore — phóng to/khôi phục cửa sổ Video/Vis rời

- `renderer.setVideoMaximized(on)` (`renderer.js`): phóng to = tách rời trước rồi mới phóng (video nhúng trong main không thể to hơn main — Winamp thật cũng phóng to CỬA SỔ video, không phóng vùng nhúng). Khôi phục chỉ thu nhỏ về cỡ mặc định, VẪN tách rời (không tự gắn lại — muốn gắn lại bấm Reattach). Cỡ phóng to **960×540 là QUYẾT ĐỊNH CỦA AMP** (XML không quy định cỡ maximize; Winamp desktop phóng đầy màn hình — web không có màn hình riêng của cửa sổ nên chọn 960×540, zoom fit của trang sẽ thu lại cho vừa điện thoại). Hằng `VIDEO_MAXIMIZED_W/H` export để test.
- Menu Video có mục "Phóng to cửa sổ"/"Khôi phục cửa sổ" đổi nhãn theo trạng thái; nút `button.vid.max`/`button.vid.restore` trong skin chỉ hiện 1 trong 2 theo trạng thái (như cặp videoavs.open/close).

### (4) VID_Misc / Vis_Menu — menu phụ Video/Vis

- `renderer.videoMenuItems()` (7 mục, nối thật): Giữ tỉ lệ khung hình ✓ (contain/fill qua `objectFit`, mặc định bật), Cỡ thường 1x, Cỡ gấp đôi 2x, Toàn màn hình, Phóng to/Khôi phục cửa sổ, Tách rời/Gắn lại, Đóng Video.
- `renderer.visMenuItems()` (6 mục, nối thật): Hiệu ứng trước/sau (đổi vis variant), Hiệu ứng ngẫu nhiên ✓, Toàn màn hình, Tách rời/Gắn lại, Đóng Hiệu ứng.
- Mục Winamp có mà Amp chưa làm (vd "Video Capture…") thì KHÔNG đưa vào menu — không đưa mục giả.

### (5) trackinfo / trackmenu — thông tin bài + menu bài

- `renderer.getTrackInfoState(idx)` / `showTrackInfo(anchorDiv, idx)` (`renderer.js`): bảng tên/nhóm/link/thời lượng/trạng thái/KBPS/KHZ (mở rộng từ nút info MISC — cùng dữ liệu, thêm KHZ/KBPS đo thật đợt B). Nhấp đúp Songticker (normal + shade) → bảng thông tin; chuột phải ticker/hàng playlist → menu bài.
- `renderer.trackMenuItems(anchorDiv, idx)` (5 mục): Phát bài này / Chọn bài này / Thông tin bài… / Xóa khỏi playlist / Sao chép link (clipboard không có thì mở bảng thông tin để copy tay). **KHÔNG có "Enqueue"** — Amp không có hàng đợi phát, không đưa mục giả.

### (6) WA5:Prefs — Preferences + menubar chính thêm mục con

- `renderer.openPreferences(anchorDiv)` (`renderer.js`): bảng Preferences mô phỏng Winamp (nền `#ECE9D8`, hàng toggle không đóng bảng, hàng "Đóng" cuối). Nối thật: Phát lại (EQ, Pan về giữa, Lặp lại), Video/Hiệu ứng (Video, Vis, Giữ tỉ lệ, Beat), Giao diện (ngăn kéo EQ/Options/Color Themes, Shade, Zoom 1x/fit), Skin (Nạp skin… → mở hộp chọn file `.wal/.zip` của trang). Mục "Chưa nối" ghi rõ trong bảng: kiểu file/CD rip, notifier popup (crossfade thật đã làm ở ĐỢT 4), tìm kiếm toàn thư viện.
- Nhấp đúp vào chỉ báo kênh (stereo/mono, `dblclickaction="WA5:Prefs"` trong XML) → mở Preferences. **Sửa lỗi bắt được khi test:** sprite channels bị thay mới sau ~800ms (`setChannelsState`) làm mất handler nhấp đúp + `pointer-events` → innerHTML đổi sau render (test giu-cu của multi-skin bắt được); nay lưu `dblclick` vào `channelsRec` và gắn lại khi thay sprite.
- Menubar chính: File → Phát file nhạc… / Phát URL… / Nạp skin .wal/.zip… / Đóng Amp; Play → Phát-Tạm dừng / Dừng / Bài trước / Bài sau / Lặp lại (xoay Tắt → Lặp tất cả → Lặp 1 bài, đồng bộ cfg `;Repeat`) / Shuffle ✓; Options → Preferences… / Ngăn kéo EQ-Options-CT / Thu gọn (Shade) ✓; View → Playlist / Media Library / Ngăn kéo / Video / Hiệu ứng / Thu gọn (Shade) ✓; Help → Giới thiệu về Amp… / Hướng dẫn nhanh. Menubar ML (File/View/Help của cửa sổ ML) chưa nối — xem "Còn thiếu".
- `index.html` nối 5 opts mới trong `bootSkin` → `createRenderer`: `onMinimize` (→ `hideUi()` dùng chung với nút X), `onOpenSkinPicker` (→ `fileInput.click()`), `onZoom` (→ `setZoom(mode)`), `isShadeMode` (→ `shadeMode`), `skinInfo: SKIN` (tên/version/tác giả cho About).

### (7) Nút shade — shadeeq / shadect / nowplaying / plshadeMLList / beat

- `renderer.openDrawerTab(tab)` (`renderer.js`): đang ở shade thì về normal trước rồi mới mở ngăn kéo ở tab đó (`onShadeToggle(false)` rồi `onDrawerToggle(true)`; `toggleDrawerAnimated` tự vẽ thẳng khi chưa có ngăn kéo trong DOM).
- `shadeeq` → ngăn kéo tab Equalizer; `shadect` → tab Color Themes; `nowplaying` → bảng thông tin bài đang phát (Winamp thật mở thông tin nghệ sĩ online — Amp không có nguồn đó nên mở bảng thông tin bài, ghi rõ); `plshadeMLList` (PE_ListOfLists) → mở ML; `beatvisualization`/`beatvisualization2` → bật/tắt beat (xem (8)).
- Lưu ý: skin 566 giấu các nút này mặc định (nhóm `shadeX2`/`shadeX3`/`shadetimer` `visible="0"`) nên chỉ skin nào bật nhóm đó mới hiện nút — test jsdom kiểm đường API `openDrawerTab` + spy, chưa kiểm được click DOM trên 566 (ghi rõ trong `batch-d-test.js`).

### (8) about / nowplaying / beatvisualization

- `renderer.openAbout(anchorDiv)`: bảng Amp 10.1 + renderer version + tên/version/tác giả skin đang nạp (qua `skinInfo`); mở từ menu Help → "Giới thiệu về Amp…" và nút About (guid `{d6201408-476a-4308-bf1b-7baca1124b12}`).
- `nowplaying`: mở bảng thông tin bài đang phát (mặc định bài current — `showTrackInfo` không truyền idx thì lấy bài đang phát).
- Beat Visualization: `setBeatVisOn(on)` / `getBeatVisState()` / `getBeatFrame()` — bật/tắt nhóm `player.normal.display.beatvisualization` trong display (nhóm có `visible="0"` trong XML, MAKI gốc ẩn/hiện theo tùy chọn) + đồng bộ tùy chọn Options "Enable Beat Visualization" (checkbox ngăn kéo Options và nút beat là 1 trạng thái). Khung beat (filmstrip 15 khung, ảnh 76×750) đổi theo **bass thật** qua analyser (trung bình 4 bin thấp /255 → khung `round(bass×14)`); không có tín hiệu thì đứng khung 0 — KHÔNG vẽ mẫu giả vờ có nhạc. Chỉ mode "real" (EQ bật + có tín hiệu) mới có bass; flat/sample về khung 0.
- **Nhóm beat đặt tràn mép phải theo đúng XML:** nhóm ở display (200,11), ảnh 167px → mép phải 372, tràn 18px khỏi cửa sổ 354. Skin gốc ship như vậy nên Winamp thật cũng cắt phần tràn ở mép cửa sổ. **Đợt v10.0 đổi cách xử lý:** không còn vẽ thẳng + cắt bằng `overflow:hidden` nữa — nhóm beat bị GỠ KHỎI DOM khi tràn khỏi layout (kéo rộng ≥372 thì hiện lại), vì Winamp thật chỉ hiện beat khi cửa sổ đủ rộng (MAKI). Xem mục Đợt v10.0 (2).

### (9) Menubar chính thêm mục con — xem (6) trên

### (10) PAN — cân bằng trái/phải thật

- `audio.js`: `StereoPannerNode` chèn sau master, trước analyser (`preamp → 10 biquad → master → panner → analyser → destination`); `setPan(v)` / `getPan()` / `applyPan()`; `panValue` mặc định 0.5 (giữa); `getState()` thêm `pan`, `panSupported`, `panApplied`. Không có `createStereoPanner` (trình duyệt cũ/jsdom) thì `panner=null`, `setPan` chỉ lưu giá trị, không ném lỗi.
- `renderer.js`: `applyBalance(v)` / `setBalance(v)` / `getPanState()` ({balance, supported, eqOn, audible}); slider PAN trong ngăn kéo EQ gọi `applyBalance`; Preferences "Pan về giữa" gọi `setBalance(0.5)`; `getPlaybackState()`/`restorePlaybackState()` lưu/khôi `balance`.
- **Giới hạn (như vis): EQ tắt thì Pan không nghe được** — source đi thẳng destination, panner không nằm trên đường tiếng (`panApplied=false`, `audible=false`); giá trị Pan vẫn lưu (node `pan.value` vẫn cập nhật để bật EQ lại là có tiếng ngay). Cần test trên điện thoại thật: kéo Pan trái/phải khi EQ bật thì tiếng dịch thật.

### Chưa kiểm được trên trình duyệt thật (đợt D)

Headless Chrome không chạy được trong sandbox này (như đợt A/B/C) nên các phần sau chỉ có test jsdom, cần test trên điện thoại thật của Hải: (1) nút MINIMIZE trên titlebar (ẩn giao diện, giữ tiếng, nút "Mở lại Amp" hiện); (2) VID_MAX 960×540 trên điện thoại (zoom fit thu lại có vừa không); (3) PAN kéo trái/phải khi EQ bật thì tiếng dịch thật, EQ tắt thì không đổi; (4) beat bars nhảy theo nhạc khi đang phát (khung đổi theo bass thật); (5) Preferences/About/trackinfo/menu con mở đúng vị trí, không tràn màn hình điện thoại; (6) nút shade (shadeeq/shadect/nowplaying) trên skin nào hiện chúng (566 giấu mặc định).

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
  dưới-phải trang) mở menu nhỏ 5 mục: "Nạp skin .wal/.zip…", "Thêm 1 bài
  nhạc…", "Thêm thư mục nhạc…", "Zoom: Cỡ gốc 1x", "Zoom: Vừa màn hình" (dấu ✓ ở chế độ đang
  chọn; bấm ra ngoài thì menu đóng). Đây là những thứ skin không làm
  được (chọn file, đổi zoom trang) — không đưa vào menu skin để khỏi
  xáo trộn renderer, và vẫn bấm được ở cả chế độ shade (menu View của
  skin không có ở shade).
- **Version/check chống mix giữ nguyên cơ chế, nhưng im lặng khi đúng:**
  không còn dòng version thường trực trên màn hình — version chỉ ghi
  vào console (`[Amp] Amp v10.1 · loader v10.1 · audio v10.1 · renderer v10.1
  · eqf v10.1 · classic v10.1 · metadata v10.1 · model fromCache: false · skin: …`)
  và tiêu đề tab trình duyệt ("Amp v10.1 — Winamp Modern"). Chỉ khi lệch version mới hiện **banner
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
  [Amp] Amp v10.1 · loader v10.1 · audio v10.1 · renderer v10.1 · eqf v10.1 · classic v10.1 · metadata v10.1 · model fromCache: false · skin: Winamp Modern
  ```
- **Tiêu đề tab trình duyệt:** "Amp v10.1 — Winamp Modern".

- Cả 6 số phải là **10.1** và `fromCache: false`. Lệch 1 số → trang DỪNG và
  hiện **banner đỏ** ("BẢN MIX — version lệch, dừng lại: …") ngay dưới
  cửa sổ skin (không vẽ giao diện sai trong im lặng). Chụp màn hình
  banner này (hoặc dòng console) là biết đang chạy bản nào.
- Nguồn sự thật duy nhất: `window.AMP_VERSION = "10.1"` đặt trong
  `index.html` trước 6 thẻ script. Mỗi file JS tự đối chiếu với manifest
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
   chữ hướng dẫn); kiểm console phải là `loader v10.1 · audio v10.1 ·
   renderer v10.1 · eqf v10.1 · classic v10.1 · metadata v10.1 · model
   fromCache: false`; không có banner đỏ.
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
5. **Menu ⋯ (góc dưới-phải):** bấm ⋯ → menu nhỏ 5 mục (Nạp skin,
   Thêm 1 bài nhạc, Thêm thư mục nhạc, Zoom 1x, Zoom fit); chọn Zoom fit thì phóng to
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
   436×164 xếp dưới main (ngăn kéo đóng: tổng cao 328; mở: 444); **218 mục
   iptv.m3u, KHÔNG còn bài Demo**; click 1 lần = chọn, **nhấp đúp mới phát**; ô
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
12. **(9.5) Bài Demo đã bỏ:** playlist chỉ còn 218 mục iptv.m3u, không
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
    Kênh Nghệ An (`truyenhinhnghean.vn`, iptv.m3u) vẫn hiện hình như
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
    sau tên bài). **Menu -rem → "Xoá tất cả" (v10.15: dời từ menu List sang menu -rem):** xong vẫn mở lại được
    menu để nạp lại kênh (menu Add "Nguồn mặc định"), vẫn bấm chọn/nhấp đúp được bình thường.
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

- ~~**Nút trong skin có mà chưa nối hành vi:** `VID_TV` (nút TV trong cửa
  sổ Video); `MINIMIZE` (thu nhỏ — web không có cửa sổ hệ thống nên chưa
  làm); `VID_MAX`/`Restore` (phóng to cửa sổ video rời — bấm không làm
  gì); `VID_Misc`/`Vis_Menu` (menu Video/Hiệu ứng — bấm không làm gì);
  `trackinfo`/`trackmenu` (bấm vào tên bài / menu bài hát — chưa làm);
  `WA5:Prefs` (cửa sổ Preferences của Winamp — chưa làm); các nút shade
  (`shadeeq`/`shademl`/`shadect`, `plshadeMLList`…); `about`,
  `nowplaying`, `beatvisualization`.~~ — **đã làm ở đợt D** (xem mục Đợt D). Còn lại: menubar ML (File/View/Help của cửa sổ ML) chưa nối.
- **Menubar trong skin:** playlist đã có File/Playlist/Sort/Help; cửa sổ
  chính dùng nút ⋯ ngoài trang (nạp skin / thêm nhạc / zoom) thay cho
  menubar File/Play/Options/View/Help của Winamp — ~~các mục con kiểu
  File → Play file/Play URL, Options → Preferences… chưa đủ.~~ **đã làm ở đợt D** (File/Play/Options/View/Help đủ mục con, xem mục Đợt D (6)); menubar ML chưa nối.
- **Ngăn kéo Options** (đợt B đã nối thật: Show Menus ×3, Animate Config
  Drawer, Animate Video/Vis Drawer, Detach Vis/Video, ticker 3 chế độ,
  nút Video/Vis theo visbutton — xem mục Đợt B): **chưa nối** — "Open
  Video/Vis from the bottom" (AVS dưới main, đụng dải ngăn kéo), "Bypass
  setting to keep in screen" (không có kéo di chuyển cửa sổ tự do để
  bypass); winshade Link Position/Width ×3 (không có cửa sổ shade riêng);
  Notifications 5 mục + 3 slider (chưa có popup notifier); ~~"Enable Beat
  Visualization" (chưa vẽ beat display)~~ — **đã làm ở đợt D** (beat display theo bass thật, xem mục Đợt D (8)); "Enable crossfading + Crossfade
  time" (~~engine 1 thẻ audio, chưa crossfade thật — mới chỉ đổi số giây
  hiển thị~~) — **đã làm ở ĐỢT 4** (engine 2 thẻ + ramp, xem mục Đợt 4 (5)). Tick của các mục chưa nối vẫn lưu đúng giá trị đã chọn
  (localStorage `amp9-cfg-v9`), hành vi sẽ theo khi làm tiếp.
- **Media Library (đợt A, đã có — xem mục Đợt A):** khung vẽ từ XML
  (`MLibrary` 790×349), ruột mô phỏng (cây Local Media + Playlists,
  danh sách = playlist hiện tại). Chưa có cột Nghệ sĩ/Album (model mục
  không đọc metadata đó) và chưa có tìm kiếm toàn thư viện (ngoài phạm
  vi web); trình duyệt không nhớ file local (đã chốt chọn lại thư mục
  mỗi lần).
- **Chức năng phát khác:** ~~`PAN` (cân bằng trái/phải — slider có trong
  XML, chưa nối hành vi thật);~~ **đã làm ở đợt D** (StereoPannerNode thật khi EQ bật, xem mục Đợt D (10)); chưa có CD rip/burn, playlist thông minh,
  tìm kiếm toàn thư viện (ngoài phạm vi web).

### Để sau (đã chốt, không làm khi người dùng chưa đổi ý)

- ~~Hiệu ứng hình theo nhạc thật (vis hiện vẽ vạch mẫu sine khi analyser
  im; cần nối analyser thật của audio engine)~~ — **đã làm ở đợt B** (3 chế
  độ real/flat/sample — xem mục Đợt B).
- ~~Options nối hành vi thật (xem mục trên)~~ — **đã làm ở đợt B** (đã nối:
  Show Menus ×3, Animate ×2, Detach, ticker, visbutton; còn lại ghi rõ
  trong mục Đợt B).
- ~~KBPS/KHZ đo thật (hiện gán cứng 128/44 demo trong `renderer.js`)~~ —
  **đã làm ở đợt B** (KHZ = sample rate thiết bị; KBPS file local =
  fileSize×8/len/1000; đài live giữ demo 128).

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
  thẳng, vis về vạch mẫu sine — không theo nhạc thật). EQ bật = qua EQ
  chain (biquad + preamp + master, analyser đọc được) — vis theo nhạc
  thật (đợt B), tiếng vẫn phát.
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
- **Menu `VID_Misc`/`Vis_Menu` và `VID_MAX`/`Restore` đã nối ở đợt D** (xem mục Đợt D (3)–(4)) — không còn no-op.
- **MINIMIZE trên web không phải minimize desktop:** ẩn giao diện + nút ⋯, hiện nút "Mở lại Amp", giữ tiếng (xem Đợt D (2)).
- **Phóng to Video 960×540 là quyết định của Amp** (XML không quy định cỡ maximize; Winamp desktop phóng đầy màn hình).
- **PAN chỉ nghe được khi EQ bật** (EQ tắt thì source đi thẳng loa, panner ngoài đường tiếng — `panApplied=false`); giá trị Pan vẫn lưu.
- **Nhóm beat ở 354 KHÔNG còn vẽ tràn** (đợt v10.0 gỡ khỏi DOM khi tràn; kéo rộng ≥372 thì hiện lại) — xem mục Đợt v10.0 (2). Mép phải nội dung beat theo XML là 372 > cửa sổ 354.
- **Menu bài không có "Enqueue"** (Amp không có hàng đợi phát); **menubar ML chưa nối** (File/View/Help của cửa sổ ML).
- **Nút shade (shadeeq/shadect/nowplaying) skin 566 giấu mặc định** (nhóm `shadeX2`/`shadeX3`/`shadetimer` `visible="0"`) — chỉ skin nào bật nhóm đó mới hiện nút.
- **Trình duyệt không nhớ file nhạc local:** mỗi lần chọn lại thư mục
  (nút "Thêm nhạc local…" / Eject).
- Skin Classic: cửa sổ chính chưa vẽ được (chỉ cửa sổ Video/Hiệu ứng
  rời + phát tiếng qua chuỗi EQ).

## Đổi version (cho đợt sau)

Đổi ở 8 chỗ, cùng 1 số (vd 10.0 → 10.1), không sót chỗ nào:

1. `index.html`: `window.AMP_VERSION` + `var VERSION` + `?v=` trên 8 thẻ
   script.
2. `classic.js`: `CLASSIC_VERSION` + `EXPECTED_CLASSIC_VERSION` (mới đợt v10.1).
3. `skin-loader.js`: `LOADER_VERSION` + `EXPECTED_LOADER_VERSION`.
4. `renderer.js`: `RENDERER_VERSION` + `EXPECTED_RENDERER_VERSION`.
5. `audio.js`: `AUDIO_VERSION` (+ `EXPECTED_AUDIO_VERSION`).
6. `eqf.js`: `EQF_VERSION` (+ `EXPECTED_EQF_VERSION`).
7. `metadata.js`: `METADATA_VERSION` (+ `EXPECTED_METADATA_VERSION`).
8. `maki.js`: `MAKI_VERSION` (+ `EXPECTED_MAKI_VERSION`) (mới đợt 7).
   (`skin-browser.js`/`BROWSER_VERSION` đã gỡ hẳn ở đợt 5 — không còn trong danh sách này.)
9. Chạy lại `harness.js` + cả 22 test trong `~/workspace/amp-v9-verify/`
   (phải giữ 2711 PASS, 0 FAIL: main 191, drawer 269, playlist 204, avs
   215, audio 263, shade 176, page 88, ml-timer-seek-resize 100,
   vis-options-songinfo 147, multi-skin 59, batch-d 110, eqf 59,
   zoom-fit 49, local-add 56, avs-vis 33, pill 21, resize 31,
   classic 117, batch4 169, metadata 121, hotkeys-media-session 107,
   maki 126) rồi đóng zip lại.
