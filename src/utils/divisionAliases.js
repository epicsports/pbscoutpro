// src/utils/divisionAliases.js
//
// PBLeagues schedule-export division names → app canonical short codes.
// Used by ScheduleCSVImport (and potentially OCR ScheduleImport in a future
// retrofit). The canonical short codes match DIVISIONS.NXL in theme.js so
// downstream UI (team picker, division filter, MatchCard) recognizes them.
//
// Note on Semi-PRO casing: the brief 2026-05-13 listed 'Semi-PRO' (title
// case) for the alias target, but theme.js DIVISIONS.NXL canonical is
// 'SEMI-PRO' uppercase (preserved 2026-05-12 for backward compat with
// existing team docs). We resolve to the theme.js canonical to keep all
// stored division codes consistent across the app.

export const SCHEDULE_DIVISION_ALIAS = {
  'Pro X-Ball™':            'PRO',
  'Semi-Pro X-Ball™':       'SEMI-PRO',
  'Division 2 X-Ball™':     'D2',
  'Division 3 X-Ball™':     'D3',
  'Division 4 X-Ball™':     'D4',
  'Pro 3v3':                'PRO3v3',
  'Female - WNXL X-Ball™':  'WNXL',
};

/**
 * Map a raw PBLeagues division string to the canonical short code.
 * Returns null for unknown values — caller should abort the import and
 * surface the offending raw value to the user per brief.
 *
 * Trim whitespace before lookup (PBLeagues exports occasionally have
 * trailing spaces). Match is case-sensitive to fail loudly on typos.
 */
export function normalizeScheduleDivision(raw) {
  if (!raw) return null;
  const trimmed = raw.trim();
  return SCHEDULE_DIVISION_ALIAS[trimmed] || null;
}

// ─── Schedule date/time parser ─────────────────────────────────────────────
//
// PBLeagues schedule rows carry Dzien like "Thursday, 14th May" and Godzina
// like "12:00". Year is not present in the export — hardcoded 2026 per
// brief 2026-05-13. TODO: derive year from the selected tournament's date
// once tournament context is available at parse time.

const MONTH_TO_INDEX = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};

/**
 * Parse a PBLeagues schedule row's Dzien + Godzina into a JS Date.
 * Returns null if either field is missing or unparseable so the caller
 * can surface the bad row to the user instead of writing a garbage
 * Timestamp.
 *
 *   parseScheduleDateTime('Thursday, 14th May', '12:00') → Date(2026, 4, 14, 12, 0)
 */
export function parseScheduleDateTime(dzien, godzina, year = 2026) {
  if (!dzien || !godzina) return null;
  const dayMatch = String(dzien).match(/(\d{1,2})(?:st|nd|rd|th)?/i);
  const monthMatch = String(dzien).match(/(January|February|March|April|May|June|July|August|September|October|November|December)/i);
  if (!dayMatch || !monthMatch) return null;
  const day = parseInt(dayMatch[1], 10);
  const monthIdx = MONTH_TO_INDEX[monthMatch[1].toLowerCase()];
  if (monthIdx == null || !Number.isFinite(day) || day < 1 || day > 31) return null;

  const [hStr, mStr = '0'] = String(godzina).trim().split(':');
  const hour = parseInt(hStr, 10);
  const minute = parseInt(mStr, 10);
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) return null;
  if (!Number.isFinite(minute) || minute < 0 || minute > 59) return null;

  return new Date(year, monthIdx, day, hour, minute, 0, 0);
}

// ─── Day-of-week short labels for MatchCard pill (Stage 3) ─────────────────
//
// Brief 2026-05-13: "Day localized PL: Pon/Wt/Śr/Czw/Pt/Sob/Niedz". Index
// matches JS Date.getDay() (0 = Sunday … 6 = Saturday). EN fallback for
// the few EN i18n surfaces in the app.

const DAY_SHORT_PL = ['Niedz', 'Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob'];
const DAY_SHORT_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function dayShort(date, lang = 'pl') {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return (lang === 'en' ? DAY_SHORT_EN : DAY_SHORT_PL)[d.getDay()];
}
