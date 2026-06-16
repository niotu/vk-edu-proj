import { useCallback, useMemo, useState } from 'react'
import LoginForm from './LoginForm.jsx'
import SignUpForm from './SignUpForm.jsx'

export default function AuthDialog({ mode, onClose, onSuccess }) {
  const title = useMemo(() => (mode === 'login' ? 'Login' : 'Sign up'), [mode])

  const handleBackdrop = useCallback(
    (event) => {
      if (event.target === event.currentTarget) onClose()
    },
    [onClose]
  )

  return (
    <div
      className="qp-dialogOverlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qp-auth-title"
      onClick={handleBackdrop}
    >
      <div className="qp-dialog">
        <button className="qp-iconBtn" type="button" aria-label="Close" onClick={onClose}>
          ×
        </button>
        <h2 id="qp-auth-title" className="qp-title qp-title--sm">{title}</h2>
        {mode === 'login' ? <LoginForm onSuccess={onSuccess} /> : null}
        {mode === 'signup' ? <SignUpForm onSuccess={onSuccess} /> : null}
      </div>
    </div>
  )
}
