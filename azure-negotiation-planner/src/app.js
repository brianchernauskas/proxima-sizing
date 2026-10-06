'use strict';

const state = {};
let currentStep = 1;

function nextStep(from) {
  if (!validateStep(from)) return;
  collectStep(from);
  goToStep(from + 1);
}
function prevStep(from) { goToStep(from - 1); }
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

function validateStep(step) {
  const required = {
    1: ['industry', 'growth-rate', 'azure-tenure', 'contract-type'],
    2: ['annual-spend', 'total-ms-spend', 'spend-growth', 'renewal-timeline'],
    3: ['workload-type', 'optimization-status', 'migration-status'],
    4: ['relationship-quality'],
  };
  let ok = true;
  (required[step] || []).forEach(id => {
    const el = document.getElementById(id);
    if (el && el.tagName === 'SELECT' && !el.value) {
      el.style.borderColor = 'var(--danger)';
      el.addEventListener('change', () => el.style.borderColor = '', { once: true });
      ok = false;
    }
  });
  const radioGroups = { 1: ['company-size'], 4: ['multicloud'] };
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

function collectStep(step) {
  if (step === 1) {
    state.companySize = document.querySelector('#company-size .selected')?.dataset.value;
    state.industry = document.getElementById('industry').value;
    state.growthRate = document.getElementById('growth-rate').value;
    state.azureTenure = document.getElementById('azure-tenure').value;
    state.contractType = document.getElementById('contract-type').value;
    state.msProducts = [...document.querySelectorAll('#ms-products input:checked')].map(i => i.value);
    state.compliance = [...document.querySelectorAll('#compliance input:checked')].map(i => i.value);
  }
  if (step === 2) {
    state.annualSpend = document.getElementById('annual-spend').value;
    state.totalMsSpend = document.getElementById('total-ms-spend').value;
    state.spendGrowth = document.getElementById('spend-growth').value;
    state.renewalTimeline = document.getElementById('renewal-timeline').value;
    state.desiredTerm = document.getElementById('desired-term').value;
    state.commitUtilization = document.getElementById('commit-utilization').value;
    state.onpremLicenses = [...document.querySelectorAll('#onprem-licenses input:checked')].map(i => i.value);
    state.eaPricingLevel = document.getElementById('ea-pricing-level')?.value || '';
    state.eaAnniversary = document.getElementById('ea-anniversary')?.value || '';
    state.eaTermStart = document.getElementById('ea-term-start')?.value || '';
    state.m365Reclamation = document.getElementById('m365-reclamation')?.value || '';
    state.cspOpenness = document.getElementById('csp-openness')?.value || '';
    state.supportTier = document.getElementById('support-tier').value;
  }
  if (step === 3) {
    state.useCases = [...document.querySelectorAll('#use-cases .selected')].map(c => c.dataset.value);
    state.workloadType = document.getElementById('workload-type').value;
    state.hybridBenefitStatus = document.getElementById('hybrid-benefit-status').value;
    state.optimizationStatus = document.getElementById('optimization-status').value;
    state.migrationStatus = document.getElementById('migration-status').value;
  }
  if (step === 4) {
    state.multicloud = document.querySelector('#multicloud .selected')?.dataset.value;
    state.relationshipQuality = document.getElementById('relationship-quality').value;
    state.expansionPlans = [...document.querySelectorAll('#expansion-plans input:checked')].map(i => i.value);
    state.eaConcern = document.getElementById('ea-concern').value;
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
  if (!validateStep(4)) return;
  collectStep(4);
  document.getElementById('strategy-output').innerHTML = buildStrategyHTML(state);
  goToStep(5);
}

// ─── Ranges metadata ──────────────────────────────────────────────────────────
const RANGES_LAST_UPDATED = 'August 3, 2026';
const RANGES_VERSION = '2.1';

// ─── Spend tiers ─────────────────────────────────────────────────────────────
const SPEND_TIERS = {
  'under100k':  { label: '<$100K',     tier: 0 },
  '100k-500k':  { label: '$100K–$500K', tier: 1 },
  '500k-1m':    { label: '$500K–$1M',  tier: 2 },
  '1m-5m':      { label: '$1M–$5M',    tier: 3 },
  '5m-10m':     { label: '$5M–$10M',   tier: 4 },
  '10m-25m':    { label: '$10M–$25M',  tier: 5 },
  '25m-50m':    { label: '$25M–$50M',  tier: 6 },
  '50mplus':    { label: '$50M+',      tier: 7 },
};

const MS_SPEND_TIERS = {
  'under500k':  0,
  '500k-2m':    1,
  '2m-10m':     2,
  '10m-25m':    3,
  '25m-50m':    4,
  '50mplus':    5,
};

const AZURE_TO_CAL_TIER = {
  'under100k': 'under1m', '100k-500k': 'under1m', '500k-1m': 'under1m',
  '1m-5m': '1m-5m', '5m-10m': '5m-10m',
  '10m-25m': '10m-25m', '25m-50m': '25m-50m', '50mplus': '50m-100m',
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
  const msTier = MS_SPEND_TIERS[s.totalMsSpend] ?? 0;
  const bundleBoost = Math.max(0, msTier - tier) * 2; // total MS spend lifts Azure discount
  const multicloudBoost = s.multicloud === 'multi-cloud' ? 7 : s.multicloud === 'evaluating' ? 5 : s.multicloud === 'azure-primary' ? 2 : 0;
  const termBoost = s.desiredTerm === '3yr' ? 4 : 0;
  const expansionBoost = s.expansionPlans.filter(p => ['m365-expand','copilot-adopt','dynamics-expand'].includes(p)).length * 2;

  const ranges = [
    [0, 3],   // <$100K
    [3, 8],   // $100K–$500K
    [5, 15],  // $500K–$1M
    [10, 20], // $1M–$5M
    [15, 25], // $5M–$10M
    [18, 30], // $10M–$25M
    [22, 33], // $25M–$50M
    [25, 35], // $50M+
  ];
  const [lo, hi] = ranges[tier] || [0, 3];
  const loFinal = Math.min(lo + Math.round(bundleBoost * 0.5), 40);
  const hiFinal = Math.min(hi + bundleBoost + multicloudBoost + termBoost + expansionBoost, 45);
  return { lo: loFinal, hi: hiFinal, midpoint: Math.round((loFinal + hiFinal) / 2) };
}

function getLeverageScore(s) {
  let score = 0;
  score += (SPEND_TIERS[s.annualSpend]?.tier ?? 0) * 4;
  const msTier = MS_SPEND_TIERS[s.totalMsSpend] ?? 0;
  score += msTier * 3;
  if (s.multicloud === 'multi-cloud') score += 18;
  else if (s.multicloud === 'evaluating') score += 13;
  else if (s.multicloud === 'azure-primary') score += 5;
  const growthMap = { hypergrowth: 12, fast: 9, moderate: 6, slow: 2, declining: 0 };
  score += growthMap[s.growthRate] ?? 4;
  const timingMap = { '6-12mo': 10, '3-6mo': 7, '12plusmo': 5, '1-3mo': 3, 'within-1mo': 0 };
  score += timingMap[s.renewalTimeline] ?? 5;
  const relMap = { strategic: 10, strong: 8, moderate: 5, poor: 2, none: 0 };
  score += relMap[s.relationshipQuality] ?? 3;
  // Tenure (0–5) — parity with the AWS planner's treatment
  const tenureMap = { '5plus': 5, '3-5': 4, '1-3': 2, 'new': 0 };
  score += tenureMap[s.azureTenure] ?? 2;
  score += s.expansionPlans.length * 2;
  // M365 shelfware — reclamation pass increases negotiating baseline
  if (s.m365Reclamation === 'never') score -= 4;
  if (s.m365Reclamation === 'recent') score += 5;
  // CSP openness — separating Azure from M365 adds leverage
  if (s.cspOpenness === 'open') score += 8;
  if (s.cspOpenness === 'currently-csp') score += 4;
  return Math.min(Math.round(score), 100);
}

function getLeverageLabel(score) {
  if (score >= 75) return { label: 'Very Strong', color: '#166534' };
  if (score >= 55) return { label: 'Strong', color: '#15803D' };
  if (score >= 35) return { label: 'Moderate', color: '#B45309' };
  if (score >= 15) return { label: 'Developing', color: '#9A3412' };
  return { label: 'Early Stage', color: '#6B7280' };
}

function recommendedVehicle(s, tier) {
  if (s.contractType === 'csp') return 'CSP → Direct EA/MCA-E';
  if (tier >= 4) return 'EA or MCA-E + MACC';
  if (tier >= 2) return 'MCA-E + MACC';
  if (tier >= 1) return 'MCA + Savings Plans';
  return 'MCA + Reserved Instances';
}

// ─── Strategy builder ─────────────────────────────────────────────────────────
function buildStrategyHTML(s) {
  const discount = getDiscountRange(s);
  const leverage = getLeverageScore(s);
  const leverageInfo = getLeverageLabel(leverage);
  const tier = SPEND_TIERS[s.annualSpend]?.tier ?? 0;
  const spendLabel = SPEND_TIERS[s.annualSpend]?.label ?? 'Unknown';
  const companyLabels = { startup: 'Startup', smb: 'SMB', midmarket: 'Mid-Market', enterprise: 'Enterprise' };

  const tactics = buildTactics(s, tier);
  const proxima = getProximaInsight('azure', AZURE_TO_CAL_TIER[s.annualSpend]);
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
    <span class="print-tool-name">Azure Negotiation Planner</span>
  </div>
  <div class="strategy-hero">
    <h2>Your Azure Negotiation Strategy</h2>
    <div class="subtitle">${companyLabels[s.companySize] || 'Company'} · ${spendLabel} Azure spend · Generated ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
    <div style="font-size:.75rem;color:rgba(255,255,255,.6);font-style:italic;margin-top:4px;">Intended for Proxima use only — please contact Brian Chernauskas with questions</div>
    <div style="font-size:.7rem;color:rgba(255,255,255,.35);margin-top:3px;">Discount ranges last calibrated: ${RANGES_LAST_UPDATED}</div>
    <div class="score-row">
      <div class="score-pill"><span class="pill-label">Leverage Score</span><span class="pill-value" style="color:${leverageInfo.color}">${leverage}/100 — ${leverageInfo.label}</span></div>
      <div class="score-pill"><span class="pill-label">Target Azure Discount (ACD)</span><span class="pill-value">${discount.lo}–${discount.hi}%</span></div>
      <div class="score-pill"><span class="pill-label">Recommended Vehicle</span><span class="pill-value">${recommendedVehicle(s, tier)}</span></div>
    </div>
  </div>

  <div class="strategy-body">

    ${alerts.length ? `
    <div class="strategy-section">
      <div class="section-header"><span class="section-icon">🚨</span><h3>Critical Flags & Immediate Actions</h3></div>
      <div class="section-content"><div class="alerts-list">${alerts.map(a => `<div class="alert alert-${a.type}"><span class="alert-icon">${a.icon}</span><div>${a.text}</div></div>`).join('')}</div></div>
    </div>` : ''}

    <div class="strategy-section">
      <div class="section-header"><span class="section-icon">💰</span><h3>Expected Azure Consumption Discount (ACD)</h3><span class="section-badge">${recommendedVehicle(s, tier)}</span></div>
      <div class="section-content">
        <div class="discount-estimate">
          <div>
            <div class="de-range">${discount.lo}–${discount.hi}%</div>
            <div class="de-label">off Azure list price (ACD)</div>
          </div>
          <div class="de-bar-wrap">
            <div class="de-bar-bg"><div class="de-bar-fill" style="width:${Math.min(discount.hi * 2.2, 100)}%"></div></div>
            <div class="de-note">Midpoint target: <strong>${discount.midpoint}%</strong> · Walk-away floor: <strong>${discount.lo}%</strong> · Stretch goal: <strong>${discount.hi}%</strong></div>
          </div>
        </div>
        ${proxima ? `<div style="margin-top:10px;padding:10px 14px;background:rgba(0,120,212,.08);border:1px solid rgba(0,120,212,.25);border-radius:8px;font-size:.82rem;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <span style="font-weight:700;color:#0078d4;">📊 Proxima Deal Data</span>
          <span style="color:var(--text-muted);">Based on <strong>${proxima.count} Azure deal${proxima.count !== 1 ? 's' : ''}</strong>${proxima.tierMatch ? ' at this spend tier' : ' across all tiers'}: observed avg <strong>${proxima.avg}%</strong>, range <strong>${proxima.lo}–${proxima.hi}%</strong></span>
        </div>` : ''}
        ${discountBreakdownHTML(s, tier, discount)}
        ${hybridBenefitCallout(s)}
      </div>
    </div>

    <div class="strategy-section">
      <div class="section-header"><span class="section-icon">🏗️</span><h3>Contract Vehicle Recommendation</h3></div>
      <div class="section-content">${vehicleGuideHTML(s, tier)}</div>
    </div>

    <div class="strategy-section">
      <div class="section-header"><span class="section-icon">🔒</span><h3>Price Protection: EA vs MCA-E</h3><span class="section-badge">${priceProtectionBadge(s)}</span></div>
      <div class="section-content">${priceProtectionHTML(s, tier)}</div>
    </div>

    <div class="strategy-section">
      <div class="section-header"><span class="section-icon">🎯</span><h3>Negotiation Tactics — Ranked by Impact</h3><span class="section-badge blue">${tactics.length} tactics</span></div>
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
      <div class="section-header"><span class="section-icon">🎁</span><h3>Concessions to Request (Beyond Headline Discount)</h3><span class="section-badge green">Non-discount value</span></div>
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
      <div class="section-header"><span class="section-icon">📅</span><h3>Negotiation Timeline & Action Plan</h3></div>
      <div class="section-content">
        <div class="timeline">${timeline.map(t => `
          <div class="timeline-item">
            <div class="timeline-left"><div class="tl-dot">${t.phase}</div><div class="tl-line"></div></div>
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
      <div class="section-header"><span class="section-icon">💬</span><h3>Questions to Ask Microsoft in the First Meeting</h3></div>
      <div class="section-content"><div class="questions-list">${questions.map(q => `<div class="question-item">"${q}"</div>`).join('')}</div></div>
    </div>

    <div class="strategy-section">
      <div class="section-header"><span class="section-icon">⚠️</span><h3>Risk Factors & Mitigations</h3></div>
      <div class="section-content">
        <div class="risk-grid">${risks.map(r => `
          <div class="risk-card ${r.level}">
            <div class="risk-title">${r.title}</div>
            <div class="risk-desc">${r.desc}</div>
          </div>`).join('')}
        </div>
      </div>
    </div>

  </div>
  <div class="proxima-strategy-footer" style="margin-top:32px;padding-top:16px;border-top:1px solid var(--border);text-align:center;font-size:.78rem;color:var(--text-muted);font-style:italic;">
    Intended for Proxima use only — please contact Brian Chernauskas with questions
  </div>
</div>`;
}

// ─── Hybrid Benefit callout ───────────────────────────────────────────────────
function hybridBenefitCallout(s) {
  const hasWindowsOrSQL = s.onpremLicenses.includes('windows-server') || s.onpremLicenses.includes('sql-server');
  if (!hasWindowsOrSQL) return '';
  const notApplied = s.hybridBenefitStatus === 'not-applied' || s.hybridBenefitStatus === 'partially';
  const color = notApplied ? 'warning' : 'success';
  const icon = notApplied ? '⚡' : '✅';
  const text = notApplied
    ? '<strong>Azure Hybrid Benefit is not fully applied.</strong> This is independent of your negotiated ACD discount and could save 40–75% on Windows Server and SQL Server VMs immediately — before any negotiation happens. Apply it first, then negotiate on the optimized baseline.'
    : '<strong>Azure Hybrid Benefit is active.</strong> Good — you\'re already capturing 40–75% savings on eligible Windows/SQL VMs. Confirm this is reflected in your spend baseline before committing to a MACC amount.';
  return `<div class="alert alert-${color}" style="margin-top:14px;"><span class="alert-icon">${icon}</span><div>${text}</div></div>`;
}

// ─── Discount breakdown ───────────────────────────────────────────────────────
function discountBreakdownHTML(s, tier, discount) {
  const rows = [];
  if (s.multicloud === 'multi-cloud') rows.push(['Multi-cloud positioning (credible competitive threat)', '+5–9%', 'green']);
  else if (s.multicloud === 'evaluating') rows.push(['Active AWS/GCP evaluation (competitive response playbook)', '+3–7%', 'green']);
  if (s.desiredTerm === '3yr') rows.push(['3-year MACC commitment', '+3–5%', 'green']);
  if (s.expansionPlans.includes('m365-expand')) rows.push(['M365 seat expansion bundled into deal', '+2–4%', 'green']);
  if (s.expansionPlans.includes('copilot-adopt')) rows.push(['Copilot adoption commitment (Microsoft top priority)', '+2–5%', 'green']);
  if (s.expansionPlans.includes('dynamics-expand')) rows.push(['Dynamics 365 expansion bundled into deal', '+2–4%', 'green']);
  const msTier = MS_SPEND_TIERS[s.totalMsSpend] ?? 0;
  const azureTier = SPEND_TIERS[s.annualSpend]?.tier ?? 0;
  if (msTier > azureTier) rows.push(['Total Microsoft account value exceeds Azure spend alone', '+2–6%', 'green']);
  if (s.growthRate === 'hypergrowth' || s.growthRate === 'fast') rows.push(['High-growth trajectory (future revenue argument)', '+1–3%', 'green']);
  if (s.spendGrowth === 'hypergrowth' || s.spendGrowth === 'fast') rows.push(['Azure consumption growing fast (expanding footprint)', '+1–3%', 'green']);
  else if (s.spendGrowth === 'declining') rows.push(['Azure consumption declining — weakens the growth argument', '−2–4%', 'red']);
  if (s.azureTenure === '5plus') rows.push(['Long-tenured customer (switching cost is real to Microsoft)', '+0–2%', 'green']);
  if (s.commitUtilization === 'over100') rows.push(['Exceeded prior commitment (strong trust signal)', '+1–2%', 'green']);
  if (s.commitUtilization === 'under70') rows.push(['Prior shortfall — Microsoft may resist higher discount', '−2–5%', 'red']);
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

// ─── Vehicle guide ────────────────────────────────────────────────────────────
function vehicleGuideHTML(s, tier) {
  const rows = [
    ['Enterprise Agreement (EA)', tier >= 3 ? '★★★★★' : '★★★☆☆', '★★☆☆☆', 'Large orgs, stable workloads, 3-year price lock built-in', tier >= 3],
    ['MCA-E + MACC', tier >= 2 ? '★★★★☆' : '★★★☆☆', '★★★★☆', 'Cloud-first orgs; requires explicit price-lock negotiation', tier >= 2 && tier < 6],
    ['CSP (via partner)', '★★☆☆☆', '★★★★★', 'SMBs; discounts depend on partner tier, not Microsoft directly', tier <= 2],
    ['PAYG / MCA', '☆☆☆☆☆', '★★★★★', 'No strategic vehicle — use only as BATNA or burst overflow', false],
  ];
  const concern = s.eaConcern;
  let note = '';
  if (concern === 'price-lock') note = '<div class="alert alert-warning" style="margin-bottom:14px;"><span class="alert-icon">🔒</span><div><strong>Price lock is your top priority.</strong> EA provides automatic 3-year price lock. If you\'re moving to MCA-E, explicitly negotiate a price protection addendum — it does not exist by default and Microsoft will not volunteer it.</div></div>';
  else if (concern === 'vehicle') note = '<div class="alert alert-info" style="margin-bottom:14px;"><span class="alert-icon">ℹ️</span><div><strong>Vehicle choice matters more than ever.</strong> Microsoft eliminated automatic volume discounts (Levels B/C/D) in late 2025. Every discount is now negotiated. The EA still provides a 3-year price lock; MCA-E does not without explicit contractual language.</div></div>';
  else if (concern === 'extension') note = '<div class="alert alert-danger" style="margin-bottom:14px;"><span class="alert-icon">🚨</span><div><strong>EA extensions revert to list price.</strong> Extending your EA without renegotiating treats it as a rollover — your previously negotiated discounts do NOT automatically carry forward. Treat any extension as a full renegotiation.</div></div>';
  const volumeDiscountNote = '<div class="alert alert-warning" style="margin-bottom:14px;"><span class="alert-icon">📋</span><div><strong>Volume discount levels (A/B/C/D) were removed in late 2025.</strong> All EA and MCA-E discounts are now fully negotiated — there is no automatic tier based on total Microsoft spend. Organisations that passively renew without negotiating are reverting to Level A (list price baseline), with reported 6–12% cost uplifts. Every renewal is now a clean-sheet negotiation.</div></div>';
  note = volumeDiscountNote + note;

  return `${note}<table style="width:100%;border-collapse:collapse;font-size:.85rem;">
    <thead><tr style="border-bottom:2px solid var(--border);">
      <th style="text-align:left;padding:8px;color:var(--text-secondary);">Vehicle</th>
      <th style="text-align:center;padding:8px;color:var(--text-secondary);">Discount</th>
      <th style="text-align:center;padding:8px;color:var(--text-secondary);">Flexibility</th>
      <th style="text-align:left;padding:8px;color:var(--text-secondary);">Best For</th>
    </tr></thead>
    <tbody>${rows.map(([name, disc, flex, best, rec]) => `
      <tr style="border-bottom:1px solid var(--surface-3);${rec ? 'background:var(--surface-2);' : ''}">
        <td style="padding:9px 8px;font-weight:${rec ? '700' : '400'};">${name}${rec ? ' ✓' : ''}</td>
        <td style="padding:9px 8px;text-align:center;">${disc}</td>
        <td style="padding:9px 8px;text-align:center;">${flex}</td>
        <td style="padding:9px 8px;color:var(--text-secondary);font-size:.8rem;">${best}</td>
      </tr>`).join('')}
    </tbody>
  </table>`;
}

// ─── Price protection (EA vs MCA-E) ──────────────────────────────────────────
// Microsoft began moving MACC customers off the EA toward MCA-E from March 2026.
// The EA's automatic price lock does not transfer, which is the single largest
// and least-visible cost of that migration.
function priceProtectionBadge(s) {
  if (s.contractType === 'ea') return 'Protected — for now';
  if (s.contractType === 'mca' || s.contractType === 'mca-e' || s.contractType === 'csp') return 'Exposed';
  return 'No protection';
}

function priceProtectionHTML(s, tier) {
  const onEA = s.contractType === 'ea';
  const onMCA = s.contractType === 'mca' || s.contractType === 'mca-e';
  const onCSP = s.contractType === 'csp';

  const rows = [
    ['Automatic price lock for the term', 'Yes — 3 years', 'No', 'No'],
    ['New seats added at locked price', 'Yes', 'No — at prevailing rate', 'No — at prevailing rate'],
    ['July 2026 M365 increase', 'Deferred to renewal if term began before it', 'At next renewal', 'At next subscription renewal'],
    ['Mid-term unit price changes possible', 'No', 'Yes', 'Yes'],
    ['Quantities reducible', 'At renewal only', 'Varies by term', 'At subscription renewal'],
    ['Renewal creates a negotiation moment', 'Yes — fixed renewal date', 'Weaker — evergreen structure', 'Annual'],
  ];

  let lead;
  if (onEA) {
    lead = `<div class="alert alert-success" style="margin-bottom:14px;"><span class="alert-icon">🔒</span><div><strong>You currently hold the strongest price protection Microsoft offers.</strong> Your EA holds list price at signature for the full term, and new seats are added at that locked rate. If your term began before July 1, 2026, the global Microsoft 365 price increase does not reach you until renewal. Treat this protection as an asset with an expiry date — the migration to MCA-E is where it is lost, and Microsoft will not price that loss for you.</div></div>`;
  } else if (onMCA) {
    lead = `<div class="alert alert-danger" style="margin-bottom:14px;"><span class="alert-icon">🚨</span><div><strong>You have no automatic price protection.</strong> MCA-E allows Microsoft to update unit rates during your term, and the July 2026 Microsoft 365 increase applies to you without the EA's shielding. A price protection addendum is the single highest-value item to secure, and it exists only if you negotiate it explicitly into the document.</div></div>`;
  } else if (onCSP) {
    lead = `<div class="alert alert-warning" style="margin-bottom:14px;"><span class="alert-icon">⚠️</span><div><strong>CSP annual subscriptions carry no price lock.</strong> Partner economics can still deliver a better net rate than direct MCA-E, but rate stability is not part of the package. Ask your partner what they can contractually commit to on rate stability for the term, in writing, rather than assuming annual pricing holds.</div></div>`;
  } else {
    lead = `<div class="alert alert-warning" style="margin-bottom:14px;"><span class="alert-icon">⚠️</span><div><strong>No vehicle-level price protection applies to your current arrangement.</strong> Price protection is a property of the EA specifically. If rate stability matters for budgeting, it becomes a negotiated term rather than something the vehicle provides.</div></div>`;
  }

  const migrationNote = onEA
    ? `<div class="alert alert-warning" style="margin-top:14px;"><span class="alert-icon">📋</span><div><strong>If Microsoft proposes moving you to MCA-E, price the protection you would be giving up.</strong> From March 2026 Microsoft began migrating EA customers on MACC plans to MCA-E ahead of renewal, and the EA is increasingly reserved for its largest customers. The migration is often presented as administrative modernisation. It is not: the automatic price lock, the fixed renewal negotiation moment, and locked pricing on added seats all fall away. If the move is unavoidable, the price protection addendum and a fixed rate card are what you trade for agreeing to it.</div></div>`
    : `<div class="alert alert-info" style="margin-top:14px;"><span class="alert-icon">ℹ️</span><div><strong>Price protection is negotiable, not automatic.</strong> Ask for an addendum stating unit rates will not increase during the commitment term, naming the specific SKUs it covers. Microsoft resists blanket locks but will often fix rates on a named subset where the workload or seat count matters to them.</div></div>`;

  const table = `<table style="width:100%;border-collapse:collapse;font-size:.85rem;">
    <thead><tr style="border-bottom:2px solid var(--border);">
      <th style="text-align:left;padding:8px;color:var(--text-secondary);">Protection</th>
      <th style="text-align:center;padding:8px;color:var(--text-secondary);">EA</th>
      <th style="text-align:center;padding:8px;color:var(--text-secondary);">MCA-E</th>
      <th style="text-align:center;padding:8px;color:var(--text-secondary);">CSP</th>
    </tr></thead>
    <tbody>${rows.map(([factor, ea, mcae, csp]) => `
      <tr style="border-bottom:1px solid var(--surface-3);">
        <td style="padding:9px 8px;color:var(--text-primary);">${factor}</td>
        <td style="padding:9px 8px;text-align:center;${onEA ? 'font-weight:700;' : ''}">${ea}</td>
        <td style="padding:9px 8px;text-align:center;${onMCA ? 'font-weight:700;' : ''}">${mcae}</td>
        <td style="padding:9px 8px;text-align:center;${onCSP ? 'font-weight:700;' : ''}">${csp}</td>
      </tr>`).join('')}
    </tbody>
  </table>`;

  return lead + table + migrationNote + earlyRenewalHTML(s, tier);
}

// EA term start and anniversary true-ups. The July 1, 2026 Microsoft 365
// increase applies at the next renewal after that date, so an EA term that
// began earlier holds pre-increase pricing until renewal. Renewing early now
// brings the increase forward; the value lies in using the remaining term.
function earlyRenewalHTML(s, tier) {
  if (s.contractType !== 'ea') return '';
  const start = s.eaTermStart;
  const ann = s.eaAnniversary;
  const autoRenewNote = '<div style="margin-top:9px;">Separately, your EA auto-renews 30–90 days before expiry, and Microsoft will propose a new Azure Monetary Commitment based on trailing-12-month consumption, reported to inflate commitments 15–30% above historical average. Size the commitment yourself and open the renewal conversation before that proposal arrives, because it anchors everything that follows. Previously negotiated discounts do not carry forward on their own at renewal or extension; confirm every one in the new paperwork.</div>';
  const sourceNote = '<div style="margin-top:9px;font-size:.8rem;color:var(--text-muted);">Commitment inflation figures come from advisory-firm reporting rather than Microsoft published terms. Verify against your own contract and invoices before presenting them.</div>';

  if (!start || start === 'na') return '';
  if (start === 'unknown') {
    return `<div class="alert alert-info" style="margin-top:14px;"><span class="alert-icon">📅</span><div><strong>Confirm when your current EA term began.</strong> The July 1, 2026 Microsoft 365 increase applies at the next renewal after that date. If your term began earlier, you are still on pre-increase pricing, and renewing early would bring the increase forward. Your account team or reseller can confirm the term start and anniversary dates in one email.${autoRenewNote}</div></div>`;
  }

  if (start === 'post-increase') {
    return `<div class="alert alert-info" style="margin-top:14px;"><span class="alert-icon">📅</span><div><strong>Your EA already reflects post-July 2026 pricing, and it is locked for the term.</strong> An early renewal gains nothing on price. Use anniversary true-ups to add genuinely needed seats at your locked rates, and treat the scheduled renewal as the negotiation moment.${autoRenewNote}${sourceNote}</div></div>`;
  }

  // Pre-increase term: hold it, and use the true-ups.
  const trueUp = ann === 'within-3mo'
    ? 'Your next anniversary is inside 3 months, so the true-up is the near-term action: confirm which seats and upgrades you genuinely need over the next year and add them at locked pricing.'
    : ann === '3-6mo' || ann === '6-12mo'
      ? `Your next anniversary is ${ann === '3-6mo' ? '3–6' : '6–12'} months out, which is enough time to plan the true-up properly: confirm which seats and upgrades you genuinely need and add them at locked pricing then.`
      : ann === 'passed'
        ? 'Your anniversary has just passed. Verify that any seats added were billed at your locked rate rather than current list, and diarise planning for the next true-up.'
        : 'Confirm your next anniversary date, since each true-up before renewal is a chance to add needed seats at locked pricing.';
  const scaleNote = tier >= 3
    ? 'At your spend level, quantify the uplift waiting at renewal formally: your committed quantities at locked rates against the same quantities at current list. Open the renewal with that number, so it becomes a figure Microsoft has to offset rather than one you absorb.'
    : 'Model your committed quantities at locked rates against current list, so you know the uplift waiting at renewal before Microsoft presents it.';

  return `<div class="alert alert-warning" style="margin-top:14px;"><span class="alert-icon">📅</span><div><strong>You are still on pre-increase pricing — do not renew early.</strong> Your EA term began before July 1, 2026, so the Microsoft 365 increase reaches you at renewal, not before. An early renewal, or a "modernisation" that re-papers the agreement, moves you onto current list sooner. Hold the term instead. ${trueUp} Only add what you will use; true-ups cannot be reduced until renewal. ${scaleNote}
  <div style="margin-top:9px;">If renewal is close and you need more time, ask Microsoft in writing whether a term extension keeps your current price-list pricing until it ends, or triggers current list. Do not assume either answer.</div>${autoRenewNote}${sourceNote}</div></div>`;
}

// ─── Tactics ──────────────────────────────────────────────────────────────────
function buildTactics(s, tier) {
  const tactics = [];

  // Bundling — Azure's biggest unique lever
  const hasM365 = s.msProducts.includes('m365');
  const hasDynamics = s.msProducts.includes('dynamics');
  const expandingM365 = s.expansionPlans.includes('m365-expand');
  const expandingCopilot = s.expansionPlans.includes('copilot-adopt');
  const expandingDynamics = s.expansionPlans.includes('dynamics-expand');

  if (hasM365 || hasDynamics || expandingM365 || expandingDynamics) {
    tactics.push({
      title: 'Negotiate All Microsoft Products in a Single Motion',
      desc: `Microsoft's field compensation model rewards total account value — not individual product lines. Bundle your Azure MACC renewal together with ${[expandingM365 && 'M365 expansion', expandingDynamics && 'Dynamics 365 growth', expandingCopilot && 'Copilot adoption'].filter(Boolean).join(', ') || 'your full Microsoft footprint'} into one conversation. This lifts you into a higher "strategic account" tier, unlocking discount authority above standard field rep levels — sometimes requiring CVP-level sign-off for the best terms.`,
      impact: 'high',
    });
  }

  if (s.m365Reclamation === 'never' && tier >= 1) {
    tactics.push({
      title: 'Run an M365 License Reclamation Pass Before Renewal',
      desc: 'Unused M365 licenses ("shelfware") inflate the seat count Microsoft uses as your pricing baseline. Practitioners report 7–19% of licenses are unused in estates that have never been audited. Before entering any renewal conversation, pull your 90-day active user data from the Microsoft 365 Admin Center, deprovision unused seats, and present the corrected count at the negotiating table — this directly reduces the baseline and your committed spend.',
      impact: 'high',
    });
  }
  if (s.cspOpenness === 'open' || s.cspOpenness === 'unknown') {
    tactics.push({
      title: 'Evaluate CSP for Azure to Create Structural Leverage',
      desc: 'Separating your Azure MACC into a CSP (Cloud Solution Provider) relationship — while keeping M365 wherever the best deal lands — is an emerging high-value tactic. CSP partner economics can yield 8–15% effective discount on Azure vs. direct MCA-E, and introducing CSP as a credible option creates real leverage in your direct Microsoft negotiation even if you don\'t ultimately switch. Request CSP pricing from 2–3 Microsoft partners before your renewal meeting.',
      impact: 'high',
    });
  }
  // Copilot leverage — Microsoft's #1 priority
  if (!expandingCopilot) {
    tactics.push({
      title: 'Use Copilot Adoption as a Bargaining Chip',
      desc: 'Azure OpenAI Service and Microsoft Copilot (M365) are Microsoft\'s top growth priorities in 2025–2026. Expressing intent to commit to Copilot seat licenses or Azure OpenAI consumption gives Microsoft a strong incentive to discount Azure infrastructure to win the AI footprint. Even a pilot commitment of 50–100 Copilot seats has been observed to unlock additional Azure credits and ACD improvement.',
      impact: 'high',
    });
  } else {
    tactics.push({
      title: 'Leverage Your Copilot Commitment for Azure Discount',
      desc: 'You\'re already planning Copilot adoption — make sure Microsoft knows this is contingent on a satisfactory Azure renewal. Frame it explicitly: "Our AI expansion plans are tied to Azure pricing. Help us get to the right Azure number and we can accelerate Copilot." This activates their AI adoption incentive budget.',
      impact: 'high',
    });
    tactics.push({
      title: 'Price the Copilot Usage Layer, Not Just the Seat',
      desc: 'Microsoft\'s September 25, 2026 Copilot relaunch splits the bill in two. The user subscription licence covers Copilot Chat and Copilot in Word, Excel, PowerPoint, Outlook and Teams; Cowork, Code, Autopilot, long-running agents and frontier models are billed by usage through Copilot Credits, on top of the seat. Microsoft has not published credit rates. Before committing seats, get the credit rate card in writing, ask whether credits can be prepaid at a discount or drawn down against your MACC, and confirm who can raise the spending limits. Use the new admin spending policies and approval workflows from day one, so agent usage cannot run ahead of the budget the seat price was sold against.',
      impact: 'high',
    });
  }

  // Competitive leverage
  if (s.multicloud === 'azure-only') {
    tactics.push({
      title: 'Create a Credible AWS or GCP Competitive Evaluation',
      desc: 'Microsoft has documented competitive response playbooks that unlock additional discount authority specifically when AWS or GCP is named in an opportunity. Even running AWS Migration Evaluator or a GCP migration assessment for one workload creates the documentation needed. Being all-in on Azure with no competitive alternative gives Microsoft no urgency to improve terms.',
      impact: 'high',
    });
  } else if (s.multicloud === 'multi-cloud' || s.multicloud === 'evaluating') {
    tactics.push({
      title: 'Make Your Multi-Cloud Position Central to the Negotiation',
      desc: 'Open every Microsoft meeting with your current split: what percentage of compute runs on AWS/GCP, and what it would take to consolidate onto Azure. Frame the MACC commitment as the price of your consolidation decision. Microsoft will respond with discount authority specifically earmarked for competitive workload wins — higher than standard ACD levels.',
      impact: 'high',
    });
  }

  // Hybrid Benefit
  if ((s.onpremLicenses.includes('windows-server') || s.onpremLicenses.includes('sql-server')) && s.hybridBenefitStatus !== 'fully-applied') {
    tactics.push({
      title: 'Apply Azure Hybrid Benefit Before Setting Your MACC Baseline',
      desc: 'Azure Hybrid Benefit can reduce your Windows Server VM costs by 40–55% and SQL Server VM costs by 60–75% — and it\'s a right you\'ve already paid for through Software Assurance. Critically, do this BEFORE you commit to a MACC amount. Applying Hybrid Benefit after committing at your current spend level means you\'re paying for waste at committed rates. Optimize first, then commit.',
      impact: 'high',
    });
  }

  // Timing
  if (s.renewalTimeline === '6-12mo' || s.renewalTimeline === '12plusmo') {
    tactics.push({
      title: 'Time Negotiations to Microsoft\'s Fiscal Quarter-End',
      desc: 'Microsoft\'s fiscal year ends June 30. Quarters close September 30, December 31, March 31, June 30. Account teams carry quarterly quotas and receive additional deal-close incentives in the final weeks of each quarter. Negotiations initiated 4–6 weeks before quarter-end and signed in the last week consistently yield better terms — additional credits, deeper ACDs, and support concessions unavailable mid-quarter.',
      impact: 'high',
    });
  } else if (s.renewalTimeline === 'within-1mo' || s.renewalTimeline === '1-3mo') {
    tactics.push({
      title: 'Immediately Request a Short-Term Extension to Negotiate Properly',
      desc: 'You\'re under deadline — which is Microsoft\'s strongest advantage. Request a 60–90 day extension of current terms before anything expires. Use that window to apply Azure Hybrid Benefit, get competitive quotes, and prepare your bundling strategy. Signing under pressure is the single most common cause of poor Azure contract outcomes.',
      impact: 'high',
    });
  }

  // EA extension risk
  if (s.contractType === 'ea' && (s.renewalTimeline !== '12plusmo')) {
    tactics.push({
      title: 'Treat Your EA Renewal as a Full Renegotiation — Not a Rollover',
      desc: 'Microsoft eliminated automatic volume discount levels (B/C/D) in late 2025. An EA extension without explicit renegotiation reverts your previously negotiated discounts to list price (Level A). Your account team may present an extension as a simple paperwork exercise — it is not. Every term must be re-negotiated from scratch, with your current growth trajectory and total Microsoft spend as leverage.',
      impact: 'high',
    });
  }

  // Dev/Test
  if (s.workloadType === 'mixed' || s.workloadType === 'dev-heavy') {
    tactics.push({
      title: 'Demand Dev/Test Subscriptions as a Standard EA Entitlement',
      desc: 'Dev/Test pricing allows Windows Server VMs to run at Linux pricing rates and SQL Server at 60–75% discount in non-production environments. This is a standard EA entitlement that Microsoft rarely proactively provisions. Explicitly require Dev/Test subscriptions to be set up as part of the agreement. For mixed production/dev environments this can reduce 20–40% of your effective spend.',
      impact: 'medium',
    });
  }

  // MCA-E price lock
  if (s.contractType === 'mca' || s.contractType === 'mca-e') {
    tactics.push({
      title: 'Negotiate an Explicit Price Protection Clause in Your MCA-E',
      desc: 'Unlike the EA, MCA-E has no automatic 3-year price lock. Microsoft can update product terms — including pricing — dynamically. You must negotiate a price protection addendum explicitly stating that unit rates won\'t increase during your commitment term. Without this clause in writing, any unit price increase flows through to your bill regardless of your MACC commitment.',
      impact: 'medium',
    });
  }

  // Pre-increase EA pricing is worth holding to term end; renewing early forfeits it.
  if (s.contractType === 'ea' && s.eaTermStart === 'pre-increase') {
    tactics.push({
      title: 'Hold Your Pre-Increase EA Pricing to Term End',
      desc: 'Your EA term began before the July 1, 2026 Microsoft 365 increase, so you keep pre-increase pricing until renewal. Renewing early, or accepting a proposal that re-papers the agreement, moves you onto current list sooner. Instead, use each remaining anniversary true-up to add seats and upgrades you genuinely need at locked rates. Then open the renewal with the uplift already quantified, so it becomes a number Microsoft has to offset. If you need more time near renewal, get Microsoft\'s written answer on whether a term extension preserves current pricing before relying on one.',
      impact: 'high',
    });
  }

  // Price protection when the EA lock does not apply
  if (s.contractType === 'mca' || s.contractType === 'mca-e' || s.contractType === 'csp') {
    tactics.push({
      title: 'Price the Protection You Lost Leaving the EA',
      desc: 'The EA is the only Microsoft vehicle where price protection is automatic. On MCA-E or CSP, unit rates can move during your term and the July 2026 Microsoft 365 increase applies without shielding. Quantify that exposure explicitly — your committed quantities at prior locked rates against the same quantities at current list — and use the number as the basis for demanding a price protection addendum naming the SKUs it covers. Microsoft resists blanket locks but routinely fixes rates on named subsets where the seat count or workload matters to them.',
      impact: 'high',
    });
  }

  // Optimization before commit
  if (s.optimizationStatus === 'unoptimized' || s.optimizationStatus === 'partially') {
    tactics.push({
      title: 'Run Azure Advisor Recommendations Before Setting Commit Level',
      desc: 'Azure Advisor typically identifies 15–30% cost reduction opportunities through right-sizing, Reserved Instance recommendations, and idle resource cleanup. Completing these before committing to a MACC amount lowers your sustainable spend baseline and reduces overcommitment risk. Commit at 80–85% of your optimized projected spend, not your current inflated baseline.',
      impact: 'medium',
    });
  }

  // Unified Support
  if (s.supportTier === 'unified') {
    tactics.push({
      title: 'Negotiate Microsoft Unified Support Rate Down by 15–30%',
      desc: 'Microsoft Unified Support is typically priced at 10% of total Microsoft spend, which makes it one of the largest line items in large accounts. Discounts of 15–30% on Unified are negotiable — especially when bundled with a MACC renewal. Request a fixed annual cap (not percentage-based) to protect against support costs growing with your Azure spend. Microsoft almost never raises this proactively.',
      impact: 'medium',
    });
  }

  // Reserved Instances
  if (tier >= 2) {
    tactics.push({
      title: 'Layer Reserved Instances on Top of Negotiated ACD',
      desc: 'Your Azure Consumption Discount (ACD) and Reserved Instances are not mutually exclusive. RIs (1-year or 3-year) deliver 20–72% additional savings off On-Demand for stable workloads, and they stack on top of your negotiated ACD rate. Negotiate explicit confirmation in your agreement that RIs apply to ACD-discounted prices, not list price. This clarification can be worth millions at scale.',
      impact: 'medium',
    });
  }

  // Migration credits
  if (s.expansionPlans.includes('azure-migrate') || s.expansionPlans.includes('onprem-exit') || s.migrationStatus === 'planning') {
    tactics.push({
      title: 'Request Azure Consumption Credits (ACO) for Migration Workloads',
      desc: 'Microsoft offers Azure Consumption Credits (ACO) to offset migration and modernization costs. For documented migration projects (SAP on Azure, Oracle on Azure, VMware migration, or on-premises exit), ACO grants of $50K–$500K+ are standard. Present your migration roadmap with specific workloads and timelines — the specificity of the ask directly correlates with the size of the credit you receive.',
      impact: 'medium',
    });
  }

  // SAP
  if (s.useCases.includes('sap')) {
    tactics.push({
      title: 'Leverage SAP on Azure for Dedicated Migration Funding',
      desc: 'Microsoft has a dedicated SAP on Azure program with co-investment funding, professional services, and extended support commitments. If you\'re running or migrating SAP workloads, request SAP-specific negotiation involving Microsoft\'s SAP on Azure team — they have additional budget and can offer terms unavailable to the standard enterprise sales team.',
      impact: 'medium',
    });
  }

  // AI workloads
  if (s.useCases.includes('ai-ml')) {
    tactics.push({
      title: 'Negotiate Azure OpenAI / AI Credits as Part of Your MACC',
      desc: 'Azure AI (OpenAI Service, Azure ML) is Microsoft\'s fastest-growing category. Request dedicated Azure OpenAI credits and discounted GPU reservations as concessions in your MACC negotiation. Microsoft will subsidize AI adoption heavily to win the long-term footprint against AWS Bedrock and GCP Vertex — use this to your advantage.',
      impact: 'medium',
    });
  }

  // Growth narrative — mirrors the AWS planner's treatment of the same signal
  if (s.growthRate === 'hypergrowth' || s.growthRate === 'fast' || s.spendGrowth === 'hypergrowth' || s.spendGrowth === 'fast') {
    tactics.push({
      title: 'Build a Growth Narrative with Documented Projections',
      desc: 'Microsoft discounts today\'s spend but underwrites tomorrow\'s. Bring a three-year Azure projection backed by business data — headcount plans, product roadmap, data-center exit timeline — and commit at a level that reflects where you are heading rather than where you are. A higher committed number unlocks a better MACC tier, and a documented projection is what makes that number defensible internally as well as to Microsoft.',
      impact: 'medium',
    });
  } else if (s.spendGrowth === 'declining') {
    tactics.push({
      title: 'Commit Conservatively Against a Declining Baseline',
      desc: 'Your Azure consumption is falling, which means any MACC sized on historical spend will be underconsumed — and shortfall is your liability, not Microsoft\'s. Size the commitment to a defensible floor, not to last year\'s run rate. Be direct with the account team about the trajectory: a smaller commitment you will actually meet is a better outcome than a larger one that triggers a true-up penalty.',
      impact: 'high',
    });
  }

  tactics.push({
    title: 'Establish Your BATNA Before the First Microsoft Meeting',
    desc: 'Know your Best Alternative before any negotiation begins: Can you extend month-to-month? Convert to CSP temporarily? Move a workload to AWS? Having a realistic walk-away prevents signing bad terms under pressure. Never disclose your BATNA to Microsoft — simply signal it exists through your competitive evaluation activity.',
    impact: 'low',
  });

  // Sort by impact before capping. Without this, a high-impact tactic added
  // late in the function is silently dropped while a low-impact early one survives.
  const rank = { high: 0, medium: 1, low: 2 };
  return tactics
    .map((t, i) => ({ t, i }))
    .sort((a, b) => (rank[a.t.impact] ?? 1) - (rank[b.t.impact] ?? 1) || a.i - b.i)
    .map(x => x.t)
    .slice(0, 12);
}

// ─── Timeline ─────────────────────────────────────────────────────────────────
function buildTimeline(s) {
  const isUrgent = s.renewalTimeline === 'within-1mo' || s.renewalTimeline === '1-3mo';
  return [
    {
      phase: 'P1', when: isUrgent ? 'Week 1 (Immediate)' : 'Months 9–12 Before Renewal',
      title: 'Internal Baseline & Optimization',
      desc: 'Know your numbers before Microsoft does. This is where 20–35% of your savings come from, independent of negotiation.',
      tasks: [
        'Run Azure Advisor — action all cost recommendations; document pre/post spend delta',
        'Apply Azure Hybrid Benefit to all eligible Windows Server and SQL Server VMs if not already done',
        'Activate Dev/Test subscriptions for all non-production workloads',
        'Pull 12-month Azure cost breakdown by service, subscription, and region',
        'Model 3-year spend: conservative (current run-rate), moderate (+20%), aggressive (+50%)',
      ],
    },
    {
      phase: 'P2', when: isUrgent ? 'Week 1–2' : 'Months 6–9 Before Renewal',
      title: 'Competitive Intelligence & Bundle Strategy',
      desc: 'Define your negotiating position and create leverage before the first Microsoft meeting.',
      tasks: [
        'Request formal Azure pricing proposals from AWS and/or GCP for 2–3 representative workloads',
        'Inventory all Microsoft spend: Azure + M365 + Dynamics + GitHub + Unified Support',
        'Identify any planned M365/Copilot/Dynamics expansion — this is your bundling leverage',
        'Engage a Microsoft licensing specialist or FinOps advisor if this is your first full EA/MACC negotiation',
        'Align internally: CTO, CFO, and Procurement must be aligned on goals before Microsoft outreach',
      ],
    },
    {
      phase: 'P3', when: isUrgent ? 'Week 2–3' : 'Months 3–6 Before Renewal',
      title: 'Strategic Outreach & Anchoring',
      desc: 'First impressions set the frame. Lead with growth and strategy — not price.',
      tasks: [
        'Contact your Microsoft account executive — request a "strategic partnership review," not a renewal call',
        'In the first meeting, present your 3-year cloud roadmap, AI/Copilot plans, and total Microsoft footprint',
        s.multicloud !== 'azure-only' ? 'Reference your multi-cloud evaluation — make it clear consolidation has a price' : 'Reference competitive pricing you\'ve received from AWS/GCP',
        'Ask Microsoft to model 1-year vs. 3-year MACC scenarios with marketplace inclusion and RI stacking',
        'Request their first written proposal — commit to nothing verbally in this meeting',
      ],
    },
    {
      phase: 'P4', when: isUrgent ? 'Week 3–4' : '4–8 Weeks Before Renewal',
      title: 'Full Negotiation — All Terms, Not Just ACD',
      desc: 'The headline discount is table stakes. The real value is in the contract terms around it.',
      tasks: [
        'Counter Microsoft\'s first ACD offer — anchor 15–20 points above their opening bid',
        'Negotiate price lock clause explicitly (critical for MCA-E; verify language is in the document)',
        'Push for ramp provisions: Q1/Q2 shortfalls forgiven or rolled forward, not billed as true-up',
        'Request: Azure consumption credits (ACO), Unified Support discount, RI stacking confirmation, Dev/Test provisioning, migration funding',
        'Escalate to Microsoft VP/CVP level if field team hits a discount ceiling — executive engagement unlocks additional authority',
      ],
    },
    {
      phase: 'P5', when: isUrgent ? 'Week 4–5' : '1–2 Weeks Before Close',
      title: 'Legal Review & Close',
      desc: 'Every verbal commitment must be in writing. Don\'t close until legal has reviewed the actual contract.',
      tasks: [
        'Have legal counsel review the MCA-E / EA for price protection clauses, auto-renewal, and shortfall language',
        'Confirm price lock, ramp provisions, and all concessions are in the signed agreement — not in side emails',
        'Set up quarterly business reviews with your Microsoft account team post-signing',
        'Establish internal Azure cost governance: monthly spend tracking against MACC commitment',
        'Calendar a pre-renewal alert 9 months before next expiry — start the next cycle early',
      ],
    },
  ];
}

// ─── Concessions ──────────────────────────────────────────────────────────────
function buildConcessions(s, tier) {
  const items = [];
  items.push({ icon: '🔒', title: 'Price Protection Clause', desc: 'Explicit contractual guarantee that unit rates won\'t increase during MACC term (critical for MCA-E).', priority: 'must' });
  items.push({ icon: '🔄', title: 'Ramp / Shortfall Provisions', desc: 'Q1/Q2 under-consumption forgiven or rolled forward; shortfall not billed as immediate true-up.', priority: 'must' });
  if (s.expansionPlans.includes('azure-migrate') || s.migrationStatus === 'planning') {
    items.push({ icon: '✈️', title: 'Azure Consumption Credits (ACO)', desc: 'Credits to offset migration project costs. Typically $50K–$500K+ for documented migration plans.', priority: 'must' });
  }
  items.push({ icon: '💻', title: 'Dev/Test Subscriptions', desc: 'Windows Server at Linux rates + SQL Server at 60–75% off for non-production workloads. Standard EA entitlement.', priority: 'must' });
  if (s.supportTier === 'unified') {
    items.push({ icon: '🎧', title: 'Unified Support Discount (15–30%)', desc: 'Reduce percentage-based Unified Support pricing, or cap at a fixed annual dollar amount.', priority: tier >= 4 ? 'must' : 'should' });
  }
  items.push({ icon: '📦', title: 'RI Stacking Confirmation', desc: 'Written confirmation that Reserved Instance discounts apply on top of (not instead of) your ACD.', priority: 'should' });
  if (s.useCases.includes('ai-ml') || s.expansionPlans.includes('copilot-adopt')) {
    items.push({ icon: '🤖', title: 'Azure OpenAI / AI Credits', desc: 'Service-specific credits for Azure OpenAI Service and Azure ML workloads.', priority: 'should' });
  }
  items.push({ icon: '🔁', title: 'No Auto-Renewal Lock-in', desc: 'Require 90-day notice window before renewal; explicit renegotiation right at each anniversary.', priority: 'should' });
  if (s.contractType === 'ea') {
    items.push({ icon: '📅', title: 'Written Pricing Terms for Any Extension', desc: 'Written confirmation, naming the SKUs, of which price list and discounts apply during any term extension or renewal. Neither pre-increase pricing nor prior discounts carry forward automatically.', priority: 'must' });
    items.push({ icon: '🔐', title: 'Price Lock Equivalent on Any MCA-E Move', desc: 'If Microsoft migrates you off the EA, a contractual replacement for the automatic 3-year price lock, agreed as a condition of the migration rather than after it.', priority: 'must' });
  }
  items.push({ icon: '👩‍💻', title: 'Microsoft FastTrack / ProServ', desc: 'Funded architecture reviews, well-architected framework reviews, and migration guidance hours.', priority: tier >= 3 ? 'should' : 'nice' });
  items.push({ icon: '🎓', title: 'Training & Certification Credits', desc: 'Microsoft Learn credits and Azure certification exam vouchers for your team.', priority: 'nice' });
  if (s.msProducts.includes('m365') || s.expansionPlans.includes('m365-expand')) {
    items.push({ icon: '📊', title: 'M365 / Copilot Seat Discount', desc: 'Bundle M365 E3→E5 upgrade or Copilot seat discount as part of total Microsoft deal.', priority: 'should' });
  }
  if (s.compliance.includes('fedramp') || s.industry === 'government') {
    items.push({ icon: '🛡️', title: 'GovCloud / Compliance Advisory', desc: 'Dedicated FedRAMP compliance support and government cloud architecture guidance included.', priority: 'should' });
  }
  items.push({ icon: '📌', title: 'Pricing Schedule Freeze', desc: "EA and MCA-E terms routinely reference Microsoft’s published price lists rather than printing rates. Pin every such reference to a dated snapshot so meter pricing cannot change mid-term without a signed amendment.", priority: 'must' });
  items.push({ icon: '📉', title: 'Price-Down (MFN) Trigger', desc: "If Microsoft reduces published rates on any Azure meter you consume, the lower rate applies automatically within 30 days with your negotiated discount still stacked on top.", priority: 'should' });
  return items;
}

// ─── Risks ────────────────────────────────────────────────────────────────────
function buildRisks(s, tier) {
  const risks = [];
  if (s.contractType === 'ea' && s.renewalTimeline !== '12plusmo') {
    risks.push({ level: 'high', title: 'EA Extension ≠ EA Renewal', desc: 'Extending without renegotiating reverts your discounts to Level A list price. Treat every renewal as a clean-sheet negotiation.' });
  }
  if (s.contractType === 'mca' || s.contractType === 'mca-e') {
    risks.push({ level: 'high', title: 'No Price Lock in MCA-E by Default', desc: 'Microsoft can change unit rates dynamically in MCA-E. Demand a price protection addendum in writing before signing.' });
  }
  if (s.contractType === 'ea') {
    risks.push({ level: 'high', title: 'EA Price Lock Does Not Survive Migration to MCA-E', desc: 'Microsoft began moving EA customers on MACC plans to MCA-E from March 2026. The automatic 3-year price lock, locked pricing on added seats, and the fixed renewal negotiation moment are all EA-specific and do not transfer. Price that loss before agreeing to the move.' });
  }
  if (s.contractType === 'ea' && s.eaTermStart === 'pre-increase') {
    risks.push({ level: 'medium', title: 'Early Renewal Forfeits Pre-Increase Pricing', desc: 'Your term predates the July 2026 Microsoft 365 increase. Any early renewal or agreement re-papering, however it is framed, moves you onto current list before you need to be. Hold the term and use anniversary true-ups instead.' });
  }
  if (s.renewalTimeline === 'within-1mo') {
    risks.push({ level: 'high', title: 'Negotiating Under Deadline', desc: 'Urgency is Microsoft\'s advantage. Request a 60–90 day extension before signing anything.' });
  }
  if (s.multicloud === 'azure-only') {
    risks.push({ level: 'high', title: 'No Competitive Leverage', desc: 'All-in on Azure with no alternative weakens your position significantly. Get at least one AWS/GCP quote before negotiating.' });
  }
  if (s.commitUtilization === 'under70') {
    risks.push({ level: 'medium', title: 'Underutilization History', desc: 'Prior MACC shortfall signals you over-committed. Microsoft will use this to justify reduced ACD or stricter shortfall terms. Commit conservatively this cycle.' });
  }
  if (s.optimizationStatus === 'unoptimized') {
    risks.push({ level: 'medium', title: 'Inflated MACC Baseline', desc: 'Committing to unoptimized spend locks in waste at discounted rates. Apply Hybrid Benefit and Advisor recommendations first.' });
  }
  if (s.spendGrowth === 'declining') {
    risks.push({ level: 'medium', title: 'Declining Azure Consumption', desc: 'Falling Azure spend materially weakens your position — Microsoft allocates its best commercial terms to accounts that are growing. Size the MACC to your realistic floor rather than to historical spend, and shift the conversation toward the workloads you are adding rather than defending the ones you are losing.' });
  }
  risks.push({ level: 'medium', title: 'Auto-Renewal Clauses', desc: 'EA and MACC agreements often auto-renew at current (or worse) terms without explicit notice. Negotiate a 90-day renewal window requirement.' });
  if (tier <= 1) {
    risks.push({ level: 'medium', title: 'Below MACC Threshold', desc: 'Your spend level may not qualify for a negotiated MACC. Focus on Reserved Instances + Savings Plans. Build a growth narrative to access MACC in the next cycle.' });
  }
  risks.push({ level: 'low', title: 'Account Team Turnover', desc: 'Microsoft account teams turn over frequently. Ensure every commitment is contractually documented — verbal promises from your AE are not binding.' });
  if (s.desiredTerm === '3yr') {
    risks.push({ level: 'low', title: '3-Year Lock-in Risk', desc: 'A 3-year MACC is favorable for pricing but exposes you to architectural changes. Negotiate annual true-up provisions and service substitution rights.' });
  }
  return risks;
}

// ─── Questions ────────────────────────────────────────────────────────────────
function buildQuestions(s, tier) {
  const qs = [
    'What is the current standard ACD for our MACC commitment level, and what would it take to reach the next tier?',
    'Can you provide written confirmation that our Reserved Instance discounts stack on top of the negotiated ACD — not instead of it?',
    'What is the exact price protection language you can include in this agreement to prevent unit rate increases during our term?',
  ];
  if (s.contractType === 'mca' || s.contractType === 'mca-e') qs.push('Since MCA-E has no automatic price lock, what is the process to add a price stability addendum, and who needs to approve it?');
  if (s.contractType === 'ea') qs.push('If we extend this EA rather than signing a new one, do our previously negotiated discounts carry forward automatically — and can you show us that in the agreement language?');
  if (s.contractType === 'ea' && s.eaTermStart === 'pre-increase') {
    qs.push('Which products and quantities can we add at our next anniversary true-up at our locked rates, and if we extend the term, does current pricing continue until the extension ends?');
    qs.push('What Azure Monetary Commitment will you propose at auto-renewal, and what consumption period is it calculated from?');
  }
  if (s.contractType === 'ea') qs.push('If Microsoft moves us from EA to MCA-E, what replaces the automatic 3-year price lock, and will you commit that replacement to writing?');
  qs.push('What are the exact shortfall mechanics — if we miss our annual MACC by 15%, how is the difference calculated and billed?');
  qs.push('What ramp provisions can you offer for the first two quarters of the commitment period?');
  if (s.msProducts.includes('m365') || s.expansionPlans.includes('m365-expand')) qs.push('If we commit to upgrading our M365 seats from E3 to E5 in this same agreement, what additional Azure ACD improvement does that unlock?');
  if (s.expansionPlans.includes('copilot-adopt')) qs.push('We\'re planning to deploy Copilot — what Azure credits or ACD improvement can Microsoft offer to support that commitment in this renewal?');
  if (s.multicloud !== 'azure-only') qs.push('We currently have workloads running on AWS/GCP. What discount would make consolidating those onto Azure in the next 18 months financially compelling?');
  qs.push('What Azure consumption credits (ACO) are available for our migration and modernization projects, and is that additive to our ACD?');
  if (s.supportTier === 'unified') qs.push('Our Unified Support contract is a significant cost. What discount or fixed-cap option can you offer as part of this renewal?');
  qs.push('What does executive engagement from Microsoft look like at our investment level, and who would be our senior Microsoft sponsor?');
  return qs.slice(0, 10);
}

// ─── Alerts ───────────────────────────────────────────────────────────────────
function buildAlerts(s, tier) {
  const alerts = [];
  if (s.renewalTimeline === 'within-1mo') {
    alerts.push({ type: 'danger', icon: '🚨', text: '<strong>Urgent: Less than 30 days to expiry.</strong> Do not sign under deadline pressure. Immediately request a 60–90 day extension of current terms while you negotiate properly. This is your most important first step.' });
  }
  if ((s.contractType === 'ea' || s.contractType === 'mca-e') && s.renewalTimeline !== '12plusmo') {
    alerts.push({ type: 'warning', icon: '⚠️', text: '<strong>EA/MCA-E Renewal Risk:</strong> Microsoft eliminated automatic volume discount levels (B/C/D) in late 2025. Your renewal will revert to Level A list price unless you actively renegotiate every discount. This is not a paperwork renewal — it\'s a full negotiation.' });
  }
  if (s.contractType === 'mca' || s.contractType === 'mca-e') {
    alerts.push({ type: 'warning', icon: '🔒', text: '<strong>No Price Lock in MCA-E by Default.</strong> Unlike the EA, MCA-E agreements allow Microsoft to update pricing dynamically. Negotiate an explicit price protection addendum before signing. This is a common omission that leads to unexpected cost increases mid-term.' });
  }
  if (s.multicloud === 'azure-only' && tier >= 3) {
    alerts.push({ type: 'warning', icon: '⚡', text: '<strong>No Competitive Leverage Detected.</strong> At your spend level, entering MACC negotiations without a credible competitive alternative from AWS or GCP can cost 5–10 percentage points of ACD. Even requesting formal pricing for one workload before your first Microsoft meeting creates meaningful leverage.' });
  }
  if ((s.onpremLicenses.includes('windows-server') || s.onpremLicenses.includes('sql-server')) && s.hybridBenefitStatus === 'not-applied') {
    alerts.push({ type: 'danger', icon: '💸', text: '<strong>Azure Hybrid Benefit is not applied.</strong> You have eligible on-premises licenses but are paying full Azure VM rates for Windows Server and/or SQL Server. Apply Hybrid Benefit immediately — this saves 40–75% on eligible VMs before any negotiation, and reduces your MACC commit baseline.' });
  }
  if (s.contractType === 'payg' && tier >= 2) {
    alerts.push({ type: 'warning', icon: '💸', text: '<strong>You\'re on Pay-As-You-Go at a scale that warrants a MACC.</strong> PAYG has no ACD, no price lock, and no leverage. At your spend level, a MACC negotiation should be a top priority — the savings opportunity is significant.' });
  }
  if (['level-b', 'level-c', 'level-d'].includes(s.eaPricingLevel)) {
    const levelLabels = { 'level-b': 'B', 'level-c': 'C', 'level-d': 'D' };
    alerts.push({ type: 'danger', icon: '🚨', text: `<strong>EA Pricing Level ${levelLabels[s.eaPricingLevel]} is now at risk.</strong> Microsoft eliminated automatic volume discount levels (A/B/C/D) for online/cloud services in late 2025. At renewal, your Level ${levelLabels[s.eaPricingLevel]} discount does <em>not</em> carry forward automatically — Microsoft expects a 6–12% cost uplift for customers at your level who do not proactively renegotiate. Treat this renewal as a full negotiation, not a rollover. Get Microsoft to document any continued discount explicitly in the signed agreement.` });
  }
  if (s.eaPricingLevel === 'unknown' && s.contractType === 'ea') {
    alerts.push({ type: 'warning', icon: '⚠️', text: '<strong>Identify your EA Pricing Level before negotiating.</strong> Microsoft eliminated automatic volume discount levels (B/C/D) in late 2025. Ask your account team what level you are currently on — if it\'s B, C, or D, you are at risk of a 6–12% cost increase at renewal if you don\'t renegotiate explicitly.' });
  }
  if (s.contractType === 'ea' && s.eaTermStart === 'pre-increase') {
    const soon = s.eaAnniversary === 'within-3mo';
    alerts.push({ type: soon ? 'warning' : 'info', icon: '📅', text: `<strong>You are still on pre-increase EA pricing — do not renew early.</strong> The July 1, 2026 Microsoft 365 increase applies at the next renewal after that date, so your term keeps current rates until it ends. Renewing early brings the increase forward. ${soon ? 'Your next anniversary is inside 3 months: plan the true-up now and add genuinely needed seats and upgrades at locked pricing.' : 'Use each remaining anniversary true-up to add genuinely needed seats at locked pricing.'} Open the renewal with the uplift quantified, before the auto-renewal proposal lands 30–90 days out.` });
  }
  if (s.contractType === 'ea' && (!s.eaTermStart || s.eaTermStart === 'unknown')) {
    alerts.push({ type: 'info', icon: '📅', text: '<strong>Confirm when your EA term began.</strong> If it began before July 1, 2026, you are on pre-increase pricing until renewal and should not renew early. Your account team or reseller can confirm it in one email.' });
  }
  if (s.contractType === 'ea' && tier >= 3) {
    alerts.push({ type: 'info', icon: '🔒', text: '<strong>Your EA price lock is an asset with an expiry date.</strong> From March 2026 Microsoft began migrating EA customers on MACC plans to MCA-E ahead of renewal, and the EA is increasingly reserved for its largest accounts. MCA-E carries no automatic price lock, no locked pricing on added seats, and no fixed renewal negotiation moment. If Microsoft proposes the move, the price protection addendum is what you trade for agreeing to it — not an afterthought to paper later.' });
  }
  if (s.m365Reclamation === 'never' && tier >= 2) {
    alerts.push({ type: 'warning', icon: '📋', text: '<strong>M365 License Shelfware Risk.</strong> Practitioners report 7–19% of M365 licenses are unused in estates that have never run a reclamation pass. Microsoft uses your current licensed seat count as the baseline for renewal pricing — reclaim unused licenses before renewal to reduce that baseline and lower your committed spend. This is one of the highest-ROI pre-negotiation actions available.' });
  }
  if (s.cspOpenness === 'open') {
    alerts.push({ type: 'success', icon: '🟢', text: '<strong>CSP Split Strategy Available.</strong> Separating your Azure MACC into a CSP relationship (while keeping M365 direct or vice versa) is an emerging high-value tactic — CSP partner economics can add 8–15% effective discount on Azure spend vs. direct MCA-E. Present this as a credible alternative in your first Microsoft negotiation meeting to create leverage on the direct deal.' });
  }
  if (s.useCases.includes('ai-ml')) {
    alerts.push({ type: 'info', icon: '🌍', text: '<strong>Regional AI Foundry deployments cost more than global.</strong> Since September 1, 2026, Microsoft prices Azure AI Foundry model deployments outside the default global region at a premium — EU Data Zone +9%, other regional deployments +7–16%, and the new APAC Data Zone +20% above Global list. If any planned AI/ML consumption is pinned to a specific region for compliance or latency, size your MACC or EA commitment off the regional rate, not the global one.' });
  }
  return alerts;
}

// ─── Sample output ──────────────────────────────────────────────────────────
// A fixed, illustrative client profile so advisors can show what the planner
// produces without filling in the form. Kept deliberately consistent across the
// AWS, Azure, GCP, and Salesforce planners.
const SAMPLE_PROFILE = "Mid-market SaaS company · $10M–$25M annual Azure spend";
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
  "azureTenure": "3-5",
  "contractType": "ea",
  "msProducts": [
    "m365",
    "power-platform"
  ],
  "annualSpend": "10m-25m",
  "totalMsSpend": "10m-25m",
  "onpremLicenses": [
    "windows-server",
    "sql-server"
  ],
  "eaPricingLevel": "level-a",
  "eaAnniversary": "6-12mo",
  "eaTermStart": "pre-increase",
  "m365Reclamation": "partial",
  "cspOpenness": "unknown",
  "supportTier": "unified",
  "useCases": [
    "compute",
    "containers",
    "databases",
    "analytics"
  ],
  "hybridBenefitStatus": "partially",
  "migrationStatus": "in-progress",
  "multicloud": "azure-primary",
  "expansionPlans": [
    "copilot-adopt"
  ],
  "eaConcern": "price-lock"
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
