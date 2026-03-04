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
  icons: {
    icon: [
      { url: "/favicon/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon/favicon.ico", sizes: "any" },
    ],
    apple: [
      {
        url: "/favicon/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  manifest: "/favicon/site.webmanifest",
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
