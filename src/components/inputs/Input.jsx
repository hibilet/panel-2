const baseClass = 'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500'
const labelClass = 'block text-sm font-medium text-slate-700'

const Input = ({
  label,
  id,
  name,
  type = 'text',
  value = '',
  onChange,
  placeholder,
  disabled,
  className = '',
  ...rest
}) => {
  const inputId = id ?? name
  const inputEl = (
    <input
        id={inputId}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`${baseClass} ${className}`.trim()}
        {...rest}
      />
  )
  if (!label) return inputEl
  return (
    <label className={labelClass}>
      {label}
      {inputEl}
    </label>
  )
}

export default Input
