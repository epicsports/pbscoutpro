import { useWorkspace } from '../hooks/useWorkspace';

/**
 * Privacy/PII Phase 2 — surname truncation.
 *
 * displayPlayerName(player, mode) returns the name string to SHOW the user.
 * It must only be used at DISPLAY sites — never on edit-input bindings, sort
 * keys, dedup keys, search filters, or insight-text generation (those operate
 * on the real, untruncated value).
 *
 * Modes (per-workspace, super-admin-set via workspaces/{slug}.piiSettings.surnameMode):
 *   'full'  (default / absent → backward-compatible) — current behaviour.
 *   'short' — truncate a displayed REAL full name's surname to 3 letters + ".".
 *             A nickname (pseudonym, not PII) is shown UNCHANGED. A single-token
 *             real name is shown UNCHANGED (nothing to truncate without leaking).
 *
 * "Jan Kowalski" → "Jan Kow."   (full first name + last-token sliced to 3 + ".")
 * "Jan"          → "Jan"        (single token — unchanged)
 * nickname "JK"  → "JK"         (pseudonym — unchanged)
 */
export function displayPlayerName(player, mode = 'full') {
  const base = player?.nickname || player?.name || '?';
  if (mode !== 'short') return base;

  // Nickname present → it's a pseudonym, not a surname. Show as-is (no PII leak).
  if (player?.nickname) return player.nickname;

  const name = player?.name;
  if (!name) return base;

  const tokens = String(name).trim().split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return name; // single token — nothing to truncate

  const first = tokens[0];
  const last = tokens[tokens.length - 1];
  return `${first} ${last.slice(0, 3)}.`;
}

/**
 * useDisplayName() — thin hook returning a name-formatter bound to the active
 * workspace's surnameMode. Defensive default 'full' if there is no workspace
 * (e.g. isolated stories/tests where useWorkspace throws).
 *
 *   const dn = useDisplayName();
 *   …{dn(player)}…
 */
export function useDisplayName() {
  let mode = 'full';
  try {
    const { workspace } = useWorkspace();
    mode = workspace?.piiSettings?.surnameMode || 'full';
  } catch {
    mode = 'full';
  }
  return (player) => displayPlayerName(player, mode);
}
