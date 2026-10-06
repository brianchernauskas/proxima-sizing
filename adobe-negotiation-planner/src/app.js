'use strict';

/* ═══════════════════════════════════════════════════════════════════════════
   Proxima — Adobe Renewal Negotiation Planner

   MODEL NOTE
   Adobe negotiation differs structurally from both cloud infrastructure and
   Salesforce:
     • Agreement type decides what is negotiable. VIP / VIP Marketplace is a
       published price list with volume levels; ETLA and Experience Cloud
       agreements are negotiated. Moving between them is itself a lever.
     • Creative and Document Cloud spend is named-user licensing, so the two
       largest recoverable costs are idle seats and Creative Cloud Pro seats
       assigned to people who use one or two apps.
     • Experience Cloud spend is metered against contracted metrics (profiles,
       server calls, page views), so over- and under-buying capacity matters
       more than seat counts.
     • Adobe's fiscal year ends on the Friday closest to November 30, so
       September–November is the quota-pressure window.
   The engine models a renewal increase outlook, a discount-off-list target,
   and a right-sizing estimate. An optional M&A module adds transaction-
   specific implications when the user switches it on.

   Ranges are directional estimates drawn from publicly reported procurement
   practice. Adobe publishes no ETLA discount or renewal increase data.
   ═══════════════════════════════════════════════════════════════════════════ */

// ─── State ───────────────────────────────────────────────────────────────────
const state = {};
let currentStep = 1;

// ─── Navigation ──────────────────────────────────────────────────────────────
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

// ─── M&A toggle ──────────────────────────────────────────────────────────────
const mnaCheckbox = document.getElementById('mna-enabled');
function syncMnaPanel() {
  document.getElementById('mna-panel').hidden = !mnaCheckbox.checked;
  document.getElementById('mna-toggle').classList.toggle('on', mnaCheckbox.checked);
}
mnaCheckbox.addEventListener('change', syncMnaPanel);

// ─── Validation ───────────────────────────────────────────────────────────────
function validateStep(step) {
  const requiredSelects = {
    1: ['annual-spend', 'agreement-type', 'headcount-trajectory', 'renewal-month', 'renewal-timeline', 'notice-status'],
    2: ['license-utilization', 'app-fit', 'adoption-health'],
    3: ['relationship-quality'],
  };
  const requiredCards = { 1: ['company-size'], 3: ['alternative'] };
  // The M&A detail fields are only required once the module is switched on.
  if (step === 3 && mnaCheckbox.checked) {
    requiredSelects[3].push('mna-stage', 'mna-user-impact');
    requiredCards[3].push('mna-type');
  }

  let ok = true;
  (requiredSelects[step] || []).forEach(id => {
    const el = document.getElementById(id);
    if (el && el.tagName === 'SELECT' && !el.value) {
      el.style.borderColor = 'var(--danger)';
      el.addEventListener('change', () => { el.style.borderColor = ''; }, { once: true });
      ok = false;
    }
  });
  (requiredCards[step] || []).forEach(id => {
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
const checked = id => [...document.querySelectorAll(`#${id} input:checked`)].map(i => i.value);

function collectStep(step) {
  if (step === 1) {
    state.companySize = document.querySelector('#company-size .selected')?.dataset.value;
    state.annualSpend = document.getElementById('annual-spend').value;
    state.agreementType = document.getElementById('agreement-type').value;
    state.purchaseChannel = document.getElementById('purchase-channel').value;
    state.headcountTrajectory = document.getElementById('headcount-trajectory').value;
    state.renewalMonth = document.getElementById('renewal-month').value;
    state.renewalTimeline = document.getElementById('renewal-timeline').value;
    state.noticeStatus = document.getElementById('notice-status').value;
    state.priceProtection = document.getElementById('price-protection').value;
    state.desiredTerm = document.getElementById('desired-term').value;
  }
  if (step === 2) {
    state.products = [...document.querySelectorAll('#products .selected')].map(c => c.dataset.value);
    state.licenseUtilization = document.getElementById('license-utilization').value;
    state.appFit = document.getElementById('app-fit').value;
    state.trueupPosition = document.getElementById('trueup-position').value;
    state.metricPosition = document.getElementById('metric-position').value;
    state.adoptionHealth = document.getElementById('adoption-health').value;
    state.costPressures = checked('cost-pressures');
  }
  if (step === 3) {
    state.alternative = document.querySelector('#alternative .selected')?.dataset.value;
    state.alternativeVendor = document.getElementById('alternative-vendor').value;
    state.relationshipQuality = document.getElementById('relationship-quality').value;
    state.previousNegotiation = document.getElementById('previous-negotiation').value;
    state.internalChampion = document.getElementById('internal-champion').value;
    state.changeEvents = checked('change-events');
    state.mnaEnabled = mnaCheckbox.checked;
    if (state.mnaEnabled) {
      state.mnaType = document.querySelector('#mna-type .selected')?.dataset.value;
      state.mnaStage = document.getElementById('mna-stage').value;
      state.mnaUserImpact = document.getElementById('mna-user-impact').value;
      state.mnaCounterparty = document.getElementById('mna-counterparty').value;
      state.mnaAssignment = document.getElementById('mna-assignment').value;
      state.mnaComplications = checked('mna-complications');
    } else {
      ['mnaType', 'mnaStage', 'mnaUserImpact', 'mnaCounterparty', 'mnaAssignment', 'mnaComplications']
        .forEach(k => delete state[k]);
    }
  }
}

// ─── Card selection ──────────────────────────────────────────────────────────
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

// ─── Metadata ─────────────────────────────────────────────────────────────────
const RANGES_LAST_UPDATED = 'September 16, 2026';

/* ─── Adobe corporate & pricing context ───────────────────────────────────────
   Unlike the percentage ranges elsewhere in this file, these are dated,
   sourced events — verifiable, not estimated. Each row's `when` decides
   whether it is shown: pricing rows always, acquisition rows only when the
   M&A module is on or the client holds a product the deal touches.

   Sources checked September 16, 2026:
     • Semrush close — news.adobe.com, April 28, 2026
     • Topaz Labs — news.adobe.com, June 25, 2026; close confirmed
       blog.adobe.com, September 23, 2026 (re-checked September 29, 2026)
     • CEO transition — Adobe Q3 FY26 results, September 10, 2026
     • VIP Marketplace increase — reseller notices of Adobe's June 2026 pricelist
     • Acrobat Standard increase — reseller notices, April 1, 2026
   Re-verify at each monthly review.
   ──────────────────────────────────────────────────────────────────────────── */
const ADOBE_CONTEXT = {
  verifiedOn: 'September 29, 2026',
  rows: [
    {
      id: 'ceo', kind: 'corporate', date: 'Dec 1, 2026',
      event: 'CEO transition',
      detail: 'Shantanu Narayen moves to Executive Chair; Anil Chakravarthy becomes CEO, announced alongside Q3 FY26 results.',
      implication: 'Adobe\'s fiscal Q4 (September–November 2026) is the last quarter under the current CEO. New leadership commonly brings packaging, pricing and sales-compensation changes into the following fiscal year — terms locked before December 1 are insulated from whatever comes next.',
      when: () => true,
    },
    {
      id: 'vip-increase', kind: 'pricing', date: 'Jun 1, 2026',
      event: 'VIP Marketplace price increase',
      detail: 'Most Creative Cloud and Acrobat SKUs increased. The Level 2 (10–49 license) volume discount was removed and Level 3+ discounts reduced. Education and government pricelists were unchanged.',
      implication: 'VIP customers absorb the increase at their next anniversary. A 3-Year Commit (10+ licenses) or an ETLA is the only structural protection against the next one.',
      when: s => ['vip', 'vip3yc', 'unknown', 'mixed'].includes(s.agreementType) || s.costPressures?.includes('listincrease'),
    },
    {
      id: 'acrobat-std', kind: 'pricing', date: 'Apr 1, 2026',
      event: 'Acrobat Standard for business increase',
      detail: 'New, add-on and renewing Acrobat Standard licenses on business (teams and enterprise) plans moved to new pricing.',
      implication: 'Check whether Acrobat Standard users actually need Acrobat at all — basic PDF viewing and signing are increasingly covered by tools you already own.',
      when: s => s.products?.includes('acrobat'),
    },
    {
      id: 'semrush', kind: 'acquisition', date: 'Apr 28, 2026',
      event: 'Semrush acquisition closed',
      detail: 'All-cash deal valued at roughly $1.9B, integrated into the new Adobe CX Enterprise offering alongside Experience Manager, Experience Platform and Commerce.',
      implication: 'Semrush is now an Adobe product. Expect it to be offered inside CX Enterprise bundles. If you hold Semrush, keep its pricing and renewal separable so it cannot be used to pull the rest of your Experience Cloud estate into a platform deal — and if you don\'t, expect it to appear in bundle proposals.',
      when: s => s.mnaEnabled || s.products?.includes('semrush') || s.changeEvents?.includes('platform'),
    },
    {
      id: 'topaz', kind: 'acquisition', date: 'Sep 23, 2026',
      event: 'Topaz Labs acquisition closed',
      detail: 'AI image and video enhancement, announced June 25 and closed September 23, 2026. Topaz stays a standalone brand and its apps and models remain available on their own; capabilities are coming to Firefly and Photoshop first, with more Creative Cloud workflows to follow. Adobe has not said whether those capabilities will need a separate subscription or credits.',
      implication: 'If your teams license Topaz separately, do not renew it for multiple years now that it is an Adobe product — the capability is heading into Firefly and Photoshop entitlements you may already pay for. Ask Adobe in writing whether Topaz features inside Creative Cloud will draw on generative credits or a new add-on, and keep any standalone Topaz renewal short and separable so it cannot be pulled into an ETLA or VIP bundle.',
      when: s => s.mnaEnabled || ['ccpro', 'ccsingle', 'firefly'].some(p => s.products?.includes(p)),
    },
    {
      id: 'figma', kind: 'acquisition', date: 'Dec 2023',
      event: 'Figma acquisition abandoned',
      detail: 'Adobe terminated its planned Figma acquisition after UK and EU regulatory opposition.',
      implication: 'Figma remains an independent competitor, which keeps it a credible alternative for UI and product design seats that sit inside Creative Cloud Pro today.',
      when: s => s.mnaEnabled || s.alternativeVendor === 'figma',
    },
  ],
};

// ─── Reference tables ─────────────────────────────────────────────────────────
const ACV_TIERS = {
  'under100k':  { label: 'Under $100K', mid: 75000,    tier: 0 },
  '100k-250k':  { label: '$100K–$250K', mid: 175000,   tier: 1 },
  '250k-500k':  { label: '$250K–$500K', mid: 375000,   tier: 2 },
  '500k-1m':    { label: '$500K–$1M',   mid: 750000,   tier: 3 },
  '1m-2500k':   { label: '$1M–$2.5M',   mid: 1750000,  tier: 4 },
  '2500k-5m':   { label: '$2.5M–$5M',   mid: 3750000,  tier: 5 },
  '5m-10m':     { label: '$5M–$10M',    mid: 7500000,  tier: 6 },
  '10mplus':    { label: '$10M+',       mid: 15000000, tier: 7 },
};

const PRODUCT_LABELS = {
  ccpro: 'Creative Cloud Pro', ccsingle: 'Single-App Plans', acrobat: 'Acrobat',
  sign: 'Acrobat Sign', firefly: 'Firefly / GenStudio', express: 'Adobe Express',
  stock: 'Adobe Stock', frameio: 'Frame.io', aem: 'Experience Manager', analytics: 'Analytics / CJA',
  aep: 'Experience Platform', marketo: 'Marketo Engage', workfront: 'Workfront',
  commerce: 'Adobe Commerce', target: 'Target', semrush: 'Semrush',
};
const CREATIVE_PRODUCTS = ['ccpro', 'ccsingle', 'acrobat', 'sign', 'firefly', 'express', 'stock', 'frameio'];
const EXPERIENCE_PRODUCTS = ['aem', 'analytics', 'aep', 'marketo', 'workfront', 'commerce', 'target', 'semrush'];

const VENDOR_LABELS = {
  canva: 'Canva', figma: 'Figma', pdf: 'Foxit or Nitro', microsoft: 'Microsoft 365\'s native PDF and Copilot tooling',
  docusign: 'DocuSign', salesforce: 'Salesforce Marketing Cloud and Data Cloud',
  dxp: 'Sitecore, Optimizely or Contentful', google: 'Google Analytics 4 or Amplitude',
  none: 'no credible alternative',
};

const AGREEMENT_LABELS = {
  vip: 'VIP', vip3yc: 'VIP 3-Year Commit', etla: 'ETLA', experience: 'Experience Cloud agreement',
  mixed: 'ETLA + Experience Cloud', unknown: 'Agreement type unknown',
};

const hasAny = (s, list) => list.some(p => s.products?.includes(p));
const isVip = s => s.agreementType === 'vip' || s.agreementType === 'vip3yc';
const hasEtla = s => s.agreementType === 'etla' || s.agreementType === 'mixed';

// Adobe fiscal year ends on the Friday closest to Nov 30.
// Q1 = Dec–Feb, Q2 = Mar–May, Q3 = Jun–Aug, Q4 = Sep–Nov.
const FISCAL_QUARTER = {
  12: 'Q1', 1: 'Q1', 2: 'Q1', 3: 'Q2', 4: 'Q2', 5: 'Q2',
  6: 'Q3', 7: 'Q3', 8: 'Q3', 9: 'Q4', 10: 'Q4', 11: 'Q4',
};

function fiscalContext(month) {
  const m = parseInt(month, 10);
  const q = FISCAL_QUARTER[m];
  if (!q) return null;
  if (m === 11) {
    return {
      quarter: 'Q4', strength: 'peak', bonus: 12,
      note: 'Your renewal lands in November — the final month of Adobe\'s fiscal year, which closes on the Friday nearest November 30. This is the highest-leverage window in Adobe\'s calendar: annual quota pressure is at its peak and deal desks have the most discretion.',
    };
  }
  if (q === 'Q4') {
    return {
      quarter: 'Q4', strength: 'peak', bonus: 10,
      note: 'Your renewal lands in Adobe\'s fiscal Q4 (September–November). This is Adobe\'s strongest quota period. A decision that can slide to late November without risking your renewal date captures the most of it.',
    };
  }
  if ([2, 5, 8].includes(m)) {
    return {
      quarter: q, strength: 'good', bonus: 6,
      note: `Your renewal lands at the close of Adobe's fiscal ${q}. Quarter-end carries real quota pressure — meaningful, though well short of the September–November Q4 window.`,
    };
  }
  return {
    quarter: q, strength: 'weak', bonus: 0,
    note: `Your renewal falls mid-quarter in Adobe's fiscal ${q}, away from any quota deadline${m === 12 ? ' — and December is the first month of Adobe\'s new fiscal year, when urgency is at its lowest' : ''}. Consider whether a short extension or early renewal could move the decision into a quarter end or into Q4.`,
  };
}

// ─── Deal calibration hook (shared across Proxima planners) ──────────────────
// Deal Calibration uses one SaaS-scale ACV tier set for every SaaS provider.
// The keys carry an `sf-` prefix for historical reasons (Salesforce was the
// first SaaS provider); Adobe deals are filtered by provider, not by prefix.
const ACV_TO_CAL_TIER = {
  'under100k': 'sf-under100k', '100k-250k': 'sf-100k-250k', '250k-500k': 'sf-250k-500k',
  '500k-1m': 'sf-500k-1m', '1m-2500k': 'sf-1m-2500k', '2500k-5m': 'sf-2500k-5m',
  '5m-10m': 'sf-5m-10m', '10mplus': 'sf-10mplus',
};

function getProximaInsight(calTier) {
  try {
    const deals = JSON.parse(localStorage.getItem('proxima-deals') || '[]');
    const ad = deals.filter(d => d.provider === 'adobe');
    if (!ad.length) return null;
    const tierDeals = calTier ? ad.filter(d => d.tier === calTier) : [];
    const relevant = tierDeals.length >= 2 ? tierDeals : ad;
    const discounts = relevant.map(d => d.discount).sort((a, b) => a - b);
    const avg = Math.round(discounts.reduce((s, v) => s + v, 0) / discounts.length * 10) / 10;
    return {
      count: relevant.length, avg, lo: discounts[0], hi: discounts[discounts.length - 1],
      tierMatch: tierDeals.length >= 2,
    };
  } catch { return null; }
}

// ─── Leverage scoring ─────────────────────────────────────────────────────────
function getLeverageScore(s) {
  let score = 0;

  const altMap = { dual: 22, evaluating: 17, theoretical: 7, none: 0 };
  score += altMap[s.alternative] ?? 0;

  const fc = fiscalContext(s.renewalMonth);
  score += fc ? fc.bonus : 0;

  const runwayMap = { '12plusmo': 14, '6-12mo': 14, '3-6mo': 9, '1-3mo': 4, 'within-1mo': 0 };
  score += runwayMap[s.renewalTimeline] ?? 0;

  const noticeMap = { served: 10, open: 8, none: 6, imminent: 2, unknown: 0, passed: -6 };
  score += noticeMap[s.noticeStatus] ?? 0;

  // Idle seats are budget you can credibly walk back
  const utilMap = { under60: 12, '60-75': 9, '75-90': 4, over90: 0, unknown: 2 };
  score += utilMap[s.licenseUtilization] ?? 0;

  // So are over-specified Creative Cloud Pro seats
  const fitMap = { high: 4, some: 2 };
  score += fitMap[s.appFit] ?? 0;

  const tier = ACV_TIERS[s.annualSpend]?.tier ?? 0;
  score += Math.min(tier * 2, 12);

  // VIP is a price list — an account team has little discretion inside it
  if (s.agreementType === 'vip') score -= 3;

  const growthMap = { aggressive: 9, strong: 7, modest: 4, flat: 2, shrinking: 0 };
  score += growthMap[s.headcountTrajectory] ?? 0;

  const relMap = { strategic: 7, strong: 6, moderate: 4, poor: 2, none: 0 };
  score += relMap[s.relationshipQuality] ?? 0;

  const expMap = { experienced: 6, moderate: 4, basic: 2, none: 0 };
  score += expMap[s.previousNegotiation] ?? 0;

  // Resellers can be competed against each other; scattered buying fragments volume
  if (s.purchaseChannel === 'reseller') score += 2;
  if (s.purchaseChannel === 'several') score -= 3;
  if (s.costPressures?.includes('consoles')) score -= 2;

  // Change events, capped in aggregate so stacked carrots don't saturate the score
  let eventScore = 0;
  if (s.changeEvents?.includes('expansion')) eventScore += 5;
  if (s.changeEvents?.includes('consolidation')) eventScore += 4;
  if (s.changeEvents?.includes('migration')) eventScore += 6;
  if (s.changeEvents?.includes('ai')) eventScore += 3;        // Adobe has AI adoption targets
  if (s.changeEvents?.includes('platform')) eventScore += 3;  // and platform-deal targets
  // M&A shares the cap: an announced acquisition is another reason Adobe wants
  // the deal, not an independent multiplier on top of expansion.
  const mnaAdj = mnaLeverageAdjustment(s);
  score += mnaAdj > 0 ? Math.min(Math.min(eventScore, 8) + mnaAdj, 10) : Math.min(eventScore, 8) + mnaAdj;

  if (s.adoptionHealth === 'critical') score -= 6;
  if (s.adoptionHealth === 'poor') score += 4;

  if (['procurement', 'cfo', 'cio'].includes(s.internalChampion)) score += 3;
  if (s.internalChampion === 'none') score -= 3;

  return Math.max(0, Math.min(Math.round(score), 100));
}

// M&A changes leverage only once it can be used. A confidential deal cannot be
// put in front of Adobe, so it moves nothing until it is announced.
function mnaLeverageAdjustment(s) {
  if (!s.mnaEnabled || s.mnaStage === 'confidential') return 0;
  let adj = { acquiring: 4, merger: 3, acquired: -2, divesting: -4 }[s.mnaType] ?? 0;
  // Two Adobe contracts combining is a bigger deal Adobe wants to keep
  if (['acquiring', 'merger'].includes(s.mnaType) && ['etla', 'experience'].includes(s.mnaCounterparty)) adj += 2;
  if (s.mnaStage === 'settled') adj = Math.round(adj / 2);
  return adj;
}

function getLeverageLabel(score) {
  if (score >= 75) return { label: 'Very Strong', color: '#166534' };
  if (score >= 60) return { label: 'Strong', color: '#15803D' };
  if (score >= 42) return { label: 'Moderate', color: '#B45309' };
  if (score >= 25) return { label: 'Limited', color: '#9A3412' };
  return { label: 'Weak', color: '#6B7280' };
}

// ─── Renewal increase model ───────────────────────────────────────────────────
// What Adobe will likely present at renewal, and the effective increase to target.
function getIncreaseOutlook(s, leverage) {
  let askLo, askHi;
  if (s.priceProtection === 'capped') { askLo = 0; askHi = 5; }
  else if (s.agreementType === 'vip') { askLo = 5; askHi = 18; }
  else if (s.agreementType === 'vip3yc') { askLo = 8; askHi = 20; }       // lock ends into a higher list
  else if (s.priceProtection === 'expiring') { askLo = 8; askHi = 15; }    // ETLA catch-up to current list
  else if (s.agreementType === 'experience') { askLo = 7; askHi = 12; }
  else { askLo = 6; askHi = 10; }

  if (s.costPressures?.includes('listincrease')) askHi += 2;
  if (s.adoptionHealth === 'critical') askHi += 2;
  if (s.alternative === 'none') askHi += 2;

  let capLo, capHi;
  if (leverage >= 70) { capLo = 0; capHi = 3; }
  else if (leverage >= 55) { capLo = 0; capHi = 4; }
  else if (leverage >= 40) { capLo = 3; capHi = 5; }
  else if (leverage >= 25) { capLo = 4; capHi = 7; }
  else { capLo = 5; capHi = 9; }

  if (s.desiredTerm === '3yr') capHi = Math.max(0, capHi - 1);
  if (s.noticeStatus === 'passed') { capLo += 2; capHi += 3; }
  // A lock expiring into a higher list rarely renews flat, however strong the position.
  if (s.priceProtection === 'expiring' || s.agreementType === 'vip3yc') { capLo = Math.max(capLo, 2); capHi = Math.max(capHi, 4); }
  capHi = Math.min(capHi, askHi);
  capLo = Math.min(capLo, capHi);

  return { askLo, askHi, capLo, capHi };
}

// ─── Discount-off-list model ──────────────────────────────────────────────────
function getDiscountRange(s, leverage) {
  const tier = ACV_TIERS[s.annualSpend]?.tier ?? 0;
  const base = [
    [0, 8], [5, 12], [10, 20], [15, 25],
    [20, 30], [25, 35], [30, 40], [35, 45],
  ][tier] || [0, 8];

  let [lo, hi] = base;
  if (s.alternative === 'dual') { lo += 4; hi += 7; }
  else if (s.alternative === 'evaluating') { lo += 3; hi += 5; }
  else if (s.alternative === 'none') { lo -= 2; hi -= 3; }

  if (s.desiredTerm === '3yr') { lo += 2; hi += 4; }

  const fc = fiscalContext(s.renewalMonth);
  if (fc?.strength === 'peak') { lo += 2; hi += 4; }
  else if (fc?.strength === 'good') { lo += 1; hi += 2; }

  if (s.changeEvents?.includes('expansion')) { lo += 1; hi += 3; }
  if (s.purchaseChannel === 'reseller') { hi += 2; }
  if (leverage < 25) hi -= 3;
  if (s.adoptionHealth === 'critical') hi -= 2;

  lo = Math.max(0, Math.round(lo));
  hi = Math.min(Math.round(hi), base[1] + 12);

  // Inside VIP, discount is set by the published volume level, not by negotiation.
  const vipLimited = s.agreementType === 'vip';
  if (vipLimited) { lo = Math.min(lo, 3); hi = Math.min(hi, 10); }

  hi = Math.max(lo + 3, hi);
  return { lo, hi, midpoint: Math.round((lo + hi) / 2), vipLimited };
}

// ─── Right-sizing model ───────────────────────────────────────────────────────
// Three independent sources of recoverable spend, each a directional band.
function getRightSizingEstimate(s) {
  const acv = ACV_TIERS[s.annualSpend]?.mid;
  if (!acv) return null;

  const hasCreative = hasAny(s, CREATIVE_PRODUCTS);
  const hasExperience = hasAny(s, EXPERIENCE_PRODUCTS);
  // Rough share of ACV that is seat-based Creative / Document Cloud licensing
  const seatShare = hasCreative ? (hasExperience ? 0.35 : 0.9) : 0;
  const seatSpend = acv * seatShare;
  const expSpend = acv - seatSpend;
  const recoverable = 0.7;  // not every idle or over-specified seat is practically reclaimable
  const round = n => Math.round(n / 1000) * 1000;
  const lines = [];

  const idle = {
    under60: [.22, .35, 'under 60% utilization'], '60-75': [.12, .22, '60–75% utilization'],
    '75-90': [.05, .12, '75–90% utilization'], over90: [0, .04, 'over 90% utilization'],
    unknown: [.10, .25, 'utilization never measured'],
  }[s.licenseUtilization];
  if (idle && seatSpend) {
    lines.push({
      label: 'Idle named-user licenses',
      basis: `${idle[2]}, applied to the seat-licensed share of spend`,
      lo: round(seatSpend * idle[0] * recoverable), hi: round(seatSpend * idle[1] * recoverable),
    });
  }

  // Creative Cloud Pro seats that only need one or two apps. Assumes Pro is
  // ~60% of seat spend and a downgrade saves roughly half the seat cost.
  const fit = { high: [.35, .5], some: [.2, .35], low: [.05, .12], unknown: [.15, .35] }[s.appFit];
  if (fit && s.products?.includes('ccpro') && seatSpend) {
    lines.push({
      label: 'Creative Cloud Pro → single-app or Acrobat',
      basis: 'share of Pro users working in only one or two apps, at roughly half the seat cost per downgrade',
      lo: round(seatSpend * 0.6 * fit[0] * 0.5 * recoverable), hi: round(seatSpend * 0.6 * fit[1] * 0.5 * recoverable),
    });
  }

  let expBand = null;
  if (s.metricPosition === 'under') expBand = [.08, .15];
  if (s.costPressures?.includes('shelfmodules')) expBand = expBand ? [expBand[0] + .05, expBand[1] + .10] : [.05, .12];
  if (expBand && hasExperience && expSpend) {
    lines.push({
      label: 'Experience Cloud capacity and modules',
      basis: 'unused contracted metrics or modules purchased but not implemented',
      lo: round(expSpend * expBand[0]), hi: round(expSpend * expBand[1]),
    });
  }

  const lo = lines.reduce((t, l) => t + l.lo, 0);
  const hi = lines.reduce((t, l) => t + l.hi, 0);
  if (hi < 10000) return null;
  return { lines: lines.filter(l => l.hi > 0), lo, hi, acv };
}

const fmtMoney = n => '$' + n.toLocaleString('en-US');

// ─── Renewal posture ──────────────────────────────────────────────────────────
function recommendedPosture(s, leverage) {
  if (s.noticeStatus === 'passed') return 'Damage Control';
  if (s.mnaEnabled && s.mnaStage !== 'settled') {
    if (s.mnaType === 'divesting') return 'Carve-Out Protection';
    if (s.mnaType === 'acquired') return 'Preserve Optionality';
    if (s.mnaStage !== 'confidential') return 'Consolidate & Re-Paper';
  }
  if (s.licenseUtilization === 'under60' || s.licenseUtilization === 'unknown' || s.appFit === 'high') return 'Right-Size First';
  if (s.agreementType === 'vip' && (ACV_TIERS[s.annualSpend]?.tier ?? 0) >= 2) return 'Move to Enterprise Terms';
  if (s.purchaseChannel === 'several' || s.costPressures?.includes('consoles')) return 'Consolidate Purchasing';
  if (leverage >= 55 && s.desiredTerm === '3yr') return 'Multi-Year Price Lock';
  if (leverage >= 55) return 'Competitive Leverage';
  if (s.changeEvents?.includes('expansion')) return 'Trade Growth for Terms';
  return 'Cap & Protect';
}

// ═══ Main builder ════════════════════════════════════════════════════════════
function buildStrategyHTML(s) {
  const leverage = getLeverageScore(s);
  const leverageInfo = getLeverageLabel(leverage);
  const increase = getIncreaseOutlook(s, leverage);
  const discount = getDiscountRange(s, leverage);
  const rightsizing = getRightSizingEstimate(s);
  const fc = fiscalContext(s.renewalMonth);
  const acvLabel = ACV_TIERS[s.annualSpend]?.label ?? 'Unknown ACV';
  const tier = ACV_TIERS[s.annualSpend]?.tier ?? 0;
  const posture = recommendedPosture(s, leverage);
  const sizeLabels = { smb: 'SMB', midmarket: 'Mid-Market', enterprise: 'Enterprise', global: 'Global Enterprise' };

  const alerts = buildAlerts(s, tier, leverage, fc);
  const tactics = buildTactics(s, tier, leverage, fc, increase);
  const concessions = buildConcessions(s, tier);
  const timeline = buildTimeline(s, fc);
  const questions = buildQuestions(s, tier);
  const risks = buildRisks(s, tier, leverage);
  const mna = s.mnaEnabled ? buildMnaImplications(s) : null;
  const context = ADOBE_CONTEXT.rows.filter(r => r.when(s));
  const proxima = getProximaInsight(ACV_TO_CAL_TIER[s.annualSpend]);

  return `
<div class="strategy-container">
  <div class="print-proxima-header">
    <span class="print-logo-text">Proxima</span>
    <span class="print-divider"></span>
    <span class="print-tool-name">Adobe Negotiation Planner</span>
  </div>

  <div class="strategy-hero">
    <h2>Your Adobe Renewal Strategy</h2>
    <div class="subtitle">${sizeLabels[s.companySize] || 'Company'} · ${acvLabel} ACV · ${AGREEMENT_LABELS[s.agreementType] || 'Adobe'}${s.mnaEnabled ? ' · M&amp;A in scope' : ''} · Generated ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
    <div style="font-size:.75rem;color:rgba(255,255,255,.6);font-style:italic;margin-top:4px;">Intended for Proxima use only — please contact Brian Chernauskas with questions</div>
    <div style="font-size:.7rem;color:rgba(255,255,255,.35);margin-top:3px;">Ranges last calibrated: ${RANGES_LAST_UPDATED} · Directional estimates, not Adobe-published figures</div>
    <div class="score-row">
      <div class="score-pill">
        <span class="pill-label">Leverage Score</span>
        <span class="pill-value" style="color:${leverageInfo.color}">${leverage}/100 — ${leverageInfo.label}</span>
      </div>
      <div class="score-pill">
        <span class="pill-label">Target Renewal Increase</span>
        <span class="pill-value">${increase.capLo}–${increase.capHi}%</span>
      </div>
      <div class="score-pill">
        <span class="pill-label">Renewal Posture</span>
        <span class="pill-value">${posture}</span>
      </div>
    </div>
  </div>

  <div class="strategy-body">

    ${alerts.length ? `
    <div class="strategy-section">
      <div class="section-header">
        <span class="section-icon">🚨</span>
        <h3>Critical Flags &amp; Immediate Actions</h3>
      </div>
      <div class="section-content">
        <div class="alerts-list">${alerts.map(a => `<div class="alert alert-${a.type}"><span class="alert-icon">${a.icon}</span><div>${a.text}</div></div>`).join('')}</div>
      </div>
    </div>` : ''}

    ${fc ? `
    <div class="strategy-section">
      <div class="section-header">
        <span class="section-icon">📆</span>
        <h3>Fiscal Timing</h3>
        <span class="section-badge ${fc.strength === 'peak' ? 'green' : fc.strength === 'good' ? 'blue' : ''}">Adobe fiscal ${fc.quarter}</span>
      </div>
      <div class="section-content">
        <p style="font-size:.92rem;line-height:1.7;color:var(--text-secondary);">${fc.note}</p>
        <p style="font-size:.85rem;line-height:1.7;color:var(--text-muted);margin-top:10px;">Adobe's fiscal year ends on the Friday closest to November 30. Quarters run December–February, March–May, June–August, and September–November; FY2026 closes November 27, 2026.</p>
      </div>
    </div>` : ''}

    <div class="strategy-section">
      <div class="section-header">
        <span class="section-icon">🏢</span>
        <h3>Adobe Corporate &amp; Pricing Context</h3>
        <span class="section-badge">Verified ${ADOBE_CONTEXT.verifiedOn}</span>
      </div>
      <div class="section-content">
        <div class="table-scroll"><table class="corp-table">
          <thead><tr><th>Event</th><th>What happened</th><th>What it means for this renewal</th></tr></thead>
          <tbody>${context.map(r => `<tr>
            <td>${r.event}<div style="font-weight:400;color:var(--text-muted);font-size:.75rem;">${r.date}</div></td>
            <td>${r.detail}</td>
            <td>${r.implication}</td>
          </tr>`).join('')}</tbody>
        </table></div>
        <p style="margin-top:10px;font-size:.76rem;color:var(--text-muted);line-height:1.6;">These are dated, sourced events rather than estimates. Acquisition rows appear when the M&amp;A module is on or when you hold a product the deal affects.</p>
      </div>
    </div>

    ${mna ? mnaSectionHTML(s, mna) : ''}

    <div class="strategy-section">
      <div class="section-header">
        <span class="section-icon">📈</span>
        <h3>Renewal Increase Outlook</h3>
        <span class="section-badge">Primary commercial lever</span>
      </div>
      <div class="section-content">
        <div class="discount-estimate">
          <div>
            <div class="de-range">${increase.capLo}–${increase.capHi}%</div>
            <div class="de-label">target effective increase at renewal</div>
          </div>
          <div class="de-bar-wrap">
            <div class="de-bar-bg">
              <div class="de-bar-fill" style="width:${Math.max(0, Math.min(100 - increase.capHi * 5, 100))}%"></div>
            </div>
            <div class="de-note">Expect Adobe's renewal pricing to land <strong>${increase.askLo}–${increase.askHi}%</strong> above today · Your target: <strong>${increase.capLo}–${increase.capHi}%</strong> · Stretch: <strong>flat renewal</strong></div>
          </div>
        </div>
        <p style="margin-top:14px;font-size:.88rem;line-height:1.7;color:var(--text-secondary);">
          ${isVip(s)
            ? 'On VIP, the increase arrives automatically at your anniversary as Adobe\'s pricelist moves — there is no renewal conversation unless you create one. The protection is structural: a 3-Year Commit or an ETLA that fixes the price for the term. Whatever you secure, make sure the fixed price covers add-on licenses as well as the base quantity.'
            : 'A price fixed for the full term is worth more than a one-time discount, because Adobe has raised list prices twice in 2026 and the lock compounds across every year. Make sure the protection applies to true-up and add-on licenses at your contracted unit price — not to then-current list — or the growth you add mid-term quietly pays the increase you negotiated away.'}
        </p>
        ${factorsTableHTML(s, fc)}
      </div>
    </div>

    <div class="strategy-section">
      <div class="section-header">
        <span class="section-icon">💰</span>
        <h3>Discount Off List</h3>
        <span class="section-badge blue">${acvLabel}</span>
      </div>
      <div class="section-content">
        <div class="discount-estimate">
          <div>
            <div class="de-range">${discount.lo}–${discount.hi}%</div>
            <div class="de-label">vs. Adobe's published pricelist</div>
          </div>
          <div class="de-bar-wrap">
            <div class="de-bar-bg">
              <div class="de-bar-fill" style="width:${Math.min(discount.hi * 1.8, 100)}%"></div>
            </div>
            <div class="de-note">Midpoint target: <strong>${discount.midpoint}%</strong> · Walk-away floor: <strong>${discount.lo}%</strong> · Stretch goal: <strong>${discount.hi}%</strong></div>
          </div>
        </div>
        ${discount.vipLimited ? `<div class="alert alert-info" style="margin-top:14px;"><span class="alert-icon">ℹ️</span><div><strong>VIP limits what can be negotiated.</strong> VIP discounts are set by published volume levels, and Adobe's June 2026 pricelist removed the Level 2 (10–49 license) discount entirely. This range reflects reseller margin and promotional pricing, not a negotiated rate. The larger discount sits behind a 3-Year Commit or an ETLA.</div></div>` : ''}
        ${proxima ? `<div style="margin-top:10px;padding:10px 14px;background:rgba(235,16,0,.06);border:1px solid rgba(235,16,0,.22);border-radius:8px;font-size:.82rem;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <span style="font-weight:700;color:#C40D00;">📊 Proxima Deal Data</span>
          <span style="color:var(--text-muted);">Based on <strong>${proxima.count} Adobe deal${proxima.count !== 1 ? 's' : ''}</strong>${proxima.tierMatch ? ' at this ACV tier' : ' across all tiers'}: observed avg <strong>${proxima.avg}%</strong>, range <strong>${proxima.lo}–${proxima.hi}%</strong></span>
        </div>` : ''}
        <p style="margin-top:14px;font-size:.82rem;line-height:1.7;color:var(--text-muted);">
          Creative Cloud Pro for teams is widely reported at $99.99 per license per month on an annual plan; re-confirm current pricing on adobe.com before quoting it, since Adobe's pricing pages vary by region and plan and changed twice in 2026. Experience Cloud has no public list price — its discount is measured against Adobe's quoted rate card, which is why a line-item quote matters.
        </p>
      </div>
    </div>

    ${rightsizing ? `
    <div class="strategy-section">
      <div class="section-header">
        <span class="section-icon">✂️</span>
        <h3>Right-Sizing Opportunity</h3>
        <span class="section-badge green">Resize before you re-commit</span>
      </div>
      <div class="section-content">
        <div class="discount-estimate">
          <div>
            <div class="de-range" style="font-size:1.6rem;">${fmtMoney(rightsizing.lo)}–${fmtMoney(rightsizing.hi)}</div>
            <div class="de-label">estimated annual recoverable spend</div>
          </div>
          <div class="de-bar-wrap">
            <div class="de-note">Against a midpoint ACV of <strong>${fmtMoney(rightsizing.acv)}</strong>.</div>
          </div>
        </div>
        <table style="width:100%;margin-top:14px;border-collapse:collapse;font-size:.82rem;">
          <thead><tr style="border-bottom:1px solid var(--border);">
            <th style="text-align:left;padding:6px 0;color:var(--text-secondary);font-weight:600;">Source</th>
            <th style="text-align:right;padding:6px 0;color:var(--text-secondary);font-weight:600;">Annual estimate</th>
          </tr></thead>
          <tbody>${rightsizing.lines.map(l => `<tr style="border-bottom:1px solid var(--surface-3);">
            <td style="padding:7px 0;color:var(--text-primary);">${l.label}<div style="color:var(--text-muted);font-size:.74rem;">${l.basis}</div></td>
            <td style="padding:7px 0;text-align:right;font-weight:700;color:var(--success);font-variant-numeric:tabular-nums;white-space:nowrap;">${fmtMoney(l.lo)}–${fmtMoney(l.hi)}</td>
          </tr>`).join('')}</tbody>
        </table>
        <p style="margin-top:14px;font-size:.88rem;line-height:1.7;color:var(--text-secondary);">
          ${hasEtla(s)
            ? 'An ETLA generally lets quantities rise at each annual true-up but not fall until renewal. Every idle or over-specified seat carried through this renewal is carried for the next three years.'
            : 'Every idle or over-specified license carried into a multi-year commitment is paid for across the whole term.'}
          Pull the Admin Console license and last-activity reports for every console before pricing discussions, and negotiate against the corrected quantities and product mix rather than the current ones.
        </p>
        <p style="margin-top:10px;font-size:.82rem;line-height:1.7;color:var(--text-muted);font-style:italic;">
          Directional estimate derived from your ACV band, product mix, and reported utilization — not a measured figure. Treat it as a reason to run the reports, not as a number to put in front of Adobe.
        </p>
      </div>
    </div>` : ''}

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
        <span class="section-icon">📜</span>
        <h3>Contract Terms to Secure</h3>
        <span class="section-badge green">Beyond price</span>
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
        <h3>Negotiation Timeline &amp; Action Plan</h3>
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
        <h3>Questions to Ask Adobe</h3>
      </div>
      <div class="section-content">
        <div class="questions-list">${questions.map(q => `<div class="question-item">"${q}"</div>`).join('')}</div>
      </div>
    </div>

    <div class="strategy-section">
      <div class="section-header">
        <span class="section-icon">⚠️</span>
        <h3>Risk Factors &amp; Mitigations</h3>
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

    <div class="strategy-section">
      <div class="section-header">
        <span class="section-icon">📐</span>
        <h3>Methodology &amp; Limitations</h3>
      </div>
      <div class="section-content">
        <p style="font-size:.86rem;line-height:1.75;color:var(--text-secondary);">
          <strong>Corporate events are verified; percentages are estimated.</strong> The acquisition, leadership, and pricelist events above are dated and sourced, checked ${ADOBE_CONTEXT.verifiedOn}. Adobe does not publish ETLA discount bands, renewal increases, or negotiated outcomes, so every percentage in this plan is a directional estimate built from publicly reported procurement practice and Proxima engagement experience. Discount bands scale with ACV and are adjusted for agreement type, competitive position, term, reseller involvement, and fiscal timing.
        </p>
        <p style="font-size:.86rem;line-height:1.75;color:var(--text-secondary);margin-top:10px;">
          Third-party Adobe benchmark sites vary widely — published figures for the 2026 increases range from single digits to over 20% depending on SKU, currency, and whether the source measures list movement or the loss of VIP volume discounts. Read the method before quoting any of them.
        </p>
        ${s.mnaEnabled ? `<p style="font-size:.86rem;line-height:1.75;color:var(--text-secondary);margin-top:10px;">
          <strong>M&amp;A guidance is commercial, not legal.</strong> Assignment, change-of-control, affiliate-use, and transition-services rights depend on the exact wording of your Adobe General Terms, ETLA, and any order-level terms, and on the transaction structure (asset versus stock purchase, merger, spin-off). Have deal counsel review the actual clauses before relying on any of the positions above.
        </p>` : ''}
        <p style="font-size:.86rem;line-height:1.75;color:var(--text-secondary);margin-top:10px;">
          Use these as calibration for what to target and where to push, not as figures to quote to a client or to Adobe. Where a specific number matters to a deal, verify it against the client's own agreements and against observed outcomes logged in Deal Calibration.
        </p>
      </div>
    </div>

  </div>
  <div class="proxima-strategy-footer" style="margin-top:32px;padding-top:16px;border-top:1px solid var(--border);text-align:center;font-size:.78rem;color:var(--text-muted);font-style:italic;">
    Intended for Proxima use only — please contact Brian Chernauskas with questions
  </div>
</div>`;
}

// ─── Factors table ────────────────────────────────────────────────────────────
function factorsTableHTML(s, fc) {
  const rows = [];
  if (s.alternative === 'dual') rows.push(['Competing tool already deployed at scale', 'Strong', 'green']);
  else if (s.alternative === 'evaluating') rows.push(['Active evaluation of an alternative', 'Strong', 'green']);
  else if (s.alternative === 'none') rows.push(['No credible alternative — Adobe knows it', 'Weak', 'red']);

  if (fc?.strength === 'peak') rows.push(['Renewal lands in Adobe fiscal Q4', 'Strong', 'green']);
  else if (fc?.strength === 'good') rows.push(['Renewal lands at fiscal quarter end', 'Moderate', 'green']);
  else if (fc?.strength === 'weak') rows.push(['Renewal falls mid-quarter', 'Weak', 'red']);

  if (s.renewalTimeline === 'within-1mo' || s.renewalTimeline === '1-3mo') rows.push(['Limited runway before renewal', 'Weak', 'red']);
  else if (s.renewalTimeline === '6-12mo' || s.renewalTimeline === '12plusmo') rows.push(['Ample runway to negotiate', 'Strong', 'green']);

  if (s.noticeStatus === 'passed') rows.push(['Auto-renewal notice window missed', 'Critical', 'red']);
  else if (s.noticeStatus === 'served') rows.push(['Non-renewal notice already served', 'Strong', 'green']);

  if (s.agreementType === 'vip') rows.push(['VIP pricelist — little negotiating discretion', 'Weak', 'red']);
  if (s.priceProtection === 'expiring') rows.push(['Price lock ends into a higher 2026 list', 'Weak', 'red']);
  if (s.licenseUtilization === 'under60') rows.push(['Utilization under 60% — large reduction available', 'Strong', 'green']);
  else if (s.licenseUtilization === 'over90') rows.push(['Utilization above 90% — little to trade back', 'Weak', 'red']);
  if (s.appFit === 'high') rows.push(['Many Creative Cloud Pro seats are over-specified', 'Strong', 'green']);
  if (s.purchaseChannel === 'reseller') rows.push(['Reseller margin can be competed', 'Moderate', 'green']);
  if (s.purchaseChannel === 'several') rows.push(['Purchasing fragmented across channels', 'Weak', 'red']);
  if (s.desiredTerm === '3yr') rows.push(['Willing to commit to a 3-year term', 'Moderate', 'green']);
  if (s.changeEvents?.includes('ai') || s.changeEvents?.includes('platform')) rows.push(['Adobe wants your AI or platform adoption', 'Moderate', 'green']);
  if (s.adoptionHealth === 'critical') rows.push(['Business-critical dependency limits walk-away', 'Weak', 'red']);

  const mnaAdj = mnaLeverageAdjustment(s);
  if (s.mnaEnabled && s.mnaStage === 'confidential') rows.push(['M&amp;A not yet public — cannot be used as leverage', 'Neutral', 'red']);
  else if (mnaAdj > 0) rows.push(['M&amp;A adds users Adobe wants to keep', 'Moderate', 'green']);
  else if (mnaAdj < 0) rows.push([s.mnaType === 'divesting' ? 'Divestiture shrinks the account' : 'Pending change of control — Adobe may wait for the acquirer', 'Weak', 'red']);

  if (!rows.length) return '';
  return `<table style="width:100%;margin-top:18px;border-collapse:collapse;font-size:.82rem;">
    <thead><tr style="border-bottom:1px solid var(--border);">
      <th style="text-align:left;padding:6px 0;color:var(--text-secondary);font-weight:600;">Leverage Factor</th>
      <th style="text-align:right;padding:6px 0;color:var(--text-secondary);font-weight:600;">Position</th>
    </tr></thead>
    <tbody>${rows.map(([label, val, color]) => `<tr style="border-bottom:1px solid var(--surface-3);">
      <td style="padding:7px 0;color:var(--text-primary);">${label}</td>
      <td style="padding:7px 0;text-align:right;font-weight:700;color:var(--${color === 'red' ? 'danger' : 'success'})">${val}</td>
    </tr>`).join('')}</tbody>
  </table>`;
}

// ═══ M&A module ══════════════════════════════════════════════════════════════
const MNA_TYPE_LABELS = { acquiring: 'Acquisition', acquired: 'Being acquired', merger: 'Merger', divesting: 'Divestiture' };
const MNA_STAGE_LABELS = {
  confidential: 'Confidential', announced: 'Announced, not closed',
  integrating: 'Closed — integrating', settled: 'Closed 12+ months ago',
};
const MNA_IMPACT_LABELS = { under10: 'under 10%', '10-25': '10–25%', '25-50': '25–50%', over50: 'over 50%', unknown: 'not yet sized' };

function buildMnaImplications(s) {
  const items = [];
  const type = s.mnaType;
  const stage = s.mnaStage;
  const adding = type === 'acquiring' || type === 'merger';
  const material = ['25-50', 'over50'].includes(s.mnaUserImpact);
  const cp = s.mnaCounterparty;

  // ── Stage framing ──
  const stageNote = {
    confidential: 'The transaction is not public, so it cannot be disclosed to Adobe or its reseller and cannot be used as leverage. Negotiate the flexibility you will need — assignment, affiliate use, co-terming, a short term — on its own merits, as good contract hygiene, without referencing the deal.',
    announced: 'The deal is public but not closed. This is the best moment to negotiate: Adobe knows the account is about to change and wants to secure the combined business, but nothing has been consolidated yet. Until close, keep each party\'s Adobe pricing separate — sharing commercially sensitive terms between the two companies before close can raise gun-jumping concerns, so route any comparison through a clean team or counsel.',
    integrating: 'The deal has closed and integration is live. Adobe will already see the change in its account data. Move now to consolidate agreements, consoles, and pricing before separate renewals quietly re-anchor on the less favorable contract.',
    settled: 'The transaction closed more than a year ago. The integration window is largely spent, but any contracts, consoles, or duplicate licenses that were never consolidated are still costing money — this renewal is the moment to finish the job.',
  }[stage] || '';

  if (adding) {
    items.push({
      priority: 'must', title: 'Licenses do not transfer automatically',
      desc: `Adobe named-user licenses belong to the contracting entity and are administered through its Admin Console. The ${type === 'merger' ? 'other party\'s' : 'acquired company\'s'} licenses will not fold into your agreement on their own — moving them takes a transfer or a new order through Adobe or your reseller. Get a written right to add the new entity's users under your agreement at your contracted unit prices, co-termed to your anniversary, rather than buying them at then-current list.`,
    });
    if (cp === 'etla' || cp === 'experience') {
      items.push({
        priority: 'must', title: 'Two enterprise agreements running in parallel',
        desc: `The other party holds its own ${cp === 'etla' ? 'ETLA' : 'Experience Cloud agreement'}, which is typically non-cancellable for its term. Left alone, you pay for overlapping entitlements until it expires. Ask Adobe to consolidate the two into one agreement, with credit for the unused remaining term of the smaller contract applied to the combined deal. Compare unit prices first — the combined agreement should inherit the better of the two rates, not the worse.`,
      });
    } else if (cp === 'vip') {
      items.push({
        priority: 'should', title: 'Fold VIP purchases into your enterprise terms',
        desc: 'The other party buys on VIP, which after the June 2026 pricelist changes likely costs more per seat than your terms. Its memberships renew on their own anniversaries at list. Migrate those users onto your agreement at each anniversary — or all at once with prorated co-terming — and cancel the VIP memberships rather than letting them auto-renew.',
      });
    } else if (cp === 'unknown') {
      items.push({
        priority: 'should', title: 'Inventory the other party\'s Adobe estate',
        desc: 'You do not yet know what the other party holds. Before close (via counsel or a clean team if pre-close), establish its agreement types, anniversaries, license counts by product, Admin Consoles, and any reseller relationships. Surprises here — a three-year ETLA signed last quarter, or hundreds of card-purchased seats — change the negotiation.',
      });
    }
    items.push({
      priority: 'should', title: 'Treat the added users as negotiating currency',
      desc: `${material ? 'The transaction materially enlarges your Adobe footprint. ' : ''}Growth from an acquisition is the same currency as planned expansion — Adobe wants the combined account, and the added users are worth more at the table than on an order form. Settle core renewal terms first, then bring the combined volume in exchange for pricing, co-terming, and migration support.`,
    });
    if (hasAny(s, EXPERIENCE_PRODUCTS)) {
      items.push({
        priority: 'should', title: 'Combined Experience Cloud metrics can breach your tiers',
        desc: 'Merging websites, customer profiles, or analytics traffic into one Experience Cloud instance can push contracted metrics — profiles, server calls, page views — past your licensed volumes. Negotiate a combined metric allowance priced at your current rate and an overage grace period covering the integration, so migration traffic does not generate overage invoices.',
      });
    }
  }

  if (type === 'acquired' || type === 'merger') {
    items.push({
      priority: 'must', title: 'Do not lock in a long term ahead of a change of control',
      desc: 'If the acquirer holds its own Adobe agreement, a fresh three-year commitment signed now may be stranded or duplicated after close. Prefer a short extension (6–12 months) that can be co-termed into the acquirer\'s agreement, or secure the right to consolidate into a successor agreement with credit for the unused term. Do not buy expansion ahead of close.',
    });
  }

  if (type === 'acquired' || adding) {
    const assignText = {
      consent: 'Your agreement requires Adobe\'s consent to assign it. That gives Adobe a checkpoint at exactly the moment it has most leverage.',
      permitted: 'Your agreement permits assignment to a successor or affiliate. Confirm the wording covers the actual deal structure (asset sale, stock purchase, or merger) and that pricing survives assignment.',
      unknown: 'The assignment clause has not been reviewed. Do that before any other M&A step.',
    }[s.mnaAssignment] || 'Review the assignment and change-of-control language.';
    items.push({
      priority: s.mnaAssignment === 'permitted' ? 'should' : 'must', title: 'Assignment and change-of-control rights',
      desc: `${assignText} Negotiate a right to assign the agreement, without further consent or re-pricing, to any successor by merger, acquisition, or sale of substantially all assets — and to extend use to newly acquired affiliates at contracted pricing.`,
    });
  }

  if (type === 'divesting') {
    items.push({
      priority: 'must', title: 'Divested users stop being covered at close',
      desc: 'Adobe entitlements generally extend to the licensee and its affiliates. The moment the divested business leaves your corporate group, its users may no longer be permitted to use your licenses. Negotiate a transition right that lets the divested entity keep using licenses under your agreement for a defined period (typically 6–18 months) after close.',
    });
    items.push({
      priority: 'must', title: 'Reduce quantities without waiting for renewal',
      desc: `ETLA and multi-year agreements rarely allow quantity reductions mid-term. Without a divestiture clause you keep paying for users who have left. Ask for the right to reduce licenses and contracted metrics in proportion to divested users${s.mnaUserImpact && s.mnaUserImpact !== 'unknown' ? ` (${MNA_IMPACT_LABELS[s.mnaUserImpact]} here)` : ''}, effective at close or the next anniversary, with no price re-rating on the remaining volume.`,
    });
    items.push({
      priority: 'should', title: 'Give the carve-out a pricing bridge',
      desc: 'The divested company will need its own Adobe agreement. A standalone new customer buying at its size will likely land on VIP pricing. Ask Adobe to offer the carve-out your current unit pricing for a first term — it makes the separation cleaner, can be written into the sale agreement, and costs Adobe little since it keeps the users.',
    });
  }

  // ── Integration complications ──
  const comp = s.mnaComplications || [];
  if (comp.includes('consoles') || comp.includes('identity')) {
    items.push({
      priority: 'should', title: 'Admin Console and identity consolidation',
      desc: `${comp.includes('consoles') ? 'Merging separate Admin Consoles means moving users, license assignments, and product profiles between organizations. ' : ''}${comp.includes('identity') ? 'Different identity domains mean re-claiming domains and re-establishing SSO or Federated ID trust, which affects user access to cloud documents and Libraries. ' : ''}User content does not always migrate cleanly. Ask Adobe to include migration support — named technical resources or Expert Sessions — at no charge, and plan a period where both consoles run in parallel rather than a single cut-over.`,
    });
  }
  if (comp.includes('anniversaries')) {
    items.push({
      priority: 'should', title: 'Co-term every agreement onto one date',
      desc: 'Contracts with different anniversary dates mean several small renewals, each negotiated at a fraction of the combined spend. Use this renewal to co-term everything onto a single date — ideally one that falls in Adobe\'s fiscal Q4 — with prorated pricing for the stub periods.',
    });
  }
  if (comp.includes('tsa')) {
    items.push({
      priority: 'must', title: 'Transition services need explicit license language',
      desc: 'A transition services agreement that promises "continued access to software" does not by itself grant Adobe license rights to a company outside your corporate group. The TSA period needs matching language in your Adobe agreement — permitted users, duration, and whether the carve-out pays its share during the transition.',
    });
  }
  if (comp.includes('assets')) {
    items.push({
      priority: 'should', title: 'Content and licensed assets need a plan',
      desc: 'Brand assets in Creative Cloud Libraries, Experience Manager repositories, Frame.io projects and review history, Acrobat Sign agreement records, and Adobe Stock licensed assets are tied to the licensing organization. Confirm how Stock licenses carry over for assets used in the other entity\'s materials, and export or migrate Sign audit trails and AEM content before any entitlement ends.',
    });
  }

  const order = { must: 0, should: 1, nice: 2 };
  items.sort((a, b) => order[a.priority] - order[b.priority]);
  return { stageNote, items, material };
}

function mnaSectionHTML(s, mna) {
  return `
    <div class="strategy-section">
      <div class="section-header">
        <span class="section-icon">🔀</span>
        <h3>M&amp;A Implications</h3>
        <span class="section-badge ${mna.material ? '' : 'blue'}">${MNA_TYPE_LABELS[s.mnaType] || 'Transaction'} · ${MNA_STAGE_LABELS[s.mnaStage] || ''}</span>
      </div>
      <div class="section-content">
        <p style="font-size:.92rem;line-height:1.7;color:var(--text-secondary);">${mna.stageNote}</p>
        ${s.mnaUserImpact ? `<p style="font-size:.85rem;line-height:1.7;color:var(--text-muted);margin-top:8px;">Expected change in Adobe users: <strong>${MNA_IMPACT_LABELS[s.mnaUserImpact]}</strong>.${mna.material ? ' At this scale, re-baseline every quantity and metric in the agreement rather than adjusting at the margins.' : ''}</p>` : ''}
        <div class="concessions-grid" style="margin-top:16px;">${mna.items.map(c => `
          <div class="concession-card">
            <div class="cc-title">${c.title}</div>
            <div class="cc-desc">${c.desc}</div>
            <div class="cc-priority priority-${c.priority}">${c.priority === 'must' ? '🔴 Must Address' : '🟡 Should Address'}</div>
          </div>`).join('')}
        </div>
        <p style="margin-top:14px;font-size:.82rem;line-height:1.7;color:var(--text-muted);">
          Adobe's own acquisitions — Semrush, Topaz Labs (closed September 23, 2026), and the abandoned Figma deal — are covered in the Corporate &amp; Pricing Context section above. Commercial guidance only; have counsel review the actual assignment and affiliate clauses.
        </p>
      </div>
    </div>`;
}

// ─── Alerts ───────────────────────────────────────────────────────────────────
function buildAlerts(s, tier, leverage, fc) {
  const alerts = [];

  if (s.noticeStatus === 'passed') {
    alerts.push({ type: 'danger', icon: '🚨', text: '<strong>Auto-renewal notice window has passed.</strong> Your agreement may already have renewed at Adobe\'s current pricing. Pull the agreement today and confirm the exact notice language and renewal date. If it has renewed, your remaining routes are a mutual amendment, trading a planned expansion for relief, or negotiating the <em>next</em> cycle now while there is runway.' });
  } else if (s.noticeStatus === 'imminent') {
    alerts.push({ type: 'danger', icon: '⏰', text: '<strong>Your notice window closes within 30 days.</strong> Serve written notice of intent to renegotiate now. It is not a commitment to leave — it preserves your right to negotiate and stops the agreement rolling over on Adobe\'s terms.' });
  } else if (s.noticeStatus === 'unknown') {
    alerts.push({ type: 'warning', icon: '❓', text: '<strong>You do not know your notice period.</strong> Find it first. VIP memberships renew automatically at each anniversary unless cancelled, and ETLA and Experience Cloud agreements carry their own notice terms. Check the agreement, the order, and the reseller\'s terms — the clause may sit in any of them.' });
  }

  if (s.renewalTimeline === 'within-1mo') {
    alerts.push({ type: 'danger', icon: '🚨', text: '<strong>Less than 30 days to renewal.</strong> Do not sign under deadline pressure. Request a short extension of current terms in writing while you negotiate — and if the date falls just before Adobe\'s fiscal year end, the extension itself can move you into a stronger window.' });
  }

  if (s.priceProtection === 'expiring') {
    alerts.push({ type: 'warning', icon: '📈', text: '<strong>Your price lock ends at this renewal.</strong> Your current prices were set before Adobe\'s April and June 2026 increases, so the renewal quote will reset to today\'s list before any discount is applied. Ask for the renewal priced against your <em>current</em> unit prices, not against the new list.' });
  }

  if (s.agreementType === 'vip' && tier >= 2) {
    alerts.push({ type: 'warning', icon: '🧾', text: `<strong>You are spending ${ACV_TIERS[s.annualSpend].label} a year on VIP.</strong> At this size VIP's published pricelist is almost certainly costing you money — the June 2026 changes removed or cut most VIP volume discounts. Price an ETLA or a 3-Year Commit side by side before your next anniversary.` });
  }

  if (s.licenseUtilization === 'unknown') {
    alerts.push({ type: 'warning', icon: '📊', text: '<strong>License utilization has never been measured.</strong> The Admin Console license and last-activity reports show this in an afternoon. In estates never audited, idle seats commonly run 10–25% of licensed volume, and Creative Cloud Pro seats are often assigned to people who only open Acrobat or Photoshop.' });
  }

  if (s.purchaseChannel === 'several' || s.costPressures?.includes('sprawl')) {
    alerts.push({ type: 'info', icon: '💳', text: '<strong>Adobe licenses are being bought outside your main agreement.</strong> Card and team-plan purchases are billed at list, renew silently, and are invisible when you negotiate — while Adobe sees all of it. Inventory them through expense data and every Admin Console, and bring them into the renewal volume.' });
  }

  if (s.costPressures?.includes('credits') || s.changeEvents?.includes('ai')) {
    alerts.push({ type: 'info', icon: '✨', text: '<strong>Generative AI is in play.</strong> Adobe now builds generative credits into most plans and has cited AI as the reason for price increases. It also has aggressive AI growth targets — AI-first ARR grew more than 150% year over year in Q3 FY26. Willingness to adopt Firefly or GenStudio is worth real concessions; don\'t let it arrive as an assumed add-on.' });
  }

  if (s.metricPosition === 'over') {
    alerts.push({ type: 'warning', icon: '📊', text: '<strong>You are exceeding contracted Experience Cloud metrics.</strong> Overage is typically billed above your contracted rate. Raise the metric at renewal at the contracted unit price rather than paying overage, and ask whether prior overage can be credited against the new commitment.' });
  }

  if (s.alternative === 'none' && tier >= 3) {
    alerts.push({ type: 'warning', icon: '⚡', text: '<strong>No competitive alternative identified.</strong> At your contract size this materially weakens your position. You do not need to replace Adobe everywhere — a documented Canva pilot for marketing content, or a PDF-tool evaluation for Acrobat users, changes the tenor of the negotiation.' });
  }

  if (s.mnaEnabled && s.mnaStage === 'confidential') {
    alerts.push({ type: 'danger', icon: '🔒', text: '<strong>The M&amp;A transaction is confidential.</strong> Do not reference it to Adobe or your reseller. Ask for assignment, co-terming, and flexibility terms as standard contract hygiene, and keep the M&amp;A section of this plan internal.' });
  }

  return alerts;
}

// ─── Tactics ──────────────────────────────────────────────────────────────────
function buildTactics(s, tier, leverage, fc, increase) {
  const tactics = [];

  if (['under60', '60-75', 'unknown'].includes(s.licenseUtilization)) {
    tactics.push({
      title: 'Audit Every Admin Console and Negotiate Against Real Usage',
      desc: `Pull license assignment and last-activity reports from every Admin Console before discussing price. ${hasEtla(s) ? 'ETLA quantities generally rise at each true-up but cannot fall until renewal, so every idle seat you carry through this renewal you carry for the full term. ' : ''}Reclaim licenses from leavers and inactive users, then present the corrected quantity as your starting position. A seat removed is worth more than a discount on it, because it also lowers the base every future increase applies to.`,
      impact: 'high',
    });
  }

  if (s.products?.includes('ccpro') && ['high', 'some', 'unknown'].includes(s.appFit)) {
    tactics.push({
      title: 'Match Creative Cloud Pro Seats to What People Actually Use',
      desc: 'Creative Cloud Pro is often assigned by default to anyone who needs a single app. Use app-launch data from the Admin Console to find users working in only one or two applications and move them to single-app plans, Acrobat, or Adobe Express. Do this before the renewal quote is built — once the mix is on the order form, Adobe prices your discount against it.',
      impact: s.appFit === 'high' ? 'high' : 'medium',
    });
  }

  if (s.agreementType === 'vip' && tier >= 1) {
    tactics.push({
      title: 'Price an ETLA or 3-Year Commit Against Staying on VIP',
      desc: `VIP is a price list with little room to negotiate, and its volume discounts were cut in June 2026. ${tier >= 2 ? 'At your spend an ETLA is realistic: it fixes unit pricing for three years, allows annual true-ups at contracted rates, and puts the deal in front of someone with discretion.' : 'A 3-Year Commit (10+ licenses) is the lighter option: it locks pricing for three years without an enterprise agreement.'} Ask for both structures side by side so the value of the commitment is explicit.`,
      impact: 'high',
    });
  } else if (s.agreementType === 'vip3yc' && s.priceProtection === 'expiring') {
    tactics.push({
      title: 'Renew the 3-Year Commit Before the Lock Lapses',
      desc: 'Your 3YC protected you from the 2026 increases; when it ends, the next anniversary resets to current list. Re-commit before expiry and ask your reseller whether an early re-commitment can hold pricing closer to your current rates — and at your size, price an ETLA alongside it.',
      impact: 'high',
    });
  }

  tactics.push({
    title: 'Fix the Price for the Full Term, Including Growth',
    desc: `Expect Adobe's renewal pricing to land around ${increase.askLo}–${increase.askHi}% above today. Make a fixed unit price for the full term a condition of signature, and make sure it covers true-up and add-on licenses too — not only the base quantity. After two 2026 list increases, protection that stops at the base quantity is protection that leaks.`,
    impact: 'high',
  });

  if (fc && fc.strength !== 'peak') {
    tactics.push({
      title: 'Move the Decision Into Adobe\'s Fiscal Q4 If You Can',
      desc: `Your renewal falls in fiscal ${fc.quarter}${fc.strength === 'weak' ? ', away from any quota deadline' : ' at quarter end'}. Adobe's year closes on the Friday nearest November 30, and deal desks are most flexible in September through November. An early renewal or short extension that places the decision in that window can be worth several points. Ask early; asking in the final weeks reads as pressure rather than planning.`,
      impact: fc.strength === 'weak' ? 'high' : 'medium',
    });
  } else if (fc?.strength === 'peak') {
    tactics.push({
      title: 'Use Your Q4 Timing Deliberately',
      desc: 'Your renewal sits in Adobe\'s strongest quota period — and for 2026 it is also the last quarter before the CEO transition on December 1. Hold the final decision until late in the window, make clear signature is available before Adobe\'s year end if terms land, and be specific about what "terms land" means.',
      impact: 'high',
    });
  }

  const vendorPlays = {
    canva: 'Scope a Canva pilot for marketing and social content — the users most likely to hold Creative Cloud seats they barely use.',
    figma: 'Scope Figma for UI and product design teams currently licensed through Creative Cloud Pro.',
    pdf: 'Pilot a PDF tool with Acrobat users who only view, comment on, or fill documents.',
    microsoft: 'Document which Acrobat use cases Microsoft 365 already covers — viewing, basic editing, conversion.',
    docusign: 'Price DocuSign for your Acrobat Sign transaction volume, with migration of templates and workflows.',
    salesforce: 'Build a costed comparison of Salesforce Marketing Cloud or Data Cloud for the workloads on Experience Platform or Marketo.',
    dxp: 'Scope Sitecore, Optimizely, or Contentful for one site or brand currently on Experience Manager.',
    google: 'Document which Adobe Analytics reporting could move to GA4 or Amplitude, and at what cost.',
  };
  if (s.alternative === 'none' || s.alternative === 'theoretical') {
    tactics.push({
      title: 'Build a Credible Alternative for Part of the Estate',
      desc: `Adobe prices against workflow lock-in, and almost no enterprise can replace all of Adobe. You don't need to — you need a credible alternative for the part of the estate that is least dependent on it. ${vendorPlays[s.alternativeVendor] || 'Pick the least-dependent user group — often Acrobat-only or occasional marketing users — and scope a real alternative for them.'} Document it and let the account team know an evaluation is underway.`,
      impact: 'high',
    });
  } else {
    tactics.push({
      title: 'Make Your Alternative Specific and Quantified',
      desc: `A vague threat is discounted by every experienced account team. Convert yours into specifics with ${VENDOR_LABELS[s.alternativeVendor] || 'your alternative'}: which user groups or workloads move, how many licenses that removes, the timeline, and the cost of switching. A costed partial migration is a real risk to the account; "we're looking at options" is priced as posture.`,
      impact: 'high',
    });
  }

  if (s.purchaseChannel === 'reseller') {
    tactics.push({
      title: 'Compete the Reseller Margin',
      desc: 'Adobe enterprise and VIP deals commonly flow through a Licensing Account Reseller, whose margin sits on top of Adobe\'s price. Once Adobe\'s pricing is agreed, invite two or three resellers to bid on fulfilling the same deal. The reseller margin is a separate, often overlooked pool — and resellers can sometimes access Adobe promotions your incumbent has not offered.',
      impact: 'medium',
    });
  }

  if (s.purchaseChannel === 'several' || s.costPressures?.includes('sprawl') || s.costPressures?.includes('consoles')) {
    tactics.push({
      title: 'Consolidate Every Adobe Purchase Into One Agreement',
      desc: 'Card purchases, team plans, separate VIP memberships, and multiple Admin Consoles each renew on their own terms, usually at list, and each is invisible when you negotiate. Bring them into one agreement and one console at this renewal. It raises your negotiated volume and removes a steady stream of list-price renewals.',
      impact: 'high',
    });
  }

  if (s.trueupPosition === 'over') {
    tactics.push({
      title: 'Re-Baseline the ETLA So True-Ups Stop Surprising You',
      desc: 'Large true-up invoices mean your contracted quantities lag real deployment. Set the renewal baseline at your actual deployed quantity (after right-sizing), and make sure future true-ups are priced at contracted unit rates, billed annually rather than more often, and prorated to when licenses were actually deployed.',
      impact: 'medium',
    });
  } else if (s.trueupPosition === 'under') {
    tactics.push({
      title: 'Reset ETLA Quantities Down at Renewal',
      desc: 'You are paying for ETLA quantities you have not deployed, and renewal is typically the only point at which they can be reduced. Set the new baseline at deployed quantity plus a modest growth buffer, and add the right to reduce at each anniversary so the gap cannot reopen.',
      impact: 'high',
    });
  }

  if (hasAny(s, EXPERIENCE_PRODUCTS) && (['over', 'under'].includes(s.metricPosition) || s.costPressures?.includes('shelfmodules'))) {
    tactics.push({
      title: 'Resize Experience Cloud Capacity and Modules',
      desc: `${s.metricPosition === 'over' ? 'You are exceeding contracted metrics: raise them at your contracted unit price instead of paying overage, and ask for prior overage to be credited. ' : ''}${s.metricPosition === 'under' ? 'You are buying capacity you do not use: bring profiles, server calls, or page views down to observed volume plus headroom. ' : ''}${s.costPressures?.includes('shelfmodules') ? 'Modules bought but never implemented should be dropped, swapped for something you will use, or converted into implementation credit — not renewed for another term. ' : ''}Ask for metric headroom with a grace period rather than hard overage triggers.`,
      impact: 'high',
    });
  }

  if (s.changeEvents?.includes('ai') || s.products?.includes('firefly') || s.costPressures?.includes('credits')) {
    tactics.push({
      title: 'Price Generative AI Separately and on Your Terms',
      desc: 'Adobe is pushing Firefly, GenStudio, and AI Assistant against internal growth targets. Keep AI pricing separate from the core renewal so it cannot hide an increase. Negotiate a pooled generative-credit allowance across users, rollover of unused credits, a fixed price for additional credits, and a no-cost pilot period before any paid commitment. Use your willingness to adopt as currency against the core deal.',
      impact: s.changeEvents?.includes('ai') ? 'high' : 'medium',
    });
  }

  // Frame.io: Creative Cloud subscriptions include a Frame.io entitlement, so
  // separately purchased Frame.io plans often pay for collaboration users who
  // already have access through their Creative Cloud license.
  if (s.products?.includes('frameio')) {
    const hasCC = s.products.includes('ccpro') || s.products.includes('ccsingle');
    tactics.push({
      title: 'Reconcile Paid Frame.io Against What Creative Cloud Already Includes',
      desc: `${hasCC ? 'Creative Cloud subscriptions include a Frame.io entitlement — dedicated storage and a limited number of projects — at no extra charge. Frame.io Pro, Team, and Enterprise plans are billed separately, so check whether the paid seats you hold belong to people who already have access through Creative Cloud. ' : ''}Frame.io storage scales with paid seats, which pushes storage-heavy video teams to buy members they do not need just to get capacity. Negotiate storage as its own line rather than as a by-product of seat count, bring Frame.io into the same agreement and anniversary as the rest of your Adobe estate${hasEtla(s) ? ' rather than a separate Frame.io order' : ''}, and archive completed projects before renewal so you are not sizing storage against footage nobody will open again.`,
      impact: hasCC ? 'medium' : 'low',
    });
  }

  if (s.changeEvents?.includes('platform')) {
    tactics.push({
      title: 'Keep a Platform Bundle Separable',
      desc: 'Adobe is packaging Experience Manager, Experience Platform, Commerce, and now Semrush into CX Enterprise. A platform bundle can be good value, but it hides which components are discounted and makes dropping one impossible without reopening the whole deal. Require line-item pricing per module, the right to remove a module at anniversary, and a comparison against renewing your current modules separately.',
      impact: 'high',
    });
  }

  if (s.changeEvents?.includes('expansion') || s.changeEvents?.includes('consolidation')) {
    tactics.push({
      title: 'Hold Planned Expansion Back as Currency',
      desc: 'Growth you have already decided on is the most valuable thing you bring to a renewal — and the easiest to give away by mentioning it early. Settle core terms first, then trade the expansion explicitly: available at signature, priced at the renewal discount, contingent on price protection and reduction rights.',
      impact: 'high',
    });
  }

  if (s.mnaEnabled && s.mnaStage !== 'confidential' && ['acquiring', 'merger'].includes(s.mnaType)) {
    tactics.push({
      title: 'Negotiate the Combined Account Once, Not Twice',
      desc: 'Adobe will want to renew each legacy contract separately, on its own date, at its own price. Insist on one negotiation for the combined estate: co-termed dates, the better of the two unit prices, credit for unused term on the contract being retired, and migration support included. See the M&A Implications section for the full list.',
      impact: 'high',
    });
  }

  const longTerm = s.desiredTerm === '3yr' || s.desiredTerm === 'undecided';
  if (longTerm) {
    tactics.push({
      title: 'Commit to Three Years Only With Swap and Reduction Rights',
      desc: 'Three years is the standard ETLA and 3YC term, and it is worth real pricing. Only trade the flexibility if the term carries protections: the right to swap licenses between products of equal value (e.g., Creative Cloud Pro to single-app or Acrobat), the right to reduce quantities at each anniversary within a stated percentage, and pricing that holds for true-ups. Without them, three years converts your flexibility into Adobe\'s certainty.',
      impact: 'medium',
    });
  }

  if ((s.products?.length || 0) >= 5) {
    tactics.push({
      title: 'Demand Line-Item Pricing Across Creative and Experience Cloud',
      desc: `You hold ${s.products.length} Adobe products. Bundled or blended pricing hides which are actually discounted and makes it hard to drop one. Require per-product unit pricing on the agreement, and keep Creative/Document Cloud and Experience Cloud commercially separable.`,
      impact: 'medium',
    });
  }

  if (leverage < 40) {
    tactics.push({
      title: 'Escalate Beyond the Account Executive',
      desc: 'Your position is weak enough that the account executive has little incentive to improve the offer. The credible route is executive-to-executive: your CIO, CMO, or CFO raising the commercial relationship with an Adobe sales leader, rather than procurement pushing harder on the same contact.',
      impact: 'medium',
    });
  }

  return tactics;
}

// ─── Concessions / terms ──────────────────────────────────────────────────────
function buildConcessions(s, tier) {
  const c = [];

  c.push({ icon: '🔒', title: 'Fixed Pricing for the Term', desc: 'Unit prices fixed for the full term, applying to true-ups and add-on licenses as well as the base quantity.', priority: 'must' });
  c.push({ icon: '🧢', title: 'Renewal Increase Cap', desc: 'A written maximum on the increase at the following renewal — target 3–5% — measured against your current unit prices, not then-current list.', priority: 'must' });
  c.push({ icon: '📉', title: 'Reduction Right at Anniversary', desc: 'The right to reduce license quantities or contracted metrics at each anniversary, typically 10–20%, without re-pricing the remainder.', priority: 'must' });
  c.push({ icon: '🔁', title: 'Swap Rights', desc: 'Exchange licenses between products or plans of equal value mid-term — e.g., Creative Cloud Pro to single-app or Acrobat — at your negotiated discount.', priority: 'must' });
  if (hasEtla(s)) {
    c.push({ icon: '🧮', title: 'True-Up at Contracted Rates', desc: 'True-ups priced at contracted unit prices, billed annually, and prorated to actual deployment date.', priority: 'must' });
  }
  c.push({ icon: '📅', title: 'Extended Notice Period', desc: 'Non-renewal notice of at least 90 days, with written reminder from Adobe or the reseller before the window closes.', priority: 'should' });
  if (hasAny(s, EXPERIENCE_PRODUCTS)) {
    c.push({ icon: '📊', title: 'Metric Headroom & Overage Grace', desc: 'Contracted metrics with headroom above observed volume, and a grace period before overage charges apply.', priority: 'should' });
    c.push({ icon: '🧩', title: 'Separable Modules', desc: 'Line-item pricing per Experience Cloud module, with the right to remove a module at anniversary.', priority: 'should' });
  }
  if (s.products?.includes('firefly') || s.changeEvents?.includes('ai') || s.costPressures?.includes('credits')) {
    c.push({ icon: '✨', title: 'Generative Credit Pool', desc: 'Credits pooled across users, unused credits rolling over, and a fixed price for additional credits for the term.', priority: 'should' });
  }
  if (s.purchaseChannel === 'several' || s.costPressures?.includes('consoles') || s.costPressures?.includes('sprawl')) {
    c.push({ icon: '🗂️', title: 'Single Agreement & Co-Termination', desc: 'All Adobe purchases on one agreement and one anniversary date, with stray memberships migrated at prorated pricing.', priority: 'must' });
  }
  if (s.mnaEnabled) {
    const div = s.mnaType === 'divesting';
    c.push({ icon: '🔀', title: div ? 'Divestiture & Transition Rights' : 'M&A Assignment & Add-On Rights', desc: div
      ? 'Proportional reduction on divestiture without penalty, plus a 6–18 month transition right for the divested entity to keep using licenses.'
      : 'Assignment to a successor without consent or re-pricing, and acquired entities added at contracted pricing, co-termed.', priority: 'must' });
  }
  if (tier >= 4) {
    c.push({ icon: '👤', title: 'Named Customer Success Resource', desc: 'A named CSM or technical account manager written into the agreement, with defined engagement commitments.', priority: 'should' });
  }
  c.push({ icon: '📌', title: 'Pricing Schedule Freeze', desc: 'Contracted rates fixed at signature, with any reference to Adobe\'s published pricing pinned to a dated snapshot. Adobe changed business pricing twice in 2026 — a reference to the live pricelist lets that flow straight into your agreement.', priority: 'must' });
  c.push({ icon: '📉', title: 'Price-Down (MFN) Trigger', desc: 'If Adobe lowers the list price of a product you hold, the lower price applies at your negotiated discount. Most relevant to AI products and generative credits, where pricing is still moving.', priority: 'should' });
  c.push({ icon: '🎓', title: 'Enablement Credits', desc: 'Funded training, Expert Sessions, or implementation days — particularly valuable for new Firefly, GenStudio, or Experience Cloud adoption.', priority: 'nice' });
  c.push({ icon: '💳', title: 'Payment Terms', desc: 'Annual billing in arrears or quarterly instalments instead of full upfront prepayment, and Net-60 or better.', priority: 'nice' });
  return c;
}

// ─── Timeline ─────────────────────────────────────────────────────────────────
function buildTimeline(s, fc) {
  const urgent = ['within-1mo', '1-3mo'].includes(s.renewalTimeline);
  const mnaOn = s.mnaEnabled;
  const t = [];

  t.push({
    phase: '1', when: urgent ? 'This week' : '9–12 months before renewal',
    title: 'Establish the Facts',
    desc: 'Before any conversation with Adobe or the reseller, know your own estate better than they do.',
    tasks: [
      'Collect every Adobe agreement, VIP membership, and order; record anniversary dates, notice periods, and price protection',
      'Pull license assignment and last-activity reports from every Admin Console',
      'Find Adobe purchases on expense cards and team plans outside the main agreement',
      hasAny(s, EXPERIENCE_PRODUCTS) ? 'Compare contracted Experience Cloud metrics against 12 months of actual usage' : 'Map Creative Cloud Pro users by the apps they actually launch',
      ...(mnaOn ? [s.mnaStage === 'confidential'
        ? 'Brief deal counsel on Adobe agreements; review assignment and affiliate clauses under NDA'
        : 'Inventory the other party\'s Adobe agreements, consoles, and anniversaries (clean team if pre-close)'] : []),
    ],
  });

  t.push({
    phase: '2', when: urgent ? 'Within 2 weeks' : '6–9 months before renewal',
    title: 'Secure Your Position',
    desc: 'Protect the notice window, right-size, and build the alternative before Adobe sets the agenda.',
    tasks: [
      'Serve written notice of intent to renegotiate — this preserves rights without committing to leave',
      'Reclaim idle licenses and downgrade over-specified Creative Cloud Pro seats',
      s.alternative === 'none' || s.alternative === 'theoretical'
        ? 'Open a scoped evaluation of one alternative for the least-dependent user group'
        : 'Convert your alternative into a costed partial-migration scenario',
      isVip(s) ? 'Request VIP, 3-Year Commit, and ETLA pricing side by side' : 'Agree internally on walk-away position and decision owner',
      ...(mnaOn ? ['Model the combined or carved-out license and metric requirement after the transaction'] : []),
    ],
  });

  t.push({
    phase: '3', when: urgent ? 'Weeks 3–4' : '4–6 months before renewal',
    title: 'Open the Negotiation',
    desc: 'Set the frame before Adobe does. The first number on the table anchors everything after it.',
    tasks: [
      'Request the renewal quote in writing with per-product unit pricing, priced against your current rates',
      'Present corrected quantities and product mix as the baseline',
      'State fixed pricing for the term — including true-ups — as a condition of signature',
      mnaOn && s.mnaStage !== 'confidential' && s.mnaType !== 'divesting'
        ? 'Put the combined account on the table as one negotiation, not separate renewals'
        : 'Do not disclose planned expansion — hold it as currency for the final round',
    ],
  });

  t.push({
    phase: '4', when: urgent ? 'Weeks 5–6' : '2–4 months before renewal',
    title: 'Trade and Escalate',
    desc: 'Concessions arrive when there is a reason for them to arrive. Create that reason.',
    tasks: [
      'Trade explicitly: expansion, AI adoption, or a multi-year term against price protection and reduction rights',
      s.purchaseChannel === 'reseller' ? 'Once Adobe pricing is agreed, run a reseller bid for fulfilment' : 'Escalate above the account executive if the offer has not moved materially',
      'Request the full redlined agreement and review the actual language, not the summary',
      fc?.strength === 'peak'
        ? 'Signal that signature is available before Adobe\'s fiscal year end if terms land'
        : 'Assess whether an early renewal or extension repositions the close into Adobe\'s Q4',
    ],
  });

  t.push({
    phase: '5', when: urgent ? 'Before signature' : 'Final 30–60 days',
    title: 'Close and Verify',
    desc: 'The agreement is the contract. Verify every negotiated term appears in it.',
    tasks: [
      'Confirm fixed pricing covers true-ups and add-ons, in writing',
      'Verify swap rights, reduction rights, and notice period are written, not verbal',
      ...(mnaOn ? ['Confirm assignment, add-on, or divestiture language matches the transaction structure counsel approved'] : []),
      'Cancel stray VIP memberships and card subscriptions being consolidated',
      'Diarize the next notice deadline and each true-up date on signature, with an owner',
    ],
  });

  return t;
}

// ─── Questions ────────────────────────────────────────────────────────────────
function buildQuestions(s, tier) {
  const q = [];
  q.push('What is the renewal price per product compared with our current unit prices, and how much of the change is list movement versus lost discount?');
  q.push('Will you fix unit pricing for the full term, and does that pricing apply to true-ups and add-on licenses?');
  q.push('What does your data show for our license utilization and app usage by product?');
  if (isVip(s)) q.push('Can you price VIP, a 3-Year Commit, and an ETLA side by side for our current volume?');
  q.push('Can we swap licenses between products of equal value during the term — for example, Creative Cloud Pro to single-app or Acrobat?');
  q.push('What reduction rights can we have at each anniversary, and up to what percentage?');
  if (hasAny(s, EXPERIENCE_PRODUCTS)) q.push('How are overage charges calculated on our contracted metrics, and can we have headroom and a grace period instead?');
  if (s.products?.includes('firefly') || s.changeEvents?.includes('ai')) q.push('How are generative credits allocated — can they be pooled, do unused credits roll over, and what do additional credits cost?');
  if (s.products?.includes('frameio')) q.push('Which of our Frame.io users are already covered by their Creative Cloud entitlement, and can Frame.io storage be priced separately from seat count?');
  if (s.changeEvents?.includes('platform') || s.products?.includes('semrush')) q.push('If we take CX Enterprise, what is the line-item price of each module, and can we remove one at anniversary?');
  if (s.mnaEnabled && s.mnaStage !== 'confidential') {
    if (s.mnaType === 'divesting') q.push('How can the divested business keep using licenses during the transition, and how do we reduce our quantities at close?');
    else q.push('How will you handle the other party\'s existing Adobe agreements — can we consolidate with credit for unused term and co-term to one date?');
  }
  if (s.mnaEnabled) q.push('Can this agreement be assigned to a successor or extended to acquired affiliates without consent or re-pricing?');
  if (tier >= 4) q.push('What named customer success resources are included at our contract value?');
  q.push('What is the notice period for non-renewal, and will you extend it to 90 days?');
  return q.slice(0, 12);
}

// ─── Risks ────────────────────────────────────────────────────────────────────
function buildRisks(s, tier, leverage) {
  const r = [];

  if (s.noticeStatus === 'passed' || s.noticeStatus === 'unknown') {
    r.push({ level: 'high', title: 'Automatic Renewal Exposure', desc: 'An unmanaged notice window is the most common way renewals are lost before they are negotiated. VIP anniversaries renew at then-current list without any conversation. Confirm every date and diarize it permanently.' });
  }
  if (s.adoptionHealth === 'critical') {
    r.push({ level: 'high', title: 'Business-Critical Dependency', desc: 'When content production or customer data runs on Adobe, a full walk-away is not credible and Adobe prices that in. Leverage has to come from right-sizing, timing, partial alternatives, and contract terms.' });
  }
  if (s.priceProtection === 'expiring' || s.agreementType === 'vip') {
    r.push({ level: 'high', title: 'Reset to 2026 List', desc: 'Adobe raised Acrobat Standard pricing in April 2026 and most VIP Creative Cloud and Acrobat pricing in June 2026. Unprotected renewals reset to the new list first and discount from there — the headline discount can look generous while the total still rises.' });
  }
  if (s.trueupPosition === 'over' && ['strong', 'aggressive'].includes(s.headcountTrajectory)) {
    r.push({ level: 'medium', title: 'True-Up Growth at the Wrong Price', desc: 'Rapid hiring on an ETLA means large true-ups. If true-ups are not pinned to contracted unit prices, growth is billed at whatever Adobe\'s pricing is at the time.' });
  }
  if (s.changeEvents?.includes('platform') || (s.products?.length || 0) >= 6) {
    r.push({ level: 'medium', title: 'Bundle Lock-In', desc: 'Platform bundles and many-product agreements make dropping one component require reopening the whole deal. Line-item pricing, separable modules, and swap rights preserve your ability to unwind later.' });
  }
  if (s.costPressures?.includes('credits') || s.changeEvents?.includes('ai')) {
    r.push({ level: 'medium', title: 'Generative AI Cost Drift', desc: 'Credit-based AI pricing is new and still moving. Without pooled allowances and a fixed overage price, consumption growth becomes an uncontrolled line item.' });
  }
  if (s.mnaEnabled) {
    if (s.mnaType === 'divesting') {
      r.push({ level: 'high', title: 'Paying for Users Who Have Left', desc: 'Without divestiture and transition rights, divested users either lose access at close or stay on your bill until renewal. Both outcomes are avoidable if negotiated before close.' });
    } else if (s.mnaType === 'acquired') {
      r.push({ level: 'high', title: 'Stranded Commitment After Close', desc: 'A long commitment signed shortly before a change of control can duplicate the acquirer\'s agreement. Keep the term short or secure consolidation rights with credit for unused term.' });
    } else {
      r.push({ level: 'medium', title: 'Duplicate Spend During Integration', desc: 'Overlapping agreements, consoles, and seats for the same people commonly persist for a full contract cycle after close. Consolidation with credit for unused term is the fix — but it must be negotiated, not assumed.' });
    }
    if (s.mnaStage === 'announced') {
      r.push({ level: 'medium', title: 'Pre-Close Information Sharing', desc: 'Comparing the two companies\' Adobe pricing before close can raise gun-jumping concerns. Use a clean team or counsel for any pre-close comparison.' });
    }
    if (s.mnaAssignment === 'consent' || s.mnaAssignment === 'unknown') {
      r.push({ level: 'medium', title: 'Consent Checkpoint at Close', desc: 'An assignment clause requiring Adobe\'s consent hands Adobe a checkpoint at the point of maximum leverage. Negotiate successor assignment rights in this renewal, before they are needed.' });
    }
  }
  if (s.alternative === 'none') {
    r.push({ level: 'high', title: 'No Walk-Away Position', desc: 'Without any alternative, every request depends on goodwill. A partial alternative for the least-dependent users is usually achievable within one cycle.' });
  }
  if (s.internalChampion === 'none') {
    r.push({ level: 'medium', title: 'No Internal Decision Owner', desc: 'Adobe spend often splits across Creative, Marketing, and IT with nobody owning the whole. Assign ownership before engaging Adobe.' });
  }
  if (!r.length) {
    r.push({ level: 'low', title: 'No Material Structural Risks Identified', desc: 'Your inputs do not surface the common failure modes. Focus the negotiation on fixed pricing for the term, reduction rights, and swap rights.' });
  }
  return r;
}

// ─── Strategy generation & export ─────────────────────────────────────────────
function generateStrategy() {
  document.body.classList.remove('is-sample');
  if (!validateStep(3)) return;
  collectStep(3);
  document.getElementById('strategy-output').innerHTML = buildStrategyHTML(state);
  goToStep(4);
}

function printStrategy() { window.print(); }

// ─── Sample output ──────────────────────────────────────────────────────────
// A fixed, illustrative client profile, consistent with the other Proxima
// planners. M&A is switched on so the demo shows the full module.
const SAMPLE_PROFILE = 'Mid-market SaaS company · $1M–$2.5M Adobe ACV on an ETLA, acquiring a VIP customer';
const SAMPLE_STATE = {
  companySize: 'midmarket',
  annualSpend: '1m-2500k',
  agreementType: 'etla',
  purchaseChannel: 'reseller',
  headcountTrajectory: 'modest',
  renewalMonth: '10',
  renewalTimeline: '6-12mo',
  noticeStatus: 'open',
  priceProtection: 'expiring',
  desiredTerm: '3yr',
  products: ['ccpro', 'acrobat', 'firefly', 'aem', 'workfront'],
  licenseUtilization: '75-90',
  appFit: 'some',
  trueupPosition: 'over',
  metricPosition: 'near',
  adoptionHealth: 'good',
  costPressures: ['listincrease', 'credits'],
  alternative: 'theoretical',
  alternativeVendor: 'canva',
  relationshipQuality: 'moderate',
  previousNegotiation: 'moderate',
  internalChampion: 'procurement',
  changeEvents: ['expansion', 'ai'],
  mnaEnabled: true,
  mnaType: 'acquiring',
  mnaStage: 'announced',
  mnaUserImpact: '10-25',
  mnaCounterparty: 'vip',
  mnaAssignment: 'unknown',
  mnaComplications: ['consoles', 'anniversaries'],
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
  const realInsight = getProximaInsight;
  getProximaInsight = () => null;
  try {
    document.getElementById('strategy-output').innerHTML = sampleBannerHTML() + buildStrategyHTML(state);
  } finally {
    getProximaInsight = realInsight;
  }
  document.body.classList.add('is-sample');
  goToStep(4);
}

// ─── Per-screen sample fill ─────────────────────────────────────────────────
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
  if (panel.contains(mnaCheckbox)) {
    mnaCheckbox.checked = !!SAMPLE_STATE.mnaEnabled;
    syncMnaPanel();
  }

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
  if (usingSample) getProximaInsight = () => null;
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
  for (let i = 1; i < OUTPUT_STEP; i++) fillSampleStep(i);
  realShowSample();
};
