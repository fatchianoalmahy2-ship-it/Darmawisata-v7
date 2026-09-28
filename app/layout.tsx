import type {Metadata} from 'next';
import './globals.css'; // Global styles
import { AutoUpdateHandler } from '@/components/common/AutoUpdateHandler';
import { AppErrorBoundary } from '@/components/common/AppErrorBoundary';

export const metadata: Metadata = {
  title: 'Darmawisata',
  description: 'Darmawisata',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="id">
      <body suppressHydrationWarning>
        <AutoUpdateHandler />
        <AppErrorBoundary>
          {children}
        </AppErrorBoundary>
      </body>
    </html>
  );
}

