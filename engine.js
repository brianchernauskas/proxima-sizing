// Proxima sizing engine: renders a stepped questionnaire and an opportunity-sizing results page from a tool config.
// Each tool folder calls PX.register({...}). This file owns the markup, navigation, shared answers, the editable
// assumptions (config panel), sample data / sample output, and the shared commercial model.
(function () {
  'use strict';

  // ── Shared reference data ────────────────────────────────────────────────
  // Spend tiers align to the offering guidance (sub-$20M, $20–100M, $100M+), split finer for commercial bands.
  const TIERS = [
    ['under5m', 'Under $5M', 'Sub-$20M', '<$5M'],
    ['5-20m', '$5M – $20M', 'Sub-$20M', '$5–20M'],
    ['20-50m', '$20M – $50M', '$20–100M band', '$20–50M'],
    ['50-100m', '$50M – $100M', '$20–100M band', '$50–100M'],
    ['100mplus', '$100M+', 'Strategic scale', '$100M+'],
  ];
  const TIER_IDX = Object.fromEntries(TIERS.map((t, i) => [t[0], i]));
  const SPEND_LABEL = Object.fromEntries(TIERS.map(t => [t[0], t[3]]));
  const SPEND_MID = {}; // mutable: filled from the (editable) shared assumptions before each calculation

  const ROLES = [
    { key: 'vp', label: 'Vice President', sub: 'Executive oversight', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
    { key: 'pc', label: 'Principal Consultant', sub: 'Engagement lead', color: '#6c63ff', bg: 'rgba(108,99,255,0.12)' },
    { key: 'sc', label: 'Senior Consultant', sub: 'Workstream lead', color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
    { key: 'c', label: 'Consultant', sub: 'Independent delivery', color: '#38bdf8', bg: 'rgba(56,189,248,0.12)' },
    { key: 'ac', label: 'Associate Consultant', sub: 'Analyst / execution', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
  ];
  const ROLE_LABEL = Object.fromEntries(ROLES.map(r => [r.key, r.label]));

  const PROVIDERS = [
    ['aws', 'AWS', 'Amazon Web Services', 'var(--aws)'],
    ['azure', 'Azure', 'Microsoft Azure', 'var(--azure)'],
    ['gcp', 'GCP', 'Google Cloud', 'var(--gcp)'],
    ['other', 'Other', 'Oracle, IBM, neoclouds, etc.', 'var(--text)'],
  ];
  const PROV_LABEL = Object.fromEntries(PROVIDERS.map(p => [p[0], p[1]]));

  // The five offerings, used for the landing page and "pairs well with" links.
  const OFFERINGS = [
    { slug: 'rapid-cost-optimization', name: 'Rapid Cost Optimization', months: '2–3 months', fit: 'Any cloud client', blurb: 'One-time forecast, deal negotiation, unused-resource and licensing cleanup, non-prod rightsizing, quick storage wins. Rapid payback, high ROI.' },
    { slug: 'technical-optimization', name: 'Technical Optimization', months: '3–4 months', fit: 'Client engineering partnership', blurb: 'Compute, Kubernetes and storage optimization, AI/data platform and networking tuning, cost-aware design. Engineering-led, durable run-rate savings.' },
    { slug: 'margin-transformation', name: 'Margin Transformation', months: '3–4 months', fit: 'SaaS clients', blurb: 'Unit and product-level cost models, customer profitability, COGS vs R&D treatment, and linking cloud spend to pricing and margin.' },
    { slug: 'spend-governance', name: 'Spend Governance', months: '6–12 months', fit: 'Poor FinOps control', blurb: 'Tagging and allocation, iterative forecasting, budget accountability, FinOps operating model and KPIs. Locks in savings and prevents cost creep.' },
    { slug: 'commercial-migration', name: 'Commercial Migration', months: '3–6 months, scope dependent', fit: 'Migration plans', blurb: 'Enterprise deal and PPA renegotiation, commitment and licensing optimization, evaluation of alternative providers, cost-aware platform design.' },
  ];
  const OFFER_BY_SLUG = Object.fromEntries(OFFERINGS.map(o => [o.slug, o]));

  // ── Shared assumptions (editable on every tool's config panel) ────────────
  // bands: achievable all-in discount off list by spend tier [low, high] %, derived from the AWS / Azure / GCP
  // negotiation-planner getDiscountRange() bands (planner ranges v2.1, Aug 2026), collapsed to the five sizing tiers.
  const SHARED_DEFAULTS = {
    bands: {
      aws: [[8, 18], [16, 30], [22, 38], [25, 45], [25, 45]],
      azure: [[8, 18], [16, 27], [22, 33], [25, 35], [25, 35]],
      gcp: [[8, 20], [16, 32], [22, 40], [25, 45], [25, 45]],
    },
    currentDisc: { none: 0, low: 5, moderate: 15, strong: 25 },
    renewalFactor: { under6: 1, '6-18': 0.8, '18plus': 0.5, none: 0.9 },
    finopsFactor: { poor: 1.15, partial: 1, mature: 0.6 }, // less left to capture when governance is already good
    spendMid: [3, 12, 35, 75, 150], // $M midpoint used to turn % of spend into dollars, by spend tier
    highFlagPct: 30,
  };
  const SHARED_META = {
    bands: { title: 'Hyperscaler discount bands', note: 'Achievable all-in discount off list (low, high %) by spend tier. Drawn from the AWS, Azure and GCP negotiation planners; "other" uses an 80% blend of the three.' },
    currentDisc: { title: 'Current effective discount buckets', note: 'Discount % each answer represents.' },
    renewalFactor: { title: 'Renewal timing factor', note: 'Share of the commercial lever realisable, by time to renewal.' },
    finopsFactor: { title: 'FinOps maturity factor', note: 'Scales optimization levers: less is left to capture when governance is already mature.' },
    spendMid: { title: 'Spend tier midpoints ($M)', note: 'Used to convert % of spend into dollars. Order: ' + TIERS.map(t => t[3]).join(', ') + '.' },
    highFlagPct: { title: 'High-headline warning threshold', note: 'Warn when the top of the opportunity range exceeds this % of spend.' },
  };
  let SH = clone(SHARED_DEFAULTS); // active shared assumptions

  function syncSpendMid() { TIERS.forEach((t, i) => { SPEND_MID[t[0]] = SH.spendMid[i]; }); }
  syncSpendMid();

  // ── Helpers ──────────────────────────────────────────────────────────────
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  const r1 = v => Math.round(v * 10) / 10;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = v => String(r1(v)).replace(/\.0$/, '');
  const fmtFTE = v => String(Math.round(v * 100) / 100).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  const T = (vp, pc, sc, c, ac) => ({ vp, pc, sc, c, ac }); // full role set so every role is editable in config

  function fmtM(v) {
    if (v >= 1000) return '$' + (v / 1000).toFixed(1).replace(/\.0$/, '') + 'B';
    if (v >= 1) return '$' + v.toFixed(1).replace(/\.0$/, '') + 'M';
    return '$' + (v * 1000).toFixed(0) + 'K';
  }

  // Merge stored overrides onto defaults; only numbers replace numbers, shape comes from the defaults.
  function merge(def, stored) {
    if (typeof def === 'number') return (typeof stored === 'number' && isFinite(stored)) ? stored : def;
    if (Array.isArray(def)) return def.map((d, i) => merge(d, Array.isArray(stored) ? stored[i] : undefined));
    if (def && typeof def === 'object') { const o = {}; Object.keys(def).forEach(k => { o[k] = merge(def[k], stored && typeof stored === 'object' ? stored[k] : undefined); }); return o; }
    return def;
  }
  function readStore(key) { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } }
  function writeStore(key, val) { try { if (val == null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) { return false; } }

  // ── Commercial opportunity model (from the hyperscaler negotiation planners) ───
  // Incremental saving on the current bill (% of spend) from moving from the current discount to the achievable band.
  // boost adds leverage points (multi-cloud, credible migration) the same way the planners do.
  function commercialOpp(spendKey, providers, currentKey, boost, renewalKey) {
    const idx = TIER_IDX[spendKey];
    const keys = providers.filter(p => SH.bands[p]);
    const avg = (list, j) => list.reduce((s, p) => s + SH.bands[p][idx][j], 0) / list.length;
    let lo, hi;
    if (keys.length) { lo = avg(keys, 0); hi = avg(keys, 1); }
    else { const all = ['aws', 'azure', 'gcp']; lo = 0.8 * avg(all, 0); hi = 0.8 * avg(all, 1); } // 'other' only
    boost = boost || 0;
    lo = Math.min(lo + Math.round(boost * 0.4), 45);
    hi = Math.min(hi + boost, 50);
    const cur = SH.currentDisc[currentKey] || 0;
    const f = SH.renewalFactor[renewalKey] != null ? SH.renewalFactor[renewalKey] : 1;
    const inc = d => Math.max(0, (d - cur) / (100 - cur) * 100) * f;
    return { lo: r1(inc(lo)), hi: r1(inc(hi)), targetLo: Math.round(lo), targetHi: Math.round(hi), cur };
  }

  // Builds an opportunity table from [name, basis, loPct, hiPct] rows (percent of total annual spend).
  function oppTable(title, rows, spendKey, note) {
    const mid = SPEND_MID[spendKey];
    const out = rows.map(r => ({ name: r[0], basis: r[1], plo: r[2], phi: r[3], dlo: mid * r[2] / 100, dhi: mid * r[3] / 100 }));
    const dlo = out.reduce((s, r) => s + r.dlo, 0), dhi = out.reduce((s, r) => s + r.dhi, 0);
    const plo = out.reduce((s, r) => s + r.plo, 0), phi = out.reduce((s, r) => s + r.phi, 0);
    return {
      dlo, dhi, plo, phi,
      table: {
        title, head: ['Workstream', 'Basis', '% of spend', 'Annual $ (approx.)'],
        rows: out.map(r => [esc(r.name), `<span style="color:var(--muted)">${esc(r.basis)}</span>`, `${num(r.plo)}–${num(r.phi)}%`, `${fmtM(r.dlo)} – ${fmtM(r.dhi)}`]),
        foot: ['Total', '', `${num(plo)}–${num(phi)}%`, `${fmtM(dlo)} – ${fmtM(dhi)}`], note,
      },
    };
  }

  // Warns when the headline opportunity is above what is typical, so it gets validated before it is quoted.
  const highFlag = phi => phi > SH.highFlagPct ? { type: 'warn', title: 'Headline opportunity is high', detail: `Over ${SH.highFlagPct}% of spend at the top of the range usually means little discount or optimization today. Validate against actual invoices before quoting the upper end.` } : null;

  const sumTeam = t => ROLES.reduce((n, r) => n + (t[r.key] || 0), 0);
  const base = (arr, spendKey) => ({ vp: 0, pc: 0, sc: 0, c: 0, ac: 0, ...arr[TIER_IDX[spendKey]] });

  // ── Shared field definitions (same ids across tools so answers carry over) ──
  const opt = (arr) => arr.map(a => [a[0], a[1], a[2] || '']);
  const F = {
    name: () => ({ id: 'name', type: 'text', label: 'Client name', optional: true, placeholder: 'e.g. Acme Corp' }),
    spend: () => ({ id: 'spend', type: 'radio', label: 'Total annual cloud spend', options: TIERS.map(t => [t[0], t[1], t[2]]) }),
    providers: (label) => ({ id: 'providers', type: 'check', label: label || 'Cloud providers in use', hint: 'select all that apply', options: PROVIDERS.map(p => [p[0], p[1], p[2], p[3]]) }),
    ctype: () => ({ id: 'ctype', type: 'radio', label: 'Client type', options: opt([
      ['saas', 'SaaS / software company', 'Cloud spend sits in cost of goods sold'],
      ['enterprise', 'Enterprise / internal IT', 'Cloud supports internal and customer-facing systems'],
      ['other', 'Other', 'Digital, media, public sector, etc.']]) }),
    finops: () => ({ id: 'finops', type: 'radio', label: 'FinOps / cost control today', options: opt([
      ['poor', 'Poor control', 'Little allocation or forecasting; surprises are common'],
      ['partial', 'Partial', 'Some reporting; ownership is inconsistent'],
      ['mature', 'Mature', 'Allocation, forecasting and owners in place']]) }),
    commit: () => ({ id: 'commit', type: 'radio', label: 'Reserved / committed use in place', options: opt([
      ['none', 'None', 'Mostly on-demand'], ['partial', 'Partial', 'Some coverage; gaps remain'], ['full', 'Full coverage', 'Commitments optimised']]) }),
    disc: () => ({ id: 'disc', type: 'radio', label: 'Current effective discount off list (all-in)', options: opt([
      ['none', 'Little or none (under ~5%)', 'Largely list or on-demand pricing'],
      ['low', 'Low (~5–15%)', 'Some negotiated terms or commitments'],
      ['moderate', 'Moderate (~15–25%)', 'Enterprise agreement in place'],
      ['strong', 'Strong (25%+)', 'Well-negotiated deal; limited headroom']]) }),
    renewal: () => ({ id: 'renewal', type: 'radio', label: 'Next renewal or commitment end', options: opt([
      ['under6', 'Under 6 months', 'Negotiation window is open now'],
      ['6-18', '6–18 months', 'Plan ahead; leverage builds with timing'],
      ['18plus', '18+ months', 'Not in a window; limited commercial leverage'],
      ['none', 'No agreement', 'On-demand or no formal agreement']]) }),
    data: () => ({ id: 'data', type: 'radio', label: 'Billing and usage data access', options: opt([
      ['yes', 'Full access', 'Cost exports and usage data available'],
      ['partial', 'Partial', 'Some data; gaps or quality issues'],
      ['no', 'Not yet', 'Access must be granted or sourced']]) }),
    stake: () => ({ id: 'stake', type: 'radio', label: 'Stakeholder access (IT, Finance, Procurement)', options: opt([
      ['yes', 'Confirmed', 'Aligned and available'], ['partial', 'Partial', 'Some identified; others TBC'], ['no', 'Not confirmed', 'Mapping not yet done']]) }),
  };
  const SHARED_IDS = ['name', 'spend', 'providers', 'ctype', 'finops', 'commit', 'disc', 'renewal', 'data', 'stake'];
  const PROFILE_KEY = 'px-sizing-profile';

  function loadProfile() { return readStore(PROFILE_KEY) || {}; }
  function saveProfile() {
    const p = loadProfile();
    SHARED_IDS.forEach(id => { if (ans[id] != null && ans[id] !== '') p[id] = ans[id]; });
    writeStore(PROFILE_KEY, p);
  }

  // ── State ────────────────────────────────────────────────────────────────
  let cfg = null;
  let step = 0;
  let prevSection = 0;
  let sampleUsed = false; // any sample fill or sample view: output is marked as sample, never saved to the profile
  let params = null;      // active tool params (defaults + stored overrides)
  let lastResults = false;
  const ans = {};

  const storeKey = () => 'px-config-' + cfg.slug;
  function loadParams() {
    params = merge(cfg.params || {}, readStore(storeKey()));
    SH = merge(SHARED_DEFAULTS, readStore('px-config-shared'));
    syncSpendMid();
  }
  const isCustom = () => JSON.stringify(params) !== JSON.stringify(cfg.params || {}) || JSON.stringify(SH) !== JSON.stringify(SHARED_DEFAULTS);

  // ── Rendering ────────────────────────────────────────────────────────────
  function renderField(f) {
    const hint = f.hint ? ` <span>(${esc(f.hint)})</span>` : f.optional ? ' <span>(optional)</span>' : '';
    let body = '';
    if (f.type === 'text') {
      body = `<input type="text" id="f-${f.id}" placeholder="${esc(f.placeholder || '')}" autocomplete="off" />`;
    } else if (f.type === 'radio') {
      body = `<div class="radio-group" id="g-${f.id}">` + f.options.map(o => `
        <label class="radio-row" data-field="${f.id}" data-val="${o[0]}">
          <input type="radio" name="${f.id}" value="${o[0]}" /><div class="radio-dot"></div>
          <div class="radio-text"><strong>${esc(o[1])}</strong><span>${esc(o[2] || '')}</span></div>
        </label>`).join('') + '</div>';
    } else {
      body = `<div class="checkbox-grid" id="g-${f.id}">` + f.options.map(o => `
        <label class="check-item" data-field="${f.id}" data-val="${o[0]}">
          <input type="checkbox" value="${o[0]}" /><div class="check-dot"></div>
          <div><div class="check-label"${o[3] ? ` style="color:${o[3]}"` : ''}>${esc(o[1])}</div><div class="check-sub">${esc(o[2] || '')}</div></div>
        </label>`).join('') + '</div>';
    }
    return `<div class="field"><label>${esc(f.label)}${hint}</label>${body}</div>`;
  }

  function buildShell() {
    const n = cfg.steps.length;
    const tabs = cfg.steps.map((s, i) =>
      `<div class="step-tab${i === 0 ? ' active' : ''}" id="tab-${i}" data-go="${i}"><span class="step-num">${i + 1}</span>${esc(s.title)}</div>`).join('') +
      `<div class="step-tab" id="tab-${n}"><span class="step-num">${n + 1}</span>Results</div>`;
    const sections = cfg.steps.map((s, i) => {
      const last = i === n - 1;
      return `<div class="section${i === 0 ? ' active' : ''}" id="section-${i}">
        <div class="card"><div class="card-title">${esc(s.title)}</div>
          ${s.intro ? `<p style="font-size:13px;color:var(--muted);margin-bottom:20px;">${esc(s.intro)}</p>` : ''}
          ${s.fields.map(renderField).join('')}
        </div>
        <div class="nav-row">
          <div class="nav-left">
            ${i === 0 ? '' : '<button class="btn btn-secondary" data-nav="back">← Back</button>'}
            <button class="btn btn-secondary btn-sample-fill" data-nav="fill" data-step="${i}">✨ Fill sample data</button>
            ${i === 0 ? '<button class="btn btn-secondary" data-nav="sample">👁 View sample output</button>' : ''}
          </div>
          <div class="nav-right">
            <button class="hdr-link" data-nav="config">⚙ Configure</button>
            <button class="btn btn-primary" data-nav="${last ? 'finish' : 'next'}">${last ? 'Size the opportunity →' : 'Next: ' + esc(cfg.steps[i + 1].title) + ' →'}</button>
          </div>
        </div></div>`;
    }).join('') + `<div class="section" id="section-${n}">
        <div id="results-content"></div>
        <div id="params-used-line" style="font-size:11px;color:var(--muted);border-top:1px solid var(--border);padding-top:12px;margin-top:24px;line-height:1.6;"></div>
        <div class="print-row">
          <button class="hdr-link" data-nav="config">⚙ Configure</button>
          <button class="btn-print" data-nav="print">⎙ Print / Export PDF</button>
          <button class="btn btn-secondary" data-nav="restart">← Start Over</button>
        </div></div>
      <div class="section" id="section-cfg"></div>`;

    document.title = `${cfg.name} | Proxima`;
    document.getElementById('app').innerHTML = `
      <header>
        <div class="header-brand">
          <a href="../"><span class="brand-pill">Proxima</span></a>
          <div><div class="header-title">${esc(cfg.name)}</div><div class="header-sub">Offering ${cfg.num} of 5 · ${esc(cfg.months)}</div></div>
        </div>
        <div class="header-actions">
          <button class="hdr-link" data-nav="config" id="cfg-btn">⚙ Configure</button>
          <a class="hdr-link" href="../">All offerings</a>
        </div>
      </header>
      <div class="container">
        <div class="hero"><div class="sku-badge">Offering ${cfg.num} · ${esc(cfg.fit)}</div>
          <h1>${esc(cfg.name)}</h1><p>${esc(cfg.intro)}</p><div class="note-line" id="prefill-note"></div></div>
        <div class="steps">${tabs}</div>
        ${sections}
      </div>`;
    refreshCfgButton();
  }

  function refreshCfgButton() {
    const b = document.getElementById('cfg-btn');
    if (b) b.innerHTML = '⚙ Configure' + (isCustom() ? ' <span class="cfg-dot" title="Custom assumptions in use"></span>' : '');
  }

  // Selecting values programmatically (prefill and sample fill). Clears the group first.
  function selectField(f, val) {
    if (f.type === 'text') { const el = document.getElementById('f-' + f.id); if (el) el.value = val || ''; ans[f.id] = val || ''; return; }
    if (f.type === 'radio') {
      document.querySelectorAll(`#g-${f.id} .radio-row`).forEach(r => r.classList.remove('selected'));
      const row = document.querySelector(`#g-${f.id} .radio-row[data-val="${val}"]`);
      if (row) { row.classList.add('selected'); ans[f.id] = val; }
      return;
    }
    document.querySelectorAll(`#g-${f.id} .check-item`).forEach(r => r.classList.remove('selected'));
    const vals = (Array.isArray(val) ? val : []).filter(v => document.querySelector(`#g-${f.id} .check-item[data-val="${v}"]`));
    vals.forEach(v => document.querySelector(`#g-${f.id} .check-item[data-val="${v}"]`).classList.add('selected'));
    if (vals.length) ans[f.id] = vals;
  }

  function prefill() {
    const p = loadProfile();
    let hit = 0;
    cfg.steps.forEach(s => s.fields.forEach(f => { if (p[f.id] != null && f.id !== 'name') { selectField(f, p[f.id]); hit++; } }));
    if (p.name) { const f = cfg.steps[0].fields.find(x => x.id === 'name'); if (f) selectField(f, p.name); }
    const note = document.getElementById('prefill-note');
    if (hit && note) note.innerHTML = 'Answers prefilled from your last sizing run on this device. <a data-nav="clearprofile">Clear</a>';
  }

  // ── Sample data ──────────────────────────────────────────────────────────
  const sampleVal = id => (cfg.sample || {})[id];
  function fillStep(i, btn) {
    cfg.steps[i].fields.forEach(f => { if (sampleVal(f.id) !== undefined) selectField(f, sampleVal(f.id)); });
    sampleUsed = true;
    if (btn) { btn.textContent = '✓ Sample data filled'; btn.disabled = true; setTimeout(() => { btn.textContent = '✨ Fill sample data'; btn.disabled = false; }, 1800); }
    const note = document.getElementById('prefill-note');
    if (note) note.innerHTML = 'Sample data in use: the output will be marked as a sample and will not be saved to your profile. <a data-nav="restart">Reset</a>';
  }
  function viewSample() {
    cfg.steps.forEach((s, i) => fillStep(i));
    results();
  }

  function goTo(i) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.step-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('section-' + i).classList.add('active');
    document.getElementById('tab-' + i).classList.add('active');
    for (let k = 0; k < i; k++) document.getElementById('tab-' + k).classList.add('done');
    step = i;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function validate(i) {
    for (const f of cfg.steps[i].fields) {
      if (f.optional || f.type === 'text') continue;
      const v = ans[f.id];
      if (f.type === 'radio' && !v) { alert('Please answer: ' + f.label); return false; }
      if (f.type === 'check' && !(v && v.length)) { alert('Please select at least one: ' + f.label); return false; }
    }
    return true;
  }

  const table = t => `<div class="card" style="margin-bottom:16px"><div class="card-title">${esc(t.title)}</div>
    <div style="overflow-x:auto"><table class="savings-table">
      <thead><tr>${t.head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>
      <tbody>${t.rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
      ${t.foot ? `<tfoot><tr style="font-weight:700;border-top:2px solid var(--border)">${t.foot.map(c => `<td>${c}</td>`).join('')}</tr></tfoot>` : ''}
    </table></div>${t.note ? `<div class="ranges-note">${esc(t.note)}</div>` : ''}</div>`;

  function sampleBanner() {
    return `<div class="sample-banner" role="note"><span class="sample-tag">SAMPLE</span>
      <div><strong>Sample output: illustrative data, not a client analysis.</strong> Built from the sample answers (inputs may have been edited since). Nothing here is saved to your profile.</div></div>`;
  }

  function results() {
    const nameEl = document.getElementById('f-name');
    if (nameEl && !sampleUsed) ans.name = nameEl.value.trim();
    loadParams(); // pick up any config saved since the page loaded
    const r = cfg.calc(ans, { ...params, shared: SH });
    const [lo, hi] = r.duration;
    const headcount = sumTeam(r.team);
    const teamRows = ROLES.filter(x => r.team[x.key] > 0).map(x => `
      <tr><td><span class="role-badge" style="background:${x.bg};color:${x.color}">${x.label}</span></td>
      <td style="color:var(--muted);font-size:13px">${x.sub}</td>
      <td style="font-weight:700;font-size:16px;text-align:right">${fmtFTE(r.team[x.key])}</td></tr>`).join('');
    const flags = (r.flags || []).map(f => `<div class="flag ${f.type}"><div class="flag-icon">${f.type === 'risk' ? '⚠' : f.type === 'warn' ? '◉' : '✓'}</div>
      <div class="flag-text"><strong>${esc(f.title)}</strong><span>${esc(f.detail)}</span></div></div>`).join('');
    const phases = r.phases ? table({
      title: r.phasesTitle || 'Delivery Phasing', head: ['Phase', 'Timing', 'Focus', 'Proxima effort'],
      rows: r.phases.map(p => [esc(p[0]), esc(p[1]), `<span style="color:var(--muted)">${esc(p[2])}</span>`, `<div class="bar"><span style="width:${p[3]}%"></span></div>`]),
      note: r.phasesNote,
    }) : '';
    const split = r.split ? table({
      title: 'Delivery Split: Proxima and Client', head: ['Party', 'Responsibility', 'Effort'],
      rows: r.split.map(s => [`<strong>${esc(s[0])}</strong>`, `<span style="color:var(--muted)">${esc(s[1])}</span>`, esc(s[2])]),
      note: r.splitNote || 'Proxima leads commercial, governance and margin work outright and partners with client engineering teams to deliver the technical work.',
    }) : '';
    const next = (r.next || []).filter(x => OFFER_BY_SLUG[x[0]] && x[0] !== cfg.slug).map(x => {
      const o = OFFER_BY_SLUG[x[0]];
      return `<a class="next-item" href="../${o.slug}/"><strong>${esc(o.name)} <span>· ${esc(o.months)}</span></strong><span>${esc(x[1])}</span></a>`;
    }).join('');
    const name = sampleUsed ? (ans.name || 'Sample Client') : (ans.name || 'Client');

    document.getElementById('results-content').innerHTML = (sampleUsed ? sampleBanner() : '') + `
      <div style="margin-bottom:24px">
        <div class="sku-badge">Results · ${esc(name)}</div>
        <h2 style="font-size:22px;font-weight:700;margin-bottom:4px">${esc(cfg.name)}: opportunity sizing</h2>
        <div style="font-size:13px;color:var(--muted)">${esc(r.summary || '')}</div>
      </div>
      <div class="results-grid">
        ${(r.kpis || []).map(k => `<div class="result-card"><div class="result-label">${esc(k.label)}</div>
          <div class="result-value"${k.color ? ` style="color:${k.color}"` : ''}>${k.value}</div>
          <div class="result-sub">${esc(k.sub || '')}</div></div>`).join('')}
        <div class="result-card"><div class="result-label">Engagement Duration</div>
          <div class="result-value">${num(lo)}–${num(hi)} <span style="font-size:18px;font-weight:500">months</span></div>
          <div class="result-sub">Standard range ${esc(cfg.months)}</div></div>
        <div class="result-card"><div class="result-label">Proxima Team (Peak)</div>
          <div class="result-value">${fmtFTE(headcount)} <span style="font-size:18px;font-weight:500">FTE</span></div>
          <div class="result-sub">${esc(r.teamSub || '')}</div></div>
      </div>
      ${(r.tables || []).map(table).join('')}
      <div class="card" style="margin-bottom:16px"><div class="card-title">Proxima Team Composition</div>
        <div style="overflow-x:auto"><table class="team-table">
          <thead><tr><th>Role</th><th>Function</th><th style="text-align:right">FTE</th></tr></thead>
          <tbody>${teamRows}</tbody></table></div>
        <div class="ranges-note">Fractional FTE reflects part-time engagement (for example a Principal Consultant at 0.5). Team shown at peak; see phasing for the effort curve.</div></div>
      ${split}${phases}
      <div class="card" style="margin-bottom:16px"><div class="card-title">Readiness &amp; Risk Flags</div><div class="flags">${flags}</div></div>
      ${r.positioning || next ? `<div class="card" style="margin-bottom:16px"><div class="card-title">Positioning and Sequencing</div>
        ${r.positioning ? `<p style="font-size:13px;color:var(--muted);margin-bottom:14px">${esc(r.positioning)}</p>` : ''}
        ${next ? `<div class="next-list">${next}</div>` : ''}</div>` : ''}`;

    const custom = isCustom();
    document.getElementById('params-used-line').innerHTML =
      `<strong>Assumptions (${custom ? 'custom' : 'default'}):</strong> ${esc(cfg.method)} &nbsp;·&nbsp; Generated ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` +
      ' &nbsp;·&nbsp; Planning heuristics for scoping conversations; not a quote, forecast or commitment. Commercial ranges are drawn from the Proxima hyperscaler negotiation planners.' +
      ' &nbsp;·&nbsp; <a href="#" data-nav="config" style="color:var(--accent);text-decoration:none">Adjust assumptions &amp; rerun →</a>';
    document.body.classList.toggle('is-sample', sampleUsed);
    if (!sampleUsed) saveProfile();
    lastResults = true;
    refreshCfgButton();
    goTo(cfg.steps.length);
  }

  // ── Config panel (editable assumptions) ──────────────────────────────────
  const LABELS = { lt5: 'Under 5%', '5-10': '5–10%', '10-20': '10–20%', '20plus': '20%+', '5-15': '5–15% off', within5: 'Within 5%', over15: 'Over 15% off', under6: 'Under 6 months', '6-18': '6–18 months', '18plus': '18+ months',
    eval: 'Evaluating only', partial: 'Partial', major: '30–60% of workloads', full: 'Full', med: 'Medium', dataai: 'AI / data platform', migratingPct: 'Migrating spend %', spendShare: 'Spend share %', lowMonths: 'Months (low)', highMonths: 'Months (high)',
    awsx: 'AWS', aws: 'AWS', azure: 'Azure', gcp: 'GCP', yes: 'Yes', no: 'No', moderate: 'Moderate', mixed: 'Mixed', modern: 'Cloud-native', legacy: 'Lift-and-shift' };
  const prettify = s => LABELS[s] ? LABELS[s] : /^[a-z]{1,3}$/.test(s) && ROLE_LABEL[s] ? ROLE_LABEL[s] : String(s).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]/g, ' ').replace(/^./, c => c.toUpperCase());

  // Flattens a params subtree to editable leaves. Two-number arrays become a low/high pair on one row.
  function leaves(node, path, out) {
    if (typeof node === 'number') out.push({ path, vals: [node] });
    else if (Array.isArray(node) && node.length === 2 && typeof node[0] === 'number') out.push({ path, vals: node, pair: true });
    else if (Array.isArray(node)) node.forEach((c, i) => leaves(c, path.concat(i), out));
    else if (node && typeof node === 'object') Object.keys(node).forEach(k => leaves(node[k], path.concat(k), out));
    return out;
  }
  function labelFor(path, tree) {
    let node = tree; const parts = [];
    path.forEach(seg => {
      const isArr = Array.isArray(node);
      if (isArr && node.length === TIERS.length && typeof seg === 'number') parts.push(TIERS[seg][3]);
      else if (isArr) parts.push('#' + (seg + 1));
      else parts.push(ROLE_LABEL[seg] || (cfg && cfg.labels && cfg.labels[seg]) || prettify(seg));
      node = node ? node[seg] : null;
    });
    return parts.join(' › ');
  }
  function groupHTML(scope, key, tree, meta, cur) {
    const rows = leaves(tree, [], []);
    const inputs = rows.map(l => {
      const id = `${scope}|${key}|${l.path.join('.')}`;
      const mk = (v, j) => `<input type="number" step="any" data-cfg="${esc(id)}"${l.pair ? ` data-j="${j}"` : ''} value="${v}" />`;
      return `<div class="cfg-row"><label>${esc(labelFor(l.path, tree))}${l.pair ? ' <em>(low – high)</em>' : ''}</label>
        <span class="cfg-pair">${l.pair ? mk(l.vals[0], 0) + '<i>–</i>' + mk(l.vals[1], 1) : mk(l.vals[0], 0)}</span></div>`;
    }).join('');
    const changed = JSON.stringify(tree) !== JSON.stringify(cur);
    return `<details class="cfg-group"${changed ? ' open' : ''}><summary>${esc((meta && meta.title) || prettify(key))}${changed ? ' <span class="cfg-dot"></span>' : ''}</summary>
      ${meta && meta.note ? `<p class="cfg-note">${esc(meta.note)}</p>` : ''}<div class="cfg-grid">${inputs}</div></details>`;
  }
  function openConfig() {
    loadParams();
    const active = document.querySelector('.section.active');
    if (active && active.id !== 'section-cfg') prevSection = active.id;
    const toolGroups = Object.keys(cfg.params || {}).map(k => groupHTML('tool', k, params[k], (cfg.paramMeta || {})[k], cfg.params[k])).join('');
    const sharedGroups = Object.keys(SHARED_DEFAULTS).map(k => groupHTML('shared', k, SH[k], SHARED_META[k], SHARED_DEFAULTS[k])).join('');
    document.getElementById('section-cfg').innerHTML = `
      <div class="card"><div class="card-title">Assumptions: ${esc(cfg.name)}</div>
        <p style="font-size:13px;color:var(--muted);margin-bottom:6px">Change any assumption behind the sizing. Edits are saved on this device only and apply the next time results are generated. A dot marks anything changed from the default.</p>
        <p style="font-size:13px;color:var(--muted)"><strong>This tool</strong> applies to ${esc(cfg.name)} only. <strong>Shared commercial assumptions</strong> apply to all five offerings on this device.</p></div>
      <div class="cfg-heading">This tool</div>${toolGroups || '<div class="note-line">No tool-specific assumptions.</div>'}
      <div class="cfg-heading">Shared commercial assumptions (all offerings)</div>${sharedGroups}
      <div class="nav-row cfg-actions">
        <div class="nav-left">
          <button class="btn btn-secondary" data-nav="cfgback">← Back</button>
          <button class="btn btn-secondary" data-nav="cfgreset">Reset this tool</button>
          <button class="btn btn-secondary" data-nav="cfgresetshared">Reset shared</button>
        </div>
        <button class="btn btn-primary" data-nav="cfgsave">${lastResults ? 'Save &amp; rerun →' : 'Save'}</button>
      </div>
      <div class="cfg-toast" id="cfg-toast"></div>`;
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById('section-cfg').classList.add('active');
    window.scrollTo({ top: 0 });
  }
  function readConfigInputs() {
    const t = clone(params), s = clone(SH);
    document.querySelectorAll('#section-cfg [data-cfg]').forEach(el => {
      const [scope, key, p] = el.dataset.cfg.split('|');
      const v = parseFloat(el.value);
      if (!isFinite(v)) return;
      const path = p === '' ? [] : p.split('.').map(x => /^\d+$/.test(x) ? +x : x);
      let holder = scope === 'tool' ? t : s, k = key;
      path.forEach(seg => { holder = holder[k]; k = seg; });
      if (el.dataset.j !== undefined) holder[k][+el.dataset.j] = v; else holder[k] = v;
    });
    return [t, s];
  }
  function toast(msg) { const el = document.getElementById('cfg-toast'); if (el) { el.textContent = msg; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2200); } }
  function saveConfig() {
    const [t, s] = readConfigInputs();
    const tDiff = JSON.stringify(t) !== JSON.stringify(cfg.params || {}), sDiff = JSON.stringify(s) !== JSON.stringify(SHARED_DEFAULTS);
    const ok = writeStore(storeKey(), tDiff ? t : null) && writeStore('px-config-shared', sDiff ? s : null);
    loadParams(); refreshCfgButton();
    if (!ok) { toast('Could not save: browser storage is unavailable. Changes apply only until you leave this page.'); params = t; SH = s; syncSpendMid(); return false; }
    return true;
  }

  function onClick(e) {
    const row = e.target.closest('[data-field]');
    if (row) {
      e.preventDefault();
      const id = row.dataset.field, val = row.dataset.val;
      if (row.classList.contains('radio-row')) {
        document.querySelectorAll(`#g-${id} .radio-row`).forEach(r => r.classList.remove('selected'));
        row.classList.add('selected');
        ans[id] = val;
      } else {
        row.classList.toggle('selected');
        ans[id] = [...document.querySelectorAll(`#g-${id} .check-item.selected`)].map(r => r.dataset.val);
      }
      return;
    }
    const tab = e.target.closest('[data-go]');
    if (tab) { const t = +tab.dataset.go; if (t <= step) goTo(t); return; }
    const nav = e.target.closest('[data-nav]');
    if (!nav) return;
    e.preventDefault();
    const a = nav.dataset.nav;
    if (a === 'back') goTo(step - 1);
    else if (a === 'next') { if (validate(step)) goTo(step + 1); }
    else if (a === 'finish') { if (validate(step)) results(); }
    else if (a === 'print') window.print();
    else if (a === 'restart') { if (sampleUsed) location.reload(); else goTo(0); }
    else if (a === 'clearprofile') { writeStore(PROFILE_KEY, null); location.reload(); }
    else if (a === 'fill') fillStep(+nav.dataset.step, nav);
    else if (a === 'sample') viewSample();
    else if (a === 'config') openConfig();
    else if (a === 'cfgback') { document.getElementById('section-cfg').classList.remove('active'); document.getElementById(prevSection).classList.add('active'); }
    else if (a === 'cfgreset') { writeStore(storeKey(), null); loadParams(); refreshCfgButton(); openConfig(); toast('This tool reset to defaults.'); }
    else if (a === 'cfgresetshared') { writeStore('px-config-shared', null); loadParams(); refreshCfgButton(); openConfig(); toast('Shared assumptions reset to defaults.'); }
    else if (a === 'cfgsave') {
      if (!saveConfig()) return;
      if (lastResults) results(); else { openConfig(); toast('Saved. Applies when you generate results.'); }
    }
  }

  window.PX = {
    TIERS, TIER_IDX, SPEND_MID, SPEND_LABEL, ROLES, PROVIDERS, PROV_LABEL, OFFERINGS, F, T,
    sharedDefaults: () => clone(SHARED_DEFAULTS),
    esc, fmtM, r1, num, fmtFTE, highFlag, oppTable, commercialOpp, sumTeam, base,
    register(c) {
      cfg = c;
      loadParams();
      buildShell();
      prefill();
      document.getElementById('app').addEventListener('click', onClick);
      if (/[?&]config(=|&|$)/.test(location.search)) openConfig(); // hub card "Configure" link
    },
  };
})();
