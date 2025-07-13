import type { Metadata } from "next";
import "~/app/globals.css";
import { Providers } from "~/app/providers";
import Wrapper from "~/components/wrapper";
import { AppContextProvider } from "./context";
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
  description: "Scratch to reveal your fate",
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
