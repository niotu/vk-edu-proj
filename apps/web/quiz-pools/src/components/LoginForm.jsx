import { useState } from 'react'

export default function LoginForm({ onSuccess }) {
  const [email, setEmail] = useState('')

  const handleSubmit = () => {
    const trimmedEmail = email.trim()
    if (!trimmedEmail) return

    const displayName = trimmedEmail.includes('@')
      ? trimmedEmail.split('@')[0]
      : trimmedEmail

    onSuccess({ displayName, email: trimmedEmail })
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
        <input className="qp-input" type="password" placeholder="••••••••" />
      </label>
      <button className="qp-primaryBtn" type="button" onClick={handleSubmit}>
        Continue
      </button>
    </div>
  )
}
