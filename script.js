const STORAGE_KEY = 'visiter:tags';
const THEME_KEY = 'visiter:theme';
function loadTags(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return [];
    const parsed = JSON.parse(raw);
    if(Array.isArray(parsed)) return parsed;
    return [];
  }catch(e){
    return [];
  }
}
function saveTags(list){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }catch(e){}
}
function generateTag(length=10){
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let res = '';
  for(let i=0;i<length;i++){
    res += charset.charAt(Math.floor(Math.random()*charset.length));
  }
  return res;
}
function createUniqueTag(attempts=6){
  const tags = loadTags();
  for(let i=0;i<attempts;i++){
    const t = generateTag(10);
    if(!tags.includes(t)){
      tags.unshift(t);
      saveTags(tags);
      return t;
    }
  }
  const fallback = generateTag(12) + Date.now().toString(36);
  const tags2 = loadTags();
  tags2.unshift(fallback);
  saveTags(tags2);
  return fallback;
}
function renderTags(){
  const tagListEl = document.getElementById('tagList');
  const emptyStateEl = document.getElementById('emptyState');
  if(!tagListEl) return;
  const tags = loadTags();
  tagListEl.innerHTML = '';
  if(tags.length === 0){
    emptyStateEl.style.display = 'block';
    return;
  } else {
    emptyStateEl.style.display = 'none';
  }
  tags.forEach(tag=>{
    const li = document.createElement('li');
    li.className = 'tag-item';
    li.setAttribute('role','button');
    li.setAttribute('tabindex','0');
    li.dataset.tag = tag;
    const spanName = document.createElement('div');
    spanName.className = 'tag-name';
    spanName.textContent = tag;
    const spanMeta = document.createElement('div');
    spanMeta.className = 'tag-meta';
    spanMeta.textContent = 'Aller au dashboard →';
    li.appendChild(spanName);
    li.appendChild(spanMeta);
    li.addEventListener('click', ()=>{
      const url = new URL(window.location.href);
      const base = url.origin + (url.pathname.replace(/\/[^/]*$/,'/') || '/');
      const dest = new URL('dashboard.html', base);
      dest.searchParams.set('tag', tag);
      dest.searchParams.set('name', tag);
      window.location.href = dest.toString();
    });
    li.addEventListener('keydown', (e)=>{
      if(e.key === 'Enter' || e.key === ' '){
        e.preventDefault();
        li.click();
      }
    });
    tagListEl.appendChild(li);
  });
}
function highlightTag(tag){
  setTimeout(()=>{
    const items = Array.from(document.querySelectorAll('.tag-item'));
    const first = items.find(it=>it.dataset.tag === tag);
    if(first){
      first.scrollIntoView({behavior:'smooth', block:'center'});
      first.style.boxShadow = '0 12px 30px rgba(29,185,84,0.16)';
      setTimeout(()=> first.style.boxShadow = '', 1100);
    }
  },50);
}
function initTagsPage(){
  const newTagBtn = document.getElementById('newTagBtn');
  renderTags();
  if(newTagBtn){
    newTagBtn.addEventListener('click', ()=>{
      const newTag = createUniqueTag();
      renderTags();
      highlightTag(newTag);
    });
  }
}
function initDashboardPage(){
  const params = new URLSearchParams(window.location.search);
  const tag = params.get('tag') || '';
  const name = params.get('name') || '';
  const tagParamEl = document.getElementById('tagParam');
  const tagNameEl = document.getElementById('tagName');
  if(tagParamEl) tagParamEl.textContent = tag || '(vide)';
  if(tagNameEl) tagNameEl.textContent = name || '(vide)';
  const mapEl = document.getElementById('map');
  if(!mapEl) return;
  const map = L.map('map', {center:[20,0], zoom:2, attributionControl:false});
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
  const marker = L.circleMarker([20,0],{radius:8, color:'#1db954', fillColor:'#1db954', fillOpacity:0.24}).addTo(map);
  map.on('click', e=>{
    marker.setLatLng(e.latlng);
    map.panTo(e.latlng);
  });
}
function applyTheme(theme){
  if(theme === 'light'){
    document.body.classList.add('light-theme');
  }else{
    document.body.classList.remove('light-theme');
  }
}
function toggleTheme(){
  const current = localStorage.getItem(THEME_KEY) || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
}
function initTheme(){
  const btn = document.getElementById('theme-btn');
  const saved = localStorage.getItem(THEME_KEY) || 'dark';
  applyTheme(saved);
  if(btn) btn.addEventListener('click', toggleTheme);
}
document.addEventListener('DOMContentLoaded', ()=>{
  initTheme();
  if(document.getElementById('tagList')) initTagsPage();
  if(document.getElementById('map')) initDashboardPage();
});