const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function harness() {
  const getURL = name => 'chrome-extension://dubly/' + name;
  const target = {tabId:42,frameId:0,session:'current'};
  let access;
  const chrome = {
    storage:{local:{async setAccessLevel(value){access=value.accessLevel;}},session:{async get(){return {voiceTarget:target};}}},
    runtime:{id:'dubly',getURL,onMessage:{addListener(){}}},
    tabs:{onUpdated:{addListener(){}},onRemoved:{addListener(){}}}
  };
  const context=vm.createContext({chrome,importScripts(){},setTimeout,clearTimeout});
  vm.runInContext(fs.readFileSync('background.js','utf8'),context);
  return {context,getURL, get access(){return access;}};
}
test('content scripts cannot issue privileged commands or impersonate a different voice session',async()=>{
  const h=harness();
  assert.equal(h.access,'TRUSTED_CONTEXTS');
  const sender={id:'dubly',url:'https://example.com',tab:{id:42},frameId:0};
  const allowed=(type,source=sender,session='current')=>h.context.authorizedMessage({type,session},source);
  for(const type of ['testKey','start','voiceStart','voiceText','activitySample','badge','voiceEnableForTab']) assert.equal(await allowed(type),false,type);
  assert.equal(await allowed('voiceToggle'),true);
  assert.equal(await allowed('voiceDisable'),true);
  assert.equal(await allowed('voiceToggle',sender,'old'),false);
  assert.equal(await allowed('voiceToggle',{...sender,frameId:1}),false);
  assert.equal(await allowed('voiceToggle',{...sender,tab:{id:43}}),false);
  assert.equal(await allowed('voiceToggle',{...sender,id:'other'}),false);
  assert.equal(await allowed('voiceText',{id:'dubly',url:h.getURL('offscreen.html')}),true);
  assert.equal(await allowed('start',{id:'dubly',url:h.getURL('popup.html')}),true);
  assert.equal(await allowed('activityClear',{id:'dubly',url:h.getURL('pages.html')+'?page=activity',tab:{id:10}}),true);
  assert.equal(await allowed('openMicrophoneSettings',{id:'dubly',url:h.getURL('mic-permission.html')+'?tabId=42'}),true);
});
