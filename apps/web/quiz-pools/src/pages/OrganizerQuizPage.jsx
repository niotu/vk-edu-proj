import { useState, useEffect, useRef } from 'react'
import { ROUTES } from '../navigation/routes.js'
import { showQuestion, closeQuestion, endSession } from '../lib/api.js'
import socketClient from '../lib/socket.js'
import Leaderboard from '../components/Leaderboard.jsx'

function useCountdown(endsAt) {
  const [secondsLeft, setSecondsLeft] = useState(null)

  useEffect(() => {
    if (!endsAt) {
      setSecondsLeft(null)
      return
    }
    const tick = () => {
      const left = Math.max(0, Math.ceil((new Date(endsAt).getTime() - Date.now()) / 1000))
      setSecondsLeft(left)
    }
    tick()
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [endsAt])

  return secondsLeft
}

export default function OrganizerQuizPage({ onNavigate, session, lobby, quizWithQuestions, onFinished }) {
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [answeredUsers, setAnsweredUsers] = useState(() => new Set())
  const [questionOpen, setQuestionOpen] = useState(false)
  const [endsAt, setEndsAt] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const openQuestionIdRef = useRef(null)
  const shownIndexRef = useRef(-1)

  const questions = quizWithQuestions?.questions || []
  const question = questions[index]
  const isLast = index >= questions.length - 1
  const secondsLeft = useCountdown(endsAt)

  useEffect(() => {
    const handleAnswerReceived = (data) => {
      if (!data?.userId) return
      setAnsweredUsers((prev) => {
        const next = new Set(prev)
        next.add(data.userId)
        return next
      })
    }

    const handleQuestionClosed = (data) => {
      if (openQuestionIdRef.current && data?.questionId === openQuestionIdRef.current) {
        setQuestionOpen(false)
        setEndsAt(null)
      }
    }

    const handleLeaderboard = (data) => {
      if (Array.isArray(data?.entries)) setLeaderboard(data.entries)
    }

    socketClient.on('answer:received', handleAnswerReceived)
    socketClient.on('question:closed', handleQuestionClosed)
    socketClient.on('leaderboard:update', handleLeaderboard)

    return () => {
      socketClient.off('answer:received', handleAnswerReceived)
      socketClient.off('question:closed', handleQuestionClosed)
      socketClient.off('leaderboard:update', handleLeaderboard)
    }
  }, [])

  useEffect(() => {
    if (!session?.accessToken || !lobby?.id || !question?.id) return
    if (shownIndexRef.current === index) return
    shownIndexRef.current = index

    let cancelled = false
    setLoading(true)
    setError('')
    setAnsweredUsers(new Set())
    setQuestionOpen(false)
    setEndsAt(null)

    showQuestion(session.accessToken, lobby.id, question.id)
      .then((result) => {
        if (cancelled) return
        openQuestionIdRef.current = question.id
        setQuestionOpen(true)
        setEndsAt(result?.endsAt || null)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err.message || 'Failed to show question')
        shownIndexRef.current = -1
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [index, question?.id, session?.accessToken, lobby?.id])

  const handleNext = async () => {
    if (!session?.accessToken || !lobby?.id) return

    setLoading(true)
    setError('')

    try {
      if (questionOpen) {
        try {
          await closeQuestion(session.accessToken, lobby.id)
        } catch (err) {
          void err
        }
        setQuestionOpen(false)
        setEndsAt(null)
      }

      if (isLast) {
        const result = await endSession(session.accessToken, lobby.id)
        onFinished?.(result?.leaderboard || leaderboard)
        onNavigate(ROUTES.LEADERBOARD)
      } else {
        setIndex((i) => i + 1)
      }
    } catch (err) {
      setError(err.message || 'Failed to proceed')
    } finally {
      setLoading(false)
    }
  }

  if (!question) {
    return (
      <section className="qp-screen">
        <div className="qp-card">
          <p>No questions in this quiz.</p>
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
        <p className="qp-progress">
          Question {index + 1} of {questions.length}
        </p>
        <h1 className="qp-title qp-title--question">{question.text || question.statement}</h1>
        <p className="qp-subtitle">Organizer view — participants see options only</p>

        {question.imageUrl && (
          <img src={question.imageUrl} alt="Question" className="qp-questionImage" />
        )}

        <ul className="qp-optionList" aria-label="Answer options preview">
          {question.options?.map((option, i) => (
            <li key={option.id || i} className="qp-optionItem">
              {option.text}
            </li>
          ))}
        </ul>

        {questionOpen ? (
          <p className="qp-info">
            Question is open{secondsLeft !== null ? ' — ' + secondsLeft + 's left' : ''}.{' '}
            {answeredUsers.size} answer{answeredUsers.size !== 1 ? 's' : ''} received.
          </p>
        ) : loading ? (
          <p className="qp-info">Showing question to participants...</p>
        ) : null}

        {!questionOpen && leaderboard.length > 0 && (
          <div className="qp-miniBoard" aria-label="Current standings">
            <p className="qp-subtitle">Current standings</p>
            <Leaderboard entries={leaderboard} />
          </div>
        )}

        {error ? <div className="qp-error">{error}</div> : null}

        <div className="qp-actions qp-actions--row">
          <button
            className="qp-primaryBtn"
            type="button"
            onClick={handleNext}
            disabled={loading}
          >
            {loading ? 'Processing...' : isLast ? 'Finish quiz' : 'Next question'}
          </button>
        </div>
      </div>
    </section>
  )
}
