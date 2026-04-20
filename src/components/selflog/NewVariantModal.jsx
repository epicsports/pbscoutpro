import React, { useState, useEffect } from 'react';
import { Modal, Btn, Input } from '../ui';
import { COLORS, FONT, FONT_SIZE, SPACE } from '../../utils/theme';
import { useLanguage } from '../../hooks/useLanguage';

/**
 * New breakout variant modal. Writes to team-level shared pool so every
 * player on the team sees the same vocabulary.
 *
 * @param {boolean} open
 * @param {string} bunkerName - current breakout bunker (e.g. 'D3')
 * @param {Array<{variantName}>} existingVariants - shown as reference
 * @param {(name: string) => Promise<void>} onSave - parent handles addBreakoutVariant
 * @param {() => void} onClose
 */
export default function NewVariantModal({ open, bunkerName, existingVariants = [], onSave, onClose }) {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) setName(''); }, [open]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      await onSave(trimmed);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const subtitle = (typeof t('variant_new_subtitle') === 'function'
    ? t('variant_new_subtitle', bunkerName || '—')
    : `Dla breakout ${bunkerName || '—'} · dostępne dla całego zespołu`);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('variant_new_title') || 'Nowy wariant'}
      footer={
        <div style={{ display: 'flex', gap: SPACE.sm, width: '100%' }}>
          <Btn variant="ghost" onClick={onClose} style={{ flex: 1 }}>
            {t('cancel')}
          </Btn>
          <Btn
            variant="accent"
            onClick={handleSave}
            disabled={!name.trim() || saving}
            style={{ flex: 2 }}
          >
            {t('variant_add') || 'Dodaj wariant'}
          </Btn>
        </div>
      }
    >
      <div style={{
        fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textDim,
        marginBottom: SPACE.md, lineHeight: 1.5,
      }}>
        {subtitle}
      </div>
      <Input
        value={name}
        onChange={setName}
        placeholder={t('variant_new_placeholder') || 'np. ze ślizgu, late break, strzelaniem…'}
        autoFocus
      />
      {existingVariants.length > 0 && (
        <div style={{ marginTop: SPACE.md }}>
          <div style={{
            fontFamily: FONT, fontSize: FONT_SIZE.xxs, color: COLORS.textMuted,
            letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: SPACE.xs,
          }}>
            {t('variant_existing_label') || 'Warianty już w zespole:'}
          </div>
          <div style={{
            fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textDim,
            fontStyle: 'italic',
          }}>
            {existingVariants.map(v => v.variantName).join(' · ')}
          </div>
        </div>
      )}
    </Modal>
  );
}
