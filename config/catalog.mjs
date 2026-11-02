// Enregistrer chaque nouveau salon ici. Aucun secret dans config/ : ces données sont publiques.
import platform from './platform.json' with { type: 'json' };
import chaucase from './events/chaucase-2027.json' with { type: 'json' };
import { validateCatalog } from '../shared/events.mjs';
import generic from './generic.json' with { type: 'json' };
import { validateGenericConfig } from '../shared/generic.mjs';

export const catalog = validateCatalog({ platform, events: [chaucase], generic: validateGenericConfig(generic) });
export const getEvent = (id) => catalog.events.find((event) => event.id === id) ?? null;
