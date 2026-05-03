(function(){
"use strict";

var telegramApp=window.Telegram&&window.Telegram.WebApp;
var tg=telegramApp&&telegramApp.initData?telegramApp:null;
var tgUser=tg&&tg.initDataUnsafe&&tg.initDataUnsafe.user;
if(tg){
  tg.ready();
  tg.expand();
  if(!tg.isVersionAtLeast||tg.isVersionAtLeast("6.1")){
    tg.setHeaderColor("#050609");
    tg.setBackgroundColor("#050609");
  }
  if(tg.setBottomBarColor&&(!tg.isVersionAtLeast||tg.isVersionAtLeast("7.10")))tg.setBottomBarColor("#050609");
}

var P=new URLSearchParams(location.search);
var userId=P.get("id")||(tgUser&&tgUser.id?String(tgUser.id):"0");
var avatarUrl=P.get("avatar")?decodeURIComponent(P.get("avatar")):(tgUser&&tgUser.photo_url?tgUser.photo_url:"");
var searches=[];
try{searches=JSON.parse(decodeURIComponent(P.get("searches")||"[]"))}catch(e){searches=[]}

var DOMAINS=[
  {id:"de",name:"Germany",domain:"vinted.de",flag:"🇩🇪"},
  {id:"it",name:"Italy",domain:"vinted.it",flag:"🇮🇹"},
  {id:"pl",name:"Poland",domain:"vinted.pl",flag:"🇵🇱"},
  {id:"fr",name:"France",domain:"vinted.fr",flag:"🇫🇷"}
];
var DOMAIN_BY_ID=DOMAINS.reduce(function(acc,d){acc[d.id]=d;return acc},{});
var ID_BY_DOMAIN=DOMAINS.reduce(function(acc,d){acc[d.domain]=d.id;return acc},{});
var NAME_BY_DOMAIN=DOMAINS.reduce(function(acc,d){acc[d.domain]=d.flag+" "+d.name;return acc},{});
var CATEGORY_LABELS={clothes:"Одежда",shoes:"Обувь",all:"Любая"};

var editId=null;
var deleteId=null;
var selectedDomains=new Set(DOMAINS.map(function(d){return d.id}));
var toastTimer=null;

function $(selector){return document.querySelector(selector)}
function $$(selector){return Array.prototype.slice.call(document.querySelectorAll(selector))}
function esc(value){
  var node=document.createElement("div");
  node.textContent=String(value||"");
  return node.innerHTML;
}
function haptic(kind){
  if(tg&&tg.HapticFeedback&&(!tg.isVersionAtLeast||tg.isVersionAtLeast("6.1"))){
    if(kind==="error")tg.HapticFeedback.notificationOccurred("error");
    else if(kind==="success")tg.HapticFeedback.notificationOccurred("success");
    else tg.HapticFeedback.impactOccurred("light");
  }
}
function toast(message){
  var node=$("#toast");
  node.textContent=message;
  node.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer=setTimeout(function(){node.classList.add("hidden")},2300);
}
function send(data){
  if(tg)tg.sendData(JSON.stringify(data));
  else{
    console.log(data);
    toast("Данные отправлены в консоль");
  }
}

function switchTab(tabId){
  $$(".page").forEach(function(page){page.classList.toggle("active",page.id===tabId)});
  $$(".tab").forEach(function(tab){tab.classList.toggle("active",tab.dataset.tab===tabId)});
  haptic();
}
$$(".tab").forEach(function(button){
  button.addEventListener("click",function(){switchTab(button.dataset.tab)});
});

function getDomains(){
  var domains=[];
  selectedDomains.forEach(function(id){
    if(DOMAIN_BY_ID[id])domains.push(DOMAIN_BY_ID[id].domain);
  });
  return domains.length?domains:["vinted.fr"];
}

function renderDomains(){
  var grid=$("#regionGrid");
  grid.innerHTML="";
  DOMAINS.forEach(function(domain){
    var card=document.createElement("button");
    card.type="button";
    card.className="domain-card"+(selectedDomains.has(domain.id)?" active":"");
    card.setAttribute("aria-pressed",selectedDomains.has(domain.id)?"true":"false");
    card.innerHTML=
      '<span class="domain-name"><strong>'+esc(domain.name)+'</strong><span>'+esc(domain.domain)+'</span></span>'+
      '<span class="domain-flag" aria-hidden="true">'+domain.flag+"</span>";
    card.addEventListener("click",function(){
      if(selectedDomains.has(domain.id)){
        if(selectedDomains.size===1){
          haptic("error");
          toast("Оставь минимум один домен");
          return;
        }
        selectedDomains.delete(domain.id);
      }else{
        selectedDomains.add(domain.id);
      }
      card.classList.toggle("active",selectedDomains.has(domain.id));
      card.setAttribute("aria-pressed",selectedDomains.has(domain.id)?"true":"false");
      haptic();
    });
    grid.appendChild(card);
  });
}

function parseDomainList(raw){
  if(Array.isArray(raw))return raw;
  return String(raw||"vinted.fr").split(",").map(function(item){return item.trim()}).filter(Boolean);
}
function domainsLabel(raw){
  return parseDomainList(raw).map(function(domain){
    return NAME_BY_DOMAIN[domain]||domain;
  }).join(" · ");
}

function renderProfile(){
  var firstName=P.get("name")?decodeURIComponent(P.get("name")):(tgUser&&tgUser.first_name?tgUser.first_name:"");
  var lastName=tgUser&&tgUser.last_name?tgUser.last_name:"";
  var username=P.get("username")?decodeURIComponent(P.get("username")):(tgUser&&tgUser.username?tgUser.username:"");
  var name=[firstName,lastName].filter(Boolean).join(" ")||"User";
  var initial=(name.trim()[0]||"?").toUpperCase();
  var avatarText=$("#avaL");
  var avatarImage=$("#avaI");

  $("#pName").textContent=name;
  $("#pUser").textContent=username?"@"+username:"";
  $("#sId").textContent=userId;
  $("#sCount").textContent=searches.length+" / 10";

  if(avatarUrl){
    avatarImage.src=avatarUrl;
    avatarImage.classList.remove("hidden");
    avatarText.classList.add("hidden");
    avatarImage.onerror=function(){
      avatarImage.classList.add("hidden");
      avatarText.classList.remove("hidden");
      avatarText.textContent=initial;
    };
  }else{
    avatarText.textContent=initial;
    avatarText.classList.remove("hidden");
    avatarImage.classList.add("hidden");
  }
}

function searchFilters(search){
  var filters=[];
  var category=search.category||"";
  if(category&&CATEGORY_LABELS[category])filters.push(CATEGORY_LABELS[category]);
  if(Number(search.max_price)>0)filters.push("до "+search.max_price);
  if(search.size)filters.push("размер "+search.size);
  return filters;
}

function renderSearches(){
  var list=$("#sList");
  var count=$("#sCnt");
  list.innerHTML="";
  count.textContent=searches.length;

  if(!searches.length){
    list.innerHTML='<div class="empty">Пока нет активных поисков</div>';
    return;
  }

  searches.forEach(function(search,index){
    var card=document.createElement("article");
    card.className="search-card";
    card.style.animationDelay=Math.min(index*35,180)+"ms";
    var filters=searchFilters(search);
    var tags=filters.length?filters.map(function(item){
      return '<span class="search-tag">'+esc(item)+"</span>";
    }).join(""):'<span class="search-tag">без доп. фильтров</span>';

    card.innerHTML=
      '<div class="search-card-top">'+
        '<div><div class="search-title">'+esc(search.query||"Без названия")+'</div>'+
        '<div class="search-domain">'+esc(domainsLabel(search.domain))+'</div></div>'+
        '<span class="status-badge">активен</span>'+
      '</div>'+
      '<div class="search-tags">'+tags+'</div>'+
      '<div class="search-actions">'+
        '<button class="search-action edit" type="button">Редактировать</button>'+
        '<button class="search-action danger delete" type="button">Удалить</button>'+
      '</div>';

    card.querySelector(".edit").addEventListener("click",function(){startEdit(search)});
    card.querySelector(".delete").addEventListener("click",function(){openConfirm(search)});
    list.appendChild(card);
  });
}

function hydrateDomains(raw){
  selectedDomains.clear();
  parseDomainList(raw).forEach(function(domain){
    var id=ID_BY_DOMAIN[domain];
    if(id)selectedDomains.add(id);
  });
  if(!selectedDomains.size)selectedDomains.add("fr");
  renderDomains();
}

function startEdit(search){
  editId=search.id;
  $("#formTitle").textContent="Редактирование";
  $("#cancelBtn").classList.remove("hidden");
  $("#submitBtn").textContent="Сохранить";
  $("#query").value=search.query||"";
  $("#size").value=search.size||"";
  $("#max_price").value=Number(search.max_price)>0?search.max_price:"";
  $("#category").value=search.category==="shoes"?"shoes":"clothes";
  hydrateDomains(search.domain);
  switchTab("tabSearch");
  window.requestAnimationFrame(function(){
    $("#searchForm").scrollIntoView({behavior:"smooth",block:"start"});
  });
}

function cancelEdit(){
  editId=null;
  $("#formTitle").textContent="Новый поиск";
  $("#cancelBtn").classList.add("hidden");
  $("#submitBtn").textContent="Создать поиск";
  $("#searchForm").reset();
  $("#category").value="clothes";
  selectedDomains=new Set(DOMAINS.map(function(d){return d.id}));
  renderDomains();
}

function openConfirm(search){
  deleteId=search.id;
  $("#confirmText").textContent="Поиск «"+(search.query||"Без названия")+"» будет удален.";
  $("#confirmModal").classList.remove("hidden");
  haptic();
}
function closeConfirm(){
  deleteId=null;
  $("#confirmModal").classList.add("hidden");
}

$("#cancelBtn").addEventListener("click",cancelEdit);
$("#confirmCancel").addEventListener("click",closeConfirm);
$("#confirmModal").addEventListener("click",function(event){
  if(event.target.id==="confirmModal")closeConfirm();
});
$("#confirmDelete").addEventListener("click",function(){
  if(!deleteId)return;
  haptic("success");
  send({action:"delete",search_id:deleteId});
  closeConfirm();
});
document.addEventListener("keydown",function(event){
  if(event.key==="Escape"&&!$("#confirmModal").classList.contains("hidden"))closeConfirm();
});

$("#searchForm").addEventListener("submit",function(event){
  event.preventDefault();
  var query=$("#query").value.trim();
  if(!query){
    haptic("error");
    toast("Введи название товара");
    return;
  }

  var data={
    query:query,
    domain:getDomains(),
    category:$("#category").value,
    size:$("#size").value.trim(),
    min_price:0,
    max_price:parseFloat($("#max_price").value)||0,
    minus_words:"",
    conditions:[]
  };
  if(editId){
    data.action="edit";
    data.search_id=editId;
    toast("Сохраняю поиск");
  }else{
    toast("Создаю поиск");
  }
  haptic("success");
  send(data);
});

renderDomains();
renderProfile();
renderSearches();
})();
