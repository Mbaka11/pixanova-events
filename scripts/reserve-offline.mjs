import {localConfig} from './lib/local-config.mjs';
import {liveConfig} from './lib/live-config.mjs';
import {getEvent} from '../config/catalog.mjs';
import {createInventoryDb} from '../server/lib/inventory-db.mjs';
import {createInventory} from '../server/lib/inventory.mjs';
import {reserveOffline} from '../server/lib/offline-reservation.mjs';
const args=process.argv.slice(2),environment=args.includes('--live')?'live':'test';
const value=flag=>args[args.indexOf(flag)+1];
try {
  if(!args.includes('--event')||!args.includes('--reference')||!args.includes('--screens'))throw new Error('arguments_missing');
  const event=getEvent(value('--event'));if(!event)throw new Error('event_unknown');
  const config=environment==='live'?liveConfig():localConfig();
  const db=createInventoryDb({url:config.SUPABASE_URL,secret:config.SUPABASE_SECRET_KEY});
  const inventory=createInventory({db,environment});
  const result=await reserveOffline(inventory,event,Number(value('--screens')),value('--reference'));
  console.log(JSON.stringify({environment,eventId:event.id,...result}));
}catch{console.error('Réservation hors ligne arrêtée. Vérifier arguments, référence, stock et configuration. Ne pas changer de référence lors d’un retry.');process.exitCode=1;}
