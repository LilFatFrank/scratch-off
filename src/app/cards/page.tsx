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
            className="h-full overflow-hidden relative"
          >
            <div className="h-full overflow-y-auto px-4">
              <div className="pt-4 pb-7">
                <CardGrid cards={state.cards} onCardSelect={handleCardSelect} />
              </div>
            </div>
            {/* Fade effect at the bottom */}
            <div 
              className="absolute bottom-[-1px] left-0 right-0 h-12 pointer-events-none z-[31]"
              style={{
                background: 'linear-gradient(transparent, rgb(94 32 174) 75%)'
              }}
            />
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
