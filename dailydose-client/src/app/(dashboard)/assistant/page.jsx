'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import api from '@/lib/api'
import { useAuth } from '@/lib/AuthContext'

const quickActions = [
  {
    label: 'Log current symptoms',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
    ),
    prompt: 'I want to log my current symptoms.'
  },
  {
    label: 'Medication schedule',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
    prompt: 'Can you show me my medication schedule for today?'
  },
  {
    label: 'Prepare for next visit',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
    prompt: 'Help me prepare for my next doctor visit.'
  },
  {
    label: 'Weekly adherence score',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
    prompt: 'How has my medication adherence been this week?'
  }
]

// simple markdown-like renderer for bold text and bullet points
const renderMessage = (text) => {
  const lines = text.split('\n')
  return lines.map((line, i) => {
    // bullet points
    if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
      const content = line.replace(/^[\s\-•]+/, '')
      return (
        <li key={i} className="ml-4 text-sm leading-relaxed">
          {renderInline(content)}
        </li>
      )
    }
    // headers (** at start)
    if (line.trim().startsWith('**') && line.trim().endsWith('**')) {
      const content = line.trim().replace(/\*\*/g, '')
      return <p key={i} className="text-sm font-semibold text-gray-900 mt-3 mb-1">{content}</p>
    }
    // numbered list
    if (/^\d+\./.test(line.trim())) {
      return <p key={i} className="text-sm leading-relaxed ml-2">{renderInline(line)}</p>
    }
    // empty line
    if (line.trim() === '') return <br key={i} />
    // regular line
    return <p key={i} className="text-sm leading-relaxed">{renderInline(line)}</p>
  })
}

const renderInline = (text) => {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    return part
  })
}

export default function AssistantPage() {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summary, setSummary] = useState(null)
  const [showSummary, setShowSummary] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const isEmpty = messages.length === 0

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text) => {
    const content = text || input.trim()
    if (!content || loading) return

    const userMsg = { role: 'user', content }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await api.post('/ai/chat', { messages: newMessages })
      const assistantMsg = { role: 'assistant', content: res.data.message }
      setMessages(prev => [...prev, assistantMsg])
    } catch (err) {
      console.error('chat error:', err)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.'
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleGenerateSummary = async () => {
    setSummaryLoading(true)
    setShowSummary(true)
    setSummary(null)
    try {
      const res = await api.post('/ai/pre-visit-summary', {})
      setSummary(res.data.summary)
    } catch (err) {
      console.error('summary error:', err)
      setSummary('Unable to generate summary. Please try again.')
    } finally {
      setSummaryLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="h-screen overflow-hidden bg-[#F5F6FA]">

      {/* main chat area */}
      <div className="h-full flex flex-col min-w-0">

        {/* chat header */}
        <div className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">AI Assistant</h1>
            <p className="text-xs text-gray-400 mt-0.5">Your personal health companion. I know your meds and logs!</p>
          </div>
          <button
            onClick={handleGenerateSummary}
            className="flex items-center gap-2 bg-[#4A6FA5] hover:bg-[#3d5d8f] text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            Generate Pre-Visit Summary
          </button>
        </div>

        {/* pre-visit summary panel */}
        {showSummary && (
          <div className="mx-8 mt-4 bg-white rounded-2xl border border-blue-100 shadow-sm flex-shrink-0">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-50">
              <div className="flex items-center gap-2">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4A6FA5" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                <p className="text-sm font-semibold text-gray-800">Pre-Visit Summary</p>
              </div>
              <button
                onClick={() => setShowSummary(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="px-5 py-4 max-h-64 overflow-y-auto">
              {summaryLoading ? (
                <div className="flex items-center gap-2 text-gray-400">
                  <div className="w-4 h-4 border-2 border-[#4A6FA5] border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">Generating your summary...</span>
                </div>
              ) : (
                <div className="prose prose-sm text-gray-700 space-y-1">
                  {renderMessage(summary || '')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* messages area */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {isEmpty ? (
            /* empty state */
            <div className="flex flex-col items-center justify-center h-full gap-6">
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4A6FA5" strokeWidth="1.5">
                    <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z"/>
                    <path d="M18.5 14.5l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9.9-2.4z"/>
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900">How can I help you today?</h2>
              </div>

              {/* quick action chips */}
              <div className="grid grid-cols-2 gap-3 w-full max-w-md">
                {quickActions.map((action, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(action.prompt)}
                    className="flex items-center gap-2.5 bg-white border border-gray-200 hover:border-[#4A6FA5]/40 hover:bg-blue-50/50 text-sm text-gray-600 font-medium px-4 py-3 rounded-xl transition-colors text-left"
                  >
                    <span className="text-[#4A6FA5] flex-shrink-0">{action.icon}</span>
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* message list */
            <div className="max-w-2xl mx-auto space-y-5">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  {/* avatar */}
                  {msg.role === 'assistant' ? (
                    <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4A6FA5" strokeWidth="1.8">
                        <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z"/>
                      </svg>
                    </div>
                  ) : (
                    <div className="w-8 h-8 bg-[#4A6FA5] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-semibold">
                        {user?.name?.charAt(0) || 'U'}
                      </span>
                    </div>
                  )}

                  {/* bubble */}
                  <div className={`max-w-[75%] px-4 py-3 rounded-2xl ${
                    msg.role === 'user'
                      ? 'bg-[#4A6FA5] text-white rounded-tr-sm'
                      : 'bg-white border border-gray-100 text-gray-700 rounded-tl-sm shadow-sm'
                  }`}>
                    {msg.role === 'user' ? (
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    ) : (
                      <div className="space-y-0.5">{renderMessage(msg.content)}</div>
                    )}
                  </div>
                </div>
              ))}

              {/* typing indicator */}
              {loading && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4A6FA5" strokeWidth="1.8">
                      <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z"/>
                    </svg>
                  </div>
                  <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* quick action chips when chat is active */}
        {!isEmpty && (
          <div className="px-8 pb-2 flex items-center gap-2 flex-shrink-0">
            <div className="max-w-2xl mx-auto w-full flex items-center gap-2 overflow-x-auto">
              {quickActions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(action.prompt)}
                  className="flex items-center gap-1.5 bg-white border border-gray-200 hover:border-[#4A6FA5]/40 text-xs text-gray-500 font-medium px-3 py-1.5 rounded-xl whitespace-nowrap transition-colors flex-shrink-0"
                >
                  <span className="text-[#4A6FA5]">{action.icon}</span>
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* input bar */}
        <div className="px-8 pb-6 pt-2 flex-shrink-0">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-end gap-3 bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm focus-within:border-[#4A6FA5]/50 transition-colors">
              <button className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 mb-0.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                </svg>
              </button>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me about your health data, symptoms, or medications..."
                rows={1}
                className="flex-1 text-sm text-gray-700 placeholder-gray-400 outline-none resize-none bg-transparent leading-relaxed"
                style={{ minHeight: '24px', maxHeight: '120px' }}
                onInput={e => {
                  e.target.style.height = 'auto'
                  e.target.style.height = e.target.scrollHeight + 'px'
                }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="w-8 h-8 bg-[#4A6FA5] hover:bg-[#3d5d8f] disabled:bg-gray-200 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center flex-shrink-0 transition-colors mb-0.5"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}