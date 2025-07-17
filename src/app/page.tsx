"use client";
import { useState, useEffect, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScratchDemo } from "~/components/scratch-off";
import Image from "next/image";
import { AppContext } from "./context";

export default function Home() {
  const [state] = useContext(AppContext);
  const [showInfo, setShowInfo] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
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

  useEffect(() => {
    fetchUserReveals(state.publicKey);
  }, [state.publicKey]);

  return (
    <div className="max-w-md w-full relative">
      <div className="flex items-center justify-between w-full">
        <button
          className="p-2 rounded-full bg-white/10 cursor-pointer hover:bg-white/20 transition-colors"
          onClick={() => setShowHistory(!showHistory)}
        >
          <img
            src={"/assets/history-icon.svg"}
            alt="history-icon"
            className="w-6 h-6"
          />
        </button>
        <button
          className="p-2 rounded-full bg-white/10 cursor-pointer hover:bg-white/20 transition-colors"
          onClick={() => setShowInfo(!showInfo)}
        >
          <img
            src={"/assets/info-icon.svg"}
            alt="info-icon"
            className="w-6 h-6"
          />
        </button>
      </div>
      <ScratchDemo onGameComplete={() => fetchUserReveals(state.publicKey)} />

      <AnimatePresence>
        {showHistory && (
          <motion.div
            className="absolute bg-black/80 backdrop-blur-sm bottom-[-10px] w-full rounded-[24px] p-6 z-[54]"
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
                      {...(ur.payoutTx
                        ? {
                            onClick: () =>
                              window.open(
                                `https://solscan.io/tx/${ur.payoutTx}`,
                                "_blank",
                                "noreferrer noopener nofollower"
                              ),
                          }
                        : {})}
                    >
                      <p
                        className={`text-[14px] font-medium leading-[90%] ${
                          ur.prizeAmount === 0
                            ? "text-[#fff]/60"
                            : "text-[#fff]"
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
                : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showInfo && (
          <motion.div
            className="absolute bg-black/80 backdrop-blur-sm bottom-[-10px] w-full rounded-[24px] p-6 z-[54]"
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
