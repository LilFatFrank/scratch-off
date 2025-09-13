"use client";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { AppContext } from "~/app/context";
import { FC, useContext, useEffect, useState } from "react";
import { SET_CARDS, SET_BUY_CARDS } from "~/app/context/actions";
import { encodeFunctionData, erc20Abi, parseUnits } from "viem";
import { useMiniApp } from "@neynar/react";
import sdk from "@farcaster/miniapp-sdk";
import { USDC_ADDRESS } from "~/lib/constants";
import { usePathname, useRouter } from "next/navigation";

const Bottom: FC<{ mode?: "swipeable" | "normal" }> = ({ mode = "normal" }) => {
  const [state, dispatch] = useContext(AppContext);
  const [showBigBuy, setShowBigBuy] = useState(false);
  const [numBuyCards, setNumBuyCards] = useState(5);
  const [unscratchedCardsCount, setUnscratchedCardsCount] = useState(0);
  const [buyingCards, setBuyingCards] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const { haptics } = useMiniApp();
  const { push } = useRouter();
  const pathname = usePathname();

  // Calculate unscratched cards count
  useEffect(() => {
    if (mode === "swipeable") {
      setUnscratchedCardsCount(state.unscratchedCards.length);
    }
  }, [state.unscratchedCards, mode]);

  const buyCards = async (numberOfCards: number) => {
    if (!state.publicKey) {
      console.error("No wallet connected");
      return;
    }

    try {
      setBuyingCards(true);
      const RECIPIENT_ADDRESS = process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS;

      const data = encodeFunctionData({
        abi: erc20Abi,
        functionName: "transfer",
        args: [
          RECIPIENT_ADDRESS as `0x${string}`,
          parseUnits(numberOfCards.toString(), 6),
        ],
      });

      const provider = await sdk.wallet.getEthereumProvider();
      const hash = await provider?.request({
        method: "eth_sendTransaction",
        params: [
          {
            to: USDC_ADDRESS,
            data,
            from: state.publicKey as `0x${string}`,
          },
        ],
      });

      if (!RECIPIENT_ADDRESS) {
        console.error("Admin wallet address not configured");
        return;
      }

      // Send request to backend to create cards
      const backendResponse = await fetch("/api/cards/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userWallet: state.publicKey,
          paymentTx: hash,
          numberOfCards,
          friends: state.bestFriends,
        }),
      });

      if (!backendResponse.ok) {
        const errorData = await backendResponse.json();
        throw new Error(errorData.error || "Failed to create cards");
      }

      const result = await backendResponse.json();

      // If multiple cards were created, refetch user cards to ensure all are loaded
      if (result.totalCardsCreated > 1) {
        setTimeout(async () => {
          try {
            const { fetchUserCards } = await import("~/lib/userapis");
            const userCards = await fetchUserCards(state.publicKey);
            if (userCards) {
              dispatch({ type: SET_CARDS, payload: userCards });
            }
          } catch (error) {
            console.error("Failed to refetch cards after purchase:", error);
          }
        }, 1000); // Wait 1 second for database to be fully updated
      }

      haptics.impactOccurred("medium");
      haptics.notificationOccurred("success");
      setShowBuyModal(false);
    } catch (error) {
      console.error("Error buying cards:", error);
      alert(
        `Failed to buy cards: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setBuyingCards(false);
    }
  };

  // Function to trigger buy modal - can be called from other components
  const triggerBuyModal = () => {
    setShowBuyModal(true);
  };

  // Set the buy function in the app context so other components can access it
  useEffect(() => {
    dispatch({ type: SET_BUY_CARDS, payload: triggerBuyModal });
  }, [dispatch]);

  useEffect(() => {
    if (mode === "swipeable") {
      // In swipeable mode, show big buy when no unscratched cards left
      setShowBigBuy(unscratchedCardsCount === 0);
    }
  }, [unscratchedCardsCount, mode]);

  return (
    <>
      {/* Bottom Section - Controls */}
      <motion.div
        className="flex flex-col items-center justify-center gap-4 p-4 pb-9 w-full flex-shrink-0 z-0"
        initial={{ opacity: 0, y: 20 }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.6,
          ease: "easeOut",
          delay: 0.4,
        }}
      >
        <motion.div
          className="flex items-center justify-center gap-3"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{
            opacity: 1,
            scale: 1,
          }}
          transition={{
            duration: 0.4,
            ease: "easeOut",
            delay: 0.6,
          }}
        >
          <motion.div
            className="border border-[#fff]/10 rounded-[8px] p-[10px]"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            transition={{
              duration: 0.4,
              ease: "easeOut",
              delay: 0.6,
            }}
          >
            <p className="text-[14px] leading-[90%] font-medium text-[#fff]">
              {mode === "swipeable" ? (
                `${unscratchedCardsCount} card${
                  unscratchedCardsCount !== 1 ? "s" : ""
                } left`
              ) : (
                <>
                  Cards{" "}
                  {state.selectedCard ? (
                    <>
                      {state.selectedCard.card_no}
                      <span className="text-[#fff]/40">
                        /{state.cards.length}
                      </span>
                    </>
                  ) : (
                    state.cards.length
                  )}
                </>
              )}
            </p>
          </motion.div>
          <motion.button
            className="border border-[#fff] rounded-[8px] p-[10px]"
            onClick={showBigBuy && pathname === "/" ? () => push("/leaderboard") : () => setShowBuyModal(true)}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            transition={{
              duration: 0.4,
              ease: "easeOut",
              delay: 0.7,
            }}
          >
            <p className="text-[14px] leading-[90%] font-medium text-[#fff]">
              {showBigBuy && pathname === "/" ? "View Leaderboard" : "Buy"}
            </p>
          </motion.button>
        </motion.div>

        <AnimatePresence>
          {showBigBuy && pathname === "/" && (
            <motion.div
              className="w-full p-1 rounded-[40px] border border-white"
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 25,
                duration: 0.4,
              }}
            >
              <motion.button
                onClick={() => setShowBuyModal(true)}
                className="w-full py-2 bg-white/80 rounded-[40px] font-semibold text-[14px] hover:bg-white h-11 transition-colors"
                style={{
                  color: state.appColor,
                }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.1 }}
              >
                Buy Cards
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {pathname !== "/" && (
            <motion.div
              className="w-full p-1 rounded-[40px] border border-white"
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 25,
                duration: 0.4,
              }}
            >
              <motion.button
                onClick={() => push("/")}
                className="w-full py-2 bg-white/80 rounded-[40px] font-semibold text-[14px] hover:bg-white h-11 transition-colors"
                style={{
                  color: state.appColor,
                }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.1 }}
              >
                View Cards
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {showBuyModal && (
          <motion.div
            className="fixed bg-black/80 backdrop-blur-sm bottom-0 left-1/2 !translate-x-[-50%] !translate-y-[-16px] w-[96%] max-w-[400px] rounded-[24px] p-6 z-[54]"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
              duration: 0.3,
            }}
          >
            <div className="relative space-y-6">
              <div className="flex justify-between items-center">
                <p className="text-[18px] leading-[90%] text-white font-semibold">
                  Buy cards
                </p>
                <button
                  className="absolute top-[-16px] right-[-16px] p-2 rounded-full bg-white/[0.09] cursor-pointer"
                  onClick={
                    buyingCards ? undefined : () => setShowBuyModal(false)
                  }
                >
                  <Image
                    src={"/assets/cross-icon.svg"}
                    alt="cross-icon"
                    width={18}
                    height={18}
                    unoptimized
                    priority
                  />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[5, 3, 1].map((amount) => (
                  <button
                    key={amount}
                    className={`py-[14px] px-[18px] rounded-[46px] transition-colors ${
                      numBuyCards === amount
                        ? "bg-white shadow-lg shadow-gray-600/50 hover:bg-white"
                        : "bg-white/10 hover:bg-white/20"
                    }`}
                    onClick={() => {
                      setNumBuyCards(amount);
                    }}
                  >
                    <p
                      className={`text-[15px] font-semibold font-mono leading-[100%] ${
                        numBuyCards === amount ? "text-[#090909]" : "text-white"
                      }`}
                    >
                      {amount}
                    </p>
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-4">
                    <span className="text-white/60 font-normal text-[15px] leading-[120%]">
                      {numBuyCards}x
                    </span>
                    <span className="text-white font-normal text-[15px] leading-[120%]">
                      Scratch-off Card
                    </span>
                  </div>
                  <span className="text-white font-medium text-[15px] leading-[120%]">
                    $1
                  </span>
                </div>
                <hr className="border-[0.5px] border-white/10" />
                <div className="flex items-center justify-between w-full">
                  <span className="text-white font-normal text-[15px] leading-[120%]">
                    Total
                  </span>
                  <span className="text-white font-medium text-[15px] leading-[120%]">
                    ${numBuyCards}
                  </span>
                </div>
              </div>
              <button
                className="w-full h-[44px] text-black font-semibold text-[14px] leading-[90%] rounded-[40px] shadow-lg shadow-gray-600/50 bg-white disabled:bg-white/80 disabled:cursor-not-allowed"
                onClick={() => buyCards(numBuyCards)}
                disabled={buyingCards}
              >
                {buyingCards ? (
                  <>Please wait...</>
                ) : (
                  <>Buy Card{numBuyCards > 1 ? "s" : ""}</>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Bottom;
