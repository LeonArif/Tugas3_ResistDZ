import { useState, useEffect, useRef, useCallback, type ChangeEvent, type FormEvent } from 'react'
import Footer from '../components/Footer'
import Navbar from '../components/Navbar'
import { useChatSession } from '../utils/useChat'
import { getContacts } from '../utils/api'

type ChatMessage = {
  sender_email: string
  receiver_email: string
  plaintext: string
  ciphertext: string
  iv: string
  mac: string
  mac_alg: string
  macExpected?: string
  timestamp: string
  decryptionFailed?: boolean
  macInvalid?: boolean
}

const POLLING_INTERVAL_MS = 3000

const Chat = () => {
  const token = window.localStorage.getItem('authToken') ?? ''
  const myEmail = window.localStorage.getItem('authEmail') ?? ''
  const myUsername = window.localStorage.getItem('authUsername') ?? ''
  const myPassword = window.localStorage.getItem('authPassword') ?? ''

  const [contacts, setContacts] = useState<{ email: string; username: string }[]>([])
  // Menggunakan '' bukan null agar hook bisa dipanggil unconditionally
  const [selectedContactEmail, setSelectedContactEmail] = useState<string>('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [messageInput, setMessageInput] = useState(() => {
    return window.localStorage.getItem('draftMessage') ?? ''
  })
  const [status, setStatus] = useState<{
    kind: 'idle' | 'loading' | 'success' | 'error'
    message: string
  }>({ kind: 'idle', message: '' })
  const [isInitializingChat, setIsInitializingChat] = useState(false)
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [macSimEnabled, setMacSimEnabled] = useState(() => {
    return window.localStorage.getItem('macSimEnabled') === 'true'
  })
  const [macSimMode, setMacSimMode] = useState<'auto' | 'manual'>(() => {
    const stored = window.localStorage.getItem('macSimMode')
    return stored === 'manual' ? 'manual' : 'auto'
  })
  const [macManualValue, setMacManualValue] = useState(() => {
    return window.localStorage.getItem('macManualValue') ?? ''
  })
  const [macPreview, setMacPreview] = useState('')
  const [macPreviewStatus, setMacPreviewStatus] = useState<'idle' | 'loading' | 'error'>('idle')

  const chatSession = useChatSession(selectedContactEmail, token, myEmail)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scrollToBottom = () => {
    const container = messagesContainerRef.current
    if (!container) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      return
    }

    requestAnimationFrame(() => {
      try {
        container.scrollTop = container.scrollHeight
      } catch (_) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }
    })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    window.localStorage.setItem('draftMessage', messageInput)
  }, [messageInput])

  useEffect(() => {
    window.localStorage.setItem('macSimEnabled', String(macSimEnabled))
  }, [macSimEnabled])

  useEffect(() => {
    window.localStorage.setItem('macSimMode', macSimMode)
  }, [macSimMode])

  useEffect(() => {
    window.localStorage.setItem('macManualValue', macManualValue)
  }, [macManualValue])

  useEffect(() => {
    if (!token) {
      window.location.href = '/login'
      return
    }

    const loadContacts = async () => {
      try {
        setStatus({ kind: 'loading', message: 'Memuat daftar kontak...' })
        const data = await getContacts(token)
        setContacts(data)
        setStatus({ kind: 'idle', message: '' })
      } catch (error) {
        if (error instanceof Error && error.message === 'UNAUTHORIZED') {
          window.localStorage.removeItem('authToken')
          window.localStorage.removeItem('authEmail')
          window.localStorage.removeItem('authUsername')
          window.localStorage.removeItem('authPassword')
          window.location.href = '/login'
          return
        }
        setStatus({
          kind: 'error',
          message: error instanceof Error ? error.message : 'Gagal memuat kontak',
        })
      }
    }

    loadContacts()
  }, [token])

  // Polling otomatis untuk menerima pesan baru dari contact
  const startPolling = useCallback((contactEmail: string) => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
    }

    pollingRef.current = setInterval(async () => {
      try {
        const latestMessages = await chatSession.loadMessageHistory(contactEmail)
        setMessages(latestMessages)
      } catch {
      }
    }, POLLING_INTERVAL_MS)
  }, [chatSession])

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }, [])

  // Hentikan polling saat component unmount
  useEffect(() => {
    return () => stopPolling()
  }, [stopPolling])

  const handleSelectContact = async (contactEmail: string) => {
    if (!contactEmail) return

    stopPolling()
    setSelectedContactEmail(contactEmail)
    setMessages([])
    setSessionReady(false)
    setMessageInput('')

    try {
      setIsInitializingChat(true)
      setStatus({ kind: 'loading', message: 'Memulai session chat...' })

      if (!myPassword) {
        throw new Error('Password tidak ditemukan, silakan login ulang')
      }

      await chatSession.initializeSession(myPassword, contactEmail)
      setStatus({ kind: 'success', message: 'Session chat berhasil dibuat' })
      setSessionReady(true)

      const messageHistory = await chatSession.loadMessageHistory(contactEmail)
      setMessages(messageHistory)

      // Mulai polling 
      startPolling(contactEmail)
    } catch (error) {
      setStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Gagal initialize chat',
      })
      setSessionReady(false)
      setSelectedContactEmail('')
    } finally {
      setIsInitializingChat(false)
    }
  }

  useEffect(() => {
    if (!selectedContactEmail || !sessionReady) return

    stopPolling()
    startPolling(selectedContactEmail)

    const refreshMessages = async () => {
      try {
        const latestMessages = await chatSession.loadMessageHistory(selectedContactEmail)
        setMessages(latestMessages)
      } catch {
      }
    }

    refreshMessages()
  }, [
    selectedContactEmail,
    sessionReady,
    startPolling,
    stopPolling,
    chatSession,
  ])

  useEffect(() => {
    if (!sessionReady || !messageInput.trim()) {
      setMacPreviewStatus('idle')
      return
    }

    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current)
    }

    setMacPreviewStatus('loading')
    previewTimerRef.current = setTimeout(async () => {
      try {
        const preview = await chatSession.previewMacForDraft(messageInput.trim())
        setMacPreview(preview)
        setMacPreviewStatus('idle')
      } catch {
        setMacPreviewStatus('error')
      }
    }, 50)

    return () => {
      if (previewTimerRef.current) {
        clearTimeout(previewTimerRef.current)
      }
    }
  }, [messageInput, sessionReady, chatSession])

  const handleSendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!messageInput.trim() || !sessionReady) return
    if (macSimEnabled && macSimMode === 'manual' && !macManualValue.trim()) {
      setStatus({ kind: 'error', message: 'Nilai MAC manual belum diisi' })
      return
    }

    try {
      setIsSendingMessage(true)
      setStatus({ kind: 'loading', message: 'Mengirim pesan...' })

      const newMessage = await chatSession.sendEncryptedMessage(messageInput.trim(), {
        simulate: macSimEnabled,
        manualMac: macSimEnabled && macSimMode === 'manual' ? macManualValue : undefined,
      })
      setMessages((prev) => [...prev, newMessage])
      setMessageInput('')

      setStatus({ kind: 'success', message: 'Pesan terkirim' })
      setTimeout(() => setStatus({ kind: 'idle', message: '' }), 2000)
    } catch (error) {
      setStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Gagal mengirim pesan',
      })
    } finally {
      setIsSendingMessage(false)
    }
  }

  const handleLogout = () => {
    stopPolling()
    window.localStorage.removeItem('authToken')
    window.localStorage.removeItem('authEmail')
    window.localStorage.removeItem('authUsername')
    window.localStorage.removeItem('authPassword')
    window.location.href = '/login'
  }

  const lastMacStatus = messages.length
    ? messages[messages.length - 1].macInvalid
      ? 'FAILED'
      : 'OK'
    : '-'

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.95),rgba(243,244,246,0.88)_35%,rgba(233,236,255,0.95)_100%)] text-slate-900">
      <Navbar />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {status.kind !== 'idle' && (
          <div
            className={`rounded-2xl border px-4 py-3 ${
              status.kind === 'error'
                ? 'border-red-200 bg-red-50 text-red-700'
                : status.kind === 'success'
                  ? 'border-green-200 bg-green-50 text-green-700'
                  : 'border-blue-200 bg-blue-50 text-blue-700'
            }`}
          >
            {status.message}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <aside className="rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-[0_20px_80px_-32px_rgba(15,23,42,0.35)] backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-950">Kontak</h3>
              <button
                onClick={handleLogout}
                className="rounded-lg bg-red-100 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-200"
              >
                Logout
              </button>
            </div>

            <p className="mb-4 text-sm text-slate-500">
              Halo, <strong>{myUsername}</strong> ({myEmail})
            </p>

            <div className="space-y-2">
              {contacts.length === 0 ? (
                <p className="text-sm text-slate-400">Belum ada kontak lain</p>
              ) : (
                contacts.map((contact) => (
                  <button
                    key={contact.email}
                    onClick={() => handleSelectContact(contact.email)}
                    className={`w-full rounded-xl border px-3 py-3 text-left text-sm transition ${
                      selectedContactEmail === contact.email
                        ? 'border-violet-400 bg-violet-50 font-medium text-violet-900'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100'
                    }`}
                    disabled={isInitializingChat}
                  >
                    <div className="font-medium">{contact.username}</div>
                    <div className="text-xs opacity-75">{contact.email}</div>
                  </button>
                ))
              )}
            </div>
          </aside>

          <div className="rounded-3xl border border-slate-200 bg-white/85 shadow-[0_20px_80px_-32px_rgba(15,23,42,0.35)] backdrop-blur-xl flex flex-col overflow-hidden">
            {selectedContactEmail ? (
              <>
                <div className="border-b border-slate-200 bg-gradient-to-r from-violet-50 to-blue-50 px-6 py-4">
                  <p className="text-sm text-slate-600">Chat dengan</p>
                  <h3 className="text-lg font-semibold text-slate-950">
                    {contacts.find((c) => c.email === selectedContactEmail)?.username ||
                      selectedContactEmail}
                  </h3>
                  {sessionReady && (
                    <p className="mt-1 text-xs text-green-600">
                      ✓ Chat session ready
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                    <span className="rounded-full border border-slate-200 bg-white/80 px-2 py-0.5">
                      MAC: {lastMacStatus}
                    </span>
                  </div>
                </div>

                <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4">
                  {isInitializingChat ? (
                    <div className="flex h-full items-center justify-center">
                      <p className="text-sm text-slate-400">Menginisialisasi sesi chat...</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-center">
                      <div className="text-slate-400">
                        <p className="text-sm">Belum ada pesan</p>
                        <p className="text-xs">Mulai percakapan dengan mengirim pesan</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {messages.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`flex ${msg.sender_email === myEmail ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`rounded-2xl max-w-xs px-4 py-3 ${
                              msg.sender_email === myEmail
                                ? 'bg-violet-100 text-slate-900'
                                : msg.macInvalid
                                  ? 'bg-rose-100 text-rose-800'
                                  : msg.decryptionFailed
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-slate-100 text-slate-900'
                            }`}
                          >
                            <p className="text-sm break-words">{msg.plaintext}</p>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                  msg.macInvalid
                                    ? 'bg-rose-200 text-rose-800'
                                    : 'bg-emerald-200 text-emerald-800'
                                }`}
                              >
                                {msg.macInvalid ? 'MAC gagal' : 'MAC ok'}
                              </span>
                              <span className="rounded-full bg-white/80 px-2 py-0.5">
                                {msg.mac_alg}
                              </span>
                            </div>
                            <p className="mt-1 break-all text-[11px] text-slate-500">
                              {msg.sender_email === myEmail ? 'MAC dibuat' : 'MAC diterima'}: {msg.mac}
                            </p>
                            {msg.macExpected && (
                              <p className="mt-1 break-all text-[11px] text-slate-500">
                                MAC dihitung: {msg.macExpected}
                              </p>
                            )}
                            {msg.macInvalid && (
                              <p className="mt-1 text-[11px] font-medium text-rose-700">
                                MAC Verification Failed. Message Integrity Compromised. Message Rejected.
                              </p>
                            )}
                            <p className="mt-1 text-xs opacity-50">
                              {new Date(msg.timestamp).toLocaleTimeString('id-ID')}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                <form
                  onSubmit={handleSendMessage}
                  className="border-t border-slate-200 bg-slate-50 p-4"
                >
                  <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={macSimEnabled}
                        onChange={(event) => setMacSimEnabled(event.target.checked)}
                        className="h-3.5 w-3.5 rounded border-slate-300"
                      />
                      Simulasi MAC (pengirim)
                    </label>
                    <select
                      value={macSimMode}
                      onChange={(event) => setMacSimMode(event.target.value as 'auto' | 'manual')}
                      disabled={!macSimEnabled}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 disabled:bg-slate-100"
                    >
                      <option value="auto">Ubah 1 karakter otomatis</option>
                      <option value="manual">Ubah MAC manual</option>
                    </select>
                    {macSimEnabled && macSimMode === 'manual' && (
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          value={macManualValue}
                          onChange={(event) => setMacManualValue(event.target.value)}
                          className="min-w-[200px] rounded-lg border border-slate-200 px-2 py-1 text-xs"
                          placeholder="MAC hex manual (misal: 5fe...)"
                        />
                        {macPreview && (
                          <button
                            type="button"
                            onClick={() => setMacManualValue(macPreview)}
                            className="rounded-md border border-slate-200 px-2 py-1 text-[11px]"
                          >
                            Gunakan MAC preview
                          </button>
                        )}
                      </div>
                    )}
                    <span className="text-[11px] text-slate-500">
                      {macPreviewStatus === 'error'
                        ? 'Gagal menghitung MAC preview.'
                        : macPreview
                          ? `MAC preview: ${macPreview}`
                          : messageInput.trim()
                            ? 'Menghitung MAC preview...'
                            : 'Ketik pesan untuk melihat MAC preview.'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={messageInput}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setMessageInput(e.target.value)
                      }
                      placeholder="Ketik pesan..."
                      disabled={!sessionReady || isSendingMessage}
                      className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:bg-slate-100 disabled:text-slate-400"
                    />
                    <button
                      type="submit"
                      disabled={!sessionReady || !messageInput.trim() || isSendingMessage}
                      className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
                    >
                      {isSendingMessage ? 'Mengirim...' : 'Kirim'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center p-6">
                <p className="text-slate-600">Pilih kontak untuk memulai chat</p>
                <p className="text-xs text-slate-400">
                  Chat terenkripsi dengan AES-256-GCM akan dimulai otomatis
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default Chat