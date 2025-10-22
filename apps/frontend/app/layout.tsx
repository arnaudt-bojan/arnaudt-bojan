import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.scss';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';
import { ApolloProvider } from '../lib/apollo-client';
import { ThemeProvider } from '../lib/theme-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Upfirst - D2C E-Commerce Platform',
  description: 'Multi-seller e-commerce platform for creators and brands',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AppRouterCacheProvider>
          <ApolloProvider>
            <ThemeProvider>
              {children}
            </ThemeProvider>
          </ApolloProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
