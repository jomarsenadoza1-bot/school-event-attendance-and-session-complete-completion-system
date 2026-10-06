import { supabase, requireAuth, getProfile, signOut } from './supabase-client.js';
window.logout = signOut;
const user = await requireAuth();
const p = await getProfile();

const $ = (id) => document.getElementById(id);

const accountAvatar = $('accountAvatar');
const accountSid    = $('accountSid');
const accountEmail  = $('accountEmail');
const accountRole   = $('accountRole');
const accFullName   = $('accFullName');
const accContact    = $('accContact');
const accountForm   = $('accountForm');
const passwordForm  = $('passwordForm');
const newPassword   = $('newPassword');

const initials = ((p.first_name?.[0] || '') + (p.last_name?.[0] || '')).toUpperCase() || 'ST';
accountAvatar.textContent = initials;
accountSid.textContent    = p.student_id ?? p.user_id ?? '—';
accountEmail.textContent  = p.email;
accountRole.textContent   = '● ' + (p.role[0].toUpperCase() + p.role.slice(1));
accFullName.value         = `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim();
accContact.value          = p.contact_number ?? '';

accountForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const [first, ...rest] = accFullName.value.trim().split(' ');
  const { error } = await supabase.from('profiles').update({
    first_name: first,
    last_name: rest.join(' '),
    contact_number: accContact.value.trim() || null,
  }).eq('id', user.id);
  alert(error ? error.message : 'Profile saved.');
});

passwordForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const { error } = await supabase.auth.updateUser({ password: newPassword.value });
  alert(error ? error.message : 'Password updated.');
  passwordForm.reset();
});