import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = { title: '뚱이랑 취뽀', description: '느긋하게 준비하는 취업 일정 관리' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
