# Cost estimate (Chiffrage)

_Bottom-up estimate of one or several options: the single source of every figure in the decision dossier, the risk briefing and the steering reports. Rules: PM playbook, section "Costing model". Keep the arithmetic in a spreadsheet or script next to this file and name it below; recompute, never retype. Delete the italic guidance once filled._

## 0. Document control

| Item | Value |
|---|---|
| Project / options | `<...>` / `<A, B, 0>` |
| Document ID | `CST-<project>-<nnn>` |
| Version / status | `<0.x Draft / 1.0 Approved>` |
| Estimate stage | `<scoping: -25 % / +35 %; after POC or detailed design: ±15 %>` |
| Calculation file | `<path of the spreadsheet or script that produces every table>` |
| Price basis | `<k€ excl. VAT, prices of YYYY, indexation none / x % per year>` |
| Author | `<name or role>` |
| Classification | `<Internal / Confidential>` |

| Version | Date | Author | Changes |
|---|---|---|---|
| 0.1 | `<YYYY-MM-DD>` | `<role>` | Initial estimate |

## 1. Parameters

_The only place where these values are written. Every other table refers to them by ID. A second number of days per FTE anywhere in the dossier is a defect, however close to this one._

| ID | Parameter | Value | Source |
|---|---|---|---|
| P1 | Working days per FTE per year | `<e.g. 209>` | `<HR: 365 - weekends - public holidays - leave - RTT - training>` |
| P2 | Availability for the project | `<e.g. 80 %>` | `<share not taken by run, support and meetings>` |
| P3 | Productive days per FTE per year | `= P1 × P2` | computed |
| P4 | Loaded annual cost of an internal FTE | `<k€>` | `<finance: salary, charges, overheads>` |
| P5 | Internal day cost | `= P4 ÷ P1` | computed |
| P6 | Vendor day rate (TJM), per profile | `<€ excl. VAT>` | `<framework contract, quote>` |
| P7 | Project management and steering | `<10-15 % of effort>` | PM playbook, estimation heuristics |
| P8 | Contingency | per phase, section 3 | |
| P9 | Range at this stage | -25 % / +35 % | |
| P10 | Year boundaries | year 1 = S1 to S52 after the decision | |

## 2. Effort by work package

| WP | Phase | Work package | Driver (count × unit effort) | Internal days | Vendor days | Profile | Confidence |
|---|---|---|---|---:|---:|---|---|
| WP-01 | `<Preparation>` | `<contract, risk analysis>` | `<...>` | | | `<P6 profile>` | `<high / medium / low>` |
| WP-02 | | | | | | | |

| Phase | Weeks | Internal days with steering | Available days (people × weeks ÷ 52 × P3) | Load |
|---|---|---:|---:|---:|
| `<Preparation>` | `<S1-S6>` | | | `<%>` |

_A load above 100 % means vendor days or a longer phase: never raise P2 to make the plan fit. An overstated capacity hides vendor days, so the error lands on the cash-out._

## 3. Cost by phase

| Phase | Weeks | Vendor k€ | Licences k€ | Infrastructure k€ | Other purchases k€ | Steering | Contingency | Cash-out k€ | Internal days | Valued internal time k€ | Full cost k€ |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `<Preparation>` | `<S1-S6>` | `= days × P6` | | | | `P7` | `<10 %>` | | | `= days × P5` | |
| `<Build>` | | | | | | | `<15-25 %>` | | | | |
| `<Pilot / roll-out>` | | | | | | | `<20-30 %>` | | | | |
| Total | | | | | | | | | | | |

_Cash-out (décaissé) = vendor days at P6 + licences + infrastructure + purchases, with their steering and contingency. Valued internal time = internal days × P5, with its steering and contingency; it is not cash-out. Full cost (coût complet) = cash-out + valued internal time. Steering applies to effort (vendor and internal), contingency to the whole phase; each is applied once._

## 4. Range

| Total, k€ excl. VAT | Low (-25 %) | Base | High (+35 %) |
|---|---:|---:|---:|
| Cash-out, phase committed now | | | |
| Cash-out, all phases | | | |
| Full cost, all phases | | | |

_Apply the range to totals, not line by line. Say what will narrow it (POC measures, quotes, detailed design) and when the estimate is redone._

## 5. Three-year cost after the decision

| k€ excl. VAT | Year 1 (S1-S52) | Year 2 (S53-S104) | Year 3 (S105-S156) | Total |
|---|---:|---:|---:|---:|
| Project cash-out | | | | |
| Run cash-out (subscriptions, cloud, support, vendor run) | | | | |
| **Cash-out** | | | | |
| Valued internal time, project | | | | |
| Valued internal time, run (FTE × P4) | | | | |
| **Full cost** | | | | |
| Avoided cash-out (retired system) | | | | |
| **Net cash-out** | | | | |

_A phase spanning two years is split in proportion to its weeks. Run starts at the go-live week, not on 1 January. The run lines are the run cost of the option (yearly FTE, licences and support: PM playbook, estimation heuristics), costed with P4 for internal time. Show avoided costs on their own line, never netted inside another line._

## 6. Savings levers

| Lever | Cash-out, 3 years | Full cost, 3 years | Condition or trade-off | Who decides |
|---|---:|---:|---|---|
| `<internal role instead of vendor days>` | `<-k€>` | `<+/-k€>` | `<hiring lead time, availability>` | `<sponsor>` |
| `<reuse an existing licence or platform>` | | | | |
| `<phase or reduce the scope>` | | | `<requirements no longer covered>` | |
| `<commitment discount on cloud or subscription>` | | | `<lock-in, exit cost>` | |

_Cash-out and full cost often move in opposite directions: internalising lowers cash-out and can raise full cost. Show both._

## 7. Options compared

| Option | Cash-out, phase committed now | Cash-out, 3 years | Full cost, 3 years (range) | Run from year 2, per year |
|---|---:|---:|---:|---:|
| A | | | | |
| B | | | | |
| 0. Do nothing or defer | | | | |

_Every option uses the parameters of section 1. The three-year full cost is the TCO figure scored in the decision dossier and the ADR._

## 8. Checks before publishing

- [ ] P1 to P10 appear once; search the dossier for "days", "jours", "FTE", "ETP" and check every hit.
- [ ] The calculation file produces every table; section 3 totals equal the sum of phases; section 5 equals section 3 plus run.
- [ ] Each amount is labelled cash-out or full cost, in k€ excl. VAT.
- [ ] The internal load of each phase fits the people actually available (section 2).
- [ ] Steering and contingency are applied once per phase, on cash-out and on internal time.
- [ ] The decision dossier, risk briefing and slides quote these totals unchanged.
