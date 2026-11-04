import test from 'node:test';
import assert from 'node:assert/strict';
import {stageCount,rentalFunnel,quoteFunnel,cartPreferences,summarizeInteractions,timelineData} from '../shared/admin-view.mjs';
test('graphiques : étapes réelles, sans transformer un clic en paiement',()=>{
 const report={funnel:[{name:'cart_open',sessions:8,events:12},{name:'checkout_attempt',sessions:4,events:5},{name:'begin_checkout',sessions:3,events:3},{name:'quote_open',sessions:5,events:8},{name:'quote_prepared',sessions:2,events:4}]};
 assert.deepEqual(rentalFunnel(report).map(x=>x.value),[8,4,3]);assert.deepEqual(quoteFunnel(report).map(x=>x.value),[5,2,0]);
 assert.equal(stageCount(report,'cart_open','events'),12);assert.equal(rentalFunnel(report).some(x=>x.label.includes('confirmé')),false);
});
test('graphiques : choix observés sans inventer les choix manquants',()=>{
 const result=cartPreferences([{props:{screens:1,montage:'none'}},{props:{screens:4,montage:'animated'}},{props:{screens:2,montage:'simple'}},{props:{screens:999}},{props:{}}]);
 assert.deepEqual(result.packs.map(x=>x.value),[1,1,1]);assert.deepEqual(result.designs.map(x=>x.value),[1,1,1]);
 assert.deepEqual(cartPreferences().packs.map(x=>x.value),[0,0,0]);
});
test('graphiques : profondeur par session distincte, clics par action, aucune identité renvoyée',()=>{
 const rows=[{name:'section_view',session_id:'private-session',props:{section:'offres'}},{name:'section_view',session_id:'private-session',props:{section:'offres'}},{name:'section_view',session_id:'second',props:{section:'offres'}},{name:'cta_click',session_id:'private-session',props:{section:'offres'}},{name:'cta_click',session_id:'private-session',props:{section:'offres'}},{name:'section_view',props:{section:'faq'}},{name:'cta_click',props:{section:'<script>'}}];
 const data=summarizeInteractions(rows);assert.deepEqual(data.find(x=>x.section==='offres'),{section:'offres',clicks:2,seenSessions:2});assert.equal(data.find(x=>x.section==='faq').seenSessions,0);assert.equal(JSON.stringify(data).includes('private-session'),false);
});
test('graphique temporel : conserver seulement les jours mesurés, sans faux historique',()=>{
 assert.deepEqual(timelineData([{day:'2026-11-04',views:2},{day:'2026-11-02',views:1},{day:'<script>',views:20},{day:'2026-02-30',views:4},{day:'2026-11-03',views:-1}]),[{label:'2026-11-02',value:1},{label:'2026-11-04',value:2}]);
 assert.deepEqual(timelineData(),[]);
});
