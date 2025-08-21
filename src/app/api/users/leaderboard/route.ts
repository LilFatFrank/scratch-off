import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "~/lib/supabaseAdmin";

export async function GET(request: NextRequest) {
  try {
    // Fetch top 100 users sorted by amount_won descending
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .order('amount_won', { ascending: false })
      .limit(100);
    
    if (error) {
      console.error('Error fetching leaderboard:', error);
      return NextResponse.json(
        { error: "Failed to fetch leaderboard" },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      leaderboard: users || []
    });
    
  } catch (error) {
    console.error('Error in leaderboard API:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
