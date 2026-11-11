import {signIn,signOut,getCurrentSession,getSupabase,SITE_URL} from './supabase-client.js';
import {loadCloudState,saveCloudState,readLocalBundle,normalizeCloudState,writeLocalBundle} from './cloud-sync.js';
const OWNER='ciclo-estudaarthur-owner',PENDING='ciclo-estudaarthur-sync-pending-v1';
let session=null,ready=false,timer=null,channel=null,conflict=null,localPending=false;
const $=id=>document.getElementById(id),emptyCycle=()=>({ob:0,goal:120,subs:[],cur:0,laps:0,log:[],cards:[],red:[]});
const stable=v=>Array.isArray(v)?'['+v.map(stable).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}':JSON.stringify(v);
function hasData(b){const c=b?.cycle,a=b?.anki;return !!((c&&((c.log||[]).length||(c.cards||[]).length||(c.red||[]).length||(c.laps||0)||(c.subs||[]).length))||(a&&((a.decks||[]).length||(a.notes||[]).length||(a.cards||[]).length||(a.logs||[]).length)))}
function shell(){
 const style=document.createElement('style');style.textContent=`
 body:not(.ciclo-authenticated) #app,body:not(.ciclo-authenticated) #nav{visibility:hidden!important;pointer-events:none!important}
 #accountbar{display:none;max-width:1080px;margin:0 auto;padding:10px 20px;align-items:center;justify-content:space-between;gap:12px;color:var(--mu);font:13px system-ui}
 body.ciclo-authenticated #accountbar{display:flex}#accountbar strong{color:var(--tx);font-size:15px}
 #accountbar button{border:1px solid var(--ln);border-radius:10px;background:var(--cd);color:var(--tx);padding:8px 12px}
 #ciclo-auth-gate{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;padding:22px;background:var(--bg,#081a33);color:var(--tx,#f5f8f6);font-family:system-ui}
 #ciclo-auth-gate[hidden]{display:none}.ciclo-auth-card{width:min(100%,420px);padding:30px;border:1px solid var(--ln);border-radius:24px;background:var(--cd);box-shadow:0 24px 80px #0002}
 .ciclo-auth-brand{font-size:13px;font-weight:900;letter-spacing:.18em;text-transform:uppercase;color:var(--ac)}
 .ciclo-auth-card h1{font-size:30px;margin:18px 0 8px}.ciclo-auth-card p{color:var(--mu);line-height:1.5;font-size:14px}
 .ciclo-auth-card label{display:block;margin:16px 0 6px;font-size:13px;font-weight:700}
 .ciclo-auth-card input{display:block;width:100%;margin-top:7px;padding:13px;border:1px solid var(--ln);border-radius:12px;background:var(--bg);color:var(--tx);font:inherit}
 .ciclo-auth-primary{width:100%;margin-top:18px;padding:14px;border:0;border-radius:12px;background:var(--ac);color:#fff;font:inherit;font-weight:800;cursor:pointer}
 .ciclo-auth-primary:disabled{opacity:.55}.ciclo-auth-link{display:block;margin:12px auto 0;border:0;background:none;color:var(--ac);font:inherit;cursor:pointer}
 #ciclo-auth-message{min-height:22px;margin-top:12px;font-size:13px;line-height:1.45;color:var(--rd)}
 @media(max-width:480px){.ciclo-auth-card{padding:24px 20px}}`;
 document.head.appendChild(style);
 const bar=document.createElement('header');bar.id='accountbar';bar.innerHTML='<strong>ciclo. pessoal</strong><span id="ciclo-account-status">Conta conectada</span><button id="ciclo-signout">Sair</button>';document.body.insertBefore(bar,document.body.firstChild);
 const gate=document.createElement('section');gate.id='ciclo-auth-gate';gate.innerHTML=`
 <div class="ciclo-auth-card"><div class="ciclo-auth-brand">ciclo · pessoal</div><h1 id="ciclo-auth-title">Seu espaço de estudos</h1>
 <p id="ciclo-auth-subtitle">Entre na sua conta para acessar seu ciclo, suas redações e seus baralhos em qualquer dispositivo.</p>
 <form id="ciclo-login-form"><label>E-mail<input id="ciclo-email" type="email" autocomplete="username" required></label>
 <label>Senha<input id="ciclo-password" type="password" autocomplete="current-password" minlength="8" required></label>
 <button class="ciclo-auth-primary" id="ciclo-submit">Entrar</button></form>
 <form id="ciclo-recovery-form" hidden><label>Nova senha<input id="ciclo-new-password" type="password" minlength="8" required></label><button class="ciclo-auth-primary">Atualizar senha</button></form>
 <button class="ciclo-auth-link" id="ciclo-forgot" type="button">Esqueci minha senha</button><div id="ciclo-auth-message" role="status" aria-live="polite"></div>
 <div id="ciclo-conflict" hidden><p>Há dados neste aparelho e na nuvem. Escolha qual versão manter.</p>
 <button class="ciclo-auth-primary" id="ciclo-use-cloud" type="button">Usar dados da nuvem</button>
 <button class="ciclo-auth-primary" id="ciclo-use-device" type="button">Enviar dados deste aparelho</button></div></div>`;
 document.body.appendChild(gate);
 $('ciclo-login-form').addEventListener('submit',login);$('ciclo-recovery-form').addEventListener('submit',newPassword);
 $('ciclo-forgot').addEventListener('click',resetPassword);$('ciclo-use-cloud').addEventListener('click',()=>resolve('cloud'));
 $('ciclo-use-device').addEventListener('click',()=>resolve('device'));$('ciclo-signout').addEventListener('click',logout);
}
function msg(t,err=false){$('ciclo-auth-message').textContent=t||'';$('ciclo-auth-message').style.color=err?'var(--rd)':'var(--g)'}
function gate(t='',err=false){document.body.classList.remove('ciclo-authenticated');$('ciclo-auth-gate').hidden=false;msg(t,err)}
async function login(e){e.preventDefault();$('ciclo-submit').disabled=true;msg('Conectando…');try{const {data,error}=await signIn({email:$('ciclo-email').value,password:$('ciclo-password').value});if(error)throw error;session=data.session;await sync()}catch(x){gate(x.message||'Não foi possível entrar.',true)}finally{$('ciclo-submit').disabled=false;$('ciclo-submit').textContent='Entrar'}}
async function resetPassword(){const email=$('ciclo-email').value.trim();if(!email)return msg('Informe seu e-mail primeiro.',true);try{const s=await getSupabase(),{error}=await s.auth.resetPasswordForEmail(email,{redirectTo:SITE_URL});if(error)throw error;msg('Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.')}catch(e){msg(e.message,true)}}
async function newPassword(e){e.preventDefault();try{const s=await getSupabase(),{error}=await s.auth.updateUser({password:$('ciclo-new-password').value});if(error)throw error;history.replaceState(null,'',SITE_URL);await logout(false);msg('Senha atualizada. Entre novamente.')}catch(x){msg(x.message,true)}}
function apply(b){const n=writeLocalBundle(b);if(n.cycle)window.S=n.cycle;window.applyTheme?.();window.render?.()}
function resetLocal(){apply({cycle:emptyCycle(),anki:{decks:[],notes:[],cards:[],logs:[]}})}
async function sync(){
 const remote=await loadCloudState(),cloud=remote.state?normalizeCloudState(remote.state):null,local=readLocalBundle(),owner=localStorage.getItem(OWNER);
 if(cloud&&owner&&owner!==session.user.id)apply(cloud);
 else if(cloud&&hasData(local)&&stable(cloud)!==stable(local)){
  conflict={cloud,local};$('ciclo-conflict').hidden=false;$('ciclo-login-form').hidden=true;$('ciclo-forgot').hidden=true;msg('Escolha qual versão manter antes de continuar.');return;
 }else if(cloud)apply(cloud);
 else if(owner&&owner!==session.user.id)resetLocal();
 else if(hasData(local)){await saveCloudState(local);localStorage.removeItem(PENDING)}
 finish(remote.updatedAt);
}
function resolve(choice){if(!conflict)return;(async()=>{try{if(choice==='cloud'){apply(conflict.cloud);localStorage.removeItem(PENDING)}else{apply(conflict.local);await saveCloudState(conflict.local);localStorage.removeItem(PENDING)}conflict=null;$('ciclo-conflict').hidden=true;finish()}catch(e){msg(e.message,true)}})()}
function finish(updatedAt=null){ready=true;localPending=localStorage.getItem(PENDING)==='1';if(session?.user?.id)localStorage.setItem(OWNER,session.user.id);$('ciclo-auth-gate').hidden=true;document.body.classList.add('ciclo-authenticated');$('ciclo-account-status').textContent=session?.user?.email||'Conta conectada';subscribe();if(updatedAt)lastUpdated=updatedAt;if(localPending)schedule()}
let lastUpdated=null;
async function subscribe(){try{const s=await getSupabase();if(channel)await s.removeChannel(channel);channel=s.channel('ciclo-private-'+session.user.id).on('postgres_changes',{event:'*',schema:'public',table:'user_app_state',filter:'user_id=eq.'+session.user.id},p=>{if(localPending||!p.new?.state)return;apply(p.new.state);lastUpdated=p.new.updated_at||lastUpdated;$('ciclo-account-status').textContent=session.user.email+' · sincronizado'}).subscribe()}catch(e){console.warn('Realtime Ciclo:',e)}}
async function refresh(){if(!ready||!session)return;if(localPending||localStorage.getItem(PENDING)==='1'){schedule();return}try{const r=await loadCloudState();if(r.state){const b=normalizeCloudState(r.state);if(stable(readLocalBundle())!==stable(b))apply(b);lastUpdated=r.updatedAt}}catch(e){console.warn('Atualização da nuvem:',e)}}
function schedule(){if(!session||!ready)return;localPending=true;localStorage.setItem(PENDING,'1');clearTimeout(timer);timer=setTimeout(async()=>{try{await saveCloudState(readLocalBundle());localPending=false;localStorage.removeItem(PENDING);$('ciclo-account-status').textContent=session.user.email+' · sincronizado'}catch(e){localPending=true;$('ciclo-account-status').textContent='Sem conexão · alterações pendentes';console.error('Ciclo sync:',e)}},900)}
async function logout(reload=true){try{if(ready&&(localPending||localStorage.getItem(PENDING)==='1')){clearTimeout(timer);try{await saveCloudState(readLocalBundle());localStorage.removeItem(PENDING)}catch(e){if(!confirm('Há alterações que ainda não chegaram à nuvem. Deseja sair mesmo assim e descartá-las deste aparelho?'))return;localStorage.removeItem(PENDING)}}ready=false;localPending=false;if(channel){const s=await getSupabase();await s.removeChannel(channel);channel=null}await signOut();session=null;localStorage.removeItem('ciclo-estudaarthur-v1');localStorage.removeItem('ciclo-estudaarthur-anki-v1');localStorage.removeItem(OWNER);if(reload)location.reload()}catch(e){alert(e.message||'Não foi possível sair.')}}
async function boot(){
 shell();const oldSave=window.save;if(typeof oldSave==='function')window.save=function(...args){const v=oldSave.apply(this,args);schedule();return v};
 window.addEventListener('ciclo:local-change',schedule);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
 if(location.hash.includes('type=recovery')){$('ciclo-login-form').hidden=true;$('ciclo-recovery-form').hidden=false;$('ciclo-forgot').hidden=true;$('ciclo-auth-title').textContent='Redefinir senha';$('ciclo-auth-subtitle').textContent='Escolha uma nova senha para sua conta.'}
 try{session=await getCurrentSession();if(session)await sync();else gate()}catch(e){gate(e.message||'Não foi possível conectar ao Supabase.',true)}
}
boot();
