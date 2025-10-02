import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Hotkeys } from '@/features/hotkeys/ui/Hotkeys';
import { ThemeProvider } from '@/features/theme/ui/ThemeProvider';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Chibi-Pix | A Simple Pixel Art Creator',
  description:
    'A free, web-based pixel art and animation tool with powerful features. No installation required.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full w-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} flex h-full w-full flex-col antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Hotkeys />
        </ThemeProvider>
      </body>
    </html>
  );
}
