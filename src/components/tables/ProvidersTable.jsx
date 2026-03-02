import DataTable from './DataTable'
import { providersColumns } from './columns'
import strings from '../../localization'

const ProvidersTable = ({ data = [], loading = false, onRowClick }) => (
  <DataTable
    data={data}
    columns={providersColumns}
    getRowKey={(r) => r.id}
    onRowClick={onRowClick ? (r) => r.id && onRowClick(r) : undefined}
    loading={loading}
    dark
    emptyMessage={strings('table.provider.noProviders')}
  />
)

export default ProvidersTable
