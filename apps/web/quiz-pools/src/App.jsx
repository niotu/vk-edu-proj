import './App.css'
import { useCallback, useMemo, useState } from 'react'
import HomePage from './pages/HomePage.jsx'
import QuizCreatePage from './pages/QuizCreatePage.jsx'
import OrgWaitingPage from './pages/OrgWaitingPage.jsx'
import OrganizerQuizPage from './pages/OrganizerQuizPage.jsx'
import QuizJoinPage from './pages/QuizJoinPage.jsx'
import MemberWaitingPage from './pages/MemberWaitingPage.jsx'
import MemberQuizPage from './pages/MemberQuizPage.jsx'
import LeaderboardPage from './pages/LeaderboardPage.jsx'
import AuthDialog from './components/AuthDialog.jsx'
import { ROUTES } from './navigation/routes.js'
import { getAccountFromCookie, setAccountCookie } from './lib/accountCookie.js'

function App() {
  const [route, setRoute] = useState(ROUTES.HOME)
  const [account, setAccount] = useState(() => getAccountFromCookie())
  const [authDialog, setAuthDialog] = useState(null)
  const [authIntent, setAuthIntent] = useState(null)

  const navigate = useCallback((nextRoute) => setRoute(nextRoute), [])

  const closeAuthDialog = useCallback(() => {
    setAuthDialog(null)
    setAuthIntent(null)
  }, [])

  const handleAuthSuccess = useCallback(
    (session) => {
      setAccountCookie(session)
      setAccount(session)
      setAuthDialog(null)
      if (authIntent === 'create') {
        navigate(ROUTES.QUIZ_CREATE)
      }
      setAuthIntent(null)
    },
    [authIntent, navigate]
  )

  const handleCreate = useCallback(() => {
    if (account) {
      navigate(ROUTES.QUIZ_CREATE)
      return
    }
    setAuthIntent('create')
    setAuthDialog('signup')
  }, [account, navigate])

  const handleJoin = useCallback(() => {
    navigate(ROUTES.QUIZ_JOIN)
  }, [navigate])

  const page = useMemo(() => {
    switch (route) {
      case ROUTES.QUIZ_CREATE:
        return <QuizCreatePage onNavigate={navigate} />
      case ROUTES.ORG_WAITING:
        return <OrgWaitingPage onNavigate={navigate} />
      case ROUTES.ORGANIZER_QUIZ:
        return <OrganizerQuizPage onNavigate={navigate} />
      case ROUTES.QUIZ_JOIN:
        return <QuizJoinPage onNavigate={navigate} />
      case ROUTES.MEMBER_WAITING:
        return <MemberWaitingPage onNavigate={navigate} />
      case ROUTES.MEMBER_QUIZ:
        return <MemberQuizPage onNavigate={navigate} />
      case ROUTES.LEADERBOARD:
        return <LeaderboardPage onNavigate={navigate} />
      case ROUTES.HOME:
      default:
        return (
          <HomePage onCreate={handleCreate} onJoin={handleJoin} />
        )
    }
  }, [route, navigate, handleCreate, handleJoin])

  return (
    <>
      <header className="qp-header">
        <button
          className="qp-header__brand"
          type="button"
          aria-label="Quiz Pools home"
          onClick={() => navigate(ROUTES.HOME)}
        >
          Quiz Pools
        </button>

        <nav className="qp-header__nav" aria-label="Account">
          {account ? (
            <span className="qp-header__account" title={account.email || account.displayName}>
              {account.displayName}
            </span>
          ) : (
            <>
              <button
                className="qp-navBtn"
                type="button"
                onClick={() => {
                  setAuthIntent(null)
                  setAuthDialog('login')
                }}
              >
                Login
              </button>
              <button
                className="qp-navBtn"
                type="button"
                onClick={() => {
                  setAuthIntent(null)
                  setAuthDialog('signup')
                }}
              >
                Sign up
              </button>
            </>
          )}
        </nav>
      </header>

      <main className="qp-main">{page}</main>

      {authDialog !== null ? (
        <AuthDialog
          mode={authDialog}
          onClose={closeAuthDialog}
          onSuccess={handleAuthSuccess}
        />
      ) : null}
    </>
  )
}

export default App
