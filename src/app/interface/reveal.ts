export interface Reveal {
  id: string;
  card_id: string;
  user_wallet: string;
  prize_amount: number;
  created_at: string;
  updated_at: string;
  username: string;
  pfp: string;
  payment_tx: string;
  payout_tx: string | null;
  won: boolean;
}
