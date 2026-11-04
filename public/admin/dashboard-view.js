import {timeline,bars,funnel} from './charts.js';
import {stageCount,rentalFunnel,quoteFunnel,cartPreferences,timelineData,sectionNames} from './view-data.mjs';
export function renderDashboard(data,{$,money,number,date,node,empty,table,link,names,states,montage,metric}){
 $('environment').textContent=data.environment==='live'?'Paiements réels':'Mode test';$('environment').className='badge'+(data.environment==='live'?'':' test');
 $('updated').textContent='Actualisé le '+date(data.generatedAt);
 const selected=$('event').value;$('event').replaceChildren(new Option('Toutes les pages',''),...data.events.map(e=>new Option(e.name,e.id)));$('event').value=selected;
 const pageName=id=>data.events.find(e=>e.id===id)?.name||id;
 const telemetry=data.telemetry,report=telemetry.report,stripe=data.stripe,business=data.business,stripeReady=stripe.available&&!stripe.notApplicable;
 const measured=telemetry.available,views=measured?report?.totals?.views:null,sessions=measured?report?.totals?.sessions:null;
 const opens=measured?stageCount(report,'cart_open','events')+stageCount(report,'quote_open','events'):null;
 $('metrics').replaceChildren(
  metric('Visites suivies',number(sessions),measured?`${number(views)} pages vues avec accord du visiteur`:'Suivi de navigation indisponible'),
  metric('Paniers / devis ouverts',number(opens),measured?`${number(stageCount(report,'begin_checkout'))} passage(s) vers Stripe, pas forcément payé(s)`:'Suivi du parcours indisponible'),
  metric('Paiements confirmés',number(stripeReady?stripe.paid:null),'Source Stripe, indépendante du suivi des clics'),
  metric('Montant encaissé TTC',money(stripeReady&&stripe.unverifiedPayments===0?stripe.netCents:null),'Remboursements déduits, avant frais Stripe')
 );
 const warnings=[];if(!measured)warnings.push('Le suivi de navigation ne répond pas. Les chiffres manquants ne sont pas remplacés par des zéros.');else if(!telemetry.enabled)warnings.push('Le suivi est en pause : seules les données déjà collectées sont affichées.');
 if(!business.available)warnings.push('Réservations momentanément indisponibles.');if(!stripe.available)warnings.push('Les paiements Stripe ne répondent pas pour le moment.');
 if(stripe.truncated||business.truncated)warnings.push('Résultat partiel : réduisez la période pour voir tous les résultats.');
 if(stripe.unverifiedPayments)warnings.push('Certains montants ne sont pas vérifiables : total financier masqué.');
 $('reportStatus').textContent=warnings.join(' ');$('reportStatus').className=warnings.length?'warning':'';$('reportStatus').hidden=warnings.length===0;
 if(!measured){$('takeawayTitle').textContent='Les données de navigation sont indisponibles';$('takeawayText').textContent='Ce problème de lecture ne signifie pas qu’il n’y a aucun visiteur.';$('sampleNote').textContent='Les paiements et réservations restent des sources séparées.'}
 else if(!sessions){$('takeawayTitle').textContent=telemetry.enabled?'Le suivi est prêt, les données démarrent':'Le suivi est en pause';$('takeawayText').textContent='Aucune visite suivie sur cette période. Pour un premier essai, ouvrez une page publique et acceptez les statistiques. Visiter cet admin ne compte pas.';$('sampleNote').textContent='Les visites ayant refusé le suivi et les visites antérieures à l’installation ne figurent pas ici.'}
 else{
  $('takeawayTitle').textContent=sessions<10?'Vos premières visites deviennent visibles':'Voici l’activité de la période';
  $('takeawayText').textContent=`${number(sessions)} visite${sessions>1?'s':''} suivie${sessions>1?'s':''}, ${number(views)} page${views>1?'s':''} vue${views>1?'s':''} et ${number(opens)} ouverture${opens>1?'s':''} de panier ou de devis. Côté paiements : ${stripeReady?number(stripe.paid)+' paiement'+(stripe.paid>1?'s':'')+' confirmé'+(stripe.paid>1?'s':'')+' par Stripe':'source séparée, à consulter ci-dessous'}.`;
  $('sampleNote').textContent=sessions<10?'Il y a encore peu de visites mesurées : ce n’est pas suffisant pour conclure qu’un prix, un bouton ou une offre fonctionne mieux.':'Comparez les périodes et les pages avant de changer une offre. Les clics ne sont pas des paiements.';
 }
 if(measured){
  timeline($('trend'),timelineData(report.days||[]));
  const preferences=cartPreferences(report.carts||[]);
  bars($('packChart'),preferences.packs,{empty:'Aucun choix d’écran observé pour le moment.'});bars($('designChart'),preferences.designs,{empty:'Aucun choix de création observé pour le moment.'});
  funnel($('rentalFunnel'),rentalFunnel(report),{empty:'Aucun panier de réservation suivi sur cette période.'});
  funnel($('quoteFunnel'),quoteFunnel(report),{empty:'Aucune demande de devis suivie sur cette période.'});
  $('rentalJourney').hidden=data.eventId==='generic';$('quoteJourney').hidden=!!data.eventId&&data.eventId!=='generic';
  table('funnelDetails',['Action mesurée','Parcours ayant fait cette action','Nombre de fois'],(report.funnel||[]).map(r=>[names[r.name]||r.name,number(r.sessions),number(r.events)]));
  table('pages',['Page','Pages vues','Visites suivies'],(report.pages||[]).map(r=>[pageName(r.event_id),number(r.views),number(r.sessions)]));
  bars($('pagesChart'),(report.pages||[]).map(r=>({label:pageName(r.event_id),value:r.views})),{empty:'Aucune page vue mesurée pour le moment.'});
  const sources=new Map();for(const row of report.sources||[]){const key=row.source||'direct';sources.set(key,(sources.get(key)||0)+row.views)}
  bars($('sourceChart'),[...sources].sort((a,b)=>b[1]-a[1]).slice(0,6).map(([label,value])=>({label:label==='direct'?'Accès direct ou source inconnue':label,value})),{empty:'Les sources apparaîtront avec les premières pages vues mesurées.'});
  table('sources',['Source','Support','Campagne','Pages vues','Visites suivies'],(report.sources||[]).map(r=>[r.source,r.medium||'—',r.campaign||'—',number(r.views),number(r.sessions)]));
  table('carts',['Dernière observation','Page','Écrans choisis','Création choisie','Dernière action','Montant du récapitulatif'],(report.carts||[]).map(r=>[date(r.created_at),pageName(r.event_id),number(r.props.screens),montage(r.props.montage),names[r.name]||r.name,money(r.props.totalCents)+(Number.isSafeInteger(r.props.totalCents)?r.props.amountBasis==='tax_included'?' TTC':' avant taxes':'')]));
  if(telemetry.interactions?.available){
   bars($('reachChart'),telemetry.interactions.sections.map(r=>({label:sectionNames[r.section]||r.section,value:r.seenSessions})),{empty:'La profondeur de lecture apparaîtra quand des visiteurs feront défiler la page.'});
   bars($('clickChart'),telemetry.interactions.sections.map(r=>({label:sectionNames[r.section]||r.section,value:r.clicks})),{empty:'Aucun clic sur les boutons de devis ou de réservation n’a encore été mesuré.'});
   $('interactionNote').textContent=telemetry.interactions.truncated?'Ces deux graphiques portent sur les 1 000 dernières observations. Réduisez la période pour le détail.':'Les clics mesurés ici concernent les boutons de devis et de réservation. Clarity permet de voir toutes les zones cliquées.';
  }else{empty('reachChart','La profondeur de lecture est momentanément indisponible.');empty('clickChart','Le détail des clics est momentanément indisponible.');$('interactionNote').textContent=''}
 }else{
  for(const id of ['trend','funnelDetails','rentalFunnel','quoteFunnel','packChart','designChart','pages','pagesChart','sources','sourceChart','carts','reachChart','clickChart'])empty(id,'Données indisponibles pour le moment.');
 }
 if(stripe.notApplicable){empty('payments','Cette page fonctionne sur devis, sans paiement direct.');empty('paymentChart','Les demandes de devis ne sont pas des paiements.')}
 else if(stripe.available){
  bars($('paymentChart'),[{label:'Paiements confirmés',value:stripe.paid},{label:'Paiements encore ouverts',value:stripe.open},{label:'Sessions expirées sans paiement',value:stripe.expired},{label:'Paiements non confirmés',value:stripe.asyncPending}],{empty:'Aucune session Stripe du parc créée sur cette période.'});
  table('payments',['Indicateur','Résultat'],[['Sessions Stripe du parc',number(stripe.sessions)],['Encore ouvertes',number(stripe.open)],['Expirées sans paiement',number(stripe.expired)],['Payées',number(stripe.paid)],['Taux de paiement des sessions Stripe',!stripe.truncated&&stripe.sessions?`${(stripe.paid/stripe.sessions*100).toFixed(1)} %`:'—'],['Remboursements TTC',money(stripe.refundedCents)]]);
 }else{empty('payments','Les paiements ne répondent pas pour le moment.');empty('paymentChart','Source Stripe indisponible.')}
 $('notes').replaceChildren(...data.notes.map(text=>node('li',text)));
 if(business.available){
  const c=business.counts;$('reservationCounts').textContent=`${c.total} réservations créées sur la période, dont ${c.offline} hors ligne. ${c.paid} payées en base; ${c.pending} paiements en attente; ${c.review} à examiner.`;
  table('orders',['Créée le','Événement','Écrans','Situation','Création','Récapitulatif TTC','Paiement'],business.reservations.slice(0,100).map(r=>[date(r.createdAt),pageName(r.eventId),number(r.screens),r.offline?'Hors ligne · paiement non enregistré':states[r.state]||r.state,montage(r.montage),money(r.expectedTotalCents),/^pi_[A-Za-z0-9]+$/.test(r.stripePaymentIntentId||'')?link('Voir dans Stripe',`https://dashboard.stripe.com/${data.environment==='test'?'test/':''}payments/${r.stripePaymentIntentId}`):'—']));
 }else{$('reservationCounts').textContent='Les réservations ne répondent pas pour le moment.';empty('orders','Réservations indisponibles.')}
 const clarity=data.integrations.clarity;$('clarityCard').hidden=!clarity.configured;$('clarityActions').replaceChildren();
 if(clarity.configured){$('clarityActions').append(link('Voir les cartes de chaleur',clarity.heatmapsUrl||clarity.url),link('Relire une navigation',clarity.recordingsUrl||clarity.url))}
 const integrations=[];const nf=node('div',undefined,'integration-note');nf.append(node('h3','Netlify : statistiques globales optionnelles'),node('p','Netlify peut montrer le trafic serveur, y compris des visites absentes du suivi consenti. Ces chiffres ne sont pas importés automatiquement ici. Un forfait Netlify adapté peut être nécessaire.'),link('Consulter les statistiques Netlify',data.integrations.netlify.url));integrations.push(nf);
 if(data.integrations.ga4.configured){const ga=node('div',undefined,'integration-note');ga.append(node('h3','Google Analytics configuré'),link('Ouvrir Google Analytics',data.integrations.ga4.url));integrations.push(ga)}
 $('integrations').replaceChildren(...integrations);
}
