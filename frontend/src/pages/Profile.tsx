import { useMemo, useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

const blockedPasswordTerms = ['admin', 'demo', 'cipherlab', 'balrehpic']

const reverseText = (value: string) => value.split('').reverse().join('')

const normalizeAlphanumeric = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]/g, '')

const getForbiddenPasswordFragments = (
  firstName: string,
  lastName: string,
  email: string,
) => {
  const baseParts = [
    firstName,
    lastName,
    firstName + lastName,
    lastName + firstName,
    ...email.split(/[@.]/g),
  ]
    .map(normalizeAlphanumeric)
    .filter((part) => part.length >= 3)

  const uniqueParts = Array.from(new Set(baseParts))
  const combinedParts: string[] = []

  for (let index = 0; index < uniqueParts.length; index += 1) {
    for (
      let nestedIndex = index + 1;
      nestedIndex < uniqueParts.length;
      nestedIndex += 1
    ) {
      const left = uniqueParts[index]
      const right = uniqueParts[nestedIndex]

      if (left.length + right.length >= 6) {
        combinedParts.push(left + right, right + left)
      }
    }
  }

  return Array.from(
    new Set(
      [...uniqueParts, ...combinedParts, ...blockedPasswordTerms]
        .flatMap((part) => [part, reverseText(part)])
        .filter((part) => part.length >= 3),
    ),
  )
}

const hasSequentialRun = (value: string) => {
  if (value.length < 4) {
    return false
  }

  let ascendingRun = 1
  let descendingRun = 1

  for (let index = 1; index < value.length; index += 1) {
    const current = value.charCodeAt(index)
    const previous = value.charCodeAt(index - 1)
    const sameCategory =
      (/[a-z]/.test(value[index]) && /[a-z]/.test(value[index - 1])) ||
      (/[0-9]/.test(value[index]) && /[0-9]/.test(value[index - 1])) ||
      (/[^a-z0-9]/.test(value[index]) && /[^a-z0-9]/.test(value[index - 1]))

    if (!sameCategory) {
      ascendingRun = 1
      descendingRun = 1
      continue
    }

    ascendingRun = current === previous + 1 ? ascendingRun + 1 : 1
    descendingRun = current === previous - 1 ? descendingRun + 1 : 1

    if (ascendingRun >= 4 || descendingRun >= 4) {
      return true
    }
  }

  return false
}

function ProfilePage() {
  const navigate = useNavigate()
  const [user, setUser] = useState<{ first_name: string; last_name: string; email: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [otp, setOtp] = useState('')
  const [isOtpRequested, setIsOtpRequested] = useState(false)
  const [isRequestingOtp, setIsRequestingOtp] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [serverError, setServerError] = useState('')
  const [serverSuccess, setServerSuccess] = useState('')

  useEffect(() => {
    const fetchUser = async () => {
      const email = localStorage.getItem('userEmail')
      if (!email) {
        navigate('/login')
        return
      }

      try {
        const response = await api.get(`/profile/${encodeURIComponent(email)}`)
        setUser(response.data.user)
      } catch (error) {
        localStorage.removeItem('userEmail')
        navigate('/login')
      } finally {
        setIsLoading(false)
      }
    }

    fetchUser()
  }, [navigate])

  const passwordRules = useMemo(() => {
    if (!user) return []

    const normalizedPassword = normalizeAlphanumeric(password)
    const forbiddenFragments = getForbiddenPasswordFragments(
      user.first_name,
      user.last_name,
      user.email,
    )

    const hasForbiddenPersonalFragment = forbiddenFragments.some(
      (fragment) =>
        fragment.length >= 3 &&
        normalizedPassword.includes(normalizeAlphanumeric(fragment)),
    )

    return [
      {
        label: '8 to 32 characters long',
        isValid: password.length >= 8 && password.length <= 32,
      },
      {
        label:
          'Includes at least one lowercase, one uppercase, one number, and one special character',
        isValid:
          /[a-z]/.test(password) &&
          /[A-Z]/.test(password) &&
          /[0-9]/.test(password) &&
          /[^A-Za-z0-9]/.test(password),
      },
      {
        label:
          'Does not contain your name, email parts, or their reversed forms',
        isValid: !hasForbiddenPersonalFragment,
      },
      {
        label:
          'Does not contain CipherLab, Balrehpic, Admin, or Demo in any form',
        isValid: !blockedPasswordTerms.some((term) =>
          normalizedPassword.includes(normalizeAlphanumeric(term)),
        ),
      },
      {
        label: 'Does not repeat the same character three times in a row',
        isValid: !/(.)\1{2,}/.test(password),
      },
      {
        label:
          'Does not include ascending or descending 4-character sequences',
        isValid: !hasSequentialRun(password.toLowerCase()),
      },
    ]
  }, [password, user])

  const passedRuleCount = passwordRules.filter((rule) => rule.isValid).length

  const passwordStrength = useMemo(() => {
    if (!password) {
      return {
        label: 'Waiting for password',
        width: '0%',
        tone: 'bg-slate-600',
        helper: 'Enter a new password to evaluate the live policy checks.',
      }
    }

    if (passedRuleCount <= 2) {
      return {
        label: 'Weak',
        width: '30%',
        tone: 'bg-rose-500',
        helper: 'Several required password checks are still failing.',
      }
    }

    if (passedRuleCount <= 4) {
      return {
        label: 'Moderate',
        width: '60%',
        tone: 'bg-amber-400',
        helper: 'The password is improving but still does not satisfy every rule.',
      }
    }

    return {
      label: 'Strong',
      width: '100%',
      tone: 'bg-emerald-400',
      helper: 'All current password policy checks are satisfied.',
    }
  }, [passedRuleCount, password])

  const passwordsMatch =
    password.length > 0 &&
    confirmPassword.length > 0 &&
    password === confirmPassword
  const isPasswordFullyValid =
    password.length > 0 && passwordRules.every((rule) => rule.isValid)
  const canRequestOtp = isPasswordFullyValid && passwordsMatch

  const handleRequestOtp = async () => {
    if (!canRequestOtp || !user || isRequestingOtp) {
      return
    }

    setIsRequestingOtp(true)
    setServerError('')
    setServerSuccess('')

    try {
      const response = await api.post('/profile/change-password/request-otp', {
        email: user.email,
      })

      setIsOtpRequested(true)
      setServerSuccess(response.data.message ?? 'OTP sent successfully.')
    } catch (error: unknown) {
      if (typeof error === 'object' && error && 'response' in error) {
        const axiosError = error as {
          response?: { data?: { errors?: string[]; message?: string } }
        }
        setServerError(
          axiosError.response?.data?.errors?.[0] ??
            axiosError.response?.data?.message ??
            'Unable to send OTP right now.',
        )
      } else {
        setServerError('Unable to reach the backend server.')
      }
    } finally {
      setIsRequestingOtp(false)
    }
  }

  const handlePasswordChange = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!user || !otp.trim() || isSubmitting) {
      return
    }

    setIsSubmitting(true)
    setServerError('')
    setServerSuccess('')

    try {
      const response = await api.post('/profile/change-password', {
        email: user.email,
        otp: otp.trim(),
        new_password: password,
      })

      setServerSuccess(
        response.data.message ?? 'Password changed successfully.',
      )
      setPassword('')
      setConfirmPassword('')
      setOtp('')
      setIsOtpRequested(false)
    } catch (error: unknown) {
      if (typeof error === 'object' && error && 'response' in error) {
        const axiosError = error as {
          response?: { data?: { errors?: string[]; message?: string } }
        }
        const firstError = axiosError.response?.data?.errors?.[0]
        setServerError(
          firstError ??
            axiosError.response?.data?.message ??
            'Unable to change your password right now.',
        )
      } else {
        setServerError('Unable to reach the backend server.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading || !user) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_24%),linear-gradient(180deg,_#020807_0%,_#06110e_45%,_#020807_100%)] flex items-center justify-center text-emerald-300">
        <p className="font-mono text-sm uppercase tracking-[0.3em]">Loading Profile...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_24%),linear-gradient(180deg,_#020807_0%,_#06110e_45%,_#020807_100%)] px-5 py-8 text-slate-100">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.45em] text-emerald-300/80">
              CipherLab
            </p>
            <h1 className="mt-3 font-mono text-4xl font-semibold text-white">
              User Profile
            </h1>
          </div>
          <Link
            to="/dashboard"
            className="rounded-2xl border border-emerald-400/20 bg-black/20 px-5 py-3 text-center font-mono text-sm font-semibold uppercase tracking-[0.2em] text-emerald-200 transition hover:bg-emerald-400/10"
          >
            Back to Dashboard
          </Link>
        </header>

        <section className="space-y-6">
          <div className="rounded-[1.75rem] border border-emerald-400/15 bg-black/25 p-6 shadow-[0_0_40px_rgba(16,185,129,0.08)] backdrop-blur">
            <h2 className="font-mono text-xl font-semibold text-white">Personal Details</h2>
            <div className="mt-5 grid gap-6 sm:grid-cols-2">
              <div>
                <label className="block font-mono text-xs uppercase tracking-[0.3em] text-emerald-200/80 mb-2">First Name</label>
                <input
                  type="text"
                  readOnly
                  value={user.first_name}
                  className="w-full rounded-2xl border border-emerald-400/10 bg-black/40 px-4 py-3.5 text-sm text-slate-400 outline-none"
                />
              </div>
              <div>
                <label className="block font-mono text-xs uppercase tracking-[0.3em] text-emerald-200/80 mb-2">Last Name</label>
                <input
                  type="text"
                  readOnly
                  value={user.last_name}
                  className="w-full rounded-2xl border border-emerald-400/10 bg-black/40 px-4 py-3.5 text-sm text-slate-400 outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-mono text-xs uppercase tracking-[0.3em] text-emerald-200/80 mb-2">Email Address</label>
                <input
                  type="email"
                  readOnly
                  value={user.email}
                  className="w-full rounded-2xl border border-emerald-400/10 bg-black/40 px-4 py-3.5 text-sm text-slate-400 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-emerald-400/15 bg-black/25 p-6 shadow-[0_0_40px_rgba(16,185,129,0.08)] backdrop-blur">
            <h2 className="font-mono text-xl font-semibold text-white">Change Password</h2>
            
            <form className="mt-5 space-y-6" onSubmit={handlePasswordChange}>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="block font-mono text-xs uppercase tracking-[0.3em] text-emerald-200/80" htmlFor="newPassword">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      className="w-full rounded-2xl border border-emerald-400/20 bg-[#020807] px-4 py-3.5 pr-16 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-400/20"
                      id="newPassword"
                      maxLength={32}
                      onChange={(event) => {
                        setPassword(event.target.value)
                        setIsOtpRequested(false)
                        setOtp('')
                      }}
                      placeholder="Enter a new password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      disabled={isOtpRequested}
                    />
                    <button
                      className="absolute inset-y-2 right-2 rounded-xl border border-emerald-400/20 px-3 font-mono text-xs uppercase tracking-[0.18em] text-emerald-200 transition hover:border-emerald-300 hover:text-white"
                      onClick={() => setShowPassword((current) => !current)}
                      type="button"
                    >
                      {showPassword ? 'Hide' : 'View'}
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-emerald-200/80">
                    <span>Password Strength</span>
                    <span>{passwordStrength.label}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${passwordStrength.tone}`}
                      style={{ width: passwordStrength.width }}
                    />
                  </div>
                  <p className="text-sm text-slate-400">
                    {passwordStrength.helper}
                  </p>
                  <div className="space-y-2 rounded-2xl border border-emerald-400/10 bg-[#020807]/80 p-4">
                    {passwordRules.map((rule) => (
                      <p
                        key={rule.label}
                        className={`text-sm ${
                          rule.isValid
                            ? 'text-emerald-200'
                            : 'text-slate-400'
                        }`}
                      >
                        {rule.isValid ? 'PASS' : 'PENDING'} - {rule.label}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block font-mono text-xs uppercase tracking-[0.3em] text-emerald-200/80" htmlFor="confirmPassword">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      className="w-full rounded-2xl border border-emerald-400/20 bg-[#020807] px-4 py-3.5 pr-16 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-400/20"
                      id="confirmPassword"
                      maxLength={32}
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                      placeholder="Confirm your password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      disabled={isOtpRequested}
                    />
                    <button
                      className="absolute inset-y-2 right-2 rounded-xl border border-emerald-400/20 px-3 font-mono text-xs uppercase tracking-[0.18em] text-emerald-200 transition hover:border-emerald-300 hover:text-white"
                      onClick={() =>
                        setShowConfirmPassword((current) => !current)
                      }
                      type="button"
                    >
                      {showConfirmPassword ? 'Hide' : 'View'}
                    </button>
                  </div>
                  {confirmPassword.length > 0 && !passwordsMatch && (
                    <p className="text-sm text-rose-300">
                      Password and confirm password must match.
                    </p>
                  )}
                </div>

                {!isOtpRequested ? (
                  <button
                    className="w-full rounded-2xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3.5 font-mono text-sm font-semibold uppercase tracking-[0.3em] text-emerald-200 transition hover:border-emerald-300 hover:bg-emerald-400/15 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-900 disabled:text-slate-500 disabled:hover:bg-slate-900"
                    disabled={!canRequestOtp || isRequestingOtp}
                    onClick={handleRequestOtp}
                    type="button"
                  >
                    {isRequestingOtp ? 'Sending OTP...' : 'Request OTP to Verify'}
                  </button>
                ) : (
                  <div className="space-y-4 rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-5">
                    <div className="space-y-2">
                      <label className="block font-mono text-xs uppercase tracking-[0.3em] text-emerald-200/80" htmlFor="changeOtp">
                        Email OTP
                      </label>
                      <input
                        className="w-full rounded-2xl border border-emerald-400/20 bg-[#020807] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-400/20"
                        id="changeOtp"
                        onChange={(event) => setOtp(event.target.value)}
                        placeholder="Enter the OTP sent to your email"
                        type="text"
                        value={otp}
                      />
                    </div>

                    <button
                      className="w-full rounded-2xl bg-emerald-300 px-4 py-3.5 font-mono text-sm font-semibold uppercase tracking-[0.3em] text-[#03110c] transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 disabled:hover:bg-slate-700"
                      disabled={!otp.trim() || isSubmitting}
                      type="submit"
                    >
                      {isSubmitting ? 'Updating...' : 'Change Password'}
                    </button>
                  </div>
                )}
              </div>

              {serverError && (
                <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  {serverError}
                </div>
              )}

              {serverSuccess && (
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                  {serverSuccess}
                </div>
              )}
            </form>
          </div>
        </section>
      </div>
    </main>
  )
}

export default ProfilePage
