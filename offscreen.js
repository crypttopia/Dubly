let state = 'idle', error = '', transcript = '';
let stream, input, output, socket, processor, timer;
let nextPlay = 0, ready = false;
let originalGain, dubGain;
let originalVolume = 0, dubVolume = 100;
let sessionId, sessionLanguage, sampleFrom = 0, lastPacketAt = 0, sessionStarted = 0, limitMs = 0;
let tabTitle = '';
let mode = 'dubbing', subtitleSession = '', floatingCaptions = false;
let syncRequested = false, syncInputAt = 0;
let voiceState = 'idle', voiceError = '', voiceStream, voiceInput, voiceProcessor, voiceMute, voiceSocket, voiceReady = false, voiceSession = '';
function publishCaption(text, delayMs = 0) {
  if (mode === 'dubbing' && !floatingCaptions) return;
  const caption = String(text).trim();
  // Gemini returns this transcript with its translated audio. Show it on the
  // same output-audio schedule instead of holding it for sentence completion.
  if (caption) void chrome.runtime.sendMessage({target:'background', type:'subtitleText', session:subtitleSession, text:caption, delayMs}).catch(() => {});
}
async function flushActivity() {
  if (!sampleFrom || !lastPacketAt) return;
  const sample = {id: sessionId, language: sessionLanguage, from: sampleFrom, to: lastPacketAt};
  sampleFrom = 0;
  try { await chrome.runtime.sendMessage({target: 'background', type: 'activitySample', sample}); } catch {}
}
function setVolumes(message) {
  const clamp = (value, fallback) => Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : fallback;
  originalVolume = clamp(message.originalVolume, originalVolume);
  dubVolume = clamp(message.dubVolume, dubVolume);
  if (originalGain) originalGain.gain.setTargetAtTime(originalVolume / 100, input.currentTime, 0.02);
  if (dubGain) dubGain.gain.setTargetAtTime(mode === 'subtitles' ? 0 : dubVolume / 100, output.currentTime, 0.02);
}
const sources = new Set();
function status() { return {state, error, transcript, tabTitle, mode, elapsed: sessionStarted ? Math.max(0, Math.floor((Date.now() - sessionStarted) / 1000)) : 0}; }
async function cleanup() {
  ready = false;
  try { await chrome.runtime.sendMessage({target:'background', type:'subtitleEnd', session:subtitleSession}); } catch {}
  if (subtitleSession) try { await chrome.runtime.sendMessage({target:'background', type:'syncEnd', session:subtitleSession}); } catch {}
  await flushActivity();
  try { await chrome.runtime.sendMessage({target: 'background', type: 'badge', active: false}); } catch {}
  clearTimeout(timer);
  if (processor) processor.port.onmessage = null;
  stream?.getTracks().forEach(track => track.stop());
  for (const source of sources) { try { source.stop(); } catch {} }
  sources.clear();
  if (socket) { socket.onclose = null; socket.onerror = null; socket.onmessage = null; socket.close(); }
  await Promise.allSettled([input?.close(), output?.close()]);
}
async function fail(message) {
  if (state === 'error') return;
  state = 'error'; error = message; await cleanup();
}
function play(data, rate) {
  const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0));
  if (bytes.length % 2) throw new Error('پاسخ صوتی نامعتبر است.');
  const view = new DataView(bytes.buffer);
  const buffer = output.createBuffer(1, bytes.length / 2, rate);
  const channel = buffer.getChannelData(0);
  for (let i = 0; i < channel.length; i++) channel[i] = view.getInt16(i * 2, true) / 32768;
  if (nextPlay - output.currentTime > 15) throw new Error('تأخیر پخش بیش از حد شد؛ دوبله را دوباره شروع کنید.');
  const source = output.createBufferSource();
  source.buffer = buffer; source.connect(dubGain);
  nextPlay = Math.max(nextPlay, output.currentTime + 0.03);
  const delayMs = Math.max(0, Math.round((nextPlay - output.currentTime) * 1000));
  if (!syncRequested && mode !== 'subtitles') {
    syncRequested = true;
    const measured = Date.now() - (syncInputAt || sessionStarted || Date.now());
    const durationMs = Math.max(450, Math.min(3000, measured));
    void chrome.runtime.sendMessage({target:'background', type:'syncHold', session:subtitleSession, durationMs}).catch(() => {});
  }
  sources.add(source); source.onended = () => sources.delete(source);
  source.start(nextPlay); nextPlay += buffer.duration;
  return delayMs;
}
async function start(message) {
  state = 'connecting'; error = ''; transcript = '';
  tabTitle = message.tabTitle || '';
  mode = ['subtitles','both'].includes(message.mode) ? message.mode : 'dubbing';
  floatingCaptions = !!message.floatingCaptions;
  subtitleSession = message.subtitleSession || '';
  syncRequested = false; syncInputAt = 0;
  sessionId = crypto.randomUUID(); sessionLanguage = message.language || 'fa';
  limitMs = Math.max(0, Math.min(180, Number(message.limitMinutes) || 0)) * 60000;
  try {
    stream = await navigator.mediaDevices.getUserMedia({audio: {mandatory: {chromeMediaSource: 'tab', chromeMediaSourceId: message.streamId}}, video: false});
    stream.getAudioTracks()[0].onended = () => fail('دریافت صدای تب پایان یافت.');
    input = new AudioContext({sampleRate: 16000});
    output = new AudioContext({sampleRate: 24000});
    await Promise.all([input.resume(), output.resume()]);
    await input.audioWorklet.addModule('pcm-worklet.js');
    const source = input.createMediaStreamSource(stream);
    originalGain = input.createGain();
    dubGain = output.createGain();
    originalGain.gain.value = 0;
    dubGain.gain.value = 1;
    setVolumes(message);
    source.connect(originalGain).connect(input.destination);
    dubGain.connect(output.destination);
    processor = new AudioWorkletNode(input, 'pcm-capture');
    source.connect(processor).connect(input.destination);
    socket = new WebSocket('wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=' + encodeURIComponent(message.key));
    timer = setTimeout(() => fail('مهلت اتصال تمام شد. اینترنت و دسترسی API را بررسی کنید.'), 20000);
    socket.onopen = () => socket.send(JSON.stringify({setup: {
      model: 'models/gemini-3.5-live-translate-preview',
      // Transcription belongs to setup, not generationConfig (see Google SDK).
      outputAudioTranscription: {},
      generationConfig: {responseModalities: ['AUDIO'], translationConfig: {targetLanguageCode: message.language || 'fa', echoTargetLanguage: true}}
    }}));
    processor.port.onmessage = event => {
      if (!ready || socket.readyState !== WebSocket.OPEN) return;
      const now = Date.now();
      if (limitMs && now - sessionStarted >= limitMs) { void fail('Session time limit reached.'); return; }
      if (sampleFrom && now - lastPacketAt > 1000) void flushActivity();
      if (!sampleFrom) sampleFrom = now - 100;
      lastPacketAt = now;
      if (lastPacketAt - sampleFrom >= 10000) void flushActivity();
      if (socket.bufferedAmount > 128000) { void fail('سرعت اتصال برای دوبلهٔ زنده کافی نیست.'); return; }
      const bytes = new Uint8Array(event.data);
      if (!syncInputAt) {
        const samples = new Int16Array(event.data);
        let peak = 0, total = 0, count = 0;
        for (let i = 0; i < samples.length; i += 16) { const value = Math.abs(samples[i]); peak = Math.max(peak, value); total += value; count++; }
        if (peak > 2500 || total / Math.max(1, count) > 500) syncInputAt = now;
      }
      const data = btoa(String.fromCharCode(...bytes));
      socket.send(JSON.stringify({realtimeInput: {audio: {data, mimeType: 'audio/pcm;rate=16000'}}}));
    };
    socket.onmessage = async event => {
      try {
        const response = JSON.parse(typeof event.data === 'string' ? event.data : await event.data.text());
        if (state === 'error') return;
        if (response.error) throw new Error('گوگل درخواست را نپذیرفت. کد: ' + (response.error.code || 'نامشخص') + ' — ' + safeReason(response.error.message, message.key));
        if (response.setupComplete) {
          clearTimeout(timer); ready = true; state = 'live'; sessionStarted = Date.now();
          try { await chrome.runtime.sendMessage({target: 'background', type: 'badge', active: true}); } catch {}
        }
        const content = response.serverContent;
        let captionDelay = Math.max(0, Math.round((nextPlay - output.currentTime) * 1000));
        for (const part of content?.modelTurn?.parts || []) {
          if (part.inlineData?.data && mode !== 'subtitles') {
            const rate = Number(/rate=(\d+)/.exec(part.inlineData.mimeType || '')?.[1] || 24000);
            captionDelay = Math.max(captionDelay, play(part.inlineData.data, rate));
          }
        }
        if (content?.outputTranscription?.text) {
          transcript = (transcript + content.outputTranscription.text).slice(-2500);
          publishCaption(content.outputTranscription.text, captionDelay + 40);
        }
        if (content?.interrupted) {
          for (const source of sources) { try { source.stop(); } catch {} }
          sources.clear(); nextPlay = output.currentTime;
          if (mode !== 'dubbing') void chrome.runtime.sendMessage({target:'background',type:'subtitleClear',session:subtitleSession}).catch(() => {});
        }
        if (response.goAway) await fail('جلسهٔ گوگل رو به پایان است؛ دوبله را دوباره شروع کنید.');
      } catch (e) { await fail(e.message || 'پردازش پاسخ صوتی ناموفق بود.'); }
    };
    // Wait for close: it contains the useful code/reason; onerror does not.
    socket.onerror = () => { ready = false; };
    socket.onclose = event => fail('اتصال گوگل بسته شد (کد ' + event.code + '). ' +
      (safeReason(event.reason, message.key) || 'اینترنت، کلید و دسترسی مدل را بررسی کنید و دوباره شروع کنید.'));
    return status();
  } catch { await fail('دریافت صدای تب یا راه‌اندازی صدا ناموفق بود. پخش صدای تب را بررسی کنید و دوباره امتحان کنید.'); return status(); }
}
function safeReason(reason, key) {
  let text = String(reason || '');
  if (key) {
    text = text.split(key).join('[کلید پنهان شد]');
    text = text.split(encodeURIComponent(key)).join('[کلید پنهان شد]');
  }
  return text.replace(/AIza[\w-]+/g, '[کلید پنهان شد]').slice(0, 700);
}
async function publishVoice(type, extra = {}) {
  try { await chrome.runtime.sendMessage({target:'background', type, session:voiceSession, ...extra}); } catch {}
}
async function stopVoice(publish = true) {
  voiceReady = false;
  if (voiceProcessor) voiceProcessor.port.onmessage = null;
  voiceStream?.getTracks().forEach(track => track.stop());
  if (voiceSocket) { voiceSocket.onclose = null; voiceSocket.onerror = null; voiceSocket.onmessage = null; voiceSocket.close(); }
  await Promise.allSettled([voiceInput?.close()]);
  voiceStream = voiceInput = voiceProcessor = voiceMute = voiceSocket = null;
  voiceState = 'idle';
  if (publish) { voiceError = ''; await publishVoice('voiceState', {state:'idle'}); }
}
async function startVoice(message) {
  if (voiceState === 'listening' || voiceState === 'connecting') return {state:voiceState};
  voiceSession = message.session || crypto.randomUUID(); voiceState = 'connecting'; voiceError = '';
  await publishVoice('voiceState', {state:'connecting'});
  try {
    voiceStream = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
    voiceInput = new AudioContext({sampleRate:16000}); await voiceInput.resume();
    await voiceInput.audioWorklet.addModule('pcm-worklet.js');
    const source = voiceInput.createMediaStreamSource(voiceStream);
    voiceProcessor = new AudioWorkletNode(voiceInput,'pcm-capture'); voiceMute=voiceInput.createGain();voiceMute.gain.value=0;source.connect(voiceProcessor).connect(voiceMute).connect(voiceInput.destination);
    voiceSocket = new WebSocket('wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key='+encodeURIComponent(message.key));
    const timeout=setTimeout(()=>{if(voiceState==='connecting')void failVoice('مهلت اتصال تمام شد.');},20000);
    // Keep the initial setup to the smallest documented Live Transcription
    // configuration. Empty transcription options retain automatic language
    // detection and avoid account/rollout-specific optional feature failures.
    voiceSocket.onopen=()=>voiceSocket.send(JSON.stringify({setup:{model:'models/gemini-3.5-transcribe-live',generationConfig:{responseModalities:['TEXT']},inputAudioTranscription:{}}}));
    voiceProcessor.port.onmessage=event=>{
      if(!voiceReady||voiceSocket?.readyState!==WebSocket.OPEN)return;
      if(voiceSocket.bufferedAmount>128000){void failVoice('سرعت اتصال برای تبدیل گفتار کافی نیست.');return;}
      const bytes=new Uint8Array(event.data);const data=btoa(String.fromCharCode(...bytes));
      voiceSocket.send(JSON.stringify({realtimeInput:{audio:{data,mimeType:'audio/pcm;rate=16000'}}}));
    };
    voiceSocket.onmessage=async event=>{try{
      const response=JSON.parse(typeof event.data==='string'?event.data:await event.data.text());
      if(response.error)throw Error('گوگل درخواست را نپذیرفت. '+safeReason(response.error.message||('کد: '+(response.error.code||'نامشخص')),message.key));
      if(response.setupComplete){clearTimeout(timeout);voiceReady=true;voiceState='listening';await publishVoice('voiceState',{state:'listening'});}
      const content=response.serverContent;
      if(content?.interimInputTranscription?.text)await publishVoice('voiceText',{text:content.interimInputTranscription.text,final:false});
      if(content?.inputTranscription?.text)await publishVoice('voiceText',{text:content.inputTranscription.text,final:true});
      if(response.goAway)await failVoice('جلسهٔ تبدیل گفتار پایان یافت. دوباره شروع کنید.');
    }catch(error){await failVoice(error.message||'خطا در تبدیل گفتار.');}};
    voiceSocket.onerror=()=>{};voiceSocket.onclose=event=>{if(voiceState!=='idle'){const reason=safeReason(event.reason,message.key);void failVoice('اتصال گوگل بسته شد (کد '+event.code+')'+(reason?'؛ '+reason:'')+'.');}};
    return {state:voiceState};
  } catch (error) {
    if (error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError') await chrome.storage.local.remove('microphoneGranted');
    await failVoice('دسترسی به میکروفن یا راه‌اندازی صدا ناموفق بود.'); return {state:'error'};
  }
}
async function failVoice(message) { voiceError=message; await publishVoice('voiceError',{error:message}); await stopVoice(false); }
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (message.target !== 'audio') return;
  if (message.type === 'stop') { state = 'idle'; cleanup().then(() => reply(status())); return true; }
  if (message.type === 'volume') { if (state === 'live' || state === 'connecting') setVolumes(message); reply(status()); return; }
  if (message.type === 'status') { reply(status()); return; }
  if (message.type === 'start') { start(message).then(reply); return true; }
  if (message.type === 'voiceStart') { startVoice(message).then(reply); return true; }
  if (message.type === 'voiceStop') { stopVoice().then(()=>reply({state:'idle'})); return true; }
  if (message.type === 'voiceStatus') { reply({state:voiceState,error:voiceError}); return; }
});
