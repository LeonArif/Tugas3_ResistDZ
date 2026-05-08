import { useEffect } from 'react'

type SuccessToastProps = {
  message: string
  duration?: number
  onClose?: () => void
}

const SuccessToast = ({ message, duration = 1000, onClose }: SuccessToastProps) => {
  useEffect(() => {
    const t = setTimeout(() => onClose?.(), duration)
    return () => clearTimeout(t)
  }, [duration, onClose])

  return (
    <div aria-live="polite" className="fixed inset-0 z-50 flex items-start justify-center pointer-events-none">
      <div className="mt-8 pointer-events-auto rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg">
        {message}
      </div>
    </div>
  )
}

export default SuccessToast
