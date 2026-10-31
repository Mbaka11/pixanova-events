import Stripe from 'stripe';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { liveConfig } from './lib/live-config.mjs';

// Opérateur seulement. Ne rembourse que le paiement de 1 CAD du lien publié /test.
async function main() {
  if (!process.argv.includes('--live')) throw new Error('explicit_live_required');
  const env = liveConfig();
  const source = await readFile(new URL('../public/js/payment-test-config.js', import.meta.url), 'utf8');
  const match = source.match(/export const paymentTestUrl = ("[^"\n]+");/);
  if (!match) throw new Error('payment_test_link_missing');
  const url = JSON.parse(match[1]);
  const stripe = new Stripe(env.STRIPE_SECRET_KEY, { timeout: 10000, maxNetworkRetries: 1 });
  const links = [];
  for await (const link of stripe.paymentLinks.list({ limit: 100 })) {
    if (link.url === url && link.metadata?.purpose === 'pixanova_live_validation_1cad_v1') links.push(link);
  }
  assert.equal(links.length, 1);
  assert.equal(links[0].livemode, true);
  const paid = [];
  for await (const session of stripe.checkout.sessions.list({ payment_link: links[0].id, limit: 100 })) {
    if (session.payment_status === 'paid') paid.push(session);
  }
  if (!paid.length) { console.log('Aucun paiement de 1 CAD confirmé sur /test ; aucun remboursement lancé.'); return; }
  assert.equal(paid.length, 1);
  const session = await stripe.checkout.sessions.retrieve(paid[0].id, { expand: ['payment_intent.latest_charge'] });
  assert.equal(session.livemode, true); assert.equal(session.currency, 'cad'); assert.equal(session.amount_total, 100);
  assert.equal(session.metadata.purpose, 'pixanova_live_validation_1cad_v1');
  assert.equal(session.payment_link, links[0].id);
  if (session.payment_intent.latest_charge.refunded) {
    console.log('Le paiement de validation de 1 CAD est déjà intégralement remboursé.'); return;
  }
  const refund = await stripe.refunds.create({
    payment_intent: session.payment_intent.id,
    metadata: { purpose: 'pixanova_live_validation_1cad_v1', payment_link: links[0].id },
  }, { idempotencyKey: `pixanova-validation-refund:${session.id}` });
  console.log('Remboursement du paiement de validation demandé ; statut Stripe :', refund.status, '. Aucun paiement de location modifié.');
}
main().catch(() => { console.error('Remboursement arrêté : paiement ou autorisation à vérifier. Aucun secret affiché.'); process.exitCode = 1; });
