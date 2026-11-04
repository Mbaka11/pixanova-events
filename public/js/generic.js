import catalog from './catalog-data.js';
import {copy,money} from './i18n.mjs';
import {genericEnglish,genericCopy} from './generic-i18n.mjs';
import {dailyRentalPrice,computeGenericEstimate,usageDays,availabilityPeriod,localDate} from './generic-shared.mjs';
import {montagePrice,montageHours,montageChoices} from './montage.mjs';
import {language,translateStaticDOM,installLanguageSwitcher} from './language.js';
import {initGenericPresentation} from './generic-presentation.js';
import {createAnalytics} from './analytics.js';
const {platform,generic}=catalog,ui=copy(language),g=genericCopy(language);
const stats=createAnalytics({eventId:'generic',language,settings:platform.analytics});
const track=(name,props={})=>stats.track(name,{amountBasis:'before_tax',...props});
translateStaticDOM(genericEnglish);installLanguageSwitcher();
document.title=g.title;document.querySelector('meta[property="og:title"]').content=g.title;
const description=ui.en?'LED screens for trade shows and events. Choose your dates and request a custom quote.':'Des écrans LED pour vos salons et événements. Choisissez vos dates et demandez un devis personnalisé.';
document.querySelector('meta[name="description"]').content=description;document.querySelector('meta[property="og:description"]').content=description;
const format=cents=>money(cents,language);
const dailyFormat=format;
const text=(selector,value)=>document.querySelectorAll(selector).forEach(e=>e.textContent=value);
text('#pbNow',dailyFormat(dailyRentalPrice(generic,1)));text('#stkP',dailyFormat(dailyRentalPrice(generic,1)));
text('[data-reference-tag]',g.referenceTag);
text('[data-reference-lead]',g.referenceLead);
text('[data-reference-description]',g.referenceDescription);
for(const img of document.querySelectorAll('[data-brand-logo]'))img.src=platform.brand.logo;
for(const link of document.querySelectorAll('[data-brand-website]'))link.href=platform.brand.website;
for(const link of document.querySelectorAll('a[href^="mailto:"]')){link.href=`mailto:${platform.contact.email}`;if(link.textContent.includes('@'))(link.querySelector('span')||link).textContent=platform.contact.email}
text('[data-contact-phone]',platform.contact.phone);
for(const choice of ['simple','animated']){
 const cents=montagePrice(platform,1,choice,'regular'),hours=montageHours(platform,choice);
 text(`[data-montage-${choice}]`,format(cents));text(`[data-montage-${choice}-title]`,ui.montageLabel(choice));
 text(`[data-montage-${choice}-description]`,ui.montageDescription(choice,hours));
 text(`[data-montage-${choice}-effort]`,ui.montageEffort(hours));text(`[data-montage-${choice}-hourly]`,ui.montageHourly(cents,hours));
}
text('[data-montage-duration-note]',ui.montageDurationNote);
let count=3;
function renderOffers(){
 for(const [index,screens]of [[1,1],[2,2],[3,count]]){
  const daily=dailyRentalPrice(generic,screens);
  text(`[data-p="${index}"]`,dailyFormat(daily));
  const element=document.querySelector(`[data-p="${index}"]`).parentElement;
  element.querySelector('.unit').textContent=g.unit;
  const button=document.querySelector(`[data-b="${index}"]`);button.dataset.pack=screens;button.textContent=g.quote(screens);
 }
 text('#o3N',count);text('#o3Title',ui.screen(count));text('#o3Width',ui.width(count,count*platform.screen.widthCm));
 text('#o3Visual',ui.visual(count,count*platform.screen.widthPx,platform.screen.heightPx));text('#o3Badge',ui.badge(count));
 text('#o3Amp',ui.en?'Depends on your setup':'Selon votre installation');
 document.getElementById('o3Minus').disabled=count<=3;document.getElementById('o3Plus').disabled=count>=generic.maxScreens;
}
document.getElementById('o3Minus').onclick=()=>{count=Math.max(3,count-1);renderOffers();track('screens_change',{screens:count,totalCents:null})};
document.getElementById('o3Plus').onclick=()=>{count=Math.min(generic.maxScreens,count+1);renderOffers();track('screens_change',{screens:count,totalCents:null})};renderOffers();

const dialog=document.getElementById('inquiryDialog'),form=document.getElementById('inquiryForm'),result=document.getElementById('inquiryResult'),inquiryStatus=document.getElementById('inquiryAvailability');
let submitting=false,returnFocus,pendingMailto=null;
function datesValid(from,through){try{availabilityPeriod(from,through,{timeZone:platform.timeZone});return true}catch{return false}}
async function getAvailability(from,through,signal){
 const params=new URLSearchParams();if(from&&through){params.set('from',from);params.set('through',through)}
 const response=await fetch('/api/availability'+(params.size?'?'+params:''),{cache:'no-store',signal});
 if(!response.ok)throw new Error('availability_failed');const data=await response.json();
 if(!Number.isInteger(data.total)||data.total<1||(!data.needsDates&&(!Number.isInteger(data.remaining)||data.remaining<0||data.remaining>data.total||data.from!==from||data.through!==through)))throw new Error('availability_invalid');
 return data;
}
function setMinimumDates(){const today=localDate(Date.now(),platform.timeZone);form.elements.from.min=today;form.elements.through.min=form.elements.from.value||today}
setMinimumDates();

for(let n=1;n<=generic.maxScreens;n++){const option=document.createElement('option');option.value=n;option.textContent=ui.screen(n);form.elements.screens.append(option)}
for(const choice of montageChoices){const option=document.createElement('option');option.value=choice;option.textContent=`${ui.montageLabel(choice)} · ${format(montagePrice(platform,1,choice,'regular'))}`;form.elements.montage.append(option)}
function openInquiry(screens,trigger){
 if(dialog.open)return;returnFocus=trigger;form.elements.screens.value=screens;
 result.hidden=true;pendingMailto=null;inquiryStatus.textContent=g.dates;setMinimumDates();const estimate=renderEstimate();dialog.showModal();track('quote_open',{screens,montage:form.elements.montage.value,totalCents:estimate?.subtotalCents??null,days:estimate?.days??null});
}
document.addEventListener('click',e=>{const link=e.target.closest('[data-pack],[data-cta]');if(!link)return;e.preventDefault();track('cta_click',{section:link.closest('section,.hero')?.id});openInquiry(Number(link.dataset.pack)||1,link)});
document.getElementById('inquiryClose').onclick=()=>dialog.close();
dialog.addEventListener('close',()=>{track('quote_close');returnFocus?.focus({preventScroll:true})});
function renderEstimate(){
 const section=document.getElementById('inquiryEstimate');
 if(!datesValid(form.elements.from.value,form.elements.through.value)){section.hidden=true;return}
 try{
  const estimate=computeGenericEstimate(generic,platform,Number(form.elements.screens.value),usageDays(form.elements.from.value,form.elements.through.value),form.elements.montage.value);
  text('#inquiryDuration',g.duration(estimate.days)+' · '+format(estimate.dailyCents)+(ui.en?'/day':'/jour'));
  text('[data-estimate-rental-label]',g.estimateRental);text('[data-estimate-design-label]',g.estimateDesign);
  text('#inquiryRental',format(estimate.rentalCents));text('#inquiryDesignPrice',format(estimate.montageCents));text('#inquiryTotal',format(estimate.subtotalCents));
  section.hidden=false;return estimate;
 }catch{section.hidden=true}
}
form.addEventListener('input',event=>{result.hidden=true;pendingMailto=null;inquiryStatus.textContent=g.dates;setMinimumDates();const estimate=renderEstimate();
 const name={inquiryScreens:'screens_change',inquiryDesign:'design_change',inquiryFrom:'dates_change',inquiryThrough:'dates_change'}[event.target.id];
 if(name)track(name,{screens:Number(form.elements.screens.value),montage:form.elements.montage.value,totalCents:estimate?.subtotalCents??null,days:estimate?.days??null});
});
form.onsubmit=async e=>{
 e.preventDefault();if(submitting||!form.reportValidity())return;
 const fields=Object.fromEntries(new FormData(form));
 if(!datesValid(fields.from,fields.through)){inquiryStatus.textContent=g.invalidDates;return}
 const screens=Number(fields.screens);if(!Number.isInteger(screens)||screens<1||screens>generic.maxScreens||!montageChoices.includes(fields.montage))return;
 const button=form.querySelector('[type="submit"]');submitting=true;button.disabled=true;inquiryStatus.textContent=g.preparing;
 let availability;
 try{availability=await getAvailability(fields.from,fields.through)}catch{/* Un devis reste possible si le stock ne répond pas. */}
 try{
  // Les saisies ont pu changer pendant la lecture réseau : ne pas préparer un ancien récapitulatif.
  if(JSON.stringify(fields)!==JSON.stringify(Object.fromEntries(new FormData(form)))){inquiryStatus.textContent=g.dates;return}
  const available=availability?g.available(availability.remaining,availability.total):g.unknown;
  inquiryStatus.textContent=(availability&&availability.remaining<screens?g.insufficient:available)+' '+g.availabilityNote;
  const estimate=computeGenericEstimate(generic,platform,screens,usageDays(fields.from,fields.through),fields.montage);
  const entries=[fields.name,fields.company,fields.email,fields.phone,fields.location,fields.from,fields.through,String(screens),ui.montageLabel(fields.montage),format(estimate.rentalCents),format(estimate.montageCents),available,fields.notes];
  const keys=[...g.summaryKeys];keys[9]=g.rentalSummaryLabel(estimate.days);
  const summary=g.summaryTitle+'\n\n'+entries.map((value,i)=>keys[i]+' : '+(value||'—')).join('\n')+'\n\n'+g.duration(estimate.days)+'\n'+g.estimateTotal+' : '+format(estimate.subtotalCents)+'\n\n'+g.summaryNote;
  document.getElementById('inquirySummary').value=summary;
  // Ne pas exposer les coordonnées du client dans un attribut href lu par un outil de replay.
  pendingMailto=`mailto:${platform.contact.email}?subject=${encodeURIComponent(g.subject)}&body=${encodeURIComponent(summary)}`;
  document.getElementById('inquiryMail').href=`mailto:${platform.contact.email}`;
  result.hidden=false;track('quote_prepared',{screens,montage:fields.montage,totalCents:estimate.subtotalCents,days:estimate.days});
 }finally{submitting=false;button.disabled=false}
};
document.getElementById('inquiryCopy').onclick=async()=>{
 try{await navigator.clipboard.writeText(document.getElementById('inquirySummary').value);inquiryStatus.textContent=g.copied;track('summary_copy')}
 catch{document.getElementById('inquirySummary').select();inquiryStatus.textContent=g.copyFallback}
};
const privacy=form.querySelector('.inquiry-privacy a');if(ui.en)privacy.href='https://www.pixanova.ca/en/legal/politique-de-confidentialite';
document.getElementById('inquiryMail').addEventListener('click',event=>{track('email_open');if(event.defaultPrevented||!pendingMailto)return;event.preventDefault();window.location.assign(pendingMailto)});
initGenericPresentation(generic,ui,track);
document.documentElement.classList.remove('event-loading');
