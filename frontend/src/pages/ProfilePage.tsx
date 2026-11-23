import { useAuth } from '../context/useAuth'

function ProfilePage() {
  const { user, organization, role } = useAuth()

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-brand-800">Account</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Profile</h1>
        <p className="mt-2 text-sm leading-6 text-muted">Your account details for this session.</p>
      </div>

      <div className="max-w-2xl rounded-2xl border border-slate-200/70 bg-white/80 p-6 shadow-panel sm:p-7">
        <div className="flex items-center gap-4 border-b border-slate-200/70 pb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-lg font-semibold text-brand-800">
            {(user?.name || '?')
              .split(/\s+/)
              .slice(0, 2)
              .map((part) => part.charAt(0).toUpperCase())
              .join('')}
          </div>
          <div>
            <p className="text-lg font-semibold text-ink">{user?.name}</p>
            <p className="text-sm text-muted">{user?.email}</p>
          </div>
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50/80 p-4 ring-1 ring-slate-200/70">
            <dt className="text-xs font-medium uppercase tracking-[0.12em] text-muted">Organization</dt>
            <dd className="mt-2 text-sm font-medium text-ink">{organization?.name || '—'}</dd>
          </div>
          <div className="rounded-xl bg-slate-50/80 p-4 ring-1 ring-slate-200/70">
            <dt className="text-xs font-medium uppercase tracking-[0.12em] text-muted">Role</dt>
            <dd className="mt-2 text-sm font-medium capitalize text-ink">{role || '—'}</dd>
          </div>
        </dl>
      </div>
    </section>
  )
}

export default ProfilePage