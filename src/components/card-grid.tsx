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
  showViewAll?: boolean;
  onViewAll?: () => void;
}

export default function CardGrid({ cards, onCardSelect, showViewAll = false, onViewAll }: CardGridProps) {
  const displayCards = showViewAll ? cards.slice(0, 7) : cards;
  const hasMoreCards = showViewAll && cards.length > 7;

  return (
    <div className="w-full">
      <div className="grid grid-cols-4 gap-4 mx-auto">
        {displayCards.map((card, index) => (
          <motion.div
            key={card.id}
            layoutId={`card-${card.id}`}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{
              delay: index * 0.1,
              layout: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] },
            }}
            className="cursor-pointer h-fit relative"
            onClick={() => onCardSelect(card)}
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative"
            >
              {card.scratched ? (
                <div className={`absolute rotate-[-4deg] font-[ABCGaisyr] text-[28px] inset-0 bg-black/10 rounded-lg z-20 flex items-center justify-center font-bold text-center ${card.prize_amount ? "text-white" : "text-[#5e5e5e]/80"}`}>
                  {card.prize_amount ? `$${card.prize_amount}` : "No win!"}
                </div>
              ) : null}
              <div
                style={{
                  position: "absolute",
                  top: 8,
                  left: 0,
                  width: 80,
                  height: 102,
                  background: "rgba(0, 0, 0, 0.4)",
                  filter: "blur(8px)",
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
        
        {/* View All Overlay */}
        {hasMoreCards && (
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{
              delay: 7 * 0.1,
              layout: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] },
            }}
            className="cursor-pointer h-fit relative"
            onClick={onViewAll}
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative"
            >
              {/* Darker background overlay */}
              <div
                style={{
                  position: "absolute",
                  top: 8,
                  left: 0,
                  width: 80,
                  height: 102,
                  background: "rgba(0, 0, 0, 0.6)",
                  filter: "blur(8px)",
                  borderRadius: 4,
                  zIndex: 0,
                }}
              />
              
              {/* Scratched card image */}
              <div
                style={{
                  position: "relative",
                  zIndex: 1,
                }}
              >
                <Image
                  src="/assets/scratched-card-image.png"
                  alt="View All Cards"
                  unoptimized
                  priority
                  width={80}
                  height={102}
                  className="opacity-60"
                />
              </div>
              
              {/* View All text overlay */}
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center rotate-[-4deg]">
                <p className="text-white font-[ABCGaisyr] text-[14px] font-bold leading-[90%] mb-1 italic">
                  VIEW
                </p>
                <p className="text-white font-[ABCGaisyr] text-[14px] font-bold leading-[90%] italic">
                  ALL
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
