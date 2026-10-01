// Offering 2: Technical Optimization (3–4 months, client engineering partnership)
(function () {
  const { F, FINOPS_FACTOR, SPEND_LABEL, PROV_LABEL, base, oppTable, r1, fmtM, SPEND_MID } = PX;

  const TEAM = [
    { sc: 1, ac: 0.5 }, { pc: 0.5, sc: 1, c: 1 }, { pc: 0.5, sc: 1, c: 1, ac: 1 },
    { pc: 0.5, sc: 2, c: 1, ac: 1 }, { vp: 0.1, pc: 1, sc: 2, c: 2, ac: 1 },
  ];
  // Specialist (technical architect / partner) and client engineering FTE by tier
  const SPECIALIST = [0.25, 0.5, 1, 1, 1.5];
  const CLIENT_ENG = [[0.5, 1], [1, 2], [2, 4], [3, 6], [4, 8]];
  // Assumed share of spend and savings range (% of the family's spend) per workload family
  const FAMILIES = {
    compute: ['Compute', 40, 8, 20, 'Right-size, schedule, newer generations, spot'],
    containers: ['Kubernetes / containers', 15, 8, 18, 'Node right-sizing, bin-packing, autoscaling'],
    storage: ['Storage', 10, 5, 15, 'Tier, expire, de-duplicate'],
    dataai: ['AI / data platform', 25, 5, 20, 'Cluster tuning, GPU utilisation, job scheduling'],
    network: ['Networking', 10, 3, 10, 'Egress, NAT and transit tuning, endpoints'],
  };
  const QUICK = 0.55; // share of each family's range that is engineering quick win vs. structural (design / modernization)

  PX.register({
    slug: 'technical-optimization', num: 2, name: 'Technical Optimization', months: '3–4 months', fit: 'Client engineering partnership',
    intro: 'Size the engineering-led opportunity: compute, Kubernetes and storage optimization, AI/data platform and networking tuning, and cost-aware design. Durable run-rate savings delivered with client engineering teams.',
    method: 'Savings use an assumed spend mix by workload family (renormalised across those selected), scaled by FinOps maturity. Structural savings are discounted by engineering capacity and appetite for modernization.',
    steps: [
      { title: 'Client Profile', fields: [F.name(), F.spend(), F.providers(), F.finops()] },
      { title: 'Technical Estate', fields: [
        { id: 'families', type: 'check', label: 'Workload families in scope', hint: 'select all that apply', options: Object.entries(FAMILIES).map(([k, w]) => [k, w[0], w[4]]) },
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
    calc(a) {
      const t = PX.TIER_IDX[a.spend], fm = FINOPS_FACTOR[a.finops], nf = a.families.length, np = a.providers.length;
      // Duration (months)
      let lo = 3, hi = 4;
      if (nf >= 4) { lo += 0.5; hi += 1; } else if (nf >= 3) hi += 0.5;
      if (np >= 2) hi += 0.5;
      if (a.telemetry === 'partial') { lo += 0.5; hi += 0.5; } if (a.telemetry === 'none') { lo += 1; hi += 1; }
      if (a.capacity === 'none') hi += 1; else if (a.capacity === 'limited') hi += 0.5;
      hi = Math.min(hi, 6);

      // Opportunity
      const total = a.families.reduce((s, k) => s + FAMILIES[k][1], 0);
      const arch = { modern: 0.7, mixed: 1, legacy: 1.25 }[a.arch];
      const structural = { team: 1, limited: 0.8, none: 0.6 }[a.capacity] * { high: 1, moderate: 0.7, low: 0.4 }[a.appetite];
      const rows = a.families.map(k => {
        const w = FAMILIES[k], share = w[1] / total; // share of the in-scope spend
        const lo_ = w[2] * fm * arch, hi_ = w[3] * fm * arch;
        const pLo = lo_ * (QUICK + (1 - QUICK) * structural) * share, pHi = hi_ * (QUICK + (1 - QUICK) * structural) * share;
        return [w[0], `${w[2]}–${w[3]}% of ~${Math.round(share * 100)}% of spend`, r1(pLo), r1(pHi)];
      });
      if (a.quickwins === 'no') rows.push(['Unused resource cleanup', 'Not yet captured', r1(1.5 * fm), r1(3.5 * fm)]);
      const opp = oppTable('Opportunity by Workload Family', rows, a.spend,
        `Assumes a spend mix of compute 40, containers 15, storage 10, AI/data 25, network 10 (renormalised to the families selected); replace with the client's actual split. Structural savings realised: ${Math.round(structural * 100)}%.`);

      const team = base(TEAM, a.spend);
      const ce = CLIENT_ENG[t], capF = { team: 1, limited: 0.7, none: 0 }[a.capacity];
      const needsSpecialist = a.families.includes('dataai') || a.families.includes('containers');
      const flags = [
        needsSpecialist ? { type: 'warn', title: 'Specialist technical capability likely required', detail: 'AI/data and Kubernetes work needs deeper technical skill than the core team. Decide whether Proxima plays here or partners (see delivery split).' }
          : { type: 'ok', title: 'Within core capability', detail: 'Compute, storage and networking tuning can be led by the core team with client engineers.' },
        a.capacity === 'none' ? { type: 'risk', title: 'No client engineering capacity', detail: 'Findings will not be implemented. Structural savings are cut to 60% of potential; secure capacity before kick-off.' }
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
          ['Proxima', 'Opportunity validation, prioritisation, savings tracking, commercial alignment of changes', `${PX.fmtFTE(PX.sumTeam(team))} FTE peak`],
          ['Specialist / partner (technical)', needsSpecialist ? 'Architecture review for Kubernetes and AI/data platforms' : 'Architecture review as needed', `${SPECIALIST[t]} FTE`],
          ['Client engineering', 'Implement rightsizing, platform and design changes', `${PX.fmtFTE(ce[0] * capF)}–${PX.fmtFTE(ce[1] * capF)} FTE during execution`],
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
