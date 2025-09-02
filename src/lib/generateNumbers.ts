// ~/lib/generateNumbers.ts
import type { CardCell } from '~/app/interface/cardCell';
import { USDC_ADDRESS } from '~/lib/constants';

/**
 * Build a 12-cell flat array for a 3x4 card.
 * - If prizeAmount > 0: choose a random row (0..3), put 3 prize cells in that row.
 * - Else: all 12 cells are decoys.
 * - Each cell stores {amount, asset_contract}.
 */
export function generateNumbers(params: {
  prizeAmount: number;           // e.g., 0 | 0.5 | 1 | 2
  prizeAsset?: string;           // defaults to USDC
  decoyAmounts?: number[];       // defaults [0.5, 1, 2]
  decoyAssets?: string[];        // defaults [USDC]
}): CardCell[] {
  const {
    prizeAmount,
    prizeAsset = USDC_ADDRESS,
    decoyAmounts = [0.5, 1, 2],
    decoyAssets = [USDC_ADDRESS],
  } = params;

  const total = 12; // 3 cols x 4 rows
  const cells: CardCell[] = new Array(total);

  if (prizeAmount > 0) {
    // pick the winning row randomly (0..3)
    const winningRow = Math.floor(Math.random() * 4);
    const start = winningRow * 3; // 3 columns

    for (let i = 0; i < 3; i++) {
      cells[start + i] = { amount: prizeAmount, asset_contract: prizeAsset };
    }
  }

  // Fill remaining cells as decoys
  if (prizeAmount === 0) {
    // TODO: REVERT THIS - When no prize, ensure no row has 3 identical values
    for (let row = 0; row < 4; row++) {
      const rowStart = row * 3;
      const rowEnd = rowStart + 3;
      const rowAmountCounts: Record<number, number> = {};
      
      for (let i = rowStart; i < rowEnd; i++) {
        let amt: number;
        let attempts = 0;
        const maxAttempts = 30;
        
        do {
          amt = decoyAmounts[Math.floor(Math.random() * decoyAmounts.length)];
          attempts++;
          // Prevent any amount from appearing 3 times in the same row when no prize
          if ((rowAmountCounts[amt] || 0) >= 2) {
            amt = 0; // Force retry
          }
        } while ((rowAmountCounts[amt] || 0) >= 2 && attempts < maxAttempts);
        
        if (attempts >= maxAttempts) {
          amt = decoyAmounts[Math.floor(Math.random() * decoyAmounts.length)];
        }
        
        const asset = decoyAssets[Math.floor(Math.random() * decoyAssets.length)];
        cells[i] = { amount: amt, asset_contract: asset };
        rowAmountCounts[amt] = (rowAmountCounts[amt] || 0) + 1;
      }
    }
  } else {
    // When there is a prize, fill remaining cells normally
    for (let i = 0; i < total; i++) {
      if (!cells[i]) {
        const amt = decoyAmounts[Math.floor(Math.random() * decoyAmounts.length)];
        const asset = decoyAssets[Math.floor(Math.random() * decoyAssets.length)];
        cells[i] = { amount: amt, asset_contract: asset };
      }
    }
  }

  return cells;
}
