'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'

const frequencyOptions = [
  { value: 'every_day', label: 'Every Day' },
  { value: 'twice_daily', label: 'Twice Daily' },
  { value: 'three_times', label: 'Three Times Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'as_needed', label: 'As Needed' }
]

const formOptions = ['Tablet', 'Capsule', 'Liquid', 'Injection', 'Patch', 'Drops', 'Inhaler', 'Softgel']
const unitOptions = ['mg', 'mcg', 'ml', 'IU', 'g']

export default function AddMedicationPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '',
    dosage: '',
    dosage_unit: 'mg',
    frequency: 'every_day',
    time_to_take: '08:00',
    notes: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/medications', {
        name: form.name,
        dosage: `${form.dosage}${form.dosage_unit}`,
        frequency: form.frequency,
        time_to_take: form.time_to_take,
        notes: form.notes || null
      })
      router.push('/medications')
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      {/* header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Add medication</h1>
          <p className="text-sm text-gray-500 mt-0.5">Create a medication plan that fits naturally into your day.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/medications')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
            Back to medications
          </button>
          <button
            onClick={() => router.push('/medications')}
            className="text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* main form */}
        <div className="flex-1">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            {/* form header */}
            <div className="flex items-center gap-3 mb-6 pb-5 border-b border-gray-100">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4A6FA5" strokeWidth="2">
                  <path d="M10.5 20H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H20a2 2 0 0 1 2 2v3"/>
                  <circle cx="17" cy="17" r="5"/><path d="M17 14v6M14 17h6"/>
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-400">Medication details</p>
                <h2 className="text-lg font-semibold text-gray-900">Add New Medication</h2>
                <p className="text-xs text-gray-400 mt-0.5">Enter the medication details below so DailyDose can track doses, adherence, and reminders.</p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* medication name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Medication Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Lisinopril"
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6FA5]/30 focus:border-[#4A6FA5] transition-all"
                />
              </div>

              {/* dosage + form */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Dosage</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={form.dosage}
                      onChange={e => setForm({ ...form, dosage: e.target.value })}
                      placeholder="e.g. 10"
                      required
                      className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6FA5]/30 focus:border-[#4A6FA5] transition-all"
                    />
                    <select
                      value={form.dosage_unit}
                      onChange={e => setForm({ ...form, dosage_unit: e.target.value })}
                      className="px-3 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6FA5]/30 focus:border-[#4A6FA5] bg-white"
                    >
                      {unitOptions.map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Frequency</label>
                  <select
                    value={form.frequency}
                    onChange={e => setForm({ ...form, frequency: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6FA5]/30 focus:border-[#4A6FA5] bg-white"
                  >
                    {frequencyOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Time of Day</label>
                <div className="relative">
                  <input
                    type="time"
                    value={form.time_to_take}
                    onChange={e => setForm({ ...form, time_to_take: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6FA5]/30 focus:border-[#4A6FA5]"
                  />
                </div>
              </div>

              {/* instructions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Instructions <span className="text-gray-400 font-normal">(Optional)</span></label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="e.g. Take with food or water"
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6FA5]/30 focus:border-[#4A6FA5] resize-none"
                />
              </div>

              {/* footer */}
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-gray-400">This medication will appear in today's routine after you save it.</p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => router.push('/medications')}
                    className="px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2.5 bg-[#4A6FA5] hover:bg-[#3d5d8f] text-white text-sm font-medium rounded-xl transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {loading ? 'Adding...' : 'Add Medication'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* right panel */}
        <div className="w-72 space-y-4 shrink-0">
          {/* what happens next */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">What happens next</h3>
            <div className="space-y-4">
              {[
                {
                  num: 1,
                  title: 'Dose reminders',
                  desc: 'DailyDose will surface reminders in your dashboard and notifications.'
                },
                {
                  num: 2,
                  title: 'Adherence tracking',
                  desc: 'Each dose is added to your weekly adherence score automatically.'
                },
                {
                  num: 3,
                  title: 'Smarter AI support',
                  desc: 'The assistant can reference this medication in future summaries and chats.'
                }
              ].map(item => (
                <div key={item.num} className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#4A6FA5] text-white text-xs font-semibold flex items-center justify-center shrink-0">
                    {item.num}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{item.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* helpful tips */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Helpful tips</h3>
            <div className="space-y-3">
              {[
                {
                  icon: (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4A6FA5" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                  ),
                  title: 'Match your routine',
                  desc: 'Choose a time you can realistically stick to every day.'
                },
                {
                  icon: (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4A6FA5" strokeWidth="2">
                      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                      <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                    </svg>
                  ),
                  title: 'Add context',
                  desc: 'Use instructions for notes like taking it with food or spacing from other meds.'
                },
                {
                  icon: (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4A6FA5" strokeWidth="2">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                    </svg>
                  ),
                  title: 'Keep reminders on',
                  desc: 'Notifications help maintain steady adherence during busy days.'
                }
              ].map((tip, i) => (
                <div key={i} className="flex gap-2.5">
                  <div className="w-6 h-6 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                    {tip.icon}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-700">{tip.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{tip.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ask ai */}
          <div className="bg-[#4A6FA5] rounded-2xl p-5">
            <p className="text-sm font-semibold text-white mb-1">Need help picking a schedule?</p>
            <p className="text-xs text-white/70 mb-4">Ask the AI assistant to suggest reminder timing based on your routine.</p>
            <button
              onClick={() => router.push('/assistant')}
              className="w-full bg-white text-[#4A6FA5] text-sm font-medium py-2.5 rounded-xl hover:bg-blue-50 transition-colors cursor-pointer"
            >
              Ask AI Assistant
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}