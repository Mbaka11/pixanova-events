export const sectionNames={'s-offre':'Présentation','video':'Vidéo','comment':'Comment ça marche','offres':'Choix des écrans','montage':'Création de contenu','preuves':'Témoignages','faq':'Questions fréquentes','final':'Dernier appel à l’action'};
export function stageCount(report,name,key='sessions'){
 const value=report?.funnel?.find(item=>item.name===name)?.[key];return Number.isFinite(value)&&value>=0?value:0;
}
export function rentalFunnel(report){return [
 {label:'Ont ouvert le panier',value:stageCount(report,'cart_open')},
 {label:'Ont cliqué pour payer',value:stageCount(report,'checkout_attempt')},
 {label:'Sont passés vers Stripe',value:stageCount(report,'begin_checkout')},
];}
export function quoteFunnel(report){return [
 {label:'Ont ouvert la demande',value:stageCount(report,'quote_open')},
 {label:'Ont préparé leur courriel',value:stageCount(report,'quote_prepared')},
 {label:'Ont cliqué pour ouvrir leur courriel',value:stageCount(report,'email_open')},
];}
export function cartPreferences(carts=[]){
 const packs=[{label:'1 écran',value:0},{label:'2 écrans',value:0},{label:'3 écrans et plus',value:0}];
 const designs=[{label:'Sans création',value:0},{label:'Création graphique',value:0},{label:'Motion design',value:0}];
 const positions={none:0,simple:1,animated:2};
 for(const row of carts){const p=row.props||{};if(Number.isInteger(p.screens)&&p.screens>=1&&p.screens<=20)packs[Math.min(p.screens,3)-1].value++;
  if(Object.hasOwn(positions,p.montage))designs[positions[p.montage]].value++;
 }
 return {packs,designs};
}
export function summarizeInteractions(rows){
 const sections=new Map();
 for(const row of rows){const section=row.props?.section;if(!Object.hasOwn(sectionNames,section))continue;
  if(!sections.has(section))sections.set(section,{section,clicks:0,sessions:new Set()});
  const item=sections.get(section);if(row.name==='cta_click')item.clicks++;if(row.name==='section_view'&&typeof row.session_id==='string'&&row.session_id)item.sessions.add(row.session_id);
 }
 return Object.keys(sectionNames).map(section=>({section,clicks:sections.get(section)?.clicks||0,seenSessions:sections.get(section)?.sessions.size||0}));
}
export function timelineData(days=[]){
 return days.filter(item=>/^\d{4}-\d{2}-\d{2}$/.test(item.day)&&Number.isFinite(Date.parse(item.day+'T12:00:00Z'))&&new Date(item.day+'T12:00:00Z').toISOString().slice(0,10)===item.day&&Number.isFinite(item.views)&&item.views>=0).sort((a,b)=>a.day.localeCompare(b.day)).map(item=>({label:item.day,value:item.views}));
}
