// ~/lib/generateNumbers.ts
import { BestFriend } from '~/app/interface/bestFriends';
import type { CardCell } from '~/app/interface/cardCell';
import { USDC_ADDRESS } from '~/lib/constants';

/**
 * Build a 12-cell flat array for a 3x4 card.
 * - If prizeAmount > 0: choose a random row (0..3), put 3 prize cells in that row.
 * - Else: all 12 cells are decoys.
 * - Each cell stores {amount, asset_contract}.
 */
export function generateNumbers(params: {
  prizeAmount: number;           // -1 for friend win, 0 for loss, 0.5+ for prize
  prizeAsset?: string;           // defaults to USDC (not used for friend wins)
  decoyAmounts?: number[];       // defaults [0.5, 1, 2]
  decoyAssets?: string[];        // defaults [USDC]
  friends?: BestFriend[];               // Array of best friends to choose from
}): CardCell[] {
  const {
    prizeAmount,
    prizeAsset = USDC_ADDRESS,
    decoyAmounts = [0.5, 1, 2],
    decoyAssets = [USDC_ADDRESS],
    friends = [], // Default to empty array
  } = params;

  const total = 12; // 3 cols x 4 rows
  const cells: CardCell[] = new Array(total);

  let winningRow = -1; // Initialize winningRow variable
  
  if (prizeAmount > 0) {
    // Regular prize win - pick the winning row randomly (0..3)
    winningRow = Math.floor(Math.random() * 4);
    const start = winningRow * 3; // 3 columns

    for (let i = 0; i < 3; i++) {
      cells[start + i] = { amount: prizeAmount, asset_contract: prizeAsset };
    }
  } else if (prizeAmount === -1) {
    // Friend win - pick the winning row randomly (0..3)
    winningRow = Math.floor(Math.random() * 4);
    const start = winningRow * 3; // 3 columns
    
    // Pick random friend
    const randomFriend = friends.length > 0 ? friends[Math.floor(Math.random() * friends.length)] : null;
    
    for (let i = 0; i < 3; i++) {
      cells[start + i] = { 
        amount: -1, 
        asset_contract: '', // Empty for friend wins
        friend_fid: randomFriend?.fid || 0,
        friend_username: randomFriend?.username || '',
        friend_pfp: randomFriend?.pfp || '',
        friend_wallet: randomFriend?.wallet || ''
      };
    }
  }

  // Fill remaining cells as decoys - ensure no row has 3 identical values
  for (let row = 0; row < 4; row++) {
    if (row === winningRow) continue; // Skip the winning row, it's already filled
    
    const rowStart = row * 3;
    const rowEnd = rowStart + 3;
    const rowAmountCounts: Record<number, number> = {};
    const rowFriendCounts: Record<string, number> = {}; // Track friend counts per row
    
    for (let i = rowStart; i < rowEnd; i++) {
      // Randomly decide if this cell should be a friend or amount
      let shouldBeFriend = Math.random() < 0.3 && friends.length > 0; // 30% chance of friend PFP
      
      if (shouldBeFriend) {
        // This cell will be a friend PFP
        const randomFriend = friends[Math.floor(Math.random() * friends.length)];
        const friendKey = `${randomFriend.fid}`;
        
        // Prevent 3 identical friends in the same row
        if ((rowFriendCounts[friendKey] || 0) >= 2) {
          // Fallback to amount if too many of same friend
          shouldBeFriend = false;
        } else {
          cells[i] = { 
            amount: 0, 
            asset_contract: '',
            friend_fid: randomFriend.fid,
            friend_username: randomFriend.username,
            friend_pfp: randomFriend.pfp,
            friend_wallet: randomFriend.wallet
          };
          rowFriendCounts[friendKey] = (rowFriendCounts[friendKey] || 0) + 1;
          continue; // Skip to next cell
        }
      }
      
      // This cell will be an amount (existing logic)
      let amt: number;
      let attempts = 0;
      const maxAttempts = 30;
      
      do {
        amt = decoyAmounts[Math.floor(Math.random() * decoyAmounts.length)];
        attempts++;
        // Prevent any amount from appearing 3 times in the same row
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

  return cells;
}
