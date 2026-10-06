import { supabase, requireAuth, getProfile, signOut } from './supabase-client.js';
window.logout = signOut;
await requireAuth();
const me = await getProfile();
if (!me || !['coordinator', 'admin'].includes(me.role)) {
  window.location.href = 'student-dashboard.html';
}

const tbody = document.querySelector('tbody');

async function startScan() {
  // Show chooser: live camera OR upload
  const mode = confirm(
    'Use LIVE CAMERA?\n\n' +
    '• OK = live camera\n' +
    '• Cancel = upload QR screenshot'
  );

  if (!mode) return uploadQR();

  const video = document.createElement('video');
  video.setAttribute('playsinline', '');
  video.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;object-fit:cover;z-index:999;background:#000;';

  const close = document.createElement('button');
  close.textContent = '✕ Close';
  close.style.cssText = 'position:fixed;top:16px;right:16px;z-index:1000;background:#c89228;border:none;padding:10px 16px;border-radius:8px;font-weight:600;cursor:pointer;';
  document.body.append(video, close);

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
  } catch (e) {
    close.remove(); video.remove();
    return alert('Camera unavailable. Try uploading a QR image.');
  }
  video.srcObject = stream;
  await video.play();

  const stop = () => { stream.getTracks().forEach(t => t.stop()); video.remove(); close.remove(); };
  close.onclick = stop;

  if (!('BarcodeDetector' in window)) {
    stop();
    return alert('Live scanning not supported. Try uploading a QR image instead.');
  }
  const detector = new BarcodeDetector({ formats: ['qr_code'] });
  const tick = async () => {
    try {
      const codes = await detector.detect(video);
      if (codes?.length) {
        stop();
        const payload = JSON.parse(codes[0].rawValue);
        await handleScan(payload);
        return;
      }
    } catch {}
    if (document.body.contains(video)) requestAnimationFrame(tick);
  };
  tick();
}

function uploadQR() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;

    const img = new Image();
    img.src = URL.createObjectURL(file);
    await img.decode();

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    if (!('BarcodeDetector' in window)) return alert('QR decoding not supported in this browser.');
    const detector = new BarcodeDetector({ formats: ['qr_code'] });
    const codes = await detector.detect(canvas);
    if (!codes?.length) return alert('No QR code found in that image.');

    const payload = JSON.parse(codes[0].rawValue);
    await handleScan(payload);
  };
  input.click();
}