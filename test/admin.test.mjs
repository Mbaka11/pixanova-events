import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {createAdminAuth,AdminError} from '../server/lib/admin-auth.mjs';
import {makeHandler as authHandler} from '../server/admin-auth.mjs';
import {makeHandler as reportHandler} from '../server/admin-overview.mjs';
import {reservationSummary,stripeSummary} from '../server/lib/admin-metrics.mjs';
const id=randomUUID(),email='admin@example.test';
function fixture(){
 const env={SUPABASE_URL:'https://unit.supabase.co',SUPABASE_SECRET_KEY:'sb_secret_unit',ADMIN_SESSION_SECRET:randomBytes(32).toString('base64'),EVENTS_ADMIN_EMAIL:email,EVENTS_ADMIN_USER_ID:id};
 let now=Date.now(),expired=false,other=false,refreshes=0,passwordChanged=false;
 const user=()=>({id:other?randomUUID():id,email,email_confirmed_at:new Date().toISOString(),user_metadata:{role:'admin'}});
 const fetcher=async(url,opts)=>{
  const u=new URL(url);
  if(u.pathname.endsWith('/token')){if(u.searchParams.get('grant_type')==='refresh_token')refreshes++;return Response.json({user:user(),access_token:refreshes?'access-refreshed':'access-private',refresh_token:'refresh-private'})}
  if(u.pathname.endsWith('/user')){if(opts.method==='PUT'){passwordChanged=true;return Response.json(user())}if(expired&&opts.headers.Authorization==='Bearer access-private')return Response.json({}, {status:401});return Response.json(user())}
  if(u.pathname.endsWith('/logout'))return new Response(null,{status:204});
  throw Error('unexpected auth path');
 };
 return {env,auth:createAdminAuth({env,fetcher,now:()=>now}),expire:()=>expired=true,other:()=>other=true,advance:()=>now+=9*3600000,refreshes:()=>refreshes,passwordChanged:()=>passwordChanged};
}
const reqCookie=cookie=>new Request('https://example.test/api/admin/overview',{headers:{cookie:cookie.split(';')[0]}});
test('session admin : chiffrée, HttpOnly, Secure, SameSite et validée côté Supabase',async()=>{
 const f=fixture(),result=await f.auth.login(email,'strong-password-private');
 assert.match(result.cookie,/HttpOnly/);assert.match(result.cookie,/Secure/);assert.match(result.cookie,/SameSite=Strict/);assert.doesNotMatch(result.cookie,/access-private|refresh-private|strong-password/);
 const account=await f.auth.require(reqCookie(result.cookie));assert.equal(account.user.role,'admin');assert.equal(account.user.id,id);
 const parts=result.cookie.split('=');parts[1]=(parts[1][0]==='x'?'y':'x')+parts[1].slice(1);await assert.rejects(()=>f.auth.require(reqCookie(parts.join('='))),e=>e.status===401);
 f.advance();await assert.rejects(()=>f.auth.require(reqCookie(result.cookie)),e=>e.status===401);
});
test('aucun accès par simple rôle déclaré; identité, courriel confirmé et UUID doivent correspondre',async()=>{
 const f=fixture();await assert.rejects(()=>f.auth.login('other@example.test','password8'),e=>e.status===401);
 f.other();await assert.rejects(()=>f.auth.login(email,'password8'),e=>e.status===401);
 const weak=fixture();weak.env.ADMIN_SESSION_SECRET='weak';await assert.rejects(()=>weak.auth.login(email,'password8'),e=>e.status===503);
});
test('refresh privé et changement de mot de passe avec réauthentification',async()=>{
 const f=fixture(),login=await f.auth.login(email,'old-password-strong');f.expire();
 const refreshed=await f.auth.require(reqCookie(login.cookie));assert.equal(f.refreshes(),1);assert.match(refreshed.cookie,/HttpOnly/);
 await assert.rejects(()=>f.auth.changePassword(reqCookie(refreshed.cookie),'old-password-strong','short'),e=>e.status===400);
 await f.auth.changePassword(reqCookie(refreshed.cookie),'old-password-strong','new-password-long-and-strong');assert.equal(f.passwordChanged(),true);
});
test('API auth : pas de token en JSON, origine obligatoire et limitation avant vérification du mot de passe',async()=>{
 let calls=0;const auth={login:async()=>{calls++;return {user:{email,role:'admin'},cookie:'private; HttpOnly; Secure'}},clearCookie:()=>'',logout:async()=>{}};
 let allowed=true;const handler=authHandler({authFactory:()=>auth,dbFactory:()=>({rpc:async()=>allowed}),env:{ADMIN_SESSION_SECRET:'unit-key'}});
 const request=(origin,body={email,password:'not-logged'})=>new Request('https://example.test/api/admin/auth',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
 assert.equal((await handler(request('https://evil.test'))).status,403);assert.equal(calls,0);
 const response=await handler(request('https://example.test'));assert.equal(response.status,200);assert.deepEqual(await response.json(),{user:{email,role:'admin'}});assert.match(response.headers.get('set-cookie'),/HttpOnly/);
 allowed=false;assert.equal((await handler(request('https://example.test'))).status,429);assert.equal(calls,1);
 allowed=true;assert.equal((await handler(request('https://example.test',{email:'x'.repeat(5000)}))).status,413);
});
test('API rapport : accès refusé avant toute lecture Stripe ou Supabase',async()=>{
 let touched=false;const handler=reportHandler({authFactory:()=>({require:async()=>{throw new AdminError('authentication_required',401)}}),dbFactory:()=>{touched=true},stripeFactory:()=>{touched=true}});
 const r=await handler(new Request('https://example.test/api/admin/overview'));assert.equal(r.status,401);assert.equal(touched,false);
});
test('rapport admin : sources séparées, absence de faux zéro en panne et filtres validés',async()=>{
 let reads=0;
 const handler=reportHandler({authFactory:()=>({require:async()=>({user:{id,email},cookie:'updated-private-cookie'})}),env:{STRIPE_SECRET_KEY:'sk_live_unit',ADMIN_SESSION_SECRET:'unit-key',EVENTS_ANALYTICS_ENABLED:'true'},dbFactory:()=>({rpc:async(name)=>{if(name==='events_allow_request')return true;throw Error('private upstream details')},request:async()=>{reads++;return []}}),stripeFactory:()=>({checkout:{sessions:{list:async()=>{throw Error('private Stripe key must not leak')}}}})});
 const response=await handler(new Request('https://example.test/api/admin/overview?days=7'));const body=await response.json();
 assert.equal(response.status,200);assert.equal(body.telemetry.available,false);assert.equal(body.stripe.available,false);assert.equal(body.stripe.netCents,undefined);assert.equal(body.business.available,true);assert.equal(body.business.counts.total,0);assert.equal(JSON.stringify(body).includes('private'),false);assert.equal(body.integrations.netlify.status,'external');
 const before=reads;assert.equal((await handler(new Request('https://example.test/api/admin/overview?days=90'))).status,400);assert.equal(reads,before);
});
test('réservations : hors ligne séparées, pas de fausse recette et aucun snapshot client exposé',()=>{
 const data=reservationSummary([{id:'one',event_id:'chaucase-2027',screens:1,state:'held',expected_total_cents:0,order_snapshot:{source:'offline',customer_email:'private@example.test'}},{id:'two',event_id:'chaucase-2027',screens:2,state:'released',release_reason:'session_expired',expected_total_cents:125898,order_snapshot:{price:{montage:'simple'},secret:'private'}}]);
 assert.equal(data.counts.offline,1);assert.equal(data.counts.held,0);assert.equal(data.counts.expired,1);assert.equal(data.reservations[0].expectedTotalCents,null);assert.equal(JSON.stringify(data).includes('private'),false);
});
test('encaissements Stripe : montants capturés, remboursements partiels, isolation et aucune estimation navigateur',()=>{
 const session={id:'cs_live',livemode:true,status:'complete',payment_status:'paid',currency:'cad',metadata:{inventory_pool:'pixanova-led',event:'chaucase-2027'},amount_total:999999,payment_intent:{latest_charge:{paid:true,currency:'cad',amount_captured:10000,amount_refunded:2000}}};
 const data=stripeSummary([session,session,{...session,id:'cs_test',livemode:false},{...session,id:'cs_validation',metadata:{event:'chaucase-2027'}}],{environment:'live'});
 assert.equal(data.sessions,1);assert.equal(data.paid,1);assert.equal(data.grossCents,10000);assert.equal(data.refundedCents,2000);assert.equal(data.netCents,8000);
 const unknown=stripeSummary([{...session,payment_intent:null}],{environment:'live'});assert.equal(unknown.unverifiedPayments,1);assert.equal(unknown.netCents,null);
 const full=stripeSummary([{...session,payment_intent:{latest_charge:{...session.payment_intent.latest_charge,amount_refunded:10000}}}],{environment:'live'});assert.equal(full.netCents,0);
});
