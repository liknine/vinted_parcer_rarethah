(() => {
'use strict';
const tg = window.Telegram?.WebApp || null;
if (tg) {
  tg.ready();
  tg.expand();
  tg.setHeaderColor('#050505');
  tg.setBackgroundColor('#050505');
}
const params = new URLSearchParams(window.location.search);
let searches = [];
try { searches = JSON.parse(params.get('searches') || '[]'); } catch (e) { searches = []; }

const REGIONS = [
  { id: 'fr', name: 'France', domain: 'vinted.fr', flag: '🇫🇷' },
  { id: 'de', name: 'Germany', domain: 'vinted.de', flag: '🇩🇪' },
  { id: 'it', name: 'Italy', domain: 'vinted.it', flag: '🇮🇹' }
];

let editId = null;
let selectedRegions = new Set(['de']);

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function toast(text) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = text;
  el.classList.remove('hidden');
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => el.classList.add('hidden'), 2400);
}

function send(payload) {
  const raw = JSON.stringify(payload);
  if (tg) tg.sendData(raw);
  else { console.log(raw); toast('Debug: payload in console'); }
}

function getDomains() {
  const domains = [];
  selectedRegions.forEach((id) => {
    const found = REGIONS.find((x) => x.id === id);
    if (found) domains.push(found.domain);
  });
  return domains.length ? domains : ['vinted.de'];
}

function regionNameByDomain(domain) {
  const found = REGIONS.find((x) => x.domain === domain);
  return found ? found.name : domain;
}

function renderRegions() {
  const root = $('#regionGrid');
  if (!root) return;
  root.innerHTML = '';
  REGIONS.forEach((region) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'region' + (selectedRegions.has(region.id) ? ' active' : '');
    btn.innerHTML = '<span class="region-flag">' + region.flag + '</span><span>' + region.name + '</span>';
    btn.addEventListener('click', () => {
      if (selectedRegions.has(region.id)) {
        if (selectedRegions.size === 1) return toast('At least 1 country');
        selectedRegions.delete(region.id);
      } else {
        if (selectedRegions.size >= 3) return toast('Maximum 3 countries');
        selectedRegions.add(region.id);
      }
      renderRegions();
    });
    root.appendChild(btn);
  });
}

function renderSearches() {
  const root = $('#sList');
  const counter = $('#sCnt');
  if (!root || !counter) return;
  counter.textContent = String(searches.length);
  root.innerHTML = '';
  if (!searches.length) {
    root.innerHTML = '<div class="empty">No searches yet</div>';
    return;
  }
  searches.forEach((search) => {
    const card = document.createElement('div');
    card.className = 'search-card';
    const domains = (search.domain || 'vinted.de').split(',').map((d) => regionNameByDomain(d.trim())).join(', ');
    card.innerHTML = '<div class="search-card-top"><div><div class="search-title">' + (search.query || '—') + '</div><div class="search-meta">' + domains + '</div></div><span class="state">ACTIVE</span></div><div class="search-actions"><button type="button" class="ghost edit">Edit</button><button type="button" class="ghost danger remove">Delete</button></div>';
    card.querySelector('.edit')?.addEventListener('click', () => startEdit(search));
    card.querySelector('.remove')?.addEventListener('click', () => {
      if (window.confirm('Delete "' + search.query + '"?')) send({ action: 'delete', search_id: search.id });
    });
    root.appendChild(card);
  });
}

function activateTab(tabId) {
  $$('.page').forEach((p) => p.classList.remove('active'));
  $$('.tab').forEach((t) => t.classList.remove('active'));
  $('#' + tabId)?.classList.add('active');
  document.querySelector('.tab[data-tab="' + tabId + '"]')?.classList.add('active');
}

function startEdit(search) {
  editId = search.id;
  $('#query').value = search.query || '';
  $('#category').value = search.category || 'all';
  $('#size').value = search.size || '';
  $('#min_price').value = search.min_price || '';
  $('#max_price').value = search.max_price || '';
  $('#minus_words').value = search.minus_words || '';
  $('#submitBtn').textContent = 'Save Search';
  $('#cancelBtn').classList.remove('hidden');
  selectedRegions.clear();
  (search.domain || 'vinted.de').split(',').forEach((d) => {
    const found = REGIONS.find((x) => x.domain === d.trim());
    if (found) selectedRegions.add(found.id);
  });
  if (!selectedRegions.size) selectedRegions.add('de');
  renderRegions();
  activateTab('tabSearch');
}

function resetForm() {
  editId = null;
  $('#searchForm')?.reset();
  $('#submitBtn').textContent = 'Create Search';
  $('#cancelBtn').classList.add('hidden');
  selectedRegions = new Set(['de']);
  renderRegions();
}

function bindTabs() {
  $$('.tab').forEach((tab) => tab.addEventListener('click', () => activateTab(tab.dataset.tab)));
}

function bindForm() {
  const form = $('#searchForm');
  $('#cancelBtn')?.addEventListener('click', resetForm);
  $('#submitBtn')?.addEventListener('click', () => form?.requestSubmit?.());
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const query = ($('#query').value || '').trim();
    if (!query) return toast('Enter brand/query');
    if (searches.length >= 5 && !editId) return toast('Maximum 5 searches');
    const payload = {
      query,
      domain: getDomains(),
      category: $('#category').value,
      size: ($('#size').value || '').trim(),
      min_price: parseFloat($('#min_price').value) || 0,
      max_price: parseFloat($('#max_price').value) || 0,
      minus_words: ($('#minus_words').value || '').trim()
    };
    if (editId) {
      payload.action = 'edit';
      payload.search_id = editId;
      toast('Saving...');
    } else {
      toast('Creating...');
    }
    send(payload);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  bindTabs();
  bindForm();
  renderRegions();
  renderSearches();
});
})();