import test from 'node:test';
import assert from 'node:assert/strict';
import {offlineRequestId,reserveOffline} from '../server/lib/offline-reservation.mjs';
import {createInventory,validRequestId} from '../server/lib/inventory.mjs';
import {getEvent} from '../config/catalog.mjs';
const event=getEvent('chaucase-2027');
test('référence hors ligne stable, UUID valide et séparation test/live',()=>{
 const id=offlineRequestId('live',event.id,'word-of-mouth-001');assert.ok(validRequestId(id));
 assert.equal(id,offlineRequestId('live',event.id,'word-of-mouth-001'));
 assert.notEqual(id,offlineRequestId('test',event.id,'word-of-mouth-001'));
 assert.throws(()=>offlineRequestId('live',event.id,'nom@example.com'));
});
test('réservation hors ligne : RPC transactionnel, retry unique, 19/20 et aucun paiement prétendu',async()=>{
 let row;
 const db={pool:async()=>({ready:true,capacity:20}),reserve:async p=>{
 const reused=!!row;
 if(!row)row={id:'offline',request_id:p.p_request_id,screens:p.p_screens,state:'allocating',rental_start:p.p_rental_start,rental_end:p.p_rental_end,order_snapshot:p.p_order_snapshot,expected_total_cents:p.p_expected_total_cents};
 assert.equal(p.p_environment,'live');return {ok:true,reused,reservation:{...row}};
 },request:async(path,{body})=>{assert.match(path,/state=eq.allocating/);Object.assign(row,body)},find:async()=>row,rows:async()=>[row]};
 const inventory=createInventory({db,environment:'live'});
 const first=await reserveOffline(inventory,event,1,'word-of-mouth-001');
 const second=await reserveOffline(inventory,event,1,'word-of-mouth-001');
 assert.equal(first.reused,false);assert.equal(second.reused,true);assert.equal(second.stock.remaining,19);assert.equal(second.stock.total,20);
 assert.equal(row.state,'held');assert.equal(row.expected_total_cents,0);assert.equal(row.order_snapshot.payment_status,'not_recorded');
 const stripe=new Proxy({},{get(){throw Error('Stripe ne doit pas être appelé')}});
 const result=await inventory.reconcile(stripe,row);assert.equal(result.session,null);assert.equal(row.state,'held');
 await assert.rejects(()=>inventory.reconcile(stripe,{...row,stripe_session_id:'cs_wrong'}),/inconsistent/);
});
