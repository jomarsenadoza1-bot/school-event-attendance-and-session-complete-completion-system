import { supabase, requireAuth, getProfile, signOut } from './supabase-client.js';
window.logout = signOut;
await requireAuth();
const me = await getProfile();
if (!me || !['coordinator','admin'].includes(me.role)) {
  window.location.href = 'student-dashboard.html';
}

const tbody = document.getElementById('sessionsBody');

async function refresh() {
  const { data: rows } = await supabase
    .from('sessions')
    .select('id,title,session_no,starts_at,ends_at,events(title)')
    .order('starts_at', { ascending: false });

  if (!rows?.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-400">No sessions yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = rows.map(s => `
    <tr class="hover:bg-stone-50/50">
      <td class="p-4 font-semibold text-slate-900">${s.title}</td>
      <td class="p-4 text-slate-600">${s.events?.title ?? '—'}</td>
      <td class="p-4 text-slate-600">${s.session_no ?? '—'}</td>
      <td class="p-4 text-slate-600">${s.starts_at ? new Date(s.starts_at).toLocaleString() : '—'}</td>
      <td class="p-4 text-right">
        <button class="delete-btn text-red-500 hover:text-red-800" data-id="${s.id}" title="Delete">
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    </tr>`).join('');

  tbody.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this session? Attendance records will also be removed.')) return;
      const { error } = await supabase.from('sessions').delete().eq('id', btn.dataset.id);
      if (error) return alert(error.message);
      refresh();
    });
  });
}

refresh();

document.getElementById('addSessionBtn')?.addEventListener('click', async () => {
  const { data: events } = await supabase.from('events').select('id,title').order('starts_at', { ascending: false });
  if (!events?.length) return alert('Create an event first.');

  const eventList = events.map((e, i) => `${i+1}. ${e.title}`).join('\n');
  const pick = prompt(`Which event?\n\n${eventList}`);
  const idx = parseInt(pick, 10) - 1;
  if (!events[idx]) return;

  const title = prompt('Session title'); if (!title) return;
  const session_no = prompt('Session number (e.g. 1)') || null;
  const starts = prompt('Start (YYYY-MM-DD HH:MM) — optional');

  const { error } = await supabase.from('sessions').insert({
    event_id: events[idx].id,
    title,
    session_no: session_no ? parseInt(session_no, 10) : null,
    starts_at: starts ? new Date(starts).toISOString() : null
  });
  if (error) return alert(error.message);
  await supabase.from('activity_log').insert({ actor: me.id, action: 'created session', details: title });
  refresh();
});