/* ===== Cutoff Section Script (FINAL FIXED) ===== */
'use strict';

const $ = (id) => document.getElementById(id);

const els = {
  search: $('collegeSearch'),
  suggest: $('collegeSuggest'),
  round: $('cutoffRound'),
  status: $('cutoffStatus'),
  wrap: $('cutoffTableWrap'),
  name: $('cutoffCollegeName'),
  body: $('cutoffBody'),
  note: $('cutoffNote'),
  clearBtn: $('clearBtn') // add button in HTML
};

const state = {
  colleges: [],
  mock: [],
  r1: [],
  r3: [],
  selectedId: null,
  activeIdx: -1,
};

const NOTE = {
   r1: 'Cutoff Rank as per Round 1, 2026',
  mock: 'Cutoff Rank as per Mock Round, 2026',
  r3: 'Cutoff Rank as per Round 3, 2025',
};

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

function cleanName(n) {
  return String(n || '').replace(/^\*+/, '').trim();
}

function fmtRank(v) {
  if (!v || v === '-') return '-';
  const n = Number(v);
  return isFinite(n) ? n.toLocaleString('en-IN') : '-';
}

async function fetchJson(path) {
  try {
    const r = await fetch(path);
    if (!r.ok) return [];
    return await r.json();
  } catch {
    return [];
  }
}

async function init() {
  const [colleges, mock, r1, r3] = await Promise.all([
    fetchJson('./colleges.json'),
    fetchJson('./cutoff.json'),
    fetchJson('./cutoffR126.json'),
    fetchJson('./cutoffR3.json'),
  ]);

  state.colleges = colleges.map(c => ({ ...c, name: cleanName(c.name) }));
  state.mock = mock.filter(x => x.college_id);
  state.r1 = r1.filter(x => x.college_id);
  state.r3 = r3.filter(x => x.college_id);

  bindEvents();
}

function bindEvents() {
  els.search.addEventListener('input', showSuggestions);
  els.search.addEventListener('focus', showSuggestions);

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.cutoff-search-wrap')) {
      els.suggest.hidden = true;
    }
  });

  els.round.addEventListener('change', () => {
    if (state.selectedId) renderTable();
  });

  if (els.clearBtn) {
    els.clearBtn.addEventListener('click', clearAll);
  }
}

/* ===== SEARCH ===== */
function showSuggestions() {
  const q = els.search.value.toLowerCase().trim();

  let list = state.colleges;
  if (q) {
    list = list.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.short_name || '').toLowerCase().includes(q)
    );
  }

  list = list.slice(0, 140);

  if (!list.length) {
    els.suggest.innerHTML = `<div class="empty">No colleges found</div>`;
    els.suggest.hidden = false;
    return;
  }

  els.suggest.innerHTML = list.map(c => `
    <div class="item" data-id="${c.id}">
      ${esc(c.short_name || c.name)}
      <span>${esc(c.name)}</span>
    </div>
  `).join('');

  els.suggest.hidden = false;

  els.suggest.querySelectorAll('.item').forEach(el => {
    el.addEventListener('click', () => selectCollege(Number(el.dataset.id)));
  });
}

function selectCollege(id) {
  const c = state.colleges.find(x => x.id === id);
  if (!c) return;

  state.selectedId = id;
  els.search.value = c.short_name || c.name;
  els.suggest.hidden = true;

  renderTable();
}

/* ===== TABLE ===== */
function renderTable() {
  const id = state.selectedId;
  const round = els.round.value || 'r1';

let source;

switch (round) {

  case 'r1':
    source = state.r1;
    break;

  case 'mock':
    source = state.mock;
    break;

  case 'r3':
    source = state.r3;
    break;

  default:
    source = state.r1;

}
  const rows = source.filter(r => r.college_id === id);
  const college = state.colleges.find(c => c.id === id);

  if (!rows.length) {
    els.wrap.hidden = true;
    els.status.style.display = 'block';
    els.status.textContent = `No cutoff data available.`;
    return;
  }

  els.status.style.display = 'none';
  els.wrap.hidden = false;

  els.name.textContent = college.name;
  els.note.textContent = NOTE[round];

  const cats = ['TFWS','OPEN','EWS','SEBC','SC','ST'];

  els.body.innerHTML = rows.map(r => `
    <tr>
      <td>${esc(r.branch)}</td>
      ${cats.map(k => `<td>${fmtRank(r[k])}</td>`).join('')}
    </tr>

    
  `).join('');
  const infoBox = document.getElementById("cutoffInfo");

let hasDash = false;
let newBranches = [];

rows.forEach(row => {

  if (
    row.TFWS === "-" ||
    row.OPEN === "-" ||
    row.EWS === "-" ||
    row.SEBC === "-" ||
    row.SC === "-" ||
    row.ST === "-"
  ) {
    hasDash = true;
  }

  if (String(row.NEW).toUpperCase() === "YES") {
    newBranches.push(row.branch);
  }

});

let infoHtml = "";

if (hasDash) {
  infoHtml += `
    <p>
      <strong>Note:</strong>
      A "-" cutoff indicates that seats remained available (vacant) for that category and branch, during the displayed admission round.
    </p>
  `;
}

if (newBranches.length) {
  infoHtml += `
    <p>
      <strong>New Branches Introduced:</strong>
    </p>
    <ul>
      ${newBranches.map(b => `<li>${esc(b)}</li>`).join("")}
    </ul>
  `;
}

if (infoHtml) {
  infoBox.innerHTML = infoHtml;
  infoBox.hidden = false;
} else {
  infoBox.hidden = true;
}
}
/* ===== CLEAR ===== */
function clearAll() {
  state.selectedId = null;

  // clear input
  els.search.value = '';

  // clear table
  els.body.innerHTML = '';

  // hide table
  els.wrap.hidden = true;

  document.getElementById("cutoffInfo").hidden = true;


  // reset status message
  els.status.style.display = 'block';
  els.status.textContent = 'Select a college to view cutoffs.';

  // hide suggestions
  els.suggest.hidden = true;
}
init();
