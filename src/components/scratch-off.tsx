"use client";
import { useContext, useRef, useState } from "react";
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
import { motion } from "framer-motion";
import { AppContext } from "../app/context";
import { SET_APP_BACKGROUND, SET_APP_COLOR } from "../app/context/actions";
import { APP_COLORS, USDC_MINT } from "../lib/constants";
import { sdk } from "@farcaster/miniapp-sdk";

const RECIPIENT_ADDRESS = process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS!;

interface ScratchDemoProps {
  onGameComplete?: () => void;
}

export function ScratchDemo({ onGameComplete }: ScratchDemoProps) {
  const [state, dispatch] = useContext(AppContext);
  const [isLoading, setIsLoading] = useState(false);
  const [gameState, setGameState] = useState<
    "idle" | "paying" | "processing" | "complete"
  >("idle");
  const [prizeAmount, setPrizeAmount] = useState<number | null>(null);
  const [showBlurOverlay, setShowBlurOrverlay] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealPercentage, setRevealPercentage] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState<string>("");
  
  // Card tilt state - moved to component level
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

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

  // Validate environment variables
  if (!process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS) {
    console.warn("NEXT_PUBLIC_ADMIN_WALLET_ADDRESS not set, using fallback");
  }

  const handleStartGame = async () => {
    resetGame();
    if (!state.hasProvider) {
      setError("Please connect your wallet first");
      dispatch({
        type: SET_APP_COLOR,
        payload: APP_COLORS.ERROR,
      });
      dispatch({
        type: SET_APP_BACKGROUND,
        payload: `linear-gradient(to bottom, #090210, ${APP_COLORS.ERROR})`,
      });
      return;
    }

    dispatch({
      type: SET_APP_COLOR,
      payload: APP_COLORS.LOADING,
    });
    dispatch({
      type: SET_APP_BACKGROUND,
      payload: `linear-gradient(to bottom, #090210, ${APP_COLORS.LOADING})`,
    });
    setGameState("paying");
    setIsLoading(true);
    setError(null);
    setRevealPercentage(0);

    try {
      setRevealPercentage(30);
      setLoadingMessage("Sending payment...");

      // Send USDC payment
      await sendUsdcPayment();
    } catch (error) {
      console.error("Error in game:", error);
      setError(error instanceof Error ? error.message : "An error occurred");
      dispatch({
        type: SET_APP_COLOR,
        payload: APP_COLORS.ERROR,
      });
      dispatch({
        type: SET_APP_BACKGROUND,
        payload: `linear-gradient(to bottom, #090210, ${APP_COLORS.ERROR})`,
      });
              setGameState("idle");
        setRevealPercentage(0);
        setLoadingMessage("");
        setIsLoading(false); // Ensure loading state is reset on error
    }
  };

  const sendUsdcPayment = async () => {
    if (!state.publicKey) {
      throw new Error("Wallet not connected");
    }

    const connection = new Connection(
      process.env.NEXT_PUBLIC_RPC || "https://api.mainnet-beta.solana.com"
    );
    const recipient = new PublicKey(RECIPIENT_ADDRESS);
    const mint = new PublicKey(USDC_MINT);

    // Create transaction
    const transaction = new Transaction();

    // Get token accounts
    const userTokenAccount = getAssociatedTokenAddressSync(mint, new PublicKey(state.publicKey));
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

    // Add transfer instruction (1 USDC = 1,000,000 units with 6 decimals)
    transaction.add(
      createTransferCheckedInstruction(
        userTokenAccount,
        mint,
        recipientTokenAccount,
        new PublicKey(state.publicKey),
        1_000_000,
        6
      )
    );

    // Get fresh blockhash right before sending
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash("finalized");
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = new PublicKey(state.publicKey);

    try {
      console.log("Sending transaction...");
      const provider = await sdk.wallet.getSolanaProvider();
      const response = await provider?.signAndSendTransaction({
        transaction,
      });
      setLoadingMessage("Confirming payment...");

      if (!response) {
        throw new Error("Transaction failed");
      }

      // Wait for confirmation with proper timeout
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

      console.log("Transaction successful!");
      setRevealPercentage(60);
      setLoadingMessage("Peeling back the odds...");
      setGameState("processing");
      await processPrize(response.signature);
    } catch (error) {
      console.error("Transaction failed:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setError(errorMessage);

      // Check if user rejected the transaction - don't retry in this case
      if (errorMessage.toLowerCase().includes("user rejected")) {
        setIsLoading(false);
        throw new Error("Transaction was cancelled by user");
      }

      // For other errors, retry up to 3 times
      const maxRetries = 3;
      let lastError: Error =
        error instanceof Error ? error : new Error(String(error));

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`Retry attempt ${attempt}: Sending transaction...`);

          // Get fresh blockhash for retry
          const {
            blockhash: retryBlockhash,
            lastValidBlockHeight: retryLastValidBlockHeight,
          } = await connection.getLatestBlockhash("finalized");
          transaction.recentBlockhash = retryBlockhash;
          const provider = await sdk.wallet.getSolanaProvider();
          const retryTx = await provider?.signAndSendTransaction({
            transaction,
          });

          if (!retryTx?.signature) {
            throw new Error("Transaction failed");
          }

          const retryConfirmation = await connection.confirmTransaction(
            {
              signature: retryTx.signature,
              blockhash: retryBlockhash,
              lastValidBlockHeight: retryLastValidBlockHeight,
            },
            "confirmed"
          );

          if (retryConfirmation.value.err) {
            throw new Error("Transaction failed");
          }

          console.log(`Transaction successful on retry attempt ${attempt}!`);
          setRevealPercentage(60);
          setLoadingMessage("Processing your prize...");
          setGameState("processing");
          await processPrize(retryTx.signature);
          return; // Success, exit retry loop
        } catch (retryError) {
          console.error(`Retry attempt ${attempt} failed:`, retryError);
          lastError =
            retryError instanceof Error
              ? retryError
              : new Error(String(retryError));

          // If this is the last attempt, throw the error
          if (attempt === maxRetries) {
            setIsLoading(false);

            // Provide more specific error messages
            if (
              lastError.message.includes("block height exceeded") ||
              lastError.message.includes("expired")
            ) {
              throw new Error(
                "Transaction expired after multiple attempts. Please try again."
              );
            } else if (lastError.message.includes("insufficient funds")) {
              throw new Error(
                "Insufficient USDC balance. Please ensure you have at least 1 USDC."
              );
            } else {
              throw new Error(
                `Payment failed after ${maxRetries} attempts: ${lastError.message}`
              );
            }
          }

          // Wait a bit before retrying
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
  };

  const processPrize = async (paymentTx: string) => {
    try {
      // Validate required fields before sending
      if (!state.publicKey) {
        throw new Error(
          "Public key is not available - wallet may have disconnected"
        );
      }
      if (!paymentTx) {
        throw new Error("Payment transaction is missing");
      }

      const response = await fetch("/api/process-prize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userWallet: state.publicKey,
          paymentTx: paymentTx,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API response error:", errorText);
        throw new Error(`API error: ${response.status} ${errorText}`);
      }

      const result = await response.json();

      if (result.success) {
        setPrizeAmount(result.prizeAmount);
        if (result.prizeAmount === 0) {
          dispatch({
            type: SET_APP_COLOR,
            payload: APP_COLORS.LOST,
          });
          dispatch({
            type: SET_APP_BACKGROUND,
            payload: `linear-gradient(to bottom, #090210, ${APP_COLORS.LOST})`,
          });
        } else {
          dispatch({
            type: SET_APP_COLOR,
            payload: APP_COLORS.WON,
          });
          dispatch({
            type: SET_APP_BACKGROUND,
            payload: `linear-gradient(to bottom, #090210, ${APP_COLORS.WON})`,
          });
          setPrizeAmount(result.prizeAmount);
          setShowBlurOrverlay(true);
        }
        setGameState("complete");
        // Reveal 100% after processing complete
        setRevealPercentage(100);
        setLoadingMessage("");
        setIsLoading(false); // Reset loading state on success
        onGameComplete?.();
      } else {
        throw new Error(result.error || "Failed to process prize");
      }
    } catch (error) {
      console.error("Prize processing error:", error);
      setLoadingMessage("");
      setIsLoading(false); // Reset loading state on error
      throw error;
    }
  };

  const resetGame = () => {
    setPrizeAmount(null);
    setError(null);
    setShowBlurOrverlay(false);
    setGameState("idle");
    setRevealPercentage(0);
    setLoadingMessage("");
    setIsLoading(false);
    dispatch({
      type: SET_APP_BACKGROUND,
      payload: `linear-gradient(to bottom, #090210, ${APP_COLORS.DEFAULT})`,
    });
    dispatch({
      type: SET_APP_COLOR,
      payload: APP_COLORS.DEFAULT,
    });
  };

  return (
    <>
      {
        <p
          className="font-[ABCGaisyr] text-white/40 text-center text-[30px] font-bold italic mb-5 rotate-[-4deg]"
          style={{ visibility: prizeAmount === 0 ? "visible" : "hidden" }}
        >
          No win!
        </p>
      }
      <div className="max-w-md mx-auto space-y-6">
        <motion.div
          ref={cardRef}
          className="w-full relative"
          animate={{
            rotateX: tilt.x,
            rotateY: tilt.y,
          }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 20,
          }}
          style={{
            perspective: 1000,
          }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Shadow element that follows the card rotation */}
          <div
            className="absolute inset-0 w-[320px] h-[400px] rounded-2xl"
            style={{
              background: "rgba(0, 0, 0, 0.4)",
              filter: "blur(28px)",
              transform: "translateY(30px)",
              zIndex: -1,
            }}
          />

          {/* Scratched card on bottom */}
          <img
            src={"/assets/scratched-card-image.png"}
            alt="scratched-card"
            className="rounded-2xl select-none w-[320px] h-[400px] relative z-10 mx-auto"
            draggable={false}
          />

          {/* Scratch card on top with percentage-based reveal */}
          <motion.div
            className="absolute inset-0 w-full overflow-hidden rounded-2xl z-20"
            initial={{ height: "100%" }}
            animate={{ height: `${100 - revealPercentage}%` }}
            transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
            style={{ pointerEvents: "none" }}
          >
            <img
              src={"/assets/scratch-card-image.png"}
              alt="scratch-card"
              className="w-[320px] h-[400px] rounded-2xl select-none mx-auto"
              draggable={false}
            />
          </motion.div>
        </motion.div>

        <button
          className="rounded-[100px] relative z-[52] border-white/90 group-hover:border-white p-[2px] border w-full cursor-pointer disabled:cursor-not-allowed disabled:group-hover:bg-white/90 disabled:border-white/90"
          style={{
            background: state.appColor,
            visibility:
              gameState === "idle" || gameState === "complete"
                ? "visible"
                : "hidden",
          }}
          disabled={isLoading}
          onClick={
            gameState === "complete"
              ? () => resetGame()
              : () => handleStartGame()
          }
        >
          <div className="bg-white/90 hover:bg-white disabled:hover:bg-white/90 transition-all ease-in-out duration-300 rounded-[100px] py-2 w-full">
            <span
              className="text-[14px] font-semibold leading-[90%]"
              style={{ color: state.appColor }}
            >
              {gameState === "complete" ? "Play again" : "Scratch off"}
            </span>
          </div>
        </button>
        {loadingMessage && (
          <p className="text-white text-center text-[14px] font-medium">
            {loadingMessage}
          </p>
        )}
        {error && (
          <p className="text-white text-center text-[12px] break-all">
            {error}
          </p>
        )}
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
