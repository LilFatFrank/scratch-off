"use client";
import { motion } from "framer-motion";
import Image from "next/image";
import { chunk3, findWinningRow } from "~/lib/winningRow";
import { formatCell } from "~/lib/formatCell";
import { Card } from "~/app/interface/card";
import { USDC_ADDRESS } from "~/lib/constants";

interface CardGridProps {
  cards: Card[];
  onCardSelect: (card: Card) => void;
  showViewAll?: boolean;
  onViewAll?: () => void;
}

export default function CardGrid({
  cards,
  onCardSelect,
  showViewAll = false,
  onViewAll,
}: CardGridProps) {
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
            style={{
              opacity: !card.scratched || (card.scratched && card.prize_amount !== 0) ? 1 : 0.35,
            }}
            onClick={() => onCardSelect(card)}
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative"
            >
              {card.scratched ? (
                <div
                  className={`absolute rotate-[-4deg] font-[ABCGaisyr] text-[28px] inset-0 rounded-lg z-30 flex items-center justify-center font-bold text-center text-white`}
                >
                  {card.prize_amount > 0 ? `${formatCell(card.prize_amount, card.prize_asset_contract || USDC_ADDRESS)}` : ""}
                </div>
              ) : null}
              {card.scratched && card.numbers_json ? (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center rotate-[-4deg]">
                  {(() => {
                    const rows = chunk3(card.numbers_json);
                    const winningRowIdx = findWinningRow(
                      card.numbers_json,
                      card.prize_amount,
                      card.prize_asset_contract || ""
                    );

                    return (
                      <div className="grid grid-rows-4 gap-[1px]">
                        {rows.map((row, index) => {
                          const isWinning = winningRowIdx === index;
                          return (
                            <div
                              key={index}
                              className="grid grid-cols-3 gap-[1px] rotate-1"
                            >
                              {row.map((cell, cellIndex) => (
                                <div
                                  key={`${cell.amount}-${cellIndex}`}
                                  className={`w-[17.5px] h-[17.5px] rounded-[3px] font-[ABCGaisyr] font-bold text-[8px] leading-[90%] italic flex items-center justify-center ${
                                    isWinning
                                      ? "!text-[#00A151]/20 !bg-[#00A151]/10"
                                      : "!text-[#000]/10 !bg-[#000]/5"
                                  }`}
                                  style={{
                                    filter:
                                      "drop-shadow(0px 0.5px 0.5px rgba(0, 0, 0, 0.15))",
                                    textShadow:
                                      "0px 0.5px 0.5px rgba(0, 0, 0, 0.15), 0px -0.5px 0.5px rgba(255, 255, 255, 0.1)",
                                  }}
                                >
                                  {cell.friend_pfp ? (
                                    // Show friend PFP if available
                                    <div className="relative">
                                      <Image
                                        src={cell.friend_pfp}
                                        alt={`${cell.friend_username || 'Friend'}`}
                                        width={12}
                                        height={12}
                                        className="rounded-full object-cover"
                                        style={{
                                          width: 12,
                                          height: 12,
                                          filter: "saturate(0.01)",
                                          opacity: 0.8,
                                        }}
                                        unoptimized
                                      />
                                      {isWinning && (
                                        <div
                                          className="absolute inset-0 rounded-full"
                                          style={{
                                            backgroundColor: "#00a151",
                                            opacity: 0.4,
                                          }}
                                        />
                                      )}
                                    </div>
                                  ) : (
                                    // Show amount if no friend PFP
                                    formatCell(cell.amount, cell.asset_contract || "")
                                  )}
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
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
