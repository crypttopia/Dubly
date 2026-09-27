const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');

test('subtitle translation starts on an audio-only page without a video element',async()=>{
  const session={};
  const runtimeMessages=[],tabMessages=[],scripts=[];
  let messageListener;
  const area=data=>({
    async get(keys){const list=Array.isArray(keys)?keys:[keys];return Object.fromEntries(list.map(key=>[key,data[key]]));},
    async set(values){Object.assign(data,values);},async remove(key){delete data[key];}
  });
  const chrome={
    storage:{session:area(session),local:area({})},
    runtime:{
      async getContexts(){return [];},
      async sendMessage(message){runtimeMessages.push(message);return message.type==='start'?{state:'connecting'}:{};},
      onMessage:{addListener(listener){messageListener=listener;}},getURL:value=>value
    },
    tabs:{
      onUpdated:{addListener(){}},onRemoved:{addListener(){}},
      async query(){return [{id:17,url:'https://x.com/i/spaces/example',title:'X Space'}];},
      async sendMessage(tabId,message,options){tabMessages.push({tabId,message,options});return {ok:true};}
    },
    scripting:{async executeScript(details){scripts.push(details);return [{frameId:0,result:{hasVideo:false,hasAudio:false,hasMedia:false,playing:false,area:0}}];}},
    tabCapture:{async getMediaStreamId(){return 'audio-stream';}},
    offscreen:{async createDocument(){},async closeDocument(){}},
    action:{async setBadgeText(){},async setBadgeBackgroundColor(){}}
  };
  const context=vm.createContext({chrome,crypto:require('node:crypto').webcrypto,URL,WebSocket:class{},setTimeout,clearTimeout,importScripts(){},activityDay(){},addActivity(){}});
  vm.runInContext(fs.readFileSync('background.js','utf8'),context);
  const result=await new Promise(resolve=>messageListener({target:'background',type:'start',key:'key',mode:'subtitles',floatingCaptions:true,language:'fa',originalVolume:100,dubVolume:0},{url:'popup.html'},resolve));
  assert.equal(result.state,'connecting');
  assert.equal(scripts[0].target.tabId,17);
  assert.ok(tabMessages.some(item=>item.message.type==='begin'&&item.message.floating===true));
  const start=runtimeMessages.find(message=>message.type==='start');
  assert.equal(start.streamId,'audio-stream');
  assert.equal(start.tabTitle,'X Space');
});
