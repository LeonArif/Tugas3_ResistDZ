import { useState, type ChangeEvent, type FormEvent } from 'react'
import Footer from '../components/Footer'
import Navbar from '../components/Navbar'

type LoginForm = {
  email: string
  password: string
}

type LoginResponse = {
  message: string
  token: string
  username: string
  email: string
}

const initialForm: LoginForm = {
  email: '',
  password: '',
}

const Login = () => {
  const [form, setForm] = useState<LoginForm>(initialForm)
  const [status, setStatus] = useState<{
    kind: 'idle' | 'success' | 'error'
    message: string
  }>({ kind: 'idle', message: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setStatus({ kind: 'idle', message: '' })

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
        }),
      })

      const data: LoginResponse | { detail?: string } = await response.json()

      if (!response.ok) {
        const errorMessage =
          'detail' in data && typeof data.detail === 'string' ? data.detail : 'Login gagal.'
        throw new Error(errorMessage)
      }

      const successData = data as LoginResponse
      window.localStorage.setItem('authToken', successData.token)
      window.localStorage.setItem('authEmail', successData.email)
      window.localStorage.setItem('authUsername', successData.username)
      window.localStorage.setItem('authPassword', form.password)

      setStatus({
        kind: 'success',
        message: `${successData.message} Token JWT tersimpan dan siap dipakai.`,
      })

      window.setTimeout(() => {
        window.location.href = '/chat'
      }, 700)
    } catch (error) {
      setStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Terjadi kesalahan saat login.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.95),_rgba(243,244,246,0.88)_35%,_rgba(233,236,255,0.95)_100%)] text-slate-900">
      <Navbar />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <section className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-white/85 p-6 shadow-[0_20px_80px_-32px_rgba(15,23,42,0.35)] backdrop-blur-xl sm:p-8">
            <p className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
              JWT login
            </p>
            <h2 className="mt-6 max-w-xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              Login untuk menerima token JWT dari backend FastAPI.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
              Setelah password sesuai, backend akan menandatangani token dengan ECDSA,
              lalu frontend menyimpannya supaya dapat dipakai di request berikutnya.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                'Password diverifikasi dengan hash + salt',
                'JWT ditandatangani server-wide',
                'Token disimpan di localStorage',
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm font-medium text-slate-700 shadow-sm"
                >
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50/80 p-5 text-sm leading-7 text-slate-600">
              Token akan dipakai lagi saat nanti halaman chat benar-benar tersambung ke
              backend pesan dan validasi akses.
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white/85 p-6 shadow-[0_20px_80px_-32px_rgba(15,23,42,0.35)] backdrop-blur-xl sm:p-8">
            <div className="mb-6">
              <h3 className="text-2xl font-semibold text-slate-950">Login akun</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Masukkan email dan password yang sudah kamu daftarkan.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="nama@email.com"
                  autoComplete="email"
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="password kamu"
                  autoComplete="current-password"
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? 'Login...' : 'Masuk'}
              </button>
            </form>

            {status.kind !== 'idle' ? (
              <div
                className={`mt-4 rounded-2xl border px-4 py-3 text-sm leading-6 ${
                  status.kind === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-rose-200 bg-rose-50 text-rose-800'
                }`}
              >
                {status.message}
              </div>
            ) : null}

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Belum punya akun?{' '}
              <a href="/register" className="font-semibold text-indigo-700 underline-offset-4 hover:underline">
                daftar dulu
              </a>
              .
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default Login