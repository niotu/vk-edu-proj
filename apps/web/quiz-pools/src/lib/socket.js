import { io } from 'socket.io-client';

const QUIZ_SOCKET_URL = import.meta.env.VITE_QUIZ_API_URL || 'http://localhost:3002';

class SocketClient {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
    this.boundEvents = new Set();
  }

  connect(accessToken) {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(QUIZ_SOCKET_URL, {
      auth: { token: accessToken },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });
    this.boundEvents = new Set();

    this.socket.on('connect', () => {
      this.isConnected = true;
      this._emit('socket:connected');
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      this._emit('socket:disconnected');
    });

    this.socket.on('error', (error) => {
      this._emit('socket:error', error);
    });

    for (const event of this.listeners.keys()) {
      this._bind(event);
    }

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.boundEvents = new Set();
    }
  }

  _bind(event) {
    if (!this.socket || event.startsWith('socket:') || this.boundEvents.has(event)) {
      return;
    }
    this.boundEvents.add(event);
    this.socket.on(event, (data) => this._emit(event, data));
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    this._bind(event);
  }

  off(event, callback) {
    const callbacks = this.listeners.get(event);
    if (!callbacks) return;
    const index = callbacks.indexOf(callback);
    if (index > -1) callbacks.splice(index, 1);
  }

  _emit(event, data) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach((callback) => callback(data));
  }

  joinRoom(roomCode) {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error('Room join timeout'));
      }, 10000);

      const onJoined = (data) => {
        cleanup();
        resolve(data);
      };
      const onError = (err) => {
        cleanup();
        reject(new Error(err?.message || 'Failed to join room'));
      };
      const cleanup = () => {
        clearTimeout(timeoutId);
        this.socket?.off('room:joined', onJoined);
        this.socket?.off('error', onError);
      };

      this.socket.once('room:joined', onJoined);
      this.socket.once('error', onError);
      this.socket.emit('room:join', { roomCode });
    });
  }

  submitAnswer(sessionId, questionId, selectedOptionIds) {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error('Answer submission timeout'));
      }, 10000);

      const onResult = (data) => {
        cleanup();
        resolve(data);
      };
      const onError = (err) => {
        cleanup();
        reject(new Error(err?.message || 'Failed to submit answer'));
      };
      const cleanup = () => {
        clearTimeout(timeoutId);
        this.socket?.off('answer:result', onResult);
        this.socket?.off('error', onError);
      };

      this.socket.once('answer:result', onResult);
      this.socket.once('error', onError);
      this.socket.emit('answer:submit', { sessionId, questionId, selectedOptionIds });
    });
  }
}

export const socketClient = new SocketClient();

export default socketClient;
