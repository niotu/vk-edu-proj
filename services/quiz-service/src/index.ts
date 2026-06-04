import http from 'http';
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { Server as SocketServer } from 'socket.io';
import { env } from './config/env';
import { checkDatabaseConnection, prisma } from './lib/prisma';
import quizRoutes from './routes/quiz.routes';
import questionRoutes from './routes/question.routes';
import sessionRoutes from './routes/session.routes';
import historyRoutes from './routes/history.routes';
import { setupSocket } from './socket/index';
import { errorHandler } from './middlewares/errorHandler';
import { AppError, createErrorResponse, HTTP_STATUS } from './utils/errors';

const app: Express = express();

app.use(
  cors({
    origin: env.corsOrigin,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', async (_req: Request, res: Response) => {
  const dbConnected = await checkDatabaseConnection();
  const status = dbConnected ? 'healthy' : 'degraded';
  const statusCode = dbConnected ? HTTP_STATUS.OK : HTTP_STATUS.SERVICE_UNAVAILABLE;

  res.status(statusCode).json({
    status,
    database: dbConnected ? 'connected' : 'disconnected',
    realtime: 'socket.io',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/quizzes', quizRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/history', historyRoutes);

app.use((req: Request, res: Response) => {
  const error = new AppError(
    `Route not found: ${req.method} ${req.path}`,
    HTTP_STATUS.NOT_FOUND,
    'ROUTE_NOT_FOUND'
  );
  res.status(error.statusCode).json(createErrorResponse(error));
});

app.use(errorHandler);

const httpServer = http.createServer(app);

const io = new SocketServer(httpServer, {
  cors: {
    origin: env.corsOrigin,
    credentials: true,
  },
});

setupSocket(io);

async function start(): Promise<void> {
  const dbConnected = await checkDatabaseConnection();
  if (!dbConnected) {
    console.warn('Warning: PostgreSQL is not reachable. Check DATABASE_URL.');
  }

  httpServer.listen(env.port, () => {
    console.log(`Quiz service running on http://localhost:${env.port}`);
    console.log(`Socket.IO enabled (CORS: ${env.corsOrigin})`);
    console.log(`Environment: ${env.nodeEnv}`);
    console.log(`Database: ${dbConnected ? 'connected' : 'disconnected'}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

export default app;
