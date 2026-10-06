import { supabase, requireAuth, getProfile, signOut } from './supabase-client.js';
window.logout = signOut;

const user = await requireAuth();
if (user) {
  const p = await getProfile();

  const initials = ((p?.first_name?.[0] || '') + (p?.last_name?.[0] || '')).toUpperCase() || 'ST';
  const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  setText('sideAvatar', initials);
  setText('topAvatar',  initials);
  setText('sideName',   `${p.first_name} ${p.last_name}`);
  setText('topName',    p.first_name);
  setText('greetName',  p.first_name);

  const { data: regs } = await supabase
    .from('registrations').select('status').eq('user_id', user.id);

  const registered = regs?.length ?? 0;
  const confirmed  = regs?.filter(r => r.status === 'confirmed').length ?? 0;

  const { data: att } = await supabase
    .from('attendance').select('status, completion').eq('user_id', user.id);

  const attended  = att?.length ?? 0;
  const completed = att?.filter(a => a.completion === 'Complete').length ?? 0;

  const values = document.querySelectorAll('.stat-value');
  if (values[0]) values[0].textContent = registered;
  if (values[1]) values[1].textContent = confirmed;
  if (values[2]) values[2].textContent = attended;
  if (values[3]) values[3].textContent = completed;

  const { count: totalSessions } = await supabase
    .from('sessions').select('*', { count: 'exact', head: true });

  const total = totalSessions ?? 0;
  const pct = total ? Math.round((completed / total) * 100) : 0;

  const progressCount = document.querySelector('.progress-count');
  if (progressCount) progressCount.innerHTML = `<strong>${completed}</strong> / ${total}`;

  const progressFill = document.querySelector('.progress-fill');
  if (progressFill) progressFill.style.width = pct + '%';
}