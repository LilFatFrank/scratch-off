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
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover",
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
