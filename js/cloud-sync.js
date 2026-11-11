/** Estado privado do Ciclo: snapshot JSON por usuário, protegido por RLS. */
import { getSupabase, getCurrentUser } from './supabase-client.js';
const TABLE='user_app_state', VERSION=2;
export const CYCLE_KEY='ciclo-estudaarthur-v1';
export const ANKI_KEY='ciclo-estudaarthur-anki-v1';
const emptyAnki=()=>({decks:[],notes:[],cards:[],logs:[]});
function parse(key){try{const v=localStorage.getItem(key);return v?JSON.parse(v):null}catch{return null}}
export function readLocalBundle(){
 let cycle=parse(CYCLE_KEY);
 if(localStorage.getItem('ciclo-estudaarthur-cycle-migrated-v1')!=='1'){if(!cycle){cycle=parse('ciclo-v3')||parse('ciclo-v2');if(cycle)localStorage.setItem(CYCLE_KEY,JSON.stringify(cycle))}localStorage.setItem('ciclo-estudaarthur-cycle-migrated-v1','1')}
 let anki=parse(ANKI_KEY);
 if(localStorage.getItem('ciclo-estudaarthur-anki-migrated-v1')!=='1'){if(!anki){anki=parse('ciclo-anki-local-v1')||emptyAnki();if(localStorage.getItem('ciclo-anki-local-v1'))localStorage.setItem(ANKI_KEY,JSON.stringify(anki))}localStorage.setItem('ciclo-estudaarthur-anki-migrated-v1','1')}
 if(!cycle&&window.S)cycle=JSON.parse(JSON.stringify(window.S));
 return {format:'ciclo-private-cloud',version:VERSION,cycle,anki};
}
export function normalizeCloudState(state){
 if(state?.format==='ciclo-private-cloud')return {format:'ciclo-private-cloud',version:VERSION,cycle:state.cycle??null,anki:state.anki??emptyAnki()};
 return {format:'ciclo-private-cloud',version:VERSION,cycle:state??null,anki:emptyAnki()};
}
export function writeLocalBundle(input){
 const b=normalizeCloudState(input);
 if(b.cycle)localStorage.setItem(CYCLE_KEY,JSON.stringify(b.cycle));else localStorage.removeItem(CYCLE_KEY);
 localStorage.setItem(ANKI_KEY,JSON.stringify(b.anki));return b;
}
export async function loadCloudState(){
 const user=await getCurrentUser();if(!user)return {user:null,state:null,updatedAt:null};
 const s=await getSupabase();const {data,error}=await s.from(TABLE).select('state,schema_version,updated_at').eq('user_id',user.id).maybeSingle();
 if(error)throw error;return {user,state:data?.state??null,schemaVersion:data?.schema_version??VERSION,updatedAt:data?.updated_at??null};
}
export async function saveCloudState(input){
 const user=await getCurrentUser();if(!user)throw new Error('Entre na sua conta para sincronizar.');
 const state=normalizeCloudState(input),savedAt=new Date().toISOString(),s=await getSupabase();
 const {error}=await s.from(TABLE).upsert({user_id:user.id,state,schema_version:VERSION,updated_at:savedAt},{onConflict:'user_id'});
 if(error)throw error;return {savedAt};
}
