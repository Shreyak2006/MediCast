import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

function OrganizationInfoPage() {
  const { organization, role, members, leaveOrganization } = useAuth()
  const navigate = useNavigate()

  async function handleLeave() {
    await leaveOrganization()
    navigate('/organization', { replace: true })
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-brand-800">Workspace</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Organization</h1>
          <p className="mt-2 text-sm leading-6 text-muted">View your organization details and members.</p>
        </div>

        {role === 'member' && (
          <button
            type="button"
            onClick={handleLeave}
            className="rounded-xl border border-red-200 bg-white/80 px-4 py-2.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 focus:ring-2 focus:ring-red-200 focus:outline-none motion-reduce:transition-none"
          >
            Leave Organization
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-panel">
          <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-muted">Organization name</h2>
          <p className="mt-3 text-lg font-semibold text-ink">{organization?.name}</p>
        </article>
        <article className="rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-panel">
          <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-muted">Organization code</h2>
          <p className="mt-3 font-mono text-lg font-semibold tracking-wider text-brand-800">{organization?.code}</p>
        </article>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white/80 shadow-panel">
        <div className="border-b border-slate-200/70 px-5 py-4">
          <h2 className="text-sm font-semibold text-ink">Members</h2>
          <p className="mt-0.5 text-xs text-muted">{members.length} people in this organization</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-xs uppercase tracking-[0.08em] text-muted">
              <tr>
                <th scope="col" className="px-5 py-3 font-medium">Name</th>
                <th scope="col" className="px-5 py-3 font-medium">Email</th>
                <th scope="col" className="px-5 py-3 font-medium">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70">
              {members.map((member) => (
                <tr key={member.id} className="transition-colors hover:bg-slate-50/50 motion-reduce:transition-none">
                  <td className="px-5 py-3.5 font-medium text-ink">{member.name}</td>
                  <td className="px-5 py-3.5 text-muted">{member.email}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-700 ring-1 ring-inset ring-slate-200">
                      {member.role}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

export default OrganizationInfoPage
