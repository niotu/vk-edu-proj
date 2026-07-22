import { useState } from 'react'
import { ROUTES } from '../navigation/routes.js'
import { findSessionByRoomCode, joinSession } from '../lib/api.js'
import socketClient from '../lib/socket.js'

export default function QuizJoinPage({ onNavigate, session, onSessionJoined }) {
  const [roomCode, setRoomCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleJoin = async () => {
    const code = roomCode.trim().toUpperCase()
    if (!code) {
      setError('Please enter a room code')
      return
    }
    if (!session?.accessToken) {
      setError('You must be logged in to join a session')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { session: quizSession } = await findSessionByRoomCode(session.accessToken, code)
      await joinSession(session.accessToken, quizSession.id)

      if (!socketClient.isConnected) {
        socketClient.connect(session.accessToken)
      }
      try {
        await socketClient.joinRoom(code)
      } catch (err) {
        void err
      }

      onSessionJoined(quizSession)
      onNavigate(ROUTES.MEMBER_WAITING)
    } catch (err) {
      setError(err.message || 'Failed to join session. Check the room code.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="qp-screen">
      <div className="qp-card">
        <h1 className="qp-title">Join Quiz</h1>
        <p className="qp-subtitle">Enter the room code provided by the organizer</p>

        <div className="qp-formGroup">
          <input
            type="text"
            className="qp-input"
            placeholder="Enter room code (e.g., ABC123)"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            disabled={loading}
            maxLength="6"
          />
        </div>

        {error ? <div className="qp-error">{error}</div> : null}

        <div className="qp-actions qp-actions--column">
          <button
            className="qp-primaryBtn"
            type="button"
            onClick={handleJoin}
            disabled={loading || !roomCode.trim()}
          >
            {loading ? 'Joining...' : 'Join Quiz'}
          </button>
          <button
            className="qp-secondaryBtn"
            type="button"
            onClick={() => onNavigate(ROUTES.HOME)}
            disabled={loading}
          >
            Back to Home
          </button>
        </div>
      </div>
    </section>
  )
}
