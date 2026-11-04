import {createAdminAuth,AdminError} from './lib/admin-auth.mjs';
import {adminJSON,limitRequest} from './lib/admin-common.mjs';
import {createInventoryDb,stripeEnvironment} from './lib/inventory-db.mjs';
import {getStripe} from './lib/http.mjs';
import {catalog,INVENTORY_POOL} from './lib/config.mjs';
import {reservationSummary,stripeSummary} from './lib/admin-metrics.mjs';
export const makeHandler=({authFactory=createAdminAuth,dbFactory=createInventoryDb,stripeFactory=()=>getStripe({timeout:5000,maxNetworkRetries:0}),env=process.env,now=Date.now}={})=>async req=>{
 let cookie;
 try{
  if(req.method!=='GET')return adminJSON({error:'method_not_allowed'},405);
  const account=await authFactory().require(req);cookie=account.cookie;
  const q=new URL(req.url).searchParams,days=Number(q.get('days')||30),eventId=q.get('event')||null;
  if(![1,7,30].includes(days)||(eventId&&!['generic',...catalog.events.map(e=>e.id)].includes(eventId)))return adminJSON({error:'invalid_filter'},400,cookie);
  const db=dbFactory();await limitRequest(db,req,'admin-report',30,60,env);
  const environment=stripeEnvironment(env.STRIPE_SECRET_KEY),until=new Date(now()).toISOString(),since=new Date(now()-days*86400000).toISOString();
  const [telemetry,business,stripe]=await Promise.all([
   (async()=>{try{const report=await db.rpc('events_analytics_report',{p_environment:environment,p_since:since,p_event_id:eventId});if(!report||typeof report!=='object')throw new Error('invalid_report');return {available:true,enabled:env.EVENTS_ANALYTICS_ENABLED==='true',report}}catch{return {available:false,enabled:false,error:'analytics_unavailable'}}})(),
   (async()=>{try{
    const rows=[];let truncated=false;
    for(let offset=0;offset<2000;offset+=500){
     const page=await db.request(`events_reservations?environment=eq.${environment}&pool_id=eq.${INVENTORY_POOL}&created_at=gte.${encodeURIComponent(since)}&created_at=lte.${encodeURIComponent(until)}${eventId?'&event_id=eq.'+encodeURIComponent(eventId):''}&order=created_at.desc,id&limit=500&offset=${offset}`);
     rows.push(...page);if(page.length<500)break;if(offset===1500)truncated=true;
    }
    return {available:true,truncated,...reservationSummary(rows)};
   }catch{return {available:false,error:'reservations_unavailable'}}})(),
   (async()=>{try{
    if(eventId==='generic')return {available:true,notApplicable:true};
    const stripe=stripeFactory(),sessions=[];
    // Deux cents sessions maximum; signaler un résultat partiel plutôt que cacher la limite.
    let cursor,more=false;
    for(let page=0;page<2;page++){
     const result=await stripe.checkout.sessions.list({limit:100,created:{gte:Math.floor(Date.parse(since)/1000),lte:Math.floor(now()/1000)},expand:['data.payment_intent.latest_charge'],...(cursor?{starting_after:cursor}:{})});
     sessions.push(...result.data);more=result.has_more;if(!more)break;cursor=result.data.at(-1)?.id;if(!cursor)break;
    }
    return {available:true,truncated:more,...stripeSummary(sessions,{environment,eventId})};
   }catch{return {available:false,error:'stripe_unavailable'}}})(),
  ]);
  return adminJSON({generatedAt:until,since,until,days,environment,eventId,retentionDays:30,
   events:[{id:'generic',name:'Accueil générique'},...catalog.events.map(e=>({id:e.id,name:`${e.name} ${e.edition}`}))],
   telemetry,business,stripe,
   integrations:{netlify:{status:'external',url:'https://app.netlify.com/projects/pixanova-events-test/analytics',note:'Statistiques disponibles selon votre abonnement Netlify; pas d’API Web Analytics publique stable.'},
    clarity:{configured:!!catalog.platform.analytics.clarity,url:'https://clarity.microsoft.com/',projectId:catalog.platform.analytics.clarity||null},ga4:{configured:!!catalog.platform.analytics.ga4,url:'https://analytics.google.com/'}},
   notes:['Comportements mesurés uniquement après consentement; ce ne sont pas toutes les visites du site.','Encaissements Stripe TTC, remboursements déduits, pour les sessions créées dans la période; ce n’est pas une marge ni un chiffre d’affaires HT.','Un récapitulatif fermé n’est pas un paiement annulé. Les sessions expirées sont distinguées.','Une demande préparée ou un clic courriel ne prouve pas l’envoi d’une soumission. Aucun envoi automatique n’est encore raccordé.','Les estimations de paniers sont déclarées par le navigateur; les paiements proviennent de Stripe.']},200,cookie);
 }catch(error){return adminJSON({error:error instanceof AdminError?error.message:'admin_unavailable'},error instanceof AdminError?error.status:503,cookie)}
};
export default makeHandler();
export const config={path:'/api/admin/overview'};
