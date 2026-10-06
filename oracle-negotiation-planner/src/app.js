'use strict';

/* ═══════════════════════════════════════════════════════════════════════════
   Proxima — Oracle Renewal Negotiation Planner

   MODEL NOTE
   Oracle negotiation differs structurally from the SaaS and hyperscaler
   planners:
     • Most spend is annual technical support on perpetual licenses, typically
       22% of net license fees, which rises over time. Support is the main
       thing a customer pays for and the hardest line to reduce.
     • Oracle's Technical Support Policies stop customers dropping part of a
       license set without repricing the rest. Shelfware is expensive to keep
       and hard to shed, so it is modelled at a lower recovery rate than other
       planners use.
     • Compliance is part of the commercial relationship. Audits (run by
       GLAS, formerly LMS), soft-partitioned virtualization, unlicensed database
       options and the per-employee Java metric all create claims that Oracle
       settles through purchases.
     • ULAs end in a certification or a renewal, and the deployment count at
       that moment sets the customer's position for years.
     • Oracle's fiscal year ends May 31, so March–May is the quota-pressure
       window, with smaller peaks at the end of August, November and February.
   The engine models a support increase outlook, a discount-off-list target
   for new purchases, a support-recovery estimate, and Java exposure under the
   employee metric. An optional M&A module adds transaction implications.

   Ranges are directional estimates drawn from publicly reported procurement
   practice. Oracle publishes no negotiated discount or support increase data.
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
    1: ['annual-spend', 'primary-contract', 'event-type', 'audit-status', 'renewal-month', 'renewal-timeline', 'estate-direction'],
    2: ['deployment', 'shelfware', 'java-position', 'support-stream', 'compliance-confidence'],
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
    state.primaryContract = document.getElementById('primary-contract').value;
    state.eventType = document.getElementById('event-type').value;
    state.auditStatus = document.getElementById('audit-status').value;
    state.renewalMonth = document.getElementById('renewal-month').value;
    state.renewalTimeline = document.getElementById('renewal-timeline').value;
    state.priceProtection = document.getElementById('price-protection').value;
    state.estateDirection = document.getElementById('estate-direction').value;
  }
  if (step === 2) {
    state.products = [...document.querySelectorAll('#products .selected')].map(c => c.dataset.value);
    state.deployment = document.getElementById('deployment').value;
    state.shelfware = document.getElementById('shelfware').value;
    state.javaPosition = document.getElementById('java-position').value;
    state.supportStream = document.getElementById('support-stream').value;
    state.complianceConfidence = document.getElementById('compliance-confidence').value;
    state.ulaPosition = document.getElementById('ula-position').value;
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

/* ─── Oracle corporate & licensing context ────────────────────────────────────
   Unlike the percentage ranges elsewhere in this file, these are dated,
   sourced events. Each row's `when` decides whether it is shown.

   Sources checked September 16, 2026:
     • Q1 FY27 results (RPO $664B, OCI revenue +121%) — oracle.com news, Sep 10, 2026
     • FY26 results (capex $55.7B, $43B debt raised) — investor.oracle.com, Jun 10, 2026
     • Layoffs / restructuring — CNBC, Mar 31, 2026; restructuring plan in Oracle SEC filings
     • Co-CEOs Clay Magouyrk and Mike Sicilia — Oracle announcement, Sep 22, 2025
     • JDK 21 NFTC end — Oracle Java blog ("JDK 21 approaches end-of-permissive license")
     • Database 19c support extension — Oracle, Nov 19, 2024 (Premier to Dec 31, 2029)
     • Java SE Universal Subscription — Oracle Java SE global price list, Jan 23, 2023
     • Oracle Support Rewards — Oracle, 2021 program terms
   Re-verify at each monthly review.
   ──────────────────────────────────────────────────────────────────────────── */
const ORACLE_CONTEXT = {
  verifiedOn: 'September 16, 2026',
  rows: [
    {
      id: 'ai-capex', kind: 'corporate', date: 'Sep 10, 2026',
      event: 'AI infrastructure build-out',
      detail: 'Q1 FY27: remaining performance obligations of $664B and cloud infrastructure revenue up 121%. FY26 capital expenditure was $55.7B, funded partly by $43B of new debt.',
      implication: 'Oracle\'s growth story and executive attention are OCI and AI capacity. Expect account teams to steer on-premises support conversations toward cloud commitments. That can be leverage if you have Oracle workloads to move, but don\'t sign a cloud commitment larger than you will actually use just to get relief on support.',
      when: () => true,
    },
    {
      id: 'layoffs', kind: 'corporate', date: 'Mar 31, 2026',
      event: 'Layoffs and restructuring',
      detail: 'Oracle cut thousands of roles starting March 31, 2026, under a multi-billion-dollar restructuring plan disclosed in its SEC filings, to redirect spending toward AI data centers.',
      implication: 'Account teams and support organizations have been reshuffled. Verbal assurances from a previous rep are worth nothing. Get every commitment into the ordering document, and confirm who owns your account before the negotiation starts.',
      when: () => true,
    },
    {
      id: 'coceo', kind: 'corporate', date: 'Sep 22, 2025',
      event: 'Co-CEO structure',
      detail: 'Clay Magouyrk (formerly president of Oracle Cloud Infrastructure) and Mike Sicilia (formerly president of Oracle Industries) became co-CEOs. Safra Catz moved to Executive Vice Chair.',
      implication: 'Leadership comes from cloud infrastructure and industry applications. Proposals that grow OCI, multicloud database, or industry cloud adoption get more internal sponsorship than a flat renewal of on-premises support.',
      when: () => true,
    },
    {
      id: 'jdk21', kind: 'licensing', date: 'Sep 2026',
      event: 'Free updates for JDK 21 end',
      detail: 'Oracle JDK 21 updates were free under the No-Fee Terms and Conditions (NFTC) until September 2026. Starting with the October 2026 Critical Patch Update, further JDK 21 updates are under the Java SE OTN license, which requires a subscription for commercial production use. JDK 25 stays under NFTC until September 2028.',
      implication: 'If teams install Oracle JDK 21 updates from October 2026 onward, they create a subscription requirement under the per-employee metric. Move to JDK 25 or an OpenJDK build before then, and block automatic update channels that pull Oracle JDK.',
      when: s => s.products?.includes('java') || ['none-used', 'unknown', 'legacy'].includes(s.javaPosition),
    },
    {
      id: 'java-metric', kind: 'licensing', date: 'Jan 23, 2023',
      event: 'Java SE Universal Subscription (per employee)',
      detail: 'Oracle stopped selling Java SE subscriptions by Named User Plus and Processor. The Universal Subscription is priced per employee, lists from $15 down to $5.25 per employee per month by volume band, and counts all full-time, part-time and temporary employees plus contractors and agents supporting internal operations.',
      implication: 'The cost is set by your headcount, not by how much Java you run. Legacy subscriptions are usually moved to the employee metric at renewal, often at a large multiple of the current cost. Ask in writing whether your legacy metric can renew as-is before assuming it can\'t.',
      when: s => s.products?.includes('java') || !['na', 'openjdk', ''].includes(s.javaPosition ?? ''),
    },
    {
      id: 'db19c', kind: 'licensing', date: 'Nov 19, 2024',
      event: 'Database 19c support extended',
      detail: 'Premier Support for Database 19c now runs to December 31, 2029, and Extended Support to December 31, 2032. From May 1, 2027, 19c support excludes Java-related components, BSAFE crypto libraries and FIPS compliance.',
      implication: 'There is no support deadline forcing a database upgrade before 2029. Resist upgrade or migration pressure presented as urgent, and use the longer runway to plan a move to PostgreSQL or cloud at your own pace.',
      when: s => s.products?.includes('db') || s.products?.includes('dboptions'),
    },
    {
      id: 'support-rewards', kind: 'licensing', date: '2021 — ongoing',
      event: 'Oracle Support Rewards',
      detail: 'OCI consumption earns credits against on-premises technology license support: $0.25 per $1 of OCI spend, or $0.33 for ULA customers.',
      implication: 'These credits are real, but they only pay back if the OCI spend would have happened anyway. Model the support you save against the OCI commitment you take on. Support Rewards applies to technology support, not application support.',
      when: s => s.products?.includes('oci') || s.changeEvents?.includes('ocipush') || s.estateDirection === 'cloud' || s.eventType === 'cloud',
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
  db: 'Database EE', dboptions: 'DB Options & Packs', middleware: 'WebLogic / Middleware', java: 'Java SE',
  ebs: 'E-Business Suite', peoplesoft: 'PeopleSoft', jde: 'JD Edwards', siebel: 'Siebel / Hyperion',
  fusion: 'Fusion Cloud', netsuite: 'NetSuite', oci: 'OCI', exadata: 'Exadata',
  multicloud: 'Oracle Database@Hyperscaler', mysql: 'MySQL Enterprise',
};
const TECH_PRODUCTS = ['db', 'dboptions', 'middleware', 'java', 'exadata', 'mysql'];
const ONPREM_APPS = ['ebs', 'peoplesoft', 'jde', 'siebel'];
const CLOUD_PRODUCTS = ['fusion', 'netsuite', 'oci', 'multicloud'];

const VENDOR_LABELS = {
  postgres: 'PostgreSQL', sqlserver: 'Microsoft SQL Server', thirdparty: 'third-party support',
  openjdk: 'OpenJDK builds', apps: 'SAP, Workday or Microsoft Dynamics', hyperscaler: 'AWS, Azure or Google Cloud',
  none: 'no credible alternative',
};

const CONTRACT_LABELS = {
  perpetual: 'Perpetual + support', ula: 'ULA', pula: 'Perpetual ULA', saas: 'Oracle SaaS',
  oci: 'OCI Universal Credits', mixed: 'On-prem + cloud', unknown: 'Contract structure unknown',
};

const EVENT_LABELS = {
  support: 'Support renewal', purchase: 'New purchase', 'ula-end': 'ULA end', 'saas-renewal': 'SaaS renewal',
  cloud: 'Cloud commitment', java: 'Java subscription', audit: 'Audit settlement',
};

const hasAny = (s, list) => list.some(p => s.products?.includes(p));
const isUla = s => s.primaryContract === 'ula';
const auditActive = s => ['notice', 'inprogress', 'findings'].includes(s.auditStatus) || s.eventType === 'audit';
const javaExposed = s => ['none-used', 'legacy', 'unknown'].includes(s.javaPosition);

// Oracle fiscal year ends May 31.
// Q1 = Jun–Aug, Q2 = Sep–Nov, Q3 = Dec–Feb, Q4 = Mar–May.
const FISCAL_QUARTER = {
  6: 'Q1', 7: 'Q1', 8: 'Q1', 9: 'Q2', 10: 'Q2', 11: 'Q2',
  12: 'Q3', 1: 'Q3', 2: 'Q3', 3: 'Q4', 4: 'Q4', 5: 'Q4',
};

function fiscalContext(month) {
  const m = parseInt(month, 10);
  const q = FISCAL_QUARTER[m];
  if (!q) return null;
  if (m === 5) {
    return {
      quarter: 'Q4', strength: 'peak', bonus: 12,
      note: 'Your decision lands in May, the final month of Oracle\'s fiscal year, which closes May 31. This is Oracle\'s highest-leverage window. License sales are heavily concentrated at year end, and approval for deep discounts is easiest to get in the last weeks of May.',
    };
  }
  if (q === 'Q4') {
    return {
      quarter: 'Q4', strength: 'peak', bonus: 10,
      note: 'Your decision lands in Oracle\'s fiscal Q4 (March–May), its strongest quota period. A decision you can hold until late May without putting support continuity at risk gets the most out of this window.',
    };
  }
  if ([8, 11, 2].includes(m)) {
    return {
      quarter: q, strength: 'good', bonus: 6,
      note: `Your decision lands at the close of Oracle's fiscal ${q}. Oracle is known for pushing deals through at quarter end, so the pressure is real, though it falls well short of the March–May Q4 window.`,
    };
  }
  return {
    quarter: q, strength: 'weak', bonus: 0,
    note: `Your decision falls mid-quarter in Oracle's fiscal ${q}, away from any quota deadline${m === 6 ? '. June is also the first month of Oracle\'s new fiscal year, when urgency is at its lowest' : ''}. Support renewals are dated by contract, but purchases, ULA renewals, cloud commitments and audit settlements can often be timed to land at a quarter end.`,
  };
}

// Java SE Universal Subscription list bands, per employee per month
// (Oracle global price list, January 2023). 50,000+ is quoted by Oracle.
const JAVA_BANDS = [
  [999, 15], [2999, 12], [9999, 10.5], [19999, 8.25], [29999, 6.75], [39999, 5.7], [49999, 5.25],
];
// A representative headcount per company-size card. The output tells users to
// substitute their real employee count as Oracle defines it.
const SIZE_HEADCOUNT = { smb: 500, midmarket: 2500, enterprise: 12000, global: 40000 };

function javaExposureEstimate(s) {
  const heads = SIZE_HEADCOUNT[s.companySize];
  if (!heads) return null;
  const band = JAVA_BANDS.find(([max]) => heads <= max);
  if (!band) return null;
  return { heads, rate: band[1], annual: Math.round(heads * band[1] * 12) };
}

// ─── Deal calibration hook (shared across Proxima planners) ──────────────────
// Oracle uses the shared SaaS-scale spend tiers (keys carry the historical
// `sf-` prefix). Oracle deals are filtered by provider, not by prefix.
const ACV_TO_CAL_TIER = {
  'under100k': 'sf-under100k', '100k-250k': 'sf-100k-250k', '250k-500k': 'sf-250k-500k',
  '500k-1m': 'sf-500k-1m', '1m-2500k': 'sf-1m-2500k', '2500k-5m': 'sf-2500k-5m',
  '5m-10m': 'sf-5m-10m', '10mplus': 'sf-10mplus',
};

function getProximaInsight(calTier) {
  try {
    const deals = JSON.parse(localStorage.getItem('proxima-deals') || '[]');
    const or = deals.filter(d => d.provider === 'oracle');
    if (!or.length) return null;
    const tierDeals = calTier ? or.filter(d => d.tier === calTier) : [];
    const relevant = tierDeals.length >= 2 ? tierDeals : or;
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

  const altMap = { dual: 22, evaluating: 17, theoretical: 6, none: 0 };
  score += altMap[s.alternative] ?? 0;
  // A third-party support quote is the one alternative Oracle cannot discount away
  if (s.supportStream === 'thirdparty') score += 6;
  else if (s.supportStream === 'considering') score += 3;

  // Fiscal timing only matters where the date can move; support renewals are fixed
  const fc = fiscalContext(s.renewalMonth);
  const timingWeight = s.eventType === 'support' ? 0.4 : 1;
  score += fc ? Math.round(fc.bonus * timingWeight) : 0;

  const runwayMap = { '12plusmo': 14, '6-12mo': 14, '3-6mo': 9, '1-3mo': 4, 'within-1mo': 0 };
  score += runwayMap[s.renewalTimeline] ?? 0;

  // Compliance exposure is Oracle's strongest card
  const auditMap = { none: 6, closed: 4, soft: 2, notice: -4, inprogress: -8, findings: -12 };
  score += auditMap[s.auditStatus] ?? 0;
  const confMap = { high: 8, moderate: 3, low: -6, unknown: -3 };
  score += confMap[s.complianceConfidence] ?? 0;
  if (s.deployment === 'vmware') score -= 4;
  if (s.costPressures?.includes('options')) score -= 3;
  if (javaExposed(s)) score -= 3;

  const tier = ACV_TIERS[s.annualSpend]?.tier ?? 0;
  score += Math.min(tier * 2, 12);

  // Planned reduction is a threat; growth is a carrot
  const dirMap = { reduce: 8, cloud: 6, grow: 6, hold: 2 };
  score += dirMap[s.estateDirection] ?? 0;

  const relMap = { strategic: 6, strong: 5, moderate: 3, poor: 1, none: 0 };
  score += relMap[s.relationshipQuality] ?? 0;

  const expMap = { experienced: 7, moderate: 4, basic: 2, none: 0 };
  score += expMap[s.previousNegotiation] ?? 0;

  // Change events, capped in aggregate so stacked carrots don't saturate the score
  let eventScore = 0;
  if (s.changeEvents?.includes('expansion')) eventScore += 5;
  if (s.changeEvents?.includes('hyperscaler')) eventScore += 5;
  if (s.changeEvents?.includes('appsmigration')) eventScore += 4;
  if (s.changeEvents?.includes('dcexit')) eventScore += 3;
  if (s.changeEvents?.includes('ocipush')) eventScore += 3;   // Oracle has cloud targets
  if (s.changeEvents?.includes('ulapitch')) eventScore += 2;
  const mnaAdj = mnaLeverageAdjustment(s);
  score += mnaAdj > 0 ? Math.min(Math.min(eventScore, 9) + mnaAdj, 11) : Math.min(eventScore, 9) + mnaAdj;

  if (['procurement', 'cfo', 'sam'].includes(s.internalChampion)) score += 3;
  if (s.internalChampion === 'none') score -= 3;

  return Math.max(0, Math.min(Math.round(score), 100));
}

// M&A changes leverage only once it can be used. A confidential deal cannot be
// put in front of Oracle, so it moves nothing until it is announced.
function mnaLeverageAdjustment(s) {
  if (!s.mnaEnabled || s.mnaStage === 'confidential') return 0;
  let adj = { acquiring: 3, merger: 2, acquired: -2, divesting: -4 }[s.mnaType] ?? 0;
  // Oracle licenses rarely transfer freely, so a transaction also opens a
  // compliance question Oracle can use.
  if (s.mnaAssignment !== 'permitted') adj -= 1;
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

// ─── Support / renewal increase model ─────────────────────────────────────────
function getIncreaseOutlook(s, leverage) {
  let askLo, askHi;
  if (s.priceProtection === 'capped') { askLo = 0; askHi = 4; }
  else if (s.eventType === 'saas-renewal' || s.primaryContract === 'saas') { askLo = 5; askHi = 10; }
  else if (isUla(s) && s.eventType === 'ula-end') { askLo = 3; askHi = 8; }    // renewal fee re-based on deployment
  else if (s.priceProtection === 'expiring') { askLo = 5; askHi = 9; }
  else { askLo = 3; askHi = 8; }

  if (s.costPressures?.includes('uplift')) askHi += 1;
  if (s.alternative === 'none') askHi += 1;

  let capLo, capHi;
  if (leverage >= 70) { capLo = 0; capHi = 2; }
  else if (leverage >= 55) { capLo = 0; capHi = 3; }
  else if (leverage >= 40) { capLo = 2; capHi = 4; }
  else if (leverage >= 25) { capLo = 3; capHi = 5; }
  else { capLo = 3; capHi = 7; }

  if (auditActive(s)) { capLo += 1; capHi += 1; }
  capHi = Math.min(capHi, askHi);
  capLo = Math.min(capLo, capHi);
  return { askLo, askHi, capLo, capHi };
}

// ─── Discount-off-list model (new licenses and subscriptions) ─────────────────
// Oracle's license discounts are large by SaaS standards. Support is then
// charged on the net price for as long as the license is supported, so each
// point of license discount compounds.
function getDiscountRange(s, leverage) {
  const tier = ACV_TIERS[s.annualSpend]?.tier ?? 0;
  const base = [
    [10, 25], [15, 30], [25, 40], [30, 50],
    [40, 55], [45, 60], [50, 65], [55, 75],
  ][tier] || [10, 25];

  let [lo, hi] = base;
  if (s.alternative === 'dual') { lo += 5; hi += 7; }
  else if (s.alternative === 'evaluating') { lo += 3; hi += 5; }
  else if (s.alternative === 'none') { lo -= 3; hi -= 4; }

  const fc = fiscalContext(s.renewalMonth);
  if (fc?.strength === 'peak') { lo += 4; hi += 6; }
  else if (fc?.strength === 'good') { lo += 2; hi += 3; }

  if (s.changeEvents?.includes('expansion')) { lo += 1; hi += 3; }
  // Purchases made to settle an audit get the least discount
  if (auditActive(s)) { lo -= 5; hi -= 5; }
  if (leverage < 25) hi -= 4;
  // SaaS and cloud subscriptions discount less than perpetual licenses
  if (['saas', 'oci'].includes(s.primaryContract) || ['saas-renewal', 'cloud'].includes(s.eventType)) { lo -= 8; hi -= 10; }

  lo = Math.max(0, Math.round(lo));
  hi = Math.min(Math.round(hi), 85);
  hi = Math.max(lo + 5, hi);
  return { lo, hi, midpoint: Math.round((lo + hi) / 2) };
}

// ─── Support recovery model ───────────────────────────────────────────────────
function getSupportRecoveryEstimate(s) {
  const acv = ACV_TIERS[s.annualSpend]?.mid;
  if (!acv) return null;

  const supportShare = { perpetual: 0.9, ula: 0.85, pula: 0.9, mixed: 0.55, saas: 0.1, oci: 0.1, unknown: 0.7 }[s.primaryContract] ?? 0.7;
  const supportSpend = acv * supportShare;
  const round = n => Math.round(n / 1000) * 1000;
  const lines = [];

  // Repricing rules mean only whole license sets or whole support contracts
  // come off cleanly, so recovery is modelled well below the shelfware share.
  const shelf = {
    significant: [.25, .35, 'over 25% of support on undeployed licenses'],
    some: [.10, .25, '10–25% of support on undeployed licenses'],
    little: [0, .08, 'under 10% undeployed'],
    unknown: [.08, .20, 'never reconciled'],
  }[s.shelfware];
  if (shelf && supportSpend && !['ula'].includes(s.primaryContract)) {
    lines.push({
      label: 'Terminating support on undeployed license sets',
      basis: `${shelf[2]}, at roughly 40% recoverability because repricing rules restrict partial termination`,
      lo: round(supportSpend * shelf[0] * 0.4), hi: round(supportSpend * shelf[1] * 0.4),
    });
  }

  // Third-party support vendors advertise roughly 50% off Oracle's fee. Apply
  // only to the stable part of the estate where Oracle roadmap matters less.
  const tpScope = hasAny(s, ONPREM_APPS) ? [.15, .35] : [.05, .2];
  if (['considering', 'thirdparty'].includes(s.supportStream) || s.alternativeVendor === 'thirdparty') {
    lines.push({
      label: 'Third-party support on stable products',
      basis: `${Math.round(tpScope[0] * 100)}–${Math.round(tpScope[1] * 100)}% of support in scope, at the ~50% saving third-party vendors advertise`,
      lo: round(supportSpend * tpScope[0] * 0.5), hi: round(supportSpend * tpScope[1] * 0.5),
    });
  }

  // A cap removes future increases. Show one year of avoided increase.
  if (s.priceProtection !== 'capped' && supportSpend) {
    lines.push({
      label: 'Next year\'s support increase avoided by a cap',
      basis: 'a 0–3% cap against an uncapped 3–8% increase, for one year',
      lo: round(supportSpend * 0.03), hi: round(supportSpend * 0.06),
    });
  }

  if (s.costPressures?.includes('credits') && hasAny(s, CLOUD_PRODUCTS)) {
    const cloudSpend = acv * (1 - supportShare);
    lines.push({
      label: 'Unused OCI credits or SaaS subscriptions',
      basis: 'resizing commitments to observed consumption at renewal',
      lo: round(cloudSpend * 0.08), hi: round(cloudSpend * 0.2),
    });
  }

  const lo = lines.reduce((t, l) => t + l.lo, 0);
  const hi = lines.reduce((t, l) => t + l.hi, 0);
  if (hi < 10000) return null;
  return { lines: lines.filter(l => l.hi > 0), lo, hi, acv, supportSpend: round(supportSpend) };
}

const fmtMoney = n => '$' + n.toLocaleString('en-US');

// ─── Renewal posture ──────────────────────────────────────────────────────────
function recommendedPosture(s, leverage) {
  if (['inprogress', 'findings'].includes(s.auditStatus) || s.eventType === 'audit') return 'Audit Defense First';
  if (s.mnaEnabled && s.mnaStage !== 'settled') {
    if (s.mnaType === 'divesting') return 'Carve-Out Protection';
    if (s.mnaType === 'acquired') return 'Preserve Optionality';
    if (s.mnaStage !== 'confidential') return 'Consolidate & Re-Paper';
  }
  if (s.auditStatus === 'notice') return 'Scope the Audit';
  if (isUla(s) && s.eventType === 'ula-end') return 'Certify on Your Terms';
  if (s.eventType === 'java' || (javaExposed(s) && s.products?.includes('java'))) return 'Java Remediation';
  if (s.estateDirection === 'reduce' || s.shelfware === 'significant') return 'Rationalize Support';
  if (['considering', 'thirdparty'].includes(s.supportStream)) return 'Support Model Review';
  if (leverage >= 55 && ['purchase', 'cloud'].includes(s.eventType)) return 'Quarter-End Competitive Deal';
  if (leverage >= 55) return 'Competitive Leverage';
  if (s.estateDirection === 'grow' || s.changeEvents?.includes('expansion')) return 'Trade Growth for Terms';
  return 'Cap & Protect';
}

// ═══ Main builder ════════════════════════════════════════════════════════════
function buildStrategyHTML(s) {
  const leverage = getLeverageScore(s);
  const leverageInfo = getLeverageLabel(leverage);
  const increase = getIncreaseOutlook(s, leverage);
  const discount = getDiscountRange(s, leverage);
  const recovery = getSupportRecoveryEstimate(s);
  const java = (s.products?.includes('java') || javaExposed(s)) && s.javaPosition !== 'na' && s.javaPosition !== 'openjdk' ? javaExposureEstimate(s) : null;
  const fc = fiscalContext(s.renewalMonth);
  const acvLabel = ACV_TIERS[s.annualSpend]?.label ?? 'Unknown spend';
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
  const context = ORACLE_CONTEXT.rows.filter(r => r.when(s));
  const proxima = getProximaInsight(ACV_TO_CAL_TIER[s.annualSpend]);

  return `
<div class="strategy-container">
  <div class="print-proxima-header">
    <span class="print-logo-text">Proxima</span>
    <span class="print-divider"></span>
    <span class="print-tool-name">Oracle Negotiation Planner</span>
  </div>

  <div class="strategy-hero">
    <h2>Your Oracle Negotiation Strategy</h2>
    <div class="subtitle">${sizeLabels[s.companySize] || 'Company'} · ${acvLabel} annual spend · ${CONTRACT_LABELS[s.primaryContract] || 'Oracle'} · ${EVENT_LABELS[s.eventType] || ''}${s.mnaEnabled ? ' · M&amp;A in scope' : ''} · Generated ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
    <div style="font-size:.75rem;color:rgba(255,255,255,.6);font-style:italic;margin-top:4px;">Intended for Proxima use only — please contact Brian Chernauskas with questions</div>
    <div style="font-size:.7rem;color:rgba(255,255,255,.35);margin-top:3px;">Ranges last calibrated: ${RANGES_LAST_UPDATED} · Directional estimates, not Oracle-published figures</div>
    <div class="score-row">
      <div class="score-pill">
        <span class="pill-label">Leverage Score</span>
        <span class="pill-value" style="color:${leverageInfo.color}">${leverage}/100 — ${leverageInfo.label}</span>
      </div>
      <div class="score-pill">
        <span class="pill-label">Target Support Increase</span>
        <span class="pill-value">${increase.capLo}–${increase.capHi}%</span>
      </div>
      <div class="score-pill">
        <span class="pill-label">Posture</span>
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
        <span class="section-badge ${fc.strength === 'peak' ? 'green' : fc.strength === 'good' ? 'blue' : ''}">Oracle fiscal ${fc.quarter}</span>
      </div>
      <div class="section-content">
        <p style="font-size:.92rem;line-height:1.7;color:var(--text-secondary);">${fc.note}</p>
        <p style="font-size:.85rem;line-height:1.7;color:var(--text-muted);margin-top:10px;">Oracle's fiscal year ends May 31. Quarters run June–August, September–November, December–February, and March–May, so FY2027 closes May 31, 2027. ${s.eventType === 'support' ? 'Support renewals are invoiced on their contract dates, so timing mostly helps when you pair the renewal with something Oracle wants to book, such as a purchase, a cloud commitment, or a co-terming exercise.' : ''}</p>
      </div>
    </div>` : ''}

    <div class="strategy-section">
      <div class="section-header">
        <span class="section-icon">🏢</span>
        <h3>Oracle Corporate &amp; Licensing Context</h3>
        <span class="section-badge">Verified ${ORACLE_CONTEXT.verifiedOn}</span>
      </div>
      <div class="section-content">
        <div class="table-scroll"><table class="corp-table">
          <thead><tr><th>Event</th><th>What happened</th><th>What it means for this negotiation</th></tr></thead>
          <tbody>${context.map(r => `<tr>
            <td>${r.event}<div style="font-weight:400;color:var(--text-muted);font-size:.75rem;">${r.date}</div></td>
            <td>${r.detail}</td>
            <td>${r.implication}</td>
          </tr>`).join('')}</tbody>
        </table></div>
        <p style="margin-top:10px;font-size:.76rem;color:var(--text-muted);line-height:1.6;">These are dated, sourced events rather than estimates. Licensing rows appear only when your inputs make them relevant.</p>
      </div>
    </div>

    ${mna ? mnaSectionHTML(s, mna) : ''}

    <div class="strategy-section">
      <div class="section-header">
        <span class="section-icon">📈</span>
        <h3>Support &amp; Renewal Increase Outlook</h3>
        <span class="section-badge">Largest line over time</span>
      </div>
      <div class="section-content">
        <div class="discount-estimate">
          <div>
            <div class="de-range">${increase.capLo}–${increase.capHi}%</div>
            <div class="de-label">target annual increase</div>
          </div>
          <div class="de-bar-wrap">
            <div class="de-bar-bg">
              <div class="de-bar-fill" style="width:${Math.max(0, Math.min(100 - increase.capHi * 8, 100))}%"></div>
            </div>
            <div class="de-note">Uncapped, expect Oracle to raise ${s.eventType === 'saas-renewal' || s.primaryContract === 'saas' ? 'subscription' : 'support'} fees <strong>${increase.askLo}–${increase.askHi}%</strong> · Your target: <strong>${increase.capLo}–${increase.capHi}%</strong> · Stretch: <strong>flat for the term</strong></div>
          </div>
        </div>
        <p style="margin-top:14px;font-size:.88rem;line-height:1.7;color:var(--text-secondary);">
          ${s.primaryContract === 'saas' || s.eventType === 'saas-renewal'
            ? 'Oracle SaaS renewals are where uncapped subscriptions get re-priced. The protection belongs in the original order: a written renewal cap, applying to every cloud service on the order and to any you add during the term.'
            : 'Support is typically 22% of the net license fee and rises every year unless a cap says otherwise. Over five years, support usually costs more than the licenses did. A cap of a few points is worth more than almost any one-time discount, and the only moment to win one is when Oracle wants something from you: a purchase, a cloud commitment, a ULA, or an audit closed.'}
        </p>
        ${factorsTableHTML(s, fc)}
      </div>
    </div>

    <div class="strategy-section">
      <div class="section-header">
        <span class="section-icon">💰</span>
        <h3>Discount Off List — New Purchases</h3>
        <span class="section-badge blue">${acvLabel}</span>
      </div>
      <div class="section-content">
        <div class="discount-estimate">
          <div>
            <div class="de-range">${discount.lo}–${discount.hi}%</div>
            <div class="de-label">vs. Oracle's global price list</div>
          </div>
          <div class="de-bar-wrap">
            <div class="de-bar-bg">
              <div class="de-bar-fill" style="width:${Math.min(discount.hi * 1.2, 100)}%"></div>
            </div>
            <div class="de-note">Midpoint target: <strong>${discount.midpoint}%</strong> · Walk-away floor: <strong>${discount.lo}%</strong> · Stretch goal: <strong>${discount.hi}%</strong></div>
          </div>
        </div>
        ${auditActive(s) ? `<div class="alert alert-warning" style="margin-top:14px;"><span class="alert-icon">⚖️</span><div><strong>This range is lowered for an open audit.</strong> A purchase made to settle a compliance claim is priced from Oracle's strongest position. Challenge the findings before you discuss any purchase, and don't accept a cloud or ULA "settlement" until you've tested the claim.</div></div>` : ''}
        ${proxima ? `<div style="margin-top:10px;padding:10px 14px;background:rgba(199,70,52,.06);border:1px solid rgba(199,70,52,.22);border-radius:8px;font-size:.82rem;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <span style="font-weight:700;color:#A33A2B;">📊 Proxima Deal Data</span>
          <span style="color:var(--text-muted);">Based on <strong>${proxima.count} Oracle deal${proxima.count !== 1 ? 's' : ''}</strong>${proxima.tierMatch ? ' at this spend tier' : ' across all tiers'}: observed avg <strong>${proxima.avg}%</strong>, range <strong>${proxima.lo}–${proxima.hi}%</strong></span>
        </div>` : ''}
        <p style="margin-top:14px;font-size:.82rem;line-height:1.7;color:var(--text-muted);">
          Oracle's technology price list is public. Database Enterprise Edition lists at $47,500 per processor or $950 per Named User Plus, before options. Every point of license discount also lowers the support base for as long as you keep the license, so negotiate support terms in the same order. Never accept a deeper license discount paired with a higher support percentage or an uncapped increase. Cloud subscriptions discount less than perpetual licenses and are measured against Oracle's cloud price list.
        </p>
      </div>
    </div>

    ${java ? `
    <div class="strategy-section">
      <div class="section-header">
        <span class="section-icon">☕</span>
        <h3>Java Exposure Under the Employee Metric</h3>
        <span class="section-badge">${s.javaPosition === 'universal' ? 'Current subscription' : 'Potential exposure'}</span>
      </div>
      <div class="section-content">
        <div class="discount-estimate">
          <div>
            <div class="de-range" style="font-size:1.6rem;">${fmtMoney(java.annual)}</div>
            <div class="de-label">list price per year at ~${java.heads.toLocaleString('en-US')} employees</div>
          </div>
          <div class="de-bar-wrap">
            <div class="de-note">Band rate <strong>$${java.rate.toFixed(2)}</strong> per employee per month. Replace the representative headcount with your actual count <em>as Oracle defines it</em>: all full-time, part-time and temporary employees, plus contractors, agents and outsourcers who support internal operations.</div>
          </div>
        </div>
        <p style="margin-top:14px;font-size:.88rem;line-height:1.7;color:var(--text-secondary);">
          ${{
            'none-used': 'You run Oracle JDK without a subscription. Oracle\'s Java outreach usually begins with download and update records, so it may already know. Before you respond to any Java contact, inventory every installation, work out which versions and updates were actually used commercially under which license, and replace what you can with OpenJDK builds. That exposure is what Oracle will price.',
            legacy: 'Your legacy Named User Plus or Processor subscription is likely to be moved to the employee metric at renewal. Model the renewal quote against the cost of moving to OpenJDK builds, and ask Oracle in writing whether the legacy metric can renew before you accept the conversion.',
            universal: 'You already pay per employee. The levers are the employee count in the order (exclude people outside the definition and cap growth adjustments), the volume band, and a multi-year price hold. Where Oracle-specific features aren\'t needed, migrating to OpenJDK builds removes the line entirely at the next renewal.',
            unknown: 'You don\'t know what Java is installed, which is the most expensive position to be in if Oracle raises it first. Run a discovery across servers, desktops and container images, and separate Oracle JDK from OpenJDK builds before any Oracle conversation.',
          }[s.javaPosition] || 'Confirm which Java distributions are installed and under which license before any Oracle conversation.'}
        </p>
        <p style="margin-top:10px;font-size:.82rem;line-height:1.7;color:var(--text-muted);font-style:italic;">List-price figure from the January 2023 Java SE Universal Subscription price list, using a representative headcount for your company-size band. Organizations over 50,000 employees are quoted by Oracle. Use this to size exposure, not as a quote.</p>
      </div>
    </div>` : ''}

    ${recovery ? `
    <div class="strategy-section">
      <div class="section-header">
        <span class="section-icon">✂️</span>
        <h3>Support Spend Recovery</h3>
        <span class="section-badge green">Reduce the base before you negotiate</span>
      </div>
      <div class="section-content">
        <div class="discount-estimate">
          <div>
            <div class="de-range" style="font-size:1.6rem;">${fmtMoney(recovery.lo)}–${fmtMoney(recovery.hi)}</div>
            <div class="de-label">estimated annual recoverable spend</div>
          </div>
          <div class="de-bar-wrap">
            <div class="de-note">Against a midpoint annual spend of <strong>${fmtMoney(recovery.acv)}</strong>, of which roughly <strong>${fmtMoney(recovery.supportSpend)}</strong> is support.</div>
          </div>
        </div>
        <table style="width:100%;margin-top:14px;border-collapse:collapse;font-size:.82rem;">
          <thead><tr style="border-bottom:1px solid var(--border);">
            <th style="text-align:left;padding:6px 0;color:var(--text-secondary);font-weight:600;">Source</th>
            <th style="text-align:right;padding:6px 0;color:var(--text-secondary);font-weight:600;">Annual estimate</th>
          </tr></thead>
          <tbody>${recovery.lines.map(l => `<tr style="border-bottom:1px solid var(--surface-3);">
            <td style="padding:7px 0;color:var(--text-primary);">${l.label}<div style="color:var(--text-muted);font-size:.74rem;">${l.basis}</div></td>
            <td style="padding:7px 0;text-align:right;font-weight:700;color:var(--success);font-variant-numeric:tabular-nums;white-space:nowrap;">${fmtMoney(l.lo)}–${fmtMoney(l.hi)}</td>
          </tr>`).join('')}</tbody>
        </table>
        <p style="margin-top:14px;font-size:.88rem;line-height:1.7;color:var(--text-secondary);">
          Oracle's Technical Support Policies generally don't let you drop support on some licenses in a license set while keeping the rest, and terminating licenses from an order can trigger repricing of what remains. Savings come from ending support on whole license sets or whole support contracts (CSIs), which means mapping every CSI to the licenses and deployments behind it first. Once support lapses, reinstating it carries back-support fees and a reinstatement penalty, so only terminate what you are sure you will retire.
        </p>
        <p style="margin-top:10px;font-size:.82rem;line-height:1.7;color:var(--text-muted);font-style:italic;">
          Directional estimate derived from your spend band, contract structure, and reported shelfware. It is not a measured figure. Third-party support savings are vendor-advertised, and moving off Oracle support ends access to Oracle patches and new versions for the products moved.
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
        <h3>Questions to Ask Oracle</h3>
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
          <strong>Corporate and licensing events are verified. Percentages are estimates.</strong> The events above are dated and sourced, checked ${ORACLE_CONTEXT.verifiedOn}, and the Java and database list prices come from Oracle's published price lists. Oracle doesn't publish negotiated discounts, support increases, or audit settlement outcomes, so every percentage in this plan is a directional estimate based on publicly reported procurement practice and Proxima engagement experience. Discount bands scale with annual spend and are adjusted for contract structure, audit status, competitive position, and fiscal timing.
        </p>
        <p style="font-size:.86rem;line-height:1.75;color:var(--text-secondary);margin-top:10px;">
          <strong>Compliance guidance is commercial, not legal.</strong> Audit rights, virtualization treatment, and Java licensing all depend on the exact wording of your Oracle Master Agreement, ordering documents, and the policy documents they incorporate. Oracle's Partitioning Policy, for example, is not part of most contracts. Have licensing counsel or a specialist review any claim before accepting it.
        </p>
        ${s.mnaEnabled ? `<p style="font-size:.86rem;line-height:1.75;color:var(--text-secondary);margin-top:10px;">
          <strong>M&amp;A guidance is commercial, not legal.</strong> Assignment, change-of-control, affiliate-use, and transition-services rights depend on your Oracle agreements and on the transaction structure (asset versus stock purchase, merger, spin-off). Have deal counsel review the actual clauses before relying on any of the positions above.
        </p>` : ''}
        <p style="font-size:.86rem;line-height:1.75;color:var(--text-secondary);margin-top:10px;">
          Use these ranges to decide what to target and where to push, not as figures to quote to a client or to Oracle. Where a specific number matters to a deal, check it against the client's own agreements and against outcomes logged in Deal Calibration.
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
  if (s.alternative === 'dual') rows.push(['Workloads already moving off Oracle', 'Strong', 'green']);
  else if (s.alternative === 'evaluating') rows.push(['Active migration plan or alternative quote', 'Strong', 'green']);
  else if (s.alternative === 'none') rows.push(['No credible alternative — Oracle knows it', 'Weak', 'red']);

  if (s.supportStream === 'thirdparty') rows.push(['Third-party support already in use', 'Strong', 'green']);
  else if (s.supportStream === 'considering') rows.push(['Third-party support under evaluation', 'Moderate', 'green']);

  if (fc?.strength === 'peak') rows.push(['Decision lands in Oracle fiscal Q4', s.eventType === 'support' ? 'Moderate' : 'Strong', 'green']);
  else if (fc?.strength === 'good') rows.push(['Decision lands at fiscal quarter end', 'Moderate', 'green']);
  else if (fc?.strength === 'weak') rows.push(['Decision falls mid-quarter', 'Weak', 'red']);

  if (s.renewalTimeline === 'within-1mo' || s.renewalTimeline === '1-3mo') rows.push(['Limited runway before the event', 'Weak', 'red']);
  else if (s.renewalTimeline === '6-12mo' || s.renewalTimeline === '12plusmo') rows.push(['Ample runway to prepare', 'Strong', 'green']);

  if (s.auditStatus === 'findings') rows.push(['Compliance claim on the table', 'Critical', 'red']);
  else if (s.auditStatus === 'inprogress' || s.auditStatus === 'notice') rows.push(['Audit open or noticed', 'Weak', 'red']);
  else if (s.auditStatus === 'none') rows.push(['No active compliance contact', 'Moderate', 'green']);

  if (s.complianceConfidence === 'high') rows.push(['Deployments reconciled to entitlements', 'Strong', 'green']);
  else if (['low', 'unknown'].includes(s.complianceConfidence)) rows.push(['Compliance position unknown or exposed', 'Weak', 'red']);
  if (s.deployment === 'vmware') rows.push(['Oracle on soft-partitioned virtualization', 'Weak', 'red']);
  if (javaExposed(s)) rows.push(['Unresolved Java position', 'Weak', 'red']);

  if (s.estateDirection === 'reduce') rows.push(['Credible plan to shrink the estate', 'Strong', 'green']);
  if (s.shelfware === 'significant') rows.push(['Large undeployed estate to cut support on', 'Strong', 'green']);
  if (s.changeEvents?.includes('hyperscaler')) rows.push(['Workloads moving to a hyperscaler', 'Moderate', 'green']);
  if (s.changeEvents?.includes('ocipush')) rows.push(['Oracle wants your OCI commitment', 'Moderate', 'green']);

  const mnaAdj = mnaLeverageAdjustment(s);
  if (s.mnaEnabled && s.mnaStage === 'confidential') rows.push(['M&amp;A not yet public — cannot be used as leverage', 'Neutral', 'red']);
  else if (mnaAdj > 0) rows.push(['M&amp;A adds usage Oracle wants to keep', 'Moderate', 'green']);
  else if (mnaAdj < 0) rows.push([s.mnaType === 'divesting' ? 'Divestiture shrinks the estate and opens transfer questions' : 'Change of control opens license-transfer questions', 'Weak', 'red']);

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
  const comp = s.mnaComplications || [];

  const stageNote = {
    confidential: 'The transaction is not public, so it can\'t be disclosed to Oracle and can\'t be used as leverage. Oracle licenses are tied to the contracting entity, and a transaction is a common audit trigger. Quietly check whether your agreements cover affiliates and successors, and ask for that flexibility on its own merits in any deal you sign before announcement.',
    announced: 'The deal is public but hasn\'t closed. Oracle knows the estate is about to change and will watch for license use that crosses entity lines. Don\'t let the acquired company use your licenses, or yours theirs, until the agreements allow it. Keep each party\'s Oracle pricing separate until close, and route any comparison through a clean team or counsel.',
    integrating: 'The deal has closed and integration is live. This is where Oracle compliance exposure appears: shared databases, consolidated data centers, and users of one entity reaching the other\'s applications. Map every cross-entity use before Oracle does, then negotiate the paperwork to cover it.',
    settled: 'The transaction closed more than a year ago. Any cross-entity use that was never papered is still a compliance exposure, and any duplicate support contracts are still costing money. Use this negotiation to fix both.',
  }[stage] || '';

  if (adding) {
    items.push({
      priority: 'must', title: 'Oracle licenses don\'t follow the transaction automatically',
      desc: `Oracle licenses are granted to the contracting legal entity, and most agreements need Oracle's consent to assign them. The ${type === 'merger' ? 'other party\'s' : 'acquired company\'s'} licenses stay with that entity, and your licenses don't automatically cover its users or servers. Get a written amendment extending use to the combined group, with no license or support fee for the change in entity. Do this before workloads are consolidated.`,
    });
    if (cp === 'ula' || isUla(s)) {
      items.push({
        priority: 'must', title: 'ULA entity scope decides what the deal costs',
        desc: `${isUla(s) ? 'Your ULA' : 'The other party\'s ULA'} covers named legal entities only. Deployments by entities not listed don't count toward certification and aren't licensed. ${isUla(s) ? 'Ask Oracle to add the acquired entity to your ULA, ideally without a fee if the ULA already contemplates acquisitions below a threshold, and check whether its deployments can be counted at certification.' : 'Before its ULA ends, decide whether it should certify on its own or fold into your agreements, and make sure its certification counts only deployments it is entitled to.'}`,
      });
    }
    if (cp === 'perpetual' || cp === 'ula') {
      items.push({
        priority: 'should', title: 'Consolidate support contracts without repricing',
        desc: 'Two estates mean two sets of support contracts (CSIs) on different dates and discount levels. Ask Oracle to merge them onto one renewal date. Put in writing that consolidation doesn\'t trigger repricing, and that licenses which become redundant after integration can be terminated as whole license sets.',
      });
    }
    if (cp === 'unknown') {
      items.push({
        priority: 'should', title: 'Inventory the other party\'s Oracle estate',
        desc: 'You don\'t yet know what the other party holds. Before close, working through counsel or a clean team, establish its agreements, license entitlements by metric, support contracts, audit history, Java position, and deployments on virtualization. An unresolved Oracle audit or a Java exposure you inherit becomes your problem at close.',
      });
    }
    items.push({
      priority: 'should', title: 'Assess inherited compliance exposure before you combine',
      desc: `${material ? 'The transaction materially enlarges your Oracle footprint. ' : ''}Consolidating data centers or virtual clusters can put the acquired company's Oracle workloads on hosts your licenses don't cover, and the reverse. Run a license position on both estates before migration, and keep separate clusters until the paperwork is in place.`,
    });
  }

  if (type === 'acquired' || type === 'merger') {
    items.push({
      priority: 'must', title: 'Don\'t lock in a long commitment ahead of a change of control',
      desc: 'Avoid a new ULA, a multi-year cloud commitment, or a large purchase just before close. The acquirer may already hold better Oracle terms, and your commitment may be stranded or duplicated. If a renewal can\'t wait, keep it to the shortest practical term.',
    });
  }

  if (type === 'acquired' || adding) {
    const assignText = {
      consent: 'Your agreement requires Oracle\'s consent to assign. That gives Oracle a checkpoint at the moment it has the most leverage, and consent is sometimes tied to a purchase or an audit.',
      permitted: 'Your agreement appears to cover affiliates or successors. Confirm the wording fits the actual deal structure (asset sale, stock purchase, or merger) and that support pricing survives.',
      unknown: 'The assignment and entity definitions haven\'t been reviewed. Do that before any other M&A step.',
    }[s.mnaAssignment] || 'Review the assignment and entity definitions.';
    items.push({
      priority: s.mnaAssignment === 'permitted' ? 'should' : 'must', title: 'Assignment and entity definitions',
      desc: `${assignText} Negotiate the right to assign to any successor by merger, acquisition, or sale of substantially all assets, and to extend use to newly acquired affiliates, with no fees or repricing.`,
    });
  }

  if (type === 'divesting') {
    items.push({
      priority: 'must', title: 'Licenses generally can\'t follow the divested business',
      desc: 'Oracle licenses stay with the licensee. Once the business leaves your group, its use of your licenses is unlicensed unless Oracle agrees otherwise, and Oracle commonly requires the new company to buy its own. Negotiate the right to transfer the licenses the divested business actually uses, or a transition period (typically 6–24 months) during which it may keep using them.',
    });
    items.push({
      priority: 'must', title: 'Reduce support in proportion to what leaves',
      desc: `Without an agreed mechanism, you keep paying support on licenses the divested business used, and repricing rules may block you from dropping them${s.mnaUserImpact && s.mnaUserImpact !== 'unknown' ? ` (${MNA_IMPACT_LABELS[s.mnaUserImpact]} here)` : ''}. Ask for the right to transfer or terminate the relevant licenses and support with no repricing on the rest.`,
    });
    if (comp.includes('java') || s.products?.includes('java')) {
      items.push({
        priority: 'should', title: 'Re-base the Java employee count',
        desc: 'A Java SE Universal Subscription counts employees. When headcount leaves with the divestiture, ask for the count and fee to come down at the next anniversary rather than waiting for renewal.',
      });
    }
  }

  if (comp.includes('shared')) {
    items.push({
      priority: 'must', title: 'Shared systems need explicit license cover',
      desc: 'A database or application that serves both entities is licensed to one of them. Until the agreements say otherwise, users from the other entity are unlicensed users. Document every shared system and cover it by amendment or a transition right before Oracle raises it.',
    });
  }
  if (comp.includes('csis')) {
    items.push({
      priority: 'should', title: 'Co-term every support contract onto one date',
      desc: 'Separate CSIs on separate dates mean several small renewals, each with its own increase. Co-term them onto a single date, ideally paired with an event Oracle wants to book in its fiscal Q4, and get written confirmation that co-terming doesn\'t reprice anything.',
    });
  }
  if (comp.includes('tsa')) {
    items.push({
      priority: 'must', title: 'Transition services need Oracle\'s agreement',
      desc: 'A transition services agreement that promises "continued access to systems" doesn\'t give an outside company Oracle license rights. The TSA period needs matching terms from Oracle: who may use what, for how long, and whether the divested entity pays during the transition.',
    });
  }
  if (comp.includes('java') && type !== 'divesting') {
    items.push({
      priority: 'should', title: 'Java employee count follows the combined headcount',
      desc: 'A Java SE Universal Subscription is priced on total employees. If you add the other party\'s workforce, expect Oracle to count it. Confirm the combined count, the resulting band, and whether the other party already pays for Java, so the combined group doesn\'t pay twice.',
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
        ${s.mnaUserImpact ? `<p style="font-size:.85rem;line-height:1.7;color:var(--text-muted);margin-top:8px;">Expected change in Oracle usage: <strong>${MNA_IMPACT_LABELS[s.mnaUserImpact]}</strong>.${mna.material ? ' At this scale, re-run the full license position for the combined estate rather than adjusting at the margins.' : ''}</p>` : ''}
        <div class="concessions-grid" style="margin-top:16px;">${mna.items.map(c => `
          <div class="concession-card">
            <div class="cc-title">${c.title}</div>
            <div class="cc-desc">${c.desc}</div>
            <div class="cc-priority priority-${c.priority}">${c.priority === 'must' ? '🔴 Must Address' : '🟡 Should Address'}</div>
          </div>`).join('')}
        </div>
        <p style="margin-top:14px;font-size:.82rem;line-height:1.7;color:var(--text-muted);">
          Commercial guidance only. Transactions are a common trigger for Oracle audits, so have counsel review the actual assignment, entity, and territory clauses before combining or separating any Oracle deployments.
        </p>
      </div>
    </div>`;
}

// ─── Alerts ───────────────────────────────────────────────────────────────────
function buildAlerts(s, tier, leverage, fc) {
  const alerts = [];

  if (s.auditStatus === 'findings') {
    alerts.push({ type: 'danger', icon: '🚨', text: '<strong>Oracle has delivered a compliance claim.</strong> Don\'t accept the findings or discuss purchases yet. Findings often count options that were enabled but never used, virtualized hosts your databases never ran on, or Java installations under the wrong license. Get a specialist to test every line against your contracts, answer in writing, and keep the audit team separate from sales.' });
  } else if (s.auditStatus === 'inprogress') {
    alerts.push({ type: 'danger', icon: '🔎', text: '<strong>An audit is underway.</strong> Agree the scope, entities, products, and timeline in writing. Review every script output before you send it, and provide only what the audit clause requires. Anything you volunteer beyond scope, such as unrelated environments, cloud migration plans, or estimates, can be used against you.' });
  } else if (s.auditStatus === 'notice') {
    alerts.push({ type: 'warning', icon: '📨', text: '<strong>You have a formal audit notice.</strong> Check the audit clause in your agreement, including notice period, frequency, and scope, before you reply. Name one point of contact, bring in licensing counsel, and run your own license position before Oracle sees any data.' });
  } else if (s.auditStatus === 'soft') {
    alerts.push({ type: 'warning', icon: '📧', text: '<strong>Oracle is making "license review" or Java outreach.</strong> These contacts are often a lead-in to a formal audit or a sales motion. They aren\'t contractual audits, and you aren\'t obliged to run scripts or share deployment data. Reply politely, share nothing substantive, and use the time to build your own license position.' });
  }

  if (s.javaPosition === 'none-used' || s.javaPosition === 'unknown') {
    alerts.push({ type: 'warning', icon: '☕', text: '<strong>Your Java position is unresolved.</strong> The subscription metric counts every employee, not Java users, so a small Oracle JDK footprint can create an enterprise-wide bill. Free updates for JDK 21 ended in September 2026. Inventory installations now and migrate to OpenJDK builds or JDK 25 before Oracle raises it.' });
  }

  if (s.deployment === 'vmware' || s.deployment === 'mixed') {
    alerts.push({ type: 'warning', icon: '🖥️', text: '<strong>Oracle runs on soft-partitioned virtualization.</strong> Oracle\'s Partitioning Policy doesn\'t recognize VMware as a license boundary, and Oracle has argued that every host in a cluster, or even beyond it, needs licenses. The policy isn\'t usually part of your contract, but the exposure is real. Isolate Oracle workloads on dedicated clusters, keep records of where they have run, and resolve this before any negotiation.' });
  }

  if (s.costPressures?.includes('options')) {
    alerts.push({ type: 'warning', icon: '🧩', text: '<strong>Database options or management packs may be enabled without licenses.</strong> Features such as Diagnostics and Tuning Packs, Partitioning, and Advanced Compression are installed by default and are easy to use by accident. Review feature-usage statistics on every database, disable what isn\'t licensed, and document when you did it.' });
  }

  if (isUla(s) && (s.eventType === 'ula-end' || ['within-1mo', '1-3mo', '3-6mo'].includes(s.renewalTimeline))) {
    alerts.push({ type: 'warning', icon: '📋', text: '<strong>Your ULA is nearing its end.</strong> What you certify becomes a fixed perpetual entitlement, and your support fee stays at the ULA level. Deploy anything you will need before the end date, count deployments exactly as the ULA defines them (public cloud deployments often count only if the contract allows), and decide on renewal versus certification at least 6 months out.' });
  }

  if (s.renewalTimeline === 'within-1mo') {
    alerts.push({ type: 'danger', icon: '⏰', text: '<strong>Less than 30 days to the event.</strong> Don\'t sign under deadline pressure. Paying a support renewal as invoiced keeps coverage while you negotiate the next one. For purchases and cloud commitments, the quarter-end deadline is Oracle\'s pressure, not yours.' });
  }

  if (s.supportStream === 'sustaining') {
    alerts.push({ type: 'info', icon: '🧾', text: '<strong>Some products are on Sustaining Support.</strong> You pay the full support fee but get no new patches, fixes, or security updates for those releases. That is the strongest case for moving them to third-party support or retiring them.' });
  }

  if (s.costPressures?.includes('credits') && hasAny(s, CLOUD_PRODUCTS)) {
    alerts.push({ type: 'info', icon: '☁️', text: '<strong>You have unused cloud credits or subscriptions.</strong> Unused OCI Universal Credits generally expire at the end of the commitment period. Before renewing, size the commitment to real consumption, and use any new Oracle purchase as the moment to negotiate rollover or an extension for the unused balance.' });
  }

  if (s.alternative === 'none' && tier >= 3) {
    alerts.push({ type: 'warning', icon: '⚡', text: '<strong>No competitive alternative identified.</strong> At your spend this materially weakens your position. You don\'t need to leave Oracle. A costed PostgreSQL migration for one application, or a third-party support quote for stable products, changes the tone of the negotiation.' });
  }

  if (s.mnaEnabled && s.mnaStage === 'confidential') {
    alerts.push({ type: 'danger', icon: '🔒', text: '<strong>The M&amp;A transaction is confidential.</strong> Don\'t mention it to Oracle. Transactions are a common audit trigger, so don\'t share cross-entity plans, and keep the M&amp;A section of this plan internal.' });
  }

  return alerts;
}

// ─── Tactics ──────────────────────────────────────────────────────────────────
function buildTactics(s, tier, leverage, fc, increase) {
  const tactics = [];

  if (auditActive(s) || s.auditStatus === 'soft') {
    tactics.push({
      title: 'Keep the Audit and the Commercial Deal Separate',
      desc: 'Oracle often proposes to settle compliance findings with a purchase: cloud credits, a ULA, or a Java subscription. The claim then becomes a sales target. Resolve the compliance position first, on the facts and your contract, and only then consider any purchase on its own business case. If a settlement is on the table, make sure it includes a full release for the audited period and products.',
      impact: 'high',
    });
  }

  if (s.complianceConfidence !== 'high' || s.deployment === 'vmware' || s.costPressures?.includes('options')) {
    tactics.push({
      title: 'Build Your Own License Position Before Oracle Does',
      desc: `Reconcile every deployment against entitlements by product, metric, and legal entity. Check database feature-usage statistics for unlicensed options and packs${s.deployment === 'vmware' || s.deployment === 'mixed' ? ', document which hosts Oracle workloads have run on, and move them onto dedicated clusters' : ''}. Fix what you can before any renewal or purchase conversation. Every exposure you remove is leverage Oracle loses.`,
      impact: 'high',
    });
  }

  if (javaExposed(s) || s.eventType === 'java' || s.costPressures?.includes('javametric')) {
    tactics.push({
      title: 'Shrink Java to Zero Before You Price It',
      desc: 'Inventory every Oracle JDK installation across servers, desktops, build pipelines, and container images. Replace what doesn\'t need Oracle-specific support with OpenJDK builds (Eclipse Temurin, Amazon Corretto, Azul, Red Hat, or Microsoft Build of OpenJDK). Only after that, decide whether any subscription is needed. If one is, negotiate the employee count definition, the band, and a multi-year price hold.',
      impact: 'high',
    });
  }

  if (isUla(s)) {
    tactics.push({
      title: s.eventType === 'ula-end' ? 'Certify Deliberately, or Renew Only for What You\'ll Grow Into' : 'Plan the ULA Exit 12 Months Early',
      desc: `${s.ulaPosition === 'low' ? 'You have used little of the ULA, so renewing it is likely to overpay again. ' : ''}${s.ulaPosition === 'high' ? 'You deployed well beyond your pre-ULA entitlements, so certifying captures real value. ' : ''}Count deployments exactly as the ULA defines them. Deploy anything you will need before the end date. Confirm how public cloud and virtualized deployments count. Get Oracle's written acceptance of the certification. A renewal only makes sense if growth in the next term is both real and larger than what you would certify. Otherwise certify and negotiate support on the certified quantities.`,
      impact: 'high',
    });
  }

  tactics.push({
    title: 'Win a Written Cap on Support Increases',
    desc: `Uncapped, expect Oracle to raise ${s.primaryContract === 'saas' ? 'subscription' : 'support'} fees around ${increase.askLo}–${increase.askHi}% at each renewal. Make a cap of ${increase.capLo}–${increase.capHi}% a condition of any purchase, cloud commitment, or ULA decision. Apply it to every support contract (CSI), and ideally lock it for three to five years. Oracle rarely offers a cap on a support renewal alone, so attach it to the event Oracle wants.`,
    impact: 'high',
  });

  if (['significant', 'some', 'unknown'].includes(s.shelfware) || s.estateDirection === 'reduce' || s.costPressures?.includes('repricing')) {
    tactics.push({
      title: 'Terminate Whole License Sets, Not Individual Licenses',
      desc: 'Oracle\'s repricing rules mean dropping part of a license set can raise the price of what you keep. Map every support contract (CSI) to its licenses and actual deployments, find license sets that can be retired entirely, and time terminations to their renewal dates. Where shelfware sits alongside licenses you need, ask Oracle in writing to allow a partial reduction without repricing as part of a larger deal.',
      impact: s.shelfware === 'significant' ? 'high' : 'medium',
    });
  }

  if (['considering', 'thirdparty'].includes(s.supportStream) || hasAny(s, ONPREM_APPS) || s.supportStream === 'sustaining') {
    tactics.push({
      title: 'Get a Real Third-Party Support Quote',
      desc: `For stable products you won't upgrade${hasAny(s, ONPREM_APPS) ? ', especially E-Business Suite, PeopleSoft, JD Edwards, or Siebel' : ', such as older database releases'}, third-party support vendors typically advertise around half of Oracle's fee. A written quote is a credible alternative Oracle can't discount away. Before moving, make sure you have downloaded every patch and version you are entitled to while still on Oracle support, and understand that returning to Oracle later carries back-support and reinstatement fees.`,
      impact: s.supportStream === 'sustaining' || s.supportStream === 'considering' ? 'high' : 'medium',
    });
  }

  if (fc && fc.strength !== 'peak' && s.eventType !== 'support') {
    tactics.push({
      title: 'Move the Decision Into Oracle\'s Fiscal Q4 If You Can',
      desc: `Your decision falls in fiscal ${fc.quarter}${fc.strength === 'weak' ? ', away from any quota deadline' : ', at a quarter end'}. Oracle's year closes May 31, and discount approvals are easiest in the final weeks of March–May. If the purchase, ULA decision, or cloud commitment can wait, placing it there is worth real points. Stay ready to sign, and let Oracle know you are.`,
      impact: fc.strength === 'weak' ? 'high' : 'medium',
    });
  } else if (fc?.strength === 'peak') {
    tactics.push({
      title: 'Use Your Q4 Timing Deliberately',
      desc: 'Your decision sits in Oracle\'s strongest quota period. Hold the final decision until late May, make clear that signature before May 31 is possible if terms land, and define exactly what "terms land" means, including the support cap and contract terms, not only the license discount.',
      impact: 'high',
    });
  }

  const vendorPlays = {
    postgres: 'Pick one application on Oracle Database with modest Oracle-specific code and produce a costed PostgreSQL migration plan.',
    sqlserver: 'Scope a SQL Server migration for applications that already support it, costed against five years of Oracle support.',
    thirdparty: 'Get a written quote from a third-party support provider for the stable part of the estate.',
    openjdk: 'Complete a migration to OpenJDK builds for most Java workloads, leaving only what truly needs Oracle.',
    apps: 'Build a costed replacement case for your on-premises Oracle applications, even if the timeline is years out.',
    hyperscaler: 'Compare the OCI proposal against running the same Oracle workloads on your existing hyperscaler commitment.',
  };
  if (s.alternative === 'none' || s.alternative === 'theoretical') {
    tactics.push({
      title: 'Build a Credible Alternative for Part of the Estate',
      desc: `Oracle prices against the cost of leaving, and few enterprises can leave entirely. You don't need to. You need a credible alternative for the part of the estate that is least dependent on Oracle. ${vendorPlays[s.alternativeVendor] || 'A third-party support quote for stable products, or a PostgreSQL plan for one application, is usually achievable within a cycle.'}`,
      impact: 'high',
    });
  } else {
    tactics.push({
      title: 'Make Your Alternative Specific and Quantified',
      desc: `Oracle account teams discount vague threats. Turn yours into specifics with ${VENDOR_LABELS[s.alternativeVendor] || 'your alternative'}: which workloads or products move, how much support that removes, the timeline, and the migration cost. A costed plan that removes support revenue is a real risk to the account. "We're looking at options" is not.`,
      impact: 'high',
    });
  }

  if (s.changeEvents?.includes('ocipush') || s.eventType === 'cloud' || s.estateDirection === 'cloud') {
    tactics.push({
      title: 'Price Any OCI Commitment Against What You Would Actually Use',
      desc: 'Oracle may offer Support Rewards, discounted Universal Credits, or a conversion of on-premises support into cloud subscriptions. Model each against your real consumption forecast. Credits that go unused expire, and a conversion that retires support you could simply have terminated isn\'t a saving. Negotiate credit rollover, a ramped commitment, and the right to apply credits across services.',
      impact: 'high',
    });
  }

  if (s.changeEvents?.includes('hyperscaler') || hasAny(s, ['multicloud']) || s.deployment === 'publiccloud') {
    tactics.push({
      title: 'Use Your Hyperscaler Commitment as the Counterweight',
      desc: 'Oracle Database@AWS, @Azure, and @Google Cloud are sold through the hyperscalers\' marketplaces, and the spend may count toward your existing cloud commitment. Confirm eligibility with the hyperscaler. For BYOL on AWS, Azure, or Google Cloud, Oracle\'s cloud licensing policy counts two vCPUs as one processor license where hyperthreading is enabled. Get the licensing impact of any move in writing before migrating, so it can\'t become a compliance claim later.',
      impact: 'medium',
    });
  }

  if (s.changeEvents?.includes('ulapitch') && !isUla(s)) {
    tactics.push({
      title: 'Test a ULA Proposal Against Your Actual Growth',
      desc: 'A ULA converts a compliance problem or a growth plan into a large fee and a higher support base for years. It only pays off if deployment growth during the term is real and measurable. Model the ULA fee plus its support against buying licenses as needed, check which legal entities and cloud deployments it covers, and never accept one as an audit settlement without testing the underlying claim.',
      impact: 'high',
    });
  }

  if (s.changeEvents?.includes('appsmigration')) {
    tactics.push({
      title: 'Don\'t Keep Paying Full Support on Applications You\'re Retiring',
      desc: 'Once a replacement for E-Business Suite, PeopleSoft, or JD Edwards is committed, the legacy application only needs to keep running. Price third-party support or a reduced support arrangement for the migration period. If the replacement is Fusion, ask Oracle for support credits or a migration allowance against the legacy support stream as part of the Fusion deal.',
      impact: 'high',
    });
  }

  if (s.changeEvents?.includes('expansion') || s.estateDirection === 'grow') {
    tactics.push({
      title: 'Hold Planned Growth Back as Currency',
      desc: 'New Oracle purchases are what Oracle wants most, and the easiest thing to give away by mentioning them early. Settle compliance and support terms first. Then trade the growth explicitly, timed to a quarter end, for a support cap, repricing protection, and flexible license terms.',
      impact: 'high',
    });
  }

  if (s.costPressures?.includes('csis')) {
    tactics.push({
      title: 'Co-Term and Consolidate Support Contracts',
      desc: 'Many support contracts on different dates mean many small renewals, each with its own increase and no leverage. Ask Oracle to co-term them onto one date, with a written statement that consolidation doesn\'t trigger repricing. Then negotiate the whole support base as one event.',
      impact: 'medium',
    });
  }

  if (s.mnaEnabled && s.mnaStage !== 'confidential' && ['acquiring', 'merger'].includes(s.mnaType)) {
    tactics.push({
      title: 'Paper the Combined Estate Before You Consolidate It',
      desc: 'Oracle licenses don\'t follow a transaction automatically, and consolidating workloads before the paperwork is in place creates compliance exposure. Negotiate entity coverage, support contract consolidation, and Java headcount treatment first, then migrate. See the M&A Implications section for the full list.',
      impact: 'high',
    });
  }

  if (leverage < 40) {
    tactics.push({
      title: 'Escalate Beyond the Account Rep',
      desc: 'Your position is weak enough that the account rep has little reason to improve the offer, and Oracle account teams have been reshuffled in 2026. Escalate executive to executive: your CIO or CFO raises the relationship, including support costs and migration plans, with an Oracle regional or line-of-business leader.',
      impact: 'medium',
    });
  }

  return tactics;
}

// ─── Concessions / terms ──────────────────────────────────────────────────────
function buildConcessions(s, tier) {
  const c = [];

  c.push({ icon: '🧢', title: 'Support Increase Cap', desc: 'A written cap on annual support increases, targeting 0–3% for three to five years, applying to every support contract (CSI).', priority: 'must' });
  c.push({ icon: '🔁', title: 'No Repricing on Reduction', desc: 'The right to terminate support on specific licenses or license sets without repricing the remaining licenses.', priority: 'must' });
  c.push({ icon: '🏛️', title: 'Broad Entity Definition', desc: 'License use extended to all current and future affiliates, with assignment to a successor without consent or fees.', priority: 'must' });
  c.push({ icon: '🔍', title: 'Audit Clause Limits', desc: 'At least 45 days\' notice, no more than one audit every 3 years, agreed scope, no scripts during critical business periods, and time to remediate at contracted prices before any claim.', priority: 'must' });
  if (s.deployment === 'vmware' || s.deployment === 'mixed' || s.deployment === 'publiccloud') {
    c.push({ icon: '🖥️', title: 'Virtualization & Cloud Terms', desc: 'Written language defining licensing on your actual platform, for example licensing limited to the hosts or cluster where Oracle runs, or agreed vCPU counting in public cloud, so the Partitioning Policy can\'t be used later.', priority: 'must' });
  }
  if (isUla(s) || s.changeEvents?.includes('ulapitch')) {
    c.push({ icon: '📋', title: 'ULA Certification Terms', desc: 'A clear definition of what counts at certification (including public cloud and virtualized deployments), all entities covered, and support frozen at the ULA level after certification.', priority: 'must' });
  }
  if (s.products?.includes('java') || javaExposed(s)) {
    c.push({ icon: '☕', title: 'Java Employee Count Terms', desc: 'An agreed employee count fixed for the term, with contractors and outsourcers excluded where they don\'t use Java, and a price hold on the band.', priority: 'should' });
  }
  if (hasAny(s, CLOUD_PRODUCTS) || s.eventType === 'cloud') {
    c.push({ icon: '☁️', title: 'Cloud Credit Flexibility', desc: 'Rollover of unused Universal Credits, a ramped commitment schedule, and Support Rewards eligibility confirmed in the order.', priority: 'should' });
  }
  if (s.primaryContract === 'saas' || s.eventType === 'saas-renewal' || hasAny(s, ['fusion', 'netsuite'])) {
    c.push({ icon: '📌', title: 'SaaS Renewal Cap', desc: 'A renewal increase cap covering every subscribed service, plus the right to reduce subscriptions at renewal without losing the per-unit price.', priority: 'must' });
  }
  c.push({ icon: '🧾', title: 'License Migration Rights', desc: 'The right to move licenses to new metrics, versions, or platforms (including cloud) with credit for the support already paid, and no repricing.', priority: 'should' });
  c.push({ icon: '🔒', title: 'Price Hold on Future Purchases', desc: 'The same discount available on additional licenses of the same products for 24–36 months.', priority: 'should' });
  if (s.mnaEnabled) {
    const div = s.mnaType === 'divesting';
    c.push({ icon: '🔀', title: div ? 'Divestiture Transfer Rights' : 'M&A Coverage', desc: div
      ? 'The right to transfer licenses used by the divested business, or a 6–24 month transition right, plus proportional support reduction without repricing.'
      : 'Acquired entities covered at no charge, support contracts consolidated without repricing, and Java headcount changes applied only at anniversary.', priority: 'must' });
  }
  if (auditActive(s)) {
    c.push({ icon: '📝', title: 'Full Audit Release', desc: 'Any settlement includes a written release of all claims for the audited products and period, and no follow-on audit of the same products for at least 3 years.', priority: 'must' });
  }
  if (tier >= 5) {
    c.push({ icon: '👤', title: 'Named Support Resources', desc: 'A named technical account manager or Advanced Customer Services allocation included in the deal, with defined commitments.', priority: 'nice' });
  }
  c.push({ icon: '💳', title: 'Payment Terms', desc: 'Support invoiced annually in arrears or quarterly, and license fees split across fiscal years where that helps your budget.', priority: 'nice' });
  return c;
}

// ─── Timeline ─────────────────────────────────────────────────────────────────
function buildTimeline(s, fc) {
  const urgent = ['within-1mo', '1-3mo'].includes(s.renewalTimeline);
  const mnaOn = s.mnaEnabled;
  const t = [];

  t.push({
    phase: '1', when: urgent ? 'This week' : '9–12 months before the event',
    title: 'Establish the Facts',
    desc: 'Before any conversation with Oracle, know your entitlements and deployments better than Oracle does.',
    tasks: [
      'Collect every Oracle agreement, ordering document, and support contract (CSI), and record dates, metrics, and legal entities',
      'Reconcile deployments to entitlements, including database feature usage, virtualization hosts, and cloud instances',
      'Inventory Java installations and distributions across servers, desktops, and containers',
      isUla(s) ? 'Start counting ULA deployments using the certification definition' : 'Map each CSI to the licenses and deployments behind it, and flag license sets that can be retired',
      ...(mnaOn ? [s.mnaStage === 'confidential'
        ? 'Brief deal counsel on Oracle agreements and review entity and assignment clauses under NDA'
        : 'Inventory the other party\'s Oracle agreements, audit history, and Java position (clean team if pre-close)'] : []),
    ],
  });

  t.push({
    phase: '2', when: urgent ? 'Within 2 weeks' : '6–9 months before the event',
    title: 'Remove Exposure and Build Alternatives',
    desc: 'Fix compliance gaps and build a credible alternative before Oracle sets the agenda.',
    tasks: [
      'Disable unlicensed database options and packs, and move Oracle workloads onto isolated clusters',
      'Migrate Java workloads to OpenJDK builds or JDK 25 where possible',
      s.alternative === 'none' || s.alternative === 'theoretical'
        ? 'Get a third-party support quote or a costed migration plan for one workload'
        : 'Turn your alternative into a costed plan with support revenue at risk',
      'Agree your walk-away position, decision owner, and single point of contact for Oracle internally',
    ],
  });

  t.push({
    phase: '3', when: urgent ? 'Weeks 3–4' : '4–6 months before the event',
    title: 'Open the Negotiation',
    desc: 'Set the frame before Oracle does, and keep compliance and commercial conversations separate.',
    tasks: [
      'Ask for proposals in writing, with license, support, and cloud lines itemized separately',
      'Make a support increase cap and no-repricing terms conditions of any deal',
      auditActive(s) ? 'Answer audit findings in writing, line by line, before discussing any purchase' : 'Share nothing about deployments beyond what the negotiation requires',
      mnaOn && s.mnaStage !== 'confidential' && s.mnaType !== 'divesting'
        ? 'Put entity coverage for the combined group on the table early'
        : 'Hold planned growth back as currency for the final round',
    ],
  });

  t.push({
    phase: '4', when: urgent ? 'Weeks 5–6' : '1–3 months before the event',
    title: 'Trade and Escalate',
    desc: 'Concessions arrive when there is a reason for them to arrive. Create that reason.',
    tasks: [
      'Trade explicitly: growth, cloud commitment, or a ULA decision against caps, repricing protection, and entity terms',
      'Escalate above the account rep if the offer hasn\'t moved materially',
      'Get the full ordering document and review the actual terms, including referenced policies',
      fc?.strength === 'peak' || fc?.strength === 'good'
        ? 'Tell Oracle signature before quarter end is possible if terms land'
        : 'Assess whether the decision can move to a quarter end, ideally late May',
    ],
  });

  t.push({
    phase: '5', when: urgent ? 'Before signature' : 'Final 30 days',
    title: 'Close and Verify',
    desc: 'The ordering document is the contract. Make sure every negotiated term appears in it.',
    tasks: [
      'Confirm the support cap, no-repricing language, and entity definitions are written into the order',
      ...(auditActive(s) ? ['Confirm the settlement includes a full release for the audited products and period'] : []),
      ...(mnaOn ? ['Confirm assignment, entity, or transfer language matches the transaction structure counsel approved'] : []),
      'Download all patches and versions you are entitled to before ending support on any product',
      'Put every CSI renewal date, ULA milestone, and cloud credit expiry in the calendar with a named owner',
    ],
  });

  return t;
}

// ─── Questions ────────────────────────────────────────────────────────────────
function buildQuestions(s, tier) {
  const q = [];
  q.push('What will our support fees be for each CSI next year, and what is the basis for any increase?');
  q.push('Will you cap annual support increases in writing for the next three to five years?');
  q.push('If we terminate support on specific licenses, which remaining licenses would be repriced, and by how much?');
  if (auditActive(s)) q.push('Which contract clause and which specific deployments support each finding, and what data did you rely on?');
  if (javaExposed(s) || s.eventType === 'java') q.push('Can our existing Java metric renew unchanged, and how exactly would you count our employees under the Universal Subscription?');
  if (isUla(s)) q.push('How will public cloud and virtualized deployments count at ULA certification, and which entities are covered?');
  if (s.deployment === 'vmware' || s.deployment === 'mixed') q.push('Will you confirm in writing that licensing is limited to the hosts where Oracle software is installed and running?');
  if (s.changeEvents?.includes('ocipush') || s.eventType === 'cloud') q.push('What happens to unused Universal Credits at the end of the term, and can they roll over?');
  if (s.changeEvents?.includes('appsmigration')) q.push('What support credit or migration allowance will you give against legacy application support if we move to Fusion?');
  if (s.mnaEnabled && s.mnaStage !== 'confidential') {
    if (s.mnaType === 'divesting') q.push('How can the divested business keep using the licenses it relies on, and how do we reduce support without repricing?');
    else q.push('Will you extend our agreements to the acquired entity and consolidate support contracts without fees or repricing?');
  }
  if (tier >= 5) q.push('What named technical resources are included at our level of annual spend?');
  q.push('Can we co-term all support contracts onto a single date without repricing?');
  return q.slice(0, 12);
}

// ─── Risks ────────────────────────────────────────────────────────────────────
function buildRisks(s, tier, leverage) {
  const r = [];

  if (auditActive(s) || s.auditStatus === 'soft') {
    r.push({ level: 'high', title: 'Audit Converted Into a Sale', desc: 'Compliance claims are often settled with purchases that are larger than the actual exposure. Test every finding, and require a full release for any settlement.' });
  }
  if (s.deployment === 'vmware' || s.deployment === 'mixed') {
    r.push({ level: 'high', title: 'Virtualization Licensing Claim', desc: 'Soft-partitioned environments are the largest single source of Oracle database compliance claims. Isolate clusters and keep deployment history records.' });
  }
  if (javaExposed(s)) {
    r.push({ level: 'high', title: 'Enterprise-Wide Java Bill', desc: 'Under the employee metric, a handful of Oracle JDK installations can create a subscription requirement priced on your entire workforce. Remediate before engaging.' });
  }
  if (isUla(s)) {
    r.push({ level: 'medium', title: 'Under-Certified ULA', desc: 'Deployments missed or excluded at certification are unlicensed after the ULA ends, and support stays at the ULA level whatever is certified. Count carefully and early.' });
  }
  if (s.costPressures?.includes('repricing') || s.shelfware === 'significant') {
    r.push({ level: 'medium', title: 'Locked-In Shelfware', desc: 'Repricing rules can make it cheaper to keep paying for unused licenses than to drop them. Negotiate no-repricing terms while Oracle wants something from you.' });
  }
  if (['considering', 'thirdparty'].includes(s.supportStream)) {
    r.push({ level: 'medium', title: 'Leaving Oracle Support', desc: 'Moving to third-party support ends access to Oracle patches and upgrades for those products, and returning later costs back-support plus reinstatement fees. Download everything you are entitled to first.' });
  }
  if (s.changeEvents?.includes('ocipush') || s.eventType === 'cloud') {
    r.push({ level: 'medium', title: 'Over-Committed Cloud Credits', desc: 'Cloud commitments sized to win support relief rather than to real consumption leave credits to expire. Commit to forecast use, with rollover.' });
  }
  if (s.mnaEnabled) {
    if (s.mnaType === 'divesting') {
      r.push({ level: 'high', title: 'Divested Business Loses License Rights', desc: 'Without transfer or transition rights, the divested business is unlicensed at close and you keep paying support on what it used. Negotiate before close.' });
    } else if (s.mnaType === 'acquired') {
      r.push({ level: 'high', title: 'Stranded Commitment After Close', desc: 'A new ULA or multi-year cloud commitment signed just before a change of control can duplicate the acquirer\'s agreements. Keep terms short.' });
    } else {
      r.push({ level: 'high', title: 'Transaction-Triggered Audit', desc: 'Oracle watches for acquisitions, and integration creates cross-entity use that isn\'t licensed. Paper coverage before consolidating systems.' });
    }
    if (s.mnaStage === 'announced') {
      r.push({ level: 'medium', title: 'Pre-Close Information Sharing', desc: 'Comparing the two companies\' Oracle pricing before close can raise gun-jumping concerns. Use a clean team or counsel for any pre-close comparison.' });
    }
  }
  if (s.alternative === 'none') {
    r.push({ level: 'high', title: 'No Walk-Away Position', desc: 'Without any alternative, every request depends on goodwill. A third-party support quote or a single-workload migration plan is usually achievable within one cycle.' });
  }
  if (s.internalChampion === 'none') {
    r.push({ level: 'medium', title: 'No Internal Decision Owner', desc: 'Oracle often talks separately to DBAs, application owners, and procurement. Name one owner and one point of contact before engaging.' });
  }
  if (!r.length) {
    r.push({ level: 'low', title: 'No Material Structural Risks Identified', desc: 'Your inputs don\'t show the common failure modes. Focus the negotiation on a support cap, no-repricing terms, and broad entity coverage.' });
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
const SAMPLE_PROFILE = 'Mid-market manufacturer · $2.5M–$5M Oracle spend on perpetual licenses and support, acquiring a smaller Oracle customer';
const SAMPLE_STATE = {
  companySize: 'midmarket',
  annualSpend: '2500k-5m',
  primaryContract: 'perpetual',
  eventType: 'support',
  auditStatus: 'soft',
  renewalMonth: '11',
  renewalTimeline: '6-12mo',
  priceProtection: 'none',
  estateDirection: 'hold',
  products: ['db', 'dboptions', 'middleware', 'java', 'ebs'],
  deployment: 'vmware',
  shelfware: 'some',
  javaPosition: 'none-used',
  supportStream: 'considering',
  complianceConfidence: 'moderate',
  ulaPosition: 'na',
  costPressures: ['uplift', 'repricing', 'csis'],
  alternative: 'theoretical',
  alternativeVendor: 'thirdparty',
  relationshipQuality: 'moderate',
  previousNegotiation: 'basic',
  internalChampion: 'procurement',
  changeEvents: ['hyperscaler', 'ocipush'],
  mnaEnabled: true,
  mnaType: 'acquiring',
  mnaStage: 'announced',
  mnaUserImpact: '10-25',
  mnaCounterparty: 'perpetual',
  mnaAssignment: 'consent',
  mnaComplications: ['shared', 'csis'],
};

function sampleBannerHTML(fromForm) {
  return `<div class="sample-banner" role="note">
    <span class="sample-tag">SAMPLE</span>
    <div><strong>Sample output — illustrative data, not a client analysis.</strong>
    ${fromForm ? 'Built using the Fill Sample Data buttons — inputs may have been edited since.' : 'Generated from a fixed example profile: ' + SAMPLE_PROFILE + ', support renewal 6–12 months out.'}
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
