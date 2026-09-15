import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "学伴 · 零基础学习助手",
  description: "为零基础学习者提供即时、可理解的概念讲解，随学随问，难度自动适应。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
