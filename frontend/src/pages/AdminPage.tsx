import { useEffect, useState } from 'react'
import {
  acceptRequest,
  fetchPendingRequests,
  rejectRequest,
} from '../api/admin'
import type { PendingRequest } from '../context/auth'
import type { AuthMember } from '../context/auth'
import { useAuth } from '../context/useAuth'

function AdminPage() {
  const { organization, user, members, refresh, removeMember } = useAuth()

  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([])
  const [busyRequestIds, setBusyRequestIds] = useState<string[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadPendingRequests() {
      try {
        const requests = await fetchPendingRequests()
        if (!cancelled) {
          setPendingRequests(requests)
        }
      } catch {
        if (!cancelled) {
          setError('Unable to load join requests.')
        }
      }
    }

    loadPendingRequests()

    return () => {
      cancelled = true
    }
  }, [])

  function isCurrentUser(member: AuthMember) {
    return member.email.toLowerCase() === user?.email.toLowerCase()
  }

  async function handleRemoveMember(member: AuthMember) {
    if (window.confirm(`Remove ${member.name} from the organization?`)) {
      try {
        await removeMember(member.id)
      } catch {
        setError(`Unable to remove ${member.name}.`)
      }
    }
  }

  async function handleRequest(
    request: PendingRequest,
    action: 'accept' | 'reject',
  ) {
    setBusyRequestIds((current) => [...current, request.id])

    try {
      if (action === 'accept') {
        await acceptRequest(request.id)
        await refresh()
      } else {
        await rejectRequest(request.id)
      }

      setPendingRequests((current) =>
        current.filter((item) => item.id !== request.id),
      )
    } catch {
      setError(`Unable to ${action} the request from ${request.name}.`)
    } finally {
      setBusyRequestIds((current) =>
        current.filter((id) => id !== request.id),
      )
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-brand-800">Administration</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Admin Panel</h1>
        <p className="mt-2 text-sm leading-6 text-muted">Manage your organization, join requests, and members.</p>
      </div>

      {error && (
        <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-panel">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted">Organization</p>
          <p className="mt-2 text-lg font-semibold text-ink">{organization?.name}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-panel">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted">Organization code</p>
          <p className="mt-2 font-mono text-lg font-semibold tracking-wider text-brand-800">{organization?.code}</p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-ink">Pending Requests</h2>
        <p className="mt-1 text-sm text-muted">People who requested to join with your organization code.</p>

        <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200/70 bg-white/80 shadow-panel">
          {pendingRequests.length === 0 ? (
            <p className="px-5 py-5 text-sm text-muted">No pending requests.</p>
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50/80 text-xs uppercase tracking-[0.08em] text-muted">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">Name</th>
                  <th scope="col" className="px-5 py-3 font-medium">Email</th>
                  <th scope="col" className="px-5 py-3 font-medium">Requested</th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70">
                {pendingRequests.map((request) => {
                  const isBusy = busyRequestIds.includes(request.id)

                  return (
                    <tr key={request.id} className="transition-colors hover:bg-slate-50/50 motion-reduce:transition-none">
                      <td className="px-5 py-3.5 font-medium text-ink">{request.name}</td>
                      <td className="px-5 py-3.5 text-muted">{request.email}</td>
                      <td className="px-5 py-3.5 text-muted">{request.requestedAt}</td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleRequest(request, 'accept')}
                            disabled={isBusy}
                            className="rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRequest(request, 'reject')}
                            disabled={isBusy}
                            className="rounded-lg border border-slate-300/80 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-ink">Members</h2>
        <p className="mt-1 text-sm text-muted">Remove members who should no longer have access.</p>

        <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200/70 bg-white/80 shadow-panel">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-xs uppercase tracking-[0.08em] text-muted">
              <tr>
                <th scope="col" className="px-5 py-3 font-medium">Name</th>
                <th scope="col" className="px-5 py-3 font-medium">Email</th>
                <th scope="col" className="px-5 py-3 font-medium">Role</th>
                <th scope="col" className="px-5 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70">
              {members.map((member) => {
                const isSelf = isCurrentUser(member)

                return (
                  <tr key={member.id} className="transition-colors hover:bg-slate-50/50 motion-reduce:transition-none">
                    <td className="px-5 py-3.5 font-medium text-ink">{member.name}</td>
                    <td className="px-5 py-3.5 text-muted">{member.email}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-700 ring-1 ring-inset ring-slate-200">
                        {member.role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member)}
                        disabled={isSelf}
                        title={isSelf ? 'You cannot remove yourself' : undefined}
                        className="rounded-lg border border-slate-300/80 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default AdminPage
