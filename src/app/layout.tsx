import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pulse AI',
  description: 'AI-powered assistant for Avanza Solutions',
  icons: {
    icon: '/avanza-favicon.ico',
    shortcut: '/avanza-favicon.ico',
    apple: '/avanza-favicon.ico',
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
      </head>
      <body>{children}</body>
    </html>
  )
}