const FormSection = ({
  title,
  children,
  className = '',
  gridClassName = 'grid grid-cols-1 gap-4 md:grid-cols-2',
}) => (
  <section className={`rounded-xl border border-slate-200 bg-white p-6 shadow-sm ${className}`.trim()}>
    {title && (
      <h2 className="mb-4 text-lg font-medium text-slate-900">{title}</h2>
    )}
    <div className={gridClassName}>{children}</div>
  </section>
)

export default FormSection
