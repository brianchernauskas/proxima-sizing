'use strict';

/* ═══════════════════════════════════════════════════════════════════════════
   Proxima: SAP Negotiation Planner (including RISE with SAP / Cloud ERP Private)

   MODEL NOTE
   SAP negotiation differs from the hyperscaler, SaaS and Oracle planners:
     • The central fact is the ECC clock. Mainstream maintenance for Business
       Suite 7 (ECC 6.0) ends December 31, 2027, with optional extended
       maintenance to December 31, 2030 at a two-percentage-point premium.
       SAP's commercial machinery is built to move that installed base to
       S/4HANA, and above all to RISE with SAP (now sold as Cloud ERP Private),
       because cloud backlog is the number SAP reports and rewards.
     • RISE is a bundle: S/4HANA Cloud Private Edition software priced by user
       type (FUE), SAP-selected infrastructure sized by HANA memory and system
       count, managed services, and add-ons. The sizing set at signature is
       what the next renewal reprices, so the planner treats RISE as a
       structured negotiation, not a single discount.
     • On-premises maintenance is roughly 22% of license value, and SAP's
       support rules make partial reduction hard, so shelfware is modelled at
       a lower recovery rate.
     • Compliance is commercial. User-type classification and digital access
       (documents created by non-SAP systems) create claims that SAP settles
       through purchases, often cloud purchases.
     • SAP's fiscal year is the calendar year. Q4 (October to December) and
       the December 31 year end are the quota-pressure window.
   The engine models a renewal-increase outlook, a discount-off-list target
   for new subscriptions, a recoverable-spend estimate, and the ECC extended
   maintenance premium. An optional M&A module adds transaction implications.

   Ranges are directional estimates drawn from publicly reported procurement
   practice. SAP publishes no negotiated discount or escalator data.
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
    2: ['migration-status', 'hosting', 'shelfware', 'support-stream', 'compliance-confidence'],
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
    state.migrationStatus = document.getElementById('migration-status').value;
    state.migrationPath = document.getElementById('migration-path').value;
    state.hosting = document.getElementById('hosting').value;
    state.shelfware = document.getElementById('shelfware').value;
    state.userPosition = document.getElementById('user-position').value;
    state.digitalAccess = document.getElementById('digital-access').value;
    state.supportStream = document.getElementById('support-stream').value;
    state.complianceConfidence = document.getElementById('compliance-confidence').value;
    state.riseTerm = document.getElementById('rise-term').value;
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
const RANGES_LAST_UPDATED = 'October 7, 2026';

/* ─── SAP corporate & licensing context ───────────────────────────────────────
   Unlike the percentage ranges elsewhere in this file, these are dated,
   sourced events. Each row's `when` decides whether it is shown.

   Sources checked October 7, 2026:
     • Q2 2026 quarterly statement (Jul 23, 2026): cloud backlog EUR 22.9B,
       cloud revenue EUR 6.3B, guidance, Reltio / Dremio / Prior Labs closes
     • Q2 2026 earnings call (Jul 23, 2026): CEO Christian Klein on outcome-based
       agent pricing (erp.today coverage). Q3 results are due Oct 21, 2026
     • SAP news, Feb 2020 and Jun 2020: Business Suite 7 mainstream maintenance
       to Dec 31, 2027; extended maintenance to Dec 31, 2030 at +2 points;
       S/4HANA innovation commitment to 2040
     • ERP Private Edition Transition Option (Q1 2025; The Register, Jan 28 2025;
       SAPinsider): ECC support to 2033 via RISE, narrow eligibility
     • RISE rebrand to Cloud ERP Private, Premium Plus discontinued (CIO.com)
     • SAP Sapphire, May 2026 (news.sap.com): Autonomous Enterprise, Business AI
       Platform, Autonomous Suite
   Items marked "advisor-reported" come from licensing advisory firms and are
   not confirmed by SAP. Re-verify at each monthly review.
   ──────────────────────────────────────────────────────────────────────────── */
const SAP_CONTEXT = {
  verifiedOn: 'October 7, 2026',
  rows: [
    {
      id: 'q2-2026', kind: 'corporate', date: 'Jul 23, 2026',
      event: 'Q2 2026 results: cloud backlog is the scoreboard',
      detail: 'Cloud backlog reached EUR 22.9B, up 27% (26% at constant currency). Cloud revenue was EUR 6.3B. SAP held 2026 cloud revenue guidance at EUR 25.8B to 26.2B and trimmed its operating profit outlook to EUR 11.8B to 12.2B, citing more than EUR 100M of dilution from the Reltio, Dremio and Prior Labs acquisitions. Christian Klein is CEO. Q3 results are due October 21, 2026.',
      implication: 'SAP\'s most watched metric is cloud backlog, and Q4 (October to December) is when sales teams close the year against it. A multi-year cloud commitment is worth more to the account team than a one-year maintenance renewal, which is why concessions are easier to get on cloud deals. Make sure each concession lands in the order form, because rep-level promises do not survive the next reorganization.',
      when: () => true,
    },
    {
      id: 'ecc-clock', kind: 'licensing', date: 'Dec 31, 2027',
      event: 'ECC 6.0 mainstream maintenance ends',
      detail: 'SAP will provide mainstream maintenance for Business Suite 7 core applications (including ERP 6.0) until the end of 2027. Optional extended maintenance runs from January 1, 2028 to December 31, 2030 at a premium of two percentage points on the maintenance basis. No contractual change is needed before the end of 2027.',
      implication: 'The deadline creates urgency, but it is a commercial lever more than a technical cliff: extended maintenance is available for three more years and costs about 9% more than today\'s 22% rate. Do not let the date force a rushed RISE signature. Cost the extended-maintenance path honestly and put it on the table as your fallback.',
      when: s => s.primaryContract === 'ecc' || s.primaryContract === 'mixed' || s.products?.includes('ecc') || s.eventType === 'ecc-extended',
    },
    {
      id: 'transition-option', kind: 'licensing', date: 'Q1 2025',
      event: 'ERP Private Edition Transition Option',
      detail: 'A narrow option for large, complex landscapes with several ECC systems that have already started on RISE. It keeps ECC maintained and operated under a RISE-style contract through 2033. Reported availability is for purchase from 2028 and use from 2031 to 2033. SAP has said it does not extend the 2027 mainstream deadline.',
      implication: 'This is a bridge for the few customers who cannot finish by 2030, not a general extension. If you qualify, it can justify a staged migration. If you do not, do not accept an argument that you are about to run out of options.',
      when: s => (s.primaryContract === 'ecc' || s.primaryContract === 'mixed' || s.products?.includes('ecc')) && ['global', 'enterprise'].includes(s.companySize),
    },
    {
      id: 'rebrand', kind: 'licensing', date: '2025 to 2026',
      event: 'RISE with SAP Premium becomes Cloud ERP Private',
      detail: '"RISE with SAP Premium" was renamed Cloud ERP Private, and Premium Plus was discontinued. Reported changes include nearly twice as many bundled SKUs (with LeanIX added), SAP Datasphere no longer included, AI units previously embedded in Premium Plus now sold as an add-on, and some functions moved from a lower full user equivalent (FUE) category to the more expensive Professional category. "RISE with SAP" now describes the modernization journey.',
      implication: 'Do not compare a new quote with an old RISE order line by line and assume equivalence. Get a SKU-level list of what is and is not in the bundle, compare FUE classifications function by function, and price the add-ons that used to be bundled. The renamed package is also how SAP re-opens price on existing customers at renewal.',
      when: s => ['rise', 'mixed'].includes(s.primaryContract) || s.products?.includes('rise') || s.eventType === 'migrate' || s.eventType === 'rise-renewal' || s.changeEvents?.includes('risepush') || s.estateDirection === 'rise',
    },
    {
      id: 'sapphire', kind: 'corporate', date: 'May 2026',
      event: 'Sapphire: the Autonomous Enterprise',
      detail: 'SAP unveiled the Autonomous Enterprise: a Business AI Platform that unifies Business Technology Platform, Business Data Cloud and Business AI, plus an Autonomous Suite of Joule Assistants and agents. Partners named include Anthropic, AWS, Google Cloud, Microsoft and NVIDIA.',
      implication: 'Expect AI and data platform content to be bundled into cloud proposals, often as the way to hit a larger commitment. Treat it as optional scope: ask what you would use in year one, what it costs on its own, and whether it can be added later at the same discount.',
      when: s => s.products?.some(p => ['ai', 'bdc', 'btp', 'sac'].includes(p)) || s.changeEvents?.some(e => ['aipush', 'bdcpush'].includes(e)) || s.eventType === 'ai-btp',
    },
    {
      id: 'ai-pricing', kind: 'licensing', date: 'Jul 23, 2026',
      event: 'Agent and outcome-based pricing signalled',
      detail: 'On the Q2 call, Klein described a move from user-based and subscription pricing toward outcome-based pricing tied to autonomous agents, an opportunity to "completely reset the price level". Contract detail is not yet public. Licensing advisors also report that use-based AI pricing became the default posture at cloud renewals from July 2026, with AI units that expire after 12 months. This is advisor-reported and not confirmed by SAP.',
      implication: 'AI consumption is becoming a separate commercial line that is easy to over-buy and hard to measure. Cap it, ask for rollover, and insist on a defined baseline before agreeing to any outcome-based metric. Do not let AI units be the thing that absorbs your discount.',
      when: s => s.products?.some(p => ['ai', 'rise', 'grow'].includes(p)) || s.changeEvents?.includes('aipush') || s.costPressures?.includes('aiunits') || s.eventType === 'ai-btp' || s.eventType === 'rise-renewal',
    },
    {
      id: 'digital-access', kind: 'licensing', date: 'Since 2018',
      event: 'Digital Access (document-based indirect use)',
      detail: 'Since 2018 SAP has licensed indirect use of S/4HANA and ECC through Digital Access, a document-based metric covering records created or processed by non-SAP systems, such as sales, purchase and invoice documents. Licensing advisors report that SAP audits treat unlicensed document creation as a primary exposure and that standard system measurement does not fully surface it. Advisor-reported.',
      implication: 'Map every non-SAP system that writes to SAP before an audit or a migration conversation. A migration is often when SAP re-opens the question, so know the volumes and the contract position first.',
      when: s => s.digitalAccess === 'high' || s.digitalAccess === 'moderate' || s.digitalAccess === 'unknown' || ['soft', 'notice', 'inprogress', 'findings'].includes(s.auditStatus) || s.eventType === 'audit',
    },
    {
      id: 's4-2040', kind: 'licensing', date: 'Feb 2020',
      event: 'S/4HANA innovation commitment to 2040',
      detail: 'SAP committed that at least one S/4HANA release will always be in maintenance through 2040.',
      implication: 'On-premises S/4HANA is not a stranded option. If a RISE quote is not competitive, a self-hosted S/4HANA estate on your own cloud account is a legitimate comparison, and it keeps you in control of infrastructure cost.',
      when: s => s.primaryContract === 's4onprem' || s.products?.includes('s4') || s.estateDirection === 's4' || s.alternativeVendor === 'selfhosted',
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
  ecc: 'ECC 6.0', s4: 'S/4HANA on-premises', rise: 'RISE / Cloud ERP Private', grow: 'Cloud ERP Public / GROW',
  hana: 'BW / HANA', sf: 'SuccessFactors', ariba: 'Ariba', concur: 'Concur / Fieldglass', cx: 'CX',
  scm: 'Supply chain', btp: 'BTP', bdc: 'Business Data Cloud', ai: 'Business AI', sac: 'Analytics Cloud',
};
const ONPREM_PRODUCTS = ['ecc', 's4', 'hana'];
const CLOUD_PRODUCTS = ['rise', 'grow', 'sf', 'ariba', 'concur', 'cx', 'scm', 'btp', 'bdc', 'ai', 'sac'];

const VENDOR_LABELS = {
  selfhosted: 'self-hosted S/4HANA', thirdparty: 'third-party ECC support', stayecc: 'staying on ECC with extended maintenance',
  oracle: 'Oracle Fusion or NetSuite', workday: 'Workday', dynamics: 'Microsoft Dynamics 365',
  bestofbreed: 'best-of-breed modules', none: 'no credible alternative',
};

const CONTRACT_LABELS = {
  ecc: 'ECC + maintenance', s4onprem: 'S/4HANA on-premises', rise: 'RISE / Cloud ERP Private', grow: 'Cloud ERP Public',
  lob: 'SAP cloud lines of business', mixed: 'On-premises + cloud', unknown: 'Contract structure unknown',
};

const EVENT_LABELS = {
  maintenance: 'Maintenance renewal', migrate: 'S/4HANA move or RISE purchase', 'rise-renewal': 'RISE renewal or expansion',
  'ecc-extended': 'ECC end of mainstream maintenance', cloud: 'New cloud purchase', 'ai-btp': 'BTP / data / AI purchase',
  audit: 'Audit settlement',
};

const hasAny = (s, list) => list.some(p => s.products?.includes(p));
const onPremEstate = s => ['ecc', 's4onprem', 'mixed'].includes(s.primaryContract) || hasAny(s, ONPREM_PRODUCTS);
const onEcc = s => s.primaryContract === 'ecc' || s.primaryContract === 'mixed' || s.products?.includes('ecc');
const riseInPlay = s => s.primaryContract === 'rise' || s.products?.includes('rise') || ['migrate', 'rise-renewal'].includes(s.eventType)
  || s.estateDirection === 'rise' || s.changeEvents?.includes('risepush');
const auditActive = s => ['notice', 'inprogress', 'findings'].includes(s.auditStatus) || s.eventType === 'audit';
const eccNotMigrated = s => onEcc(s) && ['notstarted', 'planning'].includes(s.migrationStatus);

// SAP's fiscal year is the calendar year.
// Q1 = Jan–Mar, Q2 = Apr–Jun, Q3 = Jul–Sep, Q4 = Oct–Dec.
const FISCAL_QUARTER = {
  1: 'Q1', 2: 'Q1', 3: 'Q1', 4: 'Q2', 5: 'Q2', 6: 'Q2',
  7: 'Q3', 8: 'Q3', 9: 'Q3', 10: 'Q4', 11: 'Q4', 12: 'Q4',
};

function fiscalContext(month) {
  const m = parseInt(month, 10);
  const q = FISCAL_QUARTER[m];
  if (!q) return null;
  if (m === 12) {
    return {
      quarter: 'Q4', strength: 'peak', bonus: 12,
      note: 'Your decision lands in December, the last month of SAP\'s fiscal year, which closes December 31. This is SAP\'s highest-leverage window. Annual targets are settled here, and approval for deep discounts and unusual terms is easiest in the final two weeks. Be ready to sign, because SAP will also try to use the date against you.',
    };
  }
  if (q === 'Q4') {
    return {
      quarter: 'Q4', strength: 'peak', bonus: 10,
      note: 'Your decision lands in SAP\'s fiscal Q4 (October to December), its strongest period for large cloud commitments. A decision you can hold until the final weeks of December, without putting maintenance continuity at risk, gets the most out of the window.',
    };
  }
  if ([3, 6, 9].includes(m)) {
    return {
      quarter: q, strength: 'good', bonus: 6,
      note: `Your decision lands at the close of SAP's fiscal ${q}. Quarter ends add real pressure, though less than the October to December year-end push.`,
    };
  }
  return {
    quarter: q, strength: 'weak', bonus: 0,
    note: `Your decision falls mid-quarter in SAP's fiscal ${q}, away from any quota deadline${m === 1 ? '. January is also the first month of SAP\'s new fiscal year, when urgency is at its lowest' : ''}. Maintenance renewals are dated by contract, but cloud purchases, RISE signatures, and audit settlements can often be timed to land in Q4 or at a quarter end.`,
  };
}

// ─── The ECC clock ────────────────────────────────────────────────────────────
// Mainstream maintenance for Business Suite 7 ends Dec 31, 2027.
// Extended maintenance (Jan 1, 2028 to Dec 31, 2030) costs +2 points on the basis.
const ECC_MAINSTREAM_END = new Date(2027, 11, 31);
function eccMonthsRemaining(now = new Date()) {
  const days = (ECC_MAINSTREAM_END - now) / 86400000;
  return Math.max(0, Math.round(days / 30.44));
}
const EXTENDED_PREMIUM_POINTS = 2;
const STANDARD_MAINTENANCE_PCT = 22;   // Enterprise Support, % of license value
const EXTENDED_UPLIFT = EXTENDED_PREMIUM_POINTS / STANDARD_MAINTENANCE_PCT;  // ≈ 9%

// ─── Deal calibration hook (shared across Proxima planners) ──────────────────
// SAP uses the shared SaaS-scale spend tiers (keys carry the historical
// `sf-` prefix). SAP deals are filtered by provider, not by prefix.
const ACV_TO_CAL_TIER = {
  'under100k': 'sf-under100k', '100k-250k': 'sf-100k-250k', '250k-500k': 'sf-250k-500k',
  '500k-1m': 'sf-500k-1m', '1m-2500k': 'sf-1m-2500k', '2500k-5m': 'sf-2500k-5m',
  '5m-10m': 'sf-5m-10m', '10mplus': 'sf-10mplus',
};

function getProximaInsight(calTier) {
  try {
    const deals = JSON.parse(localStorage.getItem('proxima-deals') || '[]');
    const sp = deals.filter(d => d.provider === 'sap');
    if (!sp.length) return null;
    const tierDeals = calTier ? sp.filter(d => d.tier === calTier) : [];
    const relevant = tierDeals.length >= 2 ? tierDeals : sp;
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
  // A third-party support quote or a costed self-hosted option is the alternative SAP cannot discount away
  if (s.supportStream === 'thirdparty') score += 6;
  else if (s.supportStream === 'considering') score += 3;
  if (s.alternativeVendor === 'selfhosted' && ['evaluating', 'dual'].includes(s.alternative)) score += 2;

  // Fiscal timing only matters where the date can move; maintenance renewals are fixed
  const fc = fiscalContext(s.renewalMonth);
  const timingWeight = s.eventType === 'maintenance' ? 0.4 : 1;
  score += fc ? Math.round(fc.bonus * timingWeight) : 0;

  const runwayMap = { '12plusmo': 14, '6-12mo': 14, '3-6mo': 9, '1-3mo': 4, 'within-1mo': 0 };
  score += runwayMap[s.renewalTimeline] ?? 0;

  // The ECC deadline works against customers who have not started
  if (eccNotMigrated(s)) {
    const months = eccMonthsRemaining();
    if (months <= 15) score -= s.migrationStatus === 'notstarted' ? 7 : 4;
    else if (months <= 24) score -= 2;
  }

  // Compliance exposure is SAP's strongest card
  const auditMap = { none: 6, closed: 4, soft: 2, notice: -4, inprogress: -8, findings: -12 };
  score += auditMap[s.auditStatus] ?? 0;
  const confMap = { high: 8, moderate: 3, low: -6, unknown: -3 };
  score += confMap[s.complianceConfidence] ?? 0;
  if (s.digitalAccess === 'high') score -= 4;
  else if (s.digitalAccess === 'unknown') score -= 2;
  if (['low', 'unknown'].includes(s.userPosition) && onPremEstate(s)) score -= 2;

  const tier = ACV_TIERS[s.annualSpend]?.tier ?? 0;
  score += Math.min(tier * 2, 12);

  // SAP rewards cloud backlog, so a credible cloud move is a carrot; a credible reduction is a threat
  const dirMap = { reduce: 8, rise: 6, grow: 6, s4: 3, stay: 2 };
  score += dirMap[s.estateDirection] ?? 0;

  const relMap = { strategic: 6, strong: 5, moderate: 3, poor: 1, none: 0 };
  score += relMap[s.relationshipQuality] ?? 0;

  const expMap = { experienced: 7, moderate: 4, basic: 2, none: 0 };
  score += expMap[s.previousNegotiation] ?? 0;

  // Change events, capped in aggregate so stacked carrots don't saturate the score
  let eventScore = 0;
  if (s.changeEvents?.includes('expansion')) eventScore += 5;
  if (s.changeEvents?.includes('hyperscaler')) eventScore += 4;
  if (s.changeEvents?.includes('risepush')) eventScore += 3;    // SAP has backlog targets
  if (s.changeEvents?.includes('aipush')) eventScore += 2;
  if (s.changeEvents?.includes('bdcpush')) eventScore += 2;
  if (s.changeEvents?.includes('dcexit')) eventScore += 3;
  const mnaAdj = mnaLeverageAdjustment(s);
  score += mnaAdj > 0 ? Math.min(Math.min(eventScore, 9) + mnaAdj, 11) : Math.min(eventScore, 9) + mnaAdj;

  if (['procurement', 'cfo', 'sam'].includes(s.internalChampion)) score += 3;
  if (s.internalChampion === 'none') score -= 3;

  return Math.max(0, Math.min(Math.round(score), 100));
}

// M&A changes leverage only once it can be used. A confidential deal cannot be
// put in front of SAP, so it moves nothing until it is announced.
function mnaLeverageAdjustment(s) {
  if (!s.mnaEnabled || s.mnaStage === 'confidential') return 0;
  let adj = { acquiring: 3, merger: 2, acquired: -2, divesting: -4 }[s.mnaType] ?? 0;
  // SAP licenses are granted to named entities, so a transaction also opens a
  // compliance question SAP can use.
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

// ─── Renewal-increase model ───────────────────────────────────────────────────
function getIncreaseOutlook(s, leverage) {
  const cloudLed = ['rise', 'grow', 'lob'].includes(s.primaryContract) || ['rise-renewal', 'cloud', 'ai-btp'].includes(s.eventType);
  let askLo, askHi;
  if (s.priceProtection === 'capped') { askLo = 0; askHi = 4; }
  else if (cloudLed) { askLo = 4; askHi = 8; }                  // subscription escalators and renewal re-pricing
  else if (s.eventType === 'ecc-extended' || s.supportStream === 'extended') { askLo = 9; askHi = 12; }  // +2 points on 22% is about +9%, plus index
  else if (s.priceProtection === 'expiring') { askLo = 4; askHi = 8; }
  else { askLo = 2; askHi = 6; }

  if (s.costPressures?.includes('uplift')) askHi += 1;
  if (s.alternative === 'none') askHi += 1;

  let capLo, capHi;
  if (leverage >= 70) { capLo = 0; capHi = 2; }
  else if (leverage >= 55) { capLo = 0; capHi = 3; }
  else if (leverage >= 40) { capLo = 2; capHi = 4; }
  else if (leverage >= 25) { capLo = 3; capHi = 5; }
  else { capLo = 3; capHi = 6; }

  if (auditActive(s)) { capLo += 1; capHi += 1; }
  // Extended maintenance carries a published premium, so the floor is not zero
  if (s.eventType === 'ecc-extended' || s.supportStream === 'extended') { capLo = Math.max(capLo, 7); capHi = Math.max(capHi, 9); }
  capHi = Math.min(capHi, askHi);
  capLo = Math.min(capLo, capHi);
  return { askLo, askHi, capLo, capHi, cloudLed };
}

// ─── Discount-off-list model (new subscriptions and RISE) ─────────────────────
// SAP cloud list prices are negotiated heavily on large deals. Bands are
// directional and scale with annual spend.
function getDiscountRange(s, leverage) {
  const tier = ACV_TIERS[s.annualSpend]?.tier ?? 0;
  const base = [
    [8, 20], [12, 26], [18, 32], [24, 38],
    [28, 43], [32, 47], [35, 51], [38, 55],
  ][tier] || [8, 20];

  let [lo, hi] = base;
  if (s.alternative === 'dual') { lo += 5; hi += 7; }
  else if (s.alternative === 'evaluating') { lo += 3; hi += 5; }
  else if (s.alternative === 'none') { lo -= 3; hi -= 4; }

  const fc = fiscalContext(s.renewalMonth);
  if (fc?.strength === 'peak') { lo += 4; hi += 6; }
  else if (fc?.strength === 'good') { lo += 2; hi += 3; }

  // Longer commitments buy deeper discount, at the price of flexibility
  if (s.riseTerm === 'proposed5') { lo += 2; hi += 4; }

  if (s.changeEvents?.includes('expansion')) { lo += 1; hi += 3; }
  if (s.changeEvents?.includes('hyperscaler')) { lo += 1; hi += 2; }
  // Purchases made to settle an audit get the least discount
  if (auditActive(s)) { lo -= 5; hi -= 5; }
  // Customers up against the ECC date negotiate from a weaker position
  if (eccNotMigrated(s) && eccMonthsRemaining() <= 15) { lo -= 2; hi -= 3; }
  if (leverage < 25) hi -= 4;

  lo = Math.max(0, Math.round(lo));
  hi = Math.min(Math.round(hi), 75);
  hi = Math.max(lo + 5, hi);
  return { lo, hi, midpoint: Math.round((lo + hi) / 2) };
}

// ─── Recoverable spend model ──────────────────────────────────────────────────
function getRecoveryEstimate(s) {
  const acv = ACV_TIERS[s.annualSpend]?.mid;
  if (!acv) return null;

  // Share of spend that is on-premises maintenance versus subscription
  const maintShare = { ecc: 0.9, s4onprem: 0.9, mixed: 0.55, lob: 0.05, rise: 0.05, grow: 0.03, unknown: 0.6 }[s.primaryContract] ?? 0.6;
  const maintSpend = acv * maintShare;
  const subSpend = acv * (1 - maintShare);
  const round = n => Math.round(n / 1000) * 1000;
  const lines = [];

  // SAP's support rules make partial reduction hard, so recovery is modelled
  // well below the shelfware share.
  const shelf = {
    significant: [.25, .35, 'over 25% of spend on unused licenses'],
    some: [.10, .25, '10–25% of spend on unused licenses'],
    little: [0, .08, 'under 10% unused'],
    unknown: [.08, .20, 'never reconciled'],
  }[s.shelfware];
  if (shelf && maintSpend > 0 && onPremEstate(s)) {
    lines.push({
      label: 'Terminating maintenance on unused license sets',
      basis: `${shelf[2]}, at roughly 50% recoverability because SAP's support rules restrict partial reduction`,
      lo: round(maintSpend * shelf[0] * 0.5), hi: round(maintSpend * shelf[1] * 0.5),
    });
  }

  // User-type rightsizing: Professional users who do Employee-level work, inactive users
  const userRisk = ['misclass', 'low', 'unknown'].includes(s.userPosition) || s.costPressures?.includes('fue');
  if (userRisk && subSpend > 0) {
    const userLine = subSpend * 0.5;   // roughly half of a RISE or cloud order is the user-licensed software line
    lines.push({
      label: 'User-type rightsizing (FUE and named users)',
      basis: 'reclassifying over-specified Professional users and removing inactive users, on the roughly half of subscription spend that is user-licensed',
      lo: round(userLine * 0.06), hi: round(userLine * 0.15),
    });
  }

  // RISE infrastructure and system sizing
  if ((s.costPressures?.includes('infra') || riseInPlay(s)) && subSpend > 0 && s.hosting !== 'onprem') {
    lines.push({
      label: 'RISE sizing: HANA memory and non-production systems',
      basis: 'right-sizing memory tiers, retiring idle sandbox and test systems, and removing disaster-recovery you do not need, on roughly a fifth of subscription spend',
      lo: round(subSpend * 0.2 * 0.05), hi: round(subSpend * 0.2 * 0.15),
    });
  }

  // Third-party support vendors advertise roughly 50% off SAP's fee. Apply
  // only to the stable part of the estate where SAP roadmap matters less.
  if (['considering', 'thirdparty'].includes(s.supportStream) || s.alternativeVendor === 'thirdparty') {
    const tpScope = onEcc(s) ? [.15, .4] : [.05, .2];
    lines.push({
      label: 'Third-party support on stable ECC and add-on systems',
      basis: `${Math.round(tpScope[0] * 100)}–${Math.round(tpScope[1] * 100)}% of maintenance in scope, at the ~50% saving third-party vendors advertise`,
      lo: round(maintSpend * tpScope[0] * 0.5), hi: round(maintSpend * tpScope[1] * 0.5),
    });
  }

  // A cap removes future increases. Show one year of avoided increase.
  if (s.priceProtection !== 'capped') {
    lines.push({
      label: 'Next year\'s increase avoided by a cap',
      basis: 'a 0–3% cap against an uncapped 3–7% increase, for one year',
      lo: round(acv * 0.03), hi: round(acv * 0.05),
    });
  }

  if ((s.costPressures?.includes('aiunits') || hasAny(s, ['ai', 'bdc', 'btp'])) && subSpend > 0) {
    lines.push({
      label: 'Unused AI units and platform credits',
      basis: 'resizing AI, BTP and data commitments to observed consumption at renewal',
      lo: round(subSpend * 0.04), hi: round(subSpend * 0.12),
    });
  }

  const lo = lines.reduce((t, l) => t + l.lo, 0);
  const hi = lines.reduce((t, l) => t + l.hi, 0);
  if (hi < 10000) return null;
  return { lines: lines.filter(l => l.hi > 0), lo, hi, acv, maintSpend: round(maintSpend), subSpend: round(subSpend) };
}

// The extended-maintenance premium on the estate's maintenance, in dollars.
function extendedMaintenanceCost(s) {
  const acv = ACV_TIERS[s.annualSpend]?.mid;
  if (!acv || !onEcc(s)) return null;
  const maintShare = { ecc: 0.9, s4onprem: 0.9, mixed: 0.55, unknown: 0.6 }[s.primaryContract] ?? 0.55;
  // Only the Business Suite 7 part of maintenance carries the premium; for a
  // mixed estate assume most of the on-premises line is ECC.
  const eccShare = s.primaryContract === 'mixed' ? 0.8 : 1;
  const maint = acv * maintShare * eccShare;
  const round = n => Math.round(n / 1000) * 1000;
  return { yearly: round(maint * EXTENDED_UPLIFT), threeYear: round(maint * EXTENDED_UPLIFT * 3), maint: round(maint) };
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
  if (s.eventType === 'rise-renewal') return 'RISE Renewal Reset';
  if (s.eventType === 'migrate' || (eccNotMigrated(s) && s.estateDirection === 'rise')) return 'Negotiate the RISE Deal';
  if (eccNotMigrated(s) && eccMonthsRemaining() <= 15) return 'Run the ECC Clock';
  if (s.estateDirection === 'reduce' || s.shelfware === 'significant') return 'Rationalize Spend';
  if (['considering', 'thirdparty'].includes(s.supportStream)) return 'Support Model Review';
  if (leverage >= 55 && ['migrate', 'cloud', 'ai-btp'].includes(s.eventType)) return 'Quarter-End Competitive Deal';
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
  const recovery = getRecoveryEstimate(s);
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
  const context = SAP_CONTEXT.rows.filter(r => r.when(s));
  const proxima = getProximaInsight(ACV_TO_CAL_TIER[s.annualSpend]);
  const showEccClock = onEcc(s) && s.migrationStatus !== 'done';
  const showDigital = ['high', 'moderate', 'unknown'].includes(s.digitalAccess) || auditActive(s) || s.auditStatus === 'soft';

  return `
<div class="strategy-container">
  <div class="print-proxima-header">
    <span class="print-logo-text">Proxima</span>
    <span class="print-divider"></span>
    <span class="print-tool-name">SAP Negotiation Planner</span>
  </div>

  <div class="strategy-hero">
    <h2>Your SAP Negotiation Strategy</h2>
    <div class="subtitle">${sizeLabels[s.companySize] || 'Company'} · ${acvLabel} annual spend · ${CONTRACT_LABELS[s.primaryContract] || 'SAP'} · ${EVENT_LABELS[s.eventType] || ''}${s.mnaEnabled ? ' · M&amp;A in scope' : ''} · Generated ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
    <div style="font-size:.75rem;color:rgba(255,255,255,.6);font-style:italic;margin-top:4px;">Intended for Proxima use only, please contact Brian Chernauskas with questions</div>
    <div style="font-size:.7rem;color:rgba(255,255,255,.35);margin-top:3px;">Ranges last calibrated: ${RANGES_LAST_UPDATED} · Directional estimates, not SAP-published figures</div>
    <div class="score-row">
      <div class="score-pill">
        <span class="pill-label">Leverage Score</span>
        <span class="pill-value" style="color:${leverageInfo.color}">${leverage}/100: ${leverageInfo.label}</span>
      </div>
      <div class="score-pill">
        <span class="pill-label">Target Annual Increase</span>
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
        <span class="section-badge ${fc.strength === 'peak' ? 'green' : fc.strength === 'good' ? 'blue' : ''}">SAP fiscal ${fc.quarter}</span>
      </div>
      <div class="section-content">
        <p style="font-size:.92rem;line-height:1.7;color:var(--text-secondary);">${fc.note}</p>
        <p style="font-size:.85rem;line-height:1.7;color:var(--text-muted);margin-top:10px;">SAP's fiscal year is the calendar year. Quarters run January to March, April to June, July to September, and October to December, so fiscal 2026 closes December 31, 2026. ${s.eventType === 'maintenance' ? 'Maintenance renewals are invoiced on their contract dates, so timing mostly helps when you pair the renewal with something SAP wants to book, such as a cloud commitment, a RISE conversion, or a co-terming exercise.' : ''}</p>
      </div>
    </div>` : ''}

    ${showEccClock ? eccClockHTML(s) : ''}

    <div class="strategy-section">
      <div class="section-header">
        <span class="section-icon">🏢</span>
        <h3>SAP Corporate &amp; Licensing Context</h3>
        <span class="section-badge">Verified ${SAP_CONTEXT.verifiedOn}</span>
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
        <p style="margin-top:10px;font-size:.76rem;color:var(--text-muted);line-height:1.6;">These are dated, sourced events rather than estimates. Rows marked advisor-reported come from licensing advisory firms and are not confirmed by SAP. Licensing rows appear only when your inputs make them relevant.</p>
      </div>
    </div>

    ${riseSectionHTML(s)}

    ${migrationPathsHTML(s)}

    ${mna ? mnaSectionHTML(s, mna) : ''}

    <div class="strategy-section">
      <div class="section-header">
        <span class="section-icon">📈</span>
        <h3>Renewal Increase Outlook</h3>
        <span class="section-badge">${increase.cloudLed ? 'Subscription escalators' : 'Maintenance over time'}</span>
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
            <div class="de-note">Uncapped, expect SAP to raise ${increase.cloudLed ? 'subscription' : 'maintenance'} fees <strong>${increase.askLo}–${increase.askHi}%</strong> · Your target: <strong>${increase.capLo}–${increase.capHi}%</strong> · Stretch: <strong>${s.eventType === 'ecc-extended' || s.supportStream === 'extended' ? 'premium waived or phased' : 'flat for the term'}</strong></div>
          </div>
        </div>
        <p style="margin-top:14px;font-size:.88rem;line-height:1.7;color:var(--text-secondary);">
          ${increase.cloudLed
            ? 'Cloud and RISE subscriptions carry annual escalators and are repriced at renewal, so the protection belongs in the original order: a fixed or index-linked cap that applies to every line, including add-ons you buy during the term, and a renewal price expressed as a discount off a stated list rather than a fresh quote.'
            : 'On-premises maintenance is typically 22% of the license value, adjusted by index, and the extended-maintenance premium takes it to about 24% for ECC from 2028. Over a decade maintenance costs more than the licenses did. A cap is worth more than almost any one-time discount, and the only moment to win one is when SAP wants something from you: a cloud commitment, a RISE conversion, or an audit closed.'}
        </p>
        ${factorsTableHTML(s, fc)}
      </div>
    </div>

    <div class="strategy-section">
      <div class="section-header">
        <span class="section-icon">💰</span>
        <h3>Discount Off List: New Subscriptions &amp; RISE</h3>
        <span class="section-badge blue">${acvLabel}</span>
      </div>
      <div class="section-content">
        <div class="discount-estimate">
          <div>
            <div class="de-range">${discount.lo}–${discount.hi}%</div>
            <div class="de-label">vs. SAP's list price</div>
          </div>
          <div class="de-bar-wrap">
            <div class="de-bar-bg">
              <div class="de-bar-fill" style="width:${Math.min(discount.hi * 1.4, 100)}%"></div>
            </div>
            <div class="de-note">Midpoint target: <strong>${discount.midpoint}%</strong> · Walk-away floor: <strong>${discount.lo}%</strong> · Stretch goal: <strong>${discount.hi}%</strong></div>
          </div>
        </div>
        ${auditActive(s) ? `<div class="alert alert-warning" style="margin-top:14px;"><span class="alert-icon">⚖️</span><div><strong>This range is lowered for an open audit.</strong> A purchase made to settle a compliance claim is priced from SAP's strongest position. Challenge the findings before you discuss any purchase, and do not accept a cloud conversion as a "settlement" until you have tested the claim.</div></div>` : ''}
        ${eccNotMigrated(s) && eccMonthsRemaining() <= 15 ? `<div class="alert alert-warning" style="margin-top:14px;"><span class="alert-icon">⏳</span><div><strong>This range is lowered for the ECC deadline.</strong> With about ${eccMonthsRemaining()} months to the end of mainstream maintenance and migration ${s.migrationStatus === 'notstarted' ? 'not started' : 'still in planning'}, SAP knows you need a plan. A costed extended-maintenance fallback is what restores the discount.</div></div>` : ''}
        ${proxima ? `<div style="margin-top:10px;padding:10px 14px;background:rgba(0,112,242,.06);border:1px solid rgba(0,112,242,.22);border-radius:8px;font-size:.82rem;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <span style="font-weight:700;color:#0050B8;">📊 Proxima Deal Data</span>
          <span style="color:var(--text-muted);">Based on <strong>${proxima.count} SAP deal${proxima.count !== 1 ? 's' : ''}</strong>${proxima.tierMatch ? ' at this spend tier' : ' across all tiers'}: observed avg <strong>${proxima.avg}%</strong>, range <strong>${proxima.lo}–${proxima.hi}%</strong></span>
        </div>` : ''}
        <p style="margin-top:14px;font-size:.82rem;line-height:1.7;color:var(--text-muted);">
          SAP does not publish a public price list for RISE or most cloud products, and quotes combine software, infrastructure and services, so a headline discount hides what moved. Ask for the order itemized by line, compare discount on each line separately, and never accept a deeper subscription discount paired with a higher escalator, a larger user count than you need, or a longer term without a matching price protection.${s.riseTerm === 'proposed5' ? ' A five-year term typically earns a deeper discount than three years; the range above includes that, but only worth taking if the usage forecast and exit terms hold for five years.' : ''}
        </p>
      </div>
    </div>

    ${showDigital ? digitalAccessHTML(s) : ''}

    ${recovery ? `
    <div class="strategy-section">
      <div class="section-header">
        <span class="section-icon">✂️</span>
        <h3>Spend Recovery</h3>
        <span class="section-badge green">Reduce the base before you negotiate</span>
      </div>
      <div class="section-content">
        <div class="discount-estimate">
          <div>
            <div class="de-range" style="font-size:1.6rem;">${fmtMoney(recovery.lo)}–${fmtMoney(recovery.hi)}</div>
            <div class="de-label">estimated annual recoverable spend</div>
          </div>
          <div class="de-bar-wrap">
            <div class="de-note">Against a midpoint annual spend of <strong>${fmtMoney(recovery.acv)}</strong>, of which roughly <strong>${fmtMoney(recovery.maintSpend)}</strong> is on-premises maintenance and <strong>${fmtMoney(recovery.subSpend)}</strong> is subscription.</div>
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
          SAP's support terms generally require maintenance on the whole licensed base of a product set, and removing licenses can reprice what remains, so savings come from ending whole license sets rather than individual licenses. Map every license to the system and users behind it first. For subscriptions, the largest controllable lines are user types and the size of the hosted systems, because those are what the renewal reprices.
        </p>
        <p style="margin-top:10px;font-size:.82rem;line-height:1.7;color:var(--text-muted);font-style:italic;">
          Directional estimate derived from your spend band, contract structure, and reported shelfware. It is not a measured figure. Third-party support savings are vendor-advertised, and moving off SAP maintenance ends access to SAP patches and new releases for the products moved.
        </p>
      </div>
    </div>` : ''}

    <div class="strategy-section">
      <div class="section-header">
        <span class="section-icon">🎯</span>
        <h3>Negotiation Tactics: Ranked by Impact</h3>
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
        <h3>Questions to Ask SAP</h3>
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
          <strong>Corporate and licensing events are verified. Percentages are estimates.</strong> The events above are dated and sourced, checked ${SAP_CONTEXT.verifiedOn}, and the ECC maintenance dates and premium come from SAP's published maintenance commitments. SAP does not publish negotiated discounts, escalators, or audit settlement outcomes, so every percentage in this plan is a directional estimate based on publicly reported procurement practice and Proxima engagement experience. Discount bands scale with annual spend and are adjusted for audit status, competitive position, fiscal timing, and the ECC deadline. Claims marked advisor-reported come from licensing advisory firms and should be confirmed against the actual order forms.
        </p>
        <p style="font-size:.86rem;line-height:1.75;color:var(--text-secondary);margin-top:10px;">
          <strong>RISE bundle contents change.</strong> SAP renamed and repackaged the offer during 2025 and 2026. The component table in this plan is a checklist of what to pin down, not a statement of what any given order form contains. Read the current Order Form, Supplement and Service Description for the actual scope.
        </p>
        <p style="font-size:.86rem;line-height:1.75;color:var(--text-secondary);margin-top:10px;">
          <strong>Compliance guidance is commercial, not legal.</strong> User-type classification, digital access, and audit rights depend on the exact wording of your SAP software license agreement, order forms, and the policy documents they incorporate. Have licensing counsel or a specialist review any claim before accepting it.
        </p>
        ${s.mnaEnabled ? `<p style="font-size:.86rem;line-height:1.75;color:var(--text-secondary);margin-top:10px;">
          <strong>M&amp;A guidance is commercial, not legal.</strong> Assignment, change-of-control, affiliate-use, and transition-services rights depend on your SAP agreements and on the transaction structure (asset versus stock purchase, merger, spin-off). Have deal counsel review the actual clauses before relying on any of the positions above.
        </p>` : ''}
        <p style="font-size:.86rem;line-height:1.75;color:var(--text-secondary);margin-top:10px;">
          Use these ranges to decide what to target and where to push, not as figures to quote to a client or to SAP. Where a specific number matters to a deal, check it against the client's own agreements and against outcomes logged in Deal Calibration.
        </p>
      </div>
    </div>

  </div>
  <div class="proxima-strategy-footer" style="margin-top:32px;padding-top:16px;border-top:1px solid var(--border);text-align:center;font-size:.78rem;color:var(--text-muted);font-style:italic;">
    Intended for Proxima use only, please contact Brian Chernauskas with questions
  </div>
</div>`;
}

// ═══ ECC clock ═══════════════════════════════════════════════════════════════
function eccClockHTML(s) {
  const months = eccMonthsRemaining();
  const ext = extendedMaintenanceCost(s);
  const behind = ['notstarted', 'planning'].includes(s.migrationStatus);
  const verdict = months === 0
    ? 'Mainstream maintenance has ended. Anything still on ECC is either on extended maintenance, on a third-party contract, or unsupported.'
    : behind && months <= 15
      ? `With migration ${s.migrationStatus === 'notstarted' ? 'not started' : 'still in planning'}, a full migration before the date is unlikely. Plan to enter 2028 on extended maintenance for at least part of the estate, and negotiate that as a deliberate choice rather than a failure.`
      : s.migrationStatus === 'inflight' || s.migrationStatus === 'partial'
        ? 'Migration is underway. Identify which entities and modules will not make the date, and cost extended maintenance for only those, not the whole estate.'
        : 'There is time to run a competitive process, but SAP\'s sales motion assumes you will decide in the next two or three quarters. Use the runway.';
  return `
    <div class="strategy-section">
      <div class="section-header">
        <span class="section-icon">⏳</span>
        <h3>The ECC Clock</h3>
        <span class="section-badge ${behind && months <= 15 ? '' : 'blue'}">Mainstream maintenance ends Dec 31, 2027</span>
      </div>
      <div class="section-content">
        <div class="discount-estimate">
          <div>
            <div class="de-range">${months}</div>
            <div class="de-label">months to end of mainstream maintenance</div>
          </div>
          <div class="de-bar-wrap">
            <div class="de-note">${verdict}</div>
          </div>
        </div>
        ${ext ? `
        <div class="discount-estimate" style="margin-top:14px;">
          <div>
            <div class="de-range" style="font-size:1.6rem;">+${fmtMoney(ext.yearly)}/yr</div>
            <div class="de-label">extended-maintenance premium, est.</div>
          </div>
          <div class="de-bar-wrap">
            <div class="de-note">Extended maintenance adds <strong>2 percentage points</strong> to the maintenance basis, about a ${Math.round(EXTENDED_UPLIFT * 100)}% increase on a 22% rate. On roughly <strong>${fmtMoney(ext.maint)}</strong> of ECC maintenance that is about <strong>${fmtMoney(ext.yearly)}</strong> a year, or <strong>${fmtMoney(ext.threeYear)}</strong> over the three available years (2028 to 2030), before any index increase.</div>
          </div>
        </div>` : ''}
        <p style="margin-top:14px;font-size:.88rem;line-height:1.7;color:var(--text-secondary);">
          The date is real, but the cost of missing it is bounded: three more years of support at about a 9% premium, with scope focused on security and legal compliance rather than new functionality. That figure is the number to put against any RISE proposal that is framed as urgent. If RISE costs more over the same period than staying on extended maintenance while you migrate, SAP is asking you to pay for speed, and that is a negotiable price.
        </p>
        <p style="margin-top:10px;font-size:.82rem;line-height:1.7;color:var(--text-muted);font-style:italic;">
          Dates and the two-point premium are from SAP's published maintenance commitments (February and June 2020). The dollar figure uses a representative maintenance share of your spend band and the standard 22% rate. Confirm both against your actual contract.
        </p>
      </div>
    </div>`;
}

// ═══ RISE with SAP / Cloud ERP Private ═══════════════════════════════════════
const RISE_COMPONENTS = [
  { part: 'Software subscription (FUE)', verify: 'Users are priced by Full User Equivalent and user type. Professional users cost most; Productivity, Developer and Employee-level types cost less. Confirm the count and the mix, and how a user is reclassified.', lever: 'Right-size the mix before signature. Negotiate the right to reduce users at renewal, and a fixed per-FUE price for adds during the term.' },
  { part: 'Infrastructure and HANA sizing', verify: 'RISE includes infrastructure on a hyperscaler SAP selects, sized by HANA memory and number of systems. Ask for the sizing basis, the production and non-production system list, and what happens when memory needs grow.', lever: 'Challenge the sizing, retire idle systems, and fix the price per memory step. If you hold an AWS, Azure or Google Cloud commitment, ask what bring-your-own-hyperscaler costs and whether hosting spend can count toward your commitment.' },
  { part: 'Managed services and SLA', verify: 'Technical operations are included at defined service levels. Read the availability target, the service credits, the maintenance windows, and which tasks stay with you or a partner.', lever: 'Ask for service credits that bite, a right to exit for repeated misses, and clarity on what counts as customer-caused downtime.' },
  { part: 'Bundled tools and extras', verify: 'Cloud ERP Private is reported to bundle nearly twice as many SKUs as the older Premium package (for example LeanIX), while Datasphere is no longer included. List exactly what is in and what is not.', lever: 'Drop bundled tools you will not use, or ask for the equivalent value as discount. Do not pay for shelfware inside the bundle.' },
  { part: 'Business AI and AI units', verify: 'Premium Plus, which embedded AI units, was discontinued, and AI units are now an add-on. Confirm what AI capability is included in the base, how units are consumed, and when they expire.', lever: 'Cap consumption, ask for rollover or a longer expiry, hold the unit price for the term, and buy only for use cases with an owner.' },
  { part: 'Clean core and extensibility', verify: 'Private edition expects customizations to follow SAP\'s clean-core approach (side-by-side extensions on BTP rather than modifications). Ask what happens to your existing custom code, and whether BTP is included or separate.', lever: 'Get a written scope of what migration of custom code is included, and price BTP separately if it is needed to keep your current functionality.' },
  { part: 'Migration and transition costs', verify: 'The subscription excludes implementation. Ask whether SAP offers a conversion credit against maintenance already paid, how long it lasts, and whether any services or tooling are included.', lever: 'Negotiate the credit explicitly as a line item, with a start date tied to go-live rather than signature, and a ramp so you are not paying twice during the migration.' },
  { part: 'Term, renewal and escalators', verify: 'Terms are typically multi-year (three or five years are common). Ask for the annual escalator, how renewal is priced, and what the exit and data-return terms are.', lever: 'Cap escalators at a fixed percentage or an index, state the renewal price as a discount off a fixed list, and secure data export at exit in a usable format.' },
  { part: 'Compliance and audit rights', verify: 'A subscription moves the audit conversation from "what is installed" to "who and what is using it". Digital access and user classification still apply to the SAP system.', lever: 'Get the digital access position written into the order, with a baseline and a clear statement of which integrations are covered.' },
];

function riseSectionHTML(s) {
  const inPlay = riseInPlay(s);
  const flags = [];
  if (s.costPressures?.includes('fue')) flags.push('You report users reclassified to a more expensive type. Ask SAP for the mapping from your current licenses to FUE types, function by function, before accepting a quote.');
  if (s.costPressures?.includes('infra')) flags.push('You report infrastructure, HANA memory or non-production charges. Ask for the sizing basis and a price per memory step, then challenge the system list.');
  if (s.costPressures?.includes('aiunits')) flags.push('You report AI units priced separately. Treat them as optional, capped scope with a defined owner and baseline.');
  if (s.costPressures?.includes('services')) flags.push('You report migration or managed-service costs outside the subscription. Get a total cost of ownership view that includes them before comparing with self-hosted S/4HANA.');
  if (s.hosting === 'iaas' || s.changeEvents?.includes('hyperscaler')) flags.push('You have your own hyperscaler account or commitment. Price RISE against self-hosted S/4HANA on that account, and ask whether RISE hosting can be purchased through the hyperscaler marketplace in a way that counts toward your commitment. Confirm eligibility with the hyperscaler.');
  if (s.riseTerm === 'proposed5') flags.push('A five-year term is proposed. It buys a deeper discount but locks the user count and the infrastructure sizing, so tie it to a ramp, reduction rights, and a capped escalator.');
  if (s.riseTerm === 'proposed3') flags.push('A three-year term is proposed. Ask for the five-year price as well, so you can see what the longer commitment is worth before choosing.');
  if (onEcc(s) && s.migrationPath === 'greenfield') flags.push('Greenfield means your ECC licenses may have little reuse value. Ask whether a conversion credit still applies, and compare against buying a fresh cloud subscription without the legacy maintenance base.');

  return `
    <div class="strategy-section">
      <div class="section-header">
        <span class="section-icon">🚀</span>
        <h3>RISE with SAP / Cloud ERP Private</h3>
        <span class="section-badge ${inPlay ? 'green' : 'blue'}">${inPlay ? 'In scope for this negotiation' : 'Reference: if SAP proposes it'}</span>
      </div>
      <div class="section-content">
        <p style="font-size:.9rem;line-height:1.7;color:var(--text-secondary);">
          RISE with SAP is SAP's subscription route to S/4HANA. The older "RISE with SAP Premium" package is now sold as <strong>Cloud ERP Private</strong>, Premium Plus has been discontinued, and "RISE with SAP" has become the name for the modernization journey. In practice you sign one contract that combines the S/4HANA software, SAP-selected infrastructure on a hyperscaler, technical managed services, and a set of bundled tools. That convenience is also the difficulty: each element has its own sizing and its own escalator, and the next renewal reprices the sizing you accepted today.
        </p>
        ${flags.length ? `<div class="alerts-list" style="margin-top:14px;">${flags.map(f => `<div class="alert alert-info"><span class="alert-icon">🔎</span><div>${f}</div></div>`).join('')}</div>` : ''}
        <div class="table-scroll" style="margin-top:16px;"><table class="corp-table">
          <thead><tr><th>Component</th><th>What to pin down</th><th>Negotiation lever</th></tr></thead>
          <tbody>${RISE_COMPONENTS.map(c => `<tr><td><strong>${c.part}</strong></td><td>${c.verify}</td><td>${c.lever}</td></tr>`).join('')}</tbody>
        </table></div>
        <p style="margin-top:12px;font-size:.78rem;line-height:1.6;color:var(--text-muted);font-style:italic;">
          This is a checklist of what to establish, not a statement of what your order form contains. Bundle contents changed during 2025 and 2026; read the current Order Form, Supplement and Service Description.
        </p>
      </div>
    </div>`;
}

// ═══ Migration paths ═════════════════════════════════════════════════════════
function migrationPathsHTML(s) {
  if (!onEcc(s) && !['migrate', 'ecc-extended'].includes(s.eventType) && s.estateDirection !== 's4' && s.estateDirection !== 'rise') return '';
  const fits = {
    stay: ['extended', 'thirdparty'], s4: ['selfhosted'], rise: ['rise'], reduce: ['thirdparty', 'extended'], grow: ['rise', 'grow'],
  }[s.estateDirection] || [];
  const paths = [
    { id: 'extended', name: 'Stay on ECC with extended maintenance', cost: 'Maintenance plus a 2-point premium (about 9% more) for 2028 to 2030.', watch: 'Buys three years, not a destination. Scope is narrower, and the cost is paid on a system you still have to leave.', },
    { id: 'selfhosted', name: 'S/4HANA on-premises or self-hosted on your cloud account', cost: 'License conversion plus 22% maintenance; infrastructure paid on your own hyperscaler account.', watch: 'You run and size the platform. Confirm what conversion credit applies to your existing ECC licenses. S/4HANA is committed to be maintained through 2040.', },
    { id: 'rise', name: 'RISE / Cloud ERP Private', cost: 'Multi-year subscription covering software, infrastructure and managed services. Priced by FUE and HANA sizing.', watch: 'Fastest route to SAP\'s current cloud roadmap and the one SAP rewards. Sizing and add-ons are re-priced at renewal, and exit is harder.', },
    { id: 'grow', name: 'Cloud ERP Public / GROW with SAP', cost: 'Standardized multi-tenant subscription with less room for customization.', watch: 'Fits companies willing to adopt standard processes. Poor fit for heavily modified ECC estates.', },
    { id: 'thirdparty', name: 'Third-party support on ECC', cost: 'Vendors advertise around half of SAP\'s maintenance fee.', watch: 'Defers the decision rather than solving it, and ends SAP patches and new releases for those systems. Ask SAP in writing how it affects your eligibility for conversion credits and discounts.', },
  ];
  return `
    <div class="strategy-section">
      <div class="section-header">
        <span class="section-icon">🧭</span>
        <h3>Paths Off ECC: Compare Before You Commit</h3>
        <span class="section-badge blue">Cost the fallback</span>
      </div>
      <div class="section-content">
        <div class="table-scroll"><table class="corp-table">
          <thead><tr><th>Path</th><th>Commercial shape</th><th>Watch for</th></tr></thead>
          <tbody>${paths.map(p => `<tr>
            <td><strong>${p.name}</strong>${fits.includes(p.id) ? '<div style="margin-top:4px;font-size:.72rem;font-weight:700;color:var(--success);">Matches your stated direction</div>' : ''}</td>
            <td>${p.cost}</td>
            <td>${p.watch}</td>
          </tr>`).join('')}</tbody>
        </table></div>
        <p style="margin-top:12px;font-size:.88rem;line-height:1.7;color:var(--text-secondary);">
          SAP's proposal will usually present only the RISE path. Having the other four costed, even roughly, is the largest single source of leverage in an ECC negotiation: it turns "you have to move by 2027" into "RISE is one option and we will take it on the right terms". ${s.alternativeVendor === 'selfhosted' ? 'You named self-hosted S/4HANA as your alternative, so build that total cost of ownership, including infrastructure and operations, to match the RISE quote line by line.' : ''}
        </p>
      </div>
    </div>`;
}

// ═══ Digital access ══════════════════════════════════════════════════════════
function digitalAccessHTML(s) {
  const level = s.digitalAccess === 'high' || s.auditStatus === 'findings' ? 'High' : s.digitalAccess === 'moderate' ? 'Moderate' : s.digitalAccess === 'unknown' ? 'Unknown' : 'Watch';
  const body = {
    high: 'Many non-SAP systems create or process documents in SAP. Each can create a digital access obligation that is not visible in a standard user count. This is one of the largest sources of SAP audit claims, so quantify document volumes by type and by source system before SAP does.',
    moderate: 'You have some integrations that write to SAP. Confirm which create documents, which are read-only, and how your contract treats each, before an audit or a migration conversation opens the question.',
    unknown: 'You have not mapped which systems create documents in SAP. That is the most expensive position to be in if SAP raises it first. Start with e-commerce, CRM, EDI, RPA, IoT and custom applications.',
  }[s.digitalAccess] || 'Digital access is a recurring theme in SAP audit discussions. Confirm your position before responding to any audit-related contact.';
  return `
    <div class="strategy-section">
      <div class="section-header">
        <span class="section-icon">🔌</span>
        <h3>Digital Access Exposure</h3>
        <span class="section-badge ${level === 'High' ? '' : 'blue'}">${level}</span>
      </div>
      <div class="section-content">
        <p style="font-size:.9rem;line-height:1.7;color:var(--text-secondary);">${body}</p>
        <div class="concessions-grid" style="margin-top:14px;">
          <div class="concession-card"><div class="cc-title">1. Map every writing system</div><div class="cc-desc">List each non-SAP system that creates, changes or triggers documents in SAP, with the interface used and the document types.</div></div>
          <div class="concession-card"><div class="cc-title">2. Count and classify</div><div class="cc-desc">Estimate annual document volumes by type, and separate human-triggered from system-triggered activity. Counts and definitions decide the exposure.</div></div>
          <div class="concession-card"><div class="cc-title">3. Read the contract</div><div class="cc-desc">Check which of your agreements address indirect use, which legacy rules apply, and whether any settlement or program in the past changed your position.</div></div>
          <div class="concession-card"><div class="cc-title">4. Paper it before you sign</div><div class="cc-desc">Where a purchase is on the table, ask for written acknowledgement of the digital access position, with a volume baseline and a release for past use.</div></div>
        </div>
        <p style="margin-top:12px;font-size:.78rem;line-height:1.6;color:var(--text-muted);font-style:italic;">
          Commercial guidance only. Digital access terms depend on your agreements and on how SAP applies them. Have licensing counsel or a specialist review the position.
        </p>
      </div>
    </div>`;
}

// ─── Factors table ────────────────────────────────────────────────────────────
function factorsTableHTML(s, fc) {
  const rows = [];
  if (s.alternative === 'dual') rows.push(['Workloads already moving off SAP', 'Strong', 'green']);
  else if (s.alternative === 'evaluating') rows.push(['Active costed alternative or quote', 'Strong', 'green']);
  else if (s.alternative === 'none') rows.push(['No credible alternative, and SAP knows it', 'Weak', 'red']);

  if (s.supportStream === 'thirdparty') rows.push(['Third-party support already in use', 'Strong', 'green']);
  else if (s.supportStream === 'considering') rows.push(['Third-party support under evaluation', 'Moderate', 'green']);

  if (fc?.strength === 'peak') rows.push(['Decision lands in SAP fiscal Q4', s.eventType === 'maintenance' ? 'Moderate' : 'Strong', 'green']);
  else if (fc?.strength === 'good') rows.push(['Decision lands at fiscal quarter end', 'Moderate', 'green']);
  else if (fc?.strength === 'weak') rows.push(['Decision falls mid-quarter', 'Weak', 'red']);

  if (s.renewalTimeline === 'within-1mo' || s.renewalTimeline === '1-3mo') rows.push(['Limited runway before the event', 'Weak', 'red']);
  else if (s.renewalTimeline === '6-12mo' || s.renewalTimeline === '12plusmo') rows.push(['Ample runway to prepare', 'Strong', 'green']);

  if (eccNotMigrated(s) && eccMonthsRemaining() <= 15) rows.push(['ECC deadline close and migration not underway', 'Weak', 'red']);
  else if (onEcc(s) && ['inflight', 'partial'].includes(s.migrationStatus)) rows.push(['Migration already underway', 'Moderate', 'green']);

  if (s.auditStatus === 'findings') rows.push(['Compliance claim on the table', 'Critical', 'red']);
  else if (s.auditStatus === 'inprogress' || s.auditStatus === 'notice') rows.push(['Audit open or noticed', 'Weak', 'red']);
  else if (s.auditStatus === 'none') rows.push(['No active compliance contact', 'Moderate', 'green']);

  if (s.complianceConfidence === 'high') rows.push(['Usage measured and reconciled to entitlements', 'Strong', 'green']);
  else if (['low', 'unknown'].includes(s.complianceConfidence)) rows.push(['Compliance position unknown or exposed', 'Weak', 'red']);
  if (s.digitalAccess === 'high') rows.push(['Heavy digital access (document) exposure', 'Weak', 'red']);

  if (s.estateDirection === 'reduce') rows.push(['Credible plan to shrink the estate', 'Strong', 'green']);
  if (s.shelfware === 'significant') rows.push(['Large unused estate to cut', 'Strong', 'green']);
  if (s.changeEvents?.includes('hyperscaler')) rows.push(['Hyperscaler commitment that can absorb hosting', 'Moderate', 'green']);
  if (s.changeEvents?.includes('risepush')) rows.push(['SAP wants your RISE commitment', 'Moderate', 'green']);

  const mnaAdj = mnaLeverageAdjustment(s);
  if (s.mnaEnabled && s.mnaStage === 'confidential') rows.push(['M&amp;A not yet public, cannot be used as leverage', 'Neutral', 'red']);
  else if (mnaAdj > 0) rows.push(['M&amp;A adds usage SAP wants to keep', 'Moderate', 'green']);
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
  integrating: 'Closed, integrating', settled: 'Closed 12+ months ago',
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
    confidential: 'The transaction is not public, so it can\'t be disclosed to SAP and can\'t be used as leverage. SAP licenses and subscriptions are granted to named entities, and a transaction is a common audit trigger. Quietly check whether your agreements cover affiliates and successors, and ask for that flexibility on its own merits in any deal you sign before announcement.',
    announced: 'The deal is public but hasn\'t closed. SAP knows the estate is about to change and will watch for use that crosses entity lines. Don\'t let the other company\'s users reach your systems, or yours theirs, until the agreements allow it. Keep each party\'s SAP pricing separate until close, and route any comparison through a clean team or counsel.',
    integrating: 'The deal has closed and integration is live. This is where SAP compliance exposure appears: consolidated systems, users from one entity working in the other\'s environment, and integrations that create documents across entities. Map every cross-entity use before SAP does, then negotiate the paperwork to cover it.',
    settled: 'The transaction closed more than a year ago. Any cross-entity use that was never papered is still an exposure, and duplicate contracts are still costing money. Use this negotiation to fix both.',
  }[stage] || '';

  if (adding) {
    items.push({
      priority: 'must', title: 'SAP rights don\'t follow the transaction automatically',
      desc: `SAP licenses and subscriptions are granted to the contracting legal entity, and assignment usually needs SAP's consent. The ${type === 'merger' ? 'other party\'s' : 'acquired company\'s'} contracts stay with that entity, and your contract doesn't automatically cover its users or systems. Get a written amendment extending use to the combined group with no fee for the change in entity, before systems are consolidated.`,
    });
    if (cp === 'rise') {
      items.push({
        priority: 'must', title: 'Two RISE contracts, two sets of sizing',
        desc: 'Merging two Cloud ERP Private subscriptions means two user counts, two infrastructure footprints, and two renewal dates. Ask SAP to align them to one term, credit the overlap, and confirm that consolidating does not re-price either at current list. Do not retire either system until the combined order is signed.',
      });
    }
    if (cp === 'onprem') {
      items.push({
        priority: 'should', title: 'Align the other party\'s on-premises estate with your plan',
        desc: 'If you are headed to RISE or S/4HANA, bring the acquired ECC estate into the same negotiation rather than renewing its maintenance separately. Check whether its licenses can be applied toward a conversion credit and whether it falls under the same ECC deadline.',
      });
    }
    if (cp === 'unknown') {
      items.push({
        priority: 'should', title: 'Inventory the other party\'s SAP estate',
        desc: 'You don\'t yet know what the other party holds. Before close, working through counsel or a clean team, establish its agreements, license entitlements, user types, audit history, digital access position, and migration status. An unresolved audit or integration exposure that you inherit becomes your problem at close.',
      });
    }
    items.push({
      priority: 'should', title: 'Assess inherited compliance exposure before you combine',
      desc: `${material ? 'The transaction materially enlarges your SAP footprint. ' : ''}Consolidating systems and processes can put the acquired company's users and integrations on licenses that do not cover them, and the reverse. Run a license position on both estates before migration, and keep separate environments until the paperwork is in place.`,
    });
  }

  if (type === 'acquired' || type === 'merger') {
    items.push({
      priority: 'must', title: 'Don\'t lock in a long commitment ahead of a change of control',
      desc: 'Avoid a new RISE term, a multi-year cloud commitment, or a large purchase just before close. The acquirer may already hold better SAP terms, and your commitment may be stranded or duplicated. If a renewal can\'t wait, keep it to the shortest practical term.',
    });
  }

  if (type === 'acquired' || adding) {
    const assignText = {
      consent: 'Your agreement requires SAP\'s consent to assign. That gives SAP a checkpoint at the moment it has the most leverage, and consent is sometimes tied to a purchase or an audit.',
      permitted: 'Your agreement appears to cover affiliates or successors. Confirm the wording fits the actual deal structure (asset sale, stock purchase, or merger) and that pricing survives.',
      unknown: 'The assignment and affiliate definitions haven\'t been reviewed. Do that before any other M&A step.',
    }[s.mnaAssignment] || 'Review the assignment and affiliate definitions.';
    items.push({
      priority: s.mnaAssignment === 'permitted' ? 'should' : 'must', title: 'Assignment and affiliate definitions',
      desc: `${assignText} Negotiate the right to assign to any successor by merger, acquisition, or sale of substantially all assets, and to extend use to newly acquired affiliates, with no fees or repricing.`,
    });
  }

  if (type === 'divesting') {
    items.push({
      priority: 'must', title: 'Rights generally can\'t follow the divested business',
      desc: 'SAP licenses and subscriptions stay with the contracting entity. Once the business leaves your group, its use is unlicensed unless SAP agrees otherwise, and SAP commonly requires the new owner to contract directly. Negotiate the right to transfer what the divested business uses, or a transition period (typically 6 to 24 months) during which it may keep using it.',
    });
    items.push({
      priority: 'must', title: 'Reduce spend in proportion to what leaves',
      desc: `Without an agreed mechanism you keep paying maintenance or subscription for capacity the divested business used${s.mnaUserImpact && s.mnaUserImpact !== 'unknown' ? ` (${MNA_IMPACT_LABELS[s.mnaUserImpact]} here)` : ''}, and SAP's support rules or minimum terms may block a reduction. Ask for the right to reduce users and systems at close with no repricing on the rest.`,
    });
  }

  if (comp.includes('entities')) {
    items.push({
      priority: 'must', title: 'Named-entity scope limits who may use SAP',
      desc: 'Where the subscription or license names specific legal entities, users from any other entity are unlicensed. List the entities that will use SAP after the transaction and get them added by amendment, or removed with a corresponding reduction.',
    });
  }
  if (comp.includes('shared')) {
    items.push({
      priority: 'must', title: 'Shared systems need explicit cover',
      desc: 'A system that serves both entities is licensed to one of them. Until the agreements say otherwise, users from the other entity are unlicensed users. Document every shared system and cover it by amendment or a transition right before SAP raises it.',
    });
  }
  if (comp.includes('contracts')) {
    items.push({
      priority: 'should', title: 'Co-term every SAP contract onto one date',
      desc: 'Separate contracts on separate dates mean several renewals, each with its own increase. Co-term them onto a single date, ideally paired with an event SAP wants to book in its fiscal Q4, and get written confirmation that co-terming doesn\'t reprice anything.',
    });
  }
  if (comp.includes('tsa')) {
    items.push({
      priority: 'must', title: 'Transition services need SAP\'s agreement',
      desc: 'A transition services agreement that promises "continued access to systems" doesn\'t give an outside company SAP rights. The TSA period needs matching terms from SAP: who may use what, for how long, and whether the divested entity pays during the transition.',
    });
  }
  if (comp.includes('users')) {
    items.push({
      priority: 'should', title: 'User counts and types follow the transaction',
      desc: 'Combining or separating workforces changes user counts and often user types. Agree how the change is priced, whether new users come in at your current per-user rates, and when reductions take effect, so that you are not locked into a count that no longer exists.',
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
        ${s.mnaUserImpact ? `<p style="font-size:.85rem;line-height:1.7;color:var(--text-muted);margin-top:8px;">Expected change in SAP usage: <strong>${MNA_IMPACT_LABELS[s.mnaUserImpact]}</strong>.${mna.material ? ' At this scale, re-run the full license and sizing position for the combined estate rather than adjusting at the margins.' : ''}</p>` : ''}
        <div class="concessions-grid" style="margin-top:16px;">${mna.items.map(c => `
          <div class="concession-card">
            <div class="cc-title">${c.title}</div>
            <div class="cc-desc">${c.desc}</div>
            <div class="cc-priority priority-${c.priority}">${c.priority === 'must' ? '🔴 Must Address' : '🟡 Should Address'}</div>
          </div>`).join('')}
        </div>
        <p style="margin-top:14px;font-size:.82rem;line-height:1.7;color:var(--text-muted);">
          Commercial guidance only. Transactions are a common trigger for SAP audits, so have counsel review the actual assignment, affiliate, and territory clauses before combining or separating any SAP deployments.
        </p>
      </div>
    </div>`;
}

// ─── Alerts ───────────────────────────────────────────────────────────────────
function buildAlerts(s, tier, leverage, fc) {
  const alerts = [];

  if (s.auditStatus === 'findings') {
    alerts.push({ type: 'danger', icon: '🚨', text: '<strong>SAP has delivered a compliance claim.</strong> Don\'t accept the findings or discuss purchases yet. Findings often turn on user-type classification, digital access document counts, or engines and packages used outside their license. Get a specialist to test every line against your contracts, answer in writing, and keep the audit team separate from sales.' });
  } else if (s.auditStatus === 'inprogress') {
    alerts.push({ type: 'danger', icon: '🔎', text: '<strong>An audit is underway.</strong> Agree the scope, entities, systems, and timeline in writing. Review every measurement output before you send it, and provide only what the audit clause requires. Anything you volunteer beyond scope, such as unrelated systems, cloud migration plans, or estimates, can be used against you.' });
  } else if (s.auditStatus === 'notice') {
    alerts.push({ type: 'warning', icon: '📨', text: '<strong>You have a formal audit notice.</strong> Check the audit clause in your agreement, including notice period, frequency, and scope, before you reply. Name one point of contact, bring in licensing counsel, and run your own license position before SAP sees any data.' });
  } else if (s.auditStatus === 'soft') {
    alerts.push({ type: 'warning', icon: '📧', text: '<strong>SAP is making "license review" or digital access outreach.</strong> These contacts are often a lead-in to a formal audit or a cloud sales motion. They aren\'t contractual audits, and you aren\'t obliged to share deployment data beyond the contract. Reply politely, share nothing substantive, and use the time to build your own license position.' });
  }

  if (eccNotMigrated(s)) {
    const m = eccMonthsRemaining();
    alerts.push({ type: m <= 15 ? 'danger' : 'warning', icon: '⏳', text: `<strong>About ${m} months to the end of ECC mainstream maintenance (December 31, 2027).</strong> Migration is ${s.migrationStatus === 'notstarted' ? 'not started' : 'still in planning'}. SAP's sales team will use the date as pressure. Cost extended maintenance (about a 9% premium to 2030) as a deliberate fallback, and do not sign a RISE order on a deadline you can afford to miss.` });
  }

  if (riseInPlay(s) && (s.changeEvents?.includes('risepush') || s.eventType === 'migrate')) {
    alerts.push({ type: 'warning', icon: '🚀', text: '<strong>A RISE proposal is in play.</strong> The bundle was renamed Cloud ERP Private and repackaged, so an earlier quote or a peer\'s order is not a like-for-like comparison. Get a SKU-level list, the FUE mapping, the HANA sizing basis, and the escalator in writing. See the RISE section below for the full checklist.' });
  }

  if (s.digitalAccess === 'high' || s.digitalAccess === 'unknown') {
    alerts.push({ type: 'warning', icon: '🔌', text: '<strong>Digital access is a live exposure.</strong> Non-SAP systems that create documents in SAP can create a license obligation that a user count does not show. Map the systems and document volumes before any audit or migration conversation.' });
  }

  if (['misclass', 'low', 'unknown'].includes(s.userPosition) && s.userPosition) {
    alerts.push({ type: 'info', icon: '👤', text: '<strong>User licenses have not been reconciled.</strong> Wrong user types cut both ways: over-specified users waste spend, and under-specified users create audit exposure. Review actual authorizations and activity, then reclassify before the renewal sets the baseline.' });
  }

  if (s.renewalTimeline === 'within-1mo') {
    alerts.push({ type: 'danger', icon: '⏰', text: '<strong>Less than 30 days to the event.</strong> Don\'t sign under deadline pressure. Paying a maintenance renewal as invoiced keeps coverage while you negotiate the next one. For purchases and cloud commitments, the quarter-end deadline is SAP\'s pressure, not yours.' });
  }

  if (s.costPressures?.includes('aiunits') || (s.changeEvents?.includes('aipush') && s.eventType !== 'ai-btp')) {
    alerts.push({ type: 'info', icon: '🤖', text: '<strong>Business AI is being priced as a separate line.</strong> AI units are consumption-based and reported to expire after 12 months. Buy for named use cases, cap consumption, and ask for rollover and a held unit price.' });
  }

  if (s.alternative === 'none' && tier >= 3) {
    alerts.push({ type: 'warning', icon: '⚡', text: '<strong>No competitive alternative identified.</strong> At your spend this materially weakens your position. You don\'t need to leave SAP. A costed self-hosted S/4HANA option, or a third-party support quote for stable ECC systems, changes the tone of the negotiation.' });
  }

  if (s.mnaEnabled && s.mnaStage === 'confidential') {
    alerts.push({ type: 'danger', icon: '🔒', text: '<strong>The M&amp;A transaction is confidential.</strong> Don\'t mention it to SAP. Transactions are a common audit trigger, so don\'t share cross-entity plans, and keep the M&amp;A section of this plan internal.' });
  }

  return alerts;
}

// ─── Tactics ──────────────────────────────────────────────────────────────────
function buildTactics(s, tier, leverage, fc, increase) {
  const tactics = [];

  if (auditActive(s) || s.auditStatus === 'soft') {
    tactics.push({
      title: 'Keep the Audit and the Commercial Deal Separate',
      desc: 'SAP often proposes to settle compliance findings with a purchase, usually a cloud conversion or a RISE order. The claim then becomes a sales target. Resolve the compliance position first, on the facts and your contract, and only then consider any purchase on its own business case. If a settlement is on the table, make sure it includes a full release for the audited period and systems.',
      impact: 'high',
    });
  }

  if (onEcc(s) && s.migrationStatus !== 'done') {
    tactics.push({
      title: 'Cost the Extended-Maintenance Fallback and Put It on the Table',
      desc: `Mainstream maintenance ends December 31, 2027, and extended maintenance to 2030 costs about 9% more on the maintenance basis. SAP's proposal assumes you have no alternative. A costed fallback, with a migration schedule that moves the entities and modules that matter first, turns the date from a threat into a planning input. Ask SAP what the RISE price would be if you signed in 2028 instead.`,
      impact: 'high',
    });
  }

  if (riseInPlay(s)) {
    tactics.push({
      title: 'Negotiate RISE Line by Line, Not as a Bundle Discount',
      desc: 'A single headline discount hides what moved. Ask for the order itemized into software (by user type), infrastructure and HANA sizing, managed services, bundled tools, and AI units. Negotiate each line, remove what you will not use, and put every sizing assumption and escalator in the order form. The sizing you accept now is what the renewal reprices.',
      impact: 'high',
    });
    tactics.push({
      title: 'Ask for a Maintenance Conversion Credit, in Writing',
      desc: 'Moving from on-premises maintenance to a subscription is where SAP gives the most. Ask for a credit against maintenance you have already paid or will pay during the migration, with a start date tied to go-live and a ramp so you are not paying twice. Treat the size and duration of the credit as a negotiated line item, and compare it against what staying on extended maintenance would cost.',
      impact: 'high',
    });
  }

  if (s.alternativeVendor === 'selfhosted' || s.hosting === 'iaas' || s.changeEvents?.includes('hyperscaler') || s.estateDirection === 's4') {
    tactics.push({
      title: 'Price Self-Hosted S/4HANA Against RISE',
      desc: 'S/4HANA on your own cloud account is a legitimate alternative, and the one SAP is least comfortable with because it reduces cloud backlog. Build the total cost of ownership with infrastructure, operations, and maintenance on one side and the RISE subscription on the other. If you hold a hyperscaler commitment, ask whether RISE hosting purchased through a marketplace counts toward it, and confirm eligibility with the hyperscaler.',
      impact: 'high',
    });
  }

  if (['misclass', 'low', 'unknown'].includes(s.userPosition) || s.costPressures?.includes('fue')) {
    tactics.push({
      title: 'Rightsize User Types Before the Baseline Is Set',
      desc: 'Subscription price follows user type, and the Professional type costs the most. Review actual authorizations and activity, move people doing Employee-level work to the cheaper type, and remove inactive users. Do this before signature, because the renewal will reprice the baseline you accepted. Ask for the right to reduce counts at renewal without losing the per-user price.',
      impact: 'high',
    });
  }

  tactics.push({
    title: increase.cloudLed ? 'Cap Subscription Escalators and Fix the Renewal Price' : 'Win a Written Cap on Maintenance Increases',
    desc: `Uncapped, expect SAP to raise ${increase.cloudLed ? 'subscription' : 'maintenance'} fees around ${increase.askLo}–${increase.askHi}% a year. Make a cap of ${increase.capLo}–${increase.capHi}% a condition of any purchase, cloud commitment, or conversion. Apply it to every line, including add-ons bought during the term, and ideally state the renewal price as a discount off a stated list.`,
    impact: 'high',
  });

  if (['significant', 'some', 'unknown'].includes(s.shelfware) || s.estateDirection === 'reduce' || s.costPressures?.includes('repricing')) {
    tactics.push({
      title: 'Terminate Whole License Sets, Not Individual Licenses',
      desc: 'SAP\'s support terms generally require maintenance on the whole licensed base of a product set, and removing licenses can reprice what remains. Map every license to the system and users behind it, find sets that can be retired entirely, and time terminations to the notice dates in your contract. Where unused and needed licenses sit together, ask SAP in writing to allow a partial reduction without repricing as part of a larger deal.',
      impact: s.shelfware === 'significant' ? 'high' : 'medium',
    });
  }

  if (['considering', 'thirdparty'].includes(s.supportStream) || (onEcc(s) && s.alternative !== 'dual')) {
    tactics.push({
      title: 'Get a Real Third-Party Support Quote for Stable ECC Systems',
      desc: 'For ECC systems you will not upgrade before they are retired, third-party support vendors typically advertise around half of SAP\'s fee. A written quote is a credible alternative SAP cannot discount away. Before moving, download every patch and version you are entitled to, and ask SAP in writing how third-party support affects eligibility for conversion credits and discounts on the cloud side.',
      impact: s.supportStream === 'considering' ? 'high' : 'medium',
    });
  }

  if (fc && fc.strength !== 'peak' && s.eventType !== 'maintenance') {
    tactics.push({
      title: 'Move the Decision Into SAP\'s Fiscal Q4 If You Can',
      desc: `Your decision falls in fiscal ${fc.quarter}${fc.strength === 'weak' ? ', away from any quota deadline' : ', at a quarter end'}. SAP's year closes December 31, and approval for discounts and unusual terms is easiest in the final weeks of the year. If the purchase, conversion, or cloud commitment can wait, placing it there is worth real points. Stay ready to sign, and let SAP know you are.`,
      impact: fc.strength === 'weak' ? 'high' : 'medium',
    });
  } else if (fc?.strength === 'peak') {
    tactics.push({
      title: 'Use Your Q4 Timing Deliberately',
      desc: 'Your decision sits in SAP\'s strongest quota period. Hold the final decision until late December, make clear that signature before December 31 is possible if terms land, and define exactly what "terms land" means, including the escalator cap and contract terms, not only the discount.',
      impact: 'high',
    });
  }

  const vendorPlays = {
    selfhosted: 'Cost a self-hosted S/4HANA estate on your own cloud account against the RISE quote, line by line.',
    thirdparty: 'Get a written quote from a third-party support provider for the stable part of the ECC estate.',
    stayecc: 'Cost extended maintenance for 2028 to 2030 against RISE, and show that you can wait.',
    oracle: 'Scope an Oracle Fusion or NetSuite replacement for a business unit or a mid-sized entity, even if the timeline is years out.',
    workday: 'Build a costed Workday case for HR and finance, where it competes most directly, even if full ERP replacement is unrealistic.',
    dynamics: 'Scope a Dynamics 365 case for a business unit or an acquired entity, costed against SAP\'s proposal.',
    bestofbreed: 'Move one process area (procurement, expense, or HR) to a specialist vendor and cost the SAP lines it removes.',
  };
  if (s.alternative === 'none' || s.alternative === 'theoretical') {
    tactics.push({
      title: 'Build a Credible Alternative for Part of the Estate',
      desc: `SAP prices against the cost of leaving, and few enterprises can leave ERP entirely. You don't need to. You need a credible alternative for part of the estate. ${vendorPlays[s.alternativeVendor] || 'A third-party support quote for stable ECC systems, or a costed self-hosted S/4HANA option, is usually achievable within one cycle.'}`,
      impact: 'high',
    });
  } else {
    tactics.push({
      title: 'Make Your Alternative Specific and Quantified',
      desc: `SAP account teams discount vague threats. Turn yours into specifics with ${VENDOR_LABELS[s.alternativeVendor] || 'your alternative'}: which workloads or modules move, how much SAP revenue that removes, the timeline, and the cost. A costed plan that removes cloud backlog is a real risk to the account. "We're looking at options" is not.`,
      impact: 'high',
    });
  }

  if (s.changeEvents?.includes('aipush') || s.changeEvents?.includes('bdcpush') || s.eventType === 'ai-btp') {
    tactics.push({
      title: 'Treat AI and Data Platform Scope as Optional, Capped Currency',
      desc: 'SAP is bundling Business AI, Business Data Cloud and BTP into larger proposals. Ask what you would use in year one and what each costs alone. Buy for named use cases with an owner, cap consumption, hold the unit price for the term, and ask for the same discount if you add scope later. Do not let AI units absorb the discount you earned on the core.',
      impact: 'medium',
    });
  }

  if (s.changeEvents?.includes('expansion') || s.estateDirection === 'grow') {
    tactics.push({
      title: 'Hold Planned Growth Back as Currency',
      desc: 'New SAP purchases are what SAP wants most, and the easiest thing to give away by mentioning them early. Settle compliance and maintenance terms first. Then trade the growth explicitly, timed to a quarter end, for an escalator cap, reduction rights, and flexible terms.',
      impact: 'high',
    });
  }

  if (s.costPressures?.includes('contracts')) {
    tactics.push({
      title: 'Co-Term and Consolidate SAP Contracts',
      desc: 'Many contracts on different dates mean many small renewals, each with its own increase and no leverage. Ask SAP to co-term them onto one date, with a written statement that consolidation doesn\'t reprice anything. Then negotiate the whole relationship as one event.',
      impact: 'medium',
    });
  }

  if (s.mnaEnabled && s.mnaStage !== 'confidential' && ['acquiring', 'merger'].includes(s.mnaType)) {
    tactics.push({
      title: 'Paper the Combined Estate Before You Consolidate It',
      desc: 'SAP rights don\'t follow a transaction automatically, and consolidating systems before the paperwork is in place creates compliance exposure. Negotiate entity coverage, contract consolidation, and user-count treatment first, then migrate. See the M&A Implications section for the full list.',
      impact: 'high',
    });
  }

  if (leverage < 40) {
    tactics.push({
      title: 'Escalate Beyond the Account Rep',
      desc: 'Your position is weak enough that the account rep has little reason to improve the offer. Escalate executive to executive: your CIO or CFO raises the relationship, including migration plans and spend, with an SAP regional or industry leader. Executive sponsors can also commit to terms the rep cannot.',
      impact: 'medium',
    });
  }

  return tactics;
}

// ─── Concessions / terms ──────────────────────────────────────────────────────
function buildConcessions(s, tier) {
  const c = [];

  c.push({ icon: '🧢', title: 'Increase Cap', desc: 'A written cap on annual maintenance or subscription increases, targeting 0–3% for the full term, applying to every line including add-ons bought during the term.', priority: 'must' });
  c.push({ icon: '🏛️', title: 'Broad Entity Definition', desc: 'Use extended to all current and future affiliates, with assignment to a successor without consent or fees.', priority: 'must' });
  c.push({ icon: '🔍', title: 'Audit Clause Limits', desc: 'At least 45 days\' notice, no more than one audit every 2 to 3 years, agreed scope, and time to remediate at contracted prices before any claim.', priority: 'must' });
  if (onPremEstate(s)) {
    c.push({ icon: '🔁', title: 'No Repricing on Reduction', desc: 'The right to terminate maintenance on specific license sets without repricing the licenses that remain.', priority: 'must' });
  }
  if (onEcc(s)) {
    c.push({ icon: '⏳', title: 'Extended Maintenance Terms', desc: 'A fixed premium for 2028 to 2030, the right to enter extended maintenance for only the systems that have not migrated, and a price hold on the RISE offer if you sign later.', priority: 'must' });
  }
  if (riseInPlay(s)) {
    c.push({ icon: '🚀', title: 'RISE Sizing and Reduction Rights', desc: 'Documented user and HANA sizing assumptions, the right to reduce user counts and system size at renewal without losing the per-unit price, and a fixed price per memory step.', priority: 'must' });
    c.push({ icon: '💳', title: 'Maintenance Conversion Credit', desc: 'A written credit against maintenance paid during migration, with a start date tied to go-live, a defined duration, and no clawback if scope changes.', priority: 'must' });
    c.push({ icon: '🔓', title: 'Exit and Data Return', desc: 'A defined exit period, data export in a usable format at no extra charge, and clarity on what happens to custom code at the end of the term.', priority: 'should' });
    c.push({ icon: '📈', title: 'Renewal Price Mechanism', desc: 'Renewal priced as a discount off a stated list, not a fresh quote, with a ceiling on the increase at renewal.', priority: 'should' });
  }
  if (s.digitalAccess === 'high' || s.digitalAccess === 'moderate' || s.digitalAccess === 'unknown') {
    c.push({ icon: '🔌', title: 'Digital Access Position', desc: 'Written acknowledgement of your digital access position, a volume baseline, and a release for past document creation as part of any new order.', priority: 'must' });
  }
  if (hasAny(s, ['ai', 'bdc', 'btp']) || s.changeEvents?.includes('aipush') || s.costPressures?.includes('aiunits')) {
    c.push({ icon: '🤖', title: 'AI Unit Flexibility', desc: 'Rollover or extended expiry of unused AI units, a held unit price for the term, a consumption alert and a hard cap.', priority: 'should' });
  }
  if (hasAny(s, CLOUD_PRODUCTS) || riseInPlay(s)) {
    c.push({ icon: '📌', title: 'Cross-Product Price Hold', desc: 'The same discount on additional users and products for 24–36 months, so growth does not reprice at list.', priority: 'should' });
  }
  c.push({ icon: '🧾', title: 'License Migration Rights', desc: 'The right to move licenses to new products, metrics, or platforms with credit for what you have paid, and no repricing.', priority: 'should' });
  if (s.mnaEnabled) {
    const div = s.mnaType === 'divesting';
    c.push({ icon: '🔀', title: div ? 'Divestiture Transfer Rights' : 'M&A Coverage', desc: div
      ? 'The right to transfer rights used by the divested business, or a 6–24 month transition right, plus proportional reduction without repricing.'
      : 'Acquired entities covered at no charge, contracts consolidated without repricing, and user-count changes applied only at anniversary.', priority: 'must' });
  }
  if (auditActive(s)) {
    c.push({ icon: '📝', title: 'Full Audit Release', desc: 'Any settlement includes a written release of all claims for the audited systems and period, and no follow-on audit of the same scope for at least 2 to 3 years.', priority: 'must' });
  }
  if (tier >= 5) {
    c.push({ icon: '👤', title: 'Named Support Resources', desc: 'A named technical account manager or Enterprise Support allocation included in the deal, with defined commitments.', priority: 'nice' });
  }
  c.push({ icon: '💳', title: 'Payment Terms', desc: 'Annual or quarterly invoicing, and license or implementation fees split across fiscal years where that helps your budget.', priority: 'nice' });
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
    desc: 'Before any conversation with SAP, know your entitlements, users and integrations better than SAP does.',
    tasks: [
      'Collect every SAP agreement, order form, and maintenance contract, and record dates, metrics, and legal entities',
      'Reconcile user licenses to actual authorizations and activity, and classify users by the type they truly need',
      'Map non-SAP systems that create documents in SAP, with annual volumes by document type',
      onEcc(s) ? 'Build the migration schedule by entity and module, and identify what will not make December 31, 2027' : 'Document the current sizing: users, memory, systems, and add-ons',
      ...(mnaOn ? [s.mnaStage === 'confidential'
        ? 'Brief deal counsel on SAP agreements and review entity and assignment clauses under NDA'
        : 'Inventory the other party\'s SAP agreements, audit history, and user position (clean team if pre-close)'] : []),
    ],
  });

  t.push({
    phase: '2', when: urgent ? 'Within 2 weeks' : '6–9 months before the event',
    title: 'Remove Exposure and Build Alternatives',
    desc: 'Fix compliance gaps and build a credible alternative before SAP sets the agenda.',
    tasks: [
      'Reclassify over-specified users and remove inactive ones before the baseline is set',
      onEcc(s) ? 'Cost three paths: extended maintenance, self-hosted S/4HANA, and RISE, on a like-for-like basis' : 'Cost the alternatives to the proposal you are likely to receive',
      s.alternative === 'none' || s.alternative === 'theoretical'
        ? 'Get a third-party support quote or a costed replacement case for one workload'
        : 'Turn your alternative into a costed plan with SAP revenue at risk',
      'Agree your walk-away position, decision owner, and single point of contact for SAP internally',
    ],
  });

  t.push({
    phase: '3', when: urgent ? 'Weeks 3–4' : '4–6 months before the event',
    title: 'Open the Negotiation',
    desc: 'Set the frame before SAP does, and keep compliance and commercial conversations separate.',
    tasks: [
      'Ask for proposals in writing, itemized into software, infrastructure, services, tools, and AI lines',
      'Make an increase cap and conversion-credit terms conditions of any deal',
      auditActive(s) ? 'Answer audit findings in writing, line by line, before discussing any purchase' : 'Share nothing about integrations or document volumes beyond what the negotiation requires',
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
      'Trade explicitly: commitment size, term, and growth against caps, reduction rights, and the conversion credit',
      'Escalate above the account rep if the offer hasn\'t moved materially',
      'Get the full order form and review the actual terms, including referenced policies and service descriptions',
      fc?.strength === 'peak' || fc?.strength === 'good'
        ? 'Tell SAP signature before quarter end is possible if terms land'
        : 'Assess whether the decision can move to a quarter end, ideally late December',
    ],
  });

  t.push({
    phase: '5', when: urgent ? 'Before signature' : 'Final 30 days',
    title: 'Close and Verify',
    desc: 'The order form is the contract. Make sure every negotiated term appears in it.',
    tasks: [
      'Confirm the increase cap, sizing assumptions, reduction rights, and entity definitions are written into the order',
      ...(auditActive(s) ? ['Confirm the settlement includes a full release for the audited systems and period'] : []),
      ...(mnaOn ? ['Confirm assignment, entity, or transfer language matches the transaction structure counsel approved'] : []),
      ...(onEcc(s) ? ['Download all patches and versions you are entitled to before ending maintenance on any system'] : []),
      'Put every renewal date, notice deadline, and credit expiry in the calendar with a named owner',
    ],
  });

  return t;
}

// ─── Questions ────────────────────────────────────────────────────────────────
function buildQuestions(s, tier) {
  const q = [];
  q.push('Can you itemize the proposal into software by user type, infrastructure, managed services, bundled tools, and AI units, with a discount on each line?');
  q.push('Will you cap annual increases in writing for the full term, including add-ons purchased during it?');
  if (onPremEstate(s)) q.push('If we terminate maintenance on specific license sets, which remaining licenses would be repriced, and by how much?');
  if (onEcc(s)) q.push('What would the RISE price be if we signed in 2028 instead, and what is the exact extended-maintenance premium for the systems that have not migrated?');
  if (riseInPlay(s)) q.push('What credit will you give against maintenance we have already paid, how long does it last, and when does it start?');
  if (riseInPlay(s)) q.push('How is the user mix mapped to FUE types today, and what is the process and price if we reduce users or memory at renewal?');
  if (auditActive(s)) q.push('Which contract clause and which specific usage support each finding, and what data did you rely on?');
  if (s.digitalAccess === 'high' || s.digitalAccess === 'unknown' || s.digitalAccess === 'moderate') q.push('Which of our integrations do you consider to create digital access obligations, and how do you count documents for each?');
  if (s.changeEvents?.includes('hyperscaler') || s.hosting === 'iaas') q.push('Can RISE hosting be purchased in a way that counts toward our hyperscaler commitment, and what does bring-your-own-hyperscaler cost?');
  if (s.changeEvents?.includes('aipush') || s.costPressures?.includes('aiunits')) q.push('How are AI units consumed, when do they expire, and can unused units roll over or the unit price be held?');
  if (s.mnaEnabled && s.mnaStage !== 'confidential') {
    if (s.mnaType === 'divesting') q.push('How can the divested business keep using what it relies on, and how do we reduce users and systems without repricing?');
    else q.push('Will you extend our agreements to the acquired entity and consolidate contracts without fees or repricing?');
  }
  if (tier >= 5) q.push('What named technical resources are included at our level of annual spend?');
  q.push('Can we co-term all SAP contracts onto a single date without repricing?');
  return q.slice(0, 12);
}

// ─── Risks ────────────────────────────────────────────────────────────────────
function buildRisks(s, tier, leverage) {
  const r = [];

  if (auditActive(s) || s.auditStatus === 'soft') {
    r.push({ level: 'high', title: 'Audit Converted Into a Cloud Sale', desc: 'Compliance claims are often settled with purchases larger than the actual exposure. Test every finding, and require a full release for any settlement.' });
  }
  if (eccNotMigrated(s) && eccMonthsRemaining() <= 15) {
    r.push({ level: 'high', title: 'Deadline-Driven RISE Signature', desc: 'Signing a multi-year RISE order because of the December 2027 date locks in sizing, escalators and scope at SAP\'s pricing. Cost the extended-maintenance fallback and negotiate from it.' });
  }
  if (riseInPlay(s)) {
    r.push({ level: 'medium', title: 'Sizing Locked In, Repriced at Renewal', desc: 'The user count, HANA memory and system list set at signature become the baseline for the next renewal. Right-size first and secure reduction rights.' });
    r.push({ level: 'medium', title: 'Bundle Not Like-for-Like', desc: 'RISE was renamed and repackaged, with some items removed and others moved to add-ons. A quote that looks cheaper may exclude what used to be included.' });
  }
  if (s.digitalAccess === 'high') {
    r.push({ level: 'high', title: 'Digital Access Claim', desc: 'Documents created by non-SAP systems can create a large obligation that a user count does not show. Map volumes and paper the position before a migration conversation opens it.' });
  }
  if (['misclass', 'low', 'unknown'].includes(s.userPosition)) {
    r.push({ level: 'medium', title: 'Wrong User Types', desc: 'Over-specified users waste spend, and under-specified users create audit exposure. Reclassify before the baseline is set.' });
  }
  if (s.costPressures?.includes('repricing') || s.shelfware === 'significant') {
    r.push({ level: 'medium', title: 'Locked-In Shelfware', desc: 'Support rules can make it cheaper to keep paying for unused licenses than to drop them. Negotiate no-repricing terms while SAP wants something from you.' });
  }
  if (['considering', 'thirdparty'].includes(s.supportStream)) {
    r.push({ level: 'medium', title: 'Leaving SAP Maintenance', desc: 'Third-party support ends access to SAP patches and releases for those systems, and may affect SAP\'s flexibility on conversion credits. Download everything you are entitled to first and get SAP\'s position in writing.' });
  }
  if (s.mnaEnabled) {
    if (s.mnaType === 'divesting') {
      r.push({ level: 'high', title: 'Divested Business Loses Rights', desc: 'Without transfer or transition rights, the divested business is unlicensed at close and you keep paying for what it used. Negotiate before close.' });
    } else if (s.mnaType === 'acquired') {
      r.push({ level: 'high', title: 'Stranded Commitment After Close', desc: 'A new RISE term or multi-year cloud commitment signed just before a change of control can duplicate the acquirer\'s agreements. Keep terms short.' });
    } else {
      r.push({ level: 'high', title: 'Transaction-Triggered Audit', desc: 'SAP watches for acquisitions, and integration creates cross-entity use that isn\'t licensed. Paper coverage before consolidating systems.' });
    }
    if (s.mnaStage === 'announced') {
      r.push({ level: 'medium', title: 'Pre-Close Information Sharing', desc: 'Comparing the two companies\' SAP pricing before close can raise gun-jumping concerns. Use a clean team or counsel for any pre-close comparison.' });
    }
  }
  if (s.alternative === 'none') {
    r.push({ level: 'high', title: 'No Walk-Away Position', desc: 'Without any alternative, every request depends on goodwill. A third-party support quote or a costed self-hosted option is usually achievable within one cycle.' });
  }
  if (s.internalChampion === 'none') {
    r.push({ level: 'medium', title: 'No Internal Decision Owner', desc: 'SAP often talks separately to Basis teams, business owners, and procurement. Name one owner and one point of contact before engaging.' });
  }
  if (!r.length) {
    r.push({ level: 'low', title: 'No Material Structural Risks Identified', desc: 'Your inputs don\'t show the common failure modes. Focus the negotiation on an increase cap, reduction rights, and broad entity coverage.' });
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
const SAMPLE_PROFILE = 'Enterprise manufacturer · $2.5M–$5M SAP spend on ECC 6.0 and maintenance, migration in planning, RISE proposed, acquiring a smaller SAP customer';
const SAMPLE_STATE = {
  companySize: 'enterprise',
  annualSpend: '2500k-5m',
  primaryContract: 'ecc',
  eventType: 'migrate',
  auditStatus: 'soft',
  renewalMonth: '12',
  renewalTimeline: '6-12mo',
  priceProtection: 'none',
  estateDirection: 'rise',
  products: ['ecc', 'hana', 'sf', 'ariba', 'btp'],
  migrationStatus: 'planning',
  migrationPath: 'undecided',
  hosting: 'onprem',
  shelfware: 'some',
  userPosition: 'unknown',
  digitalAccess: 'high',
  supportStream: 'enterprise',
  complianceConfidence: 'moderate',
  riseTerm: 'proposed5',
  costPressures: ['uplift', 'fue', 'infra', 'aiunits', 'contracts'],
  alternative: 'theoretical',
  alternativeVendor: 'selfhosted',
  relationshipQuality: 'moderate',
  previousNegotiation: 'basic',
  internalChampion: 'procurement',
  changeEvents: ['hyperscaler', 'risepush', 'aipush'],
  mnaEnabled: true,
  mnaType: 'acquiring',
  mnaStage: 'announced',
  mnaUserImpact: '10-25',
  mnaCounterparty: 'onprem',
  mnaAssignment: 'consent',
  mnaComplications: ['shared', 'contracts'],
};

function sampleBannerHTML(fromForm) {
  return `<div class="sample-banner" role="note">
    <span class="sample-tag">SAMPLE</span>
    <div><strong>Sample output: illustrative data, not a client analysis.</strong>
    ${fromForm ? 'Built using the Fill Sample Data buttons. Inputs may have been edited since.' : 'Generated from a fixed example profile: ' + SAMPLE_PROFILE + ', decision 6–12 months out.'}
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
