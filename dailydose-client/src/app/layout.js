import { Geist } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/AuthContext'
import { NotificationProvider } from '@/lib/NotificationContext'

const geist = Geist({ subsets: ['latin'] })

export const metadata = {
  title: 'DailyDose',
  description: 'Your daily companion for chronic illness management',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={geist.className}>
        <AuthProvider>
          <NotificationProvider>
            {children}
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  )
}