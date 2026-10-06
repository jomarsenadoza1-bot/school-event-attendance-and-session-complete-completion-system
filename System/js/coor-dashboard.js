import { supabase, requireAuth, getProfile, signOut } from './supabase-client.js';
window.logout = signOut;
await requireAuth();

const me = await getProfile();
if (!me || !['coordinator', 'admin'].includes(me.role)) {
  window.location.href = 'student-dashboard.html';
}

const { count: totalUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
const { count: totalEvents } = await supabase.from('events').select('*', { count: 'exact', head: true });
const { count: totalRegs }   = await supabase.from('registrations').select('*', { count: 'exact', head: true });
const { count: pendingRegs } = await supabase.from('registrations').select('*', { count: 'exact', head: true }).eq('status', 'pending');

const values = document.querySelectorAll('.font-serif.text-3xl');
if (values[0]) values[0].textContent = totalUsers ?? 0;
if (values[1]) values[1].textContent = totalEvents ?? 0;
if (values[2]) values[2].textContent = totalRegs ?? 0;
if (values[3]) values[3].textContent = pendingRegs ?? 0;

const emptyBox = document.querySelector('.p-12');
if (totalEvents && emptyBox) emptyBox.remove();

// Additional counts
const now = new Date().toISOString();
const { count: upcoming } = await supabase
  .from('events').select('*', { count: 'exact', head: true })
  .gte('starts_at', now);

const { count: confirmed } = await supabase
  .from('registrations').select('*', { count: 'exact', head: true })
  .eq('status', 'confirmed');

document.getElementById('statUpcoming').textContent = `${upcoming ?? 0} upcoming`;
document.getElementById('statConfirmed').textContent = `${confirmed ?? 0} confirmed`;

document.getElementById('todayLine').textContent =
  `Mabini Integrated School · ${new Date().toLocaleDateString(undefined, { year:'numeric', month:'long', day:'numeric' })}`;