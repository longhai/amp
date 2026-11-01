# Amp v7.1 — Winamp Modern (.wal) + Classic (.wsz) trong một trình

Amp là trình phát nhạc web nạp skin Winamp trực tiếp từ file gốc của skin,
vẽ bằng HTML/CSS theo đúng kích thước ảnh trong skin. v7.1 sửa 13 mục theo
báo lỗi của bạn trên điện thoại thật (test v7 ngày 1–2/11), giữ nguyên mọi
tính năng v7.

## Mở trang

Mở `index.html`. Skin mặc định là WinampModern566.wal (skin Modern gốc của
Winamp 5.66). Bấm **Nạp skin** để chọn file `.wal`, `.zip` hoặc `.wsz` trên máy.
Kéo-thả file skin vào trang cũng được. Skin đã nạp được lưu vào bộ nhớ đệm
(IndexedDB) để lần sau mở nhanh, không tải lại. **Mới ở v7.1:** khóa bộ nhớ
đệm giờ gắn với phiên bản loader (`tên file|7.1`) nên lên bản mới là parse
lại skin từ đầu — bản v7 cũ dùng khóa `|7` nên parse cũ không còn dùng được
nữa (trước đây lên bản mới vẫn đọc nhầm parse cũ đã lưu).

## Mới ở v7.1 (theo báo lỗi trên điện thoại thật)

1. **Songinfo: bitrate + tần số của file nhạc máy.** Trước đây màn hình
   không bao giờ hiện "128 kbps / 44 kHz" vì không có code nào điền hai số
   đó. Giờ với file local: bitrate = dung lượng file × 8 ÷ thời lượng
   (làm tròn kbps), tần số đọc từ header file — FLAC STREAMINFO (20-bit),
   MP3 frame header, WAV fmt chunk — không đoán từ `AudioContext.sampleRate`
   (đó là tốc độ đầu ra, không phải của file). Vẽ bằng font bitmap của skin
   đúng vị trí songinfo trong XML (WinampModern566: Bitrate 116,17,
   Frequency 167,17). Cập nhật khi nạp file mới và khi `loadedmetadata`
   xong; đổi kênh radio thì xóa về chỗ trống `(___)`/`(__)`, không bịa số.
   Kiểm headless: mp3 129 kbps/44100 Hz, WAV 1411 kbps, WAV 48 kHz hiện "48",
   FLAC 106 kbps/44100 Hz — khớp số tính từ file.
2. **Ảnh bìa cho file FLAC.** Trước đây chỉ đọc APIC của mp3 (256 KB đầu).
   Giờ đọc khối PICTURE (type 6, ưu tiên type 3 front cover) trong metadata
   FLAC, quét đúng từng khối metadata tới cờ khối cuối, đọc tối đa 1 MB đầu.
   Sửa kèm: mp3 ID3v2.4 của ffmpeg dùng kích thước frame synchsafe (bản cũ
   đọc sai nên có file mp3 có bìa mà không hiện). Không có ảnh nhúng thì vẫn
   giữ ảnh mặc định của skin. Kiểm headless: FLAC có bìa 64×64 hiện đúng
   ảnh đỏ/xanh test, FLAC không bìa về ảnh mặc định, mp3 APIC vẫn chạy.
3. **EQ của CROSSNET có lại ảnh nền.** Cửa sổ EQ trước đây không bao giờ vẽ
   `eq.backgroundFile` làm nền (cửa sổ chính và Playlist thì có vẽ). Giờ vẽ
   như cửa sổ chính, bỏ lớp Background trùng. Kiểm headless với file
   `.wal` thật của REDKiller: EQ 294x214/20 nút, nền 212x121 hiện sau 10
   dải + preamp + ON/AUTO/PRESETS; cửa sổ EQ 82,8% điểm ảnh không đen.
4. **Azumanga có lại nền xanh.** Cùng một lỗi loader với mục 3: định nghĩa
   `<bitmap>` có `x`/`y` nhưng không có `w`/`h` bị ghi crop
   `{x:0,y:0,w:0,h:0}` khiến ảnh nền trả về URL rỗng. Giờ chỉ ghi crop khi
   `w>0 && h>0`. Ảnh `player/main_bg.png` (400x360) hiện lại; đo headless
   19,2% điểm ảnh xanh đậm trong cửa sổ chính. Hai điều KHÔNG phải lỗi,
   giữ nguyên: góc trắng quanh ảnh tròn là ảnh gốc của skin (`pic1.jpg`
   không có trong suốt); cửa sổ EQ hiện dưới Azumanga là bản dự phòng vì
   Azumanga không có cửa sổ EQ riêng (EQ của nó nằm trong cửa sổ chính,
   bấm nút oval "eq" mới hiện).
5. **Phổ nhạc (Visualizer) vẽ như Webamp.** Trước đây mỗi cột một màu đặc
   theo chiều cao (cao là đỏ hết). Giờ vẽ theo `BarPaintHandler` của Webamp
   (fork, `VisPainter.ts`): gradient dọc từ màu `viscolor.txt` của skin
   (đỏ trên → vàng → xanh lá dưới, neo ở đáy cột nên cột thấp chỉ hiện
   xanh), cộng vạch đỉnh (peak-hold) màu `viscolor[23]` rơi chậm. Áp dụng
   cả cho phổ lớn trong cửa sổ VISUALIZER (32 cột) và phổ nhỏ trong màn
   hình chính (24 cột). Chế độ màu 1/2 (Prev/Next) vẫn giữ, mặc định là
   mode 0 (gradient viscolor). Kiểm headless: một cột cao có 36–37 màu
   khác nhau xếp dọc (xanh dưới, đỏ trên), vạch đỉnh 782–841 px.
6. **Tab EQ trong ngăn CONFIG giờ là EQ thật, không còn là ảnh.** Trước
   đây tab EQ vẽ nguyên tấm nền EQ (ảnh tĩnh, không kéo được) nên trên màn
   hình có 2 cái EQ. Giờ tab EQ vẽ đúng nhóm EQ của skin ở vị trí gốc
   (WinampModern566: 318x89 tại 3,15): nền + lớp chữ tối + dải dưới y=82
   + nhãn tần số (31.5, 63, 125, 250, 500, 1K, 2K, 4K, 8K, 16K, ảnh crop
   từ `eq_labels.png`) + 11 thanh trượt thật (preamp + 10 dải, ảnh thumb
   của skin) + nút ON/AUTO/PRESETS (ảnh của skin). Thanh trượt trong ngăn
   kéo và thanh trượt trong cửa sổ EQ độc lập dùng chung một `eqState`:
   kéo bên nào thì bên kia chạy theo, preset đổi cả hai, nút ON trong ngăn
   kéo bật/tắt EQ thật (đèn LED cạnh nút sáng theo). Hàng "EQ: BẬT/TẮT" cũ
   bỏ (nút ON làm việc đó rồi); hàng "Mở cửa sổ EQ đầy đủ ›" giữ lại
   thành link nhỏ ở góc phải hàng tab dưới cùng (trong tab EQ không còn
   chỗ trống cho một hàng riêng — panel 89px đã chiếm hết ngăn kéo).
   Không làm: thanh Balance và Crossfade trong nhóm EQ (chưa có đường
   tiếng / tính năng tương ứng), các nút EQ_p12/EQ_0/EQ_m12 không ảnh.
   Kiểm headless 20/20: panel đúng vị trí, 11 thanh trượt đúng x=82,
   134…296, kéo thanh drawer thì thanh cửa sổ EQ chạy theo và ngược lại,
   preset Rock đổi cả hai, bấm ON bật/tắt EQ + đèn sáng, đổi tab rồi quay
   lại panel vẽ lại đúng 1 lần và giữ nguyên giá trị.
7. **Kéo to nhỏ Playlist không còn đè nút.** Trước đây kéo Playlist cao
   lên chỉ giãn danh sách, nút Add/Rem/Sel/Misc đứng yên giữa danh sách
   đè lên hàng 22–23. Giờ ghi vị trí gốc lúc build: mọi nút/lớp/văn bản
   dưới đáy danh sách dính đáy cửa sổ (dời xuống theo chiều cao mới),
   danh sách chỉ giãn tới mép trên thanh nút. Áp dụng chung cho Playlist,
   AVS, Video, ML, Album Art (mỗi cửa sổ có bản ghi riêng). Kiểm headless
   với WinampModern566: kéo +100 → cửa sổ 264, danh sách 199, nút ở 228,
   0 hàng bị đè, hiện 11 hàng thay vì 5; kéo về đúng 164/99/128.
   (Lưu ý khi kiểm headless: sự kiện chạm thật không tới được trang trong
   Chromium headless ở đây nên dùng kéo chuột thật qua CDP — cùng đường
   Pointer Events; trên điện thoại thật bạn kéo chạm được, chính bạn đã
   kéo ra lỗi này.)
8. **Nút CONFIG bấm được + thụt vào khi nhấn.** Skin không có nút CONFIG
   (chữ CONFIG chỉ là ảnh vẽ 25x5, Winamp mở ngăn kéo bằng MAKI) nên chỗ
   đó trước đây là lỗ trống chết. Giờ có vùng bấm thật 40x24 phủ lên chữ
   CONFIG (WinampModern566: tại 275,133), bấm mở/đóng ngăn kéo; lúc giữ
   tay thì nhãn thụt xuống-phải 1px và tối đi (`brightness(0.8)`), nhả ra
   về đúng vị trí cũ. Ngăn kéo mở ra khít mép dưới cửa sổ chính (khe hở
   0, đo headless), chữ CONFIG vẫn thấy và bấm được khi ngăn kéo đang mở,
   đóng vào thì ngăn kéo ẩn hẳn.
9. **Thư viện (ML) hết chữ "Help" lạ + hết bắt bấm 2 cấp.** Chữ "Help"
   là ảnh menu File/View/Help của khung chính bị xếp chồng (loader chỉ
   dàn hàng menu cho cửa sổ chính, không dàn cho cửa sổ khác) — giờ loader
   dàn hàng cho mọi cửa sổ, ML hiện File x=1, View x=40, Help x=86. Khi
   thư viện chỉ có đài (41 kênh gom 1 nhóm "Radio", chưa nạp file máy)
   thì hiện thẳng danh sách kênh, không bắt bấm qua "Tất cả bài hát" →
   "Radio". Khi có file nhạc máy thì vẫn mở cấp Nghệ sĩ → Album → Bài hát
   như cũ — và giờ file máy thật sự được đọc thẻ: artist/album từ Vorbis
   comment (FLAC), ID3v2.3/2.4 (mp3, đủ 4 kiểu mã hóa), ID3v1 dự phòng.
   Sửa kèm lỗi tìm được lúc kiểm: nhánh liệt kê inline dùng `const`
   rồi gán lại bằng `concat` nên cửa sổ ML không mở được (đã sửa thành
   `let`). Kiểm headless: ML chỉ-radio 42 hàng (1 hàng tổng + 41 kênh),
   0 chữ Help; nạp 2 mp3 có thẻ → mở cấp thấy "Ca Si A / Album X /
   tag-a.mp3".
10. **Tab của ngăn CONFIG xuống dưới.** Theo đúng skin XML
    (`config.tabs` ở y=108, nội dung ở y=13–15): tab EQ/Options/Color
    Themes giờ neo đáy ngăn kéo, nội dung ở trên, có cuộn nếu dài.
11. **Playlist hiện thời lượng bài.** Hàng file local hiện thời lượng
    căn phải (vd 0:10, 4:03) lấy từ metadata khi nạp file; đài không có
    thời lượng thì để trống, không bịa số. Kiểm headless: WAV 10s hiện
    "0:10", hàng radio không có số.
12. **Nút Play/Pause sáng lúc đang phát/tạm dừng.** Đang phát thì nút
    Play hiện ảnh nhấn (downImage, skin không có activeImage riêng);
    tạm dừng thì nút Pause hiện ảnh nhấn; bấm Stop thì cả hai về thường.
    Áp dụng cả khi đổi bài/kênh (trước đây Stop không cập nhật vì sự kiện
    pause không bắn khi đã pause sẵn). Skin Classic dùng nút gộp sẵn có.
13. **Bộ nhớ đệm skin gắn với phiên bản loader.** Xem phần "Mở trang".

## Skin Classic (.wsz) — từ v7

- Đọc file `.wsz` bằng `classic-skin.js` (chỉ nạp khi bạn chọn một file
  `.wsz`, không nạp lúc mở trang).
- Cắt ảnh theo **bảng bố cục cố định của skin Classic**, sao y từ file
  `skinSprites.ts` của Webamp (fork captbaritone/webamp, thư mục
  `src/packages/webamp/js/skinSprites.ts`): MAIN 275x116, CBUTTONS, TITLEBAR,
  POSBAR, VOLUME, BALANCE, SHUFREP, EQMAIN, PLEDIT, NUMBERS, MONOSTER,
  PLAYPAUS, TEXT. Quy tắc đọc `viscolor.txt` (24 màu) và `pledits.txt`
  (màu chữ playlist) theo `skinParser.js` của Webamp.
- Cửa sổ chính 275x116 + cửa sổ EQ (preamp + 10 dải) + Playlist, dùng chung
  bộ máy phát với skin Modern: radio, file nhạc máy, EQ (bật/tắt, bypass thật),
  đồng hồ, nút transport.
- File skin Classic thử sẵn trong thư mục: `base-2.91.wsz` (skin Classic mặc
  định của Winamp). Skin mặc định lúc mở trang vẫn là WinampModern566.wal.
- Nhận diện skin theo cả đuôi file VÀ nội dung: zip chứa `main.bmp`/`main.png`
  ở gốc là Classic, zip chứa `skin.xml` là Modern. Đổi qua lại giữa hai loại
  qua cùng đường đổi skin nguyên khối (vẽ xong mới thay, lỗi giữ skin cũ).
- Skin Classic gốc chỉ 275px nên khi phóng to trên PC sẽ hơi mờ — đó là giới
  hạn của ảnh gốc, Amp không tự vẽ thêm chi tiết (không có "HD upscale").

## Các sửa từ v7 (giữ nguyên)

1. **Chữ tên kênh/bài dùng đúng font của skin.** Tên kênh (songticker) vẽ
   bằng font bitmap của skin trên canvas, cuộn khi tên dài, đứng yên khi tên
   ngắn. Chữ có dấu tiếng Việt vẫn hiện đủ.
2. **Đèn Repeat / Shuffle.** Đèn LED đổi ảnh sáng/tối theo trạng thái.
   Shuffle có thật: file nhạc phát ngẫu nhiên, radio thì Next/Prev chọn
   kênh ngẫu nhiên.
3. **Đồng hồ: bấm để đổi giờ đã phát / giờ còn lại.** Với file nhạc máy có
   thời lượng; đài trực tiếp chỉ đếm giờ đã phát.
4. **Đồng hồ đọc đúng vị trí phát thật** (`audio.currentTime` mỗi nhịp).
5. **Lặp áp dụng cho cả playlist, kể cả radio** (tắt lặp vẫn sang mục tiếp,
   hết danh sách mới dừng; lặp playlist quay lại đầu; lặp 1 bài với đài thì
   rớt mạng phát lại đúng kênh).
6. **Tôn trọng `<hideobject>` trong skin** (Azumanga giấu nhóm EQ lúc mở).
7. **Loader quét toàn bộ file XML** (ngoài chuỗi `<include>`).
8. **Đọc thuộc tính XML không phân biệt hoa/thường** (Azumanga viết `Y=` hoa).

## Các sửa giữ từ v5.1 / v6 (hồi quy đã kiểm)

- EQ BẬT nghe được (preamp dB đổi sang tỉ lệ tuyến tính, thẻ audio có
  `crossOrigin="anonymous"`, nối tiếng theo cách của bản Webamp mod); EQ TẮT
  là bypass thật (to hơn khi bật, đúng thiết kế).
- Ba cửa sổ bằng chiều rộng nhau mặc định; chạm 1 cái chọn dòng, nhấp đúp
  mới phát; nút bấm dùng Pointer Events (không dính); đổi skin nguyên khối;
  khung chờ + lưu skin vào bộ nhớ đệm; loader đóng dấu v7.1 (`?v=7.1`); meta
  `no-referrer` (kênh Đà Nẵng và các kênh medatech khác không bị 403);
  thư viện chỉ qua CDN (JSZip, hls.js).
- JS gọn: 0 dòng ghi chú `//` (chỉ còn `//` trong địa chỉ `https://` của CDN).
  File nạp chậm theo cửa sổ (EQ, Playlist, ML, Video, AVS, Album Art,
  Notifier, About, Drawer, Remote) — chỉ nạp khi mở cửa sổ đó.

## Dung lượng JS (đo thật)

- Lúc mở trang: **155.184 B** (JS inline trong index.html 88.347 B +
  skin-loader.js 66.837 B). v7 là 140.613 B — tăng ~14,6 KB cho 13 mục
  sửa ở v7.1 (songinfo, bìa FLAC, phổ gradient, ghi vị trí đáy, nút
  CONFIG, đọc thẻ ML, thời lượng, đèn Play/Pause, EQ trong ngăn kéo).
- Khi nạp một skin `.wsz`: **176.511 B** (thêm classic-skin.js 21.327 B).
- Tổng mọi file JS (kể cả file nạp chậm): 249.027 B. Webamp bundle 965 KB.

## Kiểm tra headless (Chromium + HTTP local, CDN thay bằng bản local CHỈ trong
bộ kiểm tra — không phải trên điện thoại thật)

- check71 (songinfo / bìa FLAC / nền EQ CROSSNET + Azumanga / hồi quy):
  **22/22 đạt**. 0 lỗi trang, 0 request local lỗi. WinampModern566
  354x161/25 nút; mp3 129 kbps/44100 Hz, WAV 1411 kbps, WAV 48 kHz hiện
  "48", FLAC 106 kbps/44100 Hz; bìa FLAC 64×64 hiện (blob URL), mp3 APIC
  chạy, FLAC không bìa về ảnh mặc định; radio không bịa số; CROSSNET
  294x214/20 nút, nền EQ thật, 0 lớp trùng; BLAKK EQ không lùi; Azumanga
  400x360 nền xanh thật (19,2% điểm xanh); Classic base-2.91 275x116;
  AyonPlayer lỗi đúng, giữ skin cũ.
- check-vis (phổ gradient + ngăn kéo): **18/18 đạt**. Âm thanh phát sau
  khi bấm Play thật (t≈1,1s), analyser có dữ liệu (max 255). Cột phổ cao
  có 36 màu xếp dọc (xanh dưới, đỏ trên), vạch đỉnh 782 px (màu
  viscolor[23]); phổ trong màn hình chính 21 màu + vạch đỉnh 57 px;
  mode 1 (xanh) ~24.000 px xanh, quay về mode 0 được. Ngăn kéo: tab EQ
  là EQ thật (11 thanh trượt + 4 ảnh lớp + link tắt), panel ở (3,15);
  tab Options 0 ảnh (7 hàng), Color Themes 0 ảnh (44 preset); cửa sổ EQ
  thật vẫn đủ 11 thanh + nền.
- check-final (resize / CONFIG / ML / thời lượng / đèn Play): **28/28 đạt**.
  Playlist kéo +100 → 264/199/nút 228, 0 hàng bị đè, 11 hàng hiện; kéo về
  đúng 164/99/128. CONFIG 40x24 tại (275,133); giữ tay nhãn thụt 1px +
  tối 0.8, nhả ra về đúng vị trí + ngăn kéo mở; bấm lại đóng. Tab ngăn kéo
  ở dưới nội dung. ML: menu File/View/Help tại x=1/40/86, 0 chữ Help lạ,
  chỉ-radio 42 hàng hiện thẳng kênh; nạp 2 mp3 có thẻ → mở cấp Nghệ sĩ →
  Album → Bài hát. WAV 10s hiện "0:10", hàng radio không số. Play sáng
  ảnh nhấn lúc phát, Pause sáng lúc tạm dừng, Stop về thường cả hai.
  AVS/Video kéo +60: canvas/box giãn, nút dính đáy, 0 đè nhau.
- check-drawer-eq (tab EQ thật trong ngăn kéo): **20/20 đạt**. Panel
  318x89 tại (3,15); 4 ảnh lớp crop (nền, chữ tối, dải dưới y=82, nhãn
  tần số 135,82); nhãn tần số 255 điểm sáng; ngăn kéo khít mép dưới cửa
  sổ chính (khe hở 0), CONFIG vẫn bấm được khi mở; kéo thanh trong ngăn
  kéo thì thanh cửa sổ EQ chạy theo và ngược lại; bấm ON bật/tắt EQ +
  đèn LED sáng + nút EQ dưới trang sáng; PRESETS mở menu, Rock đổi cả hai
  bên ([4,3,-1,-2,-1,1,3,4,5,5]); đổi tab rồi quay lại panel vẽ lại đúng
  1 lần, giữ nguyên giá trị; link "EQ đầy đủ ›" mở cửa sổ EQ; đóng ngăn
  kéo ẩn hẳn.
- Tổng: **88/88 kiểm tra đạt**, 0 lỗi trang trong mọi bộ kiểm tra.

Lưu ý: có 1 lần kiểm tra `getAnalyser` chờ quá 15s ở bản chạy giữa chừng
(môi trường headless chậm, không tái hiện được; 3 lần chạy sau đó đều đạt
ngay, dữ liệu analyser lên trong ~1s). Trên điện thoại thật phổ vẫn chạy
theo nhạc như ảnh bạn gửi.

## Ảnh kiểm chứng (trong thư mục này, KHÔNG có trong file zip)

- `proof-v71-songinfo.png` — màn hình chính phóng to: "1411 / 44" (WAV)
  và tên file `TEST)COVER_.FLAC` đang chạy.
- `proof-v71-flac-cover.png` — cửa sổ Ảnh bìa hiện bìa FLAC (ô đỏ/xanh
  64×64) + tên `test-cover.flac`.
- `proof-v71-crossnet-eq.png` — EQ của CROSSNET có nền panel.
- `proof-v71-azumanga.png` — Azumanga nền xanh, ảnh anime sạch.
- `proof-v71-vis.png` — VISUALIZER cột gradient xanh→vàng→đỏ + phổ nhỏ
  trong màn hình chính; hàng playlist `noise10.wav` hiện "0:10".
- `proof-v71-drawer-eq.png` — tab EQ trong ngăn kéo: 11 thanh trượt,
  nhãn tần số 31.5–16K, ON/AUTO/PRESETS, tab ở dưới.
- `proof-v71-drawer.png`, `proof-v71-drawer-tabs.png` — ngăn kéo mở,
  tab ở dưới.
- `proof-v71-resize-pl.png` — Playlist kéo cao: 11 hàng, nút Add/Rem/
  Sel/Misc ở đáy, không đè hàng nào.
- `proof-v71-config.png`, `proof-v71-config-pressed.png` — vùng CONFIG
  và ngăn kéo mở sau khi bấm.
- `proof-v71-ml-radio.png`, `proof-v71-ml-tags.png` — ML chỉ-radio
  (kênh hiện thẳng) và ML có file gắn thẻ (mở cấp).
- `proof-v71-durations.png` — playlist có cột thời lượng.
- `proof-v71-play-lit.png` — nút Play sáng lúc đang phát.

## Kết quả từng skin

| Skin | Loại | Kết quả |
|---|---|---|
| WinampModern566.wal (mặc định) | Modern | 354x161, 25 nút, đủ 13 mục sửa v7.1 |
| base-2.91.wsz | Classic | 275x116, 19 nút, EQ 11 thanh, Playlist 41 kênh |
| BLAKK (.zip) | Modern | Nạp lại được, EQ có nền (hồi quy) |
| CROSSNET (REDKiller, 294x214) | Modern | 20 nút, EQ có nền panel (mới ở v7.1) |
| Azumanga (LEGION, 400x360) | Modern | Nền xanh có lại; ảnh anime sạch, 0 thanh EQ hiện lúc mở; bấm nút EQ → 12 thanh hiện |
| DDTank Glass | Modern | 360x320, nạp được (hồi quy) |
| Nebular | Modern | 370x136, nạp được (hồi quy) |
| Copperdeck II | Modern | 289x135, nạp được (hồi quy) |
| AyonPlayer / Cpro_Winamp_Modern | Modern (ClassicPro) | Vẫn lỗi đúng như cũ: vị trí nút nằm trong engine ClassicPro, không có trong XML |

## Hạn chế còn biết

- Balance (cân bằng trái/phải) chưa có đường tiếng — thanh trượt Balance
  của skin Classic không được vẽ (cả Modern lẫn Classic đều chưa có).
  Trong tab EQ của ngăn kéo, thanh Balance và các nút Crossfade cũng chưa
  làm (chỉ có ON/AUTO/PRESETS + 11 thanh trượt).
- `region.txt` của skin Classic được đọc nhưng chưa dùng (vùng trong suốt
  của cửa sổ chưa áp dụng).
- Skin Classic không có ML / Video / AVS / Album Art / Notifier / About /
  Drawer / Remote / Stick trong file `.wsz` — các cửa sổ đó dùng bản
  dự phòng chung hoặc không mở được (giống Webamp: skin Classic chỉ có
  Main + EQ + Playlist là chính).
- Ảnh bìa mới đọc được mp3 (ID3v2 APIC) và FLAC (PICTURE), chưa đọc WAV.
- Menu File / Play / ... trên thanh menu vẫn là hình trang trí.
- Bật EQ trên đài radio thì đèn ON cập nhật chậm vài giây (do phải chờ
  gắn lại luồng HLS) — tiếng vẫn đổi đúng, chỉ đèn báo chậm.
- Chưa test trên điện thoại thật — cần bạn test lại các mục v7.1 trên.
