# Amp v9 — Winamp Modern (đợt M = v9.9: ML + đồng hồ chính/playlist + seek + resize mép + vis thật + Options thật + KBPS/KHZ thật + nạp nhiều skin + nối nốt các nút Winamp còn thiếu)

Bản phát hành duy nhất: **version 9.9** (đợt M bump từ 9.8 = đợt A: nút ML mở Media Library, chọn kênh không cuộn về đầu, đồng hồ playlist đủ phần (tổng/chọn), đồng hồ chính đếm lên/đếm ngược khi bấm, kéo seek xong vẫn hoạt động, kéo mép co giãn khung; đợt B: vis theo nhạc thật qua AnalyserNode khi EQ bật (EQ tắt về vạch mẫu), Options nối hành vi thật, KHZ đọc từ AudioContext + KBPS file local tính từ fileSize/len; đợt C: nạp nhiều skin — tra layout không phân biệt hoa/thường + fallback (layout khác cùng container → cross-container → SKIN_UNSUPPORTED giữ skin cũ), bỏ alias trần layouts[layoutId] (hết vẽ trùng + sai kích thước), chống vẽ trùng nhóm content; đợt D: nối VID_TV/MINIMIZE/VID_MAX/VID_Misc/Vis_Menu/trackinfo/trackmenu/WA5:Prefs/nút shade/about/nowplaying/beat + menubar đủ mục con + PAN qua StereoPannerNode. Đợt L bump từ 9.7: TV360 qua vmttv nghe tiếng không thấy hình — isVideoItem nhận diện nguồn TV qua host vmttv.dpdns.org + đường dẫn /tv360/ /VTVGo/ + group chứa "TV"/"Truyền hình" (chỉ xét group, không xét tên bài); lưới an toàn runtime: loadedmetadata mà videoWidth > 0 thì AVS về mode video, videoWidth == 0 thì về vis khỏi màn hình đen; đổi kênh xóa khung hình cũ ngay (video.removeAttribute('src') + load() trước khi gán src mới; video→audio thì xóa hẳn src); kênh video lỗi hẳn thì onAudioError xóa nhãn WxH cũ + về vis; nhập URL .m3u trong form "Thêm URL…" thì fetch về tách kênh bằng parseM3U (link tương đối đổi tuyệt đối theo URL gốc), URL .m3u8/mp3 vẫn thêm 1 mục đơn như cũ; file nhạc local hiện thời lượng thật (m:ss) ở góc phải hàng playlist, chỉ đài live mới hiện "Trực tiếp" (đọc metadata bằng thẻ audio tạm preload="metadata", không phát thử; lúc phát thì lấy duration từ engine); Manage Playlist → "Xóa hết": sửa lỗi closer menu còn armed ăn mất lần mở menu kế tiếp (không nạp lại được kênh) + selected/current về -1 khi danh sách rỗng. Đợt K bump từ 9.6: chỉ báo kênh stereo/mono sáng khi phát; số KBPS/KHZ vẽ nguyên bản không đảo alpha — chữ tối trên viên trắng, hết vệt gạch dưới chân; vis vẽ lại vạch mẫu khi analyser im + cột trắng theo XML; VIDEO/VIS KHÔNG thêm — XML 566 không có chữ đó; sửa self-check AVS 17→35. Đợt J bump từ 9.5: bỏ banner
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
| `index.html` | 9.9 (`window.AMP_VERSION`) | Vỏ trang + toolbar + kiểm version + self-check lúc chạy |
| `skin-loader.js` | LOADER_VERSION 9.9 | Mở `.wal`/`.zip`, đọc XML, gom model (bitmap/font/màu/groupdef/layout), suy `embeddedAvs`, `drawerRestY`, `snapadjustbottom` |
| `renderer.js` | RENDERER_VERSION 9.9 | Vẽ cửa sổ chính + shade + ngăn kéo + playlist + AVS/Video (nhúng + cửa sổ rời), EQ/Options/Color Themes, playlist `.m3u` |
| `audio.js` | AUDIO_VERSION 9.9 | Phát tiếng thật: native trước, HLS sau 6s/lỗi; chuỗi EQ (preamp + 10 biquad + master + analyser); MediaElementSource mỗi thẻ 1 lần |
| `winampmodern566.wal` | — | Skin Winamp Modern 566 (mặc định, tự nạp lúc mở trang) |
| `base-2.91.wsz` | — | Skin Classic mẫu (không có vùng AVS nhúng → chỉ dùng cửa sổ Video/Hiệu ứng rời) |
| `radio.m3u` | — | Playlist mặc định: 41 kênh radio/TV (không còn bài Demo) (giữ tên + thứ tự gốc) |

Kiểm chứng đợt A–L: 8 bộ test jsdom trong `~/workspace/amp-v9-verify/` —
main-window 191 + drawer 266 + playlist 204 + avs 215 + audio 263 +
shade 176 + page 80 + ml-timer-seek-resize 100 = **1495 PASS, 0 FAIL**
(đợt A: playlist 204, thêm bộ ml-timer-seek-resize 100); `harness.js`
LOAD OK; kiểm bằng
Chrome headless thật (CDP): Nghệ An hiện hình 1920x1080 (đo pixel vùng
video: 71,4% đen, 9371 màu riêng); TV360 id=2/id=4 qua vmttv đã xếp đúng
video + thử hls.js nhưng **không đo được hình trong môi trường headless**
(xem ghi chú TV360 ở checklist item 15 — cần test trên điện thoại thật).

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
  - **Enable crossfading + Crossfade time**: engine chỉ có 1 thẻ `<audio>`/`<video>` nên không overlap 2 bài được; số giây + tick chỉ lưu trạng thái (CFDisplay vẫn hiện số giây); làm tiếp: engine 2 thẻ audio + ramp gain (crossfade thật).

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

- `renderer.openPreferences(anchorDiv)` (`renderer.js`): bảng Preferences mô phỏng Winamp (nền `#ECE9D8`, hàng toggle không đóng bảng, hàng "Đóng" cuối). Nối thật: Phát lại (EQ, Pan về giữa, Lặp lại), Video/Hiệu ứng (Video, Vis, Giữ tỉ lệ, Beat), Giao diện (ngăn kéo EQ/Options/Color Themes, Shade, Zoom 1x/fit), Skin (Nạp skin… → mở hộp chọn file `.wal/.zip` của trang). Mục "Chưa nối" ghi rõ trong bảng: kiểu file/CD rip, crossfade thật, notifier popup, tìm kiếm toàn thư viện.
- Nhấp đúp vào chỉ báo kênh (stereo/mono, `dblclickaction="WA5:Prefs"` trong XML) → mở Preferences. **Sửa lỗi bắt được khi test:** sprite channels bị thay mới sau ~800ms (`setChannelsState`) làm mất handler nhấp đúp + `pointer-events` → innerHTML đổi sau render (test giu-cu của multi-skin bắt được); nay lưu `dblclick` vào `channelsRec` và gắn lại khi thay sprite.
- Menubar chính: File → Phát file nhạc… / Phát URL… / Nạp skin .wal/.zip… / Đóng Amp; Play → Phát-Tạm dừng / Dừng / Bài trước / Bài sau / Lặp lại (xoay Tắt → Lặp tất cả → Lặp 1 bài, đồng bộ cfg `;Repeat`) / Shuffle ✓; Options → Preferences… / Ngăn kéo EQ-Options-CT / Thu gọn (Shade) ✓; View → Playlist / Media Library / Ngăn kéo / Video / Hiệu ứng / Thu gọn (Shade) ✓; Help → Giới thiệu về Amp… / Hướng dẫn nhanh. Menubar ML (File/View/Help của cửa sổ ML) chưa nối — xem "Còn thiếu".
- `index.html` nối 5 opts mới trong `bootSkin` → `createRenderer`: `onMinimize` (→ `hideUi()` dùng chung với nút X), `onOpenSkinPicker` (→ `fileInput.click()`), `onZoom` (→ `setZoom(mode)`), `isShadeMode` (→ `shadeMode`), `skinInfo: SKIN` (tên/version/tác giả cho About).

### (7) Nút shade — shadeeq / shadect / nowplaying / plshadeMLList / beat

- `renderer.openDrawerTab(tab)` (`renderer.js`): đang ở shade thì về normal trước rồi mới mở ngăn kéo ở tab đó (`onShadeToggle(false)` rồi `onDrawerToggle(true)`; `toggleDrawerAnimated` tự vẽ thẳng khi chưa có ngăn kéo trong DOM).
- `shadeeq` → ngăn kéo tab Equalizer; `shadect` → tab Color Themes; `nowplaying` → bảng thông tin bài đang phát (Winamp thật mở thông tin nghệ sĩ online — Amp không có nguồn đó nên mở bảng thông tin bài, ghi rõ); `plshadeMLList` (PE_ListOfLists) → mở ML; `beatvisualization`/`beatvisualization2` → bật/tắt beat (xem (8)).
- Lưu ý: skin 566 giấu các nút này mặc định (nhóm `shadeX2`/`shadeX3`/`shadetimer` `visible="0"`) nên chỉ skin nào bật nhóm đó mới hiện nút — test jsdom kiểm đường API `openDrawerTab` + spy, chưa kiểm được click DOM trên 566 (ghi rõ trong `batch-d-test.js`).

### (8) about / nowplaying / beatvisualization

- `renderer.openAbout(anchorDiv)`: bảng Amp 9.9 + renderer version + tên/version/tác giả skin đang nạp (qua `skinInfo`); mở từ menu Help → "Giới thiệu về Amp…" và nút About (guid `{d6201408-476a-4308-bf1b-7baca1124b12}`).
- `nowplaying`: mở bảng thông tin bài đang phát (mặc định bài current — `showTrackInfo` không truyền idx thì lấy bài đang phát).
- Beat Visualization: `setBeatVisOn(on)` / `getBeatVisState()` / `getBeatFrame()` — bật/tắt nhóm `player.normal.display.beatvisualization` trong display (nhóm có `visible="0"` trong XML, MAKI gốc ẩn/hiện theo tùy chọn) + đồng bộ tùy chọn Options "Enable Beat Visualization" (checkbox ngăn kéo Options và nút beat là 1 trạng thái). Khung beat (filmstrip 15 khung, ảnh 76×750) đổi theo **bass thật** qua analyser (trung bình 4 bin thấp /255 → khung `round(bass×14)`); không có tín hiệu thì đứng khung 0 — KHÔNG vẽ mẫu giả vờ có nhạc. Chỉ mode "real" (EQ bật + có tín hiệu) mới có bass; flat/sample về khung 0.
- **Nhóm beat đặt tràn mép phải theo đúng XML:** nhóm ở display (200,11), ảnh 167px → mép phải 372, tràn 18px khỏi cửa sổ 354. Skin gốc ship như vậy nên Winamp thật cũng cắt phần tràn ở mép cửa sổ; stage của Amp có `overflow:hidden` nên cắt y hệt (test drawer-test cho phép riêng 3 ảnh beat tràn phải tới 372, không tràn trên/trái/dưới). Đã thử hướng chỉ hiện nhóm beat khi đang phát để khỏi tràn lúc idle — phải trigger vẽ lại khi đổi trạng thái phát, mà gọi `requestRerender` giữa lúc render đang chạy gây re-entrancy → shade-test/vis-test crash/treo (SIGABRT, ~86s) nên bỏ hướng đó, giữ render thẳng + ngoại lệ tràn có chủ ý (ghi rõ trong code + test).

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
  dưới-phải trang) mở menu nhỏ 4 mục: "Nạp skin .wal/.zip…", "Thêm nhạc
  local…", "Zoom: Cỡ gốc 1x", "Zoom: Vừa màn hình" (dấu ✓ ở chế độ đang
  chọn; bấm ra ngoài thì menu đóng). Đây là những thứ skin không làm
  được (chọn file, đổi zoom trang) — không đưa vào menu skin để khỏi
  xáo trộn renderer, và vẫn bấm được ở cả chế độ shade (menu View của
  skin không có ở shade).
- **Version/check chống mix giữ nguyên cơ chế, nhưng im lặng khi đúng:**
  không còn dòng version thường trực trên màn hình — version chỉ ghi
  vào console (`[Amp] Amp v9 · loader v9.9 · audio v9.9 · renderer v9.9
  · model fromCache: false · skin: …`) và tiêu đề tab trình duyệt
  ("Amp v9.9 — Winamp Modern"). Chỉ khi lệch version mới hiện **banner
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
  [Amp] Amp v9 · loader v9.9 · audio v9.9 · renderer v9.9 · model fromCache: false · skin: Winamp Modern
  ```
- **Tiêu đề tab trình duyệt:** "Amp v9.9 — Winamp Modern".

- Cả 3 số phải là **9.9** và `fromCache: false`. Lệch 1 số → trang DỪNG và
  hiện **banner đỏ** ("BẢN MIX — version lệch, dừng lại: …") ngay dưới
  cửa sổ skin (không vẽ giao diện sai trong im lặng). Chụp màn hình
  banner này (hoặc dòng console) là biết đang chạy bản nào.
- Nguồn sự thật duy nhất: `window.AMP_VERSION = "9.9"` đặt trong
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
   chữ hướng dẫn); kiểm console phải là `loader v9.9 · audio v9.9 ·
   renderer v9.9 · model fromCache: false`; không có banner đỏ.
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
  time" (engine 1 thẻ audio, chưa crossfade thật — mới chỉ đổi số giây
  hiển thị). Tick của các mục chưa nối vẫn lưu đúng giá trị đã chọn
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
- **Nhóm beat tràn 18px mép phải theo đúng XML** (mép 372 > cửa sổ 354) — stage `overflow:hidden` cắt như Winamp thật.
- **Menu bài không có "Enqueue"** (Amp không có hàng đợi phát); **menubar ML chưa nối** (File/View/Help của cửa sổ ML).
- **Nút shade (shadeeq/shadect/nowplaying) skin 566 giấu mặc định** (nhóm `shadeX2`/`shadeX3`/`shadetimer` `visible="0"`) — chỉ skin nào bật nhóm đó mới hiện nút.
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
5. Chạy lại `harness.js` + cả 11 test trong `~/workspace/amp-v9-verify/`
   (phải giữ 1810 PASS, 0 FAIL: main 191, drawer 267, playlist 204, avs
   215, audio 263, shade 176, page 80, ml-timer-seek-resize 100,
   vis-options-songinfo 147, multi-skin 59, batch-d 108) rồi đóng zip lại.
