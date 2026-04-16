import React, { useState, useRef } from 'react';
import { Btn, Icons, Modal, Select } from './ui';
import { COLORS, FONT, TOUCH } from '../utils/theme';

/**
 * CSVImport — import teams + players from CSV
 * Supports: Team,Player or any CSV with team/name columns
 */
export default function CSVImport({ open, onClose, teams, players, ds }) {
  const [step, setStep] = useState('upload'); // upload|preview|importing|done
  const [csvData, setCsvData] = useState(null); // { headers, rows }
  const [colMap, setColMap] = useState({ team: '', player: '', number: '' });
  const [parsed, setParsed] = useState([]); // [{ team, player, number }]
  const [importing, setImporting] = useState(false);
  const [log, setLog] = useState([]);
  const [league, setLeague] = useState('NXL');
  const fileRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) return;
      const headers = lines[0].split(',').map(h => h.trim());
      const rows = lines.slice(1).map(l => {
        // Handle CSV with commas in quotes
        const cols = [];
        let cur = '', inQ = false;
        for (const c of l) {
          if (c === '"') { inQ = !inQ; continue; }
          if (c === ',' && !inQ) { cols.push(cur.trim()); cur = ''; continue; }
          cur += c;
        }
        cols.push(cur.trim());
        return cols;
      });
      setCsvData({ headers, rows });
      // Auto-detect columns
      // lint-ignore-polish: matching Polish CSV headers from user files
      const teamIdx = headers.findIndex(h => h.toLowerCase().includes('team') || h.toLowerCase().includes('dru\u017Cyna'));
      const playerIdx = headers.findIndex(h => h.toLowerCase().includes('player') || h.toLowerCase().includes('name') || h.toLowerCase().includes('gracz') || h.toLowerCase().includes('imi\u0119'));
      const numberIdx = headers.findIndex(h => h.toLowerCase().includes('number') || h.toLowerCase().includes('numer') || h.toLowerCase() === '#');
      setColMap({
        team: teamIdx >= 0 ? String(teamIdx) : '',
        player: playerIdx >= 0 ? String(playerIdx) : '',
        number: numberIdx >= 0 ? String(numberIdx) : '',
      });
      setStep('preview');
    };
    reader.readAsText(file);
  };

  const handleParse = () => {
    if (!csvData || !colMap.team || !colMap.player) return;
    const ti = parseInt(colMap.team), pi = parseInt(colMap.player), ni = colMap.number ? parseInt(colMap.number) : -1;
    const result = csvData.rows.map(r => ({
      team: r[ti] || '',
      player: r[pi] || '',
      number: ni >= 0 ? (r[ni] || '') : '',
    })).filter(r => r.team && r.player);
    setParsed(result);
  };

  const handleImport = async () => {
    setImporting(true);
    setStep('importing');
    const importLog = [];
    try {
      const teamMap = {}; // name → teamId
      const uniqueTeams = [...new Set(parsed.map(r => r.team))];

      // Create teams
      for (const tName of uniqueTeams) {
        const existing = teams.find(t => t.name.toLowerCase() === tName.toLowerCase());
        if (existing) {
          teamMap[tName] = existing.id;
        } else {
          const ref = await ds.addTeam({ name: tName, leagues: [league] });
          teamMap[tName] = ref.id;
          importLog.push(`➕ Team: ${tName}`);
        }
      }

      // Create players
      let created = 0, skipped = 0;
      for (const r of parsed) {
        const teamId = teamMap[r.team];
        const existing = players.find(p =>
          p.name.toLowerCase() === r.player.toLowerCase() &&
          (p.teamId === teamId || !p.teamId)
        );
        if (existing) {
          skipped++;
          // Update team if needed
          if (teamId && existing.teamId !== teamId) {
            await ds.changePlayerTeam(existing.id, teamId, existing.teamHistory || []);
          }
        } else {
          await ds.addPlayer({ name: r.player, number: r.number || '', teamId });
          created++;
        }
      }

      importLog.push(`✅ ${created} new players, ${skipped} existing`);
      importLog.push(`✅ ${uniqueTeams.length} teams`);
      setLog(importLog);
      setStep('done');
    } catch (e) {
      importLog.push(`❌ Error: ${e.message}`);
      setLog(importLog);
      setStep('done');
    }
    setImporting(false);
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={() => { onClose(); setStep('upload'); setCsvData(null); setParsed([]); }} title="📋 Import CSV — teams & players">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '70vh', overflowY: 'auto' }}>

        {step === 'upload' && (
          <>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.textDim }}>
              Select a CSV file with teams and players. Format: team name column + player name column.
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim }}>Liga:</span>
              <Select value={league} onChange={setLeague} style={{ width: 80 }}>
                <option value="NXL">NXL</option>
                <option value="PXL">PXL</option>
                <option value="DPL">DPL</option>
              </Select>
            </div>
            <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} style={{ display: 'none' }} />
            <Btn variant="accent" onClick={() => fileRef.current?.click()} style={{ minHeight: 48 }}>
              📂 Select CSV file
            </Btn>
          </>
        )}

        {step === 'preview' && csvData && (
          <>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.accent, fontWeight: 700 }}>
              {csvData.rows.length} rows, {csvData.headers.length} columns
            </div>
            {/* Column mapping */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Column: Team *</div>
                <Select value={colMap.team} onChange={v => setColMap(p => ({ ...p, team: v }))} style={{ width: '100%' }}>
                  <option value="">—</option>
                  {csvData.headers.map((h, i) => <option key={i} value={String(i)}>{h}</option>)}
                </Select>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Column: Player *</div>
                <Select value={colMap.player} onChange={v => setColMap(p => ({ ...p, player: v }))} style={{ width: '100%' }}>
                  <option value="">—</option>
                  {csvData.headers.map((h, i) => <option key={i} value={String(i)}>{h}</option>)}
                </Select>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Column: Number</div>
                <Select value={colMap.number} onChange={v => setColMap(p => ({ ...p, number: v }))} style={{ width: '100%' }}>
                  <option value="">— none —</option>
                  {csvData.headers.map((h, i) => <option key={i} value={String(i)}>{h}</option>)}
                </Select>
              </div>
            </div>

            <Btn variant="default" onClick={handleParse} disabled={!colMap.team || !colMap.player}>🔍 Preview</Btn>

            {/* Preview */}
            {parsed.length > 0 && (
              <>
                <div style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.success }}>
                  {parsed.length} players in {[...new Set(parsed.map(r => r.team))].length} teams
                </div>
                <div style={{ maxHeight: 200, overflowY: 'auto', fontSize: TOUCH.fontXs, fontFamily: FONT }}>
                  {parsed.slice(0, 20).map((r, i) => (
                    <div key={i} style={{ padding: '2px 0', color: COLORS.textDim }}>
                      <span style={{ color: COLORS.accent }}>{r.team}</span> → {r.player} {r.number && `#${r.number}`}
                    </div>
                  ))}
                  {parsed.length > 20 && <div style={{ color: COLORS.textMuted }}>...and {parsed.length - 20} more</div>}
                </div>
                <Btn variant="accent" onClick={handleImport} style={{ minHeight: 48, justifyContent: 'center' }}>
                  <Icons.Check /> Import {parsed.length} players
                </Btn>
              </>
            )}
          </>
        )}

        {step === 'importing' && (
          <div style={{ textAlign: 'center', padding: 30 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontBase, color: COLORS.text }}>Importing...</div>
          </div>
        )}

        {step === 'done' && (
          <>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontBase, fontWeight: 700, color: COLORS.success }}>✅ Import complete</div>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.textDim }}>
              {log.map((l, i) => <div key={i}>{l}</div>)}
            </div>
            <Btn variant="accent" onClick={() => { onClose(); setStep('upload'); setCsvData(null); setParsed([]); }}>Close</Btn>
          </>
        )}
      </div>
    </Modal>
  );
}
