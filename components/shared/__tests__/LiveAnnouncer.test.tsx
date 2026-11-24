import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LiveAnnouncer, LiveAnnouncerRegion, useAnnouncer } from '../LiveAnnouncer';

function Harness() {
  const { announce, message } = useAnnouncer();
  return (
    <>
      <button type="button" onClick={() => announce('Hello world')}>
        Announce once
      </button>
      <LiveAnnouncer message={message} />
    </>
  );
}

function RepeatHarness() {
  const { announce, message } = useAnnouncer();
  return (
    <>
      <button type="button" onClick={() => announce('Same message')}>
        Go
      </button>
      <LiveAnnouncerRegion message={message} />
    </>
  );
}

function region(): HTMLElement {
  const element = document.querySelector('[aria-live="polite"]');
  if (!element) throw new Error('Live region was not rendered');
  return element as HTMLElement;
}

describe('LiveAnnouncer', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders announced text in a visually hidden polite region', async () => {
    vi.useFakeTimers();
    render(<Harness />);
    const liveRegion = region();

    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
    expect(liveRegion).toHaveClass('sr-only');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Announce once' }));
      vi.advanceTimersByTime(60);
    });

    expect(liveRegion.textContent).toBe('Hello world');
  });

  it('clears then writes again when the same message is announced twice', async () => {
    vi.useFakeTimers();
    render(<RepeatHarness />);
    const liveRegion = region();
    const go = screen.getByRole('button', { name: 'Go' });

    await act(async () => {
      fireEvent.click(go);
    });
    expect(liveRegion.textContent).toBe('');
    await act(async () => {
      vi.advanceTimersByTime(60);
    });
    expect(liveRegion.textContent).toBe('Same message');

    await act(async () => {
      fireEvent.click(go);
    });
    expect(liveRegion.textContent).toBe('');
    await act(async () => {
      vi.advanceTimersByTime(60);
    });
    expect(liveRegion.textContent).toBe('Same message');
  });
});
