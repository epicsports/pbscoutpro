import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AvatarBuilder, DEFAULT_SPEC } from '../components/avatars';
import { useWorkspace } from '../hooks/useWorkspace';
import { useActiveTeams } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { COLORS } from '../utils/theme';

/**
 * AvatarBuilderPage — mounts the pixel-art AvatarBuilder for the logged-in
 * user (Stage C).
 *
 * - initialSpec  ← userProfile.avatarSpec (the live /users/{uid} snapshot via
 *   useWorkspace) or DEFAULT_SPEC when the user hasn't built one yet.
 * - teamColor    ← the linked player's team color (Crest convention: team.color)
 *   so the "team" garment/headwear swatch previews the user's real team color;
 *   falls back to COLORS.accent when not linked / no team color.
 * - onSave       ← persists to /users/{uid}.avatarSpec then returns to /profile.
 *
 * The spec lives on the USER profile (self-edit). Players in rosters still
 * render deterministically from a seed (PlayerAvatar); this is the user's own
 * customization, surfaced on ProfilePage.
 */
export default function AvatarBuilderPage() {
  const navigate = useNavigate();
  const { user, userProfile, linkedPlayer } = useWorkspace();
  const { teams } = useActiveTeams();
  const uid = user?.uid;

  const linkedTeam = linkedPlayer?.teamId
    ? (teams || []).find(tm => tm.id === linkedPlayer.teamId)
    : null;
  const teamColor = linkedTeam?.color || COLORS.accent;

  return (
    <div style={{ position: 'fixed', inset: 0, background: COLORS.bg, zIndex: 100 }}>
      <AvatarBuilder
        initialSpec={userProfile?.avatarSpec || DEFAULT_SPEC}
        teamColor={teamColor}
        onBack={() => navigate('/profile')}
        onSave={async (spec) => {
          if (uid) await ds.setUserAvatarSpec(uid, spec);
          navigate('/profile');
        }}
      />
    </div>
  );
}
