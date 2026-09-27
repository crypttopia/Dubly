const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');

test('microphone grant enables Voice Typing on the tab selected before the permission window opens',async()=>{
  const elements={};
  for(const id of ['site','title','description','allow','settings','status','privacy']) elements[id]={textContent:'',hidden:false,disabled:false,classList:{toggle(){}},listeners:{},addEventListener(name,fn){this.listeners[name]=fn;}};
  const messages=[];let stopped=false,closed=false;
  const context=vm.createContext({
    document:{documentElement:{},getElementById:id=>elements[id]},
    location:{search:'?tabId=42&site=Telegram'},URLSearchParams,
    navigator:{mediaDevices:{getUserMedia:async()=>({getTracks:()=>[{stop(){stopped=true;}}]})}},
    chrome:{storage:{local:{get:async()=>({uiLanguage:'fa'}),set:async values=>messages.push({type:'storageSet',values})}},runtime:{sendMessage:async message=>{messages.push(message);return {enabled:true};}}},
    window:{close(){closed=true;}},setTimeout:fn=>fn()
  });
  vm.runInContext(fs.readFileSync('mic-permission.js','utf8'),context);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(stopped,true);
  assert.equal(messages[0].type,'storageSet');
  assert.equal(messages[0].values.microphoneGranted,true);
  assert.equal(messages[1].target,'background');
  assert.equal(messages[1].type,'voiceEnableForTab');
  assert.equal(messages[1].tabId,42);
  assert.equal(elements.site.textContent,'Telegram');
  assert.match(elements.status.textContent,/فعال شد/);
  assert.equal(closed,true);
});
