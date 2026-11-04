import {createHmac} from 'node:crypto';
import {json} from './http.mjs';
import {AdminError} from './admin-auth.mjs';
export function adminJSON(data,status=200,cookie){
 const response=json(data,status,{'X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer'});
 if(cookie)response.headers.set('Set-Cookie',cookie);return response;
}
export async function limitRequest(db,req,purpose,limit,seconds,env=process.env){
 if(!env.ADMIN_SESSION_SECRET)throw new AdminError('admin_not_configured');
 const ip=req.headers.get('x-nf-client-connection-ip')||'unknown';
 const hash=createHmac('sha256',env.ADMIN_SESSION_SECRET).update(purpose+':'+ip).digest('hex');
 const allowed=await db.rpc('events_allow_request',{p_key_hash:hash,p_limit:limit,p_window_seconds:seconds});
 if(allowed!==true)throw new AdminError('rate_limited',429);
}
