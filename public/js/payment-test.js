import { paymentTestUrl } from './payment-test-config.js';

const language = new URL(location.href).searchParams.get('lang') === 'en' ? 'en' : 'fr';
const text = {
  fr: {
    eyebrow: 'Vérification technique', title: 'Test de paiement', amount: '1,00 $ CAD',
    description: 'Paiement réel et séparé des locations. Aucun écran n’est réservé.',
    pay: 'Payer 1,00 $ CAD avec Stripe',
    note: 'Utilisez votre vrai courriel pour vérifier le reçu. Remboursement après vérification. Lien limité à un paiement réussi.',
    error: 'Le lien de paiement est indisponible. Contactez Pixanova.',
  },
  en: {
    eyebrow: 'Technical verification', title: 'Payment test', amount: 'CA$1.00',
    description: 'This is a real payment, separate from rentals. No screen is reserved.',
    pay: 'Pay CA$1.00 with Stripe',
    note: 'Use your real email to check the receipt. Refund after verification. This link allows one successful payment.',
    error: 'The payment link is unavailable. Please contact Pixanova.',
  },
}[language];

document.documentElement.lang = language;
document.title = `${text.title} · Pixanova`;
for (const node of document.querySelectorAll('[data-copy]')) node.textContent = text[node.dataset.copy];
for (const node of document.querySelectorAll('[data-language]')) {
  if (node.dataset.language === language) node.setAttribute('aria-current', 'page');
}
try {
  const url = new URL(paymentTestUrl);
  if (url.protocol !== 'https:' || url.hostname !== 'buy.stripe.com') throw new Error('invalid_link');
  url.searchParams.set('locale', language);
  document.getElementById('testPayment').href = url.href;
  document.getElementById('testPayment').hidden = false;
} catch {
  document.getElementById('testStatus').textContent = text.error;
}
