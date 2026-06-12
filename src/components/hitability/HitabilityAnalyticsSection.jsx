import React, { useState, useEffect, useMemo } from 'react';
import PageHeader from '../PageHeader';
import { EmptyState } from '../ui';
import { useLanguage } from '../../hooks/useLanguage';
import * as ds from '../../services/dataService';
import HitabilityCanvas from './HitabilityCanvas';
import HitBreakdownList from './HitBreakdownList';
import { COLORS, FONT, FONT_SIZE } from '../../utils/theme';

/**
 * HitabilityAnalyticsSection — § 112 STAGE 3. The layout-analytics "Trafialność"
 * surface: aggregates `hitabilityHits` CUMULATIVELY across ALL trainings for the
 * layout (one-shot whole-subcollection read — no trainingId filter, no composite,
 * no collectionGroup) + the `hitability/config` pairs. Reuses HitabilityCanvas
 * read-only with targets weighted by cumulative hit count + the connecting lines
 * ("which obstacle is easy to hit, and from where") + a pairs/counts list.
 * Anonymous (config-local ids).
 *
 * FUTURE: the "akwizycja killi" layout tab (absent today) seeds from this section.
 */
export default function HitabilityAnalyticsSection({ layoutId, layout }) {
  const { t } = useLanguage();
  const [config, setConfig] = useState(null);
  const [hits, setHits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!layoutId) return undefined;
    let alive = true;
    setLoading(true);
    Promise.all([ds.getHitabilityConfig(layoutId), ds.fetchHitabilityHits(layoutId)])
      .then(([cfg, hs]) => { if (!alive) return; setConfig(cfg || { players: [], targets: [], links: [] }); setHits(hs || []); setLoading(false); })
      .catch(() => { if (!alive) return; setConfig({ players: [], targets: [], links: [] }); setHits([]); setLoading(false); });
    return () => { alive = false; };
  }, [layoutId]);

  const hitsByTarget = useMemo(() => {
    const m = {};
    for (const h of hits) m[h.targetId] = (m[h.targetId] || 0) + 1;
    return m;
  }, [hits]);

  const pColor = (pid) => config?.players.find(p => p.id === pid)?.color;
  // STEP 2 alias-aware: a marker's optional `name` wins over its default label.
  const pLabel = (pid) => { const p = config?.players.find(x => x.id === pid); return p?.name || p?.label || '?'; };
  const tLabel = (tid) => { const x = config?.targets.find(y => y.id === tid); return x?.name || x?.label || '?'; };

  const hasData = !!(config && ((config.links || []).length || hits.length));

  return (
    <div style={{ minHeight: '100vh', maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <PageHeader back={{ to: `/layout/${layoutId}` }} title={t('hitability_card_title')} subtitle={layout?.name || 'Layout'} />
      <div style={{ flex: 1, padding: '8px 16px 80px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
        {loading && (
          <div style={{ padding: '40px 0', textAlign: 'center', fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textMuted }}>
            {t('hitability_analytics_loading')}
          </div>
        )}
        {!loading && !hasData && <EmptyState icon="🎯" text={t('hitability_analytics_empty')} />}
        {!loading && hasData && (
          <>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <HitabilityCanvas
                fieldImage={layout?.fieldImage}
                bunkers={layout?.bunkers || []}
                players={config.players || []}
                targets={config.targets || []}
                links={config.links || []}
                mode="sum"
                hitsByTarget={hitsByTarget}
                weightTargets
                maxHeight={380}
              />
            </div>
            <div>
              <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>
                {t('hitability_sum_pairs')}
              </div>
              <HitBreakdownList hits={hits} pColor={pColor} pLabel={pLabel} tLabel={tLabel} t={t} emptyText={t('hitability_sum_empty')} />
              <div style={{ fontFamily: FONT, fontSize: 12, color: COLORS.textDim, paddingTop: 6 }}>
                {t('hitability_sum_total_cumulative', hits.length)}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
