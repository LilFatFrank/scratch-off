"use client";
import { useState, useEffect, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CardGrid from "~/components/card-grid";
import ScratchOff from "~/components/scratch-off";
import Image from "next/image";
import { AppContext } from "./context";

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

export default function Home() {
  const [state] = useContext(AppContext);
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [userReveals, setUserReveals] = useState<any[]>([]);
  const [loadingReveals, setLoadingReveals] = useState(false);

  // Fetch user reveals when wallet connects
  const fetchUserReveals = async (userWallet: string) => {
    if (!userWallet) return;

    setLoadingReveals(true);
    try {
      const response = await fetch(
        `/api/user-reveals?userWallet=${userWallet}`
      );
      const data = await response.json();
      if (data.success) {
        setUserReveals(data.reveals);
      }
    } catch (error) {
      console.error("Failed to fetch user reveals:", error);
    } finally {
      setLoadingReveals(false);
    }
  };

  // Mock data for demonstration - replace with actual API call
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      const mockCards: Card[] = [
        {
          id: "1",
          user_wallet: "0x123...",
          payment_tx: "0xabc123def456",
          prize_amount: 100,
          scratched_at: "2024-01-15T10:30:00Z",
          claimed: true,
          payout_tx: "0xdef789abc123",
          created_at: "2024-01-15T09:00:00Z",
          scratched: true,
        },
        {
          id: "2",
          user_wallet: "0x123...",
          payment_tx: "0xabc123def457",
          prize_amount: 0,
          scratched_at: "2024-01-16T14:20:00Z",
          claimed: false,
          created_at: "2024-01-16T13:00:00Z",
          scratched: true,
        },
        {
          id: "3",
          user_wallet: "0x123...",
          payment_tx: "0xabc123def458",
          prize_amount: 0,
          created_at: "2024-01-17T11:00:00Z",
          claimed: false,
          scratched: false,
        },
        {
          id: "4",
          user_wallet: "0x123...",
          payment_tx: "0xabc123def459",
          prize_amount: 0,
          created_at: "2024-01-18T12:00:00Z",
          claimed: false,
          scratched: false,
        },
      ];
      setCards(mockCards);
      setLoading(false);
    }, 1000);
  }, []);

  useEffect(() => {
    fetchUserReveals(state.publicKey);
  }, [state.publicKey]);

  const handleCardSelect = (card: Card) => {
    setSelectedCard(card);
  };

  const handleCloseModal = () => {
    setSelectedCard(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your cards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between w-full">
        {!selectedCard ? (
          <button
            className="p-2 rounded-full bg-white/10 cursor-pointer hover:bg-white/20 transition-colors"
            onClick={() => setShowHistory(!showHistory)}
          >
            <Image
              src={"/assets/history-icon.svg"}
              alt="history-icon"
              unoptimized
              priority
              width={24}
              height={24}
            />
          </button>
        ) : (
          <button
            className="p-2 rounded-full bg-white/10 cursor-pointer hover:bg-white/20 transition-colors"
            onClick={handleCloseModal}
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
          </button>
        )}
        <button
          className="p-2 rounded-full bg-white/10 cursor-pointer hover:bg-white/20 transition-colors"
          onClick={() => setShowInfo(!showInfo)}
        >
          <Image
            src={"/assets/info-icon.svg"}
            alt="info-icon"
            unoptimized
            priority
            width={24}
            height={24}
          />
        </button>
      </div>
      <div className="flex-1 flex flex-col h-full">
        <AnimatePresence mode="wait">
          {false ? (
            <motion.div
              key="grid"
              transition={{ duration: 0.3 }}
              className="flex-1 flex items-center justify-center py-5 overflow-auto"
            >
              <CardGrid cards={cards} onCardSelect={handleCardSelect} />
            </motion.div>
          ) : (
            <motion.div
              key="detail"
              transition={{ duration: 0.3 }}
              className="flex-1 flex items-center justify-center py-5"
            >
              <ScratchOff cardData={selectedCard} isDetailView={true} />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-center gap-3">
          <button className="border border-[#fff]/10 rounded-[8px] p-[10px]">
            <p className="text-[14px] leading-[90%] font-medium text-[#fff]">
              Cards 1<span className="text-[#fff]/40">/5</span>
            </p>
          </button>
          <button className="border border-[#fff] rounded-[8px] p-[10px]">
            <p className="text-[14px] leading-[90%] font-medium text-[#fff]">
              Buy
            </p>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showHistory && (
          <motion.div
            className="fixed bg-black/80 backdrop-blur-sm bottom-4 w-[92%] rounded-[24px] p-6 z-[54]"
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
              {loadingReveals ? (
                <>
                  <div className="flex items-center justify-between">
                    <div className="h-4 bg-[#fff]/20 rounded w-[100px] animate-pulse" />
                    <div className="h-4 bg-[#fff]/20 rounded w-[150px] animate-pulse" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="h-4 bg-[#fff]/20 rounded w-[100px] animate-pulse" />
                    <div className="h-4 bg-[#fff]/20 rounded w-[150px] animate-pulse" />
                  </div>
                </>
              ) : userReveals.length ? (
                userReveals.map((ur) => (
                  <div
                    key={ur.id}
                    className="flex justify-between items-center"
                  >
                    <p
                      className={`text-[14px] font-medium leading-[90%] ${
                        ur.prizeAmount === 0 ? "text-[#fff]/60" : "text-[#fff]"
                      }`}
                    >
                      {ur.prizeAmount === 0
                        ? "No win! :("
                        : `Won $${ur.prizeAmount}!`}
                    </p>
                    <p className="text-[14px] font-medium leading-[90%] text-[#fff]/60">
                      {new Date(ur.timestamp).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      })}
                    </p>
                  </div>
                ))
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showInfo && (
          <motion.div
            className="fixed bg-black/80 backdrop-blur-sm bottom-4 w-[92%] rounded-[24px] p-6 z-[54]"
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
    </div>
  );
}
