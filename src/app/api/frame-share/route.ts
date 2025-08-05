import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const prizeAmount = searchParams.get("prize") || "0";
    const username = searchParams.get("username") || "";
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://scratch-off-xi.vercel.app';

    // Create Frame HTML that uses your generated image
    const frameHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta property="fc:frame" content="vNext" />
          <meta property="fc:frame:image" content="${baseUrl}/api/share-image?prize=${prizeAmount}&username=${username}" />
          <meta property="fc:frame:button:1" content="Play Scratch Off" />
          <meta property="fc:frame:post_url" content="https://farcaster.xyz/miniapps/XK6cHhOmUkRm/scratch-off" />
          <title>Won $${prizeAmount}!</title>
        </head>
        <body>
          <h1>${username} won $${prizeAmount}!</h1>
          <p>Click the button to play Scratch Off!</p>
        </body>
      </html>
    `;

    return new Response(frameHtml, {
      headers: {
        "Content-Type": "text/html",
        "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("Error generating frame:", error);
    return new Response("Error generating frame", { status: 500 });
  }
}
