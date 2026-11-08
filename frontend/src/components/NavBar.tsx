import { NavLink } from 'react-router-dom'

function linkClass(isActive: boolean) {
  return `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-brand-100 text-brand-800'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`
}

function NavBar() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <nav className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-4">
        <NavLink
          to="/dashboard"
          className="text-lg font-semibold tracking-tight text-brand-700"
        >
          MediCast
        </NavLink>

        <div className="flex items-center gap-1">
          <NavLink
            to="/inventory"
            className={({ isActive }) => linkClass(isActive)}
          >
            Inventory
          </NavLink>
          <NavLink
            to="/dashboard"
            className={({ isActive }) => linkClass(isActive)}
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/calculator"
            className={({ isActive }) => linkClass(isActive)}
          >
            Calculator
          </NavLink>
        </div>
      </nav>
    </header>
  )
}

export default NavBar
