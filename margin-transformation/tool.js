// Offering 3: Margin Transformation (3–4 months, SaaS clients)
(function () {
  const { F, T, SPEND_LABEL, PROV_LABEL, base, oppTable, r1, fmtM, SPEND_MID, num, fmtFTE, sumTeam } = PX;
  const SHARE_LABEL = { lt5: 'under 5%', '5-10': '5–10%', '10-20': '10–20%', '20plus': '20%+' };

  PX.register({
    slug: 'margin-transformation', num: 3, name: 'Margin Transformation', months: '3–4 months', fit: 'SaaS clients',
    intro: 'Size the margin opportunity for a SaaS client: unit and product-level cost models, customer profitability, COGS vs R&D treatment, sandbox monetization, and linking cloud spend to pricing and margin.',
    method: 'Opportunity is a % of cloud spend by lever, scaled by unit-economics maturity. Revenue is estimated from cloud spend and its stated share of revenue, so gross-margin points are indicative.',

    params: {
      duration: [3, 4],
      team: [T(0, 0.25, 1, 0.5, 0), T(0, 0.5, 1, 1, 0), T(0, 0.5, 1, 1, 1), T(0, 1, 1, 2, 1), T(0.1, 1, 2, 2, 1)],
      cloudShareOfRevenue: { lt5: 3, '5-10': 7.5, '10-20': 15, '20plus': 25 },
      costToServe: [2, 6],
      unitMaturity: { none: 1.2, partial: 1, mature: 0.5 },
      sandbox: { low: [0.3, 1], med: [1, 2.5], high: [2.5, 5] },
      pricing: { seat: [2, 5], hybrid: [1.5, 4], usage: [1, 3] },
      reclass: { unsplit: [15, 35], partial: [5, 15], split: [0, 5] },
    },
    paramMeta: {
      duration: { title: 'Base duration (months, low – high)' },
      team: { title: 'Proxima team at peak (FTE) by spend tier' },
      cloudShareOfRevenue: { title: 'Cloud spend as % of revenue (midpoint per answer)', note: 'Used to estimate revenue from cloud spend.' },
      costToServe: { title: 'Cost-to-serve reduction lever (% of cloud spend, low – high)' },
      unitMaturity: { title: 'Unit-economics maturity multiplier', note: 'Less to find where cost models already exist.' },
      sandbox: { title: 'Sandbox and free-tier lever (% of cloud spend) by size' },
      pricing: { title: 'Pricing alignment lever (% of cloud spend) by pricing model', note: 'Margin recovered by pricing to cost-to-serve. A planning heuristic; validate against customer data.' },
      reclass: { title: 'COGS / R&D reclassification (% of cloud spend, low – high)', note: 'A reporting effect on gross margin, not cash.' },
    },
    sample: {
      name: 'Sample Client', spend: '20-50m', ctype: 'saas', share: '5-10', unit: 'partial', products: 'few',
      cogs: 'partial', pricing: 'hybrid', sandbox: 'med', finops: 'partial', data: 'partial',
    },

    steps: [
      { title: 'Client Profile', fields: [F.name(), F.spend(), F.ctype()] },
      { title: 'Unit Economics', intro: 'How well the client understands cost to serve today.', fields: [
        { id: 'share', type: 'radio', label: 'Cloud spend as a share of revenue', options: [
          ['lt5', 'Under 5%', 'Cloud is a small part of cost of goods'], ['5-10', '5–10%', 'Typical for SaaS'], ['10-20', '10–20%', 'Material margin drag'], ['20plus', '20% or more', 'Cloud dominates cost of goods']] },
        { id: 'unit', type: 'radio', label: 'Unit cost and product-level cost models', options: [
          ['none', 'None', 'Cloud cost seen only in total'], ['partial', 'Partial', 'Some products or customers costed'], ['mature', 'Mature', 'Cost per customer and product tracked']] },
        { id: 'products', type: 'radio', label: 'Products / business lines', options: [
          ['one', 'Single product', 'One cost model'], ['few', '2–5', 'Shared platform with several products'], ['many', '6 or more', 'Complex allocation across products']] },
        { id: 'cogs', type: 'radio', label: 'COGS vs R&D split of cloud cost', options: [
          ['unsplit', 'Not split', 'Cloud largely booked to one line'], ['partial', 'Partly split', 'Rules exist but are inconsistent'], ['split', 'Clearly split', 'Reported margin reflects the split']] },
      ] },
      { title: 'Pricing & Environments', fields: [
        { id: 'pricing', type: 'radio', label: 'Pricing model', options: [
          ['seat', 'Seat-based', 'Heavy users can cost far more than they pay'], ['hybrid', 'Hybrid', 'Seats plus usage components'], ['usage', 'Usage-based', 'Price already tracks consumption']] },
        { id: 'sandbox', type: 'radio', label: 'Sandbox, free-tier and demo environments', options: [
          ['low', 'Small', 'Minimal non-revenue environments'], ['med', 'Moderate', 'Regular trials and sandboxes'], ['high', 'Large', 'Significant free-tier and sandbox cost']] },
        F.finops(), F.data(),
      ] },
    ],

    calc(a, P) {
      const mid = SPEND_MID[a.spend];
      const sharePct = P.cloudShareOfRevenue[a.share], revenue = mid / (sharePct / 100);
      // Duration (months)
      let [lo, hi] = P.duration;
      if (a.products === 'few') { lo += 0.5; hi += 0.5; } if (a.products === 'many') { lo += 1; hi += 1.5; }
      if (a.unit === 'none') { lo += 0.5; hi += 1; } if (a.cogs === 'unsplit') hi += 0.5;
      if (a.data === 'partial') hi += 0.5; if (a.data === 'no') { lo += 0.5; hi += 1; }
      hi = Math.min(hi, 6);

      // Opportunity (% of annual cloud spend)
      const um = P.unitMaturity[a.unit];
      const sb = P.sandbox[a.sandbox], pr = P.pricing[a.pricing];
      const rows = [
        ['Cost-to-serve reduction', 'Unit cost models expose heavy and inefficient workloads', r1(P.costToServe[0] * um), r1(P.costToServe[1] * um)],
        ['Sandbox and free-tier rationalization', `Environments: ${a.sandbox}`, sb[0], sb[1]],
        ['Pricing and packaging alignment', `${a.pricing}-based pricing vs. cost to serve`, pr[0], pr[1]],
      ];
      const opp = oppTable('Opportunity by Lever (Cash Margin)', rows, a.spend,
        'Percent of annual cloud spend. Pricing alignment is margin recovered by pricing to cost-to-serve and is a planning heuristic; validate against actual customer data.');
      const ptsLo = opp.dlo / revenue * 100, ptsHi = opp.dhi / revenue * 100;
      // COGS vs R&D reclassification: a reporting effect, not cash
      const rc = P.reclass[a.cogs];
      const rcLo = mid * rc[0] / 100, rcHi = mid * rc[1] / 100;

      const team = base(P.team, a.spend);
      const flags = [
        a.ctype !== 'saas' ? { type: 'warn', title: 'Not a SaaS client', detail: 'This offering fits SaaS cost structures best. For other client types, use Rapid or Technical Optimization.' }
          : { type: 'ok', title: 'SaaS client: strong fit', detail: 'Cloud sits in cost of goods, so margin impact is direct.' },
        a.unit === 'none' ? { type: 'warn', title: 'No unit cost models', detail: 'Month 1 builds the cost-to-serve foundation. Expect the longer end of the range.' } : { type: 'ok', title: 'Unit economics foundation exists', detail: 'Extend existing models to customer and product profitability.' },
        a.cogs === 'unsplit' ? { type: 'warn', title: 'COGS vs R&D not split', detail: 'Reported gross margin is understated. Agree the allocation policy with Finance and the auditors before any reclassification.' } : { type: 'ok', title: 'COGS / R&D split in place', detail: 'Margin reporting reflects the split.' },
        a.finops === 'poor' ? { type: 'warn', title: 'Allocation is weak', detail: 'Product-level costing depends on tagging. Consider Spend Governance in parallel.' } : { type: 'ok', title: 'Allocation workable', detail: 'Product-level cost views can be built on existing allocation.' },
      ];
      return {
        duration: [lo, hi], team, tables: [opp.table], flags,
        kpis: [
          { label: 'Annual Cash Opportunity', value: `${fmtM(opp.dlo)} – ${fmtM(opp.dhi)}`, color: 'var(--green)', sub: `${r1(opp.plo)}–${r1(opp.phi)}% of ${SPEND_LABEL[a.spend]} spend` },
          { label: 'Gross Margin Uplift', value: `${num(ptsLo)}–${num(ptsHi)} pts`, color: 'var(--green)', sub: `Est. revenue ~${fmtM(revenue)} (cloud ${SHARE_LABEL[a.share]} of revenue)` },
          { label: 'COGS / R&D Reclass', value: `${fmtM(rcLo)} – ${fmtM(rcHi)}`, sub: 'Reporting effect, not cash' },
        ],
        summary: `${SPEND_LABEL[a.spend]} cloud spend · ${a.products === 'one' ? 'single product' : a.products === 'few' ? '2–5 products' : '6+ products'}`,
        teamSub: 'Principal Consultant typically at 0.5',
        split: [
          ['Proxima', 'Cost models, profitability views, COGS/R&D policy, pricing and margin linkage', `${fmtFTE(sumTeam(team))} FTE peak`],
          ['Client finance (FP&A)', 'Revenue and cost data, margin definitions, policy sign-off', '0.25–0.5 FTE'],
          ['Client data / engineering', 'Usage telemetry and allocation inputs for product costing', '0.5–1 FTE'],
          ['Client product / pricing', 'Pricing and packaging decisions', '0.1–0.25 FTE'],
        ],
        phases: [
          ['1. Cost foundation', 'Month 1', 'Allocation, unit cost model, COGS vs R&D policy', 100],
          ['2. Profitability views', 'Months 1–3', 'Customer and product profitability, cost-to-serve outliers', 85],
          ['3. Pricing and margin link', 'Months 2–4', 'Link cloud spend to pricing, packaging and margin plan', 65],
          ['4. Roadmap and handover', 'Final weeks', 'Margin plan and operating cadence', 35],
        ],
        positioning: 'Proxima-led (commercial and margin work). Best for SaaS clients; combine with Technical Optimization to deliver the cost-to-serve reductions.',
        next: [
          ['technical-optimization', 'Deliver the cost-to-serve reductions the models expose.'],
          a.finops !== 'mature' ? ['spend-governance', 'Product costing needs durable allocation and forecasting.'] : null,
          ['rapid-cost-optimization', 'Quick wins and deal levers while the models are built.'],
        ].filter(Boolean),
      };
    },
  });
})();
