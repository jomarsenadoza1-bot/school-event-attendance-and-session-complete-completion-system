import { supabase, requireAuth, signOut } from './supabase-client.js';
window.logout = signOut;
const user = await requireAuth();

const tbody = document.getElementById('attBody');
const empty = document.getElementById('attEmpty');
const $ = (id) => document.getElementById(id);

let allRows = [];

async function load() {
  const { data } = await supabase
    .from('attendance')
    .select('id, status, completion, recorded_at, events(id,title), sessions(title)')
    .eq('user_id', user.id)
    .order('recorded_at', { ascending: false });

  allRows = data ?? [];

  // Populate event filter
  const eventSel = $('filterEvent');
  if (eventSel && eventSel.options.length <= 1) {
    const seen = new Set();
    allRows.forEach(r => {
      const t = r.events?.title;
      if (t && !seen.has(t)) {
        seen.add(t);
        const opt = document.createElement('option');
        opt.value = t; opt.textContent = `Event: ${t}`;
        eventSel.appendChild(opt);
      }
    });
  }

  applyFilters();
}

function applyFilters() {
  const evFilter  = $('filterEvent')?.value || 'all';
  const dateF     = $('filterDate')?.value || '';
  const attF      = $('filterAttendance')?.value || 'all';
  const compF     = $('filterCompletion')?.value || 'all';

  let rows = allRows.filter(r => {
    if (evFilter !== 'all' && r.events?.title !== evFilter) return false;
    if (dateF && !r.recorded_at.startsWith(dateF)) return false;
    if (attF !== 'all' && r.status !== attF) return false;
    if (compF !== 'all' && r.completion !== compF) return false;
    return true;
  });

  if (!rows.length) {
    tbody.innerHTML = '';
    empty?.classList.remove('hidden');
    return;
  }
  empty?.classList.add('hidden');

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${r.events?.title ?? '—'}</td>
      <td>${r.sessions?.title ?? '—'}</td>
      <td>${new Date(r.recorded_at).toLocaleDateString()}</td>
      <td><span class="pill pill-${
        r.status === 'Present' ? 'green' :
        r.status === 'Late'    ? 'gold'  :
        r.status === 'Excused' ? 'blue'  : 'red'}">${r.status}</span></td>
      <td><span class="pill pill-${
        r.completion === 'Complete' ? 'green' :
        r.completion === 'Pending'  ? 'gold'  : 'gray'}">${r.completion}</span></td>
    </tr>`).join('');
}

['filterEvent','filterDate','filterAttendance','filterCompletion']
  .forEach(id => $(id)?.addEventListener('change', applyFilters));

load();