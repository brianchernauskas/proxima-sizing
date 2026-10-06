'use strict';

// Microsoft Enterprise Negotiation Planner.
// The Azure line reuses the Azure Negotiation Planner's discount and leverage
// logic; the other product lines, the bundle trade matrix, and the M365 price
// exposure model are specific to this planner.

const state = {};
let currentStep = 1;
const OUTPUT_STEP = document.querySelectorAll('.step-panel').length;
const AZURE_STEP = 3;

const inEstate = (s, line) => (s.estate || []).includes(line);
const azureSelected = () => !!document.querySelector('#estate .use-case-card.selected[data-value="azure"]');

function nextStep(from) {
  if (!validateStep(from)) return;
  collectStep(from);
  let to = from + 1;
  if (to === AZURE_STEP && !azureSelected()) to++;
  goToStep(to);
}
function prevStep(from) {
  let to = from - 1;
  if (to === AZURE_STEP && !azureSelected()) to--;
  goToStep(to);
}
function goToStep(n) {
  document.querySelector('.step-panel.active')?.classList.remove('active');
  document.getElementById(`step-${n}`).classList.add('active');
  const skipAzure = !azureSelected();
  document.querySelectorAll('.step-item').forEach(el => {
    const s = +el.dataset.step;
    el.classList.toggle('active', s === n);
    el.classList.toggle('done', s < n);
    el.classList.toggle('skipped', s === AZURE_STEP && skipAzure && n > AZURE_STEP);
  });
  currentStep = n;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function validateStep(step) {
  const required = {
    1: ['industry', 'growth-rate', 'ms-tenure', 'agreement-type', 'renewal-timeline'],
    2: ['total-ms-spend', 'support-tier'],
    3: ['annual-spend', 'spend-growth', 'optimization-status'],
    4: ['copilot-status'],
    5: ['relationship-quality'],
  };
  const radioGroups = { 1: ['company-size'], 3: ['multicloud'] };
  let ok = true;
  (required[step] || []).forEach(id => {
    const el = document.getElementById(id);
    if (el && el.tagName === 'SELECT' && !el.value) {
      el.style.borderColor = 'var(--danger)';
      el.addEventListener('change', () => el.style.borderColor = '', { once: true });
      ok = false;
    }
  });
  (radioGroups[step] || []).forEach(id => {
    const group = document.getElementById(id);
    if (group && !group.querySelector('.selected')) {
      group.style.outline = '2px solid var(--danger)';
      group.style.borderRadius = '8px';
      setTimeout(() => { group.style.outline = ''; }, 2000);
      ok = false;
    }
  });
  let msg = 'Please fill in all required fields before continuing.';
  if (step === 2) {
    const m365 = !!document.querySelector('#estate .selected[data-value="m365"]');
    if (!document.querySelector('#estate .selected')) {
      ok = false;
      msg = 'Select at least one Microsoft product line.';
    } else if (m365 && (!document.getElementById('m365-seats').value || document.getElementById('m365-seats').value === 'na' || !document.getElementById('m365-suite').value || document.getElementById('m365-suite').value === 'na')) {
      ['m365-seats', 'm365-suite'].forEach(id => { document.getElementById(id).style.borderColor = 'var(--danger)'; });
      ok = false;
      msg = 'Microsoft 365 is in scope — add its seat count and predominant suite.';
    }
  }
  if (!ok) {
    const el = document.createElement('div');
    el.className = 'alert alert-danger';
    el.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;max-width:320px;animation:fadeIn .2s ease';
    el.innerHTML = `<span class="alert-icon">⚠️</span> ${msg}`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }
  return ok;
}

const val = id => document.getElementById(id)?.value || '';
const checked = id => [...document.querySelectorAll(`#${id} input:checked`)].map(i => i.value);
const cards = id => [...document.querySelectorAll(`#${id} .selected`)].map(c => c.dataset.value);

function collectStep(step) {
  if (step === 1) {
    state.companySize = document.querySelector('#company-size .selected')?.dataset.value;
    state.industry = val('industry');
    state.growthRate = val('growth-rate');
    state.msTenure = val('ms-tenure');
    state.agreementType = val('agreement-type');
    state.renewalTimeline = val('renewal-timeline');
    state.cotermStatus = val('coterm-status');
    state.eaTermStart = val('ea-term-start');
    state.eaPricingLevel = val('ea-pricing-level');
    state.desiredTerm = val('desired-term');
    state.compliance = checked('compliance');
  }
  if (step === 2) {
    state.estate = cards('estate');
    state.totalMsSpend = val('total-ms-spend');
    state.spendMix = val('spend-mix');
    state.m365Seats = val('m365-seats');
    state.m365Suite = val('m365-suite');
    state.frontlineWorkers = val('frontline-workers');
    state.supportTier = val('support-tier');
  }
  if (step === 3) {
    const on = azureSelected();
    state.annualSpend = on ? val('annual-spend') : '';
    state.spendGrowth = on ? val('spend-growth') : '';
    state.commitUtilization = on ? val('commit-utilization') : '';
    state.cspOpenness = on ? val('csp-openness') : '';
    state.useCases = on ? cards('use-cases') : [];
    state.onpremLicenses = checked('onprem-licenses');
    state.workloadType = on ? val('workload-type') : '';
    state.hybridBenefitStatus = on ? val('hybrid-benefit-status') : '';
    state.optimizationStatus = on ? val('optimization-status') : '';
    state.migrationStatus = on ? val('migration-status') : '';
    state.multicloud = on ? document.querySelector('#multicloud .selected')?.dataset.value : '';
  }
  if (step === 4) {
    state.m365Reclamation = val('m365-reclamation');
    state.e5Utilization = val('e5-utilization');
    state.copilotStatus = val('copilot-status');
    state.copilotAdoption = val('copilot-adoption');
    state.dynamicsPosition = val('dynamics-position');
    state.aiBuilderReliance = val('ai-builder-reliance');
    state.securityPosition = val('security-position');
    state.githubPosition = val('github-position');
    state.auditHistory = val('audit-history');
  }
  if (step === 5) {
    state.productivityAlternative = val('productivity-alternative');
    state.supportAlternative = val('support-alternative');
    state.relationshipQuality = val('relationship-quality');
    state.keyConcern = val('key-concern');
    state.expansionPlans = checked('expansion-plans');
  }
}

document.querySelectorAll('.radio-cards').forEach(group => {
  group.querySelectorAll('.radio-card').forEach(card => {
    card.addEventListener('click', () => {
      group.querySelectorAll('.radio-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
    });
  });
});
document.querySelectorAll('.use-case-card').forEach(card => {
  card.addEventListener('click', () => card.classList.toggle('selected'));
});

function generateStrategy() {
  document.body.classList.remove('is-sample');
  if (!validateStep(5)) return;
  // Collect every step, so a skipped Azure step still resets its fields.
  for (let i = 1; i < OUTPUT_STEP; i++) collectStep(i);
  document.getElementById('strategy-output').innerHTML = buildStrategyHTML(state);
  goToStep(OUTPUT_STEP);
}

// ─── Ranges metadata ──────────────────────────────────────────────────────────
const RANGES_LAST_UPDATED = 'September 16, 2026';

// ─── Dated Microsoft context ─────────────────────────────────────────────────
// Re-verify monthly alongside the hyperscaler scan. Each entry carries its date
// so stale guidance is easy to spot.
const MS_CONTEXT = {
  levelsRemoved: 'November 2025',          // EA pricing Levels B/C/D removed for online services
  m365Increase: 'July 1, 2026',            // M365/O365 suite increase; applies at next renewal after this date
  eaToMcaeMigration: 'March 2026',         // Microsoft began moving EA MACC customers to MCA-E
  copilotLadderEnded: 'June 30, 2026',     // partner-reported Copilot volume discount ladder expiry
  e7Available: 'May 1, 2026',              // Microsoft 365 E7 at $99/user/month
  aiBuilderSunset: 'November 1, 2026',     // seeded AI Builder credits removed
  foundryRegional: 'September 1, 2026',    // regional AI Foundry deployment premium
};

// Per-user/month list uplift from the July 1, 2026 change, by predominant suite.
const M365_UPLIFT = {
  'o365-e1':  { uplift: 0,    from: '$10', to: '$10', label: 'Office 365 E1' },
  'o365-e3':  { uplift: 3,    from: '$23', to: '$26', label: 'Office 365 E3' },
  'm365-e3':  { uplift: 3,    from: '$36', to: '$39', label: 'Microsoft 365 E3' },
  'm365-e5':  { uplift: 3,    from: '$57', to: '$60', label: 'Microsoft 365 E5' },
  'm365-e7':  { uplift: 0,    from: '—',   to: '$99', label: 'Microsoft 365 E7' },
  'mixed':    { uplift: 3,    from: '$36–$57', to: '$39–$60', label: 'Mixed E3 / E5' },
  'business': { uplift: 1.25, from: '$6–$22', to: '$7–$22', label: 'Business plans' },
};

const SEAT_BANDS = {
  'under500': { lo: 100,   hi: 500,   label: 'under 500' },
  '500-2k':   { lo: 500,   hi: 2000,  label: '500–2,000' },
  '2k-5k':    { lo: 2000,  hi: 5000,  label: '2,000–5,000' },
  '5k-10k':   { lo: 5000,  hi: 10000, label: '5,000–10,000' },
  '10k-25k':  { lo: 10000, hi: 25000, label: '10,000–25,000' },
  '25kplus':  { lo: 25000, hi: 50000, label: '25,000+' },
};
const SEAT_TIER = { 'under500': 0, '500-2k': 1, '2k-5k': 2, '5k-10k': 3, '10k-25k': 4, '25kplus': 5 };

// ─── Spend tiers (shared with the Azure planner) ─────────────────────────────
const SPEND_TIERS = {
  'under100k':  { label: '<$100K',      tier: 0 },
  '100k-500k':  { label: '$100K–$500K', tier: 1 },
  '500k-1m':    { label: '$500K–$1M',   tier: 2 },
  '1m-5m':      { label: '$1M–$5M',     tier: 3 },
  '5m-10m':     { label: '$5M–$10M',    tier: 4 },
  '10m-25m':    { label: '$10M–$25M',   tier: 5 },
  '25m-50m':    { label: '$25M–$50M',   tier: 6 },
  '50mplus':    { label: '$50M+',       tier: 7 },
};
const MS_SPEND_TIERS = { 'under500k': 0, '500k-2m': 1, '2m-10m': 2, '10m-25m': 3, '25m-50m': 4, '50mplus': 5 };
const MS_SPEND_LABELS = { 'under500k': '<$500K', '500k-2m': '$500K–$2M', '2m-10m': '$2M–$10M', '10m-25m': '$10M–$25M', '25m-50m': '$25M–$50M', '50mplus': '$50M+' };
const AZURE_TO_CAL_TIER = {
  'under100k': 'under1m', '100k-500k': 'under1m', '500k-1m': 'under1m',
  '1m-5m': '1m-5m', '5m-10m': '5m-10m',
  '10m-25m': '10m-25m', '25m-50m': '25m-50m', '50mplus': '50m-100m',
};

const isEA = s => s.agreementType === 'ea';
const isMCAE = s => s.agreementType === 'mca-e';
const isCSP = s => s.agreementType === 'csp';
const exp = (s, p) => (s.expansionPlans || []).includes(p);

// Microsoft deals are logged per product line in Deal Calibration, so a line
// filter keeps a Copilot discount from calibrating Unified Support.
function getProximaInsight(provider, calTier, line) {
  try {
    const deals = JSON.parse(localStorage.getItem('proxima-deals') || '[]');
    const provDeals = deals.filter(d => d.provider === provider && (!line || (d.line || 'estate') === line));
    if (provDeals.length === 0) return null;
    const tierDeals = calTier ? provDeals.filter(d => d.tier === calTier) : [];
    const relevant = tierDeals.length >= 2 ? tierDeals : provDeals;
    const discounts = relevant.map(d => d.discount).sort((a, b) => a - b);
    const avg = Math.round(discounts.reduce((sum, v) => sum + v, 0) / discounts.length * 10) / 10;
    return { count: relevant.length, avg, lo: discounts[0], hi: discounts[discounts.length - 1], tierMatch: tierDeals.length >= 2 };
  } catch { return null; }
}

// ─── Azure ACD (Azure planner logic) ─────────────────────────────────────────
function getAzureDiscountRange(s) {
  const tier = SPEND_TIERS[s.annualSpend]?.tier ?? 0;
  const msTier = MS_SPEND_TIERS[s.totalMsSpend] ?? 0;
  const bundleBoost = Math.max(0, msTier - tier) * 2;
  const multicloudBoost = s.multicloud === 'multi-cloud' ? 7 : s.multicloud === 'evaluating' ? 5 : s.multicloud === 'azure-primary' ? 2 : 0;
  const termBoost = s.desiredTerm === '3yr' ? 4 : 0;
  const expansionBoost = ['m365-expand', 'copilot-adopt', 'dynamics-expand', 'e5-upgrade'].filter(p => exp(s, p)).length * 2;
  const ranges = [[0, 3], [3, 8], [5, 15], [10, 20], [15, 25], [18, 30], [22, 33], [25, 35]];
  const [lo, hi] = ranges[tier] || [0, 3];
  const loFinal = Math.min(lo + Math.round(bundleBoost * 0.5), 40);
  const hiFinal = Math.min(hi + bundleBoost + multicloudBoost + termBoost + expansionBoost, 45);
  return { lo: loFinal, hi: hiFinal, midpoint: Math.round((loFinal + hiFinal) / 2) };
}

// ─── Estate lines ────────────────────────────────────────────────────────────
// Each in-scope line gets a target range off list, how much Microsoft wants
// growth there (which is what makes it trade currency), and its primary lever.
// Non-Azure ranges are planning ranges pending Proxima deal calibration.
const clampRange = (lo, hi, cap) => ({ lo: Math.max(0, Math.min(lo, cap)), hi: Math.max(0, Math.min(hi, cap)) });

function buildEstateLines(s) {
  const lines = [];
  const seatTier = SEAT_TIER[s.m365Seats] ?? 0;
  const msTier = MS_SPEND_TIERS[s.totalMsSpend] ?? 0;
  const threeYr = s.desiredTerm === '3yr';

  if (inEstate(s, 'azure')) {
    const d = getAzureDiscountRange(s);
    lines.push({ key: 'azure', name: 'Azure', sub: `${SPEND_TIERS[s.annualSpend]?.label || '—'} annual consumption`, lo: d.lo, hi: d.hi, unit: 'ACD off list',
      priority: s.useCases.includes('ai-ml') || exp(s, 'azure-migrate') ? 'top' : 'high',
      lever: s.multicloud === 'azure-only' ? 'Build an AWS/GCP comparison for named workloads; right-size before sizing the MACC' : 'Price the consolidation of AWS/GCP workloads; RI and savings plan stacking',
      event: 'EA-to-MCA-E migration push since ' + MS_CONTEXT.eaToMcaeMigration });
  }

  if (inEstate(s, 'm365')) {
    const base = [[0, 5], [3, 8], [5, 12], [8, 15], [10, 18], [12, 22]][seatTier];
    let boost = 0;
    if (s.productivityAlternative === 'formal' || s.productivityAlternative === 'partial') boost += 4;
    else if (s.productivityAlternative === 'informal') boost += 2;
    if (exp(s, 'e5-upgrade') || exp(s, 'e7-consider')) boost += 3;
    if (threeYr) boost += 2;
    const r = clampRange(base[0] + Math.round(boost / 3), base[1] + boost, 30);
    lines.push({ key: 'm365', name: 'Microsoft 365 suites', sub: `${SEAT_BANDS[s.m365Seats]?.label || '—'} seats · ${M365_UPLIFT[s.m365Suite]?.label || 'suite n/a'}`, ...r, unit: 'off list',
      priority: 'med',
      lever: 'Seat reclamation and E5 right-sizing first; credible Google Workspace pricing; trade upgrades, not renewals',
      event: `Suite list increase effective ${MS_CONTEXT.m365Increase}` });
  }

  if (inEstate(s, 'copilot')) {
    const scaled = ['deploying', 'broad'].includes(s.copilotStatus);
    let r = scaled ? { lo: 10 + seatTier * 2, hi: 25 + seatTier * 2 } : { lo: 10, hi: 25 };
    if (s.copilotAdoption === 'weak') r = { lo: r.lo, hi: r.hi - 5 };
    lines.push({ key: 'copilot', name: 'Microsoft 365 Copilot', sub: { none: 'No seats', evaluating: 'Evaluating', pilot: 'Pilot', deploying: 'Scaling', broad: 'Broad / E7' }[s.copilotStatus] || '—', ...clampRange(r.lo, r.hi, 40), unit: 'off $30 list',
      priority: 'top',
      lever: 'Ramped seat counts with swap and reduction rights; price hold on expansion; tie seats to measured usage',
      event: `Partner-reported volume discount ladder ended ${MS_CONTEXT.copilotLadderEnded}` });
  }

  if (inEstate(s, 'security')) {
    const takeout = s.securityPosition === 'third-party' || s.securityPosition === 'considering-consolidation' || exp(s, 'security-consolidate');
    const r = takeout ? { lo: 15, hi: 35 } : s.securityPosition === 'considering-exit' ? { lo: 10, hi: 25 } : { lo: 5, hi: 15 };
    lines.push({ key: 'security', name: 'Security', sub: 'E5 Security, Defender, Sentinel, Entra', ...r, unit: 'off list',
      priority: takeout ? 'top' : 'high',
      lever: takeout ? 'Competitive takeout of named third-party tools — Microsoft funds these heavily' : 'Retention risk if a third-party stack is credible; bundle into E5 rather than paying standalone',
      event: 'Security Copilot included in M365 E5 (capacity-limited)' });
  }

  if (inEstate(s, 'dynamics')) {
    const r = s.dynamicsPosition === 'competing' ? { lo: 20, hi: 40 } : s.dynamicsPosition === 'new-purchase' ? { lo: 15, hi: 35 } : s.dynamicsPosition === 'expanding' ? { lo: 10, hi: 25 } : { lo: 5, hi: 15 };
    lines.push({ key: 'dynamics', name: 'Dynamics 365', sub: { stable: 'Installed — stable', expanding: 'Expanding', 'new-purchase': 'New purchase', competing: 'Competitive evaluation', na: '—' }[s.dynamicsPosition] || '—', ...r, unit: 'off list',
      priority: s.dynamicsPosition === 'competing' || s.dynamicsPosition === 'new-purchase' ? 'top' : 'high',
      lever: s.dynamicsPosition === 'competing' ? 'Documented Salesforce/SAP/ServiceNow evaluation unlocks competitive discount funding' : 'Bundle expansion into the main deal; confirm Copilot Credit allowance post AI Builder sunset',
      event: `Seeded AI Builder credits removed ${MS_CONTEXT.aiBuilderSunset}` });
  }

  if (inEstate(s, 'power-platform')) {
    lines.push({ key: 'power-platform', name: 'Power Platform / Copilot Studio', sub: 'Apps, Automate, Copilot Credits', lo: 5, hi: s.aiBuilderReliance === 'heavy' ? 20 : 15, unit: 'off list',
      priority: 'high',
      lever: 'Negotiate a Copilot Credit transition pack for AI Builder workloads; per-app vs per-user licence mix',
      event: `Seeded AI Builder credits removed ${MS_CONTEXT.aiBuilderSunset}` });
  }

  if (inEstate(s, 'github')) {
    const r = s.githubPosition === 'competing' ? { lo: 10, hi: 25 } : s.githubPosition === 'expanding' ? { lo: 8, hi: 18 } : { lo: 3, hi: 10 };
    lines.push({ key: 'github', name: 'GitHub', sub: 'Enterprise, Advanced Security, Copilot', ...r, unit: 'off list',
      priority: 'high',
      lever: s.githubPosition === 'competing' ? 'GitLab / alternative AI coding tool pricing on the table' : 'Bundle GitHub Copilot expansion; count against MACC where eligible',
      event: 'AI coding tools priced competitively across vendors' });
  }

  if (inEstate(s, 'unified-support')) {
    const alt = s.supportAlternative === 'quoted' || s.supportAlternative === 'using' ? 10 : s.supportAlternative === 'considering' ? 5 : 0;
    lines.push({ key: 'unified-support', name: 'Unified Support', sub: 'Priced as a share of Microsoft spend', lo: 5 + Math.round(alt / 2), hi: 15 + alt + msTier * 2, unit: 'off proposal',
      priority: 'low',
      lever: alt ? 'Third-party support quote — decouple the fee from licence spend and cap it' : 'Get a third-party quote; demand a fixed fee rather than a percentage of spend',
      event: 'Fees rise automatically with 2026 licence increases' });
  }

  if (inEstate(s, 'server')) {
    lines.push({ key: 'server', name: 'Windows Server / SQL Server', sub: 'Licences with Software Assurance', lo: 0, hi: 8 + (s.hybridBenefitStatus === 'fully-applied' ? 0 : 2), unit: 'off list',
      priority: exp(s, 'azure-migrate') ? 'high' : 'low',
      lever: 'SA renewal tied to Azure migration: Hybrid Benefit value, or drop SA on workloads staying on-prem',
      event: 'Price increases across server licences reported for 2026 renewals' });
  }

  if (inEstate(s, 'visual-studio')) {
    lines.push({ key: 'visual-studio', name: 'Visual Studio Subscriptions', sub: 'Developer subscriptions', lo: 0, hi: 10, unit: 'off list',
      priority: 'low',
      lever: 'Right-size to active developers; move light users to VS Code + GitHub',
      event: '—' });
  }

  return lines;
}

// ─── Leverage score ──────────────────────────────────────────────────────────
function getLeverageScore(s) {
  let score = 0;
  score += (MS_SPEND_TIERS[s.totalMsSpend] ?? 0) * 4;                       // 0–20
  score += Math.min((s.estate || []).length, 6) * 1.5;                       // breadth, 0–9
  if (inEstate(s, 'azure')) {
    score += { 'multi-cloud': 12, evaluating: 10, 'azure-primary': 4 }[s.multicloud] ?? 0;
    if (s.cspOpenness === 'open') score += 5;
    if (s.commitUtilization === 'under70') score -= 4;
    if (s.commitUtilization === 'over100') score += 2;
  }
  score += { formal: 10, partial: 10, informal: 5 }[s.productivityAlternative] ?? 0;
  score += { quoted: 6, using: 6, considering: 3 }[s.supportAlternative] ?? 0;
  if (s.dynamicsPosition === 'competing') score += 6;
  if (s.githubPosition === 'competing') score += 3;
  if (s.securityPosition === 'third-party' || s.securityPosition === 'considering-consolidation') score += 4;
  score += { hypergrowth: 8, fast: 6, moderate: 4, slow: 1, declining: 0 }[s.growthRate] ?? 2;
  score += { '6-12mo': 10, '3-6mo': 7, '12plusmo': 6, '1-3mo': 3, 'within-1mo': 0 }[s.renewalTimeline] ?? 4;
  score += { strategic: 8, strong: 6, moderate: 4, poor: 1, none: 0 }[s.relationshipQuality] ?? 2;
  score += { '5plus': 4, '3-5': 3, '1-3': 1, 'new': 0 }[s.msTenure] ?? 1;
  score += Math.min((s.expansionPlans || []).length * 2, 10);
  if (s.m365Reclamation === 'recent') score += 4;
  if (s.m365Reclamation === 'never') score -= 4;
  if (s.auditHistory === 'active') score -= 6;
  if (s.cotermStatus === 'single') score += 2;
  return Math.max(0, Math.min(Math.round(score), 100));
}

function getLeverageLabel(score) {
  if (score >= 75) return { label: 'Very Strong', color: '#166534' };
  if (score >= 55) return { label: 'Strong', color: '#15803D' };
  if (score >= 35) return { label: 'Moderate', color: '#B45309' };
  if (score >= 15) return { label: 'Developing', color: '#9A3412' };
  return { label: 'Early Stage', color: '#6B7280' };
}

// ─── Deal structure ──────────────────────────────────────────────────────────
function recommendedStructure(s) {
  const msTier = MS_SPEND_TIERS[s.totalMsSpend] ?? 0;
  if (inEstate(s, 'azure') && inEstate(s, 'm365') && s.cspOpenness === 'open') return 'Single motion, Azure split tested via CSP';
  if (s.agreementType === 'mixed' || s.cotermStatus === 'staggered') return 'Co-term into one negotiation';
  if (isEA(s) && msTier >= 3) return 'Single-motion EA renewal';
  if (isEA(s)) return 'EA renewal, priced against MCA-E';
  if (isMCAE(s)) return 'MCA-E with price protection addendum';
  if (isCSP(s)) return msTier >= 2 ? 'CSP, benchmarked against direct' : 'CSP with partner competition';
  if (s.agreementType === 'payg') return msTier >= 2 ? 'Move to MCA-E + MACC' : 'MCA with annual terms';
  return 'Single negotiation, line-item pricing';
}

// ─── M365 price exposure ─────────────────────────────────────────────────────
function m365Exposure(s) {
  if (!inEstate(s, 'm365')) return null;
  const band = SEAT_BANDS[s.m365Seats];
  const suite = M365_UPLIFT[s.m365Suite];
  if (!band || !suite) return null;
  return { lo: band.lo * suite.uplift * 12, hi: band.hi * suite.uplift * 12, suite, band };
}
const money = n => n >= 1e6 ? `$${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M` : n >= 1e3 ? `$${Math.round(n / 1e3)}K` : `$${Math.round(n)}`;

// Microsoft's fiscal year ends June 30; quarters close Sep 30, Dec 31, Mar 31, Jun 30.
function nextMicrosoftQuarterEnd(now = new Date()) {
  const y = now.getFullYear();
  const ends = [new Date(y, 2, 31), new Date(y, 5, 30), new Date(y, 8, 30), new Date(y, 11, 31), new Date(y + 1, 2, 31)];
  const end = ends.find(d => d >= new Date(now.getFullYear(), now.getMonth(), now.getDate()));
  const fy = end.getMonth() >= 6 ? end.getFullYear() + 1 : end.getFullYear();
  const q = { 8: 1, 11: 2, 2: 3, 5: 4 }[end.getMonth()];
  const days = Math.round((end - now) / 86400000);
  return { end, label: `FY${String(fy).slice(2)} Q${q}`, days, isYearEnd: q === 4 };
}

// ─── Strategy builder ────────────────────────────────────────────────────────
function buildStrategyHTML(s) {
  const lines = buildEstateLines(s);
  const leverage = getLeverageScore(s);
  const leverageInfo = getLeverageLabel(leverage);
  const companyLabels = { startup: 'Startup', smb: 'SMB', midmarket: 'Mid-Market', enterprise: 'Enterprise' };
  const azureLine = lines.find(l => l.key === 'azure');
  const headline = azureLine && s.spendMix !== 'm365-led' ? { label: 'Target Azure Discount (ACD)', v: `${azureLine.lo}–${azureLine.hi}%` }
    : lines.find(l => l.key === 'm365') ? { label: 'Target M365 Discount', v: `${lines.find(l => l.key === 'm365').lo}–${lines.find(l => l.key === 'm365').hi}%` }
    : { label: 'Product Lines in Scope', v: String(lines.length) };

  const alerts = buildAlerts(s);
  const tactics = buildTactics(s);
  const concessions = buildConcessions(s);
  const timeline = buildTimeline(s);
  const questions = buildQuestions(s);
  const risks = buildRisks(s);

  return `
<div class="strategy-container">
  <div class="print-proxima-header">
    <span class="print-logo-text">Proxima</span>
    <span class="print-divider"></span>
    <span class="print-tool-name">Microsoft Negotiation Planner</span>
  </div>
  <div class="strategy-hero">
    <h2>Your Microsoft Negotiation Strategy</h2>
    <div class="subtitle">${companyLabels[s.companySize] || 'Company'} · ${MS_SPEND_LABELS[s.totalMsSpend] || '—'} total Microsoft spend · ${lines.length} product line${lines.length !== 1 ? 's' : ''} · Generated ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
    <div style="font-size:.75rem;color:rgba(255,255,255,.6);font-style:italic;margin-top:4px;">Intended for Proxima use only — please contact Brian Chernauskas with questions</div>
    <div style="font-size:.7rem;color:rgba(255,255,255,.35);margin-top:3px;">Ranges last calibrated: ${RANGES_LAST_UPDATED}</div>
    <div class="score-row">
      <div class="score-pill"><span class="pill-label">Leverage Score</span><span class="pill-value" style="color:${leverageInfo.color}">${leverage}/100 — ${leverageInfo.label}</span></div>
      <div class="score-pill"><span class="pill-label">${headline.label}</span><span class="pill-value">${headline.v}</span></div>
      <div class="score-pill"><span class="pill-label">Recommended Structure</span><span class="pill-value">${recommendedStructure(s)}</span></div>
    </div>
  </div>

  <div class="strategy-body">

    ${alerts.length ? section('🚨', 'Critical Flags & Immediate Actions', `<div class="alerts-list">${alerts.map(a => `<div class="alert alert-${a.type}"><span class="alert-icon">${a.icon}</span><div>${a.text}</div></div>`).join('')}</div>`) : ''}

    ${section('🗺️', 'Microsoft Estate — Targets by Product Line', estateHTML(s, lines), `<span class="section-badge blue">${lines.length} line${lines.length !== 1 ? 's' : ''}</span>`)}

    ${section('🔁', 'Bundle Architecture — What to Trade for What', tradeMatrixHTML(s), '<span class="section-badge green">Give / get</span>')}

    ${inEstate(s, 'm365') ? section('📈', 'Microsoft 365 Price Increase Exposure', m365ExposureHTML(s)) : ''}

    ${azureLine ? section('💰', 'Azure Consumption Discount (ACD)', azureHTML(s, azureLine), `<span class="section-badge">MACC sizing</span>`) : ''}

    ${section('🔒', 'Agreement Vehicle & Price Protection', priceProtectionHTML(s), `<span class="section-badge">${priceProtectionBadge(s)}</span>`)}

    ${inEstate(s, 'unified-support') || s.supportTier === 'unified' ? section('🎧', 'Unified Support', supportHTML(s)) : ''}

    ${section('🎯', 'Negotiation Tactics — Ranked by Impact', `<div class="tactics-list">${tactics.map((t, i) => `
      <div class="tactic-card">
        <div class="tactic-num">${i + 1}</div>
        <div class="tactic-body">
          <div class="tactic-title">${t.title}</div>
          <div class="tactic-desc">${t.desc}</div>
          <span class="tactic-impact impact-${t.impact}">${t.impact === 'high' ? '🔥 High Impact' : t.impact === 'medium' ? '⚡ Medium Impact' : '• Low Impact'}</span>
        </div>
      </div>`).join('')}</div>`, `<span class="section-badge blue">${tactics.length} tactics</span>`)}

    ${section('🎁', 'Concessions to Request (Beyond Headline Discount)', `<div class="concessions-grid">${concessions.map(c => `
      <div class="concession-card">
        <div class="cc-icon">${c.icon}</div>
        <div class="cc-title">${c.title}</div>
        <div class="cc-desc">${c.desc}</div>
        <div class="cc-priority priority-${c.priority}">${c.priority === 'must' ? '🔴 Must Have' : c.priority === 'should' ? '🟡 Should Have' : '⚪ Nice to Have'}</div>
      </div>`).join('')}</div>`, '<span class="section-badge green">Non-discount value</span>')}

    ${section('📅', 'Negotiation Timeline & Action Plan', `<div class="timeline">${timeline.map(t => `
      <div class="timeline-item">
        <div class="timeline-left"><div class="tl-dot">${t.phase}</div><div class="tl-line"></div></div>
        <div class="tl-content">
          <div class="tl-phase">${t.when}</div>
          <div class="tl-title">${t.title}</div>
          <div class="tl-desc">${t.desc}</div>
          <div class="tl-tasks">${t.tasks.map(task => `<div class="tl-task">${task}</div>`).join('')}</div>
        </div>
      </div>`).join('')}</div>`)}

    ${section('💬', 'Questions to Ask Microsoft in the First Meeting', `<div class="questions-list">${questions.map(q => `<div class="question-item">"${q}"</div>`).join('')}</div>`)}

    ${section('⚠️', 'Risk Factors & Mitigations', `<div class="risk-grid">${risks.map(r => `
      <div class="risk-card ${r.level}">
        <div class="risk-title">${r.title}</div>
        <div class="risk-desc">${r.desc}</div>
      </div>`).join('')}</div>`)}

  </div>
  <div class="proxima-strategy-footer" style="margin-top:32px;padding-top:16px;border-top:1px solid var(--border);text-align:center;font-size:.78rem;color:var(--text-muted);font-style:italic;">
    Intended for Proxima use only — please contact Brian Chernauskas with questions
  </div>
</div>`;
}

function section(icon, title, content, badge = '') {
  return `<div class="strategy-section">
    <div class="section-header"><span class="section-icon">${icon}</span><h3>${title}</h3>${badge}</div>
    <div class="section-content">${content}</div>
  </div>`;
}

// ─── Estate table ────────────────────────────────────────────────────────────
function estateHTML(s, lines) {
  const prioLabel = { top: ['prio-top', 'Top priority'], high: ['prio-high', 'High'], med: ['prio-med', 'Medium'], low: ['prio-low', 'Low'] };
  const tradeable = lines.filter(l => l.priority === 'top').map(l => l.name);
  const intro = `<p class="estate-intro">Microsoft's appetite column is the key to the deal. Lines Microsoft is pushing hardest are where it has discretionary funding, and where a commitment from you buys the most. Lines it treats as low priority are where you should expect the least movement and rely on alternatives instead.${tradeable.length ? ` In this estate, <strong>${tradeable.join(', ')}</strong> ${tradeable.length === 1 ? 'is' : 'are'} your strongest trade currency.` : ''}</p>`;
  const msTier = s.totalMsSpend ? 'ms-' + s.totalMsSpend : null;
  const insights = {};
  lines.forEach(l => {
    insights[l.key] = l.key === 'azure'
      ? getProximaInsight('azure', AZURE_TO_CAL_TIER[s.annualSpend])
      : getProximaInsight('microsoft', msTier, l.key);
  });
  const dealNote = i => i ? `<div class="line-sub" style="font-weight:600;color:#0E7490;margin-top:3px">Proxima: ${i.count} deal${i.count !== 1 ? 's' : ''}${i.tierMatch ? ' at tier' : ''}, avg ${i.avg}%${i.count > 1 ? ` (${i.lo}–${i.hi}%)` : ''}</div>` : '';
  const estateDeals = getProximaInsight('microsoft', msTier, 'estate');
  const calibrated = lines.filter(l => l.key !== 'azure' && insights[l.key]).map(l => l.name);
  const table = `<div class="table-wrap"><table class="estate-table">
    <thead><tr><th>Product line</th><th>Target</th><th>Microsoft appetite</th><th>Primary lever</th><th>2026 pricing event</th></tr></thead>
    <tbody>${lines.map(l => `<tr>
      <td><div class="line-name">${l.name}</div><div class="line-sub">${l.sub}</div></td>
      <td class="num">${l.lo}–${l.hi}%<div class="line-sub" style="font-weight:400">${l.unit}</div>${dealNote(insights[l.key])}</td>
      <td><span class="prio ${prioLabel[l.priority][0]}">${prioLabel[l.priority][1]}</span></td>
      <td style="color:var(--text-secondary)">${l.lever}</td>
      <td style="color:var(--text-muted);font-size:.76rem">${l.event}</td>
    </tr>`).join('')}</tbody>
  </table></div>`;
  const note = `<div class="alert alert-info" style="margin-top:14px;"><span class="alert-icon">📐</span><div><strong>Insist on line-item pricing.</strong> Microsoft prefers to quote a single blended bundle number, which lets a price increase on one line hide behind a discount on another. Ask for every line priced separately against current list, so each discount can be checked against its own target above. The Azure range uses the Azure planner's calibrated model. ${calibrated.length ? `Logged Proxima deals are shown against ${calibrated.join(', ')}; lines without deal data use planning ranges.` : 'The other lines use planning ranges until Microsoft deals are logged by product line in Deal Calibration.'}</div></div>`;
  const blended = estateDeals ? `<div style="margin-top:10px;padding:10px 14px;background:rgba(14,165,164,.08);border:1px solid rgba(14,165,164,.3);border-radius:8px;font-size:.82rem;"><strong style="color:#0E7490">📊 Proxima whole-estate deals</strong> <span style="color:var(--text-muted)">${estateDeals.count} deal${estateDeals.count !== 1 ? 's' : ''}${estateDeals.tierMatch ? ' at this total-spend tier' : ' across all tiers'}: blended avg <strong>${estateDeals.avg}%</strong>, range <strong>${estateDeals.lo}–${estateDeals.hi}%</strong>. Use as a sanity check on the blended outcome, not as a target for any single line.</span></div>` : '';
  return intro + table + blended + note;
}

// ─── Trade matrix ────────────────────────────────────────────────────────────
function tradeMatrixHTML(s) {
  const rows = [];
  if (inEstate(s, 'copilot') || exp(s, 'copilot-adopt')) rows.push(['A ramped Copilot commitment (named seat counts by quarter)', 'Microsoft\'s most visible AI growth metric; field teams are measured on seat adoption', 'Copilot discount with a price hold for the term, seat swap rights, and Azure ACD or credit uplift funded from the AI win']);
  if (exp(s, 'e5-upgrade') || exp(s, 'e7-consider')) rows.push([exp(s, 'e7-consider') ? 'An E5 or E7 step-up for a defined population' : 'An E3 → E5 upgrade for a defined population', 'Suite step-ups raise per-user revenue on the installed base', 'Upgrade priced to offset the July 2026 increase on the rest of the estate; step-up only for users who will use it']);
  if (exp(s, 'security-consolidate') || s.securityPosition === 'third-party' || s.securityPosition === 'considering-consolidation') rows.push(['Retiring a named third-party security tool', 'Competitive displacement of CrowdStrike, Palo Alto, Okta, and similar vendors is separately funded', 'Deep discount on the security line, overlap period funded so you do not pay twice during cutover, and deployment services']);
  if (inEstate(s, 'azure') && (exp(s, 'azure-migrate') || ['planning', 'in-progress'].includes(s.migrationStatus))) rows.push(['Azure migration of named workloads or a datacenter exit', 'Consumption growth is what Azure field teams are measured on', 'Migration credits (ACO), partner-funded migration, ramped MACC with forgiven early shortfall']);
  if (inEstate(s, 'azure') && s.desiredTerm === '3yr') rows.push(['A 3-year MACC at a defensible commitment level', 'Committed consumption is booked revenue Microsoft can forecast', 'Higher ACD, marketplace eligibility, and an explicit price protection addendum']);
  if (s.dynamicsPosition === 'competing' || s.dynamicsPosition === 'new-purchase' || exp(s, 'dynamics-expand')) rows.push(['A Dynamics 365 decision over Salesforce, SAP, or ServiceNow', 'Business applications share gain is a strategic priority with its own investment funds', 'Competitive Dynamics pricing, implementation funding, and Copilot Credit allowance for agent workloads']);
  if (exp(s, 'github-expand') || s.githubPosition === 'competing') rows.push(['GitHub Copilot for your developer population', 'AI coding assistants are a contested category', 'GitHub Copilot pricing below list and GitHub spend counted toward MACC where eligible']);
  if (s.desiredTerm === '3yr' && !inEstate(s, 'azure')) rows.push(['A 3-year term', 'Revenue certainty', 'Price protection on every line for the full term, including seats added mid-term']);
  rows.push(['Reference, case study, or early-adopter participation', 'Low-cost marketing value to Microsoft', 'Additional credits or services; only offer after the commercial terms are agreed']);

  const intro = '<p class="estate-intro">Give Microsoft something it is measured on, and ask for value on the lines where it is not. Every "give" should be conditional and should land in the same signature as the "get". A commitment made in one negotiation and repaid in the next is rarely repaid.</p>';
  return intro + `<div class="table-wrap"><table class="estate-table">
    <thead><tr><th>You give</th><th>Why Microsoft values it</th><th>Ask in return</th></tr></thead>
    <tbody>${rows.map(([g, w, a]) => `<tr><td class="line-name" style="font-weight:600">${g}</td><td style="color:var(--text-secondary)">${w}</td><td>${a}</td></tr>`).join('')}</tbody>
  </table></div>`;
}

// ─── M365 exposure ───────────────────────────────────────────────────────────
function m365ExposureHTML(s) {
  const e = m365Exposure(s);
  if (!e) return '';
  const protectedEA = isEA(s) && s.eaTermStart === 'pre-increase';
  const when = protectedEA ? 'Lands at your EA renewal' : isEA(s) && s.eaTermStart === 'post-increase' ? 'Already in your current EA pricing' : 'Applies at your next renewal after July 1, 2026';
  const cards = `<div class="exposure-grid">
    <div class="exposure-card"><div class="ex-label">Predominant suite</div><div class="ex-value">${e.suite.label}</div><div class="ex-note">List ${e.suite.from} → ${e.suite.to} per user/month</div></div>
    <div class="exposure-card"><div class="ex-label">Annual list uplift</div><div class="ex-value">${e.suite.uplift ? `${money(e.lo)}–${money(e.hi)}` : 'No suite increase'}</div><div class="ex-note">${e.band.label} seats, before discount</div></div>
    <div class="exposure-card"><div class="ex-label">Timing</div><div class="ex-value" style="font-size:1rem">${when}</div><div class="ex-note">Effective ${MS_CONTEXT.m365Increase}</div></div>
  </div>`;
  let body;
  if (s.m365Suite === 'm365-e7') {
    body = '<strong>E7 carried no July 2026 suite increase, because it launched at $99 per user per month on May 1, 2026.</strong> The question for E7 is not the uplift but whether the bundle matches use. Price E7 against E5 plus Copilot plus Entra Suite for the users who genuinely use all three, and keep users who do not on E5 or E3.';
  } else if (s.m365Suite === 'o365-e1') {
    body = '<strong>Office 365 E1 held flat in the July 2026 change.</strong> Expect Microsoft to use the increase elsewhere in the catalogue to position E3 upgrades as timely. Evaluate any upgrade on feature need, not on price anchoring.';
  } else if (protectedEA) {
    body = `<strong>Your EA term began before the increase, so you are still paying pre-increase suite pricing.</strong> The uplift arrives at your renewal. Renewing early would bring it forward, not avoid it. Two actions: add genuinely needed seats and upgrades at your anniversary true-ups while locked pricing still applies, and open the renewal with the increase already quantified so it becomes a number to negotiate down rather than a surprise to absorb.`;
  } else {
    body = `<strong>The July 2026 increase has taken effect, or takes effect at your next renewal.</strong> Before negotiating discount against the new list, remove the seats that should not be renewed at all. Reclaimed and right-sized seats avoid the increase entirely, while a discount only reduces it.`;
  }
  const frontline = s.frontlineWorkers === 'significant'
    ? '<div class="alert alert-danger" style="margin-top:12px;"><span class="alert-icon">👷</span><div><strong>Frontline plans took the steepest increases, reported at 25–43% depending on plan.</strong> With a significant frontline population, model F1/F3 separately. The per-user amounts are small, but the percentage on a large headcount often outweighs the E3/E5 uplift. Check that every F-licensed user genuinely qualifies, and that no knowledge workers are licensed as frontline to save money, which becomes a compliance exposure.</div></div>'
    : s.frontlineWorkers === 'some' ? '<div class="alert alert-warning" style="margin-top:12px;"><span class="alert-icon">👷</span><div><strong>Frontline plans took the steepest percentage increases (reported 25–43%).</strong> Model F1/F3 seats separately from the suite figure above.</div></div>' : '';
  return cards + `<div class="alert alert-warning"><span class="alert-icon">📈</span><div>${body}</div></div>` + frontline +
    '<div style="margin-top:10px;font-size:.76rem;color:var(--text-muted);">Exposure is list-price arithmetic on the seat band and predominant suite, excluding frontline plans and standalone SKUs. Teams and Copilot standalone SKUs were not part of the increase. Microsoft says the added value includes Defender for Office 365 P1 in E3, Intune enhancements, and Security Copilot capacity in E5. Verify against actual invoices before presenting.</div>';
}

// ─── Azure section ───────────────────────────────────────────────────────────
function azureHTML(s, line) {
  const proxima = getProximaInsight('azure', AZURE_TO_CAL_TIER[s.annualSpend]);
  const mid = Math.round((line.lo + line.hi) / 2);
  const rows = [];
  if (s.multicloud === 'multi-cloud') rows.push(['Multi-cloud positioning (credible competitive threat)', '+5–9%', 'success']);
  else if (s.multicloud === 'evaluating') rows.push(['Active AWS/GCP evaluation', '+3–7%', 'success']);
  if (s.desiredTerm === '3yr') rows.push(['3-year MACC commitment', '+3–5%', 'success']);
  if (exp(s, 'copilot-adopt')) rows.push(['Copilot expansion in the same motion', '+2–5%', 'success']);
  if (exp(s, 'm365-expand') || exp(s, 'e5-upgrade')) rows.push(['M365 seat or suite growth in the same motion', '+2–4%', 'success']);
  if (exp(s, 'dynamics-expand')) rows.push(['Dynamics 365 expansion in the same motion', '+2–4%', 'success']);
  if ((MS_SPEND_TIERS[s.totalMsSpend] ?? 0) > (SPEND_TIERS[s.annualSpend]?.tier ?? 0)) rows.push(['Total Microsoft account value exceeds Azure spend alone', '+2–6%', 'success']);
  if (s.spendGrowth === 'fast' || s.spendGrowth === 'hypergrowth') rows.push(['Azure consumption growing fast', '+1–3%', 'success']);
  if (s.spendGrowth === 'declining') rows.push(['Azure consumption declining', '−2–4%', 'danger']);
  if (s.commitUtilization === 'over100') rows.push(['Exceeded prior commitment', '+1–2%', 'success']);
  if (s.commitUtilization === 'under70') rows.push(['Prior MACC shortfall', '−2–5%', 'danger']);

  const hasSA = s.onpremLicenses.includes('windows-server') || s.onpremLicenses.includes('sql-server');
  const ahb = hasSA && ['not-applied', 'partially'].includes(s.hybridBenefitStatus)
    ? '<div class="alert alert-warning" style="margin-top:14px;"><span class="alert-icon">⚡</span><div><strong>Azure Hybrid Benefit is not fully applied.</strong> It saves 40–75% on eligible Windows Server and SQL Server VMs, independent of any negotiated discount. Apply it before sizing the MACC, and make sure any Software Assurance renewal in the same deal is valued against it.</div></div>' : '';

  return `<div class="discount-estimate">
      <div><div class="de-range">${line.lo}–${line.hi}%</div><div class="de-label">off Azure list price (ACD)</div></div>
      <div class="de-bar-wrap">
        <div class="de-bar-bg"><div class="de-bar-fill" style="width:${Math.min(line.hi * 2.2, 100)}%"></div></div>
        <div class="de-note">Midpoint target: <strong>${mid}%</strong> · Walk-away floor: <strong>${line.lo}%</strong> · Stretch goal: <strong>${line.hi}%</strong></div>
      </div>
    </div>
    ${proxima ? `<div style="margin-top:10px;padding:10px 14px;background:rgba(0,120,212,.08);border:1px solid rgba(0,120,212,.25);border-radius:8px;font-size:.82rem;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
      <span style="font-weight:700;color:#0078d4;">📊 Proxima Deal Data</span>
      <span style="color:var(--text-muted);">Based on <strong>${proxima.count} Azure deal${proxima.count !== 1 ? 's' : ''}</strong>${proxima.tierMatch ? ' at this spend tier' : ' across all tiers'}: observed avg <strong>${proxima.avg}%</strong>, range <strong>${proxima.lo}–${proxima.hi}%</strong></span>
    </div>` : ''}
    ${rows.length ? `<table style="width:100%;margin-top:16px;border-collapse:collapse;font-size:.82rem;">
      <thead><tr style="border-bottom:1px solid var(--border);"><th style="text-align:left;padding:6px 0;color:var(--text-secondary);font-weight:600;">Factor</th><th style="text-align:right;padding:6px 0;color:var(--text-secondary);font-weight:600;">Impact</th></tr></thead>
      <tbody>${rows.map(([l, v, c]) => `<tr style="border-bottom:1px solid var(--surface-3);"><td style="padding:7px 0;">${l}</td><td style="padding:7px 0;text-align:right;font-weight:700;color:var(--${c})">${v}</td></tr>`).join('')}</tbody>
    </table>` : ''}
    ${ahb}
    <div class="alert alert-info" style="margin-top:14px;"><span class="alert-icon">📏</span><div><strong>Size the MACC separately from the seat deal.</strong> A bundle discussion makes it tempting to raise the Azure commitment in exchange for better M365 pricing. Shortfall on an oversized MACC is paid in cash, while the M365 discount it bought is spread thin across seats. Commit at 80–85% of optimised projected consumption, and let bundle value show up as ACD or credits instead.</div></div>`;
}

// ─── Price protection ────────────────────────────────────────────────────────
function priceProtectionBadge(s) {
  if (isEA(s)) return s.eaTermStart === 'pre-increase' ? 'Protected until renewal' : 'Protected for term';
  if (isMCAE(s) || isCSP(s) || s.agreementType === 'mixed') return 'Exposed';
  return 'No protection';
}

function priceProtectionHTML(s) {
  const onEA = isEA(s), onMCA = isMCAE(s), onCSP = isCSP(s);
  const rows = [
    ['Automatic price lock for the term', 'Yes — 3 years', 'No', 'No'],
    ['New seats added at locked price', 'Yes', 'No — at prevailing rate', 'No — at prevailing rate'],
    ['July 2026 M365 increase', 'Deferred to renewal if term began earlier', 'At next renewal', 'At next subscription renewal'],
    ['Mid-term unit price changes possible', 'No', 'Yes', 'Yes'],
    ['Quantities reducible', 'At renewal only', 'Varies by term', 'At subscription renewal'],
    ['Renewal creates a negotiation moment', 'Yes — fixed renewal date', 'Weaker — evergreen structure', 'Annual'],
  ];
  let lead;
  if (onEA) {
    lead = s.eaTermStart === 'pre-increase'
      ? `<div class="alert alert-success" style="margin-bottom:14px;"><span class="alert-icon">🔒</span><div><strong>You hold pre-increase pricing until renewal, and that protection has an end date.</strong> The EA holds price-list pricing for its term, so the July 2026 suite increase and the ${MS_CONTEXT.levelsRemoved} removal of Levels B–D both reach you at renewal rather than now. Do not renew early: an early renewal moves you onto current pricing sooner. Instead, use the remaining term to true up seats and upgrades you genuinely need at locked prices, and treat renewal as a clean-sheet negotiation.</div></div>`
      : `<div class="alert alert-success" style="margin-bottom:14px;"><span class="alert-icon">🔒</span><div><strong>Your EA locks current pricing for the term.</strong> It is the strongest price protection Microsoft offers, and new seats are added at the locked rate. Keep that in mind if Microsoft proposes moving you to MCA-E before the term ends.</div></div>`;
  } else if (onMCA) {
    lead = '<div class="alert alert-danger" style="margin-bottom:14px;"><span class="alert-icon">🚨</span><div><strong>You have no automatic price protection.</strong> MCA-E lets Microsoft update unit rates during the term. A price protection addendum naming the SKUs it covers, across Azure and seat products, is the single highest-value term to secure.</div></div>';
  } else if (onCSP) {
    lead = '<div class="alert alert-warning" style="margin-bottom:14px;"><span class="alert-icon">⚠️</span><div><strong>CSP annual subscriptions carry no price lock.</strong> Partner economics can beat direct pricing, but rate stability is not part of the package. Get any rate commitment from the partner in writing.</div></div>';
  } else if (s.agreementType === 'mixed') {
    lead = '<div class="alert alert-warning" style="margin-bottom:14px;"><span class="alert-icon">🧩</span><div><strong>Mixed agreements mean mixed protection.</strong> Lines on an EA are locked for its term. Lines on MCA-E or CSP are not. Map every product line to its agreement and renewal date before the first meeting, because Microsoft will steer growth onto whichever paper suits it.</div></div>';
  } else {
    lead = '<div class="alert alert-warning" style="margin-bottom:14px;"><span class="alert-icon">⚠️</span><div><strong>No agreement-level price protection applies today.</strong> At your spend, rate stability has to be negotiated as an explicit term.</div></div>';
  }
  const migration = onEA
    ? `<div class="alert alert-warning" style="margin-top:14px;"><span class="alert-icon">📋</span><div><strong>If Microsoft proposes MCA-E, price what you give up.</strong> Since ${MS_CONTEXT.eaToMcaeMigration} Microsoft has been moving EA customers with MACC plans to MCA-E, with the EA increasingly reserved for its largest customers. The automatic price lock, locked pricing on added seats, and the fixed renewal moment all fall away. A price protection addendum and fixed rate card are what you trade for agreeing to the move.</div></div>`
    : '<div class="alert alert-info" style="margin-top:14px;"><span class="alert-icon">ℹ️</span><div><strong>Price protection is negotiable, not automatic.</strong> Ask for an addendum stating unit rates will not increase during the term, naming the specific SKUs across Azure, M365, Copilot, and Dynamics. Microsoft resists blanket locks but often fixes rates on a named subset.</div></div>';
  const table = `<div class="table-wrap"><table class="estate-table">
    <thead><tr><th>Protection</th><th style="text-align:center">EA</th><th style="text-align:center">MCA-E</th><th style="text-align:center">CSP</th></tr></thead>
    <tbody>${rows.map(([f, ea, mc, csp]) => `<tr><td>${f}</td><td style="text-align:center;${onEA ? 'font-weight:700' : ''}">${ea}</td><td style="text-align:center;${onMCA ? 'font-weight:700' : ''}">${mc}</td><td style="text-align:center;${onCSP ? 'font-weight:700' : ''}">${csp}</td></tr>`).join('')}</tbody>
  </table></div>`;
  return lead + table + migration;
}

// ─── Unified Support ─────────────────────────────────────────────────────────
function supportHTML(s) {
  const alt = s.supportAlternative;
  const lead = alt === 'quoted' || alt === 'using'
    ? '<strong>You have a third-party alternative priced, which is the strongest lever on Unified.</strong> Present the quote as a genuine option. Advisory firms report that most enterprises presenting a credible third-party estimate receive a Unified discount, even without switching.'
    : '<strong>Get a third-party support quote before renewal.</strong> Unified Support is priced as a share of Microsoft spend, so the 2026 licence increases raise the fee automatically without any change in service. A third-party quote is the fastest way to reset that anchor.';
  return `<div class="alert alert-info"><span class="alert-icon">🎧</span><div>${lead}
    <div style="margin-top:9px;">Ask for three things: a fixed annual fee in place of a percentage of spend, so the Copilot, Azure, and seat growth you negotiate elsewhere does not flow through to support; exclusion of Azure consumption and new AI SKUs from the fee base; and proactive hours you will actually use, not a bank that expires.</div></div></div>`;
}

// ─── Alerts ──────────────────────────────────────────────────────────────────
function buildAlerts(s) {
  const alerts = [];
  const q = nextMicrosoftQuarterEnd();
  if (s.renewalTimeline === 'within-1mo') {
    alerts.push({ type: 'danger', icon: '🚨', text: '<strong>Less than 30 days to renewal.</strong> Do not sign under deadline pressure. Request a short extension of current terms while the full estate is negotiated. Signing one line in a rush removes it from the bundle.' });
  }
  if (isEA(s) && s.eaTermStart === 'pre-increase' && ['within-1mo', '1-3mo', '3-6mo', '6-12mo'].includes(s.renewalTimeline)) {
    alerts.push({ type: 'warning', icon: '📈', text: `<strong>Your renewal is when the July 2026 increase and the Level B–D removal both land.</strong> You have been paying pre-increase pricing. Quantify the combined uplift now and open the renewal with it, so the negotiation starts from "offset this" rather than from the new list price.` });
  }
  if (['level-b', 'level-c', 'level-d'].includes(s.eaPricingLevel)) {
    const lvl = s.eaPricingLevel.slice(-1).toUpperCase();
    alerts.push({ type: 'danger', icon: '🚨', text: `<strong>Your Level ${lvl} pricing does not carry forward.</strong> Microsoft removed EA pricing Levels B–D for online services in ${MS_CONTEXT.levelsRemoved}. Advisory firms report resets of about 6% (B), 9% (C), and up to 12% (D) for customers who renew without renegotiating. Get any continued discount written into the signed agreement.` });
  }
  if (inEstate(s, 'copilot') || exp(s, 'copilot-adopt')) {
    alerts.push({ type: 'warning', icon: '🤖', text: `<strong>Copilot volume pricing is now negotiated, not automatic.</strong> The partner-reported volume discount ladder on the $30 Copilot add-on ended ${MS_CONTEXT.copilotLadderEnded}. Any discount now has to be won in the deal. ${s.copilotAdoption === 'weak' || s.copilotAdoption === 'mixed' ? 'Usage on the seats you already have is weak or uneven, so fix adoption or reduce seats before committing to more. Microsoft will treat idle seats as your problem, not a pricing argument.' : 'Tie seat growth to measured usage, and secure reduction or swap rights.'}` });
  }
  if ((s.aiBuilderReliance === 'heavy' || s.aiBuilderReliance === 'some' || s.aiBuilderReliance === 'unknown') && (inEstate(s, 'power-platform') || inEstate(s, 'dynamics'))) {
    alerts.push({ type: s.aiBuilderReliance === 'heavy' ? 'danger' : 'warning', icon: '⏳', text: `<strong>Seeded AI Builder credits are removed ${MS_CONTEXT.aiBuilderSunset}.</strong> The removal covers new and existing customers, including those on EAs. Workloads relying on them will need metered Copilot Credits. ${s.aiBuilderReliance === 'unknown' ? 'Inventory which flows and models consume AI Builder credits now.' : 'Negotiate a Copilot Credit transition allowance in this deal, rather than buying at list after the cut-off.'}` });
  }
  if (inEstate(s, 'm365') && s.m365Reclamation === 'never') {
    alerts.push({ type: 'warning', icon: '📋', text: '<strong>Run a licence reclamation pass before quoting seat counts.</strong> Practitioners report 7–19% of M365 licences are unused in estates that have never been audited. Every reclaimed seat avoids the July 2026 increase entirely, which is worth more than any discount on it.' });
  }
  if (s.e5Utilization === 'low' && ['m365-e5', 'mixed', 'm365-e7'].includes(s.m365Suite)) {
    alerts.push({ type: 'warning', icon: '🎚️', text: '<strong>E5 is paying for features most users do not use.</strong> Before renewal, segment users: keep E5 where security, compliance, or voice features are used, and move the rest to E3 with targeted add-ons. Microsoft will resist step-downs at renewal, so raise it early and pair it with a growth commitment elsewhere.' });
  }
  if (s.auditHistory === 'active') {
    alerts.push({ type: 'danger', icon: '🔍', text: '<strong>Resolve the open audit or SAM engagement before negotiating.</strong> An unresolved compliance position lets Microsoft convert findings into mandatory purchases inside the renewal. Settle the effective licence position first, then negotiate new commitments separately.' });
  } else if (s.auditHistory === 'unknown') {
    alerts.push({ type: 'info', icon: '🔍', text: '<strong>Baseline your licence position before renewal.</strong> Knowing your own effective licence position removes the risk of a compliance finding being used as leverage mid-negotiation.' });
  }
  if (inEstate(s, 'azure') && s.multicloud === 'azure-only' && (SPEND_TIERS[s.annualSpend]?.tier ?? 0) >= 3) {
    alerts.push({ type: 'warning', icon: '⚡', text: '<strong>No competitive alternative for Azure.</strong> At your Azure spend, entering MACC negotiations with no AWS or GCP pricing can cost 5–10 points of ACD. Request formal pricing for one or two named workloads before the first meeting.' });
  }
  if (inEstate(s, 'azure') && s.useCases.includes('ai-ml') && (s.compliance.includes('gdpr') || s.compliance.includes('fedramp'))) {
    alerts.push({ type: 'info', icon: '🌍', text: `<strong>Regional AI Foundry deployments cost more than global.</strong> Since ${MS_CONTEXT.foundryRegional}, deployments outside the global region carry a premium: EU Data Zone +9%, other regions +7–16%, APAC Data Zone +20%. Size AI consumption commitments at the regional rate.` });
  }
  if (s.cotermStatus === 'staggered' || s.agreementType === 'mixed') {
    alerts.push({ type: 'info', icon: '🗓️', text: '<strong>Staggered renewal dates split your leverage.</strong> Microsoft negotiates each agreement on its own date, so no single renewal carries your full account value. Use this renewal to co-term the others, even via a short extension, so the next cycle is one negotiation.' });
  }
  if (q.days <= 45) {
    alerts.push({ type: 'success', icon: '📆', text: `<strong>Microsoft ${q.label} closes ${q.end.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} — ${q.days} day${q.days !== 1 ? 's' : ''} away.</strong> ${q.isYearEnd ? 'Fiscal year-end is Microsoft\'s strongest close incentive.' : 'Account teams carry quarterly targets.'} ${['within-1mo', '1-3mo'].includes(s.renewalTimeline) ? 'If terms can be ready, a signature in the final week is worth pursuing.' : 'Do not rush an unready deal into this quarter; the next quarter-end is just as usable.'}` });
  }
  return alerts;
}

// ─── Tactics ─────────────────────────────────────────────────────────────────
function buildTactics(s) {
  const t = [];
  const lines = s.estate || [];
  const tier = SPEND_TIERS[s.annualSpend]?.tier ?? 0;

  if (lines.length >= 2) {
    t.push({ title: 'Negotiate the Estate in One Motion, Priced Line by Line', impact: 'high',
      desc: `Microsoft account teams are measured on total account value, and discount authority above field level is granted to deals that span products. Bring ${lines.length} product lines into a single negotiation and a single signature, but require every line to be priced separately against list. One motion gets the escalation; line-item pricing stops the bundle from hiding increases.` });
  }
  if (inEstate(s, 'm365') && s.m365Reclamation !== 'recent') {
    t.push({ title: 'Reclaim and Right-Size Seats Before Anything Is Quoted', impact: 'high',
      desc: 'Pull 90-day activity from the Microsoft 365 admin center, remove inactive licences, and move users who only use E3-level features off E5. Seats removed before renewal avoid the July 2026 increase entirely. Quote Microsoft the cleaned count from the start, because Microsoft prices renewal from the seat count it already sees.' });
  }
  if (inEstate(s, 'copilot') || exp(s, 'copilot-adopt')) {
    t.push({ title: 'Make Copilot the Currency, Not the Cost', impact: 'high',
      desc: `Copilot adoption is Microsoft's most closely watched growth metric. Offer a ramped commitment (named seat counts by quarter) conditional on terms across the estate: Copilot pricing held for the term, rights to reduce or reassign idle seats, and an Azure or M365 improvement funded by the AI win. ${s.copilotAdoption === 'weak' ? 'With weak usage on current seats, lead with an adoption plan and a smaller commitment. Buying ahead of usage is the most common Copilot overspend.' : 'Never commit to broad seats without usage evidence from the pilot.'}` });
  }
  if (s.productivityAlternative === 'formal' || s.productivityAlternative === 'partial') {
    t.push({ title: 'Put Google Workspace Pricing on the Table for Named Populations', impact: 'high',
      desc: 'A credible Workspace proposal for defined user groups (frontline, contractors, a business unit) is the only real competitive pressure on Microsoft 365 pricing. Keep it specific and costed. A whole-company threat is not believed; a 2,000-seat population with a migration plan is.' });
  } else if (inEstate(s, 'm365') && (SEAT_TIER[s.m365Seats] ?? 0) >= 2) {
    t.push({ title: 'Request Google Workspace Pricing for a Defined User Group', impact: 'medium',
      desc: 'Without any productivity alternative, Microsoft 365 pricing has no competitive anchor. A formal Workspace quote for a segment, such as frontline or contractors, costs little and gives the account team a documented reason to seek additional discount.' });
  }
  if (isEA(s) && s.eaTermStart === 'pre-increase') {
    t.push({ title: 'Use the Remaining EA Term; Do Not Renew Early', impact: 'high',
      desc: 'Your EA still carries pre-increase pricing. An early renewal now would move you onto post-July 2026 list pricing sooner. Hold the term, add genuinely needed seats and upgrades at anniversary true-ups at the locked rate, and treat the renewal itself as a clean-sheet negotiation where the uplift is the opening problem Microsoft has to solve.' });
  }
  if (isEA(s) && s.renewalTimeline !== '12plusmo') {
    t.push({ title: 'Treat the EA Renewal as a Full Renegotiation', impact: 'high',
      desc: `With Levels B–D gone since ${MS_CONTEXT.levelsRemoved}, nothing carries forward automatically. The auto-renewal proposal arrives 30–90 days before expiry and builds a new Azure commitment from trailing consumption, reported to land 15–30% above historical average. Open the negotiation before that proposal anchors it.` });
  }
  if (isMCAE(s) || isCSP(s) || s.agreementType === 'mixed') {
    t.push({ title: 'Negotiate a Price Protection Addendum Covering Every Line', impact: 'high',
      desc: 'Outside the EA, Microsoft can move unit rates during the term. Ask for an addendum naming the SKUs across Azure, M365 suites, Copilot, and Dynamics whose rates are fixed for the term, including for seats added mid-term. Microsoft resists blanket locks but fixes named subsets when the volume matters.' });
  }
  if (s.securityPosition === 'third-party' || s.securityPosition === 'considering-consolidation' || exp(s, 'security-consolidate')) {
    t.push({ title: 'Price Security Consolidation as a Competitive Takeout', impact: 'high',
      desc: 'Retiring a named CrowdStrike, Palo Alto, Okta, or SIEM contract is a competitive win Microsoft funds separately from standard discounting. Name the tools, their renewal dates, and their cost. Ask for security pricing that beats the incumbent, plus a funded overlap period so you are not paying both vendors during cutover.' });
  }
  if (s.dynamicsPosition === 'competing' || s.dynamicsPosition === 'new-purchase') {
    t.push({ title: 'Run the Business Applications Decision as a Real Competition', impact: 'high',
      desc: 'Dynamics 365 wins against Salesforce, SAP, and ServiceNow draw on dedicated investment funds. Keep the evaluation genuinely open until pricing is final, and ask for implementation funding and a Copilot Credit allowance for agent workloads, not just licence discount.' });
  }
  if (inEstate(s, 'azure')) {
    if (s.multicloud === 'azure-only') {
      t.push({ title: 'Create a Credible AWS or GCP Comparison for Named Workloads', impact: 'high',
        desc: 'Microsoft\'s competitive response playbooks unlock additional Azure discount when AWS or GCP is documented in the opportunity. Formal pricing for two or three representative workloads is enough to create it.' });
    } else if (['multi-cloud', 'evaluating'].includes(s.multicloud)) {
      t.push({ title: 'Price the Consolidation of Non-Azure Workloads', impact: 'high',
        desc: 'Frame part of the MACC as the price of moving AWS/GCP workloads to Azure. Consolidation deals draw competitive discount authority above standard ACD levels.' });
    }
    if (s.cspOpenness === 'open' || s.cspOpenness === 'unknown') {
      t.push({ title: 'Test an Azure-via-CSP Split', impact: 'medium',
        desc: 'Request Azure pricing from two or three CSP partners. Partner economics can add 8–15% effective discount versus direct, and a credible split adds leverage to the direct deal even if you do not move.' });
    }
    if (['unoptimized', 'partially'].includes(s.optimizationStatus)) {
      t.push({ title: 'Optimise Azure Before Sizing the MACC', impact: 'medium',
        desc: 'Advisor recommendations, right-sizing, and idle-resource cleanup typically find 15–30%. Commit at 80–85% of optimised projected consumption, not current run-rate.' });
    }
    if (exp(s, 'azure-migrate') || s.migrationStatus === 'planning') {
      t.push({ title: 'Request Migration Credits and Partner Funding', impact: 'medium',
        desc: 'Documented migration projects (datacenter exit, SAP, VMware) qualify for Azure credits and partner-delivered migration funding. Specific workloads and dates earn larger grants.' });
    }
    if (tier >= 2) {
      t.push({ title: 'Confirm Reservations and Savings Plans Stack on ACD', impact: 'medium',
        desc: 'Get written confirmation that reservation and savings plan discounts apply to ACD-discounted rates, not list.' });
    }
  }
  if (inEstate(s, 'unified-support') || s.supportTier === 'unified') {
    t.push({ title: 'Decouple Unified Support from Licence Spend', impact: s.supportAlternative === 'quoted' ? 'high' : 'medium',
      desc: 'Unified fees rise with Microsoft spend, so every other line you grow raises support cost. Present a third-party quote and ask for a fixed annual fee with Azure consumption and new AI SKUs excluded from the base.' });
  }
  if ((s.aiBuilderReliance === 'heavy' || s.aiBuilderReliance === 'some') && (inEstate(s, 'power-platform') || inEstate(s, 'dynamics'))) {
    t.push({ title: 'Secure a Copilot Credit Transition Allowance', impact: 'medium',
      desc: `Seeded AI Builder credits end ${MS_CONTEXT.aiBuilderSunset}. Quantify the monthly consumption that depends on them, and negotiate a Copilot Credit allowance at a fixed rate as part of this deal, before the cut-off leaves you buying at list.` });
  }
  if (exp(s, 'e7-consider')) {
    t.push({ title: 'Price E7 Against the Components You Would Actually Use', impact: 'medium',
      desc: 'E7 ($99/user/month since May 2026) bundles E5, Copilot, Agent 365, and Entra Suite. For most estates it only fits a subset of users. Price E5 + Copilot for heavy users and E3 for the rest, and let Microsoft show where E7 beats that mix.' });
  }
  if (s.githubPosition === 'competing' || exp(s, 'github-expand')) {
    t.push({ title: 'Bring GitHub Copilot into the Microsoft Motion', impact: 'medium',
      desc: 'AI coding tools are a contested category. Use competing tool pricing for GitHub Copilot, and confirm whether GitHub spend can count toward your Azure commitment.' });
  }
  if (s.cotermStatus === 'staggered' || s.agreementType === 'mixed') {
    t.push({ title: 'Co-Term Agreements to One Renewal Date', impact: 'medium',
      desc: 'Negotiate short extensions or prorated terms so every Microsoft agreement renews together next cycle. Combined renewals move approval above field level, which is where larger discounts are signed off.' });
  }
  const q = nextMicrosoftQuarterEnd();
  if (['3-6mo', '6-12mo', '12plusmo'].includes(s.renewalTimeline)) {
    t.push({ title: 'Target a Microsoft Quarter-End Signature', impact: 'medium',
      desc: `Microsoft's fiscal year ends June 30, with quarters closing September 30, December 31, and March 31. The next is ${q.label} on ${q.end.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}. Start 6–8 weeks ahead and aim to sign in the final week, with the June year-end the strongest of all.` });
  }
  t.push({ title: 'Establish Your BATNA for Each Line', impact: 'low',
    desc: 'Know the walk-away for every line: month-to-month extension, CSP for Azure, Workspace for a population, third-party support, or a competing application. Signal alternatives through visible evaluation activity rather than stating them.' });

  const rank = { high: 0, medium: 1, low: 2 };
  return t.map((x, i) => ({ x, i }))
    .sort((a, b) => rank[a.x.impact] - rank[b.x.impact] || a.i - b.i)
    .map(o => o.x)
    .slice(0, 14);
}

// ─── Concessions ─────────────────────────────────────────────────────────────
function buildConcessions(s) {
  const c = [];
  c.push({ icon: '🧾', title: 'Line-Item Pricing', desc: 'Every product line priced separately against current list in the signed documents, so no increase hides inside a blended bundle number.', priority: 'must' });
  c.push({ icon: '🔒', title: 'Price Protection Across Lines', desc: 'Named-SKU rate lock for the term covering Azure, M365 suites, Copilot, and Dynamics, including seats added mid-term.', priority: isEA(s) ? 'should' : 'must' });
  if (inEstate(s, 'copilot') || exp(s, 'copilot-adopt')) {
    c.push({ icon: '🤖', title: 'Copilot Flex Rights', desc: 'Ramped seat counts, rights to reassign idle seats, and a reduction right at each anniversary if adoption targets are not met.', priority: 'must' });
  }
  if (inEstate(s, 'm365')) {
    c.push({ icon: '🎚️', title: 'Suite Step-Down Rights', desc: 'Right to move users between E5 and E3 (or E7 and E5) at anniversaries without penalty, so suite mix can follow real usage.', priority: 'should' });
  }
  if (inEstate(s, 'azure')) {
    c.push({ icon: '🔄', title: 'MACC Ramp & Shortfall Terms', desc: 'Early-period shortfall forgiven or rolled forward; ramped annual commitment rather than flat.', priority: 'must' });
    c.push({ icon: '📦', title: 'Reservation Stacking Confirmation', desc: 'Written confirmation that reservations and savings plans apply on top of ACD.', priority: 'should' });
    if (exp(s, 'azure-migrate') || ['planning', 'in-progress'].includes(s.migrationStatus)) {
      c.push({ icon: '✈️', title: 'Migration Credits & Partner Funding', desc: 'Azure credits and funded partner delivery for named migration workloads.', priority: 'must' });
    }
  }
  if ((s.aiBuilderReliance === 'heavy' || s.aiBuilderReliance === 'some') && (inEstate(s, 'power-platform') || inEstate(s, 'dynamics'))) {
    c.push({ icon: '⏳', title: 'Copilot Credit Transition Pack', desc: `Copilot Credit allowance at a fixed rate to cover workloads that relied on seeded AI Builder credits ending ${MS_CONTEXT.aiBuilderSunset}.`, priority: s.aiBuilderReliance === 'heavy' ? 'must' : 'should' });
  }
  if (s.securityPosition === 'third-party' || s.securityPosition === 'considering-consolidation' || exp(s, 'security-consolidate')) {
    c.push({ icon: '🛡️', title: 'Funded Security Overlap', desc: 'Microsoft security licences free or discounted until the incumbent contract expires, plus deployment services.', priority: 'must' });
  }
  if (inEstate(s, 'unified-support') || s.supportTier === 'unified') {
    c.push({ icon: '🎧', title: 'Fixed-Fee Unified Support', desc: 'Annual fee capped in dollars, not a percentage of spend; Azure consumption and AI SKUs excluded from the base.', priority: 'must' });
  }
  if (s.auditHistory !== 'clean') {
    c.push({ icon: '🔍', title: 'Licence Position Certification', desc: 'Written confirmation of effective licence position at signature, closing any look-back on prior periods.', priority: s.auditHistory === 'active' ? 'must' : 'should' });
  }
  c.push({ icon: '🔁', title: 'No Silent Auto-Renewal', desc: '90-day notice before any auto-renewal, and no renewal commitment proposal without a negotiation window.', priority: 'should' });
  c.push({ icon: '📌', title: 'Pricing Schedule Freeze', desc: 'Pin every reference to Microsoft\'s published price lists to a dated snapshot so pricing cannot change mid-term without a signed amendment.', priority: 'must' });
  c.push({ icon: '📉', title: 'Price-Down (MFN) Trigger', desc: 'If Microsoft cuts published rates on any SKU you consume, the lower rate applies within 30 days with your discount still stacked.', priority: 'should' });
  c.push({ icon: '👩‍💻', title: 'FastTrack & Adoption Services', desc: 'Funded deployment and adoption services for Copilot, security, and migration workloads.', priority: (MS_SPEND_TIERS[s.totalMsSpend] ?? 0) >= 3 ? 'should' : 'nice' });
  if (s.compliance.includes('fedramp') || s.industry === 'government') {
    c.push({ icon: '🏛️', title: 'Sovereign / Government Cloud Terms', desc: 'Pricing parity for GCC / Azure Government SKUs and compliance architecture support.', priority: 'should' });
  }
  return c;
}

// ─── Timeline ────────────────────────────────────────────────────────────────
function buildTimeline(s) {
  const urgent = ['within-1mo', '1-3mo'].includes(s.renewalTimeline);
  return [
    { phase: 'P1', when: urgent ? 'Week 1 (Immediate)' : 'Months 9–12 Before Renewal', title: 'Estate Baseline',
      desc: 'Know every line, its agreement, its renewal date, and its real usage before Microsoft does.',
      tasks: [
        'Map every Microsoft agreement, product line, SKU count, and renewal date into one inventory',
        inEstate(s, 'm365') ? 'Pull 90-day M365 activity; reclaim inactive seats and segment E5 users by feature use' : 'Confirm licence counts against active users for each seat-based product',
        inEstate(s, 'copilot') ? 'Measure Copilot usage per licensed user; identify idle seats' : 'Decide whether Copilot belongs in this negotiation as a trade',
        inEstate(s, 'azure') ? 'Action Azure Advisor, apply Hybrid Benefit, and model 3-year consumption scenarios' : 'Model 3-year seat and product growth scenarios',
        'Quantify the July 2026 increase and Level B–D removal against your actual SKUs',
      ] },
    { phase: 'P2', when: urgent ? 'Week 1–2' : 'Months 6–9 Before Renewal', title: 'Alternatives & Trade Plan',
      desc: 'Create alternatives line by line and decide what you are willing to give.',
      tasks: [
        inEstate(s, 'azure') ? 'Request AWS/GCP pricing for named Azure workloads and CSP partner quotes' : 'Request CSP partner quotes for seat products',
        inEstate(s, 'm365') ? 'Obtain Google Workspace pricing for a defined user population' : 'Identify a credible alternative for your largest line',
        inEstate(s, 'unified-support') || s.supportTier === 'unified' ? 'Obtain a third-party Microsoft support quote' : 'Confirm support requirements and alternatives',
        'Build the give/get plan: which growth commitments you will offer, and what each must buy',
        'Align CIO, CISO, CFO, and procurement on priorities and walk-away positions',
      ] },
    { phase: 'P3', when: urgent ? 'Week 2–3' : 'Months 3–6 Before Renewal', title: 'Strategic Outreach',
      desc: 'Frame one account-level conversation before Microsoft frames several product-level renewals.',
      tasks: [
        'Request an account-level strategy review with the account executive, not a renewal call per product',
        'Present the 3-year roadmap: AI, security, applications, and Azure, with the growth you could commit to',
        'State the line-item pricing requirement at the outset',
        'Ask Microsoft to model 1-year and 3-year scenarios across all lines',
        'Commit to nothing verbally; request the first written proposal',
      ] },
    { phase: 'P4', when: urgent ? 'Week 3–4' : '4–8 Weeks Before Renewal', title: 'Full Negotiation',
      desc: 'Counter line by line, trade conditionally, and escalate where field authority runs out.',
      tasks: [
        'Counter each line against its target range; reject blended bundle numbers',
        'Make every growth commitment conditional on the full package',
        'Negotiate price protection, flex rights, shortfall terms, and support fee structure',
        'Escalate to Microsoft leadership where field authority caps out, timed to quarter-end',
        'Confirm every concession in draft paperwork, not email',
      ] },
    { phase: 'P5', when: urgent ? 'Week 4–5' : '1–2 Weeks Before Close', title: 'Legal Review & Close',
      desc: 'If a term isn\'t in the signed documents, it doesn\'t exist.',
      tasks: [
        'Legal review of enrollment, amendments, price protection, auto-renewal, and shortfall language',
        'Verify line-item pricing in the final paperwork matches the agreed position',
        'Set up usage governance: seat activity, Copilot adoption, and MACC burn-down',
        'Diarise anniversary true-ups, reduction windows, and the next renewal 12 months out',
      ] },
  ];
}

// ─── Questions ───────────────────────────────────────────────────────────────
function buildQuestions(s) {
  const q = ['Can you price each product line separately against current list, rather than as a single bundle figure?'];
  if (inEstate(s, 'm365')) q.push('What is our exact uplift from the July 2026 changes and the Level B–D removal at renewal, by SKU?');
  if (isEA(s)) q.push('Which of our current rates and discounts carry into the renewal, and where is that written in the proposed documents?');
  if (isEA(s)) q.push('If you propose moving us to MCA-E, what replaces the EA price lock, and will you commit that replacement to writing?');
  if (isMCAE(s) || isCSP(s) || s.agreementType === 'mixed') q.push('What price protection language can you include for named SKUs across Azure, M365, and Copilot, and who approves it?');
  if (inEstate(s, 'copilot') || exp(s, 'copilot-adopt')) q.push('If we commit to a ramped Copilot deployment, what reduction or reassignment rights do we have if adoption falls short?');
  if (inEstate(s, 'azure')) q.push('What ACD applies at our proposed MACC level, and do reservations and savings plans stack on top of it?');
  if (inEstate(s, 'azure')) q.push('What exactly happens if we fall 15% short of the annual MACC, and what ramp terms can you offer?');
  if (s.securityPosition === 'third-party' || exp(s, 'security-consolidate')) q.push('If we retire our current security vendors, what competitive pricing and overlap funding can Microsoft offer?');
  if (s.dynamicsPosition === 'competing' || s.dynamicsPosition === 'new-purchase') q.push('What investment funding and implementation support is available if we select Dynamics 365 over the alternative we are evaluating?');
  if ((inEstate(s, 'power-platform') || inEstate(s, 'dynamics')) && s.aiBuilderReliance !== 'none') q.push('How will workloads that use seeded AI Builder credits be covered after November 1, 2026, and at what Copilot Credit rate?');
  if (inEstate(s, 'unified-support') || s.supportTier === 'unified') q.push('Can Unified Support be priced as a fixed annual fee, independent of our licence and Azure growth?');
  q.push('Who is our executive sponsor at Microsoft for a decision of this size, and what approval level does this deal require?');
  return q.slice(0, 11);
}

// ─── Risks ───────────────────────────────────────────────────────────────────
function buildRisks(s) {
  const r = [];
  r.push({ level: 'high', title: 'Bundle Opacity', desc: 'A single blended discount can hide a price increase on one line behind a concession on another. Require line-item pricing in the signed documents.' });
  if (isEA(s) && s.renewalTimeline !== '12plusmo') r.push({ level: 'high', title: 'Renewal Is Not a Rollover', desc: `Prior pricing levels were removed in ${MS_CONTEXT.levelsRemoved}. A renewal that is not actively renegotiated resets to current list.` });
  if (isEA(s)) r.push({ level: 'high', title: 'EA Protection Lost on MCA-E Migration', desc: 'The automatic price lock and locked pricing on added seats do not transfer to MCA-E. Price that loss before agreeing to any move.' });
  if (isMCAE(s)) r.push({ level: 'high', title: 'Mid-Term Rate Changes', desc: 'MCA-E permits unit price changes during the term. Without an addendum, increases flow straight through.' });
  if (inEstate(s, 'copilot') && ['weak', 'mixed', 'unknown'].includes(s.copilotAdoption)) r.push({ level: 'high', title: 'Paying for Idle AI Seats', desc: 'Copilot seats bought ahead of adoption are the fastest-growing source of Microsoft shelfware. Tie expansion to measured usage.' });
  if (inEstate(s, 'azure') && s.commitUtilization === 'under70') r.push({ level: 'medium', title: 'MACC Underutilisation History', desc: 'A prior shortfall weakens ACD negotiations and invites stricter shortfall terms. Commit conservatively.' });
  if (inEstate(s, 'azure') && s.multicloud === 'azure-only') r.push({ level: 'medium', title: 'No Azure Alternative', desc: 'All-in on Azure with no priced alternative leaves Microsoft no reason to move on ACD.' });
  if (s.auditHistory === 'active') r.push({ level: 'high', title: 'Audit Findings Folded into Renewal', desc: 'Compliance findings can become mandatory purchases inside the deal. Resolve the position separately first.' });
  if (s.renewalTimeline === 'within-1mo') r.push({ level: 'high', title: 'Deadline Pressure', desc: 'Urgency is Microsoft\'s strongest advantage. Secure a short extension before negotiating.' });
  if (inEstate(s, 'unified-support') || s.supportTier === 'unified') r.push({ level: 'medium', title: 'Support Fee Creep', desc: 'Percentage-based Unified pricing rises with every licence you add or every price increase you absorb.' });
  if (s.frontlineWorkers === 'significant') r.push({ level: 'medium', title: 'Frontline Licence Misclassification', desc: 'Users licensed as frontline who do not qualify create compliance exposure, and F-plan increases were the steepest in the July 2026 change.' });
  if ((s.aiBuilderReliance === 'heavy' || s.aiBuilderReliance === 'unknown') && (inEstate(s, 'power-platform') || inEstate(s, 'dynamics'))) r.push({ level: 'medium', title: 'AI Builder Credit Cut-Off', desc: `Automations relying on seeded credits may stop or incur metered cost after ${MS_CONTEXT.aiBuilderSunset}.` });
  r.push({ level: 'low', title: 'Account Team Turnover', desc: 'Verbal commitments from the account team are not binding and rarely survive a reorganisation. Get everything in the documents.' });
  if (s.desiredTerm === '3yr') r.push({ level: 'low', title: '3-Year Lock-In', desc: 'A long term favours pricing but locks suite mix. Negotiate step-down and substitution rights.' });
  return r;
}

// ─── Sample output ───────────────────────────────────────────────────────────
// Consistent with the Azure planner's sample client, extended to the full estate.
const SAMPLE_PROFILE = 'Mid-market SaaS company · $25M–$50M total Microsoft spend · $10M–$25M Azure · 5,000–10,000 M365 seats';
const SAMPLE_STATE = {
  companySize: 'midmarket', industry: 'saas', growthRate: 'moderate', msTenure: '3-5',
  agreementType: 'ea', renewalTimeline: '6-12mo', cotermStatus: 'staggered', eaTermStart: 'pre-increase',
  eaPricingLevel: 'level-b', desiredTerm: '3yr', compliance: ['sox', 'gdpr'],
  estate: ['azure', 'm365', 'copilot', 'security', 'power-platform', 'github', 'unified-support'],
  totalMsSpend: '25m-50m', spendMix: 'balanced', m365Seats: '5k-10k', m365Suite: 'mixed',
  frontlineWorkers: 'some', supportTier: 'unified',
  annualSpend: '10m-25m', spendGrowth: 'moderate', commitUtilization: '85-100', cspOpenness: 'unknown',
  useCases: ['compute', 'containers', 'ai-ml', 'databases', 'analytics'], onpremLicenses: ['windows-server', 'sql-server'],
  workloadType: 'mixed', hybridBenefitStatus: 'partially', optimizationStatus: 'partially', migrationStatus: 'in-progress',
  multicloud: 'azure-primary',
  m365Reclamation: 'partial', e5Utilization: 'low', copilotStatus: 'pilot', copilotAdoption: 'mixed',
  dynamicsPosition: 'na', aiBuilderReliance: 'some', securityPosition: 'third-party', githubPosition: 'expanding',
  auditHistory: 'recent',
  productivityAlternative: 'informal', supportAlternative: 'considering', relationshipQuality: 'moderate',
  keyConcern: 'm365-increase', expansionPlans: ['copilot-adopt', 'security-consolidate', 'github-expand'],
};

function sampleBannerHTML(fromForm) {
  return `<div class="sample-banner" role="note">
    <span class="sample-tag">SAMPLE</span>
    <div><strong>Sample output — illustrative data, not a client analysis.</strong>
    ${fromForm ? 'Built using the Fill Sample Data buttons — inputs may have been edited since.' : 'Generated from a fixed example profile: ' + SAMPLE_PROFILE + ', 3-year term, renewal 6–12 months out.'}
    Proxima deal calibration data is excluded. Use <em>Edit Inputs</em> to build a real strategy.</div>
  </div>`;
}

function renderWithoutDealData(fn) {
  const realInsight = getProximaInsight;
  getProximaInsight = () => null;   // never let real logged deals appear in a demo
  try { return fn(); } finally { getProximaInsight = realInsight; }
}

function showSample() {
  for (let i = 1; i < OUTPUT_STEP; i++) fillSampleStep(i);
  Object.keys(state).forEach(k => delete state[k]);
  Object.assign(state, JSON.parse(JSON.stringify(SAMPLE_STATE)));
  renderWithoutDealData(() => {
    document.getElementById('strategy-output').innerHTML = sampleBannerHTML() + buildStrategyHTML(state);
  });
  document.body.classList.add('is-sample');
  goToStep(OUTPUT_STEP);
}

// ─── Per-screen sample fill ──────────────────────────────────────────────────
const sampleFilledSteps = new Set();
const toCamel = id => id.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());

function fillSampleStep(n, btn) {
  const panel = document.getElementById('step-' + n);
  if (!panel) return;
  const sv = id => SAMPLE_STATE[toCamel(id)];
  panel.querySelectorAll('select[id]').forEach(el => {
    const v = sv(el.id);
    if (v === undefined) return;
    el.value = v;
    el.style.borderColor = '';
  });
  panel.querySelectorAll('.radio-cards[id]').forEach(g => {
    const v = sv(g.id);
    if (v === undefined) return;
    g.querySelectorAll('.radio-card').forEach(c => c.classList.toggle('selected', c.dataset.value === v));
    g.style.outline = '';
  });
  panel.querySelectorAll('.use-case-grid[id]').forEach(g => {
    const v = sv(g.id);
    if (Array.isArray(v)) g.querySelectorAll('.use-case-card').forEach(c => c.classList.toggle('selected', v.includes(c.dataset.value)));
  });
  panel.querySelectorAll('.checkbox-group[id]').forEach(g => {
    const v = sv(g.id);
    if (Array.isArray(v)) g.querySelectorAll('input[type=checkbox]').forEach(i => { i.checked = v.includes(i.value); });
  });
  sampleFilledSteps.add(n);
  if (btn) {
    const label = btn.textContent;
    btn.textContent = '✓ Sample data filled';
    btn.disabled = true;
    setTimeout(() => { btn.textContent = label; btn.disabled = false; }, 1400);
  }
}

const realGenerateStrategy = generateStrategy;
generateStrategy = function () {
  const usingSample = sampleFilledSteps.size > 0;
  if (usingSample) renderWithoutDealData(realGenerateStrategy);
  else realGenerateStrategy();
  if (usingSample && currentStep === OUTPUT_STEP) {
    const out = document.getElementById('strategy-output');
    out.innerHTML = sampleBannerHTML(true) + out.innerHTML;
    document.body.classList.add('is-sample');
  }
};
