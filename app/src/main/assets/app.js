const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const st={get:k=>chrome.storage.local.get(k).then(r=>r[k]),set:(k,v)=>chrome.storage.local.set({[k]:v})};
const db=new Promise(r=>{const q=indexedDB.open('iptv',1);q.onupgradeneeded=()=>q.result.createObjectStore('k');q.onsuccess=()=>r(q.result)});
const idb={async get(k){const d=await db;return new Promise(r=>{const q=d.transaction('k').objectStore('k').get(k);q.onsuccess=()=>r(q.result)})},
 async set(k,v){const d=await db;return new Promise(r=>{const tx=d.transaction('k','readwrite');tx.objectStore('k').put(v,k);tx.oncomplete=r})}};
const ALL='__all__',FAV='__fav__';
const LOC={ru:'ru-RU'};
let LANG='ru';

/* ---------- i18n ---------- */
const L={
ru:{
 tv:'ТВ',epg:'Телепрограмма',set:'Настройки',
 chq:'Поиск каналов…',
 all:'Все',fav:'★ Избранное',nogroup:'Без категории',
 pls:'Плейлисты',
 
 addpl:'+ Добавить плейлист',refresh:'⟳ Обновить всё',
 addTitle:'Добавить плейлист',m3u:'Плейлист (M3U)',name:'Название',namePh:'например: ТВ',
 
 ok:'Добавить',cancel:'Отмена',
 prev:'Предыдущий',playpause:'Пауза / Пуск',next:'Следующий',stop:'Стоп',sound:'Звук',openTv:'📺 ТВ',
 b10:'−10 сек',f10:'+10 сек',speed:'Скорость',pip:'Картинка в картинке',fs:'На весь экран',
 quality:'Качество',auto:'Авто',level:'Уровень {0}',
 loadingPl:'Загрузка плейлистов…',loadingEpg:'Загрузка телепрограммы…',epgOk:'Телепрограмма загружена',
 epgNone:'В плейлисте не найдена ссылка на телепрограмму (url-tvg).',
 noEpg:'Нет данных телепрограммы',errPlay:'Не удалось воспроизвести поток',pipNo:'PiP недоступен',
 archOff:'Архив отключён в настройках',archLbl:'архив',archHd:'Архив',archBanner:'АРХИВ',archSub:'Архив · ',
 golive:'▶ В эфир',back:'← Назад',today:'Сегодня',archOld:'Этой передачи нет в архиве',
 emptyPl:'Плейлистов нет',urlReq:'Укажите ссылку на плейлист',
 del:'Удалить',edit:'Изменить',editTitle:'Изменить плейлист',save:'Сохранить',
 epgErr:'EPG: {0}',
},
};
const t=(k,...a)=>{let s=L[LANG][k]??L.ru[k]??k;a.forEach((v,i)=>{s=s.replace('{'+i+'}',v)});return s};
function applyStatic(){
  document.documentElement.lang=LANG;
  $$('[data-i]').forEach(e=>e.textContent=t(e.dataset.i));
  $$('[data-ip]').forEach(e=>e.placeholder=t(e.dataset.ip));
  $$('[data-it]').forEach(e=>e.title=t(e.dataset.it));
}

const S={pls:[],fav:[],live:[],tvKind:'live',epg:null,cat:ALL,cur:null,arch:null,list:[],tvsel:null,eday:null,epgUrls:[],epgMiss:false,cu:'auto',cutpl:''};
const fmt=ms=>new Date(ms).toLocaleTimeString(LOC[LANG],{hour:'2-digit',minute:'2-digit'});
let tt;const toast=m=>{const el=$('#toast');el.textContent=m;el.classList.remove('hide');clearTimeout(tt);tt=setTimeout(()=>el.classList.add('hide'),3500)};
document.addEventListener('error',e=>{if(e.target.tagName==='IMG')e.target.style.visibility='hidden'},true);

const decName=u=>{try{return decodeURIComponent(u.split('?')[0].split('/').pop())||u}catch(e){return u}};
const pname=p=>p.name||decName(p.url);

/* ---------- player ---------- */
function play(v,url){
  v._pa=0;
  if(v._h){v._h.destroy();v._h=null}
  v.dispatchEvent(new Event('levels'));
  const native=/\.(mp4|mkv|webm|avi|mov)(\?|$)/i.test(url);
  if(!native&&window.Hls&&Hls.isSupported()){
    const h=new Hls({enableWorker:true,maxBufferLength:30});v._h=h;
    h.loadSource(url);h.attachMedia(v);
    h.on(Hls.Events.MANIFEST_PARSED,()=>{v.dispatchEvent(new Event('levels'));v.play().catch(()=>{})});
    h.on(Hls.Events.ERROR,(e,d)=>{if(d.fatal){h.destroy();v._h=null;v.src=url;v.play().catch(()=>{})}});
  }else{v.src=url;v.play().catch(()=>{})}
}

const IC={
 play:'<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
 pause:'<svg viewBox="0 0 24 24"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>',
 vol:'<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9zM16.5 12A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg>',
 mute:'<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9zM16 9.4l1.4-1.4 2.6 2.6 2.6-2.6L24 9.4 21.4 12l2.6 2.6-1.4 1.4-2.6-2.6-2.6 2.6-1.4-1.4 2.6-2.6z"/></svg>',
 fs:'<svg viewBox="0 0 24 24"><path d="M5 5h5v2H7v3H5zM14 5h5v5h-2V7h-3zM5 14h2v3h3v2H5zM17 14h2v5h-5v-2h3z"/></svg>',
 pip:'<svg viewBox="0 0 24 24"><path d="M19 11h-8v6h8zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z"/></svg>',
 prev:'<svg viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>',
 next:'<svg viewBox="0 0 24 24"><path d="M16 6h2v12h-2zM6 18l8.5-6L6 6z"/></svg>',
 stop:'<svg viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg>'
};
const tf=s=>{if(!isFinite(s))return'0:00';s=Math.floor(s);const h=Math.floor(s/3600),m=Math.floor(s%3600/60),c=s%60,p=n=>String(n).padStart(2,'0');return(h?h+':'+p(m):m)+':'+p(c)};
const pct=(el,v)=>el.style.setProperty('--p',v+'%');
function setVol(vol,mut){[$('#vid')].forEach(x=>{x.volume=vol;x.muted=mut});try{localStorage.setItem('vol',JSON.stringify([vol,mut]))}catch(e){}}
function restoreVol(){let s=[1,false];try{s=JSON.parse(localStorage.getItem('vol'))||s}catch(e){}
  setVol(s[0],s[1]);[$('#vid')].forEach(x=>x.dispatchEvent(new Event('volumechange')))}

function initPlayer(wrap){
  const v=wrap.querySelector('video'),q=s=>wrap.querySelector(s);
  wrap.insertAdjacentHTML('beforeend',`<div class="ptitle"></div><div class="spin hide"></div><div class="ctl"><div class="seek"><input type="range" class="sk" min="0" max="1000" value="0"></div><div class="bar"><button class="pp" data-it="playpause"></button><button class="b10 vodonly txt" data-it="b10">−10</button><button class="f10 vodonly txt" data-it="f10">+10</button><button class="mu" data-it="sound"></button><input type="range" class="vol" min="0" max="1" step="0.02"><span class="tm"></span><span class="grow"></span><select class="rt vodonly" data-it="speed"><option value="0.75">0.75×</option><option value="1" selected>1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option><option value="2">2×</option></select><select class="q hide" data-it="quality"></select><button class="pip" data-it="pip"></button><button class="fs" data-it="fs"></button></div></div>`);
  const pp=q('.pp'),sk=q('.sk'),vol=q('.vol'),mu=q('.mu'),tm=q('.tm'),ql=q('.q'),rt=q('.rt'),sp=q('.spin');
  pp.innerHTML=IC.play;mu.innerHTML=IC.vol;q('.pip').innerHTML=IC.pip;q('.fs').innerHTML=IC.fs;
  const toggle=()=>v.paused?v.play().catch(()=>{}):v.pause();
  const fs=()=>document.fullscreenElement?document.exitFullscreen():wrap.requestFullscreen();
  pp.onclick=toggle;q('.fs').onclick=fs;
  q('.pip').onclick=()=>document.pictureInPictureElement?document.exitPictureInPicture():v.requestPictureInPicture().catch(()=>toast(t('pipNo')));
  q('.b10').onclick=()=>{v.currentTime=Math.max(0,v.currentTime-10)};q('.f10').onclick=()=>{v.currentTime+=10};
  mu.onclick=()=>v.volume===0?setVol(.5,false):setVol(v.volume,!v.muted);
  vol.oninput=()=>setVol(+vol.value,false);
  [vol,sk].forEach(r=>r.onchange=()=>r.blur());
  sk.oninput=()=>{if(isFinite(v.duration))v.currentTime=sk.value/1000*v.duration;pct(sk,sk.value/10)};
  rt.onchange=()=>{v.playbackRate=+rt.value;rt.blur()};
  ql.onchange=()=>{if(v._h)v._h.currentLevel=+ql.value;ql.blur()};
  /* live channel mode is set explicitly (ch-live), so no seek bar / ±10 / speed there even if the stream reports a finite duration */
  const live=()=>wrap.classList.contains('ch-live')||!isFinite(v.duration)||!v.duration;
  const upd=()=>{wrap.classList.toggle('live',live());
    if(live())tm.textContent='LIVE';
    else{tm.textContent=tf(v.currentTime)+' / '+tf(v.duration);if(document.activeElement!==sk){sk.value=v.currentTime/v.duration*1000;pct(sk,sk.value/10)}}};
  wrap._upd=upd;
  ['timeupdate','durationchange','loadedmetadata','emptied'].forEach(n=>v.addEventListener(n,upd));
  v.addEventListener('play',()=>{pp.innerHTML=IC.pause});v.addEventListener('pause',()=>{pp.innerHTML=IC.play});
  v.addEventListener('volumechange',()=>{const m=v.muted||v.volume===0;vol.value=m?0:v.volume;pct(vol,vol.value*100);mu.innerHTML=m?IC.mute:IC.vol});
  ['loadstart','waiting','stalled','seeking'].forEach(n=>v.addEventListener(n,()=>sp.classList.remove('hide')));
  ['playing','canplay','seeked','pause','emptied'].forEach(n=>v.addEventListener(n,()=>sp.classList.add('hide')));
  v.addEventListener('error',()=>{sp.classList.add('hide');toast(t('errPlay'))});
  v.addEventListener('levels',()=>{rt.value='1';v.playbackRate=1;const Lv=(v._h&&v._h.levels)||[];
    if(Lv.length>1){ql.innerHTML=`<option value="-1">${t('auto')}</option>`+Lv.map((l,i)=>[i,l.height||0]).sort((a,b)=>b[1]-a[1]).map(([i,h])=>`<option value="${i}">${h?h+'p':t('level',i+1)}</option>`).join('');ql.value='-1';ql.classList.remove('hide')}
    else ql.classList.add('hide')});
  let it;const wake=()=>{wrap.classList.remove('idle');clearTimeout(it);it=setTimeout(()=>{if(!v.paused)wrap.classList.add('idle')},3000)};
  wrap.addEventListener('mousemove',wake);wrap.addEventListener('mouseleave',()=>{if(!v.paused)wrap.classList.add('idle')});v.addEventListener('pause',wake);
  let ct;wrap.addEventListener('click',e=>{if(e.target!==v)return;clearTimeout(ct);ct=setTimeout(toggle,230)});
  wrap.addEventListener('dblclick',e=>{if(e.target!==v)return;clearTimeout(ct);fs()});
  upd();
}

/* live channel: after a pause, Play restarts the stream at the live edge (not where it was paused) */
function liveResume(){
  const v=$('#vid'),pw=$('#pwrap'),live=()=>pw.classList.contains('ch-live')&&S.cur&&!S.arch;
  v.addEventListener('pause',()=>{if(!v._rl&&live())v._pa=Date.now()});
  v.addEventListener('play',()=>{
    if(v._pa&&Date.now()-v._pa>1000&&live()){v._rl=true;play(v,S.cur.url)}
    else v._pa=0});
  v.addEventListener('playing',()=>{v._rl=false});
}

/* ---------- mini bar ---------- */
function stepCh(d){if(!S.list.length)return;let i=S.list.findIndex(c=>S.cur&&c.url===S.cur.url);if(i<0)i=d>0?-1:0;playCh(S.list[Math.max(0,Math.min(S.list.length-1,i+d))])}
function updMini(){
  const c=S.cur,show=c&&!$('#v-tv').classList.contains('on');
  $('#mini').classList.toggle('hide',!show);if(!show)return;
  const lg=$('#mi-logo');lg.style.visibility='';lg.src=c.logo||'';
  $('#mi-name').textContent=c.n+'. '+c.name;
  const n=nn(c).now;$('#mi-sub').textContent=S.arch&&S.arch.c===c?t('archSub')+S.arch.p[2]:(n?n[2]:'');
}
function initMini(){
  const v=$('#vid'),pp=$('#mi-pp'),mv=$('#mi-vol');
  $('#mi-prev').innerHTML=IC.prev;$('#mi-next').innerHTML=IC.next;$('#mi-stop').innerHTML=IC.stop;$('#mi-mu').innerHTML=IC.vol;pp.innerHTML=IC.play;
  pp.onclick=()=>v.paused?v.play().catch(()=>{}):v.pause();
  $('#mi-stop').onclick=()=>{v.pause();if(v._h){v._h.destroy();v._h=null}v.removeAttribute('src');v.load();S.cur=null;S.arch=null;renderChs();showInfo();updMini()};
  $('#mi-mu').onclick=()=>v.volume===0?setVol(.5,false):setVol(v.volume,!v.muted);
  mv.oninput=()=>setVol(+mv.value,false);mv.onchange=()=>mv.blur();
  [$('#mi-logo'),$('#mini .mt')].forEach(el=>el.onclick=()=>showView('tv'));
  $('#mi-prev').onclick=()=>stepCh(-1);$('#mi-next').onclick=()=>stepCh(1);
  v.addEventListener('play',()=>{pp.innerHTML=IC.pause});v.addEventListener('pause',()=>{pp.innerHTML=IC.play});
  v.addEventListener('volumechange',()=>{const m=v.muted||v.volume===0;mv.value=m?0:v.volume;pct(mv,mv.value*100);$('#mi-mu').innerHTML=m?IC.mute:IC.vol});
}

/* ---------- parsing ---------- */
function parseM3U(txt){
  const out=[];let cur=null,gd={};
  for(let l of txt.split(/\r?\n/)){
    l=l.trim();if(!l)continue;
    if(l.startsWith('#EXTM3U')){l.replace(/([\w-]+)="([^"]*)"/g,(m,k,v)=>(gd[k.toLowerCase()]=v,m))}
    else if(l.startsWith('#EXTINF')){
      const a={};l.replace(/([\w-]+)="([^"]*)"/g,(m,k,v)=>(a[k.toLowerCase()]=v,m));
      const name=l.replace(/="[^"]*"/g,'').split(',').slice(1).join(',').trim()||a['tvg-name']||'';
      cur={name,id:a['tvg-id']||'',logo:a['tvg-logo']||'',group:a['group-title']||'',ct:a['catchup']||a['catchup-type']||gd['catchup']||gd['catchup-type']||'',cs:a['catchup-source']||gd['catchup-source']||'',cd:+(a['catchup-days']||a['tvg-rec']||gd['catchup-days']||0)};
    }else if(l.startsWith('#EXTGRP:')&&cur){cur.group=l.slice(8).trim()||cur.group}
    else if(l[0]!=='#'&&cur){cur.url=l;out.push(cur);cur=null}
  }
  out.epg=(gd['url-tvg']||gd['x-tvg-url']||gd['tvg-url']||'').split(',').map(s=>s.trim()).filter(u=>/^https?:\/\//i.test(u));
  return out;
}
const dec=s=>s.replace(/<!\[CDATA\[|\]\]>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'");
function ts(s){const m=s.match(/(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)?\s*([+-]\d{4})?/);if(!m)return 0;
  let off=0;if(m[7])off=(m[7][0]==='-'?-1:1)*(+m[7].slice(1,3)*60+ +m[7].slice(3,5))*6e4;
  return Date.UTC(+m[1],m[2]-1,+m[3],+m[4],+m[5],+(m[6]||0))-off}
function parseEpg(x){
  const names={};
  for(const m of x.matchAll(/<channel id="([^"]*)">([\s\S]*?)<\/channel>/g))
    for(const d of m[2].matchAll(/<display-name[^>]*>([^<]*)</g))names['\0'+dec(d[1]).trim().toLowerCase()]=m[1];
  const want=new Set(),n={};
  for(const c of S.live){if(c.id)want.add(c.id);const i=names['\0'+c.name.toLowerCase()];if(i){want.add(i);n[c.name.toLowerCase()]=i}}
  const now=Date.now(),lo=now-3*864e5,hi=now+40*36e5,p={};
  for(const m of x.matchAll(/<programme\s+([^>]*)>([\s\S]*?)<\/programme>/g)){
    const ch=(m[1].match(/channel="([^"]*)"/)||[])[1];if(!want.has(ch))continue;
    const s=ts((m[1].match(/start="([^"]*)"/)||[])[1]||''),e=ts((m[1].match(/stop="([^"]*)"/)||[])[1]||'');
    if(e<lo||s>hi)continue;
    const ti=(m[2].match(/<title[^>]*>([\s\S]*?)<\/title>/)||[])[1]||'',d=(m[2].match(/<desc[^>]*>([\s\S]*?)<\/desc>/)||[])[1]||'';
    (p[ch]=p[ch]||[]).push([s,e,dec(ti),dec(d).slice(0,400)]);
  }
  for(const k in p)p[k].sort((a,b)=>a[0]-b[0]);
  return{p,n};
}
async function getText(url,force){
  const k='pl:'+url,c=await idb.get(k);
  if(c&&!force&&Date.now()-c.t<432e5)return c.v;
  const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);
  const v=await r.text();await idb.set(k,{t:Date.now(),v});return v;
}

/* ---------- archive / catchup ---------- */
function catchupUrl(c,s,e){
  s=Math.floor(s/1e3);e=Math.floor(e/1e3);const dur=e-s,now=Math.floor(Date.now()/1e3);
  const d=new Date(s*1e3),p=n=>String(n).padStart(2,'0');
  const fill=tp=>tp.replace(/\$?\{(start|utc|timestamp)\}/g,s).replace(/\$?\{(end|utcend)\}/g,e).replace(/\$?\{(now|lutc)\}/g,now).replace(/\$?\{duration\}/g,dur).replace(/\$?\{offset\}/g,now-s)
    .replace(/\$?\{Y\}/g,d.getUTCFullYear()).replace(/\$?\{m\}/g,p(d.getUTCMonth()+1)).replace(/\$?\{d\}/g,p(d.getUTCDate())).replace(/\$?\{H\}/g,p(d.getUTCHours())).replace(/\$?\{M\}/g,p(d.getUTCMinutes())).replace(/\$?\{S\}/g,p(d.getUTCSeconds()));
  const join=(u,q)=>/^https?:/i.test(q)?q:u+(u.includes('?')?'&':'?')+q.replace(/^[?&]/,'');
  const u=c.url,tpl=S.cutpl||c.cs;
  if(tpl)return join(u,fill(tpl));
  const m=(c.ct||S.cu||'auto').toLowerCase();
  if(m==='none')return null;
  if(m==='shift'||m==='append')return join(u,`utc=${s}&lutc=${now}`);
  if(/\/(index|mono|video|tracks-[^/?]*)\.m3u8/.test(u))return u.replace(/\/(index|mono|video|tracks-[^/?]*)\.m3u8/,`/$1-${s}-${dur}.m3u8`);
  if(/\/mpegts(\?|$)/.test(u))return u.replace(/\/mpegts/,`/archive-${s}-${dur}.ts`);
  return join(u,`utc=${s}&lutc=${now}`);
}
function playArchive(c,p){
  const url=catchupUrl(c,p[0],p[1]);if(!url)return toast(t('archOff'));
  S.cur=c;S.arch={c,p};$('#msg').textContent='';play($('#vid'),url);
  const pw=$('#pwrap');pw.classList.remove('ch-live');pw._upd&&pw._upd();
  $('#pwrap .ptitle').textContent=c.name+' · '+t('archLbl');showInfo();updMini();
}

/* ---------- loading ---------- */
async function loadAll(force,init){
  const sel=S.pls.find(p=>p.url===S.tvsel)||S.pls[0]||null;
  S.tvsel=sel?sel.url:null;st.set('tvsel',S.tvsel);S.tvKind=sel?sel.kind:'live';
  $('#chlist').innerHTML=`<div class="np" style="padding:14px">${t('loadingPl')}</div>`;
  const l=sel?await getText(sel.url,force).then(parseM3U).catch(e=>{toast(pname(sel)+': '+e.message);return[]}):[];
  S.live=l;S.live.forEach((c,i)=>c.n=i+1);S.epgUrls=l.epg||[];S.eday=null;
  renderAll();
  if(init){const last=await st.get('last'),c=S.live.find(x=>x.url===last);if(c)playCh(c,true)}
  loadEpg(force);
}
async function loadEpg(force){
  const sel=S.pls.find(p=>p.url===S.tvsel);
  const urls=S.epgUrls.length?S.epgUrls:(sel&&sel.epg?[sel.epg]:[]);
  S.epgMiss=!urls.length&&S.tvKind!=='movies';
  if(S.tvKind==='movies'){S.epg=null;renderChs();showInfo();return}
  if(!urls.length||!S.live.length){S.epg=null;renderChs();showInfo();return}
  const parts=[];let fresh=false;
  for(const url of urls){
    try{
      const c=await idb.get('epg2:'+url);
      if(c&&!force&&Date.now()-c.t<216e5){parts.push(c.v);continue}
      toast(t('loadingEpg'));
      const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);
      const buf=new Uint8Array(await r.arrayBuffer());
      const xml=(buf[0]===0x1f&&buf[1]===0x8b)?await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).text():new TextDecoder().decode(buf);
      const v=parseEpg(xml);await idb.set('epg2:'+url,{t:Date.now(),v});parts.push(v);fresh=true;
    }catch(e){toast(t('epgErr',e.message))}
  }
  if(parts.length===1)S.epg=parts[0];
  else if(parts.length){const p={},n={};parts.forEach(x=>{for(const k in x.p)p[k]=(p[k]||[]).concat(x.p[k]);Object.assign(n,x.n)});for(const k in p)p[k].sort((a,b)=>a[0]-b[0]);S.epg={p,n}}
  else S.epg=null;
  if(fresh&&S.epg)toast(t('epgOk'));
  renderChs();showInfo();
}
const eid=c=>S.epg&&(S.epg.p[c.id]?c.id:S.epg.n[c.name.toLowerCase()]);
function nn(c){const a=(S.epg&&S.epg.p[eid(c)])||[],tn=Date.now();const i=a.findIndex(x=>x[0]<=tn&&tn<x[1]);
  return{now:i>=0?a[i]:null,next:a.filter(x=>x[0]>tn).slice(0,5)}}

/* ---------- categories ---------- */
const inCat=(c,k)=>k===ALL||(k===FAV?S.fav.includes(c.url):c.group===k);
const cl=k=>k===ALL?t('all'):k===FAV?t('fav'):(k||t('nogroup'));
function groupCount(list,key){const m=new Map();list.forEach(x=>{const g=key(x);m.set(g,(m.get(g)||0)+1)});return [...m]}
function tvCats(){return [[ALL,S.live.length],[FAV,S.live.filter(c=>S.fav.includes(c.url)).length],...groupCount(S.live,c=>c.group)]}
const catHtml=(a,cur)=>a.map(([k,n])=>`<div class="cat${k===cur?' on':''}" data-c="${esc(k)}"><span>${esc(cl(k))}</span><em>${n}</em></div>`).join('');

/* ---------- render: TV ---------- */
function renderAll(){renderTabs();renderCats();renderChs();renderSet();showInfo();updMini()}
function renderTabs(){
  const el=$('#tvtabs');el.classList.toggle('hide',S.pls.length<2);
  el.innerHTML=S.pls.map(p=>`<button data-u="${esc(p.url)}"${p.url===S.tvsel?' class="on"':''}>${esc(pname(p))}</button>`).join('');
}
function renderCats(){$('#cats').innerHTML=catHtml(tvCats(),S.cat)}
function renderChs(){
  const q=$('#chq').value.toLowerCase();
  S.list=S.live.filter(c=>inCat(c,S.cat)&&(!q||c.name.toLowerCase().includes(q)));
  const tm=Date.now();
  $('#chlist').innerHTML=S.list.map((c,i)=>{const {now}=nn(c);
    const pr=now?Math.round((tm-now[0])/(now[1]-now[0])*100):0;
    return `<div class="ch${S.cur&&S.cur.url===c.url?' on':''}" data-i="${i}"><b>${c.n}</b><img loading="lazy" src="${esc(c.logo)}"><div class="t"><div class="nm">${esc(c.name)}</div><div class="np">${now?esc(now[2]):''}</div>${now?`<i class="pb"><u style="width:${pr}%"></u></i>`:''}</div><button class="st">${S.fav.includes(c.url)?'★':'☆'}</button></div>`}).join('');
}
function playCh(c,quiet){
  S.cur=c;S.arch=null;S.eday=null;$('#msg').textContent='';play($('#vid'),c.url);st.set('last',c.url);
  const pw=$('#pwrap');pw.classList.toggle('ch-live',S.tvKind!=='movies');pw._upd&&pw._upd();
  $('#pwrap .ptitle').textContent=c.n+'. '+c.name;updMini();
  $$('.ch').forEach(e=>e.classList.toggle('on',S.list[e.dataset.i]===c));
  const el=$('.ch.on');if(el&&!quiet)el.scrollIntoView({block:'nearest'});
  showInfo(true);
}
const dk=ms=>{const d=new Date(ms);return d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate()};
function showInfo(scroll){
  const c=S.cur,el=$('#info'),old=$('#plist'),keep=old?old.scrollTop:0;
  if(!old)scroll=true;
  if(!c){el.innerHTML='';return}
  const t0=Date.now(),lim=t0-(c.cd||3)*864e5,all=(S.epg&&S.epg.p[eid(c)])||[],{now}=nn(c),today=dk(t0);
  const days=[...new Set(all.map(x=>dk(x[0])).concat(today))].sort((a,b)=>a-b);
  if(!days.includes(S.eday))S.eday=today;
  const dl=k=>k===today?t('today'):new Date(Math.floor(k/10000),Math.floor(k/100)%100-1,k%100).toLocaleDateString(LOC[LANG],{weekday:'short',day:'2-digit',month:'2-digit'});
  const ar=S.arch&&S.arch.c===c?`<div class="arch">${t('archBanner')}: ${fmt(S.arch.p[0])} · ${esc(S.arch.p[2])} <button id="golive">${t('golive')}</button></div>`:'';
  const rows=all.filter(x=>dk(x[0])===S.eday).map(x=>{
    const past=x[1]<=t0,cur=x[0]<=t0&&t0<x[1],ok=past&&x[0]>=lim,ap=S.arch&&S.arch.c===c&&S.arch.p[0]===x[0];
    return `<div class="pr${cur?' cn':''}${past?(ok?' pa':' pd'):''}${ap?' ap':''}" data-s="${x[0]}" title="${esc(x[3])}"><span class="pt">${fmt(x[0])}</span><span class="pn">${esc(x[2])}</span>${cur?'<span class="pi">●</span>':''}</div>`}).join('');
  el.innerHTML=`<div class="ih">${ar}<h2>${c.n}. ${esc(c.name)}</h2>`+(now?`<div class="now">${fmt(now[0])}–${fmt(now[1])} · ${esc(now[2])}</div><div class="d">${esc(now[3])}</div>`:(S.tvKind==='movies'?'':`<div class="np">${t(S.epgMiss?'epgNone':'noEpg')}</div>`))+`</div>`+
    (all.length?`<div class="ph">${t('epg')}</div><div class="dcs">${days.map(k=>`<span class="dc${k===S.eday?' on':''}" data-d="${k}">${esc(dl(k))}</span>`).join('')}</div><div id="plist">${rows}</div>`:'');
  const pl=$('#plist');if(!pl)return;
  if(scroll){const cn=pl.querySelector('.cn');pl.scrollTop=cn?Math.max(0,cn.offsetTop-40):0}else pl.scrollTop=keep;
}
function toggleFav(c){const i=S.fav.indexOf(c.url);i>=0?S.fav.splice(i,1):S.fav.push(c.url);st.set('fav',S.fav);renderCats();renderChs()}

/* ---------- render: VOD ---------- */
/* ---------- render: settings ---------- */
function renderSet(){
  $('#pls').innerHTML=S.pls.map((p,i)=>`<div class="pl"><div><b>${esc(pname(p))}</b><small>${esc(p.url)}</small></div><div class="acts"><button data-a="edit" data-d="${i}">${t('edit')}</button><button data-a="del" data-d="${i}">${t('del')}</button></div></div>`).join('')||`<div class="np">${t('emptyPl')}</div>`;
}

/* ---------- add / edit playlist modal ---------- */
const guess=(n,u)=>/vod|film|movie|фильм|кино|serial|series|сериал/i.test(n+' '+u.split('?')[0].split('/').pop())?'movies':'live';
let EDIT=null;
function openModal(i){
  EDIT=(typeof i==='number')?i:null;
  const p=EDIT!=null?S.pls[EDIT]:null;
  $('#m-title').textContent=t(p?'editTitle':'addTitle');
  $('#m-ok').textContent=t(p?'save':'ok');
  $('#f-url').value=p?p.url:'';$('#f-name').value=p?(p.name||''):'';
  $('#modal').classList.remove('hide');$('#f-name').focus();
}
$('#m-cancel').onclick=()=>{EDIT=null;$('#modal').classList.add('hide')};
$('#m-ok').onclick=async()=>{
  const url=$('#f-url').value.trim();
  if(!/^https?:\/\//i.test(url))return toast(t('urlReq'));
  const name=$('#f-name').value.trim()||decName(url),kind=guess(name,url);
  let reload=true;
  if(EDIT!=null&&S.pls[EDIT]){
    const was=S.tvsel===S.pls[EDIT].url;
    S.pls[EDIT]={name,url,kind};
    if(was)S.tvsel=url;
    reload=was;
  }else{
    S.pls.push({name,url,kind});S.tvsel=url;
  }
  EDIT=null;
  await st.set('pls',S.pls);$('#modal').classList.add('hide');
  if(reload)loadAll(false,false);else{renderTabs();renderSet()}
};
$('#addpl').onclick=()=>openModal();
$('#refresh').onclick=()=>loadAll(true,false);
$('#pls').onclick=async e=>{
  const b=e.target.closest('button');if(!b)return;
  const i=+b.dataset.d;
  if(b.dataset.a==='edit')return openModal(i);
  S.pls.splice(i,1);await st.set('pls',S.pls);loadAll(false,false);
};

/* ---------- events ---------- */
function showView(v){$$('.view').forEach(x=>x.classList.toggle('on',x.id==='v-'+v));updMini()}
$('#gear').onclick=()=>showView('set');
$('#sback').onclick=()=>showView('tv');
$('#tvtabs').onclick=e=>{const b=e.target.closest('button');if(!b||b.dataset.u===S.tvsel)return;S.tvsel=b.dataset.u;S.cat=ALL;$('#chq').value='';loadAll(false,false)};
$('#cats').onclick=e=>{const c=e.target.closest('.cat');if(!c)return;S.cat=c.dataset.c;renderCats();renderChs()};
$('#chq').oninput=renderChs;
$('#chlist').onclick=e=>{const r=e.target.closest('.ch');if(!r)return;const c=S.list[r.dataset.i];e.target.closest('.st')?toggleFav(c):playCh(c)};
$('#info').onclick=e=>{
  if(e.target.id==='golive')return playCh(S.cur);
  const d=e.target.closest('.dc');if(d){S.eday=+d.dataset.d;return showInfo(true)}
  const r=e.target.closest('.pr');if(!r||!S.cur)return;
  const pr=((S.epg&&S.epg.p[eid(S.cur)])||[]).find(x=>x[0]===+r.dataset.s);if(!pr)return;
  const t0=Date.now();
  if(pr[1]<=t0){pr[0]>=t0-(S.cur.cd||3)*864e5?playArchive(S.cur,pr):toast(t('archOld'))}
  else if(pr[0]<=t0&&S.arch)playCh(S.cur);
};
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){EDIT=null;$('#modal').classList.add('hide')}
  if(['ArrowUp','ArrowDown'].includes(e.key)&&$('#v-tv').classList.contains('on')&&!/INPUT|SELECT/.test(document.activeElement.tagName)&&S.list.length){
    e.preventDefault();let i=S.list.findIndex(c=>S.cur&&c.url===S.cur.url);i=Math.max(0,Math.min(S.list.length-1,i+(e.key==='ArrowDown'?1:-1)));playCh(S.list[i]);
  }
});
setInterval(()=>{if(S.epg){renderChs();showInfo()}updMini()},6e4);

(async()=>{
  initPlayer($('#pwrap'));liveResume();initMini();restoreVol();
  applyStatic();
  S.pls=(await st.get('pls'))||[];
  /* migration: series are gone, old 'vod' becomes movies */
  S.pls=S.pls.filter(p=>!(p.kind==='series'||(p.kind==='vod'&&/series|serial/i.test((p.name||'')+' '+p.url))));
  S.pls.forEach(p=>{if(p.kind==='vod')p.kind='movies'});
  st.set('pls',S.pls);
  S.tvsel=(await st.get('tvsel'))||null;
  
  S.fav=(await st.get('fav'))||[];
  if(S.pls.length)loadAll(false,true);
  else{renderAll();openModal()}
})();

document.addEventListener('keydown',e=>{
  const ae=document.activeElement;if(ae&&(ae.tagName==='SELECT'||(ae.tagName==='INPUT'&&ae.type!=='range')))return;
  const v=$('#v-tv').classList.contains('on')?$('#vid'):null;if(!v)return;
  if(e.key===' '){e.preventDefault();v.paused?v.play().catch(()=>{}):v.pause()}
  else if(e.key==='m'||e.key==='M')v.volume===0?setVol(.5,false):setVol(v.volume,!v.muted);
  else if(e.key==='f'||e.key==='F')document.fullscreenElement?document.exitFullscreen():v.parentElement.requestFullscreen();
  else if((e.key==='ArrowLeft'||e.key==='ArrowRight')&&isFinite(v.duration)&&!v.parentElement.classList.contains('ch-live')){e.preventDefault();v.currentTime+=e.key==='ArrowLeft'?-10:10}
});
