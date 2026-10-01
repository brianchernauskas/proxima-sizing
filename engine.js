// Proxima sizing engine: renders a stepped questionnaire and an opportunity-sizing results page from a tool config.
// Each tool folder calls PX.register({...}). This file owns the markup, navigation, shared answers and shared models.
(function () {
  'use strict';

  // ── Shared reference data ────────────────────────────────────────────────
  // Spend tiers align to the offering guidance (sub-$20M, $20–100M, $100M+), split finer for commercial bands.
  const TIERS = [
    ['under5m', 'Under $5M', 'Sub-$20M', 3, '<$5M'],
    ['5-20m', '$5M – $20M', 'Sub-$20M', 12, '$5–20M'],
    ['20-50m', '$20M – $50M', '$20–100M band', 35, '$20–50M'],
    ['50-100m', '$50M – $100M', '$20–100M band', 75, '$50–100M'],
    ['100mplus', '$100M+', 'Strategic scale', 150, '$100M+'],
  ];
  const TIER_IDX = Object.fromEntries(TIERS.map((t, i) => [t[0], i]));
  const SPEND_MID = Object.fromEntries(TIERS.map(t => [t[0], t[3]]));
  const SPEND_LABEL = Object.fromEntries(TIERS.map(t => [t[0], t[4]]));

  const ROLES = [
    { key: 'vp', label: 'Vice President', sub: 'Executive oversight', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
    { key: 'pc', label: 'Principal Consultant', sub: 'Engagement lead', color: '#6c63ff', bg: 'rgba(108,99,255,0.12)' },
    { key: 'sc', label: 'Senior Consultant', sub: 'Workstream lead', color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
    { key: 'c', label: 'Consultant', sub: 'Independent delivery', color: '#38bdf8', bg: 'rgba(56,189,248,0.12)' },
    { key: 'ac', label: 'Associate Consultant', sub: 'Analyst / execution', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
  ];

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

  // ── Commercial opportunity model (from the hyperscaler negotiation planners) ───
  // Achievable all-in discount off list, by spend tier [low, high] %, derived from the AWS / Azure / GCP planner
  // getDiscountRange() bands (planner ranges v2.1, Aug 2026), collapsed to the five sizing tiers.
  const BANDS = {
    aws: [[8, 18], [16, 30], [22, 38], [25, 45], [25, 45]],
    azure: [[8, 18], [16, 27], [22, 33], [25, 35], [25, 35]],
    gcp: [[8, 20], [16, 32], [22, 40], [25, 45], [25, 45]],
  };
  const CURRENT_DISC = { none: 0, low: 5, moderate: 15, strong: 25 };
  const RENEWAL_FACTOR = { under6: 1, '6-18': 0.8, '18plus': 0.5, none: 0.9 };

  // Incremental saving on the current bill (% of spend) from moving from the current discount to the achievable band.
  // boost adds leverage points (multi-cloud, credible migration) the same way the planners do.
  function commercialOpp(spendKey, providers, currentKey, boost, renewalKey) {
    const idx = TIER_IDX[spendKey];
    const keys = providers.filter(p => BANDS[p]);
    let lo = 0, hi = 0;
    if (keys.length) {
      lo = keys.reduce((s, p) => s + BANDS[p][idx][0], 0) / keys.length;
      hi = keys.reduce((s, p) => s + BANDS[p][idx][1], 0) / keys.length;
    } else { // 'other' only: use the average hyperscaler band, discounted
      lo = 0.8 * ['aws', 'azure', 'gcp'].reduce((s, p) => s + BANDS[p][idx][0], 0) / 3;
      hi = 0.8 * ['aws', 'azure', 'gcp'].reduce((s, p) => s + BANDS[p][idx][1], 0) / 3;
    }
    boost = boost || 0;
    lo = Math.min(lo + Math.round(boost * 0.4), 45);
    hi = Math.min(hi + boost, 50);
    const cur = CURRENT_DISC[currentKey] || 0;
    const f = RENEWAL_FACTOR[renewalKey] != null ? RENEWAL_FACTOR[renewalKey] : 1;
    const inc = d => Math.max(0, (d - cur) / (100 - cur) * 100) * f;
    return { lo: r1(inc(lo)), hi: r1(inc(hi)), targetLo: Math.round(lo), targetHi: Math.round(hi), cur };
  }

  const FINOPS_FACTOR = { poor: 1.15, partial: 1, mature: 0.6 }; // less left to capture when governance is already good

  // ── Helpers ──────────────────────────────────────────────────────────────
  const r1 = v => Math.round(v * 10) / 10;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = v => String(r1(v)).replace(/\.0$/, '');
  const fmtFTE = v => String(Math.round(v * 100) / 100).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');

  function fmtM(v) {
    if (v >= 1000) return '$' + (v / 1000).toFixed(1).replace(/\.0$/, '') + 'B';
    if (v >= 1) return '$' + v.toFixed(1).replace(/\.0$/, '') + 'M';
    return '$' + (v * 1000).toFixed(0) + 'K';
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
  const highFlag = phi => phi > 30 ? { type: 'warn', title: 'Headline opportunity is high', detail: 'Over 30% of spend at the top of the range usually means little discount or optimization today. Validate against actual invoices before quoting the upper end.' } : null;

  const scaleTeam = (team, f) => Object.fromEntries(Object.entries(team).map(([k, v]) => [k, v * f]));
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

  function loadProfile() { try { return JSON.parse(localStorage.getItem(PROFILE_KEY)) || {}; } catch (e) { return {}; } }
  function saveProfile(extra) {
    try {
      const p = loadProfile();
      SHARED_IDS.forEach(id => { if (ans[id] != null && ans[id] !== '') p[id] = ans[id]; });
      Object.assign(p, extra || {});
      localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    } catch (e) { /* storage unavailable: page works without it */ }
  }
  function clearProfile() { try { localStorage.removeItem(PROFILE_KEY); } catch (e) { /* ignore */ } }

  // ── Rendering ────────────────────────────────────────────────────────────
  let cfg = null;
  let step = 0;
  const ans = {};

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
          ${i === 0 ? '<span></span>' : '<button class="btn btn-secondary" data-nav="back">← Back</button>'}
          <button class="btn btn-primary" data-nav="${last ? 'finish' : 'next'}">${last ? 'Size the opportunity →' : 'Next: ' + esc(cfg.steps[i + 1].title) + ' →'}</button>
        </div></div>`;
    }).join('') + `<div class="section" id="section-${n}">
        <div id="results-content"></div>
        <div id="params-used-line" style="font-size:11px;color:var(--muted);border-top:1px solid var(--border);padding-top:12px;margin-top:24px;line-height:1.6;"></div>
        <div class="print-row">
          <button class="btn-print" data-nav="print">⎙ Print / Export PDF</button>
          <button class="btn btn-secondary" data-nav="restart">← Start Over</button>
        </div></div>`;

    document.title = `${cfg.name} | Proxima`;
    document.getElementById('app').innerHTML = `
      <header>
        <div class="header-brand">
          <a href="../"><span class="brand-pill">Proxima</span></a>
          <div><div class="header-title">${esc(cfg.name)}</div><div class="header-sub">Offering ${cfg.num} of 5 · ${esc(cfg.months)}</div></div>
        </div>
        <a href="../" style="font-size:12px;color:var(--muted);text-decoration:none;border:1px solid var(--border);padding:5px 12px;border-radius:6px;">All offerings</a>
      </header>
      <div class="container">
        <div class="hero"><div class="sku-badge">Offering ${cfg.num} · ${esc(cfg.fit)}</div>
          <h1>${esc(cfg.name)}</h1><p>${esc(cfg.intro)}</p><div class="note-line" id="prefill-note"></div></div>
        <div class="steps">${tabs}</div>
        ${sections}
      </div>`;
  }

  function selectField(f, val) {
    if (f.type === 'text') { const el = document.getElementById('f-' + f.id); if (el) el.value = val; ans[f.id] = val; return; }
    if (f.type === 'radio') {
      const row = document.querySelector(`#g-${f.id} .radio-row[data-val="${val}"]`);
      if (!row) return;
      row.classList.add('selected'); ans[f.id] = val; return;
    }
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
    const a = nav.dataset.nav;
    if (a === 'back') goTo(step - 1);
    else if (a === 'next') { if (validate(step)) goTo(step + 1); }
    else if (a === 'finish') { if (validate(step)) results(); }
    else if (a === 'print') window.print();
    else if (a === 'restart') goTo(0);
    else if (a === 'clearprofile') { clearProfile(); location.reload(); }
  }

  const table = t => `<div class="card" style="margin-bottom:16px"><div class="card-title">${esc(t.title)}</div>
    <div style="overflow-x:auto"><table class="savings-table">
      <thead><tr>${t.head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>
      <tbody>${t.rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
      ${t.foot ? `<tfoot><tr style="font-weight:700;border-top:2px solid var(--border)">${t.foot.map(c => `<td>${c}</td>`).join('')}</tr></tfoot>` : ''}
    </table></div>${t.note ? `<div class="ranges-note">${esc(t.note)}</div>` : ''}</div>`;

  function results() {
    const client = (document.getElementById('f-name') || {}).value || '';
    ans.name = client.trim();
    const r = cfg.calc(ans);
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

    document.getElementById('results-content').innerHTML = `
      <div style="margin-bottom:24px">
        <div class="sku-badge">Results · ${esc(ans.name || 'Client')}</div>
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

    document.getElementById('params-used-line').innerHTML =
      `<strong>Method:</strong> ${esc(cfg.method)} &nbsp;·&nbsp; Generated ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` +
      ' &nbsp;·&nbsp; Planning heuristics for scoping conversations; not a quote, forecast or commitment. Commercial ranges are drawn from the Proxima hyperscaler negotiation planners.';
    saveProfile();
    goTo(cfg.steps.length);
  }

  window.PX = {
    TIERS, TIER_IDX, SPEND_MID, SPEND_LABEL, ROLES, PROVIDERS, PROV_LABEL, OFFERINGS, F, FINOPS_FACTOR, BANDS,
    esc, fmtM, r1, num, fmtFTE, highFlag, oppTable, commercialOpp, scaleTeam, sumTeam, base,
    register(c) {
      cfg = c;
      buildShell();
      prefill();
      document.getElementById('app').addEventListener('click', onClick);
    },
  };
})();
