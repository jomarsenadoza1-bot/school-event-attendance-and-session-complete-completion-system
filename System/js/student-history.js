import { supabase, requireAuth, signOut } from './supabase-client.js';
window.logout = signOut;
const user = await requireAuth();

const tl    = document.getElementById('historyTimeline');
const empty = document.getElementById('historyEmpty');

const { data: rows } = await supabase
  .from('attendance')
  .select('status,completion,recorded_at,events(title,starts_at)')
  .eq('user_id', user.id)
  .order('recorded_at', { ascending: false });

if (!rows?.length) empty?.classList.remove('hidden');
else {
  tl.innerHTML = rows.map(r => `
    <div class="history-item">
      <div class="history-card">
        <div class="history-info">
          <div class="history-title">${r.events?.title ?? 'Event'}</div>
          <div class="history-meta">${new Date(r.recorded_at).toDateString()}</div>
          <div class="history-counts">
            Status: <span class="num">${r.status}</span> ·
            Completion: <span class="num">${r.completion}</span>
          </div>
        </div>
        <div class="history-pills">
          <span class="pill pill-${r.status === 'Present' ? 'green' : 'red'}">${r.status}</span>
          <span class="pill pill-${r.completion === 'Complete' ? 'green' : 'gray'}">${r.completion}</span>
        </div>
      </div>
    </div>`).join('');
}