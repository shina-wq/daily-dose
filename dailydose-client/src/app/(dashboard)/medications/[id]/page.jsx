'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { format } from 'date-fns'
import api from '@/lib/api'

const statusStyles = {
  taken: {
    label: 'Taken',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    dot: 'bg-emerald-500',
    accent: 'bg-emerald-50 text-emerald-700 border-emerald-100'
  },
  missed: {
    label: 'Missed',
    className: 'bg-red-50 text-red-600 border-red-100',
    dot: 'bg-red-500',
    accent: 'bg-red-50 text-red-600 border-red-100'
  },
  pending: {
    label: 'Pending',
    className: 'bg-slate-50 text-slate-600 border-slate-200',
    dot: 'bg-slate-400',
    accent: 'bg-slate-50 text-slate-600 border-slate-200'
  }
}

const adherenceRangeOptions = [
  { value: 'week', label: 'Week', subtitle: 'current week' },
  { value: 'month', label: 'Month', subtitle: 'current month' },
  { value: 'year', label: 'Year', subtitle: 'current year' }
]

const calendarWeekdayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

const frequencyLabel = (frequency) => {
  const map = {
    every_day: 'Every day',
    twice_daily: 'Twice daily',
    three_times: 'Three times daily',
    weekly: 'Weekly',
    as_needed: 'As needed'
  }

  return map[frequency] || frequency || 'Unknown'
}

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

const getDailyDateKeys = (days) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const start = new Date(today)
  start.setDate(today.getDate() - (days - 1))

  return Array.from({ length: days }, (_, index) => {
    const day = new Date(start)
    day.setDate(start.getDate() + index)
    return format(day, 'yyyy-MM-dd')
  })
}

const getCurrentWeekDateKeys = () => {
  const now = new Date()
  const sundayOffset = now.getDay()
  const sunday = new Date(now)
  sunday.setHours(0, 0, 0, 0)
  sunday.setDate(now.getDate() - sundayOffset)

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(sunday)
    day.setDate(sunday.getDate() + index)
    return format(day, 'yyyy-MM-dd')
  })
}

const getCurrentMonthDateKeys = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  return Array.from({ length: daysInMonth }, (_, index) => {
    const day = new Date(year, month, index + 1)
    return format(day, 'yyyy-MM-dd')
  })
}

export default function MedicationDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const [medication, setMedication] = useState(null)
  const [adherenceLogs, setAdherenceLogs] = useState([])
  const [adherenceRange, setAdherenceRange] = useState('week')
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

    const loadMedicationAndLogs = async () => {
      try {
        const [medicationRes, logsRes] = await Promise.all([
          api.get(`/medications/${medicationId}`),
          api.get('/medications/logs/weekly', {
            params: { range: adherenceRange }
          })
        ])

        setMedication(medicationRes.data)
        setAdherenceLogs(logsRes.data.filter((log) => String(log.medication_id) === String(medicationId)))
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load this medication.')
      } finally {
        setLoading(false)
      }
    }

    loadMedicationAndLogs()
  }, [medicationId, hasValidMedicationId, adherenceRange])

  const todayKey = format(new Date(), 'yyyy-MM-dd')
  const todayLog = adherenceLogs.find((log) => toDateKey(log.date) === todayKey)
  const status = todayLog?.status || 'pending'
  const statusMeta = statusStyles[status] || statusStyles.pending

  const adherenceBuckets = useMemo(() => {
    if (adherenceRange === 'year') {
      const now = new Date()
      const monthKeys = Array.from({ length: 12 }, (_, index) => {
        const month = new Date(now.getFullYear(), index, 1)
        return format(month, 'yyyy-MM')
      })
      const grouped = new Map()

      for (const log of adherenceLogs) {
        const dateKey = toDateKey(log.date)
        const monthKey = dateKey.slice(0, 7)
        if (!grouped.has(monthKey)) {
          grouped.set(monthKey, { taken: 0, missed: 0 })
        }

        const month = grouped.get(monthKey)
        if (log.status === 'taken') month.taken += 1
        if (log.status === 'missed') month.missed += 1
      }

      return monthKeys.map((monthKey) => {
        const month = grouped.get(monthKey)
        let statusForMonth = null
        if (month && month.taken + month.missed > 0) {
          statusForMonth = month.taken >= month.missed ? 'taken' : 'missed'
        }

        return {
          key: monthKey,
          label: format(new Date(`${monthKey}-01`), 'MMM'),
          log: statusForMonth ? { status: statusForMonth } : null
        }
      })
    }

    if (adherenceRange === 'month') {
      const dateKeys = getCurrentMonthDateKeys()
      const logsByDate = new Map(adherenceLogs.map((log) => [toDateKey(log.date), log]))

      return dateKeys.map((dateKey) => ({
        key: dateKey,
        dayLabel: format(dateKeyToLocalDate(dateKey), 'EEE'),
        dateLabel: format(dateKeyToLocalDate(dateKey), 'd'),
        log: logsByDate.get(dateKey) || null
      }))
    }

    const dateKeys = getCurrentWeekDateKeys()
    const logsByDate = new Map(adherenceLogs.map((log) => [toDateKey(log.date), log]))

    return dateKeys.map((dateKey) => ({
      key: dateKey,
      dayLabel: format(dateKeyToLocalDate(dateKey), 'EEE'),
      dateLabel: format(dateKeyToLocalDate(dateKey), 'd'),
      log: logsByDate.get(dateKey) || null
    }))
  }, [adherenceLogs, adherenceRange])

  const adherence = useMemo(() => {
    const loggedDays = adherenceLogs.filter((log) => ['taken', 'missed'].includes(log.status)).length
    const takenDays = adherenceLogs.filter((log) => log.status === 'taken').length
    return loggedDays > 0 ? Math.round((takenDays / loggedDays) * 100) : 0
  }, [adherenceLogs])

  const selectedRangeMeta = adherenceRangeOptions.find((item) => item.value === adherenceRange)
  const monthTitle = useMemo(() => {
    if (adherenceRange !== 'month') return ''
    return format(new Date(), 'MMMM yyyy')
  }, [adherenceRange])

  const monthCalendarCells = useMemo(() => {
    if (adherenceRange !== 'month') return []

    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const leadingEmptyCells = firstDayOfMonth.getDay()

    const leading = Array.from({ length: leadingEmptyCells }, (_, index) => ({
      key: `leading-${index}`,
      isPlaceholder: true
    }))

    const filled = adherenceBuckets.map((entry) => ({
      ...entry,
      isPlaceholder: false
    }))

    const totalCells = leading.length + filled.length
    const trailingEmptyCells = (7 - (totalCells % 7)) % 7
    const trailing = Array.from({ length: trailingEmptyCells }, (_, index) => ({
      key: `trailing-${index}`,
      isPlaceholder: true
    }))

    return [...leading, ...filled, ...trailing]
  }, [adherenceRange, adherenceBuckets])

  const yearCalendarMonths = useMemo(() => {
    if (adherenceRange !== 'year') return []

    const now = new Date()
    const currentYear = now.getFullYear()
    const logsByDate = new Map(adherenceLogs.map((log) => [toDateKey(log.date), log]))

    return Array.from({ length: 12 }, (_, monthIndex) => {
      const firstDay = new Date(currentYear, monthIndex, 1)
      const firstWeekday = firstDay.getDay()
      const daysInMonth = new Date(currentYear, monthIndex + 1, 0).getDate()
      const daysInPrevMonth = new Date(currentYear, monthIndex, 0).getDate()

      const leadingCells = Array.from({ length: firstWeekday }, (_, index) => ({
        key: `m-${monthIndex}-leading-${index}`,
        dayNumber: daysInPrevMonth - firstWeekday + index + 1,
        isCurrentMonth: false,
        log: null,
        isToday: false
      }))

      const currentMonthCells = Array.from({ length: daysInMonth }, (_, index) => {
        const day = index + 1
        const date = new Date(currentYear, monthIndex, day)
        const dateKey = format(date, 'yyyy-MM-dd')

        return {
          key: dateKey,
          dayNumber: day,
          isCurrentMonth: true,
          log: logsByDate.get(dateKey) || null,
          isToday: dateKey === todayKey
        }
      })

      const usedCells = leadingCells.length + currentMonthCells.length
      const trailingCells = Array.from({ length: 42 - usedCells }, (_, index) => ({
        key: `m-${monthIndex}-trailing-${index}`,
        dayNumber: index + 1,
        isCurrentMonth: false,
        log: null,
        isToday: false
      }))

      return {
        monthKey: format(firstDay, 'yyyy-MM'),
        title: format(firstDay, 'MMMM'),
        cells: [...leadingCells, ...currentMonthCells, ...trailingCells]
      }
    })
  }, [adherenceRange, adherenceLogs, todayKey])

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
      <div className="flex min-h-[calc(100vh-56px)] items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#4A6FA5] border-t-transparent" />
      </div>
    )
  }

  if (error && !medication) {
    return (
      <div className="p-8">
        <div className="mx-auto max-w-2xl rounded-2xl border border-red-100 bg-white p-6 shadow-sm">
          <p className="mb-1 text-sm font-semibold text-gray-900">Medication unavailable</p>
          <p className="text-sm text-gray-500">{error}</p>
          <button
            onClick={() => router.push('/medications')}
            className="mt-4 rounded-xl bg-[#4A6FA5] px-4 py-2.5 text-sm font-medium text-white"
          >
            Back to medications
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <button
            onClick={() => router.push('/medications')}
            className="mb-3 flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-700"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back to medications
          </button>
          <div className="flex items-start gap-3 sm:items-center sm:gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4A6FA5" strokeWidth="2">
                <path d="M10.5 20H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H20a2 2 0 0 1 2 2v3" />
                <circle cx="17" cy="17" r="5" />
                <path d="M17 14v6M14 17h6" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl">{medication.name}</h1>
              <p className="mt-0.5 text-sm text-gray-500">
                {medication.dosage} - {frequencyLabel(medication.frequency)} - {medication.time_to_take?.slice(0, 5)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
          <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${statusMeta.className}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot}`} />
            {statusMeta.label}
          </span>
          <button
            onClick={() => router.push(`/medications/edit/${medication.id}`)}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Edit details
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-xl bg-red-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-60"
          >
            {deleting ? 'Deleting...' : 'Delete medication'}
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-gray-100 p-4 sm:p-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3 sm:items-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4A6FA5" strokeWidth="2">
                  <path d="M10.5 20H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H20a2 2 0 0 1 2 2v3" />
                  <circle cx="17" cy="17" r="5" />
                  <path d="M17 14v6M14 17h6" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-400">Medication details</p>
                <h2 className="text-lg font-semibold text-gray-900">Schedule & instructions</h2>
                <p className="mt-0.5 text-xs text-gray-400">The fields here match what the backend stores and what the list page displays.</p>
              </div>
            </div>

            <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${statusMeta.className}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot}`} />
              {statusMeta.label}
            </span>
          </div>

          <div className="grid gap-4 p-4 sm:p-6 md:grid-cols-2">
            <div className="rounded-xl border border-gray-100 p-4">
              <p className="mb-1 text-xs text-gray-400">Dosage</p>
              <p className="text-sm font-medium text-gray-900">{medication.dosage}</p>
            </div>
            <div className="rounded-xl border border-gray-100 p-4">
              <p className="mb-1 text-xs text-gray-400">Frequency</p>
              <p className="text-sm font-medium text-gray-900">{frequencyLabel(medication.frequency)}</p>
            </div>
            <div className="rounded-xl border border-gray-100 p-4">
              <p className="mb-1 text-xs text-gray-400">Time of day</p>
              <p className="text-sm font-medium text-gray-900">{medication.time_to_take?.slice(0, 5)}</p>
            </div>
            <div className="rounded-xl border border-gray-100 p-4">
              <p className="mb-1 text-xs text-gray-400">Today</p>
              <p className="text-sm font-medium text-gray-900">
                {status === 'taken' ? 'Dose logged as taken' : status === 'missed' ? 'Dose marked missed' : 'Awaiting log'}
              </p>
            </div>
          </div>

          <div className="border-t border-gray-100 bg-slate-50 p-4 sm:p-6">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Instructions</p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
              {medication.notes || 'No instructions were added for this medication.'}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Adherence trend</h3>
              <p className="text-xs text-gray-400">Showing {selectedRangeMeta?.subtitle || 'last 7 days'} for this medication.</p>
            </div>
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <span className="rounded-full bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600">{adherence}% consistency</span>
              <select
                value={adherenceRange}
                onChange={(e) => setAdherenceRange(e.target.value)}
                className="ml-auto rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 outline-none focus:border-[#4A6FA5]"
              >
                {adherenceRangeOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-5 rounded-2xl bg-slate-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs text-gray-400">Current status</p>
                <p className="mt-1 text-sm font-medium text-gray-900">
                  {status === 'taken' ? 'Dose logged as taken' : status === 'missed' ? 'Dose marked missed' : 'No dose logged today yet'}
                </p>
              </div>
              <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${statusMeta.accent}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot}`} />
                {statusMeta.label}
              </span>
            </div>
          </div>

          {adherenceRange === 'month' ? (
            <div>
              <p className="mb-4 text-center text-lg font-semibold text-gray-700">{monthTitle}</p>
              <div className="grid grid-cols-7 gap-x-1 gap-y-3 sm:gap-x-2">
                {monthCalendarCells.map((entry) => (
                  <div key={entry.key} className="flex flex-col items-center gap-1.5">
                    {entry.isPlaceholder ? (
                      <>
                        <div className="h-7" />
                        <div className="h-8 w-8 sm:h-10 sm:w-10" />
                      </>
                    ) : (
                      <>
                        <div className="text-center leading-tight">
                          <p className="text-[10px] text-gray-400">{entry.dayLabel}</p>
                          <p className="text-[11px] font-medium text-gray-500">{entry.dateLabel}</p>
                        </div>
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full border-2 sm:h-10 sm:w-10 ${
                            entry.log?.status === 'taken'
                              ? 'border-emerald-200 bg-emerald-100'
                              : entry.log?.status === 'missed'
                                ? 'border-red-200 bg-red-50'
                                : 'border-gray-200 bg-white'
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
                            <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : adherenceRange === 'week' ? (
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {adherenceBuckets.map((entry) => (
                <div key={entry.key} className="flex flex-col items-center gap-2">
                  <span className="text-[10px] text-gray-400">{entry.dayLabel}</span>
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full border-2 sm:h-12 sm:w-12 ${
                      entry.log?.status === 'taken'
                        ? 'border-emerald-200 bg-emerald-100'
                        : entry.log?.status === 'missed'
                          ? 'border-red-200 bg-red-50'
                          : 'border-gray-200 bg-white'
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
                      <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div>
              <p className="mb-4 text-center text-lg font-semibold text-gray-700">{format(new Date(), 'yyyy')}</p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {yearCalendarMonths.map((month) => (
                  <div key={month.monthKey} className="rounded-xl border border-gray-100 bg-white p-3">
                    <p className="mb-2 text-sm font-semibold text-gray-700">{month.title}</p>
                    <div className="mb-1 grid grid-cols-7 gap-1">
                      {calendarWeekdayLabels.map((weekday, index) => (
                        <span key={`${month.monthKey}-weekday-${index}`} className="text-center text-[10px] font-medium text-gray-400">
                          {weekday}
                        </span>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {month.cells.map((cell) => (
                        <div key={cell.key} className="flex h-6 items-center justify-center">
                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                              cell.log?.status === 'taken'
                                ? 'bg-emerald-100 font-semibold text-emerald-700'
                                : cell.log?.status === 'missed'
                                  ? 'bg-red-100 font-semibold text-red-600'
                                  : cell.isToday
                                    ? 'bg-blue-100 font-semibold text-blue-700'
                                    : cell.isCurrentMonth
                                      ? 'text-gray-600'
                                      : 'text-gray-300'
                            }`}
                          >
                            {cell.dayNumber}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
