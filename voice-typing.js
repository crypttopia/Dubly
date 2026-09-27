// Isolated page control for Voice Typing. It receives transcript text only.
(() => {
  if (globalThis.__dublyVoiceTyping) return globalThis.__dublyVoiceTyping.describe();
  let session = '', target = null, targetRange = null, finalText = '', interimText = '', insertedTranscript = '', panel, button, preview, insertButton, miniInsertButton, copyButton, deleteButton, status, top, titleBlock, heading, actions, minimizeButton, expandButton, closeButton;
  let minimized = false, dragMoved = false, uiLanguage = 'fa', statusValue = 'idle', recording = false;
  const pick = (fa, en) => uiLanguage === 'fa' ? fa : en;
  async function closeControl() {
    try { await chrome.runtime.sendMessage({target:'background',type:'voiceDisable'}); }
    catch { /* The extension may have been reloaded while this page stayed open. */ }
    finally { stop(); }
  }
  async function toggleRecording() {
    if (dragMoved) return;
    try {
      const result=await chrome.runtime.sendMessage({target:'background',type:'voiceToggle',session});
      if (result?.error) throw new Error(result.error);
    } catch {
      setStatus('idle',false);
      if (status) status.textContent=pick('ارتباط با افزونه قطع شد؛ صفحه را تازه‌سازی و تایپ صوتی را دوباره فعال کنید.','Extension connection lost. Reload this page and enable Voice Typing again.');
    }
  }
  const editable = element => element instanceof HTMLTextAreaElement || (element instanceof HTMLInputElement && /^(text|search|email|url|tel)$/i.test(element.type)) || element?.isContentEditable;
  function editableRoot(element) {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) return editable(element) ? element : null;
    if (!element?.isContentEditable) return null;
    return element.closest?.('[contenteditable="true"],[contenteditable="plaintext-only"],[role="textbox"]') || element;
  }
  function activeEditable() {
    let element=document.activeElement;
    while(element?.shadowRoot?.activeElement) element=element.shadowRoot.activeElement;
    return editableRoot(element);
  }
  function saveRange() {
    if (!target?.isContentEditable) return;
    const selection=getSelection();
    if (selection?.rangeCount && target.contains(selection.anchorNode)) targetRange=selection.getRangeAt(0).cloneRange();
  }
  function remember(event) {
    const next=(event.composedPath?.()||[]).map(editableRoot).find(Boolean)||editableRoot(event.target)||activeEditable();
    if(next){target=next;saveRange();view();}
  }
  const join = (before, text) => before && text && !/\s$/.test(before) && !/^\s/.test(text) ? before + ' ' + text : before + text;
  function fireInput(element, text = '') { element.dispatchEvent(new InputEvent('input', {bubbles:true, inputType:'insertText', data:text})); element.dispatchEvent(new Event('change', {bubbles:true})); }
  function insertText(text) {
    if (!text || !target?.isConnected) return false;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      target.focus();
      const start = target.selectionStart ?? target.value.length, end = target.selectionEnd ?? start;
      const insertion=start>0&&!/\s/.test(target.value.charAt(start-1))&&!/^\s/.test(text)?' '+text:text;
      target.setRangeText(insertion, start, end, 'end'); fireInput(target, insertion);
    } else {
      target.focus();
      const selection = getSelection();
      if(selection){selection.removeAllRanges();if(targetRange?.startContainer?.isConnected&&target.contains(targetRange.startContainer))selection.addRange(targetRange);else{const range=document.createRange();range.selectNodeContents(target);range.collapse(false);selection.addRange(range);}}
      const activeRange=selection?.rangeCount?selection.getRangeAt(0):null;
      let previous='';
      if(activeRange){try{const before=activeRange.cloneRange();before.selectNodeContents(target);before.setEnd(activeRange.startContainer,activeRange.startOffset);previous=before.toString().slice(-1);}catch{}}
      const insertion=previous&&!/\s/.test(previous)&&!/^\s/.test(text)?' '+text:text;
      let inserted=false;
      try{inserted=!!document.execCommand?.('insertText',false,insertion);}catch{}
      if(!inserted){const range=selection?.rangeCount?selection.getRangeAt(0):document.createRange();if(!selection?.rangeCount){range.selectNodeContents(target);range.collapse(false);}range.deleteContents();range.insertNode(document.createTextNode(insertion));range.collapse(false);selection?.removeAllRanges();selection?.addRange(range);fireInput(target,insertion);}else target.dispatchEvent(new Event('change',{bubbles:true}));
      saveRange();
    }
    return true;
  }
  const transcript = () => join(finalText, interimText);
  function pendingTranscript() {
    const text=transcript();
    if (!text) return '';
    return insertedTranscript && text.startsWith(insertedTranscript) ? text.slice(insertedTranscript.length) : text;
  }
  function insert() {
    if (!target?.isConnected) target=activeEditable();
    const text=pendingTranscript();
    if (text && insertText(text)) {
      finalText=''; interimText=''; insertedTranscript='';
      view();
    }
  }
  async function copy() { const text=transcript(); if (text) await navigator.clipboard.writeText(text).catch(() => {}); }
  function clearPreview() { finalText=''; interimText=''; insertedTranscript=''; view(); }
  function view() {
    if (!panel) return;
    const text = transcript();
    preview.textContent = text || pick('روی میکروفن بزنید و صحبت کنید…','Press the microphone and start speaking…');
    preview.classList.toggle('dubly-vt-empty', !text);
    insertButton.disabled = !pendingTranscript() || !target?.isConnected;
    miniInsertButton.disabled = insertButton.disabled;
    copyButton.disabled = !text;
    deleteButton.disabled = !text;
  }
  function setStatus(value, insertOnStop = true) {
    if (!button) return;
    const wasRecording = recording;
    statusValue = value;
    const listening = value === 'listening' || value === 'connecting';
    recording = listening;
    button.classList.toggle('dubly-vt-live', listening);
    button.setAttribute('aria-label', listening ? pick('توقف ضبط صدا','Stop recording') : pick('شروع ضبط صدا','Start voice typing'));
    button.title=listening?pick('توقف ضبط صدا','Stop recording'):pick('شروع ضبط صدا','Start voice typing');
    button.textContent = minimized ? (listening ? '■' : '▶') : (listening ? pick('توقف','Stop') : pick('شروع','Start'));
    Object.assign(button.style,{background:listening?'#df5868':'#20aa7d',boxShadow:listening?'0 5px 16px #df586866':'0 5px 16px #20aa7d55'});
    status.textContent = value === 'connecting' ? pick('در حال اتصال…','Connecting…') : value === 'listening' ? pick('در حال شنیدن','Listening') : pick('آماده','Ready');
    if (value === 'idle' && wasRecording && insertOnStop) insert();
  }
  function refreshLanguage() {
    if (!panel) return;
    panel.style.direction = uiLanguage === 'fa' ? 'rtl' : 'ltr';
    heading.textContent = pick('تایپ صوتی Dubly','Dubly Voice Typing');
    insertButton.textContent = pick('درج متن','Insert'); copyButton.textContent = pick('کپی','Copy'); deleteButton.textContent = pick('حذف','Delete');
    miniInsertButton.setAttribute('aria-label',pick('درج متن','Insert text'));
    miniInsertButton.title=pick('درج متن','Insert text');
    minimizeButton.setAttribute('aria-label',pick('کوچک‌کردن پنل','Minimize panel'));
    expandButton.setAttribute('aria-label',pick('بازکردن پنل','Expand panel'));
    closeButton.setAttribute('aria-label',pick('بستن تایپ صوتی','Close Voice Typing'));
    minimizeButton.title=pick('کوچک‌کردن پنل','Minimize panel');
    expandButton.title=pick('بازکردن پنل','Expand panel');
    closeButton.title=pick('بستن تایپ صوتی','Close Voice Typing');
    top.title=pick('فضای خالی را بکشید تا پنل جابه‌جا شود','Drag the empty area to move the panel');
    setStatus(statusValue); view();
  }
  function setMinimized(next) {
    minimized = next;
    if (!panel) return;
    if (minimized) {
      Object.assign(panel.style,{width:'126px',height:'54px',padding:'4px',borderRadius:'27px',overflow:'hidden'});
      Object.assign(top.style,{justifyContent:'space-between',height:'100%',gap:'4px'});
      titleBlock.style.display='none'; preview.style.display='none'; actions.style.display='none'; minimizeButton.style.display='none'; closeButton.style.display='none'; miniInsertButton.style.display='grid'; expandButton.style.display='grid';
      Object.assign(button.style,{width:'46px',height:'46px',fontSize:'20px'});
      setStatus(statusValue, false);
      panel.title='';
      top.title=pick('فضای خالی را بکشید تا پنل جابه‌جا شود','Drag the empty area to move the panel');
    } else {
      Object.assign(panel.style,{width:'290px',height:'auto',padding:'12px',borderRadius:'18px',overflow:'visible'});
      Object.assign(top.style,{justifyContent:'initial',height:'auto'});
      titleBlock.style.display=''; preview.style.display=''; actions.style.display='flex'; minimizeButton.style.display=''; closeButton.style.display=''; miniInsertButton.style.display='none'; expandButton.style.display='none';
      Object.assign(button.style,{width:'58px',height:'38px',fontSize:'11px'});
      panel.title='';
      setStatus(statusValue, false);
    }
  }
  function makeDraggable() {
    let offsetX=0, offsetY=0, pointerId=null;
    const move = event => {
      if (pointerId !== event.pointerId || !panel) return;
      const width=panel.offsetWidth, height=panel.offsetHeight;
      const left=Math.max(6,Math.min(window.innerWidth-width-6,event.clientX-offsetX));
      const topValue=Math.max(6,Math.min(window.innerHeight-height-6,event.clientY-offsetY));
      Object.assign(panel.style,{left:left+'px',top:topValue+'px',right:'auto',bottom:'auto'});
      dragMoved=true;
    };
    const end = event => { if(pointerId!==event.pointerId)return; pointerId=null; setTimeout(()=>{dragMoved=false;},0); };
    top.addEventListener('pointerdown',event=>{
      const eventElement=event.target instanceof Element?event.target:null;
      if (eventElement?.closest('button')) return;
      if (!Number.isFinite(event.pointerId)) return;
      const rect=panel.getBoundingClientRect(); offsetX=event.clientX-rect.left; offsetY=event.clientY-rect.top; pointerId=event.pointerId; dragMoved=false;
      try { top.setPointerCapture?.(pointerId); } catch { pointerId=null; }
    });
    top.addEventListener('pointermove',move); top.addEventListener('pointerup',end); top.addEventListener('pointercancel',end);
  }
  function make() {
    if (panel) return;
    panel = document.createElement('div'); panel.id = 'dubly-voice-typing';
    Object.assign(panel.style,{position:'fixed',right:'20px',bottom:'20px',zIndex:'2147483647',width:'290px',padding:'12px',border:'1px solid #7f80ff88',borderRadius:'18px',background:'#1a1c24',color:'#f1f1fa',font:'12px/1.6 Vazirmatn,Tahoma,Arial,sans-serif',boxShadow:'0 12px 32px #0008',direction:uiLanguage==='fa'?'rtl':'ltr'});
    top=document.createElement('div');Object.assign(top.style,{display:'flex',alignItems:'center',gap:'9px',cursor:'grab',touchAction:'none'});
    button=document.createElement('button');button.type='button';Object.assign(button.style,{display:'grid',placeItems:'center',textAlign:'center',width:'58px',height:'38px',padding:'0',border:'0',borderRadius:'20px',color:'#fff',fontSize:'11px',fontWeight:'700',lineHeight:'1',cursor:'pointer',flexShrink:'0'});button.onclick=toggleRecording;
    miniInsertButton=document.createElement('button');miniInsertButton.type='button';miniInsertButton.textContent='↵';Object.assign(miniInsertButton.style,{display:'none',placeItems:'center',textAlign:'center',width:'28px',height:'28px',padding:'0',border:'1px solid #696bd8',borderRadius:'50%',background:'#36385f',color:'#fff',fontSize:'17px',lineHeight:'1',cursor:'pointer',flexShrink:'0'});miniInsertButton.onclick=insert;
    titleBlock=document.createElement('div');heading=document.createElement('b');status=document.createElement('small');Object.assign(status.style,{display:'block',color:'#a2a6b8'});titleBlock.append(heading,status);
    minimizeButton=document.createElement('button');minimizeButton.type='button';minimizeButton.textContent='−';minimizeButton.setAttribute('aria-label',pick('کوچک‌کردن پنل','Minimize panel'));Object.assign(minimizeButton.style,{display:'grid',placeItems:'center',textAlign:'center',width:'28px',height:'28px',padding:'0',marginInlineStart:'auto',border:'1px solid #45475b',borderRadius:'9px',background:'#252838',color:'#f1f1fa',fontSize:'19px',lineHeight:'1',cursor:'pointer'});minimizeButton.onclick=()=>setMinimized(true);
    expandButton=document.createElement('button');expandButton.type='button';expandButton.textContent='↗';expandButton.setAttribute('aria-label',pick('بازکردن پنل','Expand panel'));Object.assign(expandButton.style,{display:'none',placeItems:'center',textAlign:'center',width:'28px',height:'28px',padding:'0',border:'1px solid #45475b',borderRadius:'50%',background:'#252838',color:'#f1f1fa',fontSize:'15px',lineHeight:'1',cursor:'pointer',flexShrink:'0'});expandButton.onclick=()=>setMinimized(false);
    closeButton=document.createElement('button');closeButton.type='button';closeButton.textContent='×';Object.assign(closeButton.style,{display:'grid',placeItems:'center',textAlign:'center',width:'28px',height:'28px',padding:'0',border:'1px solid #7c4350',borderRadius:'9px',background:'#512a34',color:'#ffdce1',fontSize:'18px',lineHeight:'1',cursor:'pointer',flexShrink:'0'});closeButton.onclick=closeControl;
    top.append(button,miniInsertButton,titleBlock,minimizeButton,closeButton,expandButton);panel.append(top);
    preview=document.createElement('p');Object.assign(preview.style,{minHeight:'48px',margin:'11px 0 9px',padding:'9px',borderRadius:'11px',background:'#14171f',whiteSpace:'pre-wrap'});panel.append(preview);
    actions=document.createElement('div');Object.assign(actions.style,{display:'flex',gap:'7px'});insertButton=document.createElement('button');copyButton=document.createElement('button');deleteButton=document.createElement('button');for(const item of [insertButton,copyButton,deleteButton])Object.assign(item.style,{display:'grid',placeItems:'center',textAlign:'center',flex:'1',padding:'8px 5px',border:'1px solid #45475b',borderRadius:'9px',background:'#252838',color:'#f1f1fa',lineHeight:'1.4',cursor:'pointer'});insertButton.onclick=insert;copyButton.onclick=copy;deleteButton.onclick=clearPreview;actions.append(insertButton,copyButton,deleteButton);panel.append(actions);document.documentElement.append(panel);makeDraggable();refreshLanguage();setStatus('idle');
  }
  function stop() { panel?.remove();panel=button=preview=insertButton=miniInsertButton=copyButton=deleteButton=status=top=titleBlock=heading=actions=minimizeButton=expandButton=closeButton=null;session='';target=null;targetRange=null;finalText='';interimText='';insertedTranscript='';minimized=false;statusValue='idle';recording=false; }
  document.addEventListener('focusin',remember,true);document.addEventListener('pointerdown',remember,true);
  chrome.runtime.onMessage.addListener((message,sender,reply)=>{
    if(message.target!=='voiceTyping')return;
    if(message.type==='enable'){stop();uiLanguage=message.uiLanguage==='en'?'en':'fa';session=message.session;make();reply({ok:true});return;}
    if(message.session!==session)return;
    if(message.type==='disable'){stop();reply({ok:true});return;}
    if(message.type==='language'){uiLanguage=message.uiLanguage==='en'?'en':'fa';refreshLanguage();reply({ok:true});return;}
    if(message.type==='state'){setStatus(message.state);reply({ok:true});return;}
    if(message.type==='text'){const chunk=String(message.text||'').trim();if(message.final){if(chunk)finalText=join(finalText,chunk);interimText='';}else interimText=chunk;view();reply({ok:true});return;}
    if(message.type==='error'){setStatus('idle',false);status.textContent=String(message.error||pick('خطا در تبدیل گفتار','Speech recognition error'));reply({ok:true});}
  });
  globalThis.__dublyVoiceTyping={describe:()=>({enabled:!!panel})};return globalThis.__dublyVoiceTyping.describe();
})();
