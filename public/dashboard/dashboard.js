(function(){
  const THEME_KEY = 'visiter:theme';
  function applyTheme(theme){ if(theme === 'light') document.body.classList.add('light-theme'); else document.body.classList.remove('light-theme'); }
  function toggleTheme(){ const current = localStorage.getItem(THEME_KEY) || 'dark'; const next = current === 'dark' ? 'light' : 'dark'; localStorage.setItem(THEME_KEY, next); applyTheme(next); }
  function initTheme(){ const btn = document.getElementById('theme-btn'); const saved = localStorage.getItem(THEME_KEY) || 'dark'; applyTheme(saved); if(btn) btn.addEventListener('click', toggleTheme); }

  const stats = {
    today: { visitors: 128, pages: 42, total: 9583 },
    month: { visitors: 3420, pages: 42, total: 9583 },
    year: { visitors: 9583, pages: 42, total: 9583 }
  };

  function formatNumber(n){ return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }

  function initPeriodSelector(){
    const periodButton = document.getElementById('periodButton');
    const periodList = document.getElementById('periodList');
    if(!periodButton || !periodList) return;
    const items = Array.from(periodList.querySelectorAll('li'));
    function closeList(){ periodList.hidden = true; periodButton.setAttribute('aria-expanded', 'false'); }
    function openList(){ periodList.hidden = false; periodButton.setAttribute('aria-expanded', 'true'); const current = items.find(i => i.getAttribute('aria-current') === 'true'); if(current) current.focus(); else items[0].focus(); }
    periodButton.addEventListener('click', (e) => { e.stopPropagation(); const isOpen = !periodList.hidden; if(isOpen) closeList(); else openList(); });
    periodList.addEventListener('click', (e) => { e.stopPropagation(); });
    document.addEventListener('click', (e) => { if(periodList.hidden) return; if(!periodButton.contains(e.target) && !periodList.contains(e.target)) closeList(); });
    document.addEventListener('keydown', (e) => {
      if(periodList.hidden) return;
      const currentIndex = items.indexOf(document.activeElement);
      if(e.key === 'ArrowDown'){ e.preventDefault(); const next = items[(currentIndex + 1) % items.length]; next.focus(); }
      else if(e.key === 'ArrowUp'){ e.preventDefault(); const prev = items[(currentIndex - 1 + items.length) % items.length]; prev.focus(); }
      else if(e.key === 'Escape'){ closeList(); periodButton.focus(); }
      else if(e.key === 'Enter'){ if(document.activeElement && items.includes(document.activeElement)) document.activeElement.click(); }
    });
    items.forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        items.forEach(i => i.removeAttribute('aria-current'));
        item.setAttribute('aria-current', 'true');
        const key = item.getAttribute('data-period') || 'today';
        const label = item.textContent.trim();
        periodButton.textContent = label + ' ▾';
        updateStatsForPeriod(key);
        refreshOpenChartPeriod(key);
        closeList();
        periodButton.focus();
      });
      item.addEventListener('keydown', (e) => { if(e.key === 'Enter'){ e.stopPropagation(); item.click(); } });
    });
    const initial = items.find(i => i.getAttribute('aria-current') === 'true') || items[0];
    if(initial){ const key = initial.getAttribute('data-period') || 'today'; periodButton.textContent = initial.textContent.trim() + ' ▾'; updateStatsForPeriod(key); }
  }

  function updateStatsForPeriod(periodKey){
    const s = stats[periodKey] || stats.today;
    const visitorsEl = document.getElementById('today-visitors');
    const pagesEl = document.getElementById('pages-count');
    const totalEl = document.getElementById('total-visitors');
    if(visitorsEl) visitorsEl.textContent = formatNumber(s.visitors);
    if(pagesEl) pagesEl.textContent = formatNumber(stats.today.pages);
    if(totalEl) totalEl.textContent = formatNumber(s.total);
  }

  let modalChart = null;
  let openInfo = { type: null, period: null };
  const periodOrder = ['today','month','year'];

  function generateLabelsAndData(type, period){
    if(type === 'visitors'){
      if(period === 'today'){
        const labels = Array.from({length:24}, (_,i)=> (i<10?'0':'')+i+'h');
        const data = labels.map((_,i)=> Math.max(0, Math.round(20 + Math.sin(i/3)*30 + Math.random()*20)));
        return { labels, data, label: 'Visites (heures)' };
      } else if(period === 'month'){
        const days = 30;
        const labels = Array.from({length:days}, (_,i)=> 'J-'+(days-i-1));
        const data = labels.map((_,i)=> Math.max(0, Math.round(50 + Math.cos(i/6)*200 + Math.random()*100)));
        return { labels, data, label: 'Visites (jours)' };
      } else {
        const labels = ['Jan','Fév','Mar','Avr','Mai','Jui','Jui','Aoû','Sep','Oct','Nov','Déc'];
        const data = labels.map((_,i)=> Math.max(0, Math.round(1000 + Math.sin(i/2)*1200 + Math.random()*400)));
        return { labels, data, label: 'Visites (mois)' };
      }
    }
    if(type === 'total'){
      const labels = period === 'today' ? ['00','06','12','18','24'] : (period === 'month' ? Array.from({length:8},(_,i)=> 'S'+(i+1)) : ['2019','2020','2021','2022','2023','2024','2025']);
      const base = period === 'today' ? 100 : (period === 'month' ? 3000 : 60000);
      const data = labels.map((_,i)=> Math.max(0, Math.round(base + i * (period==='month'?400: (period==='today'?50:8000)) + Math.random()*200)));
      return { labels, data, label: 'Visiteurs cumulés' };
    }
    return { labels: [], data: [], label: 'Données' };
  }

  function createGradient(ctx, area, start, end){
    const g = ctx.createLinearGradient(0, area.top, 0, area.bottom);
    g.addColorStop(0, start);
    g.addColorStop(1, end);
    return g;
  }

  function openModal(type, period){
    const modal = document.getElementById('chartModal');
    const title = document.getElementById('chartTitle');
    const note = document.getElementById('chartNote');
    const canvas = document.getElementById('chartCanvas');
    modal.hidden = false;
    title.textContent = type === 'visitors' ? 'Visiteurs — ' + (period==='today'?'Aujourd\'hui': period==='month'?'Ce mois-ci' : 'Cette année') : (type === 'total' ? 'Visiteurs totaux' : 'Graphique');
    note.textContent = '';
    const ctx = canvas.getContext('2d');
    const res = generateLabelsAndData(type, period);
    if(modalChart) modalChart.destroy();
    const isLight = document.body.classList.contains('light-theme');
    const lineColor = isLight ? '#357a3a' : '#60a5fa';
    const fillStart = isLight ? 'rgba(53,122,58,0.28)' : 'rgba(96,165,250,0.28)';
    const fillEnd = isLight ? 'rgba(53,122,58,0.08)' : 'rgba(96,165,250,0.08)';
    modalChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: res.labels,
        datasets: [{
          label: res.label,
          data: res.data,
          borderColor: lineColor,
          backgroundColor: function(context){
            const chartArea = context.chart.chartArea;
            if(!chartArea) return fillStart;
            return createGradient(context.chart.ctx, chartArea, fillStart, fillEnd);
          },
          pointBackgroundColor: '#fff',
          pointBorderColor: lineColor,
          tension: 0.3,
          fill: true,
          pointRadius: 3,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: { legend: { display: true, labels: { boxWidth: 12 } } },
        scales: {
          x: { grid: { display: false }, ticks: { color: isLight ? '#222' : '#e6eef6' } },
          y: { grid: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.04)' }, ticks: { color: isLight ? '#222' : '#e6eef6' } }
        }
      }
    });
    openInfo.type = type;
    openInfo.period = period;
    const closeBtn = document.getElementById('chartClose');
    if(closeBtn) closeBtn.focus();
  }

  function closeModal(){
    const modal = document.getElementById('chartModal');
    modal.hidden = true;
    if(modalChart) modalChart.destroy();
    modalChart = null;
    openInfo.type = null;
    openInfo.period = null;
  }

  function refreshOpenChartPeriod(period){
    if(!openInfo.type) return;
    openModal(openInfo.type, period);
  }

  function initChartModalInteractions(){
    const cards = Array.from(document.querySelectorAll('.card[data-chart]'));
    cards.forEach(card => {
      const type = card.getAttribute('data-chart');
      if(type !== 'visitors' && type !== 'total') return;
      card.style.cursor = 'pointer';
      card.addEventListener('click', (e) => {
        if(e.target.closest('.period-wrapper')) return;
        const selected = document.querySelector('#periodList li[aria-current="true"]');
        const period = selected ? selected.getAttribute('data-period') : 'today';
        openModal(type, period);
      });
    });
    const backdrop = document.getElementById('chartBackdrop');
    const closeBtn = document.getElementById('chartClose');
    const prevBtn = document.getElementById('chartPrevPeriod');
    const nextBtn = document.getElementById('chartNextPeriod');
    if(backdrop) backdrop.addEventListener('click', closeModal);
    if(closeBtn) closeBtn.addEventListener('click', closeModal);
    if(prevBtn) prevBtn.addEventListener('click', () => {
      if(!openInfo.period) return;
      const i = periodOrder.indexOf(openInfo.period);
      const prev = periodOrder[(i - 1 + periodOrder.length) % periodOrder.length];
      refreshOpenChartPeriod(prev);
      const li = document.querySelector('#periodList li[data-period="'+prev+'"]');
      if(li) li.click();
    });
    if(nextBtn) nextBtn.addEventListener('click', () => {
      if(!openInfo.period) return;
      const i = periodOrder.indexOf(openInfo.period);
      const next = periodOrder[(i + 1) % periodOrder.length];
      refreshOpenChartPeriod(next);
      const li = document.querySelector('#periodList li[data-period="'+next+'"]');
      if(li) li.click();
    });
    document.addEventListener('keydown', (e) => {
      const modal = document.getElementById('chartModal');
      if(e.key === 'Escape' && modal && !modal.hidden) closeModal();
    });
  }

  let latencyChart = null;
  function initLatencyChart(){
    const canvas = document.getElementById('latencyChart');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    const isLight = document.body.classList.contains('light-theme');
    const lineColor = isLight ? '#2f9b4a' : '#60a5fa';
    const fillStart = isLight ? 'rgba(47,155,74,0.18)' : 'rgba(96,165,250,0.12)';
    const fillEnd = isLight ? 'rgba(47,155,74,0.02)' : 'rgba(96,165,250,0.02)';

    const initialLabels = [
      new Date(Date.now() - 20000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}),
      new Date(Date.now() - 10000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}),
      new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})
    ];
    const initialData = [120, 60, 85];

    latencyChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: initialLabels,
        datasets: [{
          label: 'Ping API (ms)',
          data: initialData,
          borderColor: lineColor,
          backgroundColor: function(context){
            const chartArea = context.chart.chartArea;
            if(!chartArea) return fillStart;
            return createGradient(context.chart.ctx, chartArea, fillStart, fillEnd);
          },
          pointBackgroundColor: '#fff',
          pointBorderColor: lineColor,
          tension: 0.25,
          fill: true,
          pointRadius: 3,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { display: true, labels: { boxWidth: 12 } }
        },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: isLight ? '#222' : '#e6eef6' } },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255,255,255,0.03)' },
            ticks: { color: isLight ? '#222' : '#e6eef6' }
          }
        }
      }
    });

    function fetchNewPing(){
      return Math.round(Math.max(0, 40 + Math.random() * 200));
    }

    setInterval(() => {
      if(!latencyChart) return;
      const now = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'});
      const val = fetchNewPing();
      latencyChart.data.labels.push(now);
      latencyChart.data.datasets[0].data.push(val);
      while(latencyChart.data.labels.length > 20){
        latencyChart.data.labels.shift();
        latencyChart.data.datasets[0].data.shift();
      }
      latencyChart.update();
    }, 10000);
  }

  function generateFakeTopPages(){
    const pages = [
      '/','/produits','/blog/post-1','/contact','/a-propos','/blog/post-2','/pricing'
    ];
    return pages.map((p,i)=> {
      return { rank: i+1, url: p, views: Math.round(5000/(i+1) + Math.random()*200), uniques: Math.round(4000/(i+1) + Math.random()*120), avgTime: (Math.round((30 + Math.random()*180))*1) + 's' };
    });
  }

  function renderTopPages(){
    const tbody = document.querySelector('#topPagesTable tbody');
    if(!tbody) return;
    const data = generateFakeTopPages();
    tbody.innerHTML = '';
    data.forEach(row => {
      const tr = document.createElement('tr');
      const tdRank = document.createElement('td');
      tdRank.textContent = String(row.rank);
      const tdUrl = document.createElement('td');
      tdUrl.textContent = row.url;
      const tdViews = document.createElement('td');
      tdViews.textContent = formatNumber(row.views);
      const tdUniques = document.createElement('td');
      tdUniques.textContent = formatNumber(row.uniques);
      const tdTime = document.createElement('td');
      tdTime.textContent = row.avgTime;
      tr.appendChild(tdRank);
      tr.appendChild(tdUrl);
      tr.appendChild(tdViews);
      tr.appendChild(tdUniques);
      tr.appendChild(tdTime);
      tbody.appendChild(tr);
    });
  }

  let deviceChart = null;
  let browserChart = null;

  function generateBreakdown(){
    const devices = { mobile: Math.round(60 + Math.random()*20), desktop: Math.round(30 + Math.random()*10), tablet: Math.round(5 + Math.random()*5) };
    const browsers = { chrome: Math.round(60 + Math.random()*15), safari: Math.round(20 + Math.random()*8), firefox: Math.round(10 + Math.random()*5), other: Math.round(5 + Math.random()*3) };
    return { devices, browsers };
  }

  function renderBreakdownCharts(){
    const bd = generateBreakdown();
    const dCtx = document.getElementById('deviceChart') && document.getElementById('deviceChart').getContext('2d');
    const bCtx = document.getElementById('browserChart') && document.getElementById('browserChart').getContext('2d');
    const legendEl = document.getElementById('breakdownLegend');
    const deviceColors = ['#1db954','#60a5fa','#f59e0b'];
    const browserColors = ['#60a5fa','#34d399','#a78bfa','#9ca3af'];
    if(legendEl){
      legendEl.innerHTML = '';
      const chips = [
        {label:'Mobile', color: deviceColors[0]},
        {label:'Bureau', color: deviceColors[1]},
        {label:'Tablette', color: deviceColors[2]},
        {label:'Chrome', color: browserColors[0]},
        {label:'Safari', color: browserColors[1]},
        {label:'Firefox', color: browserColors[2]},
        {label:'Autre', color: browserColors[3]}
      ];
      chips.forEach(c => {
        const span = document.createElement('span');
        span.className = 'legend-chip';
        const box = document.createElement('span');
        box.className = 'legend-box';
        box.style.background = c.color;
        box.style.borderColor = '#ffffff';
        span.appendChild(box);
        const txt = document.createElement('span');
        txt.textContent = c.label;
        span.appendChild(txt);
        legendEl.appendChild(span);
      });
    }
    if(dCtx){
      if(deviceChart) deviceChart.destroy();
      const isLight = document.body.classList.contains('light-theme');
      const borderColor = isLight ? '#f8fafc' : '#0f1724';
      deviceChart = new Chart(dCtx, {
        type: 'doughnut',
        data: {
          labels: ['Mobile','Bureau','Tablette'],
          datasets: [{ data: [bd.devices.mobile, bd.devices.desktop, bd.devices.tablet], backgroundColor: deviceColors, borderColor: borderColor, borderWidth: 2 }]
        },
        options: { animation: false, maintainAspectRatio: false, responsive: true, cutout: '60%', plugins: { legend: { display: false } } }
      });
    }
    if(bCtx){
      if(browserChart) browserChart.destroy();
      const isLight = document.body.classList.contains('light-theme');
      const borderColor = isLight ? '#f8fafc' : '#0f1724';
      browserChart = new Chart(bCtx, {
        type: 'doughnut',
        data: {
          labels: ['Chrome','Safari','Firefox','Autre'],
          datasets: [{ data: [bd.browsers.chrome, bd.browsers.safari, bd.browsers.firefox, bd.browsers.other], backgroundColor: browserColors, borderColor: borderColor, borderWidth: 2 }]
        },
        options: { animation: false, maintainAspectRatio: false, responsive: true, cutout: '60%', plugins: { legend: { display: false } } }
      });
    }
  }

  let mapInstance = null;
  let mapMarkers = [];
  function initMap(){
    const mapEl = document.getElementById('map');
    if(!mapEl) return;
    mapInstance = L.map('map', {center:[20,0], zoom:2, attributionControl:false});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(mapInstance);
    const marker = L.circleMarker([20,0],{radius:8, color:'#1db954', fillColor:'#1db954', fillOpacity:0.24}).addTo(mapInstance);
    mapMarkers.push(marker);
    mapInstance.on('click', e=>{
      marker.setLatLng(e.latlng);
      mapInstance.panTo(e.latlng);
    });
  }

  function addLiveMarker(lat, lng){
    if(!mapInstance) return;
    const m = L.circleMarker([lat,lng], {radius:6, color:'#34d399', fillColor:'#34d399', fillOpacity:0.22}).addTo(mapInstance);
    mapMarkers.push(m);
    setTimeout(()=> { mapInstance.removeLayer(m); const idx = mapMarkers.indexOf(m); if(idx !== -1) mapMarkers.splice(idx,1); }, 20000);
  }

  let liveInterval = null;
  let livePaused = false;
  let pageCounts = {};
  let lastBreakdownUpdate = 0;
  function initLiveFeed(){
    const liveList = document.getElementById('liveList');
    if(!liveList) return;
    const pages = ['/','/produits','/blog/post-1','/contact','/a-propos','/blog/post-2','/pricing'];
    pages.forEach(p => pageCounts[p] = Math.max(0, Math.round(100 + Math.random()*400)));
    function renderLiveList(){
      liveList.innerHTML = '';
      const keys = Object.keys(pageCounts);
      keys.forEach(url=>{
        const li = document.createElement('li');
        li.className = 'live-item';
        li.innerHTML = '<span class="dot" aria-hidden="true"></span><div class="meta"><strong>'+url+'</strong> • <span class="time">'+formatNumber(pageCounts[url])+' vues</span></div>';
        liveList.appendChild(li);
      });
    }
    renderLiveList();
    function pushEntry(){
      if(livePaused) return;
      const keys = Object.keys(pageCounts);
      const pick = keys[Math.floor(Math.random()*keys.length)];
      pageCounts[pick] = pageCounts[pick] + 1;
      renderLiveList();
      addLiveMarker((Math.random()*140)-70, (Math.random()*360)-180);
      const todayVisitorsEl = document.getElementById('today-visitors');
      const totalEl = document.getElementById('total-visitors');
      if(todayVisitorsEl) todayVisitorsEl.textContent = formatNumber(Number(String(todayVisitorsEl.textContent).replace(/\s/g,'')) + 1);
      if(totalEl) totalEl.textContent = formatNumber(Number(String(totalEl.textContent).replace(/\s/g,'')) + 1);
      renderTopPages();
      const nowTs = Date.now();
      if(nowTs - lastBreakdownUpdate > 30000){
        renderBreakdownCharts();
        lastBreakdownUpdate = nowTs;
      }
    }
    liveInterval = setInterval(pushEntry, 3500);
  }

  function exportCSV(){
    const topRows = generateFakeTopPages();
    const csvLines = [];
    csvLines.push(['Rank','Page','Views','Uniques','AvgTime'].join(','));
    topRows.forEach(r => csvLines.push([r.rank, '"'+r.url+'"', r.views, r.uniques, r.avgTime].join(',')));
    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'top-pages.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function renderServicesStatus(){
    const services = [
      { id: 'api', name: 'Serveur API', ok: true },
      { id: 'db', name: 'Base de données', ok: true },
      { id: 'notifications', name: 'Notifications', ok: false }
    ];
    const el = document.getElementById('servicesList');
    if(!el) return;
    el.innerHTML = '';
    services.forEach(s=>{
      const row = document.createElement('div');
      row.className = 'service-row';
      const name = document.createElement('div');
      name.className = 'service-name';
      name.textContent = s.name;
      const status = document.createElement('div');
      status.className = 'service-status-label ' + (s.ok ? 'service-up' : 'service-down');
      status.textContent = s.ok ? 'Opérationnel' : 'Hors ligne';
      row.appendChild(name);
      row.appendChild(status);
      el.appendChild(row);
    });
  }

  function initDashboardPage(){
    const params = new URLSearchParams(window.location.search);
    const tag = params.get('tag') || '';
    const name = params.get('name') || '';
    const tagParamEl = document.getElementById('tagParam');
    const tagNameEl = document.getElementById('tagNameDisplay') || document.getElementById('tagName');
    if(tagParamEl) tagParamEl.textContent = tag || '(vide)';
    if(tagNameEl) tagNameEl.textContent = name || '(vide)';
    initPeriodSelector();
    initChartModalInteractions();
    initLatencyChart();
    initMap();
    renderTopPages();
    renderBreakdownCharts();
    initLiveFeed();
    renderServicesStatus();
    const mapEl = document.getElementById('map');
    if(!mapEl) return;
    const map = mapInstance;
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    initTheme();
    document.getElementById('exportCsv') && document.getElementById('exportCsv').addEventListener('click', exportCSV);
    if(document.getElementById('map')) initDashboardPage();
    else { initPeriodSelector(); initChartModalInteractions(); initLatencyChart(); renderBreakdownCharts(); renderTopPages(); }
  });

  window.__visiter = { initDashboardPage };
})();