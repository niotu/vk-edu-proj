import { useCallback, useMemo, useState } from 'react'
import LoginForm from '../components/LoginForm.jsx'
import SignUpForm from '../components/SignUpForm.jsx'

export default function HomePage() {
  const [dialog, setDialog] = useState(null)

  const close = useCallback(() => setDialog(null), [])

  const dialogTitle = useMemo(() => {
    switch (dialog) {
      case 'login':
        return 'Login'
      case 'signup':
        return 'Sign up'
      default:
        return ''
    }
  }, [dialog])

  return (
    <section className="qp-screen">
      <div className="qp-card">
        <h1 className="qp-title">Quiz Pools</h1>
        <p className="qp-subtitle">
          Create or join a pool, invite friends, and play quizzes together.
        </p>

        <div className="qp-actions">
          <button className="qp-secondaryBtn" type="button">
            Create pool
          </button>
          <button className="qp-primaryBtn" type="button" onClick={() => setDialog('login')}>
            Login
          </button>
          <button className="qp-secondaryBtn" type="button" onClick={() => setDialog('signup')}>
            Sign up
          </button>
        </div>
      </div>

      {dialog !== null ? (
        <div className="qp-dialogOverlay" role="dialog" aria-modal="true">
          <button className="qp-dialogBackdrop" type="button" aria-label="Close" onClick={close} />
          <div className="qp-dialog">
            <button className="qp-iconBtn" type="button" aria-label="Close" onClick={close}>
              ×
            </button>
            <h2 className="qp-title qp-title--sm">{dialogTitle}</h2>
            {dialog === 'login' ? <LoginForm /> : null}
            {dialog === 'signup' ? <SignUpForm /> : null}
          </div>
        </div>
      ) : null}
    </section>
  )
}
