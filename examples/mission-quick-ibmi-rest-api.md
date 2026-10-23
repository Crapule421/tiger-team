<!-- Tiger Team example output. Real run, unedited below this header. All names, hosts and figures are fictitious. -->

> **Example — `quick` mission (one expert round, no handoff round, no coherence review)**
>
> | | |
> |---|---|
> | Command | `/tiger-team:mission Nous devons exposer en API REST interne les soldes de comptes stockés sur un IBM i (DB2 for i) pour une nouvelle application web, en contexte bancaire. Quels sont les prérequis côté IBM i, réseau/sécurité et intégration, et les points de vigilance ? Ne pose pas de question : avance avec des hypothèses explicites. quick` |
> | Experts involved | ibmi-expert, integration-expert, infra-expert |
> | Plugin version | 1.2.0, 2026-10-23 |
> | Measured | USD 3.43 of API usage |
> | What to look at | the arbitration between the infra and IBM i experts (JDBC vs IWS), the version caution on IBM i 7.4, and the open questions that each come with the command to run (`DSPPTF`, `WRKPTFGRP`, `WRKSYSVAL QSSLPCL`) |
> | Language | the prompt was in French, so the team answered in French |

---

Les trois experts ont répondu. Voici la synthèse consolidée en mode `quick`.

## 1. Synthèse

Faisable et classique, à condition de ne jamais exposer l'IBM i directement. Chaîne cible : application web → API gateway interne → façade API (middle tier Java/Spring dans une zone réseau dédiée « accès core ») → IBM i. Côté IBM i, l'accès se fait par JDBC JTOpen en TLS sur une vue SQL et une procédure stockée dans une bibliothèque d'interface dédiée, sous un profil de service sans autorité spéciale, verrouillé par exit programs. L'identité du conseiller OIDC est propagée jusqu'à la façade pour produire le journal nominatif exigé par le secret bancaire. Trois prérequis bloquants avant tout développement : release IBM i supportée, TLS actif sur les serveurs hôtes, zone réseau et PKI en place.

Arbitrage rendu : l'expert infra préférait IWS pour le réseau (un seul port HTTPS, health check natif), l'expert IBM i recommande JDBC pour ne rien ajouter sur la partition core banking. Je retiens **JDBC** (sécurité et surface d'attaque priment sur la commodité réseau), avec les conditions de l'expert infra : ports fixés, TLS sur signon et database, pool résilient. Bascule vers IWS ou procédure externe uniquement si le solde affiché est calculé par un programme RPG existant.

## 3. Analyse par domaine

**IBM i (ibmi-expert)**
- Bibliothèque d'interface dédiée : vue SQL ne portant que les colonnes utiles, types convertis (dates numériques en DATE, CCSID réel sur les textes, jamais 65535), et un horodatage « solde arrêté au » issu de la table de contrôle du batch. Procédure stockée avec paramètres marqueurs. Tables en `*PUBLIC *EXCLUDE`.
- Profil de service : aucune autorité spéciale, `LMTCPB(*YES)`, mot de passe en coffre, function usage `QIBM_DB_ZDA` à `*DENIED` par défaut et `*ALLOWED` pour ce seul profil.
- Exit programs `QIBM_QZDA_INIT` et `QIBM_QZDA_SQL2` limitant à `SELECT` et `CALL` sur la bibliothèque d'interface, puis redémarrage des prestart jobs.
- TLS par DCM sur le serveur de base de données, `QSSLPCL`/`QSSLCSL` en TLS 1.2 minimum, `QSECURITY` 40 minimum. Groupes PTF Db2 à jour.
- Isolation : `*CS` si la table est journalisée, avec timeout court ; sinon `*NC` et horodatage obligatoire. Vérifier que le batch de nuit ne pose pas de verrou `*EXCL`.
- Capacité : 10 à 20 connexions en pool suffisent pour la pointe estimée, impact CPU faible. Sous-système et pool mémoire dédiés, index sur la clé compte.
- Vigilance : l'audit `QAUDJRN` ne verra que le profil de service, pas le conseiller. La trace nominative doit venir de la façade, idéalement en poussant l'identité OIDC dans `CLIENT_USERID`.
- Alerte version : l'expert indique que la 7.4 est sortie du support standard fin septembre 2026. Ce point est à confirmer auprès d'IBM, mais s'il est avéré et que la partition est en 7.4, c'est un prérequis projet.

**Intégration (integration-expert)**
- Façade API obligatoire : elle porte le contrat versionné, le pool JDBC borné, le cache court, le circuit breaker et le mode dégradé. L'IBM i ne voit qu'un compte technique.
- Contrat : identifiants de compte opaques (jamais l'IBAN en URL), montants en chaîne décimale, devise ISO 4217, deux horodatages (`balanceAsOf` et `retrievedAt`), un statut `CURRENT`/`STALE`/`BATCH_IN_PROGRESS`, erreurs RFC 9457, corrélation `traceparent`.
- Sécurité : JWT utilisateur propagé plus client OAuth2 par application, mTLS sur tous les sauts, scope dédié en lecture, 404 identique pour « inexistant » et « non autorisé », alerte sur taux de 404.
- Résilience : timeouts décroissants le long de la chaîne, retry sur une seule couche, 503 avec `Retry-After` si l'IBM i est indisponible, jamais un 200 vide.
- Observabilité : journal d'accès dédié (qui, quel compte, quand, résultat), logs applicatifs sans IBAN ni nom, alerte d'absence de trafic en heures ouvrées, tests de contrat en CI.

**Réseau et sécurité (infra-expert)**
- Zone « core-access » dédiée pour la façade, seule source autorisée vers l'IBM i, avec IP d'egress fixe. Règles pare-feu par hôte, jamais par sous-réseau. Interdiction explicite application web → IBM i.
- Flux JDBC à ouvrir : 9471 (database TLS) et 9476 (signon TLS) vers les partitions de production et de secours. Refuser 449 (port mapper en clair) en fixant les ports côté driver, et refuser 8471/8476/8470/446.
- Flux support : DNS, NTP, syslog TLS vers le SIEM, health checks, OCSP/CRL, bastion pour l'administration.
- PKI interne pour l'IBM i (certificat DCM avec SAN sur le nom de service et les deux partitions), la façade et le gateway. Propriétaire nommé et alerte d'expiration à J-30 pour chaque certificat. Pas d'auto-signé.
- HA : nom DNS de service à TTL court ou VIPA déplacée selon le produit de réplication. Une bascule coupe toutes les connexions JDBC : pool avec durée de vie courte, validation à l'emprunt, test de bascule en préproduction.

## 4. Matrice des risques

| Risque | Criticité | Owner | Mitigation |
|---|---|---|---|
| Release IBM i hors support standard (si 7.4) | Critique | Responsable IBM i | Confirmer auprès d'IBM, extension de support ou migration 7.5 avant MEP |
| Serveurs hôtes IBM i en clair (8471/8476) ou port mapper 449 | Critique | Responsable IBM i + réseau | Certificat DCM, `secure=true`, ports fixés, refus des ports clairs au pare-feu |
| Profil de service avec `*ALLOBJ` ou accès table directe | Critique | Responsable IBM i | Vue dédiée, `*PUBLIC *EXCLUDE`, exit programs, revue des profils |
| Accès non tracé par utilisateur (secret bancaire, DORA) | Critique | Architecte sécurité + RSSI | JWT utilisateur propagé, journal d'accès dédié, `CLIENT_USERID` |
| VLAN core banking ouvert par sous-réseau applicatif | Critique | Réseau | Zone core-access, egress IP fixe, règles par hôte |
| Énumération de comptes via IBAN en URL | Haute | Lead API | Identifiants opaques, 404 uniforme, détection de taux |
| Saturation IBM i par pool ou retry storm | Haute | Lead API | Pool borné, retry une couche, circuit breaker, cache |
| Solde périmé ou incohérent pendant le batch | Haute | Lead API + IBM i | Horodatage et statut dans la réponse, verrous du batch vérifiés |
| IBAN ou noms dans les logs | Haute | Lead API | Masquage, revue des logs, séparation du journal d'accès |
| Certificat auto-signé ou sans propriétaire | Haute | PKI | Registre, alerte expiration, PKI interne obligatoire |
| Bascule HA non vue par le pool JDBC | Haute | Lead API + IBM i | Nom DNS de service, validation de connexion, test de bascule |
| CCSID 65535 ou dates numériques mal converties | Moyenne | Responsable IBM i | `DSPFFD`, conversion dans la vue, test avec accents |
| Montants en flottant | Moyenne | Lead API | Chaîne décimale, test de contrat |

## 8. Questions ouvertes

Les experts ont dû poser beaucoup d'hypothèses. Je recommande de lancer `/tiger-team:discover` pour créer la fiche d'environnement. Les cinq réponses qui changent le plus la solution :

1. Release IBM i et niveau PTF (`DSPPTF`, `WRKPTFGRP`, `WRKSYSVAL QSSLPCL`) : décide le support, TLS 1.3 et le calendrier.
2. Le solde affiché est-il une colonne stockée ou calculé par un programme RPG ? Décide vue SQL contre procédure externe ou IWS.
3. Table journalisée, verrous posés par le batch de nuit, et existe-t-il un indicateur de fin de batch ? Décide `*CS` contre `*NC` et le mode dégradé.
4. Produit du gateway et plateforme conteneurs : peuvent-ils faire du mTLS sortant, propager le JWT, et fournir une IP d'egress fixe ?
5. Produit de réplication IBM i et mécanisme de bascule (VIPA, DNS, manuel), plus durée de conservation des journaux exigée par le RSSI et la conformité.

Je peux écrire cette synthèse dans `docs/tiger-team/2026-10-23-api-soldes-ibmi.md`, avec les trois réponses d'experts en annexe, si vous le souhaitez.