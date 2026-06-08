import React, { useState, useEffect, useMemo } from 'react';
import PageHeader from '../PageHeader';
import { EmptyState } from '../ui';
import { useLanguage } from '../../hooks/useLanguage';
import * as ds from '../../services/dataService';
import HitabilityCanvas from './HitabilityCanvas';
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

  const pairs = useMemo(() => {
    if (!config) return [];
    return (config.links || [])
      .map(l => ({ p: l.playerId, t: l.targetId, count: hits.filter(h => h.playerId === l.playerId && h.targetId === l.targetId).length }))
      .sort((a, b) => b.count - a.count);
  }, [config, hits]);

  const pColor = (pid) => config?.players.find(p => p.id === pid)?.color;
  const pLabel = (pid) => config?.players.find(p => p.id === pid)?.label || '?';
  const tLabel = (tid) => config?.targets.find(x => x.id === tid)?.label || '?';

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
              {pairs.length === 0 && (
                <div style={{ fontFamily: FONT, fontSize: 13, color: COLORS.textMuted, fontStyle: 'italic' }}>{t('hitability_sum_empty')}</div>
              )}
              {pairs.map((pr, i) => (
                <div key={`${pr.p}_${pr.t}_${i}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', marginBottom: 6, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>
                  <span style={{ width: 11, height: 11, borderRadius: '50%', background: pColor(pr.p), flexShrink: 0 }} />
                  <span style={{ flex: 1, fontFamily: FONT, fontSize: 14, color: COLORS.text, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t('hitability_player_n', pLabel(pr.p))} → {t('hitability_target_n', tLabel(pr.t))}
                  </span>
                  <span style={{ fontFamily: FONT, fontSize: 15, fontWeight: 800, color: COLORS.accent, flexShrink: 0 }}>{pr.count}</span>
                </div>
              ))}
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
