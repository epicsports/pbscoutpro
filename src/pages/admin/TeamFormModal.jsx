import React, { useEffect, useMemo, useState } from 'react';
import { Btn, Input, Modal, Select, Field } from '../../components/ui';
import RdIcon from '../../components/RdIcon';
import TeamBadge from '../../components/TeamBadge';
import { COLORS, FONT, FONT_SIZE, SPACE, RADIUS, ELEV, TRACKING, LEAGUE_COLORS } from '../../utils/theme';
import { useDevice } from '../../hooks/useDevice';
import { addTeam, updateTeam, setParentTeam } from '../../services/dataService';
import { useLeagues } from '../../hooks/useLeagues';
import TeamPickerModal from './TeamPickerModal';
import { useLanguage } from '../../hooks/useLanguage';

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
  const { t } = useLanguage();
  const isEdit = !!team;
  const leagues = useLeagues();

  const [fName, setFName] = useState('');
  const [fExternalId, setFExternalId] = useState('');
  const [fLeagues, setFLeagues] = useState([]);    // array of shortName strings
  const [fDivisions, setFDivisions] = useState({}); // { [shortName]: divName }
  const [fLogoUrl, setFLogoUrl] = useState('');     // team logo — external image URL (§93 pattern), never base64

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
    setFLogoUrl(team?.logoUrl || '');
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
        logoUrl: fLogoUrl.trim() || null,
      };
      if (isEdit) {
        await updateTeam(team.id, payload);
      } else {
        // addTeam internally dual-writes + tags originWorkspace
        await addTeam(payload);
      }
      // Catalog version bump now happens inside addTeam/updateTeam/setParentTeam.
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

  const wide = useDevice().width >= 720;

  return (
    <>
      <Modal
        open={open && !pickerMode}
        onClose={onClose}
        maxWidth={wide ? 680 : undefined}
        title={isEdit ? t('team_form_title_edit', team?.name || 'team') : t('team_form_title_new')}
        footer={<>
          {isEdit && !isRetired && onRequestRetire && (
            <Btn variant="danger" onClick={() => onRequestRetire(liveTeam)} disabled={saving} style={{ marginRight: 'auto' }}>
              {t('team_form_retire_btn')}
            </Btn>
          )}
          {isEdit && isRetired && (
            <span style={{
              marginRight: 'auto',
              fontFamily: FONT, fontSize: 11, color: COLORS.textMuted,
            }}>
              {t('team_form_retired_hint')}
            </span>
          )}
          <Btn variant="default" onClick={onClose} disabled={saving}>{t('cancel')}</Btn>
          <Btn variant="accent" onClick={handleSave} disabled={saving}>{saving ? t('saving') : t('save')}</Btn>
        </>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.md }}>

          {/* Premium crest preview — live from name + logo (color crest / initials fallback). */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 14, background: `linear-gradient(120deg, ${(team?.color || COLORS.accent)}1f, ${(team?.color || COLORS.accent)}08 46%, transparent 72%), ${ELEV.surface}`, border: `1px solid ${ELEV.hairline}`, boxShadow: ELEV.shadow1 }}>
            <TeamBadge team={{ name: fName, color: team?.color, logoUrl: fLogoUrl.trim() || null }} size={56} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: FONT, fontSize: 18, fontWeight: 800, color: fName ? COLORS.text : COLORS.textMuted, letterSpacing: TRACKING.tight, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fName || t('team_form_name_ph')}</div>
              {fLeagues.length > 0 && <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: COLORS.textDim, letterSpacing: TRACKING.label, textTransform: 'uppercase', marginTop: 3 }}>{fLeagues.join(' · ')}</div>}
            </div>
          </div>

          {/* Identity */}
          <SectionHeader>{t('team_form_section_identity')}</SectionHeader>
          <FieldRow label={t('team_form_team_name_label')} error={errors.name} required>
            <Input value={fName} onChange={setFName} placeholder={t('team_form_name_ph')} error={!!errors.name} autoFocus />
          </FieldRow>
          <FieldRow label={t('team_form_ext_id_label')} hint={t('team_form_ext_id_hint')}>
            <Input value={fExternalId} onChange={setFExternalId} placeholder={t('team_form_ext_id_ph')} />
          </FieldRow>
          {/* Team logo — external image URL (kept as a link, never uploaded — § 93 quota
              pattern). Live preview is the crest header above (color crest / initials fallback). */}
          <FieldRow label={t('wsadmin_logo_label')}>
            <Input value={fLogoUrl} onChange={setFLogoUrl} placeholder="https://…/logo.png" />
          </FieldRow>

          <FieldRow label={t('team_form_leagues_label')} error={errors.leagues} hint={t('team_form_leagues_hint')} required>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: SPACE.xs }}>
              {leagues.map(L => {
                const active = fLeagues.includes(L.shortName);
                const lc = LEAGUE_COLORS[L.shortName] || COLORS.accent;
                return (
                  <div key={L.id || L.shortName} className="rd-press" role="button" tabIndex={0} aria-pressed={active}
                    onClick={() => toggleLeague(L.shortName)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleLeague(L.shortName); } }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 13px', minHeight: 40, borderRadius: 999, cursor: 'pointer', fontFamily: FONT, fontSize: 13, fontWeight: 800, letterSpacing: '.3px', background: active ? `${lc}26` : ELEV.sunken, color: active ? lc : COLORS.textDim, border: `1px solid ${active ? lc + '80' : ELEV.hairline}`, transition: 'all .12s' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: lc, opacity: active ? 1 : 0.5 }} />
                    {L.shortName}
                  </div>
                );
              })}
            </div>
          </FieldRow>

          {fLeagues.length > 0 && (
            <FieldRow label={t('divisions_label')}>
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
                          <option value="">{t('team_form_none_option')}</option>
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
              <SectionHeader>{t('team_form_section_sister')}</SectionHeader>
              {hasParent && (
                <RelationCard
                  label={t('team_form_parent_label')}
                  team={parentTeam}
                  childCount={(childrenByParent[parentTeam.id] || []).length}
                  onChange={() => setPickerMode('parent')}
                  onRemove={handleRemoveParent}
                  t={t}
                />
              )}
              {hasChildren && (
                <div>
                  <div style={{
                    fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 600,
                    color: COLORS.textDim, marginBottom: 4,
                  }}>
                    {t('team_form_children_label', childTeams.length)}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.xs }}>
                    {childTeams.map(c => (
                      <RelationCard
                        key={c.id}
                        label={t('team_form_child_label')}
                        team={c}
                        childCount={0}
                        onRemove={() => handleRemoveChild(c.id)}
                        t={t}
                      />
                    ))}
                  </div>
                </div>
              )}
              {!hasParent && !hasChildren && (
                <div style={{ display: 'flex', gap: SPACE.xs }}>
                  <Btn variant="default" onClick={() => setPickerMode('parent')}>{t('team_form_designate_parent')}</Btn>
                  <Btn variant="default" onClick={() => setPickerMode('child')}>{t('team_form_add_child')}</Btn>
                </div>
              )}
              {!hasParent && hasChildren && (
                <Btn variant="default" onClick={() => setPickerMode('child')}>{t('team_form_add_another_child')}</Btn>
              )}
              <div style={{
                padding: SPACE.xs, borderRadius: RADIUS.sm, backgroundColor: ELEV.sunken,
                fontFamily: FONT, fontSize: 11, color: COLORS.textMuted, lineHeight: 1.5,
              }}>
                {t('team_form_sister_note')}
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
                <span style={{ display: 'inline-flex', transform: showAudit ? 'rotate(90deg)' : 'none', transition: 'transform .15s', color: COLORS.textMuted }}><RdIcon name="chevron" size={12} /></span> {t('team_form_audit_toggle')}
              </button>
              {showAudit && (
                <div style={{ padding: SPACE.sm, borderRadius: RADIUS.md, backgroundColor: ELEV.sunken, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <AuditRow label="ID" value={<code style={{ color: COLORS.text }}>{liveTeam?.id}</code>} />
                  <AuditRow label={t('team_form_audit_origin')} value={liveTeam?.originWorkspace || '—'} />
                  <AuditRow label={t('team_form_audit_created')} value={formatTs(liveTeam?.createdAt)} />
                  <AuditRow label={t('team_form_audit_updated')} value={formatTs(liveTeam?.updatedAt)} />
                  <AuditRow label={t('team_form_audit_migrated')} value={formatTs(liveTeam?.migratedAt)} />
                  {isRetired && (
                    <>
                      <AuditRow label={t('team_form_audit_retired_at')} value={formatTs(liveTeam.retiredAt)} />
                      <AuditRow label={t('team_form_audit_retired_by')} value={liveTeam.retiredBy || '—'} />
                      <AuditRow label={t('team_form_audit_reason')} value={liveTeam.retirementReason || '—'} />
                      {liveTeam.canonicalReplacementId && (
                        <AuditRow label={t('team_form_audit_canonical')} value={<code style={{ color: COLORS.text }}>{liveTeam.canonicalReplacementId}</code>} />
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

function RelationCard({ label, team, childCount, onChange, onRemove, t }) {
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
          {childCount > 0 ? ` · ${t('team_form_child_count', childCount)}` : ''}
        </div>
      </div>
      {onChange && (
        <Btn variant="default" size="sm" onClick={onChange}>{t('team_form_change_btn')}</Btn>
      )}
      {onRemove && (
        <Btn variant="default" size="sm" onClick={onRemove} style={{ color: COLORS.danger }}>{t('delete')}</Btn>
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

// Routes the form's rows through the premium <Field> primitive (eyebrow label +
// discreet required-mark + error/hint). One swap upgrades every field label.
function FieldRow({ label, error, hint, children, required }) {
  return (
    <Field label={label} error={error} hint={hint} required={required}>
      {children}
    </Field>
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
