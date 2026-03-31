/**
 * useConfirm — upraszcza stan potwierdzenia kasowania
 *
 * Zastępuje:
 *   const [deleteConfirm, setDeleteConfirm] = useState(null);
 *   <ConfirmModal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}
 *     onConfirm={() => { doDelete(deleteConfirm); setDeleteConfirm(null); }} />
 *
 * Użycie:
 *   const confirm = useConfirm();
 *   <Btn onClick={() => confirm.ask(item)}>Delete</Btn>
 *   <ConfirmModal {...confirm.modalProps((item) => doDelete(item.id),
 *     { title: 'Delete?', message: `Delete "${confirm.value?.name}"?` })} />
 */

import { useState, useCallback } from 'react';

export function useConfirm() {
  const [value, setValue] = useState(null);

  const ask    = useCallback((v) => setValue(v), []);
  const cancel = useCallback(() => setValue(null), []);

  // Returns props object to spread onto <ConfirmModal>
  const modalProps = useCallback((onConfirm, props = {}) => ({
    open: value !== null,
    onClose: cancel,
    onConfirm: () => { onConfirm(value); cancel(); },
    title: props.title || 'Confirm?',
    message: props.message,
    danger: props.danger ?? true,
    confirmLabel: props.confirmLabel || 'Delete',
    requirePassword: props.requirePassword,
    password: props.password,
    onPasswordChange: props.onPasswordChange,
  }), [value, cancel]);

  return { value, ask, cancel, modalProps };
}
