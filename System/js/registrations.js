import { supabase, requireAuth, signOut } from './supabase-client.js';
window.logout = signOut;
const user = await requireAuth();

const tbody = document.getElementById('regBody');
const empty = document.getElementById('regEmpty');

const { data: settings } = await supabase.from('app_settings').select('*').eq('id', 1).single();
const allowCancel = settings?.allow_cancel ?? true;

const { data: rows } = await supabase
  .from('registrations')
  .select('id, status, registered_at, events ( id, title, starts_at )')
  .eq('user_id', user.id)
  .order('registered_at', { ascending: false });

if (!rows?.length) {
  empty?.classList.remove('hidden');
} else {
  tbody.innerHTML = rows.map(r => {
    const canCancel = allowCancel && r.status !== 'cancelled';
    return `
    <tr>
      <td>${r.events?.title ?? '—'}</td>
      <td>${r.events ? new Date(r.events.starts_at).toLocaleDateString() : '—'}</td>
      <td>${new Date(r.registered_at).toLocaleDateString()}</td>
      <td><span class="pill pill-${
        r.status === 'confirmed' ? 'green' :
        r.status === 'pending'   ? 'gold'  : 'gray'}">${r.status}</span></td>
      <td>${r.status === 'confirmed' ? '✅' : '—'}</td>
      <td class="cell-action">
        <button class="btn-cancel" data-id="${r.id}" ${canCancel ? '' : 'disabled'}>
          ${canCancel ? 'Cancel' : 'Locked'}
        </button>
      </td>
    </tr>`;
  }).join('');

  tbody.querySelectorAll('.btn-cancel:not([disabled])').forEach(b => {
    b.addEventListener('click', async () => {
      if (!confirm('Cancel this registration?')) return;
      const { error } = await supabase.from('registrations').delete().eq('id', b.dataset.id);
      if (error) return alert(error.message);
      b.closest('tr').remove();
    });
  });
}