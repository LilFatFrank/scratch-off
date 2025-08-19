import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "~/lib/supabaseAdmin";

export async function POST(request: NextRequest) {
  try {
    const { userWallet, fid, username, pfp } = await request.json();

    if (!userWallet) {
      return NextResponse.json(
        { error: "Missing userWallet" },
        { status: 400 }
      );
    }

    // Check if user exists
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("wallet, fid, username")
      .eq("wallet", userWallet)
      .single();

    if (!existingUser) {
      // Create new user
      const { data: newUser, error } = await supabaseAdmin
        .from("users")
        .insert({
          wallet: userWallet,
          fid,
          username,
          pfp: pfp,
          created_at: new Date().toISOString(),
          amount_won: 0,
          cards_count: 0,
          last_active: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating user:", error);
        return NextResponse.json(
          { error: "Failed to create user" },
          { status: 500 }
        );
      }

      console.log("New user created:", newUser);
      return NextResponse.json({
        success: true,
        user: newUser,
        isNewUser: true,
      });
    } else {
      // Update last_active for existing user, and add fid/username if missing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: any = { last_active: new Date().toISOString() };

      // Add fid if provided and user doesn't have it
      if (fid && !existingUser.fid) {
        updateData.fid = fid;
      }

      // Add username if provided and user doesn't have it
      if (username && !existingUser.username) {
        updateData.username = username;
      }

      const { data: updatedUser } = await supabaseAdmin
        .from("users")
        .update(updateData)
        .eq("wallet", userWallet)
        .select()
        .single();

      console.log("Existing user updated:", userWallet);
      return NextResponse.json({
        success: true,
        user: updatedUser,
        isNewUser: false,
      });
    }
  } catch (error) {
    console.error("Error in check-or-create user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
