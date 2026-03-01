import { Switch, Route } from 'wouter'

import Dashboard from './Dashboard'
import Sales from './Sales'
import Sale from './Sales/Sale'

import Transactions from './Transactions'
import Transaction from './Transactions/Transaction'

import Links from './Links'
import Link from './Links/Link'

import Settings from './Settings'

const App = () => {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />

      <Route path="/sales" component={Sales} />
      <Route path="/sales/:id" component={Sale} />
      
      <Route path="/transactions" component={Transactions} />
      <Route path="/transactions/:id" component={Transaction} />
      
      <Route path="/links" component={Links} />
      <Route path="/links/:id" component={Link} />
      
      <Route path="/settings" component={Settings} />
    </Switch>
  )
}

export default App