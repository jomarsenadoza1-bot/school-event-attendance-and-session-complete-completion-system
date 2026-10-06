import { supabase } from './supabase-client.js';

const $ = (id) => document.getElementById(id);
const msg = $('registerMessage');
const form = $('registerForm');
const submitBtn = form.querySelector('button[type="submit"]');

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
  msg.style.fontWeight = '500';
  if (ok) {
    msg.style.background = '#e8f5e9';
    msg.style.color = '#1b5e47';
    msg.style.border = '1px solid #c8e6c9';
  } else {
    msg.style.background = '#fdecea';
    msg.style.color = '#b71c1c';
    msg.style.border = '1px solid #f5c6cb';
  }
  msg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function setLoading(loading) {
  if (!submitBtn) return;
  submitBtn.disabled = loading;
  submitBtn.textContent = loading ? 'Creating account…' : 'Sign Up';
  submitBtn.style.opacity = loading ? '0.7' : '1';
  submitBtn.style.cursor = loading ? 'not-allowed' : 'pointer';
}

// -------- Field-level validators --------
// Each returns null if OK, or an error string.

const rules = {
  firstname(v) {
    if (!v) return 'First name is required.';
    if (v.length < 2) return 'First name must be at least 2 characters.';
    if (v.length > 50) return 'First name is too long (max 50).';
    if (!/^[A-Za-zÀ-ÿ' .-]+$/.test(v)) return 'First name contains invalid characters (letters, spaces, . - \' only).';
    return null;
  },
  lastname(v) {
    if (!v) return 'Last name is required.';
    if (v.length < 2) return 'Last name must be at least 2 characters.';
    if (v.length > 50) return 'Last name is too long (max 50).';
    if (!/^[A-Za-zÀ-ÿ' .-]+$/.test(v)) return 'Last name contains invalid characters (letters, spaces, . - \' only).';
    return null;
  },
  username(v) {
    if (!v) return 'Username is required.';
    if (v.length < 3) return 'Username must be at least 3 characters.';
    if (v.length > 20) return 'Username must be at most 20 characters.';
    if (/\s/.test(v)) return 'Username cannot contain spaces.';
    if (!/^[a-zA-Z0-9._-]+$/.test(v)) return 'Username may only contain letters, numbers, dot (.), underscore (_), or hyphen (-).';
    if (/^[._-]/.test(v)) return 'Username cannot start with a dot, underscore, or hyphen.';
    if (/[._-]$/.test(v)) return 'Username cannot end with a dot, underscore, or hyphen.';
    return null;
  },
  studentId(v) {
    // Optional field. If provided, must be 4–20 alphanumeric chars (dash allowed).
    if (!v) return null;
    if (v.length < 4) return 'Student ID must be at least 4 characters.';
    if (v.length > 20) return 'Student ID must be at most 20 characters.';
    if (/\s/.test(v)) return 'Student ID cannot contain spaces.';
    if (!/^[A-Za-z0-9-]+$/.test(v)) return 'Student ID may only contain letters, numbers, and hyphen (-).';
    return null;
  },
  email(v) {
    if (!v) return 'Email is required.';
    // RFC-ish simple check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Please enter a valid email address (e.g. name@school.edu.ph).';
    if (v.length > 254) return 'Email is too long.';
    return null;
  },
  contact(v) {
    // Optional. PH mobile format: 09XXXXXXXXX or +639XXXXXXXXX
    if (!v) return null;
    const cleaned = v.replace(/[\s-]/g, '');
    if (!/^(09\d{9}|\+639\d{9})$/.test(cleaned)) {
      return 'Contact number must be 11 digits starting with 09, or +639XXXXXXXXX.';
    }
    return null;
  },
  password(v) {
    if (!v) return 'Password is required.';
    if (v.length < 8) return 'Password must be at least 8 characters.';
    if (v.length > 72) return 'Password must be at most 72 characters.';
    if (!/[A-Z]/.test(v)) return 'Password must contain at least one UPPERCASE letter.';
    if (!/[a-z]/.test(v)) return 'Password must contain at least one lowercase letter.';
    if (!/[0-9]/.test(v)) return 'Password must contain at least one number.';
    return null;
  },
  confirm(pw, pw2) {
    if (!pw2) return 'Please confirm your password.';
    if (pw !== pw2) return 'Passwords do not match.';
    return null;
  },
};

// -------- Submit --------
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const first   = $('reg-firstname').value.trim();
  const last    = $('reg-lastname').value.trim();
  const uname   = $('reg-username').value.trim();
  const sid     = $('reg-studentid').value.trim();       // keep raw; validated by rule
  const email   = $('reg-email').value.trim().toLowerCase();
  const contact = $('reg-contact').value.trim();
  const pw      = $('reg-password').value;
  const pw2     = $('reg-confirm').value;

  // Run each validator in order — first failure wins and is shown.
  const checks = [
    rules.firstname(first),
    rules.lastname(last),
    rules.username(uname),
    rules.studentId(sid),
    rules.email(email),
    rules.contact(contact),
    rules.password(pw),
    rules.confirm(pw, pw2),
  ];

  const firstError = checks.find(x => x !== null);
  if (firstError) {
    show(firstError, false);
    return;
  }

  setLoading(true);
  msg.style.display = 'none';

  try {
    // ---- Uniqueness checks (these are the "already exists" failures) ----
    const { data: unameTaken } = await supabase
      .from('profiles').select('id').eq('username', uname).maybeSingle();
    if (unameTaken) {
      setLoading(false);
      return show(`Username "${uname}" is already taken. Try a different one.`, false);
    }

    if (sid) {
      const { data: sidTaken } = await supabase
        .from('profiles').select('id').eq('student_id', sid).maybeSingle();
      if (sidTaken) {
        setLoading(false);
        return show(`Student ID "${sid}" is already registered.`, false);
      }
    }

    const { data: emailTaken } = await supabase
      .from('profiles').select('id').eq('email', email).maybeSingle();
    if (emailTaken) {
      setLoading(false);
      return show(`Email "${email}" is already registered. Try signing in instead.`, false);
    }

    // ---- Sign up ----
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pw,
      options: {
        data: {
          first_name: first,
          last_name: last,
          username: uname,
          student_id: sid || null,
          contact_number: contact || null,
          role: 'student',
        },
      },
    });

    if (error) {
      setLoading(false);
      // Friendly mapping for common Supabase errors
      const m = error.message || '';
      if (/already registered|already exists/i.test(m)) {
        return show('That email is already registered. Try signing in instead.', false);
      }
      if (/password/i.test(m)) {
        return show('Password rejected: ' + m, false);
      }
      if (/rate limit|too many/i.test(m)) {
        return show('Too many attempts. Please wait a minute and try again.', false);
      }
      return show('Registration failed: ' + m, false);
    }

    // Supabase returns a fake user when email already exists — detect it.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      setLoading(false);
      return show('That email is already registered. Try signing in instead.', false);
    }

    // ---- Ensure profile row exists (fallback if no DB trigger) ----
    if (data.user) {
      const { error: profileErr } = await supabase
        .from('profiles')
        .upsert({
          id: data.user.id,
          email,
          first_name: first,
          last_name: last,
          username: uname,
          student_id: sid || null,
          contact_number: contact || null,
          role: 'student',
        }, { onConflict: 'id' });

      if (profileErr) {
        console.warn('Profile upsert warning:', profileErr.message);
      }
    }

    // ---- Route ----
    if (data.session) {
      show('Account created! Redirecting to your dashboard…', true);
      setTimeout(() => { window.location.href = 'student-dashboard.html'; }, 800);
    } else {
      show('Account created! Check your email to confirm, then sign in.', true);
      form.reset();
      setLoading(false);
    }
  } catch (err) {
    setLoading(false);
    show('Unexpected error: ' + (err.message || err), false);
  }
});