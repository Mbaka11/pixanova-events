import catalog from './catalog-data.js';
import {copy,money,languageUrl} from './i18n.mjs';
import {genericEnglish,genericCopy} from './generic-i18n.mjs';
import {referenceRentalPrice,availabilityPeriod,localDate} from './generic-shared.mjs';
import {montagePrice,montageHours,montageChoices} from './montage.mjs';
import {language,translateStaticDOM,installLanguageSwitcher} from './language.js';
import {initGenericPresentation} from './generic-presentation.js';
const {platform,generic}=catalog,ui=copy(language),g=genericCopy(language);
translateStaticDOM(genericEnglish);installLanguageSwitcher();
document.title=g.title;document.querySelector('meta[property="og:title"]').content=g.title;
const description=ui.en?'LED screens for trade shows and events. Choose your dates and request a custom quote.':'Des écrans LED pour vos salons et événements. Choisissez vos dates et demandez un devis personnalisé.';
document.querySelector('meta[name="description"]').content=description;document.querySelector('meta[property="og:description"]').content=description;
const format=cents=>money(cents,language);
const text=(selector,value)=>document.querySelectorAll(selector).forEach(e=>e.textContent=value);
text('#pbNow',format(generic.pricing.one));text('#stkP',format(generic.pricing.one));
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
  text(`[data-p="${index}"]`,format(referenceRentalPrice(generic,screens)));
  const element=document.querySelector(`[data-p="${index}"]`).parentElement;
  element.querySelector('.unit').textContent=(screens>1?`${format(referenceRentalPrice(generic,screens)/screens)}${ui.en?'/screen':'/écran'} · `:'')+g.unit;
  const button=document.querySelector(`[data-b="${index}"]`);button.dataset.pack=screens;button.textContent=g.quote(screens);
 }
 text('#o3N',count);text('#o3Title',ui.screen(count));text('#o3Width',ui.width(count,count*platform.screen.widthCm));
 text('#o3Visual',ui.visual(count,count*platform.screen.widthPx,platform.screen.heightPx));text('#o3Badge',ui.badge(count));
 text('#o3Amp',ui.en?'Depends on your setup':'Selon votre installation');
 document.getElementById('o3Minus').disabled=count<=3;document.getElementById('o3Plus').disabled=count>=generic.maxScreens;
}
document.getElementById('o3Minus').onclick=()=>{count=Math.max(3,count-1);renderOffers()};
document.getElementById('o3Plus').onclick=()=>{count=Math.min(generic.maxScreens,count+1);renderOffers()};renderOffers();

const availabilityForm=document.getElementById('availabilityForm'),fromInput=document.getElementById('rentalFrom'),throughInput=document.getElementById('rentalThrough');
const status=document.getElementById('counterNote'),counter=document.getElementById('availabilityCount'),segments=document.getElementById('segs');
const dialog=document.getElementById('inquiryDialog'),form=document.getElementById('inquiryForm'),result=document.getElementById('inquiryResult'),inquiryStatus=document.getElementById('inquiryAvailability');
let total=null,current=null,ticket=0,controller,submitting=false,returnFocus;
function datesValid(from,through){try{availabilityPeriod(from,through,{timeZone:platform.timeZone});return true}catch{return false}}
function renderAvailability(data){
 current=data?.needsDates?null:data;
 if(Number.isInteger(data?.total))total=data.total;
 counter.textContent=current?g.available(current.remaining,total):total===null?g.dates:g.fleet(total);
 text('#stkL',current?g.available(current.remaining,total):g.dates);
 segments.replaceChildren();segments.hidden=!current;
 if(current)for(let i=0;i<total;i++){const s=document.createElement('i');s.className=i<current.remaining?'on':'off';segments.append(s)}
}
async function getAvailability(from,through,signal){
 const params=new URLSearchParams();if(from&&through){params.set('from',from);params.set('through',through)}
 const response=await fetch('/api/availability'+(params.size?'?'+params:''),{cache:'no-store',signal});
 if(!response.ok)throw new Error('availability_failed');const data=await response.json();
 if(!Number.isInteger(data.total)||data.total<1||(!data.needsDates&&(!Number.isInteger(data.remaining)||data.remaining<0||data.remaining>data.total||data.from!==from||data.through!==through)))throw new Error('availability_invalid');
 return data;
}
async function refreshAvailability(){
 const id=++ticket;controller?.abort();controller=new AbortController();
 const from=fromInput.value,through=throughInput.value;
 if((from||through)&&!datesValid(from,through)){renderAvailability(null);status.textContent=g.invalidDates;return}
 renderAvailability(null);status.textContent=from?g.checking:g.dates;
 try{
  const data=await getAvailability(from,through,controller.signal);if(id!==ticket)return;
  renderAvailability(data);status.textContent=data.needsDates?g.dates:g.availabilityNote;
 }catch(error){if(id===ticket&&error.name!=='AbortError'){renderAvailability(null);status.textContent=g.unknown}}
}
function setMinimumDates(){const today=localDate(Date.now(),platform.timeZone);for(const id of ['rentalFrom','inquiryFrom'])document.getElementById(id).min=today;throughInput.min=fromInput.value||today;form.elements.through.min=form.elements.from.value||today}
for(const input of [fromInput,throughInput])input.addEventListener('change',()=>{setMinimumDates();void refreshAvailability()});
availabilityForm.onsubmit=e=>{e.preventDefault();void refreshAvailability()};
setMinimumDates();void refreshAvailability();setInterval(()=>{if(!document.hidden)void refreshAvailability()},30000);
window.addEventListener('focus',()=>{setMinimumDates();void refreshAvailability()});

for(let n=1;n<=generic.maxScreens;n++){const option=document.createElement('option');option.value=n;option.textContent=ui.screen(n);form.elements.screens.append(option)}
for(const choice of montageChoices){const option=document.createElement('option');option.value=choice;option.textContent=`${ui.montageLabel(choice)} · ${format(montagePrice(platform,1,choice,'regular'))}`;form.elements.montage.append(option)}
function openInquiry(screens,trigger){
 if(dialog.open)return;returnFocus=trigger;form.elements.screens.value=screens;
 if(datesValid(fromInput.value,throughInput.value)){form.elements.from.value=fromInput.value;form.elements.through.value=throughInput.value}
 result.hidden=true;inquiryStatus.textContent=g.dates;setMinimumDates();dialog.showModal();
}
document.addEventListener('click',e=>{const link=e.target.closest('[data-pack],[data-cta]');if(!link)return;e.preventDefault();openInquiry(Number(link.dataset.pack)||1,link)});
document.getElementById('inquiryClose').onclick=()=>dialog.close();
dialog.addEventListener('close',()=>{returnFocus?.focus({preventScroll:true})});
form.addEventListener('input',()=>{result.hidden=true;inquiryStatus.textContent=g.dates;setMinimumDates()});
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
  inquiryStatus.textContent=availability&&availability.remaining<screens?g.insufficient:available;
  const entries=[fields.name,fields.company,fields.email,fields.phone,fields.location,fields.from,fields.through,String(screens),ui.montageLabel(fields.montage),format(referenceRentalPrice(generic,screens)),format(montagePrice(platform,screens,fields.montage,'regular')),available,fields.notes];
  const summary=g.summaryTitle+'\n\n'+entries.map((value,i)=>g.summaryKeys[i]+' : '+(value||'—')).join('\n')+'\n\n'+g.summaryNote;
  document.getElementById('inquirySummary').value=summary;
  document.getElementById('inquiryMail').href=`mailto:${platform.contact.email}?subject=${encodeURIComponent(g.subject)}&body=${encodeURIComponent(summary)}`;
  result.hidden=false;
 }finally{submitting=false;button.disabled=false}
};
document.getElementById('inquiryCopy').onclick=async()=>{
 try{await navigator.clipboard.writeText(document.getElementById('inquirySummary').value);inquiryStatus.textContent=g.copied}
 catch{document.getElementById('inquirySummary').select();inquiryStatus.textContent=g.copyFallback}
};
const privacy=form.querySelector('.inquiry-privacy a');if(ui.en)privacy.href='https://www.pixanova.ca/en/legal/politique-de-confidentialite';
// Les anciennes URL de la liste restent réorientables sans changer les liens ChauCase.
for(const link of document.querySelectorAll('a[href="/evenements/"]'))link.href=languageUrl('/evenements/',language);
initGenericPresentation(generic,ui);
document.documentElement.classList.remove('event-loading');
