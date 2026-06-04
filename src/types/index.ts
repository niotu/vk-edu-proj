export interface User {
  id: string;
  email: string;
  name: string;
  role: 'participant' | 'organizer';
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthRequest extends Express.Request {
  user?: User;
}

export interface ErrorResponse {
  success: false;
  message: string;
  code: string;
  statusCode: number;
  timestamp: string;
}

export interface SuccessResponse<T> {
  success: true;
  data: T;
  timestamp: string;
}