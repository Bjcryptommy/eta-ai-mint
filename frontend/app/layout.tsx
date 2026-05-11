import './globals.css';
import { Providers } from '@/components/Providers';
import { Anton, Inter, Space_Mono } from 'next/font/google';

const body = Inter({ subsets: ['latin'], variable: '--font-body' });
const display = Anton({ subsets: ['latin'], weight: '400', variable: '--font-display' });
const mono = Space_Mono({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-mono-ui' });

export const metadata = {
  title: 'CATSHIT — ChatGPT-native meme mint',
  description: 'CATSHIT is a ChatGPT-native meme token mint site with EIP-7702 delegation, MCP tooling, proof pages, and revoke flow.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable} ${mono.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
