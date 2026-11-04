// Opérateur uniquement : compte distinct Events, secret fort, aucune invitation ni mot de passe en console.
import {randomBytes,createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {getGlobalConfigStore} from '@netlify/dev-utils';
import {NetlifyAPI} from '@netlify/api';
import {localConfig} from './lib/local-config.mjs';
import {createInventoryDb} from '../server/lib/inventory-db.mjs';
let stage='arguments';
try{
 const index=process.argv.indexOf('--email'),email=index>=0?process.argv[index+1]?.toLowerCase():null;
 if(!email||!/^[-a-z0-9._+]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email))throw Error('email_required');
 const local=localConfig(),store=await getGlobalConfigStore(),userId=store.get('userId');
 const token=process.env.NETLIFY_AUTH_TOKEN||store.get(`users.${userId}.auth.token`);if(!token)throw Error('netlify_auth_missing');
 const api=new NetlifyAPI(token),siteId='4178884e-19dc-4d92-81e6-7438deca1962';
 stage='vérification du projet';const site=await api.getSite({site_id:siteId});if(site.name!=='pixanova-events-test'||site.custom_domain!=='events.pixanova.ca')throw Error('site_mismatch');
 const accountId=site.account_slug,variables=await api.getEnvVars({accountId,siteId});
 const value=key=>variables.find(v=>v.key===key)?.values?.find(v=>v.context==='production')?.value;
 if(new URL(value('SUPABASE_URL')||'https://invalid.invalid').origin!==new URL(local.SUPABASE_URL).origin)throw Error('supabase_project_mismatch');
 const db=createInventoryDb({url:local.SUPABASE_URL,secret:local.SUPABASE_SECRET_KEY});
 stage='preuve migration';const key=createHash('sha256').update(randomBytes(32)).digest('hex');
 if(await db.rpc('events_allow_request',{p_key_hash:key,p_limit:1,p_window_seconds:60})!==true)throw Error('migration_missing');
 const authHeaders={apikey:local.SUPABASE_SECRET_KEY,'Content-Type':'application/json',...(!local.SUPABASE_SECRET_KEY.startsWith('sb_secret_')?{Authorization:'Bearer '+local.SUPABASE_SECRET_KEY}:{})};
 async function auth(path,options={}){const r=await fetch(new URL('/auth/v1/'+path,local.SUPABASE_URL),{...options,headers:authHeaders,signal:AbortSignal.timeout(15000)});if(!r.ok)throw Object.assign(Error('auth_operation_failed'),{status:r.status});return r.json()}
 stage='compte Supabase Auth';let account;
 for(let page=1;page<=5;page++){const data=await auth(`admin/users?page=${page}&per_page=100`);account=data.users?.find(u=>u.email?.toLowerCase()===email);if(account||data.users?.length<100)break;if(page===5)throw Error('user_lookup_limit')}
 let password;
 if(!account){
  password='Px!'+randomBytes(32).toString('base64url');
  // Écrire avant l’appel : même un timeout après création ne perd pas l’accès initial.
  await mkdir(new URL('../temp/user-input/',import.meta.url),{recursive:true});
  await writeFile(new URL('../temp/user-input/events-admin-access.txt',import.meta.url),`Accès privé Events — NE PAS PARTAGER / NE PAS COMMITTER\nURL : https://events.pixanova.ca/admin/\nCourriel : ${email}\nMot de passe initial : ${password}\n\nChanger ce mot de passe dans Connexions et accès après connexion.\n`,{mode:0o600});
  account=await auth('admin/users',{method:'POST',body:JSON.stringify({email,password,email_confirm:true,app_metadata:{events_role:'admin'}})});account=account.user||account;
 }
 if(!account?.id||account.email?.toLowerCase()!==email||!account.email_confirmed_at)throw Error('admin_account_unverified');
 const sessionSecret=local.ADMIN_SESSION_SECRET||value('ADMIN_SESSION_SECRET')||randomBytes(32).toString('base64');
 if(Buffer.from(sessionSecret,'base64').length!==32)throw Error('session_secret_invalid');
 const updates={EVENTS_ADMIN_EMAIL:email,EVENTS_ADMIN_USER_ID:account.id,ADMIN_SESSION_SECRET:sessionSecret};
 stage='configuration locale privée';let source=await readFile(new URL('../.env',import.meta.url),'utf8');
 for(const [name,val]of Object.entries(updates)){const pattern=new RegExp('^'+name+'=.*$','m');source=pattern.test(source)?source.replace(pattern,name+'='+val):source.trimEnd()+'\n'+name+'='+val+'\n'}
 await writeFile(new URL('../.env',import.meta.url),source);
 await mkdir(new URL('../temp/user-input/',import.meta.url),{recursive:true});
 const credentialPath=new URL('../temp/user-input/events-admin-access.txt',import.meta.url);
 if(password)await writeFile(credentialPath,`Accès privé Events — NE PAS PARTAGER / NE PAS COMMITTER\nURL : https://events.pixanova.ca/admin/\nCourriel : ${email}\nMot de passe initial : ${password}\n\nChanger ce mot de passe dans Connexions et accès après connexion.\n`,{mode:0o600});
 stage='configuration Netlify privée';
 for(const [name,val]of Object.entries({...updates,EVENTS_ANALYTICS_ENABLED:'true'})){
  const existing=variables.find(v=>v.key===name);
  if(existing)await api.setEnvVarValue({accountId,siteId,key:name,body:{context:'production',value:val}});
  else await api.createEnvVars({accountId,siteId,body:[{key:name,scopes:name==='EVENTS_ANALYTICS_ENABLED'?['builds','functions','runtime','post_processing']:['builds','functions','runtime'],is_secret:name!=='EVENTS_ANALYTICS_ENABLED',values:[{context:'production',value:val}]}]});
 }
 console.log('Compte admin Events configuré; valeurs privées masquées. Collecte autorisée après consentement au prochain déploiement.');
 console.log(password?'Accès initial enregistré uniquement dans temp/user-input/events-admin-access.txt.':'Compte existant conservé : aucun mot de passe réinitialisé.');
}catch(error){console.error('Initialisation admin interrompue; étape :',stage,'; statut :',error.status||error.statusCode||'non fourni','; aucun secret affiché.');process.exitCode=1;}
