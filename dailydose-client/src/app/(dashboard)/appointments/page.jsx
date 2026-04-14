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
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
                    <circle cx="9" cy="14" r="1" fill="white"/><circle cx="15" cy="14" r="1" fill="white"/>
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
                className="w-full bg-white text-[#4A6FA5] text-sm font-medium py-2.5 rounded-xl hover:bg-blue-50 transition-colors"
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

// appointment card component
function AppointmentCard({ appt, type, onComplete, onDelete, onEdit, isFirst }) {
  const apptDate = parseISO(appt.appointment_date)
  const isUpcoming = type === 'upcoming'

  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-5 flex gap-4 ${
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
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            <p className="text-xs text-gray-400">{appt.location}</p>
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
        <div className="flex items-center gap-2 pt-3 border-t border-gray-50">
          {isUpcoming && (
            <>
              <button
                onClick={onComplete}
                className="text-xs font-medium text-[#4A6FA5] hover:underline transition-colors"
              >
                Mark Completed
              </button>
              <span className="text-gray-200">|</span>
              <button
                onClick={onEdit}
                className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
              >
                Reschedule
              </button>
              <span className="text-gray-200">|</span>
              <button
                onClick={onDelete}
                className="text-xs font-medium text-red-400 hover:text-red-600 transition-colors"
              >
                Cancel
              </button>
            </>
          )}
          {!isUpcoming && (
            <>
              <button
                onClick={onDelete}
                className="text-xs font-medium text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
              >
                Delete
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