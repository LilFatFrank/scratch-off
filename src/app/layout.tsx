import type { Metadata } from "next";

import "~/app/globals.css";
import { Providers } from "~/app/providers";
import { AppContextProvider } from "./context";
import Wrapper from "~/components/wrapper";
import { Geist, Geist_Mono } from "next/font/google";
import { getMiniAppEmbedMetadata } from "~/lib/utils";

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
        url: "/assets/scratch-card-image.png",
        sizes: "any",
        type: "image/png",
      },
    ],
  },
  other: {
    "fc:frame": JSON.stringify(getMiniAppEmbedMetadata()),
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
