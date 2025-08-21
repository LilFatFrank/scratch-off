"use client";
import { AppContext } from "../app/context";
import { FC, useContext, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import {
  SET_APP_STATS,
  SET_CARDS,
  SET_SELECTED_CARD,
  SET_USER,
  SET_USER_REVEALS,
} from "~/app/context/actions";
import sdk from "@farcaster/miniapp-sdk";
import { encodeFunctionData, erc20Abi, parseUnits } from "viem";
import { USDC_ADDRESS } from "~/lib/constants";
import {
  fetchAppStats,
  fetchUserCards,
  fetchUserInfo,
  fetchUserReveals,
} from "~/lib/userapis";
import { usePathname, useRouter } from "next/navigation";

const Wrapper: FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const [state, dispatch] = useContext(AppContext);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [numBuyCards, setNumBuyCards] = useState(1);
  const [buyingCards, setBuyingCards] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const readyCalled = useRef(false);
  const {push} = useRouter();

  const refreshCards = async () => {
    try {
      const cards = await fetchUserCards(state.publicKey);
      dispatch({ type: SET_CARDS, payload: cards });
    } catch (error) {
      console.error("Error in refreshing cards", error);
    }
  };

  // Fetch all data when wallet connects
  useEffect(() => {
    if (state.publicKey) {
      fetchAllData(state.publicKey);
    }
  }, [state.publicKey]);

  // Fetch all data when wallet connects using Promise.allSettled
  const fetchAllData = async (userWallet: string) => {
    if (!userWallet) return;

    setLoading(true);

    try {
      const promises = [
        fetchUserCards(userWallet),
        fetchUserInfo(userWallet),
        fetchUserReveals(userWallet),
        fetchAppStats(),
      ];

      const [userCards, userInfo, userReveals, appStats] = await Promise.allSettled(
        promises
      );

      if (userCards.status === "fulfilled")
        dispatch({ type: SET_CARDS, payload: userCards.value });
      if (userInfo.status === "fulfilled")
        dispatch({ type: SET_USER, payload: userInfo.value });
      if (userReveals.status === "fulfilled")
        dispatch({ type: SET_USER_REVEALS, payload: userReveals.value });
      if (appStats.status === "fulfilled")
        dispatch({ type: SET_APP_STATS, payload: appStats.value });
      callReady();
    } catch (error) {
      console.error("Error in fetching user info", error);
    } finally {
      setLoading(false);
    }
  };

  const callReady = async () => {
    if (state.publicKey) {
      try {
        await sdk.actions.ready();
        readyCalled.current = true;
      } catch (error) {
        console.error("Failed to signal app ready:", error);
      }
    }
  };

  // Fetch all data when wallet connects
  useEffect(() => {
    if (state.publicKey) {
      fetchAllData(state.publicKey);
    }
  }, [state.publicKey]);

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
        }),
      });

      if (!backendResponse.ok) {
        const errorData = await backendResponse.json();
        throw new Error(errorData.error || "Failed to create cards");
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const result = await backendResponse.json();
      refreshCards();
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

  const openModal = (modalType: "buy") => {
    // Close all modals first
    setShowBuyModal(false);

    // Then open the requested modal
    switch (modalType) {
      case "buy":
        setShowBuyModal(true);
        break;
    }
  };

  const handleCloseModal = () => {
    dispatch({ type: "SET_SELECTED_CARD", payload: null });
  };

  useEffect(() => {
    if (state.publicKey && state.user) {
      const testAddMiniApp = async () => {
        try {
          const result = await sdk.actions.addMiniApp();
          if (
            result.notificationDetails &&
            result.notificationDetails.token &&
            !state.user?.notification_enabled
          ) {
            try {
              await fetch(`/api/neynar/welcome-notification`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  fid: state.user?.fid,
                  notification_token: result.notificationDetails.token,
                }),
              });
            } catch (err) {
              console.log("sending notification error", err);
            }
          }
        } catch (error) {
          console.log("❌ addMiniApp failed at startup:", error);
        }
      };

      testAddMiniApp();
    }
  }, [state.publicKey, state.user]);

  return (
    <div
      className="h-[100dvh] transition-all ease-in-out duration-300"
      style={{ background: state.appBackground }}
    >
      <div className="h-full max-w-[400px] flex flex-col mx-auto">
        {/* Top Section - Header */}
        <motion.div
          className="flex items-center justify-between w-full px-4 pt-4 pb-2"
          initial={{ opacity: 0, y: -20 }}
          animate={{
            opacity: loading ? 0 : 1,
            y: loading ? -20 : 0,
          }}
          transition={{
            duration: 0.6,
            ease: "easeOut",
            delay: 0.2,
          }}
        >
          {!state.selectedCard ? (
            <motion.button
              className="p-2 rounded-full bg-white/10 cursor-pointer hover:bg-white/20 transition-colors"
              onClick={() => push("/profile")}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                opacity: loading ? 0 : 1,
                scale: loading ? 0.8 : 1,
              }}
              transition={{
                duration: 0.4,
                ease: "easeOut",
                delay: 0.3,
              }}
            >
              <Image
                src={"/assets/history-icon.svg"}
                alt="history-icon"
                unoptimized
                priority
                width={24}
                height={24}
              />
            </motion.button>
          ) : (
            <motion.button
              className="p-2 relative z-[52] rounded-full bg-white/10 cursor-pointer hover:bg-white/20 transition-colors"
              onClick={handleCloseModal}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                opacity: loading ? 0 : 1,
                scale: loading ? 0.8 : 1,
              }}
              transition={{
                duration: 0.4,
                ease: "easeOut",
                delay: 0.3,
              }}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="#fff"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </motion.button>
          )}
          <motion.button
            className="px-6 border border-white/10 rounded-[48px] h-[42px] flex items-center justify-center gap-2"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: loading ? 0 : 1,
              scale: loading ? 0.8 : 1,
            }}
            transition={{
              duration: 0.4,
              ease: "easeOut",
              delay: 0.4,
            }}
          >
            <span className="text-[16px] leading-[90%] font-medium text-white/40">
              Winnings
            </span>
            <span className="text-[16px] leading-[90%] font-medium text-white">
              ${state?.appStats?.winnings || state?.user?.amount_won || 0}
            </span>
          </motion.button>
          <motion.button
            className="p-2 rounded-full bg-white/10 cursor-pointer hover:bg-white/20 transition-colors"
            onClick={() => push("/leaderboard")}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: loading ? 0 : 1,
              scale: loading ? 0.8 : 1,
            }}
            transition={{
              duration: 0.4,
              ease: "easeOut",
              delay: 0.5,
            }}
          >
            <Image
              src={"/assets/info-icon.svg"}
              alt="info-icon"
              unoptimized
              priority
              width={24}
              height={24}
            />
          </motion.button>
        </motion.div>
        {/* Middle Section - (Scrollable) */}
        <div className="flex flex-col w-full h-[80%]">
          <div className="flex-1 h-full">{children}</div>
        </div>
        {/* Bottom Section - Controls */}
        <motion.div
          className="flex items-center justify-center gap-3 p-4 flex-shrink-0"
          initial={{ opacity: 0, y: 20 }}
          animate={{
            opacity: loading ? 0 : 1,
            y: loading ? 20 : 0,
          }}
          transition={{
            duration: 0.6,
            ease: "easeOut",
            delay: 0.4,
          }}
        >
          <motion.button
            className="border border-[#fff]/10 rounded-[8px] p-[10px]"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: loading ? 0 : 1,
              scale: loading ? 0.8 : 1,
            }}
            transition={{
              duration: 0.4,
              ease: "easeOut",
              delay: 0.6,
            }}
            onClick={() => {
              if (state.selectedCard) {
                dispatch({ type: SET_SELECTED_CARD, payload: null });
              }
              if (pathname !== "/") push("/");
            }}
          >
            <p className="text-[14px] leading-[90%] font-medium text-[#fff]">
              Cards{" "}
              {state.selectedCard ? (
                <>
                  {state.selectedCard.card_no}
                  <span className="text-[#fff]/40">/{state.cards.length}</span>
                </>
              ) : (
                state.cards.length
              )}
            </p>
          </motion.button>
          <motion.button
            className="border border-[#fff] rounded-[8px] p-[10px]"
            onClick={() => openModal("buy")}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: loading ? 0 : 1,
              scale: loading ? 0.8 : 1,
            }}
            transition={{
              duration: 0.4,
              ease: "easeOut",
              delay: 0.7,
            }}
          >
            <p className="text-[14px] leading-[90%] font-medium text-[#fff]">
              Buy
            </p>
          </motion.button>
        </motion.div>

        <AnimatePresence>
          {showBuyModal && (
            <motion.div
              className="fixed bg-black/80 backdrop-blur-sm bottom-0 left-1/2 !translate-x-[-50%] !translate-y-[-16px] w-[92%] max-w-[400px] rounded-[24px] p-6 z-[54]"
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
                  {[1, 5, 10, 100, 200, 1000].map((amount) => (
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
                          numBuyCards === amount
                            ? "text-[#090909]"
                            : "text-white"
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
                        1x
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
                  className="w-full h-[48px] text-black font-semibold text-[14px] leading-[90%] rounded-[40px] shadow-lg shadow-gray-600/50 bg-white disabled:bg-white/80 disabled:cursor-not-allowed"
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
      </div>
    </div>
  );
};

export default Wrapper;
