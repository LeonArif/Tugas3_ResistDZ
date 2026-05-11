import { useState, type ChangeEvent, type FormEvent } from 'react'
import AuthInput from '../components/AuthInput'
import AuthLayout from '../components/AuthLayout'
import SuccessToast from '../components/SuccessToast'

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
  const [errors, setErrors] = useState<Partial<Record<keyof LoginForm, string>>>({})
  const [status, setStatus] = useState<{
    kind: 'idle' | 'success' | 'error'
    message: string
  }>({ kind: 'idle', message: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showToast, setShowToast] = useState(false)

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    const field = name as keyof LoginForm

    setForm((current) => ({
      ...current,
      [name]: value,
    }))

    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current))
  }

  const validateForm = () => {
    const nextErrors: Partial<Record<keyof LoginForm, string>> = {}
    const email = form.email.trim()

    if (!email) {
      nextErrors.email = 'Email wajib diisi.'
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      nextErrors.email = 'Format email tidak valid.'
    }

    if (!form.password) {
      nextErrors.password = 'Password wajib diisi.'
    }

    return nextErrors
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const validationErrors = validateForm()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      setStatus({ kind: 'error', message: 'Periksa kembali input yang masih salah.' })
      setShowToast(true)
      return
    }

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

      const responseText = await response.text()
      const data: LoginResponse | { detail?: string } | null = responseText
        ? (() => {
            try {
              return JSON.parse(responseText) as LoginResponse | { detail?: string }
            } catch {
              return null
            }
          })()
        : null

      if (!response.ok) {
        const errorMessage =
          data && 'detail' in data && typeof data.detail === 'string'
            ? data.detail
            : responseText.trim() || 'Login gagal.'
        throw new Error(errorMessage)
      }

      if (
        !data ||
        typeof data !== 'object' ||
        !('token' in data) ||
        !('username' in data) ||
        !('email' in data) ||
        !('message' in data)
      ) {
        throw new Error('Response login tidak valid.')
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
      setShowToast(true)

      window.setTimeout(() => {
        setShowToast(false)
        window.location.href = '/chat'
      }, 1000)
    } catch (error) {
      setStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Terjadi kesalahan saat login.',
      })
      setShowToast(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <AuthLayout
        title="Login akun"
        subtitle="Masukkan email dan password yang sudah kamu daftarkan."
        submitLabel="Masuk"
        submittingLabel="Login..."
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        status={status}
        footerText="Belum punya akun?"
        footerLinkText="daftar dulu"
        footerHref="/register"
      >
      <AuthInput
        id="email"
        name="email"
        type="email"
        label="Email"
        value={form.email}
        onChange={handleChange}
        placeholder="nama@email.com"
        autoComplete="email"
        required
        error={errors.email}
      />
      <AuthInput
        id="password"
        name="password"
        type={showPassword ? 'text' : 'password'}
        label="Password"
        value={form.password}
        onChange={handleChange}
        placeholder="password kamu"
        autoComplete="current-password"
        required
        error={errors.password}
        rightSlot={
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="rounded-full px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            {showPassword ? 'Sembunyikan' : 'Lihat'}
          </button>
        }
      />
    </AuthLayout>
      {showToast && (
        <SuccessToast
          message={status.message}
          duration={1000}
          variant={status.kind === 'error' ? 'error' : 'success'}
          onClose={() => setShowToast(false)}
        />
      )}
    </>
  )
}

export default Login