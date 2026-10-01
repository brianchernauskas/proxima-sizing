// Offering 4: Spend Governance (6–12 months, poor FinOps control)
(function () {
  const { F, FINOPS_FACTOR, SPEND_LABEL, PROV_LABEL, base, oppTable, r1, fmtM, SPEND_MID, fmtFTE, sumTeam } = PX;

  const TEAM = [
    { pc: 0.25, sc: 1, ac: 0.5 }, { pc: 0.5, sc: 1, c: 1 }, { pc: 0.5, sc: 1, c: 1, ac: 1 },
    { pc: 1, sc: 1, c: 1, ac: 1 }, { vp: 0.1, pc: 1, sc: 2, c: 1, ac: 1 },
  ];
  const DUR = [[6, 9], [6, 10], [7, 11], [8, 12], [9, 12]];
  const GROWTH = { flat: [1, 3], moderate: [2, 5], fast: [4, 8] };
  const FORECAST = { within5: [0, 0.5], '5-15': [0.5, 1.5], over15: [1.5, 3], none: [2, 4] };
  const UNOWNED = { good: 5, partial: 25, poor: 50 }; // % of spend with no clear owner
  // Effort curve: Proxima effort as % of peak, by phase
  const CURVE = { build: 1, embed: 0.6, handover: 0.2 };

  PX.register({
    slug: 'spend-governance', num: 4, name: 'Spend Governance', months: '6–12 months', fit: 'Poor FinOps control',
    intro: 'Size the governance opportunity: tagging and cost allocation, iterative forecasting, budget accountability and a FinOps operating model. It locks in savings and prevents cost creep, then hands over to the client.',
    method: 'Value is the annual cost creep avoided plus optimization savings locked in, scaled by growth and FinOps maturity. Effort follows a front-loaded curve: heavy in months 1–3, light after, with handover to the client.',
    steps: [
      { title: 'Client Profile', fields: [F.name(), F.spend(), F.providers(), F.finops()] },
      { title: 'Governance Today', intro: 'Forecasting is the key capability: consumption against future forecast, by SKU, across all towers.', fields: [
        { id: 'alloc', type: 'radio', label: 'Tagging and cost allocation coverage', options: [
          ['good', 'Good', 'Most spend allocated to an owner'], ['partial', 'Partial', 'Inconsistent coverage'], ['poor', 'Poor', 'Little or no allocation']] },
        { id: 'fc', type: 'radio', label: 'Forecast accuracy (actual vs. forecast)', options: [
          ['within5', 'Within 5%', 'Reliable forecast'], ['5-15', '5–15% off', 'Directionally useful'], ['over15', 'Over 15% off', 'Surprises are common'], ['none', 'No forecast', 'Spend is reviewed after the fact']] },
        { id: 'towers', type: 'radio', label: 'Business units / towers', options: [
          ['few', '1–3', 'Single point of accountability'], ['mid', '4–10', 'Several budget owners'], ['many', '10 or more', 'Complex, decentralised ownership']] },
        { id: 'growth', type: 'radio', label: 'Cloud spend growth', options: [
          ['flat', 'Flat or declining', ''], ['moderate', 'Moderate', 'Roughly 10–30% a year'], ['fast', 'Fast', 'Over 30% a year']] },
      ] },
      { title: 'Handover Readiness', fields: [
        { id: 'prior', type: 'radio', label: 'Prior optimization effort completed?', options: [
          ['yes', 'Yes', 'Savings exist that governance must protect'], ['no', 'No', 'Little to protect yet']] },
        { id: 'owner', type: 'radio', label: 'Client FinOps lead identified for handover?', options: [
          ['yes', 'Yes', 'A named owner can take over after the build'], ['no', 'No', 'Proxima will need to help set up the role']] },
        F.data(), F.stake(),
      ] },
    ],
    calc(a) {
      const t = PX.TIER_IDX[a.spend], fm = FINOPS_FACTOR[a.finops];
      // Duration (months)
      let [lo, hi] = DUR[t];
      if (a.towers === 'many') hi += 1; else if (a.towers === 'mid') lo += 0;
      if (a.alloc === 'poor') hi += 1; if (a.fc === 'none') hi += 0.5;
      if (a.data === 'no') { lo += 0.5; hi += 1; }
      if (a.finops === 'mature') { lo -= 1; hi -= 1; }
      let accel = false;
      if (a.owner === 'yes') { lo = Math.max(4, lo - 1); hi = hi - 2; accel = true; }
      hi = Math.min(Math.max(hi, lo + 1), 13); lo = Math.max(lo, 4);

      // Value (% of annual spend per year)
      const g = GROWTH[a.growth], f = FORECAST[a.fc];
      const lock = a.prior === 'yes' ? [1, 3] : [0, 1];
      const rows = [
        ['Cost creep avoided', `Growth ${a.growth}, governance ${a.finops}`, r1(g[0] * fm), r1(g[1] * fm)],
        ['Optimization savings locked in', a.prior === 'yes' ? 'Prior savings protected from regression' : 'Little prior optimization to protect', lock[0], lock[1]],
        ['Unplanned overspend avoided', `Forecast accuracy: ${{ within5: 'within 5%', '5-15': '5–15% off', over15: 'over 15% off', none: 'no forecast' }[a.fc]}`, f[0], f[1]],
      ];
      const opp = oppTable('Annual Value by Lever (Recurring)', rows, a.spend,
        'Recurring annual value, not a one-time saving. Cost creep is the avoided drift in an ungoverned estate; it grows with spend growth and shrinks as governance matures.');

      const team = base(TEAM, a.spend);
      const mid = (lo + hi) / 2;
      // Average Proxima FTE over the engagement under the effort curve (3 build, 3 embed, rest handover months)
      const months = Math.max(1, Math.round(mid));
      let eff = 0;
      for (let m = 1; m <= months; m++) eff += m <= 3 ? CURVE.build : m <= 6 ? CURVE.embed : CURVE.handover;
      const avg = sumTeam(team) * eff / months;
      const unowned = SPEND_MID[a.spend] * UNOWNED[a.alloc] / 100;

      const flags = [
        a.alloc === 'poor' ? { type: 'risk', title: 'Little cost allocation', detail: 'Roughly half of spend has no clear owner. Allocation methodology is the first deliverable and adds a month.' }
          : a.alloc === 'partial' ? { type: 'warn', title: 'Allocation partial', detail: 'Standardise the tagging policy and report unallocated spend separately.' }
          : { type: 'ok', title: 'Allocation in good shape', detail: 'Move quickly to forecasting and accountability.' },
        a.fc === 'none' || a.fc === 'over15' ? { type: 'warn', title: 'Forecasting is the priority', detail: 'Build forecasting across all towers: consumption against future forecast, by SKU. This is the foundation for budgets and accountability.' }
          : { type: 'ok', title: 'Forecast reliable', detail: 'Focus on accountability and operating cadence.' },
        a.owner === 'no' ? { type: 'warn', title: 'No client FinOps lead', detail: 'Handover needs a named owner. Appointing one by month 3 keeps the engagement near the lower end of the range.' }
          : { type: 'ok', title: 'Handover owner identified', detail: 'An accelerated model is possible: Proxima builds in months 1–4, then the client runs it.' },
        a.towers === 'many' ? { type: 'warn', title: 'Decentralised ownership', detail: 'Many budget owners lengthen alignment. Plan a tower-by-tower rollout.' } : { type: 'ok', title: 'Manageable ownership', detail: 'Accountability can be set with a small number of owners.' },
      ];
      return {
        duration: [lo, hi], team, tables: [opp.table], flags,
        kpis: [
          { label: 'Annual Value (Recurring)', value: `${fmtM(opp.dlo)} – ${fmtM(opp.dhi)}`, color: 'var(--green)', sub: `${r1(opp.plo)}–${r1(opp.phi)}% of ${SPEND_LABEL[a.spend]} spend` },
          { label: 'Spend Without an Owner', value: `~${fmtM(unowned)}`, sub: `About ${UNOWNED[a.alloc]}% of spend, estimated` },
          { label: 'Avg Proxima FTE', value: fmtFTE(Math.round(avg * 100) / 100), sub: 'Over the engagement, after the build phase' },
        ],
        summary: `${SPEND_LABEL[a.spend]} spend · ${a.providers.map(p => PROV_LABEL[p]).join(', ')} · ${a.finops} FinOps control · ${a.towers === 'few' ? '1–3' : a.towers === 'mid' ? '4–10' : '10+'} towers`,
        teamSub: 'Peak team; effort falls after month 3',
        split: [
          ['Proxima', 'Allocation methodology, forecasting model, budget accountability, KPIs, operating model design', `${fmtFTE(sumTeam(team))} FTE peak, ~${fmtFTE(Math.round(avg * 100) / 100)} average`],
          ['Client FinOps lead', 'Owns the operating cadence after handover', '0.5–1 FTE'],
          ['Tower / BU owners', 'Budgets, forecast inputs and accountability', '0.05–0.1 FTE each'],
          ['Client finance', 'Budget cycle and variance reporting', '0.1–0.25 FTE'],
        ],
        phasesTitle: 'Effort Curve: Front-loaded, Then Handover',
        phases: [
          ['1. Build', 'Months 1–3', 'Allocation methodology, tagging policy, forecast model across towers (consumption vs. forecast by SKU)', 100],
          ['2. Embed', 'Months 4–6', 'Iterative forecasting, budget accountability, FinOps KPIs', 60],
          ['3. Hand over', `Months 7–${Math.round(hi)}`, 'Client runs the cadence; Proxima light-touch reviews', 20],
        ],
        phasesNote: accel
          ? 'Accelerated model: with a client FinOps lead identified, Proxima builds in the first months and hands over earlier, shortening the range shown.'
          : 'Where the client can appoint a FinOps lead early, Proxima timescales can be quicker with an earlier handover. Answer the handover question above to see the accelerated range.',
        positioning: 'Standalone or sequenced after cost optimization. Governance holds the savings in place; without it, optimization gains erode within a year.',
        next: [
          ['rapid-cost-optimization', 'Release cash quickly while governance is built.'],
          ['technical-optimization', 'Engineering savings that governance then protects.'],
          ['margin-transformation', 'SaaS clients: build product-level cost models on the new allocation.'],
        ],
      };
    },
  });
})();
