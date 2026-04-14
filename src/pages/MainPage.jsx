import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import ScoutTabContent from '../components/tabs/ScoutTabContent';
import { Btn } from '../components/ui';
import { useTournaments, useMatches, useScoutedTeams } from '../hooks/useFirestore';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE } from '../utils/theme';

/**
 * MainPage — root of the bottom-tab nav (DESIGN_DECISIONS § 31).
 *
 * Owns:
 *  - active tab (persisted)
 *  - active tournament id (persisted)
 *  - tournament picker open/close
 * Delegates rendering to AppShell + tab content components.
 *
 * Tab content components are wired in Parts 3-5. For Part 2 we render
 * a minimal placeholder so the shell is testable end-to-end.
 */
const TAB_KEY = 'pbscoutpro_activeTab';
const TOURN_KEY = 'pbscoutpro_activeTournament';

export default function MainPage({ onLogout, workspaceName }) {
  const navigate = useNavigate();
  const { tournaments } = useTournaments();

  const [activeTab, setActiveTab] = useState(() => {
    try { return localStorage.getItem(TAB_KEY) || 'scout'; }
    catch { return 'scout'; }
  });
  const [tournamentId, setTournamentId] = useState(() => {
    try { return localStorage.getItem(TOURN_KEY) || null; }
    catch { return null; }
  });
  const [pickerOpen, setPickerOpen] = useState(false);

  const tournament = useMemo(
    () => tournaments.find(t => t.id === tournamentId) || null,
    [tournaments, tournamentId],
  );

  // If saved id no longer exists (deleted on another device), drop it.
  useEffect(() => {
    if (tournamentId && tournaments.length && !tournament) {
      setTournamentId(null);
      try { localStorage.removeItem(TOURN_KEY); } catch {}
    }
  }, [tournamentId, tournament, tournaments.length]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    try { localStorage.setItem(TAB_KEY, tab); } catch {}
  };

  const handleSelectTournament = (id) => {
    setTournamentId(id);
    try {
      if (id) localStorage.setItem(TOURN_KEY, id);
      else localStorage.removeItem(TOURN_KEY);
    } catch {}
    setPickerOpen(false);
  };

  // Subtitle for context bar: league + match count (loaded lazily).
  const { matches } = useMatches(tournamentId);
  const { scouted } = useScoutedTeams(tournamentId);
  const subtitle = tournament
    ? [
        tournament.league || (tournament.type === 'practice' ? 'Practice' : null),
        matches?.length ? `${matches.length} matches` : null,
        scouted?.length ? `${scouted.length} teams` : null,
      ].filter(Boolean).join(' · ')
    : '';

  return (
    <AppShell
      activeTab={activeTab}
      onTabChange={handleTabChange}
      tournament={tournament}
      tournamentSubtitle={subtitle}
      onChangeTournament={() => setPickerOpen(true)}
    >
      {tournament ? (
        activeTab === 'scout' ? (
          <ScoutTabContent tournamentId={tournamentId} />
        ) : (
          <TabPlaceholder tab={activeTab} tournamentId={tournamentId} />
        )
      ) : (
        <NoTournamentEmptyState onChoose={() => setPickerOpen(true)} />
      )}

      {/* Picker (Part 6 will replace this with TournamentPicker) */}
      {pickerOpen && (
        <PlaceholderPicker
          tournaments={tournaments}
          activeId={tournamentId}
          onSelect={handleSelectTournament}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </AppShell>
  );
}

function NoTournamentEmptyState({ onChoose }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '64px 24px',
      gap: SPACE.lg,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 48 }}>🏆</div>
      <div style={{
        fontFamily: FONT,
        fontSize: FONT_SIZE.md,
        fontWeight: 500,
        color: COLORS.textDim,
        maxWidth: 280,
        lineHeight: 1.4,
      }}>
        Select a tournament or training to start scouting
      </div>
      <Btn variant="accent" onClick={onChoose}
        style={{ minHeight: 48, fontSize: FONT_SIZE.md, fontWeight: 700, padding: '0 24px' }}>
        Choose tournament
      </Btn>
    </div>
  );
}

function TabPlaceholder({ tab, tournamentId }) {
  return (
    <div style={{
      padding: 24,
      fontFamily: FONT,
      fontSize: FONT_SIZE.sm,
      color: COLORS.textMuted,
    }}>
      <div style={{ marginBottom: 8, fontWeight: 700, color: COLORS.text }}>
        {tab.toUpperCase()} tab
      </div>
      <div>Tournament: {tournamentId}</div>
      <div style={{ marginTop: 12, fontStyle: 'italic' }}>
        (Tab content extracted in Parts 3-5.)
      </div>
    </div>
  );
}

function PlaceholderPicker({ tournaments, activeId, onSelect, onClose }) {
  return (
    <div onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}>
      <div onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 540,
          background: COLORS.surface,
          borderTop: `1px solid ${COLORS.border}`,
          borderRadius: `${RADIUS.xl}px ${RADIUS.xl}px 0 0`,
          padding: SPACE.lg,
          maxHeight: '70dvh',
          overflowY: 'auto',
          paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
        }}>
        <div style={{
          fontFamily: FONT,
          fontSize: FONT_SIZE.xs,
          fontWeight: 600,
          textTransform: 'uppercase',
          color: COLORS.textDim,
          letterSpacing: '.5px',
          marginBottom: SPACE.md,
        }}>
          Select tournament
        </div>
        {tournaments.map(t => (
          <div key={t.id}
            onClick={() => onSelect(t.id)}
            style={{
              padding: '14px 16px',
              borderRadius: RADIUS.lg,
              background: t.id === activeId ? `${COLORS.accent}15` : COLORS.surfaceDark,
              border: `1px solid ${t.id === activeId ? `${COLORS.accent}40` : COLORS.border}`,
              marginBottom: 6,
              cursor: 'pointer',
              fontFamily: FONT,
              fontSize: FONT_SIZE.sm,
              fontWeight: 600,
              color: COLORS.text,
            }}>
            {t.name}
          </div>
        ))}
        {tournaments.length === 0 && (
          <div style={{
            fontFamily: FONT, fontSize: FONT_SIZE.sm,
            color: COLORS.textMuted, textAlign: 'center', padding: 20,
          }}>
            No tournaments yet
          </div>
        )}
      </div>
    </div>
  );
}
