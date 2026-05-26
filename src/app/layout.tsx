import type { Metadata } from "next";
import { Geist_Mono, Source_Serif_4 } from "next/font/google";

import { ThemeProvider } from "@/components/theme-provider";

import "./globals.css";

const sourceSerif = Source_Serif_4({
  variable: "--font-serif",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "e10d CRM",
  description: "Personal CRM — contacts, calendar, dossiers",
};

const themeScript = `(function(){try{var k='e10d-theme';var s=localStorage.getItem(k);var d=s==='dark'||(s!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');else document.documentElement.classList.remove('dark');}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sourceSerif.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-dvh flex-col overflow-x-clip">
        <div aria-hidden="true" className="page-backdrop" />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          storageKey="e10d-theme"
          disableTransitionOnChange
        >
          <div className="app-layer flex min-h-dvh flex-1 flex-col">{children}</div>
        </ThemeProvider>
      </body>
    </html>
  );
}
