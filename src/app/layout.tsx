import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mato Podcast Generator",
  description: "Generate podcast episodes with AI-powered script writing and text-to-speech",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
