const baseClass = 'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500'
const labelClass = 'block text-sm font-medium text-slate-700'

const Select = ({
  label,
  id,
  name,
  value = '',
  onChange,
  options = [],
  placeholder,
  disabled,
  className = '',
  ...rest
}) => {
  const inputId = id ?? name
  return (
    <label className={labelClass}>
      {label}
      <select
        id={inputId}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`${baseClass} ${className}`.trim()}
        {...rest}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export default Select
