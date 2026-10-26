import React from 'react';
import type { Metadata, Viewport } from 'next';
import '../styles/tailwind.css';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import SplashWrapper from '@/components/SplashWrapper';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1a56db',
};

export const metadata: Metadata = {
  title: 'VEX Inventory',
  description:
    'VEX gives organizations and businesses a centralized, accountable inventory management system — every stock movement tracked, every transaction recorded.',
  applicationName: 'VEX Inventory',
  appleWebApp: {
    capable: true,
    title: 'VEX Inventory',
    statusBarStyle: 'default',
  },
  icons: {
    icon: [
      { url: '/icon.png', type: 'image/png', sizes: '512x512' },
      { url: '/assets/images/app_logo.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [{ url: '/apple-icon.png', type: 'image/png', sizes: '180x180' }],
    shortcut: ['/assets/images/app_logo.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AuthProvider>
          <ThemeProvider>
            <SplashWrapper>
              {children}
              <Toaster position="bottom-right" richColors closeButton />
            </SplashWrapper>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}