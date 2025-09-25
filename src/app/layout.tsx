import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pulse AI - Avanza Solutions Assistant',
  description: 'AI-powered assistant for Avanza Solutions - HR, Infrastructure Services, and Revenue Analysis. Supports English and Roman Urdu.',
  keywords: ['Avanza Solutions', 'HR AI', 'Infrastructure Services', 'Revenue Analysis', 'Excel AI', 'bilingual AI', 'Roman Urdu'],
  authors: [{ name: 'Avanza Solutions' }],
  icons: {
    icon: '/avanza-favicon.ico',
    shortcut: '/avanza-favicon.ico',
    apple: '/avanza-favicon.ico',
  },
  openGraph: {
    title: 'Pulse AI - Avanza Solutions Assistant',
    description: 'AI-powered assistant for HR, Infrastructure Services, and Revenue Analysis',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pulse AI - Avanza Solutions Assistant',
    description: 'AI-powered assistant for HR, Infrastructure Services, and Revenue Analysis',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/avanza-favicon.ico" sizes="16x16" />
        <link rel="icon" href="/avanza-favicon.ico" sizes="32x32" />
        <link rel="shortcut icon" href="/avanza-favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#db2777" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}