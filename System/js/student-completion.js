import { supabase, requireAuth, signOut } from './supabase-client.js';
window.logout = signOut;
const user = await requireAuth();

const grid = document.getElementById('completionGrid');
if (!grid) throw new Error('completionGrid missing');

const { data: regs } = await supabase
  .from('registrations').select('event_id, events(id,title)').eq('user_id', user.id);

for (const r of regs ?? []) {
  const { data: sessions } = await supabase
    .from('sessions').select('id,title,session_no').eq('event_id', r.event_id);

  const ids = (sessions ?? []).map(s => s.id);
  const { data: att } = ids.length
    ? await supabase.from('attendance').select('session_id,status,completion')
        .eq('user_id', user.id).in('session_id', ids)
    : { data: [] };

  const done = att?.filter(a => a.completion === 'Complete').length ?? 0;
  const total = sessions?.length ?? 0;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const fillClass = pct === 100 ? 'full' : pct > 0 ? 'partial' : 'empty';

  const sessionRows = (sessions ?? []).map(s => {
    const a = att?.find(x => x.session_id === s.id);
    return `
      <div class="comp-session">
        <div class="comp-session-info">
          <div class="comp-session-name">${s.title}</div>
          <div class="comp-session-meta">Session #${s.session_no ?? ''}</div>
        </div>
        <div class="comp-pills">
          <span class="pill pill-${a?.status === 'Present' ? 'green' : 'gray'}">${a?.status ?? 'Not recorded'}</span>
          <span class="pill pill-${a?.completion === 'Complete' ? 'green' : 'gray'}">${a?.completion ?? 'Pending'}</span>
        </div>
      </div>`;
  }).join('');

  grid.insertAdjacentHTML('beforeend', `
    <div class="comp-card">
      <h3 class="comp-title">${r.events.title}</h3>
      <div class="comp-progress-head">
        <span class="comp-progress-label">Sessions completed</span>
        <span class="comp-progress-count">${done} / ${total}</span>
      </div>
      <div class="comp-progress-track">
        <div class="comp-progress-fill ${fillClass}" style="width:${pct}%"></div>
      </div>
      <div class="comp-sessions">${sessionRows}</div>
    </div>`);
}