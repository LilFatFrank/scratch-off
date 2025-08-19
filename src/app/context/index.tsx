"use client";
import { createContext, FC, useEffect, useReducer } from "react";
import { Action } from "./action";
import reducer from "./reducer";
import initialState, { AppState } from "./state";
import { sdk } from "@farcaster/miniapp-sdk";
import { SET_HAS_PROVIDER, SET_IS_IN_MINIAPP, SET_PUBLIC_KEY, SET_USER } from "./actions";
import { useMiniApp } from "@neynar/react";

interface ContextProps {
  children: React.ReactNode;
}

export const AppContext = createContext<[AppState, React.Dispatch<Action>]>([
  initialState,
  () => {},
]);

export const AppContextProvider: FC<ContextProps> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { context } = useMiniApp();

  const getProvider = async () => {
    const provider = await sdk.wallet.getEthereumProvider();
    dispatch({
      type: SET_HAS_PROVIDER,
      payload: !!provider,
    });

    const user = (context)?.user;
    const isInMiniApp = await sdk.isInMiniApp();

    // Get user's address from provider
    const accounts = await provider?.request({ method: 'eth_accounts' }) as string[];
    const userAddress = accounts?.[0];

    dispatch({
      type: SET_PUBLIC_KEY,
      payload: userAddress,
    });

    dispatch({
      type: SET_IS_IN_MINIAPP,
      payload: isInMiniApp
    });

    // Check if wallet exists and create user if needed
    if (userAddress && user?.fid) {
      await checkAndCreateUser(userAddress, user.fid, user.username || "", user?.pfpUrl || "");
    }
  };

  const checkAndCreateUser = async (userWallet: string, fid: number, username: string, pfp: string) => {
    try {
      const response = await fetch("/api/users/check-or-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userWallet, fid, username, pfp: pfp }),
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
  }, [context?.user?.fid]);

  return (
    <AppContext.Provider value={[state, dispatch]}>
      {children}
    </AppContext.Provider>
  );
};
