import { useState, useEffect } from 'react'
import { ROUTES } from '../navigation/routes.js'
import socketClient from '../lib/socket.js'

export default function MemberWaitingPage({ onNavigate, lobby }) {
  const [participants, setParticipants] = useState(lobby?._count?.participants ?? 1)
  const [sessionStarted, setSessionStarted] = useState(false)

  useEffect(() => {
    const handleSessionStarted = () => {
      setSessionStarted(true)
      setTimeout(() => onNavigate(ROUTES.MEMBER_QUIZ), 500)
    }

    const handleRoomState = (data) => {
      if (typeof data?.participantsCount === 'number') {
        setParticipants(data.participantsCount)
      }
      if (data?.session?.status && data.session.status !== 'LOBBY') {
        handleSessionStarted()
      }
    }

    socketClient.on('session:started', handleSessionStarted)
    socketClient.on('room:state', handleRoomState)

    return () => {
      socketClient.off('session:started', handleSessionStarted)
      socketClient.off('room:state', handleRoomState)
    }
  }, [onNavigate])

  const roomCode = lobby?.roomCode || 'N/A'
  const quizTitle = lobby?.quiz?.title || 'Pending quiz'

  return (
    <section className="qp-screen">
      <div className="qp-card">
        <h1 className="qp-title">Waiting for the organizer</h1>
        <p className="qp-subtitle">Quiz will start when the organizer is ready</p>

        <div className="qp-roomCode" aria-label="Room code">
          <span className="qp-roomCode__label">Room code</span>
          <span className="qp-roomCode__value">{roomCode}</span>
        </div>

        <p className="qp-hint">Quiz: {quizTitle}</p>
        <p className="qp-hint">Participants in room: {participants}</p>

        <div className="qp-spinner" role="status" aria-label="Waiting for quiz to start"></div>

        {sessionStarted && <p className="qp-success">Quiz is starting...</p>}
      </div>
    </section>
  )
}
