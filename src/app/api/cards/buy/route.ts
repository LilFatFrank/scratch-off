import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { supabaseAdmin } from "~/lib/supabaseAdmin";
import { USDC_MINT } from "~/lib/constants";

// Payment verification function
async function verifyPayment(
  connection: Connection, 
  paymentTx: string, 
  expectedAmount: number, // Amount in USDC (e.g., 5 for 5 USDC)
  expectedRecipient?: string
): Promise<boolean> {
  const tolerance = 0.001; // 0.001 USDC tolerance
  try {
    // Get transaction details
    const transaction = await connection.getTransaction(paymentTx, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0
    });

    if (!transaction) {
      console.log("Transaction not found:", paymentTx);
      return false;
    }

    // Check if transaction was successful
    if (transaction.meta?.err) {
      console.log("Transaction failed:", transaction.meta.err);
      return false;
    }

    // Get the expected recipient (admin wallet)
    const recipientAddress = expectedRecipient || process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS;
    if (!recipientAddress) {
      console.log("No recipient address configured");
      return false;
    }

    const expectedRecipientPubkey = new PublicKey(recipientAddress);

    // Check if this is a USDC transfer to our admin wallet
    const preBalances = transaction.meta?.preTokenBalances || [];
    const postBalances = transaction.meta?.postTokenBalances || [];
    
    const adminPreBalance = preBalances.find(
      balance => balance.mint === USDC_MINT && balance.owner === expectedRecipientPubkey.toString()
    );
    const adminPostBalance = postBalances.find(
      balance => balance.mint === USDC_MINT && balance.owner === expectedRecipientPubkey.toString()
    );

    // Handle case where admin account was created in this transaction
    if (!adminPreBalance && adminPostBalance) {
      const amountReceived = adminPostBalance.uiTokenAmount.uiAmount || 0;
      console.log("New admin account created, amount received:", amountReceived);
      return Math.abs(amountReceived - expectedAmount) <= tolerance;
    }

    if (!adminPreBalance || !adminPostBalance) {
      console.log("Admin token account not found in transaction");
      return false;
    }

    // Calculate the amount received
    const amountReceived = (adminPostBalance.uiTokenAmount.uiAmount || 0) - 
                          (adminPreBalance.uiTokenAmount.uiAmount || 0);

    // Verify the amount (allow for small rounding differences)
    return Math.abs(amountReceived - expectedAmount) <= tolerance;

  } catch (error) {
    console.error("Error verifying payment:", error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userWallet, paymentTx, numberOfCards } = await request.json();
    
    if (!userWallet || !paymentTx || !numberOfCards) {
      return NextResponse.json(
        { error: "Missing required fields: userWallet, paymentTx, or numberOfCards" },
        { status: 400 }
      );
    }

    // Setup connection
    const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');
    
    // Verify payment transaction (1 USDC per card)
    const expectedAmount = numberOfCards; // 1 USDC per card
    const paymentVerified = await verifyPayment(connection, paymentTx, expectedAmount);
    
    if (!paymentVerified) {
      console.log("Payment verification failed for transaction:", paymentTx);
      return NextResponse.json(
        { error: `Payment verification failed. Please ensure you sent ${expectedAmount} USDC to the correct address.` },
        { status: 400 }
      );
    }

    // Get the next card number for this user
    const { data: existingCards, error: countError } = await supabaseAdmin
      .from('cards')
      .select('card_no')
      .eq('user_wallet', userWallet)
      .order('card_no', { ascending: false })
      .limit(1);

    if (countError) {
      console.error('Error getting card count:', countError);
      return NextResponse.json(
        { error: "Failed to get card count" },
        { status: 500 }
      );
    }

    // Calculate starting card number
    const startCardNo = existingCards && existingCards.length > 0 
      ? existingCards[0].card_no + 1 
      : 1;

    // Create multiple cards
    const cardsToCreate = [];
    for (let i = 0; i < numberOfCards; i++) {
      cardsToCreate.push({
        user_wallet: userWallet,
        payment_tx: paymentTx,
        prize_amount: 0, // Will be set when card is scratched
        scratched: false,
        claimed: false,
        created_at: new Date().toISOString(),
        card_no: startCardNo + i
      });
    }

    const { data: newCards, error: createError } = await supabaseAdmin
      .from('cards')
      .insert(cardsToCreate)
      .select();

    if (createError) {
      console.error('Error creating cards:', createError);
      return NextResponse.json(
        { error: "Failed to create cards" },
        { status: 500 }
      );
    }

    // Update user's cards_count
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ 
        cards_count: startCardNo + numberOfCards - 1,
        last_active: new Date().toISOString()
      })
      .eq('wallet', userWallet);

    if (updateError) {
      console.error('Error updating user card count:', updateError);
      // Don't fail the request if user update fails
    }

    console.log('New cards created:', newCards);
    return NextResponse.json({ 
      success: true, 
      cards: newCards,
      totalCardsCreated: numberOfCards,
      startCardNo,
      endCardNo: startCardNo + numberOfCards - 1
    });
    
  } catch (error) {
    console.error('Error in buy cards:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
