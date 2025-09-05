import axios from "axios";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const apiKey = process.env.NEYNAR_API_KEY;
  const { searchParams } = new URL(request.url);
  const fid = searchParams.get("fid");

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Neynar API key is not configured. Please add NEYNAR_API_KEY to your environment variables.",
      },
      { status: 500 }
    );
  }

  if (!fid) {
    return NextResponse.json(
      { error: "FID parameter is required" },
      { status: 400 }
    );
  }

  try {
    const bulkResponse = await axios.get(
      `https://api.neynar.com/v2/farcaster/followers/reciprocal/?limit=100&sort_type=algorithmic&fid=${fid}`,
      {
        headers: {
          "x-api-key": apiKey,
        },
      }
    );

    const users = bulkResponse.data.users.map(
      (user: {
        user: {
          fid: number;
          username: string;
          pfp_url: string;
          verified_addresses: {
            primary: {
              eth_address: string;
            };
          };
        };
      }) => ({
        fid: user.user.fid,
        username: user.user.username,
        pfp: user.user.pfp_url,
        wallet: user.user.verified_addresses.primary.eth_address,
      })
    );

    return NextResponse.json({ bestFriends: users });
  } catch (error) {
    console.error("Failed to fetch best friends:", error);
    return NextResponse.json(
      {
        error:
          "Failed to fetch best friends. Please check your Neynar API key and try again.",
      },
      { status: 500 }
    );
  }
}
