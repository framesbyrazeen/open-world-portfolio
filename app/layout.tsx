import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Razeen — An Open World Portfolio",
  description: "Drive from the city through forests, mountains and sandstone desert to the sea. Mohammed Razeen’s interactive portfolio: code, creativity and curiosity from Kerala.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
