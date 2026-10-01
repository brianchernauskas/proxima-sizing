// Offering 2: Technical Optimization (3–4 months, client engineering partnership)
(function () {
  const { F, T, SPEND_LABEL, PROV_LABEL, base, oppTable, r1, fmtM, fmtFTE, sumTeam } = PX;

  // Workload families: label and typical levers (text only; the numbers live in params.families)
  const FAMILIES = {
    compute: ['Compute', 'Right-size, schedule, newer generations, spot'],
    containers: ['Kubernetes / containers', 'Node right-sizing, bin-packing, autoscaling'],
    storage: ['Storage', 'Tier, expire, de-duplicate'],
    dataai: ['AI / data platform', 'Cluster tuning, GPU utilisation, job scheduling'],
    network: ['Networking', 'Egress, NAT and transit tuning, endpoints'],
  };

  PX.register({
    slug: 'technical-optimization', num: 2, name: 'Technical Optimization', months: '3–4 months', fit: 'Client engineering partnership',
    intro: 'Size the engineering-led opportunity: compute, Kubernetes and storage optimization, AI/data platform and networking tuning, and cost-aware design. Durable run-rate savings delivered with client engineering teams.',
    method: 'Savings use an assumed spend mix by workload family (renormalised across those selected), scaled by FinOps maturity. Structural savings are discounted by engineering capacity and appetite for modernization.',

    params: {
      duration: [3, 4],
      team: [T(0, 0, 1, 0, 0.5), T(0, 0.5, 1, 1, 0), T(0, 0.5, 1, 1, 1), T(0, 0.5, 2, 1, 1), T(0.1, 1, 2, 2, 1)],
      specialist: [0.25, 0.5, 1, 1, 1.5],
      clientEng: [[0.5, 1], [1, 2], [2, 4], [3, 6], [4, 8]],
      families: {
        compute: { spendShare: 40, low: 8, high: 20 },
        containers: { spendShare: 15, low: 8, high: 18 },
        storage: { spendShare: 10, low: 5, high: 15 },
        dataai: { spendShare: 25, low: 5, high: 20 },
        network: { spendShare: 10, low: 3, high: 10 },
      },
      quickWinShare: 0.55,
      architecture: { modern: 0.7, mixed: 1, legacy: 1.25 },
      capacity: { team: 1, limited: 0.8, none: 0.6 },
      appetite: { high: 1, moderate: 0.7, low: 0.4 },
      cleanup: [1.5, 3.5],
    },
    paramMeta: {
      duration: { title: 'Base duration (months, low – high)' },
      team: { title: 'Proxima team at peak (FTE) by spend tier' },
      specialist: { title: 'Specialist technical architect FTE by spend tier' },
      clientEng: { title: 'Client engineering FTE during execution (low – high) by spend tier' },
      families: { title: 'Workload families', note: 'Assumed share of spend (renormalised to the families selected) and savings range as % of that family\'s spend.' },
      quickWinShare: { title: 'Quick-win share of each family range', note: 'The rest is structural (design and modernization) and is scaled by capacity and appetite.' },
      architecture: { title: 'Architecture maturity multiplier', note: 'Lift-and-shift estates have more to capture.' },
      capacity: { title: 'Client engineering capacity: structural realisation' },
      appetite: { title: 'Appetite for modernization: structural realisation' },
      cleanup: { title: 'Unused-resource cleanup if not yet captured (% of spend, low – high)' },
    },
    sample: {
      name: 'Sample Client', spend: '20-50m', providers: ['aws', 'azure'], finops: 'partial',
      families: ['compute', 'containers', 'storage', 'dataai'], arch: 'mixed', telemetry: 'partial', quickwins: 'yes',
      capacity: 'limited', appetite: 'moderate', stake: 'yes',
    },

    steps: [
      { title: 'Client Profile', fields: [F.name(), F.spend(), F.providers(), F.finops()] },
      { title: 'Technical Estate', fields: [
        { id: 'families', type: 'check', label: 'Workload families in scope', hint: 'select all that apply', options: Object.entries(FAMILIES).map(([k, w]) => [k, w[0], w[1]]) },
        { id: 'arch', type: 'radio', label: 'Architecture maturity', options: [
          ['modern', 'Cloud-native', 'Autoscaling, containers and managed services'], ['mixed', 'Mixed', 'Partly modernised'], ['legacy', 'Lift-and-shift', 'Largely VM-based, sized for peak']] },
        { id: 'telemetry', type: 'radio', label: 'Utilization telemetry', options: [
          ['full', 'Full monitoring', 'CPU, memory and storage metrics fleet-wide'], ['partial', 'Partial', 'Some workloads instrumented'], ['none', 'Little or none', 'Must be enabled first']] },
        { id: 'quickwins', type: 'radio', label: 'Quick wins already captured?', options: [
          ['yes', 'Yes', 'Unused resources and non-prod already cleaned up'], ['no', 'No', 'Cleanup still to do (consider Rapid Cost Optimization first)']] },
      ] },
      { title: 'Delivery Capacity', intro: 'Proxima partners with client engineering to deliver the technical work. Capacity here sets how much is realised.', fields: [
        { id: 'capacity', type: 'radio', label: 'Client engineering capacity', options: [
          ['team', 'Dedicated', 'Named engineers with time allocated'], ['limited', 'Limited', 'Competes with roadmap work'], ['none', 'None', 'Recommendations only']] },
        { id: 'appetite', type: 'radio', label: 'Appetite for platform modernization', options: [
          ['high', 'High', 'Sponsor supports structural change'], ['moderate', 'Moderate', 'Selective, case by case'], ['low', 'Low', 'Quick wins only']] },
        F.stake(),
      ] },
    ],

    calc(a, P) {
      const t = PX.TIER_IDX[a.spend], fm = P.shared.finopsFactor[a.finops], nf = a.families.length, np = a.providers.length;
      // Duration (months)
      let [lo, hi] = P.duration;
      if (nf >= 4) { lo += 0.5; hi += 1; } else if (nf >= 3) hi += 0.5;
      if (np >= 2) hi += 0.5;
      if (a.telemetry === 'partial') { lo += 0.5; hi += 0.5; } if (a.telemetry === 'none') { lo += 1; hi += 1; }
      if (a.capacity === 'none') hi += 1; else if (a.capacity === 'limited') hi += 0.5;
      hi = Math.min(hi, 6);

      // Opportunity
      const Q = P.quickWinShare;
      const total = a.families.reduce((s, k) => s + P.families[k].spendShare, 0);
      const arch = P.architecture[a.arch];
      const structural = P.capacity[a.capacity] * P.appetite[a.appetite];
      const rows = a.families.map(k => {
        const w = P.families[k], share = w.spendShare / total; // share of the in-scope spend
        const realised = Q + (1 - Q) * structural;
        return [FAMILIES[k][0], `${w.low}–${w.high}% of ~${Math.round(share * 100)}% of spend`, r1(w.low * fm * arch * realised * share), r1(w.high * fm * arch * realised * share)];
      });
      if (a.quickwins === 'no') rows.push(['Unused resource cleanup', 'Not yet captured', r1(P.cleanup[0] * fm), r1(P.cleanup[1] * fm)]);
      const opp = oppTable('Opportunity by Workload Family', rows, a.spend,
        `Spend mix is an assumption (renormalised to the families selected); replace it with the client's actual split. Structural savings realised: ${Math.round(structural * 100)}%.`);

      const team = base(P.team, a.spend);
      const ce = P.clientEng[t], capF = { team: 1, limited: 0.7, none: 0 }[a.capacity];
      const needsSpecialist = a.families.includes('dataai') || a.families.includes('containers');
      const flags = [
        needsSpecialist ? { type: 'warn', title: 'Specialist technical capability likely required', detail: 'AI/data and Kubernetes work needs deeper technical skill than the core team. Decide whether Proxima plays here or partners (see delivery split).' }
          : { type: 'ok', title: 'Within core capability', detail: 'Compute, storage and networking tuning can be led by the core team with client engineers.' },
        a.capacity === 'none' ? { type: 'risk', title: 'No client engineering capacity', detail: 'Findings will not be implemented. Structural savings are cut sharply; secure capacity before kick-off.' }
          : a.capacity === 'limited' ? { type: 'warn', title: 'Limited engineering capacity', detail: 'Agree a capacity commitment with the sponsor and prioritise by payback.' }
          : { type: 'ok', title: 'Engineers allocated', detail: 'Recommendations can move straight into the delivery backlog.' },
        a.telemetry === 'none' ? { type: 'risk', title: 'No utilization telemetry', detail: 'Adds about 1 month to enable monitoring and gather a representative window.' }
          : a.telemetry === 'partial' ? { type: 'warn', title: 'Telemetry gaps', detail: 'Instrument the largest workloads first and report uncovered spend separately.' }
          : { type: 'ok', title: 'Telemetry available', detail: 'Fleet-level utilization analysis can begin immediately.' },
        a.quickwins === 'no' ? { type: 'warn', title: 'Basic cleanup not yet done', detail: 'Run Rapid Cost Optimization first or alongside; it is the fastest payback and clears noise from the data.' }
          : { type: 'ok', title: 'Quick wins captured', detail: 'The remaining opportunity is engineering-led.' },
      ];
      return {
        duration: [lo, hi], team, tables: [opp.table], flags,
        kpis: [
          { label: 'Annual Opportunity', value: `${fmtM(opp.dlo)} – ${fmtM(opp.dhi)}`, color: 'var(--green)', sub: `${r1(opp.plo)}–${r1(opp.phi)}% of ${SPEND_LABEL[a.spend]} spend` },
          { label: 'Structural Realised', value: `${Math.round(structural * 100)}%`, sub: 'Capacity and appetite for modernization' },
        ],
        summary: `${SPEND_LABEL[a.spend]} spend · ${a.providers.map(p => PROV_LABEL[p]).join(', ')} · ${nf} workload famil${nf > 1 ? 'ies' : 'y'}`,
        teamSub: 'Excludes specialist and client engineers',
        split: [
          ['Proxima', 'Opportunity validation, prioritisation, savings tracking, commercial alignment of changes', `${fmtFTE(sumTeam(team))} FTE peak`],
          ['Specialist / partner (technical)', needsSpecialist ? 'Architecture review for Kubernetes and AI/data platforms' : 'Architecture review as needed', `${fmtFTE(P.specialist[t])} FTE`],
          ['Client engineering', 'Implement rightsizing, platform and design changes', `${fmtFTE(ce[0] * capF)}–${fmtFTE(ce[1] * capF)} FTE during execution`],
        ],
        splitNote: 'The technical work is delivered by client engineering teams. Proxima leads prioritisation and value tracking; where specialist depth is needed, decide whether to resource it or partner.',
        phases: [
          ['1. Telemetry and baseline', 'Month 1', 'Utilization baseline by workload family', 100],
          ['2. Opportunity design', 'Months 1–2', 'Rightsizing, platform and networking recommendations', 90],
          ['3. Engineering execution', 'Months 2–4', 'Client engineers implement, Proxima tracks value', 55],
          ['4. Run-rate lock-in', 'Final weeks', 'Cost-aware design standards and handover', 35],
        ],
        positioning: 'Follows or runs alongside Rapid Cost Optimization. Delivers the durable, engineering-led run-rate savings; needs client engineering capacity.',
        next: [
          ['rapid-cost-optimization', 'Capture the quick wins and the deal lever first.'],
          a.finops !== 'mature' ? ['spend-governance', 'Hold the engineering savings in place with allocation and forecasting.'] : null,
          ['commercial-migration', 'Right-size before committing: renegotiate against the reduced baseline.'],
        ].filter(Boolean),
      };
    },
  });
})();
