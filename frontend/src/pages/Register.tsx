import { useState, type ChangeEvent, type FormEvent } from 'react'
import AuthInput from '../components/AuthInput'
import AuthLayout from '../components/AuthLayout'
import SuccessToast from '../components/SuccessToast'
import { useRegistration } from '../utils/useChat'

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
  const [errors, setErrors] = useState<Partial<Record<keyof RegisterForm, string>>>({})
  const [status, setStatus] = useState<{
    kind: 'idle' | 'success' | 'error'
    message: string
  }>({ kind: 'idle', message: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const registration = useRegistration()

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    const field = name as keyof RegisterForm

    setForm((current) => ({
      ...current,
      [name]: value,
    }))

    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current))
  }

  const validateForm = () => {
    const nextErrors: Partial<Record<keyof RegisterForm, string>> = {}
    const email = form.email.trim()

    if (!form.username.trim()) {
      nextErrors.username = 'Username wajib diisi.'
    }

    if (!email) {
      nextErrors.email = 'Email wajib diisi.'
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      nextErrors.email = 'Format email tidak valid.'
    }

    if (!form.password) {
      nextErrors.password = 'Password wajib diisi.'
    }

    if (!form.confirmPassword) {
      nextErrors.confirmPassword = 'Konfirmasi password wajib diisi.'
    } else if (form.password !== form.confirmPassword) {
      nextErrors.confirmPassword = 'Password dan konfirmasi tidak sama.'
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
      // Generate ECDH keypair
      const { privateKey, publicKeyB64 } = await registration.generateKeypair()

      // Send ke backend dengan public key
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: form.username.trim(),
          email: form.email.trim(),
          password: form.password,
          public_key: publicKeyB64,
        }),
      })

      const responseText = await response.text()
      const data: RegisterResponse | { detail?: string } | null = responseText
        ? (() => {
            try {
              return JSON.parse(responseText) as RegisterResponse | { detail?: string }
            } catch {
              return null
            }
          })()
        : null

      if (!response.ok) {
        const errorMessage =
          data && 'detail' in data && typeof data.detail === 'string'
            ? data.detail
            : responseText.trim() || 'Registrasi gagal.'
        throw new Error(errorMessage)
      }

      if (
        !data ||
        typeof data !== 'object' ||
        !('username' in data) ||
        !('email' in data) ||
        !('message' in data)
      ) {
        throw new Error('Response registrasi tidak valid.')
      }

      const successData = data as RegisterResponse

      // Save private key ke localStorage dengan enkripsi with password
      await registration.savePrivateKey(privateKey, form.password, form.email.trim())
      const msg = `${successData.message} Akun ${successData.username} (${successData.email}) berhasil dibuat. Private key tersimpan aman.`

      setStatus({ kind: 'success', message: msg })
      setShowToast(true)

      registration.clearTemp()
      setForm(initialForm)

      // Tampilkan toast sukses selama 1 detik lalu redirect ke login
      window.setTimeout(() => {
        setShowToast(false)
        window.location.href = '/login'
      }, 1000)
    } catch (error) {
      setStatus({
        kind: 'error',
        message:
          error instanceof Error ? error.message : 'Terjadi kesalahan saat registrasi.',
      })
      setShowToast(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <AuthLayout
        title="Registrasi akun"
        subtitle="Isi form ini untuk membuat akun baru di sistem."
        submitLabel="Buat akun"
        submittingLabel="Mendaftarkan..."
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        status={status}
        footerText="Sudah punya akun?"
        footerLinkText="lanjut ke halaman login"
        footerHref="/login"
      >
      <AuthInput
        id="username"
        name="username"
        label="Username"
        value={form.username}
        onChange={handleChange}
        placeholder="resistdz"
        autoComplete="username"
        required
        error={errors.username}
      />
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
        placeholder="minimal 1 karakter"
        autoComplete="new-password"
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
      <AuthInput
        id="confirmPassword"
        name="confirmPassword"
        type={showConfirmPassword ? 'text' : 'password'}
        label="Konfirmasi password"
        value={form.confirmPassword}
        onChange={handleChange}
        placeholder="ulangi password"
        autoComplete="new-password"
        required
        error={errors.confirmPassword}
        rightSlot={
          <button
            type="button"
            onClick={() => setShowConfirmPassword((current) => !current)}
            className="rounded-full px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            {showConfirmPassword ? 'Sembunyikan' : 'Lihat'}
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

export default Register