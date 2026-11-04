const NS='http://www.w3.org/2000/svg';
const el=(tag,text,className)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e};
const svgEl=(tag,attrs={})=>{const e=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,String(v));return e};
const valid=value=>Number.isFinite(value)&&value>=0;
export function blank(target,message){target.replaceChildren(el('p',message,'empty chart-empty'))}
export function bars(target,items,{empty='Aucune donnée mesurée pour le moment.',unit=''}={}){
 const rows=items.filter(row=>valid(row.value));const max=Math.max(0,...rows.map(row=>row.value));
 if(!max){blank(target,empty);return}
 const wrap=el('div',undefined,'visual-bars');
 for(const row of rows){const item=el('div',undefined,'chart-row'),label=el('div',undefined,'chart-label');label.append(el('span',row.label),el('strong',row.value.toLocaleString('fr-CA')+(unit?' '+unit:'')));
  const meter=el('meter');meter.min=0;meter.max=max;meter.value=row.value;meter.setAttribute('aria-label',row.label+' : '+row.value);item.append(label,meter);wrap.append(item)}
 target.replaceChildren(wrap);
}
export function funnel(target,items,{empty='Aucun parcours mesuré pour le moment.'}={}){
 const max=Math.max(0,...items.map(row=>valid(row.value)?row.value:0));if(!max){blank(target,empty);return}
 const wrap=el('ol',undefined,'visual-funnel');
 items.forEach((row,i)=>{const item=el('li'),top=el('div',undefined,'funnel-top'),rank=el('span',i+1,'funnel-rank');top.append(rank,el('span',row.label),el('strong',String(row.value)));
 const meter=el('meter');meter.min=0;meter.max=max;meter.value=row.value;meter.setAttribute('aria-label',row.label+' : '+row.value);item.append(top,meter);wrap.append(item)});target.replaceChildren(wrap);
}
export function timeline(target,items){
 const rows=items.filter(row=>valid(row.value));if(!rows.length){blank(target,'Le graphique apparaîtra avec les premières visites ayant accepté les statistiques. Les visites passées non mesurées ne peuvent pas être récupérées.');return}
 const observedMax=Math.max(0,...rows.map(row=>row.value)),max=Math.max(1,observedMax),times=rows.map(row=>Date.parse(row.label+'T12:00:00Z')),min=Math.min(...times),last=Math.max(...times),span=last-min;
 const wrap=el('div',undefined,'timeline-chart'),meta=el('div',undefined,'chart-label');meta.append(el('span','Pages vues par jour'),el('span','Maximum : '+observedMax));
 const svg=svgEl('svg',{viewBox:'0 0 760 220',preserveAspectRatio:'none',role:'img','aria-label':'Pages vues mesurées chaque jour'});svg.classList.add('chart-svg');
 const title=svgEl('title');title.textContent=rows.map(row=>`${row.label} : ${row.value} pages vues`).join('; ');svg.append(title);
 for(let n=0;n<4;n++)svg.append(svgEl('line',{x1:20,x2:740,y1:20+n*60,y2:20+n*60,stroke:'#e6edf6','stroke-width':1}));
 const days=span/86400000+1,width=Math.min(85,Math.max(7,680/days*.65));
 rows.forEach((row,i)=>{const x=span?55+(times[i]-min)/span*650:380,h=row.value/max*175;const rect=svgEl('rect',{x:x-width/2,y:200-h,width,height:h,rx:4,fill:'#3268ee'});const tip=svgEl('title');tip.textContent=`${row.label} : ${row.value} pages vues`;rect.append(tip);svg.append(rect)});
 const labels=el('div',undefined,'chart-axis');const fmt=day=>new Intl.DateTimeFormat('fr-CA',{day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(day+'T12:00:00Z'));
 labels.append(el('span',fmt(rows[0].label)),el('span',rows.length>1?fmt(rows.at(-1).label):'Premières mesures'));
 wrap.append(meta,svg,labels);if(rows.length===1)wrap.append(el('p','Une seule journée mesurée pour le moment. Le graphique s’enrichira avec les prochaines visites.','chart-caption'));target.replaceChildren(wrap);
}
