import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Plateforme Échange d\'Avis',
  description: 'Échangez des avis Google avec d\'autres commerçants',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <Toaster position="top-right" toastOptions={{
          success: { style: { background: '#E1F5EE', color: '#085041', border: '1px solid #1D9E75' } },
          error: { style: { background: '#FCEBEB', color: '#A32D2D', border: '1px solid #E24B4A' } },
        }} />
        {children}
      </body>
    </html>
  )
}
