/**
 * AdminLayoutsPage — super_admin view of the FULL global base-layout library
 * (§ 96). Distinct from /layouts, which is workspace-scoped (the active
 * workspace's layouts only). Lists EVERY base layout (`useBaseLayouts`); tap to
 * open, + author a new base. Sits in the Super Admin menu section.
 *
 * Note: opening a base (→ /layout/:id) resolves through the workspace-merged
 * `useLayouts`, so a base not yet added to the active workspace won't open here
 * — add it via /layouts "Browse library" first. (For the curating super_admin's
 * own workspace this is a non-issue.)
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDevice } from '../../hooks/useDevice';
import PageHeader from '../../components/PageHeader';
import { Btn, SectionTitle, EmptyState, SkeletonList, Icons, LeagueBadge, YearBadge } from '../../components/ui';
import { useBaseLayouts, useLayouts } from '../../hooks/useFirestore';
import * as ds from '../../services/dataService';
import { COLORS, FONT, TOUCH, responsive } from '../../utils/theme';
import { useLanguage } from '../../hooks/useLanguage';

export default function AdminLayoutsPage() {
  const { t } = useLanguage();
  const device = useDevice();
  const R = responsive(device.type);
  const navigate = useNavigate();
  const { bases, loading } = useBaseLayouts();
  // § 96 — the base-editing pages (/layout/:id) resolve through the
  // workspace-merged useLayouts, so opening a library base that isn't in the
  // active workspace yet 404s ("empty"). Ensure an overlay exists first
  // (idempotent), then open — same as /layouts "Add" + open.
  const { layouts } = useLayouts();
  const [opening, setOpening] = useState(null);
  const inWorkspace = new Set(layouts.map(l => l.id));
  const handleOpen = async (base) => {
    if (!inWorkspace.has(base.id)) {
      setOpening(base.id);
      try { await ds.addLayoutToWorkspace(base.id); }
      catch { /* fall through — navigate anyway */ }
      finally { setOpening(null); }
    }
    navigate(`/layout/${base.id}`, { state: { from: '/admin/layouts' } });
  };

  return (
    <div style={{ minHeight: '100vh', maxWidth: R.layout.maxWidth || 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <PageHeader back={{ to: '/' }} title={t('b13_field_library')} subtitle="GLOBAL BASE LAYOUTS" />
      <div style={{ flex: 1, overflowY: 'auto', padding: R.layout.padding, paddingBottom: 64, display: 'flex', flexDirection: 'column', gap: R.layout.gap }}>

        <SectionTitle>Library ({bases.length})</SectionTitle>

        {loading && <SkeletonList count={3} />}
        {!loading && !bases.length && (
          <EmptyState icon="🗺️" text={t('b13_no_base_layouts')} />
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {[...bases]
            .sort((a, b) => (b.year || 0) - (a.year || 0) || (a.name || '').localeCompare(b.name || ''))
            .map(l => (
            <div
              key={l.id}
              onClick={() => handleOpen(l)}
              style={{
                background: COLORS.surfaceDark, border: `1px solid ${COLORS.border}`,
                borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
                opacity: opening === l.id ? 0.5 : 1,
              }}
            >
              {l.fieldImage && (
                <div style={{ position: 'relative', overflow: 'hidden', aspectRatio: '4/3' }}>
                  <img src={l.fieldImage} alt={l.name} loading="lazy"
                    style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }} />
                </div>
              )}
              <div style={{ padding: '8px 10px' }}>
                <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: TOUCH.fontSm, color: COLORS.text,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {l.name}
                </div>
                <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginTop: 2,
                  display: 'flex', alignItems: 'center', gap: 4 }}>
                  <LeagueBadge league={l.league} /> <YearBadge year={l.year} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Authoring a new base layout (§ 96 — super_admin only; this page is
            already SuperAdminGuard-gated). */}
        <Btn variant="default" onClick={() => navigate('/layout/new')} style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
          <Icons.Plus /> New layout (base)
        </Btn>
      </div>
    </div>
  );
}
