import { supabase, requireAuth, getProfile, signOut } from './supabase-client.js';
window.logout = signOut;

const user    = await requireAuth();
const profile = await getProfile();

const overlay  = document.getElementById('qrOverlay');
const canvas   = document.getElementById('qrCanvas');
const showBtn  = document.getElementById('showQrBtn');
const closeBtn = document.getElementById('qrClose');
const dlBtn    = document.getElementById('qrDownload');
const qrAvatar = document.getElementById('qrAvatar');
const qrName   = document.getElementById('qrName');
const qrId     = document.getElementById('qrId');

if (!showBtn || !overlay) throw new Error('QR UI missing');

const initials = ((profile.first_name?.[0] || '') + (profile.last_name?.[0] || '')).toUpperCase() || 'ST';
qrAvatar.textContent = initials;
qrName.textContent   = `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || 'Student';
qrId.textContent     = `Student ID: ${profile.student_id ?? '—'}`;

const payload = JSON.stringify({
  uid: profile.id,
  sid: profile.student_id ?? null,
});

let qrGenerated = false;

function generateQR() {
  if (qrGenerated) return;
  qrGenerated = true;

  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js';
  s.onload = () => {
    window.QRCode.toCanvas(canvas, payload, {
      width: 440, margin: 1,
      color: { dark: '#12211b', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    }, (err) => { if (err) console.error('QR error:', err); });
  };
  document.head.appendChild(s);
}

showBtn.addEventListener('click', () => {
  overlay.classList.remove('hidden');
  generateQR();
});

const closeModal = () => overlay.classList.add('hidden');
closeBtn.addEventListener('click', closeModal);
overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !overlay.classList.contains('hidden')) closeModal();
});

dlBtn.addEventListener('click', () => {
  const a = document.createElement('a');
  a.download = `SEAMS-QR-${profile.student_id ?? profile.id}.png`;
  a.href = canvas.toDataURL('image/png');
  a.click();
});