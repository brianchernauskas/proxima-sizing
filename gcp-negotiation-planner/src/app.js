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
    1: ['industry', 'growth-rate', 'gcp-tenure', 'contract-type'],
    2: ['annual-spend', 'workspace-spend', 'spend-growth', 'renewal-timeline'],
    3: ['workload-type', 'optimization-status'],
    4: ['relationship-quality', 'switching-from'],
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
    state.gcpTenure = document.getElementById('gcp-tenure').value;
    state.contractType = document.getElementById('contract-type').value;
    state.googleProducts = [...document.querySelectorAll('#google-products input:checked')].map(i => i.value);
    state.compliance = [...document.querySelectorAll('#compliance input:checked')].map(i => i.value);
  }
  if (step === 2) {
    state.annualSpend = document.getElementById('annual-spend').value;
    state.workspaceSpend = document.getElementById('workspace-spend').value;
    state.spendGrowth = document.getElementById('spend-growth').value;
    state.renewalTimeline = document.getElementById('renewal-timeline').value;
    state.desiredTerm = document.getElementById('desired-term').value;
    state.cudUtilization = document.getElementById('cud-utilization').value;
    state.chargebackIsolation = document.getElementById('chargeback-isolation')?.value || '';
    state.flexCudFootprint = document.getElementById('flex-cud-footprint')?.value || '';
    state.casc = document.getElementById('casc')?.value || '';
    state.currentDiscounts = [...document.querySelectorAll('#current-discounts input:checked')].map(i => i.value);
    state.supportTier = document.getElementById('support-tier').value;
  }
  if (step === 3) {
    state.useCases = [...document.querySelectorAll('#use-cases .selected')].map(c => c.dataset.value);
    state.workloadType = document.getElementById('workload-type').value;
    state.spotVmUsage = document.getElementById('spot-vm-usage').value;
    state.optimizationStatus = document.getElementById('optimization-status').value;
    state.bigqueryPricing = document.getElementById('bigquery-pricing').value;
  }
  if (step === 4) {
    state.multicloud = document.querySelector('#multicloud .selected')?.dataset.value;
    state.relationshipQuality = document.getElementById('relationship-quality').value;
    state.strategicPlans = [...document.querySelectorAll('#strategic-plans input:checked')].map(i => i.value);
    state.switchingFrom = document.getElementById('switching-from').value;
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

// ─── Spend tiers ──────────────────────────────────────────────────────────────
const SPEND_TIERS = {
  'under250k': { label: '<$250K',      tier: 0 },
  '250k-1m':   { label: '$250K–$1M',  tier: 1 },
  '1m-5m':     { label: '$1M–$5M',    tier: 2 },
  '5m-10m':    { label: '$5M–$10M',   tier: 3 },
  '10m-25m':   { label: '$10M–$25M',  tier: 4 },
  '25m-50m':   { label: '$25M–$50M',  tier: 5 },
  '50mplus':   { label: '$50M+',      tier: 6 },
};

const WORKSPACE_TIERS = { 'none': 0, 'under100k': 1, '100k-500k': 2, '500k-2m': 3, '2mplus': 4 };

const GCP_TO_CAL_TIER = {
  'under250k': 'under1m', '250k-1m': 'under1m',
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
  const wsTier = WORKSPACE_TIERS[s.workspaceSpend] ?? 0;
  const bundleBoost = wsTier >= 2 ? 5 : wsTier === 1 ? 2 : 0;
  const multicloudBoost = s.multicloud === 'multi-cloud' ? 8 : s.multicloud === 'evaluating' ? 10 : s.multicloud === 'gcp-primary' ? 3 : 0;
  // "evaluating" = switching from AWS/Azure = Google's highest hunger
  const switchBoost = (s.switchingFrom === 'aws' || s.switchingFrom === 'azure' || s.switchingFrom === 'both') ? 5 : 0;
  const termBoost = s.desiredTerm === '3yr' ? 5 : 0;
  const aiBoost = s.strategicPlans?.includes('ai-expansion') ? 3 : 0;

  // EA/PPA discount on top of CUDs; CUDs themselves give 28–55% on compute
  const ranges = [
    [0,  5],  // <$250K — CUDs + SUDs only, no EA
    [5,  15], // $250K–$1M — early PPA territory
    [10, 25], // $1M–$5M
    [15, 30], // $5M–$10M
    [18, 35], // $10M–$25M
    [22, 40], // $25M–$50M
    [25, 45], // $50M+
  ];
  const [lo, hi] = ranges[tier] || [0, 5];
  const loFinal = Math.min(lo + Math.round(bundleBoost * 0.4), 45);
  const hiFinal = Math.min(hi + bundleBoost + multicloudBoost + switchBoost + termBoost + aiBoost, 55);
  return { lo: loFinal, hi: hiFinal, midpoint: Math.round((loFinal + hiFinal) / 2) };
}

function getLeverageScore(s) {
  let score = 0;
  score += (SPEND_TIERS[s.annualSpend]?.tier ?? 0) * 4;
  score += (WORKSPACE_TIERS[s.workspaceSpend] ?? 0) * 3;
  // GCP's market hunger makes competitive threats extra powerful
  if (s.multicloud === 'multi-cloud') score += 16;
  else if (s.multicloud === 'evaluating') score += 20; // new workload is Google's biggest prize
  else if (s.multicloud === 'gcp-primary') score += 5;
  if (s.switchingFrom === 'aws' || s.switchingFrom === 'azure') score += 8;
  if (s.switchingFrom === 'both') score += 12;
  const growthMap = { hypergrowth: 12, fast: 9, moderate: 6, slow: 2, declining: 0 };
  score += growthMap[s.growthRate] ?? 4;
  const timingMap = { '6-12mo': 10, '3-6mo': 7, '12plusmo': 5, '1-3mo': 3, 'within-1mo': 0 };
  score += timingMap[s.renewalTimeline] ?? 5;
  const relMap = { strategic: 10, strong: 8, moderate: 5, poor: 2, none: 0 };
  score += relMap[s.relationshipQuality] ?? 3;
  // Tenure (0–5) — parity with the AWS and Azure planners
  const tenureMap = { '5plus': 5, '3-5': 4, '1-3': 2, 'new': 0 };
  score += tenureMap[s.gcpTenure] ?? 2;
  score += (s.strategicPlans?.length ?? 0) * 1.5;
  // Flex CUD consolidation opportunity
  if (s.flexCudFootprint === 'full-mix') score += 6;
  else if (s.flexCudFootprint === 'vms-gke' || s.flexCudFootprint === 'vms-cloudrun') score += 4;
  // CASC — unlocks additional negotiated CUD discount
  if (s.casc === 'yes-active') score += 8;
  else if (s.casc === 'yes-negotiating') score += 5;
  else if (s.casc === 'no-eligible') score += 2;
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
  if (tier >= 4) return 'EA + 3-Year CUDs';
  if (tier >= 2) return 'PPA + CUDs';
  if (tier >= 1) return 'Spend-based CUDs';
  return 'Resource CUDs + SUDs';
}

// ─── Main builder ─────────────────────────────────────────────────────────────
function buildStrategyHTML(s) {
  const discount = getDiscountRange(s);
  const leverage = getLeverageScore(s);
  const leverageInfo = getLeverageLabel(leverage);
  const tier = SPEND_TIERS[s.annualSpend]?.tier ?? 0;
  const spendLabel = SPEND_TIERS[s.annualSpend]?.label ?? 'Unknown';
  const companyLabels = { startup: 'Startup', smb: 'SMB', midmarket: 'Mid-Market', enterprise: 'Enterprise' };

  const tactics = buildTactics(s, tier);
  const proxima = getProximaInsight('gcp', GCP_TO_CAL_TIER[s.annualSpend]);
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
    <span class="print-tool-name">GCP Negotiation Planner</span>
  </div>
  <div class="strategy-hero">
    <h2>Your GCP Negotiation Strategy</h2>
    <div class="subtitle">${companyLabels[s.companySize] || 'Company'} · ${spendLabel} GCP spend · Generated ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
    <div style="font-size:.75rem;color:rgba(255,255,255,.6);font-style:italic;margin-top:4px;">Intended for Proxima use only — please contact Brian Chernauskas with questions</div>
    <div style="font-size:.7rem;color:rgba(255,255,255,.35);margin-top:3px;">Discount ranges last calibrated: ${RANGES_LAST_UPDATED}</div>
    <div class="score-row">
      <div class="score-pill"><span class="pill-label">Leverage Score</span><span class="pill-value" style="color:${leverageInfo.color}">${leverage}/100 — ${leverageInfo.label}</span></div>
      <div class="score-pill"><span class="pill-label">EA / PPA Discount Target</span><span class="pill-value">${discount.lo}–${discount.hi}%</span></div>
      <div class="score-pill"><span class="pill-label">Recommended Structure</span><span class="pill-value">${recommendedVehicle(s, tier)}</span></div>
    </div>
  </div>

  <div class="strategy-body">

    ${alerts.length ? `
    <div class="strategy-section">
      <div class="section-header"><span class="section-icon">🚨</span><h3>Critical Flags & Immediate Actions</h3></div>
      <div class="section-content"><div class="alerts-list">${alerts.map(a => `<div class="alert alert-${a.type}"><span class="alert-icon">${a.icon}</span><div>${a.text}</div></div>`).join('')}</div></div>
    </div>` : ''}

    <div class="strategy-section">
      <div class="section-header"><span class="section-icon">💰</span><h3>GCP Discount Stack: What You Should Be Getting</h3><span class="section-badge">${recommendedVehicle(s, tier)}</span></div>
      <div class="section-content">
        ${discountStackHTML(s, tier, discount, proxima)}
      </div>
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
      <div class="section-header"><span class="section-icon">🎁</span><h3>Concessions to Request</h3><span class="section-badge green">Beyond headline discount</span></div>
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
      <div class="section-header"><span class="section-icon">💬</span><h3>Questions to Ask Google in the First Meeting</h3></div>
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

// ─── GCP Discount Stack (unique to GCP) ──────────────────────────────────────
// `proxima` must be passed in — it is scoped to buildStrategyHTML, and
// referencing it here threw a ReferenceError that broke strategy generation.
function discountStackHTML(s, tier, discount, proxima) {
  const hasSUD = s.useCases.includes('compute') || s.useCases.includes('gke');
  const hasSpotOpportunity = s.workloadType === 'batch' || s.workloadType === 'mixed' || s.workloadType === 'dev-heavy';
  const hasWorkspace = s.workspaceSpend !== 'none' && s.workspaceSpend;
  const cudActive = s.currentDiscounts.includes('cud-resource') || s.currentDiscounts.includes('cud-spend');

  const hasAI = s.useCases.includes('vertex-ai') || s.strategicPlans?.includes('ai-expansion');

  const layers = [
    { label: 'Layer 1: Sustained Use Discounts (SUDs)', value: 'Up to 20–30% off', note: 'Automatic — no action needed for Compute Engine VMs running >25% of month', active: hasSUD, color: '#34A853' },
    { label: 'Layer 2: Spot / Preemptible VMs', value: 'Up to 60–91% off', note: 'For fault-tolerant batch/dev workloads — shift these off CUD baseline before committing', active: hasSpotOpportunity, color: '#FBBC04' },
    { label: 'Layer 3: Committed Use Discounts (CUDs)', value: '28–55% off on-demand', note: 'Resource CUDs (vCPU/RAM) for stable workloads; Spend CUDs for flexibility. Stack on top of SUDs.', active: true, color: '#4285F4' },
    { label: 'Layer 4: Vertex AI Commitment Pricing', value: '18–32% (38–52% PT)', note: 'Vertex AI and Gemini consumption counts toward your CUD and PPA commitments. Inside a CUD, expect 18–32% below published rates; Provisioned Throughput inside a CUD reaches 38–52% below standalone on-demand. This is the fastest-growing and least-scrutinized meter in most Google deals — model it explicitly rather than letting it ride on the blended rate.', active: hasAI, color: '#00ACC1' },
    { label: 'Layer 5: EA / Private Pricing Agreement', value: `${discount.lo}–${discount.hi}% additional`, note: 'Negotiated discount on top of CUD+SUD pricing. Requires $1M+ spend and formal Google engagement.', active: tier >= 1, color: '#EA4335' },
    { label: 'Layer 6: GCP + Workspace Bundle', value: '+5–15% blended improvement', note: 'Consolidating Workspace + GCP into one CASC agreement yields 15–20% better blended rates at $10M+ combined.', active: hasWorkspace, color: '#9334E6' },
  ];

  const stackHTML = layers.map(l => `
    <div style="display:flex;align-items:flex-start;gap:14px;padding:12px 0;border-bottom:1px solid var(--surface-3);">
      <div style="width:12px;height:12px;border-radius:50%;background:${l.active ? l.color : 'var(--border)'};flex-shrink:0;margin-top:4px;"></div>
      <div style="flex:1;">
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap;">
          <span style="font-size:.88rem;font-weight:700;color:${l.active ? 'var(--text-primary)' : 'var(--text-muted)'};">${l.label}</span>
          <span style="font-size:.85rem;font-weight:800;color:${l.active ? l.color : 'var(--text-muted)'};">${l.value}</span>
        </div>
        <div style="font-size:.78rem;color:var(--text-secondary);margin-top:3px;">${l.note}</div>
        ${!l.active ? '<div style="font-size:.72rem;color:var(--text-muted);font-style:italic;margin-top:2px;">Not applicable to your current setup</div>' : ''}
      </div>
    </div>`).join('');

  const breakdown = buildDiscountFactors(s, tier, discount);

  // Spend-based CUDs moved to a direct-discount ("multiprice") billing model in
  // early 2026. Savings now land as discounted rates in billing data rather than
  // as separate credits, which changes how realized savings are measured.
  const multipriceNote = `<div class="alert alert-info" style="margin-top:14px;"><span class="alert-icon">🧾</span><div><strong>Spend-based CUD savings are now billed as direct discounts, not credits.</strong> Google completed the migration of spend-based CUDs to the multiprice model in early 2026. Eligible usage is billed at the discounted commitment rate directly, so the separate credit line that used to require reconciliation is gone and realized savings are visible in billing data immediately. Two practical consequences: any internal savings report or chargeback calculation still built on credit reconciliation is measuring something that no longer exists and will understate or double-count your discount, and when you ask Google to model CUD scenarios, insist the comparison is stated at effective discounted rates so it lines up with what your billing export will actually show.</div></div>`;

  return `
    <div style="margin-bottom:16px;">
      <div style="font-size:.85rem;font-weight:600;color:var(--text-secondary);margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px;">GCP's Unique Discount Stack</div>
      ${stackHTML}
      ${multipriceNote}
    </div>
    <div class="discount-estimate" style="margin-top:16px;">
      <div>
        <div class="de-range">${discount.lo}–${discount.hi}%</div>
        <div class="de-label">EA / PPA target (on top of CUDs)</div>
      </div>
      <div class="de-bar-wrap">
        <div class="de-bar-bg"><div class="de-bar-fill" style="width:${Math.min(discount.hi * 2, 100)}%"></div></div>
        <div class="de-note">Midpoint: <strong>${discount.midpoint}%</strong> · Floor: <strong>${discount.lo}%</strong> · Stretch: <strong>${discount.hi}%</strong></div>
      </div>
    </div>
    ${proxima ? `<div style="margin-top:10px;padding:10px 14px;background:rgba(26,115,232,.08);border:1px solid rgba(26,115,232,.25);border-radius:8px;font-size:.82rem;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
      <span style="font-weight:700;color:#1a73e8;">📊 Proxima Deal Data</span>
      <span style="color:var(--text-muted);">Based on <strong>${proxima.count} GCP deal${proxima.count !== 1 ? 's' : ''}</strong>${proxima.tierMatch ? ' at this spend tier' : ' across all tiers'}: observed avg <strong>${proxima.avg}%</strong>, range <strong>${proxima.lo}–${proxima.hi}%</strong></span>
    </div>` : ''}
    ${breakdown}`;
}

function buildDiscountFactors(s, tier, discount) {
  const rows = [];
  if (s.multicloud === 'evaluating' || s.switchingFrom === 'aws' || s.switchingFrom === 'azure') rows.push(['New workload win — Google\'s highest-priority deal type', '+5–12%', 'green']);
  else if (s.multicloud === 'multi-cloud') rows.push(['Multi-cloud positioning (credible competitive threat)', '+5–9%', 'green']);
  if (s.strategicPlans?.includes('ai-expansion')) rows.push(['Vertex AI / Gemini workload commitment (Google\'s top growth priority)', '+3–6%', 'green']);
  if (s.workspaceSpend !== 'none' && s.workspaceSpend) rows.push(['Google Workspace bundle (CASC combined agreement)', '+3–8%', 'green']);
  if (s.desiredTerm === '3yr') rows.push(['3-year commitment term', '+3–5%', 'green']);
  if (s.strategicPlans?.includes('migrate-to-gcp')) rows.push(['Migration commitment — new GCP footprint', '+2–5%', 'green']);
  if (s.growthRate === 'hypergrowth' || s.growthRate === 'fast') rows.push(['High-growth trajectory (future revenue)', '+1–3%', 'green']);
  if (s.spendGrowth === 'hypergrowth' || s.spendGrowth === 'fast') rows.push(['GCP consumption growing fast (expanding footprint)', '+1–3%', 'green']);
  else if (s.spendGrowth === 'declining') rows.push(['GCP consumption declining — weakens the growth argument', '−2–4%', 'red']);
  if (s.gcpTenure === '5plus') rows.push(['Long-tenured customer (switching cost is real to Google)', '+0–2%', 'green']);
  if (s.spotVmUsage === 'heavy' || s.spotVmUsage === 'moderate') rows.push(['Heavy Spot usage — less committed-eligible spend to bargain with', '−1–3%', 'red']);
  if (s.cudUtilization === 'over100') rows.push(['Exceeded prior CUD commitment (strong signal)', '+1–2%', 'green']);
  if (s.cudUtilization === 'under70') rows.push(['CUD underutilization — Google may resist higher discount', '−2–4%', 'red']);
  if (!rows.length) return '';
  return `<table style="width:100%;margin-top:16px;border-collapse:collapse;font-size:.82rem;">
    <thead><tr style="border-bottom:1px solid var(--border);"><th style="text-align:left;padding:6px 0;color:var(--text-secondary);font-weight:600;">Factor</th><th style="text-align:right;padding:6px 0;color:var(--text-secondary);font-weight:600;">Impact on EA Discount</th></tr></thead>
    <tbody>${rows.map(([label, val, color]) => `<tr style="border-bottom:1px solid var(--surface-3);"><td style="padding:7px 0;color:var(--text-primary);">${label}</td><td style="padding:7px 0;text-align:right;font-weight:700;color:var(--${color === 'red' ? 'danger' : 'success'})">${val}</td></tr>`).join('')}</tbody>
  </table>`;
}

// ─── Tactics ──────────────────────────────────────────────────────────────────
function buildTactics(s, tier) {
  const tactics = [];

  // Google's market hunger — the most unique GCP lever
  if (s.multicloud === 'gcp-only') {
    tactics.push({
      title: 'Create a Credible AWS or Azure Competitive Evaluation — Immediately',
      desc: 'GCP holds ~11% of enterprise cloud market share vs. AWS\'s 33% and Azure\'s 23%. Google\'s account teams have more internal latitude to discount and create bespoke terms precisely because of this gap. Enterprises that enter GCP negotiations with documented, specific alternative pricing from AWS or Azure achieve 8–14% better outcomes. Request formal pricing from AWS for 2–3 representative workloads before your first Google meeting.',
      impact: 'high',
    });
  } else if (s.multicloud === 'evaluating' || s.switchingFrom !== 'staying') {
    tactics.push({
      title: 'You\'re a New-Workload Win — Google\'s Highest-Value Deal Type',
      desc: 'If you\'re migrating workloads from AWS/Azure or moving off on-prem, you are Google\'s most coveted customer type. New-workload wins are how GCP grows market share, and Google\'s compensation model rewards them heavily. Be explicit about the specific workloads you\'re moving and the timeline. Request migration credits, custom EA pricing, and Premier Support inclusion as the price of your commitment to GCP.',
      impact: 'high',
    });
  } else {
    tactics.push({
      title: 'Use Documented AWS/Azure Pricing as Your Primary Lever',
      desc: 'Even as a committed GCP customer, getting formal competitive pricing from AWS or Azure for your top 2–3 workloads activates Google\'s competitive response playbook and unlocks discount authority above the standard field rep level. Present it matter-of-factly: "We\'ve received pricing from AWS for this workload — here\'s what they offered." Specificity makes the threat credible.',
      impact: 'high',
    });
  }

  if (s.flexCudFootprint === 'full-mix' || s.flexCudFootprint === 'vms-gke' || s.flexCudFootprint === 'vms-cloudrun') {
    tactics.push({
      title: 'Consolidate to a Single Flex CUD Across Your Compute Footprint',
      desc: 'Flex CUDs now cover GKE Autopilot, GKE Standard, Cloud Run, and Compute Engine VMs under a single commitment (expanded Sept 2025). Rather than negotiating separate resource CUDs per service, a single Flex CUD maximizes coverage across your entire eligible compute footprint, simplifies your commitment structure, and gives you a cleaner, larger number to use as leverage in your EA or PPA discussion with Google.',
      impact: 'high',
    });
  }
  if (s.casc === 'no-eligible') {
    tactics.push({
      title: 'Initiate a CASC Negotiation in This Cycle',
      desc: 'Your spend level qualifies for a Customer Annual Spend Commitment (CASC) — a Google EA structure that unlocks 3–7 percentage points of additional CUD discount above public rates. This is separate from and additive to your standard CUD discounts. Ask your Google account team to initiate a CASC conversation now. Customers who wait until the next renewal cycle miss a full year of incremental savings.',
      impact: 'high',
    });
  }
  if (s.casc === 'yes-active') {
    tactics.push({
      title: 'Reference Your CASC to Unlock Additional CUD Discount',
      desc: 'Your active CASC entitles you to negotiate 3–7pp of additional CUD discount above the public sleeve. Bring this up explicitly in any new commitment or CUD renewal discussion — don\'t assume your account team has applied it. Request the maximum negotiated rate in writing as part of your EA or PPA terms.',
      impact: 'high',
    });
  }
  // Vertex AI — Google's top growth priority
  if (s.useCases.includes('vertex-ai') || s.strategicPlans?.includes('ai-expansion')) {
    tactics.push({
      title: 'Leverage Your Vertex AI / Gemini Commitment for EA Improvement',
      desc: 'Google is aggressively competing for AI infrastructure share against AWS Bedrock and Azure OpenAI. Committing AI training and inference workloads to Vertex AI unlocks disproportionately large discounts because Google is subsidizing AI adoption. Explicitly tie your EA renewal to a Vertex AI consumption commitment. This also activates Google\'s Anthropic partnership — if you use Claude models, Vertex AI is the only way to access them at enterprise-grade SLAs.',
      impact: 'high',
    });
    tactics.push({
      title: 'Price Vertex AI as Its Own Line, Not Part of the Blended Rate',
      desc: 'AI meters are growing faster than anything else in most Google estates while receiving the least negotiation scrutiny, which is exactly the combination that leaves value on the table. Ask for service-specific Vertex AI pricing rather than accepting your blended PPA rate: inside a CUD, Vertex AI typically lands 18–32% below published rates, and Provisioned Throughput inside a CUD reaches 38–52% below standalone on-demand. Provisioned Throughput is where the gap is widest, so if any portion of your inference load is steady enough to reserve, model it separately. Get the flexibility and burn-down terms for AI consumption in writing — these are increasingly settled in side letters rather than the base agreement, which means they are negotiable but also easy to lose track of.',
      impact: 'high',
    });
    tactics.push({
      title: 'Route Gemini Enterprise Seats Through a Flexible Savings Plan, Not List',
      desc: 'Gemini Enterprise now has its own commitment vehicle, separate from Vertex AI CUDs: Flexible Savings Plans (FSPs) discount token costs 10% on a 1-year commitment and 20% on a 3-year commitment, with no minimum or maximum spend and month-to-month adjustment as usage grows. FSPs draw down against an existing Google Cloud EA, so they add to your total commitment rather than sitting outside it — fold projected Gemini Enterprise seat and agent-workload spend into your EA sizing rather than budgeting it separately at list. Also confirm the per-project spend caps and anomaly alerts Google ships alongside FSPs are configured before go-live; they are the main guardrail against an agent workload overrunning a fixed monthly commitment.',
      impact: 'medium',
    });
    tactics.push({
      title: 'Check Whether Your Gemini Enterprise Renewal Still Includes Code Assist',
      desc: 'Since September 17, 2026, new and renewing Gemini Enterprise Standard and Plus subscriptions bought online no longer include Gemini Code Assist. Existing subscriptions keep it until the current term ends, and Google directs customers who want it back to sales. If developers rely on Code Assist through a Gemini Enterprise seat today, the renewal quietly removes it and a separate Code Assist quote will follow. Inventory Code Assist usage before the renewal date, and negotiate it back into the Gemini Enterprise price or the EA rather than accepting it as a new line at list.',
      impact: 'medium',
    });
  } else {
    tactics.push({
      title: 'Commit to a Vertex AI Pilot to Unlock Additional Discount Authority',
      desc: 'You don\'t need existing AI workloads to use this lever. Offering to pilot Vertex AI or Google\'s Gemini models on one use case as part of your EA renewal activates Google\'s AI adoption incentive budget. A commitment to spend $50K–$100K on Vertex AI has been observed to improve EA discount rates by 3–6 percentage points — a high-ROI bargaining chip even if the pilot is exploratory.',
      impact: 'high',
    });
  }

  // Optimize before committing — GCP-specific order of operations
  if (s.optimizationStatus === 'unoptimized' || s.optimizationStatus === 'partially') {
    tactics.push({
      title: 'Optimize and Shift to Spot VMs Before Setting Your CUD Commitment Level',
      desc: 'GCP rewards a specific order of operations: (1) shift all fault-tolerant workloads to Spot VMs first — saving 60–91% on those instances, (2) run GCP Recommender API to right-size remaining VMs, (3) establish your clean, optimized baseline, then (4) negotiate CUDs and EA on that baseline. Committing before optimizing means committing to inflated spend. The baseline you commit to becomes your floor for the entire term.',
      impact: 'high',
    });
  }

  // Workspace bundle
  if (s.googleProducts.includes('workspace') || s.strategicPlans?.includes('workspace-expand')) {
    tactics.push({
      title: 'Bundle GCP and Google Workspace into a Single CASC Agreement',
      desc: 'At $10M+ combined GCP + Workspace spend, Google offers Cross-Account Spend Commitment (CASC) cross-line discounts. Organizations consolidating both products into one commercial agreement consistently report 15–20% better blended rates than negotiating them separately. Time your Workspace renewal to coincide with your GCP EA and table a combined total spend commitment. This is the most under-used bundling lever in GCP negotiations.',
      impact: 'high',
    });
  }

  // CUD structure
  if (s.contractType === 'payg' || s.contractType === 'cud-resource' || !s.currentDiscounts.includes('cud-spend')) {
    tactics.push({
      title: 'Stack Spend-Based CUDs on Top of Resource CUDs for Maximum Coverage',
      desc: 'Resource-based CUDs (committing to specific vCPU/memory) offer 28–55% off on-demand for predictable workloads. Spend-based CUDs (committing to hourly spend on a product family) offer ~20% for 1-year and ~40% for 3-year with more flexibility. The optimal strategy: use resource CUDs for your stable production core (maximum discount), layer spend-based CUDs on top for the variable remainder. Both stack on top of SUDs and EA pricing — confirm this explicitly in your agreement.',
      impact: 'high',
    });
  }

  // Timing
  if (s.renewalTimeline === '6-12mo' || s.renewalTimeline === '12plusmo') {
    tactics.push({
      title: 'Time Your EA Negotiation to Google\'s Fiscal Quarter-End',
      desc: 'Google\'s fiscal year ends December 31. Quarter-end dates: March 31, June 30, September 30, December 31. Account executives carry quarterly quotas and have additional deal-close incentives in the final weeks of Q4 (December) — Google\'s most important quarter. Negotiations started 4–6 weeks before quarter-end and closed in the final week consistently produce better credits, deeper EA discounts, and faster approvals.',
      impact: 'high',
    });
  } else if (s.renewalTimeline === 'within-1mo' || s.renewalTimeline === '1-3mo') {
    tactics.push({
      title: 'Request a Short-Term Extension to Negotiate Without Deadline Pressure',
      desc: 'You\'re in a tight window. Request a 60–90 day continuation of current terms before anything lapses. Google is generally willing to grant this for customers with a signed EA or active PPA. Use that window to optimize your infrastructure, get competitive quotes from AWS/Azure, and frame a proper EA negotiation — don\'t sign a multi-year commitment under time pressure.',
      impact: 'high',
    });
  }

  // BigQuery flat-rate
  if (s.useCases.includes('bigquery') && s.bigqueryPricing === 'on-demand') {
    tactics.push({
      title: 'Negotiate BigQuery Flat-Rate Pricing into Your EA',
      desc: 'BigQuery on-demand pricing (per TB scanned) can become unpredictable at scale. BigQuery flat-rate pricing (reserved slots) provides cost predictability and often better economics at high query volumes. Negotiate flat-rate slot reservations as part of your EA rather than purchasing them post-signing — Google will often bundle favorable slot pricing or include slot credits as a concession in a larger EA negotiation.',
      impact: 'medium',
    });
  }

  // Free egress TCO argument
  if (tier >= 2) {
    tactics.push({
      title: 'Use GCP\'s Free Intra-Region Egress as a TCO Argument for Deeper Discounts',
      desc: 'Google provides free egress between GCP services within the same region (Cloud Storage → BigQuery, for example). For data-heavy architectures, this is a 5–15% total cost advantage over equivalent AWS or Azure patterns. Build this into your competitive TCO analysis when presenting to Google — it demonstrates you\'ve done rigorous analysis and strengthens your credibility as a strategic customer who understands pricing deeply. Google account teams respond well to customers who present data-backed TCO models.',
      impact: 'medium',
    });
  }

  // Migration credits
  if (s.strategicPlans?.includes('migrate-to-gcp') || s.strategicPlans?.includes('onprem-exit') || s.switchingFrom !== 'staying') {
    tactics.push({
      title: 'Request GCP Migration Credits and PSO Hours for Documented Migration Plans',
      desc: 'Google offers migration credits and funded Professional Services (PSO) hours for customers migrating from AWS, Azure, or on-premises environments. Present a documented migration roadmap with specific workloads, timelines, and estimated GCP spend. The more specific and credible the plan, the larger the migration credit pool Google will allocate. Ask for credits separately from your EA discount — they should not be counted as part of your negotiated rate.',
      impact: 'medium',
    });
  }

  // Marketplace
  if (s.strategicPlans?.includes('marketplace')) {
    tactics.push({
      title: 'Route ISV Software Purchases Through GCP Marketplace to Burn Down Commitments',
      desc: 'GCP Marketplace purchases can count toward your committed spend, broadening what satisfies your CUD or EA floor. Identify ISV tools your team already buys (security, data, observability) that are available on GCP Marketplace and negotiate to route those purchases through it. This gives you more flexibility in meeting your commitment and gives Google additional platform stickiness — a win-win to propose.',
      impact: 'medium',
    });
  }

  // Support
  if (s.supportTier !== 'premium') {
    tactics.push({
      title: 'Negotiate Premier Support Inclusion or Discount as Part of EA',
      desc: 'Google\'s Premium Support (required for most production EA customers) includes a Technical Account Manager, 15-minute critical issue response, and architecture review services. Negotiate Premier Support inclusion or a 20–30% discount on the Premium Support rate as part of your EA package. At tier 3 or above this is a reasonable ask that Google regularly includes for strategic customers.',
      impact: 'medium',
    });
  }

  // Commit at conservative level
  if (tier >= 2) {
    tactics.push({
      title: 'Commit at 80–85% of Projected Spend with Ramp Provisions',
      desc: 'Never commit to 100% of projected spend. Negotiate a ramp structure where commitment grows 15–20% per year rather than starting at the full 3-year level. This protects against over-commitment shortfalls while demonstrating credible, growing intent. Google will counter for higher — accept a moderate ramp that lands at 85% of your moderate-case projection.',
      impact: 'medium',
    });
  }

  // Growth narrative — parity with the AWS and Azure planners
  if (s.growthRate === 'hypergrowth' || s.growthRate === 'fast' || s.spendGrowth === 'hypergrowth' || s.spendGrowth === 'fast') {
    tactics.push({
      title: 'Build a Growth Narrative with Documented Projections',
      desc: 'Google discounts today\'s spend but underwrites tomorrow\'s, and it is hungrier for growth than either AWS or Microsoft. Bring a three-year GCP projection backed by business data — product roadmap, migration schedule, AI workload plans — and commit at a level that reflects where you are heading. A documented projection makes a higher commitment tier defensible internally as well as to Google, and growth stories carry more weight here than at the other two hyperscalers.',
      impact: 'medium',
    });
  } else if (s.spendGrowth === 'declining') {
    tactics.push({
      title: 'Commit Conservatively Against a Declining Baseline',
      desc: 'Your GCP consumption is falling, which means a commitment sized on historical spend will be underconsumed — and shortfall exposure is yours, not Google\'s. Size the commit to a defensible floor rather than last year\'s run rate. Be direct with the account team about the trajectory: Google would rather hold a smaller commitment it can renew than book a larger one that ends in a shortfall dispute.',
      impact: 'high',
    });
  }

  // Spot usage changes what is actually available to commit
  if (s.spotVmUsage === 'heavy' || s.spotVmUsage === 'moderate') {
    tactics.push({
      title: 'Exclude Spot Capacity From Your Committed Baseline',
      desc: `You are running ${s.spotVmUsage === 'heavy' ? 'more than half' : '25–50%'} of eligible workloads on Spot. Spot spend is already deeply discounted and is not a sensible base for a CUD or spend commitment. Calculate your committed-use baseline on on-demand and reserved consumption only — if Google sizes the commitment on total compute spend including Spot, you will be committing to a number your steady-state workload cannot absorb. Make the exclusion explicit in the term sheet rather than assumed.`,
      impact: 'high',
    });
  } else if (s.spotVmUsage === 'none' && (s.workloadType === 'batch' || s.workloadType === 'dev-heavy')) {
    tactics.push({
      title: 'Model Spot VMs Before Committing Batch Workloads',
      desc: 'Your estate is batch or dev/test heavy but runs no Spot capacity. Spot pricing on GCP is substantially below on-demand for interruption-tolerant work, and moving eligible workloads there lowers the baseline you need to commit to at all. Model this before the negotiation, not after — committing to spend you could have avoided is the most expensive kind of commitment.',
      impact: 'medium',
    });
  }

  // Public sector — mirrors the AWS planner's FedRAMP treatment
  if ((s.compliance || []).includes('fedramp') || s.industry === 'government') {
    tactics.push({
      title: 'Use Assured Workloads Requirements as Differentiation',
      desc: 'Your regulatory profile makes you a strategically valuable account. Google has invested heavily in Assured Workloads and public-sector compliance, and retaining a reference-able regulated customer matters to them beyond your spend. Use it: request funded compliance advisory hours, accelerated authorization support, and enhanced SLAs as part of the agreement rather than as separate paid engagements.',
      impact: 'medium',
    });
  }

  tactics.push({
    title: 'Request Innovation Credits for New Service Exploration',
    desc: 'Google often includes "innovation" or "transformation" credits — a pool of GCP credits earmarked for experimenting with new services. These have real dollar value and are additive to your EA discount. Ask specifically for a credit pool for Vertex AI, Looker, or other services you\'re evaluating. These credits are low-cost concessions for Google and high-value for customers exploring new services.',
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
      phase: 'P1', when: isUrgent ? 'Week 1 (Immediate)' : 'Months 6–9 Before Renewal',
      title: 'Optimize Estate Before Setting Commitment Baseline',
      desc: 'GCP uniquely rewards doing this before committing. This phase is non-negotiable.',
      tasks: [
        'Run GCP Recommender API and Cloud Advisor — right-size all instances, identify idle resources',
        'Shift all fault-tolerant batch/dev workloads to Spot VMs (60–91% cost reduction)',
        'Confirm Sustained Use Discounts are active on all eligible Compute Engine VMs',
        'Pull 12-month GCP cost breakdown by service, project, and region',
        'Model 3-year spend at conservative, moderate, and aggressive scenarios on optimized baseline',
      ],
    },
    {
      phase: 'P2', when: isUrgent ? 'Week 1–2' : 'Months 4–6 Before Renewal',
      title: 'Competitive Intelligence & Bundle Strategy',
      desc: 'Define your leverage before any Google contact. This is where most negotiating power is built.',
      tasks: [
        'Request formal pricing from AWS and/or Azure for your top 3 workloads (even if you\'re not moving)',
        'Build a TCO comparison including GCP\'s free intra-region egress advantage',
        s.googleProducts.includes('workspace') ? 'Time your Google Workspace renewal to coincide — plan a combined CASC negotiation' : 'Assess whether Google Workspace is a viable bundling lever',
        'Identify all Vertex AI or AI/ML workloads as high-leverage commitment items',
        'Align internally: CTO, CFO, and Procurement aligned on goals before Google outreach',
      ],
    },
    {
      phase: 'P3', when: isUrgent ? 'Week 2–3' : 'Months 2–4 Before Renewal',
      title: 'Strategic Outreach & First Proposal',
      desc: 'Lead with your AI roadmap and total Google relationship — not your current GCP spend.',
      tasks: [
        'Contact your Google Customer Engineer or Account Executive — request a "cloud strategy review"',
        'Present your 3-year roadmap: AI/ML plans, data platform growth, migration workloads',
        s.multicloud !== 'gcp-only' ? 'Reference your multi-cloud position and the workloads you\'re evaluating consolidating on GCP' : 'Reference competitive pricing you\'ve received from AWS/Azure',
        'Ask Google to model: (a) CUD-only pricing, (b) EA pricing stacked on CUDs, (c) combined GCP + Workspace bundle',
        'Request their first written proposal — do not commit to anything verbally',
      ],
    },
    {
      phase: 'P4', when: isUrgent ? 'Week 3–4' : '4–6 Weeks Before Renewal',
      title: 'Full Negotiation — All Terms',
      desc: 'Negotiate every element: EA discount, CUD structure, credits, support, ramp, shortfall, and contractual terms.',
      tasks: [
        'Counter Google\'s first EA discount offer — anchor 15–20 points above their opening bid',
        'Negotiate CUD structure: resource CUDs for stable core + spend CUDs for variable workloads',
        'Request migration credits, innovation credits, and PSO hours as separate add-ons (not in lieu of discount)',
        'Push for ramp provisions: step-up commitment schedule, shortfall roll-forward not cash true-up',
        'Escalate to Google director/VP level if field team hits a ceiling — executive engagement unlocks additional authority',
      ],
    },
    {
      phase: 'P5', when: isUrgent ? 'Week 4–5' : '1–2 Weeks Before Close',
      title: 'Legal Review & Close',
      desc: 'Verify every concession is in the signed agreement. Verbal commitments from Google account teams are not enforceable.',
      tasks: [
        'Have legal review the EA for CUD stacking language, shortfall terms, and auto-renewal clauses',
        'Confirm all negotiated credits, PSO hours, and support terms are in the signed order form',
        'Set up quarterly business reviews with your Google Customer Success Engineer post-signing',
        'Establish internal GCP cost governance: monthly spend tracking vs. commitment, CUD utilization dashboard',
        'Calendar a pre-renewal alert 6 months before next expiry — Google negotiations require longer lead time than AWS or Azure',
      ],
    },
  ];
}

// ─── Concessions ──────────────────────────────────────────────────────────────
function buildConcessions(s, tier) {
  const items = [];
  items.push({ icon: '📈', title: 'Ramp Commitment Schedule', desc: 'Step-up commitment growing 15–20%/yr rather than starting at full 3-year level. Protects against over-commitment.', priority: 'must' });
  items.push({ icon: '🔄', title: 'Shortfall Roll-Forward', desc: 'Unused CUD/EA commitment rolls to next period rather than triggering a cash true-up.', priority: 'must' });
  if (s.strategicPlans?.includes('migrate-to-gcp') || s.switchingFrom !== 'staying') {
    items.push({ icon: '✈️', title: 'Migration Credits', desc: 'GCP credits to offset lift-and-shift costs. Additive to EA discount — negotiate separately.', priority: 'must' });
  }
  if (s.useCases.includes('vertex-ai') || s.strategicPlans?.includes('ai-expansion')) {
    items.push({ icon: '🤖', title: 'Vertex AI / Gemini Credits', desc: 'Innovation credits specifically for Vertex AI and Gemini workload adoption.', priority: 'must' });
  }
  items.push({ icon: '🌐', title: 'CUD + EA Stacking Confirmation', desc: 'Written confirmation that EA discount applies on top of (not instead of) CUD pricing.', priority: 'must' });
  if ((s.compliance || []).includes('hipaa') || (s.compliance || []).includes('pci') || (s.compliance || []).includes('fedramp')) {
    items.push({ icon: '🛡️', title: 'Compliance Acceleration Support', desc: 'Funded compliance advisory hours and access to Google Assured Workloads specialists.', priority: 'should' });
  }
  if (s.supportTier !== 'premium') {
    items.push({ icon: '🎧', title: 'Premier Support Inclusion / Discount', desc: 'Include or discount Premium Support with a named TAM in the EA package.', priority: tier >= 3 ? 'must' : 'should' });
  }
  if (s.googleProducts.includes('workspace') || s.strategicPlans?.includes('workspace-expand')) {
    items.push({ icon: '📊', title: 'CASC / Workspace Bundle Discount', desc: 'Combined GCP + Workspace agreement for 15–20% better blended rates.', priority: 'should' });
  }
  items.push({ icon: '💡', title: 'Innovation / Transformation Credits', desc: 'Credit pool for exploring new GCP services — Vertex AI, Looker, etc. Low-cost concession for Google.', priority: 'should' });
  items.push({ icon: '👩‍💻', title: 'PSO / Professional Services Hours', desc: 'Funded Google Professional Services hours for architecture reviews, migrations, or AI advisory.', priority: tier >= 3 ? 'should' : 'nice' });
  if (s.useCases.includes('bigquery')) {
    items.push({ icon: '📊', title: 'BigQuery Flat-Rate Slots', desc: 'Bundled BigQuery slot reservations or credits negotiated as part of EA rather than post-signing.', priority: 'should' });
  }
  items.push({ icon: '🎓', title: 'Google Cloud Skills Boost Credits', desc: 'Training credits and certification vouchers for your engineering team.', priority: 'nice' });
  items.push({ icon: '🔁', title: 'No Auto-Renewal Lock-in', desc: 'Explicit 90-day renewal notification window; no automatic rollover at current or worse terms.', priority: 'should' });
  if (tier >= 4) {
    items.push({ icon: '🏆', title: 'Named Google Executive Sponsor', desc: 'Director or VP-level Google sponsor with escalation path for contractual issues.', priority: 'should' });
  }
  items.push({ icon: '📌', title: 'Pricing Schedule Freeze', desc: "Google agreements often reference the live SKU catalog and pricing pages. Pin those references to a dated snapshot so rates, and the definitions behind them, cannot change mid-term without a signed amendment.", priority: 'must' });
  items.push({ icon: '📉', title: 'Price-Down (MFN) Trigger', desc: "If Google reduces published pricing on any SKU you consume, the lower rate applies automatically within 30 days with your CUD and agreement discounts still stacked on top.", priority: 'should' });
  return items;
}

// ─── Risks ────────────────────────────────────────────────────────────────────
function buildRisks(s, tier) {
  const risks = [];
  if (s.renewalTimeline === 'within-1mo') risks.push({ level: 'high', title: 'Negotiating Under Deadline', desc: 'Request a 60–90 day extension before signing anything. Google is generally willing to extend for established customers.' });
  if (s.multicloud === 'gcp-only') risks.push({ level: 'high', title: 'No Competitive Leverage', desc: 'All-in on GCP with no alternative. Get AWS/Azure pricing for 2–3 workloads before negotiating — it\'s your strongest lever.' });
  if (s.cudUtilization === 'under70') risks.push({ level: 'high', title: 'CUD Underutilization', desc: 'Prior CUD shortfall means you over-committed. Optimize first, commit conservatively, and negotiate ramp provisions.' });
  if (s.optimizationStatus === 'unoptimized') risks.push({ level: 'medium', title: 'Inflated Commit Baseline', desc: 'Committing before optimizing locks in waste. Run Recommender API and shift to Spot VMs before setting commitment levels.' });
  if (s.contractType === 'payg' && tier >= 2) risks.push({ level: 'medium', title: 'Missing All Discount Layers', desc: 'At your spend level, PAYG with no CUDs means leaving 30–60% savings on the table. CUDs and an EA are priority actions.' });
  risks.push({ level: 'medium', title: 'CUD + EA Stacking Not Guaranteed', desc: 'Some Google agreements don\'t explicitly confirm EA discounts stack on CUDs. Confirm this in writing — the omission can cost millions.' });
  risks.push({ level: 'medium', title: 'Auto-Renewal Clauses', desc: 'EA and CUDs can auto-renew at current or worse terms. Negotiate explicit 90-day renewal notification windows.' });
  if (s.desiredTerm === '3yr') risks.push({ level: 'medium', title: '3-Year Lock-in Risk', desc: '3-year CUDs offer the best rates but are inflexible. Negotiate mid-term review rights and service substitution options.' });
  if (s.spendGrowth === 'declining') {
    risks.push({ level: 'medium', title: 'Declining GCP Consumption', desc: 'Falling consumption materially weakens your position — Google allocates its best commercial terms to accounts that are growing, and its competitive aggression is aimed at winning new workloads rather than defending shrinking ones. Size the commitment to a realistic floor and steer the conversation toward what you are adding rather than what you are losing.' });
  }
  if ((s.compliance || []).includes('hipaa') || (s.compliance || []).includes('fedramp')) {
    risks.push({ level: 'low', title: 'Compliance-Specific Contract Language', desc: 'Regulatory commitments should be written into BAAs and Assured Workloads addenda as part of the main agreement. Left to a separate workstream they routinely reappear later as paid add-ons.' });
  }
  risks.push({ level: 'low', title: 'Account Team Turnover', desc: 'Google account teams turn over. All commitments must be contractually documented — not just in emails from your CSE.' });
  if (tier <= 1) risks.push({ level: 'low', title: 'Below EA Threshold', desc: 'Formal EA negotiations typically start at $1M+ spend. Focus on CUDs now; build growth narrative for next cycle.' });
  return risks;
}

// ─── Questions ────────────────────────────────────────────────────────────────
function buildQuestions(s, tier) {
  const qs = [
    'What EA / Private Pricing discount can you offer on top of our existing CUD pricing — not instead of it?',
    'Can you provide written confirmation in the agreement that our resource-based and spend-based CUDs stack on top of the EA discount?',
    'What is the ramp structure you can offer — can our commitment grow over the 3-year term rather than starting at the full level?',
    'If we miss our annual commitment, how is the shortfall treated — cash true-up or roll-forward to the next period?',
  ];
  if (s.googleProducts.includes('workspace')) qs.push('What combined discount can you offer if we negotiate GCP and Google Workspace as a single CASC commitment?');
  if (s.useCases.includes('vertex-ai') || s.strategicPlans?.includes('ai-expansion')) {
    qs.push('We\'re expanding our Vertex AI workloads — what additional EA improvement or credits does that commitment unlock?');
    qs.push('What service-specific Vertex AI pricing can you offer inside a CUD, and what does Provisioned Throughput look like against standalone on-demand for our steady inference load?');
    qs.push('What are the flexibility and burn-down terms for Vertex AI consumption against our commitment, and will those sit in the agreement itself rather than a side letter?');
    qs.push('If we adopt Gemini Enterprise seats or agent workloads, does a Flexible Savings Plan draw down against our existing EA commitment, and what 1-year vs. 3-year discount can you confirm in writing?');
  }
  qs.push('Now that spend-based CUDs bill as direct discounts rather than credits, can you model our scenarios at effective discounted rates so they reconcile against our billing export?');
  if (s.useCases.includes('bigquery')) qs.push('Can BigQuery flat-rate slot pricing be included in our EA at a negotiated rate rather than purchased post-signing?');
  qs.push('What migration credits and PSO hours are available for our migration plan, and are those additive to our EA discount or counted against it?');
  if (s.multicloud !== 'gcp-only') qs.push('We have workloads on AWS/Azure — what EA pricing would make consolidating those onto GCP financially compelling over 3 years?');
  qs.push('What does Premier Support cost as part of this EA, and is TAM coverage included?');
  qs.push('What innovation or transformation credits can you include for us to explore Vertex AI, Looker, and other new services?');
  qs.push('What happens to our CUDs at renewal — do they auto-renew at current rates, and do we have the right to renegotiate EA terms at each annual anniversary?');
  return qs.slice(0, 10);
}

// ─── Alerts ───────────────────────────────────────────────────────────────────
function buildAlerts(s, tier) {
  const alerts = [];
  if (s.renewalTimeline === 'within-1mo') alerts.push({ type: 'danger', icon: '🚨', text: '<strong>Urgent: Less than 30 days to expiry.</strong> Request a 60–90 day extension of current terms immediately before anything lapses. Google is generally willing to grant this — it protects both parties and gives you time to negotiate properly.' });
  if (s.contractType === 'payg' && tier >= 2) alerts.push({ type: 'danger', icon: '💸', text: '<strong>You\'re on PAYG at a spend level where you\'re leaving 30–60% on the table.</strong> At your spend level, resource-based CUDs alone would save 28–55% on eligible compute — before any EA negotiation. This should be your first action regardless of negotiation timing.' });
  if (s.optimizationStatus === 'unoptimized' && tier >= 2) alerts.push({ type: 'warning', icon: '⚙️', text: '<strong>Optimize Before You Commit.</strong> Unlike AWS or Azure, GCP\'s optimal order of operations is: (1) shift to Spot VMs, (2) right-size, (3) let SUDs accumulate, then (4) commit. Skipping to step 4 locks inflated spend into a multi-year obligation.' });
  if (s.multicloud === 'gcp-only' && tier >= 2) alerts.push({ type: 'warning', icon: '⚡', text: '<strong>No Competitive Leverage.</strong> GCP holds only ~11% of enterprise cloud market share — Google\'s account teams have significant discount authority, but only when they believe you might actually consider an alternative. Get AWS or Azure pricing before your first meeting.' });
  if (!s.currentDiscounts.includes('sud') && (s.useCases.includes('compute') || s.useCases.includes('gke'))) alerts.push({ type: 'info', icon: 'ℹ️', text: '<strong>Are Sustained Use Discounts Active?</strong> SUDs apply automatically to Compute Engine VMs running &gt;25% of a billing month — no action required. Verify they are applying in your billing console. If not, check your VM configuration (custom machine types, preemptible, or certain committed VMs may not qualify).' });
  if (s.googleProducts.includes('workspace') && s.workspaceSpend !== 'none') alerts.push({ type: 'success', icon: '🟢', text: '<strong>Workspace Bundling Opportunity Detected.</strong> Your Google Workspace spend is a significant negotiating asset. Time your Workspace renewal to coincide with this GCP negotiation and request a combined CASC agreement — customers consistently report 15–20% better blended rates vs. negotiating separately.' });
  if (s.useCases.includes('vertex-ai') || s.strategicPlans?.includes('ai-expansion')) {
    alerts.push({ type: 'success', icon: '🤖', text: '<strong>Vertex AI Is Your Most Under-Negotiated Line Item.</strong> AI meters grow faster than anything else in most Google estates while getting the least scrutiny at the table. Inside a CUD, Vertex AI typically lands 18–32% below published rates, and Provisioned Throughput inside a CUD reaches 38–52% below standalone on-demand — so if any part of your inference load is steady enough to reserve, model it separately rather than accepting your blended PPA rate. Ask for the flexibility and burn-down terms in the agreement itself; these are increasingly settled in side letters, which makes them negotiable but easy to lose.' });
  }
  if (s.currentDiscounts.includes('cud-spend') || s.contractType === 'cud-spend' || s.contractType === 'cud-both') {
    alerts.push({ type: 'info', icon: '🧾', text: '<strong>Spend-Based CUD Billing Changed — Check Your Savings Math.</strong> Google finished migrating spend-based CUDs to a direct-discount (multiprice) model in early 2026. Eligible usage is billed at the discounted rate rather than generating a separate credit to reconcile, so realized savings now appear directly in billing data. Any internal savings report, chargeback split, or CUD dashboard still written against credit reconciliation is measuring something that no longer exists — verify yours before using its numbers to size a new commitment.' });
  }
  if (s.chargebackIsolation === 'project-scope') {
    alerts.push({ type: 'danger', icon: '🚨', text: '<strong>CUD Scope Change Affects Your Chargeback Model.</strong> As of June 16, 2026, GCP changed the default CUD sharing scope for new billing accounts to billing-account level — meaning resource-based CUDs now share automatically across all projects. If you are using project-scoped CUDs for internal cost chargeback (each team billed by project), your new CUD commitments may apply across projects you didn\'t intend to subsidize. Verify your billing account\'s CUD sharing settings before signing any new commitments, and consider creating separate billing accounts per team if strict project-level isolation is required.' });
  }
  if (s.chargebackIsolation === 'planning') {
    alerts.push({ type: 'warning', icon: '⚠️', text: '<strong>Review CUD Scope Before Implementing Chargeback.</strong> GCP now defaults new billing accounts to billing-account-level CUD sharing (changed June 2026). If you plan to use project-level chargeback, structure your billing accounts and CUD scope accordingly before committing — retrofitting after the fact requires restructuring active commitments.' });
  }
  if (s.flexCudFootprint === 'full-mix' || s.flexCudFootprint === 'vms-gke' || s.flexCudFootprint === 'vms-cloudrun') {
    alerts.push({ type: 'success', icon: '🟢', text: '<strong>Flex CUD Consolidation Opportunity.</strong> Your mixed compute footprint (VMs + GKE/Cloud Run) qualifies for a single Flex CUD that covers all eligible spend. Flex CUDs were expanded in 2025 to include GKE Autopilot and Cloud Run — rather than negotiating separate commitments per service, consolidate into one Flex CUD to maximize coverage and simplify your commitment structure.' });
  }
  if (s.casc === 'no-eligible') {
    alerts.push({ type: 'info', icon: 'ℹ️', text: '<strong>CASC Qualification Opportunity.</strong> Your spend level likely qualifies for a Customer Annual Spend Commitment (CASC). Enterprise customers with a CASC can negotiate an additional 3–7 percentage points of CUD discount outside the public sleeve — this is separate from and additive to standard CUD discounts. Ask your Google account team to initiate a CASC discussion in this negotiation cycle.' });
  }
  if (s.casc === 'yes-active') {
    alerts.push({ type: 'success', icon: '🟢', text: '<strong>CASC in Place — Maximize It.</strong> Your active CASC entitles you to negotiate additional CUD discounts (3–7pp above public rates). Ensure your account team has applied this in your current CUD pricing, and reference it explicitly when discussing any new commitment or renewal.' });
  }
  return alerts;
}

// ─── Sample output ──────────────────────────────────────────────────────────
// A fixed, illustrative client profile so advisors can show what the planner
// produces without filling in the form. Kept deliberately consistent across the
// AWS, Azure, GCP, and Salesforce planners.
const SAMPLE_PROFILE = "Mid-market SaaS company · $10M–$25M annual GCP spend";
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
  "gcpTenure": "3-5",
  "contractType": "cud-both",
  "googleProducts": [
    "workspace"
  ],
  "annualSpend": "10m-25m",
  "workspaceSpend": "500k-2m",
  "cudUtilization": "85-100",
  "chargebackIsolation": "billing-account",
  "flexCudFootprint": "vms-gke",
  "casc": "no-eligible",
  "currentDiscounts": [
    "sud",
    "cud-resource"
  ],
  "supportTier": "enhanced",
  "useCases": [
    "compute",
    "gke",
    "bigquery",
    "databases"
  ],
  "spotVmUsage": "some",
  "bigqueryPricing": "on-demand",
  "multicloud": "gcp-primary",
  "strategicPlans": [
    "data-platform"
  ],
  "switchingFrom": "staying"
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
