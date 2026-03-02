import DataTable from './DataTable'
import { agreementsColumns } from './columns'
import strings from '../../localization'

const AgreementsTable = ({ data = [], loading = false, onRowClick }) => (
  <DataTable
    data={data}
    columns={agreementsColumns}
    getRowKey={(r) => r.id}
    onRowClick={onRowClick ? (r) => r.id && onRowClick(r) : undefined}
    loading={loading}
    dark
    emptyMessage={strings('table.agreement.noAgreements')}
  />
)

export default AgreementsTable
