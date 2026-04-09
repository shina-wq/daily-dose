'use client'
import { useState, useEffect, useCallback } from 'react'
import api from '@/lib/api'
import { format, parseISO } from 'date-fns'

const MOOD_OPTIONS = [
  { value: 1, label: 'Poor', emoji: '😞' },
  { value: 2, label: 'Fair', emoji: '😐' },
  { value: 3, label: 'Good', emoji: '😊' },
  { value: 4, label: 'Great', emoji: '😄' }
]

const MOOD_COLORS = {
  1: { bg: 'bg-red-100', text: 'text-red-600', badge: 'bg-red-100 text-red-600' },
  2: { bg: 'bg-orange-100', text: 'text-orange-600', badge: 'bg-orange-100 text-orange-600' },
  3: { bg: 'bg-green-100', text: 'text-green-600', badge: 'bg-green-100 text-green-600' },
  4: { bg: 'bg-blue-100', text: 'text-blue-600', badge: 'bg-blue-100 text-blue-600' }
}

const COMMON_SYMPTOMS = [
  'Headache', 'Fatigue', 'Nausea', 'Joint Pain',
  'Dizziness', 'Brain Fog', 'Insomnia', 'Anxiety'
]

export default function HealthLogPage() {
  const [todayLog, setTodayLog] = useState(null)
  const [recentLogs, setRecentLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [toast, setToast] = useState(false)

  // form state
  const [mood, setMood] = useState(3)
  const [energy, setEnergy] = useState(3)
  const [selectedSymptoms, setSelectedSymptoms] = useState([])
  const [customSymptom, setCustomSymptom] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [notes, setNotes] = useState('')

  const today = format(new Date(), 'yyyy-MM-dd')

  const fetchData = useCallback(async () => {
    try {
      const [todayRes, recentRes] = await Promise.all([
        api.get('/health-logs/today'),
        api.get('/health-logs/recent')
      ])
      setTodayLog(todayRes.data)
      setRecentLogs(recentRes.data)

      // prefill form if today log exists
      if (todayRes.data) {
        setMood(todayRes.data.mood)
        setEnergy(todayRes.data.energy_level)
        setSelectedSymptoms(
          todayRes.data.symptoms
            ? todayRes.data.symptoms.split(', ').filter(Boolean)
            : []
        )
        setNotes(todayRes.data.notes || '')
      }
    } catch (err) {
      console.error('fetch health log error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const showToast = () => {
    setToast(true)
    setTimeout(() => setToast(false), 3000)
  }

  const toggleSymptom = (symptom) => {
    setSelectedSymptoms(prev =>
      prev.includes(symptom)
        ? prev.filter(s => s !== symptom)
        : [...prev, symptom]
    )
  }

  const addCustomSymptom = () => {
    if (customSymptom.trim() && !selectedSymptoms.includes(customSymptom.trim())) {
      setSelectedSymptoms(prev => [...prev, customSymptom.trim()])
      setCustomSymptom('')
      setShowCustomInput(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        date: today,
        energy_level: energy,
        mood,
        symptoms: selectedSymptoms.join(', ') || null,
        notes: notes || null
      }

      if (todayLog && editing) {
        await api.put(`/health-logs/${todayLog.id}`, payload)
      } else {
        await api.post('/health-logs', payload)
      }

      await fetchData()
      setEditing(false)
      showToast()
    } catch (err) {
      console.error('save error:', err)
    } finally {
      setSaving(false)
    }
  }

  const getMoodLabel = (val) => MOOD_OPTIONS.find(m => m.value === val)?.label || 'Good'
  const getMoodEmoji = (val) => MOOD_OPTIONS.find(m => m.value === val)?.emoji || '😊'

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-[#4A6FA5] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const showForm = !todayLog || editing

  return (
    <div className="p-8">
      {/* toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-white border border-green-200 rounded-2xl shadow-lg p-4 flex items-center gap-3 animate-slide-in">
          <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6BBF8E" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Log Saved Successfully</p>
            <p className="text-xs text-gray-500">Your health entry for today has been recorded.</p>
          </div>
          <button onClick={() => setToast(false)} className="text-gray-300 hover:text-gray-500 ml-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      )}

      {/* header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Health Log</h1>
        <p className="text-sm text-gray-500 mt-0.5">Track your daily well-being, energy levels, and symptoms.</p>
      </div>

      <div className="flex gap-8">
        {/* left — today's entry */}
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Today's Entry</h2>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            {showForm ? (
              <div className="space-y-6">
                {/* mood selector */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">How are you feeling?</p>
                  <div className="flex items-center gap-3">
                    {MOOD_OPTIONS.map(option => (
                      <button
                        key={option.value}
                        onClick={() => setMood(option.value)}
                        className={`flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl border-2 transition-all ${
                          mood === option.value
                            ? 'border-[#4A6FA5] bg-[#4A6FA5]/5'
                            : 'border-gray-100 hover:border-gray-200'
                        }`}
                      >
                        <span className="text-2xl">{option.emoji}</span>
                        <span className={`text-xs font-medium ${
                          mood === option.value ? 'text-[#4A6FA5]' : 'text-gray-400'
                        }`}>
                          {option.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* energy level */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">Energy Level (1-5)</p>
                  <div className="flex items-center gap-3">
                    {[1, 2, 3, 4, 5].map(level => (
                      <button
                        key={level}
                        onClick={() => setEnergy(level)}
                        className={`w-10 h-10 rounded-full text-sm font-semibold transition-all ${
                          energy === level
                            ? 'bg-[#4A6FA5] text-white shadow-md'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                {/* symptoms */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">Symptoms</p>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_SYMPTOMS.map(symptom => (
                      <button
                        key={symptom}
                        onClick={() => toggleSymptom(symptom)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                          selectedSymptoms.includes(symptom)
                            ? 'bg-[#4A6FA5] text-white border-[#4A6FA5]'
                            : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {symptom}
                      </button>
                    ))}

                    {/* custom symptoms */}
                    {selectedSymptoms
                      .filter(s => !COMMON_SYMPTOMS.includes(s))
                      .map(symptom => (
                        <button
                          key={symptom}
                          onClick={() => toggleSymptom(symptom)}
                          className="px-3 py-1.5 rounded-xl text-xs font-medium border bg-[#4A6FA5] text-white border-[#4A6FA5]"
                        >
                          {symptom}
                        </button>
                      ))}

                    {/* add custom */}
                    {showCustomInput ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={customSymptom}
                          onChange={e => setCustomSymptom(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && addCustomSymptom()}
                          placeholder="Type symptom..."
                          autoFocus
                          className="px-3 py-1.5 rounded-xl text-xs border border-[#4A6FA5] focus:outline-none w-32"
                        />
                        <button
                          onClick={addCustomSymptom}
                          className="text-xs text-[#4A6FA5] font-medium hover:underline"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => setShowCustomInput(false)}
                          className="text-xs text-gray-400 hover:text-gray-600"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowCustomInput(true)}
                        className="px-3 py-1.5 rounded-xl text-xs font-medium border border-dashed border-gray-300 text-gray-400 hover:border-gray-400 transition-all"
                      >
                        + Add New
                      </button>
                    )}
                  </div>
                </div>

                {/* notes */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Additional Notes</p>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Any details about your diet, sleep, or specific triggers today?"
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6FA5]/30 focus:border-[#4A6FA5] resize-none"
                  />
                </div>

                {/* buttons */}
                <div className="flex items-center gap-3">
                  {editing && (
                    <button
                      onClick={() => setEditing(false)}
                      className="flex-1 py-3 border border-gray-200 text-sm font-medium text-gray-500 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 bg-[#4A6FA5] hover:bg-[#3d5d8f] text-white text-sm font-medium py-3 rounded-xl transition-colors disabled:opacity-60"
                  >
                    {saving ? 'Saving...' : 'Save Log Entry'}
                  </button>
                </div>
              </div>
            ) : (
              /* already logged state */
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6BBF8E" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">You're all set for today!</h3>
                <p className="text-xs text-gray-400 mb-6 max-w-xs mx-auto">
                  You logged your health on {format(new Date(), 'MMM d')} at {format(new Date(todayLog.created_at), 'h:mm a')}. Tracking daily helps build a better picture of your well-being.
                </p>

                {/* summary */}
                <div className="bg-gray-50 rounded-xl p-4 mb-4 text-left space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Mood</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${MOOD_COLORS[todayLog.mood]?.badge}`}>
                      {getMoodEmoji(todayLog.mood)} {getMoodLabel(todayLog.mood)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Energy</span>
                    <span className="text-xs font-medium text-gray-700">{todayLog.energy_level}/5</span>
                  </div>
                  {todayLog.symptoms && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Symptoms</span>
                      <span className="text-xs font-medium text-gray-700">{todayLog.symptoms}</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setEditing(true)}
                  className="w-full py-3 border border-gray-200 text-sm font-medium text-gray-600 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Edit Today's Entry
                </button>
              </div>
            )}
          </div>
        </div>

        {/* right — recent history */}
        <div className="w-96 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Recent History</h2>

          {recentLogs.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center border border-gray-100">
              <p className="text-sm text-gray-500">No logs yet. Start tracking today!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentLogs.map(log => {
                const moodColor = MOOD_COLORS[log.mood]
                return (
                  <div key={log.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-gray-900">
                        {format(parseISO(log.date), 'EEEE, MMM d') === format(new Date(), 'EEEE, MMM d')
                          ? `Today, ${format(parseISO(log.date), 'MMM d')}`
                          : format(parseISO(log.date), 'EEEE, MMM d')}
                      </p>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1 ${moodColor?.badge}`}>
                        <span>{getMoodEmoji(log.mood)}</span>
                        {getMoodLabel(log.mood)}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 mb-2">
                      <div className="flex items-center gap-1.5">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
                          <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                        </svg>
                        <span className="text-xs text-gray-500">
                          Energy: <span className="font-semibold text-gray-700">{log.energy_level}/5</span>
                        </span>
                      </div>
                      {log.symptoms && (
                        <div className="flex items-center gap-1.5">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                          </svg>
                          <span className="text-xs text-gray-500">
                            Symptoms: <span className="font-semibold text-gray-700">{log.symptoms}</span>
                          </span>
                        </div>
                      )}
                    </div>

                    {log.notes && (
                      <div className="bg-gray-50 rounded-xl p-3 mt-2">
                        <p className="text-xs text-gray-500 leading-relaxed">{log.notes}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}