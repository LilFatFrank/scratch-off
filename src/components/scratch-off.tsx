"use client";
import { useRef, useEffect, useState, useContext } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { AppContext } from "~/app/context";
import {
  SET_ACTIVITY,
  SET_APP_BACKGROUND,
  SET_APP_COLOR,
  SET_APP_STATS,
  SET_CARDS,
  SET_LEADERBOARD,
  SET_USER,
} from "~/app/context/actions";
import {
  APP_COLORS,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  CANVAS_DPI_SCALE,
  SCRATCH_RADIUS,
  USDC_ADDRESS,
} from "~/lib/constants";
import { useMiniApp } from "@neynar/react";
import { Card } from "~/app/interface/card";
import { formatCell } from "~/lib/formatCell";
import { chunk3, findWinningRow } from "~/lib/winningRow";
import { getRevealsToNextLevel } from "~/lib/level";
import { BestFriend } from "~/app/interface/bestFriends";

interface ScratchOffProps {
  cardData: Card | null;
  isDetailView?: boolean;
  onPrizeRevealed?: (prizeAmount: number) => void;
  hasNext?: boolean;
  onNext?: () => void;
}

export default function ScratchOff({
  cardData,
  onPrizeRevealed,
  hasNext,
  onNext,
}: ScratchOffProps) {
  const [state, dispatch] = useContext(AppContext);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [scratched, setScratched] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [prizeAmount, setPrizeAmount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showBlurOverlay, setShowBlurOrverlay] = useState(false);
  const [shareButtonText, setShareButtonText] = useState("Share Win");
  const [bestFriend, setBestFriend] = useState<BestFriend | null>(null);
  const [coverImageLoaded, setCoverImageLoaded] = useState(false);

  const { actions, haptics } = useMiniApp();

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

  const handleShare = async () => {
    if (!state.user) return;

    const baseUrl = process.env.NEXT_PUBLIC_URL;
    const frameUrl =
      `${baseUrl}/api/frame-share?` +
      new URLSearchParams({
        prize: prizeAmount.toString(),
        username: state.user.username || "",
        friend_username: bestFriend?.username || "",
      }).toString();

    try {
      await actions.composeCast({
        text:
          prizeAmount > 0
            ? `I just won ${formatCell(prizeAmount, USDC_ADDRESS)}!`
            : `I just won a free card for @${bestFriend?.username}!`,
        embeds: [frameUrl],
      });
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      // Fallback: open in new tab
      window.open(frameUrl, "_blank");
    }
  };

  // Draw the cover image on the canvas with high-DPI support
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set up high-DPI canvas
    const devicePixelRatio = window.devicePixelRatio || 1;
    const scale = CANVAS_DPI_SCALE * devicePixelRatio;

    // Set the actual canvas size to the scaled dimensions
    canvas.width = CANVAS_WIDTH * scale;
    canvas.height = CANVAS_HEIGHT * scale;

    // Scale the canvas back down using CSS
    canvas.style.width = CANVAS_WIDTH + "px";
    canvas.style.height = CANVAS_HEIGHT + "px";

    // Scale the drawing context so everything draws at the higher resolution
    ctx.scale(scale, scale);

    // Enable highest quality image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Additional quality settings for crisp rendering
    ctx.textBaseline = "top";

    // Use preloaded image from context
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
      setCoverImageLoaded(true);
    };
  }, []);

  // Scratch logic with touch/mouse events instead of pointer events
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let isDrawing = false;
    let lastPoint: { x: number; y: number } | null = null;

    const getEventPoint = (e: TouchEvent | MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      let clientX, clientY;
      
      if ('touches' in e) {
        if (e.touches.length === 0) return null;
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      
      return {
        x: ((clientX - rect.left) / rect.width) * CANVAS_WIDTH,
        y: ((clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
      };
    };

    const scratch = (x: number, y: number) => {
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(x, y, SCRATCH_RADIUS, 0, 2 * Math.PI);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
    };

    const drawLine = (from: { x: number; y: number }, to: { x: number; y: number }) => {
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.lineWidth = SCRATCH_RADIUS * 2;
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
    };

    // Touch events
    const touchStart = (e: TouchEvent) => {
      if (!cardData || isProcessing) return;
      e.preventDefault();
      const point = getEventPoint(e);
      if (!point) return;
      
      isDrawing = true;
      lastPoint = point;
      scratch(point.x, point.y);
    };

    const touchMove = (e: TouchEvent) => {
      if (!isDrawing) return;
      e.preventDefault();
      const point = getEventPoint(e);
      if (!point) return;
      
      if (lastPoint) {
        drawLine(lastPoint, point);
      }
      lastPoint = point;
      scratch(point.x, point.y);
    };

    const touchEnd = (e: TouchEvent) => {
      if (!isDrawing) return;
      e.preventDefault();
      isDrawing = false;
      lastPoint = null;
      setTimeout(checkScratched, 300);
    };

    // Mouse events (fallback)
    const mouseDown = (e: MouseEvent) => {
      if (!cardData || isProcessing) return;
      e.preventDefault();
      const point = getEventPoint(e);
      if (!point) return;
      
      isDrawing = true;
      lastPoint = point;
      scratch(point.x, point.y);
    };

    const mouseMove = (e: MouseEvent) => {
      if (!isDrawing) return;
      e.preventDefault();
      const point = getEventPoint(e);
      if (!point) return;
      
      if (lastPoint) {
        drawLine(lastPoint, point);
      }
      lastPoint = point;
      scratch(point.x, point.y);
    };

    const mouseUp = () => {
      if (!isDrawing) return;
      isDrawing = false;
      lastPoint = null;
      setTimeout(checkScratched, 300);
    };

    const checkScratched = () => {
      // Use the actual canvas dimensions (high-DPI scaled)
      const actualWidth = canvas.width;
      const actualHeight = canvas.height;
      const imageData = ctx.getImageData(0, 0, actualWidth, actualHeight);
      let transparent = 0;
      for (let i = 3; i < imageData.data.length; i += 4) {
        if (imageData.data[i] === 0) transparent++;
      }
      const percent = (transparent / (actualWidth * actualHeight)) * 100;

      if (percent > 40 && !scratched && !isProcessing) {
        setIsProcessing(true);

        // Use prize amount from card data directly
        const prizeAmount = cardData?.prize_amount || 0;
        setPrizeAmount(prizeAmount);
        setShowBlurOrverlay(prizeAmount > 0 || prizeAmount === -1);

        // optimistic update
        dispatch({
          type: SET_APP_STATS,
          payload: {
            ...state.appStats,
            reveals: (state.appStats?.reveals || 0) + 1,
            winnings:
              (state.appStats?.winnings || 0) +
              (prizeAmount < 0 ? 0 : prizeAmount),
          },
        });
        dispatch({
          type: SET_CARDS,
          payload: state.cards.map((card) =>
            card.id === cardData?.id
              ? {
                  ...card,
                  scratched: true,
                  scratched_at: new Date().toISOString(),
                  claimed: true,
                }
              : card
          ),
        });
        dispatch({
          type: SET_USER,
          payload: {
            ...state.user,
            amount_won:
              (state.user?.amount_won || 0) +
              (prizeAmount < 0 ? 0 : prizeAmount),
            total_wins:
              (state.user?.total_wins || 0) + (prizeAmount > 0 ? 1 : 0),
            total_reveals: (state.user?.total_reveals || 0) + 1,
            current_level:
              getRevealsToNextLevel(state.user?.current_level || 1) === 0
                ? (state.user?.current_level || 1) + 1
                : state.user?.current_level || 1,
            reveals_to_next_level:
              (state.user?.reveals_to_next_level ||
                getRevealsToNextLevel(state.user?.current_level || 1)) === 0
                ? getRevealsToNextLevel((state.user?.current_level || 1) + 1)
                : getRevealsToNextLevel(state.user?.current_level || 1),
            last_active: new Date().toISOString(),
          },
        });
        dispatch({
          type: SET_ACTIVITY,
          payload: [
            ...state.activity,
            {
              id: cardData?.id + new Date().toISOString(),
              card_id: cardData?.id,
              user_wallet: cardData?.user_wallet,
              prize_amount: prizeAmount < 0 ? 0 : prizeAmount,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              username: state.user?.username,
              pfp: state.user?.pfp,
              payment_tx: cardData?.payment_tx,
              payout_tx: null,
              won: prizeAmount > 0,
            },
          ],
        });
        dispatch({
          type: SET_LEADERBOARD,
          payload: state.leaderboard.map((user) =>
            user.wallet === cardData?.user_wallet
              ? {
                  ...user,
                  amount_won:
                    (user.amount_won || 0) +
                    (prizeAmount < 0 ? 0 : prizeAmount),
                  total_wins:
                    (user.total_wins || 0) + (prizeAmount > 0 ? 1 : 0),
                  total_reveals: (user.total_reveals || 0) + 1,
                  current_level:
                    getRevealsToNextLevel(state.user?.current_level || 1) === 0
                      ? (state.user?.current_level || 1) + 1
                      : state.user?.current_level || 1,
                  reveals_to_next_level:
                    (state.user?.reveals_to_next_level ||
                      getRevealsToNextLevel(state.user?.current_level || 1)) ===
                    0
                      ? getRevealsToNextLevel(
                          (state.user?.current_level || 1) + 1
                        )
                      : getRevealsToNextLevel(state.user?.current_level || 1),
                  last_active: new Date().toISOString(),
                }
              : user
          ),
        });

        if (prizeAmount > 0 || prizeAmount === -1) {
          dispatch({
            type: SET_APP_COLOR,
            payload: APP_COLORS.WON,
          });
          dispatch({
            type: SET_APP_BACKGROUND,
            payload: `linear-gradient(to bottom, #090210, ${APP_COLORS.WON})`,
          });
          haptics.impactOccurred("heavy");
          haptics.notificationOccurred("success");
          // Play win sound
          state.playWinSound?.();
          fetch("/api/neynar/send-notification", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fid: state.user?.fid,
              username: state.user?.username,
              amount: prizeAmount,
              friend_fid: bestFriend?.fid,
              bestFriends: state.bestFriends,
            }),
          }).catch((error) => {
            console.error("Failed to send notification:", error);
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

        // Process prize immediately
        if (cardData?.id) {
          fetch("/api/cards/process-prize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              cardId: cardData.id,
              userWallet: cardData.user_wallet,
              username: state.user?.username,
              pfp: state.user?.pfp,
              friends: state.bestFriends
            }),
          })
            .then((response) => response.json())
            .then((processData) => {
              const pa = Number(processData.prizeAmount || 0);
              setPrizeAmount(pa);
              if (processData.success) {
                onPrizeRevealed?.(prizeAmount);

                // If user leveled up and got free cards, refetch user cards
                if (processData.leveledUp && processData.freeCardsAwarded > 0) {
                  setTimeout(() => {
                    state.refetchUserCards?.();
                  }, 1000); // Wait 1 second for database to be fully updated
                }
              }
            })
            .catch((error) => {
              console.error("Failed to process prize:", error);
            });
        }
      }
    };

    // Add touch events (primary for mobile/webview)
    canvas.addEventListener("touchstart", touchStart, { passive: false });
    canvas.addEventListener("touchmove", touchMove, { passive: false });
    canvas.addEventListener("touchend", touchEnd, { passive: false });
    
    // Add mouse events (fallback for desktop)
    canvas.addEventListener("mousedown", mouseDown);
    document.addEventListener("mousemove", mouseMove);
    document.addEventListener("mouseup", mouseUp);

    return () => {
      // Remove touch events
      canvas.removeEventListener("touchstart", touchStart);
      canvas.removeEventListener("touchmove", touchMove);
      canvas.removeEventListener("touchend", touchEnd);
      
      // Remove mouse events
      canvas.removeEventListener("mousedown", mouseDown);
      document.removeEventListener("mousemove", mouseMove);
      document.removeEventListener("mouseup", mouseUp);
    };
  }, []);

  useEffect(() => {
    if (cardData && cardData.scratched) {
      if (cardData.prize_amount > 0 || cardData.prize_amount === -1) {
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

  // Populate best friend state when cardData changes
  useEffect(() => {
    if (cardData?.numbers_json && cardData?.shared_to) {
      const friendCell = cardData.numbers_json.find(
        (cell) => cell.friend_wallet === cardData.shared_to
      );

      if (
        friendCell &&
        friendCell.friend_fid &&
        friendCell.friend_username &&
        friendCell.friend_pfp &&
        friendCell.friend_wallet
      ) {
        setBestFriend({
          fid: friendCell.friend_fid,
          username: friendCell.friend_username,
          pfp: friendCell.friend_pfp,
          wallet: friendCell.friend_wallet,
        });
      }
    } else {
      setBestFriend(null);
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
      setShareButtonText("Share Win");
      setCoverImageLoaded(false);

      // Clear timeout on unmount
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

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
      <div className="h-full w-full flex flex-col items-center justify-center"
        style={{
          touchAction: (!cardData?.scratched && !scratched) ? "none" : "auto"
        }}>
        <p
          className="font-[ABCGaisyr] text-center text-[30px] mb-1 font-bold italic rotate-[-4deg]"
          style={{
            visibility: cardData?.scratched || scratched ? "visible" : "hidden",
            color:
              cardData?.prize_amount || prizeAmount
                ? "#fff"
                : "rgba(255, 255, 255, 0.4)",
            textShadow:
              cardData?.prize_amount || prizeAmount
                ? "0px 0px 1px #00A34F, 0px 0px 2px #00A34F, 0px 0px 6px #00A34F, 0px 0px 12px #00A34F"
                : "none",
          }}
        >
          {cardData?.prize_amount || prizeAmount
            ? prizeAmount === -1 || cardData?.prize_amount === -1
              ? `Won free card!`
              : `Won ${formatCell(
                  cardData?.prize_amount || prizeAmount,
                  USDC_ADDRESS
                )}!`
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
              {cardData?.numbers_json && (cardData?.scratched || scratched || coverImageLoaded) ? (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center rotate-[-4deg]">
                  {(() => {
                    const rows = chunk3(cardData.numbers_json);
                    const winningRowIdx = findWinningRow(
                      cardData.numbers_json,
                      cardData.prize_amount,
                      cardData.prize_asset_contract
                    );

                    return (
                      <div className="grid grid-rows-4 gap-1">
                        {rows.map((row, index) => {
                          const isWinning = winningRowIdx === index;
                          return (
                            <div
                              key={index}
                              className="grid grid-cols-3 gap-1 rotate-1"
                            >
                              {row.map((cell, cellIndex) => (
                                <div
                                  key={`${cell.amount}-${cellIndex}`}
                                  className={`w-[77px] h-[77px] rounded-[14px] font-[ABCGaisyr] font-bold text-[24px] leading-[90%] italic flex items-center justify-center ${
                                    isWinning
                                      ? "!text-[#00A151]/40 !bg-[#00A151]/15"
                                      : "!text-[#000]/15 !bg-[#000]/10"
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
                                        alt={`${
                                          cell.friend_username || "Friend"
                                        }`}
                                        width={48}
                                        height={48}
                                        className="rounded-full object-cover"
                                        style={{
                                          width: 48,
                                          height: 48,
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
                                    formatCell(
                                      cell.amount,
                                      cell.asset_contract || USDC_ADDRESS
                                    )
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
              {/* Scratch cover */}
              {(!cardData || (!cardData?.scratched && !scratched)) && (
                <canvas
                  ref={canvasRef}
                  style={{
                    zIndex: 20,
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: CANVAS_WIDTH,
                    height: CANVAS_HEIGHT,
                    borderRadius: 4,
                    cursor: cardData ? "grab" : "default",
                    touchAction: "manipulation",
                    WebkitTouchCallout: "none",
                    WebkitUserSelect: "none",
                    userSelect: "none",
                  }}
                />
              )}
            </div>
          </motion.div>
        </div>
      </div>
      {showBlurOverlay && (
        <motion.div
          className="fixed inset-0 z-50 backdrop-blur-md text-white flex flex-col items-center justify-center"
          style={{ pointerEvents: "auto" }}
          onClick={(e) => {
            // Tap outside content to dismiss
            if (e.target === e.currentTarget) {
              setShowBlurOrverlay(false);
            }
          }}
        >
          {/* Close button */}
          <button
            onClick={() => setShowBlurOrverlay(false)}
            className="absolute top-4 left-4 z-10 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
            style={{ top: "16px", left: "16px" }}
          >
            <Image
              src="/assets/cross-icon.svg"
              alt="Close"
              width={16}
              height={16}
              className="filter brightness-0 invert"
            />
          </button>
          {state.getWinnerGif?.() ? (
            <img
              src={state.getWinnerGif()?.src || "/assets/winner.gif"}
              alt="winner"
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <Image
              src={"/assets/winner.gif"}
              alt="winner"
              fill
              className="object-cover"
              unoptimized
            />
          )}
          <p className="font-[ABCGaisyr] font-bold text-center text-white text-[46px] leading-[92%] italic rotate-[-6deg]">
            {prizeAmount > 0 ? (
              <>You&apos;ve won</>
            ) : (
              <>
                You&apos;ve won a free card for you and @{bestFriend?.username}
              </>
            )}
            {prizeAmount > 0 ? (
              <>
                <br />
                <span className="font-[ABCGaisyr] font-bold text-white text-[94px] leading-[92%] italic">
                  {formatCell(prizeAmount, USDC_ADDRESS)}!
                </span>
              </>
            ) : null}
          </p>
          <div className="absolute w-[90%] bottom-[36px] flex flex-col items-center justify-center gap-4">
            <div className="w-full p-1 rounded-[40px] border border-white">
              <button
                onClick={handleShare}
                className="w-full py-2 bg-white/80 rounded-[40px] font-semibold text-[14px] hover:bg-white h-11 transition-colors"
                style={{
                  color: APP_COLORS.WON,
                }}
              >
                {shareButtonText}
              </button>
            </div>
            {hasNext ? (
              <div className="w-full p-1 rounded-[40px] border border-white">
                <button
                  onClick={onNext}
                  className="w-full py-2 bg-white/80 rounded-[40px] font-semibold text-[14px] hover:bg-white h-11 transition-colors"
                  style={{
                    color: APP_COLORS.WON,
                  }}
                >
                  Next Card
                </button>
              </div>
            ) : state.buyCards ? (
              <div className="w-full p-1 rounded-[40px] border border-white">
                <button
                  onClick={() => {
                    state.buyCards?.();
                  }}
                  className="w-full py-2 bg-white/80 rounded-[40px] font-semibold text-[14px] hover:bg-white h-11 transition-colors"
                  style={{
                    color: APP_COLORS.WON,
                  }}
                >
                  Buy Cards
                </button>
              </div>
            ) : null}
          </div>
        </motion.div>
      )}
    </>
  );
}
