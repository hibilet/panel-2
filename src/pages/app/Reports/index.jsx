import { Link } from 'wouter'

const Reports = () => {
  const reports = [] // placeholder

  return (
    <div className="mx-auto max-w-5xl">
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {reports.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <i className="fa-solid fa-chart-line mb-3 text-4xl text-slate-300" aria-hidden />
            <p>No reports yet</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-200">
            {reports.map((report) => (
              <li key={report.id}>
                <Link
                  href={`/reports/${report.id}`}
                  className="flex items-center justify-between p-4 hover:bg-slate-50"
                >
                  <span>{report.id}</span>
                  <i className="fa-solid fa-chevron-right text-slate-400" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default Reports
