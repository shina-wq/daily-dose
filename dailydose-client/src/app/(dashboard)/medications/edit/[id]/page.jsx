'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import api from '@/lib/api'

const frequencyOptions = [
  { value: 'every_day', label: 'Every Day' },
  { value: 'twice_daily', label: 'Twice Daily' },
  { value: 'three_times', label: 'Three Times Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'as_needed', label: 'As Needed' }
]

const unitOptions = ['mg', 'mcg', 'ml', 'IU', 'g']

const splitDosage = (dosage) => {
  const match = String(dosage || '').match(/^(\d+(?:\.\d+)?)([a-zA-Z]+)$/)
  if (!match) {
    return { dosage: dosage || '', dosage_unit: 'mg' }
  }

  return {
    dosage: match[1],
    dosage_unit: unitOptions.includes(match[2]) ? match[2] : 'mg'
  }
}

export default function EditMedicationPage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    dosage: '',
    dosage_unit: 'mg',
    frequency: 'every_day',
    time_to_take: '08:00',
    notes: ''
  })

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
        const res = await api.get(`/medications/${medicationId}`)
        const dosageParts = splitDosage(res.data.dosage)
        setForm({
          name: res.data.name || '',
          dosage: dosageParts.dosage,
          dosage_unit: dosageParts.dosage_unit,
          frequency: res.data.frequency || 'every_day',
          time_to_take: res.data.time_to_take?.slice(0, 5) || '08:00',
          notes: res.data.notes || ''
        })
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load this medication.')
      } finally {
        setLoading(false)
      }
    }

    loadMedication()
  }, [medicationId, hasValidMedicationId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      await api.put(`/medications/${medicationId}`, {
        name: form.name,
        dosage: `${form.dosage}${form.dosage_unit}`,
        frequency: form.frequency,
        time_to_take: form.time_to_take,
        notes: form.notes || null
      })
      router.push(`/medications/${medicationId}`)
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[calc(100vh-56px)]">
        <div className="w-6 h-6 border-2 border-[#4A6FA5] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error && !form.name) {
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

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            onClick={() => router.push(`/medications/${medicationId}`)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-3"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back to details
          </button>
          <h1 className="text-2xl font-semibold text-gray-900">Edit medication</h1>
          <p className="text-sm text-gray-500 mt-0.5">Update the medication details without changing the rest of the record.</p>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="flex-1">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6 pb-5 border-b border-gray-100">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4A6FA5" strokeWidth="2">
                  <path d="M10.5 20H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H20a2 2 0 0 1 2 2v3" />
                  <circle cx="17" cy="17" r="5" /><path d="M17 14v6M14 17h6" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-400">Medication details</p>
                <h2 className="text-lg font-semibold text-gray-900">Update Medication</h2>
                <p className="text-xs text-gray-400 mt-0.5">Keep the backend record and the UI in sync by editing the same fields that were used to create it.</p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Time of Day</label>
                  <input
                    type="time"
                    value={form.time_to_take}
                    onChange={e => setForm({ ...form, time_to_take: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6FA5]/30 focus:border-[#4A6FA5]"
                  />
                </div>
              </div>

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

              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-gray-400">Changes are saved directly to the medication record and are reflected across the app.</p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => router.push(`/medications/${medicationId}`)}
                    className="px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2.5 bg-[#4A6FA5] hover:bg-[#3d5d8f] text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-60"
                  >
                    {saving ? 'Saving...' : 'Save changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        <div className="w-72 space-y-4 shrink-0">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">What updates here</h3>
            <div className="space-y-3 text-xs text-gray-500">
              <p>Medication name, dose, frequency, time, and instructions.</p>
              <p>The list, details page, and logs use the same API record.</p>
              <p>Deleting from the details page removes the medication and its logs.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}