'use strict';
const $=id=>document.getElementById(id);const STORE='nimessage.v15.';let db,pc=null,channel=null,mode=null,offer=null,answer=null,activeId=null,connectedId=null,stream=null,privacy='approval';let chats=[];
const stamp=()=>Date.now(),uid=()=>crypto.randomUUID(),nick=()=>($('nick').value.trim()||'User').slice(0,30);
function say(t){$('connectState').textContent=t;console.info('[niMessage]',t)}function state(s,on=false){$('status').textContent='● '+s;$('status').classList.toggle('on',on);$('chatHint').textContent=s;$('message').disabled=!on;$('send').disabled=!on}
function openDB(){return new Promise((resolve,reject)=>{let r=indexedDB.open('niMessageDB',1);r.onupgradeneeded=()=>r.result.createObjectStore('chats',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
function persist(chat){return new Promise((resolve,reject)=>{const tx=db.transaction('chats','readwrite');tx.objectStore('chats').put(chat);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}
function removeChat(id){return new Promise((resolve,reject)=>{const tx=db.transaction('chats','readwrite');tx.objectStore('chats').delete(id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}
function loadChats(){return new Promise((resolve,reject)=>{let tx=db.transaction('chats');let r=tx.objectStore('chats').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
function selected(){return chats.find(c=>c.id===activeId)}function cleanText(s){return String(s||'').slice(0,5000)}
function renderChats(){let wrap=$('chats');wrap.replaceChildren();if(!chats.length){let p=document.createElement('p');p.className='muted';p.textContent='Чатов пока нет';wrap.append(p)}for(const c of [...chats].sort((a,b)=>(b.updated||0)-(a.updated||0))){let el=document.createElement('div');el.className='chatitem'+(c.id===activeId?' active':'');let left=document.createElement('div'),name=document.createElement('strong'),last=document.createElement('small'),tag=document.createElement('span');name.textContent=c.name;last.textContent=(c.messages.at(-1)?.text||'Нет сообщений').slice(0,36);tag.className='badge';tag.textContent=c.archived?'АРХИВ':'●';left.append(name,last);el.append(left,tag);el.onclick=()=>{activeId=c.id;render()};wrap.append(el)}}
function render(){renderChats();const c=selected();$('chatTitle').textContent=c?.name||'Новый разговор';$('archive').disabled=!c;$('archive').textContent=c?.archived?'Вернуть из архива':'В архив';let box=$('messages');box.replaceChildren();if(!c||!c.messages.length){let e=document.createElement('div');e.className='empty';e.innerHTML='<span>✉</span><strong>Здесь начнётся разговор</strong><p>Создай подключение или присоединись по коду.</p>';box.append(e)}else for(const m of c.messages){let b=document.createElement('div');b.className='bubble'+(m.me?' me':'');b.append(document.createTextNode(m.text));let sm=document.createElement('small');sm.textContent=new Date(m.at).toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'});b.append(sm);box.append(b)}box.scrollTop=box.scrollHeight}
function newChat(name='Собеседник',peerId=null){let c={id:uid(),name,peerId,messages:[],archived:false,updated:stamp(),lastDisconnected:null};chats.push(c);activeId=c.id;persist(c);render();return c}
async function addMessage(text,me){let c=selected();if(!c)c=newChat();c.messages.push({id:uid(),text:cleanText(text),me,at:stamp()});c.updated=stamp();c.archived=false;await persist(c);render()}
function b64(bytes){let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function unb64(s){s=s.replace(/-/g,'+').replace(/_/g,'/');let bin=atob(s);return Uint8Array.from(bin,c=>c.charCodeAt(0))}
function pack(o){return 'AC1:'+b64(pako.deflate(new TextEncoder().encode(JSON.stringify(o))))}
function unpack(t){t=t.trim();if(!t.startsWith('AC1:'))throw Error('Неизвестный формат кода');const o=JSON.parse(new TextDecoder().decode(pako.inflate(unb64(t.slice(4)))));if(o.v!==1||!['offer','answer'].includes(o.type)||typeof o.sdp!=='string'||o.sdp.length>100000)throw Error('Некорректный код');return o}
function qrShow(value){const box=$('qrWrap');box.hidden=true;const canvas=$('qrCanvas');try{const q=new AirQR(0,1);q.addData(value);q.make();let n=q.getModuleCount(),scale=Math.max(2,Math.floor(520/(n+8)));canvas.width=canvas.height=(n+8)*scale;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#222';for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(q.isDark(y,x))ctx.fillRect((x+4)*scale,(y+4)*scale,scale,scale);box.hidden=false}catch(e){console.warn('QR unavailable',e);box.hidden=true}}
function showCode(obj){let s=pack(obj);$('outCode').value=s;qrShow(s);say('Код готов! Передай его другому устройству. Если QR не появился, нажми «Скопировать код».')}
function stopCamera(){scanSession++;if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}$('camera').hidden=true}
function closeDialog(){stopCamera();$('connectDialog').close()}
function shutdown(){stopCamera();if(channel){try{channel.close()}catch(e){}channel=null}if(pc){pc.onconnectionstatechange=null;pc.close();pc=null}if(connectedId){let c=chats.find(x=>x.id===connectedId);if(c){c.lastDisconnected=stamp();persist(c)}}connectedId=null;state('Не подключено')}
function newPeer(){shutdown();pc=new RTCPeerConnection({iceServers:[]});pc.onconnectionstatechange=()=>{if(!pc)return;let s=pc.connectionState;if(s==='connected')state('Подключено',true);else if(s==='disconnected')state('Переподключение...');else if(s==='failed'||s==='closed'){state('Связь потеряна');if(connectedId){let c=chats.find(x=>x.id===connectedId);if(c){c.lastDisconnected=stamp();persist(c)}}}};pc.ondatachannel=e=>attachChannel(e.channel);return pc}
function attachChannel(ch){channel=ch;channel.onopen=async()=>{state('Подключено',true);closeDialog();if(!selected())newChat();connectedId=activeId;const c=selected();c.lastDisconnected=null;c.archived=false;await persist(c);render();ch.send(JSON.stringify({type:'hello',name:nick(),id:localStorage.getItem(STORE+'id')}))};ch.onclose=()=>{state('Связь потеряна');if(connectedId){let c=chats.find(x=>x.id===connectedId);if(c){c.lastDisconnected=stamp();persist(c)}}};ch.onmessage=async e=>{let d;try{d=JSON.parse(e.data)}catch{return}if(d.type==='hello'){let c=selected();if(!c)c=newChat(d.name,d.id);const policy=$('privacy').value;if(policy==='whitelist'&&c.peerId&&c.peerId!==d.id){alert('Идентификатор собеседника изменился. Соединение закрыто.');shutdown();return}if(policy==='whitelist'&&!c.peerId){alert('Для нового собеседника включён режим «только белый список». Сначала переключи режим и подтверди нового человека.');shutdown();return}if(c.peerId&&c.peerId!==d.id){if(!confirm('Внимание: идентификатор собеседника отличается от сохранённого. Продолжить?')){shutdown();return}}c.name=cleanText(d.name||c.name);c.peerId=d.id;c.archived=false;await persist(c);render()}else if(d.type==='message'){await addMessage(d.text,false)}}}
function iceComplete(p) {
  return new Promise((resolve, reject) => {
    if (p.iceGatheringState === 'complete') return resolve();

    const timer = setTimeout(() => {
      p.removeEventListener('icegatheringstatechange', check);
      reject(Error('Не удалось собрать сетевые адреса за 15 секунд'));
    }, 15000);

    function check() {
      if (p.iceGatheringState === 'complete') {
        clearTimeout(timer);
        p.removeEventListener('icegatheringstatechange', check);
        resolve();
      }
    }

    p.addEventListener('icegatheringstatechange', check);
  });
}
function validateCandidates(p){const s=p.localDescription?.sdp||'';if(!s.includes('a=candidate:'))throw Error('Браузер не предоставил локальные сетевые адреса (ICE). Попробуй Chrome/Edge или другую Wi-Fi-сеть.');return s}
function dialog(modeName){$('connectDialog').showModal();$('outCode').value='';$('inCode').value='';$('qrWrap').hidden=true;$('connectState').textContent='';mode=modeName;$('connectTitle').textContent=modeName==='create'?'Создать подключение':'Подключиться';$('connectHelp').textContent=modeName==='create'?'Покажи QR другу. Он создаст ответный код — вставь или отсканируй его здесь.':'Вставь или отсканируй QR-код создателя. Затем покажи ему ответный QR-код.';$('apply').textContent=modeName==='create'?'Принять ответ':'Создать ответ'}
async function startCreate() {
  try {
    dialog('create');

    const p = newPeer();

    attachChannel(
      p.createDataChannel('airchat', { ordered: true })
    );

    offer = await p.createOffer();
    await p.setLocalDescription(offer);

    say('Собираем локальные адреса…');

    await iceComplete(p);

    offer = p.localDescription;

    showCode({
      v: 1,
      type: 'offer',
      sdp: offer.sdp,
      name: nick(),
      id: localStorage.getItem(STORE + 'id')
    });

  } catch (e) {
    say('Ошибка: ' + e.message);
  }
}
async function acceptCode() {
  try {
    const o = unpack($('inCode').value);

    if (mode === 'create') {
      if (o.type !== 'answer') {
        throw Error('Нужен ответный код');
      }

      if (!pc || !offer) {
        throw Error('Сначала создай подключение');
      }

      if (
        o.id &&
        selected()?.peerId &&
        selected().peerId !== o.id &&
        !confirm('Идентификатор собеседника изменился. Продолжить?')
      ) {
        return;
      }

      if (!selected()) {
        newChat(o.name || 'Собеседник', o.id);
      }

      await pc.setRemoteDescription({
        type: 'answer',
        sdp: o.sdp
      });

      answer = {
        type: 'answer',
        sdp: o.sdp
      };

      say('Ответ принят. Ожидаем соединение. Проверь код безопасности на обоих устройствах.');

      await showVerify();

    } else {
      if (o.type !== 'offer') {
        throw Error('Нужен код приглашения');
      }

      offer = {
        type: 'offer',
        sdp: o.sdp
      };

      let old = chats.find(
        c => c.peerId && c.peerId === o.id
      );

      if (
        $('privacy').value === 'whitelist' &&
        !old
      ) {
        throw Error('Собеседник не в белом списке');
      }

      if (
        !confirm(
          'Принять запрос подключения от «' +
          cleanText(o.name) +
          '»?'
        )
      ) {
        return;
      }

      activeId = old?.id ||
        newChat(o.name || 'Собеседник', o.id).id;

      render();

      const p = newPeer();

      await p.setRemoteDescription(offer);

      answer = await p.createAnswer();

      await p.setLocalDescription(answer);

      say('Собираем локальные адреса…');

      await iceComplete(p);

      answer = p.localDescription;

      showCode({
        v: 1,
        type: 'answer',
        sdp: answer.sdp,
        name: nick(),
        id: localStorage.getItem(STORE + 'id')
      });

      await showVerify();
    }

  } catch (e) {
    say('Ошибка: ' + e.message);
  }
}
async function showVerify(){if(!offer||!answer)return;let f=s=>[...s.matchAll(/a=fingerprint:[^\r\n]+/g)].map(x=>x[0]).join('|');let input=f(offer.sdp)+'|'+f(answer.sdp);const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(input));let a=new Uint8Array(bytes);let n=((a[0]<<16)|(a[1]<<8)|a[2])%1000000;let code=String(n).padStart(6,'0');say('Код проверки: '+code.slice(0,3)+'-'+code.slice(3)+'. Сверь его с кодом на другом устройстве. Если коды разные — отключись!')}
async function getQRDecoder(){
  if(window.jsQR)return window.jsQR;
  if(!window.__jsqrPromise){window.__jsqrPromise=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src='https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
    script.onload=()=>window.jsQR?resolve(window.jsQR):reject(Error('Библиотека QR не загрузилась'));
    script.onerror=()=>reject(Error('Не удалось загрузить QR-библиотеку. Один раз открой приложение с интернетом.'));
    document.head.appendChild(script);
  }).catch(e=>{window.__jsqrPromise=null;throw e});}
  return window.__jsqrPromise;
}
function decodeQRImage(source,width,height,decoder){
  const c=document.createElement('canvas');c.width=width;c.height=height;
  const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(source,0,0,width,height);
  const pixels=ctx.getImageData(0,0,width,height);
  return decoder(pixels.data,width,height,{inversionAttempts:'attemptBoth'})?.data||null;
}
let scanSession=0;
async function scanQR(){
  stopCamera();
  const session=++scanSession;
  try{
    say('Запускаем QR-сканер…');
    const decoder=await getQRDecoder();
    if(session!==scanSession)return;
    if(!navigator.mediaDevices?.getUserMedia)throw Error('Камера недоступна. Открой сайт по HTTPS и разреши доступ к камере.');
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}}});
    const v=$('camera');v.hidden=false;v.srcObject=stream;await v.play();
    let last=0;
    async function loop(time){
      if(!stream||session!==scanSession)return;
      if(time-last>220&&v.videoWidth&&v.videoHeight){
        last=time;
        try{
          const scale=Math.min(1,960/v.videoWidth);
          const found=decodeQRImage(v,Math.round(v.videoWidth*scale),Math.round(v.videoHeight*scale),decoder);
          if(found){$('inCode').value=found;stopCamera();say('QR распознан! Нажми «Продолжить».');return;}
        }catch(e){console.warn('QR scan frame',e)}
      }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }catch(e){stopCamera();say('Ошибка QR-сканера: '+e.message)}
}
async function scanImage(file){
  if(!file)return;
  try{
    say('Распознаём QR на фотографии…');
    const decoder=await getQRDecoder();
    const img=await createImageBitmap(file);
    try{
      const scale=Math.min(1,1800/Math.max(img.width,img.height));
      const found=decodeQRImage(img,Math.max(1,Math.round(img.width*scale)),Math.max(1,Math.round(img.height*scale)),decoder);
      if(!found)throw Error('QR-код не найден. Попробуй более чёткое фото или текстовый код.');
      $('inCode').value=found;say('QR с фотографии распознан! Нажми «Продолжить».');
    }finally{img.close()}
  }catch(e){say('Ошибка распознавания: '+e.message)}
  finally{$('qrImage').value=''}
}
function saveFile(filename, content) {
  const blob = new Blob([content], {
    type: 'application/json;charset=utf-8'
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  a.href = url;
  a.download = filename;

  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function archiveSweep() {
  const setting = document.getElementById('autoArchive');
  if (!setting) return;
  const minutes = Number(setting.value);
  // Если автоархивирование отключено
  if (!minutes || minutes <= 0) return;
  const now = Date.now();
  for (const chat of chats) {
    if (
      chat.lastDisconnected &&
      !chat.archived &&
      now - chat.lastDisconnected >= minutes * 60000
    ) {
      chat.archived = true;
      await persist(chat);
    }
  }
  render();
}
async function boot(){if(!window.crypto?.randomUUID||!window.indexedDB||!window.RTCPeerConnection){alert('Этот браузер не поддерживает необходимые функции WebRTC / IndexedDB.');return}db=await openDB();chats=await loadChats();if(!localStorage.getItem(STORE+'id'))localStorage.setItem(STORE+'id',uid());$('nick').value=localStorage.getItem(STORE+'nick')||'';$('autoArchive').value=localStorage.getItem(STORE+'archive')||'30';$('privacy').value=localStorage.getItem(STORE+'privacy')||'approval';$('nick').oninput=()=>localStorage.setItem(STORE+'nick',$('nick').value);$('autoArchive').onchange=()=>{localStorage.setItem(STORE+'archive',$('autoArchive').value);archiveSweep()};$('privacy').onchange=()=>localStorage.setItem(STORE+'privacy',$('privacy').value);$('create').onclick=startCreate;$('newChat').onclick=startCreate;$('join').onclick=()=>dialog('join');$('apply').onclick=acceptCode;$('copyCode').onclick=async()=>{try{await navigator.clipboard.writeText($('outCode').value);say('Код скопирован')}catch{say('Выдели код и скопируй вручную')}};$('scan').onclick=scanQR;$('qrImage').onchange=e=>scanImage(e.target.files[0]);document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());$('connectDialog').addEventListener('close',stopCamera);$('settings').onclick=()=>$('settingsDialog').showModal();$('sendForm').onsubmit=async e=>{e.preventDefault();const msg=$('message').value.trim();if(!msg||channel?.readyState!=='open')return;channel.send(JSON.stringify({type:'message',text:msg}));$('message').value='';await addMessage(msg,true)};$('archive').onclick=async()=>{let c=selected();if(!c)return;c.archived=!c.archived;await persist(c);render()};$('export').onclick=()=>{let c=selected();if(!c)return alert('Сначала выбери чат');saveFile('nimessage-'+c.id+'.json',JSON.stringify(c,null,2))};$('delete').onclick=async()=>{let c=selected();if(!c)return;if(!confirm('Удалить локальную историю этого чата? На другом устройстве она останется.'))return;await removeChat(c.id);chats=chats.filter(x=>x.id!==c.id);activeId=null;render()};window.addEventListener('online',()=>{});window.addEventListener('pagehide',()=>{if(connectedId){let c=chats.find(x=>x.id===connectedId);if(c){c.lastDisconnected=stamp();persist(c)}}});await archiveSweep();render();if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(console.warn)}
boot().catch(e=>alert('Ошибка запуска niMessage: '+e.message));
