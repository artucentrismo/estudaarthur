/** Cliente Supabase do Ciclo pessoal. Nunca exponha service_role/secret keys. */
let clientPromise;
export const SITE_URL = 'https://artucentrismo.github.io/estudaarthur/';
export async function getSupabase() {
  if (clientPromise) return clientPromise;
  clientPromise = (async () => {
    const url = document.querySelector('meta[name="supabase-url"]')?.content?.trim();
    const key = document.querySelector('meta[name="supabase-anon-key"]')?.content?.trim();
    if (!url || !key) throw new Error('Configuração do Supabase ausente.');
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.119.0');
    return createClient(url, key, { auth: { persistSession:true, autoRefreshToken:true, detectSessionInUrl:true, flowType:'pkce' } });
  })();
  try { return await clientPromise; } catch (e) { clientPromise=undefined; throw e; }
}
export async function signIn({email,password}) {
  const supabase=await getSupabase();
  return supabase.auth.signInWithPassword({email:email.trim().toLowerCase(),password});
}
export async function signOut() { const s=await getSupabase(); return s.auth.signOut(); }
export async function getCurrentSession() {
  const s=await getSupabase(); const {data,error}=await s.auth.getSession();
  if(error) throw error; return data.session;
}
export async function getCurrentUser() { const session=await getCurrentSession(); return session?.user??null; }
