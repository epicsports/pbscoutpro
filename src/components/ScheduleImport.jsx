import React, { useState, useRef } from 'react';
import { Btn, Input, Select, Icons, Modal } from './ui';
import { COLORS, FONT, TOUCH } from '../utils/theme';

/**
 * ScheduleImport — OCR-based tournament schedule import
 * 
 * Flow:
 * 1. User uploads photo of schedule
 * 2. Claude Vision extracts matches + tournament metadata
 * 3. User maps team names to existing teams (or creates new)
 * 4. System creates scouted entries + linked matches
 */

const API_KEY_STORAGE = 'pbscoutpro_anthropic_key';

function getApiKey() { return localStorage.getItem(API_KEY_STORAGE) || ''; }
function setApiKeyStorage(key) { localStorage.setItem(API_KEY_STORAGE, key); }

// Fuzzy match team name against existing teams
function findBestMatch(name, teams) {
  const n = name.toLowerCase().trim();
  const exact = teams.find(t => t.name.toLowerCase() === n);
  if (exact) return { team: exact, score: 1 };
  const contains = teams.find(t => n.includes(t.name.toLowerCase()) || t.name.toLowerCase().includes(n));
  if (contains) return { team: contains, score: 0.7 };
  const nWords = n.split(/\s+/);
  let best = null, bestScore = 0;
  for (const t of teams) {
    const tWords = t.name.toLowerCase().split(/\s+/);
    const overlap = nWords.filter(w => tWords.some(tw => tw === w || tw.includes(w) || w.includes(tw))).length;
    const score = overlap / Math.max(nWords.length, tWords.length);
    if (score > bestScore) { best = t; bestScore = score; }
  }
  if (bestScore > 0.3) return { team: best, score: bestScore };
  return null;
}

export default function ScheduleImport({ open, onClose, tournament, teams, scouted, players, ds, tournamentId }) {
  const [step, setStep] = useState('upload'); // upload | processing | review | importing | done
  const [apiKey, setApiKey] = useState(getApiKey());
  const [showKeyInput, setShowKeyInput] = useState(!getApiKey());
  const [imageData, setImageData] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [error, setError] = useState('');
  const [ocrResult, setOcrResult] = useState(null); // {meta, matches}
  const [mappings, setMappings] = useState([]); // [{teamA, teamB, mappingA, mappingB, createA, createB}]
  const [importing, setImporting] = useState(false);
  const [importLog, setImportLog] = useState([]);
  const fileRef = useRef(null);

  // ─── Image upload ───
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setError('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target.result.split(',')[1];
      const mediaType = file.type || 'image/jpeg';
      setImageData({ base64, mediaType });
      setImagePreview(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  // ─── OCR via Claude Vision ───
  const handleOCR = async () => {
    if (!imageData || !apiKey) { setError('Brak zdjęcia lub klucza API'); return; }
    setApiKeyStorage(apiKey);
    setStep('processing');
    setError('');

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: imageData.mediaType, data: imageData.base64 },
              },
              {
                type: 'text',
                text: `Extract the tournament schedule from this image. Return ONLY valid JSON, no markdown, no backticks, no explanation.

Format:
{
  "meta": {
    "league": "string or null",
    "event": "string or null",
    "division": "string or null",
    "location": "string or null",
    "date": "YYYY-MM-DD or null",
    "rules": "string or null"
  },
  "matches": [
    {"game": 1, "time": "08:30", "teamA": "RANGER Warsaw", "teamB": "RING Warsaw", "group": "A", "round": "PRELIMS"},
    ...
  ]
}

Rules:
- Extract ALL matches with concrete team names (skip placeholder matches like "1st place group A vs 2nd place group B")
- Keep original team name spelling from the image
- group and round can be null if not visible
- For time, use HH:MM format
- Return ONLY the JSON object`
              }
            ]
          }]
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.content?.map(c => c.text || '').join('') || '';
      
      // Parse JSON — strip any markdown fences, fix truncated JSON
      let clean = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      let parsed;
      try {
        parsed = JSON.parse(clean);
      } catch (e1) {
        // Try fixing truncated JSON by adding closing brackets
        let attempt = clean;
        for (let i = 0; i < 5; i++) {
          try { parsed = JSON.parse(attempt + ']}'); break; } catch {}
          try { parsed = JSON.parse(attempt + '"]}'); break; } catch {}
          try { parsed = JSON.parse(attempt + '"}]}'); break; } catch {}
          attempt = attempt.slice(0, -1);
        }
        if (!parsed) throw new Error(`OCR nie powiódł się: ${e1.message}. Spróbuj z mniejszym zdjęciem lub wyraźniejszą rozpiską.`);
      }

      setOcrResult(parsed);

      // Auto-map teams
      const uniqueTeams = new Map();
      (parsed.matches || []).forEach(m => {
        if (m.teamA) uniqueTeams.set(m.teamA, true);
        if (m.teamB) uniqueTeams.set(m.teamB, true);
      });

      const teamList = [...uniqueTeams.keys()];
      const autoMappings = teamList.map(name => {
        const match = findBestMatch(name, teams);
        return {
          scheduleName: name,
          mappedTeamId: match?.team?.id || '',
          confidence: match?.score || 0,
          create: false,
        };
      });

      // Build match mappings
      const matchMappings = (parsed.matches || []).map(m => ({
        ...m,
        mappingA: autoMappings.find(a => a.scheduleName === m.teamA)?.mappedTeamId || '',
        mappingB: autoMappings.find(a => a.scheduleName === m.teamB)?.mappedTeamId || '',
      }));

      setMappings(matchMappings);
      setStep('review');
    } catch (e) {
      console.error('OCR failed:', e);
      setError(`OCR nie powiódł się: ${e.message}`);
      setStep('upload');
    }
  };

  // ─── Update mapping ───
  const updateMapping = (idx, side, value) => {
    setMappings(prev => prev.map((m, i) => {
      if (i !== idx) return m;
      return side === 'A' ? { ...m, mappingA: value } : { ...m, mappingB: value };
    }));
  };

  // ─── Global team mapping (unique teams) ───
  const uniqueTeamNames = [...new Set(mappings.flatMap(m => [m.teamA, m.teamB]))];
  const teamMappingState = {};
  uniqueTeamNames.forEach(name => {
    const firstMatch = mappings.find(m => m.teamA === name);
    const firstMatchB = mappings.find(m => m.teamB === name);
    teamMappingState[name] = firstMatch?.mappingA || firstMatchB?.mappingB || '';
  });

  const updateGlobalMapping = (name, value) => {
    setMappings(prev => prev.map(m => ({
      ...m,
      mappingA: m.teamA === name ? value : m.mappingA,
      mappingB: m.teamB === name ? value : m.mappingB,
    })));
  };

  // ─── Import ───
  const handleImport = async () => {
    setImporting(true);
    setStep('importing');
    const log = [];
    try {
      // Update tournament metadata
      if (ocrResult?.meta) {
        const meta = ocrResult.meta;
        const updates = {};
        if (meta.location) updates.location = meta.location;
        if (meta.date) updates.date = meta.date;
        if (meta.division) updates.division = meta.division;
        if (meta.rules) updates.rules = meta.rules;
        if (meta.event && !tournament.name) updates.name = meta.event;
        if (Object.keys(updates).length) {
          await ds.updateTournament(tournamentId, updates);
          log.push(`✅ Zaktualizowano dane turnieju`);
        }
      }

      // Create teams that need creating & scouted entries
      const teamIdMap = {}; // scheduleName → teamId
      const scoutedIdMap = {}; // teamId → scoutedId

      // First pass: resolve all team IDs
      for (const name of uniqueTeamNames) {
        const mapping = teamMappingState[name];
        if (mapping === '__new__' || !mapping) {
          // Create new team with league + division from OCR
          const ocrDiv = ocrResult?.meta?.division || tournament.division || null;
          const divisions = ocrDiv ? { [tournament.league]: ocrDiv } : {};
          const ref = await ds.addTeam({ name, leagues: [tournament.league], divisions });
          teamIdMap[name] = ref.id;
          log.push(`➕ Utworzono drużynę: ${name}${ocrDiv ? ` (${ocrDiv})` : ''}`);
        } else {
          teamIdMap[name] = mapping;
        }
      }

      // Ensure all teams have scouted entries
      for (const name of uniqueTeamNames) {
        const teamId = teamIdMap[name];
        let scoutedEntry = scouted.find(s => s.teamId === teamId);
        if (!scoutedEntry) {
          const teamRoster = players.filter(p => p.teamId === teamId).map(p => p.id);
          const ref = await ds.addScoutedTeam(tournamentId, { teamId, roster: teamRoster });
          scoutedIdMap[teamId] = ref.id;
          log.push(`➕ Dodano do turnieju: ${name}`);
        } else {
          scoutedIdMap[teamId] = scoutedEntry.id;
        }
      }

      // Create matches — one match per game (not two!)
      let created = 0, skipped = 0;
      for (const m of mappings) {
        const teamIdA = teamIdMap[m.teamA];
        const teamIdB = teamIdMap[m.teamB];
        if (!teamIdA || !teamIdB) { skipped++; continue; }

        const scoutedIdA = scoutedIdMap[teamIdA];
        const scoutedIdB = scoutedIdMap[teamIdB];
        if (!scoutedIdA || !scoutedIdB) { skipped++; continue; }

        const teamAName = teams.find(t => t.id === teamIdA)?.name || m.teamA;
        const teamBName = teams.find(t => t.id === teamIdB)?.name || m.teamB;

        await ds.addMatch(tournamentId, {
          teamA: scoutedIdA,
          teamB: scoutedIdB,
          name: `${teamAName} vs ${teamBName}`,
          time: m.time || null,
          gameNumber: m.game || null,
        });
        created++;
      }

      log.push(`✅ Utworzono ${created} meczy (${skipped} pominięto)`);
      setImportLog(log);
      setStep('done');
    } catch (e) {
      console.error('Import failed:', e);
      log.push(`❌ Błąd: ${e.message}`);
      setImportLog(log);
      setStep('done');
    }
    setImporting(false);
  };

  const allMapped = uniqueTeamNames.every(name => teamMappingState[name]);

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title="📋 Import rozpiski z obrazu">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '70vh', overflowY: 'auto' }}>

        {/* API key setup */}
        {showKeyInput && (
          <div style={{ padding: 10, background: COLORS.surfaceLight, borderRadius: 8, border: `1px solid ${COLORS.border}` }}>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.textDim, marginBottom: 6 }}>
              Klucz Anthropic API (zapisany w przeglądarce)
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <Input value={apiKey} onChange={setApiKey} placeholder="sk-ant-..." style={{ flex: 1, fontSize: TOUCH.fontSm }} />
              <Btn variant="accent" size="sm" onClick={() => { setApiKeyStorage(apiKey); setShowKeyInput(false); }}>
                <Icons.Check /> Zapisz
              </Btn>
            </div>
          </div>
        )}

        {!showKeyInput && apiKey && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.success }}>✅ API key ustawiony</span>
            <Btn variant="ghost" size="sm" onClick={() => setShowKeyInput(true)} style={{ fontSize: TOUCH.fontXs }}>Zmień</Btn>
          </div>
        )}

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.textDim }}>
              Zrób zdjęcie rozpiski turniejowej i wgraj tutaj. Claude przeczyta tabelkę i wyciągnie mecze.
            </div>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleImageSelect} style={{ display: 'none' }} />
            <Btn variant="default" onClick={() => fileRef.current?.click()} style={{ minHeight: 48 }}>
              📷 {imagePreview ? 'Zmień zdjęcie' : 'Wybierz zdjęcie rozpiski'}
            </Btn>
            {imagePreview && (
              <div style={{ borderRadius: 8, overflow: 'hidden', border: `1px solid ${COLORS.border}` }}>
                <img src={imagePreview} alt="Schedule" style={{ width: '100%', display: 'block', maxHeight: 300, objectFit: 'contain' }} />
              </div>
            )}
            {error && <div style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.danger }}>{error}</div>}
            <Btn variant="accent" onClick={handleOCR} disabled={!imageData || !apiKey}
              style={{ minHeight: 48, justifyContent: 'center' }}>
              🔍 Odczytaj rozpiskę (Claude Vision)
            </Btn>
          </>
        )}

        {/* Step 2: Processing */}
        {step === 'processing' && (
          <div style={{ textAlign: 'center', padding: 30 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔄</div>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontBase, color: COLORS.text }}>Claude czyta rozpiskę...</div>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.textDim, marginTop: 6 }}>To może potrwać kilka sekund</div>
          </div>
        )}

        {/* Step 3: Review & map teams */}
        {step === 'review' && ocrResult && (
          <>
            {/* Meta info */}
            {ocrResult.meta && (
              <div style={{ padding: 10, background: COLORS.surfaceLight, borderRadius: 8, border: `1px solid ${COLORS.border}` }}>
                <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, fontWeight: 700, color: COLORS.textDim, textTransform: 'uppercase', marginBottom: 4 }}>Dane turnieju</div>
                {ocrResult.meta.event && <div style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.text }}>{ocrResult.meta.event}</div>}
                {ocrResult.meta.division && <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim }}>Dywizja: {ocrResult.meta.division}</div>}
                {ocrResult.meta.location && <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim }}>📍 {ocrResult.meta.location}</div>}
                {ocrResult.meta.date && <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim }}>📅 {ocrResult.meta.date}</div>}
                {ocrResult.meta.rules && <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim }}>📋 {ocrResult.meta.rules}</div>}
              </div>
            )}

            {/* Team mapping — global (per unique team name) */}
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, fontWeight: 700, color: COLORS.accent }}>
              Dopasuj drużyny ({uniqueTeamNames.length}):
            </div>
            {uniqueTeamNames.map(name => {
              const currentMapping = teamMappingState[name];
              const bestMatch = findBestMatch(name, teams);
              return (
                <div key={name} style={{
                  display: 'flex', gap: 8, alignItems: 'center', padding: '6px 0',
                  borderBottom: `1px solid ${COLORS.border}20`,
                }}>
                  <span style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.text, fontWeight: 600, minWidth: 100, flex: '0 0 auto' }}>
                    {name}
                  </span>
                  <span style={{ fontSize: 10, color: COLORS.textMuted }}>→</span>
                  <select value={currentMapping} onChange={e => updateGlobalMapping(name, e.target.value)}
                    style={{
                      flex: 1, fontFamily: FONT, fontSize: TOUCH.fontSm, padding: 6, borderRadius: 6,
                      background: COLORS.bg, color: currentMapping ? COLORS.text : COLORS.textMuted,
                      border: `1px solid ${currentMapping ? COLORS.success + '60' : COLORS.border}`,
                      minHeight: 36,
                    }}>
                    <option value="">— dopasuj —</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    <option value="__new__">➕ Utwórz nową: "{name}"</option>
                  </select>
                  {bestMatch && bestMatch.score >= 0.7 && (
                    <span style={{ fontSize: 9, color: COLORS.success, whiteSpace: 'nowrap' }}>auto ✅</span>
                  )}
                </div>
              );
            })}

            {/* Match list preview */}
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginTop: 8 }}>
              {mappings.length} meczy do zaimportowania
            </div>
            <div style={{ maxHeight: 150, overflowY: 'auto', fontSize: TOUCH.fontXs, fontFamily: FONT, color: COLORS.textMuted }}>
              {mappings.map((m, i) => (
                <div key={i} style={{ padding: '2px 0' }}>
                  {m.game && `#${m.game} `}{m.time && `${m.time} `}{m.teamA} vs {m.teamB}
                </div>
              ))}
            </div>

            {error && <div style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.danger }}>{error}</div>}

            <div style={{ display: 'flex', gap: 8 }}>
              <Btn variant="default" onClick={() => { setStep('upload'); setParsedMatches([]); }}>← Wróć</Btn>
              <Btn variant="accent" onClick={handleImport} disabled={!allMapped || importing}
                style={{ flex: 1, justifyContent: 'center', minHeight: 48 }}>
                <Icons.Check /> Importuj {mappings.length} meczy
              </Btn>
            </div>
          </>
        )}

        {/* Step 4: Importing */}
        {step === 'importing' && (
          <div style={{ textAlign: 'center', padding: 30 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontBase, color: COLORS.text }}>Importuję...</div>
          </div>
        )}

        {/* Step 5: Done */}
        {step === 'done' && (
          <>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontBase, fontWeight: 700, color: COLORS.success }}>
              ✅ Import zakończony
            </div>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.textDim }}>
              {importLog.map((l, i) => <div key={i}>{l}</div>)}
            </div>
            <Btn variant="accent" onClick={onClose} style={{ justifyContent: 'center' }}>Zamknij</Btn>
          </>
        )}
      </div>
    </Modal>
  );
}
