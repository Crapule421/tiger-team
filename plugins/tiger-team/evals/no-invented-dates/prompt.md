---
description: A decision file built from a requirements statement that gives milestones but no dates is planned in weeks relative to the launch decision, with costs per year after the decision; no committee date, start month or calendar year is invented, and the text speaks for the manager who will carry it.
tags: [mission, dates, smoke]
max_turns: 25
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Agent]
---

/tiger-team:mission solo Prépare la partie « Planning et budget » du dossier de décision que mon responsable présentera au comité de direction pour lancer une preuve de concept. Entreprise fictive de logistique, hors secteur régulé. Ne pose pas de question : avance avec des hypothèses explicites.

Extrait de l'expression de besoins, c'est tout ce que nous avons :
- Objet : évaluer une passerelle d'API managée pour exposer une dizaine de services internes aux partenaires transporteurs, en remplacement d'une passerelle en fin de support.
- Jalons attendus : décision de lancement du POC ; cadrage du périmètre et des critères de réussite ; POC de six semaines sur trois API ; bilan du POC ; décision de généralisation.
- Budget : l'abonnement à la passerelle est facturé à l'année. Prévoir le coût du POC, puis le coût récurrent sur trois ans en cas de généralisation.
- Contraintes : le RSSI valide toute exposition vers l'extérieur ; l'exploitation valide les créneaux de bascule.
