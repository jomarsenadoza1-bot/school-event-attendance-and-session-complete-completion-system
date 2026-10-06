import { supabase, requireAuth, getProfile, signOut } from './supabase-client.js';
window.logout = signOut;
await requireAuth();
const me = await getProfile();
if (!me || !['coordinator','admin'].includes(me.role)) {
  window.location.href = 'student-dashboard.html';
}

const tbody = document.getElementById('completionBody');

async function load() {
  const { data: regs } = await supabase
    .from('registrations')
    .select('id, status, user_id, event_id, profiles(first_name,last_name), events(title)')
    .order('registered_at', { ascending: false });

  if (!regs?.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-400">No registrations yet.</td></tr>`;
    return;
  }

  const rows = await Promise.all(regs.map(async r => {
    const { count: totalSessions } = await supabase
      .from('sessions').select('*', { count: 'exact', head: true })
      .eq('event_id', r.event_id);

    const { count: completedSessions } = await supabase
      .from('attendance').select('*', { count: 'exact', head: true })
      .eq('user_id', r.user_id).eq('event_id', r.event_id)
      .eq('completion', 'Complete');

    const complete = totalSessions > 0 && completedSessions >= totalSessions;
    return { r, totalSessions, completedSessions, complete };
  }));

  tbody.innerHTML = rows.map(({ r, totalSessions, completedSessions, complete }) => `
    <tr class="hover:bg-stone-50/50">
      <td class="p-4 font-semibold text-slate-900">${r.profiles?.first_name ?? ''} ${r.profiles?.last_name ?? ''}</td>
      <td class="p-4 text-slate-600">${r.events?.title ?? '—'}</td>
      <td class="p-4 text-slate-600">${completedSessions ?? 0} / ${totalSessions ?? 0}</td>
      <td class="p-4">
        <span class="px-2.5 py-1 text-xs ${
          complete ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
        } font-semibold rounded-full">${complete ? 'Complete' : 'Incomplete'}</span>
      </td>
      <td class="p-4 text-right">
        <button class="issue-btn px-3 py-1.5 bg-[#0c221a] text-white text-xs font-semibold rounded hover:bg-[#18392d] disabled:opacity-40"
                data-user="${r.user_id}" data-event="${r.event_id}" data-title="${r.events?.title ?? ''}"
                data-name="${r.profiles?.first_name ?? ''} ${r.profiles?.last_name ?? ''}"
                ${complete ? '' : 'disabled'}>
          <i class="fa-solid fa-download mr-1"></i> Issue
        </button>
      </td>
    </tr>`).join('');

  tbody.querySelectorAll('.issue-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', async () => {
      const userId = btn.dataset.user;
      const eventId = btn.dataset.event;
      const name = btn.dataset.name;
      const title = btn.dataset.title;

      const cert = `CERT-${new Date().getFullYear()}-${Math.floor(Math.random()*9000+1000)}`;

      const { error } = await supabase.from('attendance')
        .update({ certificate_no: cert, issued_at: new Date().toISOString() })
        .eq('user_id', userId).eq('event_id', eventId);

      if (error) return alert(error.message);

      await supabase.from('activity_log').insert({
        actor: me.id, action: 'issued certificate', details: `${cert} → ${name} (${title})`
      });

      // Download a simple .txt as placeholder
      const body = `SEAMS — Certificate of Completion\n\n` +
                   `This certifies that\n\n    ${name}\n\n` +
                   `has completed all sessions of\n\n    ${title}\n\n` +
                   `Certificate No: ${cert}\nIssued: ${new Date().toLocaleString()}\n\n` +
                   `— Mabini Integrated School`;
      const blob = new Blob([body], { type: 'text/plain' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${cert}.txt`;
      a.click();
    });
  });
}

load();