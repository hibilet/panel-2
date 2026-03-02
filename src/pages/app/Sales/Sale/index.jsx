import { Switch, Route, Link, useLocation, useParams } from 'wouter'

import { SaleProvider, useSale } from '../../../../context'
import strings from '../../../../localization'
import SaleBasic from './SaleBasic'
import SaleTickets from './SaleTickets'
import SaleChannels from './SaleChannels'
import SaleAttendees from './SaleAttendees'
import SaleGuests from './SaleGuests'
import SaleReaders from './SaleReaders'
import SaleCoupons from './SaleCoupons'

const tabItems = [
  { path: 'basic', labelKey: 'page.sale.tab.basic', icon: 'fa-file-lines' },
  { path: 'tickets', labelKey: 'page.sale.tab.tickets', icon: 'fa-ticket' },
  { path: 'channels', labelKey: 'page.sale.tab.channels', icon: 'fa-bullhorn' },
  { path: 'attendees', labelKey: 'page.sale.tab.attendees', icon: 'fa-users' },
  { path: 'guests', labelKey: 'page.sale.tab.guests', icon: 'fa-user-group' },
  { path: 'readers', labelKey: 'page.sale.tab.readers', icon: 'fa-tablet-screen-button' },
  { path: 'coupons', labelKey: 'page.sale.tab.coupons', icon: 'fa-tag' },
]

const TabLink = ({ path, labelKey, icon, isActive, basePath }) => (
  <Link
    href={path === 'basic' ? basePath : `${basePath}/${path}`}
    role="tab"
    aria-selected={isActive}
    aria-current={isActive ? 'page' : undefined}
    className={`
      flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium
      transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2
      ${isActive
        ? 'bg-slate-900 text-white'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }
    `}
  >
    <i className={`fa-solid ${icon}`} aria-hidden />
    <span>{strings(labelKey)}</span>
  </Link>
)

const SaleHeader = () => {
  const { sale, isNew } = useSale()
  const title = isNew ? strings('page.sale.new') : (sale?.name ?? strings('page.sale.title'))

  return (
    <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
  )
}

const Sale = () => {
  const { id } = useParams()
  const [location] = useLocation()

  const basePath = `/sales/${id}`

  const isTabActive = (path) => {
    if (path === 'basic') return location === basePath || location === `${basePath}/`
    return location.startsWith(`${basePath}/${path}`)
  }

  return (
    <div className="mx-auto max-w-5xl">
      <SaleProvider saleId={id}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <SaleHeader />
        </div>

        <nav aria-label="Sale sections" className="mt-4">
          <div className="flex flex-wrap gap-2" role="tablist">
            {tabItems.map(({ path, labelKey, icon }) => (
              <TabLink
                key={path}
                path={path}
                labelKey={labelKey}
                icon={icon}
                isActive={isTabActive(path)}
                basePath={basePath}
              />
            ))}
          </div>
        </nav>

        <div className="mt-6">
          <Switch>
            <Route path="/sales/:id" component={SaleBasic} />
            <Route path="/sales/:id/basic" component={SaleBasic} />
            <Route path="/sales/:id/tickets" component={SaleTickets} />
            <Route path="/sales/:id/channels" component={SaleChannels} />
            <Route path="/sales/:id/attendees" component={SaleAttendees} />
            <Route path="/sales/:id/guests" component={SaleGuests} />
            <Route path="/sales/:id/readers" component={SaleReaders} />
            <Route path="/sales/:id/coupons" component={SaleCoupons} />
          </Switch>
        </div>
      </SaleProvider>
    </div>
  )
}

export default Sale
