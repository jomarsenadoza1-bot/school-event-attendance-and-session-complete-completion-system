import { supabase, requireAuth, getProfile, signOut } from './supabase-client.js';
window.logout = signOut;
await requireAuth();
const me = await getProfile();
if (!me || !['coordinator','admin'].includes(me.role)) {
  window.location.href = 'student-dashboard.html';
}

const tbody = document.getElementById('usersBody');

async function refresh() {
  const { data: users } = await supabase
    .from('profiles').select('*').order('created_at', { ascending: false });

  if (!users?.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="p-12 text-center text-slate-400">No users found.</td></tr>`;
    return;
  }
  tbody.innerHTML = users.map(u => `
    <tr>
      <td class="p-4 font-mono text-xs">${u.student_id ?? u.id.slice(0, 8)}</td>
      <td class="p-4 font-semibold">${u.first_name ?? ''} ${u.last_name ?? ''}</td>
      <td class="p-4 text-slate-600">${u.email ?? '—'}</td>
      <td class="p-4"><span class="px-2.5 py-1 text-xs ${
        u.role === 'student' ? 'bg-slate-100 text-slate-700' :
        u.role === 'coordinator' ? 'bg-purple-100 text-purple-800' :
        'bg-amber-100 text-amber-800'
      } font-semibold rounded-full">${u.role}</span></td>
      <td class="p-4 text-right">
        <select class="role-select border border-stone-300 rounded px-2 py-1 text-xs" data-id="${u.id}">
          <option value="student"     ${u.role === 'student' ? 'selected' : ''}>Student</option>
          <option value="coordinator" ${u.role === 'coordinator' ? 'selected' : ''}>Coordinator</option>
          <option value="admin"       ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
        </select>
      </td>
    </tr>`).join('');

  tbody.querySelectorAll('.role-select').forEach(sel => {
    sel.addEventListener('change', async () => {
      const { error } = await supabase.from('profiles').update({ role: sel.value }).eq('id', sel.dataset.id);
      if (error) return alert(error.message);
      await supabase.from('activity_log').insert({
        actor: me.id, action: 'changed role', details: `${sel.dataset.id} → ${sel.value}`
      });
    });
  });
}

document.getElementById('addUserBtn')?.addEventListener('click', () => {
  alert(
    'Student self-registration is enabled.\n\n' +
    'To add a new user:\n' +
    '1. Ask them to sign up at register.html\n' +
    '2. Their profile will appear here automatically\n\n' +
    'To create a coordinator/admin:\n' +
    'Change their role using the dropdown below.'
  );
});

refresh();