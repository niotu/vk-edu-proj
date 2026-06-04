import { Server } from 'socket.io';

let io: Server | null = null;

export function setSocketServer(server: Server): void {
  io = server;
}

export function getSocketServer(): Server {
  if (!io) {
    throw new Error('Socket.IO server not initialized');
  }
  return io;
}

export function roomChannel(roomCode: string): string {
  return `room:${roomCode}`;
}

export function emitToRoom(roomCode: string, event: string, payload: unknown): void {
  getSocketServer().to(roomChannel(roomCode)).emit(event, payload);
}
