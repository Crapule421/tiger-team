---
type: llm
---

The user gave raw notes full of arrows, middle dots, "≈" and English terms, and asked for a French section of a decision file that their manager will present.

PASS if the reply does all of the following:
- the requested section is written in French prose (paragraphs), not as one bullet per note, and its headings are in French with a capital on the first word only;
- the anglicisms of the notes are rendered in French: safe checks (for example « contrôles non intrusifs »), kill switch (« coupure d'urgence » or « arrêt d'urgence »), design authority (« comité d'architecture » or « autorité d'architecture »), handoff (a request to operations, not the English word), push or pull (« mode poussé », « mode tiré », or who opens the connection);
- approximate figures are written with « environ » or a range, with French number typography (« environ 120 API », « 15 incidents par an »);
- the text speaks neutrally for the manager who carries it (« la décision attendue porte sur… »), never as the author's own request;
- no filler openers or empty intensifiers (« il convient de noter », « crucial », « essentiel », « robuste », « levier »).

FAIL if the section keeps the list form of the notes, leaves two or more of the anglicisms above in English, uses Title Case headings, or is written as the author's own request.
