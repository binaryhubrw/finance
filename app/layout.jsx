import { Instrument_Sans, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const instrument = Instrument_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-instrument',
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
});

export const metadata = {
  title: 'Hub Ledger',
  description: 'Cash in, cash out, and who approved it.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${instrument.variable} ${plexMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
