"use client";
import { createContext, FC, useEffect, useReducer } from "react";
import { Action } from "./action";
import reducer from "./reducer";
import initialState, { AppState } from "./state";
import { sdk } from "@farcaster/miniapp-sdk";
import { SET_HAS_PROVIDER, SET_IS_IN_MINIAPP, SET_PUBLIC_KEY, SET_USER } from "./actions";

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
      method: "connect",
    });

    const userWallet = pk?.publicKey;
    const user = (await sdk.context)?.user
    const isInMiniApp = await sdk.isInMiniApp();

    dispatch({
      type: SET_PUBLIC_KEY,
      payload: userWallet,
    });

    dispatch({
      type: SET_IS_IN_MINIAPP,
      payload: isInMiniApp
    })

    // Check if wallet exists and create user if needed
    if (userWallet && user.fid) {
      await checkAndCreateUser(userWallet, user.fid, user.username || "");
    }
  };

  const checkAndCreateUser = async (userWallet: string, fid: number, username: string) => {
    try {
      const response = await fetch("/api/users/check-or-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userWallet, fid, username }),
      });

      if (response.ok) {
        const data = await response.json();

        dispatch({
          type: SET_USER,
          payload: data.user,
        });
      } else {
        console.error("Failed to check/create user");
      }
    } catch (error) {
      console.error("Error checking/creating user:", error);
    }
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
