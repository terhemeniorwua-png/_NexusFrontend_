import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/providers/ThemeProvider';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

/**
 * Applies the stored theme before first paint so the interface never flashes
 * the wrong colour scheme. The value is controlled by ThemeProvider; this
 * script only reads it. It is static and contains no user input.
 */
const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem('nexus-theme');
    var theme =
      stored === 'light' || stored === 'dark' || stored === 'system'
        ? stored
        : 'system';
    document.documentElement.setAttribute('data-theme', theme);
  } catch (error) {
    document.documentElement.setAttribute('data-theme', 'system');
  }
})();
`;

export const metadata: Metadata = {
  title: {
    default: 'Nexus',
    template: '%s | Nexus',
  },
  description:
    'Nexus — One connected workspace for projects, people, and progress.',
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F8F9FC' },
    { media: '(prefers-color-scheme: dark)', color: '#0F1117' },
  ],
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
