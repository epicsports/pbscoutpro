// src/utils/divisionAliases.js
//
// Resolve a schedule-export division string → the app's canonical division value
// for the SELECTED tournament's league. Used by ScheduleCSVImport (and a future
// OCR ScheduleImport retrofit).
//
// Two layers (see resolveScheduleDivision):
//   (a) SCHEDULE_DIVISION_ALIAS — explicit aliases for DECORATED export names
//       that don't equal the stored division (NXL's PBLeagues export emits
//       'Pro X-Ball™', stored as 'PRO'). theme.js DIVISIONS.NXL short codes.
//   (b) the league's OWN configured divisions (/leagues/{id} `divisions[]`) —
//       matched case/diacritic-insensitively by `name` or `id`, returning the
//       canonical configured `name`. This makes ANY league import without
//       hand-adding aliases, as long as the CSV division matches a configured
//       division name (e.g. CDF 'Premiere').
//
// Note on Semi-PRO casing: the brief 2026-05-13 listed 'Semi-PRO' (title
// case) for the alias target, but theme.js DIVISIONS.NXL canonical is
// 'SEMI-PRO' uppercase (preserved 2026-05-12 for backward compat with
// existing team docs). We resolve to the theme.js canonical to keep all
// stored division codes consistent across the app.

export const SCHEDULE_DIVISION_ALIAS = {
  // NXL (PBLeagues export) — decorated names → theme.js DIVISIONS.NXL codes.
  'Pro X-Ball™':            'PRO',
  'Semi-Pro X-Ball™':       'SEMI-PRO',
  'Division 2 X-Ball™':     'D2',
  'Division 3 X-Ball™':     'D3',
  'Division 4 X-Ball™':     'D4',
  'Pro 3v3':                'PRO3v3',
  'Female - WNXL X-Ball™':  'WNXL',
};

// Case- + diacritic-insensitive comparison key ('Première' ≡ 'premiere').
const divKey = (s) => String(s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase();

/**
 * Resolve a raw schedule-export division against (a) the decorated-export alias
 * map, then (b) the selected league's configured divisions. Returns the canonical
 * division value (alias target, or the league division's `name`), or null when
 * neither matches — caller aborts the import and surfaces the offending value.
 *
 * @param {string} raw              the CSV division cell
 * @param {Array}  leagueDivisions  the selected league's `divisions` [{id,name}]
 */
export function resolveScheduleDivision(raw, leagueDivisions = []) {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  // (a) explicit decorated-export aliases (NXL 'Pro X-Ball™' → 'PRO', …).
  if (SCHEDULE_DIVISION_ALIAS[trimmed]) return SCHEDULE_DIVISION_ALIAS[trimmed];
  // (b) the league's own configured divisions — match name OR id, insensitive.
  const key = divKey(trimmed);
  const hit = (leagueDivisions || []).find(d => divKey(d.name) === key || divKey(d.id) === key);
  return hit ? (hit.name || hit.id) : null;
}

/**
 * Back-compat shim — the original alias-only resolver (no league context).
 * Prefer resolveScheduleDivision(raw, leagueDivisions).
 */
export function normalizeScheduleDivision(raw) {
  return resolveScheduleDivision(raw, []);
}

// ─── Schedule date/time parser ─────────────────────────────────────────────
//
// PBLeagues schedule rows carry Dzien like "Thursday, 14th May" and Godzina
// like "12:00". Year is not present in the export. Callers (ScheduleCSVImport)
// pass `year` derived from selectedTournament.date so imports in any calendar
// year land on the correct date; falls back to current year when undefined.

const MONTH_TO_INDEX = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};

/**
 * Parse a schedule row's date + time into a JS Date — TOLERANT of multiple
 * formats and of a MISSING date. Returns null when no date can be derived (the
 * caller then treats the match as undated and orders it by sequence, NOT an
 * error). Supported date forms (day-first European, with a US MM/DD fallback):
 *
 *   'Thursday, 14th May'        → 14 May (year from caller)
 *   '2026-05-14' / ISO+time     → 14 May 2026
 *   '14/05/2026' '14.05.26' '14-05'   → 14 May (year: parsed or caller)
 *   'May 14, 2026'              → 14 May 2026
 *
 * Time comes from `godzina` ('HH:MM'), or from an 'HH:MM' inside the date cell.
 * No time → midnight. Year falls back to the caller's `year` (tournament year),
 * then the current calendar year.
 */
export function parseScheduleDateTime(dzien, godzina, year) {
  const resolvedYear = year != null ? year : new Date().getFullYear();
  const dateStr = String(dzien || '').trim();
  const timeStr = String(godzina || '').trim();

  // Time — from godzina, else any HH:MM embedded in the date cell.
  let hour = 0, minute = 0;
  const tm = timeStr.match(/(\d{1,2}):(\d{2})/) || dateStr.match(/(\d{1,2}):(\d{2})/);
  if (tm) {
    const h = parseInt(tm[1], 10), mi = parseInt(tm[2], 10);
    if (h >= 0 && h <= 23 && mi >= 0 && mi <= 59) { hour = h; minute = mi; }
  }

  if (!dateStr) return null; // no date → caller orders by sequence

  let y = resolvedYear, monthIdx = null, day = null;

  // (1) ISO — 2026-05-14 (4-digit year first).
  let m = dateStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) { y = +m[1]; monthIdx = +m[2] - 1; day = +m[3]; }

  // (2) Numeric DD/MM[/YYYY] with / . or - (day-first; MM/DD fallback when the
  //     second field can't be a month but the first can).
  if (monthIdx == null) {
    m = dateStr.match(/\b(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?\b/);
    if (m) {
      const a = +m[1], b = +m[2];
      if (b >= 1 && b <= 12) { day = a; monthIdx = b - 1; }
      else if (a >= 1 && a <= 12) { day = b; monthIdx = a - 1; }
      if (m[3]) y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    }
  }

  // (3) Month-name form — 'Thursday, 14th May' / 'May 14, 2026' (+ optional year).
  if (monthIdx == null) {
    const dayM = dateStr.match(/(\d{1,2})(?:st|nd|rd|th)?/i);
    const monM = dateStr.match(/(January|February|March|April|May|June|July|August|September|October|November|December)/i);
    if (dayM && monM) {
      day = parseInt(dayM[1], 10);
      monthIdx = MONTH_TO_INDEX[monM[1].toLowerCase()];
      const yM = dateStr.match(/\b(20\d{2})\b/);
      if (yM) y = +yM[1];
    }
  }

  if (monthIdx == null || monthIdx < 0 || monthIdx > 11) return null;
  if (!Number.isFinite(day) || day < 1 || day > 31) return null;
  if (!Number.isFinite(y)) y = resolvedYear;

  return new Date(y, monthIdx, day, hour, minute, 0, 0);
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

// ─── Tournament-stage helpers — match-list grouping (Brief follow-up) ──────
//
// Match docs carry `round` (raw CSV value) and `group` ('A', 'B', null).
// Per Jacek 2026-05-13 simplification — only TWO buckets for now:
//
//   0 — Eliminacje (preliminaries / group play)
//   1 — Sunday Club (everything else: ocho / quarter / semi / final, plus
//                    any unrecognized round value, plus matches missing
//                    the round field entirely)
//
// Per-stage separation for ocho / quarter / semi / final was tried and
// dropped — the bracket-day matches all live under one "Sunday Club"
// header for now. If finer separation is needed later, expand the rank
// map; consumers (groupMatchesByStage, stageLabel) extend naturally.

export function stageRank(raw) {
  if (!raw) return 1; // unspecified round → Sunday Club bucket
  const lower = String(raw).toLowerCase().trim();
  if (lower.includes('prelim') || lower.includes('elimin') || lower.includes('group play') || lower === 'gp') return 0;
  return 1;
}

const STAGE_LABEL_BY_RANK = {
  0: 'Eliminacje',
  1: 'Sunday Club',
};

export function stageLabel(raw) {
  return STAGE_LABEL_BY_RANK[stageRank(raw)];
}

// Returns:
//   [{ round, rank, totalCount, groups: [{ groupName, matches: [...] }] }]
// Stages ordered by stageRank ascending; ties broken by raw round string.
// Within each stage, groups sorted alphabetically (empty group last —
// renders without a Grupa sub-header). Within each group, matches sorted
// chronologically by scheduledAt (with legacy date+time fallback so
// pre-import matches sort too).
// Chronological sort key for a match (millis). Prefers `scheduledAt` (Timestamp /
// Date / ISO string), falls back to legacy `date`+`time` strings, and finally to
// the import `gameNumber` sequence for undated schedules (small ints sort before
// any real date millis). Exported so consumers (scout match list) can order
// Live/Scheduled/Completed sections by game time without re-deriving this.
export function matchTimeMillis(m) {
  if (m?.scheduledAt?.toMillis) return m.scheduledAt.toMillis();
  if (m?.scheduledAt instanceof Date) return m.scheduledAt.getTime();
  if (typeof m?.scheduledAt === 'string') {
    const t = new Date(m.scheduledAt).getTime();
    if (!Number.isNaN(t)) return t;
  }
  const legacy = `${m?.date || ''} ${m?.time || ''}`.trim();
  if (legacy) {
    const t = new Date(legacy).getTime();
    if (!Number.isNaN(t)) return t;
  }
  const seq = parseInt(m?.gameNumber, 10);
  return Number.isFinite(seq) ? seq : 0;
}

export function groupMatchesByStage(matches) {
  const byStage = new Map();
  (matches || []).forEach(m => {
    const rank = stageRank(m.round);
    // Bucket by rank only — all Sunday Club rounds (ocho / quarter / semi /
    // final + unrecognized) collapse into the rank-1 stage per Jacek
    // 2026-05-13 simplification. Earlier draft keyed by `${rank}__${round}`
    // which split Sunday Club into one section per raw round string.
    if (!byStage.has(rank)) {
      byStage.set(rank, { rank, byGroup: new Map(), total: 0 });
    }
    const stage = byStage.get(rank);
    const groupKey = m.group || '';
    if (!stage.byGroup.has(groupKey)) stage.byGroup.set(groupKey, []);
    stage.byGroup.get(groupKey).push(m);
    stage.total++;
  });

  const matchTime = matchTimeMillis;

  return [...byStage.values()]
    .sort((a, b) => a.rank - b.rank)
    .map(stage => ({
      rank: stage.rank,
      label: STAGE_LABEL_BY_RANK[stage.rank] || 'Sunday Club',
      totalCount: stage.total,
      groups: [...stage.byGroup.entries()]
        .sort(([a], [b]) => {
          // Empty group key sorts last so the prelims-with-no-Grupa
          // bucket appears beneath labeled groups.
          if (a === '' && b !== '') return 1;
          if (a !== '' && b === '') return -1;
          return a.localeCompare(b);
        })
        .map(([groupName, matches]) => ({
          groupName,
          matches: matches.slice().sort((x, y) => matchTime(x) - matchTime(y)),
        })),
    }));
}
