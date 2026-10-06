import { supabase, requireAuth, signOut } from './supabase-client.js';
window.logout = signOut;
const user = await requireAuth();

const tbody = document.getElementById('attBody');
const empty = document.getElementById('attEmpty');

const { data: rows } = await supabase
  .from('attendance')
  .select('status, completion, recorded_at, events(title), sessions(title)')
  .eq('user_id', user.id)
  .order('recorded_at', { ascending: false });

if (!rows?.length) {
  empty?.classList.remove('hidden');
} else {
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${r.events?.title ?? '—'}</td>
      <td>${r.sessions?.title ?? '—'}</td>
      <td>${new Date(r.recorded_at).toLocaleDateString()}</td>
      <td><span class="pill pill-${
        r.status === 'Present' ? 'green' :
        r.status === 'Late'    ? 'gold'  :
        r.status === 'Excused' ? 'blue'  : 'red'}">${r.status}</span></td>
      <td><span class="pill pill-${
        r.completion === 'Complete' ? 'green' :
        r.completion === 'Pending'  ? 'gold'  : 'gray'}">${r.completion}</span></td>
    </tr>`).join('');
}