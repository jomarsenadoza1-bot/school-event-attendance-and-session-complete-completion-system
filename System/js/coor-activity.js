import { supabase, requireAuth, getProfile, signOut } from './supabase-client.js';
window.logout = signOut;
await requireAuth();
const me = await getProfile();
if (!me || !['coordinator', 'admin'].includes(me.role)) {
  window.location.href = 'student-dashboard.html';
}

const list = document.querySelector('ul');

const { data: rows } = await supabase
  .from('activity_log')
  .select('action,details,created_at,profiles(first_name,last_name)')
  .order('created_at', { ascending: false })
  .limit(50);

if (!rows?.length) {
  list.innerHTML = `<li class="text-slate-400 text-sm">No activity yet.</li>`;
} else {
  list.innerHTML = rows.map(r => `
    <li class="flex items-start gap-4 pb-4 border-b border-stone-200/60">
      <div class="w-8 h-8 rounded-full bg-emerald-100 text-[#0c221a] flex items-center justify-center text-xs font-bold mt-0.5">
        <i class="fa-solid fa-check"></i>
      </div>
      <div>
        <p class="text-sm font-semibold text-slate-900">
          <span class="text-[#0c221a]">${r.profiles?.first_name ?? 'System'}</span>
          ${r.action}: <span class="text-slate-600">${r.details ?? ''}</span>
        </p>
        <p class="text-xs text-slate-500">${new Date(r.created_at).toLocaleString()}</p>
      </div>
    </li>`).join('');
}