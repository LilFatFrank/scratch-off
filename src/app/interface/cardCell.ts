export type CardCell = {
  amount: number; // e.g., 0, 0.5, 1, 2
  asset_contract?: string; // ERC20 address
  friend_fid?: number;
  friend_username?: string;
  friend_pfp?: string;
  friend_wallet?: string;
};
