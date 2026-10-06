import { supabase, requireAuth, getProfile } from './supabase-client.js';

const user = await requireAuth();
if (!user) throw new Error('Not signed in');

try {
  const me = await getProfile();
  let count = 0;

  if (me?.role === 'student') {
    const { count: c } = await supabase
      .from('registrations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'pending');
    count = c ?? 0;
  } else {
    const { count: c } = await supabase
      .from('registrations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    count = c ?? 0;
  }

  document.querySelectorAll('.badge').forEach(b => b.textContent = count);
} catch (err) {
  console.warn('notifications:', err);
}