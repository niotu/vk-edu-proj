import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { AppError, HTTP_STATUS, createErrorResponse } from './utils/errors';

// Load environment variables
dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

// Middleware setup
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler for undefined routes
app.use((req: Request, res: Response) => {
  const error = new AppError(
    `Route not found: ${req.method} ${req.path}`,
    HTTP_STATUS.NOT_FOUND,
    'ROUTE_NOT_FOUND'
  );

  res.status(error.statusCode).json(createErrorResponse(error));
});

// Error handling middleware (catch-all for errors)
app.use((err: Error | AppError, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);

  let statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let code = 'INTERNAL_ERROR';

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
  }

  res.status(statusCode).json(createErrorResponse(err));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;