import React, { useState, useRef } from 'react';
import { Btn, Icons, Modal, Select } from './ui';
import { COLORS, FONT, FONT_SIZE } from '../utils/theme';
import { normalizePbliInput } from '../utils/pbliMatching';
import { repairMojibake } from '../utils/mojibake';
import { playerTeams } from '../utils/playerTeams';
import { useLeagues } from '../hooks/useLeagues';
import { useLeagueDivisions } from '../hooks/useLeagueDivisions';
import { useLanguage } from '../hooks/useLanguage';

/**
 * CSVImport — import/update teams + players from CSV (PBLeagues format).
 *
 * Handles: BOM, semicolon separator, PBLeagues headers, class normalization
 * (Division 4 → D4), nationality name → code, photo URL filtering.
 *
 * Merge: matched records updated only for non-empty CSV fields.
 * Unmatched → created. Existing data never wiped by empty cells.
 */

// ─── Column mappings (auto-detect from header names) ───────────
const MAPPABLE = [
  { key: 'team',        label: 'Team name *',   required: true,
    detect: ['team', 'drużyna', 'druzyna', 'team_name', 'teamname', 'nazwa_druzyny', 'nazwa druzyny', 'nazwa drużyny'] },
  { key: 'teamExtId',   label: 'Team ID',       required: false,
    detect: ['team_id', 'teamid', 'druzyna_id', 'drużyna_id', 'pbl_team', 'team id'] },
  { key: 'player',      label: 'Player name *', required: true,
    detect: ['player', 'name', 'gracz', 'imię', 'imie', 'full_name', 'fullname', 'zawodnik', 'imie_nazwisko', 'imię_nazwisko'] },
  { key: 'nickname',    label: 'Nickname',       required: false,
    detect: ['nickname', 'nick', 'pseudo', 'pseudonim', 'alias'] },
  { key: 'number',      label: 'Number',         required: false,
    detect: ['number', 'numer', 'nr', '#', 'jersey'] },
  { key: 'role',        label: 'Role',           required: false,
    detect: ['role', 'rola', 'typ'] },
  { key: 'playerClass', label: 'Class',          required: false,
    // 'dywizja' / 'division' removed 2026-05-12 — those are TEAM-level in
    // PBLeagues NXL exports and now map to the new teamDivision target
    // below. Klasa stays as the per-player classification field.
    detect: ['class', 'klasa', 'player_class'] },
  { key: 'teamDivision', label: 'NXL Division',  required: false,
    // New mapper target — writes team.divisions.NXL via normalizeDivision.
    // Detect keywords match PBLeagues 'Dywizja' header + common variants.
    detect: ['dywizja', 'division', 'div', 'team_division', 'team_div'] },
  { key: 'nationality', label: 'Nationality',    required: false,
    detect: ['nationality', 'narodowość', 'narodowosc', 'country', 'kraj'] },
  { key: 'pbliId',      label: 'Player ID',      required: false,
    detect: ['id_zawodnika', 'pbli_id', 'pbliid', 'pbl_id', 'player_id', 'playerid', 'pbli', 'id'] },
  { key: 'photoURL',    label: 'Photo URL',      required: false,
    detect: ['photo', 'photo_url', 'photourl', 'zdjęcie', 'zdjecie', 'image', 'avatar'] },
  { key: 'age',         label: 'Age',            required: false,
    detect: ['age', 'wiek'] },
];

// ─── Normalization maps ────────────────────────────────────────
const CLASS_NORM = {
  'pro': 'Pro', 'semi-pro': 'Semi-Pro', 'semi pro': 'Semi-Pro',
  'division 1': 'D1', 'division 2': 'D2', 'division 3': 'D3',
  'division 4': 'D4', 'division 5': 'D5',
  'd1': 'D1', 'd2': 'D2', 'd3': 'D3', 'd4': 'D4', 'd5': 'D5',
  'beginner': 'D5', 'none': '',
};

const ROLE_NORM = {
  'player': 'player', 'gracz': 'player', 'zawodnik': 'player',
  'coach': 'coach', 'trener': 'coach',
  'staff': 'staff', 'support': 'staff',
};

const COUNTRY_TO_CODE = {
  'poland': 'PL', 'germany': 'DE', 'france': 'FR', 'united kingdom': 'GB', 'uk': 'GB',
  'usa': 'US', 'united states': 'US', 'russia': 'RU', 'czech republic': 'CZ', 'czechia': 'CZ',
  'finland': 'FI', 'sweden': 'SE', 'netherlands': 'NL', 'holland': 'NL',
  'italy': 'IT', 'spain': 'ES', 'austria': 'AT', 'switzerland': 'CH',
  'belgium': 'BE', 'denmark': 'DK', 'ukraine': 'UA', 'slovakia': 'SK',
  'lithuania': 'LT', 'latvia': 'LV', 'estonia': 'EE', 'portugal': 'PT',
  'canada': 'CA', 'australia': 'AU', 'south africa': 'ZA',
  'malaysia': 'MY', 'thailand': 'TH', 'philippines': 'PH', 'indonesia': 'ID',
  'cyprus': 'CY', 'norway': 'NO', 'greece': 'GR', 'serbia': 'RS',
  'brazil': 'BR', 'colombia': 'CO', 'luxembourg': 'LU', 'bulgaria': 'BG',
  'aruba': 'AW', 'curacao': 'CW', 'curaçao': 'CW', 'gabon': 'GA',
  'nieznana': '', 'unknown': '',
};

const JUNK_PHOTOS = ['brak', 'none', '', 'https://pbleagues.com/assets/images/nophoto.png'];

function normalizeClass(raw) {
  if (!raw) return '';
  return CLASS_NORM[raw.toLowerCase().trim()] ?? raw.trim();
}

function normalizeNationality(raw) {
  if (!raw) return '';
  const low = raw.toLowerCase().trim();
  // If already a 2-letter code, keep it
  if (/^[A-Z]{2}$/.test(raw.trim())) return raw.trim();
  return COUNTRY_TO_CODE[low] ?? raw.trim().toUpperCase().slice(0, 2);
}

function normalizePhoto(raw) {
  if (!raw) return '';
  if (JUNK_PHOTOS.includes(raw.toLowerCase().trim())) return '';
  return raw.trim();
}

function normalizeRole(raw) {
  if (!raw) return '';
  return ROLE_NORM[raw.toLowerCase().trim()] || raw.toLowerCase().trim();
}

// Normalize a CSV division value against the selected league's canonical
// division names (sourced from the /leagues doc — § 71). Case-insensitive
// match → returns the canonical casing. Unknown values return null (logged
// as a collision). E.g. 'Semi-PRO' (CSV) → 'SEMI-PRO'.
function normalizeDivision(raw, allowed) {
  if (!raw) return null;
  const lower = raw.toLowerCase().trim();
  return (allowed || []).find(d => d.toLowerCase() === lower) || null;
}

// ─── Component ─────────────────────────────────────────────────
export default function CSVImport({ open, onClose, teams, players, ds }) {
  const { t } = useLanguage();
  const [step, setStep] = useState('upload');
  const [csvData, setCsvData] = useState(null);
  const [colMap, setColMap] = useState({});
  const [parsed, setParsed] = useState([]);
  const [preview, setPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [log, setLog] = useState([]);
  const [league, setLeague] = useState('NXL');
  const leagues = useLeagues();
  // § 71 — division names from the selected league's /leagues doc (not the
  // legacy DIVISIONS constant) so panel-created leagues import correctly.
  const allowedDivisions = useLeagueDivisions(league).map(d => d.name);
  const [mergeByName, setMergeByName] = useState(true); // default ON — safest for re-imports
  const fileRef = useRef(null);

  const reset = () => { setStep('upload'); setCsvData(null); setParsed([]); setPreview(null); setLog([]); setColMap({}); };

  // ─── Parse file ──────────────────────────────────────────
  const handleFile = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      let text = ev.target.result;
      // Strip BOM
      if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) return;

      // Auto-detect separator
      const sep = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ';' : ',';
      const parseRow = (line) => {
        const cols = []; let cur = '', inQ = false;
        for (const c of line) {
          if (c === '"') { inQ = !inQ; continue; }
          if (c === sep && !inQ) { cols.push(cur.trim()); cur = ''; continue; }
          cur += c;
        }
        cols.push(cur.trim());
        return cols;
      };
      const headers = parseRow(lines[0]);
      const rows = lines.slice(1).map(parseRow).filter(r => r.some(c => c));
      setCsvData({ headers, rows, sep });

      // Auto-detect columns
      const map = {};
      MAPPABLE.forEach(m => {
        const idx = headers.findIndex(h =>
          m.detect.some(d => h.toLowerCase().trim().replace(/\s+/g, '_') === d
            || h.toLowerCase().trim() === d)
        );
        if (idx >= 0) map[m.key] = String(idx);
      });
      setColMap(map);
      setStep('preview');
    };
    reader.readAsText(file, 'UTF-8');
  };

  // ─── Parse + preview ────────────────────────────────────
  const handlePreview = () => {
    if (!csvData || !colMap.team || !colMap.player) return;
    const get = (row, key) => {
      const idx = colMap[key]; if (idx == null || idx === '') return '';
      return (row[parseInt(idx)] || '').trim();
    };
    // B24 — repair double-encoded UTF-8 in PLAYER name fields at import time
    // (e.g. "AndrÃ©" → "André"). Self-guarding: clean names pass through
    // untouched. Scoped to player/nickname — players match by pbliId so the
    // repair never affects matching. NOT applied to `team`: team-name matching
    // falls back to name (matchTeam), and existing team docs aren't repaired in
    // this change, so repairing the CSV team name could spawn a duplicate.
    const getName = (row, key) => repairMojibake(get(row, key));
    const rows = csvData.rows.map(r => ({
      team:        get(r, 'team'),
      teamExtId:   get(r, 'teamExtId'),
      // Normalized against the selected league's division names (§ 71) —
      // unknown values become null and are flagged on the preview as
      // collisions. Preserves canonical casing ('Semi-PRO' → 'SEMI-PRO').
      teamDivision: normalizeDivision(get(r, 'teamDivision'), allowedDivisions),
      // Keep the raw value too for collision logging (helps spot bad data).
      teamDivisionRaw: get(r, 'teamDivision'),
      player:      getName(r, 'player'),
      nickname:    getName(r, 'nickname'),
      number:      get(r, 'number'),
      role:        normalizeRole(get(r, 'role')),
      playerClass: normalizeClass(get(r, 'playerClass')),
      nationality: normalizeNationality(get(r, 'nationality')),
      // Normalize at parse time (strip #, whitespace, lowercase) so the
      // self-claim matcher can do exact equality without repeatedly running
      // normalize on the DB side. See src/utils/pbliMatching.js.
      pbliId:      normalizePbliInput(get(r, 'pbliId')),
      photoURL:    normalizePhoto(get(r, 'photoURL')),
      age:         get(r, 'age'),
    })).filter(r => r.team && r.player);
    setParsed(rows);

    // Stats
    const uniqueTeams = [...new Set(rows.map(r => r.team))];
    let newTeams = 0, updTeams = 0, newPlayers = 0, updPlayers = 0;
    uniqueTeams.forEach(tName => {
      const row = rows.find(r => r.team === tName);
      if (matchTeam(tName, row?.teamExtId, teams)) updTeams++; else newTeams++;
    });
    rows.forEach(r => {
      const tMatch = matchTeam(r.team, r.teamExtId, teams);
      if (matchPlayer(r.player, r.pbliId, tMatch?.id, players, mergeByName)) updPlayers++; else newPlayers++;
    });
    // Division stats — count unique teams with a normalized division +
    // detect intra-import collisions (same team identity, multiple
    // different division values across rows). Last-write-wins on import;
    // collisions surfaced to user via the preview + dev console.
    const teamsWithDivision = new Set();
    const divisionByTeamKey = new Map(); // key: teamExtId || teamName
    const collisions = [];
    rows.forEach(r => {
      if (!r.teamDivision) return;
      const key = r.teamExtId || r.team;
      teamsWithDivision.add(key);
      if (divisionByTeamKey.has(key) && divisionByTeamKey.get(key) !== r.teamDivision) {
        collisions.push({ team: r.team, key, was: divisionByTeamKey.get(key), now: r.teamDivision });
      }
      divisionByTeamKey.set(key, r.teamDivision);
    });
    setPreview({
      newTeams, updTeams, newPlayers, updPlayers,
      totalRows: rows.length, totalTeams: uniqueTeams.length,
      teamsWithDivision: teamsWithDivision.size,
      collisions: collisions.length,
    });
    if (collisions.length && typeof console !== 'undefined') {
      // eslint-disable-next-line no-console
      console.warn('[CSVImport] Division collisions (last-write-wins):', collisions);
    }
  };

  // ─── Import / merge ────────────────────────────────────
  const handleImport = async () => {
    setImporting(true); setStep('importing');
    const importLog = [];
    try {
      const teamMap = {};
      const uniqueTeams = [...new Set(parsed.map(r => r.team))];

      // Build the per-team final division (last-write-wins among CSV rows
      // sharing the same team identity). Key matches matchTeam's lookup
      // order (externalId preferred, then name).
      const divisionByKey = new Map();
      parsed.forEach(r => {
        if (!r.teamDivision) return;
        const key = r.teamExtId || r.team;
        divisionByKey.set(key, r.teamDivision);
      });

      let teamsWithDivisionWritten = 0;
      for (const tName of uniqueTeams) {
        const row = parsed.find(r => r.team === tName);
        const teamKey = row?.teamExtId || tName;
        const finalDivision = divisionByKey.get(teamKey) || null;
        const existing = matchTeam(tName, row?.teamExtId, teams);
        if (existing) {
          teamMap[tName] = existing.id;
          const upd = {};
          if (row?.teamExtId && row.teamExtId !== existing.externalId) upd.externalId = row.teamExtId;
          // Write divisions.NXL when CSV carried a normalized value and
          // either the team had no division for this league or its value
          // differs. Other leagues on the team's divisions object are
          // preserved (merge via spread).
          if (finalDivision) {
            const currentNxl = (existing.divisions || {})[league] || null;
            if (currentNxl !== finalDivision) {
              upd.divisions = { ...(existing.divisions || {}), [league]: finalDivision };
              teamsWithDivisionWritten++;
            }
          }
          if (Object.keys(upd).length) {
            await ds.updateTeam(existing.id, upd, { bump: false }); // bulk: bump once at end
            importLog.push(`🔄 Team: ${tName}${upd.divisions ? ` [${league}: ${finalDivision}]` : ''}`);
          }
        } else {
          const divisions = finalDivision ? { [league]: finalDivision } : {};
          const ref = await ds.addTeam({
            name: tName, leagues: [league],
            externalId: row?.teamExtId || null,
            divisions,
          }, { bump: false }); // bulk: bump once at end
          teamMap[tName] = ref.id;
          if (finalDivision) teamsWithDivisionWritten++;
          importLog.push(`➕ Team: ${tName}${finalDivision ? ` [${league}: ${finalDivision}]` : ''}`);
        }
      }

      let created = 0, updated = 0, skipped = 0, appended = 0;
      // § 72 — accumulates teams[] across rows so a player appearing in
      // multiple rows of one CSV doesn't lose earlier appends to a stale snapshot.
      const liveTeams = new Map(); // playerId → teams[] (live during this import)
      for (const r of parsed) {
        const teamId = teamMap[r.team];

        // § 72 — pbliId is the authoritative CROSS-team identity key. A pbliId
        // match → APPEND the import team to teams[] AND backfill scalar profile
        // fields (photoURL etc.) so re-imports don't silently drop new data.
        // Never overwrites name / teamId — the cross-region guard (Chavez US ≠
        // Chavez EU) applies to NAME identity, not to a player's own profile
        // attributes attached to an authoritative pbliId.
        // Empty cells never clobber existing values (same rule as the name path).
        if (r.pbliId) {
          const byPbli = players.find(p => p.pbliId
            && normalizePbliInput(p.pbliId) === r.pbliId);
          if (byPbli) {
            const cur = liveTeams.get(byPbli.id) || playerTeams(byPbli);
            const upd = {};
            // Team append — only when row carried a teamId AND it's not
            // already present on the player.
            let teamsChanged = false;
            if (teamId && !cur.includes(teamId)) {
              upd.teams = [...cur, teamId];
              teamsChanged = true;
            }
            // Scalar backfill — only set fields the CSV actually carried AND
            // that differ from the existing value. Mirrors the name-match
            // branch below so behavior is symmetric across match paths.
            if (r.nickname && r.nickname !== byPbli.nickname) upd.nickname = r.nickname;
            if (r.number && r.number !== byPbli.number) upd.number = r.number;
            if (r.role && r.role !== byPbli.role) upd.role = r.role;
            if (r.playerClass && r.playerClass !== byPbli.playerClass) upd.playerClass = r.playerClass;
            if (r.nationality && r.nationality !== byPbli.nationality) upd.nationality = r.nationality;
            if (r.photoURL && r.photoURL !== byPbli.photoURL) upd.photoURL = r.photoURL;
            if (r.age && Number(r.age) && Number(r.age) !== byPbli.age) upd.age = Number(r.age);

            if (Object.keys(upd).length) {
              await ds.updatePlayer(byPbli.id, upd, { bump: false }); // bulk: bump once at end
              if (teamsChanged) liveTeams.set(byPbli.id, upd.teams);
              const scalarCount = Object.keys(upd).filter(k => k !== 'teams').length;
              if (teamsChanged && scalarCount > 0) {
                appended++;
                importLog.push(`🔗 ${r.player} — dołączony + ${scalarCount} ${scalarCount === 1 ? 'pole' : 'pól'} (pbliId match)`);
              } else if (teamsChanged) {
                appended++;
                importLog.push(`🔗 ${r.player} — dołączony do drużyny (pbliId match)`);
              } else {
                updated++;
                importLog.push(`📝 ${r.player} — ${scalarCount} ${scalarCount === 1 ? 'pole' : 'pól'} (pbliId match)`);
              }
            } else {
              skipped++;
            }
            continue; // pbliId match is authoritative — done with this row
          }
          // no pbliId match → fall through to the name-path / create-new
        }

        // Name-path — UNCHANGED (within-team name dedup; § 72 keeps this as
        // the no-regression fallback). pbliId passed null — the explicit
        // pbliId path above supersedes matchPlayer's own pbliId branch.
        const existing = matchPlayer(r.player, null, teamId, players, mergeByName);

        if (existing) {
          const upd = {};
          if (r.nickname && r.nickname !== existing.nickname) upd.nickname = r.nickname;
          if (r.number && r.number !== existing.number) upd.number = r.number;
          if (r.role && r.role !== existing.role) upd.role = r.role;
          if (r.playerClass && r.playerClass !== existing.playerClass) upd.playerClass = r.playerClass;
          if (r.nationality && r.nationality !== existing.nationality) upd.nationality = r.nationality;
          if (r.pbliId && r.pbliId !== existing.pbliId) upd.pbliId = r.pbliId;
          if (r.photoURL && r.photoURL !== existing.photoURL) upd.photoURL = r.photoURL;
          if (r.age && Number(r.age) && Number(r.age) !== existing.age) upd.age = Number(r.age);
          if (teamId && existing.teamId !== teamId) {
            await ds.changePlayerTeam(existing.id, teamId, existing.teamHistory || [], { bump: false });
            upd._teamChanged = true;
          }
          if (Object.keys(upd).length) {
            const { _teamChanged, ...dbUpd } = upd;
            if (Object.keys(dbUpd).length) await ds.updatePlayer(existing.id, dbUpd, { bump: false });
            updated++;
          } else { skipped++; }
        } else {
          await ds.addPlayer({
            name: r.player, nickname: r.nickname || '', number: r.number || '',
            teamId: teamId || null, teams: teamId ? [teamId] : [],
            role: r.role || 'player',
            playerClass: r.playerClass || null, nationality: r.nationality || null,
            pbliId: r.pbliId || null, photoURL: r.photoURL || null,
            age: r.age ? Number(r.age) : null,
          }, { bump: false }); // bulk: bump once at end
          created++;
        }
      }
      importLog.push(`✅ Players: ${created} nowych, ${updated} zaktualizowanych, ${appended} dołączonych, ${skipped} bez zmian`);
      importLog.push(`✅ Teams: ${uniqueTeams.length} total · ${teamsWithDivisionWritten} z dywizją ${league}`);
      // Catalog changed → bump the version marker once so clients refresh their
      // cached catalog on next load (bulk import bumps once here, not per row).
      try { await ds.bumpCatalogVersion(); } catch (_) { /* non-fatal */ }
      setLog(importLog); setStep('done');
    } catch (e) {
      importLog.push(`❌ Błąd: ${e.message}`);
      setLog(importLog); setStep('done');
    }
    setImporting(false);
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={() => { onClose(); reset(); }} title="📋 Import CSV — teams & players">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '70vh', overflowY: 'auto' }}>

        {step === 'upload' && (
          <>
            <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textDim }}>
              CSV z drużynami i graczami (format PBLeagues lub własny). Istniejące rekordy zostaną zaktualizowane — puste pola nie nadpiszą istniejących danych.
            </div>
            <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textMuted, background: COLORS.surfaceDark, borderRadius: 8, padding: '8px 10px', lineHeight: 1.5 }}>
              Auto-normalizacja: <strong style={{ color: COLORS.text }}>Division 4→D4</strong>, <strong style={{ color: COLORS.text }}>Poland→PL</strong>, Brak→null, nophoto→null, BOM→strip
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textDim }}>{t('b13_csv_default_league_label')}</span>
              <Select value={league} onChange={setLeague} style={{ minWidth: 140 }}>
                {leagues.map(L => (
                  <option key={L.shortName} value={L.shortName}>{L.name}</option>
                ))}
              </Select>
            </div>
            <label style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 8,
              background: mergeByName ? `${COLORS.accent}10` : COLORS.surfaceDark,
              border: `1px solid ${mergeByName ? `${COLORS.accent}40` : COLORS.border}`,
              cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
            }}>
              <input type="checkbox" checked={mergeByName}
                onChange={e => setMergeByName(e.target.checked)}
                style={{ accentColor: COLORS.accent, width: 18, height: 18 }} />
              <div>
                <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 600, color: COLORS.text }}>
                  Dopasuj po nazwie (merge)
                </div>
                <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textMuted, marginTop: 1 }}>
                  Istniejący gracz o tej samej nazwie zostanie zaktualizowany zamiast tworzenia duplikatu. Numery, statystyki i historia zachowane.
                </div>
              </div>
            </label>
            <input ref={fileRef} type="file" accept=".csv,.txt,.tsv" onChange={handleFile} style={{ display: 'none' }} />
            <Btn variant="accent" onClick={() => fileRef.current?.click()} style={{ minHeight: 48 }}>📂 Wybierz plik CSV</Btn>
          </>
        )}

        {step === 'preview' && csvData && (
          <>
            <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.accent, fontWeight: 700 }}>
              {csvData.rows.length} wierszy · {csvData.headers.length} kolumn · sep: {csvData.sep === ';' ? 'średnik' : 'przecinek'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
              {MAPPABLE.map(m => (
                <div key={m.key}>
                  <div style={{ fontFamily: FONT, fontSize: 10, color: m.required ? COLORS.text : COLORS.textDim, marginBottom: 2, fontWeight: m.required ? 700 : 500 }}>
                    {m.label} {colMap[m.key] != null && colMap[m.key] !== '' && <span style={{ color: COLORS.success }}>✓</span>}
                  </div>
                  <Select value={colMap[m.key] || ''} onChange={v => setColMap(p => ({ ...p, [m.key]: v }))} style={{ width: '100%', fontSize: 12 }}>
                    <option value="">{m.required ? '— wymagane —' : '— pomiń —'}</option>
                    {csvData.headers.map((h, i) => <option key={i} value={String(i)}>{h}</option>)}
                  </Select>
                </div>
              ))}
            </div>
            <Btn variant="default" onClick={handlePreview} disabled={!colMap.team || !colMap.player}>🔍 Podgląd</Btn>
            {preview && (
              <>
                <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, background: COLORS.surfaceDark, borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <StatRow label={t('csv_import_stat_teams')} create={preview.newTeams} update={preview.updTeams} noChange={t('csv_import_no_change')} />
                  <StatRow label={t('csv_import_stat_players')} create={preview.newPlayers} update={preview.updPlayers} noChange={t('csv_import_no_change')} />
                  {(preview.teamsWithDivision > 0 || preview.collisions > 0) && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONT }}>
                      <span style={{ fontSize: FONT_SIZE.sm, fontWeight: 600, color: COLORS.text }}>Dywizja {league}</span>
                      <span style={{ fontSize: FONT_SIZE.xs, color: COLORS.textDim }}>
                        {preview.teamsWithDivision > 0 && (
                          <span style={{ color: COLORS.accent, fontWeight: 700 }}>{preview.teamsWithDivision} drużyn</span>
                        )}
                        {preview.collisions > 0 && (
                          <>
                            {preview.teamsWithDivision > 0 && ', '}
                            <span style={{ color: COLORS.danger, fontWeight: 700 }}>{preview.collisions} kolizji</span>
                          </>
                        )}
                      </span>
                    </div>
                  )}
                </div>
                <div style={{ maxHeight: 180, overflowY: 'auto', fontSize: FONT_SIZE.xs, fontFamily: FONT }}>
                  {parsed.slice(0, 15).map((r, i) => {
                    const tM = matchTeam(r.team, r.teamExtId, teams);
                    const pM = tM ? matchPlayer(r.player, r.pbliId, tM?.id, players, mergeByName) : null;
                    return (
                      <div key={i} style={{ padding: '2px 0', color: COLORS.textDim, display: 'flex', gap: 4, alignItems: 'baseline', flexWrap: 'wrap' }}>
                        <span style={{ color: tM ? COLORS.textMuted : COLORS.success, fontSize: 9 }}>{tM ? '∙' : '＋'}</span>
                        <span style={{ color: COLORS.accent }}>{r.team}</span>
                        <span style={{ color: COLORS.textMuted }}>→</span>
                        <span style={{ color: pM ? COLORS.text : COLORS.success }}>{r.player}</span>
                        {r.playerClass && <span style={{ color: COLORS.textMuted, fontSize: 9, background: COLORS.surfaceLight, borderRadius: 3, padding: '0 3px' }}>{r.playerClass}</span>}
                        {r.nationality && <span style={{ fontSize: 9 }}>{r.nationality}</span>}
                        {r.role && r.role !== 'player' && <span style={{ color: COLORS.textMuted, fontSize: 9 }}>({r.role})</span>}
                        {r.photoURL && <span style={{ color: COLORS.success, fontSize: 9 }}>📷</span>}
                      </div>
                    );
                  })}
                  {parsed.length > 15 && <div style={{ color: COLORS.textMuted, marginTop: 4 }}>...i {parsed.length - 15} więcej</div>}
                </div>
                <Btn variant="accent" onClick={handleImport} style={{ minHeight: 48 }}>
                  <Icons.Check /> Import: {preview.newPlayers} nowych, {preview.updPlayers} aktualizacji
                </Btn>
              </>
            )}
          </>
        )}

        {step === 'importing' && (
          <div style={{ textAlign: 'center', padding: 30 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
            <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.base, color: COLORS.text }}>{t('csv_import_importing', parsed.length)}</div>
          </div>
        )}

        {step === 'done' && (
          <>
            <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.base, fontWeight: 700, color: COLORS.success }}>{t('csv_import_done')}</div>
            <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textDim }}>{log.map((l, i) => <div key={i}>{l}</div>)}</div>
            <Btn variant="accent" onClick={() => { onClose(); reset(); }}>{t('close')}</Btn>
          </>
        )}
      </div>
    </Modal>
  );
}

// ─── Matching ──────────────────────────────────────────────────
function matchTeam(name, extId, teams) {
  if (extId) { const m = teams.find(t => t.externalId === extId); if (m) return m; }
  return teams.find(t => t.name.toLowerCase() === name.toLowerCase()) || null;
}

function matchPlayer(name, pbliId, teamId, players, nameOnly = false) {
  if (pbliId) { const m = players.find(p => p.pbliId === pbliId); if (m) return m; }
  if (teamId && !nameOnly) { const m = players.find(p => p.name.toLowerCase() === name.toLowerCase() && p.teamId === teamId); if (m) return m; }
  // Name-only fallback: match ANY player with this name (regardless of team)
  if (nameOnly) {
    return players.find(p => p.name.toLowerCase() === name.toLowerCase()) || null;
  }
  return players.find(p => p.name.toLowerCase() === name.toLowerCase() && !p.teamId) || null;
}

function StatRow({ label, create, update, noChange = 'bez zmian' }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONT }}>
      <span style={{ fontSize: FONT_SIZE.sm, fontWeight: 600, color: COLORS.text }}>{label}</span>
      <span style={{ fontSize: FONT_SIZE.xs, color: COLORS.textDim }}>
        {create > 0 && <span style={{ color: COLORS.success, fontWeight: 700 }}>+{create} nowych</span>}
        {create > 0 && update > 0 && ', '}
        {update > 0 && <span style={{ color: COLORS.accent, fontWeight: 700 }}>{update} aktualizacji</span>}
        {!create && !update && <span style={{ color: COLORS.textMuted }}>{noChange}</span>}
      </span>
    </div>
  );
}
