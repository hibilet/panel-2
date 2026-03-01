import SalesTable from '../../../components/tables/SalesTable'

const Sales = () => {
  const sales = [] // placeholder

  return (
    <div className="mx-auto max-w-5xl">
      <SalesTable data={sales} />
    </div>
  )
}

export default Sales
