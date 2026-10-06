'use strict';

/* ═══════════════════════════════════════════════════════════════════════════
   IT Spend Diagnostic — supplier portfolio triage

   DATA HANDLING RULES (deliberate, do not relax without a decision):
   1. Parsing is local. Nothing in this file issues a network request.
   2. Client spend is never written to localStorage. `state` lives in memory
      only and dies on reload. The one localStorage READ below pulls Proxima's
      own benchmark data written by the deal-calibration tool — never client data.
   3. The anonymised export uses sequential tokens, not hashes. The candidate
      space of enterprise IT vendors is small enough that hashed names are
      recoverable by dictionary attack, so hashing would be false comfort.
   ═══════════════════════════════════════════════════════════════════════════ */

const state = {
  rows: [],        // raw parsed rows (arrays of strings)
  header: [],
  map: {},         // column index assignments
  labels: {},
  suppliers: [],   // reconciled supplier records
  overrides: {},   // canonical name -> category, set by the review queue
};

// ─── Supplier dictionary ─────────────────────────────────────────────────────
// canonical, category, alias patterns (matched case-insensitively as substrings),
// and the planner this supplier routes to when Proxima holds a dedicated tool.
const VENDORS = [
  ['Amazon Web Services', 'Cloud / IaaS', ['amazon web services', 'aws', 'amazon.com aws'], 'aws'],
  ['Microsoft', 'Cloud / IaaS', ['microsoft', 'msft', 'microsoft ireland', 'microsoft online'], 'azure'],
  ['Google Cloud', 'Cloud / IaaS', ['google cloud', 'google llc', 'gcp', 'google ireland'], 'gcp'],
  ['Oracle', 'Software / SaaS', ['oracle'], null],
  ['Salesforce', 'Software / SaaS', ['salesforce', 'salesforce.com', 'sfdc', 'tableau', 'mulesoft', 'slack technologies'], 'salesforce'],
  ['IBM', 'IT Services', ['ibm', 'international business machines', 'red hat'], null],
  ['SAP', 'Software / SaaS', ['sap '], null],
  ['ServiceNow', 'Software / SaaS', ['servicenow', 'service-now'], null],
  ['Workday', 'Software / SaaS', ['workday'], null],
  ['Adobe', 'Software / SaaS', ['adobe'], null],
  ['Atlassian', 'Software / SaaS', ['atlassian', 'jira', 'confluence'], null],
  ['Snowflake', 'Data / Analytics', ['snowflake'], null],
  ['Databricks', 'Data / Analytics', ['databricks'], null],
  ['Datadog', 'Observability', ['datadog'], null],
  ['New Relic', 'Observability', ['new relic'], null],
  ['Dynatrace', 'Observability', ['dynatrace'], null],
  ['Splunk', 'Observability', ['splunk'], null],
  ['Grafana Labs', 'Observability', ['grafana'], null],
  ['Elastic', 'Observability', ['elastic', 'elasticsearch'], null],
  ['CrowdStrike', 'Security', ['crowdstrike'], null],
  ['Palo Alto Networks', 'Security', ['palo alto'], null],
  ['Zscaler', 'Security', ['zscaler'], null],
  ['Okta', 'Security', ['okta', 'auth0'], null],
  ['CyberArk', 'Security', ['cyberark'], null],
  ['Fortinet', 'Security', ['fortinet'], null],
  ['Proofpoint', 'Security', ['proofpoint'], null],
  ['Rapid7', 'Security', ['rapid7'], null],
  ['Tenable', 'Security', ['tenable'], null],
  ['Cisco', 'Network / Hardware', ['cisco', 'meraki'], null],
  ['Dell', 'Hardware', ['dell', 'emc'], null],
  ['HP', 'Hardware', ['hewlett', 'hp inc', 'hpe'], null],
  ['Lenovo', 'Hardware', ['lenovo'], null],
  ['NetApp', 'Hardware', ['netapp'], null],
  ['Pure Storage', 'Hardware', ['pure storage'], null],
  ['Nvidia', 'Hardware', ['nvidia'], null],
  ['AT&T', 'Telecom', ['at&t', 'at and t'], null],
  ['Verizon', 'Telecom', ['verizon'], null],
  ['Lumen', 'Telecom', ['lumen', 'centurylink', 'level 3'], null],
  ['Comcast', 'Telecom', ['comcast'], null],
  ['Vodafone', 'Telecom', ['vodafone'], null],
  ['BT', 'Telecom', ['bt group', 'british telecom'], null],
  ['Zoom', 'Software / SaaS', ['zoom video', 'zoom communications'], null],
  ['DocuSign', 'Software / SaaS', ['docusign'], null],
  ['HubSpot', 'Software / SaaS', ['hubspot'], null],
  ['Zendesk', 'Software / SaaS', ['zendesk'], null],
  ['Twilio', 'Software / SaaS', ['twilio', 'sendgrid'], null],
  ['GitHub', 'Software / SaaS', ['github'], null],
  ['GitLab', 'Software / SaaS', ['gitlab'], null],
  ['JFrog', 'Software / SaaS', ['jfrog'], null],
  ['HashiCorp', 'Software / SaaS', ['hashicorp', 'terraform'], null],
  ['MongoDB', 'Data / Analytics', ['mongodb'], null],
  ['Confluent', 'Data / Analytics', ['confluent', 'kafka'], null],
  ['Cloudflare', 'Network / Hardware', ['cloudflare'], null],
  ['Akamai', 'Network / Hardware', ['akamai'], null],
  ['Fastly', 'Network / Hardware', ['fastly'], null],
  ['VMware', 'Software / SaaS', ['vmware', 'broadcom'], null],
  ['Citrix', 'Software / SaaS', ['citrix', 'cloud software group'], null],
  ['Accenture', 'IT Services', ['accenture'], null],
  ['Deloitte', 'IT Services', ['deloitte'], null],
  ['Capgemini', 'IT Services', ['capgemini'], null],
  ['Infosys', 'IT Services', ['infosys'], null],
  ['TCS', 'IT Services', ['tata consultancy', 'tcs '], null],
  ['Wipro', 'IT Services', ['wipro'], null],
  ['Cognizant', 'IT Services', ['cognizant'], null],
  ['EPAM', 'IT Services', ['epam'], null],
  ['Rackspace', 'Managed Services', ['rackspace'], null],
  ['CDW', 'Reseller / Channel', ['cdw'], null],
  ['SHI', 'Reseller / Channel', ['shi international', 'shi '], null],
  ['Insight', 'Reseller / Channel', ['insight enterprises', 'insight direct'], null],
  ['Softcat', 'Reseller / Channel', ['softcat'], null],
  ['Computacenter', 'Reseller / Channel', ['computacenter'], null],
  ['TD SYNNEX', 'Reseller / Channel', ['td synnex', 'synnex', 'tech data'], null],

  // ── Added from real estate data, Aug 2026 ──────────────────────────────────
  // Enterprise SaaS
  ['OneStream', 'Software / SaaS', ['onestream'], null],
  ['Workiva', 'Software / SaaS', ['workiva'], null],
  ['Kyriba', 'Software / SaaS', ['kyriba'], null],
  ['Anaplan', 'Software / SaaS', ['anaplan'], null],
  ['Asana', 'Software / SaaS', ['asana'], null],
  ['Autodesk', 'Software / SaaS', ['autodesk'], null],
  ['Optimizely', 'Software / SaaS', ['optimizely', 'episerver'], null],
  ['Salsify', 'Software / SaaS', ['salsify'], null],
  ['Simpplr', 'Software / SaaS', ['simpplr'], null],
  ['Loftware', 'Software / SaaS', ['loftware', 'nicelabel'], null],
  ['OpenText', 'Software / SaaS', ['opentext', 'open text', 'micro focus'], null],
  ['NAVEX', 'Software / SaaS', ['navex'], null],
  ['AUCOTEC', 'Software / SaaS', ['aucotec'], null],

  // Voice / UCaaS — per-seat renewals that negotiate more like SaaS than like
  // carrier circuits, but grouped under Telecom to avoid splitting the category.
  ['RingCentral', 'Telecom', ['ringcentral', 'ring central'], null],
  ['8x8', 'Telecom', ['8x8', '8 x 8'], null],

  // Carriers / network
  ['Proximus', 'Telecom', ['proximus'], null],
  ['Orange Business', 'Telecom', ['orange business', 'orange business services'], null],
  ['Windstream', 'Telecom', ['windstream', 'winstream'], null],

  // Security
  ['Ontinue', 'Security', ['ontinue'], null],
  ['Optiv', 'Security', ['optiv'], null],

  // Channel / resale — the negotiation play differs from a direct vendor deal,
  // so these are tagged as channel rather than by what they sell.
  ['PDSVISION', 'Reseller / Channel', ['pdsvision', 'pds vision'], null],
  ['Coolshop', 'Reseller / Channel', ['coolshop'], null],
];

const PLANNERS = {
  aws: ['AWS Planner', 'https://tools.briansavesbillions.com/aws-negotiation-planner/'],
  azure: ['Azure Planner', 'https://tools.briansavesbillions.com/azure-negotiation-planner/'],
  gcp: ['GCP Planner', 'https://tools.briansavesbillions.com/gcp-negotiation-planner/'],
  salesforce: ['Salesforce Planner', 'https://tools.briansavesbillions.com/salesforce-negotiation-planner/'],
};

const CATEGORIES = ['Cloud / IaaS', 'Software / SaaS', 'Security', 'Observability', 'Data / Analytics',
  'Network / Hardware', 'Hardware', 'Telecom', 'IT Services', 'Managed Services', 'Staffing / Contingent',
  'Print / Output', 'Reseller / Channel', 'Non-IT / Review scope', 'Unclassified'];

// Category-typical negotiation ranges, applied only when the toggle is on.
// These are Proxima assumptions for pre-diligence sizing, NOT modelled outcomes.
// Replace with observed Proxima benchmarks as the deal set grows.
const SAVINGS_RANGES = {
  'Cloud / IaaS': [10, 25], 'Software / SaaS': [8, 20], 'Security': [8, 18],
  'Observability': [10, 25], 'Data / Analytics': [10, 22], 'Network / Hardware': [8, 18],
  'Hardware': [5, 15], 'Telecom': [10, 30], 'IT Services': [5, 15],
  'Managed Services': [5, 15], 'Staffing / Contingent': [5, 15], 'Print / Output': [10, 25],
  'Reseller / Channel': [3, 10],
  'Non-IT / Review scope': null,   // out of IT scope — excluded from sizing on purpose
  'Unclassified': null,
};

// Maps a free-text category value from the file onto the taxonomy.
const CATEGORY_SYNONYMS = {
  'cloud': 'Cloud / IaaS', 'iaas': 'Cloud / IaaS', 'paas': 'Cloud / IaaS', 'hosting': 'Cloud / IaaS',
  'infrastructure': 'Cloud / IaaS', 'public cloud': 'Cloud / IaaS',
  'software': 'Software / SaaS', 'saas': 'Software / SaaS', 'licence': 'Software / SaaS',
  'license': 'Software / SaaS', 'licensing': 'Software / SaaS', 'subscription': 'Software / SaaS',
  'application': 'Software / SaaS', 'apps': 'Software / SaaS',
  'security': 'Security', 'infosec': 'Security', 'cyber': 'Security', 'cybersecurity': 'Security',
  'monitoring': 'Observability', 'observability': 'Observability', 'apm': 'Observability',
  'data': 'Data / Analytics', 'analytics': 'Data / Analytics', 'bi': 'Data / Analytics',
  'database': 'Data / Analytics', 'warehouse': 'Data / Analytics',
  'network': 'Network / Hardware', 'networking': 'Network / Hardware', 'cdn': 'Network / Hardware',
  'hardware': 'Hardware', 'equipment': 'Hardware', 'devices': 'Hardware', 'endpoint': 'Hardware',
  'servers': 'Hardware', 'storage': 'Hardware',
  'telecom': 'Telecom', 'telecoms': 'Telecom', 'telco': 'Telecom', 'voice': 'Telecom',
  'connectivity': 'Telecom', 'mobile': 'Telecom', 'wan': 'Telecom', 'circuits': 'Telecom',
  'services': 'IT Services', 'it services': 'IT Services', 'consulting': 'IT Services',
  'professional services': 'IT Services', 'contractors': 'IT Services', 'staffing': 'IT Services',
  'managed services': 'Managed Services', 'msp': 'Managed Services', 'outsourcing': 'Managed Services',
  'support': 'Managed Services', 'maintenance': 'Managed Services',
  'reseller': 'Reseller / Channel', 'channel': 'Reseller / Channel', 'var': 'Reseller / Channel',
  'distributor': 'Reseller / Channel',
  'staffing': 'Staffing / Contingent', 'contingent': 'Staffing / Contingent', 'temp labour': 'Staffing / Contingent',
  'print': 'Print / Output', 'printing': 'Print / Output', 'reprographics': 'Print / Output',
  'facilities': 'Non-IT / Review scope', 'travel': 'Non-IT / Review scope', 'legal': 'Non-IT / Review scope',
  'insurance': 'Non-IT / Review scope', 'marketing': 'Non-IT / Review scope', 'utilities': 'Non-IT / Review scope',
};

// ─── Name-based classification ───────────────────────────────────────────────
// Most supplier names describe what the supplier does. The dictionary only knows
// vendors it has been told about, so without this the entire long tail lands in
// Unclassified even when the name says exactly what it is. Weaker evidence than
// an exact vendor match, so it sits below the dictionary in the chain and is
// labelled distinctly — the analyst can see it was inferred from a word.
// Ordered most-specific first; the first hit wins.
const NAME_KEYWORDS = [
  ['Non-IT / Review scope', ['facilities', 'facility', 'catering', 'cleaning', 'janitorial', 'travel',
    'legal', 'insurance', 'advertising', 'marketing', 'real estate', 'property', 'logistics', 'freight',
    'courier', 'utilities', 'energy', 'payroll', 'pension', 'recruitment agency']],
  ['Staffing / Contingent', ['staffing', 'staff aug', 'recruit', 'recruiting', 'recruitment', 'contractor',
    'contractors', 'contracting', 'talent', 'resourcing', 'interim', 'temp']],
  ['Print / Output', ['print', 'printing', 'printers', 'reprographics', 'copier', 'imaging', 'document solutions']],
  ['Observability', ['monitoring', 'observability', 'telemetry', 'logging', 'apm', 'uptime']],
  ['Security', ['security', 'cyber', 'infosec', 'firewall', 'threat', 'siem', 'soc ', 'identity',
    'penetration', 'pentest', 'endpoint protection', 'antivirus']],
  ['Telecom', ['telecom', 'telecoms', 'telco', 'wireless', 'mobile', 'voice', 'broadband', 'connectivity',
    'communications', 'comms', 'satellite', 'fibre', 'fiber']],
  ['Network / Hardware', ['network', 'networks', 'networking', 'cdn', 'bandwidth', 'routing', 'lan', 'wan']],
  ['Data / Analytics', ['data', 'analytics', 'insights', 'warehouse', 'database', 'reporting']],
  ['Cloud / IaaS', ['cloud', 'hosting', 'datacenter', 'data centre', 'data center', 'colocation', 'colo ']],
  ['Hardware', ['hardware', 'equipment', 'devices', 'servers', 'storage', 'peripherals', 'laptops']],
  ['Managed Services', ['managed', 'msp', 'outsourc', 'helpdesk', 'help desk', 'service desk', 'support',
    'maintenance', 'break-fix', 'break fix']],
  ['Reseller / Channel', ['reseller', 'distribution', 'distributor', 'supplies', 'procurement']],
  ['IT Services', ['consulting', 'consultancy', 'consultants', 'advisory', 'integration', 'integrator',
    'implementation', 'transformation', 'digital', 'professional services', 'engineering', 'development',
    'partners', 'associates']],
  ['Software / SaaS', ['software', 'saas', 'platform', 'application', 'applications', 'licensing', 'subscription']],
];

// Returns { category, keyword } or null.
function classifyByName(name) {
  const hay = ' ' + String(name).toLowerCase().replace(/[.,/()]/g, ' ').replace(/\s+/g, ' ') + ' ';
  for (const [category, tokens] of NAME_KEYWORDS) {
    for (const t of tokens) {
      const needle = t.trim();
      // Bounded on both sides, allowing a short inflection (network/networks,
      // print/printing). Without the trailing bound, "cyber" matched the company
      // name "Cyberdyne" and filed a support vendor under Security.
      const re = new RegExp('\\b' + needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\w{0,3}\\b', 'i');
      if (re.test(hay)) return { category, keyword: needle };
    }
  }
  return null;
}

// Analyst-supplied rules, parsed from "keyword = Category" lines. Beats the
// built-in keyword list because the analyst knows the estate; kept in memory
// only, and exportable as text so it can be reused without persisting anything.
function parseCustomRules(text) {
  const rules = [];
  for (const line of String(text || '').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const m = t.split(/\s*=\s*/);
    if (m.length !== 2) continue;
    const keyword = m[0].trim().toLowerCase();
    const wanted = m[1].trim().toLowerCase();
    const category = CATEGORIES.find(c => c.toLowerCase() === wanted)
      || CATEGORIES.find(c => c.toLowerCase().startsWith(wanted))
      || resolveCategory(wanted);
    if (keyword && category) rules.push({ keyword, category });
  }
  return rules;
}

function classifyByCustomRules(name, rules) {
  const hay = ' ' + String(name).toLowerCase().replace(/[.,/()]/g, ' ').replace(/\s+/g, ' ') + ' ';
  for (const r of rules) {
    if (hay.includes(r.keyword)) return { category: r.category, keyword: r.keyword };
  }
  return null;
}

// ─── Parsing ─────────────────────────────────────────────────────────────────
function detectDelimiter(text) {
  const line = text.split(/\r?\n/).find(l => l.trim()) || '';
  const tabs = (line.match(/\t/g) || []).length;
  const commas = (line.match(/,/g) || []).length;
  const semis = (line.match(/;/g) || []).length;
  if (tabs >= commas && tabs >= semis && tabs > 0) return '\t';
  if (semis > commas) return ';';
  return ',';
}

// Minimal RFC4180-ish parser: handles quoted fields, escaped quotes, embedded delimiters.
function parseDelimited(text, delim) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delim) {
      row.push(field); field = '';
    } else if (c === '\n') {
      row.push(field); field = '';
      if (row.some(f => f.trim() !== '')) rows.push(row);
      row = [];
    } else if (c !== '\r') {
      field += c;
    }
  }
  row.push(field);
  if (row.some(f => f.trim() !== '')) rows.push(row);
  return rows;
}

// Handles $ , () negatives, trailing minus, and K/M/B suffixes.
function parseMoney(raw) {
  if (raw == null) return 0;
  let s = String(raw).trim();
  if (!s) return 0;
  let neg = false;
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
  if (/-$/.test(s)) { neg = true; s = s.slice(0, -1); }
  if (/^-/.test(s)) { neg = true; s = s.slice(1); }
  let mult = 1;
  const suffix = s.match(/([kmb])\s*$/i);
  if (suffix) {
    mult = { k: 1e3, m: 1e6, b: 1e9 }[suffix[1].toLowerCase()];
    s = s.slice(0, suffix.index);
  }
  s = s.replace(/[^0-9.]/g, '');
  if (s === '' || s === '.') return 0;
  const n = parseFloat(s);
  if (!isFinite(n)) return 0;
  return (neg ? -n : n) * mult;
}

// ─── Supplier normalisation ──────────────────────────────────────────────────
function stripLegalSuffixes(name) {
  return name
    .replace(/[.,]/g, ' ')
    .replace(/\b(inc|incorporated|corp|corporation|co|company|ltd|limited|llc|llp|lp|plc|gmbh|ag|sa|sas|bv|nv|pty|pte|srl|spa|ab|as|oy|kk|holdings?|group|international|worldwide|global|technologies|technology|tech|software|systems|solutions|services|labs?)\b/gi, ' ')
    .replace(/\b(ireland|uk|usa|us|emea|apac|americas|europe|na|north america|operations)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchVendor(name) {
  const lower = ' ' + name.toLowerCase().replace(/[.,]/g, ' ').replace(/\s+/g, ' ') + ' ';
  for (const [canonical, category, aliases, planner] of VENDORS) {
    for (const a of aliases) {
      const needle = a.trim();
      // Whole-word on both sides. Substring matching used to be used for aliases
      // over 4 chars, which quietly matched unrelated suppliers — "Optiva Media"
      // resolved to Optiv and "Asanako" to Asana. Vendor names are exact, so
      // unlike the name-keyword classifier there is no inflection allowance here.
      const re = new RegExp('\\b' + needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
      if (re.test(lower)) return { canonical, category, planner };
    }
  }
  return null;
}

function normalisationKey(name) {
  const stripped = stripLegalSuffixes(name).toLowerCase();
  return stripped || name.toLowerCase().trim();
}

function resolveCategory(fileValue) {
  if (!fileValue) return null;
  const v = String(fileValue).trim().toLowerCase();
  if (!v) return null;
  const exact = CATEGORIES.find(c => c.toLowerCase() === v);
  if (exact) return exact;
  if (CATEGORY_SYNONYMS[v]) return CATEGORY_SYNONYMS[v];
  for (const [needle, cat] of Object.entries(CATEGORY_SYNONYMS)) {
    if (v.includes(needle)) return cat;
  }
  return null;
}

// ─── Build reconciled supplier list ──────────────────────────────────────────
function buildSuppliers() {
  const { supplier: si, category: ci, prior: pi, current: cci } = state.map;
  const groups = new Map();
  let skipped = 0;

  for (const row of state.rows) {
    const rawName = (row[si] || '').trim();
    if (!rawName) { skipped++; continue; }
    const prior = pi >= 0 ? parseMoney(row[pi]) : 0;
    const current = cci >= 0 ? parseMoney(row[cci]) : 0;
    if (prior === 0 && current === 0) { skipped++; continue; }

    const vendor = matchVendor(rawName);
    const key = vendor ? 'v:' + vendor.canonical : 'k:' + normalisationKey(rawName);
    if (!groups.has(key)) {
      const custom = vendor ? null : classifyByCustomRules(rawName, state.customRules || []);
      const byName = vendor ? null : classifyByName(rawName);
      groups.set(key, {
        canonical: vendor ? vendor.canonical : stripLegalSuffixes(rawName) || rawName,
        variants: new Set(), prior: 0, current: 0,
        fileCategories: new Set(), dictCategory: vendor ? vendor.category : null,
        customCategory: custom ? custom.category : null, customKeyword: custom ? custom.keyword : null,
        nameCategory: byName ? byName.category : null, nameKeyword: byName ? byName.keyword : null,
        planner: vendor ? vendor.planner : null, matched: !!vendor,
      });
    }
    const g = groups.get(key);
    g.variants.add(rawName);
    g.prior += prior;
    g.current += current;
    const fileCat = ci >= 0 ? resolveCategory(row[ci]) : null;
    if (fileCat) g.fileCategories.add(fileCat);
    if (ci >= 0 && (row[ci] || '').trim() && !fileCat) g.unmappableCategory = true;
  }

  const suppliers = [...groups.values()].map(g => {
    const fileCats = [...g.fileCategories];
    let category, source, why = '';
    if (state.overrides[g.canonical]) {
      category = state.overrides[g.canonical]; source = 'override';
    } else if (fileCats.length === 1) {
      category = fileCats[0];
      // Dictionary disagreement is surfaced, not silently overridden — the file
      // may reflect a GL treatment we should not second-guess.
      source = (g.dictCategory && g.dictCategory !== category) ? 'conflict' : 'file';
    } else if (fileCats.length > 1) {
      category = fileCats[0]; source = 'conflict';
    } else if (g.dictCategory) {
      category = g.dictCategory; source = 'inferred';
      why = 'known vendor';
    } else if (g.customCategory) {
      category = g.customCategory; source = 'custom';
      why = `your rule "${g.customKeyword}"`;
    } else if (g.nameCategory) {
      category = g.nameCategory; source = 'keyword';
      why = `name contains "${g.nameKeyword}"`;
    } else {
      category = 'Unclassified'; source = 'none';
    }
    const delta = g.current - g.prior;
    return {
      canonical: g.canonical,
      variants: [...g.variants],
      prior: g.prior, current: g.current, delta,
      deltaPct: g.prior > 0 ? (delta / g.prior) * 100 : (g.current > 0 ? Infinity : 0),
      category, categorySource: source, categoryWhy: why,
      dictCategory: g.dictCategory, fileCategories: fileCats,
      nameCategory: g.nameCategory, nameKeyword: g.nameKeyword,
      planner: g.planner, matched: g.matched,
      status: g.prior === 0 ? 'new' : (g.current === 0 ? 'gone' : 'active'),
    };
  });

  suppliers.sort((a, b) => b.current - a.current || b.prior - a.prior);
  state.skippedRows = skipped;
  return suppliers;
}

// ─── Proxima benchmark lookup (READ ONLY — never writes) ─────────────────────
function benchmarkedProviders() {
  try {
    const deals = JSON.parse(localStorage.getItem('proxima-deals') || '[]');
    return new Set(deals.map(d => d.provider).filter(Boolean));
  } catch { return new Set(); }
}

// ─── Priority scoring ────────────────────────────────────────────────────────
function scoreSupplier(s, total, benchmarks) {
  let score = 0;
  const share = total > 0 ? s.current / total : 0;
  score += Math.min(share * 200, 55);                   // size dominates
  if (s.deltaPct === Infinity) score += 10;
  else if (s.deltaPct >= 25) score += 16;
  else if (s.deltaPct >= 10) score += 11;
  else if (s.deltaPct >= 0) score += 5;
  if (s.planner) score += 12;                            // dedicated playbook exists
  if (s.planner && benchmarks.has(s.planner)) score += 8;
  const r = SAVINGS_RANGES[s.category];
  if (r) score += r[1] / 4;
  if (s.status === 'gone') score -= 30;
  if (s.category === 'Unclassified') score -= 6;
  return Math.max(0, Math.round(score));
}

function priorityBand(score) {
  if (score >= 55) return ['High', 'pill-high'];
  if (score >= 32) return ['Medium', 'pill-med'];
  return ['Low', 'pill-low'];
}

// ─── Formatting ──────────────────────────────────────────────────────────────
const fmtMoney = n => {
  const abs = Math.abs(n);
  if (abs >= 1e9) return (n < 0 ? '-' : '') + '$' + (abs / 1e9).toFixed(2) + 'B';
  if (abs >= 1e6) return (n < 0 ? '-' : '') + '$' + (abs / 1e6).toFixed(2) + 'M';
  if (abs >= 1e3) return (n < 0 ? '-' : '') + '$' + Math.round(abs / 1e3) + 'K';
  return (n < 0 ? '-' : '') + '$' + Math.round(abs);
};
const fmtPct = p => p === Infinity ? 'new' : (p >= 0 ? '+' : '') + p.toFixed(0) + '%';
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function spendBand(n) {
  if (n <= 0) return '$0';
  if (n < 50e3) return '<$50K';
  if (n < 250e3) return '$50–250K';
  if (n < 1e6) return '$250K–1M';
  if (n < 2e6) return '$1–2M';
  if (n < 5e6) return '$2–5M';
  if (n < 10e6) return '$5–10M';
  if (n < 25e6) return '$10–25M';
  return '$25M+';
}
function pctBand(p) {
  if (p === Infinity) return 'new';
  if (p <= -25) return 'down >25%';
  if (p <= -10) return 'down 10–25%';
  if (p < 10) return 'flat ±10%';
  if (p < 25) return 'up 10–25%';
  if (p < 50) return 'up 25–50%';
  return 'up >50%';
}

// ─── Stage navigation ────────────────────────────────────────────────────────
function goStage(n) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-' + n).classList.add('active');
  document.querySelectorAll('.stage').forEach(el => {
    const s = +el.dataset.stage;
    el.classList.toggle('active', s === n);
    el.classList.toggle('done', s < n);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── Stage 1 → 2 ─────────────────────────────────────────────────────────────
function ingest(text) {
  const delim = detectDelimiter(text);
  const rows = parseDelimited(text, delim);
  const fb = document.getElementById('parse-feedback');
  if (rows.length < 2) {
    fb.innerHTML = `<div class="alert alert-danger"><span class="alert-icon">⚠️</span><div>Could not find a header row plus at least one data row. Check the file has a header and try again.</div></div>`;
    return;
  }
  state.header = rows[0].map(h => h.trim());
  state.rows = rows.slice(1);
  fb.innerHTML = `<div class="alert alert-success"><span class="alert-icon">✓</span><div>Read <strong>${state.rows.length}</strong> data rows and <strong>${state.header.length}</strong> columns, ${delim === '\t' ? 'tab' : delim === ';' ? 'semicolon' : 'comma'} separated. Nothing was uploaded.</div></div>`;
  buildMapUI();
  goStage(2);
}

function guessColumn(candidates, exclude = []) {
  for (const pat of candidates) {
    const i = state.header.findIndex((h, idx) =>
      !exclude.includes(idx) && new RegExp(pat, 'i').test(h));
    if (i >= 0) return i;
  }
  return -1;
}

function buildMapUI() {
  const opts = (sel, includeNone) => {
    const none = includeNone ? '<option value="-1">— none —</option>' : '';
    return none + state.header.map((h, i) =>
      `<option value="${i}" ${i === sel ? 'selected' : ''}>${esc(h || '(column ' + (i + 1) + ')')}</option>`).join('');
  };

  const sup = guessColumn(['supplier', 'vendor', 'payee', 'merchant', 'account name', '^name$', 'company']);
  const cat = guessColumn(['categor', 'gl ', 'gl_', 'cost ?cent', 'department', 'type', 'classif', 'spend type']);

  // Prefer columns whose headers look like periods; fall back to the last two
  // numeric-looking columns, earliest first.
  const numericCols = state.header.map((h, i) => i).filter(i => {
    let hits = 0, seen = 0;
    for (const r of state.rows.slice(0, 25)) {
      const v = (r[i] || '').trim();
      if (!v) continue;
      seen++;
      if (parseMoney(v) !== 0) hits++;
    }
    return seen > 0 && hits / seen > 0.6;
  });
  const yearCols = state.header
    .map((h, i) => ({ h, i, y: (h.match(/(20\d{2}|FY\s?\d{2,4})/i) || [])[0] }))
    .filter(x => x.y && numericCols.includes(x.i));

  let prior = -1, current = -1;
  if (yearCols.length >= 2) {
    const sorted = yearCols.slice().sort((a, b) => String(a.y).localeCompare(String(b.y)));
    prior = sorted[0].i; current = sorted[sorted.length - 1].i;
  } else if (numericCols.length >= 2) {
    prior = numericCols[numericCols.length - 2]; current = numericCols[numericCols.length - 1];
  } else if (numericCols.length === 1) {
    current = numericCols[0];
  }

  document.getElementById('col-supplier').innerHTML = opts(sup >= 0 ? sup : 0, false);
  document.getElementById('col-category').innerHTML = opts(cat, true);
  document.getElementById('col-prior').innerHTML = opts(prior, true);
  document.getElementById('col-current').innerHTML = opts(current, true);
  if (prior >= 0) document.getElementById('label-prior').value = state.header[prior] || 'Prior year';
  if (current >= 0) document.getElementById('label-current').value = state.header[current] || 'Current year';

  const preview = state.rows.slice(0, 4);
  document.getElementById('map-preview').innerHTML = `
    <div class="table-wrap"><table>
      <thead><tr>${state.header.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>
      <tbody>${preview.map(r => `<tr>${state.header.map((_, i) => `<td>${esc(r[i] || '')}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div>
    <p class="field-hint" style="margin-top:7px;">First ${preview.length} of ${state.rows.length} rows.</p>`;
}

// ─── Stage 3: reconcile ──────────────────────────────────────────────────────
function renderReconcile() {
  state.map = {
    supplier: +document.getElementById('col-supplier').value,
    category: +document.getElementById('col-category').value,
    prior: +document.getElementById('col-prior').value,
    current: +document.getElementById('col-current').value,
  };
  state.labels = {
    prior: document.getElementById('label-prior').value.trim() || 'Prior',
    current: document.getElementById('label-current').value.trim() || 'Current',
  };
  state.customRules = parseCustomRules(document.getElementById('custom-rules')?.value);
  if (state.map.prior < 0 && state.map.current < 0) {
    document.getElementById('reconcile-output').innerHTML =
      `<div class="alert alert-danger"><span class="alert-icon">⚠️</span><div>At least one spend column is required. Go back and map one.</div></div>`;
    return;
  }
  state.suppliers = buildSuppliers();
  const s = state.suppliers;
  const merged = s.filter(x => x.variants.length > 1);
  const conflicts = s.filter(x => x.categorySource === 'conflict');
  const unclassified = s.filter(x => x.category === 'Unclassified');
  const bySource = src => s.filter(x => x.categorySource === src).length;

  const classified = s.length - unclassified.length;
  let html = `<div class="tiles">
    <div class="tile"><div class="tile-label">Suppliers</div><div class="tile-value">${s.length}</div><div class="tile-note">from ${state.rows.length} rows</div></div>
    <div class="tile"><div class="tile-label">Classified</div><div class="tile-value">${s.length ? Math.round(classified / s.length * 100) : 0}%</div><div class="tile-note">${bySource('file')} file · ${bySource('inferred')} vendor · ${bySource('custom')} your rules · ${bySource('keyword')} name</div></div>
    <div class="tile"><div class="tile-label">Name variants merged</div><div class="tile-value">${merged.length}</div><div class="tile-note">${merged.reduce((a, x) => a + x.variants.length, 0)} rows collapsed</div></div>
    <div class="tile"><div class="tile-label">Needs attention</div><div class="tile-value">${conflicts.length + unclassified.length}</div><div class="tile-note">${conflicts.length} conflict, ${unclassified.length} unclassified</div></div>
  </div>`;

  const byKeyword = s.filter(x => x.categorySource === 'keyword');
  if (byKeyword.length) {
    html += `<div class="section"><div class="section-head"><h3>Classified from the supplier name</h3><span class="badge">${byKeyword.length}</span></div>
      <p class="field-hint" style="margin-bottom:11px;">These had no category in the file and are not known vendors, so the category was inferred from a word in the name. That is weaker evidence than a vendor match — scan them, and correct anything the word misled.</p>
      <div class="table-wrap"><table><thead><tr><th>Supplier</th><th>Matched on</th><th>Category</th><th class="num">${esc(state.labels.current)}</th><th></th></tr></thead>
      <tbody>${byKeyword.slice(0, 30).map(x => `<tr>
        <td class="supplier-name">${esc(x.canonical)}</td>
        <td class="variant-note">"${esc(x.nameKeyword)}"</td>
        <td>${esc(x.category)}</td>
        <td class="num">${fmtMoney(x.current)}</td>
        <td><select class="cat-override" data-supplier="${esc(x.canonical)}">
          <option value="">Keep</option>
          ${CATEGORIES.filter(c => c !== x.category).map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}
        </select></td></tr>`).join('')}</tbody></table></div>
      ${byKeyword.length > 30 ? `<p class="field-hint" style="margin-top:9px;">Showing 30 of ${byKeyword.length}.</p>` : ''}</div>`;
  }

  const nonIT = s.filter(x => x.category === 'Non-IT / Review scope');
  if (nonIT.length) {
    const nt = nonIT.reduce((a, x) => a + x.current, 0);
    html += `<div class="alert alert-warning"><span class="alert-icon">🔍</span><div><strong>${nonIT.length} supplier${nonIT.length === 1 ? '' : 's'} look like non-IT spend</strong> (${fmtMoney(nt)}) — facilities, travel, legal, insurance and similar. If this file was meant to be IT only, that is a scoping problem worth raising before any of these numbers are quoted. They are excluded from savings ranges.</div></div>`;
  }

  if (state.skippedRows > 0) {
    html += `<div class="alert alert-warning"><span class="alert-icon">⚠️</span><div><strong>${state.skippedRows} row${state.skippedRows === 1 ? '' : 's'} skipped</strong> — blank supplier name, or zero/unparseable spend in both periods. Worth a glance if that number looks high.</div></div>`;
  }

  if (merged.length) {
    html += `<div class="section"><div class="section-head"><h3>Name variants merged</h3><span class="badge">${merged.length}</span></div>
      <p class="field-hint" style="margin-bottom:11px;">The same vendor recorded under several names. Fragmented vendor records are themselves worth reporting — they hide true spend concentration from whoever owns the category.</p>
      <div class="table-wrap"><table><thead><tr><th>Resolved to</th><th>Appeared as</th><th class="num">Combined ${esc(state.labels.current)}</th></tr></thead>
      <tbody>${merged.slice(0, 25).map(x => `<tr>
        <td class="supplier-name">${esc(x.canonical)}</td>
        <td class="variant-note">${x.variants.map(esc).join(' · ')}</td>
        <td class="num">${fmtMoney(x.current)}</td></tr>`).join('')}</tbody></table></div></div>`;
  }

  if (conflicts.length) {
    html += `<div class="section"><div class="section-head"><h3>Category conflicts</h3><span class="badge">${conflicts.length}</span></div>
      <p class="field-hint" style="margin-bottom:11px;">The file's category disagrees with what the supplier name implies, or one supplier carries several categories across rows. The file value is kept — a GL treatment may be deliberate — but override it below if it's just miscoding.</p>
      ${conflicts.slice(0, 20).map(x => reviewRow(x, `file says <strong>${esc(x.fileCategories.join(' / ') || '—')}</strong>${x.dictCategory ? `, known vendor implies <strong>${esc(x.dictCategory)}</strong>` : x.nameCategory ? `, name implies <strong>${esc(x.nameCategory)}</strong>` : ''}`)).join('')}</div>`;
  }

  if (unclassified.length) {
    const unTotal = unclassified.reduce((a, x) => a + x.current, 0);
    html += `<div class="section"><div class="section-head"><h3>Unclassified suppliers</h3><span class="badge">${unclassified.length}</span><span class="badge grey">${fmtMoney(unTotal)}</span></div>
      <p class="field-hint" style="margin-bottom:11px;">No category in the file and no dictionary match. These are excluded from savings ranges until classified. Largest first — you rarely need to clear the whole tail.</p>
      ${unclassified.slice(0, 25).map(x => reviewRow(x, 'no category in file, not a known vendor, and no recognisable word in the name')).join('')}
      ${unclassified.length > 25 ? `<p class="field-hint" style="margin-top:9px;">Showing the 25 largest of ${unclassified.length}.</p>` : ''}</div>`;
  }

  if (!conflicts.length && !unclassified.length) {
    html += `<div class="alert alert-success"><span class="alert-icon">✓</span><div>Every supplier resolved to a category with no conflicts. Nothing to review.</div></div>`;
  }

  // Overridden suppliers leave the queues above, so without this section there
  // would be no way to see what you changed or undo a mis-click.
  const overridden = s.filter(x => x.categorySource === 'override');
  if (overridden.length) {
    html += `<div class="section"><div class="section-head"><h3>Your overrides</h3><span class="badge">${overridden.length}</span></div>
      <p class="field-hint" style="margin-bottom:11px;">Categories you set by hand. These no longer appear in the queues above, so this is where you check or undo them.</p>
      ${overridden.map(x => `<div class="review-row">
        <div>
          <div class="rr-name">${esc(x.canonical)} <span class="pill pill-src-override">override</span></div>
          <div class="rr-spend">${fmtMoney(x.current)} · set to <strong>${esc(x.category)}</strong>${x.dictCategory || x.fileCategories.length ? `, automatic would be ${esc(x.fileCategories[0] || x.dictCategory)}` : ''}</div>
        </div>
        <select class="cat-override" data-supplier="${esc(x.canonical)}">
          <option value="">↩ Revert to automatic</option>
          ${CATEGORIES.filter(c => c !== x.category).map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}
        </select>
      </div>`).join('')}</div>`;
  }

  document.getElementById('reconcile-output').innerHTML = html;
  document.querySelectorAll('.cat-override').forEach(sel => {
    sel.addEventListener('change', e => {
      const name = e.target.dataset.supplier;
      if (e.target.value) state.overrides[name] = e.target.value;
      else delete state.overrides[name];
      renderReconcile();
    });
  });
}

function reviewRow(x, note) {
  return `<div class="review-row">
    <div>
      <div class="rr-name">${esc(x.canonical)} <span class="pill pill-src-${x.categorySource}">${x.categorySource}</span></div>
      <div class="rr-spend">${fmtMoney(x.current)} · ${note}</div>
    </div>
    <select class="cat-override" data-supplier="${esc(x.canonical)}">
      <option value="">Keep: ${esc(x.category)}</option>
      ${CATEGORIES.filter(c => c !== x.category).map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}
    </select>
  </div>`;
}

// ─── Stage 4: findings ───────────────────────────────────────────────────────
function renderFindings() {
  const s = state.suppliers;
  if (!s.length) {
    document.getElementById('findings-output').innerHTML =
      `<div class="alert alert-danger"><span class="alert-icon">⚠️</span><div>No suppliers to analyse.</div></div>`;
    return;
  }
  const showRanges = document.getElementById('toggle-ranges').checked;
  const benchmarks = benchmarkedProviders();
  const totalCur = s.reduce((a, x) => a + x.current, 0);
  const totalPri = s.reduce((a, x) => a + x.prior, 0);
  const yoy = totalPri > 0 ? ((totalCur - totalPri) / totalPri) * 100 : 0;

  const scored = s.map(x => ({ ...x, score: scoreSupplier(x, totalCur, benchmarks) }))
    .sort((a, b) => b.score - a.score);

  // Concentration
  const active = s.filter(x => x.current > 0).sort((a, b) => b.current - a.current);
  let cum = 0, n80 = 0;
  for (const x of active) { cum += x.current; n80++; if (cum >= totalCur * 0.8) break; }
  const top10 = active.slice(0, 10).reduce((a, x) => a + x.current, 0);

  const newSup = s.filter(x => x.status === 'new');
  const goneSup = s.filter(x => x.status === 'gone');
  const tail = active.filter(x => x.current < totalCur * 0.005);
  const tailTotal = tail.reduce((a, x) => a + x.current, 0);

  let html = `<div class="tiles">
    <div class="tile"><div class="tile-label">${esc(state.labels.current)} spend</div><div class="tile-value">${fmtMoney(totalCur)}</div><div class="tile-note">${active.length} active suppliers</div></div>
    <div class="tile"><div class="tile-label">Year over year</div><div class="tile-value ${yoy > 0 ? 'up' : yoy < 0 ? 'down' : ''}">${fmtPct(yoy)}</div><div class="tile-note">from ${fmtMoney(totalPri)}</div></div>
    <div class="tile"><div class="tile-label">Suppliers = 80% of spend</div><div class="tile-value">${n80}</div><div class="tile-note">${active.length ? Math.round(n80 / active.length * 100) : 0}% of the vendor base</div></div>
    <div class="tile"><div class="tile-label">Top 10 concentration</div><div class="tile-value">${totalCur ? Math.round(top10 / totalCur * 100) : 0}%</div><div class="tile-note">${fmtMoney(top10)}</div></div>
  </div>`;

  html += `<div class="alert alert-info"><span class="alert-icon">🎯</span><div><strong>Where the negotiable money sits.</strong>
    ${n80} of ${active.length} suppliers account for 80% of ${esc(state.labels.current)} spend. That is the realistic engagement
    universe — the remaining ${active.length - n80} carry ${fmtMoney(totalCur - active.slice(0, n80).reduce((a, x) => a + x.current, 0))}
    between them and are a rationalisation exercise rather than a negotiation one.</div></div>`;

  // ── Priority table
  html += `<div class="section"><div class="section-head"><h3>Priority Suppliers</h3><span class="badge">ranked</span>
    ${showRanges ? '<span class="badge grey">indicative ranges on</span>' : ''}</div>
    <div class="table-wrap"><table><thead><tr>
      <th>Supplier</th><th>Category</th>
      <th class="num">${esc(state.labels.prior)}</th><th class="num">${esc(state.labels.current)}</th>
      <th class="num">Change</th><th>Share</th><th>Priority</th>
      ${showRanges ? '<th class="num">Indicative</th>' : ''}<th>Playbook</th>
    </tr></thead><tbody>`;

  for (const x of scored.slice(0, 25)) {
    const [band, cls] = priorityBand(x.score);
    const share = totalCur > 0 ? x.current / totalCur * 100 : 0;
    const r = SAVINGS_RANGES[x.category];
    const range = showRanges
      ? (r && x.current > 0 ? `${fmtMoney(x.current * r[0] / 100)}–${fmtMoney(x.current * r[1] / 100)}` : '—')
      : '';
    const statusPill = x.status === 'new' ? ' <span class="pill pill-new">new</span>'
      : x.status === 'gone' ? ' <span class="pill pill-gone">ended</span>' : '';
    const route = x.planner
      ? `<a href="${PLANNERS[x.planner][1]}" target="_blank" rel="noopener">${PLANNERS[x.planner][0]}${benchmarks.has(x.planner) ? ' ✓' : ''}</a>`
      : '<span class="variant-note">general playbook</span>';
    html += `<tr>
      <td class="supplier-name">${esc(x.canonical)}${statusPill}${x.variants.length > 1 ? `<div class="variant-note">${x.variants.length} name variants merged</div>` : ''}</td>
      <td>${esc(x.category)} <span class="pill pill-src-${x.categorySource}">${x.categorySource}</span></td>
      <td class="num">${fmtMoney(x.prior)}</td>
      <td class="num">${fmtMoney(x.current)}</td>
      <td class="num" style="color:${x.delta > 0 ? 'var(--danger)' : x.delta < 0 ? 'var(--success)' : 'inherit'}">${fmtPct(x.deltaPct)}</td>
      <td><div class="bar-track"><div class="bar-fill" style="width:${Math.min(share * 4, 100)}%"></div></div><span class="variant-note">${share.toFixed(1)}%</span></td>
      <td><span class="pill ${cls}">${band}</span></td>
      ${showRanges ? `<td class="num">${range}</td>` : ''}
      <td>${route}</td></tr>`;
  }
  html += `</tbody></table></div>
    ${scored.length > 25 ? `<p class="field-hint" style="margin-top:9px;">Showing top 25 of ${scored.length} by priority.</p>` : ''}
    <p class="field-hint" style="margin-top:9px;">A ✓ on the playbook means Proxima already holds calibration deals for that provider, so there is benchmark data to negotiate against rather than just a framework.</p>
    </div>`;

  if (showRanges) {
    html += `<div class="alert alert-warning"><span class="alert-icon">⚠️</span><div><strong>Read the indicative column as sizing, not as a finding.</strong>
      It applies a category-typical percentage band to current spend. No contract, commitment level, renewal date, or
      current discount has been examined — all four routinely move the achievable number outside these bands in either
      direction. Do not put these figures in front of a client as an expected saving.
      <div style="margin-top:8px;">Bands in use: ${Object.entries(SAVINGS_RANGES).filter(([, v]) => v).map(([k, v]) => `${esc(k)} ${v[0]}–${v[1]}%`).join(' · ')}. Unclassified spend is excluded.</div>
      </div></div>`;
  }

  // ── Category view
  const byCat = {};
  for (const x of s) {
    if (!byCat[x.category]) byCat[x.category] = { total: 0, prior: 0, count: 0, suppliers: [] };
    byCat[x.category].total += x.current;
    byCat[x.category].prior += x.prior;
    byCat[x.category].count++;
    byCat[x.category].suppliers.push(x);
  }
  const cats = Object.entries(byCat).sort((a, b) => b[1].total - a[1].total);
  html += `<div class="section"><div class="section-head"><h3>By Category</h3><span class="badge">${cats.length}</span></div>
    <div class="table-wrap"><table><thead><tr><th>Category</th><th class="num">Suppliers</th>
    <th class="num">${esc(state.labels.current)}</th><th class="num">Change</th><th>Share</th></tr></thead><tbody>
    ${cats.map(([c, d]) => {
      const dp = d.prior > 0 ? ((d.total - d.prior) / d.prior) * 100 : (d.total > 0 ? Infinity : 0);
      const share = totalCur > 0 ? d.total / totalCur * 100 : 0;
      return `<tr><td class="supplier-name">${esc(c)}</td><td class="num">${d.count}</td>
        <td class="num">${fmtMoney(d.total)}</td>
        <td class="num" style="color:${dp > 0 ? 'var(--danger)' : dp < 0 ? 'var(--success)' : 'inherit'}">${fmtPct(dp)}</td>
        <td><div class="bar-track"><div class="bar-fill" style="width:${share}%"></div></div><span class="variant-note">${share.toFixed(1)}%</span></td></tr>`;
    }).join('')}</tbody></table></div></div>`;

  // ── Structural findings
  const findings = [];
  const fragmented = cats.filter(([c, d]) => c !== 'Unclassified' && d.count >= 3)
    .sort((a, b) => b[1].total - a[1].total);
  if (fragmented.length) {
    findings.push(['🧩', 'Consolidation candidates', `${fragmented.length} categor${fragmented.length === 1 ? 'y has' : 'ies have'} three or more suppliers: ${fragmented.slice(0, 4).map(([c, d]) => `<strong>${esc(c)}</strong> (${d.count} suppliers, ${fmtMoney(d.total)})`).join(', ')}. Overlapping tooling in one category is leverage — a competitive consolidation exercise moves pricing faster than renewing each vendor separately.`, 'info']);
  }
  if (newSup.length) {
    const nt = newSup.reduce((a, x) => a + x.current, 0);
    findings.push(['🌱', 'New suppliers this period', `${newSup.length} supplier${newSup.length === 1 ? '' : 's'} appear in ${esc(state.labels.current)} with no ${esc(state.labels.prior)} spend, totalling ${fmtMoney(nt)}. Largest: ${newSup.slice(0, 4).map(x => `${esc(x.canonical)} (${fmtMoney(x.current)})`).join(', ')}. Worth confirming each went through procurement — unmanaged onboarding is where both sprawl and unfavourable first contracts originate.`, 'warning']);
  }
  if (goneSup.length) {
    const gt = goneSup.reduce((a, x) => a + x.prior, 0);
    findings.push(['🚪', 'Suppliers that stopped', `${goneSup.length} supplier${goneSup.length === 1 ? '' : 's'} had ${esc(state.labels.prior)} spend but none in ${esc(state.labels.current)}, previously ${fmtMoney(gt)}. Check whether these were clean exits or whether commitments are still running with consumption stopped — the second case is recoverable spend.`, 'info']);
  }
  const grown = s.filter(x => x.status === 'active' && x.deltaPct >= 25 && x.current >= totalCur * 0.01)
    .sort((a, b) => b.delta - a.delta);
  if (grown.length) {
    findings.push(['📈', 'Materially grown suppliers', `${grown.length} supplier${grown.length === 1 ? '' : 's'} grew 25%+ while holding at least 1% of spend: ${grown.slice(0, 4).map(x => `<strong>${esc(x.canonical)}</strong> ${fmtPct(x.deltaPct)} to ${fmtMoney(x.current)}`).join(', ')}. Growth cuts both ways in a negotiation — you are a bigger customer than when the contract was signed, which is leverage, but the vendor also knows you are more embedded.`, 'warning']);
  }
  if (tail.length >= 5) {
    findings.push(['🪶', 'Tail spend', `${tail.length} suppliers sit below 0.5% of spend each, ${fmtMoney(tailTotal)} combined (${totalCur ? (tailTotal / totalCur * 100).toFixed(1) : 0}% of total). Individually too small to negotiate. Treat as a rationalisation and process exercise — consolidation onto existing agreements, or routing through a reseller who already holds volume terms.`, 'info']);
  }
  const unclass = byCat['Unclassified'];
  if (unclass && unclass.total > totalCur * 0.1) {
    findings.push(['❓', 'Significant unclassified spend', `${fmtMoney(unclass.total)} (${(unclass.total / totalCur * 100).toFixed(0)}%) across ${unclass.count} suppliers has no category. That is enough to change the picture materially — classify at least the largest before treating this portfolio view as complete.`, 'danger']);
  }
  findings.push(['📋', 'Missing input: contract dates', `This file carries no renewal or expiry dates, so nothing here can sequence the engagement. The single highest-value next step is gathering contract end dates for the top ${Math.min(n80, 20)} suppliers — timing determines leverage more than size does, and a renewal three months out is a materially weaker position than one twelve months out regardless of spend.`, 'info']);

  html += `<div class="section"><div class="section-head"><h3>Structural Findings</h3><span class="badge">${findings.length}</span></div>
    ${findings.map(([icon, title, body, type]) => `<div class="alert alert-${type}"><span class="alert-icon">${icon}</span><div><strong>${title}.</strong> ${body}</div></div>`).join('')}</div>`;

  document.getElementById('findings-output').innerHTML = html;
}

// ─── Anonymised export ───────────────────────────────────────────────────────
// Sequential tokens + banded figures. Deliberately not hashes: see header note.
function exportAnonymised() {
  const s = state.suppliers;
  if (!s.length) return;
  const totalCur = s.reduce((a, x) => a + x.current, 0);
  const benchmarks = benchmarkedProviders();
  const scored = s.map(x => ({ ...x, score: scoreSupplier(x, totalCur, benchmarks) }))
    .sort((a, b) => b.current - a.current);

  const lines = [
    '# Proxima IT Spend Diagnostic — anonymised summary',
    `# Generated ${new Date().toISOString().slice(0, 10)}`,
    '# Supplier identities replaced with sequential tokens; spend reported as bands.',
    '# Safe to share or store. Not reversible without the source file.',
    '',
    ['Token', 'Category', `${state.labels.prior} band`, `${state.labels.current} band`, 'Change band', 'Share band', 'Priority', 'Has Proxima playbook'].join(','),
  ];
  scored.forEach((x, i) => {
    const share = totalCur > 0 ? x.current / totalCur * 100 : 0;
    const shareBand = share >= 10 ? '10%+' : share >= 5 ? '5–10%' : share >= 1 ? '1–5%' : '<1%';
    const [band] = priorityBand(x.score);
    lines.push([
      'Supplier ' + tokenName(i),
      '"' + x.category + '"',
      spendBand(x.prior), spendBand(x.current),
      '"' + pctBand(x.deltaPct) + '"',
      shareBand, band,
      x.planner ? 'yes' : 'no',
    ].join(','));
  });

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'proxima-spend-summary-anonymised.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// A, B, ... Z, AA, AB ...
function tokenName(i) {
  let s = '';
  i++;
  while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); }
  return s;
}

// ─── Sample data ─────────────────────────────────────────────────────────────
const SAMPLE = `Supplier,Category,FY2025,FY2026
Microsoft Corporation,Software,2400000,2950000
MICROSOFT IRELAND OPERATIONS LTD,,310000,420000
Amazon Web Services Inc,Cloud,1820000,2240000
AWS EMEA SARL,,240000,310000
Google Cloud EMEA Limited,cloud,610000,940000
Salesforce.com Inc,SaaS,880000,915000
Datadog Inc,Monitoring,300000,470000
New Relic Inc,monitoring,180000,120000
Dynatrace LLC,,145000,155000
CrowdStrike Inc,Security,410000,455000
Zscaler Inc,security,220000,265000
Okta Inc,Security,190000,205000
Oracle America Inc,Licensing,760000,745000
SAP America Inc,software,540000,560000
ServiceNow Inc,SaaS,620000,780000
Workday Inc,HR Software,480000,495000
Atlassian Pty Ltd,Software,165000,210000
GitHub Inc,,95000,140000
Snowflake Inc,Data,340000,610000
Databricks Inc,analytics,210000,395000
MongoDB Inc,Database,120000,135000
AT&T Corp,Telecom,390000,365000
Verizon Business,telecoms,280000,270000
Lumen Technologies,Connectivity,175000,120000
Cisco Systems Inc,Network,520000,410000
Dell Technologies,Hardware,680000,590000
Hewlett Packard Enterprise,hardware,310000,180000
Accenture LLP,Consulting,1150000,1320000
Infosys Limited,Professional Services,470000,640000
Rackspace Technology,Managed Services,290000,205000
CDW Corporation,Reseller,410000,455000
SHI International Corp,reseller,220000,290000
Cloudflare Inc,CDN,85000,130000
Adobe Inc,Software,240000,255000
Zoom Communications Inc,SaaS,150000,105000
DocuSign Inc,,70000,78000
Acme Integration Partners,,320000,410000
Northwind Advisory Group,,180000,240000
Globex Facilities Mgmt,,95000,88000
Initech Staffing,Contractors,260000,175000
Umbrella Data Services,,45000,190000
Stark Industrial IT,,0,340000
Wayne Enterprises Consulting,,0,215000
Soylent Systems Ltd,,155000,0
Cyberdyne Legacy Support,,210000,0
Vandelay Imports IT,,38000,41000
Bluth Company Networks,,22000,26000
Prestige Worldwide Tech,,18000,15000
Dunder Mifflin Print Svcs,,31000,28000
Sterling Cooper Digital,,27000,33000`;

// ─── Wiring ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const dz = document.getElementById('dropzone');
  const fi = document.getElementById('file-input');

  dz.addEventListener('click', () => fi.click());
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('over'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('over'));
  dz.addEventListener('drop', e => {
    e.preventDefault(); dz.classList.remove('over');
    const f = e.dataTransfer.files[0];
    if (f) readFile(f);
  });
  fi.addEventListener('change', e => { if (e.target.files[0]) readFile(e.target.files[0]); });

  function readFile(f) {
    const r = new FileReader();          // local read only — never uploaded
    r.onload = () => ingest(r.result);
    r.onerror = () => {
      document.getElementById('parse-feedback').innerHTML =
        `<div class="alert alert-danger"><span class="alert-icon">⚠️</span><div>Could not read that file.</div></div>`;
    };
    r.readAsText(f);
  }

  document.getElementById('btn-parse').addEventListener('click', () => {
    const t = document.getElementById('paste-area').value.trim();
    if (!t) {
      document.getElementById('parse-feedback').innerHTML =
        `<div class="alert alert-warning"><span class="alert-icon">⚠️</span><div>Paste some rows first, or drop a file above.</div></div>`;
      return;
    }
    ingest(t);
  });

  document.getElementById('btn-sample').addEventListener('click', () => {
    document.getElementById('paste-area').value = SAMPLE;
    ingest(SAMPLE);
  });

  document.getElementById('btn-reconcile').addEventListener('click', () => { renderReconcile(); goStage(3); });
  document.getElementById('btn-apply-rules').addEventListener('click', renderReconcile);
  document.getElementById('btn-analyse').addEventListener('click', () => { renderFindings(); goStage(4); });
  document.getElementById('toggle-ranges').addEventListener('change', renderFindings);
  document.getElementById('btn-export').addEventListener('click', exportAnonymised);
  document.getElementById('btn-clear').addEventListener('click', () => {
    state.rows = []; state.header = []; state.suppliers = []; state.overrides = {};
    document.getElementById('paste-area').value = '';
    document.getElementById('file-input').value = '';
    document.getElementById('parse-feedback').innerHTML = '';
    document.getElementById('reconcile-output').innerHTML = '';
    document.getElementById('findings-output').innerHTML = '';
    goStage(1);
  });
});
