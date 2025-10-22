import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@fontsource/inter/300.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/700.css";
import { ApolloProvider } from "@/lib/apollo-client";
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Upfirst - E-Commerce Platform",
  description: "Modern D2C e-commerce platform for creators and brands",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.variable}>
        <ApolloProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </ApolloProvider>
      </body>
    </html>
  );
}
