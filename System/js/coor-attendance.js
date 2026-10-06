import { supabase, requireAuth, getProfile, signOut } from './supabase-client.js';
window.logout = signOut;
await requireAuth();
const me = await getProfile();
if (!me || !['coordinator', 'admin'].includes(me.role)) {
  window.location.href = 'student-dashboard.html';
}

const tbody = document.getElementById('attBody');

async function loadAttendance() {
  const { data: rows, error } = await supabase
    .from('attendance')
    .select('id, status, completion, recorded_at, profiles(first_name,last_name), sessions(title)')
    .order('recorded_at', { ascending: false })
    .limit(100);

  if (error || !rows?.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-slate-400">No attendance records yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(r => `
    <tr class="hover:bg-stone-50/50">
      <td class="p-4 font-semibold text-slate-900">${r.profiles?.first_name ?? ''} ${r.profiles?.last_name ?? ''}</td>
      <td class="p-4 text-slate-600">${r.sessions?.title ?? '—'}</td>
      <td class="p-4 text-slate-600">${new Date(r.recorded_at).toLocaleString()}</td>
      <td class="p-4">
        <span class="px-2.5 py-1 text-xs ${
          r.status === 'Present' ? 'bg-emerald-100 text-emerald-800' :
          r.status === 'Late' ? 'bg-amber-100 text-amber-800' :
          r.status === 'Excused' ? 'bg-blue-100 text-blue-800' :
          'bg-red-100 text-red-800'
        } font-semibold rounded-full">${r.status}</span>
      </td>
    </tr>`).join('');
}

async function handleScan(payload) {
  if (!payload?.uid && !payload?.sid) {
    return alert('Invalid QR code — missing user identifier.');
  }

  // 1. Find the student by uid or student_id
  let profile;
  if (payload.uid) {
    const { data } = await supabase.from('profiles').select('*').eq('id', payload.uid).single();
    profile = data;
  } else {
    const { data } = await supabase.from('profiles').select('*').eq('student_id', payload.sid).single();
    profile = data;
  }
  if (!profile) return alert('Student not found in system.');

  // 2. Find active events
  const { data: events } = await supabase
    .from('events').select('id, title')
    .in('status', ['upcoming', 'ongoing'])
    .order('starts_at', { ascending: true });

  if (!events?.length) return alert('No active events to check into.');

  let eventId = events[0].id;
  let eventTitle = events[0].title;

  if (events.length > 1) {
    const list = events.map((e, i) => `${i + 1}. ${e.title}`).join('\n');
    const pick = prompt(`Which event?\n\n${list}`);
    const idx = parseInt(pick, 10) - 1;
    if (!events[idx]) return;
    eventId = events[idx].id;
    eventTitle = events[idx].title;
  }

  // 3. Find sessions for that event
  const { data: sessions } = await supabase
    .from('sessions').select('id, title')
    .eq('event_id', eventId)
    .order('session_no', { ascending: true });

  if (!sessions?.length) return alert('No sessions for this event yet.');

  let sessionId = sessions[0].id;
  let sessionTitle = sessions[0].title;

  if (sessions.length > 1) {
    const list = sessions.map((s, i) => `${i + 1}. ${s.title}`).join('\n');
    const pick = prompt(`Which session?\n\n${list}`);
    const idx = parseInt(pick, 10) - 1;
    if (!sessions[idx]) return;
    sessionId = sessions[idx].id;
    sessionTitle = sessions[idx].title;
  }

  // 4. Ask for status
  const statusInput = prompt('Attendance status? (Present / Late / Excused / Absent)', 'Present');
  const valid = ['Present', 'Late', 'Excused', 'Absent'];
  const status = valid.includes(statusInput) ? statusInput : 'Present';

  // 5. Upsert attendance
  const { data: existing } = await supabase
    .from('attendance').select('id')
    .eq('user_id', profile.id).eq('session_id', sessionId).maybeSingle();

  if (existing) {
    const { error } = await supabase.from('attendance')
      .update({ status, recorded_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (error) return alert(error.message);
  } else {
    const { error } = await supabase.from('attendance').insert({
      user_id: profile.id,
      event_id: eventId,
      session_id: sessionId,
      status,
      completion: status === 'Present' ? 'Complete' : 'Pending',
      recorded_at: new Date().toISOString(),
      recorded_by: me.id,
    });
    if (error) return alert(error.message);
  }

  await supabase.from('activity_log').insert({
    actor: me.id,
    action: 'recorded attendance',
    details: `${profile.first_name} ${profile.last_name} — ${sessionTitle} (${status})`,
  });

  alert(`✅ ${profile.first_name} ${profile.last_name}\nEvent: ${eventTitle}\nSession: ${sessionTitle}\nStatus: ${status}`);
  loadAttendance(); // refresh the table
}

// Hook up the button
document.getElementById('scanBtn')?.addEventListener('click', startScan);
loadAttendance();