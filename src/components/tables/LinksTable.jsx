import DataTable from './DataTable'
import { linksColumns } from './columns'

const LinksTable = ({ data = [], loading = false, onRowClick }) => (
  <DataTable
    data={data}
    columns={linksColumns}
    getRowKey={(r) => r.id ?? r.slug}
    onRowClick={onRowClick ? (r) => onRowClick(r) : undefined}
    loading={loading}
  />
)

export default LinksTable
