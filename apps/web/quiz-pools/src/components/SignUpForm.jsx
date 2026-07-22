import { useState } from 'react'
import { registerUser } from '../lib/api.js'
import RoleToggle from './RoleToggle.jsx'

export default function SignUpForm({ onSuccess }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('MEMBER')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    const trimmedName = name.trim()
    const trimmedEmail = email.trim()
    const trimmedPassword = password.trim()

    if (!trimmedName || !trimmedEmail || !trimmedPassword) {
      setError('Name, email and password are required.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await registerUser({
        name: trimmedName,
        email: trimmedEmail,
        password: trimmedPassword,
        role,
      })

      onSuccess({
        ...result,
        displayName: trimmedName,
      })
    } catch (err) {
      setError(err.message || 'Unable to create account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="qp-form">
      <label className="qp-field">
        <span className="qp-field__label">Name</span>
        <input
          className="qp-input"
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
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
      <label className="qp-field">
        <span className="qp-field__label">Role</span>
        <RoleToggle value={role} onChange={setRole} />
      </label>
      {error ? <div className="qp-error">{error}</div> : null}
      <button className="qp-primaryBtn" type="button" onClick={handleSubmit} disabled={loading}>
        {loading ? 'Creating account...' : 'Create account'}
      </button>
    </div>
  )
}
