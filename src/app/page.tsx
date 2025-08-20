"use client";
import { useContext } from "react";
import { AppContext } from "./context";
import {
  SET_CARDS,
  SET_SELECTED_CARD,
  SET_USER,
  SET_USER_REVEALS,
} from "./context/actions";
import ScratchOff from "~/components/scratch-off";
import CardGrid from "~/components/card-grid";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "./interface/card";
import {
  fetchUserCards,
  fetchUserInfo,
  fetchUserReveals,
} from "~/lib/userapis";

export default function Home() {
  const [state, dispatch] = useContext(AppContext);

  // Function to refresh cards (can be called after buying new cards)
  const refreshCards = async () => {
    try {
      const cards = await fetchUserCards(state.publicKey);
      dispatch({ type: SET_CARDS, payload: cards });
    } catch (e) {
      console.log("error refreshing cards", e);
    }
  };

  // Function to refresh reveals (can be called after processing a prize)
  const refreshReveals = async () => {
    try {
      const reveals = await fetchUserReveals(state.publicKey);
      dispatch({ type: SET_USER_REVEALS, payload: reveals });
    } catch (e) {
      console.log("error refreshing reveals", e);
    }
  };

  // Function to refresh user info (can be called after processing a prize)
  const refreshUserInfo = async () => {
    try {
      const userInfo = await fetchUserInfo(state.publicKey);
      dispatch({
        type: SET_USER,
        payload: userInfo,
      });
    } catch (e) {
      console.log("error refreshing user info", e);
    }
  };

  const handleCardSelect = (card: Card) => {
    dispatch({ type: SET_SELECTED_CARD, payload: card });
  };

  return (
    <AnimatePresence mode="wait">
      {!state.selectedCard && state.cards.length ? (
        <motion.div
          key="grid"
          transition={{ duration: 0.3 }}
          className="h-full overflow-hidden"
        >
          <div className="h-full overflow-y-auto px-4">
            <div className="pt-4 pb-7">
              <CardGrid cards={state.cards} onCardSelect={handleCardSelect} />
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="detail"
          transition={{ duration: 0.3 }}
          className="h-full flex items-center justify-center px-4"
        >
          <ScratchOff
            cardData={state.selectedCard}
            isDetailView={true}
            onPrizeRevealed={() => {
              refreshUserInfo();
              refreshReveals();
              refreshCards();
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
