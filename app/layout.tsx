import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'ValueCheck — What does your website say to a stranger?',
  description: 'First-impression website check. See what a new visitor understands, what’s unclear, and what to fix first.',
  openGraph: {
    title: 'ValueCheck — What does your website say to a stranger?',
    description: 'First-impression website check. See what a new visitor understands, what’s unclear, and what to fix first.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ValueCheck — What does your website say to a stranger?',
    description: 'First-impression website check. See what a new visitor understands, what’s unclear, and what to fix first.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
