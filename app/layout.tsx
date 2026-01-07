import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "서울시 행정동 인터랙티브 지도",
  description: "서울시 행정동 단위의 데이터 시각화 웹앱",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
