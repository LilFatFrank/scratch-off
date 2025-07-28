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

    // Get user's reveals from Supabase
    const { data: reveals, error } = await supabaseAdmin
      .from('reveals')
      .select('*')
      .eq('user_wallet', userWallet)
      .order('created_at', { ascending: false })
      .limit(3);

    if (error) {
      console.error('Error fetching user reveals:', error);
      return NextResponse.json(
        { error: "Failed to fetch user reveals" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      reveals: reveals || [],
    });

  } catch (error) {
    console.error("Error fetching user reveals:", error);
    return NextResponse.json(
      { error: "Failed to fetch user reveals" },
      { status: 500 }
    );
  }
}
