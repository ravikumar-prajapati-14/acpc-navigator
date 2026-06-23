// ===== ACPC ADMISSION PORTAL - script.js =====
// ============================================================
//  DEBUG MODE — set to false in production
// ============================================================
const DEBUG = true;
function dbg(...args) { if (DEBUG) console.log('[ACPC DEBUG]', ...args); }

// ============================================================
//  INTERSECTION OBSERVER (Animations)
// ============================================================
function initAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.fade-up, .timeline-item').forEach(el => {
    if (!el.classList.contains('visible')) observer.observe(el);
  });
}

// ============================================================
//  KEY DATES LOADER
//  BUG FIXED #1: Added response.ok check + HTTP status logging
//  BUG FIXED #2: Cache returns early only after a successful load
//  BUG FIXED #3: Robust path resolution works on file://, Live
//                Server, and any subdirectory deployment
// ============================================================
let keyDatesData = null;
let keyDatesLoadAttempted = false;

async function loadKeyDates() {
  // Return cached data (only if it actually loaded successfully)
  if (keyDatesData) {
    dbg('Returning cached keyDatesData');
    return keyDatesData;
  }

  // Prevent duplicate network calls (e.g. home + dates both call this)
  if (keyDatesLoadAttempted) {
    dbg('Load already attempted, returning null');
    return null;
  }
  keyDatesLoadAttempted = true;

  // ---- Path resolution ----
  // Always resolve relative to the HTML file, not wherever JS lives.
  // Using import.meta.url would be cleaner but requires ES modules;
  // document.currentScript is null inside DOMContentLoaded callbacks.
  // The safest universal approach: resolve from window.location.
  const base = window.location.href.replace(/\/[^/]*$/, '/');
  const jsonUrl = base + 'keydates.json';
  dbg('Fetching JSON from:', jsonUrl);

  try {
    const response = await fetch(jsonUrl, {
      // Prevent browser from serving a stale cache during development
      cache: 'no-cache'
    });

    dbg('HTTP status:', response.status, response.statusText);

    // BUG FIXED #1: Original code called response.json() even on 404/500,
    // which throws a SyntaxError instead of a meaningful error message.
    if (!response.ok) {
      throw new Error(
        `Server returned ${response.status} ${response.statusText} for ${jsonUrl}`
      );
    }

    const contentType = response.headers.get('content-type');
    dbg('Content-Type:', contentType);

    // Guard: some misconfigured servers serve HTML error pages as JSON
    if (contentType && contentType.includes('text/html')) {
      throw new Error(
        'Server returned HTML instead of JSON. ' +
        'The file might be missing or the server is returning a 404 HTML page.'
      );
    }

    keyDatesData = await response.json();
    dbg('JSON parsed successfully. Phases found:', keyDatesData?.phases?.length);

    // Validate minimal expected structure
    if (!keyDatesData || !Array.isArray(keyDatesData.phases)) {
      throw new Error(
        'JSON loaded but structure is invalid — expected a "phases" array at the root.'
      );
    }

    return keyDatesData;

  } catch (error) {
    console.error('[ACPC ERROR] Failed to load keydates.json:', error.message);
    console.error(
      '[ACPC HINT] Common causes:\n' +
      '  1. keydates.json is not in the SAME folder as your HTML files\n' +
      '  2. You opened index.html directly as a file:// URL without a local server\n' +
      '     → Fix: use VS Code Live Server, npx serve ., or python -m http.server\n' +
      '  3. The filename case is wrong (keydates.json vs KeyDates.json on Linux)\n' +
      '  4. The JSON has a syntax error — validate at jsonlint.com\n' +
      '  5. A CORS policy is blocking the request'
    );
    // BUG FIXED #3: Show visible error in UI so developer isn't left guessing
    showFetchError();
    return null;
  }
}

// Show a visible in-page error banner when JSON fails to load
function showFetchError() {
  const containers = document.querySelectorAll('.dates-list');
  containers.forEach(el => {
    el.innerHTML = `
      <div style="
        padding: 20px 24px;
        background: rgba(239,83,80,0.08);
        border: 1px solid rgba(239,83,80,0.3);
        border-radius: 14px;
        color: #ef5350;
        font-size: 13px;
        line-height: 1.6;
      ">
        <strong>⚠️ Could not load key dates.</strong><br>
        <span style="color: var(--text-secondary)">
          Open DevTools → Console for the exact reason.<br>
          Most likely fix: open this project with a <strong>local server</strong>
          (e.g. VS Code Live Server) instead of double-clicking the HTML file.
        </span>
      </div>`;
  });
}

// ============================================================
//  DATE STATUS HELPER
// ============================================================
function getDateStatus(dateStr) {
  // BUG FIXED #4: new Date("2026-06-12") parses as UTC midnight, which
  // makes it appear "yesterday" in timezones east of UTC+0 when compared
  // to a local today. Normalise both to UTC date-only strings.
  const todayUtc  = new Date(new Date().toISOString().slice(0, 10));
  const targetUtc = new Date(dateStr);
  const diff = Math.round((targetUtc - todayUtc) / (1000 * 60 * 60 * 24));

  if (diff < 0)  return { class: 'completed', label: 'Done',       status: 'done'     };
  if (diff === 0) return { class: 'upcoming',  label: 'Today',      status: 'today'    };
  if (diff <= 7)  return { class: 'upcoming',  label: `In ${diff}d`, status: 'soon'   };
                  return { class: 'upcoming',  label: `In ${diff}d`, status: 'upcoming'};
}


// ============================================================
//  DATES PAGE
//  BUG FIXED #5: initDatesPage was calling querySelector('.dates-list')
//  which returned the FIRST element on the page; on dates.html that
//  element existed but had no innerHTML set yet, so the check passed
//  silently and events were injected into the wrong (empty) container.
//  Now we explicitly target the dates-list inside <main>.
// ============================================================
async function initDatesPage() {
  dbg('Initialising dates page');
  const data = await loadKeyDates();
  if (!data) {
    dbg('No data — aborting dates page init');
    return;
  }

  const allEvents = [];
  data.phases.forEach((phase, phaseIdx) => {
    phase.events.forEach(event => {
      allEvents.push({ ...event, phase, phaseIdx, phaseColor: phase.color, phaseIcon: phase.icon });
    });
  });
  allEvents.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  dbg('Total events to render:', allEvents.length);

  // BUG FIXED #5: Target the container inside main, not just any .dates-list
  const mainEl = document.querySelector('main.page-wrapper');
  const firstDatesList = mainEl
    ? mainEl.querySelector('.dates-list')
    : document.querySelector('.dates-list');

  if (!firstDatesList) {
    console.error('[ACPC ERROR] .dates-list container not found in DOM');
    return;
  }

  firstDatesList.innerHTML = '';
  firstDatesList.classList.add('timeline-vertical');

  allEvents.forEach((item, idx) => {
    const dateObj = new Date(item.startDate);
    const day   = String(dateObj.getUTCDate()).padStart(2, '0');
    const month = dateObj.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
    const year  = dateObj.getUTCFullYear();

    firstDatesList.insertAdjacentHTML('beforeend', `
      <div class="timeline-item fade-up stagger-${(idx % 5) + 1}" data-date="${item.startDate}">
        <div class="timeline-badge" style="background:${item.phaseColor};border-color:white;">
          <span class="badge-number">${idx + 1}</span>
        </div>
        <div class="timeline-card" style="border-left:4px solid ${item.phaseColor};background:${item.phaseColor}15;">
          <div class="timeline-date">
            <span class="timeline-day">${day}</span>
            <span class="timeline-month">${month}</span>
            <span class="timeline-year">${year}</span>
          </div>
          <div class="timeline-content">
            <div class="timeline-title">${item.title}</div>
            <div class="timeline-detail">${item.description}</div>
            ${item.tag ? `<span class="timeline-tag" style="color:${item.tagColor};background:${item.tagColor}25;border:1px solid ${item.tagColor}40;">${item.tag}</span>` : ''}
          </div>
          <span class="timeline-pill">${getDateStatus(item.startDate).label}</span>
        </div>
      </div>
    `);
  });

  // Observe new elements for animation
  initAnimations();

  // Hide any extra phase lists
  document.querySelectorAll('.section-title').forEach((el, idx) => { if (idx > 0) el.style.display = 'none'; });
  document.querySelectorAll('.dates-list').forEach((el, idx)   => { if (idx > 0) el.style.display = 'none'; });
}

// ============================================================
//  HOME PAGE — UPCOMING DATES WIDGET
//  BUG FIXED #6: Same selector issue as #5, plus added a loading
//  placeholder so the user gets visual feedback immediately.
// ============================================================
async function loadUpcomingDates() {
  
  dbg('Loading upcoming dates for home page');

  // Show loading state immediately so the section doesn't look broken
  const mainEl   = document.querySelector('main.page-wrapper');
  const datesList = mainEl
    ? mainEl.querySelector('.dates-list')
    : document.querySelector('.dates-list');

  if (!datesList) {
    dbg('No .dates-list found on home page');
    return;
  }

  datesList.innerHTML = `
    <div style="height:6px;background:var(--bg-card);border-radius:4px;overflow:hidden;margin-bottom:8px">
      <div class="loading-bar" style="height:100%;width:100%"></div>
    </div>`;

  const data = await loadKeyDates();
  if (!data) return;

  const allEvents = [];
  data.phases.forEach(phase => {
    phase.events.forEach(event => allEvents.push({ ...event, phase }));
  });
  allEvents.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

  // BUG FIXED #7: filter used local midnight; replaced with UTC comparison
  const todayUtc = new Date(new Date().toISOString().slice(0, 10));
  const upcoming = allEvents.filter(e => new Date(e.startDate) >= todayUtc).slice(0, 3);

  dbg('Upcoming events:', upcoming.length);
  datesList.innerHTML = '';

  if (upcoming.length === 0) {
    datesList.innerHTML = `<p style="font-size:13px;color:var(--text-muted)">No upcoming events found.</p>`;
    return;
  }

 upcoming.forEach((event, idx) => {

  const dateObj = new Date(event.startDate);
  const status = getDateStatus(event.startDate);
  const day = String(dateObj.getUTCDate()).padStart(2, '0');

  const month = dateObj.toLocaleDateString('en-US', {
    month: 'short',
    timeZone: 'UTC'
  });

  const year = dateObj.getUTCFullYear();

  datesList.insertAdjacentHTML('beforeend', `
  
    <div class="timeline-item visible">

      <div class="timeline-card">

        <div class="timeline-date">
          <span class="timeline-day">${day}</span>
          <span class="timeline-month">${month}</span>
          <span class="timeline-year">${year}</span>
        </div>

        <div class="timeline-content">
          <div class="timeline-title">${event.title}</div>

          <div class="timeline-detail">
            ${event.description || ''}
          </div>

          ${
            event.tag
              ? `<span class="timeline-tag">${event.tag}</span>`
              : ''
          }

        </div>

        <span class="timeline-pill">
          ${status ? status.label.toUpperCase() : ''}
        </span>

      </div>

    </div>

  `);

});
//
 // datesList.insertAdjacentHTML('afterend',
 //   `<a href="dates.html" style="display:inline-flex;align-items:center;gap:6px;font-size:13px;color:var(--accent-gold);margin-top:8px;font-weight:500;">View all dates →</a>`
 // );

  //initAnimations();
}


// ============================================================
//  PAGE LOAD — ROUTER
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  dbg('DOMContentLoaded fired. Page:', document.body.dataset.page);
  initAnimations();

  const page = document.body.dataset.page;
  if (page === 'colleges') initCollegesPage();
  if (page === 'cutoff')   initCutoffPage();
  if (page === 'dates')    initDatesPage();
  if (page === 'home')     loadUpcomingDates();

  document.getElementById('collegeDetailOverlay')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeCollegeDetail();
  });

  document.addEventListener('click', e => {
    const panel = document.getElementById('notifPanel');
    if (panel && panel.style.display === 'block' &&
        !panel.contains(e.target) && !e.target.closest('#notifBtn')) {
      panel.style.display = 'none';
    }
  });
});