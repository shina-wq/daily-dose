'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { useAuth } from '@/lib/AuthContext'
import { format, parseISO, isFuture, isToday } from 'date-fns'

const toDateKey = (value) => {
  if (!value) return ''
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return ''
    return format(parsed, 'yyyy-MM-dd')
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return format(parsed, 'yyyy-MM-dd')
}

const MOOD_LABELS = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Great' }
const ENERGY_LABELS = { 1: 'Very Low', 2: 'Low', 3: 'Moderate', 4: 'High', 5: 'Very High' }

const getGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function DashboardPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [medications, setMedications] = useState([])
  const [weeklyLogs, setWeeklyLogs] = useState([])
  const [appointments, setAppointments] = useState([])
  const [todayHealthLog, setTodayHealthLog] = useState(null)
  const [loading, setLoading] = useState(true)
  const today = format(new Date(), 'yyyy-MM-dd')

  const fetchAll = useCallback(async () => {
    try {
      const [medsRes, logsRes, apptsRes, healthRes] = await Promise.all([
        api.get('/medications'),
        api.get('/medications/logs/weekly'),
        api.get('/appointments'),
        api.get('/health-logs/today')
      ])
      setMedications(medsRes.data)
      setWeeklyLogs(logsRes.data)
      setAppointments(apptsRes.data)
      setTodayHealthLog(healthRes.data)
    } catch (err) {
      console.error('dashboard fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const handleLogDose = async (medId, status) => {
    try {
      await api.post(`/medications/${medId}/log`, { status, date: today })
      await fetchAll()
    } catch (err) {
      console.error('log dose error:', err)
    }
  }

  // stats
  const getTodayLog = (medId) =>
    weeklyLogs.find(l => l.medication_id === medId && toDateKey(l.date) === today)

  const takenToday = medications.filter(m => getTodayLog(m.id)?.status === 'taken').length
  const weeklyAdherence = weeklyLogs.length > 0
    ? Math.round((weeklyLogs.filter(l => l.status === 'taken').length / weeklyLogs.length) * 100)
    : 0

  // streak — count consecutive days with all meds taken
  const calculateStreak = () => {
    if (weeklyLogs.length === 0) return 0
    const dates = [...new Set(weeklyLogs.map(l => l.date?.split('T')[0]))].sort().reverse()
    let streak = 0
    for (const date of dates) {
      const dayLogs = weeklyLogs.filter(l => l.date?.startsWith(date))
      const allTaken = dayLogs.every(l => l.status === 'taken')
      if (allTaken) streak++
      else break
    }
    return streak
  }

  const upcomingAppointments = appointments
    .filter(a => !a.completed && (isFuture(parseISO(a.appointment_date)) || isToday(parseISO(a.appointment_date))))
    .slice(0, 3)

  const getMedStatus = (med) => {
    const log = getTodayLog(med.id)
    if (log?.status === 'taken') return 'taken'
    if (log?.status === 'missed') return 'missed'
    const now = new Date()
    const [hours, minutes] = med.time_to_take.split(':').map(Number)
    const medTime = new Date()
    medTime.setHours(hours, minutes, 0)
    if (medTime > now) return 'upcoming'
    return 'pending'
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-[#4A6FA5] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const firstName = user?.name?.split(' ')[0] || 'there'
  const streak = calculateStreak()

  return (
    <div className="p-8">
      {/* header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">
            {getGreeting()}, {firstName}.
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Here is your daily health overview for {format(new Date(), 'EEEE, MMMM do')}.
          </p>
        </div>
        <button
          onClick={() => router.push('/assistant')}
          className="flex items-center gap-2 bg-[#4A6FA5] hover:bg-[#3d5d8f] text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z"/>
            <path d="M18.5 14.5l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9.9-2.4z"/>
            <path d="M6 14l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6L6 14z"/>
          </svg>
          Ask AI Assistant
        </button>
      </div>

      {/* stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {/* weekly adherence */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-400 font-medium">Weekly Adherence</p>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4A6FA5" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          </div>
          <p className="text-4xl font-bold text-gray-900 mb-1">{weeklyAdherence}%</p>
          <p className={`text-xs font-medium flex items-center gap-1 ${
            weeklyAdherence >= 80 ? 'text-green-500' : 'text-orange-400'
          }`}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {weeklyAdherence >= 80
                ? <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                : <polyline points="1 6 10.5 15.5 15.5 10.5 23 18"/>
              }
            </svg>
            {weeklyAdherence >= 80 ? 'Great consistency!' : 'Keep it up!'}
          </p>
        </div>

        {/* today's progress */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-400 font-medium">Today's Progress</p>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6BBF8E" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <p className="text-4xl font-bold text-gray-900 mb-1">
            {takenToday} <span className="text-2xl text-gray-300">/</span> {medications.length}
          </p>
          <p className="text-xs text-gray-400">
            {takenToday === medications.length && medications.length > 0
              ? '🎉 All doses taken today!'
              : 'Doses taken today'}
          </p>
        </div>

        {/* current streak */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-400 font-medium">Current Streak</p>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F4A261" strokeWidth="2">
              <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
            </svg>
          </div>
          <p className="text-4xl font-bold text-gray-900 mb-1">
            {streak} <span className="text-lg font-normal text-gray-400">days</span>
          </p>
          <p className="text-xs text-gray-400">
            {streak > 0 ? 'Keep up the great work!' : 'Start your streak today!'}
          </p>
        </div>
      </div>

      {/* main content */}
      <div className="grid grid-cols-5 gap-6">
        {/* today's medications — 3 cols */}
        <div className="col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Today's Medications</h2>
            <button
              onClick={() => router.push('/medications/add')}
              className="text-xs font-medium text-[#4A6FA5] border border-[#4A6FA5]/30 px-3 py-1.5 rounded-lg hover:bg-[#4A6FA5]/5 transition-colors"
            >
              + Add New
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {medications.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-sm text-gray-500">No medications yet.</p>
                <button
                  onClick={() => router.push('/medications/add')}
                  className="mt-2 text-xs text-[#4A6FA5] hover:underline"
                >
                  Add your first medication →
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {medications.map(med => {
                  const status = getMedStatus(med)
                  return (
                    <div key={med.id} className="flex items-center gap-4 px-5 py-4">
                      {/* time */}
                      <p className="text-xs font-medium text-gray-400 w-16 shrink-0">
                        {med.time_to_take.slice(0, 5)}
                      </p>

                      {/* icon */}
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        status === 'taken' ? 'bg-green-50' : 'bg-blue-50'
                      }`}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={status === 'taken' ? '#6BBF8E' : '#4A6FA5'} strokeWidth="2">
                          <path d="M10.5 20H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H20a2 2 0 0 1 2 2v3"/>
                          <circle cx="17" cy="17" r="5"/><path d="M17 14v6M14 17h6"/>
                        </svg>
                      </div>

                      {/* name */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{med.name}</p>
                        <p className="text-xs text-gray-400">{med.dosage} • {med.notes || 'No instructions'}</p>
                      </div>

                      {/* status badge / action */}
                      {status === 'taken' ? (
                        <span className="text-xs font-medium bg-green-50 text-green-600 px-3 py-1.5 rounded-xl">
                          ✓ Taken
                        </span>
                      ) : status === 'missed' ? (
                        <span className="text-xs font-medium bg-red-50 text-red-500 px-3 py-1.5 rounded-xl">
                          Missed
                        </span>
                      ) : status === 'upcoming' ? (
                        <span className="text-xs font-medium bg-gray-50 text-gray-400 px-3 py-1.5 rounded-xl">
                          Upcoming
                        </span>
                      ) : (
                        <button
                          onClick={() => handleLogDose(med.id, 'taken')}
                          className="text-xs font-medium bg-[#4A6FA5]/10 text-[#4A6FA5] px-3 py-1.5 rounded-lg hover:bg-[#4A6FA5] hover:text-white transition-colors"
                        >
                          Mark Taken
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* right column — 2 cols */}
        <div className="col-span-2 space-y-6">
          {/* upcoming visits */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">Upcoming Visits</h2>
              <button
                onClick={() => router.push('/appointments')}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {upcomingAppointments.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-sm text-gray-500">No upcoming appointments.</p>
                  <button
                    onClick={() => router.push('/appointments/add')}
                    className="mt-1 text-xs text-[#4A6FA5] hover:underline"
                  >
                    Schedule one →
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {upcomingAppointments.map(appt => {
                    const apptDate = parseISO(appt.appointment_date)
                    return (
                      <div key={appt.id} className="flex items-center gap-3 px-4 py-3">
                        {/* date block */}
                        <div className="w-10 text-center shrink-0">
                          <p className="text-[10px] font-semibold text-[#4A6FA5] uppercase">
                            {format(apptDate, 'MMM')}
                          </p>
                          <p className="text-lg font-bold text-gray-900 leading-none">
                            {format(apptDate, 'd')}
                          </p>
                        </div>
                        {/* info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {appt.doctor_name || appt.title}
                          </p>
                          <p className="text-xs text-gray-400">
                            {appt.title} • {format(apptDate, 'h:mm a')}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* recent health log */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">Recent Health Log</h2>
              <button
                onClick={() => router.push('/health-log')}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              {!todayHealthLog ? (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500 mb-2">No log for today yet.</p>
                  <button
                    onClick={() => router.push('/health-log')}
                    className="text-xs text-[#4A6FA5] hover:underline"
                  >
                    Log how you're feeling →
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Overall Mood</span>
                    <span className="text-xs font-medium text-gray-700">
                      {MOOD_LABELS[todayHealthLog.mood] || 'Good'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Energy Level</span>
                    <span className="text-xs font-medium text-gray-700">
                      {ENERGY_LABELS[todayHealthLog.energy_level] || 'Moderate'}
                    </span>
                  </div>
                  {todayHealthLog.symptoms && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Symptoms</span>
                      <span className="text-xs font-medium text-gray-700 text-right max-w-32 truncate">
                        {todayHealthLog.symptoms}
                      </span>
                    </div>
                  )}
                  {todayHealthLog.notes && (
                    <div className="pt-2 border-t border-gray-50">
                      <p className="text-xs text-gray-400 mb-1">Notes</p>
                      <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">
                        {todayHealthLog.notes}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}