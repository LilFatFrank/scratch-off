import { Action } from "./action";
import { SET_APP_BACKGROUND, SET_APP_COLOR } from "./actions";
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
    default:
      return state;
  }
};

export default reducer;
