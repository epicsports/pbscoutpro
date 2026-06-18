import React, { useState } from 'react';
import html2canvas from 'html2canvas';
import { useIsSuperAdmin } from '../../hooks/useIsSuperAdmin';
import { useDevice } from '../../hooks/useDevice';
import { useLanguage } from '../../hooks/useLanguage';
import { COLORS, FONT } from '../../utils/theme';

export default function DevSnapshotButton() {
  const isSuperAdmin = useIsSuperAdmin();
  const device = useDevice();
  const { lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState(null);

  if (!isSuperAdmin) return null;

  const capture = async () => {
    setBusy(true);
    let shot = null;
    try {
      const canvas = await html2canvas(document.body, {
        backgroundColor: COLORS.bg, scale: 2, logging: false, useCORS: true,
        windowWidth: document.documentElement.clientWidth,
        windowHeight: document.documentElement.clientHeight,
      });
      shot = canvas.toDataURL('image/png');
    } catch (e) { console.warn('[DevSnapshot] capture failed', e); }

    const ctx = window.__pbSnapshotContext || {};
    const bundle = {
      _type: 'pbscout-dev-snapshot', version: 1,
      capturedAt: new Date().toISOString(),
      route: window.location.hash || window.location.pathname,
      page: ctx.page || null,
      device: device.type,
      viewport: { w: window.innerWidth, h: window.innerHeight },
      lang,
      data: ctx.data || null,
      screenshot: shot,
    };

    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fname = `pbscout-snapshot-${ctx.page || 'screen'}-${stamp}.json`;
    const file = new File([JSON.stringify(bundle, null, 2)], fname, { type: 'application/json' });

    let via = 'download';
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'PbScout snapshot' });
        via = 'share sheet';
      } else { throw new Error('no share'); }
    } catch {
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url; a.download = fname; a.click();
      URL.revokeObjectURL(url);
    }
    setLast({ page: bundle.page, route: bundle.route, device: bundle.device, lang, hasShot: !!shot, via });
    setBusy(false); setOpen(true);
  };

  return (
    <>
      <button onClick={capture} title="Dev snapshot (super-admin)"
        style={{
          position: 'fixed', right: 16, bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))',
          zIndex: 9999, width: 46, height: 46, borderRadius: '50%', border: `2px solid ${COLORS.bg}`,
          background: busy ? COLORS.surfaceLight : COLORS.accentGradient, color: '#0a0e17',
          fontSize: 20, cursor: 'pointer', boxShadow: COLORS.accentGlow,
        }}>
        {busy ? '…' : '⌖'}
      </button>
      {open && last && (
        <div style={{
          position: 'fixed', right: 16, bottom: 'calc(128px + env(safe-area-inset-bottom, 0px))', zIndex: 9999,
          width: 240, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12,
          padding: 14, boxShadow: '0 12px 40px rgba(0,0,0,0.6)', fontFamily: FONT,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.success }}>Snapshot ready</span>
            <span onClick={() => setOpen(false)} style={{ cursor: 'pointer', color: COLORS.textMuted, fontSize: 16 }}>×</span>
          </div>
          {[['page', last.page || '-'], ['route', last.route], ['device', last.device], ['lang', last.lang], ['screenshot', last.hasShot ? 'PNG embedded' : 'none'], ['sent via', last.via]].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', gap: 6, fontSize: 11, marginBottom: 3 }}>
              <span style={{ color: COLORS.textMuted, minWidth: 64 }}>{k}</span>
              <span style={{ color: COLORS.textDim, flex: 1, wordBreak: 'break-word' }}>{String(v)}</span>
            </div>
          ))}
          <div style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 8, lineHeight: 1.4 }}>
            iPhone/iPad: Share to AirDrop or Save to Files, then attach in the design chat. Desktop: drag the file in.
          </div>
        </div>
      )}
    </>
  );
}
