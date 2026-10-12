/**
 * Royalty cycle helper (KB: calculated quarterly, paid within 45 days of quarter end).
 * Gives the AI concrete dates so replies can say "your next payout is due by X"
 * instead of vague reassurances.
 */
const QUARTER_ENDS = [[2, 31], [5, 30], [8, 30], [11, 31]]; // [monthIndex, day]

const fmt = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);

export function royaltyCycle(today = new Date()) {
  const y = today.getUTCFullYear();
  const ends = [y - 1, y, y + 1].flatMap((yr) =>
    QUARTER_ENDS.map(([m, day]) => new Date(Date.UTC(yr, m, day)))
  );
  const lastEnd = [...ends].reverse().find((d) => d <= today);
  const nextEnd = ends.find((d) => d > today);
  return {
    lastQuarterEnd: fmt(lastEnd),
    lastQuarterPayoutDueBy: fmt(addDays(lastEnd, 45)),
    nextQuarterEnd: fmt(nextEnd),
    nextQuarterPayoutDueBy: fmt(addDays(nextEnd, 45)),
  };
}
