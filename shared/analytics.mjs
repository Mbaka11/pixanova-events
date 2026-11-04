export const analyticsNames=['page_view','section_view','cta_click','screens_change','design_change','dates_change','cart_open','cart_update','cart_close','quote_open','quote_close','quote_prepared','email_open','summary_copy','checkout_attempt','begin_checkout','checkout_error','video_play','video_unmute','video_progress'];
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const sections=new Set(['s-offre','video','comment','offres','montage','preuves','faq','final']);
export function sanitizeAnalytics(body,eventIds){
 if(!body||typeof body!=='object'||body.consent!==true||!uuid(body.id)||!uuid(body.sessionId)||!['generic',...eventIds].includes(body.eventId)||!analyticsNames.includes(body.name))return null;
 const input=body.props;if(!input||typeof input!=='object'||Array.isArray(input))return null;
 const props={};
 if(['fr','en'].includes(input.language))props.language=input.language;
 if(sections.has(input.section))props.section=input.section;
 for(const [key,min,max]of [['screens',1,20],['days',1,366],['totalCents',0,100000000],['percent',0,100]])if(Number.isInteger(input[key])&&input[key]>=min&&input[key]<=max)props[key]=input[key];
 if(['none','simple','animated'].includes(input.montage))props.montage=input.montage;
 if(['before_tax','tax_included'].includes(input.amountBasis))props.amountBasis=input.amountBasis;
 if(['close','back','escape'].includes(input.reason))props.reason=input.reason;
 if(['checkout_failed','quote_changed','not_enough_stock','checkout_paused','unknown'].includes(input.code))props.code=input.code;
 for(const key of ['source','medium','campaign'])if(typeof input[key]==='string'&&/^[a-zA-Z0-9_-]{1,60}$/.test(input[key]))props[key]=input[key];
 if(typeof input.referrer==='string'&&/^(?:[a-z0-9-]+\.)+[a-z]{2,20}$/.test(input.referrer)&&input.referrer.length<150)props.referrer=input.referrer;
 return {id:body.id,session_id:body.sessionId,event_id:body.eventId,name:body.name,props};
}
