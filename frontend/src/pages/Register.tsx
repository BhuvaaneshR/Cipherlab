import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

const emailPattern = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
const lettersOnlyPattern = /^[A-Za-z]+$/
const blockedPasswordTerms = ['admin', 'demo', 'cipherlab', 'balrehpic']

const filterLettersOnly = (value: string) => value.replace(/[^A-Za-z]/g, '')

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

function RegisterPage() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [isOtpRequested, setIsOtpRequested] = useState(false)
  const [isEmailVerified, setIsEmailVerified] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const trimmedFirstName = firstName.trim()
  const trimmedLastName = lastName.trim()
  const trimmedEmail = email.trim()
  const normalizedOtp = otp.trim()
  const isEmailValid = emailPattern.test(trimmedEmail)
  const isFirstNameValid =
    trimmedFirstName.length > 0 && lettersOnlyPattern.test(trimmedFirstName)
  const isLastNameValid =
    trimmedLastName.length > 0 && lettersOnlyPattern.test(trimmedLastName)
  const canRequestOtp =
    isFirstNameValid && isLastNameValid && isEmailValid

  const passwordRules = useMemo(() => {
    const normalizedPassword = normalizeAlphanumeric(password)
    const forbiddenFragments = getForbiddenPasswordFragments(
      trimmedFirstName,
      trimmedLastName,
      trimmedEmail,
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
  }, [password, trimmedEmail, trimmedFirstName, trimmedLastName])

  const passedRuleCount = passwordRules.filter((rule) => rule.isValid).length

  const passwordStrength = useMemo(() => {
    if (!password) {
      return {
        label: 'Waiting for password',
        width: '0%',
        tone: 'bg-slate-600',
        helper: 'Enter a password to evaluate the live policy checks.',
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
  const canCreateProfile =
    isEmailVerified && isPasswordFullyValid && passwordsMatch

  const handleRequestOtp = () => {
    if (!canRequestOtp) {
      return
    }

    setIsOtpRequested(true)
  }

  const handleVerifyOtp = () => {
    if (!normalizedOtp) {
      return
    }

    setIsEmailVerified(true)
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.14),_transparent_28%),linear-gradient(180deg,_#020807_0%,_#071512_48%,_#020807_100%)] px-6 py-10 text-slate-100">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[2rem] border border-emerald-400/15 bg-black/35 shadow-[0_0_60px_rgba(16,185,129,0.08)] backdrop-blur xl:grid-cols-[1.02fr_0.98fr]">
          <section className="hidden border-r border-emerald-400/10 bg-[linear-gradient(160deg,_rgba(6,95,70,0.22),_rgba(2,8,7,0.4))] p-10 xl:flex xl:flex-col xl:justify-between">
            <div>
              <p className="font-mono text-sm uppercase tracking-[0.45em] text-emerald-300/80">
                CipherLab
              </p>
              <h1 className="mt-6 max-w-md font-mono text-5xl font-semibold leading-tight text-white">
                Profile Registration
              </h1>
              <p className="mt-6 max-w-lg text-base leading-7 text-slate-300">
                Create a new profile by validating your identity details,
                confirming ownership of your email address, and then setting a
                password for the lab.
              </p>
            </div>
          </section>

          <section className="p-6 sm:p-10 lg:p-12">
            <div className="mx-auto w-full max-w-xl">
              <div className="mb-10 xl:hidden">
                <p className="font-mono text-xs uppercase tracking-[0.45em] text-emerald-300/80">
                  CipherLab
                </p>
                <h1 className="mt-4 font-mono text-4xl font-semibold text-white">
                  Create Profile
                </h1>
              </div>

              <div className="rounded-[1.75rem] border border-emerald-400/15 bg-[#07110f]/90 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] sm:p-8">
                <div className="mb-8">
                  <p className="font-mono text-xs uppercase tracking-[0.35em] text-emerald-300/80">
                    Registration Console
                  </p>
                  <h2 className="mt-4 font-mono text-3xl font-semibold text-white">
                    Register with verified email
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-slate-400">
                    Email addresses such as `analyst@cipherlab.in` and academic
                    formats like `name@institution.edu.in` are accepted when
                    they follow a valid structure.
                  </p>
                </div>

                <form className="space-y-6">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label
                        className="block font-mono text-xs uppercase tracking-[0.3em] text-emerald-200/80"
                        htmlFor="firstName"
                      >
                        First Name
                      </label>
                        <input
                          className="w-full rounded-2xl border border-emerald-400/20 bg-[#020807] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-400/20"
                          id="firstName"
                          name="firstName"
                          onChange={(event) =>
                            setFirstName(filterLettersOnly(event.target.value))
                          }
                          placeholder="Aarav"
                          type="text"
                          value={firstName}
                        />
                        <p className="text-sm text-slate-400">
                          Only letters are allowed in the first name field.
                        </p>
                    </div>

                    <div className="space-y-2">
                      <label
                        className="block font-mono text-xs uppercase tracking-[0.3em] text-emerald-200/80"
                        htmlFor="lastName"
                      >
                        Last Name
                      </label>
                        <input
                          className="w-full rounded-2xl border border-emerald-400/20 bg-[#020807] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-400/20"
                          id="lastName"
                          name="lastName"
                          onChange={(event) =>
                            setLastName(filterLettersOnly(event.target.value))
                          }
                          placeholder="Mehta"
                          type="text"
                          value={lastName}
                        />
                        <p className="text-sm text-slate-400">
                          Only letters are allowed in the last name field.
                        </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label
                      className="block font-mono text-xs uppercase tracking-[0.3em] text-emerald-200/80"
                      htmlFor="registerEmail"
                    >
                      Email Address
                    </label>
                    <input
                      className="w-full rounded-2xl border border-emerald-400/20 bg-[#020807] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-400/20"
                      id="registerEmail"
                      name="registerEmail"
                      onChange={(event) => {
                        setEmail(event.target.value)
                        setIsOtpRequested(false)
                        setIsEmailVerified(false)
                        setOtp('')
                      }}
                      placeholder="analyst@cipherlab.in"
                      type="email"
                      value={email}
                    />
                    <p
                      className={`text-sm ${
                        trimmedEmail.length === 0 || isEmailValid
                          ? 'text-slate-400'
                          : 'text-rose-300'
                      }`}
                    >
                      {trimmedEmail.length === 0 || isEmailValid
                        ? 'Use a valid address format such as name@domain.com or name@institution.edu.in.'
                        : 'Enter a valid email address in the format xxxx@yyyy.zz.'}
                    </p>
                  </div>

                  <button
                    className="w-full rounded-2xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3.5 font-mono text-sm font-semibold uppercase tracking-[0.3em] text-emerald-200 transition hover:border-emerald-300 hover:bg-emerald-400/15 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-900 disabled:text-slate-500 disabled:hover:bg-slate-900"
                    disabled={!canRequestOtp}
                    onClick={handleRequestOtp}
                    type="button"
                  >
                    Verify Email Address
                  </button>

                  {isOtpRequested && (
                    <div className="space-y-4 rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-5">
                      <div className="space-y-2">
                        <label
                          className="block font-mono text-xs uppercase tracking-[0.3em] text-emerald-200/80"
                          htmlFor="registerOtp"
                        >
                          Email OTP
                        </label>
                        <input
                          className="w-full rounded-2xl border border-emerald-400/20 bg-[#020807] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-400/20"
                          id="registerOtp"
                          name="registerOtp"
                          onChange={(event) => setOtp(event.target.value)}
                          placeholder="Enter the OTP sent to your email"
                          type="text"
                          value={otp}
                        />
                      </div>

                      <button
                        className="w-full rounded-2xl bg-emerald-300 px-4 py-3.5 font-mono text-sm font-semibold uppercase tracking-[0.3em] text-[#03110c] transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 disabled:hover:bg-slate-700"
                        disabled={!normalizedOtp}
                        onClick={handleVerifyOtp}
                        type="button"
                      >
                        Verify OTP
                      </button>

                      <p className="text-sm text-slate-400">
                        Frontend placeholder: OTP submission is simulated for now
                        and will be connected to backend email delivery next.
                      </p>
                    </div>
                  )}

                  {isEmailVerified && (
                    <div className="space-y-6 rounded-2xl border border-emerald-400/15 bg-black/20 p-5">
                      <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/5 px-4 py-3 text-sm text-emerald-200">
                        Email address verified successfully. You can now create
                        your password.
                      </div>

                      <div className="space-y-2">
                        <label
                          className="block font-mono text-xs uppercase tracking-[0.3em] text-emerald-200/80"
                          htmlFor="registerPassword"
                        >
                          Enter Password
                        </label>
                        <div className="relative">
                          <input
                            className="w-full rounded-2xl border border-emerald-400/20 bg-[#020807] px-4 py-3.5 pr-16 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-400/20"
                            id="registerPassword"
                            maxLength={32}
                            name="registerPassword"
                            onChange={(event) => setPassword(event.target.value)}
                            placeholder="Create a password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
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
                        <label
                          className="block font-mono text-xs uppercase tracking-[0.3em] text-emerald-200/80"
                          htmlFor="confirmPassword"
                        >
                          Confirm Password
                        </label>
                        <div className="relative">
                          <input
                            className="w-full rounded-2xl border border-emerald-400/20 bg-[#020807] px-4 py-3.5 pr-16 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-400/20"
                            id="confirmPassword"
                            maxLength={32}
                            name="confirmPassword"
                            onChange={(event) =>
                              setConfirmPassword(event.target.value)
                            }
                            placeholder="Confirm your password"
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={confirmPassword}
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

                      <button
                        className="w-full rounded-2xl bg-emerald-300 px-4 py-3.5 font-mono text-sm font-semibold uppercase tracking-[0.3em] text-[#03110c] transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 disabled:hover:bg-slate-700"
                        disabled={!canCreateProfile}
                        type="submit"
                      >
                        Create Profile
                      </button>
                    </div>
                  )}
                </form>

                <p className="mt-6 text-sm text-slate-400">
                  Already registered?{' '}
                  <Link
                    className="font-medium text-emerald-300 transition hover:text-emerald-200"
                    to="/login"
                  >
                    Sign in here
                  </Link>
                  .
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}

export default RegisterPage
