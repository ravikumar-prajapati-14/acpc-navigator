/* ===== College Detail Page ===== */
'use strict';

const params = new URLSearchParams(window.location.search);
const COLLEGE_ID = Number(params.get('id'));

const els = {
  title: document.getElementById('collegeTitle'),
  tabs: document.querySelectorAll('#detailTabs .tab'),
  panels: {
    info: document.getElementById('panel-info'),
    intake: document.getElementById('panel-intake'),
    cutoff: document.getElementById('panel-cutoff'),
    placement: document.getElementById('panel-placement'),
  },
};

const data = { college: null, intake: [], cutoff: [], placement: null };

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[ch]));
}
function cleanName(n) { return String(n || '').replace(/^\*+/, '').trim(); }

async function load() {
  if (!COLLEGE_ID) {
    els.panels.info.innerHTML = `<div class="empty-state">No college ID provided.</div>`;
    return;
  }
  try {
    console.log('[detail] loading id=', COLLEGE_ID);
    const [colleges, intake, cutoff, placement] = await Promise.all([
      fetch('./colleges.json').then(r => r.json()),
      fetch('./intake.json').then(r => r.json()).catch(() => []),
      fetch('./cutoffR126.json').then(r => r.json()).catch(() => []),
      fetch('./placement.json').then(r => r.json()).catch(() => []),
    ]);
    data.college = colleges.find(c => c.id === COLLEGE_ID);
    if (data.college) data.college.name = cleanName(data.college.name);
    data.intake = intake.filter(i => i.college_id === COLLEGE_ID);
    data.cutoff = cutoff.filter(c => c.college_id === COLLEGE_ID);
    data.placement = placement.find(p => p.college_id === COLLEGE_ID) || null;

    if (!data.college) {
      els.panels.info.innerHTML = `<div class="empty-state">College not found.</div>`;
      return;
    }
    els.title.textContent = data.college.short_name || data.college.name;
    renderInfo();
    renderIntake();
    renderCutoff();
    renderPlacement();
  } catch (err) {
    console.error('[detail] error', err);
    els.panels.info.innerHTML = `<div class="empty-state">Failed to load data. ${err.message}</div>`;
  }
}

function renderInfo() {
  const c = data.college;
  const totalSeats = data.intake.reduce((s, r) => s + (Number(r.intake) || 0), 0);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((c.location || '') + ' ' + (c.district || '') + ' Gujarat')}`;
  els.panels.info.innerHTML = `
  <div class="info-card">
    <div class="info-name">${escapeHtml(c.name)}</div>
    <div class="info-grid">

  <div class="info-item">
    <div class="lbl">TYPE</div>
    <div class="val">${escapeHtml(c.type)}</div>
  </div>

  <div class="info-item">
    <div class="lbl">FEES / YEAR</div>
    <div class="val">${escapeHtml(c.fees || 'N/A')}</div>
  </div>

  <div class="info-item">
    <div class="lbl">DISTRICT</div>
    <div class="val">${escapeHtml(c.district || 'N/A')}</div>
  </div>
    <div class="info-item">
  <div class="lbl">ADDRESS</div>
  <div class="val">
    ${escapeHtml(c.location || 'Address not available')}
  </div>
</div>

<div class="info-item">
  <div class="lbl">PHONE</div>
  <div class="val">
    ${c.phone
      ? `<a href="tel:${escapeHtml(c.phone)}">${escapeHtml(c.phone)}</a>`
      : 'N/A'}
  </div>
</div>

<div class="info-item">
  <div class="lbl">WEBSITE</div>
  <div class="val">
    ${c.website
      ? `<a href="${escapeHtml(ensureHttp(c.website))}" target="_blank" rel="noopener">${escapeHtml(c.website)}</a>`
      : 'N/A'}
  </div>
</div>

<div class="info-item">
  <div class="lbl">EMAIL</div>
  <div class="val">
    ${c.email
      ? `<a href="mailto:${escapeHtml(c.email)}">${escapeHtml(c.email)}</a>`
      : 'N/A'}
  </div>
</div>

<div class="info-item map-item">
  <a class="map-btn" href="${mapsUrl}" target="_blank" rel="noopener">
    📍 Open in Google Maps
  </a>
</div>
    ${totalSeats ? `
      <div class="seats-card">
        <div class="num">${totalSeats}</div>
        <div class="lbl">Total Intake Seats</div>
        ${data.placement && data.placement.link ? `<a href="${escapeHtml(data.placement.link)}" target="_blank" rel="noopener">Open Placement Data</a>` : ''}
      </div>` : ''}
      </div>
  `;
}

function ensureHttp(u) {
  if (!u) return '#';
  return /^https?:\/\//i.test(u) ? u : 'https://' + u;
}


function renderIntake() {
   if (!data.intake.length) {
    els.panels.intake.innerHTML = `<div class="empty-state">No intake data available.</div>`;
    return;
  }

  let totalIntake = 0, totalSQ = 0, totalAIQG = 0, totalAIQJ = 0, totalTFWS=0;

  const rows = data.intake.map(r => {
    const intake = Number(r.intake) || 0;
    const sq = Number(r.SQ) || 0;
    const aiqg = Number(r.AIQG) || 0;
    const aiqj = Number(r.AIQJ) || 0;
    const tfws=Number(r.TFWS) || 0;
    totalIntake += intake;
    totalSQ += sq;
    totalAIQG += aiqg;
    totalAIQJ += aiqj;
    totalTFWS += tfws;
    return `
      <tr>
       <td>${escapeHtml(r.branch)}</td>
        <td>${intake}</td>
        <td>${sq}</td>
         <td>${tfws}</td>
        <td>${aiqg}</td>
        <td>${aiqj}</td>
      </tr>
    `;
  }).join('');

  els.panels.intake.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Branch</th>
          <th>Intake</th>
          <th>SQ</th>
          <th>TFWS</th>
          <th>AIQG</th>
          <th>AIQJ</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        <tr class="total">
          <td>Total</td>
          <td>${totalIntake}</td>
          <td>${totalSQ}</td>
          <td>${totalTFWS}</td>
          <td>${totalAIQG}</td>
          <td>${totalAIQJ}</td>
        </tr>
      </tbody>
    </table>
    <div class="legend">
      <div><strong>SQ</strong> = State Quota (seats filled by ACPC)</div>
      <div><strong>AIQG</strong> = All India Quota based on GUJCET</div>
      <div><strong>AIQJ</strong> = All India Quota based on JEE (Main) Paper-1</div>
      <div>*Intake = Total seats in 2026-27 (provisional)</div>
    </div>
  `;
}

function renderCutoff() {
  if (!data.cutoff.length) {
    els.panels.cutoff.innerHTML =
      `<div class="empty-state">No cutoff data available.</div>`;
    return;
  }

  const rows = data.cutoff.map(r => `
    <tr>
      <td class="branch">${escapeHtml(r.branch)}</td>
      <td>${r.TFWS ?? '-'}</td>
      <td>${r.OPEN ?? '-'}</td>
      <td>${r.EWS ?? '-'}</td>
      <td>${r.SEBC ?? '-'}</td>
      <td>${r.SC ?? '-'}</td>
      <td>${r.ST ?? '-'}</td>
    </tr>
  `).join('');

  const hasDash = data.cutoff.some(r =>
    [r.TFWS, r.OPEN, r.EWS, r.SEBC, r.SC, r.ST]
      .some(v => v === '-' || v == null)
  );

  els.panels.cutoff.innerHTML = `
    <div class="table-card">

      <div class="table-title">
        ${escapeHtml(data.college.name)}
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th class="branch">Branch</th>
            <th>TFW</th>
            <th>OPEN</th>
            <th>EWS</th>
            <th>SEBC</th>
            <th>SC</th>
            <th>ST</th>
          </tr>
        </thead>

        <tbody>
          ${rows}
        </tbody>
      </table>

      <div class="table-note">
        Cutoff Rank as per Round 1, 2026
      </div>

      ${
        hasDash
          ? `
          <div class="note-box">
            <strong>Note:</strong>
            A "-" cutoff indicates that seats remained available
            (vacant) for that category and branch during the
            displayed admission round.
          </div>
          `
          : ''
      }

    </div>
  `;
}

function renderPlacement() {
  const p = data.placement;
  if (p && p.link) {
    els.panels.placement.innerHTML = `
      <div class="placement-wrap">
        <a class="btn" href="${escapeHtml(p.link)}" target="_blank" rel="noopener">View Placement Data ↗</a>
      </div>`;
  } else {
    els.panels.placement.innerHTML = `<div class="placement-wrap"><div class="unavail">Currently unavailable data</div></div>`;
  }
}

function activateTab(which) {
  els.tabs.forEach(t => t.classList.toggle('active', t.getAttribute('data-tab') === which));
  Object.entries(els.panels).forEach(([k, el]) => {
    el.classList.toggle('active', k === which);
  });
}

els.tabs.forEach(tab => {
  tab.addEventListener('click', () => activateTab(tab.getAttribute('data-tab')));
});

// Open tab from URL ?tab=cutoff|intake|placement|info
const initialTab = (params.get('tab') || '').toLowerCase();
if (['info', 'intake', 'cutoff', 'placement'].includes(initialTab)) {
  activateTab(initialTab);
}

load();
