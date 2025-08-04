import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "~/lib/supabaseAdmin";
import axios from "axios";

export async function POST(request: NextRequest) {
  try {
    const { fid, notification_token } = await request.json();

    if (!fid || !notification_token) {
      return NextResponse.json(
        { error: "Missing fid or notification_token" },
        { status: 400 }
      );
    }

    // Find user by FID
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("fid", fid)
      .single();

    if (userError || !user) {
      console.error("Error finding user by FID:", userError);
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Update user with notification settings
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from("users")
      .update({
        notification_enabled: true,
        notification_token: notification_token,
        last_active: new Date().toISOString(),
      })
      .eq("fid", fid)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating user notification settings:", updateError);
      return NextResponse.json(
        { error: "Failed to update notification settings" },
        { status: 500 }
      );
    }

    // Send notification via Neynar
    const neynarApiKey = process.env.NEYNAR_API_KEY;
    if (!neynarApiKey) {
      console.error("NEYNAR_API_KEY not configured");
      return NextResponse.json(
        { error: "Notification service not configured" },
        { status: 500 }
      );
    }

    try {
      const notificationResult = await axios.post(
        "https://api.neynar.com/v2/farcaster/frame/notifications/",
        {
          notification: {
            target_url: "https://scratch-off-xi.vercel.app",
            body: "Scratch to win big!",
            title: "Welcome to Scratch Off!",
          },
          target_fids: [fid],
        },
        {
          headers: {
            accept: "application/json",
            api_key: process.env.NEYNAR_API_KEY,
            "content-type": "application/json",
          },
        }
      );

      return NextResponse.json({
        success: true,
        user: updatedUser,
        notification: notificationResult.data,
      });
    } catch (notificationError: any) {
      console.error("Neynar notification failed:", notificationError.response?.data || notificationError.message);
      return NextResponse.json(
        { error: "Failed to send notification" },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Error in welcome notification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
