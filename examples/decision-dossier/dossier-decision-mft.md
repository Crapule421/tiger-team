# Dossier de décision, plateforme d'échange de fichiers avec les partenaires

_Exemple fictif qui illustre les gabarits `decision-dossier` et `cost-estimate`. La société, les partenaires, les montants et les devis sont inventés. Version imprimable : `dossier-decision-mft.html`, rendue avec `print-pdf.mjs`._

## 0. Suivi du document

| Élément | Valeur |
|---|---|
| Projet | Remplacement de la passerelle d'échange de fichiers (MFT) |
| Référence | DEC-MFT-001 |
| Version et statut | 0.3, en relecture |
| Rédacteur | Chef de projet MFT |
| Méthode | Rédigé avec l'aide d'une IA ; tous les montants sont produits par `chiffrage.mjs` ; relecture humaine requise |
| Destinataires | Comité de pilotage des systèmes d'information (COPIL SI) |
| Instance et date de décision | COPIL SI, date à fixer (S0) |
| Répond à | Expression de besoins EB-MFT-2026-01, version 1.2, direction des opérations |
| Documents liés | Chiffrage CST-MFT-001 (annexe A), registre RAID-MFT, DAT-MFT-001 à rédiger |
| Sensibilité | Interne |

| Version | Date | Auteur | Modifications |
|---|---|---|---|
| 0.1 | 2026-10-20 | Chef de projet | Premier jet |
| 0.2 | 2026-10-30 | Chef de projet | Options chiffrées avec une base de capacité unique |
| 0.3 | 2026-11-06 | Chef de projet | Revue de cohérence, annexe de chiffrage |

Notation : [F] fait sourcé, [I] déduction ou choix de conception, [AV] à vérifier. Montants en k€ HT. Les semaines sont comptées à partir de la décision (S0) ; S6 désigne la fin de la sixième semaine après la décision.

## 1. Décision demandée

| N° | Décision | Engagé maintenant | Non engagé |
|---|---|---|---|
| 1 | Retenir l'option A, plateforme MFT gérée hébergée dans l'UE, et lancer la préparation, le socle et le pilote (S1 à S16) | 99,2 k€ HT de décaissé (74,4 à 133,9) et 47,7 k€ de temps interne valorisé | Migration et décommissionnement, 67,4 k€ HT de décaissé, soumis à la décision de go migration en S16 |
| 2 | Autoriser le dépôt des demandes d'ouverture de flux dès S1, avant la levée des conditions suspensives | Temps interne uniquement | |
| 3 | Approuver les critères de go migration de la section 5 | | |

Le support de l'éditeur de la passerelle actuelle s'arrête 46 semaines après la date visée pour la décision [AV] (confirmation écrite demandée, Q3). Le planning laisse 8 semaines de marge. Chaque semaine de retard de la décision consomme cette marge ; au-delà, un support étendu coûterait 35 k€ HT pour un an (devis fictif).

## 2. Le besoin

La direction des opérations échange chaque jour des fichiers avec 140 partenaires : fournisseurs, transporteurs et banques. La passerelle actuelle arrive en fin de support, ne transmet aucune alerte au SIEM et impose une rotation manuelle des clés. L'expression de besoins EB-MFT-2026-01 demande huit exigences impératives et deux souhaitables (section 10). Hors périmètre : les échanges internes entre applications, qui restent sur le bus existant. Sans décision, la passerelle fonctionne sans correctif de sécurité après S46 [I].

## 3. Options

| Option | Contenu | Décaissé engagé maintenant | Coût complet sur 3 ans | Exigences impératives couvertes | Risque principal | Réversibilité |
|---|---|---:|---:|---|---|---|
| A, recommandée | Plateforme MFT gérée (SaaS, UE), agent interne, migration en 3 vagues | 99,2 | 498,8 (374,1 à 673,4) | 7 sur 8, 1 partielle | Lenteur des partenaires à échanger leurs certificats | Moyenne, clause de réversibilité |
| B | Montée de version du produit actuel sur site | 229,9 | 525,7 (394,3 à 709,7) | 6 sur 8, 2 partielles | Charge interne et une seule instance | Élevée |
| 0. Report d'un an | Support étendu de la passerelle actuelle | 35,0 | non comparable, le remplacement reste à faire | 5 sur 8, 2 partielles, 1 non couverte | Aucune alerte de sécurité vers le SIEM | Élevée |

| Critère | Poids | A | B | 0 |
|---|---:|---:|---:|---:|
| Couverture des exigences impératives | 30 % | 5 | 4 | 2 |
| Risque résiduel après mesures | 25 % | 4 | 3 | 1 |
| Coût complet sur 3 ans | 20 % | 4 | 3 | 4 |
| Délai de mise en service | 10 % | 4 | 3 | 1 |
| Réversibilité | 5 % | 3 | 4 | 5 |
| Exploitabilité, charge de run | 10 % | 4 | 2 | 2 |
| **Score pondéré** | | **4,25** | **3,25** | **2,20** |

Les poids ont été validés par le sponsor avant la notation. Les trois options sont chiffrées avec les mêmes paramètres (annexe A, section A.1).

## 4. Recommandation

Nous recommandons l'option A. Elle couvre sept exigences impératives sur huit, la huitième (conservation des journaux pendant un an) passant par le SIEM. Elle engage 99,2 k€ HT avant la preuve du pilote, contre 229,9 k€ HT pour l'option B, dont la licence se paie dès le départ. Sur trois ans, son coût complet est inférieur de 26,9 k€ à celui de B, car l'exploitation demande 0,4 ETP au lieu de 0,7. Le décaissé net des coûts évités est équivalent : 235,6 k€ pour A et 236,0 k€ pour B. Un échec du pilote en S16 ramènerait vers l'option B, avec 99,2 k€ HT engagés.

## 5. Trajectoire en semaines après la décision

| Phase | Semaines | Contenu | Critère de sortie ou décision | Décaissé HT |
|---|---|---|---|---:|
| Préparation | S1–S6 | Contrats SaaS et intégrateur, analyse de risque, avis du DPO, demandes de flux | Conditions suspensives C1 à C3 levées | 23,5 |
| Socle et pilote | S7–S16 | Configuration, agent interne, raccordement au SIEM, test d'intrusion, dix partenaires pilotes | Décision de go migration : dix partenaires en production pendant deux semaines sans incident majeur, aucune vulnérabilité critique ouverte | 75,7 |
| Migration des partenaires | S17–S34 | 130 partenaires en trois vagues de six semaines | 140 partenaires sur la nouvelle plateforme | 60,5 |
| Décommissionnement | S35–S38 | Arrêt de l'ancienne passerelle, archivage des journaux, destruction des clés | Ancienne passerelle arrêtée avant S46 | 6,9 |
| Exploitation | à partir de S39 | Abonnement, support de l'intégrateur, 0,4 ETP interne | | 48,0 par an |

### Planning directeur, en semaines à partir de la décision

```gantt-weeks
to: 52
section Avant la décision
Réponses aux questions Q1 à Q4          : -4, 0
Décision de lancement                    : milestone, 0
section Préparation
Contrats SaaS et intégrateur             : 0, 6
Analyse de risque et avis du DPO         : 1, 5
Ouvertures de flux réseau                : crit, 1, 8
Conditions suspensives levées            : milestone, 6
section Socle et pilote
Configuration, agent interne, SIEM       : 6, 12
Test d'intrusion de la plateforme        : 11, 13
Dix partenaires pilotes                  : 12, 16
Décision de go migration                 : milestone, crit, 16
section Migration des partenaires
Échange des certificats avec les partenaires : crit, 12, 30
Vague 1, 40 partenaires                  : 16, 22
Vague 2, 45 partenaires                  : 22, 28
Vague 3, 45 partenaires                  : 28, 34
section Décommissionnement et exploitation
Arrêt de l'ancienne passerelle           : 34, 38
Exploitation courante                    : 38, 52
Fin du support de l'ancienne passerelle  : milestone, crit, 46
caption: Le chemin critique passe par les ouvertures de flux puis par l'échange des certificats avec les partenaires. La fin du support de l'ancienne passerelle (S46) laisse 8 semaines de marge après son arrêt.
```

## 6. Coûts

Synthèse du chiffrage CST-MFT-001 (annexe A). Les montants sont repris tels que produits par `chiffrage.mjs`.

| Paramètre | Valeur |
|---|---|
| Base de capacité | 209 jours ouvrés par ETP et par an × 80 % de disponibilité = 167,2 jours productifs |
| Coût d'une journée interne | 88 k€ chargés ÷ 209 jours = 421 € |
| Prestation (TJM HT) | Intégrateur 720 €, expert de l'éditeur 1 050 € |
| Précision à ce stade | -25 % / +35 % sur les totaux |

| Option A, k€ HT | Année 1 | Année 2 | Année 3 | Total sur 3 ans (fourchette) |
|---|---:|---:|---:|---:|
| Décaissé | 205,4 | 48,0 | 48,0 | 301,4 (226,0 à 406,9) |
| Temps interne valorisé | 127,0 | 35,2 | 35,2 | 197,4 |
| Coût complet | 332,4 | 83,2 | 83,2 | 498,8 (374,1 à 673,4) |
| Décaissé évité (ancienne passerelle) | 7,8 | 29,0 | 29,0 | 65,8 |

Les années courent à partir de la décision : l'année 1 va de S1 à S52. Trois leviers d'économie sont détaillés en annexe A.6 ; le principal, un renfort interne pendant la migration, réduirait le décaissé de 60,5 k€.

## 7. Conditions du go

| N° | Condition | Type | Responsable | Échéance | Statut |
|---|---|---|---|---|---|
| C1 | Avis favorable du RSSI sur l'analyse de risque du service SaaS | Suspensive | RSSI | S5 | Ouverte |
| C2 | Clauses de réversibilité et de localisation dans l'UE signées | Suspensive | Achats et juridique | S6 | Ouverte |
| C3 | Avis du DPO sur les fichiers contenant des données personnelles | Suspensive | DPO | S5 | Ouverte |
| C4 | Critères de go migration approuvés (section 5) | Avant la décision | Sponsor | S0 | Ouverte |
| C5 | Partenaires de la vague 1 engagés sur l'échange des certificats | Avant le go migration | Responsable des échanges partenaires | S14 | Ouverte |

## 8. Risques

| ID | Risque (cause → événement → conséquence) | Criticité | Réponse | Responsable |
|---|---|---|---|---|
| RSK-012 | Partenaires lents à échanger leurs certificats → vagues retardées → arrêt de l'ancienne passerelle après S46 | Élevée | Campagne d'échange dès S12, double fonctionnement jusqu'à S38, support étendu en repli | Responsable des échanges partenaires |
| RSK-014 | Ouvertures de flux tardives → pilote décalé | Élevée | Demandes déposées en S1 (décision 2), suivi hebdomadaire | Infrastructure |
| RSK-021 | Charge interne à 97 % pendant la migration → retard des vagues | Élevée | Renfort interne (levier A.6) ou vague 3 décalée de quatre semaines | Chef de projet |
| RSK-017 | Indisponibilité du service SaaS → échanges bloqués | Moyenne | Engagement de disponibilité de 99,9 %, file d'attente de 72 h sur l'agent interne | Exploitation |
| RSK-019 | Dépendance à l'éditeur SaaS → coût de sortie élevé | Moyenne | Clause de réversibilité, export trimestriel des configurations | Achats |

## 9. Questions à lever

| N° | Question | Ce que la réponse change | Qui répond | Nécessaire avant |
|---|---|---|---|---|
| Q1 | Le pic de 9 000 fichiers par jour inclut-il la clôture annuelle ? | Palier d'abonnement de l'option A | Direction des opérations | La décision |
| Q2 | Des fichiers de paie passent-ils par la passerelle ? | Avis du DPO (C3) et sensibilité des journaux | Direction des ressources humaines | La décision |
| Q3 | La fin du support en S46 est-elle confirmée par écrit par l'éditeur ? | Marge du planning et urgence de la décision | Achats | La décision |
| Q4 | Le SIEM accepte-t-il le format de journaux de la plateforme ? | Couverture de EB-05 et EB-10 | SOC | S7 |

## 10. Correspondance avec l'expression de besoins

| Exigence | Libellé court | Priorité | Option A | Option B | Option 0 | Où c'est traité |
|---|---|---|---|---|---|---|
| EB-01 | SFTP et AS2 avec les partenaires | Impérative | Oui | Oui | Oui | Section 5 |
| EB-02 | 140 partenaires, 9 000 fichiers par jour en pointe | Impérative | Oui | Oui | Oui | Q1 |
| EB-03 | Chiffrement en transit et au repos, rotation des clés | Impérative | Oui | Oui | Partielle | DAT à venir |
| EB-04 | Accusés de réception AS2 et preuve de dépôt | Impérative | Oui | Oui | Oui | DAT à venir |
| EB-05 | Alertes vers le SIEM | Impérative | Oui | Partielle | Non | Q4 |
| EB-06 | Disponibilité de 99,5 % en heures ouvrées, RPO de 15 min | Impérative | Oui | Partielle | Partielle | RSK-017 |
| EB-07 | Hébergement dans l'UE, réversibilité | Impérative | Oui | Oui | Oui | C2 |
| EB-08 | API pour l'ERP | Souhaitable | Oui | Non | Non | DAT à venir |
| EB-09 | Portail d'enrôlement des partenaires | Souhaitable | Oui | Non | Non | Section 5 |
| EB-10 | Conservation des journaux pendant un an | Impérative | Partielle | Oui | Oui | Q4, 90 jours natifs puis SIEM |

## 11. Prochaines étapes

| Action | Responsable | Échéance | Dépend de |
|---|---|---|---|
| Obtenir la confirmation écrite de la fin du support | Achats | Avant la décision | |
| Répondre aux questions Q1, Q2 et Q4 | Chef de projet | Avant la décision | |
| Présenter le dossier au COPIL SI | Sponsor | S0 | Q1 à Q3 |
| Déposer les demandes d'ouverture de flux | Infrastructure | S1 | Décision 2 |
| Lancer l'analyse de risque du service SaaS | RSSI | S1 | Décision 1 |

## Annexe A. Chiffrage CST-MFT-001

Produit par `chiffrage.mjs` à partir des paramètres A.1. Stade : cadrage, précision -25 % / +35 %.

### A.1 Paramètres

| ID | Paramètre | Valeur | Source |
|---|---|---|---|
| P1 | Jours ouvrés par ETP et par an | 209 | RH, accord d'entreprise fictif |
| P2 | Disponibilité pour le projet | 80 % | Équipe MFT, hors run et support |
| P3 | Jours productifs par ETP et par an | 167,2 (P1 × P2) | Calculé |
| P4 | Coût annuel chargé d'un ETP interne | 88 k€ | Contrôle de gestion |
| P5 | Coût d'une journée interne | 421 € (P4 ÷ P1) | Calculé |
| P6 | TJM HT | Intégrateur 720 €, expert de l'éditeur 1 050 € | Contrat cadre, devis fictif |
| P7 | Pilotage | 12 % de l'effort | Playbook PM |
| P9 | Fourchette | -25 % / +35 % | Stade cadrage |
| P10 | Années | Année 1 = S1 à S52 après la décision | |

### A.2 Charge interne et capacité, option A

Deux ETP internes sont affectés au projet.

| Phase | Semaines | Jours internes (pilotage inclus) | Jours disponibles | Charge |
|---|---|---:|---:|---:|
| Préparation | S1–S6 | 35,8 | 38,6 | 93 % |
| Socle et pilote | S7–S16 | 61,6 | 64,3 | 96 % |
| Migration des partenaires | S17–S34 | 112,0 | 115,8 | 97 % |
| Décommissionnement | S35–S38 | 22,4 | 25,7 | 87 % |

### A.3 Coût par phase, option A

| Phase | Prestation | Achats | Contingence | Décaissé | Jours internes | Temps interne valorisé | Coût complet |
|---|---:|---:|---:|---:|---:|---:|---:|
| Préparation | 8,4 | 12,0 | 10 % | 23,5 | 35,8 | 16,6 | 40,1 |
| Socle et pilote | 42,9 | 15,0 | 20 % | 75,7 | 61,6 | 31,1 | 106,8 |
| Migration des partenaires | 43,2 | 0,0 | 25 % | 60,5 | 112,0 | 58,9 | 119,4 |
| Décommissionnement | 3,6 | 2,0 | 15 % | 6,9 | 22,4 | 10,8 | 17,8 |
| **Total** | 98,1 | | | **166,6** | 231,8 | 117,5 | **284,1** |

### A.4 Coût sur trois ans après la décision, option A

| k€ HT | Année 1 | Année 2 | Année 3 | Total sur 3 ans |
|---|---:|---:|---:|---:|
| Décaissé projet | 166,6 | 0,0 | 0,0 | 166,6 |
| Décaissé récurrent (abonnement, support) | 38,8 | 48,0 | 48,0 | 134,8 |
| **Décaissé** | 205,4 | 48,0 | 48,0 | **301,4** (226,0 à 406,9) |
| Temps interne valorisé, projet | 117,5 | 0,0 | 0,0 | 117,5 |
| Temps interne valorisé, exploitation | 9,5 | 35,2 | 35,2 | 79,9 |
| **Coût complet** | 332,4 | 83,2 | 83,2 | **498,8** (374,1 à 673,4) |
| Décaissé évité | 7,8 | 29,0 | 29,0 | 65,8 |
| **Décaissé net** | 197,6 | 19,0 | 19,0 | **235,6** |

### A.5 Options comparées

| Option | Décaissé engagé maintenant | Décaissé sur 3 ans | Coût complet sur 3 ans (fourchette) | Décaissé récurrent, année 2 |
|---|---:|---:|---:|---:|
| A | 99,2 | 301,4 | 498,8 (374,1 à 673,4) | 48,0 |
| B | 229,9 | 286,9 | 525,7 (394,3 à 709,7) | 19,0 |
| 0. Report d'un an | 35,0 | 35,0 puis A décalé d'un an | non comparable | |

### A.6 Leviers d'économie, option A

| Levier | Décaissé sur 3 ans | Coût complet sur 3 ans | Condition ou contrepartie | Qui décide |
|---|---:|---:|---|---|
| Renfort d'un ETP interne d'une autre équipe pendant la migration, à la place des 60 jours de l'intégrateur | -60,5 | -22,4 | Disponibilité de l'équipe prêteuse de S17 à S34 | Sponsor |
| Engagement de trois ans sur l'abonnement (-10 %) | -12,1 | -12,1 | Sortie avant trois ans plus coûteuse | Achats |
| Réutilisation des machines virtuelles existantes pour l'agent interne | -7,2 | -7,2 | Capacité disponible confirmée par l'infrastructure | Infrastructure |
