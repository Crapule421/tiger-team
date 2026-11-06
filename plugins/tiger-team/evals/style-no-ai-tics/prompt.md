---
description: A French decision text written from raw notes full of AI tics (arrows, middle dots, ≈, anglicisms) comes back without dash separators, middle dots, arrows, "≈" or bold labels, in French prose with French headings and typography.
tags: [mission, style, smoke]
max_turns: 25
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Agent]
---

/tiger-team:mission solo Rédige la section « Contexte et décision attendue » (250 à 350 mots) d'un dossier que mon responsable présentera au comité de direction d'une entreprise fictive de logistique. Ne pose pas de question : avance avec des hypothèses explicites. Mes notes brutes :
- contexte → passerelle d'API en fin de support, ≈ 120 API exposées, ≈ 15 incidents/an liés à la passerelle
- besoin · remplacer la passerelle + scanner les API exposées en continu
- POC 6 semaines sur 3 API, scans en safe checks only, kill switch pour revenir à l'ancienne passerelle
- logs vers le SIEM en push ou en pull : à arbitrer par la design authority
- handoff vers l'exploitation pour les créneaux de bascule
- décision attendue : go / no-go sur le POC
