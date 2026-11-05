import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dropdown, type DropdownItem } from '../Dropdown';

const baseItems: DropdownItem[] = [
  { id: 'edit', label: 'Edit', onSelect: vi.fn() },
  { id: 'duplicate', label: 'Duplicate', onSelect: vi.fn(), disabled: true },
  { id: 'delete', label: 'Delete', onSelect: vi.fn(), destructive: true },
];

describe('Dropdown', () => {
  it('renders a closed menu trigger with an accessible name', () => {
    render(<Dropdown label="Actions" items={baseItems} />);
    const trigger = screen.getByRole('button', { name: 'Actions' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('opens the menu and focuses the first enabled item', async () => {
    const user = userEvent.setup();
    render(<Dropdown label="Actions" items={baseItems} />);

    await user.click(screen.getByRole('button', { name: 'Actions' }));

    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Actions' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await waitFor(() =>
      expect(screen.getByRole('menuitem', { name: 'Edit' })).toHaveFocus(),
    );
  });

  it('activates an item and closes the menu', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <Dropdown
        label="Actions"
        items={[{ id: 'edit', label: 'Edit', onSelect }]}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Actions' }));
    await user.click(screen.getByRole('menuitem', { name: 'Edit' }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('does not activate a disabled item', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <Dropdown
        label="Actions"
        items={[{ id: 'locked', label: 'Locked', onSelect, disabled: true }]}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Actions' }));
    await user.click(screen.getByRole('menuitem', { name: 'Locked' }));

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('closes on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    render(<Dropdown label="Actions" items={baseItems} />);

    const trigger = screen.getByRole('button', { name: 'Actions' });
    await user.click(trigger);
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('supports arrow-key navigation and skips disabled items', async () => {
    const user = userEvent.setup();
    render(<Dropdown label="Actions" items={baseItems} />);

    const trigger = screen.getByRole('button', { name: 'Actions' });
    await user.click(trigger);
    await waitFor(() =>
      expect(screen.getByRole('menuitem', { name: 'Edit' })).toHaveFocus(),
    );

    fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' });
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toHaveFocus();

    fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' });
    expect(screen.getByRole('menuitem', { name: 'Edit' })).toHaveFocus();
  });

  it('opens with ArrowDown on the trigger', async () => {
    const user = userEvent.setup();
    render(<Dropdown label="Actions" items={baseItems} />);

    const trigger = screen.getByRole('button', { name: 'Actions' });
    trigger.focus();
    await user.keyboard('{ArrowDown}');

    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('closes when clicking outside', async () => {
    const user = userEvent.setup();
    render(<Dropdown label="Actions" items={baseItems} />);

    await user.click(screen.getByRole('button', { name: 'Actions' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await user.click(document.body);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('renders link items as anchors', async () => {
    const user = userEvent.setup();
    render(
      <Dropdown
        label="Actions"
        items={[{ id: 'settings', label: 'Settings', href: '/settings' }]}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Actions' }));
    const link = screen.getByRole('menuitem', { name: 'Settings' });
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '/settings');
  });
});
