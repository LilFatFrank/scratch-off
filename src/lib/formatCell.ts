import { tokenMeta } from '~/lib/constants';

export function formatCell(amount: number, asset: string) {
  const { symbol } = tokenMeta(asset);
  if (symbol === 'USDC') {
    return amount === 0.5 ? '50¢' : `$${amount}`;
  }
  // Generic fallback if you add other tokens later:
  return `${amount} ${symbol}`;
}
