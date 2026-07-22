import './App.css'
import { useCallback, useMemo, useState, useEffect } from 'react'
import HomePage from './pages/HomePage.jsx'
import QuizCreatePage from './pages/QuizCreatePage.jsx'
import OrgWaitingPage from './pages/OrgWaitingPage.jsx'
import OrganizerQuizPage from './pages/OrganizerQuizPage.jsx'
import QuizJoinPage from './pages/QuizJoinPage.jsx'
import MemberWaitingPage from './pages/MemberWaitingPage.jsx'
import MemberQuizPage from './pages/MemberQuizPage.jsx'
import LeaderboardPage from './pages/LeaderboardPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import AuthDialog from './components/AuthDialog.jsx'
import { ROUTES } from './navigation/routes.js'
import { clearSession, getDisplayName, getRoleLabel, loadSession, saveSession } from './lib/session.js'
import { logoutUser, refreshSession } from './lib/api.js'
import { SocketProvider } from './providers/SocketProvider.jsx'
import socketClient from './lib/socket.js'

function App() {
  const [route, setRoute] = useState(ROUTES.HOME)
  const [session, setSession] = useState(() => loadSession())
  const [liveSession, setLiveSession] = useState(null)
  const [liveQuiz, setLiveQuiz] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [authDialog, setAuthDialog] = useState(null)
  const [authIntent, setAuthIntent] = useState(null)
  const [loading, setLoading] = useState(true)

  const navigate = useCallback((nextRoute) => setRoute(nextRoute), [])

  useEffect(() => {
    async function initialize() {
      if (!session) {
        try {
          const result = await refreshSession()
          const nextSession = {
            ...result,
            displayName: getDisplayName(result) || result.user.email.split('@')[0],
          }
          setSession(nextSession)
          saveSession(nextSession)
        } catch {
          clearSession()
          setSession(null)
        }
      }
      setLoading(false)
    }

    initialize()
  }, [])

  const closeAuthDialog = useCallback(() => {
    setAuthDialog(null)
    setAuthIntent(null)
  }, [])

  const handleAuthSuccess = useCallback(
    (result) => {
      const nextSession = {
        ...result,
        displayName: result.displayName || result.user?.name || result.user.email.split('@')[0],
      }
      setSession(nextSession)
      saveSession(nextSession)
      setAuthDialog(null)
      if (authIntent === 'create') navigate(ROUTES.QUIZ_CREATE)
      if (authIntent === 'join') navigate(ROUTES.QUIZ_JOIN)
      setAuthIntent(null)
    },
    [authIntent, navigate]
  )

  const requireAuth = useCallback(
    (intent, targetRoute) => {
      if (session) {
        navigate(targetRoute)
        return
      }
      setAuthIntent(intent)
      setAuthDialog('signup')
    },
    [navigate, session]
  )

  const handleCreate = useCallback(() => requireAuth('create', ROUTES.QUIZ_CREATE), [requireAuth])
  const handleJoin = useCallback(() => requireAuth('join', ROUTES.QUIZ_JOIN), [requireAuth])

  const handleSessionCreated = useCallback(
    ({ session: liveSessionData, quiz }) => {
      setLiveSession(liveSessionData)
      setLiveQuiz(quiz)
      setLeaderboard([])
      navigate(ROUTES.ORG_WAITING)
    },
    [navigate]
  )

  const handleSessionJoined = useCallback((sessionData) => {
    setLiveSession(sessionData)
    setLeaderboard([])
  }, [])

  const handleFinished = useCallback((entries) => {
    setLeaderboard(Array.isArray(entries) ? entries : [])
  }, [])

  const handleLogout = useCallback(async () => {
    try {
      await logoutUser()
    } catch (err) {
      void err
    } finally {
      socketClient.disconnect()
      clearSession()
      setSession(null)
      setLiveSession(null)
      setLiveQuiz(null)
      navigate(ROUTES.HOME)
    }
  }, [navigate])

  const page = useMemo(() => {
    if (loading) {
      return <div className="qp-loading">Loading session...</div>
    }

    switch (route) {
      case ROUTES.QUIZ_CREATE:
        return (
          <QuizCreatePage session={session} onNavigate={navigate} onSessionCreated={handleSessionCreated} />
        )
      case ROUTES.ORG_WAITING:
        return <OrgWaitingPage onNavigate={navigate} session={session} lobby={liveSession} />
      case ROUTES.ORGANIZER_QUIZ:
        return (
          <OrganizerQuizPage
            onNavigate={navigate}
            session={session}
            lobby={liveSession}
            quizWithQuestions={liveQuiz}
            onFinished={handleFinished}
          />
        )
      case ROUTES.QUIZ_JOIN:
        return <QuizJoinPage session={session} onNavigate={navigate} onSessionJoined={handleSessionJoined} />
      case ROUTES.MEMBER_WAITING:
        return <MemberWaitingPage onNavigate={navigate} lobby={liveSession} />
      case ROUTES.MEMBER_QUIZ:
        return (
          <MemberQuizPage
            onNavigate={navigate}
            lobby={liveSession}
            onFinished={handleFinished}
            currentUserId={session?.user?.id}
            session={session}
          />
        )
      case ROUTES.LEADERBOARD:
        return (
          <LeaderboardPage onNavigate={navigate} entries={leaderboard} currentUserId={session?.user?.id} />
        )
      case ROUTES.PROFILE:
        return <ProfilePage session={session} onNavigate={navigate} />
      case ROUTES.HOME:
      default:
        return <HomePage onCreate={handleCreate} onJoin={handleJoin} />
    }
  }, [
    loading,
    route,
    session,
    navigate,
    handleSessionCreated,
    handleSessionJoined,
    handleFinished,
    liveSession,
    liveQuiz,
    leaderboard,
    handleCreate,
    handleJoin,
  ])

  return (
    <SocketProvider accessToken={session?.accessToken}>
      <>
        <header className="qp-header">
          <button className="qp-header__brand" type="button" onClick={() => navigate(ROUTES.HOME)}>
            Quiz Pools
          </button>
          <nav className="qp-header__nav">
            {session ? (
              <>
                <button className="qp-linkBtn" type="button" onClick={() => navigate(ROUTES.PROFILE)}>
                  {session.displayName || session.user?.name || 'My account'}
                  {getRoleLabel(session) ? ' - ' + getRoleLabel(session) : ''}
                </button>
                <button className="qp-linkBtn" type="button" onClick={handleLogout}>
                  Log out
                </button>
              </>
            ) : (
              <>
                <button className="qp-linkBtn" type="button" onClick={() => setAuthDialog('login')}>
                  Log in
                </button>
                <button className="qp-linkBtn" type="button" onClick={() => setAuthDialog('signup')}>
                  Sign up
                </button>
              </>
            )}
          </nav>
        </header>

        <main className="qp-main">{page}</main>

        {authDialog !== null ? (
          <AuthDialog mode={authDialog} onClose={closeAuthDialog} onSuccess={handleAuthSuccess} />
        ) : null}
      </>
    </SocketProvider>
  )
}

export default App
