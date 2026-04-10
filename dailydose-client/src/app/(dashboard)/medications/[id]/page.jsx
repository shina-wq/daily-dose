'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { format, isValid } from 'date-fns'
import api from '@/lib/api'

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

const dateKeyToLocalDate = (dateKey) => {
  const [year, month, day] = String(dateKey).split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

const frequencyLabel = (freq) => {
  const map = {
    every_day: 'Every day',
    twice_daily: 'Twice daily',
    three_times: 'Three times daily',
    weekly: 'Weekly',
    as_needed: 'As needed'
  }
  return map[freq] || freq || 'Unknown'
}

const statusStyles = {
  taken: {
    label: 'Taken',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    dot: 'bg-emerald-500'
  },
  missed: {
    label: 'Missed',
    className: 'bg-red-50 text-red-600 border-red-100',
    dot: 'bg-red-500'
  },
  pending: {
    label: 'Pending',
    className: 'bg-gray-50 text-gray-600 border-gray-100',
    dot: 'bg-gray-400'
  }
}

export default function MedicationDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const [medication, setMedication] = useState(null)
  const [weeklyLogs, setWeeklyLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const medicationId = Array.isArray(params?.id) ? params.id[0] : params?.id
  const hasValidMedicationId = /^\d+$/.test(String(medicationId || ''))

  useEffect(() => {
    if (!hasValidMedicationId) {
      setError('Invalid medication id.')
      setLoading(false)
      return
    }

    const loadMedication = async () => {
      try {
        const [medRes, logsRes] = await Promise.all([
          api.get(`/medications/${medicationId}`),
          api.get('/medications/logs/weekly')
        ])
        setMedication(medRes.data)
        setWeeklyLogs(logsRes.data.filter(log => String(log.medication_id) === String(medicationId)))
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load this medication.')
      } finally {
        setLoading(false)
      }
    }

    loadMedication()
  }, [medicationId, hasValidMedicationId])

  const today = format(new Date(), 'yyyy-MM-dd')
  const todayLog = weeklyLogs.find(log => toDateKey(log.date) === today)

  const activity = useMemo(() => {
    return [...weeklyLogs]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5)
  }, [weeklyLogs])

  const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const weekSummary = useMemo(() => {
    const result = Array.from({ length: 7 }, (_, index) => ({
      label: weekDays[index],
      log: null
    }))

    const byDate = new Map(
      weeklyLogs
        .map(log => {
          const dateKey = toDateKey(log.date)
          const parsed = dateKeyToLocalDate(dateKey)
          return parsed && isValid(parsed) ? [parsed.getDay(), log] : null
        })
        .filter(Boolean)
    )

    for (const [dayIndex, log] of byDate.entries()) {
      const mondayIndex = dayIndex === 0 ? 6 : dayIndex - 1
      result[mondayIndex] = {
        label: weekDays[mondayIndex],
        log
      }
    }

    return result
  }, [weeklyLogs])

  const handleDelete = async () => {
    if (!confirm('Delete this medication? This will also remove its logs.')) return
    setDeleting(true)
    try {
      await api.delete(`/medications/${medicationId}`)
      router.push('/medications')
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to delete this medication.')
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[calc(100vh-56px)]">
        <div className="w-6 h-6 border-2 border-[#4A6FA5] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error && !medication) {
    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto bg-white border border-red-100 rounded-2xl p-6 shadow-sm">
          <p className="text-sm font-semibold text-gray-900 mb-1">Medication unavailable</p>
          <p className="text-sm text-gray-500">{error}</p>
          <button
            onClick={() => router.push('/medications')}
            className="mt-4 px-4 py-2.5 rounded-xl bg-[#4A6FA5] text-white text-sm font-medium"
          >
            Back to medications
          </button>
        </div>
      </div>
    )
  }

  const status = todayLog?.status || 'pending'
  const statusMeta = statusStyles[status]

  return (
    <div className="p-8">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <button
            onClick={() => router.push('/medications')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-3"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back to medications
          </button>
          <h1 className="text-2xl font-semibold text-gray-900">{medication.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{medication.dosage} - {frequencyLabel(medication.frequency)} - {medication.time_to_take?.slice(0, 5)}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`/medications/edit/${medication.id}`)}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Edit details
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-60"
          >
            {deleting ? 'Deleting...' : 'Delete medication'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[1.6fr_1fr] gap-6 items-start">
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-start justify-between gap-4 mb-5 pb-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-blue-50 rounded-2xl flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4A6FA5" strokeWidth="2">
                    <path d="M10.5 20H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H20a2 2 0 0 1 2 2v3" />
                    <circle cx="17" cy="17" r="5" /><path d="M17 14v6M14 17h6" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Medication details</p>
                  <h2 className="text-lg font-semibold text-gray-900">Schedule & instructions</h2>
                  <p className="text-xs text-gray-400 mt-0.5">The fields here match what the backend stores and what the list page displays.</p>
                </div>
              </div>
              <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${statusMeta.className}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                {statusMeta.label}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="rounded-xl border border-gray-100 p-4">
                <p className="text-xs text-gray-400 mb-1">Dosage</p>
                <p className="text-sm font-medium text-gray-900">{medication.dosage}</p>
              </div>
              <div className="rounded-xl border border-gray-100 p-4">
                <p className="text-xs text-gray-400 mb-1">Frequency</p>
                <p className="text-sm font-medium text-gray-900">{frequencyLabel(medication.frequency)}</p>
              </div>
              <div className="rounded-xl border border-gray-100 p-4">
                <p className="text-xs text-gray-400 mb-1">Time of day</p>
                <p className="text-sm font-medium text-gray-900">{medication.time_to_take?.slice(0, 5)}</p>
              </div>
              <div className="rounded-xl border border-gray-100 p-4">
                <p className="text-xs text-gray-400 mb-1">Today</p>
                <p className="text-sm font-medium text-gray-900">
                  {status === 'taken' ? 'Dose logged as taken' : status === 'missed' ? 'Dose marked missed' : 'Awaiting log'}
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-gray-50 border border-gray-100 p-5">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Instructions</p>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {medication.notes || 'No instructions were added for this medication.'}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Adherence trend</h3>
                <p className="text-xs text-gray-400">The last 7 days for this medication.</p>
              </div>
            </div>

            <div className="flex items-end gap-2">
              {weekSummary.map((entry, index) => (
                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-[10px] text-gray-400">{entry.label}</span>
                  <div
                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${
                      entry.log?.status === 'taken'
                        ? 'bg-emerald-100 border-emerald-200'
                        : entry.log?.status === 'missed'
                          ? 'bg-red-50 border-red-200'
                          : 'bg-white border-gray-200'
                    }`}
                  >
                    {entry.log?.status === 'taken' ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : entry.log?.status === 'missed' ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="3">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Recent activity</h3>
                <p className="text-xs text-gray-400">Your latest logs for this medication.</p>
              </div>
            </div>

            {activity.length === 0 ? (
              <p className="text-sm text-gray-500">No dose logs yet.</p>
            ) : (
              <div className="space-y-3">
                {activity.map((log) => {
                  const meta = statusStyles[log.status] || statusStyles.pending
                  const parsedDate = dateKeyToLocalDate(toDateKey(log.date))
                  return (
                    <div key={log.id} className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${log.status === 'taken' ? 'bg-emerald-50' : log.status === 'missed' ? 'bg-red-50' : 'bg-gray-50'}`}>
                          {log.status === 'taken' ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : log.status === 'missed' ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5">
                              <circle cx="12" cy="12" r="10" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{meta.label}</p>
                          <p className="text-xs text-gray-400">{parsedDate && isValid(parsedDate) ? format(parsedDate, 'MMM d, h:mm a') : log.date}</p>
                        </div>
                      </div>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${meta.className}`}>
                        {meta.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Medication summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-500">Status</span>
                <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs font-medium ${statusMeta.className}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                  {statusMeta.label}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-500">Medication</span>
                <span className="text-gray-900 font-medium text-right">{medication.name}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-500">Dosage</span>
                <span className="text-gray-900 font-medium text-right">{medication.dosage}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-500">Frequency</span>
                <span className="text-gray-900 font-medium text-right">{frequencyLabel(medication.frequency)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-500">Time</span>
                <span className="text-gray-900 font-medium text-right">{medication.time_to_take?.slice(0, 5)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => router.push(`/medications/edit/${medication.id}`)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Edit details
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="w-full px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-60"
              >
                {deleting ? 'Deleting...' : 'Delete medication'}
              </button>
            </div>
          </div>

          <div className="bg-blue-50 rounded-2xl border border-blue-100 p-5">
            <p className="text-sm font-semibold text-gray-900 mb-1">Need to change the schedule?</p>
            <p className="text-xs text-gray-500 mb-4">Use edit details to update the dose, time, or instructions without recreating the medication.</p>
            <button
              onClick={() => router.push(`/medications/edit/${medication.id}`)}
              className="w-full bg-[#4A6FA5] text-white text-sm font-medium py-2.5 rounded-xl hover:bg-[#3d5d8f] transition-colors"
            >
              Edit medication
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}