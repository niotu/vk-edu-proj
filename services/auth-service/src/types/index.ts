import { Request } from 'express';
import { Role } from '@prisma/client';

export interface PublicUser {
  id: string;
  name: string;
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
  name: string;
  role: Role;
}

export interface RegisterInput {
  name?: string;
  email: string;
  password: string;
  role?: Role;
}

export interface LoginInput {
  email: string;
  password: string;
}
