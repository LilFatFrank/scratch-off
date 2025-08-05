import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey, Transaction, Keypair } from "@solana/web3.js";
import { 
  getAssociatedTokenAddressSync, 
  createAssociatedTokenAccountIdempotentInstruction, 
  createTransferCheckedInstruction 
} from "@solana/spl-token";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { supabaseAdmin } from "~/lib/supabaseAdmin";
// Store reveals in Supabase instead of Redis
import { USDC_MINT } from "~/lib/constants";

export async function POST(request: NextRequest) {
  try {
    const { cardId, userWallet, prizeAmount } = await request.json();
    
    if (!cardId || !userWallet || prizeAmount === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: cardId, userWallet, or prizeAmount" },
        { status: 400 }
      );
    }

    // Update card with prize amount and scratched status
    const { data: updatedCard, error: updateError } = await supabaseAdmin
      .from('cards')
      .update({
        prize_amount: prizeAmount,
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
      .select('total_reveals, total_wins, amount_won')
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

    const { error: userUpdateError } = await supabaseAdmin
      .from('users')
      .update({
        total_reveals: newTotalReveals,
        total_wins: newTotalWins,
        amount_won: newAmountWon,
        last_active: new Date().toISOString()
      })
      .eq('wallet', userWallet);

    if (userUpdateError) {
      console.error('Error updating user stats:', userUpdateError);
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
      return NextResponse.json({
        success: true,
        prizeAmount: 0,
        message: "Better luck next time!",
        payoutTx: null
      });
    }

    // Process USDC payment for winners
    try {
      // Get admin wallet keypair
      const adminPrivateKey = process.env.SOLANA_WALLET_PRIVATE_KEY;
      if (!adminPrivateKey) {
        throw new Error('Admin wallet private key not configured');
      }

      // Parse private key from string array
      const privateKeyArray = JSON.parse(adminPrivateKey);
      if (!Array.isArray(privateKeyArray)) {
        throw new Error('Invalid private key format');
      }
      const privateKeyBytes = new Uint8Array(privateKeyArray);
      
      const adminKeypair = Keypair.fromSecretKey(privateKeyBytes);
      const adminWallet = adminKeypair.publicKey;
      const userWalletPubkey = new PublicKey(userWallet);
      const mint = new PublicKey(USDC_MINT);

      // Setup connection
      const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');

      // Create transaction
      const transaction = new Transaction();

      // Get token accounts
      const adminTokenAccount = getAssociatedTokenAddressSync(mint, adminWallet);
      const userTokenAccount = getAssociatedTokenAddressSync(mint, userWalletPubkey);

      // Add create token account instruction if needed
      transaction.add(
        createAssociatedTokenAccountIdempotentInstruction(
          adminWallet,
          userTokenAccount,
          userWalletPubkey,
          mint,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );

      // Add transfer instruction
      transaction.add(
        createTransferCheckedInstruction(
          adminTokenAccount,
          mint,
          userTokenAccount,
          adminWallet,
          prizeAmount * 1e6, // Convert to USDC decimals (6)
          6
        )
      );

      // Get latest blockhash
      const { blockhash } = await connection.getLatestBlockhash('finalized');
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = adminWallet;

      // Sign and send transaction
      const tx = await connection.sendTransaction(transaction, [adminKeypair]);
      
      // Wait for confirmation
      const confirmation = await connection.confirmTransaction({
        signature: tx,
        blockhash,
        lastValidBlockHeight: (await connection.getLatestBlockhash()).lastValidBlockHeight
      }, 'confirmed');

      if (confirmation.value.err) {
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

      return NextResponse.json({
        success: true,
        prizeAmount: prizeAmount,
        payoutTx: tx,
        message: `Congratulations! You won ${prizeAmount} USDC!`
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
