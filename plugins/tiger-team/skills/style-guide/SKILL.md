---
name: style-guide
description: Completes the writing style of the deliverables skill for every answer, in French and English - banned AI writing tics (dash separators, middle dots, arrows, "≈", bold labels, chopped bullets), a bold cap, headings in the user's language, neutral voice, glossary of anglicisms, French typography.
user-invocable: false
---

# Style guide (French and English)

A reader who spots machine-written text stops trusting its content. In one real mission the experts' answers carried 187 bold spans, dash separators, middle dots and arrows, and the whole decision file had to be rewritten by hand.

This guide completes the Writing style section of the `deliverables` skill (headings that name the content, figures in tables, plain sentences, French words where they exist, notation, method line); it does not replace it. Its sentence rules hold for every answer too: one idea per sentence, active voice, each idea said once, no "not X but Y" contrast, no colon reveal, no rhetorical question. What follows adds what they do not cover, for every expert answer, the lead's consolidation and every deliverable. A text that breaks these rules is not finished: check it against section 7 before handing it over.

## 1. Characters banned from prose

| Do not write | Write instead |
|---|---|
| Em dash (—), or a spaced en dash ( – ), to join two ideas or set off an aside | a comma, parentheses, a colon, or two sentences |
| Middle dot (·) as a separator ("Fact · Inference") or in inclusive writing ("expert·e·s") | a comma or "and"; in French, a collective noun (« les équipes », « le personnel ») or both forms in full (« les utilisatrices et les utilisateurs ») |
| Arrows (→, ⇒, ->, ↔) in sentences, headings or table cells | a verb ("leads to", « entraîne », « puis », « vers »), or two columns "From" and "To" |
| ≈ or ~ before a number | "about", « environ », or a range with its basis (« 3 à 5 jours, ordre de grandeur ») |
| Emoji and decorative symbols (✅ ❌ ⚠️ ★ ▶) | a word: « Oui », « Non », « Bloquant » |

These characters stay allowed where they are a format and not prose: the typed handoff line `→ <agent-name> | <claim> | <evidence> | <needs>` of the team-standard answer (internal to a mission, never copied into a deliverable), code, commands, and numeric ranges inside tables (`3-5`).

## 2. Emphasis, lists and padding

- Bold: one or two spans per section at most, for what the reader must not miss (the decision, a blocking risk). Never bold a word to open a paragraph, a bullet or a table cell.
- No "**Label.** text" or "**Label:** text" pattern. Content that has labels is a table (label in the first column) or gets a heading.
- Fact, Inference and Assumption labels (`discovery` skill) are written in plain text or as the notation of the `deliverables` skill, never in bold.
- Reasoning is written as prose: a paragraph of three to six sentences. A bulleted list is for items that are parallel and separable (steps, prerequisites, a checklist). Do not split one idea over several bullets, do not turn each sentence of an argument into a bullet, and do not nest bullets more than one level.
- Do not open by restating the request and do not close with a recap of what was just said, an offer of further help or a conclusion that adds nothing.
- No empty intensifiers or filler openers: crucial, key, robust, seamless, leverage; « clé », « crucial », « essentiel », « robuste », « levier », « incontournable », « Il convient de noter que », « Force est de constater ».

## 3. Voice

- Write from the position of the person who will carry the document. The user often prepares a file for someone else (a manager, a sponsor) who will make the request. Then the text is neutral: « La décision attendue porte sur le lancement d'une preuve de concept de six semaines », « Le dossier propose… », never « nous demandons au COPIL du… » and never as if the user were the requester.
- The agents are not people. A deliverable presents the expertise covered, by domain (« Expertises couvertes : ordonnancement, bases de données, réseau »), never an « équipe mobilisée », names of experts or a headcount.
- Dates come from the source or the user only; otherwise weeks relative to the launch decision and costs per year after it (`discovery` skill, section 2).

## 4. Language of headings and terms

Headings and labels follow the user's language, including the team-standard sections and the templates of the `deliverables` skill, whose English headings are translated when the document is written in French. Keep the French contractual or regulatory name as it is (MEP, PV de recette, réserves, VABF); in an English document, give it in parentheses after the English term.

Team-standard sections in French: Synthèse, Analyse, Recommandations, Risques, Demandes aux autres expertises, Questions ouvertes, Hypothèses. Criticality: Critique, Élevée, Moyenne, Faible.

## 5. Glossary of anglicisms (French texts)

It extends the list of French words given in the Writing style of the `deliverables` skill. Product, protocol, command and attribute names stay as they are.

| Avoid | Write | Note |
|---|---|---|
| handoff | demande entre experts, point transmis à l'expertise <domaine> | in a deliverable, a handoff becomes a decision or an action |
| design authority | comité d'architecture, autorité d'architecture | use the name of the organization's body when known |
| kill switch | coupure d'urgence, arrêt d'urgence | say what it stops and who triggers it |
| safe checks | contrôles non intrusifs | the opposite is « tests intrusifs » |
| pull / push | mode tiré / mode poussé, à l'initiative du destinataire / de l'émetteur | say which side opens the connection |
| go / no-go | décision de lancement, décision de mise en production | « go/no-go » stays acceptable in a run sheet |
| build / run | réalisation / exploitation | |
| scope | périmètre | |
| stakeholders | parties prenantes | |
| owner | responsable, porteur | |
| roadmap | feuille de route | |
| workaround | contournement | |
| fallback | solution de repli | |
| rollback | retour arrière | |
| cut-over | bascule | |
| hypercare | soutien renforcé après la mise en production | |
| lead time | délai d'obtention | |
| quick win | gain rapide | |
| baseline | niveau de référence | |
| POC | preuve de concept (POC) | spell it out at first use |

## 6. French typography

- No-break space before « : » and inside « » guillemets; narrow no-break space before « ; ! ? » when the output keeps it, otherwise a normal space, never none.
- French quotation marks « … »; quotes inside quotes “ ”.
- Capital on the first word and proper nouns only, in headings and table headers too (« Coûts et sanctions de référence »). Accented capitals (« État », « À partir de »).
- Acronyms without dots, invariable in the plural (les RSSI, les COPIL).
- Numbers: space as thousands separator (12 450), decimal comma (3,5), space before units and percent (15 %, 4 h, 30 jours), currency after the amount (12 000 €, 45 k€).
- Ordinals 1er, 2e, 3e (never 2ème or 2nd); « n° ».
- Ranges in prose: « de 3 à 6 semaines », not « 3-6 semaines ».
- Days and months in lower case (lundi, novembre). Times: « 21 h 30 » in prose, `21:30` in tables and run sheets.
- « etc. » closes an open list and is never followed by « … ».
- A list introduced by a colon: fragments start in lower case and end with « ; », the last one with « . »; full sentences start with a capital and end with a period.

## 7. Check before handing over

Search the text for —, ·, →, ⇒, ≈ and "**"; count the bold spans per section; check that the headings are in the user's language, that no calendar date was added that the source does not give, that the text speaks for the person who will carry it, and that no glossary term was left in English. Fix, then hand over.
