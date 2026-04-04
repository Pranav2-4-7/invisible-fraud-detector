import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Invisible Fraud Detector — Real-Time Command Center",
  description: "Advanced fraud detection engine with graph-based anomaly detection, behavioral analysis, and AI-powered explainability.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
