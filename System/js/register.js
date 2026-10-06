import { supabase } from './supabase-client.js';

const $ = (id) => document.getElementById(id);
const msg = $('registerMessage');

window.togglePassword = (id) => {
  const inp = $(id);
  if (inp) inp.type = inp.type === 'password' ? 'text' : 'password';
};

function show(text, ok) {
  msg.textContent = text;
  msg.style.display = 'block';
  msg.style.padding = '10px 14px';
  msg.style.borderRadius = '6px';
  msg.style.marginTop = '12px';
  msg.style.fontSize = '0.85rem';
  if (ok) {
    msg.style.background = '#e8f5e9';
    msg.style.color = '#1b5e47';
    msg.style.border = '1px solid #c8e6c9';
  } else {
    msg.style.background = '#fdecea';
    msg.style.color = '#b71c1c';
    msg.style.border = '1px solid #f5c6cb';
  }
}

$('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const first   = $('reg-firstname').value.trim();
  const last    = $('reg-lastname').value.trim();
  const uname   = $('reg-username').value.trim();
  const sid     = $('reg-studentid').value.trim() || null;
  const email   = $('reg-email').value.trim();
  const contact = $('reg-contact').value.trim() || null;
  const pw      = $('reg-password').value;
  const pw2     = $('reg-confirm').value;

  if (!first || !last || !uname || !email) return show('Please fill in all required fields.', false);
  if (pw !== pw2) return show('Passwords do not match.', false);
  if (pw.length < 8) return show('Password must be at least 8 characters.', false);

  const { data, error } = await supabase.auth.signUp({
    email, password: pw,
    options: {
      data: {
        first_name: first,
        last_name: last,
        username: uname,
        student_id: sid,
        contact_number: contact
      }
    }
  });

  if (error) return show(error.message, false);
  if (data.session) {
    window.location.href = 'student-dashboard.html';
  } else {
    show('Account created! Check your email to confirm, then sign in.', true);
  }
});