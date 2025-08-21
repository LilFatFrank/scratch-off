import { Action } from "./action";
import { SET_APP_BACKGROUND, SET_APP_COLOR, SET_APP_STATS, SET_CARDS, SET_HAS_PROVIDER, SET_IS_IN_MINIAPP, SET_PUBLIC_KEY, SET_SELECTED_CARD, SET_USER, SET_USER_REVEALS } from "./actions";
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
        hasProvider: action.payload
      }
    case SET_PUBLIC_KEY:
      return {
        ...state,
        publicKey: action.payload
      }
    case SET_USER:
      return {
        ...state,
        user: action.payload
      }
    case SET_IS_IN_MINIAPP:
      return {
        ...state,
        isInMiniApp: action.payload
      } 
    case SET_SELECTED_CARD:
      return {
        ...state,
        selectedCard: action.payload
      }
    case SET_CARDS:
      return {
        ...state,
        cards: action.payload
      }
    case SET_USER_REVEALS:
      return {
        ...state,
        userReveals: action.payload
      }
    case SET_APP_STATS:
      return {
        ...state,
        appStats: action.payload
      }
    default:
      return state;
  }
};

export default reducer;
