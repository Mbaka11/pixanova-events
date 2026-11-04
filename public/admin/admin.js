import {renderDashboard} from './dashboard-view.js';
const $=id=>document.getElementById(id);
let signedIn=false,busy=false,currentUser;
const money=value=>Number.isSafeInteger(value)?new Intl.NumberFormat('fr-CA',{style:'currency',currency:'CAD'}).format(value/100):'—';
const number=value=>Number.isFinite(value)?value.toLocaleString('fr-CA'):'—';
const date=value=>{const d=new Date(value);return Number.isFinite(d.getTime())?new Intl.DateTimeFormat('fr-CA',{timeZone:'America/Toronto',dateStyle:'short',timeStyle:'short'}).format(d):'—'};
const names={page_view:'Page vue',section_view:'Section consultée',cta_click:'Clic sur un appel à l’action',screens_change:'Sélection d’écrans',design_change:'Choix de création',dates_change:'Durée modifiée',cart_open:'Récapitulatif de réservation ouvert',cart_update:'Récapitulatif actualisé',cart_close:'Récapitulatif fermé (pas une annulation)',quote_open:'Formulaire de devis ouvert',quote_close:'Formulaire de devis fermé',quote_prepared:'Courriel de devis préparé (pas envoyé)',email_open:'Clic vers l’application courriel',summary_copy:'Récapitulatif copié',checkout_attempt:'Tentative de passage au paiement',begin_checkout:'Passage vers Stripe',checkout_error:'Erreur de passage au paiement',video_play:'Vidéo démarrée',video_unmute:'Son activé',video_progress:'Progression vidéo'};
const states={allocating:'Allocation en cours',held:'En attente',pending:'Paiement en attente',paid:'Payée',released:'Libérée',review:'À examiner'};
const montage=value=>({none:'Sans création',simple:'Création graphique',animated:'Motion design'}[value]||'—');
function node(tag,text,className){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e}
function empty(target,message){$(target).replaceChildren(node('p',message,'empty'))}
function table(target,headers,rows){
 if(!rows.length){empty(target,'Aucune donnée observée sur la période.');return}
 const wrap=node('div',undefined,'table-wrap'),t=node('table'),head=node('thead'),tr=node('tr');
 for(const h of headers)tr.append(node('th',h));head.append(tr);t.append(head);
 const body=node('tbody');for(const row of rows){const tr=node('tr');for(const value of row){const td=node('td');if(value instanceof Node)td.append(value);else td.textContent=value??'—';tr.append(td)}body.append(tr)}t.append(body);wrap.append(t);$(target).replaceChildren(wrap);
}
function link(text,url){const a=node('a',text);try{const parsed=new URL(url);if(parsed.protocol!=='https:'||!['app.netlify.com','clarity.microsoft.com','analytics.google.com','dashboard.stripe.com'].includes(parsed.hostname))return node('span',text);a.href=parsed.href;a.target='_blank';a.rel='noopener noreferrer'}catch{return node('span',text)}return a}
function errorMessage(code){return ({invalid_credentials:'Courriel ou mot de passe incorrect.',authentication_required:'Reconnectez-vous pour accéder au tableau.',access_denied:'Ce compte n’est pas autorisé.',rate_limited:'Trop de tentatives. Attendez avant de réessayer.',admin_not_configured:'L’administration n’est pas encore configurée.',admin_unavailable:'Administration indisponible. Vérifiez la configuration et la migration Supabase.',auth_unavailable:'Connexion temporairement indisponible.',password_too_weak:'Choisissez un nouveau mot de passe différent, de 14 caractères minimum.'})[code]||'Impossible de terminer la demande pour le moment.'}
async function request(path,{method='GET',body}={}){
 const response=await fetch(path,{method,credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 let data;try{data=await response.json()}catch{data={error:'admin_unavailable'}}
 if(!response.ok){const error=new Error(errorMessage(data.error));error.status=response.status;throw error}return data;
}
function showLogin(message=''){
 signedIn=false;currentUser=null;$('dashboard').hidden=true;$('logout').hidden=true;$('login').hidden=false;$('loginStatus').textContent=message;$('password').value='';$('passwordForm').reset();
}
function showDashboard(user){signedIn=true;currentUser=user;$('login').hidden=true;$('dashboard').hidden=false;$('logout').hidden=false;$('account').textContent=user.email+' · Admin';$('loginForm').reset()}
function metric(title,value,note){const e=node('article',undefined,'metric');e.append(node('h2',title),node('strong',value),node('small',note));return e}
const render=data=>renderDashboard(data,{$,money,number,date,node,empty,table,link,names,states,montage,metric});
async function refresh(){
 if(!signedIn||busy)return;busy=true;$('refresh').disabled=true;
 try{const q=new URLSearchParams({days:$('days').value});if($('event').value)q.set('event',$('event').value);render(await request('/api/admin/overview?'+q))}
 catch(error){if([401,403].includes(error.status))showLogin(error.message);else{$('reportStatus').hidden=false;$('reportStatus').textContent=error.message;$('reportStatus').className='error'}}
 finally{busy=false;$('refresh').disabled=false}
}
$('loginForm').onsubmit=async e=>{
 e.preventDefault();const button=$('loginForm').querySelector('button');button.disabled=true;$('loginStatus').textContent='Connexion…';
 try{const data=await request('/api/admin/auth',{method:'POST',body:{email:$('email').value,password:$('password').value}});showDashboard(data.user);await refresh()}
 catch(error){$('loginStatus').textContent=error.message;$('password').value=''}finally{button.disabled=false}
};
$('logout').onclick=async()=>{try{await request('/api/admin/auth',{method:'DELETE',body:{}});showLogin('Déconnecté.')}catch(error){$('reportStatus').hidden=false;$('reportStatus').textContent=error.message}};
$('passwordForm').onsubmit=async e=>{
 e.preventDefault();const button=$('passwordForm').querySelector('button');button.disabled=true;
 try{await request('/api/admin/auth',{method:'PATCH',body:{currentPassword:$('currentPassword').value,newPassword:$('newPassword').value}});$('passwordForm').reset();showLogin('Mot de passe modifié. Reconnectez-vous.')}catch(error){$('passwordStatus').textContent=error.message}finally{button.disabled=false}
};
$('refresh').onclick=refresh;$('days').onchange=refresh;$('event').onchange=refresh;
const tabs=[...document.querySelectorAll('[role="tab"]')];
function selectTab(tab){for(const item of tabs){const selected=item===tab;item.setAttribute('aria-selected',String(selected));item.tabIndex=selected?0:-1;$(item.getAttribute('aria-controls')).hidden=!selected}}
tabs.forEach((tab,i)=>{tab.onclick=()=>selectTab(tab);tab.onkeydown=e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const next=tabs[(i+(e.key==='ArrowRight'?1:tabs.length-1))%tabs.length];selectTab(next);next.focus()}}});selectTab(tabs[0]);
setInterval(()=>{if(!document.hidden)void refresh()},60000);
try{const data=await request('/api/admin/auth');showDashboard(data.user);await refresh()}catch(error){showLogin(error.status===401?'':error.message)}
