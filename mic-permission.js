const $ = id => document.getElementById(id);
const copy = {
  fa:{title:'اجازهٔ دسترسی به میکروفن',description:'برای تبدیل صدای شما به متن، دسترسی میکروفن را برای Dubly تأیید کنید. بررسی اجازه ممکن است میکروفن را لحظه‌ای باز کند؛ ارسال صدا فقط بعد از زدن «شروع» در کنترل شناور آغاز می‌شود.',allow:'اجازه دادن به میکروفن',settings:'بازکردن تنظیمات میکروفن Chrome',waiting:'منتظر تأیید شما…',working:'در حال فعال‌کردن کنترل شناور…',ready:'کنترل تایپ صوتی فعال شد. این پنجره بسته می‌شود.',denied:'دسترسی میکروفن داده نشد. دوباره امتحان کنید یا آن را در تنظیمات Chrome فعال کنید.',failed:'کنترل روی صفحه فعال نشد. صفحه را تازه‌سازی و دوباره امتحان کنید.',privacy:'هنگام ضبط، صدا با کلید شما مستقیماً برای رونویسی به Google می‌رود. صدا، متن و کلید از سرورهای Dubly عبور نمی‌کنند و روی آن‌ها ذخیره نمی‌شوند.'},
  en:{title:'Allow microphone access',description:'Allow Dubly to turn speech into text. The permission check may open the microphone briefly; audio transmission starts only after you press Start on the floating control.',allow:'Allow microphone',settings:'Open Chrome microphone settings',waiting:'Waiting for your permission…',working:'Enabling the floating control…',ready:'Voice Typing is ready. This window will close.',denied:'Microphone access was not granted. Try again or enable it in Chrome settings.',failed:'The control could not be added to the page. Refresh the page and try again.',privacy:'While recording, audio is sent with your key directly to Google for transcription. Audio, text, and the key never pass through or are stored on Dubly servers.'}
};
let language='fa', running=false;
const q = new URLSearchParams(location.search);
const tabId = Number(q.get('tabId'));
function render(){const t=copy[language];document.documentElement.lang=language;document.documentElement.dir=language==='fa'?'rtl':'ltr';$('title').textContent=t.title;$('description').textContent=t.description;$('allow').textContent=t.allow;$('settings').textContent=t.settings;$('privacy').textContent=t.privacy;$('site').textContent=q.get('site')||'';}
function status(text,error=false){$('status').textContent=text;$('status').classList.toggle('error',error);}
async function requestMicrophone(){
  if(running)return;running=true;$('allow').disabled=true;$('settings').hidden=true;status(copy[language].waiting);
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true,video:false});
    stream.getTracks().forEach(track=>track.stop());
    await chrome.storage.local.set({microphoneGranted:true});
    status(copy[language].working);
    const result=await chrome.runtime.sendMessage({target:'background',type:'voiceEnableForTab',tabId});
    if(!result?.enabled)throw new Error(result?.error||'enable-failed');
    status(copy[language].ready);setTimeout(()=>window.close(),1100);
  }catch(error){
    const denied=error?.name==='NotAllowedError'||error?.name==='PermissionDeniedError';
    status(denied?copy[language].denied:copy[language].failed,true);
    $('settings').hidden=!denied;$('allow').disabled=false;running=false;
  }
}
$('allow').addEventListener('click',requestMicrophone);
$('settings').addEventListener('click',()=>chrome.runtime.sendMessage({target:'background',type:'openMicrophoneSettings'}));
chrome.storage.local.get('uiLanguage').then(values=>{language=values.uiLanguage==='en'?'en':'fa';render();requestMicrophone();});
