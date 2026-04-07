/**
 * LayoutsPage — grid of layout cards + "New layout" navigates to wizard.
 */
import React from 'react';
import { useDevice } from '../hooks/useDevice';
import { useNavigate } from 'react-router-dom';

import PageHeader from '../components/PageHeader';
import { Btn, SectionTitle, EmptyState, SkeletonList, Icons, LeagueBadge, YearBadge } from '../components/ui';
import { useLayouts } from '../hooks/useFirestore';
import { COLORS, FONT, TOUCH, responsive } from '../utils/theme';

export default function LayoutsPage() {
  const device = useDevice();
  const R = responsive(device.type);
  const navigate = useNavigate();
  const { layouts, loading } = useLayouts();

  return (
    <div style={{ minHeight: '100vh', maxWidth: R.layout.maxWidth || 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <PageHeader title="Layouts" subtitle="FIELD MAPS" />
      <div style={{ flex: 1, overflowY: 'auto', padding: R.layout.padding, paddingBottom: 64, display: 'flex', flexDirection: 'column', gap: R.layout.gap }}>

        <SectionTitle>
          <Icons.Image /> Layouts ({layouts.length})
        </SectionTitle>

        {loading && <SkeletonList count={3} />}
        {!loading && !layouts.length && (
          <EmptyState icon="🗺️" text="Add your first field layout" />
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
                background: COLORS.surfaceLight, border: `1px solid ${COLORS.border}`,
                borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
              }}
            >
              {l.fieldImage && (
                <div style={{ position: 'relative', overflow: 'hidden', aspectRatio: '4/3' }}>
                  <img src={l.fieldImage} alt={l.name}
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

        {/* New layout — navigates to wizard */}
        <Btn variant="accent" onClick={() => navigate('/layout/new')} style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
          <Icons.Plus /> New layout
        </Btn>
      </div>
    </div>
  );
}
