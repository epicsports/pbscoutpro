/**
 * useModal — eliminates repeated modal state boilerplate
 *
 * Replaces:
 *   const [modal, setModal] = useState(null);
 *   const openAdd  = () => setModal('add');
 *   const openEdit = (item) => setModal({ type: 'edit', item });
 *   const close    = () => setModal(null);
 *
 * With:
 *   const modal = useModal();
 *   modal.open('add')           // set to string key
 *   modal.open({ type:'edit', item })  // set to object
 *   modal.close()               // set to null
 *   modal.is('add')             // true if modal.value === 'add'
 *   modal.is('edit')            // true if modal.value?.type === 'edit'
 *   modal.value                 // raw value (null | string | object)
 *   modal.data                  // alias: modal.value?.item or modal.value
 *
 * Usage example:
 *   const modal = useModal();
 *   <Btn onClick={() => modal.open('add')}>Add</Btn>
 *   <Btn onClick={() => modal.open({ type: 'edit', layout: l })}>Edit</Btn>
 *   <Modal open={modal.is('add')} onClose={modal.close} title="Add">...</Modal>
 *   <Modal open={modal.is('edit')} onClose={modal.close}>
 *     {modal.value?.layout?.name}
 *   </Modal>
 *   <ConfirmModal open={modal.is('delete')} onClose={modal.close}
 *     onConfirm={() => { doDelete(modal.value?.id); modal.close(); }} />
 */

import { useState, useCallback } from 'react';

export function useModal(initial = null) {
  const [value, setValue] = useState(initial);

  const open  = useCallback((v) => setValue(v), []);
  const close = useCallback(() => setValue(null), []);

  const is = useCallback((key) => {
    if (value === key) return true;
    if (value && typeof value === 'object' && value.type === key) return true;
    return false;
  }, [value]);

  return { value, open, close, is, data: value?.item ?? value };
}
