// Isolated content script. Receives translated text only, never an API key.
(() => {
  if (globalThis.__dublySubtitles) return globalThis.__dublySubtitles.describe();
  let session = '', media, video, track, expiry, scan, observer, floating = false, overlay, overlayTimer;
  let floatingText = '', floatingUntil = 0, attachTimer = 0, lastScan = -Infinity, cachedCandidates = [];
  function isRtl(text) {
    const first = text.match(/\p{L}/u)?.[0] || '';
    return /[\u0590-\u08ff\ufb1d-\ufdff\ufe70-\ufeff]/.test(first);
  }
  const tracks = new WeakMap();
  function candidates(root = document) {
    const found = [...root.querySelectorAll('video,audio')];
    for (const element of root.querySelectorAll('*')) if (element.shadowRoot) found.push(...candidates(element.shadowRoot));
    return found;
  }
  function choose() {
    if (Date.now() - lastScan >= 1000) { cachedCandidates = candidates(); lastScan = Date.now(); }
    return cachedCandidates.filter(item => item.isConnected).filter(item => item instanceof HTMLAudioElement || (() => { const r=item.getBoundingClientRect();return r.width>80&&r.height>45; })())
      .sort((a,b) => Number(!b.paused)-Number(!a.paused) || Number(b instanceof HTMLVideoElement)-Number(a instanceof HTMLVideoElement) || b.clientWidth*b.clientHeight-a.clientWidth*a.clientHeight)[0];
  }
  function clear() {
    clearTimeout(expiry);
    clearTimeout(overlayTimer);
    floatingText = ''; floatingUntil = 0;
    if (track) for (const cue of [...(track.cues || [])]) track.removeCue(cue);
    overlay?.remove(); overlay = null;
  }
  function syncFloating() {
    if (!floatingText) return;
    const fullscreen = document.fullscreenElement;
    const videoFullscreen = !!video && fullscreen === video;
    if (track) {
      for (const cue of [...(track.cues || [])]) track.removeCue(cue);
      track.mode = videoFullscreen ? 'showing' : 'hidden';
    }
    if (videoFullscreen) {
      overlay?.remove(); overlay = null;
      if (track) {
        const remaining = Math.max(.1, (floatingUntil - Date.now()) / 1000);
        const cue = new VTTCue(video.currentTime, video.currentTime + remaining * Math.max(1, video.playbackRate), floatingText);
        const rtl = isRtl(floatingText);
        cue.align = rtl ? 'right' : 'left'; cue.position = rtl ? 90 : 10; cue.positionAlign = rtl ? 'line-right' : 'line-left'; cue.line = -3; cue.size = 80;
        track.addCue(cue);
      }
      return;
    }
    if (!overlay) {
      overlay = document.createElement('div'); overlay.id = 'dubly-floating-caption';
      Object.assign(overlay.style, {position:'fixed',left:'50%',bottom:'11%',transform:'translateX(-50%)',zIndex:'2147483647',maxWidth:'82%',padding:'9px 18px',borderRadius:'10px',background:'rgba(0,0,0,.82)',color:'#fff',font:'600 20px/1.65 Vazirmatn,Tahoma,sans-serif',textAlign:'right',direction:'rtl',pointerEvents:'none',boxShadow:'0 2px 16px #0008'});
    }
    const host = fullscreen && media && (fullscreen===media || fullscreen.contains(media)) ? fullscreen : document.documentElement;
    if (overlay.parentNode !== host) host.append(overlay);
    overlay.textContent = floatingText;
    overlay.style.direction = isRtl(floatingText) ? 'rtl' : 'ltr';
    overlay.style.textAlign = isRtl(floatingText) ? 'right' : 'left';
  }
  function onFullscreenChange() { if (floatingText) syncFloating(); }
  function show(text, delayMs) {
    if (media && (media.paused || media.seeking)) { clear(); return; }
    if (floating || !video) {
      clearTimeout(overlayTimer); clearTimeout(expiry);
      overlayTimer=setTimeout(()=>{
        floatingText = text;
        const duration = Math.max(2200,Math.min(5000,900+text.length*45));
        floatingUntil = Date.now() + duration;
        syncFloating();
        expiry = setTimeout(clear, duration);
      },Math.max(0,Math.min(1500,Number(delayMs)||0)));
      return;
    }
    if (track) for (const cue of [...(track.cues || [])]) track.removeCue(cue);
    const seconds = Math.max(1.4, Math.min(3.2, .8 + text.split(/\s+/).length / 4));
    const safeText = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const start = video.currentTime + Math.max(0, Math.min(1500, Number(delayMs) || 0)) / 1000;
    const cue = new VTTCue(start, start + seconds * Math.max(1, video.playbackRate), safeText);
    const rtl = isRtl(text);
    cue.align = rtl ? 'right' : 'left';
    cue.position = rtl ? 90 : 10; cue.positionAlign = rtl ? 'line-right' : 'line-left'; cue.line = -3; cue.size = 80;
    track.mode = 'showing'; track.addCue(cue);
    expiry = setTimeout(clear, (Math.max(0, start - video.currentTime) + seconds) * 1000);
  }
  function detach() {
    clear();
    if (track) track.mode = 'disabled';
    if (media) { media.removeEventListener('seeking', clear); media.removeEventListener('pause', clear); media.removeEventListener('ended', clear); }
    media = video = track = null;
  }
  function attach() {
    const next = (media?.isConnected && !media.paused ? media : choose()) || null;
    if (next === media) return;
    detach(); media = next;
    video = media instanceof HTMLVideoElement ? media : null;
    if (!media) return;
    media.addEventListener('seeking', clear); media.addEventListener('pause', clear); media.addEventListener('ended', clear);
    if (!video) return;
    track = tracks.get(video);
    if (!track) { track = video.addTextTrack('subtitles', 'Dubly'); tracks.set(video, track); }
    track.mode = floating ? 'hidden' : 'showing';
  }
  function stop() { session = ''; clearInterval(scan); clearTimeout(attachTimer); attachTimer = 0; cachedCandidates = []; lastScan = -Infinity; observer?.disconnect(); document.removeEventListener('fullscreenchange', onFullscreenChange); detach(); }
  function describe() { const item=choose();return {hasVideo:item instanceof HTMLVideoElement,hasAudio:item instanceof HTMLAudioElement,hasMedia:!!item,playing:!!item&&!item.paused,area:item instanceof HTMLVideoElement?item.clientWidth*item.clientHeight:0,hasOverlay:!!overlay}; }
  chrome.runtime.onMessage.addListener((message, sender, reply) => {
    if (message.target !== 'subtitles') return;
    if (message.type === 'begin') {
      stop(); session = message.session; floating = !!message.floating; attach();
      document.addEventListener('fullscreenchange', onFullscreenChange);
      scan = setInterval(attach, 1000);
      observer = new MutationObserver(() => {
        if (media?.isConnected || attachTimer) return;
        attachTimer = setTimeout(() => { attachTimer = 0; attach(); }, 1000);
      });
      observer.observe(document.documentElement, {childList: true, subtree: true});
      reply(describe()); return;
    }
    if (message.session !== session) return;
    if (message.type === 'end') { stop(); reply({ok:true}); return; }
    if (message.type === 'clear') { clear(); reply({ok:true}); return; }
    if (message.type === 'text') {
      attach();
      if ((!media || (!media.paused && !media.seeking)) && message.text) {
        // Video uses native cues in native fullscreen. Audio-only and custom
        // WebAudio players use the page-level overlay.
        show(String(message.text).slice(0, 240), message.delayMs);
      }
      reply({ok:true,hasMedia:!!media,hasVideo:!!video});
    }
  });
  globalThis.__dublySubtitles = {describe};
  return describe();
})();
