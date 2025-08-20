import { NextRequest } from "next/server";
import { APP_SPLASH_BACKGROUND_COLOR, APP_SPLASH_URL } from "~/lib/constants";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const prizeAmount = searchParams.get("prize") || "0";
    const username = searchParams.get("username") || "";
    const baseUrl =
      process.env.NEXT_PUBLIC_URL || "https://scratch-off-xi.vercel.app";

    // Create Frame HTML that uses your generated image
    const frameHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="fc:frame" content='{"version":"next","imageUrl":"${baseUrl}/api/share-image?prize=${prizeAmount}&username=${username}","button":{"title":"Play Scratch Off","action":{"type":"launch_miniapp","name":"Scratch Off","url":"${baseUrl}","splashImageUrl":"${APP_SPLASH_URL}","splashBackgroundColor":"${APP_SPLASH_BACKGROUND_COLOR}"}}}' />
          <title>Won $${prizeAmount}!</title>
        </head>
        <body>
          <h1>${username} won $${prizeAmount}!</h1>
        </body>
      </html>
    `;

    return new Response(frameHtml, {
      headers: {
        "Content-Type": "text/html",
        "Cache-Control":
          "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("Error generating frame:", error);
    return new Response("Error generating frame", { status: 500 });
  }
}
