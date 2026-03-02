import DataTable from './DataTable'
import { transactionsColumns } from './columns'
import strings from '../../localization'

const TransactionsTable = ({ data = [], bare = false, loading = false, onRowClick }) => (
  <DataTable
    data={data}
    columns={transactionsColumns}
    getRowKey={(r) => r.id}
    onRowClick={onRowClick ? (r) => r.id && onRowClick(r) : undefined}
    loading={loading}
    bare={bare}
    emptyMessage={strings('table.transaction.noTransactions')}
  />
)

export default TransactionsTable
