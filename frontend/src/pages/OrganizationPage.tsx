import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import type { HospitalType } from '../context/auth'
import { useAuth } from '../context/useAuth'
import { DISTRICTS } from '../data/districts'

type Mode = 'create' | 'join'

const PINCODE_PATTERN = /^[1-9][0-9]{5}$/

type DetailsErrors = {
  state?: string
  district?: string
  pincode?: string
  hospital_type?: string
}

function OrganizationPage() {
  const {
    createOrganization,
    joinOrganization,
    refresh,
    organization,
    pendingJoinCode,
  } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState<Mode | null>(null)
  const [organizationName, setOrganizationName] = useState('')
  const [joinCode, setJoinCode] = useState(pendingJoinCode ?? '')
  const [createdCode, setCreatedCode] = useState('')
  const [joinRequestSent, setJoinRequestSent] = useState(Boolean(pendingJoinCode))
  const [statusMessage, setStatusMessage] = useState('')
  const [error, setError] = useState('')

  const [organizationState, setOrganizationState] = useState('')
  const [district, setDistrict] = useState('')
  const [pincode, setPincode] = useState('')
  const [hospitalType, setHospitalType] = useState<HospitalType | ''>('')
  const [detailsErrors, setDetailsErrors] = useState<DetailsErrors>({})

  const districts = organizationState ? DISTRICTS[organizationState] ?? [] : []

  useEffect(() => {
    if (organization && !createdCode && !joinRequestSent) {
      navigate('/dashboard', { replace: true })
    }
  }, [organization, createdCode, joinRequestSent, navigate])

  function chooseMode(nextMode: Mode) {
    setMode(nextMode)
    setError('')
    setOrganizationName('')
    setJoinCode('')
    setOrganizationState('')
    setDistrict('')
    setPincode('')
    setHospitalType('')
    setDetailsErrors({})
  }

  function backToChoices() {
    setMode(null)
    setError('')
    setOrganizationName('')
    setJoinCode('')
    setOrganizationState('')
    setDistrict('')
    setPincode('')
    setHospitalType('')
    setDetailsErrors({})
  }

  function handleStateChange(value: string) {
    setOrganizationState(value)
    setDistrict('')
    setDetailsErrors((current) => ({
      ...current,
      state: undefined,
      district: undefined,
    }))
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const name = organizationName.trim()
    const nextDetailsErrors: DetailsErrors = {}

    if (!name) {
      setError('Organization name is required.')
    } else {
      setError('')
    }

    if (!organizationState) {
      nextDetailsErrors.state = 'State is required.'
    }
    if (!district) {
      nextDetailsErrors.district = 'District is required.'
    }
    if (!PINCODE_PATTERN.test(pincode)) {
      nextDetailsErrors.pincode = 'Enter a valid 6-digit pincode.'
    }
    if (!hospitalType) {
      nextDetailsErrors.hospital_type = 'Hospital type is required.'
    }

    setDetailsErrors(nextDetailsErrors)

    if (!name || !hospitalType || Object.keys(nextDetailsErrors).length > 0) {
      return
    }

    try {
      const code = await createOrganization({
        name,
        state: organizationState,
        district,
        pincode,
        hospital_type: hospitalType,
      })
      setCreatedCode(code)
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : 'Unable to create the organization. Please try again.',
      )
    }
  }

  async function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const code = joinCode.trim()

    if (!code) {
      setError('Organization code is required.')
      return
    }

    setError('')

    try {
      await joinOrganization(code)
      setJoinRequestSent(true)
      setStatusMessage('')
    } catch (joinError) {
      setError(
        joinError instanceof Error
          ? joinError.message
          : 'Unable to send the join request. Please try again.',
      )
    }
  }

  async function handleCheckStatus() {
    setStatusMessage('')

    try {
      const current = await refresh()

      if (current.organization) {
        navigate('/dashboard', { replace: true })
      } else if (current.pendingJoinCode) {
        setStatusMessage('Your request is still pending approval.')
      } else {
        setStatusMessage(
          'This request is no longer pending. You can join another organization.',
        )
        setJoinRequestSent(false)
        setJoinCode('')
      }
    } catch {
      setStatusMessage('Unable to check the request status right now.')
    }
  }

  return (
    <section className="mx-auto max-w-4xl">
      <div>
        {joinRequestSent ? (
          <div className="max-w-md rounded-2xl border border-slate-200/70 bg-white/80 p-6 shadow-panel sm:p-7">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100 text-brand-800">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M5 10.5 8.2 14 15 6.5"/></svg>
            </div>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">Request sent</h1>
            <p className="mt-2 text-sm leading-6 text-muted">
              Your request to join <span className="font-medium text-ink">{pendingJoinCode || joinCode}</span> has been sent.
              You can continue once an admin approves it.
            </p>

            {statusMessage && (
              <p role="status" className="mt-4 rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700 ring-1 ring-slate-200">
                {statusMessage}
              </p>
            )}

            <button
              type="button"
              onClick={handleCheckStatus}
              className="mt-6 w-full rounded-xl bg-brand-700 px-4 py-2.5 font-medium text-white shadow-sm shadow-brand-900/10 transition-colors hover:bg-brand-800 focus:ring-2 focus:ring-brand-200 focus:outline-none motion-reduce:transition-none"
            >
              Check approval status
            </button>
          </div>
        ) : createdCode ? (
          <div className="max-w-md rounded-2xl border border-slate-200/70 bg-white/80 p-6 shadow-panel sm:p-7">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100 text-brand-800">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6.5A1.5 1.5 0 0 1 5.5 5h9A1.5 1.5 0 0 1 16 6.5v7a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 4 13.5v-7Z"/><path strokeLinecap="round" d="M7 8h6M7 11h4"/></svg>
            </div>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">Organization created</h1>
            <p className="mt-2 text-sm leading-6 text-muted">
              Share this code with your team so they can join.
            </p>

            <p className="mt-5 rounded-xl bg-brand-50 px-4 py-4 text-center font-mono text-xl font-semibold tracking-[0.18em] text-brand-800 ring-1 ring-brand-100">
              {createdCode}
            </p>

            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="mt-6 w-full rounded-xl bg-brand-700 px-4 py-2.5 font-medium text-white shadow-sm shadow-brand-900/10 transition-colors hover:bg-brand-800 focus:ring-2 focus:ring-brand-200 focus:outline-none motion-reduce:transition-none"
            >
              Continue to Dashboard
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-brand-800">Workspace setup</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
              Choose your organization
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Create a new workspace for your hospital or join an existing one with a code.
            </p>

            {!mode && (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => chooseMode('create')}
                  className="group rounded-2xl border border-slate-200/70 bg-white/80 p-6 text-left shadow-panel transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:bg-white focus:ring-2 focus:ring-brand-200 focus:outline-none motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100 text-brand-800">
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true"><path strokeLinecap="round" d="M10 4v12M4 10h12"/></svg>
                  </div>
                  <h2 className="mt-4 text-lg font-semibold text-ink">Create Organization</h2>
                  <p className="mt-1.5 text-sm leading-6 text-muted">
                    Set up a new workspace and invite your team with a code.
                  </p>
                  <span className="mt-4 inline-flex items-center text-sm font-medium text-brand-800">
                    Create workspace
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => chooseMode('join')}
                  className="group rounded-2xl border border-slate-200/70 bg-white/80 p-6 text-left shadow-panel transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:bg-white focus:ring-2 focus:ring-brand-200 focus:outline-none motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M7 10h6m-3-3 3 3-3 3M4 5.5A1.5 1.5 0 0 1 5.5 4h9A1.5 1.5 0 0 1 16 5.5v9a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 4 14.5v-9Z"/></svg>
                  </div>
                  <h2 className="mt-4 text-lg font-semibold text-ink">Join Organization</h2>
                  <p className="mt-1.5 text-sm leading-6 text-muted">
                    Enter a code shared by your organization administrator.
                  </p>
                  <span className="mt-4 inline-flex items-center text-sm font-medium text-brand-800">
                    Join with code
                  </span>
                </button>
              </div>
            )}

            {mode && (
              <form
                onSubmit={mode === 'create' ? handleCreate : handleJoin}
                noValidate
                className="mt-6 max-w-xl rounded-2xl border border-slate-200/70 bg-white/80 p-6 shadow-panel sm:p-7"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-ink">
                      {mode === 'create' ? 'Create Organization' : 'Join Organization'}
                    </h2>
                    <p className="mt-1 text-sm text-muted">
                      {mode === 'create'
                        ? 'Enter your hospital details to create a workspace.'
                        : 'Enter the code provided by your administrator.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={backToChoices}
                    className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-ink motion-reduce:transition-none"
                  >
                    Back
                  </button>
                </div>

                <div className="mt-5">
                  <label
                    htmlFor={mode === 'create' ? 'organization-name' : 'organization-code'}
                    className="block text-sm font-medium text-slate-700"
                  >
                    {mode === 'create' ? 'Organization name' : 'Organization code'}
                  </label>
                  <input
                    id={mode === 'create' ? 'organization-name' : 'organization-code'}
                    type="text"
                    value={mode === 'create' ? organizationName : joinCode}
                    onChange={(event) => {
                      if (mode === 'create') setOrganizationName(event.target.value)
                      else setJoinCode(event.target.value)
                      setError('')
                    }}
                    placeholder={mode === 'create' ? 'e.g. City Care Hospital' : 'e.g. ORG-123456'}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? 'organization-error' : undefined}
                    className="mt-1.5 w-full rounded-xl border border-slate-300/80 bg-white px-3.5 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
                  />
                  {error && (
                    <p id="organization-error" role="alert" className="mt-2 text-sm text-red-600">
                      {error}
                    </p>
                  )}
                </div>

                {mode === 'create' && (
                  <>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="organization-state" className="block text-sm font-medium text-slate-700">State</label>
                        <select
                          id="organization-state"
                          value={organizationState}
                          onChange={(event) => handleStateChange(event.target.value)}
                          className="mt-1.5 w-full rounded-xl border border-slate-300/80 bg-white px-3.5 py-2.5 text-slate-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
                        >
                          <option value="">Select state</option>
                          {Object.keys(DISTRICTS).map((state) => (
                            <option key={state} value={state}>{state}</option>
                          ))}
                        </select>
                        {detailsErrors.state && <p role="alert" className="mt-2 text-sm text-red-600">{detailsErrors.state}</p>}
                      </div>

                      <div>
                        <label htmlFor="organization-district" className="block text-sm font-medium text-slate-700">District</label>
                        <select
                          id="organization-district"
                          value={district}
                          disabled={!organizationState}
                          onChange={(event) => {
                            setDistrict(event.target.value)
                            setDetailsErrors((current) => ({ ...current, district: undefined }))
                          }}
                          className="mt-1.5 w-full rounded-xl border border-slate-300/80 bg-white px-3.5 py-2.5 text-slate-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none disabled:bg-slate-100 disabled:text-muted"
                        >
                          <option value="">Select district</option>
                          {districts.map((item) => (
                            <option key={item} value={item}>{item}</option>
                          ))}
                        </select>
                        {detailsErrors.district && <p role="alert" className="mt-2 text-sm text-red-600">{detailsErrors.district}</p>}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="organization-pincode" className="block text-sm font-medium text-slate-700">Pincode</label>
                        <input
                          id="organization-pincode"
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={pincode}
                          onChange={(event) => {
                            setPincode(event.target.value.replace(/\D/g, ''))
                            setDetailsErrors((current) => ({ ...current, pincode: undefined }))
                          }}
                          className="mt-1.5 w-full rounded-xl border border-slate-300/80 bg-white px-3.5 py-2.5 text-slate-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
                        />
                        {detailsErrors.pincode && <p role="alert" className="mt-2 text-sm text-red-600">{detailsErrors.pincode}</p>}
                      </div>

                      <div>
                        <label htmlFor="organization-hospital-type" className="block text-sm font-medium text-slate-700">Hospital type</label>
                        <select
                          id="organization-hospital-type"
                          value={hospitalType}
                          onChange={(event) => {
                            setHospitalType(event.target.value as HospitalType)
                            setDetailsErrors((current) => ({ ...current, hospital_type: undefined }))
                          }}
                          className="mt-1.5 w-full rounded-xl border border-slate-300/80 bg-white px-3.5 py-2.5 text-slate-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
                        >
                          <option value="">Select type</option>
                          <option value="government">Government</option>
                          <option value="private">Private</option>
                          <option value="clinic">Clinic</option>
                        </select>
                        {detailsErrors.hospital_type && <p role="alert" className="mt-2 text-sm text-red-600">{detailsErrors.hospital_type}</p>}
                      </div>
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  className="mt-6 w-full rounded-xl bg-brand-700 px-4 py-2.5 font-medium text-white shadow-sm shadow-brand-900/10 transition-colors hover:bg-brand-800 focus:ring-2 focus:ring-brand-200 focus:outline-none motion-reduce:transition-none"
                >
                  {mode === 'create' ? 'Create organization' : 'Request to join'}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </section>
  )
}

export default OrganizationPage
