(function(){
'use strict';
var tg=window.Telegram&&window.Telegram.WebApp;
if(tg){tg.ready();tg.expand();tg.setHeaderColor('#050505');tg.setBackgroundColor('#050505')}

var P=new URLSearchParams(location.search);
var userId=P.get('id')||'0';
var avatarUrl=P.get('avatar')?decodeURIComponent(P.get('avatar')):'';
var searches=[];try{searches=JSON.parse(decodeURIComponent(P.get('searches')||'[]'))}catch(e){}

var REGIONS=[
  {id:'west',name:'Западная Европа',domain:'vinted.fr',flags:['🇫🇷','🇪🇸','🇮🇹','🇵🇹','🇧🇪','🇳🇱','🇱🇺'],
   info:'Франция · Испания · Италия · Португалия · Бельгия · Нидерланды · Люксембург'},
  {id:'central',name:'Центральная Европа',domain:'vinted.de',flags:['🇩🇪','🇦🇹','🇨🇿','🇸🇰','🇭🇺','🇷🇴','🇭🇷'],
   info:'Германия · Австрия · Чехия · Словакия · Венгрия · Румыния · Хорватия'},
  {id:'east',name:'Север и Восток',domain:'vinted.pl',flags:['🇵🇱','🇱🇹','🇸🇪','🇩🇰','🇫🇮'],
   info:'Польша · Литва · Швеция · Дания · Финляндия'}
];
var CONDS=[{id:'6',l:'Новое с бирками'},{id:'1',l:'Новое'},{id:'2',l:'Очень хорошее'},{id:'3',l:'Хорошее'},{id:'4',l:'Удовлетворительное'}];

var editId=null,selConds=new Set(),selRegions=new Set(['west']);
function $(s){return document.querySelector(s)}
function $$(s){return document.querySelectorAll(s)}
function esc(s){var d=document.createElement('div');d.textContent=String(s||'');return d.innerHTML}

$$('.tab').forEach(function(b){b.addEventListener('click',function(){
  $$('.page').forEach(function(p){p.classList.remove('active')});
  $$('.tab').forEach(function(n){n.classList.remove('active')});
  $('#'+b.dataset.tab).classList.add('active');b.classList.add('active');
})});

var tt;function toast(m){var t=$('#toast');t.textContent=m;t.classList.remove('hidden');clearTimeout(tt);tt=setTimeout(function(){t.classList.add('hidden')},2500)}
function send(d){if(tg)tg.sendData(JSON.stringify(d));else{console.log(d);toast('dev')}}

function getDomains(){
  var d=[];selRegions.forEach(function(rid){
    var r=REGIONS.find(function(x){return x.id===rid});if(r)d.push(r.domain)});
  return d.length?d:['vinted.fr'];
}

function renderRegions(){
  var g=$('#regionGrid');g.innerHTML='';
  REGIONS.forEach(function(r){
    var el=document.createElement('div');el.className='region'+(selRegions.has(r.id)?' active':'');
    el.innerHTML='<div class="region-top"><span class="region-name">'+r.name+'</span><div class="region-ck"><div class="region-tk"></div></div></div><div class="region-flags">'+r.flags.map(function(f){return'<span class="region-flag">'+f+'</span>'}).join('')+'</div>';
    el.title=r.info;
    el.addEventListener('click',function(){
      if(selRegions.has(r.id)){if(selRegions.size>1){selRegions.delete(r.id);el.classList.remove('active')}else toast('Минимум 1 регион')}
      else{selRegions.add(r.id);el.classList.add('active')}
    });g.appendChild(el);
  });
}

function renderConds(){
  var b=$('#condChips');b.innerHTML='';
  CONDS.forEach(function(c){
    var t=document.createElement('div');t.className='chip'+(selConds.has(c.id)?' active':'');t.textContent=c.l;
    t.addEventListener('click',function(){
      if(selConds.has(c.id)){selConds.delete(c.id);t.classList.remove('active')}
      else{selConds.add(c.id);t.classList.add('active')}
    });b.appendChild(t);
  });
}

function renderProfile(){
  var u=tg&&tg.initDataUnsafe&&tg.initDataUnsafe.user;
  var fn=P.get('name')?decodeURIComponent(P.get('name')):(u?(u.first_name||''):'');
  var ln=u?(u.last_name||''):'';
  var un=P.get('username')?decodeURIComponent(P.get('username')):(u?(u.username||''):'');
  $('#pName').textContent=[fn,ln].filter(Boolean).join(' ')||'User';
  $('#pUser').textContent=un?'@'+un:'';
  $('#sId').textContent=userId;
  $('#sCount').textContent=searches.length+' / 10';
  var l=$('#avaL'),i=$('#avaI');
  if(avatarUrl){i.src=avatarUrl;i.classList.remove('hidden');l.classList.add('hidden');
    i.onerror=function(){i.classList.add('hidden');l.classList.remove('hidden');l.textContent=(fn||'?')[0].toUpperCase()}}
  else{l.textContent=(fn||'?')[0].toUpperCase();l.classList.remove('hidden');i.classList.add('hidden')}
}

function renderSearches(){
  var list=$('#sList'),cnt=$('#sCnt');list.innerHTML='';cnt.textContent=searches.length;
  if(!searches.length){list.innerHTML='<div class="empty">Нет засад. Создай во вкладке Поиск</div>';return}
  searches.forEach(function(s){
    var card=document.createElement('div');card.className='s-card';
    var doms=(s.domain||'vinted.fr').split(',').map(function(d){return d.trim()}).join(', ');
    var f=[];
    if(s.category&&s.category!=='all')f.push(s.category==='clothes'?'Одежда':'Обувь');
    if(s.size)f.push(s.size);if(s.min_price>0)f.push('от '+s.min_price);if(s.max_price>0)f.push('до '+s.max_price);
    if(s.minus_words)f.push('-'+s.minus_words);
    var cl=[];try{var cn=typeof s.conditions==='string'?JSON.parse(s.conditions):(s.conditions||[]);
      cn.forEach(function(c){var x=CONDS.find(function(y){return y.id===String(c)});if(x)cl.push(x.l)})}catch(e){}
    card.innerHTML='<div class="s-top"><div><div class="s-title">'+esc(s.query||'—')+'</div><div class="s-meta">'+esc(doms)+'</div></div><span class="s-badge">Активна</span></div><div class="s-filters">'+f.concat(cl).map(function(t){return'<span class="s-tag">'+esc(t)+'</span>'}).join('')+'</div><div class="s-actions"><button class="s-btn ed">Изменить</button><button class="s-btn danger dl">Удалить</button></div>';
    card.querySelector('.ed').addEventListener('click',function(){startEdit(s)});
    card.querySelector('.dl').addEventListener('click',function(){if(confirm('Удалить «'+s.query+'»?'))send({action:'delete',search_id:s.id})});
    list.appendChild(card);
  });
}

function startEdit(s){
  editId=s.id;$('#formTitle').textContent='Редактирование';$('#cancelBtn').classList.remove('hidden');$('#submitBtn').textContent='Сохранить';
  $('#query').value=s.query||'';$('#size').value=s.size||'';$('#min_price').value=s.min_price||'';$('#max_price').value=s.max_price||'';$('#minus_words').value=s.minus_words||'';$('#category').value=s.category||'all';
  selRegions.clear();
  var m={'vinted.fr':'west','vinted.de':'central','vinted.pl':'east'};
  (s.domain||'vinted.fr').split(',').forEach(function(d){var r=m[d.trim()];if(r)selRegions.add(r)});
  if(!selRegions.size)selRegions.add('west');renderRegions();
  selConds.clear();try{var c=typeof s.conditions==='string'?JSON.parse(s.conditions):(s.conditions||[]);c.forEach(function(x){selConds.add(String(x))})}catch(e){}renderConds();
  $$('.page').forEach(function(p){p.classList.remove('active')});$$('.tab').forEach(function(n){n.classList.remove('active')});
  $('#tabSearch').classList.add('active');$$('.tab')[0].classList.add('active');
  $('#formCard').scrollIntoView({behavior:'smooth',block:'start'});
}

function cancelEdit(){
  editId=null;$('#formTitle').textContent='Новая засада';$('#cancelBtn').classList.add('hidden');$('#submitBtn').textContent='Создать засаду';
  $('#searchForm').reset();selConds.clear();selRegions.clear();selRegions.add('west');renderConds();renderRegions();
}
$('#cancelBtn').addEventListener('click',cancelEdit);

$('#searchForm').addEventListener('submit',function(e){
  e.preventDefault();var q=$('#query').value.trim();if(!q){toast('Введи запрос');return}
  var data={query:q,domain:getDomains(),category:$('#category').value,size:$('#size').value.trim(),
    min_price:parseFloat($('#min_price').value)||0,max_price:parseFloat($('#max_price').value)||0,
    minus_words:$('#minus_words').value.trim(),conditions:Array.from(selConds)};
  if(editId){data.action='edit';data.search_id=editId;toast('Сохраняю...')}else toast('Создаю...');
  send(data);
});

$('#contactBtn').addEventListener('click',function(){if(tg)tg.openTelegramLink('https://t.me/liknine');else window.open('https://t.me/liknine')});

renderRegions();renderConds();renderProfile();renderSearches();
})();