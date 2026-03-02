import { forwardRef } from 'react'

const baseClass = 'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500'
const labelClass = 'block text-sm font-medium text-slate-700'

const Textarea = forwardRef(({
  label,
  id,
  name,
  value = '',
  onChange,
  onBlur,
  placeholder,
  disabled,
  rows,
  className = '',
  error,
  ...rest
}, ref) => {
  const inputId = id ?? name
  return (
    <div>
      {label && (
        <label htmlFor={inputId} className={labelClass}>
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        name={name}
        {...(value !== undefined ? { value } : {})}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        className={`${baseClass} ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''} ${className}`.trim()}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...rest}
      />
      {error && (
        <p id={`${inputId}-error`} className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
})

Textarea.displayName = 'Textarea'

export default Textarea
