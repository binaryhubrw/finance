import { Instrument_Sans, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const instrument = Instrument_Sans({
  subsets: ['latin'],
  // 700 is loaded because the headings ask for it — without it the browser
  // synthesises a fake bold from 600.
  weight: ['400', '500', '600', '700'],
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
  title: 'UR Binary Hub · Finance',
  description: 'The hub’s money, accounted for — cash in, cash out, and who approved it.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${instrument.variable} ${plexMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
