# Grid-Headroom Map

A starter tool that scores the U.S. power markets where hyperscalers build data centers, ranked by how **power-constrained** each one is. Power delivery — not land, fiber, or GPUs — is now the binding constraint on data-center capacity. Where the grid is tight, a provider siting a workload there carries real schedule and cost risk. That risk is negotiating leverage in cloud / data-center sourcing: push for delivery-date penalties and price concessions, or steer the deal toward a headroom-rich region.

## What's here

- **`Grid_Headroom_Map.xlsx`** — the full workbook (four tabs: Read Me & Method, Headroom Scorecard, Scoring Model, Source Data).
- **`grid_headroom_scorecard.csv`** — a flat export of the scorecard so it renders directly on GitHub (see below).

## The scorecard

Each market gets a **Constraint Index** from 1 (ample headroom) to 5 (severely constrained). A higher index means more buyer leverage on delivery timeline and price. The index is a weighted blend of five 1–5 sub-scores:

| Weight | Sub-score | What it measures |
|---|---|---|
| 25% | Load-vs-Capacity tightness | How close current peak demand sits to planned/available capacity |
| 25% | Queue deliverability gap | Gap between large-load requests and what can actually be energized / has firm dates |
| 20% | Generation adequacy | Whether new generation is keeping pace with load growth |
| 15% | Interconnection friction | Regional study times (~5 yr avg) and withdrawal rates (~86% never complete) |
| 15% | Regulatory / curtailment risk | Moratoria, curtailment rules (e.g. Texas SB6), locational-price premiums |

Weights live on the Scoring Model tab of the workbook — change them and every score recalculates.

## Current ranking (Aug 2026)

| Market | Constraint Index | Buyer leverage |
|---|---|---|
| PJM — Dominion / N. Virginia | 4.65 | High |
| APS — Arizona (Phoenix) | 4.10 | High |
| ERCOT — Texas | 3.90 | Moderate |
| SRP — Arizona (Phoenix) | 3.85 | Moderate |
| PJM — rest of footprint | 3.35 | Moderate |
| MISO — Midwest | 3.35 | Moderate |
| CAISO — California | 3.15 | Some |
| SPP — Central | 2.60 | Some |
| Non-ISO West (ex-AZ) | 2.30 | Low |

## How the sub-scores were built

The five sub-scores are expert-judgment ratings anchored to real, cited figures (ERCOT large-load queue, PJM/Dominion firm-date gap, APS/SRP capacity utilization, LBNL national completion and wait-time stats). They are a defensible first pass, not measured constants. Every figure and its source link are on the Source Data tab of the workbook.

Primary sources: Berkeley Lab (LBNL) *Queued Up* 2026 edition; ERCOT Large Load Interconnection updates; PJM load forecast and Dominion documentation; Arizona Corporation Commission, APS, SRP, and Gov. Hobbs' 2026 energy plan.

## Caveats

- **Queue MW massively overstates real demand.** ERCOT's own request-to-operating funnel is ~1.6%, so withdrawal rate matters as much as raw queue depth.
- This map flags **timeline / siting risk**, not a vendor's confidential internal constraint.
- Use it to generate the questions you ask in a negotiation ("the grid says this region is tight — how are you de-risking delivery?"), not as a claim you assert as fact.
- Figures are point-in-time (see as-of dates in the workbook); queue data is revised constantly. Verify before citing in a live negotiation.

## Extending it

Yellow cells in the workbook are editable inputs. Add a market as a new row, enter the five 1–5 sub-scores, and the index and leverage label compute automatically. Template rows (Georgia/Southern Co, Ohio/AEP, Iowa/MISO) are pre-stubbed — fill them once you have local queue and IRP data.
