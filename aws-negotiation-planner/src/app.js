'use strict';

// ─── State ───────────────────────────────────────────────────────────────────
const state = {};
let currentStep = 1;

// ─── Navigation ──────────────────────────────────────────────────────────────
function nextStep(from) {
  if (!validateStep(from)) return;
  collectStep(from);
  goToStep(from + 1);
}
function prevStep(from) {
  goToStep(from - 1);
}
function goToStep(n) {
  document.querySelector('.step-panel.active')?.classList.remove('active');
  document.getElementById(`step-${n}`).classList.add('active');
  document.querySelectorAll('.step-item').forEach(el => {
    const s = +el.dataset.step;
    el.classList.toggle('active', s === n);
    el.classList.toggle('done', s < n);
  });
  currentStep = n;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── Validation ───────────────────────────────────────────────────────────────
function validateStep(step) {
  const required = {
    1: ['company-size', 'industry', 'growth-rate', 'aws-tenure', 'contract-type'],
    2: ['annual-spend', 'spend-growth', 'renewal-timeline'],
    3: ['workload-type', 'spend-concentration', 'optimization-status'],
    4: ['multicloud', 'relationship-quality'],
  };
  const fields = required[step] || [];
  let ok = true;
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (!el) {
      // radio-card group
      const group = document.getElementById(id);
      if (group && !group.querySelector('.selected')) {
        highlightMissing(group);
        ok = false;
      }
      return;
    }
    if (el.tagName === 'SELECT' && !el.value) {
      el.style.borderColor = 'var(--danger)';
      el.addEventListener('change', () => el.style.borderColor = '', { once: true });
      ok = false;
    }
  });
  // radio-card groups
  const radioGroups = {
    1: ['company-size'],
    4: ['multicloud'],
  };
  (radioGroups[step] || []).forEach(id => {
    const group = document.getElementById(id);
    if (group && !group.querySelector('.selected')) {
      group.style.outline = '2px solid var(--danger)';
      group.style.borderRadius = '8px';
      setTimeout(() => { group.style.outline = ''; }, 2000);
      ok = false;
    }
  });
  if (!ok) {
    const msg = document.createElement('div');
    msg.className = 'alert alert-danger';
    msg.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;max-width:320px;animation:fadeIn .2s ease';
    msg.innerHTML = '<span class="alert-icon">⚠️</span> Please fill in all required fields before continuing.';
    document.body.appendChild(msg);
    setTimeout(() => msg.remove(), 3000);
  }
  return ok;
}

// ─── Data Collection ──────────────────────────────────────────────────────────
function collectStep(step) {
  if (step === 1) {
    state.companySize = document.querySelector('#company-size .selected')?.dataset.value;
    state.industry = document.getElementById('industry').value;
    state.growthRate = document.getElementById('growth-rate').value;
    state.awsTenure = document.getElementById('aws-tenure').value;
    state.contractType = document.getElementById('contract-type').value;
    state.compliance = [...document.querySelectorAll('#compliance input:checked')].map(i => i.value);
  }
  if (step === 2) {
    state.annualSpend = document.getElementById('annual-spend').value;
    state.spendGrowth = document.getElementById('spend-growth').value;
    state.renewalTimeline = document.getElementById('renewal-timeline').value;
    state.desiredTerm = document.getElementById('desired-term').value;
    state.marketplaceSpend = document.getElementById('marketplace-spend')?.value || 'none';
    state.databaseSavingsPlans = document.getElementById('database-savings-plans')?.value || 'none';
    state.edpMonthsRemaining = document.getElementById('edp-months-remaining')?.value || 'na';
    state.commitUtilization = document.getElementById('commit-utilization').value;
    state.currentDiscounts = [...document.querySelectorAll('.current-discounts:checked')].map(i => i.value);
    state.supportTier = document.getElementById('support-tier').value;
    state.buyingChannel = document.getElementById('buying-channel')?.value || 'direct';
    state.resellerDiscount = state.buyingChannel === 'direct' ? 'na' : (document.getElementById('reseller-discount')?.value || 'none');
  }
  if (step === 3) {
    state.useCases = [...document.querySelectorAll('#use-cases .selected')].map(c => c.dataset.value);
    state.workloadType = document.getElementById('workload-type').value;
    state.spendConcentration = document.getElementById('spend-concentration').value;
    state.gpuUsage = document.getElementById('gpu-usage')?.value || 'none';
    state.optimizationStatus = document.getElementById('optimization-status').value;
    state.storageShare = document.getElementById('storage-share')?.value || 'unknown';
  }
  if (step === 4) {
    state.multicloud = document.querySelector('#multicloud .selected')?.dataset.value;
    state.relationshipQuality = document.getElementById('relationship-quality').value;
    state.migrationPlans = [...document.querySelectorAll('#migration-plans input:checked')].map(i => i.value);
    state.awsPrograms = [...document.querySelectorAll('#aws-programs input:checked')].map(i => i.value);
    state.migrationSource = [...document.querySelectorAll('#migration-source input:checked')].map(i => i.value);
    state.migrationSpend = document.getElementById('migration-spend')?.value || 'na';
    state.migrationComplexity = document.getElementById('migration-complexity')?.value || '';
  }
}

function toggleResellerDiscount() {
  const channel = document.getElementById('buying-channel')?.value;
  const group = document.getElementById('reseller-discount-group');
  if (group) group.style.display = channel === 'reseller' || channel === 'mixed' ? '' : 'none';
}

// ─── Scenario helpers ─────────────────────────────────────────────────────────
// Profiles that older saved states (and the sample) may not carry default to
// the pre-existing behaviour: direct buyer, no migration detail, storage unknown.
function viaReseller(s) { return s.buyingChannel === 'reseller' || s.buyingChannel === 'mixed'; }
function isFastGrowth(s) {
  return ['hypergrowth', 'fast'].includes(s.growthRate) || ['hypergrowth', 'fast'].includes(s.spendGrowth);
}
// Resellers typically stop serving accounts at ~$5M/yr; tier 5+ is $5M and up
function resellerGraduating(s, tier) { return viaReseller(s) && tier >= 5; }
function resellerApproachingCeiling(s, tier) { return viaReseller(s) && tier === 4 && isFastGrowth(s); }
const RESELLER_DISCOUNT_LABELS = { none: 'none or unknown', under5: 'under 5%', '5-10': '5–10%', '10plus': '10%+' };

const MIGRATION_SOURCE_LABELS = { onprem: 'on-premises data centers', azure: 'Azure', gcp: 'Google Cloud', 'other-cloud': 'another cloud or colocation' };
function isMigrating(s) {
  const plans = s.migrationPlans || [];
  return plans.includes('migrating-to-aws') || plans.includes('onprem-exit') || plans.includes('storage-migration')
    || (s.migrationSource || []).length > 0;
}
function competitorSources(s) { return (s.migrationSource || []).filter(x => x === 'azure' || x === 'gcp' || x === 'other-cloud'); }
function competitorLabel(s) {
  const names = competitorSources(s).map(x => MIGRATION_SOURCE_LABELS[x]);
  return names.length > 1 ? names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] : names[0] || 'a competitor';
}

// Qualitative credit sizing: scales with spend moving, complexity, and whether
// AWS is winning the workload from a competitor. Deliberately no % formula;
// the only hard figure is the observed top end (~$50M) for very large estates.
function creditSizing(s) {
  const spendPts = { under1m: 0, '1m-5m': 1, '5m-10m': 2, '10mplus': 3 }[s.migrationSpend] ?? 0;
  const complexPts = { simple: 0, moderate: 1, complex: 2 }[s.migrationComplexity] ?? 0;
  const score = spendPts + complexPts + (competitorSources(s).length ? 1 : 0);
  if (score >= 6) return { label: 'Top end', text: 'A large, complex estate moving from a competitor is the profile behind the biggest packages; these have reached about $50M. Expect AWS to open well below that and anchor your ask on a costed migration plan.' };
  if (score >= 4) return { label: 'Significant', text: 'At this scale expect a real migration investment package, sized in the millions, not just a professional services allowance. Anchor the ask on your actual cost of moving.' };
  if (score >= 2) return { label: 'Meaningful', text: 'Push for migration investment alongside professional services credits. If AWS offers ProServ hours alone, ask what funding covers parallel running and data transfer.' };
  return { label: 'Modest', text: 'Expect mainly assessment funding and professional services credits. Tie each ask to a specific migration cost so it is easy for the account team to justify.' };
}

const STORAGE_HEAVY = ['15-30', '30plus'];
function hasStorage(s) { return (s.useCases || []).includes('storage') || STORAGE_HEAVY.includes(s.storageShare); }

// ─── Radio Cards & Use Case Cards ────────────────────────────────────────────
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

// ─── Strategy Generation ──────────────────────────────────────────────────────
function generateStrategy() {
  document.body.classList.remove('is-sample');
  if (!validateStep(4)) return;
  collectStep(4);
  const html = buildStrategyHTML(state);
  document.getElementById('strategy-output').innerHTML = html;
  goToStep(5);
}

// ─── Ranges metadata ──────────────────────────────────────────────────────────
const RANGES_LAST_UPDATED = 'October 14, 2026';
const RANGES_VERSION = '3.0';

// ─── Spend Tier Logic ─────────────────────────────────────────────────────────
// `tier` drives the tactic/risk/alert logic (0–8). `base` is the standard
// 1-year PPA discount range at that annual commit; null = below PPA threshold.
const SPEND_TIERS = {
  'under100k': { label: '<$100K', min: 0, max: 100000, tier: 0, base: null },
  '100k-300k': { label: '$100K–$300K', min: 100000, max: 300000, tier: 1, base: null },
  '300k-500k': { label: '$300K–$500K', min: 300000, max: 500000, tier: 2, base: [3, 3] },
  '500k-1m':   { label: '$500K–$1M', min: 500000, max: 1000000, tier: 2, base: [4, 5] },
  '1m-2m':     { label: '$1M–$2M', min: 1000000, max: 2000000, tier: 3, base: [6, 6] },
  '2m-5m':     { label: '$2M–$5M', min: 2000000, max: 5000000, tier: 4, base: [6, 7] },
  '5m-10m':    { label: '$5M–$10M', min: 5000000, max: 10000000, tier: 5, base: [8, 9] },
  '10m-25m':   { label: '$10M–$25M', min: 10000000, max: 25000000, tier: 6, base: [10, 12] },
  '25m-50m':   { label: '$25M–$50M', min: 25000000, max: 50000000, tier: 7, base: [13, 15] },
  '50m-100m':  { label: '$50M–$100M', min: 50000000, max: 100000000, tier: 8, base: [16, 17] },
  '100m-200m': { label: '$100M–$200M', min: 100000000, max: 200000000, tier: 8, base: [18, 20] },
  '200m-350m': { label: '$200M–$350M', min: 200000000, max: 350000000, tier: 8, base: [21, 23] },
  '350mplus':  { label: '$350M+', min: 350000000, max: Infinity, tier: 8, base: [24, 24] },
  // Legacy keys from earlier versions of the form
  '100k-500k': { label: '$100K–$500K', min: 100000, max: 500000, tier: 1, base: null },
  '50mplus':   { label: '$50M+', min: 50000000, max: Infinity, tier: 8, base: [16, 24] },
};

// Points added to the 1-year rate for a longer committed term
const TERM_UPLIFT = { '1yr': 0, '2yr': 2, '3yr': 3, '4yr': 4, '5yr': 5 };
const TERM_LABELS = { '1yr': '1-year', '2yr': '2-year', '3yr': '3-year', '4yr': '4-year', '5yr': '5-year' };
const DISCOUNT_CAP = 35;

// Maps AWS planner spend keys to deal-calibration tier keys
const AWS_TO_CAL_TIER = {
  'under100k': 'under1m', '100k-300k': 'under1m', '300k-500k': 'under1m',
  '100k-500k': 'under1m', '500k-1m': 'under1m',
  '1m-2m': '1m-5m', '2m-5m': '1m-5m',
  '5m-10m': '5m-10m', '10m-25m': '10m-25m',
  '25m-50m': '25m-50m', '50m-100m': '50m-100m', '50mplus': '50m-100m',
  '100m-200m': '100m+', '200m-350m': '100m+', '350mplus': '100m+',
};

function getProximaInsight(provider, calTier) {
  try {
    const deals = JSON.parse(localStorage.getItem('proxima-deals') || '[]');
    const provDeals = deals.filter(d => d.provider === provider);
    if (provDeals.length === 0) return null;
    const tierDeals = calTier ? provDeals.filter(d => d.tier === calTier) : [];
    const relevant = tierDeals.length >= 2 ? tierDeals : provDeals;
    const discounts = relevant.map(d => d.discount).sort((a, b) => a - b);
    const avg = Math.round(discounts.reduce((s, v) => s + v, 0) / discounts.length * 10) / 10;
    return { count: relevant.length, totalCount: provDeals.length, avg, lo: discounts[0], hi: discounts[discounts.length - 1], tierMatch: tierDeals.length >= 2 };
  } catch { return null; }
}

// Negotiated headroom above the standard rate: competitive pressure, growth, Marketplace
function getDiscountHeadroom(s) {
  const multicloud = s.multicloud === 'multi-cloud' ? 4 : s.multicloud === 'evaluating' ? 3 : s.multicloud === 'aws-primary' ? 1 : 0;
  const growth = s.growthRate === 'hypergrowth' ? 2 : s.growthRate === 'fast' ? 1 : 0;
  const marketplace = s.marketplaceSpend === '500kplus' ? 2 : s.marketplaceSpend === '100k-500k' ? 1 : 0;
  return multicloud + growth + marketplace;
}

function getDiscountRange(s) {
  const spend = SPEND_TIERS[s.annualSpend];
  const headroom = getDiscountHeadroom(s);

  // Below the PPA threshold the number reflects Savings Plans negotiation, not a PPA rate
  if (!spend?.base) {
    const hi = (spend?.tier ?? 0) >= 1 ? 4 : 2;
    const hiFinal = hi + Math.min(headroom, 3);
    return { lo: 0, hi: hiFinal, midpoint: Math.round(hiFinal / 2), standard: null };
  }

  // Flexible / undecided term: floor at the 1-year rate, stretch up to the 3-year rate
  const termLo = TERM_UPLIFT[s.desiredTerm] ?? 0;
  const termHi = TERM_UPLIFT[s.desiredTerm] ?? TERM_UPLIFT['3yr'];
  const shortfall = s.commitUtilization === 'under70' ? 1 : 0;

  const loFinal = Math.max(spend.base[0] + termLo - shortfall, 0);
  const hiFinal = Math.min(spend.base[1] + termHi + headroom, DISCOUNT_CAP);
  return {
    lo: loFinal,
    hi: Math.max(hiFinal, loFinal),
    midpoint: Math.round((loFinal + hiFinal) / 2),
    standard: [spend.base[0] + termLo, spend.base[1] + termLo],
  };
}

function getLeverageScore(s) {
  let score = 0;
  // Spend tier (0–30 pts)
  score += (SPEND_TIERS[s.annualSpend]?.tier ?? 0) * 3.5;
  // Multi-cloud (0–20)
  if (s.multicloud === 'multi-cloud') score += 20;
  else if (s.multicloud === 'evaluating') score += 14;
  else if (s.multicloud === 'aws-primary') score += 6;
  // Growth (0–15)
  const growthMap = { hypergrowth: 15, fast: 11, moderate: 7, slow: 3, declining: 0 };
  score += growthMap[s.growthRate] ?? 5;
  // Timing (0–10)
  const timingMap = { '6-12mo': 10, '3-6mo': 7, '12plusmo': 5, '1-3mo': 3, 'within-1mo': 0 };
  score += timingMap[s.renewalTimeline] ?? 5;
  // Relationship (0–10)
  const relMap = { strategic: 10, strong: 8, moderate: 5, poor: 2, none: 0 };
  score += relMap[s.relationshipQuality] ?? 3;
  // Tenure (0–5)
  const tenureMap = { '5plus': 5, '3-5': 4, '1-3': 2, 'new': 0 };
  score += tenureMap[s.awsTenure] ?? 2;
  // Marketplace spend — now counts toward PPA drawdown
  if (s.marketplaceSpend === '500kplus') score += 6;
  else if (s.marketplaceSpend === '100k-500k') score += 3;
  // Database Savings Plans — uncaptured discount lever
  if (s.databaseSavingsPlans && s.databaseSavingsPlans !== 'none') score += 4;
  if (s.databaseSavingsPlans === 'multiple') score += 2;
  // Accelerated compute — AWS actively subsidizes AI retention against Azure/GCP.
  // Net-new GPU capacity decisions carry the most leverage of all.
  const gpuLeverageMap = { 'evaluating': 5, 'both': 4, 'capacity-blocks': 4, 'ondemand': 2, 'none': 0 };
  score += gpuLeverageMap[s.gpuUsage] ?? 0;
  // Winning a workload from a competitor cloud is revenue AWS will pay for
  if (competitorSources(s).length) score += 3;
  // PPA timing — penalize urgency
  const edpTimingMap = { 'under3': -12, '3-6': -5, '6-12': 6, '12plus': 10, 'na': 0 };
  score += edpTimingMap[s.edpMonthsRemaining] ?? 0;
  return Math.min(Math.round(score), 100);
}

function getLeverageLabel(score) {
  if (score >= 75) return { label: 'Very Strong', color: '#166534' };
  if (score >= 55) return { label: 'Strong', color: '#15803D' };
  if (score >= 35) return { label: 'Moderate', color: '#B45309' };
  if (score >= 15) return { label: 'Developing', color: '#9A3412' };
  return { label: 'Early Stage', color: '#6B7280' };
}

// ─── Main Strategy Builder ────────────────────────────────────────────────────
function buildStrategyHTML(s) {
  const discount = getDiscountRange(s);
  const leverage = getLeverageScore(s);
  const leverageInfo = getLeverageLabel(leverage);
  const spendLabel = SPEND_TIERS[s.annualSpend]?.label ?? 'Unknown';
  const tier = SPEND_TIERS[s.annualSpend]?.tier ?? 0;
  const companyLabels = { startup: 'Startup', smb: 'SMB', midmarket: 'Mid-Market', enterprise: 'Enterprise' };

  const tactics = buildTactics(s, tier);
  const proxima = getProximaInsight('aws', AWS_TO_CAL_TIER[s.annualSpend]);
  const timeline = buildTimeline(s);
  const concessions = buildConcessions(s, tier);
  const risks = buildRisks(s, tier);
  const questions = buildQuestions(s, tier);
  const alerts = buildAlerts(s, tier);

  return `
<div class="strategy-container">
  <div class="print-proxima-header">
    <span class="print-logo-text">Proxima</span>
    <span class="print-divider"></span>
    <span class="print-tool-name">AWS Negotiation Planner</span>
  </div>
  <div class="strategy-hero">
    <h2>Your AWS Negotiation Strategy</h2>
    <div class="subtitle">${companyLabels[s.companySize] || 'Company'} · ${spendLabel} annual spend · Generated ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
    <div style="font-size:.75rem;color:rgba(255,255,255,.6);font-style:italic;margin-top:4px;">Intended for Proxima use only — please contact Brian Chernauskas with questions</div>
    <div style="font-size:.7rem;color:rgba(255,255,255,.35);margin-top:3px;">Discount ranges last calibrated: ${RANGES_LAST_UPDATED}</div>
    <div class="score-row">
      <div class="score-pill">
        <span class="pill-label">Leverage Score</span>
        <span class="pill-value" style="color:${leverageInfo.color}">${leverage}/100 — ${leverageInfo.label}</span>
      </div>
      <div class="score-pill">
        <span class="pill-label">Target Discount</span>
        <span class="pill-value">${discount.lo}–${discount.hi}%</span>
      </div>
      <div class="score-pill">
        <span class="pill-label">Contract Type</span>
        <span class="pill-value">${recommendedContractType(s, tier)}</span>
      </div>
    </div>
  </div>

  <div class="strategy-body">

    ${alerts.length ? `
    <div class="strategy-section">
      <div class="section-header">
        <span class="section-icon">🚨</span>
        <h3>Critical Flags & Immediate Actions</h3>
      </div>
      <div class="section-content">
        <div class="alerts-list">${alerts.map(a => `<div class="alert alert-${a.type}"><span class="alert-icon">${a.icon}</span><div>${a.text}</div></div>`).join('')}</div>
      </div>
    </div>` : ''}

    <div class="strategy-section">
      <div class="section-header">
        <span class="section-icon">💰</span>
        <h3>Expected Discount Range</h3>
        <span class="section-badge">${recommendedContractType(s, tier)}</span>
      </div>
      <div class="section-content">
        <div class="discount-estimate">
          <div>
            <div class="de-range">${discount.lo}–${discount.hi}%</div>
            <div class="de-label">vs. on-demand list price</div>
          </div>
          <div class="de-bar-wrap">
            <div class="de-bar-bg">
              <div class="de-bar-fill" style="width:${Math.min(discount.hi * 2, 100)}%"></div>
            </div>
            <div class="de-note">Midpoint target: <strong>${discount.midpoint}%</strong> · Walk-away floor: <strong>${discount.lo}%</strong> · Stretch goal: <strong>${discount.hi}%</strong></div>
          </div>
        </div>
        ${proxima ? `<div style="margin-top:10px;padding:10px 14px;background:rgba(255,153,0,.08);border:1px solid rgba(255,153,0,.25);border-radius:8px;font-size:.82rem;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <span style="font-weight:700;color:#ff9900;">📊 Proxima Deal Data</span>
          <span style="color:var(--text-muted);">Based on <strong>${proxima.count} AWS deal${proxima.count !== 1 ? 's' : ''}</strong>${proxima.tierMatch ? ' at this spend tier' : ' across all tiers'}: observed avg <strong>${proxima.avg}%</strong>, range <strong>${proxima.lo}–${proxima.hi}%</strong></span>
        </div>` : ''}
        ${discountBreakdownHTML(s, tier, discount)}
      </div>
    </div>

    <div class="strategy-section">
      <div class="section-header">
        <span class="section-icon">🎯</span>
        <h3>Negotiation Tactics — Ranked by Impact</h3>
        <span class="section-badge blue">${tactics.length} tactics</span>
      </div>
      <div class="section-content">
        <div class="tactics-list">${tactics.map((t, i) => `
          <div class="tactic-card">
            <div class="tactic-num">${i + 1}</div>
            <div class="tactic-body">
              <div class="tactic-title">${t.title}</div>
              <div class="tactic-desc">${t.desc}</div>
              <span class="tactic-impact impact-${t.impact}">${t.impact === 'high' ? '🔥 High Impact' : t.impact === 'medium' ? '⚡ Medium Impact' : '• Low Impact'}</span>
            </div>
          </div>`).join('')}
        </div>
      </div>
    </div>

    <div class="strategy-section">
      <div class="section-header">
        <span class="section-icon">🎁</span>
        <h3>Concessions to Request (Beyond Headline Discount)</h3>
        <span class="section-badge green">Non-discount value</span>
      </div>
      <div class="section-content">
        <div class="concessions-grid">${concessions.map(c => `
          <div class="concession-card">
            <div class="cc-icon">${c.icon}</div>
            <div class="cc-title">${c.title}</div>
            <div class="cc-desc">${c.desc}</div>
            <div class="cc-priority priority-${c.priority}">${c.priority === 'must' ? '🔴 Must Have' : c.priority === 'should' ? '🟡 Should Have' : '⚪ Nice to Have'}</div>
          </div>`).join('')}
        </div>
      </div>
    </div>

    ${buildCreditsHTML(s, tier)}

    <div class="strategy-section">
      <div class="section-header">
        <span class="section-icon">📅</span>
        <h3>Negotiation Timeline & Action Plan</h3>
      </div>
      <div class="section-content">
        <div class="timeline">${timeline.map(t => `
          <div class="timeline-item">
            <div class="timeline-left">
              <div class="tl-dot">${t.phase}</div>
              <div class="tl-line"></div>
            </div>
            <div class="tl-content">
              <div class="tl-phase">${t.when}</div>
              <div class="tl-title">${t.title}</div>
              <div class="tl-desc">${t.desc}</div>
              <div class="tl-tasks">${t.tasks.map(task => `<div class="tl-task">${task}</div>`).join('')}</div>
            </div>
          </div>`).join('')}
        </div>
      </div>
    </div>

    <div class="strategy-section">
      <div class="section-header">
        <span class="section-icon">💬</span>
        <h3>Questions to Ask AWS in the First Meeting</h3>
      </div>
      <div class="section-content">
        <div class="questions-list">${questions.map(q => `<div class="question-item">"${q}"</div>`).join('')}</div>
      </div>
    </div>

    <div class="strategy-section">
      <div class="section-header">
        <span class="section-icon">⚠️</span>
        <h3>Risk Factors & Mitigations</h3>
      </div>
      <div class="section-content">
        <div class="risk-grid">${risks.map(r => `
          <div class="risk-card ${r.level}">
            <div class="risk-title">${r.title}</div>
            <div class="risk-desc">${r.desc}</div>
          </div>`).join('')}
        </div>
      </div>
    </div>

    ${buildResellerTransitionHTML(s, tier)}

    ${buildCommitStructureHTML(s, tier)}

  </div>
  <div class="proxima-strategy-footer" style="margin-top:32px;padding-top:16px;border-top:1px solid var(--border);text-align:center;font-size:.78rem;color:var(--text-muted);font-style:italic;">
    Intended for Proxima use only — please contact Brian Chernauskas with questions
  </div>
</div>`;
}

// ─── Section Builders ─────────────────────────────────────────────────────────

function recommendedContractType(s, tier) {
  if (tier >= 5) return 'PPA (multi-year)';
  if (tier >= 3) return 'PPA';
  if (tier >= 2) return 'PPA or Savings Plans';
  if (tier >= 1) return 'Savings Plans';
  return 'Savings Plans / On-Demand';
}

function discountBreakdownHTML(s, tier, discount) {
  const rows = [];
  if (discount.standard) {
    const [sLo, sHi] = discount.standard;
    const termName = TERM_LABELS[s.desiredTerm] || '1-year';
    rows.push([`Standard ${termName} PPA rate at this annual commit`, sLo === sHi ? `${sLo}%` : `${sLo}–${sHi}%`, 'green']);
  } else {
    rows.push(['Below the $300K PPA threshold: Savings Plans and RIs carry the discount', 'No PPA', 'red']);
  }
  if (discount.standard && TERM_UPLIFT[s.desiredTerm]) rows.push([`${TERM_LABELS[s.desiredTerm]} term (included in standard rate above)`, `+${TERM_UPLIFT[s.desiredTerm]} pts`, 'green']);
  else if (discount.standard && s.desiredTerm !== '1yr') rows.push(['Term undecided; each added year is worth about 1 point (5-year max)', '+0–5 pts', 'green']);
  if (s.multicloud === 'multi-cloud') rows.push(['Multi-cloud positioning', '+2–4 pts', 'green']);
  else if (s.multicloud === 'evaluating') rows.push(['Evaluating Azure/GCP (active RFP)', '+1–3 pts', 'green']);
  if (s.growthRate === 'hypergrowth' || s.growthRate === 'fast') rows.push(['High-growth trajectory (future revenue)', '+1–2 pts', 'green']);
  if (tier >= 3 && s.supportTier === 'enterprise') rows.push(['Enterprise Support negotiation', '−1–3% on support', 'green']);
  if (s.commitUtilization === 'over100') rows.push(['Exceeded prior commitment (strong signal)', '+0–1 pt', 'green']);
  if (s.commitUtilization === 'under70') rows.push(['Prior shortfall — expect reduced flexibility', '−1–2 pts', 'red']);
  if (s.awsTenure === '5plus') rows.push(['Long-tenured customer (loyalty)', '+0–1 pt', 'green']);
  if (s.marketplaceSpend === '500kplus') rows.push(['Significant Marketplace spend — counts toward PPA drawdown', '+1–2 pts', 'green']);
  else if (s.marketplaceSpend === '100k-500k') rows.push(['Marketplace spend — can be included in PPA commitment', '+0–1 pt', 'green']);
  if (resellerGraduating(s, tier)) rows.push([`Reseller discount (${RESELLER_DISCOUNT_LABELS[s.resellerDiscount] || 'unknown'}) ends when you move direct; compare against the direct rate above`, 'Offset', 'red']);
  else if (viaReseller(s) && tier <= 4) rows.push([`Current reseller discount (${RESELLER_DISCOUNT_LABELS[s.resellerDiscount] || 'unknown'}): benchmark against the direct rate`, 'Benchmark', 'green']);
  else if (tier <= 4) rows.push(['Reseller channel discount available (APN partners)', '+5–15%', 'green']);
  const cur = s.currentDiscounts || [];
  if (cur.includes('none') || cur.length === 0) rows.push(['Currently at on-demand list pricing — full range available', 'Baseline', 'green']);
  else if (cur.includes('edp-discount')) rows.push(['Renewing an existing PPA — benchmark against current rate', 'Baseline', 'green']);
  if ((s.awsPrograms || []).includes('map')) rows.push(['MAP participant — funded credits outside PPA discount', 'Additive', 'green']);
  if (s.workloadType === 'dev-heavy' || s.workloadType === 'batch') rows.push(['Variable workload profile — commit conservatively', '−1–2 pts', 'red']);
  if (s.gpuUsage === 'evaluating') rows.push(['Net-new GPU capacity decision — AWS will bid to win it', 'Leverage', 'green']);
  else if (s.gpuUsage === 'capacity-blocks' || s.gpuUsage === 'both') rows.push(['Committed GPU footprint — strategic AI retention value', 'Leverage', 'green']);
  if (!rows.length) return '';
  return `<table style="width:100%;margin-top:16px;border-collapse:collapse;font-size:.82rem;">
    <thead><tr style="border-bottom:1px solid var(--border);">
      <th style="text-align:left;padding:6px 0;color:var(--text-secondary);font-weight:600;">Factor</th>
      <th style="text-align:right;padding:6px 0;color:var(--text-secondary);font-weight:600;">Impact</th>
    </tr></thead>
    <tbody>${rows.map(([label, val, color]) => `<tr style="border-bottom:1px solid var(--surface-3);">
      <td style="padding:7px 0;color:var(--text-primary);">${label}</td>
      <td style="padding:7px 0;text-align:right;font-weight:700;color:var(--${color === 'red' ? 'danger' : 'success'})">${val}</td>
    </tr>`).join('')}</tbody>
  </table>`;
}

function buildTactics(s, tier) {
  const tactics = [];

  // Marketplace as PPA currency
  if (s.databaseSavingsPlans && s.databaseSavingsPlans !== 'none') {
    tactics.push({
      title: 'Negotiate Database Savings Plans as a Separate Workstream',
      desc: `AWS Database Savings Plans (launched Dec 2025) cover Aurora Serverless, DocumentDB, Neptune, Keyspaces, and Timestream at 12–35% discounts on 1-year no-upfront terms. These are almost never included in AWS\'s initial PPA proposal. Raise them proactively as a separate negotiation item and request they be bundled into your PPA credit package or offered as standalone Plans — either way, this adds material value at no additional commit.`,
      impact: 'high',
    });
  }
  if (s.edpMonthsRemaining === 'under3' || s.edpMonthsRemaining === '3-6') {
    tactics.push({
      title: 'Request a Short-Term Extension to Reset the Clock',
      desc: 'With limited time remaining on your PPA, your first action should be requesting a 60–90 day extension of current terms — not signing a new agreement under deadline pressure. AWS will generally grant this, and it shifts the power dynamic back toward you. A negotiation with 6 months of runway achieves meaningfully better outcomes than one with 6 weeks.',
      impact: 'high',
    });
  }
  if (s.marketplaceSpend === '500kplus' || s.marketplaceSpend === '100k-500k') {
    tactics.push({
      title: 'Include AWS Marketplace Spend in Your PPA Commitment',
      desc: `AWS Marketplace purchases now count toward PPA drawdown — ISV software, managed services, and third-party tools purchased through Marketplace can all be credited against your PPA commitment. With your current Marketplace spend, this meaningfully increases the effective size of your PPA, potentially pushing you into a higher discount tier without increasing AWS infrastructure spend. Explicitly require Marketplace inclusion language in your PPA agreement, as it is not automatic on all contracts.`,
      impact: 'high',
    });
  }

  // Multi-cloud leverage
  if (s.multicloud === 'aws-only') {
    tactics.push({
      title: 'Launch a Competitive Cloud Evaluation (Even if You Stay on AWS)',
      desc: 'Request formal pricing from Azure and GCP for 2–3 key workloads. You don\'t need to move — the credible threat of moving is your single most powerful lever. AWS account teams are measured on preventing churn. Even a preliminary GCP/Azure quote unlocks 5–10 percentage points of additional discount.',
      impact: 'high',
    });
  } else if (s.multicloud === 'multi-cloud' || s.multicloud === 'evaluating') {
    tactics.push({
      title: 'Leverage Your Multi-Cloud Position Explicitly',
      desc: 'Open negotiations by quantifying what percentage of compute currently runs on Azure/GCP. Frame the PPA negotiation as "the discount required to consolidate more workloads onto AWS." AWS will reward consolidation — make them earn it.',
      impact: 'high',
    });
  }

  // Timing
  if (s.renewalTimeline === '6-12mo' || s.renewalTimeline === '12plusmo') {
    tactics.push({
      title: 'Time Outreach to AWS Fiscal Quarter-End',
      desc: 'AWS\'s fiscal quarters end March 31, June 30, September 30, December 31. Account teams have quarterly revenue targets. Negotiations initiated 4–6 weeks before quarter-end and closed in the final days receive measurably better terms — additional credits, deeper discounts, and contract flexibility that isn\'t available mid-quarter.',
      impact: 'high',
    });
  } else if (s.renewalTimeline === 'within-1mo' || s.renewalTimeline === '1-3mo') {
    tactics.push({
      title: 'Create Urgency — Request a 90-Day Extension While Negotiating',
      desc: 'You\'re in a tight window. Request a short-term extension of existing terms to avoid negotiating under pressure. Use the extension period to optimize spend (reduces your baseline) and prepare competitive alternatives before signing anything new.',
      impact: 'high',
    });
  }

  // Optimization
  if (s.optimizationStatus === 'unoptimized' || s.optimizationStatus === 'partially') {
    tactics.push({
      title: 'Optimize Before You Commit — Right-Size First',
      desc: 'Unoptimized infrastructure inflates your committed spend baseline. Run AWS Compute Optimizer and Cost Explorer\'s rightsizing recommendations first. A 20–35% spend reduction achieved before committing means you commit on a lower, sustainable number — dramatically reducing overcommitment risk. Then negotiate the commitment on the optimized baseline.',
      impact: 'high',
    });
  }

  // Commit level
  if (tier >= 2) {
    tactics.push({
      title: 'Anchor Commitment at 80–85% of Projected Spend',
      desc: 'Never commit to 100% of projected spend. Model conservative, moderate, and aggressive scenarios. Commit at 80–85% of the moderate scenario. This gives you shortfall protection while demonstrating credible commitment. Negotiate a "ramp" structure where commitment grows 10–15% per year rather than a flat obligation.',
      impact: 'high',
    });
  }

  // Support negotiation
  if (tier >= 4 && (s.supportTier === 'enterprise' || s.supportTier === 'enterprise-on-ramp')) {
    tactics.push({
      title: 'Negotiate Enterprise Support Rate Down from 10% to 7–8%',
      desc: 'At your spend level, the 10% Enterprise Support rate is negotiable. Request reduction to 7–8% as part of the PPA. This alone saves 2–3% of total spend — equivalent to a significant discount improvement. Push for support rate caps (absolute dollar maximums) to protect against spend growth inflating support costs.',
      impact: 'high',
    });
  }

  // Marketplace inclusion
  if (tier >= 3) {
    tactics.push({
      title: 'Negotiate AWS Marketplace Inclusion in Your PPA Commitment',
      desc: 'Up to 25% of your PPA commitment can be satisfied through AWS Marketplace purchases (third-party software). This gives you flexibility to use SaaS tools you already buy while burning down your AWS commitment. Negotiate the marketplace inclusion rate upfront — it\'s often left out of first-draft agreements.',
      impact: 'medium',
    });
  }

  // Credits — only pitch MAP entry if they are not already enrolled
  if (isMigrating(s) && !(s.awsPrograms || []).includes('map')) {
    tactics.push({
      title: 'Request Migration Funding, Not Just Professional Services Credits',
      desc: `AWS funds migrations in two forms: professional services credits (ProServ or partner hours) and real migration investment that offsets the cost of moving, such as parallel running, data transfer and re-platforming. Ask for both by name, and watch for ProServ hours presented as if they were investment. Package size scales with the size and complexity of the estate and the opportunity; your profile points to a ${creditSizing(s).label.toLowerCase()} package, and the largest, most complex estates have seen packages of about $50M. Funding is separate from the PPA discount: negotiate it as an add-on, never a substitute.`,
      impact: 'high',
    });
  }
  if (isMigrating(s)) {
    tactics.push({
      title: 'Weigh Credits Against Discount, Never Instead of It',
      desc: 'AWS often offers credits in place of a deeper rate, because a one-time credit costs it less than a permanent discount. Convert every credit offer into equivalent discount points over the term (see Migration Credits & Funding below) before comparing. Take investment for one-time move costs but keep pushing on the rate, and get four terms in writing: credits spread across the years the cost lands, clear expiry dates, whether credits count toward commitment drawdown, and which part is investment versus ProServ hours.',
      impact: 'high',
    });
  }
  if (competitorSources(s).length) {
    tactics.push({
      title: `Make AWS Fund the Exit From ${competitorLabel(s)}`,
      desc: `Winning a workload from ${competitorLabel(s)} is the revenue AWS most wants, and it is where migration funding is most generous. Build a costed exit plan (parallel running, data transfer, contract overlap with the incumbent, re-platforming) and put it on the table as the basis for the funding ask. Ask the incumbent for its exit egress waiver too, and use any retention offer it makes as a competing number.`,
      impact: 'high',
    });
  }
  if ((s.migrationPlans || []).includes('hybrid-cloud')) {
    tactics.push({
      title: 'Scope Hybrid Funding to What Actually Moves',
      desc: 'With a long-term hybrid footprint, AWS will fund only the workloads that migrate, so define those waves precisely rather than presenting an open-ended hybrid strategy. The on-prem estate is modest leverage (you have a working fallback), and price AWS Outposts only if specific workloads must stay on-site.',
      impact: 'medium',
    });
  }

  // Bundle accounts
  if (s.companySize === 'enterprise' || s.companySize === 'midmarket') {
    tactics.push({
      title: 'Consolidate All Linked Accounts Under One PPA',
      desc: 'Aggregate spend from subsidiaries, business units, and dev/test accounts under a single AWS Organizations management account before entering negotiation. Higher aggregated spend unlocks better discount tiers. Many companies leave 10–20% in discount improvement on the table by negotiating siloed accounts.',
      impact: 'medium',
    });
  }

  // Carry-forward
  tactics.push({
    title: 'Negotiate Carry-Forward and Shortfall Protections',
    desc: 'Insist on carry-forward provisions: unused commitment in Year 1 rolls into Year 2 rather than being forfeited. Also negotiate shortfall language — some agreements require you to pay for unused commitment at 100 cents on the dollar. Push for unused commitment to be credited toward future commitments or converted to credits.',
    impact: 'medium',
  });

  // Savings plans stacking
  if (tier >= 2) {
    tactics.push({
      title: 'Stack Compute Savings Plans on Top of PPA',
      desc: 'PPA discounts and Compute Savings Plans are not mutually exclusive. Compute Savings Plans applied on top of PPA pricing can deliver an additional 20–40% discount on qualifying compute. Negotiate explicit language in your PPA allowing Savings Plans to apply to PPA-discounted rates.',
      impact: 'medium',
    });
  }

  // Professional services
  if (tier >= 3) {
    tactics.push({
      title: 'Request Funded Professional Services and Training Credits',
      desc: 'AWS will often include $25K–$100K in AWS Professional Services time, training credits, and proof-of-concept funding as part of a larger PPA. Ask specifically for: training credits for team certification, funded well-architected reviews, and a dedicated Solutions Architect allocation. These have real dollar value beyond the headline discount.',
      impact: 'medium',
    });
  }

  // Growth narrative
  if (s.growthRate === 'hypergrowth' || s.growthRate === 'fast' || s.spendGrowth === 'hypergrowth' || s.spendGrowth === 'fast') {
    tactics.push({
      title: 'Build a Growth Narrative with Documented Projections',
      desc: 'AWS discounts today\'s spend but bets on tomorrow\'s. Prepare a 3-year cloud spend projection with supporting business data (customer growth, new products, infrastructure roadmap). Present AWS as a strategic partner in your growth, not just a vendor. Commit at a level that reflects future spend — higher commits unlock better tiers even if current spend is lower.',
      impact: 'medium',
    });
  }

  // Industry-specific
  if (s.compliance.includes('fedramp') || s.industry === 'government') {
    tactics.push({
      title: 'Leverage GovCloud / FedRAMP Requirements as Differentiation',
      desc: 'Your regulatory requirements make you a strategically important customer — AWS GovCloud expertise and compliance investments are a moat for AWS. Use this to request dedicated support resources, accelerated compliance reviews, and enhanced SLAs as part of your PPA. AWS will invest more in retaining FedRAMP-compliant workloads.',
      impact: 'medium',
    });
  }

  if (s.gpuUsage === 'capacity-blocks' || s.gpuUsage === 'both') {
    tactics.push({
      title: 'Get GPU Price Protection That Works Both Ways',
      desc: 'AWS raised EC2 Capacity Block prices roughly 20% on July 1, 2026 (the second increase that year) across the P6-B300, P6-B200, P5/P5e/P5en, and P4de families. Because your commitment is denominated in dollars rather than in GPU-hours, a list price increase silently reduces the compute your commit buys while still drawing it down on schedule. Size the commit against current rates rather than historical GPU spend, and negotiate a rate card on named instance families. Structure it as a ceiling, not a fixed price: you pay the lesser of the contracted rate or the current public price less your discount. A fixed rate protects you from increases but locks you out of cuts, and GPU prices fall as each new generation arrives.',
      impact: 'high',
    });
  }
  if (s.gpuUsage && s.gpuUsage !== 'none') {
    tactics.push({
      title: 'Make Sure GPU Price Cuts Reach You',
      desc: 'GPU prices fall as well as rise: in June 2025 AWS cut On-Demand prices on P5 by up to 45%, P5en by up to 26% and P4d/P4de by up to 33%, but the Savings Plan cut applied only to plans bought after June 4, so existing plans kept paying the old rate. Fixed private rate cards behave the same way. Four protections: (1) a price-down clause that explicitly covers private rate cards, Savings Plans and Capacity Blocks, not just public On-Demand prices; (2) the right to move a committed rate to a newer GPU generation at the same or better price per unit of performance, so you are not tied to aging hardware; (3) an annual GPU repricing review benchmarked against public pricing and Azure, GCP and neocloud quotes; (4) shorter terms on GPU commitments, using 1-year Savings Plans or a separate GPU tranche rather than folding GPUs into a 3–5 year rate.',
      impact: 'high',
    });
  }
  if (s.gpuUsage === 'evaluating') {
    tactics.push({
      title: 'Negotiate GPU Capacity Before the Workload Lands',
      desc: 'A net-new accelerated-compute decision is the strongest position you will hold in this cycle — AWS is actively defending AI workloads against Azure OpenAI and GCP Vertex, and capacity commitments are the outcome their account teams are measured on. Negotiate the GPU rate card, capacity reservations, and any Bedrock or SageMaker credits before the workload is architected onto AWS, not after. Once the workload is running, the leverage that came from being undecided is gone and the July 2026 Capacity Block increase becomes your baseline rather than your bargaining chip.',
      impact: 'high',
    });
  }

  if (s.useCases.includes('ml-ai') && tier >= 3) {
    tactics.push({
      title: 'Negotiate Bedrock / SageMaker Credits for AI Workloads',
      desc: 'AI/ML is AWS\'s fastest-growing segment and they actively subsidize adoption. Request dedicated Bedrock and SageMaker credits as part of your PPA — especially if you\'re evaluating or expanding AI use cases. AWS will often provide $50K–$250K in service-specific credits to lock in AI workloads vs. Azure OpenAI or GCP Vertex.',
      impact: 'medium',
    });
  }

  // AWS funded programs. MAP entry is pitched above under Credits; this covers
  // the case where the account is already enrolled.
  const programs = s.awsPrograms || [];
  if (programs.includes('map')) {
    tactics.push({
      title: 'Confirm How MAP Credits Interact With PPA Drawdown',
      desc: 'You are already in MAP. Get explicit written confirmation of whether MAP credits offset your PPA commitment drawdown or sit alongside it — the answer materially changes the commitment level you should agree to, and it is frequently left ambiguous in the initial paperwork. If credits do consume drawdown, size your commit net of expected credit, otherwise you will be committing to spend you have already been funded for.',
      impact: 'high',
    });
  }
  if (programs.includes('isv') || programs.includes('marketplace-seller')) {
    tactics.push({
      title: 'Trade Co-Sell Value Against Your Own Pricing',
      desc: 'As an ISV or Marketplace seller you are on both sides of the AWS relationship, and the revenue you drive through Marketplace is visible to your account team. Make it explicit in the negotiation: your listing, your co-sell pipeline, and your customer-driven consumption are all worth something to AWS. Accounts that generate seller-side revenue routinely leave that value unclaimed on the buyer-side contract.',
      impact: 'medium',
    });
  }

  // Reseller channel. Resellers typically stop serving accounts around $5M/yr,
  // so the advice depends on which side of that line the client sits and how
  // they buy today.
  if (resellerGraduating(s, tier)) {
    const std = getDiscountRange(s).standard;
    tactics.push({
      title: 'Graduating From Reseller to Direct: Price the Whole Switch',
      desc: `At your spend level, resellers typically can no longer serve the account, so you will be buying direct from AWS. Direct usually means a better discount${std ? ` (the standard direct rate for your commit and term is about ${std[0]}–${std[1]}%)` : ''}, but compare it against your full reseller price, not just the headline. Your current reseller discount (${RESELLER_DISCOUNT_LABELS[s.resellerDiscount] || 'unknown'}) goes away, and anything the reseller bundled now has to be bought or replaced: support (Enterprise Support is billed as a tiered percentage of monthly spend), billing and FinOps tooling, and partner-funded credits. Ask AWS to guarantee that your year-one effective price direct is no worse than your current reseller price, and line the PPA start date up with your reseller exit so there is no gap at on-demand rates.`,
      impact: 'high',
    });
  } else if (resellerApproachingCeiling(s, tier)) {
    tactics.push({
      title: 'Plan the Move to Direct Before You Hit the Reseller Ceiling',
      desc: 'Your growth will carry you past the ~$5M a year where resellers typically stop serving accounts. Negotiate the direct PPA on your own timeline rather than being moved mid-term: start direct discussions 6–9 months before you expect to cross the line, get a direct quote to benchmark against your reseller price now, and check your reseller contract for notice periods and minimums that would make a mid-term exit expensive.',
      impact: 'high',
    });
  } else if (viaReseller(s) && tier <= 4) {
    tactics.push({
      title: 'Benchmark Your Reseller Discount Against Direct Pricing',
      desc: `You already buy through a reseller (current discount: ${RESELLER_DISCOUNT_LABELS[s.resellerDiscount] || 'unknown'}). Make sure that discount is still competitive: get a direct quote from AWS and at least one competing reseller quote, and ask your reseller to itemise what is bundled (support, billing tooling, FinOps services) so you compare like with like. The reseller layer is valuable at your spend level, but only if it beats what you could get direct after accounting for those services.`,
      impact: 'high',
    });
  } else if (tier <= 4) {
    tactics.push({
      title: 'Explore AWS Reseller Channel for Additional Discount Layer',
      desc: 'AWS resellers (APN partners such as CDW, SHI, TD SYNNEX, Carahsoft, and specialist cloud partners) hold their own volume discount agreements with AWS and can pass a portion of that margin to customers as an incremental discount — typically 5–15% on top of standard AWS pricing. Critically, this discount layer is only available through the channel and cannot be unlocked by going direct to AWS. At your spend level (under $5M), a qualified reseller may deliver better net pricing than a PPA alone. Evaluate reseller quotes in parallel with direct AWS negotiations before committing to either route.',
      impact: 'high',
    });
  }

  // Current discount posture — where you start from shapes what you ask for
  const cur = s.currentDiscounts || [];
  if (cur.includes('none') || cur.length === 0) {
    tactics.push({
      title: 'You Are Paying List — Establish a Baseline Before Negotiating',
      desc: 'No commitment discounts are currently in place, which means every hour of compute is billed at on-demand rates. Before negotiating a PPA, capture the discount available without any negotiation at all: Compute Savings Plans and Reserved Instances are self-service and require no AWS approval. Knowing that floor prevents AWS from presenting standard, self-service savings as a negotiated concession — a common framing when an account has no discount history.',
      impact: 'high',
    });
  } else if (!cur.includes('savings-plans') && !cur.includes('reserved-instances') && tier >= 1) {
    tactics.push({
      title: 'Layer Savings Plans Underneath the PPA',
      desc: 'You hold negotiated discounts but no Savings Plans or Reserved Instances. These stack with a PPA rather than replacing it — the PPA discount applies on top of Savings Plan rates. Model your steady-state baseline and cover it with Compute Savings Plans independently of the PPA negotiation. This is committed discount you can secure without giving AWS anything at the table.',
      impact: 'high',
    });
  }
  if (cur.includes('edp-discount') && s.edpMonthsRemaining && s.edpMonthsRemaining !== 'na') {
    tactics.push({
      title: 'Benchmark Your Renewal Against Your Existing PPA Rate',
      desc: 'You are renewing an existing PPA rather than negotiating a first one, which means you have the single most useful benchmark available: your current effective discount. Calculate it precisely from actual invoices rather than from the contracted headline rate — the two often differ once service mix is accounted for. Any renewal offer below your current effective rate is a step backwards regardless of how the headline number is presented.',
      impact: 'high',
    });
  }

  // Spend concentration shapes which vehicle actually fits
  if (s.spendConcentration === 'concentrated') {
    tactics.push({
      title: 'Concentrated Spend Favors Service-Specific Commitments',
      desc: 'With one or two services driving more than 80% of spend, your negotiation should center on those services specifically rather than on a blended rate across the account. Ask for service-level discount terms on your dominant services, and check whether a service-specific commitment or a private pricing addendum beats a general PPA percentage. Concentration also means a single service price change moves your whole bill — request price protection on those services explicitly.',
      impact: 'medium',
    });
  } else if (s.spendConcentration === 'diverse') {
    tactics.push({
      title: 'Diversified Spend Argues for a Blended PPA Structure',
      desc: 'With spend spread thinly across many services, service-specific commitments will not cover enough of your bill to matter. A blended PPA discount applied account-wide is the right vehicle. Push for the broadest possible service inclusion list and explicitly confirm which services are excluded from discount — exclusions are where diversified accounts quietly lose most of the value they thought they negotiated.',
      impact: 'medium',
    });
  }

  // Workload profile drives how much you should commit
  if (s.workloadType === 'dev-heavy' || s.workloadType === 'batch') {
    tactics.push({
      title: 'Size the Commitment to Your Floor, Not Your Average',
      desc: `Your estate is ${s.workloadType === 'batch' ? 'batch and intermittent' : 'weighted toward dev and test'}, which makes consumption inherently variable. Commit only to the demonstrable floor of the last twelve months, not to the average — AWS will propose the higher number and the shortfall risk is entirely yours. Cover variable capacity above that floor with Spot and on-demand instead of folding it into the commitment. An underconsumed PPA costs more than a smaller one.`,
      impact: 'high',
    });
  } else if (s.workloadType === 'production-only') {
    tactics.push({
      title: 'Steady Production Load Supports a Confident Commitment',
      desc: 'A production-heavy estate has predictable consumption, which is the strongest position from which to commit. Use it: a higher, well-evidenced commitment buys a materially better discount tier, and your shortfall risk is genuinely low. Bring twelve months of consumption data to the table and let it argue for the tier — an account that can evidence its floor negotiates from a different footing than one estimating it.',
      impact: 'medium',
    });
  }

  // Storage: optimize the class mix before committing, and keep any
  // storage-specific discount from becoming a second shortfall exposure.
  if (hasStorage(s)) {
    tactics.push({
      title: 'Optimize Storage Before You Commit',
      desc: 'Storage pricing varies widely by class: S3 Standard lists at about $0.023 per GB-month and Glacier Deep Archive at about $0.00099. Before sizing the commit, move EBS gp2 volumes to gp3 (about 20% cheaper per GB), put lifecycle rules or Intelligent-Tiering on buckets with cold data, and clear unattached volumes and old snapshots. Commit on the optimized baseline, otherwise you lock waste into a committed rate. Plan class moves carefully: IA and Glacier classes carry minimum billing periods (30, 90 or 180 days), retrieval fees and per-object charges, and One Zone-IA keeps data in a single Availability Zone, so a badly planned move can cost more than it saves.',
      impact: ['unoptimized', 'partially'].includes(s.optimizationStatus) ? 'high' : 'medium',
    });
  }
  if (STORAGE_HEAVY.includes(s.storageShare)) {
    tactics.push({
      title: 'Negotiate a Storage Discount Without a Storage Trap',
      desc: `With storage at ${s.storageShare === '30plus' ? 'over 30%' : '15–30%'} of your spend, ask for a storage-specific discount on top of your overall PPA rate. AWS usually attaches a storage minimum to it, which works like a second commitment: miss it and you pay the shortfall even if you hit your overall number. Four protections: cap the minimum at 70–80% of the last twelve months' actual storage usage, not AWS's forecast; get the right to move spend between storage classes and services (S3, EBS, EFS, FSx) without breaching it; refuse cross-default, so a storage miss cannot reprice the whole agreement; and do not set a minimum on storage you plan to move, archive or shrink.`,
      impact: 'high',
    });
  }

  // BATNA
  tactics.push({
    title: 'Establish Your BATNA Before the First Meeting',
    desc: 'Know your Best Alternative To a Negotiated Agreement before talking to AWS. If AWS doesn\'t improve terms: can you extend month-to-month? Convert to pure on-demand + Savings Plans without a PPA? Move a workload to GCP? Having a realistic fallback prevents you from accepting bad terms under pressure. Never negotiate without a credible walk-away.',
    impact: 'low',
  });

  // Stable sort by impact before capping. The list is generated in authoring
  // order, so without this a high-impact tactic added late is silently dropped
  // by the slice while a low-impact one added early survives.
  const rank = { high: 0, medium: 1, low: 2 };
  return tactics
    .map((t, i) => ({ t, i }))
    .sort((a, b) => (rank[a.t.impact] ?? 1) - (rank[b.t.impact] ?? 1) || a.i - b.i)
    .map(x => x.t)
    .slice(0, 14);
}

function buildTimeline(s) {
  const isUrgent = s.renewalTimeline === 'within-1mo' || s.renewalTimeline === '1-3mo';
  const isIdeal = s.renewalTimeline === '6-12mo' || s.renewalTimeline === '12plusmo';

  const phases = [
    {
      phase: 'P1',
      when: isUrgent ? 'Week 1 (Immediate)' : 'Months 6–9 Before Renewal',
      title: 'Preparation & Baseline Establishment',
      desc: 'Do your homework before AWS does theirs. This phase determines your entire negotiating position.',
      tasks: [
        'Run AWS Cost Explorer and Compute Optimizer — document all rightsizing opportunities',
        'Pull 12-month spend breakdown by service, account, and region',
        'Identify your top 5 services by cost and model optimized spend',
        'Draft conservative, moderate, and aggressive 3-year spend projections',
        'List all workloads that could realistically move to Azure/GCP (your BATNA)',
      ],
    },
    {
      phase: 'P2',
      when: isUrgent ? 'Week 1–2' : 'Months 4–6 Before Renewal',
      title: 'Competitive Intelligence & Alternative Quotes',
      desc: 'Get real competitive quotes — even if you\'re not planning to switch, you need them at the table.',
      tasks: [
        'Request pricing from Azure and/or GCP for 2–3 representative workloads',
        'If using a consultant or FinOps advisor, engage them now',
        'Research AWS fiscal quarter timing — target negotiation close at quarter-end',
        'Identify your internal champion (CFO, CTO, or Procurement lead) and align on goals',
        'Prepare a one-page "AWS Strategic Partnership Brief" summarizing your growth and commitment',
      ],
    },
    {
      phase: 'P3',
      when: isUrgent ? 'Week 2–3' : 'Months 2–4 Before Renewal',
      title: 'Initial AWS Outreach & Anchoring',
      desc: 'First contact sets the tone. You\'re framing this as a strategic partnership discussion, not a renewal.',
      tasks: [
        'Contact your AWS account manager — request a "strategic review" meeting (not a renewal call)',
        'In the first meeting, lead with your growth roadmap, NOT your current spend',
        s.multicloud !== 'aws-only' ? 'Mention your multi-cloud footprint and the workloads you\'re evaluating consolidating' : 'Reference competitor pricing you\'ve received',
        'Ask AWS to model 1yr, 3yr, and 5yr scenarios with marketplace inclusion; each added year should be worth about a point',
        'Request their first proposal in writing — do not verbally commit to anything',
      ],
    },
    {
      phase: 'P4',
      when: isUrgent ? 'Week 3–4' : '4–6 Weeks Before Renewal',
      title: 'Negotiation & Counter-Proposal',
      desc: 'This is where the real negotiation happens. Go beyond headline discount to all 8 contract terms.',
      tasks: [
        'Counter AWS\'s first offer — anchor 15–20% higher than their opening discount',
        'Negotiate each of the 8 contract terms: discount, marketplace inclusion, Savings Plan stacking, carry-forward, support rate, renewal mechanics, shortfall treatment, exclusions',
        'Use competitive quotes as leverage — "Azure has offered us X for this workload"',
        'Request funded professional services, training credits, and MAP credits as add-ons',
        'Get everything in writing; confirm each change in the redlined agreement',
      ],
    },
    {
      phase: 'P5',
      when: isUrgent ? 'Week 4–5' : '1–2 Weeks Before Close',
      title: 'Final Close & Contract Review',
      desc: 'Don\'t let urgency lead to signing unfavorable terms. Legal and finance review is non-negotiable.',
      tasks: [
        'Have legal counsel review PPA contract language — especially shortfall and auto-renewal clauses',
        'Confirm all negotiated terms are reflected in the final agreement (not just in emails)',
        'Validate carry-forward, shortfall, and marketplace inclusion language is explicit',
        'Set up post-signing review cadence: quarterly business reviews with your AWS account team',
        'Establish internal tracking: commit utilization dashboard, quarterly forecasts vs. actuals',
      ],
    },
  ];

  return phases;
}

function buildConcessions(s, tier) {
  const concessions = [];

  concessions.push({
    icon: '💳',
    title: 'Carry-Forward Provisions',
    desc: 'Unused annual commitment rolls to the next year rather than being forfeited.',
    priority: 'must',
  });

  if (tier >= 3) {
    concessions.push({
      icon: '🏪',
      title: 'AWS Marketplace Inclusion',
      desc: 'Up to 25% of commitment can burn down via Marketplace purchases.',
      priority: 'must',
    });
  }

  if (s.supportTier === 'enterprise' || s.supportTier === 'enterprise-on-ramp') {
    concessions.push({
      icon: '🎧',
      title: 'Support Rate Reduction',
      desc: 'Negotiate 10% Enterprise Support down to 7–8%, or cap at a fixed dollar amount.',
      priority: tier >= 4 ? 'must' : 'should',
    });
  }

  if (isMigrating(s)) {
    concessions.push({
      icon: '✈️',
      title: 'Migration Investment Package',
      desc: 'Funding to offset parallel running, data transfer and re-platforming, kept separate from ProServ hours and sized to your estate and opportunity.',
      priority: 'must',
    });
  }

  concessions.push({
    icon: '📦',
    title: 'Savings Plans Stacking',
    desc: 'Explicit language allowing Compute Savings Plans to apply on top of PPA pricing.',
    priority: 'should',
  });

  concessions.push({
    icon: '🔄',
    title: 'Shortfall Protection',
    desc: 'Unused commitment converts to credits rather than requiring cash payment.',
    priority: 'should',
  });

  if (tier >= 3) {
    concessions.push({
      icon: '👩‍💻',
      title: 'Funded Professional Services',
      desc: '$25K–$100K in AWS ProServ time for architecture reviews, FinOps, or implementation.',
      priority: 'should',
    });
  }

  concessions.push({
    icon: '🎓',
    title: 'Training & Certification Credits',
    desc: 'Credits for AWS training courses and certification exam vouchers for your team.',
    priority: tier >= 3 ? 'should' : 'nice',
  });

  if (s.useCases.includes('ml-ai')) {
    concessions.push({
      icon: '🤖',
      title: 'Bedrock / SageMaker Credits',
      desc: 'Service-specific AI credits to accelerate ML workload development.',
      priority: 'should',
    });
  }

  if (s.gpuUsage && s.gpuUsage !== 'none') {
    concessions.push({
      icon: '🎛️',
      title: 'Accelerated Compute Price Protection',
      desc: 'A rate card on named GPU families that acts as a ceiling: you pay the lesser of the contracted rate or the current public price less your discount, so you are protected from increases without missing cuts.',
      priority: s.gpuUsage === 'evaluating' || s.gpuUsage === 'both' ? 'must' : 'should',
    });
  }

  concessions.push({
    icon: '📋',
    title: 'Dedicated TAM Allocation',
    desc: 'Named Technical Account Manager with defined SLA response times.',
    priority: tier >= 4 ? 'should' : 'nice',
  });

  concessions.push({
    icon: '🔒',
    title: 'Flexible Renewal Terms',
    desc: 'Right to renegotiate discount at renewal without penalty; no auto-renewal lock-in.',
    priority: 'should',
  });

  if (s.compliance.includes('hipaa') || s.compliance.includes('pci') || s.compliance.includes('fedramp')) {
    concessions.push({
      icon: '🛡️',
      title: 'Compliance Acceleration Support',
      desc: 'Funded compliance advisory hours and access to AWS compliance specialists.',
      priority: 'should',
    });
  }

  concessions.push({
    icon: '📌',
    title: 'Pricing Schedule Freeze',
    desc: "Rates, service pricing, and discount terms fixed as of signature. Where the PPA points to AWS’s published pricing pages, pin that reference to a dated snapshot so effective rates cannot move mid-term without a signed amendment.",
    priority: 'must',
  });

  concessions.push({
    icon: '📉',
    title: 'Price-Down (MFN) Trigger',
    desc: s.gpuUsage && s.gpuUsage !== 'none'
      ? "If AWS cuts pricing on any service you consume, the lower rate applies automatically within 30 days with your PPA discount still stacked on top. Name your GPU instance families and make the clause cover private rate cards, Savings Plans and Capacity Blocks, not just public On-Demand prices; GPU prices fall as each new generation arrives."
      : "If AWS cuts published pricing on any service you consume, the lower rate applies automatically within 30 days with your PPA discount still stacked on top. AWS reduces prices regularly — without this term, those reductions accrue to AWS rather than to you.",
    priority: s.gpuUsage && s.gpuUsage !== 'none' ? 'must' : 'should',
  });

  return concessions;
}

function buildRisks(s, tier) {
  const risks = [];

  if (s.commitUtilization === 'under70') {
    risks.push({
      level: 'high',
      title: 'Underutilization History',
      desc: 'Prior shortfall weakens your position. AWS may require lower discount tiers or strict shortfall payment terms. Consider a smaller, credible commitment.',
    });
  }

  if (s.renewalTimeline === 'within-1mo') {
    risks.push({
      level: 'high',
      title: 'Negotiating Under Deadline',
      desc: 'Urgency is your opponent\'s advantage. AWS knows you can\'t walk away easily. Request an extension before signing anything.',
    });
  }

  if (s.multicloud === 'aws-only') {
    risks.push({
      level: 'high',
      title: 'No Competitive Alternative',
      desc: 'All-in on AWS with no credible alternative significantly limits your leverage. AWS knows switching costs are high. Get at least one competitive quote before negotiating.',
    });
  }

  if (s.optimizationStatus === 'unoptimized') {
    risks.push({
      level: 'medium',
      title: 'Inflated Commit Baseline',
      desc: 'Committing to unoptimized spend means paying for waste at a committed rate. Optimize first, then commit.',
    });
  }

  if (s.spendGrowth === 'declining') {
    risks.push({
      level: 'medium',
      title: 'Declining Spend Trajectory',
      desc: 'Declining AWS spend reduces your leverage significantly. AWS prioritizes growing accounts. Be transparent, focus on future workloads, and commit conservatively.',
    });
  }

  if (tier <= 1) {
    risks.push({
      level: 'medium',
      title: 'Below PPA Threshold',
      desc: 'Your current spend falls below the $300K annual commit where PPA pricing starts. Focus on Savings Plans + Reserved Instances for now, and build a growth story to reach PPA eligibility.',
    });
  }

  risks.push({
    level: 'medium',
    title: 'Auto-Renewal Clauses',
    desc: 'Many PPAs auto-renew at the same or worse terms without formal notice. Negotiate explicit renewal negotiation windows (90 days notice required) into the agreement.',
  });

  if (['3yr', '4yr', '5yr'].includes(s.desiredTerm)) {
    const years = TERM_LABELS[s.desiredTerm];
    risks.push({
      level: s.desiredTerm === '3yr' ? 'medium' : 'high',
      title: `${years.charAt(0).toUpperCase() + years.slice(1)} Lock-in Risk`,
      desc: `A ${years} commitment at current pricing can backfire if services are repriced or if your architecture changes significantly. Each year past three adds only about one point of discount, so weigh that against the extra lock-in. Negotiate annual true-up provisions and a carry-forward for any shortfall.`,
    });
  }

  if (STORAGE_HEAVY.includes(s.storageShare)) {
    risks.push({
      level: s.storageShare === '30plus' ? 'high' : 'medium',
      title: 'Storage Minimum Shortfall',
      desc: 'A storage-specific discount usually comes with its own minimum. You can meet the overall commitment and still owe a shortfall on storage. Cap it against trailing usage and keep the right to move spend between storage classes and services.',
    });
  }
  if (hasStorage(s)) {
    risks.push({
      level: 'medium',
      title: 'Storage Class Billing Pitfalls',
      desc: 'Minimum billing periods (30–180 days), retrieval fees, per-object transition charges on small files, and One Zone-IA availability risk can wipe out the savings from a storage class move. Model the move on real access patterns before committing to it.',
    });
  }
  if (resellerGraduating(s, tier)) {
    risks.push({
      level: 'high',
      title: 'Losing the Reseller Layer Without a Net Gain',
      desc: 'Moving direct removes the reseller discount and anything it bundled (support, tooling, credits). If the direct PPA is priced only against list, your effective price can go up. Compare against your full current reseller price.',
    });
  }

  risks.push({
    level: 'low',
    title: 'Account Team Turnover',
    desc: 'AWS account teams turn over frequently. Ensure all agreements are contractually documented — don\'t rely on verbal commitments from your current AE.',
  });

  if (s.compliance.includes('hipaa') || s.compliance.includes('fedramp')) {
    risks.push({
      level: 'low',
      title: 'Compliance-Specific Contract Language',
      desc: 'Regulatory commitments (HIPAA, FedRAMP) should be explicitly included in BAAs and addenda — ensure these are part of the PPA package, not separate upsells.',
    });
  }

  return risks;
}

function buildQuestions(s, tier) {
  const questions = [
    'What is the current standard PPA discount for our spend tier, and what would get us to the next tier?',
    'Can you show us a scenario where our existing Compute Savings Plans stack on top of PPA pricing?',
    'What percentage of our PPA commitment can be satisfied through AWS Marketplace purchases?',
  ];

  if (tier >= 3) {
    questions.push('What is the process for negotiating our Enterprise Support rate, and what floor can you offer?');
    questions.push('What funded professional services or MAP credits can be included in this agreement?');
  }

  // Workload-specific asks sit ahead of the generic tail below — the list is
  // capped at 12, and these are the questions only this client needs to ask.
  if (resellerGraduating(s, tier) || resellerApproachingCeiling(s, tier)) {
    questions.push('If we move from our reseller to a direct PPA, will you guarantee a year-one effective price no worse than our current reseller price, and how do our existing Reserved Instances, Savings Plans and credits transfer?');
  }

  if (s.gpuUsage && s.gpuUsage !== 'none') {
    questions.push('Will you agree a GPU rate card that works as a ceiling, so we pay the lesser of the contracted rate or the current public price less our discount, on the instance families we name?');
    questions.push('If accelerated-compute prices move mid-term, up or down, how does that flow through to our committed spend, our Savings Plans and any private rates?');
  }

  if (s.useCases.includes('ml-ai')) {
    questions.push('What service-specific credits or discounts exist for Bedrock and SageMaker as part of a PPA?');
  }

  if (isMigrating(s)) {
    questions.push('Which part of this package is migration investment and which is professional services hours, when does each expire, and do credits count toward our commitment drawdown?');
  }
  if ((s.migrationPlans || []).includes('storage-migration')) {
    questions.push('Does storage we move with AWS Transform, including to FSx for NetApp ONTAP, count toward our MAP funding?');
  }

  if (STORAGE_HEAVY.includes(s.storageShare)) {
    questions.push('Is there a storage-specific minimum behind this rate, how is it measured, and can we move spend between storage classes and services without a shortfall?');
  }

  questions.push('What are the exact shortfall mechanics — if we miss our annual commitment, how is the shortfall calculated and billed?');
  questions.push('How does the carry-forward work — if we underspend in Year 1 of a 3-year PPA, how is the unused amount applied?');

  if (s.multicloud !== 'aws-only') {
    questions.push('We currently run workloads on Azure/GCP — what discount improvement would you offer if we committed to consolidating those on AWS?');
  }

  questions.push('What happens to our discount rate if our spend grows 50% above the committed level — is there an upside ramp?');
  questions.push('Can you show us the full redlined PPA template before we agree to terms verbally?');

  if (tier >= 5) {
    questions.push('What executive sponsorship from AWS leadership is included at our investment level?');
  }

  return questions.slice(0, 12);
}

function buildAlerts(s, tier) {
  const alerts = [];

  if (tier >= 2) {
    alerts.push({
      type: 'info',
      icon: '📄',
      text: '<strong>Terminology: EDP is now called a PPA.</strong> AWS has rebranded the Enterprise Discount Program as the Private Pricing Agreement. The commercial mechanics are unchanged — tiered discounts against a multi-year spend commitment — so older paperwork saying "EDP" and new paperwork saying "PPA" describe the same instrument. This guidance uses PPA throughout. Expect AWS account teams to use the new term, and do not treat a "new PPA structure" framing as a substantive change from the EDP you may already hold.',
    });
  }

  if (s.renewalTimeline === 'within-1mo') {
    alerts.push({
      type: 'danger',
      icon: '🚨',
      text: '<strong>Urgent: You have less than 30 days.</strong> Do not sign anything under deadline pressure. Immediately request a 60–90 day extension of current terms while negotiating. This is your most important first step.',
    });
  }

  if (s.commitUtilization === 'under70' && tier >= 2) {
    alerts.push({
      type: 'warning',
      icon: '⚠️',
      text: '<strong>Shortfall Risk Detected.</strong> You underutilized your prior commitment by 30%+. AWS will use this against you in negotiations. Proactively acknowledge this, explain why (optional: infrastructure optimization), and commit to a more conservative, achievable number this cycle.',
    });
  }

  if (s.multicloud === 'aws-only' && tier >= 3) {
    alerts.push({
      type: 'warning',
      icon: '⚡',
      text: '<strong>No Competitive Leverage Detected.</strong> At your spend level, going into a PPA negotiation without a credible competitive alternative significantly limits you to roughly the standard rate for your commit and term; competitive pressure is worth 2–4 points on top. Even requesting Azure/GCP pricing for a small workload before negotiating is worth doing.',
    });
  }

  if (tier <= 1 && s.annualSpend !== 'under100k') {
    alerts.push({
      type: 'info',
      icon: 'ℹ️',
      text: '<strong>PPA Threshold:</strong> PPA pricing starts at a $300K annual commit, and commits under $1M may need extra approval inside AWS. At your current level, focus on Compute Savings Plans and Reserved Instances. However, if you have strong growth projections, AWS may offer a PPA based on committed future spend, especially if you\'re entering a high-growth phase.',
    });
  }

  if (resellerGraduating(s, tier)) {
    alerts.push({
      type: 'warning',
      icon: '🔀',
      text: '<strong>Reseller Ceiling: Expect to Move Direct.</strong> You buy through a reseller, and at your spend level resellers typically can no longer serve the account (the usual ceiling is around $5M a year). Treat this cycle as a reseller-to-direct transition: price the direct PPA against your full current reseller price, including any bundled support and tooling, and work through the transition checklist below before your reseller exit date.',
    });
  } else if (resellerApproachingCeiling(s, tier)) {
    alerts.push({
      type: 'info',
      icon: '🔀',
      text: '<strong>Approaching the Reseller Ceiling.</strong> At your growth rate you are likely to pass the ~$5M a year where resellers typically stop serving accounts. Plan the move to a direct PPA now so it happens on your timeline, not mid-term.',
    });
  }
  if (tier <= 4 && !viaReseller(s)) {
    alerts.push({
      type: 'success',
      icon: '🟢',
      text: '<strong>Reseller Channel Discount Available at Your Spend Level.</strong> At spend under $5M/year, AWS resellers (APN channel partners such as CDW, SHI, TD SYNNEX, and specialist cloud resellers) can unlock incremental discounts — typically 5–15% — that AWS does not offer on direct deals of this size. This discount layer exists because resellers carry their own volume agreements with AWS and pass margin through to the customer. Above $5M, direct PPA terms typically outpace channel pricing. Before committing to a direct renewal, obtain at least one competing reseller quote to benchmark net pricing.',
    });
  }
  if (s.edpMonthsRemaining === 'under3') {
    alerts.push({ type: 'danger', icon: '🚨', text: '<strong>PPA Expiring in Under 3 Months.</strong> You are in the weakest possible negotiating position — AWS knows you must renew. Immediately request a short-term 90-day extension at current rates while negotiating the new PPA. Do not let the contract lapse; AWS will reset pricing to on-demand rates.' });
  } else if (s.edpMonthsRemaining === '3-6') {
    alerts.push({ type: 'warning', icon: '⚠️', text: '<strong>Limited PPA Negotiation Window.</strong> With 3–6 months remaining, your leverage window is narrowing. Begin formal PPA discussions now. AWS\'s first offer at this stage tends to be below what is achievable with a 9-month runway — push back on the first proposal.' });
  }
  if (s.gpuUsage === 'capacity-blocks' || s.gpuUsage === 'both') {
    alerts.push({ type: 'warning', icon: '🎛️', text: '<strong>GPU Capacity Block Prices Rose ~20% on July 1, 2026.</strong> This was the second increase that year, covering the P6-B300, P6-B200, P5/P5e/P5en, and P4de families. All other EC2 pricing was unchanged. Two consequences for this negotiation: a commit sized on pre-July GPU spend understates what that same capacity now costs, and a dollar-denominated commitment buys less accelerated compute than it did last cycle while still drawing down at the same rate. Size against current rates, and ask for accelerated-compute price protection explicitly — it will not be offered.' });
  }
  if (s.gpuUsage === 'capacity-blocks' || s.gpuUsage === 'both') {
    alerts.push({ type: 'warning', icon: '📈', text: '<strong>Capacity Block Rates Reset Again on October 7, 2026.</strong> AWS\'s pricing page lists new per-accelerator rates effective October 7 (P6-B300 $16.146, P6-B200 $14.208, P5 $5.970 in US regions), roughly 15% above the July levels by our calculation, and says reservation prices are updated regularly with supply and demand. Treat Capacity Blocks as a variable-price product: size any commitment against current rates, not the July figures, and ask for a rate card on the named GPU families you actually run that works as a ceiling for the term of the PPA, so later cuts still reach you.' });
  }
  if (s.gpuUsage && s.gpuUsage !== 'none') {
    alerts.push({ type: 'info', icon: '📉', text: '<strong>Fixed GPU Rates Cut Both Ways.</strong> A fixed GPU rate card or a long Savings Plan protects you from increases, but when AWS cuts GPU prices mid-term the saving goes to AWS, not you. In June 2025 AWS cut P5 On-Demand prices by up to 45%, and only Savings Plans bought after the cut got the lower rate. Ask for a rate card that works as a ceiling, a price-down clause that covers private rates and Savings Plans, and the right to move to newer GPU generations.' });
  }
  if (s.databaseSavingsPlans && s.databaseSavingsPlans !== 'none') {
    alerts.push({ type: 'success', icon: '🟢', text: '<strong>Database Savings Plans Opportunity Detected.</strong> AWS launched Database Savings Plans in December 2025 — 12–35% discounts on Aurora Serverless, DocumentDB, Neptune, Keyspaces, and Timestream on 1-year no-upfront terms. These are almost never included in AWS\'s PPA proposal. Raise this as a separate workstream in your negotiation and request they be included in your PPA credit package.' });
  }

  if (s.contractType === 'on-demand' && tier >= 2) {
    alerts.push({
      type: 'warning',
      icon: '💸',
      text: '<strong>Significant Savings Opportunity Missed.</strong> You\'re currently on On-Demand pricing at a spend level where structured discounts (Savings Plans or PPA) would deliver 10–30% savings. This is a high-priority negotiation.',
    });
  }

  if (s.optimizationStatus === 'unoptimized' && tier >= 2) {
    alerts.push({
      type: 'info',
      icon: '🔧',
      text: '<strong>Optimize Before You Commit.</strong> AWS Compute Optimizer typically identifies 20–35% cost reduction in unoptimized environments. Completing this before your PPA negotiation lowers your commit baseline and reduces the risk of over-committing to inflated spend.',
    });
  }

  return alerts;
}

function buildCommitStructureHTML(s, tier) {
  if (tier < 2) {
    return `
    <div class="strategy-section">
      <div class="section-header">
        <span class="section-icon">🏗️</span>
        <h3>Recommended Commitment Structure</h3>
      </div>
      <div class="section-content">
        <div class="alert alert-info"><span class="alert-icon">ℹ️</span>
          <div>At your current spend level, the most cost-effective approach is <strong>Compute Savings Plans</strong> (1-year or 3-year, no upfront or partial upfront). These deliver 20–66% off On-Demand rates with no minimum commitment requirement and apply automatically across EC2, Fargate, and Lambda. Once your spend approaches $300K, initiate PPA conversations with your AWS account team proactively.</div>
        </div>
      </div>
    </div>`;
  }

  const termAdvice = s.desiredTerm === '5yr' || s.desiredTerm === '4yr'
    ? `${TERM_LABELS[s.desiredTerm]} PPA: highest standard rate, but each year past three adds only about one point. Only commit this long on stable, well-forecast spend, with annual ramp and carry-forward.`
    : s.desiredTerm === '3yr'
    ? '3-year PPA: strong discount with manageable commitment risk. Negotiate annual ramp and carry-forward.'
    : s.desiredTerm === '2yr'
    ? '2-year PPA — good balance of discount depth and flexibility. Most commonly signed at $2M–$5M spend.'
    : '1-year PPA (first cycle) — prove the relationship, then extend to 3 years at renewal with better terms.';

  return `
  <div class="strategy-section">
    <div class="section-header">
      <span class="section-icon">🏗️</span>
      <h3>Recommended Commitment Structure</h3>
    </div>
    <div class="section-content" style="display:flex;flex-direction:column;gap:14px;">
      <div class="alert alert-success"><span class="alert-icon">✅</span>
        <div><strong>Recommended:</strong> ${termAdvice}</div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:.85rem;">
        <thead>
          <tr style="border-bottom:2px solid var(--border);">
            <th style="text-align:left;padding:8px;color:var(--text-secondary);">Structure</th>
            <th style="text-align:center;padding:8px;color:var(--text-secondary);">Discount</th>
            <th style="text-align:center;padding:8px;color:var(--text-secondary);">Flexibility</th>
            <th style="text-align:left;padding:8px;color:var(--text-secondary);">Best For</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom:1px solid var(--surface-3);">
            <td style="padding:9px 8px;font-weight:600;">1-Year PPA</td>
            <td style="padding:9px 8px;text-align:center;">★★★☆☆</td>
            <td style="padding:9px 8px;text-align:center;">★★★★☆</td>
            <td style="padding:9px 8px;color:var(--text-secondary);">First PPA, uncertain growth</td>
          </tr>
          <tr style="border-bottom:1px solid var(--surface-3);">
            <td style="padding:9px 8px;font-weight:600;">3-Year PPA</td>
            <td style="padding:9px 8px;text-align:center;">★★★★★</td>
            <td style="padding:9px 8px;text-align:center;">★★☆☆☆</td>
            <td style="padding:9px 8px;color:var(--text-secondary);">Stable workloads, predictable growth</td>
          </tr>
          <tr style="border-bottom:1px solid var(--surface-3);">
            <td style="padding:9px 8px;font-weight:600;">4–5-Year PPA</td>
            <td style="padding:9px 8px;text-align:center;">★★★★★</td>
            <td style="padding:9px 8px;text-align:center;">★☆☆☆☆</td>
            <td style="padding:9px 8px;color:var(--text-secondary);">Large, mature estates; about 1–2 points over a 3-year term</td>
          </tr>
          <tr style="border-bottom:1px solid var(--surface-3);">
            <td style="padding:9px 8px;font-weight:600;">PPA + Savings Plans Stack</td>
            <td style="padding:9px 8px;text-align:center;">★★★★★</td>
            <td style="padding:9px 8px;text-align:center;">★★★☆☆</td>
            <td style="padding:9px 8px;color:var(--text-secondary);">Heavy compute, EC2-dominant spend</td>
          </tr>
          <tr>
            <td style="padding:9px 8px;font-weight:600;">Savings Plans Only</td>
            <td style="padding:9px 8px;text-align:center;">★★★☆☆</td>
            <td style="padding:9px 8px;text-align:center;">★★★★★</td>
            <td style="padding:9px 8px;color:var(--text-secondary);">Sub-$300K, high variability</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>`;
}

function buildResellerTransitionHTML(s, tier) {
  if (!resellerGraduating(s, tier) && !resellerApproachingCeiling(s, tier)) return '';
  const items = [
    ['Payer account', 'Confirm whether the reseller owns the management (payer) account. Plan the AWS Organizations move or account transfer, and who does the work.'],
    ['Reserved Instances & Savings Plans', 'Commitments bought under the reseller’s payer account are tied to that organization. Confirm in writing how they carry over, or time the exit to when they expire.'],
    ['Support', 'Price AWS Enterprise Support (or Enterprise On-Ramp) directly to replace partner-led support, and negotiate the support rate inside the PPA, not after it.'],
    ['Billing data & tooling', 'Secure your Cost and Usage Report history and replace any FinOps or billing tooling the reseller provided before cutover.'],
    ['Credits & funding', 'List any MAP, partner-funded or promotional credits tied to the reseller relationship and confirm what transfers and what expires.'],
    ['Reseller exit terms', 'Check notice periods, minimum commitments and termination fees in the reseller contract, and set the exit date to match the PPA start.'],
    ['Vendor setup', 'Onboard AWS as a direct vendor (billing entity, PO, tax and currency) early; it often takes longer than the commercial negotiation.'],
  ];
  return `
  <div class="strategy-section">
    <div class="section-header">
      <span class="section-icon">🔀</span>
      <h3>Reseller-to-Direct Transition Checklist</h3>
      <span class="section-badge">${resellerGraduating(s, tier) ? 'Moving direct' : 'Plan ahead'}</span>
    </div>
    <div class="section-content">
      <table style="width:100%;border-collapse:collapse;font-size:.85rem;">
        <tbody>${items.map(([k, v]) => `<tr style="border-bottom:1px solid var(--surface-3);">
          <td style="padding:9px 8px;font-weight:600;white-space:nowrap;vertical-align:top;">${k}</td>
          <td style="padding:9px 8px;color:var(--text-secondary);">${v}</td>
        </tr>`).join('')}</tbody>
      </table>
    </div>
  </div>`;
}

// Converts a credit offer into equivalent discount points so it can be weighed
// against the rate. Uses the midpoint of the spend band and the chosen term.
function creditEquivalentBasis(s) {
  const band = SPEND_TIERS[s.annualSpend];
  if (!band) return null;
  const annual = band.max === Infinity ? band.min * 1.2 : (band.min + band.max) / 2;
  const years = { '1yr': 1, '2yr': 2, '3yr': 3, '4yr': 4, '5yr': 5 }[s.desiredTerm] || 3;
  return { annual, years };
}

function updateCreditEquivalent(input) {
  const annual = +input.dataset.annual, years = +input.dataset.years;
  const credit = Math.max(+input.value || 0, 0) * 1e6;
  const out = document.getElementById('credit-equiv-out');
  if (!out) return;
  if (!credit) { out.textContent = 'Enter an offer to see its value in discount points.'; return; }
  const yr1 = (credit / annual * 100).toFixed(1);
  const term = (credit / (annual * years) * 100).toFixed(1);
  out.innerHTML = `≈ <strong>${term} pts</strong> across a ${years}-year commit, or <strong>${yr1} pts</strong> if it all lands in year one and nothing after.`;
}

function buildCreditsHTML(s, tier) {
  if (!isMigrating(s)) return '';
  const sizing = creditSizing(s);
  const sources = (s.migrationSource || []).map(x => MIGRATION_SOURCE_LABELS[x]);
  const competitor = competitorSources(s).length > 0;
  const plans = s.migrationPlans || [];
  const basis = creditEquivalentBasis(s);
  const fmt = n => n >= 1e6 ? '$' + (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M' : '$' + Math.round(n / 1e3) + 'K';

  const angles = [];
  if (competitor) angles.push(`<strong>Moving from ${competitorLabel(s)}:</strong> AWS is winning revenue from a competitor, which is where funding is most generous. Cost the exit in full (parallel running, data transfer, contract overlap) and ask the incumbent for its exit egress waiver; Google, AWS and Microsoft all introduced these in 2024, on request.`);
  if ((s.migrationSource || []).includes('onprem') || plans.includes('onprem-exit')) angles.push('<strong>Moving from on-premises:</strong> MAP funding is structured around assess, mobilize and migrate phases. Tie each tranche to a phase milestone so funding arrives when the cost does, and include hardware refresh you avoid as part of the business case.');
  if (plans.includes('storage-migration')) angles.push('<strong>Storage moving with the workloads:</strong> Amazon FSx is on the MAP included services list (updated October 13, 2026), and since September 3, 2026 AWS Transform can migrate attached block storage straight to FSx for NetApp ONTAP in the same wave as compute. Include the storage move in the same funding package; there is no separate storage funding program to rely on.');
  if (plans.includes('hybrid-cloud')) angles.push('<strong>Staying hybrid long-term:</strong> AWS funds what actually moves, so scope funded waves to those workloads. Keeping an on-prem footprint is modest leverage (a working fallback), and AWS Outposts is worth pricing only if some workloads must stay on-site.');

  return `
  <div class="strategy-section">
    <div class="section-header">
      <span class="section-icon">🏦</span>
      <h3>Migration Credits & Funding</h3>
      <span class="section-badge green">${sizing.label} package</span>
    </div>
    <div class="section-content" style="display:flex;flex-direction:column;gap:14px;">
      <div class="concessions-grid">
        <div class="concession-card">
          <div class="cc-icon">👩‍💻</div>
          <div class="cc-title">Professional Services Credits</div>
          <div class="cc-desc">AWS ProServ or partner hours for design, migration factory work, Well-Architected reviews and training. Valuable only if you would otherwise have paid for that work.</div>
        </div>
        <div class="concession-card">
          <div class="cc-icon">💵</div>
          <div class="cc-title">Migration Investment</div>
          <div class="cc-desc">Funding that offsets the cost of moving: running both environments during cutover, data transfer, re-platforming and exit costs. The bigger lever, and the one AWS sizes to the opportunity.</div>
        </div>
      </div>
      <div class="alert alert-success"><span class="alert-icon">📐</span>
        <div><strong>Size of the ask: ${sizing.label}.</strong> ${sizing.text}${sizing.label === 'Top end' ? '' : ' Packages depend on the size and complexity of the existing estate and of the AWS opportunity; at the top end they have reached about $50M.'}${sources.length ? ` <span style="color:var(--text-muted)">(Moving from ${sources.join(', ')}${s.migrationSpend && s.migrationSpend !== 'na' ? '; ' + ({ under1m: 'under $1M', '1m-5m': '$1M–$5M', '5m-10m': '$5M–$10M', '10mplus': '$10M+' }[s.migrationSpend]) + ' a year moving' : ''}${s.migrationComplexity ? '; ' + s.migrationComplexity + ' migration' : ''}.)</span>` : ''}</div>
      </div>
      ${angles.length ? `<div class="alerts-list">${angles.map(a => `<div class="alert alert-info"><span class="alert-icon">➜</span><div>${a}</div></div>`).join('')}</div>` : ''}
      ${basis ? `<div style="padding:12px 14px;border:1px solid var(--border);border-radius:8px;font-size:.85rem;">
        <div style="font-weight:700;margin-bottom:6px;">Credits vs. discount</div>
        <div style="color:var(--text-secondary);margin-bottom:8px;">Credits are one-time; discount points last the whole term. At the midpoint of your spend band (${fmt(basis.annual)} a year) on a ${basis.years}-year commit, every $1M of credits is worth about <strong>${(1e6 / (basis.annual * basis.years) * 100).toFixed(1)} pts</strong> of discount spread over the term.</div>
        <label style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">Credit offer ($M):
          <input type="number" min="0" step="0.5" style="width:100px;padding:4px 8px;" data-annual="${basis.annual}" data-years="${basis.years}" oninput="updateCreditEquivalent(this)" />
          <span id="credit-equiv-out" style="color:var(--text-muted);">Enter an offer to see its value in discount points.</span>
        </label>
      </div>` : ''}
    </div>
  </div>`;
}

// ─── Export / Print ───────────────────────────────────────────────────────────
function printStrategy() {
  window.print();
}

// ─── Sample output ──────────────────────────────────────────────────────────
// A fixed, illustrative client profile so advisors can show what the planner
// produces without filling in the form. Kept deliberately consistent across the
// AWS, Azure, GCP, and Salesforce planners.
const SAMPLE_PROFILE = "Mid-market SaaS company · $10M–$25M annual AWS spend";
const SAMPLE_STATE = {
  "industry": "saas",
  "growthRate": "moderate",
  "spendGrowth": "moderate",
  "renewalTimeline": "6-12mo",
  "desiredTerm": "3yr",
  "commitUtilization": "85-100",
  "workloadType": "mixed",
  "optimizationStatus": "partially",
  "relationshipQuality": "moderate",
  "compliance": [
    "sox"
  ],
  "companySize": "midmarket",
  "awsTenure": "3-5",
  "contractType": "ppa",
  "annualSpend": "10m-25m",
  "marketplaceSpend": "100k-500k",
  "databaseSavingsPlans": "none",
  "edpMonthsRemaining": "6-12",
  "currentDiscounts": [
    "edp-discount",
    "savings-plans"
  ],
  "supportTier": "enterprise",
  "buyingChannel": "direct",
  "resellerDiscount": "",
  "storageShare": "under15",
  "useCases": [
    "compute",
    "containers",
    "databases",
    "data-analytics"
  ],
  "spendConcentration": "moderate",
  "gpuUsage": "none",
  "multicloud": "aws-primary",
  "migrationPlans": [
    "new-projects"
  ],
  "awsPrograms": [
    "none"
  ],
  "migrationSource": [],
  "migrationSpend": "na",
  "migrationComplexity": ""
};

function sampleBannerHTML(fromForm) {
  return `<div class="sample-banner" role="note">
    <span class="sample-tag">SAMPLE</span>
    <div><strong>Sample output — illustrative data, not a client analysis.</strong>
    ${fromForm ? 'Built using the Fill Sample Data buttons — inputs may have been edited since.' : 'Generated from a fixed example profile: ' + SAMPLE_PROFILE + ', 3-year term, renewal 6–12 months out.'}
    Proxima deal calibration data is excluded. Use <em>Edit Inputs</em> to build a real strategy.</div>
  </div>`;
}

function showSample() {
  Object.keys(state).forEach(k => delete state[k]);
  Object.assign(state, JSON.parse(JSON.stringify(SAMPLE_STATE)));
  // Never let real logged deals appear inside sample output.
  const realInsight = getProximaInsight;
  getProximaInsight = () => null;
  try {
    document.getElementById('strategy-output').innerHTML = sampleBannerHTML() + buildStrategyHTML(state);
  } finally {
    getProximaInsight = realInsight;
  }
  document.body.classList.add('is-sample');
  goToStep(5);
}

// ─── Per-screen sample fill ─────────────────────────────────────────────────
// Each input screen has a "Fill Sample Data" button that populates that screen
// from SAMPLE_STATE, so the tool can be demonstrated step by step. Any strategy
// generated after a sample fill is marked as sample output, even if some fields
// were edited afterwards — a demo must never pass for a client analysis.
const sampleFilledSteps = new Set();
const OUTPUT_STEP = document.querySelectorAll('.step-panel').length;

function toCamel(id) { return id.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase()); }

function fillSampleStep(n, btn) {
  const panel = document.getElementById('step-' + n);
  if (!panel) return;
  const val = id => SAMPLE_STATE[toCamel(id)];

  panel.querySelectorAll('select[id]').forEach(el => {
    const v = val(el.id);
    if (v === undefined) return;
    el.value = v;
    el.style.borderColor = '';
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  panel.querySelectorAll('.radio-cards[id]').forEach(g => {
    const v = val(g.id);
    if (v === undefined) return;
    g.querySelectorAll('.radio-card').forEach(c => c.classList.toggle('selected', c.dataset.value === v));
    g.style.outline = '';
  });
  panel.querySelectorAll('.use-case-grid[id]').forEach(g => {
    const v = val(g.id);
    if (!Array.isArray(v)) return;
    g.querySelectorAll('.use-case-card').forEach(c => c.classList.toggle('selected', v.includes(c.dataset.value)));
  });
  panel.querySelectorAll('.checkbox-group[id]').forEach(g => {
    const v = val(g.id);
    if (!Array.isArray(v)) return;
    g.querySelectorAll('input[type=checkbox]').forEach(i => { i.checked = v.includes(i.value); });
  });
  // Some checkbox sets are grouped by class rather than by a container id.
  panel.querySelectorAll('input[type=checkbox][class]').forEach(i => {
    const v = SAMPLE_STATE[toCamel(i.className.split(' ')[0])];
    if (Array.isArray(v)) i.checked = v.includes(i.value);
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
  const realInsight = getProximaInsight;
  if (usingSample) getProximaInsight = () => null;  // keep real deal data out of demos
  try {
    realGenerateStrategy();
  } finally {
    getProximaInsight = realInsight;
  }
  if (usingSample && currentStep === OUTPUT_STEP) {
    const out = document.getElementById('strategy-output');
    out.innerHTML = sampleBannerHTML(true) + out.innerHTML;
    document.body.classList.add('is-sample');
  }
};

const realShowSample = showSample;
showSample = function () {
  // Fill the form too, so "Edit Inputs" shows the sample rather than blank fields.
  for (let i = 1; i < OUTPUT_STEP; i++) fillSampleStep(i);
  realShowSample();
};
