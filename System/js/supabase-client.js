// js/supabase-client.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const SUPABASE_URL = 'https://iagztmiyeigfggriscnz.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_1Pbj5EDqwjStRNwD83tYVw_Dis6GjuB';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function requireAuth(redirect = 'index.html') {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { window.location.href = redirect; return null; }
  return session.user;
}

export async function getProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
  window.location.href = 'index.html';
}

export async function logActivity(action, details) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('activity_log').insert({ actor: user.id, action, details });
}

// Make logout() available to every page's inline onclick
window.logout = signOut;