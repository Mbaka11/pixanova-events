export function reservationSummary(rows){
 const counts={total:rows.length,paid:0,held:0,pending:0,released:0,review:0,allocating:0,offline:0,expired:0,paymentFailed:0,refunded:0};
 const reservations=rows.map(row=>{
  const offline=row.order_snapshot?.source==='offline';if(offline)counts.offline++;else if(row.state in counts)counts[row.state]++;
  if(!offline&&row.release_reason==='session_expired')counts.expired++;
  if(!offline&&row.release_reason==='payment_failed')counts.paymentFailed++;
  if(!offline&&row.release_reason==='full_refund')counts.refunded++;
  return {id:row.id,eventId:row.event_id,screens:row.screens,state:row.state,reason:row.release_reason,offline,
   montage:row.order_snapshot?.price?.montage||'none',expectedTotalCents:offline?null:row.expected_total_cents,
   createdAt:row.created_at,stripePaymentIntentId:offline?null:row.stripe_payment_intent_id||null};
 });
 return {counts,reservations};
}
export function stripeSummary(sessions,{environment,eventId=null}={}){
 let grossCents=0,refundedCents=0,paid=0,unverifiedPayments=0;const seen=new Set();
 const stages={open:0,expired:0,complete:0,asyncPending:0};
 const byEvent=Object.create(null);
 for(const session of sessions){
  if(seen.has(session.id)||session.livemode!==(environment==='live')||session.currency!=='cad'||session.metadata?.inventory_pool!=='pixanova-led'||(eventId&&session.metadata.event!==eventId))continue;
  seen.add(session.id);if(session.status in stages)stages[session.status]++;
  const event=session.metadata.event||'unknown';byEvent[event]??={sessions:0,paid:0,netCents:0};byEvent[event].sessions++;
  if(session.status!=='complete')continue;
  if(session.payment_status!=='paid'){stages.asyncPending++;continue}
  paid++;byEvent[event].paid++;
  const charge=typeof session.payment_intent==='object'?session.payment_intent?.latest_charge:null;
  if(!charge||typeof charge!=='object'||charge.paid!==true||charge.currency!=='cad'||!Number.isSafeInteger(charge.amount_captured)||!Number.isSafeInteger(charge.amount_refunded)||charge.amount_captured<0||charge.amount_refunded<0||charge.amount_refunded>charge.amount_captured){unverifiedPayments++;byEvent[event].unverified=true;continue}
  grossCents+=charge.amount_captured;refundedCents+=charge.amount_refunded;byEvent[event].netCents+=charge.amount_captured-charge.amount_refunded;
 }
 for(const entry of Object.values(byEvent))if(entry.unverified)entry.netCents=null;
 return {sessions:seen.size,paid,...stages,grossCents:unverifiedPayments?null:grossCents,refundedCents:unverifiedPayments?null:refundedCents,netCents:unverifiedPayments?null:grossCents-refundedCents,unverifiedPayments,byEvent};
}
