import { NextRequest, NextResponse } from "next/server";
import { getUserReveals, getUserStats } from "../../../lib/database";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userWallet = searchParams.get('userWallet');

    if (!userWallet) {
      return NextResponse.json(
        { error: "Missing userWallet parameter" },
        { status: 400 }
      );
    }

    // Get user's reveals and stats
    const reveals = await getUserReveals(userWallet, 3);

    return NextResponse.json({
      success: true,
      reveals,
    });

  } catch (error) {
    console.error("Error fetching user reveals:", error);
    return NextResponse.json(
      { error: "Failed to fetch user reveals" },
      { status: 500 }
    );
  }
}
