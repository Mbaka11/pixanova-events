# Pixanova Events

Plateforme de location d’écrans LED : accueil générique avec demande de devis à `/`, liste des événements à `/evenements/`, et pages de salons avec réservation Stripe inchangées. Stock partagé Supabase selon les dates. Détails : [Accueil générique](docs/GENERIC-LANDING.md).

**État : production active sur https://events.pixanova.ca.** Stripe réel, TPS/TVQ réelles, stock transactionnel Supabase LIVE et webhook réel raccordés. Checkout réel vérifié sans paiement, puis notre session expirée : stock 20 → 19 → 20. Le développement local reste en test, séparé du stock réel. Les courriels Stripe suffisent au périmètre retenu ; Resend est facultatif. Détails : [docs/SUPABASE-EVENTS.md](docs/SUPABASE-EVENTS.md).

**Pour ChauCase :** forfaits de contenu **création graphique 149 $ / 5 h**, **motion design 249 $ / 10 h**, avant taxes et sans supplément selon la quantité. Tarifs early bird jusqu’au 15 décembre inclus (Montréal); ensuite **300 $ / 500 $** pour la création. Affichage simplifié : **−50 %** avec prix réguliers barrés; tarifs réguliers futurs, pas un historique de prix pratiqués. Accueil compact, modale sans jargon, nom du contact requis dans Stripe et confirmation avec résumé ligne par ligne. Livraison et installation affichées comme offertes, sans réduction fictive.

**Accueil générique :** tarifs journaliers avant taxes, 530 $ pour 1 écran, 930 $ au total pour 2, 1300 $ au total pour 3, 1733,33 $ au total pour 4. Les prix journaliers sont fermes au cent pour chaque quantité, sans approximation ni moyenne par écran. L’estimation utilise les jours calendaires d’utilisation (début et fin inclus), avec création ajoutée une seule fois; dates/frais logistiques et prix final confirmés au devis. Aucune réservation ni transaction Stripe dans ce parcours.

## Administration et statistiques

Accès privé à `/admin/`, rôle admin unique : vue d’ensemble, parcours/paniers observés, marketing et réservations. Les événements comportementaux sont collectés uniquement après consentement; les encaissements proviennent de Stripe et les réservations de Supabase. Aucun clic historique non collecté n’est reconstitué. Netlify est proposé en accès direct (pas d’API Web Analytics publique stable); Clarity reste désactivé tant que son ID de projet n’est pas configuré. Détails de sécurité, installation et limites : [docs/ADMIN-ANALYTICS.md](docs/ADMIN-ANALYTICS.md).

## Développement

Node.js 22 ou plus récent.

```bash
npm ci
npm run dev
```

- Accueil générique (devis, sans rabais) : http://localhost:8080/
- Liste des événements : http://localhost:8080/evenements/
- ChauCase : http://localhost:8080/evenement.html?event=chaucase-2027

Rechargement automatique du HTML/CSS/JS, mais aussi de `config/` et `shared/`.

```bash
npm test       # validation de configuration + tests métier
npm run build # génère les données publiques à partir de config/
```

`npm run dev:full` lance le site avec les fonctions sur http://localhost:8888 (CLI Netlify incluse dans les dépendances). Pour le transfert des événements Stripe, lancer `npm run stripe:listen` dans un autre terminal. Voir [le guide de test Stripe local](docs/STRIPE-LOCAL.md).

Le serveur statique seul sur le port 8080 ne fournit pas `/api/stock` ni `/api/availability` : l’interface indique alors « Stock à confirmer » plutôt qu’un faux stock de 20.

## Organisation

```text
config/
  platform.json              Marque, contact, parc commun de 20 écrans
  events/chaucase-2027.json   Identité, dates, prix et médias du salon
  catalog.mjs                Registre des événements
shared/events.mjs            Validation, dates, prix (communs au site et au serveur)
shared/montage.mjs           Options et prix du montage
shared/order.mjs             Total de commande et taxes arrondies par ligne
public/
  index.html                 Sélection de l’événement
  evenement.html             Modèle commun (design des trois fiches conservé)
  js/catalog.js              Accueil
  js/config.js               Alimentation du modèle par l’événement choisi
  js/main.js                 Animation, fiches, navigation
  js/booking-dialog.js       Récapitulatif accessible avant paiement
  css/                       Styles
  assets/                    Images et vidéos web
server/                      Fonctions Stripe et disponibilité partagée
scripts/                     Génération de configuration et serveur de développement
test/                        Tests métier
docs/                        Contexte, plan et mode d’emploi
media-sources/               Originaux locaux, ignorés par Git
temp/                        Captures et essais locaux, ignorés par Git
```

Le français est la langue par défaut. Le sélecteur FR / EN active l’anglais avec `?lang=en`, y compris les dates, les prix et les retours Stripe. Exemple : http://localhost:8080/evenement.html?event=chaucase-2027&lang=en. Les vidéos et logos restent dans leur langue d’origine.

Textes communs : `shared/i18n.mjs`. Descriptions propres à un salon : `translations.en` dans son fichier JSON. Les noms de marque ne sont pas traduits automatiquement.

## Déploiement

Dépôt public : https://github.com/Mbaka11/pixanova-events

Netlify lit `netlify.toml` : `npm run build`, publication de `public/`, fonctions dans `server/`. Les clés Stripe vont uniquement dans `.env` et les variables Netlify. **Tout le contenu de `config/` est public : aucun secret ne doit y être placé.**

Le dossier local porte encore le nom historique `PixaNova-chaucase` : ton fichier `.env` reste au même endroit. Le dépôt, le package et la plateforme s’appellent maintenant Pixanova Events.

## Documentation

- [Contexte actuel](docs/CONTEXTE.md)
- [Configurer et ajouter un événement](docs/EVENEMENTS.md)
- [Plan à suivre](docs/PLAN.md)
- [API et limites du serveur](server/README.md)
- [Serveur et essais Stripe locaux](docs/STRIPE-LOCAL.md)

Les anciens `HANDOFF.md`, `GUIDE-LANCEMENT.md` et `docs/archive/` sont historiques; leurs instructions monoévénement ne définissent plus l’architecture actuelle.
