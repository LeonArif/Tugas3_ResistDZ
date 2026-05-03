import Footer from '../components/Footer'
import Navbar from '../components/Navbar'

const contacts = [
  { name: 'arga@crypto.chat', status: 'online' },
  { name: 'diero@crypto.chat', status: 'typing' },
  { name: 'resistdz@crypto.chat', status: 'idle' },
]

const messages = [
  {
    sender: 'arga@crypto.chat',
    body: 'Kalau login sudah selesai, nanti token JWT dipakai untuk akses chat.',
    time: '09:12',
  },
  {
    sender: 'you',
    body: 'Setelah itu baru key exchange ECDH dan AES untuk pesan ya.',
    time: '09:13',
  },
  {
    sender: 'arga@crypto.chat',
    body: 'Betul. Sekarang halaman ini masih desain placeholder dulu.',
    time: '09:14',
  },
]

const Chat = () => {
  const username = window.localStorage.getItem('authUsername') ?? 'guest'
  const email = window.localStorage.getItem('authEmail') ?? 'belum-login@local'
  const token = window.localStorage.getItem('authToken')

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.95),rgba(243,244,246,0.88)_35%,rgba(233,236,255,0.95)_100%)] text-slate-900">
      <Navbar />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <section className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr]">
          <aside className="rounded-4xl border border-slate-200 bg-white/85 p-6 shadow-[0_20px_80px_-32px_rgba(15,23,42,0.35)] backdrop-blur-xl sm:p-8">
            <p className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-violet-700">
              Chat dashboard
            </p>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950">
              Ruang chat terenkripsi
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Halaman ini masih desain placeholder. Nanti token JWT dari login akan dipakai
              untuk buka kontak, melakukan ECDH, dan kirim pesan AES.
            </p>

            <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
              <p className="font-semibold text-slate-800">Session info</p>
              <p className="mt-2">User: {username}</p>
              <p>Email: {email}</p>
              <p className="mt-2 break-all text-xs text-slate-500">
                JWT: {token ? `${token.slice(0, 26)}...` : 'belum ada token'}
              </p>
            </div>

            <div className="mt-6 space-y-3">
              {contacts.map((contact) => (
                <button
                  key={contact.name}
                  type="button"
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                >
                  <span>
                    <span className="block font-medium text-slate-900">{contact.name}</span>
                    <span className="text-xs text-slate-500">kontak demo</span>
                  </span>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    {contact.status}
                  </span>
                </button>
              ))}
            </div>
          </aside>

          <section className="flex min-h-170 flex-col rounded-4xl border border-slate-200 bg-white/85 shadow-[0_20px_80px_-32px_rgba(15,23,42,0.35)] backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 sm:px-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-700">
                  Conversation preview
                </p>
                <h3 className="mt-1 text-2xl font-semibold text-slate-950">
                  arga@crypto.chat
                </h3>
              </div>
              <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                ECDH + AES ready later
              </div>
            </div>

            <div className="flex-1 space-y-4 px-6 py-6 sm:px-8">
              {messages.map((message) => {
                const isMe = message.sender === 'you'

                return (
                  <div key={`${message.sender}-${message.time}`} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <article
                      className={`max-w-[78%] rounded-3xl px-4 py-3 shadow-sm ${
                        isMe ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-900'
                      }`}
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-70">
                        {message.sender}
                      </p>
                      <p className="mt-2 leading-7">{message.body}</p>
                      <p className={`mt-2 text-xs ${isMe ? 'text-slate-300' : 'text-slate-500'}`}>
                        {message.time}
                      </p>
                    </article>
                  </div>
                )
              })}
            </div>

            <div className="border-t border-slate-200 p-4 sm:p-6">
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 p-4">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    disabled
                    value="Composer placeholder — nanti disambung ke backend pesan"
                    className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 outline-none"
                  />
                  <button
                    type="button"
                    disabled
                    className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white opacity-60"
                  >
                    Kirim
                  </button>
                </div>
                <p className="mt-3 text-xs leading-6 text-slate-500">
                  Layout ini sudah siap untuk alur pesan terenkripsi, tapi backend pengiriman pesan belum dibuat.
                </p>
              </div>
            </div>
          </section>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default Chat