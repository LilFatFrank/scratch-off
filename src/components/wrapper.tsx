"use client";
import { AppContext } from "../app/context";
import { FC, useContext, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import {
  SET_APP_STATS,
  SET_CARDS,
  SET_LEADERBOARD,
  SET_USER,
  SET_ACTIVITY,
  SET_PLAY_WIN_SOUND,
  SET_GET_SCRATCH_CARD_IMAGE,
  SET_GET_WINNER_GIF,
  SET_BEST_FRIENDS,
  SET_UNSCRATCHED_CARDS,
} from "~/app/context/actions";
import sdk from "@farcaster/miniapp-sdk";
import {
  fetchActivity,
  fetchAppStats,
  fetchBestFriends,
  fetchLeaderboard,
  fetchUserCards,
  fetchUserInfo,
} from "~/lib/userapis";
import { useRouter } from "next/navigation";
import { subscribeToTable } from "~/lib/supabase";
import { RealtimeChannel } from "@supabase/supabase-js";
import Bottom from "./bottom";
import { Card } from "~/app/interface/card";
import { usePathname } from "next/navigation";

const Wrapper: FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useContext(AppContext);
  const [loading, setLoading] = useState(true);
  const readyCalled = useRef(false);
  const currentCardsRef = useRef(state.cards);
  const currentLeaderboardRef = useRef(state.leaderboard);
  const currentActivityRef = useRef(state.activity);
  const currentUnscratchedCardsRef = useRef(state.unscratchedCards);
  const { push } = useRouter();
  const pathname = usePathname();
  
  // Audio for win sounds - load once and reuse
  const winAudioRef = useRef<HTMLAudioElement | null>(null);

  // Images for scratch-off - preload once and reuse
  const scratchCardImageRef = useRef<HTMLImageElement | null>(null);
  const winnerGifRef = useRef<HTMLImageElement | null>(null);

  // Initialize audio and images on component mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Preload audio
      winAudioRef.current = new Audio("/assets/win.mp3");
      winAudioRef.current.preload = "auto";
      winAudioRef.current.volume = 0.7; // Set volume to 70%

      // Preload images with highest quality settings
      scratchCardImageRef.current = new window.Image();
      scratchCardImageRef.current.src = "/assets/scratch-card-image.png";
      scratchCardImageRef.current.crossOrigin = "anonymous";
      // Ensure image loads at full resolution
      scratchCardImageRef.current.decoding = "sync";

      winnerGifRef.current = new window.Image();
      winnerGifRef.current.src = "/assets/winner.gif";
    }
  }, []);

  // Function to play win sound
  const playWinSound = () => {
    if (winAudioRef.current) {
      winAudioRef.current.currentTime = 0; // Reset to beginning
      winAudioRef.current.play().catch((error) => {
        console.log("Audio play failed:", error);
      });
    }
  };

  // Functions to get preloaded images
  const getScratchCardImage = () => scratchCardImageRef.current;
  const getWinnerGif = () => winnerGifRef.current;

  // Helper function to filter unscratched cards
  const getUnscratchedCards = (cards: Card[]) => {
    return cards.filter(card => !card.scratched);
  };

  // Set functions in context
  useEffect(() => {
    dispatch({ type: SET_PLAY_WIN_SOUND, payload: playWinSound });
    dispatch({
      type: SET_GET_SCRATCH_CARD_IMAGE,
      payload: getScratchCardImage,
    });
    dispatch({ type: SET_GET_WINNER_GIF, payload: getWinnerGif });
  }, []);

  // Keep ref updated with current cards
  useEffect(() => {
    currentCardsRef.current = state.cards;
  }, [state.cards]);

  // Keep ref updated with current leaderboard
  useEffect(() => {
    currentLeaderboardRef.current = state.leaderboard;
  }, [state.leaderboard]);

  // Keep ref updated with current activity
  useEffect(() => {
    currentActivityRef.current = state.activity;
  }, [state.activity]);

  // Keep ref updated with current unscratched cards
  useEffect(() => {
    currentUnscratchedCardsRef.current = state.unscratchedCards;
  }, [state.unscratchedCards]);

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
        fetchAppStats(),
        fetchLeaderboard(),
        fetchActivity(),
      ];

      const [userCards, userInfo, appStats, leaderboard, activity] =
        await Promise.allSettled(promises);

      if (userCards.status === "fulfilled") {
        dispatch({ type: SET_CARDS, payload: userCards.value });
        dispatch({ type: SET_UNSCRATCHED_CARDS, payload: getUnscratchedCards(userCards.value) });
      }
      if (userInfo.status === "fulfilled") {
        dispatch({ type: SET_USER, payload: userInfo.value });
        const bestFriends = await fetchBestFriends(userInfo.value.fid);
        dispatch({
          type: SET_BEST_FRIENDS,
          payload: bestFriends,
        });
      }
      if (appStats.status === "fulfilled")
        dispatch({ type: SET_APP_STATS, payload: appStats.value });
      if (leaderboard.status === "fulfilled")
        dispatch({ type: SET_LEADERBOARD, payload: leaderboard.value });
      if (activity.status === "fulfilled")
        dispatch({ type: SET_ACTIVITY, payload: activity.value });
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

  // Setup real-time subscriptions
  useEffect(() => {
    if (state.publicKey) {
      const subscriptions: RealtimeChannel[] = [];

      // Subscribe to cards table
      const cardsSub = subscribeToTable(
        "cards",
        (payload) => {
          // Only handle cards for the current user
          if (payload.new && payload.new.user_wallet === state.publicKey) {
            if (payload.eventType === "INSERT") {
              // Scenario 1: New card is added
              // Handle both single card and multiple cards
              const newCard = payload.new;
              const existingCards = currentCardsRef.current;
              
              // Check if this card already exists to avoid duplicates
              const cardExists = existingCards.some(card => card.id === newCard.id);
              if (!cardExists) {
                const updatedCards = [newCard, ...existingCards];
                dispatch({
                  type: SET_CARDS,
                  payload: updatedCards,
                });
                dispatch({ type: SET_UNSCRATCHED_CARDS, payload: getUnscratchedCards(updatedCards) });
              }
            } else if (payload.eventType === "UPDATE") {
              // Scenario 2: Card is updated (revealed)
              const updatedCards = currentCardsRef.current.map((card) =>
                card.id === payload.new.id ? payload.new : card
              );
              dispatch({ type: SET_CARDS, payload: updatedCards });
              dispatch({ type: SET_UNSCRATCHED_CARDS, payload: getUnscratchedCards(updatedCards) });
            }
          }
        },
        state.publicKey
      );
      subscriptions.push(cardsSub);

      // Subscribe to users table
      const usersSub = subscribeToTable(
        "users",
        (payload) => {
          // Handle local user updates
          if (payload.new && payload.new.wallet === state.publicKey) {
            if (
              payload.eventType === "INSERT" ||
              payload.eventType === "UPDATE"
            ) {
              dispatch({ type: SET_USER, payload: payload.new });
            }
          }

          // Handle leaderboard updates for any user change
          if (
            payload.eventType === "INSERT" ||
            payload.eventType === "UPDATE"
          ) {
            // Update leaderboard by replacing the user or adding new user
            const updatedLeaderboard = currentLeaderboardRef.current.map(
              (user) => {
                if (user.wallet === payload.new.wallet) {
                  return payload.new;
                }
                return user;
              }
            );

            // If it's a new user, add them to the leaderboard
            if (payload.eventType === "INSERT") {
              const userExists = updatedLeaderboard.some(
                (user) => user.wallet === payload.new.wallet
              );
              if (!userExists) {
                updatedLeaderboard.push(payload.new);
              }
            }

            // Sort by amount_won descending
            updatedLeaderboard.sort(
              (a, b) => (b.amount_won || 0) - (a.amount_won || 0)
            );

            dispatch({ type: SET_LEADERBOARD, payload: updatedLeaderboard });
          }
        }
        // No userWallet filter - listen to ALL user changes for leaderboard
      );
      subscriptions.push(usersSub);

      // Subscribe to reveals table (activity)
      const revealsSub = subscribeToTable(
        "reveals",
        (payload) => {
          if (payload.eventType === "INSERT") {
            // New reveal - add to beginning of activity list
            dispatch({
              type: SET_ACTIVITY,
              payload: [payload.new, ...currentActivityRef.current],
            });
          }
        }
        // No userWallet filter - listen to ALL reveals for global activity
      );
      subscriptions.push(revealsSub);

      // Subscribe to stats table
      const statsSub = subscribeToTable(
        "stats",
        (payload) => {
          if (payload.eventType === "UPDATE") {
            // Stats updated - replace current stats
            dispatch({ type: SET_APP_STATS, payload: payload.new });
          }
        }
        // No userWallet filter - listen to global stats changes
      );
      subscriptions.push(statsSub);

      // Cleanup function
      return () => {
        subscriptions.forEach((sub) => {
          if (sub && typeof sub.unsubscribe === "function") {
            sub.unsubscribe();
          }
        });
      };
    }
  }, [state.publicKey]);

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
              Prize Pool
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
        <div className="flex flex-col w-full" style={{ height: pathname === "/" ? "80%" : "70%" }}>
          <div className="flex-1 h-full">{children}</div>
        </div>
        {/* Bottom Section - Bottom */}
        <Bottom mode={state.swipableMode ? "swipeable" : "normal"} />
      </div>
    </div>
  );
};

export default Wrapper;
