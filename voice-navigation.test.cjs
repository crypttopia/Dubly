const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');

test('Voice Typing stays assigned to the same tab and is restored after navigation',async()=>{
  const session={voiceTarget:{tabId:42,frameId:0,session:'voice-session'}};
  const local={uiLanguage:'fa'};
  const runtimeMessages=[],tabMessages=[],scripts=[];
  let updatedListener;
  const area=data=>({async get(keys){return Object.fromEntries((Array.isArray(keys)?keys:[keys]).map(key=>[key,data[key]]));},async set(values){Object.assign(data,values)},async remove(key){delete data[key]}});
  const chrome={
    storage:{session:area(session),local:area(local)},
    runtime:{
      async getContexts(){return [{contextType:'OFFSCREEN_DOCUMENT'}]},
      async sendMessage(message){runtimeMessages.push(message);return message.type==='voiceStatus'?{state:'idle'}:{};},
      onMessage:{addListener(){}},getURL:value=>value
    },
    tabs:{
      onUpdated:{addListener(listener){updatedListener=listener}},onRemoved:{addListener(){}},
      async get(tabId){return {id:tabId,url:'https://x.com/home',title:'X'}},
      async sendMessage(tabId,message,options){tabMessages.push({tabId,message,options})}
    },
    scripting:{async executeScript(details){scripts.push(details)}}
  };
  const context=vm.createContext({chrome,crypto:require('node:crypto').webcrypto,URL,WebSocket:class{},setTimeout,clearTimeout,importScripts(){},activityDay(){},addActivity(){}});
  vm.runInContext(fs.readFileSync('background.js','utf8'),context);
  updatedListener(42,{url:'https://web.telegram.org/a/#friend'},{id:42,url:'https://web.telegram.org/a/#friend'});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(runtimeMessages.length,0,'SPA navigation must not stop Voice Typing');
  assert.equal(scripts.length,0,'SPA navigation must keep the existing floating control');
  updatedListener(42,{status:'loading'},{id:42,url:'https://x.com/home'});
  updatedListener(42,{status:'complete'},{id:42,url:'https://x.com/home',title:'X'});
  await new Promise(resolve=>setImmediate(resolve));
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(session.voiceTarget.tabId,42);
  assert.ok(runtimeMessages.some(message=>message.type==='voiceStop'));
  assert.equal(scripts[0].target.tabId,42);
  assert.equal(scripts[0].files[0],'voice-typing.js');
  const enable=tabMessages.find(item=>item.message.type==='enable');
  assert.equal(enable.tabId,42);
  assert.equal(enable.message.session,'voice-session');
  assert.equal(enable.message.uiLanguage,'fa');
});

test('manifest declares website access as optional',()=>{
  const manifest=JSON.parse(fs.readFileSync('manifest.json','utf8'));
  assert.deepEqual(manifest.optional_host_permissions,['http://*/*','https://*/*']);
  assert.ok(!manifest.host_permissions.includes('http://*/*'));
  assert.ok(!manifest.host_permissions.includes('https://*/*'));
});
