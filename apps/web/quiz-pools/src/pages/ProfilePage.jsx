import { useEffect, useState } from 'react'
import { ROUTES } from '../navigation/routes.js'
import { getOrganizedHistory, getParticipatedHistory, listQuizzes } from '../lib/api.js'

function formatDate(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString()
  } catch {
    return String(value)
  }
}

export default function ProfilePage({ session, onNavigate }) {
  const [tab, setTab] = useState('participated')
  const [quizzes, setQuizzes] = useState([])
  const [organized, setOrganized] = useState([])
  const [participated, setParticipated] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const accessToken = session?.accessToken
  const displayName = session?.displayName || session?.user?.name || session?.user?.email

  useEffect(() => {
    if (!accessToken) {
      setLoading(false)
      return
    }

    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')
      try {
        const [quizzesRes, organizedRes, participatedRes] = await Promise.all([
          listQuizzes(accessToken),
          getOrganizedHistory(accessToken),
          getParticipatedHistory(accessToken),
        ])
        if (cancelled) return
        setQuizzes(quizzesRes?.quizzes || [])
        setOrganized(organizedRes?.sessions || [])
        setParticipated(participatedRes?.history || [])
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load your history')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [accessToken])

  if (!accessToken) {
    return (
      <section className="qp-screen">
        <div className="qp-card">
          <h1 className="qp-title">My account</h1>
          <p className="qp-subtitle">Sign in to see your quizzes and history.</p>
          <button className="qp-primaryBtn" type="button" onClick={() => onNavigate(ROUTES.HOME)}>
            Back to home
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="qp-screen qp-screen--wide">
      <div className="qp-card qp-card--wide">
        <h1 className="qp-title">My account</h1>
        <p className="qp-subtitle">{displayName}</p>

        <div className="qp-tabs">
          <button
            className={'qp-tab' + (tab === 'participated' ? ' isActive' : '')}
            type="button"
            onClick={() => setTab('participated')}
          >
            Played ({participated.length})
          </button>
          <button
            className={'qp-tab' + (tab === 'organized' ? ' isActive' : '')}
            type="button"
            onClick={() => setTab('organized')}
          >
            Hosted ({organized.length})
          </button>
          <button
            className={'qp-tab' + (tab === 'quizzes' ? ' isActive' : '')}
            type="button"
            onClick={() => setTab('quizzes')}
          >
            My quizzes ({quizzes.length})
          </button>
        </div>

        {loading ? <div className="qp-spinner" role="status"></div> : null}
        {error ? <div className="qp-error">{error}</div> : null}

        {!loading && tab === 'participated' && (
          <ul className="qp-historyList" aria-label="Quizzes you played">
            {participated.length === 0 && <li className="qp-hint">You have not played any quizzes yet.</li>}
            {participated.map((item) => (
              <li key={item.sessionId} className="qp-historyItem">
                <div>
                  <strong>{item.session?.quiz?.title || 'Quiz'}</strong>
                  {item.session?.quiz?.category ? (
                    <span className="qp-tag">{item.session.quiz.category}</span>
                  ) : null}
                </div>
                <div className="qp-historyMeta">
                  <span>{formatDate(item.session?.endedAt)}</span>
                  <span className="qp-historyScore">{item.totalScore} pts</span>
                </div>
              </li>
            ))}
          </ul>
        )}

        {!loading && tab === 'organized' && (
          <ul className="qp-historyList" aria-label="Quizzes you hosted">
            {organized.length === 0 && <li className="qp-hint">You have not hosted any sessions yet.</li>}
            {organized.map((item) => (
              <li key={item.id} className="qp-historyItem">
                <div>
                  <strong>{item.quiz?.title || 'Quiz'}</strong>
                  {item.quiz?.category ? <span className="qp-tag">{item.quiz.category}</span> : null}
                </div>
                <div className="qp-historyMeta">
                  <span>{formatDate(item.endedAt)}</span>
                  <span>
                    {item._count?.participants ?? 0} player
                    {(item._count?.participants ?? 0) === 1 ? '' : 's'} · room {item.roomCode}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}

        {!loading && tab === 'quizzes' && (
          <ul className="qp-historyList" aria-label="Your quizzes">
            {quizzes.length === 0 && <li className="qp-hint">You have no quizzes yet — create one!</li>}
            {quizzes.map((quiz) => (
              <li key={quiz.id} className="qp-historyItem">
                <div>
                  <strong>{quiz.title}</strong>
                  {quiz.category ? <span className="qp-tag">{quiz.category}</span> : null}
                  <span className={'qp-tag ' + (quiz.status === 'PUBLISHED' ? 'qp-tag--ok' : '')}>
                    {quiz.status}
                  </span>
                </div>
                <div className="qp-historyMeta">
                  <span>{quiz._count?.questions ?? quiz.questions?.length ?? 0} questions</span>
                  <span>{formatDate(quiz.createdAt)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="qp-actions qp-actions--row">
          <button className="qp-secondaryBtn" type="button" onClick={() => onNavigate(ROUTES.HOME)}>
            Back
          </button>
          <button className="qp-primaryBtn" type="button" onClick={() => onNavigate(ROUTES.QUIZ_CREATE)}>
            Create a quiz
          </button>
        </div>
      </div>
    </section>
  )
}
