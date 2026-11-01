# Amp v7 — Winamp Modern (.wal) + Classic (.wsz) trong một trình

Amp là trình phát nhạc web nạp skin Winamp trực tiếp từ file gốc của skin,
vẽ bằng HTML/CSS theo đúng kích thước ảnh trong skin. v7 thêm skin Classic
(.wsz) — Amp trở thành trình duy nhất chơi được cả hai loại skin.

## Mở trang

Mở `index.html`. Skin mặc định là WinampModern566.wal (skin Modern gốc của
Winamp 5.66). Bấm **Nạp skin** để chọn file `.wal`, `.zip` hoặc `.wsz` trên máy.
Kéo-thả file skin vào trang cũng được. Skin đã nạp được lưu vào bộ nhớ đệm
(IndexedDB) để lần sau mở nhanh, không tải lại.

## Skin Classic (.wsz) — mới ở v7

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

## Mới ở v7 (theo báo lỗi trên điện thoại thật)

1. **Chữ tên kênh/bài dùng đúng font của skin.** Trước đây tên kênh (songticker)
   vẽ bằng chữ HTML của trình duyệt. Giờ vẽ bằng font bitmap của skin trên
   canvas, cuộn khi tên dài, đứng yên khi tên ngắn. Chữ có dấu tiếng Việt
   vẫn hiện đủ (ký tự nào font không có thì vẽ bằng font dự phòng, không
   để trống). Quy tắc này áp cho mọi chữ trong cửa sổ skin mà skin có định
   nghĩa font bitmap; chữ nào skin không định nghĩa font thì vẫn dùng HTML.
2. **Đèn Repeat / Shuffle.** Đèn LED bên cạnh hai nút giờ đổi ảnh sáng/tối
   theo trạng thái (trước đây chỉ đổi độ mờ nên không thấy sáng). Shuffle
   giờ có thật: bật thì file nhạc phát ngẫu nhiên, radio thì Next/Prev chọn
   kênh ngẫu nhiên. Đèn và nút nằm đúng vị trí trong skin (góc phải cửa sổ
   chính, theo tọa độ relatx trong XML).
3. **Đồng hồ: bấm để đổi giờ đã phát / giờ còn lại.** Với file nhạc máy có
   thời lượng: bấm vào đồng hồ để đổi qua lại giữa giờ đã phát (vd 1:30) và
   giờ còn lại (vd -1:50), đúng như Winamp. Đài trực tiếp không có thời
   lượng thì đồng hồ vẫn chỉ đếm giờ đã phát, bấm vào hiện ghi chú.
   (Yêu cầu gốc của bạn nhắn bằng giọng nói bị lỗi chữ; cách đọc này là
   suy đoán hợp lý nhất và khớp hành vi Winamp, không gây hại nếu hiểu sai.)
4. **Đồng hồ đọc đúng vị trí phát thật.** Đồng hồ giờ đọc thẳng
   `audio.currentTime` mỗi nhịp (trước đây đếm bằng bộ đếm riêng nên kéo
   thanh trượt không đổi giờ). Kéo tới 1:30 thì hiện 1:30 ngay, cả ở chế độ
   giờ còn lại.
5. **Lặp áp dụng cho cả playlist, kể cả radio.** Trước đây hết bài chỉ nhảy
   trong file nhạc (lọc `kind === "file"`) và tắt lặp thì dừng hẳn. Giờ:
   | chế độ | file hết bài | radio rớt mạng |
   |---|---|---|
   | Tắt (0) | sang mục tiếp theo trong playlist (radio hay file đều được), dừng sau mục cuối | sang mục tiếp theo |
   | Lặp playlist (1) | sang mục tiếp theo, hết danh sách quay lại đầu | sang mục tiếp theo, quay lại đầu |
   | Lặp 1 bài (2) | phát lại đúng file đó | phát lại đúng kênh đó |
   Dừng tự chuyển sau 6 lần lỗi liên tiếp (giới hạn cũ, giờ đếm đúng vì
   chỉ reset khi phát thành công thật, không reset mỗi lần thử lại).
6. **Tôn trọng `<hideobject>` trong skin.** Một số skin giấu nhóm lúc mở
   (vd Azumanga giấu nhóm EQ để hiện ảnh nhân vật). Trước đây Amp vẽ cả hai
   chồng lên nhau. Giờ nhóm bị `hideobject` thì ẩn lúc mở; nút toggle có
   `param` tương ứng (vd nút EQ) sẽ hiện/ẩn nhóm đó, và khi hiện nhóm EQ thì
   ẩn lớp ảnh bị nó che, tắt EQ thì ảnh trở lại. Áp dụng chung cho mọi skin,
   không riêng Azumanga. (Bạn đang test v5.1 — lỗi này sửa ở v7.)
7. **Loader quét toàn bộ file XML.** Trước đây loader chỉ đi theo chuỗi
   `<include>` từ skin.xml. Giờ sau khi đi hết chuỗi include, loader quét
   nốt mọi file `.xml` còn lại trong zip để gộp định nghĩa groupdef / bitmap /
   container (trùng id thì chuỗi include thắng). Đây là lưới an toàn cho
   skin quên include hoặc nạp XML động bằng MAKI.
8. **Đọc thuộc tính XML không phân biệt hoa/thường.** Một số skin viết
   `X="..."` / `Y="..."` hoa (Azumanga có 28 chỗ `Y=` hoa) khiến nút/lớp bị
   đặt sai vị trí (về 0). Giờ `x/y/w/h` và `relat*`/`visible` đọc cả hai dạng.

## Các sửa giữ từ v5.1 / v6 (hồi quy đã kiểm)

- EQ BẬT nghe được (preamp dB đổi sang tỉ lệ tuyến tính, thẻ audio có
  `crossOrigin="anonymous"`, nối tiếng theo cách của bản Webamp mod); EQ TẮT
  là bypass thật (to hơn khi bật, đúng thiết kế).
- Ba cửa sổ bằng chiều rộng nhau mặc định; chạm 1 cái chọn dòng, nhấp đúp
  mới phát; nút bấm dùng Pointer Events (không dính); đổi skin nguyên khối;
  khung chờ + lưu skin vào bộ nhớ đệm; loader đóng dấu v7 (`?v=7`); meta
  `no-referrer` (kênh Đà Nẵng và các kênh medatech khác không bị 403);
  thư viện chỉ qua CDN (JSZip, hls.js).
- JS gọn: 0 dòng ghi chú `//` (chỉ còn `//` trong địa chỉ `https://` của CDN).
  File nạp chậm theo cửa sổ (EQ, Playlist, ML, Video, AVS, Album Art,
  Notifier, About, Drawer, Remote) — chỉ nạp khi mở cửa sổ đó.

## Dung lượng JS (đo thật)

- Lúc mở trang: **140.613 B** (JS inline trong index.html 74.150 B +
  skin-loader.js 66.463 B). v6 là 130.352 B — tăng ~10 KB do các tính năng
  mới ở v7 (ticker bitmap, đèn LED, đồng hồ, lặp playlist, hideobject,
  quét XML).
- Khi nạp một skin `.wsz`: **161.940 B** (thêm classic-skin.js 21.327 B).
- Tổng mọi file JS (kể cả file nạp chậm): 228.438 B. Webamp bundle 965 KB.

## Kiểm tra headless (Chromium + HTTP local, CDN thay bằng bản local CHỈ trong
bộ kiểm tra — không phải trên điện thoại thật)

- check1 (khởi động / ticker / đèn / đồng hồ): **24/24 đạt**. 0 lỗi trang,
  0 request local lỗi. Ticker là canvas font bitmap (19 glyph, 0 ký tự
  dự phòng với "Đà Nẵng — Trực tiếp"), tên dài cuộn, tên ngắn đứng yên.
  Repeat bấm 1 → chế độ 1 đèn sáng, bấm 2 → chế độ 2 đèn vẫn sáng, bấm 3 →
  tắt đèn tối. Shuffle bật/tắt đổi ảnh đèn + hiện trạng thái. File WAV 200s:
  đếm lên, kéo tới 90s → 1:30, kéo về 10s → 0:10, bấm đồng hồ → còn lại
  -3:10, kéo 90s ở chế độ còn lại → -1:50, bấm lại → đã phát 1:30.
  Radio: đồng hồ chỉ đếm đã phát, bấm vào giữ nguyên + ghi chú.
- check2 (lặp cả playlist): **10/10 đạt**. Playlist trộn [file WAV, kênh
  radio, file WAV]: chế độ 0 hết file đầu → chọn kênh radio + phát request;
  chế độ 0 hết file cuối → dừng; chế độ 1 hết file cuối → quay lại file đầu;
  chế độ 1 hết file đầu → sang kênh radio; chế độ 2 hết file → phát lại
  đúng file; chế độ 2 radio lỗi → thử lại đúng kênh; chế độ 1 radio lỗi →
  sang mục tiếp; 6 lỗi liên tiếp → dừng tự chuyển + báo trạng thái.
- check3 (classic / Azumanga / quét XML / hồi quy): **32/32 đạt**. 0 lỗi
  trang, 0 request local lỗi.

## Kết quả từng skin

| Skin | Loại | Kết quả |
|---|---|---|
| WinampModern566.wal (mặc định) | Modern | 354x161, 25 nút, đổi qua lại với Classic nguyên khối |
| base-2.91.wsz | Classic | 275x116, 19 nút, EQ 11 thanh (preamp + 10 dải), Playlist 41 kênh, nhấp đúp phát kênh 7 |
| Axlar.wsz | Classic | 275x116, 19 nút, nạp được |
| Blizzard_v2.wsz | Classic | 275x116, nạp được |
| BLAKK (.zip) | Modern | Nạp lại được sau khi đổi sang Classic |
| Azumanga (LEGION, 400x360) | Modern | Lúc mở: ảnh anime sạch, 0 thanh EQ hiện; bấm nút EQ → 12 thanh EQ hiện, ảnh ẩn, nút EQ sáng; bấm lại → ảnh về, EQ ẩn; kéo thanh EQ đổi band 0 (0 → 9,3) |
| DDTank Glass | Modern | 360x320, nạp được (hồi quy) |
| Nebular | Modern | 370x136, nạp được (hồi quy) |
| Copperdeck II | Modern | 289x135, nạp được (hồi quy) |
| AyonPlayer / Cpro_Winamp_Modern | Modern (ClassicPro) | Vẫn lỗi đúng như cũ: vị trí nút nằm trong engine ClassicPro, không có trong XML |
| Skin kiểm tra quét XML | Modern (tự làm) | groupdef trong file XML không được include vẫn nạp và vẽ được |

## Hạn chế còn biết

- Balance (cân bằng trái/phải) chưa có đường tiếng — thanh trượt Balance
  của skin Classic không được vẽ (cả Modern lẫn Classic đều chưa có).
- `region.txt` của skin Classic được đọc nhưng chưa dùng (vùng trong suốt
  của cửa sổ chưa áp dụng).
- Màu `viscolor.txt` đã đọc và lưu trong skin nhưng phổ nhạc (`drawVis`)
  vẫn dùng màu cố định — chưa vẽ theo màu của skin.
- Skin Classic không có ML / Video / AVS / Album Art / Notifier / About /
  Drawer / Remote / Stick trong file `.wsz` — các cửa sổ đó dùng bản
  dự phòng chung hoặc không mở được (giống Webamp: skin Classic chỉ có
  Main + EQ + Playlist là chính).
- Ảnh bìa mới đọc được file mp3 (ID3v2 APIC), chưa đọc FLAC.
- Menu File / Play / ... trên thanh menu vẫn là hình trang trí.
- Chưa test trên điện thoại thật — cần bạn test lại các mục trên.
