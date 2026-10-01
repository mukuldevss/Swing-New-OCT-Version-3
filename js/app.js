/* ============================================================
   Swing Space — Swing Trading Portfolio Tracker
   app.js — Main application logic
   ============================================================ */

'use strict';

// ── State ──────────────────────────────────────────────────
const S = {
  positions:   [],
  theme:       'light',
  activeTab:   'dashboard',
  prevTab:     'positions',
  view:        'list',        // list | card
  filter:      'all',         // all | open | closed
  editingId:   null,
  charts:      {},
  acHighlight: -1,
};

// ── Sample Data ────────────────────────────────────────────
const SAMPLES = [
  {
    id: 'pos_1', symbol: 'RELIANCE', exchange: 'NSE',
    name: 'Reliance Industries Ltd', sector: 'Energy & Power',
    qty: 15, entryPrice: 2892, stopLoss: 2820, target: 3060,
    ltp: 2945, status: 'open',
    entryDate: '2025-09-05', exitDate: null, exitPrice: null,
    notes: 'Breakout above 2880 resistance on high volume. Budget beneficiary.',
  },
  {
    id: 'pos_2', symbol: 'TCS', exchange: 'NSE',
    name: 'Tata Consultancy Services Ltd', sector: 'IT & Technology',
    qty: 5, entryPrice: 3820, stopLoss: 3740, target: 4020,
    ltp: 3875, status: 'open',
    entryDate: '2025-09-08', exitDate: null, exitPrice: null,
    notes: 'IT index strength. Q2 results expected to be strong. Risk defined.',
  },
  {
    id: 'pos_3', symbol: 'HDFCBANK', exchange: 'NSE',
    name: 'HDFC Bank Ltd', sector: 'Banking & Finance',
    qty: 20, entryPrice: 1695, stopLoss: 1655, target: 1790,
    ltp: 1672, status: 'open',
    entryDate: '2025-09-10', exitDate: null, exitPrice: null,
    notes: 'Pullback to 50 DMA support. Watch 1650 carefully — below that, exit.',
  },
  {
    id: 'pos_4', symbol: 'INFY', exchange: 'NSE',
    name: 'Infosys Ltd', sector: 'IT & Technology',
    qty: 25, entryPrice: 1455, stopLoss: 1415, target: 1560,
    ltp: 1560, status: 'closed',
    entryDate: '2025-08-20', exitDate: '2025-09-12', exitPrice: 1558,
    notes: 'Target hit within 3 weeks. Clean textbook trade.',
  },
  {
    id: 'pos_5', symbol: 'ICICIBANK', exchange: 'NSE',
    name: 'ICICI Bank Ltd', sector: 'Banking & Finance',
    qty: 30, entryPrice: 1085, stopLoss: 1055, target: 1160,
    ltp: 1112, status: 'open',
    entryDate: '2025-09-15', exitDate: null, exitPrice: null,
    notes: 'Cup & handle on daily. Sector rotation into banking.',
  },
  {
    id: 'pos_6', symbol: 'WIPRO', exchange: 'NSE',
    name: 'Wipro Ltd', sector: 'IT & Technology',
    qty: 40, entryPrice: 558, stopLoss: 540, target: 600,
    ltp: 538, status: 'closed',
    entryDate: '2025-08-28', exitDate: '2025-09-09', exitPrice: 539,
    notes: 'SL hit. Weak sector momentum at the time. Took the loss quickly.',
  },
  {
    id: 'pos_7', symbol: 'HCLTECH', exchange: 'NSE',
    name: 'HCL Technologies Ltd', sector: 'IT & Technology',
    qty: 18, entryPrice: 1742, stopLoss: 1695, target: 1880,
    ltp: 1795, status: 'open',
    entryDate: '2025-09-18', exitDate: null, exitPrice: null,
    notes: 'Relative strength vs Nifty IT. Building base above 1700.',
  },
];

// ── Storage ────────────────────────────────────────────────
function save() {
  localStorage.setItem('swingspace_v2', JSON.stringify(S.positions));
}
function load() {
  try {
    const raw = localStorage.getItem('swingspace_v2');
    S.positions = raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(SAMPLES));
  } catch {
    S.positions = JSON.parse(JSON.stringify(SAMPLES));
  }
  if (!S.positions.length) S.positions = JSON.parse(JSON.stringify(SAMPLES));
}

// ── Calculations ───────────────────────────────────────────
function unrealizedPnL(p) {
  if (p.status !== 'open') return 0;
  return (p.ltp - p.entryPrice) * p.qty;
}
function realizedPnL(p) {
  if (p.status === 'open' || !p.exitPrice) return null;
  return (p.exitPrice - p.entryPrice) * p.qty;
}
function pnl(p) {
  return p.status === 'open' ? unrealizedPnL(p) : (realizedPnL(p) ?? 0);
}
function risk(p)   { return Math.abs(p.entryPrice - p.stopLoss) * p.qty; }
function reward(p) { return p.target ? Math.abs(p.target - p.entryPrice) * p.qty : null; }
function rr(p) {
  const r = reward(p), k = risk(p);
  return (r && k) ? r / k : null;
}
function invested(p) { return p.entryPrice * p.qty; }
function pnlPct(p) {
  const pl = pnl(p), inv = invested(p);
  return inv ? (pl / inv) * 100 : 0;
}
function riskPct(p) { return (risk(p) / invested(p)) * 100; }

// ── Formatting ─────────────────────────────────────────────
const fmt = (n, d = 2) => {
  if (n == null || isNaN(n)) return '—';
  return '₹' + Math.abs(n).toLocaleString('en-IN', {
    minimumFractionDigits: d, maximumFractionDigits: d,
  });
};
const fmtN = (n, d = 2) => {
  if (n == null || isNaN(n)) return '—';
  return n.toLocaleString('en-IN', {
    minimumFractionDigits: d, maximumFractionDigits: d,
  });
};
const fmtPct = (n, d = 2) => (n == null || isNaN(n)) ? '—' : (n >= 0 ? '+' : '') + n.toFixed(d) + '%';
const fmtRR  = (r) => r == null ? '—' : '1:' + r.toFixed(2);
const signClass = (v) => v > 0 ? 'text-gain' : v < 0 ? 'text-loss' : 'text-muted';

function positionStatusLabel(p) {
  if (p.status === 'closed') {
    const pl = realizedPnL(p);
    return pl >= 0
      ? `<span class="badge badge-gain"><span class="badge-dot"></span>Target Hit</span>`
      : `<span class="badge badge-loss"><span class="badge-dot"></span>SL Hit</span>`;
  }
  const ltpVsSL = p.ltp - p.stopLoss;
  const ltpVsTarget = p.target ? p.target - p.ltp : Infinity;
  if (ltpVsSL < 0)    return `<span class="badge badge-loss"><span class="badge-dot"></span>Near SL</span>`;
  if (ltpVsTarget < (p.target - p.entryPrice) * 0.1)
                       return `<span class="badge badge-gain"><span class="badge-dot"></span>Near Target</span>`;
  if (p.ltp < p.entryPrice)
                       return `<span class="badge badge-warn"><span class="badge-dot"></span>Below Entry</span>`;
  return `<span class="badge badge-open"><span class="badge-dot"></span>Open</span>`;
}

// ── Theme ───────────────────────────────────────────────────
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  document.getElementById('icon-sun').classList.toggle('hidden', t === 'light');
  document.getElementById('icon-moon').classList.toggle('hidden', t === 'dark');
  S.theme = t;
  localStorage.setItem('swingspace_theme', t);
  if (S.activeTab === 'dashboard') {
    setTimeout(renderDashboard, 50);
  }
}
function toggleTheme() {
  applyTheme(S.theme === 'light' ? 'dark' : 'light');
}

// ── Navigation ─────────────────────────────────────────────
function switchTab(tab) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(el =>
    el.classList.toggle('active', el.dataset.tab === tab));
  document.getElementById('tab-' + tab).classList.add('active');
  S.prevTab = S.activeTab;
  S.activeTab = tab;
  if (tab === 'dashboard')    renderDashboard();
  if (tab === 'positions')    renderPositions();
  if (tab === 'add-position') initAddPositionForm();
}
function showDetail(id) {
  S.prevTab = S.activeTab;
  S.activeTab = 'position-detail';
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-position-detail').classList.add('active');
  renderDetail(id);
}
function backFromDetail() {
  switchTab(S.prevTab === 'position-detail' ? 'positions' : S.prevTab);
}

// ── DASHBOARD ──────────────────────────────────────────────
function renderDashboard() {
  const open   = S.positions.filter(p => p.status === 'open');
  const closed = S.positions.filter(p => p.status !== 'open');
  const totalInvested  = open.reduce((s, p) => s + invested(p), 0);
  const totalUnreal    = open.reduce((s, p) => s + unrealizedPnL(p), 0);
  const totalReal      = closed.reduce((s, p) => s + (realizedPnL(p) ?? 0), 0);
  const winners        = closed.filter(p => (realizedPnL(p) ?? 0) >= 0).length;
  const winRate        = closed.length ? (winners / closed.length) * 100 : 0;

  document.getElementById('dash-subtitle').textContent =
    `${open.length} open · ${closed.length} closed · ${S.positions.length} total`;

  // Stats
  document.getElementById('stats-grid').innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Total Invested</div>
      <div class="stat-value">${fmt(totalInvested, 0)}</div>
      <div class="stat-sub">${open.length} open positions</div>
    </div>
    <div class="stat-card ${totalUnreal >= 0 ? 'gain' : 'loss'}">
      <div class="stat-label">Unrealised P&amp;L</div>
      <div class="stat-value">${totalUnreal >= 0 ? '+' : ''}${fmt(totalUnreal, 0)}</div>
      <div class="stat-sub ${signClass(totalUnreal)}">${fmtPct(totalInvested ? (totalUnreal / totalInvested) * 100 : 0)} of invested</div>
    </div>
    <div class="stat-card ${totalReal >= 0 ? 'gain' : 'loss'}">
      <div class="stat-label">Realised P&amp;L</div>
      <div class="stat-value">${totalReal >= 0 ? '+' : ''}${fmt(totalReal, 0)}</div>
      <div class="stat-sub">${closed.length} closed trades</div>
    </div>
    <div class="stat-card primary">
      <div class="stat-label">Win Rate</div>
      <div class="stat-value">${winRate.toFixed(0)}%</div>
      <div class="stat-sub">${winners}W / ${closed.length - winners}L</div>
    </div>
  `;

  // Table
  const tbody = document.getElementById('dash-table-body');
  if (!open.length) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;color:var(--faint);padding:28px">No open positions</td></tr>`;
  } else {
    tbody.innerHTML = open.map(p => {
      const pl = unrealizedPnL(p);
      const rrVal = rr(p);
      return `<tr onclick="showDetail('${p.id}')" style="cursor:pointer">
        <td><span class="td-symbol td-link">${p.symbol}</span><br><span class="td-muted" style="font-size:11px">${p.exchange}</span></td>
        <td class="td-mono">${p.qty}</td>
        <td class="td-mono">${fmt(p.entryPrice)}</td>
        <td class="td-mono">${fmt(p.ltp)}</td>
        <td class="td-mono" style="color:var(--loss)">${fmt(p.stopLoss)}</td>
        <td class="td-mono" style="color:var(--gain)">${p.target ? fmt(p.target) : '—'}</td>
        <td class="td-mono">${fmt(invested(p), 0)}</td>
        <td class="${pl >= 0 ? 'td-gain' : 'td-loss'}">${pl >= 0 ? '+' : ''}${fmt(pl)}<br>
          <span style="font-size:11px">${fmtPct(pnlPct(p))}</span></td>
        <td class="td-mono">${fmtRR(rrVal)}</td>
        <td>${positionStatusLabel(p)}</td>
      </tr>`;
    }).join('');
  }

  // PnL label
  document.getElementById('pnl-chart-label').textContent =
    `Total: ${totalReal >= 0 ? '+' : ''}₹${Math.abs(totalReal + totalUnreal).toLocaleString('en-IN', {maximumFractionDigits: 0})}`;

  renderCharts();
}

function chartColors() {
  const dark = S.theme === 'dark';
  return {
    gridColor:   dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
    labelColor:  dark ? '#6e7681' : '#94a3b8',
    textColor:   dark ? '#e6edf3' : '#0f172a',
    primaryRgb:  dark ? '45,212,191' : '15,118,110',
    gainRgb:     dark ? '63,185,80'  : '5,150,105',
    lossRgb:     dark ? '248,81,73'  : '225,29,72',
  };
}

function renderCharts() {
  const cc = chartColors();
  const open = S.positions.filter(p => p.status === 'open');
  const closed = S.positions.filter(p => p.status !== 'open').sort(
    (a, b) => new Date(a.exitDate) - new Date(b.exitDate));

  // Destroy old charts
  Object.values(S.charts).forEach(c => c.destroy());
  S.charts = {};

  // P&L Chart — cumulative realized + unrealized
  const pnlPoints = [];
  let cumulative = 0;
  const allDated = [...S.positions]
    .filter(p => p.entryDate)
    .sort((a, b) => new Date(a.entryDate) - new Date(b.entryDate));
  const allDates = [...new Set(allDated.map(p => p.entryDate))];
  allDates.forEach(d => {
    const dayPnL = S.positions
      .filter(p => p.entryDate <= d)
      .reduce((s, p) => s + pnl(p), 0);
    pnlPoints.push({ x: d, y: Math.round(dayPnL) });
  });

  const pnlValues = pnlPoints.map(p => p.y);
  const lastPnl = pnlValues[pnlValues.length - 1] ?? 0;
  const lineColor = lastPnl >= 0
    ? `rgba(${cc.gainRgb},1)` : `rgba(${cc.lossRgb},1)`;
  const fillColor = lastPnl >= 0
    ? `rgba(${cc.gainRgb},0.12)` : `rgba(${cc.lossRgb},0.12)`;

  const ctxPnl = document.getElementById('chart-pnl').getContext('2d');
  S.charts.pnl = new Chart(ctxPnl, {
    type: 'line',
    data: {
      labels: pnlPoints.map(p => p.x),
      datasets: [{
        label: 'P&L',
        data: pnlValues,
        borderColor: lineColor,
        backgroundColor: fillColor,
        borderWidth: 2,
        pointRadius: 4,
        pointBackgroundColor: lineColor,
        tension: 0.35,
        fill: true,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => '  P&L: ₹' + ctx.raw.toLocaleString('en-IN'),
          },
        },
      },
      scales: {
        x: {
          grid: { color: cc.gridColor },
          ticks: { color: cc.labelColor, maxTicksLimit: 6, font: { family: "'JetBrains Mono', monospace", size: 11 } },
        },
        y: {
          grid: { color: cc.gridColor },
          ticks: {
            color: cc.labelColor,
            font: { family: "'JetBrains Mono', monospace", size: 11 },
            callback: v => '₹' + v.toLocaleString('en-IN'),
          },
        },
      },
    },
  });

  // Allocation Chart — open positions grouped by sector
  const sectorMap = {};
  open.forEach(p => {
    const sec = (p.sector && p.sector.trim()) ? p.sector : 'Other';
    sectorMap[sec] = (sectorMap[sec] || 0) + invested(p);
  });
  const allocData = Object.entries(sectorMap)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  const palette = [
    `rgba(${cc.primaryRgb},0.88)`,
    `rgba(${cc.gainRgb},0.80)`,
    '#a78bfa',
    '#f59e0b',
    `rgba(${cc.lossRgb},0.70)`,
    '#38bdf8',
    '#fb923c',
    '#34d399',
    '#e879f9',
    '#94a3b8',
  ];

  const ctxAlloc = document.getElementById('chart-alloc').getContext('2d');
  if (!allocData.length) {
    ctxAlloc.fillStyle = cc.labelColor;
    ctxAlloc.textAlign = 'center';
    ctxAlloc.fillText('No open positions', ctxAlloc.canvas.width / 2, 100);
  } else {
    const total = allocData.reduce((s, d) => s + d.value, 0);
    S.charts.alloc = new Chart(ctxAlloc, {
      type: 'doughnut',
      data: {
        labels: allocData.map(d => d.label),
        datasets: [{
          data: allocData.map(d => d.value),
          backgroundColor: allocData.map((_, i) => palette[i % palette.length]),
          borderWidth: 2,
          borderColor: S.theme === 'dark' ? '#161b22' : '#ffffff',
          hoverOffset: 6,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: cc.labelColor,
              font: { family: "'Inter', sans-serif", size: 11 },
              padding: 8,
              boxWidth: 10,
              boxHeight: 10,
            },
          },
          tooltip: {
            callbacks: {
              label: ctx => {
                const pct = ((ctx.raw / total) * 100).toFixed(1);
                return ` ${ctx.label}: ₹${ctx.raw.toLocaleString('en-IN', {maximumFractionDigits: 0})} (${pct}%)`;
              },
            },
          },
        },
      },
    });
  }
}

// ── POSITIONS PAGE ─────────────────────────────────────────
function setView(v) {
  S.view = v;
  document.getElementById('btn-list-view').classList.toggle('active', v === 'list');
  document.getElementById('btn-card-view').classList.toggle('active', v === 'card');
  renderPositions();
}
function setFilter(f) {
  S.filter = f;
  document.querySelectorAll('.filter-tab').forEach(el =>
    el.classList.toggle('active', el.dataset.filter === f));
  renderPositions();
}

function renderPositions() {
  const query = (document.getElementById('pos-search')?.value || '').toLowerCase();
  let list = S.positions.filter(p => {
    if (S.filter === 'open'   && p.status !== 'open') return false;
    if (S.filter === 'closed' && p.status === 'open') return false;
    if (query && !p.symbol.toLowerCase().includes(query) && !(p.name||'').toLowerCase().includes(query)) return false;
    return true;
  });

  document.getElementById('pos-subtitle').textContent =
    `${list.length} position${list.length !== 1 ? 's' : ''} · ${S.positions.filter(p => p.status === 'open').length} open`;

  const listEl = document.getElementById('positions-list-view');
  const cardEl = document.getElementById('positions-card-view');
  listEl.classList.toggle('hidden', S.view !== 'list');
  cardEl.classList.toggle('hidden', S.view !== 'card');

  if (!list.length) {
    const emptyHtml = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
        <h3>No positions found</h3>
        <p>Try a different filter or <span class="td-link" onclick="switchTab('add-position')">add a new position</span>.</p>
      </div>`;
    listEl.innerHTML = emptyHtml;
    cardEl.innerHTML = emptyHtml;
    return;
  }

  if (S.view === 'list') {
    listEl.innerHTML = `
      <div class="table-card">
        <div class="table-scroll">
          <table>
            <thead><tr>
              <th>Symbol</th><th>Qty</th><th>Entry</th><th>LTP</th>
              <th>SL</th><th>Target</th><th>Invested</th>
              <th>P&amp;L</th><th>R:R</th><th>Date</th><th>Status</th>
            </tr></thead>
            <tbody>
              ${list.map(p => {
                const pl = pnl(p);
                const rrV = rr(p);
                const d = p.status !== 'open' ? (p.exitDate || p.entryDate) : p.entryDate;
                return `<tr onclick="showDetail('${p.id}')" style="cursor:pointer">
                  <td><span class="td-symbol">${p.symbol}</span><br>
                      <span style="font-size:11px;color:var(--faint)">${p.exchange} · ${p.sector||''}</span></td>
                  <td class="td-mono">${p.qty}</td>
                  <td class="td-mono">${fmt(p.entryPrice)}</td>
                  <td class="td-mono">${fmt(p.ltp)}</td>
                  <td class="td-mono" style="color:var(--loss)">${fmt(p.stopLoss)}</td>
                  <td class="td-mono" style="color:var(--gain)">${p.target ? fmt(p.target) : '—'}</td>
                  <td class="td-mono">${fmt(invested(p), 0)}</td>
                  <td class="${pl >= 0 ? 'td-gain' : 'td-loss'}">
                    ${pl >= 0 ? '+' : ''}${fmt(pl)}<br>
                    <span style="font-size:11px">${fmtPct(pnlPct(p))}</span>
                  </td>
                  <td class="td-mono">${fmtRR(rrV)}</td>
                  <td class="td-muted" style="font-size:12px">${d || '—'}</td>
                  <td>${positionStatusLabel(p)}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  } else {
    cardEl.innerHTML = list.map(p => {
      const pl = pnl(p);
      const rrV = rr(p);
      const pnlColor = pl >= 0 ? 'var(--gain)' : 'var(--loss)';
      const barW = Math.min(Math.abs(pnlPct(p)) * 4, 100);
      return `
        <div class="pos-card" onclick="showDetail('${p.id}')">
          <div class="pos-card-top">
            <div>
              <div class="pos-symbol">${p.symbol}</div>
              <div class="pos-name">${p.name || ''} · ${p.exchange}</div>
            </div>
            ${positionStatusLabel(p)}
          </div>
          <div class="pos-metrics">
            <div>
              <div class="pos-metric-label">Entry</div>
              <div class="pos-metric-value">${fmt(p.entryPrice)}</div>
            </div>
            <div>
              <div class="pos-metric-label">LTP</div>
              <div class="pos-metric-value">${fmt(p.ltp)}</div>
            </div>
            <div>
              <div class="pos-metric-label">P&amp;L</div>
              <div class="pos-metric-value" style="color:${pnlColor}">${pl >= 0 ? '+' : ''}${fmt(pl)}</div>
            </div>
            <div>
              <div class="pos-metric-label">R:R</div>
              <div class="pos-metric-value">${fmtRR(rrV)}</div>
            </div>
            <div>
              <div class="pos-metric-label">Qty</div>
              <div class="pos-metric-value">${p.qty}</div>
            </div>
            <div>
              <div class="pos-metric-label">Invested</div>
              <div class="pos-metric-value">${fmt(invested(p), 0)}</div>
            </div>
          </div>
          <div class="pos-pnl-bar">
            <div class="pos-pnl-bar-fill" style="width:${barW}%;background:${pnlColor}"></div>
          </div>
        </div>`;
    }).join('');
  }
}

// ── ADD POSITION FORM ───────────────────────────────────────
function initAddPositionForm() {
  // Set today's date
  const today = new Date().toISOString().split('T')[0];
  const dateEl = document.getElementById('ap-date');
  if (!dateEl.value) dateEl.value = today;
}

function updatePreview() {
  const qty    = parseFloat(document.getElementById('ap-qty').value) || 0;
  const entry  = parseFloat(document.getElementById('ap-entry').value) || 0;
  const sl     = parseFloat(document.getElementById('ap-sl').value) || 0;
  const target = parseFloat(document.getElementById('ap-target').value) || 0;
  const ltpRaw = parseFloat(document.getElementById('ap-ltp').value);
  const ltp    = isNaN(ltpRaw) ? entry : ltpRaw;

  const el = document.getElementById('preview-content');
  if (!qty || !entry || !sl) {
    el.innerHTML = `<div style="color:var(--faint);font-size:13px;text-align:center;padding:32px 0">Fill in qty, entry & stop loss to preview</div>`;
    return;
  }

  const riskAmt   = Math.abs(entry - sl) * qty;
  const rewardAmt = target ? Math.abs(target - entry) * qty : null;
  const rrV       = rewardAmt ? rewardAmt / riskAmt : null;
  const invested  = entry * qty;
  const riskPct   = (riskAmt / invested) * 100;
  const currentPnL = (ltp - entry) * qty;
  const breakeven = entry + (riskAmt / qty) * 0.05; // 5% buffer

  let rrClass = 'rr-ok', rrLabel = 'Fair';
  if (rrV !== null) {
    if (rrV >= 2)      { rrClass = 'rr-good'; rrLabel = 'Good'; }
    else if (rrV < 1.5){ rrClass = 'rr-bad';  rrLabel = 'Poor'; }
  }

  const rows = [
    { k: 'Capital Invested', v: fmt(invested), cls: '' },
    { k: 'Risk per Trade',   v: fmt(riskAmt),  cls: 'loss' },
    { k: 'Risk %',           v: fmtPct(riskPct), cls: riskPct > 3 ? 'warn' : '' },
    { k: 'Potential Reward', v: rewardAmt ? fmt(rewardAmt) : '—', cls: 'gain' },
    { k: 'Current P&L',     v: currentPnL >= 0 ? '+' + fmt(currentPnL) : fmt(currentPnL), cls: currentPnL >= 0 ? 'gain' : 'loss' },
    { k: 'Per Share Risk',   v: fmt(Math.abs(entry - sl)), cls: '' },
    { k: 'Per Share Reward', v: target ? fmt(Math.abs(target - entry)) : '—', cls: '' },
  ];

  el.innerHTML = rows.map(r => `
    <div class="preview-row">
      <span class="preview-key">${r.k}</span>
      <span class="preview-val ${r.cls}">${r.v}</span>
    </div>`).join('') + (rrV !== null ? `
    <div class="preview-rr ${rrClass}">
      <div class="preview-rr-label">Risk : Reward — ${rrLabel}</div>
      <div class="preview-rr-value">${fmtRR(rrV)}</div>
    </div>` : '');
}

function submitAddPosition() {
  const symbol = document.getElementById('ap-symbol').value.trim().toUpperCase();
  const qty    = parseFloat(document.getElementById('ap-qty').value);
  const entry  = parseFloat(document.getElementById('ap-entry').value);
  const sl     = parseFloat(document.getElementById('ap-sl').value);

  if (!symbol) return toast('Enter a stock symbol', 'warn');
  if (!qty || qty < 1) return toast('Enter a valid quantity', 'warn');
  if (!entry || entry <= 0) return toast('Enter a valid entry price', 'warn');
  if (!sl || sl <= 0) return toast('Enter a stop loss price', 'warn');

  const ltpRaw = parseFloat(document.getElementById('ap-ltp').value);
  const target = parseFloat(document.getElementById('ap-target').value) || null;

  const pos = {
    id:         'pos_' + Date.now(),
    symbol,
    exchange:   document.getElementById('ap-exchange').value,
    name:       document.getElementById('ap-name').value.trim(),
    sector:     document.getElementById('ap-sector').value,
    qty,
    entryPrice: entry,
    stopLoss:   sl,
    target:     target || null,
    ltp:        isNaN(ltpRaw) ? entry : ltpRaw,
    status:     'open',
    entryDate:  document.getElementById('ap-date').value,
    exitDate:   null,
    exitPrice:  null,
    notes:      document.getElementById('ap-notes').value.trim(),
  };

  S.positions.unshift(pos);
  save();
  toast(`${symbol} added successfully`, 'success');

  // Reset form
  ['ap-symbol','ap-name','ap-qty','ap-entry','ap-sl','ap-target','ap-ltp','ap-notes'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('ap-sector').value = '';
  document.getElementById('preview-content').innerHTML =
    `<div style="color:var(--faint);font-size:13px;text-align:center;padding:32px 0">Fill in the form to see a live preview</div>`;

  switchTab('positions');
}

// ── AUTOCOMPLETE ────────────────────────────────────────────
function onSymbolInput() {
  const q = document.getElementById('ap-symbol').value.trim().toUpperCase();
  const list = document.getElementById('autocomplete-list');
  S.acHighlight = -1;

  if (!q || q.length < 1) {
    list.classList.remove('open');
    return;
  }

  const matches = NSE_STOCKS.filter(stock =>
    stock.s.startsWith(q) || stock.s.includes(q) || stock.n.toLowerCase().includes(q.toLowerCase())
  ).slice(0, 10);

  if (!matches.length) { list.classList.remove('open'); return; }

  list.innerHTML = matches.map((stock, i) => `
    <div class="autocomplete-item" data-idx="${i}" onmousedown="selectStock('${stock.s}','${stock.n.replace(/'/g,"\\'")}')">
      <span class="autocomplete-symbol">${stock.s}</span>
      <span class="autocomplete-name">${stock.n}</span>
    </div>`).join('');
  list.classList.add('open');
}

function onSymbolKeydown(e) {
  const list = document.getElementById('autocomplete-list');
  const items = list.querySelectorAll('.autocomplete-item');
  if (!items.length) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    S.acHighlight = Math.min(S.acHighlight + 1, items.length - 1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    S.acHighlight = Math.max(S.acHighlight - 1, 0);
  } else if (e.key === 'Enter' && S.acHighlight >= 0) {
    e.preventDefault();
    items[S.acHighlight].dispatchEvent(new MouseEvent('mousedown'));
    return;
  } else if (e.key === 'Escape') {
    list.classList.remove('open');
    return;
  }
  items.forEach((el, i) => el.classList.toggle('highlighted', i === S.acHighlight));
}

function selectStock(symbol, name) {
  document.getElementById('ap-symbol').value = symbol;
  document.getElementById('ap-name').value = name;
  document.getElementById('autocomplete-list').classList.remove('open');
  S.acHighlight = -1;
}

document.addEventListener('click', e => {
  if (!e.target.closest('.autocomplete-wrap')) {
    document.getElementById('autocomplete-list')?.classList.remove('open');
  }
});

// ── POSITION DETAIL ─────────────────────────────────────────
function renderDetail(id) {
  const p = S.positions.find(x => x.id === id);
  if (!p) return;
  S.editingId = id;

  const pl       = pnl(p);
  const rrV      = rr(p);
  const riskAmt  = risk(p);
  const rewardAmt= reward(p);

  document.getElementById('detail-content').innerHTML = `
    <div class="detail-header">
      <div>
        <div style="display:flex;align-items:center;gap:12px">
          <div class="detail-symbol">${p.symbol}</div>
          ${positionStatusLabel(p)}
        </div>
        <div class="detail-name">${p.name || ''} · ${p.exchange} · ${p.sector || ''}</div>
        ${p.status !== 'open' ? `
          <div style="margin-top:6px;font-size:12.5px;color:var(--muted)">
            Closed on ${p.exitDate || '—'} at ${fmt(p.exitPrice)}
          </div>` : ''}
      </div>
      <div class="detail-actions">
        ${p.status === 'open' ? `
          <div class="ltp-update">
            <input type="number" id="ltp-input" value="${p.ltp}" step="0.05"
              onkeydown="if(event.key==='Enter') updateLTP('${id}')">
            <button class="ltp-update-btn" onclick="updateLTP('${id}')">Update LTP</button>
          </div>
          <button class="btn-secondary" onclick="openCloseModal()">Close Position</button>` : ''}
        <button class="btn-secondary" onclick="openEditModal('${id}')">Edit</button>
        <button class="btn-danger" onclick="deletePosition('${id}')">Delete</button>
      </div>
    </div>

    ${renderPriceBar(p)}

    <div class="detail-grid">

      <div class="detail-section">
        <div class="detail-section-title">Position</div>
        <div class="detail-row">
          <span class="dr-label">Quantity</span>
          <span class="dr-value">${p.qty} shares</span>
        </div>
        <div class="detail-row">
          <span class="dr-label">Capital Invested</span>
          <span class="dr-value">${fmt(invested(p), 0)}</span>
        </div>
        <div class="detail-row">
          <span class="dr-label">Entry Date</span>
          <span class="dr-value">${p.entryDate || '—'}</span>
        </div>
        ${p.status !== 'open' ? `
        <div class="detail-row">
          <span class="dr-label">Exit Date</span>
          <span class="dr-value">${p.exitDate || '—'}</span>
        </div>
        <div class="detail-row">
          <span class="dr-label">Exit Price</span>
          <span class="dr-value">${fmt(p.exitPrice)}</span>
        </div>` : ''}
      </div>

      <div class="detail-section">
        <div class="detail-section-title">Levels</div>
        <div class="detail-row">
          <span class="dr-label">Entry Price</span>
          <span class="dr-value">${fmt(p.entryPrice)}</span>
        </div>
        <div class="detail-row">
          <span class="dr-label">Stop Loss</span>
          <span class="dr-value" style="color:var(--loss)">${fmt(p.stopLoss)}</span>
        </div>
        <div class="detail-row">
          <span class="dr-label">Target</span>
          <span class="dr-value" style="color:var(--gain)">${p.target ? fmt(p.target) : '—'}</span>
        </div>
        <div class="detail-row">
          <span class="dr-label">LTP</span>
          <span class="dr-value">${fmt(p.ltp)}</span>
        </div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">Performance</div>
        <div class="detail-row">
          <span class="dr-label">${p.status === 'open' ? 'Unrealised' : 'Realised'} P&amp;L</span>
          <span class="dr-value ${pl >= 0 ? 'gain' : 'loss'}">${pl >= 0 ? '+' : ''}${fmt(pl)}</span>
        </div>
        <div class="detail-row">
          <span class="dr-label">P&amp;L %</span>
          <span class="dr-value ${pl >= 0 ? 'gain' : 'loss'}">${fmtPct(pnlPct(p))}</span>
        </div>
        <div class="detail-row">
          <span class="dr-label">Risk</span>
          <span class="dr-value">${fmt(riskAmt)}</span>
        </div>
        <div class="detail-row">
          <span class="dr-label">Reward</span>
          <span class="dr-value">${rewardAmt ? fmt(rewardAmt) : '—'}</span>
        </div>
        <div class="detail-row">
          <span class="dr-label">Risk : Reward</span>
          <span class="dr-value">${fmtRR(rrV)}</span>
        </div>
      </div>

    </div>

    ${p.notes ? `
    <div class="detail-notes">
      <div class="detail-notes-label">Trade Notes</div>
      <div class="detail-notes-text">${p.notes}</div>
    </div>` : ''}
  `;
}

function renderPriceBar(p) {
  const { entryPrice, stopLoss, ltp } = p;
  const target = p.target || entryPrice + (entryPrice - stopLoss) * 2.5;

  const minP = Math.min(stopLoss, ltp, entryPrice) * 0.994;
  const maxP = Math.max(target, ltp, entryPrice) * 1.006;
  const range = maxP - minP || 1;

  const pct = v => ((v - minP) / range * 100).toFixed(2);
  const slPct     = pct(stopLoss);
  const entryPct  = pct(entryPrice);
  const ltpPct    = pct(ltp);
  const targetPct = pct(target);

  const riskW   = Math.max(0, entryPct - slPct);
  const rewardW = Math.max(0, targetPct - entryPct);

  // Current fill: from entry to ltp
  const currentLeft  = Math.min(entryPct, ltpPct);
  const currentW     = Math.abs(ltpPct - entryPct);
  const currentColor = ltp >= entryPrice ? 'var(--gain)' : 'var(--loss)';

  return `
    <div class="price-range-section">
      <div class="price-range-title">Price Range · SL — Entry — LTP — Target</div>
      <div class="price-bar-track">
        <div class="price-bar-risk"    style="left:${slPct}%;width:${riskW}%"></div>
        <div class="price-bar-reward"  style="left:${entryPct}%;width:${rewardW}%"></div>
        <div class="price-bar-current" style="left:${currentLeft}%;width:${currentW}%;background:${currentColor}"></div>
        <div class="price-bar-marker m-sl"     style="left:${slPct}%"     title="Stop Loss: ${fmt(stopLoss)}"></div>
        <div class="price-bar-marker m-entry"  style="left:${entryPct}%"  title="Entry: ${fmt(entryPrice)}"></div>
        <div class="price-bar-marker m-ltp"    style="left:${ltpPct}%"    title="LTP: ${fmt(ltp)}"></div>
        <div class="price-bar-marker m-target" style="left:${targetPct}%" title="Target: ${fmt(target)}"></div>
      </div>
      <div style="position:relative;height:28px;margin-top:8px">
        <div class="price-bar-label sl-lbl"     style="left:${slPct}%">SL<br>${fmt(stopLoss)}</div>
        <div class="price-bar-label entry-lbl"  style="left:${entryPct}%">Entry<br>${fmt(entryPrice)}</div>
        <div class="price-bar-label target-lbl" style="left:${targetPct}%">Target<br>${p.target ? fmt(p.target) : 'Est.'}</div>
      </div>
      <div class="price-bar-fixed-row">
        <div class="price-bar-fixed-item">
          <span class="price-bar-fixed-label">LTP</span>
          <span class="price-bar-fixed-value" style="color:${ltp >= entryPrice ? 'var(--gain)' : 'var(--loss)'}">${fmt(ltp)}</span>
        </div>
      </div>
    </div>`;
}

// ── LTP UPDATE ─────────────────────────────────────────────
function updateLTP(id) {
  const val = parseFloat(document.getElementById('ltp-input')?.value);
  if (isNaN(val) || val <= 0) return toast('Enter a valid price', 'warn');
  const p = S.positions.find(x => x.id === id);
  if (!p) return;
  p.ltp = val;
  save();
  toast(`LTP updated to ₹${val}`, 'success');
  renderDetail(id);
}

// ── CLOSE POSITION ─────────────────────────────────────────
function openCloseModal() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('close-exit-date').value = today;
  const p = S.positions.find(x => x.id === S.editingId);
  if (p) document.getElementById('close-exit-price').value = p.ltp;
  document.getElementById('close-modal-desc').textContent =
    `Close ${p?.symbol} position and lock in the P&L.`;
  document.getElementById('close-modal').classList.remove('hidden');
}
function closeModal() {
  document.getElementById('close-modal').classList.add('hidden');
}
function confirmClosePosition() {
  const exitPrice = parseFloat(document.getElementById('close-exit-price').value);
  const exitDate  = document.getElementById('close-exit-date').value;
  if (isNaN(exitPrice) || exitPrice <= 0) return toast('Enter a valid exit price', 'warn');
  const p = S.positions.find(x => x.id === S.editingId);
  if (!p) return;
  p.status    = 'closed';
  p.exitPrice = exitPrice;
  p.exitDate  = exitDate;
  p.ltp       = exitPrice;
  save();
  closeModal();
  const pl = realizedPnL(p);
  toast(`${p.symbol} closed · P&L: ${pl >= 0 ? '+' : ''}₹${Math.abs(pl).toLocaleString('en-IN', {maximumFractionDigits: 0})}`, pl >= 0 ? 'success' : 'info');
  renderDetail(S.editingId);
}

// ── DELETE ─────────────────────────────────────────────────
function deletePosition(id) {
  const p = S.positions.find(x => x.id === id);
  if (!p) return;
  S.editingId = id;

  const pl = pnl(p);
  const plStr = pl >= 0
    ? `+₹${Math.abs(pl).toLocaleString('en-IN', {maximumFractionDigits: 0})}`
    : `−₹${Math.abs(pl).toLocaleString('en-IN', {maximumFractionDigits: 0})}`;
  const plColor = pl >= 0 ? 'var(--gain)' : 'var(--loss)';

  document.getElementById('delete-modal-desc').textContent =
    `This position will be permanently removed. This action cannot be undone.`;

  document.getElementById('delete-modal-info').innerHTML = `
    <div>
      <div class="dmi-symbol">${p.symbol}</div>
      <div class="dmi-meta">${p.exchange} · ${p.sector || 'Equity'} · ${p.qty} shares</div>
    </div>
    <div style="margin-left:auto;text-align:right">
      <div style="font-family:var(--font-m);font-size:14px;font-weight:600;color:${plColor}">${plStr}</div>
      <div style="font-size:11.5px;color:var(--faint);margin-top:2px">${p.status === 'open' ? 'Unrealised P&L' : 'Realised P&L'}</div>
    </div>`;

  document.getElementById('delete-modal').classList.remove('hidden');
}
function closeDeleteModal() {
  document.getElementById('delete-modal').classList.add('hidden');
}
function confirmDeletePosition() {
  const p = S.positions.find(x => x.id === S.editingId);
  if (!p) return;
  S.positions = S.positions.filter(x => x.id !== S.editingId);
  save();
  closeDeleteModal();
  toast(`${p.symbol} deleted`, 'info');
  switchTab('positions');
}

// ── EDIT POSITION ──────────────────────────────────────────
function openEditModal(id) {
  const p = S.positions.find(x => x.id === id);
  if (!p) return;
  S.editingId = id;

  // Populate fields
  const f = (sel, val) => { const el = document.getElementById(sel); if (el) el.value = val ?? ''; };
  f('em-symbol',   p.symbol);
  f('em-exchange', p.exchange);
  f('em-name',     p.name);
  f('em-sector',   p.sector);
  f('em-qty',      p.qty);
  f('em-entry',    p.entryPrice);
  f('em-ltp',      p.ltp);
  f('em-sl',       p.stopLoss);
  f('em-target',   p.target ?? '');
  f('em-date',     p.entryDate);
  f('em-notes',    p.notes);

  // Show/hide exit fields
  const exitRow = document.getElementById('em-exit-row');
  if (p.status !== 'open') {
    exitRow.classList.remove('hidden');
    f('em-exit-price', p.exitPrice ?? '');
    f('em-exit-date',  p.exitDate  ?? '');
  } else {
    exitRow.classList.add('hidden');
  }

  document.getElementById('edit-modal').classList.remove('hidden');
}

function closeEditModal() {
  document.getElementById('edit-modal').classList.add('hidden');
}

function submitEditPosition() {
  const p = S.positions.find(x => x.id === S.editingId);
  if (!p) return;

  const get = id => document.getElementById(id)?.value.trim();
  const num = id => { const v = parseFloat(document.getElementById(id)?.value); return isNaN(v) ? null : v; };

  const symbol = get('em-symbol')?.toUpperCase();
  const qty    = num('em-qty');
  const entry  = num('em-entry');
  const sl     = num('em-sl');

  if (!symbol)        return toast('Symbol is required', 'warn');
  if (!qty || qty < 1) return toast('Enter a valid quantity', 'warn');
  if (!entry)         return toast('Enter a valid entry price', 'warn');
  if (!sl)            return toast('Enter a stop loss', 'warn');

  p.symbol     = symbol;
  p.exchange   = get('em-exchange') || 'NSE';
  p.name       = get('em-name');
  p.sector     = get('em-sector');
  p.qty        = qty;
  p.entryPrice = entry;
  p.ltp        = num('em-ltp') ?? entry;
  p.stopLoss   = sl;
  p.target     = num('em-target');
  p.entryDate  = get('em-date');
  p.notes      = get('em-notes');

  if (p.status !== 'open') {
    p.exitPrice = num('em-exit-price');
    p.exitDate  = get('em-exit-date');
  }

  save();
  closeEditModal();
  toast(`${p.symbol} updated`, 'success');
  renderDetail(S.editingId);
}

// ── IMPORT / EXPORT ─────────────────────────────────────────
function exportJSON() {
  const now    = new Date();
  const stamp  = now.toISOString().slice(0,19).replace('T','_').replace(/:/g,'-');
  const fname  = `SwingSpace_${stamp}.json`;
  const blob   = new Blob([JSON.stringify({
    exportedAt: now.toISOString(),
    version: 2,
    positions: S.positions,
  }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fname;
  a.click();
  URL.revokeObjectURL(a.href);
  toast(`Exported ${S.positions.length} positions`, 'success');
}

function importJSON(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      const incoming = Array.isArray(data) ? data : (data.positions || []);
      if (!incoming.length) return toast('No positions found in file', 'warn');
      const merged = [...S.positions];
      let added = 0;
      incoming.forEach(p => {
        if (!merged.find(x => x.id === p.id)) { merged.push(p); added++; }
      });
      S.positions = merged;
      save();
      toast(`Imported ${added} new positions`, 'success');
      if (S.activeTab === 'dashboard') renderDashboard();
      if (S.activeTab === 'positions') renderPositions();
    } catch {
      toast('Invalid JSON file', 'warn');
    }
  };
  reader.readAsText(file);
  event.target.value = ''; // reset so same file can be imported again
}

// ── TOAST ──────────────────────────────────────────────────
function toast(msg, type = 'info') {
  const wrap = document.getElementById('toast-wrap');
  const el   = document.createElement('div');
  el.className = 'toast';
  if (type === 'success') el.style.background = 'var(--gain)';
  if (type === 'warn')    el.style.background = 'var(--warn)';
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

// ── INIT ───────────────────────────────────────────────────
function init() {
  load();

  const savedTheme = localStorage.getItem('swingspace_theme') || 'light';
  applyTheme(savedTheme);

  const today = new Date().toISOString().split('T')[0];
  document.getElementById('ap-date').value = today;

  renderDashboard();

  // Close modals on overlay click
  document.getElementById('edit-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeEditModal();
  });
  document.getElementById('close-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.getElementById('delete-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeDeleteModal();
  });
}

window.addEventListener('DOMContentLoaded', init);
