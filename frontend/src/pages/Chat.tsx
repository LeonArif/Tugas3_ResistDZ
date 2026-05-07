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
  timestamp: string
  decryptionFailed?: boolean
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
  const [messageInput, setMessageInput] = useState('')
  const [status, setStatus] = useState<{
    kind: 'idle' | 'loading' | 'success' | 'error'
    message: string
  }>({ kind: 'idle', message: '' })
  const [isInitializingChat, setIsInitializingChat] = useState(false)
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  const chatSession = useChatSession(selectedContactEmail, token, myEmail)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load daftar kontak
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

  const handleSendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!messageInput.trim() || !sessionReady) return

    try {
      setIsSendingMessage(true)
      setStatus({ kind: 'loading', message: 'Mengirim pesan...' })

      const newMessage = await chatSession.sendEncryptedMessage(messageInput.trim())
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
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
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
                                : msg.decryptionFailed
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-slate-100 text-slate-900'
                            }`}
                          >
                            <p className="text-sm break-words">{msg.plaintext}</p>
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