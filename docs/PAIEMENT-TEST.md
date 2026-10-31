# Page de validation à 1 CAD

URL : `https://events.pixanova.ca/test` (FR par défaut ; `?lang=en` pour EN).

- Paiement **réel** de **1 CAD au total**, séparé des locations.
- Stripe Payment Link à prix et quantité fixes, sans code promotionnel, sans achat de contenu et sans création de facture PDF payante.
- Lien limité à **un paiement complété** ; il est ensuite désactivé par Stripe. Il n'est pas réactivé automatiquement après remboursement.
- Aucun identifiant d'événement ni de parc dans les métadonnées : le webhook de réservation ignore ce paiement, le stock de 20 écrans n'est pas touché.
- URL directe, pas de lien dans la navigation, meta robots et en-têtes `X-Robots-Tag: noindex, nofollow, noarchive`. **Ce n'est pas une page authentifiée** : toute personne disposant du lien peut y accéder.
- La page ne collecte aucune carte ni aucun courriel ; la saisie se fait dans Stripe. La confirmation reste hébergée par Stripe, jamais déclenchée par un simple paramètre d'URL.
- Reçus client et notifications d'équipe : réglages Stripe existants, sans Resend. La réception doit être vérifiée dans les boîtes courriel et les indésirables après le paiement réel.

## Création / récupération du lien

```sh
node scripts/create-payment-test-link.mjs --live
```

La commande lit le bloc réel commenté privé du `.env`, conserve le mode test local, réutilise le lien portant la métadonnée `pixanova_live_validation_1cad_v1` et écrit uniquement son URL publique dans `public/js/payment-test-config.js`. Aucun débit n'est effectué par cette commande. Si le lien est consommé, ne pas créer une nouvelle version sans demande explicite.

## Remboursement après vérification

```sh
node scripts/refund-payment-test.mjs --live
```

La commande exige exactement un paiement confirmé de 100 cents CAD sur le lien effectivement publié, avec la bonne métadonnée et le mode réel. Elle ignore tous les paiements de location, détecte un remboursement déjà effectué et utilise une clé d'idempotence. Aucun remboursement n'est exposé par une route web publique.

Le retour des fonds dépend des délais bancaires ; les frais de traitement Stripe peuvent rester à la charge de Pixanova. Ne pas prétendre que le paiement ou les courriels sont vérifiés tant que la personne n'a pas réellement payé et contrôlé les messages.
