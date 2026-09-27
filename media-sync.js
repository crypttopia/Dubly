// Isolated content script. Briefly holds the active media so the first dubbed
// audio can catch up, then restores playback.
(() => {
  if (globalThis.__dublyMediaSync) return globalThis.__dublyMediaSync.describe();
  let session = '', heldMedia = null, resumeTimer = 0, heldByDubly = false;

  function candidates(root = document) {
    const found = [...root.querySelectorAll('video,audio')];
    for (const element of root.querySelectorAll('*')) {
      if (element.shadowRoot) found.push(...candidates(element.shadowRoot));
    }
    return found;
  }

  function choose() {
    return candidates().filter(item => item instanceof HTMLAudioElement || (() => {
      const rect = item.getBoundingClientRect();
      return rect.width > 80 && rect.height > 45;
    })()).sort((a, b) => Number(!b.paused) - Number(!a.paused)
      || Number(b instanceof HTMLVideoElement) - Number(a instanceof HTMLVideoElement)
      || b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight)[0] || null;
  }

  function describe() {
    const item = choose();
    return {hasMedia: !!item, hasVideo: item instanceof HTMLVideoElement, playing: !!item && !item.paused, area: item instanceof HTMLVideoElement ? item.clientWidth * item.clientHeight : 0};
  }

  function forgetHold() {
    clearTimeout(resumeTimer); resumeTimer = 0;
    heldMedia?.removeEventListener('play', onExternalPlay);
    heldMedia = null; heldByDubly = false;
  }

  function onExternalPlay() {
    // The viewer resumed playback before our timer; respect that choice.
    if (heldByDubly) forgetHold();
  }

  function resume() {
    const item = heldMedia;
    const shouldResume = heldByDubly && item?.isConnected && item.paused && !item.ended;
    forgetHold();
    if (shouldResume) void item.play().catch(() => {});
  }

  function hold(durationMs) {
    if (heldByDubly) return {held: true};
    const item = choose();
    if (!item || item.paused || item.ended || item.seeking) return {held: false};
    const duration = Math.max(450, Math.min(3000, Number(durationMs) || 0));
    heldMedia = item; heldByDubly = true;
    item.addEventListener('play', onExternalPlay);
    item.pause();
    resumeTimer = setTimeout(resume, duration);
    return {held: true, durationMs: duration};
  }

  function end() { resume(); session = ''; }

  chrome.runtime.onMessage.addListener((message, sender, reply) => {
    if (message.target !== 'mediaSync') return;
    if (message.type === 'begin') { end(); session = message.session; reply(describe()); return; }
    if (message.session !== session) return;
    if (message.type === 'hold') { reply(hold(message.durationMs)); return; }
    if (message.type === 'end') { end(); reply({ok: true}); }
  });

  globalThis.__dublyMediaSync = {describe, end};
  return describe();
})();
