import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'RadLink - Cloud PACS',
    template: '%s | RadLink',
  },
  description:
    'RadLink Cloud PACS — Professional medical imaging platform for radiologists and healthcare facilities.',
  keywords: ['PACS', 'radiology', 'DICOM', 'medical imaging', 'teleradiology', 'cloud'],
  authors: [{ name: 'RadLink' }],
  robots: {
    index: false, // HIPAA: prevent indexing of medical platform
    follow: false,
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0a0a0f',
  colorScheme: 'dark',
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={`${inter.variable} dark`} suppressHydrationWarning>
      <head>
        {/*
          SharedArrayBuffer requires COOP/COEP headers, which are set in next.config.mjs.
          The meta tags below are a fallback hint for environments that ignore headers.
        */}
        <meta httpEquiv="origin-trial" content="" />
      </head>
      <body
        className="
          min-h-screen
          bg-rad-bg
          text-rad-text-primary
          font-sans
          antialiased
          selection:bg-rad-cyan-700
          selection:text-rad-cyan-100
        "
      >
        {children}

        {/*
          Global toast notifications.
          Position: top-right keeps it away from DICOM viewer controls.
          Dark styling matches the radiology theme.
        */}
        <Toaster
          position="top-right"
          gutter={8}
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1c1c28',
              color: '#f1f5f9',
              border: '1px solid #2a2a3a',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              maxWidth: '400px',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10b981',
                secondary: '#064e3b',
              },
              style: {
                background: '#1c1c28',
                color: '#f1f5f9',
                border: '1px solid #064e3b',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#450a0a',
              },
              style: {
                background: '#1c1c28',
                color: '#f1f5f9',
                border: '1px solid #450a0a',
              },
            },
            loading: {
              iconTheme: {
                primary: '#06b6d4',
                secondary: '#083344',
              },
              style: {
                background: '#1c1c28',
                color: '#f1f5f9',
                border: '1px solid #083344',
              },
            },
          }}
        />
      </body>
    </html>
  );
}
