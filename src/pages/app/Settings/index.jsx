const Settings = () => {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="space-y-6">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-medium text-slate-900">Profile</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700">
                Name
              </label>
              <input
                id="name"
                type="text"
                placeholder="Your name"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-medium text-slate-900">Preferences</h2>
          <div className="space-y-3">
            <label className="flex cursor-pointer items-center gap-3">
              <input type="checkbox" className="h-4 w-4 rounded border-slate-300" />
              <span className="text-slate-700">Email notifications</span>
            </label>
            <label className="flex cursor-pointer items-center gap-3">
              <input type="checkbox" className="h-4 w-4 rounded border-slate-300" />
              <span className="text-slate-700">Dark mode</span>
            </label>
          </div>
        </section>

        <div>
          <button
            type="button"
            className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  )
}

export default Settings
