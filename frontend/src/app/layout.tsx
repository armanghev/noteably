import type { Metadata } from "next";
import { Inter, Shrikhand } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--next-font-inter",
});

const shrikhand = Shrikhand({
  weight: "400",
  subsets: ["latin"],
  variable: "--next-font-shrikhand",
});

export const metadata: Metadata = {
  title: "Noteably - Browse everything.",
  description: "Browse everything with Noteably.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${shrikhand.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
