import { Link } from 'wouter'
import strings from '../../../localization'

const Accounts = () => {
  const accounts = [] // placeholder

  return (
    <div className="mx-auto max-w-5xl">
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {accounts.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <i className="fa-solid fa-users mb-3 text-4xl text-slate-300" aria-hidden />
            <p>{strings('page.accounts.noAccounts')}</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-200">
            {accounts.map((account) => (
              <li key={account.id}>
                <Link
                  href={`/accounts/${account.id}`}
                  className="flex items-center justify-between p-4 hover:bg-slate-50"
                >
                  <span>{account.id}</span>
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

export default Accounts
