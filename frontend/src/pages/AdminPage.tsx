import { useEffect, useState } from 'react'
import {
  acceptRequest,
  fetchPendingRequests,
  rejectRequest,
} from '../api/admin'
import type { PendingRequest } from '../context/auth'
import type { AuthMember } from '../context/auth'
import { useDisplayAuth } from '../context/useAuth'

function AdminPage() {
  const { organization, user, members, refresh, removeMember } = useDisplayAuth()

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
    <section>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
        Admin Panel
      </h1>
      <p className="mt-1 text-slate-600">
        Manage your organization and its members.
      </p>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Organization
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {organization?.name}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Organization code
          </p>
          <p className="mt-1 font-mono text-lg font-semibold tracking-wider text-brand-800">
            {organization?.code}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-semibold text-slate-900">
          Pending Requests
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          People who requested to join with your organization code.
        </p>

        <div className="mt-3 overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          {pendingRequests.length === 0 ? (
            <p className="px-5 py-4 text-sm text-slate-600">
              No pending requests.
            </p>
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">
                    Name
                  </th>
                  <th scope="col" className="px-5 py-3 font-medium">
                    Email
                  </th>
                  <th scope="col" className="px-5 py-3 font-medium">
                    Requested
                  </th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingRequests.map((request) => {
                  const isBusy = busyRequestIds.includes(request.id);

                  return (
                    <tr key={request.id}>
                      <td className="px-5 py-3 font-medium text-slate-900">
                        {request.name}
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        {request.email}
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        {request.requestedAt}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleRequest(request, "accept")}
                            disabled={isBusy}
                            className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRequest(request, "reject")}
                            disabled={isBusy}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="mt-6">
        <h2  className="text-lg font-semibold text-slate-900">
          Members
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Remove members who should no longer have access.
        </p>

        <div className="mt-3 overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-5 py-3 font-medium">
                  Name
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Email
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Role
                </th>
                <th scope="col" className="px-5 py-3 text-right font-medium">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.map((member) => {
                const isSelf = isCurrentUser(member);

                return (
                  <tr key={member.id}>
                    <td className="px-5 py-3 font-medium text-slate-900">
                      {member.name}
                    </td>
                    <td className="px-5 py-3 text-slate-600">{member.email}</td>
                    <td className="px-5 py-3 capitalize text-slate-700">
                      {member.role}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member)}
                        disabled={isSelf}
                        title={
                          isSelf ? "You cannot remove yourself" : undefined
                        }
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
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
