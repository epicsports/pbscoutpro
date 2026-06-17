import React from 'react';
import { useNavigate } from 'react-router-dom';
import { COLORS } from '../../utils/theme';
import { useLanguage } from '../../hooks/useLanguage';
import { MoreSection, MoreItem } from './MoreShell';

// "Take a Break" — the very-bottom drawer entry to Reads Mini (§117). Ungated
// (recreational, every role). Shared by MoreTabContent + TrainingMoreTab so the
// entry is identical in both drawer contexts. Icon = the Reads brand mark
// (amber dot + seam), matching NavDrawer's ReadsBallButton.
function ReadsMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" style={{ display: 'block' }} aria-hidden>
      <circle cx="12" cy="12" r="8" fill={COLORS.accent} />
      <rect x="2" y="11" width="20" height="2" fill={COLORS.bg} />
    </svg>
  );
}

export default function TakeABreakSection() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  return (
    <MoreSection title={t('reads_mini_section') || 'Arcade'}>
      <MoreItem
        icon={<ReadsMark />}
        testId="take-a-break-entry"
        label={t('reads_mini_menu_label') || 'Take a Break'}
        sub={t('reads_mini_menu_sub') || 'Reads Mini · catch game'}
        onClick={() => navigate('/break')}
        isLast
      />
    </MoreSection>
  );
}
