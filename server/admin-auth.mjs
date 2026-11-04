import {createAdminAuth,AdminError,sameOrigin,boundedJSON} from './lib/admin-auth.mjs';
import {adminJSON,limitRequest} from './lib/admin-common.mjs';
import {createInventoryDb} from './lib/inventory-db.mjs';
export const makeHandler=({authFactory=createAdminAuth,dbFactory=createInventoryDb,env=process.env}={})=>async req=>{
 const auth=authFactory();
 try{
  if(req.method==='GET'){const account=await auth.require(req);return adminJSON({user:account.user},200,account.cookie)}
  if(!['POST','PATCH','DELETE'].includes(req.method))return adminJSON({error:'method_not_allowed'},405);
  if(!sameOrigin(req))return adminJSON({error:'origin_not_allowed'},403);
  if(req.method==='DELETE'){await auth.logout(req);return adminJSON({ok:true},200,auth.clearCookie())}
  await limitRequest(dbFactory(),req,'admin-auth',8,900,env);
  const body=await boundedJSON(req);
  if(!body||typeof body!=='object'||Array.isArray(body))throw new AdminError('invalid_body',400);
  if(req.method==='PATCH'){
   await auth.changePassword(req,body.currentPassword,body.newPassword);
   await auth.logout(req);return adminJSON({ok:true,reauthenticate:true},200,auth.clearCookie());
  }
  const account=await auth.login(body.email,body.password);
  return adminJSON({user:account.user},200,account.cookie);
 }catch(error){
  return adminJSON({error:error instanceof AdminError?error.message:'admin_unavailable'},error instanceof AdminError?error.status:503);
 }
};
export default makeHandler();
export const config={path:'/api/admin/auth'};
