import { useState } from 'react'
import { Link } from 'react-router-dom'

function LoginPage() {
  const [otp, setOtp] = useState('')

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.16),_transparent_30%),linear-gradient(180deg,_#020807_0%,_#071512_52%,_#020807_100%)] px-6 py-10 text-slate-100">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[2rem] border border-emerald-400/15 bg-black/35 shadow-[0_0_60px_rgba(16,185,129,0.08)] backdrop-blur xl:grid-cols-[1.1fr_0.9fr]">
          <section className="hidden border-r border-emerald-400/10 bg-[linear-gradient(160deg,_rgba(6,95,70,0.22),_rgba(2,8,7,0.4))] p-10 xl:flex xl:flex-col xl:justify-between">
            <div>
              <p className="font-mono text-sm uppercase tracking-[0.45em] text-emerald-300/80">
                CipherLab
              </p>
              <h1 className="mt-6 max-w-md font-mono text-5xl font-semibold leading-tight text-white">
                Password Analysis Laboratory
              </h1>
              <p className="mt-6 max-w-lg text-base leading-7 text-slate-300">
                Explore how credentials move through secure authentication
                systems, from password checks to OTP verification and protected
                access.
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
                  Secure Login
                </h1>
              </div>

              <div className="rounded-[1.75rem] border border-emerald-400/15 bg-[#07110f]/90 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] sm:p-8">
                <div className="mb-8">
                  <p className="font-mono text-xs uppercase tracking-[0.35em] text-emerald-300/80">
                    Authentication Console
                  </p>
                  <h2 className="mt-4 font-mono text-3xl font-semibold text-white">
                    Sign in to CipherLab
                  </h2>
                  <p className="mt-3 max-w-lg text-sm leading-6 text-slate-400">
                    Enter your registered email and password, request a one-time
                    password, then verify the OTP to access the dashboard.
                  </p>
                </div>

                <form className="space-y-6">
                  <div className="space-y-2">
                    <label
                      className="block font-mono text-xs uppercase tracking-[0.3em] text-emerald-200/80"
                      htmlFor="email"
                    >
                      Email Address
                    </label>
                    <input
                      className="w-full rounded-2xl border border-emerald-400/20 bg-[#020807] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-400/20"
                      id="email"
                      name="email"
                      placeholder="analyst@cipherlab.dev"
                      type="email"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      className="block font-mono text-xs uppercase tracking-[0.3em] text-emerald-200/80"
                      htmlFor="password"
                    >
                      Password
                    </label>
                    <input
                      className="w-full rounded-2xl border border-emerald-400/20 bg-[#020807] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-400/20"
                      id="password"
                      name="password"
                      placeholder="Enter your password"
                      type="password"
                    />
                  </div>

                  <button
                    className="w-full rounded-2xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3.5 font-mono text-sm font-semibold uppercase tracking-[0.3em] text-emerald-200 transition hover:border-emerald-300 hover:bg-emerald-400/15"
                    type="button"
                  >
                    Get OTP
                  </button>

                  <div className="space-y-2">
                    <label
                      className="block font-mono text-xs uppercase tracking-[0.3em] text-emerald-200/80"
                      htmlFor="otp"
                    >
                      One-Time Password
                    </label>
                    <input
                      className="w-full rounded-2xl border border-emerald-400/20 bg-[#020807] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-400/20"
                      id="otp"
                      name="otp"
                      onChange={(event) => setOtp(event.target.value)}
                      placeholder="Enter the OTP sent to your email"
                      type="text"
                      value={otp}
                    />
                  </div>

                  <button
                    className="w-full rounded-2xl bg-emerald-300 px-4 py-3.5 font-mono text-sm font-semibold uppercase tracking-[0.3em] text-[#03110c] transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 disabled:hover:bg-slate-700"
                    disabled={!otp.trim()}
                    type="submit"
                  >
                    Login
                  </button>
                </form>

                <p className="mt-6 text-sm text-slate-400">
                  New to CipherLab?{' '}
                  <Link
                    className="font-medium text-emerald-300 transition hover:text-emerald-200"
                    to="/register"
                  >
                    Create an account
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

export default LoginPage
