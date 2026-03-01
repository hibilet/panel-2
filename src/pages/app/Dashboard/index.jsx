const Dashboard = () => {
  return (
    <div className="mx-auto max-w-5xl">
      <section aria-labelledby="stats-heading" className="mb-8">
        <h2 id="stats-heading" className="sr-only">Quick stats</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Today&apos;s Sales</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">₺0</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Transactions</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">0</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Active Links</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">0</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Accounts</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">0</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="recent-heading">
        <h2 id="recent-heading" className="mb-4 text-lg font-medium text-slate-900">
          Recent activity
        </h2>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-center text-slate-500">No recent activity</p>
        </div>
      </section>
    </div>
  )
}

export default Dashboard
