import { Link } from 'wouter'

const SaleNew = () => {
  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/sales"
        className="mb-4 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
      >
        <i className="fa-solid fa-arrow-left" aria-hidden />
        Back to Sales
      </Link>
      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Create New Sale</h2>
        <p className="mt-2 text-sm text-slate-600">
          New sale form coming soon.
        </p>
      </div>
    </div>
  )
}

export default SaleNew
