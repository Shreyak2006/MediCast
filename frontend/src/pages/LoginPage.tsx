import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type FieldErrors = {
  email?: string
  password?: string
}

function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')

  function clearError(field: keyof FieldErrors) {
    setErrors((current) => ({ ...current, [field]: undefined }))
    setFormError('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const emailValue = email.trim()
    const nextErrors: FieldErrors = {}

    if (!emailValue) {
      nextErrors.email = 'Email is required.'
    } else if (!EMAIL_PATTERN.test(emailValue)) {
      nextErrors.email = 'Enter a valid email address.'
    }

    if (!password) {
      nextErrors.password = 'Password is required.'
    } else if (password.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters.'
    }

    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    try {
      await login(emailValue, password)
      navigate('/organization')
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'Unable to log in. Please try again.',
      )
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center px-6 py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(13,148,136,0.1),transparent_55%)]"
      />
      <div className="relative w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700 text-sm font-bold text-white shadow-sm shadow-brand-900/10">
            M
          </span>
          <span className="text-lg font-semibold tracking-tight text-ink">MediCast</span>
        </Link>

        <div className="mt-8">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-brand-800">
            Account access
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
            Welcome back
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            Log in to manage inventory, forecasts, and organization requests.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="glass-panel mt-6 rounded-2xl border border-slate-200/70 p-6 shadow-panel sm:p-7"
        >
          <div>
            <label
              htmlFor="login-email"
              className="block text-sm font-medium text-slate-700"
            >
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                clearError('email')
              }}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'login-email-error' : undefined}
              className="mt-1.5 w-full rounded-xl border border-slate-300/80 bg-white px-3.5 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
            />
            {errors.email && (
              <p id="login-email-error" role="alert" className="mt-2 text-sm text-red-600">
                {errors.email}
              </p>
            )}
          </div>

          <div className="mt-4">
            <label
              htmlFor="login-password"
              className="block text-sm font-medium text-slate-700"
            >
              Password
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                clearError('password')
              }}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'login-password-error' : undefined}
              className="mt-1.5 w-full rounded-xl border border-slate-300/80 bg-white px-3.5 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
            />
            {errors.password && (
              <p id="login-password-error" role="alert" className="mt-2 text-sm text-red-600">
                {errors.password}
              </p>
            )}
          </div>

          {formError && (
            <p
              role="alert"
              className="mt-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700 ring-1 ring-red-200"
            >
              {formError}
            </p>
          )}

          <button
            type="submit"
            className="mt-6 w-full rounded-xl bg-brand-700 px-4 py-2.5 font-medium text-white shadow-sm shadow-brand-900/10 transition-colors hover:bg-brand-800 focus:ring-2 focus:ring-brand-200 focus:outline-none motion-reduce:transition-none"
          >
            Login
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-muted">
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="font-medium text-brand-800 hover:text-brand-900">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  )
}

export default LoginPage
