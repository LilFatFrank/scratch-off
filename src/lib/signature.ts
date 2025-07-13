import { useWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";

export const useSignature = () => {
  const { publicKey, signMessage } = useWallet();

  const signMessageWithWallet = async (message: string) => {
    if (!publicKey || !signMessage) {
      throw new Error("Wallet not connected or doesn't support signing");
    }

    try {
      const messageBytes = new TextEncoder().encode(message);
      const signature = await signMessage(messageBytes);
      const signatureBase58 = bs58.encode(signature);
      
      return {
        signature: signatureBase58,
        publicKey: publicKey.toString(),
        message
      };
    } catch (error) {
      console.error("Error signing message:", error);
      throw new Error("Failed to sign message");
    }
  };

  return {
    signMessageWithWallet,
    publicKey,
    isConnected: !!publicKey
  };
};
