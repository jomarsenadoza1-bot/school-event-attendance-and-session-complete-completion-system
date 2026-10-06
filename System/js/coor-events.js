import { supabase, requireAuth, getProfile, signOut } from './supabase-client.js';
window.logout = signOut;
await requireAuth();
const me = await getProfile();
if (!me || !['coordinator','admin'].includes(me.role)) {
  window.location.href = 'student-dashboard.html';
}

const tbody = document.getElementById('eventsBody');

async function refresh() {
  const { data: events } = await supabase.from('events').select('*').order('starts_at');

  if (!events?.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-400">No events yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = events.map(e => `
    <tr class="hover:bg-stone-50/50">
      <td class="p-4 font-semibold text-slate-900">${e.title}</td>
      <td class="p-4 text-slate-600">${new Date(e.starts_at).toLocaleString()}</td>
      <td class="p-4 text-slate-600">${e.venue ?? '—'}</td>
      <td class="p-4">
        <select class="status-select px-2 py-1 text-xs border border-stone-300 rounded" data-id="${e.id}">
          <option value="upcoming"  ${e.status === 'upcoming'  ? 'selected' : ''}>Upcoming</option>
          <option value="ongoing"   ${e.status === 'ongoing'   ? 'selected' : ''}>Ongoing</option>
          <option value="completed" ${e.status === 'completed' ? 'selected' : ''}>Completed</option>
          <option value="cancelled" ${e.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
        </select>
      </td>
      <td class="p-4 text-right">
        <button class="delete-btn text-red-500 hover:text-red-800" data-id="${e.id}" title="Delete">
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    </tr>`).join('');

  tbody.querySelectorAll('.status-select').forEach(sel => {
    sel.addEventListener('change', async () => {
      const { error } = await supabase.from('events').update({ status: sel.value }).eq('id', sel.dataset.id);
      if (error) return alert(error.message);
      await supabase.from('activity_log').insert({
        actor: me.id, action: 'changed event status', details: `→ ${sel.value}`
      });
    });
  });

  tbody.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this event? Registrations and sessions will also be removed.')) return;
      const { error } = await supabase.from('events').delete().eq('id', btn.dataset.id);
      if (error) return alert(error.message);
      refresh();
    });
  });
}

refresh();

document.getElementById('createEventBtn')?.addEventListener('click', async () => {
  const title  = prompt('Event title'); if (!title) return;
  const starts = prompt('Start (YYYY-MM-DD HH:MM)'); if (!starts) return;
  const venue  = prompt('Venue') || null;
  const capacityStr = prompt('Capacity (number)') || '0';

  const { error } = await supabase.from('events').insert({
    title, venue,
    starts_at: new Date(starts).toISOString(),
    capacity: parseInt(capacityStr, 10) || 0,
    status: 'upcoming',
    created_by: me.id
  });
  if (error) return alert(error.message);

  await supabase.from('activity_log').insert({
    actor: me.id, action: 'created event', details: title
  });
  refresh();
});