import { Action } from "./action";
import { SET_APP_BACKGROUND, SET_APP_COLOR, SET_HAS_PROVIDER, SET_PUBLIC_KEY, SET_USER } from "./actions";
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
    default:
      return state;
  }
};

export default reducer;
