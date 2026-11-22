import { useDisplayAuth } from '../context/useAuth'

function ProfilePage() {
  const { user, organization, role } = useDisplayAuth()
  const profile = user?.profile

  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
        Profile
      </h1>
      <p className="mt-1 text-slate-600">
        Account details for this session.
      </p>

      <dl className="mt-6 max-w-md rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <dt className="text-sm text-slate-500">Name</dt>
          <dd className="text-sm font-medium text-slate-900">{user?.name}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-4">
          <dt className="text-sm text-slate-500">Email</dt>
          <dd className="text-sm font-medium text-slate-900">{user?.email}</dd>
        </div>

        {profile && (
          <>
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-4">
              <dt className="text-sm text-slate-500">Employee ID</dt>
              <dd className="text-sm font-medium text-slate-900">
                {profile.employeeId}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-4">
              <dt className="text-sm text-slate-500">Designation</dt>
              <dd className="text-sm font-medium text-slate-900">
                {profile.designation}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-4">
              <dt className="text-sm text-slate-500">Department</dt>
              <dd className="text-sm font-medium text-slate-900">
                {profile.department}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-4">
              <dt className="text-sm text-slate-500">Phone</dt>
              <dd className="text-sm font-medium text-slate-900">
                {profile.phone}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-4">
              <dt className="text-sm text-slate-500">Joined</dt>
              <dd className="text-sm font-medium text-slate-900">
                {profile.joinedAt}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-4">
              <dt className="text-sm text-slate-500">Location</dt>
              <dd className="text-sm font-medium text-slate-900">
                {profile.location}
              </dd>
            </div>
          </>
        )}

        <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-4">
          <dt className="text-sm text-slate-500">Organization</dt>
          <dd className="text-sm font-medium text-slate-900">
            {organization?.name}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4 pt-4">
          <dt className="text-sm text-slate-500">Role</dt>
          <dd className="text-sm font-medium capitalize text-slate-900">
            {role}
          </dd>
        </div>
      </dl>

      <p className="mt-3 max-w-md text-xs text-muted">
        Demo profile data — edit it in{' '}
        <code className="rounded bg-slate-100 px-1 py-0.5">
          src/data/demoState.ts
        </code>
        .
      </p>
    </section>
  )
}

export default ProfilePage
