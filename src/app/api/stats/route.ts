import { NextResponse } from "next/server";
import { supabaseAdmin } from "~/lib/supabaseAdmin";

export async function GET() {
  try {
    // Fetch the single stats row
    const { data: stats, error } = await supabaseAdmin
      .from('stats')
      .select('*')
      .eq('id', 1)
      .single();
    
    if (error) {
      console.error('Error fetching stats:', error);
      return NextResponse.json(
        { error: "Failed to fetch stats" },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      stats: stats || {
        id: 1,
        winnings: 0,
        cards: 0,
        reveals: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error in stats API:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
