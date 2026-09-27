importScripts('activity.js');
let starting = false;
let activityQueue = Promise.resolve();
function testConnection(key, language) {
  return new Promise(resolve => {
    let socket, finished = false;
    const done = result => { if (finished) return; finished = true; clearTimeout(timeout); socket?.close(); resolve(result); };
    const timeout = setTimeout(() => done({error: 'Connection test timed out.'}), 15000);
    try {
      socket = new WebSocket('wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=' + encodeURIComponent(key));
      socket.onopen = () => socket.send(JSON.stringify({setup: {model: 'models/gemini-3.5-live-translate-preview', outputAudioTranscription: {}, generationConfig: {responseModalities: ['AUDIO'], translationConfig: {targetLanguageCode: language || 'fa', echoTargetLanguage: true}}}}));
      socket.onmessage = async event => {
        try { const data = JSON.parse(typeof event.data === 'string' ? event.data : await event.data.text()); if (data.setupComplete) done({verified: true}); else if (data.error) done({error: 'Google rejected the connection test. Code: ' + (data.error.code || 'unknown')}); }
        catch { done({error: 'Invalid connection test response.'}); }
      };
      socket.onclose = event => done({error: 'Connection test failed. Code: ' + event.code});
      socket.onerror = () => {};
    } catch { done({error: 'Connection test failed.'}); }
  });
}
function activityTask(message) {
  const task = activityQueue.then(async () => {
    const stored = await chrome.storage.local.get(['activity', 'trackingEnabled', 'activitySince']);
    if (message.type === 'activitySample') {
      if (stored.trackingEnabled === false) return {};
      const activity = addActivity(stored.activity || {}, message.sample, stored.activitySince || 0);
      await chrome.storage.local.set({activity});
      return {};
    }
    if (message.type === 'activityClear') {
      await chrome.storage.local.set({activity: {}, activitySince: Date.now()});
      return {ok: true};
    }
    if (message.type === 'activityTracking') {
      await chrome.storage.local.set({trackingEnabled: !!message.enabled, activitySince: Date.now()});
      return {ok: true};
    }
    const activity = stored.activity || {};
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 365);
    for (const day of Object.keys(activity)) if (day < activityDay(cutoff)) delete activity[day];
    await chrome.storage.local.set({activity});
    return {activity, enabled: stored.trackingEnabled !== false};
  });
  activityQueue = task.catch(() => {});
  return task;
}
async function hasOffscreen() {
  return (await chrome.runtime.getContexts({contextTypes: ['OFFSCREEN_DOCUMENT']})).length > 0;
}
async function endSubtitles() {
  const {subtitleTarget} = await chrome.storage.session.get('subtitleTarget');
  await chrome.storage.session.remove('subtitleTarget');
  if (subtitleTarget) {
    try { await chrome.tabs.sendMessage(subtitleTarget.tabId, {target:'subtitles', type:'end', session:subtitleTarget.session}, {frameId:subtitleTarget.frameId}); } catch {}
  }
}
async function endMediaSync() {
  const {mediaSyncTarget} = await chrome.storage.session.get('mediaSyncTarget');
  await chrome.storage.session.remove('mediaSyncTarget');
  if (mediaSyncTarget) {
    try { await chrome.tabs.sendMessage(mediaSyncTarget.tabId, {target:'mediaSync', type:'end', session:mediaSyncTarget.session}, {frameId:mediaSyncTarget.frameId}); } catch {}
  }
}
async function prepareMediaSync(tabId, session) {
  let frames = await chrome.scripting.executeScript({target:{tabId}, files:['media-sync.js']});
  if (!frames.some(frame => frame.result?.hasMedia)) {
    try { frames = await chrome.scripting.executeScript({target:{tabId, allFrames:true}, files:['media-sync.js']}); } catch {}
  }
  const best = frames.filter(frame => frame.result?.hasMedia)
    .sort((a,b) => Number(b.result.playing)-Number(a.result.playing) || b.result.area-a.result.area)[0]
    || frames.find(frame => frame.frameId === 0) || frames[0];
  if (!best) return;
  const mediaSyncTarget = {tabId, frameId:best.frameId, session};
  await chrome.storage.session.set({mediaSyncTarget});
  try { await chrome.tabs.sendMessage(tabId, {target:'mediaSync', type:'begin', session}, {frameId:best.frameId}); } catch {}
}
async function sendVoiceToPage(type, session, extra = {}) {
  const {voiceTarget} = await chrome.storage.session.get('voiceTarget');
  if (!voiceTarget || voiceTarget.session !== session) return {};
  try { await chrome.tabs.sendMessage(voiceTarget.tabId,{target:'voiceTyping',type,session,...extra},{frameId:voiceTarget.frameId}); } catch {}
  return {};
}
function voiceSite(tab = {}) {
  let domain = '';
  try { domain = new URL(tab.url || '').hostname.replace(/^www\./, ''); } catch {}
  const names = {'web.telegram.org':'Telegram','telegram.org':'Telegram','youtube.com':'YouTube','x.com':'X','twitter.com':'X','web.whatsapp.com':'WhatsApp'};
  return {supported:!!tab.id && /^https?:/.test(tab.url || ''),tabId:tab.id||null,domain,title:names[domain] || domain || tab.title || ''};
}
async function activeVoiceContext() {
  const [tab] = await chrome.tabs.query({active:true,currentWindow:true});
  return voiceSite(tab);
}
async function enableVoiceTyping(tabId) {
  const tab = tabId ? await chrome.tabs.get(tabId) : (await chrome.tabs.query({active:true,currentWindow:true}))[0];
  if (!tab?.id || !/^https?:/.test(tab.url || '')) throw new Error('Voice Typing را روی یک صفحهٔ وب باز کنید.');
  const session=crypto.randomUUID();
  const {uiLanguage}=await chrome.storage.local.get('uiLanguage');
  await chrome.scripting.executeScript({target:{tabId:tab.id},files:['voice-typing.js']});
  await chrome.storage.session.set({voiceTarget:{tabId:tab.id,frameId:0,session}});
  await chrome.tabs.sendMessage(tab.id,{target:'voiceTyping',type:'enable',session,uiLanguage});
  return {enabled:true,session};
}
async function openVoicePermission() {
  const context = await activeVoiceContext();
  if (!context.supported) return {opened:false,error:'Voice Typing را روی یک صفحهٔ معمولی وب باز کنید؛ صفحات داخلی Chrome پشتیبانی نمی‌شوند.'};
  let {microphoneGranted}=await chrome.storage.local.get('microphoneGranted');
  if (!microphoneGranted) {
    try { microphoneGranted=(await navigator.permissions.query({name:'microphone'})).state === 'granted'; } catch {}
    if (microphoneGranted) await chrome.storage.local.set({microphoneGranted:true});
  }
  if (microphoneGranted) return enableVoiceTyping(context.tabId);
  const url = chrome.runtime.getURL('mic-permission.html') + '?tabId=' + encodeURIComponent(context.tabId) + '&site=' + encodeURIComponent(context.title || context.domain);
  await chrome.windows.create({url,type:'popup',width:430,height:480,focused:true});
  return {opened:true,site:context.title || context.domain};
}
async function stopVoiceTyping(removeControl = false) {
  const {voiceTarget}=await chrome.storage.session.get('voiceTarget');
  if (await hasOffscreen()) await chrome.runtime.sendMessage({target:'audio',type:'voiceStop'}).catch(()=>{});
  if (removeControl && voiceTarget) await sendVoiceToPage('disable',voiceTarget.session);
  if (removeControl) await chrome.storage.session.remove('voiceTarget');
  return {state:'idle'};
}
async function stopVoiceTypingForTab(tabId) {
  const {voiceTarget}=await chrome.storage.session.get('voiceTarget');
  if (voiceTarget?.tabId === tabId) await stopVoiceTyping(true);
}
async function pauseVoiceTypingForNavigation(tabId) {
  const {voiceTarget}=await chrome.storage.session.get('voiceTarget');
  if (voiceTarget?.tabId !== tabId || !await hasOffscreen()) return;
  await chrome.runtime.sendMessage({target:'audio',type:'voiceStop'}).catch(()=>{});
}
async function restoreVoiceTypingForTab(tabId, updatedTab) {
  const {voiceTarget}=await chrome.storage.session.get('voiceTarget');
  if (voiceTarget?.tabId !== tabId) return;
  const tab=updatedTab?.url?updatedTab:await chrome.tabs.get(tabId);
  if (!/^https?:/.test(tab?.url||'')) return;
  const {uiLanguage}=await chrome.storage.local.get('uiLanguage');
  await chrome.scripting.executeScript({target:{tabId},files:['voice-typing.js']});
  await chrome.tabs.sendMessage(tabId,{target:'voiceTyping',type:'enable',session:voiceTarget.session,uiLanguage},{frameId:voiceTarget.frameId});
  if (await hasOffscreen()) {
    const state=await chrome.runtime.sendMessage({target:'audio',type:'voiceStatus'}).catch(()=>({state:'idle'}));
    if (state.error) await sendVoiceToPage('error',voiceTarget.session,{error:state.error});
    else await sendVoiceToPage('state',voiceTarget.session,{state:state.state||'idle'});
  }
}
async function toggleVoiceTyping(session) {
  const {voiceTarget}=await chrome.storage.session.get('voiceTarget');
  if (!voiceTarget || voiceTarget.session!==session) return {};
  const {key}=await chrome.storage.local.get('key');
  if (!key?.trim()) { await sendVoiceToPage('error',session,{error:'کلید Gemini API را در تنظیمات Dubly ذخیره کنید.'}); return {}; }
  if (await hasOffscreen()) {
    const state=await chrome.runtime.sendMessage({target:'audio',type:'voiceStatus'}).catch(()=>({state:'idle'}));
    if (state.state==='listening'||state.state==='connecting') return stopVoiceTyping(false);
  } else await chrome.offscreen.createDocument({url:'offscreen.html',reasons:['USER_MEDIA','AUDIO_PLAYBACK'],justification:'Capture the user microphone for direct Google speech-to-text.'});
  return chrome.runtime.sendMessage({target:'audio',type:'voiceStart',session,key:key.trim(),languageCodes:[]});
}
let voiceNavigationQueue=Promise.resolve();
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'loading' && changeInfo.status !== 'complete') return;
  voiceNavigationQueue=voiceNavigationQueue.then(async()=>{
    if (changeInfo.status === 'loading') await pauseVoiceTypingForNavigation(tabId);
    else await restoreVoiceTypingForTab(tabId,tab);
  }).catch(()=>{});
});
chrome.tabs.onRemoved.addListener(tabId => { void stopVoiceTypingForTab(tabId); });
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (message.target !== 'background') return;
  (async () => {
    if (message.type === 'voiceState') return sendVoiceToPage('state',message.session,{state:message.state});
    if (message.type === 'voiceText') return sendVoiceToPage('text',message.session,{text:message.text,final:!!message.final});
    if (message.type === 'voiceError') return sendVoiceToPage('error',message.session,{error:message.error});
    if (message.type === 'voiceContext') return activeVoiceContext();
    if (message.type === 'voicePermissionFlow') return openVoicePermission();
    if (message.type === 'voiceEnableForTab') return enableVoiceTyping(Number(message.tabId));
    if (message.type === 'voiceLanguage') {
      const {voiceTarget}=await chrome.storage.session.get('voiceTarget');
      if (voiceTarget) await sendVoiceToPage('language',voiceTarget.session,{uiLanguage:message.uiLanguage});
      return {};
    }
    if (message.type === 'openMicrophoneSettings') { await chrome.tabs.create({url:'chrome://settings/content/microphone'}); return {opened:true}; }
    if (message.type === 'voiceEnable') return enableVoiceTyping();
    if (message.type === 'voiceDisable') return stopVoiceTyping(true);
    if (message.type === 'voiceToggle') return toggleVoiceTyping(message.session);
    if (message.type === 'voiceStatus') {
      if (!await hasOffscreen()) return {state:'idle'};
      return chrome.runtime.sendMessage({target:'audio',type:'voiceStatus'});
    }
    if (message.type === 'subtitleText' || message.type === 'subtitleEnd' || message.type === 'subtitleClear') {
      if (sender.url !== chrome.runtime.getURL('offscreen.html')) return {};
      const {subtitleTarget} = await chrome.storage.session.get('subtitleTarget');
      if (!subtitleTarget || subtitleTarget.session !== message.session) return {};
      if (message.type === 'subtitleEnd') { await endSubtitles(); return {}; }
      try { await chrome.tabs.sendMessage(subtitleTarget.tabId, {target:'subtitles', type:message.type === 'subtitleClear' ? 'clear' : 'text', session:message.session, text:message.text, delayMs:message.delayMs}, {frameId:subtitleTarget.frameId}); } catch {}
      return {};
    }
    if (message.type === 'syncHold' || message.type === 'syncEnd') {
      if (sender.url !== chrome.runtime.getURL('offscreen.html')) return {};
      const {mediaSyncTarget} = await chrome.storage.session.get('mediaSyncTarget');
      if (!mediaSyncTarget || mediaSyncTarget.session !== message.session) return {};
      if (message.type === 'syncEnd') { await endMediaSync(); return {}; }
      try {
        return await chrome.tabs.sendMessage(mediaSyncTarget.tabId, {target:'mediaSync', type:'hold', session:message.session, durationMs:message.durationMs}, {frameId:mediaSyncTarget.frameId});
      } catch { return {}; }
    }
    if (message.type === 'testKey') {
      if (!message.key?.trim()) return {error: 'Enter an API key.'};
      return testConnection(message.key.trim(), message.language);
    }
    if (message.type.startsWith('activity')) return activityTask(message);
    if (message.type === 'status') {
      return await hasOffscreen() ? chrome.runtime.sendMessage({target: 'audio', type: 'status'}) : {state: 'idle'};
    }
    if (message.type === 'stop') {
      if (await hasOffscreen()) {
        const voice = await chrome.runtime.sendMessage({target:'audio',type:'voiceStatus'}).catch(()=>({state:'idle'}));
        if (voice.state === 'listening' || voice.state === 'connecting') await stopVoiceTyping(false);
        await chrome.runtime.sendMessage({target: 'audio', type: 'stop'});
        await chrome.offscreen.closeDocument();
      }
      await endSubtitles();
      await endMediaSync();
      await chrome.action.setBadgeText({text: ''});
      return {state: 'idle'};
    }
    if (message.type === 'volume') {
      return await hasOffscreen() ? chrome.runtime.sendMessage({target: 'audio', type: 'volume', originalVolume: message.originalVolume, dubVolume: message.dubVolume}) : {state: 'idle'};
    }
    if (message.type === 'start') {
      if (starting) throw new Error('در حال اتصال…');
      starting = true;
      try {
        if (await hasOffscreen()) {
          const voice = await chrome.runtime.sendMessage({target:'audio',type:'voiceStatus'}).catch(()=>({state:'idle'}));
          if (voice.state === 'listening' || voice.state === 'connecting') await stopVoiceTyping(false);
          await chrome.runtime.sendMessage({target: 'audio', type: 'stop'});
          await chrome.offscreen.closeDocument();
        }
        await endSubtitles();
        await endMediaSync();
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
        if (!tab?.id || !/^https?:/.test(tab.url || '')) throw new Error('افزونه را روی یک صفحهٔ معمولی وب باز کنید.');
        if (!message.key?.trim()) throw new Error('کلید API را وارد کنید.');
        const mode = ['subtitles','both'].includes(message.mode) ? message.mode : 'dubbing';
        const subtitleSession = crypto.randomUUID();
        const floatingCaptions = !!message.floatingCaptions;
        if (mode !== 'subtitles') await prepareMediaSync(tab.id, subtitleSession);
        if (mode !== 'dubbing' || floatingCaptions) {
          let frames = await chrome.scripting.executeScript({target:{tabId:tab.id}, files:['subtitles.js']});
          // Prefer a real video frame for native fullscreen captions. If the
          // tab is audio-only (or uses WebAudio), keep the overlay in frame 0.
          if (!frames.some(frame => frame.result?.hasVideo)) {
            try { frames = await chrome.scripting.executeScript({target:{tabId:tab.id, allFrames:true}, files:['subtitles.js']}); } catch {}
          }
          const bestVideo = frames.filter(f => f.result?.hasVideo).sort((a,b) => Number(b.result.playing)-Number(a.result.playing) || b.result.area-a.result.area)[0];
          const best = bestVideo || frames.find(f => f.frameId===0) || frames[0];
          if (!best) throw new Error('نمایش زیرنویس در این صفحه توسط Chrome مجاز نیست.');
          const subtitleTarget = {tabId:tab.id, frameId:best.frameId, session:subtitleSession};
          await chrome.storage.session.set({subtitleTarget});
          await chrome.tabs.sendMessage(tab.id, {target:'subtitles', type:'begin', session:subtitleSession, floating:floatingCaptions}, {frameId:best.frameId});
        }
        const streamId = await chrome.tabCapture.getMediaStreamId({targetTabId: tab.id});
        await chrome.offscreen.createDocument({url: 'offscreen.html', reasons: ['USER_MEDIA', 'AUDIO_PLAYBACK'], justification: 'Translate captured tab audio and play the translated speech.'});
        const result = await chrome.runtime.sendMessage({target: 'audio', type: 'start', streamId, key: message.key.trim(), language: message.language, originalVolume: message.originalVolume, dubVolume: message.dubVolume, limitMinutes: message.limitMinutes, tabTitle: tab.title || '', mode, subtitleSession, floatingCaptions});
        return result;
      } catch (error) {
        if (await hasOffscreen()) await chrome.offscreen.closeDocument();
        await endSubtitles();
        await endMediaSync();
        throw error;
      } finally { starting = false; }
    }
    if (message.type === 'badge') {
      await chrome.action.setBadgeText({text: message.active ? 'ON' : ''});
      await chrome.action.setBadgeBackgroundColor({color: '#655df6'});
      return {};
    }
  })().then(reply, error => reply({error: error.message}));
  return true;
});
