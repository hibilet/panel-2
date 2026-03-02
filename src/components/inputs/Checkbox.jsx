const Checkbox = ({
  label,
  id,
  name,
  checked = false,
  onChange,
  disabled,
  className = '',
}) => {
  const inputId = id ?? name
  return (
    <label className="flex cursor-pointer items-center">
      <input
        id={inputId}
        name={name}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className={`mr-2 h-4 w-4 rounded border-slate-300 ${className}`.trim()}
      />
      <span className="text-sm text-slate-700">{label}</span>
    </label>
  )
}

export default Checkbox
