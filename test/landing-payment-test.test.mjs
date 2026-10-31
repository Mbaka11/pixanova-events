import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('landing : ordre historique vidéo, étapes, prix, contenu, preuves, FAQ', () => {
  const source = read('public/evenement.html');
  const positions = ['video','comment','offres','montage','preuves','faq'].map(id => {
    const match = source.match(new RegExp(`<section[^>]+id="${id}"`));
    assert.ok(match, id); return match.index;
  });
  assert.deepEqual(positions, [...positions].sort((a,b) => a-b));
  assert.equal((source.match(/data-b="[123]"/g) || []).length, 3);
});
test('landing : le défilement horizontal mobile ne reste pas écrasé par landing.css', () => {
  assert.match(read('public/css/styles.css'), /\.offers\{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory/);
  const landing = read('public/css/landing.css');
  assert.doesNotMatch(landing, /\.offers\{display:grid!important/);
  assert.doesNotMatch(landing, /\.swipe-h\{display:none!important/);
});
test('/test : page non indexée, paiement réel expliqué et aucune promesse de location', () => {
  const page = read('public/test/index.html');
  assert.match(page, /name="robots" content="noindex,nofollow,noarchive"/);
  assert.match(page, /Paiement réel et séparé des locations/);
  assert.match(page, /Aucun écran n’est réservé/);
  assert.match(page, /1,00 \$ CAD/);
  assert.doesNotMatch(page, /<input|<form/);
  const main = read('public/evenement.html') + read('public/index.html');
  assert.doesNotMatch(main, /href="\/test(?:[/?"])/);
});
test('/test : lien Stripe public strict, sans paramètre de prix ni appel au Checkout de location', () => {
  const config = read('public/js/payment-test-config.js');
  const url = new URL(JSON.parse(config.match(/export const paymentTestUrl = ("[^"\n]+");/)[1]));
  assert.equal(url.protocol, 'https:'); assert.equal(url.hostname, 'buy.stripe.com');
  assert.equal(url.search, ''); assert.equal(url.pathname.startsWith('/test_'), false);
  const script = read('public/js/payment-test.js');
  assert.doesNotMatch(script, /\/api\/checkout|fetch\(|unit_amount|payment_status/);
  assert.match(script, /url\.hostname !== 'buy\.stripe\.com'/);
  assert.match(script, /This is a real payment/);
});
test('/test : en-têtes de non-indexation et de non-cache', () => {
  const config = read('netlify.toml');
  for (const path of ['/test','/test/*']) {
    const block = config.slice(config.indexOf(`for = "${path}"`)).split('[[headers]]')[0];
    assert.match(block, /X-Robots-Tag = "noindex, nofollow, noarchive"/);
    assert.match(block, /Cache-Control = "no-store"/);
  }
});
