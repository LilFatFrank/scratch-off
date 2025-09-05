import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "~/lib/supabaseAdmin";
import axios from "axios";

interface BestFriend {
  fid: number;
  mutual_affinity_score: number;
  username: string;
}

interface BestFriendsResponse {
  users: BestFriend[];
}

export async function POST(request: NextRequest) {
  try {
    const { fid, username, amount, friend_fid } = await request.json();

    if (!fid || !username || amount === undefined) {
      return NextResponse.json(
        { error: "Missing fid, username, or amount" },
        { status: 400 }
      );
    }

    const neynarApiKey = process.env.NEYNAR_API_KEY;
    if (!neynarApiKey) {
      console.error("NEYNAR_API_KEY not configured");
      return NextResponse.json(
        { error: "Notification service not configured" },
        { status: 500 }
      );
    }

    // If friend_fid is present, send notification only to that specific friend
    if (friend_fid && amount === -1) {
      try {
        const notificationResponse = await axios.post(
          "https://api.neynar.com/v2/farcaster/frame/notifications/",
          {
            notification: {
              target_url: "https://scratch-off-xi.vercel.app",
              body: "Play Scratch Off to win big!",
              title: `${username} just won a free card for you!`,
            },
            target_fids: [friend_fid],
          },
          {
            headers: {
              accept: "application/json",
              "x-api-key": neynarApiKey,
              "content-type": "application/json",
            },
          }
        );

        console.log(`Sent friend win notification to FID ${friend_fid}`);
        return NextResponse.json({
          success: true,
          type: "friend_win",
          targetFid: friend_fid,
          notification: notificationResponse.data,
        });
      } catch (notificationError: any) {
        console.error(
          "Neynar notification failed:",
          notificationError.response?.data || notificationError.message
        );
        return NextResponse.json(
          { error: "Failed to send friend notification" },
          { status: 500 }
        );
      }
    }

    // Step 1: Fetch best friends from Neynar (for regular prize wins)
    let bestFriends: BestFriend[] = [];
    try {
      const bestFriendsResponse = await axios.get<BestFriendsResponse>(
        `https://api.neynar.com/v2/farcaster/user/best_friends/?limit=30&fid=${fid}`,
        {
          headers: {
            "x-api-key": neynarApiKey,
          },
        }
      );
      bestFriends = bestFriendsResponse.data.users;
      console.log(`Found ${bestFriends.length} best friends for FID ${fid}`);
    } catch (error) {
      console.error("Error fetching best friends:", error);
      return NextResponse.json(
        { error: "Failed to fetch best friends" },
        { status: 500 }
      );
    }

    // Step 2: Find users in database with notification_enabled = true
    const bestFriendFids = bestFriends.map(friend => friend.fid);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let usersToNotify: any[] = [];

    if (bestFriendFids.length > 0) {
      try {
        const { data: users, error: dbError } = await supabaseAdmin
          .from("users")
          .select("fid, username, notification_enabled, notification_token")
          .in("fid", bestFriendFids)
          .eq("notification_enabled", true);

        if (dbError) {
          console.error("Error fetching users from database:", dbError);
          return NextResponse.json(
            { error: "Failed to fetch users from database" },
            { status: 500 }
          );
        }

        usersToNotify = users || [];
        console.log(`Found ${usersToNotify.length} users with notifications enabled`);
      } catch (error) {
        console.error("Error querying database:", error);
        return NextResponse.json(
          { error: "Database query failed" },
          { status: 500 }
        );
      }
    }

    // Step 3: Send notifications to eligible users
    const targetFids = usersToNotify.map(user => user.fid);
    let notificationResult = null;

    if (targetFids.length > 0) {
      try {
        const notificationResponse = await axios.post(
          "https://api.neynar.com/v2/farcaster/frame/notifications/",
          {
            notification: {
              target_url: "https://scratch-off-xi.vercel.app",
              body: "Play Scratch Off to win big!",
              title: `${username} just won $${amount}!`,
            },
            target_fids: targetFids,
          },
          {
            headers: {
              accept: "application/json",
              "x-api-key": neynarApiKey,
              "content-type": "application/json",
            },
          }
        );

        notificationResult = notificationResponse.data;
        console.log(`Sent notifications to ${targetFids.length} users`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (notificationError: any) {
        console.error(
          "Neynar notification failed:",
          notificationError.response?.data || notificationError.message
        );
        return NextResponse.json(
          { error: "Failed to send notifications" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      type: "regular_win",
      bestFriendsCount: bestFriends.length,
      usersToNotifyCount: usersToNotify.length,
      targetFids,
      notification: notificationResult,
    });

  } catch (error) {
    console.error("Error in send notification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}