# Decision dossier (Dossier de décision, business case)

_Answers a requirements statement (expression de besoins) with options, costs and one decision request. Written for the decision body: the decision comes first, the detail after. Every figure comes from the cost estimate (`cost-estimate.md`) and is quoted unchanged, never recomputed here. The risks of not acting belong to the executive risk briefing (`risk-briefing.md`): when one exists, link it rather than repeat it. Delete the italic guidance once filled._

## 0. Document control

| Item | Value |
|---|---|
| Project | `<...>` |
| Document ID | `DEC-<project>-<nnn>` |
| Version / status | `<0.x Draft / 1.0 Approved>` |
| Author | `<name or role named by the user>` |
| Method | _e.g. "Prepared with AI assistance; figures produced by the cost estimate's calculation file; human review required before distribution"_ |
| Audience | `<sponsor, steering committee, investment committee>` |
| Decision body / date | `<committee>` / `<YYYY-MM-DD or "to be set">` |
| Answers | `<requirements statement: ID, version, date, requester>` |
| Related documents | `<CST-... cost estimate, RAID-..., DAT-..., risk briefing>` |
| Classification | `<Internal / Confidential>` |

| Version | Date | Author | Changes |
|---|---|---|---|
| 0.1 | `<YYYY-MM-DD>` | `<role>` | Initial draft |

## 1. Decision requested

_One row per decision the body takes today. Each says what is committed (scope, duration, budget split into cash-out and valued internal time) and what is not: later phases come back with their own decision._

| No. | Decision | Committed now | Not committed |
|---|---|---|---|
| 1 | `<launch phase X with option Y>` | `<k€ excl. VAT cash-out + k€ internal time, weeks S1 to Sn>` | `<pilot, roll-out: separate decisions>` |
| 2 | `<early start of a long-lead item>` | `<internal time only>` | |
| 3 | `<criteria for the next gate>` | | |

_Add the latest useful decision date and the cost of waiting (extended support, penalty, regulatory date), with its source._

## 2. The need

_Five to ten lines from the requirements statement: requester, problem, scope in and out, drivers and deadlines, constraints, cost of doing nothing (or a link to the risk briefing). Section 10 maps every requirement._

## 3. Options

_Always include "do nothing or defer" and the minimal compliant option. Apply knock-out criteria first (regulation, security policy, contract); an excluded option stays in the table with its reason. All options are costed with the same parameters._

| Option | Content | Cash-out excl. VAT | Three-year full cost | Requirements covered | Main risk | Reversibility |
|---|---|---|---|---|---|---|
| A | `<...>` | `<k€, phase concerned>` | `<k€ (low-high)>` | `<n of N must-haves>` | `<...>` | `<high / medium / low>` |
| B | | | | | | |
| 0. Do nothing or defer | `<...>` | `<cost of extending the current state>` | | | | |

| Criterion | Weight | A | B | 0 |
|---|---|---|---|---|
| Coverage of the must-haves | `<%>` | `<1-5>` | | |
| Residual risk after mitigation | | | | |
| Three-year full cost | | | | |
| Time to value, critical path | | | | |
| Reversibility, lock-in | | | | |
| Operability, run effort | | | | |

_Weights are agreed with the sponsor before scoring (method: `architecture-reference/references/adr.md`)._

## 4. Recommendation

_The option, why in three to five sentences, what it excludes, and what would change the recommendation. When the choice is a business trade-off, present the options without deciding._

## 5. Trajectory in weeks after the decision

_Count weeks from the decision (S0, W0 in English) until it is taken: a calendar date written before the decision is a promise nobody made. Convert to dates once S0 is known. Each gate is a decision with its own criteria._

| Phase | Weeks | Content | Exit criterion or gate | Cash-out excl. VAT |
|---|---|---|---|---|
| Preparation | `<S1-S6>` | `<contract, risk analysis, subscriptions>` | `<suspensive conditions met>` | `<k€>` |
| `<Build / POC>` | | | `<go decision for the next phase>` | |
| `<Pilot / roll-out>` | | | | |
| Run | `<from Sn>` | | | `<k€ per year>` |

```gantt-weeks
section Before the decision
Open questions answered        : -4, 0
Decision                       : milestone, 0
section Preparation
Contract and risk analysis     : 0, 6
Suspensive conditions met      : milestone, 6
section Build
Build and tests                : 6, 18
Long-lead item                 : crit, 4, 16
Go decision for the next phase : milestone, 20
```

_The same rows go in a `<pre class="gantt-weeks">` block of the HTML page printed by `deliverables/scripts/print-pdf.mjs`, which draws the chart; in Markdown they stay readable as text. Above about fifteen rows, put the chart in a `<div class="landscape">` page._

## 6. Costs

_Summary of the cost estimate `CST-<...>`: the parameters once, cash-out apart from full cost, the range at this stage. Quote its totals unchanged._

| Parameter | Value |
|---|---|
| Capacity basis | `<d working days per FTE per year × a % availability = n productive days>` |
| Internal day cost | `<loaded annual cost ÷ working days = € per day>` |
| Vendor day rate (TJM) | `<€ excl. VAT per profile>` |
| Accuracy at this stage | -25 % / +35 % on totals |

| `<Option A>`, k€ excl. VAT | Year 1 | Year 2 | Year 3 | Three-year total (range) |
|---|---:|---:|---:|---:|
| Cash-out | | | | `<total (low-high)>` |
| Valued internal time | | | | |
| Full cost | | | | |

_Years run from the decision (year 1 = S1 to S52). Add the two or three main savings levers with their effect on cash-out and on full cost._

## 7. Conditions of the go

| No. | Condition | Type | Owner | Due | Status |
|---|---|---|---|---|---|
| C1 | `<approval, contract, legal opinion, regulator>` | `<suspensive / before next gate>` | `<role>` | `<S-n or Sn>` | `<open / met>` |

## 8. Risks

_The five to eight risks that would change the decision, with their RAID IDs._

| ID | Risk (cause → event → consequence) | Criticality | Response | Owner |
|---|---|---|---|---|
| RSK-`<nnn>` | | `<Critical / High / Medium>` | | `<role>` |

## 9. Questions to resolve

| No. | Question | What the answer changes | Who answers | Needed before |
|---|---|---|---|---|
| Q1 | | | `<role>` | `<the decision / gate>` |

## 10. Mapping to the requirements statement

_One row per requirement, numbered as in the requirements statement. Every requirement appears, including those no option covers. The coverage counts of section 3 come from this table._

| Req. | Requirement (short) | Priority | Option A | Option B | Where answered | Gap or comment |
|---|---|---|---|---|---|---|
| `<EB-01>` | | `<must / should / could>` | `<full / partial / no>` | | `<section, annex>` | |

## 11. Next steps

| Action | Owner | When | Depends on |
|---|---|---|---|
| `<...>` | `<role>` | `<before the decision / S2>` | |

## Checks before sending

- [ ] Every figure in sections 1, 3, 5 and 6 equals the cost estimate (same option, scope and year).
- [ ] One capacity basis in the dossier and its annexes; no other number of days per FTE appears.
- [ ] Cash-out and full cost never share a column; every amount says k€ excl. VAT.
- [ ] Totals carry their range; no single-point total.
- [ ] Weeks are relative to the decision everywhere: trajectory, Gantt, conditions, next steps.
- [ ] Coverage counts in section 3 match the mapping in section 10.
- [ ] Every suspensive condition has an owner and a due week; every risk has a RAID ID.
- [ ] The claims the decision rests on were verified (mission step 7b, verdict table in an annex as in the risk briefing) or are marked to verify.
