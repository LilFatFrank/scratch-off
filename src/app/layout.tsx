import type { Metadata } from "next";

import "~/app/globals.css";
import { Providers } from "~/app/providers";
import { AppContextProvider } from "./context";
import Wrapper from "~/components/wrapper";
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Scratch Off",
  description: "Scratch to win big!",
  icons: {
    icon: [
      {
        rel: "icon",
        url: "/assets/splash-image.jpg",
        sizes: "any",
        type: "image/jpg",
      },
    ],
  },
  other: {
    "fc:frame": JSON.stringify({
      version: "next",
      imageUrl:
        "https://scratch-off-xi.vercel.app/assets/splash-image.jpg",
      button: {
        title: "Scratch Off",
        action: {
          type: "launch_frame",
          name: "Scratch Off",
          url: "https://farcaster.xyz/miniapps/XK6cHhOmUkRm/scratch-off",
          splashImageUrl:
            "https://scratch-off-xi.vercel.app/assets/splash-image.jpg",
        },
      },
    }),
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <AppContextProvider>
            <Wrapper>{children}</Wrapper>
          </AppContextProvider>
        </Providers>
      </body>
    </html>
  );
}
