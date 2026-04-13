'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { format } from 'date-fns'

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

const parseDateKeyToLocalDate = (dateKey) => {
  const [year, month, day] = String(dateKey).split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

const frequencyLabel = (freq) => {
  const map = {
    'every_day': 'Every day',
    'twice_daily': 'Twice daily',
    'three_times': 'Three times daily',
    'weekly': 'Weekly',
    'as_needed': 'As needed'
  }
  return map[freq] || freq
}

const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

const sameMedication = (left, right) => String(left) === String(right)

const getCurrentWeekDateKeys = () => {
  const now = new Date()
  const sundayOffset = now.getDay()
  const sunday = new Date(now)
  sunday.setHours(0, 0, 0, 0)
  sunday.setDate(now.getDate() - sundayOffset)

  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(sunday)
    day.setDate(sunday.getDate() + i)
    return format(day, 'yyyy-MM-dd')
  })
}

export default function MedicationsPage() {
  const router = useRouter()
  const [medications, setMedications] = useState([])
  const [weeklyLogs, setWeeklyLogs] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [actionError, setActionError] = useState('')
  const [loggingMedicationId, setLoggingMedicationId] = useState(null)
  const [notification, setNotification] = useState(null)
  const today = format(new Date(), 'yyyy-MM-dd')

  const fetchData = useCallback(async () => {
    try {
      const [medsRes, logsRes] = await Promise.all([
        api.get('/medications'),
        api.get('/medications/logs/weekly')
      ])
      setMedications(medsRes.data)
      setWeeklyLogs(logsRes.data)
    } catch (err) {
      console.error('fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // check for upcoming doses (5 min reminder)
  useEffect(() => {
    if (medications.length === 0) return

    const checkReminders = () => {
      const now = new Date()
      const currentMinutes = now.getHours() * 60 + now.getMinutes()

      for (const med of medications) {
        const todayLog = getTodayLog(med.id)
        if (todayLog?.status === 'taken') continue

        const [hours, minutes] = med.time_to_take.split(':').map(Number)
        const medMinutes = hours * 60 + minutes
        const diff = medMinutes - currentMinutes

        if (diff > 0 && diff <= 5) {
          setNotification(med)
          break
        }
      }
    }

    const autoMarkMissed = async () => {
      const now = new Date()
      const currentMinutes = now.getHours() * 60 + now.getMinutes()
      let anyUpdated = false

      for (const med of medications) {
        const todayLog = getTodayLog(med.id)
        if (todayLog) continue

        const [hours, minutes] = med.time_to_take.split(':').map(Number)
        const medMinutes = hours * 60 + minutes

        if (currentMinutes - medMinutes > 60) {
          try {
            await api.post(`/medications/${med.id}/log`, {
              status: 'missed',
              date: today
            })
            anyUpdated = true
          } catch (err) {
            console.error('auto-miss error:', err)
          }
        }
      }

      if (anyUpdated) {
        await fetchData()
      }
    }

    checkReminders()
    autoMarkMissed()
    const interval = setInterval(checkReminders, 60000)
    return () => clearInterval(interval)
  }, [medications, weeklyLogs, today, fetchData])

  const getTodayLog = (medId) => {
    return weeklyLogs.find(l => sameMedication(l.medication_id, medId) && toDateKey(l.date) === today)
  }

  const getWeekAdherence = (medId) => {
    const weekKeys = getCurrentWeekDateKeys()
    const weekSet = new Set(weekKeys)
    const byDate = new Map()

    for (const log of weeklyLogs) {
      if (!sameMedication(log.medication_id, medId)) continue
      const dateKey = toDateKey(log.date)
      if (!weekSet.has(dateKey)) continue
      byDate.set(dateKey, log.status)
    }

    return weekKeys.map(dateKey => byDate.get(dateKey) || null)
  }

  const handleLogDose = async (medId, status) => {
    setActionError('')
    setLoggingMedicationId(medId)
    try {
      const res = await api.post(`/medications/${medId}/log`, { status, date: today })
      const savedLog = res.data
      const normalizedLog = {
        ...savedLog,
        medication_id: savedLog.medication_id ?? medId,
        date: toDateKey(savedLog.date || today)
      }

      // Optimistic sync so the card updates immediately.
      setWeeklyLogs(prev => {
        const withoutToday = prev.filter(
          l => !(sameMedication(l.medication_id, medId) && toDateKey(l.date) === today)
        )
        return [normalizedLog, ...withoutToday]
      })

      // Keep server and UI eventually consistent even if optimistic state diverges.
      fetchData()

      if (notification?.id === medId) setNotification(null)
    } catch (err) {
      console.error('log dose error:', err)
      setActionError(err.response?.data?.message || 'Could not update this dose right now.')
    } finally {
      setLoggingMedicationId(null)
    }
  }

  const handleDelete = async (medId) => {
    if (!confirm('Delete this medication?')) return
    try {
      await api.delete(`/medications/${medId}`)
      await fetchData()
    } catch (err) {
      console.error('delete error:', err)
    }
  }

  const takenToday = medications.filter(m => getTodayLog(m.id)?.status === 'taken').length
  const weeklyAdherence = weeklyLogs.length > 0
    ? Math.round((weeklyLogs.filter(l => l.status === 'taken').length / weeklyLogs.length) * 100)
    : 0

  const filteredMeds = medications.filter(med => {
    if (filter === 'all') return true
    if (filter === 'due') return getTodayLog(med.id)?.status !== 'taken'
    if (filter === 'taken') return getTodayLog(med.id)?.status === 'taken'
    return true
  })

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-[#4A6FA5] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">My Medications</h1>
          <p className="text-sm text-gray-500 mt-0.5">Here's your schedule. You're doing a great job staying on track.</p>
        </div>
        <button
          onClick={() => router.push('/medications/add')}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#4A6FA5] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#3d5d8f] sm:w-auto"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Medication
        </button>
      </div>

      {/* stat cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Active medications',
            value: medications.length,
            sub: `${medications.filter(m => getTodayLog(m.id)?.status !== 'taken').length} due today`,
            icon: (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4A6FA5" strokeWidth="2">
                <path d="M10.5 20H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H20a2 2 0 0 1 2 2v3"/>
                <circle cx="17" cy="17" r="5"/><path d="M17 14v6M14 17h6"/>
              </svg>
            )
          },
          {
            label: 'Taken today',
            value: `${takenToday} / ${medications.length}`,
            sub: takenToday === medications.length ? 'All done! 🎉' : 'Morning routine',
            icon: (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6BBF8E" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            )
          },
          {
            label: 'Weekly adherence',
            value: `${weeklyAdherence}%`,
            sub: weeklyAdherence >= 80 ? '+great consistency!' : 'Keep it up!',
            icon: (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4A6FA5" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
            )
          },
          {
            label: 'Refills soon',
            value: '—',
            sub: 'No refills needed',
            icon: (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F4A261" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            )
          }
        ].map((card, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500">{card.label}</p>
              {card.icon}
            </div>
            <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* notification banner */}
      {actionError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {notification && (
        <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-orange-200 bg-orange-50 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3 sm:items-center">
            <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F4A261" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">Upcoming Dose</p>
              <p className="text-xs text-gray-500">
                It's almost time to take your <span className="font-semibold">{notification.name} ({notification.dosage})</span>. Scheduled for {notification.time_to_take.slice(0, 5)}.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleLogDose(notification.medication.id, 'taken')}
            disabled={loggingMedicationId === notification.medication.id}
            className="w-full whitespace-nowrap rounded-xl bg-[#4A6FA5] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#3d5d8f] disabled:opacity-60 sm:w-auto"
          >
            {loggingMedicationId === notification.medication.id ? 'Updating...' : 'Mark as Taken'}
          </button>
        </div>
      )}

      {/* medication list */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Medication list</h2>
          <p className="text-xs text-gray-400">Track each medication, today's status, and this week's consistency.</p>
        </div>
        <div className="flex w-full items-center gap-1 overflow-x-auto rounded-xl bg-gray-100 p-1 sm:w-auto">
          {['all', 'due', 'taken'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {f === 'due' ? 'Due today' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {filteredMeds.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
          <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
              <path d="M10.5 20H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H20a2 2 0 0 1 2 2v3"/>
              <circle cx="17" cy="17" r="5"/><path d="M17 14v6M14 17h6"/>
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700">No medications found</p>
          <p className="text-xs text-gray-400 mt-1">Add your first medication to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredMeds.map(med => {
            const todayLog = getTodayLog(med.id)
            const weekStatuses = getWeekAdherence(med.id)
            const isTaken = todayLog?.status === 'taken'
            const isMissed = todayLog?.status === 'missed'

            return (
              <div key={med.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4A6FA5" strokeWidth="2">
                        <path d="M10.5 20H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H20a2 2 0 0 1 2 2v3"/>
                        <circle cx="17" cy="17" r="5"/><path d="M17 14v6M14 17h6"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{med.name}</p>
                      <p className="text-xs text-gray-400">{med.dosage}</p>
                    </div>
                  </div>
                  <div className="relative group">
                    <button className="text-gray-400 hover:text-gray-600 p-1">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
                      </svg>
                    </button>
                    <div className="absolute right-0 top-7 bg-white border border-gray-100 rounded-xl shadow-lg py-1 w-32 hidden group-hover:block z-10">
                      <button
                        onClick={() => router.push(`/medications/edit/${med.id}`)}
                        className="w-full text-left px-3 py-2 text-xs text-gray-600 hover:bg-gray-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(med.id)}
                        className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 mb-4">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  <p className="text-xs text-gray-400">{frequencyLabel(med.frequency)} at {med.time_to_take.slice(0, 5)}</p>
                </div>

                {/* weekly adherence dots */}
                <div className="mb-4">
                  <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-2">This week's adherence</p>
                  <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                    {weekDays.map((day, i) => {
                      const status = weekStatuses[i]
                      return (
                        <div key={i} className="flex flex-col items-center gap-1">
                          <span className="text-[10px] text-gray-400">{day}</span>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            status === 'taken'
                              ? 'bg-[#6BBF8E] border-[#6BBF8E]'
                              : status === 'missed'
                              ? 'bg-red-100 border-red-300'
                              : 'border-gray-200 bg-white'
                          }`}>
                            {status === 'taken' && (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                            )}
                            {status === 'missed' && (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="3">
                                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                              </svg>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* actions */}
                <div className="flex flex-col gap-2 border-t border-gray-50 pt-3 sm:flex-row sm:items-center">
                <button
                    onClick={() => router.push(`/medications/${med.id}`)}
                  className="px-3 py-2 text-left text-xs font-medium text-gray-500 transition-colors hover:text-gray-700"
                >
                    Details
                </button>
                <div className="flex flex-1 flex-wrap items-center gap-2 sm:justify-end">
                    {isTaken ? (
                    <button className="flex items-center justify-center gap-1.5 bg-green-50 text-green-600 text-xs font-medium py-2 px-3 rounded-xl cursor-default">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        Taken Today
                    </button>
                    ) : isMissed ? (
                    <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-xs text-red-400 font-medium">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                        Missed
                        </span>
                        <button
                        onClick={() => handleLogDose(med.id, 'taken')}
                        disabled={loggingMedicationId === med.id}
                        className="flex items-center justify-center gap-1.5 bg-[#4A6FA5]/10 text-[#4A6FA5] text-xs font-medium py-2 px-3 rounded-xl hover:bg-[#4A6FA5] hover:text-white transition-colors disabled:opacity-60"
                        >
                        {loggingMedicationId === med.id ? 'Updating...' : 'Mark Taken'}
                        </button>
                    </div>
                    ) : (
                    <div className="flex items-center gap-2">
                        <button
                        onClick={() => handleLogDose(med.id, 'missed')}
                        disabled={loggingMedicationId === med.id}
                        className="flex items-center justify-center gap-1.5 bg-red-50 text-red-400 text-xs font-medium py-2 px-3 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-60"
                        >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                        Miss
                        </button>
                        <button
                        onClick={() => handleLogDose(med.id, 'taken')}
                        disabled={loggingMedicationId === med.id}
                        className="flex items-center justify-center gap-1.5 bg-[#4A6FA5]/10 text-[#4A6FA5] text-xs font-medium py-2 px-3 rounded-xl hover:bg-[#4A6FA5] hover:text-white transition-colors disabled:opacity-60"
                        >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        {loggingMedicationId === med.id ? 'Updating...' : 'Mark Taken'}
                        </button>
                    </div>
                    )}
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