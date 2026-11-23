import { Link } from 'react-router-dom'

const FEATURES = [
  {
    title: 'Forecast with context',
    description:
      'Use state-aware demand signals to plan stock before shortages happen.',
  },
  {
    title: 'Track stock clearly',
    description:
      'See on-hand quantities, cover estimates, and shortfalls in one place.',
  },
  {
    title: 'Coordinate teams',
    description:
      'Manage organization access with admin-approved membership and roles.',
  },
]

function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden px-6 py-8 sm:py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(13,148,136,0.12),transparent_55%)]"
      />
      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col">
        <header className="flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-700 text-sm font-bold text-white shadow-sm shadow-brand-900/10">
              M
            </span>
            <span className="text-xl font-semibold tracking-tight text-ink">MediCast</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-white/70 hover:text-ink motion-reduce:transition-none"
            >
              Login
            </Link>
            <Link
              to="/signup"
              className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-brand-900/10 transition-colors hover:bg-brand-800 motion-reduce:transition-none"
            >
              Sign up
            </Link>
          </div>
        </header>

        <div className="grid flex-1 items-center gap-12 py-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:py-20">
          <div>
            <p className="inline-flex items-center rounded-full border border-brand-200/80 bg-white/70 px-3 py-1 text-xs font-medium tracking-wide text-brand-800">
              Hospital inventory intelligence
            </p>
            <h1 className="mt-6 max-w-xl text-4xl font-semibold tracking-tight text-ink sm:text-5xl lg:text-6xl">
              Forecast demand.
              <span className="block text-brand-800">Protect supply.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted sm:text-lg">
              MediCast helps hospitals anticipate medicine demand, spot stock
              risk early, and keep essential supplies ready when patients need
              them.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/signup"
                className="rounded-xl bg-brand-700 px-5 py-3 text-sm font-medium text-white shadow-sm shadow-brand-900/10 transition-colors hover:bg-brand-800 focus:ring-2 focus:ring-brand-200 focus:outline-none motion-reduce:transition-none"
              >
                Get started
              </Link>
              <Link
                to="/login"
                className="rounded-xl border border-slate-300/80 bg-white/70 px-5 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-white focus:ring-2 focus:ring-brand-200 focus:outline-none motion-reduce:transition-none"
              >
                Sign in
              </Link>
            </div>
            <p className="mt-5 text-xs text-muted">
              Built for hospital teams managing medicine inventory and planning.
            </p>
          </div>

          <div className="glass-panel rounded-3xl border border-slate-200/70 p-5 shadow-panel sm:p-7">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200/70 pb-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-brand-800">
                  Planning overview
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight text-ink">
                  Clear signals for action
                </h2>
              </div>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200">
                Demo preview
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-white/80 p-4 ring-1 ring-slate-200/70">
                <p className="text-xs text-muted">Tracked medicines</p>
                <p className="tabular-data mt-2 text-2xl font-semibold text-ink">24</p>
              </div>
              <div className="rounded-2xl bg-white/80 p-4 ring-1 ring-slate-200/70">
                <p className="text-xs text-muted">30-day cover gaps</p>
                <p className="tabular-data mt-2 text-2xl font-semibold text-amber-700">3</p>
              </div>
              <div className="rounded-2xl bg-white/80 p-4 ring-1 ring-slate-200/70">
                <p className="text-xs text-muted">Forecast status</p>
                <p className="mt-2 text-sm font-medium text-brand-800">Ready to review</p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-slate-200/60 bg-white/60 px-4 py-3.5"
                >
                  <p className="text-sm font-medium text-ink">{feature.title}</p>
                  <p className="mt-1 text-sm leading-6 text-muted">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

export default LandingPage
