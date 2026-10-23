import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from '../ConfirmDialog';

function renderConfirm(
  props: Partial<React.ComponentProps<typeof ConfirmDialog>> = {},
) {
  return render(
    <ConfirmDialog
      open={true}
      onClose={vi.fn()}
      onConfirm={vi.fn()}
      title="Delete workspace"
      description="This action cannot be undone."
      {...props}
    />,
  );
}

describe('ConfirmDialog', () => {
  it('renders nothing when open=false', () => {
    renderConfirm({ open: false });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders title and description', () => {
    renderConfirm();
    expect(
      screen.getByRole('heading', { name: 'Delete workspace', level: 2 }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('This action cannot be undone.'),
    ).toBeInTheDocument();
  });

  it('renders Cancel and Confirm buttons', () => {
    renderConfirm();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
  });

  it('uses custom button labels', () => {
    renderConfirm({ confirmLabel: 'Yes, delete', cancelLabel: 'Keep it' });
    expect(screen.getByRole('button', { name: 'Yes, delete' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keep it' })).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', async () => {
    const onConfirm = vi.fn();
    renderConfirm({ onConfirm });
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('calls onClose when cancel button is clicked', async () => {
    const onClose = vi.fn();
    renderConfirm({ onClose });
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when Escape is pressed', async () => {
    const onClose = vi.fn();
    renderConfirm({ onClose });
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does NOT use window.alert or window.confirm', () => {
    // If ConfirmDialog ever called window.alert/confirm, jsdom would throw
    // or the vi.fn() spies would catch it. Asserting window.alert is pristine.
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true);
    renderConfirm();
    expect(alertSpy).not.toHaveBeenCalled();
    expect(confirmSpy).not.toHaveBeenCalled();
    alertSpy.mockRestore();
    confirmSpy.mockRestore();
  });

  it('disables confirm button and shows loading state when loading=true', () => {
    renderConfirm({ loading: true });
    const confirmBtn = screen.getByRole('button', { name: 'Confirm' });
    expect(confirmBtn).toBeDisabled();
    expect(confirmBtn).toHaveAttribute('aria-busy', 'true');
  });

  it('applies destructive variant class when destructive=true', () => {
    renderConfirm({ destructive: true, confirmLabel: 'Delete' });
    const confirmBtn = screen.getByRole('button', { name: 'Delete' });
    expect(confirmBtn.className).toContain('bg-[var(--color-error)]');
  });
});
