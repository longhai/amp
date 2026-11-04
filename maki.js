/* Amp v10.1 — maki.js (đợt 7, giai đoạn a: ĐỌC/INSPECT script MAKI — KHÔNG chạy code MAKI).
   Chuyển tay từ parser MAKI của Webamp fork (captbaritone/webamp v2.3.1,
   packages/webamp-modern/src/maki/{parser.ts, MakiFile.ts, constants.ts,
   objects.ts + objectData/*.json}) sang JS thuần, không build step.
   Chạy được cả trình duyệt (window.AmpMaki) lẫn Node (module.exports).

   ---------------------------------------------------------------------------
   ĐỊNH DẠNG FILE .maki (theo maki-bytecode.md của fork — đã kiểm bằng
   29 file .maki thật của skin 566, tất cả parse sạch, EOF đúng):
   - Header: magic "FG" (2B) + u16 luôn 1027 + u32 formatVersion (566: 23).
     LƯU Ý: parser.ts của fork gọi u16 1027 là "version"; ở đây giữ
     `version` = 1027 cho khớp fork, thêm `formatVersion` = u32 (21/22/23)
     mới là số phiên bản định dạng thật.
   - Classes: u32 số lượng + mỗi class 16B GUID (4×u32 LE; hex thô phải qua
     formatGuid() — y hệt getFormattedId của objects.ts — mới tra được tên).
   - Methods: u32 số lượng + mỗi method: u16 (8 bit thấp = offset vào bảng
     classes) + u16 bỏ qua + chuỗi tên (u16 độ dài + bytes, lowercased).
   - Variables: u32 số lượng + mỗi biến: u8 typeOffset, u8 object?,
     u16 subClass?, 4×u16 init, u8 global, u8 system (luôn đọc, kể cả
     formatVersion <= 22 — đúng parser.ts của fork).
     Primitive: 2=int, 3=float, 4=double, 5=boolean, 6=string.
     Biến subClass (kế thừa): đánh dấu biến gốc isClass + members/events.
   - Strings: u32 số lượng + mỗi chuỗi: u32 offset biến + chuỗi (u16 len).
   - Bindings: u32 số lượng + mỗi binding: u32 varOffset, u32 methodOffset,
     u32 binaryOffset (đổi sang commandOffset = chỉ số lệnh).
   - Code: u32 số byte + dãy opcode. Opcode có immediate:
     var/obj/objFunc -> u32; func/line -> i32 + 5 + vị trí (đổi sang chỉ
     số lệnh). Sau lệnh call (0x18) có thể có u32 stack protection
     0xFFFF0000..0xFFFF000F (16 bit thấp = số đối số — 566: KHÔNG có cái
     nào); sau strangeCall (0x70) có 1 byte = số đối số (566: 2828 lệnh
     dùng 0x70, toàn bộ đều có byte này). Opcode lạ -> throw (fork cũng
     throw "Unknown opcode"); 566 không có opcode lạ (chỉ 32 opcode).
   - Hết code mà còn byte thừa: file biên dịch với /debug có thêm 2 mục
     filepaths + line numbers — thử đọc lướt, không đọc được thì chỉ ghi
     warning (không throw): inspect vẫn dùng được phần trước.
   ---------------------------------------------------------------------------
   INSPECT (không chạy code — chỉ đi tuyến tính qua lệnh, mô phỏng NGĂN
   XẾP TRỪU TƯỢNG để khôi phục đối tượng đích + đối số của mỗi lệnh call):
   - Ngăn xếp giữ giá trị tượng trưng {type, value, desc}: push var sao
     chép giá trị tượng trưng của biến; popTo/mov gán lại cho biến; add
     nối chuỗi hằng khi cả 2 đều là chuỗi hằng.
   - Lệnh call/strangeCall: số đối số lấy theo thứ tự ưu tiên —
     (1) byte/u32 kèm theo lệnh, (2) bảng METHOD_ARITY (sinh từ objectData
     của fork), (3) heuristic: pop tới khi gặp OBJECT (tối đa 8 lần) và
     ghi argCountKnown=false (không bịa). Thứ tự đối số: trình biên dịch
     MAKI đẩy đối số NGƯỢC (đối số cuối trước) nên thứ tự pop ra khỏi
     ngăn xếp CHÍNH LÀ thứ tự trong mã nguồn — đã kiểm bằng setXmlParam
     ("resize","bottomright") trên videoavs.maki.
   - Đích của call được đặt tên khi suy ra được: findObject("id") ->
     findObject("id"); getScriptGroup() -> scriptGroup;
     getContainer("x") -> container:x; getLayout("y") -> ...|layout:y;
     getGroup/getObject("id"); getParentLayout(); new Class -> new Class.
     Biến được gán từ các giá trị này thì lần gán ĐẦU ghi vào firstDesc,
     dùng để đặt tên cho binding (onX trên biến nào) và cho đích var#N.
     Đích không suy ra được giữ dạng "var#N <Class>" (566: 967/3183 lệnh
     call có đích đặt tên đầy đủ; còn lại phần lớn là biến GuiObject của
     script — gán qua đường mà inspect tuyến tính không theo được, vd qua
     hàm con/return — ghi rõ, không bịa tên).
   - Nhảy có điều kiện (jumpIf/jumpIfNot) chỉ pop 1 giá trị như VM thật;
     jump tuyệt đối + ret xoá ngăn xếp (đầu hàm mới). Đây là inspect
     TUYẾN TÍNH, không theo luồng rẽ nhánh: thứ tự sự kiện trong báo cáo
     là thứ tự lệnh trong file, KHÔNG phải thứ tự chạy thật khi có rẽ
     nhánh/lặp. Điều kiện hiện/ẩn (vd beat chỉ hiện khi cửa sổ đủ rộng)
     KHÔNG khôi phục được từ inspect tuyến tính — chỉ liệt kê lệnh
     show/hide đã gặp, để giai đoạn b (interpreter) xử lý sau.
   - KHÔNG LÀM Ở ĐÂY (giai đoạn b, để sau): chạy code MAKI thật — cần
     ~70 class GUI + UIRoot + interpreter/stack VM của fork. File này
     CHỈ ĐỌC.
   ---------------------------------------------------------------------------
   API: parseMaki(buf, id) / inspectMaki(parsed) / inspectSkinFiles(files)
   / formatGuid(rawHex) / COMMANDS. Lỗi đọc: throw Error (id file kèm theo).
   inspectSkinFiles(files) không throw theo file: file lỗi ghi vào
   results[i].error, các file khác vẫn inspect được.
*/
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory();
  else root.AmpMaki = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var MAKI_VERSION = "10.20";
  var EXPECTED_MAKI_VERSION = "10.20";
  if (MAKI_VERSION !== EXPECTED_MAKI_VERSION) {
    throw new Error("maki.js: MAKI_VERSION (" + MAKI_VERSION + ") khac EXPECTED_MAKI_VERSION (" + EXPECTED_MAKI_VERSION + ") — ban mix, dung lai");
  }
  /* Kiểm manifest như các file khác (index.html đặt window.AMP_VERSION
     trước khi nạp file này). Không có manifest (chạy test trực tiếp bằng
     require) thì không kiểm. */
  var MANIFEST_VERSION = (function () {
    try {
      if (typeof globalThis !== "undefined" && globalThis.AMP_VERSION) return globalThis.AMP_VERSION;
      if (typeof window !== "undefined" && window.AMP_VERSION) return window.AMP_VERSION;
    } catch (e) { /* bỏ qua */ }
    return null;
  })();
  var MANIFEST_MISMATCH = MANIFEST_VERSION !== null && MANIFEST_VERSION !== MAKI_VERSION;

  /* Bảng opcode — chuyển từ constants.ts của fork (chỉ lấy opcode mà
     parser cần để biết loại immediate; tên/short giữ để báo cáo đọc được).
     0x68 "mystery" trong maki-bytecode.md KHÔNG có trong constants.ts và
     không xuất hiện trong 29 file 566 — gặp opcode ngoài bảng thì throw. */
  var COMMANDS = {
    1: { name: "push", arg: "var" },
    2: { name: "pop" },
    3: { name: "popTo", arg: "var" },
    8: { name: "eq" }, 9: { name: "heq" }, 10: { name: "gt" }, 11: { name: "gtq" },
    12: { name: "le" }, 13: { name: "leq" },
    16: { name: "jumpIf", arg: "line" }, 17: { name: "jumpIfNot", arg: "line" }, 18: { name: "jump", arg: "line" },
    24: { name: "call", arg: "objFunc" }, 25: { name: "callGlobal", arg: "func" },
    33: { name: "ret" }, 40: { name: "complete" }, 48: { name: "mov" },
    56: { name: "postinc" }, 57: { name: "postdec" }, 58: { name: "preinc" }, 59: { name: "predec" },
    64: { name: "add" }, 65: { name: "sub" }, 66: { name: "mul" }, 67: { name: "div" }, 68: { name: "mod" },
    72: { name: "and" }, 73: { name: "or" }, 74: { name: "not" }, 76: { name: "negative" },
    80: { name: "logAnd" }, 81: { name: "logOr" },
    88: { name: "lshift" }, 89: { name: "rshift" }, 90: { name: "lshift" }, 91: { name: "rshift" },
    96: { name: "new", arg: "obj" }, 97: { name: "delete" },
    112: { name: "strangeCall", arg: "objFunc" }
  };
  var PRIMITIVE_TYPES = { 5: "BOOLEAN", 2: "INT", 3: "FLOAT", 4: "DOUBLE", 6: "STRING" };

  /* Bảng GUID -> tên class, sinh từ objectData/*.json của fork
     (std/config/winampconfig/application/fileio/pldir) — CHỈ 49 GUID
     xuất hiện trong bảng classes của 29 file .maki skin 566.
     Khóa là GUID đã chuẩn hoá (getFormattedId, như objects.ts
     của fork): hex thô trong file .maki phải qua formatGuid()
     mới tra được. Skin khác có GUID ngoài bảng -> tên null,
     parser vẫn chạy (chỉ thiếu tên class). */
  var CLASS_NAMES = {
    "00c074a0fea249a0be8dfabbdb161640": "Wac",
    "01e28ce1b05911d5979fe4de6f51760a": "GroupList",
    "0f08c940af394b2380f3b8c48f7ebb59": "Status",
    "1d8631c880d047929f98bd5d36b49136": "MenuButton",
    "24dec283b76e4a368ccc9e24c46b6c73": "ConfigAttribute",
    "2d2d1376be0a4cb9bc0c57e6e4c999f5": "Form",
    "36d59b7103fd4af897950502b7db267a": "DropDownList",
    "38603665461b42a7aa75d83f6667bf73": "Map",
    "3a370c023cbf439f84f186885bcf1e36": "Region",
    "403abcc06f224bd68ba410c829932547": "WindowHolder",
    "45be95e520724191935cbb5ff9f117fd": "Group",
    "4ee3e199c6364bec97cd78bc9c8628b0": "GuiObject",
    "516549710d874a5191e3a6b53235f3e7": "Object",
    "593dba22d0774976b952f4713655400b": "Config",
    "5ab9fa159a7d4557abc86557a6c67ca9": "Layer",
    "5d0c5bb67de14b1fa70f8d1659941941": "Timer",
    "60906d4e537e482eb004cc9461885672": "Layout",
    "6129fec1dab74d51916501ca0c1b70db": "GuiList",
    "62b65e3f375e408d8dea76814ab91b77": "Slider",
    "64e4bbfa81f449d9b0c0a85b2ec3bcfd": "Edit",
    "698eddcd8f1e4fec9b12f944f909ff45": "Button",
    "6b64cd275a264c4b8c59e6a70cf6493a": "AnimatedLayer",
    "6dcb05e48ac448c2b19349f0910ef54a": "AlbumArtLayer",
    "73c00594961f401b9b1b672427ac4165": "Menu",
    "7dfd324437514e7cbf4082ae5f3adc33": "Title",
    "7fd5f210acc448dfa6a05451576cdc76": "LayoutStatus",
    "80f0f8bd1ba542a6a0933236a00c8d4a": "CfgGroup",
    "87c65778e74349fe85f909cc532afd56": "BitList",
    "8d1eba38489e483eb9608d1f43c5c405": "EqVis",
    "97aa3e4df4d04fa8817b0af22a454983": "ComponentBucket",
    "9b2e341b6c9840fa8b850c1b6ee89405": "MouseRedir",
    "9b3b4b82667a420e8ffc794115809c02": "TreeItem",
    "a5376fa14e94411a83f605ec5eea5f0a": "FeedWatcher",
    "a8c2200d51eb4b2aba7f5d4bc65d4c71": "Browser",
    "b2023ab5434d4ba1beae59637503f3c6": "List",
    "b2ad3f2b31ed4e31bc6de9951cd555bb": "WinampConfig",
    "b4dccfff81fe4bcc961b720fd5be0fff": "ToggleButton",
    "b5baa53505b34dcbadc1e618d28f6896": "TabSheet",
    "c7ed319953194798986360b15a298caa": "CheckBox",
    "cdcb785d81f242538f0561b872283cfa": "QueryList",
    "ce4f97be77b04e199956d49833c96c27": "Vis",
    "d40302823aab4d87878d12326fadfcd5": "ConfigItem",
    "d59514f7ed3645e8980f3f4ea0522cd9": "GuiTree",
    "d6f50f6493fa49b793f1ba66efae3e98": "System",
    "e2bbc14d84f64173bdb3b2eb2f665550": "Frame",
    "e90dc47b840d4ae7b02c040bd275f7fc": "Container",
    "efaa8672310e41fab7dc85a9525bcb4b": "Text",
    "f4787af4b2bb4ef79cfbe74ba9bea88d": "PopupMenu",
    "fc17844ec72b4518a068a8f930a5ba80": "WinampConfigGroup",
  };

  /* Bảng số đối số (arity) của method, sinh từ cùng objectData
     (kèm chuỗi kế thừa parentClass như getMethod của fork).
     CHỈ 199 method Class.method từng được GỌI trong 29 file
     .maki của 566 — đủ để đọc đúng mọi lệnh call opcode 0x18
     (không có stack protection) của skin này. Method ngoài
     bảng -> inspect dùng heuristic pop-tới-object, ghi rõ
     argCountKnown=false, không bịa số đối số. */
  var METHOD_ARITY = {
    "AlbumArtLayer.hide": 0,
    "AlbumArtLayer.isinvalid": 0,
    "AlbumArtLayer.isloading": 0,
    "AlbumArtLayer.refresh": 0,
    "AlbumArtLayer.show": 0,
    "AnimatedLayer.gotoframe": 1,
    "AnimatedLayer.hide": 0,
    "AnimatedLayer.setxmlparam": 2,
    "AnimatedLayer.show": 0,
    "Button.hide": 0,
    "Button.isvisible": 0,
    "Button.leftclick": 0,
    "Button.setalpha": 1,
    "Button.setxmlparam": 2,
    "Button.show": 0,
    "ComponentBucket.enumchildren": 1,
    "ComponentBucket.getnumchildren": 0,
    "ComponentBucket.getscroll": 0,
    "ComponentBucket.setscroll": 1,
    "Config.getitem": 1,
    "Config.newitem": 2,
    "ConfigAttribute.getdata": 0,
    "ConfigAttribute.ondatachanged": 0,
    "ConfigAttribute.setdata": 1,
    "ConfigItem.getattribute": 1,
    "ConfigItem.newattribute": 2,
    "Container.close": 0,
    "Container.getcurlayout": 0,
    "Container.getlayout": 1,
    "Container.switchtolayout": 1,
    "Group.findobject": 1,
    "Group.getguih": 0,
    "Group.getguiw": 0,
    "Group.getguix": 0,
    "Group.getleft": 0,
    "Group.getobject": 1,
    "Group.getparentlayout": 0,
    "Group.getwidth": 0,
    "Group.gototarget": 0,
    "Group.hide": 0,
    "Group.init": 1,
    "Group.screentoclientx": 1,
    "Group.settargeth": 1,
    "Group.settargetspeed": 1,
    "Group.settargetw": 1,
    "Group.settargetx": 1,
    "Group.settargety": 1,
    "Group.setxmlparam": 2,
    "Group.show": 0,
    "GuiObject.findobject": 1,
    "GuiObject.getautowidth": 0,
    "GuiObject.getparent": 0,
    "GuiObject.hide": 0,
    "GuiObject.sendaction": 6,
    "GuiObject.setenabled": 1,
    "GuiObject.setxmlparam": 2,
    "GuiObject.show": 0,
    "Layer.hide": 0,
    "Layer.isinvalid": 0,
    "Layer.setalpha": 1,
    "Layer.setxmlparam": 2,
    "Layer.show": 0,
    "Layout.beforeredock": 0,
    "Layout.canceltarget": 0,
    "Layout.clienttoscreenh": 1,
    "Layout.clienttoscreenx": 1,
    "Layout.findobject": 1,
    "Layout.getalpha": 0,
    "Layout.getcontainer": 0,
    "Layout.getguih": 0,
    "Layout.getguiw": 0,
    "Layout.getguix": 0,
    "Layout.getguiy": 0,
    "Layout.getheight": 0,
    "Layout.getid": 0,
    "Layout.getleft": 0,
    "Layout.getsnapadjustbottom": 0,
    "Layout.gettop": 0,
    "Layout.getwidth": 0,
    "Layout.gototarget": 0,
    "Layout.hide": 0,
    "Layout.isactive": 0,
    "Layout.isgoingtotarget": 0,
    "Layout.islayoutanimationsafe": 0,
    "Layout.istransparencysafe": 0,
    "Layout.isvisible": 0,
    "Layout.redock": 0,
    "Layout.resize": 4,
    "Layout.reversetarget": 1,
    "Layout.sendaction": 6,
    "Layout.setalpha": 1,
    "Layout.settargeta": 1,
    "Layout.settargeth": 1,
    "Layout.settargetspeed": 1,
    "Layout.settargetw": 1,
    "Layout.settargetx": 1,
    "Layout.settargety": 1,
    "Layout.setxmlparam": 2,
    "Layout.show": 0,
    "Layout.snapadjust": 4,
    "LayoutStatus.callme": 1,
    "PopupMenu.addcommand": 4,
    "PopupMenu.addseparator": 0,
    "PopupMenu.addsubmenu": 2,
    "PopupMenu.popatmouse": 0,
    "Slider.getposition": 0,
    "Slider.onsetposition": 1,
    "Slider.setenabled": 1,
    "Slider.setposition": 1,
    "System.activateapplication": 0,
    "System.cos": 1,
    "System.debugstring": 2,
    "System.floattostring": 2,
    "System.getcontainer": 1,
    "System.getleftvumeter": 0,
    "System.getparam": 0,
    "System.getpath": 1,
    "System.getplayitemdisplaytitle": 0,
    "System.getplayitemlength": 0,
    "System.getplayitemmetadatastring": 1,
    "System.getplayitemstring": 0,
    "System.getplaylistindex": 0,
    "System.getplaylistlength": 0,
    "System.getprivateint": 3,
    "System.getrightvumeter": 0,
    "System.getruntimeversion": 0,
    "System.getscriptgroup": 0,
    "System.getskinname": 0,
    "System.getsonginfotext": 0,
    "System.getstatus": 0,
    "System.gettimeofday": 0,
    "System.gettoken": 3,
    "System.getviewportheight": 0,
    "System.getviewportheightfromguiobject": 1,
    "System.getviewportleft": 0,
    "System.getviewportleftfromguiobject": 1,
    "System.getviewporttop": 0,
    "System.getviewporttopfromguiobject": 1,
    "System.getviewportwidth": 0,
    "System.getviewportwidthfromguiobject": 1,
    "System.getvolume": 0,
    "System.hidenamedwindow": 1,
    "System.integertostring": 1,
    "System.integertotime": 1,
    "System.isdesktopalphaavailable": 0,
    "System.iskeydown": 1,
    "System.isminimized": 0,
    "System.isnamedwindowvisible": 1,
    "System.istransparencyavailable": 0,
    "System.isvideo": 0,
    "System.isvideofullscreen": 0,
    "System.lockui": 0,
    "System.messagebox": 4,
    "System.navigateurl": 1,
    "System.navigateurlbrowser": 1,
    "System.newdynamiccontainer": 1,
    "System.newgroup": 1,
    "System.oneqfreqchanged": 1,
    "System.onsetxuiparam": 2,
    "System.random": 1,
    "System.restoreapplication": 0,
    "System.seteqband": 2,
    "System.setprivateint": 3,
    "System.setvolume": 1,
    "System.showwindow": 3,
    "System.sin": 1,
    "System.stringtointeger": 1,
    "System.strleft": 2,
    "System.strlen": 1,
    "System.strlower": 1,
    "System.strmid": 3,
    "System.strright": 2,
    "System.strsearch": 2,
    "System.translate": 1,
    "System.triggeraction": 3,
    "System.unlockui": 0,
    "Text.getautowidth": 0,
    "Text.hide": 0,
    "Text.setalpha": 1,
    "Text.setenabled": 1,
    "Text.settext": 1,
    "Text.setxmlparam": 2,
    "Text.show": 0,
    "Timer.getskipped": 0,
    "Timer.isrunning": 0,
    "Timer.ontimer": 0,
    "Timer.setdelay": 1,
    "Timer.start": 0,
    "Timer.stop": 0,
    "ToggleButton.getactivated": 0,
    "ToggleButton.getcurcfgval": 0,
    "ToggleButton.leftclick": 0,
    "ToggleButton.ontoggle": 1,
    "ToggleButton.setactivated": 1,
    "Vis.getxmlparam": 1,
    "Vis.setmode": 1,
    "Vis.setxmlparam": 2,
    "WinampConfig.getgroup": 1,
    "WinampConfigGroup.getint": 1,
  };

  /* Chuẩn hoá GUID thô trong file .maki (4×u32 LE nối hex) về dạng khoá
     của objectData — y hệt getFormattedId trong objects.ts của fork. */
  function formatGuid(rawHex) {
    if (!rawHex || rawHex.length !== 32) return (rawHex || "").toLowerCase();
    return rawHex.replace(
      /(........)(....)(....)(..)(..)(..)(..)(..)(..)(..)(..)/,
      "$1$3$2$7$6$5$4$11$10$9$8"
    ).toLowerCase();
  }
  function classNameOf(rawGuid) {
    if (!rawGuid) return null;
    return CLASS_NAMES[formatGuid(rawGuid)] || null;
  }
  function arityOf(className, methodName) {
    if (!className || !methodName) return null;
    var n = METHOD_ARITY[className + "." + methodName.toLowerCase()];
    return (n === undefined || n === null) ? null : n;
  }

  /* --- Đọc file nhị phân (port MakiFile.ts của fork) --- */
  function MakiReader(data) {
    var arr = null;
    /* Chấp nhận ArrayBuffer/Uint8Array kể cả KHÁC REALM (vd JSZip chạy ở
       Node đưa Uint8Array vào maki.js chạy trong jsdom/trình duyệt —
       instanceof Uint8Array/ArrayBuffer khi đó trả false nên phải nhận
       dạng bằng ArrayBuffer.isView + sao chép byte tay, không dùng
       instanceof làm điều kiện duy nhất). */
    if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView && ArrayBuffer.isView(data)) {
      arr = new Uint8Array(data.byteLength);
      for (var i = 0; i < data.byteLength; i++) arr[i] = data[i];
    } else if (data instanceof Uint8Array) arr = data;
    else if (data instanceof ArrayBuffer) arr = new Uint8Array(data);
    else if (data && data.buffer instanceof ArrayBuffer) arr = new Uint8Array(data.buffer, data.byteOffset || 0, data.byteLength);
    else throw new Error("parseMaki: can ArrayBuffer hoac Uint8Array");
    this._arr = arr;
    this._i = 0;
  }
  MakiReader.prototype.isEof = function () { return this._i === this._arr.length; };
  MakiReader.prototype.getPosition = function () { return this._i; };
  MakiReader.prototype.remaining = function () { return this._arr.length - this._i; };
  MakiReader.prototype._need = function (n) {
    if (this._i + n > this._arr.length) throw new Error("parseMaki: het file giua chung (can " + n + " byte, con " + (this._arr.length - this._i) + ")");
  };
  MakiReader.prototype.readUInt8 = function () { this._need(1); return this._arr[this._i++]; };
  MakiReader.prototype.readUInt16LE = function () {
    this._need(2);
    var o = this._i >>> 0; this._i += 2;
    return this._arr[o] | (this._arr[o + 1] << 8);
  };
  MakiReader.prototype.readInt32LE = function () {
    this._need(4);
    var o = this._i >>> 0; this._i += 4;
    return this._arr[o] | (this._arr[o + 1] << 8) | (this._arr[o + 2] << 16) | (this._arr[o + 3] << 24);
  };
  MakiReader.prototype.peekUInt32LE = function () {
    this._need(4);
    var o = this._i >>> 0;
    return (this._arr[o] | (this._arr[o + 1] << 8) | (this._arr[o + 2] << 16)) + this._arr[o + 3] * 0x1000000;
  };
  MakiReader.prototype.readUInt32LE = function () { var v = this.peekUInt32LE(); this._i += 4; return v; };
  MakiReader.prototype.readStringOfLength = function (length) {
    this._need(length);
    var end = Math.min(this._arr.length, this._i + length);
    var bytes = this._arr.slice(this._i, end);
    var s = "";
    if (typeof TextDecoder !== "undefined") {
      try { s = new TextDecoder().decode(bytes); } catch (e) { s = ""; }
    }
    if (!s) { for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]); }
    this._i += length;
    return s;
  };
  MakiReader.prototype.readString = function () { return this.readStringOfLength(this.readUInt16LE()); };

  function opcodeToArgType(opcode) {
    var command = COMMANDS[opcode];
    if (!command) throw new Error("Unknown opcode " + opcode);
    switch (command.arg) {
      case "func": case "line": return "COMMAND_OFFSET";
      case "var": case "objFunc": case "obj": return "VARIABLE_OFFSET";
      default: return "NONE";
    }
  }

  /* --- Parser (port parser.ts của fork; khác biệt duy nhất: giữ lại
     argCount của call/strangeCall + version u32 + warning debug-section,
     vì inspect cần số đối số để tách đích/đối số trên ngăn xếp. --- */
  function parseMaki(data, makiId) {
    var id = makiId || "(maki)";
    var f = new MakiReader(data);
    var warnings = [];
    function fail(msg) { throw new Error("parseMaki " + id + ": " + msg + " (offset " + f.getPosition() + "/" + f._arr.length + ")"); }
    if (f.remaining() < 2) fail("file qua ngan, khong co magic");
    var magic = f.readStringOfLength(2);
    if (magic !== "FG") fail("magic " + JSON.stringify(magic) + " khac \"FG\" — khong phai file .maki");
    var version = f.readUInt16LE(); /* fork gọi là version; thực tế luôn 1027 */
    var formatVersion = f.readUInt32LE(); /* số phiên bản định dạng thật: 21/22/23 */

    var count = f.readUInt32LE();
    var classes = [];
    while (count--) {
      var identifier = "";
      var chunks = 4;
      while (chunks--) identifier += f.readUInt32LE().toString(16).padStart(8, "0");
      classes.push(identifier);
    }
    count = f.readUInt32LE();
    var methods = [];
    while (count--) {
      var classCode = f.readUInt16LE();
      var typeOffset = classCode & 0xff;
      f.readUInt16LE(); /* nửa cao của u32 — fork cũng bỏ qua */
      var name = f.readString().toLowerCase();
      methods.push({ name: name, typeOffset: typeOffset, classGuid: classes[typeOffset] || null, className: classNameOf(classes[typeOffset]) });
    }
    count = f.readUInt32LE();
    var variables = [];
    while (count--) {
      var typeOffset = f.readUInt8();
      var object = f.readUInt8();
      var subClass = f.readUInt16LE();
      var uinit1 = f.readUInt16LE();
      var uinit2 = f.readUInt16LE();
      f.readUInt16LE(); /* uinit3 */ f.readUInt16LE(); /* uinit4 */
      var global = f.readUInt8();
      f.readUInt8(); /* system — fork đọc luôn, kể cả formatVersion <= 22 */
      if (subClass) {
        var base = variables[typeOffset];
        if (!base) fail("bien subclass tro toi bien khong co #" + typeOffset);
        if (!base.members) { base.isClass = true; base.members = []; base.events = []; }
        variables.push({ type: "OBJECT", value: null, global: global, guid: base.guid });
        var idx = variables.length - 1;
        if (base.members.indexOf(idx) < 0) base.members.push(idx);
      } else if (object) {
        var klass = classes[typeOffset];
        if (klass == null) fail("bien object tro toi class khong co #" + typeOffset);
        variables.push({ type: "OBJECT", value: null, global: global, guid: klass });
      } else {
        var typeName = PRIMITIVE_TYPES[typeOffset];
        if (!typeName) fail("kieu primitive la " + typeOffset);
        var value = null;
        if (typeName === "BOOLEAN") value = uinit1;
        else if (typeName === "INT") value = uinit1;
        else if (typeName === "FLOAT" || typeName === "DOUBLE") {
          var exponent = (uinit2 & 0xff80) >> 7;
          var mantisse = ((0x80 | (uinit2 & 0x7f)) << 16) | uinit1;
          value = mantisse * Math.pow(2, exponent - 0x96);
        }
        variables.push({ global: global, type: typeName, value: value });
      }
    }
    count = f.readUInt32LE();
    var strings = [];
    while (count--) {
      var vi = f.readUInt32LE();
      var variable = variables[vi];
      if (!variable) fail("chuoi tro toi bien khong co #" + vi);
      var strVal = f.readString();
      variable.value = strVal;
      strings.push({ variableOffset: vi, value: strVal });
    }
    count = f.readUInt32LE();
    var bindings = [];
    while (count--) {
      var variableOffset = f.readUInt32LE();
      var methodOffset = f.readUInt32LE();
      var binaryOffset = f.readUInt32LE();
      bindings.push({ variableOffset: variableOffset, methodOffset: methodOffset, binaryOffset: binaryOffset, commandOffset: null });
      var aclass = variables[variableOffset];
      if (aclass) {
        if (!aclass.events) aclass.events = [];
        aclass.events.push(bindings.length - 1);
      }
    }
    var codeLength = f.readUInt32LE();
    var codeStart = f.getPosition();
    var commands = [];
    while (f.getPosition() < codeStart + codeLength) {
      var pos = f.getPosition() - codeStart;
      var opcode = f.readUInt8();
      var cmd = { offset: pos, opcode: opcode, name: (COMMANDS[opcode] || {}).name || ("op" + opcode), arg: null, argType: opcodeToArgType(opcode), argCount: null };
      if (cmd.argType !== "NONE") {
        if (cmd.argType === "COMMAND_OFFSET") cmd.arg = f.readInt32LE() + 5 + pos;
        else cmd.arg = f.readUInt32LE();
        /* Stack protection sau call 0x18 (fork: nhìn TRƯỚC 1 u32):
           0xFFFF0000..0xFFFF000F, 16 bit thấp = số đối số. */
        if (codeLength > pos + 5 + 4 && f.peekUInt32LE() >= 0xffff0000 && f.peekUInt32LE() <= 0xffff000f) {
          cmd.argCount = f.readUInt32LE() & 0xffff;
        }
        /* strangeCall 0x70: 1 byte sau immediate = số đối số. */
        if (opcode === 112) cmd.argCount = f.readUInt8();
      }
      commands.push(cmd);
    }
    /* Đổi binary offset -> chỉ số lệnh (như parser.ts của fork). */
    var offsetToCommand = {};
    commands.forEach(function (c, i) { if (c.offset != null) offsetToCommand[c.offset] = i; });
    bindings.forEach(function (b) { b.commandOffset = offsetToCommand[b.binaryOffset]; });
    commands.forEach(function (c) { if (c.argType === "COMMAND_OFFSET") c.arg = offsetToCommand[c.arg]; });

    /* Phần thừa sau code: file /debug có filepaths + line numbers.
       Thử đọc lướt cho hết; không đọc được thì chỉ warning. */
    if (!f.isEof()) {
      var debugStart = f.getPosition();
      try {
        var nPaths = f.readUInt32LE();
        /* Chặn số lượng vô lý (byte rác sau code mà đọc thành nPaths lớn
           sẽ lặp gần như vô hạn): mỗi path tối thiểu 4 byte. */
        if (nPaths > f.remaining() / 4 + 1) throw new Error("so filepath debug vo ly: " + nPaths);
        for (var pi = 0; pi < nPaths; pi++) {
          var plen = f.readUInt32LE();
          if (plen > f.remaining()) throw new Error("do dai filepath debug vo ly: " + plen);
          f.readStringOfLength(plen);
        }
        var nLines = f.readUInt32LE();
        if (nLines > f.remaining() / 12 + 1) throw new Error("so dong debug vo ly: " + nLines);
        for (var li = 0; li < nLines; li++) { f.readUInt32LE(); f.readUInt32LE(); f.readUInt32LE(); }
        if (!f.isEof()) warnings.push("con thua " + f.remaining() + " byte sau muc debug (offset " + debugStart + ")");
      } catch (e) {
        warnings.push("khong doc duoc muc debug sau code (" + (e && e.message ? e.message : e) + "); bo qua " + (f._arr.length - debugStart) + " byte thua");
      }
    }

    return {
      id: id, version: version, formatVersion: formatVersion,
      classes: classes, methods: methods, variables: variables,
      strings: strings, bindings: bindings, commands: commands,
      eof: f.isEof(), bytesLeft: f.remaining(), warnings: warnings
    };
  }

  /* --- Inspect: đi tuyến tính qua lệnh, mô phỏng ngăn xếp trừu tượng --- */
  function valToString(v) {
    if (!v) return "?";
    if (v.type === "STRING") return typeof v.value === "string" ? JSON.stringify(v.value) : "str?";
    if (v.type === "INT" || v.type === "FLOAT" || v.type === "DOUBLE" || v.type === "BOOLEAN") return String(v.value);
    if (v.type === "OBJECT") return v.desc ? v.desc : "obj?";
    return "?";
  }
  function inspectMaki(parsed) {
    var syms = parsed.variables.map(function (v) {
      return { type: v.type, value: v.value, guid: v.guid || null, desc: null };
    });
    var firstDesc = {};
    var stack = [];
    var events = [];
    var unknownArityCalls = [];
    function pushVal(v) { stack.push(v); }
    function popVal() { return stack.length ? stack.pop() : { type: "UNKNOWN", value: null }; }
    function noteFirstDesc(varIdx, desc) {
      if (desc && varIdx != null && firstDesc[varIdx] == null) firstDesc[varIdx] = desc;
    }
    for (var ip = 0; ip < parsed.commands.length; ip++) {
      var c = parsed.commands[ip];
      switch (c.opcode) {
        case 1: { /* push var */
          var s = syms[c.arg];
          pushVal(s ? { type: s.type, value: s.value, guid: s.guid, desc: s.desc, varIdx: c.arg } : { type: "UNKNOWN", value: null });
          break; }
        case 2: popVal(); break; /* pop */
        case 3: { /* popTo var */
          var a3 = popVal();
          if (syms[c.arg]) syms[c.arg] = { type: a3.type, value: a3.value, guid: syms[c.arg].guid, desc: a3.desc || syms[c.arg].desc };
          noteFirstDesc(c.arg, a3.desc);
          break; }
        case 8: case 9: case 10: case 11: case 12: case 13: /* so sánh */
        case 64: case 65: case 66: case 67: case 68: /* số học */
        case 80: case 81: case 88: case 89: case 90: case 91: {
          var ca = popVal(), cb = popVal();
          var cv = null;
          if (c.opcode === 64 && ca.type === "STRING" && cb.type === "STRING" && typeof ca.value === "string" && typeof cb.value === "string") cv = cb.value + ca.value;
          pushVal({ type: "INT", value: cv });
          break; }
        case 16: case 17: popVal(); break; /* jumpIf/jumpIfNot: pop điều kiện */
        case 18: stack.length = 0; break; /* jump: đầu khối mới */
        case 25: pushVal({ type: "UNKNOWN", value: null }); break; /* callGlobal */
        case 33: stack.length = 0; break; /* ret: đầu hàm mới */
        case 40: break; /* complete: noop */
        case 48: { /* mov: pop nguồn, pop đích, gán, push lại nguồn */
          var ma = popVal(), mb = popVal();
          if (mb && mb.varIdx != null && syms[mb.varIdx]) {
            syms[mb.varIdx] = { type: ma.type, value: ma.value, guid: syms[mb.varIdx].guid, desc: ma.desc || syms[mb.varIdx].desc };
          }
          noteFirstDesc(mb && mb.varIdx, ma.desc);
          pushVal(ma);
          break; }
        case 56: case 57: case 58: case 59: { /* ++/-- */
          var inc = popVal();
          pushVal({ type: inc.type, value: typeof inc.value === "number" ? inc.value : null });
          break; }
        case 74: case 76: { var un = popVal(); pushVal({ type: "INT", value: null }); break; }
        case 96: { /* new: immediate là offset vào bảng classes */
          var nguid = parsed.classes[c.arg];
          pushVal({ type: "OBJECT", value: null, guid: nguid, desc: "new " + (classNameOf(nguid) || nguid) });
          break; }
        case 97: popVal(); break; /* delete */
        case 24: case 112: { /* call / strangeCall */
          var m = parsed.methods[c.arg];
          var methodName = m ? m.name : "?";
          var className = m ? (m.className || m.classGuid || "?") : "?";
          var n = c.argCount;
          if (n == null && m) n = arityOf(className, methodName);
          var argCountKnown = (n != null); /* true cả khi arity tra từ bảng fork, chỉ false khi phải đoán bằng heuristic */
          if (n == null) {
            unknownArityCalls.push({ ip: ip, method: methodName, className: className });
            /* Heuristic: pop tới khi gặp OBJECT (tối đa 8), ghi rõ là đoán. */
            var tmp = [], guard = 0, foundObj = false;
            while (stack.length && guard < 8) {
              var pv = popVal(); guard++;
              if (pv.type === "OBJECT") { foundObj = true; tmp.unshift(pv); break; }
              tmp.unshift(pv);
            }
            var objH = foundObj ? tmp.shift() : popVal();
            var argsH = tmp;
            recordCall(ip, methodName, className, objH, argsH, false);
            continue;
          }
          var args = [];
          for (var k = 0; k < n; k++) args.push(popVal()); /* thứ tự pop = thứ tự mã nguồn */
          var obj = popVal();
          recordCall(ip, methodName, className, obj, args, argCountKnown);
          break; }
        default: break;
      }
    }
    function recordCall(ip2, methodName, className, obj, args, argCountKnown) {
      var target = obj.desc
        || (obj.varIdx != null
          ? "var#" + obj.varIdx + (obj.type === "OBJECT" && obj.guid ? " <" + (classNameOf(obj.guid) || obj.guid) + ">" : "")
          : valToString(obj));
      events.push({ ip: ip2, method: methodName, className: className, target: target, args: args.map(valToString), argCountKnown: !!argCountKnown });
      /* Giá trị trả về mang mô tả để lần gán sau đặt tên được. */
      var mn = methodName.toLowerCase();
      var ret = { type: "UNKNOWN", value: null };
      if (mn === "findobject" && args[0] && args[0].type === "STRING" && typeof args[0].value === "string") {
        ret = { type: "OBJECT", value: null, desc: "findObject(" + JSON.stringify(args[0].value) + ")" };
      } else if (mn === "getscriptgroup") {
        ret = { type: "OBJECT", value: null, desc: "scriptGroup" };
      } else if (mn === "getcontainer" && args[0] && args[0].type === "STRING" && typeof args[0].value === "string") {
        ret = { type: "OBJECT", value: null, desc: "container:" + args[0].value };
      } else if (mn === "getlayout" && args[0] && args[0].type === "STRING" && typeof args[0].value === "string") {
        ret = { type: "OBJECT", value: null, desc: (obj.desc || "container") + "|layout:" + args[0].value };
      } else if ((mn === "getgroup" || mn === "getobject") && args[0] && args[0].type === "STRING" && typeof args[0].value === "string") {
        ret = { type: "OBJECT", value: null, desc: (mn === "getgroup" ? "group:" : "object:") + args[0].value };
      } else if (mn === "getparentlayout") {
        ret = { type: "OBJECT", value: null, desc: "parentLayout of " + (obj.desc || "?") };
      }
      pushVal(ret);
    }
    /* Đặt tên đích var#N + binding bằng lần gán đầu đã ghi. */
    events.forEach(function (e) {
      var mm = /^var#(\d+)/.exec(e.target);
      if (mm && firstDesc[mm[1]]) e.target = firstDesc[mm[1]] + " (var#" + mm[1] + ")";
    });
    var bindings = parsed.bindings.map(function (b) {
      var mm2 = parsed.methods[b.methodOffset];
      return {
        method: mm2 ? mm2.name : "?", className: mm2 ? (mm2.className || mm2.classGuid || "?") : "?",
        variableOffset: b.variableOffset, variableDesc: firstDesc[b.variableOffset] || null,
        binaryOffset: b.binaryOffset, commandOffset: b.commandOffset
      };
    });
    function isVis(e) { return e.method === "show" || e.method === "hide" || e.method === "setxmlparam"; }
    function isText(e) { return e.method === "settext" || e.method === "setxmlparam"; }
    var callsByMethod = {};
    events.forEach(function (e) {
      var key = e.className + "." + e.method;
      callsByMethod[key] = (callsByMethod[key] || 0) + 1;
    });
    return {
      id: parsed.id, bindings: bindings, events: events,
      visibility: events.filter(isVis),
      textSets: events.filter(isText),
      xmlParams: events.filter(function (e) { return e.method === "setxmlparam"; }),
      callsByMethod: callsByMethod,
      unknownArityCalls: unknownArityCalls,
      stats: {
        commands: parsed.commands.length, calls: events.length,
        bindings: bindings.length, methods: parsed.methods.length,
        variables: parsed.variables.length, strings: parsed.strings.length,
        classes: parsed.classes.length, unknownArity: unknownArityCalls.length
      }
    };
  }

  /* Inspect nhiều file .maki (vd toàn bộ skin): [{name, data}] -> kết quả
     từng file; file lỗi không làm hỏng các file khác (ghi vào .error). */
  function inspectSkinFiles(files) {
    var results = [];
    var totals = { files: 0, ok: 0, errors: 0, commands: 0, calls: 0, bindings: 0, visibility: 0, textSets: 0, unknownArity: 0 };
    (files || []).forEach(function (f) {
      totals.files++;
      try {
        var parsed = parseMaki(f.data, f.name);
        var insp = inspectMaki(parsed);
        totals.ok++;
        totals.commands += insp.stats.commands;
        totals.calls += insp.stats.calls;
        totals.bindings += insp.stats.bindings;
        totals.visibility += insp.visibility.length;
        totals.textSets += insp.textSets.length;
        totals.unknownArity += insp.stats.unknownArity;
        results.push({
          name: f.name, size: (f.data && f.data.byteLength != null) ? f.data.byteLength : (f.data && f.data.length) || 0,
          version: parsed.version, formatVersion: parsed.formatVersion,
          warnings: parsed.warnings, inspect: insp
        });
      } catch (e) {
        totals.errors++;
        results.push({ name: f.name, size: (f.data && f.data.byteLength != null) ? f.data.byteLength : (f.data && f.data.length) || 0, error: (e && e.message ? e.message : String(e)) });
      }
    });
    return { results: results, totals: totals };
  }

  return {
    MAKI_VERSION: MAKI_VERSION,
    EXPECTED_MAKI_VERSION: EXPECTED_MAKI_VERSION,
    MANIFEST_VERSION: MANIFEST_VERSION,
    MANIFEST_MISMATCH: MANIFEST_MISMATCH,
    COMMANDS: COMMANDS,
    parseMaki: parseMaki,
    inspectMaki: inspectMaki,
    inspectSkinFiles: inspectSkinFiles,
    formatGuid: formatGuid,
    classNameOf: classNameOf
  };
});
