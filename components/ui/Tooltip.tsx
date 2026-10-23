'use client';

import { useState, useId, useRef } from 'react';

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  /** The text content of the tooltip */
  content: string;
  /** The element that triggers the tooltip */
  children: React.ReactElement;
  position?: TooltipPosition;
  className?: string;
}

const positionClasses: Record<TooltipPosition, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

/**
 * Tooltip — shows a text hint on hover and keyboard focus.
 * Wraps a single child element. The child must be focusable.
 *
 * Usage:
 *   <Tooltip content="Delete task">
 *     <button aria-label="Delete task">...</button>
 *   </Tooltip>
 */
export function Tooltip({
  content,
  children,
  position = 'top',
  className = '',
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const tooltipId = useId();
  const containerRef = useRef<HTMLSpanElement>(null);

  const show = () => setVisible(true);
  const hide = () => setVisible(false);

  return (
    <span
      ref={containerRef}
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocusCapture={show}
      onBlurCapture={hide}
    >
      {/* Clone child to inject aria-describedby pointing at tooltip */}
      {/* We use a wrapper div approach to avoid cloneElement complexity */}
      <span
        aria-describedby={visible ? tooltipId : undefined}
        className="inline-flex"
      >
        {children}
      </span>

      {visible && (
        <span
          id={tooltipId}
          role="tooltip"
          className={[
            'absolute z-[var(--z-tooltip)] whitespace-nowrap',
            'rounded-[var(--radius-md)] bg-[var(--color-text-primary)] px-2 py-1',
            'text-xs text-white shadow-[var(--shadow-md)]',
            'pointer-events-none',
            positionClasses[position],
            className,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {content}
        </span>
      )}
    </span>
  );
}
