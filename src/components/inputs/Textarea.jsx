const baseClass = 'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500'
const labelClass = 'block text-sm font-medium text-slate-700'

const Textarea = ({
  label,
  id,
  name,
  value = '',
  onChange,
  placeholder,
  disabled,
  rows,
  className = '',
  ...rest
}) => {
  const inputId = id ?? name
  return (
    <label className={labelClass}>
      {label}
      <textarea
        id={inputId}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        className={`${baseClass} ${className}`.trim()}
        {...rest}
      />
    </label>
  )
}

export default Textarea
