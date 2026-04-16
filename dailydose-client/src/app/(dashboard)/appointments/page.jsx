'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { format, isPast, isToday, isFuture, parseISO } from 'date-fns'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'

export default function AppointmentsPage() {
  const router = useRouter()
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [completeModal, setCompleteModal] = useState(null)
  const [completeNotes, setCompleteNotes] = useState('')
  const [completing, setCompleting] = useState(false)

  const fetchAppointments = useCallback(async () => {
    try {
      const res = await api.get('/appointments')
      setAppointments(res.data)
    } catch (err) {
      console.error('fetch appointments error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  const handleDelete = async (id) => {
    if (!confirm('Delete this appointment?')) return
    try {
      await api.delete(`/appointments/${id}`)
      await fetchAppointments()
    } catch (err) {
      console.error('delete error:', err)
    }
  }

  const handleComplete = async () => {
    if (!completeModal) return
    setCompleting(true)
    try {
      await api.patch(`/appointments/${completeModal.id}/complete`, {
        notes: completeNotes
      })
      setCompleteModal(null)
      setCompleteNotes('')
      await fetchAppointments()
    } catch (err) {
      console.error('complete error:', err)
    } finally {
      setCompleting(false)
    }
  }

  // get appointment dates for calendar dots
  const appointmentDates = appointments.map(a =>
    format(parseISO(a.appointment_date), 'yyyy-MM-dd')
  )

  const tileContent = ({ date, view }) => {
    if (view !== 'month') return null
    const dateStr = format(date, 'yyyy-MM-dd')
    if (appointmentDates.includes(dateStr)) {
      return (
        <div className="flex justify-center mt-0.5">
          <span className="w-1.5 h-1.5 bg-[#4A6FA5] rounded-full" />
        </div>
      )
    }
    return null
  }

  const upcoming = appointments.filter(a =>
    !a.completed && (isFuture(parseISO(a.appointment_date)) || isToday(parseISO(a.appointment_date)))
  )
  const past = appointments.filter(a =>
    a.completed || isPast(parseISO(a.appointment_date))
  )

  // filter by selected date if it has appointments
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd')
  const hasSelectedDateAppts = appointmentDates.includes(selectedDateStr)
  const filteredUpcoming = hasSelectedDateAppts
    ? upcoming.filter(a => format(parseISO(a.appointment_date), 'yyyy-MM-dd') === selectedDateStr)
    : upcoming

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-[#4A6FA5] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">My Appointments</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your upcoming visits and view past summaries.</p>
        </div>
        <button
          onClick={() => router.push('/appointments/add')}
          className="flex items-center gap-2 bg-[#4A6FA5] hover:bg-[#3d5d8f] text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Appointment
        </button>
      </div>

      <div className="flex gap-6">
        {/* left — timeline */}
        <div className="flex-1 min-w-0">

          {/* upcoming */}
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">
              Upcoming Appointments
              {hasSelectedDateAppts && (
                <span className="ml-2 text-xs font-normal text-[#4A6FA5]">
                  — {format(selectedDate, 'MMM d')}
                  <button onClick={() => setSelectedDate(new Date())} className="ml-1 hover:underline">(clear)</button>
                </span>
              )}
            </h2>

            {filteredUpcoming.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center border border-gray-100">
                <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-700">No upcoming appointments</p>
                <p className="text-xs text-gray-400 mt-1">Schedule your next visit to stay on track.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredUpcoming.map((appt, index) => (
                  <AppointmentCard
                    key={appt.id}
                    appt={appt}
                    type="upcoming"
                    onComplete={() => setCompleteModal(appt)}
                    onDelete={() => handleDelete(appt.id)}
                    onEdit={() => router.push(`/appointments/edit/${appt.id}`)}
                    onView={() => router.push(`/appointments/edit/${appt.id}`)}
                    isFirst={index === 0}
                  />
                ))}
              </div>
            )}
          </div>

          {/* past */}
          {past.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Past Appointments</h2>
              <div className="space-y-4">
                {past.map((appt, index) => (
                  <AppointmentCard
                    key={appt.id}
                    appt={appt}
                    type="past"
                    onDelete={() => handleDelete(appt.id)}
                    onEdit={() => router.push(`/appointments/edit/${appt.id}`)}
                    isFirst={index === 0}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* right — calendar + pre-visit summary */}
        <div className="w-72 shrink-0 space-y-4">
          {/* calendar */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 calendar-wrapper">
            <Calendar
              onChange={setSelectedDate}
              value={selectedDate}
              tileContent={tileContent}
              className="border-none w-full"
            />
          </div>

          {/* pre-visit summary card */}
          {upcoming.length > 0 && (
            <div className="bg-[#4A6FA5] rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z"/>
                    <path d="M18.5 14.5l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9.9-2.4z"/>
                    <path d="M6 14l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6L6 14z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-white/70">Prep for</p>
                  <p className="text-sm font-semibold text-white">
                    {upcoming[0].doctor_name || upcoming[0].title}
                  </p>
                </div>
              </div>
              <p className="text-xs text-white/70 mb-4">
                Your AI assistant can turn recent logs, symptom notes, and medication adherence into a concise pre-visit summary.
              </p>
              <div className="space-y-2 mb-4">
                {[
                  { label: 'Recent symptom entries', value: '— entries' },
                  { label: 'Missed doses this week', value: '— doses' },
                  { label: 'Questions saved', value: '— items' }
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-xs text-white/70">{item.label}</span>
                    <span className="text-xs font-medium text-white">{item.value}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => router.push('/assistant')}
                className="w-full bg-white text-[#4A6FA5] text-sm font-medium py-2.5 rounded-xl hover:bg-blue-50 transition-colors cursor-pointer"
              >
                Generate Pre-Visit Summary
              </button>
            </div>
          )}
        </div>
      </div>

      {/* complete modal */}
      {completeModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Mark as Completed</h3>
            <p className="text-sm text-gray-500 mb-4">
              Add any notes from your visit with <span className="font-medium">{completeModal.doctor_name || completeModal.title}</span>.
            </p>
            <textarea
              value={completeNotes}
              onChange={e => setCompleteNotes(e.target.value)}
              placeholder="e.g. Doctor adjusted dosage, next checkup in 3 months..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6FA5]/30 focus:border-[#4A6FA5] resize-none mb-4"
            />
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => { setCompleteModal(null); setCompleteNotes('') }}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleComplete}
                disabled={completing}
                className="px-5 py-2 bg-[#4A6FA5] hover:bg-[#3d5d8f] text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-60"
              >
                {completing ? 'Saving...' : 'Mark Completed'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function downloadAppointmentSummary(appt) {
  const apptDate = parseISO(appt.appointment_date)
  const normalizedType = (appt.type || '').toLowerCase()
  const locationText = (appt.location || '').trim()
  const hasProtocol = /^https?:\/\//i.test(locationText)
  const looksLikeDomain = /^[^\s]+\.[^\s]+/.test(locationText) && !locationText.includes(' ')
  const isOnlineAppointment = ['telehealth', 'online', 'virtual'].includes(normalizedType) || hasProtocol || looksLikeDomain

  const summaryLines = [
    'Appointment Summary',
    '-------------------',
    `Provider: ${appt.doctor_name || appt.title || 'Unknown'}`,
    `Specialty / Visit Type: ${appt.title || 'Medical Appointment'}`,
    `Date: ${format(apptDate, 'MMM d, yyyy')}`,
    `Time: ${format(apptDate, 'h:mm a')}`,
    `Type: ${isOnlineAppointment ? 'Telehealth' : 'In-person'}`,
    isOnlineAppointment
      ? `Meeting Link: ${locationText || 'Not provided'}`
      : `Location: ${locationText || 'Not provided'}`,
    `Status: ${appt.completed ? 'Completed' : 'Pending'}`,
    '',
    'Notes',
    '-----',
    appt.notes ? appt.notes : 'No notes recorded.'
  ]

  const blob = new Blob([summaryLines.join('\n')], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `appointment-summary-${format(apptDate, 'yyyy-MM-dd')}.txt`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

// appointment card component
function AppointmentCard({ appt, type, onComplete, onDelete, onEdit, onView, isFirst }) {
  const apptDate = parseISO(appt.appointment_date)
  const isUpcoming = type === 'upcoming'
  const normalizedType = (appt.type || '').toLowerCase()
  const locationText = (appt.location || '').trim()
  const hasProtocol = /^https?:\/\//i.test(locationText)
  const looksLikeDomain = /^[^\s]+\.[^\s]+/.test(locationText) && !locationText.includes(' ')
  const isOnlineAppointment = ['telehealth', 'online', 'virtual'].includes(normalizedType) || hasProtocol || looksLikeDomain

  const handlePrimaryAction = () => {
    if (!isOnlineAppointment) {
      onComplete?.()
      return
    }

    if (!locationText) {
      ;(onView || onEdit)?.()
      return
    }

    const joinUrl = hasProtocol ? locationText : `https://${locationText}`

    try {
      window.open(joinUrl, '_blank', 'noopener,noreferrer')
    } catch {
      ;(onView || onEdit)?.()
    }
  }

  return (
    <div className={`bg-white rounded-2xl shadow-sm p-5 flex gap-4 ${
      isFirst && isUpcoming ? 'border-[#4A6FA5]/30' : 'border-gray-100'
    }`}>
      {/* timeline dot */}
      <div className="flex flex-col items-center pt-1">
        <div className={`w-3 h-3 rounded-full shrink-0 ${
          isUpcoming ? 'bg-[#4A6FA5]' : 'bg-gray-300'
        }`} />
        <div className="w-px flex-1 bg-gray-100 mt-1" />
      </div>

      {/* content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-3">
            {/* avatar */}
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
              isUpcoming ? 'bg-[#4A6FA5] text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {(appt.doctor_name || appt.title).charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {appt.doctor_name || appt.title}
              </p>
              <p className="text-xs text-gray-400">{appt.title}</p>
            </div>
          </div>
          <div className="text-right shrink-0 ml-4">
            <p className="text-xs font-medium text-gray-500">
              {format(apptDate, 'MMM d, yyyy')}
            </p>
            <p className="text-xs text-gray-400">
              {format(apptDate, 'h:mm a')}
            </p>
          </div>
        </div>

        {/* location */}
        {appt.location && (
          <div className="flex items-center gap-1.5 mb-1.5">
            {isOnlineAppointment ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4A6FA5" strokeWidth="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            )}
            <p className={`text-xs ${isOnlineAppointment ? 'text-[#4A6FA5]' : 'text-gray-400'} truncate`}>
              {isOnlineAppointment ? `Meeting Link: ${appt.location}` : appt.location}
            </p>
          </div>
        )}

        {/* notes */}
        {appt.notes && (
          <div className="flex items-start gap-1.5 mb-3">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" className="mt-0.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <p className="text-xs text-gray-400 line-clamp-2">{appt.notes}</p>
          </div>
        )}

        {/* completed badge */}
        {appt.completed && (
          <span className="inline-flex items-center gap-1 text-xs font-medium bg-green-50 text-green-600 px-2 py-1 rounded-lg mb-3">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Completed
          </span>
        )}

        {/* actions */}
        <div className="flex items-center justify-between gap-3 pt-4 mt-4 border-t border-gray-100">
          {isUpcoming && (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handlePrimaryAction}
                  className="px-3 py-1.5 text-xs font-medium text-[#4A6FA5] border border-[#4A6FA5]/25 bg-[#4A6FA5]/5 rounded-md hover:bg-[#4A6FA5]/10 transition-colors cursor-pointer"
                >
                  {isOnlineAppointment ? 'Join Call' : 'Mark Completed'}
                </button>
                <button
                  onClick={onEdit}
                  className="px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Reschedule
                </button>
                <button
                  onClick={onDelete}
                  className="px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-200 rounded-md hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <button
                onClick={onView || onEdit}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#4A6FA5] hover:text-[#3d5d8f] transition-colors shrink-0 cursor-pointer"
              >
                View Details
                <span aria-hidden="true">→</span>
              </button>
            </>
          )}
          {!isUpcoming && (
            <>
              <button
                onClick={() => downloadAppointmentSummary(appt)}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Download Summary
              </button>
              <span className="text-gray-200">|</span>
              <button className="text-xs font-medium text-[#4A6FA5] hover:underline transition-colors cursor-pointer">
                View Full History →
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}