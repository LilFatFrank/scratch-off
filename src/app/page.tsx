"use client";
import { useState, useEffect, useContext, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CardGrid from "~/components/card-grid";
import ScratchOff from "~/components/scratch-off";
import Image from "next/image";
import { AppContext } from "./context";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
} from "@solana/spl-token";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { sdk } from "@farcaster/miniapp-sdk";
import { USDC_MINT } from "~/lib/constants";
import { SET_USER } from "./context/actions";

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

export default function Home() {
  const [state, dispatch] = useContext(AppContext);
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [userReveals, setUserReveals] = useState<any[]>([]);
  const [numBuyCards, setNumBuyCards] = useState(1);
  const [buyingCards, setBuyingCards] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [userInfoModal, setUserInfoModal] = useState(false);
  const readyCalled = useRef(false);

  // Fetch user info when wallet connects
  const fetchUserInfo = async (userWallet: string) => {
    if (!userWallet) return;

    try {
      const response = await fetch(`/api/users/get?userWallet=${userWallet}`);
      const data = await response.json();
      if (data.success && data.user) {
        return data.user;
      }
      return {};
    } catch (error) {
      console.error("Failed to fetch user info:", error);
      throw error;
    }
  };

  // Fetch user reveals when wallet connects
  const fetchUserReveals = async (userWallet: string) => {
    if (!userWallet) return;

    try {
      const response = await fetch(
        `/api/users/reveals?userWallet=${userWallet}`
      );
      const data = await response.json();
      if (data.success) {
        return data.reveals;
      }
      return [];
    } catch (error) {
      console.error("Failed to fetch user reveals:", error);
      throw error;
    }
  };

  // Fetch user cards when wallet connects
  const fetchUserCards = async (userWallet: string) => {
    if (!userWallet) return;

    try {
      const response = await fetch(`/api/cards/user?userWallet=${userWallet}`);
      const data = await response.json();
      if (data.success) {
        return data.cards;
      } else {
        console.error("Failed to fetch user cards:", data.error);
        return [];
      }
    } catch (error) {
      console.error("Failed to fetch user cards:", error);
      throw error;
    }
  };

  // Fetch all data when wallet connects using Promise.allSettled
  const fetchAllData = async (userWallet: string) => {
    if (!userWallet) return;

    setLoading(true);

    try {
      const promises = [
        fetchUserCards(userWallet),
        fetchUserInfo(userWallet),
        fetchUserReveals(userWallet),
      ];

      const [userCards, userInfo, userReveals] = await Promise.allSettled(
        promises
      );

      if (userCards.status === "fulfilled") setCards(userCards.value);
      if (userInfo.status === "fulfilled")
        dispatch({ type: SET_USER, payload: userInfo.value });
      if (userReveals.status === "fulfilled") setUserReveals(userReveals.value);
    } catch (error) {
      console.error("Error in fetching user info", error);
    } finally {
      setLoading(false);
    }
  };

  // Call ready when app is fully loaded
  useEffect(() => {
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

    callReady();
  }, [state.publicKey]);

  // Fetch all data when wallet connects
  useEffect(() => {
    if (state.publicKey) {
      fetchAllData(state.publicKey);
    }
  }, [state.publicKey]);

  // Function to refresh cards (can be called after buying new cards)
  const refreshCards = async () => {
    try {
      const cards = await fetchUserCards(state.publicKey);
      setCards(cards);
    } catch (e) {
      console.log("error refreshing cards", e);
    }
  };

  // Function to refresh reveals (can be called after processing a prize)
  const refreshReveals = async () => {
    try {
      const reveals = await fetchUserReveals(state.publicKey);
      setUserReveals(reveals);
    } catch (e) {
      console.log("error refreshing reveals", e);
    }
  };

  // Function to refresh user info (can be called after processing a prize)
  const refreshUserInfo = async () => {
    try {
      const userInfo = await fetchUserInfo(state.publicKey);
      dispatch({
        type: SET_USER,
        payload: userInfo,
      });
    } catch (e) {
      console.log("error refreshing user info", e);
    }
  };

  // Buy cards function
  const buyCards = async (numberOfCards: number) => {
    if (!state.publicKey) {
      console.error("No wallet connected");
      return;
    }

    try {
      setBuyingCards(true);
      const RECIPIENT_ADDRESS = process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS;

      if (!RECIPIENT_ADDRESS) {
        console.error("Admin wallet address not configured");
        return;
      }

      const connection = new Connection(
        process.env.NEXT_PUBLIC_RPC || "https://api.mainnet-beta.solana.com"
      );
      const recipient = new PublicKey(RECIPIENT_ADDRESS);
      const mint = new PublicKey(USDC_MINT);

      // Create transaction
      const transaction = new Transaction();

      // Get token accounts
      const userTokenAccount = getAssociatedTokenAddressSync(
        mint,
        new PublicKey(state.publicKey)
      );
      const recipientTokenAccount = getAssociatedTokenAddressSync(
        mint,
        recipient
      );

      // Add create token account instruction for recipient if needed
      transaction.add(
        createAssociatedTokenAccountIdempotentInstruction(
          new PublicKey(state.publicKey),
          recipientTokenAccount,
          recipient,
          mint,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );

      // Add transfer instruction (1 USDC per card = 1,000,000 units with 6 decimals)
      const amountPerCard = 1_000_000; // 1 USDC
      const totalAmount = amountPerCard * numberOfCards;

      transaction.add(
        createTransferCheckedInstruction(
          userTokenAccount,
          mint,
          recipientTokenAccount,
          new PublicKey(state.publicKey),
          totalAmount,
          6
        )
      );

      // Get fresh blockhash right before sending
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash("finalized");
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = new PublicKey(state.publicKey);

      const provider = await sdk.wallet.getSolanaProvider();
      const response = await provider?.signAndSendTransaction({
        transaction,
      });

      if (!response) {
        throw new Error("Transaction failed");
      }

      // Wait for confirmation
      const confirmation = await connection.confirmTransaction(
        {
          signature: response.signature,
          blockhash,
          lastValidBlockHeight,
        },
        "confirmed"
      );

      if (confirmation.value.err) {
        throw new Error("Transaction failed");
      }

      // Send request to backend to create cards
      const backendResponse = await fetch("/api/cards/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userWallet: state.publicKey,
          paymentTx: response.signature,
          numberOfCards,
        }),
      });

      if (!backendResponse.ok) {
        const errorData = await backendResponse.json();
        throw new Error(errorData.error || "Failed to create cards");
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const result = await backendResponse.json();

      // Refresh cards list
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

  useEffect(() => {
    const testAddMiniApp = async () => {
      try {
        console.log("🔍 Testing addMiniApp at app startup...");
        await sdk.actions.addMiniApp();
        console.log("✅ addMiniApp succeeded at startup!");
      } catch (error) {
        console.log("❌ addMiniApp failed at startup:", error);
      }
    };

    testAddMiniApp();
  }, []);

  const handleCardSelect = (card: Card) => {
    setSelectedCard(card);
  };

  const handleCloseModal = () => {
    setSelectedCard(null);
  };

  // Close all other modals when opening a new one
  const openModal = (modalType: "history" | "info" | "buy" | "userInfo") => {
    // Close all modals first
    setShowHistory(false);
    setShowInfo(false);
    setShowBuyModal(false);
    setUserInfoModal(false);

    // Then open the requested modal
    switch (modalType) {
      case "history":
        setShowHistory(true);
        break;
      case "info":
        setShowInfo(true);
        break;
      case "buy":
        setShowBuyModal(true);
        break;
      case "userInfo":
        setUserInfoModal(true);
        break;
    }
  };

  // Helper function to format date properly
  const formatDate = (dateString: string) => {
    try {
      // Parse the UTC timestamp and convert to local timezone
      const date = new Date(dateString + "Z"); // Add 'Z' to indicate UTC

      // Check if date is valid
      if (isNaN(date.getTime())) {
        return "Invalid date";
      }

      // Format in user's local timezone
      return date.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid date";
    }
  };

  return (
    <div className="h-full flex flex-col w-full">
      {/* Top Section - Header */}
      <motion.div 
        className="flex items-center justify-between w-full px-4 pt-4 pb-2"
        initial={{ opacity: 0, y: -20 }}
        animate={{ 
          opacity: loading ? 0 : 1, 
          y: loading ? -20 : 0 
        }}
        transition={{ 
          duration: 0.6, 
          ease: "easeOut",
          delay: 0.2
        }}
      >
        {!selectedCard ? (
          <motion.button
            className="p-2 rounded-full bg-white/10 cursor-pointer hover:bg-white/20 transition-colors"
            onClick={() => openModal("history")}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ 
              opacity: loading ? 0 : 1, 
              scale: loading ? 0.8 : 1 
            }}
            transition={{ 
              duration: 0.4, 
              ease: "easeOut",
              delay: 0.3
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
              scale: loading ? 0.8 : 1 
            }}
            transition={{ 
              duration: 0.4, 
              ease: "easeOut",
              delay: 0.3
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
          onClick={() => openModal("userInfo")}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ 
            opacity: loading ? 0 : 1, 
            scale: loading ? 0.8 : 1 
          }}
          transition={{ 
            duration: 0.4, 
            ease: "easeOut",
            delay: 0.4
          }}
        >
          <span className="text-[16px] leading-[90%] font-medium text-white/40">
            Won
          </span>
          <span className="text-[16px] leading-[90%] font-medium text-white">
            ${state?.user?.amount_won || 0}
          </span>
        </motion.button>
        <motion.button
          className="p-2 rounded-full bg-white/10 cursor-pointer hover:bg-white/20 transition-colors"
          onClick={() => openModal("info")}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ 
            opacity: loading ? 0 : 1, 
            scale: loading ? 0.8 : 1 
          }}
          transition={{ 
            duration: 0.4, 
            ease: "easeOut",
            delay: 0.5
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
      {/* Middle Section - Cards/Scratch (Scrollable) */}
      <div className="flex-1 h-[80%]">
        <AnimatePresence mode="wait">
          {!selectedCard && cards.length ? (
            <motion.div
              key="grid"
              transition={{ duration: 0.3 }}
              className="h-full overflow-hidden"
            >
              <div className="h-full overflow-y-auto px-4">
                <div className="pt-4 pb-7">
                  <CardGrid cards={cards} onCardSelect={handleCardSelect} />
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="detail"
              transition={{ duration: 0.3 }}
              className="h-full flex items-center justify-center px-4"
            >
              <ScratchOff
                cardData={selectedCard}
                isDetailView={true}
                onPrizeRevealed={() => {
                  refreshCards();
                  refreshReveals();
                  refreshUserInfo();
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Section - Controls */}
      <motion.div 
        className="flex items-center justify-center gap-3 p-4 flex-shrink-0"
        initial={{ opacity: 0, y: 20 }}
        animate={{ 
          opacity: loading ? 0 : 1, 
          y: loading ? 20 : 0 
        }}
        transition={{ 
          duration: 0.6, 
          ease: "easeOut",
          delay: 0.4
        }}
      >
        <motion.button 
          className="border border-[#fff]/10 rounded-[8px] p-[10px]"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ 
            opacity: loading ? 0 : 1, 
            scale: loading ? 0.8 : 1 
          }}
          transition={{ 
            duration: 0.4, 
            ease: "easeOut",
            delay: 0.6
          }}
        >
          <p className="text-[14px] leading-[90%] font-medium text-[#fff]">
            Cards{" "}
            {selectedCard ? (
              <>
                {selectedCard.card_no}
                <span className="text-[#fff]/40">/{cards.length}</span>
              </>
            ) : (
              cards.length
            )}
          </p>
        </motion.button>
        <motion.button
          className="border border-[#fff] rounded-[8px] p-[10px]"
          onClick={() => openModal("buy")}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ 
            opacity: loading ? 0 : 1, 
            scale: loading ? 0.8 : 1 
          }}
          transition={{ 
            duration: 0.4, 
            ease: "easeOut",
            delay: 0.7
          }}
        >
          <p className="text-[14px] leading-[90%] font-medium text-[#fff]">
            Buy
          </p>
        </motion.button>
      </motion.div>

      <AnimatePresence>
        {showHistory && (
          <motion.div
            className="fixed bg-black/80 backdrop-blur-sm bottom-0 left-1/2 !translate-x-[-50%] !translate-y-[-16px] w-[92%] rounded-[24px] p-6 z-[54]"
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
                  History
                </p>
                <button
                  className="absolute top-[-16px] right-[-16px] p-2 rounded-full bg-white/[0.09] cursor-pointer"
                  onClick={() => setShowHistory(false)}
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
              <hr className="border-[0.5px] border-white/10" />
              {userReveals.length
                ? userReveals.map((ur) => (
                    <div
                      key={ur.id}
                      className="flex justify-between items-center"
                    >
                      <p
                        className={`text-[14px] font-medium leading-[90%] ${
                          ur.prize_amount === 0
                            ? "text-[#fff]/60"
                            : "text-[#fff]"
                        }`}
                      >
                        {ur.prize_amount === 0
                          ? "No win! :("
                          : `Won $${ur.prize_amount}!`}
                      </p>
                      <p className="text-[14px] font-medium leading-[90%] text-[#fff]/60">
                        {formatDate(ur.created_at)}
                      </p>
                    </div>
                  ))
                : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showInfo && (
          <motion.div
            className="fixed bg-black/80 backdrop-blur-sm bottom-0 left-1/2 !translate-x-[-50%] !translate-y-[-16px] w-[92%] rounded-[24px] p-6 z-[54]"
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
                  Info
                </p>
                <button
                  className="absolute top-[-16px] right-[-16px] p-2 rounded-full bg-white/[0.09] cursor-pointer"
                  onClick={() => setShowInfo(false)}
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
              <p className="text-[18px] leading-[130%] text-white font-semibold">
                We&apos;re transforming the crypto experience into something
                everyone can enjoy, starting with the simple joy of scratch
                cards - a game that billions already know and love
              </p>
              <hr className="border-[0.5px] border-white/10" />
              <p className="text-[15px] leading-[120%] text-white font-medium">
                We&apos;re transforming the crypto experience into something
                everyone can enjoy, starting with the simple joy of scratch
                cards - a game that billions already know and love
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showBuyModal && (
          <motion.div
            className="fixed bg-black/80 backdrop-blur-sm bottom-0 left-1/2 !translate-x-[-50%] !translate-y-[-16px] w-[92%] rounded-[24px] p-6 z-[54]"
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
      <AnimatePresence>
        {userInfoModal && (
          <motion.div
            className="fixed bg-black/80 backdrop-blur-sm bottom-0 left-1/2 !translate-x-[-50%] !translate-y-[-16px] w-[92%] rounded-[24px] p-6 z-[54]"
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
                  User Info
                </p>
                <button
                  className="absolute top-[-16px] right-[-16px] p-2 rounded-full bg-white/[0.09] cursor-pointer"
                  onClick={() => setUserInfoModal(false)}
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
              <hr className="border-[0.5px] border-white/10" />
              <div className="flex justify-between items-center">
                <p
                  className={`text-[14px] font-medium leading-[90%] text-[#fff]/60`}
                >
                  Won
                </p>
                <p className="text-[14px] font-medium leading-[90%] text-[#fff]">
                  {state?.user?.amount_won ? (
                    `$${state?.user?.amount_won}`
                  ) : (
                    <>&mdash;</>
                  )}
                </p>
              </div>
              <div className="flex justify-between items-center">
                <p
                  className={`text-[14px] font-medium leading-[90%] text-[#fff]/60`}
                >
                  Total Cards
                </p>
                <p className="text-[14px] font-medium leading-[90%] text-[#fff]">
                  {state?.user?.cards_count || <>&mdash;</>}
                </p>
              </div>
              <div className="flex justify-between items-center">
                <p
                  className={`text-[14px] font-medium leading-[90%] text-[#fff]/60`}
                >
                  Total Reveals
                </p>
                <p className="text-[14px] font-medium leading-[90%] text-[#fff]">
                  {state?.user?.total_reveals || <>&mdash;</>}
                </p>
              </div>
              <div className="flex justify-between items-center">
                <p
                  className={`text-[14px] font-medium leading-[90%] text-[#fff]/60`}
                >
                  Total Wins
                </p>
                <p className="text-[14px] font-medium leading-[90%] text-[#fff]">
                  {state?.user?.total_wins || <>&mdash;</>}
                </p>
              </div>
              <div className="flex justify-between items-center">
                <p
                  className={`text-[14px] font-medium leading-[90%] text-[#fff]/60`}
                >
                  Win Rate
                </p>
                <p className="text-[14px] font-medium leading-[90%] text-[#fff]">
                  {state?.user?.total_reveals && state?.user?.total_wins ? (
                    `${(
                      Number(state.user.total_wins / state.user.total_reveals) *
                      100
                    ).toFixed(2)}%`
                  ) : (
                    <>&mdash;</>
                  )}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
