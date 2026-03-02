const SlidePanel = ({
  isOpen,
  onClose,
  title,
  children,
  'aria-label': ariaLabel,
}) => {
  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-[2px]"
        aria-hidden
        onClick={onClose}
      />
      <aside
        className="fixed inset-y-0 right-0 z-50 w-full max-w-lg overflow-y-auto border-l border-slate-200 bg-white shadow-xl"
        aria-label={ariaLabel ?? title}
      >
        {children}
      </aside>
    </>
  )
}

export default SlidePanel
