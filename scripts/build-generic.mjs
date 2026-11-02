import {readFileSync,writeFileSync} from 'node:fs';
// Même structure graphique que ChauCase, sans importer sa configuration ni son Checkout.
export function buildGeneric(){
 let html=readFileSync(new URL('../public/evenement.html',import.meta.url),'utf8');
 const replace=(old,value)=>{if(!html.includes(old))throw new Error('generic_template_changed: '+old.slice(0,70));html=html.replaceAll(old,value)};
 replace('<title>Pixanova Events</title>','<title>Pixanova — Location d’écrans LED pour votre événement</title>');
 replace('<link rel="stylesheet" href="css/landing.css">','<link rel="stylesheet" href="css/landing.css">\n<link rel="stylesheet" href="css/generic.css">');
 replace('Réservez vos écrans LED Pixanova pour votre événement.','Des écrans LED pour vos salons et événements. Choisissez vos dates et demandez un devis personnalisé.');
 replace('<meta property="og:title" content="Pixanova Events">','<meta property="og:title" content="Pixanova — Location d’écrans LED">');
 replace('Réservation d’écrans LED pour exposants.','Location d’écrans LED pour salons, congrès et événements professionnels.');
 replace('Activez JavaScript pour sélectionner votre événement. <a href="/">Retour aux événements</a>','Activez JavaScript pour vérifier les disponibilités. Pour un devis : <a href="mailto:info@pixanova.ca">info@pixanova.ca</a>.');
 replace('<div id="banner" class="banner"></div>','<div id="banner" class="banner over">Pour vos salons, congrès et événements professionnels</div>');
 replace('<span class="x">×</span><span class="chip sm"><img data-event-logo alt="Logo de l’événement"></span>','');
 html=html.replace(/<h1>Exposant[\s\S]*?<\/h1>/,'<h1>Votre marque mérite <em>plus qu’une affiche.</em> Donnez-lui vie sur nos écrans LED.</h1>');
 replace('<p class="event-dates" id="eventDates"></p>','<p class="event-dates">Salons · Congrès · Événements corporatifs</p>');
 replace("Réservez votre écran et on s'occupe de vous le livrer et de l'installer gratuitement.",'Choisissez vos écrans et vos dates. Nous préparons avec vous une solution adaptée à votre événement.');
 replace('<span class="pb-tag" id="pbTag">Prix early bird</span><span class="pb-save" id="pbSave"></span>','<span class="pb-tag">Tarif de référence</span>');
 replace('<s class="pb-was" id="pbWas"></s>','');
 replace('par écran, tout inclus, avant taxes','1 écran · avant taxes · devis personnalisé');
 replace('<ul class="trust"><li>Prix exclusif aux exposants <span data-event-name></span></li><li>Remboursable jusqu\'au <span data-refund-date></span></li><li>Livraison, installation et désinstallation incluses</li></ul>','<ul class="trust"><li>Un devis adapté à vos dates et à votre lieu</li><li>Accompagnement pour vos visuels</li><li>Livraison et installation organisées avec vous</li></ul>');
 replace('<div class="c-head"><span class="live"><i></i>En direct</span><span class="c-t"><b id="left">—</b> écrans restants sur <span data-total-screens></span></span></div>',`<div class="c-head"><span class="live"><i></i>Disponibilité</span><span class="c-t" id="availabilityCount">Choisissez vos dates</span></div>
<form id="availabilityForm" class="availability-form">
 <label for="rentalFrom">Livraison / installation souhaitée<input id="rentalFrom" name="from" type="date" required></label>
 <label for="rentalThrough">Reprise / désinstallation souhaitée<input id="rentalThrough" name="through" type="date" required></label>
 <button class="btn" type="submit">Vérifier mes dates</button>
</form>`);
 replace('<div class="note" id="counterNote"></div>','<p class="note" id="counterNote" role="status" aria-live="polite">Disponibilité issue de notre stock partagé, pour la période complète de mise à disposition. Vérifier ne réserve aucun écran.</p>');
 replace('Le même chemin pour tous les kiosques, petits ou grands.','Un accompagnement simple, de votre idée à votre événement.');
 replace('<h3>Réservez</h3><p>3 minutes en ligne, prix bloqué.</p>','<h3>Parlez-nous de votre projet</h3><p>Vos dates, votre lieu et le nombre d’écrans.</p>');
 replace('<span class="when">Aujourd\'hui</span>','<span class="when">Quand vous êtes prêt</span>');
 replace('<span class="when">Avant le <span data-artwork-date></span></span>','<span class="when">Selon le calendrier convenu</span>');
 replace('<span class="when" data-installation-date></span>','<span class="when">À la date convenue</span>');
 replace('Location pour tout le salon, avant taxes. Création de contenu en option.','Tarifs de référence avant taxes. Le devis précise la durée, la logistique et le prix final selon vos dates et votre lieu.');
 html=html.replace(/<span class="was" data-w="\d"><\/span>/g,'').replace(/<div class="save" data-s="\d"><\/div>/g,'');
 replace('Livraison et installation le <span data-installation-date></span>','Organisation de la livraison et de l’installation');
 replace('Assistance pendant tout le salon','Accompagnement pour votre événement');
 replace('Désinstallation à la fermeture','Reprise organisée avec vous');
 replace('Tout ce qui est inclus avec 1 écran','Le même accompagnement que pour 1 écran');
 html=html.replace(/<span class="sample-savings"[^>]*><\/span>/g,'').replace(/<del data-montage-(?:simple|animated)-regular hidden><\/del>/g,'');
 replace('  <p class="sample-duration-note" data-design-promo-deadline hidden></p>\n','');
 replace('La location pour le salon, la livraison, l’installation, la vérification des visuels, l’assistance et la désinstallation. La création de contenu est facultative. Les taxes s’ajoutent.','Les prix affichés sont des tarifs de référence. Votre devis précise la durée de location, les frais de livraison et d’installation éventuels, la reprise et les services retenus. La création de contenu est facultative. Les taxes s’ajoutent.');
 replace('JPEG, PNG ou MP4, avant le <span data-artwork-date-full></span>. Nous confirmons avec vous les dimensions selon le nombre d’écrans.','JPEG, PNG ou MP4. Nous convenons ensemble de la date de remise et des dimensions selon le nombre d’écrans.');
 replace("Oui. Remboursement complet jusqu'au <span data-refund-date-full></span>. Après cette date, la réservation n'est plus remboursable.",'Les conditions d’annulation et de remboursement sont précisées dans votre devis avant engagement. Contactez-nous pour étudier un changement de dates ou une annulation. Une demande de devis ne réserve aucun écran et n’entraîne aucun paiement.');
 replace('Le paiement est sécurisé par Stripe après vérification du récapitulatif. Pour payer par virement Interac, contactez notre équipe.','Aucun paiement n’est demandé sur cette page. Nous confirmons d’abord votre devis et les modalités de paiement avec vous.');
 replace('<div class="eyebrow">Le <span data-start-date></span>, vos concurrents auront une affiche</div>','<div class="eyebrow">Votre prochain événement mérite de se démarquer</div>');
 replace('<p class="lead" style="margin:0 auto" data-final></p>','<p class="lead" style="margin:0 auto">Vos dates, votre lieu, votre projet : parlons de la bonne configuration pour vous.</p>');
 // Aucun écran de faux paiement / liste d’attente spécifique à ChauCase.
 const start=html.indexOf('<!-- ============ MERCI ============ -->'),end=html.indexOf('<footer>');
 if(start<0||end<start)throw new Error('generic_routes_changed');html=html.slice(0,start)+html.slice(end);
 replace('Fournisseur officiel d\'écrans LED de <span data-event-full-name></span>','Écrans LED pour vos événements professionnels');
 replace('<span class="sk-cd"><i></i>Early bird : <b id="skCd">--</b></span>','<span class="sk-cd">Devis personnalisé</span>');
 replace('<span>par écran</span>','<span>tarif de référence</span>');
 replace('href="#offres" data-cta>Réserver mon écran','href="#offres" data-cta>Demander un devis');
 replace('href="#offres" data-cta>Réserver</a>','href="#offres" data-cta>Demander un devis</a>');
 for(const n of [1,2,3])replace(`>Réserver ${n} écran${n>1?'s':''}</a>`,`>Un devis pour ${n} écran${n>1?'s':''}</a>`);
 replace('<script type="module" src="js/config.js"></script>','<script type="module" src="js/generic.js"></script>');
 const dialog=`<dialog id="inquiryDialog" class="booking-dialog" aria-labelledby="inquiryTitle">
 <form id="inquiryForm">
  <div class="booking-header"><h2 id="inquiryTitle">Votre demande de devis</h2><button class="booking-close" type="button" id="inquiryClose" aria-label="Fermer">×</button></div>
  <p>Aucun paiement ni réservation à cette étape. Nous confirmons le prix et les conditions avec vous.</p>
  <div class="inquiry-grid">
   <label for="inquiryName">Votre nom<input id="inquiryName" name="name" autocomplete="name" maxlength="100" required></label>
   <label for="inquiryCompany">Entreprise<input id="inquiryCompany" name="company" autocomplete="organization" maxlength="100"></label>
   <label for="inquiryEmail">Courriel<input id="inquiryEmail" name="email" type="email" autocomplete="email" maxlength="150" required></label>
   <label for="inquiryPhone">Téléphone<input id="inquiryPhone" name="phone" type="tel" autocomplete="tel" maxlength="40"></label>
   <label for="inquiryLocation">Lieu de l’événement<input id="inquiryLocation" name="location" maxlength="200" placeholder="Ville, salle ou adresse" required></label>
   <label for="inquiryScreens">Nombre d’écrans<select id="inquiryScreens" name="screens"></select></label>
   <label for="inquiryFrom">Livraison / installation souhaitée<input id="inquiryFrom" name="from" type="date" required></label>
   <label for="inquiryThrough">Reprise / désinstallation souhaitée<input id="inquiryThrough" name="through" type="date" required></label>
  </div>
  <label for="inquiryDesign">Création de contenu<select id="inquiryDesign" name="montage"></select></label>
  <label for="inquiryNotes">Précisions sur votre projet<textarea id="inquiryNotes" name="notes" rows="3" maxlength="500"></textarea></label>
  <p id="inquiryAvailability" role="status" aria-live="polite"></p>
  <button class="btn dark" type="submit">Préparer ma demande par courriel</button>
  <div id="inquiryResult" hidden>
   <label for="inquirySummary">Récapitulatif à envoyer<textarea id="inquirySummary" readonly rows="9"></textarea></label>
   <div class="inquiry-actions"><a class="btn dark" id="inquiryMail">Ouvrir mon application courriel</a><button class="btn outline" id="inquiryCopy" type="button">Copier le récapitulatif</button></div>
   <p>Votre demande n’est pas envoyée automatiquement. Envoyez le courriel à <a href="mailto:info@pixanova.ca">info@pixanova.ca</a>, ou utilisez notre <a data-contact-site href="https://www.pixanova.ca/contact" target="_blank" rel="noopener">formulaire de contact</a>.</p>
  </div>
  <p class="inquiry-privacy">Vos coordonnées ne sont pas enregistrées sur cette page. Elles seront transmises si vous envoyez votre courriel. <a href="https://www.pixanova.ca/legal/politique-de-confidentialite" target="_blank" rel="noopener">Politique de confidentialité</a></p>
 </form>
</dialog>\n`;
 replace('<script type="module" src="js/generic.js"></script>',dialog+'<script type="module" src="js/generic.js"></script>');
 if(/data-(?:event-name|refund-date|artwork-date|installation-date|start-date)|Early bird|data-design-promo|data-montage-.*-saving/.test(html))throw new Error('generic_event_copy_remaining');
 html=html.replace('<!doctype html>','<!doctype html>\n<!-- Généré par scripts/build-generic.mjs depuis evenement.html : modifier le générateur, puis npm run build. -->');
 writeFileSync(new URL('../public/index.html',import.meta.url),html.replace(/[\t ]+$/gm,''));
}
