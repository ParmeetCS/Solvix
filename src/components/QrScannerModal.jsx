import { useEffect, useId, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, ImageUp, X } from 'lucide-react';

/**
 * Camera / image QR + barcode reader built on html5-qrcode.
 * onScan(text) is called for every new code read. With `continuous` the camera
 * stays open so several components can be scanned one after another; otherwise
 * the dialog closes after the first code.
 */
export default function QrScannerModal({ open, onClose, onScan, title = 'Scan QR code', continuous = false }) {
  const regionId = `qr-region-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const scannerRef = useRef(null);
  const lastRef = useRef({ text: '', at: 0 });
  const onScanRef = useRef(onScan);
  const [error, setError] = useState(null);
  const [count, setCount] = useState(0);
  useEffect(() => { onScanRef.current = onScan; });

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setError(null);
    setCount(0);
    const scanner = new Html5Qrcode(regionId, { verbose: false });
    scannerRef.current = scanner;
    let started = false;

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: (w, h) => { const s = Math.floor(Math.min(w, h) * 0.75); return { width: s, height: s }; } },
        (text) => {
          const now = Date.now();
          // the camera sees the same code many times a second; ignore repeats
          if (text === lastRef.current.text && now - lastRef.current.at < 2500) return;
          lastRef.current = { text, at: now };
          onScanRef.current?.(text);
          setCount((c) => c + 1);
          if (!continuous) onClose?.();
        },
        () => {},
      )
      .then(() => { started = true; if (cancelled) scanner.stop().catch(() => {}); })
      .catch((err) => {
        if (!cancelled) setError(typeof err === 'string' ? err : err?.message || 'Could not open the camera. Allow camera access, or scan from an image instead.');
      });

    return () => {
      cancelled = true;
      scannerRef.current = null;
      const finish = () => { try { scanner.clear(); } catch { /* already cleared */ } };
      if (started) scanner.stop().then(finish).catch(finish);
      else finish();
    };
  }, [open, continuous, onClose, regionId]);

  if (!open) return null;

  async function fromImage(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const reader = new Html5Qrcode(`${regionId}-file`, { verbose: false });
      const text = await reader.scanFile(file, false);
      onScanRef.current?.(text);
      setCount((c) => c + 1);
      setError(null);
      if (!continuous) onClose?.();
    } catch {
      setError('No QR code or barcode found in that image.');
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={title}
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.6)', display: 'grid', placeItems: 'center', padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div style={{ width: 'min(440px, 100%)', background: 'var(--surface-solid)', color: 'var(--text)', border: '1px solid rgba(var(--ink-rgb), 0.15)', borderRadius: 16, padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Camera size={18} />
          <b style={{ flex: 1 }}>{title}</b>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: 'none', border: 0, color: 'inherit', cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <div id={regionId} style={{ width: '100%', minHeight: 240, borderRadius: 10, overflow: 'hidden', background: '#000' }} />
        <div id={`${regionId}-file`} style={{ display: 'none' }} />
        {error && <p style={{ color: 'var(--c-red)', fontSize: 13, margin: '10px 0 0' }}>{error}</p>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, padding: '7px 12px', borderRadius: 9, border: '1px solid rgba(var(--ink-rgb), 0.2)' }}>
            <ImageUp size={15} /> Scan from image
            <input type="file" accept="image/*" onChange={fromImage} style={{ display: 'none' }} />
          </label>
          <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-muted)' }}>
            {continuous ? `${count} scanned` : 'Point the camera at the code'}
          </span>
          {continuous && <button type="button" className="btn-wh-primary" onClick={onClose}>Done</button>}
        </div>
      </div>
    </div>
  );
}
