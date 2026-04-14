'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useNotifications } from '@/lib/NotificationContext'
import api from '@/lib/api'
import { format } from 'date-fns'

const typeStyles = {
  upcoming: {
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F4A261" strokeWidth="2">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
    ),
    bg: 'bg-orange-50',
    dot: 'bg-orange-400'
  },
  missed: {
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    ),
    bg: 'bg-red-50',
    dot: 'bg-red-400'
  },
  appointment: {
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4A6FA5" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
    bg: 'bg-blue-50',
    dot: 'bg-blue-400'
  }
}

export default function Header() {
  const router = useRouter()
  const { notifications, unreadCount, markAllRead, dismissNotification, buildNotifications } = useNotifications()
  const [open, setOpen] = useState(false)
  const [marking, setMarking] = useState(null)
  const popoverRef = useRef(null)
  const bellRef = useRef(null)
  const today = format(new Date(), 'yyyy-MM-dd')
  const latest5 = notifications.slice(0, 5)

  // close popover on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target) &&
        !bellRef.current.contains(e.target)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

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

  const handleOpen = () => {
    setOpen(prev => !prev)
    if (!open) markAllRead()
  }

  return (
    <header className="h-12 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-20">
      <div className="ml-auto flex items-center gap-3">
        {/* bell button */}
        <div className="relative">
          <button
            ref={bellRef}
            onClick={handleOpen}
            className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* popover */}
          {open && (
            <div
              ref={popoverRef}
              className="absolute right-0 top-11 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden"
            >
              {/* popover header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                {notifications.length > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-[#4A6FA5] hover:underline cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {/* notification list */}
              {latest5.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="w-10 h-10 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-2">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500 font-medium">You're all caught up!</p>
                  <p className="text-xs text-gray-400 mt-0.5">No new notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {latest5.map(notification => {
                    const style = typeStyles[notification.type]
                    return (
                      <div
                        key={notification.id}
                        className={`px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors ${!notification.read ? 'bg-blue-50/30' : ''}`}
                      >
                        <div className={`w-8 h-8 ${style.bg} rounded-xl flex items-center justify-center shrink-0 mt-0.5`}>
                          {style.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${style.dot} shrink-0`} />
                            <p className="text-xs font-semibold text-gray-900">{notification.title}</p>
                          </div>
                          <p className="text-xs text-gray-500 leading-relaxed">{notification.message}</p>
                          {notification.type === 'upcoming' && (
                            <button
                              onClick={() => handleMarkTaken(notification)}
                              disabled={marking === notification.id}
                              className="mt-1.5 text-xs font-medium text-[#4A6FA5] hover:underline cursor-pointer disabled:opacity-60"
                            >
                              {marking === notification.id ? 'Marking...' : 'Mark as taken'}
                            </button>
                          )}
                          {notification.type === 'missed' && (
                            <button
                              onClick={() => handleMarkTaken(notification)}
                              disabled={marking === notification.id}
                              className="mt-1.5 text-xs font-medium text-red-500 hover:underline disabled:opacity-60"
                            >
                              {marking === notification.id ? 'Marking...' : 'Mark as taken anyway'}
                            </button>
                          )}
                          {notification.type === 'appointment' && (
                            <button
                              onClick={() => {
                                router.push('/appointments')
                                setOpen(false)
                              }}
                              className="mt-1.5 text-xs font-medium text-[#4A6FA5] hover:underline cursor-pointer"
                            >
                              View appointment
                            </button>
                          )}
                        </div>
                        <button
                          onClick={() => dismissNotification(notification.id)}
                          className="text-gray-300 hover:text-gray-500 transition-colors shrink-0"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* footer */}
              {notifications.length > 0 && (
                <div className="px-4 py-3 border-t border-gray-100 text-center">
                  <button
                    onClick={() => {
                      router.push('/notifications')
                      setOpen(false)
                    }}
                    className="text-xs font-medium text-[#4A6FA5] hover:underline cursor-pointer"
                  >
                    View all notifications →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}