import Stripe from 'stripe';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { liveConfig } from './lib/live-config.mjs';

// Commande opérateur : aucun endpoint public ne peut modifier le montant.
// Le lien est limité à un paiement réussi ; aucun écran n'est réservé.
export const PURPOSE = 'pixanova_live_validation_1cad_v1';

async function main() {
  if (!process.argv.includes('--live')) throw new Error('explicit_live_required');
  const env = liveConfig();
  const stripe = new Stripe(env.STRIPE_SECRET_KEY, { timeout: 10000, maxNetworkRetries: 1 });
  const existing = [];
  for await (const link of stripe.paymentLinks.list({ limit: 100 })) {
    if (link.metadata?.purpose === PURPOSE) existing.push(link);
  }
  if (existing.length > 1) throw new Error('payment_test_link_ambiguous');
  let link = existing[0];
  let price;
  if (!link) {
    const product = await stripe.products.create({
      name: 'TEST réel Pixanova — validation de paiement',
      description: 'Paiement technique de 1 CAD. Aucun écran ni service de location réservé. Remboursement après vérification.',
      metadata: { purpose: PURPOSE },
    }, { idempotencyKey: `${PURPOSE}:product` });
    price = await stripe.prices.create({
      product: product.id, currency: 'cad', unit_amount: 100, tax_behavior: 'inclusive',
      metadata: { purpose: PURPOSE },
    }, { idempotencyKey: `${PURPOSE}:price` });
    link = await stripe.paymentLinks.create({
      line_items: [{ price: price.id, quantity: 1, adjustable_quantity: { enabled: false } }],
      automatic_tax: { enabled: false }, allow_promotion_codes: false,
      restrictions: { completed_sessions: { limit: 1 } },
      name_collection: { individual: { enabled: true, optional: false } },
      invoice_creation: { enabled: false },
      metadata: { purpose: PURPOSE }, payment_intent_data: { metadata: { purpose: PURPOSE } },
      after_completion: { type: 'hosted_confirmation', hosted_confirmation: {
        custom_message: 'Paiement de validation enregistré. Aucun écran réservé. Conservez votre reçu Stripe ; le remboursement sera effectué après vérification.',
      } },
      inactive_message: 'Ce lien de validation à usage unique a déjà été utilisé ou a été désactivé.',
    }, { idempotencyKey: `${PURPOSE}:link` });
  }
  assert.equal(link.livemode, true);
  assert.equal(link.metadata.purpose, PURPOSE);
  assert.equal(link.restrictions?.completed_sessions?.limit, 1);
  const items = await stripe.paymentLinks.listLineItems(link.id, { limit: 10 });
  assert.equal(items.data.length, 1);
  const item = items.data[0];
  assert.equal(item.quantity, 1); assert.equal(item.amount_total, 100); assert.equal(item.currency, 'cad');
  assert.equal(item.price.unit_amount, 100);
  const url = new URL(link.url);
  assert.equal(url.protocol, 'https:'); assert.equal(url.hostname, 'buy.stripe.com');
  await mkdir(new URL('../temp/', import.meta.url), { recursive: true });
  await writeFile(new URL('../temp/live-one-dollar-link.json', import.meta.url), JSON.stringify({
    purpose: PURPOSE, id: link.id, url: link.url, priceId: item.price.id,
    productId: typeof item.price.product === 'string' ? item.price.product : item.price.product.id,
    active: link.active, amountCents: 100, currency: 'cad', livemode: true,
  }, null, 2));
  await writeFile(new URL('../public/js/payment-test-config.js', import.meta.url),
    '// Lien public Stripe : montant fixe, aucun secret et aucun stock de location.\nexport const paymentTestUrl = ' + JSON.stringify(link.url) + ';\n');
  console.log('Lien réel de 1 CAD vérifié, limité à un paiement ; configuration publique enregistrée. Aucun débit effectué.');
}
main().catch(() => { console.error('Création du lien interrompue ; aucun secret affiché.'); process.exitCode = 1; });
