'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useNotifications } from '@/lib/NotificationContext'
import { useAuth } from '@/lib/AuthContext'
import api from '@/lib/api'
import { format } from 'date-fns'

const typeStyles = {
  upcoming: {
    label: 'Upcoming dose',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F4A261" strokeWidth="2">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
    ),
    bg: 'bg-orange-50',
    badge: 'bg-orange-100 text-orange-600'
  },
  missed: {
    label: 'Missed dose',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    ),
    bg: 'bg-red-50',
    badge: 'bg-red-100 text-red-600'
  },
  appointment: {
    label: 'Appointment',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4A6FA5" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
    bg: 'bg-blue-50',
    badge: 'bg-blue-100 text-blue-600'
  }
}

export default function NotificationsPage() {
  const router = useRouter()
  const { notifications, dismissNotification, markAllRead, buildNotifications } = useNotifications()
  const [filter, setFilter] = useState('all')
  const [marking, setMarking] = useState(null)
  const today = format(new Date(), 'yyyy-MM-dd')

  const filtered = notifications.filter(n => filter === 'all' || n.type === filter)

  const handleMarkTaken = async (notification) => {
    setMarking(notification.id)
    try {
      await api.post(`/medications/${notification.medication.id}/log`, {
        status: 'taken',
        date: today
      })
      dismissNotification(notification.id)
      await buildNotifications()
    } catch (err) {
      console.error('mark taken error:', err)
    } finally {
      setMarking(null)
    }
  }

  return (
    <div className="p-8">
      {/* header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {notifications.length === 0
              ? "You're all caught up!"
              : `You have ${notifications.length} notification${notifications.length === 1 ? '' : 's'}`}
          </p>
        </div>
        {notifications.length > 0 && (
          <button
            onClick={markAllRead}
            className="text-sm text-[#4A6FA5] hover:underline font-medium"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* filter tabs */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-6">
        {[
          { key: 'all', label: 'All' },
          { key: 'upcoming', label: 'Upcoming' },
          { key: 'missed', label: 'Missed' },
          { key: 'appointment', label: 'Appointments' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* notifications list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
          <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700">No notifications here</p>
          <p className="text-xs text-gray-400 mt-1">Check back later or switch filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(notification => {
            const style = typeStyles[notification.type]
            return (
              <div
                key={notification.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-start gap-4"
              >
                <div className={`w-10 h-10 ${style.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  {style.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.badge}`}>
                      {style.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{notification.message}</p>
                  <div className="flex items-center gap-3 mt-2">
                    {(notification.type === 'upcoming' || notification.type === 'missed') && (
                      <button
                        onClick={() => handleMarkTaken(notification)}
                        disabled={marking === notification.id}
                        className="text-xs font-medium bg-[#4A6FA5] text-white px-3 py-1.5 rounded-lg hover:bg-[#3d5d8f] transition-colors disabled:opacity-60"
                      >
                        {marking === notification.id ? 'Marking...' : 'Mark as taken'}
                      </button>
                    )}
                    {notification.type === 'appointment' && (
                      <button
                        onClick={() => router.push('/appointments')}
                        className="text-xs font-medium bg-[#4A6FA5] text-white px-3 py-1.5 rounded-lg hover:bg-[#3d5d8f] transition-colors"
                      >
                        View appointment
                      </button>
                    )}
                    <button
                      onClick={() => dismissNotification(notification.id)}
                      className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}