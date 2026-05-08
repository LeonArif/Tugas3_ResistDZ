import { type ChangeEvent, type ReactNode } from 'react'

type AuthInputProps = {
  id: string
  name: string
  label: string
  type?: string
  value: string
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  autoComplete?: string
  required?: boolean
  error?: string
  rightSlot?: ReactNode
}

const AuthInput = ({
  id,
  name,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoComplete,
  required,
  error,
  rightSlot,
}: AuthInputProps) => {
  const errorId = error ? `${id}-error` : undefined
  const paddingClass = rightSlot ? 'pr-14' : 'pr-4'

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          className={`w-full rounded-2xl border bg-slate-50 px-4 py-3 ${paddingClass} text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-4 ${
            error
              ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100'
              : 'border-slate-200 focus:border-slate-400 focus:ring-slate-200'
          }`}
        />
        {rightSlot ? (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightSlot}</div>
        ) : null}
      </div>
      {error ? (
        <p id={errorId} className="mt-2 text-xs text-rose-600">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export default AuthInput
