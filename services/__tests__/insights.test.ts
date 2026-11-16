import { describe, expect, it } from 'vitest';
import { buildAnalyticsCsv, type DashboardAggregateData } from '@/services/analytics';

describe('buildAnalyticsCsv', () => {
  it('exports aggregate analytics sections and keeps CSV export available', () => {
    const data: DashboardAggregateData = {
      byStatus: { workspaceId: 'ws', projectId: null, rangeDays: 30, items: [{ status: 'ASSIGNED', count: 2 }] },
      byAssignee: { workspaceId: 'ws', projectId: null, rangeDays: 30, items: [{ assigneeId: 'u1', assigneeName: 'Ada', count: 2 }] },
      throughput: { workspaceId: 'ws', projectId: null, rangeDays: 30, created: 3, completed: 1, items: [{ date: '2026-11-01', created: 1, completed: 0 }] },
      workload: { workspaceId: 'ws', projectId: null, rangeDays: 30, items: [{ assigneeId: null, assigneeName: null, openTasks: 1, overdueTasks: 0 }] },
      timeLogged: { workspaceId: 'ws', projectId: null, rangeDays: 30, totalMinutes: 90, items: [{ userId: 'u1', userName: 'Ada', minutes: 90 }] },
      errors: [],
    };

    const csv = buildAnalyticsCsv(data);
    expect(csv).toContain('Tasks by status');
    expect(csv).toContain('Status,Count');
    expect(csv).toContain('Throughput by date');
    expect(csv).toContain('Workload');
    expect(csv).toContain('Time logged by user');
    expect(csv).toContain('Ada');
  });

  it('handles empty data', () => {
    const csv = buildAnalyticsCsv({ byStatus: null, byAssignee: null, throughput: null, workload: null, timeLogged: null, errors: [] });
    expect(csv).toContain('No analytics data available');
  });
});
