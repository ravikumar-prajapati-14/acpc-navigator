/* College Predictor — uses cutoffR3.json (Round 3, 2025) */

const BRANCH_GROUPS = {
  "COMPUTER ENGINEERING": [
    "COMPUTER ENGINEERING",
    "COMPUTER SCIENCE & ENGINEERING",
    "COMPUTER SCIENCE & ENGINEERING (DATA SCIENCE)",
    "COMPUTER SCIENCE & ENGINEERING (CYBER SECURITY)",
    "COMPUTER ENGINEERING (SOFTWARE ENGINEERING)",
    "COMPUTER SCIENCE & ENGINEERING (CLOUD COMPUTING)",
    "COMPUTER SCIENCE & ENGINEERING (BIG DATA ANALYTICS)",
    "COMPUTER SCIENCE & ENGINEERING (BLOCK CHAIN TECHNOLOGY)",
    "COMPUTER SCIENCE & ENGINEERING (INTERNET OF THINGS)",
    "MATHEMATICS AND COMPUTING",
    "COMPUTER SCIENCE & ARTIFICIAL INTELLIGENCE",
    "COMPUTER SCIENCE & DESIGN",
    "COMPUTER SCIENCE & BUSINESS SYSTEMS",
    "COMPUTER SCIENCE & TECHNOLOGY",
    "CYBER SECURITY",
    "COMPUTER ENGINEERING & APPLICATION",
    "CLOUD TECH & INFORMATION SECURITY"
  ],
  "ARTIFICIAL INTELLIGENCE": [
    "ARTIFICIAL INTELLIGENCE(AI) AND MACHINE LEARNING",
    "ARTIFICIAL INTELLIGENCE AND DATA SCIENCE",
    "COMPUTER SCIENCE & ENGINEERING (ARTIFICIAL INTELLIGENCE AND MACHINE LEARNING)",
    "COMPUTER SCIENCE & ENGINEERING (ARTIFICIAL INTELLIGENCE)",
    "COMPUTER ENGINEERING (ARTIFICIAL INTELLIGENCE)"
  ],
  "INFORMATION TECHNOLOGY": ["INFORMATION TECHNOLOGY"],
  "ELECTRONICS & COMMUNICATION": [
    "ELECTRONICS & COMMUNICATION ENGINEERING",
    "ELECTRONICS ENGINEERING",
    "ELECTRONICS ENGINEERING (VLSI DESIGN AND TECHNOLOGY)",
    "ELECTRONICS COMMUNICATION ENGINEERING & ARTIFICIAL INTELLIGENCE",
    "ELECTRONICS & COMMUNICATION ENGINEERING (ARTIFICIAL INTELLIGENCE AND MACHINE LEARNING)",
    "ELECTRONICS ENGINEERING (VLSI DESIGN AND SEMICONDUCTOR TECHNOLOGY)",
    "ELECTRONICS & COMMUNICATION ENGINEERING (VLSI DESIGN AND TECHNOLOGY)",
    "ELECTRICAL AND ELECTRONICS ENGINEERING",
    "ELECTRONICS & COMMUNICATION (COMMUNICATION SYSTEM ENGG.)"
  ],
  "INFORMATION & COMMUNICATION TECHNOLOGY": [
    "INFORMATION & COMMUNICATION TECHNOLOGY",
    "HONS. IN ICT WITH MINOR IN COMPUTATIONAL SCIENCE(CS)"
  ],
  "ELECTRONICS & INSTRUMENTATION ENGINEERING": [
    "ELECTRONICS & INSTRUMENTATION ENGINEERING",
    "INSTRUMENTATION & CONTROL ENGINEERING"
  ],
  "ELECTRICAL ENGINEERING": ["ELECTRICAL ENGINEERING"],
  "MECHANICAL ENGINEERING": [
    "MECHANICAL ENGINEERING",
    "METALLURGY",
    "MECHATRONICS",
    "MECHANICAL ENGINEERING (INDUSTRY INTEGRATED)",
    "MECHANICAL ENGINEERING (ROBOTICS & AUTOMATION)",
    "MECHANICAL ENGINEERING (SUSTAINABLE ENERGY ENGINEERING)",
    "METALLURGICAL AND MATERIALS ENGINEERING",
    "MECHATRONICS ENGINEERING"
  ],
  "CIVIL ENGINEERING": [
    "CIVIL ENGINEERING",
    "CIVIL ENGNEERING",
    "CIVIL IRRIGATION WATER MANAGEMENT",
    "BACHELOR OF TECHNOLOGY (HONS) IN CIVIL ENGINEERING (BCE)"
  ],
  "CHEMICAL ENGINEERING": [
    "CHEMICAL ENGINEERING",
    "CHEMICAL TECHNOLOGY",
    "CHEMICAL & ENVIRONMENTAL ENGINEERING",
    "CHEMICAL & BIOCHEMICAL ENGINEERING",
    "CHEMICAL TECHNOLOGY(DYES & PIGMENTS)",
    "CHEMICAL TECHNOLOGY(GLASS & CERAMIC)",
    "CHEMICAL TECHNOLOGY (POLYMER & RUBBER)",
    "CHEMICAL TECHNOLOGY (PHARMACEUTICAL)"
  ],
  "PETROCHEMICAL ENGINEERING": ["PETROCHEMICAL ENGINEERING"],
  "BIOTECHNOLOGY": ["BIOTECHNOLOGY", "BIOINFORMATICS"],
  "ROBOTIC & AUTOMATION": [
    "ROBOTIC & AUTOMATION",
    "ROBOTICS & ARTIFICIAL INTELLIGENCE"
  ],
  "AERONAUTICAL ENGINEERING": [
    "AERONAUTICAL ENGINEERING",
    "AERO SPACE ENGINEERING"
  ],
  "DAIRY TECHNOLOGY": ["DAIRY TECHNOLOGY"],
  "ENVIRONMENTAL ENGINEERING": [
    "ENVIRONMENTAL ENGINEERING",
    "CLIMATE CHANGE",
    "CLIMATE TECHNOLOGY (SUSTAINABLE ENGINEERING)",
    "FIRE AND ENVIRONMENT, HEALTH, SAFETY ENGINEERING"
  ],
  "PLASTIC TECHNOLOGY": [
    "PLASTIC TECHNOLOGY",
    "PLASTIC ENGINEERING",
    "PLASTIC AND POLYMER ENGINEERING"
  ],
  "RUBBER TECHNOLOGY": ["RUBBER TECHNOLOGY"],
  "TEXTILE TECHNOLOGY": [
    "TEXTILE TECHNOLOGY",
    "TEXTILE PROCESSING",
    "TEXTILE ENGINEERING"
  ],
  "ENERGY ENGINEERING": ["ENERGY ENGINEERING"],
  "FOOD PROCESSING TECHNOLOGY": [
    "FOOD PROCESSING TECHNOLOGY",
    "FOOD ENGINEERING & TECHNOLOGY",
    "MANUFACTURING ENGINEERING",
    "FOOD TECHNOLOGY"
  ],
  "AGRICULTURAL TECHNOLOGY": ["AGRICULTURAL TECHNOLOGY"],
  "AUTOMOBILE ENGINEERING": ["AUTOMOBILE ENGINEERING"],
  "POWER ELECTRONICS": ["POWER ELECTRONICS"],
  "BIOMEDICAL ENGINEERING": ["BIOMEDICAL ENGINEERING"],
  "PRODUCTION ENGINEERING": ["PRODUCTION ENGINEERING"]
};

const LIMITS = { high: 15, med: 10, low: 5 };
const VACANT_MAX = 15;
const VACANT_SHOW_THRESHOLD = 10;

const state = {
  colleges: [],
  collegeMap: new Map(),
  cutoffs: []
};

const $ = id => document.getElementById(id);

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

function normBranch(s) {
  return String(s || "").trim().toUpperCase().replace(/\s+/g, " ");
}

const BRANCH_LOOKUP = (() => {
  const map = new Map();
  for (const [group, subs] of Object.entries(BRANCH_GROUPS)) {
    for (const sub of subs) map.set(normBranch(sub), group);
  }
  return map;
})();

function groupOfBranch(branch) {
  const n = normBranch(branch);
  if (!n) return null;
  if (BRANCH_LOOKUP.has(n)) return BRANCH_LOOKUP.get(n);
  for (const [group, subs] of Object.entries(BRANCH_GROUPS)) {
    for (const sub of subs) {
      const ns = normBranch(sub);
      if (n.includes(ns) || ns.includes(n)) return group;
    }
  }
  return null;
}

async function fetchJson(path) {
  try {
    const r = await fetch(path);
    if (!r.ok) throw new Error(r.status);
    return await r.json();
  } catch (e) {
    console.error("fetch failed", path, e);
    return [];
  }
}

async function init() {
  const [colleges, cutoffs] = await Promise.all([
    fetchJson("./colleges.json"),
    fetchJson("./cutoffR3.json")
  ]);
  state.colleges = Array.isArray(colleges) ? colleges : [];
  state.collegeMap = new Map(state.colleges.map(c => [c.id, c]));
  state.cutoffs = Array.isArray(cutoffs) ? cutoffs : [];

  populateBranchDropdown();
  bindEvents();
}

function populateBranchDropdown() {
  const sel = $("branchSel");
  if (!sel) return;
  sel.innerHTML = '<option value="ALL" selected>All Branches</option>';
  for (const g of Object.keys(BRANCH_GROUPS)) {
    const opt = document.createElement("option");
    opt.value = g;
    opt.textContent = g;
    sel.appendChild(opt);
  }
}



function bindEvents() {

  $("predictBtn").addEventListener("click", predict);

  $("rankInput").addEventListener("keydown", e => {
    if (e.key === "Enter") predict();
  });

  // Clear results whenever input changes
  $("rankInput").addEventListener("input", clearResults);

  $("categorySel").addEventListener("change", clearResults);

  $("typeSel").addEventListener("change", clearResults);

  $("branchSel").addEventListener("change", clearResults);

  $("clearBranchBtn").addEventListener("click", () => {

    $("branchSel").value = "ALL";

    clearResults();
  });
}

function isNum(v) {
  return typeof v === "number" && isFinite(v);
}

function toNum(v) {
  if (isNum(v)) return v;
  if (v == null) return null;
  const s = String(v).trim();
  if (!s || s === "-") return null;
  const n = Number(s);
  return isFinite(n) ? n : null;
}

function predict() {
  const rankInput = $("rankInput");
  const rank = parseInt(rankInput.value, 10);
  if (!rank || rank < 1) {
    rankInput.classList.add("error");
    rankInput.focus();
    setTimeout(() => rankInput.classList.remove("error"), 500);
    return;
  }

  const category = $("categorySel").value;
  const collegeType = $("typeSel").value;
  const branchGroup = $("branchSel").value;

  const buckets = { high: [], med: [], low: [] };
  const vacants = [];

  for (const row of state.cutoffs) {
    if (!row) continue;
    const college = state.collegeMap.get(row.college_id);
    if (!college) continue;

    if (collegeType !== "ALL" && college.type !== collegeType) continue;

    if (branchGroup !== "ALL") {
      const g = groupOfBranch(row.branch);
      if (g !== branchGroup) continue;
    }

const records = [];

if (category === "OPEN") {

  const cutoff = toNum(row.OPEN);

  records.push({
    college,
    branch: row.branch,
    cutoff,
    isTFWS: false
  });

} else {

  const categoryCutoff = toNum(row[category]);

  if (categoryCutoff != null) {
    records.push({
      college,
      branch: row.branch,
      cutoff: categoryCutoff,
      isTFWS: false
    });
  }

  const tfwsCutoff = toNum(row.TFWS);

  if (tfwsCutoff != null) {
    records.push({
      college,
      branch: row.branch,
      cutoff: tfwsCutoff,
      isTFWS: true
    });
  }
}

for (const record of records) {

  if (record.cutoff == null) {
    vacants.push(record);
    continue;
  }

  const diff = record.cutoff - rank;

if (rank <= record.cutoff * 0.93) {
    buckets.high.push(record);
}
else if (rank <= record.cutoff * 1.03) {
    buckets.med.push(record);
}
else if (rank <= record.cutoff * 1.12) {
    buckets.low.push(record);
}
}
  }

  for (const k of Object.keys(buckets)) {
    buckets[k].sort((a, b) => a.cutoff - b.cutoff);
    buckets[k] = buckets[k].slice(0, LIMITS[k]);
  }

  vacants.sort((a, b) =>
    (a.college.short_name || a.college.name || "").localeCompare(b.college.short_name || b.college.name || "")
  );

  let vacantList = [];

if(rank <= 10000){
    vacantList = [];
}
else if(rank <= 20000){
    vacantList = vacants.slice(0,5);
}
else if(rank <= 50000){
    vacantList = vacants.slice(0,10);
}
else{
    vacantList = vacants.slice(0,15);
}

  renderResults(buckets, vacantList);
}

function renderResults(buckets, vacants) {
  const root = $("resultsSection");
  const foot = $("footMessages");
  const vacantMsg = $("vacantMsg");
  root.innerHTML = "";

  const total = buckets.high.length + buckets.med.length + buckets.low.length + vacants.length;
  if (total === 0) {
    root.innerHTML = `<div class="pred-empty">No colleges found. Try a different branch or category.</div>`;
    foot.hidden = false;
    vacantMsg.hidden = true;
    return;
  }

  const groups = [
    { key: "high", label: "High Chance" },
    { key: "med",  label: "Medium Chance" },
    { key: "low",  label: "Low Chance" }
  ];

  for (const g of groups) {
    const items = buckets[g.key];
    if (!items.length) continue;
    const h = document.createElement("div");
    h.className = "pred-group-title";
    h.textContent = `${g.label} (${items.length})`;
    root.appendChild(h);
    for (const r of items) root.appendChild(renderCard(r, g.key));
  }

  if (vacants.length) {
    const h = document.createElement("div");
    h.className = "pred-group-title";
    h.textContent = `Vacant Seats (${vacants.length})`;
    root.appendChild(h);
    for (const r of vacants) root.appendChild(renderCard(r, "vacant"));
    vacantMsg.hidden = false;
  } else {
    vacantMsg.hidden = true;
  }

  foot.hidden = false;
}

function renderCard(r, cls) {
  const card = document.createElement("div");
  card.className = `result-card ${cls}`;
  const isVacant = cls === "vacant";
  card.innerHTML = `
    <div class="rc-college">
      <div class="rc-short">${esc(r.college.short_name || r.college.name)}</div>
      <div class="rc-full">${esc(r.college.name)}</div>
    </div>
    <div class="rc-branch">${esc(r.branch)}</div>
    <div class="rc-rank ${isVacant ? "vacant" : ""}">
  <span class="rc-rank-label">${isVacant ? "Status" : "Closing Rank"}</span>

  ${isVacant
    ? "Vacant"
    : `
      <div>${r.cutoff.toLocaleString("en-IN")}</div>
      ${r.isTFWS ? '<div class="tfws-badge">TFWS</div>' : ''}
    `
  }
</div>
  `;
  return card;
}

document.addEventListener("DOMContentLoaded", init);

function clearResults() {

  $("resultsSection").innerHTML = `
    <div class="pred-empty">
      Filters changed. Click Predict to view updated colleges.
    </div>
  `;

  $("footMessages").hidden = true;

  $("vacantMsg").hidden = true;
}