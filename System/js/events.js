import { supabase, requireAuth, signOut } from './supabase-client.js';
window.logout = signOut;
await requireAuth();

const grid  = document.getElementById('eventsGrid');
const empty = document.getElementById('emptyState');
const $ = (id) => document.getElementById(id);

if (!grid) throw new Error('eventsGrid not found');

let allEvents = [];

// Load settings once
const { data: settings } = await supabase.from('app_settings').select('*').eq('id', 1).single();
const autoConfirm = settings?.auto_confirm ?? false;

async function loadEvents() {
  const { data, error } = await supabase.from('events').select('*').order('starts_at', { ascending: true });
  if (error) {
    grid.innerHTML = `<p style="color:#a52222">Failed to load events: ${error.message}</p>`;
    return;
  }
  allEvents = data ?? [];
  applyFilters();
}

function applyFilters() {
  const q      = ($('filterSearch')?.value || '').toLowerCase();
  const status = $('filterStatus')?.value || 'all';
  const onOrAfter = $('filterDate')?.value || '';
  const sort   = $('filterSort')?.value || 'soonest';

  let rows = allEvents.filter(ev => {
    if (q && !ev.title.toLowerCase().includes(q) && !(ev.description ?? '').toLowerCase().includes(q)) return false;
    if (status !== 'all' && ev.status !== status) return false;
    if (onOrAfter && new Date(ev.starts_at) < new Date(onOrAfter)) return false;
    return true;
  });

  if (sort === 'soonest') rows.sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
  if (sort === 'latest')  rows.sort((a, b) => new Date(b.starts_at) - new Date(a.starts_at));
  if (sort === 'slots')   rows.sort((a, b) => (b.capacity ?? 0) - (a.capacity ?? 0));

  if (!rows.length) {
    grid.innerHTML = '';
    empty?.classList.remove('hidden');
    return;
  }
  empty?.classList.add('hidden');

  grid.innerHTML = rows.map(ev => `
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
          <div class="event-detail">🕒 ${new Date(ev.starts_at).toLocaleString()}</div>
        </div>
      </div>
      <div class="event-foot">
        <button class="btn-primary register-btn">Register</button>
        <button class="btn-ghost details-btn">Details</button>
      </div>
    </article>`).join('');

  grid.querySelectorAll('.register-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const eventId = e.target.closest('.event-card').dataset.id;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return alert('Please sign in.');

      const { error } = await supabase.from('registrations').insert({
        user_id: user.id,
        event_id: eventId,
        status: autoConfirm ? 'confirmed' : 'pending'
      });
      if (error) return alert(error.message);

      e.target.textContent = autoConfirm ? 'Registered' : 'Pending';
      e.target.disabled = true;
      e.target.classList.replace('btn-primary', 'btn-disabled');
    });
  });

  grid.querySelectorAll('.details-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const ev = allEvents.find(x => x.id === e.target.closest('.event-card').dataset.id);
      if (!ev) return;
      alert(
        `${ev.title}\n\n${ev.description ?? 'No description'}\n\n` +
        `📍 ${ev.venue ?? 'TBA'}\n🕒 ${new Date(ev.starts_at).toLocaleString()}\n` +
        `Status: ${ev.status}\nCapacity: ${ev.capacity ?? '—'}`
      );
    });
  });
}

$('filterSearch')?.addEventListener('input', applyFilters);
$('filterStatus')?.addEventListener('change', applyFilters);
$('filterDate')?.addEventListener('change', applyFilters);
$('filterSort')?.addEventListener('change', applyFilters);

loadEvents();