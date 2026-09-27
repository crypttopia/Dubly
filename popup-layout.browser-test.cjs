const {chromium}=require('C:/Users/ASUS/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
  const page=await browser.newPage({viewport:{width:420,height:600}});
  const html=fs.readFileSync('popup.html','utf8').replace(/<link[^>]+popup\.css[^>]*>/,'').replace(/<script[\s\S]*$/,'</body></html>');
  await page.setContent(html);
  await page.addStyleTag({path:path.resolve('popup.css')});
  await page.evaluate(()=>{
    const local={key:'saved-key',uiLanguage:'fa',language:'en',outputMode:'subtitles'};
    const area=data=>({async setAccessLevel(){},async get(keys){return Object.fromEntries((Array.isArray(keys)?keys:[keys]).map(key=>[key,data[key]]));},async set(values){Object.assign(data,values)},async remove(key){delete data[key]}});
    window.chrome={storage:{local:area(local),session:area({})},runtime:{getURL:value=>value,getManifest:()=>({version:'0.9.26'}),sendMessage:async message=>message.type==='voiceContext'?{supported:true,title:'Telegram',domain:'web.telegram.org'}:{state:'idle'}}};
  });
  await page.addScriptTag({path:path.resolve('site-config.js')});
  await page.addScriptTag({path:path.resolve('i18n.js')});
  await page.addScriptTag({path:path.resolve('popup.js')});
  await page.waitForFunction(()=>!document.querySelector('#appShell').hidden);
  const top=selector=>page.locator(selector).evaluate(element=>element.getBoundingClientRect().top);
  const positions={quick:await top('#translationStart'),mixer:await top('#mixerCard'),actions:await top('.main-actions'),settings:await top('.translation-settings'),transcript:await top('#transcriptCard')};
  assert.ok(positions.quick<positions.mixer&&positions.mixer<positions.actions&&positions.actions<positions.settings&&positions.settings<positions.transcript,JSON.stringify(positions));
  assert.equal(await page.locator('#outputMode').inputValue(),'subtitles');
  assert.equal(await page.locator('#outputMode option').nth(1).isDisabled(),false);
  assert.equal(await page.locator('#outputMode option').nth(2).getAttribute('value'),'both');
  assert.equal((await page.locator('.translation-settings h2').textContent()).trim(),'⚙ تنظیمات ترجمه');
  assert.equal(await page.locator('#language').inputValue(),'en');
  const expectedLanguages=['af','ak','sq','am','ar','hy','az','eu','be','bn','bg','my','ca','zh-Hans','zh-Hant','hr','cs','da','nl','en','et','fil','fi','fr','gl','ka','de','el','gu','ha','he','hi','hu','is','id','it','ja','jv','kn','kk','km','rw','ko','lo','lv','lt','mk','ms','ml','mr','mn','ne','no','fa','pl','pt-BR','pt-PT','pa','ro','ru','sr','sd','si','sk','sl','es','su','sw','sv','ta','te','th','tr','uk','ur','uz','vi','zu'];
  assert.deepEqual(await page.locator('#language option').evaluateAll(options=>options.map(option=>option.value)),expectedLanguages);
  console.log('PASS: translation controls expose all official languages and three output modes.');
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1});
