import { User } from "../interface/user";
import { Card } from "../interface/card";
import { AppStats } from "../interface/appStats";
import { Reveal } from "../interface/reveal";
import { BestFriend } from "../interface/bestFriends";

export interface AppState {
  appBackground: string;
  appColor: string;
  hasProvider: boolean;
  publicKey: string;
  user: User | null;
  isInMiniApp: boolean;
  selectedCard: Card | null;
  cards: Card[] | [];
  appStats: AppStats | null;
  leaderboard: User[] | [];
  activity: Reveal[] | [];
  playWinSound: (() => void) | null;
  getScratchCardImage: (() => HTMLImageElement | null) | null;
  getWinnerGif: (() => HTMLImageElement | null) | null;
  swipableMode: boolean;
  bestFriends: BestFriend[] | [];
  unscratchedCards: Card[] | [];
  refetchUserCards: (() => Promise<void>) | null;
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
  appStats: null, 
  leaderboard: [],
  activity: [],
  playWinSound: null,
  getScratchCardImage: null,
  getWinnerGif: null,
  swipableMode: false,
  bestFriends: [],
  unscratchedCards: [],
  refetchUserCards: null,
};

export default initialState;
