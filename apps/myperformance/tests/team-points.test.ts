import { describe, expect, it } from 'vitest';
import { combineTeamPointSources } from '../src/lib/integration/team-points';

describe('combineTeamPointSources', () => {
  it('uses the ledger for integrated apps and keeps only legacy MyCustomer rows', () => {
    const rows = combineTeamPointSources(
      [
        {
          person_id: 'person-1',
          branch_id: 'branch-1',
          source_app: 'mycheck',
          points: '2.5',
          occurred_at: '2026-11-06T08:00:00.000Z',
        },
        {
          person_id: 'person-2',
          branch_id: 'branch-1',
          source_app: 'stokis',
          points: 3,
          occurred_at: '2026-11-06T09:00:00.000Z',
        },
      ],
      [
        {
          user_id: 'person-1',
          branch_id: 'branch-1',
          app_id: 'mycheck',
          points_earned: 99,
          created_at: '2026-11-06T08:00:00.000Z',
        },
        {
          user_id: 'person-3',
          branch_id: 'branch-1',
          app_id: 'mycustomer',
          points_earned: '1.5',
          created_at: '2026-11-06T10:00:00.000Z',
        },
      ]
    );

    expect(rows).toEqual([
      {
        user_id: 'person-1',
        branch_id: 'branch-1',
        app_id: 'mycheck',
        points_earned: 2.5,
        created_at: '2026-11-06T08:00:00.000Z',
      },
      {
        user_id: 'person-2',
        branch_id: 'branch-1',
        app_id: 'stokis',
        points_earned: 3,
        created_at: '2026-11-06T09:00:00.000Z',
      },
      {
        user_id: 'person-3',
        branch_id: 'branch-1',
        app_id: 'mycustomer',
        points_earned: 1.5,
        created_at: '2026-11-06T10:00:00.000Z',
      },
    ]);
  });
});
