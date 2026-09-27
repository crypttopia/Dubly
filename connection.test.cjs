const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function harness() {
  let socket, stopped = false;
  const messages = [];
  const gains = [];
  const node = {connect() {return this;}};
  const context = vm.createContext({
    crypto: require('node:crypto').webcrypto,
    chrome: {runtime: {onMessage: {addListener() {}}, sendMessage: async message => {messages.push(message); return {};}}},
    navigator: {mediaDevices: {getUserMedia: async () => ({getAudioTracks: () => [{}], getTracks: () => [{stop() {stopped = true;}}]})}},
    AudioContext: class {constructor() {this.currentTime = 0; this.audioWorklet = {addModule: async () => {}};} async resume() {} async close() {} createMediaStreamSource() {return node;} createGain() {const gain = {connect() {return this;}, gain: {value: 0, setTargetAtTime(value) {this.value = value;}}}; gains.push(gain); return gain;} createBuffer(channels,length,rate) {const data=new Float32Array(length);return {duration:length/rate,getChannelData(){return data;}};} createBufferSource() {return {connect(){return this;},start(){},stop(){},buffer:null,onended:null};}},
    AudioWorkletNode: class {constructor() {this.port = {};} connect() {}},
    WebSocket: class {constructor() {socket = this; this.sent = [];} send(data) {this.sent.push(JSON.parse(data));} close() {}},
    setTimeout: () => 1, clearTimeout() {}, atob
  });
  vm.runInContext(fs.readFileSync('offscreen.js', 'utf8'), context);
  return {context, gains, messages, get socket() {return socket;}, get stopped() {return stopped;}};
}
test('setup places transcription at setup level and keeps translation in generationConfig', async () => {
  const h = harness();
  await vm.runInContext("start({key: 'test-key', streamId: 'test-stream', language: 'fa'})", h.context);
  h.socket.onopen();
  const {setup} = h.socket.sent[0];
  assert.deepEqual(setup.outputAudioTranscription, {});
  assert.equal('outputAudioTranscription' in setup.generationConfig, false);
  assert.equal(setup.generationConfig.translationConfig.targetLanguageCode, 'fa');
  assert.deepEqual(setup.generationConfig.responseModalities, ['AUDIO']);
});
test('voice typing uses the minimal documented live transcription setup', async () => {
  const h = harness();
  await vm.runInContext("startVoice({key:'test-key',session:'voice-session'})",h.context);
  h.socket.onopen();
  const {setup}=h.socket.sent[0];
  assert.equal(setup.model,'models/gemini-3.5-transcribe-live');
  assert.deepEqual(setup.generationConfig.responseModalities,['TEXT']);
  assert.deepEqual(setup.inputAudioTranscription,{});
});
test('voice typing reports the Google close reason and redacts the API key',async()=>{
  const h=harness();
  await vm.runInContext("startVoice({key:'secret-key',session:'voice-session'})",h.context);
  h.socket.onclose({code:1008,reason:'Operation is not enabled for secret-key'});
  await new Promise(resolve=>setImmediate(resolve));
  const failure=h.messages.find(message=>message.type==='voiceError');
  assert.match(failure.error,/1008/);
  assert.match(failure.error,/Operation is not enabled/);
  assert.equal(failure.error.includes('secret-key'),false);
});
test('original and dubbed volume change independently without restarting the connection', async () => {
  const h = harness();
  await vm.runInContext("start({key: 'test-key', streamId: 'test-stream', originalVolume: 25, dubVolume: 80})", h.context);
  assert.equal(h.gains[0].gain.value, 0.25);
  assert.equal(h.gains[1].gain.value, 0.8);
  const socket = h.socket;
  vm.runInContext('setVolumes({originalVolume: 100, dubVolume: 0})', h.context);
  assert.equal(h.gains[0].gain.value, 1);
  assert.equal(h.gains[1].gain.value, 0);
  assert.equal(h.socket, socket);
  vm.runInContext('setVolumes({originalVolume: -10, dubVolume: 150})', h.context);
  assert.equal(h.gains[0].gain.value, 0);
  assert.equal(h.gains[1].gain.value, 1);
});
test('1007 preserves the server reason, redacts the key and releases capture', async () => {
  const h = harness();
  await vm.runInContext("start({key: 'test-key', streamId: 'test-stream'})", h.context);
  h.socket.onerror();
  await h.socket.onclose({code: 1007, reason: 'Unknown name outputAudioTranscription test-key'});
  const result = vm.runInContext('status()', h.context);
  assert.equal(result.state, 'error');
  assert.match(result.error, /1007/);
  assert.match(result.error, /Unknown name outputAudioTranscription/);
  assert.equal(result.error.includes('test-key'), false);
  assert.equal(h.stopped, true);
});
test('subtitles mode forwards translation, suppresses audio playback and cannot be unmuted by volume', async () => {
  const h = harness();
  await vm.runInContext("start({key:'fake',streamId:'s',mode:'subtitles',subtitleSession:'caption-session',originalVolume:100,dubVolume:100})", h.context);
  assert.equal(h.gains[0].gain.value, 1);
  assert.equal(h.gains[1].gain.value, 0);
  await h.socket.onmessage({data:JSON.stringify({serverContent:{outputTranscription:{text:'سلام دنیا',finished:true},modelTurn:{parts:[{inlineData:{data:'not-audio',mimeType:'audio/pcm;rate=24000'}}]}}})});
  assert.equal(vm.runInContext('status().state',h.context),'connecting');
  assert.equal(h.messages.find(m=>m.type==='subtitleText').text,'سلام دنیا');
  vm.runInContext('setVolumes({dubVolume:100})',h.context);
  assert.equal(h.gains[1].gain.value,0);
  await vm.runInContext('cleanup()',h.context);
  assert.ok(h.messages.some(m=>m.type==='subtitleEnd'&&m.session==='caption-session'));
});
test('dubbing mode emits no video captions; both mode does', async () => {
  for(const mode of ['dubbing','both']) {
    const h=harness();
    await vm.runInContext(`start({key:'fake',streamId:'s',mode:'${mode}'})`,h.context);
    await h.socket.onmessage({data:JSON.stringify({serverContent:{outputTranscription:{text:'Translated speech',finished:true}}})});
    assert.equal(h.messages.some(m=>m.type==='subtitleText'),mode==='both');
    assert.equal(h.gains[1].gain.value,1);
  }
});
test('first dubbed audio requests one measured media hold for synchronization', async () => {
  const h=harness();
  await vm.runInContext("start({key:'fake',streamId:'s',mode:'dubbing',subtitleSession:'sync-session'})",h.context);
  vm.runInContext('sessionStarted=Date.now()-900;syncInputAt=Date.now()-700',h.context);
  vm.runInContext("play('AAA=',24000);play('AAA=',24000)",h.context);
  const holds=h.messages.filter(message=>message.type==='syncHold');
  assert.equal(holds.length,1);
  assert.equal(holds[0].session,'sync-session');
  assert.ok(holds[0].durationMs>=450&&holds[0].durationMs<=3000);
});
