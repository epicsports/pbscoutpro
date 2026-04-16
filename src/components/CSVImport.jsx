import React, { useState, useRef, useMemo } from 'react';
import { Btn, Icons, Modal, Select } from './ui';
import { COLORS, FONT, TOUCH, FONT_SIZE } from '../utils/theme';

/**
 * CSVImport — import/update teams + players from CSV.
 *
 * Merge rules:
 *   - Teams matched by externalId first, then by name (case-insensitive).
 *   - Players matched by pbliId first, then by name + team (case-insensitive).
 *   - On match: only update fields that are NON-EMPTY in CSV. Existing values
 *     for fields not in CSV (or empty in CSV) are preserved.
 *   - On no match: create new record.
 *
 * Supported columns (auto-detected from headers):
 *   team, team_id, name/player, nickname, number, role, class,
 *   nationality, pbli_id, photo_url, age
 */

const MAPPABLE = [
  { key: 'team',        label: 'Team name *',   required: true,  detect: ['team_name', 'teamname', 'drużyna', 'druzyna', 'team'] },
  { key: 'teamExtId',   label: 'Team ID (PBL)', required: false, detect: ['team_id', 'teamid', 'team id', 'pbl_team', 'tid'] },
  { key: 'player',      label: 'Player name *', required: true,  detect: ['player_name', 'playername', 'full_name', 'fullname', 'player', 'zawodnik', 'gracz', 'imię', 'imie', 'name'] },
  { key: 'nickname',    label: 'Nickname',       required: false, detect: ['nickname', 'nick', 'pseudo', 'pseudonim', 'alias', 'callsign'] },
  { key: 'number',      label: 'Number',         required: false, detect: ['number', 'numer', 'jersey', 'nr', '#'] },
  { key: 'role',        label: 'Role',           required: false, detect: ['role', 'rola', 'typ', 'position', 'pozycja'] },
  { key: 'playerClass', label: 'Class',          required: false, detect: ['player_class', 'playerclass', 'class', 'klasa', 'classification', 'klasyfikacja', 'rank'] },
  { key: 'nationality', label: 'Nationality',    required: false, detect: ['nationality', 'narodowość', 'narodowosc', 'country', 'kraj', 'nation', 'flag'] },
  { key: 'pbliId',      label: 'PBLI ID',        required: false, detect: ['pbli_id', 'pbliid', 'pbl_id', 'pblid', 'player_id', 'playerid', 'pbli', 'external_id'] },
  { key: 'photoURL',    label: 'Photo URL',      required: false, detect: ['photo_url', 'photourl', 'photo', 'zdjęcie', 'zdjecie', 'image', 'avatar', 'img', 'picture'] },
  { key: 'age',         label: 'Age',            required: false, detect: ['age', 'wiek'] },
];

const ROLE_NORM = { player: 'player', gracz: 'player', coach: 'coach', trener: 'coach', staff: 'staff', 'support': 'staff' };

export default function CSVImport({ open, onClose, teams, players, ds }) {
  const [step, setStep] = useState('upload');
  const [csvData, setCsvData] = useState(null);
  const [colMap, setColMap] = useState({});
  const [parsed, setParsed] = useState([]);
  const [preview, setPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [log, setLog] = useState([]);
  const [league, setLeague] = useState('NXL');
  const fileRef = useRef(null);

  const reset = () => { setStep('upload'); setCsvData(null); setParsed([]); setPreview(null); setLog([]); setColMap({}); };

  // ─── Parse CSV file ──────────────────────────────────────────
  const handleFile = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) return;
      // Detect separator: if first line has more ; than , → semicolon separated
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
      const rows = lines.slice(1).map(parseRow);
      setCsvData({ headers, rows, sep });

      // Auto-detect column mapping — fuzzy includes, longest match wins
      const map = {};
      const usedCols = new Set();
      // Sort MAPPABLE by longest detect string first to avoid "team" catching "team_id"
      const sorted = [...MAPPABLE].sort((a, b) => {
        const maxA = Math.max(...a.detect.map(d => d.length));
        const maxB = Math.max(...b.detect.map(d => d.length));
        return maxB - maxA;
      });
      sorted.forEach(m => {
        const norm = (s) => s.toLowerCase().replace(/[\s_\-().]/g, '');
        const idx = headers.findIndex((h, i) => {
          if (usedCols.has(i)) return false;
          const hn = norm(h);
          return m.detect.some(d => hn === norm(d) || hn.includes(norm(d)));
        });
        if (idx >= 0) { map[m.key] = String(idx); usedCols.add(idx); }
      });
      setColMap(map);
      setStep('preview');
    };
    reader.readAsText(file);
  };

  // ─── Parse + preview ────────────────────────────────────────
  const handlePreview = () => {
    if (!csvData || !colMap.team || !colMap.player) return;
    const get = (row, key) => {
      const idx = colMap[key]; if (idx == null || idx === '') return '';
      return (row[parseInt(idx)] || '').trim();
    };
    const rows = csvData.rows.map(r => {
      const role = get(r, 'role').toLowerCase();
      return {
        team:        get(r, 'team'),
        teamExtId:   get(r, 'teamExtId'),
        player:      get(r, 'player'),
        nickname:    get(r, 'nickname'),
        number:      get(r, 'number'),
        role:        ROLE_NORM[role] || (role || ''),
        playerClass: get(r, 'playerClass'),
        nationality: get(r, 'nationality').toUpperCase(),
        pbliId:      get(r, 'pbliId'),
        photoURL:    get(r, 'photoURL'),
        age:         get(r, 'age'),
      };
    }).filter(r => r.team && r.player);
    setParsed(rows);

    // Compute preview stats
    const uniqueTeams = [...new Set(rows.map(r => r.team))];
    let newTeams = 0, updTeams = 0, newPlayers = 0, updPlayers = 0;
    uniqueTeams.forEach(tName => {
      const row = rows.find(r => r.team === tName);
      const match = matchTeam(tName, row?.teamExtId, teams);
      if (match) updTeams++; else newTeams++;
    });
    rows.forEach(r => {
      const teamMatch = matchTeam(r.team, r.teamExtId, teams);
      const teamId = teamMatch?.id || null;
      const pMatch = matchPlayer(r.player, r.pbliId, teamId, players);
      if (pMatch) updPlayers++; else newPlayers++;
    });
    setPreview({ newTeams, updTeams, newPlayers, updPlayers, totalRows: rows.length, totalTeams: uniqueTeams.length });
  };

  // ─── Import / merge ────────────────────────────────────────
  const handleImport = async () => {
    setImporting(true); setStep('importing');
    const importLog = [];
    try {
      const teamMap = {}; // csvTeamName → firestoreTeamId
      const uniqueTeams = [...new Set(parsed.map(r => r.team))];

      // Teams
      for (const tName of uniqueTeams) {
        const row = parsed.find(r => r.team === tName);
        const existing = matchTeam(tName, row?.teamExtId, teams);
        if (existing) {
          teamMap[tName] = existing.id;
          // Merge: update externalId if CSV has it and existing doesn't
          const updates = {};
          if (row?.teamExtId && !existing.externalId) updates.externalId = row.teamExtId;
          if (Object.keys(updates).length) {
            await ds.updateTeam(existing.id, updates);
            importLog.push(`🔄 Team updated: ${tName}`);
          }
        } else {
          const ref = await ds.addTeam({
            name: tName, leagues: [league],
            externalId: row?.teamExtId || null,
          });
          teamMap[tName] = ref.id;
          importLog.push(`➕ Team: ${tName}`);
        }
      }

      // Players
      let created = 0, updated = 0, skipped = 0;
      for (const r of parsed) {
        const teamId = teamMap[r.team];
        const existing = matchPlayer(r.player, r.pbliId, teamId, players);

        if (existing) {
          // Merge — only non-empty CSV fields overwrite
          const updates = {};
          if (r.nickname && r.nickname !== existing.nickname) updates.nickname = r.nickname;
          if (r.number && r.number !== existing.number) updates.number = r.number;
          if (r.role && r.role !== existing.role) updates.role = r.role;
          if (r.playerClass && r.playerClass !== existing.playerClass) updates.playerClass = r.playerClass;
          if (r.nationality && r.nationality !== existing.nationality) updates.nationality = r.nationality;
          if (r.pbliId && r.pbliId !== existing.pbliId) updates.pbliId = r.pbliId;
          if (r.photoURL && r.photoURL !== existing.photoURL) updates.photoURL = r.photoURL;
          if (r.age && Number(r.age) && Number(r.age) !== existing.age) updates.age = Number(r.age);

          // Team change?
          if (teamId && existing.teamId !== teamId) {
            await ds.changePlayerTeam(existing.id, teamId, existing.teamHistory || []);
            updates._teamChanged = true;
          }

          if (Object.keys(updates).length) {
            const { _teamChanged, ...dbUpdates } = updates;
            if (Object.keys(dbUpdates).length) await ds.updatePlayer(existing.id, dbUpdates);
            updated++;
          } else {
            skipped++;
          }
        } else {
          await ds.addPlayer({
            name: r.player,
            nickname: r.nickname || '',
            number: r.number || '',
            teamId: teamId || null,
            role: r.role || 'player',
            playerClass: r.playerClass || null,
            nationality: r.nationality || null,
            pbliId: r.pbliId || null,
            photoURL: r.photoURL || null,
            age: r.age ? Number(r.age) : null,
          });
          created++;
        }
      }

      importLog.push(`✅ Players: ${created} new, ${updated} updated, ${skipped} unchanged`);
      importLog.push(`✅ Teams: ${uniqueTeams.length} total`);
      setLog(importLog); setStep('done');
    } catch (e) {
      importLog.push(`❌ Error: ${e.message}`);
      setLog(importLog); setStep('done');
    }
    setImporting(false);
  };

  if (!open) return null;

  const canPreview = colMap.team && colMap.player;

  return (
    <Modal open={open} onClose={() => { onClose(); reset(); }}
      title="📋 Import CSV — teams & players">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '70vh', overflowY: 'auto' }}>

        {step === 'upload' && (
          <>
            <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textDim }}>
              CSV z drużynami i graczami. Istniejące rekordy zostaną zaktualizowane (merge) — puste pola w CSV nie nadpiszą istniejących danych.
            </div>
            <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted, background: COLORS.surfaceDark, borderRadius: 8, padding: '8px 10px' }}>
              Obsługiwane kolumny: <strong style={{ color: COLORS.text }}>team</strong>, team_id, <strong style={{ color: COLORS.text }}>name/player</strong>, nickname, number, role, class, nationality, pbli_id, photo_url, age
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textDim }}>Default league:</span>
              <Select value={league} onChange={setLeague} style={{ width: 80 }}>
                <option value="NXL">NXL</option>
                <option value="PXL">PXL</option>
                <option value="DPL">DPL</option>
              </Select>
            </div>
            <input ref={fileRef} type="file" accept=".csv,.txt,.tsv" onChange={handleFile} style={{ display: 'none' }} />
            <Btn variant="accent" onClick={() => fileRef.current?.click()} style={{ minHeight: 48 }}>
              📂 Wybierz plik CSV
            </Btn>
          </>
        )}

        {step === 'preview' && csvData && (
          <>
            <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.accent, fontWeight: 700 }}>
              {csvData.rows.length} wierszy, {csvData.headers.length} kolumn {csvData.sep === ';' && '(separator: ;)'}
            </div>

            {/* Auto-detect summary */}
            <div style={{
              fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted,
              background: COLORS.surfaceDark, borderRadius: 6, padding: '6px 10px',
            }}>
              Zmapowano automatycznie: {MAPPABLE.filter(m => colMap[m.key]).map(m => {
                const hIdx = parseInt(colMap[m.key]);
                return <span key={m.key} style={{ color: COLORS.accent }}>{m.label.replace(' *', '')} → {csvData.headers[hIdx]}</span>;
              }).reduce((acc, el, i) => i === 0 ? [el] : [...acc, ', ', el], [])}
              {MAPPABLE.filter(m => !colMap[m.key] && !m.required).length > 0 && (
                <span style={{ color: COLORS.textDim }}> · {MAPPABLE.filter(m => !colMap[m.key] && !m.required).length} pominięto</span>
              )}
            </div>

            {/* Column mapping grid */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6,
            }}>
              {MAPPABLE.map(m => (
                <div key={m.key}>
                  <div style={{
                    fontFamily: FONT, fontSize: 10, color: m.required ? COLORS.text : COLORS.textDim,
                    marginBottom: 2, fontWeight: m.required ? 700 : 500,
                  }}>{m.label}</div>
                  <Select value={colMap[m.key] || ''} onChange={v => setColMap(p => ({ ...p, [m.key]: v }))}
                    style={{ width: '100%', fontSize: 12 }}>
                    <option value="">{m.required ? '— required —' : '— skip —'}</option>
                    {csvData.headers.map((h, i) => <option key={i} value={String(i)}>{h}</option>)}
                  </Select>
                </div>
              ))}
            </div>

            <Btn variant="default" onClick={handlePreview} disabled={!canPreview}>
              🔍 Preview
            </Btn>

            {preview && (
              <>
                <div style={{
                  fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.text,
                  background: COLORS.surfaceDark, borderRadius: 8, padding: '10px 12px',
                  display: 'flex', flexDirection: 'column', gap: 4,
                }}>
                  <Row label="Teams" create={preview.newTeams} update={preview.updTeams} />
                  <Row label="Players" create={preview.newPlayers} update={preview.updPlayers} />
                </div>

                {/* Sample rows */}
                <div style={{ maxHeight: 160, overflowY: 'auto', fontSize: FONT_SIZE.xs, fontFamily: FONT }}>
                  {parsed.slice(0, 15).map((r, i) => {
                    const tMatch = matchTeam(r.team, r.teamExtId, teams);
                    const pMatch = tMatch ? matchPlayer(r.player, r.pbliId, tMatch.id, players) : null;
                    return (
                      <div key={i} style={{ padding: '2px 0', color: COLORS.textDim, display: 'flex', gap: 4, alignItems: 'baseline' }}>
                        <span style={{ color: tMatch ? COLORS.textMuted : COLORS.success, fontSize: 9, flexShrink: 0 }}>
                          {tMatch ? '∙' : '＋'}
                        </span>
                        <span style={{ color: COLORS.accent, flexShrink: 0 }}>{r.team}</span>
                        <span style={{ color: COLORS.textMuted }}>→</span>
                        <span style={{ color: pMatch ? COLORS.text : COLORS.success }}>
                          {r.player}
                        </span>
                        {r.number && <span style={{ color: COLORS.textMuted }}>#{r.number}</span>}
                        {r.role && r.role !== 'player' && <span style={{ color: COLORS.textMuted, fontSize: 9 }}>({r.role})</span>}
                        {r.nationality && <span style={{ fontSize: 9 }}>{r.nationality}</span>}
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
            <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.base, color: COLORS.text }}>Importowanie...</div>
          </div>
        )}

        {step === 'done' && (
          <>
            <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.base, fontWeight: 700, color: COLORS.success }}>✅ Import zakończony</div>
            <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textDim }}>
              {log.map((l, i) => <div key={i}>{l}</div>)}
            </div>
            <Btn variant="accent" onClick={() => { onClose(); reset(); }}>Zamknij</Btn>
          </>
        )}
      </div>
    </Modal>
  );
}

// ─── Matching helpers ──────────────────────────────────────────

function matchTeam(name, extId, teams) {
  if (extId) {
    const byExt = teams.find(t => t.externalId && t.externalId === extId);
    if (byExt) return byExt;
  }
  return teams.find(t => t.name.toLowerCase() === name.toLowerCase()) || null;
}

function matchPlayer(name, pbliId, teamId, players) {
  // 1st: by pbliId (globally unique)
  if (pbliId) {
    const byPbli = players.find(p => p.pbliId && p.pbliId === pbliId);
    if (byPbli) return byPbli;
  }
  // 2nd: by name + same team
  if (teamId) {
    const byNameTeam = players.find(p =>
      p.name.toLowerCase() === name.toLowerCase() && p.teamId === teamId
    );
    if (byNameTeam) return byNameTeam;
  }
  // 3rd: by name (any team, including unassigned)
  return players.find(p =>
    p.name.toLowerCase() === name.toLowerCase() && (!p.teamId || !teamId)
  ) || null;
}

// ─── UI helpers ────────────────────────────────────────────────

function Row({ label, create, update }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 600, color: COLORS.text }}>{label}</span>
      <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textDim }}>
        {create > 0 && <span style={{ color: COLORS.success, fontWeight: 700 }}>+{create} nowych</span>}
        {create > 0 && update > 0 && ', '}
        {update > 0 && <span style={{ color: COLORS.accent, fontWeight: 700 }}>{update} aktualizacji</span>}
        {create === 0 && update === 0 && <span style={{ color: COLORS.textMuted }}>bez zmian</span>}
      </span>
    </div>
  );
}
