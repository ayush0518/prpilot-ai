import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MergeMind | PR Intelligence Dashboard",
  description: "Premium pull request intelligence with verdict, risk, blast radius, and compliance analysis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[var(--background)] antialiased">
        {children}
      </body>
    </html>
  );
}
