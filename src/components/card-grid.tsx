"use client";
import { motion } from "framer-motion";
import Image from "next/image";

interface Card {
  id: string;
  user_wallet: string;
  payment_tx: string;
  prize_amount: number;
  scratched_at?: string;
  claimed: boolean;
  payout_tx?: string;
  created_at: string;
  scratched: boolean;
  card_no: number;
}

interface CardGridProps {
  cards: Card[];
  onCardSelect: (card: Card) => void;
}

export default function CardGrid({ cards, onCardSelect }: CardGridProps) {
  return (
    <div className="h-full overflow-auto">
      <div className="grid grid-cols-4 gap-4 mx-auto">
        {cards.map((card, index) => (
          <motion.div
            key={card.id}
            layoutId={`card-${card.id}`}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{
              delay: index * 0.1,
              layout: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] },
            }}
            className="cursor-pointer h-fit"
            onClick={() => onCardSelect(card)}
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative"
            >
              <div
                style={{
                  position: "absolute",
                  top: 8,
                  left: 0,
                  width: 80,
                  height: 102,
                  background: "rgba(0, 0, 0, 0.4)",
                  filter: "blur(28px)",
                  borderRadius: 4,
                  zIndex: 0,
                }}
              />
              <div
                style={{
                  position: "relative",
                  zIndex: 1,
                }}
              >
                <Image
                  src={
                    card.scratched
                      ? "/assets/scratched-card-image.png"
                      : "/assets/scratch-card-image.png"
                  }
                  alt={card.scratched ? "Scratched Card" : "Unscratched Card"}
                  unoptimized
                  priority
                  width={80}
                  height={102}
                />
              </div>
            </motion.div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
