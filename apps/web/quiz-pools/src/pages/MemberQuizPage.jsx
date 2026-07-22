import { useState, useEffect, useRef } from 'react'
import { ROUTES } from '../navigation/routes.js'
import socketClient from '../lib/socket.js'
import { getSessionState } from '../lib/api.js'
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

export default function MemberQuizPage({ onNavigate, lobby, onFinished, currentUserId, session }) {
  const [current, setCurrent] = useState(null)
  const [selected, setSelected] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [answered, setAnswered] = useState(false)
  const [result, setResult] = useState(null)
  const [closed, setClosed] = useState(false)
  const [leaderboard, setLeaderboard] = useState([])
  const finishedRef = useRef(false)
  const liveUpdateReceivedRef = useRef(false)

  const secondsLeft = useCountdown(current?.endsAt)
  const timeIsUp = secondsLeft === 0

  useEffect(() => {
    const handleQuestionOpened = (data) => {
      if (!data?.question) return
      liveUpdateReceivedRef.current = true
      setCurrent({ question: data.question, options: data.options || [], endsAt: data.endsAt })
      setSelected([])
      setAnswered(false)
      setResult(null)
      setClosed(false)
      setError('')
    }

    const handleQuestionClosed = () => {
      liveUpdateReceivedRef.current = true
      setClosed(true)
    }

    const handleLeaderboard = (data) => {
      if (Array.isArray(data?.entries)) setLeaderboard(data.entries)
    }

    const handleSessionFinished = (data) => {
      liveUpdateReceivedRef.current = true
      if (finishedRef.current) return
      finishedRef.current = true
      onFinished?.(data?.leaderboard || [])
      onNavigate(ROUTES.LEADERBOARD)
    }

    socketClient.on('question:opened', handleQuestionOpened)
    socketClient.on('question:closed', handleQuestionClosed)
    socketClient.on('leaderboard:update', handleLeaderboard)
    socketClient.on('session:finished', handleSessionFinished)

    return () => {
      socketClient.off('question:opened', handleQuestionOpened)
      socketClient.off('question:closed', handleQuestionClosed)
      socketClient.off('leaderboard:update', handleLeaderboard)
      socketClient.off('session:finished', handleSessionFinished)
    }
  }, [onNavigate, onFinished])

  useEffect(() => {
    if (!lobby?.id || !session?.accessToken) return
    let cancelled = false

    getSessionState(session.accessToken, lobby.id)
      .then((data) => {
        if (cancelled || liveUpdateReceivedRef.current) return
        if (data?.question) {
          setCurrent({ question: data.question, options: data.options || [], endsAt: data.endsAt })
          setSelected([])
          setAnswered(false)
          setResult(null)
          setClosed(false)
        } else if (data?.session?.status === 'FINISHED' && !finishedRef.current) {
          finishedRef.current = true
          onFinished?.([])
          onNavigate(ROUTES.LEADERBOARD)
        }
      })
      .catch(() => {
      })

    return () => {
      cancelled = true
    }
  }, [lobby?.id, session?.accessToken])

  const question = current?.question
  const options = current?.options || []
  const isMultiple = question?.choiceMode === 'MULTIPLE'
  const canAnswer = question && !answered && !closed && !timeIsUp

  const handleSelectOption = (optionId) => {
    if (!canAnswer) return
    if (isMultiple) {
      setSelected((prev) =>
        prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId]
      )
    } else {
      setSelected([optionId])
    }
  }

  const handleSubmit = async () => {
    if (selected.length === 0 || !lobby?.id || !question?.id) {
      setError('Select an answer first')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await socketClient.submitAnswer(lobby.id, question.id, selected)
      setAnswered(true)
      setResult(res || null)
    } catch (err) {
      setError(err.message || 'Failed to submit answer')
    } finally {
      setLoading(false)
    }
  }

  if (!question) {
    return (
      <section className="qp-screen">
        <div className="qp-card">
          <h1 className="qp-title">Get ready!</h1>
          <p className="qp-subtitle">Waiting for the organizer to show a question...</p>
          <div className="qp-spinner" role="status"></div>
        </div>
      </section>
    )
  }

  return (
    <section className="qp-screen">
      <div className="qp-card">
        <p className="qp-progress">Question {(question.orderIndex ?? 0) + 1}</p>

        {secondsLeft !== null && !closed && (
          <p className={'qp-timer' + (secondsLeft <= 5 ? ' isUrgent' : '')}>
            {timeIsUp ? "Time's up!" : secondsLeft + 's'}
          </p>
        )}

        <h2 className="qp-questionText">{question.text}</h2>
        {isMultiple && <p className="qp-hint">Select all correct answers</p>}

        {question.imageUrl && (
          <img src={question.imageUrl} alt="Question" className="qp-questionImage" />
        )}

        <div className="qp-optionGrid" role="group" aria-label="Answer options">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              className={
                'qp-optionBtn' +
                (selected.includes(option.id) ? ' isSelected' : '') +
                (!canAnswer ? ' isDisabled' : '')
              }
              onClick={() => handleSelectOption(option.id)}
              disabled={!canAnswer}
            >
              {option.text}
            </button>
          ))}
        </div>

        {answered && result && (
          <p className={result.isCorrect ? 'qp-success' : 'qp-error'}>
            {result.isCorrect
              ? 'Correct! +' + result.pointsAwarded + ' points (total: ' + result.totalScore + ')'
              : 'Not this time. Total: ' + result.totalScore}
          </p>
        )}
        {answered && !result && (
          <p className="qp-success">Answer submitted! Waiting for the next question...</p>
        )}
        {closed && !answered && <p className="qp-hint">Question closed. Waiting for the next one...</p>}

        {closed && leaderboard.length > 0 && (
          <div className="qp-miniBoard" aria-label="Current standings">
            <p className="qp-subtitle">Current standings</p>
            <Leaderboard entries={leaderboard} currentUserId={currentUserId} />
          </div>
        )}

        {error ? <div className="qp-error">{error}</div> : null}

        {!closed && (
          <button
            className="qp-primaryBtn"
            type="button"
            disabled={selected.length === 0 || loading || !canAnswer}
            onClick={handleSubmit}
          >
            {loading ? 'Submitting...' : answered ? 'Answer submitted' : 'Submit answer'}
          </button>
        )}
      </div>
    </section>
  )
}
