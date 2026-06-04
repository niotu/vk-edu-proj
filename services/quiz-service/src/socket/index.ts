import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt';
import { AuthUser } from '../types';
import { sessionService } from '../services/session.service';
import { roomChannel, setSocketServer } from '../lib/broadcast';
import { AppError } from '../utils/errors';

interface AuthenticatedSocket extends Socket {
  user: AuthUser;
}

function emitSocketError(socket: Socket, code: string, message: string): void {
  socket.emit('error', { code, message });
}

function handleError(socket: Socket, err: unknown): void {
  if (err instanceof AppError) {
    emitSocketError(socket, err.code, err.message);
    return;
  }
  console.error('Socket error:', err);
  emitSocketError(socket, 'INTERNAL_ERROR', 'An unexpected error occurred');
}

export function setupSocket(io: Server): void {
  setSocketServer(io);

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      return next(new Error('MISSING_TOKEN'));
    }
    try {
      const payload = verifyAccessToken(token);
      (socket as AuthenticatedSocket).user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      };
      next();
    } catch {
      next(new Error('INVALID_TOKEN'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const authSocket = socket as AuthenticatedSocket;

    socket.on('room:join', async (payload: { roomCode?: string }) => {
      try {
        const roomCode = payload?.roomCode?.trim().toUpperCase();
        if (!roomCode) {
          emitSocketError(socket, 'INVALID_INPUT', 'roomCode is required');
          return;
        }

        const session = await sessionService.getByRoomCode(roomCode);
        await sessionService.join(session.id, authSocket.user.id);
        await socket.join(roomChannel(roomCode));
        socket.emit('room:joined', { roomCode, sessionId: session.id });
      } catch (err) {
        handleError(socket, err);
      }
    });

    socket.on('session:start', async (payload: { sessionId?: string }) => {
      try {
        if (authSocket.user.role !== 'ORGANIZER') {
          emitSocketError(socket, 'FORBIDDEN', 'Organizer role required');
          return;
        }
        const sessionId = payload?.sessionId;
        if (!sessionId) {
          emitSocketError(socket, 'INVALID_INPUT', 'sessionId is required');
          return;
        }
        const session = await sessionService.start(sessionId, authSocket.user.id);
        await socket.join(roomChannel(session.roomCode));
        socket.emit('session:start:ok', { sessionId: session.id });
      } catch (err) {
        handleError(socket, err);
      }
    });

    socket.on(
      'question:show',
      async (payload: { sessionId?: string; questionId?: string }) => {
        try {
          if (authSocket.user.role !== 'ORGANIZER') {
            emitSocketError(socket, 'FORBIDDEN', 'Organizer role required');
            return;
          }
          const { sessionId, questionId } = payload ?? {};
          if (!sessionId || !questionId) {
            emitSocketError(socket, 'INVALID_INPUT', 'sessionId and questionId are required');
            return;
          }
          await sessionService.showQuestion(sessionId, questionId, authSocket.user.id);
        } catch (err) {
          handleError(socket, err);
        }
      }
    );

    socket.on('question:close', async (payload: { sessionId?: string }) => {
      try {
        if (authSocket.user.role !== 'ORGANIZER') {
          emitSocketError(socket, 'FORBIDDEN', 'Organizer role required');
          return;
        }
        const sessionId = payload?.sessionId;
        if (!sessionId) {
          emitSocketError(socket, 'INVALID_INPUT', 'sessionId is required');
          return;
        }
        await sessionService.closeQuestion(sessionId, authSocket.user.id);
      } catch (err) {
        handleError(socket, err);
      }
    });

    socket.on(
      'answer:submit',
      async (payload: {
        sessionId?: string;
        questionId?: string;
        selectedOptionIds?: string[];
      }) => {
        try {
          const { sessionId, questionId, selectedOptionIds } = payload ?? {};
          if (!sessionId || !questionId) {
            emitSocketError(socket, 'INVALID_INPUT', 'sessionId and questionId are required');
            return;
          }
          const result = await sessionService.submitAnswer(
            sessionId,
            authSocket.user.id,
            questionId,
            selectedOptionIds ?? []
          );
          socket.emit('answer:result', result);
        } catch (err) {
          handleError(socket, err);
        }
      }
    );

    socket.on('session:end', async (payload: { sessionId?: string }) => {
      try {
        if (authSocket.user.role !== 'ORGANIZER') {
          emitSocketError(socket, 'FORBIDDEN', 'Organizer role required');
          return;
        }
        const sessionId = payload?.sessionId;
        if (!sessionId) {
          emitSocketError(socket, 'INVALID_INPUT', 'sessionId is required');
          return;
        }
        await sessionService.end(sessionId, authSocket.user.id);
      } catch (err) {
        handleError(socket, err);
      }
    });
  });
}
