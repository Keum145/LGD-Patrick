import type { Metadata } from "next";
import { Jua, Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans",
  display: "swap",
  preload: false,
});

const jua = Jua({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-jua",
  display: "swap",
});

export const metadata: Metadata = {
  title: "뚱이랑 취뽀",
  description: "느긋하게 준비하는 취업 일정 관리",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className={`${notoSansKr.variable} ${jua.variable}`}>
        {children}
      </body>
    </html>
  );
}
