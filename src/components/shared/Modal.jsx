import { useEffect } from 'react'
import strings from '../../localization'

const MAX_WIDTH_CLASS = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl',
}

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  headerActions,
  footer,
  bodyRef,
  maxWidth = 'md',
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
}) => {
  const titleId = 'modal-title'

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', onKeyDown)
      return () => window.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={ariaLabelledBy ?? (title ? titleId : undefined)}
      aria-label={!title ? ariaLabel : undefined}
    >
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
        aria-hidden
        onClick={onClose}
      />
      <div
        className={`relative z-10 flex max-h-[90vh] w-full ${MAX_WIDTH_CLASS[maxWidth] ?? MAX_WIDTH_CLASS.md} flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl`}
      >
        {(title || headerActions) && (
          <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
            {title && (
              <h2 id={titleId} className="text-xl font-semibold text-slate-900">
                {title}
              </h2>
            )}
            <div className="ml-auto flex items-center gap-2">
              {headerActions}
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label={strings('common.ariaClose')}
              >
                <i className="fa-solid fa-xmark text-lg" aria-hidden />
              </button>
            </div>
          </header>
        )}
        <div
          ref={bodyRef}
          className="flex-1 overflow-y-auto p-6"
        >
          {children}
        </div>
        {footer && (
          <footer className="shrink-0 border-t border-slate-200 px-6 py-4">
            {footer}
          </footer>
        )}
      </div>
    </div>
  )
}

export default Modal
