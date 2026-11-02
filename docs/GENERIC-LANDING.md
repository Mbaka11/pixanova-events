# Accueil générique et événements

## Routes

- `/` : location générique Pixanova, sans rabais ni échéance de salon; **demande de devis, aucun paiement direct**.
- `/evenements/` : ancienne liste des événements, conservée dans un chemin dédié.
- `/evenement.html?event=chaucase-2027` : page ChauCase inchangée commercialement (early bird, paiement Stripe, dates fixes, stock transactionnel). Les liens existants et retours Stripe restent valides.
- `?lang=en` fonctionne sur les trois parcours.

Aucun lien public vers la liste des événements depuis l’accueil ou les pages de salon. Le logo mène à `/`. Les liens personnalisés restent utilisables et la liste existe encore à son adresse directe, sans navigation publique. La liste et les pages de salon ont une directive `noindex, nofollow`; ce n’est pas une authentification ni une garantie de confidentialité.

## Source et génération

`config/generic.json` contient les tarifs de référence de location (795 / 1395 / 650 par écran dès 3), le maximum de 10 écrans et les vidéos de présentation. Les forfaits de création utilisent les **tarifs réguliers** de `config/platform.json` (300 / 500, 5 / 10 h, soit 60 / 50 $ par heure).

`npm run build` génère `public/index.html` à partir de `public/evenement.html` via `scripts/build-generic.mjs`. Cela conserve la même DA, l’animation, les exemples, témoignages, contact et attribution. Le générateur retire promotions, dates fixes, co-branding de salon et écrans de confirmation de paiement; il échoue si les ancres de transformation ont changé. Modifier le générateur, **pas uniquement le fichier d’accueil généré**. La liste conserve son fichier indépendant `public/evenements/index.html`.

Le contrôleur générique `public/js/generic.js` est distinct du contrôleur de paiement `config.js/main.js`; il n’importe pas le Checkout.

## Prix et conditions

Les prix de location sont des **forfaits de référence de 3 jours** (`referenceDays: 3`, confirmé par l’opérateur), pas une tarification arbitraire à la journée. Le forfait d’un écran reste à 795 $, et non 695 $. Aucun prorata journalier n’est inventé. Le devis doit confirmer durée, lieu, frais logistiques éventuels, taxes et prix final. La page générique ne promet pas une installation gratuite partout. Aucune règle d’annulation propre à ChauCase ne s’applique automatiquement : les conditions sont précisées au devis avant engagement.

La page d’accueil, le contact et la politique de confidentialité du site principal Pixanova ont été consultés. Aucune politique publique d’annulation/remboursement n’a été trouvée pendant cette vérification. Ne pas inventer de délai légal ou contractuel à partir de la confidentialité.

## Stock par dates

`GET /api/availability` retourne seulement la capacité **lue en base** et `needsDates:true`, sans nombre de disponibles inventé.

`GET /api/availability?from=2027-02-01&through=2027-02-04` vérifie les jours de livraison/installation jusqu’à la reprise/désinstallation **incluse**. Conversion en minuits du fuseau `America/Toronto`, y compris changements d’heure : période semi-ouverte `[1 février 00:00, 5 février 00:00[`. Le résultat vient du même parc Supabase et du même pic d’utilisation que les événements; réservations hors ligne incluses. Aucune réservation ni donnée personnelle n’est renvoyée.

Le bloc public de disponibilité et ses champs ont été retirés de l’accueil pour alléger le parcours. Aucun appel de stock ni polling n’a lieu à l’ouverture de l’accueil. La disponibilité reste vérifiée uniquement à la préparation de la demande de devis, avec les dates du formulaire. Aucun écran n’est bloqué. Dates passées, incomplètes, inversées, non réelles ou trop longues refusées. Le serveur n’accepte pas un prix du navigateur et n’effectue aucune écriture.

Les 19 écrans disponibles pour ChauCase ne sont pas une disponibilité universelle : une autre période peut disposer de 20 écrans.

## Demande de devis

Le formulaire recueille nom, courriel, entreprise/téléphone facultatifs, lieu, dates, nombre d’écrans, création et notes. Il revérifie le stock et prépare un récapitulatif lisible et un lien `mailto:`.

**Aucun envoi automatique, lead sauvegardé ou notification d’envoi fictive.** Le client doit envoyer son courriel via son application. Le récapitulatif peut être copié et envoyé à `info@pixanova.ca`; le formulaire de contact principal est également accessible. Aucune coordonnée n’est stockée dans la base, le navigateur via localStorage/sessionStorage, les URL de disponibilité ou les logs applicatifs. Pas de nouveau fournisseur d’email. Toute future collecte persistante ou livraison automatique est un changement distinct.

## QA

`test/generic.test.mjs` couvre références de prix, bornes et fuseau des dates, 23/25 h aux changements d’heure, API sans dates, erreurs, confidentialité et séparation des parcours. Les tests existants continuent de vérifier le stock et le Checkout ChauCase. Contrôler aussi le rendu FR/EN à 320 / 390 / 1440 px, l’absence de liens vers la liste et du bloc disponibilité, les liens personnalisés ChauCase, le forfait 3 jours, le devis sans envoi, l’absence d’appels Checkout et le stock inchangé après les demandes.
