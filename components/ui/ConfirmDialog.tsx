'use client';

import { Alert } from './Alert';
import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  /** Called when the user confirms the action */
  onConfirm: () => void;
  title: string;
  description?: string;
  /** Label for the confirm button — defaults to "Confirm" */
  confirmLabel?: string;
  /** Label for the cancel button — defaults to "Cancel" */
  cancelLabel?: string;
  /** Whether the confirm action is destructive — uses red button */
  destructive?: boolean;
  /** Disable the confirm button while an async action is in progress */
  loading?: boolean;
  /** Optional action error rendered inside the dialog */
  error?: string;
}

/**
 * ConfirmDialog — reusable confirmation dialog for destructive or consequential actions.
 *
 * Never uses window.alert() or window.confirm().
 * Always requires an explicit user action to proceed.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  error,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      maxWidth="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'primary'}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {/* Description appears in the header; action errors stay inside the dialog. */}
      {error ? <Alert variant="error">{error}</Alert> : <span />}
    </Modal>
  );
}
