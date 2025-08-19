import { NextRequest } from "next/server";
import { getMiniAppEmbedMetadata } from "~/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const prizeAmount = searchParams.get("prize") || "0";
    const username = searchParams.get("username") || "";
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://scratch-off-xi.vercel.app';

    // Get mini app metadata
    const metadata = getMiniAppEmbedMetadata(`${baseUrl}/api/share-image?prize=${prizeAmount}&username=${username}`);

    // Create Frame HTML that uses your generated image
    const frameHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta property="fc:miniapp" content="vNext" />
          <meta property="fc:miniapp:image" content="${metadata.imageUrl}" />
          <meta property="fc:miniapp:button:1" content="${metadata.button.title}" />
          <meta property="fc:miniapp:button:1:action" content="post" />
          <meta property="fc:miniapp:button:1:target" content="${metadata.button.action.url}" />
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
        "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("Error generating frame:", error);
    return new Response("Error generating frame", { status: 500 });
  }
}
