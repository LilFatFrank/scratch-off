import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "~/lib/supabaseAdmin";

export async function POST(request: NextRequest) {
  try {
    const { userWallet } = await request.json();
    
    if (!userWallet) {
      return NextResponse.json(
        { error: "Missing userWallet" },
        { status: 400 }
      );
    }
    
    // Check if user exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('wallet')
      .eq('wallet', userWallet)
      .single();
    
    if (!existingUser) {
      // Create new user
      const { data: newUser, error } = await supabaseAdmin
        .from('users')
        .insert({
          wallet: userWallet,
          created_at: new Date().toISOString(),
          amount_won: 0,
          cards_count: 0,
          last_active: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating user:', error);
        return NextResponse.json(
          { error: "Failed to create user" },
          { status: 500 }
        );
      }
      
      console.log('New user created:', newUser);
      return NextResponse.json({ 
        success: true, 
        user: newUser,
        isNewUser: true 
      });
    } else {
      // Update last_active for existing user
      const { data: updatedUser } = await supabaseAdmin
        .from('users')
        .update({ last_active: new Date().toISOString() })
        .eq('wallet', userWallet)
        .select()
        .single();
      
      console.log('Existing user updated:', userWallet);
      return NextResponse.json({ 
        success: true, 
        user: updatedUser,
        isNewUser: false 
      });
    }
    
  } catch (error) {
    console.error('Error in check-or-create user:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
