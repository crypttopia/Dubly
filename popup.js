const $ = id => document.getElementById(id);
let busy = false, uiLanguage = 'fa', savedKey = '', settingsOpen = false, voiceOpen = false, voiceEnabled = false;
let current = {state: 'idle'}, localError = '', savedMessage = '', waiting = false;
let theme = 'auto', captionsVisible = true;
let verifiedKey = '', testing = false;
let setupOpen = false, setupSaving = false;
const systemTheme = matchMedia('(prefers-color-scheme: dark)');
const t = key => translations[uiLanguage][key];
const send = (type, values = {}) => chrome.runtime.sendMessage({target: 'background', type, ...values});
document.querySelectorAll('[data-page]').forEach(anchor => {
  const page = anchor.dataset.page;
  anchor.href = chrome.runtime.getURL('pages.html?page=' + page);
});
function diagnostic(text) {
  if (uiLanguage === 'fa') return text;
  return englishErrors.reduce((result, [fa, en]) => result.split(fa).join(en), text);
}
function render(result = current) {
  current = result;
  const active = ['connecting', 'live'].includes(result.state);
  const visibleError = localError ? t(localError) : diagnostic(result.error || '');
  $('status').textContent = visibleError || t(result.state || 'idle');
  $('status').classList.toggle('error', !!visibleError);
  $('status').setAttribute('role', visibleError ? 'alert' : 'status');
  $('dot').className = visibleError ? 'error' : result.state === 'live' ? 'live' : '';
  $('start').disabled = busy || active;
  $('stop').disabled = busy || !active;
  $('language').disabled = busy || active;
  if (active && result.mode) $('outputMode').value = ['dubbing', 'subtitles', 'both'].includes(result.mode) ? result.mode : 'dubbing';
  $('outputMode').disabled = busy || active;
  document.querySelectorAll('[data-language]').forEach(button => {
    button.disabled = busy || active;
    button.classList.toggle('selected', button.dataset.language === $('language').value);
    button.setAttribute('aria-pressed', String(button.dataset.language === $('language').value));
  });
  $('keyBadge').textContent = t(savedKey ? 'keyStored' : 'keyEmpty');
  if (verifiedKey && verifiedKey === savedKey) $('keyBadge').textContent = t('verified');
  $('testKey').disabled = testing || active;
  $('testKey').textContent = t(testing ? 'testing' : 'testKey');
  $('sourceTab').textContent = active ? result.tabTitle || '' : '';
  $('sessionTime').textContent = result.elapsed ? Math.floor(result.elapsed / 60) + ':' + String(result.elapsed % 60).padStart(2,'0') : '0:00';
  for (const id of ['originalVolume', 'dubVolume']) $(id).disabled = busy;
  $('dubVolume').disabled = busy || $('outputMode').value === 'subtitles';
  $('error').textContent = '';
  $('saved').textContent = savedMessage ? t(savedMessage) : '';
  $('transcript').textContent = result.transcript || t(waiting ? 'waiting' : 'empty');
  $('transcript').scrollTop = $('transcript').scrollHeight;
}
function showSettings(open, focusKey = false) {
  settingsOpen = open;
  if (open) voiceOpen = false;
  $('home').hidden = open || voiceOpen; $('voiceTyping').hidden = !voiceOpen; $('settings').hidden = !open;
  $('settingsToggle').setAttribute('aria-expanded', String(open));
  $('settingsToggle').classList.toggle('active', open);
  $('homeTab').classList.toggle('active', !open && !voiceOpen);
  $('voiceTab').classList.toggle('active', voiceOpen);
  if (open && focusKey) $('mainContent').scrollTo?.({top:0,behavior:'smooth'});
}
function scrollMainTo(element, center = false) {
  const main = $('mainContent');
  let top = Number(element?.offsetTop) || 0;
  if (element?.getBoundingClientRect && main?.getBoundingClientRect) {
    const targetRect = element.getBoundingClientRect();
    const mainRect = main.getBoundingClientRect();
    top = main.scrollTop + targetRect.top - mainRect.top;
    if (center) top -= Math.max(0, (main.clientHeight - targetRect.height) / 2);
  }
  main.scrollTo?.({top:Math.max(0,top),behavior:'smooth'});
}
async function showVoice(open) {
  voiceOpen = open;
  showSettings(false);
  await renderVoice();
  if (open) scrollMainTo(voiceEnabled ? $('voiceDisable') : $('voiceEnable'), true);
}
function showHome() {
  voiceOpen = false;
  showSettings(false);
  scrollMainTo($('translationStart'));
}
async function renderVoice() {
  let state = 'idle', voiceError = '';
  try { voiceEnabled = !!(await chrome.storage.session.get('voiceTarget')).voiceTarget; } catch {}
  try {
    const context = await send('voiceContext');
    $('voiceSite').textContent = context.supported ? (context.title || context.domain) : t('voiceUnsupportedSite');
    $('voiceSite').title = context.domain || '';
  } catch { $('voiceSite').textContent = t('voiceUnsupportedSite'); }
  if (voiceEnabled) { try { const result=await send('voiceStatus');state=result.state||'idle';voiceError=result.error||''; } catch {} }
  $('voiceStatus').textContent = voiceError ? diagnostic(voiceError) : state === 'listening' ? t('voiceListening') : state === 'connecting' ? t('voiceConnecting') : voiceEnabled ? t('voiceReady') : t('voiceDisabled');
  $('voiceStatus').parentElement?.classList?.toggle('live', state === 'listening' || state === 'connecting');
  $('voiceEnable').hidden = voiceEnabled; $('voiceDisable').hidden = !voiceEnabled;
}
function showSetup(open) {
  setupOpen = open;
  $('setup').hidden = !open;
  $('appShell').hidden = open;
  if (open) {
    $('setupKey').value = '';
    $('setupMessage').textContent = '';
    $('setupMessage').classList.remove('success');
  }
}
function applyLanguage() {
  document.documentElement.lang = uiLanguage;
  document.documentElement.dir = uiLanguage === 'fa' ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-i18n]').forEach(element => { element.textContent = t(element.dataset.i18n); });
  $('profile').setAttribute('aria-label', t('settings'));
  $('showKey').setAttribute('aria-label', t($('key').type === 'text' ? 'hideKey' : 'showKey'));
  $('captionsToggle').setAttribute('aria-label', t('captions'));
  $('language').setAttribute('aria-label', t('target'));
  $('directionLabel').textContent = uiLanguage === 'fa' ? 'RTL / راست‌چین' : 'LTR / Left to right';
  $('setupSave').textContent = t(setupSaving ? 'setupChecking' : 'setupSave');
  showSettings(settingsOpen); updateVolumeLabels(); render();
  renderVoice();
}
async function refresh() {
  if (busy) return;
  try { render(await send('status')); if (voiceOpen) await renderVoice(); } catch { localError = 'connectionError'; render(); }
}
$('settingsToggle').addEventListener('click', () => showSettings(true, true));
$('homeTab').addEventListener('click', showHome);
$('voiceTab').addEventListener('click', () => showVoice(true));
$('profile').addEventListener('click', () => showSettings(true, true));
$('voiceEnable').addEventListener('click', async () => {
  try {
    const persistentAccess=await chrome.permissions.request({origins:['http://*/*','https://*/*']});
    if (!persistentAccess) throw new Error(t('voiceSiteAccessRequired'));
    const result = await send('voicePermissionFlow');
    if (result?.enabled) { voiceEnabled=true; await renderVoice(); return; }
    if (result?.opened) { $('voiceStatus').textContent=t('voicePermissionWindow'); return; }
    throw new Error(result?.error || 'not-opened');
  }
  catch (error) { $('voiceStatus').textContent = diagnostic(error?.message || t('voiceEnableError')); }
});
$('voiceDisable').addEventListener('click', async () => { await send('voiceDisable'); voiceEnabled = false; await renderVoice(); });
$('showKey').addEventListener('click', () => {
  $('key').type = $('key').type === 'password' ? 'text' : 'password';
  $('showKey').setAttribute('aria-label', t($('key').type === 'text' ? 'hideKey' : 'showKey'));
});
function applyTheme() {
  document.documentElement.dataset.theme = theme === 'auto' ? (systemTheme.matches ? 'dark' : 'light') : theme;
  document.querySelectorAll('[data-theme-choice]').forEach(button => {
    button.classList.toggle('selected', button.dataset.themeChoice === theme);
    button.setAttribute('aria-pressed', String(button.dataset.themeChoice === theme));
  });
}
systemTheme.addEventListener('change', applyTheme);
document.querySelectorAll('[data-theme-choice]').forEach(button => button.addEventListener('click', async () => {
  theme = button.dataset.themeChoice; applyTheme();
  try { await chrome.storage.local.set({theme}); } catch { localError = 'saveError'; render(); }
}));
$('captionsToggle').addEventListener('change', async () => {
  captionsVisible = $('captionsToggle').checked;
  $('transcriptBody').hidden = !captionsVisible;
  try { await chrome.storage.local.set({captionsVisible}); } catch { localError = 'saveError'; render(); }
});
document.querySelectorAll('[data-language]').forEach(button => button.addEventListener('click', async () => {
  $('language').value = button.dataset.language; render();
  try { await chrome.storage.local.set({language: $('language').value}); } catch { localError = 'saveError'; render(); }
}));
$('language').addEventListener('change', async () => {
  render();
  try { await chrome.storage.local.set({language: $('language').value}); } catch { localError = 'saveError'; render(); }
});
$('outputMode').addEventListener('change', async () => {
  // Restore the source audio when choosing subtitles; preserve dubbing mix separately.
  const mode = $('outputMode').value;
  try {
    const preferences = await chrome.storage.local.get(['originalVolume','subtitleVolume']);
    $('originalVolume').value = mode === 'subtitles' ? preferences.subtitleVolume ?? 100 : preferences.originalVolume ?? 0;
    updateVolumeLabels(); render();
    await chrome.storage.local.set({outputMode:mode});
  } catch { localError = 'saveError'; render(); }
});
$('uiLanguage').addEventListener('change', async () => {
  uiLanguage = $('uiLanguage').value;
  applyLanguage();
  try { await chrome.storage.local.set({uiLanguage}); if (voiceEnabled) await send('voiceLanguage',{uiLanguage}); } catch { localError = 'saveError'; render(); }
});
async function saveSetupKey() {
  const key = $('setupKey').value.trim();
  if (!key) {
    $('setupMessage').textContent = t('setupMissing');
    $('setupMessage').classList.remove('success');
    $('setupKey').focus();
    return;
  }
  setupSaving = true;
  $('setupMessage').textContent = t('setupChecking');
  $('setupMessage').classList.remove('success');
  applyLanguage();
  try {
    const result = await send('testKey', {key, language: $('language').value});
    if (!result.verified) throw new Error('invalid');
    await chrome.storage.local.set({key});
    savedKey = key;
    verifiedKey = key;
    $('key').value = key;
    showSetup(false);
    await refresh();
  } catch {
    $('setupMessage').textContent = t('setupInvalid');
    $('setupMessage').classList.remove('success');
  } finally {
    setupSaving = false;
    if (setupOpen) applyLanguage();
  }
}
$('setupSave').addEventListener('click', saveSetupKey);
$('setupKey').addEventListener('keydown', event => { if (event.key === 'Enter') void saveSetupKey(); });
$('saveKey').addEventListener('click', async () => {
  const key = $('key').value.trim();
  if (!key) { localError = 'missing'; render(); return; }
  try {
    await chrome.storage.local.set({key});
    savedKey = key; savedMessage = 'saved'; localError = '';
  } catch { localError = 'saveError'; }
  render();
});
$('testKey').addEventListener('click', async () => {
  const key = $('key').value.trim();
  if (!key) { localError = 'missing'; render(); return; }
  testing = true; localError = ''; render();
  try {
    const result = await send('testKey', {key, language: $('language').value});
    if (!result.verified) { verifiedKey = ''; savedMessage = 'testFailed'; }
    else { verifiedKey = key; savedMessage = 'verified'; }
  } catch { verifiedKey = ''; savedMessage = 'testFailed'; }
  testing = false; render();
});
$('deleteKey').addEventListener('click', async () => {
  try {
    await chrome.storage.local.remove('key');
    await chrome.storage.session.remove('key');
    savedKey = ''; $('key').value = ''; savedMessage = 'deleted'; localError = '';
    await send('stop');
    showSetup(true);
  } catch { localError = 'saveError'; }
  render();
});
$('start').addEventListener('click', async () => {
  if (!savedKey) { localError = 'missing'; showSettings(true); render(); $('key').focus(); return; }
  localError = ''; busy = true; waiting = true; render({state: 'connecting'});
  try {
    const mode=$('outputMode').value;
    await chrome.storage.local.set({language:$('language').value,outputMode:mode,...volumePreferences()});
    const result = await send('start', {key:savedKey,language:$('language').value,mode,floatingCaptions:mode!=='dubbing',limitMinutes:Number($('sessionLimit').value),...volumes()});
    busy = false; render(result);
  } catch { busy = false; localError = 'startError'; render({state: 'error'}); }
});
$('stop').addEventListener('click', async () => {
  busy = true; localError = ''; render();
  try { const result = await send('stop'); busy = false; waiting = false; render(result); }
  catch { busy = false; localError = 'stopError'; render({state: 'error'}); }
});
async function init() {
  await chrome.storage.local.setAccessLevel({accessLevel: 'TRUSTED_CONTEXTS'});
  const [session, preferences] = await Promise.all([chrome.storage.session.get('key'), chrome.storage.local.get(['key', 'uiLanguage', 'language', 'original', 'originalVolume', 'dubVolume', 'theme', 'captionsVisible', 'limitMinutes', 'outputMode', 'subtitleVolume', 'floatingCaptions'])]);
  savedKey = preferences.key || session.key || '';
  if (!preferences.key && session.key) await chrome.storage.local.set({key: session.key});
  await chrome.storage.session.remove('key');
  $('key').value = savedKey;
  uiLanguage = preferences.uiLanguage === 'en' ? 'en' : 'fa';
  $('uiLanguage').value = uiLanguage;
  const persianOption = $('language').querySelector?.('option[value="fa"]');
  if (persianOption) $('language').prepend(persianOption);
  $('language').value = preferences.language || 'fa';
  $('outputMode').value = ['subtitles','both'].includes(preferences.outputMode) ? preferences.outputMode : preferences.floatingCaptions === true ? 'subtitles' : 'dubbing';
  $('originalVolume').value = $('outputMode').value === 'subtitles' ? preferences.subtitleVolume ?? 100 : preferences.originalVolume ?? (preferences.original ? 20 : 0);
  $('dubVolume').value = preferences.dubVolume ?? 100;
  const version = chrome.runtime.getManifest().version;
  if ($('footerVersion')) $('footerVersion').textContent = 'Dubly · v' + version;
  $('sessionLimit').value = preferences.limitMinutes || '0';
  theme = ['dark', 'light', 'auto'].includes(preferences.theme) ? preferences.theme : 'auto';
  captionsVisible = preferences.captionsVisible !== false;
  $('captionsToggle').checked = captionsVisible; $('transcriptBody').hidden = !captionsVisible;
  applyTheme();
  applyLanguage();
  voiceEnabled = !!(await chrome.storage.session.get('voiceTarget')).voiceTarget;
  showSetup(!savedKey);
  if (savedKey) await refresh();
  setInterval(() => { if (!setupOpen) void refresh(); }, 1000);
}
$('sessionLimit').addEventListener('change', async () => {
  try { await chrome.storage.local.set({limitMinutes: Number($('sessionLimit').value)}); } catch { localError = 'saveError'; render(); }
});
function volumes() { return {originalVolume: Number($('originalVolume').value), dubVolume: Number($('dubVolume').value)}; }
function volumePreferences() {
  const values = volumes();
  return $('outputMode').value === 'subtitles' ? {subtitleVolume:values.originalVolume,dubVolume:values.dubVolume} : values;
}
function updateVolumeLabels() {
  const locale = uiLanguage === 'fa' ? 'fa-IR' : 'en-US';
  $('originalValue').textContent = Number($('originalVolume').value).toLocaleString(locale) + (uiLanguage === 'fa' ? '٪' : '%');
  $('dubValue').textContent = Number($('dubVolume').value).toLocaleString(locale) + (uiLanguage === 'fa' ? '٪' : '%');
}
for (const id of ['originalVolume', 'dubVolume']) {
  $(id).addEventListener('input', async () => {
    updateVolumeLabels();
    try { const result = await send('volume', volumes()); if (result.error) render(result); }
    catch { localError = 'volumeError'; render(); }
  });
  $(id).addEventListener('change', () => {
    chrome.storage.local.set(volumePreferences()).catch(() => { localError = 'saveError'; render(); });
  });
}
init().catch(() => { localError = 'loadError'; applyLanguage(); });
