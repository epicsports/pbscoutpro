import React, { useEffect, useMemo, useState } from 'react';
import { Btn, Input, Modal, Select } from '../../components/ui';
import { COLORS, FONT, FONT_SIZE, SPACE, RADIUS } from '../../utils/theme';
import { addTeam, updateTeam, setParentTeam, bumpCatalogVersion } from '../../services/dataService';
import { useLeagues } from '../../hooks/useLeagues';
import TeamPickerModal from './TeamPickerModal';

// Phase 2.3.c — create/edit modal for global /teams/{teamId}.
// Per DESIGN_DECISIONS § 63.15.2 + § 63.15.2.X + § 63.15.2.X.1.
//
// Sections (top to bottom):
//   1. Identity (name, externalId, leagues multi-select, per-league division)
//   2. Sister team relationship (card-style parent + children, with picker)
//   3. Audit (collapsed; originWorkspace, timestamps, retire state, alias status)
//
// Footer: Retire (left, only if active+edit) / Cancel + Save (right).
//
// Props:
//   open
//   onClose
//   team               — null = create mode, object = edit mode
//   allTeams           — full /teams/ array (for sister picker + cycle prevention)
//   childrenByParent   — pre-computed map { parentId: childTeam[] }
//   onRequestRetire    — parent owns retire confirmation modal (children-orphan
//                        safety lives in AdminTeamsPage)
export default function TeamFormModal({ open, onClose, team, allTeams, childrenByParent, onRequestRetire }) {
  const isEdit = !!team;
  const leagues = useLeagues();

  const [fName, setFName] = useState('');
  const [fExternalId, setFExternalId] = useState('');
  const [fLeagues, setFLeagues] = useState([]);    // array of shortName strings
  const [fDivisions, setFDivisions] = useState({}); // { [shortName]: divName }

  const [showAudit, setShowAudit] = useState(false);
  const [pickerMode, setPickerMode] = useState(null); // null | 'parent' | 'child'
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setFName(team?.name || '');
    setFExternalId(team?.externalId || '');
    setFLeagues(Array.isArray(team?.leagues) ? team.leagues : ['NXL']);
    setFDivisions(team?.divisions && typeof team.divisions === 'object' ? { ...team.divisions } : {});
    setShowAudit(false);
    setPickerMode(null);
    setErrors({});
    setSubmitError(null);
  }, [open, team]);

  // Resolve parent + children from latest allTeams (live updates)
  const liveTeam = useMemo(() => isEdit ? (allTeams.find(t => t.id === team?.id) || team) : null, [allTeams, team, isEdit]);
  const parentTeam = useMemo(() => liveTeam?.parentTeamId ? allTeams.find(t => t.id === liveTeam.parentTeamId) : null, [allTeams, liveTeam]);
  const childTeams = useMemo(() => liveTeam ? (childrenByParent[liveTeam.id] || []) : [], [childrenByParent, liveTeam]);
  const hasParent = !!parentTeam;
  const hasChildren = childTeams.length > 0;
  const isRetired = !!liveTeam?.retiredAt;

  const validate = () => {
    const e = {};
    if (!fName.trim()) e.name = 'required';
    if (fName.trim().length > 100) e.name = 'max 100 chars';
    if (!fLeagues.length) e.leagues = 'at least one league required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    setSubmitError(null);
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        name: fName.trim(),
        externalId: fExternalId.trim() || null,
        leagues: fLeagues,
        divisions: fDivisions,
      };
      if (isEdit) {
        await updateTeam(team.id, payload);
      } else {
        // addTeam internally dual-writes + tags originWorkspace
        await addTeam(payload);
      }
      // Catalog mutated via the /admin/teams form → bump so clients refresh live.
      await bumpCatalogVersion();
      onClose();
    } catch (err) {
      console.error('Team save failed:', err);
      setSubmitError(err?.message || 'Save failed — see console');
    } finally {
      setSaving(false);
    }
  };

  const handleSetParent = async (newParentId) => {
    if (!liveTeam) return;
    try {
      await setParentTeam(liveTeam.id, newParentId);
    } catch (err) {
      console.error('setParentTeam failed:', err);
      setSubmitError(err?.message || 'Could not set parent — see console');
    }
  };

  const handleAddChild = async (newChildId) => {
    if (!liveTeam) return;
    try {
      await setParentTeam(newChildId, liveTeam.id);
    } catch (err) {
      console.error('setParentTeam (add child) failed:', err);
      setSubmitError(err?.message || 'Could not add child — see console');
    }
  };

  const handleRemoveParent = async () => {
    if (!liveTeam) return;
    await setParentTeam(liveTeam.id, null);
  };

  const handleRemoveChild = async (childId) => {
    await setParentTeam(childId, null);
  };

  const toggleLeague = (shortName) => {
    setFLeagues(prev => {
      if (prev.includes(shortName)) {
        const next = prev.filter(l => l !== shortName);
        // Also clear that league's division
        setFDivisions(d => { const copy = { ...d }; delete copy[shortName]; return copy; });
        return next;
      }
      return [...prev, shortName];
    });
  };

  const formatTs = (ts) => {
    if (!ts) return '—';
    try {
      const d = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
      return d.toLocaleString('pl-PL');
    } catch { return String(ts); }
  };

  return (
    <>
      <Modal
        open={open && !pickerMode}
        onClose={onClose}
        title={isEdit ? `Edit ${team?.name || 'team'}` : 'New team'}
        footer={<>
          {isEdit && !isRetired && onRequestRetire && (
            <Btn variant="danger" onClick={() => onRequestRetire(liveTeam)} disabled={saving} style={{ marginRight: 'auto' }}>
              Retire team
            </Btn>
          )}
          {isEdit && isRetired && (
            <span style={{
              marginRight: 'auto',
              fontFamily: FONT, fontSize: 11, color: COLORS.textMuted,
            }}>
              🗄 Retired — use list "Restore" action to unretire
            </span>
          )}
          <Btn variant="default" onClick={onClose} disabled={saving}>Cancel</Btn>
          <Btn variant="accent" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Btn>
        </>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.md }}>

          {/* Identity */}
          <SectionHeader>Identity</SectionHeader>
          <FieldRow label="Team name" error={errors.name}>
            <Input value={fName} onChange={setFName} placeholder="e.g. Ranger Warsaw" autoFocus />
          </FieldRow>
          <FieldRow label="External ID (PBLeagues)" hint="Plain string — null for non-PBLeagues leagues">
            <Input value={fExternalId} onChange={setFExternalId} placeholder="e.g. n2sYlAKFA77dwkJv" />
          </FieldRow>

          <FieldRow label="Leagues" error={errors.leagues} hint="Tap to toggle league membership">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: SPACE.xs }}>
              {leagues.map(L => {
                const active = fLeagues.includes(L.shortName);
                return (
                  <Btn key={L.id || L.shortName}
                    variant={active ? 'accent' : 'default'}
                    size="sm"
                    onClick={() => toggleLeague(L.shortName)}
                  >
                    {L.shortName}
                  </Btn>
                );
              })}
            </div>
          </FieldRow>

          {fLeagues.length > 0 && (
            <FieldRow label="Divisions">
              <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.xs }}>
                {fLeagues.map(shortName => {
                  const L = leagues.find(l => l.shortName === shortName);
                  const divisions = L?.divisions || [];
                  return (
                    <div key={shortName} style={{ display: 'flex', gap: SPACE.xs, alignItems: 'center' }}>
                      <span style={{
                        minWidth: 50, fontFamily: FONT, fontSize: FONT_SIZE.xs,
                        fontWeight: 600, color: COLORS.textDim,
                      }}>{shortName}</span>
                      <div style={{ flex: 1 }}>
                        <Select
                          value={fDivisions[shortName] || ''}
                          onChange={v => setFDivisions(d => ({ ...d, [shortName]: v || null }))}
                          style={{ width: '100%' }}
                        >
                          <option value="">— none —</option>
                          {divisions.map(d => (
                            <option key={d.id || d.name} value={d.name}>{d.name}</option>
                          ))}
                        </Select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </FieldRow>
          )}

          {/* Sister team relationship (edit mode only — parent assignment needs a saved team doc) */}
          {isEdit && (
            <>
              <SectionHeader>Sister team relationship</SectionHeader>
              {hasParent && (
                <RelationCard
                  label="Parent"
                  team={parentTeam}
                  childCount={(childrenByParent[parentTeam.id] || []).length}
                  onChange={() => setPickerMode('parent')}
                  onRemove={handleRemoveParent}
                />
              )}
              {hasChildren && (
                <div>
                  <div style={{
                    fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 600,
                    color: COLORS.textDim, marginBottom: 4,
                  }}>
                    Children ({childTeams.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.xs }}>
                    {childTeams.map(c => (
                      <RelationCard
                        key={c.id}
                        label="Child"
                        team={c}
                        childCount={0}
                        onRemove={() => handleRemoveChild(c.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
              {!hasParent && !hasChildren && (
                <div style={{ display: 'flex', gap: SPACE.xs }}>
                  <Btn variant="default" onClick={() => setPickerMode('parent')}>Designate parent →</Btn>
                  <Btn variant="default" onClick={() => setPickerMode('child')}>Add child team →</Btn>
                </div>
              )}
              {!hasParent && hasChildren && (
                <Btn variant="default" onClick={() => setPickerMode('child')}>+ Add another child</Btn>
              )}
              <div style={{
                padding: SPACE.xs, borderRadius: RADIUS.sm, backgroundColor: COLORS.surfaceDark,
                fontFamily: FONT, fontSize: 11, color: COLORS.textMuted, lineHeight: 1.5,
              }}>
                Sister team relationships are in-app data only. PBLeagues does not provide hierarchy — each tenant curates per § 63.15.2.X #3.
              </div>
            </>
          )}

          {/* Audit (edit mode only, collapsed by default) */}
          {isEdit && (
            <div style={{ marginTop: SPACE.xs }}>
              <button onClick={() => setShowAudit(s => !s)} style={{
                display: 'flex', alignItems: 'center', gap: 6, background: 'transparent',
                border: 'none', cursor: 'pointer', padding: '4px 0',
                fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 600, color: COLORS.textDim,
                minHeight: 32,
              }}>
                {showAudit ? '▾' : '▸'} Audit / read-only
              </button>
              {showAudit && (
                <div style={{ padding: SPACE.sm, borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceDark, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <AuditRow label="ID" value={<code style={{ color: COLORS.text }}>{liveTeam?.id}</code>} />
                  <AuditRow label="Origin workspace" value={liveTeam?.originWorkspace || '—'} />
                  <AuditRow label="Created" value={formatTs(liveTeam?.createdAt)} />
                  <AuditRow label="Updated" value={formatTs(liveTeam?.updatedAt)} />
                  <AuditRow label="Migrated" value={formatTs(liveTeam?.migratedAt)} />
                  {isRetired && (
                    <>
                      <AuditRow label="Retired at" value={formatTs(liveTeam.retiredAt)} />
                      <AuditRow label="Retired by" value={liveTeam.retiredBy || '—'} />
                      <AuditRow label="Reason" value={liveTeam.retirementReason || '—'} />
                      {liveTeam.canonicalReplacementId && (
                        <AuditRow label="Canonical replacement" value={<code style={{ color: COLORS.text }}>{liveTeam.canonicalReplacementId}</code>} />
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {submitError && (
            <div style={{ padding: SPACE.sm, borderRadius: RADIUS.sm, backgroundColor: `${COLORS.danger}18`, fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.danger }}>
              {submitError}
            </div>
          )}
        </div>
      </Modal>

      <TeamPickerModal
        open={!!pickerMode}
        onClose={() => setPickerMode(null)}
        allTeams={allTeams}
        excludeId={liveTeam?.id}
        mode={pickerMode || 'parent'}
        onSelect={(pickedId) => {
          if (pickerMode === 'parent') handleSetParent(pickedId);
          else if (pickerMode === 'child') handleAddChild(pickedId);
        }}
      />
    </>
  );
}

function RelationCard({ label, team, childCount, onChange, onRemove }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: SPACE.sm,
      padding: SPACE.sm, borderRadius: RADIUS.md,
      background: COLORS.surfaceDark, border: `1px solid ${COLORS.border}`,
      minHeight: 56,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 6,
        background: COLORS.surface, color: COLORS.textMuted,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: FONT, fontSize: 12, fontWeight: 700,
      }}>
        {(team.name || '?').slice(0, 1).toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600, color: COLORS.text }}>
          {team.name || '—'}
        </div>
        <div style={{ fontFamily: FONT, fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>
          {label}{team.leagues?.length ? ` · ${team.leagues.join('/')}` : ''}
          {childCount > 0 ? ` · ${childCount} ${childCount === 1 ? 'child' : 'children'}` : ''}
        </div>
      </div>
      {onChange && (
        <Btn variant="default" size="sm" onClick={onChange}>Change ▾</Btn>
      )}
      {onRemove && (
        <Btn variant="default" size="sm" onClick={onRemove} style={{ color: COLORS.danger }}>Remove</Btn>
      )}
    </div>
  );
}

function SectionHeader({ children }) {
  return (
    <div style={{
      fontFamily: FONT, fontSize: 10, fontWeight: 700, color: COLORS.textMuted,
      textTransform: 'uppercase', letterSpacing: 0.5, marginTop: SPACE.xs,
    }}>{children}</div>
  );
}

function FieldRow({ label, error, hint, children }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 600, color: COLORS.textDim }}>{label}</div>
        {error && <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: COLORS.danger }}>{error}</div>}
      </div>
      {children}
      {hint && !error && (
        <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textMuted, marginTop: 2 }}>{hint}</div>
      )}
    </div>
  );
}

function AuditRow({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: SPACE.xs, alignItems: 'baseline', fontFamily: FONT, fontSize: 11 }}>
      <div style={{ minWidth: 130, color: COLORS.textMuted, fontWeight: 600 }}>{label}</div>
      <div style={{ flex: 1, color: COLORS.textDim, wordBreak: 'break-all' }}>{value}</div>
    </div>
  );
}
