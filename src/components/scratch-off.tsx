"use client";
import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";

const CANVAS_WIDTH = 343;
const CANVAS_HEIGHT = 418;
const SCRATCH_RADIUS = 24;
const SCRATCH_THRESHOLD = 45;

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
}

interface ScratchOffProps {
  cardData: Card | null;
  isDetailView?: boolean;
}

export default function ScratchOff({
  cardData,
  isDetailView = false,
}: ScratchOffProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [scratched, setScratched] = useState(cardData?.scratched || false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [prizeAmount, setPrizeAmount] = useState(cardData?.prize_amount || 0);

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

  // Draw the cover image on the canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const coverImg = new window.Image();
    coverImg.src = "/assets/scratch-card-image.png";
    coverImg.onload = () => {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      // Scale the image to fill the entire canvas, removing any borders
      ctx.drawImage(
        coverImg,
        0,
        0,
        coverImg.width,
        coverImg.height,
        0,
        0,
        CANVAS_WIDTH,
        CANVAS_HEIGHT
      );
    };
  }, []);

  // Scratch logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let isDrawing = false;

    const getPointer = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) / rect.width) * CANVAS_WIDTH,
        y: ((e.clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
      };
    };

    const scratch = (x: number, y: number) => {
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(x, y, SCRATCH_RADIUS, 0, 2 * Math.PI);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
    };

    const pointerDown = (e: PointerEvent) => {
      if (!cardData) return;
      isDrawing = true;
      const { x, y } = getPointer(e);
      scratch(x, y);
      window.addEventListener("pointermove", pointerMove);
      window.addEventListener("pointerup", pointerUp, { once: true });
    };

    const pointerMove = (e: PointerEvent) => {
      if (!isDrawing) return;
      const { x, y } = getPointer(e);
      scratch(x, y);
    };

    const pointerUp = () => {
      isDrawing = false;
      window.removeEventListener("pointermove", pointerMove);
      setTimeout(checkScratched, 300);
    };

    const checkScratched = () => {
      const imageData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      let transparent = 0;
      for (let i = 3; i < imageData.data.length; i += 4) {
        if (imageData.data[i] === 0) transparent++;
      }
      const percent = (transparent / (CANVAS_WIDTH * CANVAS_HEIGHT)) * 100;
      if (percent > SCRATCH_THRESHOLD) setScratched(true);
    };

    canvas.addEventListener("pointerdown", pointerDown);
    return () => {
      canvas.removeEventListener("pointerdown", pointerDown);
      window.removeEventListener("pointermove", pointerMove);
      window.removeEventListener("pointerup", pointerUp);
    };
  }, []);

  return (
    <div className="h-full">
      <p
        className="font-[ABCGaisyr] text-white/40 text-center text-[30px] mb-5 font-bold italic rotate-[-4deg]"
        style={{ visibility: cardData?.claimed ? "visible" : "hidden" }}
      >
        No win!
      </p>
      <div className="flex-1 grow">
        <motion.div
          ref={cardRef}
          layoutId={cardData ? `card-${cardData.id}` : undefined}
          className="w-full relative"
          animate={{
            rotateX: tilt.x,
            rotateY: tilt.y,
            scale: scratched ? [1, 1.25, 1] : 1,
          }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 20,
            layout: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] },
            scale: {
              duration: 0.6,
              ease: "easeOut",
            },
          }}
          style={{
            perspective: 1000,
          }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Shadow element below the card */}
          <div
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
          />
          <div
            style={{
              position: "relative",
              zIndex: 1,
            }}
            className="flex items-center justify-center"
          >
            <img
              src="/assets/scratched-card-image.png"
              alt="Revealed"
              style={{
                width: CANVAS_WIDTH,
                height: CANVAS_HEIGHT,
                objectFit: "cover",
                borderRadius: 4,
                display: "block",
                userSelect: "none",
                pointerEvents: "none",
              }}
            />
            {/* Scratch cover */}
            {!scratched && (
              <canvas
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: CANVAS_WIDTH,
                  height: CANVAS_HEIGHT,
                  borderRadius: 4,
                  cursor: cardData ? "grab" : "default",
                  touchAction: "none",
                }}
              />
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
