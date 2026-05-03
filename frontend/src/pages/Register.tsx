import { useState, type ChangeEvent, type FormEvent } from 'react'
import Footer from '../components/Footer'
import Navbar from '../components/Navbar'

type RegisterForm = {
  username: string
  email: string
  password: string
  confirmPassword: string
}

type RegisterResponse = {
  username: string
  email: string
  message: string
}

const initialForm: RegisterForm = {
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
}

const Register = () => {
  const [form, setForm] = useState<RegisterForm>(initialForm)
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

    if (form.password !== form.confirmPassword) {
      setStatus({ kind: 'error', message: 'Password dan konfirmasi tidak sama.' })
      return
    }

    setIsSubmitting(true)
    setStatus({ kind: 'idle', message: '' })

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: form.username.trim(),
          email: form.email.trim(),
          password: form.password,
        }),
      })

      const data: RegisterResponse | { detail?: string } = await response.json()

      if (!response.ok) {
        const errorMessage =
          'detail' in data && typeof data.detail === 'string'
            ? data.detail
            : 'Registrasi gagal.'
        throw new Error(errorMessage)
      }

      const successData = data as RegisterResponse

      setStatus({
        kind: 'success',
        message: `${successData.message} Akun ${successData.username} (${successData.email}) berhasil dibuat.`,
      })
      setForm(initialForm)
    } catch (error) {
      setStatus({
        kind: 'error',
        message:
          error instanceof Error ? error.message : 'Terjadi kesalahan saat registrasi.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.95),rgba(243,244,246,0.88)_35%,rgba(233,236,255,0.95)_100%)] text-slate-900">
      <Navbar />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="overflow-hidden rounded-4xl border border-white/70 bg-white/75 p-8 shadow-[0_20px_80px_-32px_rgba(15,23,42,0.35)] backdrop-blur-xl sm:p-10 lg:p-12">
            <p className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-indigo-700">
              Registration flow
            </p>
            <h2 className="mt-6 max-w-xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              Buat akun dulu, lalu lanjut ke login JWT dan chat terenkripsi.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
              Page ini langsung mengirim data registrasi ke backend FastAPI. Backend
              akan memproses hash password, menyimpan public key, dan mengenkripsi
              private key sebelum menyimpannya ke database.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                'Password di-hash + salt',
                'ECDH keypair dibuat di server',
                'Private key disimpan terenkripsi',
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm font-medium text-slate-700 shadow-sm"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-4xl border border-slate-200 bg-white/85 p-6 shadow-[0_20px_80px_-32px_rgba(15,23,42,0.35)] backdrop-blur-xl sm:p-8">
            <div className="mb-6">
              <h3 className="text-2xl font-semibold text-slate-950">Registrasi akun</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Isi form ini untuk membuat akun baru di sistem.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="username">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  placeholder="resistdz"
                  autoComplete="username"
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                />
              </div>

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
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
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
                  placeholder="minimal 1 karakter"
                  autoComplete="new-password"
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="confirmPassword">
                  Konfirmasi password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="ulangi password"
                  autoComplete="new-password"
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? 'Mendaftarkan...' : 'Buat akun'}
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
              Sudah punya akun?{' '}
              <a href="/login" className="font-semibold text-indigo-700 underline-offset-4 hover:underline">
                lanjut ke halaman login
              </a>
              .
            </div>

            <p className="mt-4 text-xs leading-5 text-slate-500">
              Fetch mengarah ke <span className="font-semibold text-slate-700">/api/register</span>
              melalui proxy Vite ke backend FastAPI di <span className="font-semibold text-slate-700">localhost:8000</span>.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default Register