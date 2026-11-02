import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {catalog} from '../config/catalog.mjs';
import {availabilityPeriod,referenceRentalPrice,validateGenericConfig,dailyRentalPrice,usageDays,computeGenericEstimate} from '../shared/generic.mjs';
import {makeHandler} from '../server/availability.mjs';
import {makeHandler as checkoutHandler} from '../server/create-checkout.mjs';
import {makeHandler as quoteHandler} from '../server/quote.mjs';
const now=()=>Date.parse('2026-01-01T12:00:00Z');
const request=query=>new Request('https://example.test/api/availability'+query);
test('tarifs génériques réguliers sans remise ni durée inventée',()=>{
 assert.equal(catalog.generic.referenceDays,3);
 assert.equal(referenceRentalPrice(catalog.generic,1),159000);assert.equal(referenceRentalPrice(catalog.generic,2),279000);assert.equal(referenceRentalPrice(catalog.generic,3),390000);assert.equal(referenceRentalPrice(catalog.generic,10),1300000);
 assert.throws(()=>referenceRentalPrice(catalog.generic,0));assert.throws(()=>referenceRentalPrice(catalog.generic,11));
 assert.throws(()=>validateGenericConfig({...catalog.generic,pricing:{one:-1}}));
});
test('prix journaliers doublés, fermes au cent et multipliés exactement par les jours',()=>{
 const rates=[53000,93000,130000,173333,216667,260000,303333,346667,390000,433333];
 for(let n=1;n<=10;n++){
  const daily=dailyRentalPrice(catalog.generic,n);assert.equal(daily,rates[n-1]);assert.ok(Number.isSafeInteger(daily));
  for(const days of [1,2,3,7]){
   const estimate=computeGenericEstimate(catalog.generic,catalog.platform,n,days);
   assert.equal(estimate.dailyCents,daily);assert.equal(estimate.rentalCents,daily*days);
  }
 }
 assert.equal(computeGenericEstimate(catalog.generic,catalog.platform,4,2).rentalCents,346666);
 assert.equal(computeGenericEstimate(catalog.generic,catalog.platform,4,3).rentalCents,519999);
});
test('jours calendaires d’utilisation inclusifs, indépendamment des changements d’heure',()=>{
 assert.equal(usageDays('2027-02-02','2027-02-02'),1);assert.equal(usageDays('2027-02-02','2027-02-04'),3);
 assert.equal(usageDays('2026-03-07','2026-03-09'),3);assert.equal(usageDays('2026-10-31','2026-11-02'),3);
 for(const dates of [['2027-02-04','2027-02-02'],['2026-02-30','2026-03-01'],['2027-01-01','2028-01-02']])assert.throws(()=>usageDays(...dates));
});
test('estimation : création ajoutée une seule fois, avant taxes et sans logistique inventée',()=>{
 const first=computeGenericEstimate(catalog.generic,catalog.platform,2,1,'animated');
 const long=computeGenericEstimate(catalog.generic,catalog.platform,2,3,'animated');
 assert.equal(first.rentalCents,93000);assert.equal(first.montageCents,50000);assert.equal(first.subtotalCents,143000);
 assert.equal(long.rentalCents,279000);assert.equal(long.montageCents,50000);assert.equal(long.subtotalCents,329000);
 for(const days of [0,-1,1.5,Infinity,367])assert.throws(()=>computeGenericEstimate(catalog.generic,catalog.platform,1,days));
 assert.throws(()=>computeGenericEstimate(catalog.generic,catalog.platform,0,1));
 assert.throws(()=>computeGenericEstimate(catalog.generic,catalog.platform,1,1,'bad'));
});
test('dates de disponibilité : période incluse, fuseau Montréal et changements d’heure',()=>{
 const opts={now:now()};
 const chaucase=availabilityPeriod('2027-02-01','2027-02-04',opts);
 assert.deepEqual(chaucase,{rentalStartsAt:'2027-02-01T05:00:00.000Z',rentalEndsAt:'2027-02-05T05:00:00.000Z'});
 for(const [date,hours]of [['2026-03-08',23],['2026-11-01',25],['2026-06-01',24]]){
  const p=availabilityPeriod(date,date,opts);assert.equal((Date.parse(p.rentalEndsAt)-Date.parse(p.rentalStartsAt))/3600000,hours);
 }
 for(const [from,through]of [['2026-02-30','2026-03-01'],['2027-02-04','2027-02-01'],['2025-12-31','2026-01-01'],['2027-01-01','2028-01-03'],['2031-01-01','2031-01-02'],['2027-01-01',null]])assert.throws(()=>availabilityPeriod(from,through,opts));
});
test('sans dates : capacité uniquement, jamais 19 disponibles universellement',async()=>{
 const handler=makeHandler(()=>({assertReady:async()=>({capacity:20})}),now);
 const response=await handler(request(''));const body=await response.json();
 assert.equal(response.status,200);assert.deepEqual(body,{total:20,needsDates:true});assert.equal(body.remaining,undefined);
 assert.equal(response.headers.get('cache-control'),'no-store');
});
test('dates libres : lecture du même parc, sans écriture ni fuite de réservation',async()=>{
 let received;
 const handler=makeHandler(()=>({stock:async event=>{received=event;return {total:20,taken:1,remaining:19,secret:'never_expose'}}}),now);
 const response=await handler(request('?from=2027-02-01&through=2027-02-04'));const body=await response.json();
 assert.equal(response.status,200);assert.equal(body.remaining,19);assert.equal(body.total,20);assert.equal(body.informational,true);assert.equal(body.secret,undefined);
 assert.equal(received.dates.rentalStartsAt,'2027-02-01T05:00:00.000Z');assert.equal(received.dates.rentalEndsAt,'2027-02-05T05:00:00.000Z');
});
test('dates invalides et méthode invalide : aucun appel à la base',async()=>{
 const handler=makeHandler(()=>{throw Error('must not reach database')},now);
 for(const query of ['?from=2027-02-01','?through=2027-02-01','?from=invalid&through=2027-02-01','?from=2027-02-04&through=2027-02-01'])assert.equal((await handler(request(query))).status,400);
 assert.equal((await handler(new Request('https://example.test/api/availability',{method:'POST'}))).status,405);
});
test('panne de stock : indisponibilité explicite, aucun faux 20 disponibles',async()=>{
 const handler=makeHandler(()=>({assertReady:async()=>{throw Error('offline')},stock:async()=>{throw Error('offline')}}),now);
 for(const query of ['','?from=2027-02-01&through=2027-02-04']){const response=await handler(request(query));assert.equal(response.status,503);assert.deepEqual(await response.json(),{error:'stock_unavailable'})}
});
test('un événement générique ne permet pas de contourner le devis pour payer',async()=>{
 const stripe=()=>{throw Error('Aucun accès Stripe autorisé')};
 for(const handler of [checkoutHandler(stripe,now),quoteHandler(stripe,now)]){
  const response=await handler(new Request('https://example.test/api/checkout',{method:'POST',body:JSON.stringify({eventId:'generic',screens:1,montage:'animated'})}));
  assert.equal(response.status,404);
 }
});
test('séparation des trois parcours, accueil sans promotions ni Checkout',()=>{
 const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
 const home=read('public/index.html'),list=read('public/evenements/index.html'),event=read('public/evenement.html');
 assert.match(home,/js\/generic.js/);assert.doesNotMatch(home,/js\/config.js|Early bird|data-montage-simple-saving|data-route="\/merci"|data-refund-date/);
 assert.match(home,/id="inquiryDialog"/);assert.doesNotMatch(home,/href="\/evenements\/"|id="counter"|id="availabilityForm"|id="stkL"/);assert.match(list,/js\/catalog.js/);
 assert.match(home,/Tarif journalier/);assert.match(home,/Début d’utilisation à l’événement/);assert.match(home,/id="inquiryEstimate"/);assert.doesNotMatch(home,/Forfait 3 jours|forfait de location de 3 jours/);assert.doesNotMatch(home,/noindex/);
 assert.match(event,/js\/config.js/);assert.doesNotMatch(event,/href="\/evenements\/"/);assert.match(event,/id="skCd"/);
 assert.match(event,/noindex, nofollow/);assert.match(list,/noindex, nofollow/);
 const genericJS=read('public/js/generic.js');assert.doesNotMatch(genericJS,/\/api\/checkout|\/api\/quote|localStorage|sessionStorage|≈/);
});
