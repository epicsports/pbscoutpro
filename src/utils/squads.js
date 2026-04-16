/**
 * Squad metadata — single source of truth for training squad colors/names.
 * Used by TrainingScoutTab, TrainingCoachTab, SquadEditor, etc.
 */
export const SQUADS = [
  { key: 'red',    name: 'R1', color: '#ef4444' },
  { key: 'blue',   name: 'R2', color: '#3b82f6' },
  { key: 'green',  name: 'R3', color: '#22c55e' },
  { key: 'yellow', name: 'R4', color: '#eab308' },
];

export const SQUAD_KEYS = SQUADS.map(s => s.key);

export const squadByKey = (k) => SQUADS.find(s => s.key === k);
export const squadName = (k) => squadByKey(k)?.name || k;
export const squadColor = (k) => squadByKey(k)?.color || '#64748b';

// Object format for quick lookup: { red: { name, color }, ... }
export const SQUAD_MAP = Object.fromEntries(SQUADS.map(s => [s.key, { name: s.name, color: s.color }]));
