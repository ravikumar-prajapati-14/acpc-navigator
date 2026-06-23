/* ===== Colleges List Page ===== */
'use strict';
const state = { colleges: [], intake: [], search: '', district: '', type: 'ALL' };
const els = {
  list: document.getElementById('collegeList'),
  count: document.getElementById('countBadge'),
  search: document.getElementById('searchInput'),
  district: document.getElementById('districtInput'),
  ddown: document.getElementById('districtDropdown'),
  tabs: document.querySelectorAll('.type-tab'),
};
function cleanName(n){ return String(n||'').replace(/^\*+/, '').trim(); }
function esc(s){ return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

async function loadData(){
  try{
    const [colleges, intake] = await Promise.all([
      fetch('./colleges.json').then(r=>{ if(!r.ok) throw new Error('colleges.json '+r.status); return r.json(); }),
      fetch('./intake.json').then(r=>r.ok?r.json():[]).catch(()=>[]),
    ]);
    state.colleges = colleges.map(c=>({ ...c, name: cleanName(c.name) }))
      .sort((a,b)=>a.name.localeCompare(b.name));
    state.intake = intake||[];
    buildDistricts();
    render();
  }catch(err){
    console.error('Error:', err);
    els.list.innerHTML = `<div class="empty-state">Failed to load colleges. ${esc(err.message)}</div>`;
  }
}
function branchCount(id){ return state.intake.filter(i=>i.college_id===id).length; }

function getFiltered(){
  const q = state.search.trim().toLowerCase();
  const dist = state.district.trim().toLowerCase();
  return state.colleges.filter(c=>{
    if(state.type!=='ALL' && c.type!==state.type) return false;
    if(dist && String(c.district||'').toLowerCase()!==dist) return false;
    if(q){
      const hay = `${c.name} ${c.short_name||''} ${c.district||''}`.toLowerCase();
      if(!hay.includes(q)) return false;
    }
    return true;
  });
}
function render(){
  const list = getFiltered();
  els.count.textContent = `(${list.length})`;
  if(!list.length){ els.list.innerHTML = `<div class="empty-state">No colleges found.</div>`; return; }
  els.list.innerHTML = list.map(c=>{
    const n = branchCount(c.id);
    const typeCls = c.type==='GOV' ? 'badge-gov' : 'badge-sfi';
    return `<a class="college-card" href="./college_detail.html?id=${c.id}">
      <div class="cc-top">
        <div class="cc-name">${esc(c.short_name||c.name)}</div>
        <span class="badge ${typeCls}">${esc(c.type||'')}</span>
      </div>
      <div class="cc-full">${esc(c.name)}</div>
      <div class="cc-meta">
        <span class="cc-chip">📍 ${esc(c.district||'—')}</span>
        <span class="cc-chip">💰 ${esc(c.fees||'—')}</span>
        <span class="cc-chip">🎓 ${n} ${n===1?'Branch':'Branches'}</span>
      </div>
    </a>`;
  }).join('');
}
function buildDistricts(){
  const set = [...new Set(state.colleges.map(c=>c.district).filter(Boolean))].sort();
  state._districts = set;
}
function showDropdown(){
  const q = state.district.trim().toLowerCase();
  const opts = (state._districts||[]).filter(d=>d.toLowerCase().includes(q));
  if(!opts.length){ els.ddown.hidden = true; return; }
  els.ddown.innerHTML = opts.map(d=>`<div class="district-item" data-d="${esc(d)}">${esc(d)}</div>`).join('');
  els.ddown.hidden = false;
}
// events
els.search.addEventListener('input', e=>{ state.search=e.target.value; render(); });
els.district.addEventListener('input', e=>{ state.district=e.target.value; showDropdown(); render(); });
els.district.addEventListener('focus', showDropdown);
els.ddown.addEventListener('click', e=>{
  const it = e.target.closest('.district-item'); if(!it) return;
  state.district = it.dataset.d; els.district.value = it.dataset.d; els.ddown.hidden=true; render();
});
document.addEventListener('click', e=>{ if(!e.target.closest('.district-wrap')) els.ddown.hidden=true; });
els.tabs.forEach(t=>t.addEventListener('click',()=>{
  els.tabs.forEach(x=>x.classList.remove('active')); t.classList.add('active');
  state.type=t.dataset.type; render();
}));
loadData();
