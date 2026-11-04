import { mkdirSync, writeFileSync, copyFileSync, statSync } from 'node:fs';
import { catalog } from '../config/catalog.mjs';
import { buildGeneric } from './build-generic.mjs';

// Échouer au build plutôt que publier un logo ou une vidéo manquante.
const assets = [catalog.platform.brand.logo, ...Object.values(catalog.generic.media), ...catalog.events.flatMap((event) => [event.logo, event.media.desktopVideo, event.media.mobileVideo])];
for (const asset of assets) {
  if (!statSync(new URL(`../public${asset}`, import.meta.url)).isFile()) throw new Error(`Média invalide : ${asset}`);
}
const js = new URL('../public/js/', import.meta.url);
mkdirSync(js, { recursive: true });
writeFileSync(new URL('catalog-data.js', js), '// Généré depuis config/ : ne pas modifier. AUCUN secret dans config/.\nexport default ' + JSON.stringify(catalog, null, 2) + ';\n');
copyFileSync(new URL('../shared/events.mjs', import.meta.url), new URL('events-shared.js', js));
copyFileSync(new URL('../shared/i18n.mjs', import.meta.url), new URL('i18n.mjs', js));
copyFileSync(new URL('../shared/montage.mjs', import.meta.url), new URL('montage.mjs', js));
copyFileSync(new URL('../shared/generic.mjs', import.meta.url), new URL('generic-shared.mjs', js));
copyFileSync(new URL('../shared/generic-i18n.mjs', import.meta.url), new URL('generic-i18n.mjs', js));
copyFileSync(new URL('../shared/analytics.mjs', import.meta.url), new URL('analytics-shared.mjs', js));
mkdirSync(new URL('../public/admin/', import.meta.url), {recursive:true});
copyFileSync(new URL('../shared/admin-view.mjs', import.meta.url), new URL('../public/admin/view-data.mjs', import.meta.url));
buildGeneric();
console.log(`${catalog.platform.name} : ${catalog.events.length} événement(s) validé(s).`);
