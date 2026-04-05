'use client'
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'
import api from './api'
import { format, differenceInMinutes, differenceInHours, parseISO } from 'date-fns'

const NotificationContext = createContext(null)

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const today = format(new Date(), 'yyyy-MM-dd')

  const buildNotifications = useCallback(async () => {
    if (!user) return
    try {
      const [medsRes, logsRes] = await Promise.all([
        api.get('/medications'),
        api.get('/medications/logs/weekly')
      ])

      const medications = medsRes.data
      const logs = logsRes.data
      const now = new Date()
      const currentMinutes = now.getHours() * 60 + now.getMinutes()
      const newNotifications = []

      for (const med of medications) {
        const todayLog = logs.find(
          l => l.medication_id === med.id && l.date?.startsWith(today)
        )
        if (todayLog?.status === 'taken') continue

        const [hours, minutes] = med.time_to_take.split(':').map(Number)
        const medMinutes = hours * 60 + minutes
        const diff = medMinutes - currentMinutes

        // upcoming — due within the next 60 minutes
        if (diff > 0 && diff <= 60) {
          newNotifications.push({
            id: `upcoming-${med.id}`,
            type: 'upcoming',
            title: 'Upcoming dose',
            message: `${med.name} (${med.dosage}) is due in ${diff} minute${diff === 1 ? '' : 's'}`,
            medication: med,
            time: now,
            read: false
          })
        }

        // missed — more than 60 minutes past scheduled time
        if (currentMinutes - medMinutes > 60 && !todayLog) {
          newNotifications.push({
            id: `missed-${med.id}`,
            type: 'missed',
            title: 'Missed dose',
            message: `You missed your ${med.name} (${med.dosage}) scheduled at ${med.time_to_take.slice(0, 5)}`,
            medication: med,
            time: now,
            read: false
          })
        }
      }

      // upcoming appointments in the next 48 hours
      try {
        const apptRes = await api.get('/appointments')
        const appointments = apptRes.data

        for (const appt of appointments) {
          if (appt.completed) continue
          const apptDate = parseISO(appt.appointment_date)
          const hoursUntil = differenceInHours(apptDate, now)

          if (hoursUntil >= 0 && hoursUntil <= 48) {
            newNotifications.push({
              id: `appt-${appt.id}`,
              type: 'appointment',
              title: 'Upcoming appointment',
              message: `${appt.title} ${hoursUntil === 0 ? 'is happening now' : `in ${hoursUntil} hour${hoursUntil === 1 ? '' : 's'}`}`,
              appointment: appt,
              time: apptDate,
              read: false
            })
          }
        }
      } catch (err) {
        // appointments might not exist yet, that's fine
      }

      setNotifications(newNotifications)
      setUnreadCount(newNotifications.length)
    } catch (err) {
      console.error('notification build error:', err)
    }
  }, [user, today])

  useEffect(() => {
    if (!user) return
    buildNotifications()
    const interval = setInterval(buildNotifications, 60000)
    return () => clearInterval(interval)
  }, [user, buildNotifications])

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  const markRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const dismissNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      markAllRead,
      markRead,
      dismissNotification,
      buildNotifications
    }}>
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => useContext(NotificationContext)