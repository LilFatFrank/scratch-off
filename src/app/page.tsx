"use client";
import { useContext, useEffect, useState } from "react";
import { AppContext } from "./context";
import SwipeableCardStack from "~/components/swipeable-card-stack";
import { Card } from "./interface/card";
import { SET_SWIPABLE_MODE } from "./context/actions";

export default function Home() {
  const [state, dispatch] = useContext(AppContext);
  const [localCards, setLocalCards] = useState<Card[]>([]);

  useEffect(() => {
    dispatch({ type: SET_SWIPABLE_MODE, payload: true });
    return () => {
      dispatch({ type: SET_SWIPABLE_MODE, payload: false });
    };
  }, []);

  // Sync localCards with unscratched cards and update scratched status
  useEffect(() => {
    if (state.unscratchedCards.length > 0 || localCards.length > 0) {
      setLocalCards(prev => {
        // Create a set of unscratched card IDs for quick lookup
        const unscratchedIds = new Set(state.unscratchedCards.map(card => card.id));
        
        // Update existing cards: mark as scratched if not in unscratchedCards
        const updatedCards = prev.map(card => {
          if (unscratchedIds.has(card.id)) {
            // Card is still unscratched, keep it as is
            return card;
          } else {
            // Card is not in unscratchedCards, so it must be scratched
            return { ...card, scratched: true };
          }
        });
        
        // Add new unscratched cards that don't exist locally
        const existingIds = new Set(prev.map(card => card.id));
        const newCards = state.unscratchedCards.filter(card => !existingIds.has(card.id));
        
        return [...updatedCards, ...newCards];
      });
    }
  }, [state.unscratchedCards]);

  return (
    <>
      <SwipeableCardStack cards={localCards} />
    </>
  );
}
