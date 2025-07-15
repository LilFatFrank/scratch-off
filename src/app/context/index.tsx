"use client";
import { createContext, FC, useEffect, useReducer } from "react";
import { Action } from "./action";
import reducer from "./reducer";
import initialState, { AppState } from "./state";
import { sdk } from "@farcaster/miniapp-sdk";
import { SET_HAS_PROVIDER, SET_PUBLIC_KEY } from "./actions";

interface ContextProps {
  children: React.ReactNode;
}

export const AppContext = createContext<[AppState, React.Dispatch<Action>]>([
  initialState,
  () => {},
]);

export const AppContextProvider: FC<ContextProps> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const getProvider = async () => {
    const provider = await sdk.wallet.getSolanaProvider();
    dispatch({
      type: SET_HAS_PROVIDER,
      payload: !!provider,
    });
    const pk = await provider?.request({
      method: "connect"
    });
    dispatch({
      type: SET_PUBLIC_KEY,
      payload: pk?.publicKey
    })
  };

  useEffect(() => {
    getProvider();
  }, []);

  return (
    <AppContext.Provider value={[state, dispatch]}>
      {children}
    </AppContext.Provider>
  );
};
