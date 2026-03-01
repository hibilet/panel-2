import { useState } from 'react'
import { Link, useLocation } from 'wouter'

const navItems = [
  { path: '/', label: 'Dashboard', icon: 'fa-gauge-high' },
  { path: '/accounts', label: 'Accounts', icon: 'fa-users' },
  { path: '/sales', label: 'Sales', icon: 'fa-cart-shopping' },
  { path: '/transactions', label: 'Transactions', icon: 'fa-receipt' },
  { path: '/links', label: 'Links', icon: 'fa-link' },
  { path: '/reports', label: 'Reports', icon: 'fa-chart-line' },
  { path: '/settings', label: 'Settings', icon: 'fa-gear' },
]

const Navbar = () => {
  const [location] = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const activeItem = navItems.find(({ path }) =>
    path === '/' ? location === path : location.startsWith(path)
  )

  const NavLink = ({ path, label, icon, isActive }) => (
    <Link
      href={path}
      role="tab"
      aria-selected={isActive}
      aria-current={isActive ? 'page' : undefined}
      onClick={() => setMenuOpen(false)}
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
      <span>{label}</span>
    </Link>
  )

  return (
    <header className="sticky top-0 z-50 mx-auto max-w-5xl border-b border-slate-200 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-white/80">
          <h1 className="text-xl font-semibold text-slate-900">HIBilet Panel</h1>
          <nav aria-label="Main navigation" className="relative mt-4">
            {/* Desktop: tabs with space between */}
            <div className="hidden md:flex md:justify-between" role="tablist">
              {navItems.map(({ path, label, icon }) => {
                const isActive = path === '/' ? location === path : location.startsWith(path)
                return <NavLink key={path} path={path} label={label} icon={icon} isActive={isActive} />
              })}
            </div>

            {/* Mobile: dropdown */}
            <div className="md:hidden">
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                aria-expanded={menuOpen}
                aria-haspopup="true"
                aria-controls="nav-menu"
                id="nav-trigger"
                className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-900 shadow-sm"
              >
                <span className="flex items-center gap-2">
                  <i className={`fa-solid ${activeItem?.icon ?? 'fa-bars'}`} aria-hidden />
                  {activeItem?.label ?? 'Menu'}
                </span>
                <i className={`fa-solid fa-chevron-down transition-transform ${menuOpen ? 'rotate-180' : ''}`} aria-hidden />
              </button>
              <div
                id="nav-menu"
                role="menu"
                aria-labelledby="nav-trigger"
                className={`mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg transition-[max-height,opacity] duration-200 ${menuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 border-0'}`}
              >
                <div className="py-2">
                  {navItems.map(({ path, label, icon }) => {
                    const isActive = path === '/' ? location === path : location.startsWith(path)
                    return (
                      <div key={path} className="px-2">
                        <NavLink path={path} label={label} icon={icon} isActive={isActive} />
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </nav>
    </header>
  )
}

export default Navbar
