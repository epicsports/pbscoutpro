import React from 'react';
import { COLORS, FONT } from '../utils/theme';
import { useWorkspace } from '../hooks/useWorkspace';
import PixelAvatar from './avatars';

/**
 * PlayerAvatar — circular avatar with fallback chain.
 *
 * Display priority (workspace.piiSettings.avatarMode === 'photo', the default):
 *   1. player.photoURL (uploaded photo)
 *   2. nickname/name initial (single letter, colored bg)
 *
 * When avatarMode === 'avatar' (Privacy/PII), the photoURL is IGNORED and a
 * deterministic pixel-art portrait renders instead — no player photos are
 * shown anywhere this component is used. The portrait is seeded from the
 * player's nickname/name/id (stable per player) unless the player has a saved
 * `avatarSpec` (custom builder output — wired in Stage C).
 *
 * For scouting UI where space is tight, the parent typically renders
 * #number alongside; this component is purely the visual chip.
 *
 * @param player - { id, nickname?, name?, number?, photoURL? }
 * @param size - px (default 32)
 */
// Defensive read: useWorkspace() throws outside a WorkspaceProvider (e.g. in
// isolated stories/tests). Fall back to the photo default rather than crash.
function useAvatarMode() {
  try {
    const { workspace } = useWorkspace();
    return workspace?.piiSettings?.avatarMode || 'photo';
  } catch {
    return 'photo';
  }
}

export default function PlayerAvatar({ player, size = 32, ringColor }) {
  const avatarMode = useAvatarMode();

  // 'avatar' mode → deterministic pixel-art portrait (photo suppressed for PII).
  // Seed is the stable fallback; per-player `avatarSpec` (builder output) overrides
  // it when present (Stage C). teamColor + ring follow the caller's ringColor.
  if (avatarMode === 'avatar') {
    return (
      <PixelAvatar
        seed={player?.nickname || player?.name || player?.id || '?'}
        spec={player?.avatarSpec || undefined}
        teamColor={ringColor || COLORS.accent}
        size={size}
        ring={ringColor}
      />
    );
  }

  // 'photo' mode (default): uploaded photo → colored-initial fallback.
  const photoURL = player?.photoURL;
  const initial = (player?.nickname || player?.name || '?').charAt(0).toUpperCase();

  // Stable color per player from id hash (so the same player always gets the
  // same fallback color — visual continuity even without a photo).
  const colorIdx = hashCode(player?.id || initial) % FALLBACK_COLORS.length;
  const bg = FALLBACK_COLORS[Math.abs(colorIdx)];

  const styleBase = {
    width: size, height: size, borderRadius: '50%',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, overflow: 'hidden',
    border: ringColor ? `2px solid ${ringColor}` : `1px solid ${COLORS.border}`,
    background: bg,
  };

  if (photoURL) {
    return (
      <span style={styleBase}>
        <img src={photoURL} alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </span>
    );
  }

  return (
    <span style={{ ...styleBase, color: '#fff', fontFamily: FONT, fontWeight: 800, fontSize: Math.round(size * 0.42) }}>
      {initial}
    </span>
  );
}

const FALLBACK_COLORS = [
  '#1e40af', '#7c3aed', '#be185d', '#b45309',
  '#15803d', '#0f766e', '#9f1239', '#5b21b6',
  '#1d4ed8', '#a16207', '#166534', '#a21caf',
];

function hashCode(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return h;
}
