import LinksTable from '../../../components/tables/LinksTable'

const Links = () => {
  const links = [] // placeholder

  return (
    <div className="mx-auto max-w-5xl">
      <LinksTable data={links} />
    </div>
  )
}

export default Links
