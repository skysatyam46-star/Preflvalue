import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Percept — Website intelligence for builders',
  description: 'Understand what your website communicates, where visitors may lose trust, and what you should improve first.',
  openGraph: {
    title: 'Percept — Website intelligence for builders',
    description: 'Understand what your website communicates, where visitors may lose trust, and what you should improve first.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Percept — Website intelligence for builders',
    description: 'Understand what your website communicates, where visitors may lose trust, and what you should improve first.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
