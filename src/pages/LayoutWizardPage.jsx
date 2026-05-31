/**
 * LayoutWizardPage — layout creation wizard
 * Route: /layout/new
 * Steps when ENABLE_VISION_API=true:  1. Basic Info → 2. Calibrate → 3. Vision Scan
 * Steps when ENABLE_VISION_API=false: 1. Basic Info → 2. Calibrate  (Finish → bunker editor for manual entry)
 *
 * Vision Scan step gating per DESIGN_DECISIONS § 65 (locked 2026-05-20).
 */
import React, { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDevice } from '../hooks/useDevice';
import PageHeader from '../components/PageHeader';
import { Btn, Input, Select } from '../components/ui';
import { useIsSuperAdmin } from '../hooks/useIsSuperAdmin';
import * as ds from '../services/dataService';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH, LEAGUE_COLORS, responsive } from '../utils/theme';
import { useLeagues } from '../hooks/useLeagues';
import { compressImage, yearOptions } from '../utils/helpers';
import CalibrationView from '../components/CalibrationView';
import VisionScan from '../components/VisionScan';
import { STATIC_FLAGS } from '../utils/featureFlags';

// ── ProgressBar ──
function ProgressBar({ step, total }) {
  return (
    <div style={{ display: 'flex', gap: 4, padding: `${SPACE.md}px ${SPACE.lg}px 0` }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{
          flex: 1, height: 3, borderRadius: 2,
          background: i < step ? COLORS.accent : COLORS.border,
        }} />
      ))}
    </div>
  );
}

// ── Step 1: Basic Info ──
function WizardStep1({ data, setData, onNext }) {
  const fileRef = useRef(null);
  const leagues = useLeagues();
  const leagueOptions = useMemo(() => [...leagues.map(l => l.shortName), 'Other'], [leagues]);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const compressed = await compressImage(ev.target.result, 1200);
      setData(prev => ({ ...prev, image: compressed }));
    };
    reader.readAsDataURL(file);
  };

  const canNext = data.name.trim().length > 0 && data.image !== null;

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: SPACE.lg, display: 'flex', flexDirection: 'column', gap: SPACE.lg }}>
      {/* Section label */}
      <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1.2 }}>
        Basic info
      </div>

      {/* Name */}
      <Input value={data.name} onChange={v => setData(prev => ({ ...prev, name: v }))}
        placeholder="Layout name, e.g. NXL 2026 Event 1" autoFocus />

      {/* League + Year */}
      <div style={{ display: 'flex', gap: SPACE.md }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: SPACE.xs }}>League</div>
          <div style={{ display: 'flex', gap: SPACE.xs, flexWrap: 'wrap' }}>
            {leagueOptions.map(lg => (
              <Btn key={lg} variant="default" size="sm"
                active={data.league === lg}
                style={{
                  borderColor: data.league === lg ? (LEAGUE_COLORS[lg] || COLORS.accent) : COLORS.border,
                  color: data.league === lg ? (LEAGUE_COLORS[lg] || COLORS.accent) : COLORS.textDim,
                }}
                onClick={() => setData(prev => ({ ...prev, league: lg }))}>{lg}</Btn>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: SPACE.xs }}>Year</div>
          <Select value={data.year} onChange={v => setData(prev => ({ ...prev, year: Number(v) }))}>
            {yearOptions().map(y => <option key={y} value={y}>{y}</option>)}
          </Select>
        </div>
      </div>

      {/* Custom league input */}
      {data.league === 'Other' && (
        <Input value={data.customLeague} onChange={v => setData(prev => ({ ...prev, customLeague: v }))}
          placeholder="Custom league name" />
      )}

      {/* Image upload */}
      <div>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
        {!data.image ? (
          <div onClick={() => fileRef.current?.click()} style={{
            border: `2px dashed ${COLORS.border}`, borderRadius: RADIUS.lg,
            padding: `${SPACE.xxl}px ${SPACE.lg}px`, textAlign: 'center', cursor: 'pointer',
            background: COLORS.surfaceLight,
          }}>
            <div style={{ fontSize: 32, marginBottom: SPACE.sm }}>📷</div>
            <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textDim }}>
              Upload field image
            </div>
            <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: SPACE.xs }}>
              Tap to select
            </div>
          </div>
        ) : (
          <div style={{ borderRadius: RADIUS.lg, overflow: 'hidden', border: `1px solid ${COLORS.border}`, position: 'relative' }}>
            <img src={data.image} alt="Field preview" style={{ width: '100%', display: 'block', objectFit: 'contain', maxHeight: 200 }} />
            <Btn variant="ghost" size="sm" onClick={() => fileRef.current?.click()}
              style={{ position: 'absolute', bottom: SPACE.xs, right: SPACE.xs, background: COLORS.surface + 'cc' }}>
              Change
            </Btn>
          </div>
        )}
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Next button */}
      <Btn variant="accent" onClick={onNext} disabled={!canNext}
        style={{ width: '100%', justifyContent: 'center', minHeight: 52, fontSize: FONT_SIZE.lg, fontWeight: 800 }}>
        Next →
      </Btn>
    </div>
  );
}

// ── Main page ──
export default function LayoutWizardPage() {
  const navigate = useNavigate();
  const device = useDevice();
  const R = responsive(device.type);
  const isSuper = useIsSuperAdmin();   // § 96 — creating a layout = creating a shared global base (super_admin only)

  const [step, setStep] = useState(1);
  const [data, setData] = useState({
    name: '',
    league: 'NXL',
    customLeague: '',
    year: new Date().getFullYear(),
    image: null,
    calibration: { homeBase: { x: 0.05, y: 0.5 }, awayBase: { x: 0.95, y: 0.5 } },
    doritoSide: 'top',
    mirrorMode: 'y',
    bunkers: [],
  });

  const handleFinish = async () => {
    const ref = await ds.createBaseLayout({
      name: data.name.trim(),
      league: data.league === 'Other' ? data.customLeague.trim() : data.league,
      year: Number(data.year),
      fieldImage: data.image,
      fieldCalibration: data.calibration,
      doritoSide: data.doritoSide,
      mirrorMode: data.mirrorMode,
      bunkers: data.bunkers,
      discoLine: 0.30,
      zeekerLine: 0.80,
    });
    navigate(`/layout/${ref.id}/bunkers`);
  };

  const handleBack = () => {
    if (step === 1) navigate('/layouts');
    else setStep(step - 1);
  };

  // § 65 / Q3 — Vision Scan step (step 3) hidden when ENABLE_VISION_API=false.
  // Wizard collapses to 2 steps; step 2's existing "Finish →" button completes
  // the layout, then navigates to the bunker editor for manual entry. The
  // step 3 render block stays in place — gated below — so re-enabling the
  // flag (post Cloud Function migration) restores the full 3-step flow.
  const visionEnabled = STATIC_FLAGS.ENABLE_VISION_API;
  const totalSteps = visionEnabled ? 3 : 2;
  const stepLabels = visionEnabled
    ? ['BASIC INFO', 'CALIBRATE', 'SCAN BUNKERS']
    : ['BASIC INFO', 'CALIBRATE'];

  // § 96 — new layouts are shared global bases, authored by the platform admin
  // only. Coaches add an existing base to their workspace from the library
  // (STAGE 2) rather than creating geometry from scratch.
  if (!isSuper) {
    return (
      <div style={{ minHeight: '100vh', maxWidth: R.layout.maxWidth || 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
        <PageHeader back={{ to: () => navigate('/layouts') }} title="New layout" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: SPACE.lg, textAlign: 'center' }}>
          <div style={{ color: COLORS.textMuted, fontFamily: FONT, fontSize: FONT_SIZE.base, lineHeight: 1.5, maxWidth: 320 }}>
            New field layouts are added to the shared library by the platform admin. Browse the library to add an existing field to your workspace.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', maxWidth: R.layout.maxWidth || 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        back={{ to: handleBack }}
        title="New layout"
        subtitle={`STEP ${step} OF ${totalSteps} · ${stepLabels[step - 1] || ''}`}
      />
      <ProgressBar step={step} total={totalSteps} />
      {step === 1 && <WizardStep1 data={data} setData={setData} onNext={() => setStep(2)} />}
      {step === 2 && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', paddingTop: SPACE.md, paddingBottom: SPACE.lg }}>
          {/* Section label */}
          <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1.2, padding: `0 ${SPACE.lg}px`, marginBottom: SPACE.sm }}>
            Calibrate field
          </div>
          <CalibrationView
            image={data.image}
            calibration={data.calibration}
            onChange={cal => setData(prev => ({ ...prev, calibration: cal }))}
            doritoSide={data.doritoSide}
            onDoritoSideChange={side => setData(prev => ({ ...prev, doritoSide: side }))}
          />
          <div style={{ flex: 1 }} />
          <div style={{ padding: `${SPACE.lg}px` }}>
            <Btn variant="accent" onClick={handleFinish}
              style={{ width: '100%', justifyContent: 'center', minHeight: 52, fontSize: FONT_SIZE.lg, fontWeight: 800 }}>
              Finish →
            </Btn>
          </div>
        </div>
      )}
      {step === 3 && visionEnabled && (
        <VisionScan
          image={data.image}
          calibration={data.calibration}
          doritoSide={data.doritoSide}
          onComplete={async (bunkers) => {
            setData(prev => ({ ...prev, bunkers }));
            // Finish wizard
            const ref = await ds.createBaseLayout({
              name: data.name.trim(),
              league: data.league === 'Other' ? data.customLeague.trim() : data.league,
              year: Number(data.year),
              fieldImage: data.image,
              fieldCalibration: data.calibration,
              doritoSide: data.doritoSide,
              mirrorMode: data.mirrorMode,
              bunkers,
              discoLine: 0.30,
              zeekerLine: 0.80,
            });
            navigate(`/layout/${ref.id}/bunkers`);
          }}
          onSkip={handleFinish}
        />
      )}
    </div>
  );
}
