# Amp v10.3 — Winamp Modern (đợt v10.3: AVS = Milkdrop thật + ticker trắng đặc + ML load lười + Playlist/EQ Classic + nút Classic nối hành động thật)

Bản phát hành duy nhất: **version 10.3** (đợt v10.3 bump từ 10.2 — sửa `renderer.js`/`audio.js`/`classic.js`/`skin-loader.js`/`metadata.js` + thêm test mới; manifest `window.AMP_VERSION` kiểm lệch thì dừng, báo "BẢN MIX").

## Có gì trong gói

| File | Version | Nội dung |
|---|---|---|
| `index.html` | 10.3 (`window.AMP_VERSION`) | Vỏ trang + toolbar + kiểm version + self-check lúc chạy; **đợt v10.2: hủy engine cũ khi đổi skin (không chồng tiếng)** |
| `classic.js` | CLASSIC_VERSION 10.3 | **MỚI đợt v10.1:** parser skin Classic (.wsz) chuyển từ Webamp fork — đọc `viscolor.txt`/`pledit.txt`/`region.txt`/`genex.bmp`, bảng tọa độ 281 sprite Winamp 2, hình học cửa sổ chính 275×116 + shade 275×14 |
| `skin-loader.js` | LOADER_VERSION 10.3 | Mở `.wal`/`.zip`, đọc XML, gom model (bitmap/font/màu/groupdef/layout), suy `embeddedAvs`, `drawerRestY`, `snapadjustbottom`; `.wsz` không có skin.xml thì parse thật bằng `classic.js` |
| `renderer.js` | RENDERER_VERSION 10.3 | Vẽ cửa sổ chính + shade + ngăn kéo + playlist + AVS/Video (nhúng + cửa sổ rời), EQ/Options/Color Themes, playlist `.m3u`; **đợt v10.1: vẽ cửa sổ chính Classic + shade Classic từ BMP, nút bấm được**; **đợt 4: holder park giữ thẻ video khi đóng cửa sổ (tiếng vẫn phát), vis bấm đổi kiểu bar/sóng/tắt từng vùng, nối Milkdrop**; **đợt v10.2: 17 preset EQ chuẩn Winamp, slider kéo đúng ở tỉ lệ Fit, chỉ báo stereo/mono áp lại sau khi vẽ lại cửa sổ, ticker clip trong khung, fallback vis khi video không có hình** |
| `audio.js` | AUDIO_VERSION 10.3 | Phát tiếng thật: native trước, HLS sau 6s/lỗi; chuỗi EQ (preamp + 10 biquad + master + analyser); MediaElementSource mỗi thẻ 1 lần; **đợt 4: crossfade trộn bài bằng engine 2 thẻ audio (A/B) + ramp gain, mặc định 2s**; **đợt v10.2: preamp map theo dB (0,5 = 0 dB), dải đầu lowshelf/dải cuối highshelf, limiter chống clip, watchdog radio lặng + HLS tự hồi + fallback CORS khi bật EQ, EQ off nhả hẳn về thẻ native mới, destroy() hủy engine cũ** |
| `milkdrop.js` | MILKDROP_VERSION 10.3 | **MỚI đợt 4:** Milkdrop/butterchurn — nạp `butterchurn@2.6.7` + `butterchurn-presets@2.4.7` qua CDN lúc chạy (lazy, chỉ khi bật), preset mặc định qua URL, fallback preset nhúng sẵn; canvas gắn vào hộp AVS thay vis thường; **đợt v10.2: reset() để đổi skin xong bật lại đúng với ctx/analyser mới** |
| `eqf.js` | EQF_VERSION 10.3 | Đọc/ghi preset EQ Winamp `.eqf`/`.q1` (header v1.1, 268B/preset) + map sang 10 dải + preamp của Amp (đợt v10.0) |
| `metadata.js` | METADATA_VERSION 10.3 | **MỚI đợt 5:** đọc tag nhạc local — `music-metadata-browser@2.5.11` qua CDN ESM (dynamic import, dự phòng esm.sh) + parser ID3v2/v1 + FLAC Vorbis comment nhúng sẵn khi CDN chết; ghi title/artist/album/duration vào model mục playlist |
| `maki.js` | MAKI_VERSION 10.3 | **MỚI đợt 7 (giai đoạn a):** parser + inspect script MAKI — đọc file `.maki` của skin (magic `FG`, formatVersion 23), liệt kê method/binding/ẩn-hiện/gán text; CHỈ ĐỌC, không chạy code MAKI (interpreter thật là giai đoạn b, để sau) |
| ~~`skin-browser.js`~~ | ~~BROWSER_VERSION 10.1~~ | **ĐÃ GỠ HẲN ở đợt 5** (xem mục "Đợt 5"): chọn skin từ kho Webamp (GraphQL `skins.webamp.org`, panel `#skin-panel`, menu "Chọn skin từ kho…") bỏ luôn theo chốt của Hải — chỉ giữ "Nạp skin .wal/.zip…" chọn file tay |
| `winampmodern566.wal` | — | Skin Winamp Modern 566 (mặc định, tự nạp lúc mở trang) |
| `base-2.91.wsz` | — | Skin Classic mẫu — **đợt v10.1 vẽ được cửa sổ chính + shade, nút bấm được** (trước đây chỉ phát tiếng qua cửa sổ Video/Hiệu ứng rời) |
| `radio.m3u` | — | Playlist mặc định: 41 kênh radio/TV (không còn bài Demo) (giữ tên + thứ tự gốc) |

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
| `radio.m3u` | — | Playlist mặc định: 41 kênh radio/TV (không còn bài Demo) (giữ tên + thứ tự gốc) |

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
- **Preset lấy từ mạng, KHÔNG đóng gói vào zip:**
  - Lib (lazy-load bằng thẻ `<script>` lúc chạy, chỉ khi bật): `https://cdn.jsdelivr.net/npm/butterchurn@2.6.7/lib/butterchurn.min.js` và `https://cdn.jsdelivr.net/npm/butterchurn-presets@2.4.7/lib/butterchurnPresets.min.js` — đã kiểm sống 03/11 (UMD thật).
  - Preset mặc định dạng **URL** (đã kiểm sống 03/11: HTTP 200, JSON hợp lệ, 3824 byte): `https://cdn.jsdelivr.net/npm/butterchurn-presets@2.4.7/presets/converted/Zylot%20-%20Star%20Ornament.json` — fetch trực tiếp, không tải file về.
  - Fallback: đúng preset đó **nhúng sẵn** trong code (`FALLBACK_PRESET`, 3824 byte minified) — dùng khi fetch URL lỗi VÀ tra kho preset cũng lỗi. CHỈ fallback preset, KHÔNG fallback lib: CDN lib chết thì Milkdrop không chạy được, vis AVS thường ở lại (báo rõ, không crash).
- **Nối vào Amp:** `milkdrop.js` `createMilkdrop({document, window, fetchImpl, getAudioContext, getAnalyser, onStatus})` → `attachTo(wrap)` gắn canvas vào hộp AVS; `renderer.setMilkdropCanvas(canvas)` / `setMilkdropActive(on)` ẩn canvas vis thường và hiện canvas Milkdrop khi AVS ở chế độ vis (đồng thời `drawVisStatic` khỏi vẽ vis thường lên canvas đang ẩn — tiết kiệm CPU); `index.html` thêm mục menu ⋯ "Milkdrop: Bật/Tắt" (`toggleMilkdrop`, lưu `localStorage "amp9-milkdrop-v1"`, khôi phục sau khi nạp trang), `syncMilkdrop()` sau mỗi render (chỉ chạy vòng render khi AVS mở ở chế độ vis + đang phát), `onPlayingChange` nối `setPlaying` + `ensureReady` (bật Milkdrop trước khi phát nhạc lần đầu thì tạo visualizer nốt khi có AudioContext).
- **Giới hạn (ghi rõ):** Milkdrop chỉ "nghe" được nhạc khi **EQ BẬT** (analyser của Amp chỉ có tín hiệu khi tiếng đi qua chuỗi EQ — cùng giới hạn như vis, xem đợt B); EQ tắt thì preset vẫn chạy hình nhưng không theo nhạc. **Tốn GPU/pin trên điện thoại nên MẶC ĐỊNH TẮT** — bật từ menu ⋯ khi cần. butterchurn không có hàm hủy visualizer: tắt chỉ dừng vòng render + ẩn canvas, bật lại dùng tiếp visualizer cũ.
- Kiểm chứng (test D1–D32): hằng CDN/preset, enable nạp lib + tạo visualizer + `loadPreset` đúng preset URL, URL lỗi → library, cả hai lỗi → fallback nhúng sẵn, CDN chết → reject + `libsFailed` (không crash), 3 dạng preset (object/hàm/URL/tên), vòng render chỉ chạy khi enabled + playing + visible, `setSize` đổi cỡ canvas + visualizer.

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
- **(3) Đồng hồ playlist (PLTime, góc dưới-phải playlist):** 1 ô duy nhất như Winamp thật (changelog Winamp 5.531: "Total time display of selected tracks") — đổi nội dung theo lựa chọn: chưa chọn gì (hoặc chọn mục live) → TỔNG thời gian tất cả mục (cộng từ `len` từng mục; mục live không có len thì không cộng); chọn 1 mục → thời gian mục đó. Bài đang phát KHÔNG có số riêng trong cửa sổ playlist của Winamp — thời gian bài đang phát ở đồng hồ cửa sổ chính + nhãn phải hàng đang hát. Bấm nền trống của danh sách để bỏ chọn (về tổng).
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
  - **Nút Video/Vis** (`videoavs.open`) theo visbutton: Open Context Menu → mở menu Video/Vis (Video / Hiệu ứng (Vis) / Tách rời / Đóng); Open Configuration → mở ngăn kéo ở tab Options, trang visbutton; không chọn gì → mở/đóng AVS như trước (mặc định). Lưu ý: chọn 1 trong 2 radio rồi thì chỉ đổi qua lại giữa 2 mục (radio không tắt được — giống Winamp thật); hành vi mở/đóng chỉ còn là mặc định lúc mới nạp.
- Chưa nối (báo rõ — tick vẫn lưu đúng giá trị đã chọn, hành vi chưa theo; không bịa hành vi):
  - **Open Video/Vis from the top / from the bottom**: hiện tại AVS mở phía trên main (main lùi 116) = "from the top"; "from the bottom" (AVS dưới main) chưa làm — cần đổi thứ tự xếp chồng: AVS dưới main sẽ đụng dải nghỉ 13px của ngăn kéo + vị trí ngăn kéo đang tính theo đáy main; làm tiếp: cho AVS + ngăn kéo xếp theo thứ tự main → AVS → ngăn kéo khi chọn from-bottom.
  - **Bypass setting to keep in screen**: Amp không có kéo-thả di chuyển cửa sổ tự do (cửa sổ xếp chồng cố định, chỉ kéo mép co giãn) nên không có gì để "giữ trong màn hình"; làm tiếp khi nào có kéo di chuyển cửa sổ.
  - **Link Position and Width / Link Position, Unlink Width / Unlink Position and Width** (winshade): shade ở Amp là layout swap của cùng 1 stage (không có cửa sổ shade riêng với vị trí/kích thước riêng) nên link/unlink không có gì để nối; làm tiếp: tách geometry shade riêng.
  - **Notifications** (Show always / Show with windowshade... / Show only when minimized / Never show / Disable in fullscreen + 3 slider fade/hold): Amp chưa có popup notifier (thư mục `notifier/` trong skin chưa được vẽ); làm tiếp: vẽ popup theo `notifier/*.png` + dùng các giá trị này (hiện/ẩn theo chế độ + thời gian fade/hold).
  - **Enable Beat Visualization**: renderer chưa vẽ beat display (bitmap `beat_*` trong skin chưa được dùng); làm tiếp: vẽ beat bars theo analyser như vis.
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
