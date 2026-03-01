import { Link } from 'wouter'

const Transactions = () => {
  const transactions = [] // placeholder

  return (
    <div className="mx-auto max-w-5xl">
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {transactions.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <i className="fa-solid fa-receipt mb-3 text-4xl text-slate-300" aria-hidden />
            <p>No transactions yet</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-200">
            {transactions.map((tx) => (
              <li key={tx.id}>
                <Link
                  href={`/transactions/${tx.id}`}
                  className="flex items-center justify-between p-4 hover:bg-slate-50"
                >
                  <span>{tx.id}</span>
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

export default Transactions
