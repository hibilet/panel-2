import { forwardRef } from 'react'

const Checkbox = forwardRef(({
  label,
  id,
  name,
  checked = false,
  onChange,
  onBlur,
  disabled,
  className = '',
  error,
}, ref) => {
  const inputId = id ?? name
  return (
    <div>
      <label className="flex cursor-pointer items-center">
        <input
          ref={ref}
          id={inputId}
          name={name}
          type="checkbox"
          {...(checked !== undefined ? { checked } : {})}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          className={`mr-2 h-4 w-4 rounded border-slate-300 ${className}`.trim()}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
        />
        <span className="text-sm text-slate-700">{label}</span>
      </label>
      {error && (
        <p id={`${inputId}-error`} className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
})

Checkbox.displayName = 'Checkbox'

export default Checkbox
