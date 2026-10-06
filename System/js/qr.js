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

const initials = ((profile?.first_name?.[0] || '') + (profile?.last_name?.[0] || '')).toUpperCase() || 'ST';
qrAvatar.textContent = initials;
qrName.textContent   = `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() || 'Student';
qrId.textContent     = `Student ID: ${profile?.student_id ?? '—'}`;

const payload = JSON.stringify({
  uid: profile?.id ?? null,
  sid: profile?.student_id ?? null,
});

// ---------- Library loader with fallback CDNs ----------
const CDNS = [
  'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js',
  'https://unpkg.com/qrcode@1.5.3/build/qrcode.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
];

let qrLibPromise = null;

function loadQrLib() {
  if (window.QRCode) return Promise.resolve(window.QRCode);
  if (qrLibPromise) return qrLibPromise;

  qrLibPromise = new Promise((resolve, reject) => {
    let idx = 0;
    const tryNext = () => {
      if (idx >= CDNS.length) return reject(new Error('All QR CDNs failed'));
      const url = CDNS[idx++];
      const s = document.createElement('script');
      s.src = url;
      s.async = true;
      s.onload = () => {
        if (window.QRCode) resolve(window.QRCode);
        else tryNext();
      };
      s.onerror = tryNext;
      document.head.appendChild(s);
    };
    tryNext();
  });

  return qrLibPromise;
}

// ---------- Render ----------
async function renderQR() {
  // Give the canvas intrinsic size BEFORE the lib touches it
  canvas.width = 440;
  canvas.height = 440;

  // Clear any previous drawing
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let QRCode;
  try {
    QRCode = await loadQrLib();
  } catch (e) {
    ctx.fillStyle = '#b71c1c';
    ctx.font = '16px sans-serif';
    ctx.fillText('Failed to load QR library.', 20, 40);
    ctx.fillText('Check your internet connection.', 20, 70);
    console.error('QR library load failed:', e);
    return;
  }

  // Two possible APIs:
  // - qrcode (node-qrcode): QRCode.toCanvas(canvas, text, opts, cb)
  // - qrcodejs (davidshimjs): new QRCode(element, opts)
  if (typeof QRCode.toCanvas === 'function') {
    // node-qrcode API
    QRCode.toCanvas(canvas, payload, {
      width: 440,
      margin: 1,
      color: { dark: '#12211b', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    }, (err) => {
      if (err) {
        console.error('QR draw error:', err);
        ctx.fillStyle = '#b71c1c';
        ctx.font = '16px sans-serif';
        ctx.fillText('Could not draw QR.', 20, 40);
      }
    });
  } else if (typeof QRCode === 'function') {
    // qrcodejs API — needs a container element, not canvas
    const wrap = canvas.parentElement;
    wrap.innerHTML = ''; // clear
    new QRCode(wrap, {
      text: payload,
      width: 440,
      height: 440,
      colorDark: '#12211b',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M,
    });
    // Hide the canvas since qrcodejs renders an <img> or <canvas> of its own
    canvas.style.display = 'none';
  } else {
    ctx.fillStyle = '#b71c1c';
    ctx.font = '16px sans-serif';
    ctx.fillText('Unsupported QR library.', 20, 40);
  }
}

// ---------- Modal open/close ----------
showBtn.addEventListener('click', () => {
  overlay.classList.remove('hidden');
  renderQR();
});

const closeModal = () => overlay.classList.add('hidden');
closeBtn.addEventListener('click', closeModal);
overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !overlay.classList.contains('hidden')) closeModal();
});

// ---------- Download ----------
dlBtn.addEventListener('click', () => {
  // Find the actual rendered canvas (either ours or the one qrcodejs made)
  const rendered = canvas.style.display === 'none'
    ? overlay.querySelector('canvas')
    : canvas;

  if (!rendered || rendered.width === 0) {
    return alert('QR not ready yet.');
  }

  const a = document.createElement('a');
  a.download = `SEAMS-QR-${profile?.student_id ?? profile?.id ?? 'student'}.png`;
  a.href = rendered.toDataURL('image/png');
  a.click();
});