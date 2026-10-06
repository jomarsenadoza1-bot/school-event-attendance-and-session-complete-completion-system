import { supabase, requireAuth, getProfile, signOut } from './supabase-client.js';
window.logout = signOut;
await requireAuth();
const me = await getProfile();
if (!me || !['coordinator', 'admin'].includes(me.role)) {
  window.location.href = 'student-dashboard.html';
}

const tbody = document.getElementById('regBody');

const { data: rows } = await supabase
  .from('registrations')
  .select('id,status,registered_at,profiles(first_name,last_name),events(title)')
  .order('registered_at', { ascending: false });

if (!rows?.length) {
  tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-400">No registrations yet.</td></tr>`;
} else {
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td class="p-4 font-semibold text-slate-900">${r.profiles?.first_name ?? ''} ${r.profiles?.last_name ?? ''}</td>
      <td class="p-4 text-slate-600">—</td>
      <td class="p-4 text-slate-600">${r.events?.title ?? '—'}</td>
      <td class="p-4 text-slate-600">${new Date(r.registered_at).toLocaleDateString()}</td>
      <td class="p-4">
        <select class="status-select px-2 py-1 text-xs border border-stone-300 rounded" data-id="${r.id}">
          <option value="pending"   ${r.status === 'pending'   ? 'selected' : ''}>Pending</option>
          <option value="confirmed" ${r.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
          <option value="cancelled" ${r.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
        </select>
      </td>
    </tr>`).join('');

  tbody.querySelectorAll('.status-select').forEach(sel => {
    sel.addEventListener('change', async () => {
      const { error } = await supabase.from('registrations').update({ status: sel.value }).eq('id', sel.dataset.id);
      if (error) return alert(error.message);
      await supabase.from('activity_log').insert({
        actor: me.id, action: 'updated registration', details: `→ ${sel.value}`
      });
    });
  });
}