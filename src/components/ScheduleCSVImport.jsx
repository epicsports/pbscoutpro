import React, { useState, useMemo, useRef } from 'react';
import { Btn, Icons, Modal, Select } from './ui';
import { COLORS, FONT, FONT_SIZE, RADIUS, TOUCH } from '../utils/theme';
import { playerOnTeam } from '../utils/playerTeams';
import { resolveScheduleDivision, parseScheduleDateTime } from '../utils/divisionAliases';
import { useAllLeagues } from '../hooks/useLeagues';

/**
 * ScheduleCSVImport — alternative input to the tournament schedule pipeline.
 * Companion to ScheduleImport.jsx (OCR/image-based) — same downstream model
 * (teams + scouted entries + match docs) but takes a PBLeagues CSV export
 * instead of a Vision-OCR'd photo.
 *
 * Brief 2026-05-13 — separate component (not a mode toggle on ScheduleImport)
 * to keep the OCR + CSV branches uncoupled. CSV adds tournament picker,
 * division-alias normalization, additive match fields (scheduledAt / field /
 * round / group), and a structured unresolved-team resolver.
 *
 * Pipeline:
 *   1. Upload — tournament picker (any league) + file picker
 *   2. Parse — BOM strip, ; / , auto-detect, quote-aware row split,
 *              division alias normalize, datetime parse
 *   3. Resolve — for each unique (name, division) tuple that didn't
 *                auto-match against the tournament's scouted teams,
 *                user picks: match / create / skip
 *   4. Import — write match docs with scheduledAt / field / round / group
 */

// Column-header detection map. Order in MAPPABLE-style structure not needed
// because schedule CSV has a known, fixed shape (8 columns from PBLeagues).
// PBLeagues actually uses parenthetical descriptions like
// 'Druzyna_Home (Red)' — accept both with and without the suffix.
const COLUMN_DETECT = {
  dzien:   ['dzien', 'dzień', 'day', 'date'],
  godzina: ['godzina', 'time', 'hour'],
  boisko:  ['boisko', 'field', 'court'],
  dywizja: ['dywizja', 'division', 'div'],
  runda:   ['runda', 'round'],
  grupa:   ['grupa', 'group'],
  home:    ['druzyna_home', 'druzyna_home_(red)', 'druzyna_home (red)', 'home', 'team_home', 'red', 'home_team'],
  away:    ['druzyna_away', 'druzyna_away_(blue)', 'druzyna_away (blue)', 'away', 'team_away', 'blue', 'away_team'],
};

function normalizeHeader(h) {
  return String(h || '').toLowerCase().trim()
    .replace(/ /g, ' ')          // nbsp → space
    .replace(/[\r\n]+/g, ' ')         // line endings inside header
    .replace(/\s+/g, ' ');
}

function detectColumns(headers) {
  const m = {};
  for (const [key, patterns] of Object.entries(COLUMN_DETECT)) {
    const idx = headers.findIndex(h => {
      const norm = normalizeHeader(h);
      const noSpaces = norm.replace(/\s+/g, '_');
      return patterns.some(p => norm === p || noSpaces === p);
    });
    if (idx >= 0) m[key] = idx;
  }
  return m;
}

// Quote-aware row split — copied pattern from CSVImport.jsx (proven).
function parseRowCells(line, sep) {
  const cols = []; let cur = '', inQ = false;
  for (const c of line) {
    if (c === '"') { inQ = !inQ; continue; }
    if (c === sep && !inQ) { cols.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  cols.push(cur.trim());
  return cols;
}

// Compound key for unique (name, division) team identity.
function teamKey(name, division) {
  return `${(name || '').trim().toLowerCase()}|${(division || '').trim()}`;
}

// Auto-match a CSV team against scouted teams in the selected tournament.
// Returns the scoutedId (if matched) or null. Match is (team.name === csv.name)
// AND (team.divisions[league] === csv.division) — both must agree.
function findScoutedMatch(name, division, scouted, teams, league) {
  if (!name) return null;
  const targetName = name.trim().toLowerCase();
  for (const s of scouted) {
    const t = teams.find(tt => tt.id === s.teamId);
    if (!t) continue;
    if (t.name.trim().toLowerCase() !== targetName) continue;
    const tDiv = (t.divisions || {})[league] || null;
    if (tDiv !== division) continue;
    return s.id;
  }
  return null;
}

// Workspace-wide auto-match — used after findScoutedMatch fails so a team
// that exists in the workspace (e.g. from yesterday's player CSV import) but
// isn't yet attached to this tournament gets picked up automatically instead
// of waiting in the resolver. Returns an array (not a single team) so the
// caller can detect ambiguity: 0 hits → resolver; 1 hit → auto-attach during
// import; 2+ hits → resolver (user picks the right one). Match identical to
// findScoutedMatch: case-insensitive name + exact division.
function findWorkspaceMatches(name, division, teams, league) {
  if (!name) return [];
  const targetName = name.trim().toLowerCase();
  return (teams || []).filter(t => {
    if (!t || t.name.trim().toLowerCase() !== targetName) return false;
    const tDiv = (t.divisions || {})[league] || null;
    return tDiv === division;
  });
}

// Workspace-wide team match for the resolver dropdown — filtered to teams
// already carrying the matching division (so resolver doesn't offer
// wrong-division picks).
function workspaceTeamsForDivision(division, teams, league) {
  return (teams || []).filter(t => ((t.divisions || {})[league] || null) === division);
}

export default function ScheduleCSVImport({ open, onClose, tournaments, teams, scouted, players, ds }) {
  const [step, setStep] = useState('upload'); // upload | resolve | importing | done
  const [tournamentId, setTournamentId] = useState('');
  const [parseError, setParseError] = useState('');
  const [parsedRows, setParsedRows] = useState([]); // each: { raw fields + _division, _scheduledAt, _homeKey, _awayKey }
  const [unresolved, setUnresolved] = useState({}); // teamKey → { name, division, action: 'match'|'create'|'skip', mapping: scoutedId|teamId }
  const [autoMatched, setAutoMatched] = useState({}); // teamKey → scoutedId (no user action needed)
  // Workspace teams matched by (name, division) but NOT yet attached to the
  // tournament. handleImport creates the scouted entries before writing
  // match docs. Same shape as autoMatched (key → teamId) but lifted to a
  // separate map so the resolver UI can show the pending-attach count.
  const [autoMatchedWorkspace, setAutoMatchedWorkspace] = useState({}); // teamKey → teamId
  const [importLog, setImportLog] = useState([]);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef(null);

  const reset = () => {
    setStep('upload'); setTournamentId(''); setParseError('');
    setParsedRows([]); setUnresolved({}); setAutoMatched({}); setAutoMatchedWorkspace({});
    setImportLog([]); setImporting(false);
  };

  // Tournament picker — any tournament with a league assigned. Team divisions
  // are keyed by the SELECTED tournament's league (§ 71).
  const leagueTournaments = useMemo(
    () => (tournaments || []).filter(t => !!t.league),
    [tournaments]
  );

  const selectedTournament = useMemo(
    () => leagueTournaments.find(t => t.id === tournamentId) || null,
    [leagueTournaments, tournamentId]
  );
  // The selected tournament's league shortName — the divisions-map key used
  // throughout matching + import. null until a tournament is picked.
  const league = selectedTournament?.league || null;
  // The selected league's CONFIGURED divisions (/leagues/{id}). Division
  // resolution matches the CSV value against these (any league works without
  // hand-adding aliases) — see resolveScheduleDivision.
  const allLeagues = useAllLeagues();
  const leagueDivisions = useMemo(
    () => (allLeagues.find(L => L.shortName === league)?.divisions) || [],
    [allLeagues, league],
  );

  // Tournament-scoped data for auto-match + resolve.
  const tournamentScouted = useMemo(
    () => (scouted || []).filter(s => s.tournamentId === tournamentId || s._tid === tournamentId)
      // scouted hook may not embed tournamentId — caller usually filters.
      // If empty, fall back to the full scouted list (the parent likely already filters).
      ,
    [scouted, tournamentId]
  );
  // Defensive: if hook doesn't embed tournamentId, accept the prop's full list.
  const scopedScouted = tournamentScouted.length > 0 ? tournamentScouted : (scouted || []);

  // ── File handler ────────────────────────────────────────────────────────
  const handleFile = (e) => {
    setParseError('');
    const file = e.target.files?.[0];
    if (!file) return;
    if (!tournamentId) {
      setParseError('Najpierw wybierz turniej.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      let text = ev.target.result;
      if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
      // Mixed line endings tolerated per brief.
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) { setParseError('Plik pusty lub bez nagłówka.'); return; }

      const sep = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ';' : ',';
      const headers = parseRowCells(lines[0], sep);
      const colMap = detectColumns(headers);

      // Required columns
      const missing = ['dzien', 'godzina', 'dywizja', 'home', 'away'].filter(k => colMap[k] == null);
      if (missing.length) {
        setParseError(`Brak wymaganych kolumn: ${missing.join(', ')}. Wykryto nagłówki: ${headers.join(' | ')}`);
        return;
      }

      const cell = (row, key) => {
        const idx = colMap[key];
        if (idx == null) return '';
        return (row[idx] || '').trim();
      };

      // First pass — parse + validate every row. STOP on the first unknown
      // division per brief ("If file contains a division value NOT in this
      // list, STOP import + show error to user with the offending value.").
      const out = [];
      for (let i = 0; i < lines.length - 1; i++) {
        const row = parseRowCells(lines[i + 1], sep);
        if (row.every(c => !c)) continue;
        const dzien = cell(row, 'dzien');
        const godzina = cell(row, 'godzina');
        const boisko = cell(row, 'boisko');
        const dywizja = cell(row, 'dywizja');
        const runda = cell(row, 'runda');
        const grupa = cell(row, 'grupa');
        const home = cell(row, 'home');
        const away = cell(row, 'away');
        if (!home && !away) continue; // blank row

        const normDiv = resolveScheduleDivision(dywizja, leagueDivisions);
        if (!normDiv) {
          const valid = leagueDivisions.map(d => d.name).filter(Boolean).join(', ') || '—';
          setParseError(`Nieznana dywizja w wierszu ${i + 2}: "${dywizja}". Dozwolone dla ligi ${league || '?'}: ${valid}. Popraw plik lub dodaj tę dywizję do ligi.`);
          return;
        }
        // Inherit year from the selected tournament so post-deploy
        // imports in any year land on the correct calendar. Falls back
        // to current calendar year if tournament.year is missing (legacy
        // tournament docs without that field).
        const tournamentYear = (leagueTournaments.find(t => t.id === tournamentId)?.year)
          || new Date().getFullYear();
        const scheduledAt = parseScheduleDateTime(dzien, godzina, tournamentYear);
        if (!scheduledAt) {
          setParseError(`Nieparsowalna data/godzina w wierszu ${i + 2}: "${dzien}" + "${godzina}".`);
          return;
        }
        out.push({
          dzien, godzina, boisko, dywizja, runda, grupa, home, away,
          _division: normDiv,
          _scheduledAt: scheduledAt,
          _homeKey: teamKey(home, normDiv),
          _awayKey: teamKey(away, normDiv),
          _rowIdx: i + 2,
        });
      }

      if (out.length === 0) { setParseError('Brak wierszy z meczami.'); return; }

      // Auto-match pass — gather unique team keys and try matching against
      // tournament's scouted teams. Unmatched go into unresolved bucket.
      const uniqueKeys = new Map(); // key → { name, division }
      out.forEach(r => {
        if (r.home) uniqueKeys.set(r._homeKey, { name: r.home, division: r._division });
        if (r.away) uniqueKeys.set(r._awayKey, { name: r.away, division: r._division });
      });

      const autoMatchMap = {};        // already-scouted in tournament
      const workspaceMatchMap = {};   // in workspace, needs scouted-entry attach
      const unresolvedMap = {};
      uniqueKeys.forEach(({ name, division }, key) => {
        const sid = findScoutedMatch(name, division, scopedScouted, teams, league);
        if (sid) {
          autoMatchMap[key] = sid;
          return;
        }
        // Fallback to workspace-wide match (name + division). Single hit
        // → auto-attach during import (no user click needed). Zero or
        // multiple hits → resolver (multiple = ambiguous, let user pick).
        const candidates = findWorkspaceMatches(name, division, teams, league);
        if (candidates.length === 1) {
          workspaceMatchMap[key] = candidates[0].id;
          return;
        }
        unresolvedMap[key] = { name, division, action: '', mapping: '' };
      });

      setParsedRows(out);
      setAutoMatched(autoMatchMap);
      setAutoMatchedWorkspace(workspaceMatchMap);
      setUnresolved(unresolvedMap);
      setStep('resolve');
    };
    reader.readAsText(file, 'UTF-8');
  };

  // ── Resolver state mutators ─────────────────────────────────────────────
  const setRowAction = (key, action) => {
    setUnresolved(prev => ({
      ...prev,
      [key]: { ...prev[key], action, mapping: action === 'match' ? prev[key].mapping : '' },
    }));
  };
  const setRowMapping = (key, mapping) => {
    setUnresolved(prev => ({
      ...prev,
      [key]: { ...prev[key], mapping },
    }));
  };

  const allResolved = useMemo(() => {
    return Object.values(unresolved).every(u => {
      if (u.action === 'create' || u.action === 'skip') return true;
      if (u.action === 'match' && u.mapping) return true;
      return false;
    });
  }, [unresolved]);

  // Preview counts
  const previewStats = useMemo(() => {
    const autoCount = Object.keys(autoMatched).length;
    const workspaceCount = Object.keys(autoMatchedWorkspace).length;
    const unresolvedCount = Object.keys(unresolved).length;
    const skipKeys = Object.entries(unresolved).filter(([, u]) => u.action === 'skip').map(([k]) => k);
    const droppedMatches = parsedRows.filter(r => skipKeys.includes(r._homeKey) || skipKeys.includes(r._awayKey)).length;
    return {
      totalRows: parsedRows.length,
      uniqueTeams: autoCount + workspaceCount + unresolvedCount,
      autoMatched: autoCount,
      autoWorkspace: workspaceCount,
      unresolved: unresolvedCount,
      droppedMatches,
      willWrite: parsedRows.length - droppedMatches,
    };
  }, [parsedRows, autoMatched, autoMatchedWorkspace, unresolved]);

  // ── Import ──────────────────────────────────────────────────────────────
  const handleImport = async () => {
    setImporting(true);
    setStep('importing');
    const log = [];
    let scoutedCreated = 0;
    let scoutedFailed = 0;
    try {
      // Resolve every key to a scoutedId (or 'skip'). For 'create' actions
      // we'll create the team + scouted entry inside the import loop.
      // teamKey → scoutedId, or null if skipped.
      const keyToScouted = { ...autoMatched };

      // Pass 0: attach workspace teams that were auto-matched but not yet
      // scouted in this tournament. Each gets a scouted entry created;
      // roster pre-populated from current players on that team. Division is
      // derived from team.divisions.NXL so Coach tab's division-filter
      // (CoachTabContent §26) keeps the team visible — historical 2026-05-15
      // bug omitted this, leaving scouted.division=null and Coach tab
      // appearing empty under any non-'all' division filter.
      for (const [key, teamId] of Object.entries(autoMatchedWorkspace)) {
        const t = teams.find(tt => tt.id === teamId);
        const division = (t?.divisions || {})[league] || null;
        try {
          const teamRoster = (players || []).filter(p => playerOnTeam(p, teamId)).map(p => p.id);
          const ref = await ds.addScoutedTeam(tournamentId, { teamId, division, roster: teamRoster });
          keyToScouted[key] = ref.id;
          scoutedCreated++;
          log.push(`🔗 Drużyna z workspace dodana do turnieju: ${t?.name || key} (${division || '?'})`);
        } catch (e) {
          scoutedFailed++;
          log.push(`❌ Nie udało się dodać drużyny ${t?.name || key}: ${e.message}`);
        }
      }

      // First pass: handle 'match' actions — pick existing team, ensure
      // scouted entry exists for the tournament.
      for (const [key, u] of Object.entries(unresolved)) {
        if (u.action === 'skip') { keyToScouted[key] = null; continue; }
        if (u.action === 'match') {
          const teamId = u.mapping;
          // Find/create scouted entry for this tournament
          let s = scopedScouted.find(s => s.teamId === teamId);
          if (!s) {
            const t = teams.find(tt => tt.id === teamId);
            const division = (t?.divisions || {})[league] || u.division || null;
            try {
              const teamRoster = (players || []).filter(p => playerOnTeam(p, teamId)).map(p => p.id);
              const ref = await ds.addScoutedTeam(tournamentId, { teamId, division, roster: teamRoster });
              keyToScouted[key] = ref.id;
              scoutedCreated++;
              log.push(`➕ Drużyna dodana do turnieju: ${u.name} (${division || '?'})`);
            } catch (e) {
              scoutedFailed++;
              log.push(`❌ Nie udało się dodać drużyny ${u.name}: ${e.message}`);
            }
          } else {
            keyToScouted[key] = s.id;
          }
        }
        if (u.action === 'create') {
          // Create new team with the division pre-set, then add to tournament.
          try {
            const ref = await ds.addTeam({
              name: u.name,
              leagues: [league],
              divisions: { [league]: u.division },
            });
            const scoutedRef = await ds.addScoutedTeam(tournamentId, {
              teamId: ref.id, division: u.division, roster: [],
            });
            keyToScouted[key] = scoutedRef.id;
            scoutedCreated++;
            log.push(`➕ Nowa drużyna utworzona: ${u.name} (${u.division})`);
          } catch (e) {
            scoutedFailed++;
            log.push(`❌ Nie udało się utworzyć drużyny ${u.name}: ${e.message}`);
          }
        }
      }

      // Second pass: write match docs.
      let written = 0, skipped = 0;
      for (const r of parsedRows) {
        const sidHome = keyToScouted[r._homeKey];
        const sidAway = keyToScouted[r._awayKey];
        if (!sidHome || !sidAway) { skipped++; continue; }
        const teamAName = (() => {
          const sc = scopedScouted.find(s => s.id === sidHome) || (scouted || []).find(s => s.id === sidHome);
          const t = teams.find(tt => tt.id === sc?.teamId);
          return t?.name || r.home;
        })();
        const teamBName = (() => {
          const sc = scopedScouted.find(s => s.id === sidAway) || (scouted || []).find(s => s.id === sidAway);
          const t = teams.find(tt => tt.id === sc?.teamId);
          return t?.name || r.away;
        })();
        await ds.addMatch(tournamentId, {
          teamA: sidHome,
          teamB: sidAway,
          name: `${teamAName} vs ${teamBName}`,
          division: r._division,
          // Keep legacy date / time strings populated alongside scheduledAt
          // so existing readers (MatchCard fallback, ScoutedTeamPage sort)
          // continue to work without changes.
          date: r._scheduledAt.toISOString().slice(0, 10),
          time: r.godzina,
          scheduledAt: r._scheduledAt,
          field: r.boisko || null,
          round: r.runda || null,
          group: r.grupa || null,
        });
        written++;
      }
      log.push(`✅ Zapisano: ${written} meczów · drużyny dodane: ${scoutedCreated}${scoutedFailed ? ` · drużyn nie udało się dodać: ${scoutedFailed}` : ''}`);
      if (skipped) log.push(`⚠ Pominięto: ${skipped} meczów (drużyna oznaczona jako skip lub niepowodzenie dodania)`);
      setImportLog(log);
      setStep('done');
    } catch (e) {
      log.push(`❌ Błąd: ${e.message}`);
      setImportLog(log);
      setStep('done');
    }
    setImporting(false);
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} title="📅 Import harmonogramu (CSV)">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '70vh', overflowY: 'auto' }}>

        {/* ─── Step: Upload ─────────────────────────────────────────── */}
        {step === 'upload' && (
          <>
            <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textDim }}>
              CSV harmonogramu z PBLeagues (kolumny: Dzien, Godzina, Boisko, Dywizja, Runda, Grupa, Druzyna_Home, Druzyna_Away).
              Mecze zostaną zapisane w wybranym turnieju z polami <code>scheduledAt</code>, <code>field</code>, <code>round</code>, <code>group</code>.
            </div>

            <div>
              <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textDim, marginBottom: 4 }}>
                Turniej:
              </div>
              <Select value={tournamentId} onChange={setTournamentId} style={{ width: '100%', minHeight: TOUCH.minTarget }}>
                <option value="">— wybierz turniej —</option>
                {leagueTournaments.map(t => (
                  <option key={t.id} value={t.id}>{t.name}{t.division ? ` · ${t.division}` : ''}{t.date ? ` · ${t.date}` : ''}</option>
                ))}
              </Select>
              {!leagueTournaments.length && (
                <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.danger, marginTop: 4 }}>
                  Brak turniejów z przypisaną ligą. Utwórz turniej najpierw.
                </div>
              )}
            </div>

            <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} style={{ display: 'none' }} />
            <Btn variant="accent" onClick={() => fileRef.current?.click()} disabled={!tournamentId}
              style={{ minHeight: 48 }}>
              📂 Wybierz plik CSV
            </Btn>

            {parseError && (
              <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.danger, background: '#ef444410', border: `1px solid ${COLORS.danger}40`, borderRadius: 8, padding: '8px 10px' }}>
                {parseError}
              </div>
            )}
          </>
        )}

        {/* ─── Step: Resolve ─────────────────────────────────────────── */}
        {step === 'resolve' && (
          <>
            <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.accent, fontWeight: 700 }}>
              {selectedTournament?.name || '?'} — {previewStats.totalRows} meczów, {previewStats.uniqueTeams} drużyn
            </div>
            <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textDim, background: COLORS.surfaceDark, borderRadius: 8, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div>✅ Auto-dopasowane (w turnieju): {previewStats.autoMatched}</div>
              {previewStats.autoWorkspace > 0 && (
                <div>🔗 Z workspace (zostaną dopięte): {previewStats.autoWorkspace}</div>
              )}
              <div style={{ color: previewStats.unresolved > 0 ? COLORS.accent : COLORS.success }}>
                {previewStats.unresolved > 0 ? '⚠' : '✓'} Do rozwiązania: {previewStats.unresolved}
              </div>
              {previewStats.droppedMatches > 0 && (
                <div style={{ color: COLORS.danger }}>⊘ Mecze do pominięcia: {previewStats.droppedMatches} z {previewStats.totalRows}</div>
              )}
            </div>

            {Object.keys(unresolved).length > 0 && (
              <>
                <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 700, color: COLORS.text, marginTop: 4 }}>
                  Drużyny do rozwiązania:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
                  {Object.entries(unresolved).map(([key, u]) => {
                    const candidates = workspaceTeamsForDivision(u.division, teams, league);
                    return (
                      <div key={key} style={{
                        padding: '8px 10px', borderRadius: 8,
                        background: COLORS.surfaceDark, border: `1px solid ${u.action ? COLORS.border : '#f59e0b40'}`,
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                          <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 600, color: COLORS.text, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {u.name}
                          </span>
                          <span style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textMuted, flexShrink: 0 }}>
                            {u.division}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                          <Btn variant={u.action === 'match' ? 'accent' : 'default'} size="sm" onClick={() => setRowAction(key, 'match')}>
                            Dopasuj
                          </Btn>
                          <Btn variant={u.action === 'create' ? 'accent' : 'default'} size="sm" onClick={() => setRowAction(key, 'create')}>
                            Utwórz
                          </Btn>
                          <Btn variant={u.action === 'skip' ? 'accent' : 'default'} size="sm" onClick={() => setRowAction(key, 'skip')}>
                            Pomiń
                          </Btn>
                        </div>
                        {u.action === 'match' && (
                          <div style={{ marginTop: 6 }}>
                            <Select value={u.mapping} onChange={v => setRowMapping(key, v)} style={{ width: '100%', minHeight: TOUCH.minTarget, fontSize: FONT_SIZE.sm }}>
                              <option value="">— wybierz drużynę z workspace ({u.division}) —</option>
                              {candidates.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                              ))}
                            </Select>
                            {!candidates.length && (
                              <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textMuted, marginTop: 2 }}>
                                Brak drużyn w workspace z dywizją {u.division}. Użyj "Utwórz".
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <Btn variant="default" onClick={() => { setStep('upload'); }}>← Wstecz</Btn>
              <Btn variant="accent" onClick={handleImport}
                disabled={!allResolved || importing}
                style={{ flex: 1, justifyContent: 'center', minHeight: 48 }}>
                <Icons.Check /> Zaimportuj {previewStats.willWrite} meczów
              </Btn>
            </div>
          </>
        )}

        {/* ─── Step: Importing ───────────────────────────────────────── */}
        {step === 'importing' && (
          <div style={{ textAlign: 'center', padding: 30 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
            <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.base, color: COLORS.text }}>Importowanie...</div>
          </div>
        )}

        {/* ─── Step: Done ────────────────────────────────────────────── */}
        {step === 'done' && (
          <>
            <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.base, fontWeight: 700, color: COLORS.success }}>
              ✅ Import zakończony
            </div>
            <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textDim, maxHeight: 240, overflowY: 'auto' }}>
              {importLog.map((l, i) => <div key={i}>{l}</div>)}
            </div>
            <Btn variant="accent" onClick={() => { reset(); onClose(); }} style={{ justifyContent: 'center' }}>
              Zamknij
            </Btn>
          </>
        )}

      </div>
    </Modal>
  );
}
