'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'

const specialties = [
  'Endocrinologist', 'General Practitioner', 'Cardiologist',
  'Neurologist', 'Rheumatologist', 'Dermatologist',
  'Psychiatrist', 'Physiotherapist', 'Dietitian', 'Other'
]

export default function AddAppointmentPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    doctor_name: '',
    specialty: '',
    type: 'in-person',
    location: '',
    date: '',
    time: '',
    notes: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.date || !form.time) {
      setError('Please select a date and time.')
      return
    }

    setLoading(true)
    try {
      const appointment_date = `${form.date}T${form.time}:00`
      await api.post('/appointments', {
        title: form.specialty || 'Medical Appointment',
        doctor_name: form.doctor_name || null,
        location: form.location || null,
        appointment_date,
        notes: form.notes || null
      })
      router.push('/appointments')
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      {/* back link */}
      <button
        onClick={() => router.push('/appointments')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-6"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
        </svg>
        Back to Appointments
      </button>

      <h1 className="text-2xl font-semibold text-gray-900 mb-1">Add New Appointment</h1>
      <p className="text-sm text-gray-500 mb-8">Schedule your next visit or telehealth call to keep your calendar updated.</p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
        {/* healthcare provider */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Healthcare Provider</label>
          <div className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            <input
              type="text"
              value={form.doctor_name}
              onChange={e => setForm({ ...form, doctor_name: e.target.value })}
              placeholder="e.g. Dr. Emily Chen"
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6FA5]/30 focus:border-[#4A6FA5] transition-all"
            />
          </div>
        </div>

        {/* specialty */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Specialty / Role</label>
          <div className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
            <select
              value={form.specialty}
              onChange={e => setForm({ ...form, specialty: e.target.value })}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6FA5]/30 focus:border-[#4A6FA5] bg-white appearance-none"
            >
              <option value="">Select specialty</option>
              {specialties.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <svg className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </div>

        {/* appointment type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Appointment Type</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                value: 'in-person',
                label: 'In-person',
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                )
              },
              {
                value: 'telehealth',
                label: 'Telehealth',
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <video width="16" height="16"/>
                    <polygon points="23 7 16 12 23 17 23 7"/>
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                  </svg>
                )
              }
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm({ ...form, type: opt.value })}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${
                  form.type === opt.value
                    ? 'border-[#4A6FA5] bg-[#4A6FA5]/5 text-[#4A6FA5]'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  form.type === opt.value ? 'border-[#4A6FA5]' : 'border-gray-300'
                }`}>
                  {form.type === opt.value && (
                    <div className="w-2 h-2 rounded-full bg-[#4A6FA5]" />
                  )}
                </div>
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {form.type === 'telehealth' ? 'Meeting Link' : 'Location'}
          </label>
          <div className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {form.type === 'telehealth' ? (
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              ) : (
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              )}
            </svg>
            <input
              type="text"
              value={form.location}
              onChange={e => setForm({ ...form, location: e.target.value })}
              placeholder={form.type === 'telehealth' ? 'Enter video call link' : 'Enter hospital address'}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6FA5]/30 focus:border-[#4A6FA5] transition-all"
            />
          </div>
        </div>

        {/* date + time */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Date</label>
            <div className="relative">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6FA5]/30 focus:border-[#4A6FA5]"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Time</label>
            <div className="relative">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              <input
                type="time"
                value={form.time}
                onChange={e => setForm({ ...form, time: e.target.value })}
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6FA5]/30 focus:border-[#4A6FA5]"
              />
            </div>
          </div>
        </div>

        {/* notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Reason for Visit / Notes <span className="text-gray-400 font-normal">(Optional)</span>
          </label>
          <textarea
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
            placeholder="Briefly describe the purpose of your appointment..."
            rows={4}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6FA5]/30 focus:border-[#4A6FA5] resize-none"
          />
        </div>

        {/* actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push('/appointments')}
            className="px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-[#4A6FA5] hover:bg-[#3d5d8f] text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-60"
          >
            {loading ? 'Saving...' : 'Save Appointment'}
          </button>
        </div>
      </form>
    </div>
  )
}