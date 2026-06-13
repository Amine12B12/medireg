import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "MediTrack",
  description: "Gestion de matériel médical",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css" />
        <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js" async />
      </head>
      <body style={{ background: '#F7F7F5', minHeight: '100vh' }}>
        {children}
      </body>
    </html>
  )
}