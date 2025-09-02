import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, createWalletClient, http, parseUnits } from "viem";
import { base } from "wagmi/chains";
import { privateKeyToAccount } from "viem/accounts";
import { supabaseAdmin } from "~/lib/supabaseAdmin";
import { erc20Abi } from "viem";
import { getRevealsToNextLevel } from "~/lib/level";
import { PRIZE_ASSETS, tokenMeta, USDC_ADDRESS } from "~/lib/constants";
import { generateNumbers } from "~/lib/generateNumbers";
import { drawPrize } from "~/lib/drawPrize";

export async function POST(request: NextRequest) {
  try {
    const { cardId, userWallet, username, pfp } = await request.json();

    if (!cardId || !userWallet) {
      return NextResponse.json(
        { error: "Missing required fields: cardId or userWallet" },
        { status: 400 }
      );
    }

    const { data: card, error: cardError } = await supabaseAdmin
      .from("cards")
      .select("id, payment_tx, prize_amount, prize_asset_contract, scratched")
      .eq("id", cardId)
      .single();
    if (cardError || !card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    // Update card with scratched status (prize_amount is already set)
    const { data: updatedCard, error: updateError } = await supabaseAdmin
      .from("cards")
      .update({
        scratched: true,
        scratched_at: new Date().toISOString(),
      })
      .eq("id", cardId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating card:", updateError);
      return NextResponse.json(
        { error: "Failed to update card" },
        { status: 500 }
      );
    }

    // Update user stats
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select(
        "total_reveals, total_wins, amount_won, current_level, reveals_to_next_level, cards_count"
      )
      .eq("wallet", userWallet)
      .single();

    if (userError) {
      console.error("Error fetching user:", userError);
      return NextResponse.json(
        { error: "Failed to fetch user data" },
        { status: 500 }
      );
    }

    const newTotalReveals = (user.total_reveals || 0) + 1;
    const prizeAmount = Number(card.prize_amount || 0);
    const prizeAsset = card.prize_asset_contract;
    const newTotalWins = (user.total_wins || 0) + (prizeAmount > 0 ? 1 : 0);
    const newAmountWon = (user.amount_won || 0) + prizeAmount;

    // Level progression logic
    const currentLevel = user.current_level || 1;
    const currentRevealsToNext =
      user.reveals_to_next_level || getRevealsToNextLevel(1);
    const newRevealsToNext = currentRevealsToNext - 1;

    let newLevel = currentLevel;
    let newRevealsToNextLevel = newRevealsToNext;
    let leveledUp = false;
    let freeCardsToAward = 0;

    // Check if user leveled up
    if (newRevealsToNext <= 0) {
      newLevel = currentLevel + 1;
      newRevealsToNextLevel = getRevealsToNextLevel(newLevel);
      freeCardsToAward = newLevel - 1; // Award free cards for new level
      leveledUp = true;
    }

    const { error: userUpdateError } = await supabaseAdmin
      .from("users")
      .update({
        total_reveals: newTotalReveals,
        total_wins: newTotalWins,
        amount_won: newAmountWon,
        current_level: newLevel,
        reveals_to_next_level: newRevealsToNextLevel,
        last_active: new Date().toISOString(),
      })
      .eq("wallet", userWallet);

    if (userUpdateError) {
      console.error("Error updating user stats:", userUpdateError);
    }

    // Create free cards if user leveled up
    if (leveledUp && freeCardsToAward > 0) {
      const freeCardsToCreate = [];
      for (let i = 0; i < freeCardsToAward; i++) {
        const prize = drawPrize(); // e.g., 0 | 0.5 | 1 | 2
        // pick prize asset randomly (today pool contains USDC; add more later)
        const prizeAsset =
          PRIZE_ASSETS[Math.floor(Math.random() * PRIZE_ASSETS.length)] || USDC_ADDRESS;
        // build 12 cells (3x4) with one winning row if prize > 0
        const numbers = generateNumbers({
          prizeAmount: prize,
          prizeAsset,
          decoyAmounts: [0.5, 1, 2, 5, 10],
          decoyAssets: PRIZE_ASSETS as unknown as string[],
        });
        freeCardsToCreate.push({
          user_wallet: userWallet,
          payment_tx: "FREE_CARD_LEVEL_UP", // Special identifier for free cards
          prize_amount: prize, // Generate prize for free card
          prize_asset_contract: prizeAsset,
          numbers_json: numbers,
          scratched: false,
          claimed: false,
          created_at: new Date().toISOString(),
          card_no: (user.cards_count || 0) + i + 1,
        });
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { data: newFreeCards, error: freeCardsError } = await supabaseAdmin
        .from("cards")
        .insert(freeCardsToCreate)
        .select();

      if (freeCardsError) {
        console.error("Error creating free cards:", freeCardsError);
      } else {
        console.log(`Created ${freeCardsToAward} free cards for level up`);
      }
    }

    // Store reveal in Supabase
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { data: revealData, error: revealError } = await supabaseAdmin
        .from("reveals")
        .insert({
          user_wallet: userWallet,
          card_id: cardId,
          prize_amount: prizeAmount,
          payment_tx: updatedCard.payment_tx,
          payout_tx: null, // Will be set if payment succeeds
          won: prizeAmount > 0,
          username: username,
          pfp: pfp,
          created_at: new Date().toISOString(),
        })
        .select();

      if (revealError) {
        console.error("Failed to store reveal:", revealError);
        console.error("Reveal error details:", {
          user_wallet: userWallet,
          card_id: cardId,
          prize_amount: prizeAmount,
          payment_tx: updatedCard.payment_tx,
          won: prizeAmount > 0,
        });
      } else {
        console.log("Reveal stored successfully");
      }
    } catch (error) {
      console.error("Failed to store reveal:", error);
    }

    // If no prize, return early
    if (prizeAmount === 0) {
      // Update app stats - increment reveals only (no winnings to add)
      const { data: currentStats, error: fetchStatsError } = await supabaseAdmin
        .from("stats")
        .select("reveals")
        .eq("id", 1)
        .single();

      if (!fetchStatsError && currentStats) {
        const { error: statsError } = await supabaseAdmin
          .from("stats")
          .update({
            reveals: currentStats.reveals + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", 1);

        if (statsError) {
          console.error("Error updating app stats:", statsError);
          // Don't fail the request if stats update fails
        }
      }

      return NextResponse.json({
        success: true,
        prizeAmount: 0,
        message: "Better luck next time!",
        payoutTx: null,
        leveledUp,
        newLevel: leveledUp ? newLevel : null,
        freeCardsAwarded: leveledUp ? freeCardsToAward : 0,
      });
    }

    // Process USDC payment for winners
    try {
      // Get admin wallet private key
      const adminPrivateKey = process.env.ADMIN_WALLET_PRIVATE_KEY;
      if (!adminPrivateKey) {
        throw new Error("Admin wallet private key not configured");
      }

      // Create admin account from private key
      const adminAccount = privateKeyToAccount(
        adminPrivateKey as `0x${string}`
      );

      // Create public client for Base
      const publicClient = createPublicClient({
        chain: base,
        transport: http(),
      });

      // Create wallet client for Base
      const client = createWalletClient({
        account: adminAccount,
        chain: base,
        transport: http(),
      });

      const { decimals } = tokenMeta(prizeAsset);

      // Send USDC transfer
      const tx = await client.writeContract({
        address: prizeAsset as `0x${string}`,
        abi: erc20Abi,
        functionName: "transfer",
        args: [
          userWallet as `0x${string}`,
          parseUnits(prizeAmount.toString(), decimals),
        ],
      });

      // Wait for transaction confirmation
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: tx,
      });

      if (receipt.status === "reverted") {
        throw new Error("Payout transaction failed");
      }

      // Update card with payout transaction
      const { error: payoutUpdateError } = await supabaseAdmin
        .from("cards")
        .update({
          claimed: true,
          payout_tx: tx,
        })
        .eq("id", cardId);

      if (payoutUpdateError) {
        console.error("Error updating card with payout tx:", payoutUpdateError);
      }

      // Update reveal with payout transaction
      try {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { data: updatedReveal, error: updateRevealError } =
          await supabaseAdmin
            .from("reveals")
            .update({
              payout_tx: tx,
              updated_at: new Date().toISOString(),
            })
            .eq("card_id", cardId)
            .eq("user_wallet", userWallet)
            .select();

        if (updateRevealError) {
          console.error(
            "Failed to update reveal with payout:",
            updateRevealError
          );
          console.error("Update reveal error details:", {
            card_id: cardId,
            user_wallet: userWallet,
            payout_tx: tx,
          });
        } else {
          console.log("Reveal updated with payout successfully");
        }
      } catch (error) {
        console.error("Failed to update reveal with payout:", error);
      }

      // Update app stats - increment reveals and add winnings
      const { data: currentStats, error: fetchStatsError } = await supabaseAdmin
        .from("stats")
        .select("reveals, winnings")
        .eq("id", 1)
        .single();

      if (!fetchStatsError && currentStats) {
        const { error: statsError } = await supabaseAdmin
          .from("stats")
          .update({
            reveals: currentStats.reveals + 1,
            winnings: currentStats.winnings + prizeAmount,
            updated_at: new Date().toISOString(),
          })
          .eq("id", 1);

        if (statsError) {
          console.error("Error updating app stats:", statsError);
          // Don't fail the request if stats update fails
        }
      }

      return NextResponse.json({
        success: true,
        prizeAmount: prizeAmount,
        payoutTx: tx,
        message: `Congratulations! You won ${prizeAmount} USDC!`,
        leveledUp,
        newLevel: leveledUp ? newLevel : null,
        freeCardsAwarded: leveledUp ? newLevel - 1 : 0,
      });
    } catch (error) {
      console.error("Error processing USDC payment:", error);
      return NextResponse.json({
        success: true,
        prizeAmount: prizeAmount,
        payoutTx: null,
        message: `You won ${prizeAmount} USDC! Payment processing failed.`,
        paymentError:
          error instanceof Error ? error.message : "Unknown payment error",
      });
    }
  } catch (error) {
    console.error("Error in process prize:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to process prize",
      },
      { status: 500 }
    );
  }
}
