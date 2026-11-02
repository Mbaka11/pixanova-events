import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

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
test('page de paiement à 1 $ retirée', () => {
  assert.equal(existsSync(new URL('../public/test/index.html', import.meta.url)), false);
  assert.doesNotMatch(read('netlify.toml'), /for = "\/test/);
});
