import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'StrangerLens — AI Website First-Impression Analyzer',
  description: "Get an AI-powered first-impression review of your homepage. Discover what's unclear, what may make visitors hesitate, and exactly what to improve.",
  openGraph: {
    title: 'StrangerLens — AI Website First-Impression Analyzer',
    description: "Get an AI-powered first-impression review of your homepage. Discover what's unclear, what may make visitors hesitate, and exactly what to improve.",
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'StrangerLens — AI Website First-Impression Analyzer',
    description: "Get an AI-powered first-impression review of your homepage. Discover what's unclear, what may make visitors hesitate, and exactly what to improve.",
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
