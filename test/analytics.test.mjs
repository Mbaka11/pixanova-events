import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {sanitizeAnalytics} from '../shared/analytics.mjs';
import {makeHandler} from '../server/analytics.mjs';
const payload=()=>({id:randomUUID(),sessionId:randomUUID(),eventId:'chaucase-2027',name:'cart_update',consent:true,props:{screens:2,montage:'animated',totalCents:123000,amountBasis:'tax_included',language:'fr'}});
test('collecte : schéma fermé, consentement explicite et aucune identité / texte libre',()=>{
 const body=payload();Object.assign(body.props,{email:'private@example.test',phone:'555',notes:'secret',location:'private',label:'texte libre',source:'newsletter',medium:'email',campaign:'salon_2027',referrer:'google.com'});
 const data=sanitizeAnalytics(body,['chaucase-2027']);assert.equal(data.props.screens,2);assert.equal(data.props.campaign,'salon_2027');assert.equal(data.props.email,undefined);assert.equal(data.props.label,undefined);assert.equal(JSON.stringify(data).includes('private'),false);
 for(const patch of [{consent:false},{name:'purchase'},{name:'paid'},{sessionId:'not-a-uuid'},{eventId:'other'}])assert.equal(sanitizeAnalytics({...body,...patch},['chaucase-2027']),null);
 const bad=sanitizeAnalytics({...body,props:{source:'private@example.test',referrer:'https://example.test/?email=private',screens:999,totalCents:-1}},['chaucase-2027']);assert.deepEqual(bad.props,{});
});
test('API collecte : environnement serveur, anti-abus pseudonymisé et déduplication demandée',async()=>{
 let stored,rate;
 const handler=makeHandler({env:{EVENTS_ANALYTICS_ENABLED:'true',ADMIN_SESSION_SECRET:'unit-secret',STRIPE_SECRET_KEY:'sk_live_unit'},dbFactory:()=>({rpc:async(name,body)=>{rate={name,body};return true},request:async(path,options)=>{stored={path,options}}})});
 const body={...payload(),environment:'test'};
 const req=new Request('https://example.test/api/analytics',{method:'POST',headers:{origin:'https://example.test','content-type':'application/json','x-nf-client-connection-ip':'192.0.2.4'},body:JSON.stringify(body)});
 assert.equal((await handler(req)).status,204);assert.equal(stored.options.body.environment,'live');assert.match(stored.options.prefer,/ignore-duplicates/);assert.equal(rate.body.p_key_hash.length,64);assert.equal(JSON.stringify(rate).includes('192.0.2.4'),false);
 const publicData=await handler(new Request('https://example.test/api/analytics?report=true'));assert.deepEqual(await publicData.json(),{enabled:true});
});
test('API collecte : refus, origine étrangère, faux paiement et corps surdimensionné bloqués',async()=>{
 let writes=0;const handler=makeHandler({env:{EVENTS_ANALYTICS_ENABLED:'true',ADMIN_SESSION_SECRET:'unit-secret',STRIPE_SECRET_KEY:'sk_live_unit'},dbFactory:()=>({rpc:async()=>true,request:async()=>writes++})});
 const req=(body,origin='https://example.test')=>new Request('https://example.test/api/analytics',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
 assert.equal((await handler(req(payload(),'https://evil.test'))).status,403);
 assert.equal((await handler(req({...payload(),consent:false}))).status,400);
 assert.equal((await handler(req({...payload(),name:'purchase'}))).status,400);
 assert.equal((await handler(req({...payload(),props:{notes:'x'.repeat(5000)}}))).status,413);assert.equal(writes,0);
 const limited=makeHandler({env:{EVENTS_ANALYTICS_ENABLED:'true',ADMIN_SESSION_SECRET:'unit-secret'},dbFactory:()=>({rpc:async()=>false})});assert.equal((await limited(req(payload()))).status,429);
});
test('collecte désactivée tant que configuration serveur absente; aucune lecture base',async()=>{
 let called=false;const handler=makeHandler({env:{},dbFactory:()=>{called=true}});
 assert.deepEqual(await (await handler(new Request('https://example.test/api/analytics'))).json(),{enabled:false});
 assert.equal((await handler(new Request('https://example.test/api/analytics',{method:'POST'}))).status,503);assert.equal(called,false);
});
