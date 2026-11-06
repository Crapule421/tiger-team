# Executive risk briefing (Note de risques, support de COPIL)

_A short deck or note that tells a steering committee what happens if a security or compliance measure is not taken, and which decisions are expected. Every figure and every case carries its source; nothing is asserted beyond the evidence. Delete the italic guidance once filled._

## 0. Document control

| Item | Value |
|---|---|
| Project | `<...>` |
| Document ID | `RSK-BRF-<project>-<nnn>` |
| Version / status | `<0.x Draft / 1.0 Approved>` |
| Author | `<name or role>` |
| Method | _e.g. "Analysis prepared with AI assistance; facts sourced and verified independently (annex); human review required before external distribution"_ |
| Audience | `<steering committee, executive board, risk committee>` |
| Classification | `<Internal / Confidential>` |

## 1. Cover

_Factual title naming the subject (e.g. "Risks of not controlling network access"), sub-title with the committee and the date, document control table. No slogan._

## 2. Current situation

| Access mode or practice | Weakness | Reference |
|---|---|---|
| `<...>` | `<what an attacker or an error can do today>` | `<guide, standard, vendor documentation>` |

_Say which lines are facts and which are deductions from standard behaviour, to be confirmed by the inventory._

## 3. Documented cases

| Case | Date | What happened | Source |
|---|---|---|---|
| `<public incident or study>` | `<year>` | `<attack path, duration, impact, as written in the source>` | `<original report, date>` |

_Primary sources only (the victim's or investigator's report, the regulator, the vendor's research). Add the matching MITRE ATT&CK techniques in one line._

## 4. Applicable requirements

| Text | What it requires | Status for the entity |
|---|---|---|
| `<law, regulation, guide, standard with article or measure number>` | `<paraphrase>` | `<applies / target / to assess / good practice>` |

_Never write "compliant". Give the reason for each status; "to assess" when the entity's scope is uncertain._

## 5. Regulatory status of the entity

| Established facts | Consequences for the project |
|---|---|
| `<category of the entity, supervisor, texts in force, pending laws with their date>` | `<what the project targets now, what changes when a pending text is adopted, who validates>` |

## 6. Reference costs and sanctions

| Indicator | Value | Source | Remark |
|---|---|---|---|
| `<average cost of a breach, fines, legal ceilings>` | `<figure with unit and year>` | `<primary source>` | `<scope; "analogy" when the case is not the same risk>` |

_Figures sit in this table with their source; no large stand-alone numbers. Figures only seen in secondary sources are removed or marked "to verify". Compare with the project effort only when both are in the same unit._

## 7. Scenarios and controls

| Realistic scenario in the entity | Planned control | Residual risk |
|---|---|---|
| `<who does what, where>` | `<control and the alert it raises>` | `<what remains, and its mitigation>` |

## 8. Target

_One diagram of the target, readable when printed (text at 6.5 pt or more, landscape page if needed), and one sentence on what it changes._

## 9. Path and effort

| Tier or phase | Period | Content | Exit criterion |
|---|---|---|---|
| `<T0 ...>` | `<...>` | `<...>` | `<measurable>` |

| Indicator | Estimate |
|---|---|
| Duration | `<range, freezes excluded>` |
| Project effort | `<range in person-days per option, management and contingency included>` |
| Yearly run | `<FTE per year, licences and support to quote>` |

## 10. Decisions requested

| No. | Decision | Recommendation |
|---|---|---|
| 1 | `<...>` | `<recommended option and why, in one sentence>` |

_End with the facts that must be confirmed before the committee decides, each with who can confirm it._

## Annex: verification

| ID | Claim | Verdict | Primary source |
|---|---|---|---|
| `<V-01>` | `<claim as written in the briefing>` | `<exact / corrected / removed / to verify by a human>` | `<URL or document>` |
