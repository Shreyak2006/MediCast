import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

function linkClass(isActive: boolean) {
  return `rounded-lg px-3 py-2 text-sm font-medium transition-colors motion-reduce:transition-none ${
    isActive
      ? 'bg-brand-100/80 text-brand-800'
      : 'text-slate-600 hover:bg-white/80 hover:text-slate-900'
  }`
}

function getInitials(name: string | undefined) {
  const trimmed = name?.trim()

  if (!trimmed) return '?'

  return trimmed
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

function NavBar() {
  const { user, organization, role, logout } = useAuth()
  const menuRef = useRef<HTMLDivElement>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    if (!isMenuOpen) return

    function handleMouseDown(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isMenuOpen])

  async function handleLogout() {
    setIsMenuOpen(false)
    try {
      await logout()
    } finally {
      window.location.replace('/')
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/75 backdrop-blur-xl">
      <nav className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-4 sm:gap-6">
          <NavLink to="/dashboard" className="group flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700 text-sm font-bold text-white shadow-sm shadow-brand-900/10">
              M
            </span>
            <span className="text-lg font-semibold tracking-tight text-ink">
              MediCast
            </span>
          </NavLink>

          {organization && (
            <div className="flex items-center gap-1 rounded-xl bg-slate-100/70 p-1">
              <NavLink to="/dashboard" className={({ isActive }) => linkClass(isActive)}>
                Dashboard
              </NavLink>
              <NavLink to="/inventory" className={({ isActive }) => linkClass(isActive)}>
                Inventory
              </NavLink>
              <NavLink to="/calculator" className={({ isActive }) => linkClass(isActive)}>
                Calculate
              </NavLink>
              <NavLink to="/organization-info" className={({ isActive }) => linkClass(isActive)}>
                Organization
              </NavLink>
              {role === 'admin' && (
                <NavLink to="/admin" className={({ isActive }) => linkClass(isActive)}>
                  Admin
                </NavLink>
              )}
            </div>
          )}
        </div>

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-label="Open profile menu"
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/70 p-1 pr-2.5 transition-colors hover:bg-white focus:ring-2 focus:ring-brand-200 focus:outline-none motion-reduce:transition-none"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-xs font-semibold text-brand-800">
              {getInitials(user?.name)}
            </span>
            <span className="hidden max-w-28 truncate text-sm font-medium text-slate-700 sm:block">
              {user?.name?.split(/\s+/)[0] || 'Account'}
            </span>
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-4 w-4 text-slate-500"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m6 8 4 4 4-4" />
            </svg>
          </button>

          {isMenuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-60 rounded-2xl border border-slate-200/80 bg-white/95 p-1.5 shadow-panel backdrop-blur-xl"
            >
              <div className="mb-1 rounded-xl bg-slate-50 px-3 py-2.5">
                <p className="truncate text-sm font-medium text-slate-900">{user?.name}</p>
                <p className="truncate text-xs text-slate-500">{user?.email}</p>
              </div>

              <NavLink
                to="/profile"
                role="menuitem"
                onClick={() => setIsMenuOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-100 motion-reduce:transition-none"
              >
                Profile
              </NavLink>
              <NavLink
                to="/organization-info"
                role="menuitem"
                onClick={() => setIsMenuOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-100 motion-reduce:transition-none"
              >
                Settings
              </NavLink>

              <div className="my-1 border-t border-slate-100" />
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100 motion-reduce:transition-none"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </nav>
    </header>
  )
}

export default NavBar
