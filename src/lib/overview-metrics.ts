/** Last 6 calendar months of revenue/pipeline for Executive Overview sparkline. */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export type MonthPoint = { label: string; month: string; value: number };

export function lastSixMonthKeys(now = new Date()): string[] {
  const keys: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    keys.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return keys;
}

/** centsByMonth: map of YYYY-MM → amount in cents */
export function fillSixMonthSeries(centsByMonth: Record<string, number>, now = new Date()): MonthPoint[] {
  return lastSixMonthKeys(now).map((key) => {
    const [, m] = key.split('-');
    return {
      month: key,
      label: MONTHS[parseInt(m, 10) - 1] || key,
      value: Math.round((Number(centsByMonth[key] || 0)) / 100),
    };
  });
}

/** SVG polyline for a 0–100 viewBox from numeric series. */
export function sparklinePath(values: number[]): { line: string; area: string; max: number } {
  const nums = values.map((v) => Math.max(0, Number(v) || 0));
  const max = Math.max(...nums, 1);
  const n = Math.max(nums.length, 1);
  const pts = nums.map((v, i) => {
    const x = n === 1 ? 0 : (i / (n - 1)) * 100;
    const y = 100 - (v / max) * 82;
    return [x, y] as const;
  });
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' ');
  const last = pts[pts.length - 1] || [0, 100];
  const first = pts[0] || [0, 100];
  const area = `${line} L ${last[0].toFixed(2)} 100 L ${first[0].toFixed(2)} 100 Z`;
  return { line, area, max };
}
