import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate(params.get('next') ?? '/dashboard', { replace: true })
    } catch {
      setError('Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={pageStyle}>
      <form onSubmit={submit} style={cardStyle}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text)', marginBottom: 4 }}>
            Welcome back
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text3)' }}>Sign in to collaborate</p>
        </div>

        <label style={labelStyle}>Email</label>
        <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />

        <label style={{ ...labelStyle, marginTop: 10 }}>Password</label>
        <input style={inputStyle} type="password" value={password} onChange={e => setPassword(e.target.value)} required />

        {error && <p style={{ fontSize: 12, color: 'var(--red)', marginTop: 8 }}>{error}</p>}

        <button type="submit" disabled={loading} style={{ ...btnStyle, marginTop: 16, opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>

        <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 16, textAlign: 'center' }}>
          No account?{' '}
          <Link to="/register" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Create one</Link>
        </p>
      </form>
    </div>
  )
}

const pageStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  height: '100vh', background: 'var(--bg)',
}
const cardStyle: React.CSSProperties = {
  background: 'var(--bg2)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius)', padding: 32,
  display: 'flex', flexDirection: 'column', width: 320,
  boxShadow: '0 8px 32px oklch(0% 0 0 / 40%)',
}
const labelStyle: React.CSSProperties = { fontSize: 12, color: 'var(--text2)', marginBottom: 5 }
const inputStyle: React.CSSProperties = {
  padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border2)',
  background: 'var(--bg3)', color: 'var(--text)', fontSize: 14,
  fontFamily: 'var(--font)', outline: 'none', width: '100%',
}
const btnStyle: React.CSSProperties = {
  padding: '9px 0', borderRadius: 8, border: 'none',
  background: 'var(--accent)', color: 'white', fontSize: 14,
  fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font)', width: '100%',
}
