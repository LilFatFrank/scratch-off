import { User } from "../interface/user";
import { Card } from "../interface/card";
import { AppStats } from "../interface/appStats";
import { Reveal } from "../interface/reveal";

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
};

export default initialState;
