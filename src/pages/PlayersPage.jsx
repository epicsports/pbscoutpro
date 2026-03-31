import React, { useState } from 'react';
import { useModal } from '../hooks/useModal';
import { useDevice } from '../hooks/useDevice';
import Header from '../components/Header';
import { Btn, Card, SectionTitle, EmptyState, Modal, Input, Select, Icons , ConfirmModal} from '../components/ui';
import { usePlayers, useTeams } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { COLORS, FONT, TOUCH, BUNKER_TYPES , responsive } from '../utils/theme';
import { playerDisplayName } from '../utils/helpers';

export default function PlayersPage() {
  const { players, loading } = usePlayers();
  const { teams } = useTeams();
  const device = useDevice();
  const R = responsive(device.type);
    const modal = useModal();
  const [search, setSearch] = useState('');

  // Form state
  const [fName, setFName] = useState('');
  const [fNick, setFNick] = useState('');
  const [fNumber, setFNumber] = useState('');
  const [fAge, setFAge] = useState('');
  const [fTeamId, setFTeamId] = useState('');
  const [fPbliId, setFPbliId] = useState('');
  const [fFavBunker, setFFavBunker] = useState('');
  const [fComment, setFComment] = useState('');

  const filtered = players.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (p.name || '').toLowerCase().includes(q) ||
      (p.nickname || '').toLowerCase().includes(q) ||
      (p.number || '').includes(q);
  });

  const resetForm = () => { setFName(''); setFNick(''); setFNumber(''); setFAge(''); setFTeamId(''); setFPbliId(''); setFFavBunker(''); setFComment(''); };

  const openAdd = () => { resetForm(); modal.open('add'); };

  const openEdit = (p) => {
    setFName(p.name || ''); setFNick(p.nickname || ''); setFNumber(p.number || '');
    setFAge(p.age || ''); setFTeamId(p.teamId || ''); setFPbliId(p.pbliId || '');
    setFFavBunker(p.favoriteBunker || '');
    setFComment(p.comment || '');
    modal.open({ type: 'edit', player: p });
  };

  const handleAdd = async () => {
    if (!fName.trim() || !fNumber.trim()) return;
    await ds.addPlayer({
      name: fName.trim(), nickname: fNick.trim(), number: fNumber.trim(),
      age: fAge ? Number(fAge) : null, teamId: fTeamId || null,
      pbliId: fPbliId.trim() || null, favoriteBunker: fFavBunker || null,
      comment: fComment.trim() || null,
    });
    modal.close(); resetForm();
  };

  const handleEdit = async () => {
    if (!modal.value?.player || !fName.trim() || !fNumber.trim()) return;
    const p = modal.value?.player;
    if (fTeamId !== (p.teamId || '')) {
      await ds.changePlayerTeam(p.id, fTeamId || null, p.teamHistory || []);
    }
    await ds.updatePlayer(p.id, {
      name: fName.trim(), nickname: fNick.trim(), number: fNumber.trim(),
      age: fAge ? Number(fAge) : null,
      pbliId: fPbliId.trim() || null, favoriteBunker: fFavBunker || null,
      comment: fComment.trim() || null,
    });
    modal.close(); resetForm();
  };

  const handleDelete = async (id) => { await ds.deletePlayer(id); modal.close(); };

  const getTeamName = (teamId) => teams.find(t => t.id === teamId)?.name || '—';

  const formatDate = (iso) => { try { return new Date(iso).toLocaleDateString('pl-PL'); } catch { return iso; } };

;

  return (
    <div style={{ minHeight: '100vh', maxWidth: R.layout.maxWidth || 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <Header breadcrumbs={['Players']} />
      <div style={{ flex: 1, overflowY: 'auto', padding: R.layout.padding }}>
        <SectionTitle right={<Btn variant="accent" onClick={openAdd}><Icons.Plus /> Player</Btn>}>
          <Icons.DB /> Players ({players.length})
        </SectionTitle>

        {/* Search */}
        <div style={{ marginBottom: 12, position: 'reyoive' }}>
          <Input value={search} onChange={setSearch} placeholder="🔍 Search po imieniu, ksywce, numerze..." />
        </div>

        {loading && <EmptyState icon="⏳" text="Loading..." />}
        {!loading && !filtered.length && <EmptyState icon="👤" text={search ? 'No wyników' : 'Add playerów do bazy'} />}

        {filtered.map(p => (
          <Card key={p.id}
            icon={<span style={{ fontWeight: 800, fontSize: TOUCH.fontBase, color: COLORS.accent }}>#{p.number}</span>}
            title={<span>{p.name} {p.nickname && <span style={{ color: COLORS.textDim, fontWeight: 400 }}>„{p.nickname}"</span>}</span>}
            subtitle={[getTeamName(p.teamId), p.age && `${p.age} yo`, p.favoriteBunker, p.comment && `💬 ${p.comment.slice(0, 30)}`].filter(Boolean).join(' · ')}
            onClick={() => openEdit(p)}
            actions={
              <span onClick={e => e.stopPropagation()}>
                <Btn variant="ghost" size="sm" onClick={() => modal.open({ type: 'delete', id: p.id, name: playerDisplayName(p) })}><Icons.Trash /></Btn>
              </span>
            } />
        ))}
      </div>

      {/* Add */}
      <Modal open={modal.is('add')} onClose={() => modal.close()} title="New player"
        footer={<>
          <Btn variant="default" onClick={() => modal.close()}>Cancel</Btn>
          <Btn variant="accent" onClick={handleAdd} disabled={!fName.trim() || !fNumber.trim()}><Icons.Check /> Add</Btn>
        </>}>
        
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 2 }}><Input value={fName} onChange={setFName} placeholder="Name / nazwisko *" /></div>
        <div style={{ flex: 1 }}><Input value={fNumber} onChange={setFNumber} placeholder="Nr *" /></div>
      </div>
      <Input value={fNick} onChange={setFNick} placeholder="Nickname (opcjonalnie)" />
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Team</div>
          <Select value={fTeamId} onChange={setFTeamId} style={{ width: '100%' }}>
            <option value="">— none —</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Age</div>
          <Input value={fAge} onChange={setFAge} placeholder="e.g. 25" type="number" />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>PBLI ID</div>
          <Input value={fPbliId} onChange={setFPbliId} placeholder="Profile number" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Favorite bunker</div>
          <Select value={fFavBunker} onChange={setFFavBunker} style={{ width: '100%' }}>
            <option value="">— none —</option>
            {BUNKER_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
          </Select>
        </div>
      </div>
      {/* Comment */}
      <div>
        <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Comment</div>
        <textarea value={fComment} onChange={e => setFComment(e.target.value)} placeholder="Notatki o playeru..."
          style={{ width: '100%', fontFamily: FONT, fontSize: TOUCH.fontSm, padding: '8px 10px', borderRadius: 6, background: COLORS.bg, color: COLORS.text, border: `1px solid ${COLORS.border}`, minHeight: 60, resize: 'vertical', boxSizing: 'border-box' }} />
      </div>
      {/* Team history — only show in edit mode */}
      {isEdit && modal.value?.player?.teamHistory?.length > 0 && (
        <div>
          <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>History teams</div>
          <div style={{ background: COLORS.bg, borderRadius: 6, padding: 8, maxHeight: 120, overflowY: 'auto' }}>
            {modal.value?.player?.teamHistory?.map((h, i) => (
              <div key={i} style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.text, padding: '3px 0', display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ color: COLORS.accent, fontWeight: 700 }}>{getTeamName(h.teamId)}</span>
                <span style={{ color: COLORS.textMuted }}>{formatDate(h.from)} → {h.to ? formatDate(h.to) : 'teraz'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
      </Modal>

      {/* Edit */}
      <Modal open={modal.is('edit')} onClose={() => modal.close()} title="Edit playera"
        footer={<>
          <Btn variant="default" onClick={() => modal.close()}>Cancel</Btn>
          <Btn variant="accent" onClick={handleEdit} disabled={!fName.trim() || !fNumber.trim()}><Icons.Check /> Save</Btn>
        </>}>
        
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 2 }}><Input value={fName} onChange={setFName} placeholder="Name / nazwisko *" /></div>
        <div style={{ flex: 1 }}><Input value={fNumber} onChange={setFNumber} placeholder="Nr *" /></div>
      </div>
      <Input value={fNick} onChange={setFNick} placeholder="Nickname (opcjonalnie)" />
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Team</div>
          <Select value={fTeamId} onChange={setFTeamId} style={{ width: '100%' }}>
            <option value="">— none —</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Age</div>
          <Input value={fAge} onChange={setFAge} placeholder="e.g. 25" type="number" />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>PBLI ID</div>
          <Input value={fPbliId} onChange={setFPbliId} placeholder="Profile number" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Favorite bunker</div>
          <Select value={fFavBunker} onChange={setFFavBunker} style={{ width: '100%' }}>
            <option value="">— none —</option>
            {BUNKER_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
          </Select>
        </div>
      </div>
      {/* Comment */}
      <div>
        <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Comment</div>
        <textarea value={fComment} onChange={e => setFComment(e.target.value)} placeholder="Notatki o playeru..."
          style={{ width: '100%', fontFamily: FONT, fontSize: TOUCH.fontSm, padding: '8px 10px', borderRadius: 6, background: COLORS.bg, color: COLORS.text, border: `1px solid ${COLORS.border}`, minHeight: 60, resize: 'vertical', boxSizing: 'border-box' }} />
      </div>
      {/* Team history — only show in edit mode */}
      {isEdit && modal.value?.player?.teamHistory?.length > 0 && (
        <div>
          <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>History teams</div>
          <div style={{ background: COLORS.bg, borderRadius: 6, padding: 8, maxHeight: 120, overflowY: 'auto' }}>
            {modal.value?.player?.teamHistory?.map((h, i) => (
              <div key={i} style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.text, padding: '3px 0', display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ color: COLORS.accent, fontWeight: 700 }}>{getTeamName(h.teamId)}</span>
                <span style={{ color: COLORS.textMuted }}>{formatDate(h.from)} → {h.to ? formatDate(h.to) : 'teraz'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
      </Modal>

      <ConfirmModal open={modal.is('delete')} onClose={() => modal.close()}
        title="Delete playera?" danger confirmLabel="Delete"
        message={`Delete "${modal.value?.name}"?`}
        onConfirm={() => handleDelete(modal.value?.id)} />
    </div>
  );
}
