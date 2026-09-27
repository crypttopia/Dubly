const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
async function openPopup(local = {}, session = {}, connectionResult = {state: 'idle'}) {
  const html = fs.readFileSync('popup.html', 'utf8');
  const elements = {};
  const element = () => ({value: '', textContent: '', classList: {toggle() {}, remove() {}, add() {}}, listeners: {}, addEventListener(name, fn) {this.listeners[name] = fn;}, setAttribute() {}, focus() {}, scrollIntoView(options) {this.scrollOptions=options;}, scrollTo(options) {this.scrollOptions=options;this.scrollTop=options.top;}});
  for (const match of html.matchAll(/id="([^"]+)"/g)) elements[match[1]] = element();
  const labels = [...html.matchAll(/data-i18n="([^"]+)"/g)].map(match => ({dataset: {i18n: match[1]}, textContent: ''}));
  const themes = ['light', 'dark', 'auto'].map(value => Object.assign(element(), {dataset: {themeChoice: value}}));
  const messages = [];
  const document = {documentElement: {dataset: {}}, getElementById: id => {assert.ok(elements[id], id); return elements[id];}, querySelectorAll: selector => selector === '[data-i18n]' ? labels : selector === '[data-theme-choice]' ? themes : []};
  const area = data => ({async setAccessLevel() {}, async get(keys) {return Object.fromEntries((Array.isArray(keys) ? keys : [keys]).map(key => [key, data[key]]));}, async set(values) {Object.assign(data, values);}, async remove(key) {delete data[key];}});
  const sendMessage = async message => {
    messages.push(message);
    return message.type === 'testKey' ? connectionResult : message.type === 'voiceContext' ? ({supported:true,domain:'web.telegram.org',title:'Telegram'}) : message.type === 'voicePermissionFlow' ? local.microphoneGranted ? (session.voiceTarget={tabId:42,session:'voice'}, {enabled:true}) : ({opened:true}) : ({state:'idle'});
  };
  const requestSites=async request=>{messages.push({type:'permissionsRequest',...request});return local.siteAccessGranted!==false;};
  const context = vm.createContext({document, matchMedia: () => ({matches: true, addEventListener() {}}), chrome: {storage: {local: area(local), session: area(session)}, permissions:{request:requestSites}, runtime: {getManifest: () => ({version: '0.9.26'}), sendMessage}}, setInterval() {}});
  vm.runInContext(fs.readFileSync('i18n.js', 'utf8'), context);
  vm.runInContext(fs.readFileSync('popup.js', 'utf8'), context);
  await new Promise(resolve => setImmediate(resolve));
  return {elements, document, labels, context, themes, messages};
}

test('onboarding blocks the app until a Gemini key is verified and stored', async () => {
  const local = {};
  let popup = await openPopup(local);
  assert.equal(popup.elements.setup.hidden, false);
  assert.equal(popup.elements.appShell.hidden, true);
  popup.elements.setupKey.value = 'not-verified';
  await popup.elements.setupSave.listeners.click();
  assert.equal(local.key, undefined);
  assert.match(popup.elements.setupMessage.textContent, /تأیید نشد/);
  popup = await openPopup(local, {}, {verified: true});
  popup.elements.setupKey.value = 'verified-key';
  await popup.elements.setupSave.listeners.click();
  assert.equal(local.key, 'verified-key');
  assert.equal(popup.elements.setup.hidden, true);
  assert.equal(popup.elements.appShell.hidden, false);
});
test('saved key survives a fresh popup with an empty browser session; deletion persists', async () => {
  const local = {};
  let popup = await openPopup(local);
  popup.elements.key.value = 'fake-test-key';
  await popup.elements.saveKey.listeners.click();
  assert.equal(local.key, 'fake-test-key');
  popup = await openPopup(local, {});
  assert.equal(popup.elements.key.value, 'fake-test-key');
  await popup.elements.deleteKey.listeners.click();
  popup = await openPopup(local, {});
  assert.equal(popup.elements.key.value, '');
});
test('legacy key migrates and language selection persists independently of dubbing language', async () => {
  const local = {language: 'fa'}, session = {key: 'legacy-test-key'};
  let popup = await openPopup(local, session);
  assert.equal(local.key, 'legacy-test-key');
  assert.equal(session.key, undefined);
  popup.elements.uiLanguage.value = 'en';
  await popup.elements.uiLanguage.listeners.change();
  popup = await openPopup(local);
  assert.equal(popup.document.documentElement.lang, 'en');
  assert.equal(popup.document.documentElement.dir, 'ltr');
  assert.equal(popup.elements.language.value, 'fa');
  assert.equal(popup.elements.footerVersion.textContent, 'Dubly · v0.9.26');
  assert.ok(popup.labels.every(label => typeof label.textContent === 'string' && label.textContent.length));
  popup.elements.settingsToggle.listeners.click();
  assert.equal(popup.elements.settings.hidden, false);
  assert.equal(popup.elements.home.hidden, true);
  assert.equal(popup.elements.mainContent.scrollTop, 0);
  popup.elements.uiLanguage.value = 'fa';
  await popup.elements.uiLanguage.listeners.change();
  assert.equal(popup.document.documentElement.dir, 'rtl');
});
test('theme and transcript visibility persist across reopening', async () => {
  const local = {};
  let popup = await openPopup(local);
  assert.equal(popup.document.documentElement.dataset.theme, 'dark');
  await popup.themes[0].listeners.click();
  popup.elements.captionsToggle.checked = false;
  await popup.elements.captionsToggle.listeners.change();
  popup = await openPopup(local);
  assert.equal(popup.document.documentElement.dataset.theme, 'light');
  assert.equal(popup.elements.transcriptBody.hidden, true);
});
test('floating subtitles are a real output mode and are passed to translation start',async()=>{
  const local={originalVolume:20,outputMode:'subtitles'};
  const popup=await openPopup({...local,key:'saved-key'});
  assert.equal(popup.elements.outputMode.value,'subtitles');
  assert.equal(popup.elements.dubVolume.disabled,true);
  await popup.elements.start.listeners.click();
  const start=popup.messages.find(message=>message.type==='start');
  assert.equal(start.mode,'subtitles');
  assert.equal(start.floatingCaptions,true);
});

test('combined output keeps dubbed audio enabled and requests floating captions',async()=>{
  const popup=await openPopup({key:'saved-key',originalVolume:20,dubVolume:85,outputMode:'both'});
  assert.equal(popup.elements.outputMode.value,'both');
  assert.equal(popup.elements.dubVolume.disabled,false);
  await popup.elements.start.listeners.click();
  const start=popup.messages.find(message=>message.type==='start');
  assert.equal(start.mode,'both');
  assert.equal(start.floatingCaptions,true);
  assert.equal(start.originalVolume,20);
  assert.equal(start.dubVolume,85);
});

test('voice typing shows the active website and opens its microphone permission flow', async () => {
  const popup = await openPopup({key:'saved-key'});
  await popup.elements.voiceTab.listeners.click();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(popup.elements.voiceTyping.hidden, false);
  assert.equal(popup.elements.home.hidden, true);
  assert.equal(popup.elements.voiceSite.textContent, 'Telegram');
  await popup.elements.voiceEnable.listeners.click();
  assert.match(popup.elements.voiceStatus.textContent, /اجازهٔ میکروفن/);
  popup.elements.translationStart.offsetTop = 120;
  popup.elements.homeTab.listeners.click();
  assert.equal(popup.elements.home.hidden, false);
  assert.equal(popup.elements.voiceTyping.hidden, true);
  assert.equal(popup.elements.mainContent.scrollTop, 120);
  assert.equal(popup.elements.mixerCard.scrollOptions, undefined);
});

test('voice typing activates directly after microphone permission was granted once', async () => {
  const popup=await openPopup({key:'saved-key',microphoneGranted:true});
  await popup.elements.voiceTab.listeners.click();
  await popup.elements.voiceEnable.listeners.click();
  assert.equal(popup.elements.voiceEnable.hidden,true);
  assert.equal(popup.elements.voiceDisable.hidden,false);
});

test('voice typing explains when persistent website access is declined',async()=>{
  const popup=await openPopup({key:'saved-key',siteAccessGranted:false});
  await popup.elements.voiceTab.listeners.click();
  await popup.elements.voiceEnable.listeners.click();
  assert.match(popup.elements.voiceStatus.textContent,/اجازهٔ دسترسی به سایت‌ها/);
  assert.equal(popup.messages.some(message=>message.type==='voicePermissionFlow'),false);
});

test('bottom navigation stays outside the scrolling main area and translation controls stay in home', () => {
  const html = fs.readFileSync('popup.html','utf8');
  const css = fs.readFileSync('popup.css','utf8');
  assert.match(html, /<main id="mainContent">[\s\S]*<\/main>\s*<nav class="bottom-nav">/);
  assert.match(html, /<div id="home"><p id="sourceTab"[\s\S]*id="mixerCard"[\s\S]*class="card translation-settings"[\s\S]*id="transcriptCard"/);
  assert.match(css, /#appShell\{display:flex;flex-direction:column;[^}]*height:100%;[^}]*overflow:hidden\}/);
  assert.match(css, /main\{flex:1;overflow:auto;min-height:0/);
  assert.match(css, /\.bottom-nav\{align-items:center;box-sizing:border-box;flex:0 0 66px;height:66px;overflow:hidden/);
});
