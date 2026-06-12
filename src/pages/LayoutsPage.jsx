/**
 * LayoutsPage — grid of the workspace's layout cards (§ 96: merged base ∪
 * overlay) + a "Browse library" flow to add a global base layout to the
 * workspace (creates an overlay). "New layout" (authoring a new base) is
 * super_admin-only — coaches consume the shared library, never edit base.
 */
import { useState } from 'react';
import { useDevice } from '../hooks/useDevice';
import { useNavigate } from 'react-router-dom';

import PageHeader from '../components/PageHeader';
import { Btn, SectionTitle, EmptyState, SkeletonList, Modal, Icons, LeagueBadge, YearBadge } from '../components/ui';
import { useLayouts, useBaseLayouts } from '../hooks/useFirestore';
import { useIsSuperAdmin } from '../hooks/useIsSuperAdmin';
import * as ds from '../services/dataService';
import { COLORS, FONT, FONT_SIZE, TOUCH, SPACE, responsive } from '../utils/theme';
import { useLanguage } from '../hooks/useLanguage';

export default function LayoutsPage() {
  const { t } = useLanguage();
  const device = useDevice();
  const R = responsive(device.type);
  const navigate = useNavigate();
  const { layouts, loading } = useLayouts();
  const { bases, loading: basesLoading } = useBaseLayouts();
  const isSuper = useIsSuperAdmin();

  const [libraryOpen, setLibraryOpen] = useState(false);
  const [adding, setAdding] = useState(null);   // baseId mid-add

  const addedIds = new Set(layouts.map(l => l.id));
  const available = bases.filter(b => !addedIds.has(b.id));

  const handleAdd = async (base) => {
    setAdding(base.id);
    try {
      await ds.addLayoutToWorkspace(base.id, { nameOverride: null });
    } finally {
      setAdding(null);
    }
  };

  return (
    <div style={{ minHeight: '100vh', maxWidth: R.layout.maxWidth || 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <PageHeader back={{ to: '/' }} title={t('layouts_label')} subtitle={t('layouts_subtitle')} />
      <div style={{ flex: 1, overflowY: 'auto', padding: R.layout.padding, paddingBottom: 64, display: 'flex', flexDirection: 'column', gap: R.layout.gap }}>

        <SectionTitle>
          {t('layouts_count_title', layouts.length)}
        </SectionTitle>

        {loading && <SkeletonList count={3} />}
        {!loading && !layouts.length && (
          <EmptyState icon="🗺️" text={t('layouts_empty_add_first')} />
        )}

        {/* 2x2 grid, sorted by year desc then name */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 10,
        }}>
          {[...layouts]
            .sort((a, b) => (b.year || 0) - (a.year || 0) || (a.name || '').localeCompare(b.name || ''))
            .map(l => (
            <div
              key={l.id}
              onClick={() => navigate(`/layout/${l.id}`)}
              style={{
                background: COLORS.surfaceDark, border: `1px solid ${COLORS.border}`,
                borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
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

        {/* Browse the shared library — add an existing field to this workspace */}
        <Btn variant="accent" onClick={() => setLibraryOpen(true)} style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
          <Icons.Plus /> {t('layouts_browse_library')}
        </Btn>

        {/* Authoring a new base layout is super_admin-only (§ 96) */}
        {isSuper && (
          <Btn variant="default" onClick={() => navigate('/layout/new')} style={{ width: '100%', justifyContent: 'center' }}>
            <Icons.Plus /> {t('layouts_new_base')}
          </Btn>
        )}
      </div>

      {/* ═══ LIBRARY MODAL — add a global base to this workspace ═══ */}
      <Modal open={libraryOpen} onClose={() => setLibraryOpen(false)} title={t('layouts_library_title')} maxWidth={520}>
        {basesLoading && <SkeletonList count={3} />}
        {!basesLoading && !available.length && (
          <EmptyState icon="✓" text={bases.length ? t('layouts_library_all_added') : t('layouts_library_empty')} />
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {available
            .sort((a, b) => (b.year || 0) - (a.year || 0) || (a.name || '').localeCompare(b.name || ''))
            .map(base => (
            <div key={base.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: COLORS.surfaceDark, border: `1px solid ${COLORS.border}`,
              borderRadius: 10, padding: 8, minHeight: TOUCH.minTarget,
            }}>
              {base.fieldImage
                ? <img src={base.fieldImage} alt={base.name} loading="lazy"
                    style={{ width: 56, height: 42, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                : <div style={{ width: 56, height: 42, borderRadius: 6, background: COLORS.bg, flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: FONT_SIZE.sm, color: COLORS.text,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {base.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <LeagueBadge league={base.league} /> <YearBadge year={base.year} />
                </div>
              </div>
              <Btn variant="accent" size="sm" disabled={adding === base.id}
                onClick={() => handleAdd(base)}>
                {adding === base.id ? '…' : t('add')}
              </Btn>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
