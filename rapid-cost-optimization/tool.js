// Offering 1: Rapid Cost Optimization (2–3 months, any cloud client)
(function () {
  const { F, FINOPS_FACTOR, SPEND_LABEL, PROV_LABEL, base, scaleTeam, oppTable, commercialOpp, r1, fmtM, SPEND_MID } = PX;

  // Proxima team at peak by spend tier [under5m, 5-20m, 20-50m, 50-100m, 100mplus]
  const TEAM = [
    { pc: 0.25, sc: 1, ac: 0.5 }, { pc: 0.5, sc: 1, c: 1 }, { pc: 0.5, sc: 1, c: 1, ac: 1 },
    { pc: 1, sc: 1, c: 1, ac: 1 }, { vp: 0.1, pc: 1, sc: 2, c: 1, ac: 1 },
  ];
  // Client engineering FTE during execution [lo, hi]
  const CLIENT_ENG = [[0.25, 0.5], [0.5, 1], [1, 2], [1.5, 3], [2, 4]];
  const NONPROD = { low: [0.5, 1.5], med: [1.5, 3], high: [3, 5] };
  const LICENSING = { low: [0.2, 0.8], some: [0.8, 2], heavy: [2, 4] };

  PX.register({
    slug: 'rapid-cost-optimization', num: 1, name: 'Rapid Cost Optimization', months: '2–3 months', fit: 'Any cloud client',
    intro: 'Size the quick-release cost opportunity: one-time forecast, deal negotiation, unused-resource and licensing cleanup, non-prod rightsizing and storage lifecycle wins. Rapid payback, high ROI.',
    method: 'Commercial lever uses the AWS / Azure / GCP planner discount bands against the current discount. Cleanup levers are planning heuristics (% of spend) scaled by non-prod share, licensing exposure and FinOps maturity.',
    steps: [
      { title: 'Client Profile', fields: [F.name(), F.spend(), F.providers(), F.finops()] },
      { title: 'Cleanup Levers', intro: 'These drive the technical quick wins and the timeline.', fields: [
        { id: 'nonprod', type: 'radio', label: 'Non-production share of cloud spend', options: [
          ['low', 'Under 20%', 'Dev/test is a small part of the estate'], ['med', '20–40%', 'Typical for active engineering teams'], ['high', 'Over 40%', 'Large dev/test, always-on environments']] },
        { id: 'licensing', type: 'radio', label: 'Licensing exposure (Windows, SQL, marketplace, BYOL)', options: [
          ['low', 'Low', 'Mostly open-source and native services'], ['some', 'Some', 'Meaningful licensed workloads'], ['heavy', 'Heavy', 'Large licensed estate; BYOL and marketplace in play']] },
        F.data(), F.stake(),
      ] },
      { title: 'Commercial Position', intro: 'Sets the size of the deal negotiation lever.', fields: [F.commit(), F.disc(), F.renewal(),
        { id: 'leverage', type: 'radio', label: 'Competitive leverage', options: [
          ['single', 'Single cloud', 'No credible alternative'], ['eval', 'Evaluating alternatives', 'Active comparison under way'], ['multi', 'Multi-cloud', 'Meaningful spend with more than one provider']] },
      ] },
    ],
    calc(a) {
      const t = PX.TIER_IDX[a.spend], np = a.providers.length, fm = FINOPS_FACTOR[a.finops];
      // Duration (months)
      let lo = 2, hi = 3;
      if (np >= 2) hi += 0.5;
      if (np >= 3) { lo += 0.5; hi += 0.5; }
      if (a.data === 'partial') hi += 0.5; if (a.data === 'no') { lo += 0.5; hi += 1; }
      if (a.stake === 'no') { lo += 0.5; hi += 0.5; }
      hi = Math.min(hi, 4.5);

      // Opportunity (% of annual spend)
      const boost = { single: 0, eval: 5, multi: 8 }[a.leverage];
      // No commitments in place means more coverage headroom to negotiate; full coverage means less.
      const com = commercialOpp(a.spend, a.providers, a.disc, boost + (a.commit === 'none' ? 2 : a.commit === 'full' ? -2 : 0), a.renewal);
      const np_ = NONPROD[a.nonprod], lic = LICENSING[a.licensing];
      const OVERLAP = 0.9; // cleanup levers overlap; haircut the technical total
      const tech = [
        ['Unused and idle resource cleanup', 'Idle, orphaned and unattached resources', 2 * fm, 5 * fm],
        ['Non-prod rightsizing and shutdown', `Non-prod share ${{ low: '<20%', med: '20–40%', high: '>40%' }[a.nonprod]}`, np_[0] * fm, np_[1] * fm],
        ['Quick-win storage tiering and lifecycle', 'Lifecycle policies, tier moves', 0.5 * fm, 2 * fm],
        ['Licensing cleanup', `Exposure: ${a.licensing}`, lic[0], lic[1]],
      ].map(r => [r[0], r[1], r1(r[2] * OVERLAP), r1(r[3] * OVERLAP)]);
      const rows = tech.concat([[
        'Deal negotiation',
        `Planner band ${com.targetLo}–${com.targetHi}% vs. current ~${com.cur}%`, com.lo, com.hi]]);
      const opp = oppTable('Opportunity by Workstream', rows, a.spend,
        'Cleanup levers carry a 10% overlap haircut. Deal negotiation is incremental savings moving from the current discount to the planner band, scaled by renewal timing. The one-time forecast is an enabler, not a saving.');

      // Team and delivery split
      const team = base(TEAM, a.spend);
      const ce = CLIENT_ENG[t];
      const kpis = [
        { label: 'Annual Opportunity', value: `${fmtM(opp.dlo)} – ${fmtM(opp.dhi)}`, color: 'var(--green)', sub: `${r1(opp.plo)}–${r1(opp.phi)}% of ${SPEND_LABEL[a.spend]} spend` },
        { label: 'Commercial Share', value: `${fmtM(SPEND_MID[a.spend] * com.lo / 100)} – ${fmtM(SPEND_MID[a.spend] * com.hi / 100)}`, sub: 'Deal negotiation line only' },
      ];
      const flags = [
        PX.highFlag(opp.phi),
        a.renewal === 'under6' ? { type: 'ok', title: 'Negotiation window open', detail: 'Renewal within 6 months. Start the deal workstream in month 1.' }
          : a.renewal === '18plus' ? { type: 'warn', title: 'Not in a negotiation window', detail: 'Commercial lever is discounted by half. Lead with cleanup and prepare for the renewal.' }
          : { type: 'ok', title: 'Renewal timing workable', detail: 'Sequence cleanup first, then build leverage ahead of the window.' },
        a.nonprod === 'high' ? { type: 'ok', title: 'Large non-prod footprint', detail: 'Scheduled shutdown is the fastest payback in this estate.' } : { type: 'ok', title: 'Quick wins identified', detail: 'Unused resources and storage lifecycle are available in any estate.' },
        a.data === 'no' ? { type: 'risk', title: 'No billing data access', detail: 'Adds up to 1 month. The one-time forecast and cleanup both depend on cost exports.' }
          : a.data === 'partial' ? { type: 'warn', title: 'Data gaps', detail: 'Request exports in week 1 to protect the 2–3 month timeline.' }
          : { type: 'ok', title: 'Data ready', detail: 'Forecast and cleanup analysis can start immediately.' },
        a.finops === 'mature' ? { type: 'ok', title: 'Governance in place', detail: 'Savings are more likely to persist after the engagement.' }
          : { type: 'warn', title: a.finops === 'poor' ? 'Savings may not stick' : 'Governance only partial', detail: 'Without durable governance, cleanup gains erode. Pair with Spend Governance.' },
      ].filter(Boolean);
      return {
        duration: [lo, hi], team, kpis, tables: [opp.table], flags,
        summary: `${SPEND_LABEL[a.spend]} spend · ${a.providers.map(p => PROV_LABEL[p]).join(', ')} · ${a.finops} FinOps control`,
        teamSub: 'Principal Consultant typically at 0.5',
        split: [
          ['Proxima', 'Forecast, deal negotiation, opportunity validation, licensing cleanup and tracking', `${PX.fmtFTE(PX.sumTeam(team))} FTE peak`],
          ['Client engineering', 'Approve and execute cleanup, shutdown schedules and lifecycle policies', `${PX.fmtFTE(ce[0])}–${PX.fmtFTE(ce[1])} FTE during execution`],
          ['Client finance / procurement', 'Forecast inputs, contract access, negotiation sign-off', '0.1–0.25 FTE'],
        ],
        phasesTitle: 'Delivery Phasing',
        phases: [
          ['1. Baseline and forecast', 'Month 1', 'One-time forecast, spend baseline, opportunity validation', 100],
          ['2. Quick-win execution', 'Months 1–2', 'Unused resources, non-prod shutdown, storage lifecycle, licensing', 85],
          ['3. Deal negotiation', `Months ${a.renewal === 'under6' ? '1–3' : '2–3'}`, 'Commitment coverage and discount negotiation', 70],
          ['4. Capture and handover', 'Final weeks', 'Realised-savings tracking and next-step plan', 40],
        ],
        positioning: 'Standalone, any cloud client. Often the first engagement: it releases cash quickly and funds the structural work that follows.',
        next: [
          ['technical-optimization', 'Engineering-led savings that make the run-rate durable.'],
          a.finops !== 'mature' ? ['spend-governance', 'Governance is weak. Lock in the savings and stop them eroding.'] : null,
          a.leverage !== 'single' ? ['commercial-migration', 'Alternative providers are in play. Size the commercial move.'] : null,
        ].filter(Boolean),
      };
    },
  });
})();
