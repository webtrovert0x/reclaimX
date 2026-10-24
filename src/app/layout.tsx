import type { Metadata } from 'next';
import './globals.css';
import { Web3Provider } from '@/context/Web3Provider';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'ReclaimX — Smart Contract Discovery & Recovery on BOT Chain',
  description:
    'Find your contracts. Discover your funds. Reclaim what’s recoverable. Non-custodial smart contract recovery on BOT Chain.',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Read private server-side REOWN_PROJECT_ID
  const projectId = process.env.REOWN_PROJECT_ID || 'd9690df1851903b53a4f8c440127edec';

  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-white text-slate-900">
        <Web3Provider projectId={projectId}>
          <Navbar />
          <main className="flex-1 flex flex-col">{children}</main>
          <Footer />
        </Web3Provider>
      </body>
    </html>
  );
}
