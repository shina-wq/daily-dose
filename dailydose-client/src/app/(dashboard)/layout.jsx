'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'

export default function DashboardLayout({ children }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F6FA]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#4A6FA5] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading your health data...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-[#F5F6FA] flex">
      <Sidebar />
      <div className="flex-1 ml-[250px] flex flex-col min-h-screen">
        <Header />
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}