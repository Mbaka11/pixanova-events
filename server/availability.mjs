import {json} from './lib/http.mjs';
import {createInventory} from './lib/inventory.mjs';
import {catalog} from './lib/config.mjs';
import {availabilityPeriod} from '../shared/generic.mjs';

export const makeHandler=(inventoryFactory=createInventory,now=Date.now)=>async req=>{
  if(req.method!=='GET')return json({error:'method_not_allowed'},405,{Allow:'GET'});
  const query=new URL(req.url).searchParams,from=query.get('from'),through=query.get('through');
  let dates;
  if(from!==null||through!==null){
    try{dates=availabilityPeriod(from,through,{now:now(),timeZone:catalog.platform.timeZone})}
    catch{return json({error:'invalid_dates'},400)}
  }
  try{
    const inventory=inventoryFactory();
    if(!dates){const pool=await inventory.assertReady();return json({total:pool.capacity,needsDates:true})}
    const stock=await inventory.stock({id:'generic',dates});
    return json({total:stock.total,taken:stock.taken,remaining:stock.remaining,from,through,...dates,informational:true});
  }catch{
    console.error('generic_availability_unavailable');return json({error:'stock_unavailable'},503);
  }
};
export default makeHandler();
export const config={path:'/api/availability'};
