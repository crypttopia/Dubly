const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');

(async()=>{const browser=await chromium.launch({channel:process.env.DUBLY_BROWSER_CHANNEL || undefined,headless:true});try{
  const page=await browser.newPage();
  const pageErrors=[];page.on('pageerror',error=>pageErrors.push(error.message));
  await page.setContent('<main id="plain">A page without any text field</main>');
  await page.evaluate(()=>{
    window.voiceMessages=[];
    window.sentMessages=[];
    window.chrome={runtime:{
      onMessage:{addListener(fn){window.voiceMessages.push(fn)}},
      sendMessage:async message=>{window.sentMessages.push(message);return {};}
    }};
  });
  await page.addScriptTag({path:path.resolve('voice-typing.js')});
  const send=message=>page.evaluate(message=>window.voiceMessages[0]({target:'voiceTyping',session:'test',...message},{},()=>{}),message);
  await send({type:'enable',uiLanguage:'fa'});
  assert.equal(await page.locator('#dubly-voice-typing').count(),1,'the control must open even when the page has no editable field');
  const buttonLayout=await page.locator('#dubly-voice-typing button').evaluateAll(buttons=>buttons.map(button=>({align:button.style.textAlign,place:button.style.placeItems})));
  assert.ok(buttonLayout.every(button=>button.align==='center'&&button.place==='center'),'all floating-control buttons must center their labels and icons');
  await page.evaluate(()=>{const editor=document.createElement('div');editor.id='editor';editor.setAttribute('role','textbox');editor.contentEditable='true';editor.append(document.createElement('br'));document.body.prepend(editor);});
  await page.evaluate(()=>{const handle=document.querySelector('#dubly-voice-typing').firstElementChild;handle.setPointerCapture=()=>{throw new DOMException('Pointer is no longer active','NotFoundError')};handle.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:7,clientX:20,clientY:20}));});
  await page.locator('#editor').click();
  await send({type:'text',text:'سلام از دبلی',final:true});
  await page.getByRole('button',{name:'درج متن'}).click();
  assert.equal((await page.locator('#editor').textContent()).trim(),'سلام از دبلی');
  assert.match(await page.locator('#dubly-voice-typing > p').textContent(),/روی میکروفن/);
  await send({type:'text',text:'و ادامهٔ متن',final:true});
  await page.getByRole('button',{name:'درج متن'}).click();
  assert.equal((await page.locator('#editor').textContent()).trim(),'سلام از دبلی و ادامهٔ متن');
  await send({type:'text',text:'متن تازه',final:true});
  await page.getByRole('button',{name:'درج متن'}).click();
  assert.equal((await page.locator('#editor').textContent()).trim(),'سلام از دبلی و ادامهٔ متن متن تازه');
  await send({type:'text',text:'در حالت کوچک',final:true});
  await page.getByRole('button',{name:'کوچک‌کردن پنل'}).click();
  assert.equal(await page.locator('#dubly-voice-typing').evaluate(element=>element.style.width),'126px');
  const minimizedButtons=page.locator('#dubly-voice-typing button:visible');
  assert.equal(await minimizedButtons.count(),3);
  assert.ok(await minimizedButtons.evaluateAll(buttons=>buttons.every(button=>getComputedStyle(button).display==='grid'&&getComputedStyle(button).textAlign==='center')));
  await page.getByRole('button',{name:'درج متن'}).click();
  assert.equal((await page.locator('#editor').textContent()).trim(),'سلام از دبلی و ادامهٔ متن متن تازه در حالت کوچک');
  await page.getByRole('button',{name:'شروع ضبط صدا'}).click();
  assert.equal(await page.evaluate(()=>window.sentMessages.at(-1).type),'voiceToggle');
  await page.getByRole('button',{name:'بازکردن پنل'}).click();
  assert.equal(await page.locator('#dubly-voice-typing').evaluate(element=>element.style.width),'290px');
  // Simulate an old content script after the extension has been reloaded.
  await page.evaluate(()=>{chrome.runtime.sendMessage=()=>{throw new Error('Extension context invalidated.');};});
  await page.getByRole('button',{name:'شروع ضبط صدا'}).click();
  assert.match(await page.locator('#dubly-voice-typing small').textContent(),/صفحه را تازه‌سازی/);
  await page.getByRole('button',{name:'بستن تایپ صوتی'}).click();
  assert.equal(await page.locator('#dubly-voice-typing').count(),0);
  await send({type:'enable',uiLanguage:'fa'});
  await page.evaluate(()=>{chrome.runtime.sendMessage=async()=>{throw new Error('Could not establish connection.');};});
  await page.getByRole('button',{name:'بستن تایپ صوتی'}).click();
  assert.equal(await page.locator('#dubly-voice-typing').count(),0);
  await send({type:'enable',uiLanguage:'fa'});
  await page.evaluate(()=>{chrome.runtime.sendMessage=async()=>({});});
  await page.getByRole('button',{name:'بستن تایپ صوتی'}).click();
  assert.equal(await page.locator('#dubly-voice-typing').count(),0);
  assert.deepEqual(pageErrors,[]);
  console.log('PASS: insertion, pointer errors, synchronous/asynchronous connection failures and closing the panel.');
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1});
