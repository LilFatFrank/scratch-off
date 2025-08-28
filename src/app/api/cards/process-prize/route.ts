import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, createWalletClient, http, parseUnits } from "viem";
import { base } from "wagmi/chains";
import { privateKeyToAccount } from "viem/accounts";
import { supabaseAdmin } from "~/lib/supabaseAdmin";
import { USDC_ADDRESS } from "~/lib/constants";
import { erc20Abi } from "viem";
import { getRevealsToNextLevel } from "~/lib/level";

// Prize calculation function
function drawPrize(): number {
  const r = Math.random() * 100;    // 0.000 … 99.999
  console.log("Prize calculation random:", r);

  if (r < 35)  return 0;      // 35 % lose
  if (r < 75)  return 0.50;   // +40 %  → 75 %
  if (r < 87)  return 1;      // +12 %  → 87 %
  if (r < 98)  return 2;      // +11 %  → 98 %
  return 0;                   // last 2 % blank
}

export async function POST(request: NextRequest) {
  try {
    const { cardId, userWallet, prizeAmount, username, pfp } = await request.json();
    
    if (!cardId || !userWallet || prizeAmount === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: cardId, userWallet, or prizeAmount" },
        { status: 400 }
      );
    }

    // Update card with scratched status (prize_amount is already set)
    const { data: updatedCard, error: updateError } = await supabaseAdmin
      .from('cards')
      .update({
        scratched: true,
        scratched_at: new Date().toISOString()
      })
      .eq('id', cardId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating card:', updateError);
      return NextResponse.json(
        { error: "Failed to update card" },
        { status: 500 }
      );
    }

    // Update user stats
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('total_reveals, total_wins, amount_won, current_level, reveals_to_next_level, cards_count')
      .eq('wallet', userWallet)
      .single();

    if (userError) {
      console.error('Error fetching user:', userError);
      return NextResponse.json(
        { error: "Failed to fetch user data" },
        { status: 500 }
      );
    }

    const newTotalReveals = (user.total_reveals || 0) + 1;
    const newTotalWins = (user.total_wins || 0) + (prizeAmount > 0 ? 1 : 0);
    const newAmountWon = (user.amount_won || 0) + prizeAmount;

    // Level progression logic
    const currentLevel = user.current_level || 1;
    const currentRevealsToNext = user.reveals_to_next_level || getRevealsToNextLevel(1);
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
      .from('users')
      .update({
        total_reveals: newTotalReveals,
        total_wins: newTotalWins,
        amount_won: newAmountWon,
        current_level: newLevel,
        reveals_to_next_level: newRevealsToNextLevel,
        last_active: new Date().toISOString()
      })
      .eq('wallet', userWallet);

    if (userUpdateError) {
      console.error('Error updating user stats:', userUpdateError);
    }

    // Create free cards if user leveled up
    if (leveledUp && freeCardsToAward > 0) {
      const freeCardsToCreate = [];
      for (let i = 0; i < freeCardsToAward; i++) {
        freeCardsToCreate.push({
          user_wallet: userWallet,
          payment_tx: 'FREE_CARD_LEVEL_UP', // Special identifier for free cards
          prize_amount: drawPrize(), // Generate prize for free card
          scratched: false,
          claimed: false,
          created_at: new Date().toISOString(),
          card_no: (user.cards_count || 0) + i + 1
        });
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { data: newFreeCards, error: freeCardsError } = await supabaseAdmin
        .from('cards')
        .insert(freeCardsToCreate)
        .select();

      if (freeCardsError) {
        console.error('Error creating free cards:', freeCardsError);
      } else {
        console.log(`Created ${freeCardsToAward} free cards for level up`);
      }
    }

    // Store reveal in Supabase
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { data: revealData, error: revealError } = await supabaseAdmin
        .from('reveals')
        .insert({
          user_wallet: userWallet,
          card_id: cardId,
          prize_amount: prizeAmount,
          payment_tx: updatedCard.payment_tx,
          payout_tx: null, // Will be set if payment succeeds
          won: prizeAmount > 0,
          username: username,
          pfp: pfp,
          created_at: new Date().toISOString()
        })
        .select();

      if (revealError) {
        console.error("Failed to store reveal:", revealError);
        console.error("Reveal error details:", {
          user_wallet: userWallet,
          card_id: cardId,
          prize_amount: prizeAmount,
          payment_tx: updatedCard.payment_tx,
          won: prizeAmount > 0
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
        .from('stats')
        .select('reveals')
        .eq('id', 1)
        .single();

      if (!fetchStatsError && currentStats) {
        const { error: statsError } = await supabaseAdmin
          .from('stats')
          .update({ 
            reveals: currentStats.reveals + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', 1);

        if (statsError) {
          console.error('Error updating app stats:', statsError);
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
        freeCardsAwarded: leveledUp ? freeCardsToAward : 0
      });
    }

    // Process USDC payment for winners
    try {
      // Get admin wallet private key
      const adminPrivateKey = process.env.ADMIN_WALLET_PRIVATE_KEY;
      if (!adminPrivateKey) {
        throw new Error('Admin wallet private key not configured');
      }

      // Create admin account from private key
      const adminAccount = privateKeyToAccount(adminPrivateKey as `0x${string}`);
      
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

      // Send USDC transfer
      const tx = await client.writeContract({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [userWallet as `0x${string}`, parseUnits(prizeAmount.toString(), 6)],
      });

      // Wait for transaction confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
      
      if (receipt.status === 'reverted') {
        throw new Error("Payout transaction failed");
      }

      // Update card with payout transaction
      const { error: payoutUpdateError } = await supabaseAdmin
        .from('cards')
        .update({ 
          claimed: true,
          payout_tx: tx
        })
        .eq('id', cardId);

      if (payoutUpdateError) {
        console.error('Error updating card with payout tx:', payoutUpdateError);
      }

      // Update reveal with payout transaction
      try {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { data: updatedReveal, error: updateRevealError } = await supabaseAdmin
          .from('reveals')
          .update({
            payout_tx: tx,
            updated_at: new Date().toISOString()
          })
          .eq('card_id', cardId)
          .eq('user_wallet', userWallet)
          .select();

        if (updateRevealError) {
          console.error("Failed to update reveal with payout:", updateRevealError);
          console.error("Update reveal error details:", {
            card_id: cardId,
            user_wallet: userWallet,
            payout_tx: tx
          });
        } else {
          console.log("Reveal updated with payout successfully");
        }
      } catch (error) {
        console.error("Failed to update reveal with payout:", error);
      }

      // Update app stats - increment reveals and add winnings
      const { data: currentStats, error: fetchStatsError } = await supabaseAdmin
        .from('stats')
        .select('reveals, winnings')
        .eq('id', 1)
        .single();

      if (!fetchStatsError && currentStats) {
        const { error: statsError } = await supabaseAdmin
          .from('stats')
          .update({ 
            reveals: currentStats.reveals + 1,
            winnings: currentStats.winnings + prizeAmount,
            updated_at: new Date().toISOString()
          })
          .eq('id', 1);

        if (statsError) {
          console.error('Error updating app stats:', statsError);
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
        freeCardsAwarded: leveledUp ? (newLevel - 1) : 0
      });

    } catch (error) {
      console.error("Error processing USDC payment:", error);
      return NextResponse.json({
        success: true,
        prizeAmount: prizeAmount,
        payoutTx: null,
        message: `You won ${prizeAmount} USDC! Payment processing failed.`,
        paymentError: error instanceof Error ? error.message : "Unknown payment error"
      });
    }

  } catch (error) {
    console.error("Error in process prize:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process prize" },
      { status: 500 }
    );
  }
}
