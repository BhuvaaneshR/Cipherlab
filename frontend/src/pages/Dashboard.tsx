import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

type AttackRow = {
  attack: string
  attempts_per_second: number
  estimated_time: string
  success_probability: string
}

type PipelineStage = {
  stage: string
  value: string
}

type ComparisonRow = {
  algorithm: string
  hash_speed: string
  memory_usage: string
  security_level: string
}

type AnalysisResponse = {
  salt: string
  hash: string
  entropy: number
  crack_time_estimate: string
  security_metrics: {
    length: number
    character_diversity: number
    hash_time_ms: number
    memory_cost: number
    parallelism: number
    iterations: number
  }
  attack_simulation_results: AttackRow[]
  algorithm_comparison: ComparisonRow[]
  pipeline: PipelineStage[]
  algorithm_notes: {
    algorithm: string
    hash_speed: string
    memory_usage: string
    security_level: string
    attacks_resisted: string[]
    mode: string
  }
}

const algorithms = [
  { value: 'bcrypt', label: 'bcrypt' },
  { value: 'argon2', label: 'Argon2' },
  { value: 'pbkdf2', label: 'PBKDF2' },
  { value: 'sha256', label: 'SHA-256 Demo' },
]

function DashboardPage() {
  const [password, setPassword] = useState('CipherLab@2026')
  const [algorithm, setAlgorithm] = useState('bcrypt')
  const [saltLength, setSaltLength] = useState(16)
  const [costFactor, setCostFactor] = useState(12)
  const [memoryCost, setMemoryCost] = useState(65536)
  const [parallelism, setParallelism] = useState(2)
  const [iterations, setIterations] = useState(120000)
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null)
  const [error, setError] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const navigate = useNavigate()

  const handleSignOut = () => {
    localStorage.removeItem('userEmail')
    navigate('/login')
  }

  const handleAnalyze = async () => {
    if (!password.trim() || isAnalyzing) {
      return
    }

    setIsAnalyzing(true)
    setError('')

    try {
      const response = await api.post<AnalysisResponse>('/analyze-password', {
        password,
        algorithm,
        salt_length: saltLength,
        cost_factor: costFactor,
        memory_cost: memoryCost,
        parallelism,
        iterations,
      })
      setAnalysis(response.data)
    } catch (requestError: unknown) {
      setError('Unable to analyze the password right now.')
      setAnalysis(null)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const metricCards = analysis
    ? [
        { label: 'Password Length', value: `${analysis.security_metrics.length}` },
        { label: 'Estimated Entropy', value: `${analysis.entropy} bits` },
        { label: 'Hash Time', value: `${analysis.security_metrics.hash_time_ms} ms` },
        { label: 'Crack Time Estimate', value: analysis.crack_time_estimate },
      ]
    : []

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_24%),linear-gradient(180deg,_#020807_0%,_#06110e_45%,_#020807_100%)] px-5 py-8 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.45em] text-emerald-300/80">
              CipherLab
            </p>
            <h1 className="mt-3 font-mono text-4xl font-semibold text-white sm:text-5xl">
              Password Analysis Laboratory
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300">
              Explore how salts, work factors, and hashing algorithms transform
              a password into a stored credential, and compare how different
              attack models respond.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              to="/profile"
              className="rounded-2xl border border-emerald-400/20 bg-black/20 px-5 py-3 text-center font-mono text-sm font-semibold uppercase tracking-[0.2em] text-emerald-200 transition hover:bg-emerald-400/10"
            >
              Profile
            </Link>
            <button
              onClick={handleSignOut}
              className="rounded-2xl border border-rose-400/20 bg-black/20 px-5 py-3 font-mono text-sm font-semibold uppercase tracking-[0.2em] text-rose-300 transition hover:bg-rose-400/10"
              type="button"
            >
              Sign Out
            </button>
            <button
              className="rounded-2xl bg-emerald-300 px-5 py-3 font-mono text-sm font-semibold uppercase tracking-[0.3em] text-[#03110c] transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
              disabled={!password.trim() || isAnalyzing}
              onClick={handleAnalyze}
              type="button"
            >
              {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
            </button>
          </div>
        </header>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="rounded-[1.75rem] border border-emerald-400/15 bg-black/25 p-6 shadow-[0_0_40px_rgba(16,185,129,0.08)] backdrop-blur">
              <h2 className="font-mono text-xl font-semibold text-white">
                Password Input Panel
              </h2>
              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-2 block font-mono text-xs uppercase tracking-[0.3em] text-emerald-200/80">
                    Candidate Password
                  </label>
                  <input
                    className="w-full rounded-2xl border border-emerald-400/20 bg-[#020807] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-400/20"
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter a password to analyze"
                    type="text"
                    value={password}
                  />
                </div>
                <div>
                  <label className="mb-2 block font-mono text-xs uppercase tracking-[0.3em] text-emerald-200/80">
                    Hash Algorithm
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {algorithms.map((item) => (
                      <button
                        key={item.value}
                        className={`rounded-2xl border px-4 py-3 text-left transition ${
                          algorithm === item.value
                            ? 'border-emerald-300 bg-emerald-400/10 text-emerald-200'
                            : 'border-emerald-400/15 bg-black/20 text-slate-300 hover:border-emerald-400/30'
                        }`}
                        onClick={() => setAlgorithm(item.value)}
                        type="button"
                      >
                        <p className="font-mono text-sm uppercase tracking-[0.22em]">
                          {item.label}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-emerald-400/15 bg-black/25 p-6 shadow-[0_0_40px_rgba(16,185,129,0.08)] backdrop-blur">
              <h2 className="font-mono text-xl font-semibold text-white">
                Hash Parameter Controls
              </h2>
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                {[
                  {
                    label: 'Salt Length',
                    value: saltLength,
                    min: 8,
                    max: 32,
                    setter: setSaltLength,
                  },
                  {
                    label: 'Cost Factor',
                    value: costFactor,
                    min: 4,
                    max: 15,
                    setter: setCostFactor,
                  },
                  {
                    label: 'Memory Cost',
                    value: memoryCost,
                    min: 1024,
                    max: 131072,
                    setter: setMemoryCost,
                  },
                  {
                    label: 'Parallelism',
                    value: parallelism,
                    min: 1,
                    max: 8,
                    setter: setParallelism,
                  },
                  {
                    label: 'Iterations',
                    value: iterations,
                    min: 1000,
                    max: 240000,
                    setter: setIterations,
                  },
                ].map((control) => (
                  <label key={control.label} className="block">
                    <span className="mb-2 block font-mono text-xs uppercase tracking-[0.3em] text-emerald-200/80">
                      {control.label}
                    </span>
                    <input
                      className="w-full accent-emerald-300"
                      max={control.max}
                      min={control.min}
                      onChange={(event) =>
                        control.setter(Number(event.target.value))
                      }
                      type="range"
                      value={control.value}
                    />
                    <span className="mt-2 block text-sm text-slate-300">
                      {control.value}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-emerald-400/15 bg-black/25 p-6 shadow-[0_0_40px_rgba(16,185,129,0.08)] backdrop-blur">
              <h2 className="font-mono text-xl font-semibold text-white">
                Hash Visualization Pipeline
              </h2>
              <div className="mt-5 grid gap-4 md:grid-cols-5">
                {(analysis?.pipeline ?? []).map((stage, index) => (
                  <div
                    key={stage.stage}
                    className="rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-4"
                  >
                    <p className="font-mono text-xs uppercase tracking-[0.28em] text-emerald-300/80">
                      Step {index + 1}
                    </p>
                    <h3 className="mt-2 text-sm font-semibold text-white">
                      {stage.stage}
                    </h3>
                    <p className="mt-3 break-words text-xs leading-5 text-slate-300">
                      {stage.value}
                    </p>
                  </div>
                ))}
                {!analysis && (
                  <p className="md:col-span-5 text-sm text-slate-400">
                    Run an analysis to animate the path from password input to
                    database storage.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[1.75rem] border border-emerald-400/15 bg-black/25 p-6 shadow-[0_0_40px_rgba(16,185,129,0.08)] backdrop-blur">
              <h2 className="font-mono text-xl font-semibold text-white">
                Security Metrics Panel
              </h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {metricCards.map((card) => (
                  <div
                    key={card.label}
                    className="rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-4"
                  >
                    <p className="font-mono text-xs uppercase tracking-[0.25em] text-emerald-300/75">
                      {card.label}
                    </p>
                    <p className="mt-3 text-lg font-semibold text-white">
                      {card.value}
                    </p>
                  </div>
                ))}
                {!analysis && (
                  <p className="sm:col-span-2 text-sm text-slate-400">
                    Metrics will appear after the first analysis run.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-emerald-400/15 bg-black/25 p-6 shadow-[0_0_40px_rgba(16,185,129,0.08)] backdrop-blur">
              <h2 className="font-mono text-xl font-semibold text-white">
                Attack Simulation Results
              </h2>
              <div className="mt-5 space-y-4">
                {analysis?.attack_simulation_results.map((row) => (
                  <div
                    key={row.attack}
                    className="rounded-2xl border border-emerald-400/15 bg-black/20 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-sm font-semibold text-white">
                          {row.attack}
                        </h3>
                        <p className="mt-1 text-xs text-slate-400">
                          {row.attempts_per_second.toLocaleString()} attempts/sec
                        </p>
                      </div>
                      <span className="rounded-full border border-emerald-400/15 px-3 py-1 text-xs text-emerald-200">
                        {row.success_probability}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-slate-300">
                      Estimated time: {row.estimated_time}
                    </p>
                  </div>
                ))}
                {!analysis && (
                  <p className="text-sm text-slate-400">
                    Simulated dictionary, brute force, rainbow table, and GPU
                    attack outputs will appear here.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-emerald-400/15 bg-black/25 p-6 shadow-[0_0_40px_rgba(16,185,129,0.08)] backdrop-blur">
              <h2 className="font-mono text-xl font-semibold text-white">
                Algorithm Comparison
              </h2>
              <div className="mt-5 overflow-hidden rounded-2xl border border-emerald-400/15">
                <table className="min-w-full divide-y divide-emerald-400/10 text-left text-sm">
                  <thead className="bg-emerald-400/5 text-emerald-200">
                    <tr>
                      <th className="px-4 py-3 font-mono uppercase tracking-[0.2em]">Algorithm</th>
                      <th className="px-4 py-3 font-mono uppercase tracking-[0.2em]">Hash Speed</th>
                      <th className="px-4 py-3 font-mono uppercase tracking-[0.2em]">Memory</th>
                      <th className="px-4 py-3 font-mono uppercase tracking-[0.2em]">Security</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-400/10 bg-black/20 text-slate-300">
                    {(analysis?.algorithm_comparison ?? []).map((row) => (
                      <tr key={row.algorithm}>
                        <td className="px-4 py-3 uppercase">{row.algorithm}</td>
                        <td className="px-4 py-3">{row.hash_speed}</td>
                        <td className="px-4 py-3">{row.memory_usage}</td>
                        <td className="px-4 py-3">{row.security_level}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!analysis && (
                  <p className="px-4 py-4 text-sm text-slate-400">
                    Comparison data will load after you run the lab analysis.
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {analysis && (
          <section className="mt-6 rounded-[1.75rem] border border-emerald-400/15 bg-black/25 p-6 shadow-[0_0_40px_rgba(16,185,129,0.08)] backdrop-blur">
            <h2 className="font-mono text-xl font-semibold text-white">
              Hash Output and Notes
            </h2>
            <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-2xl border border-emerald-400/15 bg-[#020807] p-4">
                <p className="font-mono text-xs uppercase tracking-[0.25em] text-emerald-300/75">
                  Salt
                </p>
                <p className="mt-2 break-all text-sm text-slate-300">
                  {analysis.salt}
                </p>
                <p className="mt-4 font-mono text-xs uppercase tracking-[0.25em] text-emerald-300/75">
                  Hash
                </p>
                <p className="mt-2 break-all text-sm text-slate-300">
                  {analysis.hash}
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-4">
                <p className="font-mono text-xs uppercase tracking-[0.25em] text-emerald-300/75">
                  Algorithm Notes
                </p>
                <p className="mt-3 text-sm text-slate-300">
                  {analysis.algorithm_notes.algorithm.toUpperCase()} runs in{' '}
                  {analysis.algorithm_notes.mode} mode with a{' '}
                  {analysis.algorithm_notes.security_level.toLowerCase()} security
                  posture and {analysis.algorithm_notes.memory_usage.toLowerCase()}
                  {' '}memory usage.
                </p>
                <p className="mt-3 text-sm text-slate-300">
                  Best against:{' '}
                  {analysis.algorithm_notes.attacks_resisted.join(', ')}.
                </p>
              </div>
            </div>
          </section>
        )}

        {error && (
          <div className="mt-6 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}
      </div>
    </main>
  )
}

export default DashboardPage
