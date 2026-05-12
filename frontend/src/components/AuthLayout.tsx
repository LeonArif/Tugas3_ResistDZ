import { type FormEvent, type ReactNode } from 'react'
import Navbar from './Navbar'

type AuthStatus = {
  kind: 'idle' | 'success' | 'error'
  message: string
}

type AuthLayoutProps = {
  title: string
  subtitle: string
  submitLabel: string
  submittingLabel: string
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  isSubmitting: boolean
  status: AuthStatus
  footerText: string
  footerLinkText: string
  footerHref: string
  children: ReactNode
}

const AuthLayout = ({
  title,
  subtitle,
  submitLabel,
  submittingLabel,
  onSubmit,
  isSubmitting,
  status,
  footerText,
  footerLinkText,
  footerHref,
  children,
}: AuthLayoutProps) => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.98),_rgba(240,249,255,0.92)_35%,_rgba(226,232,240,0.96)_100%)] text-slate-900">
      <div className="pointer-events-none absolute -top-32 right-0 h-72 w-72 rounded-full bg-slate-200/50 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 left-0 h-72 w-72 rounded-full bg-slate-200/40 blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-24 h-64 w-64 -translate-x-1/2 rounded-full bg-slate-100/70 blur-3xl" />

      <Navbar />

      <main className="relative mx-auto flex min-h-[calc(100svh-96px)] w-full max-w-7xl flex-1 flex-col justify-center gap-10 px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="relative flex items-center justify-center">
            <div className="relative w-full max-w-[520px]">
                <div className="absolute -left-6 -top-6 h-12 w-12 rounded-2xl bg-transparent" />
                <div className="absolute -bottom-6 -right-6 h-14 w-14 rounded-full bg-transparent" />

                <img
                src="/opening-image.png"
                alt="Ilustrasi keamanan"
                className="block h-[574px] w-full rounded-[2.5rem] object-cover grayscale"
                />
            </div>
            </div>

          <div className="w-full max-w-[1000px] justify-self-center rounded-[2.5rem] border border-slate-200/70 bg-white/92 p-6 shadow-[0_20px_80px_-32px_rgba(15,23,42,0.35)] backdrop-blur-md sm:p-8 lg:justify-self-end">
            <div className="flex min-h-[574px] flex-col">
              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-3xl font-bold text-slate-950">{title}</h3>
                  <p className="text-base leading-6 text-slate-500">{subtitle}</p>
                </div>

                {status.kind !== 'idle' && status.message && (
                  <div
                    className={`rounded-2xl border px-4 py-3 text-sm ${
                      status.kind === 'error'
                        ? 'border-rose-200 bg-rose-50 text-rose-700'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {status.message}
                  </div>
                )}

                <form className="space-y-4" onSubmit={onSubmit}>
                  {children}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_-18px_rgba(15,23,42,0.6)] transition hover:-translate-y-0.5 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSubmitting ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        {submittingLabel}
                      </span>
                    ) : (
                      submitLabel
                    )}
                  </button>
                </form>
              </div>

              <div className="mt-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  {footerText}{' '}
                  <a
                    href={footerHref}
                    className="font-semibold text-slate-900 underline-offset-4 transition hover:underline"
                  >
                    {footerLinkText}
                  </a>
                  .
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default AuthLayout
