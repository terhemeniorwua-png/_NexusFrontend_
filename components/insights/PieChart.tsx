/**
 * components/insights/PieChart.tsx
 *
 * Dependency-free SVG pie chart.
 *
 * Slices are decorative and hidden from assistive technology; the data is
 * conveyed through the accessible name, the chart title, and a plain-text
 * legend. Percentage labels are shown inside slices large enough to hold
 * them, and always in the legend.
 */

import { useMemo } from 'react';

interface PieChartItem {
  id: string;
  label: string;
  value: number;
}

interface PieChartProps {
  /** Accessible name of the chart. */
  ariaLabel: string;
  items: PieChartItem[];
  className?: string;
  /** Message shown when there is nothing to display. */
  emptyLabel?: string;
  /** Diameter of the SVG in pixels. */
  size?: number;
}

// Slice colours drawn from the existing design-token palette.
const SLICE_COLORS: ReadonlyArray<string> = [
  'var(--color-primary)',
  'var(--color-info)',
  'var(--color-success)',
  'var(--color-warning)',
  'var(--color-error)',
];

function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function PieChart({
  ariaLabel,
  items,
  className = '',
  emptyLabel = 'No data in this range.',
  size = 240,
}: PieChartProps) {
  const total = items.reduce((sum, item) => sum + Math.max(0, item.value), 0);
  const center = size / 2;
  const radius = size / 2 - 24;
  const hasData = total > 0 && items.some((item) => item.value > 0);

  const slices = useMemo(() => {
    if (!hasData) return [];
    const result: Array<{
      id: string;
      label: string;
      value: number;
      percentage: number;
      color: string;
      d: string;
      labelAngle: number;
      sliceAngle: number;
    }> = [];
    let startAngle = -90;
    for (const item of items.filter((item) => item.value > 0)) {
      const sliceAngle = (item.value / total) * 360;
      const endAngle = startAngle + sliceAngle;
      const largeArc = sliceAngle > 180 ? 1 : 0;
      const x1 = center + radius * Math.cos(degreesToRadians(startAngle));
      const y1 = center + radius * Math.sin(degreesToRadians(startAngle));
      const x2 = center + radius * Math.cos(degreesToRadians(endAngle));
      const y2 = center + radius * Math.sin(degreesToRadians(endAngle));
      result.push({
        id: item.id,
        label: item.label,
        value: item.value,
        percentage: Math.round((item.value / total) * 100),
        color: SLICE_COLORS[result.length % SLICE_COLORS.length],
        d: `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`,
        labelAngle: startAngle + sliceAngle / 2,
        sliceAngle,
      });
      startAngle = endAngle;
    }
    return result;
  }, [items, total, hasData, center, radius]);

  if (!hasData) {
    return (
      <div className={className}>
        <p className="text-sm text-[var(--color-text-secondary)]">{emptyLabel}</p>
      </div>
    );
  }

  const summary = slices.map((slice) => `${slice.label} ${slice.percentage}%`).join(', ');

  return (
    <div className={className}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
        <div className="flex flex-col items-center">
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            role="img"
            aria-label={ariaLabel}
            className="overflow-visible"
          >
            <title>{`${ariaLabel}. ${summary}`}</title>
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="var(--color-surface-secondary)"
              stroke="var(--color-border)"
              aria-hidden="true"
            />
            {slices.map((slice) => (
              <path key={slice.id} d={slice.d} fill={slice.color} aria-hidden="true" />
            ))}
            {slices
              .filter((slice) => slice.sliceAngle >= 45)
              .map((slice) => {
                const labelRadius = radius * 0.6;
                const x =
                  center + labelRadius * Math.cos(degreesToRadians(slice.labelAngle));
                const y =
                  center + labelRadius * Math.sin(degreesToRadians(slice.labelAngle));
                return (
                  <text
                    key={slice.id}
                    x={x}
                    y={y}
                    textAnchor="middle"
                    dy="0.35em"
                    fill="white"
                    className="text-xs font-semibold pointer-events-none"
                  >
                    {slice.percentage}%
                  </text>
                );
              })}
          </svg>
          <div className="flex flex-col items-center gap-0.5 mt-2">
            <p className="text-2xl font-semibold tabular-nums text-[var(--color-text-primary)]">
              {total}
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">total</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 min-w-[150px]">
          {slices.map((slice) => (
            <div key={slice.id} className="flex items-center gap-2 text-sm">
              <span
                className="shrink-0 w-3 h-3 rounded-full"
                style={{ backgroundColor: slice.color }}
                aria-hidden="true"
              />
              <span className="min-w-0 truncate text-[var(--color-text-secondary)]">
                {slice.label}
              </span>
              <span className="ml-auto text-xs tabular-nums text-[var(--color-text-muted)]">
                {slice.value} ({slice.percentage}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
