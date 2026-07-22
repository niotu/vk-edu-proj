import { createContext, useContext, useEffect, useState } from 'react'
import socketClient from '../lib/socket.js'

const SocketContext = createContext()

export function SocketProvider({ children, accessToken }) {
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!accessToken) return

    try {
      socketClient.connect(accessToken)

      const handleConnected = () => {
        setConnected(true)
        setError(null)
      }

      const handleDisconnected = () => {
        setConnected(false)
      }

      const handleError = (err) => {
        setError(err)
      }

      socketClient.on('socket:connected', handleConnected)
      socketClient.on('socket:disconnected', handleDisconnected)
      socketClient.on('socket:error', handleError)

      return () => {
        socketClient.off('socket:connected', handleConnected)
        socketClient.off('socket:disconnected', handleDisconnected)
        socketClient.off('socket:error', handleError)
      }
    } catch (err) {
      console.error('Failed to initialize socket:', err)
      setError(err)
    }
  }, [accessToken])

  return (
    <SocketContext.Provider value={{ connected, error, socket: socketClient }}>
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket() {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider')
  }
  return context
}
