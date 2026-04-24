/**
 * PPT active-training stickiness — localStorage helper.
 *
 * Per-day sticky selection so a player who picks "Trening X" once at session
 * start lands directly in the wizard for every subsequent point that day,
 * skipping the "Wybierz trening" picker. Cleared automatically at the day
 * boundary or by an explicit "Zmień trening" action.
 *
 * Stored shape:
 *   { trainingId: string, selectedAt: number, date: 'YYYY-MM-DD' }
 *
 * Why date instead of TTL: training sessions span hours but are scoped to a
 * calendar day. A pure ms TTL ("expires 8h after pick") either leaks across
 * midnight (wrong) or expires mid-session (wrong). Date stamp is the natural
 * boundary.
 */

const KEY = 'ppt_active_training';

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Read the active training selection if it's still valid for today.
 * Returns `null` if missing, malformed, or stale (different date) — and
 * proactively clears stale entries so callers don't see them again.
 */
export function getActiveTraining() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.trainingId || !data?.date) return null;
    if (data.date !== todayISO()) {
      localStorage.removeItem(KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function setActiveTraining(trainingId) {
  if (!trainingId) return;
  try {
    localStorage.setItem(KEY, JSON.stringify({
      trainingId,
      selectedAt: Date.now(),
      date: todayISO(),
    }));
  } catch { /* quota / private mode — non-fatal, picker just keeps showing */ }
}

export function clearActiveTraining() {
  try { localStorage.removeItem(KEY); } catch { /* non-fatal */ }
}
