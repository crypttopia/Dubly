const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function harness(){
 const messages=[];
 const context=vm.createContext({chrome:{runtime:{onMessage:{addListener(){}},sendMessage:async m=>{messages.push(m);}}},setTimeout(){return 1},clearTimeout(){}});
 vm.runInContext(fs.readFileSync('offscreen.js','utf8'),context);
 vm.runInContext("mode='both';subtitleSession='test'",context);
 return {messages,run:code=>vm.runInContext(code,context)};
}
test('translated transcription is forwarded immediately without waiting for a sentence',()=>{
 const h=harness();h.run("publishCaption('این یک ',120)");
 assert.equal(h.messages.length,1);assert.equal(h.messages[0].text,'این یک');assert.equal(h.messages[0].delayMs,120);
 h.run("publishCaption('جمله است.',310)");
 assert.equal(h.messages.length,2);assert.equal(h.messages[1].text,'جمله است.');assert.equal(h.messages[1].delayMs,310);
});
test('dubbing-only mode never forwards a subtitle',()=>{
 const h=harness();h.run("mode='dubbing';publishCaption('نباید نمایش داده شود',50)");assert.equal(h.messages.length,0);
});
