import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Moltboard',
  description: 'Task management powered by Moltbot 🔥',
  icons: {
    icon: '/favicon.ico',
    apple: '/logo.png',
  },
};

/**
 * Root layout - minimal wrapper
 * Route groups handle their own providers/shells:
 * - (auth) - signin/error pages, no sidebar
 * - (app) - main app with sidebar
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
