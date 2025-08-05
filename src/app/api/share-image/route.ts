import { ImageResponse } from "next/og";
import React from "react";
import { readFileSync } from 'fs';
import path from 'path';

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const prizeAmount = searchParams.get("prize") || "0";
    const username = searchParams.get("username") || "";

    // Load the ABC Gaisyr Bold font
    const fontBuffer = readFileSync(path.join(process.cwd(), 'public', 'fonts', 'ABCGaisyr-BoldItalic-Trial.otf'));

    return new ImageResponse(
      React.createElement(
        "div",
        {
          style: {
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(to bottom, #090210, #00A151)",
            position: "relative",
            overflow: "hidden",
          },
        },
        [
          // Background scratch card (blurred)
          React.createElement("img", {
            src: 'https://scratch-off-xi.vercel.app/assets/scratch-card-image.png',
            alt: 'scratch card background',
            style: {
              position: "absolute",
              top: "50%",
              left: "50%",
              width: "80%",
              height: "80%",
              objectFit: "contain",
              filter: "blur(4px)",
              opacity: 0.4,
              zIndex: 0,
              transform: "translate(-50%, -50%)",
            },
          }),
          
          // Background GIF
          React.createElement("img", {
            src: 'https://scratch-off-xi.vercel.app/assets/winner.gif',
            alt: 'winner',
            style: {
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              zIndex: 1,
            },
          }),
          
          // Overlay for text readability
          React.createElement("div", {
            style: {
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              background: "rgba(0, 0, 0, 0.3)",
              zIndex: 2,
            },
          }),
          
          // Main content
          React.createElement(
            "div",
            {
              style: {
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                zIndex: 3,
                textAlign: "center",
                color: "#FFFFFF",
                transform: "rotate(-4deg)",
                fontFamily: "ABCGaisyrBoldItalic",
                fontWeight: "bold",
                fontStyle: "italic"
              },
            },
            [
              username && React.createElement("div", {
                style: {
                  fontSize: "46px",
                  lineHeight: "92%",
                  marginBottom: "10px",
                },
              }, `${username} won`),
              React.createElement("div", {
                style: {
                  fontSize: "94px",
                  lineHeight: "92%",
                  color: "#FFFFFF",
                },
              }, `$${prizeAmount}!`),
            ]
          ),
        ]
      ),
      {
        width: 1200,
        height: 630,
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
        },
        fonts: [
          {
            name: "ABCGaisyrBoldItalic",
            data: fontBuffer,
            style: "italic",
            weight: 700,
          },
        ],
      }
    );
  } catch (error) {
    console.error("Error generating share image:", error);
    return new Response("Failed to generate image", { status: 500 });
  }
} 