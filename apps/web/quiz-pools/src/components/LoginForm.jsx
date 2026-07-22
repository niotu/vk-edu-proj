import { useState } from 'react'
import { loginUser } from '../lib/api.js'

export default function LoginForm({ onSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    const trimmedEmail = email.trim()
    const trimmedPassword = password.trim()

    if (!trimmedEmail || !trimmedPassword) {
      setError('Email and password are required.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await loginUser({ email: trimmedEmail, password: trimmedPassword })
      onSuccess({
        ...result,
        displayName: trimmedEmail.includes('@') ? trimmedEmail.split('@')[0] : trimmedEmail,
      })
    } catch (err) {
      setError(err.message || 'Unable to login. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="qp-form">
      <label className="qp-field">
        <span className="qp-field__label">Email</span>
        <input
          className="qp-input"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      <label className="qp-field">
        <span className="qp-field__label">Password</span>
        <input
          className="qp-input"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      {error ? <div className="qp-error">{error}</div> : null}
      <button className="qp-primaryBtn" type="button" onClick={handleSubmit} disabled={loading}>
        {loading ? 'Signing in...' : 'Continue'}
      </button>
    </div>
  )
}
