'use client';

import { useState, useId } from 'react';

export interface TabItem {
  /** Unique identifier for this tab */
  id: string;
  label: string;
  /** Tab content — rendered when this tab is active */
  content: React.ReactNode;
  disabled?: boolean;
}

interface TabsProps {
  tabs: TabItem[];
  /** Controlled active tab id */
  activeTab?: string;
  /** Called with the new tab id when the user changes tab */
  onTabChange?: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onTabChange, className = '' }: TabsProps) {
  const uid = useId();
  const [internalActive, setInternalActive] = useState(tabs[0]?.id ?? '');

  const active = activeTab ?? internalActive;

  const handleSelect = (id: string) => {
    if (!activeTab) setInternalActive(id);
    onTabChange?.(id);
  };

  // Arrow-key navigation between tabs
  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    const enabledTabs = tabs.filter((t) => !t.disabled);
    const currentEnabled = enabledTabs.findIndex(
      (t) => t.id === tabs[currentIndex].id,
    );

    let next = -1;
    if (e.key === 'ArrowRight') {
      next = (currentEnabled + 1) % enabledTabs.length;
    } else if (e.key === 'ArrowLeft') {
      next = (currentEnabled - 1 + enabledTabs.length) % enabledTabs.length;
    } else if (e.key === 'Home') {
      next = 0;
    } else if (e.key === 'End') {
      next = enabledTabs.length - 1;
    }

    if (next >= 0) {
      e.preventDefault();
      handleSelect(enabledTabs[next].id);
      // Move browser focus to the newly active tab button
      const btn = document.getElementById(`${uid}-tab-${enabledTabs[next].id}`);
      btn?.focus();
    }
  };

  const activeContent = tabs.find((t) => t.id === active)?.content;

  return (
    <div className={['flex flex-col', className].filter(Boolean).join(' ')}>
      {/* Tab list */}
      <div
        role="tablist"
        aria-label="Tabs"
        className="flex gap-0 border-b border-[var(--color-border)] overflow-x-auto"
      >
        {tabs.map((tab, index) => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              id={`${uid}-tab-${tab.id}`}
              role="tab"
              aria-selected={isActive}
              aria-controls={`${uid}-panel-${tab.id}`}
              disabled={tab.disabled}
              tabIndex={isActive ? 0 : -1}
              onClick={() => handleSelect(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={[
                'whitespace-nowrap px-4 py-2.5 text-sm font-medium',
                'border-b-2 -mb-px transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-primary)]',
                'disabled:cursor-not-allowed disabled:opacity-40',
                isActive
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border)]',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab panels — only active panel is rendered */}
      {tabs.map((tab) => (
        <div
          key={tab.id}
          id={`${uid}-panel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`${uid}-tab-${tab.id}`}
          hidden={tab.id !== active}
          tabIndex={0}
          className="outline-none"
        >
          {tab.id === active ? activeContent : null}
        </div>
      ))}
    </div>
  );
}
