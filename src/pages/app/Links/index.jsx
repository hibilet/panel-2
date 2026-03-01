import { Link } from 'wouter'

const Links = () => {
  const links = [] // placeholder

  return (
    <div className="mx-auto max-w-5xl">
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {links.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <i className="fa-solid fa-link mb-3 text-4xl text-slate-300" aria-hidden />
            <p>No links yet</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-200">
            {links.map((link) => (
              <li key={link.id}>
                <Link
                  href={`/links/${link.id}`}
                  className="flex items-center justify-between p-4 hover:bg-slate-50"
                >
                  <span>{link.id}</span>
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

export default Links
