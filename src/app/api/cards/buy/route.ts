import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { base } from "wagmi/chains";
import { supabaseAdmin } from "~/lib/supabaseAdmin";
import { USDC_ADDRESS } from "~/lib/constants";

// Payment verification function for Base chain
async function verifyPayment(
  paymentTx: string, 
  expectedAmount: number, // Amount in USDC (e.g., 5 for 5 USDC)
  expectedRecipient?: string
): Promise<boolean> {
  const tolerance = 0.001; // 0.001 USDC tolerance
  try {
    // Create public client for Base
    const client = createPublicClient({
      chain: base,
      transport: http(),
    });

    // Get transaction details
    const transaction = await client.getTransactionReceipt({
      hash: paymentTx as `0x${string}`,
    });

    if (!transaction) {
      console.log("Transaction not found:", paymentTx);
      return false;
    }

    // Check if transaction was successful
    if (transaction.status === 'reverted') {
      console.log("Transaction failed");
      return false;
    }

    // Get the expected recipient (admin wallet)
    const recipientAddress = expectedRecipient || process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS;
    if (!recipientAddress) {
      console.log("No recipient address configured");
      return false;
    }

    // Check if this is a USDC transfer to our admin wallet
    // Look for Transfer event from USDC contract to admin wallet
    const transferEvent = transaction.logs.find(log => {
      // Check if log is from USDC contract
      if (log.address.toLowerCase() !== USDC_ADDRESS.toLowerCase()) {
        return false;
      }
      
      // Check if it's a Transfer event to admin wallet
      // Transfer event signature: 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef
      const transferEventSignature = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
      
      if (!log.topics[0] || log.topics[0] !== transferEventSignature) {
        return false;
      }
      
      // Check if recipient is admin wallet (topic[2] contains recipient address)
      if (log.topics[2]) {
        const recipient = '0x' + log.topics[2].slice(26); // Remove padding
        return recipient.toLowerCase() === recipientAddress.toLowerCase();
      }
      
      return false;
    });

    if (!transferEvent) {
      console.log("USDC transfer to admin wallet not found in transaction");
      return false;
    }

    // Extract amount from transfer event
    // Amount is in the data field (32 bytes)
    const amountHex = transferEvent.data;
    const amount = parseInt(amountHex, 16) / 1e6; // Convert from smallest units to USDC

    console.log("Amount received:", amount, "Expected:", expectedAmount);
    
    // Verify the amount (allow for small rounding differences)
    return Math.abs(amount - expectedAmount) <= tolerance;

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

    // Verify payment transaction (1 USDC per card)
    const expectedAmount = numberOfCards; // 1 USDC per card
    const paymentVerified = await verifyPayment(paymentTx, expectedAmount);
    
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
