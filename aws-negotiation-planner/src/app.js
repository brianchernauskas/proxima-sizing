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
  }
  if (step === 3) {
    state.useCases = [...document.querySelectorAll('#use-cases .selected')].map(c => c.dataset.value);
    state.workloadType = document.getElementById('workload-type').value;
    state.spendConcentration = document.getElementById('spend-concentration').value;
    state.gpuUsage = document.getElementById('gpu-usage')?.value || 'none';
    state.optimizationStatus = document.getElementById('optimization-status').value;
  }
  if (step === 4) {
    state.multicloud = document.querySelector('#multicloud .selected')?.dataset.value;
    state.relationshipQuality = document.getElementById('relationship-quality').value;
    state.migrationPlans = [...document.querySelectorAll('#migration-plans input:checked')].map(i => i.value);
    state.awsPrograms = [...document.querySelectorAll('#aws-programs input:checked')].map(i => i.value);
  }
}

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
const RANGES_LAST_UPDATED = 'August 3, 2026';
const RANGES_VERSION = '2.1';

// ─── Spend Tier Logic ─────────────────────────────────────────────────────────
const SPEND_TIERS = {
  'under100k': { label: '<$100K', min: 0, max: 100000, tier: 0 },
  '100k-500k': { label: '$100K–$500K', min: 100000, max: 500000, tier: 1 },
  '500k-1m':   { label: '$500K–$1M', min: 500000, max: 1000000, tier: 2 },
  '1m-2m':     { label: '$1M–$2M', min: 1000000, max: 2000000, tier: 3 },
  '2m-5m':     { label: '$2M–$5M', min: 2000000, max: 5000000, tier: 4 },
  '5m-10m':    { label: '$5M–$10M', min: 5000000, max: 10000000, tier: 5 },
  '10m-25m':   { label: '$10M–$25M', min: 10000000, max: 25000000, tier: 6 },
  '25m-50m':   { label: '$25M–$50M', min: 25000000, max: 50000000, tier: 7 },
  '50mplus':   { label: '$50M+', min: 50000000, max: Infinity, tier: 8 },
};

// Maps AWS planner spend keys to deal-calibration tier keys
const AWS_TO_CAL_TIER = {
  'under100k': 'under1m', '100k-500k': 'under1m', '500k-1m': 'under1m',
  '1m-2m': '1m-5m', '2m-5m': '1m-5m',
  '5m-10m': '5m-10m', '10m-25m': '10m-25m',
  '25m-50m': '25m-50m', '50mplus': '50m-100m',
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

function getDiscountRange(s) {
  const tier = SPEND_TIERS[s.annualSpend]?.tier ?? 0;
  const multicloudBoost = s.multicloud === 'multi-cloud' ? 8 : s.multicloud === 'evaluating' ? 5 : s.multicloud === 'aws-primary' ? 2 : 0;
  const termBoost = s.desiredTerm === '3yr' ? 5 : s.desiredTerm === '2yr' ? 3 : 0;
  const growthBoost = s.growthRate === 'hypergrowth' ? 3 : s.growthRate === 'fast' ? 2 : 0;
  const marketplaceBoost = s.marketplaceSpend === '500kplus' ? 4 : s.marketplaceSpend === '100k-500k' ? 2 : 0;

  const ranges = [
    [0, 2],   // <$100K
    [0, 5],   // $100K–$500K
    [3, 9],   // $500K–$1M
    [6, 14],  // $1M–$2M
    [10, 20], // $2M–$5M
    [15, 28], // $5M–$10M
    [18, 32], // $10M–$25M
    [22, 38], // $25M–$50M
    [25, 45], // $50M+
  ];
  const [lo, hi] = ranges[tier] || [0, 2];
  const loFinal = Math.min(lo + Math.round(multicloudBoost * 0.4) + Math.round(termBoost * 0.4), 45);
  const hiFinal = Math.min(hi + multicloudBoost + termBoost + growthBoost + marketplaceBoost, 50);
  return { lo: loFinal, hi: hiFinal, midpoint: Math.round((loFinal + hiFinal) / 2) };
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
  if (s.multicloud === 'multi-cloud') rows.push(['Multi-cloud positioning', '+5–10%', 'green']);
  else if (s.multicloud === 'evaluating') rows.push(['Evaluating Azure/GCP (active RFP)', '+3–7%', 'green']);
  if (s.desiredTerm === '3yr') rows.push(['3-year commitment term', '+3–5%', 'green']);
  else if (s.desiredTerm === '2yr') rows.push(['2-year commitment term', '+1–3%', 'green']);
  if (s.growthRate === 'hypergrowth' || s.growthRate === 'fast') rows.push(['High-growth trajectory (future revenue)', '+1–4%', 'green']);
  if (tier >= 3 && s.supportTier === 'enterprise') rows.push(['Enterprise Support negotiation', '−1–3% on support', 'green']);
  if (s.commitUtilization === 'over100') rows.push(['Exceeded prior commitment (strong signal)', '+1–2%', 'green']);
  if (s.commitUtilization === 'under70') rows.push(['Prior shortfall — expect reduced flexibility', '−2–5%', 'red']);
  if (s.awsTenure === '5plus') rows.push(['Long-tenured customer (loyalty)', '+0–2%', 'green']);
  if (s.marketplaceSpend === '500kplus') rows.push(['Significant Marketplace spend — counts toward PPA drawdown', '+2–4%', 'green']);
  else if (s.marketplaceSpend === '100k-500k') rows.push(['Marketplace spend — can be included in PPA commitment', '+1–2%', 'green']);
  if (tier <= 4) rows.push(['Reseller channel discount available (APN partners)', '+5–15%', 'green']);
  const cur = s.currentDiscounts || [];
  if (cur.includes('none') || cur.length === 0) rows.push(['Currently at on-demand list pricing — full range available', 'Baseline', 'green']);
  else if (cur.includes('edp')) rows.push(['Renewing an existing PPA — benchmark against current rate', 'Baseline', 'green']);
  if ((s.awsPrograms || []).includes('map')) rows.push(['MAP participant — funded credits outside PPA discount', 'Additive', 'green']);
  if (s.workloadType === 'dev-heavy' || s.workloadType === 'batch') rows.push(['Variable workload profile — commit conservatively', '−2–4%', 'red']);
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
  if ((s.migrationPlans.includes('migrating-to-aws') || s.migrationPlans.includes('onprem-exit'))
      && !(s.awsPrograms || []).includes('map')) {
    tactics.push({
      title: 'Request Migration Acceleration Program (MAP) Credits',
      desc: 'AWS MAP provides credits to offset migration costs. If you\'re migrating workloads to AWS, you\'re eligible for substantial MAP credits (often $50K–$500K+ depending on scope). These are separate from PPA discounts — always negotiate them as an add-on, not a substitute for discount.',
      impact: 'high',
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
      title: 'Demand Price Protection on Accelerated Compute',
      desc: 'AWS raised EC2 Capacity Block prices roughly 20% on July 1, 2026 — the second increase that year — across the P6-B300, P6-B200, P5/P5e/P5en, and P4de families. Because your commitment is denominated in dollars rather than in GPU-hours, a list price increase silently reduces the compute your commit buys while still drawing it down on schedule. Two asks follow: size the commit against post-increase rates rather than historical GPU spend, and negotiate explicit price protection or a rate card fixing accelerated-compute pricing for the term. AWS resists blanket price locks but will often fix rates on named instance families where the workload is strategically important.',
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

  // Reseller channel discount — only available under $5M
  if (tier <= 4) {
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
  if (cur.includes('edp') && s.edpMonthsRemaining && s.edpMonthsRemaining !== 'na') {
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
    .slice(0, 12);
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
        'Ask AWS to model 3 scenarios: 1yr vs 2yr vs 3yr with marketplace inclusion',
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

  if (s.migrationPlans.includes('migrating-to-aws') || s.migrationPlans.includes('onprem-exit')) {
    concessions.push({
      icon: '✈️',
      title: 'MAP Migration Credits',
      desc: 'AWS credits covering 25–50% of migration project costs via the Migration Acceleration Program.',
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
      desc: 'A fixed rate card for GPU instance families for the term, following the ~20% Capacity Block increase in July 2026.',
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
    desc: "If AWS cuts published pricing on any service you consume, the lower rate applies automatically within 30 days with your PPA discount still stacked on top. AWS reduces prices regularly — without this term, those reductions accrue to AWS rather than to you.",
    priority: 'should',
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
      desc: 'Your current spend may fall below the standard $1M PPA minimum. Focus on Savings Plans + Reserved Instances for now. Build a compelling growth story to access PPA.',
    });
  }

  risks.push({
    level: 'medium',
    title: 'Auto-Renewal Clauses',
    desc: 'Many PPAs auto-renew at the same or worse terms without formal notice. Negotiate explicit renewal negotiation windows (90 days notice required) into the agreement.',
  });

  if (s.desiredTerm === '3yr') {
    risks.push({
      level: 'medium',
      title: '3-Year Lock-in Risk',
      desc: 'A 3-year commitment at current pricing can backfire if services are repriced or if your architecture changes significantly. Negotiate annual true-up provisions.',
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
  // capped at 10, and these are the questions only this client needs to ask.
  if (s.gpuUsage && s.gpuUsage !== 'none') {
    questions.push('Capacity Block pricing rose roughly 20% in July 2026 — what price protection can you commit to on GPU instance families for our term, and which families does it cover?');
    questions.push('If AWS raises accelerated-compute list prices mid-term, does our committed spend simply buy less capacity, or is our drawdown adjusted to compensate?');
  }

  if (s.useCases.includes('ml-ai')) {
    questions.push('What service-specific credits or discounts exist for Bedrock and SageMaker as part of a PPA?');
  }

  if (s.migrationPlans.includes('migrating-to-aws')) {
    questions.push('We\'re planning to migrate X workloads in the next 12 months — how do we qualify for MAP funding, and is it additive to PPA?');
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

  return questions.slice(0, 10);
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
      text: '<strong>No Competitive Leverage Detected.</strong> At your spend level, going into a PPA negotiation without a credible competitive alternative significantly reduces your potential discount by 5–10 points. Even requesting Azure/GCP pricing for a small workload before negotiating is worth doing.',
    });
  }

  if (tier <= 1 && s.annualSpend !== 'under100k') {
    alerts.push({
      type: 'info',
      icon: 'ℹ️',
      text: '<strong>PPA Threshold:</strong> Standard PPA eligibility starts at $1M annual spend. At your current level, focus on Compute Savings Plans and Reserved Instances. However, if you have strong growth projections, AWS may offer a PPA based on committed future spend — especially if you\'re entering a high-growth phase.',
    });
  }

  if (tier <= 4) {
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
    alerts.push({ type: 'warning', icon: '📈', text: '<strong>Capacity Block Rates Reset Again on October 7, 2026.</strong> AWS\'s pricing page lists new per-accelerator rates effective October 7 (P6-B300 $16.146, P6-B200 $14.208, P5 $5.970 in US regions), roughly 15% above the July levels by our calculation, and says reservation prices are updated regularly with supply and demand. Treat Capacity Blocks as a variable-price product: size any commitment against current rates, not the July figures, and ask for a fixed rate card on the named GPU families you actually run for the term of the PPA.' });
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
          <div>At your current spend level, the most cost-effective approach is <strong>Compute Savings Plans</strong> (1-year or 3-year, no upfront or partial upfront). These deliver 20–66% off On-Demand rates with no minimum commitment requirement and apply automatically across EC2, Fargate, and Lambda. Once your spend exceeds $500K–$1M, initiate PPA conversations with your AWS account team proactively.</div>
        </div>
      </div>
    </div>`;
  }

  const termAdvice = s.desiredTerm === '3yr'
    ? '3-year PPA — offers deepest discount but highest commitment risk. Negotiate annual ramp and carry-forward.'
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
            <td style="padding:9px 8px;font-weight:600;">PPA + Savings Plans Stack</td>
            <td style="padding:9px 8px;text-align:center;">★★★★★</td>
            <td style="padding:9px 8px;text-align:center;">★★★☆☆</td>
            <td style="padding:9px 8px;color:var(--text-secondary);">Heavy compute, EC2-dominant spend</td>
          </tr>
          <tr>
            <td style="padding:9px 8px;font-weight:600;">Savings Plans Only</td>
            <td style="padding:9px 8px;text-align:center;">★★★☆☆</td>
            <td style="padding:9px 8px;text-align:center;">★★★★★</td>
            <td style="padding:9px 8px;color:var(--text-secondary);">Sub-$1M, high variability</td>
          </tr>
        </tbody>
      </table>
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
  ]
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
