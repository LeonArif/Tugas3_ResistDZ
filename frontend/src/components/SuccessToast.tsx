import { useEffect } from 'react'

type SuccessToastProps = {
  message: string
  duration?: number
  onClose?: () => void
  variant?: 'success' | 'error'
}

const SuccessToast = ({
  message,
  duration = 1000,
  onClose,
  variant = 'success',
}: SuccessToastProps) => {
  useEffect(() => {
    const t = setTimeout(() => onClose?.(), duration)
    return () => clearTimeout(t)
  }, [duration, onClose])

  const bgClass = variant === 'error' ? 'bg-rose-600' : 'bg-emerald-600'

  return (
    <div aria-live="polite" className="fixed inset-0 z-50 flex items-start justify-center pointer-events-none">
      <div className={`mt-8 pointer-events-auto rounded-xl ${bgClass} px-4 py-3 text-sm font-semibold text-white shadow-lg`}>
        {message}
      </div>
    </div>
  )
}

export default SuccessToast
