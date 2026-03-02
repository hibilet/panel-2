import { Switch, Route } from 'wouter'

import Navbar from '../../components/global/Navbar'

import Dashboard from './Dashboard'
import Sales from './Sales'
import Sale from './Sales/Sale'
import Transactions from './Transactions'
import Links from './Links'
import LinkDetail from './Links/Link'
import Reports from './Reports'
import Report from './Reports/Report'
import Accounts from './Accounts'
import Account from './Accounts/Account'
import Settings from './Settings'

const App = () => {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6 md:py-8">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/sales" component={Sales} />
          <Route path="/sales/:id" component={Sale} />
          <Route path="/sales/:id/:tab" component={Sale} />
          <Route path="/transactions" component={Transactions} />
          <Route path="/transactions/:id" component={Transactions} />
          <Route path="/links" component={Links} />
          <Route path="/links/:id" component={LinkDetail} />
          <Route path="/reports" component={Reports} />
          <Route path="/reports/:id" component={Report} />
          <Route path="/accounts" component={Accounts} />
          <Route path="/accounts/:id" component={Account} />
          <Route path="/settings" component={Settings} />
        </Switch>
      </main>
    </>
  )
}

export default App