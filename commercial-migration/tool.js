// Offering 5: Commercial Migration (3–6 months, scope dependent, migration plans)
(function () {
  const { F, T, SPEND_LABEL, PROV_LABEL, base, oppTable, commercialOpp, r1, fmtM, SPEND_MID, fmtFTE, sumTeam } = PX;
  const SCOPE_LABEL = { eval: 'Evaluating only', partial: '<30% of workloads', major: '30–60% of workloads', full: '60%+ or full replatform' };

  PX.register({
    slug: 'commercial-migration', num: 5, name: 'Commercial Migration', months: '3–6 months, scope dependent', fit: 'Migration plans',
    intro: 'Size the commercial opportunity around a migration: enterprise deal and PPA renegotiation, commitment and licensing optimization, evaluation of alternative providers, and cost-aware platform design.',
    method: 'Renegotiation uses the AWS / Azure / GCP planner discount bands against the current discount, with leverage points for a credible migration. The target-provider line is an indicative premium; design savings apply to the migrating share only.',

    params: {
      team: [T(0, 0.25, 1, 0, 0.5), T(0, 0.5, 1, 1, 0), T(0, 0.5, 1, 1, 1), T(0, 1, 1, 1, 1), T(0.1, 1, 2, 2, 1)],
      scope: {
        eval: { migratingPct: 5, lowMonths: 3, highMonths: 4 },
        partial: { migratingPct: 20, lowMonths: 3, highMonths: 5 },
        major: { migratingPct: 45, lowMonths: 4, highMonths: 6 },
        full: { migratingPct: 75, lowMonths: 5, highMonths: 7 },
      },
      clientEngByScope: { eval: [0.25, 0.5], partial: [1, 3], major: [3, 8], full: [6, 15] },
      clientEngTierFactor: [0.3, 0.6, 1, 1.5, 2.5],
      certaintyBoost: { exploring: 3, planned: 5, committed: 8 },
      multiTargetBoost: 2,
      targetPremium: [1, 4],
      targetCertaintyFactor: { exploring: 0.5, planned: 1, committed: 1.5 },
      commitFactor: { none: 1.3, partial: 1, full: 0.4 },
      licensingFactor: { low: 0.6, some: 1, heavy: 1.5 },
      commitLicensingLever: [2, 5],
      designAppetite: { high: 1, moderate: 0.7, low: 0.4 },
      designLever: [3, 8],
    },
    paramMeta: {
      team: { title: 'Proxima team at peak (FTE) by spend tier' },
      scope: { title: 'Migration scope', note: 'Share of spend migrating, and duration in months (low, high). Labels: eval = evaluating only, partial < 30% of workloads, major 30–60%, full 60%+.' },
      clientEngByScope: { title: 'Client engineering FTE during planning (low – high) by scope' },
      clientEngTierFactor: { title: 'Client engineering multiplier by spend tier' },
      certaintyBoost: { title: 'Leverage points by migration certainty', note: 'Added to the discount band as in the negotiation planners (multi-cloud and evaluating boosts).' },
      multiTargetBoost: { title: 'Extra leverage points for two or more target providers' },
      targetPremium: { title: 'Target-provider terms premium (% of migrating spend, low – high)', note: 'Indicative competitive-tension premium; not a stacked discount band.' },
      targetCertaintyFactor: { title: 'Target premium multiplier by certainty' },
      commitFactor: { title: 'Commitment coverage multiplier' },
      licensingFactor: { title: 'Licensing exposure multiplier' },
      commitLicensingLever: { title: 'Commitment and licensing lever (% of retained spend, low – high)' },
      designAppetite: { title: 'Appetite for redesign: multiplier' },
      designLever: { title: 'Cost-aware design lever (% of migrating spend, low – high)' },
    },
    sample: {
      name: 'Sample Client', spend: '20-50m', providers: ['aws'], scope: 'partial', certainty: 'planned', targets: ['gcp'], appetite: 'moderate',
      commit: 'partial', disc: 'moderate', renewal: '6-18', licensing: 'some', stake: 'yes',
    },

    steps: [
      { title: 'Client Profile', fields: [F.name(), F.spend(), F.providers('Providers today')] },
      { title: 'Migration Plans', fields: [
        { id: 'scope', type: 'radio', label: 'Migration scope (share of workloads moving)', options: Object.entries(SCOPE_LABEL).map(([k, v]) => [k, v, k === 'eval' ? 'No decision yet' : '']) },
        { id: 'certainty', type: 'radio', label: 'How certain is the migration?', options: [
          ['exploring', 'Exploring', 'No commitment; a credible option'], ['planned', 'Planned', 'Business case approved, plan in progress'], ['committed', 'Committed', 'Funded and under way']] },
        { id: 'targets', type: 'check', label: 'Target or alternative providers', hint: 'select all that apply', options: [
          ['aws', 'AWS', '', 'var(--aws)'], ['azure', 'Azure', '', 'var(--azure)'], ['gcp', 'GCP', '', 'var(--gcp)'], ['other', 'Neocloud / other', 'Specialist and regional clouds', 'var(--text)']] },
        { id: 'appetite', type: 'radio', label: 'Appetite for cost-aware redesign during migration', options: [
          ['high', 'High', 'Re-architect to cloud-native patterns'], ['moderate', 'Moderate', 'Selective modernization'], ['low', 'Low', 'Lift-and-shift']] },
      ] },
      { title: 'Commercial Position', fields: [F.commit(), F.disc(), F.renewal(),
        { id: 'licensing', type: 'radio', label: 'Licensing exposure (Windows, SQL, Oracle, marketplace)', options: [
          ['low', 'Low', 'Mostly open-source and native services'], ['some', 'Some', 'Meaningful licensed workloads'], ['heavy', 'Heavy', 'Large licensed estate; BYOL and marketplace']] },
        F.stake(),
      ] },
    ],

    calc(a, P) {
      const t = PX.TIER_IDX[a.spend], sc = P.scope[a.scope], share = sc.migratingPct / 100, nt = a.targets.length;
      // Duration (months): scope dependent
      let lo = sc.lowMonths, hi = sc.highMonths;
      if (nt >= 2) { lo += 0.5; hi += 1; }
      if (a.stake === 'no') hi += 0.5;
      hi = Math.min(hi, 7.5);

      // Opportunity (% of total annual spend)
      const boost = P.certaintyBoost[a.certainty] + (nt >= 2 ? P.multiTargetBoost : 0);
      const reneg = commercialOpp(a.spend, a.providers, a.disc, boost, a.renewal);
      // Moving provider does not stack a second full discount band; the target line is the competitive-tension premium
      // (new-deal incentives and terms) on the migrating spend, scaled by how credible the move is.
      const tgtF = P.targetCertaintyFactor[a.certainty];
      const cl = P.commitFactor[a.commit] * P.licensingFactor[a.licensing] * (1 - share), dF = P.designAppetite[a.appetite];
      const rows = [
        ['Renegotiate current provider (EA / PPA)', `Planner band ${reneg.targetLo}–${reneg.targetHi}% vs. current ~${reneg.cur}%, on retained ${Math.round((1 - share) * 100)}% of spend`, r1(reneg.lo * (1 - share)), r1(reneg.hi * (1 - share))],
        ['Target-provider terms and incentives', `Competitive-tension premium (${a.targets.map(p => PROV_LABEL[p]).join(', ')}) on migrating ${Math.round(share * 100)}% of spend`, r1(P.targetPremium[0] * tgtF * share), r1(P.targetPremium[1] * tgtF * share)],
        ['Commitment coverage and licensing optimization', `Commitments ${a.commit}, licensing ${a.licensing}`, r1(P.commitLicensingLever[0] * cl), r1(P.commitLicensingLever[1] * cl)],
        ['Cost-aware design on migrated workloads', `Appetite ${a.appetite}, on migrating spend`, r1(P.designLever[0] * dF * share), r1(P.designLever[1] * dF * share)],
      ];
      const opp = oppTable('Opportunity by Workstream', rows, a.spend,
        'Target-provider line is an indicative premium, not a stacked discount band. One-off migration costs (engineering, dual running, data transfer) are not netted off; they sit with the client. Provider incentive and migration funding programs may add to this and are not included.');

      const team = base(P.team, a.spend);
      const ce = P.clientEngByScope[a.scope].map(v => v * P.clientEngTierFactor[t]);
      const flags = [
        PX.highFlag(opp.phi),
        a.certainty === 'exploring' ? { type: 'warn', title: 'Migration is not yet credible leverage', detail: 'Leverage points are lowest when the move is only being explored. A funded plan strengthens the negotiating position.' }
          : { type: 'ok', title: 'Credible migration', detail: 'A funded or planned migration adds leverage in the renegotiation.' },
        a.renewal === 'under6' ? { type: 'ok', title: 'Renewal window open', detail: 'Negotiate now. Align commitment ramp-down to the migration timetable.' }
          : a.renewal === '18plus' ? { type: 'warn', title: 'Not in a renewal window', detail: 'Renegotiation leverage is discounted. Avoid extending or over-committing the current provider.' }
          : { type: 'ok', title: 'Renewal timing workable', detail: 'Sequence the migration plan ahead of the renewal.' },
        a.commit === 'full' ? { type: 'risk', title: 'Commitment shortfall risk', detail: 'Existing commitments may be stranded as workloads leave. Negotiate flexibility or a glide path before moving.' }
          : { type: 'ok', title: 'Limited stranded-commitment risk', detail: 'Keep new commitments below the post-migration baseline.' },
        a.targets.includes('other') ? { type: 'warn', title: 'Neocloud evaluation', detail: 'No planner band for specialist clouds. Terms are bespoke, so treat the target-provider line as indicative.' } : { type: 'ok', title: 'Hyperscaler targets', detail: 'Target-provider terms follow the hyperscaler planner guidance.' },
      ].filter(Boolean);
      const kpis = [
        { label: 'Annual Opportunity', value: `${fmtM(opp.dlo)} – ${fmtM(opp.dhi)}`, color: 'var(--green)', sub: `${r1(opp.plo)}–${r1(opp.phi)}% of ${SPEND_LABEL[a.spend]} spend` },
        { label: 'Migrating Spend', value: `~${fmtM(SPEND_MID[a.spend] * share)}`, sub: SCOPE_LABEL[a.scope] },
      ];
      return {
        duration: [lo, hi], team, tables: [opp.table], flags, kpis,
        summary: `${SPEND_LABEL[a.spend]} spend · today ${a.providers.map(p => PROV_LABEL[p]).join(', ')} · ${SCOPE_LABEL[a.scope].toLowerCase()}`,
        teamSub: 'Principal Consultant typically at 0.5',
        split: [
          ['Proxima', 'Deal and PPA renegotiation, provider evaluation, commitment and licensing strategy', `${fmtFTE(sumTeam(team))} FTE peak`],
          ['Client engineering', 'Migration planning, workload assessment, cost-aware design', `${fmtFTE(ce[0])}–${fmtFTE(ce[1])} FTE during planning`],
          ['Client procurement / legal', 'Contract access, negotiation sign-off', '0.1–0.25 FTE'],
        ],
        phases: [
          ['1. Baseline and options', 'Month 1', 'Spend baseline, migration scope, provider options', 100],
          ['2. Provider evaluation', 'Months 1–3', 'Commercial evaluation of alternative providers', 85],
          ['3. Negotiation', `Months ${a.renewal === 'under6' ? '2–4' : '3–5'}`, 'Renegotiate current provider, secure target terms and ramp', 80],
          ['4. Design and handover', 'Final weeks', 'Cost-aware design principles and migration commercial plan', 40],
        ],
        positioning: 'Standalone for clients with migration plans. Run it ahead of the migration so the commercial terms are in place before workloads move.',
        next: [
          ['technical-optimization', 'Right-size before you commit and before you migrate.'],
          ['rapid-cost-optimization', 'Clear waste first so the baseline you negotiate against is lean.'],
          ['spend-governance', 'Carry allocation and forecasting across into the new estate.'],
        ],
      };
    },
  });
})();
