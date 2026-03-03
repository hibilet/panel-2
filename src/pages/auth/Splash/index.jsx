import { useState } from 'react'
import { useSearch } from 'wouter'
import Input from '../../../components/inputs/Input'
import { post } from '../../../lib/client'
import { setToken } from '../../../lib/storage'

const Splash = () => {
  const search = useSearch()
  const params = new URLSearchParams(search)
  const isAdmin = params.get('type') === 'admin'
  const authType = isAdmin ? 'admin' : 'account.merchant'

  const [step, setStep] = useState('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await post('/auth/request', { email, type: `account.${authType.toLowerCase()}` })
      setStep('otp')
    } catch (err) {
      setError(err?.message ?? 'Failed to send code')
    } finally {
      setLoading(false)
    }
  }

  const handleOtpSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await post('/auth/login', { email, otp, type: `account.${authType.toLowerCase()}` })
      const token = res?.data
      if (token) setToken(token)
      else setError('No token received')
    } catch (err) {
      setError(err?.message ?? 'Invalid code')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    setStep('email')
    setOtp('')
    setError(null)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4 dark:bg-slate-950">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-700 dark:bg-slate-900">
        <h1 className="mb-6 text-center text-xl font-semibold text-slate-900 dark:text-slate-100">
          {isAdmin ? 'Admin Login' : 'Login'}
        </h1>

        {step === 'email' ? (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <Input
              label="Email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={loading}
              error={error}
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-slate-800 px-4 py-2.5 font-medium text-white transition hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-700 dark:hover:bg-slate-600"
            >
              {loading ? 'Sending...' : 'Continue'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              We sent a code to <strong className="text-slate-900 dark:text-slate-100">{email}</strong>
            </p>
            <Input
              label="Verification code"
              name="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              disabled={loading}
              error={error}
              required
            />
            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="w-full rounded-lg bg-slate-800 px-4 py-2.5 font-medium text-white transition hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-700 dark:hover:bg-slate-600"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
            <button
              type="button"
              onClick={handleBack}
              disabled={loading}
              className="w-full text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
            >
              ← Use different email
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default Splash
