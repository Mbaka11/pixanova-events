import {sanitizeAnalytics} from './analytics-shared.mjs';
let instance;
export function createAnalytics({eventId,language,settings}){
 if(instance)return instance;
 let enabled=false,choice=null,sessionId=null,started=false,providerLoaded=false,selection={},maskObserver;
 const blocked=()=>location.pathname.startsWith('/admin')||new URLSearchParams(location.search).has('session_id')||new URLSearchParams(location.search).has('merci')||location.hash.startsWith('#/merci');
 const clarityId=/^[a-zA-Z0-9]{5,30}$/.test(settings.clarity||'')?settings.clarity:null;
 const ga4Id=/^G-[A-Z0-9]{6,20}$/.test(settings.ga4||'')?settings.ga4:null;
 const scope=['internal',clarityId?'clarity':'',ga4Id?'ga4':''].filter(Boolean).join(',');
 const key='px_stats_consent_v1',sessionKey='px_stats_session_v1';
 const en=language==='en';
 function mask(root=document){
  if(root.nodeType===1&&root.matches('input,textarea,select,dialog,[data-route="/merci"]'))root.setAttribute('data-clarity-mask','true');
  root.querySelectorAll?.('input,textarea,select,dialog,[data-route="/merci"]').forEach(node=>node.setAttribute('data-clarity-mask','true'));
 }
 function track(name,props={}){
  // Ne jamais lire de nom, courriel, téléphone, lieu, notes ou contenu des formulaires.
  for(const field of ['screens','montage','days','totalCents','amountBasis'])if(props[field]!==undefined)selection[field]=props[field];
  if(!enabled||choice!=='yes'||blocked()||!sessionId)return;
  const row=sanitizeAnalytics({id:crypto.randomUUID(),sessionId,eventId,name,consent:true,props:{language,...selection,...props}},[eventId]);
  if(!row)return;
  const body={id:row.id,sessionId,eventId,name,consent:true,props:row.props};
  fetch('/api/analytics',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'omit',keepalive:true,body:JSON.stringify(body)}).catch(()=>{});
  if(clarityId&&typeof window.clarity==='function')window.clarity('event',name);
  if(ga4Id&&typeof window.gtag==='function')window.gtag('event',name,{...row.props,event_id:eventId,page_location:location.origin+(eventId==='generic'?'/':'/evenement.html'),page_referrer:''});
 }
 function providers(){
  if(providerLoaded)return;providerLoaded=true;
  if(clarityId){
   window.clarity=window.clarity||function(){(window.clarity.q=window.clarity.q||[]).push(arguments)};
   window.clarity('consentv2',{analytics_Storage:'granted',ad_Storage:'denied'});
   const script=document.createElement('script');script.async=true;script.src='https://www.clarity.ms/tag/'+clarityId;document.head.append(script);
  }
  if(ga4Id){
   window.dataLayer=window.dataLayer||[];window.gtag=window.gtag||function(){window.dataLayer.push(arguments)};
   window.gtag('consent','default',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
   window.gtag('js',new Date());window.gtag('config',ga4Id,{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false,page_location:location.origin+(eventId==='generic'?'/':'/evenement.html'),page_referrer:''});
   const script=document.createElement('script');script.async=true;script.src='https://www.googletagmanager.com/gtag/js?id='+ga4Id;document.head.append(script);
  }
 }
 function start(){
  if(started||blocked())return;started=true;selection={};
  try{sessionId=sessionStorage.getItem(sessionKey);if(!/^[0-9a-f-]{36}$/.test(sessionId||'')){sessionId=crypto.randomUUID();sessionStorage.setItem(sessionKey,sessionId)}}catch{sessionId=crypto.randomUUID()}
  mask();if(!maskObserver){maskObserver=new MutationObserver(entries=>entries.forEach(entry=>entry.addedNodes.forEach(node=>{if(node.nodeType===1)mask(node)})));maskObserver.observe(document.body,{childList:true,subtree:true});}
  providers();
  const params=new URLSearchParams(location.search),props={};
  for(const [field,param]of [['source','utm_source'],['medium','utm_medium'],['campaign','utm_campaign']])if(params.has(param))props[field]=params.get(param);
  try{const host=new URL(document.referrer).hostname;if(host!==location.hostname)props.referrer=host}catch{/* Source directe. */}
  track('page_view',props);
 }
 function choose(value){
  choice=value;try{localStorage.setItem(key,JSON.stringify({answer:value,scope}))}catch{}
  const box=document.getElementById('consent');if(box)box.hidden=true;
  if(value==='yes')start();else{
   try{sessionStorage.removeItem(sessionKey)}catch{}
   if(providerLoaded&&(clarityId||ga4Id)){
    window.clarity?.('consentv2',{analytics_Storage:'denied',ad_Storage:'denied'});
    window.gtag?.('consent','update',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
    location.reload();
   }
   sessionId=null;started=false;
  }
 }
 function setup(){
  let box=document.getElementById('consent');if(!box){box=document.createElement('div');box.id='consent';box.className='consent';document.body.append(box)}
  box.hidden=true;box.setAttribute('role','region');box.setAttribute('aria-label',en?'Optional analytics':'Statistiques facultatives');
  const title=document.createElement('b'),description=document.createElement('p'),row=document.createElement('div'),yes=document.createElement('button'),no=document.createElement('button');
  title.textContent=en?'Help us improve this site':'Aidez-nous à améliorer ce site';
  description.textContent=en?`With your permission, we measure clicks and browsing steps${clarityId?' with Microsoft Clarity':''}${ga4Id?' and Google Analytics':''}. Your contact details and form text are excluded. You can refuse or change your choice below.`:`Avec votre accord, nous mesurons les clics et étapes de navigation${clarityId?' avec Microsoft Clarity':''}${ga4Id?' et Google Analytics':''}. Vos coordonnées et textes saisis sont exclus. Vous pouvez refuser ou changer votre choix en bas de page.`;
  row.className='row';yes.type=no.type='button';yes.className='btn dark';no.className='btn outline';yes.textContent=en?'Accept':'Accepter';no.textContent=en?'Decline':'Refuser';yes.id='cOk';no.id='cNo';yes.onclick=()=>choose('yes');no.onclick=()=>choose('no');row.append(yes,no);const privacy=document.createElement('a');privacy.href='/confidentialite/'+(en?'#en':'#fr');privacy.textContent=en?'Analytics and privacy':'Statistiques et confidentialité';box.replaceChildren(title,description,privacy,row);
  const control=document.createElement('button');control.type='button';control.className='analytics-settings';control.textContent=en?'Analytics preferences':'Préférences statistiques';control.onclick=()=>{box.hidden=false;yes.focus()};
  (document.querySelector('footer .wrap')||document.body).append(control);
  try{const stored=JSON.parse(localStorage.getItem(key)||'null');if(stored?.scope===scope&&['yes','no'].includes(stored.answer))choice=stored.answer}catch{}
  if(choice==='yes')start();else if(choice===null)box.hidden=false;
 }
 instance={track};
 if(settings.enabled===true&&!blocked())fetch('/api/analytics',{cache:'no-store',credentials:'omit'}).then(r=>r.ok?r.json():{enabled:false}).then(data=>{if(data.enabled===true){enabled=true;setup()}}).catch(()=>{});
 return instance;
}
