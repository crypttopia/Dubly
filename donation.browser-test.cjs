const {chromium}=require('C:/Users/ASUS/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1100,height:850}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.copiedText=text;}}}));
  await page.goto('file:///E:/dubly/pages.html?page=donate');
  await page.locator('.donation-qr').waitFor();
  await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.locator('.donation-card').count(),1);
  assert.equal(await page.locator('.donation-qr').count(),1);
  assert.equal(await page.locator('.donation-qr').evaluate(img=>img.naturalWidth>0),true);
  assert.match(await page.locator('.selected-network').textContent(),/BEP20/);
  await page.getByRole('button',{name:'Base',exact:true}).click();
  assert.equal(await page.locator('.selected-network').textContent(),'USDT · Base');
  assert.equal(await page.getByRole('button',{name:'Base',exact:true}).getAttribute('aria-pressed'),'true');
  await page.locator('.copy-wallet').click();
  assert.equal(await page.evaluate(()=>window.copiedText),'0xcea7d080c5DCD0300EBD4d53CABa4f1cf9325f58');
  await page.screenshot({path:'donation-preview.png',animations:'disabled'});
  assert.equal(await page.locator('.selected-network').textContent(),'USDT · Base');
  await page.getByRole('button',{name:'BNB Chain',exact:true}).click();
  assert.match(await page.locator('.selected-network').textContent(),/BEP20/);
  await page.setViewportSize({width:360,height:800});
  await page.evaluate(()=>document.documentElement.dataset.theme='light');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:'donation-mobile-preview.png',animations:'disabled'});
  await page.evaluate(()=>navigator.clipboard.writeText=async()=>{throw Error('denied');});
  await page.locator('.copy-wallet').click();
  assert.equal(await page.locator('.copy-feedback').textContent(),'آدرس را انتخاب و دستی کپی کنید.');
  assert.deepEqual(errors,[]);
  console.log('PASS: network selection, QR asset, copy address and mobile layout.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
