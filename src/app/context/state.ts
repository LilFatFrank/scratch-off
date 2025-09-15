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
  getWinnerGif: (() => HTMLImageElement | null) | null;
  swipableMode: boolean;
  bestFriends: BestFriend[] | [];
  unscratchedCards: Card[] | [];
  refetchUserCards: (() => Promise<void>) | null;
  buyCards: (() => void) | null;
  currentCardIndex: number;
  nextCard: (() => void) | null;
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
  getWinnerGif: null,
  swipableMode: false,
  bestFriends: [],
  unscratchedCards: [],
  refetchUserCards: null,
  buyCards: null,
  currentCardIndex: 0,
  nextCard: null,
};

export default initialState;
