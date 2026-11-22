import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import './PageDock.css'

const STORAGE_KEY = 'medicast.page-dock.minimized'

const PUBLIC_PAGES = [
  { to: '/', label: 'Landing' },
  { to: '/login', label: 'Login' },
  { to: '/signup', label: 'Sign up' },
] as const

const APP_PAGES = [
  { to: '/organization', label: 'Organization' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/inventory', label: 'Inventory' },
  { to: '/calculator', label: 'Calculator' },
  { to: '/profile', label: 'Profile' },
  { to: '/organization-info', label: 'Organization info' },
  { to: '/admin', label: 'Admin' },
] as const

function readMinimized(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

function writeMinimized(minimized: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(minimized))
  } catch {
    // Storage can be unavailable (private mode, disabled cookies); ignore it.
  }
}

function MinusIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="pd-icon" aria-hidden="true">
      <path strokeLinecap="round" d="M5 10h10" />
    </svg>
  )
}

function GridIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="pd-icon" aria-hidden="true">
      <rect x="3" y="3" width="5" height="5" rx="1" />
      <rect x="12" y="3" width="5" height="5" rx="1" />
      <rect x="3" y="12" width="5" height="5" rx="1" />
      <rect x="12" y="12" width="5" height="5" rx="1" />
    </svg>
  )
}

function PageDockPanel() {
  const [minimized, setMinimized] = useState(readMinimized)
  const restoreRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    writeMinimized(minimized)
    if (minimized) {
      restoreRef.current?.focus()
    }
  }, [minimized])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !minimized) {
        setMinimized(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [minimized])

  function toggleMinimized() {
    setMinimized((current) => !current)
  }

  if (minimized) {
    return (
      <div className="pd-root">
        <button
          ref={restoreRef}
          type="button"
          className="pd-restore"
          onClick={toggleMinimized}
          aria-label="Open page dock"
          aria-expanded={false}
          title="Open page dock"
        >
          <GridIcon />
        </button>
      </div>
    )
  }

  return (
    <div className="pd-root">
      <nav className="pd-panel" aria-label="Page dock">
        <header className="pd-header">
          <div>
            <p className="pd-title">Page dock</p>
            <p className="pd-subtitle">Dev navigation</p>
          </div>
          <button
            type="button"
            className="pd-icon-button"
            onClick={toggleMinimized}
            aria-label="Minimize page dock"
            aria-expanded
            title="Minimize (Esc)"
          >
            <MinusIcon />
          </button>
        </header>

        <div className="pd-links">
          <p className="pd-group">Public</p>
          {PUBLIC_PAGES.map((page) => (
            <NavLink
              key={page.to}
              to={page.to}
              end
              className={({ isActive }) =>
                `pd-link${isActive ? ' pd-link-active' : ''}`
              }
              onClick={toggleMinimized}
            >
              {page.label}
            </NavLink>
          ))}

          <p className="pd-group pd-group-spaced">Workspace</p>
          {APP_PAGES.map((page) => (
            <NavLink
              key={page.to}
              to={page.to}
              className={({ isActive }) =>
                `pd-link${isActive ? ' pd-link-active' : ''}`
              }
              onClick={toggleMinimized}
            >
              {page.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

/** Dev-only page switcher. Renders nothing in production builds. */
export default function PageDock() {
  if (!import.meta.env.DEV) {
    return null
  }

  return <PageDockPanel />
}
