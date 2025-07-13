import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import nacl from "tweetnacl";

export async function POST(request: NextRequest) {
  try {
    const { signature, publicKey, message } = await request.json();
    console.log({ signature, publicKey, message });

    if (!signature || !publicKey || !message) {
      return NextResponse.json(
        { error: "Missing required fields: signature, publicKey, or message" },
        { status: 400 }
      );
    }

    // Verify the signature
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = bs58.decode(signature);
    const publicKeyBytes = new PublicKey(publicKey).toBytes();

    console.log({messageBytes,
      signatureBytes,
      publicKeyBytes})

    const isValid = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyBytes
    );

    if (isValid) {
      return NextResponse.json({
        success: true,
        message: "Signature verified successfully",
        data: {
          publicKey,
          message,
          signature,
          recipient: process.env.ADMIN_WALLET_ADDRESS
        }
      });
    } else {
      console.log('invalid');
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error verifying signature:", error);
    return NextResponse.json(
      { error: "Failed to verify signature" },
      { status: 500 }
    );
  }
}
