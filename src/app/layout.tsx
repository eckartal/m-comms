import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ContentHub - Content Collaboration & Scheduling Platform",
  description: "Plan, create, and schedule social content with your team. Notion-like editor with Typefully-style scheduling.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased" style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}