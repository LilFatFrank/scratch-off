import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "~/lib/supabaseAdmin";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userWallet = searchParams.get('userWallet');

    let query = supabaseAdmin
      .from('reveals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    // If userWallet is provided, filter by user
    if (userWallet) {
      query = query.eq('user_wallet', userWallet);
    }

    // Get reveals from Supabase
    const { data: reveals, error } = await query;

    if (error) {
      console.error('Error fetching reveals:', error);
      return NextResponse.json(
        { error: "Failed to fetch reveals" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      reveals: reveals || [],
    });

  } catch (error) {
    console.error("Error fetching reveals:", error);
    return NextResponse.json(
      { error: "Failed to fetch reveals" },
      { status: 500 }
    );
  }
}
