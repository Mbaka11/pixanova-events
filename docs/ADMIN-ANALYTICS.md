# Administration et statistiques Events

## Périmètre

- `/admin/` : tableau privé, **un rôle admin unique**. Aucun lien public ajouté dans les pages de vente.
- Compte Supabase Auth **du projet Events**, distinct du client-brief. Autorisation serveur par `EVENTS_ADMIN_USER_ID` **et** `EVENTS_ADMIN_EMAIL`; les rôles fournis par le navigateur ou `user_metadata` ne donnent aucun accès.
- `/api/admin/auth` : connexion, vérification de session, déconnexion, changement de mot de passe avec réauthentification.
- `/api/admin/overview` : sources privées réunies sans mélanger statistiques consenties, réservations et encaissements.
- `/api/analytics` : GET renvoie uniquement l’état public d’activation; POST accepte une liste fermée d’événements avec consentement explicite. Aucun accès public aux événements enregistrés.

## Installation

1. Exécuter **une seule fois**, dans `pixanova-events` uniquement, `supabase/migrations/202611030003_admin_analytics.sql`. Elle ne modifie ni réservations, ni stock, ni paiements.
2. Initialiser le compte choisi :

```sh
node scripts/bootstrap-admin.mjs --email ADRESSE_ADMIN_AUTORISEE
```

Le script vérifie le site Netlify et son Supabase, prouve la présence de la migration, crée si nécessaire un compte avec un mot de passe fort aléatoire, et configure les variables privées Netlify Production. **Aucune invitation et aucun mot de passe par courriel.** Le mot de passe initial est écrit uniquement dans le fichier local ignoré `temp/user-input/events-admin-access.txt`; jamais dans les logs ou Git. Changer ce mot de passe après la première connexion. Une relance conserve un compte existant et ne réinitialise jamais son mot de passe. Le jeton Netlify CLI reste local et n’est pas copié en production.

Variables serveur : `SUPABASE_URL`, `SUPABASE_SECRET_KEY` existantes, `EVENTS_ADMIN_EMAIL`, `EVENTS_ADMIN_USER_ID`, `ADMIN_SESSION_SECRET` (32 octets aléatoires en base64), `EVENTS_ANALYTICS_ENABLED=true` seulement après migration. Aucun secret dans les fichiers publics. Un nouveau déploiement est nécessaire après modification des variables Netlify.

La clé locale Stripe reste TEST; la configuration Netlify Production reste LIVE. Le bootstrap ne change pas les clés Stripe, le stock ou les webhooks.

## Accès et sécurité

- Sessions Supabase vérifiées côté serveur, cookie **chiffré AES-256-GCM**, HttpOnly, Secure, SameSite=Strict, préfixe `__Host-`, durée absolue maximale huit heures; rafraîchissement privé du jeton sans exposition JavaScript.
- Mot de passe actuel exigé pour changer le mot de passe; nouveau mot de passe minimum 14 caractères; reconnexion après changement.
- Requêtes de modification en JSON et origine identique obligatoire; aucun CORS ouvert.
- Limitation atomique en PostgreSQL : authentification 8 requêtes par fenêtre de 15 min, statistiques 120/min par empreinte réseau, rapports admin 30/min. Seul l’en-tête réseau Netlify est utilisé, pas un `X-Forwarded-For` arbitraire. Sans cet en-tête, une clé commune conservatrice est appliquée.
- Aucun IP brut dans la table de limitation : HMAC avec secret serveur. Suppression quotidienne des limites inactives depuis plus d’un jour.
- RLS activée, aucune policy navigateur, aucun droit `anon`/`authenticated` sur les données ou RPC statistiques. Le service serveur ne renvoie que des données autorisées après vérification admin.
- Pages admin sans cache, sans iframe, sans suivi comportemental et avec CSP restrictive. Les tableaux utilisent `textContent` pour éviter l’injection de libellés.
- Si migration, identifiants ou source distante manquent : accès fermé ou source « indisponible », **jamais des métriques fictives**.

## Sources et sens des chiffres

### Comportements consentis

Le module commun `public/js/analytics.js` instrumente l’accueil générique et les pages de salon. La collecte s’active seulement si le serveur l’autorise et si le visiteur accepte. Aucun envoi avant accord; refus ne bloque ni devis ni paiement. Une préférence distincte `px_stats_consent_v1` évite de réutiliser implicitement un ancien consentement. Ajouter Clarity/GA4 change la portée et redemande un choix.

Identifiant aléatoire par onglet/session, page/événement, langue, sections, quantités d’écrans, choix de création, durée (pas les dates exactes), estimation et base HT/TTC, étapes de parcours. Sources UTM limitées à source/support/campagne et domaine référent sans chemin ni paramètres; caractères et longueurs restreints. Aucun nom, courriel, téléphone, lieu, notes, saisie libre, URL de paiement ou identifiant Stripe dans cette collecte. Aucun suivi publicitaire Meta n’est activé.

Les événements client sont déclaratifs : ils ne prouvent **ni paiement ni réception d’une soumission**. Un visiteur sans consentement n’est pas représenté dans le tunnel mesuré. Les pages vues et sessions ne doivent pas être assimilées à la totalité du trafic Netlify ni à des personnes identifiées. Aucun clic historique non collecté ne peut être reconstitué.

Les « derniers paniers » sont les derniers états de sélection/récapitulatif observés par session pseudonymisée, pas une liste de prospects identifiés. Un récapitulatif fermé est distingué d’une session Stripe expirée. Les statistiques ne libèrent jamais de stock.

### Réservations

Lecture des réservations Supabase de l’environnement actif et du parc `pixanova-led`, créées pendant la période choisie. Les réservations hors ligne sont séparées et ne produisent aucun encaissement inventé. Les montants affichés sur ces lignes sont ceux des récapitulatifs figés, pas un total financier. Lecture bornée à 2000 lignes, résultat partiel signalé.

### Stripe

Lecture **sans écriture**, sessions créées dans la période choisie, mode LIVE ou TEST explicite, métadonnée `inventory_pool=pixanova-led`. Les validations isolées hors parc sont exclues. La mesure ne prétend pas distinguer les anciennes QA non étiquetées d’un vrai parcours client.

Encaissements : sommes des **montants réellement capturés** sur les charges Stripe, moins `amount_refunded`, y compris remboursements partiels. C’est un montant **TTC, avant frais Stripe**, pas un chiffre d’affaires HT ni une marge. Il s’agit d’une cohorte de sessions créées dans la période, avec remboursements connus à l’instant du rapport, pas d’un relevé de trésorerie quotidien. Un montant non vérifiable masque le total financier au lieu de donner zéro. Maximum 200 sessions Stripe par lecture; résultat partiel indiqué, réduire la période si nécessaire.

Les recettes ne viennent jamais d’un clic, d’un événement `purchase` du navigateur, d’un montant de panier ou de l’affichage de la page merci. Le collecteur refuse les événements client `purchase`/`paid`.

## Netlify Analytics

Netlify documente les visites/pages/sources agrégées depuis les logs serveur, mais pas d’API Web Analytics publique stable. Le tableau propose donc un **accès direct au dashboard Netlify**, pas un connecteur reverse-engineeré et pas de faux chiffres Netlify. Vérifier l’abonnement et l’activation dans Netlify. **Aucun abonnement n’est activé ou modifié par cette livraison.** Aucun jeton personnel Netlify dans les fonctions de statistiques.

## Microsoft Clarity et GA4

L’intégration est prête mais **Clarity reste désactivé si `config/platform.json > analytics.clarity` est vide**. Créer un projet dans Clarity pour `events.pixanova.ca`, régler le consentement et le masquage strict, puis fournir son identifiant public pour le configurer et redéployer. L’ID n’est pas un secret; aucun mot de passe Microsoft requis par le site. Pas d’installation d’extension navigateur ou de paquet supplémentaire nécessaire.

Le script Clarity se charge uniquement après consentement avec `consentv2`, stockage analytics accordé et stockage publicitaire refusé. Inputs, textareas, selects, dialogues et confirmation sont masqués. Le lien de composition courriel ne contient aucune coordonnée client dans son attribut `href` : son contenu prérempli est gardé en mémoire et utilisé uniquement au clic explicite. Les pages admin et URL de confirmation avec `session_id`/`merci` n’initialisent aucun fournisseur. Retirer l’accord stoppe la collecte interne et recharge sans fournisseurs facultatifs. Ne jamais ajouter de paramètres personnels dans les campagnes.

GA4 reste optionnel (`analytics.ga4`). Pageviews automatiques désactivées, URL sans paramètres envoyée, pas de signaux publicitaires. Les outils tiers ont leurs propres règles de conservation; voir `/confidentialite/`.

## Conservation et soumissions

Rapports sur 1 / 7 / 30 jours; agrégats quotidiens en heure de Montréal. Purge quotidienne des événements âgés de plus de 30 jours, y compris si la collecte est désactivée. Les réservations et paiements existants ne sont pas supprimés par cette purge.

Le devis public prépare toujours un courriel manuel : `quote_prepared`, `email_open` et `summary_copy` ne sont pas un envoi ni une soumission reçue. Le raccordement Microsoft 365 / stockage de leads est distinct et n’est pas prétendu terminé.

## Vérification

`npm test` inclut PostgreSQL PGlite (migration, agrégats, isolement, droits, limitation et purge), sessions admin chiffrées, identité autorisée, CSRF, limitation, confidentialité du collecteur, refus des faux paiements, isolation test/live et remboursements partiels.

Contrôles navigateur : login/logout, filtres, tables, XSS, panne sans faux zéro, mobile 320/390/1440 px; refus et retrait du consentement; aucune donnée de formulaire envoyée; providers exclus des pages privées et de confirmation. Les fournisseurs et événements QA sont interceptés pour ne pas polluer les statistiques réelles. Les tests publics n’effectuent aucun paiement et ne modifient aucun stock.
