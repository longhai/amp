"use strict";
let videoHls = null, videoEl = null, videoChan = null;
function onVideoButton(b){
  const a = b.action;
  if (a === "CLOSE") toggleWindow("video");
  else if (a === "MINIMIZE") toggleWindow("video");
  else onMainButton(b);
}
function destroyVideoHls(){ if (videoHls) { try { videoHls.destroy(); } catch (e) {} videoHls = null; } }
function stopVideoPlayback(){
  destroyVideoHls();
  if (videoEl) { try { videoEl.pause(); } catch (e) {} try { videoEl.removeAttribute("src"); videoEl.load(); } catch (e) {} }
  videoChan = null;
}
function playVideoChannel(c, autoplay){
  if (!videoEl) return false;
  videoChan = c;
  destroyVideoHls();
  const url = c.url;
  const go = () => { if (autoplay) videoEl.play().catch(() => {}); };
  if (/\.m3u8($|\?)/i.test(url) && window.Hls && Hls.isSupported()) {
    videoHls = new Hls({ maxBufferLength: 30 });
    videoHls.loadSource(url);
    videoHls.attachMedia(videoEl);
    videoHls.on(Hls.Events.MANIFEST_PARSED, go);
    videoHls.on(Hls.Events.ERROR, (ev, data) => {
      if (!data || !data.fatal) return;
      if (data.type === Hls.ErrorTypes.NETWORK_ERROR) { try { videoHls.startLoad(); } catch (e) {} return; }
      if (data.type === Hls.ErrorTypes.MEDIA_ERROR) { try { videoHls.recoverMediaError(); } catch (e) {} return; }
      handleFail("Video HLS " + (data.type || "") + " " + (data.details || ""));
    });
  } else {
    videoEl.src = url;
    go();
  }
  return true;
}
window.playVideoChannel = playVideoChannel;
window.stopVideoPlayback = stopVideoPlayback;
function bindVideoEl(el){
  el.addEventListener("playing", () => { playing = true; updatePlayState(); onPlayStart(); failCount = 0; });
  el.addEventListener("pause", () => { playing = false; updatePlayState(); onPlayPause(); });
  el.addEventListener("error", () => {
    if (videoChan && videoEl && videoEl.error) handleFail("Video: " + (videoEl.error.message || videoEl.error.code || ""));
  });
}
async function buildVideoWindow(skin, res){
  const win = document.createElement("div");
  win.className = "win"; win.id = "vidwin";
  const vd = skin.video;
  const mkVideo = (rect) => {
    const box = document.createElement("div");
    box.style.position = "absolute";
    box.style.left = rect.x + "px"; box.style.top = rect.y + "px";
    box.style.width = rect.w + "px"; box.style.height = rect.h + "px";
    box.style.background = "#000";
    const v = document.createElement("video");
    v.playsInline = true; v.controls = false; v.preload = "none";
    v.crossOrigin = "anonymous";
    v.style.width = "100%"; v.style.height = "100%";
    box.appendChild(v);
    win.appendChild(box);
    videoEl = v;
    bindVideoEl(v);
    win._flexBox = box; win._flexRect = { x: rect.x, y: rect.y, w: rect.w, h: rect.h };
    win._flexVideo = v;
    return box;
  };
  if (vd) {
    const sz = getWinSize("video", vd.w, vd.h);
    win.dataset.w = sz.w; win.dataset.h = sz.h;
    win.style.width = sz.w + "px"; win.style.height = sz.h + "px";
    win.style.backgroundColor = "#000";
    if (vd.backgroundFile) {
      const bg = await resolveImg(res, vd.background, vd.backgroundFile);
      if (bg) { win.style.backgroundImage = "url(" + JSON.stringify(bg) + ")"; win.style.backgroundSize = sz.w + "px " + sz.h + "px"; win._bgImg = true; }
    }
    await renderFrameInto(win, vd.frame, res);
    for (const b of (vd.frame && vd.frame.buttons || [])) b._winKind = "video";
    for (const bg of (vd.backgrounds || [])) {
      if (!bg.imageFile) continue;
      const src = await resolveImg(res, bg.image, bg.imageFile);
      if (src) win.appendChild(imgElSrc(src, bg.x, bg.y, bg.w, bg.h));
    }
    for (const lay of vd.layers) {
      if (!lay.imageFile) continue;
      const src = await resolveImg(res, lay.image, lay.imageFile);
      if (src) win.appendChild(imgElSrc(src, lay.x, lay.y, lay.w, lay.h));
    }
    const r = (vd.listRect && vd.listRect.w > 20 && vd.listRect.h > 20) ? vd.listRect
      : { x: 6, y: 24, w: sz.w - 12, h: sz.h - 30 };
    mkVideo(r);
    win._flexInsetR = sz.w - (r.x + r.w); win._flexInsetB = sz.h - (r.y + r.h);
    for (const b of vd.buttons) await buildButton(b, win, res, onVideoButton);
  } else {
    const sz = getWinSize("video", 354, 220);
    win.dataset.w = sz.w; win.dataset.h = sz.h;
    win.classList.add("plfallback");
    win.style.width = sz.w + "px"; win.style.height = sz.h + "px";
    const title = document.createElement("div");
    title.className = "title"; title.textContent = "Video";
    win.appendChild(title);
    const x = document.createElement("button");
    x.className = "x"; x.textContent = "✕";
    x.addEventListener("click", () => toggleWindow("video"));
    win.appendChild(x);
    mkVideo({ x: 6, y: 24, w: sz.w - 12, h: sz.h - 30 });
    win._flexInsetR = 6; win._flexInsetB = 6;
  }
  addResizeHandle(win, "video");
  return win;
}
