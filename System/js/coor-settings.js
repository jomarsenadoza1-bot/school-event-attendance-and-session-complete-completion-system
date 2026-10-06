import { supabase, requireAuth, getProfile, signOut } from './supabase-client.js';
window.logout = signOut;
await requireAuth();
const me = await getProfile();
if (!me || !['coordinator','admin'].includes(me.role)) {
  window.location.href = 'student-dashboard.html';
}

const $ = (id) => document.getElementById(id);

// Load from DB
const { data: s } = await supabase.from('app_settings').select('*').eq('id', 1).single();
if (s) {
  $('schoolNameInput').value = s.school_name ?? 'Mabini Integrated School';
  $('cancel-reg').checked = s.allow_cancel ?? true;
  $('auto-confirm').checked = s.auto_confirm ?? false;
}

$('saveSettings')?.addEventListener('click', async () => {
  const payload = {
    school_name: $('schoolNameInput').value.trim() || 'Mabini Integrated School',
    allow_cancel: $('cancel-reg').checked,
    auto_confirm: $('auto-confirm').checked,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('app_settings').update(payload).eq('id', 1);
  if (error) return alert(error.message);

  await supabase.from('activity_log').insert({
    actor: me.id, action: 'updated settings',
    details: `auto-confirm: ${payload.auto_confirm}, cancel: ${payload.allow_cancel}`
  });

  alert('Settings saved.');
});

// Reset demo data (clears registrations + attendance + activity_log)
document.getElementById('resetDataBtn')?.addEventListener('click', async () => {
  if (!confirm('Reset all registrations, attendance, and activity? This cannot be undone.')) return;

  await supabase.from('attendance').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('registrations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('activity_log').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  await supabase.from('activity_log').insert({
    actor: me.id, action: 'reset data', details: 'All demo data cleared'
  });

  alert('Demo data reset.');
  location.reload();
});