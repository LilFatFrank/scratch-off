import { Action } from "./action";
import {
  SET_ACTIVITY,
  SET_APP_BACKGROUND,
  SET_APP_COLOR,
  SET_APP_STATS,
  SET_CARDS,
  SET_HAS_PROVIDER,
  SET_IS_IN_MINIAPP,
  SET_LEADERBOARD,
  SET_PLAY_WIN_SOUND,
  SET_PUBLIC_KEY,
  SET_SELECTED_CARD,
  SET_USER,
  SET_BEST_FRIENDS,
  SET_GET_WINNER_GIF,
  SET_SWIPABLE_MODE,
  SET_UNSCRATCHED_CARDS,
  SET_REFETCH_USER_CARDS,
  SET_BUY_CARDS,
  SET_CURRENT_CARD_INDEX,
  SET_NEXT_CARD,
} from "./actions";
import { AppState } from "./state";

const reducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case SET_APP_BACKGROUND:
      return {
        ...state,
        appBackground: action.payload,
      };
    case SET_APP_COLOR:
      return {
        ...state,
        appColor: action.payload,
      };
    case SET_HAS_PROVIDER:
      return {
        ...state,
        hasProvider: action.payload,
      };
    case SET_PUBLIC_KEY:
      return {
        ...state,
        publicKey: action.payload,
      };
    case SET_USER:
      return {
        ...state,
        user: action.payload,
      };
    case SET_IS_IN_MINIAPP:
      return {
        ...state,
        isInMiniApp: action.payload,
      };
    case SET_SELECTED_CARD:
      return {
        ...state,
        selectedCard: action.payload,
      };
    case SET_CARDS:
      return {
        ...state,
        cards: action.payload,
      };
    case SET_LEADERBOARD:
      return {
        ...state,
        leaderboard: action.payload,
      };
    case SET_ACTIVITY:
      return {
        ...state,
        activity: action.payload,
      };
    case SET_APP_STATS:
      return {
        ...state,
        appStats: action.payload,
      };
    case SET_PLAY_WIN_SOUND:
      return {
        ...state,
        playWinSound: action.payload,
      };
    case SET_GET_WINNER_GIF:
      return {
        ...state,
        getWinnerGif: action.payload,
      };
    case SET_BEST_FRIENDS:
      return {
        ...state,
        bestFriends: action.payload,
      };
    case SET_SWIPABLE_MODE:
      return {
        ...state,
        swipableMode: action.payload,
      };
    case SET_UNSCRATCHED_CARDS:
      return {
        ...state,
        unscratchedCards: action.payload,
      };
    case SET_REFETCH_USER_CARDS:
      return {
        ...state,
        refetchUserCards: action.payload,
      };
    case SET_BUY_CARDS:
      return {
        ...state,
        buyCards: action.payload,
      };
    case SET_CURRENT_CARD_INDEX:
      return {
        ...state,
        currentCardIndex: action.payload,
      };
    case SET_NEXT_CARD:
      return {
        ...state,
        nextCard: action.payload,
      };
    default:
      return state;
  }
};

export default reducer;
