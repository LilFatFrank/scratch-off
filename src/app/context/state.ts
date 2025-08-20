import { User } from "../interface/user";
import { Card } from "../interface/card";

export interface AppState {
  appBackground: string;
  appColor: string;
  hasProvider: boolean;
  publicKey: string;
  user: User | null;
  isInMiniApp: boolean;
  selectedCard: Card | null;
  cards: Card[] | [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  userReveals: any[] | [];
}

const initialState: AppState = {
  appBackground: "linear-gradient(to bottom, #090210, #7727DE)",
  appColor: "#7727DE",
  hasProvider: false,
  publicKey: "",
  user: null,
  isInMiniApp: false,
  selectedCard: null, 
  cards: [],
  userReveals: [],
};

export default initialState;
