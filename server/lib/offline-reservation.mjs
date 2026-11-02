import { createHash } from 'node:crypto';
import { fingerprint } from './inventory-db.mjs';

// Reference non personnelle et stable : relancer la commande ne réserve pas deux fois.
export function offlineRequestId(environment, eventId, reference) {
  if (!['live','test'].includes(environment) || !/^[a-z0-9-]{1,80}$/.test(reference)) throw new Error('offline_reference_invalid');
  const bytes=createHash('sha256').update(`${environment}:${eventId}:offline:${reference}`).digest().subarray(0,16);
  bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
  const h=bytes.toString('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}

export async function reserveOffline(inventory, event, screens, reference) {
  if (!event.active || !Number.isInteger(screens) || screens<1 || screens>event.maxScreensPerOrder) throw new Error('offline_reservation_invalid');
  await inventory.assertReady();
  const {db,environment,poolId}=inventory;
  const requestId=offlineRequestId(environment,event.id,reference);
  const snapshot={source:'offline',reference,payment_status:'not_recorded'};
  const result=await db.reserve({p_environment:environment,p_pool_id:poolId,p_request_id:requestId,
    p_request_fingerprint:fingerprint({eventId:event.id,screens,snapshot}),p_event_id:event.id,p_screens:screens,
    p_rental_start:event.dates.rentalStartsAt,p_rental_end:event.dates.rentalEndsAt,
    p_hold_until:new Date(Date.now()+30*60*1000).toISOString(),p_expected_total_cents:0,p_currency:'cad',p_order_snapshot:snapshot});
  if (!result.ok) throw new Error(result.error || 'offline_reservation_failed');
  // La réservation RPC a déjà alloué le stock sous verrou de parc. Cet état
  // ne change pas la quantité, et ne prétend pas qu'un paiement a été encaissé.
  if(result.reservation.state==='allocating')await db.request(`events_reservations?environment=eq.${environment}&request_id=eq.${requestId}&state=eq.allocating`,{
    method:'PATCH',body:{state:'held',updated_at:new Date().toISOString()}});
  const row=await db.find(environment,requestId);
  if(!row || row.state==='released' || row.order_snapshot?.source!=='offline')throw new Error('offline_reservation_not_active');
  return {requestId,reused:result.reused,stock:await inventory.stock(event)};
}
