<!-- Tiger Team example output. Real run, unedited below this header. All names, hosts and figures are fictitious. -->

> **Example — full mission, `release` mode**
>
> | | |
> |---|---|
> | Command | `/tiger-team:mission Migrer une chaîne VTOM vers Control-M. La chaîne extrait chaque nuit des écritures comptables d'un IBM i (DB2 for i), les transfère par Axway CFT vers un serveur Linux, puis les intègre dans SAP S/4HANA par IDoc ACC_DOCUMENT. De nouveaux flux firewall sont à ouvrir. Contexte bancaire (DORA), environ 200 000 écritures par nuit, fenêtre batch 22h-5h. Ne pose pas de questions : avance avec des hypothèses explicites. release` |
> | Experts involved | enterprise-architect (framing, then coherence review), scheduling-expert, ibmi-expert, integration-expert, erp-expert, infra-expert, with one handoff round |
> | Plugin version | 1.0.0, 2026-10-22 |
> | Measured | about 17 minutes, USD 4.87 of API usage |
> | Language | the prompt was in French, so the team answered in French |
>
> The dates in the plan (February 2027 cut-over) are the team's proposal from the fictitious context given.

---

# Mission Tiger Team : migration VTOM → Control-M de la chaîne comptable nocturne (mode release)

## 1. Synthèse
- **Verdict actuel : NO-GO.** La mise en production est faisable, mais 11 critères bloquants, dont 3 sans aucun résultat à ce jour, doivent être tenus avant le comité go/no-go.
- **Sujet n°1 : la double comptabilisation.** Elle est bloquée de quatre façons : un verrou de propriété partagé par VTOM et Control-M, un registre des transferts CFT, un comptage exact des IDocs avant comptabilisation, et le contrôle de doublon de S/4HANA sur `OBJ_KEY`.
- **Ce contrôle de doublon n'est pas prouvé.** Il ne fonctionne que si le type d'objet est enregistré. Un test de renvoi en pré-production est exigé avant le 2026-11-20.
- **Bascule recommandée : nuit du 2027-02-09.** L'option du 2026-12-08 ferait tourner la première clôture annuelle sous Control-M pendant le gel, avec une semaine d'hypercare seulement. Ce choix est un arbitrage métier : il vous revient (§ 8).
- **Urgence :** la demande d'ouverture firewall doit être déposée au plus tard le **2026-10-27**.

## 2. Équipe mobilisée
| Expert | Contribution principale |
|---|---|
| Architecte d'entreprise | Shadow run puis bascule atomique, 6 principes, exigences non fonctionnelles de bout en bout, points DORA, revue de cohérence (12 constats) |
| Ordonnancement | Smart folder Control-M de 13 jobs, matrice de reprise, verrou et procédure de bascule, alertes SLA |
| IBM i | Extraction en lecture seule, fichier de contrôle `.ctl` et conversion UTF-8, data area de verrou, agent IBM i |
| Intégration | CFT en TLS mutuel, propagation du RUN_ID, points de rapprochement R0 à R4, rejeu, contrat d'interface |
| ERP SAP | Traitement IDoc en arrière-plan + RBDAPP01 en parallèle, `OBJ_KEY` anti-doublon, jobs S0 à S4, contre-passation par BAPI |
| Infra | Matrice de flux (environ 15), PKI, sizing et durcissement de LNXINT01, calendrier firewall et DR |

## 3. Analyse par domaine

**Architecture.** On ne change que l'orchestration. Le chemin des données IBM i → CFT → LNXINT01 → IDoc → S4P reste le même. La transition passe par quatre paliers :
- **T0 – Construction :** agents, flux et chaîne Control-M en attente.
- **T1 – Shadow run :** au moins 5 nuits avec une fin de mois, sans aucune comptabilisation.
- **T2 – Bascule atomique :** VTOM désactivé, pas supprimé.
- **T3 – Décommissionnement :** après une clôture mensuelle sans incident.

On s'écarte d'une migration purement technique sur un point : le format de la clé `OBJ_KEY`, avec un ADR. La raison : l'absence de doublon (P-C) passe avant « on ne change que l'orchestration » (P-A).

**Ordonnancement.** Un smart folder `CPT_NIGHT_ACC`, ODATE = date métier, New Day à 07:00 :
`005 VERROU/RUN_ID → 010 EXTRACT → 020 CFT → [événement daté CPT-CFT-EOT-OK] → 030 TRANSFORM → 040 ENVOI IDOC → 045 R3 → 050 RBDAPP01 → 055 POST-CONTRÔLE → 060 R4 → 090 FIN`

- Le pré-contrôle SAP **035** tourne en parallèle de 010 à 030. La purge **095** est un job à part, hors chaîne.
- Ressources : `CR_CPT_CHAIN` (exclusive), `QR_S4P_BTC`, `QR_IBMI_COMPTA`.
- Service SLA `SVC_CPT_NIGHT` avec échéance à 05:00.
- Alertes : 030 non démarré à 23:15 ; 050 non démarré à 00:15 (avertissement) puis 02:00 (critique) ; durée supérieure à 1,5 × P90 sur tous les jobs.
- Aucun déclenchement horaire entre 02:00 et 03:00 (changement d'heure).
- Points qui ne se convertissent pas 1:1 depuis VTOM : bascule de date, formules de calendrier, wrappers, variables `TOM_*`, chaînes VTOM en aval (pont temporaire).

**IBM i.**
- Extraction en isolation CS, `FOR READ ONLY`, sélection sur une date comptable clôturée, tables journalisées.
- Si le programme actuel écrit un flag « extrait », le shadow run tourne sur une bibliothèque copie `COMPTASHD`.
- Conversion unique vers un fichier IFS en CCSID 1208 (UTF-8), transfert CFT en binaire.
- Fichier `.ctl` séparé, sans changer le format : nombre de lignes, débit et crédit en unités mineures **par devise**, SHA-256, `BUSINESS_DATE`.
- Le wrapper CL envoie un `*ESCAPE` sur toute erreur. CPF1241 donne OK, CPF1240 donne NOTOK.

**Intégration.**
- Deux transferts : `ACCGL01D` (données) puis `ACCGL01C` (contrôle). Fichiers nommés `<RUN_ID>_A<n>`. Le récepteur refuse d'écraser un fichier existant.
- La procédure de fin de transfert du `.ctl` enchaîne : R1, renommage atomique, puis `ctmcontb` en local. Pas de jeton API, pas de flux supplémentaire.
- Registre RUN_ID + SHA, alimenté **seulement après R1 OK**. Sinon une tentative n+1 légitime serait rejetée.
- Rejeu par RUN_ID sous double validation : seuls les documents manquants sont renvoyés.

**SAP.**
- Profil partenaire en traitement d'arrière-plan : les IDocs attendent en statut 64. RBDAPP01 tourne en parallèle sur un groupe RZ12 dédié de 12 à 16 processus.
- Il faut environ 67 documents/s pour passer 600 000 écritures en 2h30. C'est **à prouver par un test de charge à 720 000**.
- `OBJ_KEY = G<YYMMDD><ID document source>` ; le RUN_ID complet va dans `EDIDC-REFINT`.
- Statut 51 : correction de la cause, puis BD87 ou RBDMANI2. FB50 et WE19 sont interdits.
- Retour arrière : **contre-passation** par `BAPI_ACC_DOCUMENT_REV_POST`, jamais de suppression.

**Infra.**
- Flux Server↔Agent doublés vers le serveur de secours CTMSRV02, en connexion persistante initiée par le serveur si la version le permet.
- SAP : serveur de messages 36NN et **un seul** port gateway (33NN ou 48NN, à trancher avec Basis), ouvert vers chaque serveur d'application. Les ports 32NN et 39NN restent fermés.
- Fermeture du PeSIT en clair (1761), après une analyse d'impact sur les autres partenaires CFT.
- LNXINT01 : volume de staging de 150 Go chiffré LUKS, durcissement ANSSI BP-028, envoi des logs au SIEM, synchronisation chrony.
- Certificats de la PKI interne, plus aucun certificat BMC par défaut.

## 4. Matrice de risques (fusionnée)
| Risque | Criticité | Responsable (rôle) | Mitigation |
|---|---|---|---|
| Double comptabilisation si VTOM et Control-M tournent tous les deux, ou lors d'un renvoi | Critique | Ordonnancement + IBM i | Data area `CPTOWNER` contrôlée par tous les jobs, VTOM désactivé dans le même changement, comptage exact R3 |
| `OBJ_KEY` non conservé (type BKPFF) : le contrôle de doublon SAP ne fonctionne pas | Critique | ERP | Test de renvoi avant le 11-20. Sinon enregistrement du type d'objet, régression OK avant le 12-02, ou no-go |
| Le shadow run perturbe le VTOM de production (verrou, flag COMPTA) | Critique | IBM i | Lecture partagée `*SHRRD` pour les lecteurs, le shadow ne prend jamais le verrou de prod, bibliothèque copie si l'extraction écrit un flag |
| Le renvoi tRFC crée des IDocs en double | Élevée | Intégration + ERP | R3 exige un compte exact par RUN_ID |
| Dépassement de fenêtre au pic de 600 000 écritures | Élevée | ERP + Ordonnancement | Test à 720 000 (cible ≤ 2h00), alerte prédictive à 02:00 |
| Perte de LNXINT01 (point unique de défaillance) | Élevée | Infra | Reconstruction ou serveur de secours, sauvegarde du staging, clé du coffre couverte par le DR |
| DR Control-M non testé | Élevée | Infra + Ordonnancement | Bascule vers CTMSRV02 les 21-22/11 |
| Première clôture annuelle sous Control-M pendant le gel | Élevée | Chef de projet / risk owner | Bascule en février 2027 (recommandée) |
| Statut « RUNNING » bloqué la nuit, objectif de reprise de 30 min manqué | Élevée | IBM i + Exploitation | Changement standard pré-approuvé, double validation |
| Purge à 35 jours qui efface des preuves R1-R4 | Élevée | Infra | Rétention comptable/DORA séparée (10 ans, à vérifier) |
| Date comptable prise sur SY-DATUM au passage de minuit | Élevée | ERP | Date métier issue du `.ctl`, contrôle S0 |
| Délais CAB et firewall | Élevée | Infra | Dépôt le 10-27, butée au 11-16 |
| Expiration de certificat (SNC, CFT, Control-M) | Moyenne | Infra | Inventaire, alertes à 60, 30 et 7 jours |
| Calendriers Control-M différents de VTOM | Moyenne | Ordonnancement | Comparaison des dates sur 13 mois |
| Conflit avec la fenêtre de sauvegarde IBM i | Moyenne | IBM i | Arbitrage via `QR_IBMI_COMPTA` |

## 5. Décisions et arbitrages
Ordre de priorité appliqué : réglementaire > sécurité > intégrité > disponibilité > délai > coût.

| # | Sujet | Décision | Justification |
|---|---|---|---|
| A1 | Totaux de contrôle : trailer ou fichier séparé | Fichier `.ctl` séparé, envoyé en 2nd transfert | Pas de changement de format (P-A) |
| A2 | Récepteur CFT : remplacer ou refuser l'écrasement | Refus d'écraser + registre, alimenté après R1 | Intégrité |
| A3 | Point de non-retour nocturne : 040 ou 050 | **Démarrage de CPT_050.** Annulation avant ce point : IDocs en 64 passés en statut 68 avec ticket | Rien n'est comptabilisé avant 050 |
| A4 | Événement de fin de transfert : API avec jeton ou utilitaire local | `ctmcontb` local | Sécurité : aucun jeton, aucun flux nouveau |
| A5 | Alerte d'absence de flux : 23:15 ou 23:30 | 23:15 | Détection plus tôt |
| A6 | Fuseau horaire | Europe/Paris pour l'ordonnancement, UTC pour les horodatages techniques | Lisibilité pour l'exploitation |
| A7 | Fichier POSTING_MODE | Supprimé : on garde 3 barrières (jobs « dummy », MODE et OWNER dans le `.ctl`, pas de destination RFC) | Une seule source de vérité, pas de flux orphelin |
| A8 | Exception à P-A pour `OBJ_KEY` / `REFINT` | Accordée, sous conditions : ADR, accord finance/audit, test de la recherche pour contre-passation | P-C passe avant P-A |
| A9 | Plan B en cas d'échec du test de doublon | Enregistrer le type d'objet (customizing réversible). Le pré-contrôle depuis LNXINT01 ne passe que sur acceptation formelle du risque | Intégrité |
| A10 | **Date de bascule** | **Décision métier, à vous de trancher** (§ 8) | |

## 6. Plan d'action
| Action | Responsable (rôle) | Quand | Dépend de |
|---|---|---|---|
| Choisir un seul port gateway et le logon group | Basis SAP | 2026-10-27 | — |
| Déposer la demande firewall (prod + DR CTMSRV02) | Infra | **2026-10-27** | Port gateway |
| Vérifier si l'extraction écrit un flag et si les bibliothèques sont codées en dur | IBM i | 2026-10-30 | — |
| Vérifier le type `OBJ_TYPE` et lancer l'ADR `OBJ_KEY` | ERP + Architecte | 2026-10-30 | — |
| Commander les certificats PKI (Control-M, CFT, SNC) | Infra | 2026-10-30 → 11-16 | — |
| Ouvrir les flux et certificats de pré-production | Infra | 2026-11-13 | — |
| Ouvrir et tester les flux de prod | Infra | 2026-11-09 (butée 11-16) | Demande firewall |
| Déployer les agents ; JOBD, file d'attente et profil IBM i ; wrapper CL et data area | IBM i + Ordonnancement | 2026-11-16 | Flux |
| Générer la chaîne JSON (Automation API) avec descripteurs SHADOW/PROD dans la CI | Ordonnancement | 2026-11-16 | — |
| Figer le contrat d'interface INT-ACCGL v1.0 | Intégration | 2026-11-16 | A1, A8 |
| Test de renvoi des doublons en pré-production (critère dur) | ERP | **2026-11-20** | Pré-production |
| Test de charge à 720 000 (extraction, LNXINT01, RBDAPP01) | ERP + IBM i + Intégration | 2026-11-20 | Pré-production |
| Test de bascule DR Control-M + restauration LNXINT01 | Infra + Ordonnancement | 2026-11-21/22 | Flux DR |
| Shadow run n°1, incluant la fin de mois du 11-30 | Ordonnancement | 2026-11-23 → 12-04 | Tout ce qui précède |
| Comparer les calendriers sur 13 mois ; tests de reprise par job | Ordonnancement | 2026-12-04 | — |
| Constituer le dossier de preuves DORA (§ 7) | Chef de projet | 2027-01-29 | Tests |
| Shadow run n°2, incluant la fin de mois du 01-29 (si le gel autorise une lecture seule) | Ordonnancement | 2027-01-18 → 01-29 | Accord gel |
| Comité go/no-go puis bascule | Release manager | **2027-02-09** | Tous les critères |
| Hypercare jusqu'à la clôture de février | Exploitation + Finance | 02-09 → 03-05 | — |
| T3 : arrêt des agents VTOM, retrait des flux et objets VTOM, mise à jour du registre DORA | Infra + Ordonnancement | à partir du 2027-03-15 | Clôture de février OK |

## 7. Fiche MEP : bascule T2, nuit du 2027-02-09 (option recommandée)

**Identification**

| | |
|---|---|
| Release | REL-2027-xxx « Bascule chaîne CPT VTOM → Control-M » |
| Change | CHG-xxxxx, majeur, fonction critique ou importante (DORA), CAB à prévoir |
| Systèmes | IBMIPRD01, LNXINT01, CTMSRV01/02, S4P, VTOMSRV01 (noms fictifs) |
| Fenêtre | 2027-02-09, 14:00 → 2027-02-10, 07:00 (Europe/Paris) |
| Interruption de service | Aucune |
| Point de non-retour | Démarrage de CPT_050 (RBDAPP01) |
| Échéance de décision de rollback | 00:30, dernier départ possible de VTOM pour finir avant 05:00 (à confirmer par la durée VTOM mesurée) |

**Prérequis (au plus tard J-1)**
- Change approuvé, dispense gel si nécessaire.
- Dossier de preuves DORA complet : analyse de risque, preuves de tests, registre (BMC ajouté), cartographie de la fonction critique, plan de sortie Control-M.
- DEX à jour : qui qualifie un incident majeur, et les délais de notification (4h après qualification, 24h max, puis 72h et 1 mois — à vérifier).
- `vtexport` de la chaîne VTOM versionné dans Git.
- Bascule et rollback répétés en pré-production avec les timings réels.
- Clôture de janvier signée par la finance.

**Critères GO (tous obligatoires)**
1. Test de renvoi : doublon rejeté par S4P.
2. Au moins 5 nuits de shadow consécutives avec une fin de mois : totaux 100 % identiques à VTOM, aucune action manuelle.
3. Test à 720 000 : extraction ≤ 45 min, transfert ≤ 15 min, transformation ≤ 45 min, comptabilisation ≤ 2h00.
4. Reprise de chaque job en ≤ 30 min sans doublon. Chemins de reprise de S3, écart de hash, refus du verrou côté VTOM et côté Control-M, libération du statut « RUNNING » : tous testés.
5. Bascule DR Control-M et restauration LNXINT01 réussies.
6. Tous les flux testés depuis CTMSRV01 et CTMSRV02. Aucun certificat BMC par défaut, tous valides plus de 90 jours.
7. Calendriers sur 13 mois : aucun écart inexpliqué.
8. Toutes les alertes, y compris la prédiction SLA, arrivent à l'astreinte.
9. Logs au SIEM, secrets lus dans le coffre, écart NTP inférieur au seuil.
10. Flux et agents VTOM toujours opérationnels pour le rollback.
11. Aucun incident P1/P2 ouvert sur le périmètre.

**Déroulé de la nuit de bascule**
| Étape | Heure | Action | Responsable | Résultat attendu |
|---|---|---|---|---|
| 01 | 05:30 | Vérifier la chaîne VTOM de J-1 | Exploitation | OK, R4 sans écart |
| 02 | 14:00 | **GNG-1** : revue des critères 1 à 11 | Release manager + finance + risk owner | Go tracé |
| 03 | 16:00 | Gel des changements ; export VTOM versionné | Ordonnancement | Artefact de rollback en place |
| 04 | 17:00 | Supprimer le dossier shadow de l'ODATE D ; déployer le descripteur PROD (MODE=PROD, 040/050 réels) ; `ctm build` ; commander l'ODATE D | Ordonnancement | Chaîne PROD commandée |
| 05 | 17:30 | Provisionner la destination RFC et les credentials SNC | Basis | Test de connexion OK |
| 06 | 18:00 | Retirer la planification VTOM (désactivée, pas supprimée) | Ordonnancement | Aucun job VTOM planifié |
| 07 | 18:15 | `CPTOWNER` : OWNER=CTM (job audité) | IBM i | Valeur journalisée |
| 08 | 21:30 | Contrôles pré-départ : agents, CFT, RFC, service SLA, STATE=DONE | Exploitation | Tout est vert |
| 09 | 21:45 | **GNG-2** : dernier rollback sans impact | Release manager | Go ou retour VTOM |
| 10 | 22:00 | Départ de CPT_005 ; hypercare sur le pont | Tous | — |
| 11 | ~23:15 | Événement de fin de transfert reçu ; R1 OK | Intégration | 030 démarré |
| 12 | ≤ 00:15 | R3 OK (045) → **GNG-3 / point de non-retour** : CPT_050 démarre | Release manager + ERP | Compte exact |
| 13 | ≤ 03:00 | 055 et 060 : R4 sans écart | ERP + Ordonnancement | Rapprochement OK |
| 14 | 07:00 | **GNG-4** : contrôles métier par la finance ; communication | Release manager + finance | Clôture de la MEP |

**Plan de rollback**
| Cas | Déclencheur | Action |
|---|---|---|
| Avant 22:00 | GNG-1 ou GNG-2 en échec | Mettre le dossier Control-M en attente ou le supprimer ; OWNER=VTOM ; replanifier VTOM et réaligner sa date d'exploitation ; retirer la destination RFC. Aucun impact sur les données |
| 22:00 → départ de 050 (au plus tard 00:30) | Échec de 005 à 045 non corrigeable en 30 min, écart R1/R2/R3 | Arrêter la chaîne ; passer les IDocs du RUN_ID de 64 à 68 (ticket, double validation) ; OWNER=VTOM ; lancer VTOM manuellement. Rien n'a été comptabilisé |
| Après le départ de 050 | — | Pas de rollback de la nuit : on corrige en avant sur Control-M (BD87/RBDMANI2). Données fausses : contre-passation BAPI avec accord finance, puis recomptabilisation avec une clé versionnée |
| J+1 → mi-mars | Défaut structurel | Retour VTOM avant 22:00 : chaîne Control-M en attente, OWNER=VTOM. VTOM reste désactivé mais restaurable, ses flux restent ouverts |

**Après la mise en production :** hypercare jusqu'à la clôture de février. Chaque jour à J+1 : R4, durées par rapport aux budgets, IDocs en statut 51, alertes. T3 commence après une clôture sans incident.

## 8. Questions ouvertes pour vous
1. **Date de bascule (arbitrage métier) :**
   - 2027-02-09 (recommandé). La clôture annuelle reste sous VTOM.
   - 2026-12-08. Seulement si une contrainte l'impose, par exemple la fin de la licence VTOM. Il faut alors la signature du risk owner, tous les critères au vert et un rollback VTOM pré-approuvé pendant le gel.

   Quand se termine la licence VTOM ?
2. L'extraction actuelle écrit-elle un flag dans COMPTA ? La réponse décide si le shadow run tourne en lecture directe ou sur une bibliothèque copie.
3. Le gel de fin d'année autorise-t-il un shadow run en lecture seule en janvier ? Quelles sont ses dates exactes ?
4. La sauvegarde IBM i nocturne chevauche-t-elle 22:00-23:00, et utilise-t-elle la sauvegarde en activité (save-while-active) ?
5. Quelle durée de rétention appliquer aux preuves de rapprochement et aux logs Control-M ? L'hypothèse retenue est 10 ans.

**Hypothèses retenues :**
- Control-M 9.0.21+ on-premise, avec les modules Control-M for SAP et SLA Management sous licence.
- S/4HANA on-premise, IDocs ACC_DOCUMENT traités par le code process BAPI.
- Pic de fin de mois égal à 3 fois le volume normal.
- Comptabilisations disponibles à 07:00.
- La chaîne supporte une fonction critique ou importante au sens DORA.
- Tous les noms de serveurs et d'objets sont fictifs.
- Les ports, la syntaxe des commandes et les articles DORA sont à vérifier sur vos versions et sur le texte en vigueur.

Je peux écrire ces livrables dans des fichiers à partir des modèles `deliverables` : fiche MEP, matrice de flux, contrat d'interface INT-ACCGL, RAID et ADR `OBJ_KEY`. Où voulez-vous les enregistrer ? Je propose `C:\tiger-team\missions\ctm-cpt-night\`.