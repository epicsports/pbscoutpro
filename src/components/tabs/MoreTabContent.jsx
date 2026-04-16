import { useNavigate } from 'react-router-dom';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE } from '../../utils/theme';

/**
 * MoreTabContent — grouped utility list (DESIGN_DECISIONS § 31).
 *
 * Sections: Tournament / Setup / Workspace.
 * Pure presentational — all state lives in MainPage.
 */
export default function MoreTabContent({
  tournamentId,
  tournament,
  workspaceName,
  onEditTournament,
  onCloseTournament,
  onReopenTournament,
  onDeleteTournament,
  onNewTournament,
  onToggleLive,
  onLogout,
  onSignOut,
}) {
  const navigate = useNavigate();
  const hasTournament = !!tournamentId;
  const isLive = tournament?.status === 'live';
  const isClosed = tournament?.status === 'closed';

  return (
    <div style={{
      padding: SPACE.lg,
      paddingBottom: 24,
      display: 'flex',
      flexDirection: 'column',
      gap: SPACE.lg,
    }}>
      {hasTournament && (
        <Section title="Tournament">
          <MoreItem icon="⚙" label="Tournament settings" onClick={onEditTournament} />
          {onToggleLive && !isClosed && (
            <MoreItem
              icon={isLive ? '●' : '○'}
              label={isLive ? 'LIVE — tap to deactivate' : 'Set LIVE'}
              accent={isLive}
              onClick={onToggleLive}
            />
          )}
          {!isClosed && (
            <MoreItem icon="🔒" label="Close tournament" onClick={onCloseTournament} />
          )}
          {isClosed && (
            <MoreItem icon="🔓" label="Reopen tournament" onClick={onReopenTournament} />
          )}
          <MoreItem icon="🗑" label="Delete tournament" danger onClick={onDeleteTournament} isLast />
        </Section>
      )}

      <Section title="Create">
        <MoreItem icon="🏆" label="New tournament" onClick={() => onNewTournament?.('tournament')} />
        <MoreItem icon="🏋️" label="New training" onClick={() => onNewTournament?.('training')} isLast />
      </Section>

      <Section title="Setup">
        <MoreItem icon="🗺" label="Layouts" onClick={() => navigate('/layouts')} />
        <MoreItem icon="🏢" label="Teams" onClick={() => navigate('/teams')} />
        <MoreItem icon="🎽" label="Players" onClick={() => navigate('/players')} isLast />
      </Section>

      <Section title="Scouts">
        <MoreItem icon="👤" label="Scout ranking" onClick={() => navigate('/scouts')} />
        <MoreItem icon="📋" label="My scouting TODO" onClick={() => navigate('/my-issues')} isLast />
      </Section>

      <Section title="Konto">
        <MoreItem icon="👤" label="Mój profil" onClick={() => navigate('/profile')} />
        {onSignOut && (
          <MoreItem icon="🚪" label="Wyloguj się" danger onClick={onSignOut} isLast />
        )}
      </Section>

      <Section title="Workspace">
        {workspaceName && (
          <div style={{
            padding: '10px 14px',
            fontFamily: FONT,
            fontSize: FONT_SIZE.xs,
            color: COLORS.textMuted,
          }}>
            Signed in as <span style={{ color: COLORS.text, fontWeight: 600 }}>{workspaceName}</span>
          </div>
        )}
        {onLogout && (
          <MoreItem icon="↩" label="Leave workspace" onClick={onLogout} isLast />
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <div style={{
        fontFamily: FONT,
        fontFamily: FONT, fontSize: 11,
        fontWeight: 600,
        color: COLORS.textMuted,
        textTransform: 'uppercase',
        letterSpacing: '.5px',
        padding: '0 4px 8px',
      }}>
        {title}
      </div>
      <div style={{
        background: COLORS.surfaceDark,
        border: `1px solid ${COLORS.border}`,
        borderRadius: RADIUS.lg,
        overflow: 'hidden',
      }}>
        {children}
      </div>
    </div>
  );
}

function MoreItem({ icon, label, onClick, danger, accent, isLast }) {
  const color = danger ? COLORS.danger : accent ? COLORS.danger : COLORS.text;
  return (
    <div onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 16px',
        cursor: 'pointer',
        minHeight: 52,
        borderBottom: isLast ? 'none' : `1px solid ${COLORS.border}`,
        WebkitTapHighlightColor: 'transparent',
      }}>
      <span style={{ fontSize: 18, width: 22, textAlign: 'center', opacity: 0.8, color }}>{icon}</span>
      <span style={{
        flex: 1,
        fontFamily: FONT,
        fontSize: FONT_SIZE.md,
        fontWeight: accent ? 700 : 500,
        color,
      }}>
        {label}
      </span>
      <span style={{
        fontFamily: FONT, fontSize: 14,
        color: COLORS.borderLight,
      }}>›</span>
    </div>
  );
}
