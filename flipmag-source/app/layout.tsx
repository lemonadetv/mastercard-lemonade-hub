import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Business Intelligence Journal | Mastercard",
  description: "Interactive edition of the Mastercard Business Intelligence Journal.",
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
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
