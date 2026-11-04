import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
test('PostgreSQL : collecte privée, agrégats, limitation atomique et purge sans toucher au stock',async()=>{
 const pg=new PGlite();
 try{
  await pg.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  await pg.exec(await readFile(new URL('../supabase/migrations/202611030003_admin_analytics.sql',import.meta.url),'utf8'));
  const session=randomUUID(),second=randomUUID();
  async function insert(name,eventId,sessionId,props={},when=new Date().toISOString()){
   await pg.query('insert into public.events_analytics_events(environment,id,session_id,event_id,name,props,created_at) values($1,$2,$3,$4,$5,$6,$7)',['test',randomUUID(),sessionId,eventId,name,JSON.stringify(props),when]);
  }
  await insert('page_view','generic',session,{source:'newsletter',campaign:'salon_2027'});
  await insert('quote_prepared','generic',session,{screens:4,montage:'animated',totalCents:396666,amountBasis:'before_tax'});
  await insert('cart_open','chaucase-2027',second,{screens:1,montage:'none'});
  await insert('page_view','generic',randomUUID(),{},new Date(Date.now()-31*86400000).toISOString());
  const report=async id=>(await pg.query('select public.events_analytics_report($1,$2,$3) as report',['test',new Date(Date.now()-3600000).toISOString(),id])).rows[0].report;
  const all=await report(null);assert.equal(all.totals.views,1);assert.equal(all.totals.sessions,2);assert.equal(all.funnel.find(x=>x.name==='quote_prepared').sessions,1);assert.equal(all.sources[0].source,'newsletter');assert.equal(all.carts.length,2);
  assert.equal((await report('generic')).totals.sessions,1);
  assert.equal((await pg.query('select public.events_analytics_report($1,$2,null) as report',['live',new Date(0).toISOString()])).rows[0].report.totals.events,0);
  const key='a'.repeat(64),allow=async()=>(await pg.query('select public.events_allow_request($1,3,86400) as allowed',[key])).rows[0].allowed;
  assert.equal(await allow(),true);assert.equal(await allow(),true);assert.equal(await allow(),true);assert.equal(await allow(),false);
  await assert.rejects(()=>pg.query('select public.events_allow_request(null,3,60)'));
  await assert.rejects(()=>insert('purchase','generic',session));
  const permissions=(await pg.query("select has_table_privilege('anon','public.events_analytics_events','select') as anon_read,has_table_privilege('authenticated','public.events_analytics_events','insert') as user_write,has_function_privilege('anon','public.events_analytics_report(text,timestamptz,text)','execute') as anon_report,has_function_privilege('service_role','public.events_analytics_report(text,timestamptz,text)','execute') as server_report")).rows[0];
  assert.deepEqual(permissions,{anon_read:false,user_write:false,anon_report:false,server_report:true});
  await pg.exec('select public.events_analytics_cleanup();');assert.equal((await pg.query('select count(*)::int as n from public.events_analytics_events')).rows[0].n,3);
  assert.equal((await pg.query("select count(*)::int as n from information_schema.tables where table_schema='public' and table_name like 'events_inventory%'")).rows[0].n,0);
 }finally{await pg.close()}
});
