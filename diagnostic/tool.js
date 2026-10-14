// Diagnostic (2–4 weeks, start here): scoping engagement that every offering assumes is done.
(function () {
  const { F, SPEND_LABEL, PROV_LABEL, TIER_IDX, fillRoles, fmtFTE, sumTeam, esc } = PX;

  PX.register({
    slug: 'diagnostic', num: 1, name: 'Diagnostic', months: '2–4 weeks', fit: 'Start here, any cloud client', resultsTitle: 'scoping',
    intro: 'Size the short scoping engagement that comes before any offering: consumption profile, billing and usage data validation, commercial baseline, and a recommended path into the five offerings.',
    method: 'Duration starts at the base weeks and extends for multi-cloud estates, data gaps and unconfirmed stakeholders, up to the maximum. Team is a 0.5 Principal plus a Senior Consultant, adding Consultant time with complexity up to the FTE cap.',

    params: {
      weeks: [2, 2],
      maxWeeks: 4,
      cloudWeeks: { two: 0.5, three: 1 },
      dataWeeks: { partial: 0.5, no: 1 },
      stakeWeeks: { partial: 0.5, no: 0.5 },
      team: { pc: 0.5, sc: 0.5 },
      maxFTE: 1.5,
      addFTE: { twoClouds: 0.25, threeClouds: 0.5, partialData: 0.25, noData: 0.5, largeSpend: 0.25 },
    },
    paramMeta: {
      weeks: { title: 'Base duration (weeks, low – high)' },
      maxWeeks: { title: 'Maximum duration (weeks)' },
      cloudWeeks: { title: 'Weeks added for multi-cloud', note: 'two = 2 clouds, three = 3 or more.' },
      dataWeeks: { title: 'Weeks added for billing / usage data gaps' },
      stakeWeeks: { title: 'Weeks added when stakeholders are not confirmed' },
      team: { title: 'Base team (FTE)', note: 'At least a 0.5 Principal Consultant on every Diagnostic.' },
      maxFTE: { title: 'Maximum Diagnostic team (FTE)' },
      addFTE: { title: 'Consultant FTE added for complexity', note: 'largeSpend applies at $50M+ annual cloud spend.' },
    },
    sample: { name: 'Sample Client', spend: '20-50m', providers: ['aws', 'azure'], finops: 'partial', data: 'partial', stake: 'partial' },

    steps: [
      { title: 'Client Profile', fields: [F.name(), F.spend(), F.providers(), F.finops()] },
      { title: 'Readiness', intro: 'These set the Diagnostic length. Data quality is resolved here, so the offerings that follow do not ask for it again.', fields: [F.data(), F.stake()] },
    ],

    calc(a, P) {
      const nc = a.providers.length, t = TIER_IDX[a.spend];
      // Duration (weeks)
      let [lo, hi] = P.weeks;
      const cw = nc >= 3 ? P.cloudWeeks.three : nc === 2 ? P.cloudWeeks.two : 0;
      const dw = P.dataWeeks[a.data] || 0, sw = P.stakeWeeks[a.stake] || 0;
      hi += cw + dw + sw; lo += Math.min(cw + dw + sw, 1) / 2;
      hi = Math.min(Math.max(hi, lo), P.maxWeeks); lo = Math.min(lo, hi);

      // Team: 0.5 PC + SC base, Consultant time added with complexity, capped
      const A = P.addFTE;
      const add = (nc >= 3 ? A.threeClouds : nc === 2 ? A.twoClouds : 0)
        + (a.data === 'no' ? A.noData : a.data === 'partial' ? A.partialData : 0) + (t >= 3 ? A.largeSpend : 0);
      const baseFTE = P.team.pc + P.team.sc;
      const total = Math.min(P.maxFTE, baseFTE + add);
      const team = fillRoles(total, [['pc', P.team.pc], ['sc', P.team.sc], ['c', 99]]);

      const outputs = {
        title: 'What the Diagnostic Delivers', head: ['Output', 'Feeds'],
        rows: [
          ['Consumption profile: compute, storage pools, growth drivers', 'Technical Optimization, Rapid Cost Optimization'],
          ['Billing and usage data validated across ' + (nc > 1 ? nc + ' clouds' : 'the estate'), 'Every offering (removes the data-quality risk)'],
          ['Commercial baseline: discount, commitments, renewal dates', 'Rapid Cost Optimization, Commercial Migration'],
          ['FinOps maturity and ownership read-out', 'Spend Governance, Margin Transformation'],
          ['Quick-win shortlist and recommended offering path', 'Engagement proposal'],
        ].map(r => [esc(r[0]), `<span style="color:var(--muted)">${esc(r[1])}</span>`]),
        note: 'The Diagnostic replaces the discovery phase in each offering, so offering timelines start at Analysis.',
      };
      const flags = [
        a.data === 'no' ? { type: 'risk', title: 'No billing or usage data yet', detail: 'Access requests go out on day 1. Expect the longer end of the range and extra Consultant time on data normalization.' }
          : a.data === 'partial' ? { type: 'warn', title: 'Data gaps', detail: 'Normalizing partial exports takes the first week. Request missing accounts and subscriptions up front.' }
          : { type: 'ok', title: 'Data ready', detail: 'Consumption profile and commercial baseline can start immediately.' },
        nc >= 2 ? { type: 'warn', title: 'Multi-cloud estate', detail: 'Toolsets, tagging schemas and billing models do not translate 1:1. Allow time to normalize across providers.' }
          : { type: 'ok', title: 'Single cloud', detail: 'One billing model to validate.' },
        a.stake === 'yes' ? { type: 'ok', title: 'Stakeholders confirmed', detail: 'Workshops with IT, Finance and Procurement can be booked in week 1.' }
          : { type: 'warn', title: 'Stakeholders not confirmed', detail: 'Map IT, Finance and Procurement owners before kick-off to hold the timeline.' },
      ];
      const next = [
        ['rapid-cost-optimization', 'Default next step: quick cash release and the deal lever.'],
        t >= 2 ? ['technical-optimization', 'Spend is large enough for engineering-led run-rate savings.'] : null,
        a.finops !== 'mature' ? ['spend-governance', `FinOps control is ${a.finops}; lock savings in with governance.`] : null,
        nc >= 2 ? ['commercial-migration', 'Multi-cloud estate: size the commercial and migration leverage.'] : null,
        ['margin-transformation', 'SaaS clients: unit economics and product margin.'],
      ].filter(Boolean);
      const last = Math.ceil(hi);
      return {
        duration: [lo, hi], durationUnit: 'weeks', team, tables: [outputs], flags,
        kpis: [{ label: 'Offerings to Size Next', value: String(next.length), sub: 'See positioning and sequencing below' }],
        summary: `${SPEND_LABEL[a.spend]} spend · ${a.providers.map(p => PROV_LABEL[p]).join(', ')} · ${a.finops} FinOps control`,
        teamSub: `0.5 Principal minimum; up to ${fmtFTE(P.maxFTE)} FTE`,
        teamNote: `Diagnostic team: ${fmtFTE(baseFTE)} base plus ${fmtFTE(add)} for complexity${baseFTE + add > P.maxFTE ? `, capped at ${fmtFTE(P.maxFTE)}` : ''}.`,
        split: [
          ['Proxima', 'Workshops, data validation, consumption and commercial baseline, recommendation', `${fmtFTE(sumTeam(team))} FTE`],
          ['Client IT / cloud', 'Billing exports, usage data, architecture walkthrough', '0.25–0.5 FTE'],
          ['Client finance / procurement', 'Contracts, commitments, renewal dates', '0.1 FTE'],
        ],
        splitNote: 'A short, Proxima-led engagement. Client effort is mostly data access and workshop time.',
        phases: [
          ['1. Kick-off and data request', 'Week 1', 'Stakeholder workshops; billing, usage and contract data requested', 100],
          ['2. Validate and profile', `Weeks 1–${Math.max(2, last - 1)}`, 'Normalize billing data; consumption profile, storage pools, growth and commercial baseline', 100],
          ['3. Read-out', `Week ${Math.max(2, last)}`, 'Quick-win shortlist, sized opportunity and recommended offering path', 60],
        ],
        positioning: 'Always first. The offerings depend on a validated consumption profile and billing data, so the Diagnostic resolves data quality up front and each offering starts at Analysis.',
        next,
      };
    },
  });
})();
