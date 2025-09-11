"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "~/app/interface/card";
import ScratchOff from "./scratch-off";
import Image from "next/image";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "~/lib/constants";

interface SwipeableCardStackProps {
  cards: Card[];
  initialIndex?: number;
}

export default function SwipeableCardStack({
  cards,
  initialIndex = 0,
}: SwipeableCardStackProps) {
  const [currentCardNo, setCurrentCardNo] = useState<number | null>(null);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  // Initialize current card number
  useEffect(() => {
    if (cards.length > 0 && !currentCardNo) {
      const initialCard = cards[initialIndex] || cards[0];
      setCurrentCardNo(initialCard.card_no);
    }
  }, [cards, initialIndex, currentCardNo]);

  // Find current card
  const current = cards.find((card) => card.card_no === currentCardNo);
  const currentIndex = current
    ? cards.findIndex((card) => card.card_no === currentCardNo)
    : -1;

  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < cards.length - 1;

  // Mouse handlers for card tilt
  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const percentX = (x / rect.width) * 2 - 1; // -1 to 1
    const percentY = (y / rect.height) * 2 - 1; // -1 to 1
    setTilt({
      x: percentY * 20, // max 20deg up/down
      y: percentX * 20, // max 20deg left/right
    });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  const handleDragEnd = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _: any,
    info: { offset: { x: number }; velocity: { x: number } }
  ) => {
    const offsetX = info.offset.x;
    const velocityX = info.velocity.x;
    const threshold = 90;

    if ((offsetX > threshold || velocityX > 500) && canGoPrev) {
      setDirection(-1); // Swipe right = go to previous card
      const prevCard = cards[currentIndex - 1];
      if (prevCard) setCurrentCardNo(prevCard.card_no);
      return;
    }
    if ((offsetX < -threshold || velocityX < -500) && canGoNext) {
      setDirection(1); // Swipe left = go to next card
      const nextCard = cards[currentIndex + 1];
      if (nextCard) setCurrentCardNo(nextCard.card_no);
      return;
    }
  };

  // Ensure currentIndex is within bounds
  const safeIndex = Math.max(0, Math.min(currentIndex, cards.length - 1));
  const prev = canGoPrev ? cards[safeIndex - 1] : null;
  const next = canGoNext ? cards[safeIndex + 1] : null;

  return (
    <div className="h-full relative">
      <div className="h-full flex flex-col items-center justify-between">
        {/* Behind previews: low opacity, non-interactive */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {prev ? (
            <motion.div
              key={`prev-${prev.id}`}
              className="absolute"
              initial={{ opacity: 0, scale: 0.7, x: -72, y: 0 }}
              animate={{ opacity: 0.18, scale: 0.7, x: -72, y: 0 }}
              exit={{ opacity: 0, scale: 0.7, x: -72, y: 0 }}
              transition={{ duration: 0.25 }}
              style={{ zIndex: 1 }}
            >
              <ScratchOff cardData={prev} isDetailView />
            </motion.div>
          ) : null}
          {next ? (
            <motion.div
              key={`next-${next.id}`}
              className="absolute"
              initial={{ opacity: 0, scale: 0.7, x: 72, y: 0 }}
              animate={{ opacity: 0.18, scale: 0.7, x: 72, y: 0 }}
              exit={{ opacity: 0, scale: 0.7, x: 72, y: 0 }}
              transition={{ duration: 0.25 }}
              style={{ zIndex: 1 }}
            >
              <ScratchOff cardData={next} isDetailView />
            </motion.div>
          ) : null}
        </div>

        {/* Active card */}
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={currentCardNo}
            className="relative z-10"
            initial={{
              opacity: 0,
              x: direction * 100, // Enter from the opposite direction of swipe
              scale: 0.98,
            }}
            animate={{
              opacity: 1,
              x: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              x: -direction * 100, // Exit in the direction of swipe
              scale: 0.98,
            }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
          >
            {/* Swipe areas - 20% on each side */}
            <div
              className="absolute left-0 top-0 w-[20%] h-full z-20 cursor-grab active:cursor-grabbing"
              onPointerDown={(e) => {
                e.stopPropagation();
                const startX = e.clientX;
                const startY = e.clientY;

                const handleMove = (moveEvent: PointerEvent) => {
                  const deltaX = moveEvent.clientX - startX;
                  const deltaY = moveEvent.clientY - startY;

                  // Only trigger swipe if horizontal movement is greater than vertical
                  if (
                    Math.abs(deltaX) > Math.abs(deltaY) &&
                    Math.abs(deltaX) > 10
                  ) {
                    handleDragEnd(null, {
                      offset: { x: deltaX },
                      velocity: { x: deltaX * 10 },
                    });
                  }
                };

                const handleUp = () => {
                  document.removeEventListener("pointermove", handleMove);
                  document.removeEventListener("pointerup", handleUp);
                };

                document.addEventListener("pointermove", handleMove);
                document.addEventListener("pointerup", handleUp);
              }}
            />

            <div
              className="absolute right-0 top-0 w-[20%] h-full z-20 cursor-grab active:cursor-grabbing"
              onPointerDown={(e) => {
                e.stopPropagation();
                const startX = e.clientX;
                const startY = e.clientY;

                const handleMove = (moveEvent: PointerEvent) => {
                  const deltaX = moveEvent.clientX - startX;
                  const deltaY = moveEvent.clientY - startY;

                  // Only trigger swipe if horizontal movement is greater than vertical
                  if (
                    Math.abs(deltaX) > Math.abs(deltaY) &&
                    Math.abs(deltaX) > 10
                  ) {
                    handleDragEnd(null, {
                      offset: { x: deltaX },
                      velocity: { x: deltaX * 10 },
                    });
                  }
                };

                const handleUp = () => {
                  document.removeEventListener("pointermove", handleMove);
                  document.removeEventListener("pointerup", handleUp);
                };

                document.addEventListener("pointermove", handleMove);
                document.addEventListener("pointerup", handleUp);
              }}
            />

            {/* Center 70% for scratching */}
            <div className="w-full h-[auto]">
              {cards.length ? (
                <ScratchOff
                  cardData={current || null}
                  isDetailView
                  hasNext={canGoNext}
                  onNext={() => {
                    if (canGoNext) {
                      setDirection(1);
                      const nextCard = cards[currentIndex + 1];
                      if (nextCard) setCurrentCardNo(nextCard.card_no);
                    }
                  }}
                />
              ) : (
                <AnimatePresence>
                  <motion.div
                    key="empty-state"
                    ref={cardRef}
                    className="relative"
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      y: 0,
                      rotateX: tilt.x,
                      rotateY: tilt.y,
                    }}
                    exit={{ opacity: 0, scale: 0.8, y: 20 }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 20,
                      duration: 0.6,
                    }}
                    style={{
                      perspective: 1000,
                      marginTop: 64,
                    }}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                  >
                    {/* Shadow element below the card */}
                    <motion.div
                      style={{
                        position: "absolute",
                        top: 30,
                        left: 0,
                        width: CANVAS_WIDTH,
                        height: CANVAS_HEIGHT,
                        background: "rgba(0, 0, 0, 0.4)",
                        filter: "blur(28px)",
                        borderRadius: 4,
                        zIndex: 0,
                      }}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2, duration: 0.4 }}
                    />
                    <motion.div
                      style={{
                        position: "relative",
                        zIndex: 1,
                      }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3, duration: 0.4 }}
                    >
                      <Image
                        src="/assets/scratched-card-image.png"
                        alt="Revealed"
                        width={CANVAS_WIDTH}
                        height={CANVAS_HEIGHT}
                        style={{
                          width: CANVAS_WIDTH,
                          height: CANVAS_HEIGHT,
                          objectFit: "cover",
                          borderRadius: 4,
                          display: "block",
                          userSelect: "none",
                          pointerEvents: "none",
                          opacity: 0.75,
                        }}
                      />
                    </motion.div>
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
