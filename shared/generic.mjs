// Disponibilité informative seulement : aucune allocation ni tarification à la durée.
export function validateGenericConfig(config) {
  if(!Number.isInteger(config?.maxScreens)||config.maxScreens<3||config.maxScreens>20)throw new Error('generic_config_invalid');
  if(!Number.isInteger(config.referenceDays)||config.referenceDays<1||config.referenceDays>365)throw new Error('generic_config_invalid');
  for(const key of ['one','two','perScreen'])if(!Number.isSafeInteger(config.pricing?.[key])||config.pricing[key]<=0)throw new Error('generic_config_invalid');
  for(const key of ['desktopVideo','mobileVideo'])if(!/^\/assets\/[a-zA-Z0-9_./-]+$/.test(config.media?.[key]||'')||config.media[key].includes('..'))throw new Error('generic_config_invalid');
  return config;
}
export function referenceRentalPrice(config,screens) {
  if(!Number.isInteger(screens)||screens<1||screens>config.maxScreens)throw new RangeError('invalid_screens');
  return screens===1?config.pricing.one:screens===2?config.pricing.two:config.pricing.perScreen*screens;
}
function validDay(day) {
  if(typeof day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(day))return false;
  const value=Date.parse(day+'T00:00:00Z');
  return Number.isFinite(value)&&new Date(value).toISOString().slice(0,10)===day;
}
export function localDate(now=Date.now(),timeZone='America/Toronto') {
  return new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));
}
function midnight(day,timeZone) {
  const target=Date.parse(day+'T00:00:00Z');let result=target;
  const fmt=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
  for(let i=0;i<4;i++){
    const p=Object.fromEntries(fmt.formatToParts(new Date(result)).map(p=>[p.type,p.value]));
    const represented=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second);
    const delta=target-represented;if(delta===0)return new Date(result).toISOString();result+=delta;
  }
  throw new Error('invalid_timezone_date');
}
export function availabilityPeriod(from,through,{now=Date.now(),timeZone='America/Toronto'}={}) {
  if(!validDay(from)||!validDay(through)||from>through||from<localDate(now,timeZone))throw new RangeError('invalid_dates');
  const duration=(Date.parse(through)-Date.parse(from))/86400000;
  if(duration>365||from>String(Number(localDate(now,timeZone).slice(0,4))+3)+'-12-31')throw new RangeError('invalid_dates');
  const next=new Date(Date.parse(through+'T00:00:00Z')+86400000).toISOString().slice(0,10);
  return {rentalStartsAt:midnight(from,timeZone),rentalEndsAt:midnight(next,timeZone)};
}
