import DataTable from './DataTable'
import { salesColumns } from './columns'

const SalesTable = ({ data = [], extended = false, onDelete, onRowClick, loading = false }) => (
  <DataTable
    data={data}
    columns={salesColumns(extended, onDelete)}
    getRowKey={(r) => r.id ?? r.name}
    onRowClick={onRowClick && ((r) => r.id && onRowClick(r))}
    loading={loading}
  />
)

export default SalesTable
