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
    <section className="mx-auto max-w-3xl">
      <div>
        {joinRequestSent ? (
          <div className="max-w-md rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Request sent
            </h1>
            <p className="mt-1 text-slate-600">
              Your request to join {pendingJoinCode || joinCode} has been sent.
              You can continue once an admin approves it.
            </p>

            {statusMessage && (
              <p role="status" className="mt-3 text-sm text-slate-600">
                {statusMessage}
              </p>
            )}

            <button
              type="button"
              onClick={handleCheckStatus}
              className="mt-6 w-full rounded-lg bg-brand-600 px-4 py-2 font-medium text-white transition-colors hover:bg-brand-700"
            >
              Check approval status
            </button>
          </div>
        ) : createdCode ? (
          <div className="max-w-md rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Organization created
            </h1>
            <p className="mt-1 text-slate-600">
              Share this code with your team so they can join.
            </p>

            <p className="mt-5 rounded-lg bg-brand-50 px-4 py-3 text-center font-mono text-lg font-semibold tracking-wider text-brand-800 ring-1 ring-brand-100">
              {createdCode}
            </p>

            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="mt-6 w-full rounded-lg bg-brand-600 px-4 py-2 font-medium text-white transition-colors hover:bg-brand-700"
            >
              Continue to Dashboard
            </button>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Choose your organization
            </h1>
            <p className="mt-1 text-slate-600">
              Create a new workspace or join an existing one.
            </p>

            {!mode && (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => chooseMode('create')}
                  className="rounded-xl bg-white p-6 text-left shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-brand-50 hover:ring-brand-200"
                >
                  <h2 className="text-lg font-semibold text-slate-900">
                    Create Organization
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Set up a new workspace and invite your team with a code.
                  </p>
                  <span className="mt-4 inline-block text-sm font-medium text-brand-700">
                    Create →
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => chooseMode('join')}
                  className="rounded-xl bg-white p-6 text-left shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-brand-50 hover:ring-brand-200"
                >
                  <h2 className="text-lg font-semibold text-slate-900">
                    Join Organization
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Enter a code shared by your organization administrator.
                  </p>
                  <span className="mt-4 inline-block text-sm font-medium text-brand-700">
                    Join →
                  </span>
                </button>
              </div>
            )}

            {mode && (
              <form
                onSubmit={mode === 'create' ? handleCreate : handleJoin}
                noValidate
                className="mt-6 max-w-md rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
              >
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-lg font-semibold text-slate-900">
                    {mode === 'create'
                      ? 'Create Organization'
                      : 'Join Organization'}
                  </h2>
                  <button
                    type="button"
                    onClick={backToChoices}
                    className="text-sm font-medium text-slate-500 hover:text-slate-900"
                  >
                    Back
                  </button>
                </div>

                <div className="mt-4">
                  <label
                    htmlFor={
                      mode === 'create'
                        ? 'organization-name'
                        : 'organization-code'
                    }
                    className="block text-sm font-medium text-slate-700"
                  >
                    {mode === 'create' ? 'Organization name' : 'Organization code'}
                  </label>
                  <input
                    id={
                      mode === 'create'
                        ? 'organization-name'
                        : 'organization-code'
                    }
                    type="text"
                    value={mode === 'create' ? organizationName : joinCode}
                    onChange={(event) => {
                      if (mode === 'create') {
                        setOrganizationName(event.target.value)
                      } else {
                        setJoinCode(event.target.value)
                      }
                      setError('')
                    }}
                    placeholder={
                      mode === 'create' ? 'e.g. City Care Hospital' : 'e.g. ORG-123456'
                    }
                    aria-invalid={Boolean(error)}
                    aria-describedby={
                      error ? 'organization-error' : undefined
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
                  />
                  {error && (
                    <p
                      id="organization-error"
                      role="alert"
                      className="mt-2 text-sm text-red-600"
                    >
                      {error}
                    </p>
                  )}
                </div>

                {mode === 'create' && (
                  <>
                    <div className="mt-4">
                      <label
                        htmlFor="organization-state"
                        className="block text-sm font-medium text-slate-700"
                      >
                        State
                      </label>
                      <select
                        id="organization-state"
                        value={organizationState}
                        onChange={(event) =>
                          handleStateChange(event.target.value)
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
                      >
                        <option value="">Select state</option>
                        {Object.keys(DISTRICTS).map((state) => (
                          <option key={state} value={state}>
                            {state}
                          </option>
                        ))}
                      </select>
                      {detailsErrors.state && (
                        <p role="alert" className="mt-2 text-sm text-red-600">
                          {detailsErrors.state}
                        </p>
                      )}
                    </div>

                    <div className="mt-4">
                      <label
                        htmlFor="organization-district"
                        className="block text-sm font-medium text-slate-700"
                      >
                        District
                      </label>
                      <select
                        id="organization-district"
                        value={district}
                        disabled={!organizationState}
                        onChange={(event) => {
                          setDistrict(event.target.value)
                          setDetailsErrors((current) => ({
                            ...current,
                            district: undefined,
                          }))
                        }}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
                      >
                        <option value="">Select district</option>
                        {districts.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                      {detailsErrors.district && (
                        <p role="alert" className="mt-2 text-sm text-red-600">
                          {detailsErrors.district}
                        </p>
                      )}
                    </div>

                    <div className="mt-4">
                      <label
                        htmlFor="organization-pincode"
                        className="block text-sm font-medium text-slate-700"
                      >
                        Pincode
                      </label>
                      <input
                        id="organization-pincode"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={pincode}
                        onChange={(event) => {
                          setPincode(event.target.value.replace(/\D/g, ''))
                          setDetailsErrors((current) => ({
                            ...current,
                            pincode: undefined,
                          }))
                        }}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
                      />
                      {detailsErrors.pincode && (
                        <p role="alert" className="mt-2 text-sm text-red-600">
                          {detailsErrors.pincode}
                        </p>
                      )}
                    </div>

                    <div className="mt-4">
                      <label
                        htmlFor="organization-hospital-type"
                        className="block text-sm font-medium text-slate-700"
                      >
                        Hospital type
                      </label>
                      <select
                        id="organization-hospital-type"
                        value={hospitalType}
                        onChange={(event) => {
                          setHospitalType(event.target.value as HospitalType)
                          setDetailsErrors((current) => ({
                            ...current,
                            hospital_type: undefined,
                          }))
                        }}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
                      >
                        <option value="">Select hospital type</option>
                        <option value="government">Government</option>
                        <option value="private">Private</option>
                        <option value="clinic">Clinic</option>
                      </select>
                      {detailsErrors.hospital_type && (
                        <p role="alert" className="mt-2 text-sm text-red-600">
                          {detailsErrors.hospital_type}
                        </p>
                      )}
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  className="mt-6 w-full rounded-lg bg-brand-600 px-4 py-2 font-medium text-white transition-colors hover:bg-brand-700"
                >
                  {mode === 'create' ? 'Create organization' : 'Join organization'}
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
