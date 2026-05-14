
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import Header from '@/components/header';
import { FirebaseClientProvider } from '@/firebase';

export const metadata: Metadata = {
  metadataBase: new URL('https://exo-predict.vercel.app'),
  title: 'ExoPredict - AI Powered Exoplanet Detection Using NASA Datasets',
  description:
    'ExoPredict uses machine learning and NASA Kepler, K2, and TESS mission datasets for automated exoplanet detection, astronomical classification, and AI-driven data analysis.',
  keywords: [
    'ExoPredict',
    'Exoplanet Detection',
    'NASA Kepler',
    'NASA TESS',
    'K2 Mission',
    'Machine Learning',
    'AI Astronomy',
    'Astronomical Data Analysis',
    'Deep Learning',
    'Space Research',
  ],
  openGraph: {
    title: 'ExoPredict',
    description:
      'AI-powered exoplanet detection using NASA mission datasets and machine learning.',
    url: 'https://exo-predict.vercel.app',
    siteName: 'ExoPredict',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-space-gradient min-h-screen selection:bg-primary/30 selection:text-primary">
        <FirebaseClientProvider>
            <div className="container mx-auto p-4 sm:p-6 lg:p-8 flex flex-col min-h-screen">
              <Header />
              <main className="flex-grow flex flex-col">
                {children}
              </main>
            </div>
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
