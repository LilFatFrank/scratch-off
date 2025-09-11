"use client";
import { useContext } from "react";
import { AppContext } from "../context";
import { SET_SELECTED_CARD } from "../context/actions";
import ScratchOff from "~/components/scratch-off";
import CardGrid from "~/components/card-grid";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "../interface/card";

export default function Home() {
  const [state, dispatch] = useContext(AppContext);

  const handleCardSelect = (card: Card) => {
    dispatch({ type: SET_SELECTED_CARD, payload: card });
  };

  return (
    <>
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
              onPrizeRevealed={() => {}}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
