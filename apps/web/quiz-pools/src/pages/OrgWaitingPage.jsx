import { useState, useEffect } from 'react'
import { ROUTES } from '../navigation/routes.js'
import { startSession } from '../lib/api.js'
import socketClient from '../lib/socket.js'

export default function OrgWaitingPage({ onNavigate, session, lobby }) {
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')
  const [participants, setParticipants] = useState(lobby?._count?.participants ?? 0)

  const roomCode = lobby?.roomCode || 'N/A'
  const quizTitle = lobby?.quiz?.title || 'Pending quiz'

  useEffect(() => {
    const handleRoomState = (data) => {
      if (typeof data?.participantsCount === 'number') {
        setParticipants(data.participantsCount)
      }
    }

    socketClient.on('room:state', handleRoomState)
    return () => socketClient.off('room:state', handleRoomState)
  }, [])

  const handleStart = async () => {
    if (!session?.accessToken || !lobby?.id) {
      setError('Missing session data. Go back and create the quiz again.')
      return
    }

    setError('')
    setStarting(true)

    try {
      await startSession(session.accessToken, lobby.id)
      onNavigate(ROUTES.ORGANIZER_QUIZ)
    } catch (err) {
      setError(err.message || 'Unable to start the quiz. Please try again.')
    } finally {
      setStarting(false)
    }
  }

  return (
    <section className="qp-screen">
      <div className="qp-card">
        <h1 className="qp-title">Organizer lobby</h1>
        <p className="qp-subtitle">
          Share the room code with participants. Start the quiz when everyone is ready.
        </p>

        <div className="qp-roomCode" aria-label="Room code">
          <span className="qp-roomCode__label">Room code</span>
          <span className="qp-roomCode__value">{roomCode}</span>
        </div>

        <p className="qp-hint">Quiz: {quizTitle}</p>
        <p className="qp-hint">{participants} participant{participants === 1 ? '' : 's'} connected</p>

        <div className="qp-spinner" role="status" aria-label="Waiting for participants"></div>

        {error ? <div className="qp-error">{error}</div> : null}

        <div className="qp-actions qp-actions--row">
          <button className="qp-secondaryBtn" type="button" onClick={() => onNavigate(ROUTES.QUIZ_CREATE)}>
            Cancel
          </button>
          <button className="qp-primaryBtn" type="button" onClick={handleStart} disabled={starting}>
            {starting ? 'Starting...' : 'Start quiz'}
          </button>
        </div>
      </div>
    </section>
  )
}
