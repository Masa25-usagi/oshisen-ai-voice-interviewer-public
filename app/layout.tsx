import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "オシセン | AI音声インタビュアー",
  description: "政策について話しながら、自分の考えを整理するための音声インタビューMVP。",
};

export const viewport: Viewport = {
  themeColor: "#fffdf7",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
