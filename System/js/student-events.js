import { supabase, requireAuth, signOut } from './supabase-client.js';
window.logout = signOut;
await requireAuth();

const grid  = document.getElementById('eventsGrid');
const empty = document.getElementById('emptyState');

if (!grid) throw new Error('eventsGrid not found');

const { data: events, error } = await supabase
  .from('events')
  .select('*')
  .order('starts_at', { ascending: true });

if (error) {
  grid.innerHTML = `<p style="color:#a52222">Failed to load events: ${error.message}</p>`;
} else if (!events?.length) {
  empty?.classList.remove('hidden');
} else {
  grid.innerHTML = events.map(ev => `
    <article class="event-card" data-id="${ev.id}">
      <div class="event-head">
        <div class="event-head-top">
          <span class="event-date">${new Date(ev.starts_at).toDateString()}</span>
          <span class="event-status ${ev.status}">${ev.status}</span>
        </div>
        <h3 class="event-title">${ev.title}</h3>
      </div>
      <div class="event-body">
        <p class="event-desc">${ev.description ?? ''}</p>
        <div class="event-details">
          <div class="event-detail">📍 ${ev.venue ?? 'TBA'}</div>
        </div>
      </div>
      <div class="event-foot">
        <button class="btn-primary register-btn">Register</button>
      </div>
    </article>`).join('');

  grid.querySelectorAll('.register-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const eventId = e.target.closest('.event-card').dataset.id;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return alert('Please sign in.');

      const { error } = await supabase.from('registrations').insert({
        user_id: user.id, event_id: eventId, status: 'pending'
      });
      if (error) return alert(error.message);

      e.target.textContent = 'Registered';
      e.target.disabled = true;
      e.target.classList.replace('btn-primary', 'btn-disabled');
    });
  });
}