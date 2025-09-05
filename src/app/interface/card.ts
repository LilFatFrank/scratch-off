import { CardCell } from "./cardCell";

export interface Card {
  id: string;
  user_wallet: string;
  payment_tx: string;
  prize_amount: number;
  scratched_at?: string;
  prize_asset_contract: string;
  numbers_json: CardCell[];
  claimed: boolean;
  payout_tx?: string;
  created_at: string;
  scratched: boolean;
  card_no: number;
  shared_to: string;
}
