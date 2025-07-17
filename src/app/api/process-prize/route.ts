import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey, Transaction, Keypair } from "@solana/web3.js";
import { 
  getAssociatedTokenAddressSync, 
  createAssociatedTokenAccountIdempotentInstruction, 
  createTransferCheckedInstruction 
} from "@solana/spl-token";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";

const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"; // Mainnet USDC

// Prize calculation function
function drawPrize(): number {
  const r = Math.random() * 100;    // 0.000 … 99.999
  console.log(r);

  if (r < 35)  return 0;      // 35 % lose
  if (r < 75)  return 0.50;   // +40 %  → 75 %
  if (r < 87)  return 1;      // +12 %  → 87 %
  if (r < 98)  return 2;      // +11 %  → 98 %
  return 0;                   // last 2 % blank
}

// Payment verification function
async function verifyPayment(
  connection: Connection, 
  paymentTx: string, 
  expectedAmount: number = 1_000_000, // 1 USDC in smallest units
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
      const tolerance = 0.001; // 0.001 USDC tolerance
      return Math.abs(amountReceived - (expectedAmount / 1e6)) <= tolerance;
    }

    if (!adminPreBalance || !adminPostBalance) {
      console.log("Admin token account not found in transaction");
      return false;
    }

    // Calculate the amount received
    const amountReceived = (adminPostBalance.uiTokenAmount.uiAmount || 0) - 
                          (adminPreBalance.uiTokenAmount.uiAmount || 0);

    // Verify the amount (allow for small rounding differences)
    return Math.abs(amountReceived - (expectedAmount / 1e6)) <= tolerance;

  } catch (error) {
    console.error("Error verifying payment:", error);
    return false;
  }
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { userWallet, paymentTx } = body;

    if (!userWallet || !paymentTx) {
      console.log("Missing fields:", {
        userWallet: !!userWallet,
        paymentTx: !!paymentTx,
      });
      return NextResponse.json(
        { error: "Missing required fields: userWallet or paymentTx" },
        { status: 400 }
      );
    }

    // Setup connection
    const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');
    
    // Verify payment transaction
    const paymentVerified = await verifyPayment(connection, paymentTx);
    if (!paymentVerified) {
      console.log("Payment verification failed for transaction:", paymentTx);
      return NextResponse.json(
        { error: "Payment verification failed. Please ensure you sent 1 USDC to the correct address." },
        { status: 400 }
      );
    }
    
    // Calculate prize amount
    const prizeAmount = drawPrize();
    
    if (prizeAmount === 0) {
      return NextResponse.json({
        success: true,
        prizeAmount: 0,
        message: "Better luck next time!",
        payoutTx: null
      });
    }

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

    return NextResponse.json({
      success: true,
      prizeAmount: prizeAmount,
      payoutTx: tx,
      message: `Congratulations! You won ${prizeAmount} USDC!`
    });

  } catch (error) {
    console.error("Error processing prize:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process prize" },
      { status: 500 }
    );
  }
} 