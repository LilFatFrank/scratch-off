import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "~/lib/supabaseAdmin";

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

    // Get all cards for this user, ordered by card_no
    const { data: cards, error } = await supabaseAdmin
      .from('cards')
      .select('*')
      .eq('user_wallet', userWallet)
      .order('card_no', { ascending: false });

    if (error) {
      console.error('Error fetching user cards:', error);
      return NextResponse.json(
        { error: "Failed to fetch user cards" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      cards: cards || [],
    });

  } catch (error) {
    console.error("Error fetching user cards:", error);
    return NextResponse.json(
      { error: "Failed to fetch user cards" },
      { status: 500 }
    );
  }
}
