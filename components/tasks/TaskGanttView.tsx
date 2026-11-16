'use client';

import { useMemo, useRef, useState, type MouseEvent } from 'react';
import { Badge } from '@/components/ui/Badge';
import type { TaskSummary } from '@/services/tasks';

function dayStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}
function diffDays(a: Date, b: Date): number {
  return Math.round((dayStart(a).getTime() - dayStart(b).getTime()) / 86400000);
}
function toIsoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

interface Props {
  tasks: TaskSummary[];
  onOpenTask: (taskId: string) => void;
  onReschedule: (taskId: string, startDate: string | null, dueDate: string | null) => Promise<void> | void;
  canEdit: boolean;
}

export function TaskGanttView({ tasks, onOpenTask, onReschedule, canEdit }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [drag, setDrag] = useState<{ taskId: string; mode: 'move' | 'start' | 'end'; originX: number; start: Date; end: Date } | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  const dayWidth = 28;
  const rowHeight = 36;
  const labelWidth = 260;

  const ranged = useMemo(() => {
    const withDates = tasks.map((t) => {
      const start = t.startDate ? new Date(t.startDate) : t.dueDate ? new Date(t.dueDate) : null;
      const end = t.dueDate ? new Date(t.dueDate) : t.startDate ? new Date(t.startDate) : null;
      return { task: t, start, end };
    });
    const dated = withDates.filter((x) => x.start && x.end) as Array<{ task: TaskSummary; start: Date; end: Date }>;
    if (dated.length === 0) {
      const today = dayStart(new Date());
      return { items: withDates, min: addDays(today, -7), max: addDays(today, 21) };
    }
    let min = dayStart(dated[0].start);
    let max = dayStart(dated[0].end);
    for (const x of dated) {
      const s = dayStart(x.start);
      const e = dayStart(x.end);
      if (s < min) min = s;
      if (e > max) max = e;
    }
    min = addDays(min, -3);
    max = addDays(max, 7);
    return { items: withDates, min, max };
  }, [tasks]);

  const totalDays = Math.max(1, diffDays(ranged.max, ranged.min) + 1);
  const days = useMemo(() => Array.from({ length: totalDays }, (_, i) => addDays(ranged.min, i)), [ranged.min, totalDays]);

  const bars = useMemo(() => {
    const map = new Map<string, { x: number; w: number; y: number; start: Date; end: Date }>();
    ranged.items.forEach((item, idx) => {
      if (!item.start || !item.end) return;
      const s = dayStart(item.start);
      const e = dayStart(item.end);
      const x = diffDays(s, ranged.min) * dayWidth;
      const w = Math.max(dayWidth, (diffDays(e, s) + 1) * dayWidth);
      const y = idx * rowHeight + 6;
      map.set(item.task.id, { x, w, y, start: s, end: e < s ? s : e });
    });
    return map;
  }, [ranged, dayWidth, rowHeight]);

  function onBarMouseDown(e: MouseEvent, taskId: string, mode: 'move' | 'start' | 'end') {
    if (!canEdit) return;
    const bar = bars.get(taskId);
    if (!bar) return;
    e.preventDefault();
    e.stopPropagation();
    setDrag({ taskId, mode, originX: e.clientX, start: bar.start, end: bar.end });
  }

  async function onMouseMove(e: MouseEvent) {
    if (!drag) return;
    // visual feedback only handled by recomputing preview via inline style? keep simple: commit on mouse up based on delta
    void e;
  }

  async function onMouseUp(e: MouseEvent) {
    if (!drag) return;
    const deltaDays = Math.round((e.clientX - drag.originX) / dayWidth);
    const d = drag;
    setDrag(null);
    if (deltaDays === 0) return;
    let newStart = d.start;
    let newEnd = d.end;
    if (d.mode === 'move') {
      newStart = addDays(d.start, deltaDays);
      newEnd = addDays(d.end, deltaDays);
    } else if (d.mode === 'start') {
      newStart = addDays(d.start, deltaDays);
      if (newStart > newEnd) newStart = newEnd;
    } else {
      newEnd = addDays(d.end, deltaDays);
      if (newEnd < newStart) newEnd = newStart;
    }
    await onReschedule(d.taskId, `${toIsoDay(newStart)}T00:00:00.000Z`, `${toIsoDay(newEnd)}T00:00:00.000Z`);
  }

  const arrows = useMemo(() => {
    const list: Array<{ from: string; to: string }> = [];
    for (const item of ranged.items) {
      for (const dep of item.task.dependencies ?? []) {
        if (bars.has(dep.dependsOnTaskId) && bars.has(item.task.id)) {
          list.push({ from: dep.dependsOnTaskId, to: item.task.id });
        }
      }
    }
    return list;
  }, [ranged.items, bars]);

  if (tasks.length === 0) return null;

  const chartWidth = totalDays * dayWidth;

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="flex">
        <div className="shrink-0 border-r border-[var(--color-border)]" style={{ width: labelWidth }}>
          <div className="h-10 border-b border-[var(--color-border)] px-3 flex items-center text-xs font-medium text-[var(--color-text-muted)]">Task</div>
          {ranged.items.map((item) => (
            <div key={item.task.id} className="flex items-center gap-2 border-b border-[var(--color-border)] px-3" style={{ height: rowHeight }}>
              <button type="button" className="truncate text-left text-sm hover:underline" onClick={() => onOpenTask(item.task.id)} title={item.task.title}>
                <span className="font-mono text-xs text-[var(--color-text-muted)] mr-2">{item.task.key}</span>
                {item.task.title}
              </button>
            </div>
          ))}
        </div>
        <div
          ref={containerRef}
          className="overflow-auto"
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={() => { if (drag) setDrag(null); }}
        >
          <div style={{ width: chartWidth, minWidth: chartWidth }}>
            <div className="relative h-10 border-b border-[var(--color-border)]">
              {days.map((d, i) => {
                const isMonthStart = d.getUTCDate() === 1;
                return (
                  <div key={i} className="absolute top-0 h-full border-r border-[var(--color-border)] text-[10px] text-[var(--color-text-muted)]" style={{ left: i * dayWidth, width: dayWidth }}>
                    <div className="px-0.5 pt-1 text-center">{d.getUTCDate()}</div>
                    {isMonthStart && <div className="absolute -top-0 left-0 px-1 text-[10px] font-medium">{d.toLocaleString(undefined, { month: 'short', timeZone: 'UTC' })}</div>}
                  </div>
                );
              })}
            </div>
            <div className="relative" style={{ height: ranged.items.length * rowHeight }}>
              {days.map((_, i) => (
                <div key={i} className="absolute top-0 bottom-0 border-r border-[var(--color-border)]/50" style={{ left: i * dayWidth, width: dayWidth }} />
              ))}
              {ranged.items.map((_, idx) => (
                <div key={idx} className="absolute left-0 right-0 border-b border-[var(--color-border)]/50" style={{ top: idx * rowHeight, height: rowHeight }} />
              ))}
              <svg className="pointer-events-none absolute inset-0" width={chartWidth} height={ranged.items.length * rowHeight}>
                <defs>
                  <marker id="gantt-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
                    <path d="M0,0 L0,6 L6,3 z" fill="var(--color-text-muted)" />
                  </marker>
                </defs>
                {arrows.map((a, i) => {
                  const from = bars.get(a.from);
                  const to = bars.get(a.to);
                  if (!from || !to) return null;
                  const x1 = from.x + from.w;
                  const y1 = from.y + (rowHeight - 12) / 2;
                  const x2 = to.x;
                  const y2 = to.y + (rowHeight - 12) / 2;
                  const midX = x1 + Math.max(12, (x2 - x1) / 2);
                  const path = `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
                  return <path key={i} d={path} fill="none" stroke="var(--color-text-muted)" strokeWidth="1.5" markerEnd="url(#gantt-arrow)" opacity={0.7} />;
                })}
              </svg>
              {ranged.items.map((item) => {
                const bar = bars.get(item.task.id);
                if (!bar) {
                  return (
                    <div key={item.task.id} className="absolute left-2 flex items-center" style={{ top: bars.size ? 0 : 0, height: rowHeight }}>
                      <span className="text-xs text-[var(--color-text-muted)]">No dates</span>
                    </div>
                  );
                }
                const active = hover === item.task.id || drag?.taskId === item.task.id;
                return (
                  <div
                    key={item.task.id}
                    className="absolute flex items-center"
                    style={{ left: bar.x, top: bar.y, width: bar.w, height: rowHeight - 12 }}
                    onMouseEnter={() => setHover(item.task.id)}
                    onMouseLeave={() => setHover(null)}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      onMouseDown={(e) => onBarMouseDown(e, item.task.id, 'move')}
                      onClick={() => onOpenTask(item.task.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter') onOpenTask(item.task.id); }}
                      className={`relative flex h-full w-full items-center rounded-md border px-2 text-xs text-white shadow-sm ${canEdit ? 'cursor-grab' : 'cursor-pointer'} ${active ? 'ring-2 ring-[var(--color-primary)]' : ''}`}
                      style={{ background: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}
                      title={`${item.task.title} (${toIsoDay(bar.start)} → ${toIsoDay(bar.end)})${canEdit ? ' — drag to reschedule' : ''}`}
                    >
                      {canEdit && (
                        <span
                          onMouseDown={(e) => onBarMouseDown(e, item.task.id, 'start')}
                          className="absolute left-0 top-0 h-full w-2 cursor-ew-resize rounded-l-md bg-black/10"
                          aria-hidden
                        />
                      )}
                      <span className="truncate">{item.task.title}</span>
                      {canEdit && (
                        <span
                          onMouseDown={(e) => onBarMouseDown(e, item.task.id, 'end')}
                          className="absolute right-0 top-0 h-full w-2 cursor-ew-resize rounded-r-md bg-black/10"
                          aria-hidden
                        />
                      )}
                    </div>
                  </div>
                );
              })}
              {ranged.items.map((item, idx) => {
                if (bars.has(item.task.id)) return null;
                return (
                  <div key={`nd-${item.task.id}`} className="absolute flex items-center px-2 text-xs text-[var(--color-text-muted)]" style={{ top: idx * rowHeight, height: rowHeight }}>
                    <Badge variant={item.task.status}>{item.task.status}</Badge>
                    <span className="ml-2">No start/due date — set dates to schedule on the timeline</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-text-muted)]">
        {canEdit ? 'Drag a bar to move, or drag edges to resize. Dependency arrows show blocking relationships.' : 'Dependency arrows show blocking relationships.'}
      </div>
    </div>
  );
}
