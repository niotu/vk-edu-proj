import { useState } from 'react'

export default function SignUpForm({ onSuccess }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  const handleSubmit = () => {
    const trimmedName = name.trim()
    const trimmedEmail = email.trim()
    if (!trimmedName) return

    onSuccess({
      displayName: trimmedName,
      email: trimmedEmail,
    })
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
        <input className="qp-input" type="password" placeholder="••••••••" />
      </label>
      <button className="qp-primaryBtn" type="button" onClick={handleSubmit}>
        Create account
      </button>
    </div>
  )
}
