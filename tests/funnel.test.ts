import { describe, expect, it } from 'vitest';
import { clampColumnToFunnel, getFunnelSpanForRows } from '../src/simulation/funnel';

const geometry = {
  gridRows: 4,
  gridCols: 10,
  profile: [
    [1, 9],
    [2, 8],
    [3, 7],
    [4, 6]
  ] as const
};

describe('funnel geometry', () => {
  it('intersects every occupied row for large grains', () => {
    expect(getFunnelSpanForRows(geometry, 1, 2)).toEqual({ start: 3, end: 7 });
  });

  it('clamps a grain within the funnel span', () => {
    expect(clampColumnToFunnel(geometry, -20, 1, 2)).toBe(3);
    expect(clampColumnToFunnel(geometry, 20, 1, 2)).toBe(5);
  });

  it('uses the centered fallback for a closed intersection', () => {
    const closed = { ...geometry, profile: [[0, 2], [8, 10]] as const };
    expect(getFunnelSpanForRows(closed, 0, 2)).toEqual({ start: 4, end: 6 });
  });
});
