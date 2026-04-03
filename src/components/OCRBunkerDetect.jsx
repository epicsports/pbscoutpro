/**
 * OCRBunkerDetect — uses Claude Vision to read bunker names from layout image.
 * Shows results as markers, user accepts/rejects.
 */
import React, { useState } from 'react';
import { Btn, Input, Icons } from './ui';
import { guessType, typeData } from './BunkerCard';
import { COLORS, FONT, TOUCH } from '../utils/theme';
import { uid } from '../utils/helpers';

const API_KEY_STORAGE = 'pbscoutpro_anthropic_key';
function getApiKey() { return localStorage.getItem(API_KEY_STORAGE) || ''; }
function setApiKeyStorage(key) { localStorage.setItem(API_KEY_STORAGE, key); }

export default function OCRBunkerDetect({ image, onAccept, onClose }) {
  const [apiKey, setApiKey] = useState(getApiKey());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null); // [{name, x, y}]
  const [selected, setSelected] = useState(new Set()); // indices to include

  const detect = async () => {
    if (!image || !apiKey) { setError('Image and API key required'); return; }
    setApiKeyStorage(apiKey);
    setLoading(true); setError(null); setResults(null);
    try {
      // Strip data:image/...;base64, prefix
      const base64 = image.includes(',') ? image.split(',')[1] : image;
      const mediaType = image.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';

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
              { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
              { type: 'text', text: `Analyze this NXL paintball field layout image. Find all bunker labels/names visible on the image. For each bunker, return its name and approximate position as x,y coordinates where (0,0)=top-left, (1,1)=bottom-right. Return ONLY a valid JSON array, no other text: [{"name":"D1","x":0.25,"y":0.15}, ...]. Include mirror pairs (same name on both sides). Common bunker names: D1,D2,D3,D50,S1,S2,S3,S50,Snake,Dorito,Can,Brick,Temple,Wing,Dallas,Dog,Hammer,Ring,Cobra,Palma,MD,SD,GB,MW,TCK,GW.` }
            ],
          }],
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `API error ${response.status}`);
      }

      const data = await response.json();
      const text = data.content?.[0]?.text || '';
      // Extract JSON array from response
      const match = text.match(/\[[\s\S]*\]/);
      if (!match) throw new Error('No JSON array in response');
      const bunkers = JSON.parse(match[0]);
      if (!Array.isArray(bunkers)) throw new Error('Response is not an array');
      setResults(bunkers);
      setSelected(new Set(bunkers.map((_, i) => i))); // select all by default
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = () => {
    if (!results) return;
    const bunkers = results
      .filter((_, i) => selected.has(i))
      .map(b => {
        const t = typeData(guessType(b.name));
        return {
          id: uid(), name: b.name, x: b.x, y: b.y,
          baType: t.abbr, heightM: t.height, widthM: t.w, depthM: t.d,
          labelOffsetY: -1,
        };
      });
    onAccept(bunkers);
    onClose();
  };

  const toggleItem = (idx) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        zIndex: 90, animation: 'fadeIn 0.15s ease-out',
      }} />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: COLORS.surface, borderTop: `1px solid ${COLORS.border}`,
        borderRadius: '14px 14px 0 0', padding: '12px 16px 16px',
        paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
        zIndex: 91, animation: 'slideUp 0.2s ease-out',
        maxHeight: '70vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0 8px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: COLORS.border }} />
        </div>

        <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: TOUCH.fontBase, color: COLORS.text, marginBottom: 10 }}>
          🔍 Detect bunkers from image
        </div>

        {/* API key */}
        {!results && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>
              Claude API key
            </div>
            <Input value={apiKey} onChange={setApiKey} placeholder="sk-ant-..."
              style={{ fontSize: TOUCH.fontSm }} />
            <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textMuted, marginTop: 4 }}>
              Key is stored locally. Never sent to our servers.
            </div>
          </div>
        )}

        {error && (
          <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.danger, marginBottom: 8, padding: 8, borderRadius: 6, background: COLORS.danger + '15' }}>
            {error}
          </div>
        )}

        {/* Results */}
        {results && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 6 }}>
              Found {results.length} bunkers — tap to toggle
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {results.map((b, i) => (
                <span key={i} onClick={() => toggleItem(i)} style={{
                  padding: '4px 8px', borderRadius: 6, cursor: 'pointer',
                  fontFamily: FONT, fontSize: TOUCH.fontXs, fontWeight: 600,
                  background: selected.has(i) ? COLORS.accent + '20' : COLORS.surfaceLight,
                  border: `1px solid ${selected.has(i) ? COLORS.accent : COLORS.border}`,
                  color: selected.has(i) ? COLORS.accent : COLORS.textMuted,
                  textDecoration: selected.has(i) ? 'none' : 'line-through',
                }}>
                  {b.name} ({Math.round(b.x * 100)}%,{Math.round(b.y * 100)}%)
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="default" onClick={onClose}>Cancel</Btn>
          <div style={{ flex: 1 }} />
          {!results ? (
            <Btn variant="accent" onClick={detect} disabled={loading || !apiKey}>
              {loading ? '⏳ Detecting...' : '🔍 Detect'}
            </Btn>
          ) : (
            <Btn variant="accent" onClick={handleAccept} disabled={selected.size === 0}>
              <Icons.Check /> Accept {selected.size} bunkers
            </Btn>
          )}
        </div>
      </div>
    </>
  );
}
