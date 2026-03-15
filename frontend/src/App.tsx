import { Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './pages/Login'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/dashboard"
        element={
          <main className="flex min-h-screen items-center justify-center bg-[#06110e] px-6 py-10 text-[#d7ffe9]">
            <div className="w-full max-w-3xl rounded-3xl border border-emerald-400/20 bg-black/30 p-10 text-center shadow-[0_0_40px_rgba(16,185,129,0.12)] backdrop-blur">
              <p className="text-sm uppercase tracking-[0.35em] text-emerald-300/70">
                CipherLab
              </p>
              <h1 className="mt-4 font-mono text-4xl font-semibold text-white">
                Dashboard Placeholder
              </h1>
              <p className="mt-4 text-sm text-slate-300">
                OTP verification will route users here once the login flow is
                connected to the backend.
              </p>
            </div>
          </main>
        }
      />
    </Routes>
  )
}

export default App
