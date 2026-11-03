import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from '../Modal';

function renderModal(props: Partial<React.ComponentProps<typeof Modal>> = {}) {
  return render(
    <Modal open={true} onClose={vi.fn()} title="Test Modal" {...props}>
      <p>Modal body</p>
    </Modal>,
  );
}

describe('Modal', () => {
  it('renders nothing when open=false', () => {
    render(
      <Modal open={false} onClose={vi.fn()} title="Hidden">
        <p>content</p>
      </Modal>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders dialog with correct ARIA attributes when open', () => {
    renderModal();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby');
  });

  it('renders the title in an h2', () => {
    renderModal({ title: 'Confirm Action' });
    expect(
      screen.getByRole('heading', { name: 'Confirm Action', level: 2 }),
    ).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    renderModal({ description: 'This is a description' });
    expect(screen.getByText('This is a description')).toBeInTheDocument();
  });

  it('renders children in the modal body', () => {
    renderModal();
    expect(screen.getByText('Modal body')).toBeInTheDocument();
  });

  it('renders footer slot when provided', () => {
    renderModal({ footer: <button>Confirm</button> });
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
  });

  it('calls onClose when the X button is clicked', async () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    await userEvent.click(screen.getByRole('button', { name: 'Close dialog' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when Escape key is pressed', async () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('has accessible close button with aria-label', () => {
    renderModal();
    expect(
      screen.getByRole('button', { name: 'Close dialog' }),
    ).toBeInTheDocument();
  });
});
