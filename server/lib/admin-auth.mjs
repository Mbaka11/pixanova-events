import {randomBytes,createCipheriv,createDecipheriv} from 'node:crypto';
const COOKIE='__Host-events_admin';
const MAX_AGE=8*60*60;
export class AdminError extends Error{constructor(code,status=503){super(code);this.status=status}}
export function sameOrigin(req){
 return req.headers.get('origin')===new URL(req.url).origin && req.headers.get('content-type')?.split(';')[0].trim()==='application/json';
}
export async function boundedJSON(req,limit=4096){
 const length=Number(req.headers.get('content-length')||0);if(length>limit)throw new AdminError('invalid_body',413);
 const reader=req.body?.getReader();if(!reader)throw new AdminError('invalid_body',400);
 const chunks=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw new AdminError('invalid_body',413)}chunks.push(value)}}finally{reader.releaseLock()}
 try{return JSON.parse(Buffer.concat(chunks).toString('utf8'))}catch{throw new AdminError('invalid_body',400)}
}
export function createAdminAuth({env=process.env,fetcher=fetch,now=Date.now}={}){
 function config(){
  const url=new URL(env.SUPABASE_URL||'https://invalid.invalid');
  const key=Buffer.from(env.ADMIN_SESSION_SECRET||'','base64');
  if(url.protocol!=='https:'||!url.hostname.endsWith('.supabase.co')||url.pathname!=='/'||url.search||url.hash||!env.SUPABASE_SECRET_KEY||key.length!==32||!env.EVENTS_ADMIN_EMAIL||!env.EVENTS_ADMIN_USER_ID)throw new AdminError('admin_not_configured');
  return {origin:url.origin,key};
 }
 const allowed=user=>user?.id===env.EVENTS_ADMIN_USER_ID&&typeof user.email==='string'&&user.email.toLowerCase()===env.EVENTS_ADMIN_EMAIL.toLowerCase()&&!!user.email_confirmed_at;
 async function request(path,{method='GET',body,token}={}){
  const {origin}=config();
  let r;
  try{r=await fetcher(origin+'/auth/v1/'+path,{method,headers:{apikey:env.SUPABASE_SECRET_KEY,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(10000)})}catch{throw new AdminError('auth_unavailable')}
  if(!r.ok){if([400,401,403,422].includes(r.status))throw new AdminError('invalid_credentials',401);throw new AdminError('auth_unavailable')}
  if(r.status===204)return null;return r.json();
 }
 function cookie(session){
  const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',config().key,iv);
  const encrypted=Buffer.concat([cipher.update(JSON.stringify(session),'utf8'),cipher.final()]);
  const value=Buffer.concat([iv,cipher.getAuthTag(),encrypted]).toString('base64url');
  if(value.length>3800)throw new AdminError('auth_session_too_large');
  return `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${MAX_AGE}`;
 }
 function decode(req){
  const value=(req.headers.get('cookie')||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
  if(!value||value.length>4000)return null;
  try{const data=Buffer.from(value,'base64url');if(data.length<29)return null;const cipher=createDecipheriv('aes-256-gcm',config().key,data.subarray(0,12));cipher.setAuthTag(data.subarray(12,28));const session=JSON.parse(Buffer.concat([cipher.update(data.subarray(28)),cipher.final()]).toString());
   if(!Number.isFinite(session.expiresAt)||session.expiresAt<=now()||session.expiresAt>now()+MAX_AGE*1000+60000||typeof session.accessToken!=='string'||typeof session.refreshToken!=='string')return null;return session;
  }catch{return null}
 }
 return {
  clearCookie:()=>`${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`,
  async login(email,password){
   config();if(typeof email!=='string'||email.toLowerCase()!==env.EVENTS_ADMIN_EMAIL.toLowerCase()||typeof password!=='string'||password.length<8||password.length>200)throw new AdminError('invalid_credentials',401);
   const data=await request('token?grant_type=password',{method:'POST',body:{email,password}});
   if(!allowed(data.user)||!data.access_token||!data.refresh_token)throw new AdminError('invalid_credentials',401);
   return {user:{email:data.user.email,role:'admin'},cookie:cookie({accessToken:data.access_token,refreshToken:data.refresh_token,expiresAt:now()+MAX_AGE*1000})};
  },
  async require(req){
   config();const session=decode(req);if(!session)throw new AdminError('authentication_required',401);
   let user,updatedCookie;
   try{user=await request('user',{token:session.accessToken})}catch(error){
    if(error.status!==401)throw error;
    const fresh=await request('token?grant_type=refresh_token',{method:'POST',body:{refresh_token:session.refreshToken}});
    if(!fresh.access_token||!fresh.refresh_token)throw new AdminError('authentication_required',401);
    session.accessToken=fresh.access_token;session.refreshToken=fresh.refresh_token;
    user=await request('user',{token:session.accessToken});updatedCookie=cookie(session);
   }
   if(!allowed(user))throw new AdminError('access_denied',403);
   return {user:{id:user.id,email:user.email,role:'admin'},cookie:updatedCookie,accessToken:session.accessToken};
  },
  async logout(req){const session=decode(req);if(session)try{await request('logout?scope=local',{method:'POST',token:session.accessToken})}catch{/* Supprimer le cookie même si le fournisseur est indisponible. */}},
  async changePassword(req,currentPassword,newPassword){
   const account=await this.require(req);
   if(typeof currentPassword!=='string'||currentPassword.length<8||currentPassword.length>200)throw new AdminError('invalid_credentials',401);
   if(typeof newPassword!=='string'||newPassword.length<14||newPassword.length>128||newPassword===currentPassword)throw new AdminError('password_too_weak',400);
   const checked=await request('token?grant_type=password',{method:'POST',body:{email:account.user.email,password:currentPassword}});
   if(!allowed(checked.user))throw new AdminError('invalid_credentials',401);
   await request('user',{method:'PUT',token:checked.access_token,body:{password:newPassword}});
   try{await request('logout?scope=local',{method:'POST',token:checked.access_token})}catch{/* Le cookie sera de toute façon supprimé par l’API. */}
  },
 };
}
