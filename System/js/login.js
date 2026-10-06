import { supabase } from './supabase-client.js';

window.togglePassword = (id) => {
  const inp = document.getElementById(id);
  if (inp) inp.type = inp.type === 'password' ? 'text' : 'password';
};

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const idOrEmail = document.getElementById('login-userId').value.trim();
  const password  = document.getElementById('login-password').value;

  let email = idOrEmail;
  if (!idOrEmail.includes('@')) {
    const { data, error } = await supabase
      .from('profiles')
      .select('email')
      .or(`student_id.eq.${idOrEmail},username.eq.${idOrEmail}`)
      .maybeSingle();
    if (error || !data) return alert('Account not found.');
    email = data.email;
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return alert(error.message);

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', data.user.id).single();

  if (profile?.role === 'student') {
    window.location.href = 'student-dashboard.html';
  } else {
    window.location.href = 'coor-dashboard.html';
  }
});