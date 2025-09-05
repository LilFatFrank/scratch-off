import { CardCell } from "~/app/interface/cardCell";

export function chunk3<T>(arr: T[]): T[][] {
  // [0..2], [3..5], [6..8], [9..11]
  return Array.from({ length: 4 }, (_, r) => arr.slice(r * 3, r * 3 + 3));
}

export function findWinningRow(
  numbers: CardCell[] | undefined,
  prizeAmount: number,
  prizeAsset: string
): number | null {
  if (!numbers) return null;
  
  if (prizeAmount === -1) {
    // Friend win - find row with 3 identical friend cells
    for (let r = 0; r < 4; r++) {
      const row = numbers.slice(r * 3, r * 3 + 3);
      const allMatch =
        row.length === 3 &&
        row.every(
          (c) =>
            c.amount === -1 && 
            c.friend_wallet && 
            c.friend_wallet === row[0].friend_wallet // All cells have same friend
        );
      if (allMatch) return r;
    }
  } else if (prizeAmount > 0) {
    // Regular prize win - existing logic
    for (let r = 0; r < 4; r++) {
      const row = numbers.slice(r * 3, r * 3 + 3);
      const allMatch =
        row.length === 3 &&
        row.every(
          (c) =>
            Number(c.amount) === Number(prizeAmount) &&
            c.asset_contract?.toLowerCase() === prizeAsset.toLowerCase()
        );
      if (allMatch) return r;
    }
  }
  
  return null;
}
