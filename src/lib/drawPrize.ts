// Prize calculation function (same as process-prize)
export function drawPrize(): number {
  const r = Math.random() * 100; // 0.000 … 99.999

  if (r < 30) return 0; // 35 % lose
  if (r < 40) return -1; // +10 % friend win
  if (r < 75) return 0.5; // +35 %  → 75 %
  if (r < 87) return 1; // +12 %  → 87 %
  if (r < 98) return 2; // +11 %  → 98 %
  return 0; // last 2 % blank
}
