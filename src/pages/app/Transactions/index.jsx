import TransactionsTable from '../../../components/tables/TransactionsTable'

const Transactions = () => {
  const transactions = [] // placeholder

  return (
    <div className="mx-auto max-w-5xl">
      <TransactionsTable data={transactions} />
    </div>
  )
}

export default Transactions
