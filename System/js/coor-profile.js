import { supabase, requireAuth, getProfile, signOut } from './supabase-client.js';
window.logout = signOut;
const user = await requireAuth();
const me = await getProfile();
if (!me || !['coordinator','admin'].includes(me.role)) {
  window.location.href = 'student-dashboard.html';
}

const $ = (id) => document.getElementById(id);

const initials = ((me.first_name?.[0] || '') + (me.last_name?.[0] || '')).toUpperCase() || 'EC';
$('profileAvatar').textContent = initials;
$('profileName').textContent   = `${me.first_name ?? ''} ${me.last_name ?? ''}`.trim() || 'Coordinator';
$('profileEmail').textContent  = me.email ?? '—';
$('fullNameInput').value       = `${me.first_name ?? ''} ${me.last_name ?? ''}`.trim();
$('contactInput').value        = me.contact_number ?? '';

$('account-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const [first, ...rest] = $('fullNameInput').value.trim().split(' ');
  const { error } = await supabase.from('profiles').update({
    first_name: first || null,
    last_name: rest.join(' ') || null,
    contact_number: $('contactInput').value.trim() || null,
  }).eq('id', user.id);
  alert(error ? error.message : 'Profile saved.');
});

$('password-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const pw = $('newPassword').value;
  if (pw.length < 8) return alert('Password must be at least 8 characters.');
  const { error } = await supabase.auth.updateUser({ password: pw });
  alert(error ? error.message : 'Password updated.');
  if (!error) $('password-form').reset();
});