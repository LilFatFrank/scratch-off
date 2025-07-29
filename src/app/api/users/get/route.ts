import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "~/lib/supabaseAdmin";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userWallet = searchParams.get('userWallet');
    
    if (!userWallet) {
      return NextResponse.json(
        { error: "Missing userWallet" },
        { status: 400 }
      );
    }
    
    // Fetch user details
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('wallet', userWallet)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // User not found
        return NextResponse.json({ 
          success: true, 
          user: null 
        });
      }
      console.error('Error fetching user:', error);
      return NextResponse.json(
        { error: "Failed to fetch user" },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      user: user
    });
    
  } catch (error) {
    console.error('Error in get user:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 