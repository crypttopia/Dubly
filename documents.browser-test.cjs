const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:process.env.DUBLY_BROWSER_CHANNEL || undefined,headless:true});
 try{
 const page=await browser.newPage({viewport:{width:1200,height:1000}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const name of ['privacy','terms','support']){
  await page.goto(require('node:url').pathToFileURL(require('node:path').join(__dirname,'pages.html')).href + '?page='+name);
  await page.locator('.document-nav').waitFor();await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.locator('.document-nav a[aria-current=page]').count(),1);
  assert.equal(await page.locator('#content').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length),2);
  assert.equal(await page.locator('body').innerText().then(t=>t.includes('@crypttopia')),false);
  assert.equal(await page.locator('#pageLanguage').count(),0);
  await page.screenshot({path:name+'-preview.png',fullPage:true});
  await page.goto(require('node:url').pathToFileURL(require('node:path').join(__dirname,'pages.html')).href + '?page='+name+'&lang=en');
  await page.locator('.document-nav').waitFor();
  assert.equal(await page.locator('html').getAttribute('lang'),'en');
  assert.equal(await page.locator('.document-nav').count(),1);
  await page.setViewportSize({width:375,height:850});
  await page.evaluate(()=>document.documentElement.dataset.theme='light');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.setViewportSize({width:1200,height:1000});
 }
 await page.goto(require('node:url').pathToFileURL(require('node:path').join(__dirname,'pages.html')).href + '?page=privacy');
 await page.locator('.document-nav').waitFor();
 const privacyText=await page.locator('#content').innerText();
 assert.match(privacyText,/۲۷ سپتامبر ۲۰۲۶/);
 assert.match(privacyText,/Gemini Transcribe Live/);
 assert.match(privacyText,/input، textarea یا contenteditable/);
 assert.match(privacyText,/فقط وقتی آغاز می‌شود که خودتان دکمهٔ «شروع»/);
 assert.match(privacyText,/از سرور Dubly عبور نمی‌کند/);
 const navigationCount=await page.evaluate(()=>performance.getEntriesByType('navigation').length);
 await page.getByRole('link',{name:'شرایط استفاده',exact:true}).click();
 await page.waitForFunction(()=>document.getElementById('title').textContent==='شرایط استفاده');
 assert.match(page.url(),/page=terms/);
 assert.equal(await page.evaluate(()=>performance.getEntriesByType('navigation').length),navigationCount);
 await page.getByRole('link',{name:'پشتیبانی',exact:true}).click();
 await page.waitForFunction(()=>document.getElementById('title').textContent==='پشتیبانی');
 await page.getByRole('link',{name:'راهنمای شروع و رفع مشکل ↗',exact:true}).click();
 await page.waitForFunction(()=>document.getElementById('title').textContent==='راهنمای شروع');
 assert.match(await page.locator('#content').innerText(),/استفاده از تایپ صوتی/);
 assert.deepEqual(errors,[]);console.log('PASS: information navigation, two-column layout, language, social label and mobile width.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
