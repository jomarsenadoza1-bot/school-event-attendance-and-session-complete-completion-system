import { supabase, requireAuth, getProfile, signOut } from './supabase-client.js';
window.logout = signOut;
await requireAuth();
const me = await getProfile();
if (!me || !['coordinator','admin'].includes(me.role)) {
  window.location.href = 'student-dashboard.html';
}

const { count: totalRegs } = await supabase
  .from('registrations').select('*', { count: 'exact', head: true });

const { data: att } = await supabase.from('attendance').select('status');
const rate = att?.length
  ? Math.round((att.filter(a => a.status === 'Present').length / att.length) * 1000) / 10
  : 0;

const { count: completedSessions } = await supabase
  .from('attendance').select('*', { count: 'exact', head: true })
  .eq('completion', 'Complete');

document.getElementById('rateEl').textContent = rate + '%';
document.getElementById('regsEl').textContent = totalRegs ?? 0;
document.getElementById('compEl').textContent = completedSessions ?? 0;

// CSV export
document.getElementById('exportCsv')?.addEventListener('click', async () => {
  const { data: rows } = await supabase
    .from('registrations')
    .select('status, registered_at, profiles(first_name,last_name,email,student_id), events(title)')
    .order('registered_at', { ascending: false });

  const header = ['Student ID','First Name','Last Name','Email','Event','Status','Registered'];
  const lines = (rows ?? []).map(r => [
    r.profiles?.student_id ?? '',
    r.profiles?.first_name ?? '',
    r.profiles?.last_name ?? '',
    r.profiles?.email ?? '',
    r.events?.title ?? '',
    r.status ?? '',
    new Date(r.registered_at).toISOString(),
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));

  const csv = [header.join(','), ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `SEAMS-report-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
});