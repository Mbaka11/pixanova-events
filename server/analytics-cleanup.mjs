import {createInventoryDb} from './lib/inventory-db.mjs';
export default async()=>{
 if(!process.env.SUPABASE_URL||!process.env.SUPABASE_SECRET_KEY)return; // Purger aussi quand la collecte est désactivée.
 try{await createInventoryDb().rpc('events_analytics_cleanup',{})}catch{console.error('analytics_cleanup_failed')}
};
export const config={schedule:'17 4 * * *'};
