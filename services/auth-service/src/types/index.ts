import { Role } from '@prisma/client';
import { Request } from 'express';

export interface PublicUser {
  id: string;
  email: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthRequest extends Request {
  user?: AccessTokenUser;
}

export interface AccessTokenUser {
  id: string;
  email: string;
  role: Role;
}

export interface RegisterInput {
  email: string;
  password: string;
  role?: Role;
}

export interface LoginInput {
  email: string;
  password: string;
}
