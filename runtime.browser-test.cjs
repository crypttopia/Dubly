const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
(async()=>{
  const root=__dirname;
  const context=await chromium.launchPersistentContext('',{
    channel:process.env.DUBLY_EXTENSION_CHANNEL || 'chromium',executablePath:process.env.DUBLY_CHROMIUM_PATH || undefined,headless:true,
    args:[`--disable-extensions-except=${root}`,`--load-extension=${root}`]
  });
  try {
    const worker=context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const response=await worker.evaluate(async()=>{
      await chrome.offscreen.createDocument({url:'offscreen.html',reasons:['USER_MEDIA'],justification:'Test extension message routing without capturing audio.'});
      try { return await chrome.runtime.sendMessage({target:'audio',type:'status'}); }
      finally { await chrome.offscreen.closeDocument(); }
    });
    assert.equal(response.state,'idle','real worker messages must reach the offscreen document');
    const popup=await context.newPage();
    await popup.goto(new URL('popup.html',worker.url()).href);
    const status=await popup.evaluate(()=>chrome.runtime.sendMessage({target:'background',type:'status'}));
    assert.equal(status.state,'idle','real popup messages must reach the worker');
    const denied=await popup.evaluate(()=>chrome.runtime.sendMessage({target:'background',type:'voiceText',session:'fake',text:'fake'}));
    assert.equal(denied.error,'Unauthorized message.');
    console.log('PASS: real extension worker/offscreen/popup routing and sender restrictions.');
  } finally { await context.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
