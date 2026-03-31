/**
 * useConfirm — combines ConfirmModal state into one hook
 *
 * Replaces:
 *   const [deleteConfirm, setDeleteConfirm] = useState(null);
 *   ...
 *   <Btn onClick={() => setDeleteConfirm(item.id)}>Delete</Btn>
 *   <ConfirmModal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}
 *     message={`Delete item #${deleteConfirm}?`}
 *     onConfirm={() => { doDelete(deleteConfirm); setDeleteConfirm(null); }} />
 *
 * With:
 *   const confirm = useConfirm();
 *   ...
 *   <Btn onClick={() => confirm.ask(item.id)}>Delete</Btn>
 *   {confirm.modal(
 *     () => doDelete(confirm.value),
 *     { title: 'Delete item?', message: `Delete item #${confirm.value}?`, danger: true }
 *   )}
 *
 * API:
 *   confirm.ask(value)    — open with any value (id, object, etc.)
 *   confirm.cancel()      — close without action
 *   confirm.value         — current value (null when closed)
 *   confirm.modal(onConfirm, props) — renders <ConfirmModal> inline
 */

import { useState, useCallback } from 'react';
import { ConfirmModal } from '../components/ui';

export function useConfirm() {
  const [value, setValue] = useState(null);

  const ask    = useCallback((v) => setValue(v), []);
  const cancel = useCallback(() => setValue(null), []);

  const modal = useCallback((onConfirm, props = {}) => (
    <ConfirmModal
      open={value !== null}
      onClose={cancel}
      onConfirm={() => { onConfirm(value); cancel(); }}
      title={props.title || 'Confirm?'}
      message={props.message}
      danger={props.danger ?? true}
      confirmLabel={props.confirmLabel || 'Delete'}
      requirePassword={props.requirePassword}
      password={props.password}
      onPasswordChange={props.onPasswordChange}
    />
  ), [value, cancel]);

  return { value, ask, cancel, modal };
}
