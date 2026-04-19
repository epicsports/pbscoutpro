import React, { useState, useMemo, useEffect } from 'react';
import { StickyNote, ChevronRight } from 'lucide-react';
import { COLORS, FONT } from '../utils/theme';
import { Modal, ActionSheet, Btn } from './ui';
import { useLanguage } from '../hooks/useLanguage';

// Permission: coach/admin see all notes; anyone else (viewer) sees own only.
export function filterVisibleNotes(notes, userId, role) {
  if (role === 'admin' || role === 'coach') return notes;
  return notes.filter(n => n.authorId === userId);
}

// Relative time formatter (Firestore Timestamp | millis | null)
function useTimeAgo() {
  const { t } = useLanguage();
  return (ts) => {
    if (!ts) return '';
    const time = ts.toMillis ? ts.toMillis() : ts;
    const mins = Math.floor((Date.now() - time) / 60000);
    if (mins < 1) return t('time_now');
    if (mins < 60) return t('time_min_ago', mins);
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return t('time_hr_ago', hrs);
    const days = Math.floor(hrs / 24);
    if (days < 7) return t('time_day_ago', days);
    return new Date(time).toLocaleDateString();
  };
}

function NotesHeader() {
  const { t } = useLanguage();
  return (
    <div style={{
      padding: '18px 16px 8px',
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <StickyNote size={18} color={COLORS.text} strokeWidth={2} />
      <div style={{
        fontFamily: FONT, fontSize: 15, fontWeight: 700,
        color: COLORS.text, letterSpacing: '-0.01em',
      }}>{t('section_notes')}</div>
    </div>
  );
}

export function NotatkiSection({ notes, userId, userRole, onAdd, onEdit, onDelete }) {
  const { t } = useLanguage();
  const timeAgo = useTimeAgo();
  const [expanded, setExpanded] = useState(false);

  const visibleNotes = useMemo(
    () => filterVisibleNotes(notes, userId, userRole),
    [notes, userId, userRole]
  );
  const unseen = visibleNotes.filter(n => !(n.seenBy || []).includes(userId));

  if (visibleNotes.length === 0) {
    return (
      <>
        <NotesHeader />
        <div style={{ margin: '0 16px 12px' }}>
          <button onClick={onAdd} style={{
            width: '100%', padding: '12px 14px', borderRadius: 8,
            background: 'transparent',
            border: `1px dashed ${COLORS.border}`,
            color: COLORS.textDim,
            fontFamily: FONT, fontSize: 12, fontWeight: 700,
            cursor: 'pointer', minHeight: 44,
          }}>{t('notes_add')}</button>
        </div>
      </>
    );
  }

  return (
    <>
      <NotesHeader />
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          margin: `0 16px ${expanded ? 8 : 12}px`,
          padding: '10px 12px',
          background: COLORS.surfaceDark,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 8,
          display: 'flex', alignItems: 'center', gap: 8,
          cursor: 'pointer', minHeight: 44,
        }}>
        <div style={{
          flex: 1,
          fontFamily: FONT, fontSize: 13, fontWeight: 700,
          color: COLORS.text,
        }}>
          {visibleNotes.length} {visibleNotes.length === 1 ? t('notes_one') : t('notes_many')}
        </div>
        {unseen.length > 0 && !expanded && (
          <div style={{
            padding: '2px 7px', borderRadius: 10,
            background: COLORS.accent, color: '#000',
            fontFamily: FONT, fontSize: 10, fontWeight: 800,
          }}>{unseen.length}</div>
        )}
        <ChevronRight
          size={16}
          color={COLORS.textMuted}
          style={{
            transform: expanded ? 'rotate(90deg)' : 'none',
            transition: 'transform 0.2s',
          }}
        />
      </div>
      {expanded && (
        <>
          <div style={{
            margin: '0 16px 8px',
            background: COLORS.surfaceDark,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 8, overflow: 'hidden',
          }}>
            {visibleNotes.map((n, i) => {
              const isUnseen = !(n.seenBy || []).includes(userId);
              const canEdit = n.authorId === userId || userRole === 'coach' || userRole === 'admin';
              return (
                <NoteRow
                  key={n.id}
                  note={n}
                  isUnseen={isUnseen}
                  canEdit={canEdit}
                  isLast={i === visibleNotes.length - 1}
                  timeAgo={timeAgo}
                  onEdit={() => onEdit(n)}
                  onDelete={() => onDelete(n.id)}
                />
              );
            })}
          </div>
          <div style={{ margin: '0 16px 12px' }}>
            <button onClick={onAdd} style={{
              width: '100%', padding: '10px 12px', borderRadius: 8,
              background: COLORS.surface,
              border: `1px solid ${COLORS.border}`,
              color: COLORS.accent,
              fontFamily: FONT, fontSize: 12, fontWeight: 700,
              cursor: 'pointer', minHeight: 44,
            }}>{t('notes_add')}</button>
          </div>
        </>
      )}
    </>
  );
}

function NoteRow({ note, isUnseen, canEdit, isLast, timeAgo, onEdit, onDelete }) {
  const { t } = useLanguage();
  const [sheetOpen, setSheetOpen] = useState(false);
  return (
    <>
      <div
        onClick={canEdit ? () => setSheetOpen(true) : undefined}
        style={{
          padding: '12px 14px',
          borderBottom: isLast ? 'none' : `1px solid ${COLORS.border}`,
          background: isUnseen ? `${COLORS.accent}08` : 'transparent',
          position: 'relative',
          cursor: canEdit ? 'pointer' : 'default',
        }}>
        {isUnseen && (
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
            background: COLORS.accent,
          }} />
        )}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
          <span style={{
            fontFamily: FONT, fontSize: 11, fontWeight: 700, color: COLORS.text,
          }}>{note.authorName}</span>
          <span style={{
            fontFamily: FONT, fontSize: 10, color: COLORS.textMuted,
          }}>· {timeAgo(note.createdAt)}</span>
          {isUnseen && (
            <span style={{
              marginLeft: 'auto',
              padding: '1px 5px', borderRadius: 3,
              background: `${COLORS.accent}20`, color: COLORS.accent,
              fontFamily: FONT, fontSize: 9, fontWeight: 800, letterSpacing: 0.6,
            }}>{t('notes_new')}</span>
          )}
        </div>
        <div style={{
          fontFamily: FONT, fontSize: 13, color: COLORS.text, lineHeight: 1.5,
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>{note.content}</div>
      </div>
      <ActionSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        actions={[
          { label: t('notes_edit'), onPress: onEdit },
          { label: t('notes_delete'), danger: true, onPress: onDelete },
        ]}
      />
    </>
  );
}

export function AddNoteSheet({ open, onClose, onSave, editingNote, teamName }) {
  const { t } = useLanguage();
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setContent(editingNote?.content || '');
  }, [open, editingNote]);

  const handleSave = async () => {
    const trimmed = content.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      await onSave(trimmed);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('note_sheet_title', teamName || '')}
      footer={
        <div style={{ display: 'flex', gap: 8, width: '100%' }}>
          <Btn variant="ghost" onClick={onClose} style={{ flex: 1 }}>
            {t('cancel')}
          </Btn>
          <Btn
            variant="accent"
            onClick={handleSave}
            disabled={!content.trim() || saving}
            style={{ flex: 2 }}
          >
            {t('note_save')}
          </Btn>
        </div>
      }
    >
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={t('note_sheet_placeholder')}
        autoFocus
        style={{
          width: '100%', minHeight: 120, boxSizing: 'border-box',
          padding: 12, borderRadius: 8,
          background: COLORS.bg, border: `1px solid ${COLORS.border}`,
          color: COLORS.text, fontFamily: FONT, fontSize: 14,
          lineHeight: 1.5, resize: 'vertical', outline: 'none',
        }}
      />
    </Modal>
  );
}

export function UnseenNotesModal({ open, onClose, notes, teamName, onMarkAllSeen }) {
  const { t } = useLanguage();
  const timeAgo = useTimeAgo();
  if (!open) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, zIndex: 1000,
    }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 360,
          background: COLORS.surface,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 16, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          maxHeight: '85dvh',
        }}>
        <div style={{
          padding: '16px 16px 10px',
          borderBottom: `1px solid ${COLORS.border}`,
        }}>
          <div style={{
            fontFamily: FONT, fontSize: 16, fontWeight: 800, color: COLORS.text,
            marginBottom: 4,
          }}>{t('notes_modal_title', teamName || '')}</div>
          <div style={{
            fontFamily: FONT, fontSize: 11, color: COLORS.textDim,
          }}>{t('notes_modal_subtitle', notes.length)}</div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {notes.map((n, i) => (
            <div key={n.id} style={{
              padding: '12px 16px',
              borderBottom: i < notes.length - 1 ? `1px solid ${COLORS.border}` : 'none',
            }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: COLORS.text }}>
                  {n.authorName}
                </span>
                <span style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textMuted }}>
                  · {timeAgo(n.createdAt)}
                </span>
              </div>
              <div style={{
                fontFamily: FONT, fontSize: 13, color: COLORS.text, lineHeight: 1.5,
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>
                {n.content}
              </div>
            </div>
          ))}
        </div>
        <div style={{
          padding: 12,
          borderTop: `1px solid ${COLORS.border}`,
          display: 'flex', gap: 8,
        }}>
          <Btn variant="ghost" onClick={onClose} style={{ flex: 1 }}>
            {t('later')}
          </Btn>
          <Btn variant="accent" onClick={onMarkAllSeen} style={{ flex: 2 }}>
            {t('notes_mark_all_seen')}
          </Btn>
        </div>
      </div>
    </div>
  );
}
