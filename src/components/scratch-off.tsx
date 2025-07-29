"use client";
import { useRef, useEffect, useState, useContext } from "react";
import { motion } from "framer-motion";
import { AppContext } from "~/app/context";
import { SET_APP_BACKGROUND, SET_APP_COLOR } from "~/app/context/actions";
import { APP_COLORS, CANVAS_HEIGHT, CANVAS_WIDTH, SCRATCH_RADIUS } from "~/lib/constants";


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

interface ScratchOffProps {
  cardData: Card | null;
  isDetailView?: boolean;
  onPrizeRevealed?: (prizeAmount: number) => void;
}

export default function ScratchOff({
  cardData,
  onPrizeRevealed,
}: ScratchOffProps) {
  const [, dispatch] = useContext(AppContext);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [scratched, setScratched] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [prizeAmount, setPrizeAmount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showBlurOverlay, setShowBlurOrverlay] = useState(false);

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

      if (percent > 5 && !scratched && !isProcessing) {
        setIsProcessing(true);

        // Call reveal API to get prize amount
        fetch("/api/cards/reveal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cardId: cardData?.id }),
        })
          .then((response) => response.json())
          .then((data) => {
            if (data.success) {
              setPrizeAmount(data.prizeAmount);
              setShowBlurOrverlay(data.prizeAmount > 0);
              if (data.prizeAmount > 0) {
                dispatch({
                  type: SET_APP_COLOR,
                  payload: APP_COLORS.WON,
                });
                dispatch({
                  type: SET_APP_BACKGROUND,
                  payload: `linear-gradient(to bottom, #090210, ${APP_COLORS.WON})`,
                });
              } else {
                dispatch({
                  type: SET_APP_COLOR,
                  payload: APP_COLORS.LOST,
                });
                dispatch({
                  type: SET_APP_BACKGROUND,
                  payload: `linear-gradient(to bottom, #090210, ${APP_COLORS.LOST})`,
                });
              }
              setScratched(true);

              // Process prize immediately with the API response
              if (cardData?.id) {
                fetch("/api/cards/process-prize", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    cardId: cardData.id,
                    userWallet: cardData.user_wallet,
                    prizeAmount: data.prizeAmount,
                  }),
                })
                  .then((response) => response.json())
                  .then((processData) => {
                    if (processData.success) {

                      onPrizeRevealed?.(data.prizeAmount);
                    }
                  })
                  .catch((error) => {
                    console.error("Failed to process prize:", error);
                  });
              }
            }
          })
          .catch((error) => {
            console.error("Failed to reveal prize:", error);
          });
      }
    };

    canvas.addEventListener("pointerdown", pointerDown);
    return () => {
      canvas.removeEventListener("pointerdown", pointerDown);
      window.removeEventListener("pointermove", pointerMove);
      window.removeEventListener("pointerup", pointerUp);
    };
  }, []);

  useEffect(() => {
    if (cardData && cardData.scratched) {
      if (cardData.prize_amount > 0) {
        dispatch({
          type: SET_APP_COLOR,
          payload: APP_COLORS.WON,
        });
        dispatch({
          type: SET_APP_BACKGROUND,
          payload: `linear-gradient(to bottom, #090210, ${APP_COLORS.WON})`,
        });
      } else {
        dispatch({
          type: SET_APP_COLOR,
          payload: APP_COLORS.LOST,
        });
        dispatch({
          type: SET_APP_BACKGROUND,
          payload: `linear-gradient(to bottom, #090210, ${APP_COLORS.LOST})`,
        });
      }
    }
  }, [cardData]);

  // Reset all state when component unmounts
  useEffect(() => {
    return () => {
      setScratched(false);
      setPrizeAmount(0);
      setIsProcessing(false);
      setShowBlurOrverlay(false);
      setTilt({ x: 0, y: 0 });
      dispatch({
        type: SET_APP_COLOR,
        payload: APP_COLORS.DEFAULT,
      });
      dispatch({
        type: SET_APP_BACKGROUND,
        payload: `linear-gradient(to bottom, #090210, ${APP_COLORS.DEFAULT})`,
      });
    };
  }, []);

  return (
    <>
      <div className="h-full flex flex-col items-center justify-center">
        <p
          className="font-[ABCGaisyr] text-center text-[30px] mb-5 font-bold italic rotate-[-4deg]"
          style={{
            visibility: cardData?.scratched || scratched ? "visible" : "hidden",
            color:
              cardData?.prize_amount || prizeAmount
                ? "#fff"
                : "rgba(255, 255, 255, 0.4)",
            textShadow:
              cardData?.prize_amount || prizeAmount
                ? "0px 0px 3.91px #00A34F, 0px 0px 7.82px #00A34F, 0px 0px 27.38px #00A34F, 0px 0px 54.76px #00A34F, 0px 0px 93.88px #00A34F, 0px 0px 164.29px #00A34F"
                : "none",
          }}
        >
          {cardData?.prize_amount || prizeAmount
            ? `Won $${cardData?.prize_amount || prizeAmount}!`
            : " No win!"}
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
              {(!cardData?.scratched && !scratched) && (
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
      {showBlurOverlay && (
        <div
          className="fixed inset-0 z-50 backdrop-blur-md text-white flex flex-col items-center justify-center"
          style={{ pointerEvents: "auto" }}
        >
          <img
            src={"/assets/winner.gif"}
            alt="winner"
            className="fixed w-full h-dvh top-0 bottom-0 left-0 right-0 object-cover"
          />
          <p className="font-[ABCGaisyr] font-bold text-center text-white text-[46px] leading-[90%] italic rotate-[-6deg]">
            You&apos;ve won
            <br />
            <span className="font-[ABCGaisyr] font-bold text-white text-[94px] leading-[90%] italic">
              ${prizeAmount}!
            </span>
          </p>
        </div>
      )}
    </>
  );
}
