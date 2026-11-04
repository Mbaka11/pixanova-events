import {catalog} from './lib/config.mjs';
import {createInventoryDb,stripeEnvironment} from './lib/inventory-db.mjs';
import {json} from './lib/http.mjs';
import {sameOrigin,boundedJSON,AdminError} from './lib/admin-auth.mjs';
import {limitRequest} from './lib/admin-common.mjs';
import {sanitizeAnalytics} from '../shared/analytics.mjs';
export const makeHandler=({dbFactory=createInventoryDb,env=process.env}={})=>async req=>{
 const enabled=env.EVENTS_ANALYTICS_ENABLED==='true';
 if(req.method==='GET')return json({enabled});
 if(req.method!=='POST')return json({error:'method_not_allowed'},405,{Allow:'GET, POST'});
 if(!enabled)return json({error:'analytics_disabled'},503);
 if(!sameOrigin(req))return json({error:'origin_not_allowed'},403);
 try{
  const body=await boundedJSON(req,4096);
  const row=sanitizeAnalytics(body,catalog.events.map(e=>e.id));
  if(!row)return json({error:'invalid_event'},400);
  const db=dbFactory();await limitRequest(db,req,'analytics',120,60,env);
  await db.request('events_analytics_events',{method:'POST',body:{environment:stripeEnvironment(env.STRIPE_SECRET_KEY),...row},prefer:'resolution=ignore-duplicates,return=minimal'});
  return new Response(null,{status:204,headers:{'Cache-Control':'no-store'}});
 }catch(error){return json({error:error instanceof AdminError?error.message:'analytics_unavailable'},error instanceof AdminError?error.status:503)}
};
export default makeHandler();
export const config={path:'/api/analytics'};
